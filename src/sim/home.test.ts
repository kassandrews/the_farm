import { describe, it, expect } from "vitest";
import { newWorld, buildAt, talk } from "./game";
import { setTile } from "./world";
import { GRASS } from "../content/tiles";
import { add } from "./inventory";
import { assign } from "./assign";
import { describeHome, SNUG, GRAND } from "./home";
import { TASTES } from "../content/tastes";
import { RESIDENT_HOME } from "../content/dialogue";
import { NOTE_PRIORITY } from "./home";
import type { HomeNoteKind } from "./home";
import type { AdultForm } from "../content/canon/forms";
import { speak } from "./dialogue";
import { makeRng } from "./rng";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "hilltop", seed: 42 });
}

/** A sealed room with a door and a bed, far from the authored town. `span` is
 *  the OUTER size, so interior is (span-2)^2 — 5 gives 9, which is neither snug
 *  nor grand and so leaves the size notes out of the way. */
function house(
  w: ReturnType<typeof world>,
  ox: number,
  oy: number,
  opts: { span?: number; door?: boolean } = {},
) {
  const { span = 5, door = true } = opts;
  const last = span - 1;
  add(w.inventory, "wood", 2000);
  for (let y = oy; y <= oy + last; y++) for (let x = ox; x <= ox + last; x++) setTile(w, x, y, GRASS);

  for (let y = oy; y <= oy + last; y++) {
    for (let x = ox; x <= ox + last; x++) {
      if (x !== ox && x !== ox + last && y !== oy && y !== oy + last) continue;
      const isDoorCell = x === ox + 2 && y === oy + last;
      if (isDoorCell && !door) continue;
      buildAt(w, isDoorCell && door ? "door" : "wall", x, y, Date.now());
    }
  }
  buildAt(w, "bed", ox + 1, oy + 1, Date.now(), "s");
  return { x: ox + 1, y: oy + 1 };
}

function resident(w: ReturnType<typeof world>) {
  return w.villagers.find((v) => v.id === "resident1")!;
}

function kinds(w: ReturnType<typeof world>) {
  return describeHome(w, resident(w)).map((n) => n.kind);
}

describe("reading a home as something to talk about", () => {
  it("says nothing at all for someone who never claimed a bed", () => {
    const w = world();
    const office = w.villagers.find((v) => v.id === "office")!;
    expect(office.homeBed).toBeNull();
    // An institution with no bed is not a person with a grievance. A null claim
    // is silence; only a claim that OUTLIVED its bed is a complaint.
    expect(describeHome(w, office)).toEqual([]);
  });

  it("notices when their bed has been taken away", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    expect(kinds(w)).not.toContain("homeless");

    buildAt(w, "erase", bed.x, bed.y, Date.now());
    // The claim is stale, not cleared — that's exactly what makes it speakable.
    expect(resident(w).homeBed).not.toBeNull();
    expect(kinds(w)).toEqual(["homeless"]);
  });

  it("notices the walls coming down around the bed", () => {
    const w = world();
    const bed = house(w, 40, 50);
    assign(w, "resident1", bed.x, bed.y);

    // A mid-wall cell, not a corner: the fill is four-way, so a missing corner
    // is still a sealed room (sim/rooms.ts) and wouldn't leak.
    buildAt(w, "erase", 41, 50, Date.now());
    expect(kinds(w)).toEqual(["roofless"]);
  });

  it("notices being walled in with no way out", () => {
    const w = world();
    const bed = house(w, 40, 60);
    assign(w, "resident1", bed.x, bed.y);

    buildAt(w, "wall", 42, 64, Date.now()); // paint over the doorway
    expect(kinds(w)).toEqual(["sealed"]);
  });

  it("trouble outranks decor", () => {
    const w = world();
    const bed = house(w, 40, 70);
    assign(w, "resident1", bed.x, bed.y);
    buildAt(w, "table", 42, 41 + 30, Date.now());

    buildAt(w, "erase", bed.x, bed.y, Date.now());
    // Not "there's a nice table, also my bed is gone".
    expect(kinds(w)[0]).toBe("homeless");
  });

  it("calls a room with only a bed in it bare, and stops once it isn't", () => {
    const w = world();
    const bed = house(w, 80, 40);
    assign(w, "resident1", bed.x, bed.y);
    expect(kinds(w)).toContain("bare");
    expect(kinds(w)).not.toContain("furnished");

    buildAt(w, "table", 82, 42, Date.now());
    expect(kinds(w)).not.toContain("bare");
    const furnished = describeHome(w, resident(w)).find((n) => n.kind === "furnished")!;
    expect(furnished.value).toBe("table");
  });

  it("reads size off the actual room, and stays quiet in between", () => {
    const w = world();
    const mid = house(w, 80, 60); // interior 9
    assign(w, "resident1", mid.x, mid.y);
    expect(kinds(w)).not.toContain("snug");
    expect(kinds(w)).not.toContain("grand");

    const big = house(w, 100, 40, { span: 7 }); // interior 25
    assign(w, "resident1", big.x, big.y);
    const grand = describeHome(w, resident(w)).find((n) => n.kind === "grand")!;
    expect(Number(grand.value)).toBe(25);
    expect(Number(grand.value)).toBeGreaterThanOrEqual(GRAND);

    const small = house(w, 130, 40, { span: 4 }); // interior 4
    assign(w, "resident1", small.x, small.y);
    const snug = describeHome(w, resident(w)).find((n) => n.kind === "snug")!;
    expect(Number(snug.value)).toBeLessThanOrEqual(SNUG);
  });

  it("names what the walls are made of", () => {
    const w = world();
    const bed = house(w, 80, 80);
    assign(w, "resident1", bed.x, bed.y);
    const finish = describeHome(w, resident(w)).find((n) => n.kind === "finish")!;
    expect(finish.value).toBe("pale pine"); // the starter wood finish, lowercased
  });
});

