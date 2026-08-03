import { describe, it, expect } from "vitest";
import { newWorld, moveTo, tick, buildAt } from "./game";
import { isWalkable, setTile, tileKey } from "./world";
import { WATER, DIRT, GRASS } from "../content/tiles";
import {
  placeStructure,
  removeStructure,
  structureAt,
  canPlaceStructure,
  structureBlocks,
  wallMask,
  CONNECT_N,
  CONNECT_E,
  CONNECT_S,
  CONNECT_W,
  doorApproaches,
  blockedDoorsteps,
  shellFinish,
  showsTop,
} from "./structures";
import { placeFurniture } from "./furniture";
import { gather, updateRegrowth } from "./gather";
import { nodeDef } from "../content/nodes";
import { plant } from "./crops";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

/** Clear generated terrain off a tile. The generator scatters solid trees and
 *  rocks by seed, and you genuinely can't build on those until you've felled
 *  them — so a test about walls has to start from open ground on purpose. */
function clear(w: ReturnType<typeof world>, x: number, y: number) {
  setTile(w, x, y, GRASS);
}

describe("the structure layer", () => {
  it("stands separately from the ground it's built on", () => {
    const w = world();
    setTile(w, 20, 20, DIRT);
    placeStructure(w, 20, 20, "wall", "pine");
    // The wall is in `build`; the ground underneath is untouched dirt. A wall
    // needs both layers — that's the reason the layer exists.
    expect(structureAt(w, 20, 20)).toEqual({ id: "wall", finish: "pine" });
    expect(w.overrides[tileKey(20, 20)]).toBe(DIRT);
  });

  it("blocks walking through a wall but not through a door", () => {
    const w = world();
    clear(w, 20, 20);
    clear(w, 21, 20);
    placeStructure(w, 20, 20, "wall", "pine");
    placeStructure(w, 21, 20, "door", "pine");
    expect(isWalkable(w, 20, 20)).toBe(false);
    expect(structureBlocks(w, 20, 20)).toBe(true);
    // A door is a hole you can walk through — the whole reason it's its own row.
    expect(isWalkable(w, 21, 20)).toBe(true);
    expect(structureBlocks(w, 21, 20)).toBe(false);
  });

  it("refuses to build on water or over a planted crop", () => {
    const w = world();
    setTile(w, 30, 30, WATER);
    expect(canPlaceStructure(w, 30, 30)).toBe(false);
    expect(placeStructure(w, 30, 30, "wall", "pine")).toBe(false);

    clear(w, 31, 31);
    plant(w, 31, 31, "carrot", Date.now());
    expect(canPlaceStructure(w, 31, 31)).toBe(false);
  });

  it("lets a door be cut into an existing wall, but not repainted for free twice", () => {
    const w = world();
    clear(w, 20, 20);
    expect(placeStructure(w, 20, 20, "wall", "pine")).toBe(true);
    // Painting the identical piece again is a no-op, so drag-painting across a
    // wall you already built doesn't charge you for it a second time.
    expect(placeStructure(w, 20, 20, "wall", "pine")).toBe(false);
    // Cutting a doorway through it is a real change.
    expect(placeStructure(w, 20, 20, "door", "pine")).toBe(true);
    expect(structureAt(w, 20, 20)?.id).toBe("door");
  });

  it("gives back what was standing there when removed", () => {
    const w = world();
    clear(w, 20, 20);
    placeStructure(w, 20, 20, "wall", "ash");
    expect(removeStructure(w, 20, 20)).toEqual({ id: "wall", finish: "ash" });
    expect(structureAt(w, 20, 20)).toBeNull();
    expect(removeStructure(w, 20, 20)).toBeNull();
  });

  it("stores the finish per cell, so two houses can differ", () => {
    const w = world();
    clear(w, 20, 20);
    clear(w, 40, 40);
    placeStructure(w, 20, 20, "wall", "pine");
    placeStructure(w, 40, 40, "wall", "walnut");
    // The Ghost's dark house and the Menace's pale one have to coexist in one
    // town; a town-wide selection couldn't express that.
    expect(structureAt(w, 20, 20)?.finish).toBe("pine");
    expect(structureAt(w, 40, 40)?.finish).toBe("walnut");
  });
});

