// Draw a piece of furniture in a pixel editor; get back the char grid.
//
//   npx tsx scripts/grid-from-png.mts <piece> <facing> <file.png> [--finish pine]
//   npx tsx scripts/grid-from-png.mts desk n ~/art/desk-n.png
//
// WHY THIS EXISTS. Furniture art is char grids in content/furnishings.ts, and
// that is the right format: content is data (CLAUDE.md), a grid diffs, and the
// size contract is unit-testable. What it is NOT is a way to draw. A piece is
// seventy hand-typed rows of `".kccccccck."`, counted by eye, and ROADMAP has
// said for a while that the constraint on the catalogue is authoring rather than
// rendering. DESIGN §The catalog now wants forms × sets, which is that cost
// multiplied by every set that ever ships.
//
// So: draw the piece, run this, paste the block. The FORMAT does not change at
// all — only how it gets produced.
//
// HOW TO DRAW ONE. Use the finish's own colours, not sentinels, so the thing on
// your canvas looks like the thing in the game:
//
//   the finish's `color`  -> `c`   (the face that catches the light)
//   the finish's `top`    -> `t`   (the top surface)
//   the finish's `shade`  -> `s`   (the turned-away face, the plinth)
//   #2b2540 (INK)         -> `k`   (the shared outline)
//   fully transparent     -> `.`
//   anything else         -> a literal, reported with its hex so you can name it
//
// Those colours are READ FROM content/skins.ts at run time, never copied here —
// the same argument shot-biomes.mts makes about importing the real `biomeAt`. A
// second opinion about what pale pine is would be one opinion too many, and the
// one on screen would be the wrong one. Draw in pale pine (`--finish undyed` for
// soft goods) and the grid comes out finish-agnostic, because `c`/`t`/`s` are
// questions rather than colours.
//
// NO ANTI-ALIASING, EVER. Every pixel must be exactly one of the colours above
// or a deliberate literal. A soft edge produces a spray of one-off literals, and
// the script says so loudly rather than inventing chars for them.
//
// WHAT IT CHECKS. The size contract, which is the bug the format is most prone
// to: a grid is `w * TILE` wide and `rise + h * TILE + height` tall, and being
// one row out slides the piece off its own tile by a pixel — the kind of wrong
// that survives a screenshot and turns up weeks later. The width must be exact.
// The height decides `rise`: anything taller than the footprint plus the piece's
// own height IS the rise, so the script reports the number to put in the row
// rather than making you derive it.
//
// It prints; it does not edit. Paste the block into content/furnishings.ts,
// where a human reviews it in a diff like every other piece of content.

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { FURNITURE, footprint, type Facing, type FurnitureId } from "../src/content/furniture";
import { SKINS, type SkinId } from "../src/content/skins";
import { INK } from "../src/render/furnishings";

/** The renderer's scene tile. Same 16 everything else in the art path uses. */
const TILE = 16;

/** Chars a literal may be given, in the order they get handed out.
 *
 *  `c`, `t`, `s` and `k` are the resolved ones and `.` is transparent, so they
 *  are absent. The order otherwise starts with the chars the existing table
 *  already uses for these jobs — `d` is a drawer pull's brass, `w` a warm wood
 *  tone, `p`/`q` bedding — so a converted piece tends to come out reading like
 *  the pieces around it. Rename them anyway if the piece wants better names. */
const LITERAL_CHARS = "dwpqabefghijlmnoruvxyz0123456789";

interface Png {
  width: number;
  height: number;
  /** RGBA, four bytes per pixel, row-major. */
  rgba: Uint8Array;
}

/** Enough of a PNG decoder for a pixel editor's export, and no more.
 *
 *  Hand-rolled rather than a dependency: the project has four devDependencies
 *  and none of them read images, and this is 8-bit non-interlaced PNG — a
 *  header, an inflate, and five filter cases. Adding a package to the tree to
 *  avoid writing the Paeth predictor is the wrong trade for one dev script. */
