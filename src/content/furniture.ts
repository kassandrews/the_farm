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

export type FurnitureId =
  | "bed"
  | "table"
  | "chair"
  | "shelf"
  | "cushion"
  | "rug"
  | "lamp"
  | "noticeboard"
  | "stage";

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
  // --- The one thing made of metal -----------------------------------------
  // Ore's sink, and the only row in this table that can be placed underground
  // (sim/furniture.ts takes a layer; ui/app.ts allows exactly this tool and
  // erase down there). `items.ts` says ore is "found low down, where the light
  // gives up" — this is the object that makes that stop being true.
  //
  // ORE ALONE, which is allowed here and would not be at the Menace's counter.
  // "No row may list ore alone" (DESIGN §Materials) is a rule about payment
  // ALTERNATIVES — a barter row that only took ore would make digging the price
  // of cloth. A placement cost is the other thing entirely: a bed costs wood
  // alone and nothing about that gates anything, because you are choosing to
  // put a lamp down. Nothing in the game requires one, and lamp.test.ts asserts
  // no structure or bed ever costs ore.
  //
  // NOT SOLID, and that is load-bearing rather than taste. `isWalkable` returns
  // early underground — the rock is the only thing that can stop you down there
  // — so a solid piece in the tunnel would be invisible to the pathfinder and
  // to the Mole. It is also the chair rule at its strongest: a one-wide corridor
  // is the smallest room in the game, and a lamp you had to squeeze past in one
  // would be miserable.
  //
  // 18, not 22. Tall enough to stand up and cast from head height, and short of
  // the occlusion fade's threshold (half a tile at STOREY 24) — roofs should be
  // that machinery's first real user, not this.
  //
  // `finish: "wood"` because the POST is timber and takes your wood finishes.
  // The head is brass in every town: a finish that cost ore would break the
  // free-appearance axis, and a metal finish class is the tempting-and-wrong
  // version of this whole feature (ROADMAP §"Ore's sink").
  lamp: {
    id: "lamp",
    name: "Lamp",
    cost: { ore: 2 },
    w: 1,
    h: 1,
    solid: false,
    height: 18,
    finish: "wood",
  },
  // --- Town furniture, which is not for sale -------------------------------
  // The errands board. It is a row here because it is a thing standing in a
  // cell with a footprint, a height and a finish, and that is exactly what this
  // table is for — inventing a parallel "fixture" layer for one object would
  // give the renderer, the pathfinder and the room flood-fill a second kind of
  // thing to have an opinion about, for no gain.
  //
  // IT IS NOT IN THE BUILD MENU. That menu is the hand-written BUILD_TOOLS list
  // in ui/app.ts, not a walk of this table, so a row here is not an offer — and
  // the empty cost is what it means: nothing prices it, because nothing sells
  // it. The town put it there.
  //
  // SOLID, and tall enough to read as a board rather than a crate. Solid is the
  // right call outdoors where the chair rule (don't make a small room a maze)
  // doesn't apply: you walk up to a notice board, you do not walk through it.
  noticeboard: {
    id: "noticeboard",
    name: "The Errands Board",
    cost: {},
    w: 1,
    h: 1,
    solid: true,
    height: 22,
    finish: "wood",
  },
  // The plaza stage. Town furniture like the board — no cost, not in the build
  // menu, put there by the town.
  //
  // 2x2, WHICH IS MAX_SPAN AND NOT A COINCIDENCE. A three-wide platform was the
  // first instinct and it would have meant widening MAX_SPAN, which is the
  // bound on "which anchor covers this cell" and on undo's capture window — a
  // core constant loosened for one decorative object. Two by two is a platform
  // you can see somebody standing on, which is the whole requirement.
  //
  // LOW, and low is the point. Everything else that stands up in this game
  // reads as height by overhanging the cell behind it; a stage that did that
  // would hide its own performer, which is the Blessed Carrot bug rebuilt on
  // purpose. It is a step up, not a structure.
  //
  // SOLID, like the board: outdoors, where the chair rule about not making a
  // small room a maze doesn't apply. You stand in front of a stage. The Blob
  // stands beside it, which is a fact about content/festivals.ts, not this row.
  stage: {
    id: "stage",
    name: "The Plaza Stage",
    cost: {},
    w: 2,
    h: 2,
    solid: true,
    height: 8,
    finish: "wood",
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
