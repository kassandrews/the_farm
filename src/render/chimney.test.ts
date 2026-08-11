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

  it("flies it over the desk", () => {
    const r = room(-3, -9, 6, 3);
    expect(flagCell(r, "-1,-8")).toBe("-1,-8");
  });

  it("never flies one outside the room", () => {
    // A pole on a cell the roof does not cover is a flag in somebody's garden.
    const r = room(0, 0, 4, 4);
    expect(flagCell(r, "9,9")).toBeNull();
  });
});
