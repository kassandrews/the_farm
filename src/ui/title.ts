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
// NOBODY IS IN IT, and that is the decision, not an omission. An early pass put
// two residents in the field; they pulled the eye straight off the town and
// onto themselves, and a title screen that introduces two specific strangers is
// making a promise about them. The place, empty, is the subject. You meet the
// first person on the next screen.
//
// Everything here is drawn in LOGICAL pixels — one logical pixel becomes an
// integer `scale` device pixels, and the canvas backing store is the logical
// size with CSS stretching it (`image-rendering: pixelated`), exactly as
// `render/renderer.ts` does it. That is what keeps CLAUDE.md's sprite rule:
// there is no ctx.scale anywhere and no fractional destination rect.

import { drawProp, propSize } from "../render/props";

// Colours quoted from the tables that own them, so the title screen and the
// world are the same place. Grass is TILES[GRASS]; farmland is TILES[FARMLAND];
// the sky bands are the one thing invented here, because the top-down game has
// no sky to quote.
const GRASS = "#8bbf5a";
const GRASS_LIT = "#96c964";
const GRASS_SHADE = "#79ad4c";
const SOIL = "#7a5433";
const SOIL_LIT = "#8a613c";
const SOIL_SHADE = "#5f4026";
const FAR_TREES = "#3f6b42";
// TILES[WATER] and TILES[SHALLOW]. The stream is drawn deep in the middle with
// a pale margin at each bank, which is not decoration — pale is what SHALLOW
// means in this game, and shallow is the half you can wade. The title screen
// showing the same two blues as the world is the whole reason for quoting
// colours instead of picking them.
const WATER = "#4f8fd0";
const SHALLOW = "#7cc3de";

// ONE flat colour. The sky was six bands, then three, and the honest conclusion
// is that a stepped sky was never going to stop looking stepped: every seam is
// a hard horizontal line in a picture whose subject is a horizon, so the sky
// kept competing with the one horizontal line that matters.
//
// A real gradient is the other way out and it is not available here — a smooth
// ramp behind pixel art reads as a different medium, the sky going soft while
// everything on it stays hard. Flat colour is what the medium actually does,
// and it costs nothing: the buildings are lifted off it by their own ink, which
// was doing that work all along.
const SKY = "#7ec8e6";

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

/** ONE scale for everything with an outline, and that is the whole depth
 *  system now.
 *
 *  There WAS a perspective here: a near tier at 2×, a far tier at 1×, and a
 *  third step for two framing trees at 3×. It was doing more harm than good.
 *  Pixel art can only step depth in whole doublings, so "further away" arrived
 *  as "half the size" with nothing in between — the far trees read as saplings
 *  standing next to full-grown ones rather than as the same tree seen further
 *  off, and the 3× trees in the corners read as a different, enormous species.
 *  A side-on scene does not owe the viewer perspective; a woodcut has none.
 *
 *  Depth is still what SORTS the field, so a near prop overlaps a far one.
 *  Overlap is a depth cue that costs no resampling, which is the only kind
 *  CLAUDE.md's sprite rule leaves available. */
const SCENE_SCALE = 2;

/** Where the two buildings stand, as fractions of the width. Module constants
 *  rather than numbers typed into `drawBuildings`, because the plot has to be
 *  centred on the barn and a second copy of 0.83 is a second copy that gets
 *  edited alone. */
const HALL_X = 0.17;
const BARN_X = 0.83;

/** Ground cover draws at 1×. Not perspective — a size difference between things
 *  that are genuinely different sizes. Flowers and grass are ankle height and
 *  at 2× they came up to the middle of a tree trunk. */
const GROUND_COVER_SCALE = 1;

interface Scatter {
  prop: "flowers" | "tuft" | "tree";
  x: number; // fraction of width
  depth: number; // fraction of the field's depth, 0 = horizon, 1 = bottom edge
}

const isGroundCover = (prop: Scatter["prop"]): boolean =>
  prop === "flowers" || prop === "tuft";

/** The field's dressing, as fractions rather than pixels, so one table lays out
 *  every viewport. Hand-placed rather than randomly scattered: a random field
 *  clumps, and this is a composition — the eye goes hall, barn, plot, with a
 *  tree in each bottom corner holding the frame down.
 *
 *  The right side is kept CLEAR between the barn and the plot in front of it.
 *  That pair is the subject of the right half and scenery scattered through it
 *  just makes it busy. */
