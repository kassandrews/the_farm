import { describe, it, expect } from "vitest";
import { newWorld, buildAt, talk, contextAction, actionTarget } from "./game";
import { setTile } from "./world";
import { roofRoomAt } from "./rooms";
import { GRASS } from "../content/tiles";
import { add } from "./inventory";
import { assign } from "./assign";
import { describeHistory, historyLine, roomRemembers, HISTORY_PRIORITY } from "./history";
import type { HistoryNoteKind } from "./history";
import { HISTORY_LINES } from "../content/history";
import { RESIDENT_HISTORY } from "../content/dialogue";
import type { AdultForm } from "../content/canon/forms";
import { makeRng } from "./rng";

// A pinned clock, and a second one a season away. Season phrasing is the one
// thing in here that depends on the date, so both have to be stated rather than
// read off the wall (ROADMAP §"Two clocks for one fact").
const SUMMER = Date.UTC(2026, 6, 1, 12);
const SPRING = Date.UTC(2026, 3, 1, 12);

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
}

/** A sealed room with a door and a bed, far from the authored town. Same helper
 *  home.test.ts uses, and deliberately built from a long way off — see the
 *  regression test about painting at a distance. */
function house(w: ReturnType<typeof world>, ox: number, oy: number, at: number) {
  const span = 5;
  const last = span - 1;
  add(w.inventory, "wood", 2000);
  for (let y = oy; y <= oy + last; y++) for (let x = ox; x <= ox + last; x++) setTile(w, x, y, GRASS);
  for (let y = oy; y <= oy + last; y++) {
    for (let x = ox; x <= ox + last; x++) {
      if (x !== ox && x !== ox + last && y !== oy && y !== oy + last) continue;
      const isDoor = x === ox + 2 && y === oy + last;
      buildAt(w, isDoor ? "door" : "wall", x, y, at);
    }
  }
  buildAt(w, "bed", ox + 1, oy + 1, at, "s");
  return { bed: { x: ox + 1, y: oy + 1 }, door: { x: ox + 2, y: oy + last }, inside: { x: ox + 2, y: oy + 2 } };
}

