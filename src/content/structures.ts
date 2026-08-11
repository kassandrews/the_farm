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

export type StructureId =
  | "wall"
  | "door"
  /** The four sashes. FOUR ROWS AND NOT ONE ROW WITH A STYLE FIELD, which is the
   *  same call `fence` made against being a short wall: a transom and a tall
   *  sash are two different openings, not one opening in two colours. A style
   *  field would also have had to live on BuildCell — a save field, a migration,
   *  and a second axis of choice bolted onto the swatch level, which is typed to
   *  finishes end to end.
   *
   *  Four ids cost four table rows and four build chips and need NO migration at
   *  all: an id is a string in a union, and no save in the world contains these
   *  yet. */
  | "window"
  | "window_paned"
  | "window_transom"
  | "window_narrow"
  | "window_plate"
  /** Wall with a pair of barn doors PAINTED on it. Not a sash and not a door:
   *  nothing opens and nothing is glazed. See its row. */
  | "barn_doors"
  /** The one structure that is not in a wall. See its row. */
  | "skylight"
  | "fence";

/** Is this one of the sashes? Asked in five places — the wall run, the shell
 *  finish, the renderer's dispatch, the merge test and the town stamp — and
 *  every one of them wants "an opening in a wall", not a particular sash.
 *
 *  A prefix test rather than a set literal, so the next sash is one table row
 *  and nothing else. The ids are save keys and therefore frozen, which is what
 *  makes leaning on their spelling safe here and nowhere else. */
export function isWindow(id: StructureId): boolean {
  return id === "window" || id.startsWith("window_");
}

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
  /** Where it sits, when that is not "standing on this cell".
   *
   *  `"roof"` is the skylight and is the only value, and it exists for the same
   *  reason `mount: "wall"` exists on the painting: the piece occupies a cell in
   *  the layer without occupying the GROUND of that cell. Everything that reads
   *  the build layer as "something is in the way here" — furniture placement,
   *  the raised draw pass — has to ask this before it assumes a wall.
   *
   *  Omitted on every other row, which is the honest default: a wall is on the
   *  ground and a fence is on the ground. */
  mount?: "roof";
}

