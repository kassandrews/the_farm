// Side-on scenery for the title screen — the Farm seen from the road, rather
// than from above the way the game itself draws it.
//
// It is a different projection on purpose. The world renderer is top-down, and
// a top-down field behind a title card is a green rectangle; the thing that
// says "this is a town you were sent to" is a horizon with buildings on it. The
// Meadow made the same call for its paddock, which is where the format and five
// of these props come from (`canon/props.ts`).
//
// FORMAT: rows of single-char palette keys, `.` transparent, width = the
// longest row. Data only; `src/render/props.ts` rasterizes and caches them.
// Grids are size- and palette-checked in `props.test.ts`.
//
// HOUSE RULES, the same ones `icons.ts` lists, for the same reasons:
//
//  - Light comes from the top left. Highlight letter on the upper-left face
//    (`l`/`R`), shade on the lower-right (`d`).
//  - Outline in `k` = INK and nothing else, so the scene shares one edge
//    colour. Anything that needs to sit further back gets a softer colour under
//    a DIFFERENT key rather than a softer `k` — `props.test.ts` checks it.
//  - Materials come from the tables that already own them: plank and stone from
//    `tiles.ts`, crown green from `render/palette.ts`. A title screen that
//    invented its own browns would be a second Farm.

import { CANON_PROPS, type PropDef } from "./canon/props";
import { INK as K } from "./canon/icons";

// Shared materials, quoted from the tables that own them so the title screen
// and the world agree about what wood is. Plank/stone are TILES[PLANK] and
// TILES[STONE] (color/top/shade); the crown greens are palette.ts SEASONLESS.
const PLANK_SHADE = "#a97e46";
const STONE = "#b8b2a6";
const STONE_LIT = "#c0bab0";
const STONE_SHADE = "#aaa498";
const CROWN = "#417a41";
const CROWN_LIT = "#57975a";
const TRUNK = "#7a5230";
const TRUNK_SHADE = "#5c3d22";
const DOOR = "#7a4a2c";
// The hall's roof is slate because it is civic. When a second, domestic
// building comes back, give it terracotta — the roof is what tells two
// buildings apart at this size, long before their doors or windows do.
const SLATE = "#6f7a92";
const SLATE_LIT = "#8a95ad";
// The barn, which is the terracotta-roof note above finally being taken up —
// except the warm colour went on the WALLS, where a barn keeps it, and the roof
// went dark so the two buildings still read apart at a glance.
const BARN_RED = "#b8483c";
const BARN_RED_LIT = "#cc5a4d";
const BARN_RED_SHADE = "#94382f";
// Dark and barely warm, but NOT near-black. Two misses on the way here: a mid
// brown read as thatch, a big soft dome sitting on the walls; and the
// correction went so dark it closed on INK, which welded the roof to its own
// outline and made it a hole in the sky. A roof has to be darker than the wall
// it caps and lighter than the line around it.
const BARN_ROOF = "#5b4a4e";
const BARN_ROOF_LIT = "#74605f";

