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
import { OPTIONS } from "./tree-options";
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
import type { TreeShape } from "../content/biomes";

const TILE = 16;

/** Tiles between planted trees. Wide enough that a giant's crown (eight
 *  half-widths, so seventeen pixels — a whole tile plus) never touches its
 *  neighbour's: two trees whose canopies overlap are one blob, and the shape is
 *  the entire thing this page exists to look at. */
const SPACING = 7;

/** …except in a grove that is not seven tiles wide. THE GIANTS ARE A DISC OF
 *  RADIUS FIVE and `scatterSkin` answers "redwoods" one tile outside it, so a row
 *  laid out at the usual spacing puts most of its trees in the wrong region and
 *  they come back drawn as the wrong species under the right letter. Four still
 *  clears a giant's crown (eight half-widths is seventeen pixels, and four tiles
 *  is sixty-four). */
const SPACING_IN: Partial<Record<BiomeId, number>> = { giants: 4 };

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
  /** Show the PROPOSALS (tree-options.ts) as extra forms, lettered A onward.
   *  Off by default: the page's first job is still to show what the game draws. */
  options: false,
  /** Which slots to plant. THE GIANTS ARE WHY THIS EXISTS: their grove is a disc
   *  of radius five, so eleven tiles is the whole region and six trees will not
   *  stand in it — `scatterSkin` answers "redwoods" for anything further out and
   *  the tree would be drawn as the wrong species under the right letter. Three
   *  at a time fits, and two photographs is a cheaper answer than a rule about
   *  how big a grove has to be. */
  set: "all" as "all" | "abc" | "def",
};

/** Hang the candidate silhouettes off the region as extra `crownAlt` forms, or
 *  take them off again.
 *
 *  IT MUTATES `BIOMES`, WHICH IS ONLY ALL RIGHT BECAUSE THIS PAGE IS THE WHOLE
 *  DOCUMENT. `drawTree` reads `treeForms(def)` at draw time and there is no way
 *  to hand it a shape from outside — so a proposal can either be temporarily
 *  spliced into the table or authored twice, once as content and once as a
 *  drawing the tool does itself. The second is how a preview starts lying about
 *  the game (see the head of biome-preview.ts). The originals are put back on
 *  the way out, and nothing here is in the shipped bundle. */
function splice(on: boolean): void {
  for (const [id, opt] of Object.entries(OPTIONS)) {
    const def = BIOMES[id as BiomeId];
    if (!def) continue;
    if (on) {
      shipped[id] ??= def.crownAlt;
      def.crownAlt = opt.forms;
    } else {
      def.crownAlt = shipped[id];
    }
  }
}
const shipped: Record<string, TreeShape[] | undefined> = {};

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

/** Clear a band of ground and plant one tree of each form along it, evenly.
 *
 *  The form is a function of the TILE (`drawTree` hashes the coordinate), so the
 *  row cannot be composed — it has to be FOUND. For slot `i` the search wants a
 *  column whose form hash is `i`, close to where slot `i` belongs, and whose
 *  `scatterSkin` still says this species: a tree three tiles into the scrub is
 *  drawn as a scrub bush, and one of those in a row labelled "the redwoods" would
 *  be a lie.
 *
 *  TWO THINGS KEEP THE LINE STRAIGHT, and the first version had neither. It
 *  walked out from the ideal column as far as forty tiles, so a slot whose hash
 *  was uncooperative was answered by a tree most of a screen away — the row came
 *  out with a hole in the middle, two trees touching at one end, and every letter
 *  under the wrong trunk.
 *
 *  - The search is CAPPED at half the spacing, so a tree can never wander into
 *    its neighbour's slot. Unfilled is a better answer than misplaced: the card
 *    says "5/6 forms" and the missing letter is simply absent.
 *  - The ROW is chosen rather than given. Every row within a few tiles is scored
 *    by how many slots it can fill, and the best one wins. One row in five or six
 *    can seat the whole set, and the hashes are what decide which.
 */
