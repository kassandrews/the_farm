import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { migrateSave } from "./save";
import { meetCosmos, cosmosMet, cosmos, showerTonight } from "./cosmos";
import { SHOWERS } from "../content/showers";
import { present } from "./presence";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { canInvite } from "./company";
import { possibleAskers } from "./errands";
import { simulateAway } from "./away";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "dog", spot: "forest", seed: 4242 });
}

/** The night of the Perseids, 2026: the twelfth of August, at half past ten. */
const PEAK = new Date(2026, 7, 12, 22, 30).getTime();
/** The same night, two hours after midnight. Still the twelfth's shower. */
const AFTER_MIDNIGHT = new Date(2026, 7, 13, 2, 0).getTime();
/** The next evening. Over. */
const NIGHT_AFTER = new Date(2026, 7, 13, 22, 30).getTime();
/** Noon on the peak day: a date with a shower on it, but not a night. */
const PEAK_NOON = new Date(2026, 7, 12, 12, 0).getTime();

function standOutside(w: ReturnType<typeof freshWorld>) {
  w.player.layer = "surface";
  w.player.x = w.homestead.originX;
  w.player.y = w.homestead.originY + 1;
}

describe("the calendar", () => {
  it("finds the five real showers on their real nights", () => {
    for (const s of SHOWERS) {
      const at = new Date(2026, s.month - 1, s.day, 23, 0).getTime();
      expect(showerTonight(at)?.id).toBe(s.id);
    }
  });

  it("finds nothing on an ordinary night", () => {
    expect(showerTonight(new Date(2026, 5, 15, 23, 0).getTime())).toBeNull();
  });

  it("keeps a night whole across midnight", () => {
    // Two in the morning on the thirteenth is still the twelfth's shower to
    // anybody standing outside in it. A plain date lookup would make her vanish
    // at midnight, in front of you.
    expect(showerTonight(PEAK)?.id).toBe("perseids");
    expect(showerTonight(AFTER_MIDNIGHT)?.id).toBe("perseids");
    expect(showerTonight(NIGHT_AFTER)).toBeNull();
  });

  it("does not roll a night back over a month or a year boundary", () => {
    // The third of January at 1am is the SECOND's night, and the Quadrantids
    // are on the third. This is the case a naive `day - 1` gets wrong.
    expect(showerTonight(new Date(2026, 0, 3, 1, 0).getTime())).toBeNull();
    expect(showerTonight(new Date(2026, 0, 3, 23, 0).getTime())?.id).toBe("quadrantids");
    expect(showerTonight(new Date(2026, 0, 4, 2, 0).getTime())?.id).toBe("quadrantids");
  });

  it("works in a leap year exactly the same way", () => {
    for (const s of SHOWERS) {
      const at = new Date(2028, s.month - 1, s.day, 23, 0).getTime();
      expect(showerTonight(at)?.id).toBe(s.id);
    }
  });

  it("is five nights, no two in the same month", () => {
    expect(SHOWERS.length).toBe(5);
    expect(new Set(SHOWERS.map((s) => s.month)).size).toBe(5);
  });
});

