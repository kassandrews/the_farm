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
import type { StructureId } from "../content/structures";
import type { FurnitureId, Facing } from "../content/furniture";

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

/** One built piece, keyed by "x,y" in WorldState.build.
 *
 *  `finish` is stored PER CELL rather than read from the town-wide selection,
 *  which is the fix for the long-standing "changing a finish restyles every
 *  built tile at once" gap. Commissioned housing needs the Ghost's dark house
 *  and the Menace's pale one to coexist in the same town, so the finish has to
 *  live with the piece. It's still free to change and still weightless — a
 *  finish is a property, never an item (DESIGN §Materials). */
export interface BuildCell {
  id: StructureId;
  finish: SkinId;
}

/** One placed piece of furniture, keyed by its ANCHOR cell in
 *  WorldState.furniture (the north-west cell of its footprint).
 *
 *  Stored once, never per covered cell: see sim/furniture.ts for why a second
 *  occupancy map is a bug waiting to happen. `facing` lives here and not on
 *  structures because orientation is a furniture idea — a bed faces a way, a
 *  wall's neighbours decide how it looks (DESIGN §Structures). */
export interface FurnitureCell {
  id: FurnitureId;
  facing: Facing;
  finish: SkinId;
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
  /** Anchor key ("x,y") of THEIR bed, or null if they haven't got one.
   *
   *  This single field is the whole housing model (sim/housing.ts): a home is
   *  wherever their bed is, so their room is roomAt(bed) and their bedtime post
   *  is a cell beside it. Nothing records which room is theirs, because that
   *  would be the same fact written twice and the copies would drift.
   *
   *  A key, not coordinates, so it compares directly against world.furniture's
   *  own keying. It is allowed to go stale — demolishing a bed doesn't hunt
   *  through the villager list — and a stale claim simply means homeless. */
  homeBed: string | null;
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

  /** Things STANDING on the ground, keyed "x,y" — walls and doors now,
   *  furniture later. A separate layer from `overrides` because a tile answers
   *  "what is the ground here" and this answers "what is standing on it"; a
   *  wall needs both, floor underneath and wall on top. Sparse, so an
   *  untouched world carries an empty object. */
  build: Record<string, BuildCell>;

  /** Furniture, keyed by ANCHOR cell — the things you put in a room, as opposed
   *  to the things that make one. Separate from `build` because pieces are
   *  multi-tile, carry a facing, and never seal a room. */
  furniture: Record<string, FurnitureCell>;

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

/** A tool the ACTION BUTTON applies, to the tile at your feet. All of these are
 *  free — terraforming is never blocked (DESIGN §Materials).
 *
 *  Placement deliberately isn't here. A wall is solid, so "apply to the tile
 *  underfoot" would wall you into stone and you could never close a room;
 *  everything you place therefore moved to build mode, which targets a tapped
 *  tile instead (DESIGN §Structures). See BuildTool. */
export type Tool = "dig" | "gather" | "plant" | "water";

/** A tool BUILD MODE applies, to a tapped tile. `erase` takes back whatever is
 *  there and refunds it — building and un-building must never quietly drain
 *  you. */
export type BuildTool = "plank" | "wall" | "door" | "erase" | FurnitureId;