function plant(
  world: WorldState,
  at: { x: number; y: number },
  id: BiomeId,
  show: number[],
): number[] {
  const forms = treeForms(BIOMES[id]);
  const gap = SPACING_IN[id] ?? SPACING;
  const reach = Math.floor(gap / 2);
  // Laid out over the slots being SHOWN, not over every form the region has, so
  // half a set still fills the card instead of huddling in the middle of it.
  const slot = (k: number): number =>
    at.x - Math.floor(((show.length - 1) * gap) / 2) + k * gap;

  /** Where each shown form could stand on this row, or undefined where none can.
   *  Indexed by FORM, so the letters stay right whichever half is on screen. */
  const seatOn = (row: number): (number | undefined)[] => {
    const seats: (number | undefined)[] = [];
    show.forEach((i, k) => {
      const ideal = slot(k);
      for (let d = 0; d <= reach; d++) {
        for (const x of d === 0 ? [ideal] : [ideal - d, ideal + d]) {
          if (formAt(world, x, row, forms.length) !== i) continue;
          if (scatterSkin(world.seed, world.homestead.spot, x, row).id !== id) continue;
          seats[i] = x;
          return;
        }
      }
    });
    return seats;
  };

  let row = at.y;
  let best = seatOn(row);
  let bestN = best.filter((x) => x !== undefined).length;
  for (let dy = 1; dy <= 6 && bestN < show.length; dy++) {
    for (const y of [at.y - dy, at.y + dy]) {
      const seats = seatOn(y);
      const n = seats.filter((x) => x !== undefined).length;
      if (n > bestN) {
        best = seats;
        bestN = n;
        row = y;
      }
    }
  }

  for (let y = row - CLEAR; y <= row + CLEAR; y++) {
    for (let x = at.x - CLEAR * 3; x <= at.x + CLEAR * 3; x++) {
      if (tileAt(world, x, y) !== GRASS) setTile(world, x, y, GRASS);
    }
  }
  const planted: number[] = [];
  best.forEach((x, i) => {
    if (x === undefined) return;
    setTile(world, x, row, TREE);
    planted[i] = x;
  });
  // The camera and the letters are both hung off the row the trees actually
  // landed on, not the one the region search handed us.
  at.y = row;
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
    // The canvas inside a clipping box: the bottom half of a strip is bare floor
    // (see `keep` below), and a card that is mostly floor compares nothing.
    const crop = document.createElement("div");
    crop.className = "crop";
    crop.append(canvas);
    card.append(crop, cap);
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
    // Which slots this pass plants — see §state.set.
    const all = forms.map((_, i) => i);
    const show =
      state.set === "all" || forms.length < 4
        ? all
        : state.set === "abc"
          ? all.slice(0, 3)
          : all.slice(3, 6);
    const spanX = Math.max(10, show.length * (SPACING_IN[id] ?? SPACING) + 4);
    // Camera centres on the player, so the player sits BELOW the row and the
    // strip is sized around that: enough sky over the row for the tallest tree.
    // The ground under it is CROPPED rather than not drawn — the camera has to
    // centre on something and the something has to stand clear of the trees
    // (`hideFactor`), so the canvas is symmetric and the card hides the half of
    // it that is nothing but floor.
    const above = Math.ceil(tallest / TILE) + 1;
    const spanY = (above + 2) * 2;


    const world: WorldState = {
      ...base,
      // Below the row, never level with it: `hideFactor` fades any tree that
      // stands BETWEEN the player and the camera, so a player on the row would
      // half-erase one of the trees this page exists to look at.
      player: { ...base.player, x: at.x + 0.5, y: at.y + 2, target: null },
    };
    const at_x = plant(world, at, id, show);
    // `plant` may have moved the row to one whose hashes seat the whole set, so
    // the camera follows it — the player was placed off the row we asked for.
    world.player = { ...world.player, y: at.y + 2 };
    const n = at_x.filter((x) => x !== undefined).length;
    note.textContent = `${n}/${show.length} · ${at.x}·${at.y}`;

    // A LETTER UNDER EACH TREE, so a choice can be made out loud. Positioned off
    // the same arithmetic the camera uses — the view is centred on the player,
    // who stands at `at.x + 0.5` — rather than by spacing the letters evenly:
    // the planting search sags a column either way when the form hashes are
    // uncooperative, and a label a tile off its tree is worse than none.
    const strip = document.createElement("div");
    strip.className = "letters";
    card.append(strip);

    const r = new Renderer(canvas);
    r.setChrome(false);
    const c: Card = { id, world, renderer: r, canvas };

    // THE RENDERER PICKS THE SCALE, NOT THIS PAGE, and pretending otherwise put
    // every letter under the wrong tree. `resize()` reads the CSS box and takes
    // an integer off the zoom ladder (render/zoom.ts) — which aims for about
    // eleven tiles on the SHORT edge — so a wide, short strip asked for at 4×
    // came back drawn at 5× with a quarter fewer tiles in it than it was sized
    // for. drive.mjs's header has carried the same warning for months: the tile
    // size is not fixed, read it off the renderer.
    //
    // So: ask for a box, then walk DOWN the ladder until the view is tall enough
    // to hold the tallest tree, and take the scale it settles on as the truth.
    canvas.style.height = `${spanY * TILE * state.scale}px`;
    canvas.style.width = `${spanX * TILE * state.scale}px`;
    r.resize();
    const boxH = canvas.clientHeight;
    for (let step = 0; step < r.zoomStepCount(); step++) {
      r.setZoomStep(step);
      if (boxH / r.pxPerTile() >= spanY) break;
    }
    const px = r.pxPerTile();
    canvas.style.width = `${Math.round(spanX * px)}px`;
    r.resize();
    crop.style.width = `${Math.round(spanX * px)}px`;
    crop.style.height = `${Math.round((above + 3) * px)}px`;
    strip.style.width = `${Math.round(spanX * px)}px`;
    at_x.forEach((tx, i) => {
      if (tx === undefined) return;
      const tag = document.createElement("span");
      tag.textContent = String.fromCharCode(65 + i);
      tag.style.left = `${Math.round((tx - (at.x + 0.5)) * px + (spanX * px) / 2)}px`;
      strip.append(tag);
    });
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

const setSel = document.createElement("select");
for (const [v, l] of [
  ["all", "all six"],
  ["abc", "A–C"],
  ["def", "D–F"],
] as const) {
  setSel.append(new Option(l, v));
}
setSel.onchange = () => {
  state.set = setSel.value as typeof state.set;
  build();
};
control("Set", setSel);

const optToggle = document.createElement("input");
optToggle.type = "checkbox";
optToggle.checked = state.options;
optToggle.onchange = () => {
  state.options = optToggle.checked;
  splice(state.options);
  build();
};
control("Candidates", optToggle);

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