describe("meeting the Stray Cosmos", () => {
  it("is not in a new town, and no migration puts her there", () => {
    const w = freshWorld();
    expect(cosmosMet(w)).toBe(false);

    const old = JSON.parse(JSON.stringify({ ...w, schemaVersion: 16 }));
    const migrated = migrateSave(old);
    expect(migrated).not.toBeNull();
    expect(migrated!.villagers.some((v) => v.id === "cosmos")).toBe(false);
  });

  it("does not happen on an ordinary night", () => {
    const w = freshWorld();
    standOutside(w);
    meetCosmos(w, new Date(2026, 5, 15, 23, 0).getTime());
    expect(cosmosMet(w)).toBe(false);
  });

  it("does not happen at noon on the day of one", () => {
    const w = freshWorld();
    standOutside(w);
    meetCosmos(w, PEAK_NOON);
    expect(cosmosMet(w)).toBe(false);
  });

  it("does not happen while you are underground", () => {
    const w = freshWorld();
    standOutside(w);
    w.player.layer = "under";
    meetCosmos(w, PEAK);
    expect(cosmosMet(w)).toBe(false);
  });

  it("happens on the homestead, on the night, exactly once", () => {
    const w = freshWorld();
    standOutside(w);
    meetCosmos(w, PEAK);
    expect(cosmosMet(w)).toBe(true);

    const c = cosmos(w)!;
    expect(c.form).toBe("cosmos");
    expect(Math.hypot(c.x - w.homestead.originX, c.y - w.homestead.originY)).toBeLessThanOrEqual(3);

    meetCosmos(w, PEAK);
    meetCosmos(w, AFTER_MIDNIGHT);
    expect(w.villagers.filter((v) => v.id === "cosmos").length).toBe(1);
  });

  it("does not happen if you are miles away that night", () => {
    const w = freshWorld();
    w.player.x = w.homestead.originX + 40;
    w.player.y = w.homestead.originY + 40;
    meetCosmos(w, PEAK);
    expect(cosmosMet(w)).toBe(false);
  });

  it("arrives through the ordinary tick", () => {
    const w = freshWorld();
    standOutside(w);
    tick(w, 1 / 60, PEAK);
    expect(cosmosMet(w)).toBe(true);
  });
});

describe("she is a visitor, not a resident", () => {
  function metWorld() {
    const w = freshWorld();
    standOutside(w);
    meetCosmos(w, PEAK);
    return w;
  }

  it("is present on her nights and absent on every other", () => {
    const w = metWorld();
    const c = cosmos(w)!;
    expect(present(c, PEAK)).toBe(true);
    expect(present(c, AFTER_MIDNIGHT)).toBe(true);
    expect(present(c, PEAK_NOON)).toBe(false);
    expect(present(c, NIGHT_AFTER)).toBe(false);
  });

  it("stays in the save between visits, and keeps what she knows of you", () => {
    // The whole payoff of the second August is that she has met you before, so
    // she is never removed and re-added. Absence is `present`, not deletion.
    const w = metWorld();
    const c = cosmos(w)!;
    c.friendship = 12;
    for (let i = 0; i < 60; i++) tick(w, 1 / 60, NIGHT_AFTER);
    expect(cosmosMet(w)).toBe(true);
    expect(cosmos(w)!.friendship).toBe(12);
  });

  it("cannot be invited along and is never on the errands board", () => {
    const w = metWorld();
    const c = cosmos(w)!;
    c.friendship = 100;
    expect(canInvite(w, c, PEAK).ok).toBe(false);
    expect(possibleAskers(w).some((v) => v.id === "cosmos")).toBe(false);
  });

  it("speaks the lines of the shower that is actually on", () => {
    const w = metWorld();
    const c = cosmos(w)!;
    const perseids = SHOWERS.find((s) => s.id === "perseids")!;
    for (let i = 0; i < 40; i++) {
      expect(perseids.lines).toContain(speak(w, c, makeRng(i), PEAK).text);
    }
    const geminids = SHOWERS.find((s) => s.id === "geminids")!;
    const dec = new Date(2026, 11, 13, 23, 0).getTime();
    for (let i = 0; i < 40; i++) {
      expect(geminids.lines).toContain(speak(w, c, makeRng(i), dec).text);
    }
  });

  it("never turns up in the postcard", () => {
    // A postcard reading "something passed over" to a player who has never met
    // her would be the UI spoiling the secret. There is no away event at all.
    const w = freshWorld();
    const lines = simulateAway(w, 48 * 3600_000, PEAK, makeRng(7));
    for (const line of lines) {
      const l = line.toLowerCase();
      expect(l).not.toContain("cosmos");
      expect(l).not.toContain("shower");
      expect(l).not.toContain("meteor");
    }
  });
});
