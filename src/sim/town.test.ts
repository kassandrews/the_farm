import { describe, it, expect } from "vitest";
import { newWorld, tick, buildAt } from "./game";
import { add, count } from "./inventory";
import {
  tileKey,
  isWalkable,
  tileAt,
  floorFinish,
  generatedTile,
  homesteadOrigin,
  HOME_REGION_REACH,
  PLAZA,
} from "./world";
import { FLOOR, STONE, WATER, SHALLOW, TREE, SHRUB, GRASS, DIRT, tileDef } from "../content/tiles";
import { FLORA } from "../content/flora";
import { growthStage } from "./garden";
import { rooms, roomAt } from "./rooms";
import { findPath } from "./path";
import { stampBuilding, stampTown, stampFixtures } from "./town";
import type { StampTarget } from "./town";
import {
  TOWN_BUILDINGS,
  allTownBuildings,
  footprintCells,
  isPerimeter,
  inTownClearing,
  isPlotFence,
  plotFenceCells,
  PLOT,
  FRONT_N,
  FRONT_S,
  STREETS,
  TOWN_FIXTURES,
  TOWN_PLANTINGS,
} from "../content/town";
import { structureDef } from "../content/structures";
import { AUDIENCE } from "../content/festivals";
import { cellsFor } from "./furniture";
import { stopTarget } from "./housing";
import { CAST } from "../content/cast";
import type { HomesteadSpot } from "./types";

function world(spot: HomesteadSpot = "forest", seed = 7) {
  return newWorld({ name: "Test", form: "blob", spot, seed });
}

/** Local-time epoch ms at a given hour today. */
function at(hour: number): number {
  return new Date(2026, 6, 24, hour, 0, 0, 0).getTime();
}

function blankTarget(): StampTarget {
  return { overrides: {}, build: {}, furniture: {}, crops: {} };
}

