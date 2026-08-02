// Dev contact sheet for the regions in src/content/biomes.ts.
//
// Every biome at once, through the REAL renderer and the REAL generator — no
// second drawing of a fern, no reimplementation of the field. Edit biomes.ts,
// save, and Vite reloads the sheet. That loop is the whole point: a tint, a
// crown silhouette and a decor mark can only be judged by looking, and the
// suite has been happy with every visual bug this file has ever shipped.
//
// It is the sibling of /looks.html and it exists for the same reason
// scripts/shot-biomes.mts does — but that one drives the game and photographs
// ONE region per run, so the regions could never be compared as a SET. Half the
// decisions here are relative: pinewood is dark against the birches, the scrub
// is parched against the meadow. A page that shows nine at once is a different
// instrument from nine screenshots.
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /biomes.html.
//
// THE GOTCHA IT INHERITS. shot-biomes.mts learned to photograph the MIDDLE of a
// region rather than its edge, and to check for water first — its first version
// photographed the ocean and reported it as the scrub. Both checks are below,
// and they matter more here because a swatch is small: an edge in one would be
// half a different biome and you would tune the wrong row.

import { BIOMES, type BiomeId } from "../content/biomes";
import { newWorld } from "../sim/game";
import { biomeAt, blossomCentre, generatedTile } from "../sim/world";
import { tileDef } from "../content/tiles";
import { Renderer } from "../render/renderer";
import type { WorldState } from "../sim/types";

/** Tiles across a swatch.
 *
 *  Tuned DOWN from 22 after looking: at 22 tiles and the smallest legal upscale
 *  a swatch is 700px, so the page became nine screenshots stacked in a column —
 *  which is exactly the instrument this was built to replace. A contact sheet
 *  has to fit on one screen or it is not comparing anything. Thirteen holds a
 *  tree with ground around it and three sit side by side. */
const SPAN = 13;

/** How far inside a region a swatch has to sit, in tiles. A swatch is SPAN
 *  wide, so anything less than half of that shows the border instead of the
 *  place. */
const MARGIN = Math.ceil(SPAN / 2) + 2;

/** How far out a swatch has to stand from the datum.
 *
 *  The meadow is the town's own region, so the honest nearest instance of it is
 *  the plaza — and the first run of this page put paving, the noticeboard and
 *  two villagers in the swatch labelled "the meadow". A region is its GROUND
 *  here; the town is a different page. */
const TOWN_CLEAR = 46;

/** The rows whose colour comes up with distance — sim/world.ts's `FAR_ROWS`,
 *  named again here rather than exported, because a preview page reaching into
 *  the generator for a private set is a coupling nobody wants to maintain. */
const FAR = new Set<BiomeId>(["dusk", "glimmer", "glass"]);

/** The clocks worth judging against. Season and day/night both come from `now`
 *  (the renderer resolves its whole palette from it), so this one control moves
 *  both — and a preview that lied about which month it was would be worse than
 *  no preview.
 *
 *  Fixed dates, never `new Date()`: two clocks for one fact is how the mailbox
 *  ended up with its flag up on an empty box. */
const CLOCKS: { id: string; label: string; at: string }[] = [
  { id: "spring", label: "Spring · noon", at: "2026-04-15T13:00:00" },
  { id: "summer", label: "Summer · noon", at: "2026-07-15T13:00:00" },
  { id: "autumn", label: "Autumn · noon", at: "2026-10-15T13:00:00" },
  { id: "winter", label: "Winter · noon", at: "2026-01-15T13:00:00" },
  { id: "dusk", label: "Summer · dusk", at: "2026-07-15T20:30:00" },
  { id: "night", label: "Summer · night", at: "2026-07-15T23:30:00" },
];

const state = {
  seed: 3,
  clock: "summer",
  zoom: 0,
};

interface Swatch {
  id: BiomeId;
  world: WorldState | null;
  at: { x: number; y: number } | null;
  renderer: Renderer | null;
  canvas: HTMLCanvasElement;
  note: HTMLElement;
}

