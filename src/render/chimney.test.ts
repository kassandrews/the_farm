// Where a roof's chimney goes. The stack itself is judged on screen; what is
// testable is that the CHOICE is derived, stable, and lands somewhere a chimney
// can stand.

import { describe, it, expect } from "vitest";
import { chimneyCell } from "./renderer";
import type { Room } from "../sim/rooms";

/** A rectangular room with the given interior extent. */
function room(x0: number, y0: number, w: number, h: number): Room {
  const interior = new Set<string>();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) interior.add(`${x},${y}`);
  return { id: [...interior][0], interior, shell: new Set() };
}

describe("chimneyCell", () => {
  it("gives a room nobody sleeps in nothing", () => {
    // A chimney on everything says nothing; the point of one is that somebody
    // lives under it. Size is NOT the test and deliberately so — the town's
    // museum, shop, salvage shed and barn all cleared the old twelve-cell floor,
    // so every building in town had a stack.
    expect(chimneyCell(room(0, 0, 3, 3), false)).toBeNull();
    expect(chimneyCell(room(0, 0, 12, 12), false)).toBeNull();
  });

  it("gives a room with a bed in it one", () => {
    expect(chimneyCell(room(0, 0, 5, 4), true)).not.toBeNull();
    // And a SMALL one, which is the half of the change the old rule got wrong in
    // the other direction: a one-room cabin with a bed in it is a home.
    expect(chimneyCell(room(0, 0, 2, 2), true)).not.toBeNull();
  });

  it("puts it inside the room", () => {
    // The stack is drawn on a roof CELL, so a cell outside the interior would be
    // a chimney standing on somebody's lawn.
    for (const [w, h] of [
      [5, 4],
      [8, 3],
      [4, 9],
      [12, 12],
    ]) {
      const r = room(-3, 7, w, h);
      const cell = chimneyCell(r, true)!;
      expect(cell, `${w}x${h}`).not.toBeNull();
      expect(r.interior.has(cell), `${w}x${h} put it outside`).toBe(true);
    }
  });

  it("keeps it in the back third", () => {
    // A stack on the near edge stands in front of the roof's own eave and reads
    // as a crate on the gutter; against the far edge it breaks the silhouette
    // where the roof meets the sky, which is where it is legible.
    const r = room(0, 0, 6, 9);
    const y = Number(chimneyCell(r, true)!.split(",")[1]);
    expect(y).toBeLessThanOrEqual(0 + Math.floor(8 / 3));
  });

  it("is a total function of the room", () => {
    // Roofs are derived and never placed (DESIGN §Structures), and nothing about
    // a chimney is stored — so the same walls have to give the same answer every
    // time, or a stack would wander between frames.
    const a = room(4, -2, 7, 6);
    const b = room(4, -2, 7, 6);
    expect(chimneyCell(a, true)).toBe(chimneyCell(b, true));
    // And a DIFFERENT room is allowed a different answer; this is the pair that
    // would fail if the hash ignored its inputs.
    const far = room(40, 90, 7, 6);
    expect(chimneyCell(far, true)).not.toBe(chimneyCell(a, true));
  });
});
