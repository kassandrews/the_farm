import { describe, it, expect } from "vitest";
import { newWorld, contextAction, buildCost, buildAt, loadedFinish } from "./game";
import { count, add, spend, canAfford, refund, shortfall, emptyInventory } from "./inventory";
import { gather, nodeAt, nodeNear, updateRegrowth, pendingRegrowth, updateReclaim } from "./gather";
import { tileAt, setTile, tileKey, generatedTile, dig, sink, RECLAIM_MS, floorFinish } from "./world";
import { GRASS, DIRT, TREE, ROCK, FLOOR, MUSHROOM, FARMLAND, SHAFT } from "../content/tiles";
import { NODES } from "../content/nodes";
import { shellFinish } from "./structures";

const HOUR = 3_600_000;

function freshWorld() {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

/** Find a generated tree near the town for tests that need a real one.
 *
 *  `elbow` is how much open ground the caller needs AROUND it — nothing built
 *  within that square. Tests that fell a block and watch it grow back need real
 *  estate, and since the town started clearing its own ground (content/town.ts
 *  §The clearing) the nearest tree to the origin is one that stands just past
 *  the buildings rather than among them: a five-tile block centred on it used to
 *  land on open meadow and now lands on the town hall and the heap, where
 *  `gather` correctly refuses and the test reads as a regrowth bug. */
function findNode(
  w: ReturnType<typeof newWorld>,
  want: number,
  elbow = 0,
): { x: number; y: number } {
  for (let r = 1; r < 60; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (tileAt(w, x, y) !== want) continue;
        if (elbow && !clearAround(w, x, y, elbow)) continue;
        return { x, y };
      }
    }
  }
  throw new Error("no node generated nearby");
}

/** A tree with another tree close enough to re-seed it — i.e. a tree standing in
 *  a WOOD rather than on its own.
 *
 *  Regrowth needs a standing neighbour within `seedRadius` (sim/gather.ts), so
 *  "fell it and watch it come back" is a claim about woodland and never about a
 *  lone tree. It used to be safe to ignore that, because the meadow around the
 *  origin was thick enough that the first tree found always had company. The town
 *  thins its own common now (sim/world.ts §TOWN_THIN), and the nearest tree to
 *  the plaza is exactly the kind that has none — so the tests that assert
 *  regrowth have to say out loud that they want a wood. */
function findTreeInWood(w: ReturnType<typeof newWorld>): { x: number; y: number } {
  const rad = NODES.tree.seedRadius!;
  for (let r = 1; r < 60; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (tileAt(w, x, y) !== TREE) continue;
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (tileAt(w, x + dx, y + dy) === TREE) return { x, y };
          }
        }
      }
    }
  }
  throw new Error("no wood generated nearby");
}

