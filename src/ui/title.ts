// The title screen's farm: the town seen from the road, on its own canvas
// behind the welcome card.
//
// Why a whole scene rather than a background image. The card used to float in a
// flat dark void, which is a menu, not an arrival — and the first line the game
// says is "it's real". Something has to be real behind it.
//
// Why SIDE-ON when the game is top-down (see `content/props.ts` for the same
// note from the art's side): a horizon with buildings on it says "a town" in
// one glance; the same field from above says "grass". The projection changes at
// the door, which is a thing title screens have always been allowed to do.
//
// Everything here is drawn in LOGICAL pixels — one logical pixel becomes an
// integer `scale` device pixels, and the canvas backing store is the logical
// size with CSS stretching it (`image-rendering: pixelated`), exactly as
// `render/renderer.ts` does it. That is what keeps CLAUDE.md's sprite rule:
// there is no ctx.scale anywhere, no fractional destination rect, and the
// creatures go through `drawSpriteQuantized` like every other sprite in the
// game.

import { STANDARD_FORMS, type AdultForm } from "../content/canon/forms";
import { creatureKey, CELL, type SpriteFrame } from "../content/canon/sprites";
import { drawProp, propSize } from "../render/props";
import { SpriteCache, drawSpriteQuantized } from "../render/sprites";
import { makeRng, type Rng } from "../sim/rng";

// Colours quoted from the tables that own them, so the title screen and the
// world are the same place. Grass is TILES[GRASS]; farmland is TILES[FARMLAND];
// the sky bands are the one thing invented here, because the top-down game has
// no sky to quote.
const GRASS = "#8bbf5a";
const GRASS_LIT = "#96c964";
const SOIL = "#7a5433";
const SOIL_LIT = "#8a613c";
const SOIL_SHADE = "#5f4026";
const FAR_TREES = "#3f6b42";
const FARTHER_TREES = "#557f57";

// Flat bands rather than a gradient. A smooth ramp behind pixel art reads as a
// different medium — the sky goes soft while everything on it stays hard — and
// dithering it would be four times the code for a sky nobody looks at directly.
// Bands are fractions of the sky's height, so a phone's tall sky gets the same
// picture as a laptop's short one rather than the same pixel heights.
const SKY_BANDS: [number, string][] = [
  [0.0, "#7ec8e6"],
  [0.22, "#8ad0ea"],
  [0.42, "#96d5ec"],
  [0.6, "#a8dcef"],
  [0.76, "#b6e4f2"],
  [0.89, "#d8f0ee"],
];

/** Scene px per logical px, from the GEOMETRIC MEAN of the viewport's sides.
 *
 *  Width alone was the first attempt and it fails on a phone: 390 css px picks
 *  a scale of 2, which makes the scene 195 × 422 logical — a composition 195
 *  wide stretched over a sky 422 tall, with the whole town squeezed into a
 *  strip at the bottom. The mean pulls the phone up a step, so a tall screen
 *  gets a chunkier, closer scene rather than a distant one under a lot of
 *  nothing. Integer, and clamped, for the usual sprite-rule reason. */
function pickScale(cssW: number, cssH: number): number {
  return Math.min(6, Math.max(2, Math.round(Math.sqrt(cssW * cssH) / 190)));
}

/** Where the near field starts. Everything past this line is drawn at 2× and
 *  everything before it at 1×.
 *
 *  TWO tiers and not a continuous ramp, because the ramp is not available: a
 *  prop at 1.6× is a resampled prop, which is the exact thing CLAUDE.md's
 *  sprite rule forbids. Doubling is the only depth cue pixel art gets, and it
 *  turns out to be enough — the first pass drew everything at 1× and the field
 *  read as a flat green wall with objects pasted on it at random heights. */
const NEAR = 0.45;
const depthScale = (depth: number): number => (depth >= NEAR ? 2 : 1);

/** The horizon buildings and the fence, at 2×.
 *
 *  Not because they are near — they are the furthest things in the picture —
 *  but because of what they are. The grids are drawn at a creature's own scale
 *  (a 24-row town hall against a 16-row sprite), and at 1× the first pass put a
 *  seat of local government the same height as the resident standing in front
 *  of it. Doubling the buildings restores the only proportion the eye actually
 *  checks: a house is about three creatures tall. */
const HORIZON_SCALE = 2;

