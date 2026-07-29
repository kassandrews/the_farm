import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { migrateSave, SCHEMA_VERSION } from "./save";
import { ERRANDS, NOTICES, errandDef } from "../content/errands";
import { ITEMS } from "../content/items";
import { CAST } from "../content/cast";
import { TOWN_FIXTURES } from "../content/town";
import {
  newErrands,
  errandDue,
  postErrand,
  eligibleErrands,
  errandState,
  deliverErrand,
  declineErrand,
  notices,
  cardText,
  boardNear,
  possibleAskers,
  isAsking,
} from "./errands";
import { makeRng } from "./rng";
import { add, count } from "./inventory";
import { recall } from "./memory";

function freshWorld() {
  const w = newWorld({ name: "Sprout", form: "blob", spot: "forest", seed: 4 });
  w.flags.onboarded = true; // the board doesn't speak to someone mid-intro
  return w;
}

const rng = () => makeRng(11);
const HOUR = 3_600_000;

/** A world with a card already up, and the asker it went to. */
function withOpenErrand(now = Date.now()) {
  const w = freshWorld();
  w.errands.lastClosedAt = now - 24 * HOUR;
  const open = postErrand(w, now, rng())!;
  return { w, open, def: errandDef(open.id) };
}

/** Put enough of what the card asks for in the satchel. */
function stock(w: ReturnType<typeof freshWorld>, def: ReturnType<typeof errandDef>) {
  add(w.inventory, def.ask.item, def.ask.count);
}

// --- The table ------------------------------------------------------------------

describe("the errand table", () => {
  it("only ever asks for things you can actually get", () => {
    // Seed is out because a request payable in seed makes farming a
    // prerequisite for farming.
    //
    // Ore was first excluded for being unobtainable, and stays excluded now
    // that it isn't, for the sharper reason (DESIGN §Errands): a card names ONE
    // item and offers nothing instead of it, so an ore card is "go underground
    // or miss this friendship beat". The Menace's counter may take ore
    // precisely because every row there lists alternatives; a request lists
    // none.
    for (const e of ERRANDS) {
      expect(ITEMS[e.ask.item]).toBeDefined();
      expect(e.ask.item).not.toBe("ore");
      expect(e.ask.item).not.toBe("seed");
    }
  });

  it("asks for an afternoon's worth, never a project", () => {
    for (const e of ERRANDS) {
      expect(e.ask.count).toBeGreaterThan(0);
      expect(e.ask.count).toBeLessThanOrEqual(4);
    }
  });

  it("has unique ids and a name-shaped hole in every card", () => {
    expect(new Set(ERRANDS.map((e) => e.id)).size).toBe(ERRANDS.length);
    for (const e of ERRANDS) expect(e.card).toContain("{who}");
  });
});

// --- Posting --------------------------------------------------------------------

describe("posting a request", () => {
  it("stays quiet for a few minutes, then has its first card", () => {
    // The clock starts part-wound (newErrands), so "the first gap is short" is a
    // property of the starting state rather than a branch in errandDue.
    const w = freshWorld();
    const start = w.createdAt;
    expect(errandDue(w, start)).toBe(false);
    expect(errandDue(w, start + 60_000)).toBe(false);
    expect(errandDue(w, start + 20 * 60_000)).toBe(true);
  });

  it("uses ONE gap, so refusing can never be a way to hurry the board", () => {
    // Regression: the first version branched on `done.length === 0`, and a
    // refusal doesn't touch `done` — so refusing the opening request brought the
    // next one back in fifteen minutes while running it cost four hours. Saying
    // no became the efficient play, which is the one thing it must never be.
    const now = Date.now();
    const refused = withOpenErrand(now);
    declineErrand(refused.w, now);
    expect(refused.w.errands.done).toEqual([]); // the condition that broke it
    expect(errandDue(refused.w, now + 20 * 60_000)).toBe(false);
    expect(errandDue(refused.w, now + 5 * HOUR)).toBe(true);
  });

  it("says nothing at all before the intro is over", () => {
    const w = freshWorld();
    w.flags.onboarded = false;
    expect(errandDue(w, w.errands.lastClosedAt + 24 * HOUR)).toBe(false);
  });

  it("posts ONE card, and does not stack a second behind it", () => {
    const now = Date.now();
    const { w } = withOpenErrand(now);
    // Two days later, with a card still up: still one card.
    expect(errandDue(w, now + 48 * HOUR)).toBe(false);
    expect(postErrand(w, now + 48 * HOUR, rng())).toBeNull();
  });

  it("does not accumulate a backlog across an absence", () => {
    // The property the whole design rests on, and the reason due-ness is two
    // timestamps rather than a countdown: come back on Thursday to one request,
    // not to forty.
    const w = freshWorld();
    const now = w.errands.lastClosedAt + 7 * 24 * HOUR;
    expect(errandDue(w, now)).toBe(true);
    postErrand(w, now, rng());
    expect(errandDue(w, now)).toBe(false);
    expect(w.errands.open).not.toBeNull();
  });

  it("never asks the Dog to run an errand to his own board", () => {
    const w = freshWorld();
    expect(possibleAskers(w).some((v) => v.id === "errands")).toBe(false);
    // And he is genuinely in town to be excluded, or this test proves nothing.
    expect(w.villagers.some((v) => v.id === "errands")).toBe(true);
  });

  it("speaks for somebody who is actually standing in the town", () => {
    const { w, open } = withOpenErrand();
    const asker = w.villagers.find((v) => v.id === open.askerId);
    expect(asker).toBeDefined();
    expect(cardText(w, open)).toContain(asker!.name);
    expect(cardText(w, open)).not.toContain("{who}");
    expect(isAsking(w, open.askerId)).toBe(true);
  });
});

