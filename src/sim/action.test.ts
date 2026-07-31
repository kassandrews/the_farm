// The ACT contract: the reticle is a promise.
//
// `actionTarget` is the single place that decides which tile the action button
// touches; the renderer draws it and `contextAction` executes it. These tests
// exist because the two used to be computed separately, and drifted: a tree in
// reach lit up green while ACT quietly dug the ground underfoot instead.

import { describe, it, expect } from "vitest";
import { newWorld, actionTarget, contextAction, playerTile } from "./game";
import { plant, water, isRipe } from "./crops";
import { tileAt, setTile, tileKey } from "./world";
import { GRASS, TREE, DIRT, MUSHROOM } from "../content/tiles";
import type { WorldState, Tool } from "./types";
import { cropDef } from "../content/crops";

const HOUR = 3_600_000;
const TOOLS: Tool[] = ["dig", "gather", "plant", "water"];

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

/** Find a generated tree near town, and stand the player on the grass beside it
 *  facing it — the exact situation the reticle used to lie about. */
function besideATree(w: WorldState): { tree: { x: number; y: number }; feet: { x: number; y: number } } {
  for (let r = 1; r < 60; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (tileAt(w, x, y) !== TREE) continue;
        w.player.x = x - 1;
        w.player.y = y;
        w.player.facing = 1;
        setTile(w, x - 1, y, GRASS); // known ground, so "dig" has work to do
        return { tree: { x, y }, feet: { x: x - 1, y } };
      }
    }
  }
  throw new Error("no tree generated nearby");
}

/** Every tile and crop within `r` of the player, for diffing what an action did. */
function snapshot(w: WorldState, r = 3): Map<string, string> {
  const shot = new Map<string, string>();
  const { x, y } = playerTile(w);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const key = tileKey(x + dx, y + dy);
      const crop = w.crops[key];
      shot.set(key, `${tileAt(w, x + dx, y + dy)}/${crop ? `${crop.cropId}:${crop.stage}` : "-"}`);
    }
  }
  return shot;
}

function changedTiles(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...after].filter(([k, v]) => before.get(k) !== v).map(([k]) => k);
}

/** Grow the crop under the player to ripe by keeping it soaked. */
function ripen(w: WorldState, x: number, y: number, t0: number): number {
  plant(w, x, y, "carrot", t0);
  const hours = cropDef("carrot").stages.reduce((s, st) => s + st.hours, 0);
  let now = t0;
  for (let h = 0; h <= hours; h++) {
    now = t0 + h * HOUR;
    water(w, x, y, now);
  }
  return now;
}

describe("action target", () => {
  it("aims the held tool at your feet, not at a tree in reach", () => {
    const w = freshWorld();
    const { tree, feet } = besideATree(w);
    // Digging grass works, so the dig is what happens — and the reticle has to
    // say so rather than lighting up the tree.
    const target = actionTarget(w, "dig");
    expect(target).toEqual({ ...feet, kind: "tool" });
    contextAction(w, "dig", 1000);
    expect(tileAt(w, tree.x, tree.y)).toBe(TREE); // still standing
    expect(tileAt(w, feet.x, feet.y)).toBe(DIRT);
  });

  it("aims at the tree when the gather tool is held", () => {
    const w = freshWorld();
    const { tree } = besideATree(w);
    expect(actionTarget(w, "gather")).toEqual({ ...tree, kind: "gather" });
    expect(contextAction(w, "gather", 1000).kind).toBe("gather");
    expect(tileAt(w, tree.x, tree.y)).toBe(DIRT);
  });

  it("aims at the tree when the held tool has nothing to do", () => {
    const w = freshWorld();
    const { tree, feet } = besideATree(w);
    setTile(w, feet.x, feet.y, DIRT); // nothing here to water, nothing to dig
    expect(actionTarget(w, "water")).toEqual({ ...tree, kind: "gather" });
    expect(actionTarget(w, "dig")).toEqual({ ...tree, kind: "gather" });
  });

  it("aims at a ripe crop underfoot whatever tool is held", () => {
    const w = freshWorld();
    const { tree, feet } = besideATree(w);
    const now = ripen(w, feet.x, feet.y, 1_000_000);
    expect(isRipe(w, feet.x, feet.y)).toBe(true);
    for (const tool of TOOLS) {
      expect(actionTarget(w, tool)).toEqual({ ...feet, kind: "harvest" });
    }
    expect(contextAction(w, "gather", now).kind).toBe("harvest");
    expect(tileAt(w, tree.x, tree.y)).toBe(TREE); // the tree never got hijacked
  });

  it("reports 'none' when ACT would do nothing, so the reticle can go quiet", () => {
    const w = freshWorld();
    w.player.x = 40; // open country, no nodes claimed to be near
    w.player.y = 40;
    setTile(w, 40, 40, DIRT);
    const target = actionTarget(w, "water");
    if (target.kind !== "gather") {
      // (a generated tree could sit beside us; only assert when it doesn't)
      expect(target).toEqual({ x: 40, y: 40, kind: "none" });
      expect(contextAction(w, "water", 1000).changed).toBe(false);
    }
  });

  it("only ever changes the tile it named — for every tool, in every setup", () => {
    const setups: ((w: WorldState) => void)[] = [
      (w) => besideATree(w),
      (w) => {
        const { feet } = besideATree(w);
        setTile(w, feet.x, feet.y, DIRT);
      },
      (w) => {
        const { feet } = besideATree(w);
        setTile(w, feet.x, feet.y, MUSHROOM);
      },
      (w) => {
        const { feet } = besideATree(w);
        plant(w, feet.x, feet.y, "carrot", 1000);
      },
      (w) => {
        const { feet } = besideATree(w);
        ripen(w, feet.x, feet.y, 1_000_000);
      },
    ];

    for (const setup of setups) {
      for (const tool of TOOLS) {
        const w = freshWorld();
        setup(w);
        const target = actionTarget(w, tool);
        const before = snapshot(w);
        contextAction(w, tool, 100 * HOUR);
        const changed = changedTiles(before, snapshot(w));
        // Nothing outside the promised tile may move. An action that refuses is
        // fine (no changes); one that touches a DIFFERENT tile is the bug.
        expect(changed.every((k) => k === tileKey(target.x, target.y))).toBe(true);
      }
    }
  });
});
