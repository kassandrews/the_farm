// Dev contact sheet for src/content/tents.ts.
//
// It draws the REAL tent through render/tent.ts — the same function the game
// calls — so what is on this page is what is pitched in town. The reason it
// exists is that the table's whole rule is "every tent is the same tent", and
// a decoration that quietly changes the silhouette is invisible one at a time
// and obvious in a row of eleven.
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /tents.html.

// Evict a stale service worker before anything else — a tool page has its own
// entry point, so main.ts's cleanup never runs here. See no-sw.ts.
import "./no-sw";
import { FORMS, type AdultForm } from "../content/canon/forms";
import { TENTS } from "../content/tents";
import { drawTent } from "../render/tent";

/** The ground a tent is actually pitched on, plus a flat neutral for reading
 *  pixels. Pale ground matters: the canvas is off-white and has no outline, so
 *  sand is where it is most at risk of vanishing. */
const BACKDROPS: Record<string, string> = {
  grass: "#6f9b58",
  sand: "#d9c79a",
  plaza: "#b6b2ab",
  night: "#3a3557",
  neutral: "#2b2540",
};

const state = { scale: 6, backdrop: "grass" };

const W = 44; // wide enough for the mole's spoil heap and the guy lines
const H = 40; // and tall enough for the Menace's pole

/** Integer scale only. Non-integer scaling resamples pixel art off the grid
 *  (CLAUDE.md §Sprite rendering) — this page must not be the thing that does it,
 *  so the art is drawn at 1:1 into a buffer and the buffer is blitted up. */
function draw(canvas: HTMLCanvasElement, form: AdultForm): void {
  const s = state.scale;
  canvas.width = W * s;
  canvas.height = H * s;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const buf = document.createElement("canvas");
  buf.width = W;
  buf.height = H;
  const b = buf.getContext("2d")!;
  b.fillStyle = BACKDROPS[state.backdrop];
  b.fillRect(0, 0, W, H);
  // Off-centre by design: the burrow sits to the tent's right, and centring the
  // tent would crop it.
  drawTent(b, 17, H - 6, state.backdrop === "night", TENTS[form]);

  ctx.drawImage(buf, 0, 0, W, H, 0, 0, canvas.width, canvas.height);
}

const canvases: { canvas: HTMLCanvasElement; form: AdultForm }[] = [];

function redraw(): void {
  for (const c of canvases) draw(c.canvas, c.form);
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
    control("scale", ["3", "4", "6", "8"] as const, String(state.scale) as "6", (v) => (state.scale = Number(v))),
    control("ground", Object.keys(BACKDROPS), state.backdrop, (v) => (state.backdrop = v)),
  );
  root.append(bar);

  const grid = document.createElement("div");
  grid.className = "grid";
  for (const form of Object.keys(TENTS) as AdultForm[]) {
    const cell = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvases.push({ canvas, form });
    cell.append(canvas);
    const cap = document.createElement("figcaption");
    cap.innerHTML =
      `<b>${FORMS[form].name}</b><span>${TENTS[form].decor}</span>` +
      `<span class="swatch" style="background:${TENTS[form].accent}"></span>`;
    cell.append(cap);
    grid.append(cell);
  }
  root.append(grid);
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
  .grid { display: flex; flex-wrap: wrap; gap: 16px; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  canvas { border-radius: 6px; border: 1px solid #3a3557; display: block; }
  figcaption { display: flex; flex-direction: column; font-size: 11px; }
  figcaption span { opacity: .5; }
  .swatch { width: 22px; height: 6px; border-radius: 3px; opacity: 1; }
`;
document.head.append(style);

build();
