// The chunked tilemap. Nothing may assume a fixed world size (CLAUDE.md): the
// surface is generated lazily and deterministically from the seed, and the only
// stored terrain is the sparse set of player/town EDITS layered on top. That
// keeps saves tiny and away-sim honest — an unedited tile is always whatever
// generation says, forever.
//
// Layers: `Layer` is an axis, not a height (DESIGN §Structures — "Underground
// is a layer, not a height"). Every read and write takes one, defaulting to
// "surface" so the several hundred existing callers that only ever meant the
// surface still say what they meant.

import type { TileId } from "../content/tiles";
import {
  GRASS,
  STONE,
  FLOOR,
  WATER,
  DIRT,
  FARMLAND,
  FARMLAND_WET,
  MUSHROOM,
  TREE,
  SHRUB,
  STUMP,
  LOG,
  ROCK,
  BEDROCK,
  ORE_VEIN,
  SHAFT,
  CAVE_FLOOR,
  DARK_TREE,
  HUM_CUBE,
  SAND,
  SHALLOW,
  LAVA,
  CLOUD,
  CLOUD_THIN,
  SKY_STAIR,
  STAIR,
  tileDef,
} from "../content/tiles";
import { NODES } from "../content/nodes";
import type { BiomeId } from "../content/biomes";
import { FIELD_WEIGHTS, biomeDef } from "../content/biomes";
import {
  foundSiteAt,
  foundTile,
  skyStairAt,
  skyStairNear,
  skyStairCentre,
  SKY_PARTING,
  type FoundSite,
} from "./found";
import type { BiomeDef, Tint } from "../content/biomes";
import type { WaterKindId, ChannelDef } from "../content/water";
import { waterKind } from "../content/water";
import { structureDef } from "../content/structures";
import { defaultSkin } from "../content/skins";
import type { SkinId } from "../content/skins";
import { furnitureDef, covers, MAX_SPAN } from "../content/furniture";
import { allTownBuildings } from "../content/town";
import type { WorldState, HomesteadSpot, Layer } from "./types";
import { hash2 } from "./rng";

export const CHUNK = 16; // tiles per chunk edge — chunks are a render/streaming unit

/** The sparse edit map for a layer. Underground edits live in their own record
 *  rather than under a prefixed key, so a save that predates the underground
 *  needs no rekeying — only an empty object added (schema v17).
 *
 *  THE SKY HAS NO RECORD, and that is not an oversight to fill in later. Nothing
 *  up there can be changed — no digging, no filling, no building, no planting
 *  (DESIGN §The sky) — so a sky edit map would be a field that is empty in every
 *  save forever, plus a migration, plus a fourth thing undo has to have an
 *  opinion about. The frozen empty object is what "you visit; you do not
 *  reshape" looks like from the storage side: reads fall straight through to
 *  generation, and a write that should never happen throws in dev instead of
 *  quietly landing in the surface's record, which is where it would have gone. */
const NO_EDITS: Record<string, TileId> = Object.freeze({});

function editsFor(world: WorldState, layer: Layer): Record<string, TileId> {
  switch (layer) {
    case "under":
      return world.under;
    case "sky":
      return NO_EDITS;
    default:
      return world.overrides;
  }
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Read a tile key back into coordinates. Returns null for anything that isn't
 *  one, because these keys reach us from the SAVE — a hand-edited or corrupted
 *  blob must produce "no such cell" rather than {x: NaN, y: NaN}, which would
 *  quietly poison every distance and lookup downstream. */
export function parseTileKey(key: string): { x: number; y: number } | null {
  const m = /^(-?\d+),(-?\d+)$/.exec(key);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

// --- Chunk streaming ----------------------------------------------------------
// A chunk is CHUNK×CHUNK generated tiles, built on first touch and cached. The
// cache is DERIVED state: it holds nothing an edit could invalidate (overrides
// live in WorldState and are consulted separately by tileAt), and it is never
// serialised. Keyed off the world object in a WeakMap so a discarded world —
// "New town" — drops its chunks for free instead of leaking them.
//
// IT IS ALSO BOUNDED, and that is not an optimisation. In an unbounded world an
// unbounded cache is a leak with a step counter: every chunk you have ever
// walked past stays resident forever, so the cost of a long walk is paid in
// memory that is never handed back. A bounded world would have got away with it.
// This one won't, and we are about to start encouraging long walks.
//
// Eviction is always safe BECAUSE generation is pure: an evicted chunk is not
// lost data, it is a few hundred hashes we will redo if we go back. That is the
// same property that lets a save store only edits.

/** One generated chunk. Uint16Array because TileIds are small stable ints and a
 *  chunk is hot, per-frame read data. */
export type Chunk = Uint16Array;

/** How many chunks stay resident per world, across BOTH layers.
 *
 *  Sized well above any viewport rather than tuned to one. The renderer widens
 *  the visible tile span to whole chunks and touches each per frame, so the cap
 *  has to exceed what a single frame needs or we would evict a chunk we are
 *  still drawing and regenerate it on the next tile read — thrashing, and it
 *  would look like a frame-rate bug rather than a cache bug. A 2560px-wide
 *  window is roughly 6×4 chunks; 256 is an order of magnitude clear of that,
 *  and still only ~128 KB (CHUNK² × 2 bytes each).
 *
 *  The headroom is what makes plain recency good enough: everything on screen,
 *  everything a villager just pathed through, and everything the away sim
 *  touched all fit at once, so nothing evicts anything that is still in use. */
const MAX_RESIDENT_CHUNKS = 256;

/** Per-world cache. `chunks` is insertion-ordered and used as an LRU: the least
 *  recently touched key is the first one `keys()` yields.
 *
 *  `mruKey`/`mruChunk` are a one-entry memo in front of it, and they are here
 *  for a specific hot path — `baseTileAt` calls this per TILE, so a chunk being
 *  scanned is asked for 256 times in a row. Without the memo each of those reads
 *  pays a delete-and-reinsert to record its own recency, which is a lot of Map
 *  churn to learn something we already knew. */
interface ChunkCache {
  chunks: Map<string, Chunk>;
  mruKey: string | null;
  mruChunk: Chunk | null;
}

const chunkCache = new WeakMap<WorldState, ChunkCache>();

export function chunkKey(cx: number, cy: number, layer: Layer = "surface"): string {
  // The surface keeps the bare key it has always had; every other layer takes a
  // prefix. Kept as a switch rather than a template with a prefix variable so
  // that a new layer cannot get an empty prefix by forgetting a case and
  // silently share the surface's chunks.
  switch (layer) {
    case "under":
      return `u:${cx},${cy}`;
    case "sky":
      return `s:${cx},${cy}`;
    default:
      return `${cx},${cy}`;
  }
}

/** Chunk coordinate containing a world tile. Floor division so it stays correct
 *  either side of the origin (the town straddles it). */
export function chunkCoordOf(x: number, y: number): { cx: number; cy: number } {
  return { cx: Math.floor(x / CHUNK), cy: Math.floor(y / CHUNK) };
}

/** Generate one chunk's tiles. Pure given (seed, spot, chunk coord, layer). */
function generateChunk(
  seed: number,
  spot: HomesteadSpot,
  cx: number,
  cy: number,
  layer: Layer,
): Chunk {
  const tiles = new Uint16Array(CHUNK * CHUNK);
  const ox = cx * CHUNK;
  const oy = cy * CHUNK;
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      const x = ox + tx;
      const y = oy + ty;
      tiles[ty * CHUNK + tx] =
        layer === "under"
          ? generatedUnderTile(seed, x, y)
          : layer === "sky"
            ? generatedSkyTile(seed, spot, x, y)
            : generatedTile(seed, spot, x, y);
    }
  }
  return tiles;
}

/** The chunk at a chunk coordinate, generating and caching it on first touch.
 *  This is the lazy-load path — nothing anywhere assumes a bounded world — and
 *  it is also where recency is recorded and the cap enforced. */
export function getChunk(
  world: WorldState,
  cx: number,
  cy: number,
  layer: Layer = "surface",
): Chunk {
  let cache = chunkCache.get(world);
  if (!cache) {
    cache = { chunks: new Map(), mruKey: null, mruChunk: null };
    chunkCache.set(world, cache);
  }
  const key = chunkKey(cx, cy, layer);
  if (key === cache.mruKey && cache.mruChunk) return cache.mruChunk;

  const { chunks } = cache;
  let chunk = chunks.get(key);
  if (chunk) {
    // Touch: delete and reinsert so it moves to the young end of the order.
    chunks.delete(key);
    chunks.set(key, chunk);
  } else {
    chunk = generateChunk(world.seed, world.homestead.spot, cx, cy, layer);
    chunks.set(key, chunk);
    // Drop the oldest until we're back under the cap. A while loop rather than a
    // single delete because nothing guarantees we only ever grew by one — a
    // lowered cap should take effect on the next touch, not gradually.
    while (chunks.size > MAX_RESIDENT_CHUNKS) {
      const oldest = chunks.keys().next().value;
      if (oldest === undefined) break;
      chunks.delete(oldest);
    }
  }
  cache.mruKey = key;
  cache.mruChunk = chunk;
  return chunk;
}

/** How many chunks are currently resident — for tests and debugging, so
 *  "generated lazily" and "bounded" are both assertable claims rather than
 *  comments. */
export function residentChunkCount(world: WorldState): number {
  return chunkCache.get(world)?.chunks.size ?? 0;
}

/** The residency cap, exported so the test asserting the bound doesn't hardcode
 *  a number this file could change out from under it. */
export { MAX_RESIDENT_CHUNKS };

/** The generated (pre-edit) tile, read through the chunk cache. */
export function baseTileAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): TileId {
  const { cx, cy } = chunkCoordOf(x, y);
  const chunk = getChunk(world, cx, cy, layer);
  // Modulo that stays positive on the negative side of the origin.
  const lx = x - cx * CHUNK;
  const ly = y - cy * CHUNK;
  return chunk[ly * CHUNK + lx];
}

// --- Town layout --------------------------------------------------------------
// The town pre-exists around the origin (DESIGN §"Town and homestead"): a stone
// plaza with the town hall at its north edge. The player's homestead is a plot
// off to the +x/+y (south-east). These are the fixed anchors the generator and
// the cast positions share.
/** The town square, inclusive. ELEVEN BY EIGHT, and the numbers are a module
 *  rather than a taste: a one-tile edging course leaves a 9x6 field, which at
 *  24px to a paver is exactly six pavers across and four down. Change either
 *  dimension and the paving stops dividing — see PLAZA_GRAIN in render/renderer.ts
 *  for the arithmetic and for why the paver is 24 and not 16. */
export const PLAZA = { x0: -5, y0: -5, x1: 5, y1: 2 };
export const HOME = { x: 6, y: 5 }; // homestead origin (tent sits here-ish)

/** Homestead origin per chosen spot — all near HOME, nudged for flavour. Lives
 *  here rather than in game.ts because terrain generation needs it (it keeps a
 *  clearing around your plot), and world.ts must not import upward. */
export function homesteadOrigin(spot: HomesteadSpot): { x: number; y: number } {
  switch (spot) {
    case "riverside":
      return { x: HOME.x, y: HOME.y };
    case "forest":
      return { x: HOME.x + 2, y: HOME.y + 1 };
    case "lakeside":
      return { x: HOME.x, y: HOME.y - 1 };
    case "coast":
      return { x: HOME.x + 1, y: HOME.y - 1 };
  }
}

/** Tiles around the homestead origin kept clear of trees and rocks, so you
 *  always arrive to somewhere you can actually stand and start building. */
const HOMESTEAD_CLEARING = 4;

/** Deterministic base terrain at a surface tile, before any edits: paved plaza,
 *  water and its shore, resource nodes scattered by seed, and grass everywhere
 *  else. */
export function generatedTile(seed: number, spot: HomesteadSpot, x: number, y: number): TileId {
  // Plaza paving. Still first, so a stream may cross the town without crossing
  // the paving — the plaza is the one surface in the world nothing overrides.
  if (x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1) return STONE;

  // Resource nodes. Deterministic from the seed, so a given town's forest is a
  // real, stable place rather than scenery that reshuffles. Never generated on
  // the plaza (handled above) or in the homestead clearing.
  const home = homesteadOrigin(spot);
  const nearHome =
    Math.abs(x - home.x) <= HOMESTEAD_CLEARING && Math.abs(y - home.y) <= HOMESTEAD_CLEARING;

  // The two secrets that are places rather than people (Phase 4c). Both sit far
  // outside the plaza, the river and the clearing, so they are checked after
  // those and before the ordinary scatter — a grove that could be overwritten by
  // a roll of the tree hash would have holes in it.
  if (!nearHome) {
    if (isCubeSite(seed, spot, x, y)) return HUM_CUBE;
    if (inGrove(seed, spot, x, y)) return DARK_TREE;
    // The clearing at the heart of the grove, and this has to come before the
    // ordinary scatter or it is not a clearing. `inGrove` only declines to put
    // one of HER trees here; without this line the plain tree hash cheerfully
    // fills it, and the Ghost stands inside a trunk in the one spot the whole
    // place was shaped around.
    if (inGroveClearing(seed, spot, x, y)) return GRASS;

    // The found places (Phase 7b), on the same terms and for the same reason as
    // the two above: before the ordinary scatter, or a circle of trees comes out
    // with holes in it and a pond comes out with a tree standing in the water.
    //
    // They start at ring 96, well past the grove (44), the cube (58) and the
    // blossom rows (72), so the nearest one cannot land on an older landmark. The
    // guard for the town itself is the same `nearHome` this block already sits in,
    // plus the plaza check above it.
    const found = foundSiteAt(seed, spot, x, y, onLand);
    if (found) {
      const t = foundTile(found, x, y);
      if (t !== null) return t;
    }

    // What the region does to the scatter. Every multiplier is 1 and every
    // clutter chance 0 in the meadow, so the town's own region — and therefore
    // every town that existed before biomes did — generates precisely what it
    // always generated. See `originSite`.
    //
    // TWO REGIONS, AND THE SPLIT IS THE POINT. `terrain` is the tile's own
    // region, hard, for the things that are the LAND: the water table below,
    // and anything else shaped rather than scattered. `grew` is the region this
    // particular cell's flora rolled from (`scatterRegion`), which near a
    // border may be the neighbour's — so a treeline interleaves instead of
    // stopping on a line.
    //
    // WATER IS NOT DITHERED, deliberately. A pond's shape comes from a field
    // read per cell, so dithering the multiplier would not soften its edge, it
    // would put noise in the middle of it: adjacent cells rolling different
    // water tables is a lake with holes. A tree is one object per cell and can
    // be wholly one region's; a body of water is a shape across many and
    // cannot.
    const terrain = biomeDef(biomeAt(seed, spot, x, y));
    const grew = biomeDef(scatterRegion(seed, spot, x, y));

    // MOLTEN ROCK, BEFORE THE WATER AND BEFORE EVERYTHING THAT GROWS. Two
    // separate things, and both are shaped land rather than scatter, which is why
    // they sit here with the water and not down among the trees:
    //
    //   • the caldera's LAKE — authored, a disc at the centre of a sited region,
    //     exactly as the giants are a disc at the centre of a wood; and
    //   • the cinders' SEAMS — the fen's pond field on its own salt, so they are
    //     blobs several tiles across and never a lone recoloured cell.
    //
    // Before the water on purpose. A stream is a global channel and one will run
    // across a caldera sooner or later; where they meet, the lake wins, because a
    // river with a hole of lava in it is a stranger picture than a river that
    // stops at one. Nobody remarks on either.
    //
    // Kept out of the town by the same `nearHome` guard everything in this block
    // is under, and by distance: the nearest caldera is 247 tiles out and the
    // cinders are far country. There is a test that sweeps the town for it anyway,
    // because "it cannot happen" is what every generator bug has said first.
    if (inLavaLake(seed, spot, x, y)) return LAVA;
    if (terrain.lava && pondDepth(seed, x, y, terrain.lava, LAVA_SALT) > 0) return LAVA;

    // Water, and the shore it makes. Every kind at once, deepest wins, and the
    // tile is four thresholds on the depth (see `waterAt` / `waterTile`).
    //
    // Kept out of the grove's setting so her trees can't end up ringed by
    // something you can see across and not walk across (see `nearGrove`) — and
    // out of the homestead clearing by the `nearHome` guard above, which is what
    // promises you always arrive somewhere you can stand.
    if (!nearGrove(seed, spot, x, y)) {
      const at = waterAt(seed, spot, x, y, terrain.water, terrain.pools);
      const wet = waterTile(at);
      // The town's own crossing, where it has one. Only the water itself is
      // decked — the shore either side is left as shore, so a bridge reads as a
      // bridge and not as a road that stops at the bank.
      if (at && (wet === WATER || wet === SHALLOW) && isTownBridge(x, y, at.kind)) return FLOOR;
      if (wet !== null) return wet;
    }

    // Two independent hashes so trees and rocks don't correlate into stripes.
    //
    // NO SPOT TERM HERE ANY MORE. "Forest edge" used to multiply this by 1.8,
    // which measured as real (8.5% of tiles near home became 15.3%) and read as
    // nothing: it thickened the ENTIRE WORLD uniformly, so there was no edge to
    // stand on — every region got denser together, including the ones you walk
    // to in order to get away from trees. The spot now bends the biome FIELD
    // instead (`biomeAt`), which puts a treeline where the town's meadow ends,
    // about thirty tiles out, and leaves the far country alone.
    const treeRoll = hash2(x, y, seed ^ 0x7a11) / 4294967296;
    const density = NODES.tree.density * grew.trees;
    if (treeRoll < density) return TREE;
    // Shrubs, on their own hash and AFTER the trees — a cell that grew a tree
    // stays a tree, so turning shrubs up in a region thickens its undergrowth
    // instead of thinning its canopy. Zero in every region that doesn't ask.
    if (
      grew.shrubs &&
      hash2(x, y, seed ^ 0x5e2b) / 4294967296 < NODES.shrub.density * grew.shrubs
    ) {
      return SHRUB;
    }
    if (rockRoll(seed, x, y) < NODES.rock.density * grew.rocks && rockIsLoneliest(seed, x, y)) {
      return ROCK;
    }
    // Deadwood, after everything that grows: a cell that grew a tree stays a
    // tree, so a region's stumps come out of its open ground rather than out of
    // its canopy. Zero in every region that doesn't ask (content/biomes.ts).
    //
    // LONELIEST, on the rock's own argument and its own salt. Two logs sharing an
    // edge read as one long lumpy object with a seam down it, and a log is
    // already the widest thing on the floor — welded to a stump it looks like a
    // rendering bug rather than like a wood.
    if (
      grew.deadwood &&
      deadRoll(seed, x, y) < DEADWOOD_DENSITY * grew.deadwood &&
      deadIsLoneliest(seed, x, y)
    ) {
      // Which of the two, on a hash that is NOT the placement roll. Sharing it
      // would tie "is there deadwood here" to "which kind", so every stump would
      // be the marginal roll and every log the comfortable one — the decor kit's
      // old bug, which this file is not going to make again.
      return hash2(x, y, seed ^ 0x6dd1) / 4294967296 < 0.45 ? STUMP : LOG;
    }

    // Ground clutter, on its own hashes so turning it up somewhere doesn't
    // reshuffle where that region's trees stand.
    if (grew.mushrooms > 0 && hash2(x, y, seed ^ 0x3f07) / 4294967296 < grew.mushrooms) {
      return MUSHROOM;
    }
  }
  return GRASS;
}

/** One tile's roll for a rock. Its own function now because the adjacency rule
 *  below has to ask the same question about the neighbours. */
function rockRoll(seed: number, x: number, y: number): number {
  return hash2(x, y, seed ^ 0x20c4) / 4294967296;
}

/** How much deadwood a region with `deadwood: 1` would have.
 *
 *  A THIRD OF THE ROCK'S, and it lives here rather than in content/nodes.ts for a
 *  reason that outlived its original one: deadwood IS a node now (it gathers into
 *  wood), but it is placed by ONE roll that then picks stump or log, so neither
 *  row has a density of its own to carry. Both are `density: 0` there, the dark
 *  tree's precedent. It sits beside the roll that uses it, the same way RECLAIM_MS
 *  sits beside `dig`.
 *
 *  Rare is the point. A log is something you come across; a wood MADE of fallen
 *  wood is a clearance site. */
const DEADWOOD_DENSITY = 0.012;

/** This tile's roll for deadwood, and the neighbours' — see deadIsLoneliest. */
function deadRoll(seed: number, x: number, y: number): number {
  return hash2(x, y, seed ^ 0x1b7f) / 4294967296;
}

/** Does no deadwood touch this one edge-on? The rock's rule exactly, on its own
 *  salt, and read `rockIsLoneliest` above for why it is arithmetic rather than a
 *  check: two adjacent tiles can never both have the strictly lower roll.
 *
 *  It matters MORE here than it does for rocks. A log's art is wider than its
 *  tile — it has to be, or it reads as a lump rather than as something long — so
 *  two of them side by side would actually overlap, not merely abut. */
function deadIsLoneliest(seed: number, x: number, y: number): boolean {
  const r = deadRoll(seed, x, y);
  return (
    r < deadRoll(seed, x + 1, y) &&
    r < deadRoll(seed, x - 1, y) &&
    r < deadRoll(seed, x, y + 1) &&
    r < deadRoll(seed, x, y - 1)
  );
}

