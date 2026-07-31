// The Notebook (DESIGN §The Notebook).
//
// A naturalist's journal that accretes oblique observations as you go. It is
// the museum record applied to discovery: no total, no denominator, no empty
// slots. It gives you a way to remember what you have SEEN and never a way to
// see what you have MISSED.
//
// TWO KINDS OF ENTRY, TOLD APART BY HOW THEY WERE RECORDED.
//
//   • `noticed` — you saw it. Reads as a field note in your own hand, and fires
//     from the world: you walked into the glass country, you got farther out
//     than anybody bothers to go, you were under forty tiles of rock.
//   • `told` — somebody said it to you, and the entry carries their name. It
//     fires from a CONVERSATION and nowhere else, because "being told is a
//     conversation, not a delivery": the line arrives in that character's own
//     voice, once, and the notebook records that they were the one who said it.
//
// WHERE THE PREDICATES LIVE, AND WHY HERE. Content may not import sim
// (CLAUDE.md §Architecture), so `content/notebook.ts` holds the TEXT and this
// file holds the CONDITIONS — the same split as every other table in the game,
// pushed one step further because a condition is code. `notebook.test.ts` pins
// the correspondence in both directions, so an observation with no trigger fails
// and a trigger for an observation that doesn't exist fails too.
//
// WHAT IS DELIBERATELY MISSING:
//
//   • No count, no total, no denominator, and nothing that could be divided by
//     anything. `world.notebook.length` is a number the UI may never render.
//   • No locked entries and no "???". A blank that implies more is the exact UI
//     spoiler the tone rules ban for secrets, wearing a journal cover.
//   • No gate. Nothing in the game reads the notebook to decide anything, the
//     same rule the museum keeps. It is a record, not a track.
//   • No task. An entry is past tense about something that is true; the moment
//     one reads as an instruction it has become a quest log.

import type { WorldState } from "./types";
import type { ObservationDef, ObservationId } from "../content/notebook";
import { OBSERVATIONS, observationDef, observationLine } from "../content/notebook";
import type { CharId } from "../content/cast";
import type { BiomeId } from "../content/biomes";
import type { WaterKindId } from "../content/water";
import type { FoundKind } from "../content/found";
import { biomeAt, waterKindAt, depthAt, foundAt, PLAZA } from "./world";
import { roofRoomAt } from "./rooms";
import { townBuilding } from "../content/town";
import { SLATE_DEPTH } from "./mining";
import { humLevel } from "./hum";
import { showerTonight } from "../content/showers";
import { skyPhaseAt, isNight } from "./time";
import { friendshipTier } from "./friendship";

/** An observation, as the save holds it. An id and when — never the text, which
 *  lives in content and may be reworded without migrating anybody's journal
 *  (the same split as the museum's `placard` index and the filing cabinet). */
export interface Observation {
  id: ObservationId;
  at: number;
}

/** Write it down, if it isn't already. Returns the entry's line for anything
 *  that wants to say it out loud, or null when it was already known.
 *
 *  Idempotent by design: every caller is some place in the world that happens
 *  repeatedly — walking a tile, talking to somebody — and the "have I noticed
 *  this" check belongs to the log rather than to nine call sites that would
 *  each have to remember it. */
export function observe(world: WorldState, id: ObservationId, now: number): string | null {
  if (world.notebook.some((o) => o.id === id)) return null;
  world.notebook.push({ id, at: now });
  return observationDef(id).line;
}

export function noticed(world: WorldState, id: ObservationId): boolean {
  return world.notebook.some((o) => o.id === id);
}

/** Everything you have written down, in the order you wrote it.
 *
 *  Chronological, and that is the one ordering decision here: a journal is a
 *  sequence. Grouping by subject would need headings, and headings for subjects
 *  you have nothing under are the empty slots this must not have — while
 *  headings only for subjects you DO have would quietly tell you how many kinds
 *  of thing there are to find.
 *
 *  There is no second return value and no companion function reporting what is
 *  missing. Same sentence the museum's `collection` carries. */
export function journal(world: WorldState): { def: ObservationDef; line: string; at: number }[] {
  return world.notebook.map((o) => {
    const def = observationDef(o.id);
    // The LIVE name, so a journal written before a rename still reads correctly
    // — and the authored one as a fallback, for a speaker the town no longer
    // has standing in it. An entry outliving its speaker is fine; the remark
    // was still made, and it is still true.
    const who = def.from ? world.villagers.find((v) => v.id === def.from)?.name : undefined;
    return { def, line: observationLine(def, who), at: o.at };
  });
}

