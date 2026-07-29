// The away simulation. While you're gone the town keeps living (DESIGN §"Time
// and the away simulation"), and — the part that matters — absence generates
// NEWS, never chores or guilt (§"Absence as story, not punishment").
//
// Every event here MUTATES the world and then reports what it did; the postcard
// is assembled from what actually happened, not from a bag of flavour strings.
// That's the difference between a living town and a slideshow.
//
// House rules for anything added to this table:
//   • Never destroy the player's work. The Gremlin *moves* a board; it never
//     eats one. Tile counts are preserved.
//   • Never create an obligation. Mushrooms are scenery you may clear if you
//     like — nothing decays, nothing must be tidied, nothing is lost by
//     ignoring it.
//   • Prefer changes the player can *see* on return, or that a villager can
//     bring up in conversation later.

import type { WorldState } from "./types";
import type { Rng } from "./rng";
import { tileAt, setTile, tileKey } from "./world";
import { GRASS, DIRT, PLANK, MUSHROOM } from "../content/tiles";
import { remember } from "./memory";
import { remountExhibit } from "./museum";
import { festivalsBetween, sawYouAt, gatherers } from "./festival";
import { moleMet, moleDigs, moleDigLine } from "./mole";

const HOUR = 3_600_000;

/** Under this, you were barely gone — no postcard at all. */
export const AWAY_MIN_MS = 20 * 60 * 1000;

/** One event per this much time away, so a weekend produces a few pieces of
 *  news and a coffee break produces none. */
const MS_PER_EVENT = 6 * HOUR;
const MAX_EVENTS = 3; // a homecoming should be a postcard, not a changelog

/** Mushrooms stop spreading past this many — the town gets characterful, not
 *  overrun, and the player is never handed a weeding job. */
const MUSHROOM_CAP = 10;

/** An event that tried to happen. `line` is the postcard sentence; null means
 *  the event found nothing to act on (no boards to move yet) and should be
 *  skipped silently rather than reported as a non-event. */
type AwayEvent = (world: WorldState, rng: Rng, now: number, elapsedMs: number) => string | null;

/** Tiles the player has placed or altered, as [x, y, tileId]. The away sim only
 *  ever touches ground near the town/homestead, which is where overrides are. */
function overrideTiles(world: WorldState): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [key, id] of Object.entries(world.overrides)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y, id]);
  }
  return out;
}

/** Is this tile free for scenery? Plain ground, nothing growing, nothing built. */
function isBareGround(world: WorldState, x: number, y: number): boolean {
  if (world.crops[tileKey(x, y)]) return false;
  const t = tileAt(world, x, y);
  return t === GRASS || t === DIRT;
}

// --- The events ---------------------------------------------------------------

/** Mushrooms creep out around the homestead overnight. Pure gift: scenery that
 *  appears near where you live, clearable but never demanding. */
const mushroomsSpread: AwayEvent = (world, rng) => {
  const existing = overrideTiles(world).filter(([, , id]) => id === MUSHROOM).length;
  if (existing >= MUSHROOM_CAP) return null;

  const ox = world.homestead.originX;
  const oy = world.homestead.originY;
  const spots: [number, number][] = [];
  // Scan a ring around the homestead for somewhere plausible to sprout.
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const x = ox + dx;
      const y = oy + dy;
      if (isBareGround(world, x, y) && tileAt(world, x, y) === GRASS) spots.push([x, y]);
    }
  }
  if (spots.length === 0) return null;

  const want = Math.min(1 + rng.int(3), MUSHROOM_CAP - existing, spots.length);
  for (let i = 0; i < want; i++) {
    const [x, y] = spots[rng.int(spots.length)];
    setTile(world, x, y, MUSHROOM);
  }
  return want === 1
    ? "A mushroom came up near your plot. It was not there before."
    : `Mushrooms came up near your plot — ${want} of them, in a loose sort of arc.`;
};

/** The Gremlin relocates one of your boards by a tile. Canon behaviour (DESIGN
 *  §fixed cast: "Sometimes moves your fences") and deliberately harmless: the
 *  board is moved, never removed, so nothing you built is ever lost. */
const gremlinMovesABoard: AwayEvent = (world, rng) => {
  const planks = overrideTiles(world).filter(([, , id]) => id === PLANK);
  if (planks.length === 0) return null;

  const [x, y] = planks[rng.int(planks.length)];
  const neighbours: [number, number][] = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ].filter(([nx, ny]) => isBareGround(world, nx, ny)) as [number, number][];
  if (neighbours.length === 0) return null;

  const [nx, ny] = neighbours[rng.int(neighbours.length)];
  setTile(world, x, y, GRASS); // reverts to whatever generation says underneath
  setTile(world, nx, ny, PLANK);
  return "One of your boards is one tile to the left of where you left it. The Gremlin denies everything.";
};