interface Scatter {
  prop: "flowers" | "tuft" | "log" | "wateringcan" | "tree";
  x: number; // fraction of width
  depth: number; // fraction of the field's depth, 0 = horizon, 1 = bottom edge
  /** Overrides the depth tier. Only the two framing trees use it: a tree at the
   *  very front of the field is nearer than anything else in the picture and
   *  wants a third step of size, and a tree is the one prop tall enough that
   *  tripling it still fits. */
  scale?: number;
}

/** The field's dressing, as fractions rather than pixels, so one table lays out
 *  every viewport. Hand-placed rather than randomly scattered: a random field
 *  clumps, and this is a composition — the eye goes hall, plot, cabin, and the
 *  big near tree at the right holds the corner down. */
const SCATTER: Scatter[] = [
  { prop: "tree", x: 0.96, depth: 0.04, scale: 2 },
  { prop: "tree", x: 0.04, depth: 0.1, scale: 2 },
  { prop: "tuft", x: 0.55, depth: 0.16 },
  { prop: "flowers", x: 0.88, depth: 0.3 },
  { prop: "tuft", x: 0.36, depth: 0.34 },
  { prop: "log", x: 0.64, depth: 0.52 },
  { prop: "wateringcan", x: 0.24, depth: 0.66 },
  { prop: "tuft", x: 0.76, depth: 0.68 },
  { prop: "flowers", x: 0.12, depth: 0.8 },
  { prop: "tree", x: 0.92, depth: 0.92, scale: 3 },
  { prop: "tuft", x: 0.5, depth: 0.88 },
  { prop: "flowers", x: 0.62, depth: 0.98 },
  { prop: "tuft", x: 0.06, depth: 0.98 },
];

interface Resident {
  form: AdultForm;
  x: number; // fraction of width
  depth: number;
  facing: 1 | -1;
  /** Seconds between blinks, and where in that cycle this one starts, so two
   *  creatures standing together never blink in unison. */
  blinkEvery: number;
  phase: number;
}

