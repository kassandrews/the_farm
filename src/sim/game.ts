// The sim's front door. Everything the render + ui layers need to drive the
// world goes through here: create a world, tick it on a fixed timestep, apply
// the context action, talk to a villager, and summarise what happened while the
// player was away. No DOM, no canvas — still pure logic (CLAUDE.md).

import type { WorldState, Player, Tool, BuildTool, HomesteadSpot } from "./types";
import type { AdultForm } from "../content/canon/forms";
import { CAST } from "../content/cast";
import type { CharId } from "../content/cast";
import { makeVillager, tickVillager, befriend } from "./villagers";
import { arrivalDue, admitArrival } from "./commission";
import { remember } from "./memory";
import type { MemoryKind } from "./memory";
import {
  dig,
  canDig,
  placePlank,
  isWalkable,
  tileAt,
  setTile,
  homesteadOrigin,
  generatedTile,
} from "./world";
import { placeStructure, removeStructure } from "./structures";
import { rooms } from "./rooms";
import { stampTown } from "./town";
import { settleResidents } from "./housing";
import { placeFurniture, removeFurnitureAt } from "./furniture";
import { FURNITURE, furnitureDef } from "../content/furniture";
import type { FurnitureId, Facing } from "../content/furniture";
import { structureDef } from "../content/structures";
import { GRASS, DIRT, PLANK, FARMLAND, FARMLAND_WET, MUSHROOM } from "../content/tiles";
import { emptyInventory, add, canAfford, spend, refund, shortfall } from "./inventory";
import type { Cost } from "./inventory";
import { itemLabel } from "../content/items";
import type { ItemId } from "../content/items";
import { gather, nodeNear, updateRegrowth } from "./gather";
import { starterSkins, defaultSkin } from "../content/skins";
import { canPlant, plant, water, canWater, harvest, isRipe, updateAllCrops, updateCrop } from "./crops";
import { cropDef, ripeStage } from "../content/crops";
import type { MeadowImport } from "./meadow_import";
import { simulateAway, AWAY_MIN_MS } from "./away";
import { speak } from "./dialogue";
import type { Speech } from "./dialogue";
import type { Rng } from "./rng";
import { SCHEMA_VERSION } from "./save";

const PLAYER_SPEED = 3.4; // tiles / second — a brisk amble

export interface NewWorldOpts {
  name: string;
  form: AdultForm;
  spot: HomesteadSpot;
  seed?: number;
  /** A sprite imported from The Meadow, if the player pasted a save. */
  meadowImport?: MeadowImport | null;
  /** What the import becomes (DESIGN §"Player identity" offers both):
   *  "villager" — it moves in as your neighbour (the default);
   *  "player"   — you embody it, and its name/form/history become yours. */
  importRole?: "villager" | "player";
}

export function newWorld(opts: NewWorldOpts): WorldState {
  const now = Date.now();
  const seed = opts.seed ?? ((Math.random() * 0xffffffff) >>> 0);
  const origin = homesteadOrigin(opts.spot);

  // Embodying an import takes its identity and history wholesale; otherwise the
  // player is a fresh sprite and the import (if any) moves in next door.
  const embodying = opts.meadowImport && opts.importRole === "player" ? opts.meadowImport : null;

  const player: Player = {
    name: embodying ? embodying.name : opts.name.trim() || "New Sprite",
    form: embodying ? embodying.form : opts.form,
    x: origin.x,
    y: origin.y + 1, // stood just below the tent
    target: null,
    facing: -1,
    memory: embodying ? [...embodying.memorySeed] : [],
    imported: embodying !== null,
  };

  // Fixed cast + the one starter resident. An import you did NOT embody moves
  // in as that resident, keeping its Meadow name and raising history.
  const villagers = [makeVillager(CAST.office, now)];
  const asNeighbour = embodying ? null : opts.meadowImport;
  if (asNeighbour) {
    const def = { ...CAST.resident1, form: asNeighbour.form, name: asNeighbour.name };
    villagers.push(makeVillager(def, now, asNeighbour.memorySeed));
  } else {
    villagers.push(makeVillager(CAST.resident1, now));
  }

  const world: WorldState = {
    schemaVersion: SCHEMA_VERSION,
    seed,
    createdAt: now,
    lastSaved: now,
    player,
    homestead: { spot: opts.spot, originX: origin.x, originY: origin.y },
    overrides: {},
    build: {},
    furniture: {},
    crops: {},
    villagers,
    commissions: [],
    // A few boards' worth of wood so the very first thing you try to build
    // works — you learn the cost by spending it, not by being refused.
    inventory: { ...emptyInventory(), wood: 8 },
    regrow: {},
    skins: {
      unlocked: starterSkins(),
      selected: { wood: defaultSkin("wood"), stone: defaultSkin("stone") },
    },
    flags: { landClaimed: false, onboarded: false },
  };

  // The town pre-exists (DESIGN §"Town and homestead"). Stamped rather than
  // generated so its buildings are ordinary build cells you can take apart —
  // see sim/town.ts. The probe lets it clear a doorstep that generation
  // happened to drop a tree on.
  stampTown(world, (x, y) => generatedTile(seed, opts.spot, x, y));

  // Only now do the beds exist, so only now can anyone claim one. This also
  // re-seats everybody at their resolved stop for the current hour — without
  // it a town created at 2am would open with its residents standing in the
  // plaza, because they were built before they had anywhere to sleep.
  settleResidents(world, now);

  return world;
}

