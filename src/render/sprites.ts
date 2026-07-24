// The canvas side of the sprite system. The pixel art itself is vendored, pure,
// and DOM-free (src/content/canon/sprites.ts); this module bakes it onto 16×16
// canvases and blits them to the scene.
//
// HARD RULE (inherited, see CLAUDE.md §Sprite rendering): never draw sprite art
// through a non-integer ctx.scale()/ctx.rotate() — it resamples pixel art off
// the grid (unequal eyes, doubled/vanished outlines). Every blit here goes
// through drawSpriteQuantized, which keeps flips (via a prebuilt mirror canvas)
// and squash (per-row integer draws) on the pixel grid. Ported from The
// Meadow's scene.ts drawSpriteQuantized — read that docblock before adding an
// animation path.

import { CELL, renderPixels } from "../content/canon/sprites";
import type { Mood, SpriteFrame } from "../content/canon/sprites";

/** Bakes and caches creature frame canvases, plus their mirrors, keyed by
 *  identity so repeated draws don't rebuild. */
export class SpriteCache {
  private frames = new Map<string, HTMLCanvasElement>();
  private mirrors = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

  /** A baked frame canvas for (key, mood, frame). */
  frame(key: string, mood: Mood, frame: SpriteFrame): HTMLCanvasElement {
    const id = `${key}:${mood}:${frame}`;
    let c = this.frames.get(id);
    if (!c) {
      c = bake(key, mood, frame);
      this.frames.set(id, c);
    }
    return c;
  }

  /** A horizontally mirrored copy — flipping via a prebuilt canvas keeps the
   *  scene draw free of transforms, so every blit stays integer-aligned. */
  mirror(src: HTMLCanvasElement): HTMLCanvasElement {
    let m = this.mirrors.get(src);
    if (!m) {
      m = document.createElement("canvas");
      m.width = src.width;
      m.height = src.height;
      const c = m.getContext("2d")!;
      c.translate(src.width, 0);
      c.scale(-1, 1);
      c.drawImage(src, 0, 0);
      this.mirrors.set(src, m);
    }
    return m;
  }
}

function bake(key: string, mood: Mood, frame: SpriteFrame): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CELL;
  canvas.height = CELL;
  const ctx = canvas.getContext("2d")!;
  const buf = renderPixels(key, mood, frame);
  const img = ctx.createImageData(buf.w, buf.h);
  img.data.set(buf.data);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Blit a sprite integer-aligned. `cx` is the horizontal centre, `feetY` the
 * bottom edge, `w`/`h` the target size in scene px. `flip < 0` mirrors (via the
 * cache's prebuilt mirror). `squashY` (0..~0.3) compresses vertically for a
 * walk/idle bob without ever dropping a row below 1px. No rotation path — a
 * top-down mover never needs the lean, and omitting it removes the only place
 * pixel art could shear off-grid.
 */
export function drawSpriteQuantized(
  ctx: CanvasRenderingContext2D,
  cache: SpriteCache,
  sprite: HTMLCanvasElement,
  cx: number,
  feetY: number,
  w: number,
  h: number,
  flip: number,
  squashY = 0,
  alpha = 1,
): void {
  const src = flip < 0 ? cache.mirror(sprite) : sprite;
  const sh = src.height;
  const sw = src.width;
  const dh = Math.max(1, Math.round(h * (1 - squashY)));
  const dw = Math.max(1, Math.round(w));
  const left = Math.round(cx - dw / 2);
  const top = Math.round(feetY - dh);

  const prev = ctx.globalAlpha;
  if (alpha < 1) ctx.globalAlpha = prev * alpha;

  if (dh >= sh) {
    ctx.drawImage(src, left, top, dw, dh);
  } else {
    // Squashed below one source-row-per-dest-row: draw row by row so thin rows
    // merge cleanly instead of the browser dropping some to a blur.
    for (let r = 0; r < sh; r++) {
      const y0 = Math.round((r * dh) / sh);
      const y1 = Math.round(((r + 1) * dh) / sh);
      if (y1 <= y0) continue;
      ctx.drawImage(src, 0, r, sw, 1, left, top + y0, dw, y1 - y0);
    }
  }
  ctx.globalAlpha = prev;
}

export { CELL };
