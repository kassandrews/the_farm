import { describe, it, expect } from "vitest";
import { newWorld, buildAt } from "./game";
import { setTile, tileKey, floorFinish } from "./world";
import { GRASS } from "../content/tiles";
import { add, count } from "./inventory";
import { structureAt } from "./structures";
import { furnitureAt } from "./furniture";
import { roomAt } from "./rooms";
import { claimedBed } from "./housing";
import { beginStroke, captureCell, endStroke, undoStroke, canUndo, undoLabel } from "./undo";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

/** Build somewhere far from the authored town and clear of generated scatter,
 *  the way structures.test.ts does — a test about undo shouldn't be at the mercy
 *  of where the seed dropped a tree. */
function clear(w: ReturnType<typeof world>, x: number, y: number) {
  setTile(w, x, y, GRASS);
}

/** One stroke, applied the way ui/app.ts applies one: begin, capture-then-edit
 *  each cell, end. */
function stroke(
  w: ReturnType<typeof world>,
  label: string,
  tool: Parameters<typeof buildAt>[1],
  cells: [number, number][],
) {
  beginStroke(w, label);
  for (const [x, y] of cells) {
    captureCell(w, x, y);
    buildAt(w, tool, x, y, Date.now());
  }
  endStroke(w);
}

describe("undoing a build stroke", () => {
  it("puts back a whole drag, not one cell of it", () => {
    const w = world();
    add(w.inventory, "wood", 200);
    const run: [number, number][] = [];
    for (let x = 40; x < 50; x++) {
      clear(w, x, 40);
      run.push([x, 40]);
    }
    stroke(w, "the wall", "wall", run);
    expect(structureAt(w, 45, 40)).not.toBeNull();

    expect(undoStroke(w)).toBe(true);
    // All ten, not the last one. The unit is the gesture.
    for (const [x, y] of run) expect(structureAt(w, x, y)).toBeNull();
  });

  it("restores what a demolition took, which is the arrangement", () => {
    const w = world();
    add(w.inventory, "wood", 200);
    const run: [number, number][] = [];
    for (let x = 40; x < 50; x++) {
      clear(w, x, 42);
      run.push([x, 42]);
    }
    stroke(w, "the wall", "wall", run);
    stroke(w, "the erase", "erase", run);
    expect(structureAt(w, 45, 42)).toBeNull();

    undoStroke(w);
    // Erase refunded the wood, so what undo had to give back was the wall.
    for (const [x, y] of run) expect(structureAt(w, x, y)).not.toBeNull();
  });

  it("reverses the stroke's material delta, not the satchel", () => {
    const w = world();
    add(w.inventory, "wood", 100);
    clear(w, 40, 44);
    const before = count(w.inventory, "wood");

    stroke(w, "a wall", "wall", [[40, 44]]);
    const spent = before - count(w.inventory, "wood");
    expect(spent).toBeGreaterThan(0);

    // Between the stroke and the undo, the player goes and fells a tree. Undo
    // must not eat that wood — it owes the stroke's delta, not a restore.
    add(w.inventory, "wood", 8);
    undoStroke(w);
    expect(count(w.inventory, "wood")).toBe(before + 8);
  });

  it("can never fail for want of wood", () => {
    const w = world();
    add(w.inventory, "wood", 100);
    clear(w, 40, 46);
    stroke(w, "a wall", "wall", [[40, 46]]);

    // Undoing a PLACEMENT owes the player wood back, so it can't be blocked.
    // Undoing a demolition would owe wood the other way — clamp, never refuse.
    w.inventory.wood = 0;
    expect(undoStroke(w)).toBe(true);
    expect(count(w.inventory, "wood")).toBeGreaterThanOrEqual(0);
  });

  it("puts back a bed by its anchor when you erased it by its foot", () => {
    const w = world();
    add(w.inventory, "wood", 200);
    for (let y = 50; y <= 52; y++) clear(w, 40, y);
    stroke(w, "a bed", "bed", [[40, 50]]);
    const placed = furnitureAt(w, 40, 50);
    expect(placed).not.toBeNull();

    // Tap the far cell of a multi-tile piece: the anchor deleted is not the key
    // that was tapped, which is the case a per-key snapshot gets wrong.
    const foot = placed!.ax === 40 && placed!.ay === 50 ? [40, 51] : [40, 50];
    stroke(w, "the erase", "erase", [foot as [number, number]]);
    expect(furnitureAt(w, 40, 50)).toBeNull();

    undoStroke(w);
    expect(furnitureAt(w, 40, 50)).not.toBeNull();
  });

  it("invalidates the rooms index it wrote behind the back of", () => {
    const w = world();
    add(w.inventory, "wood", 400);
    // A 3x3 shell with a hole, then close it — the roof arrives, and undo has
    // to take it away again.
    const shell: [number, number][] = [];
    for (let x = 60; x <= 64; x++)
      for (let y = 60; y <= 64; y++)
        if (x === 60 || x === 64 || y === 60 || y === 64) {
          clear(w, x, y);
          shell.push([x, y]);
        }
    for (let x = 61; x <= 63; x++) for (let y = 61; y <= 63; y++) clear(w, x, y);

    // The gap has to be mid-wall, not a corner: rooms.ts floods four-way, so a
    // missing corner leaks nothing and the room is closed already.
    const gapAt = shell.findIndex(([x, y]) => x === 62 && y === 64);
    const gap = shell.splice(gapAt, 1)[0];
    stroke(w, "the shell", "wall", shell);
    expect(roomAt(w, 62, 62)).toBeNull(); // still open

    stroke(w, "the last wall", "wall", [gap]);
    expect(roomAt(w, 62, 62)).not.toBeNull(); // it closed

    undoStroke(w);
    expect(roomAt(w, 62, 62)).toBeNull(); // and it opened again
  });

  it("revives a villager's claim when their bed comes back", () => {
    const w = world();
    // Whoever the authored town gave a bed to — not every villager has one (the
    // Office Creature lives at the town hall, which has no bedroom).
    const v = w.villagers.find((x) => claimedBed(w, x))!;
    expect(v).toBeDefined();

    const bed = claimedBed(w, v)!;
    stroke(w, "the erase", "erase", [[bed.x, bed.y]]);
    expect(claimedBed(w, v)).toBeNull(); // stale key, honestly homeless

    undoStroke(w);
    // Nothing in undo knows about housing. The claim is re-checked against the
    // world on every read, so restoring the bed at the same anchor is enough.
    expect(claimedBed(w, v)).not.toBeNull();
    expect(v.homeBed).toBe(tileKey(bed.x, bed.y));
  });

  it("is one level, and the next stroke replaces it", () => {
    const w = world();
    add(w.inventory, "wood", 200);
    clear(w, 40, 54);
    clear(w, 41, 54);
    stroke(w, "first", "wall", [[40, 54]]);
    stroke(w, "second", "wall", [[41, 54]]);

    expect(undoLabel(w)).toBe("second");
    undoStroke(w);
    expect(structureAt(w, 41, 54)).toBeNull();
    expect(structureAt(w, 40, 54)).not.toBeNull(); // the first is gone for good
    expect(canUndo(w)).toBe(false); // and there is no redo
  });

  it("doesn't spend your undo on a stroke that changed nothing", () => {
    const w = world();
    add(w.inventory, "wood", 200);
    clear(w, 40, 56);
    stroke(w, "a real wall", "wall", [[40, 56]]);

    // A tap on ground you can't build on: begins and ends a stroke, captures
    // nothing. The undo you were saving must survive it.
    beginStroke(w, "a miss");
    endStroke(w);
    expect(undoLabel(w)).toBe("a real wall");
    undoStroke(w);
    expect(structureAt(w, 40, 56)).toBeNull();
  });

  it("has nothing to undo in a fresh world, and doesn't follow one home", () => {
    const w = world();
    expect(canUndo(w)).toBe(false);
    expect(undoStroke(w)).toBe(false);

    add(w.inventory, "wood", 200);
    clear(w, 40, 58);
    stroke(w, "a wall", "wall", [[40, 58]]);
    expect(canUndo(w)).toBe(true);

    // "Gone on reload" with no call to make it so: the buffer is keyed by the
    // world object, and a load or a new town mints a fresh one.
    expect(canUndo(world())).toBe(false);
  });
});