/** The tile the player is standing on (rounded to the grid). */
export function playerTile(world: WorldState): { x: number; y: number } {
  return { x: Math.round(world.player.x), y: Math.round(world.player.y) };
}

/** Set a walk target from a tapped world-tile coordinate. Ignores taps onto
 *  solid tiles (walk to the edge instead is future polish; for now, refuse). */
export function moveTo(world: WorldState, x: number, y: number): void {
  if (!isWalkable(world, Math.round(x), Math.round(y))) return;
  world.player.target = { x, y };
}

/** Fixed-timestep advance. `dt` seconds drives smooth movement; `now` (epoch
 *  ms) drives the wall-clock world (crops). */
export function tick(world: WorldState, dt: number, now: number): void {
  // Player amble toward tap target.
  const p = world.player;
  if (p.target) {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.02) {
      p.x = p.target.x;
      p.y = p.target.y;
      p.target = null;
    } else {
      const step = Math.min(dist, PLAYER_SPEED * dt);
      // Collide per axis rather than as a point, so a wall STOPS you and a
      // glancing approach slides along it instead of sticking. Until structures
      // existed only the destination tile was ever checked, which meant tapping
      // past a wall walked you straight through it — the walls were scenery.
      const nx = p.x + (dx / dist) * step;
      const ny = p.y + (dy / dist) * step;
      const movedX = isWalkable(world, Math.round(nx), Math.round(p.y));
      if (movedX) p.x = nx;
      const movedY = isWalkable(world, Math.round(p.x), Math.round(ny));
      if (movedY) p.y = ny;
      if (Math.abs(dx) > 0.01) p.facing = dx >= 0 ? 1 : -1;
      // Pressed flat against something with nowhere to go: drop the target so
      // we don't grind against it forever.
      if (!movedX && !movedY) p.target = null;
    }
  }

  // Someone may be due to move to town. Checked here rather than on load so it
  // also fires during a long session, and it's safe to ask every tick because
  // due-ness is derived from the clock — a player who leaves for two days comes
  // back to one new neighbour, not to forty-eight.
  if (arrivalDue(world, now)) admitArrival(world, now);

  for (const v of world.villagers) tickVillager(world, v, dt, now);
  updateAllCrops(world, now);
  updateRegrowth(world, now); // the woods come back on the real clock
}

/** What building costs. Deliberately tiny — a rhythm, not an economy
 *  (DESIGN §Materials). Digging and gathering appear nowhere here because
 *  terraforming is always free. Structures carry their own cost in the content
 *  table, so this is only the floor. */
export const BUILD_COSTS: Record<"plank", Cost> = {
  plank: { wood: 1 }, // one tree (8 wood) lays eight boards
};

/** What a build tool costs to apply. */
export function buildCost(tool: BuildTool): Cost {
  if (tool === "plank") return BUILD_COSTS.plank;
  if (tool === "erase") return {};
  if (isFurnitureTool(tool)) return furnitureDef(tool).cost;
  return structureDef(tool).cost;
}

