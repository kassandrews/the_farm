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
import { biomeAt, waterKindAt, depthAt, foundAt, tileAt, PLAZA } from "./world";
import { roofRoomAt } from "./rooms";
import { townBuilding } from "../content/town";
import { SLATE_DEPTH } from "./mining";
import { humLevel } from "./hum";
import { showerTonight } from "../content/showers";
import { MUSHROOM } from "../content/tiles";
import { skyPhaseAt, isNight } from "./time";
import { seasonAt } from "./seasons";
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

// --- Reading it back, in chunks of time --------------------------------------

/** Local midnight for a moment, so "how many days ago" is a question about
 *  calendar days and not about 24-hour blocks. An entry at 11pm and one at 1am
 *  are a day apart even though they are two hours apart. */
function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Which season a moment falls in, as one number that keeps counting up.
 *
 *  Not `year * 4 + index`, which would be the obvious version and would be
 *  wrong: winter is months 12, 1 and 2, so a December entry and a January one
 *  belong to the SAME winter while sitting in different calendar years. Counting
 *  months from the start of spring and dividing by three puts them in one bucket,
 *  which is what somebody who lived through that winter would say about it. */
function seasonOrdinal(t: number): number {
  const d = new Date(t);
  return Math.floor((d.getFullYear() * 12 + d.getMonth() - 2) / 3);
}

/** The calendar year a season ORDINAL began in — 2026 for the winter that runs
 *  Dec 2026 to Feb 2027. Derived from the ordinal rather than from the entry, so
 *  the December and January halves of one winter cannot label themselves
 *  differently and split a heading in two. */
function seasonStartYear(ordinal: number): number {
  return Math.floor((ordinal * 3 + 2) / 12);
}

/** The heading an entry written at `at` sits under, read from `now`.
 *
 *  A LADDER THAT COARSENS, which is how a diary dates itself: the last few days
 *  are named days, and everything before that is a season, because that is the
 *  resolution at which you still remember when something happened. Nothing here
 *  is a category — every heading is DERIVED FROM AN ENTRY, so a heading with
 *  nothing under it cannot be constructed. That is the structural defence, not a
 *  rule somebody has to keep: same shape as handing the notices column a view
 *  that cannot contain the thing it must not show.
 *
 *  No heading may carry a count, and none can — this returns a string about
 *  time, and the caller groups. A "3 entries" beside a heading would be the
 *  denominator the whole feature exists without.
 *
 *  MONOTONE IN TIME, which the grouping depends on: as `at` recedes the heading
 *  only ever gets coarser, so entries sharing a heading are always adjacent and
 *  a heading can never appear twice in one journal. */
function headingFor(at: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);

  // A clock that went backwards — a save carried between two devices that
  // disagree — reads as today rather than as a weekday in the future.
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(at).toLocaleDateString(undefined, { weekday: "long" });

  const season = seasonAt(at).name;
  const delta = seasonOrdinal(now) - seasonOrdinal(at);
  // Older than a week but still inside the season we are standing in. "Earlier"
  // is load-bearing: without it this heading and the entries under Today would
  // both be spring, and the book would look like it had lost a week.
  if (delta <= 0) return `Earlier in ${season}`;
  if (delta < 4) return `Last ${season}`;

  const year = seasonStartYear(seasonOrdinal(at));
  const gap = seasonStartYear(seasonOrdinal(now)) - year;
  const capped = season[0].toUpperCase() + season.slice(1);
  return gap === 1 ? `${capped}, last year` : `${capped}, ${year}`;
}

export interface JournalChunk {
  heading: string;
  entries: { def: ObservationDef; line: string; at: number }[];
}

