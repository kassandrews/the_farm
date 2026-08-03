import { describe, it, expect } from "vitest";
import { newWorld, talk } from "./game";
import { makeRng } from "./rng";
import {
  observe,
  noticed,
  journal,
  journalChunks,
  journalEmpty,
  sweepNoticed,
  tellable,
  NOTICED_WHEN,
  TOLD_WHEN,
} from "./notebook";
import { OBSERVATIONS, observationLine } from "../content/notebook";
import type { ObservationId } from "../content/notebook";
import { PLAZA, biomeAt } from "./world";
import { befriend } from "./friendship";

const NOW = Date.UTC(2026, 6, 1, 12);

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

/** Every entry the panel would draw, in the order it would draw them — the
 *  chunks flattened back into one list. */
function chunked(w: ReturnType<typeof world>, now: number) {
  return journalChunks(w, now).flatMap((c) => c.entries);
}

/** Local noon on a day. Local, not UTC: "yesterday" and "Tuesday" are questions
 *  about the calendar on the wall, so a test written in UTC passes or fails
 *  depending on which side of midnight the runner's timezone lands. */
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();

/** Wednesday 1 July 2026 — a summer day, mid-week, so every rung below has room
 *  on both sides of it. */
const WED = at(2026, 6, 1);

/** The heading a single entry written at `t` sits under, read from `now`. */
function heading(t: number, now: number): string {
  const w = world();
  observe(w, "the-fen", t);
  return journalChunks(w, now)[0].heading;
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

  it("reads back newest first, which is the opposite of how it was written", () => {
    // The record is a sequence; the READING is a journal, and you open a journal
    // at the end. Scrolling past a year to reach the thing you noticed a minute
    // ago would make it an archive.
    const w = world();
    observe(w, "the-hum", NOW);
    observe(w, "the-fen", NOW + 1);
    expect(chunked(w, NOW + 1).map((e) => e.def.id)).toEqual(["the-fen", "the-hum"]);
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

  it("notices how a tree is built, standing in an ordinary wood", () => {
    // The correspondence test only proves a trigger EXISTS for each row. This
    // proves one fires — and the ordinary woods are worth the check because they
    // had no observation at all until now, which is exactly why there was room
    // for one.
    const w = world();
    let stood = false;
    for (let d = 25; d < 90 && !stood; d++) {
      const b = biomeAt(w.seed, w.homestead.spot, d, 0);
      if (b !== "pinewood" && b !== "birch") continue;
      w.player.x = d;
      w.player.y = 0;
      stood = true;
    }
    expect(stood, "seed 42 has no ordinary wood east of town").toBe(true);
    // WED, not NOW. `NOW` is UTC noon, and `skyPhaseAt` reads LOCAL hours — so on
    // a runner west of about UTC-6 it is an early-morning hour, and in summer the
    // daylight shift moves dawn to roughly 03:45–05:45 (sim/time.ts), which put
    // this squarely inside it. The dew row fired alongside the tree row and this
    // test reported a design collision that was entirely its own clock. Any test
    // that cares which rows fire wants a LOCAL time.
    sweepNoticed(w, WED);
    expect(noticed(w, "the-dead-middle")).toBe(true);
    expect(noticed(w, "nothing-rained")).toBe(false);
  });

  it("notices the dew at dawn and at no other hour", () => {
    // Five in the morning, and it has to be: summer runs dawn from about 03:45
    // to 05:45, so six o'clock is broad day in July and this test's first draft
    // asserted the row would fire in daylight. The season moves the boundary
    // (§10g), which makes "what hour is dawn" a question with four answers.
    const w = world();
    const dawn = new Date(2026, 6, 1, 5).getTime();
    const noon = new Date(2026, 6, 1, 12).getTime();
    sweepNoticed(w, noon);
    expect(noticed(w, "nothing-rained")).toBe(false);
    sweepNoticed(w, dawn);
    expect(noticed(w, "nothing-rained")).toBe(true);
  });

  it("writes down a finish you found, and none you were never given", () => {
    // The channel for a found unlock: no toast may say "you have unlocked" a
    // secret, so the book is where it goes. `skins.unlocked` is standing state,
    // which is why the sweep can read it with no event and no hook.
    const w = world();
    sweepNoticed(w, NOW);
    expect(noticed(w, "the-dark-grain")).toBe(false);
    expect(noticed(w, "the-flat-sheet")).toBe(false);

    w.skins.unlocked.push("walnut");
    sweepNoticed(w, NOW);
    expect(noticed(w, "the-dark-grain")).toBe(true);
    expect(noticed(w, "the-flat-sheet")).toBe(false);
  });

  it("does not say the same thing about flat rock twice", () => {
    // `deep-rock` fires at the exact depth slate unlocks at, and its line is
    // already "the rock splits flat here". The carried-back row earns its place
    // only by being about a different thing — having a piece — so if somebody
    // rewords either one into the other's territory, these two entries become
    // the same note printed twice, adjacent, under one date.
    const a = observationLine(OBSERVATIONS.find((o) => o.id === "deep-rock")!);
    const b = observationLine(OBSERVATIONS.find((o) => o.id === "the-flat-sheet")!);
    expect(a).not.toBe(b);
    expect(b).not.toContain("splits");
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

  it("dates the last few days by name, and everything older by season", () => {
    // The ladder coarsens, which is how somebody dating a page actually does it:
    // you remember which DAY something happened for about a week, and after
    // that you remember which season.
    expect(heading(WED, WED)).toBe("Today");
    expect(heading(at(2026, 5, 30), WED)).toBe("Yesterday");
    expect(heading(at(2026, 5, 27), WED)).toBe("Saturday");
    expect(heading(at(2026, 5, 20), WED)).toBe("Earlier in summer");
    expect(heading(at(2026, 3, 15), WED)).toBe("Last spring");
    expect(heading(at(2025, 6, 15), WED)).toBe("Summer, last year");
    expect(heading(at(2024, 6, 15), WED)).toBe("Summer, 2024");
  });

  it("keeps a winter that crosses new year in one heading", () => {
    // The bug this is here for: winter is months 12, 1 and 2, so the obvious
    // `year * 4 + index` ordinal splits one winter down the middle and files
    // December and January a year apart. Somebody who lived through it would
    // call the whole thing one winter.
    const w = world();
    observe(w, "the-hum", at(2026, 11, 20));
    observe(w, "the-fen", at(2027, 0, 10));
    const chunks = journalChunks(w, at(2027, 1, 15));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe("Earlier in winter");
  });

  it("never repeats a heading, because the ladder only ever coarsens", () => {
    // Consecutive grouping is only correct while `headingFor` is monotone in
    // time. A rung that isn't would silently print the same date twice, with
    // other days in between — this is the test that would say so.
    const w = world();
    const days = [0, 1, 2, 4, 6, 9, 20, 40, 120, 300, 400, 800];
    const ids = OBSERVATIONS.slice(0, days.length).map((o) => o.id);
    days.forEach((d, i) => observe(w, ids[i], WED - d * 86_400_000));
    const headings = journalChunks(w, WED).map((c) => c.heading);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("makes every heading out of an entry, so none can be empty", () => {
    // THE STRUCTURAL DEFENCE, and the whole reason chunking by time is allowed
    // where chunking by subject is not. A category can have nothing under it and
    // become the blank this feature must never show. A date cannot: it was built
    // from something that is already under it.
    const w = world();
    const days = [0, 3, 30, 500];
    OBSERVATIONS.slice(0, days.length).forEach((o, i) =>
      observe(w, o.id, WED - days[i] * 86_400_000),
    );
    for (const c of journalChunks(w, WED)) expect(c.entries.length).toBeGreaterThan(0);
  });

  it("says the same thing over one entry as over three", () => {
    // No heading may leak a count — not a total, not a per-day tally. The
    // heading is a fact about WHEN, and it must not vary with what is under it.
    const one = world();
    observe(one, "the-fen", WED);
    const three = world();
    for (const o of OBSERVATIONS.slice(0, 3)) observe(three, o.id, WED);
    expect(journalChunks(three, WED)).toHaveLength(1);
    expect(journalChunks(three, WED)[0].heading).toBe(journalChunks(one, WED)[0].heading);
  });

  it("reads a clock that went backwards as today, not as a day in the future", () => {
    // A save carried between two devices that disagree about the time. "Friday"
    // for something that has not happened yet would be worse than a flat lie.
    expect(heading(WED + 3 * 86_400_000, WED)).toBe("Today");
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

  it("promises no weather, because there isn't any", () => {
    // The fauna trap one step along, and easier to walk into because nothing in
    // the word list looks dangerous. There is no rain, no snow and no storm in
    // this world — winter is a colour temperature (content/seasons.ts) — so an
    // entry naming one sends a player to watch a sky that will never do it.
    //
    // CLOUD IS NOT ON THE LIST, deliberately. It is not weather here, it is a
    // PLACE: the sky is a layer you can stand on top of, and `above-the-cloud`
    // is a legitimate note about somewhere you have been. Banning the word would
    // fail a true entry, which is how a guard like this stops being trusted.
    for (const o of OBSERVATIONS) {
      for (const text of [o.line, o.remark ?? ""]) {
        expect(text, `"${o.id}" promises weather`).not.toMatch(
          /\b(rain|rains|rained|raining|snow|snows|snowed|sleet|hail|storm|storms)\b/i,
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
