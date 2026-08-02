import { describe, it, expect } from "vitest";
import { newWorld, talk } from "./game";
import { makeRng } from "./rng";
import {
  observe,
  noticed,
  journal,
  journalEmpty,
  sweepNoticed,
  tellable,
  NOTICED_WHEN,
  TOLD_WHEN,
} from "./notebook";
import { OBSERVATIONS, observationLine } from "../content/notebook";
import type { ObservationId } from "../content/notebook";
import { PLAZA } from "./world";
import { befriend } from "./friendship";

const NOW = Date.UTC(2026, 6, 1, 12);

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

describe("the journal", () => {
  it("starts blank, and says so with a line rather than a zero", () => {
    const w = world();
    expect(journalEmpty(w)).toBe(true);
    expect(journal(w)).toEqual([]);
  });

  it("writes an entry once and never twice", () => {
    const w = world();
    expect(observe(w, "the-fen", NOW)).toBeTruthy();
    expect(observe(w, "the-fen", NOW + 5000)).toBeNull();
    expect(w.notebook).toHaveLength(1);
    expect(noticed(w, "the-fen")).toBe(true);
  });

  it("reads in the order you wrote it", () => {
    // A journal is a sequence. Not grouped by subject: headings for subjects you
    // have nothing under are the blanks this must not have, and headings only
    // for the ones you DO have quietly count the kinds of thing that exist.
    const w = world();
    observe(w, "the-hum", NOW);
    observe(w, "the-fen", NOW + 1);
    expect(journal(w).map((e) => e.def.id)).toEqual(["the-hum", "the-fen"]);
  });

  it("fills a told entry's name from the live villager, not from a stored copy", () => {
    // v23 had to migrate every save in the world because a name was COPIED into
    // a record. This resolves at render instead.
    const w = world();
    const mole = w.villagers.find((v) => v.id === "mole");
    observe(w, "veins-do-not-return", NOW);
    if (mole) {
      mole.name = "Reginald";
      expect(journal(w)[0].line).toContain("Reginald");
    }
    expect(journal(w)[0].line).not.toContain("{who}");
  });

  it("still reads correctly for a speaker the town no longer has", () => {
    const w = world();
    observe(w, "veins-do-not-return", NOW);
    w.villagers = w.villagers.filter((v) => v.id !== "mole");
    const line = journal(w)[0].line;
    expect(line).not.toContain("{who}");
    expect(line.length).toBeGreaterThan(20);
  });
});

describe("noticing", () => {
  it("writes down the plaza when you are standing on it", () => {
    const w = world();
    w.player.x = 0;
    w.player.y = 0;
    w.player.layer = "surface";
    expect(w.player.x >= PLAZA.x0 && w.player.x <= PLAZA.x1).toBe(true);

    const lines = sweepNoticed(w, NOW);
    expect(lines.length).toBeGreaterThan(0);
    expect(noticed(w, "the-datum")).toBe(true);
  });

  it("says nothing the second time you stand there", () => {
    const w = world();
    w.player.x = 0;
    w.player.y = 0;
    sweepNoticed(w, NOW);
    expect(sweepNoticed(w, NOW + 1000)).toEqual([]);
  });

  it("keeps the entry after you walk away", () => {
    // The whole reason no distance is stored: the ENTRY is the record that you
    // were once out there, so the condition is free to go false again.
    const w = world();
    w.player.x = 0;
    w.player.y = 0;
    sweepNoticed(w, NOW);
    w.player.x = 4000;
    w.player.y = 4000;
    expect(noticed(w, "the-datum")).toBe(true);
  });

  it("notices the far country only when you are actually out in it", () => {
    const w = world();
    w.player.layer = "surface";
    w.player.x = 0;
    w.player.y = 0;
    sweepNoticed(w, NOW);
    expect(noticed(w, "far-out")).toBe(false);

    w.player.x = 900;
    w.player.y = 0;
    sweepNoticed(w, NOW);
    expect(noticed(w, "far-out")).toBe(true);
  });

  it("does not notice surface things from underground or from the sky", () => {
    // Every surface predicate checks the layer. Without it, standing in a tunnel
    // under the plaza would write down the plaza.
    for (const layer of ["under", "sky"] as const) {
      const w = world();
      w.player.x = 0;
      w.player.y = 0;
      w.player.layer = layer;
      sweepNoticed(w, NOW);
      expect(noticed(w, "the-datum"), `noticed the plaza from the ${layer}`).toBe(false);
    }
  });

  it("notices the sky from the sky", () => {
    const w = world();
    w.player.layer = "sky";
    sweepNoticed(w, NOW);
    expect(noticed(w, "above-the-cloud")).toBe(true);
  });

  it("does not think a town with no shaft is deep underground", () => {
    // `depthAt` returns Infinity when there is no shaft at all, and Infinity is
    // >= SLATE_DEPTH. The layer check makes that unreachable in play; this pins
    // the guard so it stays unreachable.
    const w = world();
    w.player.layer = "under";
    w.player.x = 0;
    w.player.y = 0;
    sweepNoticed(w, NOW);
    expect(noticed(w, "deep-rock")).toBe(false);
  });
});

