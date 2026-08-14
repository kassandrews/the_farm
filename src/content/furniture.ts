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
  /** The lamp for OUTSIDE — see the row for why the two split. */
  | "lamppost"
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
  | "doublebed"
  | "desklamp"
  // --- The kitchen and the bathroom -------------------------------------------
  // Two rooms the catalogue could not furnish at all. Audit the forms by room and
  // the bedroom, the living room and the study were covered while these had
  // NOTHING in them, which is DESIGN §The catalog's own complaint — reaching for
  // a piece and finding a hole where a room should be — in its purest form.
  //
  // DECORATION, AND THE DOOR LEFT OPEN. None of these carry a verb: there is no
  // cooking, no plumbing, no needs, and there are no meters in this game to hang
  // them on. Phase 5a rejected a stove as ore's sink because "it smuggles in
  // cooking, which is a system, not a row" — that argument is about a functional
  // appliance justified by a material, and it stands. If cooking ever arrives it
  // attaches to the range already standing in every kitchen.
  | "stove"
  | "fridge"
  | "sink"
  | "counter"
  | "toilet"
  | "tub"
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

  /** LIES ON THE FLOOR, and other furniture may stand on top of it.
   *
   *  A rug is not a thing in the room, it is the room's floor being nicer, and
   *  a rug you cannot put a table on is a rug you can only ever look at from
   *  across the room. So a floor piece is stored in its OWN record — see
   *  sim/furniture.ts §floorFor — and the two records do not see each other:
   *  laying a rug ignores what is standing there, standing something down
   *  ignores what is laid. Both orders work, which matters, because a player who
   *  had to furnish a room in the right sequence would be playing a puzzle.
   *
   *  NOT the same as `flat`, which is a fact about a piece's geometry (draw the
   *  face, skip the top). The noticeboard is flat and stands; a rug is neither.
   *
   *  It still holds the ground it covers — no crop through a rug, no rug over a
   *  crop — because a floor covering is still a covering. What it gives up is
   *  the right to refuse FURNITURE, and nothing else. */
  floor?: boolean;

  /** Which finish classes it may wear. A list to match structures.
   *
   *  It was single-class on every row for a long time, with a note here saying it
   *  probably always would be: a piece of furniture is a made object, and unlike
   *  a floor it is not a surface you could plausibly render in either timber or
   *  stone. THE SINK IS THE EXCEPTION and it is a real one rather than a lapse —
   *  a sink is honestly porcelain or stainless, both are what sinks are, and
   *  `availableSkinsForClasses` already spans classes without asking the player
   *  to pick a category first. The list was built for exactly this and waited
   *  twenty-odd rows to be used. */
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
  /** Somebody can live in a room that has one.
   *
   *  A FIELD rather than `id === "bed"`, which is what it was in SEVEN places
   *  across `assign`, `home` and `housing` until a second bed existed. That is
   *  the third time this table has learned the same lesson — `light` learned it
   *  one lamp too late and `hearth` one fireplace too late — so it is written
   *  down here rather than discovered again.
   *
   *  A QUALIFIER, NOT A CAPACITY. A double bed houses one villager exactly as a
   *  single does; DESIGN does not take marriage, and a bed that slept two would
   *  be a relationship system arriving through the furniture table. */
  sleeps?: boolean;

  /** A SECOND finish, for the piece's other material.
   *
   *  Which classes the trim may wear. Absent means the piece is one material and
   *  whatever accents it has stay literals — a dresser's brass handle, a lamp's
   *  brass head. This slot is for the substantial second material only: the
   *  upholstery on a frame, the bedding on a bed, the worktop on a cabinet.
   *
   *  MUST BE DISJOINT FROM `finishes`, and `furniture.test.ts` says so. The build
   *  bar shows ONE row of swatches and routes a tap by the class of the swatch
   *  tapped — a stone swatch dresses the worktop, a wood one dresses the cabinet —
   *  which is what lets a two-material piece avoid a second swatch row and the
   *  "which part did you mean" question DESIGN §Materials forbids. Overlap the
   *  lists and that tap becomes ambiguous.
   *
   *  It is a LOOK, so it is free (§Materials). The bed's blanket is choosable
   *  without the bed costing a bolt, which is what let the housing rule and a
   *  choosable blanket both be true. */
  trim?: SkinClass[];

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
    sleeps: true,
    name: "Single bed",
    // NO CLOTH, AND THAT IS A RULE RATHER THAN A PRICE. A bed is what `qualify()`
    // requires of a room, so anything a bed costs is a gate on housing somebody —
    // which is exactly what ROADMAP §Ore's sink forbids in the case it names:
    // "a wall or a bed that did would gate housing behind digging". Cloth is the
    // same shape of gate one material over, because it means a walk to a counter.
    //
    // The bedding is still choosable — see `trim`. A finish is free, so the
    // blanket can be yours without the bed costing a thing more.
    cost: { wood: 6 },
    w: 1,
    h: 2,
    solid: true,
    height: 10,
    finishes: ["wood"],
    trim: ["cloth"],
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
    cost: { cloth: 1 },
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
    cost: { cloth: 2 },
    w: 2,
    h: 2,
    solid: false,
    // Almost flat: a rug is a floor that is nicer, not a thing standing on one.
    height: 1,
    // And therefore THE floor piece — the sentence above, made a rule. Things
    // stand on it. See `floor` on the interface.
    floor: true,
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
    // METAL, and it always should have been. A lamp is a made thing with a post
    // and a fitting, and the three metals a room reads as — bright, warm, dark —
    // are exactly the three a lamp comes in. Wood was inherited from the days
    // when this drew a lantern on a timber post, and it survived the redraw by
    // nobody asking: the cloth shade is a literal (render/renderer.ts
    // §SHADE_CLOTH), so the finish was only ever colouring the post and the base,
    // and a pine post under a cream shade is not a lamp anybody sells.
    //
    // The stale-selection guard in `loadedFinish` covers a save that has pine
    // loaded for this tool — the class no longer matches, so it falls back to
    // the metal default rather than refusing. Placed lamps keep the finish they
    // were built in; they just cannot be built that way again.
    finishes: ["metal"],
    light: true,
  },
  // A LAMP FOR OUTSIDE, and it exists because the floor lamp stopped being one.
  //
  // The town has stood two lamps either side of each civic door since the square
  // was built (content/town.ts), and for as long as the floor lamp was drawn as a
  // brass lantern with a flame in it that was fine — it WAS a street lamp, and
  // the thing beside your sofa was the one telling the lie. Redrawing the floor
  // lamp as a floor lamp (a cloth shade on a post) made the four in the square
  // read as somebody's living room carried out into the street, which is how the
  // fork got found: one form was doing two jobs and only ever looked right doing
  // one of them at a time.
  //
  // So the lantern moved here rather than being deleted. Same light, same cost,
  // taller post, and the art is the art the lamp used to have.
  //
  // IRON, not wood. Nothing outdoors in this game is made of cloth or timber
  // where weather can get at it, and a black post is what the eye expects a
  // street light to be — which is also what stops it reading as a tree.
  lamppost: {
    id: "lamppost",
    form: true,
    name: "Lamp post",
    cost: { ore: 2 },
    w: 1,
    h: 1,
    solid: false,
    // TALLER THAN ANYTHING ELSE IN THE TABLE, and it has to be: at 20 it stood
    // shorter on screen than a CHAIR. Two things conspired. The number was
    // borrowed from the wardrobe's "tallest thing you can put in a room", which
    // is a rule about rooms and this is not in one — and a lamp is also LIFTED
    // half a tile north of its cell's near edge (render/renderer.ts §LAMP_LIFT),
    // so its foot starts eight pixels up the screen and eight pixels of apparent
    // height go with it. A chair's 31 pixels of drawing beat the post's 21.
    //
    // The occlusion fade was the reason to stay short and turns out not to apply:
    // `hideFactor` is called by trees, tents, poles and stairs, and never by the
    // furniture path. Nothing here can make the player see-through, so a lamp
    // post may be as tall as a lamp post.
    //
    // 28 AND NOT 34, which was the overcorrection. Clearing the wardrobe by a
    // couple of pixels reads as "tall"; clearing it by ten made the square
    // something you looked at around the lamps. The scale in this game is warped
    // and the test is not metres — it is whether the post out-tops the furniture
    // without becoming the tallest thing in town.
    height: 28,
    finishes: ["metal"],
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
    //
    // SIX, not ten, and the four came off the LEGS rather than the seat. At
    // eleven rows of leg against the chair's seven, a stool's seat stood four
    // pixels higher off the floor than a chair's — the opposite of what this
    // comment claims, in the one measurement anybody could take. The legs match
    // now (content/furnishings.ts §stool), so the seat height matches, and the
    // whole of the difference between the two pieces is the back.
    height: 6,
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
    cost: { wood: 4, cloth: 1 },
    w: 3,
    h: 1,
    solid: true,
    height: 16,
    // CLOTH, so the finish picker offers the upholstery. The frame and feet are
    // drawn in a literal timber and take no finish at all — the lamp's brass
    // argument (see skins/BRASS): a thing made of two materials wears the one
    // you would actually choose, and the other stays itself.
    finishes: ["cloth"],
    trim: ["wood"],
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
  // NOT A FORM, and that is the point of it. A cot is a FLAVOUR of bed rather
  // than something a room needs — a bed is that — so making every set that ever
  // ships owe a cot drawing would be an obligation nobody wants (a mid-century
  // cot is a silly thing to be required to draw). It is core's first EXTRA
  // instead, which is the slot DESIGN §The catalog keeps for exactly this and
  // which nothing had used yet. A cabin or camping set gets its own.
  //
  // Nothing changes mechanically: `sleeps` is what housing looks for, and a cot
  // never had it.
  cot: {
    id: "cot",
    name: "Cot",
    // Cheap, and cheap is the whole character of it: a bed costs 6 wood, this
    // costs 2 and 2. It is what you put in a room you have only just walled in.
    cost: { wood: 2, cloth: 1 },
    w: 1,
    h: 2,
    // NOT SOLID, unlike a bed. A cot is canvas slung on a frame at shin height,
    // and a spare one shoved against a wall should never be the reason somebody
    // cannot get to the door.
    solid: false,
    height: 6,
    finishes: ["cloth"],
    trim: ["wood"],
  },

  // --- Storage ---------------------------------------------------------------
  // TWICE THE BED AND NOT TWICE THE FORM. 2x2 against the single's 1x2, which is
  // a footprint and therefore a form of its own — forms own footprints, sets own
  // silhouettes, and "how much floor does this take" is the question a room's
  // plan is made of.
  //
  // Two pillows is the whole of what says "double" at this size. The frame, the
  // height and the blanket are the single's; widen it and put a second pillow in
  // and the eye needs nothing else.
  doublebed: {
    id: "doublebed",
    form: true,
    sleeps: true,
    name: "Double bed",
    // Half again the single's six rather than double it: the frame is wider, not
    // twice the object, and a bed is the one piece housing REQUIRES — pricing it
    // steeply is a tax on giving somebody a home.
    cost: { wood: 9 },
    w: 2,
    h: 2,
    solid: true,
    height: 10,
    finishes: ["wood"],
    trim: ["cloth"],
  },

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
    // METAL too, on the floor lamp's argument one object smaller. Leaving the
    // third light in timber while its two siblings are steel, brass and iron
    // would be the same lie in the palette that the lantern was in the drawing:
    // three lights that are obviously a set, one of them made of something else.
    finishes: ["metal"],
    light: true,
  },

  // --- The kitchen ------------------------------------------------------------
  // METAL, which is a finish class now (content/skins.ts §Metal) — so a fridge is
  // stainless or brass or black iron because you said so, rather than being a
  // white literal with a wooden handle, which was the alternative and was worse.
  //
  // PRICED IN STONE, not in ore. Ore is reserved for the lamp and the test says
  // so; a stove that cost it would gate a kitchen behind digging. Stone is the
  // heavy mineral thing you can actually go and get, and it is what these are.
  stove: {
    id: "stove",
    form: true,
    name: "Stove",
    cost: { stone: 4 },
    w: 1,
    h: 1,
    solid: true,
    height: 14,
    finishes: ["metal"],
    // NO `light`, and NOT an oversight. A lit stove would pool warm light for
    // four stone, which quietly undercuts the one object ore exists to buy
    // (ROADMAP §Ore's sink — "ore buys an object", and the object is a light).
    // NO `hearth` either, for a duller reason: the renderer keeps one chimney per
    // room, so a kitchen with a stove and a fireplace in it would have two
    // claims on it. Both are worth revisiting; neither is worth a silent bug.
  },
  fridge: {
    id: "fridge",
    form: true,
    name: "Fridge",
    cost: { stone: 5 },
    w: 1,
    h: 1,
    solid: true,
    // The second-tallest thing in a room after the wardrobe, and it should read
    // that way: a fridge you look over is a cupboard.
    height: 24,
    finishes: ["metal"],
  },
  sink: {
    id: "sink",
    form: true,
    name: "Sink",
    // STONE, because `finishes` is stone-only — the fireplace's cost-follows-
    // material rule, which holds everywhere except metal. `bone` and `marble`
    // were already in the stone table and are exactly what porcelain looks like.
    cost: { stone: 3 },
    w: 1,
    h: 1,
    solid: true,
    height: 12,
    // PORCELAIN OR STAINLESS, because a sink is honestly either one, and the
    // picker has always been able to span classes without asking the player to
    // choose a category first (skins.ts §availableSkinsForClasses). The one row
    // in the table that uses that on purpose rather than by inheritance.
    finishes: ["ceramic", "metal"],
  },

  // THE ONE THAT JOINS. Laid a cell at a time and adjacent counters draw as one
  // continuous run — the awning's rule brought indoors, and the answer to the
  // Minecraft complaint that furnishing a kitchen means slabs and signs.
  //
  // ITS WIDTH IS YOURS. Same argument the awning's row makes at length: a
  // fixed-width counter fits exactly one room, and there is no second number that
  // is right for both a galley and a back wall. So the run is as long as you laid
  // it, and `render/furnishings.ts §joins` is how the drawing keeps up.
  //
  // FACING-AGNOSTIC, like the rug: it joins EAST-WEST only, so all four facings
  // draw the same. That is a real limit rather than a subtlety — an L-shaped
  // kitchen's north-south leg does not yet join, and closing it means a second
  // pair of grids for the turned run. Recorded in ROADMAP rather than pretended
  // away.
  counter: {
    id: "counter",
    form: true,
    name: "Counter",
    cost: { wood: 2, stone: 1 },
    w: 1,
    h: 1,
    solid: true,
    // EXACTLY THE STOVE'S 14, so a worktop and a cooktop are one level. A run
    // that stepped up or down where the appliances stand would read as somebody
    // having fitted the kitchen badly, which is a detail nobody would praise and
    // everybody would see.
    height: 14,
    finishes: ["wood"],
    trim: ["stone", "metal"],
  },

  // --- The bathroom -----------------------------------------------------------
  // Porcelain, so stone, so the whole room finishes in bone or marble and stops
  // being a hole in the catalogue. No plumbing, no needs — see the union above.
  toilet: {
    id: "toilet",
    form: true,
    name: "Toilet",
    cost: { stone: 3 },
    w: 1,
    h: 1,
    solid: true,
    height: 14,
    finishes: ["ceramic"],
  },
  tub: {
    id: "tub",
    form: true,
    name: "Bath",
    cost: { stone: 5 },
    w: 2,
    h: 1,
    solid: true,
    // LOW, and lower than it looks like it should be. A bath is something you
    // look down into, so the silhouette wants to be mostly rim and inside —
    // at chest height it reads as a stone trough standing against a wall.
    height: 10,
    finishes: ["ceramic"],
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
