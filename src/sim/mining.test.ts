// Mining — the ore, and the slate that being far from home pays out.

import { describe, it, expect } from "vitest";
import { newWorld, useShaft } from "./game";
import { mineVein, SLATE_DEPTH } from "./mining";
import { sink, carve, setTile, tileAt, depthAt, tileKey } from "./world";
import { count } from "./inventory";
import { updateRegrowth, pendingRegrowth, nodeAt } from "./gather";
import { NODES } from "../content/nodes";
import { ORE_VEIN, BEDROCK, CAVE_FLOOR } from "../content/tiles";
import type { WorldState } from "./types";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

/** A town with one shaft at (sx, sy), and the player down it. */
function underground(w: WorldState, sx = 20, sy = 20): { x: number; y: number } {
  setTile(w, sx, sy, 1 /* DIRT */);
  expect(sink(w, sx, sy)).toBe(true);
  w.player.x = sx;
  w.player.y = sy;
  useShaft(w);
  return { x: sx, y: sy };
}

/** Put a vein at a chosen cell, tunnelling out to it so the depth is real. */
function veinAt(w: WorldState, x: number, y: number): void {
  carve(w, x, y);
  setTile(w, x, y, ORE_VEIN, "under");
}

describe("taking ore out of the rock", () => {
  it("yields ore and leaves cave floor you can walk through", () => {
    const w = freshWorld();
    const s = underground(w);
    veinAt(w, s.x + 1, s.y);

    const got = mineVein(w, s.x + 1, s.y, 1000)!;
    expect(got.node).toBe("vein");
    expect(got.item).toBe("ore");
    expect(count(w.inventory, "ore")).toBe(NODES.vein.yield);
    // Cave floor, not bedrock: a vein used to be able to dead-end a tunnel,
    // because carving refuses it. Mining it out is what removes that.
    expect(tileAt(w, s.x + 1, s.y, "under")).toBe(CAVE_FLOOR);
  });

  it("finds nothing where there is no vein, and destroys nothing", () => {
    const w = freshWorld();
    const s = underground(w);
    setTile(w, s.x + 2, s.y, BEDROCK, "under");
    expect(mineVein(w, s.x + 2, s.y, 1000)).toBeNull();
    expect(tileAt(w, s.x + 2, s.y, "under")).toBe(BEDROCK);
    expect(count(w.inventory, "ore")).toBe(0);
  });

  it("NEVER regrows — the corridor you dug stays dug", () => {
    // Not an exception to regrow-unless-claimed but the same rule underground:
    // every open cell down there is one you cut, so there is no unclaimed
    // ground for a node to come back onto, and a vein returning would re-block
    // a tunnel you had already paid for in taps.
    const w = freshWorld();
    const s = underground(w);
    veinAt(w, s.x + 1, s.y);
    mineVein(w, s.x + 1, s.y, 1000);

    expect(w.regrow[tileKey(s.x + 1, s.y)]).toBeUndefined();
    expect(pendingRegrowth(w)).toBe(0);
    // Well past any timer in the table, and twice for good measure.
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 100);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 200);
    expect(tileAt(w, s.x + 1, s.y, "under")).toBe(CAVE_FLOOR);
    expect(nodeAt(w, s.x + 1, s.y, "under")).toBeNull();
  });

  it("keeps world.regrow a surface-only record, which is why no migration was needed", () => {
    // The only node that never comes back is the only one that lives
    // underground, so nothing ever writes an "under" cell into a map whose keys
    // carry no layer. If that stops being true, this test is the thing that
    // notices before a save does.
    const w = freshWorld();
    const s = underground(w);
    for (let d = 1; d <= 5; d++) {
      veinAt(w, s.x + d, s.y);
      mineVein(w, s.x + d, s.y, 1000);
    }
    expect(Object.keys(w.regrow)).toHaveLength(0);
  });
});

describe("slate, found further down than most people dig", () => {
  it("is not in a new town's finishes", () => {
    expect(freshWorld().skins.unlocked).not.toContain("slate");
  });

  it("stays unfound at a vein near your shaft", () => {
    const w = freshWorld();
    const s = underground(w);
    const at = { x: s.x + 1, y: s.y };
    expect(depthAt(w, at.x, at.y)).toBeLessThan(SLATE_DEPTH);
    veinAt(w, at.x, at.y);

    const got = mineVein(w, at.x, at.y, 1000)!;
    expect(got.foundSlate).toBe(false);
    expect(w.skins.unlocked).not.toContain("slate");
    expect(count(w.inventory, "ore")).toBe(NODES.vein.yield); // the ore still came
  });

  it("turns up at a vein a long tunnel from your nearest shaft", () => {
    const w = freshWorld();
    const s = underground(w);
    const at = { x: s.x + SLATE_DEPTH, y: s.y };
    veinAt(w, at.x, at.y);

    const got = mineVein(w, at.x, at.y, 1000)!;
    expect(got.depth).toBe(SLATE_DEPTH);
    expect(got.foundSlate).toBe(true);
    expect(w.skins.unlocked).toContain("slate");
  });

  it("is found once, and the second deep vein is just ore", () => {
    const w = freshWorld();
    const s = underground(w);
    veinAt(w, s.x + SLATE_DEPTH, s.y);
    veinAt(w, s.x + SLATE_DEPTH + 1, s.y);

    expect(mineVein(w, s.x + SLATE_DEPTH, s.y, 1000)!.foundSlate).toBe(true);
    const second = mineVein(w, s.x + SLATE_DEPTH + 1, s.y, 2000)!;
    expect(second.foundSlate).toBe(false);
    expect(w.skins.unlocked.filter((id) => id === "slate")).toHaveLength(1);
  });

  it("cannot be reached by walking somewhere remote and digging straight down", () => {
    // Depth is horizontal and measured from your NEAREST shaft, so sinking a new
    // one makes its surroundings shallower and never deeper. There is no
    // surface shortcut to the deep end; you tunnel, or you don't.
    const w = freshWorld();
    underground(w, 200, 200); // a shaft far from town, in virgin ground
    const at = { x: 201, y: 200 };
    veinAt(w, at.x, at.y);

    expect(mineVein(w, at.x, at.y, 1000)!.foundSlate).toBe(false);
    expect(w.skins.unlocked).not.toContain("slate");
  });
});
