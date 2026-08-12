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
// ONE grid each, used for `n` AND `e` with `mirrorW`, rather than three. That
// is not laziness about the side view: on a one-tile footprint the side of a
// wardrobe IS its back — same width, same panel, same shadow. Authoring three
// identical grids would be three chances to typo the same picture.
//
// Painted in the finish's `s` (shade) rather than its `c`, which is what makes
// the turn legible at a glance. Every one of these pieces already uses `c` for
// the face that catches the light and `s` for the plinth beneath it; a panel
// that is shade all the way up reads as the side of the object that is turned
// away, without inventing a single new colour.

/** Wardrobe seen from anywhere but the front: cornice, plain panel, feet. */
const WARDROBE_BACK: Grid = {
  rows: [
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kssssssssssssssk",
    "kkkkkkkkkkkkkkkk",
    ".kkkkkkkkkkkkkk.",
    ".kttttttttttttk.",
    ...Array<string>(30).fill("..kssssssssssk.."),
    ".kssssssssssssk.",
    ".kkkkkkkkkkkkkk.",
    "...kk......kk...",
    "...kk......kk...",
    "...kk......kk...",
    "...kk......kk...",
  ],
  palette: { k: INK },
};

/** Bookcase from behind: no books, no shelf edges, but the plinth line stays —
 *  without it the back is one thirty-row slab and the piece loses the
 *  proportion its front view has. */