// --- Cycling ---------------------------------------------------------------------

describe("the table cycles rather than running out", () => {
  it("prefers rows you have not seen", () => {
    const w = freshWorld();
    w.errands.done = ERRANDS.slice(0, 3).map((e) => e.id);
    const pool = eligibleErrands(w);
    expect(pool.length).toBe(ERRANDS.length - 3);
    for (const e of pool) expect(w.errands.done).not.toContain(e.id);
  });

  it("comes round again once every row has been seen", () => {
    // Arrivals and antiquities END on purpose; this deliberately doesn't. A
    // board that ran dry would be a board the town stopped using.
    const w = freshWorld();
    w.errands.done = ERRANDS.map((e) => e.id);
    expect(eligibleErrands(w).length).toBeGreaterThan(0);
  });

  it("never asks for the same thing twice running", () => {
    const w = freshWorld();
    w.errands.done = ERRANDS.map((e) => e.id);
    const last = w.errands.done[w.errands.done.length - 1];
    expect(eligibleErrands(w).some((e) => e.id === last)).toBe(false);
  });
});

// --- Handing it over ---------------------------------------------------------------

describe("running an errand", () => {
  it("refuses, and changes nothing, when you are short", () => {
    const { w, def } = withOpenErrand();
    const before = count(w.inventory, def.ask.item);
    expect(deliverErrand(w, Date.now())).toBeNull();
    expect(count(w.inventory, def.ask.item)).toBe(before);
    expect(w.errands.open).not.toBeNull(); // the card is still up
  });

  it("spends exactly what the card asked for", () => {
    const { w, def } = withOpenErrand();
    stock(w, def);
    const before = count(w.inventory, def.ask.item);
    expect(deliverErrand(w, Date.now())).toBe(def.thanks);
    expect(count(w.inventory, def.ask.item)).toBe(before - def.ask.count);
  });

  it("pays the asker in friendship and a memory, and the Dog a little", () => {
    const now = Date.now();
    const { w, open, def } = withOpenErrand(now);
    stock(w, def);
    const asker = w.villagers.find((v) => v.id === open.askerId)!;
    const dog = w.villagers.find((v) => v.id === "errands")!;
    const askerBefore = asker.friendship;
    const dogBefore = dog.friendship;

    deliverErrand(w, now);

    expect(asker.friendship).toBeGreaterThan(askerBefore);
    expect(dog.friendship).toBeGreaterThan(dogBefore);
    // The asker warms MORE than the postman: the errand was for them.
    expect(asker.friendship - askerBefore).toBeGreaterThan(dog.friendship - dogBefore);
    expect(recall(asker.memory, "errand")).toMatchObject({ value: def.ask.item });
  });

  it("PAYS NO ITEM — not a material, not produce, not a finish, not an unlock", () => {
    // The negative this whole file is written around. There are four counters in
    // town that give you things; a fifth would undercut all of them, and a
    // request you complete for goods is a job rather than a favour.
    const now = Date.now();
    const { w, def } = withOpenErrand(now);
    stock(w, def);
    const before = { ...w.inventory };
    const skins = [...w.skins.unlocked];
    const seeds = [...w.seeds.unlocked];

    deliverErrand(w, now);

    for (const [id, n] of Object.entries(before)) {
      const after = count(w.inventory, id as keyof typeof before);
      expect(after).toBeLessThanOrEqual(n as number); // never up, only down
    }
    expect(w.skins.unlocked).toEqual(skins);
    expect(w.seeds.unlocked).toEqual(seeds);
  });

  it("goes quiet for the same gap whether you did it or refused it", () => {
    // If refusing brought the next card sooner it would be the efficient play;
    // later, and it would be a punishment. Saying no has to cost exactly zero.
    const now = Date.now();
    const a = withOpenErrand(now);
    stock(a.w, a.def);
    deliverErrand(a.w, now);

    const b = withOpenErrand(now);
    declineErrand(b.w, now);

    expect(a.w.errands.lastClosedAt).toBe(b.w.errands.lastClosedAt);
    expect(errandDue(a.w, now + HOUR)).toBe(errandDue(b.w, now + HOUR));
    expect(errandDue(a.w, now + 5 * HOUR)).toBe(true);
    expect(errandDue(b.w, now + 5 * HOUR)).toBe(true);
  });

  it("remembers nothing about a refusal", () => {
    const now = Date.now();
    const { w, open } = withOpenErrand(now);
    const asker = w.villagers.find((v) => v.id === open.askerId)!;
    const before = asker.friendship;

    declineErrand(w, now);

    expect(w.errands.open).toBeNull();
    expect(asker.friendship).toBe(before);
    expect(recall(asker.memory, "errand")).toBeUndefined();
    // And the row is genuinely back in the pool — a refusal is not a strike.
    expect(w.errands.done).toEqual([]);
    expect(eligibleErrands(w).some((e) => e.id === open.id)).toBe(true);
  });
});

