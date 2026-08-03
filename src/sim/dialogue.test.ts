import { describe, it, expect } from "vitest";
import { newWorld, talk, buildAt, playerTile } from "./game";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { hasMemory } from "./memory";
import { collection, donate } from "./museum";
import { add } from "./inventory";
import { MUSEUM, wingExhibits } from "../content/museum";
import { RESIDENT_SEASON, seasonLines } from "../content/dialogue";
import type { AdultForm } from "../content/canon/forms";
import { plant } from "./crops";

function importedScholarWorld() {
  return newWorld({
    name: "Me",
    form: "dog",
    spot: "forest",
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
    for (let i = 0; i < 80; i++) said.add(speak(w, scholar, rng, Date.now()).text);
    // At least one line should be the raised_favorite memory (mentions carrots).
    expect([...said].some((t) => t.includes("carrots"))).toBe(true);
  });

  it("witnessed Farm events enter every villager's memory", () => {
    const w = importedScholarWorld();
    // Player stands on the homestead; lay a board.
    const pt = playerTile(w);
    const res = buildAt(w, "floor", pt.x, pt.y, 1000);
    expect(res.changed).toBe(true);
    for (const v of w.villagers) expect(hasMemory(v.memory, "built_floor")).toBe(true);
  });

  it("the scholar can later bring up the board you laid", () => {
    const w = importedScholarWorld();
    const pt = playerTile(w);
    buildAt(w, "floor", pt.x, pt.y, 1000);
    const scholar = w.villagers.find((v) => v.id === "resident1")!;
    const rng = makeRng(5);
    const said = new Set<string>();
    for (let i = 0; i < 120; i++) said.add(speak(w, scholar, rng, Date.now()).text);
    expect([...said].some((t) => t.toLowerCase().includes("built") || t.toLowerCase().includes("boards"))).toBe(true);
  });

  it("talking nudges friendship and never throws for a form without banks", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const before = w.villagers.find((v) => v.id === "resident1")!.friendship;
    const speech = talk(w, "resident1", makeRng(2), Date.now());
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
    return Array.from({ length: turns }, () => speak(w, v, rng, Date.now()).text);
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

// --- The said ring, the absence greeting, and the in-the-middle-of rung -------
// Phase 12 step 1. These use a hand-rolled Rng rather than makeRng: `next` at a
// fixed value decides exactly which chance rolls pass, and `pick` at "first
// element" makes the ring's steering the only variable in the test.

import { speak as speakFn } from "./dialogue";
import { RESIDENT_IDLE, RESIDENT_ABSENCE } from "../content/dialogue";
import type { Villager } from "./types";

function stubRng(nextValue: number) {
  return {
    next: () => nextValue,
    int: () => 0,
    pick: <T,>(arr: readonly T[]): T => arr[0],
  };
}

/** The world's own first resident, stripped to a bare scholar: no memories, no
 *  home, no friendship — so the only rungs that can speak are the ones the test
 *  hands it. A real id, because `displayName` consults the character tables. */
function bareScholar(w: ReturnType<typeof newWorld>): Villager {
  const v = w.villagers.find((x) => x.id === "resident1")!;
  Object.assign(v, { form: "scholar", friendship: 0, memory: [], said: [], homeBed: null });
  delete v.lastTalkedAt;
  return v;
}

describe("the said ring", () => {
  it("walks a whole bank before repeating, instead of coin-flipping two lines", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    const rng = stubRng(0.99); // every chance roll fails → idle voice every time
    // The idle pool is the flat bank plus this form's idle tree roots — a root
    // is picked and ring-tracked like any other line.
    const poolSize = RESIDENT_IDLE.scholar!.length + (CONVERSATIONS.scholar!.idle?.length ?? 0);
    const heard = Array.from({ length: poolSize }, () => speakFn(w, v, rng, Date.now()).text);
    // pick() always takes the first candidate, so distinctness here is the ring
    // doing the steering — without it this would be the same line every time.
    expect(new Set(heard).size).toBe(poolSize);
    // The pool exhausted, the whole pool comes back: spoken, never silent.
    expect(speakFn(w, v, rng, Date.now()).text).toBe(heard[0]);
  });

  it("keeps at most the last eight lines", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    const rng = stubRng(0.99);
    for (let i = 0; i < 20; i++) speakFn(w, v, rng, Date.now());
    expect(v.said.length).toBeLessThanOrEqual(8);
  });
});

