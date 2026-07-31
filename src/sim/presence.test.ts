import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { present } from "./presence";
import { isSecret, CAST, MOLE, GHOST, COSMOS } from "../content/cast";
import type { CharId } from "../content/cast";
import { canInvite } from "./company";
import { possibleAskers } from "./errands";
import { meetMole } from "./mole";
import { warrenChamber } from "./world";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "dog", spot: "forest", seed: 4242 });
}

const NOON = new Date(2026, 6, 1, 12, 0).getTime();
const MIDNIGHT = new Date(2026, 6, 1, 0, 30).getTime();

describe("presence", () => {
  it("is unconditionally true for everybody the town knows about", () => {
    // The reason this question did not exist before 4c: a villager is somewhere
    // at every hour, and being there was never in doubt.
    const w = freshWorld();
    for (const v of w.villagers) {
      expect(present(v, NOON)).toBe(true);
      expect(present(v, MIDNIGHT)).toBe(true);
    }
  });

  it("is true for the Mole at every hour — he lives there", () => {
    const w = freshWorld();
    const c = warrenChamber(w.seed);
    w.player.layer = "under";
    w.player.x = c.x;
    w.player.y = c.y;
    meetMole(w, NOON);
    const m = w.villagers.find((v) => v.id === "mole")!;
    expect(present(m, NOON)).toBe(true);
    expect(present(m, MIDNIGHT)).toBe(true);
  });
});

describe("one predicate for `the town has never heard of them`", () => {
  it("covers all three, and nobody else", () => {
    for (const id of ["mole", "ghost", "cosmos"] as CharId[]) expect(isSecret(id)).toBe(true);
    for (const id of Object.keys(CAST) as CharId[]) expect(isSecret(id)).toBe(false);
    expect(isSecret("newcomer:0")).toBe(false);
  });

  it("keeps the Mole refused after he came off the ROOTED list", () => {
    // He was excluded from company by being a seventh string in an array about
    // INSTITUTIONS, which was never why he refuses. The reason moved; the
    // refusal must not have.
    const w = freshWorld();
    const c = warrenChamber(w.seed);
    w.player.layer = "under";
    w.player.x = c.x;
    w.player.y = c.y;
    meetMole(w, NOON);
    const m = w.villagers.find((v) => v.id === "mole")!;
    m.friendship = 100;
    const inv = canInvite(w, m, NOON);
    expect(inv.ok).toBe(false);
    expect(inv.ok === false && inv.why).toBe("rooted");
    expect(possibleAskers(w).some((v) => v.id === "mole")).toBe(false);
  });

  it("keeps every secret out of the CAST table", () => {
    // A Record keyed on an id that included one would quietly make the closing
    // note of content/cast.ts false, and would let `ensureFixedCast` conjure a
    // secret into a live save on migration.
    for (const def of [MOLE, GHOST, COSMOS]) {
      expect(Object.values(CAST)).not.toContain(def);
      expect(isSecret(def.id)).toBe(true);
      // And each says where they are rather than who they are.
      expect(def.subtitle).toBeTruthy();
    }
  });
});
