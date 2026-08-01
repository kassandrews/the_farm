import { describe, it, expect } from "vitest";
import { newWorld, buildCost } from "./game";
import { defaultSkin } from "../content/skins";
import { add, count } from "./inventory";
import { itemDef } from "../content/items";
import { CROPS, CROP_ORDER, STARTING_CROP } from "../content/crops";
import { SEED_ROWS, VARIETY_ROWS } from "../content/seedstall";
import { SHOP, HEAP } from "../content/shop";
import { MUSEUM } from "../content/museum";
import { FURNITURE } from "../content/furniture";
import {
  seedOffers,
  varietyOffers,
  varietiesExhausted,
  buySeed,
  unlockVariety,
  plantable,
  selectCrop,
  canSow,
  sow,
} from "./seeds";
import { harvest, updateCrop } from "./crops";

function world() {
  return newWorld({ name: "Test", form: "carrot", spot: "forest", seed: 7 });
}

describe("what the stall will take", () => {
  // The same invariant shop.test.ts asserts, and here it has a second edge: a
  // seed row payable only in produce would mean you must farm before you can
  // farm.
  it("every row is payable without farming, and payable without gathering", () => {
    for (const row of [...SEED_ROWS, ...VARIETY_ROWS]) {
      const categories = row.accepts.map((p) => itemDef(p.item).category);
      expect(categories).toContain("material");
      expect(categories).toContain("produce");
    }
  });

  it("never asks for something you can't get", () => {
    for (const row of [...SEED_ROWS, ...VARIETY_ROWS]) {
      for (const p of row.accepts) {
        expect(p.item).not.toBe("cloth"); // the Menace's to sell
        expect(p.item).not.toBe("seed"); // paying for seed in seed
      }
    }
  });

  it("never lets ORE be the only way to pay for a row", () => {
    // Ore was on the list above while it was unobtainable. It is obtainable
    // now, so the exclusion is replaced by the rule that always mattered
    // (DESIGN §Materials): ore is an alternative, never a requirement. The stall
    // lists no ore today and may; what it may never do is make the underground
    // the only route to a crop variety, which would be farming gated on mining.
    for (const row of [...SEED_ROWS, ...VARIETY_ROWS]) {
      expect(row.accepts.filter((p) => p.item !== "ore").length).toBeGreaterThan(0);
    }
  });

  it("never sells seed of a particular variety", () => {
    // The rule that keeps items.ts short forever (DESIGN §Materials): seed is
    // fungible, and the variety is a separate free axis. A row that gave
    // "radish seed" would start the one-item-per-crop table this design exists
    // to avoid — so seed rows carry a count and no crop at all.
    for (const row of SEED_ROWS) {
      expect(Object.keys(row)).not.toContain("gives");
      expect(row.givesCount).toBeGreaterThan(0);
    }
  });

  it("does not sell the variety you already start with", () => {
    const w = world();
    for (const row of VARIETY_ROWS) expect(w.seeds.unlocked).not.toContain(row.gives);
    expect(w.seeds.unlocked).toContain(STARTING_CROP);
  });

  it("offers every variety the crop table has, so none is unreachable", () => {
    const reachable = [STARTING_CROP, ...VARIETY_ROWS.map((r) => r.gives)];
    for (const id of CROP_ORDER) expect(reachable).toContain(id);
  });

  it("makes every counter that takes one crop take all of them", () => {
    // THE test for "no crop is better than another", and the one the screen
    // found rather than the unit tests: the Menace took carrots and neither of
    // the new crops, so a potato was worth nothing at any counter in town and
    // the carrot was quietly the good crop — a best crop reached through the
    // barter table rather than through the growth times.
    //
    // Stated as "all or none" rather than as a list of items, so it holds for
    // the next crop somebody adds without anybody remembering to come here.
    //
    // VARIETY ROWS ARE EXEMPT, and the exemption is forced rather than
    // convenient: a potato row payable in radishes would gate one variety
    // behind another, which the test below refuses. A row that unlocks a crop
    // can only ask for crops you can already grow without it — so it asks for
    // the one everybody starts with, and for four things that aren't crops.
    const crops = CROP_ORDER.map((id) => CROPS[id].yields as string);
    for (const row of [...SHOP, ...SEED_ROWS]) {
      const items = row.accepts.map((p) => p.item as string);
      const taken = crops.filter((c) => items.includes(c));
      if (taken.length === 0) continue; // a counter may take no produce at all
      expect(taken.sort(), JSON.stringify(items)).toEqual([...crops].sort());
      // …and at the same price, or the dearer crop is the better one.
      const counts = new Set(row.accepts.filter((p) => crops.includes(p.item)).map((p) => p.count));
      expect(counts.size).toBe(1);
    }
  });

  it("charges the same for every variety, because none is better", () => {
    // No crop out-earns another (DESIGN §Materials). A dearer variety would
    // read as the good one whatever the growth table said.
    const costs = VARIETY_ROWS.map((r) => JSON.stringify(r.accepts));
    expect(new Set(costs).size).toBe(1);
  });

  it("never gates a variety behind another variety", () => {
    // A price in radishes for the potato would be a tech tree, and a tech tree
    // is the crafting sprawl on the not-taken list wearing a different hat.
    const varieties = VARIETY_ROWS.map((r) => r.gives as string);
    for (const row of VARIETY_ROWS) {
      for (const p of row.accepts) expect(varieties).not.toContain(p.item);
    }
  });
});