describe("the absence greeting", () => {
  const DAY = 24 * 3600_000;
  const now = Date.parse("2026-06-10T12:00:00Z");

  function greetAfter(gap: number | null): string {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    if (gap !== null) v.lastTalkedAt = now - gap;
    return speakFn(w, v, stubRng(0.99), now).text;
  }

  it("greets a few days away with the days bank, weeks with the weeks bank", () => {
    expect(greetAfter(4 * DAY)).toBe(RESIDENT_ABSENCE.scholar!.days[0]);
    expect(greetAfter(20 * DAY)).toBe(RESIDENT_ABSENCE.scholar!.weeks![0]);
  });

  it("says nothing about a gap it never measured, or one too small to be one", () => {
    // Absent lastTalkedAt is a pre-v32 save: the game can't know, so it can't say.
    expect(greetAfter(null)).toBe(RESIDENT_IDLE.scholar![0]);
    expect(greetAfter(2 * DAY)).toBe(RESIDENT_IDLE.scholar![0]);
  });

  it("fires once per absence — the conversation itself resets the clock", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    v.lastTalkedAt = now - 4 * DAY;
    const rng = stubRng(0.99);
    expect(speakFn(w, v, rng, now).text).toBe(RESIDENT_ABSENCE.scholar!.days[0]);
    expect(speakFn(w, v, rng, now + 60_000).text).not.toBe(RESIDENT_ABSENCE.scholar!.days[1]);
  });
});

describe("the in-the-middle-of rung", () => {
  const now = Date.parse("2026-06-10T12:00:00Z");
  const MIN = 60_000;

  it("remarks on a morning of felling once three recent events say so", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    v.memory = [
      { kind: "gathered", at: now - 30 * MIN },
      { kind: "gathered", at: now - 12 * MIN },
      { kind: "gathered", at: now - 2 * MIN },
    ];
    // 0.4 fails the home roll (0.35), passes the midst roll (0.5).
    expect(speakFn(w, v, stubRng(0.4), now).text).toContain("thumps");
  });

  it("prefers the harvest, which knows what came out of the ground", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    v.memory = [
      { kind: "gathered", at: now - 20 * MIN },
      { kind: "gathered", at: now - 15 * MIN },
      { kind: "gathered", at: now - 10 * MIN },
      { kind: "harvested", at: now - 9 * MIN, value: "a pumpkin" },
      { kind: "harvested", at: now - 6 * MIN, value: "a pumpkin" },
      { kind: "harvested", at: now - 3 * MIN, value: "a pumpkin" },
    ];
    expect(speakFn(w, v, stubRng(0.4), now).text).toContain("a pumpkin");
  });

  it("does not call a three-week-old afternoon a busy morning", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    const old = now - 21 * 24 * 3600_000;
    v.memory = [
      { kind: "gathered", at: old },
      { kind: "gathered", at: old + MIN },
      { kind: "gathered", at: old + 2 * MIN },
    ];
    expect(speakFn(w, v, stubRng(0.4), now).text).not.toContain("thumps");
  });
});

// --- Conversation trees -------------------------------------------------------

import { advanceReply, replyLabel } from "./dialogue";
import { CONVERSATIONS } from "../content/conversations";

