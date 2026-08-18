import { describe, it, expect } from "vitest";
import { newWorld, buildAt, buildCost, loadedFinish } from "./game";
import { setTile, isWalkable, tileKey } from "./world";
import { FLOOR } from "../content/tiles";
import { GRASS } from "../content/tiles";
import { placeStructure, removeStructure, buildRevision } from "./structures";
import {
  placeFurniture,
  removeFurnitureAt,
  furnitureAt,
  canPlaceFurniture,
  cellsFor,
  furnitureBlocks,
  moveFurniture,
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
    expect(placeFurniture(w, 5, 16, "cushion", "s", "undyed")).toBe(true);
    expect(buildRevision(w)).not.toBe(before);
  });
});

describe("a painting hangs on a wall", () => {
  function room() {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 7 });
    w.build = {};
    w.furniture = {};
    for (let x = 0; x <= 4; x++) for (let y = 0; y <= 4; y++) setTile(w, x, y, GRASS);
    // A short south wall with a door in it, and open floor in front.
    placeStructure(w, 1, 2, "wall", "pine");
    placeStructure(w, 2, 2, "door", "pine");
    return w;
  }

  it("goes on a wall cell, which every other piece refuses", () => {
    const w = room();
    expect(canPlaceFurniture(w, 1, 2, "painting", "s")).toBe(true);
    // The inversion, stated as a pair: the same cell is the one place a chair
    // cannot go, and the only place a painting can.
    expect(canPlaceFurniture(w, 1, 2, "chair", "s")).toBe(false);
  });

  it("refuses open floor, which every other piece accepts", () => {
    const w = room();
    expect(canPlaceFurniture(w, 3, 3, "painting", "s")).toBe(false);
    expect(canPlaceFurniture(w, 3, 3, "chair", "s")).toBe(true);
  });

  it("refuses a door — a picture over the doorway is across the way in", () => {
    const w = room();
    expect(canPlaceFurniture(w, 2, 2, "painting", "s")).toBe(false);
  });

  it("will not hang two on the same wall cell", () => {
    const w = room();
    expect(placeFurniture(w, 1, 2, "painting", "s", "pine")).toBe(true);
    expect(canPlaceFurniture(w, 1, 2, "painting", "s")).toBe(false);
  });

  it("leaves the wall doing the blocking, not itself", () => {
    // `solid: false` on the row, deliberately: the wall is what stops you, and a
    // painting that claimed to block would be a second reason for the same fact.
    const w = room();
    placeFurniture(w, 1, 2, "painting", "s", "pine");
    expect(furnitureBlocks(w, 1, 2)).toBe(false);
    expect(isWalkable(w, 1, 2)).toBe(false); // the wall, still
  });
});

