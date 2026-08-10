import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
// Read as TEXT, via Vite's `?raw`, because the assertion is about what these
// files may IMPORT — which is a fact about the source and invisible to anything
// that imports them normally. `node:fs` would need @types/node, and `npm test`
// does not typecheck, so that error would only surface on the deploy.
import cropsSrc from "../content/crops.ts?raw";
import shopContentSrc from "../content/shop.ts?raw";
import seedstallSrc from "../content/seedstall.ts?raw";
import itemsSrc from "../content/items.ts?raw";
import cropsSimSrc from "./crops.ts?raw";
import seedsSimSrc from "./seeds.ts?raw";
import shopSimSrc from "./shop.ts?raw";
import seasonsSimSrc from "./seasons.ts?raw";
import { SEASONS, seasonOn } from "../content/seasons";
import { seasonAt, inSeason, describeSeason } from "./seasons";
import { CROPS, CROP_ORDER, cropDef } from "../content/crops";
import { SEED_ROWS, VARIETY_ROWS } from "../content/seedstall";
import { SHOP } from "../content/shop";
import { plant } from "./crops";

function freshWorld() {
  const w = newWorld({ name: "Sprout", form: "blob", spot: "forest", seed: 4 });
  w.flags.onboarded = true;
  return w;
}

/** Local time, because the season is asked in local time — the whole game runs
 *  on the player's wall clock (the festivals' own test says the same). */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

describe("the season is a total function of the date", () => {
  it("gives every month exactly one season", () => {
    // A gap would be a month with no weather; an overlap would be a month with
    // two. This is the table's one structural invariant.
    for (let m = 1; m <= 12; m++) {
      const owners = SEASONS.filter((s) => s.months.includes(m));
      expect(owners, `month ${m}`).toHaveLength(1);
    }
  });

  it("puts each month in the season you'd name if asked", () => {
    const expected: Record<number, string> = {
      1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
      6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn",
      11: "autumn", 12: "winter",
    };
    for (let m = 1; m <= 12; m++) {
      expect(seasonOn(at(2026, m, 15)).id, `month ${m}`).toBe(expected[m]);
    }
  });

  it("does not depend on the hour, so it survives midnight and dusk", () => {
    for (const hour of [0, 5, 12, 19, 23]) {
      expect(seasonAt(at(2026, 10, 3, hour)).id).toBe("autumn");
    }
  });

  it("stores nothing — the same date always answers the same, in any world", () => {
    // The whole reason 4d ships at schema v20. If this ever needs a world, a
    // field crept in.
    const a = seasonAt(at(2026, 4, 1));
    const b = seasonAt(at(2027, 4, 1));
    expect(a.id).toBe(b.id);
  });
});

describe("a season never touches agriculture", () => {
  // THE test for DESIGN §Seasons. Everything below is the machine-checked
  // version of "a season is weather and light, and it is never a gate" — the
  // same spirit as heap.test.ts asserting the Gremlin never hands over a
  // material.

  it("is not imported by anything that decides a time, a price, or a yield", () => {
    // The structural version, and the only one of these that can actually fail:
    // asserting the crop table's growth times are the same in December as in
    // June proves nothing while `seasonAt` is pure — it would pass even if
    // somebody wired a season into a price, as long as they did it somewhere
    // else. What keeps the rule true is that these files cannot see the season
    // at all.
    const forbidden: [string, string][] = [
      ["content/crops.ts", cropsSrc],
      ["content/shop.ts", shopContentSrc],
      ["content/seedstall.ts", seedstallSrc],
      ["content/items.ts", itemsSrc],
      ["sim/crops.ts", cropsSimSrc],
      ["sim/seeds.ts", seedsSimSrc],
      ["sim/shop.ts", shopSimSrc],
    ];
    const importsSeasons = /from\s+["'][^"']*seasons["']/;
    // Positive control FIRST. Without it this whole test passes if `?raw` ever
    // hands back an empty string or the regex stops matching — a guard that
    // cannot fail is worse than no guard, because it reads like coverage.
    expect(importsSeasons.test(seasonsSimSrc), "sim/seasons.ts should import the table").toBe(true);
    expect(cropsSrc.length).toBeGreaterThan(100);

    for (const [name, src] of forbidden) {
      expect(importsSeasons.test(src), name).toBe(false);
    }
  });

  it("keeps every variety at one price, which is what stops a season being a market", () => {
    // Guards the seasonal four specifically: seeds.test.ts already asserts
    // all-or-none across counters, and this pins that the four with a month are
    // not quietly dearer or cheaper than the four without one.
    for (const row of [...SHOP, ...SEED_ROWS]) {
      const counts = new Set(
        row.accepts.filter((p) => CROP_ORDER.some((id) => CROPS[id].yields === p.item)).map((p) => p.count),
      );
      expect(counts.size, JSON.stringify(row.accepts)).toBeLessThanOrEqual(1);
    }
    expect(new Set(VARIETY_ROWS.map((r) => JSON.stringify(r.accepts))).size).toBe(1);
  });

  it("names only crops that exist, and never the same crop twice", () => {
    const named = SEASONS.map((s) => s.crop).filter((c): c is NonNullable<typeof c> => c !== null);
    expect(new Set(named).size).toBe(named.length);
    for (const id of named) expect(CROP_ORDER).toContain(id);
  });

  it("leaves four varieties belonging to no season at all", () => {
    // Wheat and the three the game shipped with. Belonging to no month is a
    // property of the crop, not a gap in the table.
    const named = new Set(SEASONS.map((s) => s.crop));
    for (const id of ["carrot", "radish", "potato", "wheat"] as const) {
      expect(named.has(id), id).toBe(false);
    }
  });
});

