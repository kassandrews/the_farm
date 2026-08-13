// The lamp — ore's sink, and the first thing that can be installed underground.
//
// Two families of test here, and they are about different fears.
//
// The first is the ORE RULE. DESIGN §Materials permits ore as an alternative and
// never a requirement, so the danger is not that a lamp costs metal — it's that
// something you NEED starts to. A wall, a bed or a floor with ore in its cost
// would gate housing behind digging, quietly, in a table nobody re-reads.
//
// The second is LAYER ISOLATION. Furniture used to be one record that meant the
// surface, and five modules read it that way (assign, home, housing, errands,
// commission). A lamp in a tunnel must be invisible to every one of them — a bed
// in the rock is not a home, and a light forty feet down is not a shelf in your
// bedroom.

import { describe, it, expect } from "vitest";
import { newWorld, buildAt, playerTile, UNDER_TOOLS, buildCost, isFurnitureTool } from "./game";
import { defaultSkin } from "../content/skins";
import { FURNITURE, furnitureDef } from "../content/furniture";
import { STRUCTURES } from "../content/structures";
import { furnitureAt, furnitureFor, canPlaceFurniture } from "./furniture";
import { qualify, beds } from "./assign";
import { describeHome } from "./home";
import { isWalkable, dig, sink, setTile, tileAt } from "./world";
import { GRASS, CAVE_FLOOR } from "../content/tiles";
import { add, count } from "./inventory";
import { beginStroke, captureCell, endStroke, undoStroke } from "./undo";
import type { WorldState } from "./types";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

/** Sink a shaft under the player and climb down it, standing one step east on
 *  the landing — the same route descent.test.ts takes, for the same reason: it
 *  is how it happens on screen. */
function inTunnel(w: WorldState): { x: number; y: number } {
  const at = playerTile(w);
  setTile(w, at.x, at.y, GRASS);
  dig(w, at.x, at.y, 0);
  expect(sink(w, at.x, at.y)).toBe(true);
  w.player.layer = "under";
  expect(tileAt(w, at.x + 1, at.y, "under")).toBe(CAVE_FLOOR);
  w.player.x = at.x + 1;
  w.player.y = at.y;
  return { x: at.x + 1, y: at.y };
}

describe("ore is an alternative, never a requirement", () => {
  it("nothing you could NEED costs ore", () => {
    // The whole safety of ore having a sink. A lamp is a choice; a wall, a door
    // and a bed are what housing is made of, and a commission asks for all
    // three. Put ore in any of those costs and giving somebody a home requires
    // going underground first — which is the one thing DESIGN forbids ore to do.
    // Asked through buildCost rather than off the def, because a cost may now be
    // a bare number meaning "N of the finish's own material" (items.BuildPrice).
    // Resolving it is what turns that into the item list this rule is about —
    // and the resolution can never produce ore, which is the rule holding.
    for (const def of Object.values(STRUCTURES)) {
      for (const cls of def.finishes) {
        expect(buildCost(def.id, defaultSkin(cls)).ore).toBeUndefined();
      }
    }
    for (const def of Object.values(FURNITURE)) {
      // LIGHTS are the exemption, not "the lamp" — the rule was written when
      // there was one of them and read as a hardcoded id, which is a rule about
      // a row rather than about a category. A light is the thing ore buys, and
      // a second one arriving should not have needed this test edited at all.
      if (def.light) continue;
      for (const cls of def.finishes) {
        expect(buildCost(def.id, defaultSkin(cls)).ore).toBeUndefined();
      }
    }
  });

  it("and every ore cost buys a light — the exemption runs both ways", () => {
    // The other half of the rule above, which nothing asserted while `lamp` was
    // spelled out by name. Without this, any row could quietly cost ore by
    // adding `light: true` to itself, and the invariant would wave it through.
    for (const def of Object.values(FURNITURE)) {
      for (const cls of def.finishes) {
        if (buildCost(def.id, defaultSkin(cls)).ore !== undefined) {
          expect(def.light, `${def.id} costs ore but is not a light`).toBe(true);
        }
      }
    }
  });

  it("is the only row made of metal, and it costs nothing else", () => {
    // Not a rule so much as a fact worth pinning: if the lamp ever grows a wood
    // cost, "you cannot build one until you have been down there" stops being
    // the only thing standing between you and one.
    const lamp = furnitureDef("lamp");
    expect(lamp.cost).toEqual({ ore: 2 });
  });

  it("no acceptance test can see a lamp", () => {
    // Taste is delight and never a gate (DESIGN), and a lamp is the newest thing
    // a room could be judged on. Two identical rooms, one lit: `qualify` must
    // not be able to tell them apart.
    const w = freshWorld();
    const bed = beds(w)[0];
    expect(bed).toBeDefined();
    const before = qualify(w, bed.x, bed.y);
    add(w.inventory, "ore", 4);
    // SOMEWHERE FREE IN THE SAME ROOM, found rather than assumed.
    //
    // This was `bed.x + 1, bed.y` — the cell beside the bed — which held until a
    // fireplace was authored into that exact cell. A test that pins a coordinate
    // inside an AUTHORED room is really asserting how somebody's house is
    // furnished, and it fails on a change that has nothing to do with what it is
    // about. What it needs is any empty cell under the same roof.
    expect(before.ok).toBe(true);
    const spot = [...(before.ok ? before.room.interior : [])]
      .map((k) => k.split(",").map(Number))
      .find(([x, y]) => canPlaceFurniture(w, x, y, "lamp", "s"));
    expect(spot, "her house has nowhere to stand a lamp").toBeDefined();
    expect(buildAt(w, "lamp", spot![0], spot![1], Date.now()).changed).toBe(true);
    const after = qualify(w, bed.x, bed.y);
    expect(after.ok).toBe(before.ok);
    expect(after.ok && before.ok && after.room.interior.size).toBe(
      before.ok && after.ok && before.room.interior.size,
    );
  });
});

