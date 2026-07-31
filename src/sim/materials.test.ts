import { describe, it, expect } from "vitest";
import { newWorld, contextAction, BUILD_COSTS, buildAt } from "./game";
import { count, add, spend, canAfford, refund, shortfall, emptyInventory } from "./inventory";
import { gather, nodeAt, nodeNear, updateRegrowth, pendingRegrowth, updateReclaim } from "./gather";
import { tileAt, setTile, tileKey, generatedTile, dig, sink, RECLAIM_MS } from "./world";
import { GRASS, DIRT, TREE, ROCK, PLANK, MUSHROOM, FARMLAND, SHAFT } from "../content/tiles";
import { NODES } from "../content/nodes";

const HOUR = 3_600_000;

function freshWorld() {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

/** Find a generated tree near the town for tests that need a real one. */
function findNode(w: ReturnType<typeof newWorld>, want: number): { x: number; y: number } {
  for (let r = 1; r < 60; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (tileAt(w, x, y) === want) return { x, y };
      }
    }
  }
  throw new Error("no node generated nearby");
}

describe("inventory", () => {
  it("adds, spends, and refuses to overspend", () => {
    const inv = emptyInventory();
    add(inv, "wood", 5);
    expect(count(inv, "wood")).toBe(5);
    expect(canAfford(inv, { wood: 3 })).toBe(true);
    expect(spend(inv, { wood: 3 })).toBe(true);
    expect(count(inv, "wood")).toBe(2);
    expect(spend(inv, { wood: 99 })).toBe(false);
    expect(count(inv, "wood")).toBe(2); // unchanged — never a partial deduction
  });

  it("never partially deducts a multi-item cost it can't cover", () => {
    const inv = emptyInventory();
    add(inv, "wood", 10);
    expect(spend(inv, { wood: 5, stone: 5 })).toBe(false);
    expect(count(inv, "wood")).toBe(10); // wood not quietly taken
  });

  it("reports exactly what's missing", () => {
    const inv = emptyInventory();
    add(inv, "wood", 2);
    expect(shortfall(inv, { wood: 5, stone: 3 })).toEqual({ wood: 3, stone: 3 });
  });

  it("refunds exactly what something cost", () => {
    const inv = emptyInventory();
    add(inv, "wood", 4);
    spend(inv, { wood: 4 });
    refund(inv, { wood: 4 });
    expect(count(inv, "wood")).toBe(4);
  });

  it("has no capacity — a pickup can never be refused", () => {
    const inv = emptyInventory();
    for (let i = 0; i < 5000; i++) add(inv, "wood", 100);
    expect(count(inv, "wood")).toBe(500_000);
  });
});

