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
  PLANK,
  WATER,
  DIRT,
  FARMLAND,
  FARMLAND_WET,
  MUSHROOM,
  TREE,
  ROCK,
  BEDROCK,
  ORE_VEIN,
  SHAFT,
  CAVE_FLOOR,
  DARK_TREE,
  HUM_CUBE,
  SAND,
  SHALLOW,
  tileDef,
} from "../content/tiles";
import { NODES } from "../content/nodes";
import type { BiomeId } from "../content/biomes";
import { FIELD_BIOMES, biomeDef } from "../content/biomes";
import type { WaterKindId, ChannelDef } from "../content/water";
import { waterKind } from "../content/water";
import { structureDef } from "../content/structures";
import { furnitureDef, covers, MAX_SPAN } from "../content/furniture";
import type { WorldState, HomesteadSpot, Layer } from "./types";
import { hash2 } from "./rng";

export const CHUNK = 16; // tiles per chunk edge — chunks are a render/streaming unit

/** The sparse edit map for a layer. Underground edits live in their own record
 *  rather than under a prefixed key, so a save that predates the underground
 *  needs no rekeying — only an empty object added (schema v17). */
function editsFor(world: WorldState, layer: Layer): Record<string, TileId> {
  return layer === "under" ? world.under : world.overrides;
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
  return layer === "under" ? `u:${cx},${cy}` : `${cx},${cy}`;
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
      tiles[ty * CHUNK + tx] =
        layer === "under"
          ? generatedUnderTile(seed, ox + tx, oy + ty)
          : generatedTile(seed, spot, ox + tx, oy + ty);
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
export const PLAZA = { x0: -5, y0: -5, x1: 5, y1: 3 }; // inclusive stone rectangle
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

    // What the region does to the scatter. Every multiplier is 1 and every
    // clutter chance 0 in the meadow, so the town's own region — and therefore
    // every town that existed before biomes did — generates precisely what it
    // always generated. See `originSite`.
    const biome = biomeDef(biomeAt(seed, spot, x, y));

    // Water, and the shore it makes. Every kind at once, deepest wins, and the
    // tile is four thresholds on the depth (see `waterAt` / `waterTile`).
    //
    // Kept out of the grove's setting so her trees can't end up ringed by
    // something you can see across and not walk across (see `nearGrove`) — and
    // out of the homestead clearing by the `nearHome` guard above, which is what
    // promises you always arrive somewhere you can stand.
    if (!nearGrove(seed, spot, x, y)) {
      const at = waterAt(seed, spot, x, y, biome.water);
      const wet = waterTile(at);
      // The town's own crossing, where it has one. Only the water itself is
      // decked — the shore either side is left as shore, so a bridge reads as a
      // bridge and not as a road that stops at the bank.
      if (at && (wet === WATER || wet === SHALLOW) && isTownBridge(x, y, at.kind)) return PLANK;
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
    const density = NODES.tree.density * biome.trees;
    if (treeRoll < density) return TREE;
    if (rockRoll(seed, x, y) < NODES.rock.density * biome.rocks && rockIsLoneliest(seed, x, y)) {
      return ROCK;
    }

    // Ground clutter, on its own hashes so turning it up somewhere doesn't
    // reshuffle where that region's trees stand.
    if (biome.mushrooms > 0 && hash2(x, y, seed ^ 0x3f07) / 4294967296 < biome.mushrooms) {
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
  if (layer === "under") return false;
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
 *  several houses' worth of pink, with room for a garden. */
const BLOSSOM_RADIUS = 9;

/** Where the cherry trees are. Sited, not rolled — see BIOMES.blossom. Runs
 *  through `onLand` like every landmark, because an orchard standing in the sea
 *  is the day that function cost us. */
export function blossomCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  return memoCentre("blossom", seed, spot, () =>
    onLand(seed, spot, BLOSSOM_RING, (hash2(6, 0, seed ^ 0x7c1d) / 4294967296) * Math.PI * 2),
  );
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
  const wooded = (mx: number, my: number): BiomeId =>
    hash2(mx, my, seed ^ 0x7ee5) % 2 === 0 ? "pinewood" : "birch";

  if (spot === "forest") {
    if (atHome) {
      // Measured from the ORIGIN, not from the homestead plot, so the clearing
      // is the town's and not the player's — you live at its edge, like
      // everybody else does.
      // THE RING IS ALWAYS PINES, and that is not a missed chance for variety.
      // The coin flip `wooded` does elsewhere decides between 2.2× trees on a
      // needle-dark floor and 1.4× on a pale one, and on the seeds that came up
      // birch the treeline of a town chosen FOR its treeline was a faint speckle
      // you had to be told about — seed 31, found by looking. The wood you can
      // see from your own door is the whole promise of the spot, so it does not
      // get to be the sparse one. Past the clearing the flip resumes, so walking
      // out still finds birches; they are just not what the promise rests on.
      if (Math.hypot(x, y) > clearingRadius(seed, Math.atan2(y, x))) return "pinewood";
    } else if (Math.max(Math.abs(site.mx - home.mx), Math.abs(site.my - home.my)) === 1) {
      return wooded(site.mx, site.my);
    }
  }

  if (atHome) return "meadow";

  const roll = hash2(site.mx, site.my, seed ^ 0x30de) / 4294967296;
  return FIELD_BIOMES[Math.floor(roll * FIELD_BIOMES.length) % FIELD_BIOMES.length];
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
  consider(seaDepth(seed, spot, x, y), "sea");
  consider(lakeDepth(seed, spot, x, y), "lake");
  consider(channelKindDepth(seed, spot, "river", 0x21be, x, y), "river");
  consider(channelKindDepth(seed, spot, "stream", 0x57e4, x, y), "stream");
  if (wet > 0) consider(pondDepth(seed, x, y, wet), "pond");
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
  const at = waterAt(seed, spot, x, y, biomeDef(biomeAt(seed, spot, x, y)).water);
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
): { x: number; y: number } {
  let first = { x: 0, y: 0 };
  for (let i = 0; i < BEARINGS; i++) {
    const a = a0 + (i / BEARINGS) * Math.PI * 2;
    const at = { x: Math.round(Math.cos(a) * ring), y: Math.round(Math.sin(a) * ring) };
    if (i === 0) first = at;
    // A margin, not merely "not wet": a stand of trees whose far edge is in the
    // surf is the same bug with a smaller radius.
    if (bigWaterDepth(seed, spot, at.x, at.y) < -LANDMARK_MARGIN) return at;
  }
  return first;
}

/** How much dry ground a landmark wants around its centre. Comfortably past the
 *  widest of them (the blossom rows, radius 9) plus its beach. */
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

/** Candidate centres per unit of `water`, so the region's number keeps meaning
 *  "roughly what fraction of the ground is wet" now that one centre covers many
 *  cells. Derived rather than tuned: a pond of the average radius covers about
 *  πr² of the POND_CELL² a centre is responsible for.
 *
 *  It was a hand-guessed 3.2 first, which produced a fen 1.3% under water when it
 *  claimed 10% — measured, not eyeballed, because "there is no water on screen"
 *  and "the water is off screen" look identical from one screenshot. */
const PONDS_PER_WATER =
  (POND_CELL * POND_CELL) / (Math.PI * ((POND_MIN_RADIUS + POND_MAX_RADIUS) / 2) ** 2);

/** How far inside a pond this cell is, in tiles — the deepest of the candidates
 *  that reach it, or -Infinity where none do. `chance` is the region's `water`,
 *  read as how many of the candidate centres are actually ponds, so the knob
 *  still means "how wet is it" even though the geometry changed underneath.
 *
 *  Returns a DEPTH rather than the boolean it used to, which is what buys the fen
 *  a sand rim and lets two or three merged centres grow a middle you can't
 *  wade. The waterline is unchanged: `d > 0` is the same set of cells `dist <= r`
 *  named, bar exact equality. */
function pondDepth(seed: number, x: number, y: number, chance: number): number {
  if (chance <= 0) return -Infinity;
  let best = -Infinity;
  const cx = Math.floor(x / POND_CELL);
  const cy = Math.floor(y / POND_CELL);
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
      const density = Math.min(0.85, chance * PONDS_PER_WATER);
      if (hash2(mx, my, seed ^ 0x0e05) / 4294967296 >= density) continue;
      // Two salts rather than swapped arguments — see `scatterCentre`, which
      // inherited this line's bug and is where it is explained. On the diagonal
      // the swapped version hands back the same number twice.
      const px = (mx + 0.2 + (hash2(mx, my, seed ^ 0x2b1f) / 4294967296) * 0.6) * POND_CELL;
      const py = (my + 0.2 + (hash2(mx, my, seed ^ 0x2b1f ^ 0x51ed) / 4294967296) * 0.6) * POND_CELL;
      const r =
        POND_MIN_RADIUS +
        (hash2(mx, my, seed ^ 0x6a3c) / 4294967296) * (POND_MAX_RADIUS - POND_MIN_RADIUS);
      best = Math.max(best, r - Math.hypot(px - x, py - y));
    }
  }
  return best;
}

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
  const edit = editsFor(world, layer)[tileKey(x, y)];
  if (edit !== undefined) return edit;
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
  if (layer === "under") return true;
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
 *  by `placePlank`, and a plank over the shallows is a BOARDWALK — a thing you
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
 *  take them a while. */
export function canFill(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  return t === WATER || t === SHALLOW;
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
 *  Longer than either node's regrowMs (8h and 10h, content/nodes.ts), and that
 *  ordering is the point rather than a tuning accident: you should never watch the
 *  world undo a hole while you are standing over it deciding what to put there.
 *  You come back and it has closed. It also leaves bare dirt usable as a working
 *  surface for a whole build session, which is why it isn't the four hours real
 *  grass would suggest.
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

/** Place a wood plank on any non-solid, non-planted ground — and on water of
 *  either depth, which is the one place a plank is allowed to sit on something
 *  `solid`.
 *
 *  A BRIDGE OVER THE OCEAN IS ALLOWED. Deliberately (DESIGN §Water): real time
 *  gates this world, never the player's hands, and someone who planks ninety
 *  tiles out to the far shore has built the best story this game can produce.
 *  Refusing it would buy a wall and sell a legend. */
export function placePlank(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (tileDef(t).solid && t !== WATER) return false;
  if (world.crops[tileKey(x, y)]) return false; // don't pave over a plant
  if (refusesConstruction(world, x, y)) return false; // nor over her trees
  setTile(world, x, y, 2 /* PLANK */);
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