describe("a lamp in the rock is not furniture in a house", () => {
  it("goes into its own record, and the surface never sees it", () => {
    const w = freshWorld();
    const at = inTunnel(w);
    add(w.inventory, "ore", 2);
    expect(buildAt(w, "lamp", at.x, at.y, Date.now(), "s", "under").changed).toBe(true);

    expect(furnitureAt(w, at.x, at.y, "under")).not.toBeNull();
    expect(furnitureAt(w, at.x, at.y)).toBeNull(); // the default is the surface
    expect(Object.keys(w.furniture)).not.toContain(`${at.x},${at.y}`);
    expect(Object.keys(w.underFurniture)).toContain(`${at.x},${at.y}`);
  });

  it("is invisible to the five modules that read furniture as a surface fact", () => {
    const w = freshWorld();
    const at = inTunnel(w);
    add(w.inventory, "ore", 2);
    const bedsBefore = beds(w).length;
    const notes = describeHome(w, w.villagers[0]);
    buildAt(w, "lamp", at.x, at.y, Date.now(), "s", "under");
    expect(beds(w).length).toBe(bedsBefore);
    expect(describeHome(w, w.villagers[0])).toEqual(notes);
  });

  it("never blocks a tunnel, because nothing placeable down there is solid", () => {
    // isWalkable returns early underground — the rock is the only thing that can
    // stop you — so a solid piece would be invisible to the pathfinder and to
    // the Mole, who walks these corridors. This is the test world.ts's comment
    // points at.
    // The tools that PLACE something, which is what the claim is about. Named
    // by what they are rather than by excluding erase: the underground palette
    // has since grown `move`, which places nothing of its own either, and a list
    // of exceptions grows a hole every time somebody adds a verb to it.
    for (const t of UNDER_TOOLS) {
      if (!isFurnitureTool(t)) continue;
      expect(furnitureDef(t).solid).toBe(false);
    }
    const w = freshWorld();
    const at = inTunnel(w);
    add(w.inventory, "ore", 2);
    buildAt(w, "lamp", at.x, at.y, Date.now(), "s", "under");
    expect(isWalkable(w, at.x, at.y, "under")).toBe(true);
  });

  it("won't go into rock nobody has cut", () => {
    const w = freshWorld();
    const at = inTunnel(w);
    // Two tiles further out is solid bedrock — no floor, so no lamp.
    expect(canPlaceFurniture(w, at.x + 6, at.y, "lamp", "s", "under")).toBe(false);
  });

  it("comes back up with its ore when you take it down", () => {
    const w = freshWorld();
    const at = inTunnel(w);
    add(w.inventory, "ore", 2);
    buildAt(w, "lamp", at.x, at.y, Date.now(), "s", "under");
    expect(count(w.inventory, "ore")).toBe(0);
    expect(buildAt(w, "erase", at.x, at.y, Date.now(), "s", "under").changed).toBe(true);
    expect(count(w.inventory, "ore")).toBe(2);
    expect(furnitureAt(w, at.x, at.y, "under")).toBeNull();
  });
});

describe("undo knows which layer the stroke was on", () => {
  it("restores the tunnel and leaves the field overhead alone", () => {
    // The bug this exists for: keys are bare "x,y" in both records, so an undo
    // that wrote to world.build for an underground stroke would delete whatever
    // the player has standing directly above. Worse, you can climb the ladder
    // between the stroke and pressing undo — which is why the layer is fixed at
    // beginStroke rather than read from the player at undo time.
    const w = freshWorld();
    const at = inTunnel(w);
    add(w.inventory, "ore", 2);
    add(w.inventory, "wood", 20);

    // Something of yours on the surface at the same coordinate. Step off the
    // tile first: nothing solid goes down on the cell you are standing on
    // (sim/game.ts), and this test is about layers, not about where you stand.
    w.player.layer = "surface";
    w.player.x = at.x + 3;
    w.player.y = at.y + 3;
    expect(buildAt(w, "wall", at.x, at.y, Date.now()).changed).toBe(true);
    const wallBefore = { ...w.build[`${at.x},${at.y}`] };

    // Now the lamp, below it, as one stroke — and climb out before undoing.
    w.player.layer = "under";
    beginStroke(w, "the lamp");
    captureCell(w, at.x, at.y);
    buildAt(w, "lamp", at.x, at.y, Date.now(), "s", "under");
    endStroke(w);
    w.player.layer = "surface";

    expect(undoStroke(w)).toBe(true);
    expect(furnitureFor(w, "under")[`${at.x},${at.y}`]).toBeUndefined();
    expect(w.build[`${at.x},${at.y}`]).toEqual(wallBefore); // untouched
    expect(count(w.inventory, "ore")).toBe(2); // and the metal came back
  });
});
