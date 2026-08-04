// The second survey pass — night, the four seasons, and the underground —
// written so that it checks itself.
//
//   npx tsx scripts/shot-survey.mts [outdir]     # needs `npm run dev` running
//
// WHY THIS FILE EXISTS. §8e's method note: the first survey of the world was
// run by a subagent that reported the institution panels, night, autumn, winter
// and the underground all clean, returned five byte-identical files as five
// separate screens, and was wrong about the first panel anybody checked by
// hand. The panels got their self-checking script (`shot-counters.mts`); this
// is the rest of that list, and it makes the same bargain — every shot is
// photographed for a person to look at AND asserted against the table that
// claims to produce it, so a clean run is evidence rather than a report.
//
// WHAT EACH SHOT IS FOR, because a screenshot nobody has a question about is
// decoration:
//
//   survey-spring/summer/autumn/winter — one place, one seed, one hour, four
//     dates. THE QUESTION: does the month reach the ground and the trees, and
//     does each one read as its own weather rather than as summer with a filter?
//     Summer is the baseline the other three are departures from (content/
//     seasons.ts says so in its own comment), so it is also the control here.
//   survey-night — the same place after dark. THE QUESTION: is it night, or is
//     it merely dimmer? A wash that reads as dusk at 23:30 is the bug.
//   survey-under-landing / survey-under-tunnel — the rock, reached by digging
//     down rather than by writing `layer` into the save. THE QUESTION: does the
//     underground read as a PLACE — is the way back up legible from the bottom
//     of it, and does a cut corridor look cut rather than erased?
//
// WHAT IT ASSERTS, and why each one is the check it is:
//
//   • Every PNG differs from every other. The five-identical-files bug produced
//     a report that could not have been true; a hash comparison would have
//     caught it in one line, so here is the one line.
//   • Each season's frame moves AWAY from summer's in the direction the table
//     says it should. Direction rather than absolute colour, deliberately: a
//     region tint is a lerp toward the biome's ground (render/palette.ts
//     §biomeSkin), which shrinks the gap between two seasons without turning
//     it, so a cosine against the table's own delta survives standing in a fen
//     and an equality check does not.
//   • Night is measurably darker than the same frame by day.
//   • The player really is on the `under` layer — read back out of the live
//     save, not assumed from the fact that a key was pressed — and the rock on
//     screen is nowhere near any season's grass.
//
// THE GOTCHAS (drive.mjs has the general list):
//
//   • The seed is whatever onboarding rolled, so every drive() gets a DIFFERENT
//     world. Four season shots of four different fields compare nothing. Every
//     frame here is reseeded onto one fixed seed, spot and position.
//   • The clock is installed when the browser launches, so each date needs its
//     own drive(). That is why this runs six browsers rather than one.
//   • Pixels are read off the canvas with getImageData, not out of the PNG. The
//     screenshot is scaled by deviceScaleFactor and its resampling would blur
//     exactly the flat colour this measures.
//   • The MODE is the measurement, not the mean. The mean moves when a tree
//     goes gold and when a cloud of leaves does; the most common colour on a
//     grass field is the ground, which is the thing the season table claims to
//     repaint. Winter's crowns go brown while its ground goes pale — averaged
//     together those two partly cancel, and the check would fail on a world
//     that looked perfect.
//   • A shaft is two digs on one tile (ROADMAP), and the third ACT goes down.
//     Underground the shovel is a pick and cuts the face AHEAD, so the heading
//     decides where the tunnel goes — a player facing the wrong way cuts
//     nothing and it looks exactly like a broken tool.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { drive } from "./drive.mjs";
import { SEASONS, seasonOn, type SeasonId } from "../src/content/seasons.ts";
import { GRASS } from "../src/content/tiles.ts";

const OUT = process.argv[2] ?? ".";

/** One field, one hour, one seed, for every frame in the survey.
 *
 *  Riverside, but standing back from the river: grass and trees fill the frame
 *  with the far bank still in the corner of it, so the tiles a season may NOT
 *  touch — water, sand, anything built — are on screen to be judged beside the
 *  ones it may. The first attempt at this stood ON the bridge, where the modal
 *  colour of the frame was the planks of a house and every season measured
 *  identical; the shot was of a lovely riverside and it answered nothing. */
const PLACE = { seed: 3, spot: "riverside", x: -26, y: -1 };

/** 13:00 on the 24th, four times. The day of the month is held fixed so the
 *  only thing that varies between the four is the month itself. */
const DATES: Record<SeasonId, string> = {
  spring: "2026-04-24T13:00:00",
  summer: "2026-07-24T13:00:00",
  autumn: "2026-10-24T13:00:00",
  winter: "2026-01-24T13:00:00",
};
/** Long after dark in every season — winter's night starts earliest and summer's
 *  latest (sim/time.ts §DAYLIGHT_SHIFT), and 23:30 is night in both. */
const NIGHT = "2026-07-24T23:30:00";

let failed = 0;
const fail = (m: string) => {
  console.log(`FAIL ${m}`);
  failed++;
};
const ok = (m: string) => console.log(`ok   ${m}`);

