// How far back the view can stand. Three steps, chosen during play.
//
// The renderer never draws at world scale: it draws into a low-resolution
// backing buffer at a fixed 16 scene px per tile, and CSS upscales that whole
// buffer by an INTEGER factor with image-rendering: pixelated. So zooming is
// picking a different integer factor — sprite art is never resampled, because
// nothing is ever scaled except the finished buffer, and only by whole numbers.
//
// That integer is also the hard constraint. ROADMAP §"No map preview on the
// card" records zooming out as forbidden, and it was right about what it was
// judging: fitting ~96 tiles means 16px sprites at ~4px, which is exactly what
// CLAUDE.md's sprite rule exists to stop. The floor of 2 below is the line
// between that and this. A zoom expressed as a MULTIPLIER would cross it by
// accident — 4 × 0.66 = 2.64, and the art starts resampling — which is why this
// module returns the scales themselves and never a factor to multiply by.
//
// This file is deliberately pure and DOM-free so it can be tested without a
// canvas; renderer.ts cannot be. palette.ts is the same arrangement.

/** Tiles across the short edge each step aims for. The first is the view the
 *  game has always had, and step 0 must keep reproducing it exactly — zoom adds
 *  somewhere to stand back to, it does not restage the default. */
export const ZOOM_TARGETS = [11, 16, 22] as const;

/** No step may upscale by less than this. See the header: this is the sprite
 *  rule, expressed as a number. */
export const MIN_SCALE = 2;

/** The integer upscale factors available on a viewport this size, nearest step
 *  first. Between one and three of them.
 *
 *  Each step aims for its target tile count, but is then forced STRICTLY below
 *  the step before it. Without that clamp the targets collide on ordinary
 *  screens — at a 600px short edge, 16 tiles and 22 tiles both round to a scale
 *  of 2, and the far step would render pixel-for-pixel identically to the mid
 *  one. A zoom button with a setting that visibly does nothing is worse than a
 *  zoom button with fewer settings.
 *
 *  Stopping (rather than clamping) at MIN_SCALE is what makes availability a
 *  property of the device. A phone's short edge is already at the floor, so it
 *  gets a one-entry ladder and, upstream, no zoom control at all — there is
 *  genuinely nowhere for it to stand back to. */
export function zoomLadder(shortEdgeCss: number, tilePx: number): number[] {
  const ladder: number[] = [];
  for (const tiles of ZOOM_TARGETS) {
    let scale = Math.max(MIN_SCALE, Math.round(shortEdgeCss / (tiles * tilePx)));
    if (ladder.length) scale = Math.min(scale, ladder[ladder.length - 1] - 1);
    if (scale < MIN_SCALE) break; // no room left to stand back
    ladder.push(scale);
  }
  return ladder;
}