/** Do no rocks touch this one edge-on?
 *
 *  ROCKS NEVER SIT SIDE BY SIDE. Two of them sharing an edge read as one lumpy
 *  object with a seam down it rather than as two rocks — the same failure the
 *  per-cell edges rule is about (CLAUDE.md), arriving through the scatter instead
 *  of through a draw call. Now that they have three silhouettes it is worse, not
 *  better: a boulder welded to a crag looks like a rendering bug.
 *
 *  HOW, given that generation is a total function of (seed, x, y) with no order
 *  and no memory. You cannot "place a rock and then check", and in an unbounded
 *  world there is no pass over the map to make. So the tile asks whether it wins
 *  a comparison it can compute alone: it is a rock only if its own roll is LOWER
 *  than its four neighbours' rolls. Two adjacent tiles can never both satisfy
 *  that — it would need rollA < rollB and rollB < rollA — so the property is
 *  guaranteed by arithmetic rather than by a check that might be forgotten.
 *
 *  Strictly lower, so the (vanishingly rare) hash tie drops both rocks rather
 *  than keeping both. Failing safe here means a missing rock, never a pair.
 *
 *  DIAGONALS ARE LEFT ALONE, deliberately: "adjacent" here means sharing an edge.
 *  Two rocks corner to corner have a tile's worth of grass between their
 *  silhouettes and read as a pair of rocks, which is scenery, not a seam.
 *
 *  It costs a little density — a rock is also suppressed when a NEIGHBOUR rolled
 *  lower but was already taken by a tree, which is a false block we accept
 *  because unpicking it means asking each neighbour the whole question
 *  recursively. See content/biomes.ts §scrub for the one region where that loss
 *  was big enough to be worth compensating for. */
function rockIsLoneliest(seed: number, x: number, y: number): boolean {
  const r = rockRoll(seed, x, y);
  return (
    r < rockRoll(seed, x + 1, y) &&
    r < rockRoll(seed, x - 1, y) &&
    r < rockRoll(seed, x, y + 1) &&
    r < rockRoll(seed, x, y - 1)
  );
}

// --- The underground ----------------------------------------------------------
// Solid by default: every unedited underground tile is rock, and the open space
// down there is entirely the space you carved. That inverts the surface (where
// generation hands you open ground and scatters obstacles onto it), and it is
// what makes a tunnel a thing you BUILT rather than a corridor you found.
//
// Ore veins are generated, not placed — a given town's veins are a stable fact
// about that town, the way its forest is. They sit inside the rock, so you only
// ever meet one at the face you are currently digging.

/** Deterministic underground tile before any edits. Note what it does NOT take:
 *  the homestead spot. The surface generator shapes itself around where you
 *  settled; the rock does not care, and a spot-dependent underground would mean
 *  two towns from one seed disagree about where the ore is. */
export function generatedUnderTile(seed: number, x: number, y: number): TileId {
  // The warren first: it is open space, and open space can't also be a vein.
  if (inWarren(seed, x, y)) return CAVE_FLOOR;
  const roll = hash2(x, y, seed ^ 0x0deb) / 4294967296;
  return roll < NODES.vein.density ? ORE_VEIN : BEDROCK;
}

// --- The sky ------------------------------------------------------------------
// The underground's inversion, inverted again. Down there the layer is solid and
// the open space is what you carved; up here the layer is open and there is
// nothing to carve, because there is no tool in the sky (DESIGN §The sky).
//
// So this generator is one line long, and its shortness is the design rather
// than an omission. No biomes — the world getting stranger with radius (7a) is a
// fact about the ground, and "what is over there" has the same answer in every
// direction up here forever. No water, no nodes, no clutter, nothing to gather.
// A plane of cloud, and quiet.

/** Deterministic sky tile. Like the rock, this could ignore the homestead spot —
 *  but unlike the rock it cannot, because the ONE feature up here is the head of
 *  a staircase, and where that staircase stands is a question about dry ground on
 *  the surface, which is a question about where you settled. */
export function generatedSkyTile(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): TileId {
  // Asked of the SURFACE siting, so the two ends of the flight cannot disagree —
  // there is no stored entrance for them to disagree about (sim/found.ts
  // §skyStairAt).
  const near = skyStairNear(seed, spot, x, y, onLand);
  if (near === null) return CLOUD;
  if (foundTile(near.site, x, y) === STAIR) return SKY_STAIR;
  // The parting, and it has a SOFT edge — the hash lets the thinning fray for
  // the last tile and a half instead of stopping on a circle. A hard rim would
  // read as a drawn ring on the floor of the sky, which is a marker; frayed, it
  // reads as cloud doing what cloud does.
  const frayed = SKY_PARTING - 1.5 + (hash2(x, y, seed ^ 0x5cae) / 4294967296) * 1.5;
  return near.d <= frayed ? CLOUD_THIN : CLOUD;
}

/** How far Sidra's home sits from the first staircase, in tiles.
 *
 *  A SHORT WALK, and the number is the whole of how she is findable. The sky has
 *  no landmarks and no bearings — every direction looks the same forever — so a
 *  home sited independently of the way up would be a person you could only find
 *  by luck, on a plane where luck is the only tool you have. Sited off the first
 *  staircase instead, arriving in the sky puts her about a screen away: far
 *  enough that she is not standing at the top of the steps waiting for you, near
 *  enough that walking a small circle finds her.
 *
 *  The climb was the hard part. Finding the flight of steps that goes anywhere is
 *  two hundred and forty tiles of walking past ones that do not, and the reward
 *  for a hard-to-reach place is the place (DESIGN §The Mole) — not a second
 *  search on the other side of the door. */
const COSMOS_HOME_REACH = 11;

/** Where she lives, when she is not down here. A total function of the seed,
 *  stored nowhere, exactly like the warren and the grove. */
export function cosmosHome(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  const c = skyStairCentre(seed, spot, 0, onLand);
  // Its own salt, and no `onLand`: there is no water in the sky and nothing up
  // there to be pushed off, which is the one way this siting is simpler than
  // every landmark before it.
  const a = (hash2(7, 0, seed ^ 0x51d2) / 4294967296) * Math.PI * 2;
  return {
    x: Math.round(c.x + Math.cos(a) * COSMOS_HOME_REACH),
    y: Math.round(c.y + Math.sin(a) * COSMOS_HOME_REACH),
  };
}

// --- The warren ---------------------------------------------------------------
// The one place the rock is already open when you get there. Somebody else has
// been digging out here for a long time (DESIGN §"The Mole, specifically"), and
// you find out because your tunnel breaks into his.
//
// Shape matters more than it looks. A lone chamber somewhere in unbounded rock
// is a lottery — a straight tunnel in a random direction would miss it forever —
// so what surrounds the town at this distance is his ROUNDS: a wandering
// corridor that closes on itself, which any tunnel going outward has to cross.
// Following it is then the exploration, and it needs no marker to be findable.
//
// It is a total function of (seed, x, y) like everything else down here, so a
// town's warren is a stable fact about that town and nothing about it is stored.

/** Roughly how far out his rounds run, in tiles from the origin. Far enough
 *  that you arrived on purpose — past slate (12), past the first deep finds —
 *  and near enough that it is a long walk rather than an expedition. */
const WARREN_RING = 30;

/** How much the corridor wanders in and out. Without this it is a circle, and a
 *  perfect circle in the rock reads as a game object rather than as somebody's
 *  habit. */
const WARREN_WANDER = 5;

/** Corridor half-width. One means a three-wide passage: wide enough to walk and
 *  to read as cut on purpose, narrow enough that you can tunnel straight across
 *  it and notice you did. */
const WARREN_WIDTH = 1;

/** Where he actually lives, on the ring. A wide spot, not a room with a door —
 *  he is a hermit, not a resident. */
const CHAMBER_RADIUS = 4;

/** The radius his rounds sit at for this bearing. Two sine terms with
 *  seed-derived phases: cheap, smooth, and it never repeats around the circle
 *  the way a single term would. */
function warrenRadius(seed: number, angle: number): number {
  const a = (hash2(1, 0, seed ^ 0x3f0e) / 4294967296) * Math.PI * 2;
  const b = (hash2(2, 0, seed ^ 0x3f0e) / 4294967296) * Math.PI * 2;
  return WARREN_RING + WARREN_WANDER * (0.6 * Math.sin(angle * 3 + a) + 0.4 * Math.sin(angle * 5 + b));
}

/** The bearing his chamber sits at — one number per town, and the only thing
 *  that decides which way you have to dig. */
function chamberAngle(seed: number): number {
  return (hash2(3, 0, seed ^ 0x3f0e) / 4294967296) * Math.PI * 2;
}

/** Where the Mole is, in world tiles. Derived, never stored: the chamber is
 *  generated rock, so a save can no more disagree about where he lives than it
 *  can disagree about where the ore is. */
export function warrenChamber(seed: number): { x: number; y: number } {
  const angle = chamberAngle(seed);
  const r = warrenRadius(seed, angle);
  return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r) };
}

/** Is this cell part of the warren — his rounds, or the chamber on them? */
export function inWarren(seed: number, x: number, y: number): boolean {
  const dist = Math.hypot(x, y);
  // Cheap rejection first: this runs for every generated underground cell in
  // every chunk, and the overwhelming majority are nowhere near.
  if (dist < WARREN_RING - WARREN_WANDER - CHAMBER_RADIUS - 1) return false;
  if (dist > WARREN_RING + WARREN_WANDER + CHAMBER_RADIUS + 1) return false;

  const chamber = warrenChamber(seed);
  if (Math.hypot(x - chamber.x, y - chamber.y) <= CHAMBER_RADIUS) return true;

  const angle = Math.atan2(y, x);
  return Math.abs(dist - warrenRadius(seed, angle)) <= WARREN_WIDTH;
}

// --- The surface secrets (Phase 4c) -------------------------------------------
// The warren's trick, brought up into the daylight: a landmark is a total
// function of (seed, x, y), so it is a stable fact about a town and NOTHING
// about it is stored. That is what keeps 4c off the save schema entirely, and
// it is also what keeps it a secret — a fixture stamped by a migration is
// something the game gave you, and this is something you walked into.
//
// Both sit further out than the Mole (30), for one reason: he is met by
// tunnelling, which is slow, and these are met on foot, which is not.

/** How far out the grove stands. Past every reason you'd have to be out there —
 *  the woods near town restock on their own, so nobody walks forty tiles for
 *  timber. If you are here, you were going somewhere. */
const GROVE_RING = 44;

/** Its bearing. One number per town, and the only thing that decides which way
 *  you have to walk. Its own salt, so it never lines up with the warren's — a
 *  town where the grove is directly above the chamber would read as a puzzle. */
function groveAngle(seed: number): number {
  return (hash2(4, 0, seed ^ 0x5eed) / 4294967296) * Math.PI * 2;
}

/** THE SITES HAVE TO KNOW ABOUT THE WATER, and this was found on screen rather
 *  than in a test. Back when the sea was the whole western half-plane, a bearing
 *  picked from the seed alone drowned the grove in about half of all riverside
 *  towns: a stand of trees in open ocean, unreachable, with a Ghost standing in
 *  it. See `onLand` (down beside the water field, which it now has to consult)
 *  for what replaced the mirror that used to fix it.
 *
 *  Where the dark wood is. */
export function groveCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("grove", seed, spot, () => onLand(seed, spot, GROVE_RING, groveAngle(seed)));
}

/** How wide the stand is. Big enough to be unmistakably a place and not a
 *  clump; small enough that you can see across it and spot her in it. */
const GROVE_RADIUS = 5;

/** How much of the disc actually carries a tree. Not all of it: a solid block
 *  of trunks is a wall, and you have to be able to walk INTO a grove for it to
 *  be somewhere she can stand. The gaps are also where the light gets in. */
const GROVE_DENSITY = 0.55;

/** The clearing at the heart of it, kept free of trees so there is somewhere to
 *  stand — hers, and yours when you get there. Two tiles: a room, not a lawn. */
const GROVE_CLEARING = 2;

/** Is this cell one of her trees? A hashed disc — dense in the middle, thinning
 *  at the edge, so the stand has a soft boundary rather than a circular cut. */
export function inGrove(seed: number, spot: HomesteadSpot, x: number, y: number): boolean {
  const c = groveCentre(seed, spot);
  const d = Math.hypot(x - c.x, y - c.y);
  if (d > GROVE_RADIUS || d <= GROVE_CLEARING) return false;
  const falloff = 1 - (d / GROVE_RADIUS) * 0.6;
  return hash2(x, y, seed ^ 0x0a17) / 4294967296 < GROVE_DENSITY * falloff;
}

/** Ground that will not take construction — a wall, a board, a piece of
 *  furniture. Her trees' ground, and only that.
 *
 *  WHY THIS EXISTS. Every secret out here is sited by distance from the origin
 *  (Mole 30, grove 44, cube 58) on the assumption that the town stays put. Once
 *  the town can grow outward, a successful one eventually arrives at its own
 *  grove, and the Quiet Ghost standing in a finished suburb is not a thing we
 *  want to have built.
 *
 *  WHY IT ISN'T "THE TREES DON'T FELL". Felling was never the threat: a dark
 *  tree drops wood, pays out `walnut` — "the place pays out, not a person"
 *  (sim/ghost.test.ts) — and grows back in eight hours like any other tree, so
 *  the stand heals itself while you're away. Making it unfellable would have
 *  deleted a finish, and asymmetrically: saves that already had walnut would
 *  keep it while new towns never could. CONSTRUCTION is the threat, because a
 *  wall is a stored edit and no edit ever grows back.
 *
 *  It follows `inGrove`, which is a hashed disc with a soft edge, rather than a
 *  radius of its own. A circular no-build zone would give the stand a hard edge
 *  that the art doesn't have, and the seam is exactly the kind of thing a player
 *  finds by dragging a wall across it.
 *
 *  What it does NOT refuse, deliberately: digging, tilling, planting, sinking a
 *  shaft, or building in the CLEARING. The clearing is "the room she stands in
 *  and the room you arrive into" — somebody who walks forty-four tiles and puts
 *  a house in it has earned the Ghost as a neighbour, and that is a better story
 *  than anything we'd be protecting them from. What's refused is paving over her
 *  trees, and only on the surface: the rock under the grove is just rock. */
export function refusesConstruction(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): boolean {
  // Only the surface has a grove to protect. The rock under it is just rock, and
  // the sky above it refuses construction for a much simpler reason that lives
  // somewhere else entirely: there is no build tool up there to refuse
  // (sim/game.ts §TOOLS_ON). Answering "no objection" here is honest — this
  // function is about the ground, and neither of those is ground.
  if (layer !== "surface") return false;
  return inGrove(world.seed, world.homestead.spot, x, y);
}

/** Is this the open ground at the middle of the grove? Nothing grows here —
 *  neither her trees nor ordinary ones — because it is the room she stands in
 *  and the room you arrive into. */
export function inGroveClearing(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): boolean {
  const c = groveCentre(seed, spot);
  return Math.hypot(x - c.x, y - c.y) <= GROVE_CLEARING;
}

/** How far out the cube is, and on its own bearing. Further than the grove and
 *  in a different direction, so finding one tells you nothing about the other.
 *  Two secrets that share a walk are one secret. */
const CUBE_RING = 58;

export function cubeSite(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("cube", seed, spot, () =>
    onLand(seed, spot, CUBE_RING, (hash2(5, 0, seed ^ 0x11b3) / 4294967296) * Math.PI * 2),
  );
}

function isCubeSite(seed: number, spot: HomesteadSpot, x: number, y: number): boolean {
  const c = cubeSite(seed, spot);
  return x === c.x && y === c.y;
}

// --- Biomes -------------------------------------------------------------------
// Which region a tile belongs to. A total function of (seed, x, y) like
// everything else out here, so a town's layout is a stable fact about it and not
// one byte of this reaches the save.
//
// JITTERED VORONOI, NOT A GRID. The obvious implementation — hash the macro cell
// and take its biome — draws every boundary on a straight line 64 tiles long,
// and the world would read as tiled. That is the per-cell edges rule (CLAUDE.md)
// at a hundred times the scale: an edge that follows the grid stops the surface
// reading as a surface, whether the grid is one tile or sixty-four. So each macro
// cell gets ONE jittered site and a tile joins whichever site is nearest, which
// gives irregular regions with organic borders for nine distance checks.
//
// Nine is the whole neighbourhood: a site can wander anywhere inside its own
// cell, so the nearest one is always in the 3×3 around you and never further.

/** How coarse the field is, in tiles. Chosen so a walk crosses two or three
 *  regions rather than one — a region you cannot leave is a world, and a region
 *  you cross in ten steps is a flowerbed. It also has to be wide enough that the
 *  town's own region comfortably contains the town (see `originSite`). */
const BIOME_CELL = 68;

/** How far a site may wander inside its cell, as a fraction.
 *
 *  Deliberately modest, and it was 0.72 until the warp arrived. Two jobs were
 *  competing in this number: making regions look irregular, and keeping foreign
 *  sites far enough from the origin that the town's region provably contains the
 *  town. `BIOME_WARP` does the first job better than jitter ever did — it bends the
 *  borders themselves rather than just moving the middles — so this can go back to
 *  buying clearance, which is the thing a live save depends on. */
const BIOME_JITTER = 0.5;

/** The site owning one macro cell, in world tiles.
 *
 *  Cells are CENTRED on the origin, not cornered at it — `biomeCell` shifts by
 *  half a cell — and cell (0,0)'s site is pinned to the origin exactly. Those two
 *  facts together are what make the town's region big enough to hold the town;
 *  see `originSite`. Cornered at the origin, the plaza would sit where four
 *  regions meet and be quartered between them. */
function biomeSite(seed: number, mx: number, my: number): { x: number; y: number } {
  if (mx === 0 && my === 0) return { x: 0, y: 0 };
  const jx = hash2(mx, my, seed ^ 0x0b10) / 4294967296;
  const jy = hash2(mx, my, seed ^ 0x51e) / 4294967296;
  const pad = (1 - BIOME_JITTER) / 2;
  return {
    x: (mx - 0.5 + pad + jx * BIOME_JITTER) * BIOME_CELL,
    y: (my - 0.5 + pad + jy * BIOME_JITTER) * BIOME_CELL,
  };
}

/** Which macro cell a tile falls in, offset so the origin is a cell CENTRE. */
function biomeCell(v: number): number {
  return Math.floor(v / BIOME_CELL + 0.5);
}

/** How far the field is warped before it is sampled, in tiles.
 *
 *  A VORONOI BORDER IS A STRAIGHT LINE — the perpendicular bisector of two sites —
 *  and over thirty tiles that reads as a polygon rather than as country. Found on
 *  screen at the edge of the blossom rows, a clean vertical seam the full height of
 *  the window. Nothing was grid-aligned, so the band rule was satisfied and it
 *  still looked wrong.
 *
 *  So the QUERY POINT is nudged before the lookup, by a smooth function of where
 *  it is. Straight bisectors come out as wandering edges and the regions stay
 *  regions. Small on purpose: the town's own region has 41 tiles of clearance and
 *  needs to reach 20 (`HOME_REGION_REACH`), so the warp has to be much smaller
 *  than that margin or it could push a town cell into the next region. */
const BIOME_WARP = 4;

/** The warp offsets. Two sine terms with seed-derived phases — the same trick
 *  `warrenRadius` uses to stop the Mole's rounds being a circle, and for the same
 *  reason: cheap, smooth, and it never repeats over a distance you can walk.
 *
 *  Each axis is driven by the OTHER one's coordinate, so the field shears rather
 *  than merely sliding — a warp of x driven by x would leave vertical borders
 *  vertical, which is the case this exists to fix. */
function biomeWarp(seed: number, x: number, y: number): { x: number; y: number } {
  const pa = (hash2(7, 0, seed ^ 0x4d17) / 4294967296) * Math.PI * 2;
  const pb = (hash2(8, 0, seed ^ 0x4d17) / 4294967296) * Math.PI * 2;
  return {
    x: x + BIOME_WARP * (0.6 * Math.sin(y / 19 + pa) + 0.4 * Math.sin(y / 7 + pb)),
    y: y + BIOME_WARP * (0.6 * Math.sin(x / 23 + pb) + 0.4 * Math.sin(x / 9 + pa)),
  };
}

/** Which macro cell's site is nearest to a tile. The site's CELL is the answer
 *  rather than its position, because the cell is what a biome is chosen from. */
function nearestSite(seed: number, x: number, y: number): { mx: number; my: number } {
  const cx = biomeCell(x);
  const cy = biomeCell(y);
  let best = { mx: cx, my: cy };
  let bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const mx = cx + dx;
      const my = cy + dy;
      const s = biomeSite(seed, mx, my);
      const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); // squared; no sqrt needed
      if (d < bestD) {
        bestD = d;
        best = { mx, my };
      }
    }
  }
  return best;
}

