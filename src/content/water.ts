// Water — the four kinds, and the two numbers that decide what each one FEELS
// like to walk into.
//
// Content is data (CLAUDE.md): a kind of water is a row here, not a code path.
// The field that decides which body a tile belongs to lives in sim/world.ts
// beside the grove, the warren and the biome field, because it is terrain
// generation and it is a total function of (seed, spot, x, y) exactly as those
// are. The same split biomes.ts made, for the same reason.
//
// DEPTH IS ONE NUMBER. Every body of water answers a single question — how far
// inside your own shore is this tile, in tiles — and everything a player can
// see or do is a threshold on it (DESIGN §Water):
//
//     d > shelf    deep      solid; the barrier
//     d > 0        shallow   walkable; you wade
//     d > -beach   sand      shore
//     else         land
//
// THE FORDING RULE IS GEOMETRY, NOT A RULE, and this is the part worth
// protecting. A stream is one or two tiles wide, so no tile in it is ever more
// than about a tile from its own bank, so `d` never reaches `shelf` and the
// whole stream is shallow. Small ponds likewise. Water is deep in the middle,
// and small water has no middle. Nobody adding the next kind of water has to
// remember to make it crossable — if it's narrow, it already is.
//
// WHICH IS WHY `shelf` IS NOT A BOOLEAN. The tempting version of this table had
// `fordable: true | false` per row, which reads the same on these four rows and
// is wrong the first time a fen pond grows big: it would be a wadeable puddle
// the size of a lake. A threshold gets that right without being asked.

export type WaterKindId = "stream" | "river" | "pond" | "lake" | "sea";

/** The geometry of the kinds that are CHANNELS — a family of meandering lines
 *  ruled across the world — as opposed to the ones that are bodies. Streams and
 *  rivers differ in these numbers and in nothing else, which is the argument for
 *  the block existing: a river is not a code path, it is a wider stream that
 *  happens to be deep enough in the middle to stop you. */
export interface ChannelDef {
  /** How far apart candidate channels run, in tiles. */
  spacing: number;
  /** How far a channel wanders across its own line. */
  amplitude: number;
  /** How far the whole family is bent — see `STREAM_WARP` in sim/world.ts. */
  warp: number;
  /** Half-widths, in tiles. Compare against `shelf` to know whether the kind can
   *  ever be deep: a channel narrower than its shelf has no middle to be deep
   *  in, which is the whole of why a stream is fordable. */
  halfMin: number;
  halfMax: number;
  /** How many candidate channels are real. */
  chance: number;
  /** How many INDEPENDENT families, each on its own bearing.
   *
   *  One family is a comb, and no amount of meandering fixes that — every
   *  channel shares the bearing, so they wobble in unison and stay parallel
   *  forever. Two bearings cross, run together for a stretch and separate, and
   *  the world stops having a grain.
   *
   *  This is an APPROXIMATION of a drainage network and openly so. Real veins
   *  come from flow accumulation on a height field, which is iterative — you
   *  cannot know whether a tile is a stream without computing its whole
   *  catchment — and that is incompatible with terrain being a total function of
   *  (seed, x, y) evaluated per tile with nothing stored. Two families buys most
   *  of the look for none of the foundation. */
  families: number;
  /** How much the channel PINCHES along its length, 0 (never) to 1 (to nothing),
   *  and over what distance.
   *
   *  This is what gives a river fords. Where it narrows, its depth stops
   *  reaching the shelf, so the crossing is shallow — the same emergent rule
   *  that makes a stream fordable, applied to a channel big enough to need it.
   *  You are never blocked by a river, only asked to walk the bank a while or to
   *  put down planks. */
  pinch?: number;
  pinchPeriod?: number;
}

export interface WaterKindDef {
  id: WaterKindId;
  /** What a villager would call it. Dialogue, never the HUD — same rule the
   *  biome names live under: people name places, screens don't. */
  name: string;
  /** Tiles of depth past which the water turns DEEP and stops you. Set it above
   *  the body's own maximum depth and the kind is fordable everywhere. */
  shelf: number;
  /** Tiles of sand outside the waterline.
   *
   *  SAND MEANS BIG WATER. Streams and ponds get none, and that is a rule with a
   *  reason on both sides. On the taste side it is a free distinction: green
   *  banks on a brook, beaches on the sea, and you can tell at a glance which
   *  kind of water you are looking at. On the mechanical side, a one-tile sand
   *  band on a two-tile channel lands badly on the grid — the band falls between
   *  cell centres as often as on one, so it came out as chunky patches on
   *  alternating sides rather than as banks. A beach needs a body big enough to
   *  have one. */
  beach: number;
  /** Present on the kinds that are channels rather than bodies. */
  channel?: ChannelDef;
}

