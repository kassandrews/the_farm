// Giving someone a home — the acceptance test, written once and used twice.
//
// The verb is "give them a home", not "build them a house" (ROADMAP §Housing).
// A home is any room that QUALIFIES; building one is just the most interesting
// way to produce a qualifying room, and pointing someone at a house that already
// exists is the same act with less work in front of it. That reframe is what
// splits the flagship along the phase line: this module is the machinery, and a
// Phase 3 commission is content that CALLS it rather than a second system that
// reinvents it.
//
// WHY qualify() RETURNS A REASON, NOT A BOOLEAN. Both callers need the same
// fact in different voices: the assignment panel tells the player "it needs a
// door", and the Office Creature's commission says the same thing on a form. A
// boolean would force each of them to re-derive why, and the two would drift
// into disagreeing about what a house is — which is exactly the class of bug
// the reticle rule exists to prevent (ROADMAP §"The reticle is the promise").
//
// WHAT ISN'T IN HERE, DELIBERATELY: size. qualify() hands back the Room on
// success, so a commission that wants a minimum checks room.interior.size at its
// own call site. A minimum size is a COMMISSION's requirement, not a housing
// rule — DESIGN is explicit that structure is the only gate and that finish,
// furniture and size beyond the minimum are noticed and rewarded but never block
// move-in. Putting a size verdict here would give housing an opinion it must not
// have, and would turn a gift into a chore with a pass/fail on it.

import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";
import { charDef, livesSomewhere } from "../content/cast";
import type { Room } from "./rooms";
import { roomAt } from "./rooms";
import { structureAt } from "./structures";
import { furnitureAt } from "./furniture";
import { claimedBed } from "./housing";
import { tileKey, parseTileKey } from "./world";
import { rememberPlace } from "./places";

/** Why this isn't somewhere for this person to live.
 *
 *  THREE ABOUT THE HOUSE AND ONE ABOUT THE PERSON, and the line that matters is
 *  the one none of them crosses: not one is a "this house isn't nice enough"
 *  answer. DESIGN is explicit that structure is the only gate and that finish,
 *  furniture and size beyond the minimum are noticed and rewarded but never
 *  block move-in — a quality verdict here would turn a gift into a chore with a
 *  pass/fail on it.
 *
 *  `no-resident` is a fact about who you asked, which is the same shape
 *  sim/company.ts's `Refusal` already carries ("rooted", "stranger") — the two
 *  unions are modelled on each other and its docblock says so. */
export type Disqualifier =
  | "no-bed" // you didn't point at a bed
  | "no-room" // it's outdoors, or the walls don't close (see MAX_ROOM)
  | "no-door" // sealed: a room nobody can get into isn't a home
  | "no-resident"; // they don't live in the town — they ARE somewhere in it

export type Verdict =
  | {
      ok: true;
      room: Room;
      /** Who already sleeps here, if anyone. Not a disqualifier: offering a bed
       *  to its current occupant is a no-op, and offering someone else's bed is
       *  a decision the CALLER should be able to present ("Margfrom sleeps
       *  here") rather than one this function silently refuses. */
      occupant: CharId | null;
    }
  | { ok: false; why: Disqualifier };

/** Human-facing reason, in the player's voice. The Office Creature will want the
 *  same facts on letterhead; that's his line to write, not this one. */
export const DISQUALIFIER_TEXT: Record<Disqualifier, string> = {
  "no-bed": "There's no bed there.",
  "no-room": "That bed is out in the open. It needs walls that meet.",
  "no-door": "There's no way in. It needs a door.",
  // Not an apology and not a refusal of the gift — a correction about who they
  // are. Gary is not homeless; Gary is the town hall.
  "no-resident": "They already live where they work. That's rather the point.",
};

/** Is this bed somewhere someone could live?
 *
 *  Takes a cell, not an anchor: the player points at any part of a bed, the same
 *  way erase does, so this resolves the anchor itself rather than making every
 *  caller do it. */
export function qualify(world: WorldState, x: number, y: number): Verdict {
  const found = furnitureAt(world, x, y);
  if (!found || found.cell.id !== "bed") return { ok: false, why: "no-bed" };

  // A bed is solid, so the room is the space AROUND it — asking roomAt on the
  // bed's own cell would ask which room contains a wall. Any covered cell's
  // orthogonal neighbours are inside the room with it.
  const room = roomAround(world, found.ax, found.ay);
  if (!room) return { ok: false, why: "no-room" };
  if (!hasDoor(world, room)) return { ok: false, why: "no-door" };

  const key = tileKey(found.ax, found.ay);
  const occupant = world.villagers.find((v) => v.homeBed === key)?.id ?? null;
  return { ok: true, room, occupant };
}