const SCATTER: Scatter[] = [
  // NOTHING sits shallower than 0.14. A prop at 0.04 has its feet within two
  // logical pixels of the horizon, where the grass, the fence and the treeline
  // all meet — there is no ground under it to stand on, so it read as hanging
  // in the air behind the fence. That was the floating tree.
  //
  // Both trees are also kept DEEP, at 0.5 and below, and that is about the
  // buildings rather than about the horizon: a tree up near the horizon is at
  // the buildings' own height on the screen and lands on top of one of them,
  // and the field props draw last so the tree wins. Below about 0.5 a tree's
  // whole crown sits under the eaves line, and it cannot collide at all.
  { prop: "tuft", x: 0.55, depth: 0.2 },
  { prop: "tuft", x: 0.36, depth: 0.34 },
  { prop: "tree", x: 0.05, depth: 0.55 },
  // Nothing between 0.66 and 0.88 — that band is the stream, and a tuft of
  // grass standing in the middle of the water is not a plant, it is a mistake.
  // The far bank takes the tufts, the near bank the flowers.
  { prop: "tuft", x: 0.22, depth: 0.62 },
  { prop: "flowers", x: 0.12, depth: 0.64 },
  { prop: "tree", x: 0.94, depth: 0.93 },
  { prop: "tuft", x: 0.5, depth: 0.92 },
  { prop: "flowers", x: 0.44, depth: 0.96 },
  { prop: "tuft", x: 0.06, depth: 0.96 },
];