describe("gathering", () => {
  it("generates trees and rocks deterministically", () => {
    const a = freshWorld();
    const b = freshWorld();
    const spot = findNode(a, TREE);
    expect(tileAt(b, spot.x, spot.y)).toBe(TREE);
    expect(generatedTile(a.seed, a.homestead.spot, spot.x, spot.y)).toBe(TREE);
  });

  it("keeps a clearing around the homestead so you can always build", () => {
    const w = freshWorld();
    const { originX, originY } = w.homestead;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const t = tileAt(w, originX + dx, originY + dy);
        expect(t).not.toBe(TREE);
        expect(t).not.toBe(ROCK);
      }
    }
  });

  it("felling a tree banks its yield and clears the ground", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    const before = count(w.inventory, "wood");
    const got = gather(w, x, y, 1000)!;
    expect(got.item).toBe("wood");
    expect(count(w.inventory, "wood")).toBe(before + NODES.tree.yield);
    expect(tileAt(w, x, y)).toBe(DIRT);
    expect(nodeAt(w, x, y)).toBeNull();
  });

  it("gathers a node you're standing NEXT to — you can never stand on one", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    // Nodes are solid, so the player can only ever be beside one.
    w.player.x = x - 1;
    w.player.y = y;
    w.player.facing = 1;
    const before = count(w.inventory, "wood");
    const res = contextAction(w, "gather", 1000);
    expect(res.kind).toBe("gather");
    expect(count(w.inventory, "wood")).toBe(before + NODES.tree.yield);
    expect(tileAt(w, x, y)).toBe(DIRT);
  });

  it("falls back to felling when the held tool has nothing to do", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    w.player.x = x - 1;
    w.player.y = y;
    w.player.facing = 1;
    // Watering bare ground does nothing — so the tree in reach is the obvious
    // intent, and ACT should do it rather than refuse.
    const res = contextAction(w, "water", 1000);
    expect(res.kind).toBe("gather");
    expect(tileAt(w, x, y)).toBe(DIRT);
  });

  it("never hijacks a tool that CAN act — you can build at the forest edge", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    w.player.x = x - 1;
    w.player.y = y;
    w.player.facing = 1; // facing the tree
    const wood = count(w.inventory, "wood");
    // Placement lives in build mode and targets a TAPPED tile, so an adjacent
    // tree has no way to hijack it — the bug this guards against is now
    // structurally impossible rather than merely avoided.
    const res = buildAt(w, "plank", w.player.x, w.player.y, 1000);
    expect(res.changed).toBe(true);
    expect(tileAt(w, x, y)).toBe(TREE); // tree still standing
    expect(count(w.inventory, "wood")).toBe(wood - 1); // spent, not gained
  });

  it("finds a node in any adjacent direction, not just the way you face", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    w.player.x = x;
    w.player.y = y + 1; // below it
    w.player.facing = 1; // facing away
    expect(nodeNear(w, x, y + 1, 1)).toMatchObject({ x, y, node: "tree" });
  });

  it("regrows on the real clock when the ground is left bare", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    gather(w, x, y, 1000);
    expect(pendingRegrowth(w)).toBe(1);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! - 1); // not yet
    expect(tileAt(w, x, y)).toBe(DIRT);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! + 1); // now
    expect(tileAt(w, x, y)).toBe(TREE);
    expect(pendingRegrowth(w)).toBe(0);
  });

  it("NEVER regrows on ground you've claimed — the clearing stays yours", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    gather(w, x, y, 1000);
    setTile(w, x, y, PLANK); // you built here
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 10);
    expect(tileAt(w, x, y)).toBe(PLANK); // your floor survived
    expect(pendingRegrowth(w)).toBe(0); // and it stopped nagging
  });

  it("treats a planted crop as a claim too", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    gather(w, x, y, 1000);
    w.crops[tileKey(x, y)] = {
      cropId: "carrot",
      stage: 0,
      plantedAt: 1000,
      growthMs: 0,
      lastUpdate: 1000,
      wateredUntil: 1000,
    };
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 10);
    expect(tileAt(w, x, y)).not.toBe(TREE);
  });

  it("the woods refill across a long absence with no catch-up loop", () => {
    const w = freshWorld();
    const first = findNode(w, TREE);
    gather(w, first.x, first.y, 1000);
    // Return a week later: one call restores everything due.
    updateRegrowth(w, 1000 + 7 * 24 * HOUR);
    expect(tileAt(w, first.x, first.y)).toBe(TREE);
  });
});

// The other half of the renewable rule. A hole used to be the one thing in the
// world that never healed, which made the shovel the only verb you had to tidy up
// after (sim/gather.ts §"Grass closing over").
describe("grass closes over what you dug", () => {
  /** A patch of plain grass, so a dig is a dig and not a felling. */
  function findGrass(w: ReturnType<typeof newWorld>): { x: number; y: number } {
    for (let r = 1; r < 60; r++) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (tileAt(w, x, y) === GRASS && !w.build[tileKey(x, y)]) return { x, y };
        }
      }
    }
    throw new Error("no grass nearby");
  }

  it("grasses over on the real clock, and not before", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    dig(w, x, y, 1000);
    expect(tileAt(w, x, y)).toBe(DIRT);
    updateReclaim(w, 1000 + RECLAIM_MS - 1); // not yet
    expect(tileAt(w, x, y)).toBe(DIRT);
    updateReclaim(w, 1000 + RECLAIM_MS + 1); // now
    expect(tileAt(w, x, y)).toBe(GRASS);
  });

  it("takes longer than either node regrows — you never watch it happen", () => {
    expect(RECLAIM_MS).toBeGreaterThan(NODES.tree.regrowMs!);
    expect(RECLAIM_MS).toBeGreaterThan(NODES.rock.regrowMs!);
  });

  it("leaves tilled, paved and built ground alone, and stops tracking it", () => {
    for (const claim of [FARMLAND, PLANK] as const) {
      const w = freshWorld();
      const { x, y } = findGrass(w);
      dig(w, x, y, 1000);
      setTile(w, x, y, claim); // you made something of it
      updateReclaim(w, 1000 + RECLAIM_MS * 10);
      expect(tileAt(w, x, y)).toBe(claim);
      expect(Object.keys(w.reclaim)).toHaveLength(0); // and it stopped watching
    }
  });

  it("leaves dirt under a wall alone — a floor is not an abandoned hole", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    dig(w, x, y, 1000);
    w.build[tileKey(x, y)] = { id: "wall", finish: w.skins.selected.wood };
    updateReclaim(w, 1000 + RECLAIM_MS * 10);
    expect(tileAt(w, x, y)).toBe(DIRT);
  });

  it("never closes over a shaft — the second dig is the way down", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    dig(w, x, y, 1000);
    expect(sink(w, x, y)).toBe(true);
    updateReclaim(w, 1000 + RECLAIM_MS * 10);
    expect(tileAt(w, x, y)).toBe(SHAFT);
  });

  it("closes across a long absence with one call, like the woods", () => {
    const w = freshWorld();
    const { x, y } = findGrass(w);
    dig(w, x, y, 1000);
    updateReclaim(w, 1000 + 7 * 24 * HOUR);
    expect(tileAt(w, x, y)).toBe(GRASS);
  });

  it("a felled tree's dirt is left to the tree, not grassed over under it", () => {
    // Two timers on one tile is the race `reclaim` was shaped to avoid: gathering
    // books regrowth and must NOT also book a reclaim.
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    gather(w, x, y, 1000);
    expect(Object.keys(w.reclaim)).toHaveLength(0);
    updateReclaim(w, 1000 + RECLAIM_MS * 10);
    updateRegrowth(w, 1000 + RECLAIM_MS * 10);
    expect(tileAt(w, x, y)).toBe(TREE);
  });
});