/** Nothing the town (or anyone) has built within `m` tiles. */
function clearAround(w: ReturnType<typeof newWorld>, x: number, y: number, m: number): boolean {
  for (let dy = -m; dy <= m; dy++) {
    for (let dx = -m; dx <= m; dx++) {
      if (`${x + dx},${y + dy}` in w.build) return false;
    }
  }
  return true;
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

  it("the default tap fells the tree in reach", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    w.player.x = x - 1;
    w.player.y = y;
    w.player.facing = 1;
    // The one-button contract: nothing is held, the tree in reach is the
    // obvious intent, and the default tap does it rather than refuse.
    const res = contextAction(w, null, 1000);
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
    // Build on GRASS beside the tree, not on whatever the player happens to be
    // standing on: the homestead is stamped with floors, and laying pine over
    // pine is now correctly a no-op rather than a board silently spent to change
    // nothing. The thing under test is the tree, not the tile.
    const target = findNode(w, GRASS);
    // Placement lives in build mode and targets a TAPPED tile, so an adjacent
    // tree has no way to hijack it — the bug this guards against is now
    // structurally impossible rather than merely avoided.
    const res = buildAt(w, "floor", target.x, target.y, 1000);
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
    // A tree standing beside it, stated rather than hoped for: regrowth needs
    // something to seed from now (NodeDef.seeded), and leaving that to whatever
    // the generator happened to put next door is how this test would one day
    // start failing for a reason that has nothing to do with the clock.
    setTile(w, x + 1, y, TREE);
    gather(w, x, y, 1000);
    expect(pendingRegrowth(w)).toBe(1);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! - 1); // not yet
    expect(tileAt(w, x, y)).toBe(DIRT);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! + 1); // now
    expect(tileAt(w, x, y)).toBe(TREE);
    expect(pendingRegrowth(w)).toBe(0);
  });

  it("a lone tree does not come back — a wood closes gaps, it does not retake ground", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    // Clear its whole neighbourhood first, so there is provably nothing to seed
    // from. This is the hole the rule exists to close: before it, a player who
    // cleared a wood and left it as lawn got every tree back in the same tile
    // hours later, for ever, which is the tidying job ROADMAP forbids.
    const rad = NODES.tree.seedRadius!;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) setTile(w, x + dx, y + dy, GRASS);
    }
    setTile(w, x, y, TREE);
    gather(w, x, y, 1000);
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 10);
    expect(tileAt(w, x, y)).toBe(DIRT); // still yours
    expect(pendingRegrowth(w)).toBe(0); // and it stopped nagging, like a claim
  });

  it("keeps the middle of a clearing and lets the wood take back exactly the radius", () => {
    // The behaviour the radius actually buys, asserted against the radius itself
    // so a future retune is a decision rather than a surprise. The wood can only
    // reach `rad` tiles into what you felled; everything further in has nothing
    // to grow from and is yours.
    const w = freshWorld();
    const { x, y } = findNode(w, TREE, NODES.tree.seedRadius! + 4);
    const rad = NODES.tree.seedRadius!;
    const half = rad + 3; // a felled block comfortably wider than the reach
    for (let dy = -half - 1; dy <= half + 1; dy++) {
      for (let dx = -half - 1; dx <= half + 1; dx++) setTile(w, x + dx, y + dy, TREE);
    }
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) gather(w, x + dx, y + dy, 1000);
    }
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! + 1);
    // The outermost felled ring is within reach of the standing wood, so it closes.
    expect(tileAt(w, x + half, y)).toBe(TREE);
    expect(tileAt(w, x, y + half)).toBe(TREE);
    // The middle had nothing within `rad` and stays cleared.
    const keep = half - rad;
    for (let dy = -keep; dy <= keep; dy++) {
      for (let dx = -keep; dx <= keep; dx++) {
        expect(tileAt(w, x + dx, y + dy), `${dx},${dy}`).toBe(DIRT);
      }
    }
    expect(pendingRegrowth(w)).toBe(0); // nothing left pending either way
  });

  it("brings a rock back too, on its own much wider radius", () => {
    // Rocks were exempt at first on the claim that seeding them would make stone
    // scarce. That was asserted without the arithmetic and it is wrong — rocks
    // are 3% of tiles in a world with no edge — and the exemption bought only an
    // inconsistency: the axe could make a lasting clearing and the pick could not.
    const w = freshWorld();
    const { x, y } = findNode(w, ROCK);
    // Stated rather than hoped for: rocks are generated so no two ever touch, so
    // whether one has kin in range is a question about the scatter, not this test.
    setTile(w, x + NODES.rock.seedRadius!, y, ROCK);
    gather(w, x, y, 1000);
    updateRegrowth(w, 1000 + NODES.rock.regrowMs! + 1);
    expect(tileAt(w, x, y)).toBe(ROCK);
  });

  it("leaves a rock cleared when there is no stone left near it", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, ROCK);
    const rad = NODES.rock.seedRadius!;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) setTile(w, x + dx, y + dy, GRASS);
    }
    setTile(w, x, y, ROCK);
    gather(w, x, y, 1000);
    updateRegrowth(w, 1000 + NODES.rock.regrowMs! * 10);
    expect(tileAt(w, x, y)).toBe(DIRT);
    expect(pendingRegrowth(w)).toBe(0);
  });

  it("orders the clocks: undergrowth, wood, deadwood, stone", () => {
    // The pace of the world, in one assertion. A shrub is a season's growth and a
    // fallen tree is a decade's; a rock is not growing at all. These were 3h, 8h,
    // 24h and 10h, which had a rock back in a yard before you had finished
    // clearing the yard and a wood closing over while you stood in it.
    expect(NODES.shrub.regrowMs!).toBeLessThan(NODES.tree.regrowMs!);
    expect(NODES.tree.regrowMs!).toBeLessThan(NODES.stump.regrowMs!);
    expect(NODES.stump.regrowMs!).toBeLessThan(NODES.rock.regrowMs!);
    // And the grove keeps pace with the wood it is a strange version of.
    expect(NODES.darktree.regrowMs).toBe(NODES.tree.regrowMs);
  });

  it("NEVER regrows on ground you've claimed — the clearing stays yours", () => {
    const w = freshWorld();
    const { x, y } = findNode(w, TREE);
    gather(w, x, y, 1000);
    setTile(w, x, y, FLOOR); // you built here
    updateRegrowth(w, 1000 + NODES.tree.regrowMs! * 10);
    expect(tileAt(w, x, y)).toBe(FLOOR); // your floor survived
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
    const first = findTreeInWood(w);
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

  it("is longer than a sitting, which is the property that actually mattered", () => {
    // This used to assert RECLAIM_MS > every node's regrowMs, and that ordering
    // broke when the nodes were slowed (a tree went 8h -> 24h, a rock 10h -> 72h).
    // The ordering was never the point: the rule is that you should not watch the
    // world undo your afternoon while standing over it deciding what to put there.
    // Twelve hours is well past any sitting. A hole you dug is not a wood, and
    // there is no reason the two clocks must stay in order.
    expect(RECLAIM_MS).toBeGreaterThan(4 * HOUR);
  });

  it("grasses over a tree that forfeited, so clearing leaves no brown squares", () => {
    // The bug the seeded rule introduced and this closes. Before it, every felled
    // tree came back, so the DIRT it left was always temporary. A tree that
    // forfeits leaves bare earth nothing was watching — and a cleared wood would
    // have been a field of permanent brown squares, which is the shovel's old
    // "only verb you have to tidy up after" arriving through the axe.
    const w = freshWorld();
    const { x, y } = findGrass(w);
    const rad = NODES.tree.seedRadius!;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) setTile(w, x + dx, y + dy, GRASS);
    }
    setTile(w, x, y, TREE);
    gather(w, x, y, 1000);
    const forfeit = 1000 + NODES.tree.regrowMs! + 1;
    updateRegrowth(w, forfeit);
    expect(tileAt(w, x, y)).toBe(DIRT); // it did not come back
    updateReclaim(w, forfeit + RECLAIM_MS + 1);
    expect(tileAt(w, x, y)).toBe(GRASS); // and the ground closed over anyway
  });

  it("leaves tilled, paved and built ground alone, and stops tracking it", () => {
    for (const claim of [FARMLAND, FLOOR] as const) {
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
    w.build[tileKey(x, y)] = { id: "wall", finish: loadedFinish(w, "wall") };
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
    const { x, y } = findTreeInWood(w);
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
    const res = buildAt(w, "floor", w.player.x, w.player.y, 1000);
    expect(res.changed).toBe(true);
    expect(count(w.inventory, "wood")).toBe(before - (buildCost("floor", "pine").wood ?? 0));
  });

  it("refuses politely when short, and takes nothing", () => {
    const w = freshWorld();
    w.inventory = emptyInventory();
    const res = buildAt(w, "floor", w.player.x, w.player.y, 1000);
    expect(res.changed).toBe(false);
    expect(res.message).toContain("trees"); // points you at the fix
    expect(count(w.inventory, "wood")).toBe(0);
  });

  it("a new town can build immediately", () => {
    const w = freshWorld();
    expect(canAfford(w.inventory, buildCost("floor", "pine"))).toBe(true);
  });

  it("one tree pays for several boards", () => {
    const cost = buildCost("floor", "pine").wood ?? 0;
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
  it("a new town starts with some unlocked, and every tool has a finish to hand", () => {
    const w = freshWorld();
    expect(w.skins.unlocked.length).toBeGreaterThan(0);
    // `selected` is empty in a new town on purpose — an entry is a choice the
    // player made. What must be true is that asking anyway gets an answer.
    expect(loadedFinish(w, "floor")).toBeTruthy();
    expect(loadedFinish(w, "wall")).toBeTruthy();
  });

  it("changing a finish costs nothing and carries nothing", () => {
    const w = freshWorld();
    const before = { ...w.inventory };
    w.skins.selected.floor = "ash";
    expect(w.inventory).toEqual(before); // free, by construction
    // …and it is not an item: no finish ever appears in the satchel.
    expect(count(w.inventory as never, "ash" as never)).toBe(0);
  });

  it("falls back rather than throwing when a selection has gone stale", () => {
    const w = freshWorld();
    // A finish that exists but was never unlocked — the shape a hand-edited or
    // rolled-back save can arrive in. A wrong colour is recoverable; a crash on
    // load is not.
    w.skins.selected.floor = "walnut";
    w.skins.unlocked = w.skins.unlocked.filter((id) => id !== "walnut");
    expect(loadedFinish(w, "floor")).toBe("pine");
  });

  it("a stone finish costs stone and a wood finish costs wood", () => {
    // The cost-follows-material rule (DESIGN §Materials). Same number, different
    // stuff — that is the whole of it.
    expect(buildCost("wall", "pine")).toEqual({ wood: 2 });
    expect(buildCost("wall", "granite")).toEqual({ stone: 2 });
    expect(buildCost("floor", "pine")).toEqual({ wood: 1 });
    expect(buildCost("floor", "slate")).toEqual({ stone: 1 });
  });
});

// The rules that arrived with per-tile floor finishes (schema v27). The thing
// they collectively guard is the sentence in finishFor's docblock that was false
// for two phases: a finish is something you chose when you built, NOT a filter
// over the world.
describe("a floor keeps the finish it was laid in", () => {
  function grassAt(w: ReturnType<typeof newWorld>) {
    return findNode(w, GRASS);
  }

  /** Walnut and ash are not both starters, and loadedFinish correctly refuses a
   *  finish you have not earned — so a test about stamping has to earn them
   *  first or it ends up asserting the fallback. */
  function withFinishes(w: ReturnType<typeof newWorld>) {
    for (const id of ["walnut", "ash", "granite"] as const) {
      if (!w.skins.unlocked.includes(id)) w.skins.unlocked.push(id);
    }
    return w;
  }

  it("stamps the held finish onto the tile, not onto the town", () => {
    const w = withFinishes(freshWorld());
    add(w.inventory, "wood", 20);
    const a = grassAt(w);
    w.skins.selected.floor = "walnut";
    buildAt(w, "floor", a.x, a.y, 1000);
    expect(floorFinish(w, a.x, a.y)).toBe("walnut");

    // Change what you're holding: the board already down must not move.
    w.skins.selected.floor = "ash";
    expect(floorFinish(w, a.x, a.y)).toBe("walnut");
  });

  it("lets two floors laid on different days differ", () => {
    const w = withFinishes(freshWorld());
    add(w.inventory, "wood", 20);
    const a = grassAt(w);
    w.skins.selected.floor = "walnut";
    buildAt(w, "floor", a.x, a.y, 1000);
    w.skins.selected.floor = "ash";
    buildAt(w, "floor", a.x + 1, a.y, 1000);
    expect(floorFinish(w, a.x, a.y)).toBe("walnut");
    expect(floorFinish(w, a.x + 1, a.y)).toBe("ash");
  });

  it("stores the default as absence rather than as a value", () => {
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    const a = grassAt(w);
    buildAt(w, "floor", a.x, a.y, 1000); // pine, the default
    expect(w.finishes[tileKey(a.x, a.y)]).toBeUndefined();
    expect(floorFinish(w, a.x, a.y)).toBe("pine");
  });

  it("forgets the finish when the board is lifted", () => {
    // Otherwise a fresh board silently inherits the colour of the one before it.
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    const a = grassAt(w);
    w.skins.selected.floor = "walnut";
    buildAt(w, "floor", a.x, a.y, 1000);
    buildAt(w, "erase", a.x, a.y, 1000);
    expect(w.finishes[tileKey(a.x, a.y)]).toBeUndefined();
  });
});

describe("cost follows the material; the look is free within one", () => {
  it("charges stone for a stone floor and wood for a wood one", () => {
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    add(w.inventory, "stone", 20);
    add(w.inventory, "granite" as never, 0);
    w.skins.unlocked.push("granite");
    const a = findNode(w, GRASS);

    const wood0 = count(w.inventory, "wood");
    const stone0 = count(w.inventory, "stone");
    w.skins.selected.floor = "granite";
    expect(buildAt(w, "floor", a.x, a.y, 1000).changed).toBe(true);
    expect(count(w.inventory, "stone")).toBe(stone0 - 1);
    expect(count(w.inventory, "wood")).toBe(wood0); // not a board in sight
  });

  it("re-finishing WITHIN a material is free, on something already built", () => {
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    w.skins.unlocked.push("walnut");
    const a = findNode(w, GRASS);
    buildAt(w, "floor", a.x, a.y, 1000); // pine
    const wood0 = count(w.inventory, "wood");

    w.skins.selected.floor = "walnut";
    expect(buildAt(w, "floor", a.x, a.y, 1000).changed).toBe(true);
    expect(floorFinish(w, a.x, a.y)).toBe("walnut");
    expect(count(w.inventory, "wood")).toBe(wood0); // free — the look never costs
  });

  it("re-finishing ACROSS a material is a rebuild and costs the new stuff", () => {
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    add(w.inventory, "stone", 20);
    w.skins.unlocked.push("granite");
    const a = findNode(w, GRASS);
    buildAt(w, "floor", a.x, a.y, 1000); // pine
    const stone0 = count(w.inventory, "stone");

    w.skins.selected.floor = "granite";
    expect(buildAt(w, "floor", a.x, a.y, 1000).changed).toBe(true);
    expect(count(w.inventory, "stone")).toBe(stone0 - 1);
  });

  it("refuses to spend anything re-laying the finish already there", () => {
    // During a drag you sweep over cells you have already done. Charging for
    // each would be a board spent to change nothing.
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    const a = findNode(w, GRASS);
    buildAt(w, "floor", a.x, a.y, 1000);
    const wood0 = count(w.inventory, "wood");
    const again = buildAt(w, "floor", a.x, a.y, 1000);
    expect(again.changed).toBe(false);
    expect(count(w.inventory, "wood")).toBe(wood0);
  });

  it("sweeps a repaint along a run without eating the window in it", () => {
    // Repainting a house is a drag along the run, and the run has openings in
    // it. Each of those cells used to take the wall the stroke was carrying,
    // so the only way to reach the wall around your own window was to lose the
    // window — and be charged stone for the privilege.
    const w = freshWorld();
    add(w.inventory, "wood", 40);
    add(w.inventory, "stone", 40);
    w.skins.unlocked.push("granite");
    const a = findNode(w, GRASS);
    for (let i = 0; i < 3; i++) setTile(w, a.x + i, a.y, GRASS);
    buildAt(w, "wall", a.x, a.y, 1000);
    buildAt(w, "window", a.x + 1, a.y, 1000);
    buildAt(w, "wall", a.x + 2, a.y, 1000);

    w.skins.selected.wall = "granite";
    const stone0 = count(w.inventory, "stone");
    // One stroke: the cell it opens on, then two swept.
    expect(buildAt(w, "wall", a.x, a.y, 1000, "s", "surface", false).changed).toBe(true);
    const over = buildAt(w, "wall", a.x + 1, a.y, 1000, "s", "surface", true);
    expect(buildAt(w, "wall", a.x + 2, a.y, 1000, "s", "surface", true).changed).toBe(true);

    expect(over.changed).toBe(false);
    expect(w.build[tileKey(a.x + 1, a.y)].id).toBe("window"); // still a window
    // Two walls' worth of stone, and nothing at all for the cell it declined.
    expect(count(w.inventory, "stone")).toBe(stone0 - buildCost("wall", "granite").stone! * 2);
    // And the window's shell follows the run it is set into, which is the
    // whole reason nothing was lost by leaving it alone.
    expect(shellFinish(w, a.x + 1, a.y)).toBe("granite");
  });

  it("still fills a doorway back in when you TAP a wall onto it", () => {
    // The mirror of cutting a doorway by painting a door over a wall, and the
    // reason the rule above is about the gesture rather than a flat refusal.
    const w = freshWorld();
    add(w.inventory, "wood", 40);
    const a = findNode(w, GRASS);
    buildAt(w, "door", a.x, a.y, 1000);
    expect(buildAt(w, "wall", a.x, a.y, 1000).changed).toBe(true);
    expect(w.build[tileKey(a.x, a.y)].id).toBe("wall");
  });

  it("refunds what a thing was WEARING, not what you happen to be holding", () => {
    // Otherwise erase launders one material into another.
    const w = freshWorld();
    add(w.inventory, "wood", 20);
    add(w.inventory, "stone", 20);
    w.skins.unlocked.push("granite");
    const a = findNode(w, GRASS);
    w.skins.selected.floor = "granite";
    buildAt(w, "floor", a.x, a.y, 1000); // a stone floor

    w.skins.selected.floor = "pine"; // now holding wood
    const wood0 = count(w.inventory, "wood");
    const stone0 = count(w.inventory, "stone");
    buildAt(w, "erase", a.x, a.y, 1000);
    expect(count(w.inventory, "stone")).toBe(stone0 + 1); // stone back
    expect(count(w.inventory, "wood")).toBe(wood0); // no board conjured
  });
});
