// Pixel-art UI icons — the whole interface's supply of them, and the reason no
// emoji appear in it. An emoji is somebody else's art direction: it arrives in
// the system font, changes shape per platform, and on iOS it is glossy 3D sitting
// on top of a game drawn at 12 pixels. These are drawn to the same rules as the
// world sprites, so the satchel and the field agree about what a carrot is.
//
// FORMAT (vendored from The Meadow — see `canon/icons.ts`): a 12×12 grid of
// single-char palette keys, `.` transparent, one small palette per icon. Data
// only; `src/render/icons.ts` rasterizes and caches them.
//
// HOUSE RULES for adding one, all of them learned by breaking them:
//
//  - Light comes from the top left, as it does everywhere else in this game. The
//    highlight letter goes on the upper-left face, the shade on the lower-right.
//  - Outline in `k` (= INK) and nothing else, so a row of icons shares an edge
//    colour. An icon with its own outline ink reads as pasted in from elsewhere.
//  - Fill the cell. A glyph that stops after seven rows floats small next to its
//    neighbours — The Meadow hit this with its rock and wrote the note we
//    inherited. Aim for rows 1-10 at minimum.
//  - Produce takes its colours from `crops.ts` (`ripeColor` / `ripeShade`), never
//    a fresh hex. The crop table is the source of truth for what a tomato looks
//    like; two sources of truth means the satchel drifts from the field.

import { CANON_ICONS, INK as K, type IconDef } from "./canon/icons";

// Shared material palettes. Spelled out once because an icon set whose planks are
// three different browns doesn't look like a set — it looks like a collection.
const WOOD = "#a87c4a";
const WOOD_DARK = "#8a5f34";
const STEEL = "#b9bcc3";
const STEEL_LIT = "#eef0f4";
const STEEL_DARK = "#8b8f97";
// Cloth is pink because cloth is the one thing you cannot gather (items.ts): it
// is bartered for, and it should not read as another shade of the browns and
// greys the world hands you for free. The cushion and the rug inherit it, being
// made of it.
const CLOTH = "#c06a8a";
const CLOTH_LIT = "#e0a0b0";
const CLOTH_DARK = "#a04a6a";
// Brass, for drawer pulls and a lamp shade — the same metal the world lamp is
// made of, so a knob and a lamp head are recognisably the same stuff.
const BRASS = "#9c7a2c";
// Plant yellow, for the bulldozer and nothing else. Deliberately not the brass or
// the lamp flame: those are warm light, this is paint, and the one machine in a
// set of hand tools should not look like it was forged by the same people.
const DOZER = "#e8a92c";
// Glass, shared by the window icon and the bulldozer's cab. One hex, because a
// pane on a machine and a pane in a wall are the same substance and an icon set
// that disagrees about that looks like two people drew it.
const GLASS = "#7fa8cc";
const FLAME = "#ffcf7a";

