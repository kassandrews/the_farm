// Rasterizes the icon grids in `src/content/icons.ts` into cached <img> elements
// for the HUD and the panels. Vendored in outline from The Meadow (cozy_sprites
// `src/render/icons.ts`), with one deliberate departure — see SCALE below.

import { ICONS, type IconName } from "../content/icons";


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
  /** The homestead emblems on the settle-in card, which are 24×16 rather than
   *  12×12 — so this is 72×48, not another size of icon. Same integer rule for
   *  the same reason; the grid being bigger changes nothing about resampling. */
  emblem: 3,
} as const;

export type IconScale = (typeof SCALE)[keyof typeof SCALE];

const urlCache = new Map<string, string>();

/** Rasterize any char-grid at an integer scale.
 *
 *  DIMENSIONS COME FROM THE ROWS, not from a constant. This used to be `CELL`
 *  squared with the loops clipped to it, which is right for every icon and wrong
 *  for the first grid that isn't 12 wide — the emblems would have been cropped to
 *  their top-left quarter with no error anywhere. Deriving is exactly equivalent
 *  for the icons (content/icons.test.ts asserts all of them are 12×12) and simply
 *  correct for everything else.
 *
 *  `key` is the caller's cache identity: an icon is rasterized once per session
 *  however many buttons show it, and so is an emblem. */
export function gridUrl(key: string, def: Grid, scale: number): string {
  const cached = urlCache.get(key);
  if (cached) return cached;

  const h = def.rows.length;
  const w = def.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  // A fillRect per cell rather than putImageData at 1:1 — it draws the upscale
  // directly, so there is no resample step anywhere in the path. Rows shorter
  // than the widest are legal and simply leave transparent cells; the grids are
  // length-checked in the content tests, not here.
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    for (let x = 0; x < row.length; x++) {
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

/** Anything with rows and a palette — an `IconDef`, or a homestead `Emblem`. */
export interface Grid {
  rows: string[];
  palette: Record<string, string>;
}

/** An `<img>` for a grid, sized so one cell is exactly `scale` CSS px. */
export function gridEl(key: string, def: Grid, scale: number): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "pxicon";
  img.src = gridUrl(key, def, scale);
  img.width = def.rows.reduce((max, row) => Math.max(max, row.length), 0) * scale;
  img.height = def.rows.length * scale;
  // Empty alt, not a description: an emblem sits beside the name and blurb that
  // already say what it is, and an icon sits in a control that carries its own
  // aria-label. Naming it again is a screen reader saying "carrot carrot".
  img.alt = "";
  return img;
}

/** The icon as a data URL, drawn at `scale` device pixels per grid cell. Cached
 *  per name+scale — an icon is rasterized once per session however many buttons
 *  and rows end up showing it. */
export function iconUrl(name: IconName, scale: IconScale): string {
  return gridUrl(`${name}@${scale}`, ICONS[name], scale);
}

/** An `<img>` for the icon, sized so one grid cell is exactly `scale` CSS px. */
export function iconEl(name: IconName, scale: IconScale = SCALE.inline): HTMLImageElement {
  return gridEl(`${name}@${scale}`, ICONS[name], scale);
}
