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

import type { BuildPrice } from "./items";
import type { SkinClass } from "./skins";

export type FurnitureId =
  | "bed"
  | "table"
  | "chair"
  | "shelf"
  | "cushion"
  | "rug"
  | "lamp"
  // --- The furnishing pass ---------------------------------------------------
  // Seating, surfaces, storage and light, so a room can be a KIND of room rather
  // than a room with a bed in it. Grouped the way the build bar groups them,
  // because that is the only order anybody will ever meet them in.
  | "stool"
  | "bench"
  | "sofa"
  | "coffeetable"
  | "desk"
  | "nightstand"
  | "cot"
  | "wardrobe"
  | "chest"
  | "dresser"
  | "desklamp"
  | "painting"
  | "fireplace"
  | "noticeboard"
  | "stage"
  /** The seed stall's canopy — see the row for why a stall is furniture and not
   *  a building. */
  | "awning"
  | "windowbox";

/** Which way a piece is turned. "s" is the default — facing the camera. */
export type Facing = "n" | "e" | "s" | "w";

export const FACINGS: Facing[] = ["s", "w", "n", "e"];

export interface FurnitureDef {
  id: FurnitureId;
  name: string;
  cost: BuildPrice;
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
  /** No top surface: draw the FACE and nothing else.
   *
   *  The default geometry for a standing piece is a near face plus a top surface
   *  the depth of its footprint, which is right for everything you look down on —
   *  a table, a bed, a chest — and wrong for anything whose whole point is the
   *  vertical plane. A board with a 16px lid on it reads as a crate no matter
   *  what is drawn on the front, because the lid is half the shape.
   *
   *  Distinct from `mount: "wall"`, which hangs a piece on the face of the wall
   *  in its own cell and has no floor geometry at all. A flat piece still STANDS
   *  somewhere — it has a footprint, it is solid, you can put it anywhere — it
   *  just has no top. */
  flat?: boolean;

  /** Which finish classes it may wear. A list to match structures, though every
   *  row here is single-class and probably always will be: a piece of furniture
   *  is a made object, and unlike a floor or a wall it is not a surface you
   *  could plausibly render in either timber or stone. The list buys one code
   *  path in the picker, not an open axis. */
  finishes: SkinClass[];
  /** Does it burn? A FIELD rather than `id === "lamp"` in the renderer, which is
   *  what it was until a second light existed. Lit pieces pool warm light at
   *  night and make the room they stand in read as occupied from outside, which
   *  is what a window shows (see render/roof.ts and drawWindowGlow).
   *
   *  Being a light is a property of the object, so it belongs here — the same
   *  argument `speed` on a tile makes about how ground feels underfoot. */
  light?: boolean;
  /** What it stands on. Omitted means the floor, which is every other row.
   *
   *  `"wall"` is the painting, and it is the one piece in the table that does
   *  not occupy a tile you could walk on: it hangs on the FACE of a wall cell.
   *  That inverts the placement rule rather than relaxing it — the floor rows
   *  refuse a cell that already holds a wall, and this one requires it.
   *
   *  A field rather than a second layer beside `furniture`. A painting is a
   *  thing with a footprint, a finish and a facing-less silhouette, which is
   *  exactly what this table is for; a parallel map would give the renderer,
   *  the pathfinder and the room fill a second kind of thing to have an opinion
   *  about, which is the argument the notice board already settled. */
  mount?: "wall";
  /** What it must have BEHIND it — north of its own northernmost row.
   *
   *  `"wall"` is the fireplace, and it is a placement rule with a rendering
   *  reason rather than a taste. A hearth carries a chimney (see `hearth`), the
   *  chimney is drawn on the roof cell directly above it, and a stack on the
   *  roof's near edge stands in front of its own eave and reads as a crate
   *  sitting on the gutter. Backed against a wall, a fireplace can only stand on
   *  a room's back row, so the stack always breaks the silhouette where the roof
   *  meets the sky — which is where a chimney is legible.
   *
   *  It is also just what a fireplace is. The flue has to go up through
   *  something.
   *
   *  Distinct from `mount: "wall"`, which puts a piece IN the wall cell. This
   *  one stands on the floor in front of one. */
  backs?: "wall";
  /** Is this a CATALOG FORM — one of the slots every set must cover?
   *
   *  DESIGN §The catalog: a form is what a room needs, and the guarantee being
   *  made is that any form × any set you have × any finish you have exists. So
   *  this flag is an obligation, not a label: setting it on a row means every
   *  set that ever ships owes that row a drawing, which is why forms are
   *  deliberately expensive and a new one has to be reached for and found
   *  missing rather than merely sound like a good idea.
   *
   *  Absent means no set reskins it, and there are two ways to be absent. The
   *  notice board and the stage are the TOWN'S — nothing sells them, nobody
   *  places them. The awning and the window box belong to the BUILDING rather
   *  than to the room: you fit them to a shopfront or a sill, and a suite of
   *  furniture has no opinion about either. Both kinds are still perfectly
   *  ordinary furniture rows; they simply sit outside the lattice. */
  form?: boolean;

