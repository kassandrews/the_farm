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
  CHUNK,
} from "./world";
import { GRASS, DIRT, PLANK, STONE, TREE } from "../content/tiles";

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
