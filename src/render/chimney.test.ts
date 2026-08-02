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
  it("gives a shed nothing", () => {
    // A chimney on everything says nothing; the point of one is that somebody
    // lives under it.
    expect(chimneyCell(room(0, 0, 3, 3))).toBeNull();
    expect(chimneyCell(room(0, 0, 2, 5))).toBeNull();
  });

  it("gives a house one", () => {
    expect(chimneyCell(room(0, 0, 5, 4))).not.toBeNull();
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
      const cell = chimneyCell(r)!;
      expect(cell, `${w}x${h}`).not.toBeNull();
      expect(r.interior.has(cell), `${w}x${h} put it outside`).toBe(true);
    }
  });

  it("keeps it in the back third", () => {
    // A stack on the near edge stands in front of the roof's own eave and reads
    // as a crate on the gutter; against the far edge it breaks the silhouette
    // where the roof meets the sky, which is where it is legible.
    const r = room(0, 0, 6, 9);
    const y = Number(chimneyCell(r)!.split(",")[1]);
    expect(y).toBeLessThanOrEqual(0 + Math.floor(8 / 3));
  });

  it("is a total function of the room", () => {
    // Roofs are derived and never placed (DESIGN §Structures), and nothing about
    // a chimney is stored — so the same walls have to give the same answer every
    // time, or a stack would wander between frames.
    const a = room(4, -2, 7, 6);
    const b = room(4, -2, 7, 6);
    expect(chimneyCell(a)).toBe(chimneyCell(b));
    // And a DIFFERENT room is allowed a different answer; this is the pair that
    // would fail if the hash ignored its inputs.
    const far = room(40, 90, 7, 6);
    expect(chimneyCell(far)).not.toBe(chimneyCell(a));
  });
});
