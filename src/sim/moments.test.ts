// Moments (DESIGN §Moments). Like company.test.ts, most of these are NEGATIVES,
// because the design is defined by what it refuses: no count, no screen, no
// announcement, no friendship, and above all nothing that turns "the sky did
// something while you were both outside" into a thing to go and get.

import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { MOMENTS, sweepMoments } from "./moments";
import { RESIDENT_MEMORY } from "../content/dialogue";
import { MEMORY_PRIORITY } from "./dialogue";
import { cubeSite } from "./world";
import { SHOWERS } from "../content/showers";
import { FAR_OUT } from "./notebook";
import { sweepNoticed, noticed } from "./notebook";
import { hasMemory } from "./memory";
import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";

function world(): WorldState {
  return newWorld({ name: "Me", form: "blob", spot: "forest", seed: 7 });
}

function find(w: WorldState, id: CharId): Villager {
  const v = w.villagers.find((x) => x.id === id);
  if (!v) throw new Error(`no ${id}`);
  return v;
}

/** Stand somebody right next to the player, on the same layer. */
function bringAlong(w: WorldState, id: CharId): Villager {
  const v = find(w, id);
  v.x = w.player.x;
  v.y = w.player.y;
  v.layer = w.player.layer;
  return v;
}

/** The night of the Perseids, well after dark, in a year the calendar agrees
 *  with. Built from the real table rather than a literal, so a shower moving in
 *  content/showers.ts moves this with it. */
const PERSEIDS = SHOWERS.find((s) => s.id === "perseids")!;
const SHOWER_NIGHT = new Date(2026, PERSEIDS.month - 1, PERSEIDS.day, 23, 0, 0).getTime();
/** An ordinary summer night with nothing in the sky. */
const PLAIN_NIGHT = new Date(2026, 5, 15, 23, 0, 0).getTime();
/** Out in the cold, midday so nothing else fires. */
const WINTER_DAY = new Date(2026, 0, 15, 12, 0, 0).getTime();

describe("a Moment is a second record, and only if somebody was there", () => {
  it("writes to whoever was standing with you", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    sweepMoments(w, SHOWER_NIGHT);
    expect(hasMemory(v.memory, "shower")).toBe(true);
  });

  it("writes nothing at all when you are alone, and that is not a failure", () => {
    // The night still happened and you still saw it — the journal half below
    // says so. What does not exist is somebody else who was there, because
    // there was nobody else there.
    const w = world();
    for (const v of w.villagers) {
      v.x = w.player.x + 50;
      v.y = w.player.y + 50;
    }
    sweepMoments(w, SHOWER_NIGHT);
    expect(w.villagers.some((v) => hasMemory(v.memory, "shower"))).toBe(false);
  });

  it("still writes the journal half when you are alone", () => {
    // The load-bearing half of the rule. If solitude were the only route to a
    // journal entry the optimal play would be to walk away from people before
    // anything nice happened, so the journal never asks who came.
    const w = world();
    sweepNoticed(w, SHOWER_NIGHT);
    expect(noticed(w, "a-busy-sky")).toBe(true);
  });

  it("writes the journal half with company too — both records, one night", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    sweepNoticed(w, SHOWER_NIGHT);
    sweepMoments(w, SHOWER_NIGHT);
    expect(noticed(w, "a-busy-sky")).toBe(true);
    expect(hasMemory(v.memory, "shower")).toBe(true);
  });

  it("does not write to somebody across the field", () => {
    const w = world();
    const near = bringAlong(w, "errands");
    const far = find(w, "shop");
    far.x = w.player.x + 40;
    far.y = w.player.y + 40;
    sweepMoments(w, SHOWER_NIGHT);
    expect(hasMemory(near.memory, "shower")).toBe(true);
    expect(hasMemory(far.memory, "shower")).toBe(false);
  });

  it("does not fire on a night the sky is doing nothing", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    sweepMoments(w, PLAIN_NIGHT);
    expect(hasMemory(v.memory, "shower")).toBe(false);
  });
});

describe("the sweep does not flood the log", () => {
  // THE BUG THIS FILE EXISTS FOR. Every other repeatable memory in the game is
  // written once, at the instant of an action. These are written by a predicate
  // that stays true for HOURS, on a sweep that runs twice a second — and
  // `shower` and `winter_came` are deliberately not one-shots, because each
  // night and each year is its own. Without idempotence by kind AND value, one
  // shower would push a villager's entire 64-entry life out of the ring inside
  // a minute.
  it("records one shower once, however many times the sweep runs", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    for (let i = 0; i < 200; i++) sweepMoments(w, SHOWER_NIGHT + i * 500);
    expect(v.memory.filter((m) => m.kind === "shower")).toHaveLength(1);
  });

  it("records one winter once", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    for (let i = 0; i < 200; i++) sweepMoments(w, WINTER_DAY + i * 500);
    expect(v.memory.filter((m) => m.kind === "winter_came")).toHaveLength(1);
  });

  it("but two different showers are two memories", () => {
    // The `festival` argument: collapsing by kind would mean the first night you
    // ever stood out for was the last one anybody noticed.
    const w = world();
    const v = bringAlong(w, "errands");
    const lyrids = SHOWERS.find((s) => s.id === "lyrids")!;
    const other = new Date(2026, lyrids.month - 1, lyrids.day, 23, 0, 0).getTime();
    sweepMoments(w, SHOWER_NIGHT);
    sweepMoments(w, other);
    expect(v.memory.filter((m) => m.kind === "shower")).toHaveLength(2);
  });

  it("and two winters are two memories", () => {
    const w = world();
    const v = bringAlong(w, "errands");
    sweepMoments(w, WINTER_DAY);
    sweepMoments(w, new Date(2027, 0, 15, 12, 0, 0).getTime());
    expect(v.memory.filter((m) => m.kind === "winter_came")).toHaveLength(2);
  });

  it("keeps the far country to once ever, however many trips", () => {
    const w = world();
    w.player.x = FAR_OUT + 20;
    w.player.y = 0;
    const v = bringAlong(w, "errands");
    sweepMoments(w, WINTER_DAY);
    sweepMoments(w, WINTER_DAY + 86_400_000 * 30);
    expect(v.memory.filter((m) => m.kind === "far_out")).toHaveLength(1);
  });
});