/** How far from the origin the town's own region is GUARANTEED to reach.
 *
 *  Not a tuning number — a proof obligation, and `biomeSite` and `BIOME_JITTER` are
 *  built to meet it. Cell (0,0)'s site is pinned to the origin, and every other
 *  cell is centred a full BIOME_CELL away with only BIOME_JITTER of that to wander
 *  in, so the nearest foreign site is at least (1 - BIOME_JITTER/2) × BIOME_CELL =
 *  51 tiles out. A tile within half of that is always nearer to the origin than to
 *  anything else — less `BIOME_WARP`, which moves the query point before any of it
 *  is asked. 25 minus 4 is the 21 below.
 *
 *  IT WAS 20, AND THE THOUSAND-SEED TEST BELOW CAUGHT IT. Adding the warp quietly
 *  spent the margin this depended on, and seed 93's forest homestead landed its
 *  corner (15,13) — 19.8 tiles out — in the next region along. That is exactly the
 *  failure that grows a tree inside somebody's finished house.
 *
 *  The town needs about 14 of it: the plaza reaches (5,5) and the homestead
 *  clearing reaches (10,9). There is a test that walks the whole town footprint
 *  on a thousand seeds, because this is the assertion that a live save depends
 *  on. */
export const HOME_REGION_REACH = 21;

/** THE MIGRATION, and it is a property of the GENERATOR rather than of the save.
 *
 *  The Farm has live saves and base terrain is not stored, so a generator that
 *  answers differently re-landscapes towns that already exist — "an unedited tile
 *  is always whatever generation says, forever" (top of this file) quietly stops
 *  being true. That is not a cosmetic risk: an unedited cell inside a house
 *  somebody already built could come back a TREE, which is solid, which breaks
 *  the room and the roof derived from it.
 *
 *  So the town's own region is always `meadow`, whose every number in
 *  content/biomes.ts is an identity — 1× densities, zero clutter, zero tint. The
 *  ground people have actually built on generates byte-for-byte what it did
 *  before this feature existed.
 *
 *  It forces the REGION and not a radius, and that distinction is the whole
 *  reason for the pinned site above. A circle of ordinary grass stamped around
 *  the plaza would draw a hard rim across open country wherever a different
 *  region came near — the per-cell edges rule at the largest scale in the game.
 *  A region's borders are irregular, so there is no seam to find. */
function originSite(): { mx: number; my: number } {
  // Cell (0,0), by construction: its site is pinned to the origin and every other
  // site is a full cell away, so nothing else can be nearer to it. Stated rather
  // than searched so the warp above cannot move the answer — the town's region has
  // to be a fixed fact, not something a sine wave votes on.
  return { mx: 0, my: 0 };
}

/** How far out the cherry stands are, and on their own bearing. Past the cube
 *  (58), because this is the one region you are TOLD about — an arrival can ask
 *  to live here — and a destination somebody names should be further than the
 *  secrets nobody does. */
const BLOSSOM_RING = 72;

/** How wide. Big enough to be a place you live in rather than a photograph:
 *  several houses' worth of pink, with room for a garden.
 *
 *  Exported for the turf-blend test, which has to assert that softening this
 *  edge did not consume the disc behind it (see `edgeMix`). */
export const BLOSSOM_RADIUS = 9;

/** Where the cherry trees are. Sited, not rolled — see BIOMES.blossom. Runs
 *  through `onLand` like every landmark, because an orchard standing in the sea
 *  is the day that function cost us. */
export function blossomCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("blossom", seed, spot, () =>
    onLand(seed, spot, BLOSSOM_RING, (hash2(6, 0, seed ^ 0x7c1d) / 4294967296) * Math.PI * 2),
  );
}

// --- The redwood stands -------------------------------------------------------
//
// SITED LIKE THE BLOSSOM ROWS AND RECURRING LIKE A FOUND PLACE, which is a
// combination nothing else in the world has, and each half of it is load-bearing.
//
// Sited, because a region you happen into is scenery and a wood you walked to is
// somewhere you went (content/biomes.ts §redwoods). Recurring, because one per
// town would say the world runs out of them — the found places' argument, made
// there about secrets and true here about country: walking further has to keep
// finding more, or the map has an edge made of contents.
//
// It reuses the found places' ring arithmetic rather than their table, and the
// reason it is not simply a FoundDef is that a found place puts TILES down inside
// somebody else's region. This puts down a region. That is a different kind of
// thing — it has a palette, a canopy and a floor — so it belongs to the biome
// field, and the only thing borrowed is how you ask "which instance, if any, is
// this tile inside".

/** A REGION SITED ON A RING, RECURRING OUTWARD FOREVER — the redwood stands'
 *  shape, generalised the moment a second thing wanted it (the caldera).
 *
 *  Two of these is where a pattern earns a type. Everything here was written
 *  inline for the woods and every line of it is the same for a volcano: a first
 *  ring, a spacing nothing else shares, a radius, the dry margin its own width
 *  demands, and a salt so two regions on nearby rings never share a bearing.
 *
 *  THE CACHE LIVES IN THE DEF, and that is not a style flourish — see
 *  `ringCentre`. These are asked per visible tile per frame, and the first
 *  version keyed a shared Map on a template string and timed a test suite out
 *  building keys. One world, one array per region, no allocation. */
interface RingRegion {
  ring: number;
  spacing: number;
  radius: number;
  /** How much dry ground the centre wants around it — its own radius plus a
   *  beach. Passed to `onLand` rather than raising LANDMARK_MARGIN, which would
   *  re-site every grove, cube and orchard in every live save. */
  margin: number;
  salt: number;
  cache: { seed: number; spot: string; at: ({ x: number; y: number } | undefined)[] };
}

/** The redwood stands. First ring past the blossom rows (72) and the nearest
 *  found place (96): everything nearer is either named in dialogue or small
 *  enough to walk through by accident, and a wood is neither.
 *
 *  RADIUS 24, AND IT GREW FROM 17 BECAUSE OF THE FADE — the edgeMix rule arriving
 *  from the other direction. That floor is the steepest colour change in the near
 *  world (grass to duff is ninety-six levels of green), so it needs a fade twice
 *  a border's, and a twenty-tile approach through a seventeen-tile disc leaves a
 *  core of five, which dissolves the thing the edge was drawn around. The wood is
 *  bigger instead: fourteen tiles of full-strength redwood in the middle, and the
 *  rest of the way in is the treeline thickening.
 *
 *  The spacing is shared with no other ring in the game, for content/found.ts's
 *  reason: two things on the same spacing eventually pair up at the same radius
 *  over and over, and a player who noticed would have a rule instead of a place. */
const REDWOODS: RingRegion = {
  ring: 168,
  spacing: 191,
  radius: 24,
  margin: 30,
  salt: 0x2b9f,
  cache: { seed: -1, spot: "", at: [] },
};

/** The caldera. Further out than the woods and rarer, because it is the loudest
 *  place in the world that is not one of the strange three — and its own ring so
 *  that finding one is a different walk from finding the other.
 *
 *  Radius 20 with a five-tile lake at the middle, which is the number the whole
 *  region turns on: the ring of ash around the lava has to be wide enough to walk
 *  all the way round inside the disc, or the thing you came to see is a wall
 *  (content/biomes.ts §cinder, and the fen's rule before it). */
const CALDERA: RingRegion = {
  ring: 247,
  spacing: 233,
  radius: 20,
  margin: 26,
  salt: 0x71c3,
  cache: { seed: -1, spot: "", at: [] },
};

/** THE STATIC — the furthest-out sited region there is, and the last thing the
 *  far country has to say (content/biomes.ts §static).
 *
 *  ITS RING IS THE ROW'S WHOLE ARGUMENT ABOUT PLACEMENT. The woods start at 168
 *  and the calderas at 247, both comfortably inside the strangeness ramp
 *  (STRANGE_FROM 200, STRANGE_TO 900) — you can meet either before the world has
 *  finished getting odd. This one starts at 604, which is deep in the drift, so by
 *  the time you can find one you have already walked through violet woods and
 *  glowing ground and a wood the light goes through. It is the last note and it
 *  needs everything before it to have been played.
 *
 *  Not past the plateau, though, and that is deliberate too: 900 is where the
 *  world stops getting stranger, and a region sited beyond it would be a thing
 *  the escalation never reaches — a separate game at the end of a walk. This sits
 *  inside the last third of the ramp, which is the strangest country that is still
 *  the same country.
 *
 *  RADIUS 16, the smallest of the three ring regions. Two reasons that agree: a
 *  glitch is a thing you find the edge of (you have to be able to stand in
 *  correct grass and look into it, or there is nothing to compare against), and
 *  the effect is the loudest in the game, which is the glass wood's argument for
 *  rarity applied to size instead of frequency.
 *
 *  Its own spacing, sharing no number with any other ring in the game — the found
 *  places' rule: two things on one spacing eventually pair up at the same radius
 *  over and over, and a player who noticed would have a rule instead of a place. */
const STATIC: RingRegion = {
  ring: 604,
  spacing: 271,
  radius: 16,
  margin: 22,
  salt: 0x3d0f,
  cache: { seed: -1, spot: "", at: [] },
};

/** The lake of molten rock at a caldera's centre, in tiles. A quarter of the
 *  disc's own radius: big enough that you cannot see across it without walking,
 *  small enough that fifteen tiles of ash go round it on every bearing. */
export const LAKE_RADIUS = 5;

export const REDWOOD_RADIUS = REDWOODS.radius;
export const CALDERA_RADIUS = CALDERA.radius;

/** The stand of giants at the middle of a wood, in tiles. Small on purpose: a
 *  grove of giants is the HEART of a wood and not the wood, so you walk through
 *  ordinary redwoods to reach it and out through them again. */
export const GIANTS_RADIUS = 5;

/** One stand in this many has giants in it, by the instance's own hash.
 *
 *  IT IS NOT A COUNT AND CANNOT BE ONE. Instances run outward forever, so this
 *  is a rate rather than a quota — there is no last one, no "three of four
 *  found", and nothing anywhere that could tell you which kind you are walking
 *  into until you are standing in it. Four is the number that makes finding one
 *  a thing that happened rather than a thing that happens.  */
const GIANTS_IN = 4;

/** Where one instance of a ring-sited region is. Memoised per (seed, spot) in
 *  the def's own array — this is arithmetic, not state.
 *
 *  NOT `memoCentre`, WHICH IS WHAT IT WAS AND WHAT TIMED A SUITE OUT. Every other
 *  landmark centre is looked up once per landmark; these are on `biomeAt`'s path,
 *  which runs per visible ground tile per frame and per tile of every sweep in
 *  the tests. At that rate `${tag}:${seed}:${spot}` is two string allocations a
 *  tile, and the near-world sweep spent its whole budget building keys for a
 *  lookup that hit every time. A session plays one world, so one (seed, spot) and
 *  an array by index is the whole requirement. */
function ringCentre(
  def: RingRegion,
  seed: number,
  spot: HomesteadSpot,
  index: number,
): { x: number; y: number } {
  if (def.cache.seed !== seed || def.cache.spot !== spot) {
    def.cache.seed = seed;
    def.cache.spot = spot;
    def.cache.at = [];
  }
  let at = def.cache.at[index];
  if (at === undefined) {
    at = onLand(
      seed,
      spot,
      def.ring + index * def.spacing,
      (hash2(index, 0, seed ^ def.salt) / 4294967296) * Math.PI * 2,
      def.margin,
    );
    def.cache.at[index] = at;
  }
  return at;
}

/** Which instance of a ring-sited region a tile is inside, and how far it is from
 *  that instance's centre. Null when it is inside none.
 *
 *  The ring window is `foundSiteAt`'s exactly (sim/found.ts): a centre sits on
 *  its ring to within a tile's rounding, so anything further from the ring than
 *  the footprint plus that rounding is outside every instance, and the whole
 *  question costs two subtractions for almost every tile in the world. `reach`
 *  widens the window for the turf blend, which has to find a region it is NEAR as
 *  well as one it is in. */
function ringSiteAt(
  def: RingRegion,
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
  reach = 0,
): { index: number; d: number } | null {
  const r = Math.hypot(x, y);
  const slack = def.radius + reach + 2;
  const lo = Math.ceil((r - slack - def.ring) / def.spacing);
  const hi = Math.floor((r + slack - def.ring) / def.spacing);
  for (let i = Math.max(0, lo); i <= hi; i++) {
    const c = ringCentre(def, seed, spot, i);
    const d = Math.hypot(x - c.x, y - c.y);
    if (d <= def.radius + reach + 0.5) return { index: i, d };
  }
  return null;
}

/** Where a redwood stand is, per instance. Exported for the tests and the
 *  screenshot script, exactly as `blossomCentre` is: "there is a wood on every
 *  ring on every seed and none of it is in the sea" is not a question you can ask
 *  by sweeping tiles, because at these radii the sweep is a million points and
 *  the wood is a disc of eighteen hundred. */
export function redwoodCentre(
  seed: number,
  spot: HomesteadSpot,
  index: number,
): { x: number; y: number } {
  return ringCentre(REDWOODS, seed, spot, index);
}

/** Where a caldera is, per instance. Same argument as the woods', and one more:
 *  a lake of lava is five tiles across and no sweep would ever land on it. */
export function calderaCentre(
  seed: number,
  spot: HomesteadSpot,
  index: number,
): { x: number; y: number } {
  return ringCentre(CALDERA, seed, spot, index);
}

/** Where a patch of the Static is, per instance. Exported for the same two
 *  reasons the woods' and the calderas' centres are: a disc of sixteen tiles six
 *  hundred out is not a thing a test sweep would ever land on, and the preview
 *  page has to be able to ask where one is rather than search for it. */
export function staticCentre(
  seed: number,
  spot: HomesteadSpot,
  index: number,
): { x: number; y: number } {
  return ringCentre(STATIC, seed, spot, index);
}

/** Does this instance carry the giants? Its own salted hash, so it is a fact
 *  about that stand and not about the order you found them in. */
function hasGiants(seed: number, spot: HomesteadSpot, index: number): boolean {
  const s = spot.charCodeAt(0);
  return hash2(index, s, seed ^ 0x51a7) % GIANTS_IN === 0;
}

/** Which redwood stand a tile is in, if any, and whether it is in the giants at
 *  the middle of it. */
function redwoodSiteAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): { index: number; giants: boolean } | null {
  const at = ringSiteAt(REDWOODS, seed, spot, x, y);
  if (!at) return null;
  return { index: at.index, giants: at.d <= GIANTS_RADIUS && hasGiants(seed, spot, at.index) };
}

/** Is this tile the lava at the middle of a caldera? Asked by `generatedTile`,
 *  which is why it is a separate question from `biomeAt`: the lake is TILES and
 *  the region around it is a palette, and the two have different radii.
 *
 *  LOBED, NOT ROUND, and the screen is what insisted. A true disc of radius five
 *  quantised onto the tile grid photographs as a RECTANGLE with a couple of steps
 *  in it — at this camera you are looking at eleven tiles across, so a circle has
 *  nowhere near enough cells to read as a curve, and the eye finds the straight
 *  runs immediately. The wobble is `clearingRadius`'s exactly: two sine terms on
 *  the bearing with seeded phases, so the shore comes out in bays and headlands
 *  and no two calderas are the same shape. ±25% of the radius, which is enough to
 *  break every straight run and not enough to reach the ring of ash the whole
 *  region depends on being walkable. */
function inLavaLake(seed: number, spot: HomesteadSpot, x: number, y: number): boolean {
  const at = ringSiteAt(CALDERA, seed, spot, x, y);
  if (!at) return false;
  const c = ringCentre(CALDERA, seed, spot, at.index);
  const th = Math.atan2(y - c.y, x - c.x);
  const pa = (hash2(at.index, 1, seed ^ 0x71c3) / 4294967296) * Math.PI * 2;
  const pb = (hash2(at.index, 2, seed ^ 0x71c3) / 4294967296) * Math.PI * 2;
  const wobble = 0.62 * Math.sin(th * 3 + pa) + 0.38 * Math.sin(th * 5 + pb);
  return at.d <= LAKE_RADIUS * (1 + 0.25 * wobble);
}

/** Which found place a tile belongs to, if any (Phase 7b).
 *
 *  The wrapper exists so `onLand` stays private to this file: sim/found.ts needs
 *  it, and importing it the other way would put a cycle between the two — a module
 *  that half-initialises and hands back a landmark at (0,0). Everything outside
 *  terrain asks this, not `foundSiteAt`. */
export function foundAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): FoundSite | null {
  return foundSiteAt(seed, spot, x, y, onLand);
}

/** The staircase that goes somewhere, if this coordinate is one of its steps
 *  (Phase 7c). Same wrapper, same reason as `foundAt`. */
export function skyStairSiteAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): FoundSite | null {
  return skyStairAt(seed, spot, x, y, onLand);
}

/** Which biome a tile is in.
 *
 *  Cheap enough to ask per visible tile per frame — nine squared distances and
 *  two hashes each — because the renderer needs it for every patch of ground and
 *  every crown on screen, and a cached answer would be one more thing that can
 *  disagree with the generator. */
export function biomeAt(seed: number, spot: HomesteadSpot, x: number, y: number): BiomeId {
  const b = blossomCentre(seed, spot);
  if (Math.hypot(x - b.x, y - b.y) <= BLOSSOM_RADIUS) return "blossom";

  // The redwood stands, after the blossom rows and before the field. Order is a
  // decision and not an accident: the cherry trees are the region a villager can
  // ASK to live in, so on the rare seed where the two discs touch, the one
  // somebody is waiting on wins. Everything the field would have rolled here is
  // overwritten either way — a sited region is a statement about a place, and the
  // roll is what happens where nothing has been stated.
  const rw = redwoodSiteAt(seed, spot, x, y);
  if (rw) return rw.giants ? "giants" : "redwoods";

  // The calderas, after the woods and before the field. A burnt disc and a wood
  // can only collide if two independent bearings put them at the same place at
  // nearly the same radius, which is rare and which nobody could tell from a
  // decision — but it has to be decided somewhere, or the same tile answers
  // differently depending on who asked. The wood wins, because a lake of lava in
  // a redwood grove is the more obviously wrong of the two pictures.
  if (ringSiteAt(CALDERA, seed, spot, x, y)) return "caldera";

  // The Static, last of the sited regions and lowest priority of them, which is
  // the same tie-break the caldera just took one line up: on the vanishingly rare
  // seed where two independent bearings land a glitch on top of a lake of lava,
  // the thing that was already there wins. Its ring is 604 and the calderas' is
  // 247 on a spacing of 233, so this can only happen where a far caldera ring
  // brushes the first static one — which is why it is decided rather than left to
  // whichever function is asked first.
  if (ringSiteAt(STATIC, seed, spot, x, y)) return "static";

  const w = biomeWarp(seed, x, y);
  const site = nearestSite(seed, w.x, w.y);
  const home = originSite();
  const atHome = site.mx === home.mx && site.my === home.my;

  // The forest edge: a clearing with the town in it, and trees from there out.
  //
  // TWO RULES, BECAUSE ONE WAS NOT AN EDGE. Forcing the eight cells AROUND the
  // town's is the obvious version and it measured as almost nothing — a wooded
  // region already turns up within forty tiles of home on 88% of seeds by pure
  // chance, so guaranteeing it moved the tree count from 8.4% to 11.5% and put
  // the border a full BIOME_CELL out, at ~34 tiles, where it reads as a patch
  // near the horizon rather than as somewhere the meadow stops.
  //
  // So the town's own cell gets a RADIUS as well, and that is the rule you can
  // actually see: meadow to `FOREST_CLEARING`, wood past it. The ring is a
  // single kind — it is one wood, the town's own — and it meets whatever the
  // neighbouring regions turned out to be further out.
  if (spot === "forest" && atHome) {
    // Measured from the ORIGIN, not from the homestead plot, so the clearing
    // is the town's and not the player's — you live at its edge, like
    // everybody else does.
    // THE RING IS ALWAYS PINES, and that is not a missed chance for variety.
    // The coin flip `siteRegion` does elsewhere decides between 2.2× trees on a
    // needle-dark floor and 1.4× on a pale one, and on the seeds that came up
    // birch the treeline of a town chosen FOR its treeline was a faint speckle
    // you had to be told about — seed 31, found by looking. The wood you can
    // see from your own door is the whole promise of the spot, so it does not
    // get to be the sparse one. Past the clearing the flip resumes, so walking
    // out still finds birches; they are just not what the promise rests on.
    if (Math.hypot(x, y) > clearingRadius(seed, Math.atan2(y, x))) return "pinewood";
  }

  return siteRegion(seed, spot, site.mx, site.my);
}

/** The region a SITE stands for, with no per-tile rule applied.
 *
 *  Split out of `biomeAt` so the blend below can ask the same question of a
 *  site that is not the nearest one. The two per-tile overrides — the blossom
 *  disc and the forest clearing — deliberately stay in `biomeAt`, because they
 *  are radii rather than regions and the blend gives them their own soft edge. */
function siteRegion(seed: number, spot: HomesteadSpot, mx: number, my: number): BiomeId {
  const home = originSite();
  if (mx === home.mx && my === home.my) return "meadow";

  if (spot === "forest" && Math.max(Math.abs(mx - home.mx), Math.abs(my - home.my)) === 1) {
    return hash2(mx, my, seed ^ 0x7ee5) % 2 === 0 ? "pinewood" : "birch";
  }

  const roll = hash2(mx, my, seed ^ 0x30de) / 4294967296;
  return rollRegion(roll, strangeness(seed, mx, my));
}

