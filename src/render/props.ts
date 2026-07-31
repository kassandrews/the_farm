// Rasterizes the scenery grids in `src/content/props.ts` into cached canvases
// for the title screen. Same shape as `render/icons.ts`, with two differences,
// both because a prop is not an icon:
//
//  - Props are drawn ONTO a canvas the scene owns, not handed to the DOM as an
//    <img>. The title screen composes sun, buildings, field and creatures into
//    one canvas so the whole picture shares a pixel grid; a stack of positioned
//    <img>s at CSS percentages — which is how The Meadow builds its paddock —
//    lands props on fractional pixels the moment the window is an odd width.
//  - Props are not all one size, so `propSize` exists and callers must ask
//    rather than assume.
//
// The cached canvas is at 1 device pixel per cell. The scene blits it with
// `drawImage` at an INTEGER multiple with smoothing off, which is the whole of
// CLAUDE.md's sprite rule: no ctx.scale, no fractional destination rects.

import { PROPS, type PropName } from "../content/props";

const cache = new Map<PropName, HTMLCanvasElement>();

/** The prop's grid size in cells. Width is the longest row (all rows are the
 *  same length — `content/props.test.ts` enforces it). */
export function propSize(name: PropName): { w: number; h: number } {
  const def = PROPS[name];
  return { w: Math.max(...def.rows.map((r) => r.length)), h: def.rows.length };
}

/** The prop as a canvas, one pixel per cell, baked once per session. */
export function propCanvas(name: PropName): HTMLCanvasElement {
  const cached = cache.get(name);
  if (cached) return cached;

  const def = PROPS[name];
  const { w, h } = propSize(name);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = def.palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(name, canvas);
  return canvas;
}

/** Blit a prop with its FEET at (cx, baseY) — horizontally centred, sitting on
 *  the given ground line, at `scale` scene px per cell.
 *
 *  Anchored at the bottom because that is how a side-on scene is composed: the
 *  ground line is the thing every prop shares, and anchoring at the top would
 *  mean every placement in the scene did the same subtraction by hand and one
 *  of them would get it wrong. Rounded to integers here so callers may hold
 *  fractional positions (a drifting cloud) without ever drawing on one. */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  name: PropName,
  cx: number,
  baseY: number,
  scale = 1,
): void {
  const src = propCanvas(name);
  const w = src.width * scale;
  const h = src.height * scale;
  ctx.drawImage(src, Math.round(cx - w / 2), Math.round(baseY - h), w, h);
}
