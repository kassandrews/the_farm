// Walk up the staircase that goes somewhere, and photograph every part of it.
//
//   npx tsx scripts/shot-sky.mts [outdir]     # needs `npm run dev` running
//
// Phase 7c is the one ROADMAP warned about in advance: "layer transitions are
// exactly the passed-the-unit-test, failed-on-screen class this file keeps warning
// about". The tests can say the player's layer changed; only a photograph can say
// whether the sky reads as a place or as a rendering error.
//
// What each shot is FOR, because a screenshot nobody has a question about is
// decoration:
//
//   sky-approach — the steps from the ground. THE QUESTION: do they look like any
//     other flight of steps out there? If this one is distinguishable from
//     found-stair.png, the secret has been marked and 7b's decoys are signposts.
//   sky-plane    — standing on the cloud, well away from the exit. THE QUESTION:
//     does the cloud stripe on the tile grid? This is the per-cell edges rule's
//     worst case — one material covering the whole viewport with nothing else in
//     it to look at (CLAUDE.md).
//   sky-parting  — the thinning around the way down, from the far side of it. THE
//     QUESTION: can you SEE the way home from across a field? An unbounded white
//     plane whose exits are three tiles wide is somewhere you get lost.
//   sky-head     — the head of the steps, close. THE QUESTION: does it read as a
//     way DOWN rather than as a staircase going up to nothing?
//   sky-night    — the same plane after dark. THE QUESTION: does the clock reach
//     the sky at all? It is outdoors, so it must.
//
// THE GOTCHAS (drive.mjs has its own list, shot-found.mts has the found places'):
//
//   • The seed is whatever onboarding rolled, so the staircase is somewhere new
//     every run. It is 244+ tiles out: place the player with `reseed`, never walk.
//   • The staircase is SOLID from the ground. Stand at its foot, one tile south,
//     and face north — climbing is by heading (sim/game.ts §climbTarget), so a
//     player standing in the right cell facing the wrong way does nothing at all.
//   • Reseed writes the player's LAYER too. That is the only way to photograph
//     the sky without walking the climb every time.

import { drive, HARNESS_TIME } from "./drive.mjs";
import { skyStairSiteAt, cosmosHome } from "../src/sim/world.ts";
import { FOUND } from "../src/content/found.ts";
import type { HomesteadSpot } from "../src/sim/types.ts";

const OUT = process.argv[2] ?? ".";
const d = await drive({ seed: { wood: 500 } });
const save = await d.save();
const seed: number = save.seed;
const spot: HomesteadSpot = save.homestead.spot;
console.log(`seed ${seed}, ${spot}, harness clock ${HARNESS_TIME}`);

/** The nearest real staircase, found by walking its ring — the same sweep
 *  shot-found.mts does, stepping by the footprint rather than a fixed count so a
 *  three-tile flight on a ring of 244 is not stepped over. */
function findStair(): { x: number; y: number } | null {
  const def = FOUND.skystair;
  for (let i = 0; i < 3; i++) {
    const ring = def.ring + i * def.spacing;
    const n = Math.ceil((2 * Math.PI * ring) / 0.5);
    for (let a = 0; a < n; a++) {
      const th = (a / n) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * ring);
      const y = Math.round(Math.sin(th) * ring);
      if (skyStairSiteAt(seed, spot, x, y)) return { x, y };
    }
  }
  return null;
}

const at = findStair();
if (!at) {
  console.log("no staircase inside three rings — rerun; it is a different seed each time");
  await d.browser.close();
  process.exit(0);
}
console.log(`staircase @ ${at.x},${at.y}`);

type Place = { x: number; y: number; layer?: string; heading?: string };

async function stand(p: Place): Promise<void> {
  await d.reseed((q: Place) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.player.x = q.x;
    w.player.y = q.y;
    w.player.target = null;
    if (q.layer) w.player.layer = q.layer;
    if (q.heading) w.player.heading = q.heading;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  }, p);
  await d.page.waitForTimeout(700);
}

// 1. The approach, from the ground, standing at the foot and facing the steps.
await stand({ x: at.x, y: at.y + 2, heading: "n" });
await d.shot(`${OUT}/sky-approach.png`);

// 2. Up. Through the real transition rather than by writing the layer — this is
//    also the only end-to-end check that ACT offers the climb at all.
await stand({ x: at.x, y: at.y + 1, heading: "n" });
await d.page.keyboard.press("Space"); // ACT
await d.page.waitForTimeout(500);
const after = await d.liveSave();
console.log(`after ACT: layer ${after.player.layer} @ ${Math.round(after.player.x)},${Math.round(after.player.y)}`);
await d.shot(`${OUT}/sky-head.png`);

// 3. The parting, seen from its far edge — the way home from across a field.
await stand({ x: at.x, y: at.y - 7, layer: "sky" });
await d.shot(`${OUT}/sky-parting.png`);

// 4. The open plane, well away from anything.
await stand({ x: at.x + 40, y: at.y + 40, layer: "sky" });
await d.shot(`${OUT}/sky-plane.png`);

// 5. Sidra, at home. THE QUESTION: does anybody live up here, and does finding
//    her read as walking into somebody's place rather than as a spawn? Stood one
//    tile south of her, which is where you would end up walking to her.
const home = cosmosHome(seed, spot);
console.log(`her place @ ${home.x},${home.y} — ${Math.round(Math.hypot(home.x - at.x, home.y - at.y))} tiles from the steps`);
await stand({ x: home.x, y: home.y + 1, layer: "sky" });
await d.page.waitForTimeout(600); // one tick of meeting her
await d.shot(`${OUT}/sky-home.png`);
const met = await d.liveSave();
const her = met.villagers.find((v: { id: string }) => v.id === "cosmos");
console.log(her ? `met her: layer ${her.layer} @ ${her.x},${her.y}` : "she was not there — check updateCosmos");
// And what she says, which is her own bank and not a shower's.
await d.page.keyboard.press("e"); // talk to whoever is nearest
await d.page.waitForTimeout(400);
await d.shot(`${OUT}/sky-home-talk.png`);

// 6. And after dark, because the sky is outdoors and the clock has to reach it.
const night = await drive({ seed: { wood: 500 }, time: "2026-07-24T23:30:00" });
await night.reseed(
  (q: Place) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.player.x = q.x;
    w.player.y = q.y;
    w.player.layer = "sky";
    w.player.target = null;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  },
  { x: at.x, y: at.y - 4 },
);
await night.page.waitForTimeout(700);
await night.shot(`${OUT}/sky-night.png`);
await night.browser.close();

await d.browser.close();
console.log(`wrote ${OUT}/sky-*.png`);
