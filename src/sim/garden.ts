// The garden — planting, growth, discovery, and your own fruit.
//
// DESIGN §The garden, whole. The load-bearing facts:
//
//  - A PLANTED THING IS A TILE PLUS A RECORD. The woody kinds write the same
//    TREE/SHRUB tile the generator scatters — so collision, occlusion and draw
//    order come free — and the record in `world.garden.plants` says which
//    species and when. Flowers are a record alone: no tile, no solidity, a mark
//    on the grass exactly like wild decor, except that it is yours.
//
//  - GROWTH IS A PURE FUNCTION OF (plantedAt, now). Nothing ticks, nothing is
//    stored but the timestamp, and coming back from three days away finds the
//    tree grown with no away-simulation work at all.
//
//  - YOU PLANT WHAT YOU HAVE MET. `noticeFlora` marks species seen by the
//    region the player is STANDING in (content/flora.ts §metIn) — the sim's
//    answer, never the renderer's: discovery must not depend on the camera.
//
//  - YOUR OWN TREE IS THE ONE THAT FRUITS. `pickFruit` is the delivery on the
//    promise §orbs and §berries deliberately refuse for wild trees.

import type { WorldState } from "./types";
import type { BuildResult } from "./game";
import { FLORA, TAUGHT_BY, floraDef, type FloraId } from "../content/flora";
import { itemDef } from "../content/items";
import { GRASS, DIRT, TREE, SHRUB, tileDef } from "../content/tiles";
import { tileAt, setTile, tileKey, biomeAt, refusesConstruction } from "./world";
import { structureAt } from "./structures";
import { furnitureAt } from "./furniture";
import { add } from "./inventory";
import { seasonOn } from "./seasons";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 0 sprout → 1 young → 2 grown. Two thresholds, not a curve: a garden is
 *  checked on at breakfast, and what a glance can read is "new", "coming
 *  along", and "done". Small kinds skip the middle (content/flora.ts §grows —
 *  they are full in about a day, and a one-day plant with three stages would
 *  change shape faster than anybody looks at it). */
export function growthStage(world: WorldState, x: number, y: number, now: number): 0 | 1 | 2 {
  const entry = world.garden.plants[tileKey(x, y)];
  if (!entry) return 2; // wild things were always grown
  const def = floraDef(entry.id);
  const age = (now - entry.at) / DAY_MS;
  if (age >= def.grows) return 2;
  if (def.kind === "tree" && age >= def.grows / 3) return 1;
  return 0;
}

/** The planted species at a cell, or null — the renderer's one question. */
export function plantedAt(world: WorldState, x: number, y: number): FloraId | null {
  return world.garden.plants[tileKey(x, y)]?.id ?? null;
}

/** Put a plant in the ground (DESIGN §The garden). Free — you met it, you may
 *  plant it; the space is the cost — but refused anywhere a wall would be:
 *  the dark grove's ground, water, occupied cells. Same shape of answer as
 *  `buildAt` so the HUD can speak both with one mouth. */
export function plantAt(
  world: WorldState,
  id: FloraId,
  x: number,
  y: number,
  now: number,
): BuildResult {
  const def = FLORA[id];
  if (!world.garden.seen.includes(id)) {
    // The sim's refusal, not a duplicate of the palette's — the UI never
    // offers an unmet species, and this line is what makes that cosmetic
    // rather than load-bearing (the reticle rule).
    return { changed: false, message: "You haven't met that plant yet.", broke: false };
  }
  const key = tileKey(x, y);
  if (world.garden.plants[key]) {
    return { changed: false, message: "Something's already growing there.", broke: false };
  }
  if (refusesConstruction(world, x, y, "surface")) {
    return { changed: false, message: "Not on this ground ... The dark trees were here first.", broke: false };
  }
  if (structureAt(world, x, y) || furnitureAt(world, x, y)) {
    return { changed: false, message: "There's something built there.", broke: false };
  }
  // A tree under your own feet would entomb you — the wall gate's rule
  // (game.ts §placingSomethingSolid), asked here because the flora tool
  // routes around that gate. Flowers are walkable and exempt.
  if (def.kind !== "flower" && world.player.layer === "surface") {
    const px = Math.round(world.player.x);
    const py = Math.round(world.player.y);
    if (px === x && py === y) {
      return { changed: false, message: "Not where you're standing.", broke: false };
    }
  }
  const ground = tileAt(world, x, y);
  // A flower is a mark on GRASS and nothing else — the renderer draws it in
  // the grass pass, and a flower on bare dirt would be invisible, which is a
  // refund owed. Trees and bushes take dirt happily; they bring their own
  // silhouette.
  if (def.kind === "flower" && ground !== GRASS) {
    return { changed: false, message: "Flowers want grass under them.", broke: false };
  }
  if (ground !== GRASS && ground !== DIRT) {
    // One sentence for every wrong ground — water, rock, floors, farmland.
    // Farmland is deliberate: a tilled bed is the CROPS' ground, and a tree
    // in the middle of it is what erase is for regretting.
    return { changed: false, message: "It wants open ground — grass or bare dirt.", broke: false };
  }
  if (def.kind === "tree") setTile(world, x, y, TREE);
  else if (def.kind === "bush") setTile(world, x, y, SHRUB);
  // Flowers leave the tile alone: they are a mark, not an object, and you can
  // walk through a flowerbed for the same reason you can walk through the wild
  // kind (DESIGN §Biomes: a mark is texture).
  world.garden.plants[key] = { id, at: now };
  return { changed: true, message: `${def.name} planted.`, broke: false };
}