/** Where the world starts getting strange, and where it stops getting stranger,
 *  as distances from the plaza datum in tiles (DESIGN.md §Biomes).
 *
 *  200 IS A SAFETY MARGIN BEFORE IT IS A TASTE. Base terrain isn't stored, so
 *  anything that moves this field re-landscapes live saves, and tree density is
 *  solidity — the failure mode is a tree inside a finished house. Inside
 *  STRANGE_FROM the weights are exactly the flat six-slot array this used to be
 *  (see FIELD_WEIGHTS), so the near world generates byte-for-byte what it did
 *  before Phase 7a.
 *
 *  The margin is bigger than it looks, because this is measured from the SITE and
 *  a tile is at most about a cell and a half from the site that owns it: no TILE
 *  inside ~90 of the origin can be owned by a rolled site, whatever the warp does.
 *  The town needs 21 (HOME_REGION_REACH) and a housed neighbour can only be a plot
 *  at a time out (MAX_PATH_NODES), so this is four times any distance the built
 *  world reaches. There is a test.
 *
 *  700 TILES OF RAMP is deliberately most of a very long walk. The drift has to be
 *  slower than you can perceive at the border, or it becomes a boundary you can
 *  stand on — which is the thing "a weight, not a gate" exists to prevent. */
const STRANGE_FROM = 200;
const STRANGE_TO = 900;

/** How far along the drift a region is: 0 ordinary, 1 the plateau.
 *
 *  Measured off the SITE and not off the tile, so a region has ONE character all
 *  the way across it. Per tile, a wood would grow stranger as you walked through
 *  it and the far half of it would be a different biome from the near half —
 *  which is the Voronoi seam problem again, in the other axis.
 *
 *  Smoothstepped rather than linear so the onset has no kink in it. At exactly
 *  STRANGE_FROM a linear ramp starts changing the odds at full slope; this one
 *  leaves and arrives flat, and the plateau is a plateau rather than a corner. */
function strangeness(seed: number, mx: number, my: number): number {
  const s = biomeSite(seed, mx, my);
  const r = Math.hypot(s.x, s.y);
  const t = Math.min(1, Math.max(0, (r - STRANGE_FROM) / (STRANGE_TO - STRANGE_FROM)));
  return t * t * (3 - 2 * t);
}

/** How strange the region owning a tile is, 0 to 1. Exported for the migration
 *  test: "the near world is untouched" is only a proof if the near world can be
 *  shown to be running at strangeness ZERO, since a region flipped by a whisker of
 *  drift looks exactly like a region that was always going to roll that way. */
export function regionStrangeness(seed: number, x: number, y: number): number {
  const w = biomeWarp(seed, x, y);
  const site = nearestSite(seed, w.x, w.y);
  return strangeness(seed, site.mx, site.my);
}

/** The far country's rows, whose colour comes UP with the drift. */
const FAR_ROWS = new Set<BiomeId>(["dusk", "glimmer", "glass"]);

/** What a tile's region looks like here — the biome's row, with the far country's
 *  tints scaled by how far out this particular region is.
 *
 *  FOUND ON SCREEN, and it is the difference between the doc and the first cut.
 *  The weights alone make strangeness a coin that lands: the nearest dusk region
 *  on the test seed was 259 tiles out and it was FULL violet, up against ordinary
 *  meadow green, and the border between them was a paint edge you could stand on.
 *  Near regions have always been able to share a border invisibly because they
 *  barely differ; the far rows are ten times the tint, so the seam became the
 *  loudest thing on screen — a wall you cross, which is the one thing distance is
 *  not allowed to be (DESIGN.md §Biomes).
 *
 *  So a far region's colour is its own strangeness. The first dusk you ever meet
 *  is a wood with the light very slightly off; the one at the plateau is violet to
 *  the ground. That is what the doc says out loud — character DRIFTS from the
 *  familiar toward the strange — and the binary version was only ever the cheapest
 *  reading of it.
 *
 *  Constant across a region, because `strangeness` is a property of the SITE. A
 *  per-tile ramp would put a gradient inside one wood and two different gradients
 *  either side of every border.
 *
 *  RENDER PATH ONLY. Densities are untouched and generation never calls this: what
 *  grows where has to stay a total function of (seed, x, y), and a tree that faded
 *  in with distance would be a tree that is solid at one radius and not at another. */
export function regionSkin(seed: number, spot: HomesteadSpot, x: number, y: number): BiomeDef {
  return skinOf(seed, x, y, biomeAt(seed, spot, x, y));
}

/** A named region's skin at a tile, with the far country's drift applied.
 *
 *  Split out of `regionSkin` so `scatterSkin` can ask the same question of the
 *  region a tile's flora actually GREW from, which near a border is not always
 *  the region the tile is in. */
function skinOf(seed: number, x: number, y: number, id: BiomeId): BiomeDef {
  const def = biomeDef(id);
  if (!FAR_ROWS.has(id)) return def;

  const t = regionStrangeness(seed, x, y);
  const fade = (tint: Tint): Tint => ({ color: tint.color, amount: tint.amount * t });
  return {
    ...def,
    ground: fade(def.ground),
    tuft: fade(def.tuft),
    crown: fade(def.crown),
    trunk: fade(def.trunk),
  };
}

/** How far either side of a region border the TURF fades from one to the next,
 *  in tiles.
 *
 *  WHY A BLEND AND NOT A WARPED BORDER. `BIOME_WARP` bends the border itself, and
 *  photographed at 200 tiles it is doing its job — regions come out lobed and
 *  irregular, with no straight bisector anywhere. The staircase reported at 8d is
 *  a different bug: it is QUANTIZATION, a hard one-tile step between two flat
 *  tints, and a wandering line drawn on a tile grid still steps. Bending harder
 *  buys nothing. What removes a step is not having one.
 *
 *  Measured before it was written, which is the argument for the number being
 *  small: the two greens either side of the scrub/pinewood border are a few RGB
 *  units apart and the seam was still the loudest thing in the frame. It is not
 *  the colour gap that reads, it is the discontinuity — so the fade does not have
 *  to be wide to erase it, and a wide one would start dissolving the regions
 *  themselves, which are the wayfinding system (DESIGN §Biomes).
 *
 *  THIS SPENDS NONE OF `HOME_REGION_REACH`. The blend never moves a border and
 *  never changes `biomeAt`; it only mixes colour near one. What the town
 *  guarantee protects is which region a tile IS in — the failure that grows a
 *  tree inside a finished house — and nothing here is asked during generation. */
const BIOME_BLEND = 5;

/** How far a redwood stand's colour fades either side of its rim — twice a
 *  region border's, because its floor is twice the colour change any border has
 *  to cross. See `REDWOOD_RADIUS`, which was grown to afford this.
 *
 *  Declared HERE and not up beside the stand's other constants, which is where it
 *  reads better and where it crashed: a `const` initialised from `BIOME_BLEND`
 *  before that line has run is a temporal dead zone, and the whole module fails to
 *  load. Constants derived from another live below it. */
const REDWOOD_BLEND = 2 * BIOME_BLEND;

/** A region's share of a tile's turf. One entry away from any border. */
export interface RegionPart {
  /** WHICH region this share is. Carried so the scatter can pick ONE of them
   *  (see `scatterRegion`) rather than only average their tints — a blended
   *  colour is a colour, but half a pine is nothing. */
  id: BiomeId;
  def: BiomeDef;
  w: number;
  /** True on the share that is BARE ROCK rather than the region's turf — the
   *  granite's sheets, split out below.
   *
   *  Carried because the render path has to be able to tell the two apart:
   *  `sharpenRegions` gives an outcrop a different edge from the turf around it
   *  (content/biomes.ts §edge), and both shares wear the same `id` by
   *  construction — a sheet is the same region in a different state, which is
   *  exactly why it was split rather than overlaid. Nothing in generation reads
   *  it; `scatterRegion` walks `id`, and both shares answer the same. */
  bare?: boolean;
}

/** 1 well inside an edge, 0 well outside, 0.5 exactly on it. `d` is signed
 *  distance outside the edge and `span` how far either side it fades, both in
 *  tiles.
 *
 *  Smoothstepped rather than linear because a linear ramp lands its slope
 *  discontinuity on a contour line, and 8c already paid for that lesson on the
 *  ground field: a gradient that steps anywhere is the staircase again, wearing
 *  a softer coat.
 *
 *  `span` IS A PARAMETER BECAUSE A FADE MAY NOT BE WIDE RELATIVE TO WHAT IT
 *  EDGES. The blossom rows are a disc of radius 9; fading them over the same 5
 *  tiles a region border gets leaves a core of 4 and dissolves the thing the
 *  edge was drawn around. Softening a border must not cost you the region. */
function edgeMix(d: number, span: number): number {
  const t = Math.min(1, Math.max(0, 0.5 - d / (2 * span)));
  return t * t * (3 - 2 * t);
}

/** How much of this tile is bare rock, 0..1 — the granite's sheets.
 *
 *  `smoothNoise` at the kit's own wavelength, thresholded so that `cover` of the
 *  region comes out above the line, with `fade` of the field's range spent
 *  getting there. Deliberately the same field the ground roll uses and NOT a
 *  hash: a hash answers per cell, and per cell is the one thing bare ground is
 *  not allowed to be (content/biomes.ts §sheet).
 *
 *  Salted off the seed so a region's rock is that world's rock, and sampled on
 *  the world coordinate so walking back finds the same sheet you left. */
function sheetAt(
  seed: number,
  x: number,
  y: number,
  kit: { period: number; from: number; to: number },
): number {
  const n = smoothNoise(x, y, seed ^ 0x3c71, kit.period);
  const t = (n - kit.from) / (kit.to - kit.from);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/** Fold one region in over the others at weight `w`, the way an override wins. */
function overlay(parts: RegionPart[], id: BiomeId, w: number): RegionPart[] {
  if (w <= 0) return parts;
  const def = biomeDef(id);
  if (w >= 1) return [{ id, def, w: 1 }];
  return [...parts.map((p) => ({ id: p.id, def: p.def, w: p.w * (1 - w) })), { id, def, w }];
}

/** What a tile's TURF is made of — its region, plus any neighbour close enough to
 *  bleed into it. Ground and tuft only; see the note on flora below.
 *
 *  THE WEIGHTS RUN OVER ALL NINE CANDIDATE SITES, not just the nearest two. The
 *  obvious version blends the nearest against the second-nearest, and it puts a
 *  seam through every place three regions meet: at a triple point the second and
 *  third swap, so the partner's colour changes discontinuously at exactly the
 *  spot where its weight is highest. Weighting the whole neighbourhood has no
 *  such moment — a site that is about to become the runner-up is already
 *  contributing.
 *
 *  `d - d1` is roughly TWICE the distance to the bisector between two sites, so
 *  the cutoff is `2 * BIOME_BLEND` to fade over `BIOME_BLEND` tiles either side.
 *
 *  FLORA IS STILL NEVER BLENDED, and that has not changed: a pine is a pine and
 *  never half a birch. What flora does with these weights is PICK one of them —
 *  see `scatterRegion`, which rolls a cell's trees, rocks and mushrooms from one
 *  whole region chosen by the same shares this blends the tint from. So the
 *  treeline interleaves over exactly the tiles the grass is fading across, and
 *  every individual tree is one thing. That job changes generation; this one
 *  does not, which is why they are separate functions. */
export function regionParts(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): RegionPart[] {
  const w = biomeWarp(seed, x, y);
  const cx = biomeCell(w.x);
  const cy = biomeCell(w.y);

  // Same loop order and same strict comparison as `nearestSite`, so the heaviest
  // part is always the region `biomeAt` reports. If those two ever disagree the
  // ground says one thing and the trees standing on it say another.
  // FIVE BY FIVE, WHERE `nearestSite` NEEDS ONLY THREE. Three is enough to find
  // the NEAREST site and not enough to find every site close enough to bleed, and
  // a contributor that appears the moment the block shifts would be a
  // discontinuity locked to the macro grid — the per-cell edges rule at the scale
  // of the cell that owns the region.
  //
  // It is a bound rather than a guess, and it is close: the query point sits at
  // most 34 tiles from its cell centre plus BIOME_WARP, and a site wanders 17
  // inside its own, so `d1` can reach ~76 and the cutoff `d1 + 2 * BIOME_BLEND`
  // ~86 — while a site two cells out is at least 136 − 17 − 38 = 81 away. 81 is
  // inside 86, so the outer ring can matter. Only just, and measured never to
  // have: swapping 3×3 for 5×5 moved no pixel in a 480k-tile sweep. It is here
  // because the arithmetic says it can, not because a screenshot caught it — the
  // seam that WAS photographed was the forest clearing, below.
  const cand: { mx: number; my: number; d: number }[] = [];
  let d1 = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const s = biomeSite(seed, cx + dx, cy + dy);
      const d = Math.hypot(s.x - w.x, s.y - w.y);
      cand.push({ mx: cx + dx, my: cy + dy, d });
      if (d < d1) d1 = d;
    }
  }

  const weighed: { id: BiomeId; mx: number; my: number; k: number }[] = [];
  let total = 0;
  for (const c of cand) {
    const u = 1 - (c.d - d1) / (2 * BIOME_BLEND);
    if (u <= 0) continue;
    const k = u >= 1 ? 1 : u * u * (3 - 2 * u);
    weighed.push({ id: siteRegion(seed, spot, c.mx, c.my), mx: c.mx, my: c.my, k });
    total += k;
  }

  // THE FOREST CLEARING RECOLOURS THE TOWN'S OWN SHARE, and nothing else's.
  //
  // Written first as an overlay over the whole mix, gated on "is the nearest site
  // the home one" — which is a hard Voronoi test, so the wood switched off in the
  // space of one tile and left an 18-unit cliff along the edge of the home
  // region. The seam is INHERITED rather than new: `biomeAt` has always answered
  // pinewood inside that boundary and `wooded(site)` outside it, and on the seeds
  // where the neighbour rolled birch that was already a hard line.
  //
  // Past the clearing it is the town's own region that is wooded, so it is the
  // town's own share that turns — and that share fades out smoothly like every
  // other, which is the whole reason there is nothing to step over.
  const home = originSite();
  const split: typeof weighed = [];
  for (const p of weighed) {
    if (spot === "forest" && p.mx === home.mx && p.my === home.my) {
      const wood = 1 - edgeMix(Math.hypot(x, y) - clearingRadius(seed, Math.atan2(y, x)), BIOME_BLEND);
      if (wood > 0) split.push({ ...p, id: "pinewood", k: p.k * wood });
      if (wood < 1) split.push({ ...p, k: p.k * (1 - wood) });
      continue;
    }
    split.push(p);
  }

  let parts: RegionPart[] = split.map(({ id, mx, my, k }) => {
    const def = biomeDef(id);
    if (!FAR_ROWS.has(id)) return { id, def, w: k / total };
    // The far country's tints come up with the drift exactly as `regionSkin`
    // fades them, or a dusk region would bleed full violet into its neighbour
    // while its own middle was still pale.
    //
    // FADED BY ITS OWN SITE, not by the tile's. Asking `regionStrangeness(x, y)`
    // is the same number for a single part and WRONG for a blended one: it is the
    // strangeness of whichever region the tile is nearest, so it jumps the
    // instant the tile crosses a border, and the fade it scales jumps with it.
    // The docblock on `strangeness` already says why — measured off the site, so
    // a region has one character all the way across it.
    const t = strangeness(seed, mx, my);
    return {
      id,
      def: {
        ...def,
        ground: { color: def.ground.color, amount: def.ground.amount * t },
        tuft: { color: def.tuft.color, amount: def.tuft.amount * t },
      },
      w: k / total,
    };
  });

  // BARE ROCK, WHERE A REGION HAS ANY (content/biomes.ts §sheet). Split rather
  // than overlaid, and it is the forest clearing's move a few lines up: a share
  // of a region turning into a different-looking version of ITSELF, which the
  // blend then mixes like any other pair of shares. An overlay would have been a
  // second region id sitting inside the first, which `biomeAt` would have had to
  // agree with, and there is nothing for it to agree about — a sheet is paint.
  parts = parts.flatMap((p) => {
    const kit = p.def.sheet;
    if (!kit) return [p];
    const s = sheetAt(seed, x, y, kit);
    if (s <= 0) return [p];
    const bare = {
      ...p,
      def: { ...p.def, ground: kit.ground, tuft: kit.tuft },
      w: p.w * s,
      bare: true,
    };
    return s >= 1 ? [bare] : [{ ...p, w: p.w * (1 - s) }, bare];
  });

  // The blossom disc goes over everything, which is the order `biomeAt` resolves
  // it in: it is the first thing that function asks. Unlike the clearing it is
  // not a property of one region — it is a landmark sited on a ring, and it may
  // straddle a border — so it really is an overlay, and a radial one is smooth
  // wherever it lands.
  const b = blossomCentre(seed, spot);
  // A third of the radius, by the rule on `edgeMix`: the disc is nine tiles and
  // has to still have a middle.
  const bd = Math.hypot(x - b.x, y - b.y);
  parts = overlay(parts, "blossom", edgeMix(bd - BLOSSOM_RADIUS, BLOSSOM_RADIUS / 3));

  // The redwood stands and the calderas — the same overlay, in the same order
  // `biomeAt` resolves them, so the tint can never disagree with the region a
  // tile actually is.
  //
  // FOUND BY RING RATHER THAN BY DISTANCE TO ONE CENTRE, because unlike the
  // blossom rows there is more than one of each; `ringSiteAt` takes a `reach`
  // for exactly this, since a tile OUTSIDE a disc still needs its share of that
  // disc's colour to fade in.
  const wood = ringSiteAt(REDWOODS, seed, spot, x, y, REDWOOD_BLEND);
  if (wood) {
    // A FIXED FADE, NOT A THIRD OF THE RADIUS. The blossom rows divide their own
    // radius because nine tiles across is barely a place and a wide fade would
    // eat its middle. This is the opposite problem: the disc has middle to spare
    // and the COLOUR is the extreme one, so the fade is sized to the colour —
    // see REDWOODS.radius, which was grown to afford it.
    parts = overlay(parts, "redwoods", edgeMix(wood.d - REDWOODS.radius, REDWOOD_BLEND));
    // And the giants over that. Their palette is the redwoods' to the digit
    // (content/biomes.ts §giants), so this overlay currently changes not one
    // pixel of turf — it is here so that the day one of those numbers moves, the
    // ground under the giants moves with it instead of quietly staying behind.
    if (hasGiants(seed, spot, wood.index)) {
      parts = overlay(parts, "giants", edgeMix(wood.d - GIANTS_RADIUS, GIANTS_RADIUS / 3));
    }
  }

  // The calderas, on the same terms and with the same wide fade. Ash is the
  // steepest ground colour in the game — further from grass than the redwood duff
  // is — so if anything wants a longer approach than a border's, it is this.
  const burn = ringSiteAt(CALDERA, seed, spot, x, y, REDWOOD_BLEND);
  if (burn) {
    parts = overlay(parts, "caldera", edgeMix(burn.d - CALDERA.radius, REDWOOD_BLEND));
  }

  // And the Static, last, in `biomeAt`'s own order.
  //
  // A FADE IS WHAT KEEPS IT A PLACE. Every other region blends at its edge
  // because a hard colour step is a seam you can stand on; this one blends
  // because a rendering fault does not have a five-tile approach. The wrong
  // colours arriving GRADUALLY is most of what tells a player that somebody meant
  // this — see content/biomes.ts §static, where that argument is made in full.
  // Sized to the disc rather than to the colour (a third of the radius, the
  // blossom rows' rule): at sixteen tiles a fixed ten-tile fade would leave it no
  // middle to be wrong in.
  const glitch = ringSiteAt(STATIC, seed, spot, x, y, STATIC.radius / 3);
  if (glitch) {
    parts = overlay(parts, "static", edgeMix(glitch.d - STATIC.radius, STATIC.radius / 3));
  }

  return parts;
}

/** WHICH REGION'S FLORA A TILE ROLLS — dithered across a border.
 *
 *  8d blended the TURF across a border and left the trees stopping on a line,
 *  and said so in place: "a tree takes the hard `biomeAt` answer, so a pine is
 *  a pine and never half a birch." That is still true, and it is why this is a
 *  PICK rather than a blend. A tile near a border rolls which of its
 *  neighbouring regions it grew from, weighted by exactly the shares 8d already
 *  computes for the tint — so the pines thin out into the scrub over the same
 *  five tiles the grass is fading across, and each individual tree is wholly
 *  one thing.
 *
 *  IT DOES NOT MOVE A BORDER. `biomeAt` is untouched, so every guarantee built
 *  on it — the town's region, the thousand-seed test, the migration promise at
 *  the top of this file — holds exactly as before. What changes is which
 *  region's DENSITIES a cell reads before it rolls a tree, and which region's
 *  crown that tree is drawn with.
 *
 *  INSIDE `HOME_REGION_REACH` IT DOES NOT DITHER AT ALL, and that guard is the
 *  reason this could be built without re-deriving the town's margin. The
 *  arithmetic says the nearest border is 21 tiles out and the blend reaches 5,
 *  so a dithered tile is at least 16 from the origin while the town footprint
 *  reaches about 15 — one tile of daylight, resting on two approximations. A
 *  guard costs nothing where there is no border to dither across anyway, and
 *  turns a margin into a fact. `biome.test.ts` asserts it on a thousand seeds.
 *
 *  ITS OWN SALT, and that is 8k's bug written down: the decor kit fed its region
 *  pick the same hash that had just passed `< density`, so the pick only ever
 *  saw the bottom of its range and the walk handed the first part every cell.
 *  The dither would have been dead code that measured as working. */
