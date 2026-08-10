import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { SCHEMA_VERSION } from "./save";
import { FESTIVALS, FESTIVAL_FROM_HOUR, FESTIVAL_TO_HOUR, AUDIENCE, STAGE, STAGE_STAND, watchCell } from "../content/festivals";
import { CAST, charDef, scheduledStop } from "../content/cast";
import { festivalOn, activeFestival, isEve, nextFestival, lastFestival, daysUntil, festivalsBetween, attend, sawYouAt } from "./festival";
import { PARK } from "../content/town";

function freshWorld() {
  const w = newWorld({ name: "Sprout", form: "blob", spot: "forest", seed: 4 });
  w.flags.onboarded = true;
  return w;
}

/** A local-time timestamp, because every festival question is asked in local
 *  time (the whole game runs on the player's wall clock). */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

const MARCH = FESTIVALS.find((f) => f.id === "the-airing")!; // 3 March
const DURING = at(2026, MARCH.month, MARCH.day, FESTIVAL_FROM_HOUR + 1);

describe("the calendar", () => {
  it("has exactly one festival in every month", () => {
    for (let m = 1; m <= 12; m++) {
      expect(FESTIVALS.filter((f) => f.month === m)).toHaveLength(1);
    }
  });

  it("is a total function of the date — same date, same answer, no world involved", () => {
    for (const f of FESTIVALS) {
      const a = festivalOn(at(2026, f.month, f.day, 9));
      const b = festivalOn(at(2026, f.month, f.day, 23));
      expect(a?.id).toBe(f.id);
      expect(b?.id).toBe(f.id);
    }
    // And a different year gives the same answer, because nothing accumulates.
    expect(festivalOn(at(2031, MARCH.month, MARCH.day))?.id).toBe(MARCH.id);
  });

  it("is active only inside its hours", () => {
    const day = (h: number) => activeFestival(at(2026, MARCH.month, MARCH.day, h));
    expect(day(FESTIVAL_FROM_HOUR - 1)).toBeNull();
    expect(day(FESTIVAL_FROM_HOUR)?.id).toBe(MARCH.id);
    expect(day(FESTIVAL_TO_HOUR - 1)?.id).toBe(MARCH.id);
    expect(day(FESTIVAL_TO_HOUR)).toBeNull();
    // ...and never on a day without one.
    expect(activeFestival(at(2026, MARCH.month, MARCH.day + 1, FESTIVAL_FROM_HOUR))).toBeNull();
  });

  it("knows the eve, and doesn't call the day itself an eve", () => {
    expect(isEve(at(2026, MARCH.month, MARCH.day - 1))).toBe(true);
    expect(isEve(at(2026, MARCH.month, MARCH.day))).toBe(false);
    expect(isEve(at(2026, MARCH.month, MARCH.day - 2))).toBe(false);
  });
});

describe("looking forward and back", () => {
  it("counts today's festival as next until it has finished", () => {
    const morning = at(2026, MARCH.month, MARCH.day, 8);
    expect(nextFestival(morning)?.def.id).toBe(MARCH.id);
    expect(daysUntil(morning, nextFestival(morning)!.at)).toBe(0);

    // Once it's over, next is next month's — and today's is the last one.
    const after = at(2026, MARCH.month, MARCH.day, FESTIVAL_TO_HOUR + 1);
    expect(nextFestival(after)?.def.id).not.toBe(MARCH.id);
    expect(lastFestival(after)?.def.id).toBe(MARCH.id);
  });

  it("wraps into the next year rather than running out", () => {
    const december = FESTIVALS.find((f) => f.month === 12)!;
    const after = at(2026, 12, december.day, FESTIVAL_TO_HOUR + 1);
    const next = nextFestival(after)!;
    expect(next.def.month).toBe(1);
    expect(new Date(next.at).getFullYear()).toBe(2027);
  });

  it("counts days in calendar days, so 'tomorrow' survives midnight", () => {
    const eveMorning = at(2026, MARCH.month, MARCH.day - 1, 8);
    const eveNight = at(2026, MARCH.month, MARCH.day - 1, 23);
    expect(daysUntil(eveMorning, nextFestival(eveMorning)!.at)).toBe(1);
    expect(daysUntil(eveNight, nextFestival(eveNight)!.at)).toBe(1);
  });

  it("reports every festival inside an away window, oldest first", () => {
    const from = at(2026, 1, 1);
    const to = at(2026, 4, 1);
    const seen = festivalsBetween(from, to);
    expect(seen.map((f) => f.def.month)).toEqual([1, 2, 3]);
    // A coffee break contains none.
    expect(festivalsBetween(at(2026, 5, 1, 9), at(2026, 5, 1, 11))).toHaveLength(0);
  });

});

