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
//    colour. The exception is anything meant to sit far back — the bird uses a
//    softer key so it recedes instead of punching a hole in the sky.
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

const FARM_PROPS = {
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
  tree: {
    rows: [
      ".....kkkkk.....",
      "...kklllggkk...",
      "..kllllgggggk..",
      ".klllllgggggggk",
      "kllllgggggggggk",
      "klllggggggggggk",
      "kllgggggggggggk",
      "klggggggggggggk",
      ".kgggggggggggk.",
      "..kgggggggggk..",
      "...kkgggggkk...",
      ".....kkkkk.....",
      "......ktbk.....",
      "......ktbk.....",
      ".....kttbbk....",
      ".....kttbbk....",
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
  // Left in the furrows by whoever was watering before you turned up.
  wateringcan: {
    rows: [
      "....kkkk.",
      "...km..mk",
      "kkkkmmmmk",
      ".kkkmmmmk",
      "..klmmmmk",
      "..klmmmmk",
      "..kmmmmmk",
      "..kkkkkkk",
    ],
    palette: { k: K, m: "#8fb3c4", l: "#bcd6e2" },
  },
  log: {
    rows: [
      "kkkkkkkkkkkkkk",
      "kbttttttttttbk",
      "kbtbttbtbttbbk",
      "kkkkkkkkkkkkkk",
    ],
    palette: { k: K, t: "#a97048", b: "#8a5a3c" },
  },
  // Crossing the sky. Inked in a soft slate rather than K: at three pixels
  // wide, full outline ink reads as a hole punched in the sky, not a bird.
  bird: {
    rows: [
      "d.....d",
      ".d...d.",
      "..ddd..",
    ],
    palette: { d: "#3f4a63" },
  },
} satisfies Record<string, PropDef>;

// Named off the literal so `PropName` is the union of the actual props, then
// re-exported as a plain record so the rasterizer can index it by a char key —
// the literal type knows each prop's exact palette letters, which is precisely
// what a `def.palette[ch]` lookup cannot promise.
const ALL = { ...CANON_PROPS, ...FARM_PROPS };
export type PropName = keyof typeof ALL;
export const PROPS: Record<PropName, PropDef> = ALL;
export type { PropDef };