const SHELF_BACK: Grid = {
  rows: [
    ".kkkkkkkkkkkkkk.",
    ".kttttttttttttk.",
    ".kssssssssssssk.",
    ".kssssssssssssk.",
    ".kkkkkkkkkkkkkk.",
    ...Array<string>(20).fill("..kssssssssssk.."),
    ".kkkkkkkkkkkkkk.",
    ...Array<string>(8).fill("..kssssssssssk.."),
    ".kkkkkkkkkkkkkk.",
    "...kk......kk...",
    "...kk......kk...",
    "...kk......kk...",
  ],
  palette: { k: INK },
};

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
    s: {
      rows: [
        // The back, rising clear of the seat. Slatted rather than solid: two
        // gaps are what stop a 10x12 panel reading as a headboard, and they are
        // the same trick the icon uses at a third of the size.
        "...kkkkkkkkkk...",
        "...kttttttttk...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kssssssssk...",
        "...kkkkkkkkkk...",
        // The seat, seen from above and wider than the back.
        "..kkkkkkkkkkkk..",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        // Its near face — the thickness of the seat you look at edge-on.
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        // Legs, and the floor showing between them. This is the part a box can
        // never have and the reason the whole module exists.
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
    // Turned north — away from you — so you are looking at the BACK of the
    // back, standing at the near edge with the seat behind it. This is the one
    // facing that cannot fall through to `s`: the fallback puts the backrest at
    // the far edge, which is what a chair facing you looks like, so a chair
    // rotated to face away simply never changed. The six rows of `rise` go
    // unused here, because nothing on this view stands above the seat.
    n: {
      rows: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        // The seat, visible over the top of the backrest.
        "..kkkkkkkkkkkk..",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        // The backrest, from behind and nearer the camera than the seat.
        "...kkkkkkkkkk...",
        "...kttttttttk...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kcc.cc.cck...",
        "...kssssssssk...",
        "...kkkkkkkkkk...",
        // Short legs: the backrest hides most of them from this side.
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
    // Turned east, the back is seen edge-on down the left side and the seat runs
    // away from it. Same rows, same box — a chair is 1x1 whichever way it faces,
    // so no dimension changes and `mirrorW` gets the west view for free.
    e: {
      rows: [
        "...kkkk.........",
        "...kttk.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kcck.........",
        "...kssk.........",
        "...kkkk.........",
        "..kkkkkkkkkkkk..",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // A CUSHION had no case at all in the old switch — a bare 16x20 block four
  // pixels tall, which is a doorstep. Round, squashed, and dented in the middle,
  // because the one thing a cushion has to say is that it would give if you sat
  // on it.
  //
  // No facings. A cushion has no front, and authoring four identical grids to
  // say so would be four times the chance of them drifting apart.
  cushion: {
    s: {
      // Five blank rows first. The grid's top edge sits `height` above the tile
      // (4px for a cushion), so art written flush to row 0 lands a third of a
      // tile NORTH of the cell it was placed in — off by exactly the lift. The
      // blanks put it back in the middle of its own square.
      rows: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "....kkkkkkkk....",
        "..kkttttttttkk..",
        ".kttccccccccttk.",
        "kttcccc..ccccttk",
        "ktcccc....cccctk",
        "kccccc....ccccck",
        "kcccccc..cccccck",
        "kcccccccccccccck",
        "kssssssssssssssk",
        ".kssssssssssssk.",
        "..kksssssssskk..",
        "....kkkkkkkk....",
        "................",
        "................",
        "................",
      ],
      palette: { k: INK },
    },
  },

  // A chair with the back taken off, and drawn as exactly that: the same
  // seat and legs, nine pixels lower and rounder. If it read as tall as a chair it
  // would just be a chair drawn worse.
  stool: {
    s: {
      rows: [
        "................",
        "................",
        "...kkkkkkkkkk...",
        "..kttttttttttk..",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // A seat with a rail behind it on posts, which is what stops it being a
  // long stool. Turned east the rail is seen edge-on down one side.
  bench: {
    rise: 4,
    mirrorW: true,
    s: {
      rows: [
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..kttttttttttttttttttttttttttk..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kssssssssssssssssssssssssssk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
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
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kkk....................kkk...",
      ],
      palette: { k: INK },
    },
    n: {
      rows: [
        "................................",
        "................................",
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
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
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..kttttttttttttttttttttttttttk..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kcccccccccccccccccccccccccck..",
        "..kssssssssssssssssssssssssssk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kkk....................kkk...",
      ],
      palette: { k: INK },
    },
    e: {
      rows: [
        "..kkkk..........",
        "..kcck..........",
        "..kcck..........",
        "..kcck..........",
        "..kcck..........",
        "..kcck..........",
        "..kcck..........",
        "..kcck..........",
        "..kkkk..........",
        ".kkkkkkkkkkkkkk.",
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
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // Arms at both ends, a back with a lit top roll, and two seat cushions with
  // a gap between them. The frame and feet are LITERAL timber while the upholstery
  // takes the finish, because a sofa is genuinely two materials and you only choose one.
  sofa: {
    rise: 4,
    mirrorW: true,
    s: {
      rows: [
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "...kkk....................kkk...",
      ],
      palette: { k: INK, w: "#a87c4a" },
    },
    n: {
      rows: [
        "................................",
        "................................",
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kccckcccccccccckccccccccckccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        "...kkk....................kkk...",
      ],
      palette: { k: INK, w: "#a87c4a" },
    },
    e: {
      rows: [
        ".kkkkk..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kccck..........",
        ".kkkkk..........",
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
        "kkkkkkkkkkkkkkkk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kkkkkkkkkkkkkkkk",
        "...kkk....kkk...",
      ],
      palette: { k: INK, w: "#a87c4a" },
    },
  },

  // The table, seven pixels lower. Nothing else changes, and nothing
  // else should: it is the same object at the height that makes it a different one.
  coffeetable: {
    mirrorW: true,
    s: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
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
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kkk....................kkk...",
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
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // A tabletop with a drawer pedestal under its right half and a KNEEHOLE
  // under the left. That asymmetry is the entire silhouette difference from a table,
  // and it is the reason a desk is worth being its own row.
  desk: {
    mirrorW: true,
    s: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
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
        "...............kkkkkkkkkkkkkk...",
        "...............kcccccccccccck...",
        "...............kcccccccccccck...",
        "...............kcccccccccccck...",
        "...............kccccdddccccck...",
        "...............kcccccccccccck...",
        "...............kcccccccccccck...",
        "...............kkkkkkkkkkkkkk...",
        "...............kcccccccccccck...",
        "...............kcccccccccccck...",
        "...............kcccccccccccck...",
        "...kck.........kkkkkkkkkkkkkk...",
        "...kkk....................kkk...",
      ],
      palette: { k: INK, d: "#9c7a2c" },
    },
    // THE PEDESTAL CHANGES SIDES, AND THE TOP DOES NOT CHANGE AT ALL.
    //
    // A desk is two objects and they turn differently. The pedestal is
    // asymmetric: what was on your right is on your left after a half turn, and
    // the face you now see is its back — no pulls, no drawer seams, `s` (shade)
    // all the way up, which is WARDROBE_BACK's rule and for its reason. The leg
    // stub swaps with it.
    //
    // The desktop is a SYMMETRIC SLAB, so the edge facing the camera is the same
    // piece of wood at either facing, lit the same way. It keeps its front
    // view's `t` surface and `c` face exactly. Shading it too was the first
    // attempt and it turned the north desk into a dark lump — a real mistake
    // about what rotating a box does, not a taste call: nothing about that
    // surface moved.
    n: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ...Array<string>(8).fill(".kcccccccccccccccccccccccccccck."),
        ...Array<string>(2).fill(".kssssssssssssssssssssssssssssk."),
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "...kkkkkkkkkkkkkk...............",
        ...Array<string>(10).fill("...kssssssssssssk..............."),
        "...kkkkkkkkkkkkkk.........ksk...",
        "...kkk....................kkk...",
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
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        "..kccccddcccck..",
        ".kcccccccccccck.",
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

  // Two drawers and stubby feet. Small enough that the feet matter:
  // without them it is a block, and a block beside a bed is a crate.
  nightstand: {
    s: {
      rows: [
        "................",
        "................",
        "................",
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        "..kccccddcccck..",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        "..kccccddcccck..",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kk......kk...",
        "...kk......kk...",
        "...kk......kk...",
        "...kk......kk...",
      ],
      palette: { k: INK, d: "#9c7a2c" },
    },
  },

  // Canvas slung in a frame at shin height. Flat, thin and cheap-looking on
  // purpose — it should read as the thing you put in a room you only just walled in.
  cot: {
    mirrorW: true,
    s: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kwwwwwwwwwwwwk.",
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
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kwwwwwwwwwwwwk.",
        ".kkkkkkkkkkkkkk.",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
      ],
      palette: { k: INK, w: "#a87c4a" },
    },
    e: {
      rows: [
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "...kwk....................kwk...",
        "...kwk....................kwk...",
        "...kwk....................kwk...",
        "...kwk....................kwk...",
        "...kkk....................kkk...",
      ],
      palette: { k: INK, w: "#a87c4a" },
    },
  },

  // The tallest thing you can put in a room, so it gets a CORNICE — the
  // four rows of overhang the `rise` buys. A tall box with a lid reads as furniture;
  // a tall box does not. Two doors, a centre stile, two knobs.
  wardrobe: {
    rise: 6,
    n: WARDROBE_BACK,
    e: WARDROBE_BACK,
    mirrorW: true,
    s: {
      rows: [
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccdkkdccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        "..kcccckkcccck..",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kk......kk...",
        "...kk......kk...",
        "...kk......kk...",
        "...kk......kk...",
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
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kcccccccccccck.",
        "..kccccbbcccck..",
        "..kccccbbcccck..",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
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
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
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
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..kssssssssssssssssssssssssssk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
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
    n: {
      rows: [
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kssssssssssssssssssssssssssk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..kssssssssssssssssssssssssssk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
      ],
      palette: { k: INK },
    },
    // From the side it is a slab two deep with the mantel edge on top. Same
    // grid serves west, mirrored.
    e: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kttttttttttttk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
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
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "..kssssssssssk..",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
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
        "..kkkkkmmkkkkk..",
        ".kttttttttttttk.",
        ".ktsssssssssstk.",
        ".ktsssssssssstk.",
        ".kttttttttttttk.",
        ".kkkkkkkkkkkkkk.",
        ".kcccccccccccck.",
        ".kckkkkkkkkkkck.",
        ...Array<string>(9).fill(".kcccccccccccck."),
        ".kckkkkkkkkkkck.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ...Array<string>(2).fill("...kk......kk..."),
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
        "...kkkkkkkkkk...",
        ...Array<string>(4).fill("...kcccccccck..."),
        "...kkkkkkkkkk...",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        "..kssssssssssk..",
        "..kssssssssssk..",
        "...kssssssssk...",
        "...kssssssssk...",
        "....kssssssk....",
        "....kssssssk....",
        "....kssssssk....",
        "....kkkkkkkk....",
        "...kkkkkkkkkk...",
        ...Array<string>(6).fill("...kssssssssk..."),
        "...kkkkkkkkkk...",
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
        "...kkkkkkkkkk...",
        "...kbbbbbbbbk...",
        "..kbbbbbbbbbbk..",
        "..kffffffffffk..",
        "..kkkkkkkkkkkk..",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "......kck.......",
        "...kkkkkkkkkk...",
        "...kttttttttk...",
        "...kcccccccck...",
        "...kssssssssk...",
        "...kkkkkkkkkk...",
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
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
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
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kck....................kck...",
        "...kkk....................kkk...",
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
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kkk....kkk...",
      ],
      palette: { k: INK },
    },
  },

  // Three shelves of books in four spine colours, which are LITERALS — a
  // bookcase repainted walnut should not repaint its books. That is the same division
  // the lamp makes about brass.
  shelf: {
    rise: 4,
    n: SHELF_BACK,
    e: SHELF_BACK,
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
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kkkkkkkkkkkkkk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
      ],
      palette: { k: INK, p: "#f2ece0", q: "#6a8fc0" },
    },
    n: {
      rows: [
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kqqqqqqqqqqqqk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kppppppppppppk.",
        ".kkkkkkkkkkkkkk.",
        ".kkkkkkkkkkkkkk.",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kkkkkkkkkkkkkk.",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
        "..kk........kk..",
      ],
      palette: { k: INK, p: "#f2ece0", q: "#6a8fc0" },
    },
    e: {
      rows: [
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kcckpppppppkqqqqqqqqqqqqqqqk...",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        ".kssssssssssssssssssssssssssssk.",
        "...kkk....................kkk...",
      ],
      palette: { k: INK, p: "#f2ece0", q: "#6a8fc0" },
    },
  },

  // Border, centre motif, and a FRINGE along the bottom edge. One grid for
  // every facing, because a rug has no front — and the fringe is what stops a 2x2 of
  // flat colour reading as a stain on the floor.
  rug: {
    s: {
      rows: [
        "................................",
        "................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..kttttttttttttttttttttttttttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccssssssssssssssccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttccccccccccccccccccccccttk..",
        "..kttttttttttttttttttttttttttk..",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        "..k.k.k.k.k.k.k.k.k.k.k.k.k.k...",
        "..k.k.k.k.k.k.k.k.k.k.k.k.k.k...",
      ],
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