describe("a fireplace needs something behind it", () => {
  /** A room: walls round a rectangle, door on the south wall. Interior is the
   *  inside of the given outer bounds. */
  function roomAt(w: ReturnType<typeof world>, x0: number, y0: number, x1: number, y1: number) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
        setTile(w, x, y, FLOOR);
        placeStructure(w, x, y, "wall", "pine");
      }
    }
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) setTile(w, x, y, FLOOR);
    placeStructure(w, x0 + 1, y1, "door", "pine");
  }

  it("goes against the back wall and nowhere else", () => {
    const w = world();
    roomAt(w, 40, 40, 46, 46);
    // Back row: the wall at y=40 is directly north of y=41.
    expect(canPlaceFurniture(w, 42, 41, "fireplace", "s")).toBe(true);
    // One row in, with open floor behind it. A chimney over the middle of a room
    // is a stack standing on nothing.
    expect(canPlaceFurniture(w, 42, 42, "fireplace", "s")).toBe(false);
  });

  it("needs a wall behind BOTH halves, not just its anchor", () => {
    // It is 2x1. Half of it backing onto a wall and half onto open floor is the
    // case a per-anchor check would wave through, and it is the one that looks
    // wrong — a breast with one end in mid-air.
    const w = world();
    roomAt(w, 60, 40, 66, 46);
    // Knock the wall out above the fireplace's east half.
    removeStructure(w, 63, 40);
    expect(canPlaceFurniture(w, 62, 41, "fireplace", "s")).toBe(false);
    // And it is fine one cell west, where both halves still have wall behind.
    expect(canPlaceFurniture(w, 61, 41, "fireplace", "s")).toBe(true);
  });

  it("says WHY, rather than claiming it does not fit", () => {
    // "Won't fit there" is the honest answer for every other piece, and a lie
    // for this one: the cell is empty and the problem is behind it. A refusal
    // that describes the wrong thing reads as the game being broken.
    const w = world();
    roomAt(w, 100, 40, 106, 46);
    w.inventory.stone = 50;
    const mid = buildAt(w, "fireplace", 102, 43, Date.now());
    expect(mid.changed).toBe(false);
    expect(mid.message).toMatch(/wall behind it/);
    const back = buildAt(w, "fireplace", 102, 41, Date.now());
    expect(back.changed).toBe(true);
    // And it cost STONE — the first piece of furniture in the game that does.
    expect(w.inventory.stone).toBe(50 - 8);
  });

  it("will not back onto a doorway or a window", () => {
    // Backing a chimney breast onto the door would stand the tallest solid piece
    // in the game across the one cell you walk through — the painting's rule,
    // one object along. A window is refused for the mirror reason: you would be
    // blocking your own glass.
    const w = world();
    roomAt(w, 80, 40, 86, 46);
    placeStructure(w, 82, 40, "door", "pine");
    expect(canPlaceFurniture(w, 81, 41, "fireplace", "s")).toBe(false);
    placeStructure(w, 82, 40, "window", "pine");
    expect(canPlaceFurniture(w, 81, 41, "fireplace", "s")).toBe(false);
    placeStructure(w, 82, 40, "wall", "pine");
    expect(canPlaceFurniture(w, 81, 41, "fireplace", "s")).toBe(true);
  });
});

// A rug is the floor being nicer, not a thing standing on it (content/furniture.ts
// §floor). These are the rules that makes true: two records, blind to each other,
// each still keeping "one cell, one piece" for itself.
describe("a rug lies under the furniture", () => {
  it("takes a table on top of it, laid first", () => {
    const w = world();
    expect(placeFurniture(w, 20, 20, "rug", "s", "undyed")).toBe(true);
    expect(placeFurniture(w, 20, 20, "table", "s", "pine")).toBe(true);
    expect(w.floor[tileKey(20, 20)]?.id).toBe("rug");
    expect(w.furniture[tileKey(20, 20)]?.id).toBe("table");
  });

  it("goes under a table that was already there", () => {
    const w = world();
    expect(placeFurniture(w, 20, 20, "table", "s", "pine")).toBe(true);
    expect(placeFurniture(w, 20, 20, "rug", "s", "undyed")).toBe(true);
    expect(w.floor[tileKey(20, 20)]?.id).toBe("rug");
  });

  it("still refuses a second rug — each record keeps one cell, one piece", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    // Overlapping, not identical: the anchor is clear and the footprint is not,
    // which is the case a plain key lookup would wave through.
    expect(canPlaceFurniture(w, 21, 21, "rug", "s")).toBe(false);
    expect(placeFurniture(w, 21, 21, "rug", "s", "undyed")).toBe(false);
  });

  it("is never in the standing record, whichever way round it went down", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    expect(w.furniture[tileKey(20, 20)]).toBeUndefined();
    expect(furnitureAt(w, 20, 20)).toBeNull();
  });

  it("erases top down: the table first, then the rug", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    placeFurniture(w, 20, 20, "table", "s", "pine");

    expect(removeFurnitureAt(w, 20, 20)?.id).toBe("table");
    expect(w.floor[tileKey(20, 20)]?.id).toBe("rug"); // carpet stays put
    expect(removeFurnitureAt(w, 20, 20)?.id).toBe("rug");
    expect(w.floor[tileKey(20, 20)]).toBeUndefined();
    expect(removeFurnitureAt(w, 20, 20)).toBeNull();
  });

  it("comes up when you point at any cell of it, not just its anchor", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    expect(removeFurnitureAt(w, 21, 21)?.id).toBe("rug");
  });

  it("holds the ground it covers — no crop laid over, no rug over a crop", () => {
    const w = world();
    w.crops[tileKey(20, 20)] = { id: "turnip", planted: 0, stage: 0, wateredUntil: 0 } as never;
    expect(canPlaceFurniture(w, 20, 20, "rug", "s")).toBe(false);
  });

  it("cannot be laid in the rock", () => {
    const w = world();
    expect(canPlaceFurniture(w, 20, 20, "rug", "s", "under")).toBe(false);
  });
});

