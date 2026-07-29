// Rasterise public/icon.svg into the PNGs a home-screen install actually wants.
//
//   node scripts/icons.mjs
//
// It is a script in the repo rather than a one-off because the icon will change,
// and because the sizes below are not arbitrary — see INTEGER SCALE.
//
// WHY PNGs AT ALL. The manifest shipped a single SVG, which Chrome accepts and
// which iOS ignores completely: Safari reads `apple-touch-icon` from the HTML and
// wants a raster. Android wants a `maskable` icon or it puts a white plate behind
// yours and crops it to whatever shape the launcher likes.
//
// INTEGER SCALE, which is the whole reason this file has arithmetic in it. The
// artwork is a 16x16 pixel grid (CLAUDE.md: never draw pixel art at a fractional
// scale — it resamples off the grid and pixels come out different widths). 192 and
// 512 are 12x and 32x, so they are exact. The two sizes that matter are NOT:
//
//   • apple-touch-icon wants 180, and 180/16 = 11.25. So the art is drawn at 176
//     (11x) and the canvas is padded to 180 with the background colour. Two pixels
//     of the colour that is already behind the carrot: invisible, and every pixel
//     of the carrot stays square.
//   • a maskable icon must keep its subject inside the middle ~80%, so the art is
//     drawn at 368 (23x) on a 512 canvas — 72%, comfortably inside the safe zone,
//     and again an exact multiple.
//
// The background is painted by the canvas rather than by the SVG's own rect, so
// the padding and the artwork can never disagree about the colour.

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Must match the SVG's own background rect and the manifest's background_color. */
const BG = "#2b2540";

/** `art` is the artwork's rendered size, always a multiple of 16; `size` is the
 *  file's. Where they differ, the difference is padding. */
const TARGETS = [
  { file: "icon-192.png", size: 192, art: 192 },
  { file: "icon-512.png", size: 512, art: 512 },
  { file: "icon-maskable-512.png", size: 512, art: 368 },
  { file: "apple-touch-icon.png", size: 180, art: 176 },
  { file: "favicon-32.png", size: 32, art: 32 },
];

const svg = readFileSync(join(PUBLIC, "icon.svg"), "utf8");
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });

for (const { file, size, art } of TARGETS) {
  if (art % 16 !== 0) throw new Error(`${file}: art size ${art} is not a multiple of 16`);
  await page.setContent(`<!doctype html><style>
    html,body{margin:0;background:#111}
    #plate{width:${size}px;height:${size}px;background:${BG};
      display:flex;align-items:center;justify-content:center}
    img{width:${art}px;height:${art}px;image-rendering:pixelated}
  </style><div id="plate"><img src="${dataUri}"></div>`);
  await page.locator("#plate").screenshot({ path: join(PUBLIC, file), omitBackground: false });
  console.log(`${file}  ${size}x${size} (art ${art}px, ${art / 16}x)`);
}

await browser.close();