describe("varieties differ in time and in nothing else", () => {
  it("gives every crop the same number of stages and a distinct total time", () => {
    const totals = new Set<number>();
    for (const id of CROP_ORDER) {
      const def = CROPS[id];
      expect(def.stages).toHaveLength(CROPS[STARTING_CROP].stages.length);
      totals.add(def.stages.reduce((n, s) => n + s.hours, 0));
    }
    expect(totals.size).toBe(CROP_ORDER.length); // no two crops are the same day
  });

  it("yields exactly one item per harvest, whatever the crop", () => {
    // The place a "better crop" would enter: a variety that gave two of
    // something is a variety worth more at every counter in the game.
    const w = world();
    for (const id of CROP_ORDER) {
      if (!w.seeds.unlocked.includes(id)) w.seeds.unlocked.push(id);
      selectCrop(w, id);
      add(w.inventory, "seed", 1);
      const before = count(w.inventory, id);
      // (4,4) rather than (3,3): the plaza is stone out to y 3, and you cannot
      // plant a carrot in the town square.
      expect(sow(w, 4, 4, Date.now())).toBe(id);
      const crop = w.crops["4,4"];
      crop.stage = CROPS[id].stages.length - 1;
      harvest(w, 4, 4, Date.now());
      expect(count(w.inventory, id)).toBe(before + 1);
    }
  });
});

