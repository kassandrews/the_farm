// Seasons — weather and light, and nothing else.
//
// WHAT A SEASON IS ALLOWED TO TOUCH is the whole design of this file, so it is
// stated first. A season repaints the world and gives people something to say.
// It does NOT gate planting, change a growth time, alter a yield, or refuse a
// verb. The design invariant is that real time gates the living world — crops,
// night, festivals — and NEVER the player's hands (CLAUDE.md §Design
// invariants); a month that won't let you plant is a daily cap wearing a coat.
// So: no season anywhere in this codebase may appear in an acceptance test.
//
// A TOTAL FUNCTION OF THE DATE, exactly like a festival (content/festivals.ts)
// and a meteor shower (content/showers.ts). Derived from `Date#getMonth() + 1`,
// stored nowhere, migrated never — which is what lets the whole system ship
// without a single save field. DESIGN §Time promised this: "the calendar the
// festivals hang on is the one seasons will hang on later; there is no second
// notion of time to reconcile." This is that, and it reconciles nothing because
// there was only ever one clock.
//
// Northern hemisphere, from the player's LOCAL month. Two reasons not to make
// that configurable: the twelve festivals are already northern (they are the
// ones the town holds, and the town is where it is), and a setting that flips
// the world's colours is a preference about a place, which the game does not
// otherwise have.
//
// THE PALETTE IS AN OVERRIDE, NOT A REPLACEMENT. Rows here carry colours only.
// The renderer merges them over `tileDef`, which keeps `name` intact — it
// branches on `def.name` for the water ripple, the mushroom caps and the grass
// speckle, and a season that renamed a tile would silently switch those off.
//
// Note also what is NOT seasonal: the underground (a cave has no weather, and
// the tint overlay already skips it), water, plaza stone, farmland, anything
// built, and the Ghost's grove. The grove is dark wood all year on purpose —
// it is a secret with its own identity, and a stand of trees that turned gold
// every October would be joining in.

import type { CropId } from "./crops";
import { GRASS, MUSHROOM, type TileId } from "./tiles";

/** Stable: it may end up in a memory value or a postcard line. */
export type SeasonId = "spring" | "summer" | "autumn" | "winter";

/** The colours a tile wears this season. Shape matches `TileDef`'s three colour
 *  fields so the renderer can spread it and nothing else moves. */
export interface TilePalette {
  color: string;
  top?: string;
  shade?: string;
}

export interface SeasonDef {
  id: SeasonId;
  /** 1–12, matching `Date#getMonth() + 1`. Three each, covering all twelve
   *  exactly once — asserted in the tests, because a gap would be a month with
   *  no weather and an overlap would be a month with two. */
  months: number[];
  /** What people call it. This is the noun that lands in dialogue and in the
   *  postcard, so it is lowercase and speakable, never an id. */
  name: string;
  /** Terrain repaints, by tile id. Only listed tiles change; everything else
   *  keeps its year-round colours. Grass and mushrooms are listed together and
   *  identically on purpose — a mushroom patch reads as grass with something on
   *  it (tiles.ts), and the day they diverge is the day a patch looks like
   *  damage. */
  ground: Partial<Record<TileId, TilePalette>>;
  /** The stable tuft speckle scattered on grass, lit and unlit. */
  tuft: { day: string; night: string };
  /** An ordinary tree's crown: the shaded mass and the lit side, lit and unlit.
   *  The grove keeps its own palette and is not season-aware. */
  crown: { day: string; dayLit: string; night: string; nightLit: string };
  /** The base wash behind the whole scene, before anything is drawn. */
  sky: { day: string; night: string };
  /** The variety whose month this is, or null. Wheat, the carrot, the radish
   *  and the potato belong to no season and are never named here.
   *
   *  READ BY EXACTLY TWO THINGS — one draw flourish and one line of dialogue —
   *  and by nothing that decides anything. If a third caller ever appears, check
   *  it is not a price, a growth time, or an acceptance test before adding it. */
  crop: CropId | null;
  /** One flat sentence the postcard may append when a crop of this season's own
   *  variety ripened while you were out. An adjective on a change that actually
   *  happened, never a line of its own — see sim/away.ts's rule about the
   *  slideshow. Past tense, like every notice in this game. */
  ripenedNote: string;
}

