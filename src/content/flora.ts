// The flora catalogue — every plant the GARDEN can put in the ground.
//
// DESIGN §The garden: a species does not belong to a region. What a species IS
// here is a reference to the silhouette and inks a region already draws — the
// `skin` — so a bur oak planted on your lawn is drawn by exactly the machinery
// that draws it in the long grass, seasons and all, and no species in this file
// carries a byte of new art unless it is genuinely new (the orchard's three).
//
// WHY REFERENCES AND NOT AN INVERSION. The honest end-state is regions
// referencing this table rather than this table referencing regions — DESIGN
// says so — but the region rows carry a month of intertwined notes about why
// each silhouette is shaped the way it is, and moving twenty of them wholesale
// is comment surgery with no player on the other end. So the catalogue points
// INTO `biomes.ts` today, the drawing has one source of truth either way, and
// the inversion is recorded in ROADMAP as owed rather than smuggled in half-done.
//
// YOU PLANT WHAT YOU HAVE MET (DESIGN §The garden). `metIn` is the discovery
// rule: standing in one of those regions marks the species seen, forever.
// sim/garden.ts §noticeFlora is the only reader. The far country's trees are in
// this table on purpose — the walk is the price — with one exception: the
// Static's tree stays out, because its whole character is the region's glitch
// field, and a stepped crown without the fringing is a bug report waiting to be
// filed. The grove's dark tree stays out because it is a secret, not a species.

import type { BiomeId, ShrubShape } from "./biomes";
import type { SeasonId } from "./seasons";
import type { ItemId } from "./items";

export type FloraKind = "tree" | "bush" | "flower";

export type FloraId =
  // trees
  | "broadleaf"
  | "burOak"
  | "coastOak"
  | "birch"
  | "cherry"
  | "willow"
  | "lodgepole"
  | "jeffrey"
  | "redwood"
  | "sequoia"
  | "snag"
  | "glasswood"
  | "apple"
  | "plum"
  // bushes
  | "bush"
  | "pricklyPear"
  | "blueberry"
  | "hydrangea"
  // flowers
  | "buttercup"
  | "daisy"
  | "aster"
  | "poppy"
  | "kingcup"
  | "harebell"
  | "lupine"
  | "campion";

export interface FloraDef {
  id: FloraId;
  /** Lowercase and speakable — it lands in hints and maybe one day in dialogue. */
  name: string;
  kind: FloraKind;
  /** The region whose inks and silhouette this species wears. The renderer
   *  draws a planted one by handing this region's `BiomeDef` to the same call
   *  that draws the wild one — see render/renderer.ts §gardenSkin. */
  skin: BiomeId;
  /** Which of the skin's tree forms (content/biomes.ts §crownAlt), for regions
   *  that draw more than one. Omitted: form zero. */
  form?: number;
  /** Bushes: which of the skin's shrub shapes to always be. A wild scrub rolls
   *  mostly bushes and the odd cactus; a PLANTED cactus is a cactus. */
  shape?: ShrubShape;
  /** Flowers: which of the skin's bloom kits this plant is, by the season that
   *  kit flowers in — or "decor" for the one flower that lives in a region's
   *  year-round kit (the blossom rows' daisy). Off-season a planted flower
   *  draws as greenery, not as nothing: an empty cell you paid for is a bug
   *  report, a green one is winter. */
  bloom?: SeasonId | "decor";
  /** Days to full size (DESIGN §The garden: days, never seasons). Growth is a
   *  pure function of (plantedAt, now) — nothing ticks, nothing is stored but
   *  the timestamp, and away-time needs no special case. */
  grows: number;
  /** Standing in any of these regions marks the species met. */
  metIn: BiomeId[];
  /** What a PLANTED, grown one yields to ACT in season — wild ones never do
   *  (DESIGN: fruit is pickable exactly when you planted the tree). */
  fruit?: { item: ItemId; season: SeasonId };
  /** Where you met it, as the palette entry's hint — a travel journal line,
   *  never an enumeration of what's missing. */
  hint: string;
}

