// Stand in every biome and photograph it.
//
//   npx tsx scripts/shot-biomes.mts [outdir]     # needs `npm run dev` running
//
// WHY THIS IS IN THE REPO. Every visual bug biomes shipped with was invisible to
// the test suite and obvious within one second of looking at a screenshot — the
// tint bleeding onto water and paving, single-cell ponds coming out as hard
// squares, a fen 1.3% under water while claiming 10%, and pines that were only a
// darker meadow. 842 unit tests were happy with all four. So this exists for the
// same reason scripts/drive.mjs does: the gotchas cost real time to find, and
// rebuilding the harness per session is how you stop bothering to look.
//
// Run it after ANY change to content/biomes.ts, the field in sim/world.ts, or the
// tinting in render/palette.ts. It writes biome-<id>.png per region plus
// biome-border.png, which is where banding and seams show up if they are going to.
//
// It is .mts and needs tsx because it imports the real `biomeAt` from src. That is
// deliberate: reimplementing the field here to find a fen would be a second
// opinion about where the fen is, and the one on screen would be the wrong one.
//
// THE GOTCHAS PARTICULAR TO THIS SCRIPT (drive.mjs has its own list):
//
//   • The seed is whatever onboarding rolled, so the biome layout differs every
//     run. That is a feature — a shape that only looks right on one seed isn't
//     right — but it means "the fen looked fine yesterday" proves nothing.
//   • Water can be anywhere, so a candidate spot has to be checked for it. The
//     first version of this script photographed the ocean and reported it as the
//     scrub. Hence the wetness check below.
//
//     (This used to read "a riverside town is open water from x = -13 westward
//     WITHOUT LIMIT", which stopped being true when the sea became finite and
//     stopped being nearly true when seas were scattered across the whole world.
//     The check was always the real defence; the geography note was never load
//     bearing, and a stale one is worse than none.)
//   • Photograph the MIDDLE of a region, not the edge, or you learn nothing about
//     what the place looks like. Hence the margin check.
//   • The fen is legitimately wet, so it is exempt from the sea check — otherwise
//     the only region that generates water can never be found.

import { drive } from "./drive.mjs";
import { biomeAt, blossomCentre, generatedTile, redwoodCentre } from "../src/sim/world.ts";
import { BIOMES, type BiomeId } from "../src/content/biomes.ts";
import { WATER } from "../src/content/tiles.ts";
import type { HomesteadSpot } from "../src/sim/types.ts";

const OUT = process.argv[2] ?? ".";

/** The regions distance makes likely rather than the field rolling flat — they
 *  need a much longer spiral to find. See findBiome. */
const FAR = new Set<BiomeId>(["dusk", "glimmer", "glass", "granite"]);

// TIME=2026-07-24T23:00:00 to shoot the same regions after dark. Half of what a
// region is made of has a night value — bark, crowns, motes, orbs — and the
// default midday pin means none of it was ever photographed. Falls through to
// drive.mjs's own pin when unset.
const d = await drive({ seed: { wood: 500 }, ...(process.env.TIME ? { time: process.env.TIME } : {}) });
const save = await d.save();
const seed: number = save.seed;
const spot: HomesteadSpot = save.homestead.spot;
console.log(`seed ${seed}, ${spot}`);

/** Is this cell comfortably inside a region of `id`, and on dry land? */
function usable(id: BiomeId, x: number, y: number): boolean {
  for (const [dx, dy] of [
    [10, 0],
    [-10, 0],
    [0, 10],
    [0, -10],
  ]) {
    if (biomeAt(seed, spot, x + dx, y + dy) !== id) return false;
  }
  if (id === "fen") return true; // it is supposed to be wet
  let wet = 0;
  for (let dy = -8; dy <= 8; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      if (generatedTile(seed, spot, x + dx, y + dy) === WATER) wet++;
    }
  }
  return wet <= 20;
}

/** A tile well inside a region of this biome. Spirals outward so the shot is of
 *  the nearest example, which is also the one a player would actually meet. */