describe("conversation trees at the ladder", () => {
  function pickLastRng(nextValue: number) {
    return {
      next: () => nextValue,
      int: (n: number) => n - 1,
      pick: <T,>(arr: readonly T[]): T => arr[arr.length - 1],
    };
  }

  it("an idle tap can open a tree, and the root line joins the said ring", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    // Roots pool LAST in the idle pool, so a pick-last rng lands on one.
    const speech = speakFn(w, v, pickLastRng(0.99), Date.now());
    const root = CONVERSATIONS.scholar!.idle![0];
    expect(speech.text).toBe(root.line);
    expect(speech.replies).toBe(root.replies);
    expect(v.said).toContain(root.line);
  });

  it("a reply hands over the next exchange and the ring learns it", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    const root = CONVERSATIONS.scholar!.idle![0];
    const next = advanceReply(v, root.replies![0]);
    expect(next).toBe(root.replies![0].then);
    expect(v.said).toContain(next.line);
  });

  it("a reply is labelled in the player's own voice where one was written", () => {
    const reply = CONVERSATIONS.dog!.absence_weeks![0].replies![0];
    expect(replyLabel(reply, "dog")).toBe("Out there. Sniffing around.");
    expect(replyLabel(reply, "blob")).toBe("Out there. Walking.");
  });

  it("an absence greeting can open a tree too", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 8 });
    const v = bareScholar(w);
    v.lastTalkedAt = Date.now() - 20 * 24 * 3600_000;
    const speech = speakFn(w, v, pickLastRng(0.99), Date.now());
    const root = CONVERSATIONS.scholar!.absence_weeks![0];
    expect(speech.text).toBe(root.line);
    expect(speech.replies).toBe(root.replies);
  });
});

// --- Seasons ----------------------------------------------------------------------

describe("the town remarks on the month", () => {
  const at = (m: number) => new Date(2026, m - 1, 15, 12).getTime();

  /** Every line a villager can produce in a month, across many rolls. */
  function everything(w: ReturnType<typeof importedScholarWorld>, id: string, now: number) {
    const v = w.villagers.find((x) => x.id === id)!;
    const said = new Set<string>();
    for (let i = 0; i < 400; i++) said.add(speak(w, v, makeRng(i), now).text);
    return said;
  }

  it("says something about the season, without being asked about a crop", () => {
    const w = importedScholarWorld();
    const autumn = [...everything(w, "resident1", at(10))];
    expect(autumn.some((t) => /gold|autumn|labelling/i.test(t))).toBe(true);
  });

  it("mentions the in-season crop only when one is in the ground", () => {
    const w = importedScholarWorld();
    const october = at(10);
    const before = [...everything(w, "resident1", october)];
    expect(before.some((t) => /pumpkin/i.test(t))).toBe(false);

    plant(w, 4, 4, "pumpkin", october);
    const after = [...everything(w, "resident1", october)];
    expect(after.some((t) => /pumpkin/i.test(t))).toBe(true);
  });

  it("does not mention a crop whose month it isn't", () => {
    const w = importedScholarWorld();
    const april = at(4);
    plant(w, 4, 4, "pumpkin", april);
    expect([...everything(w, "resident1", april)].some((t) => /pumpkin/i.test(t))).toBe(false);
  });

  it("never tells you to plant anything", () => {
    // THE rule the phase turns on, in the one place it could quietly break.
    // "You'll want to get the kale in" is a quest marker with a face: it turns
    // a look into a schedule (DESIGN §Seasons). Blunt, and cheap.
    const forbidden = /you should|you'll want|you ought|get the .* in\b|better plant|time to plant|don't forget/i;
    for (const form of Object.keys(RESIDENT_SEASON) as AdultForm[]) {
      for (const [id, bank] of Object.entries(RESIDENT_SEASON[form] ?? {})) {
        for (const line of bank!.season) {
          expect(forbidden.test(line), `${form}/${id}: ${line}`).toBe(false);
        }
        for (const t of bank!.crop ?? []) {
          const line = t("pumpkins");
          expect(forbidden.test(line), `${form}/${id}: ${line}`).toBe(false);
        }
      }
    }
  });

  it("gives every form something to say in every season", () => {
    // Coverage is honest rather than complete, so the fallback is what stops a
    // form going silent in a month nobody wrote for it.
    for (const form of ["scholar", "dog", "blob", "carrot", "menace", "gremlin", "office"] as AdultForm[]) {
      for (const id of ["spring", "summer", "autumn", "winter"]) {
        expect(seasonLines(form, id).season.length, `${form}/${id}`).toBeGreaterThan(0);
      }
    }
  });
});
