// Drive the running game in a real browser and take screenshots.
//
// ROADMAP's house rules say to verify rendering and interaction changes in a
// browser rather than only in tests, because the worst bugs so far all passed
// unit tests and failed on screen. This is the thing that does that. It exists
// in the repo rather than being rebuilt per session because every gotcha below
// cost real time to find, twice.
//
//   node scripts/drive.mjs                    # screenshot the world
//   node scripts/drive.mjs --out /tmp/shots   # somewhere else
//
// …or import { drive } from it and script your own interaction.
//
// THE GOTCHAS, all of which have bitten:
//
//   • Tile size is NOT fixed. `resize()` picks an integer scale from the
//     viewport, so CSS px per tile changes with window size. Never hardcode it;
//     read it off the canvas (`tilePx` below), or your clicks land on the wrong
//     tiles and you "discover" bugs that are really your own arithmetic.
//   • The HUD overlaps the world. Clicks that land on the build palette (right)
//     or the act palette (left) SELECT A TOOL instead of hitting the map — which
//     looks exactly like placement going haywire. Keep interaction inside
//     `safeArea`, or widen the viewport.
//   • `beforeunload` persists the in-memory world. Writing localStorage and then
//     reloading gets your write clobbered by the old page saving over it. Seed
//     through `addInitScript`, which runs on the NEW document, after unload.
//   • The day/night wash is real-clock. Screenshots taken in the evening come
//     back too dark to judge art by; the clock is pinned to midday by default.
//   • Generated trees and rocks are SOLID, so building refuses them — a tree in
//     your footprint silently leaves a hole in the wall. `seed.clear` bulldozes
//     the plot first.
//   • The camera eases toward the player, so tile coords are camera-relative and
//     drift while it's still catching up. Let it settle before clicking, or move
//     the player by seeding position rather than by walking.
//   • The sim is NOT on `window`. To watch live state (has that villager
//     actually moved?) use `liveSave()`, which flushes through visibilitychange
//     before reading; plain `save()` returns the last persisted world, which for
//     a running game is stale and will look like nothing is happening.
//   • Villagers START at their scheduled stop, so "did they walk here" is
//     unanswerable unless you put them somewhere else first — via `reseed()`,
//     which goes through addInitScript for the beforeunload reason above.
//   • A villager who CANNOT path to their stop snaps to it instantly, which
//     looks identical to arriving normally. If someone reaches a destination
//     impossibly fast, the pathfinder found nothing — that's a sealed doorway
//     or a blocked doorstep, not a fast walk. This hid a real bug for an hour.

import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Launch the game, click through onboarding, and hand back a driven page.
 *
 * `seed` shapes the save before the world loads (see the addInitScript note):
 *   { wood, clear: true, player: {x, y} | "inside" }
 */
export async function drive({
  url = process.env.URL || "http://localhost:5173/",
  viewport = { width: 1100, height: 560 },
  deviceScaleFactor = 3,
  time = "2026-07-24T13:00:00",
  seed = null,
} = {}) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text()));
  if (time) {
    try {
      await page.clock.install({ time: new Date(time) });
    } catch {
      // Older playwright without the clock API — screenshots will just be
      // whatever time it actually is.
    }
  }

  await page.goto(url, { waitUntil: "networkidle" });
  await onboard(page);

  if (seed) {
    await ctx.addInitScript(applySeed, seed);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await dismiss(page);
  }

  const geom = await page.evaluate(() => {
    const c = document.getElementById("scene");
    const r = c.getBoundingClientRect();
    return { tilePx: 16 * (r.width / c.width), cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });

  return {
    browser,
    ctx,
    page,
    ...geom,
    /** Screen point for a tile offset from the player (who is at screen centre). */
    at: (gx, gy) => [geom.cx + gx * geom.tilePx, geom.cy + gy * geom.tilePx],
    /** True when a point is clear of the HUD palettes. */
    safeArea: (x, y) => x > 90 && x < viewport.width - 150 && y > 60 && y < viewport.height - 40,
    /** Select a tool/build tool by its button title, e.g. "Wall", "Bed". */
    tool: async (title) => {
      const b = await page.$(`button.tool[title="${title}"]`);
      if (!b) throw new Error(`no tool button titled ${title}`);
      await b.click();
      await page.waitForTimeout(150);
    },
    rotate: async () => (await page.$("button.rotate-btn"))?.click(),
    /** The current save, for asserting on sim state from the outside. */
    save: () => page.evaluate(() => JSON.parse(localStorage.getItem("the-farm-save"))),
    /** Force a write and read it back — the only way to watch LIVE sim state.
     *
     *  The world is not exposed on `window`, and `save()` alone returns whatever
     *  was last persisted, which for a running game is stale. app.ts persists on
     *  visibilitychange, so faking a hide flushes the current world to storage
     *  first. Poll this to watch a villager actually move. */
    liveSave: async () => {
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForTimeout(120);
      return page.evaluate(() => JSON.parse(localStorage.getItem("the-farm-save")));
    },
    /** Reposition villagers (or anything else) BEFORE the app boots, then reload.
     *  Villagers start already standing at their scheduled stop, so testing that
     *  someone WALKS somewhere means putting them elsewhere first — and doing it
     *  through addInitScript, or beforeunload clobbers the write. */
    reseed: async (fn, arg) => {
      await ctx.addInitScript(fn, arg);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await dismiss(page);
    },
    shot: (path, clip) => page.screenshot({ path, ...(clip ? { clip } : {}) }),
  };
}

/** Click through title → character → land claim, whatever's in front of us. */
async function onboard(page) {
  for (let i = 0; i < 8; i++) {
    const primary = await page.$("button.primary:not(.choices button)");
    const target = primary || (await page.$$("button")).at(-1);
    if (!target) break;
    await target.click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(900);
}

/** Clear any modal (the "while you were out" postcard, usually). */
async function dismiss(page) {
  for (const b of await page.$$("button.primary")) {
    await b.click();
    await page.waitForTimeout(250);
  }
}

/** Runs INSIDE the page, on a fresh document, before the app boots. */
function applySeed(seed) {
  const raw = localStorage.getItem("the-farm-save");
  if (!raw) return;
  const w = JSON.parse(raw);
  if (seed.wood != null) w.inventory.wood = seed.wood;
  if (seed.clear) {
    // Generated nodes are solid and would refuse placement, leaving gaps.
    const ox = w.homestead.originX;
    const oy = w.homestead.originY;
    for (let y = oy - 10; y <= oy + 10; y++) {
      for (let x = ox - 6; x <= ox + 18; x++) w.overrides[`${x},${y}`] = 0;
    }
    w.regrow = {};
  }
  if (seed.player === "inside") {
    // Middle of whatever's been built — the reliable way to trigger the roof
    // cutaway, since walking there is camera-relative and misses doorways.
    const keys = Object.keys(w.build).map((k) => k.split(",").map(Number));
    if (keys.length) {
      const xs = keys.map((k) => k[0]);
      const ys = keys.map((k) => k[1]);
      w.player.x = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
      w.player.y = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
      w.player.target = null;
    }
  } else if (seed.player) {
    w.player.x = seed.player.x;
    w.player.y = seed.player.y;
    w.player.target = null;
  }
  localStorage.setItem("the-farm-save", JSON.stringify(w));
}

// --- CLI ---------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : ".";
  const d = await drive({ seed: { clear: true, wood: 500 } });
  await d.shot(`${out}/world.png`);
  console.log(`wrote ${out}/world.png`);
  await d.browser.close();
}
