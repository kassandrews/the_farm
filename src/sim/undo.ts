// Undoing a build stroke — one level, in memory, never in the save.
//
// Erase already refunds materials, so what a demolition actually costs is never
// wood — it's the ARRANGEMENT (ROADMAP §"Build actions are undoable"). Twenty
// minutes of walls can go to one drag, and no amount of refunded lumber puts
// them back.
//
// THE UNIT IS THE STROKE, NOT THE CELL. Build mode paints on drag; a single
// gesture can clear thirty cells, and undoing those one at a time is no undo.
// The stroke boundary already existed for another reason — ui/app.ts clears its
// `painted` set at pointerdown and pointerup so a sweep doesn't charge twice —
// so this module hangs off the same span rather than inventing a second notion
// of "one gesture".
//
// IT IS A REWIND, NOT A TRANSACTION. Undo restores the cells AND reverses the
// stroke's own material delta, clamped at zero, so it can never fail for want
// of wood. "Undo is unavailable exactly when you need it" is the worst possible
// version of this feature, and rationing materials is against the pillar anyway
// (DESIGN §Materials).
//
// The buffer lives in a WeakMap keyed by world, exactly like the build revision
// (sim/structures.ts), the rooms index (sim/rooms.ts) and villager routes
// (sim/path.ts): it is a cache of how the world used to look, and a cache has no
// business in a save. So there is NO SCHEMA CHANGE here, which is the whole
// point of "in memory, never in the save" — one level, replaced by the next
// stroke, gone on reload. Undoing something from three days ago would be worse
// than having no undo at all.

import type { WorldState, BuildCell, FurnitureCell, Layer } from "./types";
import type { TileId } from "../content/tiles";
import type { SkinId } from "../content/skins";
import type { Inventory } from "./inventory";
import type { ItemId } from "../content/items";
import { MAX_SPAN } from "../content/furniture";
import { touchBuild } from "./structures";
import { furnitureFor } from "./furniture";
import { tileKey } from "./world";

/** Everything one cell can carry across the three layers a build edit touches.
 *  `null` means "nothing here", which is a real prior state and must be
 *  restored as a deletion — not skipped. */
interface CellSnapshot {
  /** Surface only, and null for every underground stroke — there are no build
   *  cells in the rock (ui/app.ts offers no wall down there). */
  build: BuildCell | null;
  /** The ground OVERRIDE, not the resolved tile: chunk generation is a total
   *  function of x,y, so restoring "no override" restores generated ground
   *  exactly. Writing back a resolved tile would quietly promote generated
   *  ground into an authored edit. */
  ground: TileId | null;
  /** The furniture ANCHOR entry stored at this key, if any. Furniture is stored
   *  once at its anchor (sim/furniture.ts), so this is the only record. */
  furniture: FurnitureCell | null;
  /** The GARDEN entry at this key, if any (WorldState.garden.plants) — a
   *  planted stroke writes a tile override AND a record, and restoring the
   *  tile alone would leave a ghost species entry drawing a tree on open
   *  grass, or erase a plant the stroke never touched. Surface only, like
   *  `build`: nothing is planted in the rock. */
  garden: { id: import("../content/flora").FloraId; at: number; picked?: number } | null;
  /** The floor FINISH stored at this key, if any — null covers both "not a
   *  floor" and "a floor wearing the default", which the sparse map encodes
   *  identically as an absent entry (WorldState.finishes).
   *
   *  Surface only, like `build`: there are no laid floors in the rock.
   *
   *  Needed because re-finishing is a build stroke that changes NOTHING else.
   *  The ground override stays FLOOR and the build cell stays absent, so a
   *  snapshot of those two restores a cell that is still the new colour — undo
   *  would report success and visibly do nothing. */
  finish: SkinId | null;
}

interface Stroke {
  cells: Map<string, CellSnapshot>;
  /** Which layer the stroke happened on, fixed when it opened.
   *
   *  It has to be per-stroke rather than read at undo time: you can climb a
   *  ladder between hanging a lamp and pressing undo, and a restore that asked
   *  where the player is NOW would delete a surface build cell that shares the
   *  key with the tunnel cell it meant. Same class of mistake as measuring the
   *  material delta late, one axis over. */
  layer: Layer;
  /** Inventory as it stood when the stroke began, and what the stroke did to it.
   *
   *  The delta is computed at endStroke, NOT at undo time. Between the stroke
   *  and the undo the player may have felled a tree, and a delta measured then
   *  would fold that wood into the stroke's account and confiscate it. Closing
   *  the stroke is the last moment the difference is honestly the stroke's. */
  before: Inventory;
  delta: Inventory;
  /** For the undo control's label — "Undid the wall" beats "Undid". */
  label: string;
}

const strokes = new WeakMap<WorldState, Stroke>();
/** A stroke that has begun but whose first cell may not be captured yet. Kept
 *  separate from the committed buffer so an empty stroke — a tap on ground you
 *  can't build on — doesn't destroy a perfectly good undo. */
const open = new WeakMap<WorldState, Stroke>();

/** Is there something to undo? */
export function canUndo(world: WorldState): boolean {
  return strokes.has(world);
}

/** What the undo control should say it will undo, or null when there's nothing. */
export function undoLabel(world: WorldState): string | null {
  return strokes.get(world)?.label ?? null;
}

/** Begin a stroke. Call at pointerdown, beside the existing `painted.clear()`.
 *
 *  Deliberately does NOT replace the previous stroke's buffer yet: a stroke that
 *  turns out to change nothing must leave the last real one undoable. The swap
 *  happens on the first captured cell. */
