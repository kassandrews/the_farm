// Dev contact sheet for the creature variants in src/content/looks.ts.
//
// It draws the REAL table through the REAL renderer — no copy of the art, no
// approximation of the palette — so what is on this page is what is in the
// game. Edit looks.ts, save, and Vite reloads the sheet: that loop is the whole
// point, because a tint pair or an accessory recolour can only be judged by
// looking at it (CLAUDE.md §Sprite rendering).
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /looks.html.

// Evict a stale service worker before anything else — a tool page has its own
// entry point, so main.ts's cleanup never runs here. See no-sw.ts.
import "./no-sw";
import { FORMS, type AdultForm } from "../content/canon/forms";
import { LOOKS, type LookDef } from "../content/looks";
import { CELL, type Mood, type SpriteFrame } from "../content/canon/sprites";
import { SpriteCache } from "../render/sprites";

const cache = new SpriteCache();

const MOODS: Mood[] = ["neutral", "happy", "sad", "sleep"];
const FRAMES: SpriteFrame[] = ["base", "blink", "glanceL", "glanceR", "alt"];

/** Backdrops worth judging against: the grass a resident actually stands on,
 *  a dirt path, the night wash, and a flat neutral for reading pixels. */
const BACKDROPS: Record<string, string> = {
  grass: "#6f9b58",
  dirt: "#9b7f5a",
  night: "#3a3557",
  neutral: "#2b2540",
  paper: "#e8e2d4",
};

const state = {
  mood: "neutral" as Mood,
  frame: "base" as SpriteFrame,
  scale: 8,
  backdrop: "grass",
};

/** Integer scale only. Non-integer scaling resamples pixel art off the grid,
 *  which is the bug this page exists to help catch, not cause. */
function drawLook(canvas: HTMLCanvasElement, form: AdultForm, look: LookDef): void {
  const s = state.scale;
  canvas.width = CELL * s;
  canvas.height = CELL * s;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BACKDROPS[state.backdrop];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // The game's own bake path, so a variant is judged on the pixels the game
  // will actually draw — not a second implementation that could drift.
  const src = cache.frame(form, state.mood, state.frame, look);
  ctx.drawImage(src, 0, 0, CELL, CELL, 0, 0, canvas.width, canvas.height);
}

/** What this row changes, in the words of the table: a tint pair, the letters a
 *  look recolours, or an overlay swap. Keeps the sheet honest about the
 *  one-axis rule — if a cell lists two axes, the row broke it. */
function describe(look: LookDef): string {
  const parts: string[] = [];
  if (look.fill) parts.push(`${look.fill} / ${look.shade ?? "—"}`);
  if (look.extra) parts.push(Object.entries(look.extra).map(([k, v]) => `${k} → ${v}`).join(", "));
  if (look.overlay) parts.push("overlay");
  return parts.join(" · ") || "as drawn";
}

const canvases: { canvas: HTMLCanvasElement; form: AdultForm; look: LookDef }[] = [];

function redraw(): void {
  for (const c of canvases) drawLook(c.canvas, c.form, c.look);
}

function control<T extends string>(
  label: string,
  values: readonly T[],
  current: T,
  onPick: (v: T) => void,
): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "control";
  wrap.append(label);
  const sel = document.createElement("select");
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    if (v === current) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener("change", () => {
    onPick(sel.value as T);
    redraw();
  });
  wrap.append(sel);
  return wrap;
}

function build(): void {
  const root = document.getElementById("sheet")!;
  root.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.append(
    control("mood", MOODS, state.mood, (v) => (state.mood = v)),
    control("frame", FRAMES, state.frame, (v) => (state.frame = v)),
    control("scale", ["4", "6", "8", "12"] as const, String(state.scale) as "8", (v) => (state.scale = Number(v))),
    control("backdrop", Object.keys(BACKDROPS), state.backdrop, (v) => (state.backdrop = v)),
  );
  root.append(bar);

  for (const form of Object.keys(LOOKS) as AdultForm[]) {
    const def = FORMS[form];
    const section = document.createElement("section");

    const h = document.createElement("h2");
    h.textContent = `${def.name}`;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `${form} · ${LOOKS[form].length} variant${LOOKS[form].length === 1 ? "" : "s"}`;
    h.append(tag);
    section.append(h);

    const blurb = document.createElement("p");
    blurb.className = "blurb";
    blurb.textContent = def.blurb;
    section.append(blurb);

    const grid = document.createElement("div");
    grid.className = "grid";
    LOOKS[form].forEach((look, i) => {
      const cell = document.createElement("figure");
      const canvas = document.createElement("canvas");
      canvases.push({ canvas, form, look });
      cell.append(canvas);
      const cap = document.createElement("figcaption");
      cap.innerHTML = `<b>${look.id}</b><span>${describe(look)}</span>`;
      // Entry 0 is what the player and the institutions wear; nobody else can
      // roll it (looks.ts lookFor). Worth saying on the sheet, because editing
      // it edits the reference picture of the form.
      if (i === 0) cell.classList.add("canon");
      cell.append(cap);
      grid.append(cell);
    });
    section.append(grid);
    root.append(section);
  }
  redraw();
}

const style = document.createElement("style");
style.textContent = `
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #1b1728; color: #e8e2d4;
         font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  .bar { position: sticky; top: 0; z-index: 1; display: flex; gap: 16px; flex-wrap: wrap;
         padding: 12px 0 16px; margin-bottom: 8px; background: #1b1728;
         border-bottom: 1px solid #3a3557; }
  .control { display: flex; gap: 6px; align-items: center; text-transform: uppercase;
             letter-spacing: .08em; font-size: 11px; opacity: .8; }
  select { background: #2b2540; color: inherit; border: 1px solid #4a4468; border-radius: 4px;
           padding: 4px 6px; font: inherit; text-transform: none; letter-spacing: 0; }
  section { margin: 28px 0; }
  h2 { margin: 0 0 2px; font-size: 18px; display: flex; align-items: baseline; gap: 10px; }
  .tag { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; opacity: .55; }
  .blurb { margin: 0 0 14px; opacity: .55; font-style: italic; max-width: 60ch; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  canvas { border-radius: 6px; border: 1px solid #3a3557; display: block; }
  .canon canvas { border-color: #c8a24a; }
  figcaption { display: flex; flex-direction: column; font-size: 11px; max-width: 128px; }
  figcaption span { opacity: .5; word-break: break-word; }
`;
document.head.append(style);

build();
