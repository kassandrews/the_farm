// The Quiet Ghost — the second person the town has never heard of, and the one
// who was half-built for two phases without anybody noticing.
//
// The renderer has skipped ghost-form villagers by daylight since long before
// there was a ghost to skip, and `TASTES.ghost` has wanted dark walnut for just
// as long. What was missing was somewhere for her to be. She has one now: the
// grove (sim/world.ts), forty-odd tiles out, generated from the seed like the
// Mole's warren, standing in the dark wood that her hint in content/skins.ts has
// been pointing at since before commissions existed.
//
// SHE GIVES YOU NOTHING, and that is the design. Walnut comes off the trees
// (sim/gather.ts), so the finish is the PLACE paying out and she is the person
// who happens to live there. The rejected alternative was an arrival row — house
// the Ghost, receive the dark wood — and it fails on the one rule that matters
// here: a Ghost who moves in one afternoon and gets commissioned a house like
// anybody else is not a secret, she is a resident with a theme.

import type { WorldState, Villager } from "./types";
import { GHOST } from "../content/cast";
import { makeVillager } from "./villagers";
import { stopTarget } from "./housing";
import { groveCentre } from "./world";
import { isNight, skyPhaseAt } from "./time";

/** How close you have to get. The grove's own clearing, near enough — you are
 *  standing in the middle of her trees, not squinting at one from the edge. */
const MEET_RADIUS = 4;

/** Have you met her? In the villager list or not, like the Mole. */
export function ghostMet(world: WorldState): boolean {
  return world.villagers.some((v) => v.id === "ghost");
}

export function ghost(world: WorldState): Villager | undefined {
  return world.villagers.find((v) => v.id === "ghost");
}

/** Called every tick. Appends her the first time you stand in the grove after
 *  dark, silently — no toast, no fanfare, nothing that says you have discovered
 *  anything. You walked into a clearing and somebody was in it.
 *
 *  The night check is not decoration. Standing in the grove at noon must not
 *  put her in your save, or she would be there in the daylight, unseeable and
 *  (before `present`) tappable. Meeting her IS meeting her at night; there is
 *  no other kind. */
export function meetGhost(world: WorldState, now: number): void {
  if (world.player.layer !== "surface" || ghostMet(world)) return;
  if (!isNight(skyPhaseAt(now))) return;
  const centre = groveCentre(world.seed, world.homestead.spot);
  if (Math.hypot(world.player.x - centre.x, world.player.y - centre.y) > MEET_RADIUS) return;

  const v = makeVillager(GHOST, now);
  const stop = stopTarget(world, v, now);
  v.x = stop.x;
  v.y = stop.y;
  world.villagers.push(v);
}

/** Have you taken the dark wood?
 *
 *  Read off the LIVE world rather than off a memory, the same call the Mole's
 *  shallow-ground bank makes and Margfrom's dissent makes. It is what her second
 *  dialogue bank turns on: she has an opinion about the felling, and the opinion
 *  is not a rule — nothing stops you, nothing regrows differently, and she does
 *  not leave. (The trees do come back, on the ordinary eight hours; the finish
 *  does not un-unlock, so this stays true forever once it's true.) */
export function groveCut(world: WorldState): boolean {
  return world.skins.unlocked.includes("walnut");
}
