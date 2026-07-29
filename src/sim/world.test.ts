import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import {
  dig,
  placePlank,
  tileAt,
  setTile,
  tileKey,
  generatedTile,
  baseTileAt,
  getChunk,
  chunkCoordOf,
  residentChunkCount,
  isWalkable,
  carve,
  canCarve,
  canSink,
  sink,
  fillShaft,
  shafts,
  depthAt,
  CHUNK,
} from "./world";
import {
  GRASS,
  DIRT,
  PLANK,
  STONE,
  TREE,
  BEDROCK,
  CAVE_FLOOR,
  ORE_VEIN,
  SHAFT,
} from "../content/tiles";

function freshWorld() {
  return newWorld({ name: "T", form: "dog", spot: "forest", seed: 7 });
}

/** A plain grass tile out past the town. Found rather than hardcoded: resource
 *  nodes now generate across the map, so any fixed coordinate is a coin flip. */
function findGrass(w: ReturnType<typeof newWorld>): { x: number; y: number } {
  for (let y = 20; y < 80; y++) {
    for (let x = 20; x < 80; x++) {
      if (tileAt(w, x, y) === GRASS) return { x, y };
    }
  }
  throw new Error("no grass found");
}

describe("chunked tilemap edits", () => {
  it("generation is stable and plaza is paved", () => {
    const w = freshWorld();
    // The plaza is paved, and generation is a pure function of (seed, spot) —
    // asserting a specific far tile is grass would just be asserting where the
    // forest happens to fall, so check stability instead.
    expect(tileAt(w, 0, 0)).toBe(STONE);
    const again = freshWorld();
    for (let i = 20; i < 40; i++) {
      expect(tileAt(w, i, i)).toBe(tileAt(again, i, i));
    }
  });

  it("digging turns grass to dirt, and only grass", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    expect(dig(w, x, y)).toBe(true);
    expect(tileAt(w, x, y)).toBe(DIRT);
    // Digging dirt again is a no-op.
    expect(dig(w, x, y)).toBe(false);
  });

  it("placing a plank works on non-solid ground", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    expect(placePlank(w, x, y)).toBe(true);
    expect(tileAt(w, x, y)).toBe(PLANK);
  });

  it("refuses to place on a solid tile (a tree is a real obstacle)", () => {
    const w = freshWorld();
    let tree: { x: number; y: number } | null = null;
    for (let y = 20; y < 80 && !tree; y++) {
      for (let x = 20; x < 80 && !tree; x++) {
        if (tileAt(w, x, y) === TREE) tree = { x, y };
      }
    }
    expect(tree).not.toBeNull();
    expect(placePlank(w, tree!.x, tree!.y)).toBe(false);
    expect(isWalkable(w, tree!.x, tree!.y)).toBe(false);
  });

  it("chunked reads match per-tile generation, including across the origin", () => {
    const w = freshWorld();
    // Span both sides of x=0 and y=0 — floor division is the easy thing to get
    // wrong, and the town straddles the origin.
    for (let y = -CHUNK - 3; y <= CHUNK + 3; y += 5) {
      for (let x = -CHUNK - 3; x <= CHUNK + 3; x += 5) {
        expect(baseTileAt(w, x, y)).toBe(generatedTile(w.seed, w.homestead.spot, x, y));
      }
    }
  });

  it("maps tiles to the chunk that contains them", () => {
    expect(chunkCoordOf(0, 0)).toEqual({ cx: 0, cy: 0 });
    expect(chunkCoordOf(CHUNK - 1, CHUNK - 1)).toEqual({ cx: 0, cy: 0 });
    expect(chunkCoordOf(CHUNK, CHUNK)).toEqual({ cx: 1, cy: 1 });
    expect(chunkCoordOf(-1, -1)).toEqual({ cx: -1, cy: -1 });
    expect(chunkCoordOf(-CHUNK, -CHUNK)).toEqual({ cx: -1, cy: -1 });
  });

  it("generates chunks lazily and caches them", () => {
    const w = freshWorld();
    expect(residentChunkCount(w)).toBe(0); // nothing generated until touched
    const a = getChunk(w, 3, 4);
    expect(residentChunkCount(w)).toBe(1);
    expect(getChunk(w, 3, 4)).toBe(a); // same instance — cached, not rebuilt
    getChunk(w, 99, -99); // a far-flung chunk is fine: no fixed world size
    expect(residentChunkCount(w)).toBe(2);
    expect(a.length).toBe(CHUNK * CHUNK);
  });

  it("an edit wins over the generated chunk beneath it", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    const before = baseTileAt(w, x, y);
    dig(w, x, y);
    expect(tileAt(w, x, y)).toBe(DIRT);
    // The chunk itself is untouched — overrides are a separate layer.
    expect(baseTileAt(w, x, y)).toBe(before);
  });

  it("writing the generated tile clears the override (no bloat)", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    dig(w, x, y); // creates an override
    expect(w.overrides[tileKey(x, y)]).toBe(DIRT);
    setTile(w, x, y, GRASS); // back to what generation produces
    expect(w.overrides[tileKey(x, y)]).toBeUndefined();
    expect(tileAt(w, x, y)).toBe(GRASS);
  });
});

