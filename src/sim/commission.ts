// Commissioned housing — the flagship beat (DESIGN §"What none of them have").
//
// This module is thin on purpose. Phase 2b built the machinery: a home is any
// room that qualifies, `assign.qualify()` is the acceptance test, and
// `sim/home.ts` already turns a house into things worth saying about it. A
// commission adds the one thing none of that had — somebody ASKING — plus the
// paperwork around it.
//
// So there is no second opinion here about what a house is. `satisfied()` calls
// qualify() and then checks one extra thing at its own call site, exactly as
// assign.ts's docblock says a commission should. If the Office Creature and the
// assignment panel ever disagreed about whether a room is a home, this file
// would be why.
//
// WHAT A COMMISSION IS ALLOWED TO REQUIRE. Structure only: enclosed, a door, a
// bed, and a minimum size. Finish, furniture and space beyond the minimum are
// noticed and remembered and sometimes rewarded, and never block move-in.
// DESIGN is explicit that a full checklist turns a gift into a chore, and that
// rule is load-bearing rather than decorative — it's why this file has no
// scoring function in it at all.

import type { WorldState, Commission } from "./types";
import type { NewcomerId } from "../content/cast";
import type { ArrivalDef } from "../content/arrivals";
import { ARRIVALS, nextArrival } from "../content/arrivals";
import { qualify } from "./assign";
import type { Verdict } from "./assign";
import { claimedBed } from "./housing";
import { makeVillager } from "./villagers";
import { charDef } from "../content/cast";
import { isWalkable, tileKey } from "./world";
import type { SkinId } from "../content/skins";
import { remember } from "./memory";

/** The floor on how small a commissioned house may be, in interior cells.
 *
 *  ONE number for everyone, deliberately. It is tempting to give the Menace a
 *  bigger minimum — she has standards — but a taste expressed as a hard gate is
 *  exactly what DESIGN rules out. Her standards show up in what she SAYS about
 *  the house, which is where a personality belongs. What the form requires is
 *  the same for every resident, because a form is not a person.
 *
 *  Four is a 4x3 building: two rooms' worth of nothing, but unmistakably a
 *  house rather than a cupboard with a bed wedged in it. */
export const MIN_INTERIOR = 4;

/** How long after settling in before the first neighbour turns up, and how long
 *  between arrivals after that.
 *
 *  Real time gates the living world, never the player's hands (Design
 *  invariant), so this is wall-clock and there is nothing to grind toward. The
 *  first gap is short because it's the gap that teaches the beat exists; the
 *  rest are a day apart, so the town grows at the pace of the calendar rather
 *  than at the pace of playing. */
const FIRST_ARRIVAL_MS = 10 * 60 * 1000;
const ARRIVAL_GAP_MS = 20 * 60 * 60 * 1000;

/** Every commission ever filed, oldest first. */
export function commissions(world: WorldState): Commission[] {
  return world.commissions ?? [];
}

export function commissionFor(world: WorldState, id: NewcomerId): Commission | null {
  return commissions(world).find((c) => c.id === id) ?? null;
}

/** The one that's still waiting on a house, if any. At most one is open at a
 *  time: two people living in tents and asking simultaneously turns a gift into
 *  a queue, and the queue is the part that would feel like work. */
export function openCommission(world: WorldState): Commission | null {
  return commissions(world).find((c) => c.stampedAt === null) ?? null;
}

/** The arrival row a commission was made from. */
export function arrivalOf(c: Commission): ArrivalDef {
  return ARRIVALS[c.index];
}

// --- Arriving -----------------------------------------------------------------

/** Is somebody due to turn up?
 *
 *  Derived from the clock rather than counted down, for the reason
 *  sim/villagers.ts documents about positions: nothing here accumulates, so two
 *  days away needs no catch-up. Come back on Thursday and whoever was due has
 *  simply arrived, once, rather than four times. */
export function arrivalDue(world: WorldState, now: number): boolean {
  if (!world.flags.onboarded) return false;
  if (openCommission(world)) return false; // one at a time
  const all = commissions(world);
  if (!nextArrival(all.length)) return false; // the queue is empty
  const last = all.length === 0 ? world.createdAt : all[all.length - 1].arrivedAt;
  const gap = all.length === 0 ? FIRST_ARRIVAL_MS : ARRIVAL_GAP_MS;
  return now - last >= gap;
}

/** Let the next arrival into town: a villager, a tent, and a form to fill in.
 *
 *  The villager is an ORDINARY villager — no flag, no subtype. What makes them
 *  homeless is that `homeBed` is null, which is the same thing that makes a
 *  resident whose bed you demolished homeless, and it means every system that
 *  already handles the second one handles this for free. */
export function admitArrival(world: WorldState, now: number): Commission | null {
  const all = commissions(world);
  const index = all.length;
  const def = nextArrival(index);
  if (!def) return null;

  const id: NewcomerId = `newcomer:${index}`;
  // The id counts COMMISSIONS, and the thing it names is a VILLAGER. Those two
  // lists agreeing is an assumption rather than a guarantee, and if they ever
  // drift the town gets two people answering to one id — which does not read as
  // a duplicate, it reads as everybody sprinting, because routes are keyed by id
  // (sim/villagers.ts). Refusing here is cheaper than diagnosing that later.
  if (world.villagers.some((v) => v.id === id)) return null;
  const tent = findTentSpot(world);
  const villager = makeVillager(charDef({ id, name: def.name, form: def.form, fixed: false }), now);
  villager.x = tent.x;
  villager.y = tent.y + 1;
  world.villagers.push(villager);

  const c: Commission = { id, index, arrivedAt: now, tent, filedAt: null, stampedAt: null };
  world.commissions.push(c);
  return c;
}