/** True when nothing has been written down — an empty state a line can answer,
 *  rather than a zero. */
export function journalEmpty(world: WorldState): boolean {
  return world.notebook.length === 0;
}

// --- What fires an entry ------------------------------------------------------

/** Everything the world checks as you move through it.
 *
 *  Evaluated on a coarse tick rather than every frame (see `sweepNoticed`), and
 *  every predicate here must be CHEAP and PURE — no side effects, no writes.
 *  They answer "is this true right now", and `observe` decides whether it is
 *  news.
 *
 *  Only `noticed` rows appear here. A `told` row has no world condition at all:
 *  it fires when the person says it (`tellable` below), which is the whole
 *  distinction between the two kinds. */
export type Trigger = (world: WorldState, now: number) => boolean;

/** The observations a conversation with this character could produce right now:
 *  told rows, attributed to them, whose own condition holds and which you have
 *  not already written down.
 *
 *  Returns a list rather than one, so the caller decides — dialogue takes the
 *  first, which makes the order in `content/notebook.ts` the order they come
 *  up, oldest-authored first. */
export function tellable(world: WorldState, who: CharId, now: number): ObservationDef[] {
  return OBSERVATIONS.filter(
    (o) => o.source === "told" && o.from === who && !noticed(world, o.id) && told(o.id, world, now),
  );
}

/** Whether a told row's own precondition holds. Separate from `tellable` so a
 *  row can require something of the world as well as of the speaker — the Mole
 *  will not mention the deep rock to somebody who has never been down there,
 *  because then it is exposition rather than a remark. */
function told(id: ObservationId, world: WorldState, now: number): boolean {
  const t = TOLD_WHEN[id];
  return t ? t(world, now) : true;
}

/** Where the player is standing, as a tile. Every predicate below wants this
 *  and none of them wants a float. */
function at(world: WorldState): { x: number; y: number } {
  return { x: Math.round(world.player.x), y: Math.round(world.player.y) };
}

function surfaceBiome(world: WorldState): BiomeId | null {
  if (world.player.layer !== "surface") return null;
  const p = at(world);
  return biomeAt(world.seed, world.homestead.spot, p.x, p.y);
}

/** Is one of the cells at or beside the player this kind of water?
 *
 *  A neighbourhood rather than the tile underfoot, because you cannot STAND in
 *  the sea — deep water stops you (content/water.ts), so a predicate asking
 *  what is under your feet would never once be true of the thing it is about.
 *  You notice the sea from the sand. */