describe("the underground layer", () => {
  it("is solid rock everywhere until you cut it", () => {
    // The inverse of the surface, and the reason `under` starts empty: down
    // there generation hands you nothing and every open cell is one you made.
    const w = freshWorld();
    let open = 0;
    for (let y = -20; y < 20; y++) {
      for (let x = -20; x < 20; x++) {
        if (isWalkable(w, x, y, "under")) open++;
      }
    }
    expect(open).toBe(0);
  });

  it("keeps the two layers' edits apart at the same coordinate", () => {
    const w = freshWorld();
    const g = findGrass(w);
    carve(w, g.x, g.y);
    expect(tileAt(w, g.x, g.y, "under")).toBe(CAVE_FLOOR);
    expect(tileAt(w, g.x, g.y)).toBe(GRASS); // the ground above is untouched
    dig(w, g.x, g.y);
    expect(tileAt(w, g.x, g.y)).toBe(DIRT);
    expect(tileAt(w, g.x, g.y, "under")).toBe(CAVE_FLOOR);
  });

  it("generates the same rock for a seed regardless of homestead spot", () => {
    // The surface shapes itself around where you settled; the rock does not, or
    // two towns from one seed would disagree about where the ore is.
    const a = newWorld({ name: "A", form: "dog", spot: "forest", seed: 12 });
    const b = newWorld({ name: "B", form: "dog", spot: "hilltop", seed: 12 });
    for (let x = 0; x < 40; x++) {
      expect(tileAt(a, x, 3, "under")).toBe(tileAt(b, x, 3, "under"));
    }
  });

  it("has ore veins in the rock, and they are solid until gathered", () => {
    const w = freshWorld();
    let veins = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) if (tileAt(w, x, y, "under") === ORE_VEIN) veins++;
    }
    expect(veins).toBeGreaterThan(0);
    expect(veins).toBeLessThan(1600 / 4); // scattered, never a wall of ore
  });

  it("won't let the shovel take a vein — that's gathering, not carving", () => {
    const w = freshWorld();
    let vein: { x: number; y: number } | null = null;
    for (let y = 0; y < 40 && !vein; y++) {
      for (let x = 0; x < 40 && !vein; x++) {
        if (tileAt(w, x, y, "under") === ORE_VEIN) vein = { x, y };
      }
    }
    expect(vein).not.toBeNull();
    expect(canCarve(w, vein!.x, vein!.y)).toBe(false);
    expect(carve(w, vein!.x, vein!.y)).toBe(false);
    expect(tileAt(w, vein!.x, vein!.y, "under")).toBe(ORE_VEIN);
  });

  it("carves free, and a carved cell is walkable", () => {
    const w = freshWorld();
    const spot = { x: 30, y: 30 };
    setTile(w, spot.x, spot.y, BEDROCK, "under"); // ensure it's rock, not a vein
    expect(carve(w, spot.x, spot.y)).toBe(true);
    expect(isWalkable(w, spot.x, spot.y, "under")).toBe(true);
    expect(carve(w, spot.x, spot.y)).toBe(false); // already open
  });

  it("ignores walls and furniture above when walking underground", () => {
    // A tunnel can't be blocked by someone's bed on the ground overhead.
    const w = freshWorld();
    const spot = { x: 31, y: 31 };
    setTile(w, spot.x, spot.y, BEDROCK, "under");
    carve(w, spot.x, spot.y);
    w.build[tileKey(spot.x, spot.y)] = { id: "wall", finish: "pine" };
    expect(isWalkable(w, spot.x, spot.y)).toBe(false);
    expect(isWalkable(w, spot.x, spot.y, "under")).toBe(true);
  });
});