export type ActionKind = "dig" | "gather" | "plank" | "plant" | "water" | "harvest" | "none";
export interface ActionResult {
  kind: ActionKind;
  changed: boolean;
  message: string;
}

/** What ACT is aimed at right now.
 *
 *  "harvest" — a ripe crop underfoot; "gather" — a node in reach; "tool" — the
 *  held tool has something to do on that tile; "none" — nothing will happen. */
export interface ActionTarget {
  x: number;
  y: number;
  kind: "harvest" | "gather" | "tool" | "none";
}

/** Where ACT will land, decided in ONE place so the reticle the player sees and
 *  the tile the button touches can never disagree. The renderer draws this and
 *  `contextAction` executes it; anything that changes the precedence below
 *  changes both at once, which is the point.
 *
 *  Precedence, and why:
 *   1. A ripe crop underfoot — the ripe carrot is always one tap away, whatever
 *      tool is held.
 *   2. The gather tool always means the node in reach, since nodes are SOLID and
 *      you can never stand on one (see nodeNear): "the tile underfoot" can never
 *      reach a tree.
 *   3. The held tool on the tile underfoot, when it would actually do something.
 *      Deliberately ahead of the node: a tree beside you must never hijack a
 *      deliberate act, or you couldn't till the ground at the forest edge.
 *   4. Otherwise a node in reach — the phone-friendly shortcut, which only ever
 *      fires when the held tool had nothing to do anyway. */
export function actionTarget(world: WorldState, tool: Tool): ActionTarget {
  const { x, y } = playerTile(world);
  if (isRipe(world, x, y)) return { x, y, kind: "harvest" };

  const near = nodeNear(world, x, y, world.player.facing);
  if (near && tool === "gather") return { x: near.x, y: near.y, kind: "gather" };
  if (toolApplies(world, tool, x, y)) return { x, y, kind: "tool" };
  if (near) return { x: near.x, y: near.y, kind: "gather" };
  return { x, y, kind: "none" };
}

/** The context action button: does whatever `actionTarget` is pointing at. */
export function contextAction(world: WorldState, tool: Tool, now: number): ActionResult {
  const target = actionTarget(world, tool);

  if (target.kind === "harvest") {
    const yielded = harvest(world, target.x, target.y, now)!;
    add(world.inventory, "carrot", 1); // it goes in the satchel, not into thin air
    witness(world, "harvested_carrot", `a ${yielded}`, now);
    return { kind: "harvest", changed: true, message: `You pulled a ${yielded}. It's a good one.` };
  }

  if (target.kind === "gather") {
    const got = gather(world, target.x, target.y, now)!;
    witness(world, "gathered", undefined, now);
    return {
      kind: "gather",
      changed: true,
      message: `${got.node === "tree" ? "Timber." : "Split it."} ${itemLabel(got.item, got.amount)}.`,
    };
  }

  // "tool" or "none": the held tool on the tile underfoot. When nothing applies
  // this is what produces the refusal message.
  return applyTool(world, tool, target.x, target.y, now);
}

/** Would the held tool change this tile? The dry-run half of `applyTool` — kept
 *  beside it so the two can't drift. */
function toolApplies(world: WorldState, tool: Tool, x: number, y: number): boolean {
  switch (tool) {
    case "dig":
      return canDig(world, x, y);
    case "gather":
      return tileAt(world, x, y) === MUSHROOM; // the one gatherable that isn't a node
    case "plant":
      return canPlant(world, x, y);
    case "water":
      return canWater(world, x, y);
  }
}