// Moving a piece rather than taking it down and putting it back — one verb, so
// there is never a moment where your sofa is in your pockets.
describe("moving a piece that is already placed", () => {
  it("keeps its finish, set and trim, and takes the facing it is given", () => {
    const w = world();
    placeFurniture(w, 20, 20, "chair", "s", "walnut");
    expect(moveFurniture(w, 20, 20, 24, 24, "e")).toBe(true);
    expect(w.furniture[tileKey(20, 20)]).toBeUndefined();
    expect(w.furniture[tileKey(24, 24)]).toMatchObject({
      id: "chair",
      finish: "walnut", // NOT whatever the bar happens to be loaded with
      facing: "e",
    });
  });

  it("can be nudged one tile, onto cells it already occupies", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine"); // multi-tile: overlaps itself
    expect(moveFurniture(w, 20, 20, 21, 20, "s")).toBe(true);
    expect(w.furniture[tileKey(21, 20)]?.id).toBe("bed");
  });

  it("leaves the piece where it was when the destination is taken", () => {
    const w = world();
    placeFurniture(w, 20, 20, "chair", "s", "pine");
    placeFurniture(w, 24, 24, "table", "s", "pine");
    expect(moveFurniture(w, 20, 20, 24, 24, "s")).toBe(false);
    expect(w.furniture[tileKey(20, 20)]?.id).toBe("chair"); // never left
  });

  it("is grabbed by any cell of it, not just its anchor", () => {
    const w = world();
    placeFurniture(w, 20, 20, "bed", "s", "pine");
    const { h, w: bw } = footprint(furnitureDef("bed"), "s");
    expect(moveFurniture(w, 20 + bw - 1, 20 + h - 1, 26, 26, "s")).toBe(true);
    expect(w.furniture[tileKey(26, 26)]?.id).toBe("bed");
  });

  it("moves the rug and not the table when only the rug is there", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    placeFurniture(w, 20, 20, "table", "s", "pine");

    expect(moveFurniture(w, 20, 20, 24, 24, "s")).toBe(true); // top down: the table
    expect(w.furniture[tileKey(24, 24)]?.id).toBe("table");
    expect(w.floor[tileKey(20, 20)]?.id).toBe("rug"); // stayed

    expect(moveFurniture(w, 20, 20, 28, 28, "s")).toBe(true); // now the rug
    expect(w.floor[tileKey(28, 28)]?.id).toBe("rug");
  });

  it("takes the rug from under a table when told which record to look in", () => {
    const w = world();
    placeFurniture(w, 20, 20, "rug", "s", "undyed");
    placeFurniture(w, 20, 20, "table", "s", "pine"); // sitting on the rug's anchor

    // Top down would answer "table" at this cell. The UI resolved the rug on
    // the first tap and says so, which is the whole reason `pick` exists.
    expect(moveFurniture(w, 20, 20, 26, 26, "s", "surface", "laid")).toBe(true);
    expect(w.floor[tileKey(26, 26)]?.id).toBe("rug");
    expect(w.furniture[tileKey(20, 20)]?.id).toBe("table"); // stayed exactly put
  });

  it("costs and refunds nothing", () => {
    const w = world();
    placeFurniture(w, 20, 20, "chair", "s", "pine");
    const before = { ...w.inventory };
    moveFurniture(w, 20, 20, 24, 24, "s");
    expect(w.inventory).toEqual(before);
  });

  it("refuses when there is nothing to pick up", () => {
    const w = world();
    expect(moveFurniture(w, 20, 20, 24, 24, "s")).toBe(false);
  });
});

