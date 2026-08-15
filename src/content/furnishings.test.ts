import { describe, it, expect } from "vitest";
import { FURNITURE, footprint } from "./furniture";
import type { FurnitureId, Facing } from "./furniture";
import { FURNITURE_ART } from "./furnishings";
import { gridFor, gridSource, INK } from "../render/furnishings";

const TILE = 16; // renderer.ts's scene tile, and the unit these grids are in.
const FACINGS: Facing[] = ["s", "n", "e", "w"];
const ids = Object.keys(FURNITURE_ART) as FurnitureId[];

describe("furniture art", () => {
  it("has something to check", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  // THE SIZE IS THE CONTRACT. A grid is blitted 1:1 at the anchor's top-left
  // lifted by `height + rise`, so a row too many or a column too few slides the
  // piece off its own tile — and it slides by ONE PIXEL, which is exactly the
  // kind of wrong that survives a screenshot and gets found weeks later.
  for (const id of ids) {
    const art = FURNITURE_ART[id]!;
    const def = FURNITURE[id];
    const rise = art.rise ?? 0;

    for (const facing of FACINGS) {
      const { grid } = gridFor(art, facing);
      const { w, h } = footprint(def, facing);

      it(`${id} facing ${facing} is exactly its footprint wide`, () => {
        for (const row of grid.rows) expect(row).toHaveLength(w * TILE);
      });

      it(`${id} facing ${facing} is rise + footprint + height tall`, () => {
        // A WALL-MOUNTED piece has no footprint in the grid at all: it hangs on
        // a vertical face, so there is no tile depth to draw and its height is
        // the whole of it. Getting this wrong is invisible in a screenshot — the
        // picture just hangs a few pixels low — which is why it is asserted.
        const want = def.mount === "wall" ? def.height : rise + h * TILE + def.height;
        expect(grid.rows).toHaveLength(want);
      });
    }

    it(`${id} rises less than half a tile`, () => {
      // `hides()` fades anything overhanging by more than half a tile. Furniture
      // that made the player see-through would be the occlusion machinery
      // firing on the wrong thing — roofs are meant to be its first user.
      expect(rise).toBeLessThan(TILE / 2);
    });

    it(`${id} declares every colour it uses`, () => {
      // `c`, `t` and `s` are the finish and `C`, `T`, `S` the trim; both are
      // resolved at raster time. `.` is transparent; `k` must be the shared ink.
      // Anything else has to be in the piece's own palette or it silently draws
      // nothing.
      for (const facing of FACINGS) {
        const { grid } = gridFor(art, facing);
        for (const row of grid.rows) {
          for (const ch of row) {
            if (ch === "." || "cts".includes(ch) || "CTS".includes(ch)) continue;
            expect(grid.palette[ch], `${id}/${facing} uses "${ch}"`).toBeTruthy();
          }
        }
      }
    });

    it(`${id} only asks for a trim it actually has`, () => {
      // A capital resolves against the piece's SECOND finish, so one on a piece
      // with no `trim` declared draws nothing at all — a silent hole in the art
      // rather than a wrong colour, which is the worst kind. Checks every grid a
      // piece owns, joining ones included, since those are where a stray capital
      // is least likely to be looked at.
      const grids = [
        art.s,
        art.n,
        art.e,
        art.w,
        art.joins?.x.mid,
        art.joins?.x.end,
        art.joins?.y?.mid,
        art.joins?.y?.end,
      ].filter((g): g is NonNullable<typeof g> => g !== undefined);
      const usesTrim = grids.some((g) => /[CTS]/.test(g.rows.join("")));
      if (usesTrim) expect(def.trim?.length, `${id} draws trim but declares none`).toBeTruthy();
    });

    it(`${id} outlines in the shared ink`, () => {
      for (const facing of FACINGS) {
        const { grid } = gridFor(art, facing);
        if (grid.palette.k) expect(grid.palette.k).toBe(INK);
      }
    });

    // A MOVING PIECE has to keep every promise a still one does, in every
    // frame. The size contract above only ever sees frame 0 — a band a row
    // short or a character wide would pass it and then, three frames later,
    // slide the fire off the hearth or draw it in nothing at all.
    const anim = art.anim;
    if (anim) {
      it(`${id} starts on its still art`, () => {
        // Frame 0 must BE the `s` grid, or the build menu's thumbnail (which
        // never animates) and the piece the moment it is placed disagree.
        expect(gridFor(art, "s", 0).grid.rows).toEqual(art.s.rows);
      });

      it(`${id} cycles`, () => {
        // Past the end and back to the start: the caller counts frames off a
        // clock that runs for as long as the game is open.
        expect(gridFor(art, "s", anim.frames.length).grid.rows).toEqual(art.s.rows);
        expect(gridFor(art, "s", 1).grid.rows).not.toEqual(art.s.rows);
      });

      it(`${id} keeps its back and sides still`, () => {
        // The animation is the front view's alone. A back with no fire in it
        // has nothing to move, and moving it anyway would be the flame's rows
        // landing on masonry.
        for (const facing of FACINGS) {
          if (facing === "s") continue;
          const still = gridFor(art, facing, 0).grid.rows;
          for (let f = 1; f < anim.frames.length; f++) {
            expect(gridFor(art, facing, f).grid.rows, `${id}/${facing} frame ${f}`).toEqual(still);
          }
        }
      });

      for (let f = 0; f < anim.frames.length; f++) {
        it(`${id} frame ${f} is the same size and palette as the still art`, () => {
          const { grid } = gridFor(art, "s", f);
          const { w } = footprint(def, "s");
          expect(grid.rows).toHaveLength(art.s.rows.length);
          for (const row of grid.rows) expect(row).toHaveLength(w * TILE);
          for (const row of grid.rows) {
            for (const ch of row) {
              if (ch === "." || ch === "c" || ch === "t" || ch === "s") continue;
              expect(grid.palette[ch], `${id} frame ${f} uses "${ch}"`).toBeTruthy();
            }
          }
        });
      }

      it(`${id} holds each frame long enough to read`, () => {
        // A cycle, not a flicker: under about a tenth of a second the frames
        // blur into a bright smear and the silhouette stops being one.
        expect(anim.holdMs).toBeGreaterThanOrEqual(100);
      });
    }

    it(`${id} uses the finish somewhere`, () => {
      // A grid painted entirely in literals would ignore the finish the player
      // chose, which is the one thing furniture has always got right.
      const { grid } = gridFor(art, "s");
      expect(grid.rows.join("")).toMatch(/[cts]/);
    });
  }
});

// --- the sofa's arms ----------------------------------------------------------
// An arm is a separate piece standing on the floor, and the suite above cannot
// tell that from an arm painted inside the seat band — both are legal grids of
// the right size. What makes it an arm is that its sides are UNBROKEN from its
// own top rule down to the base: every rule they cross (the back's foot, the
// seat's, the skirt's) has to stop for them. Draw one of those rules wall to
// wall and the arm is a box again, which is the state this piece was found in.
describe("the sofa's arms", () => {
  const rows = FURNITURE_ART.sofa!.s!.rows;
  const EDGES = [5, 42]; // the arms' inner sides, left and right

  it("run unbroken from their tops to the floor", () => {
    // The arm's top rule is the first row that is ink at an arm's inner side and
    // NOT ink beside it — which the back's own full-width rules never are.
    const top = rows.findIndex((row) => row[EDGES[0]] === "k" && row[EDGES[0] + 1] !== "k");
    expect(top).toBeGreaterThan(0);

    // The base is the last full-width rule; below it there are only feet.
    const base = rows.findLastIndex((row) => row.slice(1, 47) === "k".repeat(46));
    expect(base).toBeGreaterThan(top);

    // Ink down both sides, and — the half that actually catches a rule left to
    // run wall to wall — NO ink between them. A full-width rule passes "the
    // sides are ink" as well; what it cannot do is leave the arm's face showing.
    for (let y = top + 1; y < base; y++) {
      for (const x of EDGES) expect(rows[y][x], `row ${y}, arm side at ${x}`).toBe("k");
      expect(rows[y].slice(2, 5), `row ${y}, left arm face`).not.toBe("kkk");
      expect(rows[y].slice(43, 46), `row ${y}, right arm face`).not.toBe("kkk");
    }
  });

  it("stand in front of the back, not under it", () => {
    // Their top is above the seat: the row the back's foot rules on is below the
    // arm's top, so the arm crosses it. Flush with the seat instead and a sofa
    // has an arm exactly as tall as the cushion it is holding in.
    const top = rows.findIndex((row) => row[EDGES[0]] === "k" && row[EDGES[0] + 1] !== "k");
    const foot = rows.findIndex((row, i) => i > top && row[6] === "k");
    expect(foot).toBeGreaterThan(top);
  });
});

// --- joining pieces -----------------------------------------------------------
// A joining form's `mid` and `end` are grids the facing-based suite above never
// looks at, because `gridFor` never returns them. Unguarded they are exactly the
// kind of art that goes one row wrong and slides a worktop a pixel off the run
// it is supposed to be continuous with.
describe("joining art", () => {
  for (const id of ids) {
    const art = FURNITURE_ART[id]!;
    const joins = art.joins;
    if (!joins) continue;
    const def = FURNITURE[id];
    const rise = art.rise ?? 0;
    const box = rise + def.h * TILE + def.height;

    const axes = [
      ["x", joins.x],
      ...(joins.y ? ([["y", joins.y]] as const) : []),
    ] as const;

    for (const [axis, grids] of axes) {
      for (const [name, grid] of [
        ["mid", grids.mid],
        ["end", grids.end],
      ] as const) {
        it(`${id} ${axis}.${name} matches the standalone box`, () => {
          // The SAME box as `s`, or the run would step where it joined.
          expect(grid.rows).toHaveLength(box);
          for (const row of grid.rows) expect(row).toHaveLength(def.w * TILE);
        });
      }
    }

    // A row that is ENTIRELY ink is a horizontal rule running the length of the
    // surface — a worktop's front edge, a door rail — and it is supposed to reach
    // both cell boundaries so it continues into the next cell. What must not
    // appear is a VERTICAL side outline, which is an ink char at the end of a row
    // that has actual content in it. That distinction is the whole test.
    const bodyRows = (rows: readonly string[]): string[] =>
      rows.filter((r) => r.trim() !== "" && [...r].some((ch) => ch !== "k" && ch !== "."));

    it(`${id} x.mid draws no side outline`, () => {
      // The per-cell edges rule in assertion form: if the middle of a run returns
      // its own edges, the run is a row of boxes instead of a counter.
      for (const row of bodyRows(joins.x.mid.rows)) {
        expect(row[0], `x.mid row "${row}" starts in ink`).not.toBe("k");
        expect(row[row.length - 1], `x.mid row "${row}" ends in ink`).not.toBe("k");
      }
    });

    it(`${id} x.end returns its left side only`, () => {
      // Authored as the LEFT end — the run continues to its right — and mirrored
      // for the other one, so authoring both would be a second chance to get one
      // of them wrong.
      const rows = bodyRows(joins.x.end.rows);
      expect(rows.length).toBeGreaterThan(0);

      // STAYING OPEN IS THE STRICT HALF, and it is per row: an ink char at the
      // last column is a seam the run would wear at every junction, which is the
      // whole thing this grid exists to avoid.
      for (const row of rows) {
        expect(row[row.length - 1], `end row "${row}" should stay open`).not.toBe("k");
      }

      // RETURNING THE LEFT IS THE LOOSE HALF, and asking it of every row was
      // wrong. It caught the table, whose legs are inset three pixels and touch
      // no edge at all — correct art failing a test that had over-generalised
      // from the counter, where every row happened to reach the outline. What
      // matters is that the run's end is CLOSED somewhere, not that every row
      // closes it.
      const closesLeft = rows.some((r) => r.slice(0, 2).includes("k"));
      expect(closesLeft, "end never returns its left edge").toBe(true);
    });

    const y = joins.y;
    if (y) {
      // THE TILING BAND is what makes a receding run one surface, and it is the
      // one thing about the y axis that can silently go wrong: the top TILE rows
      // are what the cell behind butts against, so a single interrupting row
      // there draws a line every 16px down the run.
      it(`${id} y.mid tiles its top band without interruption`, () => {
        const band = y.mid.rows.slice(0, TILE);
        expect(new Set(band).size, `y.mid's first ${TILE} rows are not uniform`).toBe(1);
      });

      it(`${id} y.end closes the far end and otherwise matches y.mid`, () => {
        // Only the top edge may differ. Anything else and the run would change
        // where it ends, which is not what an end cap is.
        expect(y.end.rows[0]).not.toEqual(y.mid.rows[0]);
        expect(y.end.rows.slice(1)).toEqual(y.mid.rows.slice(1));
      });
    }
  }
});

// --- gridSource ---------------------------------------------------------------
// `gridSource` names the branch `gridFor` takes, and /furniture.html prints that
// name under every view. The two are separate functions over the same rule, so
// they can disagree — and a wrong label is invisible, because it looks exactly
// like a right one. This is the thing that stops them drifting: the name is
// checked against the grid that actually comes back.
describe("gridSource agrees with gridFor", () => {
  for (const id of ids) {
    const art = FURNITURE_ART[id]!;

    for (const facing of FACINGS) {
      it(`${id} facing ${facing}`, () => {
        const { grid, mirror } = gridFor(art, facing);
        const front = gridFor(art, "s").grid;

        switch (gridSource(art, facing)) {
          case "front":
            // The fallback. Identity, not deep equality: the claim is that this
            // facing draws THE FRONT GRID, not one that happens to look like it.
            expect(grid).toBe(front);
            expect(mirror).toBe(false);
            break;
          case "own":
            expect(grid).toBe(art[facing]);
            expect(mirror).toBe(false);
            break;
          case "mirrored-e":
            expect(facing).toBe("w");
            expect(grid).toBe(art.e);
            expect(mirror).toBe(true);
            break;
        }
      });
    }
  }
});