/** Somewhere this region is, comfortably inside itself and out of the water.
 *
 *  Ring sampling rather than a spiral: the far country starts around 200 tiles
 *  out and can sit past 900, and walking every tile to it is millions of calls
 *  for a page that has to feel instant. Rings of increasing radius find the
 *  nearest instance of a rare region in a few thousand.
 *
 *  Returns null when a region simply is not on this seed within reach, which is
 *  a real answer and not a failure — the far rows are weighted, not placed. */
function findRegion(seed: number, id: BiomeId): { x: number; y: number } | null {
  const spot = "riverside" as const;

  // The blossom rows are a DISC of radius 9, which is smaller than the margin an
  // ordinary region is asked to clear — so the general search can never find
  // one and the page reported "not on this seed" for something sitting at a
  // known coordinate. A landmark is sited rather than rolled, so it is asked
  // where it is rather than searched for.
  if (id === "blossom") {
    const b = blossomCentre(seed, spot);
    return { x: Math.round(b.x), y: Math.round(b.y) };
  }
  const inside = (x: number, y: number): boolean => {
    if (Math.hypot(x, y) < TOWN_CLEAR) return false;
    if (biomeAt(seed, spot, x, y) !== id) return false;
    // The middle, not the edge — check the corners of the swatch too.
    for (const [dx, dy] of [
      [-MARGIN, -MARGIN],
      [MARGIN, -MARGIN],
      [-MARGIN, MARGIN],
      [MARGIN, MARGIN],
    ]) {
      if (biomeAt(seed, spot, x + dx, y + dy) !== id) return false;
    }
    // And dry. The fen is legitimately wet, so it only has to be dry underfoot.
    const wet = (x: number, y: number): boolean => {
      const d = tileDef(generatedTile(seed, spot, x, y));
      return d.name === "Water" || d.name === "Shallow water";
    };
    if (wet(x, y)) return false;
    if (id !== "fen" && (wet(x - 6, y) || wet(x + 6, y) || wet(x, y - 6) || wet(x, y + 6))) {
      return false;
    }
    return true;
  };

  // THE FAR ROWS ARE SEARCHED FROM THE PLATEAU, NOT FROM TOWN. Their tints come
  // UP with distance (`regionSkin` fades them by strangeness), so the nearest
  // instance of a dusk is the FAINTEST one there is — and the first run of this
  // page showed dusk, glimmer and glass as three ordinary green woods, which is
  // true and useless. The page exists to tune the row, so it shows the row at
  // its own character. STRANGE_TO is 900.
  const from = FAR.has(id) ? 900 : TOWN_CLEAR;
  for (let r = from; r <= 1400; r += 6) {
    const steps = Math.max(24, Math.round(r / 2));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(r * Math.cos(a));
      const y = Math.round(r * Math.sin(a));
      if (inside(x, y)) return { x, y };
    }
  }
  return null;
}

const sheet = document.getElementById("sheet")!;
const swatches: Swatch[] = [];

function build(): void {
  sheet.innerHTML = "";
  swatches.length = 0;

  // ONE world, shared. The generator is a total function of (seed, x, y) and the
  // chunk cache lives on the world, so nine swatches of the same seed should
  // share it rather than generate the same ground nine times. Each swatch gets a
  // shallow copy whose only difference is where the player is standing.
  const base = newWorld({ name: "Preview", form: "blob", spot: "riverside", seed: state.seed });

  for (const id of Object.keys(BIOMES) as BiomeId[]) {
    const card = document.createElement("figure");
    card.className = "card";

    const canvas = document.createElement("canvas");
    canvas.className = "swatch";
    const cap = document.createElement("figcaption");
    const note = document.createElement("span");
    note.className = "note";
    cap.append(
      Object.assign(document.createElement("strong"), { textContent: BIOMES[id].name }),
      note,
    );
    card.append(canvas, cap);
    sheet.append(card);

    const at = findRegion(state.seed, id);
    const s: Swatch = { id, at, world: null, renderer: null, canvas, note };

    if (!at) {
      // Not a failure. The far rows are weighted by distance rather than placed,
      // so a seed genuinely may not grow one within reach — and saying so is
      // more useful than drawing the wrong region under the right label.
      note.textContent = "not on this seed";
      card.classList.add("absent");
    } else {
      note.textContent = `${at.x} · ${at.y}${FAR.has(id) ? " · far" : ""}`;
      const world: WorldState = {
        ...base,
        // Stood in the middle of the swatch, which is how the camera gets
        // there — `draw` eases toward the player and `snapCamera` puts it on
        // them at once. The sprite stays visible on purpose: one creature at a
        // known size in every swatch is the only scale reference on the page,
        // and it is also the fastest way to see that a region has gone too dark
        // to read a resident against. The reticle goes, because that is a
        // promise about a button this page does not have.
        player: { ...base.player, x: at.x, y: at.y, target: null },
      };
      const r = new Renderer(canvas);
      r.setChrome(false);
      s.world = world;
      s.renderer = r;
      sizeSwatch(s);
    }
    swatches.push(s);
  }
}