describe("undoing a re-finish", () => {
  // The case that motivated putting `finish` in CellSnapshot at all. A re-finish
  // stroke changes NOTHING else: the ground override stays FLOOR and the build
  // cell stays absent, so a snapshot of those two restores a cell that is still
  // the new colour — undo would report success and visibly do nothing.
  it("puts the old finish back", () => {
    const w = world();
    add(w.inventory, "wood", 40);
    w.skins.unlocked.push("walnut");
    clear(w, 30, 30);

    stroke(w, "floor", "floor", [[30, 30]]); // pine, the default
    expect(floorFinish(w, 30, 30)).toBe("pine");

    w.skins.selected.floor = "walnut";
    stroke(w, "floor", "floor", [[30, 30]]); // free re-finish
    expect(floorFinish(w, 30, 30)).toBe("walnut");

    expect(undoStroke(w)).toBe(true);
    expect(floorFinish(w, 30, 30)).toBe("pine");
  });

  it("takes the finish away with the floor when the whole stroke goes", () => {
    const w = world();
    add(w.inventory, "wood", 40);
    w.skins.unlocked.push("walnut");
    clear(w, 31, 31);

    w.skins.selected.floor = "walnut";
    stroke(w, "floor", "floor", [[31, 31]]);
    expect(w.finishes[tileKey(31, 31)]).toBe("walnut");

    expect(undoStroke(w)).toBe(true);
    // Not merely reset to pine — the entry itself has to go, or the map keeps a
    // colour for ground that is grass again.
    expect(w.finishes[tileKey(31, 31)]).toBeUndefined();
  });
});
