// Enclosed rooms — the flood-fill that turns a pile of walls into "a house".
//
// This is deliberately one mechanism doing three jobs (DESIGN §Structures):
//
//   1. It decides where ROOFS go. Roofs are derived from enclosure and never
//      placed, so there is no roof item and no roof cost — you close the last
//      gap and the roof arrives. That's the beat.
//   2. It decides what the roof CUTAWAY reveals: walk inside and the roof over
//      that room fades, in place, with no scene transition.
//   3. It will decide whether a commission is satisfied ("is this a house, and
//      how big is it") without needing a second notion of enclosure.
//
// The fill runs over open cells and is bounded: on unbounded terrain it would
// otherwise walk to the horizon. Exceeding the budget IS the "this isn't
// enclosed" answer, which is why the budget doubles as the biggest room the
// game will recognise.

import type { WorldState } from "./types";
import { tileKey } from "./world";
import { structureAt, buildRevision } from "./structures";
import { structureDef } from "../content/structures";

/** The largest room the game will recognise — and, equivalently, how far the
 *  fill chases open ground before calling it "outside". Generous enough for a
 *  grand hall, small enough that the miss case is cheap. */
export const MAX_ROOM = 400;

export interface Room {
  /** Stable across recomputes: the lexicographically smallest interior key, so
   *  the renderer can hold per-room fade state without an identity crisis every
   *  time a wall moves. */
  id: string;
  /** Open cells inside the walls. */
  interior: Set<string>;
  /** The enclosing pieces themselves. Roofed along with the interior — a roof
   *  that stops short of its own walls reads as a lid, not a building. */
  shell: Set<string>;
}

/** Does a piece standing here seal a room? A door does, even though you can
 *  walk through it — otherwise every house would leak at its own front door and
 *  never get a roof. */
function seals(world: WorldState, x: number, y: number): boolean {
  const cell = structureAt(world, x, y);
  return cell !== null && structureDef(cell.id).encloses;
}

/** Flood from an open cell. Returns the enclosed interior, or null when the
 *  fill escapes (more than MAX_ROOM cells reachable without hitting walls).
 *
 *  `seen` is threaded through so a caller testing many seeds doesn't re-walk
 *  the same outdoors once per wall — without it, a long fence costs one
 *  full-budget fill per segment. */
export function findRoom(
  world: WorldState,
  x: number,
  y: number,
  seen?: Set<string>,
): Room | null {
  const start = tileKey(x, y);
  if (seals(world, x, y)) return null;

  const interior = new Set<string>();
  const shell = new Set<string>();
  const queue: [number, number][] = [[x, y]];
  interior.add(start);

  while (queue.length > 0) {
    if (interior.size > MAX_ROOM) {
      // Escaped: this is outdoors. Remember every cell we touched so sibling
      // seeds don't repeat the walk.
      if (seen) for (const k of interior) seen.add(k);
      return null;
    }
    const [cx, cy] = queue.pop()!;
    for (const [nx, ny] of [
      [cx, cy - 1],
      [cx + 1, cy],
      [cx, cy + 1],
      [cx - 1, cy],
    ] as [number, number][]) {
      if (seals(world, nx, ny)) continue;
      const key = tileKey(nx, ny);
      if (interior.has(key)) continue;
      interior.add(key);
      queue.push([nx, ny]);
    }
  }

  // The shell is gathered afterwards over all EIGHT neighbours. A corner wall
  // only touches the interior diagonally, so collecting it during the
  // four-way fill leaves the roof with a hole at every corner.
  for (const k of interior) {
    const [ix, iy] = k.split(",").map(Number);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (seals(world, ix + dx, iy + dy)) shell.add(tileKey(ix + dx, iy + dy));
      }
    }
  }

  let id = start;
  for (const k of interior) if (k < id) id = k;
  return { id, interior, shell };
}

/** Every enclosed room in the town.
 *
 *  Seeded from the player's own structures rather than by scanning the map —
 *  the world is unbounded, so "look everywhere" isn't available. A room must
 *  touch a wall to be a room, so the open neighbours of built cells are a
 *  complete set of candidate seeds. */
export function roomsOf(world: WorldState): Room[] {
  const rooms: Room[] = [];
  const claimed = new Set<string>(); // cells already inside a found room
  const outside = new Set<string>(); // cells proven to be outdoors

  for (const key of Object.keys(world.build)) {
    const [bx, by] = key.split(",").map(Number);
    for (const [nx, ny] of [
      [bx, by - 1],
      [bx + 1, by],
      [bx, by + 1],
      [bx - 1, by],
    ] as [number, number][]) {
      const nkey = tileKey(nx, ny);
      if (claimed.has(nkey) || outside.has(nkey)) continue;
      if (seals(world, nx, ny)) continue;
      const room = findRoom(world, nx, ny, outside);
      if (!room) {
        outside.add(nkey);
        continue;
      }
      for (const k of room.interior) claimed.add(k);
      rooms.push(room);
    }
  }
  return rooms;
}

// --- Cache --------------------------------------------------------------------
// Rooms are pure derived state, recomputed only when the structure layer
// actually changes. Keyed off the world in a WeakMap so a discarded world drops
// its index for free, exactly like the chunk cache.

const cache = new WeakMap<WorldState, { rev: number; rooms: Room[] }>();

/** Rooms, memoised against the build layer's revision. Safe to call per frame. */
export function rooms(world: WorldState): Room[] {
  const rev = buildRevision(world);
  const hit = cache.get(world);
  if (hit && hit.rev === rev) return hit.rooms;
  const fresh = roomsOf(world);
  cache.set(world, { rev, rooms: fresh });
  return fresh;
}

/** The room containing this cell — interior only, so standing in a doorway
 *  counts as being in the wall, not in the room. */
export function roomAt(world: WorldState, x: number, y: number): Room | null {
  const key = tileKey(x, y);
  for (const r of rooms(world)) if (r.interior.has(key)) return r;
  return null;
}

/** Which room, if any, roofs this cell. Interior AND shell are roofed: a roof
 *  that stops at the inside face of its own walls reads as a lid. */
export function roofRoomAt(world: WorldState, x: number, y: number): Room | null {
  const key = tileKey(x, y);
  for (const r of rooms(world)) if (r.interior.has(key) || r.shell.has(key)) return r;
  return null;
}

/** Can somebody standing at A see somebody standing at B — or rather, is there
 *  a roof between them?
 *
 *  Compares which room ROOFS each cell, so two people in the same building can
 *  talk, two people outdoors can talk, and one of each cannot. Doorways count as
 *  the room's own (`roofRoomAt` includes the shell), which is the right way
 *  round: somebody framed in a doorway is somebody in the building.
 *
 *  Written because you could talk to the Office Creature from the plaza, through
 *  the wall, with the town hall's roof still drawn over him — you could not see
 *  him and he answered anyway. Proximity was the only test: `villagerNear`
 *  within 2.6 tiles, and 2.6 tiles goes straight through masonry.
 *
 *  By ROOM ID rather than by object identity. `rooms()` caches per world
 *  revision and hands back the same objects within a frame, so identity would
 *  work today and stop working the first time a wall moved between two calls —
 *  a comparison that is right by luck. The id is documented as stable across
 *  recomputes precisely so it can be compared. */
export function sameRoof(
  world: WorldState,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return (roofRoomAt(world, ax, ay)?.id ?? null) === (roofRoomAt(world, bx, by)?.id ?? null);
}
