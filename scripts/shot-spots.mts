// Photograph the three HOMESTEAD SPOTS side by side, same seed, close up.
//
//   npx tsx scripts/shot-spots.mts <outdir> [seed...]   # no dev server needed
//
// The spots each promise a piece of terrain within sight of your plot — a river
// past the garden, a treeline where the meadow gives out, a shore you can walk
// to. Nothing asserts that promise; it is a thing you can only LOOK at, and the
// whole reason the promise exists is that the old spots quietly did nothing.
// This is the check. Three panels, one seed: if they do not read as three
// different places, the spot has stopped meaning anything again.
//
// Close enough that individual BUILDINGS read — the town's walls and doors come
// from `world.build`, so this is the world you would actually arrive in, not raw
// terrain. Frame it as the onboarding preview does, or it answers a question the
// card is not asking.
import zlib from "node:zlib";
import fs from "node:fs";
import { newWorld } from "../src/sim/game.ts";
import { tileAt, tileKey, biomeAt } from "../src/sim/world.ts";
import { tileDef, TREE } from "../src/content/tiles.ts";
import { biomeDef } from "../src/content/biomes.ts";
import { biomeSkin, mixHex } from "../src/render/palette.ts";
import type { HomesteadSpot } from "../src/sim/types.ts";

function png(w: number, h: number, rgb: Uint8Array) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.subarray(y * w * 3, (y + 1) * w * 3).forEach((v, i) => (raw[y * (w * 3 + 1) + 1 + i] = v));
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (s: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number];

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "coast"];
const HALF = 48;  // tiles from the homestead to the frame edge
const PX = 5;     // screen pixels per tile
const GUTTER = 8;

function sheet(out: string, seed: number) {
  const n = HALF * 2 * PX;
  const w = n * SPOTS.length + GUTTER * (SPOTS.length - 1);
  const rgb = new Uint8Array(w * n * 3).fill(20);

  SPOTS.forEach((spot, panel) => {
    const world = newWorld({ name: "Preview", form: "scholar", spot, seed });
    const ox = world.homestead.originX;
    const oy = world.homestead.originY;
    const x0 = panel * (n + GUTTER);

    for (let ty = 0; ty < HALF * 2; ty++) {
      for (let tx = 0; tx < HALF * 2; tx++) {
        const x = ox - HALF + tx;
        const y = oy - HALF + ty;
        const id = tileAt(world, x, y);
        const bio = biomeDef(biomeAt(seed, spot, x, y));
        const def = biomeSkin(tileDef(id), id, bio);
        // `biomeSkin` only tints GROUND, so a pine and a meadow oak come out the
        // same colour here — but in game the renderer tints the CROWN, which is
        // most of what says which wood you are in. Do the same, or the treeline
        // is invisible on the map and you conclude wrongly that it isn't there.
        let c = hex(id === TREE ? mixHex(def.color, bio.crown) : def.color);
        // Buildings on top of the ground they stand on, so the town reads as a
        // town rather than as a patch of plank-coloured floor.
        if (world.build[tileKey(x, y)]) c = [58, 44, 38];
        // Your plot.
        if (Math.abs(x - ox) <= 1 && Math.abs(y - oy) <= 1) c = [255, 60, 60];

        for (let py = 0; py < PX; py++) {
          for (let px = 0; px < PX; px++) {
            const i = ((ty * PX + py) * w + x0 + tx * PX + px) * 3;
            rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
          }
        }
      }
    }
  });
  fs.writeFileSync(out, png(w, n, rgb));
  console.log(out, `${w}x${n}  ${SPOTS.join(" | ")}`);
}

const OUT = process.argv[2] ?? ".";
for (const seed of process.argv.slice(3).map(Number)) sheet(`${OUT}/spots-close-${seed}.png`, seed);
