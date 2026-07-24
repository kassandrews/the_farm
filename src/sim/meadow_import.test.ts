import { describe, it, expect } from "vitest";
import { importFromMeadow } from "./meadow_import";

/** Build a Meadow backup string the way cozy_sprites/persistence.ts does. */
function meadowBackup(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

describe("Meadow import adapter", () => {
  it("imports the active pet, deriving its favourite food into memory", () => {
    const code = meadowBackup({
      v: 2,
      pet: { name: "Grimble", form: "scholar", createdAt: 500, hidden: { carrotEaten: 40, cakeEaten: 3 } },
      farm: [],
      discovered: [],
    });
    const imp = importFromMeadow(code);
    expect(imp).not.toBeNull();
    expect(imp!.name).toBe("Grimble");
    expect(imp!.form).toBe("scholar");
    const fav = imp!.memorySeed.find((m) => m.kind === "raised_favorite");
    expect(fav?.value).toBe("carrots");
  });

  it("falls back to the most recent retiree when there is no active pet", () => {
    const code = meadowBackup({
      v: 2,
      pet: null,
      farm: [{ name: "Ozymandias", form: "blob", hatchedAt: 10, hidden: { cakeEaten: 99 } }],
      discovered: [],
    });
    const imp = importFromMeadow(code);
    expect(imp?.name).toBe("Ozymandias");
    expect(imp?.form).toBe("blob");
    expect(imp?.memorySeed.find((m) => m.kind === "raised_favorite")?.value).toBe("cake");
  });

  it("rejects a pet with no adult form (a fresh egg can't be a villager)", () => {
    const code = meadowBackup({ v: 2, pet: { name: "Egg", form: null }, farm: [], discovered: [] });
    expect(importFromMeadow(code)).toBeNull();
  });

  it("returns null for garbage rather than throwing", () => {
    expect(importFromMeadow("not-base64-at-all!!!")).toBeNull();
    expect(importFromMeadow(btoa("plain text"))).toBeNull();
  });
});
