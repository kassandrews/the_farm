import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { dig, placePlank, tileAt, setTile, tileKey } from "./world";
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

  it("writing the generated tile clears the override (no bloat)", () => {
    const w = freshWorld();
    dig(w, 40, 40); // creates an override
    expect(w.overrides[tileKey(40, 40)]).toBe(DIRT);
    setTile(w, 40, 40, GRASS); // back to what generation produces
    expect(w.overrides[tileKey(40, 40)]).toBeUndefined();
    expect(tileAt(w, 40, 40)).toBe(GRASS);
  });
});
