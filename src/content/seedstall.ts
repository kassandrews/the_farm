// The Blessed Carrot's stall — the fourth counter, and the only one that deals
// in two different kinds of thing at once.
//
// TWO KINDS OF ROW, because seeds and varieties are two axes and not one
// (DESIGN §Materials, "seed is the stuff, the variety is the look"):
//
//   • SEED rows are the Menace's shape. Unlimited, repeatable, and each one is
//     payable from a material OR from produce OR from junk, exactly like hers
//     and asserted by the same kind of test. A seed row that only took carrots
//     would make farming a prerequisite for farming, which is the daftest
//     version of the failure the barter table exists to prevent.
//
//   • VARIETY rows are the Gremlin's shape. Redeemed ONCE, because a variety is
//     permanent and weightless — there is no second radish to own. They differ
//     from his rows in what they cost (anything, not junk alone) and match them
//     in what they give: a thing that can never be a gate. No commission, no
//     `qualify()`, no acceptance test anywhere asks what you have planted.
//
// WHAT IS NOT HERE, and must never be: a row that gives seed of a PARTICULAR
// variety. The whole reason the item table grows by one row for all of farming
// is that seed is fungible; the day this file sells "radish seed" is the day
// items.ts starts growing one row per crop forever.
//
// He does not want to talk about any of it. He is a vegetable who ended up the
// patron of vegetables and considers the joke beneath comment, so his lines are
// short, flat, and about the transaction rather than about him.

import type { CropId } from "./crops";
import type { Price } from "./shop";

/** Seed, for anything you happen to have. */
export interface SeedRow {
  /** How much seed a swap hands over. */
  givesCount: number;
  /** Any ONE of these pays for it. Order is display order. */
  accepts: Price[];
  line: string;
}

/** A variety, unlocked forever. */
export interface VarietyRow {
  gives: CropId;
  accepts: Price[];
  line: string;
}

/** Two rows, a small handful and a large one — the same shape her counter uses,
 *  and for the same reason: one visit should be able to cover an afternoon's
 *  planting without becoming a shopping trip.
 *
 *  The counts are set against the rule that farming can never dead-end. A
 *  harvest returns seed (sim/crops.ts), so these are how you START and how you
 *  EXPAND, never a toll you pay per plant. */
export const SEED_ROWS: SeedRow[] = [
  {
    givesCount: 6,
    accepts: [
      { item: "wood", count: 4 },
      { item: "stone", count: 3 },
      // Every variety, at one price. A counter that took one crop and not
      // another would make that one the good crop from a file that never
      // mentions growth times — asserted in seeds.test.ts, and found on the
      // screen once already.
      { item: "carrot", count: 2 },
      { item: "radish", count: 2 },
      { item: "potato", count: 2 },
      { item: "peas", count: 2 },
      { item: "tomato", count: 2 },
      { item: "kale", count: 2 },
      { item: "pumpkin", count: 2 },
      { item: "wheat", count: 2 },
      { item: "mushroom", count: 3 },
      { item: "junk", count: 3 },
    ],
    line: "Six. ... They're seeds. They know what they're doing.",
  },
  {
    givesCount: 20,
    accepts: [
      { item: "wood", count: 12 },
      { item: "stone", count: 9 },
      { item: "carrot", count: 6 },
      { item: "radish", count: 6 },
      { item: "potato", count: 6 },
      { item: "peas", count: 6 },
      { item: "tomato", count: 6 },
      { item: "kale", count: 6 },
      { item: "pumpkin", count: 6 },
      { item: "wheat", count: 6 },
      { item: "mushroom", count: 9 },
      { item: "junk", count: 9 },
    ],
    line: "The handful, then. ... Plant them or don't. I'm not going to check.",
  },
];

/** The varieties he'll let you have. The carrot is absent on purpose — it is
 *  what you start with (crops.ts STARTING_CROP), and a stall whose first row
 *  sold you the thing you already had would be a tutorial for shopping.
 *
 *  Costs are flat across the two and deliberately so: a variety that cost more
 *  would read as the better crop, and no crop is better than another. What you
 *  are buying is a different SHAPE of day, not a bigger number. */
export const VARIETY_ROWS: VarietyRow[] = [
  {
    gives: "radish",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Radish. ... Quick. Loud about it. You'll see.",
  },
  {
    gives: "potato",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Potato. ... Takes its time. Nobody has ever hurried one.",
  },
  // The 4d varieties. Costs are copied VERBATIM from the two above and must
  // stay that way — seeds.test.ts compares the serialised `accepts` arrays and
  // fails if any variety is dearer than another, because a dearer variety reads
  // as the better crop whatever the growth table says.
  //
  // Four of these have a month they are about. HE DOES NOT MENTION IT. The
  // season is something the world does, not something the stall sells, and a
  // counter that advertised "plant it in October" would have turned a look into
  // a schedule.
  {
    gives: "peas",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Peas. ... Faster than they have any right to be.",
  },
  {
    gives: "tomato",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Tomato. ... In at breakfast, done by dark. Don't read anything into that.",
  },
  {
    gives: "kale",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Kale. ... Comes back round to the same hour tomorrow. It's punctual.",
  },
  {
    gives: "pumpkin",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Pumpkin. ... A day and a bit. You'll be back at an odd hour for it.",
  },
  {
    gives: "wheat",
    accepts: [
      { item: "wood", count: 10 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 5 },
      { item: "mushroom", count: 8 },
      { item: "junk", count: 8 },
    ],
    line: "Wheat. ... Two days. You'll want to water it more than twice.",
  },
];

/** What he says when there is nothing left to unlock. He is not restocking —
 *  the same finality as the Gremlin's empty pile, and for the same reason (a
 *  counter that might have something new tomorrow is FOMO in an apron). Seed
 *  itself never runs out, so the stall stays worth visiting. */
// It used to end "There were only ever three. It's a small world,
// agriculturally", which Phase 4d made a lie. The replacement keeps the two
// things that line was doing and drops the count: the finality has to be REAL
// (a counter that might restock tomorrow is FOMO in an apron, the same rule as
// the Gremlin's empty pile), and the stall has to stay worth walking to,
// because seed itself never runs out.
//
// No number in it, deliberately. A count invites a denominator, and the moment
// he says "all eight" somebody is counting to eight.
export const STALL_EXHAUSTED = "Done. ... Seed's still seed, and it will be tomorrow. That part doesn't stop.";

/** The opener. He is aware of what he is. */
export const STALL_OPENER = "Seeds. ... Yes. I'm aware. We're not discussing it.";