describe("saying it out loud", () => {
  it("a villager whose bed is gone brings it up, readily", () => {
    const w = newWorld({
      name: "Me",
      form: "dog",
      spot: "hilltop",
      seed: 3,
      meadowImport: { name: "Grimble", form: "scholar", memorySeed: [] },
    });
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    buildAt(w, "erase", bed.x, bed.y, Date.now());

    const v = resident(w);
    const rng = makeRng(7);
    let mentioned = 0;
    for (let i = 0; i < 100; i++) {
      const text = speak(w, v, rng, Date.now()).text.toLowerCase();
      if (text.includes("bed") || text.includes("plaza")) mentioned++;
    }
    // URGENT_HOME_CHANCE is 0.85; anything near-never would mean the player
    // never learns they broke something.
    expect(mentioned).toBeGreaterThan(60);
  });

  it("a housed villager talks about other things too", () => {
    const w = newWorld({
      name: "Me",
      form: "dog",
      spot: "hilltop",
      seed: 3,
      meadowImport: { name: "Grimble", form: "scholar", memorySeed: [] },
    });
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);

    const v = resident(w);
    const rng = makeRng(11);
    const said = new Set<string>();
    for (let i = 0; i < 200; i++) said.add(speak(w, v, rng, Date.now()).text);
    // The house is always there; leading with it every time would make them a
    // property listing rather than a person.
    expect(said.size).toBeGreaterThan(4);
  });

  it("talking still works for a villager with no home lines for their form", () => {
    const w = world();
    expect(talk(w, "office", makeRng(2), Date.now())).not.toBeNull();
  });
});

