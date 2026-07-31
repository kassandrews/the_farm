import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import {
  daysInTown,
  releasedBatches,
  openForms,
  counterBatches,
  file,
  cabinet,
  cabinetEmpty,
} from "./filings";
import { FILING_BATCHES, FILINGS, batchesBy } from "../content/filings";

const DAY = 86_400_000;

function world() {
  const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
  w.createdAt = Date.UTC(2026, 6, 1, 12);
  return w;
}
const OPENED = Date.UTC(2026, 6, 1, 12);

describe("what the hall is obliged to offer", () => {
  it("is a total function of one number", () => {
    // The festivals discipline, applied to paperwork: ask how long you have
    // lived here and the answer says which forms exist. No world, no state.
    expect(batchesBy(0).map((b) => b.id)).toEqual(["founding"]);
    expect(batchesBy(2).map((b) => b.id)).toEqual(["founding"]);
    expect(batchesBy(3).map((b) => b.id)).toEqual(["founding", "referendum"]);
    expect(batchesBy(9999).length).toBe(FILING_BATCHES.length);
  });

  it("counts days you have lived here, and never goes negative", () => {
    const w = world();
    expect(daysInTown(w, OPENED)).toBe(0);
    expect(daysInTown(w, OPENED + DAY * 3 - 1)).toBe(2);
    expect(daysInTown(w, OPENED + DAY * 3)).toBe(3);
    // A clock that went backwards (a device timezone shuffle) must not make the
    // hall forget the forms it has always had.
    expect(daysInTown(w, OPENED - DAY * 5)).toBe(0);
  });

  it("opens with the founding schedule and nothing else", () => {
    const w = world();
    expect(releasedBatches(w, OPENED).map((b) => b.id)).toEqual(["founding"]);
    expect(openForms(w, OPENED)).toHaveLength(5);
  });

  it("hands an old save every batch at once, and that is correct", () => {
    // Releases key off `createdAt`, so a town that predates the feature has
    // been in town all that time and is owed everything it missed. Nothing was
    // lost by the cabinet arriving late.
    const w = world();
    expect(releasedBatches(w, OPENED + DAY * 400).length).toBe(FILING_BATCHES.length);
  });
});

describe("filing", () => {
  it("is free, takes the form off the counter, and puts it in the cabinet", () => {
    const w = world();
    const before = JSON.stringify(w.inventory);
    const stamp = file(w, "rename-tuesday", OPENED);

    expect(stamp).toBeTruthy();
    expect(JSON.stringify(w.inventory)).toBe(before); // nothing here costs anything
    expect(openForms(w, OPENED).map((f) => f.id)).not.toContain("rename-tuesday");
    expect(w.filings.map((f) => f.id)).toEqual(["rename-tuesday"]);
  });

  it("refuses a duplicate rather than writing one event twice", () => {
    const w = world();
    file(w, "rename-tuesday", OPENED);
    expect(file(w, "rename-tuesday", OPENED + 1000)).toBeNull();
    expect(w.filings).toHaveLength(1);
  });

  it("changes nothing about the world", () => {
    // The whole promise of a flavour filing. If this ever fails, somebody has
    // given a form teeth without taking the decision (DESIGN §Paperwork).
    const w = world();
    const snapshot = JSON.stringify({
      build: w.build,
      furniture: w.furniture,
      inventory: w.inventory,
      skins: w.skins,
      seeds: w.seeds,
      crops: w.crops,
      overrides: w.overrides,
      villagers: w.villagers,
      flags: w.flags,
    });
    for (const f of openForms(w, OPENED)) file(w, f.id, OPENED);
    expect(
      JSON.stringify({
        build: w.build,
        furniture: w.furniture,
        inventory: w.inventory,
        skins: w.skins,
        seeds: w.seeds,
        crops: w.crops,
        overrides: w.overrides,
        villagers: w.villagers,
        flags: w.flags,
      }),
    ).toBe(snapshot);
  });
});

