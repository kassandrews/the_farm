// The Stray Cosmos — the one visitor, as opposed to the one hermit.
//
// DESIGN §"secret forms stay secret in spirit" gives her two words: rare
// celestial event visitor, NOT a resident. So she is the only person in the game
// whose existence is a question about the real calendar, and content/showers.ts
// answers it with the real peak nights of five real meteor showers.
//
// She is met the way the Mole is met — by being near her, with nothing
// announcing it — and once met she stays in `world.villagers` forever, exactly
// like him. What makes her a visitor rather than a resident is not that she is
// removed and re-added; it is `present` (sim/presence.ts). Removing her would
// throw away the friendship and the memories of every previous year, which is
// the opposite of what a returning visitor is for: the whole payoff of the
// second August is that she has met you before.

import type { WorldState, Villager } from "./types";
import type { ShowerDef } from "../content/showers";
import { SHOWERS } from "../content/showers";
import { COSMOS } from "../content/cast";
import { makeVillager } from "./villagers";
import { stopTarget } from "./housing";
import { isNight, skyPhaseAt } from "./time";

/** Before this hour, you are still in yesterday's night.
 *
 *  A shower's peak is a NIGHT, not a date, and a night crosses midnight. Two in
 *  the morning on the thirteenth of August is the twelfth's shower to everyone
 *  standing outside in it, and a calendar lookup that disagrees would make her
 *  vanish at midnight in front of you. Set to the hour `isNight` stops being
 *  true (time.ts, dawn ends at 7), so "the night is over" means one thing. */
const NIGHT_ROLLOVER_HOUR = 7;

/** Which shower is on tonight, or null. A total function of the instant —
 *  nothing stored, nothing scheduled, the festivals' own trick.
 *
 *  Exported because presence, dialogue and the tests all ask it; it is the one
 *  fact about her that everything else is derived from. */
export function showerTonight(now: number): ShowerDef | null {
  const d = new Date(now);
  // Roll back into the evening this night began in. Done by subtracting from
  // the timestamp rather than by decrementing the date, so month ends, year
  // ends and leap days are the platform's problem and not ours — the third of
  // January at 01:00 is the second's night, and the Quadrantids are not on.
  if (d.getHours() < NIGHT_ROLLOVER_HOUR) d.setTime(d.getTime() - NIGHT_ROLLOVER_HOUR * 3600_000);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return SHOWERS.find((s) => s.month === month && s.day === day) ?? null;
}

/** Have you met her? She is in the villager list or she isn't — no flag, the
 *  same answer `moleMet` gives, for the same reason: a flag would be the fact
 *  written twice. */
export function cosmosMet(world: WorldState): boolean {
  return world.villagers.some((v) => v.id === "cosmos");
}

export function cosmos(world: WorldState): Villager | undefined {
  return world.villagers.find((v) => v.id === "cosmos");
}

/** How close you have to be. Generous compared to the Mole's four — his chamber
 *  is a room you are standing inside and this is your own back garden in the
 *  dark, where "near enough to notice somebody" is further than arm's reach. */
const MEET_RADIUS = 8;

/** Called every tick. Puts her on the homestead on a shower night, the first
 *  time you are out there to see it, and says nothing whatsoever about it.
 *
 *  The guard is `present`'s own condition rather than a second copy of it —
 *  night, and a shower — because meeting somebody who is not here would be a
 *  villager appearing in your save on an afternoon in March. */
export function meetCosmos(world: WorldState, now: number): void {
  if (world.player.layer !== "surface" || cosmosMet(world)) return;
  if (!isNight(skyPhaseAt(now)) || !showerTonight(now)) return;

  // Where she'd stand, asked before she exists — the same anchor resolution
  // that will answer it every frame afterwards, so she cannot appear in one
  // place and then step to another.
  const v = makeVillager(COSMOS, now);
  const stop = stopTarget(world, v, now);
  if (Math.hypot(world.player.x - stop.x, world.player.y - stop.y) > MEET_RADIUS) return;
  v.x = stop.x;
  v.y = stop.y;
  world.villagers.push(v);
}
