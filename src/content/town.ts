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
import type { StructureId } from "./structures";
import type { FurnitureId, Facing } from "./furniture";
import type { CounterId } from "./counters";
import type { CharId } from "./cast";
import { CAST } from "./cast";
import type { FloraId } from "./flora";
import type { WingId } from "./museum";
import { STAGE } from "./festivals";

export type TownBuildingId =
  | "townhall"
  | "margfrom_house"
  | "shop"
  | "heap"
  | "museum"
  | "barn";

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
//   FRONT_N (y = -6) — the institutions' wall line. Museum, town hall and the
//     heap all put their south wall on it, so their fronts read as one street
//     face; their doorsteps land on the row below, which is the plaza's own top
//     row in the middle and the north street's arms either side.
//
//     IT WAS -5, WHICH IS THE PLAZA'S TOP ROW, and the town hall therefore STOOD
//     ON THE SQUARE — its wall ring occupied a row of the paving, and the stamp
//     laid plank over it. Nothing else overlapped (the others are all outside the
//     plaza's x range), which is exactly why it went unnoticed: one building
//     quietly ate a slice of the town's one shared space. The whole line moved
//     back a row rather than the hall alone, because the street face is the point
//     — a hall set back on its own would have put a step in the row of fronts to
//     fix a problem about the square.
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
export const FRONT_N = -6;
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
  { x0: -13, y0: -5, x1: -6, y1: -4 },
  { x0: 6, y0: -5, x1: 11, y1: -4 },
  // The south street, unbroken across the whole town rather than in two arms.
  // The plaza stops at y 2, so nothing here is already paved and there is no gap
  // to leave: one continuous frontage under the square's south side is what makes
  // the town read as a street with a square on it rather than as a square with
  // two spurs off it.
  //
  // ONE ROW, NOT TWO. The north street is two rows because it is pinched between
  // buildings on BOTH sides, where one row is a crack. Nothing fronts this one
  // from the south, so the second row was paving with nothing on either side of
  // it — and stacked under the plaza it put a wall of stone across the whole town
  // at exactly the place you stand most.
  { x0: -13, y0: 3, x1: 12, y1: 3 },
  // THE LANE — ONE TILE, running south out of the south street toward the farm.
  //
  // It was three, on the argument that it is the road out and a one-tile road
  // reads as a garden path. That was true about the LANE and wrong about the
  // TOWN: three tiles of cobble running the whole way to the gate, below a plaza
  // and a full-width street, is more stone than a place this size can carry, and
  // the walk south stopped being a walk through grass. A path you can see grass
  // either side of is what makes the farm feel out of town.
  { x0: 0, y0: 4, x1: 0, y1: 11 },
  // The spur east off the lane to Prudence's door. A spur ran west along this row
  // to the seed stall once and was pulled up when the stall stopped being a
  // building; there is a door down here again, and a doorstep lands on paving
  // (§The street plan) or it is not a front.
  { x0: 0, y0: 11, x1: 7, y1: 11 },
  // THROUGH THE GATE AND DOWN THE MIDDLE OF THE PLOT (§The plot). The lane does
  // not stop at the boundary and start again as a garden path: it is one road,
  // and it ends in your yard. That continuity is most of what makes the farm read
  // as the thing the town opens onto rather than as a separate map.
  { x0: 0, y0: 12, x1: 0, y1: 18 },
  // THE YARD, in front of the barn door and joining it to the lane's foot. Paved
  // in the same cobble as the road for the same reason — it is where the road
  // arrives, not a second surface laid against it.
  { x0: -7, y0: 18, x1: 0, y1: 18 },
];

// --- The plot -------------------------------------------------------------------
//
// THE FARM. The lane out of the square used to stop in grass; this is what it was
// stopping short of. DESIGN §Town and homestead calls the homestead "a plot on the
// edge of town — land you own, not a job you have", and until now the whole of
// that was a tent standing on open ground with a four-tile bubble of no-trees
// round it. It was a spawn point, not a place.
//
// WHAT IT IS: a fenced parcel at the foot of the lane, with a barn in it, a yard
// in front of the barn, and the rest left as grass. You may use every inch of it
// or none of it.
//
// WHAT IT IS NOT, and this is the load-bearing half: it is NOT ENFORCED. Nothing
// anywhere in the game reads these bounds to decide what you may build or where.
// The fence is signal — it says which ground the town considers yours, the way a
// hedge does — and you can take it down for the wood. Building outside it is
// allowed everywhere the rest of the world is; that was settled explicitly, and
// it is the same instinct as no stamina and no daily caps. A boundary that
// refused you would be the first "you may not build here" rule in a game whose
// entire build layer has none.
//
// SEVENTEEN BY EIGHT, and the size is a proof obligation rather than a taste.
// `HOME_REGION_REACH` guarantees the town's own region — its ground paint, its
// flora settings, its water table — only within about twenty-one tiles of the
// origin, and that number is not tunable: it is derived from how far apart the
// biome sites can be (sim/world.ts). The plot's far corners sit at 20.6, just
// inside it. A plot one row deeper puts its corner outside the guarantee, and
// what "outside" means here is a neighbouring region's pond in your field and a
// neighbouring region's dirt painted across the corner of it, on the seeds where
// a foreign site happens to sit close. The first draft was 19x13 and reached 26.6.
export const PLOT = { x0: -8, y0: 12, x1: 8, y1: 19 };

