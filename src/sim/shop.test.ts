import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { add, count } from "./inventory";
import { offers, canPay, trade } from "./shop";
import { SHOP } from "../content/shop";
import { itemDef } from "../content/items";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "hilltop", seed: 42 });
}

describe("what the counter will take", () => {
  // THE invariant. If this fails, someone has added a row that can only be paid
  // for one way, and whichever way that is has just become mandatory.
  it("every row is payable without farming, and payable without gathering", () => {
    for (const row of SHOP) {
      const categories = row.accepts.map((p) => itemDef(p.item).category);
      expect(categories).toContain("material");
      expect(categories).toContain("produce");
    }
  });

  it("never asks for something you can't get", () => {
    // Ore is defined but unobtainable until the underground layer exists, and
    // cloth is what she's selling. A price in either is a row nobody can pay.
    for (const row of SHOP) {
      for (const p of row.accepts) {
        expect(p.item).not.toBe("ore");
        expect(p.item).not.toBe("cloth");
      }
    }
  });

  it("sells only what you cannot gather", () => {
    for (const row of SHOP) expect(itemDef(row.gives).category).toBe("soft");
  });
});

describe("trading", () => {
  it("shows rows you can't afford rather than hiding them", () => {
    const w = world();
    w.inventory = {};
    const seen = offers(w);
    expect(seen).toHaveLength(SHOP.length);
    expect(seen.every((o) => o.affordable.length === 0)).toBe(true);
  });

  it("takes what you offered, not what it would rather have", () => {
    const w = world();
    w.inventory = {};
    add(w.inventory, "wood", 100);
    add(w.inventory, "carrot", 100);
    const row = SHOP[0];
    const carrots = row.accepts.find((p) => p.item === "carrot")!;

    expect(trade(w, row, carrots)).toBe(true);
    // The wood is untouched. Which of your things you'd rather part with is a
    // real decision, and spending the first match would make it for you.
    expect(count(w.inventory, "wood")).toBe(100);
    expect(count(w.inventory, "carrot")).toBe(100 - carrots.count);
    expect(count(w.inventory, "cloth")).toBe(row.givesCount);
  });

  it("refuses, and changes nothing, when you can't pay", () => {
    const w = world();
    w.inventory = {};
    add(w.inventory, "wood", 1);
    const row = SHOP[0];
    const wood = row.accepts.find((p) => p.item === "wood")!;

    expect(canPay(w, wood)).toBe(false);
    expect(trade(w, row, wood)).toBe(false);
    expect(count(w.inventory, "wood")).toBe(1);
    expect(count(w.inventory, "cloth")).toBe(0);
  });

  it("has no stock to run out of", () => {
    // Unlimited and never rotating, deliberately: a limited or timed stock is
    // FOMO, which is pressure wearing a hat.
    const w = world();
    w.inventory = {};
    add(w.inventory, "wood", 10_000);
    const row = SHOP[0];
    const wood = row.accepts.find((p) => p.item === "wood")!;
    for (let i = 0; i < 20; i++) expect(trade(w, row, wood)).toBe(true);
    expect(count(w.inventory, "cloth")).toBe(row.givesCount * 20);
  });

  it("leaves no balance behind — the satchel is the whole record", () => {
    const w = world();
    add(w.inventory, "carrot", 50);
    const row = SHOP[0];
    trade(w, row, row.accepts.find((p) => p.item === "carrot")!);
    // Nothing anywhere is keeping a running total. If a wallet is ever added,
    // this is the test that should stop it.
    expect(w).not.toHaveProperty("money");
    expect(w).not.toHaveProperty("wallet");
  });
});
