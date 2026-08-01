import { describe, it, expect } from "vitest";
import { newWorld, buildAt, buildCost, loadedFinish } from "./game";
import { setTile, isWalkable, tileKey } from "./world";
import { GRASS } from "../content/tiles";
import { placeStructure, buildRevision } from "./structures";
import {
  placeFurniture,
  removeFurnitureAt,
  furnitureAt,
  canPlaceFurniture,
  cellsFor,
} from "./furniture";
import { footprint, furnitureDef } from "../content/furniture";

function world() {
  const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 3 });
  // A blank canvas. These tests are about the anchor mechanism itself, so the
  // town's own furniture (src/content/town.ts) is noise that would make every
  // "what's in the layer" assertion a restatement of the town layout. Tests
  // about the town living alongside the player's work are in save.test.ts and
  // town.test.ts, where the buildings are the point.
  w.build = {};
  w.furniture = {};
  // Open ground: generated trees and rocks are solid and would rightly refuse.
  for (let y = 15; y <= 35; y++) for (let x = 15; x <= 35; x++) setTile(w, x, y, GRASS);
  w.inventory.wood = 500;
  return w;
}

describe("multi-tile furniture", () => {
  it("stores a piece once, at its anchor", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine");
    // A bed is 1x2. There is deliberately no second record on the covered
    // cell — the anchor is the only source of truth.
    expect(Object.keys(w.furniture)).toEqual([tileKey(20, 20)]);
    expect(furnitureAt(w, 20, 21)?.ax).toBe(20);
    expect(furnitureAt(w, 20, 21)?.ay).toBe(20);
  });

  it("is found from any cell it covers, not just the anchor", () => {
    const w = world();
    placeFurniture(w, 20, 20, "table", "s", "pine"); // 2x1
    expect(furnitureAt(w, 20, 20)).not.toBeNull();
    expect(furnitureAt(w, 21, 20)).not.toBeNull();
    expect(furnitureAt(w, 22, 20)).toBeNull();
  });

  it("swaps its footprint when turned east or west", () => {
    const bed = furnitureDef("bed"); // 1 wide, 2 deep
    expect(footprint(bed, "s")).toEqual({ w: 1, h: 2 });
    expect(footprint(bed, "e")).toEqual({ w: 2, h: 1 });
    expect(cellsFor(20, 20, "bed", "e")).toEqual([
      [20, 20],
      [21, 20],
    ]);
  });

  it("refuses to half-overlap anything", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine"); // covers (20,20) and (20,21)
    // A piece that could land half on top of another is a piece you could
    // never remove cleanly.
    expect(canPlaceFurniture(w, 20, 21, "bed", "s")).toBe(false);
    expect(canPlaceFurniture(w, 20, 19, "bed", "s")).toBe(false);
    expect(canPlaceFurniture(w, 21, 20, "bed", "s")).toBe(true);
  });

  it("won't stand inside a wall", () => {
    const w = world();
    placeStructure(w, 25, 25, "wall", "pine");
    expect(canPlaceFurniture(w, 25, 25, "chair", "s")).toBe(false);
    // …including when only the far end of the footprint hits it.
    expect(canPlaceFurniture(w, 25, 24, "bed", "s")).toBe(false);
  });

  it("blocks walking across every cell of a solid piece", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine");
    expect(isWalkable(w, 20, 20)).toBe(false);
    expect(isWalkable(w, 20, 21)).toBe(false); // the far end blocks too
    expect(isWalkable(w, 20, 22)).toBe(true);
  });

  it("lets you walk past the pieces that shouldn't block", () => {
    const w = world();
    placeFurniture(w, 20, 20, "chair", "s", "pine");
    // A chair you can't step past turns a small room into a maze.
    expect(isWalkable(w, 20, 20)).toBe(true);
  });

  it("comes back up when you point at any part of it", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine");
    const taken = removeFurnitureAt(w, 20, 21); // the foot of the bed
    expect(taken?.id).toBe("bed");
    expect(w.furniture).toEqual({});
  });
});

describe("building furniture through the build tool", () => {
  it("spends on placement and refunds the same on erase", () => {
    const w = world();
    const before = w.inventory.wood!;
    const placed = buildAt(w, "bed", 20, 20, 1000);
    expect(placed.changed).toBe(true);
    expect(w.inventory.wood).toBe(before - buildCost("bed", loadedFinish(w, "bed")).wood!);

    const removed = buildAt(w, "erase", 20, 21, 1000);
    expect(removed.changed).toBe(true);
    // Building and un-building must never quietly drain you.
    expect(w.inventory.wood).toBe(before);
  });

  it("honours the facing it was placed with", () => {
    const w = world();
    buildAt(w, "bed", 20, 20, 1000, "e");
    expect(furnitureAt(w, 21, 20)).not.toBeNull(); // rotated: runs east
    expect(furnitureAt(w, 20, 21)).toBeNull();
  });

  it("takes furniture back before walls, so aiming at a shelf can't cost you the wall", () => {
    const w = world();
    placeStructure(w, 25, 25, "wall", "pine");
    placeFurniture(w, 24, 25, "shelf", "s", "pine");
    const res = buildAt(w, "erase", 24, 25, 1000);
    expect(res.message).toContain("Shelf");
    expect(w.build[tileKey(25, 25)]).toBeDefined(); // wall survived
  });

  it("refuses politely when short, and takes nothing", () => {
    const w = world();
    w.inventory.wood = 1;
    const res = buildAt(w, "bed", 20, 20, 1000);
    expect(res.changed).toBe(false);
    expect(res.broke).toBe(true);
    expect(w.inventory.wood).toBe(1);
  });
});

describe("a placed piece invalidates what depends on walkability", () => {
  // The bug this block exists for: villager routes are memoised against
  // `buildRevision`, which only wall and door edits used to bump — so a table
  // dropped across a corridor left every route already computed "valid", and the
  // villager walked through it. Pre-existing since routes arrived in 2b step 1
  // and found while wiring step 3 (ROADMAP §Known gaps).
  //
  // The assertion is at the cache key rather than on a walking villager on
  // purpose: with the corridor sealed, a villager with no route SNAPS to their
  // stop by design, which looks exactly like walking through the table. The
  // honest question is whether anything holding a stale route is told.
  it("bumps the revision routes are keyed on", () => {
    const w = world();
    const before = buildRevision(w);
    expect(placeFurniture(w, 5, 5, "table", "s", "pine")).toBe(true);
    expect(buildRevision(w)).not.toBe(before);

    const placed = buildRevision(w);
    expect(removeFurnitureAt(w, 5, 5)).not.toBeNull();
    expect(buildRevision(w)).not.toBe(placed);
  });

  it("changes the answer `isWalkable` gives, which is why it must", () => {
    // The other half of the pair: if solidity did not change, invalidating
    // nothing would be correct. A table is solid, so it does.
    const w = world();
    expect(isWalkable(w, 5, 5)).toBe(true);
    placeFurniture(w, 5, 5, "table", "s", "pine");
    expect(isWalkable(w, 5, 5)).toBe(false);
  });

  it("announces a walk-through piece too, rather than reasoning about solidity", () => {
    // A cushion blocks nothing, so this bump is redundant — and asking would buy
    // a bounded flood fill with a second rule about when invalidation matters.
    // The wrong version of that rule is invisible until somebody walks through
    // something, so placement does not ask.
    const w = world();
    const before = buildRevision(w);
    expect(placeFurniture(w, 7, 7, "cushion", "s", "undyed")).toBe(true);
    expect(buildRevision(w)).not.toBe(before);
  });
});