/** Take a planted thing back out — the ERASE arm, never the shovel (DESIGN:
 *  uprooting is erase). What it costs you is the growth, which is "it costs
 *  you the arrangement" transposed into time. */
export function uprootAt(world: WorldState, x: number, y: number): BuildResult | null {
  const key = tileKey(x, y);
  const entry = world.garden.plants[key];
  if (!entry) return null;
  const def = floraDef(entry.id);
  delete world.garden.plants[key];
  const t = tileAt(world, x, y);
  if (t === TREE || t === SHRUB) setTile(world, x, y, GRASS);
  return { changed: true, message: `${def.name} taken back out. The ground closes over the roots.`, broke: false };
}

/** May this cell be picked right now? Grown, in its season, and not already
 *  picked today — a real day, because "fruits daily in season" is the largest
 *  honest yield a game with no caps can offer without becoming a job. */
export function fruitReady(world: WorldState, x: number, y: number, now: number): boolean {
  const entry = world.garden.plants[tileKey(x, y)];
  if (!entry) return false;
  const fruit = floraDef(entry.id).fruit;
  if (!fruit) return false;
  if (growthStage(world, x, y, now) < 2) return false;
  if (seasonOn(now).id !== fruit.season) return false;
  return now - (entry.picked ?? 0) >= DAY_MS;
}

/** ACT, on your own tree in its month. */
export function pickFruit(world: WorldState, x: number, y: number, now: number): BuildResult | null {
  const entry = world.garden.plants[tileKey(x, y)];
  if (!entry) return null;
  const def = floraDef(entry.id);
  if (!def.fruit) return null;
  if (!fruitReady(world, x, y, now)) {
    // A planted thing underfoot answers ACT with where it is in its life —
    // never a menu, never a bar (ROADMAP §the verb review).
    return { changed: false, message: gardenLine(world, x, y, now), broke: false };
  }
  entry.picked = now;
  add(world.inventory, def.fruit.item, 1);
  return { changed: true, message: `${itemDef(def.fruit.item).name} picked, off your own ${def.name}.`, broke: false };
}

/** The status line for standing at a planted thing — flat, present tense, in
 *  the toast register the room history already uses. */
export function gardenLine(world: WorldState, x: number, y: number, now: number): string {
  const entry = world.garden.plants[tileKey(x, y)];
  if (!entry) return "";
  const def = floraDef(entry.id);
  const stage = growthStage(world, x, y, now);
  if (stage === 0) return `The ${def.name} is new in the ground. It is taking this seriously.`;
  if (stage === 1) return `The ${def.name} is coming along. About half of one, so far.`;
  if (def.fruit && seasonOn(now).id === def.fruit.season) {
    return `The ${def.name} is picked over for today. It is making more.`;
  }
  return `The ${def.name} is grown, and getting on with it.`;
}

/** Mark what the ground under the player teaches (DESIGN: you plant what you
 *  have met). Called from the tick, about once a second — a lookup and a set
 *  test, so the cost is nothing. The check is the region you are STANDING in:
 *  being somewhere is the meeting, and the camera has no say. */
export function noticeFlora(world: WorldState): void {
  const b = biomeAt(world.seed, world.homestead.spot, Math.round(world.player.x), Math.round(world.player.y));
  const taught = TAUGHT_BY[b];
  if (!taught) return;
  for (const id of taught) {
    if (!world.garden.seen.includes(id)) world.garden.seen.push(id);
  }
}

/** Everything the palette may offer, in catalogue order — the seen set, and
 *  NEVER the complement. There is deliberately no `unseenFlora`. */
export function knownFlora(world: WorldState, kind?: "tree" | "bush" | "flower"): FloraId[] {
  return (Object.keys(FLORA) as FloraId[]).filter(
    (id) => world.garden.seen.includes(id) && (!kind || FLORA[id].kind === kind),
  );
}

// Referenced in a doc comment above; imported here so the reference is honest.
void tileDef;