function beside(world: WorldState, kind: WaterKindId): boolean {
  if (world.player.layer !== "surface") return false;
  const p = at(world);
  for (const [dx, dy] of [
    [0, 0],
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    if (waterKindAt(world.seed, world.homestead.spot, p.x + dx, p.y + dy) === kind) return true;
  }
  return false;
}

function standingIn(world: WorldState, kind: FoundKind): boolean {
  if (world.player.layer !== "surface") return false;
  const p = at(world);
  return foundAt(world.seed, world.homestead.spot, p.x, p.y)?.kind === kind;
}

function inRect(p: { x: number; y: number }, r: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
}

/** How far out you are, from the survey datum — which is the plaza, because an
 *  institution drove a peg into a field there (sim/survey.ts).
 *
 *  EVALUATED LIVE, and this is the load-bearing decision of the whole file. The
 *  codebase refuses a "deepest reached" counter twice in writing (sim/mining.ts,
 *  content/junk.ts) on the grounds that a monotonic high-water number is a score
 *  whatever it is called. The same objection applies to a farthest-from-plaza
 *  field, so there isn't one. The only thing stored is WHETHER THE NOTE WAS
 *  WRITTEN; the condition is arithmetic on where you happen to be standing, and
 *  the entry itself is the record that you were once out there. */
function outFrom(world: WorldState): number {
  return Math.hypot(world.player.x, world.player.y);
}

/** Past here, nothing is arranged. `STRANGE_FROM` in sim/world.ts is 200 — the
 *  radius inside which the world generates exactly as it did before the far
 *  country existed — so this sits just beyond it, where being out is a fact
 *  about the world rather than about your stamina. */
const FAR_OUT = 240;

export const NOTICED_WHEN: Partial<Record<ObservationId, Trigger>> = {
  "far-out": (w) => w.player.layer === "surface" && outFrom(w) > FAR_OUT,

  // The three far-country rows carry `near: 0` weight (content/biomes.ts), so
  // they are IMPOSSIBLE near town. Standing in one is proof of distance without
  // anything having to store a distance — which is why these are keyed on the
  // biome and not on a radius.
  "dusk-wood": (w) => surfaceBiome(w) === "dusk",
  "glimmer-country": (w) => surfaceBiome(w) === "glimmer",
  "glass-country": (w) => surfaceBiome(w) === "glass",
  "the-fen": (w) => surfaceBiome(w) === "fen",
  "the-blossom": (w) => surfaceBiome(w) === "blossom",

  "the-sea": (w) => beside(w, "sea"),
  "poled-pond": (w) => standingIn(w, "poledpond"),
  "ring-grove": (w) => standingIn(w, "ringgrove"),
  "stair-to-nothing": (w) => standingIn(w, "stair"),

  // `depthAt` returns Infinity when the town has no shaft at all, which is
  // harmless here (Infinity >= 12) only because the layer check has already
  // established that you are underground, and you cannot be underground without
  // a shaft. Left explicit rather than relied upon.
  "deep-rock": (w) => {
    if (w.player.layer !== "under") return false;
    const p = at(w);
    const d = depthAt(w, p.x, p.y);
    return Number.isFinite(d) && d >= SLATE_DEPTH;
  },

  "above-the-cloud": (w) => w.player.layer === "sky",

  // The cheapest proximity test in the codebase, and it already means exactly
  // this: within earshot of the Cube, above ground (sim/hum.ts).
  "the-hum": (w) => humLevel(w) > 0,

  // Outdoors, at night, on a night one is actually happening. All three matter:
  // a shower noticed from inside a house through a roof would be the journal
  // recording something you could not see.
  "a-busy-sky": (w, now) =>
    w.player.layer === "surface" &&
    isNight(skyPhaseAt(now)) &&
    showerTonight(now) !== null &&
    roofRoomAt(w, Math.round(w.player.x), Math.round(w.player.y)) === null,

  "the-datum": (w) => w.player.layer === "surface" && inRect(at(w), PLAZA),

  "the-museum-is-large": (w) => {
    if (w.player.layer !== "surface") return false;
    const b = townBuilding("museum");
    return inRect(at(w), { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
  },
};

/** Told rows fire in conversation, so their condition is about the SPEAKER
 *  rather than about the world: they have to know you.
 *
 *  Uniformly `familiar` or better, and that is the whole gate. It staggers the
 *  town's half of the notebook naturally — four institutions you can reach in
 *  the first ten minutes do not empty their pockets at you on the first hello —
 *  and it is true to what the entries are. Nobody tells a stranger the thing
 *  they have privately concluded about the ground.
 *
 *  The three secrets pass the same test rather than a looser one. Finding them
 *  is already most of the work, but a Ghost who volunteers the one true thing
 *  about her grove to somebody she met ten seconds ago is not the Ghost. */
function knowsYou(world: WorldState, who: CharId): boolean {
  const v = world.villagers.find((x) => x.id === who);
  return v !== undefined && friendshipTier(v) !== "new";
}

export const TOLD_WHEN: Partial<Record<ObservationId, Trigger>> = Object.fromEntries(
  OBSERVATIONS.filter((o) => o.source === "told" && o.from).map((o) => [
    o.id,
    ((w: WorldState) => knowsYou(w, o.from!)) as Trigger,
  ]),
) as Partial<Record<ObservationId, Trigger>>;

/** Walk the noticed triggers and write down whatever has just become true.
 *
 *  Returns the lines that fired, so the caller can say them. Usually empty —
 *  this runs on a coarse interval and almost every call finds nothing, which is
 *  correct: noticing is rare.
 *
 *  Deliberately NOT called per frame. These predicates ask about biomes and
 *  distances, which do not change between one sixtieth of a second and the
 *  next, and a table of them evaluated sixty times a second would be the one
 *  piece of this feature with a performance cost. */
export function sweepNoticed(world: WorldState, now: number): string[] {
  const out: string[] = [];
  for (const def of OBSERVATIONS) {
    if (def.source !== "noticed") continue;
    if (noticed(world, def.id)) continue;
    const when = NOTICED_WHEN[def.id];
    if (!when || !when(world, now)) continue;
    const line = observe(world, def.id, now);
    if (line) out.push(line);
  }
  return out;
}
