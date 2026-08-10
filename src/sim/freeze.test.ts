import { describe, it, expect } from "vitest";
import { newWorld, buildAt } from "./game";
import { freezeBuilt } from "./freeze";
import { rooms } from "./rooms";
import { tileAt, baseTileAt, setTile, tileKey } from "./world";
import { GRASS } from "../content/tiles";
import { MIGRATIONS } from "./save";
import { add } from "./inventory";
import type { WorldState } from "./types";

const NOW = Date.UTC(2026, 6, 1, 12);

function world(seed = 7) {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed });
}

/** A sealed room with a door, out in open country where terrain is live. The
 *  plot is cleared first because generated trees are solid and refuse placement
 *  — a tree in the footprint silently leaves a hole in the wall. */
function house(w: WorldState, ox: number, oy: number, span = 5) {
  add(w.inventory, "wood", 5000);
  const last = span - 1;
  for (let y = oy - 1; y <= oy + span; y++)
    for (let x = ox - 1; x <= ox + span; x++) setTile(w, x, y, GRASS);
  for (let y = oy; y <= oy + last; y++) {
    for (let x = ox; x <= ox + last; x++) {
      if (x !== ox && x !== ox + last && y !== oy && y !== oy + last) continue;
      const door = x === ox + 2 && y === oy + last;
      buildAt(w, door ? "door" : "wall", x, y, NOW);
    }
  }
}

describe("freezing the ground under what you built", () => {
  it("pins every cell of a room, interior and shell", () => {
    const w = world();
    expect(Object.keys(w.frozen)).toHaveLength(0);
    house(w, 200, 200);

    const room = rooms(w)[0];
    expect(room).toBeDefined();
    for (const key of [...room.interior, ...room.shell]) {
      expect(w.frozen[key], `${key} was left generating`).toBeDefined();
    }
  });

  it("happens on building, without anybody asking for it", () => {
    // The wrapper around `buildAt` is the whole guarantee. If it is ever removed
    // or a new early `return` skips it, a room generates its own floor for ever
    // and nothing else in the game notices.
    const w = world();
    house(w, 300, 300);
    expect(Object.keys(w.frozen).length).toBeGreaterThan(0);
  });

  it("stores what generation says even though an edit that equal would be dropped", () => {
    // THE REASON `frozen` IS ITS OWN RECORD. `setTile` deletes an edit whose
    // value equals the generated base — correct, and the sparse-storage rule the
    // whole save rests on. Every cell this writes is exactly that case, so a
    // freeze kept in `overrides` would be a loop that stores nothing, and any
    // later pass compacting redundant edits would unfreeze every town at once.
    const w = world();
    house(w, 400, 400);
    const key = tileKey(401, 401);
    expect(w.frozen[key]).toBe(baseTileAt(w, 401, 401));

    // The same value through the ordinary door: stored, then gone.
    setTile(w, 401, 401, baseTileAt(w, 401, 401));
    expect(w.overrides[key]).toBeUndefined();
    expect(w.frozen[key]).toBeDefined();
  });

  it("survives the generator answering differently", () => {
    // The point of the entire feature, and the only test that really proves it.
    // A generator change cannot be simulated in place — terrain is a total
    // function of (seed, x, y) — so this carries a built town across to a world
    // whose ground is DIFFERENT, which is precisely what a terrain pass does to
    // somebody's save.
    const before = world(7);
    house(before, 500, 500);

    const after = world(1234);
    after.build = before.build;
    after.frozen = before.frozen;

    // THE PLAYER'S HOUSE ONLY, and the first draft of this test did not say so.
    // `freezeBuilt` walks every room including the authored town's, and both
    // worlds stamp their own town floors into `overrides` — which correctly beat
    // `frozen`, so comparing across the whole record failed on a town cell and
    // looked like the freeze leaking. It was the test comparing two towns.
    const mine = rooms(before).find((r) => r.interior.has(tileKey(501, 501)))!;
    expect(mine).toBeDefined();

    let differed = 0;
    for (const key of [...mine.interior, ...mine.shell]) {
      const [x, y] = key.split(",").map(Number);
      if (baseTileAt(after, x, y) !== before.frozen[key]) differed++;
      expect(tileAt(after, x, y), `${key} moved under the house`).toBe(before.frozen[key]);
    }
    // And the test is only worth anything if the two worlds actually disagree.
    expect(differed, "the two seeds generate the same ground here").toBeGreaterThan(0);
  });

  it("still lets you dig up your own floor, and remembers what was under it", () => {
    // Read order is overrides, then frozen, then generation. An edit wins, or
    // building a house would make the ground inside it permanent. Undoing that
    // edit falls back to the FROZEN ground rather than to live generation, which
    // is the better meaning: the cell returns to what it was when you built.
    const w = world();
    house(w, 600, 600);
    const key = tileKey(601, 601);
    const held = w.frozen[key];

    setTile(w, 601, 601, 2);
    expect(tileAt(w, 601, 601)).toBe(2);
    expect(w.frozen[key]).toBe(held);

    delete w.overrides[key];
    expect(tileAt(w, 601, 601)).toBe(held);
  });

  it("is idempotent, because it is a one-way ratchet", () => {
    // Nothing ever removes an entry, so re-reading generation for a cell already
    // pinned would be asking the question the freeze exists to stop asking.
    const w = world();
    house(w, 700, 700);
    expect(freezeBuilt(w)).toBe(0);
  });

  it("leaves the open world alone", () => {
    // A garden is not a room. The world healing where you are not invested is a
    // rule this must not quietly repeal, so ground you merely walked across or
    // gathered from keeps generating.
    const w = world();
    house(w, 800, 800);
    expect(w.frozen[tileKey(820, 820)]).toBeUndefined();
    expect(w.frozen[tileKey(0, 0)]).toBeUndefined();
  });
});

describe("the v31 migration", () => {
  it("gives an older save an empty freeze and changes nothing else", () => {
    const w = world();
    house(w, 900, 900);
    const raw = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    raw.schemaVersion = 30;
    delete raw.frozen;

    // This rung alone: v37 moves four of the town's buildings, so a full climb
    // legitimately changes `build`, `overrides` and `frozen`. What v31 promises
    // is narrower and is what is asserted here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migrated = MIGRATIONS[30](raw) as any;
    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(31);
    // Empty, deliberately: the catch-up runs on load rather than here, so a
    // migration stays frozen in time instead of calling live `rooms()` code.
    expect(migrated!.frozen).toEqual({});
    expect(Object.keys(migrated!.build)).toEqual(Object.keys(w.build));
  });

  it("catches up a town built before the freeze existed", () => {
    // What `beginWorld` does on load. The house is already there; nothing about
    // it was pinned; one call and it is.
    const w = world();
    house(w, 1000, 1000);
    w.frozen = {};

    const pinned = freezeBuilt(w);
    expect(pinned).toBeGreaterThan(0);
    const room = rooms(w)[0];
    for (const key of room.interior) expect(w.frozen[key]).toBeDefined();
  });
});