export const WATER_KINDS: Record<WaterKindId, WaterKindDef> = {
  /** Never deep — the widest a stream gets is under two tiles, so `shelf` here
   *  is unreachable by construction and the whole channel wades. This is the
   *  answer to "there should be streams, and a way to cross them": the way to
   *  cross a stream is to walk into it. */
  stream: {
    id: "stream",
    name: "the stream",
    shelf: 3,
    beach: 0,
    channel: {
      spacing: 46,
      amplitude: 19,
      warp: 22,
      // Both under `shelf`, which is not a coincidence but the invariant: a
      // stream is fordable because it is too narrow to be deep, and if anyone
      // raises `halfMax` past 3 the crossing promise breaks silently. There is a
      // test in sim/water.test.ts that fails the day it does.
      halfMin: 0.6,
      halfMax: 1.4,
      chance: 0.55,
      families: 2,
    },
  },

  /** Rarer, wider, and the first water that can actually stop you — which makes
   *  it the first real reason to put planks down. Deep down the middle, and
   *  pinching to a fordable shallows here and there, so a river is a thing you
   *  walk the bank of looking for a crossing, or bridge because you're tired of
   *  looking. */
  river: {
    id: "river",
    name: "the river",
    // Well under the channel's own half-width, so the middle IS deep — the
    // inverse of the stream's arrangement, and the one number that separates
    // "wade it" from "bridge it".
    //
    // And well under it by a MARGIN, so the deep band is at least two tiles
    // across even where the river runs narrowest. The first draft paired 1.6
    // with a half-width of 1.8, leaving a deep ribbon under a tile wide, which
    // on the grid came out as a dashed line of dark rectangles rather than as a
    // channel — it hit some cell centres and missed others. A band has to be
    // wider than a cell to read as a band, which is the same lesson the beaches
    // taught one field over.
    shelf: 1.4,
    beach: 2,
    channel: {
      // About one every three hundred tiles. You can live a long time without
      // meeting one, and a town that has one has a landmark.
      spacing: 170,
      amplitude: 34,
      warp: 30,
      // Wide enough that the deep band survives the pinch. The first pass ran
      // 2.4/3.6, which is a fine number for the river's OUTLINE and a bad one
      // for its middle: at a typical point on the pinch cycle it left about a
      // tile and a third of deep water, so the river read as a wide stream with
      // a dark line down it. What you see is `half × squeeze − shelf`, doubled,
      // and it is the quantity to tune — not the half-width on its own.
      halfMin: 3.4,
      halfMax: 4.6,
      chance: 0.55,
      // One family: a second bearing of rivers would give a town two of them,
      // and two rivers is a delta, which is a different place than we're making.
      families: 1,
      // Down to 28% of its width at the narrows. Tuned so that even the WIDEST
      // river pinches under `shelf` — 4.6 × 0.28 = 1.29, against a shelf of 1.4
      // — because a ford that only some rivers have is a ford you cannot rely
      // on, and the whole promise is that you are never blocked, only delayed.
      //
      // So this number is not free: it moves with `halfMax`, and widening the
      // river without deepening the pinch is what silently costs the world its
      // crossings. `halfMax × (1 − pinch) < shelf` is asserted in
      // sim/water.test.ts so that edit fails loudly instead.
      pinch: 0.72,
      pinchPeriod: 37,
    },
  },

  /** The fen's, and effectively never deep either — POND_MAX_RADIUS is 2.6, so
   *  only where two or three centres merge does the middle drop away. That is
   *  exactly the right time for it to: a pond you can see across is a puddle,
   *  and a pond you can't is a small lake. */
  pond: {
    id: "pond",
    name: "the pond",
    shelf: 3,
    beach: 0,
  },

  /** The first water with a real middle. A wadeable rim you can paddle along and
   *  a deep centre you cannot, so it is a barrier and a place at once — you walk
   *  around it, and the walk has a shore to follow. */
  lake: {
    id: "lake",
    name: "the lake",
    shelf: 3,
    beach: 2,
  },

  /** The big one, and the whole reason this file exists. A wide shelf, because a
   *  coastline with two tiles of paddling is a moat — you should be able to wade
   *  along the sea for a while and have that be a thing you did. */
  sea: {
    id: "sea",
    name: "the sea",
    shelf: 5,
    beach: 3,
  },
};

export function waterKind(id: WaterKindId): WaterKindDef {
  return WATER_KINDS[id];
}
