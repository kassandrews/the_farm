// What the music should be doing, from where you are and what time it is.
//
// Same split as sim/hum.ts, and for the same reason: these are facts about
// distance and about the clock, and facts are testable. What is left in the UI
// is the engine that turns these numbers into oscillators (ui/audio.ts §the
// score). Nothing in this file knows what a chord is.
//
// SETTLEDNESS IS THE ONE AXIS. One number, 0 to 1, "how much of a place is this
// where I'm standing" — 1 in the plaza or on your own claim, 0 out past
// everything. The layer table in content/music.ts turns it into an arrangement:
// full band in town, held chords in the wild. There is no second axis for
// biome, and there must not be: DESIGN says biomes are colour and density and
// nothing else, and a biome that changed the music would be a biome that meant
// something.
//
// TWO ANCHORS, NOT ONE. The plaza is the datum (DESIGN §"The plaza is the
// datum"), but a player who put their homestead forty tiles out is not living
// in the wilderness — they are living at home, and home is settled by
// definition. So the distance that counts is to whichever anchor is nearer.
// One anchor would have meant the reward for building somewhere with a view is
// that your own kitchen has no floor under the music.

import type { WorldState } from "./types";
import { PLAZA, homesteadOrigin } from "./world";
import { skyPhaseAt, isNight } from "./time";
import { PIECES } from "../content/music";
import type { PieceDef } from "../content/music";

/** Inside this many tiles of an anchor, you are simply in town. A plateau
 *  rather than a peak, so crossing the plaza doesn't ride a fader. */
export const SETTLED_CORE = 10;

/** Past this many tiles from every anchor, the music is as wild as it gets.
 *  About two and a half screens: far enough that you have chosen to go, close
 *  enough that a walk to the treeline is a change rather than a cliff. */
export const SETTLED_REACH = 44;

/** Distance from a point to the plaza rectangle — zero anywhere on the paving,
 *  not just at its middle. A rectangle measured from its centre would make the
 *  north edge of the square meaningfully wilder than the south. */
function distToPlaza(x: number, y: number): number {
  const dx = Math.max(PLAZA.x0 - x, 0, x - PLAZA.x1);
  const dy = Math.max(PLAZA.y0 - y, 0, y - PLAZA.y1);
  return Math.hypot(dx, dy);
}

/** 0 (out past everything) to 1 (standing in town, or at home).
 *
 *  Smoothstepped between the core and the reach: a linear ramp reads as
 *  somebody dragging a slider, which is the same note sim/hum.ts makes about
 *  its own curve.
 *
 *  UNDERGROUND IS ALWAYS 0, and that needs no special pleading. Down there you
 *  are nowhere near anything, the hum already refuses to carry through rock,
 *  and a full drum kit thirty tiles under the plaza would be the one sound in
 *  the game that ignores the layer everything else respects. */
export function settledness(world: WorldState): number {
  if (world.player.layer !== "surface") return 0;
  const home = homesteadOrigin(world.homestead.spot);
  const d = Math.min(
    distToPlaza(world.player.x, world.player.y),
    Math.hypot(world.player.x - home.x, world.player.y - home.y),
  );
  if (d <= SETTLED_CORE) return 1;
  if (d >= SETTLED_REACH) return 0;
  const t = 1 - (d - SETTLED_CORE) / (SETTLED_REACH - SETTLED_CORE);
  return t * t * (3 - 2 * t);
}

/** How far out of town you are — what the layer table actually reads. */
export function wildness(world: WorldState): number {
  return 1 - settledness(world);
}

/** Whether the night setlist is the one in play.
 *
 *  Reuses the ground's own definition of dark (sim/time.ts), so dawn counts as
 *  night and dusk does not. Dusk is still sociable; five in the morning is not.
 *
 *  Takes `now` rather than reading the clock, so a caller passing the frame's
 *  timestamp gets an answer consistent with the tint drawn in the same frame. */
export function nightMusic(now: number): boolean {
  return isNight(skyPhaseAt(now));
}

/** How long a piece plays, in seconds. Three minutes — the length of the
 *  Minecraft tracks this is pacing itself against, most of which run three to
 *  four. */
export const PIECE_SECONDS = 180;

/** How long the silence after it runs.
 *
 *  FIVE MINUTES BY DAY, EIGHT BY NIGHT, and the ratio is the point: far more
 *  quiet than music. A soundtrack that is always on is a soundtrack you mute
 *  in week two. Minecraft's is commonly reckoned at something like ten to
 *  twenty minutes between tracks, which is more silence than we want in a game
 *  you visit for twenty minutes at a time — but the shape is theirs.
 *
 *  The night rest is longer because night is quieter, and because the night
 *  pieces are sparse enough that stacking them close together would make the
 *  small hours busier than the afternoon. */
export function restSeconds(night: boolean): number {
  return night ? 480 : 300;
}

/** How long the arrangement takes to assemble itself, in seconds.
 *
 *  SHORTER IN TOWN. Playtesting the spike found the same number could not serve
 *  both ends of the walk: thirty seconds of pads before a beat is atmospheric
 *  out in the fields and simply slow when you are standing in the plaza where
 *  the beat is the whole point. Sixteen in town, thirty in the wild.
 *
 *  Winding down runs at 85% of whichever it is — leaving should be a touch
 *  brisker than arriving, or the silence never quite gets to be silence. */
export function assembleSeconds(settled: number): number {
  return 30 + (16 - 30) * Math.max(0, Math.min(1, settled));
}

/** The pieces eligible right now. Never empty: `any` rows and, failing that,
 *  the whole setlist, so the selector always has an answer. */
export function poolFor(night: boolean): PieceDef[] {
  const want = night ? "night" : "day";
  const pool = PIECES.filter((p) => p.at === want || p.at === "any");
  return pool.length > 0 ? pool : PIECES;
}

/** How many recent pieces to refuse to repeat. Three out of six by day means
 *  you can go a long while without hearing the same thing twice, without the
 *  order ever being a fixed rotation you can predict. */
export const NO_REPEAT = 3;

/** Choose the next piece.
 *
 *  Pure: takes the pool, what has been heard lately (most recent last) and one
 *  roll in [0,1), so the choice is testable and the caller owns the randomness.
 *  Falls back gracefully when the pool is smaller than the no-repeat window —
 *  by night there are only three pieces, so "not the last three" would leave
 *  nothing and it settles for "not the one that just played". */
export function choosePiece(pool: PieceDef[], recent: string[], roll: number): PieceDef {
  const avoid = new Set(recent.slice(-NO_REPEAT));
  let fresh = pool.filter((p) => !avoid.has(p.name));
  if (fresh.length === 0) {
    const last = recent[recent.length - 1];
    fresh = pool.filter((p) => p.name !== last);
  }
  if (fresh.length === 0) fresh = pool;
  const i = Math.min(fresh.length - 1, Math.floor(Math.max(0, roll) * fresh.length));
  return fresh[i];
}
