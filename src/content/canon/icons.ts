// Pixel-art UI icon grids, vendored from The Meadow (cozy_sprites
// `src/render/icons.ts`). Copied, never imported — cozy_sprites stays untouched.
//
// What comes across is the FORMAT — a 12×12 char grid with a tiny per-icon
// palette, one letter per colour, `.` for transparent — plus the two glyphs that
// game already drew and this one needs. Everything else in `src/content/icons.ts`
// is authored here, to the same rules, so the whole set reads as one hand.
//
// The Meadow's roster runs to ~48 icons, most of them pet-care UI: heart meters,
// six dice faces, a bandage, the rock-paper-scissors hands. Those are its game's
// nouns, not ours, and carrying them here would be dead weight. Copy a grid
// across when a screen actually needs it. The ones with an obvious future in a
// town-life game, when their screen exists: `moon`, `star`, `sparkle`, `stamp`,
// `book`, `speechdots`, `grave`, `question`.

export interface IconDef {
  /** Top-to-bottom rows of single-char palette keys. Short rows and short row
   *  lists are legal — the rasterizer treats missing cells as transparent. */
  rows: string[];
  palette: Record<string, string>;
}

/** The outline ink every icon in the set shares, so that a carrot and a pumpkin
 *  sitting next to each other in the satchel are outlined in the same colour.
 *
 *  This is the ONE value adapted rather than copied: The Meadow inks its icons
 *  in `#402e3a`, a warm near-black that matches its wood-and-cream frame. The
 *  Farm's `--ink` is cooler, and an icon set outlined in the sibling game's ink
 *  reads as slightly foreign against this game's panels. The grids below are
 *  verbatim; only what `k` means changed. */
export const INK = "#2b2540";

/** Grids copied verbatim from The Meadow. Palettes included as authored — at
 *  12px these are within a hair of the Farm's own `ripeColor` for the carrot and
 *  need no retint. */
export const CANON_ICONS = {
  // The Meadow's `rock`, used here for the stone material. Its docblock notes the
  // 9-row footprint (one blank row top, two bottom) was deliberate — it used to
  // stop after 7 and floated small in the top half. Kept, for the same reason.
  rock: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kswssssk..",
      ".kswwsssssk.",
      ".kssssssssk.",
      ".kssssssssk.",
      ".kssssssssk.",
      ".kssssssssk.",
      "..kssssssk..",
      "...kkkkkk...",
      "............",
      "............",
    ],
    palette: { k: INK, s: "#9a9cb0", w: "#c8cbe0" },
  },
  // The Meadow's `carrot` — and the shape this game's app icon was redrawn to
  // match (see the icon commit: a carrot is only legible if it tapers). Its
  // `#f08030` and the Farm's `ripeColor: "#f08c3a"` are indistinguishable at this
  // size, so the palette stands as authored rather than forking over four hex
  // digits.
  carrot: {
    rows: [
      "...g.g.g....",
      "...ggggg....",
      "....ggg.....",
      "...kkkkk....",
      "...koook....",
      "...kowok....",
      "...koook....",
      "....kok.....",
      "....kok.....",
      ".....k......",
      "............",
      "............",
    ],
    palette: { k: INK, o: "#f08030", w: "#ffb066", g: "#5aa85a" },
  },
} satisfies Record<string, IconDef>;

export type CanonIconName = keyof typeof CANON_ICONS;
