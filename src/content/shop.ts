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
//
// ORE IS AN ALTERNATIVE AND NEVER A REQUIREMENT (DESIGN §Materials). It may sit
// beside the wood and the carrots on any row; no row may take it alone. An
// extra way to pay gates nothing, so the digger gets the same sentence out of
// her that the farmer does — but a row payable only in ore would be the
// underground made compulsory by the back door, which is the exact failure this
// whole table was built to prevent, one material over.

import type { ItemId } from "./items";
import type { SkinId } from "./skins";

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
      { item: "ore", count: 6 },
      { item: "carrot", count: 4 },
      { item: "radish", count: 4 },
      { item: "potato", count: 4 },
      { item: "peas", count: 4 },
      { item: "tomato", count: 4 },
      { item: "kale", count: 4 },
      { item: "pumpkin", count: 4 },
      { item: "wheat", count: 4 },
      { item: "mushroom", count: 6 },
      { item: "junk", count: 5 },
    ],
    line: "Two bolts ... You'll want more. Everyone wants more, eventually.",
  },
  {
    gives: "cloth",
    givesCount: 6,
    accepts: [
      { item: "wood", count: 32 },
      { item: "stone", count: 22 },
      { item: "ore", count: 16 },
      { item: "carrot", count: 11 },
      { item: "radish", count: 11 },
      { item: "potato", count: 11 },
      { item: "peas", count: 11 },
      { item: "tomato", count: 11 },
      { item: "kale", count: 11 },
      { item: "pumpkin", count: 11 },
      { item: "wheat", count: 11 },
      { item: "mushroom", count: 16 },
      { item: "junk", count: 13 },
    ],
    // Slightly better rate, and she is not going to draw attention to it.
    line: "The larger amount ... It works out better for you. I'm aware. Take it.",
  },
];

// --- The heap -----------------------------------------------------------------
// The Gremlin's counter, which he insists is a facility. It is a pile.
//
// He deals in ONE thing in one direction: junk in, finishes out. That is not
// the Menace's table with different rows, and the difference is the point of
// him existing at all — she sells what you cannot gather, he takes what nobody
// wanted. A row here therefore breaks the counter's usual rule and accepts junk
// and nothing else, which is only allowed because of what he gives back.
//
// WHAT HE GIVES IS ALWAYS A FINISH, and that is the load-bearing constraint.
// A finish is the one reward class in this game that can never be a gate: free
// to apply, weightless, permanent, and invisible to every acceptance test in
// the codebase — no commission, no `qualify()`, no room has ever asked what
// colour anything is (DESIGN §Materials, "taste is delight, never a gate").
// So a junk-only counter can exist without junk becoming a thing you MUST go
// and dig. Put a material or a piece of furniture behind this counter and that
// stops being true immediately; sim/heap.test.ts asserts it never happens.
//
// Each row is redeemed ONCE — a finish is permanent, so there is nothing to buy
// twice. His stock therefore runs out, which is the opposite of the Menace's
// unlimited counter and is right for the same reason hers is: she is a shop and
// he is a heap, and a heap is a finite pile of things somebody already threw
// away. When it's empty he has plenty to say about that.

export interface HeapRow {
  /** The finish redeemed. Unlocked permanently; nothing is carried. */
  gives: SkinId;
  /** Junk only. See the note above for why this counter gets to do that. */
  cost: number;
  line: string;
}

export const HEAP: HeapRow[] = [
  {
    gives: "salvage",
    cost: 8,
    line: "Boards ... None of them match. That IS the finish. Keep up.",
  },
  {
    gives: "cobble",
    cost: 12,
    line: "Sorted stone. I sorted it ... Don't ask by what.",
  },
  // The three paints. A tin is the most junk-shaped object there is — nobody
  // throws away a full one — and this counter was two rows deep and the only
  // one in the game you can EMPTY, which made running him dry the fastest thing
  // a player could do to him. Five rows is a pile.
  //
  // Costed above the two woods and in ascending order, so the pile has a far
  // end. Still finishes, so §"The heap"'s load-bearing constraint holds and
  // sim/heap.test.ts's assertion about it does not need relaxing.
  {
    gives: "sage",
    cost: 14,
    line: "Green ... Half a tin. The other half is a matter for the archive.",
  },
  {
    gives: "oxblood",
    cost: 18,
    line: "Red. It is called ox-blood ... No ox was consulted.",
  },
  {
    gives: "bone",
    cost: 24,
    line: "Off-white ... It was white. Things happen to white.",
  },
];
