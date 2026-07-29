// Going down. The player is the only thing in the world that carries a layer,
// so these tests are about the one piece of state that decides whether the
// world you're touching is the ground or what's under it.

import { describe, it, expect } from "vitest";
import {
  newWorld,
  moveTo,
  tick,
  playerTile,
  canDescend,
  canAscend,
  useShaft,
  actionTarget,
  contextAction,
  aheadOf,
  buildAt,
} from "./game";
import { dig, sink, carve, setTile, fillShaft, tileAt } from "./world";
import { BEDROCK, CAVE_FLOOR, GRASS, DIRT, SHAFT, TREE, ORE_VEIN } from "../content/tiles";
import type { WorldState } from "./types";
import { count } from "./inventory";
import { NODES } from "../content/nodes";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 21 });
}

/** Put the player on a shaft of their own making, standing on it. */
function onAShaft(w: WorldState): { x: number; y: number } {
  const at = playerTile(w);
  setTile(w, at.x, at.y, 0 /* GRASS */);
  dig(w, at.x, at.y);
  expect(sink(w, at.x, at.y)).toBe(true);
  return at;
}

/** Down the hole and one step east, onto the landing. Standing ON a shaft, ACT
 *  offers the way up and nothing else — so digging starts by stepping off it,
 *  which is exactly what the landing is for and how it goes on screen. */
function inTunnel(w: WorldState, at: { x: number; y: number }): { x: number; y: number } {
  expect(tileAt(w, at.x + 1, at.y, "under")).toBe(CAVE_FLOOR);
  w.player.x = at.x + 1;
  w.player.y = at.y;
  return { x: at.x + 1, y: at.y };
}

describe("using a shaft", () => {
  it("starts you on the surface", () => {
    expect(freshWorld().player.layer).toBe("surface");
  });

  it("needs a shaft underfoot, from either end", () => {
    const w = freshWorld();
    expect(canDescend(w)).toBe(false);
    expect(useShaft(w)).toBe(false);
    onAShaft(w);
    expect(canDescend(w)).toBe(true);
    expect(useShaft(w)).toBe(true);
    expect(w.player.layer).toBe("under");
  });

  it("comes back up the same hole", () => {
    const w = freshWorld();
    onAShaft(w);
    useShaft(w);
    expect(canAscend(w)).toBe(true);
    expect(canDescend(w)).toBe(false); // you're below it now
    useShaft(w);
    expect(w.player.layer).toBe("surface");
  });

  it("keeps the same coordinate — one world, no interior scene", () => {
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);
    expect(playerTile(w)).toEqual(at);
  });

  it("drops a walk target, because the ground you were crossing is gone", () => {
    const w = freshWorld();
    onAShaft(w);
    w.player.target = { x: 40, y: 40 };
    useShaft(w);
    expect(w.player.target).toBeNull();
  });

  it("cannot be sealed in — filling a shaft is refused while you're below", () => {
    // The obvious way to lose a player. A shaft is stored once, on the surface,
    // and it is also the only way back: closing one from above while someone is
    // underground would leave them in a cave with no exit. The refusal is on
    // the LAYER rather than on this particular hole, so a second open entrance
    // can't talk it into saying yes.
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);
    expect(fillShaft(w, at.x, at.y)).toBe(false);
    expect(canAscend(w)).toBe(true); // still a way out
    useShaft(w);
    expect(fillShaft(w, at.x, at.y)).toBe(true); // fine once you're back up
  });
});

describe("the landing at the bottom", () => {
  it("gives you somewhere to step off the ladder", () => {
    // Without it you arrive in a one-tile room whose only exit is the tile you
    // are standing on, and ACT can offer you nothing but to leave again — there
    // is no first swing of the pick. This passed every test and failed on
    // screen, which is why it is a test now.
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      expect(tileAt(w, at.x + dx, at.y + dy, "under")).toBe(CAVE_FLOOR);
      moveTo(w, at.x + dx, at.y + dy);
      expect(w.player.target).not.toBeNull();
    }
  });

  it("does not eat a vein it happens to land beside", () => {
    // The landing carves, and carving refuses ore for the same reason the
    // shovel does: a vein is gathered, never cut away.
    const w = freshWorld();
    const at = playerTile(w);
    setTile(w, at.x, at.y, GRASS);
    dig(w, at.x, at.y);
    setTile(w, at.x + 1, at.y, ORE_VEIN, "under");
    sink(w, at.x, at.y);
    expect(tileAt(w, at.x + 1, at.y, "under")).toBe(ORE_VEIN);
  });
});