describe("buying seed and unlocking varieties", () => {
  it("shows rows you can't afford rather than hiding them", () => {
    const w = world();
    w.inventory = {};
    expect(seedOffers(w)).toHaveLength(SEED_ROWS.length);
    expect(seedOffers(w).every((o) => o.affordable.length === 0)).toBe(true);
  });

  it("swaps a price for seed", () => {
    const w = world();
    const row = SEED_ROWS[0];
    const price = row.accepts[0];
    w.inventory = {};
    add(w.inventory, price.item, price.count);
    expect(buySeed(w, row, price)).toBe(true);
    expect(count(w.inventory, "seed")).toBe(row.givesCount);
    expect(count(w.inventory, price.item)).toBe(0);
  });

  it("refuses when you can't pay, and takes nothing", () => {
    const w = world();
    const row = SEED_ROWS[0];
    const price = row.accepts[0];
    w.inventory = {};
    add(w.inventory, price.item, price.count - 1);
    expect(buySeed(w, row, price)).toBe(false);
    expect(count(w.inventory, "seed")).toBe(0);
    expect(count(w.inventory, price.item)).toBe(price.count - 1);
  });

  it("unlocks a variety permanently, and never charges twice for it", () => {
    const w = world();
    const row = VARIETY_ROWS[0];
    const price = row.accepts[0];
    w.inventory = {};
    add(w.inventory, price.item, price.count * 2);
    expect(unlockVariety(w, row, price)).toBe(true);
    expect(w.seeds.unlocked).toContain(row.gives);
    expect(unlockVariety(w, row, price)).toBe(false);
    expect(count(w.inventory, price.item)).toBe(price.count);
    expect(w.seeds.unlocked.filter((c) => c === row.gives)).toHaveLength(1);
  });

  it("keeps taken rows on the list, and knows when there are none left", () => {
    const w = world();
    expect(varietiesExhausted(w)).toBe(false);
    for (const row of VARIETY_ROWS) {
      const price = row.accepts[0];
      add(w.inventory, price.item, price.count);
      unlockVariety(w, row, price);
    }
    expect(varietyOffers(w)).toHaveLength(VARIETY_ROWS.length);
    expect(varietyOffers(w).every((o) => o.taken)).toBe(true);
    expect(varietiesExhausted(w)).toBe(true);
  });
});

describe("sowing, and why farming can't dead-end", () => {
  it("spends one seed and plants the selected variety", () => {
    const w = world();
    w.seeds.unlocked.push("radish");
    selectCrop(w, "radish");
    w.inventory = {};
    add(w.inventory, "seed", 2);
    expect(sow(w, 4, 4, Date.now())).toBe("radish");
    expect(w.crops["4,4"].cropId).toBe("radish");
    expect(count(w.inventory, "seed")).toBe(1);
  });

  it("refuses to sow with an empty satchel, and plants nothing", () => {
    const w = world();
    w.inventory = {};
    expect(canSow(w, 4, 4)).toBe(false);
    expect(sow(w, 4, 4, Date.now())).toBeNull();
    expect(w.crops["4,4"]).toBeUndefined();
  });

  it("refuses a variety the stall never sold you", () => {
    const w = world();
    expect(selectCrop(w, "potato")).toBe(false);
    expect(w.seeds.selected).toBe(STARTING_CROP);
    expect(plantable(w)).toEqual([STARTING_CROP]);
  });

  // THE pillar test. A seed you spend without one coming back is a ration, and
  // rationing is what DESIGN §Materials refuses. With the return, a plot you
  // keep going sustains itself and the stall is a convenience rather than a
  // toll you pay per plant.
  it("returns seed on harvest, so a single plot never runs the player dry", () => {
    const w = world();
    w.inventory = {};
    add(w.inventory, "seed", 1);
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      expect(sow(w, 4, 4, now)).toBe(STARTING_CROP);
      expect(count(w.inventory, "seed")).toBe(0); // genuinely down to nothing
      const crop = w.crops["4,4"];
      crop.stage = CROPS[STARTING_CROP].stages.length - 1;
      updateCrop(w, 4, 4, now);
      expect(harvest(w, 4, 4, now)).not.toBeNull();
      expect(count(w.inventory, "seed")).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("nothing gates on what you have planted", () => {
  it("keeps varieties out of every acceptance test in the game", () => {
    // The same guard heap.test.ts puts on finishes. A variety is unlocked
    // forever and costs nothing to use, which is only safe while nothing reads
    // the unlocked list to decide whether you may have something.
    for (const def of Object.values(FURNITURE)) {
      expect(buildCost(def.id, defaultSkin(def.finishes[0])).seed).toBeUndefined();
    }
    for (const row of HEAP) expect(row.cost).toBeGreaterThan(0); // junk only, still
    for (const row of SHOP) {
      expect(row.accepts.map((p) => p.item)).not.toContain("seed");
    }
    for (const row of MUSEUM) {
      expect(row.cost?.item).not.toBe("seed");
    }
  });
});
