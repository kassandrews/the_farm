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
// Two ideas are allowed to meet only where they land on different parts of the
// body and the result is still one sayable person — the gremlin's tint × mouth,
// where you read the colour at distance and the teeth up close. See its entry.
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
  /** Drops the mouth without moving the eyes — see LookPatch in canon/sprites.
   *  The only field here that reaches into the FACE, which is why it is ±1 and
   *  why it exists at all: the face composites last, so nothing else can. */
  mouthDy?: number;
}

/** No change at all — every form's entry 0, and what the player always gets. */
const CANON: LookDef = { id: "canon" };

// --- Glasses ------------------------------------------------------------------
// The Scholar's canon overlay is three solid 3×3 blocks: thick square frames.
// These are the same two lenses drawn differently, at the same rows, so the
// silhouette and the eye positions underneath are untouched.

const LENS = "#dbe7ff";

// Half-moons are canon's bottom two rows of three, full width. The first draft
// narrowed the lower row to a single pixel and the lens stopped being a lens —
// at this size a shape needs to stay at least as wide as it is tall or it reads
// as a stray highlight. Reading glasses that sit low on the face are a shorter
// lens, not a thinner one.
const GLASSES_HALFMOON = [
  "................",
  "................",
  "................",
  "................",
  "....www.www.....",
  "....www.www.....",
];

// One lens, and the other eye bare. The same trick as the gremlin's snaggle:
// asymmetry is the thing you can still read when the sprite is 16px on a lawn,
// where a frame *shape* has long since turned to mush.
const GLASSES_MONOCLE = [
  "................",
  "................",
  "................",
  "........www.....",
  "........www.....",
  "........www.....",
];

/** The two non-canon lenses as patches to spread into a row. Canon's own full
 *  three-row frames need no patch at all — leaving `overlay` off is what asks
 *  for them, which is why the purple scholar in canon glasses is entry 0. */
const HALF_MOONS = { overlay: { rows: GLASSES_HALFMOON, palette: { w: LENS } } };
const MONOCLE = { overlay: { rows: GLASSES_MONOCLE, palette: { w: LENS } } };

/** Oxblood: the colour of a bound spine and a doctoral hood, which is as close
 *  to "academic" as a body gets without becoming a costume. Deliberately NOT
 *  the obvious ivy green — a green scholar standing on grass is the pine
 *  problem again, and this form has no horns to give it an edge. */
const OXBLOOD = { fill: "#9c5f66", shade: "#7a4650" };

// --- Teeth --------------------------------------------------------------------
// The gremlin's canon overlay is two fangs at cols 6 and 8, hanging under a
// mouth that runs cols 6–8. These are the same row redrawn: one fang, three
// small ones, or the pair pushed out to the corners. No new colours, no pixels
// outside the row the art already used.

const TOOTH = "#ffffff";

const TOOTH_SNAGGLE = "......w........";

// The underbite is the one that had to move ROWS, not pixels. Canon's fangs
// hang down from the upper jaw, so more teeth on that line is just more
// overbite; an underbite is the lower jaw's teeth jutting UP in front of the
// lip. That means drawing above the mouth instead of below it.
//
// Which is why this one is a GRID and the others are a row: a single-row
// overlay is auto-placed at faceDy+3, under the mouth, and there is no way to
// aim it. Three rows or more and `blit` lands the grid at 0,0, so it can put a
// tooth on any line it likes. The face is composited last either way, so the
// mouth still reads over the teeth — which is exactly the overlap a jaw makes.
const TOOTH_UNDERBITE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......w.w.......",
];
/** The two mouths that are not canon, as patches to spread into a row. */
const SNAGGLE = { overlay: { rows: [TOOTH_SNAGGLE], palette: { w: TOOTH } } };
// The jaw drops with the teeth. Mouth and teeth both sit one row lower than
// canon, so the whole lower face reads as pushed forward rather than as a canon
// mouth with something stuck under it — the eyes stay put, which is what keeps
// it the same gremlin.
const UNDERBITE = {
  overlay: { rows: TOOTH_UNDERBITE, palette: { w: TOOTH } },
  mouthDy: 1,
};

/** The two gremlin tints that are not canon. Horns travel with the body — see
 *  the gremlin entry — so a tint is always three numbers, never one. */
const STORM = { fill: "#6f8fb8", shade: "#506e94", extra: { G: "#3a5273" } };
const PLUM = { fill: "#a87fc0", shade: "#815a99", extra: { G: "#5f4076" } };

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

  // HORNS ARE GROWN, NOT WORN. `G` is the same kind of letter as the dog's ears:
  // part of the animal, so it moves with the body. The canon gremlin sets the
  // relationship to copy — #4c8f3c horns under a #8fce76 body, i.e. darker than
  // even the shade, so the horns read as a denser material than the skin. Every
  // row below is authored to that relationship BY HAND rather than derived by
  // dimming the fill, for the same reason the file won't hue-rotate a tint pair:
  // the numbers survive the shortcut, the relationship doesn't.
  //
  // THE ONE FORM THAT CROSSES ITS AXES, and the exception is narrow on purpose.
  // Three tints × three mouths is nine gremlins, and every one of them has a
  // name you can say: the plum one with the snaggletooth. That works here and
  // not on the Menace because the two axes land on DIFFERENT PARTS of the face —
  // a colour you read at distance, a mouth you read up close — where six tints
  // by three crowns was one silhouette with a different hat on. Three by three
  // is also the ceiling: this is a wider list, not an open door.
  //
  // Deliberately narrow: green, storm and plum are the ends and the middle of
  // the ramp, so the tints stay far apart when the mouths start repeating. The
  // teal, cornflower and pine rows were cut for that — good colours, but nine
  // rows of near-neighbours is the clone problem this file exists to fix.
  gremlin: [
    CANON,
    { id: "snaggle", ...SNAGGLE },
    { id: "underbite", ...UNDERBITE },
    { id: "storm", ...STORM },
    { id: "storm-snaggle", ...STORM, ...SNAGGLE },
    { id: "storm-underbite", ...STORM, ...UNDERBITE },
    { id: "plum", ...PLUM },
    { id: "plum-snaggle", ...PLUM, ...SNAGGLE },
    { id: "plum-underbite", ...PLUM, ...UNDERBITE },
  ],

  // GLASSES ARE THE SCHOLAR'S ONE FEATURE, so they carry most of the variation —
  // but as GLASS, not as frames. A thin round frame was tried and cut: at 16px a
  // one-pixel outline reads as a smudge on the face rather than a lens, and the
  // canon art is right that the readable move at this size is a solid block.
  // What varies instead is how much lens there is (three rows, two, or one eye's
  // worth) and what colour it is.
  // Two bodies × three lenses, the gremlin's arrangement for the gremlin's
  // reason: you read the colour across the plaza and the eyewear up close. Two
  // tints rather than three because this form has exactly one feature to vary,
  // and six scholars who differ in eyewear beat nine who differ in mauve.
  scholar: [
    CANON,
    { id: "half-moons", ...HALF_MOONS },
    { id: "monocle", ...MONOCLE },
    { id: "oxblood", ...OXBLOOD },
    { id: "oxblood-half-moons", ...OXBLOOD, ...HALF_MOONS },
    { id: "oxblood-monocle", ...OXBLOOD, ...MONOCLE },
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