describe("taking a shaft back", () => {
  it("fills in with the erase tool, and leaves the tunnel cut", () => {
    // ACT has no undo, so the take-it-back verb is the one that takes it back.
    const w = freshWorld();
    const at = onAShaft(w);
    const res = buildAt(w, "erase", at.x, at.y, Date.now());
    expect(res.changed).toBe(true);
    expect(tileAt(w, at.x, at.y)).toBe(DIRT);
    expect(tileAt(w, at.x, at.y, "under")).toBe(CAVE_FLOOR); // the lid, not the room
  });
});

describe("the heading", () => {
  it("is taken from what you asked for, even when the way is refused", () => {
    // The tunnelling gesture: walk at the rock, then cut it. If the heading
    // only followed movement that succeeded, the one direction you could never
    // aim at would be the one with a wall in it.
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);
    moveTo(w, at.x, at.y - 5); // north, into solid rock
    expect(w.player.target).toBeNull();
    expect(w.player.heading).toBe("n");
    expect(aheadOf(w)).toEqual({ x: at.x, y: at.y - 1 });
  });

  it("follows the walk itself, so rounding a corner re-aims the shovel", () => {
    const w = freshWorld();
    const at = onAShaft(w);
    for (const c of [
      { x: at.x + 1, y: at.y },
      { x: at.x + 2, y: at.y },
      { x: at.x + 2, y: at.y + 1 },
    ]) {
      setTile(w, c.x, c.y, GRASS);
    }
    moveTo(w, at.x + 2, at.y);
    for (let i = 0; i < 200; i++) tick(w, 1 / 60, Date.now());
    expect(w.player.heading).toBe("e");
    moveTo(w, at.x + 2, at.y + 1);
    for (let i = 0; i < 200; i++) tick(w, 1 / 60, Date.now());
    expect(w.player.heading).toBe("s");
  });
});

