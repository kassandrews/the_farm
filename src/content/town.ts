// The buildings the town already has when you arrive.
//
// DESIGN §"Town and homestead" says the town pre-exists — plaza, institutions,
// fixed cast, a few starting residents. Until now that was a stone rectangle
// with two people standing on bare coordinates. These are the actual buildings.
//
// They are ORDINARY BUILD CELLS, stamped into world.build at world creation and
// never regenerated (ROADMAP §Housing). The plaza is generated terrain because
// terrain is a total function of (x,y); a building can't be, because you are
// allowed to knock it down. Making the town's own houses the same kind of thing
// as yours means demolish, extend, refinish, and re-roof all work on them for
// free, with no second notion of "a building" anywhere in the codebase.
//
// Nothing here is protected. You can take the town hall apart around the Office
// Creature, and he will have something to say about it.
//
// Coordinates are absolute world tiles, laid out against the anchors in
// sim/world.ts (PLAZA spans x -5..5, y -5..3).

import type { SkinId } from "./skins";
import type { FurnitureId, Facing } from "./furniture";
import type { CounterId } from "./counters";
import type { CharId } from "./cast";
import { CAST } from "./cast";
import type { WingId } from "./museum";
import { STAGE } from "./festivals";

export type TownBuildingId = "townhall" | "margfrom_house" | "shop" | "heap" | "museum" | "seedstall";

// --- The street plan -----------------------------------------------------------
//
// THE TOWN IS TWO LINES AND EVERY DOOR SITS ON ONE OF THEM, and that follows from
// a constraint the renderer will not lift: a door has to be on a SOUTH wall or it
// has no face to be drawn on (see margfrom_house). So every building in this town
// is entered from below, which means a coherent townscape here is not a ring
// around the square — it is ROWS OF FRONTS, with the streets running east-west
// along them. Lay them any other way and you get what the first town was: six
// rectangles at arbitrary distances with grass between them and every door opening
// onto nothing.
//
// The two lines:
//
//   FRONT_N (y = -5) — the institutions' wall line. Museum, town hall and the
//     heap all put their south wall on it, so their fronts read as one street
//     face, and their doorsteps land on the street below at y -4.
//   FRONT_S (y =  2) — the flank line. Prudence's house and the shop put their
//     south wall on it, level with the plaza's own bottom row, so the two of them
//     frame the square's south corners; doorsteps land at y 3.
//
// EVERY STREET IS TWO ROWS DEEP, and that is the correction the first draft
// needed rather than a preference. At one row the north street was a single tile
// pinched between the museum's south wall and the back of Prudence's house — a
// crack with a doorstep in it, not a street, and on screen you could not see that
// the museum had a front at all. Two rows is the narrowest thing that reads as
// somewhere you walk rather than as a gap somebody left.
//
// The middle of both streets is ALREADY PAVED where the plaza reaches them — the
// square spans y -5..2, so it is the wide part of the north street. STREETS below
// is the rest: the arms that carry each one out past the plaza's edge, and the
// lane south.
export const FRONT_N = -5;
export const FRONT_S = 2;

/** Ground the town paved, as absolute inclusive rectangles.
 *
 *  ORDINARY FLOOR CELLS, stamped exactly like the buildings are (sim/town.ts), for
 *  the identical reason the header gives for the buildings: a path the player can
 *  take up, repave and extend is the same object as a path the town laid, and the
 *  alternative is a second notion of "paving" that only the generator can write.
 *  You can quarry the high street. Nobody will stop you.
 *
 *  NOT generated terrain, which the plaza IS. Terrain is a total function of (x,y)
 *  and these are not: a lane runs where the buildings are, and the buildings can
 *  come down. */
