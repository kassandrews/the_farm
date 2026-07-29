// Going down. The player is the only thing in the world that carries a layer,
// so these tests are about the one piece of state that decides whether the
// world you're touching is the ground or what's under it.

import { describe, it, expect } from "vitest";
import { newWorld, moveTo, tick, playerTile, canDescend, canAscend, useShaft } from "./game";
import { dig, sink, carve, setTile, fillShaft, tileAt } from "./world";
import { BEDROCK, CAVE_FLOOR } from "../content/tiles";
import type { WorldState } from "./types";

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
