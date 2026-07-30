// Looks — the free appearance axis for PEOPLE, the way content/skins.ts is the
// free appearance axis for buildings. Different word on purpose: a skin is a
// finish you choose and apply to a wall, a look is something a person already
// is, and the two must never end up in the same picker.
//
// THE PROBLEM. Sprites are baked per FORM (canon/sprites.ts renders one 16×16
// image for "menace"), so before this file the shopkeeper and every Menace who
// ever moved in were the same pixels. In a town whose whole Phase 3 premise is
// that it keeps growing, that reads as a cast of clones — and it quietly
// contradicts the rule the rest of the codebase is built on, that a form is a
// species and the people in it are individuals.
//
// ONE IDEA PER LOOK. A look is one thing you can say out loud — "the pale one",
// "the one with the silver crown", "the golden retriever". Usually that means
// changing EITHER the body colour OR one accessory; the exception is a letter
// that draws part of the ANIMAL rather than something it is wearing (the dog's
// ears and tail), which has to move with the coat or the coat is half-painted.
// The ceiling is on ideas, not on fields, and it is deliberate rather than a
// stage we are half-way through: the cross product of six tints and three crowns
// is eighteen Menaces nobody can tell apart, which is the same failure as one
// Menace with extra steps. When the cast gets big enough that the list runs out,
// add rows; the shape holds.
//
// WHERE THE ACCESSORIES COME FROM. Nothing here invents art. Every accessory
// swap recolours a letter the canon sprite already draws with — the Menace's
// crown is `y`, the Gremlin's horns are `G`, the Office Creature's tie is `T`,
// the Dog's ears are `D` and his chest patch is `W` — or replaces an overlay
// grid the body already carries (the Scholar's glasses). That keeps the whole
// system inside the pixel budget the art was drawn to, and keeps it impossible
// for a look to knock the sprite off the pixel grid, which is the one class of
// bug unit tests can't see (CLAUDE.md §Sprite rendering).

import type { AdultForm } from "./canon/forms";
import type { Palette } from "./canon/sprites";
import type { CharId } from "./cast";
import { CAST, isNewcomer, isSecret } from "./cast";

/** One variation on a form's canon art.
 *
 *  Every field is optional and every absent field means "as drawn". Entry 0 of
 *  each list is `{}` — literally no change — so the art as it shipped is still
 *  what the player sees when they pick their form, and a look can never be a
 *  regression against a sprite nobody asked to change. */
export interface LookDef {
  /** Stable, and part of the sprite cache key (render/sprites.ts). Renaming one
   *  is free; reusing one for different art is what would not be. */
  id: string;
  /** Body colour. Authored as a PAIR, never derived by rotating a hue: `fill`
   *  and `shade` are a lit surface and its underside, and a hue rotation keeps
   *  the numbers and loses the relationship. */
  fill?: string;
  shade?: string;
  /** Recolours letters the body already draws with — merged over the body's own
   *  `extra`, so naming one letter leaves the others alone. */
  extra?: Palette;
  /** Replaces the body's overlay outright (the Scholar's glasses). Whole-grid
   *  rather than patched, because a shape change wants to be readable as a
   *  shape in the source. */
  overlay?: { rows: string[]; palette: Palette };
}

/** No change at all — every form's entry 0, and what the player always gets. */
const CANON: LookDef = { id: "canon" };

// --- Glasses ------------------------------------------------------------------
// The Scholar's canon overlay is three solid 3×3 blocks: thick square frames.
// These are the same two lenses drawn differently, at the same rows, so the
// silhouette and the eye positions underneath are untouched.

const LENS = "#dbe7ff";

const GLASSES_ROUND = [
  "................",
  "................",
  "................",
  ".....w...w......",
  "....w.w.w.w.....",
  ".....w...w......",
];

const GLASSES_HALFMOON = [
  "................",
  "................",
  "................",
  "................",
  "....www.www.....",
  ".....w...w......",
];

/** Every form's variations, canon first.
 *
 *  Sizes differ on purpose. The six standard forms are POPULATIONS — anyone can
 *  move in as one — so they carry enough rows that the town can grow for a while
 *  before repeating. The secrets and the Mole carry one row each, because there
 *  is exactly one of each of them and a list of alternate Stray Cosmoses would
 *  be a way of saying she is a type of thing. */