/** Apply the held tool to the tile underfoot. */
function applyTool(world: WorldState, tool: Tool, x: number, y: number, now: number): ActionResult {
  switch (tool) {
    case "dig":
      if (dig(world, x, y)) {
        witness(world, "dug", undefined, now);
        return { kind: "dig", changed: true, message: "You turn the earth." };
      }
      return { kind: "dig", changed: false, message: "Nothing to dig here." };
    case "gather":
      // Mushrooms are the one gatherable that isn't a node — pick them up.
      if (tileAt(world, x, y) === MUSHROOM) {
        setTile(world, x, y, GRASS);
        add(world.inventory, "mushroom", 1);
        return { kind: "gather", changed: true, message: "Picked. It comes away cleanly." };
      }
      return { kind: "gather", changed: false, message: "Nothing to gather here." };
    case "plant":
      if (canPlant(world, x, y)) {
        plant(world, x, y, "carrot", now);
        witness(world, "planted_carrot", undefined, now);
        return { kind: "plant", changed: true, message: "Carrot seed, planted. Now it needs water." };
      }
      return { kind: "plant", changed: false, message: "Can't plant here." };
    case "water":
      if (water(world, x, y, now)) {
        return { kind: "water", changed: true, message: "Watered. Growth resumes." };
      }
      return { kind: "water", changed: false, message: "Nothing planted to water." };
  }
}

// --- Build mode ---------------------------------------------------------------
// Placement targets a TAPPED tile rather than the one underfoot, because a wall
// is solid: build-where-you-stand would wall you into stone and you could never
// close a room (DESIGN §Structures). That's the whole reason build mode exists
// as a separate mode rather than another entry on the action button.

export interface BuildResult {
  changed: boolean;
  message: string;
  /** True when the attempt failed for want of materials, so the UI can say what
   *  is missing rather than just refusing. */
  broke: boolean;
}

/** Apply a build tool to a tile. Spends materials on placement and refunds them
 *  on erase, so a wall you put up and take down again costs nothing net. */
export function isFurnitureTool(tool: BuildTool): tool is FurnitureId {
  return tool in FURNITURE;
}

export function buildAt(
  world: WorldState,
  tool: BuildTool,
  x: number,
  y: number,
  now: number,
  /** Which way a multi-tile piece is turned. Ignored by walls and floors —
   *  orientation is a furniture idea (DESIGN §Structures). */
  facing: Facing = "s",
): BuildResult {
  if (tool === "erase") {
    // Furniture comes up FIRST. It sits inside rooms, so if erase preferred the
    // structure layer you'd take the wall out from behind a shelf you were
    // aiming at.
    const piece = removeFurnitureAt(world, x, y);
    if (piece) {
      refund(world.inventory, furnitureDef(piece.id).cost);
      return { changed: true, message: `${furnitureDef(piece.id).name} taken back.`, broke: false };
    }
    const taken = removeStructure(world, x, y);
    if (taken) {
      refund(world.inventory, structureDef(taken.id).cost);
      return { changed: true, message: `${structureDef(taken.id).name} taken back down.`, broke: false };
    }
    if (tileAt(world, x, y) === PLANK) {
      setTile(world, x, y, DIRT);
      refund(world.inventory, BUILD_COSTS.plank);
      return { changed: true, message: "Board lifted.", broke: false };
    }
    return { changed: false, message: "Nothing built here.", broke: false };
  }

  const cost = buildCost(tool);
  if (!canAfford(world.inventory, cost)) {
    const need = shortfall(world.inventory, cost);
    const what = (Object.entries(need) as [ItemId, number][]).map(([id, n]) => itemLabel(id, n)).join(", ");
    return { changed: false, message: `You'd need ${what}. There are trees.`, broke: true };
  }

  if (tool === "plank") {
    if (!placePlank(world, x, y)) return { changed: false, message: "Can't lay a board there.", broke: false };
    spend(world.inventory, cost);
    witness(world, "built_plank", undefined, now);
    return { changed: true, message: "A board goes down. The house begins.", broke: false };
  }

  if (isFurnitureTool(tool)) {
    const def = furnitureDef(tool);
    if (!placeFurniture(world, x, y, tool, facing, world.skins.selected[def.finish])) {
      return { changed: false, message: `The ${def.name.toLowerCase()} won't fit there.`, broke: false };
    }
    spend(world.inventory, cost);
    witness(world, "built_plank", undefined, now);
    return { changed: true, message: furnitureFlavour(tool), broke: false };
  }

  const finish = world.skins.selected[structureDef(tool).finish];
  const roomsBefore = rooms(world).length;
  if (!placeStructure(world, x, y, tool, finish)) {
    return { changed: false, message: `Can't put a ${structureDef(tool).name.toLowerCase()} there.`, broke: false };
  }
  spend(world.inventory, cost);
  witness(world, "built_plank", undefined, now);

  // Closing the last gap is the beat: the roof arrives on its own, because it
  // was never something you could buy (DESIGN §Structures).
  if (rooms(world).length > roomsBefore) {
    return { changed: true, message: "It closes. A roof settles over it, like it had been waiting.", broke: false };
  }
  return { changed: true, message: buildFlavour(tool), broke: false };
}

