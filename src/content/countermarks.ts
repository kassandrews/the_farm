// What sits on a counter to say it is one.
//
// A counter you can touch has to LOOK like a counter you can touch, and the
// tables were bare — the shop's counter and Prudence's kitchen table are the
// same piece of furniture in the same finish, so nothing on screen distinguished
// the one you can use from the one you cannot. This is that difference, and it
// is deliberately an OBJECT rather than a UI badge: no glow, no outline, no
// floating icon. Somebody left a bell on the counter.
//
// ONE PER COUNTER, DRAWN AT THE PIECE'S ANCHOR. Every counter here is a 2x1
// table and the stage is 2x2, so a mark drawn per CELL would be two bells and
// four playbills. That is CLAUDE.md's per-cell edges rule wearing another hat,
// and the anchor is what `furnitureAt` hands back precisely so this stays a
// non-problem (see sim/counters.ts).
//
// NOT FINISH-KEYED. These use literal colours rather than `c`/`t`/`s`, on the
// argument content/furnishings.ts already makes for the brass of a lamp head and
// the paper on a notice board: a bell is brass in a walnut shop and brass in a
// whitewashed one. The mark is a thing somebody put there, not part of the
// joinery.
//
// Keyed by CounterId, so each counter's mark is the one it is. There is no
// separate mark id and no table pairing the two — a counter has exactly one, and
// a second table would only be somewhere for the two to disagree.

import type { Grid } from "../render/furnishings";
import { INK } from "../render/furnishings";
import type { CounterId } from "./counters";

const BRASS = "#c08a2e";
const BRASS_LIT = "#e0b455";
const PAPER = "#ece5d4";
const WRIT = "#9a927e";
const SEED_DARK = "#8e5f2f";
const LINEN = "#d3bd92";
const IRON = "#8b8794";
const HANDLE = "#5d4436";
const RUBBER = "#a8443a";
/** The ledger's cover and the tin's paint, both borrowed straight from
 *  content/skins.ts (`oxblood`, `sage`). A mark is a thing somebody in this town
 *  owns, so it should be painted in a colour this town has. */
const COVER = "#8e4f45";
const PAINT = "#8a9c7e";

/** Small grids, authored at scene pixels like every other piece of furniture
 *  art. Kept UNDER 10px tall on purpose: a mark is something resting on a
 *  surface, and anything taller starts competing with the person standing next
 *  to it for what the eye lands on first. */
export const COUNTER_MARKS: Record<CounterId, Grid> = {
  // A desk bell. The most legible "there is a counter here" object there is,
  // and the Fancy Little Menace would absolutely have one for summoning people.
  shop: {
    rows: [
      "...k...",
      "..khk..",
      ".kbbbk.",
      ".kbbbk.",
      "kbbbbbk",
      "kbbbbbk",
      "kbbbbbk",
      "kkkkkkk",
    ],
    palette: { k: INK, b: BRASS, h: BRASS_LIT },
  },
  // A ledger, shut, with its page block showing at the front. "The town brings
  // me things, and I decide what they meant."
  //
  // It was an OPEN book first, two pale pages either side of a spine, and it
  // could not be read at all: her desk is whitewash and the pages were PAPER, so
  // the only part of it that survived was the outline and the thing on screen was
  // a domino. A mark has to contrast with the counter it sits on, and the
  // counters are pale — so the cover carries the colour and the paper is reduced
  // to the one stripe that says "book" rather than "box".
  museum: {
    rows: [
      ".kkkkkkk.",
      "kvvvvvvvk",
      "kvvvvvvvk",
      "kvvvvvvvk",
      "kpppppppk",
      ".kkkkkkk.",
    ],
    palette: { k: INK, v: COVER, p: PAPER },
  },
  // A sack, tied at the neck. A scoop was drawn first and could not be read at
  // seven pixels — handle and cup came out as one smudge — and a flat TRAY of
  // seed after it, which had the ledger's problem from the other end: brown seed
  // on a pine counter is brown on brown. A sack has a silhouette, which is the
  // thing that survives being small.
  seedstall: {
    rows: [
      "...kk...",
      "..kddk..",
      ".kkkkkk.",
      "kllllllk",
      "kllllllk",
      "kllllllk",
      "kllllllk",
      ".kkkkkk.",
    ],
    palette: { k: INK, l: LINEN, d: SEED_DARK },
  },
  // A paint tin, open, with a run down the side.
  //
  // SCALES were the first idea and the better joke — a facility weighs things —
  // and at nine pixels a beam with two pans is a squiggle. This is the more
  // honest object anyway: paint is what his counter actually hands over
  // (content/skins.ts, three of the four painted woods come off the heap), so
  // the mark names the trade instead of the premise.
  heap: {
    rows: [
      ".kkkkk.",
      "k#####k",
      "kkkkkkk",
      "kgggggk",
      "kgggggk",
      "kgg##gk",
      "kggg#gk",
      "kkkkkkk",
    ],
    palette: { k: INK, g: IRON, "#": PAINT },
  },
  // A stamp. The desk is the whole personality.
  //
  // Its inked face is the bottom of the stamp rather than a separate pad below
  // it, which is where it was drawn first. Every mark sits two pixels above the
  // front lip of the counter's top surface, so a detached pad is the one row
  // that lands ON the lip and gets read as part of the table.
  hall: {
    rows: [
      "..kkk..",
      "..kvk..",
      ".kkvkk.",
      "kwwwwwk",
      "kwwwwwk",
      "krrrrrk",
      "kkkkkkk",
    ],
    palette: { k: INK, v: HANDLE, w: PAPER, r: RUBBER },
  },
  // A playbill, propped on the stage. Not lying flat like the ledger — this one
  // is meant to be READ from in front, which is where you stand.
  stage: {
    rows: [
      "kkkkkkkk",
      "kppppppk",
      "kpwwwwpk",
      "kppppppk",
      "kpwwpppk",
      "kppppppk",
      "kpwwwwpk",
      "kkkkkkkk",
    ],
    palette: { k: INK, p: PAPER, w: WRIT },
  },
};
