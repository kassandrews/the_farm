// Shared sim state shapes. Pure data — no DOM, no canvas. Everything here
// serialises into the save (src/sim/save.ts), so field names and tile ids are
// long-lived; add fields with migrations, never repurpose old ones.

import type { TileId } from "../content/tiles";
import type { CropId } from "../content/crops";
import type { AdultForm } from "../content/canon/forms";
import type { CharId } from "../content/cast";
import type { MemoryLog } from "./memory";
import type { Inventory } from "./inventory";
import type { NodeId } from "../content/nodes";
import type { SkinId, SkinClass } from "../content/skins";

/** Where the player chose to settle (DESIGN §"Town and homestead": 3–4 spots).
 *  Cosmetic-plus-origin: it shifts the homestead plot and its flavour. */
export type HomesteadSpot = "riverside" | "forest" | "hilltop";

export interface Player {
  name: string;
  form: AdultForm;
  x: number; // world-tile coords (float — free movement)
  y: number;
  /** Current move target (tap-to-move); null when standing still. */
  target: { x: number; y: number } | null;
  facing: 1 | -1;
  /** The player's own remembered history. Empty for a freshly hatched sprite;
   *  seeded from The Meadow when you embody an imported pet, so "its name,
   *  form, and history come along" (DESIGN §"Player identity"). */
  memory: MemoryLog;
  /** True when this sprite was imported rather than hatched here. */
  imported: boolean;
}

/** A planted crop, keyed by "x,y" in WorldState.crops. Growth is wall-clock
 *  gated and accrues only while the plot is watered — see sim/crops.ts. */
export interface Crop {
  cropId: CropId;
  stage: number; // index into CropDef.stages; last stage = ripe
  plantedAt: number;
  /** Accumulated *watered* growth (ms) toward the current stage's requirement. */
  growthMs: number;
  /** Wall-clock moment growth was last integrated (for away-sim). */
  lastUpdate: number;
  /** The plot counts as watered until this epoch ms; watering extends it. */
  wateredUntil: number;
}

export interface Villager {
  id: CharId;
  form: AdultForm;
  name: string;
  fixed: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  /** Friendship, grown by talking/doing things together (DESIGN §"Company"). */
  friendship: number;
  memory: MemoryLog;
  /** Last idle line shown, so it doesn't immediately repeat. */
  lastLine: string;
}

export interface WorldState {
  schemaVersion: number;
  seed: number;
  createdAt: number;
  lastSaved: number;

  player: Player;
  homestead: { spot: HomesteadSpot; originX: number; originY: number };

  /** Sparse surface-tile edits over deterministic generation, keyed "x,y".
   *  Digging and placing write here; generation supplies everything else. */
  overrides: Record<string, TileId>;
  crops: Record<string, Crop>;
  villagers: Villager[];

  /** What you're carrying. No slots, no weight — see sim/inventory.ts. */
  inventory: Inventory;
  /** Felled resource nodes waiting to come back, keyed "x,y". An entry is
   *  dropped (never regrows) if you claim that ground — see sim/gather.ts. */
  regrow: Record<string, { node: NodeId; at: number }>;

  /** Appearance, the free axis (DESIGN §Materials). Finishes are unlocked
   *  permanently and weightlessly; `selected` is what you're currently
   *  building in, per material class. */
  skins: {
    unlocked: SkinId[];
    selected: Record<SkinClass, SkinId>;
  };

  flags: {
    landClaimed: boolean;
    /** Whether the intro (homestead choice + land claim) has been completed. */
    onboarded: boolean;
  };
}

/** A tool the player has selected; the action button applies it. Digging and
 *  gathering are always free; only `plank` spends materials (DESIGN §Materials:
 *  terraforming is never blocked). */
export type Tool = "dig" | "gather" | "plank" | "plant" | "water";
