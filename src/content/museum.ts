// The museum's two wings, as data. Corrigal writes the placards; she is wrong
// about all of them and has never once said so.
//
// DESIGN §The museum settles the shape and ROADMAP records why. The parts that
// this table has to physically enforce:
//
// THERE IS NO TOTAL IN THIS FILE. No count, no denominator, no `COMPLETE` set,
// nothing a panel could divide by. A collection stops being a gift and becomes
// a checklist the moment the UI can say "9 of 17", so the vocabulary is not
// given the second number. You learn what else the museum holds by donating.
//
// EVERY ROW CARRIES 2–3 PLACARDS, NOT ONE, and that is load-bearing rather than
// decorative. DESIGN §Time promises an away event where the Scholar "mounts a
// new wrong exhibit"; with a list here that event is a stored index moving by
// one, and it costs no new content axis and no new art. It is also just true to
// her: a curator who revises is funnier than a curator who was wrong once.
//
// THE ANTIQUITIES WING RUNS ON FUNGIBLE JUNK. You never carry a doorknob — you
// carry junk (content/junk.ts), and Corrigal decides at the counter what it
// was. That is content/junk.ts's trick pointed the other way: the variety is
// free because nothing specific is ever stored, and it is what lets the museum
// have a real collection without carving a "specimen" item class out of the
// three-materials rule. A carried specimen would make that rule a suggestion.

import type { ItemId } from "./items";

export type WingId = "nature" | "antiquities";

export type ExhibitId =
  // Nature wing — one of each crop and gathered thing.
  | "timber"
  | "stone"
  | "ore"
  | "carrot"
  | "mushroom"
  // Antiquities wing — junk, identified on arrival.
  | "handle"
  | "statement"
  | "spoon"
  | "hinge"
  | "key"
  | "boot"
  | "cog"
  | "bell"
  | "tin"
  | "coil"
  | "cup"
  | "plaque";

export interface ExhibitDef {
  id: ExhibitId;
  wing: WingId;
  /** What the museum calls it, which is not what the item is called. The
   *  satchel says "junk"; the plinth says "Handle of Office". */
  title: string;
  /** What it costs to donate. Nature rows take one of the thing itself;
   *  antiquities rows take plain junk. Donation returns nothing (DESIGN) —
   *  this is a price in the sense that a gift has a price. */
  cost: { item: ItemId; count: number };
  /** Her readings, in the order she arrives at them. Index 0 is mounted at
   *  donation; the away event advances it and never wraps past the end. All of
   *  them are confident and none of them are right. */
  placards: string[];
}

/** Array, not a `Record`, because order is meaningful in the antiquities wing:
 *  donating junk reveals the NEXT unrevealed antiquities row, so "next" has to
 *  mean something. Nature rows are unordered in practice — you donate whatever
 *  you happen to be holding — and keep array order only for display. */