// --- Reading the frame -------------------------------------------------------

type Rgb = [number, number, number];
interface Frame {
  /** The most common colour on the canvas — the ground, on any of these shots. */
  mode: Rgb;
  /** What share of the canvas wears it. Low means the shot is not of a field,
   *  and the season check below is measuring the wrong thing. */
  share: number;
  /** Mean relative luminance, 0–255. Night's whole claim. */
  lum: number;
}

const hex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const parse = (s: string): Rgb => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];
const sub = (a: Rgb, b: Rgb): Rgb => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: Rgb) => Math.hypot(...a);
const dot = (a: Rgb, b: Rgb) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cos = (a: Rgb, b: Rgb) => dot(a, b) / (norm(a) * norm(b) || 1);

/** Measure what is actually on the canvas, in the canvas's own pixels. */
async function measure(page: { evaluate: (f: () => unknown) => Promise<unknown> }): Promise<Frame> {
  const r = (await page.evaluate(() => {
    const c = document.getElementById("scene") as HTMLCanvasElement;
    const px = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const counts = new Map<number, number>();
    let lum = 0;
    for (let i = 0; i < px.length; i += 4) {
      const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
      lum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    }
    let best = 0;
    let bestN = 0;
    for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n];
    const n = px.length / 4;
    return { mode: [(best >> 16) & 255, (best >> 8) & 255, best & 255], share: bestN / n, lum: lum / n };
  })) as Frame;
  return r;
}

/** Launch, put the player in the one fixed place, photograph, measure. */
async function frame(name: string, time: string, extra?: (d: Driven) => Promise<void>): Promise<Frame> {
  const d = await drive({ viewport: { width: 1200, height: 700 }, time });
  await d.reseed((p: typeof PLACE) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.seed = p.seed;
    w.homestead.spot = p.spot;
    w.player.x = p.x;
    w.player.y = p.y;
    w.player.target = null;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  }, PLACE);
  await d.page.waitForTimeout(800);
  if (extra) await extra(d);
  await d.shot(`${OUT}/survey-${name}.png`);
  const f = await measure(d.page);
  console.log(
    `     survey-${name}: mode ${hex(f.mode)} (${Math.round(f.share * 100)}% of frame), luminance ${f.lum.toFixed(1)}`,
  );
  await d.browser.close();
  return f;
}

type Driven = Awaited<ReturnType<typeof drive>>;

// --- The seasons -------------------------------------------------------------

const seasons = {} as Record<SeasonId, Frame>;
for (const id of ["summer", "spring", "autumn", "winter"] as const) {
  // The date must actually land in the month it claims to — the one thing here
  // that is cheaper to assert than to trust.
  const landed = seasonOn(new Date(DATES[id]).getTime()).id;
  if (landed !== id) fail(`${id}: ${DATES[id]} is in ${landed}, so this frame is mislabelled`);
  seasons[id] = await frame(id, DATES[id]);
}

// Is the thing being measured actually the turf? The modal colour has to be
// recognisably summer grass — not equal to it (a region tint pulls it, and this
// world's does, by about 25), but nowhere near a plank, a paving stone or the
// river. The first run of this file stood on a bridge with two buildings in
// shot, measured the wooden wall of a house four times, and reported four
// identical seasons; the frame was lovely and answered nothing. Share is only
// logged: grass splits across three roles, so no single one is ever a majority.
{
  const g = SEASONS.find((s) => s.id === "summer")!.ground[GRASS]!;
  const off = Math.min(
    ...([g.color, g.top ?? g.color, g.shade ?? g.color] as string[]).map((c) => norm(sub(seasons.summer.mode, parse(c)))),
  );
  if (off > 60)
    fail(
      `the frame's commonest colour is ${hex(seasons.summer.mode)}, ${Math.round(off)} from summer grass — PLACE is not standing on a field, and every season check below is measuring something else`,
    );
  else
    ok(
      `standing on turf: ${hex(seasons.summer.mode)}, ${Math.round(off)} off the table's grass (region tint), ${Math.round(seasons.summer.share * 100)}% of the frame`,
    );
}

for (const id of ["spring", "autumn", "winter"] as const) {
  const def = SEASONS.find((s) => s.id === id)!;
  const base = SEASONS.find((s) => s.id === "summer")!;
  const seen = sub(seasons[id].mode, seasons.summer.mode);
  // Against each of the three grass roles: which of colour / top / shade is the
  // modal one depends on the tile mix, and the mix is the same in all four
  // frames, so agreeing with ANY of them is agreeing with the row.
  const roles = (["color", "top", "shade"] as const).map((r) => {
    const want = sub(parse(def.ground[GRASS]![r] ?? def.ground[GRASS]!.color), parse(base.ground[GRASS]![r] ?? base.ground[GRASS]!.color));
    return { r, want, cos: cos(seen, want), ratio: norm(seen) / (norm(want) || 1) };
  });
  const best = roles.reduce((a, b) => (b.cos > a.cos ? b : a));
  const detail = `moved ${hex(seasons.summer.mode)} → ${hex(seasons[id].mode)}, table says ${best.want.map((v) => (v > 0 ? `+${v}` : v)).join(",")} on ${best.r} (cos ${best.cos.toFixed(2)}, ${Math.round(best.ratio * 100)}% of it)`;
  if (norm(seen) < 4) fail(`${id}: the ground did not move from summer's at all — ${detail}`);
  else if (best.cos < 0.9) fail(`${id}: the ground moved the wrong way — ${detail}`);
  else if (best.ratio < 0.25 || best.ratio > 2) fail(`${id}: the ground moved the right way by the wrong amount — ${detail}`);
  else ok(`${id}: ${detail}`);
}

