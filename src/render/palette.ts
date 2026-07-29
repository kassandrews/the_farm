// What the scene is coloured with this frame — the hour and the month, resolved
// once per draw.
//
// WHY THIS IS A FILE AND NOT FOUR MORE TERNARIES. Day/night is already an inline
// two-way branch in three places (the sky wash, the grass tuft, the tree crown),
// and the tree's crown is additionally branched on `dark` for the Ghost's grove.
// A season is a third axis; nested inline it would make one line of drawTree a
// 2×4 of hex literals, which is how a palette stops being reviewable. So the
// maths comes out here and the renderer asks a question instead of computing an
// answer.
//
// NOTHING HERE READS THE CLOCK. `scenePalette` takes the season and the night
// flag it was given, so a test can stand in October at midnight without either.

import type { TileDef, TileId } from "../content/tiles";
import type { SeasonDef } from "../content/seasons";

/** Everything that varies by hour and by month, for one frame. */
export interface ScenePalette {
  /** Null underground — there is no sky down there and no weather either. The
   *  exemption is stated once, here, rather than checked at four draw sites;
   *  same shape the day/night tint overlay already uses. */
  season: SeasonDef | null;
  night: boolean;
  /** The flat wash behind the tiles, for any gaps. */
  sky: string;
  /** The stable tuft speckle scattered on grass. */
  tuft: string;
  /** An ordinary tree's crown, and its lit side. The grove does NOT use these —
   *  it keeps its own palette in every month (see `drawTree`). */
  crown: string;
  crownLit: string;
}

// The values the game shipped with, which are also summer's and also the
// underground's. Kept here as named constants rather than repeated inline so
// that "descending in October looks exactly like descending in June" is a fact
// you can check by reading rather than by diffing two screenshots.
const SEASONLESS = {
  sky: { day: "#7fae54", night: "#26324a" },
  tuft: { day: "#79a94c", night: "#5f8a48" },
  crown: { day: "#417a41", dayLit: "#57975a", night: "#2f5233", nightLit: "#3a6440" },
};

/** Resolve the frame's colours. `season` is null underground. */
export function scenePalette(season: SeasonDef | null, night: boolean): ScenePalette {
  const s = season ?? SEASONLESS;
  const crown = season ? season.crown : SEASONLESS.crown;
  return {
    season,
    night,
    sky: night ? s.sky.night : s.sky.day,
    tuft: night ? s.tuft.night : s.tuft.day,
    crown: night ? crown.night : crown.day,
    crownLit: night ? crown.nightLit : crown.dayLit,
  };
}

/** A terrain tile's appearance under the month.
 *
 *  Returns `def` UNCHANGED for anything the season has no row for — water,
 *  farmland, plaza stone, every underground tile — and for every tile when
 *  there is no season at all.
 *
 *  ALWAYS PRESERVES `name`, by spreading rather than constructing. The renderer
 *  branches on `def.name === "Water" | "Mushrooms" | "Grass"` for the ripple,
 *  the caps and the speckle, so a repaint that built a fresh object and forgot
 *  the name would switch three effects off silently and look like a palette
 *  problem for an afternoon. */
export function seasonSkin(def: TileDef, id: TileId, p: ScenePalette): TileDef {
  const skin = p.season?.ground[id];
  return skin ? { ...def, ...skin } : def;
}