describe("the gather", () => {
  it("replaces a resident's routine while it's on, and leaves it alone otherwise", () => {
    const resident = CAST.resident1;
    expect(scheduledStop(resident, DURING).doing).toBe("at the festival");
    const morning = at(2026, MARCH.month, MARCH.day, 9);
    expect(scheduledStop(resident, morning).doing).not.toBe("at the festival");
    // ...and on an ordinary day of the same hour, nothing changes.
    expect(scheduledStop(resident, at(2026, MARCH.month, MARCH.day + 1, FESTIVAL_FROM_HOUR + 1)).doing).not.toBe("at the festival");
  });

  it("leaves the institutions at their counters — the shop does not close", () => {
    for (const def of Object.values(CAST)) {
      if (!def.fixed) continue;
      expect(scheduledStop(def, DURING).doing).not.toBe("at the festival");
    }
  });

  it("gives everyone a different cell, derived from who they are", () => {
    const ids = ["resident1", "newcomer:0", "newcomer:1", "newcomer:2", "newcomer:3"] as const;
    const cells = ids.map((id) => watchCell(id));
    expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(ids.length);
    // Asked twice, the same answer — a crowd, not weather. And unaffected by
    // who else happens to be in town, which indexing the roster would not be.
    expect(ids.map((id) => watchCell(id))).toEqual(cells);
  });

  it("sends a newcomer to the festival too, whatever ring they walk", () => {
    const newcomer = charDef({ id: "newcomer:1", name: "Rummage", form: "gremlin", fixed: false });
    expect(scheduledStop(newcomer, DURING).doing).toBe("at the festival");
  });

  it("stands the audience on the park's open ground, not on the platform or on the Blob", () => {
    // It used to say PLAZA, because the stage stood on the paving. The stage is
    // in the park now (content/town.ts §THE PARK) and the crowd went with it, so
    // the claim that actually matters is the one this always meant: they stand on
    // the amphitheatre's own ground, in front of the platform, on nobody.
    for (const cell of AUDIENCE) {
      expect(cell.x).toBeGreaterThanOrEqual(PARK.x0);
      expect(cell.x).toBeLessThanOrEqual(PARK.x1);
      expect(cell.y).toBeGreaterThanOrEqual(PARK.y0);
      expect(cell.y).toBeLessThanOrEqual(PARK.y1);
      // In FRONT of it, which is the half the old bounds check never made.
      expect(cell.y).toBeGreaterThan(STAGE.y + 1);
      // The stage is 2x2 anchored at STAGE.
      const onStage = cell.x >= STAGE.x && cell.x <= STAGE.x + 1 && cell.y >= STAGE.y && cell.y <= STAGE.y + 1;
      expect(onStage).toBe(false);
      expect(`${cell.x},${cell.y}`).not.toBe(`${STAGE_STAND.x},${STAGE_STAND.y}`);
    }
  });
});

