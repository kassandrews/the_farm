// Dev contact sheet for the TREES in src/content/biomes.ts.
//
// The sibling of /biomes.html, aimed one level in. That page answers "what does
// this place look like"; this one answers "what does this tree look like", which
// is a different question and one the swatch is bad at: at thirteen tiles a
// region shows two or three trees, they land wherever the generator put them,
// and which FORM you get is whatever the tile hash rolled. A silhouette being
// tuned needs the opposite — every form of the species, side by side, on clean
// ground, at a size you can count pixels at.
//
// So this plants them. It finds the region, clears a band of it, and puts one
// tree of each form in a row, choosing the tile positions whose form hash lands
// on the form it wants (see `plant`). Everything else is the real thing: the
// real generator underneath, the real renderer drawing, the real per-region
// palette, bark and season.
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /trees.html.

// Evict a stale service worker before anything else — a tool page has its own
// entry point, so main.ts's cleanup never runs here. See no-sw.ts.
import "./no-sw";
import { BIOMES, treeForms, type BiomeId } from "../content/biomes";
import { newWorld } from "../sim/game";
import {
  biomeAt,
  blossomCentre,
  redwoodCentre,
  calderaCentre,
  staticCentre,
  scatterSkin,
  decoHash,
  setTile,
  tileAt,
} from "../sim/world";
import { GRASS, TREE } from "../content/tiles";
import { Renderer } from "../render/renderer";
import type { WorldState } from "../sim/types";

const TILE = 16;

/** Tiles between planted trees. Wide enough that a giant's crown (eight
 *  half-widths, so seventeen pixels — a whole tile plus) never touches its
 *  neighbour's: two trees whose canopies overlap are one blob, and the shape is
 *  the entire thing this page exists to look at. */
const SPACING = 4;

/** Tiles of clear ground around the row, so nothing the generator planted stands
 *  in the picture. */
const CLEAR = 8;

const CLOCKS: { id: string; label: string; at: string }[] = [
  { id: "summer", label: "Summer · noon", at: "2026-07-15T13:00:00" },
  { id: "autumn", label: "Autumn · noon", at: "2026-10-15T13:00:00" },
  { id: "winter", label: "Winter · noon", at: "2026-01-15T13:00:00" },
  { id: "dusk", label: "Summer · dusk", at: "2026-07-15T19:30:00" },
  { id: "night", label: "Summer · night", at: "2026-07-15T23:30:00" },
];

/** Which regions the sheet opens on. Every row is available in the picker; these
 *  are the ones being worked on. */
const DEFAULT: BiomeId[] = ["granite", "redwoods", "giants"];

const FAR = new Set<BiomeId>(["dusk", "glimmer", "glass", "granite", "cinder"]);

const state = {
  seed: 3,
  clock: "summer",
  scale: 3,
  only: new Set<BiomeId>(DEFAULT),
};

interface Card {
  id: BiomeId;
  world: WorldState | null;
  renderer: Renderer | null;
  canvas: HTMLCanvasElement;
}

/** Somewhere inside this region — biome-preview's search, trimmed. A tree page
 *  needs less margin than a swatch does, because the ground is about to be
 *  cleared anyway; what it does need is for the middle of the row to be far
 *  enough inside that `scatterSkin` still answers with this species. */
function findRegion(seed: number, id: BiomeId): { x: number; y: number } | null {
  const spot = "riverside" as const;
  if (id === "blossom") {
    const b = blossomCentre(seed, spot);
    return { x: Math.round(b.x), y: Math.round(b.y) };
  }
  if (id === "caldera") {
    for (let i = 0; i < 8; i++) {
      const c = calderaCentre(seed, spot, i);
      if (biomeAt(seed, spot, c.x, c.y) === "caldera") return { x: c.x, y: c.y + 8 };
    }
    return null;
  }
  if (id === "static") {
    for (let i = 0; i < 8; i++) {
      const c = staticCentre(seed, spot, i);
      if (biomeAt(seed, spot, c.x, c.y) === "static") return c;
    }
    return null;
  }
  if (id === "redwoods" || id === "giants") {
    for (let i = 0; i < 8; i++) {
      const c = redwoodCentre(seed, spot, i);
      if (biomeAt(seed, spot, c.x, c.y) === id) return c;
      if (id === "redwoods" && biomeAt(seed, spot, c.x + 12, c.y) === "redwoods") {
        return { x: c.x + 12, y: c.y };
      }
    }
    return null;
  }
  const from = FAR.has(id) ? 900 : 46;
  for (let r = from; r <= 1400; r += 6) {
    const steps = Math.max(24, Math.round(r / 2));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(r * Math.cos(a));
      const y = Math.round(r * Math.sin(a));
      if (biomeAt(seed, spot, x, y) !== id) continue;
      let ok = true;
      for (const [dx, dy] of [
        [-6, -6],
        [6, -6],
        [-6, 6],
        [6, 6],
      ]) {
        if (biomeAt(seed, spot, x + dx, y + dy) !== id) ok = false;
      }
      if (ok) return { x, y };
    }
  }
  return null;
}

/** Which form `drawTree` would give a tree standing here — the renderer's own
 *  arithmetic, quoted. If that salt ever changes this page silently starts
 *  labelling the wrong trees, which is why the two lines sit next to a comment
 *  saying so rather than being hidden behind a helper nobody would look at. */
function formAt(world: WorldState, x: number, y: number, count: number): number {
  return Math.floor(decoHash(x, y, world.seed ^ 0x1d4f) * count) % count;
}

