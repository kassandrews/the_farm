// Where a roof's chimney goes. The stack itself is judged on screen; what is
// testable is that the choice is DERIVED from the fire and lands inside the room.
//
// This file used to test a hash — that the pick was stable, and biased to the
// back third. Both properties are gone because the thing they were standing in
// for arrived: the stack sits on the fireplace, so "stable" is trivially true
// and "toward the back" is enforced at placement instead, by the fireplace
// needing a wall behind it (sim/furniture.ts §backs).

import { describe, it, expect } from "vitest";
import { chimneyCell, flagCell } from "./renderer";
import type { Room } from "../sim/rooms";

/** A rectangular room with the given interior extent. */
function room(x0: number, y0: number, w: number, h: number): Room {
  const interior = new Set<string>();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) interior.add(`${x},${y}`);
  return { id: [...interior][0], interior, shell: new Set() };
}

describe("chimneyCell", () => {
  it("gives a room with no fire in it nothing", () => {
    // A chimney on everything says nothing. Size is emphatically NOT the test —
    // it was, for two rules running, and the museum had a chimney both times.
    expect(chimneyCell(room(0, 0, 3, 3), null)).toBeNull();
    expect(chimneyCell(room(0, 0, 12, 12), null)).toBeNull();
  });

  it("puts the stack on the fire", () => {
    // The whole rule. You do not place the chimney, you place the fireplace, and
    // the flue comes out above it.
    const r = room(-3, 7, 6, 4);
    expect(chimneyCell(r, "-1,8")).toBe("-1,8");
    expect(chimneyCell(r, "2,10")).toBe("2,10");
  });

  it("never puts one outside the room", () => {
    // The caller only ever walks its own interior, so this cannot happen from
    // inside the renderer — but the function is exported, and a stack on a cell
    // the roof does not cover is a chimney standing on somebody's lawn.
    const r = room(0, 0, 4, 3);
    expect(chimneyCell(r, "9,9")).toBeNull();
    expect(chimneyCell(r, "-1,0")).toBeNull();
  });

  it("is a total function of the room and the fire", () => {
    // Roofs are derived and never placed (DESIGN §Structures) and nothing about
    // a chimney is stored, so the same room and the same fire have to give the
    // same answer every frame or the stack would wander.
    const a = room(4, -2, 7, 6);
    const b = room(4, -2, 7, 6);
    expect(chimneyCell(a, "6,0")).toBe(chimneyCell(b, "6,0"));
  });
});

// The flag, which is the same shape of question one storey up: derived, from a
// thing in the room that MEANS something, and never placed. The pole and the
// carrot on it are judged on screen; what is testable is the choice.
describe("flagCell", () => {
  it("gives a room with no counter in it nothing", () => {
    // Every building in town has a roof and only one has the town's business on
    // it. This is the museum's lesson from the chimney above, at flag height:
    // a rule that fires on size, or on "is an institution", flies four flags.
    expect(flagCell(room(0, 0, 3, 3), null)).toBeNull();
    expect(flagCell(room(0, 0, 12, 12), null)).toBeNull();
  });

  it("flies it over the middle, not over the desk", () => {
    // The desk decides WHETHER, the roof decides WHERE — unlike the chimney
    // above, and see the docblock for why the two differ. This is the town hall's
    // own geometry: interior x -2..2 with the counter at x -1, one column west of
    // the centreline of the one building in town drawn symmetrically.
    const r = room(-2, -9, 5, 3);
    expect(flagCell(r, "-1,-8")).toBe("0,-8");
  });

  it("still needs the desk to be there at all", () => {
    // The load-bearing half. Carry the counter out of the room and the flag goes
    // with it, or the hall flies one over an empty shell.
    const r = room(-2, -9, 5, 3);
    expect(flagCell(r, null)).toBeNull();
  });

  it("lands on the ridge row of a five-deep building", () => {
    // It is not nudged there: `roofPitch` creases a five-deep roof through the
    // middle row, and the middle row is what a centre is. The hall is five deep
    // (y -10..-6) with a three-row interior, so the crease and the centre are the
    // same row and the pole stands on it for free.
    const r = room(-2, -9, 5, 3);
    expect(flagCell(r, "-2,-9")).toBe("0,-8");
  });

  it("never flies one outside the room", () => {
    // A pole on a cell the roof does not cover is a flag in somebody's garden.
    const r = room(0, 0, 4, 4);
    expect(flagCell(r, "9,9")).toBeNull();
  });

  it("falls back to the desk when the middle is outside an odd room", () => {
    // An L can have its bounding-box centre outside itself. The desk is the
    // fallback because it is the one cell known to be both inside and meaningful.
    const r = room(0, 0, 2, 2);
    r.interior.delete("1,1");
    r.interior.delete("1,0");
    r.interior.delete("0,1");
    // Interior is just "0,0" now, so the middle is trivially inside it.
    expect(flagCell(r, "0,0")).toBe("0,0");

    // A genuine L: cells (0,0), (0,1), (0,2), (1,2), (2,2). Bounding box centre
    // is (1,1), which is the notch and not part of the room.
    const l: typeof r = { id: "0,0", interior: new Set(["0,0", "0,1", "0,2", "1,2", "2,2"]), shell: new Set() };
    expect(flagCell(l, "0,1")).toBe("0,1");
  });
});
