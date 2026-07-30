import { describe, it, expect } from "vitest";
import { LOOKS, lookFor } from "./looks";
import { renderPixels, creatureKey } from "./canon/sprites";
import type { AdultForm } from "./canon/forms";
import { FORMS, STANDARD_FORMS } from "./canon/forms";
import { NAMES } from "./names";
import { CAST, MOLE, GHOST, COSMOS } from "./cast";
import { ARRIVALS } from "./arrivals";

const ALL_FORMS = Object.keys(FORMS) as AdultForm[];

/** Every non-test source file, as text. `import.meta.glob` rather than node's
 *  `fs` on purpose: this is a Vite project with no `@types/node`, and adding a
 *  dependency to the whole repo for one assertion would be a poor trade. */
const SOURCES = import.meta.glob("../**/*.ts", { query: "?raw", import: "default", eager: true }) as
  Record<string, string>;

/** How many pixels a buffer actually paints — the sprite's silhouette, as a
 *  number. A tint must not change it; that is what makes a tint a tint. */
function opaque(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
  return n;
}

function pixels(form: AdultForm, lookIndex: number): Uint8ClampedArray {
  return renderPixels(creatureKey("adult", form), "neutral", "base", LOOKS[form][lookIndex]).data;
}

describe("looks — nobody is a clone", () => {
  it("gives every form a canon entry that changes nothing", () => {
    // The load-bearing entry in the whole file. Entry 0 is what the player gets
    // and what every institution gets, so if it ever grew a field, picking
    // "Dramatic Blob" on the character screen would hand you a blob that isn't
    // the one on the button.
    for (const form of ALL_FORMS) {
      expect(LOOKS[form].length).toBeGreaterThan(0);
      const canon = LOOKS[form][0];
      expect(canon.fill).toBeUndefined();
      expect(canon.shade).toBeUndefined();
      expect(canon.extra).toBeUndefined();
      expect(canon.overlay).toBeUndefined();
    }
  });

  it("renders canon byte-for-byte the way it did before looks existed", () => {
    for (const form of ALL_FORMS) {
      const key = creatureKey("adult", form);
      const before = renderPixels(key, "neutral", "base").data;
      expect(Array.from(pixels(form, 0))).toEqual(Array.from(before));
    }
  });

  it("actually changes the picture, for every single row", () => {
    // A look that renders identically to canon is a row somebody meant to write
    // and didn't — a mistyped palette letter recolours nothing at all, silently.
    for (const form of ALL_FORMS) {
      const canon = Array.from(pixels(form, 0));
      for (let i = 1; i < LOOKS[form].length; i++) {
        expect(Array.from(pixels(form, i)), `${form}/${LOOKS[form][i].id}`).not.toEqual(canon);
      }
    }
  });

  it("never moves a pixel — only recolours one", () => {
    // THE HARD RULE, as an assertion (CLAUDE.md §Sprite rendering). Looks name
    // colours, never cells, so the silhouette is identical for every variation
    // of a form. If this fails, some look is drawing art rather than tinting it,
    // and art can land off the grid where no unit test would see it.
    for (const form of ALL_FORMS) {
      const canon = opaque(pixels(form, 0));
      for (let i = 1; i < LOOKS[form].length; i++) {
        const look = LOOKS[form][i];
        // Glasses are the one deliberate exception: an overlay REPLACES the
        // canon overlay, so a rounder frame paints fewer pixels on purpose.
        if (look.overlay) continue;
        expect(opaque(pixels(form, i)), `${form}/${look.id}`).toBe(canon);
      }
    }
  });

  it("gives every standard form room for a crowd", () => {
    // The six anyone can move in as. Secrets are singular and stay at one.
    for (const form of STANDARD_FORMS) expect(LOOKS[form].length).toBeGreaterThanOrEqual(6);
  });

  it("uses ids that are unique within a form", () => {
    for (const form of ALL_FORMS) {
      const ids = LOOKS[form].map((l) => l.id);
      expect(new Set(ids).size, form).toBe(ids.length);
    }
  });
});

