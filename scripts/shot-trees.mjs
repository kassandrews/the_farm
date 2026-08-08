// Photograph /trees.html, one PNG per region card.
//
//   node scripts/shot-trees.mjs [outdir] [--seed 3] [--when summer] [--zoom 3]
//
// Needs `npm run dev` running. The page is a tool page rather than the game, so
// this does NOT go through drive.mjs's onboarding — there is nothing to click
// through and no save to seed. What it does share is the reason it exists: a
// silhouette can only be judged by looking, and rebuilding the harness every
// session is how you stop bothering to.
//
// One file per card rather than one of the page, because the cards are the unit
// being compared and a full-page shot of three of them is unreadable at the size
// a screenshot gets looked at.

import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const out = args[0] && !args[0].startsWith("--") ? args[0] : ".";
const url = process.env.URL || "http://localhost:5173/trees.html";

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text()));
await page.goto(url, { waitUntil: "networkidle" });

const set = async (label, value) => {
  const sel = page.locator(`#bar label:has(span:text-is("${label}")) select, ` +
    `#bar label:has(span:text-is("${label}")) input`);
  if ((await sel.getAttribute("type")) === "checkbox") {
    if (value === "1") await sel.check();
    return;
  }
  await sel.selectOption(value).catch(async () => {
    await sel.fill(value);
    await sel.dispatchEvent("change");
  });
};

if (flag("set")) await set("Set", flag("set"));
if (flag("options")) await set("Candidates", "1");
if (flag("seed")) await set("Seed", flag("seed"));
if (flag("show")) await set("Show", flag("show"));
if (flag("zoom")) await set("Zoom", flag("zoom"));
if (flag("when")) await set("When", flag("when"));

// The strips draw on requestAnimationFrame and the far regions are found by a
// ring sweep that takes a moment; give the page a beat to settle before the
// shutter, or the first card comes back empty.
await page.waitForTimeout(1500);

const cards = page.locator(".card");
const n = await cards.count();
for (let i = 0; i < n; i++) {
  const card = cards.nth(i);
  const name = (await card.locator("strong").innerText()).replace(/^the /, "").replace(/\s+/g, "-");
  const tag = flag("set") && flag("set") !== "all" ? `-${flag("set")}` : "";
  const file = `${out}/tree-${name}${tag}.png`;
  await card.screenshot({ path: file });
  console.log(file, await card.locator(".note").innerText());
}

await browser.close();