describe("a room reading its own past", () => {
  it("says nothing at all outside a room", () => {
    const w = world();
    expect(describeHistory(w, 500, 500, SUMMER)).toEqual([]);
    expect(roomRemembers(w, 500, 500)).toBe(false);
  });

  it("remembers the boards laid inside it, even though they were laid from outside", () => {
    // THE REGRESSION THIS FILE EXISTS FOR. Build mode paints at a distance — tap
    // places, drag paints a run — so the player is routinely nowhere near the
    // tile that changed. `witness` is anchored to the PLAYER, because friendship
    // is about company; the place entry has to be anchored to the TILE, or
    // flooring a house while standing in the garden files "you laid these
    // boards" in the garden and the room never says the line it exists to say.
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    // The player has not moved; they are back at the homestead.
    expect(Math.hypot(w.player.x - 200, w.player.y - 200)).toBeGreaterThan(20);

    buildAt(w, "floor", h.inside.x, h.inside.y, SUMMER);
    expect(describeHistory(w, h.inside.x, h.inside.y, SUMMER).map((n) => n.kind)).toContain(
      "built_floor",
    );
  });

  it("knows who sleeps there, and who used to", () => {
    const w = world();
    const a = house(w, 200, 200, SUMMER);
    const b = house(w, 300, 300, SUMMER);

    assign(w, "resident1", a.bed.x, a.bed.y, SPRING);
    expect(describeHistory(w, a.inside.x, a.inside.y, SUMMER).map((n) => n.kind)).toContain("sleeper");

    // Rehoused. The first room keeps the spell, in the past tense — the claim is
    // the live answer, the log is the historical one.
    assign(w, "resident1", b.bed.x, b.bed.y, SUMMER);
    expect(describeHistory(w, a.inside.x, a.inside.y, SUMMER).map((n) => n.kind)).toContain(
      "past_sleeper",
    );
    expect(describeHistory(w, b.inside.x, b.inside.y, SUMMER).map((n) => n.kind)).toContain("sleeper");
  });

  it("names the season only when it was a different one", () => {
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    assign(w, "resident1", h.bed.x, h.bed.y, SPRING);

    const inSummer = describeHistory(w, h.inside.x, h.inside.y, SUMMER).find((n) => n.kind === "sleeper")!;
    expect(inSummer.when).toBe("spring");
    // Asked in the season it happened in, the clause drops: "has slept here
    // since spring" said in spring would be the room being grandiose about
    // something that happened on Tuesday.
    const inSpring = describeHistory(w, h.inside.x, h.inside.y, SPRING).find((n) => n.kind === "sleeper")!;
    expect(inSpring.when).toBe("");
  });

  it("survives the walls moving", () => {
    // The load-bearing property of anchoring to coordinates instead of to a
    // building. `Room.id` is the smallest interior key, so extending a house
    // northward changes it — a history filed under the walls would be deleted
    // by the player improving the house.
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    buildAt(w, "floor", h.inside.x, h.inside.y, SUMMER);
    const before = historyLine(w, h.inside.x, h.inside.y, SUMMER);

    const wasId = roofRoomAt(w, h.inside.x, h.inside.y)!.id;

    // Push the north wall out by one row: erase it, re-wall a row further up.
    for (let x = 200; x <= 204; x++) setTile(w, x, 199, GRASS);
    for (let x = 200; x <= 204; x++) buildAt(w, "erase", x, 200, SUMMER);
    for (let x = 200; x <= 204; x++) buildAt(w, "wall", x, 199, SUMMER);
    buildAt(w, "wall", 200, 200, SUMMER);
    buildAt(w, "wall", 204, 200, SUMMER);

    // The room is a DIFFERENT room by its own reckoning — `Room.id` is the
    // smallest interior key and the interior just grew northward — and it has
    // lost nothing. That is the whole argument for coordinates over buildings.
    expect(roofRoomAt(w, h.inside.x, h.inside.y)!.id).not.toBe(wasId);
    expect(historyLine(w, h.inside.x, h.inside.y, SUMMER)).toBe(before);
  });

  it("offers at most two things at the door, and never a list", () => {
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    buildAt(w, "floor", h.inside.x, h.inside.y, SUMMER);
    assign(w, "resident1", h.bed.x, h.bed.y, SPRING);
    // A third note, so there is genuinely something for the cut to leave out.
    const v = w.villagers.find((x) => x.id === "resident1")!;
    v.x = h.inside.x;
    v.y = h.inside.y;
    talk(w, "resident1", makeRng(3), SUMMER);

    const notes = describeHistory(w, h.inside.x, h.inside.y, SUMMER);
    expect(notes.length).toBeGreaterThan(2);
    const line = historyLine(w, h.inside.x, h.inside.y, SUMMER)!;
    // The top two, in priority order, and nothing from the third. Asserted as
    // properties rather than by rebuilding the string — a test that
    // re-implements the rule agrees with the bug as readily as with the fix.
    // Each of the top two appears, in one of its two phrasings — the season
    // clause is dropped once the sentence before it has already named that
    // season, so which form a note takes depends on the one ahead of it.
    const either = (n: (typeof notes)[number]) =>
      [HISTORY_LINES[n.kind](n.who, n.when), HISTORY_LINES[n.kind](n.who, "")];
    for (const n of notes.slice(0, 2)) {
      expect(either(n).some((t) => line.includes(t)), `missing "${n.kind}"`).toBe(true);
    }
    const left = notes[2];
    expect(either(left).some((t) => line.includes(t)), `included "${left.kind}"`).toBe(false);
    // And nothing that counts what was left out.
    expect(line).not.toMatch(/\d/);
  });

  it("names the season once, however many sentences share it", () => {
    // Found by reading the real flash: two notes from one season came out as
    // "...back in spring ... in spring." Both true, and the pair read like a
    // form letter.
    const w = world();
    const h = house(w, 200, 200, SPRING);
    buildAt(w, "floor", h.inside.x, h.inside.y, SPRING);
    assign(w, "resident1", h.bed.x, h.bed.y, SPRING);
    const line = historyLine(w, h.inside.x, h.inside.y, SUMMER)!;
    expect(line.match(/spring/g)).toHaveLength(1);
  });

  it("drops a memory of somebody the town no longer has", () => {
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    assign(w, "resident1", h.bed.x, h.bed.y, SPRING);
    expect(roomRemembers(w, h.inside.x, h.inside.y)).toBe(true);

    // A name that resolves to nobody is a sentence with a hole in it, so the
    // sleeper note goes. The room's own past — the walls you put up — is not
    // about anybody and stays exactly where it was.
    w.villagers = w.villagers.filter((v) => v.id !== "resident1");
    const kinds = describeHistory(w, h.inside.x, h.inside.y, SUMMER).map((n) => n.kind);
    expect(kinds).not.toContain("sleeper");
    expect(kinds).not.toContain("past_sleeper");
    expect(kinds).toContain("built_floor");
  });
});

describe("asking a house at its door", () => {
  it("is offered at the door of a room that remembers something, and not otherwise", () => {
    const w = world();
    const h = house(w, 200, 200, SUMMER);

    // Standing on the doorstep, outside.
    w.player.x = h.door.x;
    w.player.y = h.door.y + 1;
    // Nothing has happened inside yet — the ladder declines and the shovel keeps
    // its tap. That decline is what lets this branch sit below the tool at all.
    expect(actionTarget(w, "dig").kind).not.toBe("remember");

    buildAt(w, "floor", h.inside.x, h.inside.y, SUMMER);
    const target = actionTarget(w, "gather");
    expect(target.kind).toBe("remember");
    expect(target).toMatchObject({ x: h.door.x, y: h.door.y });

    const res = contextAction(w, "gather", SUMMER);
    expect(res.kind).toBe("remember");
    expect(res.changed).toBe(false); // a read moves nothing, and records nothing
    expect(res.message).toContain("boards");
  });

  it("records nothing about having been asked", () => {
    // No "you have heard this" flag anywhere: a flag is what a checklist is made
    // of. Asking twice gives the same answer and leaves the world alone.
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    buildAt(w, "floor", h.inside.x, h.inside.y, SUMMER);
    w.player.x = h.door.x;
    w.player.y = h.door.y + 1;

    const before = JSON.stringify(w.places);
    const first = contextAction(w, "gather", SUMMER);
    const second = contextAction(w, "gather", SUMMER);
    expect(second.message).toBe(first.message);
    expect(JSON.stringify(w.places)).toBe(before);
  });
});

