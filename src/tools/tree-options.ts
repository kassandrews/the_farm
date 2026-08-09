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

  // --- The redwoods: WITHDRAWN. -----------------------------------------------
  //
  // Five candidates stood here and all five were built on BREAKS, which turned
  // out to be the wrong mechanism for this region at any weight — see
  // content/biomes.ts §redwoods.crownRows for the finding. They looked their best
  // on this page, one tree at a time on cleared ground, and that is exactly the
  // blind spot: a page that shows one tree cannot show you a wood. The region now
  // carries solid tiered crowns and there is no open question left to put options
  // against.
  //
  // WHAT TO DO IF IT REOPENS: shoot /biomes.html, not this page. The failure was
  // invisible at every zoom here and obvious in one swatch there.

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

  // --- The cherry: GETTING ITS BEAN BACK -------------------------------------
  //
  // Reported as "the canopy used to be almost bean shaped and super cute, and
  // that got messed up when we boosted tree size" — which the history confirms
  // exactly. Before 8 Aug the crown was `[4, 7, 8, 8, 8, 8, 8, 8, 8, 7, 6]`:
  // eleven rows, sixteen pixels wide, tapered at BOTH ends, with the bottom
  // three gapped so the underside was concave. Wider than it was tall, with two
  // lobes hanging either side of the trunk. A bean.
  //
  // "Trees stand up" resampled every region's crown to the new height, and this
  // row came out `[5, 7, 8 ×15, 7]` — the taper at the bottom simply gone. What
  // is on screen now is a pink box with the corners off, which is the failure the
  // row's own note in content/biomes.ts warns about in as many words ("at
  // fourteen rows the same 16px of width came out as a tall pink box with a slot
  // cut in it. Wide is a ratio, not a number").
  //
  // THE CONSTRAINT THAT MAKES THIS A CHOICE RATHER THAN A REVERT: a crown may
  // never exceed 8 half-widths (render/palette.test.ts — past a tile wide a tree
  // draws over its neighbours' trunks, and this region plants in close rows). So
  // "wider" is unavailable and the ratio can only be got back by making the crown
  // SHORTER. Every candidate below therefore trades crown rows for bare stem, and
  // what is really being chosen between is how much bole a cherry may show before
  // it reads as a lollipop.
  //
  // B–E all keep the tree's total height at 31px, which is what "keep the current
  // size" means: rows + trunkHeight - overlap, the same sum the renderer takes
  // the sprite's height from.
  //
  // SETTLED: C WON and is now form zero in content/biomes.ts — the old profile
  // resampled properly over the full eighteen rows, keeping the big crown. The
  // three that lost are kept here because they all say the same useful thing: a
  // rounder outline at this width can only be bought with crown rows, and every
  // row spent shows up as bare bole. B, D and E are that trade at three prices,
  // and all three read as an orchard tree with a clear stem rather than as this
  // region's one enormous flowering thing.
  blossom: {
    note: "cherry — settled: C, the old profile at the new height",
    forms: [
      // B — THE OLD CROWN VERBATIM, on a stem long enough to hold the height.
      // The eleven rows that shipped before the boost, unchanged, with the bare
      // stem carrying the other twenty. The purest answer to "go back to that"
      // and the one most at risk of the lollipop.
      {
        rows: [4, 7, 8, 8, 8, 8, 8, 8, 8, 7, 6],
        gaps: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        overlap: 3,
        trunkHeight: 23,
      },
      // (C shipped — it is form zero in content/biomes.ts now, and the page
      // always draws form zero as A, so it is not repeated here.)
      // D — THE MIDDLE. Thirteen rows: wider than it is tall by a little, a full
      // taper at both ends, and the notch four rows deep so the two lobes are
      // unmistakable at a glance rather than on inspection.
      {
        rows: [4, 6, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6],
        gaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        overlap: 4,
        trunkHeight: 22,
      },
      // E — THE FATTEST BEAN. Twelve rows, held at full width for over half of
      // them and dropping fast at both ends, with the deepest underside here.
      // The cutest of the four and the one furthest from a tree.
      {
        rows: [3, 6, 8, 8, 8, 8, 8, 8, 8, 8, 7, 5],
        gaps: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
        overlap: 4,
        trunkHeight: 23,
      },
    ],
  },
};
