// Villagers: entities that walk a daily schedule and remember. Movement is a
// simple amble toward wherever their DAILY routine says they should be at the
// current wall-clock hour (see content/cast.ts scheduledStop), smooth per-tick
// so the town feels alive while you're around.
//
// Because position is derived from the clock rather than accumulated, absence
// needs no catch-up: return after two days and everyone simply walks to their
// correct post for this hour. The living-world story for time away is carried
// by crops and the away simulation (sim/away.ts), not by replaying footsteps.

import type { Villager, WorldState } from "./types";
import type { CharDef, CharId } from "../content/cast";
import { charDef, scheduledStop } from "../content/cast";
import { remember } from "./memory";
import type { MemoryLog } from "./memory";
import { findPath } from "./path";
import type { Point } from "./path";
import { buildRevision } from "./structures";
import { stopTarget } from "./housing";
import { followTarget, isCompanion } from "./company";

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
    // No bed yet — there may not be a world to hold one. The town hands out its
    // authored beds after it is stamped (housing.ts settleResidents), which is
    // also what moves everyone off this fallback position and into their homes.
    homeBed: null,
  };
}

// --- Routes -------------------------------------------------------------------
// A villager's TARGET stays derived from the clock; only the ROUTE to it is
// stateful. That distinction is what preserves the property this file was built
// around — come back after two days and everyone is walking to their correct
// post for this hour, with no footsteps to replay.
//
// So routes live in a WeakMap keyed by world, never on the Villager itself: they
// are a cache, not state, and putting them in the save would mean migrating a
// half-walked path across a schema change for no reason. Same pattern as the
// build revision counter and the rooms index. A discarded world drops its routes
// for free.

interface Route {
  /** Remaining waypoints, nearest first. */
  legs: Point[];
  /** The stop this route was computed for, so a schedule change invalidates it. */
  goalX: number;
  goalY: number;
  /** The build revision it was computed against — a wall going up mid-walk has
   *  to re-route rather than march through the new doorway's frame. */
  rev: number;
}

const routes = new WeakMap<WorldState, Map<CharId, Route>>();

function routeFor(world: WorldState, id: CharId): Route | undefined {
  return routes.get(world)?.get(id);
}

function setRoute(world: WorldState, id: CharId, route: Route | null): void {
  let table = routes.get(world);
  if (!table) {
    table = new Map();
    routes.set(world, table);
  }
  if (route) table.set(id, route);
  else table.delete(id);
}

/** Advance one villager by dt seconds toward wherever its DAILY routine says it
 *  should be at `now` (see scheduledStop), walking around walls and furniture
 *  rather than through them.
 *
 *  When no route exists within the pathfinder's budget — sealed in, home
 *  demolished, door bricked up while they were out — the villager SNAPS to the
 *  stop instead of grinding against a wall forever. That looks like cheating and
 *  isn't: off-screen it's invisible, and it's what keeps "come back and everyone
 *  is at their correct post" true no matter what you did to the town while they
 *  weren't looking. A villager stuck on the wrong side of a wall for a day is a
 *  worse lie than one who got home somehow. */
export function tickVillager(world: WorldState, v: Villager, dt: number, now: number): void {
  const def = charDef(v);

  // Company comes before the routine, and before the `fixed` early return.
  //
  // Before the routine, because that is what company IS: for as long as they are
  // with you their day is you, and the clock takes it back the moment it ends
  // (sim/company.ts `dayOver`). Nothing is stored about the interruption — drop
  // the slot and the very next tick walks them to their correct post for this
  // hour, which is the property this whole file is built around.
  //
  // Before the `fixed` check, because the one institution who can be asked is
  // the Dog Thing, and `fixed` is what keeps the Office Creature at his desk. He
  // walks a real round already; the flag says "no bed, no ring of their own",
  // not "cannot move".
  const follow = followTarget(world, v);
  if (follow) {
    walkToward(world, v, follow, dt);
    return;
  }
  if (isCompanion(world, v.id)) return; // with you and close enough: stand here

  if (def.fixed || def.schedule.length === 0) return;

  // Resolved, not read: a "home" stop is a question about where their bed is
  // right now, and the player may have moved it since the last tick.
  walkToward(world, v, stopTarget(world, v, now), dt);
}

/** Route to a goal and walk `dt` seconds of it, snapping there if there is no
 *  way through. Shared by the routine and by company, which is the point of it
 *  existing: a companion who pathed differently from a villager on her way home
 *  would be a second walker to keep in step with the first, and they would drift
 *  the first time a wall went up. */
function walkToward(world: WorldState, v: Villager, goal: Point, dt: number): void {
  if (Math.hypot(goal.x - v.x, goal.y - v.y) <= 0.05) {
    v.x = goal.x;
    v.y = goal.y;
    setRoute(world, v.id, null);
    return; // arrived; stand here until the hour rolls over
  }

  const rev = buildRevision(world);
  let route = routeFor(world, v.id);
  if (!route || route.goalX !== goal.x || route.goalY !== goal.y || route.rev !== rev) {
    const legs = findPath(world, v, goal);
    if (legs === null) {
      // Nowhere to walk. Be where you're supposed to be.
      v.x = goal.x;
      v.y = goal.y;
      setRoute(world, v.id, null);
      return;
    }
    route = { legs, goalX: goal.x, goalY: goal.y, rev };
    setRoute(world, v.id, route);
  }

  // Walk the remaining budget along the route, consuming waypoints as we reach
  // them — a slow tick shouldn't cost a villager a corner and let them clip it.
  let budget = WALK_SPEED * dt;
  while (budget > 0 && route.legs.length > 0) {
    const leg = route.legs[0];
    const dx = leg.x - v.x;
    const dy = leg.y - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1e-6) {
      route.legs.shift();
      continue;
    }
    const step = Math.min(dist, budget);
    v.x += (dx / dist) * step;
    v.y += (dy / dist) * step;
    if (Math.abs(dx) > 0.01) v.facing = dx >= 0 ? 1 : -1;
    budget -= step;
    if (step >= dist - 1e-6) route.legs.shift();
  }

  if (route.legs.length === 0) setRoute(world, v.id, null);
}

/** What a villager is nominally up to right now — the routine's own label. */
export function currentActivity(v: Villager, now: number): string | undefined {
  return scheduledStop(charDef(v), now).doing;
}
