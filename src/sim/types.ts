// Shared sim state shapes. Pure data — no DOM, no canvas. Everything here
// serialises into the save (src/sim/save.ts), so field names and tile ids are
// long-lived; add fields with migrations, never repurpose old ones.

import type { TileId } from "../content/tiles";
import type { CropId } from "../content/crops";
import type { AdultForm } from "../content/canon/forms";
import type { CharId, NewcomerId } from "../content/cast";
import type { MemoryLog } from "./memory";
import type { Inventory } from "./inventory";
import type { NodeId } from "../content/nodes";
import type { SkinId, SkinClass } from "../content/skins";
import type { StructureId } from "../content/structures";
import type { FurnitureId, Facing } from "../content/furniture";
import type { ExhibitId } from "../content/museum";
import type { ErrandId } from "../content/errands";

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

/** One piece of housing paperwork — the flagship beat, as state.
 *
 *  Deliberately does NOT record where the newcomer lives. That's `homeBed` on
 *  the villager, and it stays the only record: a commission that also knew
 *  would be the same fact written twice, which is what the housing model
 *  refuses. What lives here is what only the paperwork knows — who asked, when,
 *  where their tent is, and whether it's been signed off. */
export interface Commission {
  id: NewcomerId;
  /** Row in content/arrivals.ts. Stored rather than looked up by name, so
   *  editing the table's prose can't orphan a live save's commission. */
  index: number;
  arrivedAt: number;
  /** Where they're camping until they have somewhere better. Not a build cell
   *  and not furniture — a tent isn't a structure, has no solidity, and must
   *  never be something the room flood-fill has to have an opinion about. */
  tent: { x: number; y: number };
  /** When the Office Creature handed the form over; null until you've spoken to
   *  him. The commission exists before it's filed — someone is in a tent
   *  whether or not the paperwork has caught up, which is the joke. */
  filedAt: number | null;
  /** When it was satisfied and signed off. Null while it's still open, and the
   *  record that its reward has already been paid. */
  stampedAt: number | null;
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

  /** Housing paperwork, oldest first. An arrival's villager is an ordinary
   *  entry in `villagers` — this is only the form about them. */
  commissions: Commission[];

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

  /** Farming's free axis, and deliberately the same shape as `skins` above.
   *  `unlocked` is the varieties the Blessed Carrot has let you have — permanent
   *  and weightless, like a finish — and `selected` is what the next seed
   *  becomes when it goes in the ground.
   *
   *  Note what is NOT here: a count. Seed itself is an ordinary item in the
   *  satchel, because it is stuff; the variety is a look and looks are free
   *  (DESIGN §Materials). Storing "how much radish seed" would be the two axes
   *  collapsing back into one. */
  seeds: {
    unlocked: CropId[];
    selected: CropId;
  };

  /** What you have given the museum, oldest first (sim/museum.ts).
   *
   *  The FIRST accumulating record in the save, and the shape is the argument
   *  for why that's allowed: a list of what you gave, and nothing else. There
   *  is no count, no set of what's outstanding, and no "seen" flags — a
   *  collection is not a score when it has no total and no denominator
   *  (ROADMAP §The museum). Anything added here that could be divided by
   *  something has misunderstood the field.
   *
   *  `placard` is an index into the exhibit's readings, not the text: the away
   *  event moves it when the curator revises, and the words stay in content. */
  museum: { donated: { id: ExhibitId; placard: number }[] };

  /** The errands board (sim/errands.ts). One open request, what has been asked
   *  before, and when the board last went quiet.
   *
   *  `done` is a list of ids and NOT a count, even though nothing reads it as a
   *  list of anything but "have I seen this row". That is the point: the table
   *  cycles by preferring unseen rows, so it needs to know which ones it has
   *  used — and a number would be a score, whereas a set of ids is a memory.
   *  Nothing may expose its length.
   *
   *  `lastClosedAt` is the whole timer. There is no deadline on an open request
   *  and no countdown anywhere; this stamps when the board is next allowed to
   *  ask, which is a fact about the town's pace and not about the player's. */
  errands: {
    open: { id: ErrandId; askerId: CharId; postedAt: number } | null;
    done: ErrandId[];
    lastClosedAt: number;
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
