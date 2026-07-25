// The Menace's counter — what she sells, and what she'll take for it.
//
// BARTER, NOT MONEY, and the reason is a pillar rather than a preference.
// The shop sells what you can't gather (DESIGN §Materials), so something has to
// change hands the other way. If that something were a single currency, the
// fastest way to earn it would become the way you're expected to play — and
// since produce is the obvious earner, "optional farming" would quietly become
// "farm if you want cushions". DESIGN says builder, forager and museum-filler
// are complete ways to play, so the counter has to take what each of them
// actually has.
//
// Hence: no wallet, no prices, no abstract number anywhere. Each row lists a
// few things she'll accept INSTEAD of each other, and you hand over one of
// them. There is nothing to accumulate, so there is nothing to optimise.
//
// THE INVARIANT, asserted in sim/shop.test.ts: every row must be payable from
// at least one MATERIAL and at least one PRODUCE. That is the rule above, made
// mechanical — if someone adds a row that only takes carrots, the test fails
// and tells them they've just made farming mandatory.

import type { ItemId } from "./items";

/** One thing she'll take, and how much of it. */
export interface Price {
  item: ItemId;
  count: number;
}

export interface ShopRow {
  /** What you get. Always cloth for now — everything soft is made of it, so
   *  one row covers the whole category and the table stays honest about how
   *  small it currently is. */
  gives: ItemId;
  givesCount: number;
  /** Any ONE of these pays for it. Order is display order. */
  accepts: Price[];
  /** What she says while taking it. Per row, because the joke is that she has
   *  an opinion about every single transaction. */
  line: string;
}

/** Deliberately short. A shop with forty rows is a menu; this is a counter with
 *  a person behind it, and the person is the point.
 *
 *  The counts are set so no trade feels like a chore: one tree is eight wood,
 *  so a bolt of cloth is roughly a tree and a half, or an afternoon's carrots.
 *  You can be slowed for a minute, never stopped or made to grind (DESIGN). */
export const SHOP: ShopRow[] = [
  {
    gives: "cloth",
    givesCount: 2,
    accepts: [
      { item: "wood", count: 12 },
      { item: "stone", count: 8 },
      { item: "carrot", count: 4 },
      { item: "mushroom", count: 6 },
    ],
    line: "Two bolts. ... You'll want more. Everyone wants more, eventually.",
  },
  {
    gives: "cloth",
    givesCount: 6,
    accepts: [
      { item: "wood", count: 32 },
      { item: "stone", count: 22 },
      { item: "carrot", count: 11 },
      { item: "mushroom", count: 16 },
    ],
    // Slightly better rate, and she is not going to draw attention to it.
    line: "The larger amount. ... It works out better for you. I'm aware. Take it.",
  },
];
