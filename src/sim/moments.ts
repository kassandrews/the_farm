// Moments (DESIGN §Moments).
//
// The game notices that the world is in a nice shape, and if somebody happened
// to be standing next to you it becomes something you both remember. That is the
// entire feature. There is no Moments panel, no list, no total, no toast, and
// nothing in the game reads a Moment to decide anything.
//
// TWO RECORDS, AND WHICH ONES YOU GET DEPENDS ON WHO WAS THERE.
//
//   • The journal half is yours and fires whether or not anybody came. It is an
//     ordinary `noticed` row in sim/notebook.ts, and for two of the three
//     Moments here THE ROW ALREADY EXISTED — `a-busy-sky` recorded the meteor
//     shower and `far-out` recorded the edge of the survey long before this file
//     did. Nothing needed adding for those, which is the strongest evidence the
//     shape is right: a Moment is not a new thing that happened, it is a SECOND
//     RECORD of something the game already knew about.
//   • The memory half is somebody else's, and it exists only because they were
//     there. If you are alone, nothing here writes anything, and that is not a
//     failure state — it is the night you had.
//
// The journal half never waits on company, and that is load-bearing rather than
// generous: if solitude were the only route to a journal entry, the optimal play
// would be to walk away from people before anything nice happened, which inverts
// the whole section.
//
// WHY THIS DOES NOT CALL `witness`. It is nearly the right function — it walks
// the villagers, checks presence, and writes a memory to whoever was near you —
// but it also calls `befriend`, because on the Farm friendship grows out of
// doing jobs where somebody can see you. A Moment is not a job. Nobody has done
// anything; the sky is doing it.
//
// And it could not call it even if the tone allowed: these predicates are
// evaluated on a REPEATING SWEEP rather than at the instant of an action, so a
// Moment routed through `witness` would pay friendship again every half second
// for as long as the condition stayed true — stand still under a meteor shower
// and a companion would peg at maximum in under a minute. `remember` is
// idempotent for the one-shots and additive for the rest, so the sweep is safe;
// `befriend` is neither.
//
// TRIGGERS ARE UNSTATED. Nothing announces what qualifies and no UI hints at
// one, because a surfaced condition is an objective the moment players work it
// out. Two of the three are gated by things nobody can schedule — five real
// nights a year, and the actual distance to the edge of the arranged world — and
// the third is a season.

import type { WorldState, Villager } from "./types";
import type { MemoryKind } from "./memory";
import { remember } from "./memory";
import { present } from "./presence";
import { showerTonight } from "../content/showers";
import { skyPhaseAt, isNight } from "./time";
import { roofRoomAt } from "./rooms";
import { seasonAt } from "./seasons";
import { FAR_OUT, outFrom } from "./notebook";

/** How close somebody has to be to have been there with you.
 *
 *  The same four tiles `witness` uses for standing-there-ness (`TOGETHER_RADIUS`
 *  in sim/game.ts), duplicated as a constant here rather than exported from
 *  there because it is answering a different question that happens to have the
 *  same answer: that one is "close enough to have watched you work", this one is
 *  "close enough to have been keeping you company". If either ever wants to move
 *  it should be able to move alone. */
const BESIDE_YOU = 4;

/** A configuration worth remembering.
 *
 *  `value` is what the memory carries into the dialogue template — the shower's
 *  own name, for the one that has a name. Returning it from the predicate rather
 *  than storing it keeps the rule that nothing about a Moment is scheduled: the
 *  night knows which night it is, because the calendar does. */
export interface MomentDef {
  kind: MemoryKind;
  when: (world: WorldState, now: number) => boolean;
  value?: (world: WorldState, now: number) => string | undefined;
}

/** Is the player outdoors under the actual sky? Not merely on the surface —
 *  a roof over your head is the difference between seeing the night and being
 *  in a room. Same test `a-busy-sky` makes in sim/notebook.ts and for the same
 *  reason: a memory of a sky you could not see would be the log inventing a
 *  view. */
function underTheSky(world: WorldState): boolean {
  if (world.player.layer !== "surface") return false;
  return roofRoomAt(world, Math.round(world.player.x), Math.round(world.player.y)) === null;
}

