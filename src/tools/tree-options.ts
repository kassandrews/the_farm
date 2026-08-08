// PROPOSALS. Six silhouettes per region, drawn side by side so they can be
// chosen between rather than argued about — the thing a single shipped tree per
// region can never show you.
//
// NOT CONTENT. Nothing here is in the game: `/trees.html` hangs these off the
// region as extra `crownAlt` forms when its "candidates" switch is on, and the
// switch is off by default. When one is picked it gets MOVED into
// content/biomes.ts with a note saying why it won, and the loser rows stay here
// only as long as they are still live options.
//
// Form A of each region is the one currently shipped, quoted, so the comparison
// includes the incumbent. B onward are the alternatives.
//
// Every row obeys the rules content/biomes.ts states, so any of them can ship
// without a second thought: half-widths, integer, never past 8, a 0 only where
// `spar` reaches it and never on row 0, `spar` at most two thirds of the crown's
// live length, and a girth within a pixel of form A's (the species rule).

import type { TreeShape } from "../content/biomes";

/** The five alternatives to each region's shipped tree, in the order they are
 *  planted — so the strip reads A (shipped), B, C, D, E, F from the left. */
export const OPTIONS: Record<string, { note: string; forms: TreeShape[] }> = {
  granite: {
    note: "Jeffrey pine on a dome",
    forms: [
      // B — THE FLAT-TOPPED ONE, which is what is shipped as the second form
      // today. A conifer at altitude loses its leader to lightning or a hard
      // winter and regrows broad and headless.
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
      // C — THE PARASOL. One heavy plate carried near the top and small ones
      // under it: the shape an old yellow pine takes when it has shed its lower
      // whorls and thrown everything into a flat head. The most distinctive
      // outline here and the least tree-like if you dislike it.
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
      // D — THE YOUNG ONE. Dense, narrow, unbroken, foliage carried low. No
      // spar at all, so no trunk shows inside it — this is the control, and the
      // answer to "were the breaks a good idea".
      {
        rows: [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 5, 5],
        overlap: 5,
        // STATED, NOT OMITTED: a form that leaves `spar` out inherits the
        // REGION's (§treeForms), so the control that is meant to show no trunk
        // at all came out with a window of bark in the middle of it.
        spar: 0,
        trunkHeight: 22,
      },
      // E — THE BEATEN-UP ONE. Squat, wide, big breaks, nothing symmetrical
      // about the plate sizes. A tree that has had a bad century on bare rock.
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
      // F — THE OPEN ONE. Tall, tiered all the way, more air than foliage in the
      // bottom half. The most "there is a trunk in there" of the six.
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

  redwoods: {
    note: "coast redwood",
    forms: [
      // B — THE GROVE TREE. Grown in a closed stand: narrow, almost unbroken,
      // and mostly bare bole, with two small plates low down. This is the one
      // that argues the wood should be columns rather than trees.
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
      // C — THE OLD ONE. No spire left, a broad ragged head, and long low limbs.
      // Closest of the six to the reference photograph.
      {
        rows: [
          4, 5, 5, 4, 6, 6, 5, 6, 6, 5, //
          0,
          5, 6, 6,
          0,
          4, 6, 5,
          0,
          6, 6, 6, 5,
          0,
          4, 5, 6, 5,
        ],
        overlap: 3,
        spar: 16,
        trunkHeight: 22,
      },
      // D — THE CANDELABRA. The top forks, which is a real and very redwood
      // thing: a damaged leader reiterates into two, and an old grove is full of
      // them. Uses the CLEFT that `crownGaps` has always allowed and nothing has
      // ever used (content/biomes.ts §crownGaps) — five rows parted at the top.
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
      // E — THE YOUNG ONE. A dense narrow cone with no breaks in it at all, and
      // the same control D is for the granite: this is roughly what shipped
      // before any of this, drawn properly.
      {
        rows: [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 5, 5, 4],
        overlap: 4,
        spar: 0, // see the granite's D — omitted means the region's
        trunkHeight: 27,
      },
      // F — THE VETERAN. A very long bole with a short, well-broken crown high
      // up on it. The most extreme of the six, and the one that makes the wood
      // read as a hall of pillars.
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
    ],
  },

  giants: {
    note: "giant sequoia",
    forms: [
      // B — THE YOUNG GIANT. A dense unbroken cone on an enormous bole, which is
      // what a sequoia that is merely a few centuries old actually looks like —
      // the ragged head is old age. No spar: the crown is solid.
      {
        rows: [
          1, 2, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7, 7, //
          8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4,
        ],
        overlap: 5,
        spar: 0, // see the granite's D — omitted means the region's
        trunkHeight: 46,
      },
      // C — THE BROKEN-TOP MONARCH. Flat, wide and heavy from the first row: the
      // very old ones have lost the top outright and are as broad as they are
      // pointed. The bushiest of the six.
      {
        rows: [
          5, 6, 6, 5, 7, 7, 6, 8, 8, 7, //
          0,
          6, 8, 8, 7,
          0,
          7, 8, 8, 8,
          0,
          6, 8, 8, 7, 6,
        ],
        overlap: 5,
        spar: 13,
        trunkHeight: 48,
      },
      // D — THE SPARSE VETERAN. Few plates, well apart, a great deal of bole.
      // The one that says "you cannot get round this tree" loudest and carries
      // the least foliage doing it.
      {
        rows: [
          2, 4, 5, 6, 6, 5, 7, 7, 7, //
          0,
          5, 6,
          0,
          6, 7, 7,
          0,
          5, 7, 6,
          0,
          6, 8, 7, 6,
        ],
        overlap: 5,
        spar: 13,
        trunkHeight: 44,
      },
      // E — THE BUSHY ONE. Nearly solid, one break only, held at full width for
      // most of its length. If "bushier than the coast redwood" should mean
      // MASS rather than plates, this is what that looks like.
      {
        rows: [
          2, 4, 5, 6, 7, 7, 7, 8, 8, 8, //
          8, 8, 8, 8, 8, 8, 8, 8, 7, 8,
          8, 8, 7,
          0,
          7, 8, 8, 7, 6, 5,
        ],
        overlap: 5,
        spar: 8,
        trunkHeight: 40,
      },
      // F — THE WIDE-CROWNED ONE. Every plate at or near full width and five of
      // them: the largest canopy the 8-half-width ceiling can buy, on the
      // shortest bole of the six.
      {
        rows: [
          3, 5, 6, 7, 7, 6, 8, 8, 8, 7, 8, 8, 8, //
          0,
          7, 8, 8, 8, 7,
          0,
          6, 8, 8, 8, 7,
          0,
          7, 8, 8, 8, 7, 6,
        ],
        overlap: 5,
        spar: 17,
        trunkHeight: 38,
      },
    ],
  },
};
