// Dev contact sheet for the pieces in src/content/furniture.ts — every piece,
// turned all four ways.
//
// Every card is drawn by the REAL renderer out of a REAL world, so this page
// draws exactly what the game draws and never a second copy of it. Edit
// furniture.ts, furnishings.ts or renderer.ts, save, and Vite reloads the sheet.
//
// THE INSTRUMENT IT REPLACES is scripts/shot-rotations.mjs, which answers the
// same question — does a piece survive being turned — by seeding a save,
// driving a browser and cropping PNGs. That costs about a minute per run and
// hands back flat pictures, which is the wrong loop for work whose whole shape
// is look, redraw, look again. Most of that script is also tile arithmetic:
// column and row spacing, a headroom fudge for the wardrobe (its art starts 1.6
// tiles above its anchor), hand-computed crop rectangles. None of that survives
// here, because every view is its OWN canvas aiming its OWN camera and CSS does
// the layout.
//
// The script stays. It still produces the record shots, and shot-showroom.mjs
// answers the other question (does the set hang together).
//
// WHAT THE CAPTIONS ARE FOR. Rotation is opt-in per piece — `gridFor()` falling
// back to the front view is the feature, not a bug (ROADMAP §Three pieces still
// borrow their north view). So the sheet does not flag a fallback as a defect;
// it NAMES the source under every view. Finding out that `desk` has no north
// grid used to mean reading furnishings.ts. Now the page says so, and the fix
// for a borrowed view is done when the label changes.
//
// BARE ON PURPOSE, the buildings sheet's argument. No finish picker, no zoom, no
// time slider: fixed at a summer midday with each piece in its default finish,
// which is the piece a player meets first.
//
// TWO THINGS IT CANNOT SHOW, deliberately:
//  - Lights unlit. `lamp`, `desklamp` and `fireplace` do their real work after
//    dark, and a midday sheet has no pool of light in it. This page is about
//    silhouettes and back panels; drive.mjs stays the instrument for glow.
//  - The roof sliver. Tall multi-tile furniture poking through its own roof
//    (ROADMAP §Known gaps) is a sort between a roof and the furniture under it,
//    and needs a real house. There are no rooms here at all — see `build` below.
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /furniture.html.

// Evict a stale service worker before anything else — a tool page has its own
// entry point, so main.ts's cleanup never runs here. See no-sw.ts.
import "./no-sw";
import { FURNITURE, footprint, type Facing, type FurnitureDef } from "../content/furniture";
import { FURNITURE_ART } from "../content/furnishings";
import { defaultSkin, skinDef, type SkinId } from "../content/skins";
import { FLOOR, type TileId } from "../content/tiles";
import { newWorld } from "../sim/game";
import { gridSource } from "../render/furnishings";
import { Renderer } from "../render/renderer";
import { zoomLadder } from "../render/zoom";
import type { BuildCell, WorldState } from "../sim/types";

/** Scene pixels per tile, matching the renderer's own. */
const TILE = 16;

/** Turning order, s → e → n → w, which is NOT content/furniture.ts's `FACINGS`.
 *  That list is picker order (s, w, n, e) and belongs to the rotate button. Read
 *  left to right, this row is the piece being turned one quarter at a time,
 *  which is the motion the eye is being asked to check. */
const VIEWS: Facing[] = ["s", "e", "n", "w"];

/** The one moment the sheet is set to.
 *
 *  A FIXED DATE, never `new Date()`, for the reason building-preview.ts gives at
 *  length: the renderer resolves its whole palette from `now`, so a page on the
 *  wall clock would show different furniture at breakfast and at midnight and
 *  every judgement made against it would be about the hour. Midsummer midday,
 *  drive.mjs's own pinned hour — full light, no night wash, the finishes at
 *  their own colours. */
const WHEN = new Date("2026-07-24T13:00:00").getTime();

/** The seed the ground is generated on. Nothing here stands on generated ground
 *  — the plot is floored over — so this only decides what the chunk generator
 *  puts under that floor. Fixed anyway, for the reason the clock is. */
const SEED = 3;

/** Tiles of bare floor around the piece, a half-tile each side.
 *
 *  A constant here would be wrong in both directions at once, which is what the
 *  first pass got: four tiles left the chair swimming in floor and was STILL
 *  only just enough for the wardrobe, whose art starts 1.6 tiles above its
 *  anchor. The box has to clear the ART, not the footprint, so the rest of the
 *  room comes off `height` — see `frame` in `piece()`. */
