// Where the found places are, and what they put on the ground.
//
// The siting half of content/found.ts. It is a total function of (seed, x, y) like
// the grove and the cube, so a town's oddities are a stable fact about it, nothing
// is stored, and no migration ever hands you one. That last part is what keeps
// them secrets: a fixture stamped into your save is something the game GAVE you,
// and these have to be something you walked into.
//
// THE SHAPE OF THE ANSWER: rings, and instances along them. Kind K's nth instance
// sits at ring `ring + n * spacing`, on a bearing hashed from (kind, n, seed) and
// then pushed to dry ground by `onLand`, exactly as every landmark since Phase 4c
// has been. Because `onLand` preserves the ring EXACTLY, a tile's radius tells you
// which instances could possibly contain it — usually none, occasionally one — so
// this stays cheap enough to ask per tile during generation without a cache of
// where things are, which would be one more thing that can disagree with the
// generator.
//
// WHY NOT A PER-CHUNK ROLL, which is the obvious way to scatter something. Two
// reasons, and the second is the real one. A chunk roll cannot promise "the first
// one is about a hundred tiles out", so the world would have nothing at all near
// town on some seeds and three oddities in sight of each other on others. And a
// ring is a DISTANCE, which is the only thing the game gives you to steer by out
// here (§The plaza is the datum): "further out than I have been" is a real
// sentence, and it is the one this category is built on.

import { FOUND, FOUND_KINDS, type FoundDef, type FoundKind } from "../content/found";
import { GRASS, MAILBOX, POLE, SHALLOW, STAIR, TREE, type TileId } from "../content/tiles";
import type { HomesteadSpot } from "./types";
import { hash2 } from "./rng";

/** One instance of one kind: which, and where its centre is. */
export interface FoundSite {
  kind: FoundKind;
  /** Which one out from the datum — 0 is the nearest of its kind. Part of the
   *  identity of the place, because the mailbox's letter is a function of WHICH
   *  mailbox (content/found.ts), and "the third one out" is the only name a thing
   *  nobody has ever named can have. */
  index: number;
  x: number;
  y: number;
}

/** Salts, one per kind, so no two kinds ever share a bearing. Two secrets that
 *  share a walk are one secret (the note beside CUBE_RING says this about the
 *  grove and the cube; it is the same rule with more members). */
const SALT: Record<FoundKind, number> = {
  ringgrove: 0x9a31,
  poledpond: 0x4c7f,
  mailbox: 0x2be6,
  stair: 0x71d4,
};

/** The ring the nth instance of a kind stands on. */
function ringOf(def: FoundDef, index: number): number {
  return def.ring + index * def.spacing;
}

/** Where one instance is. Memoised on the same terms as the other landmarks — the
 *  computation walks up to sixteen bearings asking about water, and generation asks
 *  for the same handful of centres for every tile of a chunk. */
const siteMemo = new Map<string, { x: number; y: number }>();

function centreOf(
  seed: number,
  spot: HomesteadSpot,
  onLand: (seed: number, spot: HomesteadSpot, ring: number, a0: number) => { x: number; y: number },
  kind: FoundKind,
  index: number,
): { x: number; y: number } {
  const key = `${kind}:${index}:${seed}:${spot}`;
  let at = siteMemo.get(key);
  if (at === undefined) {
    if (siteMemo.size > 16384) siteMemo.clear();
    const def = FOUND[kind];
    const a0 = (hash2(index, 0, seed ^ SALT[kind]) / 4294967296) * Math.PI * 2;
    at = onLand(seed, spot, ringOf(def, index), a0);
    siteMemo.set(key, at);
  }
  return at;
}

/** Which found place, if any, a tile belongs to.
 *
 *  `onLand` is passed in rather than imported because sim/world.ts imports THIS
 *  file: the dependency has to point one way, and the direction that works is the
 *  one where the water field — which onLand consults — stays in world.ts with the
 *  rest of terrain. A cycle here is not a style problem, it is a module that
 *  half-initialises and hands back a landmark at (0,0).
 *
 *  Kinds are tested in table order and the FIRST match wins. Two kinds can only
 *  collide if independent bearings put them at the same place at nearly the same
 *  radius, which is rare and which no player can tell from a deliberate choice —
 *  but it has to be decided somewhere, or the same tile answers differently
 *  depending on who asked. */