function decodePng(buf: Buffer): Png {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < SIG.length; i++) {
    if (buf[i] !== SIG[i]) throw new Error("not a PNG file");
  }

  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let alphas: Uint8Array | null = null;
  const idat: Buffer[] = [];

  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len; // length + type + data + crc
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") palette = new Uint8Array(data);
    else if (type === "tRNS") alphas = new Uint8Array(data);
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
  }

  if (depth !== 8) {
    throw new Error(`bit depth ${depth} unsupported — export 8 bits per channel`);
  }
  if (interlace !== 0) throw new Error("interlaced PNG unsupported — export without Adam7");
  // 6 = RGBA, 2 = RGB, 3 = indexed, 0 = greyscale. Aseprite writes 6 by default.
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 1;
  if (![0, 2, 3, 6].includes(colorType)) {
    throw new Error(`colour type ${colorType} unsupported — export as 32-bit RGBA`);
  }
  if (colorType === 3 && !palette) throw new Error("indexed PNG with no palette chunk");

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const flat = new Uint8Array(height * stride);

  // Undo the per-scanline filters. Each row is prefixed with a filter byte and
  // predicts from the pixel to its left (a), the row above (b), and above-left
  // (c) — all in ALREADY-UNFILTERED bytes, which is why this reads back out of
  // `flat` rather than out of `raw`.
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[rp + x];
      const a = x >= channels ? flat[y * stride + x - channels] : 0;
      const b = y > 0 ? flat[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? flat[(y - 1) * stride + x - channels] : 0;
      let v: number;
      switch (filter) {
        case 0:
          v = cur;
          break;
        case 1:
          v = cur + a;
          break;
        case 2:
          v = cur + b;
          break;
        case 3:
          v = cur + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`unknown scanline filter ${filter}`);
      }
      flat[y * stride + x] = v & 0xff;
    }
    rp += stride;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (colorType === 6) {
      rgba.set(flat.subarray(i * 4, i * 4 + 4), o);
    } else if (colorType === 2) {
      rgba.set(flat.subarray(i * 3, i * 3 + 3), o);
      rgba[o + 3] = 255;
    } else if (colorType === 0) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = flat[i];
      rgba[o + 3] = 255;
    } else {
      const idx = flat[i];
      rgba[o] = palette![idx * 3];
      rgba[o + 1] = palette![idx * 3 + 1];
      rgba[o + 2] = palette![idx * 3 + 2];
      rgba[o + 3] = alphas && idx < alphas.length ? alphas[idx] : 255;
    }
  }
  return { width, height, rgba };
}

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Collapse runs of identical rows the way the table already writes them.
 *
 *  Three or more, because that is where `...Array(n).fill(...)` starts being
 *  easier to read than the rows themselves — and because it is what a human
 *  authoring this file does by hand, so a converted piece and a typed one look
 *  the same in a diff. */
function emitRows(rows: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < rows.length; ) {
    let n = 1;
    while (i + n < rows.length && rows[i + n] === rows[i]) n++;
    if (n >= 3) {
      out.push(`        ...Array<string>(${n}).fill(${JSON.stringify(rows[i])}),`);
    } else {
      for (let k = 0; k < n; k++) out.push(`        ${JSON.stringify(rows[i])},`);
    }
    i += n;
  }
  return out;
}

