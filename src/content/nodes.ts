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
import { TREE, ROCK, ORE_VEIN, DIRT, CAVE_FLOOR, DARK_TREE, SHRUB, GRASS, STUMP, LOG } from "./tiles";

const HOUR = 3_600_000;

export type NodeId = "tree" | "rock" | "vein" | "darktree" | "shrub" | "stump" | "log";

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
  // A tree's little sibling, and the first node whose density is ZERO almost
  // everywhere. Its `density` is a base that every region multiplies by
  // `BiomeDef.shrubs`, which defaults to nothing — so a shrub exists only where a
  // biome row asks for one, and adding it to a region is a number rather than a
  // change here.
  //
  // TWO WOOD, against a tree's eight. Enough that clearing one on your way past
  // is not an insult, far too little to be a reason to walk anywhere — which is
  // the whole balance question this raises, since shrubs start in the far country
  // and the far country must never pay better than home (DESIGN §Biomes, and the
  // glimmer's own mushroom note). Four shrubs to a tree, and you have to fell
  // four things instead of one.
  //
  // It comes back FAST — a shrub is a season's growth, not a decade's — which
  // also keeps a wood you walked through from staying visibly mown.
  shrub: {
    id: "shrub",
    name: "Shrub",
    tile: SHRUB,
    felled: GRASS,
    layer: "surface",
    drop: "wood",
    line: "Cut back.",
    yield: 2,
    regrowMs: 3 * HOUR,
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
    // Twelve, against a tree's eight, and the larger number is not generosity —
    // it is the correction for how much rarer a rock is. Rocks are scattered at
    // a third of the density of trees (they are scenery as well as a resource,
    // and a field of them would read as noise), so at the old yield of five,
    // stone cost roughly five times the walking that wood did. That was
    // survivable while stone built nothing; once a floor or a wall can be
    // flagstones it would have decided the question for the player — every town
    // wood, because wood was near. Twelve brings the two to about two-to-one,
    // which leaves stone the more deliberate material without making it a chore
    // (DESIGN §Materials: deliberately not tuned to parity).
    yield: 12,
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
  // The fourth row, and the file's own claim made good: it differs from a tree
  // in ONE number (its tile) and no logic. Same drop, same yield, same
  // regrowth — because it is not a better tree, it is a tree that happens to be
  // standing where the dark wood is.
  //
  // `density: 0` and that is not a stub. Every other node is scattered by a
  // hash against this number; the grove is a PLACE (sim/world.ts §the grove),
  // so it places its own trees and nothing rolls for one anywhere else. A dark
  // tree outside the grove would make the grove ordinary.
  darktree: {
    id: "darktree",
    name: "Dark tree",
    tile: DARK_TREE,
    felled: DIRT,
    layer: "surface",
    drop: "wood",
    // No mention of walnut, of a finish, or of having found anything. The
    // unlock speaks for itself in the picker, and a line here that announced it
    // would be the toast a secret is not allowed to have.
    line: "Timber. Darker at the heart.",
    yield: 8,
    regrowMs: 8 * HOUR,
    density: 0,
  },
  // DEADWOOD, and it shipped one day NOT being a node, which was the mistake.
  //
  // The argument for leaving it alone was DESIGN.md's DECOR list, which names
  // fallen logs outright and sets the test "can you carry it home?". The trouble
  // is that the test describes the DECISION rather than a reason for it, and the
  // shape it actually took on screen was: a solid, tile-sized, obviously-wooden
  // object standing next to a shrub that gives you two wood for the same swing.
  // Nobody was ever going to read that as a rule.
  //
  // So the line moved to where it can be stated without circling: **a TILE is an
  // object and yields its material; a MARK is texture and yields nothing.** That
  // is why flowers and tussocks stay unpickable — there is no object there, only
  // paint on the grass — and why these two now behave like every other piece of
  // wood in the world. See DESIGN.md §Biomes, which was amended to match.
  //
  // `density: 0` for the same reason the dark tree's is, and it is not a stub:
  // deadwood is placed by one roll in sim/world.ts that then picks which of the
  // two it is, exactly as a rock picks a silhouette. Nothing rolls against these.
  //
  // THE NUMBERS ARE THE SHRUB'S ARGUMENT AGAIN. Under a tree's eight, both of
  // them, so felling a tree is never the worse move — and at about one cell in a
  // thousand this is a fifth as common as a shrub, which puts it well under the
  // bar `shrubs` already cleared. It is something you come across, never a reason
  // to walk anywhere.
  //
  // The SLOWEST regrowth in the table, and that is the point: a shrub is a
  // season's growth and a fallen tree is a decade's. It comes back because the
  // world heals where you are not invested (ROADMAP §regrow-unless-claimed), and
  // it comes back slowly because a wood that restocked its deadwood overnight
  // would read as a supply rather than as age.
  //
  // Felled to GRASS, not DIRT, on the shrub's reasoning: a stump that scarred the
  // ground behind it would pock a wood with dirt patches for three wood apiece.
  stump: {
    id: "stump",
    name: "Stump",
    tile: STUMP,
    felled: GRASS,
    layer: "surface",
    drop: "wood",
    line: "Levered it out.",
    yield: 3,
    regrowMs: 24 * HOUR,
    density: 0,
  },
  log: {
    id: "log",
    name: "Fallen log",
    tile: LOG,
    felled: GRASS,
    layer: "surface",
    drop: "wood",
    line: "Broken up.",
    yield: 5, // more than a stump, still under a standing tree's eight
    regrowMs: 24 * HOUR,
    density: 0,
  },
};

export function nodeDef(id: NodeId): NodeDef {
  return NODES[id];
}

/** Which node, if any, this tile IS — on the layer it would have to be on.
 *  Table-driven so adding a node row is the whole change; the alternative was a
 *  chain of `if (t === TREE)` that a fourth row would have to remember to join.
 *
 *  The parameter takes "sky" and no ROW ever will (Phase 7c). Nothing grows up
 *  there and nothing may be gathered there — the reward for the hard-to-reach
 *  place is a place, not loot (DESIGN §The sky) — so the widening is here, where
 *  it costs a word, rather than on `NodeDef.layer`, where it would be an
 *  invitation. Every sky tile falls through this loop and answers null. */
export function nodeForTile(tile: TileId, layer: "surface" | "under" | "sky"): NodeId | null {
  for (const def of Object.values(NODES)) {
    if (def.layer === layer && def.tile === tile) return def.id;
  }
  return null;
}
