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
import { GRASS, MUSHROOM, SAND } from "../content/tiles";
import type { SeasonDef, SeasonId } from "../content/seasons";
import type { BiomeDef, BiomeId, Tint } from "../content/biomes";

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
  /** THE SAME THREE AS SUMMER WOULD HAVE DRAWN THEM, at this hour.
   *
   *  A region may take only a FRACTION of the season (§BiomeDef.seasonPull), and
   *  a fraction needs two ends. This is the other end: the colour the surface
   *  would be if the month never reached it. Summer, because summer's numbers ARE
   *  the shipped numbers and the baseline the other three are departures from —
   *  the same constant the underground uses, for the same reason.
   *
   *  IT IS THE SUMMER OF THIS HOUR, NOT OF NOON. Night arms included, so a pine
   *  that refuses October still goes dark at dusk: the pull is a dial on the
   *  SEASON axis only, and the day/night axis is nobody's to opt out of. Reusing
   *  a high `crown.amount` to resist the season — which is what the pinewood did
   *  before this existed — resists both, and a wood that stayed bright green at
   *  midnight is a worse bug than a pine that turns orange. */
  baseCrown: string;
  baseCrownLit: string;
  baseTuft: string;
  /** THE SAME FIVE AS NOON WOULD HAVE DRAWN THEM, in this month.
   *
   *  The mirror of `baseCrown` and it arrived for the mirror reason. That field is
   *  the far end of the SEASON dial — what a surface would be if the month never
   *  reached it — and `seasonPull` slides between the two. This is the far end of
   *  the HOUR dial (§BiomeDef.nightPull): what a surface would be if the night
   *  never reached it.
   *
   *  THE RULE ABOVE STANDS AND IS NOW STATED PROPERLY. `baseCrown`'s note says
   *  "the day/night axis is nobody's to opt out of", and the fault it names is
   *  exact: a wood that stayed BRIGHT GREEN at midnight. What it was actually
   *  guarding is that nothing may brighten after dark, and the way regions used to
   *  break it was by reaching for a bigger `crown.amount` — a tint sits on
   *  whichever arm the hour picked, so resisting the season through it resists the
   *  dark as well, silently. A dial that says so out loud is the opposite of that
   *  accident, and it can be tested (`palette.test.ts`).
   *
   *  The one region that wants it is the twilight country, whose entire premise is
   *  a light that is not the light you left. It does not ask to stay bright — it
   *  asks to stay WRONG, at noon as much as at midnight. The global night wash is
   *  untouched by any of this and still falls on everything, so a region that
   *  holds this dial at 0 keeps its HUE across the clock and still gets darker
   *  after dark, which is the only version of "timeless" that does not need
   *  darkness quantised to the tile grid (see `LAMP_INNER` for why that is not
   *  on the table). */
  day: DayArms;
}

/** The hour-free end of the day/night dial — see §ScenePalette.day. Held as one
 *  object rather than five more fields on the palette so that "these are the noon
 *  values of the same five things" is legible at the call site. */
export interface DayArms {
  crown: string;
  crownLit: string;
  tuft: string;
  baseCrown: string;
  baseCrownLit: string;
  baseTuft: string;
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
  // ONE FUNCTION FOR BOTH ARMS, so the noon end of the hour dial cannot drift
  // from the noon the game actually draws. Written out twice it would be two
  // opinions about the same five colours, which is the fault `foliage`'s own
  // docblock is about — a second copy of a composition is how you get one colour
  // in a test and a different one on screen.
  const arms = (n: boolean): DayArms => ({
    crown: n ? crown.night : crown.day,
    crownLit: n ? crown.nightLit : crown.dayLit,
    tuft: n ? s.tuft.night : s.tuft.day,
    baseCrown: n ? SEASONLESS.crown.night : SEASONLESS.crown.day,
    baseCrownLit: n ? SEASONLESS.crown.nightLit : SEASONLESS.crown.dayLit,
    baseTuft: n ? SEASONLESS.tuft.night : SEASONLESS.tuft.day,
  });
  const now = arms(night);
  return {
    season,
    night,
    sky: night ? s.sky.night : s.sky.day,
    ...now,
    // By day the two ends are the same object, which keeps every daytime frame
    // byte-identical to what it drew before this field existed.
    day: night ? arms(false) : now,
  };
}

