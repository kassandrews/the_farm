// Photograph roofs of four different shapes, and assert the pitch on them.
//
//   npx tsx scripts/shot-roofs.mts [outdir]     # needs `npm run dev` running
//
// 8j gave the roof a gable: a value ramp falling from a crease to the eaves,
// with the north slope lit and the south in the lee (render/roof.ts §Pitch has
// the reconciliation with 8f's grain rule, and why it is a ramp and not a
// texture). `roof.test.ts` pins where the crease GOES; only a photograph can
// say whether a roof reads as a roof, so this stands in front of four of them.
//
// It asserts as well as photographs, which is 8e's method note applied here:
// the ramp is invisible to the unit tests, and "the roof looks fine" from a
// script that never measured a pixel is the kind of clean report §8v was
// written about.
//
// WHAT EACH SHOT IS FOR:
//
//   roofs-row — wide, deep and square, side by side. THE QUESTION: does the
//     ridge run the way the footprint says it should — along the long side,
//     turning through 90° between the wide house and the deep one?
//   roofs-ell — an L. THE QUESTION: does a house with a wing read as two
//     wings? The crease is per column — per ROW where the ridge runs the other
//     way — so the half with the wing on it gets a wider roof and a crease of
//     its own; a single bounding-box ridge would run one line across both at a
//     place neither of them has.
//
// THE GOTCHAS:
//
//   • The bench is built 70 tiles east and 60 north of wherever onboarding put
//     the player, because building it AT the homestead drops four houses on top
//     of the town and photographs a pile-up.
//   • NO LOCAL FUNCTIONS inside a `reseed` callback. tsx compiles them through
//     an esbuild `__name` helper that does not exist in the page, and the whole
//     seed silently fails with one PAGE ERROR line.
//   • Pixels come off the canvas, not the PNG: the screenshot is scaled by
//     deviceScaleFactor and resampling would blur the value steps this measures.
//   • The shingle courses darken every fourth world row, so a raw scanline down
//     a roof is not monotonic and never will be. The profile below takes the
//     brightest row in each 4px window, which is the roof between its courses.

import { drive } from "./drive.mjs";

const OUT = process.argv[2] ?? ".";

/** The bench, in tiles relative to its own origin. Four footprints, three
 *  materials: wide (its ridge should run east-west), deep (north-south),
 *  square (a tie, which the model settles east-west), and an L. */
const BOXES = [
  { x0: -17, y0: -11, x1: -7, y1: -6, finish: "pine" },
  { x0: -3, y0: -13, x1: 2, y1: -3, finish: "walnut" },
  { x0: 6, y0: -11, x1: 12, y1: -5, finish: "whitewash" },
  { x0: -15, y0: 1, x1: -9, y1: 6, finish: "pine" },
  { x0: -12, y0: 1, x1: -6, y1: 11, finish: "pine" },
];

let failed = 0;
const fail = (m: string) => {
  console.log(`FAIL ${m}`);
  failed++;
};
const ok = (m: string) => console.log(`ok   ${m}`);

const d = await drive({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 3,
  seed: { clear: true, wood: 900 },
});

await d.reseed((boxes: typeof BOXES) => {
  const w = JSON.parse(localStorage.getItem("the-farm-save")!);
  const ox = Math.round(w.player.x) + 70;
  const oy = Math.round(w.player.y) - 60;
  // Footprints first, walls second, and that ORDER is what makes the L work.
  // Building each box as its own walled rectangle and then knocking the shared
  // walls out left a notch in the north side and a room the flood fill read as
  // one lopsided space with a hole in it. A wall belongs wherever the union of
  // the footprints STOPS — which is the same rule the roof's own edges follow.
  const fill = new Set<string>();
  for (const b of boxes)
    for (let y = oy + b.y0; y <= oy + b.y1; y++)
      for (let x = ox + b.x0; x <= ox + b.x1; x++) fill.add(`${x},${y}`);
  for (const b of boxes)
    for (let y = oy + b.y0 - 1; y <= oy + b.y1 + 1; y++)
      for (let x = ox + b.x0 - 1; x <= ox + b.x1 + 1; x++) w.overrides[`${x},${y}`] = 0;
  for (const key of fill) {
    const [x, y] = key.split(",").map(Number);
    w.overrides[key] = 2;
    w.finishes[key] = boxes.find((b) => x >= ox + b.x0 && x <= ox + b.x1 && y >= oy + b.y0 && y <= oy + b.y1)!.finish;
    const edge =
      !fill.has(`${x - 1},${y}`) || !fill.has(`${x + 1},${y}`) ||
      !fill.has(`${x},${y - 1}`) || !fill.has(`${x},${y + 1}`);
    if (edge) w.build[key] = { id: "wall", finish: w.finishes[key] };
  }
  // A door in the south wall of each box, so every one of them is a house.
  for (const b of boxes) w.build[`${ox + b.x0 + 1},${oy + b.y1}`] = { id: "door", finish: b.finish };
  w.regrow = {};
  w.player.x = ox;
  w.player.y = oy;
  w.player.target = null;
  localStorage.setItem("the-farm-save", JSON.stringify(w));
}, BOXES);
await d.page.waitForTimeout(900);

