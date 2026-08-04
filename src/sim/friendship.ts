// Friendship, and the milestones it crosses. Split out of sim/villagers.ts —
// which is where it grew up — because it is the one thing about a person that
// half the sim needs to ask about: the errands board, the festival crowd, the
// dialogue selector, and now company, which gates an invitation on it.
//
// villagers.ts is the WALKING file. Leaving the tier ladder in it meant
// sim/company.ts had to import the module that imports company.ts, and a cycle
// through the middle of the tick loop is a bad thing to own for the sake of one
// two-line predicate. Nothing here touches position, routes, or the clock.

import type { Villager, WorldState } from "./types";
import type { SkinId } from "../content/skins";
import { charDef } from "../content/cast";
import { SKINS } from "../content/skins";

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

/** What to CALL somebody on screen — their name, unless they haven't given it
 *  to you yet. Every UI path that prints a villager's name goes through here.
 *
 *  Exactly one person has a name to withhold: Eloise, who is "Quiet Ghost" until
 *  you are `close` to her (content/cast.ts `unknownAs`). It lives in this file
 *  rather than in content because the answer depends on friendship, and content
 *  may not import sim — so sim asks content who they are and answers the rest
 *  itself. The direction of that arrow is the architecture (CLAUDE.md).
 *
 *  It is also the one friendship milestone in the game you can POINT AT. The
 *  tier ladder above is deliberately invisible — no hearts, no meter, you just
 *  notice someone warming up — and a secret whose name arrives is the exception
 *  that proves it, because what you notice is still not a number.
 *
 *  Note this reads the villager's LIVE name, not the def's: a Meadow import
 *  brings its own, and a save written before the naming pass carries whatever
 *  it was migrated to. The def is consulted only for the withholding. */
export function displayName(v: Villager): string {
  const hidden = charDef(v).unknownAs;
  if (hidden && !atLeast(v, "close")) return hidden;
  return v.name;
}

// --- Finishes people give you ------------------------------------------------
// The third unlock source, and the one DESIGN has always named and the code has
// never had: friendship, alongside discovery (walnut in the grove) and the
// underground (slate twelve tiles down). Who gives what, and how warm they have
// to be, is a field on the finish itself — content/skins.ts `given`.
//
// IT IS A GIFT AND NOT A PAYOUT, and the difference is entirely in how it
// arrives. Nothing here is announced as a milestone, no tier is ever named on
// screen, and there is no "friendship increased" anywhere: you talk to somebody
// and they hand you a tin. The whole invisible-ladder rule above survives this
// because a gift is a thing a PERSON did, which is the only channel the ladder
// was ever allowed to speak through.
//
// It also cannot become a gate, which is what makes it safe to hang on a tier
// at all. A finish costs nothing to apply, weighs nothing, and no commission,
// room or acceptance test has ever asked what colour anything is (see
// content/skins.ts) — so a player who never warms to anybody loses a colour and
// not a single thing they can do.

/** What this person is ready to hand over right now, if anything.
 *
 *  A read, not a grant — the UI asks this to decide whether a card is coming,
 *  and `takeGift` below is the half that mutates. Split because the panel that
 *  shows it opens in stages (an intro first, if they still owe you one) and a
 *  check that unlocked things as a side effect of being asked would hand the
 *  finish over to a modal the player then dismissed. */
export function giftDue(world: WorldState, v: Villager): SkinId | null {
  for (const id of Object.keys(SKINS) as SkinId[]) {
    const given = SKINS[id].given;
    if (!given || given.who !== v.id) continue;
    if (world.skins.unlocked.includes(id)) continue;
    if (!atLeast(v, given.tier)) continue;
    return id;
  }
  return null;
}

/** Hand it over, once. Returns what was given, or null if nothing was owed.
 *
 *  Idempotent through `skins.unlocked` rather than through a flag or a memory:
 *  the collection of finishes you own IS the record of which gifts have
 *  happened, so there is no second place for the two to disagree. This is also
 *  why no save migration comes with this — a live save where you are already
 *  `friend` with Winifred simply gets her marble the next time you speak, which
 *  is exactly what a new save does. */
export function takeGift(world: WorldState, v: Villager): SkinId | null {
  const id = giftDue(world, v);
  if (id) world.skins.unlocked.push(id);
  return id;
}