describe("the counter is not a to-do list", () => {
  it("drops a batch entirely once nothing is left under it", () => {
    // Not five struck-through titles under a heading. A list with ticks down
    // the side of it is a checklist however it is worded.
    const w = world();
    for (const f of openForms(w, OPENED)) file(w, f.id, OPENED);
    expect(counterBatches(w, OPENED)).toEqual([]);
  });

  it("comes back when the town's bureaucracy grows", () => {
    // An empty counter means the hall is between forms, never that the player
    // is finished. The batches keep arriving on the real clock.
    const w = world();
    for (const f of openForms(w, OPENED)) file(w, f.id, OPENED);
    expect(counterBatches(w, OPENED)).toEqual([]);
    expect(counterBatches(w, OPENED + DAY * 3).map((b) => b.batch.id)).toEqual(["referendum"]);
  });
});

describe("the cabinet is a record, not a score", () => {
  it("has an empty state that is a line rather than a zero", () => {
    const w = world();
    expect(cabinetEmpty(w)).toBe(true);
    expect(cabinet(w)).toEqual([]);
  });

  it("groups filings under the reason the hall printed them", () => {
    const w = world();
    file(w, "suspicious-moss", OPENED);
    file(w, "long-way-round", OPENED + DAY * 3);

    const drawer = cabinet(w);
    expect(drawer.map((g) => g.batch.id)).toEqual(["founding", "referendum"]);
    expect(drawer[0].filings.map((f) => f.def.id)).toEqual(["suspicious-moss"]);
  });

  it("shows no group for a batch you have filed nothing from", () => {
    // An empty shelf with a label over it is the "???" slot the tone rules ban,
    // in a filing cabinet.
    const w = world();
    file(w, "suspicious-moss", OPENED);
    expect(cabinet(w).map((g) => g.batch.id)).toEqual(["founding"]);
  });

  it("reads in the order the town acquired its bureaucracy", () => {
    // Not the order you happened to work through it. The hall would insist.
    const w = world();
    file(w, "long-way-round", OPENED + DAY * 3);
    file(w, "rename-tuesday", OPENED + DAY * 4);
    expect(cabinet(w).map((g) => g.batch.id)).toEqual(["founding", "referendum"]);
  });
});

describe("the forms themselves", () => {
  it("has no duplicate ids", () => {
    expect(new Set(FILINGS.map((f) => f.id)).size).toBe(FILINGS.length);
  });

  it("gives every batch a reason", () => {
    // A batch that arrived without one would just be a content drop. The reason
    // is the feature.
    for (const b of FILING_BATCHES) {
      expect(b.notice.length, `${b.id} has no notice`).toBeGreaterThan(20);
      expect(b.forms.length, `${b.id} is empty`).toBeGreaterThan(0);
    }
  });

  it("releases batches in order, starting on the day you arrive", () => {
    expect(FILING_BATCHES[0].afterDays).toBe(0);
    for (let i = 1; i < FILING_BATCHES.length; i++) {
      expect(FILING_BATCHES[i].afterDays).toBeGreaterThan(FILING_BATCHES[i - 1].afterDays);
    }
  });

  it("never names a task", () => {
    // A form reads its own subject and sets the player nothing to do (§Errands
    // notices: past tense, no task).
    for (const f of FILINGS) {
      for (const text of [f.title, f.blurb, f.stamp]) {
        expect(text, `"${f.id}" sets a task`).not.toMatch(
          /\b(you must|you should|you need to|go and|bring me|fetch|collect|complete)\b/i,
        );
      }
    }
  });

  it("never counts anything", () => {
    // No filing may carry a total, a target, or a progress reading. Digits are
    // the cheap tell and there is no legitimate use for one in this table.
    for (const f of FILINGS) {
      for (const text of [f.title, f.blurb, f.stamp]) {
        expect(text, `"${f.id}" has a number in it`).not.toMatch(/\d/);
      }
    }
  });

  it("writes a stamp in the past tense, and every form has one", () => {
    for (const f of FILINGS) {
      expect(f.title.length, `${f.id} has no title`).toBeGreaterThan(0);
      expect(f.blurb.length, `${f.id} has no blurb`).toBeGreaterThan(0);
      expect(f.stamp.startsWith("Filed."), `${f.id}'s stamp doesn't begin "Filed."`).toBe(true);
    }
  });
});