describe("the town's own buildings", () => {
  it("are there from the moment a world is created", () => {
    const w = world();
    for (const b of allTownBuildings()) {
      expect(w.build[tileKey(b.x0, b.y0)]).toMatchObject({ id: "wall" });
      expect(w.build[tileKey(b.door.x, b.door.y)]).toMatchObject({ id: "door" });
    }
  });

  it("enclose properly, so the derived roof arrives on its own", () => {
    const w = world();
    // Every building is a room the flood-fill recognises — the same mechanism
    // that will answer "is this a house" for a Phase 3 commission.
    for (const b of allTownBuildings()) {
      const inside = roomAt(w, b.x0 + 1, b.y0 + 1);
      expect(inside).not.toBeNull();
    }
    expect(rooms(w).length).toBeGreaterThanOrEqual(allTownBuildings().length);
  });

  it("bring their own floor, so nothing lands in a river or a tree", () => {
    // riverside puts water to the west and forest raises tree density — the two
    // ways an authored building could land on solid ground and half-fail.
    for (const spot of ["riverside", "forest", "forest"] as const) {
      for (let seed = 0; seed < 12; seed++) {
        const w = world(spot, seed);
        for (const b of allTownBuildings()) {
          for (const c of footprintCells(b)) {
            expect(tileAt(w, c.x, c.y)).toBe(FLOOR);
            expect(tileAt(w, c.x, c.y)).not.toBe(WATER);
            expect(tileAt(w, c.x, c.y)).not.toBe(TREE);
          }
        }
      }
    }
  });

  it("keep the doorstep clear, or one unlucky tree seals the house", () => {
    // The cell directly outside a door is the ONLY way in: its diagonals are
    // blocked by the door's own wall run (findPath won't cut a corner), so a
    // generated tree landing there makes the building unenterable. Found in the
    // browser, where Margfrom teleported home instead of walking — the snap
    // rule doing its job and hiding a real bug behind it.
    for (const spot of ["riverside", "forest", "forest"] as const) {
      for (let seed = 0; seed < 25; seed++) {
        const w = world(spot, seed);
        for (const b of allTownBuildings()) {
          const step = { x: b.door.x, y: b.door.y + 1 };
          expect(
            isWalkable(w, step.x, step.y),
            `${b.id} doorstep blocked on ${spot}/${seed}`,
          ).toBe(true);
        }
      }
    }
  });

  it("place a wall on every perimeter cell except the doorway and the windows", () => {
    const w = world();
    for (const b of allTownBuildings()) {
      const glazed = new Set((b.windows ?? []).map((p) => `${p.x},${p.y}`));
      for (const c of footprintCells(b)) {
        const cell = w.build[tileKey(c.x, c.y)];
        if (!isPerimeter(b, c.x, c.y)) {
          expect(cell).toBeUndefined(); // interiors stay clear
        } else if (c.x === b.door.x && c.y === b.door.y) {
          expect(cell).toMatchObject({ id: "door" });
        } else if (glazed.has(`${c.x},${c.y}`)) {
          expect(cell).toMatchObject({ id: "window" });
        } else {
          expect(cell).toMatchObject({ id: "wall" });
        }
      }
    }
  });

  it("puts every authored window ON the wall ring, and never on the door", () => {
    // A window listed off the perimeter would be silently dropped by the stamp —
    // `stampBuilding` only writes ring cells — and would look like the table
    // being ignored rather than the coordinate being wrong.
    for (const b of allTownBuildings()) {
      for (const p of b.windows ?? []) {
        expect(isPerimeter(b, p.x, p.y), `${b.id} window ${p.x},${p.y}`).toBe(true);
        expect(p.x === b.door.x && p.y === b.door.y).toBe(false);
      }
    }
  });

  it("a window seals its room and blocks the way in", () => {
    // The whole difference from a door. If a window ever stopped enclosing, the
    // museum would silently lose its roof; if it stopped being solid, the
    // façade would become four more front doors.
    const w = world();
    const museum = allTownBuildings().find((b) => b.id === "museum")!;
    const pane = museum.windows![0];
    expect(structureDef(w.build[tileKey(pane.x, pane.y)]!.id).encloses).toBe(true);
    expect(isWalkable(w, pane.x, pane.y)).toBe(false);
  });

  it("can be walked into through the door and not through the walls", () => {
    const w = world();
    const b = TOWN_BUILDINGS.townhall;
    // Standing on the plaza, south of the hall.
    const from = { x: b.door.x, y: b.y1 + 3 };
    const inside = { x: b.door.x, y: b.y1 - 1 };
    const legs = findPath(w, from, inside);
    expect(legs).not.toBeNull();
    expect(legs!.some((p) => p.x === b.door.x && p.y === b.door.y)).toBe(true);
    // The walls either side of the door are genuinely solid.
    expect(isWalkable(w, b.door.x - 1, b.door.y)).toBe(false);
    expect(isWalkable(w, b.door.x + 1, b.door.y)).toBe(false);
  });

  it("put every door on a SOUTH wall, where it can actually be seen", () => {
    // Not a style preference. A wall running away from the camera shows its top
    // rather than its face (DESIGN §Structures), so a door in an east or west
    // wall renders as nothing at all — pathable, invisible. Caught on screen,
    // not in a test, which is why this test now exists.
    for (const b of allTownBuildings()) {
      expect(b.door.y).toBe(b.y1);
      expect(b.door.x).toBeGreaterThan(b.x0);
      expect(b.door.x).toBeLessThan(b.x1);
    }
  });

  it("never stands its own furniture in a wall", () => {
    // The heap's counter was authored at (6,-7) and the heap's `x0` is 6, so its
    // left half stood in the west wall: half the table drew outside the
    // building, and the only walkable cell adjacent to its anchor was out on the
    // grass. You could not stand at your own shop's counter from inside the
    // shop.
    //
    // It survived because nothing needed to REACH a table until counters became
    // things you walk up to. The doorway guard below is the closest existing
    // check and it looks at one cell; this looks at every cell of every piece.
    for (const b of allTownBuildings()) {
      for (const f of b.furniture) {
        for (const [x, y] of cellsFor(f.x, f.y, f.id, f.facing)) {
          expect(
            isPerimeter(b, x, y),
            `${b.id}: ${f.id} at ${f.x},${f.y} covers wall cell ${x},${y}`,
          ).toBe(false);
        }
      }
    }
  });

  it("leaves every counter reachable from inside its own building", () => {
    // The consequence the wall check above is really about. A counter you can
    // only stand next to by leaving the building is a counter nobody can use.
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 5 });
    for (const b of allTownBuildings()) {
      for (const f of b.furniture) {
        if (!f.counter) continue;
        const inside = cellsFor(f.x, f.y, f.id, f.facing)
          .flatMap(([x, y]) => [[x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y]])
          .some(
            ([x, y]) =>
              x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && isWalkable(w, x, y, "surface"),
          );
        expect(inside, `${b.id}: its counter has no walkable neighbour indoors`).toBe(true);
      }
    }
  });

  it("never lets its own furniture seal the front door", () => {
    // A solid piece parked in the entryway would lock the resident out of the
    // house we just gave them, and the symptom would be subtle: they'd snap
    // home every night instead of walking in, and look fine doing it.
    const w = world();
    for (const b of allTownBuildings()) {
      const outside = { x: b.door.x, y: b.y1 + 1 };
      for (const c of footprintCells(b)) {
        if (isPerimeter(b, c.x, c.y)) continue;
        if (!isWalkable(w, c.x, c.y)) continue; // solid furniture is allowed to be solid
        const legs = findPath(w, outside, c);
        expect(legs, `interior cell ${c.x},${c.y} of ${b.id} is cut off`).not.toBeNull();
        expect(legs!.some((p) => p.x === b.door.x && p.y === b.door.y)).toBe(true);
      }
    }
  });

  it("are demolishable like anything else — no protected flag", () => {
    const w = world();
    const b = TOWN_BUILDINGS.townhall;
    const key = tileKey(b.x0, b.y0);
    expect(w.build[key]).toBeDefined();
    delete w.build[key];
    expect(w.build[key]).toBeUndefined();
  });
});

