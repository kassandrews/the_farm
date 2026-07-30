// Rasterizes the icon grids in `src/content/icons.ts` into cached <img> elements
// for the HUD and the panels. Vendored in outline from The Meadow (cozy_sprites
// `src/render/icons.ts`), with one deliberate departure — see SCALE below.

import { ICONS, type IconName } from "../content/icons";

const CELL = 12;

/** Integer upscale factors, by where the icon goes. Named rather than passed as
 *  loose numbers so the HUD can't drift into three slightly different icon sizes.
 *
 *  These are FACTORS, not pixel sizes, and that is the departure from The Meadow.
 *  Its version renders one 12×12 canvas and lets CSS stretch it to whatever size
 *  the caller asked for — 20px by default, which is 12 × 1.667. `image-rendering:
 *  pixelated` makes that a nearest-neighbour resample, so two thirds of the
 *  columns come out 2px wide and the rest 1px: unequal eyes, doubled outlines,
 *  exactly the failure CLAUDE.md's sprite rule is about. It is subtle enough at
 *  20px to ship, and The Meadow did.
 *
 *  Rendering at an integer multiple instead means every source pixel is the same
 *  size on screen, and CSS never resamples. The cost is that icon sizes come in
 *  steps of 12 — a 52px button gets a 36px icon, not a 38px one. Cheap. */
export const SCALE = {
  /** 24px — satchel rows, and anywhere an icon sits inline with text. */
  inline: 2,
  /** 36px — the tool palette's 52px buttons. */
  button: 3,
} as const;

export type IconScale = (typeof SCALE)[keyof typeof SCALE];

const urlCache = new Map<string, string>();

/** The icon as a data URL, drawn at `scale` device pixels per grid cell. Cached
 *  per name+scale — an icon is rasterized once per session however many buttons
 *  and rows end up showing it. */
export function iconUrl(name: IconName, scale: IconScale): string {
  const key = `${name}@${scale}`;
  const cached = urlCache.get(key);
  if (cached) return cached;

  const def = ICONS[name];
  const canvas = document.createElement("canvas");
  canvas.width = CELL * scale;
  canvas.height = CELL * scale;
  const ctx = canvas.getContext("2d")!;
  // A fillRect per cell rather than putImageData at 1:1 — it draws the upscale
  // directly, so there is no resample step anywhere in the path. Rows and rows
  // shorter than the grid are legal and simply leave transparent cells; the grids
  // are length-checked in content/icons.test.ts, not here.
  for (let y = 0; y < def.rows.length && y < CELL; y++) {
    const row = def.rows[y];
    for (let x = 0; x < row.length && x < CELL; x++) {
      const color = def.palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  const url = canvas.toDataURL();
  urlCache.set(key, url);
  return url;
}

/** An `<img>` for the icon, sized so one grid cell is exactly `scale` CSS px. */
export function iconEl(name: IconName, scale: IconScale = SCALE.inline): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "pxicon";
  img.src = iconUrl(name, scale);
  img.width = CELL * scale;
  img.height = CELL * scale;
  // Empty alt, not the icon's name: every icon in this game sits inside a control
  // that already carries an aria-label, or beside its own text label in the
  // satchel. Naming it again is a screen reader saying "carrot carrot".
  img.alt = "";
  return img;
}
