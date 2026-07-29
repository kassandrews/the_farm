// The Maverick Mole — the one person who lives in the rock, and the whole of
// what the deep pays out besides slate and a bit of junk.
//
// DESIGN §"The Mole, specifically" is the model. What this file owns is the two
// moments: MEETING him (you tunnelled into his warren, so he is now somebody
// the game knows about) and his ONE habit (while you are away he lengthens your
// tunnel, going the way you were going).
//
// He is never conjured. `ensureFixedCast` appends institutions to any save that
// is missing one, because an institution with nobody behind the counter is a
// bug — but a secret that a migration puts in your save is not a secret, it is
// a fixture you happen not to have visited. So the only thing that makes him
// exist is a player standing in his chamber.

import type { WorldState, Villager } from "./types";
import type { Rng } from "./rng";
import { MOLE } from "../content/cast";
import { makeVillager } from "./villagers";
import { stopTarget } from "./housing";
import { warrenChamber, carve, canCarve, depthAt, shafts, parseTileKey, tileAt } from "./world";
import { CAVE_FLOOR } from "../content/tiles";

/** How close you have to get before he is a person you have met. The chamber's
 *  own radius, near enough — you are standing in his front room. Not a "you
 *  can see him" radius, because the darkness underground is a gradient and
 *  "close enough to make out" is a rendering question, not a world one. */
const MEET_RADIUS = 4;

/** Has the town's one secret been met? He is in the villager list or he isn't;
 *  there is no flag, because a flag would be the same fact written twice. */
export function moleMet(world: WorldState): boolean {
  return world.villagers.some((v) => v.id === "mole");
}

export function mole(world: WorldState): Villager | undefined {
  return world.villagers.find((v) => v.id === "mole");
}

/** Called every tick. Appends him the first time the player stands in his
 *  chamber, and says nothing about it — no toast, no fanfare, no "you have
 *  discovered". He is undocumented (DESIGN §fixed cast); the discovery is that
 *  there is somebody there, and you can see that with your eyes.
 *
 *  Placed through `stopTarget` rather than from `warrenChamber` directly, so
 *  his position comes out of the same anchor resolution that would move him if
 *  anything ever did. One answer to "where is the Mole", asked the way every
 *  other villager's position is asked. */
export function meetMole(world: WorldState, now: number): void {
  if (world.player.layer !== "under" || moleMet(world)) return;
  const chamber = warrenChamber(world.seed);
  if (Math.hypot(world.player.x - chamber.x, world.player.y - chamber.y) > MEET_RADIUS) return;

  const v = makeVillager(MOLE, now);
  v.layer = "under";
  const stop = stopTarget(world, v, now);
  v.x = stop.x;
  v.y = stop.y;
  world.villagers.push(v);
}

/** Is his ground shallow — i.e. did you dig a shortcut to him?
 *
 *  Depth is distance from your nearest shaft (world.ts), so sinking one above
 *  his chamber makes his neighbourhood ordinary. Nothing stops you and nothing
 *  moves him; this is only here so he can have an opinion about it (ROADMAP
 *  §"Digging a shortcut to the hermit"). */
export function moleGroundShallow(world: WorldState): boolean {
  return depthAt(world, ...chamberXY(world)) < SHORTCUT_DEPTH;
}

/** Under this, his ground is somewhere you can pop to. Deliberately generous:
 *  the joke is that a road went in, not that you got marginally closer. */
const SHORTCUT_DEPTH = 12;

function chamberXY(world: WorldState): [number, number] {
  const c = warrenChamber(world.seed);
  return [c.x, c.y];
}

// --- What he does while you're out --------------------------------------------

/** How far he'll take your tunnel in one absence. Three tiles: visible when you
 *  come back, and nowhere near the distance you'd have covered yourself. He is
 *  being helpful, not doing it for you. */
const DIG_REACH = 3;

/** The cell he starts from: the deepest thing you have cut. That is where you
 *  were working, so continuing it is continuing your sentence rather than
 *  starting one of his own somewhere you'd never find. */
function deepestCut(world: WorldState): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDepth = -1;
  for (const [key, id] of Object.entries(world.under)) {
    if (id !== CAVE_FLOOR) continue;
    const at = parseTileKey(key);
    if (!at) continue;
    const d = depthAt(world, at.x, at.y);
    if (d > bestDepth) {
      bestDepth = d;
      best = at;
    }
  }
  return best;
}

/** Which way "onward" is from a cell: away from the nearest shaft, along
 *  whichever axis it is further out on. A tunnel is a line of cells, so the
 *  dominant axis is nearly always the one you were actually digging along. */
function onward(world: WorldState, x: number, y: number): { dx: number; dy: number } | null {
  let near: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const s of shafts(world)) {
    const d = Math.max(Math.abs(x - s.x), Math.abs(y - s.y));
    if (d < bestD) {
      bestD = d;
      near = s;
    }
  }
  if (!near) return null;
  const dx = x - near.x;
  const dy = y - near.y;
  if (dx === 0 && dy === 0) return null;
  return Math.abs(dx) >= Math.abs(dy)
    ? { dx: Math.sign(dx) || 1, dy: 0 }
    : { dx: 0, dy: Math.sign(dy) || 1 };
}

/** Extend the player's tunnel. Returns how many cells he actually opened.
 *
 *  It obeys the away rules by construction (away.ts's header): carving only
 *  ever turns rock into floor, so it cannot destroy anything, and it cannot
 *  take a vein either — `carve` refuses ore, which means he walks past the ore
 *  and leaves it for you. Nothing asks you to come and look. */
export function moleDigs(world: WorldState): number {
  const from = deepestCut(world);
  if (!from) return 0;
  const dir = onward(world, from.x, from.y);
  if (!dir) return 0;

  let cut = 0;
  for (let i = 1; i <= DIG_REACH; i++) {
    const x = from.x + dir.dx * i;
    const y = from.y + dir.dy * i;
    if (tileAt(world, x, y, "under") === CAVE_FLOOR) continue; // already open; walk on
    if (!canCarve(world, x, y)) break; // a vein, and it stays a vein
    carve(world, x, y);
    cut++;
  }
  return cut;
}

/** The postcard line, in his voice: no greeting, no explanation, and no request
 *  that you do anything about it. */
export function moleDigLine(rng: Rng, cells: number): string {
  return rng.pick([
    `Your tunnel is ${cells} longer. It was going that way anyway.`,
    "Somebody continued your tunnel. Straightened a bit of it, too.",
    "The face you left off at has moved. Nobody says by whom.",
    `${cells} more of tunnel, cut neatly, and no note.`,
  ]);
}
