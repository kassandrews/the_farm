import { describe, it, expect } from "vitest";
import { importFromMeadow } from "./meadow_import";
import { newWorld } from "./game";
import { recall } from "./memory";

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

describe("what an import becomes", () => {
  const imported = {
    name: "Grimble",
    form: "menace" as const,
    memorySeed: [{ kind: "raised_favorite" as const, at: 1, value: "cake" }],
  };

  it("embodying makes the import the PLAYER, history and all", () => {
    const w = newWorld({
      name: "ignored",
      form: "dog",
      spot: "forest",
      seed: 1,
      meadowImport: imported,
      importRole: "player",
    });
    expect(w.player.name).toBe("Grimble");
    expect(w.player.form).toBe("menace");
    expect(w.player.imported).toBe(true);
    expect(recall(w.player.memory, "raised_favorite")?.value).toBe("cake");
    // …and it is NOT also living next door as a villager.
    expect(w.villagers.some((v) => v.name === "Grimble")).toBe(false);
  });

  it("the default role houses the import next door instead", () => {
    const w = newWorld({
      name: "Me",
      form: "dog",
      spot: "forest",
      seed: 1,
      meadowImport: imported,
      importRole: "villager",
    });
    expect(w.player.name).toBe("Me");
    expect(w.player.form).toBe("dog");
    expect(w.player.imported).toBe(false);
    expect(w.player.memory).toEqual([]);
    const neighbour = w.villagers.find((v) => v.id === "resident1")!;
    expect(neighbour.name).toBe("Grimble");
    expect(neighbour.form).toBe("menace");
  });

  it("a freshly hatched sprite has no imported history", () => {
    const w = newWorld({ name: "Sprout", form: "gremlin", spot: "forest", seed: 2 });
    expect(w.player.imported).toBe(false);
    expect(w.player.memory).toEqual([]);
  });
});
