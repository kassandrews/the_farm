// Mining — taking ore out of the rock, and the one thing that is down there
// besides ore.
//
// The verb itself is ordinary gathering: a vein is a node like a tree (see
// content/nodes.ts), so nothing here reimplements felling. What this module
// owns is the part that is only true underground — that HOW FAR you had to
// tunnel is itself a reward, and slate is what it pays.
//
// It is one function rather than "gather, then check the depth" at the call
// site, for the reason sim/junk.ts learned the hard way: when a payout depends
// on the state of a tile, the payout and the thing that changes that tile want
// to be one operation. Here the hazard is milder (depth is a function of your
// shafts, not of the vein, so mining doesn't move it) — but the shape is the
// same and it costs nothing to get right the first time.

import type { WorldState } from "./types";
import { depthAt } from "./world";
import { gather, nodeAt, type GatherResult } from "./gather";

/** How far from your nearest shaft a vein has to be before the rock starts
 *  being a different kind of rock. Twelve is about a screen of tunnel past a
 *  landing — far enough that you got there on purpose, near enough that you
 *  don't have to plan an expedition.
 *
 *  Depth is horizontal (world.ts §depthAt) and shrinks when you sink a new
 *  shaft nearby, so this can't be reached by walking somewhere remote on the
 *  surface and digging straight down. You tunnel, or you don't. */
export const SLATE_DEPTH = 12;

export interface MineResult extends GatherResult {
  /** How far out this vein was, for the toast. */
  depth: number;
  /** True on the one dig that turned up slate. */
  foundSlate: boolean;
}

/** Mine the vein at this underground cell. Returns null when there isn't one.
 *
 *  Slate is unlocked here rather than at a counter deliberately: it is the only
 *  finish in the game with no giver. The Menace has standards, the Gremlin has
 *  a facility, the Ghost has her dark wood — slate is just what the deep rock
 *  is, and finding it should feel like the map paying out rather than like
 *  somebody handing you a reward. Its hint has said so since the table was
 *  written: "Found further down than most people dig." */
export function mineVein(world: WorldState, x: number, y: number, now: number): MineResult | null {
  // Asked BEFORE gathering, not filtered after. Felling first and rejecting the
  // result would mean a non-vein node down there got quietly destroyed by a
  // function that then reported doing nothing.
  if (nodeAt(world, x, y, "under") !== "vein") return null;
  const depth = depthAt(world, x, y);
  const got = gather(world, x, y, now, "under")!;

  // Permanent and once. `unlocked` is the whole record — there is no "deepest
  // reached" counter anywhere, because that would be a score of exactly the
  // kind the museum went to such lengths not to be.
  const foundSlate = depth >= SLATE_DEPTH && !world.skins.unlocked.includes("slate");
  if (foundSlate) world.skins.unlocked.push("slate");

  return { ...got, depth, foundSlate };
}