const origin = await d.save();
const ox = Math.round(origin.player.x);
const oy = Math.round(origin.player.y);

/** Stand somewhere, stand BACK two steps, and let the camera settle.
 *
 *  The zoom is what makes the measurements possible at all: the backing buffer
 *  is the viewport divided by the zoom's integer scale, so standing back grows
 *  the canvas in world pixels. At the default step a nine-tile roof runs off
 *  the top of it, and the sample line reads zeroes — a black roof that looks
 *  like a broken ramp and is a too-small window. The reload inside `reseed`
 *  resets the zoom, so this is re-applied every time rather than accumulating. */
async function stand(x: number, y: number): Promise<void> {
  await d.reseed((p: { x: number; y: number }) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.player.x = p.x;
    w.player.y = p.y;
    w.player.target = null;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  }, { x, y });
  await d.page.waitForTimeout(500);
  for (let i = 0; i < 2; i++) {
    await d.page.keyboard.press("-");
    await d.page.waitForTimeout(200);
  }
  await d.page.waitForTimeout(600);
}

/** The value profile straight down (or across) one roof, in canvas pixels.
 *
 *  `at` is the tile the line passes through; `from`/`to` the tiles it covers.
 *
 *  TWO CORRECTIONS ARE BAKED IN, and both cost a run to find. The roof is drawn
 *  a storey (24px) ABOVE its footprint, so a line at the footprint's own rows
 *  measures the ground under the house and reports a flat roof on a working
 *  one. And a cell's art starts half a tile above its centre, so the whole band
 *  sits 8px higher than the naive `centre + (tile - player) * TILE`.
 *
 *  THREE LINES, MEDIANED, because of the chimney. It stands in the back third
 *  of the roof at a column chosen by hash (`chimneyCell`), so any single line
 *  may run straight through a stack — a bright cap and a dark outline landing
 *  in the middle of the ramp, which reads as a broken slope. Three lines two
 *  tiles apart cannot all hit one 16px stack, and the median throws it out. */
async function profile(
  along: "ns" | "ew",
  at: { x: number; y: number },
  from: number,
  to: number,
  standing: { x: number; y: number },
  spread = 2,
): Promise<number[]> {
  return (await d.page.evaluate(
    (a: {
      along: string;
      at: { x: number; y: number };
      from: number;
      to: number;
      standing: { x: number; y: number };
      spread: number;
    }) => {
      const c = document.getElementById("scene") as HTMLCanvasElement;
      const ctx = c.getContext("2d")!;
      const TILE = 16;
      const STOREY = 24;
      // Tile-space p → canvas px, for the axis the line runs along.
      const along0 = c[a.along === "ns" ? "height" : "width"] / 2 - TILE / 2 - (a.along === "ns" ? STOREY : 0);
      const start = Math.round(along0 + (a.from - (a.along === "ns" ? a.standing.y : a.standing.x)) * TILE);
      const end = Math.round(along0 + (a.to - (a.along === "ns" ? a.standing.y : a.standing.x)) * TILE);
      const across0 =
        c[a.along === "ns" ? "width" : "height"] / 2 -
        TILE / 2 -
        (a.along === "ns" ? 0 : STOREY);
      const lines: number[][] = [];
      for (const off of [-a.spread, 0, a.spread]) {
        const across = Math.round(
          across0 + ((a.along === "ns" ? a.at.x - a.standing.x : a.at.y - a.standing.y) + off) * TILE + TILE / 2,
        );
        const strip =
          a.along === "ns"
            ? ctx.getImageData(across, start, 1, end - start).data
            : ctx.getImageData(start, across, end - start, 1).data;
        const line: number[] = [];
        for (let i = 0; i < end - start; i++)
          line.push(0.2126 * strip[i * 4] + 0.7152 * strip[i * 4 + 1] + 0.0722 * strip[i * 4 + 2]);
        lines.push(line);
      }
      const out: number[] = [];
      for (let i = 0; i < end - start; i++) {
        const v = lines.map((l) => l[i]).sort((p, q) => p - q);
        out.push(v[1]);
      }
      return out;
    },
    { along, at, from, to, standing, spread },
  )) as number[];
}