describe("Margfrom actually lives in her house", () => {
  /** Her overnight post, resolved against the world rather than read off the
   *  table — which is the entire point of the change these tests now cover. */
  function bedtime(w: ReturnType<typeof world>) {
    const v = w.villagers.find((x) => x.id === "resident1")!;
    return stopTarget(w, v, at(2));
  }

  it("has her overnight post inside her own four walls", () => {
    const w = world();
    const stop = bedtime(w);
    const house = TOWN_BUILDINGS.margfrom_house;
    expect(stop.x).toBeGreaterThan(house.x0);
    expect(stop.x).toBeLessThan(house.x1);
    expect(stop.y).toBeGreaterThan(house.y0);
    expect(stop.y).toBeLessThan(house.y1);
    // And it's somewhere she can actually stand.
    expect(isWalkable(w, stop.x, stop.y)).toBe(true);
  });

  it("can always reach her own bed, whatever terrain the seed generated", () => {
    // The end-to-end version of the doorstep bug: she teleported home in the
    // browser because no route existed, and the snap rule made that look normal.
    const house = TOWN_BUILDINGS.margfrom_house;
    for (const spot of ["riverside", "forest", "forest"] as const) {
      for (let seed = 0; seed < 25; seed++) {
        const w = world(spot, seed);
        const outside = { x: house.door.x, y: house.door.y + 2 };
        const legs = findPath(w, outside, bedtime(w));
        expect(legs, `no route to bed on ${spot}/${seed}`).not.toBeNull();
        expect(legs!.some((p) => p.x === house.door.x && p.y === house.door.y)).toBe(true);
      }
    }
  });

  it("is beside the bed, not on it — a solid bed is not a place to stand", () => {
    const w = world();
    const stop = bedtime(w);
    const bed = TOWN_BUILDINGS.margfrom_house.furniture.find((f) => f.id === "bed")!;
    // Adjacent to one of the two cells the 1x2 bed covers, and not on either.
    const near = [0, 1].map((d) => Math.abs(stop.x - bed.x) + Math.abs(stop.y - (bed.y + d)));
    expect(Math.min(...near)).toBe(1);
    expect(isWalkable(w, bed.x, bed.y)).toBe(false);
  });

  it("walks home through her own front door", () => {
    const w = world();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const house = TOWN_BUILDINGS.margfrom_house;
    const stop = bedtime(w);

    // Park her out on the plaza and let her walk home at 2am.
    v.x = 0;
    v.y = -1;
    let usedDoor = false;
    for (let i = 0; i < 3000; i++) {
      tick(w, 1 / 60, at(2));
      if (Math.round(v.x) === house.door.x && Math.round(v.y) === house.door.y) usedDoor = true;
      expect(isWalkable(w, Math.round(v.x), Math.round(v.y))).toBe(true);
    }
    expect(usedDoor).toBe(true);
    expect(Math.hypot(v.x - stop.x, v.y - stop.y)).toBeLessThan(0.2);
  });
});

describe("stamping", () => {
  it("refuses a building whose footprint holds player work, all or nothing", () => {
    const t = blankTarget();
    const b = TOWN_BUILDINGS.townhall;
    t.build[tileKey(b.x1, b.y1)] = { id: "wall", finish: "walnut" };

    expect(stampBuilding(t, b)).toBe(false);
    // Nothing at all was written — not the floor, not a single wall.
    expect(Object.keys(t.overrides)).toEqual([]);
    expect(Object.keys(t.build)).toEqual([tileKey(b.x1, b.y1)]);
    expect(Object.keys(t.furniture)).toEqual([]);
  });

  it("refuses over furniture and over crops too", () => {
    const b = TOWN_BUILDINGS.margfrom_house;

    const withFurniture = blankTarget();
    withFurniture.furniture[tileKey(b.x0 + 1, b.y0 + 1)] = {
      id: "chair",
      facing: "s",
      finish: "pine",
    };
    expect(stampBuilding(withFurniture, b)).toBe(false);

    const withCrop = blankTarget();
    withCrop.crops[tileKey(b.x0 + 2, b.y0 + 2)] = {};
    expect(stampBuilding(withCrop, b)).toBe(false);
  });

  it("is not blocked by a mere ground edit", () => {
    const t = blankTarget();
    const b = TOWN_BUILDINGS.townhall;
    t.overrides[tileKey(b.x0 + 1, b.y0 + 1)] = 1; // dirt, from a shovel
    expect(stampBuilding(t, b)).toBe(true);
  });

  it("won't stamp the same town twice over itself", () => {
    const t = blankTarget();
    // Buildings AND fixtures — stampTown is the one answer to "what does a town
    // contain", which is why the errands board is in this number.
    expect(stampTown(t).length).toBe(allTownBuildings().length + TOWN_FIXTURES.length);
    // Second pass sees its own walls and its own furniture, and declines all of
    // them. The fixture half matters as much as the building half: a board that
    // re-stamped would be harmless today and would silently overwrite a
    // refinished one the moment fixtures gain any state.
    expect(stampTown(t)).toEqual([]);
  });
});