const SCATTER_SALT = 0x9c17;

export function scatterRegion(seed: number, spot: HomesteadSpot, x: number, y: number): BiomeId {
  const hard = biomeAt(seed, spot, x, y);
  // A SQUARE, where the reach is measured as a radius. Strictly the more
  // generous of the two, and it is the shape the thing being protected actually
  // is: a town footprint is a box, and the corner of a box at radius 21 is 21
  // from the origin along neither axis. Testing the disc let (15,15) through —
  // 21.2 tiles out, inside the town's own margin — which is precisely the class
  // of off-by-a-corner this guard exists to make impossible.
  if (Math.abs(x) <= HOME_REGION_REACH && Math.abs(y) <= HOME_REGION_REACH) return hard;

  const parts = regionParts(seed, spot, x, y);
  if (parts.length === 1) return parts[0].id;

  let at = hash2(x, y, seed ^ SCATTER_SALT) / 4294967296;
  for (const p of parts) {
    at -= p.w;
    if (at < 0) return p.id;
  }
  // The weights sum to 1, so this is unreachable while the roll is in [0,1).
  // Falling back to the tile's own region is the right way to be wrong.
  return hard;
}

/** The skin of the region a tile's flora grew from. What `regionSkin` is for the
 *  ground, this is for the things standing on it: a pine that rolled its way
 *  three tiles into the scrub is drawn as a pine, or the treeline has not
 *  actually softened — it has only changed how many trees stop on the line. */
/** The found place a tile belongs to, or null.
 *
 *  `foundSiteAt` takes the landmark siting rule as an argument so content can be
 *  tested without the world; this is that call with the world's own `onLand`
 *  supplied, so anything outside generation asks exactly the question generation
 *  asked. Two callers that answered it separately would put a ring's mushrooms
 *  and a ring's colours in different places. */
export function foundPlaceAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): FoundSite | null {
  return foundSiteAt(seed, spot, x, y, onLand);
}

export function scatterSkin(seed: number, spot: HomesteadSpot, x: number, y: number): BiomeDef {
  // A FOUND PLACE IS ONE THING, SO IT WEARS ONE REGION — its own centre's, hard,
  // dither and border both ignored.
  //
  // The fairy ring is what asked for this and it is the clearest case: the whole
  // premise printed in the Notebook is that the mushrooms are a single organism
  // fruiting at its own rim ("under the ground they are all one thing"), and a
  // ring lying across a border came out speckled with two kinds of cap — which
  // is two organisms, drawn in a perfect circle, by coincidence. Nature agrees
  // for once: dozens of fungi form rings and any one ring is one species.
  //
  // It generalises rather than special-casing the ring, and the ring grove wants
  // it for the same reason — a circle of trees that is half pine and half birch
  // reads as a coincidence, and every one of these places is meant to read as
  // somebody's (nobody's) doing. The place's centre decides, not the tile, so
  // the answer is the same at every point on the rim.
  const found = foundPlaceAt(seed, spot, x, y);
  if (found) return skinOf(seed, found.x, found.y, biomeAt(seed, spot, found.x, found.y));

  return skinOf(seed, x, y, scatterRegion(seed, spot, x, y));
}

/** Pick a region from a roll in [0,1) and a strangeness in [0,1].
 *
 *  Exported for the tests, which assert the two things this has to be at once: at
 *  strangeness 0 it is the old `FIELD_BIOMES[floor(roll * 6)]` exactly, and past
 *  it every ordinary region still has a real share of the roll.
 *
 *  The cumulative walk runs in table order, which is what makes the first of
 *  those true — see FIELD_WEIGHTS. */
export function rollRegion(roll: number, strange: number): BiomeId {
  let total = 0;
  for (const [, w] of FIELD_WEIGHTS) total += w.near + (w.far - w.near) * strange;

  let at = roll * total;
  for (const [id, w] of FIELD_WEIGHTS) {
    at -= w.near + (w.far - w.near) * strange;
    if (at < 0) return id;
  }
  // Unreachable while `roll` is in [0,1): the walk consumes exactly `total`.
  // Falling back to the ordinary is the right way to be wrong.
  return "meadow";
}

/** Where a forest-edge town's clearing stops, at its NARROWEST.
 *
 *  Bounded BELOW by a proof, not by taste: `HOME_REGION_REACH` is 21, and there
 *  is a thousand-seed test asserting the town's region is meadow that far out on
 *  every spot. Anything under that would grow a wood inside somebody's house.
 *  Three tiles of margin over it, and no more — every tile added here pushes the
 *  treeline back toward the horizon it was brought in from. */
const FOREST_CLEARING = 24;

/** How far the treeline wanders in and out around the town. */
const FOREST_WANDER = 7;

/** The clearing's radius on one bearing.
 *
 *  A CLEARING IS NOT A CIRCLE, and the first version was — a mathematically
 *  perfect disc of meadow with wood outside it, which on screen reads as a
 *  vignette someone applied to the town rather than as country. It is the same
 *  failure `biomeWarp` exists to fix one level up, and `warrenRadius` two
 *  hundred lines up: exact geometry at a scale you can walk across always
 *  announces itself.
 *
 *  Same two-sine trick as `warrenRadius`, and for its reasons — cheap, smooth,
 *  and coprime multiples so it doesn't repeat around the circle. The wander is
 *  added OUTWARD only, so `FOREST_CLEARING` stays the guaranteed minimum and the
 *  proof above it survives: the treeline can back away from the town, never
 *  close in on it. */
function clearingRadius(seed: number, angle: number): number {
  const a = (hash2(4, 0, seed ^ 0x7ee5) / 4294967296) * Math.PI * 2;
  const b = (hash2(5, 0, seed ^ 0x7ee5) / 4294967296) * Math.PI * 2;
  const wobble = 0.6 * Math.sin(angle * 3 + a) + 0.4 * Math.sin(angle * 5 + b);
  return FOREST_CLEARING + FOREST_WANDER * (0.5 + 0.5 * wobble);
}

// --- Water --------------------------------------------------------------------
// Four kinds, one number. Every body of water computes a SIGNED DISTANCE to its
// own shore — positive inside the water, negative on dry land — and the tile
// falls out of four thresholds on it (content/water.ts holds the two per kind).
//
// NOTHING UNBOUNDED ON AN UNBOUNDED MAP. The sea used to be one line in
// `generatedTile` reading "every tile west of -13 is water, at every y, forever",
// which is not an ocean; it is a wall through the middle of an infinite world,
// and half of that world was behind it. Every body here is finite, up to and
// including the sea, which is big enough to be an expedition and has a far shore
// you can stand on (DESIGN §Water).
//
// AND NOTHING SINGULAR ON ONE EITHER, which is the same bug wearing the other
// hat and took longer to see. Making the sea finite fixed the wall and left one
// ocean on an endless plain: walk far enough in any direction and the world was
// dry forever. A body of water you cannot get around is not a place, and a world
// with exactly one of something is not a world — it is a diorama with a horizon
// painted on. So the sea and the lake are SCATTERED, on their own coarse grids,
// the way the Fen's ponds already were. There is always another coast.

/** How far inside a scattered round body this tile is, in tiles — the deepest of
 *  the candidates that reach it, or -Infinity where none do.
 *
 *  THE GRID IS THE POINT. Seas, lakes and ponds are the same idea at three
 *  scales: centres on a coarse jittered lattice, hashed radius, a 3x3
 *  neighbourhood because a body near a cell edge reaches into the next one. The
 *  Fen's ponds got here first and for a different reason (a per-cell roll read as
 *  lone bright SQUARES) but the shape of the answer is identical, so there is one
 *  function and the kinds differ only in numbers — the same argument content/
 *  water.ts makes for a river being a wide stream.
 *
 *  WHY THE BOUNDING TEST IS NOT AN OPTIMISATION. `roundDepth` costs an `atan2`, a
 *  `hypot` and four `sin` calls, and nine candidates per body per tile across two
 *  bodies is eighteen of those on every tile of every chunk. The cheap reject
 *  below kills all but one or two before any trigonometry runs, which is the
 *  difference between this being free and it being visible as a hitch when you
 *  walk into new ground. */
function scatteredDepth(
  seed: number,
  salt: number,
  cell: number,
  rMin: number,
  rMax: number,
  chance: number,
  x: number,
  y: number,
  /** Candidates this returns false for are not bodies. Used to keep lakes out of
   *  the sea and both of them off the town; see `lakeDepth` and `TOWN_DRY`. */
  allow?: (cx: number, cy: number, r: number) => boolean,
): number {
  let best = -Infinity;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  // Hoisted out of the loop: the warp is a function of the QUERY POINT and the
  // salt, never of which candidate we are measuring against, so evaluating it
  // nine times computed the same four sines nine times.
  const w = coastWarp(seed, salt, x, y);
  // The furthest a body of this kind can reach past its own centre — radius, plus
  // the wobble the angle can add, plus the tiles the warp can move the query
  // point. Anything beyond this cannot possibly be wet.
  const reach = rMax + rMax * WOBBLE_FRACTION + COAST_WARP;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const mx = gx + dx;
      const my = gy + dy;
      if (hash2(mx, my, seed ^ salt) / 4294967296 >= chance) continue;
      const centre = scatterCentre(seed, salt, cell, mx, my);
      if (Math.abs(w.x - centre.x) > reach || Math.abs(w.y - centre.y) > reach) continue;
      const r = rMin + (hash2(mx, my, seed ^ salt ^ 0x6a3c) / 4294967296) * (rMax - rMin);
      if (allow && !allow(centre.x, centre.y, r)) continue;
      best = Math.max(best, roundDepth(seed, salt, centre, r, r * WOBBLE_FRACTION, w));
    }
  }
  return best;
}

/** Where the body in a lattice cell sits. Jittered across the middle 60% of the
 *  cell, so centres never land on the lattice lines — a body at an exact multiple
 *  of `cell` would put the whole scatter on a visible grid, which is the per-cell
 *  rule (CLAUDE.md) at the scale of an ocean.
 *
 *  TWO SALTS, NOT SWAPPED ARGUMENTS, and this is a bug that was found by looking.
 *  The obvious way to get a second independent number out of one hash is to call
 *  it with x and y the other way round — which `pondDepth` did, and which this
 *  copied. It is wrong on the diagonal: `hash2(m, m)` and `hash2(m, m)` are the
 *  same number, so every cell where mx === my puts its body at exactly 45° within
 *  the cell, at the same fraction in both axes. One lattice line in eight has its
 *  bodies aligned, which is the grid showing through the thing that exists to
 *  hide the grid. Invisible on a 2-tile pond and not on a 140-tile sea. */
function scatterCentre(
  seed: number,
  salt: number,
  cell: number,
  mx: number,
  my: number,
): { x: number; y: number } {
  const j = seed ^ salt ^ 0x2b1f;
  return {
    x: (mx + 0.2 + (hash2(mx, my, j) / 4294967296) * 0.6) * cell,
    y: (my + 0.2 + (hash2(mx, my, j ^ 0x51ed) / 4294967296) * 0.6) * cell,
  };
}

/** How much of its own radius a body's coastline wanders in and out.
 *
 *  ONE FRACTION FOR EVERY BODY, and that is what makes the scatter possible at
 *  all. The old code carried an absolute wobble per kind — 8 tiles on a sea of
 *  90, 2 on a lake of 15 — and `coastWarp`'s docblock spends a paragraph on why
 *  that had to be hand-tuned twice. It doesn't, once the amplitude is a
 *  fraction: `roundDepth`'s harmonics are angular, so the SHAPE is already
 *  scale-free (three lobes and seven, on a body of any size), and tying the
 *  amplitude to the radius makes the whole thing scale-free with it. A 20-tile
 *  lake and a 140-tile sea now come out recognisably the same kind of object at
 *  different sizes, which is what they are.
 *
 *  Between the two numbers it replaces (8.9% and 13%), nearer the sea's, because
 *  the sea is the body you spend longest looking at. */
const WOBBLE_FRACTION = 0.1;

/** How far the coastline frets in and out at TILE scale, and over what distance.
 *
 *  Separate from the angular wobble because the two are doing different jobs at
 *  different sizes, and one number cannot do both — see `coastWarp`. */
const COAST_WARP = 5;

/** Nudge the query point before measuring distance to a body of water. Straight
 *  coasts come out ragged and the body stays the shape it is.
 *
 *  THE ANGULAR WOBBLE ALONE WAS NOT ENOUGH, and this was found on screen. The
 *  sea has a radius of 90, so up close its edge is very nearly a straight line,
 *  and a wobble at harmonics 3 and 7 has a wavelength of about eighty tiles —
 *  which is to say, no visible effect at all from the beach. The coast came out
 *  as long vertical runs with big rectangular steps between them: three ribbons
 *  of flat colour rather than a shore.
 *
 *  Cranking the harmonics up is the obvious fix and it does not survive contact
 *  with the LAKE. Angular frequency is wavelength divided by radius, so whatever
 *  makes a 90-tile sea interesting shreds a 15-tile lake into a starfish. What is
 *  wanted is a fixed feature size in TILES, on every body, which is a property of
 *  position rather than of angle.
 *
 *  So the query point moves instead of the shape — exactly what `biomeWarp` does
 *  to Voronoi borders, for exactly the same reason ("Borders are warped, because
 *  a Voronoi edge is a straight line", ROADMAP §Phase 5), and small enough not to
 *  be able to move the shore by more than a few tiles. */
function coastWarp(seed: number, salt: number, x: number, y: number): { x: number; y: number } {
  const pa = (hash2(3, 0, seed ^ salt) / 4294967296) * Math.PI * 2;
  const pb = (hash2(4, 0, seed ^ salt) / 4294967296) * Math.PI * 2;
  // Periods tied to the amplitude, for the reason `channelDepth` spells out at
  // length: displacement per tile is amplitude over period, and past 1 the depth
  // bands alias into a checkerboard. These were 4.5 and 3.9 — a slope of 0.85,
  // close enough to the edge that the sand along the sea was chunkier than it
  // should have been and nobody could say why.
  return {
    x: x + COAST_WARP * (0.6 * Math.sin(y / (COAST_WARP * 1.5) + pa) + 0.4 * Math.sin(y / (COAST_WARP * 3.4) + pb)),
    y: y + COAST_WARP * (0.6 * Math.sin(x / (COAST_WARP * 1.5) + pb) + 0.4 * Math.sin(x / (COAST_WARP * 3.4) + pa)),
  };
}

/** How far inside a round body of water this tile is, in tiles.
 *
 *  The wobble is a function of the ANGLE around the centre, at whole-number
 *  harmonics, which is what makes it continuous where the angle wraps at ±π. A
 *  wobble hashed per tile would be a per-cell edge with a boat (CLAUDE.md); a
 *  wobble on x or y alone would flatten one side of the body into a straight
 *  coast. It gives the body its overall SHAPE — the bays and the headlands —
 *  while `coastWarp` frets the edge itself.
 *
 *  Takes the point ALREADY WARPED, because the caller measures one tile against
 *  several candidate bodies and the warp doesn't depend on which one. */
function roundDepth(
  seed: number,
  salt: number,
  centre: { x: number; y: number },
  radius: number,
  wobble: number,
  at: { x: number; y: number },
): number {
  const { x, y } = at;
  const dx = x - centre.x;
  const dy = y - centre.y;
  const th = Math.atan2(dy, dx);
  const pa = (hash2(1, 0, seed ^ salt) / 4294967296) * Math.PI * 2;
  const pb = (hash2(2, 0, seed ^ salt) / 4294967296) * Math.PI * 2;
  const r = radius + wobble * (0.6 * Math.sin(3 * th + pa) + 0.4 * Math.sin(7 * th + pb));
  return r - Math.hypot(dx, dy);
}

/** The seas.
 *
 *  MEASURED, NOT DERIVED, and the difference cost an afternoon. The cell size is
 *  not the distance between coasts: walking a straight line you only meet a sea
 *  whose disc your path actually crosses, which for a ~100-tile body in a cell of
 *  C happens far less than once per cell. The first cut of this was 700, reasoned
 *  from the cell to "a coast every two to five minutes", and the real figure was
 *  a twelve-minute mean — three seas in a scan long enough to cross nine cells.
 *
 *  So these come from a transect: 960,000 tiles of straight walking across twelve
 *  seeds, counting the gaps. At 420 the world is 10% salt water and a coast is
 *  3.5 minutes' walk away at the median, 5.3 at the mean. Anyone retuning this
 *  should re-measure rather than re-reason; the arithmetic is not intuitive.
 *
 *  The radius is a range now rather than the old flat 90, which the scatter makes
 *  worth having: with one sea its size was a constant nobody could perceive, and
 *  with many, some are a morning's walk around and some are most of a day, and
 *  that difference is the only thing that makes a particular coast memorable. */
const SEA_CELL = 420;
const SEA_MIN_RADIUS = 60;
const SEA_MAX_RADIUS = 140;
const SEA_CHANCE = 0.5;

/** How much dry ground the town keeps around itself, in tiles.
 *
 *  THE TOWN WAS HERE FIRST, and the scatter had to be told. A hand-sited sea sat
 *  at a fixed ring and could not be anywhere else; a lattice has a cell over the
 *  origin like it has one everywhere, and that cell's body lands on the plaza
 *  roughly as often as it lands anywhere. Sea water at the town hall steps, found
 *  by a test that has been guarding this since the half-plane days.
 *
 *  Comfortably past the plaza (-5..5) and the homestead, and short of the rings
 *  the landmarks sit on — those are `onLand`'s problem and it already solves it,
 *  a bearing at a time. This is only about the ground the town itself stands on.
 *
 *  It does make the origin a hole in the distribution, which is a real cost and
 *  the right one to pay: a town underwater is not a town, and a slightly rarer
 *  coast is a thing nobody can perceive from inside one world. */
const TOWN_DRY = 46;

/** Would a body of this radius, centred here, reach the town's dry ground? */
function clearsTown(cx: number, cy: number, r: number): boolean {
  return Math.hypot(cx, cy) > r + r * WOBBLE_FRACTION + COAST_WARP + TOWN_DRY;
}

function seaDepth(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  const scatter = scatteredDepth(
    seed,
    0x5ea0,
    SEA_CELL,
    SEA_MIN_RADIUS,
    SEA_MAX_RADIUS,
    SEA_CHANCE,
    x,
    y,
    clearsTown,
  );
  return Math.max(scatter, townSeaDepth(seed, spot, x, y));
}

/** The coast's sea — the one body of salt water a homestead can ASK for.
 *
 *  THIS AMENDS THE RULE BELOW `lakeDepth`, and deliberately. That note says no
 *  town is promised a coast, because a world where every town is coastal is one
 *  where being coastal means nothing, and it is still right: two of the three
 *  spots are promised nothing here and go on rolling the scatter's dice. What
 *  changed is that a player may now ASK, and the answer to a question you had
 *  to choose to ask is not the same thing as a guarantee handed to everybody.
 *  The lottery survives where it was worth having.
 *
 *  AN EXTRA BODY, not a bent lattice, for exactly the reason `TOWN_LAKE` gives:
 *  forcing the sea's own cell to fire would put the coast wherever that cell's
 *  jitter landed, which is a far weaker promise than a shore at a known ring.
 *
 *  AND NOT A SMALLER SEA. The shore is what you wanted; the sea can stay the
 *  size a sea is. `SEA_RING` is measured so the WATERLINE lands close — centre
 *  distance minus radius, minus the wobble and the coast warp at their worst —
 *  which is why the ring is only a little larger than the radius. The far shore
 *  is still an expedition; it is the near one that moved. */
/** `ring` is measured from the invariant, not chosen for taste. The waterline
 *  sits at `ring - radius`, and the wobble and the coast warp move it by
 *  `radius * WOBBLE_FRACTION + COAST_WARP` in the worst case — so the CLOSEST
 *  the sea can come is `ring - radius * 1.1 - COAST_WARP`, about 23 tiles here.
 *  That clears the plaza, the homestead and the town's buildings with room to
 *  spare, and leaves the typical shore around thirty-four tiles out: a short
 *  walk, and visible on the card's preview from the moment you pick it. */
const TOWN_SEA = { radius: 62, ring: 96 };

/** Where it sits: a hashed bearing, and no search.
 *
 *  Every other sited body searches bearings for dry ground (`onLand`), and this
 *  one must not: `onLand` asks about water, water asks `seaDepth`, and `seaDepth`
 *  is what this feeds. A hash has no such appetite. It costs nothing either,
 *  because the thing a search would protect against cannot happen here — the
 *  landmarks that need dry ground (grove, cube, blossom) do their own searching
 *  and will simply walk around this sea like any other. */
function townSeaCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("townSea", seed, spot, () => {
    const a = (hash2(11, 0, seed ^ 0x5ea0) / 4294967296) * Math.PI * 2;
    return {
      x: Math.round(Math.cos(a) * TOWN_SEA.ring),
      y: Math.round(Math.sin(a) * TOWN_SEA.ring),
    };
  });
}