function main(): void {
  const args = process.argv.slice(2);
  const finishFlag = args.indexOf("--finish");
  const finishId = (finishFlag >= 0 ? args[finishFlag + 1] : "pine") as SkinId;
  const positional = args.filter((a, i) => {
    if (a === "--finish") return false;
    if (finishFlag >= 0 && i === finishFlag + 1) return false;
    return !a.startsWith("--");
  });
  const [pieceId, facing, file] = positional;

  if (!pieceId || !facing || !file) {
    console.error("usage: grid-from-png.mts <piece> <facing> <file.png> [--finish pine]");
    process.exit(1);
  }
  const def = FURNITURE[pieceId as FurnitureId];
  if (!def) throw new Error(`no furniture row named "${pieceId}"`);
  if (!["n", "e", "s", "w"].includes(facing)) throw new Error(`facing must be n/e/s/w`);
  const skin = SKINS[finishId];
  if (!skin) throw new Error(`no finish named "${finishId}"`);
  if (!def.finishes.includes(skin.applies)) {
    // Not fatal — you can draw a wood piece in a cloth colour and the grid is
    // still correct, because the chars are questions. But it is almost always a
    // mistake, and a silent one.
    console.error(
      `warning: ${pieceId} takes ${def.finishes.join("/")} finishes; ${finishId} is ${skin.applies}`,
    );
  }

  const png = decodePng(readFileSync(file));
  const span = footprint(def, facing as Facing);

  // THE WIDTH IS NOT NEGOTIABLE and the height decides the rise. See the header.
  const wantW = span.w * TILE;
  if (png.width !== wantW) {
    throw new Error(
      `${pieceId} facing ${facing} must be ${wantW}px wide (${span.w} tiles); this is ${png.width}`,
    );
  }
  //
  // A WALL-MOUNTED piece has no footprint in the grid at all — it hangs on a
  // vertical face, so there is no tile depth to draw and its height is the whole
  // of it. It gets no rise either: there is nothing for the art to stand proud
  // of. Same rule furnishings.test.ts asserts, and getting it wrong is invisible
  // in a screenshot — the picture just hangs a few pixels low.
  const mounted = def.mount === "wall";
  let rise = 0;
  if (mounted) {
    if (png.height !== def.height) {
      throw new Error(
        `${pieceId} is wall-mounted, so its grid is exactly its ${def.height}px ` +
          `height — no tile depth; this is ${png.height}px tall`,
      );
    }
  } else {
    const floor = span.h * TILE + def.height;
    rise = png.height - floor;
    if (rise < 0) {
      throw new Error(
        `${pieceId} facing ${facing} must be at least ${floor}px tall ` +
          `(${span.h} tiles + ${def.height}px of height); this is ${png.height}`,
      );
    }
    // The occlusion machinery fades anything overhanging its cell by more than
    // half a tile, so a piece that rose further would make the player
    // see-through — `hides()` firing on furniture instead of on roofs.
    if (rise >= TILE / 2) {
      throw new Error(
        `${pieceId} rises ${rise}px above its footprint, and the limit is ${TILE / 2 - 1}px. ` +
          `Either the drawing is too tall or the piece's own \`height\` is too small.`,
      );
    }
  }

  // Resolve every pixel. The finish's three tones and the ink are the language;
  // everything else is a literal and gets counted, so a stray anti-aliased pixel
  // shows up as a colour used four times rather than hiding in the grid.
  const wanted = new Map<string, string>([
    [skin.color.toLowerCase(), "c"],
    [skin.top.toLowerCase(), "t"],
    [skin.shade.toLowerCase(), "s"],
    [INK.toLowerCase(), "k"],
  ]);
  const literals = new Map<string, { char: string; n: number }>();
  const rows: string[] = [];

  for (let y = 0; y < png.height; y++) {
    let row = "";
    for (let x = 0; x < png.width; x++) {
      const o = (y * png.width + x) * 4;
      if (png.rgba[o + 3] === 0) {
        row += ".";
        continue;
      }
      const h = hex(png.rgba[o], png.rgba[o + 1], png.rgba[o + 2]);
      const known = wanted.get(h);
      if (known) {
        row += known;
        continue;
      }
      let lit = literals.get(h);
      if (!lit) {
        const char = LITERAL_CHARS[literals.size];
        if (!char) throw new Error(`more than ${LITERAL_CHARS.length} literal colours`);
        lit = { char, n: 0 };
        literals.set(h, lit);
      }
      lit.n++;
      row += lit.char;
    }
    rows.push(row);
  }

  const pal = ["k: INK", ...[...literals].map(([h, l]) => `${l.char}: ${JSON.stringify(h)}`)];
  const key = facing === "s" ? "s" : facing;

  console.log(`    ${key}: {`);
  console.log(`      rows: [`);
  for (const line of emitRows(rows)) console.log(line);
  console.log(`      ],`);
  console.log(`      palette: { ${pal.join(", ")} },`);
  console.log(`    },`);

  // Everything below goes to stderr, so `> out.txt` gets a clean block.
  console.error(``);
  console.error(`${pieceId} ${facing}: ${png.width}×${png.height}, drawn in ${skin.name}`);
  console.error(`  footprint ${span.w}×${span.h}, height ${def.height}px`);
  if (rise > 0) console.error(`  rise: ${rise}   <- put this on the piece, not the grid`);
  if (literals.size) {
    console.error(`  literals:`);
    for (const [h, l] of literals) console.error(`    ${l.char} = ${h}  (${l.n} px)`);
    // A LOW PIXEL COUNT IS NOT THE SIGNAL — a brass drawer pull is three pixels
    // and perfectly deliberate, and flagging it cries wolf on every piece with a
    // detail in it. What anti-aliasing actually looks like is a CROWD of
    // near-identical colours, so the count of distinct literals is the thing
    // worth warning about.
    if (literals.size > 6) {
      console.error(
        `  ${literals.size} distinct literals — that usually means anti-aliasing,\n` +
          `  or a drawing made in a finish other than ${skin.name}.`,
      );
    }
  }
}

main();