describe("depth is distance from your own shaft", () => {
  it("is Infinity in a town that has never dug down", () => {
    const w = freshWorld();
    expect(shafts(w)).toEqual([]);
    expect(depthAt(w, 0, 0)).toBe(Infinity);
  });

  it("measures from the NEAREST shaft", () => {
    const w = freshWorld();
    setTile(w, 0, 0, SHAFT);
    setTile(w, 40, 0, SHAFT);
    expect(depthAt(w, 5, 0)).toBe(5);
    expect(depthAt(w, 38, 0)).toBe(2);
    expect(depthAt(w, 20, 0)).toBe(20);
  });

  it("counts a diagonal as one, the way the tunnel reads", () => {
    const w = freshWorld();
    setTile(w, 0, 0, SHAFT);
    expect(depthAt(w, 3, 3)).toBe(3);
  });

  it("a new shaft makes ground SHALLOWER, never deeper", () => {
    // The whole reason depth is measured this way: there must be no route to
    // the deep end that skips the tunnelling. Sinking a hole next to somewhere
    // remote spoils it rather than unlocking it.
    const w = freshWorld();
    setTile(w, 0, 0, SHAFT);
    const before = depthAt(w, 60, 60);
    setTile(w, 58, 58, SHAFT);
    expect(depthAt(w, 60, 60)).toBeLessThan(before);
  });

  it("forgets a shaft that was filled in", () => {
    // shafts() derives from the tiles rather than a parallel list, so undo,
    // migration and the away sim can't leave a ghost entrance behind.
    const w = freshWorld();
    setTile(w, 0, 0, SHAFT);
    expect(depthAt(w, 4, 0)).toBe(4);
    setTile(w, 0, 0, DIRT);
    expect(depthAt(w, 4, 0)).toBe(Infinity);
  });
});

describe("sinking a shaft", () => {
  /** Dig a tile the way the player does, so the second dig has real dirt under
   *  it rather than a hand-written override. */
  function dugTile(w: ReturnType<typeof newWorld>) {
    const g = findGrass(w);
    dig(w, g.x, g.y);
    return g;
  }

  it("takes two digs — grass, then the same tile again", () => {
    const w = freshWorld();
    const g = findGrass(w);
    expect(canSink(w, g.x, g.y)).toBe(false); // grass is a dig, not a shaft
    dig(w, g.x, g.y);
    expect(canSink(w, g.x, g.y)).toBe(true);
    expect(sink(w, g.x, g.y)).toBe(true);
    expect(tileAt(w, g.x, g.y)).toBe(SHAFT);
  });

  it("cuts the rock underneath, so there is somewhere to land", () => {
    const w = freshWorld();
    const g = dugTile(w);
    expect(isWalkable(w, g.x, g.y, "under")).toBe(false); // solid before
    sink(w, g.x, g.y);
    expect(tileAt(w, g.x, g.y, "under")).toBe(CAVE_FLOOR);
    expect(isWalkable(w, g.x, g.y, "under")).toBe(true);
  });

  it("refuses to swallow a crop, a built cell, or furniture", () => {
    // Unlike a dig, a shaft is not cheap to redo — so it never destroys
    // something that was placed on purpose.
    const w = freshWorld();
    const a = dugTile(w);
    w.crops[tileKey(a.x, a.y)] = { cropId: "carrot" } as never;
    expect(canSink(w, a.x, a.y)).toBe(false);

    const b = dugTile(w);
    w.build[tileKey(b.x, b.y)] = { id: "wall", finish: "pine" };
    expect(canSink(w, b.x, b.y)).toBe(false);
  });

  it("can be filled back in, and the tunnel below survives it", () => {
    // ACT has no undo, so filling in is what makes a mis-tap recoverable. It
    // closes the lid; it does not collapse what you dug.
    const w = freshWorld();
    const g = dugTile(w);
    sink(w, g.x, g.y);
    expect(fillShaft(w, g.x, g.y)).toBe(true);
    expect(tileAt(w, g.x, g.y)).toBe(DIRT);
    expect(tileAt(w, g.x, g.y, "under")).toBe(CAVE_FLOOR);
    expect(fillShaft(w, g.x, g.y)).toBe(false); // nothing left to fill
  });

  it("is a shaft for depth purposes only while it's open", () => {
    const w = freshWorld();
    const g = dugTile(w);
    sink(w, g.x, g.y);
    expect(depthAt(w, g.x + 3, g.y)).toBe(3);
    fillShaft(w, g.x, g.y);
    expect(depthAt(w, g.x + 3, g.y)).toBe(Infinity);
  });
});
