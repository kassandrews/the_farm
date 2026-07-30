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

export type WaterKindId = "stream" | "pond" | "lake" | "sea";

export interface WaterKindDef {
  id: WaterKindId;
  /** What a villager would call it. Dialogue, never the HUD — same rule the
   *  biome names live under: people name places, screens don't. */
  name: string;
  /** Tiles of depth past which the water turns DEEP and stops you. Set it above
   *  the body's own maximum depth and the kind is fordable everywhere. */
  shelf: number;
  /** Tiles of sand outside the waterline. Scales with the body: a sea gets a
   *  beach, a stream gets a bank, and a stream with a beach would be a sandy
   *  corridor five tiles wide cut through every forest in the world. */
  beach: number;
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
    beach: 1,
  },

  /** The fen's, and effectively never deep either — POND_MAX_RADIUS is 2.6, so
   *  only where two or three centres merge does the middle drop away. That is
   *  exactly the right time for it to: a pond you can see across is a puddle,
   *  and a pond you can't is a small lake. */
  pond: {
    id: "pond",
    name: "the pond",
    shelf: 3,
    beach: 1,
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
