// Stand next to a stump and a log and photograph them.
//
//   npx tsx scripts/shot-deadwood.mts [outdir]    # needs `npm run dev` running
//
// WHY THIS EXISTS when shot-biomes.mts already photographs every region. Deadwood
// is RARE on purpose — about one cell in a thousand, and only in three regions —
// so waiting for one to wander into a biome swatch is not a loop you can iterate
// art on. Three passes of this file's own art were wrong in ways only visible at
// pixel scale (a plank, a T-shaped crack, moss that read as grass behind the
// log), and every one of them was found in a second by looking at a photograph
// of the actual thing. Rare content needs an aimed camera or it does not get
// looked at.
//
// It asks the REAL generator where the deadwood is, for the same reason
// shot-biomes.mts asks the real `biomeAt`: a second opinion about where a stump
// is would photograph the wrong tile and report it as the right one.
//
// THE GOTCHA IT INHERITS from shot-biomes.mts: the seed is whatever onboarding
// rolled, so the deadwood is somewhere different every run. That is a feature —
// art that only reads on one seed does not read — but "it looked right last time"
// proves nothing.
//
// It stands three tiles SOUTH of what it found, so the player sprite is not
// parked on top of the thing being photographed.
import { drive } from "./drive.mjs";
import { biomeAt, generatedTile } from "../src/sim/world.ts";
import { STUMP, LOG } from "../src/content/tiles.ts";
import type { HomesteadSpot } from "../src/sim/types.ts";

const OUT = process.argv[2] ?? ".";
const d = await drive({ seed: { wood: 500 } });
const save = await d.save();
const seed: number = save.seed;
const spot: HomesteadSpot = save.homestead.spot;

/** Spiral out until a cell of `want` turns up with the other kind nearby. */
function find(want: number): { x: number; y: number } | null {
  for (let r = 8; r < 400; r += 1) {
    for (let a = 0; a < 240; a++) {
      const th = (a / 240) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * r);
      const y = Math.round(Math.sin(th) * r);
      if (generatedTile(seed, spot, x, y) === want) return { x, y };
    }
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

for (const [name, id] of [
  ["stump", STUMP],
  ["log", LOG],
] as const) {
  const at = find(id);
  if (!at) {
    console.log(`${name}: none found`);
    continue;
  }
  await standAt({ x: at.x, y: at.y + 3 });
  await d.shot(`${OUT}/dead-${name}.png`);
  console.log(`${name} @ ${at.x},${at.y} — ${biomeAt(seed, spot, at.x, at.y)}`);
}

await d.browser.close();
