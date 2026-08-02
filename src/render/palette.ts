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
import { GRASS, MUSHROOM } from "../content/tiles";
import type { SeasonDef } from "../content/seasons";
import type { BiomeDef, Tint } from "../content/biomes";

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

// --- Biome tinting ------------------------------------------------------------
// A biome states a DIRECTION and a distance, never a colour (content/biomes.ts).
// Everything below is that idea applied: the season decides what the world is
// coloured, and the biome pulls it somewhere. Season and biome therefore compose
// instead of overriding each other — autumn still turns the world, and the Fen is
// a murkier autumn.
//
// Applied AFTER the season and never to a FINISH. A finish is a thing the player
// chose (a whitewashed floor is whitewashed in the fen), and the renderer already
// asks for it first and lets it win outright; biome tinting sits on the other
// branch, with the season, where the untouched natural ground is.

/** Parse `#rrggbb`. Returns null for anything else, including the shorthand —
 *  every colour in this game is written long, and a silent half-parse would be
 *  worse than a visible refusal to tint. */
function parseHex(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** Pull `base` a fraction of the way toward `tint`.
 *
 *  Linear in sRGB, which is not physically correct and is right anyway: these are
 *  hand-picked pixel-art colours, and the whole job is "a bit more like that one".
 *  A gamma-correct mix moved the mid-tones somewhere the artist hadn't chosen.
 *
 *  Returns `base` untouched at amount 0, which is what makes the meadow row's
 *  zeroes a guarantee rather than a rounding accident. */
export function mixHex(base: string, tint: Tint): string {
  if (tint.amount <= 0) return base;
  const a = parseHex(base);
  const b = parseHex(tint.color);
  if (!a || !b) return base;
  const t = Math.min(1, tint.amount);
  return `#${a.map((c, i) => toHex(c + (b[i] - c) * t)).join("")}`;
}

/** Collapse a tile's region shares into the one region its turf looks like.
 *
 *  EXACT, not an approximation, and that is why it is a tint rather than a
 *  colour. Applying tint (c, a) to a base is `b + (c - b)·a`, so the weighted
 *  average of several is `b + Σ wᵢaᵢ(cᵢ - b)` — which is itself one tint, with
 *  amount `Σ wᵢaᵢ` and colour the `wᵢaᵢ`-weighted average of the colours. The
 *  base cancels, so the blend is the same whatever ground it lands on and
 *  composes with the season exactly as a single region already did.
 *
 *  Everything except `ground` and `tuft` comes from the heaviest part untouched:
 *  crowns and trunks belong to flora, and flora takes the hard answer.
 *
 *  Returns the sole part unchanged when there is one, which is the common case
 *  and has to be bit-identical — most of the world is nowhere near a border, and
 *  a blend that rounded the meadow's zeroes would repaint the whole map. */
export function blendRegions(parts: { def: BiomeDef; w: number }[]): BiomeDef {
  if (parts.length === 1) return parts[0].def;

  let heaviest = parts[0];
  for (const p of parts) if (p.w > heaviest.w) heaviest = p;

  const blend = (pick: (d: BiomeDef) => Tint): Tint => {
    let amount = 0;
    const acc = [0, 0, 0];
    for (const p of parts) {
      const t = pick(p.def);
      const k = p.w * t.amount;
      if (k <= 0) continue;
      amount += k;
      const c = parseHex(t.color);
      if (c) for (let i = 0; i < 3; i++) acc[i] += c[i] * k;
    }
    if (amount <= 0) return { color: pick(heaviest.def).color, amount: 0 };
    return { color: `#${acc.map((v) => toHex(v / amount)).join("")}`, amount };
  };

  return { ...heaviest.def, ground: blend((d) => d.ground), tuft: blend((d) => d.tuft) };
}

/** The only tiles a region is allowed to recolour: the living ground it grew.
 *
 *  THE SAME LIST THE SEASON USES, and that is the point rather than a
 *  coincidence. Found on screen, in the sea west of a riverside town: tinting
 *  every tile pulled the WATER halfway to dry sand, and the plaza, the farmland
 *  and laid boards with it. A region is turf and what grows on it; it has no
 *  opinion about water, about paving, or about anything a player made. */
const BIOME_GROUND: TileId[] = [GRASS, MUSHROOM];

/** A tile's appearance in a biome: the season's answer, pulled toward the
 *  region's ground colour. `top` and `shade` travel with it or the bevel at a
 *  material boundary stops matching the material it edges. */
export function biomeSkin(def: TileDef, id: TileId, biome: BiomeDef): TileDef {
  if (biome.ground.amount <= 0) return def;
  if (!BIOME_GROUND.includes(id)) return def;
  // Spread, never construct — `name` is what the renderer branches on for the
  // ripple, the mushroom caps and the grass speckle (see seasonSkin).
  const out: TileDef = { ...def, color: mixHex(def.color, biome.ground) };
  if (def.top) out.top = mixHex(def.top, biome.ground);
  if (def.shade) out.shade = mixHex(def.shade, biome.ground);
  return out;
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