export const STREETS: { x0: number; y0: number; x1: number; y1: number }[] = [
  // The north street's two arms, either side of the square, under the museum's
  // and the heap's fronts. The plaza is the stretch between them.
  { x0: -13, y0: -4, x1: -6, y1: -3 },
  { x0: 6, y0: -4, x1: 11, y1: -3 },
  // The south street, and it runs UNBROKEN across the whole town rather than in
  // two arms. The plaza stops at y 2, so nothing here is already paved and there
  // is no gap to leave: one continuous frontage under the square's south side is
  // what makes the town read as a street with a square on it rather than as a
  // square with two spurs off it.
  { x0: -13, y0: 3, x1: 12, y1: 4 },
  // THE LANE — three wide, running south out of the south street toward the farm.
  // The one north-south run in the town, and wider than the streets on purpose:
  // it is the road out, it is the last thing the square opens onto, and at one
  // tile it read as a garden path.
  { x0: -1, y0: 5, x1: 1, y1: 12 },
  // The spur west off the lane's foot to the seed stall's door — the last front
  // you pass on the way to your own ground, which is what the stall is for.
  { x0: -6, y0: 12, x1: 0, y1: 12 },
];

/** A piece of furniture that comes with the building, at an absolute anchor. */
export interface TownFurniture {
  x: number;
  y: number;
  id: FurnitureId;
  facing: Facing;
  /** This table is a COUNTER: something you walk up to and touch, separately
   *  from talking to whoever keeps it (content/counters.ts).
   *
   *  ONE FIELD ANSWERS BOTH QUESTIONS — whether the piece is touchable, and
   *  which mark it wears on top — so the affordance and the interaction cannot
   *  drift apart. A counter that stopped being tappable would lose its bell in
   *  the same edit. Same argument as `given` sitting next to `hint` in
   *  content/skins.ts, and for the same reason: the two facts are one fact.
   *
   *  Absent means ordinary furniture, which is the honest default — Margfrom
   *  has a table and it is a table. */
  counter?: CounterId;
}

export interface TownBuilding {
  id: TownBuildingId;
  name: string;
  /** Inclusive OUTER bounds — the wall ring itself, not the interior. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** The one doorway, which must sit ON the wall ring. Buildings ship with
   *  exactly one: a resident who can't find the door is a bug you only notice
   *  at 3am game-time, and one door makes "did they use it" observable. */
  door: { x: number; y: number };
  /** Finish for the building's JOINERY — the door leaf and the furniture — and
   *  for the walls too unless `walls` overrides them. Per-cell since v5, so the
   *  town's buildings can differ from each other and from yours. */
  finish: SkinId;
  /** A masonry shell, when the walls are made of something the door and the
   *  chairs are not.
   *
   *  Needed the moment any building wanted stone, because `finish` reaches three
   *  different things and only one of them can be stone: a door leaf is wood
   *  (`STRUCTURES.door.finishes`) and so is a chair. A single field would have
   *  stamped a granite door and a granite table, which is not a strictness the
   *  type system catches — it is a table row that quietly renders nonsense.
   *
   *  This is the same split the player already lives with. A stone house built
   *  by hand takes a wood door because the door tool only offers wood, and the
   *  door's SHELL picks the wall's material up from its neighbour at draw time
   *  (`shellFinish`). The town table now says the same thing out loud. */
  walls?: SkinId;
  /** Cells on the wall ring that are WINDOWS rather than wall.
   *
   *  Adjacent entries merge into one window when drawn — sill, head and glass
   *  run straight through, with a mullion at each cell boundary — so a run here
   *  is a big window and not a row of little ones. That is the whole difference
   *  between a gallery and a barracks, and it is the per-cell edges rule
   *  (CLAUDE.md) wearing its fifth disguise.
   *
   *  Put them on a SOUTH wall, like doors, and for the same reason: a run
   *  travelling north–south is seen edge-on and has no face to cut an opening
   *  into. A window on a side wall renders as a thin bright band, which is the
   *  honest amount of nothing there is to show. */
  windows?: { x: number; y: number }[];
  /** Who the town housed here when you arrived, if anyone. This is the ONLY
   *  authored link between a person and a place, and it is a starting
   *  condition, not a fact: the villager claims this building's bed once, at
   *  world creation, and from then on the claim lives on the villager and
   *  follows the bed wherever you move it (sim/housing.ts). Demolish the bed
   *  and they are homeless — this table does not drag them back. */
  resident?: CharId;
  furniture: TownFurniture[];
  /** Where donated exhibits stand, in fill order per wing. Only the museum has
   *  any, which is why it's optional rather than a required empty array on four
   *  other buildings.
   *
   *  These are AUTHORED POSITIONS, not objects: no plinth exists in the world
   *  until an exhibit stands on it (sim/museum.ts). Stamping empty plinths at
   *  world creation would put a grid of blank pedestals in the room, which is
   *  the completion meter DESIGN spent a whole bullet forbidding — you would
   *  be able to count what you were missing by looking at the floor.
   *
   *  Cells in the same ROW render as one continuous case (see the renderer):
   *  consecutive entries should therefore be horizontal neighbours, and two
   *  runs must never be on adjacent rows. A case is a surface, and surfaces on
   *  adjacent rows pair their light and dark edges into stripes — the per-cell
   *  edges band rule, which this is the fourth candidate for. */
  plinths?: { wing: WingId; x: number; y: number }[];
}

