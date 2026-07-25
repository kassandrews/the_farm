import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { setTile, isWalkable } from "./world";
import { GRASS } from "../content/tiles";
import { placeStructure } from "./structures";
import { placeFurniture } from "./furniture";
import { findPath, MAX_PATH_NODES } from "./path";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "hilltop", seed: 7 });
}

/** Clear generated terrain over a rectangle so a test is pathing across known
 *  ground rather than around whichever trees the seed happened to put there. */
function clear(w: ReturnType<typeof world>, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setTile(w, x, y, GRASS);
  }
}

/** Every step of a route is adjacent to the last and lands on walkable ground. */
function isContiguous(w: ReturnType<typeof world>, from: { x: number; y: number }, legs: { x: number; y: number }[]) {
  let prev = from;
  for (const leg of legs) {
    if (Math.abs(leg.x - prev.x) > 1 || Math.abs(leg.y - prev.y) > 1) return false;
    if (!isWalkable(w, leg.x, leg.y)) return false;
    prev = leg;
  }
  return true;
}

describe("findPath", () => {
  it("walks a straight line across open ground", () => {
    const w = world();
    clear(w, 20, 20, 30, 24);
    const legs = findPath(w, { x: 20, y: 22 }, { x: 26, y: 22 });
    expect(legs).not.toBeNull();
    expect(legs!.at(-1)).toEqual({ x: 26, y: 22 });
    expect(isContiguous(w, { x: 20, y: 22 }, legs!)).toBe(true);
  });

  it("excludes the starting cell and includes the destination", () => {
    const w = world();
    clear(w, 20, 20, 30, 24);
    const legs = findPath(w, { x: 20, y: 22 }, { x: 22, y: 22 })!;
    expect(legs).toEqual([
      { x: 21, y: 22 },
      { x: 22, y: 22 },
    ]);
  });

  it("returns an empty route when already there", () => {
    const w = world();
    clear(w, 20, 20, 30, 24);
    expect(findPath(w, { x: 22, y: 22 }, { x: 22, y: 22 })).toEqual([]);
  });

  it("goes around a wall rather than through it", () => {
    const w = world();
    clear(w, 20, 18, 30, 26);
    // A vertical wall between the two points, with open ground past both ends.
    for (let y = 18; y <= 24; y++) placeStructure(w, 25, y, "wall", "pine");

    const legs = findPath(w, { x: 23, y: 22 }, { x: 27, y: 22 });
    expect(legs).not.toBeNull();
    expect(isContiguous(w, { x: 23, y: 22 }, legs!)).toBe(true);
    // Which end it rounds depends on the terrain the seed generated beyond the
    // cleared patch, so assert the property rather than the route: it never
    // stands in the wall, and it costs more than the four-step straight line
    // that walking through would have.
    expect(legs!.some((p) => p.x === 25 && p.y >= 18 && p.y <= 24)).toBe(false);
    expect(legs!.length).toBeGreaterThan(4);
  });

  it("walks through a door", () => {
    const w = world();
    clear(w, 20, 20, 30, 26);
    for (let y = 20; y <= 26; y++) placeStructure(w, 25, y, "wall", "pine");
    placeStructure(w, 25, 22, "door", "pine");

    const legs = findPath(w, { x: 23, y: 22 }, { x: 27, y: 22 })!;
    expect(legs).not.toBeNull();
    // The door is the only way across, so the route must use it.
    expect(legs.some((p) => p.x === 25 && p.y === 22)).toBe(true);
  });

  it("refuses to cut the corner where two walls meet", () => {
    const w = world();
    clear(w, 20, 20, 30, 26);
    // A diagonal seam: (25,22) and (24,23) are walls, so stepping from (24,22)
    // to (25,23) would squeeze between them. sim/rooms.ts fills four-way and
    // would call such a room enclosed, so movement must agree.
    placeStructure(w, 25, 22, "wall", "pine");
    placeStructure(w, 24, 23, "wall", "pine");

    const legs = findPath(w, { x: 24, y: 22 }, { x: 25, y: 23 })!;
    expect(legs).not.toBeNull();
    expect(legs[0]).not.toEqual({ x: 25, y: 23 });
    expect(isContiguous(w, { x: 24, y: 22 }, legs)).toBe(true);
  });

  it("treats solid furniture as blocking and walks around it", () => {
    const w = world();
    clear(w, 20, 20, 30, 26);
    // A sealed two-cell-tall corridor, which a 1x2 bed plugs exactly. Sealing
    // the ends matters: leave them open and the route simply walks around the
    // outside, which proves nothing about the furniture.
    for (let x = 20; x <= 30; x++) {
      placeStructure(w, x, 21, "wall", "pine");
      placeStructure(w, x, 24, "wall", "pine");
    }
    for (const y of [22, 23]) {
      placeStructure(w, 20, y, "wall", "pine");
      placeStructure(w, 30, y, "wall", "pine");
    }
    // Without the bed the corridor is walkable end to end.
    expect(findPath(w, { x: 22, y: 22 }, { x: 28, y: 22 })).not.toBeNull();

    expect(placeFurniture(w, 25, 22, "bed", "s", "pine")).toBe(true);
    expect(findPath(w, { x: 22, y: 22 }, { x: 28, y: 22 })).toBeNull();
  });

  it("returns null for a destination that is itself solid", () => {
    const w = world();
    clear(w, 20, 20, 30, 24);
    placeStructure(w, 25, 22, "wall", "pine");
    expect(findPath(w, { x: 22, y: 22 }, { x: 25, y: 22 })).toBeNull();
  });

  it("lets a villager walk OUT of a cell that was sealed under them", () => {
    const w = world();
    clear(w, 20, 20, 30, 24);
    // A wall dropped on the cell they're standing in. The start must stay
    // searchable or they'd be stuck there for good.
    placeStructure(w, 22, 22, "wall", "pine");
    const legs = findPath(w, { x: 22, y: 22 }, { x: 25, y: 22 });
    expect(legs).not.toBeNull();
    expect(legs!.at(-1)).toEqual({ x: 25, y: 22 });
  });

  it("gives up rather than searching an unbounded world forever", () => {
    const w = world();
    clear(w, 0, 0, 40, 40);
    // Sealed in a box: the destination is open ground far outside it, so the
    // search has nowhere to go but the budget.
    for (let i = 19; i <= 25; i++) {
      placeStructure(w, i, 19, "wall", "pine");
      placeStructure(w, i, 25, "wall", "pine");
      placeStructure(w, 19, i, "wall", "pine");
      placeStructure(w, 25, i, "wall", "pine");
    }
    expect(findPath(w, { x: 22, y: 22 }, { x: 500, y: 500 })).toBeNull();
  });

  it("finds a long open path within the budget", () => {
    const w = world();
    clear(w, 0, 0, 60, 10);
    const legs = findPath(w, { x: 1, y: 5 }, { x: 55, y: 5 });
    expect(legs).not.toBeNull();
    expect(legs!.length).toBeLessThanOrEqual(MAX_PATH_NODES);
    expect(legs!.at(-1)).toEqual({ x: 55, y: 5 });
  });
});