function townSeaDepth(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  if (spot !== "coast") return -Infinity;
  const salt = 0x5ea0;
  return roundDepth(
    seed,
    salt,
    townSeaCentre(seed, spot),
    TOWN_SEA.radius,
    TOWN_SEA.radius * WOBBLE_FRACTION,
    coastWarp(seed, salt, x, y),
  );
}

// --- Islands (Phase 11) --------------------------------------------------------
// Land inside the sea — the one item on the terrain pass that is a new field
// rather than a term on an existing one, and the decisions that shaped it:
//
// AN ISLAND IS A CAP, NOT A SUBTRACTION — the town's dry banks' trick
// (`townChannelCap`), reused one field over, and here it is load-bearing rather
// than convenient. The sea's raw depth in a big body's interior runs to sixty
// tiles; a dome SUBTRACTED from that has to climb sixty deep before it can
// surface, so its shore bands (sand is a 3-tile window on the depth) compress to
// a fraction of a tile and alias into checkerboard — the per-cell edges rule
// arriving by the door the roadmap predicted. Capping instead (`min(raw, RIM −
// h·SLOPE)`) means the island's profile is ITS OWN, whatever the abyss under it:
// the halo, the sand ring and the dry top are always the same few tiles wide.
//
// UNREACHABLE BY DEFAULT, AND ON PURPOSE (the decided question). Nothing in this
// game crosses deep water, and no shallow bar is generated to any island: an
// island is a thing you see across the water, and reaching one is a PROJECT —
// you may fill water forever, so it is reachable by work, which keeps the
// no-caps spirit. The world never hands it to you and never forbids it.
//
// SEAS ONLY (the other half of the decision). Lakes stay clean mirrors, rivers
// stay channels; the island reads as a sea's own kind of thing.
//
// SITING USES THE RAW FIELD, and this is the subtle invariant: `bigWaterDepth`
// and every landmark gate keep reading the sea WITHOUT the cap, so an island's
// dry top still counts as sea to `onLand` — otherwise a ringgrove could be
// sited on ground nobody can reach, which breaks the found places' whole
// premise. The cap is applied in exactly one place, `waterAt`, the single door
// every tile goes through.

const ISLE_CELL = 96;
/** The minimum is set by the profile, not by taste: dry ground begins where the
 *  dome passes (RIM + beach) / SLOPE = 4 tiles inside the edge, so a radius
 *  under ~6 is a shoal that never surfaces — and a shoal is fine, but the
 *  guarantee "no single-cell islands" is about the DRY top. At 7, the worst
 *  wobble still leaves a top two-plus tiles across. */
const ISLE_MIN_RADIUS = 7;
const ISLE_MAX_RADIUS = 16;
const ISLE_CHANCE = 0.45;
/** The sea's depth at the island's own edge — under the shelf (5), so every
 *  island wears a shallow halo before its sand. */
const ISLE_RIM = 3;
/** Tiles of depth lost per tile climbed. The band widths are this number's
 *  reciprocal times the thresholds, all comfortably over a tile. */
const ISLE_SLOPE = 1.5;
/** Water the gate demands past the island's worst-case reach, so an island
 *  never merges with a coastline into a peninsula-shaped smear — the lake's
 *  `LAKE_SEA_MARGIN` argument, pointed the other way. */
const ISLE_MOAT = 6;
/** An island's own wobble fraction. Bigger than the sea's 0.1: a small shape
 *  needs proportionally more irregularity before it stops reading as a coin. */
const ISLE_WOBBLE = 0.18;

/** Per-island salt, so no two islands share a lobe pattern. Mixed from the
 *  lattice cell the way the channel families mix theirs. */
function isleSalt(mx: number, my: number): number {
  return 0x151e ^ (mx * 0x9e37) ^ (my * 0x51ed);
}

/** The gate, memoised per candidate: an island exists only where the RAW sea is
 *  deep enough to hold its whole footprint plus a moat. Evaluated at the centre
 *  once rather than per tile, because the answer is a fact about the island. */
const isleGateMemo = new Map<string, boolean>();
function isleAllowed(
  seed: number,
  spot: HomesteadSpot,
  mx: number,
  my: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const key = `${seed}:${spot}:${mx}:${my}`;
  let ok = isleGateMemo.get(key);
  if (ok === undefined) {
    if (isleGateMemo.size > 16384) isleGateMemo.clear();
    ok = seaDepth(seed, spot, cx, cy) > r * (1 + ISLE_WOBBLE) + COAST_WARP + ISLE_MOAT;
    isleGateMemo.set(key, ok);
  }
  return ok;
}

/** The deepest the sea may run at this tile, given the islands — Infinity almost
 *  everywhere. The same 3×3 lattice walk as `scatteredDepth`, but returning a
 *  CAP rather than a depth, which is why it is its own loop rather than a kind.
 *
 *  Exported for tests, which otherwise cannot tell an island's dry top from
 *  ordinary far-country ground: below −beach (−3) the cap alone proves the cell
 *  is land CARVED FROM sea, because the gate only lets an island exist where the
 *  raw field is deep. */
export function isleCap(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  let cap = Infinity;
  const gx = Math.floor(x / ISLE_CELL);
  const gy = Math.floor(y / ISLE_CELL);
  const reach = ISLE_MAX_RADIUS * (1 + ISLE_WOBBLE) + COAST_WARP + 8;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const mx = gx + dx;
      const my = gy + dy;
      if (hash2(mx, my, seed ^ 0x151e) / 4294967296 >= ISLE_CHANCE) continue;
      const centre = scatterCentre(seed, 0x151e, ISLE_CELL, mx, my);
      if (Math.abs(x - centre.x) > reach || Math.abs(y - centre.y) > reach) continue;
      const r =
        ISLE_MIN_RADIUS +
        (hash2(mx, my, seed ^ 0x151e ^ 0x6a3c) / 4294967296) * (ISLE_MAX_RADIUS - ISLE_MIN_RADIUS);
      if (!isleAllowed(seed, spot, mx, my, centre.x, centre.y, r)) continue;
      const salt = isleSalt(mx, my);
      // How far inside the island this tile is — its own warp and wobble, so an
      // island's coast frets like any other body's.
      const h = roundDepth(seed, salt, centre, r, r * ISLE_WOBBLE, coastWarp(seed, salt, x, y));
      cap = Math.min(cap, ISLE_RIM - h * ISLE_SLOPE);
    }
  }
  return cap;
}

/** The lakes.
 *
 *  A cell of 130 keeps roughly the cadence the single lake had — it used to sit
 *  at a ring of 104, so a lake is still about that far off — and simply doesn't
 *  run out. These are the common big water: something to walk to on an afternoon,
 *  as against the sea, which is a trip.
 *
 *  NO TOWN IS PROMISED A COAST, and that is a deliberate loss. Every town used to
 *  get a sea at a fixed ring because there was only one and it had to go
 *  somewhere; now that they are scattered, guaranteeing one would mean bending
 *  the grid around the origin, and a world where every town is coastal is a world
 *  where being coastal means nothing. A lake is the guarantee instead — see
 *  `TOWN_LAKE` — so there is always big water within a walk, and whether you can
 *  smell the sea from home is a thing worth saying about your particular town. */
const LAKE_CELL = 130;
const LAKE_MIN_RADIUS = 10;
const LAKE_MAX_RADIUS = 22;
const LAKE_CHANCE = 0.55;

/** How much dry land a lake wants between itself and the sea.
 *
 *  A LAKE IN THE OCEAN IS NONSENSE, and the old sixteen-bearing search existed to
 *  dodge it. The scatter can't search, so it filters: a candidate centre close
 *  enough to the sea is not a lake. The margin covers the lake's whole width plus
 *  both beaches, because the failure this prevents is not really a lake in the
 *  sea (invisible — the sea is deeper and wins the tile) but a lake ON THE BEACH,
 *  whose sand ring merges with the coast's into one confused smear that reads as
 *  neither. */
const LAKE_SEA_MARGIN = LAKE_MAX_RADIUS + 6;

function lakeDepth(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  const scatter = scatteredDepth(
    seed,
    0x1a4e,
    LAKE_CELL,
    LAKE_MIN_RADIUS,
    LAKE_MAX_RADIUS,
    LAKE_CHANCE,
    x,
    y,
    // Two rules, and a lake has to pass both: off the town, and clear of the
    // coast. The lake lattice is small enough (130) that its cell over the origin
    // can put a centre 26 tiles from the plaza, so the town rule is not the sea's
    // rule with a smaller number — it is load-bearing here too.
    (cx, cy, r) => clearsTown(cx, cy, r) && seaDepth(seed, spot, cx, cy) < -LAKE_SEA_MARGIN,
  );
  return Math.max(scatter, townLakeDepth(seed, spot, x, y));
}

/** The town's own lake — the one body of big water every homestead is promised.
 *
 *  Sited exactly the way the old single lake was, on `onLand`'s bearings at the
 *  ring it always used, so a town that has had a lake to the north-east since it
 *  was made still does. It is a body IN ADDITION to the scatter rather than a
 *  reserved cell in it: forcing a lattice cell to fire would put the lake
 *  wherever that cell's jitter happened to land, which is a different promise
 *  ("there is a lake somewhere within 130 tiles") and a much weaker one. */
const LAKE_RING = 104;
const TOWN_LAKE = { radius: 16 };

/** Where a LAKESIDE town's lake sits instead.
 *
 *  The fourth spot is the cheapest of the four, and that is the argument for it
 *  being this one rather than a new kind of anything: every town already has
 *  this lake (DESIGN §"Town and homestead" — "there should always be big water
 *  to go and look at"), sited by the search below. Choosing the lakeside moves
 *  it in. Nothing new is generated, and no promise is made that wasn't already
 *  being kept somewhere over the horizon.
 *
 *  Derived the same way `TOWN_SEA.ring` is: the waterline's closest approach is
 *  `ring - radius * 1.1 - COAST_WARP`, here `48 - 17.6 - 5` ≈ 25, which clears
 *  the ground the town stands on. The typical shore lands about thirty-two tiles
 *  out — a walk before lunch, and near enough that the far bank is part of the
 *  view rather than a rumour. */
const LAKESIDE_RING = 48;

function lakeRing(spot: HomesteadSpot): number {
  return spot === "lakeside" ? LAKESIDE_RING : LAKE_RING;
}

function townLakeCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("townLake", seed, spot, () => townLakeSearch(seed, spot));
}

function townLakeSearch(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  const a0 = (hash2(10, 0, seed ^ 0x1a4e) / 4294967296) * Math.PI * 2;
  const ring = lakeRing(spot);
  let first = { x: 0, y: 0 };
  for (let i = 0; i < BEARINGS; i++) {
    const a = a0 + (i / BEARINGS) * Math.PI * 2;
    const at = {
      x: Math.round(Math.cos(a) * ring),
      y: Math.round(Math.sin(a) * ring),
    };
    if (i === 0) first = at;
    if (seaDepth(seed, spot, at.x, at.y) < -(TOWN_LAKE.radius + LAKE_SEA_MARGIN)) return at;
  }
  return first; // never reached in practice; a total function needs an answer
}

function townLakeDepth(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  const salt = 0x1a4e;
  return roundDepth(
    seed,
    salt,
    townLakeCentre(seed, spot),
    TOWN_LAKE.radius,
    TOWN_LAKE.radius * WOBBLE_FRACTION,
    coastWarp(seed, salt, x, y),
  );
}

// --- Channels: streams and rivers ---------------------------------------------
// The common water, and the one the whole depth system exists to make painless:
// a stream is narrow enough that no tile in it reaches the shelf, so it is wholly
// shallow and you cross it by walking into it. No bridge required, and no rule
// saying so.
//
// The channels are a family of roughly parallel meanders on the town's own
// bearing — a low-frequency field, like everything else in this file that had to
// stop being a per-cell roll. Each channel index is hashed for whether it exists
// at all and how wide it runs, which is what keeps a family of sine waves from
// reading as wallpaper.

/** One channel family's depth at a tile, in tiles inside its own banks.
 *
 *  ONE FUNCTION FOR STREAMS AND RIVERS, because a river is not a different idea
 *  — it is a wider channel whose middle is deeper than its shelf, and every
 *  number that makes it one lives in content/water.ts. The alternative was a
 *  second near-identical generator, and the day someone fixed the wallpaper bug
 *  in one of them and not the other is easy to picture.
 *
 *  `family` picks the bearing. Everything else is salted off the kind, so
 *  streams and rivers never line up.
 *
 *  THE HISTORY, because these numbers look arbitrary and are not:
 *
 *  1. A plain family of sine curves was WALLPAPER, and it took a map of the
 *     whole world at two tiles per pixel to see it. From inside the game a
 *     stream looks like a stream; from four hundred tiles up, six of them are
 *     ruled pencil lines at even spacing. Meandering does not help — every
 *     channel shares the bearing and the wave, so they wobble in unison and stay
 *     exactly as parallel as they started.
 *  2. `warp` bends the space the lines are ruled ON, so channels curve,
 *     converge and drift apart. Necessary and not sufficient: curving a comb
 *     gives you a curved comb.
 *  3. The per-channel OFFSET is what finally broke it. Even spacing was the
 *     tell; jittered, two channels sometimes run close enough to share a valley
 *     and sometimes leave a hundred tiles of dry ground between them.
 *  4. `families` — more than one bearing. The last thing standing between this
 *     and a world with a grain, and the reason the map now has confluences. */
function channelDepth(
  seed: number,
  salt: number,
  ch: ChannelDef,
  family: number,
  x0: number,
  y0: number,
  /** A point this family must run a channel through, whatever the dice said. */
  anchor?: { x: number; y: number },
): number {
  // Each family gets its own salt, so its bearing, meander and channel rolls are
  // independent — two families sharing a phase would be one family drawn twice.
  const fs = seed ^ salt ^ (family * 0x9e37);
  const a = (hash2(11, family, fs) / 4294967296) * Math.PI * 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pa = (hash2(12, family, fs) / 4294967296) * Math.PI * 2;
  const pb = (hash2(13, family, fs) / 4294967296) * Math.PI * 2;
  // EVERY WAVELENGTH HERE IS DERIVED FROM ITS OWN AMPLITUDE, and that is a bug
  // fix rather than a flourish.
  //
  // A sine of amplitude A and period P moves the channel by up to A/P tiles per
  // tile walked. Past 1 the channel is sliding sideways faster than you are
  // walking along it, and the depth field ALIASES: adjacent cells land in
  // different bands and the banks come out as a CHECKERBOARD of sand and water.
  // Which is the per-cell edges rule (CLAUDE.md) arriving by yet another door —
  // found on screen, in a river through town, after the arithmetic had been
  // wrong in every channel in the world for an hour. The rivers made it obvious
  // because they are the only channel wide enough to HAVE bands to alias.
  //
  // The first draft hard-coded the periods (23 and 11) and let the amplitude
  // vary per kind, which meant a river's amplitude of 34 gave a slope of 2.0.
  // Tying period to amplitude fixes it for every kind at once and says something
  // true besides: a bigger meander is a longer one. Real rivers do not switchback.
  const m1 = ch.amplitude * 4;
  const m2 = ch.amplitude * 2;
  const w1 = ch.warp * 3.2;
  const w2 = ch.warp * 7;
  // Where a point falls in the family's own frame: along the bearing, and across
  // it. Bends the ground before ruling lines on it (step 2 above). The meander is
  // a function of ALONG only, so a channel is a curve rather than a blotch.
  const frame = (px: number, py: number) => {
    const x = px + ch.warp * (0.7 * Math.sin(py / w1 + pa) + 0.3 * Math.sin(py / w2 + pb));
    const y = py + ch.warp * (0.7 * Math.sin(px / w1 + pb) + 0.3 * Math.sin(px / w2 + pa));
    const u = x * cos + y * sin;
    const v = -x * sin + y * cos;
    const meander = ch.amplitude * (0.65 * Math.sin(u / m1 + pa) + 0.35 * Math.sin(u / m2 + pb));
    return { u, across: v - meander };
  };
  const { u, across } = frame(x0, y0);

  // THE ANCHORED CHANNEL. Run the anchor point through the same frame and the
  // question "which channel would pass through here" has an exact answer: the
  // index nearest its `across`, offset by the remainder. Force that one to exist
  // and the family has a channel through the anchor on every seed, while every
  // other channel in it is still whatever the dice said.
  //
  // Done in the FRAME rather than by moving the whole family, because a family
  // translated to hit a point is a family that no longer meanders the way its
  // seed says — you'd get the river you asked for and lose the world's.
  let anchorK: number | null = null;
  let anchorOff = 0;
  if (anchor) {
    const a = frame(anchor.x, anchor.y);
    anchorK = Math.round(a.across / ch.spacing);
    anchorOff = a.across - anchorK * ch.spacing;
  }

  // How wide it is HERE. 1 everywhere for a channel with no pinch; for a river,
  // a slow squeeze along its length whose narrows are its fords (ChannelDef).
  const squeeze = ch.pinch
    ? 1 - ch.pinch * (0.5 + 0.5 * Math.sin(u / (ch.pinchPeriod ?? 37) + pb))
    : 1;

  // Three candidates rather than the nearest one, and the offset is exactly why:
  // a jittered channel can reach past the midpoint its index owns, so rounding
  // to the nearest line would clip it — the same mistake `pondDepth` keeps a 3x3
  // neighbourhood to avoid.
  const k0 = Math.round(across / ch.spacing);
  let best = -Infinity;
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const forced = k === anchorK;
    if (!forced && hash2(k, 0, fs) / 4294967296 >= ch.chance) continue;
    const half = ch.halfMin + (hash2(k, 1, fs) / 4294967296) * (ch.halfMax - ch.halfMin);
    const off = forced ? anchorOff : ((hash2(k, 2, fs) / 4294967296) - 0.5) * ch.spacing * 0.7;
    best = Math.max(best, half * squeeze - Math.abs(across - (k * ch.spacing + off)));
  }
  return best;
}

/** The deepest of a kind's families. */
function channelKindDepth(
  seed: number,
  spot: HomesteadSpot,
  kind: WaterKindId,
  salt: number,
  x: number,
  y: number,
): number {
  const ch = waterKind(kind).channel;
  if (!ch) return -Infinity;
  const anchor = kind === "river" && spot === "riverside" ? RIVERSIDE_ANCHOR : undefined;
  let best = -Infinity;
  for (let f = 0; f < ch.families; f++) {
    // The anchor goes on family 0 only. Anchoring every family would put N rivers
    // through one point, which is a delta — see `families` in content/water.ts.
    best = Math.max(best, channelDepth(seed, salt, ch, f, x, y, f === 0 ? anchor : undefined));
  }
  return best;
}

// --- The town's dry banks -----------------------------------------------------
// Channels stay clear of the town's own walls (Phase 11, tranche 2 item 4).
//
// THE DEFECT, not an addition: `TOWN_DRY` keeps the sea and the lakes off town,
// and rivers are deliberately allowed through — but `stampBuilding` paves FLOOR
// under its own footprint, so a channel that crossed a building simply vanished
// under it and could still lap against the outside of a wall or run in the slot
// between two houses. A river past a town is a landmark; a river against a
// bedroom wall is a plumbing problem.
//
// A CAP, NOT A SUBTRACTION, and the difference is what it does to the promised
// river. Subtracting a clearance term DRIES the channel near buildings — and the
// riverside anchor sits three tiles from Prudence's west wall, so on pinched
// seeds the town's own promised river would have gone dry exactly at the town.
// Capping instead means water near a wall gets SHALLOWER, never absent: the
// course survives, the banks widen to sand against the wall, and full depth
// returns within about five tiles.
//
// The floor of −1.5 is what turns "no water" into "a sandy bank": a river's
// beach is 2, so a cap clamped just above −2 leaves SAND against a wall the
// river used to lap, which reads as the bank being wider there rather than as
// the water having been deleted. (Streams have no beach, so a capped stream
// goes honestly dry — a brook does not get a beach by standing near a shed.)

/** No water within this of a wall; full depth returns at about
 *  `CHANNEL_CLEAR + halfMax / CHANNEL_CLEAR_SLOPE`. */
const CHANNEL_CLEAR = 2;
const CHANNEL_CLEAR_SLOPE = 1.5;

/** The rectangles, hoisted once — content, so they are the same six on every
 *  seed, which is what lets this stay a total function of (x, y) alone. */
const TOWN_RECTS = allTownBuildings().map((b) => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }));
/** A bounding box past which the cap cannot bite, so the whole check is two
 *  comparisons for almost every tile in the world. Reach is where the cap
 *  clears the deepest channel there is (halfMax 4.6): 2 + 4.6 / 1.5 ≈ 5.1. */
const CLEAR_REACH = 6;
const CLEAR_BOX = TOWN_RECTS.reduce(
  (b, r) => ({
    x0: Math.min(b.x0, r.x0 - CLEAR_REACH),
    y0: Math.min(b.y0, r.y0 - CLEAR_REACH),
    x1: Math.max(b.x1, r.x1 + CLEAR_REACH),
    y1: Math.max(b.y1, r.y1 + CLEAR_REACH),
  }),
  { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
);

/** The deepest a channel may run at this tile, given the town's buildings.
 *  Infinity almost everywhere. */
function townChannelCap(x: number, y: number): number {
  if (x < CLEAR_BOX.x0 || x > CLEAR_BOX.x1 || y < CLEAR_BOX.y0 || y > CLEAR_BOX.y1) {
    return Infinity;
  }
  let d = Infinity;
  for (const r of TOWN_RECTS) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dy = Math.max(r.y0 - y, 0, y - r.y1);
    d = Math.min(d, Math.hypot(dx, dy));
  }
  if (d >= CLEAR_REACH) return Infinity;
  return Math.max((d - CHANNEL_CLEAR) * CHANNEL_CLEAR_SLOPE, -1.5);
}