/** The gate: the cell of the north fence left OUT, where the lane arrives.
 *
 *  A GAP AND NOT A GATE PIECE. A fence does not enclose (content/structures.ts
 *  §fence), so nothing is being sealed and there is nothing for a gate to open —
 *  a hole in a fence is a way through, complete. One cell, because the lane is
 *  one cell: the gate is as wide as the road, whatever the road is. */
const GATE = { x0: 0, x1: 0 };

/** Is this cell part of the plot's fence? The perimeter of PLOT, less the gate. */
export function isPlotFence(x: number, y: number): boolean {
  if (x < PLOT.x0 || x > PLOT.x1 || y < PLOT.y0 || y > PLOT.y1) return false;
  const perimeter = x === PLOT.x0 || x === PLOT.x1 || y === PLOT.y0 || y === PLOT.y1;
  if (!perimeter) return false;
  return !(y === PLOT.y0 && x >= GATE.x0 && x <= GATE.x1);
}

/** Every fence cell, as a list, for the stamp. */
export function plotFenceCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = PLOT.y0; y <= PLOT.y1; y++) {
    for (let x = PLOT.x0; x <= PLOT.x1; x++) {
      if (isPlotFence(x, y)) cells.push({ x, y });
    }
  }
  return cells;
}

// --- What the town planted ------------------------------------------------------

/** Trees, bushes and flowers the town put in before you arrived.
 *
 *  THE SAME OBJECTS THE GARDEN MAKES (DESIGN §The garden), stamped rather than
 *  planted — an entry in `world.garden.plants` plus the tile under it, exactly
 *  what `plantAt` writes. So the town's avenue is uprootable, its hydrangeas are
 *  a bush you could have planted yourself, and its fruit is pickable. There is no
 *  second notion of "scenery" anywhere, which is the same argument the header
 *  makes about the buildings and `content/town.ts` §STREETS makes about paving.
 *
 *  THIS IS A SHORT LIST ON PURPOSE. The town's own note about restraint applies
 *  hardest here: the failure mode of landscaping is not too little, it is a
 *  place that reads as a mashup of textures instead of as one settlement. Every
 *  entry below is doing a specific job, and there is nothing here that is merely
 *  filling space.
 *
 *  IT CANNOT REACH THE SQUARE. Flora wants grass or bare dirt (sim/garden.ts) and
 *  the whole town centre is paving now — so the planting is where the paving is
 *  not: along the lane, in the two alleys that break the north street's face, and
 *  on your own ground.
 */
/** Ground the town keeps DRY that is not a building.
 *
 *  `TOWN_RECTS` in sim/world.ts caps the water table within six tiles of any town
 *  wall, so a channel cannot lap a bedroom — and every piece of town ground got
 *  that protection for free, because every piece of town ground was inside a
 *  building. The seed stall stopped being a building (§THE SEED STALL) and took
 *  its own dry footing with it: on the very first seed looked at, Derek was
 *  standing behind his counter in a stream, with his grove growing out of it.
 *
 *  It is the cap and not an override, deliberately. The cap SHALLOWS water near
 *  town rather than deleting it, so on a wet seed the stall stands on a sandy
 *  bank instead of in the current — which is a market on a dry bank, and is a
 *  picture. Forcing grass here instead would cut any stream that crossed it into
 *  two halves with a lawn between them, which is the failure the whole clearing
 *  is placed below the water to avoid. */
export const TOWN_DRY_GROUND = { x0: -8, y0: 3, x1: -2, y1: 7 };

