import { describe, it, expect } from "vitest";
import { newWorld, talk, buildAt, playerTile } from "./game";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { hasMemory } from "./memory";
import { collection, donate } from "./museum";
import { add } from "./inventory";
import { MUSEUM, wingExhibits } from "../content/museum";

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

// The Scholar affinity perk (DESIGN §Affinity perks, ROADMAP 3f step 8): a
// scholar who LIVES here offers their own reading of a recent exhibit, and it
// disagrees with the curator's card.
describe("a scholar resident disagrees with the curator", () => {
  /** Everything a scholar resident said across many conversations. */
  function chatter(w: ReturnType<typeof newWorld>, id: string, turns = 200): string[] {
    const v = w.villagers.find((x) => x.id === id)!;
    const rng = makeRng(11);
    return Array.from({ length: turns }, () => speak(w, v, rng).text);
  }

  function withDonation() {
    const w = importedScholarWorld();
    const def = wingExhibits("nature").find((d) => d.cost.item === "mushroom")!;
    add(w.inventory, def.cost.item, def.cost.count);
    donate(w, def);
    return { w, def };
  }

  it("quotes a card the curator did not mount, once the museum holds something", () => {
    const { w, def } = withDonation();
    const said = chatter(w, "resident1");
    const dissent = said.filter((t) => t.includes(def.title));
    expect(dissent.length).toBeGreaterThan(0);

    const mounted = collection(w)[0].placard;
    for (const line of dissent) {
      // Her rival reading is quoted, and it is never the card on the case.
      expect(line).toContain('"');
      expect(line).not.toContain(mounted);
      expect(def.placards.some((p) => line.includes(p))).toBe(true);
    }
  });

  it("says nothing about exhibits before anything has been donated", () => {
    // No plinth, no quarrel. The same honesty the away event was corrected into:
    // never a line about a card you cannot go and read.
    const w = importedScholarWorld();
    const said = chatter(w, "resident1");
    for (const def of MUSEUM) expect(said.some((t) => t.includes(def.title))).toBe(false);
  });

  it("never comes out of the curator's own mouth", () => {
    // She is found by id, not by form (both scholars share the form), and her
    // conversation is the museum panel. A curator who contradicts her own
    // placard in the doorway undercuts every card in the building.
    const { w, def } = withDonation();
    expect(w.villagers.find((v) => v.id === "museum")!.form).toBe("scholar");
    const said = chatter(w, "museum");
    expect(said.some((t) => t.includes(def.title))).toBe(false);
    for (const p of def.placards) expect(said.some((t) => t.includes(p))).toBe(false);
  });

  it("restates one position rather than inventing a new theory each time", () => {
    const { w, def } = withDonation();
    const dissent = chatter(w, "resident1").filter((t) => t.includes(def.title));
    const claimed = new Set(def.placards.filter((p) => dissent.some((t) => t.includes(p))));
    expect(claimed.size).toBe(1); // one rival card
    expect(new Set(dissent).size).toBeGreaterThan(1); // several ways of saying it
  });

  it("is a perk, not a job: a town of other forms simply never hears it", () => {
    // Form is identity, never a job (Design invariant). Nothing asks for a
    // scholar and nothing is missing without one.
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const def = wingExhibits("nature").find((d) => d.cost.item === "mushroom")!;
    add(w.inventory, def.cost.item, def.cost.count);
    donate(w, def);
    for (const v of w.villagers) {
      if (v.form === "scholar") continue;
      const said = chatter(w, v.id);
      for (const p of def.placards) expect(said.some((t) => t.includes(p))).toBe(false);
    }
  });
});
