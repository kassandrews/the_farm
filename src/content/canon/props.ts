// Scenery grids VENDORED from The Meadow (cozy_sprites `src/render/props.ts`),
// copied character for character. Canon: cozy_sprites is finished and is never
// imported across repos, so the art comes over as data (CLAUDE.md §canon).
//
// Only the OUTLINE-FREE props are here, and that is deliberate rather than
// laziness. The Meadow inks everything in `#402e3a`, a warm brown; this game
// inks everything in `#2b2540`, a cool one (see canon/icons.ts INK). A prop
// carrying the other game's ink into a Farm scene reads exactly the way an
// emoji does among pixel icons — pasted in from somewhere else. Its sun, cloud,
// fence, flowers and tuft draw no outline at all, so they cross over unchanged
// and still belong. Anything with a `k` row (its tree, barn, scarecrow) gets
// redrawn in Farm ink over in `../props.ts` instead.
//
// FORMAT: rows of single-char palette keys, `.` transparent. Unlike the icons,
// props are whatever size the prop wants — width is the longest row.

export interface PropDef {
  rows: string[];
  palette: Record<string, string>;
}

export const CANON_PROPS = {
  // A warm pixel disk, brighter at the heart — no outline, it's made of light.
  sun: {
    rows: [
      "...oooooo...",
      "..oyyyyyyo..",
      ".oyyllllyyo.",
      "oyyllllllyyo",
      "oyllllllllyo",
      "oyllllllllyo",
      "oyllllllllyo",
      "oyllllllllyo",
      ".oyyllllyyo.",
      "..oyyyyyyo..",
      "...oooooo...",
    ],
    palette: { o: "#f5c968", y: "#ffe9a8", l: "#fff4c9" },
  },
  cloud: {
    rows: [
      "....wwwww.......",
      "..wwwwwwwww.ww..",
      ".wwwwwwwwwwwwww.",
      "wwwwwwwwwwwwwwww",
      ".wwwwww.wwwwww..",
    ],
    palette: { w: "#ffffff" },
  },
  // Tiles along the horizon. A repeated post is not the per-cell banding the
  // house rule forbids — a fence is genuinely made of repeated posts, and the
  // rail runs unbroken through them.
  fence: {
    rows: [
      "w........w..",
      "wwwwwwwwwwww",
      "w........w..",
      "wwwwwwwwwwww",
      "w........w..",
      "w........w..",
    ],
    palette: { w: "#9a7148" },
  },
  flowers: {
    // One correction to the vendored grid, and it is the only one in this file:
    // The Meadow's bottom row is TWELVE cells where the other four are eleven.
    // Its rasterizer sizes the canvas from the first row and silently drops the
    // overflow, so the bug never showed there — `props.test.ts` here counts the
    // rows and caught it on the first run. Trimmed to eleven, which is what the
    // art was always drawing.
    rows: [
      ".r...w...p.",
      "rrr.www.ppp",
      ".r.g.w.g.p.",
      ".g.g.g.g.g.",
      "ggggggggggg",
    ],
    palette: { g: "#5a9440", r: "#e06a7c", w: "#f6f1dc", p: "#c98add" },
  },
  tuft: {
    rows: [
      "g..g..g",
      ".g.g.g.",
      ".ggggg.",
    ],
    palette: { g: "#6aa348" },
  },
} satisfies Record<string, PropDef>;