/** Trees fill out over about three days, small things over about one — long
 *  enough that a garden is grown rather than assembled, short enough that
 *  nobody is waiting a season of their real life (DESIGN §The garden). */
const TREE_DAYS = 3;
const SMALL_DAYS = 1;

export const FLORA: Record<FloraId, FloraDef> = {
  // --- Trees ------------------------------------------------------------------
  broadleaf: {
    id: "broadleaf",
    name: "broadleaf",
    kind: "tree",
    skin: "meadow",
    grows: TREE_DAYS,
    // The starter: you wake up under these. Every town region teaches it, so
    // the palette is never empty and nothing special-cases the first morning.
    metIn: ["meadow", "dusk"],
    hint: "the ordinary tree — it was here when you arrived",
  },
  burOak: {
    id: "burOak",
    name: "bur oak",
    kind: "tree",
    skin: "prairie",
    grows: TREE_DAYS,
    metIn: ["prairie"],
    hint: "met in the long grass",
  },
  coastOak: {
    id: "coastOak",
    name: "coast live oak",
    kind: "tree",
    skin: "scrub",
    grows: TREE_DAYS,
    metIn: ["scrub"],
    hint: "met in the scrub",
  },
  birch: {
    id: "birch",
    name: "birch",
    kind: "tree",
    skin: "birch",
    grows: TREE_DAYS,
    metIn: ["birch", "glimmer"],
    hint: "met among the birches",
  },
  cherry: {
    id: "cherry",
    name: "cherry",
    kind: "tree",
    skin: "blossom",
    grows: TREE_DAYS,
    metIn: ["blossom"],
    hint: "met in the blossom rows",
  },
  willow: {
    id: "willow",
    name: "willow",
    kind: "tree",
    skin: "fen",
    grows: TREE_DAYS,
    metIn: ["fen", "marsh"],
    hint: "met at the fen",
  },
  lodgepole: {
    id: "lodgepole",
    name: "lodgepole pine",
    kind: "tree",
    skin: "pinewood",
    grows: TREE_DAYS,
    metIn: ["pinewood"],
    hint: "met in the pinewood",
  },
  jeffrey: {
    id: "jeffrey",
    name: "Jeffrey pine",
    kind: "tree",
    skin: "granite",
    grows: TREE_DAYS,
    metIn: ["granite"],
    hint: "met on the granite",
  },
  redwood: {
    id: "redwood",
    name: "redwood",
    kind: "tree",
    skin: "redwoods",
    grows: TREE_DAYS,
    metIn: ["redwoods"],
    hint: "met in a redwood stand, a long way out",
  },
  sequoia: {
    id: "sequoia",
    name: "giant sequoia",
    kind: "tree",
    skin: "giants",
    grows: TREE_DAYS,
    // The one-in-four heart of a redwood stand — the rarest meeting in the
    // catalogue, which is exactly what "the walk is the price" is for.
    metIn: ["giants"],
    hint: "met among the giants",
  },
  snag: {
    id: "snag",
    name: "snag",
    kind: "tree",
    skin: "cinder",
    // A dead tree grows in like anything else, which is deadpan enough to keep.
    grows: TREE_DAYS,
    metIn: ["cinder", "caldera"],
    hint: "met in the cinders — it was already done growing",
  },
  glasswood: {
    id: "glasswood",
    name: "glass tree",
    kind: "tree",
    skin: "glass",
    grows: TREE_DAYS,
    metIn: ["glass"],
    hint: "met in the glass wood, further out than most people go",
  },
  apple: {
    id: "apple",
    name: "apple tree",
    kind: "tree",
    skin: "orchard",
    form: 0,
    grows: TREE_DAYS,
    metIn: ["orchard"],
    fruit: { item: "apple", season: "autumn" },
    hint: "met in the old orchard",
  },
  plum: {
    id: "plum",
    name: "plum tree",
    kind: "tree",
    skin: "orchard",
    form: 1,
    grows: TREE_DAYS,
    metIn: ["orchard"],
    fruit: { item: "plum", season: "summer" },
    hint: "met in the old orchard, in among the apples",
  },

  // --- Bushes -----------------------------------------------------------------
  bush: {
    id: "bush",
    name: "bush",
    kind: "bush",
    skin: "meadow",
    shape: "bush",
    grows: SMALL_DAYS,
    metIn: ["meadow", "prairie"],
    hint: "a bush — they get everywhere",
  },
  pricklyPear: {
    id: "pricklyPear",
    name: "prickly pear",
    kind: "bush",
    skin: "scrub",
    shape: "pear",
    grows: SMALL_DAYS,
    metIn: ["scrub"],
    hint: "met in the scrub, and it kept its distance",
  },
  blueberry: {
    id: "blueberry",
    name: "blueberry bush",
    kind: "bush",
    skin: "pinewood",
    shape: "bush",
    grows: SMALL_DAYS,
    metIn: ["pinewood"],
    fruit: { item: "blueberry", season: "summer" },
    hint: "met in the pinewood barrens",
  },
  hydrangea: {
    id: "hydrangea",
    name: "hydrangea",
    kind: "bush",
    skin: "orchard",
    shape: "bush",
    grows: SMALL_DAYS,
    metIn: ["orchard"],
    hint: "met along the orchard wall",
  },

  // --- Flowers ----------------------------------------------------------------
  buttercup: {
    id: "buttercup",
    name: "buttercups",
    kind: "flower",
    skin: "meadow",
    bloom: "spring",
    grows: SMALL_DAYS,
    metIn: ["meadow"],
    hint: "met on the town's own lawn",
  },
  daisy: {
    id: "daisy",
    name: "daisies",
    kind: "flower",
    skin: "blossom",
    bloom: "decor",
    grows: SMALL_DAYS,
    metIn: ["blossom"],
    hint: "met under the cherry trees",
  },
  aster: {
    id: "aster",
    name: "asters",
    kind: "flower",
    skin: "prairie",
    bloom: "autumn",
    grows: SMALL_DAYS,
    metIn: ["prairie"],
    hint: "met in the long grass in October",
  },
  poppy: {
    id: "poppy",
    name: "poppies",
    kind: "flower",
    skin: "scrub",
    bloom: "spring",
    grows: SMALL_DAYS,
    metIn: ["scrub"],
    hint: "met in the scrub's loud fortnight",
  },
  kingcup: {
    id: "kingcup",
    name: "kingcups",
    kind: "flower",
    skin: "fen",
    bloom: "spring",
    grows: SMALL_DAYS,
    metIn: ["fen"],
    hint: "met at the fen's edge",
  },
  harebell: {
    id: "harebell",
    name: "harebells",
    kind: "flower",
    skin: "birch",
    bloom: "summer",
    grows: SMALL_DAYS,
    metIn: ["birch"],
    hint: "met among the birches",
  },
  lupine: {
    id: "lupine",
    name: "lupines",
    kind: "flower",
    skin: "pinewood",
    bloom: "summer",
    grows: SMALL_DAYS,
    metIn: ["pinewood"],
    hint: "met along the pinewood's openings",
  },
  campion: {
    id: "campion",
    name: "white campion",
    kind: "flower",
    skin: "dusk",
    bloom: "summer",
    grows: SMALL_DAYS,
    metIn: ["dusk"],
    hint: "met in the dusk, where it is always open",
  },
};

/** Every species a given region teaches — the discovery table inverted once,
 *  at module load, so the per-tick check is a lookup and not a scan. */
export const TAUGHT_BY: Partial<Record<BiomeId, FloraId[]>> = (() => {
  const by: Partial<Record<BiomeId, FloraId[]>> = {};
  for (const def of Object.values(FLORA)) {
    for (const b of def.metIn) (by[b] ??= []).push(def.id);
  }
  return by;
})();

export function floraDef(id: FloraId): FloraDef {
  return FLORA[id];
}