/** How far into the month a surface actually goes: `base` at 0, the season's own
 *  answer at 1, and anything between for the things that only half-notice.
 *
 *  A SEPARATE DIAL FROM THE REGION'S TINT, and the reason is what happens at
 *  night. See §ScenePalette.baseCrown — resisting the season by raising a tint's
 *  `amount` also resists the dark, because the tint sits on whichever arm the
 *  hour picked. This composes on the season axis alone. */
export function seasonPulled(base: string, seasonal: string, pull: number): string {
  if (pull >= 1) return seasonal;
  if (pull <= 0) return base;
  return mixHex(base, { color: seasonal, amount: pull });
}

/** The same lerp on the other axis: `day` at 0, this hour's own answer at 1.
 *
 *  It is arithmetically identical to `seasonPulled` and is a separate function
 *  anyway, because the two dials are separate CLAIMS and a shared name would
 *  invite a caller to pass one dial's number where the other's belongs. The
 *  early-outs matter as much as the mix: at 1 — every region but one — this hands
 *  back the very string it was given, so nothing that did not ask for an hour dial
 *  can be moved by one existing. */
export function hourPulled(day: string, now: string, pull: number): string {
  if (pull >= 1) return now;
  if (pull <= 0) return day;
  return mixHex(day, { color: now, amount: pull });
}

/** A region's FOLIAGE colour for a frame — the one place the month, the region's
 *  own turn, and its year-round tint are composed, in that order.
 *
 *  Three claims, and each is separate:
 *
 *    1. HOW MUCH of the season this region takes (§BiomeDef.seasonPull) —
 *       everything for a birch, a sixth for a pine. Pulled from summer's own arm
 *       at this hour, so refusing October never means refusing midnight.
 *    2. The tint the region wears in every month, unchanged.
 *    3. WHICH WAY it turns, in autumn only (§BiomeDef.autumnCrown), and it goes
 *       LAST on purpose. It was written second — a direction into the season's
 *       answer, with the year-round tint over the top — and the blossom rows
 *       proved that wrong in one measurement: their pink is a strong enough tint
 *       to repaint anything under it, so October's crimson came out pink again,
 *       two luma from the ground it stood on. A region's `crown` says what its
 *       foliage is; in autumn the foliage IS something else, so the month has to
 *       be able to say so over the top.
 *
 *  IT LIVES HERE RATHER THAN IN THE RENDERER so the tests can ask the same
 *  question the screen does. The pines spent a session "resisting autumn" with a
 *  number that measurably did not, while a test asserting they resisted it passed
 *  — because the test recomputed the composition itself instead of calling what
 *  draws. A second opinion about a colour is how you get a green tree in a test
 *  and a brown one on screen. */
export function foliage(biome: BiomeDef | null | undefined, p: ScenePalette, lit: boolean): string {
  const now = lit ? p.crownLit : p.crown;
  if (!biome) return now;
  // THE HOUR DIAL FIRST, AND IT MOVES BOTH ENDS. `seasonPulled` mixes between a
  // seasonless base and this month's answer, and both of those are stated at the
  // current hour — so a region that only half-notices the night has to have the
  // night taken out of BOTH before the season is asked about, or the dial would
  // hold the month still and let the hour back in through the base.
  const hour = biome.nightPull?.crown ?? 1;
  const seasonal = hourPulled(lit ? p.day.crownLit : p.day.crown, now, hour);
  const base = hourPulled(
    lit ? p.day.baseCrownLit : p.day.baseCrown,
    lit ? p.baseCrownLit : p.baseCrown,
    hour,
  );
  const ink = mixHex(seasonPulled(base, seasonal, biome.seasonPull?.crown ?? 1), biome.crown);
  return biome.autumnCrown && p.season?.id === "autumn"
    ? mixHex(ink, biome.autumnCrown)
    : ink;
}

/** A region's TUFT SPECKLE for a frame, composed exactly as `foliage` is and
 *  living beside it for the same reason: the renderer had this arithmetic inline,
 *  which was fine while it was one `seasonPulled` and became a second opinion
 *  about a colour the moment the hour got a dial of its own.
 *
 *  The region's own tint goes on last, as everywhere. There is no `autumnCrown`
 *  equivalent here — a tuft is grass, and grass does not turn. */
