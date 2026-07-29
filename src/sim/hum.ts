// How loud the Cube is from where you are standing.
//
// It lives in sim rather than in ui/app.ts, where it started, for the reason
// everything else here does: it is a fact about distance, and a fact about
// distance is testable. What is left in the UI is the one line that hands this
// number to an oscillator (ui/audio.ts §the hum).
//
// The hum is NOT how you find the Cube, and the number below is chosen to keep
// that true. It carries about a screen's width, which means you are already
// looking at the thing by the time you can hear it — it confirms rather than
// steers. A drone you could follow across a field from off screen would be a map
// marker with a frequency, which is the shape DESIGN refuses when it says the
// Mole gives no directions.

import type { WorldState } from "./types";
import { cubeSite } from "./world";

/** Earshot, in tiles. */
export const HUM_REACH = 12;

/** 0 (silence) to 1 (standing at it).
 *
 *  Squared, so it is nearly inaudible for most of the approach and then
 *  unmistakably there. A linear ramp reads as somebody dragging a slider.
 *
 *  Silent underground, and that needs no special pleading: the Cube is a surface
 *  tile, and a hum you could hear through thirty tiles of rock would be the one
 *  sound in the game that ignores the layer everything else respects. */
export function humLevel(world: WorldState): number {
  if (world.player.layer !== "surface") return 0;
  const c = cubeSite(world.seed, world.homestead.spot);
  const d = Math.hypot(world.player.x - c.x, world.player.y - c.y);
  const near = Math.max(0, 1 - d / HUM_REACH);
  return near * near;
}
