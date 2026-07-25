// Furniture — the things you put IN a room, as opposed to the things that make
// one. Content is data (CLAUDE.md): a piece is a row here, not a code path.
//
// This is where DESIGN's orientation rule lands. A wall has no facing (its
// neighbours decide how it's drawn); a bed is 1x2 and genuinely faces a way.
// So `facing` lives here and nowhere in src/content/structures.ts.
//
// Most of this is WOODEN, and the soft rows work the same way with a material
// you cannot gather. The original rule here read "resist adding a cloth row",
// which was aimed at the right thing and stated slightly too broadly: what must
// never happen is soft goods being BUILDABLE OUT OF WHAT YOU GATHER, because
// then the Menace's counter has no reason to exist (DESIGN §Materials).
//
// A cushion costs `cloth`, and cloth is bought from her and from nowhere else.
// So the counter still guards the whole soft category, placement still works
// exactly the way it does for a chair, and "placing a thing IS making it" needs
// no exception. What you barter for is the stuff; what you do with it is free.
//
// Ids are stored in saves, so they are STABLE. Add rows; never rename one
// without a migration.

import type { ItemId } from "./items";
import type { SkinClass } from "./skins";

export type FurnitureId = "bed" | "table" | "chair" | "shelf" | "cushion" | "rug";

/** Which way a piece is turned. "s" is the default — facing the camera. */
export type Facing = "n" | "e" | "s" | "w";

export const FACINGS: Facing[] = ["s", "w", "n", "e"];

export interface FurnitureDef {
  id: FurnitureId;
  name: string;
  cost: Partial<Record<ItemId, number>>;
  /** Footprint in tiles when facing "s"/"n". Turned east or west, these swap. */
  w: number;
  h: number;
  /** Blocks walking. Kept sparing on purpose: furniture you have to squeeze
   *  around is furniture that makes a small cozy room annoying, and rooms here
   *  are exactly as big as you built them (no TARDIS interiors). */
  solid: boolean;
  /** How far it stands off the floor, in scene px. Below TILE on purpose for
   *  the low pieces — they should read as sitting IN the room, not looming. */
  height: number;
  finish: SkinClass;
}

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  bed: {
    id: "bed",
    name: "Bed",
    cost: { wood: 6 },
    w: 1,
    h: 2,
    solid: true,
    height: 10,
    finish: "wood",
  },
  table: {
    id: "table",
    name: "Table",
    cost: { wood: 4 },
    w: 2,
    h: 1,
    solid: true,
    height: 12,
    finish: "wood",
  },
  chair: {
    id: "chair",
    name: "Chair",
    cost: { wood: 2 },
    w: 1,
    h: 1,
    // Walk-through: a chair you can't step past turns a 4x3 room into a maze.
    solid: false,
    height: 14,
    finish: "wood",
  },
  shelf: {
    id: "shelf",
    name: "Shelf",
    cost: { wood: 3 },
    w: 1,
    h: 1,
    solid: false,
    height: 18,
    finish: "wood",
  },
  // --- Soft goods, bought not gathered -------------------------------------
  // Both are LOW and both are walk-on. A cushion you had to path around would
  // make a small room annoying, and rooms here are exactly as big as you built
  // them — the same reasoning that keeps chairs sparing, applied harder to the
  // things whose whole job is to make a floor feel lived on.
  cushion: {
    id: "cushion",
    name: "Cushion",
    cost: { cloth: 2 },
    w: 1,
    h: 1,
    solid: false,
    height: 4,
    finish: "cloth",
  },
  rug: {
    id: "rug",
    name: "Rug",
    cost: { cloth: 4 },
    w: 2,
    h: 2,
    solid: false,
    // Almost flat: a rug is a floor that is nicer, not a thing standing on one.
    height: 1,
    finish: "cloth",
  },
};

export function furnitureDef(id: FurnitureId): FurnitureDef {
  return FURNITURE[id];
}

/** The largest span any piece occupies on either axis. Bounds the search for
 *  "which anchor covers this cell", so nothing has to keep a duplicate
 *  occupancy map that could drift out of sync with the anchors. */
export const MAX_SPAN = 2;

/** Footprint after turning. East/west rotate the piece, swapping its axes. */
export function footprint(def: FurnitureDef, facing: Facing): { w: number; h: number } {
  return facing === "e" || facing === "w" ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

/** Does a piece anchored at (ax, ay) cover (x, y)? The anchor is always the
 *  north-west cell of the footprint. */
export function covers(
  ax: number,
  ay: number,
  def: FurnitureDef,
  facing: Facing,
  x: number,
  y: number,
): boolean {
  const { w, h } = footprint(def, facing);
  return x >= ax && x < ax + w && y >= ay && y < ay + h;
}