export function tuftInk(biome: BiomeDef, p: ScenePalette): string {
  const hour = biome.nightPull?.ground ?? 1;
  return mixHex(
    seasonPulled(
      hourPulled(p.day.baseTuft, p.baseTuft, hour),
      hourPulled(p.day.tuft, p.tuft, hour),
      biome.seasonPull?.ground ?? 1,
    ),
    biome.tuft,
  );
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

/** "Leave it alone", for a part that has nothing to say about a colour. */
const NO_TINT: Tint = { color: "#000000", amount: 0 };

/** How strong a sheet's field must be to put bare rock down inside a border
 *  zone, and how much stronger again by the far side of it (content/biomes.ts
 *  §edge, `outcrop`).
 *
 *  A THIRD, CLIMBING TO NEARLY ALL OF IT. The floor is what stops the border
 *  zone growing a haze of weak sheet where the country inside has a gradient;
 *  the climb is the thinning itself, and at the far edge only the middle of a
 *  large sheet is still rock. Both were read off the screen rather than chosen:
 *  the failure they are tuned against is a sheet that stops dead in a straight
 *  line, which happens when the floor is high and the climb is short. */
const OUTCROP_FLOOR = 0.32;
const OUTCROP_RETREAT = 0.62;

/** Resolve any region that does not fade at its edge (content/biomes.ts §edge),
 *  BEFORE the shares are blended.
 *
 *  ALL OR NOTHING, DECIDED BY WHICH SHARE IS HEAVIEST. The heaviest share is the
 *  region the tile is actually IN — it is the nearest site, which is the same
 *  answer `biomeAt` gives — so a region with an edge either owns the tile
 *  outright or is not there at all. Asking the weight to cross a fixed threshold
 *  instead would put holes at the triple points, where the nearest of nine sites
 *  can be nearest and still hold well under half.
 *
 *  `fray` ADDS TO THE WEIGHT BEFORE THE COMPARISON, which is the whole of how a
 *  burn's margin differs from a shoreline. `fray` is a low-frequency field
 *  sampled by the caller (the renderer, which has the seed and the coordinate),
 *  in roughly ±0.35 — and since the weight climbs about a tenth per tile across
 *  the fade, that walks the edge three or four tiles in and out along its length.
 *  The line stays hard everywhere; it just stops being straight, and pockets on
 *  the wrong side of it are the bits that never caught.
 *
 *  RENDER PATH ONLY, and that is the whole reason this lives here rather than in
 *  `regionParts`. Those weights are also what a cell rolls its trees and rocks
 *  from (sim/world.ts §scatterRegion), and that is generation: sharpening them
 *  would move solidity, re-landscape ground, and need the thousand-seed test run
 *  again. What is wanted is narrower anyway — the ground answering sharply while
 *  the flora still interleaves over the approach, which is right for both places
 *  that use this.
 *
 *  Untouched when nothing in the neighbourhood has an edge, which is every tile
 *  in the world but a few hundred per region that does. */
export function sharpenRegions<T extends { id: BiomeId; def: BiomeDef; w: number; bare?: boolean }>(
  parts: T[],
  fray = 0,
): T[] {
  if (parts.length === 1) return parts;
  const edged = parts.filter((p) => p.def.edge);
  if (edged.length === 0) return parts;

  // AN OUTCROP THINS RATHER THAN DIMMING, and it is the only mode that looks at
  // one SHARE of a region rather than at the region (content/biomes.ts §edge).
  //
  // The sheet's own strength is recoverable without re-sampling the field: the
  // bare share was split off as `region weight × field`, so dividing it back out
  // gives the field undiluted. That is the number the decision has to be made on
  // — the diluted one is the bug, since it falls simply because you are near a
  // border, which is not a thing rock does.
  const rock = edged.find((p) => p.def.edge === "outcrop");
  if (rock) {
    const own = parts.filter((p) => p.id === rock.id);
    // Inside the region there is nothing to resolve: every share is this region's,
    // and a sheet's soft window in there is deliberate (§sheet).
    if (own.length === parts.length) return parts;
    const total = own.reduce((n, p) => n + p.w, 0);
    const bare = own.find((p) => p.bare);
    if (bare && total > 0) {
      const field = bare.w / total;
      // How strong the field has to be to put rock down here: a floor everywhere
      // in the border zone, climbing as the region's share falls away. At the far
      // side only the middles of the biggest sheets survive, and then nothing.
      const need = OUTCROP_FLOOR + (1 - total) * OUTCROP_RETREAT;
      if (field >= need) return [{ ...bare, w: 1 }];
    }
    // No rock on this tile: the sheet share goes, and the region's turf blends
    // with its neighbours exactly as any other pair of turfs does.
    const rest = parts.filter((p) => !p.bare);
    const left = rest.reduce((n, p) => n + p.w, 0);
    return left > 0 ? rest.map((p) => ({ ...p, w: p.w / left })) : parts;
  }

  // The heaviest of the edged regions, AFTER the fray is added — two of them can
  // meet (a caldera sited in the cinders is the case that exists), and only one
  // can own a tile.
  let best: T | null = null;
  let bestW = -Infinity;
  for (const p of edged) {
    const w = p.w + (p.def.edge === "fray" ? fray : 0);
    if (w > bestW) {
      bestW = w;
      best = p;
    }
  }
  const rest = parts.filter((p) => !p.def.edge);
  let heaviestRest = 0;
  for (const p of rest) heaviestRest = Math.max(heaviestRest, p.w);
  if (best && bestW >= heaviestRest) return [{ ...best, w: 1 }];
  if (rest.length === 0) return parts;
  // Renormalised, because everything downstream reads these as shares of one
  // tile — a decor pick walks them cumulatively, and shares that no longer sum to
  // 1 would hand the last part everything the missing region used to hold.
  const total = rest.reduce((n, p) => n + p.w, 0);
  return rest.map((p) => ({ ...p, w: p.w / total }));
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

  // THE WATER TINT BLENDS TOO, WHERE ANY PART HAS ONE. It is the third thing in
  // this file that is a colour rather than a shape, so it is the third thing that
  // can be averaged — and it has to be, or a stream crossing out of the salt
  // flats would change colour on the tile the heaviest region flips, which is a
  // line drawn across running water.
  //
  // A part with no tint contributes amount 0 and is skipped by `blend`, so the
  // milk fades out over exactly the tiles the crust does. Left off entirely when
  // nobody has one, which keeps the common case identical.
  const anyWater = parts.some((p) => p.def.waterTint);
  const anySand = parts.some((p) => p.def.sandTint);
  const anyRake = parts.some((p) => p.def.rake);
  // THE SEASON DIALS BLEND TOO, on the water tint's argument exactly. A pine
  // floor takes half of October and the meadow beside it takes all of it; if the
  // number flipped on the tile the heaviest region flips, autumn would arrive
  // along a line drawn across the ground — which is the seam this whole function
  // exists to prevent, and the one `waterTint` was added to the list for.
  //
  // Numbers average by weight; `autumnCrown` is a Tint and averages exactly as
  // the others do, a part without one contributing amount 0. Both left off
  // entirely when nobody has any, so the common case stays the object it was.
  const anySnow = parts.some((p) => p.def.snow);
  // Every month any part paints, deduplicated — a part that stays brown all year
  // contributes amount 0 to each of them and fades out of the blend on its own.
  const rainy = [...new Set(parts.flatMap((p) => Object.keys(p.def.seasonGround ?? {})))] as SeasonId[];
  const anyRain = rainy.length > 0;
  const anyAutumn = parts.some((p) => p.def.autumnCrown);
  const anyPull = parts.some((p) => p.def.seasonPull);
  const anyHour = parts.some((p) => p.def.nightPull);
  const dial = (pick: (d: BiomeDef) => number | undefined): number => {
    let sum = 0;
    let w = 0;
    for (const p of parts) {
      sum += (pick(p.def) ?? 1) * p.w;
      w += p.w;
    }
    return w > 0 ? sum / w : 1;
  };
  return {
    ...heaviest.def,
    ground: blend((d) => d.ground),
    tuft: blend((d) => d.tuft),
    ...(anyWater ? { waterTint: blend((d) => d.waterTint ?? NO_TINT) } : {}),
    // The shore's light, on the water tint's terms exactly (§BiomeDef.sandTint) —
    // a beach that changed colour along the line the heaviest region flips is the
    // seam this function exists to prevent, drawn across the one surface where a
    // straight line is most obviously nobody's doing.
    ...(anySand ? { sandTint: blend((d) => d.sandTint ?? NO_TINT) } : {}),
    // THE SHADOWS SHORTEN ACROSS A BORDER instead of all standing up on one line
    // (§BiomeDef.rake). Its own averaging rather than `dial`'s, because the two
    // defaults are opposite: a region that says nothing about the season takes ALL
    // of it, and a region that says nothing about the light casts NO long shadow.
    // Sharing the helper would have made silence mean "fully raked".
    ...(anyRake
      ? {
          rake: parts.reduce((sum, p) => sum + (p.def.rake ?? 0) * p.w, 0) /
            (parts.reduce((w, p) => w + p.w, 0) || 1),
        }
      : {}),
    ...(anyAutumn ? { autumnCrown: blend((d) => d.autumnCrown ?? NO_TINT) } : {}),
    // Snow blends over a border like everything else here, so a snowy wood meeting
    // an unsnowed one fades out over the same tiles its turf does rather than
    // ending on the line the heaviest region flips. A snowline drawn straight
    // across country is the seam this function exists to prevent.
    ...(anySnow ? { snow: blend((d) => d.snow ?? NO_TINT) } : {}),
    // AND THE WET-SEASON GROUNDS, one blend per month anybody named. Same
    // argument as the snow's, which is the same argument as the water tint's: a
    // region that greens in February meeting one that does not has to fade over
    // the tiles its turf already fades over, or the rains arrive along a line.
    //
    // Keyed rather than a single tint, so a border between two regions that both
    // green — or that green in different months — blends each month separately
    // instead of averaging February into April.
    ...(anyRain
      ? {
          seasonGround: Object.fromEntries(
            rainy.map((k) => [k, blend((d) => d.seasonGround?.[k] ?? NO_TINT)]),
          ) as Partial<Record<SeasonId, Tint>>,
        }
      : {}),
    ...(anyPull
      ? {
          seasonPull: {
            crown: dial((d) => d.seasonPull?.crown),
            ground: dial((d) => d.seasonPull?.ground),
          },
        }
      : {}),
    // AND THE HOUR DIAL, on the season dial's terms exactly (§BiomeDef.nightPull).
    // The twilight country meeting an ordinary wood has to stop noticing the night
    // over the same tiles its turf fades over — a region that held still on one
    // side of a line and swung on the other would put a seam across the ground
    // after dark and nowhere else, which is the worst kind: one that is only there
    // half the day.
    ...(anyHour
      ? {
          nightPull: {
            crown: dial((d) => d.nightPull?.crown),
            ground: dial((d) => d.nightPull?.ground),
          },
        }
      : {}),
  };
}

/** The only tiles a region is allowed to recolour: the living ground it grew.
 *
 *  THE SAME LIST THE SEASON USES, and that is the point rather than a
 *  coincidence. Found on screen, in the sea west of a riverside town: tinting
 *  every tile pulled the WATER halfway to dry sand, and the plaza, the farmland
 *  and laid boards with it. A region is turf and what grows on it; it has no
 *  opinion about water, about paving, or about anything a player made. */
const BIOME_GROUND: TileId[] = [GRASS, MUSHROOM];

/** Is this a tile a region is allowed to paint?
 *
 *  Exported because `biomeSkin` stopped being the only thing that needs to know.
 *  The cracked plates on the salt flats and the Static's two-ink dither are both
 *  region paint applied at the draw call rather than through a `TileDef`, and
 *  both have to land on exactly the same set — or a region acquires an opinion
 *  about water, paving, or a floor somebody laid, which is the bug the list was
 *  written for in the first place. */
export function isBiomeGround(id: TileId): boolean {
  return BIOME_GROUND.includes(id);
}

/** A tile's appearance in a biome: the season's answer, pulled toward the
 *  region's ground colour. `top` and `shade` travel with it or the bevel at a
 *  material boundary stops matching the material it edges. */
export function biomeSkin(
  def: TileDef,
  id: TileId,
  biome: BiomeDef,
  /** WHICH MONTH, or undefined for callers that only want the region's own
   *  year-round tint. It was a `winter` boolean while snow was the only thing a
   *  season could do to the ground; `seasonGround` made that too narrow — the
   *  scrub greens in TWO named months and browns in the other two, and a flag
   *  cannot name a month. */
  season?: SeasonId,
): TileDef {
  const snow = season === "winter" ? biome.snow : undefined;
  // THE WET SEASON, where a region has one (§BiomeDef.seasonGround). Snow is the
  // special case of this that arrived first and keeps its own field, because it
  // is fitted to a luma the general one has no opinion about.
  const rain = season ? biome.seasonGround?.[season] : undefined;
  // SNOW REACHES ONE TILE THE REGION'S OWN TINT DOES NOT, and the two lists have
  // to stay separate for the reason BIOME_GROUND was narrowed in the first place:
  // "a region is turf and what grows on it; it has no opinion about water, about
  // paving, or about anything a player made". A fen has no opinion about a beach.
  // WEATHER DOES. Snow lies on sand, and a bright snowfield running into a warm
  // sandbank was the one thing that looked wrong in the first town photographed
  // under it — the river margin stayed high summer while the lawn either side of
  // it was white.
  //
  // Sand only. Not `DIRT`, which is "Dug earth" — soil somebody turned over is a
  // thing they did, and it sits with farmland on the far side of the same rule
  // the finishes are on.
  //
  // AND A SECOND THING REACHES IT NOW, on a claim that is neither weather nor
  // turf: LIGHT (§BiomeDef.sandTint). "A fen has no opinion about a beach" is
  // right and stays right — a fen is a PLACE, and a beach is not part of it. The
  // twilight country is not a place, it is the same country under a different
  // light, which its own row says out loud ("nothing is shaped oddly — the trees
  // are the meadow's own broadleaf and the light is simply not the light you
  // left"). Light falls on sand.
  const sandy = id === SAND;
  const lit = sandy ? biome.sandTint : undefined;
  const onSand = sandy && (!!snow || !!lit);
  if (!BIOME_GROUND.includes(id) && !onSand) return def;
  // THE IDENTITY RETURN, and it now has to ask about snow as well. The meadow
  // states `ground.amount: 0` — the promise that the town's lawn is the colour it
  // has always been, asserted as `toBe(def)`, the same object and not a copy — and
  // it is also one of the four rows that lie under snow. Returning early on the
  // ground tint alone would have quietly dropped the snow on exactly the region
  // that most needed it.
  if (biome.ground.amount <= 0 && !snow && !rain && !lit) return def;
  // Spread, never construct — `name` is what the renderer branches on for the
  // ripple, the mushroom caps and the grass speckle (see seasonSkin).
  const pull = (hex: string): string => {
    // The region's tint on its own turf only; on sand there is the light this
    // region is under, where it declares one, and otherwise nothing but weather.
    const tinted = sandy
      ? lit
        ? mixHex(hex, lit)
        : hex
      : biome.ground.amount > 0
        ? mixHex(hex, biome.ground)
        : hex;
    // THE MONTH'S OWN GROUND, over the region's year-round one and under the
    // snow. Turf only — a green flush is something that GREW, and it has no more
    // opinion about a beach than the region's own tint does, where snow (which
    // lies on things) legitimately has one.
    const wet = !sandy && rain ? mixHex(tinted, rain) : tinted;
    // AFTER the region's own colour, never instead of it: the granite in January
    // is grey rock with snow on it, and a snow that replaced the region would
    // make every snowy row the same white field.
    return snow ? mixHex(wet, snow) : wet;
  };
  const out: TileDef = { ...def, color: pull(def.color) };
  if (def.top) out.top = pull(def.top);
  if (def.shade) out.shade = pull(def.shade);
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
export function seasonSkin(def: TileDef, id: TileId, p: ScenePalette, pull = 1): TileDef {
  const skin = p.season?.ground[id];
  if (!skin) return def;
  // The common case, and the identity one: full pull returns exactly what this
  // function has always returned, object for object.
  if (pull >= 1) return { ...def, ...skin };
  if (pull <= 0) return def;
  // PART OF THE WAY, from the tile's OWN colour rather than from a stored summer
  // row — summer states no ground at all (it is the baseline), so the unseasoned
  // tile IS the other end of this mix. Top and shade travel with it or the bevel
  // stops matching the material it edges, which is `biomeSkin`'s rule one
  // function down and the same failure.
  const out: TileDef = { ...def, color: mixHex(def.color, { color: skin.color, amount: pull }) };
  if (def.top && skin.top) out.top = mixHex(def.top, { color: skin.top, amount: pull });
  if (def.shade && skin.shade) out.shade = mixHex(def.shade, { color: skin.shade, amount: pull });
  return out;
}