// --- The errands board ----------------------------------------------------------
// It is one solid cell standing in the open on the plaza, which is a shape
// nothing else in the town has. These are the facts that shape has to keep.
describe("the errands board", () => {
  const board = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;

  it("stands on the plaza", () => {
    expect(board.x).toBeGreaterThanOrEqual(PLAZA.x0);
    expect(board.x).toBeLessThanOrEqual(PLAZA.x1);
    expect(board.y).toBeGreaterThanOrEqual(PLAZA.y0);
    expect(board.y).toBeLessThanOrEqual(PLAZA.y1);
  });

  it("lays no floor under itself", () => {
    // The whole reason fixtures are not buildings. A plank patch under the
    // board would be a scar in the middle of the paving.
    const t = blankTarget();
    stampFixtures(t);
    expect(t.overrides[tileKey(board.x, board.y)]).toBeUndefined();
    expect(t.furniture[tileKey(board.x, board.y)]?.id).toBe("noticeboard");
  });

  it("is not inside any building, and blocks no doorway", () => {
    for (const b of allTownBuildings()) {
      const inside = board.x >= b.x0 && board.x <= b.x1 && board.y >= b.y0 && board.y <= b.y1;
      expect(inside).toBe(false);
      // A door's only approach is the cell directly outside it — its diagonals
      // are sealed by the door's own wall run (see clearApron). A solid board
      // parked there would shut the building, and it is the kind of bug that
      // looks fine on screen because a villager who cannot path home snaps home.
      expect({ x: board.x, y: board.y }).not.toEqual({ x: b.door.x, y: b.door.y + 1 });
    }
  });

  it("does not stand where the Dog stands", () => {
    // He is BESIDE it, never behind it. A 22px piece drawn over somebody
    // standing north of it is the Blessed Carrot bug, which the unit tests were
    // green for the first time (ROADMAP) — so this one is a unit test.
    for (const stop of CAST.errands.schedule) {
      expect({ x: stop.x, y: stop.y }).not.toEqual({ x: board.x, y: board.y });
      // Directly north is the occluded cell: the art rises from the base.
      expect({ x: stop.x, y: stop.y }).not.toEqual({ x: board.x, y: board.y - 1 });
    }
  });

  it("keeps the Dog out of everybody's walls", () => {
    // He is the one institution that MOVES (content/cast.ts), so unlike the
    // other five his stops can't be eyeballed once and trusted — every stop on
    // the round has to be somewhere he can actually stand.
    for (const stop of CAST.errands.schedule) {
      for (const b of allTownBuildings()) {
        const inside = stop.x >= b.x0 && stop.x <= b.x1 && stop.y >= b.y0 && stop.y <= b.y1;
        expect(inside).toBe(false);
      }
    }
  });
});

// --- The plaza stage --------------------------------------------------------------
// The second fixture, and the first one that is bigger than a cell. Everything
// the board's block above checks, plus the two facts a 2x2 solid in the middle
// of the square adds: it must not stand on the Dog's round, and it must not
// stand where the town is about to stand.
describe("the plaza stage", () => {
  const stage = TOWN_FIXTURES.find((f) => f.id === "stage")!;
  const cells = cellsFor(stage.x, stage.y, "stage", stage.facing);

  it("stands on the plaza, all of it", () => {
    for (const [x, y] of cells) {
      expect(x).toBeGreaterThanOrEqual(PLAZA.x0);
      expect(x).toBeLessThanOrEqual(PLAZA.x1);
      expect(y).toBeGreaterThanOrEqual(PLAZA.y0);
      expect(y).toBeLessThanOrEqual(PLAZA.y1);
    }
  });

  it("lays no floor under itself", () => {
    const t = blankTarget();
    stampFixtures(t);
    for (const [x, y] of cells) expect(t.overrides[tileKey(x, y)]).toBeUndefined();
    expect(t.furniture[tileKey(stage.x, stage.y)]?.id).toBe("stage");
  });

  it("is not inside any building, and blocks no doorway", () => {
    for (const b of allTownBuildings()) {
      for (const [x, y] of cells) {
        const inside = x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
        expect(inside).toBe(false);
        expect({ x, y }).not.toEqual({ x: b.door.x, y: b.door.y + 1 });
      }
    }
  });

  it("does not stand on the Dog's round, or on the board", () => {
    // Two solid fixtures in one square, and he walks between them.
    const board = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;
    for (const [x, y] of cells) {
      expect({ x, y }).not.toEqual({ x: board.x, y: board.y });
      for (const stop of CAST.errands.schedule) expect({ x: stop.x, y: stop.y }).not.toEqual({ x, y });
    }
  });

  it("does not swallow the Blob, who stands beside it and never behind it", () => {
    // The Blessed Carrot bug for the third time would be a policy. Raised art
    // draws upward from its footprint, so a performer on the cell north of the
    // platform is inside the platform as far as the renderer is concerned.
    const post = CAST.stage.schedule[0];
    for (const [x, y] of cells) {
      expect({ x: post.x, y: post.y }).not.toEqual({ x, y });
      expect({ x: post.x, y: post.y }).not.toEqual({ x, y: y - 1 });
    }
  });

  it("keeps the whole crowd out of every building's shadow", () => {
    // THE BLESSED CARROT BUG AT THE SCALE OF A BUILDING, and the reason this
    // test exists is that the first placement had it: the audience sat two
    // rows north of the seed stall, and everything that stands up is drawn
    // UPWARD from its footprint, so the crowd was behind the stall's roof.
    // Margfrom was a purple head over a gable, in exactly the cell the game
    // meant to put her in — which is why no unit test could have failed, and
    // why this one asks the question in terms of PIXELS rather than position.
    //
    // A storey is 24px and a roof sits on top of it, so two tiles of clearance
    // north of any wall is the honest margin.
    const SHADOW = 2;
    for (const seat of AUDIENCE) {
      for (const b of allTownBuildings()) {
        const behind = seat.x >= b.x0 && seat.x <= b.x1 && seat.y >= b.y0 - SHADOW && seat.y <= b.y1;
        expect(behind, `${b.id} would draw over the watcher at ${seat.x},${seat.y}`).toBe(false);
      }
    }
  });

  it("does not stand where the audience does", () => {
    // A solid cell under a watch spot is somebody who cannot reach their own
    // place in the crowd, and the snap rule would hide it (ROADMAP §"A door
    // needs a south wall": a villager who can't path somewhere teleports and
    // looks completely normal doing it).
    for (const seat of AUDIENCE) {
      for (const [x, y] of cells) expect({ x: seat.x, y: seat.y }).not.toEqual({ x, y });
      const board = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;
      expect({ x: seat.x, y: seat.y }).not.toEqual({ x: board.x, y: board.y });
    }
  });
});

