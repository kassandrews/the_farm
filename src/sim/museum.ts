// Donating at the museum. See content/museum.ts for the wings and why the
// placards come in threes.
//
// Modelled on sim/heap.ts, and it inherits the one thing that file exists to
// get right: a donation is ALL-OR-NOTHING, and a row you have already given is
// REFUSED. That refusal is not politeness. Without it a second tap spends the
// junk, the collection absorbs the duplicate silently, and you have paid for
// nothing — the exact bug `redeem()` was written to avoid, one counter over.
//
// WHAT THIS FILE DOES NOT HAVE, deliberately, and asserted in museum.test.ts:
//
//   • No return value from donating. No item, no finish, no material, no
//     unlock. Finishes-for-junk belong to the Gremlin and a second source
//     undercuts him; anything else makes donating efficient rather than a
//     gift (DESIGN). The payoff is the placard and the plinth.
//   • No total, no denominator, no progress. `collection()` returns what you
//     gave and stops. Nothing here can answer "how much is left", because the
//     answer would immediately appear in a UI as a fraction.
//   • Nothing anywhere else may read the collection. No commission, no
//     `qualify()`, no room, no acceptance test. It is a place, not a track.

import type { WorldState } from "./types";
import type { ExhibitDef, ExhibitId, WingId } from "../content/museum";
import { MUSEUM, exhibitDef, mountedIndex, placardText, wingExhibits } from "../content/museum";
import { TOWN_BUILDINGS } from "../content/town";
import { count, spend } from "./inventory";
import { hasMet } from "./met";
import { hash2 } from "./rng";

/** One donated exhibit, as stored in the save (see WorldState.museum). */
export type Donation = WorldState["museum"]["donated"][number];

/** Something she will take right now, and whether you can pay for it. */
export interface MuseumOffer {
  def: ExhibitDef;
  affordable: boolean;
}

function donations(world: WorldState): Donation[] {
  return world.museum.donated;
}

export function isDonated(world: WorldState, id: ExhibitId): boolean {
  return donations(world).some((d) => d.id === id);
}

/** What she'll take, in the order the panel should show it.
 *
 *  Nature rows appear once their item has ever been in your satchel (Phase 14b
 *  — the wing may want things, but it may not NAME a thing you have never
 *  held, which is the Notebook's rule reaching the last counter still exempt
 *  from it). The wing therefore grows as your world does. The older call —
 *  "knowing what it wants is what sends you out looking" — is recorded in
 *  ROADMAP §14b with its revert path.
 *
 *  A met row then STAYS, affordable or not: this list is a wanted-list rather
 *  than a trade, so it keeps the shop's retired rule — seeing what she wants
 *  is half of knowing to come back with one.
 *
 *  Antiquities are offered ONE at a time: only the next unrevealed row, and
 *  only ever as "junk". You are not told what it will turn out to be, because
 *  junk is identified at donation and not before (DESIGN) — and because a list
 *  of twelve pending antiquities is a checklist with the numbers left off. */
export function donatable(world: WorldState): MuseumOffer[] {
  const offers: MuseumOffer[] = [];
  for (const def of wingExhibits("nature")) {
    if (isDonated(world, def.id)) continue;
    if (!hasMet(world, def.cost.item)) continue;
    offers.push({ def, affordable: count(world.inventory, def.cost.item) >= def.cost.count });
  }
  const next = nextAntiquity(world);
  if (next) {
    offers.push({ def: next, affordable: count(world.inventory, next.cost.item) >= next.cost.count });
  }
  return offers;
}

/** The antiquities row your next piece of junk will turn out to have been, or
 *  null once she has run out of things to be wrong about. */
export function nextAntiquity(world: WorldState): ExhibitDef | null {
  return wingExhibits("antiquities").find((def) => !isDonated(world, def.id)) ?? null;
}

/** Hand it over. Returns false and changes NOTHING if you can't pay or she
 *  already has it — see the note at the top for why the second check matters.
 *
 *  Returns the mounted placard on success, which is the entire reward. */
export function donate(world: WorldState, def: ExhibitDef): string | null {
  if (isDonated(world, def.id)) return null;
  if (!spend(world.inventory, { [def.cost.item]: def.cost.count })) return null;
  donations(world).push({ id: def.id, placard: 0 });
  return def.placards[0];
}