/** The room a piece of furniture stands in. */
function roomAround(world: WorldState, ax: number, ay: number): Room | null {
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as [number, number][]) {
    const room = roomAt(world, ax + dx, ay + dy);
    if (room) return room;
  }
  return null;
}

/** Does this room have a way in?
 *
 *  Checked against the SHELL rather than by walking the perimeter, because the
 *  shell is already exactly "the pieces enclosing this room" and rooms.ts is the
 *  one place allowed to decide what encloses what. Note this asks only that a
 *  door EXISTS — whether its doorstep is clear, and whether it's on a wall that
 *  renders a face, are two known gaps that bite player-built houses (ROADMAP)
 *  and want fixing where they live rather than being smuggled in as extra
 *  housing requirements. */
function hasDoor(world: WorldState, room: Room): boolean {
  for (const key of room.shell) {
    const at = parseTileKey(key);
    if (at && structureAt(world, at.x, at.y)?.id === "door") return true;
  }
  return false;
}

/** A bed of your OWN — somewhere you sleep that is not somebody else's home.
 *
 *  The third caller of qualify(), and the reason the module docblock says
 *  "written once and used twice" is now out by one. Housing yourself asks the
 *  identical structural question everybody else's home is asked: a bed, walls
 *  that meet, a way in. Nothing more.
 *
 *  NO MINIMUM SIZE, unlike a commission. A newcomer's four-cell floor is the
 *  Office Creature's requirement, on his form, about a house you are building
 *  FOR someone; nobody files paperwork about where you sleep, so there is no
 *  one to have that opinion. DESIGN is explicit that structure is the only gate.
 *
 *  DERIVED, NEVER STORED. The player has no `homeBed`, on purpose: a stored
 *  claim could disagree with the world the moment you demolish a wall, and then
 *  the game would believe you live somewhere you cannot get into. Yours is
 *  simply the qualifying bed nobody else has claimed — and if you own two, the
 *  first is as good an answer as the second, because the only question being
 *  asked is whether you have somewhere at all.
 *
 *  Null when there is nowhere, which is the state a fresh save is in and the
 *  state a demolished house goes back to. */
export function playerHome(world: WorldState): { x: number; y: number } | null {
  for (const b of beds(world)) {
    if (!b.verdict.ok || b.verdict.occupant !== null) continue;
    return { x: b.x, y: b.y };
  }
  return null;
}

/** Every bed in town that someone could be moved into, with its verdict.
 *
 *  Seeded from world.furniture rather than by scanning the map — the world is
 *  unbounded, so "look everywhere" isn't available, the same constraint that
 *  shapes roomsOf(). */
export function beds(world: WorldState): { x: number; y: number; verdict: Verdict }[] {
  const out: { x: number; y: number; verdict: Verdict }[] = [];
  for (const [key, cell] of Object.entries(world.furniture)) {
    if (cell.id !== "bed") continue;
    const at = parseTileKey(key);
    if (!at) continue;
    out.push({ x: at.x, y: at.y, verdict: qualify(world, at.x, at.y) });
  }
  return out;
}

/** Move a villager into the bed at this cell. Returns the verdict it acted on,
 *  so a refusal explains itself in the same call.
 *
 *  Evicting the previous occupant is deliberate and total: two villagers holding
 *  the same anchor key would be two claims on one fact, and the loser would be
 *  decided by iteration order somewhere far from here. Whoever was there falls
 *  back to the plaza, which is the same honest homelessness a demolished bed
 *  produces (sim/housing.ts) — and something step 5 can give them a line about.
 *
 *  Takes `now` because the room remembers the day (Phase 9a). This is the ONLY
 *  place a sleeper spell is written, and the two other ways a claim can change
 *  are both deliberately silent:
 *
 *  • `claimAuthoredBeds` (sim/housing.ts) hands out the town's authored beds at
 *    world creation. Margfrom was living there before you arrived, so nobody
 *    witnessed her moving in — recording it would be the log inventing a day,
 *    which is the same thing the v23 migration refuses to do (sim/save.ts).
 *  • `rehomeAcrossStroke` below carries a claim onto a bed that MOVED. Sliding
 *    somebody's bed a tile left is not a new spell in their life, it is the
 *    same one with the furniture rearranged, and the entry stays where the
 *    spell began. At room granularity — which is the only granularity anything
 *    reads this at — that is simply correct. */
