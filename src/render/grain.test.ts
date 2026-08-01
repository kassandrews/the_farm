import { describe, it, expect } from "vitest";
import { forEachGrainMark, type GrainInk, type GrainSpec } from "./grain";

const TILE = 16;

interface Mark {
  x: number;
  y: number;
  w: number;
  h: number;
  ink: GrainInk;
}

function marks(spec: GrainSpec): Mark[] {
  const out: Mark[] = [];
  forEachGrainMark(spec, (x, y, w, h, ink) => out.push({ x, y, w, h, ink }));
  return out;
}

/** One tile of floorboards at tile coordinate (tx, ty). */
function tile(tx: number, ty: number, over: Partial<GrainSpec> = {}): Mark[] {
  return marks({
    wx: tx * TILE,
    wy: ty * TILE,
    w: TILE,
    h: TILE,
    axis: "h",
    course: 5,
    joint: 13,
    bond: 3,
    ...over,
  });
}

describe("grain marks", () => {
  it("stays inside the box it was asked for", () => {
    for (let ty = 0; ty < 12; ty++) {
      for (const m of tile(3, ty)) {
        expect(m.x).toBeGreaterThanOrEqual(0);
        expect(m.y).toBeGreaterThanOrEqual(0);
        expect(m.x + m.w).toBeLessThanOrEqual(TILE);
        expect(m.y + m.h).toBeLessThanOrEqual(TILE);
      }
    }
  });

  // THE BAND RULE, as a number. If every tile put its seams at the same
  // cell-local offsets, the floor would stripe at the tile pitch — the bug
  // CLAUDE.md says has already been shipped three times. A course period
  // coprime with TILE is what prevents it, so assert the consequence rather
  // than the constant: consecutive tiles must disagree about where the seams go.
  it("does not repeat its seams at the tile pitch", () => {
    const seamRows = (ty: number) =>
      tile(0, ty)
        .filter((m) => m.ink === "seam")
        .map((m) => m.y)
        .join(",");
    const rows = new Set<string>();
    for (let ty = 0; ty < 5; ty++) rows.add(seamRows(ty));
    // Five distinct layouts before it repeats: lcm(5, 16) / 16.
    expect(rows.size).toBe(5);
    expect(seamRows(5)).toBe(seamRows(0));
  });

  // The other half of the same rule: the courses have to be continuous ACROSS
  // the seam between two tiles, or the surface gets a break at every cell
  // boundary and we are back to a grid by another route.
  it("runs one continuous course across adjacent tiles", () => {
    const worldSeams = (tx: number, ty: number) =>
      tile(tx, ty)
        .filter((m) => m.ink === "seam")
        .map((m) => ty * TILE + m.y);
    // Vertically adjacent tiles: the seam sequence is one arithmetic run.
    const all = [...worldSeams(0, 0), ...worldSeams(0, 1), ...worldSeams(0, 2)];
    expect(all).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45]);
    // Horizontally adjacent tiles: the same seam rows, since a board runs east.
    expect(worldSeams(0, 1)).toEqual(worldSeams(9, 1));
  });

  it("staggers butt joints between neighbouring courses", () => {
    // A wide strip, so several courses and several joints are in view.
    const wide = marks({
      wx: 0,
      wy: 0,
      w: 64,
      h: 40,
      axis: "h",
      course: 5,
      joint: 13,
      bond: 3,
    });
    const byCourse = new Map<number, number[]>();
    for (const m of wide.filter((v) => v.ink === "joint")) {
      const c = Math.floor(m.y / 5);
      byCourse.set(c, [...(byCourse.get(c) ?? []), m.x]);
    }
    expect(byCourse.size).toBeGreaterThan(4);
    // No two adjacent courses may butt in the same places — that is a
    // checkerboard, which is the tile grid at a different pitch.
    for (const [c, xs] of byCourse) {
      const next = byCourse.get(c + 1);
      if (next) expect(xs.join(",")).not.toBe(next.join(","));
    }
  });

  it("leaves planking unjointed when asked to", () => {
    const wall = marks({
      wx: 0,
      wy: 0,
      w: TILE,
      h: 24,
      axis: "v",
      course: 5,
      joint: null,
      bond: 3,
    });
    expect(wall.every((m) => m.ink === "seam")).toBe(true);
    // Vertical boards: every seam is a full-height 1px column.
    for (const m of wall) {
      expect(m.w).toBe(1);
      expect(m.h).toBe(24);
    }
  });

  // THE BOND, as a number. This replaced a random per-course offset that
  // photographed as chaos — joints crowding, drifting, occasionally landing two
  // pixels apart. A floor nobody laid. Regularity is what reads as workmanship,
  // so it is worth asserting rather than eyeballing.
  it("steps its joints by a regular bond", () => {
    const wide = marks({ wx: 0, wy: 0, w: 200, h: 45, axis: "h", course: 5, joint: 12, bond: 3 });
    const xsIn = (courseIndex: number) =>
      wide.filter((m) => m.ink === "joint" && m.y === courseIndex * 5).map((m) => m.x);
    // Within a course the joints are evenly spaced, one board apart.
    for (const c of [0, 1, 2, 3]) {
      const xs = xsIn(c);
      expect(xs.length).toBeGreaterThan(3);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBe(12);
    }
    // Each course steps a third of a board past the one behind it...
    expect(xsIn(0)[0]).toBe(0);
    expect(xsIn(1)[0]).toBe(4);
    expect(xsIn(2)[0]).toBe(8);
    // ...and the fourth course lines up with the first. That is what `bond` is.
    expect(xsIn(3)).toEqual(xsIn(0));
  });

  // A regular bond must not develop a seam at the world origin. Modulo on a
  // negative course index folds the wrong way, which would run a line of joints
  // to the horizon along y = 0.
  it("has no centre", () => {
    const above = marks({ wx: 0, wy: -45, w: 200, h: 45, axis: "h", course: 5, joint: 12, bond: 3 });
    const below = marks({ wx: 0, wy: 0, w: 200, h: 45, axis: "h", course: 5, joint: 12, bond: 3 });
    expect(above).toEqual(below);
  });
});
