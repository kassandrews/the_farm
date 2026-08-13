// Reading someone's home as something to TALK about (ROADMAP 2b step 5).
//
// housing.ts answers "where does this villager live". This answers "what is it
// like, and what would they mention". Nothing here is machinery — it is a pure
// read of state that already exists, turned into a small vocabulary of things
// worth remarking on, so the banks in content/dialogue.ts stay pure line pools
// and selection stays in sim/dialogue.ts.
//
// IT CALLS qualify(), IT DOESN'T RE-DERIVE. Step 4 left this hook on purpose:
// qualify() already decides what a house is and hands back the Room, so "your
// walls don't meet" and "there's no way in" are the SAME verdicts the assignment
// panel shows and the Phase 3 commission will put on letterhead. If this module
// asked the world directly, there would be a third opinion about what a house
// is, and the three would drift (ROADMAP §"The reticle is the promise").
//
// WHY A STALE CLAIM SPEAKS AND A NULL ONE DOESN'T. Homelessness is only worth a
// line when it's a CHANGE. A villager whose claim points at a bed that isn't
// there any more has had something taken from them and should say so; a villager
// with no claim at all may simply never have had one — the Office Creature has
// never wanted a bed, and having him complain about it nightly would be the game
// mistaking an institution for a person. Both states are already distinguished
// by the data (housing.ts lets a claim go stale rather than tidying up after a
// demolition), so this costs no new state and no new flag.

import type { WorldState, Villager } from "./types";
import type { SkinId } from "../content/skins";
import { skinDef } from "../content/skins";
import type { FurnitureId } from "../content/furniture";
import { furnitureDef } from "../content/furniture";
import { tasteOf } from "../content/tastes";
import { qualify } from "./assign";
import { claimedBed } from "./housing";
import { cellsFor } from "./furniture";
import { parseTileKey, tileKey } from "./world";

/** Interior cells at or below which a room reads as snug rather than merely
 *  small — and at or above which it reads as grand. Between them a room is just
 *  a room, which is most of them, and the villager finds something else to
 *  mention. Deliberately NOT a quality judgement: DESIGN is explicit that size
 *  beyond a commission's minimum is noticed and never graded. */
export const SNUG = 6;
export const GRAND = 24;

export type HomeNoteKind =
  // Something is wrong, and it's the player's doing. Said readily.
  | "homeless" // their bed is gone; the claim outlived the furniture
  | "roofless" // the bed is there, the walls aren't. Open sky over the pillow.
  | "sealed" // enclosed with no door: a home nobody can get into
  // Something they're pleased by. Said occasionally, but ahead of the rest.
  // TWO kinds rather than one, because "you built it in dark walnut" and "you
  // put a shelf in" are not the same sentence, and a single bank keyed on
  // "delight" produced lines like "shelf ... You paid attention." — found by
  // reading the real modal, which is the only place the grammar is visible.
  | "delight_finish" // built of what they like (content/tastes.ts)
  | "delight_piece" // furnished with what they like
  // Something is true, and worth remarking on. Said occasionally.
  | "bare" // the bed and nothing else
  | "grand"
  | "snug"
  | "furnished" // names a piece that's in there with them
  | "finish"; // names what it's built of

export interface HomeNote {
  kind: HomeNoteKind;
  /** Rendered into the line template — a piece's name, a finish's name, a size.
   *  Always a string, because that's what a template takes. */
  value: string;
}

/** Which notes a villager reaches for first. Trouble outranks decor: someone
 *  standing in the plaza at 2am has something more pressing to say than that
 *  they like the shelf. */
export const NOTE_PRIORITY: HomeNoteKind[] = [
  "homeless",
  "roofless",
  "sealed",
  // Above the plain observations and below the troubles. If you went to the
  // bother of building someone the thing they like, that is the most
  // interesting true fact about their house, and them leading with "it's bare"
  // instead would read as the game not having noticed.
  "delight_finish",
  "delight_piece",
  "bare",
  "grand",
  "snug",
  "furnished",
  "finish",
];

/** The notes that are about something being WRONG. Selection says these much
 *  more readily — a consequence the player caused should be legible, and a
 *  villager who mentions their missing bed one time in ten is a villager the
 *  player concludes is fine. */
export const URGENT: HomeNoteKind[] = ["homeless", "roofless", "sealed"];

