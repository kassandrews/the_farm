// Furniture art, as char grids. Content is data (CLAUDE.md): a piece's
// SILHOUETTE is a row in this table, not a `case` in the renderer.
//
// The format and the reasoning are in `render/furnishings.ts`. In short: `.` is
// transparent, `k` is the shared outline ink, and `c` / `t` / `s` are not
// colours but questions — they resolve to the piece's finish (`color`, `top`,
// `shade`) when the grid is rasterized, so one grid serves all thirteen
// finishes. Any other char is a literal declared in the piece's own palette,
// which is how a brass lamp head stays brass in a walnut room.
//
// A grid is `w * TILE` wide and `rise + h * TILE + height` tall, and hangs from
// the anchor cell's top-left lifted by `height + rise`. That is exactly the box
// the old procedural path drew, plus `rise` — so a piece can move to art on its
// own, and anything without a row here keeps the box.
//
// AUTHORING NOTE, learned from the icons: draw the thing, not a shaded
// rectangle. What made the build-bar icons legible at 12px was legs, gaps and a
// visible back — negative space inside the footprint. A grid that fills its
// whole box is the box with extra steps.

import type { FurnitureId } from "./furniture";
import type { Grid, PieceArt } from "../render/furnishings";
import { INK } from "../render/furnishings";

/** Pieces drawn from art. Partial ON PURPOSE and permanently: `noticeboard` and
 *  `stage` are town fixtures whose procedural cases already say what they are,
 *  and the lamp leaves the generic path before this is ever consulted. A missing
 *  row is a piece that has not been converted, not a bug. */
// The back of a box, for the three pieces that are one.
//
// A wardrobe, a bookcase and a chest have exactly one face worth drawing and
// five that are panelling. Until now they shipped only `s`, so `gridFor()`
// served the front view for every facing and a wardrobe turned to the wall
// still showed you its doors and its handle — the one place the fallback
// actively lies, because these are pieces you can walk behind.
//
// ONE grid each, used for `n` AND `e` with `mirrorW`, rather than three —
// authoring three identical grids is three chances to typo the same picture.
//
// THE WARDROBE HAS SINCE EARNED A SECOND, and the argument that argued against
// it is worth keeping because of exactly where it was wrong. It said: on a
// one-tile footprint the side of a wardrobe IS its back, same width, same
// panel. Same PANEL, yes. Not the same WIDTH — a wardrobe is about half as deep
// as it is wide, and drawing sixteen pixels of front as sixteen of depth made
// the piece a cube from every side. A one-tile footprint is what a piece may
// occupy, never what it must fill. See `WARDROBE_SIDE`.
//
// The bookcase and the chest keep one grid each: both are genuinely about as
// deep as they are wide, which is why the rule held for them.
//
// The BOOKCASE is the exception, and by one row: its plinth is proud front and
// back and flush down the sides, which is a rail across two faces rather than a
// box the carcass stands in. So it gets two grids off one builder — the shared
// rows stay shared, and the difference is the argument you pass.
//
// Painted in the finish's `s` (shade) rather than its `c`, which is what makes
// the turn legible at a glance. Every one of these pieces already uses `c` for
// the face that catches the light and `s` for the plinth beneath it; a panel
// that is shade all the way up reads as the side of the object that is turned
// away, without inventing a single new colour.

/** And from either END. A wardrobe is WIDER THAN IT IS DEEP — about half as
 *  deep as it is wide, which is what stops a tall box being a tower. Turned, it
 *  had been drawing its front's full sixteen pixels of width as its depth as
 *  well, so the piece was a cube from every side.
 *
 *  Ten pixels of plinth over eight of carcass, the same one-pixel notch the
 *  front has, and the same legs at the same corners. Shade throughout, for
 *  `WARDROBE_BACK`'s reason. */
const WARDROBE_SIDE: Grid = {
  rows: [
    "..kkkkkkkkkkkk..",
    "..kttttttttttk..",
    "..kssssssssssk..",
    "..kkkkkkkkkkkk..",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "...kssssssssk...",
    "..kkkkkkkkkkkk..",
    "..kssssssssssk..",
    "..kssssssssssk..",
    "..kkkkkkkkkkkk..",
    "...kck....kck...",
    "...kck....kck...",
    "...kck....kck...",
    "...kkk....kkk...",
  ],
  palette: { k: INK },
};

/** Wardrobe seen from BEHIND: cornice, plain panel, feet. */
const WARDROBE_BACK: Grid = {
  rows: [
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kssssssssssssssk",
    "kkkkkkkkkkkkkkkk",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    "kkkkkkkkkkkkkkkk",
    "kssssssssssssssk",
    "kssssssssssssssk",
    "kkkkkkkkkkkkkkkk",
    ".kck........kck.",
    ".kck........kck.",
    ".kck........kck.",
    ".kkk........kkk.",
  ],
  palette: { k: INK },
};

/** Bookcase turned away: no books, no shelf edges, but the plinth line stays —
 *  without it the back is one thirty-row slab and the piece loses the
 *  proportion its front view has.
 *
 *  `plinth` is the ONLY row that differs between the two turned views, so it is
 *  the only thing this takes. Everything else is the same panel and stays that
 *  way by construction. */
function shelfTurned(plinth: string): Grid {
  return {
    rows: [
      ".kkkkkkkkkkkkkk.",
      ".kttttttttttttk.",
      ".kssssssssssssk.",
      ".kssssssssssssk.",
      ".kkkkkkkkkkkkkk.",
      ...Array<string>(20).fill("..kssssssssssk.."),
      ".kkkkkkkkkkkkkk.",
      ...Array<string>(8).fill(plinth),
      ".kkkkkkkkkkkkkk.",
      "...kk......kk...",
      "...kk......kk...",
      "...kk......kk...",
    ],
    palette: { k: INK },
  };
}

/** From behind, the plinth is the FULL WIDTH, as it is in front. Inset to the
 *  carcass's twelve it left the fourteen-wide rule above it standing out over a
 *  narrower box on both sides — a line poking out of the piece with a rectangle
 *  hung under it, rather than the base the front view has. */
const SHELF_BACK = shelfTurned(".kssssssssssssk.");

/** From the side it stays INSET, which is the same plinth and not a second
 *  opinion about it: the rail runs across the front and the back, and does not
 *  return down the sides. So the side view shows the carcass reaching the floor
 *  with the rail's end grain as a line across it, which is what the joint looks
 *  like — and it is the reading the piece had before the back was corrected,
 *  which was worth keeping. */
const SHELF_SIDE = shelfTurned("..kssssssssssk..");

/** Chest from behind. The lid keeps its rim — a lid is a lid from every side,
 *  and it is the rim rather than the clasp that says "this opens". */
const CHEST_BACK: Grid = {
  rows: [
    "................",
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    ".kttttttttttttk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kkkkkkkkkkkkkk.",
    ...Array<string>(15).fill(".kssssssssssssk."),
    ".kkkkkkkkkkkkkk.",
  ],
  palette: { k: INK },
};

const BLANK16 = "................";
const BLANK32 = "................................";

/** The fireplace's hearth, front and back: the slab the masonry stands on.
 *
 *  PROUD OF THE BODY rather than tucked under it. It used to be 28 against a
 *  body of 30 — a mass standing on something narrower than itself, which is a
 *  plinth a stonemason would not have cut and reads as the piece tapering into
 *  the floor. The side view had it right all along at 14 against a body of 12,
 *  so the two views were disagreeing about one slab; this is the front and back
 *  agreeing with the side, a pixel out on either hand.
 *
 *  Flush to the edge of the footprint, which is what a hearth wants to be: it is
 *  the one part of the piece that is floor rather than furniture, and two
 *  fireplaces side by side should meet along it.
 *
 *  ITS TOP RULE IS THE BODY'S BOTTOM ONE. The masonry used to close itself with
 *  a rule of its own and then the hearth opened with another directly under it,
 *  which is two lines drawn along one joint: a 2px band, and the lower pixel a
 *  pixel wider on each side than the one above it. One line, carried the
 *  hearth's full width, is both the drawing and the joint — the body sits ON
 *  this, so the line where they meet belongs to the two of them at once. */
const HEARTH = [
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kssssssssssssssssssssssssssssssk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
];

/** The rug itself: border, band, panel, and no fringe on any edge.
 *
 *  Twenty-nine rows, and 27 columns starting at column 2 — which leaves two
 *  spare columns at each side of a 32-wide grid for the fringe to hang in, and
 *  gives both spans a centre the tassels can be symmetric about. */
const RUG_BODY = [
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkk...",
  "..ktttttttttttttttttttttttttk...",
  ...Array<string>(7).fill("..kttcccccccccccccccccccccttk..."),
  ...Array<string>(11).fill("..kttccccsssssssssssssccccttk..."),
  ...Array<string>(7).fill("..kttcccccccccccccccccccccttk..."),
  "..ktttttttttttttttttttttttttk...",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkk...",
];

/** The cut warp ends, every other column, fourteen of them across the body. */
const RUG_FRINGE = "..k.k.k.k.k.k.k.k.k.k.k.k.k.k...";