// --- The notices column -----------------------------------------------------------

describe("the notices column", () => {
  it("is never longer than a glance", () => {
    const w = freshWorld();
    expect(notices(w).length).toBeLessThanOrEqual(4);
  });

  it("does not grow as the town does", () => {
    // The failure mode ROADMAP flagged: a notices half that lengthens with
    // activity is a to-do list arriving by a side door.
    const w = freshWorld();
    const quiet = notices(w).length;
    w.museum.donated.push({ id: "timber", placard: 1 });
    w.seeds.unlocked.push("radish");
    w.errands.done.push(ERRANDS[0].id, ERRANDS[1].id, ERRANDS[2].id);
    expect(notices(w).length).toBeLessThanOrEqual(quiet + 1);
  });

  it("always has something up, even in a brand new town", () => {
    // The standing notices. A board that is blank until you have done things is
    // a board that looks broken on day one.
    expect(notices(freshWorld()).length).toBeGreaterThan(0);
  });

  it("cannot see what you are carrying", () => {
    // Structural, not a promise: NoticeWorld has no inventory in it, so a notice
    // literally cannot say "you need three carrots". This asserts the behaviour
    // that type buys.
    const w = freshWorld();
    const before = notices(w);
    add(w.inventory, "carrot", 40);
    add(w.inventory, "junk", 40);
    expect(notices(w)).toEqual(before);
  });

  it("cannot see the open request either", () => {
    const now = Date.now();
    const w = freshWorld();
    const before = notices(w);
    w.errands.lastClosedAt = now - 24 * HOUR;
    postErrand(w, now, rng());
    expect(notices(w)).toEqual(before);
  });

  it("speaks only in the past tense — no counts, no targets", () => {
    // Every notice, under every state the table can reach. A number in this
    // column would be a score with the arithmetic left to the reader.
    const w = freshWorld();
    w.museum.donated.push({ id: "timber", placard: 2 });
    w.seeds.unlocked.push("radish", "potato");
    w.errands.done.push(...ERRANDS.map((e) => e.id));
    for (const line of notices(w)) {
      expect(line).not.toMatch(/\d+\s*(of|\/)\s*\d+/); // "3 of 9"
      expect(line.toLowerCase()).not.toContain("remaining");
      expect(line.toLowerCase()).not.toContain("left to");
      expect(line.toLowerCase()).not.toContain("you need");
    }
  });

  it("has every notice return either null or a real sentence", () => {
    for (const fn of NOTICES) {
      const line = fn({
        museum: { donated: [] },
        seeds: { unlocked: [] },
        villagers: [],
        errandsDone: 0,
      });
      if (line !== null) expect(line.length).toBeGreaterThan(10);
    }
  });
});

// --- Reaching the board ------------------------------------------------------------