function buildFlavour(tool: "wall" | "door"): string {
  return tool === "wall" ? "A wall goes up. It holds." : "A door. Now it's somewhere you go into.";
}

/** Deadpan, brief, and about the object rather than about you (§Tone). */
function furnitureFlavour(id: FurnitureId): string {
  switch (id) {
    case "bed":
      return "A bed. The correct number of beds is now one.";
    case "table":
      return "A table. Things can be put on it. That is what it is for.";
    case "chair":
      return "A chair, facing the way you left it.";
    case "shelf":
      return "A shelf. It waits.";
  }
}

/** How close a villager must be to count as having done it *with* you. */
const TOGETHER_RADIUS = 4;

/** Broadcast a witnessed event to the town's memory logs. Everyone hears about
 *  it (news travels in a town this small), but anyone who was actually STANDING
 *  THERE also warms to you a little — friendship grows through doing things
 *  together, not only through gifts (DESIGN §"Company"). Dialogue only surfaces
 *  a memory if that villager's bank has a line for it. */
function witness(world: WorldState, kind: MemoryKind, value: string | undefined, now: number): void {
  const p = world.player;
  for (const v of world.villagers) {
    v.memory = remember(v.memory, { kind, at: now, value });
    if (Math.hypot(v.x - p.x, v.y - p.y) <= TOGETHER_RADIUS) befriend(v, 1);
  }
}

/** Talk to a villager: a line (memory-aware) plus a nudge of friendship. */
export function talk(world: WorldState, id: CharId, rng: Rng): Speech | null {
  const v = world.villagers.find((w) => w.id === id);
  if (!v) return null;
  befriend(v, 2);
  return speak(world, v, rng);
}

/** Complete the opening beat: stamp the land claim (DESIGN §"Opening beat"). */
export function completeLandClaim(world: WorldState): void {
  world.flags.landClaimed = true;
  world.flags.onboarded = true;
}

// --- Away simulation: the "while you were out" postcard ----------------------
// Absence generates NEWS, never chores (DESIGN §"Absence as story"). This runs
// on load: it advances every crop to now and reports what changed, plus one
// flavour line about the town living on without you.

/** Summarise time away: advance crops, run the town's own offline events, and
 *  report what actually changed. Returns an empty array when the player was
 *  barely gone. Mutates the world — that's the point; see sim/away.ts. */
export function summarizeAway(world: WorldState, now: number, rng: Rng): string[] {
  const elapsed = now - world.lastSaved;

  // Snapshot ripeness before advancing, so we can report what finished.
  const before: Record<string, number> = {};
  for (const [k, c] of Object.entries(world.crops)) before[k] = c.stage;

  updateAllCrops(world, now);

  if (elapsed < AWAY_MIN_MS) return [];

  let ripened = 0;
  let grew = 0;
  for (const [k, c] of Object.entries(world.crops)) {
    const wasStage = before[k] ?? c.stage;
    if (c.stage > wasStage) {
      grew++;
      if (c.stage >= ripeStage(cropDef(c.cropId))) ripened++;
    }
  }

  const lines: string[] = [];
  const hrs = Math.round(elapsed / 3_600_000);
  lines.push(hrs >= 1 ? `You were away about ${hrs} hour${hrs === 1 ? "" : "s"}.` : "You stepped out for a bit.");
  if (ripened > 0) lines.push(`${ripened} carrot${ripened === 1 ? "" : "s"} came ripe while you were gone.`);
  else if (grew > 0) lines.push("Your crops put on some growth.");
  // …and whatever the town got up to on its own.
  lines.push(...simulateAway(world, elapsed, now, rng));
  return lines;
}

// Re-exports so ui/render import the sim surface from one place.
export { tileAt, GRASS, DIRT, FARMLAND, FARMLAND_WET, isRipe, updateCrop, cropDef, ripeStage };