export const MOMENTS: MomentDef[] = [
  // A meteor shower the two of you were outside for. Five nights a year, on the
  // real dates (content/showers.ts), so this is unfarmable in the strictest
  // sense available: the condition is the calendar, and nobody can move the
  // twelfth of August.
  //
  // Not gated on a CROWD, though the design sketch said "with a crowd in the
  // plaza". The town's fixed cast stand at their posts around the clock and
  // everybody else is asleep in a bed they own, so a plaza holding two waking
  // villagers at two in the morning is not a thing this game produces — a crowd
  // clause would have been a condition that reads beautifully and never fires
  // once. Whoever is beside you is who was there, and on most of these nights
  // that will be somebody you deliberately brought.
  {
    kind: "shower",
    when: (w, now) => underTheSky(w) && isNight(skyPhaseAt(now)) && showerTonight(now) !== null,
    value: (_w, now) => showerTonight(now)?.name,
  },
  // The day you took somebody past where the survey stops. `FAR_OUT` is
  // sim/notebook.ts's radius, imported rather than restated, because the field
  // note and the Moment are two records of one walk.
  //
  // No companion check: bringing somebody is how anybody gets out here beside
  // you, so the presence test below IS the companion test, and writing a second
  // one would only add a way for the two to disagree.
  {
    kind: "far_out",
    when: (w) => w.player.layer === "surface" && outFrom(w) > FAR_OUT,
  },
  // Winter, out in it. The one Moment whose journal half had to be written
  // (`the-cold-came`), and the one that is not rare — it comes round every year
  // for everybody, which is why it sits at the bottom of `MEMORY_PRIORITY`. What
  // makes it worth keeping is that it is the only Moment you can have without
  // going anywhere: the year turns, you are both outside, and that is it.
  //
  // NOT in `oneShot` (see sim/memory.ts): winter is a different winter each
  // time, the same way a festival is a different night each time.
  {
    kind: "winter_came",
    when: (w, now) => underTheSky(w) && seasonAt(now).id === "winter",
    value: (_w, now) => String(new Date(now).getFullYear()),
  },
];

/** Everyone who was standing with you, and who is actually here to be standing
 *  anywhere (sim/presence.ts — the Ghost is not in her grove at noon, so she
 *  cannot have watched anything with you at noon). */
function beside(world: WorldState, now: number): Villager[] {
  const p = world.player;
  return world.villagers.filter(
    (v) =>
      present(v, now) &&
      (v.layer ?? "surface") === p.layer &&
      Math.hypot(v.x - p.x, v.y - p.y) <= BESIDE_YOU,
  );
}

/** Has this person already got this exact Moment?
 *
 *  THE SWEEP IS WHY THIS EXISTS, and it is the one piece of bookkeeping a Moment
 *  genuinely needs. `remember` de-duplicates by KIND, but only for the one-shots
 *  — `shower` and `winter_came` are deliberately not on that list, because each
 *  night and each year is its own (the argument `festival` makes in
 *  sim/memory.ts). Every other repeatable memory in the game is written once, at
 *  the instant of an action; these are written by a predicate that stays true for
 *  hours. Without this check a single shower would append a memory twice a
 *  second and push a villager's entire life out of the 64-entry ring inside a
 *  minute.
 *
 *  So the de-duplication is by kind AND value: two different showers are two
 *  memories, the same shower is one, and the log means what it says. Same
 *  idempotence `observe` keeps for the journal, for the same reason — the check
 *  belongs to the log rather than to the caller. */
function already(v: Villager, kind: MemoryKind, value: string | undefined): boolean {
  return v.memory.some((m) => m.kind === kind && m.value === value);
}

/** Walk the Moments and write whatever is true right now into the logs of
 *  whoever is here for it.
 *
 *  Returns nothing. This is the whole difference between a Moment and a find:
 *  `sweepNoticed` returns its lines so the caller can say them, because writing
 *  something in your own journal is a thing you did. A Moment is not announced,
 *  is not toasted, and produces no line at the moment it happens — it turns up
 *  later, obliquely, when somebody who was there brings it up (sim/dialogue.ts).
 *
 *  Cheap enough for the coarse sweep it rides on: three predicates asking about
 *  the clock, the calendar and where you are standing, and a villager walk that
 *  only runs when one of them is true. Almost every call does nothing at all,
 *  which is correct — most evenings are just evenings. */
export function sweepMoments(world: WorldState, now: number): void {
  for (const def of MOMENTS) {
    if (!def.when(world, now)) continue;
    const value = def.value?.(world, now);
    for (const v of beside(world, now)) {
      if (already(v, def.kind, value)) continue;
      v.memory = remember(v.memory, { kind: def.kind, at: now, value });
    }
  }
}