export function foundSiteAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
  onLand: (seed: number, spot: HomesteadSpot, ring: number, a0: number) => { x: number; y: number },
): FoundSite | null {
  const r = Math.hypot(x, y);
  for (const kind of FOUND_KINDS) {
    const def = FOUND[kind];
    // Which instances could reach this tile. A centre sits on its ring to within
    // the rounding of one tile, so anything further than the footprint (plus that
    // rounding) from the ring cannot be inside this kind at all — which is what
    // makes the whole category cost two subtractions for most tiles in the world.
    const slack = def.radius + 2;
    const lo = Math.ceil((r - slack - def.ring) / def.spacing);
    const hi = Math.floor((r + slack - def.ring) / def.spacing);
    for (let i = Math.max(0, lo); i <= hi; i++) {
      const c = centreOf(seed, spot, onLand, kind, i);
      if (Math.hypot(x - c.x, y - c.y) <= def.radius + 0.5) {
        return { kind, index: i, x: c.x, y: c.y };
      }
    }
  }
  return null;
}

/** What a found place puts on one of its tiles, or null to leave the ground alone.
 *
 *  Null matters as much as the tiles do: these are places, not objects, and most
 *  of the cells inside one are ordinary ground you stand on. A found place that
 *  filled its own footprint would be a prop with a radius. */
export function foundTile(site: FoundSite, x: number, y: number): TileId | null {
  const d = Math.hypot(x - site.x, y - site.y);
  const def = FOUND[site.kind];

  switch (site.kind) {
    /** The trees are on the RIM and the middle is empty, which is the whole
     *  image: a room made of wood, with a floor. A filled disc would be a copse,
     *  and there are copses everywhere. */
    case "ringgrove":
      return d > def.radius - 1.2 ? TREE : GRASS;

    /** SHALLOW ALL THE WAY ACROSS, and a test is what settled that.
     *
     *  The first cut gave it a deep middle like any other pond, and
     *  `water.test.ts` failed on the overlap: where a found pond crossed a tile the
     *  water field had already classified as a stream, the result was deep water in
     *  a stream, which is unfordable — "small water is fordable, and nothing had to
     *  say so" is an invariant about the whole world, not about the field that
     *  usually produces it.
     *
     *  Wading across turns out to be the right answer for this place anyway. There
     *  are no fish; the poles are evidence rather than equipment; and a pond you can
     *  stand in the middle of is a place, while a pond you can only walk around is a
     *  hole with a rim. It also keeps §Water's promise honestly: nothing here is a
     *  wall, at any radius. */
    case "poledpond": {
      if (d <= def.radius - 1.5) return SHALLOW;
      // A dozen of them, give or take, spaced round the rim by a hash of the tile
      // so they never come out evenly — a ring of poles at equal spacing would be
      // a fence, and a fence is something somebody built rather than something a
      // dozen people each did once.
      if (d > def.radius - 1.5 && d <= def.radius - 0.4 && hash2(x, y, 0x50fe) % 4 === 0) return POLE;
      return GRASS;
    }

    /** One tile, one post. */
    case "mailbox":
      return MAILBOX;

    /** The steps, and grass beside them. Two tiles rather than one so it reads as
     *  a flight going UP rather than as a block: the near tile is the bottom step,
     *  the centre is the top, and the top step ends in the air. */
    case "stair":
      return y === site.y && Math.abs(x - site.x) <= 1 ? STAIR : GRASS;
  }
}

/** Whole days since the epoch, from the LOCAL date — the same arithmetic
 *  sim/festival.ts does on its own dates, and for the same reason: the letter has
 *  to change at your midnight, not at UTC's, or a box read at eleven at night is
 *  showing tomorrow's post in half the world. */
export function dayNumber(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