const FARM_ICONS = {
  // --- Act tools ------------------------------------------------------------
  // A spade, not the pickaxe the emoji used: digging turns ground into soil, and
  // the pick belongs to ore, forty tiles down. Two jobs, two tools.
  spade: {
    rows: [
      "...kkkkkk...",
      "...kbbbbk...",
      "...kkbbkk...",
      "....kbbk....",
      "....kbbk....",
      "....kbbk....",
      ".kkkkkkkkkk.",
      ".kwsssssssk.",
      ".kssssssssk.",
      "..kssssssk..",
      "...kkkkkk...",
      "............",
    ],
    palette: { k: K, b: WOOD, s: STEEL, w: STEEL_LIT },
  },
  // A basket with an open handle — the arc is outline only, so whatever is behind
  // the button shows through it and it reads as a handle rather than a lid.
  basket: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kk....kk..",
      ".kk......kk.",
      "kkkkkkkkkkkk",
      "kbwbwbwbwbwk",
      "kwbwbwbwbwbk",
      "kbwbwbwbwbwk",
      ".kwbwbwbwbk.",
      "..kbwbwbwk..",
      "...kkkkkk...",
      "............",
    ],
    palette: { k: K, b: "#a86c3a", w: "#c99055" },
  },
  // Two leaves and a stem out of turned soil. Distinct from `seed` on purpose —
  // the tool is the act of planting, the item is the thing in your hand.
  seedling: {
    rows: [
      "............",
      "..kk....kk..",
      ".kgg.kk.ggk.",
      ".kgggssgggk.",
      ".kgggssgggk.",
      "..kkksskkk..",
      "....kssk....",
      ".kkkksskkkk.",
      ".kddddddddk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    palette: { k: K, g: "#7ec24f", s: "#5d9a37", d: WOOD_DARK },
  },
  droplet: {
    rows: [
      "............",
      ".....k......",
      "....kbk.....",
      "...kbbbk....",
      "..kbwbbbk...",
      "..kbwbbbk...",
      ".kbwbbbbbk..",
      ".kbbbbbbbk..",
      ".kbbbbbbbk..",
      "..kbbbbbk...",
      "...kkkkk....",
      "............",
    ],
    palette: { k: K, b: "#4a9fd8", w: "#a8dcf0" },
  },

  // --- Build tools ----------------------------------------------------------
  // Doubles as the wood material. Honest overlap: the Floor tool costs wood and
  // lays exactly this, so one glyph for both is information, not a shortcut.
  plank: {
    rows: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".kbbbbbbbbk.",
      ".kbgggbggbk.",
      ".kbbbbbbbbk.",
      ".kkkkkkkkkk.",
      ".kbbbbbbbbk.",
      ".kbggbgggbk.",
      ".kbbbbbbbbk.",
      ".kkkkkkkkkk.",
      "............",
    ],
    palette: { k: K, b: WOOD, g: WOOD_DARK },
  },
  // Brick courses with the joints OFFSET row to row. Aligned joints would draw a
  // grid, which is the per-cell-edges failure in miniature (see CLAUDE.md) — a
  // wall has to read as coursed masonry, not as graph paper.
  wall: {
    rows: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".krrrkrrrrk.",
      ".kkkkkkkkkk.",
      ".krrrrkrrrk.",
      ".kkkkkkkkkk.",
      ".krrrkrrrrk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
      "............",
    ],
    palette: { k: K, r: "#b8563c" },
  },
  door: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kddddddk..",
      "..kdppppdk..",
      "..kdppppdk..",
      "..kdddddyk..",
      "..kdppppdk..",
      "..kdppppdk..",
      "..kddddddk..",
      "..kddddddk..",
      "..kkkkkkkk..",
      "............",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK, y: "#e0c060" },
  },
  // --- The furnishing pass --------------------------------------------------
  // Eleven pieces, drawn to the set's existing rules: shared WOOD/CLOTH so the
  // bar doesn't read as a collection of three browns, `k` reserved for INK, and
  // each glyph carrying the ONE feature that tells it from its neighbour — the
  // stool's missing back, the desk's kneehole, the wardrobe's two doors, the
  // chest's lid rim. At twelve pixels there is room for exactly one such idea.
  stool: {
    rows: [
      "............",
      "...kkkkkk...",
      ".kkddddddkk.",
      ".kddddddddk.",
      ".kppppppppk.",
      "..kkkkkkkk..",
      "...k....k...",
      "...k....k...",
      "...k....k...",
      "...k....k...",
      "..kk....kk..",
      "............",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK },
  },
  bench: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kddddddddk.",
      ".kkkkkkkkkk.",
      "...k....k...",
      "kkkkkkkkkkkk",
      "kddddddddddk",
      "kppppppppppk",
      "kkkkkkkkkkkk",
      ".k........k.",
      ".k........k.",
      ".kk......kk.",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK },
  },
  sofa: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kcccccccck.",
      ".kcccccccck.",
      "kkkkkkkkkkkk",
      "kpkccckcckpk",
      "kpkccckcckpk",
      "kkkkkkkkkkkk",
      ".k........k.",
      ".kk......kk.",
      "............",
      "............",
    ],
    palette: { k: K, c: CLOTH, p: WOOD },
  },
  coffeetable: {
    rows: [
      "............",
      "............",
      "............",
      "kkkkkkkkkkkk",
      "kddddddddddk",
      "kppppppppppk",
      "kkkkkkkkkkkk",
      ".k........k.",
      ".k........k.",
      ".kk......kk.",
      "............",
      "............",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK },
  },
  desk: {
    rows: [
      "............",
      "kkkkkkkkkkkk",
      "kddddddddddk",
      "kppppppppppk",
      "kkkkkkkkkkkk",
      ".k...kkkkkk.",
      ".k...kdyddk.",
      ".k...kkkkkk.",
      ".k...kddddk.",
      ".k...kkkkkk.",
      ".kk..kkkkkk.",
      "............",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK, y: BRASS },
  },
  nightstand: {
    rows: [
      "............",
      "..kkkkkkkk..",
      "..kddddddk..",
      "..kkkkkkkk..",
      "..kddddddk..",
      "..kdyyyydk..",
      "..kkkkkkkk..",
      "..kddddddk..",
      "..kdyyyydk..",
      "..kkkkkkkk..",
      "..kk....kk..",
      "............",
    ],
    palette: { k: K, d: WOOD, y: BRASS },
  },
  cot: {
    rows: [
      "............",
      "............",
      "kkkkkkkkkkkk",
      "kcccccccccck",
      "kcccccccccck",
      "kcccccccccck",
      "kkkkkkkkkkkk",
      ".k........k.",
      ".kk......kk.",
      "............",
      "............",
      "............",
    ],
    palette: { k: K, c: CLOTH },
  },
  wardrobe: {
    rows: [
      ".kkkkkkkkkk.",
      ".kddddddddk.",
      ".kkkkkkkkkk.",
      "..kkkkkkkk..",
      "..kddkkddk..",
      "..kddkkddk..",
      "..kdykkydk..",
      "..kddkkddk..",
      "..kddkkddk..",
      "..kkkkkkkk..",
      "..kk....kk..",
      "............",
    ],
    palette: { k: K, d: WOOD, y: BRASS },
  },
  chest: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kddddddk..",
      ".kddddddddk.",
      ".kkkkkkkkkk.",
      ".kddddddddk.",
      ".kdddyydddk.",
      ".kddddddddk.",
      ".kppppppppk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    palette: { k: K, d: WOOD, p: WOOD_DARK, y: BRASS },
  },
  dresser: {
    rows: [
      "............",
      "............",
      "kkkkkkkkkkkk",
      "kddddddddddk",
      "kkkkkkkkkkkk",
      "kddyyddyyddk",
      "kkkkkkkkkkkk",
      "kddyyddyyddk",
      "kkkkkkkkkkkk",
      ".k........k.",
      "............",
      "............",
    ],
    palette: { k: K, d: WOOD, y: BRASS },
  },
  desklamp: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kbbbbbbk..",
      ".kbbbbbbbbk.",
      ".kffffffffk.",
      "..kkkkkkkk..",
      ".....kk.....",
      ".....kk.....",
      ".....kk.....",
      "..kkkkkkkk..",
      "..kddddddk..",
      "............",
    ],
    palette: { k: K, b: BRASS, f: FLAME, d: WOOD },
  },
  // A framed landscape. The frame is WOOD and the picture is not — same split
  // the world art makes, so the icon and the object agree about what a finish
  // would repaint.
  painting: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kdddddddddk",
      ".kdkkkkkkkdk",
      ".kdkaaaaakdk",
      ".kdkaammakdk",
      ".kdkambbmkdk",
      ".kdkbbbbbkdk",
      ".kdkkkkkkkdk",
      ".kdddddddddk",
      ".kkkkkkkkkk.",
      "............",
    ],
    palette: { k: K, d: WOOD, a: "#a8cfe8", m: "#8fb87a", b: "#6f9e5c" },
  },
  // Two panes with a mullion between them, because a run of windows joins into
  // one window and the icon should say so before the hint has to. Deep sill,
  // which is the one line that reads as "set into something thick" at 12px.
  window: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kdddddddddk",
      ".kdggkggggdk",
      ".kdggkggggdk",
      ".kdggkggggdk",
      ".kdddkddddek",
      ".kdggkggggdk",
      ".kdggkggggdk",
      ".kdddddddddk",
      ".kkkkkkkkkk.",
      "..kkkkkkkk..",
    ],
    palette: { k: K, d: WOOD, g: GLASS, e: "#a9cbe4" },
  },
  bed: {
    rows: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".kwwwkqqqqk.",
      ".kwwwkqqqqk.",
      ".kqqqqqqqqk.",
      ".kqqqqqqqqk.",
      ".kkkkkkkkkk.",
      ".kk......kk.",
      ".kk......kk.",
      "............",
      "............",
    ],
    palette: { k: K, w: "#fdf3e0", q: "#6a8fc0" },
  },
  table: {
    rows: [
      "............",
      "............",
      "............",
      "kkkkkkkkkkkk",
      "kwbbbbbbbbbk",
      "kkkkkkkkkkkk",
      "..kk....kk..",
      "..kk....kk..",
      "..kk....kk..",
      "..kk....kk..",
      "............",
      "............",
    ],
    palette: { k: K, b: WOOD, w: "#c49a68" },
  },
  chair: {
    rows: [
      "............",
      "...kkkkkk...",
      "...kbbbbk...",
      "...kbbbbk...",
      "...kbbbbk...",
      "...kbbbbk...",
      "..kkkkkkkk..",
      "..kbbbbbbk..",
      "..kkkkkkkk..",
      "...k....k...",
      "...k....k...",
      "............",
    ],
    palette: { k: K, b: WOOD },
  },
  // Two shelves with things ON them. An empty bookcase is four brown rectangles
  // and reads as the wall icon; the clutter is what makes it a shelf.
  shelf: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kbbbbbbbbk.",
      ".kbrrbggbbk.",
      ".kbrrbggbbk.",
      ".kkkkkkkkkk.",
      ".kbbbbbbbbk.",
      ".kbbyybbrrk.",
      ".kbbyybbrrk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    palette: { k: K, b: WOOD_DARK, r: "#c0492f", g: "#5aa85a", y: "#e0c060" },
  },
  cushion: {
    rows: [
      "............",
      "............",
      "...kkkkkk...",
      "..kcccccck..",
      ".kcccccccck.",
      "kccccttcccck",
      "kccccttcccck",
      ".kcccccccck.",
      "..kcccccck..",
      "...kkkkkk...",
      "............",
      "............",
    ],
    palette: { k: K, c: CLOTH, t: CLOTH_DARK },
  },
  // Flat, with fringe along the bottom — the fringe is the whole difference
  // between a rug and a tile you can't walk on.
  rug: {
    rows: [
      "............",
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".krrrrrrrrk.",
      ".krwwrrwwrk.",
      ".krwwrrwwrk.",
      ".krrrrrrrrk.",
      ".kkkkkkkkkk.",
      "..k.k.k.k...",
      "............",
      "............",
    ],
    palette: { k: K, r: "#b0566a", w: CLOTH_LIT },
  },
  // Costs ore, so the post and base are metal while the shade glows. The one icon
  // in the set that is its own light source, which is the point of it.
  lamp: {
    rows: [
      "............",
      "....kkkk....",
      "...kyyyyk...",
      "..kywyyyyk..",
      ".kyyyyyyyyk.",
      ".kkkkkkkkkk.",
      "....kppk....",
      "....kppk....",
      "....kppk....",
      "..kkkkkkkk..",
      "..kmmmmmmk..",
      "..kkkkkkkk..",
    ],
    palette: { k: K, y: "#ffd884", w: "#fff7dc", p: "#8a8c9a", m: "#6a6c7a" },
  },
  // "Take back down" — a bulldozer, blade first. It shares the build bar with
  // `undo`, which is why it isn't an arrow of any kind: the two were ↩ and ⟲
  // once, then a lifting arrow and a circular one, and both pairings were two
  // arrows in one row arguing about which one went backwards. A machine and an
  // arrow can't be confused for each other at 36px or at any other size.
  //
  // The blade is the whole point and gets the left edge to itself, because a
  // dozer read at this size IS a blade with something behind it. Yellow, which is
  // a colour nothing else in the icon set wears — it's the one piece of plant on
  // a homestead of hand tools, and it should look borrowed.
  takedown: {
    rows: [
      "............",
      "......kkkk..",
      "..kk..kwwk..",
      ".ksk..kwwk..",
      ".ksk.kkyykk.",
      ".kskkkyyyyyk",
      ".ksskyyyyyyk",
      ".ksskkkkkkkk",
      ".ksskddddddk",
      ".kssdwdwdwdk",
      ".kkkkkkkkkkk",
      "............",
    ],
    palette: { k: K, y: DOZER, w: GLASS, d: STEEL_DARK, s: STEEL },
  },

  // --- HUD ------------------------------------------------------------------
  // How far back the view is standing (ui/app.ts, render/zoom.ts). Four corner
  // brackets — a viewfinder, not a magnifying glass. A magnifier means "look
  // closer at this thing", which is a different promise: nothing is inspected
  // here and no detail is added, you simply see more or less ground.
  //
  // THE FRAME IS THE READOUT. The three differ only in how far apart the
  // brackets sit, so the button always shows the view you are currently in
  // rather than the one you would get by pressing it. That way round because
  // the control cycles — an icon promising the NEXT step would have to change
  // meaning at the end of the loop, and a button whose label lies once every
  // three taps is worse than one that simply reports.
  //
  // Brackets rather than a filled rectangle: at 12px a filled frame with a hole
  // in it reads as a window, and the gaps are what keep it reading as a crop
  // mark. They also let the three sizes stay distinguishable, which a nested
  // set of solid rectangles would not at this size.
  view_far: {
    rows: [
      "kkk......kkk",
      "k..........k",
      "k..........k",
      "............",
      "............",
      "............",
      "............",
      "............",
      "............",
      "k..........k",
      "k..........k",
      "kkk......kkk",
    ],
    palette: { k: K },
  },
  view_mid: {
    rows: [
      "............",
      ".kkk....kkk.",
      ".k........k.",
      ".k........k.",
      "............",
      "............",
      "............",
      "............",
      ".k........k.",
      ".k........k.",
      ".kkk....kkk.",
      "............",
    ],
    palette: { k: K },
  },
  view_near: {
    rows: [
      "............",
      "............",
      "..kkk..kkk..",
      "..k......k..",
      "..k......k..",
      "............",
      "............",
      "..k......k..",
      "..k......k..",
      "..kkk..kkk..",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  // Three bars: the one piece of interface iconography everyone already reads,
  // and 2px bars with 1px gaps so it survives at button size.
  menu: {
    rows: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".kkkkkkkkkk.",
      "............",
      ".kkkkkkkkkk.",
      ".kkkkkkkkkk.",
      "............",
      ".kkkkkkkkkk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  // A ruled journal, closed, spine to the left. Deliberately not an open book:
  // at button size an open book is two pale blobs with a crease, and it reads as
  // a bird. The rules ARE the icon — they are what says "somebody writes in
  // this" rather than "you may read this", which is the difference between a
  // notebook and a manual.
  notebook: {
    rows: [
      "............",
      ".kkkkkkkkkk.",
      ".kcpppppppk.",
      ".kcplllllpk.",
      ".kcpppppppk.",
      ".kcplllllpk.",
      ".kcpppppppk.",
      ".kcplllllpk.",
      ".kcpppppppk.",
      ".kcpppppppk.",
      ".kkkkkkkkkk.",
      "............",
    ],
    palette: { k: K, c: "#7a5a3a", p: "#efe4cf", l: "#9aa8bd" },
  },
  satchel: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kk....kk..",
      "kkkkkkkkkkkk",
      "kffffffffffk",
      "kffffffffffk",
      "kkkkkkkkkkkk",
      "kbbbbyybbbbk",
      "kbbbbbbbbbbk",
      "kbbbbbbbbbbk",
      ".kkkkkkkkkk.",
      "............",
    ],
    palette: { k: K, f: "#b8874a", b: "#a06f38", y: "#e0c060" },
  },
  // Undo: the counterclockwise ring, which is the shape every other piece of
  // software on the player's phone already uses for this. The angular arrow that
  // was here read as "back", and back is not what the button does — it takes a
  // stroke off the world, and the ring is the one glyph nobody has to be taught.
  //
  // Open at the top left with the head on that end, so the arm sweeps ANTI
  // clockwise. Clockwise is redo everywhere it appears, and half a ring is a
  // small enough cue that getting the direction wrong would be a real misread.
  undo: {
    rows: [
      "............",
      "...kk.......",
      "..kkkkkkk...",
      "...kk....kk.",
      "..........kk",
      ".k.........k",
      ".k.........k",
      ".kk.......kk",
      "..kk.....kk.",
      "...kkkkkkk..",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  // The four facings, for the rotate button — which does NOT say "rotate", it says
  // which way the next piece you place will point. That is the information the
  // player is short of, and a bent arrow meaning "turnable" would replace it with
  // something they can already see from the button's presence.
  //
  // Drawn once and mirrored by hand into the other three. Deliberately not one
  // arrow rotated in code: `ctx.rotate` on pixel art is the thing CLAUDE.md
  // forbids outright, and at this size the mirrors are four lines each.
  arrow_n: {
    rows: [
      "............",
      "............",
      ".....kk.....",
      "....kkkk....",
      "...kkkkkk...",
      "..kkkkkkkk..",
      ".....kk.....",
      ".....kk.....",
      ".....kk.....",
      ".....kk.....",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  arrow_s: {
    rows: [
      "............",
      "............",
      ".....kk.....",
      ".....kk.....",
      ".....kk.....",
      ".....kk.....",
      "..kkkkkkkk..",
      "...kkkkkk...",
      "....kkkk....",
      ".....kk.....",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  arrow_e: {
    rows: [
      "............",
      "............",
      "......k.....",
      "......kk....",
      "......kkk...",
      "..kkkkkkkk..",
      "..kkkkkkkk..",
      "......kkk...",
      "......kk....",
      "......k.....",
      "............",
      "............",
    ],
    palette: { k: K },
  },
  arrow_w: {
    rows: [
      "............",
      "............",
      ".....k......",
      "....kk......",
      "...kkk......",
      "..kkkkkkkk..",
      "..kkkkkkkk..",
      "...kkk......",
      "....kk......",
      ".....k......",
      "............",
      "............",
    ],
    palette: { k: K },
  },

  // --- Materials ------------------------------------------------------------
  // Ore's tool, and ore's icon. Tips raised above the head corners so it reads as
  // a pick rather than a hammer, which is the entire silhouette problem here.
  pickaxe: {
    rows: [
      "............",
      "...kkkkkk...",
      "..kwsssssrk.",
      ".kwsskbbksrk",
      ".kkk.kbbk.kk",
      ".....kbbk...",
      ".....kbbk...",
      ".....kbbk...",
      ".....kbbk...",
      ".....kbbk...",
      "......kk....",
      "............",
    ],
    palette: { k: K, s: STEEL, w: STEEL_LIT, r: STEEL_DARK, b: "#8a5a34" },
  },
  cloth: {
    rows: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".kcccccccck.",
      ".kcwwccwwck.",
      ".kcccccccck.",
      ".kkkkkkkkkk.",
      ".kddddddddk.",
      ".kddddddddk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    palette: { k: K, c: CLOTH, w: CLOTH_LIT, d: CLOTH_DARK },
  },
  // A nut and a washer. ONE glyph for every possible object the ground turns up,
  // exactly as items.ts keeps one row for all of it — the specific thing you
  // pulled out is a line of flavour, and then it is simply junk.
  junk: {
    rows: [
      "............",
      "...kk..kk...",
      "..kkwssskk..",
      ".kssssssssk.",
      "kkssskkssskk",
      "kkssskkssskk",
      ".kssssssssk.",
      "..kkssddkk..",
      "...kk..kk...",
      "............",
      "............",
      "............",
    ],
    palette: { k: K, s: "#9a9cb0", d: "#6a6c80", w: "#c8cbe0" },
  },
  // Three pips. Small, brown, non-committal — it decides what it is on the way
  // into the ground (items.ts), so it must NOT look like any one crop.
  seed: {
    rows: [
      "............",
      "............",
      "....kk......",
      "...kbbk.....",
      "...kbwk.....",
      "....kk......",
      ".kk....kk...",
      "kbbk..kbbk..",
      "kbwk..kbwk..",
      ".kk....kk...",
      "............",
      "............",
    ],
    palette: { k: K, b: "#8a5a34", w: "#b98a55" },
  },

  // --- Produce --------------------------------------------------------------
  // Colours are crops.ts `ripeColor` / `ripeShade`, per the house rule at the top
  // of this file. No crop is worth more than another (DESIGN §Materials), so no
  // icon here may be showier than its neighbours: same footprint, same amount of
  // highlight, nothing gilded.
  radish: {
    rows: [
      "...g.g.g....",
      "...ggggg....",
      "....ggg.....",
      "...kkkkk....",
      "..krrrrrk...",
      ".krwrrrrrk..",
      ".krrrrrrrk..",
      ".krrrrrrrk..",
      "..krrrrrk...",
      "...kttdk....",
      "....kkk.....",
      "............",
    ],
    palette: { k: K, r: "#e0566a", w: "#f08090", t: "#f7ece8", d: "#d8b8c0", g: "#5aa85a" },
  },
  potato: {
    rows: [
      "............",
      "............",
      "...kkkkkk...",
      "..kppppppk..",
      ".kpwppppppk.",
      "kppppdppppk.",
      "kpppppppppk.",
      "kppdpppppppk",
      ".kpppppdppk.",
      "..kppppppk..",
      "...kkkkkk...",
      "............",
    ],
    palette: { k: K, p: "#c9a06a", w: "#ddb98a", d: "#967043" },
  },
  wheat: {
    rows: [
      "............",
      "....kwwk....",
      "...kwwwwk...",
      "..kwwkkwwk..",
      "...kwwwwk...",
      "..kwwkkwwk..",
      "...kwwwwk...",
      "....kssk....",
      "..kkksskkk..",
      "....kssk....",
      "....kkkk....",
      "............",
    ],
    palette: { k: K, w: "#dcc06a", s: "#ab9044" },
  },
  peas: {
    rows: [
      "............",
      "............",
      "..kkkkkkkk..",
      ".kppppppppk.",
      "kpggpggpggpk",
      "kpggpggpggpk",
      "kpggpggpggpk",
      ".kppppppppk.",
      "..kkkkkkkk..",
      "............",
      "............",
      "............",
    ],
    palette: { k: K, p: "#5d9a37", g: "#9fd464" },
  },
  tomato: {
    rows: [
      "............",
      ".....g......",
      "...ggggg....",
      "..kkkkkkk...",
      ".krrrrrrrk..",
      "krwrrrrrrrk.",
      "krrrrrrrrrk.",
      "krrrrrrrrrk.",
      ".krrrrrrrk..",
      "..kkkkkkk...",
      "............",
      "............",
    ],
    palette: { k: K, r: "#e2503c", w: "#f0806c", g: "#5aa85a" },
  },
  // Ribs rather than a highlight — a plain orange dome at this size is the radish
  // in a different colour, and the ribs are what make it read as the pumpkin.
  pumpkin: {
    rows: [
      "............",
      ".....kk.....",
      ".....gg.....",
      "..kkkkkkkk..",
      ".kooooooook.",
      "koodoodoodok",
      "koodoodoodok",
      "koodoodoodok",
      ".koodoodook.",
      "..kkkkkkkk..",
      "............",
      "............",
    ],
    palette: { k: K, o: "#e08128", d: "#a85a17", g: "#5aa85a" },
  },
  kale: {
    rows: [
      "............",
      "..kk.kk.kk..",
      ".kggkggkggk.",
      ".kggggggggk.",
      ".kgsggggsgk.",
      ".kggggggggk.",
      "..kgggggk...",
      "...kgggk....",
      "....ksk.....",
      "....ksk.....",
      "....kkk.....",
      "............",
    ],
    palette: { k: K, g: "#4f8f5e", s: "#356a43" },
  },
  // Foraged, not grown, so it has no crops.ts row to take colours from — a redder
  // cap than any of the varieties, which is also how you tell at a glance that it
  // came up on its own.
  mushroom: {
    rows: [
      "............",
      "...kkkkkk...",
      "..krrwwrrk..",
      ".krwwrrrwwk.",
      "krrrrwwrrrrk",
      "krrrrrrrrrrk",
      ".kkkkkkkkkk.",
      "...kssssk...",
      "...kssssk...",
      "...kssssk...",
      "...kkkkkk...",
      "............",
    ],
    palette: { k: K, r: "#c0392f", w: "#f7ece0", s: "#e8dcc0" },
  },

} satisfies Record<string, IconDef>;

/** Every icon the interface can draw: the ones authored here plus the handful
 *  copied from The Meadow. */
export const ICONS: Record<string, IconDef> = { ...CANON_ICONS, ...FARM_ICONS };

export type IconName = keyof typeof FARM_ICONS | keyof typeof CANON_ICONS;

export function iconDef(name: IconName): IconDef {
  return ICONS[name];
}
