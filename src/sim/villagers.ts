// Villagers: entities that walk a daily schedule and remember. Movement is a
// simple amble toward the current schedule stop, then a dwell, then the next —
// smooth per-tick so the town feels alive while you're around. Their walking
// isn't simulated while you're away (they just resume where they stand); the
// living-world illusion for absence is carried by crops + the postcard, not by
// replaying NPC footsteps.

import type { Villager } from "./types";
import type { CharDef } from "../content/cast";
import { CAST } from "../content/cast";
import { remember } from "./memory";
import type { MemoryLog } from "./memory";

const WALK_SPEED = 2.2; // tiles / second

/** Build a villager from a cast definition. `memorySeed` lets a Meadow import
 *  hand in raising-history memories; without it the villager just remembers
 *  arriving. */
export function makeVillager(def: CharDef, now: number, memorySeed: MemoryLog = []): Villager {
  let memory: MemoryLog = [...memorySeed];
  memory = remember(memory, { kind: "arrived", at: now });
  return {
    id: def.id,
    form: def.form,
    name: def.name,
    fixed: def.fixed,
    x: def.home.x,
    y: def.home.y,
    facing: 1,
    stop: 0,
    dwell: def.schedule[0]?.dwell ?? 999,
    friendship: 0,
    memory,
    lastLine: "",
  };
}

/** Advance one villager by dt seconds along its schedule. */
export function tickVillager(v: Villager, dt: number): void {
  const def = CAST[v.id];
  if (!def || def.fixed || def.schedule.length === 0) return;

  const stop = def.schedule[v.stop % def.schedule.length];
  const dx = stop.x - v.x;
  const dy = stop.y - v.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0.05) {
    const step = Math.min(dist, WALK_SPEED * dt);
    v.x += (dx / dist) * step;
    v.y += (dy / dist) * step;
    if (Math.abs(dx) > 0.01) v.facing = dx >= 0 ? 1 : -1;
  } else {
    // Arrived — dwell, then move on.
    v.x = stop.x;
    v.y = stop.y;
    v.dwell -= dt;
    if (v.dwell <= 0) {
      v.stop = (v.stop + 1) % def.schedule.length;
      v.dwell = def.schedule[v.stop].dwell;
    }
  }
}

/** Friendship grows a little each meaningful interaction (a chat, a shared
 *  task). Capped; the milestone thresholds are future work (heart events). */
export function befriend(v: Villager, amount = 1): void {
  v.friendship = Math.min(100, v.friendship + amount);
}