/** The whole water field: the deepest answer any body gives for this tile, and
 *  which body gave it. Null on ground no water has an opinion about — which is
 *  most of the world, and the reason this returns null rather than a sentinel
 *  depth: the caller's next question is always "which kind", and there is no
 *  kind for dry meadow.
 *
 *  `wet` is the region's `water` (content/biomes.ts), passed in rather than
 *  looked up, because `biomeAt` reaches `blossomCentre` reaches `onLand` — and
 *  `onLand` needs to ask about water. Taking the number as an argument is what
 *  breaks that cycle; see `bigWaterDepth`. */
function waterAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
  wet: number,
  /** The region's own pool geometry, where it has one (content/biomes.ts
   *  §pools). Passed alongside `wet` rather than looked up, for the same reason
   *  `wet` is: this function sits under `onLand` and may not ask `biomeAt`. */
  pools?: PoolGeometry,
): { d: number; kind: WaterKindId } | null {
  let best: { d: number; kind: WaterKindId } | null = null;
  let bestRank = 0;
  const consider = (d: number, kind: WaterKindId) => {
    // WETTEST WINS, not deepest — and the difference is a real artefact rather
    // than a nicety. The first version compared raw depth, which is fine while
    // every kind has a beach and wrong the moment they don't: a stream (beach 0)
    // crossing the sea's sand has a *greater* depth than the sea does out
    // there, so it won the tile and contributed nothing, punching green fingers
    // through the beach wherever a brook ran down to the shore.
    //
    // Ranking by what each kind would actually PUT here fixes it in the right
    // direction both ways: the sea's sand beats the stream's nothing, and the
    // stream's water still beats the sea's sand, so a stream mouth is wet.
    const rank = waterRank(d, kind);
    if (rank === 0) return;
    if (rank > bestRank || (rank === bestRank && best !== null && d > best.d)) {
      bestRank = rank;
      best = { d, kind };
    }
  };
  // The islands cap the sea here and ONLY here — siting and gating callers read
  // `seaDepth` raw, so an island's dry top still counts as sea to `onLand` and
  // nothing can ever be sited on ground nobody can reach (see §Islands).
  consider(Math.min(seaDepth(seed, spot, x, y), isleCap(seed, spot, x, y)), "sea");
  consider(lakeDepth(seed, spot, x, y), "lake");
  // Channels only. The sea and the lakes are already held off by TOWN_DRY, and
  // capping them here would be a second opinion about the same fact.
  const cap = townChannelCap(x, y);
  consider(Math.min(cap, channelKindDepth(seed, spot, "river", 0x21be, x, y)), "river");
  consider(Math.min(cap, channelKindDepth(seed, spot, "stream", 0x57e4, x, y)), "stream");
  if (wet > 0) consider(pondDepth(seed, x, y, wet, 0, pools), "pond");
  return best;
}

/** How wet a kind would make this tile: 3 deep, 2 shallow, 1 shore, 0 nothing.
 *  The ordering `waterAt` compares by — see the note there about beaches with
 *  green fingers through them. */
function waterRank(d: number, kind: WaterKindId): number {
  const k = waterKind(kind);
  if (d > k.shelf) return 3;
  if (d > 0) return 2;
  if (d > -k.beach) return 1;
  return 0;
}

/** The tile a depth reading comes out as, or null for dry land. The four
 *  thresholds of DESIGN §Water, in one place, so nothing can implement three of
 *  them and forget the beach. */
function waterTile(at: { d: number; kind: WaterKindId } | null): TileId | null {
  if (!at) return null;
  const kind = waterKind(at.kind);
  if (at.d > kind.shelf) return WATER;
  if (at.d > 0) return SHALLOW;
  if (at.d > -kind.beach) return SAND;
  return null;
}

/** How far the town's own crossings reach, and which two lines they run on.
 *
 *  THE TOWN HAS BRIDGES BECAUSE THE TOWN PRE-EXISTS. Rivers are allowed to run
 *  through it (a river is a good thing for a town to have), and a river is the
 *  first water that can actually stop somebody — which matters more for the
 *  RESIDENTS than for the player. A villager who cannot path to their stop does
 *  not walk slowly; it snaps there (sim/villagers.ts), so a stranded neighbour
 *  reads as teleporting rather than as a broken town, and would be miserable to
 *  diagnose from a bug report.
 *
 *  Two lines, one north-south and one east-west, so the crossing works whichever
 *  way the channel happens to run. Only WATER is replaced, so on the (usual)
 *  seeds where nothing crosses town this generates nothing at all — it isn't a
 *  road, it's a bridge that appears exactly where a bridge is needed.
 *
 *  GENERATED, not stamped, and that is the whole reason it's here rather than in
 *  sim/town.ts. A stamped bridge is a stored edit, so it would need a migration
 *  to reach the towns that already exist — and those towns are getting rivers
 *  today, because terrain is a function of the seed. Generated, every save has
 *  its bridge the moment it loads, including saves nobody opens for a year. */
const BRIDGE_REACH = 22;
const BRIDGE_ROW = -1; // the plaza's middle, north-south
const BRIDGE_COL = 0; // and east-west

/** Where a riverside town's river is promised to run.
 *
 *  RIVERSIDE FINALLY HAS A RIVER. It never did: the spot's water was a sea pinned
 *  due west, a fossil of the era when the ocean was the whole western half-plane
 *  and "riverside" was aspirational. With seas scattered there is no pin to keep,
 *  and the honest reading of the name is the one to keep instead.
 *
 *  On the bridge row, fourteen tiles west — which is very close to where the old
 *  hard-coded shore stood, so the western window still has water in it and the
 *  change reads as the sea having been a river all along rather than as the water
 *  moving. `isTownBridge` covers this row out to 22 tiles, so the crossing is
 *  already built and no villager is stranded by their own river.
 *
 *  Only the anchor is fixed; the bearing, the meander and the pinch are the
 *  seed's, so no two riverside towns have the same river — it just goes past. */
const RIVERSIDE_ANCHOR = { x: -14, y: BRIDGE_ROW };

/** Is this one of the town's own crossings? Streams and rivers only: the town
 *  bridges what runs through it, and does not build a pier out into the sea. */
function isTownBridge(x: number, y: number, kind: WaterKindId): boolean {
  if (kind !== "river" && kind !== "stream") return false;
  return (
    (y === BRIDGE_ROW && Math.abs(x) <= BRIDGE_REACH) ||
    (x === BRIDGE_COL && Math.abs(y) <= BRIDGE_REACH)
  );
}

/** How deep the water that can actually STRAND something is — the sea, the lake
 *  and the river. Everything with a deep middle, in other words, which is the
 *  same list and not a coincidence.
 *
 *  Streams and ponds are excluded on purpose, for two reasons: they're shallow,
 *  so nothing is stranded by one, and asking about ponds means asking `biomeAt`,
 *  which asks `blossomCentre`, which asks `onLand`, which asks this. A landmark
 *  standing beside a stream is a nice place to stand; a grove with a river
 *  through the middle of it is a grove in two halves with the Ghost in one. */
function bigWaterDepth(seed: number, spot: HomesteadSpot, x: number, y: number): number {
  return Math.max(
    seaDepth(seed, spot, x, y),
    lakeDepth(seed, spot, x, y),
    channelKindDepth(seed, spot, "river", 0x21be, x, y),
  );
}

/** Which kind of water is at a tile, or null for dry ground.
 *
 *  Exported for tests, which otherwise cannot tell a river's deep middle from
 *  the sea's — they look identical as tile ids, and several invariants here are
 *  about one and not the other. Also the natural hook for the day a villager
 *  wants to say "down by the river" rather than "down by the water". */
export function waterKindAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
): WaterKindId | null {
  const here = biomeDef(biomeAt(seed, spot, x, y));
  const at = waterAt(seed, spot, x, y, here.water, here.pools);
  return at && waterTile(at) !== null ? at.kind : null;
}

/** How many bearings a landmark may try before it settles. */
const BEARINGS = 16;

/** Remember a point that is a pure function of (seed, spot).
 *
 *  NOT AN OPTIMISATION SO MUCH AS A FIX. Every landmark centre is a total
 *  function of the seed and the spot — that is the whole architecture — but each
 *  one is computed by SEARCHING sixteen bearings, and each bearing asks how deep
 *  the water is there. Once seas and lakes became scatters, one such question
 *  stopped being one `roundDepth` and became nine, and the searches started
 *  nesting: `biomeAt` asks `blossomCentre`, which searches, and each candidate
 *  asks `lakeDepth`, which asks the town lake, which searches again. Per tile.
 *  The first run after the scatter landed took a town-ground test from under a
 *  second to over six, which is how this was found — a unit test, unusually,
 *  rather than a frame rate.
 *
 *  A cache is safe here in the way it usually isn't because the inputs are two
 *  scalars and the output is genuinely immutable: this is memoising arithmetic,
 *  not caching state.
 *
 *  SIZED FOR THE TESTS, NOT THE GAME, and that is the honest description. A
 *  session plays one world, so four entries would do — the cap is large because
 *  the invariant tests sweep a thousand seeds each, and a cap that evicts turns
 *  those from memoised into worst-case. Entries are two numbers; ten thousand of
 *  them is nothing to hold and cheaper than any eviction policy worth writing. */
const centreMemo = new Map<string, { x: number; y: number }>();
function memoCentre(
  tag: string,
  seed: number,
  spot: HomesteadSpot,
  compute: () => { x: number; y: number },
): { x: number; y: number } {
  const key = `${tag}:${seed}:${spot}`;
  let at = centreMemo.get(key);
  if (at === undefined) {
    if (centreMemo.size > 16384) centreMemo.clear();
    at = compute();
    centreMemo.set(key, at);
  }
  return at;
}

/** A point at exactly `ring` tiles from the origin, on the first bearing from
 *  `a0` whose ground is dry.
 *
 *  THIS REPLACES A MIRROR, and the mirror was a fossil of the infinite sea. When
 *  water was the entire western half-plane, "the land is the other way" was a
 *  true sentence and negating x was a total, radius-preserving fix. With finite
 *  water it is neither true nor sufficient: a lake can drown a bearing in any
 *  direction, and reflecting a point out of a disc can land it in the town — a
 *  grove at ring 44 pushed clear of a sea centred 110 west comes out eight tiles
 *  from the plaza, which is not a secret, it's a garden feature.
 *
 *  Sixteen fixed bearings is the smallest thing that is total, deterministic,
 *  keeps the ring EXACTLY (the ring is the whole feeling of "you were going
 *  somewhere"), and cannot loop forever. Every landmark goes through it, so a
 *  fourth one cannot forget. */
function onLand(
  seed: number,
  spot: HomesteadSpot,
  ring: number,
  a0: number,
  margin = LANDMARK_MARGIN,
): { x: number; y: number } {
  let first = { x: 0, y: 0 };
  for (let i = 0; i < BEARINGS; i++) {
    const a = a0 + (i / BEARINGS) * Math.PI * 2;
    const at = { x: Math.round(Math.cos(a) * ring), y: Math.round(Math.sin(a) * ring) };
    if (i === 0) first = at;
    // A margin, not merely "not wet": a stand of trees whose far edge is in the
    // surf is the same bug with a smaller radius.
    if (bigWaterDepth(seed, spot, at.x, at.y) < -margin) return at;
  }
  return first;
}

/** How much dry ground a landmark wants around its centre. Comfortably past the
 *  widest of them (the blossom rows, radius 9) plus its beach.
 *
 *  IT IS A DEFAULT NOW, AND IT MAY NOT MOVE. The redwood stands are twice the
 *  blossom rows' width and want more room than this — and raising the constant to
 *  give it to them would re-run every landmark search in the game, which re-sites
 *  the grove, the cube and the cherry trees on worlds people are living in. So the
 *  wide thing passes its own (`REDWOOD_MARGIN`) and this number stays exactly
 *  where it was, byte for byte, for everything that was already using it. */
const LANDMARK_MARGIN = 14;

// --- The Fen's ponds ----------------------------------------------------------
// Water in blobs, not in cells. The first version rolled a per-cell hash, and on
// screen every pond was a lone bright SQUARE — the same failure the Scrub's dry
// patches died of an hour earlier, and the same rule underneath: a feature that
// occupies exactly one cell of an otherwise continuous surface reads as a tile,
// so the surface stops reading as a surface (CLAUDE.md §per-cell edges).
//
// The fix is the one this file keeps reaching for — put the feature on a
// low-frequency field instead of on the cell. Pond centres sit on their own
// coarse grid, jittered, with a hashed radius; a cell is wet if it falls inside
// one. Ponds are then contiguous, edged where the water actually ends, and a few
// of them run together into something with a shape.

/** How far apart pond centres sit. Small enough to read as marsh rather than as
 *  lakes, wide enough that a pond has dry ground around it to be a pond IN. */
const POND_CELL = 11;

/** How big a pond gets, in tiles of radius. Past the top of this range it stops
 *  being something you walk around and starts being something you can't cross. */
const POND_MIN_RADIUS = 1.2;
const POND_MAX_RADIUS = 2.6;

/** A lattice of pools: how far apart the centres sit and how big they get. The
 *  fen's three constants above, made a parameter the day a second region wanted
 *  water of a different SHAPE rather than a different amount (the marshes; see
 *  content/biomes.ts §pools). */
export interface PoolGeometry {
  cell: number;
  min: number;
  max: number;
  /** How far the waterline wanders off the circle, as a fraction of the pool's
   *  own radius. Optional; 0 — which is the fen, whose ponds are small enough
   *  that a circle reads as a puddle.
   *
   *  THE LAVA LAKE'S LESSON, ONE SCALE DOWN. A true disc quantised onto the tile
   *  grid photographs as a RECTANGLE with steps in it: at five tiles across
   *  there are nowhere near enough cells for a curve, so the eye finds the
   *  straight runs immediately. The marshes are made almost entirely of
   *  waterline, so the first cut came out as a bay of blue boxes — the region
   *  reading as tiling, which is the failure this file names most often.
   *
   *  Two sine terms on the bearing with seeded phases, exactly as `inLavaLake`
   *  does it, so a pool comes out in headlands and inlets and no two pools are
   *  the same shape.
   *
   *  IT COUNTS AGAINST `max`. The deepest water a region can grow is
   *  `max × (1 + wobble)`, which is what has to stay under
   *  `WATER_KINDS.pond.shelf` for the crossing promise to hold — see
   *  content/biomes.ts §pools, and sim/water.test.ts, which asserts the product
   *  rather than the field. */
  wobble?: number;
}

/** The fen's own, quoted from the constants above so that passing nothing and
 *  passing this are provably the same call. */
const FEN_POOLS: PoolGeometry = {
  cell: POND_CELL,
  min: POND_MIN_RADIUS,
  max: POND_MAX_RADIUS,
};

/** Candidate centres per unit of `water`, so a region's number keeps meaning
 *  "roughly what fraction of the ground is wet" even though one centre covers
 *  many cells. Derived rather than tuned: a pool of the average radius covers
 *  about πr² of the cell² a centre is responsible for.
 *
 *  It was a hand-guessed constant first, which produced a fen 1.3% under water
 *  when it claimed 10% — measured, not eyeballed, because "there is no water on
 *  screen" and "the water is off screen" look identical from one screenshot. A
 *  function of the geometry since the marshes brought a second lattice; on the
 *  fen's it computes exactly the number that used to be written here. */
function poolsPerWater(g: PoolGeometry): number {
  return (g.cell * g.cell) / (Math.PI * ((g.min + g.max) / 2) ** 2);
}

/** How much of a lattice may be pools before the region stops having ground.
 *
 *  THE OLD CAP WAS 0.85 AND IT MEASURED THE WRONG THING, which nobody could have
 *  noticed while one geometry existed. It capped the fraction of CANDIDATE
 *  CENTRES that are real — and what that means on the ground depends entirely on
 *  how much a centre covers. On the fen's wide lattice 0.85 is about a tenth of
 *  the region wet; on a lattice half as wide it would be most of it. The number
 *  it was defending ("a fen always keeps dry ground to walk on") is about the
 *  GROUND, so that is what it should be stated in.
 *
 *  `1 - e^(-λA)` is the fraction of ground under at least one pool, for centres
 *  at density λ each covering area A. Holding that under 55% leaves better than
 *  two fifths of any region dry however close its lattice is, which is what keeps
 *  an archipelago an archipelago rather than a lake with debris in it.
 *
 *  IT BINDS ON NOTHING THAT EXISTED. The fen runs at 0.64 of its candidates and
 *  the cinders' seams at 0.43, both well under either ceiling, so this rewrite
 *  changes not one tile of either — which is the only reason it was allowed to
 *  be a rewrite rather than a second cap sitting beside the first. There is a
 *  test. */
function poolCap(g: PoolGeometry): number {
  const area = Math.PI * ((g.min + g.max) / 2) ** 2;
  return Math.min(1, (-Math.log(1 - 0.55) * g.cell * g.cell) / area);
}

/** How far inside a pond this cell is, in tiles — the deepest of the candidates
 *  that reach it, or -Infinity where none do. `chance` is the region's `water`,
 *  read as how many of the candidate centres are actually ponds, so the knob
 *  still means "how wet is it" even though the geometry changed underneath.
 *
 *  Returns a DEPTH rather than the boolean it used to, which is what buys the fen
 *  a sand rim and lets two or three merged centres grow a middle you can't
 *  wade. The waterline is unchanged: `d > 0` is the same set of cells `dist <= r`
 *  named, bar exact equality. */
function pondDepth(
  seed: number,
  x: number,
  y: number,
  chance: number,
  // THE SALT IS WHY THIS TAKES ONE. The fen's ponds and the cinders' lava seams
  // are the same geometry — blobs on a coarse lattice, never per cell — and the
  // only thing that must differ is WHERE they land, or every lava seam in the
  // world would be a fen pond that caught fire. Defaulted to the fen's own value
  // so that function is byte-identical to what it was; there is a test.
  salt = 0,
  /** The lattice to run on. Defaulted to the fen's, so every existing caller —
   *  the fen's ponds, the cinders' seams — makes bit-for-bit the call it always
   *  made. There is a test. */
  g: PoolGeometry = FEN_POOLS,
): number {
  if (chance <= 0) return -Infinity;
  let best = -Infinity;
  const cx = Math.floor(x / g.cell);
  const cy = Math.floor(y / g.cell);
  // The 3x3 neighbourhood, because a pond near a cell edge reaches into the next
  // one — checking only our own cell would clip ponds along straight lines, which
  // is the bug we are here to fix wearing a smaller hat.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const mx = cx + dx;
      const my = cy + dy;
      // Capped below 1 so a fen always keeps dry ground to walk on: at every
      // candidate being a pond the ponds merge and the region becomes a lake,
      // which is a wall and not a place.
      const density = Math.min(poolCap(g), chance * poolsPerWater(g));
      if (hash2(mx, my, seed ^ 0x0e05 ^ salt) / 4294967296 >= density) continue;
      // Two salts rather than swapped arguments — see `scatterCentre`, which
      // inherited this line's bug and is where it is explained. On the diagonal
      // the swapped version hands back the same number twice.
      const px = (mx + 0.2 + (hash2(mx, my, seed ^ 0x2b1f ^ salt) / 4294967296) * 0.6) * g.cell;
      const py =
        (my + 0.2 + (hash2(mx, my, seed ^ 0x2b1f ^ 0x51ed ^ salt) / 4294967296) * 0.6) * g.cell;
      const r = g.min + (hash2(mx, my, seed ^ 0x6a3c ^ salt) / 4294967296) * (g.max - g.min);
      const d = Math.hypot(px - x, py - y);
      // The shore in bays and headlands rather than on a circle — see
      // PoolGeometry.wobble. Skipped entirely where a region hasn't asked, so the
      // fen's ponds and the cinders' seams take the same arithmetic they always
      // did.
      if (g.wobble) {
        const th = Math.atan2(y - py, x - px);
        const pa = (hash2(mx, my, seed ^ 0x1d47 ^ salt) / 4294967296) * Math.PI * 2;
        const pb = (hash2(mx, my, seed ^ 0x1d47 ^ 0x6b2a ^ salt) / 4294967296) * Math.PI * 2;
        const w = 0.62 * Math.sin(th * 3 + pa) + 0.38 * Math.sin(th * 5 + pb);
        best = Math.max(best, r * (1 + g.wobble * w) - d);
        continue;
      }
      best = Math.max(best, r - d);
    }
  }
  return best;
}

/** The cinders' seams run on the fen's geometry and their own hash. One number,
 *  named, because a magic constant in a call to `pondDepth` is exactly the kind
 *  of thing that gets copied to a second caller and quietly makes two features
 *  the same shape. */
const LAVA_SALT = 0x4f21;

