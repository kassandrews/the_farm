// Stand in each found place and photograph it, and read a letter out of a mailbox
// that actually has post.
//
//   npx tsx scripts/shot-found.mts [outdir]     # needs `npm run dev` running
//
// Same job as shot-biomes.mts and the same reason for existing: every problem the
// found places shipped with in one afternoon was invisible to 998 unit tests and
// obvious in one screenshot. The poles came out as brown SQUARES (a standing tile
// missing from `groundIdOf`), the staircase came out as a BAR CHART (each of its
// three cells drawing the whole flight), and the mailbox's flag looked broken when
// it was the harness's clock.
//
// THE GOTCHAS PARTICULAR TO THIS SCRIPT (drive.mjs has its own list):
//
//   • The seed is whatever onboarding rolled, so the layout differs every run.
//   • THE PAGE CLOCK IS PINNED (drive.mjs, `time`), and the letter is a function of
//     the DAY. Computing "today" here from the real clock finds a box with post
//     that the game, sitting a week earlier, will report as empty — which reads as
//     a bug in the letters and is not one. Ask the harness's date, as below.
//   • Stand BESIDE a prop, never on it: all three are solid.
//   • The far instances are far. Kind n's rings are `ring + n * spacing`, so the
//     third mailbox is five hundred tiles out and walking is not an option — place
//     the player through `reseed`.

import { drive, HARNESS_TIME } from "./drive.mjs";
import { foundAt } from "../src/sim/world.ts";
import { dayNumber } from "../src/sim/found.ts";
import { FOUND, FOUND_KINDS, letterFor } from "../src/content/found.ts";
import type { HomesteadSpot } from "../src/sim/types.ts";

const OUT = process.argv[2] ?? ".";
const d = await drive({ seed: { wood: 500 } });
const save = await d.save();
const seed: number = save.seed;
const spot: HomesteadSpot = save.homestead.spot;
const day = dayNumber(new Date(HARNESS_TIME).getTime());
console.log(`seed ${seed}, ${spot}, day ${day}`);

/** Walk a kind's ring for one of its instances. Stepping by the footprint, not by
 *  a fixed count: ring 4376 is 27,000 tiles around, and 720 bearings step straight
 *  over a seven-tile grove. */
function onRing(kind: string, index: number): { x: number; y: number } | null {
  const def = FOUND[kind as keyof typeof FOUND];
  const ring = def.ring + index * def.spacing;
  const n = Math.ceil((2 * Math.PI * ring) / Math.max(0.5, def.radius));
  for (let a = 0; a < n; a++) {
    const th = (a / n) * Math.PI * 2;
    const x = Math.round(Math.cos(th) * ring);
    const y = Math.round(Math.sin(th) * ring);
    const s = foundAt(seed, spot, x, y);
    if (s?.kind === kind && s.index === index) return { x: s.x, y: s.y };
  }
  return null;
}

async function standAt(at: { x: number; y: number }): Promise<void> {
  await d.reseed((p: { x: number; y: number }) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.player.x = p.x;
    w.player.y = p.y;
    w.player.target = null;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  }, at);
  await d.page.waitForTimeout(700);
}

for (const kind of FOUND_KINDS) {
  const at = onRing(kind, 0);
  if (!at) {
    console.log(`${kind}: none on its first ring — rerun, it's a different seed`);
    continue;
  }
  await standAt({ x: at.x, y: at.y + 2 });
  await d.shot(`${OUT}/found-${kind}.png`);
  console.log(`${kind} @ ${at.x},${at.y}`);
}

// And the one thing that varies: a box with post in it today, and the line inside.
for (let index = 0; index < 8; index++) {
  const letter = letterFor(seed, index, day);
  if (!letter) continue;
  const at = onRing("mailbox", index);
  if (!at) continue;
  console.log(`mailbox #${index} @ ${at.x},${at.y}: ${letter}`);
  await standAt({ x: at.x, y: at.y + 1 });
  await d.shot(`${OUT}/found-letter-flag.png`);
  await d.page.keyboard.press("Space"); // ACT
  await d.page.waitForTimeout(400);
  await d.shot(`${OUT}/found-letter-read.png`);
  break;
}

await d.browser.close();
console.log(`wrote ${OUT}/found-*.png`);
