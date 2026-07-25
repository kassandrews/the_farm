// A* over the walkable grid — how a villager gets through a door instead of
// through a wall.
//
// The world is unbounded, so "search until you find it" isn't available: a
// villager asked to reach somewhere unreachable would walk the plane forever.
// The fix is the same one sim/rooms.ts uses for enclosure — a node budget, where
// EXCEEDING IT IS THE ANSWER. Beyond MAX_PATH_NODES we don't say "still
// thinking", we say "there's no way there from here", and the caller has a rule
// for that (see sim/villagers.ts: it snaps).
//
// Walkability comes from world.isWalkable, the same predicate the player's own
// collision uses. That's deliberate: if villagers had their own notion of solid
// you would eventually find a gap one of you could use and the other couldn't,
// and it would read as a bug in the wall rather than a bug in the code.

import type { WorldState } from "./types";
import { isWalkable, tileKey } from "./world";

export interface Point {
  x: number;
  y: number;
}

/** How many cells A* will expand before declaring the target unreachable.
 *
 *  Sized for town-scale trips (a villager crossing the plaza to a homestead is
 *  tens of tiles) with generous headroom for detours around a building. Small
 *  enough that the hopeless case — someone sealed inside a room, a home that got
 *  demolished — costs a few hundred microseconds and not a frame. */
export const MAX_PATH_NODES = 2000;

// Eight-way movement, orthogonals first so ties resolve to the tidier-looking
// straight step rather than a diagonal shimmy.
const STEPS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

const DIAG = Math.SQRT2;

/** Octile distance — the exact cost of an unobstructed 8-way walk, so it never
 *  overestimates and A* stays admissible. */
function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (DIAG - 2) * Math.min(dx, dy);
}

/** Can we step from (x,y) to the diagonal neighbour (x+dx, y+dy)?
 *
 *  Only if BOTH shared orthogonal neighbours are open — no cutting a corner
 *  through the diagonal seam where two walls meet. This isn't only cosmetic: it
 *  keeps movement consistent with sim/rooms.ts, whose flood-fill is four-way and
 *  therefore treats a diagonal gap as sealed. Without this check a villager could
 *  slip out through the corner of a room the game considers enclosed and is
 *  actively drawing a roof over. */
function canStep(world: WorldState, x: number, y: number, dx: number, dy: number): boolean {
  if (!isWalkable(world, x + dx, y + dy)) return false;
  if (dx !== 0 && dy !== 0) {
    if (!isWalkable(world, x + dx, y)) return false;
    if (!isWalkable(world, x, y + dy)) return false;
  }
  return true;
}

// --- Binary min-heap ----------------------------------------------------------
// A sorted array would be fine at these sizes, but the open set is re-sorted on
// every push and A* pushes a lot; the heap keeps the hopeless case (a full
// MAX_PATH_NODES sweep) comfortably inside a frame.

interface Node {
  x: number;
  y: number;
  f: number;
}

class Heap {
  private items: Node[] = [];

  get size(): number {
    return this.items.length;
  }

  push(node: Node): void {
    const a = this.items;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].f <= a[i].f) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): Node | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let small = i;
        if (l < a.length && a[l].f < a[small].f) small = l;
        if (r < a.length && a[r].f < a[small].f) small = r;
        if (small === i) break;
        [a[small], a[i]] = [a[i], a[small]];
        i = small;
      }
    }
    return top;
  }
}

/** A route from `from` to `to`, as tile centres, EXCLUDING the starting cell and
 *  including the destination. Returns null when there's no way there within the
 *  node budget — including when the destination itself is solid.
 *
 *  The start cell is allowed to be unwalkable: a villager standing where you just
 *  dropped a wall has to be able to walk out of it rather than being stuck
 *  forever in a cell the pathfinder refuses to consider. */
export function findPath(world: WorldState, from: Point, to: Point): Point[] | null {
  const sx = Math.round(from.x);
  const sy = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);

  if (sx === tx && sy === ty) return [];
  if (!isWalkable(world, tx, ty)) return null;

  const startKey = tileKey(sx, sy);
  const goalKey = tileKey(tx, ty);

  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const closed = new Set<string>();

  const open = new Heap();
  open.push({ x: sx, y: sy, f: heuristic(sx, sy, tx, ty) });

  let expanded = 0;

  while (open.size > 0) {
    const current = open.pop()!;
    const key = tileKey(current.x, current.y);
    if (closed.has(key)) continue; // a stale duplicate; the better one already ran
    closed.add(key);

    if (key === goalKey) return reconstruct(cameFrom, goalKey);

    if (++expanded > MAX_PATH_NODES) return null; // unreachable, as far as we care

    const g = gScore.get(key)!;
    for (const [dx, dy] of STEPS) {
      if (!canStep(world, current.x, current.y, dx, dy)) continue;
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nkey = tileKey(nx, ny);
      if (closed.has(nkey)) continue;
      const tentative = g + (dx !== 0 && dy !== 0 ? DIAG : 1);
      const known = gScore.get(nkey);
      if (known !== undefined && known <= tentative) continue;
      gScore.set(nkey, tentative);
      cameFrom.set(nkey, key);
      open.push({ x: nx, y: ny, f: tentative + heuristic(nx, ny, tx, ty) });
    }
  }

  return null;
}

function reconstruct(cameFrom: Map<string, string>, goalKey: string): Point[] {
  const out: Point[] = [];
  let key: string | undefined = goalKey;
  while (key !== undefined) {
    const [x, y] = key.split(",").map(Number);
    out.push({ x, y });
    key = cameFrom.get(key);
  }
  out.pop(); // drop the start cell; the walker is already standing on it
  return out.reverse();
}