/** Somewhere to pitch a tent: near the plaza, on ground nobody is using.
 *
 *  Spirals outward from just south of the plaza so the first arrival is
 *  somewhere you'll walk past, and skips anything built, planted or standing —
 *  a tent that appeared on top of your carrots would be the town taking
 *  something, and the whole point of this beat is that it asks.
 *
 *  Always returns a spot. If the search somehow finds nowhere in range it hands
 *  back the middle of the plaza, on the same principle as housing.ts's fallback:
 *  a villager with no valid position is a villager the tick loop has to have an
 *  opinion about, and "nowhere" is not a place you can walk to. */
export function findTentSpot(world: WorldState): { x: number; y: number } {
  const taken = new Set(commissions(world).map((c) => tileKey(c.tent.x, c.tent.y)));
  for (let r = 2; r <= 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only
        const x = dx;
        const y = 2 + dy; // just south of the plaza
        const key = tileKey(x, y);
        if (taken.has(key)) continue;
        if (world.build[key] || world.furniture[key] || world.crops[key]) continue;
        // The cell in front matters too: the villager stands there, and a tent
        // pitched against a wall with nowhere to stand is the doorstep bug
        // wearing a different hat.
        if (!isWalkable(world, x, y) || !isWalkable(world, x, y + 1)) continue;
        return { x, y };
      }
    }
  }
  return { x: 0, y: 2 };
}

// --- Filing and stamping -------------------------------------------------------

/** The Office Creature hands over the form. Idempotent — talking to him twice
 *  does not open a second case, which is a joke he would appreciate but not a
 *  state we want. */
export function fileCommission(c: Commission, now: number): void {
  if (c.filedAt === null) c.filedAt = now;
}

/** Why this commission isn't finished yet, or that it is.
 *
 *  Reuses assign.ts's Verdict wholesale rather than inventing a parallel set of
 *  reasons: the assignment panel says "it needs a door" in the player's voice
 *  and the Office Creature says it on letterhead, and they must be the same
 *  fact. `too-small` is the ONE thing added here, because a minimum size is a
 *  commission's requirement and not a housing rule — qualify() hands back the
 *  Room precisely so this call site can ask. */
export type CommissionState =
  | { done: true; verdict: Verdict & { ok: true } }
  | { done: false; why: "no-home" }
  | { done: false; why: "too-small"; size: number }
  | { done: false; why: Extract<Verdict, { ok: false }>["why"] };

/** What's still wrong, on letterhead.
 *
 *  The same facts as DISQUALIFIER_TEXT, in the Office Creature's voice rather
 *  than the player's — one call site produces both, so they can never come to
 *  disagree about what a house is. He states the deficiency and offers no
 *  encouragement, because he is a desk. */
export function shortfallText(state: CommissionState): string {
  if (state.done) return "In order.";
  switch (state.why) {
    case "no-home":
      return "No address on file. ... They are still in the tent.";
    case "no-bed":
      return "No bed. A house without one is a shed with ambitions.";
    case "no-room":
      return "The walls do not meet. ... I cannot file an outdoors.";
    case "no-door":
      return "No door. ... They would live there exactly once.";
    case "too-small":
      return `${state.size} of floor, where the form wants ${MIN_INTERIOR}. ... I don't make the form.`;
  }
}

export function commissionState(world: WorldState, c: Commission): CommissionState {
  const v = world.villagers.find((w) => w.id === c.id);
  const bed = v ? claimedBed(world, v) : null;
  if (!bed) return { done: false, why: "no-home" };

  const verdict = qualify(world, bed.x, bed.y);
  if (!verdict.ok) return { done: false, why: verdict.why };
  if (verdict.room.interior.size < MIN_INTERIOR) {
    return { done: false, why: "too-small", size: verdict.room.interior.size };
  }
  return { done: true, verdict };
}

/** Close a satisfied commission: stamp it, pay whatever it pays, and let the
 *  resident remember the day they got a house.
 *
 *  Returns the finish it unlocked, or null. Paying is guarded by `stampedAt`
 *  rather than by checking whether the finish is already unlocked, because the
 *  two are different questions — a finish may arrive from somewhere else later,
 *  and "has this form been stamped" is the fact this file owns. */
export function stampCommission(world: WorldState, c: Commission, now: number): SkinId | null {
  if (c.stampedAt !== null) return null;
  if (!commissionState(world, c).done) return null;

  c.stampedAt = now;
  const def = arrivalOf(c);
  const v = world.villagers.find((w) => w.id === c.id);
  if (v) v.memory = remember(v.memory, { kind: "housed", at: now });

  if (def.unlocks && !world.skins.unlocked.includes(def.unlocks)) {
    world.skins.unlocked.push(def.unlocks);
    return def.unlocks;
  }
  return null;
}
