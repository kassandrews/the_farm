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
  tileDef,
} from "../content/tiles";
import { NODES } from "../content/nodes";
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
    case "hilltop":
      return { x: HOME.x + 1, y: HOME.y - 1 };
  }
}

/** Tiles around the homestead origin kept clear of trees and rocks, so you
 *  always arrive to somewhere you can actually stand and start building. */
const HOMESTEAD_CLEARING = 4;

/** Deterministic base terrain at a surface tile, before any edits: paved plaza,
 *  a river west for the riverside spot, resource nodes scattered by seed, and
 *  grass everywhere else. */
export function generatedTile(seed: number, spot: HomesteadSpot, x: number, y: number): TileId {
  // Plaza paving.
  if (x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1) return STONE;
  // A river along the far west, so the riverside homestead reads true.
  if (spot === "riverside" && x <= -12 && (x + ((y * 3) % 2)) % 7 !== 0) {
    if (x <= -13) return WATER;
  }

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

    // Two independent hashes so trees and rocks don't correlate into stripes.
    const treeRoll = hash2(x, y, seed ^ 0x7a11) / 4294967296;
    const density = spot === "forest" ? NODES.tree.density * 1.8 : NODES.tree.density;
    if (treeRoll < density) return TREE;
    const rockRoll = hash2(x, y, seed ^ 0x20c4) / 4294967296;
    if (rockRoll < NODES.rock.density) return ROCK;
  }
  return GRASS;
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

/** THE SITES HAVE TO KNOW ABOUT THE SEA, and this was found on screen rather
 *  than in a test. A riverside town is water from x = -13 westward, without
 *  limit — the river check in `generatedTile` runs before anything else and
 *  answers for the entire western half of the world. A bearing picked from the
 *  seed alone therefore drowned the grove in about half of all riverside towns:
 *  a stand of trees in open ocean, unreachable, with a Ghost standing in it.
 *
 *  The fix is on the SITE, not on the generator's order. Putting the landmark
 *  branch above the river would have grown trees in the sea, which is the same
 *  bug with the tiles rearranged; and rejecting-and-rerolling the angle needs a
 *  loop that can fail. Mirroring is total, keeps the radius exactly, and is a
 *  true sentence about the town: the land is the other way.
 *
 *  Every landmark goes through this, so a third one cannot forget. */
function onLand(spot: HomesteadSpot, at: { x: number; y: number }): { x: number; y: number } {
  return spot === "riverside" && at.x <= RIVER_EDGE ? { x: -at.x, y: at.y } : at;
}

/** West of this, a riverside town is open water (see `generatedTile`). */
const RIVER_EDGE = -12;

/** Where the dark wood is. */
export function groveCentre(seed: number, spot: HomesteadSpot): { x: number; y: number } {
  const a = groveAngle(seed);
  return onLand(spot, {
    x: Math.round(Math.cos(a) * GROVE_RING),
    y: Math.round(Math.sin(a) * GROVE_RING),
  });
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
  const a = (hash2(5, 0, seed ^ 0x11b3) / 4294967296) * Math.PI * 2;
  return onLand(spot, {
    x: Math.round(Math.cos(a) * CUBE_RING),
    y: Math.round(Math.sin(a) * CUBE_RING),
  });
}

function isCubeSite(seed: number, spot: HomesteadSpot, x: number, y: number): boolean {
  const c = cubeSite(seed, spot);
  return x === c.x && y === c.y;
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
  return t === GRASS || t === MUSHROOM;
}

/** Shovel: grass (or a patch of mushrooms) → dug dirt. Clearing mushrooms is an
 *  option, never an errand — they do nothing but sit there looking pleased. */
export function dig(world: WorldState, x: number, y: number): boolean {
  if (!canDig(world, x, y)) return false;
  setTile(world, x, y, DIRT);
  return true;
}

/** Place a wood plank on any non-solid, non-planted ground. */
export function placePlank(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (tileDef(t).solid) return false;
  if (world.crops[tileKey(x, y)]) return false; // don't pave over a plant
  setTile(world, x, y, 2 /* PLANK */);
  return true;
}

/** Till grass/dirt into farmland (the first half of planting). */
export function till(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (t === GRASS || t === DIRT) {
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