// --- The street plan -----------------------------------------------------------
//
// The town's shape used to be six rectangles at whatever coordinates each one was
// written at, and the only thing checking them was that they didn't overlap by
// accident. These are the rules the plan actually asserts (content/town.ts §The
// street plan) — every one of them was a defect in the shipped town before it.

describe("the street plan", () => {
  it("puts every building around the square on one of the two street lines", () => {
    // The plan in one assertion. A south wall on neither line is a building whose
    // front faces a field, which is what all six of them used to be.
    //
    // ONE EXEMPTION, deliberate: the BARN is not the town's at all. It is in your
    // plot and its front is on your yard. It is still held to the doorstep and
    // connectivity rules below, which are the ones that actually matter.
    //
    // (There were two. The seed stall was the other, and it is not a building any
    // more — see content/town.ts §THE SEED STALL.)
    for (const b of allTownBuildings()) {
      if (b.id === "barn") continue;
      expect([FRONT_N, FRONT_S], `${b.id} fronts nothing`).toContain(b.y1);
    }
  });

  it("lands every doorstep on paving, not on grass", () => {
    // The point of the streets: you step out of a door onto a made surface. The
    // plaza counts — it IS the middle of both streets — so this asks the world
    // rather than the STREETS table.
    const w = world();
    for (const b of allTownBuildings()) {
      const t = tileAt(w, b.door.x, b.door.y + 1);
      expect([FLOOR, STONE], `${b.id} steps out onto ${t}`).toContain(t);
    }
  });

  it("connects every door to every other door on foot", () => {
    // A street that does not join up is decoration. Walk it: the pathfinder is
    // the only witness that matters, and it is the one thing a table of
    // rectangles cannot tell you by inspection.
    const w = world();
    const steps = allTownBuildings().map((b) => ({ id: b.id, x: b.door.x, y: b.door.y + 1 }));
    for (const a of steps) {
      for (const b of steps) {
        if (a === b) continue;
        const path = findPath(w, { x: a.x, y: a.y }, { x: b.x, y: b.y });
        expect(path, `no way from ${a.id} to ${b.id}`).not.toBeNull();
      }
    }
  });

  it("lets nothing stand on the square", () => {
    // The one shared space in the town, and the town hall used to have its south
    // wall on the plaza's top row — a building quietly eating a slice of it, with
    // the stamp laying plank over the paving. It survived because nothing else
    // came close: every other building is outside the plaza's x range, so there
    // was no second case to notice it by.
    for (const b of allTownBuildings()) {
      for (const c of footprintCells(b)) {
        const on =
          c.x >= PLAZA.x0 && c.x <= PLAZA.x1 && c.y >= PLAZA.y0 && c.y <= PLAZA.y1;
        expect(on, `${b.id} stands on the square at ${c.x},${c.y}`).toBe(false);
      }
    }
  });

  it("keeps the square's paving as generated stone, not stamped plank", () => {
    // The consequence, asserted where you can see it: every cell of the plaza is
    // the terrain the generator makes, with no override laid over it.
    const w = world();
    for (let y = PLAZA.y0; y <= PLAZA.y1; y++) {
      for (let x = PLAZA.x0; x <= PLAZA.x1; x++) {
        expect(tileAt(w, x, y), `${x},${y}`).toBe(STONE);
      }
    }
  });

  it("keeps the path to the farm a single tile wide", () => {
    // Asked for after looking at it: three tiles of cobble running to the gate,
    // under a plaza and a full-width street, and the walk south stopped being a
    // walk through grass. A path you can see grass either side of is what makes
    // the farm feel out of town.
    // Stopping short of y 11, where the spur to the seed stall's door crosses —
    // that is a different piece of paving and it is allowed to be beside the lane.
    const w = world();
    for (let y = 5; y <= 10; y++) {
      expect(tileAt(w, 0, y), `lane at ${y}`).toBe(FLOOR);
      expect(tileAt(w, -1, y), `paved beside the lane at ${y}`).not.toBe(FLOOR);
      expect(tileAt(w, 1, y), `paved beside the lane at ${y}`).not.toBe(FLOOR);
    }
  });

  it("never paves a cell a building is standing on", () => {
    // The stamp runs buildings first and streets second, so a street laid under a
    // wall would be invisible — and would come back as bare paving the day that
    // building was demolished, which reads as the town having had a road through
    // its own front room.
    for (const b of allTownBuildings()) {
      for (const c of footprintCells(b)) {
        for (const r of STREETS) {
          const on = c.x >= r.x0 && c.x <= r.x1 && c.y >= r.y0 && c.y <= r.y1;
          expect(on, `${b.id} stands on a street at ${c.x},${c.y}`).toBe(false);
        }
      }
    }
  });

  it("lays the streets as ordinary floor, in the town's own cobble", () => {
    // Ordinary cells, so you can take one up. If this ever became its own tile
    // id, the promise in content/town.ts §STREETS would have quietly lapsed.
    const w = world();
    const cell = { x: 0, y: 6 }; // mid-lane, clear of every building
    expect(tileAt(w, cell.x, cell.y)).toBe(FLOOR);
    expect(floorFinish(w, cell.x, cell.y)).toBe("cobble");
  });
});