export function assign(world: WorldState, id: CharId, x: number, y: number, now: number): Verdict {
  // WHO, before WHERE. An institution has no home stop in its ring and never
  // walks anywhere (`tickVillager` returns early on `fixed`), so housing one
  // wrote a claim nobody would ever act on — and, worse, took the bed out of the
  // pool: `assign` clears any other claim on that bed, so giving the Menace the
  // spare room could leave an actual arrival with nowhere to move in to.
  //
  // Checked here as well as in the UI for the reason sim/company.ts gives about
  // its own pair: the panel shows the button, this enforces it, and one
  // predicate answers both so they cannot drift.
  const them = world.villagers.find((w) => w.id === id);
  if (them && !livesSomewhere(charDef(them))) return { ok: false, why: "no-resident" };

  const verdict = qualify(world, x, y);
  if (!verdict.ok) return verdict;

  const found = furnitureAt(world, x, y)!;
  const key = tileKey(found.ax, found.ay);
  for (const other of world.villagers) {
    if (other.id !== id && other.homeBed === key) other.homeBed = null;
  }
  const v = world.villagers.find((w) => w.id === id);
  if (v) v.homeBed = key;
  world.places = rememberPlace(world.places, {
    kind: "slept",
    x: found.ax,
    y: found.ay,
    at: now,
    who: id,
  });
  return verdict;
}

// --- The moved-bed seam -------------------------------------------------------
// Moving a bed is demolish + place, which mints a NEW anchor key — so without
// this, sliding a bed one tile left unhouses whoever slept in it and drops them
// in the plaza. Honest, but not what the player was trying to do.
//
// THE UNIT IS NOT ONE STROKE. It was designed as one and that was wrong, found
// by driving the real UI: erase and bed are different TOOLS, so a player cannot
// demolish and place inside a single gesture. Moving a bed is always at least
// two strokes with a palette tap between them, and a same-stroke rule would have
// fired approximately never. The unit tests missed it because they call buildAt
// directly, where "one stroke" is whatever the test says it is — the exact shape
// of bug ROADMAP's house rule about verifying in a browser exists to catch.
//
// So the orphaned claim WAITS. When a stroke takes away someone's only bed we
// remember, in memory, that they are looking; the next stroke that puts down a
// single unclaimed bed hands it to them.
//
// This is not a second record of where someone lives — it is a record that
// someone lives NOWHERE, which the world already says out loud (their claim is
// null and stays null until this resolves). It's the same shape as the undo
// buffer: a WeakMap keyed by world, one level, never serialised, gone on reload.
// If the player closes the game mid-move, the bed is just a bed and they
// re-offer it in conversation — which is the feature above, working normally.

/** Who lost their bed to the last stroke and hasn't been given another. At most
 *  one: a drag that orphans two people is not somebody moving house, and
 *  guessing between them would be worse than the honest fallback. */
const pending = new WeakMap<WorldState, CharId>();

/** Reconcile the beds after a build stroke. Call once per stroke, with the bed
 *  keys as they stood when it opened.
 *
 *  Two halves, and a stroke can do either or both:
 *   • it ORPHANED someone → remember them
 *   • it PLACED a single free bed → give it to whoever's waiting */
export function rehomeAcrossStroke(world: WorldState, before: Set<string>): void {
  const now = bedKeys(world);

  // Half one: did this stroke break exactly one claim?
  const orphaned = world.villagers.filter(
    (v): v is Villager & { homeBed: string } =>
      v.homeBed !== null && before.has(v.homeBed) && !now.has(v.homeBed),
  );
  if (orphaned.length === 1) pending.set(world, orphaned[0].id);
  else if (orphaned.length > 1) pending.delete(world); // ambiguous: don't guess

  // Half two: did it put down exactly one new bed?
  const appeared = [...now].filter((k) => !before.has(k));
  if (appeared.length !== 1) return;
  const moved = appeared[0];

  const waiting = pending.get(world);
  if (!waiting) return;
  const v = world.villagers.find((w) => w.id === waiting);
  // Only if they're STILL homeless — a conversation may have rehoused them in
  // between, and a deliberate offer must always beat this inference.
  if (!v || claimedBed(world, v)) return;
  // And never a bed someone else's claim is already pointed at.
  if (world.villagers.some((w) => w.homeBed === moved)) return;

  v.homeBed = moved;
  pending.delete(world);
}

/** Is someone waiting on a bed after a demolition? For tests and for the UI's
 *  "…will need somewhere else" line. */
export function pendingRehome(world: WorldState): CharId | null {
  return pending.get(world) ?? null;
}

/** Snapshot the beds standing right now, for rehomeAcrossStroke to compare
 *  against. Cheap: furniture is sparse and beds are a handful of it. */
export function bedKeys(world: WorldState): Set<string> {
  const out = new Set<string>();
  for (const [key, cell] of Object.entries(world.furniture)) {
    if (cell.id === "bed") out.add(key);
  }
  return out;
}