export const TOWN_BUILDINGS: Record<TownBuildingId, TownBuilding> = {
  // The town hall, wrapped around the Tired Office Creature, who has been
  // standing at bare coordinate (0,-6) since the vertical slice. Its door opens
  // south onto the plaza, so the first thing you can walk into is the place that
  // stamped your land claim.
  townhall: {
    id: "townhall",
    name: "Town Hall",
    x0: -3,
    y0: -9,
    x1: 3,
    y1: -5,
    door: { x: 0, y: -5 },
    finish: "ash",
    furniture: [
      // The desk he is permanently "at the desk" at, immediately behind him.
      { x: -1, y: -7, id: "table", facing: "s", counter: "hall" },
      { x: 1, y: -7, id: "chair", facing: "s" },
      // Paperwork, filed along the back wall in whatever order it arrived.
      { x: -2, y: -8, id: "shelf", facing: "s" },
      { x: 2, y: -8, id: "shelf", facing: "s" },
    ],
  },

  // Margfrom's house, west of the plaza. She is the starter resident and has
  // been sleeping on open paving at (-4,-2) — inside the plaza rectangle, which
  // nobody noticed because there was nothing to notice it against.
  margfrom_house: {
    // THE ID STAYS `margfrom_house` though she is Prudence now. It is a key in
    // every live save's `build` map and in the v6 → v7 stamp, so renaming it
    // would be a migration bought entirely with her old name — and the id is
    // not a name, it is an address. The DISPLAY name is hers.
    id: "margfrom_house",
    // Follows her, rather than repeating her. She has been renamed once and the
    // house did not notice, which is exactly how a building ends up labelled
    // after somebody who no longer lives there.
    name: `${CAST.resident1.name}'s House`,
    // ON THE SOUTH STREET LINE, west of the square, one row south of where it
    // stood (§FRONT_S). Its front used to be on y = 0 with its doorstep on a row
    // of grass that led nowhere.
    //
    // IT MOVED SOUTH AND NOT WEST, and the one column matters. `TOWN_RECTS` caps
    // the water within six tiles of any town wall so a channel cannot lap a
    // bedroom, and the riverside anchor is a few tiles off her western one — a
    // house one column further west pinches the town's own promised river, which
    // is the failure the cap's own note warns about.
    // SIX BY FIVE, one wider than it was, and the extra column is load-bearing
    // rather than generous. At five the interior is 3x3 with a piece in every
    // corner, and two separate facts about this game stop being demonstrable in
    // the only authored house there is: that home FOLLOWS THE BED (sim/housing.ts)
    // needs somewhere else in the room to put one, and that a lamp is delight and
    // never a gate needs a free cell beside a bed to stand it in. Both were
    // asserted against a room that had run out of floor.
    x0: -11,
    y0: -2,
    x1: -6,
    y1: FRONT_S,
    // SOUTH wall, and that is not a free choice. A wall running away from the
    // camera shows its top rather than its face (DESIGN §Structures), so a door
    // cut into an east or west wall has no face to appear on and is invisible
    // from outside — you can walk through it, but you cannot see that you can.
    // Doors belong on south walls until the renderer can draw them otherwise.
    // East end of the south wall, so the table along the west can never reach
    // across the doorstep.
    door: { x: -7, y: FRONT_S },
    finish: "pine",
    resident: "resident1",
    furniture: [
      // A 1x2 bed along the west wall. Its anchor is what her home resolves to,
      // and the cell beside it is where she actually stands to sleep — derived
      // (sim/housing.ts picks a walkable neighbour), not authored. Wall the bed
      // in differently and her side of it moves; the coordinate here is where
      // the bed starts, not where she stands.
      { x: -10, y: -1, id: "bed", facing: "s" },
      // The table is along the south-west, deliberately clear of the doorway:
      // solid furniture in front of the door would seal her out of her own
      // house, and she'd snap home every night instead of walking in.
      { x: -10, y: 1, id: "table", facing: "s" },
      { x: -9, y: 0, id: "chair", facing: "s" },
      // North wall, at the far end from the bed — see the note on the footprint
      // for why the cells between them are deliberately left empty.
      { x: -8, y: -1, id: "shelf", facing: "s" },
    ],
  },

  // The Menace's shop, east of the plaza and facing it, so the two things the
  // town does TO you — stamping your paperwork and judging your purchases —
  // sit on opposite sides of the same square.
  shop: {
    id: "shop",
    name: "The Counter",
    // ON THE SOUTH STREET LINE (§FRONT_S), facing the same way as Prudence's
    // house across the square — the two flanks of the plaza are one line, and
    // the shop moved one row south to join it.
    x0: 7,
    y0: -2,
    x1: 12,
    y1: FRONT_S,
    // The door is at the EAST end rather than the middle, because the counter
    // runs along the west half and a table is solid. Two tables spanning the
    // whole row sealed the shop — caught by town.test.ts's "never lets its own
    // furniture seal the front door", which is exactly the bug it was written
    // for and exactly the one a layout written by eye produces.
    door: { x: 11, y: FRONT_S },
    finish: "whitewash",
    furniture: [
      // The counter: one 2x1 table across the west half, with her BESIDE its
      // east end at (10,-2) — not behind it, which is where she used to stand
      // and where the table's own height hid her (content/cast.ts). You come in
      // past the end of it, which is how a shop works.
      { x: 8, y: 1, id: "table", facing: "s", counter: "shop" },
      // Stock, along the back wall. Shelves rather than anything soft: the
      // soft goods are the point of the visit and she is not going to leave
      // them lying about where you could just take one.
      { x: 8, y: -1, id: "shelf", facing: "s" },
      { x: 11, y: -1, id: "shelf", facing: "s" },
    ],
  },

  // The heap, north-east of the plaza — diagonally opposite Margfrom and well
  // clear of both the town hall (y -9..-5, x -3..3) and the shop (x 7..12,
  // y -4..0). It is a shed with a pile in it. He calls it a facility, and the
  // building being an ordinary four-wall box with a door is exactly the joke:
  // there is nothing facility about it.
  heap: {
    id: "heap",
    name: "The Facility",
    // ON THE NORTH STREET LINE (§FRONT_N), one row south of where it stood, so
    // its front joins the town hall's and the museum's instead of floating a row
    // above them with grass in between.
    x0: 6,
    y0: -10,
    x1: 10,
    y1: FRONT_N,
    // South wall, like every door in the town — a wall running away from the
    // camera has no face to draw a doorway on (see margfrom_house).
    door: { x: 8, y: FRONT_N },
    finish: "ash",
    furniture: [
      // Shelves he refers to as "the system". He stands beside the counter, at
      // (9,-8).
      { x: 7, y: -9, id: "shelf", facing: "s" },
      { x: 9, y: -9, id: "shelf", facing: "s" },
      // The counter, one row inside the door.
      //
      // IT WAS AT (6,-7), WHICH IS THE WEST WALL. `x0` is 6, so the wall ring
      // runs down that column, and the table's left half was standing in it —
      // half the counter drew outside the building, and the only walkable tile
      // adjacent to its anchor was out on the grass. You could not stand next to
      // your own shop's counter from inside your own shop. It went unnoticed
      // because nothing asked to reach it until counters became things you walk
      // up to (content/counters.ts); `town.test.ts` guards doorways, not walls.
      //
      // Two rows in rather than one, so the doorstep at (8,-6) stays clear —
      // solid furniture in front of a door seals the building, which is the bug
      // "never lets its own furniture seal the front door" was written for when
      // the shop's counter did exactly that.
      { x: 7, y: -7, id: "table", facing: "s", counter: "heap" },
    ],
  },

  // The museum, north-west of the plaza. The largest building in town, and a
  // GALLERY rather than a hall: it runs north away from its door, because the
  // three things boxing it in are all on other axes.
  //
  // It cannot grow WEST. `generatedTile` puts the riverside spot's river at
  // x <= -12, and while `stampBuilding` plancks its own floor and would happily
  // stand a museum in the water, a museum in the water is still a museum in the
  // water. x0 of -13 keeps that to the two columns the shipped version already
  // had. It cannot grow EAST past the town hall (x -3..3), so x1 of -6 leaves
  // two clear cells between them — the alley, and the only gap in the north
  // street's face. And it cannot grow SOUTH past the street line it now fronts.
  //
  // North is unclaimed, so north is where the room went. A 6-wide interior
  // holds a case of six, which is what set the width: the antiquities wing is
  // twelve exhibits and fits in exactly two runs.
  museum: {
    id: "museum",
    name: "The Museum",
    // ON THE NORTH STREET LINE (§FRONT_N), brought two rows south. It used to
    // stand off on its own with two rows of grass between its door and anything,
    // which for the largest building in town was the most visible version of the
    // problem the street plan exists to fix.
    x0: -13,
    y0: -14,
    x1: -6,
    y1: FRONT_N,
    // South wall, like every door in the town — a wall running away from the
    // camera has no face to draw a doorway on (see margfrom_house).
    door: { x: -10, y: FRONT_N },
    finish: "whitewash",
    // THE ONLY MASONRY BUILDING IN TOWN, and that is the whole of its identity.
    //
    // It was the largest footprint and a wall colour shared with the shop, which
    // from outside makes it a pale rectangle of vertical planks with one south
    // door — the same object as the heap. Size alone does not read as purpose at
    // this scale; the title screen's own note says so (`content/props.ts`: the
    // roof is what tells two buildings apart long before their doors do), and
    // now that a roof takes the material of the walls holding it up, one field
    // changes the walls, the courses and the roof together.
    //
    // MARBLE, and it was cobble for about an hour. Cobble was right that the
    // museum should be the stone one and wrong about which stone: the biggest
    // building in town, in the darkest grey available, under a roof that takes
    // its material from the walls, came out a windowless slab. It read as a
    // jail. Being distinctive is not the same as being welcoming, and a museum
    // has to be both.
    //
    // Not granite either, which is the obvious grand choice and is byte for byte
    // the plaza's own `#b8b2a6` — a museum that matched the paving in front of
    // it would have been a worse problem than the one being fixed.
    //
    // Deliberately NOT given to the town hall as well. Two civic buildings in
    // the same stone is a category, not an identity, and the museum stops being
    // the one that looks built to last the moment something else looks like it.
    walls: "marble",
    // Two big windows on the façade, flanking the door. The south wall runs
    // x -13..-6 with the door at -10 and the corners at either end, so this is
    // -12/-11 on one side and -9/-8 on the other: each pair merges into one
    // two-cell window, and -13, -7 and -6 stay solid. On the street line now, so
    // the glass is the one thing on the north street that is not a plank wall.
    //
    // THE CORNERS ARE LEFT ALONE ON PURPOSE. Glazing right up to the edge of a
    // building reads as a shed with the walls missing; a corner of plain masonry
    // is what says the thing is holding itself up. Same instinct as leaving the
    // sill in: the openings have to be set INTO something.
    windows: [
      { x: -12, y: FRONT_N },
      { x: -11, y: FRONT_N },
      { x: -9, y: FRONT_N },
      { x: -8, y: FRONT_N },
    ],
    furniture: [
      // Corrigal's desk, in the lobby by the door rather than at the far end.
      // Donating is the one act the museum asks of you and walking the length
      // of the gallery to do it would be a waiting period wearing a hat — the
      // same objection DESIGN raised to identification taking time. She stands
      // at (-9,-7), off its west end — beside it rather than behind it, which
      // the old coordinate claimed and did not do. Clear of the doorstep.
      { x: -8, y: -6, id: "table", facing: "s", counter: "museum" },
      // Reference along the north wall, behind the last case. She has read all
      // of it and drawn her own conclusions.
      { x: -12, y: -13, id: "shelf", facing: "s" },
      { x: -8, y: -13, id: "shelf", facing: "s" },
    ],
    // Cases on alternating rows, with a walkway between each — you move up the
    // gallery and the exhibits are on your left and right. Fill order within a
    // wing is array order.
    //
    // Rows -6, -8, -10, -12 and never two together: see the note on the field.
    // None of the spare length is visible — a case is only as long as the
    // exhibits standing on it.
    //
    // THE GALLERY IS FULL, and the seed stall is what found that out. It was
    // sized to the table exactly (six cells for five nature rows, twelve for
    // twelve antiquities), so adding two crops to the world overflowed a room
    // that cannot grow: the river is at x <= -12, the town hall is east, and
    // Margfrom and the plaza are south. Rather than reshape a building people
    // have already walked into and put things in — which the v13 note asks the
    // next person NOT to read as a precedent — the nature wing spilled into a
    // fourth short case by the entrance. Which is what happens to small
    // museums.
    //
    // The door column (x -10) stays empty on that row. A case is not solid, so
    // nothing would stop you, and that is exactly the problem: you would walk
    // through the display case in the doorway.
    plinths: [
      // Nature, deepest in.
      { wing: "nature", x: -12, y: -12 },
      { wing: "nature", x: -11, y: -12 },
      { wing: "nature", x: -10, y: -12 },
      { wing: "nature", x: -9, y: -12 },
      { wing: "nature", x: -8, y: -12 },
      { wing: "nature", x: -7, y: -12 },
      // …and the overflow, west of the doorway. Two cells, which is one more
      // than the crop table currently needs; a third crop will want the room
      // reshaped rather than another corner found for it.
      { wing: "nature", x: -12, y: -6 },
      { wing: "nature", x: -11, y: -6 },
      // Antiquities, the two runs nearest the door — they are what fills up.
      { wing: "antiquities", x: -12, y: -8 },
      { wing: "antiquities", x: -11, y: -8 },
      { wing: "antiquities", x: -10, y: -8 },
      { wing: "antiquities", x: -9, y: -8 },
      { wing: "antiquities", x: -8, y: -8 },
      { wing: "antiquities", x: -7, y: -8 },
      { wing: "antiquities", x: -12, y: -10 },
      { wing: "antiquities", x: -11, y: -10 },
      { wing: "antiquities", x: -10, y: -10 },
      { wing: "antiquities", x: -9, y: -10 },
      { wing: "antiquities", x: -8, y: -10 },
      { wing: "antiquities", x: -7, y: -10 },
    ],
  },

  // The seed stall, south-west of the plaza — the one institution that sits
  // between the town and the ground you dig, because that is what it is for.
  // Everywhere else was taken: the shop and the heap are east, the museum and
  // Margfrom west and north, and the plaza is the plaza. South is also the way
  // you walk from the square toward open land, which is the right direction to
  // pass a seed stall in.
  //
  // It is called a stall and it is a small building, which is the same
  // compromise the heap made about being a facility. A genuinely open-fronted
  // stall would be a room the flood-fill never closes, and every rule about
  // roofs, doorsteps and cutaways would need an exception for one structure.
  // He has a door like everybody else and does not appear to have noticed.
  seedstall: {
    id: "seedstall",
    name: "The Seed Stall",
    x0: -9,
    y0: 6,
    x1: -4,
    y1: 11,
    // South wall, like every door in the town — see margfrom_house.
    door: { x: -6, y: 11 },
    // Pine, unfinished. He has not decorated. It has not come up.
    finish: "pine",
    furniture: [
      // The counter, along the front wall but OFF the doorway, with him behind
      // it at (-7,7). Same arrangement as the Menace's: you do not walk the
      // room to buy a thing. It started centred on the door, which walled the
      // building shut — a table is solid, and town.test.ts caught it before a
      // browser had to.
      { x: -8, y: 10, id: "table", facing: "s", counter: "seedstall" },
      // Stock along the back wall, in no order anybody has explained.
      { x: -8, y: 7, id: "shelf", facing: "s" },
      { x: -5, y: 7, id: "shelf", facing: "s" },
    ],
  },
};

