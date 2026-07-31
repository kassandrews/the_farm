// The four homesteads — the choice on the settle-in card, and the emblem that
// stands for each one.
//
// Content is data (CLAUDE.md): a homestead is a row here, not a branch in the
// onboarding code. It lived in `ui/app.ts` until the emblems arrived, which was
// tolerable while a spot was a name and a sentence and stopped being so the
// moment it carried art.
//
// `HomesteadSpot` is declared HERE rather than in `sim/types.ts`, and that is the
// same call `BiomeId` and `WaterKindId` already made: content never imports sim
// (the layering in CLAUDE.md), so a table that names the spots cannot be handed
// the type from above — it has to own it. `sim/types.ts` re-exports it, so every
// existing import still reads the way it did.
//
// WHAT THE EMBLEMS MAY AND MAY NOT SAY. Each one is a picture of the promise in
// `sim/world.ts`, and each promise is about DISTANCE, never about compass
// bearing:
//
//   • the forest edge — a treeline all the way round, 24-31 tiles out. A ring,
//     so an emblem that draws trees on every side is exactly right, always.
//   • the riverbank — the river runs past. It is anchored west of the plaza, but
//     the bearing it crosses on is the seed's.
//   • the lakeside — the lake every town is promised anyway, moved in close. A
//     bearing found by search (`townLakeSearch`), so again: any side.
//   • the coast — a shore about thirty-four tiles out, on a bearing that is a
//     pure hash (`townSeaCentre`). It can be any side at all.
//
// So no emblem puts its water on the left or the right. Water lies along the
// BOTTOM edge and trees go all the way round: both read as "this, near you",
// which is true on every seed. An emblem that composed a specific layout would
// be a map, and a map of a town generated after you pick it can only be a lie.
//
// AND THEY ARE EMBLEMS, NOT SCREENSHOTS, deliberately. A preview drawn with the
// real renderer was tried and thrown away (see ROADMAP): it cannot show a spot,
// because the camera holds about eleven tiles and the nearest thing any of these
// promises is twenty-four. The risk with art at this size is not that it is
// inexact, it is that it looks precise enough to be read as a survey — so these
// stay flat, banded and obvious, and nobody goes hunting for the river that was
// in the picture.
//
// THERE IS NO "YOU ARE HERE" MARKER. A gold star stood in the middle of each of
// these for one draft. It was the only figurative thing on the card, it needed a
// ring of ink to read at all, and once the emblems sat side by side above their
// own names the thing it was explaining was already obvious — four swatches of
// country, pick one. A marker earns its place by resolving an ambiguity, and
// there wasn't one.

export type HomesteadSpot = "riverside" | "forest" | "lakeside" | "coast";

/** A char-grid picture, same format as `content/icons.ts` but free of its 12×12
 *  size rule — `render/icons.ts` takes the dimensions from the rows. */
export interface Emblem {
  rows: string[];
  palette: Record<string, string>;
}

export interface SpotDef {
  id: HomesteadSpot;
  /** Shown on the tile. All four take the article, so no two rhyme and none is
   *  a compass bearing — the terrain is not on a fixed side of anything. */
  name: string;
  /** Describes the TERRAIN, and that is a rule (ROADMAP §"The homestead spot is
   *  terrain"). The blurbs these replaced promised a visiting Ghost and a view
   *  of the town, neither of which any code produced. */
  blurb: string;
  emblem: Emblem;
}

// Quoted from the tables that own them, so an emblem and the ground it stands
// for cannot drift apart — the same discipline `ui/title.ts` uses for the title
// scene. Grass, sand and the two water depths are `content/tiles.ts`; the pines
// are `content/biomes.ts`'s pinewood crown over that grass.
const GRASS = "#8bbf5a";
const SAND = "#ddca97";
const SHALLOW = "#7cc3de";
const DEEP = "#4f8fd0";
const PINE = "#33513c";
const PINE_LIT = "#456b4d";

const W = 24; // cells across; 16 down. At SCALE.emblem (×3) that is 72×48 CSS px.
const g = (n: number) => "g".repeat(n);
const t = (n: number) => "t".repeat(n);