/** The roof between its shingle courses: the brightest pixel of every four.
 *  The courses darken one world row in four by design (they are the roof's
 *  texture, and they are stepped off the world so they never restart per
 *  cell), so a raw scanline saws and no ramp in it can ever be monotonic. */
const decourse = (p: number[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < p.length; i += 4) out.push(Math.max(...p.slice(i, i + 4)));
  return out;
};

/** Assert a profile reads as a gable: brightest at the crease, falling to both
 *  eaves, and the lee side darker than the lit one. The ends are trimmed
 *  because the outermost 2px of a roof is its eave LINE, which is drawn in the
 *  eave's own colour and is lighter than the plane it edges. */
function assertGable(label: string, raw: number[]): void {
  const p = decourse(raw.slice(4, -4));
  if (p.length < 6) return fail(`${label}: only ${p.length} samples — the line missed the roof`);
  let peak = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[peak]) peak = i;
  const middle = (p.length - 1) / 2;
  const off = Math.abs(peak - middle) / p.length;
  const lit = p.slice(0, 2).reduce((a, b) => a + b) / 2;
  const lee = p.slice(-2).reduce((a, b) => a + b) / 2;
  const detail =
    `crease ${Math.round(off * 100)}% off centre, eaves ${lit.toFixed(1)} lit vs ${lee.toFixed(1)} lee` +
    // The profile itself on a failure. "The roof is flat" with no numbers under
    // it sends the next reader back to re-measure by hand, which is the tax
    // §8v was written about.
    (off > 0.2 || p[peak] - Math.max(lit, lee) < 3 || lit - lee < 2
      ? `\n       ridge→eave: ${p.map((v) => Math.round(v)).join(" ")}`
      : "");
  if (off > 0.2) fail(`${label}: the bright line is not the ridge — ${detail}`);
  else if (p[peak] - Math.max(lit, lee) < 3) fail(`${label}: the roof is flat — ${detail}`);
  else if (lit - lee < 2) fail(`${label}: both slopes are the same value, so it reads as a hip — ${detail}`);
  else ok(`${label}: ${detail}`);
}

// --- The shots ----------------------------------------------------------------

await stand(ox - 2, oy - 6);
await d.shot(`${OUT}/roofs-row.png`);
await stand(ox - 4, oy + 6);
await d.shot(`${OUT}/roofs-ell.png`);

// --- The measurements ---------------------------------------------------------
//
// Each roof is measured from close to it, and that is not fussiness: the canvas
// is the world at 16px a tile and about twenty tiles across, so a sample line
// ten tiles from where the player stands runs off the edge of it. getImageData
// past the edge returns ZEROES, which arrive here as a black roof and read as a
// failed assertion rather than as a missed one.

// The wide house: its ridge runs east-west, so the line that crosses it runs
// north-south, down the middle of the building.
await stand(ox - 12, oy - 4);
assertGable(
  "wide (ridge east-west)",
  await profile("ns", { x: ox - 12, y: oy - 8 }, oy - 11, oy - 5, { x: ox - 12, y: oy - 4 }),
);

// The deep house: the ridge turns with the footprint, so the line does too.
await stand(ox - 6, oy - 8);
assertGable(
  "deep (ridge north-south)",
  await profile("ew", { x: ox - 1, y: oy - 8 }, ox - 3, ox + 3, { x: ox - 6, y: oy - 8 }),
);

// The L. ITS RIDGE RUNS NORTH-SOUTH, which is not what this test assumed the
// first time it ran: the union is ten tiles wide and eleven deep, so the long
// side is the deep one and the crease turns with it. The measurement lines were
// written down the arms — along the ridge rather than across it — and read two
// flat values, which looked exactly like a broken ramp and was a correct roof
// measured the wrong way.
//
// So the two lines run EAST-WEST, one through each half. The northern half is
// ten tiles wide (both arms) and the southern half is seven (the long arm
// alone), so their creases sit a tile and a half apart. That gap IS the
// feature: one ridge across the bounding box would sit between them and belong
// to neither.
await stand(ox - 10, oy - 1);
assertGable(
  "the L, through both arms",
  await profile("ew", { x: ox - 10, y: oy + 3 }, ox - 15, ox - 5, { x: ox - 10, y: oy - 1 }),
);
await stand(ox - 10, oy + 13);
assertGable(
  "the L, through the long arm alone",
  await profile("ew", { x: ox - 9, y: oy + 9 }, ox - 12, ox - 5, { x: ox - 10, y: oy + 13 }, 1),
);

await d.browser.close();
console.log(failed ? `\n${failed} failed` : `\nall clear — ${OUT}/roofs-*.png`);
if (failed) process.exit(1);