export function beginStroke(world: WorldState, label: string): void {
  open.set(world, {
    cells: new Map(),
    before: { ...world.inventory },
    delta: {},
    label,
    layer: world.player.layer,
  });
}

/** Snapshot a cell about to be edited. Call BEFORE the edit.
 *
 *  Captures the target key and every key an anchor could sit on that covers it
 *  (the same bounded MAX_SPAN window furnitureAt searches) — because removing a
 *  bed by tapping its foot deletes a key up to MAX_SPAN-1 cells away, and
 *  restoring the tapped key alone would put back nothing.
 *
 *  First capture in a stroke wins. Overlapping windows from neighbouring cells
 *  in the same drag would otherwise re-snapshot a key AFTER it was edited,
 *  freezing the modified value in as the "prior" state — which is how a
 *  half-undone stroke happens. */
export function captureCell(world: WorldState, x: number, y: number): void {
  const stroke = open.get(world);
  if (!stroke) return; // not in a stroke — a caller that never called begin
  const under = stroke.layer === "under";
  const snap = (key: string): CellSnapshot => ({
    build: under ? null : (world.build[key] ?? null),
    ground: (under ? world.under[key] : world.overrides[key]) ?? null,
    furniture: furnitureFor(world, stroke.layer)[key] ?? null,
    garden: under ? null : (world.garden.plants[key] ?? null),
    finish: under ? null : (world.finishes[key] ?? null),
  });
  for (let ay = y - MAX_SPAN + 1; ay <= y; ay++) {
    for (let ax = x - MAX_SPAN + 1; ax <= x; ax++) {
      const key = tileKey(ax, ay);
      if (stroke.cells.has(key)) continue;
      stroke.cells.set(key, snap(key));
    }
  }
  // The target itself may be outside that window when MAX_SPAN is 1; cheap to
  // be certain rather than reason about it.
  const key = tileKey(x, y);
  if (!stroke.cells.has(key)) stroke.cells.set(key, snap(key));
}

/** Close the stroke and make it the one undoable thing. Call at pointerup.
 *
 *  A stroke that captured nothing is discarded rather than committed: tapping
 *  the river with a wall in hand should not consume the undo you were saving. */
export function endStroke(world: WorldState): void {
  const stroke = open.get(world);
  open.delete(world);
  if (!stroke || stroke.cells.size === 0) return;

  const ids = new Set<ItemId>([
    ...(Object.keys(stroke.before) as ItemId[]),
    ...(Object.keys(world.inventory) as ItemId[]),
  ]);
  for (const id of ids) {
    const d = (world.inventory[id] ?? 0) - (stroke.before[id] ?? 0);
    if (d !== 0) stroke.delta[id] = d;
  }

  strokes.set(world, stroke);
}

// There is deliberately no clearUndo(). "Gone on reload" needs no call: the
// buffer is keyed by the world OBJECT, and loading a save or starting a new town
// mints a fresh one, which has no buffer by construction. A function to forget
// would be a second way to express something the data model already guarantees.

/** Put the last stroke back. Returns false when there was nothing to undo.
 *
 *  Restores cells across all three layers and reverses the material delta,
 *  clamped at zero. One level: after this there is nothing to undo, because
 *  redo is a second history and this feature is deliberately not one.
 *
 *  Note what falls out for free: a demolished bed that comes back at the SAME
 *  anchor key revives the villager's claim on it, because a claim is re-checked
 *  against the world on every read (sim/housing.ts) rather than being cleaned up
 *  when the bed goes. Undo needs to know nothing about housing. */
export function undoStroke(world: WorldState): boolean {
  const stroke = strokes.get(world);
  if (!stroke) return false;
  strokes.delete(world);

  // Every write routes through the stroke's own layer. The `build` line is the
  // one that would bite: keys are bare "x,y" in both records, so restoring an
  // underground stroke against world.build would delete whatever the player has
  // standing in the field directly overhead.
  const under = stroke.layer === "under";
  const ground = under ? world.under : world.overrides;
  const furniture = furnitureFor(world, stroke.layer);
  for (const [key, snap] of stroke.cells) {
    if (!under) {
      if (snap.build) world.build[key] = snap.build;
      else delete world.build[key];

      if (snap.finish) world.finishes[key] = snap.finish;
      else delete world.finishes[key];

      if (snap.garden) world.garden.plants[key] = snap.garden;
      else delete world.garden.plants[key];
    }

    if (snap.ground !== null) ground[key] = snap.ground;
    else delete ground[key];

    if (snap.furniture) furniture[key] = snap.furniture;
    else delete furniture[key];
  }

  // Rooms, roofs and villager routes are all memoised against this counter, and
  // we wrote to world.build behind their backs. Bumping once for the whole
  // restore rather than per cell is deliberate — it's one edit as far as anyone
  // downstream is concerned, and a thirty-cell stroke shouldn't cost thirty
  // flood fills.
  touchBuild(world);

  // Reverse what the stroke did to the satchel — not restore what it held. The
  // delta was fixed at endStroke precisely so a tree felled since stays felled.
  //
  // Clamped at zero, and that clamp is the feature: undoing a demolition owes
  // wood BACK, and if the player has since spent it the undo must still happen.
  // Refusing here would make undo unavailable exactly when it's needed, which is
  // the worst possible version of it (ROADMAP).
  for (const [id, d] of Object.entries(stroke.delta) as [ItemId, number][]) {
    world.inventory[id] = Math.max(0, (world.inventory[id] ?? 0) - d);
  }

  return true;
}