// --- Fixtures: town furniture with no building around it ------------------------

/** Something the town stood in the open, on ground it did not lay.
 *
 *  Separate from TOWN_BUILDINGS because a building OWNS ITS GROUND — `stampBuilding`
 *  writes FLOOR under its whole footprint first, so nothing lands in the river or
 *  inside a generated tree. That is exactly wrong for a lone object on the plaza:
 *  the paving is already there and already walkable, and a one-cell plank patch
 *  under the board would be a scar in the middle of the square.
 *
 *  So a fixture places the piece and nothing else. It is the same distinction
 *  `clearApron` already makes for doorsteps — pave only where paving is the fix. */
export interface TownFixture extends TownFurniture {
  id: FurnitureId;
  finish: SkinId;
}

/** The errands board, in the plaza's south-east corner.
 *
 *  SOUTH-EAST because it is the only quadrant left: the town hall is north, the
 *  museum and Margfrom west, the shop and heap east, the seed stall south-west.
 *  It is also the corner you cross going from the square toward your own land,
 *  which is the right direction to pass a notice board in.
 *
 *  IN THE OPEN, not in a sixth building. Everything else in town is a counter
 *  you go inside to reach; a board is a thing you walk past and glance at, and
 *  putting walls around it would have made the notices a place you visit rather
 *  than something the town has up. It also keeps the Dog's round honest — he can
 *  leave, because the board does not need him to be readable.
 *
 *  One cell, well clear of the plaza's edges and of every doorway. It is solid,
 *  so it must never sit on the only approach to a door; the plaza is eleven by
 *  nine and this is one cell of it, which town.test.ts asserts rather than
 *  assumes. */