describe("ACT, on both sides of the ground", () => {
  it("is three taps on one tile: dig, sink, descend", () => {
    // The whole gesture, in the order a player meets it. No new tool and no new
    // button — digging dirt was a no-op, so the second dig was free to claim.
    const w = freshWorld();
    const at = playerTile(w);
    setTile(w, at.x, at.y, GRASS);
    const now = Date.now();

    expect(contextAction(w, "dig", now).kind).toBe("dig");
    expect(tileAt(w, at.x, at.y)).toBe(DIRT);

    expect(actionTarget(w, "dig")).toEqual({ x: at.x, y: at.y, kind: "tool" });
    expect(contextAction(w, "dig", now).kind).toBe("sink");
    expect(tileAt(w, at.x, at.y)).toBe(SHAFT);

    expect(actionTarget(w, "dig")).toEqual({ x: at.x, y: at.y, kind: "shaft" });
    expect(contextAction(w, "dig", now).kind).toBe("shaft");
    expect(w.player.layer).toBe("under");
  });

  it("offers the way back with any tool in hand", () => {
    const w = freshWorld();
    onAShaft(w);
    useShaft(w);
    expect(actionTarget(w, "water").kind).toBe("shaft");
    expect(contextAction(w, "water", Date.now()).kind).toBe("shaft");
    expect(w.player.layer).toBe("surface");
  });

  it("aims underground at the rock ahead, and never at the ground above", () => {
    // The failure this is written against: actionTarget was surface-only, so
    // ACT below would have pointed at whatever was standing on the field above
    // you. A tree overhead must be invisible from a tunnel.
    const w = freshWorld();
    const shaft = onAShaft(w);
    useShaft(w);
    const at = inTunnel(w, shaft);
    setTile(w, at.x, at.y - 1, TREE); // on the SURFACE, one north
    w.player.heading = "n";

    const target = actionTarget(w, "dig");
    expect(target).toEqual({ x: at.x, y: at.y - 1, kind: "tool" });
    expect(contextAction(w, "dig", Date.now()).kind).toBe("carve");
    expect(tileAt(w, at.x, at.y - 1, "under")).toBe(CAVE_FLOOR);
    expect(tileAt(w, at.x, at.y - 1)).toBe(TREE); // the surface is untouched
  });

  it("promises nothing when the tool can't do it", () => {
    // The reticle is the promise: the rock face lights up for the shovel (and,
    // at a vein, for the axe) and for nothing else. A watering can underground
    // aims at nothing whatever is in front of it.
    const w = freshWorld();
    const shaft = onAShaft(w);
    useShaft(w);
    const at = inTunnel(w, shaft);
    w.player.heading = "e";
    expect(actionTarget(w, "dig").kind).toBe("tool");
    expect(actionTarget(w, "water").kind).toBe("none");

    setTile(w, at.x + 1, at.y, ORE_VEIN, "under");
    expect(actionTarget(w, "water").kind).toBe("none");
    expect(contextAction(w, "water", Date.now()).changed).toBe(false);
    expect(tileAt(w, at.x + 1, at.y, "under")).toBe(ORE_VEIN); // untouched
  });

  it("aims the SHOVEL at a vein, without making you change tools", () => {
    // Down here the shovel is a pick, and rock and ore are met at the same face
    // in the same swing. Stopping to switch tools at a vein would break the one
    // continuous verb the tunnel has, for a distinction only the code cares
    // about — so both tools point at it and both take it out.
    const w = freshWorld();
    const shaft = onAShaft(w);
    useShaft(w);
    const at = inTunnel(w, shaft);
    w.player.heading = "e";
    setTile(w, at.x + 1, at.y, ORE_VEIN, "under");

    expect(actionTarget(w, "dig")).toEqual({ x: at.x + 1, y: at.y, kind: "gather" });
    expect(actionTarget(w, "gather")).toEqual({ x: at.x + 1, y: at.y, kind: "gather" });
    expect(contextAction(w, "dig", Date.now()).kind).toBe("gather");
    expect(tileAt(w, at.x + 1, at.y, "under")).toBe(CAVE_FLOOR);
    expect(count(w.inventory, "ore")).toBe(NODES.vein.yield);
  });

  it("does not warm a villager standing on the ground above you", () => {
    // Distance alone stopped being enough the moment a coordinate could mean
    // two places: working in a tunnel must not befriend whoever is crossing the
    // field over your head, having seen nothing.
    const w = freshWorld();
    const shaft = onAShaft(w);
    useShaft(w);
    const at = inTunnel(w, shaft);
    const v = w.villagers[0];
    v.x = at.x;
    v.y = at.y;
    const before = v.friendship;
    w.player.heading = "e";
    expect(contextAction(w, "dig", Date.now()).kind).toBe("carve");
    expect(v.friendship).toBe(before);
  });
});

describe("walking underground", () => {
  it("collides with rock, not with the ground above", () => {
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);

    // One carved cell east, solid rock beyond it.
    setTile(w, at.x + 1, at.y, BEDROCK, "under");
    carve(w, at.x + 1, at.y);
    setTile(w, at.x + 2, at.y, BEDROCK, "under");

    moveTo(w, at.x + 1, at.y);
    for (let i = 0; i < 200; i++) tick(w, 1 / 60, Date.now());
    expect(playerTile(w)).toEqual({ x: at.x + 1, y: at.y });

    // The rock refuses the tap outright — moveTo checks the player's layer.
    moveTo(w, at.x + 2, at.y);
    expect(w.player.target).toBeNull();
  });

  it("refuses a tap onto open surface ground while you're below it", () => {
    // The same coordinate is walkable above and solid below; the layer is what
    // tells them apart, and forgetting to pass it is how the player walks
    // through rock.
    const w = freshWorld();
    const at = onAShaft(w);
    useShaft(w);
    const far = { x: at.x + 6, y: at.y };
    expect(tileAt(w, far.x, far.y, "under")).not.toBe(CAVE_FLOOR);
    moveTo(w, far.x, far.y);
    expect(w.player.target).toBeNull();
  });
});