export const MUSEUM: ExhibitDef[] = [
  // --- Nature wing ---------------------------------------------------------
  // One row per crop and per gathered thing, and that is the whole rule: this
  // wing is derived from the world rather than authored at a length somebody
  // picked. Add a crop, add a row. It is finite and small on purpose — it is
  // the reason the museum is reachable by someone who never digs, the same way
  // the barter table exists so it's reachable by someone who never farms.
  //
  // CLOTH IS DELIBERATELY ABSENT. It is the one thing you cannot gather
  // (items.ts), so a cloth plinth would quietly make this wing depend on the
  // Menace's counter. Corrigal would take it. She is not being offered it.
  {
    id: "timber",
    wing: "nature",
    title: "Timber, Sectioned",
    cost: { item: "wood", count: 1 },
    placards: [
      "Timber. Cut from the common tree, an organism that grows upward in the hope of being noticed.",
      "Timber. ... Amended. Not from a tree. Trees are made of this. The distinction is enormous and I will not be walking anyone through it.",
      "Timber. Now believed to be the bone of something very large and very patient. The donor disputes this. The donor was not consulted.",
    ],
  },
  {
    id: "stone",
    wing: "nature",
    title: "Stone, Whole",
    cost: { item: "stone", count: 1 },
    placards: [
      "Stone. Formed underground over an extremely long period by heat, by pressure, and by being left alone.",
      "Stone. ... Revised. Stone does not form. Stone has simply always been the case.",
      "Stone. A tree that made different choices.",
    ],
  },
  {
    id: "ore",
    wing: "nature",
    title: "Ore, Unresolved",
    cost: { item: "ore", count: 1 },
    placards: [
      "Ore. Rock with metal still inside it, sulking.",
      "Ore. ... Later finding: metal with rock still on it. The order matters more than anyone here appreciates.",
    ],
  },
  {
    id: "carrot",
    wing: "nature",
    title: "Carrot, Cultivated",
    cost: { item: "carrot", count: 1 },
    placards: [
      "Carrot. The root is the part that is eaten. The top is the part that is discussed.",
      "Carrot. ... The only specimen in this wing that was grown on purpose, by a person, who then gave it away. Note the restraint.",
      "Carrot. The Blessed Carrot has visited this plinth twice and declined to comment. Twice.",
    ],
  },
  {
    id: "mushroom",
    wing: "nature",
    title: "Mushroom, Nocturnal",
    cost: { item: "mushroom", count: 1 },
    placards: [
      "Mushroom. Appeared overnight. No stage of its life was witnessed by anybody.",
      "Mushroom. ... Corrected. It did not appear. It had always been there and only lately agreed to be seen.",
    ],
  },

  // --- Antiquities wing ----------------------------------------------------
  // Array order is REVEAL order: hand over junk and the next one on this list
  // turns out to be what you were carrying. You are never shown the ones below
  // the line you have reached — no empty slots anywhere, which is the load-
  // bearing half of "the record is not a score" (ROADMAP). Eighteen blanks in a
  // grid is a completion meter that nobody had to write.
  //
  // THE COST IS FLAT AND SMALL, and stays flat. A rising cost per exhibit is a
  // progression curve, which is a score with the number filed off; a museum
  // that gets more expensive the more you have given it has misunderstood what
  // giving is. Three junk, every time, forever.
  //
  // These are the objects from JUNK_FINDS, which is the point: the toast you
  // read when the ground gave it up said "a doorknob, no door", and here it is
  // again with a title on it. Nothing was stored between those two moments.
  {
    id: "handle",
    wing: "antiquities",
    title: "Handle of Office",
    cost: { item: "junk", count: 3 },
    placards: [
      "Handle of Office. Turned by every hand of a former administration. The door it served has not been located and may never have existed.",
      "Handle of Office. ... Reattributed as ceremonial. It was fitted to nothing. It was held aloft during announcements.",
      "Handle of Office. Recent scholarship suggests it is a doorknob. Recent scholarship is very sure of itself.",
    ],
  },
  {
    id: "statement",
    wing: "antiquities",
    title: "The Surviving Half of a Statement",
    cost: { item: "junk", count: 3 },
    placards: [
      "The Surviving Half of a Statement. The missing half carried the subject. This half carried the conviction.",
      "The Surviving Half of a Statement. ... Reconstruction attempted. The full text is now believed to have been permissive. Proceed accordingly.",
    ],
  },
  {
    id: "spoon",
    wing: "antiquities",
    title: "Reversed Spoon",
    cost: { item: "junk", count: 3 },
    placards: [
      "Reversed Spoon. Bent the wrong way round, deliberately, over a long period. Purpose unknown. Commitment total.",
      "Reversed Spoon. ... Now understood to serve a room in which everything is the other way up. No such room has been located in this town.",
    ],
  },
  {
    id: "hinge",
    wing: "antiquities",
    title: "Hinge, Unattached",
    cost: { item: "junk", count: 3 },
    placards: [
      "Hinge, Unattached. Fully operational. It hinges. It has nothing to hinge and it hinges anyway.",
      "Hinge, Unattached. ... Reclassified as a monument to readiness.",
    ],
  },
  {
    id: "key",
    wing: "antiquities",
    title: "The Key",
    cost: { item: "junk", count: 3 },
    placards: [
      "The Key. No lock in this town accepts it. Every lock in this town has been tried, twice, by me.",
      "The Key. ... The lock is elsewhere. This is not a disappointment. This is a direction.",
      "The Key. Opens something that has not been built yet. The museum is in no hurry.",
    ],
  },
  {
    id: "boot",
    wing: "antiquities",
    title: "Sole Boot",
    cost: { item: "junk", count: 3 },
    placards: [
      "Sole Boot. Left. The right remains underground and is presumed to be doing well.",
      "Sole Boot. ... Correction: right. The catalogue has been amended, and the amendment has been amended.",
    ],
  },
  {
    id: "cog",
    wing: "antiquities",
    title: "Cog of an Unknown Machine",
    cost: { item: "junk", count: 3 },
    placards: [
      "Cog of an Unknown Machine. This town has never had a machine. Either the cog predates the town or the town predates its own memory.",
      "Cog of an Unknown Machine. ... The machine was here. Everyone has agreed not to bring it up.",
    ],
  },
  {
    id: "bell",
    wing: "antiquities",
    title: "Retired Bell",
    cost: { item: "junk", count: 3 },
    placards: [
      "Retired Bell. It does not ring. It is not broken. It has stopped.",
      "Retired Bell. ... Struck during examination. Nothing happened, at considerable volume.",
    ],
  },
  {
    id: "tin",
    wing: "antiquities",
    title: "Nested Tin",
    cost: { item: "junk", count: 3 },
    placards: [
      "Nested Tin. A tin containing a tin. The inner tin is empty, which is the only entirely honest object in this wing.",
      "Nested Tin. ... A third tin is suspected. The investigation is ongoing and will not be concluded.",
    ],
  },
  {
    id: "coil",
    wing: "antiquities",
    title: "Coil",
    cost: { item: "junk", count: 3 },
    placards: [
      "Coil. Wound by hand, evenly, by somebody who was not being paid to wind it evenly.",
      "Coil. ... Unwound for measurement and rewound by this office. Less well.",
    ],
  },
  {
    id: "cup",
    wing: "antiquities",
    title: "Inward Cup",
    cost: { item: "junk", count: 3 },
    placards: [
      "Inward Cup. The handle is on the inside. It was made this way, on purpose, by somebody who had thought about it.",
      "Inward Cup. ... Held from within. The hand then occupies the volume intended for the drink. A trade-off, openly made.",
    ],
  },
  {
    id: "plaque",
    wing: "antiquities",
    title: "Blank Commemorative Plaque",
    cost: { item: "junk", count: 3 },
    placards: [
      "Blank Commemorative Plaque. It commemorates something.",
      // A valid line in this house (DESIGN §Tone), and the only placard she has
      // ever been right about — by saying nothing, in front of a blank plaque.
      "...",
      "Blank Commemorative Plaque. ... The occasion is now entirely forgotten, making this the most successful commemoration in the collection.",
    ],
  },
];

const BY_ID = new Map<ExhibitId, ExhibitDef>(MUSEUM.map((e) => [e.id, e]));

export function exhibitDef(id: ExhibitId): ExhibitDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown exhibit: ${id}`);
  return def;
}

/** The rows of one wing, in table order. Reveal order for antiquities. */
export function wingExhibits(wing: WingId): ExhibitDef[] {
  return MUSEUM.filter((e) => e.wing === wing);
}

/** Which reading is currently mounted, from the stored index. Clamped rather
 *  than wrapped: she revises until she runs out of revisions and then she
 *  stands by the last one.
 *
 *  Exported alongside the text because a caller that wants to talk about the
 *  readings she has NOT mounted (sim/museum.ts `rivalReading`) needs the index
 *  to exclude, and clamping it in a second place is how the two answers
 *  eventually disagree. */
export function mountedIndex(def: ExhibitDef, index: number): number {
  return Math.max(0, Math.min(index, def.placards.length - 1));
}

/** The placard currently mounted. */
export function placardText(def: ExhibitDef, index: number): string {
  return def.placards[mountedIndex(def, index)];
}