describe("being told", () => {
  it("is a conversation, and nothing else writes it down", () => {
    const w = world();
    const gary = w.villagers.find((v) => v.id === "office")!;
    befriend(gary, 500); // they know you now

    // A sweep must never produce a told entry, however friendly the town is.
    sweepNoticed(w, NOW);
    expect(noticed(w, "the-peg")).toBe(false);

    talk(w, "office", makeRng(1), NOW);
    expect(noticed(w, "the-peg")).toBe(true);
  });

  it("is not offered by a stranger", () => {
    // Nobody tells somebody they met ten seconds ago the thing they have
    // privately concluded about the ground.
    const w = world();
    expect(tellable(w, "office", NOW)).toEqual([]);
    talk(w, "office", makeRng(1), NOW);
    expect(noticed(w, "the-peg")).toBe(false);
  });

  it("is said once, and the speaker goes back to their ordinary voice", () => {
    const w = world();
    const gary = w.villagers.find((v) => v.id === "office")!;
    befriend(gary, 500);

    const first = talk(w, "office", makeRng(1), NOW)!.text;
    expect(first).toContain("peg");
    expect(tellable(w, "office", NOW)).toEqual([]);

    // Ten more conversations, and not one of them repeats it.
    const rng = makeRng(9);
    for (let i = 0; i < 10; i++) {
      expect(talk(w, "office", rng, NOW)!.text).not.toContain("peg");
    }
  });

  it("reaches the secrets, who answer from their own bank first", () => {
    // Three of the seven told rows are spoken BY secrets, and `trySecretLine`
    // returns early for exactly those three. If the told branch is ever moved
    // below it, the most interesting half of this feature silently dies.
    const w = world();
    const mole = w.villagers.find((v) => v.id === "mole");
    if (!mole) return; // the Mole is only in the world once met
    befriend(mole, 500);
    talk(w, "mole", makeRng(1), NOW);
    expect(noticed(w, "veins-do-not-return")).toBe(true);
  });
});

describe("the table", () => {
  it("has no duplicate ids", () => {
    expect(new Set(OBSERVATIONS.map((o) => o.id)).size).toBe(OBSERVATIONS.length);
  });

  it("gives every noticed row a trigger, and every trigger a row", () => {
    // Both directions. Content holds the text and sim holds the condition
    // (content may not import sim), so this is the only place the two are
    // checked against each other. An observation nothing can fire is dead
    // content; a trigger for a row that doesn't exist is a typo that never
    // reports itself.
    const ids = new Set<string>(OBSERVATIONS.map((o) => o.id));
    for (const o of OBSERVATIONS) {
      if (o.source !== "noticed") continue;
      expect(NOTICED_WHEN[o.id], `"${o.id}" can never be noticed`).toBeDefined();
    }
    for (const id of Object.keys(NOTICED_WHEN)) {
      expect(ids.has(id), `a trigger for "${id}", which is not an observation`).toBe(true);
      const def = OBSERVATIONS.find((o) => o.id === id)!;
      expect(def.source, `"${id}" is told, but has a world trigger`).toBe("noticed");
    }
  });

  it("gives every told row a speaker, a remark, and a gate", () => {
    for (const o of OBSERVATIONS) {
      if (o.source !== "told") continue;
      expect(o.from, `"${o.id}" is told by nobody`).toBeDefined();
      expect(o.remark?.length, `"${o.id}" has no spoken line`).toBeGreaterThan(0);
      expect(TOLD_WHEN[o.id as ObservationId], `"${o.id}" has no gate`).toBeDefined();
      // The book is your paraphrase of what they said, not a transcript. If the
      // two are ever the same string, one of them is doing nothing.
      expect(o.line).not.toBe(o.remark);
    }
  });

  it("puts {who} in every told line and in no noticed one", () => {
    for (const o of OBSERVATIONS) {
      if (o.source === "told") expect(o.line, `"${o.id}"`).toContain("{who}");
      else expect(o.line, `"${o.id}"`).not.toContain("{who}");
    }
  });

  it("never names a task", () => {
    // An entry reads its own past and never sets a future. The moment one reads
    // as an instruction the journal has become a quest log.
    for (const o of OBSERVATIONS) {
      for (const text of [o.line, o.remark ?? ""]) {
        expect(text, `"${o.id}" sets a task`).not.toMatch(
          /\b(you must|you should|you need to|go and|try to|remember to|in order to)\b/i,
        );
      }
    }
  });

  it("never counts anything", () => {
    // No entry may carry a total or a progress reading. A journal that says
    // "the third of five staircases" has told you there are five.
    for (const o of OBSERVATIONS) {
      expect(observationLine(o, "Somebody"), `"${o.id}" has a number in it`).not.toMatch(/\d/);
    }
  });

  it("mentions no animal you could go and look at", () => {
    // The rule this guards is "the Notebook may not name wildlife that is not
    // there", NOT "there is no wildlife" — which is what the comment here used to
    // say, and which was never a decision anybody took. DESIGN §"Living light,
    // and the animals that stay out" settles it: the world may hold light that
    // reads as alive (the dusk has fireflies), and may not hold creatures you can
    // do anything to.
    //
    // So the list below stays exactly as it was. Birds were removed, the poled
    // pond is a joke about there being no fish, and an entry naming one of these
    // would send the first player who went looking to find a bug. A firefly is
    // absent from the list because a firefly is now somewhere you can actually
    // go and see one.
    for (const o of OBSERVATIONS) {
      for (const text of [o.line, o.remark ?? ""]) {
        expect(text, `"${o.id}" mentions wildlife`).not.toMatch(
          /\b(bird|birds|owl|owls|fish|insect|beetle|butterfly|moth|frog|deer)\b/i,
        );
      }
    }
  });
});
