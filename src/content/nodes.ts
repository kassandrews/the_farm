// Resource nodes — trees and rocks. What they drop, how densely they grow, and
// how long they take to come back.
//
// Yields are deliberately GENEROUS (DESIGN §Materials: "one tree yields many
// boards. Cost is a rhythm, not an economy"). If you find yourself doing sums
// about whether you can afford a floor, these numbers are wrong.

import type { ItemId } from "./items";

const HOUR = 3_600_000;

export type NodeId = "tree" | "rock";

export interface NodeDef {
  id: NodeId;
  name: string;
  drop: ItemId;
  /** How many items one node gives. Enough that gathering is a rhythm. */
  yield: number;
  /** Real-clock time to grow back, on ground you haven't claimed. Tuned so a
   *  patch you cleared this morning has refilled by tomorrow — the woods
   *  restock while you're away, which the postcard can then mention. */
  regrowMs: number;
  /** Roughly what fraction of eligible ground carries one, at generation. */
  density: number;
}

export const NODES: Record<NodeId, NodeDef> = {
  tree: {
    id: "tree",
    name: "Tree",
    drop: "wood",
    yield: 8, // a floor's worth from one tree
    regrowMs: 8 * HOUR,
    density: 0.1,
  },
  rock: {
    id: "rock",
    name: "Rock",
    drop: "stone",
    yield: 5,
    regrowMs: 10 * HOUR,
    density: 0.035,
  },
};

export function nodeDef(id: NodeId): NodeDef {
  return NODES[id];
}