export class TitleScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private born = performance.now();
  private onResize = () => {
    this.resize();
    if (!this.animated) this.draw(0);
  };

  private scale = 3;
  private lw = 240;
  private lh = 160;
  private field = 96; // the field's depth in logical px
  private animated: boolean;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "title-scene";
    // Decorative, and the card in front of it carries all the words. A screen
    // reader announcing "farm scene" here would be reading out the wallpaper
    // before the sentence that matters.
    this.canvas.setAttribute("aria-hidden", "true");
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    // Motion here is ambient — three clouds drifting, and nothing else. Ambient
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
    // Before the field, so the near tree and the front tufts stand IN FRONT of
    // the water rather than being wiped out by it.
    this.drawStream(horizon);
    this.drawField(horizon);
  }

  private drawSky(horizon: number, t: number): void {
    const { ctx, lw } = this;
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, lw, horizon);

    // The sun and the clouds draw at SCENE_SCALE like everything else, and that
    // is the point. They were the only props left at 1×, which made them the
    // finest-grained things in the picture — a smooth little disc and a smooth
    // little puff over a town built out of chunks twice their size. Sky and
    // ground now share one pixel, so the whole scene reads as one drawing
    // rather than as a pixel-art town under a higher-resolution sky.
    //
    // High and well clear of the roofline. Its feet used to land at 36, which
    // put the bottom of the disc into the top of the barn — the sun looked like
    // it was setting behind a building at midday.
    drawProp(ctx, "sun", lw - 34, Math.min(24, horizon - 20), SCENE_SCALE);

    // Three clouds at three speeds, wrapping through a band wider than the
    // scene so one never pops into existence at the edge. Positions are
    // fractional here and rounded inside drawProp — the drift is smooth, the
    // pixels are not.
    const cloudW = propSize("cloud").w * SCENE_SCALE;
    const span = lw + cloudW * 2;
    const clouds: [number, number, number][] = [
      [0.1, 2.1, 0.22],
      [0.55, 1.3, 0.46],
      [0.82, 2.8, 0.16],
    ];
    for (const [start, speed, depth] of clouds) {
      const x = ((start * span + t * speed) % span) - cloudW;
      drawProp(ctx, "cloud", x, Math.max(14, Math.round(horizon * depth)), SCENE_SCALE);
    }
  }

  /** ONE silhouette band of woods behind the town, drawn per COLUMN from a sum
   *  of sines rather than by tiling a tree — a tiled treeline repeats, and the
   *  eye finds the repeat instantly on something this wide.
   *
   *  One band and not two. Two read as layered hills receding, which is a
   *  landscape painting's job; one reads as the edge of the woods this clearing
   *  was cut out of, which is the town's.
   *
   *  And ONE LEVEL. There were two slow sine terms rolling the height by ±9px,
   *  which drew hills — and hills are scenery with an opinion: they put the
   *  town in a valley, they make one side of the picture higher than the other,
   *  and they compete with the roofline for the eye. Level, the band is just
   *  where the field stops. The fast term stays so the top edge is ragged
   *  rather than ruled — that is the difference between treetops and a wall. */
  private drawTreeline(horizon: number): void {
    const { ctx, lw } = this;
    ctx.fillStyle = FAR_TREES;
    for (let x = 0; x < lw; x++) {
      const h = Math.round(15 + Math.sin(x * 0.34) * 1.6 + Math.sin(x * 0.13) * 1.2);
      ctx.fillRect(x, horizon - h, 1, h);
    }
  }

  /** A shadow on the grass at a prop's feet, offset right because the light in
   *  this world comes from the top left (`content/props.ts` house rules).
   *
   *  THIS IS THE COHESION FIX, and it is worth saying why a two-pixel smear is:
   *  the scene read as disjointed — a set of separate drawings arranged on a
   *  green background rather than one place. Everything in it was cut out with
   *  the same ink and set down with no contact anywhere, so nothing agreed
   *  about where the ground was. A shadow is the cheapest possible statement
   *  that two objects are standing on the same floor, and once the hall, the
   *  barn, the board and the trees all make it, they stop being stickers.
   *
   *  Deliberately NOT under the flowers and grass tufts. They are a few pixels
   *  tall; a shadow as long as the plant is a plant lying next to its own
   *  silhouette. */
  private shadow(cx: number, baseY: number, width: number): void {
    const { ctx } = this;
    const w = Math.round(width);
    ctx.fillStyle = GRASS_SHADE;
    ctx.fillRect(Math.round(cx - w / 2) + 2, Math.round(baseY) - 2, w, 2);
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
    const w = propSize("fence").w * SCENE_SCALE;
    // Stepped across the SCENE's x, starting at zero and marching: posts stay
    // evenly spaced across the whole run instead of restarting against a
    // building, and the rail is continuous by construction.
    for (let x = 0; x < lw + w; x += w) {
      drawProp(ctx, "fence", x + w / 2, horizon + 5, SCENE_SCALE);
    }
  }

  /** The hall on the left with its board beside it, the barn on the right.
   *
   *  The board is measured OFF THE HALL rather than placed at its own fraction
   *  of the width. At a fraction it drifted away from the building as the
   *  window got wider, and a notice board belongs to the building it stands
   *  outside of — the gap between them has to stay the same gap.
   *
   *  And it draws at 1× while the hall draws at 2×, which is the one place a
   *  size difference is doing real work: a board rendered at the building's
   *  scale came out two-thirds the height of the town hall, which is not a
   *  notice board, it is a billboard. Small next to the door is what makes the
   *  hall read as a building rather than as a shed behind a sign.
   *
   *  The board stands DOWN IN THE FIELD rather than up on the horizon beside
   *  the hall's wall, and that is the card's doing. Beside the hall it is in
   *  the middle third of the screen, which is exactly where the welcome card
   *  is — it vanished behind it completely. Forward and to the right, it clears
   *  the card's bottom edge and still plainly belongs to the building behind
   *  it. If the card ever gets narrower, this can move back up.
   *
   *  Hall and barn are pushed OUT to the thirds for the same reason: the card
   *  is centred, so the middle of this picture is not available. */
  private drawBuildings(horizon: number): void {
    const { ctx, lw } = this;
    const hallX = lw * HALL_X;
    const barnX = lw * BARN_X;
    const hallHalf = (propSize("townhall").w * SCENE_SCALE) / 2;
    const boardHalf = propSize("board").w / 2;
    // Tucked in against the hall's near corner — the gap is NEGATIVE, so the
    // board's left edge sits just inside the line of the wall above it. It
    // still cannot touch the building: the board stands further down the field,
    // so it is entirely below the hall's footings.
    //
    // Back far enough that the board's top half crosses the hall's wall, which
    // is allowed and is the point: a board standing clear of the building in an
    // empty stretch of grass looks like it belongs to nobody. Overlapping it
    // ties the two together, and the near-corner x offset is negative for the
    // same reason.
    //
    // It cannot go much further back than this. The board came down into the
    // field in the first place because up at the horizon it sat behind the
    // welcome card entirely; what keeps it visible now is mostly the x offset —
    // it stands left of the card's edge, with only its right sliver behind it.
    const boardX = hallX + hallHalf + boardHalf - 4;
    const boardBase = horizon + this.field * 0.2;

    this.shadow(hallX, horizon + 6, hallHalf * 2);
    this.shadow(barnX, horizon + 6, propSize("barn").w * SCENE_SCALE);
    drawProp(ctx, "townhall", hallX, horizon + 6, SCENE_SCALE);
    drawProp(ctx, "barn", barnX, horizon + 6, SCENE_SCALE);
    this.shadow(boardX, boardBase, boardHalf * 2);
    drawProp(ctx, "board", boardX, boardBase, 1);
  }

  /** The tilled plot: soil, furrows, and a row of seedlings somebody has
   *  already got in.
   *
   *  Directly IN FRONT OF THE BARN, centred on it and a little wider. A plot
   *  and the building it belongs to are one idea — put them on opposite sides
   *  of the picture and they become two unrelated things, and the eye has to
   *  pick which half of the screen is the subject. Centred is what makes it
   *  read as the barn's plot rather than as a plot that happens to be near it,
   *  which is why the width is measured off the barn instead of guessed. */
  private drawPlot(horizon: number): void {
    const { ctx, lw } = this;
    const half = (propSize("barn").w * SCENE_SCALE) / 2 + 3;
    const x0 = Math.round(lw * BARN_X - half);
    const x1 = Math.round(lw * BARN_X + half);
    const y0 = Math.round(horizon + this.field * 0.2);
    const y1 = Math.round(horizon + this.field * 0.42);
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

    // Seedlings laid out INSIDE a margin, rather than marched from one edge
    // until they run out of soil.
    //
    // The march was the bug: the front row stepped while `x < x1`, which lets a
    // sprout start half a sprite from the edge, and the back row was drawn at
    // `x + step / 2`, which walks past `x1` outright. Both put sprouts over the
    // grass beyond the plot, where the soil ending mid-leaf reads as a sprout
    // with a bite taken out of it.
    //
    // Now the columns are fitted to the space that is actually available: the
    // margin is half a sprite plus a pixel at each end, the count comes from
    // what fits in what's left, and the back row is offset by HALF A GAP so it
    // sits between the front ones and stops short of the last column.
    const seedHalf = Math.ceil(propSize("seedling").w / 2) + 1;
    const first = x0 + seedHalf;
    const usable = x1 - seedHalf - first;
    const cols = Math.max(2, Math.floor(usable / 11) + 1);
    const gap = usable / (cols - 1);
    for (let i = 0; i < cols; i++) {
      drawProp(ctx, "seedling", first + gap * i, y1 - 2);
    }
    for (let i = 0; i < cols - 1; i++) {
      drawProp(ctx, "seedling", first + gap * (i + 0.5), y1 - 8);
    }
  }

  /** A stream across the near field.
   *
   *  It is here to fill the dead lawn between the board and the bottom edge —
   *  the composition's weight was all along the horizon and the front half of
   *  the picture was an empty green rectangle. A stream is the right thing to
   *  put there rather than more scattered props: it crosses the whole width, so
   *  it ties the left half of the scene to the right half instead of adding two
   *  more unrelated objects to a picture that already read as disjointed.
   *
   *  DRAWN PER COLUMN, with both banks wandering off a sum of sines taken from
   *  the scene's own x. That is the same trick as the treeline and the same
   *  reason: a bank stepped off anything cell-shaped would repeat, and the eye
   *  finds a repeat in water instantly. The two edges use different frequencies
   *  and offsets so the stream also changes width as it goes — banks that
   *  wobble in step are a ribbon, not a stream.
   *
   *  Pale at both banks, deep in the middle, which is `SHALLOW` and `WATER` from
   *  the tile table doing exactly what they do in the world. */
  private drawStream(horizon: number): void {
    const { ctx, lw, field } = this;
    // Both banks have to stay ON SCREEN. Run the near bank past about 0.86 and
    // the water reaches the bottom edge, which reads as the scene ending in a
    // lake rather than as a stream crossing a field — you need grass under it
    // for it to be a bank at all.
    const top = horizon + field * 0.7;
    const bottom = horizon + field * 0.85;
    for (let x = 0; x < lw; x++) {
      const y0 = Math.round(top + Math.sin(x * 0.07) * 1.5 + Math.sin(x * 0.021) * 2.2);
      const y1 = Math.round(bottom + Math.sin(x * 0.055 + 2.1) * 1.7 + Math.sin(x * 0.017 + 0.7) * 2.4);
      ctx.fillStyle = SHALLOW;
      ctx.fillRect(x, y0, 1, y1 - y0);
      // The deep channel, inset from each bank by the wadeable margin.
      ctx.fillStyle = WATER;
      ctx.fillRect(x, y0 + 2, 1, Math.max(0, y1 - y0 - 4));
    }
  }

  /** The scenery standing on the grass, back to front by depth — so a near
   *  tree overlaps a far one rather than the table's order deciding it. */
  private drawField(horizon: number): void {
    const { ctx, lw } = this;
    for (const s of [...SCATTER].sort((a, b) => a.depth - b.depth)) {
      const scale = isGroundCover(s.prop) ? GROUND_COVER_SCALE : SCENE_SCALE;
      const x = lw * s.x;
      const baseY = horizon + this.field * s.depth;
      // Only the trunk's worth, not the crown's — a shadow as wide as the
      // canopy is a shadow cast by a tree standing somewhere else.
      if (!isGroundCover(s.prop)) this.shadow(x, baseY, 7 * scale);
      drawProp(ctx, s.prop, x, baseY, scale);
    }
  }
}

/** Put a farm behind whatever the app is showing. */
export function mountTitleScene(parent: HTMLElement): TitleScene {
  return new TitleScene(parent);
}