describe("the board itself", () => {
  it("is standing in the world from the moment a town exists", () => {
    const w = freshWorld();
    const fixture = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;
    expect(w.furniture[`${fixture.x},${fixture.y}`]?.id).toBe("noticeboard");
  });

  it("is readable from any side, with nobody standing at it", () => {
    // The reason boardNear exists: the Dog walks a round, so for most of the day
    // there is nobody at the board, and a notice board you can only read when
    // the postman is present does not work.
    const w = freshWorld();
    const f = TOWN_FIXTURES.find((x) => x.id === "noticeboard")!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      expect(boardNear(w, f.x + dx, f.y + dy)).toEqual({ x: f.x, y: f.y });
    }
    // Not from across the square, and not diagonally.
    expect(boardNear(w, f.x + 1, f.y + 1)).toBeNull();
    expect(boardNear(w, f.x + 4, f.y)).toBeNull();
  });

  it("has a Dog who starts and ends his day at it", () => {
    // The round is the point, but the two times you are most likely to be in the
    // plaza should be the two times he is there.
    const stops = CAST.errands.schedule;
    const first = stops[0];
    const last = stops[stops.length - 1];
    expect({ x: last.x, y: last.y }).toEqual({ x: first.x, y: first.y });
    // And he does genuinely leave, or "deliveries" is a word on a card.
    expect(stops.some((s) => s.x !== first.x || s.y !== first.y)).toBe(true);
  });
});

// --- The save ------------------------------------------------------------------------

describe("schema v15", () => {
  it("gives an upgraded town a board and a Dog", () => {
    const w = freshWorld();
    const raw = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    raw.schemaVersion = 14;
    delete raw.errands;
    // Wind the town back to before either existed, the way a real v14 save is.
    const villagers = (raw.villagers as { id: string }[]).filter((v) => v.id !== "errands");
    raw.villagers = villagers;
    const f = TOWN_FIXTURES.find((x) => x.id === "noticeboard")!;
    delete (raw.furniture as Record<string, unknown>)[`${f.x},${f.y}`];

    const out = migrateSave(raw)!;
    expect(out).not.toBeNull();
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.villagers.some((v) => v.id === "errands")).toBe(true);
    expect(out.furniture[`${f.x},${f.y}`]?.id).toBe("noticeboard");
  });

  it("does not ambush a returning player with a request on load", () => {
    // lastClosedAt backfills to NOW rather than to zero. At zero the board was
    // last quiet in 1970, so errandDue would be true the instant the save
    // loaded — the town shouting at somebody who just opened the door.
    const w = freshWorld();
    const raw = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    raw.schemaVersion = 14;
    delete raw.errands;

    const out = migrateSave(raw)!;
    expect(out.errands.open).toBeNull();
    expect(errandDue(out, Date.now())).toBe(false);
  });

  it("credits an upgraded save with no errands it never ran", () => {
    const w = freshWorld();
    const raw = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    raw.schemaVersion = 14;
    delete raw.errands;
    expect(migrateSave(raw)!.errands.done).toEqual([]);
  });

  it("opens a new town and an upgraded one with the same quiet board", () => {
    const now = Date.now();
    const fresh = newErrands(now);
    expect(fresh.open).toBeNull();
    expect(fresh.done).toEqual([]);
    // Part-wound, not stamped at `now`: the first card is due shortly rather
    // than in four hours. Both callers go through this one helper, which is
    // what stops a new town and an upgraded one drifting apart.
    expect(fresh.lastClosedAt).toBeLessThan(now);
    const world = { ...freshWorld(), errands: fresh };
    expect(errandDue(world, now)).toBe(false);
    expect(errandDue(world, now + 20 * 60_000)).toBe(true);
  });
});

// --- What must not exist ---------------------------------------------------------------

describe("the shape of the board, negatively", () => {
  it("exports no total and no denominator", () => {
    // Same discipline as sim/museum.ts: `done` is a memory of which rows have
    // been used, not a tally, and nothing may hand its length out as a score.
    const w = freshWorld();
    w.errands.done.push(...ERRANDS.map((e) => e.id));
    const state = errandState(w);
    expect(state).toBeNull(); // nothing open
    for (const line of notices(w)) expect(line).not.toContain(String(ERRANDS.length));
  });

  it("puts no deadline on an open request", () => {
    // There is no field for one, and `postedAt` must never become one. A card
    // that expires is a timer, and real time gates the living world, never the
    // player's hands.
    const now = Date.now();
    const { w } = withOpenErrand(now);
    const open = w.errands.open!;
    expect(Object.keys(open).sort()).toEqual(["askerId", "id", "postedAt"]);
    // A fortnight later it is still simply there, and still answerable.
    const def = errandDef(open.id);
    add(w.inventory, def.ask.item, def.ask.count);
    expect(deliverErrand(w, now + 14 * 24 * HOUR)).toBe(def.thanks);
  });
});