export class TitleScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cache = new SpriteCache();
  private raf = 0;
  private born = performance.now();
  private residents: Resident[];
  private onResize = () => {
    this.resize();
    if (!this.animated) this.draw(0);
  };

  private scale = 3;
  private lw = 240;
  private lh = 160;
  private field = 96; // the field's depth in logical px
  private animated: boolean;

  constructor(parent: HTMLElement, seed = Date.now()) {
    const rng = makeRng(seed >>> 0);
    this.residents = pickResidents(rng);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "title-scene";
    // Decorative, and the card in front of it carries all the words. A screen
    // reader announcing "farm scene" here would be reading out the wallpaper
    // before the sentence that matters.
    this.canvas.setAttribute("aria-hidden", "true");
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    // Motion here is ambient — drifting clouds, a creature breathing. Ambient
    // motion is exactly what prefers-reduced-motion is about, so honour it by
    // drawing the same picture once and never starting the loop.
    this.animated = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.resize();
    window.addEventListener("resize", this.onResize);
    if (this.animated) this.loop();
    else this.draw(0);
  }

  /** Stop the loop and take the canvas out. Called when the world begins —
   *  a title screen that keeps painting behind the game is a second render
   *  loop competing for the same frame budget. */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.canvas.remove();
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    this.draw((performance.now() - this.born) / 1000);
  };

  private resize(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.scale = pickScale(cssW, cssH);
    this.lw = Math.ceil(cssW / this.scale);
    this.lh = Math.ceil(cssH / this.scale);
    // The field takes a fixed SHARE of the height, with a floor so a landscape
    // phone still has somewhere to put a plot. The sky gets the rest, which is
    // where the welcome card sits — so a tall screen reads as more sky above
    // the same town rather than as a strip of farm along the bottom.
    this.field = Math.max(52, Math.round(this.lh * 0.46));
    this.canvas.width = this.lw;
    this.canvas.height = this.lh;
    this.ctx.imageSmoothingEnabled = false;
  }

  private draw(t: number): void {
    const horizon = this.lh - this.field;
    this.drawSky(horizon, t);
    this.drawTreeline(horizon);
    this.drawGround(horizon);
    this.drawFence(horizon);
    this.drawBuildings(horizon);
    this.drawPlot(horizon);
    this.drawField(horizon, t);
  }

  private drawSky(horizon: number, t: number): void {
    const { ctx, lw } = this;
    for (let i = 0; i < SKY_BANDS.length; i++) {
      const [from, color] = SKY_BANDS[i];
      const to = i + 1 < SKY_BANDS.length ? SKY_BANDS[i + 1][0] : 1;
      const y0 = Math.round(horizon * from);
      const y1 = Math.round(horizon * to);
      ctx.fillStyle = color;
      ctx.fillRect(0, y0, lw, y1 - y0);
    }

    drawProp(ctx, "sun", lw - 26, Math.min(30, horizon - 8));

    // Three clouds at three speeds, wrapping through a band wider than the
    // scene so one never pops into existence at the edge. Positions are
    // fractional here and rounded inside drawProp — the drift is smooth, the
    // pixels are not.
    const cloudW = propSize("cloud").w;
    const span = lw + cloudW * 2;
    const clouds: [number, number, number][] = [
      [0.1, 2.1, 0.22],
      [0.55, 1.3, 0.46],
      [0.82, 2.8, 0.16],
    ];
    for (const [start, speed, depth] of clouds) {
      const x = ((start * span + t * speed) % span) - cloudW;
      drawProp(ctx, "cloud", x, Math.max(10, Math.round(horizon * depth)));
    }

    this.drawBirds(horizon, t);
  }

  /** Two birds crossing, on a long cycle. They are three pixels tall and most
   *  of the time they are off screen; that is the point — something moves in
   *  the corner of your eye while you're reading the card. */
  private drawBirds(horizon: number, t: number): void {
    const { ctx, lw } = this;
    const period = 26;
    for (const [offset, height, speed] of [
      [0, 0.3, 9],
      [4.5, 0.42, 7.5],
    ]) {
      const phase = (t + offset) % period;
      if (phase > 14) continue;
      const x = -10 + phase * speed;
      if (x > lw + 10) continue;
      // A slow bob, so they read as flying rather than sliding.
      const y = Math.round(horizon * height + Math.sin(phase * 1.4) * 2);
      drawProp(ctx, "bird", x, y);
    }
  }

  /** Two silhouette bands of woods behind the town. Drawn per COLUMN from a sum
   *  of two sines rather than by tiling a tree — a tiled treeline repeats, and
   *  the eye finds the repeat instantly on something this wide. */
  private drawTreeline(horizon: number): void {
    const { ctx, lw } = this;
    const band = (color: string, base: number, a: number, b: number, phase: number) => {
      ctx.fillStyle = color;
      for (let x = 0; x < lw; x++) {
        const h = Math.round(
          base +
            Math.sin(x * 0.055 + phase) * a +
            Math.sin(x * 0.021 + phase * 2) * b +
            // A third, fast term. The two slow ones alone gave a smooth curve
            // that reads as bare hills; the crenellation is what makes the
            // silhouette read as the tops of trees.
            Math.sin(x * 0.34 + phase * 3) * 1.6,
        );
        ctx.fillRect(x, horizon - h, 1, h);
      }
    };
    // Sized against the buildings, not against nothing: woods that come up to a
    // cabin's eaves say the town is a clearing in something bigger, which is
    // what The Meadow's retirees were sent into.
    band(FARTHER_TREES, 22, 5, 4, 1.7);
    band(FAR_TREES, 14, 4, 3, 0);
  }

  private drawGround(horizon: number): void {
    const { ctx, lw, lh } = this;
    ctx.fillStyle = GRASS;
    ctx.fillRect(0, horizon, lw, lh - horizon);
    // ONE lit lip, at the horizon, where the field actually ends. Not a bevel
    // per anything — see CLAUDE.md's per-cell edges rule, which this is the
    // legal side of: the edge is drawn where the surface stops, once.
    ctx.fillStyle = GRASS_LIT;
    ctx.fillRect(0, horizon, lw, 2);
  }

  private drawFence(horizon: number): void {
    const { ctx, lw } = this;
    const w = propSize("fence").w * HORIZON_SCALE;
    // Stepped across the SCENE's x, starting at zero and marching: posts stay
    // evenly spaced across the whole run instead of restarting against a
    // building, and the rail is continuous by construction.
    for (let x = 0; x < lw + w; x += w) {
      drawProp(ctx, "fence", x + w / 2, horizon + 5, HORIZON_SCALE);
    }
  }

  private drawBuildings(horizon: number): void {
    const { ctx, lw } = this;
    drawProp(ctx, "townhall", lw * 0.2, horizon + 6, HORIZON_SCALE);
    drawProp(ctx, "cabin", lw * 0.76, horizon + 8, HORIZON_SCALE);
    // Pinned where it is in the game: in the town's half of the picture, beside
    // the hall. Standing alone in the middle of the field it read as a
    // billboard somebody had erected in a meadow.
    drawProp(ctx, "board", lw * 0.52, horizon + this.field * 0.22, HORIZON_SCALE);
  }

  /** The tilled plot: soil, furrows, and a row of seedlings somebody has
   *  already got in. */
  private drawPlot(horizon: number): void {
    const { ctx, lw } = this;
    const x0 = Math.round(lw * 0.1);
    const x1 = Math.round(lw * 0.34);
    const y0 = Math.round(horizon + this.field * 0.26);
    const y1 = Math.round(horizon + this.field * 0.46);
    ctx.fillStyle = SOIL;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // Furrow courses. Deliberate banding, like the tent's canvas and the roof's
    // shingles — and stepped off the SCENE's y, not off anything cell-shaped,
    // so the lines run unbroken across the whole plot rather than restarting.
    ctx.fillStyle = SOIL_LIT;
    for (let y = y0; y < y1; y++) {
      if (y % 4 === 0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
    // One shaded lip along the near edge, drawn WHERE THE SOIL ACTUALLY ENDS —
    // the legal half of the per-cell edges rule. Without it the plot is a brown
    // rectangle lying in the grass rather than ground that was turned over.
    ctx.fillStyle = SOIL_SHADE;
    ctx.fillRect(x0, y1 - 1, x1 - x0, 1);

    const step = Math.max(7, Math.round((x1 - x0) / 5));
    for (let x = x0 + step / 2; x < x1; x += step) {
      drawProp(ctx, "seedling", x, y1 - 2);
      drawProp(ctx, "seedling", x + step / 2, y1 - 8);
    }
  }

  /** Everything standing on the grass — scenery and residents together, back to
   *  front by depth. One sorted pass rather than two lists drawn in sequence,
   *  because a creature and a tree at the same distance have to be able to
   *  overlap correctly, and two passes can only ever put all of one kind in
   *  front of all of the other. */
  private drawField(horizon: number, t: number): void {
    const { ctx, lw } = this;
    const items: { depth: number; draw: () => void }[] = [];

    for (const s of SCATTER) {
      items.push({
        depth: s.depth,
        draw: () =>
          drawProp(
            ctx,
            s.prop,
            lw * s.x,
            horizon + this.field * s.depth,
            s.scale ?? depthScale(s.depth),
          ),
      });
    }

    for (const r of this.residents) {
      items.push({
        depth: r.depth,
        draw: () => {
          const key = creatureKey("adult", r.form);
          const cycle = (t + r.phase) % r.blinkEvery;
          const frame: SpriteFrame = cycle < 0.14 ? "blink" : "base";
          // The same slow breathe the world renderer gives a standing villager
          // (renderer.ts drawEntity), so a creature on the title screen and the
          // same creature in the game are idling identically.
          const bob = Math.sin((t + r.phase) * 1.6) * 0.3;
          const size = CELL * depthScale(r.depth);
          const feet = horizon + this.field * r.depth + bob;
          const sprite = this.cache.frame(key, "neutral", frame);
          drawSpriteQuantized(ctx, this.cache, sprite, lw * r.x, feet, size, size, r.facing);
        },
      });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();
  }
}

/** Two residents, different forms, picked fresh each load. Different every time
 *  you open the game on purpose: whoever is standing in the field is nobody in
 *  particular, and the town having a rotating cast of strangers in it is more
 *  true to the place than two fixed mascots would be. */
function pickResidents(rng: Rng): Resident[] {
  const a = rng.pick(STANDARD_FORMS);
  let b = rng.pick(STANDARD_FORMS);
  while (b === a) b = rng.pick(STANDARD_FORMS);
  return [
    // One down in the near field turned back towards the plot, as if they'd
    // been planting; one small and far off by the cabin. The size difference
    // between them is the scene's clearest statement that it has depth.
    { form: a, x: 0.38, depth: 0.56, facing: -1, blinkEvery: 4.3, phase: 0 },
    { form: b, x: 0.66, depth: 0.2, facing: 1, blinkEvery: 5.6, phase: 2.1 },
  ];
}

/** Put a farm behind whatever the app is showing. */
export function mountTitleScene(parent: HTMLElement): TitleScene {
  return new TitleScene(parent);
}
