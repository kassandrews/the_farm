// Resource nodes — trees, rocks, and ore veins. What they stand on, what they
// drop, how densely they grow, and how long they take to come back.
//
// Yields are deliberately GENEROUS (DESIGN §Materials: "one tree yields many
// boards. Cost is a rhythm, not an economy"). If you find yourself doing sums
// about whether you can afford a floor, these numbers are wrong.
//
// Every node is a TILE that gathering replaces with another tile, and both of
// those live here rather than in sim/gather.ts. That is what let the vein join
// this table instead of forking a second gathering path: a vein differs from a
// tree in four numbers and no logic.

import type { ItemId } from "./items";
import type { TileId } from "./tiles";
import { TREE, ROCK, ORE_VEIN, DIRT, CAVE_FLOOR } from "./tiles";

const HOUR = 3_600_000;

export type NodeId = "tree" | "rock" | "vein";

export interface NodeDef {
  id: NodeId;
  name: string;
  /** The tile that IS this node standing there. */
  tile: TileId;
  /** What it leaves behind once gathered — bare ground, workable and claimable. */
  felled: TileId;
  /** Which layer it grows on. Spelled out rather than importing sim's `Layer`:
   *  content must not depend on sim (CLAUDE.md — imports point inward), and the
   *  two unions are the same two words. */
  layer: "surface" | "under";
  drop: ItemId;
  /** The toast when you fell one, before the count. A table row rather than a
   *  ternary at the call site, which is how a third node would have been the
   *  first thing to go unwritten. */
  line: string;
  /** How many items one node gives. Enough that gathering is a rhythm. */
  yield: number;
  /** Real-clock time to grow back, on ground you haven't claimed. Tuned so a
   *  patch you cleared this morning has refilled by tomorrow — the woods
   *  restock while you're away, which the postcard can then mention.
   *
   *  `null` means never, which is not an exception to the claim rule but the
   *  same rule underground: see the vein below. */
  regrowMs: number | null;
  /** Roughly what fraction of eligible ground carries one, at generation. */
  density: number;
}

export const NODES: Record<NodeId, NodeDef> = {
  tree: {
    id: "tree",
    name: "Tree",
    tile: TREE,
    felled: DIRT,
    layer: "surface",
    drop: "wood",
    line: "Timber.",
    yield: 8, // a floor's worth from one tree
    regrowMs: 8 * HOUR,
    density: 0.1,
  },
  rock: {
    id: "rock",
    name: "Rock",
    tile: ROCK,
    felled: DIRT,
    layer: "surface",
    drop: "stone",
    line: "Split it.",
    yield: 5,
    regrowMs: 10 * HOUR,
    density: 0.035,
  },
  // The third gathered class, and the only one you have to go somewhere for.
  //
  // It yields LESS than a rock and that is not a tax on the trek — it is the
  // trek being the cost. A vein is met at a tunnel face you spent taps reaching,
  // so the walk already did the work that a number would otherwise have to, and
  // paying twice would make the underground a grind.
  //
  // It NEVER regrows, which is the claim rule rather than a hole in it (DESIGN
  // §Materials). Underground there is no unclaimed ground: every open cell is
  // one you cut, so a vein coming back would re-block a corridor you had already
  // dug. What replaces regrowth down there is distance — the rock is unbounded,
  // so ore is never scarce, only further off.
  vein: {
    id: "vein",
    name: "Ore vein",
    tile: ORE_VEIN,
    felled: CAVE_FLOOR,
    layer: "under",
    drop: "ore",
    line: "The seam gives up its metal.",
    yield: 4,
    regrowMs: null,
    // Read against a hash like the trees, in generatedUnderTile. Lives here so
    // all three densities sit in one table and none of them is a lone constant
    // in the generator.
    density: 0.055,
  },
};

export function nodeDef(id: NodeId): NodeDef {
  return NODES[id];
}

/** Which node, if any, this tile IS — on the layer it would have to be on.
 *  Table-driven so adding a node row is the whole change; the alternative was a
 *  chain of `if (t === TREE)` that a fourth row would have to remember to join. */
export function nodeForTile(tile: TileId, layer: "surface" | "under"): NodeId | null {
  for (const def of Object.values(NODES)) {
    if (def.layer === layer && def.tile === tile) return def.id;
  }
  return null;
}