const MARGIN = 2;

/** How far west of the piece the player stands.
 *
 *  The camera has no aim of its own — it follows the player, and `panBy` is the
 *  only way to move it off them. So the player has to BE somewhere, and on a
 *  sheet of small objects a creature the size of the chair is not a scale
 *  reference, it is the subject. Standing them five tiles west puts them outside
 *  even the widest card (a 2-tile piece frames six tiles, so three from centre)
 *  while staying inside `panLimit`, which is 1.25 screens and therefore only
 *  about six tiles at this box size. Far enough to be gone, near enough that the
 *  pan does not clamp. */
const PLAYER_WEST = 5;

/** Where every piece stands. ALL OF THEM, at the same coordinate — see `build`
 *  in `card()`: each card gets its own world, so ninety-six pieces can share one
 *  tile and no card can ever catch its neighbour's art at the edge of frame.
 *  That is the whole reason this page needs no spacing constants. */
const ORIGIN = { x: 0, y: 0 };

/** The floor under the piece. One patch, shared by every card, big enough for
 *  the widest frame plus the player's tile. */
const PLOT = 8;

interface Card {
  world: WorldState;
  renderer: Renderer;
  /** Does anything in this card MOVE? True for the fireplace and nothing else —
   *  see `frame()`. */
  live: boolean;
}

const cards: Card[] = [];
const sheet = document.getElementById("sheet")!;
const scale = document.getElementById("scale")!;

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Where this view's art comes from, in words — the sheet's whole point.
 *
 *  The decision belongs to `gridSource` in render/furnishings.ts, beside the
 *  `gridFor` it describes and under a test that keeps the two honest. All this
 *  does is phrase it: "front" reads differently under the front view, where it
 *  is the definition, than under a north that fell back to it. */
function source(def: FurnitureDef, facing: Facing): string {
  const art = FURNITURE_ART[def.id];
  // The four pieces with no row in the art table at all — lamp, noticeboard,
  // stage, awning — are drawn by bespoke paths in renderer.ts rather than from a
  // char grid. Saying "front view" of those would be a lie about a piece that
  // has no grids to fall back between.
  if (!art) return "drawn by renderer";
  switch (gridSource(art, facing)) {
    case "own":
      return "own grid";
    case "mirrored-e":
      return "mirrored e";
    default:
      return facing === "s" ? "front" : "front view";
  }
}

/** The flags worth reading off the table, as a line. Only the ones that are SET
 *  — a caption listing "not flat, not a light, not wall-mounted" under every
 *  piece is a table of absences. */
function flags(def: FurnitureDef): string {
  const bits: string[] = [def.solid ? "solid" : "walk-through"];
  if (def.flat) bits.push("flat");
  if (def.light) bits.push("light");
  if (def.mount === "wall") bits.push("wall-mounted");
  if (def.backs === "wall") bits.push("backs a wall");
  if (def.hearth) bits.push("hearth");
  return bits.join(" · ");
}

/** What it costs, in words. An empty cost is the town's own furniture — the
 *  notice board and the stage, which nothing sells (content/furniture.ts). */
function price(def: FurnitureDef): string {
  const bits = Object.entries(def.cost).map(([mat, n]) => `${n} ${mat}`);
  return bits.length ? bits.join(", ") : "not for sale";
}

/** The wall a piece needs behind it, if it needs one.
 *
 *  Three rows in the table are about a wall and shot-rotations.mjs simply skips
 *  all of them, because seeding a wall through the driver is awkward. A page
 *  that builds its own world gets them for free, which is the one place this
 *  sheet is more complete than the script it replaces.
 *
 *  A RUN OF THREE, never a single cell: walls draw against their neighbours, so
 *  one on its own is a post and the piece would be judged against the wrong
 *  thing. Never enclosed, so `rooms()` finds nothing and no roof is derived — a
 *  roof over the card would be the cutaway problem the buildings sheet warns
 *  about, on a page with no player in frame to trigger it. */
