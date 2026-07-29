// Is this villager HERE right now?
//
// For everybody in the town the answer is yes, always, and that is why this
// question did not exist until Phase 4c. A villager is somewhere on the map at
// every hour of every day; where they are is a schedule question (content/cast)
// and being there is not in doubt.
//
// The secrets broke that. The Quiet Ghost is only there at night and the Stray
// Cosmos only on five nights a year — DESIGN §"secret forms stay secret in
// spirit" — and "only there sometimes" is a different fact from "standing
// somewhere else", because there is nowhere else for either of them to be.
//
// WHY THIS IS A SIM MODULE AND NOT A RENDERER FLAG. The renderer already knew
// half of it: `collectMovers` has skipped ghost-form villagers by daylight since
// before any ghost existed. But drawing is not the only thing that asks. The
// UI's tap targeting and its keyboard talk both find the nearest villager, and
// both filtered on layer alone — so a Ghost in the villager list would have been
// TAPPABLE AT NOON, invisible, in an empty grove. `witness` is the same shape:
// somebody who is not here cannot have seen you do anything.
//
// One predicate, four callers, and the renderer is now the one that agrees with
// the rest rather than the one that knows.

import type { Villager } from "./types";
import { isNight, skyPhaseAt } from "./time";
import { showerTonight } from "./cosmos";

/** Is this villager present in the world at this instant?
 *
 *  Total and cheap — it is asked once per villager per frame. Everyone the town
 *  knows about answers `true` unconditionally; only the secrets have an hour.
 *
 *  Note this says nothing about whether you have MET them. Having met somebody
 *  is "are they in `world.villagers`" (sim/mole.ts) and stays that way; this is
 *  the second question, asked of somebody already in the list. */
export function present(v: Villager, now: number): boolean {
  switch (v.id) {
    // Night, in the sense the ground already uses — `isNight` counts dawn, so
    // she is there from dusk's end until the sun is properly up. Deliberately
    // the same call the renderer was already making: her disappearing and the
    // grass going dark are one fact about the hour, not two.
    case "ghost":
      return isNight(skyPhaseAt(now));
    // Night AND a real meteor shower. Both, because a visitor who turned up at
    // two in the afternoon on the twelfth of August would be a calendar event
    // wearing a costume.
    case "cosmos":
      return isNight(skyPhaseAt(now)) && showerTonight(now) !== null;
    default:
      return true;
  }
}