describe("lookFor — who gets which", () => {
  it("reserves canon for the player — NOBODY in the town wears it", () => {
    // The player's sprite is the art as drawn (the renderer passes no look at
    // all), so canon on any villager is the player meeting their own double.
    // Institutions included: a scholar walking out of character select used to
    // be pixel-identical to Winifred at the museum.
    for (const def of Object.values(CAST)) {
      if (LOOKS[def.form].length <= 1) continue;
      expect(lookFor(def.id, def.form).id, def.name).not.toBe("canon");
    }
    for (const def of [MOLE, GHOST, COSMOS]) {
      if (LOOKS[def.form].length <= 1) continue;
      expect(lookFor(def.id, def.form).id, def.name).not.toBe("canon");
    }
  });

  it("keeps the residents out of the institutions' faces", () => {
    // Reserving canon for the player put institutions into the same pool as
    // everyone else, and the first run of that produced Arabella and Archibald
    // in identical periwinkle. Residents are dealt from what's left.
    const taken = new Set(
      Object.values(CAST)
        .filter((d) => d.fixed && LOOKS[d.form].length > 2)
        .map((d) => `${d.form}/${lookFor(d.id, d.form).id}`),
    );
    for (const form of STANDARD_FORMS) {
      for (let n = 0; n < 200; n++) {
        expect(taken, `${form}/newcomer:${n}`).not.toContain(
          `${form}/${lookFor(`newcomer:${n}`, form).id}`,
        );
      }
    }
  });

  it("does NOT give the starter resident the curator's face", () => {
    // Caught on screen, not here: the starter town shipped two scholars four
    // tiles apart wearing identical pixels. It survives the rule change because
    // it was never really about canon — two people of one form standing in the
    // same place must not be the same picture, whoever they are.
    expect(lookFor("resident1", "scholar").id).not.toBe(
      lookFor(CAST.museum.id, CAST.museum.form).id,
    );
  });

  it("never hands a newcomer the institution's exact face", () => {
    // The reason `lookFor` skips index 0 rather than hashing across the whole
    // list: a one-in-six chance of the first Menace to move in being pixel-
    // identical to the shopkeeper is a coin flip that reproduces the bug.
    for (const form of STANDARD_FORMS) {
      for (let n = 0; n < 200; n++) {
        expect(lookFor(`newcomer:${n}`, form).id).not.toBe("canon");
      }
    }
  });

  it("is stable — the same person looks the same tomorrow", () => {
    for (const form of STANDARD_FORMS) {
      for (let n = 0; n < 20; n++) {
        const id = `newcomer:${n}` as const;
        expect(lookFor(id, form).id).toBe(lookFor(id, form).id);
      }
    }
  });

  it("spreads the first few arrivals out rather than stacking them", () => {
    // Not a distribution proof — just the thing a player would notice. The four
    // authored arrivals are all different forms, so this checks the shape that
    // matters when the queue grows: consecutive ids of ONE form vary.
    const seen = new Set<string>();
    for (let n = 0; n < 5; n++) seen.add(lookFor(`newcomer:${n}`, "blob").id);
    expect(seen.size).toBeGreaterThan(1);
  });

  it("falls back to canon for a form with only one look", () => {
    expect(lookFor("newcomer:3", "carrot").id).toBe("canon");
  });
});

describe("names — everyone is a person, nobody is a species", () => {
  it("never calls anybody by their form's title", () => {
    // The state this whole pass existed to leave: the villager at the desk was
    // named "Tired Office Creature", which made "forms are species, not
    // singletons" false in the most visible place in the game.
    const everyone = [...Object.values(CAST), MOLE, GHOST, COSMOS];
    for (const def of everyone) {
      expect(def.name, def.id).not.toBe(FORMS[def.form].name);
    }
    for (const a of ARRIVALS) expect(a.name, a.form).not.toBe(FORMS[a.form].name);
  });

  it("gives nobody in town somebody else's name", () => {
    const names = [...Object.values(CAST), MOLE, GHOST, COSMOS].map((d) => d.name);
    names.push(...ARRIVALS.map((a) => a.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it("draws every authored name from its form's register", () => {
    // The registers are the voice. A name written straight into a cast row
    // without landing in content/names.ts is a name nobody can follow up with a
    // second one in the same key.
    for (const def of [...Object.values(CAST), MOLE, GHOST, COSMOS]) {
      expect(NAMES[def.form], def.id).toContain(def.name);
    }
    for (const a of ARRIVALS) expect(NAMES[a.form], a.name).toContain(a.name);
  });

  it("keeps a register for every form anyone can move in as", () => {
    for (const form of STANDARD_FORMS) expect(NAMES[form].length).toBeGreaterThanOrEqual(6);
  });

  it("is never written out as a literal anywhere else in the source", () => {
    // EARNED THE HARD WAY, twice in one afternoon. The naming pass swept the
    // panels by grepping for the old strings — and missed `panel("Corrigal",
    // "The Museum")` because "Corrigal" wasn't one of the species names being
    // grepped for. It shipped a museum labelled with the curator's previous
    // name and was caught by a screenshot, not by 908 green tests.
    //
    // A hardcoded name is invisible until somebody happens to look at that one
    // panel, so this walks the source instead of trusting the next sweep. Read
    // it off the table: `panel(CAST.museum.name, …)` costs nothing and cannot
    // drift. Comments are fine — the check is for a QUOTED literal.
    //
    // It scans the whole REGISTER, not just the names currently assigned, and
    // that is the difference between a guard and a comforting noise. The first
    // version checked assigned names only — and so would have sailed past the
    // very bug that prompted it, because by the time the literal was stale
    // "Corrigal" was nobody's name any more. Retired names are exactly the ones
    // left lying around in the source.
    // The three tables that are allowed to say the names out loud.
    const ALLOWED = ["content/cast.ts", "content/names.ts", "content/arrivals.ts"];
    const files = Object.keys(SOURCES).filter(
      (f) => !f.endsWith(".test.ts") && !ALLOWED.some((a) => f.endsWith(a) || f.endsWith(a.slice(8))),
    );
    expect(files.length).toBeGreaterThan(20); // a glob that matched nothing would pass silently

    const names = Object.values(NAMES).flat();
    const offences: string[] = [];
    for (const f of files) {
      const src = SOURCES[f];
      for (const name of names) {
        // Same delimiter both ends, or `"Prudence's House"` reads as a literal
        // "Prudence" and the guard starts flagging ordinary prose.
        if (new RegExp(`(["'\`])${name}\\1`).test(src)) offences.push(`${f}: "${name}"`);
      }
    }
    expect(offences).toEqual([]);
  });

  it("leaves the canon species names alone", () => {
    // The other half of the split, and the half that's easy to break: these are
    // vendored from The Meadow and are what a character IS. If a naming pass
    // ever edits this table, the museum blurbs start describing individuals.
    expect(FORMS.office.name).toBe("Tired Office Creature");
    expect(FORMS.menace.name).toBe("Fancy Little Menace");
    expect(FORMS.mole.name).toBe("Maverick Mole");
  });
});
