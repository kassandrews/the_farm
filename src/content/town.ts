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
import type { CharId } from "./cast";

export type TownBuildingId = "townhall" | "margfrom_house" | "shop";

/** A piece of furniture that comes with the building, at an absolute anchor. */
export interface TownFurniture {
  x: number;
  y: number;
  id: FurnitureId;
  facing: Facing;
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
  /** Finish for the walls and door. Per-cell since v5, so the town's buildings
   *  can differ from each other and from yours. */
  finish: SkinId;
  /** Who the town housed here when you arrived, if anyone. This is the ONLY
   *  authored link between a person and a place, and it is a starting
   *  condition, not a fact: the villager claims this building's bed once, at
   *  world creation, and from then on the claim lives on the villager and
   *  follows the bed wherever you move it (sim/housing.ts). Demolish the bed
   *  and they are homeless — this table does not drag them back. */
  resident?: CharId;
  furniture: TownFurniture[];
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
      { x: -1, y: -7, id: "table", facing: "s" },
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
    id: "margfrom_house",
    name: "Margfrom's House",
    x0: -11,
    y0: -4,
    x1: -7,
    y1: 0,
    // SOUTH wall, and that is not a free choice. A wall running away from the
    // camera shows its top rather than its face (DESIGN §Structures), so a door
    // cut into an east or west wall has no face to appear on and is invisible
    // from outside — you can walk through it, but you cannot see that you can.
    // Doors belong on south walls until the renderer can draw them otherwise.
    door: { x: -8, y: 0 },
    finish: "pine",
    resident: "resident1",
    furniture: [
      // A 1x2 bed along the west wall. Its anchor is what her home resolves to,
      // and (-9,-3) beside it is where she actually stands to sleep — derived
      // now (sim/housing.ts picks a walkable neighbour), not authored. Wall the
      // bed in differently and her side of it moves; the coordinate here is
      // where the bed starts, not where she stands.
      { x: -10, y: -3, id: "bed", facing: "s" },
      // The table is along the south-west, deliberately clear of the doorway:
      // solid furniture in front of the door would seal her out of her own
      // house, and she'd snap home every night instead of walking in.
      { x: -10, y: -1, id: "table", facing: "s" },
      { x: -9, y: -2, id: "chair", facing: "s" },
      { x: -8, y: -3, id: "shelf", facing: "s" },
    ],
  },

  // The Menace's shop, east of the plaza and facing it, so the two things the
  // town does TO you — stamping your paperwork and judging your purchases —
  // sit on opposite sides of the same square.
  shop: {
    id: "shop",
    name: "The Counter",
    x0: 7,
    y0: -4,
    x1: 12,
    y1: 0,
    // The door is at the EAST end rather than the middle, because the counter
    // runs along the west half and a table is solid. Two tables spanning the
    // whole row sealed the shop — caught by town.test.ts's "never lets its own
    // furniture seal the front door", which is exactly the bug it was written
    // for and exactly the one a layout written by eye produces.
    door: { x: 11, y: 0 },
    finish: "whitewash",
    furniture: [
      // The counter: one 2x1 table across the west half, with her behind it at
      // (9,-2). You come in past the end of it, which is how a shop works.
      { x: 8, y: -1, id: "table", facing: "s" },
      // Stock, along the back wall. Shelves rather than anything soft: the
      // soft goods are the point of the visit and she is not going to leave
      // them lying about where you could just take one.
      { x: 8, y: -3, id: "shelf", facing: "s" },
      { x: 11, y: -3, id: "shelf", facing: "s" },
    ],
  },
};

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