// --- Night -------------------------------------------------------------------

const night = await frame("night", NIGHT);
const drop = 1 - night.lum / seasons.summer.lum;
if (drop < 0.2)
  fail(`night is only ${Math.round(drop * 100)}% darker than midday — the wash is not reaching the ground`);
else ok(`night: ${Math.round(drop * 100)}% darker than the same field at midday`);
if (hex(night.mode) === hex(seasons.summer.mode)) fail("night: the ground is exactly its daytime colour");

// --- The underground ---------------------------------------------------------
//
// Dug, not written. Reseeding `player.layer` would photograph the rock without
// ever asking whether you can GET there, and the way down is the half of this
// that has never been looked at.

/** Walk. Movement is HELD keys (app.ts keeps a key set and steps the player per
 *  tick), so a `press` is a twitch that moves nobody anywhere. */
async function walk(d: Driven, key: string, ms: number): Promise<void> {
  await d.page.keyboard.down(key);
  await d.page.waitForTimeout(ms);
  await d.page.keyboard.up(key);
  await d.page.waitForTimeout(150);
}

/** Shovel, then dig, dig, descend. Three ACTs: the second opens the shaft and
 *  the third takes it down. `1` selects the shovel explicitly rather than
 *  trusting that it is still the tool a new sprite starts holding. */
async function godown(d: Driven): Promise<void> {
  await d.page.keyboard.press("1");
  await d.page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) {
    await d.page.keyboard.press("Space");
    await d.page.waitForTimeout(450);
  }
}

let landedUnder = false;
const landing = await frame("under-landing", DATES.summer, async (d) => {
  await godown(d);
  const w = await d.liveSave();
  landedUnder = w.player.layer === "under";
  if (!landedUnder) fail(`the way down: three ACTs left the player on ${w.player.layer}`);
  else ok("the way down: dug a shaft and descended, by ACT alone");
});

if (landedUnder) {
  const tunnel = await frame("under-tunnel", DATES.summer, async (d) => {
    await godown(d);
    // Facing matters down here: the shovel cuts the face ahead, so the walk
    // north sets the heading and the ACT cuts what it is now facing. Cut, then
    // step into the cut — walking first would be walking into solid rock.
    await walk(d, "ArrowUp", 200);
    for (let i = 0; i < 5; i++) {
      await d.page.keyboard.press("Space");
      await d.page.waitForTimeout(400);
      await walk(d, "ArrowUp", 400);
    }
    await d.page.waitForTimeout(600);
  });
  const nearest = SEASONS.flatMap((s) =>
    (["color", "top", "shade"] as const).map((r) => ({
      what: `${s.id} grass ${r}`,
      d: norm(sub(tunnel.mode, parse(s.ground[GRASS]![r] ?? s.ground[GRASS]!.color))),
    })),
  ).reduce((a, b) => (b.d < a.d ? b : a));
  if (nearest.d < 60)
    fail(`the underground reads as turf: ${hex(tunnel.mode)} is ${Math.round(nearest.d)} from ${nearest.what}`);
  else
    ok(
      `underground is underground: ${hex(tunnel.mode)}, ${Math.round(nearest.d)} away from the nearest grass (${nearest.what})`,
    );
  // The commonest colour down here is the DARK BEYOND THE LAMP, not the floor —
  // most of the frame is unlit rock, and it is near-black. Worth saying out
  // loud: it means this measurement answers "am I underground" and cannot
  // answer anything about the cave floor's own colour, which only a lit shot
  // could. The landing and the tunnel matching is that same dark, twice.
  console.log(
    `     (that colour is the unlit rock past the lamp, which is most of the frame — the landing measured ${hex(landing.mode)})`,
  );
}

// --- The five-identical-files check -----------------------------------------

const shots = ["spring", "summer", "autumn", "winter", "night", "under-landing"].concat(
  landedUnder ? ["under-tunnel"] : [],
);
const seen = new Map<string, string>();
for (const s of shots) {
  const h = createHash("sha1").update(readFileSync(`${OUT}/survey-${s}.png`)).digest("hex");
  const twin = seen.get(h);
  if (twin) fail(`survey-${s}.png is byte-identical to survey-${twin}.png`);
  seen.set(h, s);
}
if (seen.size === shots.length) ok(`${shots.length} distinct frames, no repeats`);

console.log(failed ? `\n${failed} failed` : `\nall clear — ${OUT}/survey-*.png`);
if (failed) process.exit(1);
