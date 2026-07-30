// Photograph the world at MAP scale — hundreds or thousands of tiles at a time.
//
//   npx tsx scripts/shot-map.mts [outdir]      # no dev server needed
//
// WHY THIS IS IN THE REPO, alongside shot-biomes.mts and for the same reason:
// terrain bugs at world scale are invisible from inside the game, because the
// camera shows about forty tiles and every bug here is bigger than that. The
// wallpaper bug (channels as ruled pencil lines at even spacing) was found on a
// render like this one and could not have been found any other way. So was the
// scatter's diagonal bug — every lattice cell with mx === my placed its body at
// exactly 45°, because the jitter took `hash2(mx,my)` and `hash2(my,mx)` and
// those are the same number on the diagonal.
//
// TWO VIEWS, AND YOU WANT BOTH:
//
//   • The far field (3000+ tiles, 3 tiles/px) answers "is there a grain, a
//     lattice, a repeat" — anything that follows the world grid shows up as a
//     pattern your eye catches instantly and no test will ever fail on.
//   • The near field (250 tiles, 1 tile/px) answers "does a coastline read as a
//     coastline" — bays, headlands, an unbroken beach. The far field is useless
//     for this; at 3 tiles/px every body is a blob.
//
// `byKind` recolours by water KIND rather than by tile, which is the only way to
// tell a sea from a big lake — they are the same blue on the map otherwise, and
// "where are the seas" is exactly the question you will have.
//
// GOTCHA: this imports the real generator, so it is slow (about a minute for the
// set below). It is not a test and asserts nothing; it exists to be LOOKED at.

import zlib from "node:zlib";
import fs from "node:fs";
import { generatedTile, biomeAt, waterKindAt } from "../src/sim/world.ts";
import { tileDef } from "../src/content/tiles.ts";
import { biomeDef } from "../src/content/biomes.ts";
import { biomeSkin } from "../src/render/palette.ts";
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
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(td) : crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}
let T: number[] | null = null;
function crc32(buf: Buffer) {
  if (!T) { T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (const b of buf) c = T![(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));

const KIND: Record<string, string> = {
  sea: "#1b4f8a", lake: "#3aa0d8", river: "#7fc4e8", stream: "#b6e0f2", pond: "#d8f0fa",
};
function render(name: string, seed: number, spot: HomesteadSpot, half: number, step: number, byKind = false) {
  const n = Math.floor((half * 2) / step);
  const rgb = new Uint8Array(n * n * 3);
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const x = -half + px * step;
      const y = -half + py * step;
      const id = generatedTile(seed, spot, x, y);
      const k = byKind ? waterKindAt(seed, spot, x, y) : null;
      const def = biomeSkin(tileDef(id), id, biomeDef(biomeAt(seed, spot, x, y)));
      const [r, g, b] = hex(k ? KIND[k] : def.color);
      const i = (py * n + px) * 3;
      rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b;
    }
  }
  fs.writeFileSync(`${OUT}/${name}.png`, png(n, n, rgb));
}

const OUT = process.argv[2] ?? ".";

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // Far field: 6000 tiles across, 3 tiles per pixel. Big enough that a lattice
  // in the sea scatter would be unmissable.
  render("kind-far-3", 3, "forest", 3000, 3, true);
  render("kind-mid-3", 3, "forest", 700, 1, true);
  render("map-mid-3", 3, "forest", 700, 1);
  render("map-coast-3", 3, "forest", 250, 1);
  render("map-town-riverside", 3, "riverside", 90, 1);
}
main();