export const TOWN_FIXTURES: TownFixture[] = [
  // Weathered, because it has been up a while and nobody has offered to redo it.
  { x: 4, y: 2, id: "noticeboard", facing: "s", finish: "pine" },
  // The plaza stage, in the south-west of the square, facing the open paving so
  // there is room for the town to stand in front of it (the audience cells are
  // in content/festivals.ts, immediately south of here).
  //
  // A FIXTURE AND NOT A SIXTH BUILDING, for the same reason the board is one,
  // and one more: `stampBuilding` lays plank under its whole footprint so that
  // nothing lands in the river, which is exactly wrong for a platform standing
  // on stone — it would arrive with a wooden scar around it. A stage is a thing
  // in the square, not a room you go into.
  //
  // PINE, and it had to be. Ash was the first choice — the one piece of town
  // furniture anybody has ever bothered to keep up — and on screen a pale
  // 2x2 slab with board lines on it read as a sheet of paper lying in the
  // square, which is not the joke. A stage is made of ordinary boards.
  { x: STAGE.x, y: STAGE.y, id: "stage", facing: "s", finish: "pine", counter: "stage" },
  // A bench, mid-east plaza, facing the square. It exists so that sitting
  // down together (sim/play.ts `sittingAt`) is reachable before the player
  // has built a seat of their own — the town owns one bench the way it owns
  // one board. East-centre because everything else took a quadrant: board
  // south-east, stage and its audience rows south-west, hall doors north.
  // Walk-through like every seat (the chair rule), so it can never seal an
  // approach; pine like the stage, because the town has never refinished
  // anything it owns.
  { x: 2, y: -1, id: "bench", facing: "s", finish: "pine" },
];