/** THE PARK — the town's green, west of the square, with the stage in it.
 *
 *  It is the answer to a gap rather than a feature somebody wanted: Prudence's
 *  house came off the square (§margfrom_house) and left a building-shaped hole in
 *  its west side. A fourth building would have put the problem back; bare ground
 *  reads as a building missing. A park reads as the side that was never built on,
 *  which is what it is.
 *
 *  AND THE STAGE CAME WITH IT. The plaza stage stood on stone in the square's
 *  south-west corner, which was the right corner of the wrong surface — a 2x2
 *  wooden platform on paving, with the town's one open space doubling as its
 *  audience floor. On a green, with benches behind an open apron, it is an
 *  amphitheatre; and the square gets its quadrant back.
 *
 *  Bounded by the museum and the north street above, the plaza to the east, the
 *  south street below, and the river country to the west. `TOWN_RECTS` keeps it
 *  dry like the rest of the town's own ground — its west edge stops at x -13
 *  because the cap reaches six tiles and the promised river is anchored at -20. */
export const PARK = { x0: -13, y0: -3, x1: -6, y1: 2 };

export const TOWN_PLANTINGS: { x: number; y: number; id: FloraId }[] = [
  // THE AVENUE — four birches, two a side, down the lane out of the square.
  // The single strongest planting in the town and the reason this table exists:
  // a three-tile cobbled strip running south through grass is a paved strip, and
  // the same strip with trees down it is a ROAD. Birch because it is the one
  // pale, upright tree in the set and reads as planted rather than as left.
  { x: -3, y: 6, id: "birch" },
  { x: 3, y: 6, id: "birch" },
  { x: -3, y: 9, id: "birch" },
  { x: 3, y: 9, id: "birch" },
  // Verges. Flowers are walkable and cost the layout nothing, which is exactly
  // why they go where a tree would be in the way.
  { x: -2, y: 7, id: "buttercup" },
  { x: 2, y: 8, id: "daisy" },
  { x: -2, y: 10, id: "daisy" },
  { x: -2, y: 11, id: "buttercup" },
  // THE TWO ALLEYS in the north street's face — the gaps between the museum and
  // the hall, and the hall and the heap. Two cells wide each, and a street face
  // with a hole in it reads as a missing tooth. One tree fills the gap and leaves
  // the other cell walkable, which is what a real gap between two buildings has
  // in it.
  { x: -4, y: -8, id: "broadleaf" },
  { x: 5, y: -8, id: "broadleaf" },
  // YOUR OWN GROUND: two fruit trees along the plot's east fence, well clear of
  // the field and of the tent. A smallholding that arrived with an apple tree on
  // it is the oldest picture there is of one, and they are PICKABLE — the town
  // planted them, and the fruit is yours.
  { x: 7, y: 14, id: "apple" },
  { x: 7, y: 17, id: "plum" },
  // And a pair of hydrangeas just inside your gate, which is the one piece of
  // pure decoration in the table and is allowed to be: somebody planted them
  // there on purpose, and that is the whole of what they say.
  { x: 2, y: 13, id: "hydrangea" },
  { x: 3, y: 13, id: "hydrangea" },
  // THE PARK (§THE PARK). A RIM AND NEVER A FILL: trees round the edges and open
  // grass in the middle, because the middle is the amphitheatre's floor and a
  // park you cannot cross is a wood. The east rim doubles as the square's west
  // side — the plaza is bounded by institutions on three sides and by this on the
  // fourth, which is a better answer than a fourth building and than a bare gap.
  { x: -7, y: -3, id: "broadleaf" },
  { x: -7, y: 1, id: "broadleaf" },
  { x: -6, y: -1, id: "bush" },
  { x: -13, y: -3, id: "broadleaf" },
  { x: -13, y: 1, id: "broadleaf" },
  { x: -12, y: -3, id: "bush" },
  { x: -9, y: -3, id: "birch" },
  { x: -13, y: -1, id: "hydrangea" },
  // Two by the benches, because the one thing a park bench wants behind it is a
  // tree, and because they close the amphitheatre's back without walling it.
  { x: -13, y: 2, id: "bush" },
  { x: -7, y: 2, id: "bush" },
  // Prudence's, because the one house in town should look lived in from outside
  // and not merely occupied. Two bushes down her east side.
  { x: 10, y: 7, id: "hydrangea" },
  { x: 10, y: 9, id: "hydrangea" },
  // THE STALL'S GROVE. Derek's counter stands in the open now that his building
  // is gone, and an open-air stall on bare grass reads as a table somebody
  // abandoned. A loose ring of planting gives it somewhere to BE — the same job
  // the walls used to do, done by the thing a seed merchant would actually have
  // around him.
  //
  // Loose on purpose: not a ring, and never enclosing the counter, which has to
  // stay reachable from three sides. Two trees behind and to the west, two
  // bushes low and near, and open ground on the square's side so you can see the
  // stall from the street.
  { x: -8, y: 4, id: "broadleaf" },
  { x: -8, y: 7, id: "broadleaf" },
  { x: -2, y: 8, id: "birch" },
  { x: -6, y: 7, id: "bush" },
  { x: -3, y: 4, id: "hydrangea" },
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
   *  honest amount of nothing there is to show.
   *
   *  WHICH SASH is the building's, not the town's. There are four
   *  (content/structures.ts §StructureId) and they carry most of what tells
   *  these six apart now that they all have glass: the hall and the museum wear
   *  paned sashes because institutions are glazed properly, the shop has one
   *  wide shopfront, the salvage shed has mean little slits, and the barn has a
   *  band up under its gable. Omitted means the plain one. */
  windows?: { x: number; y: number; sash?: StructureId }[];
  /** Holes cut in the roof, placed on the INTERIOR cells they hang over.
   *
   *  Only the museum has any, and that is the shape of the thing rather than a
   *  shortage of ambition: a skylight is for a room too deep to light from its
   *  own walls, and the museum is the only room in town that is. Everything else
   *  here is four or five cells from a window.
   *
   *  Interior, never the wall ring — a skylight over the shell is a hole cut in
   *  the eave. `stampBuilding` refuses to place one anywhere else, so a mistake
   *  in this table is a missing skylight rather than a broken roof. */
  skylights?: { x: number; y: number }[];
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
    y0: -10,
    x1: 3,
    y1: FRONT_N,
    door: { x: 0, y: FRONT_N },
    // SAGE GREEN — a tin of municipal paint, which is the most institutional
    // object there is. It is the only green building in the world and it does not
    // merge with the grass: the paint is grey-green (#8a9c7e) against a turf that
    // is a full-blooded yellow-green, and on screen they sit apart rather than
    // blending.
    //
    // IT WAS SLATE FOR ABOUT TEN MINUTES, on the reasoning that the hall should
    // be the museum's stone opposite — marble pale and welcoming, slate dark and
    // official. It photographed as a black slab at the head of the square, which
    // is the museum's own warning coming true one building over: being
    // distinctive is not the same as being welcoming, and the darkest grey
    // available reads as a jail whatever its footprint. Granite and cobble are
    // out for the reasons recorded on the museum (granite IS the plaza's colour,
    // so the hall would vanish into its own paving).
    //
    // Painted timber also says the right thing about this particular institution.
    // The museum is built of stone to last; the town hall was painted, once, by
    // somebody following a schedule.
    finish: "sage",
    // PANED, and flanking the door in matching pairs — which is the whole of what
    // makes a building look official at this scale. The south wall runs x -3..3
    // with the door at 0; -2/-1 and 1/2 each merge into one two-cell sash, and
    // the corners at -3 and 3 stay solid masonry (see the museum's note: glazing
    // to the corner reads as a shed with the walls missing).
    //
    // Symmetry is the point and it is the ONE building here that gets it. A town
    // hall is a building that was drawn before it was built; the shed, the barn
    // and the cottage all put their glass wherever it happened to be wanted.
    windows: [
      { x: -2, y: FRONT_N, sash: "window_paned" },
      { x: -1, y: FRONT_N, sash: "window_paned" },
      { x: 1, y: FRONT_N, sash: "window_paned" },
      { x: 2, y: FRONT_N, sash: "window_paned" },
    ],
    furniture: [
      // The desk he is permanently "at the desk" at, immediately behind him.
      { x: -1, y: -8, id: "table", facing: "s", counter: "hall" },
      { x: 1, y: -8, id: "chair", facing: "s" },
      // Paperwork, filed along the back wall in whatever order it arrived.
      { x: -2, y: -9, id: "shelf", facing: "s" },
      { x: 2, y: -9, id: "shelf", facing: "s" },
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
    // OFF THE SQUARE, and that is a rule now rather than a move.
    //
    // She flanked the plaza's south-west corner, opposite the shop, and a HOUSE
    // ON THE SQUARE is the one building there with no business with anybody else.
    // A square is where the institutions face each other — hall, museum, shop,
    // heap, the board, the stage — and those are the things you go to it FOR. It
    // is also a precedent that does not survive the town growing: commissions add
    // houses (sim/commission.ts), and if the square is where a house goes then the
    // square is what gets eaten.
    //
    // So she is on the LANE instead, with a short spur to her door — the first
    // house of what a residential row would be, on the way out to the farm, with
    // the seed stall's grove facing her across the road.
    //
    // EAST of the lane and not west, and that is a migration constraint rather
    // than a taste. West of the lane is where the seed stall's BUILDING used to
    // stand, and two rungs of the save ladder still demolish that footprint by
    // frozen coordinate — a house whose furniture sat inside it made those rungs
    // read "the player has claimed this ground" and decline, leaving a ghost
    // building overlapping the new house. Old geometry is not free ground until
    // every rung that names it has run.
    x0: 4,
    y0: 6,
    x1: 9,
    y1: 10,
    // SOUTH wall, and that is not a free choice. A wall running away from the
    // camera shows its top rather than its face (DESIGN §Structures), so a door
    // cut into an east or west wall has no face to appear on and is invisible
    // from outside — you can walk through it, but you cannot see that you can.
    // Doors belong on south walls until the renderer can draw them otherwise.
    // East end of the south wall, so the table along the west can never reach
    // across the doorstep.
    door: { x: 7, y: 10 },
    finish: "pine",
    // A COTTAGE WINDOW AND A SLIT, which is what a house looks like when nobody
    // designed it. The south wall runs x 4..9 with the door at 7 and the corners
    // at 4 and 9: 5/6 merge into one two-cell window looking out over the lane —
    // the one she sits at — and 8 is the single cell left between the door and
    // the corner, which is exactly the shape a narrow sash is for.
    //
    // Plain glass, not paned. She is the only building on this street that is
    // somebody's home rather than somebody's job, and the sash is where that
    // shows: the hall and the museum are glazed properly and this is glazed.
    windows: [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
      { x: 8, y: 10, sash: "window_narrow" },
    ],
    resident: "resident1",
    furniture: [
      // A 1x2 bed along the west wall. Its anchor is what her home resolves to,
      // and the cell beside it is where she actually stands to sleep — derived
      // (sim/housing.ts picks a walkable neighbour), not authored. Wall the bed
      // in differently and her side of it moves; the coordinate here is where
      // the bed starts, not where she stands.
      { x: 5, y: 7, id: "bed", facing: "s" },
      // The table is along the south-west, deliberately clear of the doorway:
      // solid furniture in front of the door would seal her out of her own
      // house, and she'd snap home every night instead of walking in.
      { x: 5, y: 9, id: "table", facing: "s" },
      { x: 6, y: 8, id: "chair", facing: "s" },
      // THE HEARTH, and it is the reason this house has the only chimney in the
      // town (render/renderer.ts §chimneyCell). Two cells wide, against the
      // north wall — which is not a choice: a fireplace needs a wall behind it
      // (content/furniture.ts §backs), so the back row is the only row it can
      // stand on.
      //
      // Beside her bed rather than across the room from it, because this is one
      // room and always was. A cottage does not have a parlour.
      // EAST END OF THE BACK WALL, and that is not arbitrary. It sat at (6,7)
      // first, which put the chair at (6,8) directly in front of it — and a
      // piece one row south draws OVER the piece behind it, so the fire was
      // half-hidden behind a chair back. Caught by looking, which is the only
      // way it could have been: every test still passed and the room was still
      // walkable. The bed keeps the west end, the fire takes the east, and the
      // chair sits between them in front of the shelf.
      { x: 7, y: 7, id: "fireplace", facing: "s" },
      // The shelf moved west one to make room. It was at (7,7), which is now the
      // hearth's west half — and the back row is the only row a fireplace can
      // stand on (§backs), so the shelf is the piece that had to move.
      { x: 6, y: 7, id: "shelf", facing: "s" },
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
    // ONE SHOPFRONT, three cells wide, and it is the longest run of glass in the
    // town. The south wall runs x 7..12 with the door at the east end (11) and
    // the corners at 7 and 12, which leaves 8/9/10 — a single unbroken window,
    // because that is the difference between a shop and a house with a counter
    // in it. You are meant to be able to see the stock from the square.
    //
    // Which is also why it is plain and not paned: glazing bars are what you put
    // in when you are not trying to be looked through.
    windows: [
      { x: 8, y: FRONT_S },
      { x: 9, y: FRONT_S },
      { x: 10, y: FRONT_S },
    ],
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
    y0: -11,
    x1: 10,
    y1: FRONT_N,
    // South wall, like every door in the town — a wall running away from the
    // camera has no face to draw a doorway on (see margfrom_house).
    door: { x: 8, y: FRONT_N },
    // SALVAGE, and the finish was named for him before this building wore it:
    // its hint in content/skins.ts reads "The Gremlin has a facility. He would
    // like you to call it a facility." A shed made of reclaimed boards IS the
    // joke, and it settles the one real material collision in town — the hall and
    // the heap were both ash, which made the town's two most different errands
    // look like the same building at a distance.
    finish: "salvage",
    // TWO SLITS, one either side of the door, and they do the same joke the
    // salvage boards do. The south wall runs x 6..10 with the door at 8 and the
    // corners at 6 and 10, so 7 and 9 are the only cells there are — and a
    // narrow sash is the right thing in them twice over: it fits, and a facility
    // that let you see in properly would not be a facility.
    //
    // Deliberately NOT merged, which is the narrow sash's own rule doing the
    // work here rather than a spacing decision (see structures.ts): these are two
    // windows, symmetric about the door, and the wall between them is the point.
    windows: [
      { x: 7, y: FRONT_N, sash: "window_narrow" },
      { x: 9, y: FRONT_N, sash: "window_narrow" },
    ],
    furniture: [
      // Shelves he refers to as "the system". He stands beside the counter, at
      // (9,-8).
      { x: 7, y: -10, id: "shelf", facing: "s" },
      { x: 9, y: -10, id: "shelf", facing: "s" },
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
      { x: 7, y: -8, id: "table", facing: "s", counter: "heap" },
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
    y0: -15,
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
    // PANED SINCE THE SASHES ARRIVED. The geometry is unchanged and the argument
    // above still holds; what changed is that "the plain one" stopped being the
    // only one there was. A museum and a town hall are the two buildings here
    // that were glazed by somebody following a specification, and the glazing
    // bars are the cheapest way to say so — the shop's shopfront and this are
    // now visibly different KINDS of window rather than the same window in
    // different quantities.
    windows: [
      { x: -12, y: FRONT_N, sash: "window_paned" },
      { x: -11, y: FRONT_N, sash: "window_paned" },
      { x: -9, y: FRONT_N, sash: "window_paned" },
      { x: -8, y: FRONT_N, sash: "window_paned" },
    ],
    // THREE SKYLIGHTS, UP THE MIDDLE OF THE GALLERY, and the museum is the only
    // building in the world with any.
    //
    // A skylight is for a room too deep to light from its own walls, and this is
    // the only one that is: the interior runs x -12..-7 by y -14..-7, so the far
    // end is eight cells from the façade and its glass. Everything else in town
    // is four or five cells from a window. That is the rule, stated here rather
    // than derived in the renderer — a skylight is PLACED (structures.ts), so
    // where it goes is a decision somebody makes, not a fact about a room.
    //
    // ON THE AISLES AND NOT THE CASES. The plinth rows are -13, -11, -9 and -7,
    // so -12, -10 and -8 are the walkways you actually stand in, and a gallery
    // lights the floor you walk on rather than the top of a display case. On the
    // door's own column (-10) so the three of them line up with the way in.
    //
    // Three and not six. Two abreast would have put a skylight in every other
    // cell of a six-wide roof, which is the per-cell edges rule waiting to
    // happen (CLAUDE.md) — a roof stops reading as a roof the moment its
    // features start agreeing with the tile grid. One per aisle, two cells
    // apart, reads as a row of lights.
    skylights: [
      { x: -10, y: -12 },
      { x: -10, y: -10 },
      { x: -10, y: -8 },
    ],
    furniture: [
      // Corrigal's desk, in the lobby by the door rather than at the far end.
      // Donating is the one act the museum asks of you and walking the length
      // of the gallery to do it would be a waiting period wearing a hat — the
      // same objection DESIGN raised to identification taking time. She stands
      // at (-9,-7), off its west end — beside it rather than behind it, which
      // the old coordinate claimed and did not do. Clear of the doorstep.
      { x: -8, y: -7, id: "table", facing: "s", counter: "museum" },
      // Reference along the north wall, behind the last case. She has read all
      // of it and drawn her own conclusions.
      { x: -12, y: -14, id: "shelf", facing: "s" },
      { x: -8, y: -14, id: "shelf", facing: "s" },
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
      { wing: "nature", x: -12, y: -13 },
      { wing: "nature", x: -11, y: -13 },
      { wing: "nature", x: -10, y: -13 },
      { wing: "nature", x: -9, y: -13 },
      { wing: "nature", x: -8, y: -13 },
      { wing: "nature", x: -7, y: -13 },
      // …and the overflow, west of the doorway. Two cells, which is one more
      // than the crop table currently needs; a third crop will want the room
      // reshaped rather than another corner found for it.
      { wing: "nature", x: -12, y: -7 },
      { wing: "nature", x: -11, y: -7 },
      // Antiquities, the two runs nearest the door — they are what fills up.
      { wing: "antiquities", x: -12, y: -9 },
      { wing: "antiquities", x: -11, y: -9 },
      { wing: "antiquities", x: -10, y: -9 },
      { wing: "antiquities", x: -9, y: -9 },
      { wing: "antiquities", x: -8, y: -9 },
      { wing: "antiquities", x: -7, y: -9 },
      { wing: "antiquities", x: -12, y: -11 },
      { wing: "antiquities", x: -11, y: -11 },
      { wing: "antiquities", x: -10, y: -11 },
      { wing: "antiquities", x: -9, y: -11 },
      { wing: "antiquities", x: -8, y: -11 },
      { wing: "antiquities", x: -7, y: -11 },
    ],
  },

  // THE BARN, and the game is called The Farm.
  //
  // It stands in your plot before you arrive, which is a change to DESIGN's old
  // "you start with a tent and build everything" line and is written into DESIGN
  // now rather than left as a surprise in a table. The argument for it is the one
  // the owner gave: the plot needs a LANDING POINT — somewhere the lane arrives
  // at, somewhere that is recognisably yours from the first minute — and a tent
  // on open grass was not it.
  //
  // IT DOES NOTHING, deliberately and completely. There is no barn mechanic, no
  // chore, no capacity, no upgrade path. It is a room you own with a door on it,
  // which is exactly what every other building in this town is; a barn that asked
  // something of you daily would be the first thing in the game that did, and
  // DESIGN spends a whole invariant forbidding that shape. Use it or don't.
  //
  // ON THE WEST SIDE with the field east of the lane, so the road runs between
  // them and you pass the barn's gable coming in. Its door is on the south wall
  // like every other door in the game (§The street plan), so what you see from
  // the gate is its back — which is what you see of a real barn from a farm road,
  // and the yard you walk round to is the front.
  barn: {
    id: "barn",
    name: "The Barn",
    x0: -7,
    y0: 13,
    x1: -2,
    y1: 17,
    door: { x: -4, y: 17 },
    // OX-BLOOD, and it is the only painted building in the world. Every other
    // finish in town is a material — pine, ash, whitewash, marble — and this one
    // is a TIN OF PAINT somebody opened, which is the difference between a
    // building the town put up and a building that belongs to a smallholding.
    // It also does the whole of this building's aesthetic work in one field: a
    // red barn is legible at any zoom and from any distance, and nothing else in
    // the game is that colour.
    //
    // It is a paint the player has not unlocked yet (`starter: false`), which is
    // a feature — the Gremlin has the tins, and now there is a reason to want
    // one. Same shape of hook as the museum's marble.
    finish: "oxblood",
    // A BAND UP HIGH AND ONE SLIT, which is how a barn is glazed: you do not put
    // a sitting-room window in a building full of hay. The south wall runs
    // x -7..-2 with the door at -4 and the corners at -7 and -2, so -6/-5 merge
    // into one two-cell transom over the yard, and -3 is the single cell on the
    // far side of the door.
    //
    // The transom is the reason that sash exists at all. A barn's windows are
    // over your head — above the doors, above whatever is stacked against the
    // wall — and every other opening in this game sits at eye level, so there
    // was no shape in the table that could say "high up" until there was one.
    windows: [
      { x: -6, y: 17, sash: "window_transom" },
      { x: -5, y: 17, sash: "window_transom" },
      { x: -3, y: 17, sash: "window_narrow" },
    ],
    furniture: [
      // What the last occupant left. Set dressing and nothing more: the actual
      // wood and stone are in your pockets at world creation (sim/game.ts), NOT
      // in these — there is no container system, and inventing one so that a
      // chest could hold six planks would be a mechanic built to justify a prop.
      //
      // They were nearly gatherable NODES instead — a real woodpile and a real
      // boulder you fell on your first morning, which is a better story and does
      // not work: a node's `felled` tile is GRASS, so clearing the woodpile would
      // punch a lawn through the barn's floor, and both regrow, so the barn would
      // quietly restock itself with boulders forever.
      { x: -6, y: 14, id: "chest", facing: "s" },
      { x: -5, y: 14, id: "chest", facing: "s" },
      { x: -3, y: 14, id: "shelf", facing: "s" },
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

/** The errands board, against the town hall's front wall.
 *
 *  IT USED TO STAND IN THE MIDDLE OF THE SQUARE'S SOUTH-EAST CORNER, chosen when
 *  every quadrant was taken by something and that one was left. Standing free on
 *  open paving is the wrong place for a board twice over: it is the one object in
 *  town with a FACE and nothing behind it, and a notice board belongs on a wall.
 *  Against the hall it reads as mounted — the wall is drawn first, the board over
 *  it — and it puts the town's paperwork on the building that produces it.
 *
 *  East of the doorway, never on it. The doorstep is the only way into the hall
 *  and a solid board across it would seal the Office Creature in.
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
  { x: 2, y: FRONT_N + 1, id: "noticeboard", facing: "s", finish: "pine" },
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
  // AN AWNING OVER THE SHOP'S DOOR, and it is the whole of what makes the Counter
  // read as a shop from across the square. A building's identity is not its
  // signage — DESIGN's tone note would rather the world showed you than told you
  // — and one striped canopy says "you buy things here" faster than a name board
  // ever could. Walk-through, so it hangs over the doorstep rather than blocking
  // it, which is what an awning does.
  { x: 10, y: 3, id: "awning", facing: "s", finish: "whitewash" },
  // And a crate beside it, because a shop has stock that did not fit.
  { x: 12, y: 3, id: "chest", facing: "s", finish: "whitewash" },
  // THE FACILITY'S PILE, stacked against its own west wall on the street. Two
  // crates and not six: the joke is that a shed with a heap in it is being called
  // a facility, and a heap you have to squeeze past stops being funny and starts
  // being an obstacle. Walk-through, like every chest.
  { x: 6, y: -5, id: "chest", facing: "s", finish: "salvage" },
  { x: 6, y: -4, id: "chest", facing: "s", finish: "salvage" },
  // THE AMPHITHEATRE'S BENCHES — two, covering the crowd's back row exactly
  // (content/festivals.ts §AUDIENCE). Walk-through like every seat, so a watcher
  // assigned to one of those cells simply sits on it and nothing in the festival
  // code has to know benches exist.
  //
  // The FRONT row is deliberately left bare. Two rows of seating with nobody able
  // to stand in front reads as a waiting room; one row of benches behind an open
  // apron reads as a place people gather, some of whom sat down.
  { x: -12, y: 2, id: "bench", facing: "s", finish: "pine" },
  { x: -10, y: 2, id: "bench", facing: "s", finish: "pine" },
  // THE SEED STALL, and it is an actual stall now.
  //
  // It was a six-by-six BUILDING with a door and a roof, and the table row said
  // so apologetically: "a genuinely open-fronted stall would be a room the flood
  // fill never closes, and every rule about roofs, doorsteps and cutaways would
  // need an exception for one structure. He has a door like everybody else and
  // does not appear to have noticed."
  //
  // The way out was that it was never a structure question. A canopy is
  // FURNITURE — like the stage, three lines up — and furniture needs no room
  // around it, no doorstep, no flood fill and no exception. So Derek gets a
  // counter under an awning at the edge of the square, which is what a seed stall
  // is, and the town loses a building it was pretending about.
  //
  // The awning goes NORTH of the counter, which is both what a stall looks like
  // (cloth at the back, goods at the front) and what the renderer needs: it is
  // drawn a row earlier, so the counter and whoever is standing at it are drawn
  // over it rather than under it. That is the Blessed Carrot rule, and it is why
  // the awning is not simply on top of the counter cell.
  { x: -5, y: 4, id: "awning", facing: "s", finish: "pine" },
  { x: -5, y: 5, id: "table", facing: "s", finish: "pine", counter: "seedstall" },
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
  // THE PARK (§THE PARK). Part of it came free while Prudence's house stood on
  // it and stopped the day the house moved — a building clears its own ground, so
  // taking one away costs a clearing, which is the second time that has bitten
  // this week (the seed stall's grove was the first).
  { x0: PARK.x0, y0: PARK.y0, x1: PARK.x1, y1: PARK.y1 },
  // THE STALL AND ITS GROVE. This used to come free — a building clears its own
  // ground plus the margin — and stopped the day the seed stall stopped being a
  // building. Without it the town plants an avenue and a grove into whatever wood
  // the generator happened to put there, which is not a grove, it is a clearing
  // that never happened.
  { x0: -9, y0: 3, x1: -1, y1: 8 },
  // THE WHOLE PLOT, fence to fence, and this one is not margined — it is cleared
  // to its own boundary and the wood starts outside it, which is what a fence
  // line looks like. Cleared at all because a field with six trees standing in it
  // is not a field, and because the alternative is handing the player a plot and
  // asking them to spend their first hour logging it.
  { x0: PLOT.x0, y0: PLOT.y0, x1: PLOT.x1, y1: PLOT.y1 },
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
