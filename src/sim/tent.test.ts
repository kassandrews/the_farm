// Housing YOURSELF — the one commission nobody files.
//
// Every other tent in town goes when the Office Creature stamps a form. There
// is no form for the person who was already here, so the player's tent comes
// down by hand, and only once there is somewhere better to sleep.

import { describe, it, expect } from "vitest";
import { newWorld, buildAt, actionTarget, contextAction, canStrikeTent } from "./game";
import { setTile } from "./world";
import { GRASS } from "../content/tiles";
import { add } from "./inventory";
import { playerHome, assign } from "./assign";
import { makeVillager } from "./villagers";
import { charDef } from "../content/cast";
import type { CharId } from "../content/cast";

const NOW = Date.UTC(2026, 7, 4, 12);

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

/** A sealed 5x5 with a door in the south wall and a bed inside — the same shape
 *  assign.test.ts builds, because this asks the identical question of it. */
function house(
  w: ReturnType<typeof world>,
  ox: number,
  oy: number,
  opts: { bed?: boolean; door?: boolean } = {},
) {
  const { bed = true, door = true } = opts;
  add(w.inventory, "wood", 400);
  for (let y = oy; y <= oy + 4; y++) for (let x = ox; x <= ox + 4; x++) setTile(w, x, y, GRASS);
  for (let y = oy; y <= oy + 4; y++) {
    for (let x = ox; x <= ox + 4; x++) {
      if (x !== ox && x !== ox + 4 && y !== oy && y !== oy + 4) continue;
      const isDoor = x === ox + 2 && y === oy + 4;
      buildAt(w, isDoor && door ? "door" : "wall", x, y, NOW);
    }
  }
  if (bed) buildAt(w, "bed", ox + 1, oy + 1, NOW, "s");
  return { x: ox + 1, y: oy + 1 };
}

/** Stand the player on their own tent. */
function onTent(w: ReturnType<typeof world>) {
  w.player.x = w.homestead.originX;
  w.player.y = w.homestead.originY;
  w.player.target = null;
}

describe("a bed of your own", () => {
  it("is nothing until there is a qualifying room with a bed in it", () => {
    const w = world();
    expect(playerHome(w)).toBeNull();
    const bed = house(w, 40, 40);
    expect(playerHome(w)).toEqual(bed);
  });

  it("is not somebody else's bed", () => {
    const w = world();
    const bed = house(w, 40, 40);
    // A NEWCOMER, and both halves of that matter.
    //
    // It used to be `villagers[0]`, "whoever the fixed cast starts with" — an
    // institution, which cannot be housed at all now (sim/assign.ts
    // `no-resident`). The obvious swap is the starter resident, and that fails
    // the other way: Prudence already has an authored bed, so moving her here
    // FREES that one and the player simply claims it instead. The test says "the
    // only bed in town is theirs now", and somebody with no bed of their own is
    // what makes that sentence true.
    const id = "newcomer:0" as CharId;
    w.villagers.push(makeVillager(charDef({ id, name: "New", form: "blob", fixed: false }), NOW));
    assign(w, id, bed.x, bed.y, NOW);
    // The only bed in town is theirs now, so you are back to having nowhere.
    expect(playerHome(w)).toBeNull();
  });

  it("is the same structural test everybody else's home is given", () => {
    // No door, no home — the identical answer qualify() gives a villager. What
    // playerHome adds over qualify is only "and nobody else has claimed it";
    // it deliberately adds no requirement of its own (no size, no finish).
    const w = world();
    house(w, 40, 40, { door: false }); // walls that meet, but no way in
    expect(playerHome(w)).toBeNull();
  });
});

describe("striking your own tent", () => {
  it("is not offered until you have somewhere else to sleep", () => {
    const w = world();
    onTent(w);
    expect(canStrikeTent(w, w.player.x, w.player.y)).toBe(false);
    expect(actionTarget(w, "dig").kind).not.toBe("strike");

    house(w, 40, 40);
    expect(canStrikeTent(w, w.player.x, w.player.y)).toBe(true);
  });

  it("wins the tile from the held tool, or it could never be reached", () => {
    // The homestead origin is grass and grass is always diggable, so with the
    // shovel winning underfoot the tent could not be struck with the tool the
    // game starts you holding. Same lesson the mailbox taught (sim/game.ts).
    const w = world();
    house(w, 40, 40);
    onTent(w);
    expect(actionTarget(w, "dig").kind).toBe("strike");
  });

  it("costs the origin tile nothing before or after", () => {
    const w = world();
    onTent(w);
    // Before: no bed of your own, so the branch declines and the tile is
    // ordinary ground.
    expect(actionTarget(w, "dig").kind).toBe("tool");

    house(w, 40, 40);
    contextAction(w, "dig", NOW);
    // After: struck, so the branch declines again and it is ground once more.
    expect(actionTarget(w, "dig").kind).toBe("tool");
  });

  it("records that you asked, and says so once", () => {
    const w = world();
    house(w, 40, 40);
    onTent(w);
    const res = contextAction(w, "dig", NOW);
    expect(res.kind).toBe("strike");
    expect(res.changed).toBe(true);
    expect(w.homestead.struckAt).toBe(NOW);
    // And it is not offered a second time.
    expect(canStrikeTent(w, w.player.x, w.player.y)).toBe(false);
  });

  it("does not un-ask itself when the house comes down", () => {
    // The flag is your intent, not the tent's existence. Demolish the house and
    // `playerHome` goes null — the renderer puts the tent back up on that fact
    // alone (render/renderer.ts collectTent), and `struckAt` stays set so
    // rebuilding takes it down again without asking you twice.
    const w = world();
    const bed = house(w, 40, 40);
    onTent(w);
    contextAction(w, "dig", NOW);
    expect(w.homestead.struckAt).not.toBeNull();

    delete w.furniture[`${bed.x},${bed.y}`];
    expect(playerHome(w)).toBeNull();
    expect(w.homestead.struckAt).not.toBeNull();
  });

  it("refuses from anywhere that is not the tent", () => {
    const w = world();
    house(w, 40, 40);
    onTent(w);
    expect(canStrikeTent(w, w.homestead.originX + 1, w.homestead.originY)).toBe(false);
    // And not from another layer, where the tent is not even drawn.
    w.player.layer = "under";
    expect(canStrikeTent(w, w.homestead.originX, w.homestead.originY)).toBe(false);
  });
});