describe("being there", () => {
  /** Stand the player and everybody else at the stage. */
  function atTheFestival() {
    const w = freshWorld();
    w.player.x = STAGE.x;
    w.player.y = STAGE.y + 2;
    for (const v of w.villagers) {
      v.x = STAGE.x;
      v.y = STAGE.y + 3;
    }
    return w;
  }

  it("warms the room once, and only once", () => {
    const w = atTheFestival();
    const before = w.villagers.map((v) => v.friendship);
    expect(attend(w, DURING)?.id).toBe(MARCH.id);
    expect(w.villagers.map((v) => v.friendship)).not.toEqual(before);

    // Every subsequent tick of the same evening does nothing at all.
    const after = w.villagers.map((v) => v.friendship);
    expect(attend(w, DURING)).toBeNull();
    expect(attend(w, DURING + 60_000)).toBeNull();
    expect(w.villagers.map((v) => v.friendship)).toEqual(after);
  });

  it("counts the same festival next year as a new one", () => {
    const w = atTheFestival();
    attend(w, DURING);
    const nextYear = at(2027, MARCH.month, MARCH.day, FESTIVAL_FROM_HOUR + 1);
    expect(attend(w, nextYear)?.id).toBe(MARCH.id);
  });

  it("does nothing when you aren't there", () => {
    const w = atTheFestival();
    w.player.x = STAGE.x + 40;
    w.player.y = STAGE.y + 40;
    const before = JSON.stringify(w);
    expect(attend(w, DURING)).toBeNull();
    expect(JSON.stringify(w)).toBe(before);
  });

  it("MISSING ONE COSTS NOTHING — the world is byte-identical afterwards", () => {
    const w = atTheFestival();
    const before = JSON.stringify(w);
    // The whole festival passes with the player at home.
    w.player.x = STAGE.x + 40;
    w.player.y = STAGE.y + 40;
    for (let h = FESTIVAL_FROM_HOUR; h < FESTIVAL_TO_HOUR; h++) {
      attend(w, at(2026, MARCH.month, MARCH.day, h));
    }
    w.player.x = STAGE.x;
    w.player.y = STAGE.y + 2;
    expect(JSON.stringify(w)).toBe(before);
  });

  it("is remembered by the people who were standing there, and by the player", () => {
    const w = atTheFestival();
    attend(w, DURING);
    // Everyone who GATHERED — the residents and the Blob. Not the counters:
    // the Office Creature is five tiles from the platform and behind a shut
    // door, and a radius check put him in the crowd until the browser showed
    // him warming to you from inside the town hall.
    expect(w.villagers.filter((v) => !v.fixed || v.id === "stage").every((v) => sawYouAt(v, MARCH, DURING))).toBe(true);
    expect(sawYouAt(w.villagers.find((v) => v.id === "office")!, MARCH, DURING)).toBe(false);
    expect(sawYouAt(w.villagers.find((v) => v.id === "shop")!, MARCH, DURING)).toBe(false);
    expect(w.player.memory.some((m) => m.kind === "festival" && m.value === MARCH.name)).toBe(true);
  });

  it("is not noticed by somebody who was across town", () => {
    const w = atTheFestival();
    const absentee = w.villagers[0];
    absentee.x = STAGE.x + 60;
    absentee.y = STAGE.y + 60;
    attend(w, DURING);
    expect(sawYouAt(absentee, MARCH, DURING)).toBe(false);
  });
});

/** Every sim module and the cast table, as source text.
 *
 *  Read through Vite's `?raw` rather than through `node:fs`, because this
 *  project has no node types and the build runs `tsc` over the tests too — the
 *  house rule about `npm test` not typechecking, arriving from the direction of
 *  a test file for once. */
const SOURCES = import.meta.glob("./*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const CAST_SOURCE = import.meta.glob("../content/cast.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("what a festival may never do", () => {
  it("adds no field to the world and no schema version", () => {
    const w = freshWorld();
    expect(w.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.keys(w)).not.toContain("festival");
    expect(Object.keys(w)).not.toContain("festivals");
    // Attending changes people, never the town's own record.
    const keys = Object.keys(w).sort();
    w.player.x = STAGE.x;
    w.player.y = STAGE.y + 2;
    for (const v of w.villagers) {
      v.x = STAGE.x;
      v.y = STAGE.y + 3;
    }
    attend(w, DURING);
    expect(Object.keys(w).sort()).toEqual(keys);
  });

  it("is read by nothing that accepts or refuses anything", () => {
    // The same shape as heap.test.ts's and museum.test.ts's negatives: the
    // files below are the ones that can say no to the player, and none of them
    // may ever ask whether you went to a party.
    //
    // Checked on the IMPORTS rather than on the word, so that a file is still
    // free to explain in a comment why it doesn't do this — sim/housing.ts,
    // whose whole note on the subject is that the gather is somebody else's
    // job, would otherwise fail a test for saying so.
    const gates = ["assign.ts", "commission.ts", "museum.ts", "heap.ts", "shop.ts", "seeds.ts", "errands.ts", "housing.ts"];
    for (const file of gates) {
      const src = SOURCES[`./${file}`];
      expect(src, `${file} should be readable`).toBeTypeOf("string");
      expect(src.includes('from "./festival"'), `${file} must not import sim/festival`).toBe(false);
      expect(src.includes("content/festivals"), `${file} must not import the festival table`).toBe(false);
    }
  });

  it("tells the schedule WHERE and nothing else", () => {
    // content/cast.ts is the one file outside the panel that consults
    // festivals, and what it may take is a COORDINATE. The moment a routine
    // asked who had attended what, where somebody sleeps would start depending
    // on whether you went to a party.
    const src = CAST_SOURCE["../content/cast.ts"];
    // On the call, not on the word: the file's comment explains why a routine
    // must not know who attended anything, and it would be an odd test that
    // failed on saying so.
    expect(src).toContain("watchCell(");
    expect(src).not.toContain("sawYouAt(");
    expect(src).not.toContain("attend(");
  });
});