  /** Does a chimney come out of the roof over it?
   *
   *  A FIELD rather than `id === "fireplace"` in the renderer, which is the
   *  argument `light` already made one light too late. It is also what the
   *  chimney is derived FROM now: `chimneyCell` used to hash a cell out of the
   *  room's back third, with its own docblock apologising that a chimney you
   *  positioned by hand would be the first placed thing on a roof. A hearth
   *  settles that — you do not place the chimney, you place the FIRE, and the
   *  flue comes out above it. Same relationship the roof itself has with the
   *  walls that hold it up. */
  hearth?: boolean;
}

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  bed: {
    id: "bed",
    form: true,
    name: "Bed",
    cost: { wood: 6 },
    w: 1,
    h: 2,
    solid: true,
    height: 10,
    finishes: ["wood"],
  },
  table: {
    id: "table",
    form: true,
    name: "Table",
    cost: { wood: 4 },
    w: 2,
    h: 1,
    solid: true,
    height: 12,
    finishes: ["wood"],
  },
  chair: {
    id: "chair",
    form: true,
    name: "Chair",
    cost: { wood: 2 },
    w: 1,
    h: 1,
    // Walk-through: a chair you can't step past turns a 4x3 room into a maze.
    solid: false,
    height: 14,
    finishes: ["wood"],
  },
  shelf: {
    id: "shelf",
    form: true,
    name: "Shelf",
    cost: { wood: 3 },
    w: 1,
    h: 1,
    solid: false,
    height: 18,
    finishes: ["wood"],
  },
  // --- Soft goods, bought not gathered -------------------------------------
  // Both are LOW and both are walk-on. A cushion you had to path around would
  // make a small room annoying, and rooms here are exactly as big as you built
  // them — the same reasoning that keeps chairs sparing, applied harder to the
  // things whose whole job is to make a floor feel lived on.
  cushion: {
    id: "cushion",
    form: true,
    name: "Cushion",
    cost: { cloth: 2 },
    w: 1,
    h: 1,
    solid: false,
    height: 4,
    finishes: ["cloth"],
  },
  rug: {
    id: "rug",
    form: true,
    name: "Rug",
    cost: { cloth: 4 },
    w: 2,
    h: 2,
    solid: false,
    // Almost flat: a rug is a floor that is nicer, not a thing standing on one.
    height: 1,
    finishes: ["cloth"],
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
  // `finishes: ["wood"]` because the POST is timber and takes your wood
  // finishes, while `cost` stays an explicit ore record rather than a bare
  // number — this is the one row where what it looks like and what it costs
  // are unrelated, and a number would have quietly repriced it in timber.
  // The head is brass in every town: a finish that cost ore would break the
  // free-appearance axis, and a metal finish class is the tempting-and-wrong
  // version of this whole feature (ROADMAP §"Ore's sink").
  // THE FIRST THING IN THIS TABLE MADE OF STONE, and that is worth stating: every
  // other row is wood or cloth, so stone has been a wall-and-floor material with
  // no made object to its name since it was gatherable. A hearth is the obvious
  // one. It also gives the drystone finishes somewhere to go that is not a
  // paddock.
  fireplace: {
    id: "fireplace",
    form: true,
    name: "Fireplace",
    // A BARE NUMBER, so it resolves against the finish's own material — eight
    // STONE, because `finishes` is stone-only. That is the cost-follows-material
    // rule (DESIGN §Materials) rather than a literal price, and it is the right
    // shape here even though there is only one class to resolve against: the
    // next masonry finish inherits the price without an edit.
    //
    // Eight, which is a rock and a half and more than any other single piece.
    // A fireplace should be the thing you decide to build, not something you put
    // in because you had the stone spare.
    cost: 8,
    w: 2,
    h: 1,
    solid: true,
    // Taller than a dresser (12) and deliberately UNDER the wardrobe's 20, which
    // the wardrobe's own note claims as "the tallest thing you can put in a
    // room". A mantel is chest height; the breast above it reads as going up
    // into the wall rather than as a second object.
    height: 16,
    finishes: ["stone"],
    // It burns. So a room with a fire in it reads as occupied from the street at
    // night through its own windows (render/renderer.ts §drawWindowGlow) — which
    // costs nothing to add here and is most of what a hearth is FOR in a game
    // with no temperature.
    light: true,
    backs: "wall",
    hearth: true,
  },
  lamp: {
    id: "lamp",
    form: true,
    // "Floor lamp" now that a desk one exists. The ID stays `lamp` — it is
    // written into every save that has ever placed one, and a name is not an id.
    name: "Floor lamp",
    cost: { ore: 2 },
    w: 1,
    h: 1,
    solid: false,
    height: 18,
    finishes: ["wood"],
    light: true,
  },
  // --- Seating ---------------------------------------------------------------
  // ALL OF IT WALK-THROUGH, which is the chair rule applied consistently rather
  // than case by case: rooms here are exactly as big as you built them, and a
  // seat you have to path around turns a 4x3 room into a maze. The sofa is the
  // one exception and earns it by being 2x1 and waist-high — you do not step
  // over a sofa, and one is never the only way across a room.
  stool: {
    id: "stool",
    form: true,
    name: "Stool",
    cost: { wood: 2 },
    w: 1,
    h: 1,
    solid: false,
    // Lower than a chair (14) because that difference IS the object. A stool is
    // a chair with the back taken off, and if it stood as tall it would just be
    // a chair drawn worse.
    height: 10,
    finishes: ["wood"],
  },
  bench: {
    id: "bench",
    form: true,
    name: "Bench",
    cost: { wood: 3 },
    w: 2,
    h: 1,
    solid: false,
    height: 11,
    finishes: ["wood"],
  },
  sofa: {
    id: "sofa",
    form: true,
    name: "Sofa",
    // The one row that costs two materials, and the only place the frame and
    // the covering are priced separately. A sofa is genuinely both, and the
    // cloth half keeps it behind the Menace's counter where soft goods belong.
    cost: { wood: 3, cloth: 4 },
    w: 2,
    h: 1,
    solid: true,
    height: 16,
    // CLOTH, so the finish picker offers the upholstery. The frame and feet are
    // drawn in a literal timber and take no finish at all — the lamp's brass
    // argument (see skins/BRASS): a thing made of two materials wears the one
    // you would actually choose, and the other stays itself.
    finishes: ["cloth"],
  },

  // --- Tables and surfaces ---------------------------------------------------
  coffeetable: {
    id: "coffeetable",
    form: true,
    name: "Coffee table",
    cost: { wood: 3 },
    w: 2,
    h: 1,
    // Low enough to step over, so it is not solid — same reasoning as the
    // cushion, applied to the one table that sits in the middle of a floor
    // rather than against a wall.
    solid: false,
    height: 7,
    finishes: ["wood"],
  },
  desk: {
    id: "desk",
    form: true,
    name: "Desk",
    cost: { wood: 5 },
    w: 2,
    h: 1,
    solid: true,
    height: 12,
    finishes: ["wood"],
  },
  nightstand: {
    id: "nightstand",
    form: true,
    name: "Nightstand",
    cost: { wood: 2 },
    w: 1,
    h: 1,
    solid: false,
    height: 10,
    finishes: ["wood"],
  },

  // --- Sleeping --------------------------------------------------------------
  cot: {
    id: "cot",
    form: true,
    name: "Cot",
    // Cheap, and cheap is the whole character of it: a bed costs 6 wood, this
    // costs 2 and 2. It is what you put in a room you have only just walled in.
    cost: { wood: 2, cloth: 2 },
    w: 1,
    h: 2,
    // NOT SOLID, unlike a bed. A cot is canvas slung on a frame at shin height,
    // and a spare one shoved against a wall should never be the reason somebody
    // cannot get to the door.
    solid: false,
    height: 6,
    finishes: ["cloth"],
  },

  // --- Storage ---------------------------------------------------------------
  wardrobe: {
    id: "wardrobe",
    form: true,
    name: "Wardrobe",
    cost: { wood: 6 },
    w: 1,
    h: 1,
    solid: true,
    // The tallest thing you can put in a room, and deliberately two short of
    // the notice board's 22 so that the tallest object in the game stays a
    // piece of town furniture standing outdoors.
    height: 20,
    finishes: ["wood"],
  },
  chest: {
    id: "chest",
    form: true,
    name: "Chest",
    cost: { wood: 3 },
    w: 1,
    h: 1,
    solid: false,
    height: 9,
    finishes: ["wood"],
  },
  dresser: {
    id: "dresser",
    form: true,
    name: "Dresser",
    cost: { wood: 4 },
    w: 2,
    h: 1,
    solid: true,
    height: 12,
    finishes: ["wood"],
  },

  // --- Light -----------------------------------------------------------------
  // The lamp above is the FLOOR lamp; this is the one that stands on a desk.
  desklamp: {
    id: "desklamp",
    form: true,
    name: "Desk lamp",
    // Half the floor lamp's ore, because it is half the lamp. Ore alone is
    // allowed for a placement cost — see the long note on `lamp`, which is
    // about barter rows and not about this.
    cost: { ore: 1 },
    w: 1,
    h: 1,
    solid: false,
    // Short, and it should be: this is the light you put ON something. Standing
    // on a desk (12) it reaches 21, which is about where the floor lamp's head
    // is on its own — two lights at one height, arrived at two ways.
    height: 9,
    finishes: ["wood"],
    light: true,
  },

  painting: {
    id: "painting",
    form: true,
    name: "Painting",
    // The frame is the only part anybody makes; the picture is the picture.
    cost: { wood: 2 },
    w: 1,
    h: 1,
    // Moot, and set false rather than true so nothing reads it as the reason a
    // wall blocks you. The WALL is solid. A painting has no footprint on the
    // floor at all, which is the whole point of `mount`.
    solid: false,
    // On a wall-mounted piece `height` is how tall the art is, not how far it
    // stands off a floor — there is no floor under it. Fourteen of the wall
    // face's twenty-one usable pixels, so it hangs clear of the cap above and
    // the skirting below rather than filling the wall like a poster.
    height: 14,
    finishes: ["wood"],
    mount: "wall",
  },
  windowbox: {
    id: "windowbox",
    name: "Window box",
    // A trough of flowers on a sill. WALL-MOUNTED, like the painting, which is
    // what lets it share a cell with the window it sits under: `build` and
    // `furniture` are separate maps, so the sash occupies the wall and the box
    // occupies the same coordinate in the other layer. Anything else would have
    // needed a second structure per cell, which nothing here supports.
    //
    // Cheap, and wood only. The flowers are not a material and are not bought —
    // they are what a window box HAS, the way a painting has a picture
    // (§painting: "the frame is the only part anybody makes").
    cost: { wood: 2 },
    w: 1,
    h: 1,
    solid: false,
    // The art's own height. A mounted piece is hung from under the wall's cap
    // and drawn downward, so the grid has to be tall enough to REACH the sill —
    // nine blank rows and then the box. Hanging it high like a painting would
    // have put a trough of geraniums level with the lintel.
    height: 19,
    finishes: ["wood"],
    mount: "wall",
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
  // Derek's canopy, and the reason he has no building.
  //
  // A market stall is a counter with something over it, and until now this town
  // could not draw one: an open-fronted stall is a room the flood fill never
  // closes, so every rule about roofs, doorsteps and cutaways would have needed
  // an exception for one structure — which is why the seed stall spent a year
  // being a small building that everybody agreed to call a stall. The way out is
  // that it was never a STRUCTURE question at all. A canopy is furniture, like
  // the plaza stage, and furniture needs no room around it.
  //
  // WALK-THROUGH, because it is overhead. You stand under an awning; a canopy you
  // could not step beneath would be a shed with the walls missing, which is the
  // shape this is escaping.
  awning: {
    id: "awning",
    name: "Awning",
    // TWO WOOD AND ONE CLOTH, per cell — you buy an awning by the yard now.
    cost: { wood: 2, cloth: 1 },
    // ONE CELL, AND THEY JOIN — the windows' rule, not the beds'.
    //
    // It was two, then briefly three, and both were wrong in the same way: a
    // fixed-width canopy fits exactly one building. At two it stopped halfway
    // along The Counter's three-cell shopfront and read as an awning that did not
    // fit; at three it hung a cell past Derek's two-cell stall and read as a
    // canopy sliding off. There is no third number that is right for both, and
    // looking for one was the mistake.
    //
    // So the width is the PLAYER'S, laid a cell at a time, and adjacent awnings
    // draw as one continuous sheet — the same answer walls, fences and window
    // sashes already give. That makes "how wide is an awning" a question about
    // the thing you are covering rather than a constant somebody has to guess,
    // and it is why the shop's spans three and Derek's spans two without either
    // being a special case.
    w: 1,
    h: 1,
    solid: false,
    // THE FREE-STANDING HEIGHT — the head of a stall's own posts. An awning with
    // a wall behind it ignores this and hangs from the top of that wall instead,
    // which the renderer derives rather than the table declaring (§drawAwning's
    // call site). Two numbers, because they are two objects: a market stall and a
    // shopfront awning are not the same height off the ground and never were.
    height: 14,
    finishes: ["wood"],
  },
  noticeboard: {
    id: "noticeboard",
    name: "The Errands Board",
    cost: {},
    w: 1,
    h: 1,
    solid: true,
    height: 22,
    // FLAT — a panel, not a box. See `flat` on the interface: the generic path
    // gives every piece a top surface the depth of its footprint, and on a board
    // that lid was half the silhouette. It had been dressed up as a little
    // pitched roof to stop it reading as a crate, which worked and was a fix for
    // the wrong problem. A parish notice board is a face on legs, and it hangs
    // against the town hall's wall, where a face is all there is to see.
    flat: true,
    finishes: ["wood"],
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
    finishes: ["wood"],
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
