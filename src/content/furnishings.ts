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
import type { PieceArt } from "../render/furnishings";
import { INK } from "../render/furnishings";

/** Pieces drawn from art. Partial ON PURPOSE and permanently: `noticeboard` and
 *  `stage` are town fixtures whose procedural cases already say what they are,
 *  and the lamp leaves the generic path before this is ever consulted. A missing
 *  row is a piece that has not been converted, not a bug. */
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
};