describe("wall autotiling", () => {
  it("reports no connections for a lone wall", () => {
    const w = world();
    clear(w, 20, 20);
    placeStructure(w, 20, 20, "wall", "pine");
    expect(wallMask(w, 20, 20)).toBe(0);
  });

  it("connects on the sides that have wall-run pieces", () => {
    const w = world();
    for (const [x, y] of [[20, 20], [20, 19], [21, 20]]) clear(w, x, y);
    placeStructure(w, 20, 20, "wall", "pine");
    placeStructure(w, 20, 19, "wall", "pine"); // north
    placeStructure(w, 21, 20, "wall", "pine"); // east
    const mask = wallMask(w, 20, 20);
    expect(mask & CONNECT_N).toBeTruthy();
    expect(mask & CONNECT_E).toBeTruthy();
    expect(mask & CONNECT_S).toBeFalsy();
    expect(mask & CONNECT_W).toBeFalsy();
  });

  it("treats a door as part of the run", () => {
    const w = world();
    clear(w, 20, 20);
    clear(w, 19, 20);
    placeStructure(w, 20, 20, "wall", "pine");
    placeStructure(w, 19, 20, "door", "pine");
    // A doorway mid-wall should leave the wall reading as one continuous line
    // with a hole in it, not two walls that happen to be adjacent.
    expect(wallMask(w, 20, 20) & CONNECT_W).toBeTruthy();
  });
});

describe("building claims the ground", () => {
  it("stops a felled tree regrowing under a wall", () => {
    const w = world();
    // Find a tree the generator actually placed, and fell it.
    let spot: { x: number; y: number } | null = null;
    for (let y = 10; y < 40 && !spot; y++) {
      for (let x = 10; x < 40; x++) {
        if (gather(w, x, y, 1000)) {
          spot = { x, y };
          break;
        }
      }
    }
    expect(spot).not.toBeNull();
    const { x, y } = spot!;
    expect(w.regrow[tileKey(x, y)]).toBeDefined();

    // A wall stands on dirt and leaves the dirt dirt, so a claim check that
    // only looked at the ground tile would let the tree come back inside the
    // house. Building has to count as claiming.
    placeStructure(w, x, y, "wall", "pine");
    const wellPast = 1000 + nodeDef("tree").regrowMs! + nodeDef("rock").regrowMs! + 1;
    updateRegrowth(w, wellPast);
    expect(w.regrow[tileKey(x, y)]).toBeUndefined();
    expect(structureAt(w, x, y)).not.toBeNull();
  });

  it("still lets the woods return to ground you left bare", () => {
    const w = world();
    let spot: { x: number; y: number } | null = null;
    for (let y = 10; y < 40 && !spot; y++) {
      for (let x = 10; x < 40; x++) {
        if (gather(w, x, y, 1000)) {
          spot = { x, y };
          break;
        }
      }
    }
    const { x, y } = spot!;
    setTile(w, x, y, GRASS); // bare, unclaimed
    updateRegrowth(w, 1000 + nodeDef("tree").regrowMs! + nodeDef("rock").regrowMs! + 1);
    expect(w.regrow[tileKey(x, y)]).toBeUndefined();
    expect(structureAt(w, x, y)).toBeNull();
  });
});

describe("walls stop you", () => {
  it("blocks a walk that would cross a wall, instead of passing through it", () => {
    const w = world();
    for (let y = 18; y <= 24; y++) for (let x = 18; x <= 24; x++) clear(w, x, y);
    w.player.x = 21;
    w.player.y = 23;
    for (let x = 19; x <= 23; x++) placeStructure(w, x, 21, "wall", "pine");

    // Aim for open ground on the far side of the wall.
    moveTo(w, 21, 19);
    for (let i = 0; i < 400; i++) tick(w, 1 / 60, 1000);

    // Only the destination tile used to be checked, so the straight-line walk
    // sailed through. The wall must actually be in the way.
    expect(w.player.y).toBeGreaterThan(21);
  });

  it("still lets you through a doorway", () => {
    const w = world();
    for (let y = 18; y <= 24; y++) for (let x = 18; x <= 24; x++) clear(w, x, y);
    w.player.x = 21;
    w.player.y = 23;
    for (let x = 19; x <= 23; x++) placeStructure(w, x, 21, "wall", "pine");
    placeStructure(w, 21, 21, "door", "pine");

    moveTo(w, 21, 19);
    for (let i = 0; i < 400; i++) tick(w, 1 / 60, 1000);
    expect(w.player.y).toBeCloseTo(19, 1);
  });
});