/** Corrigal revises a placard while you're out (DESIGN §Time: "the Scholar
 *  mounts a new wrong exhibit"). `remountExhibit` picks something you actually
 *  donated and advances its reading by one; the room is unchanged, the card
 *  under it is not.
 *
 *  This event USED to invent its own subject from a list — "a rock", "an
 *  interesting stick" — because it was written before the museum existed. Two
 *  things were wrong with that once it did: the exhibit it announced was
 *  standing on no plinth anywhere, and it found its scholar by FORM, which is
 *  Corrigal in a new town and Margfrom in a save old enough to predate her
 *  (`ensureFixedCast` appends her after the resident). The same event landed on
 *  different people depending on how old your town was. Institutions are found
 *  by id; form is never an identity (DESIGN).
 *
 *  Returns null on an empty museum, so a town that has donated nothing simply
 *  gets no news from her — rather than a line about a card that is not there
 *  for you to go and read. Every event in this table changes the world; a
 *  version of this one that only produced a sentence would be the slideshow the
 *  header warns about.
 *
 *  The TITLE goes in the memory, not the id: the value is rendered straight
 *  into a scholar's dialogue lines ("Have you seen my ... exhibit?"), and it
 *  keeps the prose values of older saves speaking instead of resolving to
 *  nothing.
 *
 *  Corrigal will not say that line herself — her conversation is the museum
 *  panel, the same way the Menace's is her counter — and that is fine: the
 *  revised card is legible in the catalogue, which is where you would go to
 *  read it anyway. The log is what step 8 hangs off, when Margfrom starts
 *  disagreeing with a recent one. */
const curatorRemountsExhibit: AwayEvent = (world, rng, now) => {
  const curator = world.villagers.find((v) => v.id === "museum");
  if (!curator) return null;
  const remounted = remountExhibit(world, (n) => rng.int(n));
  if (!remounted) return null;
  curator.memory = remember(curator.memory, { kind: "exhibit", at: now, value: remounted.def.title });
  return `Corrigal has revised an exhibit while you were out. The card now reads: ${remounted.placard}`;
};

/** The Mole lengthens your tunnel (DESIGN §"The Mole, specifically").
 *
 *  Gated on having MET him, which is the whole of what makes it his: an
 *  unmet Mole extending your tunnel would be the rock doing you favours, and
 *  the player would rightly read it as a bug. It is also the only event here
 *  that happens underground, where the postcard's usual promise — go and look
 *  at it — costs a walk. That is allowed precisely because it asks nothing:
 *  the tunnel is longer whether or not you ever go back down.
 *
 *  Additive by construction (`carve` only turns rock into floor and refuses
 *  ore), so it satisfies the header's first two rules without needing to be
 *  careful about them. */
const moleExtendsTheTunnel: AwayEvent = (world, rng) => {
  if (!moleMet(world)) return null;
  const cut = moleDigs(world);
  if (cut === 0) return null;
  return moleDigLine(rng, cut);
};

/** A festival happened without you (DESIGN §Festivals: "a festival you missed
 *  becomes news, not homework").
 *
 *  THE ONLY EVENT IN THIS TABLE THE TOWN WOULD HAVE RUN ANYWAY. The Gremlin
 *  moves a board because you were out; this one is on the calendar and was
 *  always going to happen, which is the strongest version of the promise this
 *  file is built on — the world lives while you're away. It needs no roll to
 *  decide whether it occurred, only a look at the dates you were gone.
 *
 *  What it MUTATES is the town's memory: everyone who was standing in the
 *  square gets the festival in their log, which is why somebody can bring it up
 *  when you next talk to them. That is a real change and not a sentence — the
 *  header's rule — and it is the same record `attend` writes when you ARE there,
 *  because it is the same fact. The difference is entirely that YOUR log stays
 *  empty. You weren't there.
 *
 *  And nothing else happens. No friendship (nobody warmed to you at a party you
 *  missed), no penalty, no note anywhere that you were absent. The postcard
 *  tells you what the town did, in the past tense, the way the notices column
 *  does.
 *
 *  The last one, if several passed: a fortnight away is one piece of news about
 *  a festival, not a digest of three. `MAX_EVENTS` already keeps the postcard a
 *  postcard, and it would be an odd absence that spent all three on the Blob. */
const festivalHappened: AwayEvent = (world, _rng, now, elapsedMs) => {
  const missed = festivalsBetween(now - elapsedMs, now);
  if (missed.length === 0) return null;
  const { def, at } = missed[missed.length - 1];

  // The residents were there — the gather is what their routine says for those
  // hours (content/cast.ts) — and so was the Blob, who was running it. The same
  // `gatherers` the live path uses, so "who was at the festival" is one answer
  // whether or not you were there to see it.
  let anyone = false;
  for (const v of gatherers(world)) {
    if (sawYouAt(v, def, at)) continue; // already logged; an overlapping window
    v.memory = remember(v.memory, { kind: "festival", at, value: def.name });
    anyone = true;
  }
  if (!anyone) return null;
  return `${def.name} was held in the plaza while you were out. ${def.afterwards}`;
};

/** The whole table. Order is irrelevant — the roll shuffles. */
const AWAY_EVENTS: AwayEvent[] = [
  mushroomsSpread,
  gremlinMovesABoard,
  curatorRemountsExhibit,
  moleExtendsTheTunnel,
  festivalHappened,
];

/** Run the town forward across an absence, mutating the world, and return the
 *  lines describing what genuinely changed. Crops are advanced by the caller
 *  (they have their own wall-clock integration); this is everything else. */
export function simulateAway(world: WorldState, elapsedMs: number, now: number, rng: Rng): string[] {
  const budget = Math.min(MAX_EVENTS, Math.floor(elapsedMs / MS_PER_EVENT));
  if (budget <= 0) return [];

  // Try events in a shuffled order and keep the ones that found something to
  // do, up to the budget. An event that returns null didn't happen at all.
  const pool = [...AWAY_EVENTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const lines: string[] = [];
  for (const event of pool) {
    if (lines.length >= budget) break;
    const line = event(world, rng, now, elapsedMs);
    if (line) lines.push(line);
  }
  return lines;
}