/** The journal as the panel reads it: newest first, chunked by WHEN.
 *
 *  Newest first because the thing you just noticed is the thing you opened the
 *  book to read, and a journal that made you scroll past a year to find it would
 *  be an archive.
 *
 *  CHUNKED BY TIME, NEVER BY SUBJECT, and that refusal is now in three places
 *  (§9c twice, and here). Subject headings need categories: the ones you have
 *  nothing under are the blanks this feature must not have, and the ones you DO
 *  have quietly tell you how many kinds of thing exist. A time heading can do
 *  neither — it cannot be empty, because it was made out of an entry, and
 *  "Tuesday" reveals nothing about what Tuesday might have held.
 *
 *  Takes `now` rather than reading the clock, because "Today" is a fact about
 *  the frame that asked. */
export function journalChunks(world: WorldState, now: number): JournalChunk[] {
  const chunks: JournalChunk[] = [];
  for (const entry of [...journal(world)].reverse()) {
    const heading = headingFor(entry.at, now);
    // Consecutive grouping is enough BECAUSE `headingFor` is monotone — see its
    // docblock. If a rung is ever added that isn't, this silently starts
    // producing the same heading twice and the test that pins it will say so.
    const last = chunks[chunks.length - 1];
    if (last && last.heading === heading) last.entries.push(entry);
    else chunks.push({ heading, entries: [entry] });
  }
  return chunks;
}

/** How many entries a page holds before the next one starts. A soft target, not
 *  a cap: `journalPages` will overrun it rather than split a day badly.
 *
 *  Four, set on a PHONE and not on a desktop — this game is touch-first, and six
 *  filled a 440px panel on a laptop while still running off the bottom of a 844px
 *  phone, which is the scroll paging was meant to remove. Entries are one to five
 *  lines each, so this is a target and not a measurement; the only page that
 *  reliably overruns is a day with more than four things in it. */
const PAGE_ENTRIES = 4;

/** The journal as PAGES you turn, rather than one column you scroll.
 *
 *  Same chunks, same order — this only decides where the paper ends. A page is a
 *  run of whole chunks, filled until it has `PAGE_ENTRIES` on it; a day longer
 *  than a page gets a page of its own rather than being split, because a date
 *  heading is the one thing on this panel that must never be orphaned from what
 *  it dates.
 *
 *  NO PAGE MAY KNOW HOW MANY THERE ARE, and nothing here tells it: a page is a
 *  list of chunks, with no index and no total on it. The panel's rule against
 *  counts (§9c) survives paging only if the count never reaches the page in the
 *  first place — a "3 of 7" the UI merely chose not to print is one refactor
 *  away from being printed. The caller knows the array's length, which is what
 *  lets it grey out a turn it cannot make, and that is as far as it goes.
 *
 *  Never returns an empty array for a non-empty journal, so the panel always has
 *  a page to draw. */