/** Size a swatch to SPAN tiles at the current zoom step.
 *
 *  `resize()` reads the canvas's CSS box and picks an integer scale from it, so
 *  the CSS box is what decides the zoom — the same arrangement the game uses,
 *  and the reason nothing here multiplies by a fraction (CLAUDE.md §Sprite
 *  rendering: a non-integer scale resamples pixel art off the grid). */
function sizeSwatch(s: Swatch): void {
  if (!s.renderer || !s.world) return;
  const scale = [2, 3, 4][state.zoom];
  const px = SPAN * 16 * scale;
  s.canvas.style.width = `${px}px`;
  s.canvas.style.height = `${px}px`;
  s.renderer.resize();
  // Straight there. Easing across hundreds of tiles would generate every chunk
  // on the way past — see Renderer.snapCamera.
  s.renderer.snapCamera(s.world);
}

function frame(): void {
  const clock = CLOCKS.find((c) => c.id === state.clock) ?? CLOCKS[1];
  const now = new Date(clock.at).getTime();
  for (const s of swatches) {
    if (!s.renderer || !s.world) continue;
    s.renderer.snapCamera(s.world); // no follow here; the swatch is a still
    s.renderer.draw(s.world, now);
  }
  requestAnimationFrame(frame);
}

// --- Controls ----------------------------------------------------------------

const bar = document.getElementById("bar")!;

function control(label: string, el: HTMLElement): void {
  const wrap = document.createElement("label");
  wrap.append(Object.assign(document.createElement("span"), { textContent: label }), el);
  bar.append(wrap);
}

const clockSel = document.createElement("select");
for (const c of CLOCKS) clockSel.append(new Option(c.label, c.id));
clockSel.value = state.clock;
clockSel.onchange = () => (state.clock = clockSel.value);
control("When", clockSel);

const zoomSel = document.createElement("select");
for (const [i, l] of ["small", "medium", "large"].entries()) zoomSel.append(new Option(l, String(i)));
zoomSel.value = String(state.zoom);
zoomSel.onchange = () => {
  state.zoom = Number(zoomSel.value);
  for (const s of swatches) sizeSwatch(s);
};
control("Zoom", zoomSel);

const seedIn = document.createElement("input");
seedIn.type = "number";
seedIn.value = String(state.seed);
seedIn.onchange = () => {
  state.seed = Number(seedIn.value) || 0;
  build();
};
control("Seed", seedIn);

const reroll = document.createElement("button");
reroll.textContent = "Reroll";
// A shape that only looks right on one seed is not right — shot-biomes.mts's
// own note, and the reason this button is here rather than a fixed seed.
reroll.onclick = () => {
  state.seed = (Math.random() * 100000) | 0;
  seedIn.value = String(state.seed);
  build();
};
bar.append(reroll);

build();
requestAnimationFrame(frame);

// Vite hands back the new module on save; rebuilding picks up edited rows.
if (import.meta.hot) import.meta.hot.accept(() => build());
