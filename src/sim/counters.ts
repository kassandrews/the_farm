// Finding the counter you are standing at.
//
// Same shape as `boardNear` in sim/errands.ts, and deliberately so: a counter is
// SOLID, exactly like the notice board and the mailbox and a door, which means
// it can never be the tile underfoot. Four-neighbour rather than a radius,
// because diagonal reach would let you buy cloth around the corner of a wall
// (`boardNear`'s own note, which applies here word for word).
//
// WHAT THIS IS NOT: a second definition of where the counters are. The anchors
// live in content/town.ts, on the furniture rows themselves, and this reads
// them. A copy of the coordinates here is the class of bug where somebody moves
// a table six inches and the bell stays where it was.

import type { WorldState, Layer } from "./types";
import type { CounterId } from "../content/counters";
import type { FurnitureId } from "../content/furniture";
import { TOWN_BUILDINGS, TOWN_FIXTURES } from "../content/town";
import { furnitureAt, furnitureFor } from "./furniture";
import { furnitureDef } from "../content/furniture";
import { tileKey } from "./world";

/** Authored anchor → which counter it is.
 *
 *  Built once from the content tables rather than stored in the save, which is
 *  what makes this feature need no migration: a counter is a fact about the
 *  town's layout, and the town's layout is content. It also means a live save
 *  gets its counters the moment it loads, with nothing to write.
 *
 *  Keyed by ANCHOR, which is the whole reason `furnitureAt` is the thing that
 *  reads it. A table is two cells wide and the stage is two by two; keying by
 *  covered cell would put a counter in the map twice and a bell on it twice
 *  (CLAUDE.md §per-cell edges — a mark drawn per cell is that bug in a hat). */
const BY_ANCHOR = new Map<string, CounterId>();
for (const b of Object.values(TOWN_BUILDINGS)) {
  for (const f of b.furniture) if (f.counter) BY_ANCHOR.set(tileKey(f.x, f.y), f.counter);
}
for (const f of TOWN_FIXTURES) if (f.counter) BY_ANCHOR.set(tileKey(f.x, f.y), f.counter);

/** Which counter is anchored exactly here, or null. No world, no furniture
 *  lookup — a pure read of the authored table.
 *
 *  This is the RENDERER's door. `drawFurniture` already knows the anchor it is
 *  drawing and has already established the piece exists, so asking `counterAt`
 *  would be a second `furnitureAt` search per counter per frame to re-learn what
 *  the caller just proved. It reads the same map, so the mark on screen and the
 *  panel the tap opens can never disagree about which tables are counters. */
export function counterIdAtAnchor(ax: number, ay: number): CounterId | null {
  return BY_ANCHOR.get(tileKey(ax, ay)) ?? null;
}

/** The counter covering this cell, or null.
 *
 *  Goes through `furnitureAt` rather than reading the map directly, and that is
 *  two guarantees rather than a formality:
 *
 *    • ANY covered cell answers. `furnitureAt` resolves a multi-cell piece to
 *      its anchor, so standing at either half of a two-wide counter finds the
 *      same one counter — not two, and not none.
 *    • A DEMOLISHED counter is not a counter. Nothing in this town is protected
 *      (content/town.ts's header says so out loud); you may take the shop apart
 *      around the Menace. If the table is gone, the map still holds its old
 *      anchor and `furnitureAt` returns null, so the answer is null. A tappable
 *      counter floating where a building used to be would be the content table
 *      overruling the world. */
export function counterAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): { x: number; y: number; id: CounterId } | null {
  const found = furnitureAt(world, x, y, layer);
  if (!found) return null;
  const id = BY_ANCHOR.get(tileKey(found.ax, found.ay));
  return id ? { x: found.ax, y: found.ay, id } : null;
}

/** Fixtures that are not counters but answer a tap the same way. One entry, and
 *  it is the errands board: it has had its own `ActionKind` since long before
 *  this file (sim/errands.ts `boardNear`), so it needs nothing here except to be
 *  reachable by the same gesture. */
const TOUCHABLE: FurnitureId[] = ["noticeboard"];

/** Half a scene tile, in the units `FurnitureDef.height` is written in.
 *
 *  Declared rather than imported: the renderer's `TILE` is private to it and sim
 *  may not reach into render at all (CLAUDE.md §Architecture). content's own
 *  tests redeclare the same 16 for the same reason, with the same note. */
