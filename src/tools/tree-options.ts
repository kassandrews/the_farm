// PROPOSALS. Six silhouettes per region, drawn side by side so they can be
// chosen between rather than argued about — the thing a single shipped tree per
// region can never show you.
//
// NOT CONTENT. Nothing here is in the game: `/trees.html` hangs these off the
// region as extra `crownAlt` forms when its "candidates" switch is on, and the
// switch is off by default. When one is picked it gets MOVED into
// content/biomes.ts with a note saying why it won.
//
// LOSERS STAY, BRIEFLY. A rejected shape is worth keeping while the region is
// still being looked at — the granite's flat-topped pine lost a round and is
// still the best story on this page — and worth deleting once it isn't.
//
// Form A of each region is the one currently SHIPPED, so the comparison always
// includes the incumbent. B onward are the alternatives.
//
// Every row obeys the rules content/biomes.ts states, so any of them can ship
// without a second thought: half-widths, integer, never past 8; a 0 only where
// the spar reaches it and never on row 0; `spar` short of row 1 so the tree
// closes at the top; a bough hung only where there is bark to hang it from.

import type { TreeShape } from "../content/biomes";

export const OPTIONS: Record<string, { note: string; forms: TreeShape[] }> = {
  // --- The granite: SETTLED (A and F both shipped). ---------------------------
  //
  // A is the tiered spire and F the open one, and they are now form zero and the
  // second form in content/biomes.ts. What is left here is the three that lost
  // and the flat-topped pine, which lost by a nose and may come back.
  granite: {
    note: "Jeffrey pine — settled: the spire and the open one",
    forms: [
      // B — THE FLAT-TOPPED ONE. Shipped for a day; a leader killed by lightning
      // or a hard winter, regrown broad and headless. The best story here and it
      // read as a shrub on a post: the crown is too small a share of the tree for
      // the plates to say anything. Would want a taller stem to come back on.
      {
        rows: [
          3, 4, 4, 3, 5, 5, 4, 6, 6, //
          0,
          4, 5,
          0,
          5, 6, 5,
          0,
          3, 5, 4,
          0,
          5, 6, 6, 5,
        ],
        overlap: 3,
        spar: 14,
        trunkHeight: 18,
      },
      // C — THE PARASOL. One heavy plate high and small ones under it. Striking,
      // and not a tree.
      {
        rows: [
          2, 4, 6, 6, 5, //
          0,
          3, 5, 5,
          0,
          3, 4,
          0,
          4, 5, 4,
        ],
        overlap: 3,
        spar: 9,
        trunkHeight: 24,
      },
      // D — THE YOUNG ONE. Dense, unbroken, no trunk inside it at all: the
      // control, and the answer to "were the breaks worth it". They were.
      {
        rows: [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 5, 5],
        overlap: 5,
        // STATED, NOT OMITTED: a form that leaves `spar` out inherits the
        // REGION's (§treeForms), so the control meant to show no trunk at all
        // came out with a window of bark in the middle of it.
        spar: 0,
        trunkHeight: 22,
      },
      // E — THE BEATEN-UP ONE. Squat, wide, big breaks. Reads as damage rather
      // than as age.
      {
        rows: [
          3, 5, 5, 4, 6, //
          0,
          6, 5,
          0,
          4, 6, 6,
          0,
          5, 6, 6, 5,
        ],
        overlap: 3,
        spar: 9,
        trunkHeight: 20,
      },
      // F — THE OPEN ONE. WON, and is now the region's second form.
      {
        rows: [
          1, 2, 2, 3, 3, 3, 4, 4, //
          0,
          3, 4,
          0,
          4, 5, 4,
          0,
          4, 6, 5,
          0,
          5, 6, 5,
        ],
        overlap: 3,
        spar: 13,
        trunkHeight: 16,
      },
    ],
  },

  // --- The redwoods: form zero settled, the SECOND form still open. -----------
  //
  // A won form zero outright. The old ragged one that was going to be its
  // partner came back "meh" and is not on this sheet — what replaced it is five
  // ways of being the OTHER redwood, which is the question actually open: what
  // does the tree standing next to A look like?
  redwoods: {
    note: "coast redwood — form zero settled, the second form open",
    forms: [
      // B — THE GROVE TREE. Grown in a closed stand: narrow, nearly unbroken,
      // mostly bare bole. The argument that a redwood wood should read as
      // columns and that A is the exception in it.
      {
        rows: [
          1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 4, 5, 5, 5, 6, 5, 6, 6, //
          0,
          4, 5,
          0,
          5, 6, 5,
        ],
        overlap: 3,
        spar: 8,
        trunkHeight: 26,
      },
      // C — THE LIMBED ONE, and the new idea on this page: a head on top and
      // then real BOUGHS down the bole (§crownBoughs) instead of bands. Old
      // coast redwoods carry a few big lateral limbs and nothing between them,
      // which no symmetric row can say.
      {
        rows: [
          3, 4, 4, 5, 5, 4, 5, 4, //
          0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 3,
        spar: 18,
        boughs: [
          { row: 9, dx: -5, size: 3 },
          { row: 13, dx: 5, size: 4 },
          { row: 17, dx: -5, size: 3 },
          { row: 21, dx: 4, size: 3 },
        ],
        trunkHeight: 22,
      },
      // D — THE CANDELABRA. The top forks, which is a real and very redwood
      // thing: a damaged leader reiterates into two and an old grove is full of
      // them. The one shape here that changes the SKYLINE of the wood.
      {
        rows: [
          3, 3, 4, 4, 5, 5, 4, 5, 6, 6, 5, 6, 6, //
          0,
          4, 5,
          0,
          5, 6, 6,
          0,
          4, 6, 5,
        ],
        gaps: [
          1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, //
          0,
          0, 0,
          0,
          0, 0, 0,
          0,
          0, 0, 0,
        ],
        overlap: 3,
        spar: 12,
        trunkHeight: 26,
      },
      // E — THE VETERAN. A very long bole with a short, well-broken crown high up
      // on it. Makes a wood of the pair read as a hall of pillars with one tree
      // in it you can see the shape of.
      {
        rows: [
          2, 3, 3, 4, 4, 5, 5, 4, //
          0,
          3, 4,
          0,
          4, 5, 4,
          0,
          3, 5, 4,
          0,
          4, 5, 5,
        ],
        overlap: 3,
        spar: 13,
        trunkHeight: 28,
      },
      // F — THE HEAVY ONE. A's shape with the air taken out: deeper plates, more
      // of them, less trunk between. The mildest departure on the sheet, and the
      // safe answer if the others all read as too odd to stand next to A.
      {
        rows: [
          2, 3, 4, 4, 5, 5, 6, 5, 6, 6, 5, 6, 6, 6, //
          0,
          5, 6, 6,
          0,
          5, 6, 6, 5,
          0,
          4, 6, 6, 5,
        ],
        overlap: 3,
        spar: 16,
        trunkHeight: 22,
      },
    ],
  },

  // --- The giants: rebuilt around BOUGHS, off the reference drawing. ----------
  //
  // The banded version (A) is what ships today and it is a stack of symmetric
  // slices; the picture everybody has of a sequoia is a red column with a few
  // enormous limbs on it, each ending in a rounded puff, and bare trunk between
  // them all the way up. That is what B–F are, at five weights.
  giants: {
    note: "giant sequoia — the banded one against five with boughs",
    forms: [
      // B — THE REFERENCE. A small solid head, then nothing but bole, with seven
      // puffs alternating down it. The closest of the six to the drawing.
      {
        rows: [
          2, 4, 5, 6, 6, 5, 5, 4, //
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 4,
        spar: 24,
        boughs: [
          { row: 8, dx: -6, size: 4 },
          { row: 11, dx: 6, size: 4 },
          { row: 15, dx: -6, size: 5 },
          { row: 19, dx: 6, size: 5 },
          { row: 23, dx: -6, size: 4 },
          { row: 26, dx: 6, size: 4 },
          { row: 29, dx: -5, size: 3 },
        ],
        trunkHeight: 36,
      },
      // C — FOUR BIG ONES. The same idea with half as many limbs and all of them
      // at full size: fewer, heavier, further apart.
      {
        rows: [
          2, 4, 5, 6, 7, 6, 5, 4, //
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 4,
        spar: 24,
        boughs: [
          { row: 9, dx: -6, size: 5 },
          { row: 14, dx: 6, size: 5 },
          { row: 20, dx: -6, size: 5 },
          { row: 26, dx: 6, size: 5 },
        ],
        trunkHeight: 36,
      },
      // D — THE HYBRID. Bands where the crown is dense and boughs where it is
      // open: a head, two full plates under it, then limbs. If the banded tree
      // was half right this is the half it was right about.
      {
        rows: [
          2, 4, 5, 6, 6, 5, 5, 4, //
          0, 0, 0, 0,
          6, 7, 7, 6,
          0, 0, 0, 0,
          7, 8, 8, 7,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 4,
        spar: 24,
        boughs: [
          { row: 24, dx: -6, size: 4 },
          { row: 28, dx: 6, size: 4 },
        ],
        trunkHeight: 36,
      },
      // E — THE BIG HEAD. Most of the foliage in one heavy rounded crown on top,
      // with a few limbs below it. The oldest-looking of the six: a sequoia that
      // has lost everything but its top and four branches.
      {
        rows: [
          2, 4, 5, 6, 7, 7, 8, 8, 8, 7, 7, 6, 5, 4, //
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 4,
        spar: 18,
        boughs: [
          { row: 16, dx: -6, size: 4 },
          { row: 20, dx: 6, size: 5 },
          { row: 25, dx: -6, size: 4 },
          { row: 29, dx: 5, size: 3 },
        ],
        trunkHeight: 36,
      },
      // F — THE CLOUD. A small head and nine small puffs close together — the
      // bushiest reading of "puffier boughs", and the one at most risk of
      // reading as a shrub climbing a pole.
      {
        rows: [
          2, 4, 5, 5, 4, //
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        overlap: 4,
        spar: 27,
        boughs: [
          { row: 5, dx: -5, size: 3 },
          { row: 8, dx: 5, size: 3 },
          { row: 11, dx: -6, size: 4 },
          { row: 14, dx: 6, size: 3 },
          { row: 17, dx: -6, size: 4 },
          { row: 20, dx: 6, size: 4 },
          { row: 23, dx: -5, size: 3 },
          { row: 26, dx: 5, size: 3 },
          { row: 29, dx: -4, size: 3 },
        ],
        trunkHeight: 36,
      },
    ],
  },
};
