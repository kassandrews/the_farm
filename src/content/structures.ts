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

import type { ItemId } from "./items";

export type StructureId = "wall" | "door";

export interface StructureDef {
  id: StructureId;
  name: string;
  /** What placing it costs. Small on purpose: a rhythm, not an economy
   *  (DESIGN §Materials). Placing a thing IS making it — no recipe tree. */
  cost: Partial<Record<ItemId, number>>;
  /** Blocks walking. A door is a hole you can walk through, which is precisely
   *  what makes it worth having a separate row for. */
  solid: boolean;
  /** Counts as part of the shell when working out whether a room is enclosed.
   *  A door seals a room even though you can walk through it — otherwise every
   *  house would leak at its own front door and never get a roof. */
  encloses: boolean;
  /** Which finish class it wears, so a built wall follows the same free
   *  appearance axis as a floor. */
  finish: "wood" | "stone";
}

export const STRUCTURES: Record<StructureId, StructureDef> = {
  wall: {
    id: "wall",
    name: "Wall",
    // Two boards a wall, against one a floor board: a wall is more of a thing
    // than a plank, and one tree (8 wood) still puts up four of them.
    cost: { wood: 2 },
    solid: true,
    encloses: true,
    finish: "wood",
  },
  door: {
    id: "door",
    name: "Door",
    cost: { wood: 4 },
    solid: false,
    encloses: true,
    finish: "wood",
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
