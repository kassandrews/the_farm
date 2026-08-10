// Stamping the town's pre-existing buildings into the world.
//
// Two callers, one code path, deliberately: newWorld() stamps into a fresh
// world, and the v6→v7 migration stamps into a live save that predates
// buildings existing. If those drifted apart, a returning player's town would
// differ from a new player's in ways nobody would think to test.
//
// That's also why the target here is a structural subset rather than
// WorldState — a save mid-migration is a bag of raw parsed JSON, not a
// WorldState yet, and this has to work on both.
//
// The stamp is authoritative about its own ground: it writes the floor under
// the whole footprint before placing anything. Otherwise a building could land
// on a generated tree or (for the riverside spot) the river, and half of it
// would silently fail to place — canPlaceStructure refuses solid ground. An
// authored building comes with the ground it stands on.

import type { BuildCell, FurnitureCell } from "./types";
import type { CharDef } from "../content/cast";
import { CAST } from "../content/cast";
import type { TileId } from "../content/tiles";
import { FLOOR, GRASS, DIRT, TREE, SHRUB } from "../content/tiles";
import { tileDef } from "../content/tiles";
import type { TownBuilding } from "../content/town";
import { FLORA } from "../content/flora";
import {
  allTownBuildings,
  footprintCells,
  isPerimeter,
  plotFenceCells,
  TOWN_PLANTINGS,
  STREETS,
  TOWN_FIXTURES,
} from "../content/town";
import { tileKey } from "./world";

/** Answers what generation would put at a tile, before any edits. Both callers
 *  can supply one — a live world knows its own, and a save being migrated still
 *  carries the seed and homestead spot that determine it. */
export type TerrainProbe = (x: number, y: number) => TileId;

/** How much ground in front of a door the stamp will clear if it has to:
 *  three wide, two deep. One cell would be enough to guarantee entry — the
 *  approach apron is wider so the doorstep can't be ringed in by unlucky
 *  neighbours either. */
const APRON_W = 1; // cells either side of the door
const APRON_D = 2; // cells outward from the wall

/** The parts of a world a stamp touches. WorldState satisfies this, and so does
 *  a half-migrated save object once its layers are known to exist. */
export interface StampTarget {
  overrides: Record<string, TileId>;
  build: Record<string, BuildCell>;
  furniture: Record<string, FurnitureCell>;
  crops: Record<string, unknown>;
  /** Per-cell floor finish (world.ts §floorFinish). Optional because a save
   *  being migrated from far enough back may not have grown the field yet, and
   *  the streets are the only thing here that writes one — a building's floor is
   *  plain FLOOR and takes the default. */
  finishes?: Record<string, string>;
  /** The garden's planted things (sim/garden.ts). Optional for the same reason
   *  `finishes` is: a save being migrated from before the garden existed has no
   *  such field, and the plantings simply do not happen rather than crashing. */
  garden?: { seen: string[]; plants: Record<string, { id: string; at: number }> };
}

/** Has the player already claimed this cell for something of their own?
 *
 *  Ground edits deliberately DON'T count. Digging or paving is cheap to redo and
 *  the stamp rewrites the floor anyway; what must never be bulldozed is
 *  something the player stood up or planted, which represents real time. */
function occupied(t: StampTarget, x: number, y: number): boolean {
  const key = tileKey(x, y);
  return key in t.build || key in t.furniture || key in t.crops;
}

/** Stamp one building. Returns false without touching anything when the player
 *  has built or planted anywhere in its footprint.
 *
 *  All-or-nothing on purpose: a building stamped around someone's existing shed
 *  would be a roofless L-shape with a door into a wall, which is worse than the
 *  building simply not being there. The whole-footprint check is conservative,
 *  and being conservative is the right bias when the alternative is destroying
 *  something a live player built. */
export function stampBuilding(t: StampTarget, b: TownBuilding, probe?: TerrainProbe): boolean {
  const cells = footprintCells(b);
  if (cells.some((c) => occupied(t, c.x, c.y))) return false;

  // Floor first, so nothing lands on a tree or in the river.
  for (const c of cells) t.overrides[tileKey(c.x, c.y)] = FLOOR;

  clearApron(t, b, probe);

  for (const c of cells) {
    if (!isPerimeter(b, c.x, c.y)) continue;
    const isDoor = c.x === b.door.x && c.y === b.door.y;
    const isWindow = !isDoor && (b.windows ?? []).some((w) => w.x === c.x && w.y === c.y);
    // The door keeps `finish` while the walls may take `walls`: a leaf is
    // joinery and joinery is wood, even in a stone building. The door's SHELL —
    // the frame around the opening — picks the masonry up from its neighbouring
    // wall at draw time and needs nothing stored here.
    // A window is joinery like a door: its own finish paints the frame, and the
    // masonry around the opening comes from the run via `shellFinish`. So both
    // openings take `finish` and only plain wall takes `walls`.
    const joinery = isDoor || isWindow;
    t.build[tileKey(c.x, c.y)] = {
      id: isDoor ? "door" : isWindow ? "window" : "wall",
      finish: joinery ? b.finish : (b.walls ?? b.finish),
    };
  }

  for (const f of b.furniture) {
    t.furniture[tileKey(f.x, f.y)] = { id: f.id, facing: f.facing, finish: b.finish };
  }

  return true;
}