/** The same tassels turned a quarter: down the left and right edges instead of
 *  across the near and far ones, on every other ROW of the body.
 *
 *  ON THE ODD ROWS, which is what keeps the corners off the rug's own rules. The
 *  near and far fringe hangs in rows OUTSIDE the body, so a tassel under a
 *  corner reads as a tassel; a side tassel on the body's top rule is collinear
 *  with it and just makes that one row four pixels wider than the rug, which
 *  reads as a bar sticking out of the far edge rather than as thread. Skipping
 *  the two rule rows leaves fourteen — the same count the near edge has, and
 *  symmetric about the body's centre row.
 *
 *  Derived from the body rather than authored, so the rug turned is provably the
 *  same rug — the twenty-nine rows cannot drift, and the fringe cannot land on a
 *  different rhythm from the one the near edge uses. */
function rugSelvedge(rows: string[]): string[] {
  return rows.map((row, i) => (i % 2 === 1 ? `kk${row.slice(2, 29)}kk.` : row));
}

/** The fireplace's mantel shelf, front and back: proud of the breast the way
 *  the hearth is, and for the same reason. A shelf that stops flush with the
 *  mass under it is not a shelf, it is a change of colour — there is nowhere to
 *  stand a candle. One pixel out on either hand, matching the hearth exactly, so
 *  the piece reads as a mass with a slab over it and a slab under it.
 *
 *  The BACK gets the same shelf. The overhang that is visible from behind is the
 *  side overhang, and a mantel does not stop having sides when you walk round
 *  it; only its front edge is hidden, and that edge is against the wall. */
const MANTEL = [
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kttttttttttttttttttttttttttttttk",
  "kttttttttttttttttttttttttttttttk",
  "kssssssssssssssssssssssssssssssk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
];

/** The chair's slatted back, drawn ONCE and spread into both views that show it.
 *
 *  It is the same panel from either side and a vertical thing projects to the
 *  same height whichever way you look at it, so front and north cannot disagree
 *  about how many rows it is, how many rungs are in it, or that the rungs stop a
 *  pixel short of the rule at both ends. They did disagree — three times, each
 *  time because the view was authored as its own block of strings and the rows
 *  drifted. Sharing them makes the agreement structural rather than remembered.
 *
 *  What differs between the views is only WHERE THIS SITS, which is the whole of
 *  what turning a chair does to it. */
const CHAIR_BACK = [
  "..kkkkkkkkkkkk..",
  "..kttttttttttk..",
  ...Array<string>(10).fill("..kccckcckccck.."),
  "..kssssssssssk..",
  "..kkkkkkkkkkkk..",
];

/** The bench's back rail, drawn ONCE and spread into the two views that show it
 *  flat on — the chair's argument, and the bench had the bug the chair's shared
 *  panel exists to prevent: nine rows in front, twelve from behind.
 *
 *  Its LAST ROW IS THE JOINT, not a rule of its own. The seat below it starts at
 *  its top surface, so the rail's foot and the seat's top edge are one line of
 *  ink and the two read as one silhouette. */
const BENCH_BACK = [
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ".kttttttttttttttttttttttttttttk.",
  ...Array<string>(6).fill(".kcccccccccccccccccccccccccccck."),
  ".kssssssssssssssssssssssssssssk.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
];

/** The table's two views, named because the coffee table IS them — see its
 *  row. They were authored twice and drifted: the table reached its own cells
 *  edge to edge with legs at the corners, and the copy was inset a pixel all
 *  round, chamfered along its top rule, and stood on legs pulled three pixels
 *  further in. Two objects, one of which claimed in its own comment to be the
 *  other. */
/** Brass, for a drawer pull — the one thing on a desk that is not its timber.
 *  A literal rather than a trim char: `d` is palette-declared, and TRIM_KEY only
 *  speaks C/T/S. */
const BRASS = "#9c7a2c";

/** Bed linen. The double bed had these two literals inline and the cot now
 *  wants the same pillow, and a pillow that is a different white on the bed
 *  from the cot is two objects' worth of laundry. */
const LINEN = "#fbf7ef";
const LINEN_SHADE = "#cfc7b6";

/** The nightstand from behind or from either end: the same carcass with its
 *  drawer seams and pulls not drawn, and its body in shade. Named because two
 *  facings share it and a third mirrors it. */
const NIGHTSTAND_BLIND = [
  "................",
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  "..kttttttttttk..",
  "..kcccccccccck..",
  "..kcccccccccck..",
  "..kssssssssssk..",
  "..kkkkkkkkkkkk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kssssssssssk..",
  "..kkkkkkkkkkkk..",
  "..kck......kck..",
  "..kck......kck..",
  "..kck......kck..",
  "..kck......kck..",
  "..kkk......kkk..",
];

const TABLE_FRONT = [
  "................................",
  "................................",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kttttttttttttttttttttttttttttttk",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kcccccccccccccccccccccccccccccck",
  "kssssssssssssssssssssssssssssssk",
  "kssssssssssssssssssssssssssssssk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kck........................kck.",
  ".kkk........................kkk.",
];

const TABLE_SIDE = [
  "................",
  "................",
  "kkkkkkkkkkkkkkkk",
  "kttttttttttttttk",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kcccccccccccccck",
  "kssssssssssssssk",
  "kssssssssssssssk",
  "kkkkkkkkkkkkkkkk",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kck..........kck",
  "kkk..........kkk",
];

/** Take rows out of a piece's legs, leaving everything above them alone.
 *
 *  The last row is the feet and stays; what goes is shaft, which is why this
 *  can be a slice rather than a redraw. It is the whole difference between a
 *  table and a coffee table, so it is written once here instead of being a
 *  second drawing that has to be kept in step with the first. */
function shorterLegs(rows: string[], by: number): string[] {
  return [...rows.slice(0, rows.length - 1 - by), rows[rows.length - 1]];
}