// --- The clearing --------------------------------------------------------------

/** How far past its own walls and paving the town keeps the wood back.
 *
 *  TWO, and the number is doing a specific job: at one, the two-cell alleys
 *  between the buildings on the north street stay wooded, so the street face
 *  comes out with a tree wedged in each gap. At two, the alleys clear and the
 *  outline still hugs the buildings rather than becoming a rectangle drawn
 *  around them. */
const CLEARING_MARGIN = 2;

/** The rectangles the town has actually cleared, in world tiles: every building
 *  footprint and every street, each grown by CLEARING_MARGIN.
 *
 *  PER FEATURE, NEVER ONE BOUNDING BOX. A single box round the whole town is a
 *  30-by-40 bald rectangle with a wood outside it, and at this scale you can walk
 *  its edge and see the corner — the same objection `clearingRadius` raises to
 *  perfect circles, and `biomeWarp` one level up. Clearing per feature makes the
 *  outline the town's own shape: it steps in behind the buildings, runs out along
 *  the lane and pinches where nothing was built.
 *
 *  The plaza is deliberately NOT in here. It is generated stone and nothing grows
 *  on it anyway, and adding it would square off the very middle of the outline. */
const CLEARED: { x0: number; y0: number; x1: number; y1: number }[] = [
  ...Object.values(TOWN_BUILDINGS).map((b) => ({
    x0: b.x0 - CLEARING_MARGIN,
    y0: b.y0 - CLEARING_MARGIN,
    x1: b.x1 + CLEARING_MARGIN,
    y1: b.y1 + CLEARING_MARGIN,
  })),
  ...STREETS.map((r) => ({
    x0: r.x0 - CLEARING_MARGIN,
    y0: r.y0 - CLEARING_MARGIN,
    x1: r.x1 + CLEARING_MARGIN,
    y1: r.y1 + CLEARING_MARGIN,
  })),
];

