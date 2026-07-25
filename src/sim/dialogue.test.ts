import { describe, it, expect } from "vitest";
import { newWorld, talk, buildAt, playerTile } from "./game";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { hasMemory } from "./memory";

function importedScholarWorld() {
  return newWorld({
    name: "Me",
    form: "dog",
    spot: "hilltop",
    seed: 3,
    meadowImport: { name: "Grimble", form: "scholar", memorySeed: [{ kind: "raised_favorite", at: 1, value: "carrots" }] },
  });
}

describe("memory-driven dialogue", () => {
  it("a villager references imported raising history unprompted", () => {
    const w = importedScholarWorld();
    const scholar = w.villagers.find((v) => v.id === "resident1")!;
    const rng = makeRng(1);
    const said = new Set<string>();
    for (let i = 0; i < 80; i++) said.add(speak(w, scholar, rng).text);
    // At least one line should be the raised_favorite memory (mentions carrots).
    expect([...said].some((t) => t.includes("carrots"))).toBe(true);
  });

  it("witnessed Farm events enter every villager's memory", () => {
    const w = importedScholarWorld();
    // Player stands on the homestead; lay a board.
    const pt = playerTile(w);
    const res = buildAt(w, "plank", pt.x, pt.y, 1000);
    expect(res.changed).toBe(true);
    for (const v of w.villagers) expect(hasMemory(v.memory, "built_plank")).toBe(true);
  });

  it("the scholar can later bring up the board you laid", () => {
    const w = importedScholarWorld();
    const pt = playerTile(w);
    buildAt(w, "plank", pt.x, pt.y, 1000);
    const scholar = w.villagers.find((v) => v.id === "resident1")!;
    const rng = makeRng(5);
    const said = new Set<string>();
    for (let i = 0; i < 120; i++) said.add(speak(w, scholar, rng).text);
    expect([...said].some((t) => t.toLowerCase().includes("built") || t.toLowerCase().includes("boards"))).toBe(true);
  });

  it("talking nudges friendship and never throws for a form without banks", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const before = w.villagers.find((v) => v.id === "resident1")!.friendship;
    const speech = talk(w, "resident1", makeRng(2));
    expect(speech).not.toBeNull();
    expect(w.villagers.find((v) => v.id === "resident1")!.friendship).toBeGreaterThan(before);
  });
});
