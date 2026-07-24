// The sim's front door. Everything the render + ui layers need to drive the
// world goes through here: create a world, tick it on a fixed timestep, apply
// the context action, talk to a villager, and summarise what happened while the
// player was away. No DOM, no canvas — still pure logic (CLAUDE.md).

import type { WorldState, Player, Tool, HomesteadSpot } from "./types";
import type { AdultForm } from "../content/canon/forms";
import { CAST } from "../content/cast";
import type { CharId } from "../content/cast";
import { makeVillager, tickVillager, befriend } from "./villagers";
import { remember } from "./memory";
import type { MemoryKind } from "./memory";
import { HOME, dig, placePlank, isWalkable, tileAt } from "./world";
import { GRASS, DIRT, FARMLAND, FARMLAND_WET } from "../content/tiles";
import { canPlant, plant, water, harvest, isRipe, updateAllCrops, updateCrop } from "./crops";
import { cropDef, ripeStage } from "../content/crops";
import type { MeadowImport } from "./meadow_import";
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
  /** An imported Meadow sprite becomes the starter resident, if provided. */
  meadowImport?: MeadowImport | null;
}

/** Homestead origin per chosen spot — all near HOME, nudged for flavour. */
function homesteadOrigin(spot: HomesteadSpot): { x: number; y: number } {
  switch (spot) {
    case "riverside":
      return { x: HOME.x, y: HOME.y };
    case "forest":
      return { x: HOME.x + 2, y: HOME.y + 1 };
    case "hilltop":
      return { x: HOME.x + 1, y: HOME.y - 1 };
  }
}

export function newWorld(opts: NewWorldOpts): WorldState {
  const now = Date.now();
  const seed = opts.seed ?? ((Math.random() * 0xffffffff) >>> 0);
  const origin = homesteadOrigin(opts.spot);

  const player: Player = {
    name: opts.name.trim() || "New Sprite",
    form: opts.form,
    x: origin.x,
    y: origin.y + 1, // stood just below the tent
    target: null,
    facing: -1,
  };

  // Fixed cast + the one starter resident. A Meadow import overrides the
  // resident's identity and seeds its memory with raising history.
  const villagers = [makeVillager(CAST.office, now)];
  if (opts.meadowImport) {
    const def = { ...CAST.resident1, form: opts.meadowImport.form, name: opts.meadowImport.name };
    villagers.push(makeVillager(def, now, opts.meadowImport.memorySeed));
  } else {
    villagers.push(makeVillager(CAST.resident1, now));
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    createdAt: now,
    lastSaved: now,
    player,
    homestead: { spot: opts.spot, originX: origin.x, originY: origin.y },
    overrides: {},
    crops: {},
    villagers,
    flags: { landClaimed: false, onboarded: false },
  };
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
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.01) p.facing = dx >= 0 ? 1 : -1;
    }
  }

  for (const v of world.villagers) tickVillager(v, dt);
  updateAllCrops(world, now);
}

export type ActionKind = "dig" | "plank" | "plant" | "water" | "harvest" | "none";
export interface ActionResult {
  kind: ActionKind;
  changed: boolean;
  message: string;
}

/** The context action button. Harvesting wins when the player stands on a ripe
 *  crop (so the ripe carrot is always one tap away, whatever tool is held);
 *  otherwise the held tool is applied to the tile underfoot. */
export function contextAction(world: WorldState, tool: Tool, now: number): ActionResult {
  const { x, y } = playerTile(world);

  if (isRipe(world, x, y)) {
    const yielded = harvest(world, x, y, now);
    if (yielded) {
      witness(world, "harvested_carrot", `a ${yielded}`, now);
      return { kind: "harvest", changed: true, message: `You pulled a ${yielded}. It's a good one.` };
    }
  }

  switch (tool) {
    case "dig":
      if (dig(world, x, y)) {
        witness(world, "dug", undefined, now);
        return { kind: "dig", changed: true, message: "You turn the earth." };
      }
      return { kind: "dig", changed: false, message: "Nothing to dig here." };
    case "plank":
      if (placePlank(world, x, y)) {
        witness(world, "built_plank", undefined, now);
        return { kind: "plank", changed: true, message: "A board goes down. The house begins." };
      }
      return { kind: "plank", changed: false, message: "Can't lay a board there." };
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

/** Broadcast a witnessed event to the town's memory logs. For the slice every
 *  resident "hears about it"; a real proximity model is future work. Dialogue
 *  only surfaces a memory if that villager's bank has a line for it. */
function witness(world: WorldState, kind: MemoryKind, value: string | undefined, now: number): void {
  for (const v of world.villagers) {
    v.memory = remember(v.memory, { kind, at: now, value });
  }
}

/** Talk to a villager: a line (memory-aware) plus a nudge of friendship. */
export function talk(world: WorldState, id: CharId, rng: Rng): Speech | null {
  const v = world.villagers.find((w) => w.id === id);
  if (!v) return null;
  befriend(v, 2);
  return speak(v, rng);
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

const AWAY_MIN_MS = 20 * 60 * 1000; // under 20 min away isn't worth a postcard

const TOWN_NEWS = [
  "The Scholar mounted a new exhibit. It is confidently, gloriously wrong.",
  "The Gremlin relocated a fence. Nobody saw. Everybody knows.",
  "Mushrooms spread along the plaza's north edge. The Office Creature filed it under 'later'.",
  "The Blob rehearsed a monologue to an empty stage. It went well, apparently.",
  "A quiet went around the plaza and then left. Ordinary stuff.",
];

/** Summarise time away and advance crops. Returns postcard lines, or an empty
 *  array when the player was barely gone. Mutates the world (crops advance). */
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
  lines.push(rng.pick(TOWN_NEWS));
  return lines;
}

// Re-exports so ui/render import the sim surface from one place.
export { tileAt, GRASS, DIRT, FARMLAND, FARMLAND_WET, isRipe, updateCrop, cropDef, ripeStage };