function backing(def: FurnitureDef): Record<string, BuildCell> {
  const build: Record<string, BuildCell> = {};
  const finish = defaultSkin("wood");
  if (def.mount === "wall") {
    // The piece hangs on the FACE of a wall cell, so the wall is at the anchor
    // itself and not behind it. The window box gets an actual sash under it,
    // which is what its row says it is for: `build` and `furniture` are separate
    // maps, so the window and the box share one coordinate.
    for (let dx = -1; dx <= 1; dx++) {
      const id = dx === 0 && def.id === "windowbox" ? "window" : "wall";
      build[tileKey(ORIGIN.x + dx, ORIGIN.y)] = { id, finish };
    }
  }
  if (def.backs === "wall") {
    // North of its northernmost row, and one cell wider each side so the piece
    // is seen against a wall rather than plugging a gap in one.
    for (let dx = -1; dx <= def.w; dx++) {
      build[tileKey(ORIGIN.x + dx, ORIGIN.y - 1)] = { id: "wall", finish };
    }
  }
  return build;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Tiles across a scale-strip card. One number for every piece, which is the
 *  whole point — five fits the deepest footprint (2) plus the tallest art (a
 *  wardrobe reaches about 2.6 tiles) with air around it. */
const SCALE_BOX = 5;

/** One piece, front-on, in the shared box.
 *
 *  AIMED AT THE ANCHOR CELL AND NOT AT THE FOOTPRINT'S CENTRE, and NOT lifted by
 *  the art's rise — both of which the sheet below does and both of which would
 *  defeat this. Aiming at a footprint centre puts a 2×2 piece's floor line half a
 *  tile below a 1×1's, and lifting by rise moves every piece a different amount;
 *  either way you end up comparing two pictures that were framed differently.
 *  Anchor-centred, unlifted, one box: the grid lines and the floor land in the
 *  same place on every card, so a stool really is narrower than a chair or it
 *  is not. */
function scaleCard(base: WorldState, overrides: Record<string, TileId>, def: FurnitureDef): void {
  const card = el("figure", "piece");
  const box = SCALE_BOX * TILE * 2;
  const px = TILE * 2;

  const canvas = el("canvas", "shot") as HTMLCanvasElement;
  canvas.style.width = `${box}px`;
  canvas.style.height = `${box}px`;

  const plate = el("div", "plate");
  plate.style.width = `${box}px`;
  plate.style.height = `${box}px`;
  const gridEl = el("div", "grid");
  const ax = box / 2 - px / 2;
  gridEl.style.backgroundSize = `${px}px ${px}px`;
  gridEl.style.backgroundPosition = `${ax}px ${ax}px`;
  const foot = el("div", "foot");
  foot.style.left = `${ax}px`;
  foot.style.top = `${ax}px`;
  foot.style.width = `${def.w * px}px`;
  foot.style.height = `${def.h * px}px`;
  plate.append(canvas, gridEl, foot);

  const cap = el("figcaption", "facing");
  cap.append(el("span", "letter", def.name), el("span", "src", `${def.w}×${def.h}`));
  card.append(plate, cap);
  scale.append(card);

  const finish = defaultSkin(def.finishes[0]);
  const world: WorldState = {
    ...base,
    overrides,
    build: backing(def),
    furniture: { [tileKey(ORIGIN.x, ORIGIN.y)]: { id: def.id, facing: "s", finish, set: "core" } },
    underFurniture: {},
    finishes: {},
    crops: {},
    villagers: [],
    player: { ...base.player, x: ORIGIN.x - PLAYER_WEST, y: ORIGIN.y, target: null },
  };
  const renderer = new Renderer(canvas);
  renderer.setChrome(false);
  const ladder = zoomLadder(box, TILE);
  const flat = ladder.lastIndexOf(2);
  renderer.setZoomStep(flat >= 0 ? flat : ladder.length - 1);
  renderer.panBy(ORIGIN.x - world.player.x, ORIGIN.y - world.player.y);
  renderer.snapCamera(world);
  cards.push({ world, renderer, live: FURNITURE_ART[def.id]?.anim !== undefined });
}

function build(): void {
  // ONE base world. The chunk generator's cache lives on it, so every card
  // shares the ground under the floor rather than generating it ninety-six
  // times. Each card takes a shallow copy and replaces the layers it cares
  // about; see `card()`.
  const base = newWorld({ name: "Preview", form: "blob", spot: "riverside", seed: SEED });

  // The floor, once, shared by reference. A fresh map rather than an edit of
  // `base.overrides`: the town is stamped into that one, and a sheet of
  // furniture should not be able to inherit a paving stone from it.
  const overrides: Record<string, TileId> = {};
  for (let x = ORIGIN.x - PLOT; x <= ORIGIN.x + PLOT; x++)
    for (let y = ORIGIN.y - PLOT; y <= ORIGIN.y + PLOT; y++) overrides[tileKey(x, y)] = FLOOR;

  // THE SCALE STRIP FIRST, ordered by footprint and then by how wide the piece is
  // actually drawn — which puts the pieces that ought to be compared next to each
  // other and is how a stool being wider than a chair becomes visible instead of
  // being two cards apart.
  const drawnWidth = (def: FurnitureDef): number => {
    const rows = FURNITURE_ART[def.id]?.s.rows;
    if (!rows) return def.w * TILE;
    let lo = Infinity;
    let hi = -1;
    for (const row of rows) {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === ".") continue;
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
    return hi < 0 ? 0 : hi - lo + 1;
  };
  const byScale = Object.values(FURNITURE)
    .filter((d) => d.mount !== "wall")
    .sort((a, b) => a.w * a.h - b.w * b.h || drawnWidth(a) - drawnWidth(b));
  for (const def of byScale) scaleCard(base, overrides, def);

  // Table order, which is the order content/furniture.ts reads in — the file
  // groups the furnishing pass by what a piece is FOR (seating, surfaces,
  // storage, light), and that grouping is worth keeping on the page.
  for (const def of Object.values(FURNITURE)) {
    const piece = el("figure", "piece");
    const head = el("figcaption", "head");
    head.append(
      el("strong", "name", def.name),
      el("span", "note", `${def.w}×${def.h} · ${def.height}px`),
    );
    const finish = defaultSkin(def.finishes[0]);
    const lines = el("div", "lines");
    lines.append(
      el("div", "note", `${skinDef(finish).name} · ${flags(def)}`),
      el("div", "note", `${def.id} · ${price(def)}`),
    );
    const row = el("div", "row");
    piece.append(head, lines, row);
    sheet.append(piece);

    // Sized from the LARGER dimension, so all four views share one box.
    // Sizing each view to its own footprint would jostle the row every time a
    // piece swapped w and h, and "it got wider when I turned it" is a thing to
    // SEE in the art rather than in the frame around it.
    //
    // Plus the art's own rise, rounded up to a tile: a piece stands UP from its
    // footprint, so the tall ones need the room above and the low ones do not.
    // This is what keeps a 1px rug and a 26px wardrobe on comparable boxes
    // instead of one constant that suits neither.
    const rise = def.height / TILE;
    const span = Math.max(def.w, def.h) + MARGIN + Math.ceil(rise);
    for (const facing of VIEWS) card(row, base, overrides, def, facing, span, rise, finish);
  }
}

/** One view: a canvas, its camera, and the label saying where its art came
 *  from. Appends itself, because the renderer has to measure a canvas that is
 *  already in the document — `resize()` reads `clientWidth` and an unattached
 *  canvas measures zero. */
function card(
  row: HTMLElement,
  base: WorldState,
  overrides: Record<string, TileId>,
  def: FurnitureDef,
  facing: Facing,
  span: number,
  rise: number,
  finish: SkinId,
): void {
  // The same aim `panBy` below uses, needed up here for the overlay too.
  const mid = (Math.max(def.w, def.h) - 1) / 2;
  const view = el("figure", "view");
  const canvas = el("canvas", "shot") as HTMLCanvasElement;
  // The CSS box is what decides the framing: `resize()` reads it and divides by
  // an integer scale, so the tile count falls out of the box rather than being
  // multiplied by a fraction (CLAUDE.md §Sprite rendering — a non-integer scale
  // resamples pixel art off the grid).
  canvas.style.width = `${span * TILE * 2}px`;
  canvas.style.height = `${span * TILE * 2}px`;
  const cap = el("figcaption", "facing");
  cap.append(el("span", "letter", facing), el("span", "src", source(def, facing)));

  // THE GRID THE PIECE ACTUALLY OCCUPIES, laid over the canvas rather than drawn
  // into the world — the world must keep looking like the game, and a tile grid
  // ruled onto the floor is the per-cell edges rule committed on purpose.
  //
  // The maths is the camera's, run backwards. `card()` aims at the footprint's
  // centre lifted by half the art's rise, so the anchor tile's top-left sits at
  // the canvas centre minus that offset, minus half a tile. Everything else
  // follows at the 32px pitch (TILE at scale 2).
  const box = span * TILE * 2;
  const px = TILE * 2;
  const fp = footprint(def, facing);
  const ax = box / 2 - mid * px - px / 2;
  const ay = box / 2 + (rise / 2 - mid) * px - px / 2;

  const plate = el("div", "plate");
  plate.style.width = `${box}px`;
  plate.style.height = `${box}px`;
  const grid = el("div", "grid");
  // Anchored to the piece's own tile, so the lines land where the game's cells
  // do rather than wherever the canvas happens to start.
  grid.style.backgroundSize = `${px}px ${px}px`;
  grid.style.backgroundPosition = `${ax}px ${ay}px`;
  const foot = el("div", "foot");
  foot.style.left = `${ax}px`;
  foot.style.top = `${ay}px`;
  foot.style.width = `${fp.w * px}px`;
  foot.style.height = `${fp.h * px}px`;
  plate.append(canvas, grid, foot);

  view.append(plate, cap);

  // EVERY LAYER REPLACED, not edited. A shallow copy of the base world would
  // carry the whole town's build map, which costs ninety-six flood fills in
  // `rooms()` for scenery that is never in frame — and risks a town roof or a
  // stray sash turning up in a card. What a card needs is one piece, its wall if
  // it has one, and floor.
  const world: WorldState = {
    ...base,
    overrides,
    build: backing(def),
    furniture: { [tileKey(ORIGIN.x, ORIGIN.y)]: { id: def.id, facing, finish, set: "core" } },
    underFurniture: {},
    finishes: {},
    crops: {},
    villagers: [],
    player: { ...base.player, x: ORIGIN.x - PLAYER_WEST, y: ORIGIN.y, target: null },
  };

  // Attached BEFORE the renderer is made, so the canvas has a measurable box.
  row.append(view);

  const renderer = new Renderer(canvas);
  renderer.setChrome(false);
  // Scale 2, the ladder's rung for a box this size. Asked for by VALUE rather
  // than by index, so a change to ZOOM_TARGETS cannot quietly restage the sheet.
  const ladder = zoomLadder(span * TILE * 2, TILE);
  const flat = ladder.lastIndexOf(2);
  renderer.setZoomStep(flat >= 0 ? flat : ladder.length - 1);
  // Off the player and onto the piece, aimed with the UNTURNED span in both
  // axes. Facing-independent on purpose: the four views share an aim point, so
  // the row lines up and a piece that grows when turned grows against a fixed
  // frame rather than being re-centred to hide it.
  //
  // Lifted by half the art's rise, so the piece sits in the middle of the box
  // rather than the tile it stands on doing. Aiming at the footprint leaves a
  // band of empty floor under a tall piece and crops its top.
  renderer.panBy(ORIGIN.x + mid - world.player.x, ORIGIN.y + mid - rise / 2 - world.player.y);
  renderer.snapCamera(world);
  cards.push({ world, renderer, live: FURNITURE_ART[def.id]?.anim !== undefined });
}

/** How many frames a still card is drawn for before it is left alone.
 *
 *  Not one: the world generates its chunks lazily, so the first frame of a card
 *  can land before there is any ground under the piece. A second of drawing is
 *  far longer than that takes and costs nothing on a page you have only just
 *  opened. */
const SETTLE = 60;
let drawn = 0;

/** Ninety-six canvases, where the buildings sheet has seven — and drawing them
 *  all every frame ran the page at 20fps.
 *
 *  So a card is redrawn every frame only if something in it MOVES, which here
 *  means the fire in the fireplace (content/furnishings.ts §fireplace §anim) and
 *  nothing else. There is no grass on a floored plot, no weather, no villagers,
 *  and the player is off frame; a chair drawn twice is the same chair. The rest
 *  are drawn for `SETTLE` frames and then left as pictures.
 *
 *  Nothing invalidates a settled card. Each canvas is sized in fixed px, so a
 *  window resize cannot restage one, which is the usual reason a cached view
 *  goes stale. Editing the art reloads the whole page — that is Vite's job and
 *  the reason the sheet exists. */
function frame(): void {
  const settling = drawn < SETTLE;
  for (const c of cards) {
    if (!settling && !c.live) continue;
    c.renderer.snapCamera(c.world); // no follow: each card is a fixed shot
    c.renderer.draw(c.world, WHEN);
  }
  drawn++;
  requestAnimationFrame(frame);
}

build();
frame();
