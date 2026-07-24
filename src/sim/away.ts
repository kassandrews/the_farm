// The away simulation. While you're gone the town keeps living (DESIGN §"Time
// and the away simulation"), and — the part that matters — absence generates
// NEWS, never chores or guilt (§"Absence as story, not punishment").
//
// Every event here MUTATES the world and then reports what it did; the postcard
// is assembled from what actually happened, not from a bag of flavour strings.
// That's the difference between a living town and a slideshow.
//
// House rules for anything added to this table:
//   • Never destroy the player's work. The Gremlin *moves* a board; it never
//     eats one. Tile counts are preserved.
//   • Never create an obligation. Mushrooms are scenery you may clear if you
//     like — nothing decays, nothing must be tidied, nothing is lost by
//     ignoring it.
//   • Prefer changes the player can *see* on return, or that a villager can
//     bring up in conversation later.

import type { WorldState } from "./types";
import type { Rng } from "./rng";
import { tileAt, setTile, tileKey } from "./world";
import { GRASS, DIRT, PLANK, MUSHROOM } from "../content/tiles";
import { remember } from "./memory";

const HOUR = 3_600_000;

/** Under this, you were barely gone — no postcard at all. */
export const AWAY_MIN_MS = 20 * 60 * 1000;

/** One event per this much time away, so a weekend produces a few pieces of
 *  news and a coffee break produces none. */
const MS_PER_EVENT = 6 * HOUR;
const MAX_EVENTS = 3; // a homecoming should be a postcard, not a changelog

/** Mushrooms stop spreading past this many — the town gets characterful, not
 *  overrun, and the player is never handed a weeding job. */
const MUSHROOM_CAP = 10;

/** An event that tried to happen. `line` is the postcard sentence; null means
 *  the event found nothing to act on (no boards to move yet) and should be
 *  skipped silently rather than reported as a non-event. */
type AwayEvent = (world: WorldState, rng: Rng, now: number) => string | null;

/** Tiles the player has placed or altered, as [x, y, tileId]. The away sim only
 *  ever touches ground near the town/homestead, which is where overrides are. */
function overrideTiles(world: WorldState): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [key, id] of Object.entries(world.overrides)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y, id]);
  }
  return out;
}

/** Is this tile free for scenery? Plain ground, nothing growing, nothing built. */
function isBareGround(world: WorldState, x: number, y: number): boolean {
  if (world.crops[tileKey(x, y)]) return false;
  const t = tileAt(world, x, y);
  return t === GRASS || t === DIRT;
}

// --- The events ---------------------------------------------------------------

/** Mushrooms creep out around the homestead overnight. Pure gift: scenery that
 *  appears near where you live, clearable but never demanding. */
const mushroomsSpread: AwayEvent = (world, rng) => {
  const existing = overrideTiles(world).filter(([, , id]) => id === MUSHROOM).length;
  if (existing >= MUSHROOM_CAP) return null;

  const ox = world.homestead.originX;
  const oy = world.homestead.originY;
  const spots: [number, number][] = [];
  // Scan a ring around the homestead for somewhere plausible to sprout.
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const x = ox + dx;
      const y = oy + dy;
      if (isBareGround(world, x, y) && tileAt(world, x, y) === GRASS) spots.push([x, y]);
    }
  }
  if (spots.length === 0) return null;

  const want = Math.min(1 + rng.int(3), MUSHROOM_CAP - existing, spots.length);
  for (let i = 0; i < want; i++) {
    const [x, y] = spots[rng.int(spots.length)];
    setTile(world, x, y, MUSHROOM);
  }
  return want === 1
    ? "A mushroom came up near your plot. It was not there before."
    : `Mushrooms came up near your plot — ${want} of them, in a loose sort of arc.`;
};

/** The Gremlin relocates one of your boards by a tile. Canon behaviour (DESIGN
 *  §fixed cast: "Sometimes moves your fences") and deliberately harmless: the
 *  board is moved, never removed, so nothing you built is ever lost. */
const gremlinMovesABoard: AwayEvent = (world, rng) => {
  const planks = overrideTiles(world).filter(([, , id]) => id === PLANK);
  if (planks.length === 0) return null;

  const [x, y] = planks[rng.int(planks.length)];
  const neighbours: [number, number][] = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ].filter(([nx, ny]) => isBareGround(world, nx, ny)) as [number, number][];
  if (neighbours.length === 0) return null;

  const [nx, ny] = neighbours[rng.int(neighbours.length)];
  setTile(world, x, y, GRASS); // reverts to whatever generation says underneath
  setTile(world, nx, ny, PLANK);
  return "One of your boards is one tile to the left of where you left it. The Gremlin denies everything.";
};

/** The Scholar mounts a new (wrong) exhibit. No museum building yet, so the
 *  state this changes is the Scholar's MEMORY — which means they can bring it
 *  up in conversation later. News you can talk to. */
const scholarMountsExhibit: AwayEvent = (world, rng, now) => {
  const scholar = world.villagers.find((v) => v.form === "scholar");
  if (!scholar) return null;
  const subject = rng.pick(["a rock", "an interesting stick", "the concept of weather", "a second rock"]);
  scholar.memory = remember(scholar.memory, { kind: "exhibit", at: now, value: subject });
  return `The Scholar mounted a new exhibit while you were out. The subject is ${subject}. The placard is confidently wrong.`;
};

/** The whole table. Order is irrelevant — the roll shuffles. */
const AWAY_EVENTS: AwayEvent[] = [mushroomsSpread, gremlinMovesABoard, scholarMountsExhibit];

/** Run the town forward across an absence, mutating the world, and return the
 *  lines describing what genuinely changed. Crops are advanced by the caller
 *  (they have their own wall-clock integration); this is everything else. */
export function simulateAway(world: WorldState, elapsedMs: number, now: number, rng: Rng): string[] {
  const budget = Math.min(MAX_EVENTS, Math.floor(elapsedMs / MS_PER_EVENT));
  if (budget <= 0) return [];

  // Try events in a shuffled order and keep the ones that found something to
  // do, up to the budget. An event that returns null didn't happen at all.
  const pool = [...AWAY_EVENTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const lines: string[] = [];
  for (const event of pool) {
    if (lines.length >= budget) break;
    const line = event(world, rng, now);
    if (line) lines.push(line);
  }
  return lines;
}
