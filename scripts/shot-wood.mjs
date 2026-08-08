// Photograph a region's WOOD — one card of /biomes.html, at density.
//
//   node scripts/shot-wood.mjs <outdir> ["the redwoods,the pines"] [seed]
//
// Needs `npm run dev` running. The sibling of scripts/shot-trees.mjs and its
// necessary opposite: that one plants one tree of each form on cleared ground,
// this one photographs the place they grow in.
//
// WHY BOTH EXIST, and it cost a day to learn. The redwoods' crowns carried BREAKS
// for a day — empty rows with the bole showing through them — and on the tree
// page, one specimen at a time, they were the best drawing in the file. At the
// region's own density they were stripes: sixty horizontal bars of ground colour
// across sixty overlapping green masses, and the wood read as a screen of
// segments. Invisible at every zoom on the specimen page; obvious in one swatch
// here (ROADMAP §"what one tree cannot show you").
//
// So the rule is: shoot this BEFORE believing that. A silhouette is judged twice,
// once as a drawing and once as a texture, and only the second one is the game.
//
// It drives the contact sheet rather than the game because the sheet already
// solves finding a region and standing in the middle of it — see
// src/tools/biome-preview.ts, which is the real instrument. This is a shutter.

import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const out = process.argv[2] ?? ".";
const want = (process.argv[3] ?? "the redwoods").split(",");
const seed = process.argv[4] ?? "7";
const url = process.env.URL || "http://localhost:5173/biomes.html";

const browser = await chromium.launch({ executablePath: CHROME });
// Big and at 2x: a swatch is thirteen tiles and the whole point is to see the
// repeat, so a small screenshot of it answers nothing.
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
await page.goto(url, { waitUntil: "networkidle" });

const seedIn = page.locator('#bar label:has(span:text-is("Seed")) input');
await seedIn.fill(seed);
await seedIn.dispatchEvent("change");
await page.locator('#bar label:has(span:text-is("Zoom")) select').selectOption("2"); // large

// The far regions are found by a ring sweep; give the page a beat or the first
// card comes back empty.
await page.waitForTimeout(2500);

for (const name of want) {
  const card = page.locator(`.card:has(strong:text-is("${name}"))`);
  const file = `${out}/wood-${name.replace(/^the /, "").replace(/\s+/g, "-")}.png`;
  await card.screenshot({ path: file });
  // figcaption's note, not the marks strip's — both carry the class.
  console.log(file, await card.locator("figcaption .note").first().innerText());
}

await browser.close();