/** Does this piece live a storey up, over a cell rather than on it? */
export function overhead(id: StructureId): boolean {
  return STRUCTURES[id].mount === "roof";
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
  window_paned: {
    id: "window_paned",
    name: "Paned window",
    // A window's price and not a penny more. The muntins are the SAME opening
    // divided up — no more glass, no more hole in the wall — and charging for
    // them would be charging for a pattern, which is the finish rule (a look is
    // free) wearing a different hat.
    cost: 4,
    solid: true,
    encloses: true,
    finishes: [],
  },
  window_transom: {
    id: "window_transom",
    name: "Transom",
    // HALF A WINDOW'S PRICE, because it is half a window: a band of glass high
    // in the wall, over your head. That is the one place a cost may follow a
    // shape rather than a material, and it does it honestly — you get less
    // opening and you pay less for it.
    cost: 2,
    solid: true,
    encloses: true,
    finishes: [],
  },
  window_narrow: {
    id: "window_narrow",
    name: "Narrow window",
    // The transom's price, turned ninety degrees. Same argument.
    cost: 2,
    solid: true,
    encloses: true,
    finishes: [],
  },
  window_plate: {
    id: "window_plate",
    name: "Plate glass",
    // A window's price, exactly as the paned sash is. The muntin rule read the
    // other way round: if dividing an opening may not cost extra, then NOT
    // dividing it may not either. What you are buying is the hole in the wall,
    // and all four of these are the same hole.
    //
    // WHAT MAKES IT ITS OWN ROW is the one thing no other sash can do — it drops
    // the MULLION as well as the muntins, so a run of them is a single unbroken
    // sheet of glass rather than a row of panes sharing a frame. Every other
    // window in the game posts a bar at each cell boundary it merges across,
    // which is right for joinery and wrong for a shopfront or a gallery: those
    // are one piece of glass that happens to be four cells long, and the whole
    // point of them is that nothing interrupts it.
    //
    // It is not the plain window with a flag on it for the same reason the paned
    // sash isn't: the player is choosing between two pictures, and a picture you
    // cannot pick from the menu is not a choice.
    cost: 4,
    solid: true,
    encloses: true,
    finishes: [],
  },
  barn_doors: {
    id: "barn_doors",
    name: "Barn doors",
    // WALL, WITH DOORS PAINTED ON IT. Not a door (nothing opens, nothing walks
    // through) and not a sash (no glass, no hole) — which is why it is neither
    // of those rows with a flag on it. It is the one piece in the table whose
    // whole content is a MARKING: the barn's big sliding doors, boarded shut and
    // battened with an X, as a face on a wall you cannot use.
    //
    // Decoration is a real category here and this is the first of it. The
    // argument for allowing it at all is the same one the finishes make — a look
    // is free, and a building's face is the part you actually live with.
    //
    // Three: over a wall, under a door. More than wall because it is boards
    // nailed on and paint, less than a door because nothing about it opens, and
    // charging a door's price for something that does not let you through would
    // be the table telling a lie about what you just bought.
    cost: 3,
    // A wall in every structural respect, and that is the point of the row.
    solid: true,
    encloses: true,
    // THE WALL'S OWN MATERIAL, unlike every other opening in this table. A sash
    // and a door are made objects SET INTO somebody else's wall, so they carry
    // their own timber and let the masonry stop at the frame; this is the wall,
    // painted. Give it its own finish and a run of barn doors would be a stripe
    // of pine across an ox-blood barn.
    finishes: ["wood", "stone"],
  },
  skylight: {
    id: "skylight",
    name: "Skylight",
    // THE ONE STRUCTURE THAT IS NOT IN A WALL, and the reason it is a structure
    // at all rather than a derived roof feature like the chimney.
    //
    // DESIGN's rule is that roofs are DERIVED AND NEVER PLACED, and it means it:
    // you close a shape and the roof arrives, you never buy one. A skylight does
    // not break that rule, it threads it — you still do not build the roof, you
    // cut a hole in the one that turned up. So it is placed on an INTERIOR cell,
    // the floor you are standing on when you look up, and it draws a storey
    // above that cell in the roof pass. Knock a wall through and the roof goes;
    // the skylight stays in the build layer, unbuilt-over and undrawn, and comes
    // back the moment the room closes again. That is the same relationship the
    // roof itself has with the walls.
    //
    // A window's price, because it is a window. It is only the sky it faces that
    // makes it a different object.
    cost: 4,
    // NOT SOLID and it DOES NOT ENCLOSE, and both are the same fact stated to
    // two different systems. It is over your head: you walk under it, and the
    // room fill has to flood straight through the cell it occupies or a skylight
    // would cut its own room in half and un-roof the house it is set into.
    solid: false,
    encloses: false,
    // Joinery, like a door and like a sash. The frame is timber and the hole is
    // in somebody else's roof.
    finishes: [],
    mount: "roof",
  },
  fence: {
    id: "fence",
    name: "Fence",
    // A UNIT, and it is the cheapest thing that stands up in the game. A fence is
    // rails between posts and a wall is a wall; charging the same for both would
    // say they are the same amount of object, and the first thing anybody wants a
    // fence for is to run forty tiles of it round a field.
    cost: 1,
    // Solid, because a fence you can walk through is a decoration. This is the
    // whole of what a fence does.
    solid: true,
    // AND IT DOES NOT ENCLOSE, which is the entire reason it is its own row and
    // not a short wall.
    //
    // `encloses` is what the flood fill reads to decide a shape is a ROOM, and a
    // room grows a roof. Fence a paddock with anything that encloses and the game
    // roofs the paddock — you would put up four sides of railing and the sky
    // would close over your field. That is not a bug you tune afterwards; it is
    // the difference between the two objects, stated where the fill can read it.
    //
    // It is also why a fence needs no door row of its own. A gate is a GAP: leave
    // a cell out and you can walk through it, and since nothing here is sealing
    // anything, a gap costs nothing and seals nothing.
    encloses: false,
    // Both, so a paddock can be paling or drystone. Two options is exactly the
    // number that opens the swatch level (ROADMAP §a swatch for every surface),
    // which is the right outcome: post-and-rail and a drystone wall are two
    // different fences, not one fence in two colours.
    finishes: ["wood", "stone"],
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
  return id === "wall" || id === "door" || id === "barn_doors" || isWindow(id);
}

/** Does this join a FENCE run? Fences only, and the exclusion is the point: a
 *  fence that ran into a house and merged with its wall would put a rail through
 *  the masonry and a post in the doorway. They are different objects and they
 *  meet rather than join — which is also what a real fence does when it reaches
 *  a building. */
export function joinsFenceRun(id: StructureId): boolean {
  return id === "fence";
}