/** Clear a path to the front door, but ONLY where generation put something
 *  solid there.
 *
 *  This is not belt-and-braces. The cell directly outside a door is the only way
 *  in: its diagonals are blocked by the door's own wall run, and the pathfinder
 *  won't cut a corner between two walls. So one generated tree on the doorstep
 *  seals the building completely — and the symptom is nearly invisible, because
 *  a villager who can't path home snaps there instead and looks fine doing it.
 *
 *  Conditional on purpose. Paving unconditionally would lay a plank porch across
 *  the plaza in front of the town hall, where the stone is already perfectly
 *  walkable and the apron would just be a scar. */
function clearApron(t: StampTarget, b: TownBuilding, probe?: TerrainProbe): void {
  if (!probe) return;
  for (let d = 1; d <= APRON_D; d++) {
    for (let dx = -APRON_W; dx <= APRON_W; dx++) {
      const x = b.door.x + dx;
      const y = b.door.y + d; // doors face south, so "out" is +y
      const key = tileKey(x, y);
      if (key in t.overrides) continue; // already decided, by us or by the player
      if (!tileDef(probe(x, y)).solid) continue; // nothing in the way
      t.overrides[key] = GRASS;
    }
  }
}

/** Stand the town's loose furniture up — the errands board, and whatever joins
 *  it. See content/town.ts §Fixtures for why these aren't buildings.
 *
 *  NO FLOOR REWRITE, which is the entire difference from `stampBuilding`. A
 *  building brings its own ground because half of one placed on a generated
 *  tree is worse than none; a board on the plaza is standing on paving that is
 *  already there, and a one-cell plank patch under it would just be a scar.
 *
 *  Skips a cell the player has claimed, on the same all-or-nothing instinct —
 *  though for a single cell "all" is one piece, so this is simply "don't
 *  bulldoze". A town that quietly ate the shed you built on the plaza to put a
 *  notice board up would be the town taking something. */
export function stampFixtures(t: StampTarget): string[] {
  const placed: string[] = [];
  for (const f of TOWN_FIXTURES) {
    if (occupied(t, f.x, f.y)) continue;
    t.furniture[tileKey(f.x, f.y)] = { id: f.id, facing: f.facing, finish: f.finish };
    placed.push(f.id);
  }
  return placed;
}

/** The material the town paved its streets in. Cobble because it is the one
 *  stone that cannot be confused with the plaza — granite is byte for byte the
 *  plaza's own colour (see the museum's note in content/town.ts), so a granite
 *  street would have made the square's edge disappear, which is the opposite of
 *  what the street plan is for. The square is dressed stone; the streets are
 *  cobbles; you can see where one stops. */
const STREET_FINISH = "cobble";

/** Lay the town's streets — ordinary floor cells, exactly like the ones you lay
 *  (content/town.ts §STREETS).
 *
 *  PER CELL RATHER THAN ALL-OR-NOTHING, which is the one place this deliberately
 *  differs from `stampBuilding`. A building stamped around somebody's shed is a
 *  roofless L with a door into a wall; a street with a shed on it is a street
 *  with a shed on it. Half a lane is still a lane, so a player who built across
 *  the route keeps their building and the paving goes round them.
 *
 *  It writes the floor and its finish and nothing else — no walls, no clearing,
 *  no apron. A street is ground. */
export function stampStreets(t: StampTarget): number {
  let laid = 0;
  for (const r of STREETS) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (occupied(t, x, y)) continue;
        const key = tileKey(x, y);
        t.overrides[key] = FLOOR;
        if (t.finishes) t.finishes[key] = STREET_FINISH;
        laid++;
      }
    }
  }
  return laid;
}

/** The plot's fence — posts and rails round the homestead (content/town.ts
 *  §The plot).
 *
 *  PINE, because it is yours and nobody has painted it. The barn beside it is the
 *  one thing on this ground with a colour on it, and a fence in the same ox-blood
 *  would have made the pair read as a matched set somebody commissioned rather
 *  than as a barn on a smallholding.
 *
 *  Per cell like the streets and not all-or-nothing like a building: half a fence
 *  is still a fence, so a player who has built across the line keeps their
 *  building and the rails stop either side of it. */
export function stampFences(t: StampTarget): number {
  let laid = 0;
  for (const c of plotFenceCells()) {
    if (occupied(t, c.x, c.y)) continue;
    t.build[tileKey(c.x, c.y)] = { id: "fence", finish: "pine" };
    laid++;
  }
  return laid;
}