describe("a sitter stands on the furniture", () => {
  // The desk lamp's row said "the light you put ON something" long before the
  // sim could do it. These are the rules that made the sentence true — see
  // types.ts §atop for the record and content/furniture.ts §sits/§carries for
  // who takes part.

  it("goes into the atop record when placed over a carrier", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine"); // 2x1, carries
    expect(placeFurniture(w, 20, 20, "desklamp", "s", "steel")).toBe(true);
    expect(w.atop[tileKey(20, 20)]?.id).toBe("desklamp");
    // Stored ON the desk, not beside it: the standing record still holds only
    // the desk, at its anchor.
    expect(Object.keys(w.furniture)).toEqual([tileKey(20, 20)]);
  });

  it("stands on the floor like anything else when there is no carrier", () => {
    const w = world();
    expect(placeFurniture(w, 20, 20, "desklamp", "s", "steel")).toBe(true);
    expect(w.furniture[tileKey(20, 20)]?.id).toBe("desklamp");
    expect(w.atop[tileKey(20, 20)]).toBeUndefined();
  });

  it("refuses a surface that is not a carrier, and a surface already taken", () => {
    const w = world();
    placeFurniture(w, 20, 20, "shelf", "s", "pine"); // tall, and NOT a carrier
    expect(canPlaceFurniture(w, 20, 20, "desklamp", "s")).toBe(false);
    placeFurniture(w, 24, 24, "desk", "s", "pine");
    placeFurniture(w, 24, 24, "desklamp", "s", "steel");
    // One cell, one piece — the atop record keeps the invariant of the other two.
    expect(canPlaceFurniture(w, 24, 24, "desklamp", "s")).toBe(false);
    // The desk's other cell is its own surface, so the run holds two.
    expect(canPlaceFurniture(w, 25, 24, "desklamp", "s")).toBe(true);
  });

  it("only a sitter may sit — a chair aimed at a desk still refuses", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine");
    expect(canPlaceFurniture(w, 20, 20, "chair", "s")).toBe(false);
  });

  it("is removed first, top down — the lamp before the desk", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine");
    placeFurniture(w, 20, 20, "desklamp", "s", "steel");
    expect(removeFurnitureAt(w, 20, 20)?.id).toBe("desklamp");
    expect(removeFurnitureAt(w, 20, 20)?.id).toBe("desk");
    expect(removeFurnitureAt(w, 20, 20)).toBeNull();
  });

  it("drops to the floor when the desk is taken out from under it", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine");
    placeFurniture(w, 20, 20, "desklamp", "s", "steel");
    // Point at the desk's EMPTY half: top down finds no sitter there, so the
    // desk comes up — and the lamp lands on the floor where it stood, standing
    // on nothing, which is the honest picture of what just happened.
    expect(removeFurnitureAt(w, 21, 20)?.id).toBe("desk");
    expect(w.atop[tileKey(20, 20)]).toBeUndefined();
    expect(w.furniture[tileKey(20, 20)]?.id).toBe("desklamp");
  });

  it("rides along when its desk is moved, and turns with it", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine");
    placeFurniture(w, 21, 20, "desklamp", "s", "steel"); // the EAST end
    // Moved by its empty half: top down at (20,20) finds no sitter on that
    // cell, so the desk is what the tap resolves — and the lamp goes with it.
    expect(moveFurniture(w, 20, 20, 26, 26, "s")).toBe(true);
    expect(w.furniture[tileKey(26, 26)]?.id).toBe("desk");
    expect(w.atop[tileKey(27, 26)]?.id).toBe("desklamp"); // still the east end
    expect(w.atop[tileKey(21, 20)]).toBeUndefined();
  });

  it("moves between the floor and a surface, switching records both ways", () => {
    const w = world();
    placeFurniture(w, 20, 20, "desk", "s", "pine");
    placeFurniture(w, 24, 24, "desklamp", "s", "steel"); // on the floor
    expect(moveFurniture(w, 24, 24, 20, 20, "s")).toBe(true); // up it goes
    expect(w.atop[tileKey(20, 20)]?.id).toBe("desklamp");
    expect(w.furniture[tileKey(24, 24)]).toBeUndefined();
    expect(moveFurniture(w, 20, 20, 24, 24, "s")).toBe(true); // and back down
    expect(w.furniture[tileKey(24, 24)]?.id).toBe("desklamp");
    expect(w.atop[tileKey(20, 20)]).toBeUndefined();
  });
});
