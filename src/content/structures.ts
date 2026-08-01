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

export type StructureId = "wall" | "door";

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
    // Wood only, and not an oversight. A door is a made object rather than a
    // surface — it swings, it has a handle, it is the one part of a wall you
    // touch — and a slab of granite on hinges is a portcullis. The stone
    // finishes reach the wall it sits in; they stop at the door itself.
    finishes: ["wood"],
  },
};

export function structureDef(id: StructureId): StructureDef {
  return STRUCTURES[id];
}

/** Does this structure form part of a wall RUN, for autotiling purposes? A door
 *  does: a doorway in the middle of a wall should leave the wall reading as one
 *  continuous line with a hole in it, not as two walls that happen to be near
 *  each other. */
export function joinsWallRun(id: StructureId): boolean {
  return id === "wall" || id === "door";
}
