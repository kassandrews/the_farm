import { describe, it, expect } from "vitest";
import { newWorld } from "../sim/game";
import { setTile } from "../sim/world";
import { GRASS } from "../content/tiles";
import { placeStructure } from "../sim/structures";
import { rooms } from "../sim/rooms";
import type { SkinId } from "../content/skins";
import { roofFinish } from "./roof";

function world() {
  // Blank, for the same reason rooms.test.ts blanks it: the town's own
  // buildings are enclosed rooms, and "the only room" would otherwise be
  // whichever of them the fill reached first.
  const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 7 });
  w.build = {};
  w.furniture = {};
  return w;
}

/** A closed rectangular shell. `finishes` maps a cell key to its finish, so a
 *  test can build a house out of two materials; anything unlisted gets
 *  `fallback`. `door` puts a door in the middle of the south wall. */
function shell(
  w: ReturnType<typeof world>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fallback: SkinId,
  opts: { finishes?: Record<string, SkinId>; door?: SkinId } = {},
) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTile(w, x, y, GRASS);
  const doorAt = { x: x0 + 1, y: y1 };
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (opts.door && x === doorAt.x && y === doorAt.y) {
        placeStructure(w, x, y, "door", opts.door);
        continue;
      }
      placeStructure(w, x, y, "wall", opts.finishes?.[`${x},${y}`] ?? fallback);
    }
  }
}

describe("roofFinish", () => {
  it("takes the finish the walls are made of", () => {
    const w = world();
    shell(w, 0, 0, 4, 4, "walnut");
    const list = rooms(w);
    expect(list).toHaveLength(1);
    expect(roofFinish(w, list[0])).toBe("walnut");
  });

  it("is never the default just because the interior has no wall under it", () => {
    // The bug this module exists for. Every roofed building in the game was a
    // rim in the wall's colour around a pale pine middle, because the finish
    // was read per CELL and an interior cell has no build entry to read. A
    // whitewashed shop showed it worst.
    const w = world();
    shell(w, 0, 0, 6, 6, "whitewash");
    const roof = roofFinish(w, rooms(w)[0]);
    expect(roof).toBe("whitewash");
    expect(roof).not.toBe("pine"); // FLOOR_DEFAULT_FINISH, the old fallback
  });

  it("a mixed house gets one roof, in whichever it is mostly made of", () => {
    // A roof is ONE material. The vote settles a half-and-half house rather
    // than whichever wall happens to sit under the cell being drawn.
    const w = world();
    const finishes: Record<string, SkinId> = {};
    for (let x = 0; x <= 6; x++) finishes[`${x},0`] = "oxblood"; // the north wall only
    shell(w, 0, 0, 6, 6, "ash", { finishes });
    // 7 oxblood against 17 ash. NEITHER is pine, deliberately: assert the
    // majority is the default finish and a broken implementation that just
    // returns the fallback passes for the wrong reason.
    expect(roofFinish(w, rooms(w)[0])).toBe("ash");
  });

  it("a door votes with the wall it is set into, not with its own leaf", () => {
    // `shellFinish` resolves a door to its neighbouring wall. Without that a
    // one-door house in a rare finish could tip a small shed's roof.
    const w = world();
    shell(w, 0, 0, 3, 3, "sage", { door: "walnut" });
    expect(roofFinish(w, rooms(w)[0])).toBe("sage");
  });
});