/** Everything this villager could remark on about where they live, richest
 *  first. Empty when they have no claim at all — see the header. */
export function describeHome(world: WorldState, v: Villager): HomeNote[] {
  if (!v.homeBed) return [];

  const bed = claimedBed(world, v);
  if (!bed) return [{ kind: "homeless", value: "" }];

  const verdict = qualify(world, bed.x, bed.y);
  if (!verdict.ok) {
    if (verdict.why === "no-room") return [{ kind: "roofless", value: "" }];
    if (verdict.why === "no-door") return [{ kind: "sealed", value: "" }];
    return []; // "no-bed" can't happen: claimedBed just proved there is one
  }

  const room = verdict.room;
  const notes: HomeNote[] = [];

  // Anything you SLEEP in, not the id "bed": a room furnished with a double is
  // exactly as bare as one furnished with a single (§sleeps).
  const others = furnitureIn(world, room.interior).filter((id) => !furnitureDef(id).sleeps);
  if (others.length === 0) notes.push({ kind: "bare", value: "" });

  const size = room.interior.size;
  if (size >= GRAND) notes.push({ kind: "grand", value: String(size) });
  else if (size <= SNUG) notes.push({ kind: "snug", value: String(size) });

  if (others.length > 0) {
    // The last piece placed isn't knowable (furniture keeps no timestamp — it
    // has an anchor and nothing else, deliberately), so this names whatever
    // sorts first. Stable, which matters more here than fresh: a villager who
    // mentions a different piece every single time reads as scatty, not
    // observant.
    const named = others.map((id) => furnitureDef(id).name.toLowerCase()).sort()[0];
    notes.push({ kind: "furnished", value: named });
  }

  const finish = dominantFinish(world, room.shell);
  if (finish) notes.push({ kind: "finish", value: skinDef(finish).name.toLowerCase() });

  // Does any of the above happen to be what this form likes? A match adds a
  // note; a miss adds nothing and removes nothing (content/tastes.ts). The
  // finish outranks the piece because choosing what a house is MADE of is the
  // more deliberate act — you can drop a chair in anywhere, but you built those
  // walls that colour on purpose.
  const taste = tasteOf(v.form);
  if (taste) {
    if (taste.finish && finish === taste.finish) {
      notes.push({ kind: "delight_finish", value: skinDef(taste.finish).name.toLowerCase() });
      // `some` rather than `includes`: `others` has already had "bed" filtered
      // out of its type, and a bed is not a taste anyway — everyone gets one.
    } else if (taste.piece && others.some((id) => id === taste.piece)) {
      notes.push({ kind: "delight_piece", value: furnitureDef(taste.piece).name.toLowerCase() });
    }
  }

  return notes.sort(
    (a, b) => NOTE_PRIORITY.indexOf(a.kind) - NOTE_PRIORITY.indexOf(b.kind),
  );
}

/** Which furniture ids stand in these cells. A piece counts if ANY of its cells
 *  is inside — a table half under the wall line is still in the room with you. */
function furnitureIn(world: WorldState, interior: Set<string>): FurnitureId[] {
  const out: FurnitureId[] = [];
  // BOTH RECORDS. A rug is furniture in the room whether or not something is
  // standing on it — a room that stopped being cosy the moment you put the
  // table back on the carpet would be the layering showing through as a rule.
  const all = [...Object.entries(world.furniture), ...Object.entries(world.floor)];
  for (const [key, cell] of all) {
    const at = parseTileKey(key);
    if (!at) continue;
    const inside = cellsFor(at.x, at.y, cell.id, cell.facing).some(([x, y]) =>
      interior.has(tileKey(x, y)),
    );
    if (inside) out.push(cell.id);
  }
  return out;
}

/** What the walls are mostly made of. Most common wins; ties go to whichever
 *  the shell iterates first, which is stable for an unchanged building. */
function dominantFinish(world: WorldState, shell: Set<string>): SkinId | null {
  const tally = new Map<SkinId, number>();
  for (const key of shell) {
    const cell = world.build[key];
    if (!cell) continue;
    tally.set(cell.finish, (tally.get(cell.finish) ?? 0) + 1);
  }
  let best: SkinId | null = null;
  let bestN = 0;
  for (const [id, n] of tally) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}
