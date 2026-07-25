import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { HEAP, SHOP } from "../content/shop";
import { SKINS } from "../content/skins";
import { FURNITURE } from "../content/furniture";
import { redeem, heapOffers, heapExhausted } from "./heap";
import { add, count } from "./inventory";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "gremlin", spot: "forest", seed: 4 });
}

describe("the heap — junk in, finishes out", () => {
  it("gives ONLY finishes, so a junk-only counter can never be a gate", () => {
    // The invariant the whole design rests on, made mechanical — the same trick
    // as shop.test.ts's material-AND-produce rule. A finish costs nothing to
    // apply and no acceptance test in the game reads one, so junk stays
    // something you may dig, never something you must. Put a material or a
    // piece of furniture behind this counter and that stops being true, which
    // is what this test is here to refuse.
    for (const row of HEAP) {
      expect(SKINS[row.gives]).toBeDefined();
      expect(row.cost).toBeGreaterThan(0);
    }
  });

  it("never asks for a finish that a house or a commission could need", () => {
    // Belt to the braces above: no furniture row and no structure may ever cost
    // junk, or the Gremlin's pile becomes load-bearing for housing.
    for (const def of Object.values(FURNITURE)) {
      expect(def.cost.junk).toBeUndefined();
    }
  });

  it("takes junk and nothing else — that is what makes him not a second shop", () => {
    // And the counterpart: the MENACE must never take junk alone, because her
    // rows are the ones that must stay payable however you play.
    for (const row of SHOP) {
      const kinds = row.accepts.map((p) => p.item);
      expect(kinds).toContain("junk");
      expect(kinds.some((k) => k !== "junk")).toBe(true);
    }
  });

  it("swaps junk for a permanent finish", () => {
    const w = freshWorld();
    const row = HEAP[0];
    add(w.inventory, "junk", row.cost);
    expect(redeem(w, row)).toBe(true);
    expect(w.skins.unlocked).toContain(row.gives);
    expect(count(w.inventory, "junk")).toBe(0);
  });

  it("refuses when you can't pay, and takes nothing", () => {
    const w = freshWorld();
    const row = HEAP[0];
    add(w.inventory, "junk", row.cost - 1);
    expect(redeem(w, row)).toBe(false);
    expect(w.skins.unlocked).not.toContain(row.gives);
    expect(count(w.inventory, "junk")).toBe(row.cost - 1);
  });

  it("never charges twice for a finish you already have", () => {
    // Without the guard, a second tap on a row you own would take the junk and
    // the unlocked list would absorb the duplicate in silence.
    const w = freshWorld();
    const row = HEAP[0];
    add(w.inventory, "junk", row.cost * 2);
    expect(redeem(w, row)).toBe(true);
    expect(redeem(w, row)).toBe(false);
    expect(count(w.inventory, "junk")).toBe(row.cost);
    expect(w.skins.unlocked.filter((s) => s === row.gives)).toHaveLength(1);
  });

  it("shows taken rows rather than hiding them, and knows when it's empty", () => {
    const w = freshWorld();
    expect(heapExhausted(w)).toBe(false);
    for (const row of HEAP) {
      add(w.inventory, "junk", row.cost);
      redeem(w, row);
    }
    expect(heapOffers(w)).toHaveLength(HEAP.length); // still all there
    expect(heapOffers(w).every((o) => o.taken)).toBe(true);
    expect(heapExhausted(w)).toBe(true);
  });

  it("hands out nothing a new town already starts with", () => {
    // A row whose finish is a starter would be a counter selling you something
    // you own, which reads as broken rather than generous.
    const w = freshWorld();
    for (const row of HEAP) expect(w.skins.unlocked).not.toContain(row.gives);
  });
});