export const LOOKS: Record<AdultForm, LookDef[]> = {
  // Canon is grey with dark ears and a white chest patch.
  //
  // COAT, NOT TINT. A dog is the one form where the letters aren't accessories:
  // `D` is ears and tail, `W` is the chest patch. They are parts of the animal,
  // so a colour that stops at the body leaves a golden dog wearing the grey
  // dog's ears — which is not a second look, it is the first one done badly.
  // These rows move the coat as a unit and read as breeds, which is the ceiling
  // the one-axis rule was protecting: differences you can say out loud.
  dog: [
    CANON,
    // Ears a shade deeper than the coat so they still read as ears, and NO
    // chest patch: `W` is painted the coat colour, which removes art without
    // moving a pixel — the only kind of removal that cannot misalign anything.
    // It is `fill` exactly, not a mid-tone: the patch overlaps the body's shade
    // row, and anything short of the coat colour leaves a faint block sitting on
    // the chest, which is the patch again with the volume turned down.
    { id: "golden", fill: "#e5be74", shade: "#bd9550", extra: { D: "#c79c55", W: "#e5be74" } },
    // Kept off pure white: the outline is doing all the silhouette work here,
    // and #fff against the paper backdrop loses the shade rows entirely.
    { id: "snow", fill: "#ecebf1", shade: "#c3c0cf", extra: { D: "#dcd8e6", W: "#ecebf1" } },
    // Setter red. Solid, so the chest goes to coat like the two above; the ears
    // carry the only variation, a half-step darker.
    { id: "red-setter", fill: "#b25a33", shade: "#8c4326", extra: { D: "#8f4526", W: "#b25a33" } },
    // The collie is the one dog that KEEPS the canon chest patch — a white bib
    // on a light brown coat is the whole breed, so `W` is left alone and the
    // ears go dark instead. It is also why the patch was worth removing rather
    // than deleting: the same two letters make a collie and a golden.
    { id: "collie", fill: "#c39a68", shade: "#9d7a50", extra: { D: "#7f5a3c" } },
    // Plain chocolate: one colour, nothing else going on. Stays lighter than the
    // outline (#402e3a) — a dog darker than its own outline goes flat.
    { id: "chocolate", fill: "#7a5137", shade: "#5e3d29", extra: { D: "#674430", W: "#7a5137" } },
  ],

  // A blob is a colour. There is no accessory to swap and inventing one would
  // be a hat on a puddle, so this form gets the longest tint list instead.
  blob: [
    CANON,
    { id: "coral", fill: "#e08a7d", shade: "#b8675c" },
    { id: "lilac", fill: "#b39ad8", shade: "#8d76b0" },
    { id: "mint", fill: "#86ceac", shade: "#5da585" },
    { id: "butter", fill: "#e4c96f", shade: "#bda44f" },
    { id: "ash-rose", fill: "#d3a2a8", shade: "#a97e83" },
  ],

  gremlin: [
    CANON,
    { id: "teal", fill: "#6cc0bd", shade: "#449895" },
    { id: "ochre", fill: "#c9a94f", shade: "#9c8034" },
    { id: "plum", fill: "#a87fc0", shade: "#815a99" },
    { id: "ember-horns", extra: { G: "#c07a3a" } },
    { id: "bruise-horns", extra: { G: "#7a5aa0" } },
  ],

  scholar: [
    CANON,
    { id: "sage", fill: "#9dbb92", shade: "#77956c" },
    { id: "rose", fill: "#dba3b3", shade: "#b47c8d" },
    { id: "slate-blue", fill: "#96a6c2", shade: "#6f7f9b" },
    { id: "round-glasses", overlay: { rows: GLASSES_ROUND, palette: { w: LENS } } },
    { id: "half-moons", overlay: { rows: GLASSES_HALFMOON, palette: { w: LENS } } },
  ],

  office: [
    CANON,
    { id: "beige", fill: "#cdc3ac", shade: "#a49a84" },
    { id: "blue-grey", fill: "#aebbc8", shade: "#8794a2" },
    { id: "taupe", fill: "#bdb0aa", shade: "#948780" },
    { id: "maroon-tie", extra: { T: "#8a5a5a" } },
    { id: "navy-tie", extra: { T: "#4a6a8a" } },
    { id: "olive-tie", extra: { T: "#6a7a5a" } },
  ],

  menace: [
    CANON,
    { id: "mint", fill: "#9fdcc4", shade: "#71ae98" },
    { id: "gold-cream", fill: "#f0d79b", shade: "#c2a86f" },
    { id: "periwinkle", fill: "#aab4ea", shade: "#7f8ac0" },
    { id: "silver-crown", extra: { y: "#d8dce4" } },
    { id: "pearl-crown", extra: { y: "#f6efe2" } },
  ],

  // --- One of each ---------------------------------------------------------
  ghost: [CANON],
  humcube: [CANON],
  carrot: [CANON],
  cosmos: [CANON],
  mole: [CANON],
};

/** FNV-1a. Any stable string hash would do; this one is short, has no state,
 *  and gives the same answer on every machine and every reload — which is the
 *  only property that matters here, because a resident whose colour changed
 *  when you came back tomorrow would not be a resident. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** How somebody looks. DERIVED FROM THEIR ID, never stored.
 *
 *  That is the same instinct as `charDef` — don't write a fact down twice when
 *  one copy can be computed — and it is what makes this whole feature cost zero
 *  save schema: there is no `look` field to migrate, no field to corrupt, and a
 *  town loaded from a save two versions old gets its residents' faces for free.
 *
 *  TWO RULES, AND THE SECOND IS THE INTERESTING ONE:
 *
 *  • The FIXED CAST are canon. Gary is the Tired Office Creature the art was
 *    drawn for. An institution is the reference picture of its form, which is
 *    also why the player is canon (the renderer passes look 0 directly): the
 *    six buttons on the character screen must show what they will actually get.
 *
 *  • EVERYONE ELSE SKIPS CANON — they hash into 1..n-1, never 0. So no resident
 *    ever turns up wearing the institution's exact face. Without it, the first
 *    Menace to move in has a one-in-six chance of being pixel-identical to the
 *    shopkeeper, and a coin flip that occasionally reproduces the bug this file
 *    exists to fix is not a fix.
 *
 *  IT IS `fixed`, NOT "has a CAST row", and that distinction is a bug that was
 *  caught on screen. Prudence is authored in CAST like the institutions are, but
 *  she is a RESIDENT — `fixed: false` — and the first version of this function
 *  keyed on "is this a newcomer id", which handed her canon. The starter town
 *  shipped with two scholars standing four tiles apart, Winifred at the museum
 *  and Prudence on her round, wearing exactly the same pixels: the clone bug
 *  this file exists to fix, in the one place a new player is guaranteed to see
 *  it. What earns canon is being an institution, not being old. */
export function lookFor(id: CharId, form: AdultForm): LookDef {
  const list = LOOKS[form];
  if (list.length <= 1) return CANON;
  if (isSecret(id)) return list[0];
  if (!isNewcomer(id) && CAST[id]?.fixed) return list[0];
  return list[1 + (hash(id) % (list.length - 1))];
}
