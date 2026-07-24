// Villagers: entities that walk a daily schedule and remember. Movement is a
// simple amble toward wherever their DAILY routine says they should be at the
// current wall-clock hour (see content/cast.ts scheduledStop), smooth per-tick
// so the town feels alive while you're around.
//
// Because position is derived from the clock rather than accumulated, absence
// needs no catch-up: return after two days and everyone simply walks to their
// correct post for this hour. The living-world story for time away is carried
// by crops and the away simulation (sim/away.ts), not by replaying footsteps.

import type { Villager } from "./types";
import type { CharDef } from "../content/cast";
import { CAST, scheduledStop } from "../content/cast";
import { remember } from "./memory";
import type { MemoryLog } from "./memory";

const WALK_SPEED = 2.2; // tiles / second

/** Build a villager from a cast definition. `memorySeed` lets a Meadow import
 *  hand in raising-history memories; without it the villager just remembers
 *  arriving. Starts wherever its routine says it should be right now, so a new
 *  town at 9pm doesn't begin with everyone standing in the wrong place. */
export function makeVillager(def: CharDef, now: number, memorySeed: MemoryLog = []): Villager {
  let memory: MemoryLog = [...memorySeed];
  memory = remember(memory, { kind: "arrived", at: now });
  const stop = scheduledStop(def, now);
  return {
    id: def.id,
    form: def.form,
    name: def.name,
    fixed: def.fixed,
    x: stop.x,
    y: stop.y,
    facing: 1,
    friendship: 0,
    memory,
    lastLine: "",
  };
}

/** Advance one villager by dt seconds toward wherever its DAILY routine says it
 *  should be at `now` (see scheduledStop). Nothing accumulates between ticks,
 *  so coming back after two days away simply finds everyone walking to their
 *  correct afternoon posts rather than replaying two days of footsteps. */
export function tickVillager(v: Villager, dt: number, now: number): void {
  const def = CAST[v.id];
  if (!def || def.fixed || def.schedule.length === 0) return;

  const stop = scheduledStop(def, now);
  const dx = stop.x - v.x;
  const dy = stop.y - v.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.05) {
    v.x = stop.x;
    v.y = stop.y;
    return; // arrived; stand here until the hour rolls over
  }
  const step = Math.min(dist, WALK_SPEED * dt);
  v.x += (dx / dist) * step;
  v.y += (dy / dist) * step;
  if (Math.abs(dx) > 0.01) v.facing = dx >= 0 ? 1 : -1;
}

/** What a villager is nominally up to right now — the routine's own label. */
export function currentActivity(v: Villager, now: number): string | undefined {
  const def = CAST[v.id];
  return def ? scheduledStop(def, now).doing : undefined;
}

/** Friendship grows a little each meaningful interaction — a chat, or a job
 *  done within sight of them (DESIGN §"Company": friendship grows through doing
 *  things together, not only through gifts). */
export function befriend(v: Villager, amount = 1): void {
  v.friendship = Math.min(100, v.friendship + amount);
}

// --- Milestones ---------------------------------------------------------------
// Stardew's heart milestones, minus the hearts: the ONLY way a tier is ever
// revealed is by how a villager talks to you (see sim/dialogue.ts). There is no
// meter, no percentage, no "3/10 hearts" anywhere in the UI — you notice that
// someone has warmed up, which is the whole feeling we're after.

export type FriendshipTier = "new" | "familiar" | "friend" | "close";

const TIER_THRESHOLDS: [FriendshipTier, number][] = [
  ["close", 60],
  ["friend", 30],
  ["familiar", 10],
];

export function friendshipTier(v: Villager): FriendshipTier {
  for (const [tier, min] of TIER_THRESHOLDS) if (v.friendship >= min) return tier;
  return "new";
}

/** True once the villager is at least as warm as `tier`. */
export function atLeast(v: Villager, tier: FriendshipTier): boolean {
  const order: FriendshipTier[] = ["new", "familiar", "friend", "close"];
  return order.indexOf(friendshipTier(v)) >= order.indexOf(tier);
}
