// What the ground remembers (DESIGN §"A place keeps a history").
//
// sim/memory.ts is a log per PERSON. This is the same idea for a coordinate: a
// room knows who has slept in it and what has happened inside its walls, and
// says so when asked or when a resident brings it up.
//
// ANCHORED TO COORDINATES, NEVER TO A BUILDING. A building has no identity in
// this game and must not acquire one — `Room.id` is "the lexicographically
// smallest interior key" (sim/rooms.ts), which is stable across recomputes and
// emphatically NOT stable across renovation: extend a house one row north and
// its id changes. A history filed under the walls would be erased by the
// player improving the house, which is the exact opposite of the promise.
//
// So events are remembered where they happened, and a room merely CONTAINS the
// ones inside it (see `placesIn`). Knock out a wall and push the house into the
// next field and it keeps everything it had and inherits what that field
// remembers. Nothing needs to be migrated when walls move, because nothing was
// ever keyed on them.
//
// Pure data + pure helpers, so it serialises straight into the save and tests
// can assert on it — same shape as memory.ts.

import { tileKey } from "./world";

/** How far apart two events of the same kind have to be before the ground
 *  bothers to remember them separately. Eight tiles swallows a house and a
 *  yard; the grove and the homestead stay different places.
 *
 *  This constant is what makes the log survivable. A floor is two hundred
 *  boards and ONE afternoon: recording two hundred entries would be both a lie
 *  about what happened and a flood that pushes every older entry out. What
 *  survives the merge is the sentence that was true all along — you laid these
 *  boards — and never a measure of how many (DESIGN: a memory, never a meter). */
export const PLACE_MERGE = 8;

/** A deliberately small ring. The scale here is honest to the town's real
 *  churn, which is a handful of names — arrivals run out at four, on purpose —
 *  and with the merge rule above doing nearly all the work, this cap should
 *  almost never be the thing that bites. It is a backstop, not a budget. */
export const MAX_PLACES = 24;

export type PlaceKind =
  // Somebody's, and merged per PERSON rather than by distance:
  | "met" // the first time you spoke to them, and where you were standing
  | "slept" // a bed they claimed. Past sleepers stay; that IS the history
  // Work the ground saw, merged by distance (see PLACE_MERGE):
  | "built_floor"
  | "dug"
  | "gathered"
  | "planted"
  | "harvested";

/** The witnessed kinds the GROUND also hears — `MemoryKind` and `PlaceKind`
 *  share these names on purpose, so `witness` forwards without a lookup table
 *  that could drift from the union above.
 *
 *  `hum` is deliberately absent, twice over. The Humming Cube stands in the
 *  wild and not in anybody's room, so nothing would ever read the entry; and
 *  the town does not hear about the cube (sim/memory.ts) — writing it into a
 *  log a UI reads back would be the game telling you about a secret. */
export function isWorkPlace(kind: string): kind is PlaceKind {
  return (
    kind === "built_floor" ||
    kind === "dug" ||
    kind === "gathered" ||
    kind === "planted" ||
    kind === "harvested"
  );
}

export interface PlaceEvent {
  kind: PlaceKind;
  x: number;
  y: number;
  at: number; // ms epoch
  /** The villager it is about, for the kinds that are about somebody. Absent on
   *  work events, which are about the ground and not about anyone. */
  who?: string;
}

export type PlaceLog = PlaceEvent[];

/** Kinds whose identity is a person, not a location. Two residents who first
 *  spoke to you in the same room are two memories, however close they stood. */
const PERSONAL: PlaceKind[] = ["met", "slept"];

/** Append an event, merging it into one the place already holds.
 *
 *  Three different merges, because the kinds mean different things:
 *
 *  - `met` is a FIRST. One per villager, ever, and a later meeting never
 *    overwrites it — "the room where you first met Eloise" stops being true the
 *    moment a second visit can move it.
 *  - `slept` is one per villager PER BED. Rehousing someone adds a spell rather
 *    than replacing one, because a room they have moved out of is precisely
 *    what a past sleeper is.
 *  - everything else merges by distance, per PLACE_MERGE. */
export function rememberPlace(log: PlaceLog, ev: PlaceEvent): PlaceLog {
  if (PERSONAL.includes(ev.kind)) {
    const dup = log.some(
      (p) =>
        p.kind === ev.kind &&
        p.who === ev.who &&
        (ev.kind === "met" || (p.x === ev.x && p.y === ev.y)),
    );
    if (dup) return log;
  } else if (log.some((p) => p.kind === ev.kind && near(p, ev))) {
    return log;
  }
  const next = [...log, ev];
  return next.length > MAX_PLACES ? next.slice(next.length - MAX_PLACES) : next;
}

function near(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) <= PLACE_MERGE && Math.abs(a.y - b.y) <= PLACE_MERGE;
}

/** Everything this set of cells remembers, oldest first.
 *
 *  Takes cells rather than a Room so the caller decides whether a doorway
 *  counts — and so a test can ask what a bare patch of field remembers without
 *  building a house around it first. */
export function placesIn(log: PlaceLog, cells: Set<string>): PlaceEvent[] {
  return log.filter((p) => cells.has(tileKey(p.x, p.y)));
}
