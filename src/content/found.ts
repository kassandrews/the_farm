// Found places — the small authored oddities the world is scattered with.
//
// Content is data (CLAUDE.md): a found place is a row here, not a code path. The
// siting lives in sim/found.ts beside the grove and the cube, because it is
// terrain generation and a total function of (seed, x, y) exactly as those are.
//
// WHAT ONE IS (DESIGN.md §Found places). A small authored oddity at a real
// coordinate, different per world, reached by walking into it and never by being
// pointed at. No marker, no pin, no "undiscovered" slot in any list — a screen
// that can tell you how many are left has converted the world into a checklist and
// then told you the answer.
//
// IT HOLDS A MOOD, NEVER A PAYOUT. Nothing here yields a material, and nothing in
// the game may ever require having found one. The dark grove and the humming cube
// (Phase 4c) were the first two of these and are the pattern: the grove gives a
// wood you cannot get anywhere else and the cube gives NOTHING AT ALL, and it is
// the cube that people remember.
//
// WHY THEY MAY BE RARE WHEN WATER MAY NOT. §Water forbids anything singular on an
// unbounded map. The exception here is deliberate and load-bearing: ambient natural
// features must scatter or the world feels empty, but authored secrets are allowed
// to be rare, because rarity is what makes them secret. The safety valve is MANY
// KINDS AT A LOW DENSITY EACH — one kind at density one is a diorama; four kinds
// on staggered rings is a world with things in it.
//
// THEY RECUR OUTWARD FOREVER, which is the one place this departs from 4c. The
// grove is one per town; a category that runs out after the first lap has told you
// the world ends where its contents do, on a map that does not end. So each kind
// reappears on successive rings, at a fresh bearing each time. Walking further
// always finds more, and no instance is ever near enough to another of its kind to
// be a pattern you can steer by.
//
// THE TONE IS THE POINT. Every one of these is earnestly convinced its own absurd
// logic is normal. Nobody explains them. Nothing comments on them. You walk into a
// perfectly circular grove, stand in it, and leave.

export type FoundKind = "ringgrove" | "poledpond" | "mailbox" | "stair" | "skystair";

export interface FoundDef {
  id: FoundKind;
  /** What it is, for the code to read. It is NEVER shown: the game does not name
   *  its secrets, exactly as the cube is called "Cube" and never "the Humming
   *  Cube" anywhere a player can see. */
  note: string;

  /** Where the first one is, in tiles from the plaza datum. Past the blossom rows
   *  (72), which is the furthest thing a villager will actually TELL you about —
   *  everything out here is found rather than mentioned. */
  ring: number;

  /** How much further out the next one of this kind is. Big, and deliberately not
   *  a round number shared with any other row: two kinds on the same spacing would
   *  eventually pair up at the same radius over and over, and a player who noticed
   *  would have a rule instead of a surprise. */
  spacing: number;

  /** How far the place reaches from its centre. This is a FOOTPRINT and not a
   *  clearing — the ground it stands on is whatever the region there happens to
   *  be, so a circular grove in the pines is a circle of ordinary trees in a pine
   *  wood, and is odder for it. */
  radius: number;
}

export const FOUND: Record<FoundKind, FoundDef> = {
  /** A perfectly circular stand of trees with an empty middle. The trees are the
   *  region's own, so this is not a different WOOD — it is the wood you have been
   *  walking through, arranged. That is the whole joke, and it only works if
   *  nothing about the trees themselves is special.
   *
   *  Nearest of the four, because it is the mildest: the first oddity the world
   *  offers should be one you might almost talk yourself out of having seen. */
  ringgrove: {
    id: "ringgrove",
    note: "a circle of trees, all facing in",
    ring: 96,
    spacing: 214,
    // Wide enough that standing in the middle you cannot see the whole ring
    // without turning, which is what makes it read as a place rather than as a
    // shape. At radius 4 it was a bush with a hole in it.
    radius: 7,
  },

  /** A pond with a dozen rods already stuck in the bank and nobody holding them.
   *  There are no fish in the game, which is the part that makes it funny rather
   *  than the part that makes it broken: the poles are not fishing equipment, they
   *  are evidence of a committee.
   *
   *  It generates its own water, so it goes through the same rule every pond does
   *  — small, finite, walk-around-able (§Water). */
  poledpond: {
    id: "poledpond",
    note: "a pond with no fish and a dozen poles",
    ring: 141,
    spacing: 233,
    radius: 6,
  },

  /** One mailbox, in the middle of nowhere, on a post, sometimes with a letter in
   *  it. Nothing else within sight — no house, no road, no gate it belongs to.
   *
   *  The letter is a total function of (which mailbox, which day), the festival
   *  trick, so it costs no schema. It is never a request and never names a task:
   *  a notice speaks only in the past tense (§The errands board). */
  mailbox: {
    id: "mailbox",
    note: "a mailbox, nowhere near a house",
    ring: 118,
    spacing: 197,
    radius: 0, // one tile. The loneliness is the point.
  },

  /** A flight of stone steps, freestanding, ending in the air at about head
   *  height. It goes nowhere and does nothing.
   *
   *  IT IS NOT 7c's DOOR. The sky is entered by a RARER staircase, and that one
   *  does not exist yet; this row exists first so that when it does, the way up is
   *  something you have already walked past a dozen times and dismissed. A door
   *  that is introduced as a door was never a secret. */
  stair: {
    id: "stair",
    note: "a staircase, leading nowhere",
    ring: 163,
    spacing: 251,
    radius: 1,
  },

  /** And the one that does (Phase 7c). The same three stone steps, the same
   *  stone, the same footprint, drawn by the same code — there is no mark on it,
   *  no glow, no hum, and no line of dialogue anywhere in the game that hints
   *  one flight of steps out there is different from another.
   *
   *  THE DECOY IS THE FEATURE. The row above shipped a phase early precisely so
   *  that this one arrives as something you have already walked past and
   *  dismissed. A door introduced as a door was never a secret; what makes this
   *  one work is the dozen times you stood at the bottom of the wrong steps.
   *
   *  The only difference is that you can climb it, and you find that out by
   *  trying — stand at the foot, face them, ACT. On every other flight that does
   *  nothing at all, which is what the flights are FOR.
   *
   *  Further out and much rarer than the decoy, so the odds are heavily that you
   *  meet several of those first: at these numbers the nearest real one is past
   *  the first decoy and inside the second. Rare enough to be a find, not so rare
   *  that the sky is unreachable in a game somebody actually plays. */
  skystair: {
    id: "skystair",
    note: "a staircase, leading somewhere",
    ring: 244,
    spacing: 553,
    radius: 1,
  },
};