/** Whether a cell is close enough to the grove to be part of its setting.
 *
 *  Used to keep the Fen's water out of it. The grove's own cells win over the
 *  scatter anyway (they are checked first in `generatedTile`), but a stand of
 *  dark trees ringed by standing water is a stand you can see and not reach, and
 *  that is the `onLand` bug again in a different costume — this time the sea
 *  arrives after the landmark instead of before it. */
function nearGrove(seed: number, spot: HomesteadSpot, x: number, y: number): boolean {
  const c = groveCentre(seed, spot);
  return Math.hypot(x - c.x, y - c.y) <= GROVE_RADIUS + 2;
}

/** The effective tile on a layer: a player/town edit wins, else the generated
 *  chunk underneath. */
export function tileAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): TileId {
  const key = tileKey(x, y);
  const edit = editsFor(world, layer)[key];
  if (edit !== undefined) return edit;
  // Ground you built on, pinned when you built (types.ts §frozen). Surface only,
  // because rooms are. It sits BELOW an edit — digging up your own floor still
  // works — and ABOVE generation, which is the whole point: past here the
  // generator can no longer answer for this cell.
  if (layer === "surface") {
    const held = world.frozen[key];
    if (held !== undefined) return held;
  }
  return baseTileAt(world, x, y, layer);
}

/** Write an edit (dig/place/till/carve). Writing the tile that generation would
 *  already produce clears the override instead, so saves don't accumulate
 *  no-op edits. */
export function setTile(
  world: WorldState,
  x: number,
  y: number,
  id: TileId,
  layer: Layer = "surface",
): void {
  const base = baseTileAt(world, x, y, layer);
  const k = tileKey(x, y);
  const edits = editsFor(world, layer);
  if (id === base) delete edits[k];
  else edits[k] = id;
}

/** Every shaft in the world, derived by scanning the surface edits rather than
 *  kept as its own list. A shaft is a tile, so the tiles are the truth — a
 *  parallel array would be one more thing undo, migration and the away sim
 *  could each forget to keep in step.
 *
 *  Linear in the number of edits, which is the size of everything you have ever
 *  dug or placed. Fine at town scale; if it ever isn't, cache it off the same
 *  counter that invalidates the rooms index rather than storing it. */
export function shafts(world: WorldState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const [key, id] of Object.entries(world.overrides)) {
    if (id !== SHAFT) continue;
    const at = parseTileKey(key);
    if (at) out.push(at);
  }
  return out;
}

/** How deep a cell is: tiles from the NEAREST shaft, Chebyshev (diagonals cost
 *  one, matching how the tunnel reads on screen). Infinity when the town has no
 *  shaft at all.
 *
 *  This is what "digging deep" means here, and it is a horizontal measure on
 *  purpose — DESIGN is explicit that the underground is a layer and not a
 *  height, so depth cannot be a Z. Distance-from-your-own-entrance gets the
 *  same thing honestly: what's deep is what you had to tunnel a long way to
 *  reach.
 *
 *  Note the direction it moves in. Sinking a NEW shaft makes its surroundings
 *  shallower, never deeper, so there is no way to shortcut to the deep end by
 *  walking somewhere on the surface and digging down — you can only get there
 *  the long way. */
export function depthAt(world: WorldState, x: number, y: number): number {
  let best = Infinity;
  for (const s of shafts(world)) {
    const d = Math.max(Math.abs(x - s.x), Math.abs(y - s.y));
    if (d < best) best = d;
  }
  return best;
}

/** Is this tile walkable? Both layers get a say: a solid tile (water, a tree)
 *  blocks, and so does a solid structure standing on it. A door is a structure
 *  that doesn't block, which is the whole point of it being its own row.
 *
 *  Reads world.build directly rather than calling into sim/structures.ts, which
 *  imports this module — the content table is the shared dependency, so the two
 *  sim modules don't have to import each other. */
export function isWalkable(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): boolean {
  if (tileDef(tileAt(world, x, y, layer)).solid) return false;
  // Underground the rock is the only thing that can stop you, and it already had
  // its say above. Walls are a surface fact, so this doesn't consult them down
  // there and a tunnel can never be blocked by a bed on the ground overhead.
  //
  // There IS furniture in the rock now — the lamp (Phase 5a) — and this still
  // doesn't ask, because nothing placeable underground is solid. That is held by
  // the table, not by hope: `lamp.test.ts` asserts every tool offered below
  // ground has `solid: false`, so the day somebody adds a metal gate down here
  // the test fails and points at this line.
  //
  // The sky needs no such argument: nothing can be placed up there at all, so
  // the only thing that could ever stop you is the tile, and the only tiles
  // there are are cloud and the head of the steps. Neither is solid, so the
  // plane is walkable everywhere, forever — which is what an unbounded open
  // layer means (DESIGN §The sky).
  if (layer !== "surface") return true;
  const built = world.build[tileKey(x, y)];
  if (built && structureDef(built.id).solid) return false;
  return !furnitureBlocksHere(world, x, y);
}

/** What this cell does to the speed of anything walking across it — 1 on open
 *  ground, less in the shallows (see `speed` in content/tiles.ts).
 *
 *  Shared by the player and the villagers so that the water applies to everyone.
 *  A villager striding through the surf at full pace beside a player slogging
 *  would say the wading is an effect on the camera rather than a fact about the
 *  world. It reads the GROUND only — built structures and furniture stand on
 *  tiles you can't walk through anyway. */
export function tileSpeed(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): number {
  return tileDef(tileAt(world, x, y, layer)).speed ?? 1;
}

/** Whether solid furniture covers this cell.
 *
 *  The anchor search is repeated here rather than imported from
 *  sim/furniture.ts, which imports THIS module — the shared geometry lives in
 *  the content table (`covers`), so the two callers can't disagree about what a
 *  footprint is even though they each walk it themselves. */
function furnitureBlocksHere(world: WorldState, x: number, y: number): boolean {
  for (let ay = y - MAX_SPAN + 1; ay <= y; ay++) {
    for (let ax = x - MAX_SPAN + 1; ax <= x; ax++) {
      const cell = world.furniture[tileKey(ax, ay)];
      if (!cell) continue;
      const def = furnitureDef(cell.id);
      if (def.solid && covers(ax, ay, def, cell.facing, x, y)) return true;
    }
  }
  return false;
}

/** A cheap per-tile decoration hash (0..1) the renderer uses for grass tufts
 *  and plaza speckle — stable, so scenery doesn't shimmer between frames. */
export function decoHash(x: number, y: number, seed: number): number {
  return hash2(x, y, seed) / 4294967296;
}

/** Smooth value noise in 0..1, sampled at a wavelength of `period` TILES.
 *
 *  Bilinear between hashed lattice corners, with a smoothstep on each axis so
 *  the lattice itself doesn't show as diamonds. Deterministic in (x, y, seed):
 *  the ground must look the same every time you walk back onto it.
 *
 *  Exported for the renderer's frayed region edges (render/palette.ts §edge),
 *  which need a field rather than a hash for the reason everything else in this
 *  file does: a per-cell roll is a checkerboard, and what a burn's edge wants is
 *  lobes several tiles across. */
export function smoothNoise(x: number, y: number, seed: number, period: number): number {
  const fx = x / period;
  const fy = y / period;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const sx = fx - x0;
  const sy = fy - y0;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const ex = ease(sx);
  const ey = ease(sy);
  const corner = (cx: number, cy: number) => hash2(cx, cy, seed) / 4294967296;
  const top = corner(x0, y0) + ex * (corner(x0 + 1, y0) - corner(x0, y0));
  const bot = corner(x0, y0 + 1) + ex * (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1));
  return top + ey * (bot - top);
}

/** How light or dark this patch of ground is, 0..1, centred near 0.5.
 *
 *  Open grass was one flat green with a sparse tuft on it, which is fine for a
 *  tile you cross and wrong for the plot you live on: at any distance the
 *  homestead read as painted card while the town centre — which has buildings,
 *  a plaza and a river breaking it up — read as a place.
 *
 *  THE WHOLE POINT IS THE WAVELENGTH. Two octaves at 11 and 29 tiles, so the
 *  lightest and darkest parts of a patch are half a screen apart and no edge of
 *  it can line up with a cell. This is the per-cell edges band rule (CLAUDE.md)
 *  answered the way that rule prescribes — texture stepped off the WORLD
 *  coordinate, not off the tile — and it is why the renderer mixes the result
 *  CONTINUOUSLY rather than quantizing it into two or three shades. Quantizing
 *  would put a hard contour back on the field; it would be an irregular contour
 *  rather than a grid, so it would not stripe, but a visible edge in the middle
 *  of open grass is a thing to explain and this has nothing to explain.
 *
 *  Sampled on the world coordinate, so it does not move with the camera, the
 *  chunk, or the homestead — walk far enough and the ground keeps rolling. */
export function groundTone(x: number, y: number, seed: number): number {
  const broad = smoothNoise(x, y, seed ^ 0x9e37, 29);
  const fine = smoothNoise(x, y, seed ^ 0x1b57, 11);
  return broad * 0.65 + fine * 0.35;
}

// --- Terrain verbs (the two placeable tile types + tilling) ------------------
// These enforce what a tool is allowed to do; the game layer calls them from
// the action button. Each returns whether it changed anything (for feedback).

/** Is there anything here for the shovel? Split out of `dig` so the ACT reticle
 *  can promise the dig before it happens (see `actionTarget`). */
export function canDig(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  return t === GRASS || t === MUSHROOM || t === SAND;
}

/** What the ground closes back to when a hole heals (sim/gather.ts).
 *
 *  GRASS unless the generator says this is shore, in which case sand — the two
 *  bare grounds a dug tile can have come from. Deliberately not "whatever
 *  `generatedTile` returns": that could be a tree, a rock, or open water, and
 *  the reclaim rule is about the grass closing over, not about the world
 *  re-growing something you cleared on purpose or drowning you where you stand. */
export function healsTo(world: WorldState, x: number, y: number): TileId {
  const was = generatedTile(world.seed, world.homestead.spot, x, y);
  return was === SAND ? SAND : GRASS;
}

/** Ground that will hold a board but not a building: the shallows.
 *
 *  WHY IT ISN'T PART OF `refusesConstruction`. That predicate is also consulted
 *  by `placeFloor`, and a plank over the shallows is a BOARDWALK — a thing you
 *  should absolutely be able to want, and one that costs the game nothing to
 *  allow. What has to be refused is footing: a wall, a floor, a bed.
 *
 *  It has to be said out loud because shallow water is not `solid` — that is the
 *  entire point of it — so every existing placement guard, which tests exactly
 *  that one flag, waves it straight through. Without this the first arrival's
 *  cottage gets sited in the surf, and the second thing that happens is nobody
 *  can work out why. */
export function refusesFooting(world: WorldState, x: number, y: number): boolean {
  return tileAt(world, x, y) === SHALLOW;
}

/** Can the shovel fill this water in?
 *
 *  Both depths, and the caller decides which one it's allowed to reach: shallow
 *  is underfoot (you're standing in it), deep is the tile you're facing (you
 *  can't stand in it), exactly the way a tree is felled. See `actionTarget`.
 *
 *  Terraforming is always free (DESIGN §Materials) and that has to include the
 *  water or it's a slogan — so this costs nothing, needs no material, and is not
 *  gated on the size of what you're filling. Someone may fill the ocean. It will
 *  take them a while.
 *
 *  AND THE LAVA, on exactly those terms. It was tempting to make this the one
 *  hole you cannot fill in, and every version of that argument turned out to be
 *  about DANGER — which this game does not have, anywhere, at all. A player who
 *  wants to shovel a caldera flat over several evenings is doing the thing the
 *  sentence above promises they may do, and the alternative is a special case
 *  that exists only to say no. Nobody in town remarks on it. */
export function canFill(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  return t === WATER || t === SHALLOW || t === LAVA;
}

/** Fill water in. Leaves SAND — you filled it with the shore, and the new shore
 *  is what you stand on to reach the next tile.
 *
 *  BOOKS NO RECLAIM, and that is the one deliberate exception to "the world
 *  heals where you aren't invested" (DESIGN §Water). Grass closing over an
 *  abandoned hole is generous; a sea closing over an afternoon's terraforming
 *  while you were asleep is a tax on the one activity the doc calls free. */
export function fill(world: WorldState, x: number, y: number): boolean {
  if (!canFill(world, x, y)) return false;
  setTile(world, x, y, SAND);
  return true;
}

/** How long dug earth lies bare before the grass closes over it.
 *
 *  It used to be longer than every node's regrowMs and is now shorter than most
 *  of them, and the RULE it was written to serve survived the change: you should
 *  never watch the world undo your afternoon while you are standing over it
 *  deciding what to put there. Twelve hours is still well past a session. When the
 *  nodes were retuned (a tree went from 8h to a day, a rock from 10h to three) it
 *  was the nodes that were too fast, not this that was too slow — and a hole you
 *  dug is not a wood, so there is no reason the two numbers must stay in order.
 *
 *  A pending node beats the grass anyway: `updateReclaim` skips tiles something
 *  is coming back to, so a felled tree's dirt is never quietly turned to lawn out
 *  from under it. It also leaves bare dirt usable as a working surface for a whole
 *  build session, which is why it isn't the four hours real grass would suggest.
 *
 *  The firing rule is in sim/gather.ts beside the one for felled nodes, because
 *  the two have to agree about what "you've claimed this" means. Only the booking
 *  is here — this file may not import a sim sibling. */
export const RECLAIM_MS = 12 * 60 * 60 * 1000;

/** Shovel: grass (or a patch of mushrooms) → dug dirt. Clearing mushrooms is an
 *  option, never an errand — they do nothing but sit there looking pleased.
 *
 *  Takes `now` because digging books the tile to grass over (see RECLAIM_MS), and
 *  it books it HERE rather than at the call site for the reason digWithFind gives
 *  about order: a dig that forgot to book would leave a scar that nothing in the
 *  game ever heals, and it would fail silently and permanently. One call, and the
 *  bookkeeping cannot be left out. */
export function dig(world: WorldState, x: number, y: number, now: number): boolean {
  if (!canDig(world, x, y)) return false;
  setTile(world, x, y, DIRT);
  world.reclaim[tileKey(x, y)] = now + RECLAIM_MS;
  return true;
}

/** What an absent `world.finishes` entry means, and the one finish that never
 *  needs storing. It is the floor tile's own colours in content/tiles.ts, so a
 *  cell with no entry draws identically whether the renderer consults the map
 *  or not — which is what makes the sparse encoding invisible rather than a
 *  trap. Keep the three in step if pine is ever restyled. */
export const FLOOR_DEFAULT_FINISH: SkinId = defaultSkin("wood");

/** What finish a laid floor is wearing. Absent means the default — see
 *  WorldState.finishes for why the map is sparse in that particular way.
 *
 *  Answers for any cell, floor or not: a caller asking about bare grass gets
 *  the default rather than an error, because every call site here is a
 *  renderer or a refund working out what something looked like, and neither has
 *  anything useful to do with an exception. */
export function floorFinish(world: WorldState, x: number, y: number): SkinId {
  return world.finishes[tileKey(x, y)] ?? FLOOR_DEFAULT_FINISH;
}

/** Forget a cell's floor finish. Called wherever a floor stops being one —
 *  erase, and anything else that overwrites the ground.
 *
 *  Without it the map leaks: lift a slate board, lay a fresh one, and the new
 *  board would silently inherit the old one's colour instead of the finish you
 *  are actually holding. */
export function clearFloorFinish(world: WorldState, x: number, y: number): void {
  delete world.finishes[tileKey(x, y)];
}

/** Lay a floor on any non-solid, non-planted ground — and on water of either
 *  depth, which is the one place a floor is allowed to sit on something
 *  `solid`.
 *
 *  A BRIDGE OVER THE OCEAN IS ALLOWED. Deliberately (DESIGN §Water): real time
 *  gates this world, never the player's hands, and someone who boards ninety
 *  tiles out to the far shore has built the best story this game can produce.
 *  Refusing it would buy a wall and sell a legend.
 *
 *  The finish is STAMPED here rather than read at draw time, which is the whole
 *  point of v27: a finish is something you chose when you built, not a filter
 *  over the world. Laying a floor on a floor is a legal repaint and returns
 *  true — the same courtesy placeStructure extends to a wall you re-finish. */
export function placeFloor(world: WorldState, x: number, y: number, finish: SkinId): boolean {
  const t = tileAt(world, x, y);
  if (tileDef(t).solid && t !== WATER) return false;
  if (world.crops[tileKey(x, y)]) return false; // don't pave over a plant
  if (refusesConstruction(world, x, y)) return false; // nor over her trees
  setTile(world, x, y, 2 /* FLOOR */);
  // The floor's default finish is stored as ABSENCE, not as a value: see
  // WorldState.finishes. Writing "pine" here would grow the save by one entry
  // per board for the commonest possible choice.
  //
  // Compared against FLOOR_DEFAULT_FINISH and not against the default for the
  // finish's OWN class, which was the first version of this line and was
  // wrong: granite is the stone class's default, so a granite floor cleared
  // its entry and then read back as pine. Absence has to mean exactly one
  // finish, and it is this one.
  if (finish === FLOOR_DEFAULT_FINISH) clearFloorFinish(world, x, y);
  else world.finishes[tileKey(x, y)] = finish;
  return true;
}

/** Till grass/dirt/sand into farmland (the first half of planting). Sand is in
 *  the list because a beach is ground like any other here — you may farm the
 *  shore, and nothing about sand is a penalty (DESIGN §Water). */
export function till(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (t === GRASS || t === DIRT || t === SAND) {
    setTile(world, x, y, FARMLAND);
    return true;
  }
  return false;
}

/** Can a shaft be sunk here? Dug earth and nothing else — you dig a tile once to
 *  turn grass into dirt, and digging that same dirt again is what opens the way
 *  down. No new tool and no new button: the second dig is the whole gesture.
 *
 *  Refuses anything the shaft would destroy — a crop, a built cell, furniture —
 *  because unlike a dig, sinking a shaft is not a cheap thing to redo. */
export function canSink(world: WorldState, x: number, y: number): boolean {
  if (tileAt(world, x, y) !== DIRT) return false;
  const k = tileKey(x, y);
  if (world.crops[k] || world.build[k]) return false;
  return !furnitureBlocksHere(world, x, y);
}

/** Sink a shaft: a hole on the surface, the rock directly under it cut away so
 *  there is somewhere to land, and a small landing around that. Free, like every
 *  other kind of digging.
 *
 *  THE LANDING IS NOT DECORATION. Cut only the cell under the hole and you
 *  arrive in a one-tile room with solid rock on all four sides — and since the
 *  cell you are standing on is also the way up, the only thing ACT can offer you
 *  down there is to leave again. There is no first swing of the pick, because
 *  you are stood on the one tile that isn't a rock face. Found on screen, in a
 *  browser, having passed every unit test.
 *
 *  Four neighbours, not a room: enough to step off the ladder and turn around,
 *  after which the size of the open space is the size of what you dug. Each one
 *  goes through `carve`, so a vein beside the ladder survives — the landing
 *  cannot quietly destroy the ore it lands next to. The centre is forced, ore or
 *  not: you have to come down somewhere. */
export function sink(world: WorldState, x: number, y: number): boolean {
  if (!canSink(world, x, y)) return false;
  setTile(world, x, y, SHAFT);
  setTile(world, x, y, CAVE_FLOOR, "under");
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as [number, number][]) {
    carve(world, x + dx, y + dy);
  }
  return true;
}

/** Fill a shaft back in, leaving whatever you carved down there intact — you
 *  are closing the lid, not collapsing the tunnel.
 *
 *  It exists because ACT has no undo (that's deliberate, ROADMAP §"Undo covers
 *  BUILD strokes only"), and a hole in your lawn from a mis-tap is the one dug
 *  tile that isn't cheap to live with. */
export function fillShaft(world: WorldState, x: number, y: number): boolean {
  if (tileAt(world, x, y) !== SHAFT) return false;
  // Never while you're below. A shaft is stored once, on the surface, and it is
  // also the way back — so closing one from above with the player underground
  // seals them in a cave with no exit. Refusing whenever the player is on the
  // lower layer at all is stricter than checking this particular hole, and
  // deliberately so: it cannot be defeated by a second entrance being open, and
  // it does not lean on the caller having got the coordinate right.
  if (world.player.layer === "under") return false;
  setTile(world, x, y, DIRT);
  return true;
}

/** Is there rock here to cut? The face of a tunnel, in other words. An ore vein
 *  is deliberately NOT carvable — it's a resource node, so it goes through
 *  gathering (sim/gather.ts) the way a tree does, and cutting it away with the
 *  shovel would throw the ore on the floor. */
export function canCarve(world: WorldState, x: number, y: number): boolean {
  return tileAt(world, x, y, "under") === BEDROCK;
}

/** Cut rock away, leaving cave floor. The underground's answer to `dig`, and
 *  free for the same reason: terraforming is never rationed (DESIGN
 *  §Materials), so a tunnel costs time and nothing else. */
export function carve(world: WorldState, x: number, y: number): boolean {
  if (!canCarve(world, x, y)) return false;
  setTile(world, x, y, CAVE_FLOOR, "under");
  return true;
}

export { FARMLAND, FARMLAND_WET };
export type { Layer };
