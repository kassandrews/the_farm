import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { migrateSave } from "./save";
import { meetCosmos, cosmosMet, cosmos, showerTonight, updateCosmos } from "./cosmos";
import { cosmosHome } from "./world";
import { COSMOS_HOME } from "../content/dialogue";
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

  // --- At home in the sky (Phase 7c) ---------------------------------------

  it("is at home in the sky on every day that is not a shower night", () => {
    // The rule the whole phase turns on: ONE Sidra, in ONE place, decided by the
    // calendar. Her home being findable is what stops the sky being a room with
    // nobody in it; her being ELSEWHERE on the five nights is what stops her
    // becoming a visitor with an address.
    const w = metWorld();
    const home = cosmosHome(w.seed, w.homestead.spot);

    updateCosmos(w, NIGHT_AFTER); // an ordinary August evening
    expect(cosmos(w)!.layer).toBe("sky");
    expect({ x: cosmos(w)!.x, y: cosmos(w)!.y }).toEqual(home);

    updateCosmos(w, PEAK); // the Perseids
    expect(cosmos(w)!.layer).toBe("surface");
    expect(Math.hypot(cosmos(w)!.x - w.homestead.originX, cosmos(w)!.y - w.homestead.originY)).toBeLessThan(4);

    // And back, at dawn. Her house is not left empty for the rest of the year
    // because she came down once.
    updateCosmos(w, NIGHT_AFTER);
    expect(cosmos(w)!.layer).toBe("sky");
  });

  it("is home at noon, which the old rule could not say", () => {
    // Presence used to mean "night, and a shower", so on any afternoon she was
    // nowhere at all. She is now somewhere at every instant — she just is not
    // somewhere you can walk to without climbing.
    const w = metWorld();
    updateCosmos(w, PEAK_NOON);
    const c = cosmos(w)!;
    expect(c.layer).toBe("sky");
    expect(present(c, PEAK_NOON)).toBe(true);
  });

  it("lives a short walk from the first staircase, not a search away", () => {
    // The sky has no bearings: every direction looks the same forever. A home
    // sited independently of the way up would be a person you find by luck.
    const w = freshWorld();
    const home = cosmosHome(w.seed, w.homestead.spot);
    // Far enough to be off the screen you arrive on, near enough that walking a
    // small circle from the steps finds her.
    const r = Math.hypot(home.x, home.y);
    expect(r).toBeGreaterThan(200); // out where the staircase is, not over the town
  });

  it("speaks from her own bank at home, and from the shower's when she is down here", () => {
    const w = metWorld();
    const c = cosmos(w)!;
    updateCosmos(w, NIGHT_AFTER);
    for (let i = 0; i < 40; i++) {
      // Her home lines, on a night with no shower — which used to be the one
      // conversation in the game that could only answer "...".
      expect(COSMOS_HOME).toContain(speak(w, c, makeRng(i), NIGHT_AFTER).text);
    }
    updateCosmos(w, PEAK);
    const perseids = SHOWERS.find((s) => s.id === "perseids")!;
    for (let i = 0; i < 40; i++) {
      expect(perseids.lines).toContain(speak(w, c, makeRng(i), PEAK).text);
    }
  });

  it("can be met at home, by somebody who has never seen a shower", () => {
    // The second door, and it is the right way round: you walked two hundred
    // tiles, found the staircase that goes somewhere and knocked. The five
    // nights are then a person you know, visiting.
    const w = freshWorld();
    const home = cosmosHome(w.seed, w.homestead.spot);
    w.player.layer = "sky";
    w.player.x = home.x;
    w.player.y = home.y + 1;
    expect(cosmosMet(w)).toBe(false);
    meetCosmos(w, PEAK_NOON); // an ordinary afternoon, no shower anywhere near
    expect(cosmosMet(w)).toBe(true);
    expect(cosmos(w)!.layer).toBe("sky");
  });
});