export const FURNITURE_ART: Partial<Record<FurnitureId, PieceArt>> = {
  // A CHAIR IS THE TEST CASE, because it is the piece whose icon and whose world
  // drawing disagreed most. The icon has a back and four legs; the world had a
  // 16x30 block with a 3px band painted along its far edge, which is a chair
  // only if you already know it is one.
  //
  // Six of rise, and no more. `hides()` fades art that overhangs by more than
  // half a tile, and a chair that made the player see-through when they stood
  // behind it would be the occlusion machinery firing on the wrong furniture.
  // Six is enough for a back to read as standing over the seat rather than
  // painted on it, which is the whole job.
  chair: {
    rise: 6,
    mirrorW: true,
    // BACK AND SEAT ARE ONE SILHOUETTE. They used to be two stacked boxes of
    // different widths — a 10-wide back on a 12-wide seat — each carrying its own
    // outline, which met as a DOUBLED line where they touched. Same width, one
    // continuous pair of sides, and a single rule between them.
    //
    // A POST THE WIDTH OF A LEG, in the leg's own columns: on a chair the back
    // stile IS the rear leg carried up, and at four pixels against a three-pixel
    // leg it read as a plank bolted on behind.
    //
    // THE BACK RUNS THE FULL DEPTH OF THE SEAT, its two edges carrying on down to
    // the seat's own bottom rule, which closes both at once. Stopping the post
    // partway left a stub sitting on the surface; taken all the way it reads as
    // the frame the seat is fixed to, which is what it is.
    //
    // Its top lands on the same row as the front view's, so the two views agree
    // about how tall a chair is.
    //
    // FROM THE NORTH THE SEAT IS BEHIND THE BACK, which turning the chair moves
    // to the seat's NEAR edge. The front view states every number: thirteen rows
    // of back above its foot, a seat plane ten rows deep, six rows of leg. Swing
    // the back to the near edge and its foot lands on the row the front view
    // rules the seat's underside on, with the same six rows of leg below it. The
    // seat plane recedes ten rows up from that foot and the back covers all ten,
    // clearing its far edge by three; the front legs, ten rows off in the same
    // columns, are behind the panel too. The seat used to be drawn ABOVE the
    // back, in rows nothing occupies — the back given depth but no height.
    //
    // What is left of the seat is its REAR RAIL, the thin box under the panel:
    // two rows of surface between the panel's foot and the seat's own underside
    // rule, and then the leg gap. Nothing is nearer the camera there, so it is
    // drawn as seat rather than as more slat — and without it the rungs ran into
    // the leg tops and the piece read as a panel on stumps.
    //
    // The panel stands ON the rail, not in it. Its foot is the seat's TOP
    // surface; the rail's thickness hangs BELOW that, so nothing of the panel is
    // covered and it is the same fourteen rows here as in front — see
    // `CHAIR_BACK`, which both views spread rather than each authoring their
    // own. Sinking the foot to the underside rule instead cost the panel three
    // rows, and a back three rows short with two rungs missing out of it does
    // not read as the same chair turned round. It reads as a different chair.
    //
    // So the north view is TALLER THAN ITS SEAT NEEDS, starting three rows above
    // where the rail does. That is the panel's real height arriving intact.
    //
    // So the north silhouette is TEN ROWS SHORTER than the front one, and that
    // is the projection working rather than the views disagreeing: from the
    // front the back is the far thing, and its distance is added to its height.
    //
    // TURNED, THE BACK CROSSES THE SEAT. It used to be a narrow box stacked on
    // top of a wider one, which is not what a chair does from the side: the post
    // rises out of the seat's own back edge, so it shares that edge's column and
    // overlaps the first rows of the surface rather than balancing on them.
    //
    // Slats are two columns of the OUTLINE INK rather than two of transparency.
    // At this size a 1px gap is a dot, and a back with dots on it reads as a
    // panel somebody has drilled; a 1px line reads as an upright.
    //
    // A TALL BACK OVER A SHALLOW SEAT, which is the proportion a dining chair
    // has and the reverse of what this had: seventeen rows of seat under twelve
    // of back, so it read as a low tub chair with a board behind it. Ten of seat
    // now, and the back takes what it gave up.
    //
    // Legs at the SEAT'S CORNERS and shorter than they were. Inset three pixels
    // they stood under the middle of the seat, which is a stool's geometry.
    s: {
      rows: [
        ...Array<string>(5).fill("................"),
        ...CHAIR_BACK,
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kkk......kkk..",
      ],
      palette: { k: INK },
    },
    n: {
      rows: [
        ...Array<string>(12).fill("................"),
        ...CHAIR_BACK,
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kkk......kkk..",
      ],
      palette: { k: INK },
    },
    e: {
      rows: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "..kkk...........",
        "..ktk...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kck...........",
        "..kckkkkkkkkkk..",
        "..kckttttttttk..",
        "..kckcccccccck..",
        "..kckcccccccck..",
        "..kckcccccccck..",
        "..kckcccccccck..",
        "..kckcccccccck..",
        "..kckssssssssk..",
        "..kckssssssssk..",
        "..kckssssssssk..",
        "..kkkkkkkkkkkk..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kkk......kkk..",
      ],
      palette: { k: INK },
    },
  },

  // A CUSHION had no case at all in the old switch — a bare 16x20 block four
  // pixels tall, which is a doorstep. Round, squashed, and dented in the middle,
  // because the one thing a cushion has to say is that it would give if you sat
  // on it.
  //
  // THE DENT IS SHADE, not a hole. It was authored as transparent — four cells
  // of `.` in the middle of the piece — so what showed through the dimple was
  // the FLOOR, and a brown bar across a cream cushion reads as neither a fold
  // nor a floor but as a piece drawn out of two materials. A dent is a place
  // where the surface is further away, which is what `s` is for; the cushion
  // already uses it for the rows that turn under.
  //
  // No facings. A cushion has no front, and authoring four identical grids to
  // say so would be four times the chance of them drifting apart.
  cushion: {
    s: {
      rows: [
        ...Array<string>(12).fill("................"),
        "......kkkk......",
        "....kkttttkk....",
        "...kttccccttk...",
        "...kccsssscck...",
        "...kcccccccck...",
        "...kssssssssk...",
        "....kksssskk....",
        "......kkkk......",
      ],
      palette: { k: INK },
    },
  },

  // A chair with the back taken off, and drawn as exactly that.
  //
  // ITS LEGS ARE THE CHAIR'S, SEVEN ROWS. They were eleven, which made the one
  // claim the piece exists to make come out backwards: the def calls a stool
  // "lower than a chair (14) because that difference IS the object", and four
  // extra rows of leg put its seat FOUR PIXELS HIGHER off the floor than the
  // chair's. Two seats in the same room disagreeing about how far a seat is off
  // the ground is the sort of thing you feel before you can name it. Seven now,
  // measured the same way — from the seat's own bottom rule to the feet — so the
  // two pieces agree about sitting height and differ only in having a back.
  //
  // A ROUND TOP, AND THEREFORE ONE GRID. Every facing falls back to this one,
  // which is only honest if the piece has no front — the cot's argument
  // (ROADMAP §the three missing north grids turn out to be two). A circle seen
  // from any side is the same circle, so the fallback is the drawing rather than
  // a drawing not done yet. The alternative was a square seat, which would have
  // needed a turned view: a square is wider across its diagonal than its face,
  // and one grid for all four facings would then be a lie you could measure.
  //
  // It reads round by TAPERING AT BOTH ENDS — 8, 10, 12 and back — rather than
  // by rounding the corners of a rectangle. What was here before was twelve
  // straight rows with two rows of easing at each end, which is a rounded square:
  // the eye reads the long parallel sides and calls it a box. Three rows of
  // curve against four of straight is what makes it a drum.
  stool: {
    s: {
      rows: [
        ...Array<string>(6).fill("................"),
        "....kkkkkkkk....",
        "...kttttttttk...",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "...kssssssssk...",
        "....kkkkkkkk....",
        ...Array<string>(6).fill("....kck..kck...."),
        "....kkk..kkk....",
      ],
      palette: { k: INK },
    },
  },

  // A SEAT WITH A RAIL BEHIND IT, drawn as one piece of furniture rather than as
  // a rail parked on a bench. The chair's rule, arrived at the same way and for
  // the same reasons (see `CHAIR_BACK` and the note above `chair`):
  //
  // BACK AND SEAT ARE THE SAME WIDTH, so their sides are one continuous pair.
  // The back was twenty-eight wide on a thirty-wide seat, which is a smaller box
  // balanced on a bigger one — the shape of a crate with a lid, not of a bench.
  //
  // THEY OVERLAP AT THE OUTLINE. Each used to close itself, so the back's foot
  // rule and the seat's top rule sat in adjacent rows and met as a DOUBLED line
  // across the middle of the piece — two pixels of ink saying one joint, which
  // reads as two objects touching. One rule now, shared: the back's foot IS the
  // seat's top edge, which is what makes the rail rise out of the seat.
  //
  // Merging the two saved a row, and the back takes it — one more row of face
  // rather than one less row of bench. The piece is the same thirty-one rows it
  // has always been.
  //
  // THE BACK IS DRAWN ONCE AND SPREAD. It was authored twice and the two copies
  // disagreed: nine rows from the front and twelve from behind, so the bench was
  // taller seen from the north than from the south. A vertical thing projects to
  // the same height whichever way you look at it — the defect this catalogue
  // keeps producing, and the same fix as the chair's back, the bookcase's plinth
  // and the fireplace's hearth.
  //
  // LEGS AT THE SEAT'S CORNERS, their outer column the seat's own outline, which
  // is where the chair's stand. Inset two they stood under the seat rather than
  // at its ends, and a long seat on inboard legs reads as a plank on trestles.
  //
  // FROM THE NORTH the back is the near thing and the seat is behind it, so the
  // panel covers the whole receding surface and only the seat's thickness shows
  // below — the chair's arithmetic exactly: the panel's foot lands at the near
  // end of the surface, and the eight rows of sky above it are the projection
  // working, not the two views disagreeing.
  bench: {
    rise: 4,
    mirrorW: true,
    s: {
      rows: [
        ...BENCH_BACK,
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kkk........................kkk.",
      ],
      palette: { k: INK },
    },
    n: {
      rows: [
        ...Array<string>(8).fill(BLANK32),
        ...BENCH_BACK,
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kck........................kck.",
        ".kkk........................kkk.",
      ],
      palette: { k: INK },
    },
    // TURNED, THE RAIL RUNS THE WHOLE EDGE. It was a stub in the far corner —
    // four columns of rail hanging over one end of a plain box, which reads as a
    // chimney on a crate. Seen from the side the rail is the thing that recedes:
    // it runs the bench's whole length, so it is a band down the entire west
    // edge, top surface and all, standing the same nine rows above the seat that
    // `BENCH_BACK` does.
    //
    // THE CHAIR'S CONSTRUCTION, PART FOR PART. Its post shares its ink column
    // with the seat's back edge and carries on down to the seat's own bottom
    // rule rather than balancing on the surface; so does this. Three columns
    // wide, not four, because the leg is three and a rail wider than its own
    // post reads as a plank bolted on behind.
    //
    // AND THE REAR LEG FALLS OUT OF IT. The band lands in the columns the near
    // leg already occupies, so the rail is the leg carried up — which is what
    // the chair settled and how a bench is actually built. The far pair of legs
    // is behind the seat and is not drawn.
    //
    // The seat's own rows are untouched: the rail eats two columns of surface
    // and nothing else moves.
    e: {
      rows: [
        ".kkk............",
        ".ktk............",
        ".kck............",
        ".kck............",
        ".kck............",
        ".kck............",
        ".kck............",
        ".kck............",
        ".kck............",
        ".kckkkkkkkkkkkk.",
        ".kckttttttttttk.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckcccccccccck.",
        ".kckssssssssssk.",
        ".kckssssssssssk.",
        ".kckssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kkk........kkk.",
      ],
      palette: { k: INK },
    },
  },

  // Arms at both ends, a back with a lit top roll, and two seat cushions with
  // a gap between them. The frame and feet are LITERAL timber while the upholstery
  // takes the finish, because a sofa is genuinely two materials and you only choose one.
  // A SOFA IS FOUR PIECES, and it was drawn as three stacked bands: a back, a
  // seat, a skirt, each closing itself. Flat, because nothing in it stood in
  // front of anything else.
  //
  // ONE RULE WHERE THE BACK MEETS THE SEAT. The back closed with its own rule
  // and the seat opened with another, so a two-pixel line ran the whole width of
  // the piece at exactly the height a sofa has no line at all. The bench's fix
  // and the chair's before it: one shared rule, and the row it saves goes to the
  // back's face rather than out of the sofa's height.
  //
  // THE ARMS ARE A SEPARATE PIECE, which is the whole of why this reads flat or
  // does not. They were three columns of cushion inside the seat band, top and
  // bottom flush with it — an arm exactly as tall as the thing it is supposed to
  // be holding in. Now they have their own top, five rows up into the back,
  // their own top surface, and their sides run unbroken from there THROUGH the
  // seat rule and the skirt to the floor. That is how a sofa is built: the arm
  // is a panel standing on the ground and the cushions sit between the two of
  // them.
  //
  // So three rules are interrupted rather than run wall to wall — the back's
  // foot, the seat's own, and the skirt's top. A line drawn across an arm at
  // seat height makes it a box again.
  //
  // FROM THE NORTH none of that shows: the back's rear face is the near surface
  // and it covers the arms whole, so that view keeps its plain panel and takes
  // only the merged rule. Its back is the same fifteen rows the front's is —
  // rule, top, eleven of face, shade, rule — so the two views agree about how
  // tall a sofa is.
  // A SOFA IS FOUR PIECES, and it was drawn as three stacked bands: a back, a
  // seat, a skirt, each closing itself. Flat, because nothing in it stood in
  // front of anything else and every plane in it was the same colour.
  //
  // ONE RULE WHERE THE BACK MEETS THE SEAT. The back closed with its own rule
  // and the seat opened with another, so a two-pixel line ran the whole width of
  // the piece at exactly the height a sofa has no line at all. The bench's fix
  // and the chair's before it: one shared rule, and the row it saves goes to the
  // back's face rather than out of the sofa's height.
  //
  // THE ARMS ARE A SEPARATE PIECE. They were three columns of cushion inside the
  // seat band, top and bottom flush with it — an arm exactly as tall as the
  // thing it is supposed to be holding in. Now they have their own top, five
  // rows up into the back, their own top surface, and their sides run from there
  // to the floor. The back's foot rule and the seat's both stop for them.
  //
  // BUT THE BASE RAIL DOES NOT, and that is the one rule that runs wall to wall.
  // The arms stand ON the base; it is a single plinth under the whole piece, so
  // its seam crosses them. A sofa whose every horizontal stopped at the arms
  // would be three separate objects pushed together.
  //
  // THE SEAT BAND IS THE CUSHION TOPS, which this says out loud for the first
  // time by drawing them in the top colour rather than the face colour. At this
  // camera you are looking slightly DOWN at a sofa: the thing filling that band
  // is horizontal, and it was painted the same tone as the two vertical planes
  // above and below it, which is most of why the piece read flat.
  //
  // AND CUSHIONS HAVE DEPTH — a seam, then two rows of face colour under the
  // tops, carrying the same divisions down, which is each cushion's front edge
  // turning under to the base. Two rows and not four: it is an edge, and at four
  // it stops being one and becomes a second row of cushion.
  //
  // THE SEAM IS INK, not a change of tone. Tone alone was tried first and could
  // not be seen: top against face is fourteen values at sixteen pixels, and
  // every other joint on this piece is drawn with a line. A cushion's front edge
  // is piped anyway.
  //
  // FROM THE NORTH the back's rear face covers the arms whole, so that view
  // keeps its plain panel; it takes the merged rule and the cushion tops, which
  // are the same tops seen over the back and cannot be a different colour from
  // this side. No front edge — that edge faces away. Its back is the same
  // fifteen rows the front's is, so the two views agree about how tall a sofa is.
  sofa: {
    rise: 4,
    mirrorW: true,
    s: {
      rows: [
        "................................................",
        "................................................",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kttttttttttttttttttttttttttttttttttttttttttttttk",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kkkkkkcccccccccccccccccccccccccccccccccccckkkkkk",
        "kttttkcccccccccccccccccccccccccccccccccccckttttk",
        "kcccckcccccccccccccccccccccccccccccccccccckcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kcccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kkkkkktttttttttttkttttttttttttktttttttttttkkkkkk",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kcccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcccck",
        "kcccckccccccccccckcccccccccccckccccccccccckcccck",
        "kcccckccccccccccckcccccccccccckccccccccccckcccck",
        "kcccckccccccccccckcccccccccccckccccccccccckcccck",
        "kcccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kccccksssssssssssssssssssssssssssssssssssskcccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "...kkk....................................kkk...",
      ],
      palette: { k: INK },
    },
    n: {
      rows: [
        "................................................",
        "................................................",
        "................................................",
        "................................................",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kccccktttttttttttkttttttttttttktttttttttttkcccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kttttttttttttttttttttttttttttttttttttttttttttttk",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "...kkk....................................kkk...",
      ],
      palette: { k: INK },
    },
    // Turned, the same doubled rule under the arm's stub, merged the same way.
    // The stub is the block the bench has just stopped being — a rail drawn at
    // the far end only, when what recedes from this camera IS the sofa's length.
    // Its own sitting.
    e: {
      rows: [
        "................",
        "................",
        "kkkkk...........",
        "ktttk...........",
        "kccck...........",
        "kccck...........",
        "kccck...........",
        "kccck...........",
        "kccck...........",
        "kccck...........",
        "kccckkkkkkkkkkkk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckkkkkkkkkkkk",
        "kccckcccccccccck",
        "kccckcccccccccck",
        "kccckcccccccccck",
        "kccckcccccccccck",
        "kccckcccccccccck",
        "kccckkkkkkkkkkkk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckkkkkkkkkkkk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckkkkkkkkkkkk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kccckttttttttttk",
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kttttttttttttttk",
        "kttttttttttttttk",
        "kkkkkkkkkkkkkkkk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // THE TABLE, FIVE ROWS OF LEG SHORTER, and now literally so. This row already
  // claimed to be "the table, seven pixels lower — nothing else changes, and
  // nothing else should", and its art said otherwise: a copy inset a pixel all
  // round, with a chamfer along its top rule the table has never had, standing
  // on legs pulled three pixels in from the corners the table stands on. The
  // same object drawn twice at two different widths, which is this catalogue's
  // recurring defect wearing the one disguise the comment ruled out.
  //
  // Five, not seven: the heights are 12 and 7, and the difference between them
  // is the number the drawing needs. Seven is what a coffee table IS, not how
  // far it was lowered — and the old note said both at once.
  //
  // Derived rather than authored, `CHAIR_BACK`'s argument: two statements of one
  // shape drift, and this pair had. Restyle the table and the coffee table
  // follows for free, which is what a set owes a form.
  coffeetable: {
    mirrorW: true,
    s: { rows: shorterLegs(TABLE_FRONT, 5), palette: { k: INK } },
    e: { rows: shorterLegs(TABLE_SIDE, 5), palette: { k: INK } },
  },

  // A TABLETOP WITH A DRAWER PEDESTAL UNDER ITS RIGHT HALF AND A KNEEHOLE UNDER
  // THE LEFT. That asymmetry is the entire silhouette difference from a table,
  // and it is the reason a desk is worth being its own row.
  //
  // SO IT STANDS ON THE TABLE'S OWN TOP, spread rather than copied. It had been
  // drawn a pixel narrower than the table with its top rule chamfered a pixel
  // further in and a slab a row thinner, at the same declared height — the
  // coffee table's bug in a second place, found the same way, and the same fix.
  //
  // THE KNEEHOLE LEG WAS TWO PIXELS TALL. A stub sat on the floor with an
  // eleven-row gap between it and the underside of the top, so the left half of
  // the desk floated. It is the table's leg now, full height, in the table's own
  // columns: a desk is a table with one of its ends boxed in, and the end that
  // is not boxed in still has to hold the top up.
  //
  // THE PEDESTAL HANGS FROM THE TOP AND REACHES THE FLOOR, sharing the slab's
  // bottom rule rather than opening with one of its own, and its outer side
  // lands in the leg's outer column so the two supports are inset alike.
  //
  // FROM THE NORTH it changes sides and shows its BACK — shade all the way, no
  // pulls, no drawer seams (ROADMAP §the three missing north grids). It keeps
  // the two horizontals it is entitled to, and they are the slab's rule above
  // and its own plinth below, which is `SHELF_BACK`'s rule about a carcass
  // needing its proportion stated.
  //
  // TURNED, THE PEDESTAL IS THE FAR SIDE AND THE LEGS ARE IN FRONT OF IT, which
  // is the whole of what this view is. Drawn the other way round first — a full
  // side panel at the near end — and it was a crate: the pedestal is at the desk's
  // far half, its floor is sixteen rows up the screen from the near one, so it
  // sits ENTIRELY BEHIND the top and cannot be seen at all.
  //
  // So this is the table's side view, legs and all, with five rows of shade
  // between them: the hint of a mass in the gloom under the desk, which is
  // exactly how much of a pedestal you get from this angle — RULED OFF AT THE
  // BOTTOM, because that is where the thing meets the floor and every other edge
  // in this catalogue is drawn. The rule stops at the legs, which stand in front
  // of it.
  //
  // The old grid drew a drawer pull here, which reads well and is a drawer
  // fitted to a face the camera never sees.
  desk: {
    s: {
      rows: [
        ...TABLE_FRONT.slice(0, 16),
        ".kck.............kcccccccccccck.",
        ".kck.............kcccccccccccck.",
        ".kck.............kccccddddcccck.",
        ".kck.............kcccccccccccck.",
        ".kck.............kcccccccccccck.",
        ".kck.............kkkkkkkkkkkkkk.",
        ".kck.............kcccccccccccck.",
        ".kck.............kcccccccccccck.",
        ".kck.............kccccddddcccck.",
        ".kck.............kcccccccccccck.",
        ".kck.............kcccccccccccck.",
        ".kkk.............kkkkkkkkkkkkkk.",
      ],
      palette: { k: INK, d: BRASS },
    },
    n: {
      rows: [
        ...TABLE_FRONT.slice(0, 16),
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kssssssssssssk.............kck.",
        ".kkkkkkkkkkkkkk.............kkk.",
      ],
      palette: { k: INK },
    },
    e: {
      rows: [
        ...TABLE_SIDE.slice(0, 31),
        "kcksssssssssskck",
        "kcksssssssssskck",
        "kcksssssssssskck",
        "kcksssssssssskck",
        "kckkkkkkkkkkkkck",
        ...TABLE_SIDE.slice(36),
      ],
      palette: { k: INK },
    },
    // AND WEST IS NOT EAST MIRRORED, which is why this piece cannot have
    // `mirrorW`. Every other asymmetric row in the table is asymmetric ACROSS
    // the screen, and a mirror is exactly right for those. A desk's asymmetry
    // runs along its own length, so turning it the other way does not flip the
    // picture — it swaps which end is NEAREST. From here the pedestal is the near
    // end: its face fills the view, the legs are behind it, and the shade the
    // east view hints at is the thing you are now looking straight at.
    w: {
      rows: [
        ...TABLE_SIDE.slice(0, 31),
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
      ],
      palette: { k: INK },
    },
  },

  // A LITTLE CHEST OF DRAWERS, and the drawers are the DESK'S — same five-row
  // fronts, same three-pixel brass pull centred in each, same seam between them.
  // A nightstand and a desk pedestal are the same object at two sizes, and this
  // one was drawing its drawers a different way: the pull rows were INSET A
  // PIXEL EACH SIDE, so the carcass stepped in and out again twice down its own
  // face. At this scale that is not a moulding, it is a wobble in the outline.
  //
  // Legs at the carcass's corners, three wide with their own edges, where they
  // were two bare pixels of ink with no outline and no foot — the chair's rule,
  // and the bench's after it.
  //
  // BLIND FROM EVERY OTHER SIDE. A box with pulls on all four faces is a box
  // with pulls on all four faces; from behind and from either end this is a
  // carcass, so the seams and the brass stop being drawn and the body goes to
  // shade — the wardrobe's rule (ROADMAP §the three missing north grids). It
  // keeps the top and the plinth, which is what stops it reading as a block:
  // strip every line off a carcass and it loses its proportion.
  //
  // One grid does both, and `mirrorW` covers the fourth: a nightstand is square
  // in plan and symmetric across its own face, so its back and its two ends are
  // the same picture. That is the opposite of the desk one row up, whose
  // asymmetry runs along its length and which therefore cannot mirror at all.
  nightstand: {
    mirrorW: true,
    s: {
      rows: [
        "................",
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccddddccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kkkkkkkkkkkk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccddddccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kkkkkkkkkkkk..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kck......kck..",
        "..kkk......kkk..",
      ],
      palette: { k: INK, d: BRASS },
    },
    n: { rows: NIGHTSTAND_BLIND, palette: { k: INK } },
    e: { rows: NIGHTSTAND_BLIND, palette: { k: INK } },
  },

  // Canvas slung in a frame at shin height. Flat, thin and cheap-looking on
  // purpose — it should read as the thing you put in a room you only just walled
  // in. Its finish is the CLOTH and its trim is the frame, which is the whole of
  // why this row has both.
  //
  // ITS LEGS ARE THE FRAME, so they are drawn in the trim like the rails are.
  // Turned, they always were — three pixels with a wooden core. From the front
  // they were two bare pixels of the cloth's own outline ink, which on undyed
  // canvas is pale grey, so a cot changed the material of its legs when you
  // turned it. Same legs now from every side, at the frame's corners.
  //
  // AND IT HAS A HEAD. The pillow is the owner's call and it settles a question
  // ROADMAP §the three missing north grids left open — which recorded that the
  // cot's fallback north view was CORRECT because the piece was symmetric end to
  // end. It is not symmetric any more, so that note is spent and this row now
  // owes a real `n`: from behind, the head is the NEAR end.
  //
  // The pillow is the bed's linen, shared with it rather than restated, and it
  // lies ON the canvas between two rules — thick enough to read as bedding and
  // not so thick that a camp cot starts looking made up.
  //
  // TURNED, THE HEAD IS ONE END OF THE CANVAS and `mirrorW` is still honest
  // about it: this asymmetry runs ACROSS the screen, which is the case a mirror
  // gets right. (The desk one page up is the case it does not.)
  cot: {
    mirrorW: true,
    s: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kCCCCCCCCCCCCk.",
        ".kkkkkkkkkkkkkk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kCCCCCCCCCCCCk.",
        ".kkkkkkkkkkkkkk.",
        ".kCk........kCk.",
        ".kCk........kCk.",
        ".kCk........kCk.",
        ".kkk........kkk.",
      ],
      palette: { k: INK, o: LINEN, g: LINEN_SHADE },
    },
    n: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kCCCCCCCCCCCCk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kgoooooooooogk.",
        ".kkkkkkkkkkkkkk.",
        ".kCCCCCCCCCCCCk.",
        ".kkkkkkkkkkkkkk.",
        ".kCk........kCk.",
        ".kCk........kCk.",
        ".kCk........kCk.",
        ".kkk........kkk.",
      ],
      palette: { k: INK, o: LINEN, g: LINEN_SHADE },
    },
    e: {
      rows: [
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kgooooooogkcccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kCk........................kCk.",
        ".kCk........................kCk.",
        ".kCk........................kCk.",
        ".kCk........................kCk.",
        ".kkk........................kkk.",
      ],
      palette: { k: INK, o: LINEN, g: LINEN_SHADE },
    },
  },

  // The single widened, with a second pillow. Two tiles and not three: at three
  // it read as a piece of municipal furniture rather than a bed, which is the
  // sort of thing only the scale strip tells you (owner's call, 12 Aug).
  doublebed: {
    mirrorW: true,
    s: {
      rows: [
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kttttttttttttttttttttttttttttttk",
        "kcccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kssssssssssssssssssssssssssssssk",
        "kcccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
    // TURNED, following the single bed's script exactly (§bed.e): a board at each
    // end, the bedding draping over the near face in the shade tones, and a rail
    // shallower than the legs are long. The one difference is the pillow column,
    // which carries two — turned east the bed's WIDTH runs down the screen, and
    // two pillows side by side is what that looks like from here.
    e: {
      rows: [
        "................................",
        "................................",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "..kk........................kk..",
        "..kk........................kk..",
        "..kk........................kk..",
        "..kk........................kk..",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
    n: {
      rows: [
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kssssssssssssssssssssssssssssssk",
        "kcccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kpgooooooooooogppgooooooooooogpk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kttttttttttttttttttttttttttttttk",
        "kcccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
        ".kk..........................kk.",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
  },


  // The tallest thing you can put in a room, so it gets a CORNICE — the four
  // rows of overhang the `rise` buys. A tall box with a lid reads as furniture;
  // a tall box does not. Two doors, a seam, two handles.
  //
  // ONE PLINTH TOP AND BOTTOM, matching. It used to wear a cornice AND a second
  // capping frame under it, two overhangs deep, which is a moulding a cottage
  // wardrobe would not have and a doubled outline where they met. One band at
  // each end now — proud of the carcass, lit on top and shaded underneath — and
  // the doors share their rules rather than opening with their own.
  //
  // THE SEAM AND THE HANDLES ARE ONE PIXEL, like every other line in the game.
  // The seam was two, which is the doubled-outline bug in its usual disguise:
  // each door closing its own edge where they meet. The handles were two wide
  // for a different reason — they were the drawers' brass bar turned upright and
  // never thinned — and at two they read as luggage tags.
  //
  // THE SEAM IS WHAT SITS OFF CENTRE, not the carcass. Doors of equal width need
  // an ODD interior and this one is twelve, so something has to give: either the
  // body goes a pixel off centre — which shows, because the plinth then notches
  // in by one on one side and two on the other, and the notch is at the widest
  // part of the piece where the eye lands — or the seam does, which costs a
  // pixel of difference between two panels nothing is measuring. So the notches
  // match at one pixel each and the doors are six and five.
  //
  // Legs at the carcass's corners with a foot, front and back, where they were
  // two bare pixels of ink that stopped without one.
  wardrobe: {
    rise: 6,
    n: WARDROBE_BACK,
    e: WARDROBE_SIDE,
    mirrorW: true,
    s: {
      rows: [
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kccccdckcdccck.",
        ".kccccdckcdccck.",
        ".kccccdckcdccck.",
        ".kccccdckcdccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        ".kcccccckccccck.",
        "kkkkkkkkkkkkkkkk",
        "kcccccccccccccck",
        "kssssssssssssssk",
        "kkkkkkkkkkkkkkkk",
        ".kck........kck.",
        ".kck........kck.",
        ".kck........kck.",
        ".kkk........kkk.",
      ],
      palette: { k: INK, d: "#9c7a2c" },
    },
  },

  // Curved lid, hard rim, one brass clasp. The rim is the whole trick —
  // it is what says lid rather than box, and it costs one row.
  chest: {
    n: CHEST_BACK,
    e: CHEST_BACK,
    mirrorW: true,
    s: {
      rows: [
        "................",
        "................",
        "................",
        "...kkkkkkkkkk...",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kkkkkkkkkkkk..",
        "..kssssssssssk..",
        "..kcccccccccck..",
        "...kcccbbccck...",
        "...kcccbbccck...",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
      ],
      palette: { k: INK, b: "#9c7a2c" },
    },
  },

  // Three drawers, six pulls, stubby feet. Reads against the desk by
  // being solid all the way down — no kneehole, no gap.
  // THE FIREPLACE. Masonry, so `c`/`t`/`s` resolve to whichever stone finish it
  // was built in and the fire is the only literal palette on it.
  //
  // The mantel OVERHANGS the breast by a pixel either side, which is the one
  // line that makes it a shelf rather than a step in a slab — the same trick the
  // dresser's top uses, and the reason this piece reads at 32px at all.
  //
  // The fire is drawn as a shape narrowing upward from a bed of embers, not as a
  // gradient: a flame is a silhouette, and at this scale a soft one is a smudge.
  //
  // AND IT MOVES — three frames, leaning and changing height (§anim below). This
  // used to say it deliberately didn't, on the grounds that every other light in
  // the game is a steady pool (§drawLampGlow) and a moving one here would be the
  // only thing in the room. That is still true and is now the point: a fire is
  // the one furnishing that is running rather than sitting there, and a still
  // one read as a painting of a fire. A lamp stays steady; it is a lamp.
  fireplace: {
    mirrorW: true,
    s: {
      rows: [
        BLANK32,
        BLANK32,
        ...MANTEL,
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccckkkeeeeeeeeeekkkcccccck.",
        ".kcccccckkeeeeeeeeeeeekkcccccck.",
        ".kcccccckeeeeeeeeeeeeeekcccccck.",
        ".kcccccckeeeeeeeeeeeeeekcccccck.",
        ".kcccccckeeeeeeeeeeeeeekcccccck.",
        ".kcccccckeeeeeeeeeeeeeekcccccck.",
        ".kcccccckeeeeeefeeeeeeekcccccck.",
        ".kcccccckeeeeeffofeeeeekcccccck.",
        ".kcccccckeeeefofoofeeeekcccccck.",
        ".kcccccckeeeffoooooffeekcccccck.",
        ".kcccccckeefoooooooofeekcccccck.",
        ".kcccccckeefoooooooofeekcccccck.",
        ".kcccccckeegggggggggeeekcccccck.",
        ".kcccccckeggggggggggggekcccccck.",
        ".kccccccksssssssssssssskcccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ...HEARTH,
      ],
      // The firebox is sooted, not black: pure black is the outline's colour and
      // an opening painted in it loses its own jambs.
      palette: { k: INK, e: "#241a16", f: "#ffcf7a", o: "#e8912c", g: "#a3552a" },
    },
    // The fire, moving. Seven rows starting at 16 — the tip and the body, never
    // the two ember rows under them, because embers glowing steadily is what
    // says the fire has been burning a while.
    //
    // The cycle is UPRIGHT, LEFT, UPRIGHT, RIGHT, so it passes through centre
    // between leans. Straight to the other side jumped; through the middle
    // sways. And the leans differ in HEIGHT as well as direction — a flame that
    // only rocks side to side is a metronome.
    //
    // The band never reaches above row 16. Rows 11 and 12 narrow the opening
    // with their own jambs, and a tip that got up there would burn through the
    // masonry.
    anim: {
      row: 16,
      holdMs: 180,
      frames: [
        // Upright: the still art, so a fireplace looks the same the moment it
        // is placed as it does in the build menu's thumbnail.
        [
          ".kcccccckeeeeeeeeeeeeeekcccccck.",
          ".kcccccckeeeeeefeeeeeeekcccccck.",
          ".kcccccckeeeeeffofeeeeekcccccck.",
          ".kcccccckeeeefofoofeeeekcccccck.",
          ".kcccccckeeeffoooooffeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
        ],
        // Leaning left, and a row taller — a flame that has caught.
        [
          ".kcccccckeeeeefeeeeeeeekcccccck.",
          ".kcccccckeeeefofeeeeeeekcccccck.",
          ".kcccccckeeeffoofeeeeeekcccccck.",
          ".kcccccckeeffoooooffeeekcccccck.",
          ".kcccccckeefooooooofeeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
        ],
        [
          ".kcccccckeeeeeeeeeeeeeekcccccck.",
          ".kcccccckeeeeeefeeeeeeekcccccck.",
          ".kcccccckeeeeeffofeeeeekcccccck.",
          ".kcccccckeeeefofoofeeeekcccccck.",
          ".kcccccckeeeffoooooffeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
        ],
        // Leaning right, and a row SHORTER — settling back down.
        //
        // The lean is one pixel off centre, not three. Drawn further over it
        // touched the right jamb and went broad at the base, and a flame that
        // fills the firebox wall to wall is a mound of embers, not a flame. The
        // base row never moves at all: fire is anchored where the fuel is.
        [
          ".kcccccckeeeeeeeeeeeeeekcccccck.",
          ".kcccccckeeeeeeeeeeeeeekcccccck.",
          ".kcccccckeeeeeeeefeeeeekcccccck.",
          ".kcccccckeeeeeeffofeeeekcccccck.",
          ".kcccccckeeeeffooooofeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
          ".kcccccckeefoooooooofeekcccccck.",
        ],
      ],
    },
    // Turned away: masonry all the way up, no opening. A fireplace you have
    // spun round should show you its back, not its fire — the wardrobe's
    // argument, and this piece needs it more, since the fire is the one part
    // anybody looks at.
    //
    // THE SAME WIDTH AS THE FRONT, which it was not: the breast was 28 against
    // the front's 30, so the fireplace lost two pixels off its waist when you
    // walked round it while the mantel above stayed put. That inset is the
    // WARDROBE's drawing, where a proud cornice sits over a narrower carcass,
    // and it was copied to a piece whose mantel is flush with its breast. A
    // chimney breast is one mass; it does not know which side you are on.
    n: {
      rows: [
        BLANK32,
        BLANK32,
        ...MANTEL,
        ...Array<string>(22).fill(".kssssssssssssssssssssssssssssk."),
        ...HEARTH,
      ],
      palette: { k: INK },
    },
    // From the side: the same fireplace, and a mantel running back to the wall.
    // Same grid serves west, mirrored.
    //
    // THE FIREPLACE IS THE FRONT VIEW'S THIRTY ROWS, exactly — mantel edge,
    // breast, hearth, starting at row 18 and ending on the floor. It used to be
    // forty-six rows of flat shade, because a piece two tiles DEEP has its depth
    // projected as vertical extent and the drawing spent all of it on face. Face
    // is height, so it read as a chimney stack: the same object, a foot and a
    // half taller, whenever you turned it.
    //
    // The depth is still there and still drawn — it is the fifteen rows of TOP
    // above the mantel's rule, which is the shelf's own surface receding toward
    // the wall. That is what the extra length of a turned fireplace actually is.
    // Spending it on top rather than on face is the whole difference between a
    // deep object and a tall one, and it costs nothing: the footprint is covered
    // either way.
    //
    // FLUSH TO THE BACK OF ITS TILE, because a fireplace backs a wall. Column 0
    // is the back face, and the piece used to start at column 2 — so a fireplace
    // set against a wall stood two pixels off it, with the floor showing through
    // the gap. What is left over is at the FRONT, which is the side of the piece
    // that is allowed to have room in front of it.
    //
    // AND THE OVERHANGS ALL POINT FORWARD. Mantel and hearth used to stand proud
    // at both ends of this view, which put a shelf and a slab through the wall
    // the piece is leaning on. They are the same fourteen pixels they were; the
    // whole of the projection is simply on the room side now, which is where a
    // mantel projects and where a hearth is laid.
    e: {
      rows: [
        BLANK16,
        BLANK16,
        "kkkkkkkkkkkkkk..",
        ...Array<string>(15).fill("kttttttttttttk.."),
        "kkkkkkkkkkkkkk..",
        "kttttttttttttk..",
        "kttttttttttttk..",
        "kssssssssssssk..",
        "kkkkkkkkkkkkkk..",
        ...Array<string>(22).fill("kssssssssssk...."),
        "kkkkkkkkkkkkkk..",
        "kssssssssssssk..",
        "kkkkkkkkkkkkkk..",
      ],
      palette: { k: INK },
    },
  },
  dresser: {
    mirrorW: true,
    s: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        "..kccccccdddccccccccdddcccccck..",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        "..kccccccdddccccccccdddcccccck..",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        "..kccccccdddccccccccdddcccccck..",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "...kk......................kk...",
        "...kk......................kk...",
        "...kk......................kk...",
        "...kk......................kk...",
      ],
      palette: { k: INK, d: "#9c7a2c" },
    },
    // Three drawers become one panel. Unlike the desk there is nothing to swap
    // sides — a dresser is symmetric across its width — so the whole of the
    // difference is what STOPS being drawn: six pulls and the seams between the
    // drawers.
    //
    // The top slab is untouched, for the reason spelled out on the desk's `n`:
    // it is symmetric front to back, so turning the piece does not turn it. Only
    // the CARCASS has a face that changed, and that is the part in shade.
    //
    // THE TWO LINES THAT STAY are the top's edge and the plinth's, and they are
    // the reason this is not a slab. It is SHELF_BACK's lesson: strip every
    // horizontal off a carcass and the piece loses the proportion its front view
    // had, so the back keeps the two that are structure rather than joinery.
    n: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ...Array<string>(11).fill(".kssssssssssssssssssssssssssssk."),
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ...Array<string>(3).fill(".kssssssssssssssssssssssssssssk."),
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ...Array<string>(4).fill("...kk......................kk..."),
      ],
      palette: { k: INK },
    },
    e: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        "..kccccddcccck..",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kk......kk...",
      ],
      palette: { k: INK, d: "#9c7a2c" },
    },
  },

  // --- The kitchen and the bathroom ------------------------------------------
  // The five that made two whole rooms furnishable. All of them take their body
  // from the FINISH — `c`/`t`/`s` — because metal and stone are both finish
  // classes, so a stainless stove and a brass one are one drawing, and so are a
  // bone bath and a marble one. The only literals in here are the two things
  // that are genuinely not the object's material: the hob plate and the tap.

  // Hob on top, oven under it. The plate is dark in every kitchen — a cooktop
  // rendered in the body's own metal disappears into it, and then the piece is a
  // cabinet with a handle. Same carve-out as the notice board's paper.
  stove: {
    s: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kmmmmmmmmmmmmk.",
        ".kmggmmmmmmggmk.",
        ".kmmmmmmmmmmmmk.",
        ".kmggmmmmmmggmk.",
        ".kmmmmmmmmmmmmk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kcssssssssssck.",
        ".kckkkkkkkkkkck.",
        ...Array<string>(10).fill(".kcssssssssssck."),
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ...Array<string>(4).fill("...kk......kk..."),
      ],
      palette: { k: INK, m: "#4a4550", g: "#332f3a" },
    },
  },

  // A tall box, and the door split is the whole of what makes it a fridge rather
  // than a wardrobe: two doors, one handle line down the right of each.
  fridge: {
    s: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kkkkkkkkkkkkkk.",
        ...Array<string>(4).fill(".kcccccccccccck."),
        ...Array<string>(5).fill(".kccccccccckcck."),
        ...Array<string>(4).fill(".kcccccccccccck."),
        ".kckkkkkkkkkkck.",
        ...Array<string>(3).fill(".kcccccccccccck."),
        ...Array<string>(5).fill(".kccccccccckcck."),
        ...Array<string>(9).fill(".kcccccccccccck."),
        ".kkkkkkkkkkkkkk.",
        ...Array<string>(3).fill("...kk......kk..."),
      ],
      palette: { k: INK },
    },
  },

  // THE JOINING ONE. Three drawings, and which one a cell uses depends on what is
  // beside it (render/furnishings.ts §joins, §runGridFor).
  //
  // WHAT DIFFERS BETWEEN THEM IS ONLY THE OUTLINE. `s` returns both ends, `end`
  // returns one, `mid` returns neither and runs its worktop to both edges of the
  // cell. Everything else — the courses, the door rail, the handle — is identical,
  // because the run has to read as one cabinet with doors in it rather than as a
  // row of cabinets. That is the per-cell edges rule (CLAUDE.md) obeyed by its own
  // prescription: the edge is drawn only where the surface actually ends.
  //
  // The handle repeats per cell and that is FINE — it is a feature, not an edge.
  // What stripes a surface is a light line meeting a dark line at the seam, and a
  // handle in the middle of a door is neither.
  counter: {
    s: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kTTTTTTTTTTTTk.",
        ".kTTTTTTTTTTTTk.",
        ".kSSSSSSSSSSSSk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kckkkkkkkkkkck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kccccckkccccck.",
        ...Array<string>(13).fill(".kcccccccccccck."),
        ".kckkkkkkkkkkck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
      ],
      palette: { k: INK },
    },
    joins: {
      // ACROSS the camera. Neighbouring cells sit side by side and hide nothing
      // of each other, so all that changes between these is the SIDE outline.
      x: {
        mid: {
          rows: [
          "................",
          "................",
          "kkkkkkkkkkkkkkkk",
          "TTTTTTTTTTTTTTTT",
          "TTTTTTTTTTTTTTTT",
          "SSSSSSSSSSSSSSSS",
          "kkkkkkkkkkkkkkkk",
          "cccccccccccccccc",
          "kkkkkkkkkkkkkkkk",
          "cccccccccccccccc",
          "cccccccccccccccc",
          "ccccccckkccccccc",
          ...Array<string>(13).fill("cccccccccccccccc"),
          "kkkkkkkkkkkkkkkk",
          "cccccccccccccccc",
          "kkkkkkkkkkkkkkkk",
          "ssssssssssssssss",
          "ssssssssssssssss",
          ],
          palette: { k: INK },
        },
        end: {
          rows: [
          "................",
          "................",
          ".kkkkkkkkkkkkkkk",
          ".kTTTTTTTTTTTTTT",
          ".kTTTTTTTTTTTTTT",
          ".kSSSSSSSSSSSSSS",
          ".kkkkkkkkkkkkkkk",
          ".kcccccccccccccc",
          ".kkkkkkkkkkkkkkk",
          ".kcccccccccccccc",
          ".kcccccccccccccc",
          ".kcccccckkcccccc",
          ...Array<string>(13).fill(".kcccccccccccccc"),
          ".kkkkkkkkkkkkkkk",
          ".kcccccccccccccc",
          ".kkkkkkkkkkkkkkk",
          ".kssssssssssssss",
          ".kssssssssssssss",
          ],
          palette: { k: INK },
        },
      },
      // AWAY FROM the camera, and a different drawing rather than the same one
      // turned — see §RunAxis. Each cell is drawn 16px lower than the one behind
      // and covers its bottom 14 rows, so:
      //
      //   * the worktop is a FULL 16-ROW BAND, which is the cell pitch exactly
      //     and therefore tiles into the cell behind with no seam. Nothing may
      //     interrupt it — a lip or a front edge inside that band would draw a
      //     line every 16px down the run, which is the per-cell edges rule in
      //     its most literal form.
      //   * the cabinet face sits in the rows that get overdrawn, so it shows on
      //     the cell nearest the camera and on no other. The middle of the run
      //     and its near end are therefore THE SAME DRAWING.
      //
      // Only the far end differs, and only by closing the top.
      y: {
        mid: {
          rows: [
          ...Array<string>(16).fill("kTTTTTTTTTTTTTTk"),
          "kkkkkkkkkkkkkkkk",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccckkcccccck",
          ...Array<string>(5).fill("kcccccccccccccck"),
          "kkkkkkkkkkkkkkkk",
          "kssssssssssssssk",
          ],
          palette: { k: INK },
        },
        end: {
          rows: [
          "kkkkkkkkkkkkkkkk",
          ...Array<string>(15).fill("kTTTTTTTTTTTTTTk"),
          "kkkkkkkkkkkkkkkk",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccccccccccck",
          "kcccccckkcccccck",
          ...Array<string>(5).fill("kcccccccccccccck"),
          "kkkkkkkkkkkkkkkk",
          "kssssssssssssssk",
          ],
          palette: { k: INK },
        },
      },
    },
  },

  // Basin sunk into a top, cabinet under, tap standing at the back. The bowl is
  // `s` inside a `t` rim, which is the same trick the bath uses and is what says
  // "this is a hollow" without a single new colour.
  sink: {
    s: {
      rows: [
        "................",
        "................",
        "......kkkk......",
        "......kmmk......",
        "......kmmk......",
        "...kkkkmmkkkk...",
        "..kttttttttttk..",
        "..ktsssssssstk..",
        "..ktsssssssstk..",
        "..kttttttttttk..",
        "..kkkkkkkkkkkk..",
        "..kcccccccccck..",
        "..kckkkkkkkkck..",
        ...Array<string>(9).fill("..kcccccccccck.."),
        "..kckkkkkkkkck..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        ...Array<string>(2).fill("....kk....kk...."),
      ],
      palette: { k: INK, m: "#8f959e" },
    },
  },

  // Cistern, seat, bowl, foot. It narrows twice on the way down, which is what
  // keeps it from reading as a small white fridge.
  toilet: {
    s: {
      rows: [
        "................",
        "................",
        "....kkkkkkkk....",
        ...Array<string>(4).fill("....kcccccck...."),
        "....kkkkkkkk....",
        "....kkkkkkkk....",
        "...kttttttttk...",
        "...kcccccccck...",
        "...kkkkkkkkkk...",
        "...kssssssssk...",
        "...kssssssssk...",
        "....kssssssk....",
        "....kssssssk....",
        "....kssssssk....",
        "....kssssssk....",
        ".....kssssk.....",
        ".....kssssk.....",
        ".....kssssk.....",
        ".....kkkkkk.....",
        "....kkkkkkkk....",
        ...Array<string>(6).fill("....kssssssk...."),
        "....kkkkkkkk....",
      ],
      palette: { k: INK },
    },
  },

  // Two tiles of rim with a hollow in it. Mostly INSIDE, deliberately: a bath is
  // a thing you look down into, and the low `height` on the row is what buys the
  // room for that rather than a tall slab seen from the side.
  tub: {
    s: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ...Array<string>(6).fill(".ktsssssssssssssssssssssssssstk."),
        ".kttttttttttttttttttttttttttttk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ...Array<string>(8).fill(".kcccccccccccccccccccccccccccck."),
        ...Array<string>(2).fill(".kssssssssssssssssssssssssssssk."),
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ...Array<string>(3).fill("...kk......................kk..."),
      ],
      palette: { k: INK },
    },
    // TURNED, A BATH IS NOT A SHORTER BATH — it is the same tub seen end-on, so
    // the hollow runs away from the camera for two tiles instead of across one.
    // A multi-tile piece has to author this: the front view is 32px wide and the
    // east footprint is 16, so `gridFor`'s fallback cannot satisfy the size
    // contract, and furnishings.test.ts says so in four failures at once.
    mirrorW: true,
    e: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ...Array<string>(28).fill(".ktsssssssssstk."),
        ".kttttttttttttk.",
        ".kkkkkkkkkkkkkk.",
        ...Array<string>(5).fill(".kcccccccccccck."),
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kk......kk...",
      ],
      palette: { k: INK },
    },
  },

  // Mostly empty grid, and deliberately: the art box is as tall as the
  // tile is deep, and a small object should sit in the bottom of it rather than being
  // stretched to fill it. Brass shade over a lit throat, a thin post, a round foot.
  desklamp: {
    rise: 6,
    s: {
      rows: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        ".....kkkkkk.....",
        ".....kbbbbk.....",
        "....kbbbbbbk....",
        "....kffffffk....",
        "....kkkkkkkk....",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        ".....kkkkkk.....",
        ".....kttttk.....",
        ".....kcccck.....",
        ".....kssssk.....",
        ".....kkkkkk.....",
        "................",
      ],
      palette: { k: INK, b: "#9c7a2c", f: "#ffcf7a" },
    },
  },

  // Rounded top, four legs, and the floor visible between them. The old
  // procedural table was this outline with no legs at all, which is a plinth.
  table: {
    mirrorW: true,
    s: {
      rows: [
        ...TABLE_FRONT,
      ],
      palette: { k: INK },
    },
    // A TABLE'S LENGTH IS YOURS, the awning's argument a third time: a fixed
    // length fits exactly one room, and there is no second number right for both
    // a breakfast table and a feast. This is what the checklist's "long table"
    // turned out to be — not another form, but this one laid end to end.
    //
    // EDGE TO EDGE, legs at the corners of its own cells. Inset, the art stopped
    // short of the footprint and a chair pulled up to the end sat in a channel of
    // floor with the table not quite reaching it. The width ladder already said
    // so: a joining piece earns the whole cell, because its run has to be
    // continuous.
    //
    // LEGS NEVER AT A SEAM. Keeping the standalone's pair on every cell would put
    // two legs together at every junction — exactly what a row of separate tables
    // looks like. So the ends keep their outer leg and a mid section carries ONE,
    // at its own centre, which lands a support every two tiles and none of them
    // where two cells meet.
    // Turned, the table is one tile across and two deep, and the same rule
    // applies: edge to edge, legs at the corners of its own cells.
    e: {
      rows: [
        ...TABLE_SIDE,
      ],
      palette: { k: INK },
    },
    joins: {
      x: {
        mid: {
          rows: [
          "................................",
          "................................",
          "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
          "tttttttttttttttttttttttttttttttt",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "cccccccccccccccccccccccccccccccc",
          "ssssssssssssssssssssssssssssssss",
          "ssssssssssssssssssssssssssssssss",
          "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kck...............",
          "..............kkk...............",
          ],
          palette: { k: INK },
        },
        end: {
          rows: [
          "................................",
          "................................",
          "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
          "kttttttttttttttttttttttttttttttt",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "kccccccccccccccccccccccccccccccc",
          "ksssssssssssssssssssssssssssssss",
          "ksssssssssssssssssssssssssssssss",
          "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kck.............................",
          "kkk.............................",
          ],
          palette: { k: INK },
        },
      },
    },
  },

  // Three shelves of books in four spine colours, which are LITERALS — a
  // bookcase repainted walnut should not repaint its books. That is the same division
  // the lamp makes about brass.
  shelf: {
    rise: 4,
    n: SHELF_BACK,
    e: SHELF_SIDE,
    mirrorW: true,
    s: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        "..krrgggyypppk..",
        "..krrgggyypppk..",
        "..krrgggyypppk..",
        "..krrgggyypppk..",
        "..krrgggyypppk..",
        "..krrgggyypppk..",
        ".kkkkkkkkkkkkkk.",
        "..kppyyyrrgggk..",
        "..kppyyyrrgggk..",
        "..kppyyyrrgggk..",
        "..kppyyyrrgggk..",
        "..kppyyyrrgggk..",
        "..kppyyyrrgggk..",
        ".kkkkkkkkkkkkkk.",
        "..kggrrrppyyyk..",
        "..kggrrrppyyyk..",
        "..kggrrrppyyyk..",
        "..kggrrrppyyyk..",
        "..kggrrrppyyyk..",
        "..kggrrrppyyyk..",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kk......kk...",
        "...kk......kk...",
        "...kk......kk...",
      ],
      palette: { k: INK, r: "#b8563c", g: "#5e8c4a", y: "#d9b04a", p: "#7a6aa8" },
    },
  },

  // Pillow, blanket, headboard, footboard — the blanket and pillow literal, the
  // frame taking the wood finish. Authored all three ways round: a bed is the piece
  // whose head end matters most, and `n` swaps the pillow to the near end.
  bed: {
    mirrorW: true,
    s: {
      rows: [
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kkkkkkkkkkkkkkkk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kkkkkkkkkkkkkkkk",
        "kssssssssssssssk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
    e: {
      rows: [
        "................................",
        "................................",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckoooooookCCCCCCCCCCCCCCCCkcck",
        "kcckgggggggkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kcckpppppppkCCCCCCCCCCCCCCCCkcck",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "ksskpppppppkSSSSSSSSSSSSSSSSkssk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        "..kk........................kk..",
        "..kk........................kk..",
        "..kk........................kk..",
        "..kk........................kk..",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
    n: {
      rows: [
        "kkkkkkkkkkkkkkkk",
        "kssssssssssssssk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kCCCCCCCCCCCCCCk",
        "kkkkkkkkkkkkkkkk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kpgoooooooooogpk",
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
        ".kk..........kk.",
      ],
      palette: { k: INK, p: "#f2ece0", o: LINEN, g: LINEN_SHADE },
    },
  },

  // A RUG IS FRINGED ON THE TWO ENDS IT WAS WOVEN OFF, and which two those are
  // is the only thing turning it changes. Warp threads run the length of the
  // loom and are cut at the ends; the selvedges down the sides are the weft
  // turning back on itself and have nothing hanging off them. So `s` fringes the
  // near and far edges and `e` fringes left and right, and neither ever has all
  // four — that would be a rug with no selvedge, which is a rug that is
  // unravelling.
  //
  // THE BODY IS 27 COLUMNS, ONE NARROWER THAN IT WAS. The fringe was already
  // symmetric — fourteen tassels every other column, centred on the body — but
  // the body ran one column PAST the last of them, so the right-hand corner had
  // a tassel missing and the whole edge read as slipped. Matching the body to
  // the fringe rather than the other way round is also what buys the two spare
  // columns on the right that the side fringe hangs in; the left had them
  // already.
  //
  // Both spans are ODD ON PURPOSE — 27 columns, 29 rows — because an odd span
  // has a centre, and a fringe of single pixels every other cell can only be
  // symmetric about a centre that is itself a cell. Across an even span every
  // tassel lands half a pixel off, which is exactly the miss the near edge had.
  rug: {
    mirrorW: true,
    s: {
      rows: [RUG_FRINGE, RUG_FRINGE, ...RUG_BODY, RUG_FRINGE, RUG_FRINGE],
      palette: { k: INK },
    },
    e: {
      rows: [BLANK32, BLANK32, ...rugSelvedge(RUG_BODY), BLANK32, BLANK32],
      palette: { k: INK },
    },
  },

  // A PAINTING IS THE ONE PIECE THAT HANGS. Its grid is `w * TILE` by `height`
  // and nothing else — no footprint to lift and no near face, because it never
  // touches a floor. Frame in the finish, picture in literals: a walnut frame
  // should not repaint the hills inside it, which is the bookshelf's rule about
  // its own books and the lamp's about its brass.
  // A TROUGH ON A SILL, and the nine blank rows above it are load-bearing. A
  // wall-mounted piece is hung from under the wall's cap and drawn downward
  // (render/renderer.ts §mount), so a short grid puts the box at head height.
  // These rows walk it down the face until it meets the sash's sill, which
  // `drawWindow` puts five pixels off the ground.
  //
  // THE FLOWERS SPILL OVER THE RIM rather than sitting inside it. A row of
  // colour contained by the trough reads as a box with paint in it; a few
  // pixels breaking the line above and hanging past it below is what says
  // "growing". Three blossom colours and no more — this is 12px of planting and
  // a fourth hue turns it to confetti.
  windowbox: {
    s: {
      rows: [
        ...Array<string>(8).fill("................"),
        "......p...y.....",
        "...p.gpg.ygg.p..",
        "..gpggggggggggg.",
        ".ggggwggggwggggg",
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "..dddddddddddd..",
      ],
      palette: {
        k: INK,
        g: "#5d9a37",
        p: "#d9698f",
        y: "#e8c65a",
        w: "#e8eaf0",
        d: "rgba(0,0,0,0.20)",
      },
    },
  },
  painting: {
    s: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kccaaaaaaaacck.",
        ".kccaaaaaaaacck.",
        ".kccaaaammaacck.",
        ".kccaammbbmacck.",
        ".kccambbbbbmcck.",
        ".kccbbbbbbbbcck.",
        ".kccbbbbbbbbcck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        "..dddddddddddd..",
      ],
      palette: { k: INK, a: "#a8cfe8", m: "#8fb87a", b: "#6f9e5c", d: "rgba(0,0,0,0.20)" },
    },
  },
};