export const FOUND_KINDS = Object.keys(FOUND) as FoundKind[];

/** What is in the mailbox, when there is anything in it.
 *
 *  HOUSE RULES, and they are the reason this bank is short rather than long. A
 *  notice speaks only in the PAST TENSE (DESIGN §The errands board): not one of
 *  these asks you for anything, names a task, or implies somewhere to go. They are
 *  correspondence you were not the recipient of, and the game never says who was.
 *
 *  Nobody is ever named. A letter that mentioned a villager would turn a mood into
 *  a lead, and a mailbox with a lead in it is a quest board in a field.
 *
 *  Voice is the house voice: earnest, institutional, and entirely certain that the
 *  situation is normal (CLAUDE.md §Tone). The ellipsis style is The Meadow's —
 *  `. ... Capital`. */
export const LETTERS: string[] = [
  "The hedge was dealt with. It took the morning and most of the afternoon.",
  "Thank you for the pears. There were more than expected. ... There are still more than expected.",
  "We have moved the meeting to the usual place, which everyone agreed was better.",
  "It rained on the Tuesday, as forecast. Nobody had said which Tuesday.",
  "Enclosed: nothing. The enclosing was the point.",
  "The committee has reviewed the matter and found it to be a matter.",
  "I walked out as far as the steps and sat on them for a while.",
  "All is well here. The pond is the same as it was, which is to say full of poles.",
  "We are sorry to have missed you. We waited until it got dark and then a bit longer.",
  "The circle of trees is doing what it always does. ... It is doing it very well this year.",
];

/** HOW OFTEN THE BOX IS EMPTY, and it has to be most days.
 *
 *  A mailbox that always has a letter is a dispenser, and the walk out to it becomes
 *  a collection route — which is the payout curve this whole phase refuses, wearing
 *  stationery. Empty is the honest default for a box in a field, and it is also
 *  what makes the letter worth anything on the day it is there. */
const LETTER_CHANCE = 0.35;

/** The letter in a given box on a given day, or null for an empty box.
 *
 *  A total function of (which town, which mailbox, which day) — the festival trick
 *  — so nothing is stored, nothing is consumed, and reading it twice reads the same
 *  letter. It is not an item, it does not enter the satchel, and taking it is not a
 *  verb.
 *
 *  THE SEED IS IN HERE, and the first version left it out. Without it "which
 *  mailbox" means "the nth one out from the datum" in every town at once: every
 *  player's nearest box would hold the same line on the same afternoon, which is
 *  the one way a secret sited per-world can stop being per-world.
 *
 *  `day` is a whole number of days, so the letter changes at midnight and holds all
 *  day: a letter that changed while you stood there would be a slot machine. */
export function letterFor(seed: number, index: number, day: number): string | null {
  // Two independent hashes: whether there IS one today, and which one. Sharing a
  // hash would tie "the box is full" to "it is the fourth letter", so one letter in
  // the bank would be the only one anybody ever saw.
  const there = mix(seed ^ (index * 2654435761 + day * 40503 + 0x515e)) / 4294967296;
  if (there >= LETTER_CHANCE) return null;
  const which = mix(seed ^ (index * 2246822519 + day * 668265263 + 0xbeef)) / 4294967296;
  return LETTERS[Math.floor(which * LETTERS.length) % LETTERS.length];
}

/** A small integer hash. Local rather than imported from sim/rng: content may not
 *  depend on the sim (CLAUDE.md — imports point inward), and this is four lines. */
function mix(n: number): number {
  let h = n >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