describe("building costs", () => {
  it("terraforming is always free, even with an empty satchel", () => {
    const w = freshWorld();
    w.inventory = emptyInventory();
    const res = contextAction(w, "dig", 1000);
    expect(res.changed).toBe(true); // the shovel is never blocked
  });

  it("laying a board spends wood", () => {
    const w = freshWorld();
    const before = count(w.inventory, "wood");
    const res = buildAt(w, "plank", w.player.x, w.player.y, 1000);
    expect(res.changed).toBe(true);
    expect(count(w.inventory, "wood")).toBe(before - (BUILD_COSTS.plank.wood ?? 0));
  });

  it("refuses politely when short, and takes nothing", () => {
    const w = freshWorld();
    w.inventory = emptyInventory();
    const res = buildAt(w, "plank", w.player.x, w.player.y, 1000);
    expect(res.changed).toBe(false);
    expect(res.message).toContain("trees"); // points you at the fix
    expect(count(w.inventory, "wood")).toBe(0);
  });

  it("a new town can build immediately", () => {
    const w = freshWorld();
    expect(canAfford(w.inventory, BUILD_COSTS.plank)).toBe(true);
  });

  it("one tree pays for several boards", () => {
    const cost = BUILD_COSTS.plank.wood ?? 0;
    expect(NODES.tree.yield / cost).toBeGreaterThanOrEqual(5);
  });
});

describe("produce goes into the satchel", () => {
  it("picking mushrooms banks them and leaves grass", () => {
    const w = freshWorld();
    const { x, y } = { x: Math.round(w.player.x), y: Math.round(w.player.y) };
    setTile(w, x, y, MUSHROOM);
    const res = contextAction(w, "gather", 1000);
    expect(res.changed).toBe(true);
    expect(count(w.inventory, "mushroom")).toBe(1);
    expect(tileAt(w, x, y)).toBe(GRASS);
  });

  it("a harvested carrot is carried, not vanished", () => {
    const w = freshWorld();
    contextAction(w, "plant", 1000);
    const key = tileKey(Math.round(w.player.x), Math.round(w.player.y));
    w.crops[key].stage = 3; // ripe
    const res = contextAction(w, "plant", 2000); // harvest wins over the tool
    expect(res.kind).toBe("harvest");
    expect(count(w.inventory, "carrot")).toBe(1);
  });
});

describe("finishes", () => {
  it("a new town starts with finishes selected and some unlocked", () => {
    const w = freshWorld();
    expect(w.skins.unlocked.length).toBeGreaterThan(0);
    expect(w.skins.selected.wood).toBeTruthy();
    expect(w.skins.selected.stone).toBeTruthy();
  });

  it("changing a finish costs nothing and carries nothing", () => {
    const w = freshWorld();
    const before = { ...w.inventory };
    w.skins.selected.wood = "ash";
    expect(w.inventory).toEqual(before); // free, by construction
    // …and it is not an item: no finish ever appears in the satchel.
    expect(count(w.inventory as never, "ash" as never)).toBe(0);
  });
});