// Summer is the BASELINE — its numbers are the ones the game shipped with, so
// the world in July looks exactly as it always has and the other three read as
// departures from it. That is deliberate beyond nostalgia: it means the season
// system can be verified by faking a date and comparing against a known-good
// screenshot, rather than by relitigating what grass ought to look like.
export const SEASONS: SeasonDef[] = [
  {
    id: "spring",
    months: [3, 4, 5],
    name: "spring",
    // Younger grass: a shade brighter and a touch more yellow than summer's,
    // the way new growth is before it darkens.
    ground: {
      [GRASS]: { color: "#93c65e", top: "#9bcc66", shade: "#8ac457" },
      [MUSHROOM]: { color: "#93c65e", top: "#9bcc66", shade: "#8ac457" },
    },
    tuft: { day: "#82b350", night: "#65904c" },
    crown: { day: "#4d8a45", dayLit: "#68a862", night: "#345a36", nightLit: "#406c43" },
    sky: { day: "#87b657", night: "#28344c" },
    crop: "peas",
    ripenedNote: "The peas came in during their own month, which they were smug about.",
  },
  {
    id: "summer",
    months: [6, 7, 8],
    name: "summer",
    // The shipped world. These are tiles.ts's own numbers, repeated rather than
    // imported: a season is a palette, and one that read its colours out of the
    // tile table would break the moment grass was retuned for a reason that had
    // nothing to do with June.
    ground: {
      [GRASS]: { color: "#8bbf5a", top: "#92c561", shade: "#83b352" },
      [MUSHROOM]: { color: "#8bbf5a", top: "#92c561", shade: "#83b352" },
    },
    tuft: { day: "#79a94c", night: "#5f8a48" },
    crown: { day: "#417a41", dayLit: "#57975a", night: "#2f5233", nightLit: "#3a6440" },
    sky: { day: "#7fae54", night: "#26324a" },
    crop: "tomato",
    ripenedNote: "The tomatoes came in warm, it being the month for it.",
  },
  {
    id: "autumn",
    months: [9, 10, 11],
    name: "autumn",
    // Grass going over to straw, and the one season where the trees do the
    // talking. The crown swing here is the largest in the file and is the whole
    // reason trees were brought into scope.
    ground: {
      // > Pushed warmer than first drafted: at #a3b455 the ground still read as
      // > green beside summer's and the trees were doing all the work alone.
      //
      // AND THAT IS WHY OCTOBER WENT DRAB — the fix is kept above because it was
      // right about the symptom and wrong about the cure. The trees WERE doing
      // all the work: this season's own note two lines up says they are meant to
      // ("the one season where the trees do the talking"). Warming the ground
      // until it joined in put the two largest masses on screen into one hue
      // family at one brightness, and measurably: in the birch wood the
      // crown-to-ground luma separation fell from 34 in July to 20 in October,
      // with the hues 29° apart. Two masses that close cannot separate, so the
      // trees stopped reading as objects standing on a ground and the frame went
      // to one khaki field. Nothing was drab on its own; everything was drab
      // beside everything else.
      //
      // The control is already in the game: the PINES keep a separation of 67 in
      // October and read fine, and they are the region whose trees refuse to
      // turn. Winter reads fine too — bare crowns go dark against a pale ground.
      // It is autumn, and only where the canopy turns.
      //
      // So the ground goes back to about the draft that was rejected, and the
      // vibrancy is spent where autumn actually is: on the crowns, which now
      // carry a per-region direction (§BiomeDef.autumnCrown) instead of every
      // tree in the world landing on one orange. Grass does not turn in October
      // anyway — it stops growing. The straw belongs to late winter.
      [GRASS]: { color: "#a3b455", top: "#acbd5d", shade: "#99aa4d" },
      [MUSHROOM]: { color: "#a3b455", top: "#acbd5d", shade: "#99aa4d" },
    },
    tuft: { day: "#93a247", night: "#74803a" },
    // WARMER AND DEEPER THAN THE ORANGE IT WAS, now that it is not competing
    // with the floor for the same hue: #a35d2c against a straw ground was the
    // most saturated thing on screen and still read as mud, because saturation
    // is not what separates two masses — value is. With the ground back in
    // green, the crown can go where a turning leaf actually goes.
    crown: { day: "#a8532c", dayLit: "#cf7f39", night: "#6b3722", nightLit: "#8a5228" },
    sky: { day: "#9aa851", night: "#2c3044" },
    crop: "pumpkin",
    ripenedNote: "The pumpkins came up in their own month, looking pleased with the timing.",
  },
  {
    id: "winter",
    months: [12, 1, 2],
    name: "winter",
    // Pale and cold rather than white. NO SNOW LAYER, and that is a rule and not
    // a shortcut: snow that sat on the ground would want to sit on every cell,
    // which is the per-cell edges band all over again (CLAUDE.md — it has caught
    // us three times), and snow that melted would be the first weather in the
    // game with state. Winter is a colour temperature.
    ground: {
      [GRASS]: { color: "#93a684", top: "#9bae8c", shade: "#8b9e7c" },
      [MUSHROOM]: { color: "#93a684", top: "#9bae8c", shade: "#8b9e7c" },
    },
    tuft: { day: "#849678", night: "#6b7a63" },
    // Bare. A trunk-coloured crown reads as branches rather than as leaves, and
    // it is the cheapest possible way to say the tree is not doing anything.
    crown: { day: "#5b4c3e", dayLit: "#72604e", night: "#3d332a", nightLit: "#4d4034" },
    sky: { day: "#8a9c7e", night: "#232a3e" },
    crop: "kale",
    ripenedNote: "The kale came in during the cold, which is the only weather it respects.",
  },
];

/** The season this date falls in. Total: every month is in exactly one row, so
 *  this never returns null and callers never branch on absence.
 *
 *  Kept in content beside the table, the same way `festivalOn` is, because it is
 *  a lookup by date and nothing more. sim/season.ts re-exports it and adds the
 *  things that need to walk the calendar. */
export function seasonOn(now: number): SeasonDef {
  const month = new Date(now).getMonth() + 1;
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[1];
}

export function seasonDef(id: SeasonId): SeasonDef {
  return SEASONS.find((s) => s.id === id) ?? SEASONS[1];
}