describe("a Moment is not a job, and pays nothing", () => {
  it("pays no friendship, however long the sky keeps doing it", () => {
    // Why this file does not call `witness`. `witness` befriends whoever was
    // present, because friendship here grows out of doing work somebody can
    // see. Nobody has done anything under a meteor shower; the sky is doing it.
    // Routed through `witness` this sweep would pay a point every half second.
    const w = world();
    const v = bringAlong(w, "errands");
    const before = v.friendship;
    for (let i = 0; i < 200; i++) sweepMoments(w, SHOWER_NIGHT + i * 500);
    expect(v.friendship).toBe(before);
  });

  it("returns nothing to say — a Moment is never announced", () => {
    // `sweepNoticed` returns its lines so the caller can say them, because
    // writing in your own journal is a thing you did. A Moment surfaces later,
    // obliquely, or not at all: no toast, no line, no "✨ Moment".
    const w = world();
    bringAlong(w, "errands");
    expect(sweepMoments(w, SHOWER_NIGHT)).toBeUndefined();
  });
});

describe("the standing Cube fix", () => {
  it("pays a companion at the Cube once, not once a frame", () => {
    // Not a Moment, but the same faucet from the other side, and the reason
    // `someoneHereLacks` exists in sim/game.ts. The `hum` witness fires EVERY
    // FRAME while you stand in front of the Cube and `witness` befriends
    // unconditionally, so a companion walked all the way out there used to peg
    // at maximum friendship in about two seconds. The memory was always right —
    // `hum` is a one-shot — so every existing test passed while it leaked.
    const w = world();
    const c = w.villagers[0];
    const before = c.friendship;
    // Stand on the Cube with somebody, and let a second of frames go by.
    const site = cubeSite(w.seed, w.homestead.spot);
    w.player.x = site.x;
    w.player.y = site.y;
    c.x = site.x;
    c.y = site.y;
    for (let i = 0; i < 60; i++) tick(w, 1 / 60, WINTER_DAY + i * 16);
    expect(hasMemory(c.memory, "hum")).toBe(true);
    expect(c.friendship).toBe(before + 1);
  });
});

describe("what the tables must agree about", () => {
  it("every Moment can actually be spoken by somebody", () => {
    // The notebook's both-directions check, applied here. A Moment nobody has a
    // line for is a memory that can never surface, and surfacing is the entire
    // payout — there is no screen it could show up on instead.
    for (const def of MOMENTS) {
      const forms = Object.entries(RESIDENT_MEMORY).filter(([, bank]) => bank?.[def.kind]?.length);
      expect(forms.length, `no form speaks to ${def.kind}`).toBeGreaterThan(0);
    }
  });

  it("every Moment is ranked, or it could never be reached", () => {
    // `tryMemoryLine` walks MEMORY_PRIORITY and nothing else, so a kind missing
    // from that list is a bank that is never read — which is how `gathered`,
    // `arrived` and `housed` already sit silent in the union.
    for (const def of MOMENTS) {
      expect(MEMORY_PRIORITY, `${def.kind} is unranked`).toContain(def.kind);
    }
  });

  it("no Moment line mentions snow", () => {
    // The seasons rule, defended the way notebook.test.ts defends the absence of
    // fauna: winter here is a colour temperature and NOT a weather layer
    // (content/seasons.ts), so a villager reminiscing about snowfall would send
    // the first player who went looking for it to find a bug.
    for (const def of MOMENTS) {
      for (const bank of Object.values(RESIDENT_MEMORY)) {
        for (const line of bank?.[def.kind] ?? []) {
          expect(line("a thing").toLowerCase()).not.toMatch(/snow|sleet|blizzard/);
        }
      }
    }
  });

  it("no Moment line tells you how to have one", () => {
    // Triggers stay unstated. A line that names the condition — how far out,
    // which month, how many nights a year — has published the objective, and a
    // published Moment is a chore.
    for (const def of MOMENTS) {
      for (const bank of Object.values(RESIDENT_MEMORY)) {
        for (const line of bank?.[def.kind] ?? []) {
          expect(line("the old one").toLowerCase()).not.toMatch(/\b(tiles?|miles?|every year|five times|next one)\b/);
        }
      }
    }
  });
});