const HALF_TILE = 8;

/** Is there something at this tile that a TAP should walk you over to and act
 *  on? The anchor of the piece, or null.
 *
 *  THIS IS THE HALF THAT WAS MISSING, and it is worth being precise about which
 *  half. `boardNear` and `counterNear` above serve ACT — they read where the
 *  player is standing, so they answer "what would the button do from here".
 *  Neither has ever been reachable by pointing at the thing: the pointer handler
 *  special-cases villagers and NODES, and everything else falls through to
 *  `moveTo`, which walks you at a solid object and stops. So tapping the notice
 *  board did nothing at all, while tapping a person opened a conversation, and
 *  the two most similar-looking gestures in the game did not behave alike.
 *
 *  The fix is the node branch's, which solved this exact problem for trees:
 *  walk ALONGSIDE and then perform the ordinary act, rather than deciding for
 *  itself what a tap means. `actionTarget` stays the one place that answers
 *  that, so a tap can never promise a different thing from the reticle. */
export function touchableAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): { x: number; y: number } | null {
  // THE CELL YOU TAPPED, when the piece really is in it. Not the piece's anchor:
  // a counter is two cells wide and the caller walks to whatever comes back, so
  // the anchor would march you to the far end of a counter you tapped the near
  // end of. Every cell of the piece is solid, which is the property the walk
  // depends on — see below.
  if (touchablePiece(world, x, y, layer)) return { x, y };

  // AND THE TILE ITS ART IS STANDING IN, which is not the tile it occupies.
  //
  // A piece is drawn `height` pixels ABOVE its own row — that lift is what makes
  // a table read as a table rather than as a rug — so a counter twelve pixels
  // tall has its whole top surface, and the bell sitting on it, drawn in the
  // cell to the NORTH. Tapping the thing you can see therefore missed, and the
  // only part of the counter that answered a tap was its LEGS, which are the
  // few pixels that really are in its own square. Reported exactly that way:
  // "clicking on the object doesn't bring up the menu, clicking on the table
  // legs under it does."
  //
  // So a tap one row north counts, when the piece below is tall enough to have
  // drawn itself up here. Half a tile is the threshold because it is already the
  // threshold: `hides()` fades anything overhanging by more than that, so it is
  // the line this renderer already draws between "leans into the cell above" and
  // "is in the cell above".
  //
  // ACT is deliberately NOT changed to match. `counterNear` is about which tiles
  // you can REACH from where you stand, which is a fact about the floor and has
  // nothing to do with how tall the art is. This is hit-testing, and hit-testing
  // should answer for the pixels you actually pointed at. */
  const below = touchablePiece(world, x, y + 1, layer);
  if (below && furnitureDef(furnitureFor(world, layer)[tileKey(below.x, below.y)].id).height >= HALF_TILE) {
    // THE CELL BELOW, not the one that was tapped, and this is the half that was
    // wrong first time. Returning the tapped cell walked the player ONTO it —
    // the ground under a counter's overhang is ordinary floor, so `approachTile`
    // found it already adjacent, `moveTo` stepped onto it rather than being
    // refused, and ACT fired from the tile before. Nothing opened and the player
    // ended up standing in front of the counter having done nothing.
    //
    // The piece's own cell is SOLID, which is what makes the walk work at all:
    // you are walked alongside, `moveTo` is refused and turns you to face it,
    // and ACT then finds the counter beside you. Same mechanism as the tree.
    return { x, y: y + 1 };
  }
  return null;
}

/** A touchable piece covering exactly this cell — the plain half of the lookup
 *  above, split out so the art-overhang case can reuse it without recursing. */
function touchablePiece(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer,
): { x: number; y: number } | null {
  const found = furnitureAt(world, x, y, layer);
  if (!found) return null;
  if (BY_ANCHOR.has(tileKey(found.ax, found.ay))) return { x: found.ax, y: found.ay };
  if (TOUCHABLE.includes(found.cell.id)) return { x: found.ax, y: found.ay };
  return null;
}

/** A counter on one of the four tiles around here, or null. The player's own
 *  position is not among them, for the reason at the top of the file: you can
 *  never be standing on one. */
export function counterNear(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): { x: number; y: number; id: CounterId } | null {
  for (const [nx, ny] of [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ]) {
    const found = counterAt(world, nx, ny, layer);
    if (found) return found;
  }
  return null;
}
