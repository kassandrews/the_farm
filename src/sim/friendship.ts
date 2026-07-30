// Friendship, and the milestones it crosses. Split out of sim/villagers.ts —
// which is where it grew up — because it is the one thing about a person that
// half the sim needs to ask about: the errands board, the festival crowd, the
// dialogue selector, and now company, which gates an invitation on it.
//
// villagers.ts is the WALKING file. Leaving the tier ladder in it meant
// sim/company.ts had to import the module that imports company.ts, and a cycle
// through the middle of the tick loop is a bad thing to own for the sake of one
// two-line predicate. Nothing here touches position, routes, or the clock.

import type { Villager } from "./types";
import { charDef } from "../content/cast";

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