/** Everything given, oldest first, with the reading currently mounted.
 *
 *  This is the whole of the record. There is no second return value and no
 *  companion function reporting what is missing — see the header. */
export function collection(world: WorldState): { def: ExhibitDef; placard: string }[] {
  return donations(world).map((d) => {
    const def = exhibitDef(d.id);
    return { def, placard: placardText(def, d.placard) };
  });
}

/** Has she taken anything at all yet? For the panel's empty state, which is a
 *  line from her rather than a zero. */
export function collectionEmpty(world: WorldState): boolean {
  return donations(world).length === 0;
}

/** The away event (DESIGN §Time: "the Scholar mounts a new wrong exhibit").
 *
 *  Pick a donated exhibit that still has an unused reading and advance it by
 *  one. Returns what she remounted, or null when every placard in the museum
 *  has reached her final word on the subject — the postcard then talks about
 *  something else, rather than reporting the same revision twice.
 *
 *  Advancing never wraps. She revises until she runs out and then she stands
 *  by it; a cycling placard would make the museum a loop instead of a record. */
export function remountExhibit(
  world: WorldState,
  pick: (n: number) => number,
): { def: ExhibitDef; placard: string } | null {
  const revisable = donations(world).filter((d) => d.placard < exhibitDef(d.id).placards.length - 1);
  if (revisable.length === 0) return null;
  const chosen = revisable[pick(revisable.length)];
  chosen.placard += 1;
  const def = exhibitDef(chosen.id);
  return { def, placard: def.placards[chosen.placard] };
}

// --- The rival reading --------------------------------------------------------
// A Scholar RESIDENT's affinity perk (DESIGN §Affinity perks): they offer their
// own reading of a recent exhibit, and it disagrees with the curator's. The
// dialogue side is sim/dialogue.ts; this is the part that has to be careful.
//
// It is the first thing outside the museum panel to read the collection, so it
// READS AND NOTHING ELSE. No mutation — unlike `remountExhibit`, which is the
// other function here that names a placard — and no total, no count, nothing a
// caller could divide. "Nothing may ever gate on the collection" is about the
// files that can accept, refuse or house you, and museum.test.ts checks those
// by name; a scholar with an opinion about a plinth cannot stop anybody doing
// anything.
//
// HER RIVAL CARD IS ONE OF THE ROW'S OWN UNMOUNTED READINGS, not new writing.
// Corrigal's earlier drafts and her not-yet-mounted revisions are exactly the
// pool a second confidently incorrect authority should be drawing from — and it
// means adding an exhibit never also means writing a dissent for it, which is
// the same reason the placards came in threes in the first place.

/** How far back "a recent exhibit" reaches. Small on purpose: she is remarking
 *  on what is new in the room, not auditing the collection. */
const RECENT_EXHIBITS = 3;

export interface RivalReading {
  def: ExhibitDef;
  /** The card actually under the exhibit, in Corrigal's hand. */
  mounted: string;
  /** The reading this scholar holds instead — another placard from the same row. */
  rival: string;
}

/** A scholar's standing disagreement about something recently donated, or null
 *  when the museum holds nothing (or holds only single-reading rows, which the
 *  table currently has none of and a test keeps that way).
 *
 *  Derived from the scholar's ID rather than drawn from an rng: asked twice, she
 *  says the same thing. A scholar with a fresh theory every time you talk to her
 *  is noise, not an authority, and the joke needs her to have a POSITION. It
 *  moves only when the room does — a new donation slides the recent window, and
 *  if Corrigal eventually mounts the very card this scholar was holding out for,
 *  she is pushed onto another one. Which reads as her having been right all
 *  along, and is the best accident in this function. */
export function rivalReading(world: WorldState, who: string): RivalReading | null {
  const arguable = donations(world)
    .slice(-RECENT_EXHIBITS)
    .filter((d) => exhibitDef(d.id).placards.length > 1);
  if (arguable.length === 0) return null;

  const chosen = arguable[strHash(who) % arguable.length];
  const def = exhibitDef(chosen.id);
  const mounted = mountedIndex(def, chosen.placard);
  const others = def.placards.filter((_, i) => i !== mounted);
  return {
    def,
    mounted: def.placards[mounted],
    rival: others[strHash(`${who}:${def.id}`) % others.length],
  };
}