/** Trees all the way round a clearing.
 *
 *  THE INNER EDGE IS RAGGED ON ALL FOUR SIDES, and the first draft's was not: it
 *  was a strictly alternating tooth along the top and bottom and a dead-straight
 *  column down each side, which came out as battlements around a lawn. That is
 *  CLAUDE.md's per-cell band rule turning up in a picture instead of in the
 *  world — a feature that steps in time with the grid stops reading as the thing
 *  it depicts and starts reading as the grid.
 *
 *  So the teeth vary in width and the sides breathe in and out by a cell. Written
 *  out row by row rather than generated, because "irregular" here means chosen —
 *  a hash would only be a different pattern with the same problem. */
const FOREST_ROWS = [
  t(W),
  t(W),
  "tt" + "TggTgggTgTggggTgTggT" + "tt",
  "ttt" + g(18) + "ttt",
  "tt" + g(19) + "ttt",
  "ttt" + g(19) + "tt",
  "tt" + g(20) + "tt",
  "ttt" + g(18) + "ttt",
  "tt" + g(20) + "tt",
  "tt" + g(19) + "ttt",
  "ttt" + g(19) + "tt",
  "tt" + g(20) + "tt",
  "ttt" + g(18) + "ttt",
  "tt" + "gTggTgTggggTgTgggTgT" + "tt",
  t(W),
  t(W),
];

/** The water goes past: a channel crossing the whole picture on the diagonal,
 *  shallow at its banks and deep down the middle, with green on both sides.
 *  Green banks and no sand is not decoration — `content/water.ts` gives rivers
 *  `beach: 0`, and a beach on a river would be the emblem contradicting the
 *  generator. */
const RIVER_ROWS = [
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(17) + "w".repeat(7),
  g(11) + "w".repeat(6) + "W".repeat(7),
  g(5) + "w".repeat(6) + "W".repeat(8) + "w".repeat(5),
  "w".repeat(6) + "W".repeat(8) + "w".repeat(5) + g(5),
  "W".repeat(6) + "w".repeat(5) + g(13),
];

/** The lake: water with THE FAR BANK IN IT, which is the whole distinction from
 *  the coast and the only honest way to draw one.
 *
 *  Three kinds of water, three pictures, and every difference between them is a
 *  number in `content/water.ts` rather than a mood. A river has `beach: 0`, so
 *  green banks. A lake has `beach: 2` and `shelf: 3` — a thin strand and a
 *  middle that is only just deep, on a body of radius 16 you can see across, so:
 *  a band of water with grass on the far side of it. The sea has `beach: 3` and
 *  `shelf: 5` and runs off the bottom edge, because its far shore is a trip. */
const LAKE_ROWS = [
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(9) + "s".repeat(10) + g(5),
  g(4) + "s".repeat(17) + g(3),
  "s".repeat(6) + "w".repeat(14) + "s".repeat(4),
  "w".repeat(4) + "W".repeat(17) + "w".repeat(3),
  "w".repeat(7) + "W".repeat(12) + "w".repeat(5),
  "s".repeat(5) + "w".repeat(15) + "s".repeat(4),
  g(3) + "s".repeat(16) + g(5),
  g(24),
];

/** A shore along the bottom: grass, then a beach that curves the way a coast
 *  does, then the wade, then the deep. Sand is what says SEA rather than river —
 *  `beach` is the field that distinguishes them, so it is the field the emblem
 *  draws. */
const COAST_ROWS = [
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(24),
  g(9) + "s".repeat(9) + g(6),
  g(3) + "s".repeat(18) + g(3),
  "s".repeat(24),
  "w".repeat(24),
  "W".repeat(24),
  "W".repeat(24),
];

export const SPOTS: SpotDef[] = [
  {
    id: "riverside",
    name: "The riverbank",
    blurb: "The water goes past the bottom of the garden, and keeps going.",
    emblem: { rows: RIVER_ROWS, palette: { g: GRASS, w: SHALLOW, W: DEEP } },
  },
  {
    id: "forest",
    name: "The forest edge",
    blurb: "The meadow gives out about thirty paces on, and then it is trees.",
    emblem: { rows: FOREST_ROWS, palette: { g: GRASS, t: PINE, T: PINE_LIT } },
  },
  {
    id: "lakeside",
    name: "The lakeside",
    blurb: "Still water a short walk off, with the other side of it in plain view.",
    emblem: { rows: LAKE_ROWS, palette: { g: GRASS, s: SAND, w: SHALLOW, W: DEEP } },
  },
  {
    id: "coast",
    name: "The coast",
    blurb: "Salt air, a short walk to the shore, and a far side you may never see.",
    emblem: { rows: COAST_ROWS, palette: { g: GRASS, s: SAND, w: SHALLOW, W: DEEP } },
  },
];