function findBiome(id: BiomeId): { x: number; y: number } | null {
  if (id === "blossom") return blossomCentre(seed, spot);
  // THE SITED WOODS. Searching for these by spiral would work and would be the
  // wrong tool: they are discs at known rings, so ask where they are. The giants
  // are asked for by walking outward through the instances until one of them has
  // them — about one in four does, and `usable`'s ten-tile neighbour check would
  // reject a five-tile disc even when standing in the middle of it.
  if (id === "redwoods" || id === "giants") {
    for (let i = 0; i < 8; i++) {
      const c = redwoodCentre(seed, spot, i);
      if (biomeAt(seed, spot, c.x, c.y) === id) return c;
      // The ordinary wood is anywhere off the heart of the same stand.
      if (id === "redwoods" && biomeAt(seed, spot, c.x + 12, c.y) === "redwoods") {
        return { x: c.x + 12, y: c.y };
      }
    }
    return null;
  }
  // THE FAR COUNTRY IS FAR (Phase 7a). Dusk, glimmer and glass are impossible
  // inside 200 tiles and only common past the plateau at 900, so the old 600-tile
  // spiral would have reported them missing on most seeds and been believed. The
  // near regions keep the short search on purpose: it returns the NEAREST example,
  // which is the one a player actually meets.
  // PHOTOGRAPH THE FAR ROWS AT THE PLATEAU, not at the frontier. Their colour is
  // their own strangeness (`regionSkin`), so the nearest dusk region is meant to
  // be a whisper — shooting it proves nothing about what the far country looks
  // like, and the first run of this script did exactly that and reported the tints
  // as broken.
  const from = FAR.has(id) ? 1200 : 30;
  const reach = FAR.has(id) ? 2600 : 600;
  for (let r = from; r < reach; r += 3) {
    for (let a = 0; a < 48; a++) {
      const th = (a / 48) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * r);
      const y = Math.round(Math.sin(th) * r);
      if (biomeAt(seed, spot, x, y) === id && usable(id, x, y)) return { x, y };
    }
  }
  return null;
}

/** Somewhere two regions actually meet, for judging the seam. Searched rather
 *  than guessed at — an earlier version stepped a fixed distance off a known
 *  biome and usually landed back in the same one, so the "border" screenshots
 *  were of no border at all. */
function findBorder(): { x: number; y: number } | null {
  for (let r = 30; r < 400; r += 2) {
    for (let a = 0; a < 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * r);
      const y = Math.round(Math.sin(th) * r);
      const here = biomeAt(seed, spot, x, y);
      // A neighbour a few tiles off being different means the edge is on screen
      // with the camera centred here.
      for (const [dx, dy] of [
        [8, 0],
        [-8, 0],
        [0, 8],
        [0, -8],
      ]) {
        if (biomeAt(seed, spot, x + dx, y + dy) !== here) return { x, y };
      }
    }
  }
  return null;
}

/** Put the player somewhere and let the frame settle. Goes through `reseed`
 *  because walking is camera-relative and beforeunload clobbers a plain write —
 *  see drive.mjs. */
async function standAt(at: { x: number; y: number }): Promise<void> {
  await d.reseed((p: { x: number; y: number }) => {
    const w = JSON.parse(localStorage.getItem("the-farm-save")!);
    w.player.x = p.x;
    w.player.y = p.y;
    w.player.target = null; // or they walk back to wherever they were going
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  }, at);
  await d.page.waitForTimeout(700);
}

for (const id of Object.keys(BIOMES) as BiomeId[]) {
  // The meadow is shot from the town, because for the meadow the thing worth
  // checking is that it looks EXACTLY as it always did — the whole live-save
  // guarantee is that the town's region is the identity row.
  const at = id === "meadow" ? { x: 0, y: 6 } : findBiome(id);
  if (!at) {
    console.log(`${id}: none within 600 tiles — try again, it's a different seed`);
    continue;
  }
  await standAt(at);
  await d.shot(`${OUT}/biome-${id}.png`);
  console.log(`${id} @ ${at.x},${at.y}`);
}

const border = findBorder();
if (border) {
  await standAt(border);
  await d.shot(`${OUT}/biome-border.png`);
  console.log(`border @ ${border.x},${border.y}`);
}

await d.browser.close();
console.log(`wrote ${OUT}/biome-*.png`);