/** Clear a band of ground and plant one tree of each form along it.
 *
 *  The form is a function of the TILE, so the row is built by search: for slot
 *  `i`, walk outward from the ideal column until a tile turns up whose form hash
 *  is `i` and whose `scatterSkin` still says this species. Both checks matter —
 *  a tree three tiles into the scrub is drawn as a scrub bush (see drawTree),
 *  and one of those in a row labelled "the redwoods" would be a lie. */
function plant(world: WorldState, at: { x: number; y: number }, id: BiomeId): number {
  const forms = treeForms(BIOMES[id]);
  const row = at.y;
  for (let y = row - CLEAR; y <= row + CLEAR; y++) {
    for (let x = at.x - CLEAR * 3; x <= at.x + CLEAR * 3; x++) {
      if (tileAt(world, x, y) !== GRASS) setTile(world, x, y, GRASS);
    }
  }
  let planted = 0;
  for (let i = 0; i < forms.length; i++) {
    const ideal = at.x - Math.floor(((forms.length - 1) * SPACING) / 2) + i * SPACING;
    for (let d = 0; d < 40; d++) {
      // Out from the ideal column in both directions, nearest first, so the row
      // stays evenly spaced when the hashes cooperate and only sags where they
      // don't.
      for (const x of d === 0 ? [ideal] : [ideal - d, ideal + d]) {
        if (formAt(world, x, row, forms.length) !== i) continue;
        if (scatterSkin(world.seed, world.homestead.spot, x, row).id !== id) continue;
        setTile(world, x, row, TREE);
        planted++;
        d = 99;
        break;
      }
    }
  }
  return planted;
}

const sheet = document.getElementById("sheet")!;
const cards: Card[] = [];

function clockNow(): number {
  return new Date((CLOCKS.find((c) => c.id === state.clock) ?? CLOCKS[0]).at).getTime();
}

function build(): void {
  sheet.innerHTML = "";
  cards.length = 0;
  const base = newWorld({ name: "Trees", form: "blob", spot: "riverside", seed: state.seed });

  for (const id of Object.keys(BIOMES) as BiomeId[]) {
    if (!state.only.has(id)) continue;
    const def = BIOMES[id];
    const forms = treeForms(def);
    const card = document.createElement("figure");
    card.className = "card";
    const canvas = document.createElement("canvas");
    canvas.className = "strip";
    const cap = document.createElement("figcaption");
    const note = document.createElement("span");
    note.className = "note";
    cap.append(Object.assign(document.createElement("strong"), { textContent: def.name }), note);
    card.append(canvas, cap);
    sheet.append(card);

    const at = findRegion(state.seed, id);
    if (!at) {
      note.textContent = "not on this seed";
      card.classList.add("absent");
      cards.push({ id, world: null, renderer: null, canvas });
      continue;
    }

    // The tallest form decides how much sky the strip needs; the row count and
    // the trunk are both per-form (content/biomes.ts §TreeShape), so this is the
    // same arithmetic drawTree does.
    const tallest = Math.max(
      ...forms.map(
        (f) => (f.trunkHeight ?? def.trunkHeight ?? 16) + f.rows.length - (f.overlap ?? 0),
      ),
    );
    const spanX = Math.max(10, forms.length * SPACING + 4);
    // Camera centres on the player, so the player sits BELOW the row and the
    // strip is sized around that: enough sky over the row for the tallest tree,
    // and as little ground under it as the centring allows.
    const above = Math.ceil(tallest / TILE) + 1;
    const spanY = (above + 2) * 2;

    const world: WorldState = {
      ...base,
      // Below the row, never level with it: `hideFactor` fades any tree that
      // stands BETWEEN the player and the camera, so a player on the row would
      // half-erase one of the trees this page exists to look at.
      player: { ...base.player, x: at.x + 0.5, y: at.y + 2, target: null },
    };
    const n = plant(world, at, id);
    note.textContent = `${n}/${forms.length} form${forms.length > 1 ? "s" : ""} · ${at.x}·${at.y}`;

    const r = new Renderer(canvas);
    r.setChrome(false);
    const c: Card = { id, world, renderer: r, canvas };
    canvas.style.width = `${spanX * TILE * state.scale}px`;
    canvas.style.height = `${spanY * TILE * state.scale}px`;
    r.resize();
    r.snapCamera(world);
    cards.push(c);
  }
}

function frame(): void {
  const now = clockNow();
  for (const c of cards) {
    if (!c.renderer || !c.world) continue;
    c.renderer.snapCamera(c.world);
    c.renderer.draw(c.world, now);
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
clockSel.onchange = () => {
  state.clock = clockSel.value;
};
control("When", clockSel);

const scaleSel = document.createElement("select");
for (const s of [2, 3, 4]) scaleSel.append(new Option(`${s}×`, String(s)));
scaleSel.value = String(state.scale);
scaleSel.onchange = () => {
  state.scale = Number(scaleSel.value);
  build();
};
control("Zoom", scaleSel);

const seedIn = document.createElement("input");
seedIn.type = "number";
seedIn.value = String(state.seed);
seedIn.onchange = () => {
  state.seed = Number(seedIn.value) || 0;
  build();
};
control("Seed", seedIn);

const pick = document.createElement("select");
pick.append(new Option("the three", "default"), new Option("every region", "all"));
for (const id of Object.keys(BIOMES) as BiomeId[]) pick.append(new Option(BIOMES[id].name, id));
pick.onchange = () => {
  const v = pick.value;
  state.only =
    v === "default"
      ? new Set(DEFAULT)
      : v === "all"
        ? new Set(Object.keys(BIOMES) as BiomeId[])
        : new Set([v as BiomeId]);
  build();
};
control("Show", pick);

build();
requestAnimationFrame(frame);

if (import.meta.hot) import.meta.hot.accept(() => build());