describe("you cannot build yourself into a solid tile", () => {
  /** Open ground under your feet, and enough stuff to build with. */
  function standing(x: number, y: number) {
    const w = world();
    for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) clear(w, i, j);
    w.player.x = x;
    w.player.y = y;
    w.inventory.wood = 500;
    w.inventory.stone = 500;
    return w;
  }

  it("refuses a wall on the tile you are standing on", () => {
    const w = standing(21, 21);
    const before = w.inventory.wood;

    const r = buildAt(w, "wall", 21, 21, 1000);

    // Nothing placed, nothing charged, and it says so rather than failing mute.
    expect(r.changed).toBe(false);
    expect(r.message).toMatch(/standing/i);
    expect(structureAt(w, 21, 21)).toBeNull();
    expect(w.inventory.wood).toBe(before);
    expect(isWalkable(w, 21, 21)).toBe(true);
  });

  it("refuses solid furniture on the tile you are standing on", () => {
    const w = standing(21, 21);
    expect(buildAt(w, "table", 21, 21, 1000).changed).toBe(false);
    expect(isWalkable(w, 21, 21)).toBe(true);
  });

  it("still lets you lay a floor under your own feet", () => {
    // The guard asks the PIECE whether it is solid, not the tool's category —
    // a floor goes down underfoot constantly and must keep doing so, or the fix
    // costs more than the bug did.
    const w = standing(21, 21);
    expect(buildAt(w, "floor", 21, 21, 1000).changed).toBe(true);
    expect(isWalkable(w, 21, 21)).toBe(true);
  });

  it("still lets you build a wall on the tile in front of you", () => {
    const w = standing(21, 21);
    expect(buildAt(w, "wall", 21, 20, 1000).changed).toBe(true);
  });
});

describe("doorsteps", () => {
  /** A house with its door in the south wall, on cleared ground. */
  function house(w: ReturnType<typeof world>) {
    for (let y = 18; y <= 24; y++) for (let x = 18; x <= 24; x++) clear(w, x, y);
    for (let x = 19; x <= 23; x++) {
      placeStructure(w, x, 19, "wall", "pine");
      placeStructure(w, x, 23, "wall", "pine");
    }
    for (let y = 20; y <= 22; y++) {
      placeStructure(w, 19, y, "wall", "pine");
      placeStructure(w, 23, y, "wall", "pine");
    }
    placeStructure(w, 21, 23, "door", "pine");
  }

  it("knows a door is entered across its run, not along it", () => {
    const w = world();
    house(w);
    // The south door is approached from north and south. Its east and west
    // neighbours are its own wall run — stepping sideways out of a doorway is
    // not a way in, which is the whole reason one blocked cell seals a house.
    expect(doorApproaches(w, 21, 23)).toEqual([
      { x: 21, y: 22 },
      { x: 21, y: 24 },
    ]);
  });

  it("turns with the wall: a side door is approached east and west", () => {
    const w = world();
    house(w);
    placeStructure(w, 23, 21, "door", "pine");
    expect(doorApproaches(w, 23, 21)).toEqual([
      { x: 22, y: 21 },
      { x: 24, y: 21 },
    ]);
  });

  it("says nothing about a doorway with both steps clear", () => {
    const w = world();
    house(w);
    expect(blockedDoorsteps(w, 21, 23)).toEqual([]);
  });

  it("catches the one tree that seals a building", () => {
    const w = world();
    house(w);
    setTile(w, 21, 24, WATER); // any solid tile: a tree lands here the same way
    expect(blockedDoorsteps(w, 21, 23)).toEqual([{ x: 21, y: 24 }]);
  });

  it("counts furniture, because a table across a threshold seals it too", () => {
    const w = world();
    house(w);
    // Inside the doorway rather than outside it — a door you can't get OUT of
    // is as sealed as one you can't get into, and the villager who can't path
    // home snaps there looking perfectly normal either way.
    placeFurniture(w, 21, 22, "table", "s", "pine");
    expect(blockedDoorsteps(w, 21, 23)).toEqual([{ x: 21, y: 22 }]);
  });

  it("has no opinion about anything that isn't a door", () => {
    const w = world();
    house(w);
    expect(doorApproaches(w, 20, 23)).toBeNull();
    expect(blockedDoorsteps(w, 20, 23)).toEqual([]);
  });
});