/** The cheap rejection: nothing outside this box can be cleared ground. The
 *  generator asks `inTownClearing` for every tile in the world, so the common
 *  answer has to cost two comparisons. */
const CLEARED_BOUNDS = CLEARED.reduce(
  (b, r) => ({
    x0: Math.min(b.x0, r.x0),
    y0: Math.min(b.y0, r.y0),
    x1: Math.max(b.x1, r.x1),
    y1: Math.max(b.y1, r.y1),
  }),
  { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
);

/** Is this tile on ground the town has cleared? Nothing generated GROWS here —
 *  no tree, no shrub, no stump, no rock.
 *
 *  It exists because the first town did not have it, and the result was a forest
 *  standing in the square: trees against the walls, trees in the gaps between the
 *  fronts, a tree on the plaza's own edge. It read as six buildings dropped into a
 *  wood, which is the opposite of what a town is — a town is a piece of wood
 *  somebody cleared. */
export function inTownClearing(x: number, y: number): boolean {
  if (x < CLEARED_BOUNDS.x0 || x > CLEARED_BOUNDS.x1) return false;
  if (y < CLEARED_BOUNDS.y0 || y > CLEARED_BOUNDS.y1) return false;
  return CLEARED.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
}

export function townBuilding(id: TownBuildingId): TownBuilding {
  return TOWN_BUILDINGS[id];
}

export function allTownBuildings(): TownBuilding[] {
  return Object.values(TOWN_BUILDINGS);
}

/** Every cell the building occupies — the wall ring and everything inside it. */
export function footprintCells(b: TownBuilding): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) cells.push({ x, y });
  }
  return cells;
}

/** The anchor of the bed the town authored for this character, if it authored
 *  one. Pure lookup over the table — it says where the bed STARTED, never where
 *  it is now; only the world knows that (see sim/housing.ts, which checks a bed
 *  is really there before letting anyone claim it). */
export function authoredBed(id: CharId): { x: number; y: number } | null {
  for (const b of allTownBuildings()) {
    if (b.resident !== id) continue;
    const bed = b.furniture.find((f) => f.id === "bed");
    if (bed) return { x: bed.x, y: bed.y };
  }
  return null;
}

/** Is this cell part of the wall ring (as opposed to the interior)? */
export function isPerimeter(b: TownBuilding, x: number, y: number): boolean {
  return x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1;
}
