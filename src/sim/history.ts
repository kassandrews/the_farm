// Reading a ROOM as something to talk about — the same job sim/home.ts does for
// a villager's house, pointed at the ground instead of at the person.
//
// sim/places.ts is the log; this is the vocabulary. Nothing here is machinery:
// it is a pure read of state that already exists, turned into a small set of
// things worth remarking on, so the banks in content/history.ts stay pure line
// pools and selection stays in sim/dialogue.ts and the UI. Exactly the layering
// home.ts uses, and for the same reason — three opinions about what a house is
// would drift (ROADMAP §"The reticle is the promise").
//
// IT ASKS `rooms.ts`, IT DOESN'T RE-DERIVE. A room is whatever rooms.ts says it
// is; this file has no theory of enclosure of its own.
//
// WHAT IS DELIBERATELY MISSING: any notion of how much. No count of entries, no
// "this room has 4 of 7 memories", nothing that could be divided by anything.
// A caller can ask what a room remembers and gets sentences; there is no way to
// ask how well remembered it is, because that is a score with a roof on it
// (DESIGN §"A place keeps a history").

import type { WorldState } from "./types";
import { roofRoomAt } from "./rooms";
import { placesIn } from "./places";
import type { PlaceEvent } from "./places";
import { tileKey } from "./world";
import { seasonOn } from "../content/seasons";
import { HISTORY_LINES } from "../content/history";

export type HistoryNoteKind =
  // About a person:
  | "met" // you and they first spoke in this room
  | "sleeper" // they sleep here now
  | "past_sleeper" // they slept here once; their bed is elsewhere, or gone
  // About the ground:
  | "built_floor"
  | "dug"
  | "gathered"
  | "planted"
  | "harvested";

export interface HistoryNote {
  kind: HistoryNoteKind;
  /** The villager it concerns, by NAME and ready to render. Empty for the
   *  kinds that are about the ground and not about anybody. */
  who: string;
  /** The season it began in — "spring" — or empty when it began in the season
   *  we are still standing in. A line hangs "since ..." on this and drops the
   *  clause when it's empty: "has slept here since spring" is a fact about
   *  time passing, and saying it about something that happened on Tuesday
   *  would be the room being grandiose. */
  when: string;
}

/** Which of a room's memories it offers first. People outrank ground: a room
 *  that can say who sleeps in it should not lead with the floorboards.
 *
 *  `met` first of all, because it is the only one of these the player could not
 *  have worked out by looking around. */
export const HISTORY_PRIORITY: HistoryNoteKind[] = [
  "met",
  "sleeper",
  "past_sleeper",
  "built_floor",
  "planted",
  "harvested",
  "gathered",
  "dug",
];

/** What the room containing this cell remembers, most interesting first.
 *
 *  Empty for anywhere that isn't inside a room — a field remembers things too
 *  (the log is coordinates all the way down), but there is nothing there to
 *  ask, and a patch of grass volunteering its past would be the game narrating
 *  the whole map at you. */
export function describeHistory(world: WorldState, x: number, y: number, now: number): HistoryNote[] {
  // `roofRoomAt`, not `roomAt`: interior AND shell, at both ends of the
  // question. A DOOR is a shell cell, and asking a house about itself from its
  // own doorstep is the whole inspection gesture — with the interior-only
  // version, the one place you would naturally stand to ask is the one place
  // that answers "there is no room here". It reads the same way round, too: the
  // boards you laid run under the walls.
  const room = roofRoomAt(world, x, y);
  if (!room) return [];

  const cells = new Set([...room.interior, ...room.shell]);
  const events = placesIn(world.places, cells);

  // `SeasonDef.name` is already the lowercase speakable noun, by contract — it
  // is the one that lands in dialogue and the postcard (content/seasons.ts).
  const season = seasonOn(now).name;
  const notes: HistoryNote[] = [];

  for (const ev of events) {
    const when = seasonOn(ev.at).name;
    const since = when === season ? "" : when;
    if (ev.kind === "met") {
      const name = nameOf(world, ev.who);
      if (name) notes.push({ kind: "met", who: name, when: since });
    } else if (ev.kind === "slept") {
      const name = nameOf(world, ev.who);
      if (!name) continue;
      // Do they still sleep here? Their claim is the live answer and this log
      // is the historical one; asking the claim is what keeps "used to" honest
      // when the player rehouses somebody (sim/assign.ts).
      const v = world.villagers.find((w) => w.id === ev.who);
      const still = v?.homeBed === tileKey(ev.x, ev.y);
      notes.push({ kind: still ? "sleeper" : "past_sleeper", who: name, when: since });
    } else {
      notes.push({ kind: ev.kind, who: "", when: since });
    }
  }

  return notes.sort(
    (a, b) => HISTORY_PRIORITY.indexOf(a.kind) - HISTORY_PRIORITY.indexOf(b.kind),
  );
}

/** A villager's display name, or null if the log outlived them. A `who` that
 *  names nobody drops its note rather than rendering a blank — an entry about
 *  someone who isn't here any more is a sentence with a hole in it. */
function nameOf(world: WorldState, who: string | undefined): string | null {
  if (!who) return null;
  return world.villagers.find((v) => v.id === who)?.name ?? null;
}

/** Has the room containing this cell got anything to say? A YES/NO, and never a
 *  how-many (see the header).
 *
 *  Doesn't take `now`, because it doesn't need one: `now` only decides how a
 *  season clause is PHRASED, not whether there is anything to phrase. That is
 *  what lets the action ladder ask this question — it resolves a target without
 *  a clock (sim/game.ts `actionTarget`). */
export function roomRemembers(world: WorldState, x: number, y: number): boolean {
  const room = roofRoomAt(world, x, y);
  if (!room) return false;
  const cells = new Set([...room.interior, ...room.shell]);
  return placesIn(world.places, cells).some((ev) => named(world, ev));
}

/** Would this event survive into a note? Only the personal kinds can fail, and
 *  only by naming somebody the town no longer has. Shared with `roomRemembers`
 *  so the ladder never offers to read a room whose only entry is a hole. */
function named(world: WorldState, ev: PlaceEvent): boolean {
  return ev.kind === "met" || ev.kind === "slept" ? nameOf(world, ev.who) !== null : true;
}

/** The line a house says when you stand at its door — the top two things it
 *  remembers, run together.
 *
 *  TWO, not one and not all of them. One means the highest-priority note is the
 *  only sentence a room will ever speak, and `met` outranks everything, so a
 *  room where you met somebody would never mention anything else it knows.
 *  All of them is a wall of text on a doorstep, and it is also the shape of an
 *  inventory — a room reciting its complete contents invites you to check
 *  whether another room has more, which is the checklist this whole phase is
 *  fenced against. Two is a remark. */
export function historyLine(world: WorldState, x: number, y: number, now: number): string | null {
  const notes = describeHistory(world, x, y, now).slice(0, 2);
  if (notes.length === 0) return null;
  // ONE SEASON PER BREATH. Found by reading the real flash, which is the only
  // place this grammar is visible: two notes from the same season came out as
  // "...first met Prudence, back in spring. You laid these boards yourself, in
  // spring." Both sentences were true and the pair read like a form letter. The
  // clause says WHEN, and once it has been said the second sentence is already
  // in that season.
  let said = "";
  return notes
    .map((n) => {
      const when = n.when === said ? "" : n.when;
      if (n.when) said = n.when;
      return HISTORY_LINES[n.kind](n.who, when);
    })
    .join(" ");
}