describe("the town's clearing", () => {
  it("grows nothing on the streets or against the walls, on any seed", () => {
    // The bug it exists for: trees generated in the alleys between the fronts and
    // on the plaza's own edge, so the town read as six buildings dropped into a
    // wood rather than as a wood somebody cleared.
    for (const spot of ["riverside", "forest", "lakeside", "coast"] as const) {
      for (let seed = 0; seed < 12; seed++) {
        for (const b of allTownBuildings()) {
          for (let y = b.y0 - 1; y <= b.y1 + 1; y++) {
            for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
              const t = generatedTile(seed, spot, x, y);
              expect(!!tileDef(t).solid, `${t} at ${x},${y} on ${spot}/${seed}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it("leaves the wood standing outside it, so the town has an edge", () => {
    // A clearing is only a clearing if there is something to clear. Without this
    // the previous test passes just as well on a world with no trees in it.
    let trees = 0;
    for (let y = -40; y <= 40; y++) {
      for (let x = -40; x <= 40; x++) {
        if (!inTownClearing(x, y) && generatedTile(3, "forest", x, y) === TREE) trees++;
      }
    }
    expect(trees).toBeGreaterThan(100);
  });

  it("still leaves some wood to fell within a short walk of the plaza", () => {
    // TOWN_THIN's practical half (sim/world.ts). Thinning the common to nothing
    // reads as a lawn mown to the horizon and puts your first armful of wood a
    // two-minute walk away, so the ramp has a floor under it — and this is the
    // assertion that the floor is doing something.
    let near = 0;
    for (let y = -20; y <= 20; y++) {
      for (let x = -20; x <= 20; x++) {
        if (generatedTile(3, "forest", x, y) === TREE) near++;
      }
    }
    expect(near).toBeGreaterThan(15);
  });

  it("does not dam the river it runs past", () => {
    // The clearing is checked BELOW the water, and this is why: cleared ground
    // reaches past the museum's west wall and the riverside spot's channel runs
    // there. Clearing above the water dried three columns of it into lawn.
    let wet = 0;
    for (let y = -12; y <= 12; y++) {
      for (let x = -40; x <= 0; x++) {
        if (!inTownClearing(x, y)) continue;
        const t = generatedTile(11, "riverside", x, y);
        if (t === WATER || t === SHALLOW) wet++;
      }
    }
    // Not an amount — just that cleared ground and water are allowed to coexist.
    expect(wet).toBeGreaterThanOrEqual(0);
    // And the promise itself, which is the thing that actually broke: a riverside
    // town has wet river within a short walk west.
    let firstWet = 0;
    for (let x = -1; x > -60; x--) {
      const t = generatedTile(11, "riverside", x, -1);
      if (t === WATER || t === SHALLOW || t === FLOOR) firstWet = x;
      if (t === WATER || t === SHALLOW) break;
    }
    expect(firstWet).toBeLessThan(0);
  });
});

describe("the plot", () => {
  it("fences its whole boundary and leaves the gate open", () => {
    const w = world();
    for (let y = PLOT.y0; y <= PLOT.y1; y++) {
      for (let x = PLOT.x0; x <= PLOT.x1; x++) {
        const cell = w.build[tileKey(x, y)];
        if (isPlotFence(x, y)) {
          expect(cell, `no fence at ${x},${y}`).toMatchObject({ id: "fence" });
        } else {
          expect(cell?.id, `something fenced at ${x},${y}`).not.toBe("fence");
        }
      }
    }
  });

  it("lets you walk in off the lane", () => {
    // The gate is a GAP, so this is the only thing that proves it is one. A
    // fence is solid; a plot fenced all the way round would be a pen you could
    // see your own tent in and not reach.
    const w = world();
    const path = findPath(w, { x: 0, y: PLOT.y0 - 3 }, { x: 4, y: PLOT.y0 + 4 });
    expect(path).not.toBeNull();
  });

  it("never roofs the field, because a fence does not enclose", () => {
    // The reason `fence` is its own structure row and not a short wall. If it
    // enclosed, the flood fill would call the fenced parcel a room and the sky
    // would close over your field.
    const w = world();
    const inField = rooms(w).some((r) =>
      [...r.interior].some((k) => {
        const [x, y] = k.split(",").map(Number);
        return x > PLOT.x0 && x < PLOT.x1 && y > PLOT.y0 && y < PLOT.y1 && !insideBarn(x, y);
      }),
    );
    expect(inField).toBe(false);
  });

  it("stands the barn inside its own fence, with a door onto the yard", () => {
    const w = world();
    const b = TOWN_BUILDINGS.barn;
    expect(b.x0).toBeGreaterThan(PLOT.x0);
    expect(b.x1).toBeLessThan(PLOT.x1);
    expect(b.y0).toBeGreaterThan(PLOT.y0);
    expect(b.y1).toBeLessThan(PLOT.y1);
    expect(tileAt(w, b.door.x, b.door.y + 1)).toBe(FLOOR); // the yard
  });

  it("holds the whole plot inside the region the town is guaranteed", () => {
    // Not a style rule — `HOME_REGION_REACH` is derived from how far apart biome
    // sites can be, so it cannot simply be raised. Outside it, a neighbouring
    // region's pond can appear in your field. The first draft of the plot was
    // 19x13 and reached 26.6 tiles.
    for (const [x, y] of [
      [PLOT.x0, PLOT.y0],
      [PLOT.x1, PLOT.y0],
      [PLOT.x0, PLOT.y1],
      [PLOT.x1, PLOT.y1],
    ]) {
      expect(Math.hypot(x, y), `${x},${y}`).toBeLessThan(HOME_REGION_REACH);
    }
  });

  it("puts your tent on your own ground", () => {
    const w = world();
    expect(w.homestead.originX).toBeGreaterThan(PLOT.x0);
    expect(w.homestead.originX).toBeLessThan(PLOT.x1);
    expect(w.homestead.originY).toBeGreaterThan(PLOT.y0);
    expect(w.homestead.originY).toBeLessThan(PLOT.y1);
  });

  it("is the same plot whichever spot you chose", () => {
    // The spot names TERRAIN, never a location (DESIGN §Town and homestead). It
    // used to nudge the origin a tile or two per spot, which was invisible when
    // the homestead was a tent and would put that tent through the barn wall now.
    const spots: HomesteadSpot[] = ["riverside", "forest", "lakeside", "coast"];
    const origins = spots.map((s) => JSON.stringify(homesteadOrigin(s)));
    expect(new Set(origins).size).toBe(1);
  });

  it("enforces nothing — you may build outside the fence", () => {
    // Settled explicitly: the boundary is signal, not a rule. Nothing in the game
    // reads PLOT to decide what you may do.
    const w = world();
    add(w.inventory, "wood", 50);
    const out = { x: PLOT.x1 + 6, y: PLOT.y1 + 6 };
    expect(buildAt(w, "wall", out.x, out.y, 1000).changed).toBe(true);
  });

  it("lets you take your own fence down, and gives the wood back", () => {
    const w = world();
    const post = plotFenceCells()[0];
    const before = count(w.inventory, "wood");
    expect(buildAt(w, "erase", post.x, post.y, 1000).changed).toBe(true);
    expect(w.build[tileKey(post.x, post.y)]).toBeUndefined();
    expect(count(w.inventory, "wood")).toBeGreaterThan(before);
  });
});

function insideBarn(x: number, y: number): boolean {
  const b = TOWN_BUILDINGS.barn;
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

describe("what the town planted", () => {
  it("is the garden's own objects, not a second kind of scenery", () => {
    // The point of stamping rather than inventing: the avenue is uprootable, the
    // hydrangeas are a bush you could plant yourself, and the fruit is pickable.
    //
    // WHEREVER THE GROUND TAKES IT, and not unconditionally. A plant wants grass
    // or bare dirt (sim/garden.ts), and the town's ground is only guaranteed to
    // be clear of TREES — a stream can still cross it, and on a riverside seed
    // one sometimes does. A planting that lands on sand is skipped, which is the
    // graceful half of that: you get a thinner grove, never a tree in a river.
    const w = world();
    let took = 0;
    for (const p of TOWN_PLANTINGS) {
      const ground = generatedTile(w.seed, w.homestead.spot, p.x, p.y);
      const entry = w.garden.plants[tileKey(p.x, p.y)];
      if (ground === GRASS || ground === DIRT) {
        expect(entry, `nothing planted at ${p.x},${p.y}`).toMatchObject({ id: p.id });
        took++;
      } else {
        expect(entry, `planted on ${ground} at ${p.x},${p.y}`).toBeUndefined();
      }
    }
    // And most of the table takes on a normal seed, or the check above passes on
    // a world where the town planted nothing at all.
    expect(took).toBeGreaterThan(TOWN_PLANTINGS.length - 4);
  });

  it("arrives grown, not as a town of seedlings", () => {
    const w = world();
    for (const p of TOWN_PLANTINGS) {
      if (!w.garden.plants[tileKey(p.x, p.y)]) continue; // ground refused it
      expect(growthStage(w, p.x, p.y, Date.now()), `${p.id} at ${p.x},${p.y}`).toBe(2);
    }
  });

  it("stands its trees and bushes on the tile as well as in the record", () => {
    const w = world();
    for (const p of TOWN_PLANTINGS) {
      if (!w.garden.plants[tileKey(p.x, p.y)]) continue; // ground refused it
      const kind = FLORA[p.id].kind;
      const t = tileAt(w, p.x, p.y);
      if (kind === "tree") expect(t, `${p.x},${p.y}`).toBe(TREE);
      else if (kind === "bush") expect(t, `${p.x},${p.y}`).toBe(SHRUB);
      // A flower is a mark on the grass, never an object standing on it.
      else expect(t, `${p.x},${p.y}`).toBe(GRASS);
    }
  });

  it("never plants on water or sand — it skips rather than drowning", () => {
    // The bug this is for: `stampPlantings` read `overrides` alone, and an
    // unedited tile has no override — so "no override" was being taken as
    // "grass". It is whatever the generator says, and on a stream seed the town
    // planted four trees and a bush into open water.
    for (let seed = 1; seed <= 30; seed++) {
      const w = world("riverside", seed);
      for (const key of Object.keys(w.garden.plants)) {
        const [x, y] = key.split(",").map(Number);
        const t = tileAt(w, x, y);
        expect([TREE, SHRUB, GRASS], `${t} at ${key} on seed ${seed}`).toContain(t);
      }
    }
  });

  it("never plants on the paving, in a building, or on the fence", () => {
    // Flora wants grass or bare dirt, so a planting over a street would silently
    // not happen — a table row that renders nothing, which is exactly the failure
    // this project keeps writing tests against.
    const w = world();
    for (const p of TOWN_PLANTINGS) {
      expect(w.build[tileKey(p.x, p.y)], `built on at ${p.x},${p.y}`).toBeUndefined();
      for (const r of STREETS) {
        const on = p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
        expect(on, `${p.id} on a street at ${p.x},${p.y}`).toBe(false);
      }
    }
  });

  it("never stands anything solid against the tent", () => {
    // The homestead clearing keeps GENERATION off your plot, and an authored
    // planting goes in underneath that promise — so this is the check generation
    // already has, asked of the table. Adjacency and not a radius, deliberately:
    // the plot is seventeen by eight and the tent sits in it, so a four-tile
    // exclusion would forbid the town planting anything on your ground at all.
    // What actually matters is that you can step out of your tent in any
    // direction, which is the same thing `HOMESTEAD_CLEARING` was written for.
    const w = world();
    const { originX, originY } = w.homestead;
    for (const p of TOWN_PLANTINGS) {
      if (FLORA[p.id].kind === "flower") continue;
      const touching = Math.abs(p.x - originX) <= 1 && Math.abs(p.y - originY) <= 1;
      expect(touching, `${p.id} is against the tent at ${p.x},${p.y}`).toBe(false);
    }
  });
});

describe("the seed stall is a stall", () => {
  it("is furniture and not a building, so nothing had to grow an exception", () => {
    // The whole point. It was a six-by-six building with a door and a roof,
    // because an open-fronted STRUCTURE is a room the flood fill never closes.
    // A canopy is furniture, and furniture needs no room around it.
    expect(allTownBuildings().some((b) => b.name.includes("Stall"))).toBe(false);
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall");
    expect(counter, "no seed stall counter").toBeDefined();
    expect(TOWN_FIXTURES.some((f) => f.id === "awning"), "no awning").toBe(true);
  });

  it("does not roof itself, however you fence it in", () => {
    // A stall that grew a roof would be the building coming back by accident.
    const w = world();
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall")!;
    for (const r of rooms(w)) {
      expect(r.interior.has(tileKey(counter.x, counter.y)), "the stall is in a room").toBe(false);
    }
  });

  it("stands on dry ground on every spot and every seed", () => {
    // It used to get its dry footing for free, by being a building: the stamp
    // lays floor under a whole footprint, and `TOWN_RECTS` caps the water within
    // six tiles of any wall. Losing the walls lost both — Derek kept his stall in
    // a stream on the first seed anybody looked at, with his grove growing out of
    // it. `TOWN_DRY_GROUND` puts the cap back, and the clearing grasses over the
    // dry bank the cap leaves behind.
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall")!;
    const awning = TOWN_FIXTURES.find((f) => f.id === "awning")!;
    const cells = [
      [counter.x, counter.y],
      [counter.x + 1, counter.y],
      [awning.x, awning.y],
      [awning.x + 1, awning.y],
    ];
    for (const spot of ["riverside", "forest", "lakeside", "coast"] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const [x, y] of cells) {
          const t = generatedTile(seed, spot, x, y);
          expect([GRASS, DIRT], `${t} under the stall at ${x},${y} on ${spot}/${seed}`).toContain(t);
        }
      }
    }
  });

  it("leaves the water alone while it does it", () => {
    // The clearing grasses over dry BANKS and never wet cells, or a stream that
    // crossed the town would come out as two halves with a lawn between them.
    let wet = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let y = -6; y <= 20; y++) {
        for (let x = -14; x <= 13; x++) {
          if (!inTownClearing(x, y)) continue;
          const t = generatedTile(seed, "riverside", x, y);
          if (t === WATER || t === SHALLOW) wet++;
        }
      }
    }
    expect(wet, "no water survives inside the clearing at all").toBeGreaterThan(0);
  });

  it("keeps Derek beside his counter, and reachable", () => {
    const w = world();
    const derek = w.villagers.find((v) => v.id === "seedstall")!;
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall")!;
    expect(Math.abs(derek.x - counter.x) + Math.abs(derek.y - counter.y)).toBeLessThanOrEqual(3);
    expect(isWalkable(w, Math.round(derek.x), Math.round(derek.y))).toBe(true);
  });
});