export function journalPages(world: WorldState, now: number): JournalChunk[][] {
  const pages: JournalChunk[][] = [];
  let page: JournalChunk[] = [];
  let count = 0;

  for (const chunk of journalChunks(world, now)) {
    // Start a fresh page before a chunk that will not fit, rather than after one
    // that overflowed — otherwise the first page of a long day is one heading and
    // nothing else. A chunk bigger than a whole page still goes on one page.
    if (count > 0 && count + chunk.entries.length > PAGE_ENTRIES) {
      pages.push(page);
      page = [];
      count = 0;
    }
    page.push(chunk);
    count += chunk.entries.length;
  }
  if (page.length > 0) pages.push(page);
  return pages;
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
export const FAR_OUT = 240;

/** Exported for sim/moments.ts, which asks the same question about the same
 *  radius: the far-country Moment and the far-country field note are the two
 *  records of ONE walk (DESIGN §Moments), and two constants would be two walks
 *  that drift apart. */
export { outFrom };

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
  "the-granite": (w) => surfaceBiome(w) === "granite",
  "the-long-grass": (w) => surfaceBiome(w) === "prairie",
  "the-cinders": (w) => surfaceBiome(w) === "cinder",
  "the-caldera": (w) => surfaceBiome(w) === "caldera",
  "the-salt-flats": (w) => surfaceBiome(w) === "salt",
  "the-marshes": (w) => surfaceBiome(w) === "marsh",
  "the-static": (w) => surfaceBiome(w) === "static",
  "the-redwoods": (w) => surfaceBiome(w) === "redwoods",
  "the-giants": (w) => surfaceBiome(w) === "giants",

  "the-sea": (w) => beside(w, "sea"),
  "poled-pond": (w) => standingIn(w, "poledpond"),
  "ring-grove": (w) => standingIn(w, "ringgrove"),
  "fairy-ring": (w) => standingIn(w, "fairyring"),
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

  // Outdoors, in winter, and that is the whole condition — no first-of-season
  // bookkeeping, because the ENTRY is the record that you were out in it and
  // there is nothing else to store (the same argument `outFrom` makes above).
  // The roof check for the same reason `a-busy-sky` has one: the colour going
  // out of the field is not visible from a kitchen.
  "the-cold-came": (w, now) =>
    w.player.layer === "surface" &&
    seasonAt(now).id === "winter" &&
    roofRoomAt(w, Math.round(w.player.x), Math.round(w.player.y)) === null,

  // The two finishes you are never handed. `skins.unlocked` is standing state,
  // so the sweep can read it exactly like a biome — no event, no hook, and
  // nothing in `gather.ts` or `mining.ts` needing to know the Notebook exists.
  // The entry lands within half a second of the toast that does NOT name the
  // unlock, which is the division of labour: the toast is the moment, the book
  // is the record, and neither says "unlocked".
  "the-dark-grain": (w) => w.skins.unlocked.includes("walnut"),
  "the-flat-sheet": (w) => w.skins.unlocked.includes("slate"),

  // The true things. Each sits where no row was watching — the ordinary woods
  // had no observation at all, nor did dawn, nor a lake.
  //
  // TRIGGERS ARE ALLOWED TO OVERLAP; LINES ARE NOT ALLOWED TO AGREE. Written
  // first as "no trigger may share a condition with another", which sounded
  // right and is wrong, and the test that was supposed to prove it disproved it
  // instead: a wood at dawn fires `the-dead-middle` and `nothing-rained`
  // together, and that is simply two true things about one morning. Nothing is
  // announced when a row fires (found things are silent, ROADMAP §10i), so two
  // entries in one second is not a dump — it is two lines you read later.
  //
  // The rule that DOES bind is the other one: no two rows may be about the same
  // thing. `deep-rock` and `the-flat-sheet` are one depth apart and had to be
  // separated by subject — the seam versus the piece in your hand — or the book
  // says flat rock twice under one date. Check subject, not condition.
  //
  // The pinewood and the birch, and deliberately not the far country: a fact
  // about how a tree is built belongs beside an ordinary tree. The strange
  // regions have their own rows and those are about strangeness.
  "the-dead-middle": (w) => surfaceBiome(w) === "pinewood" || surfaceBiome(w) === "birch",

  // Standing on the mushrooms rather than near them. The patch is the whole
  // point of the line — it is about the thing under this particular clearing.
  "the-larger-thing": (w) => {
    if (w.player.layer !== "surface") return false;
    const p = at(w);
    return tileAt(w, p.x, p.y) === MUSHROOM;
  },

  // Outdoors at dawn, and nothing else. The roof check for the same reason
  // `a-busy-sky` has one: wet grass is not a thing you notice from a kitchen.
  // No shower condition — a meteor shower needs a clear sky, so gating on one
  // would say the OTHER nights were cloudy, and this world has no cloud.
  "nothing-rained": (w, now) =>
    w.player.layer === "surface" &&
    skyPhaseAt(now) === "dawn" &&
    roofRoomAt(w, Math.round(w.player.x), Math.round(w.player.y)) === null,

  // A lake and never a pond: the poled pond is a found place sitting on pond
  // water, so a pond trigger would fire at the same instant `poled-pond` does
  // and print two entries about the same puddle. A lake is big enough for the
  // line to be about anyway — you cannot see through the middle of a puddle
  // because there is no middle.
  "the-clear-edge": (w) => beside(w, "lake"),

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