describe("inSeason", () => {
  it("is true for exactly one variety at a time", () => {
    for (let m = 1; m <= 12; m++) {
      const now = at(2026, m, 15);
      const hits = CROP_ORDER.filter((id) => inSeason(id, now));
      expect(hits, `month ${m}`).toHaveLength(1);
    }
  });

  it("is false for the seasonless four in every month", () => {
    for (let m = 1; m <= 12; m++) {
      for (const id of ["carrot", "radish", "potato", "wheat"] as const) {
        expect(inSeason(id, at(2026, m, 15)), `${id} in month ${m}`).toBe(false);
      }
    }
  });

  it("puts each seasonal variety in the month you'd expect", () => {
    expect(inSeason("peas", at(2026, 4, 1))).toBe(true);
    expect(inSeason("tomato", at(2026, 7, 1))).toBe(true);
    expect(inSeason("pumpkin", at(2026, 10, 1))).toBe(true);
    expect(inSeason("kale", at(2026, 1, 1))).toBe(true);
    // …and not in somebody else's.
    expect(inSeason("pumpkin", at(2026, 4, 1))).toBe(false);
  });
});

describe("describeSeason", () => {
  it("talks about the crop only when one is actually in the ground", () => {
    // A villager who says the pumpkins are in when you have never planted one
    // is the town describing a screenshot.
    const w = freshWorld();
    const october = at(2026, 10, 3);
    expect(describeSeason(w, october).kind).toBe("season");

    plant(w, 4, 17, "pumpkin", october);
    const note = describeSeason(w, october);
    expect(note.kind).toBe("in_season_crop");
    expect(note.value).toBe("pumpkin");
    expect(note.season).toBe("autumn");
  });

  it("ignores a planted crop whose month it isn't", () => {
    const w = freshWorld();
    const april = at(2026, 4, 3);
    plant(w, 4, 17, "pumpkin", april);
    expect(describeSeason(w, april).kind).toBe("season");
  });

  it("counts a seedling, not just a ripe one", () => {
    // The line is "it's the month for these", which is as true of a sprout.
    const w = freshWorld();
    const july = at(2026, 7, 3);
    plant(w, 4, 17, "tomato", july);
    expect(w.crops["4,17"].stage).toBe(0);
    expect(describeSeason(w, july).kind).toBe("in_season_crop");
  });

  it("always has something to say, in every month", () => {
    const w = freshWorld();
    for (let m = 1; m <= 12; m++) {
      const note = describeSeason(w, at(2026, m, 15));
      expect(note.value, `month ${m}`).not.toBe("");
    }
  });
});

describe("the crops the season names", () => {
  it("gives every variety a distinct harvest line and a speakable noun", () => {
    const lines = new Set<string>();
    for (const id of CROP_ORDER) {
      const def = cropDef(id);
      expect(def.harvestLine.length, id).toBeGreaterThan(0);
      lines.add(def.harvestLine);
      // "a wheat" and "a peas" are the reason `carried` exists at all.
      expect(def.carried, id).not.toBe(`a ${def.yieldName}s`);
      expect(def.carried.startsWith("a ") || def.carried.startsWith("some "), id).toBe(true);
    }
    expect(lines.size).toBe(CROP_ORDER.length);
  });
});
