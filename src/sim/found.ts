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
import { GRASS, MAILBOX, MUSHROOM, POLE, SHALLOW, STAIR, TREE, type TileId } from "../content/tiles";
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
  fairyring: 0x6b2d,
  poledpond: 0x4c7f,
  mailbox: 0x2be6,
  stair: 0x71d4,
  // Its own salt like everything else, and here it does a second job: the real
  // staircase and the decoy must never share a bearing, or the way up would sit
  // on the same walk out of town as the thing that looks exactly like it and the
  // pair would read as a matched set.
  skystair: 0x3ea9,
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

    /** The same annulus, in mushrooms — one fungus fruiting at its own rim, so
     *  unlike the poles (jittered, because a dozen people each did one thing
     *  once) this ring is CLOSED: the precision is the organism's, not a
     *  committee's. The rim is thinner than the ringgrove's because a mushroom
     *  is a point where a tree is a mass — a two-deep ring of caps reads as a
     *  heap, not a line. */
    case "fairyring":
      return d > def.radius - 1.0 ? MUSHROOM : GRASS;

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
    /** THE SAME LINE, DELIBERATELY. The way up is three steps of the same stone
     *  in the same arrangement as the flight that goes nowhere, because on the
     *  ground they are the same object — the difference is which way the sky
     *  answers when you stand at the foot of it and try (sim/game.ts §canClimb).
     *
     *  Written as its own case rather than falling through, so that anyone
     *  tempted to give this one a marker has to type the difference in on
     *  purpose and read this comment while doing it. */
    case "stair":
    case "skystair":
      return y === site.y && Math.abs(x - site.x) <= 1 ? STAIR : GRASS;
  }
}

/** How far the cloud parts around a way down, in tiles from the stair's centre.
 *
 *  IT IS THIS BIG BECAUSE OF A HAZARD THE SKY HAS AND NOTHING ELSE DOES. The
 *  plane is unbounded, plain, and identical in every direction, and the ways
 *  down are three tiles wide and hundreds of tiles apart. A player who walked
 *  out into that to see what was there and then turned round could genuinely
 *  fail to find the way home, and "you are lost in a white room" is not a mood,
 *  it is a soft lock in a game with no map.
 *
 *  So the exit is a PLACE rather than a speck: the cloud thins in a broad disc
 *  around it and light comes up through the gap. It is the same fix the
 *  underground already ships — a shaft pools daylight around itself, and finding
 *  your way back to one is how you get out of the dark. Not a marker: it is not
 *  on any UI, it says nothing, and it is only visible when you are near enough to
 *  walk to it.
 *
 *  FOURTEEN, AND THE FIRST NUMBER WAS EIGHT, WHICH THE SCREEN REJECTED. Eight
 *  tiles sounds generous and is not: the viewport is about twenty-two tiles by
 *  eleven, so a radius-eight disc is smaller than one screen, and a photograph
 *  taken seven tiles from the steps showed an unbroken white field with no hint
 *  of anything in it. At fourteen the parting is wider than the view, so walking
 *  into its edge tells you a way down is somewhere in THAT direction before you
 *  can see the steps themselves — which is what a landmark is. */
export const SKY_PARTING = 14;

/** The way down nearest this sky tile, if one is close enough to matter, and how
 *  far away it is. Null out on the open plane, which is nearly everywhere.
 *
 *  Asked from two ends and it must give one answer, which is why it is a
 *  function of the coordinate rather than a flag on anything: the surface asks
 *  it to decide whether ACT can climb here, and the SKY generator asks it to
 *  decide where the head of the steps is. There is no stored entrance for those
 *  two to disagree about — unlike a shaft, which is a stored edit and therefore
 *  had to pick one layer to live on (content/tiles.ts §SHAFT). */
export function skyStairNear(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
  onLand: (seed: number, spot: HomesteadSpot, ring: number, a0: number) => { x: number; y: number },
  reach: number = SKY_PARTING,
): { site: FoundSite; d: number } | null {
  const def = FOUND.skystair;
  const r = Math.hypot(x, y);
  // The same ring arithmetic `foundSiteAt` uses, with the reach in place of the
  // footprint: only the instances whose ring passes near this tile can be it.
  const slack = reach + 2;
  const lo = Math.ceil((r - slack - def.ring) / def.spacing);
  const hi = Math.floor((r + slack - def.ring) / def.spacing);
  for (let i = Math.max(0, lo); i <= hi; i++) {
    const c = centreOf(seed, spot, onLand, "skystair", i);
    const d = Math.hypot(x - c.x, y - c.y);
    if (d <= reach) return { site: { kind: "skystair", index: i, x: c.x, y: c.y }, d };
  }
  return null;
}

/** Where one instance of the staircase stands, asked directly.
 *
 *  Exported for exactly one caller: Sidra's home in the sky is sited relative to
 *  the FIRST one (sim/world.ts §cosmosHome), because a plane with no landmarks is
 *  a plane you cannot arrange to meet somebody on. Everything else asks the two
 *  functions above, which answer about a tile rather than about a place. */
export function skyStairCentre(
  seed: number,
  spot: HomesteadSpot,
  index: number,
  onLand: (seed: number, spot: HomesteadSpot, ring: number, a0: number) => { x: number; y: number },
): { x: number; y: number } {
  return centreOf(seed, spot, onLand, "skystair", index);
}

/** Is this exact tile a step of the staircase that goes somewhere? */
export function skyStairAt(
  seed: number,
  spot: HomesteadSpot,
  x: number,
  y: number,
  onLand: (seed: number, spot: HomesteadSpot, ring: number, a0: number) => { x: number; y: number },
): FoundSite | null {
  const near = skyStairNear(seed, spot, x, y, onLand, FOUND.skystair.radius + 0.5);
  if (near === null) return null;
  // Inside the footprint but not ON a step is the grass beside it, and grass
  // beside a staircase is not a staircase. Asked of `foundTile` rather than
  // re-derived, so the two ends of the flight are literally the same expression.
  return foundTile(near.site, x, y) === STAIR ? near.site : null;
}

/** Whole days since the epoch, from the LOCAL date — the same arithmetic
 *  sim/festival.ts does on its own dates, and for the same reason: the letter has
 *  to change at your midnight, not at UTC's, or a box read at eleven at night is
 *  showing tomorrow's post in half the world. */
export function dayNumber(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