describe("what a door's shell is built from", () => {
  // content/structures.ts says of the stone finishes: "they reach the wall it
  // sits in; they stop at the door itself." Nothing implemented it, so a
  // doorway in a granite wall drew its own lintel and both jambs in pine and
  // every stone house had a plank of timber let into it at the front door.
  it("takes the finish of the wall it is cut into, not its own", () => {
    const w = world();
    for (let x = 19; x <= 22; x++) clear(w, x, 20);
    placeStructure(w, 19, 20, "wall", "granite");
    placeStructure(w, 20, 20, "wall", "granite");
    // The door is wood BY CONSTRUCTION — door.finishes is ["wood"], so this is
    // the ordinary case and not a contrived one.
    placeStructure(w, 21, 20, "door", "pine");
    placeStructure(w, 22, 20, "wall", "granite");
    expect(shellFinish(w, 21, 20)).toBe("granite");
    // The door itself still knows what it is made of — the frame is drawn in it.
    expect(structureAt(w, 21, 20)!.finish).toBe("pine");
  });

  it("leaves a plain wall wearing its own finish", () => {
    const w = world();
    clear(w, 20, 20);
    placeStructure(w, 20, 20, "wall", "slate");
    expect(shellFinish(w, 20, 20)).toBe("slate");
  });

  it("falls back to its own finish for a door with no wall to belong to", () => {
    const w = world();
    clear(w, 20, 20);
    placeStructure(w, 20, 20, "door", "walnut");
    expect(shellFinish(w, 20, 20)).toBe("walnut");
  });

  it("is null where nothing is built", () => {
    expect(shellFinish(world(), 20, 20)).toBe(null);
  });
});

describe("which face of a wall you see", () => {
  /** A closed rectangle of wall, so every corner and every run exists. */
  function box(x0: number, y0: number, w: number, h: number) {
    const wd = world();
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (x !== x0 && x !== x0 + w - 1 && y !== y0 && y !== y0 + h - 1) continue;
        clear(wd, x, y);
        placeStructure(wd, x, y, "wall", "pine");
      }
    return wd;
  }

  // A wall shows its top exactly when something stands in front of it — to the
  // south. The rule was `N && S`, which is right in the middle of a side run and
  // wrong at a corner: the north-west corner drew a FACE, so the back wall's
  // surface carried across both corners and the solid side walls stopped short
  // of it instead of running up to meet it.
  it("shows its top wherever a wall stands to the south", () => {
    const w = box(20, 20, 5, 5);
    const at = (x: number, y: number) => showsTop(wallMask(w, x, y));
    expect(at(20, 20)).toBe(true); // north-west corner — the reported bug
    expect(at(24, 20)).toBe(true); // north-east corner
    expect(at(20, 22)).toBe(true); // middle of the west run
    expect(at(24, 22)).toBe(true); // middle of the east run
  });

  it("shows its face on every wall you look straight at", () => {
    const w = box(20, 20, 5, 5);
    const at = (x: number, y: number) => showsTop(wallMask(w, x, y));
    expect(at(22, 20)).toBe(false); // middle of the back wall
    expect(at(22, 24)).toBe(false); // middle of the front wall
    // The front corners are the check that this is the right rule and not just
    // a looser one — the front of a house is a thing you look at, corners too.
    expect(at(20, 24)).toBe(false);
    expect(at(24, 24)).toBe(false);
  });

  it("shows its face on a wall standing alone", () => {
    const w = world();
    clear(w, 20, 20);
    placeStructure(w, 20, 20, "wall", "pine");
    expect(showsTop(wallMask(w, 20, 20))).toBe(false);
  });
});
