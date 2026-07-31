// The filing cabinet (DESIGN §Paperwork).
//
// Two halves, and only one of them is in the save:
//
//   • WHAT THE HALL OFFERS is a total function of how long you have lived here
//     (content/filings.ts `batchesBy`). Nothing schedules a batch, nothing
//     stores one, nothing counts them — the same discipline festivals keep, for
//     the same reason: state you don't write is state that can't be wrong.
//   • WHAT YOU HAVE FILED is `world.filings`, an accumulating record on exactly
//     the museum's model — a list of what you did, and nothing else.
//
// WHAT IS DELIBERATELY MISSING, and this is the whole fence:
//
//   • No count. Nothing here returns a length, a total, or a denominator, and
//     nothing may expose one. `world.filings.length` is a number the UI must
//     never render (ROADMAP 9b: "No filing count anywhere").
//   • No completion. There is no "all forms filed" state and nothing asks. The
//     counter running out is a fact about the HALL — it is between forms — and
//     never a verdict on the player.
//   • No teeth. Every row in the table changes nothing, so nothing outside this
//     file may read `world.filings` to decide anything. A filing that gated a
//     rule would make the cabinet a progression track, and it is a cabinet.
//   • No task. A form names nothing to go and do (§Errands notices), so there
//     is no "requirements" field to check and no state where a filing is
//     pending. You file it; it is filed.

import type { WorldState } from "./types";
import type { FilingBatch, FilingDef, FilingId } from "../content/filings";
import { batchesBy, filingDef, FILING_BATCHES } from "../content/filings";

const DAY_MS = 86_400_000;

/** A filing, as the save holds it. An id and when — deliberately not the text,
 *  which lives in content and may be reworded without migrating anybody's
 *  cabinet (the same split as the museum's `placard` index). */
export interface Filing {
  id: FilingId;
  at: number;
}

/** How long you have lived here, in whole days.
 *
 *  Off `createdAt`, which is when the save was made rather than when you claimed
 *  your land — they are minutes apart and the difference would only ever matter
 *  to a form that nobody is waiting on. Elapsed rather than calendar days: "I
 *  have been here three days" is about duration, and a town founded at 11pm
 *  should not be two days old at midnight. */
export function daysInTown(world: WorldState, now: number): number {
  return Math.max(0, Math.floor((now - world.createdAt) / DAY_MS));
}

/** The batches the hall is obliged to offer right now, oldest first — including
 *  ones whose forms you have all filed already, because the NOTICE is worth
 *  keeping on the wall after the forms under it have gone. */
export function releasedBatches(world: WorldState, now: number): FilingBatch[] {
  return batchesBy(daysInTown(world, now));
}

/** Forms currently on the counter: released, and not yet filed.
 *
 *  Filed forms leave rather than sitting there stamped, which is the one place
 *  this could have grown a completion state by accident. A list with ticks down
 *  the side of it is a checklist however it is worded. */
export function openForms(world: WorldState, now: number): FilingDef[] {
  const filed = new Set(world.filings.map((f) => f.id));
  return releasedBatches(world, now)
    .flatMap((b) => b.forms)
    .filter((f) => !filed.has(f.id));
}

/** The batches with something still to file under them, so the counter can show
 *  each notice above its own forms. A batch you have finished with drops out of
 *  the counter entirely — its notice reappears in the cabinet, over the filings
 *  it produced, which is where a reason belongs once it has had its effect. */
export function counterBatches(world: WorldState, now: number): { batch: FilingBatch; forms: FilingDef[] }[] {
  const filed = new Set(world.filings.map((f) => f.id));
  return releasedBatches(world, now)
    .map((batch) => ({ batch, forms: batch.forms.filter((f) => !filed.has(f.id)) }))
    .filter((b) => b.forms.length > 0);
}

/** Submit a form. Free, and it changes nothing — see the header.
 *
 *  Returns the stamp to show, or null if it was already filed. Refusing the
 *  duplicate here rather than trusting the caller is what keeps the cabinet a
 *  record: two identical filings would be one event written twice. */
export function file(world: WorldState, id: FilingId, now: number): string | null {
  if (world.filings.some((f) => f.id === id)) return null;
  world.filings.push({ id, at: now });
  return filingDef(id).stamp;
}

/** The whole of the cabinet, oldest first, grouped under the batch that
 *  produced each filing.
 *
 *  There is no second return value and no companion function reporting what is
 *  missing — the same sentence the museum's `collection` carries, and the same
 *  reason. You find out what else the hall has by living here.
 *
 *  Groups that have nothing filed under them are absent, so this never shows an
 *  empty shelf with a reason over it — an empty slot with a label is the "???"
 *  the tone rules ban, in a filing cabinet. */
export function cabinet(world: WorldState): { batch: FilingBatch; filings: { def: FilingDef; at: number }[] }[] {
  const byId = new Map(world.filings.map((f) => [f.id, f.at]));
  const out: { batch: FilingBatch; filings: { def: FilingDef; at: number }[] }[] = [];
  // Walks the whole table rather than `world.filings`, so the cabinet reads in
  // the order the town acquired its bureaucracy rather than the order you
  // happened to work through it. The hall would insist.
  for (const batch of FILING_BATCHES) {
    const filings = batch.forms
      .filter((f) => byId.has(f.id))
      .map((f) => ({ def: f, at: byId.get(f.id)! }));
    if (filings.length > 0) out.push({ batch, filings });
  }
  return out;
}

/** True when the cabinet has nothing in it — an empty state that a line can
 *  answer, rather than a zero. Same shape as the museum's `collectionEmpty`. */
export function cabinetEmpty(world: WorldState): boolean {
  return world.filings.length === 0;
}