describe("the room's own lines", () => {
  it("has one for every note kind, and none for a kind that does not exist", () => {
    // Both directions, like home.test.ts. Content is keyed by plain `string`
    // because it may not import from sim, so this is where the correspondence
    // is actually enforced.
    for (const kind of HISTORY_PRIORITY) {
      expect(HISTORY_LINES[kind], `no room line for "${kind}"`).toBeDefined();
    }
    const known = new Set<string>(HISTORY_PRIORITY);
    for (const kind of Object.keys(HISTORY_LINES)) {
      expect(known.has(kind), `a room line for "${kind}", which is not a note kind`).toBe(true);
    }
  });

  it("reads as a sentence with and without the season clause", () => {
    for (const [kind, tmpl] of Object.entries(HISTORY_LINES)) {
      for (const when of ["spring", ""]) {
        const text = tmpl("Margfrom", when);
        expect(text.length, `${kind} produced an empty line`).toBeGreaterThan(0);
        // A lone " ." or " ,", which is what an unfilled interpolation leaves.
        expect(text, `${kind} has an empty interpolation`).not.toMatch(/\s(\.(?!\.)|,)/);
        if (!when) expect(text, `${kind} kept an empty season clause`).not.toMatch(/\bin \.|since \./);
      }
    }
  });

  it("never sets the player a task", () => {
    // A room reads its own past and never names a future (DESIGN §"A place keeps
    // a history"; §Errands notices: past tense, no task).
    for (const tmpl of Object.values(HISTORY_LINES)) {
      const text = tmpl("Margfrom", "spring");
      expect(text).not.toMatch(/\b(should|must|need to|try|go and|remember to)\b/i);
    }
  });
});

describe("a resident remarking on the room you're both in", () => {
  const HOUSED: AdultForm[] = ["dog", "blob", "gremlin", "scholar", "office", "menace"];

  it("gives every housed form both lines, and no line it can never be handed", () => {
    // Only `met` and `built_floor` are the social channel's; the other six kinds
    // belong to the flat record alone (see RESIDENT_HISTORY's header). This
    // pins that decision in both directions so a seventh cannot be half-added.
    const SPOKEN = new Set<HistoryNoteKind>(["met", "built_floor"]);
    for (const form of HOUSED) {
      const bank = RESIDENT_HISTORY[form];
      expect(bank, `${form} has no history bank at all`).toBeDefined();
      for (const kind of SPOKEN) {
        expect(bank![kind]?.length, `${form} has nothing to say about "${kind}"`).toBeGreaterThan(0);
      }
      for (const kind of Object.keys(bank ?? {})) {
        expect(
          SPOKEN.has(kind as HistoryNoteKind),
          `${form} has lines for "${kind}", which is not a spoken kind`,
        ).toBe(true);
      }
    }
  });

  it("renders every template without leaving a hole in the sentence", () => {
    for (const form of HOUSED) {
      for (const [kind, templates] of Object.entries(RESIDENT_HISTORY[form] ?? {})) {
        for (const t of templates ?? []) {
          const text = t("Margfrom");
          expect(text.length, `${form}/${kind} produced an empty line`).toBeGreaterThan(0);
          expect(text, `${form}/${kind} has an empty interpolation`).not.toMatch(/\s(\.(?!\.)|,)/);
        }
      }
    }
  });

  it("never narrates its own tenancy at you", () => {
    // A villager saying "you and I first spoke here" is the game doing its
    // remembering out loud, which is the tone this phase is fenced against.
    const w = world();
    const h = house(w, 200, 200, SUMMER);
    const v = w.villagers.find((x) => x.id === "resident1")!;
    // They met you in this room, and they are standing in it.
    w.player.x = h.inside.x;
    w.player.y = h.inside.y;
    v.x = h.inside.x;
    v.y = h.inside.y;
    talk(w, "resident1", makeRng(1), SUMMER);
    expect(w.places.some((p) => p.kind === "met" && p.who === "resident1")).toBe(true);

    // Whatever they say over many rolls, it is never their own first meeting.
    const rng = makeRng(7);
    for (let i = 0; i < 60; i++) {
      const said = talk(w, "resident1", rng, SUMMER)!.text;
      expect(said).not.toContain(v.name);
    }
  });
});
