import { describe, it, expect } from "vitest";
import { newWorld, buildAt } from "./game";
import { setTile } from "./world";
import { GRASS } from "../content/tiles";
import { placeStructure, removeStructure } from "./structures";
import { rooms, roomAt, roofRoomAt, findRoom, MAX_ROOM } from "./rooms";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "hilltop", seed: 7 });
}

/** Lay a rectangular wall shell, clearing generated terrain first. Returns the
 *  interior bounds. `gap` omits one south-wall cell, leaving the shell open. */
function shell(
  w: ReturnType<typeof world>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: { gap?: boolean; door?: boolean } = {},
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setTile(w, x, y, GRASS);
  }
  const gapAt = { x: x0 + 1, y: y1 };
  for (let x = x0; x <= x1; x++) {
    for (const y of [y0, y1]) {
      if (opts.gap && x === gapAt.x && y === gapAt.y) continue;
      if (opts.door && x === gapAt.x && y === gapAt.y) {
        placeStructure(w, x, y, "door", "pine");
        continue;
      }
      placeStructure(w, x, y, "wall", "pine");
    }
  }
  for (let y = y0 + 1; y < y1; y++) {
    placeStructure(w, x0, y, "wall", "pine");
    placeStructure(w, x1, y, "wall", "pine");
  }
}

describe("enclosed rooms", () => {
  it("finds the inside of a closed shell", () => {
    const w = world();
    shell(w, 20, 20, 25, 24); // 6x5 outline → 4x3 interior
    const found = rooms(w);
    expect(found).toHaveLength(1);
    expect(found[0].interior.size).toBe(4 * 3);
    expect(roomAt(w, 22, 22)).not.toBeNull();
  });

  it("reports nothing while a gap remains", () => {
    const w = world();
    shell(w, 20, 20, 25, 24, { gap: true });
    // The fill escapes through the hole and runs out of budget — that IS the
    // "not enclosed yet" answer, and it's what makes closing the gap a beat.
    expect(rooms(w)).toHaveLength(0);
    expect(roomAt(w, 22, 22)).toBeNull();
  });

  it("counts a door as sealing the room", () => {
    const w = world();
    shell(w, 20, 20, 25, 24, { door: true });
    // You can walk through it, but a house that leaked at its own front door
    // would never get a roof.
    expect(rooms(w)).toHaveLength(1);
    expect(rooms(w)[0].interior.size).toBe(4 * 3);
  });

  it("opens back up when a wall comes down", () => {
    const w = world();
    shell(w, 20, 20, 25, 24);
    expect(rooms(w)).toHaveLength(1);
    removeStructure(w, 22, 24);
    expect(rooms(w)).toHaveLength(0); // cache follows the edit
  });

  it("roofs the shell as well as the interior", () => {
    const w = world();
    shell(w, 20, 20, 25, 24);
    // A roof that stops at the inside face of its own walls reads as a lid.
    expect(roofRoomAt(w, 22, 22)).not.toBeNull(); // interior
    expect(roofRoomAt(w, 20, 20)).not.toBeNull(); // corner wall
    expect(roofRoomAt(w, 19, 19)).toBeNull(); // outside
  });

  it("keeps a stable id across recomputes so fades don't restart", () => {
    const w = world();
    shell(w, 20, 20, 25, 24);
    const before = rooms(w)[0].id;
    placeStructure(w, 30, 30, "wall", "pine"); // unrelated edit, forces recompute
    expect(rooms(w)[0].id).toBe(before);
  });

  it("refuses to call the whole outdoors a room", () => {
    const w = world();
    setTile(w, 40, 40, GRASS);
    placeStructure(w, 40, 40, "wall", "pine"); // one lonely wall
    expect(rooms(w)).toHaveLength(0);
    expect(findRoom(w, 41, 40)).toBeNull();
  });

  it("gives up rather than filling forever on open ground", () => {
    const w = world();
    // No budget and this walks to the horizon; the budget is what makes the
    // miss case cheap as well as correct.
    const room = findRoom(w, 200, 200);
    expect(room).toBeNull();
  });

  it("recognises a room right up to the budget, and not past it", () => {
    const w = world();
    const side = 12; // 12x12 interior = 144 cells, comfortably inside MAX_ROOM
    shell(w, 60, 60, 60 + side + 1, 60 + side + 1);
    const found = rooms(w);
    expect(found).toHaveLength(1);
    expect(found[0].interior.size).toBe(side * side);
    expect(found[0].interior.size).toBeLessThan(MAX_ROOM);
  });
});

describe("the roof arrives on its own", () => {
  it("announces itself when the last gap closes, and only then", () => {
    const w = world();
    w.inventory.wood = 500;
    // A ring with one wall missing from the north side — a real hole, not a
    // corner (corners don't leak under four-connected filling).
    for (let y = 39; y <= 46; y++) for (let x = 39; x <= 46; x++) setTile(w, x, y, GRASS);
    const gap = { x: 42, y: 40 };
    for (let x = 40; x <= 45; x++) {
      for (const y of [40, 45]) {
        if (x === gap.x && y === gap.y) continue;
        placeStructure(w, x, y, "wall", "pine");
      }
    }
    for (let y = 41; y < 45; y++) {
      placeStructure(w, 40, y, "wall", "pine");
      placeStructure(w, 45, y, "wall", "pine");
    }
    expect(rooms(w)).toHaveLength(0);

    const closing = buildAt(w, "wall", gap.x, gap.y, 1000);
    expect(closing.changed).toBe(true);
    expect(closing.message).toContain("roof");
    expect(rooms(w)).toHaveLength(1);

    // A wall that closes nothing gets no fanfare — the beat has to stay rare.
    const ordinary = buildAt(w, "wall", 48, 48, 1000);
    expect(ordinary.changed).toBe(true);
    expect(ordinary.message).not.toContain("roof");
  });
});
