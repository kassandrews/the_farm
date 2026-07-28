// Where a villager lives — resolved, never authored.
//
// The verb is "give them a home", not "build them a house" (DESIGN §"what none
// of them have", ROADMAP §Housing). A home is any room that qualifies, so the
// game must be able to answer "where is home" for a villager whose bed the
// player moved across the room, moved into a house they built themselves, or
// took apart for the six wood. A coordinate in a content table can't answer
// that; only the world can.
//
// THE BED IS THE CLAIM. A villager stores the anchor key of their bed and
// nothing else — no "this room belongs to X" record, for the same reason
// furniture keeps only its anchor and no occupancy map (sim/furniture.ts): two
// records of one fact drift, and the drift surfaces as someone sleeping in a
// house that isn't there any more. Everything else is derived: their room is
// roomAt(bed), their bedtime post is a walkable cell beside it.
//
// Resolution is TOTAL. Every question here has an answer, including for a
// villager whose bed is gone — they stand in the plaza (content/cast.ts
// NO_HOME). A villager with no valid destination would be a villager the tick
// loop has to have an opinion about, and "nowhere" is not a place you can walk
// to. Homelessness is a state with an address, not an error.

import type { Villager, WorldState } from "./types";
import type { ScheduleStop } from "../content/cast";
import { charDef, scheduledStop } from "../content/cast";
import { authoredBed } from "../content/town";
import { cellsFor } from "./furniture";
import { isWalkable, tileKey, parseTileKey } from "./world";

/** Which way we look for somewhere to stand beside a bed. Orthogonals only, in
 *  the same order as sim/path.ts steps — north, east, south, west — so the
 *  choice is deterministic and a villager can't jitter between two equally good
 *  bedsides on consecutive ticks. */
const AROUND: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** The bed this villager has claimed, if it is still a bed and still there.
 *
 *  Every read re-checks the world rather than trusting the key, because the
 *  claim outlives the furniture: demolishing a bed doesn't get to reach into
 *  the villager list and tidy up after itself. A stale key is normal, expected,
 *  and means exactly one thing — they haven't got a bed. */
export function claimedBed(world: WorldState, v: Villager): { x: number; y: number } | null {
  if (!v.homeBed) return null;
  const cell = world.furniture[v.homeBed];
  if (!cell || cell.id !== "bed") return null;
  return parseTileKey(v.homeBed);
}

/** Where a villager stands to be "at home": a walkable cell beside their bed.
 *
 *  Beside, not on — a bed is solid (content/furniture.ts), so it is somewhere
 *  to sleep and not somewhere to stand. Returns null when they have no bed, or
 *  when the bed is walled in so tightly there's nowhere to stand next to it. */
export function homeStand(world: WorldState, v: Villager): { x: number; y: number } | null {
  const bed = claimedBed(world, v);
  if (!bed) return null;
  const cell = world.furniture[tileKey(bed.x, bed.y)]!;
  for (const [bx, by] of cellsFor(bed.x, bed.y, cell.id, cell.facing)) {
    for (const [dx, dy] of AROUND) {
      const x = bx + dx;
      const y = by + dy;
      // The bed's own cells fail this too — it's solid, which is the point.
      if (isWalkable(world, x, y)) return { x, y };
    }
  }
  return null;
}

/** Where a villager actually wants to be right now: their routine's stop for
 *  this hour, with any symbolic anchor resolved against the live world.
 *
 *  This is the function the tick loop asks. `scheduledStop` stays pure content
 *  — it knows the shape of a day and nothing about houses — and resolution
 *  happens here, in sim, where the world is. */
export function stopTarget(world: WorldState, v: Villager, now: number): ScheduleStop {
  // `scheduledStop` already answered the festival question, if there was one —
  // the gather is a fact about the clock and about whose day it is, so it lives
  // in content beside the routine it replaces rather than being resolved here.
  // Nothing to do in this file: a festival stop is an ordinary stop with
  // coordinates in it, and falls straight through the check below.
  const stop = scheduledStop(charDef(v), now);
  if (stop.at !== "home") return stop;
  const home = homeStand(world, v);
  if (home) return { ...stop, x: home.x, y: home.y };
  const tent = tentStand(world, v);
  return tent ? { ...stop, x: tent.x, y: tent.y } : stop; // else the fallback it carries
}

/** Where someone waiting on a commission sleeps: beside their own tent.
 *
 *  There are two ways to have no bed and they are not the same state. Someone
 *  whose bed you demolished stands in the plaza at 2am, which is the honest
 *  picture of a person with nowhere to go. Someone who arrived last week and is
 *  waiting on a house is CAMPING — they have somewhere, it's just not a house
 *  yet — and putting them in the square would read as the game losing track of
 *  a person it knows exactly where to find.
 *
 *  Read straight off `world.commissions` rather than through sim/commission.ts,
 *  which imports this module (via assign.ts) and would make a cycle. The
 *  commission is plain state in types.ts; that's the shared dependency, the
 *  same trick isWalkable uses to stay out of sim/structures.ts. */
function tentStand(world: WorldState, v: Villager): { x: number; y: number } | null {
  const c = world.commissions?.find((k) => k.id === v.id && k.stampedAt === null);
  if (!c) return null;
  // Beside the tent, not in it, for the same reason homeStand stands beside a
  // bed: you sleep in one and stand next to it.
  for (const [dx, dy] of AROUND) {
    const x = c.tent.x + dx;
    const y = c.tent.y + dy;
    if (isWalkable(world, x, y)) return { x, y };
  }
  return null;
}

/** Hand out the beds the town authored, once, at world creation.
 *
 *  Deliberately conditional on the bed EXISTING: stampBuilding refuses, all or
 *  nothing, to stamp a building over anything the player built, so a town where
 *  someone happened to build west of the plaza has no Margfrom's house and
 *  therefore no bed to claim. Claiming one anyway would point her at furniture
 *  that isn't there, which resolves to the plaza — the same outcome as claiming
 *  nothing, reached by lying first.
 *
 *  Only fills an EMPTY claim. Once a villager has a bed, this never overrides
 *  it: that's what keeps the authored table a starting condition rather than a
 *  gravitational pull that undoes the player rehousing someone. */
export function claimAuthoredBeds(world: WorldState): void {
  for (const v of world.villagers) {
    if (v.homeBed) continue;
    const bed = authoredBed(v.id);
    if (!bed) continue;
    const key = tileKey(bed.x, bed.y);
    if (world.furniture[key]?.id === "bed") v.homeBed = key;
  }
}

/** Settle everyone into the town they actually live in.
 *
 *  Called after the town is stamped, because of an ordering trap: newWorld
 *  builds its villagers BEFORE stamping the buildings, so at the moment
 *  makeVillager runs there are no beds in the world and every home stop
 *  resolves to the plaza fallback. Without this pass, every brand-new town
 *  would begin with its residents standing in the square — quietly breaking
 *  the promise makeVillager's own docblock makes, that a town created at 9pm
 *  doesn't start with everyone in the wrong place.
 *
 *  Re-seating is a hard set rather than a walk: nobody has taken a step yet,
 *  so there is no journey to interrupt. */
export function settleResidents(world: WorldState, now: number): void {
  claimAuthoredBeds(world);
  for (const v of world.villagers) {
    const stop = stopTarget(world, v, now);
    v.x = stop.x;
    v.y = stop.y;
  }
}
