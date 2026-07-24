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
  CHUNK,
} from "./world";
import { GRASS, DIRT, PLANK, STONE } from "../content/tiles";

function freshWorld() {
  return newWorld({ name: "T", form: "dog", spot: "forest", seed: 7 });
}

describe("chunked tilemap edits", () => {
  it("generation is stable and plaza is paved", () => {
    const w = freshWorld();
    // Plaza origin is stone; far grass elsewhere.
    expect(tileAt(w, 0, 0)).toBe(STONE);
    expect(tileAt(w, 40, 40)).toBe(GRASS);
  });

  it("digging turns grass to dirt, and only grass", () => {
    const w = freshWorld();
    expect(dig(w, 40, 40)).toBe(true);
    expect(tileAt(w, 40, 40)).toBe(DIRT);
    // Digging dirt again is a no-op.
    expect(dig(w, 40, 40)).toBe(false);
  });

  it("placing a plank works on non-solid ground", () => {
    const w = freshWorld();
    expect(placePlank(w, 40, 41)).toBe(true);
    expect(tileAt(w, 40, 41)).toBe(PLANK);
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
    const before = baseTileAt(w, 40, 40);
    dig(w, 40, 40);
    expect(tileAt(w, 40, 40)).toBe(DIRT);
    // The chunk itself is untouched — overrides are a separate layer.
    expect(baseTileAt(w, 40, 40)).toBe(before);
  });

  it("writing the generated tile clears the override (no bloat)", () => {
    const w = freshWorld();
    dig(w, 40, 40); // creates an override
    expect(w.overrides[tileKey(40, 40)]).toBe(DIRT);
    setTile(w, 40, 40, GRASS); // back to what generation produces
    expect(w.overrides[tileKey(40, 40)]).toBeUndefined();
    expect(tileAt(w, 40, 40)).toBe(GRASS);
  });
});
