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
