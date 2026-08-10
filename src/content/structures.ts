// Structures — the things that STAND UP (DESIGN §"Structures and the third
// dimension"). Content is data (CLAUDE.md): a structure is a row here, not a
// code path.
//
// These live in their own sparse layer (WorldState.build), not in the tilemap,
// because a tile answers "what is the ground here" and a structure answers
// "what is standing on it". A wall needs both: floor underneath, wall on top.
//
// Two rules from DESIGN worth restating where they'll be read:
//
//   • There is ONE wall material, autotiled. The player paints "wall" and the
//     four-neighbour mask picks how it's drawn. Nobody chooses a north-west
//     corner piece from a menu — that's the same rule that keeps finishes off
//     the item list, applied to shape instead of colour.
//   • Orientation belongs to FURNITURE, never to structure. A bed is 1×2 and
//     faces a way; a wall's neighbours decide how it looks. So there is no
//     `facing` field here, on purpose.
//
// Ids are strings and are stored in saves, so they are STABLE — add rows, never
// rename one without a migration.

import type { BuildPrice } from "./items";
import type { SkinClass } from "./skins";

export type StructureId = "wall" | "door" | "window";

export interface StructureDef {
  id: StructureId;
  name: string;
  /** What placing it costs. Small on purpose: a rhythm, not an economy
   *  (DESIGN §Materials). Placing a thing IS making it — no recipe tree.
   *
   *  A bare number is N of the finish's own material — see items.BuildPrice. */
  cost: BuildPrice;
  /** Blocks walking. A door is a hole you can walk through, which is precisely
   *  what makes it worth having a separate row for. */
  solid: boolean;
  /** Counts as part of the shell when working out whether a room is enclosed.
   *  A door seals a room even though you can walk through it — otherwise every
   *  house would leak at its own front door and never get a roof. */
  encloses: boolean;
  /** Which finish classes it may wear — a LIST, because a wall may be boards
   *  or flagstones and the player picks by pointing at the look they want
   *  (DESIGN §Materials: "the player is never asked which class they mean").
   *
   *  It was a single class until floors got their own finish. That was fine
   *  while every buildable was timber, but it made the stone finishes — granite
   *  from the start, slate twelve tiles down a tunnel, cobble for twelve junk —
   *  unwearable by anything in the game. They were obtainable and had nowhere
   *  to go. */
  finishes: SkinClass[];
}

export const STRUCTURES: Record<StructureId, StructureDef> = {
  wall: {
    id: "wall",
    name: "Wall",
    // Two units a wall, against one a floor tile: a wall is more of a thing
    // than a board, and one tree (8 wood) still puts up four of them. Two of
    // STONE if you asked for flagstones — same number, different stuff, which
    // is the whole of the cost-follows-material rule.
    cost: 2,
    solid: true,
    encloses: true,
    finishes: ["wood", "stone"],
  },
  door: {
    id: "door",
    name: "Door",
    cost: 4,
    solid: false,
    encloses: true,
    // NO FINISH AT ALL, which is the door's own old argument carried one step
    // further. It was wood-only because a door is a made object rather than a
    // surface — it swings, it has a handle, it is the one part of a wall you
    // touch — and a slab of granite on hinges is a portcullis. But a door is
    // also always SET INTO a wall that already has a finish, and it lays over
    // whatever that is: the stone reaches the wall and stops at the frame
    // (`shellFinish`), so the only thing the player was choosing here was which
    // timber the frame of an opening in somebody else's masonry was cut from.
    // That is a choice about a detail nobody looks at, occupying the slot where
    // the choice that matters — WHICH DOOR — is going to go (ROADMAP §a swatch
    // for every surface).
    //
    // An empty list is a tool with nothing to pick, and every path already
    // handles that: `loadedFinish` falls back to the default for wood, so a new
    // door is still framed in pine and still costs wood; the build menu's style
    // level does not open for a tool with fewer than two options, so tapping
    // Door simply arms it. Doors ALREADY BUILT keep the finish stored on their
    // cell — nothing repaints, and a walnut frame you chose last month stays
    // walnut.
    finishes: [],
  },
  window: {
    id: "window",
    name: "Window",
    // A door's price. A window is the same kind of thing — a made object set
    // into a wall, not more wall — and pricing it under a door would say it was
    // the lesser piece of joinery, which it is not.
    //
    // NO GLASS MATERIAL, deliberately. DESIGN's rule is that placing a thing IS
    // making it, with no recipe tree, and every buildable costs N of its own
    // material. Glass would have been a new inventory line, a new barter row at
    // the Menace, a save field, and a gate on building windows at all — four
    // new things to make one existing thing slightly more literal.
    cost: 4,
    // SOLID, and this is the whole difference from a door. A door is a hole you
    // may walk through; a window is a hole you may only look through. It is the
    // first structure that is solid AND has an opening, which is why the
    // renderer cannot simply reuse either of the paths it already had.
    solid: true,
    // Obviously. A room does not stop being a room because it has a window, and
    // a house that lost its roof when you glazed it would be a bad joke.
    encloses: true,
    // None, on exactly the door's argument above — a window is a made object
    // set into somebody else's wall, and the sash was the last place in the
    // game you could pick a timber nobody would ever notice you had picked.
    // `shellFinish` is what makes this safe: the masonry runs right up to the
    // opening and stops at the frame, which is why the museum's marble still
    // meets a wooden window and no further.
    finishes: [],
  },
};

export function structureDef(id: StructureId): StructureDef {
  return STRUCTURES[id];
}

/** Does this structure form part of a wall RUN, for autotiling purposes? A door
 *  does: a doorway in the middle of a wall should leave the wall reading as one
 *  continuous line with a hole in it, not as two walls that happen to be near
 *  each other. So does a window, for the same reason and more strongly — you can
 *  see straight through the fact that a window is still wall. */
export function joinsWallRun(id: StructureId): boolean {
  return id === "wall" || id === "door" || id === "window";
}