/** A deterministic uint32 from a string, so a scholar's position can be derived
 *  from ids instead of stored in the save. `hash2` takes ints, so the characters
 *  fold into one first. */
function strHash(s: string): number {
  let fold = 0;
  for (let i = 0; i < s.length; i++) fold = (Math.imul(fold, 31) + s.charCodeAt(i)) | 0;
  return hash2(fold, s.length, 0x5c40);
}

/** Which wings have anything in them, for the panel's headings. A wing with
 *  nothing given is not shown as an empty room with slots — it is not shown. */
export function wingsWithDonations(world: WorldState): WingId[] {
  const wings = new Set(donations(world).map((d) => exhibitDef(d.id).wing));
  return (["nature", "antiquities"] as WingId[]).filter((w) => wings.has(w));
}

// --- Plinths ------------------------------------------------------------------
// Where the exhibits physically stand. Derived from the collection every time
// rather than stored, which is not a performance choice — it is what makes the
// room incapable of disagreeing with the record. There is no plinth object to
// erase, no furniture cell to desync, and no migration when the layout moves.

/** An exhibit standing on its cell. */
export interface Plinth {
  x: number;
  y: number;
  def: ExhibitDef;
}

/** A continuous case: neighbouring exhibits on one row, drawn as ONE surface.
 *
 *  This is the per-cell edges band rule applied before it could bite for a
 *  fourth time. Six pedestals side by side would pair their light and dark
 *  edges into venetian-blind stripes and stop reading as a case at all, so the
 *  renderer is handed runs and outlines only where a run actually ends. */
export interface PlinthRun {
  y: number;
  /** Leftmost and rightmost cell of the run, inclusive. */
  x0: number;
  x1: number;
  on: Plinth[];
}

/** Every exhibit in the museum, placed. The Nth donation into a wing takes the
 *  Nth authored cell of that wing, so the cases fill in the order you gave
 *  things — the room is a history rather than a seating plan.
 *
 *  Silently drops anything beyond the authored cells. That is the right failure:
 *  running out of plinths should leave the museum looking slightly under-built,
 *  never throw in the middle of a frame. `museum.test.ts` asserts there are
 *  always enough cells, which is where that gets caught instead. */
export function plinths(world: WorldState): Plinth[] {
  const cells = TOWN_BUILDINGS.museum.plinths ?? [];
  const used: Record<string, number> = {};
  const out: Plinth[] = [];
  for (const d of donations(world)) {
    const def = exhibitDef(d.id);
    const n = used[def.wing] ?? 0;
    used[def.wing] = n + 1;
    const cell = cells.filter((c) => c.wing === def.wing)[n];
    if (cell) out.push({ x: cell.x, y: cell.y, def });
  }
  return out;
}

/** The placed exhibits grouped into contiguous per-row runs, for drawing.
 *
 *  A gap in a row splits the run, so a half-filled case is a short case rather
 *  than a long one with holes in it — which is the no-empty-slots rule showing
 *  up in geometry instead of in a panel. */
export function plinthRuns(world: WorldState): PlinthRun[] {
  const byRow = new Map<number, Plinth[]>();
  for (const p of plinths(world)) {
    const row = byRow.get(p.y) ?? [];
    row.push(p);
    byRow.set(p.y, row);
  }
  const runs: PlinthRun[] = [];
  for (const [y, row] of byRow) {
    row.sort((a, b) => a.x - b.x);
    let run: PlinthRun | null = null;
    for (const p of row) {
      if (run && p.x === run.x1 + 1) {
        run.x1 = p.x;
        run.on.push(p);
      } else {
        run = { y, x0: p.x, x1: p.x, on: [p] };
        runs.push(run);
      }
    }
  }
  return runs.sort((a, b) => a.y - b.y);
}

/** Total number of authored exhibits is deliberately not exported. If you came
 *  here looking for it to render "9 of 17", read content/museum.ts's header.
 *  This export exists only so the table can be iterated in tests. */
export const ALL_EXHIBITS: readonly ExhibitDef[] = MUSEUM;
