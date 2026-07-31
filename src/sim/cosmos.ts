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
import { showerTonight } from "../content/showers";
import { COSMOS } from "../content/cast";
import { makeVillager } from "./villagers";
import { stopTarget, cosmosVisiting } from "./housing";

/** Which shower is on tonight — re-exported from the table it reads.
 *
 *  It used to be defined here. It moved to content/showers.ts when the sky
 *  arrived, because sim/housing.ts needs it to place her and this file needs
 *  housing.ts to place her on the ground; the two would have imported each
 *  other. Re-exported rather than repointed at every call site, because "ask
 *  cosmos.ts what the sky is doing tonight" is still the sentence the rest of the
 *  sim wants to write. */
export { showerTonight };

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
  if (cosmosMet(world)) return;
  // TWO DOORS NOW, and they are the same door (Phase 7c). Down here she has to
  // be here — night, and a shower — because meeting somebody who is not here
  // would be a villager appearing in your save on an afternoon in March. Up
  // there the condition is that you are up there: she is at home, and home is
  // where she is on every day that is not one of the five.
  //
  // Which means the sky can be where you meet her FIRST, having never seen a
  // meteor shower. That is the right way round: you walked two hundred tiles,
  // found a staircase that goes somewhere, climbed it and knocked on a door.
  // The five nights are then a person you know coming to visit.
  const inSky = world.player.layer === "sky";
  if (!inSky) {
    if (world.player.layer !== "surface") return;
    if (!cosmosVisiting(now)) return;
  }

  // Where she'd stand, asked before she exists — the same anchor resolution
  // that will answer it every frame afterwards, so she cannot appear in one
  // place and then step to another.
  const v = makeVillager(COSMOS, now);
  const stop = stopTarget(world, v, now);
  if (Math.hypot(world.player.x - stop.x, world.player.y - stop.y) > MEET_RADIUS) return;
  v.x = stop.x;
  v.y = stop.y;
  if (inSky) v.layer = "sky";
  world.villagers.push(v);
}

/** Called every tick once she exists: keep her where the calendar says she is.
 *
 *  ONE SIDRA, IN ONE PLACE (DESIGN §The sky). `stopTarget` already answers WHERE
 *  through the "skyhome" anchor; this is the other half of the same fact, which
 *  is WHICH LAYER, and it has to be applied rather than derived because a
 *  villager's layer is a stored field that the renderer and the tap targeting
 *  both read.
 *
 *  SHE IS MOVED RATHER THAN WALKED, which is true to what she is: the visitor
 *  does not travel down from the sky at dusk on the twelfth of August and hike
 *  back up at dawn. She is somewhere, and then she is somewhere else. Nothing
 *  else in the game gets to do that, and nothing else in the game is passing
 *  through.
 *
 *  It is deliberately not conditional on the player noticing. She is at home on
 *  a Tuesday whether or not anybody has ever climbed the stairs, which is the
 *  difference between a place somebody lives and a scene that plays when you
 *  arrive. */
export function updateCosmos(world: WorldState, now: number): void {
  const v = cosmos(world);
  if (!v) return;
  const stop = stopTarget(world, v, now);
  // The same predicate the anchor is resolved with, not a second copy of it: her
  // layer and her coordinates are one fact and are answered once (§cosmosVisiting).
  v.layer = cosmosVisiting(now) ? "surface" : "sky";
  v.x = stop.x;
  v.y = stop.y;
  // A companion is a different matter, but she can never be one: she is a secret
  // and secrets are refused by `canInvite` (sim/company.ts), so there is no state
  // here that this could stamp on.
}