const FARM_PROPS = {
  // The sun, and this entry SHADOWS the canon one — `ALL` spreads FARM_PROPS
  // over CANON_PROPS, so this is the sun the scene gets. The canon file is left
  // exactly as it was vendored (CLAUDE.md: cozy_sprites stays untouched, and so
  // does the copy of it), which is why this is an override and not an edit.
  //
  // The Meadow's sun is 12×11. Drawn at the scene's 2× — which is what stops it
  // being the finest-grained thing in a chunky picture — that is 24 logical px
  // of sun, and it dominated the sky and hung down into the barn's roof. This
  // is 9×9: the same disc, the same chunk size, less of it.
  sun: {
    rows: [
      "..ooooo..",
      ".oyyyyyo.",
      "oyylllyyo",
      "oylllllyo",
      "oylllllyo",
      "oylllllyo",
      "oyylllyyo",
      ".oyyyyyo.",
      "..ooooo..",
    ],
    palette: { o: "#f5c968", y: "#ffe9a8", l: "#fff4c9" },
  },
  // Town Hall: gabled, stone, flag on the ridge. Where the paperwork gets
  // stamped, so it is the biggest thing on the horizon and reads as civic
  // rather than agricultural — the joke of the title screen is that the
  // retirement town has an administration.
  townhall: {
    rows: [
      "..........k..........",
      "..........kfff.......",
      "..........kfff.......",
      "..........kf.........",
      "..........k..........",
      ".........kRk.........",
      "........kRRrk........",
      ".......kRRrrrk.......",
      "......kRRrrrrrk......",
      ".....kRRrrrrrrrk.....",
      "....kRRrrrrrrrrrk....",
      "...kRRrrrrrrrrrrrk...",
      "..kRRrrrrrrrrrrrrrk..",
      ".kRRrrrrrrrrrrrrrrrk.",
      "kkkkkkkkkkkkkkkkkkkkk",
      "klsssssssssssssssssdk",
      "klsssssssssssssssssdk",
      "klkwwwkskwwwkskwwwkdk",
      "klkwwwkskwwwkskwwwkdk",
      "klkwwwkskwwwkskwwwkdk",
      "klsssssssssssssssssdk",
      "klssssssknnnkssssssdk",
      "klssssssknnnkssssssdk",
      "kkkkkkkkknnnkkkkkkkkk",
    ],
    palette: {
      k: K,
      f: "#c0574c", // the flag, in the same red the bunting would be
      r: SLATE,
      R: SLATE_LIT,
      s: STONE,
      l: STONE_LIT,
      d: STONE_SHADE,
      w: "#a8d8e8",
      n: DOOR,
    },
  },
  // The errands board, on its two posts. Small on purpose: it is the one prop
  // here a returning player will recognise from the plaza, and recognising it
  // should feel like spotting something, not like being shown it.
  board: {
    // EVERYTHING here is centred on the 12-wide grid's midline, and it was not
    // the first time: the posts sat at cols 3–5 and 8–10 (centre 6.5 against
    // the board's 5.5) and the lower notice at cols 3–5 (centre 4). Both are a
    // pixel or two off, which is invisible in the grid and glaring at 2× — the
    // board looked like it was sliding off its own legs.
    //
    // ONE notice filling the board, not several pinned around it — and this
    // took three tries. Two notices side by side with a third under them is a
    // face: eyes and a mouth. Making the third one wider and shoving it left
    // did not help; ANY arrangement of separated pale rectangles on a dark
    // panel finds a face at this size, because that is what the eye is for.
    //
    // A single sheet has no isolated blobs to pair up. What sells it as paper
    // instead of a white rectangle is the RAGGED right edge on the lines of
    // writing — uneven line lengths are the one cue that reads as text at three
    // pixels a line, and it is the cue a centred, justified block throws away.
    rows: [
      "kkkkkkkkkkkkkk",
      "kbbbbbbbbbbbbk",
      "kbbppppppppbbk",
      "kbbpwwwwwwpbbk",
      "kbbppppppppbbk",
      "kbbpwwwwpppbbk",
      "kbbppppppppbbk",
      "kbbpwwwwwwpbbk",
      "kbbppppppppbbk",
      "kbbbbbbbbbbbbk",
      "kkkkkkkkkkkkkk",
      "...ktk..ktk...",
      "...ktk..ktk...",
      "...ktk..ktk...",
      "...ktk..ktk...",
      "...ktk..ktk...",
    ],
    // `w` is a line of writing, too small to read — which is the point. The
    // errands on it are whatever the town needs this week and the title screen
    // must not appear to be promising any of them.
    palette: { k: K, b: "#c2a071", p: "#efe6cf", w: "#b9ad90", t: PLANK_SHADE },
  },
  // The barn: the domestic half of the horizon, and the reason the hall reads as
  // civic at all. One building alone is just a building; a barn beside it is the
  // contrast that says the slate-roofed one is an office.
  //
  // The Meadow's barn (`canon/props.ts` names it as one of the three grids that
  // wear their own ink) is the source of the shape, re-inked in K and rebuilt
  // taller: theirs is 24×11, which next to a 24-row hall is a shed. This is
  // 23×18, gambrel — the upper slope shallow, the lower one steep, which is the
  // roof that says "barn" before the colour does.
  //
  // Red walls, DARK roof, not red-on-red. The hall's note above calls the roof
  // the thing that tells two buildings apart at this size, and it is right: a
  // red roof over red walls is one red mass with a door in it.
  barn: {
    rows: [
      ".........kkkkk.........",
      ".......kRRrrrrrk.......",
      ".....kRRrrrrrrrrrk.....",
      "...kRRrrrrrrrrrrrrrk...",
      "..kRRrrrrrrrrrrrrrrrk..",
      ".kRRrrrrrrrrrrrrrrrrrk.",
      "kRRrrrrrrrrrrrrrrrrrrrk",
      "kkkkkkkkkkkkkkkkkkkkkkk",
      "kBbbbbbbbbknnkbbbbbbbdk",
      "kBbbbbbbbbknnkbbbbbbbdk",
      "kBbbbbbbbbkkkkbbbbbbbdk",
      "kBbbbbbbbbbbbbbbbbbbbdk",
      "kBbbbbbkkkkkkkkkbbbbbdk",
      "kBbbbbbknnnwnnnkbbbbbdk",
      "kBbbbbbknnnwnnnkbbbbbdk",
      "kBbbbbbknnnwnnnkbbbbbdk",
      "kBbbbbbknnnwnnnkbbbbbdk",
      "kkkkkkkkkkkkkkkkkkkkkkk",
    ],
    // `w` is the seam between the two door leaves, and it is the only white in
    // the barn — the one cue that reads as DOORS rather than as a dark hole. It
    // was a lintel across the top as well, which drew a white T.
    palette: {
      k: K,
      r: BARN_ROOF,
      R: BARN_ROOF_LIT,
      b: BARN_RED,
      B: BARN_RED_LIT,
      d: BARN_RED_SHADE,
      n: DOOR,
      w: "#f7ecd8",
    },
  },
  // There was a homestead cabin here and it is gone. Its chimney was drawn
  // rising off the LEFT SLOPE of the roof, which reads fine as a silhouette and
  // falls apart the moment you look at the join — a stack floating a pixel off
  // the roofline. A house is worth redrawing properly (chimney through the
  // ridge, or set into a gable end) rather than shipping the version that only
  // works if nobody looks; until then the horizon is a civic building in a
  // field, which is the better joke anyway.
  //
  // A tree in profile. The Meadow's is the right shape but wears its own warm
  // ink; this is the same silhouette re-inked and re-greened to match the
  // crowns the world renderer draws.
  //
  // Redrawn from 15×16 down to 13×14. The title screen draws everything at one
  // scale now, so the tree can only be sized by its GRID, and at 15×16 it stood
  // two-thirds the height of the town hall — which made the hall look like a
  // bungalow in a forest rather than the biggest thing in town.
  tree: {
    rows: [
      "....kkkkk....",
      "..kkllgggkk..",
      ".klllggggggk.",
      "klllggggggggk",
      "kllgggggggggk",
      "klggggggggggk",
      "kgggggggggggk",
      ".kgggggggggk.",
      "..kgggggggk..",
      "....kkkkk....",
      ".....ktbk....",
      ".....ktbk....",
      "....kttbbk...",
      "....kttbbk...",
    ],
    palette: { k: K, g: CROWN, l: CROWN_LIT, t: TRUNK, b: TRUNK_SHADE },
  },
  // Two leaves and a stem. Sized to be legible at 2× on a phone, which is why
  // it is four rows and not a single green pixel.
  seedling: {
    rows: [
      "l...l",
      ".lgl.",
      "..g..",
      "..g..",
    ],
    palette: { g: "#5a8a3a", l: "#7fc45a" },
  },
  // There was a fallen LOG lying in the field and it is gone with the birds. On
  // a lawn between a town hall and a barn it did not read as a fallen tree — it
  // read as a brown box someone had left out, because nothing else in the
  // picture is lying down.
  //
  // There were two BIRDS crossing the sky here, and they are gone. Three pixels
  // is not enough to draw flight: they read as dashes sliding sideways, and a
  // bobbing dash is worse than an empty sky. The clouds already carry the
  // ambient motion the screen needs.
} satisfies Record<string, PropDef>;

// Named off the literal so `PropName` is the union of the actual props, then
// re-exported as a plain record so the rasterizer can index it by a char key —
// the literal type knows each prop's exact palette letters, which is precisely
// what a `def.palette[ch]` lookup cannot promise.
const ALL = { ...CANON_PROPS, ...FARM_PROPS };
export type PropName = keyof typeof ALL;
export const PROPS: Record<PropName, PropDef> = ALL;
export type { PropDef };