/** Put the town's own trees, bushes and flowers in (content/town.ts §What the
 *  town planted).
 *
 *  `at: 0` — planted at the epoch, which is to say LONG AGO. Growth is a pure
 *  function of age against the clock (sim/garden.ts §growthStage), so an authored
 *  planting with a zero timestamp is simply mature, and it is mature on the first
 *  frame of a brand-new world without anything having to special-case it. A
 *  timestamp of "now" would hand you a town of seedlings.
 *
 *  It writes the tile AND the record, because that pair IS the planted thing —
 *  the same two writes `plantAt` makes. Flowers deliberately get no tile: a
 *  flower is a mark on the grass, not an object standing on it.
 *
 *  Per cell and skipping anything occupied, like the streets and the fence. */
export function stampPlantings(t: StampTarget, probe?: TerrainProbe): number {
  if (!t.garden) return 0;
  let put = 0;
  for (const p of TOWN_PLANTINGS) {
    const key = tileKey(p.x, p.y);
    if (occupied(t, p.x, p.y) || t.garden.plants[key]) continue;
    // Only onto ground a plant would actually take — and the GENERATED ground
    // counts, not just the edits.
    //
    // It read `t.overrides` alone, which is undefined for every unedited tile in
    // the world, so "no override" was being taken as "grass". It is not: it is
    // whatever the generator says, and on a seed where a stream crosses the seed
    // stall's grove the town planted four trees and a bush into open water. A
    // plant that lands somewhere it cannot grow is a table row that renders
    // nothing, which is the failure this project keeps writing tests against.
    const ground = t.overrides[key] ?? probe?.(p.x, p.y);
    if (ground !== undefined && ground !== GRASS && ground !== DIRT) continue;
    const kind = FLORA[p.id].kind;
    if (kind === "tree") t.overrides[key] = TREE;
    else if (kind === "bush") t.overrides[key] = SHRUB;
    t.garden.plants[key] = { id: p.id, at: 0 };
    put++;
  }
  return put;
}

/** Stamp every town building AND every fixture. Returns the ids that were
 *  actually placed, so a migration can say what it did rather than claiming
 *  success it didn't have.
 *
 *  One function rather than two calls at each site, deliberately: `newWorld` and
 *  the migrations both go through here, and the whole reason this module exists
 *  is that a returning player's town and a new player's town must not be able to
 *  differ. A fixture that only one of the two callers remembered to place would
 *  be that bug in its purest form. */
export function stampTown(t: StampTarget, probe?: TerrainProbe): string[] {
  const placed: string[] = [];
  for (const b of allTownBuildings()) {
    if (stampBuilding(t, b, probe)) placed.push(b.id);
  }
  // Streets AFTER the buildings, so a building that stamped its own floor over
  // a route keeps it: the walls are the fixed thing here and the paving runs up
  // to them. Before the fixtures for no reason but reading order — a fixture
  // stands on ground and never lays any.
  stampStreets(t);
  // Fences last of the three ground passes: they stand ON the ground the streets
  // just laid, and the gate is a gap in them that the lane runs through.
  stampFences(t);
  // Planting last of all: it is the only pass that has to look at what every
  // other pass has already put down.
  stampPlantings(t, probe);
  return [...placed, ...stampFixtures(t)];
}

// --- The fixed cast ------------------------------------------------------------

/** The subset of a world that needs to hold people. Structural, for the same
 *  reason StampTarget is: a save mid-migration is raw parsed JSON, not a
 *  WorldState. */
export interface CastTarget {
  villagers: { id: string }[];
}

/** Make sure every authored INSTITUTION is actually standing in the town.
 *
 *  Called by `newWorld` and by the migration, deliberately the same function —
 *  the v7 stamp established why (ROADMAP 2b step 2): if the two drifted, a
 *  returning player's town would differ from a new player's in ways nobody
 *  would think to test. A shop building with nobody behind the counter is
 *  exactly that bug, and it is what happens if only one of the two knows about
 *  a new cast row.
 *
 *  Additive and idempotent: it only ever appends someone MISSING, so it can be
 *  run on every load and can never disturb a villager who is already there —
 *  including one the player has since rehoused or befriended.
 *
 *  Residents are not its business. Only `fixed` cast: an institution is part of
 *  the furniture of the town and should appear the moment the town has a
 *  building for them, whereas a resident arriving is an EVENT (a commission)
 *  and must never be conjured by a migration. */
export function ensureFixedCast<T extends CastTarget>(
  target: T,
  now: number,
  make: (def: CharDef, now: number) => unknown,
): void {
  for (const def of Object.values(CAST)) {
    if (!def.fixed) continue;
    if (target.villagers.some((v) => v.id === def.id)) continue;
    target.villagers.push(make(def, now) as { id: string });
  }
}