describe("taste", () => {
  it("says nothing extra about a house that isn't to their taste", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    // Margfrom is a scholar and scholars like a shelf. There isn't one, and
    // that costs her nothing: no note, no grumble, no missing-points readout.
    // The vocabulary has no word for disappointment, which is the design.
    expect(kinds(w)).not.toContain("delight_piece");
    expect(kinds(w)).toContain("bare");
  });

  it("notices the piece their form likes", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    expect(TASTES.scholar!.piece).toBe("shelf");
    buildAt(w, "shelf", 42, 41, Date.now(), "s");
    expect(kinds(w)).toContain("delight_piece");
  });

  it("is not fooled by furniture that isn't the one they like", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    buildAt(w, "chair", 42, 41, Date.now(), "s");
    expect(kinds(w)).not.toContain("delight_piece");
    expect(kinds(w)).toContain("furnished"); // still worth remarking on
  });

  it("puts delight ahead of the plain observations", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    buildAt(w, "shelf", 42, 41, Date.now(), "s");
    const notes = describeHome(w, resident(w));
    // Built them the thing they like and they lead with it. Anything else
    // reads as the game not having noticed what you did.
    expect(notes[0].kind).toBe("delight_piece");
  });

  it("names what pleased them, so the line can say it", () => {
    const w = world();
    const bed = house(w, 40, 40);
    assign(w, "resident1", bed.x, bed.y);
    buildAt(w, "shelf", 42, 41, Date.now(), "s");
    const note = describeHome(w, resident(w)).find((n) => n.kind === "delight_piece")!;
    expect(note.value).toBe("shelf");
  });

  it("has no taste at all for the deskbound", () => {
    // An institution delighted by soft furnishings would be the game mistaking
    // him for a person.
    expect(TASTES.office).toBeUndefined();
  });
});

describe("every form says something about every note it can reach", () => {
  // The five thin banks were a known gap for four phases: `RESIDENT_HOME` covered
  // every form, but most got one or two notes and fell through the rest. This
  // pins the coverage so it can't quietly rot — and pins it in BOTH directions,
  // which is the part that earns its keep.
  //
  // The forms that live in houses: the four in content/arrivals.ts plus the two
  // authored residents. The secrets and institutions are excluded because none of
  // them lives somewhere you built — a Ghost with an opinion about her walls
  // would be a Ghost who moved in.
  const HOUSED: AdultForm[] = ["dog", "blob", "gremlin", "scholar", "office", "menace"];

  /** Which notes this form can actually be handed. The delight notes only exist
   *  when content/tastes.ts gives the form something to be pleased by, so they
   *  are reachable per-form rather than universally. */
  function reachable(form: AdultForm): HomeNoteKind[] {
    const taste = TASTES[form];
    return NOTE_PRIORITY.filter((kind) => {
      if (kind === "delight_finish") return Boolean(taste?.finish);
      if (kind === "delight_piece") return Boolean(taste?.piece);
      return true;
    });
  }

  it("has a line for it", () => {
    for (const form of HOUSED) {
      const bank = RESIDENT_HOME[form];
      expect(bank, `${form} has no home bank at all`).toBeDefined();
      for (const kind of reachable(form)) {
        const lines = bank![kind];
        expect(lines?.length, `${form} has nothing to say about "${kind}"`).toBeGreaterThan(0);
      }
    }
  });

  it("and has no line it can never say", () => {
    // The other direction, and the reason this test is worth having rather than a
    // comment: it fails when a TASTE row is added without the line that row just
    // made reachable, and it fails when a line is written for a delight that form
    // cannot feel. Dead content is how a bank stops being trustworthy.
    for (const form of HOUSED) {
      const can = new Set<string>(reachable(form));
      for (const kind of Object.keys(RESIDENT_HOME[form] ?? {})) {
        expect(can.has(kind), `${form} has lines for "${kind}", which it can never be handed`).toBe(true);
      }
    }
  });

  it("renders every template without leaving a hole in the sentence", () => {
    // Templates take the note's value and most ignore it. One that interpolated a
    // value it never receives would print "There's a ." — caught by reading the
    // modal last time (ROADMAP 3c), which is not a thing tests can do, so this
    // asserts the weaker property that every line is a non-empty sentence.
    for (const form of HOUSED) {
      for (const [kind, templates] of Object.entries(RESIDENT_HOME[form] ?? {})) {
        for (const t of templates ?? []) {
          const text = t("shelf");
          expect(text.length, `${form}/${kind} produced an empty line`).toBeGreaterThan(0);
          // A lone " ." or " ,", which is what an unfilled `${v}` leaves behind.
          // The house ellipsis (". ... Capital") is a space before a period too,
          // so the period must not be followed by another one or every correctly
          // styled line in the file fails.
          expect(text, `${form}/${kind} has an empty interpolation`).not.toMatch(/\s(\.(?!\.)|,)/);
        }
      }
    }
  });
});
