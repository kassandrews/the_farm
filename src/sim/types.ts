// Shared sim state shapes. Pure data — no DOM, no canvas. Everything here
// serialises into the save (src/sim/save.ts), so field names and tile ids are
// long-lived; add fields with migrations, never repurpose old ones.

import type { TileId } from "../content/tiles";
import type { CropId } from "../content/crops";
import type { AdultForm } from "../content/canon/forms";
import type { CharId, NewcomerId } from "../content/cast";
import type { MemoryLog } from "./memory";
import type { PlaceLog } from "./places";
import type { Filing } from "./filings";
import type { Observation } from "./notebook";
import type { Inventory } from "./inventory";
import type { ItemId } from "../content/items";
import type { NodeId } from "../content/nodes";
import type { SkinId } from "../content/skins";
import type { StructureId } from "../content/structures";
import type { FurnitureId, Facing } from "../content/furniture";
import type { ExhibitId } from "../content/museum";
import type { ErrandId } from "../content/errands";

/** Where the player chose to settle (DESIGN §"Town and homestead": 3–4 spots).
 *
 *  NOT COSMETIC, which it was until now — each of these names a body of terrain
 *  the generator is required to put within sight of your plot: a river across
 *  the bottom of the garden, a treeline where the town's meadow ends, a shore
 *  you can walk to. `sim/world.ts` honours all three.
 *
 *  `hilltop` was the fourth and is gone. It was the one spot no line of code
 *  ever read, so it generated a world identical to the default — a choice that
 *  was not one. Nothing was saved under it, so it left no legacy value behind.
 *
 *  DECLARED IN `content/spots.ts` and re-exported here. The table of homesteads
 *  is content, content may not import sim, so the table has to own the type —
 *  exactly as `BiomeId` and `WaterKindId` already do. Re-exported rather than
 *  moved so every `import type { HomesteadSpot } from "./types"` still reads the
 *  way it always has. */
import type { HomesteadSpot } from "../content/spots";
export type { HomesteadSpot };

/** Which layer a coordinate is on.
 *
 *  This used to say "two, and there will never be a third", on the argument that
 *  the underground is the second half of one world rather than the first rung of
 *  a stack. The argument was right and the number was wrong: the sky (Phase 7c)
 *  is the same move upward, and what the rule actually forbids is HEIGHT, not
 *  layers (DESIGN §Structures — "Underground is a layer, not a height"; §The
 *  sky). A layer is reached through a threshold you stand on and step through,
 *  at the same coordinate; a height would be a tile drawn above another tile,
 *  and there are still none of those.
 *
 *  What keeps this from becoming a stack of levels is that each layer has to
 *  earn a threshold of its own — you dig the shaft, you find the stair — and
 *  neither one is a ladder to a third thing above it.
 *
 *  Lives here rather than in sim/world.ts because it is a SAVED shape (the
 *  player carries one), and world.ts imports this module. */
export type Layer = "surface" | "under" | "sky";

/** Which way the player last walked, to the nearest compass point.
 *
 *  Distinct from `facing`, which is ±1 and exists to flip a sprite — a sprite
 *  has no back, so left/right is all the ART can say. A directional VERB needs
 *  more than that: underground the shovel cuts the rock ahead of you, and with
 *  only ±1 there would be no way to tunnel north or south. So the heading is
 *  what the player MEANT and facing is what they look like.
 *
 *  Deliberately quantised to four, not stored as a vector: the world is a grid
 *  and the thing this picks is one adjacent cell. */
export type Heading = "n" | "e" | "s" | "w";

export interface Player {
  name: string;
  form: AdultForm;
  x: number; // world-tile coords (float — free movement)
  y: number;
  /** Current move target (tap-to-move); null when standing still. */
  target: { x: number; y: number } | null;
  facing: 1 | -1;
  /** Which way you last walked, to the nearest compass point — see Heading.
   *  Saved, because it decides what ACT is aimed at underground and the reticle
   *  has to promise the same cell after a reload that it did before one. */
  heading: Heading;
  /** The player's own remembered history. Empty for a freshly hatched sprite;
   *  seeded from The Meadow when you embody an imported pet, so "its name,
   *  form, and history come along" (DESIGN §"Player identity"). */
  memory: MemoryLog;
  /** True when this sprite was imported rather than hatched here. */
  imported: boolean;
  /** Which layer you're standing on: the ground, the rock under it, or the cloud
   *  over it. The town is a surface fact and so is nearly everything in the game,
   *  so this is the single piece of state that decides which world the ACT button
   *  is talking to. (Villagers carry one too now — see `Villager.layer` — but
   *  theirs is an exception and this one is the axis.) */
  layer: Layer;
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
  /** Which layer they stand on. Everyone in the town is on the surface and
   *  always will be; the one villager who isn't is the Mole, who lives in the
   *  rock and never comes up (DESIGN §"The Mole, specifically").
   *
   *  This used to say the player was the only thing that carried a layer, and
   *  that stopped being true the moment somebody lived down there. It is a
   *  field rather than a lookup because a coordinate now means two places, and
   *  everything that compares positions — talking, friendship radius, drawing —
   *  has to be able to ask which one. Optional, so schema v20 backfills nothing
   *  and an absent value reads as the surface, which for every villager who
   *  predates the Mole is exactly right. */
  layer?: Layer;
  facing: 1 | -1;
  /** Friendship, grown by talking/doing things together (DESIGN §"Company"). */
  friendship: number;
  memory: MemoryLog;
  /** The last few lines they said, newest last — a bounded ring
   *  (sim/dialogue.ts §SAID_MAX). Replaced `lastLine` at v32: one remembered
   *  line can only dodge an immediate repeat, and a two-line bank was a coin
   *  flip between the same two sentences forever. Selection prefers a line
   *  that isn't in here; a pool smaller than the ring falls back to itself
   *  rather than going quiet. */
  said: string[];
  /** ms epoch of the last conversation with the player. Absent means the game
   *  doesn't know — a pre-v32 save can't say when you last spoke, and greeting
   *  an absence it never measured would read as the game guessing. Set on
   *  every `speak`, so it self-limits: the greeting fires once, then the clock
   *  has reset. */
  lastTalkedAt?: number;
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

  /** Ground the player has BUILT ON, pinned to whatever generation said at the
   *  moment they built (v31). Keyed "x,y", surface only — the rock is not
   *  somewhere you build a room.
   *
   *  WHY THIS EXISTS. Generated chunks are never saved, so an unedited cell is
   *  recomputed from (seed, x, y) every load — which means a change to the
   *  generator re-landscapes towns people are living in. `HOME_REGION_REACH`
   *  answers that for the TOWN by making the meadow row an identity; it does
   *  nothing for the house somebody built five hundred tiles out, and the ground
   *  inside that house is not stored anywhere. Measured: 23% of open country is
   *  solid, and adding one percent of solid decor would give a 25-cell interior a
   *  22% chance of growing a tree inside it. A solid cell in a room breaks the
   *  room, the roof derived from it, and the villager's route to the bed.
   *
   *  So closing a room freezes its ground, and after that the generator cannot
   *  reach it. Paid once: no future terrain change owes a migration, because no
   *  future terrain change can touch a cell anybody built on. It also makes
   *  Pillar 4 true in the data — your land is yours, rather than being a function
   *  of the seed that happens to agree with you so far.
   *
   *  ITS OWN RECORD RATHER THAN ENTRIES IN `overrides`, AND THAT IS NOT TIDINESS.
   *  A frozen cell holds exactly what generation says, and `setTile` DELETES an
   *  edit whose value equals the generated base — that is the sparse-storage
   *  invariant, and it is right. Writing the freeze into `overrides` would mean
   *  storing values the codebase's own rule says must not exist, and any later
   *  pass that compacted redundant edits would silently unfreeze every town in
   *  the world. Separate records for a separate meaning is the same argument
   *  `under` and `finishes` already make, and it rekeys nothing: v31 adds an
   *  empty object.
   *
   *  READ ORDER IS `overrides` THEN THIS THEN GENERATION. An edit still wins, so
   *  digging up your own floor works. Undoing that edit falls back to the frozen
   *  ground rather than to live generation, which is the better meaning anyway:
   *  it returns the cell to what it was when you built here.
   *
   *  NOTHING EVER REMOVES AN ENTRY. The freeze is a one-way ratchet — a cell that
   *  froze wrong cannot be fixed in place — which is why it freezes the ROOM
   *  (interior and shell, from `rooms()`) and never a radius. */
  frozen: Record<string, TileId>;

  /** The same thing one layer down: sparse edits over the generated rock, keyed
   *  "x,y". Its own record rather than a prefix on `overrides` so that adding
   *  the underground rekeyed nothing in a live save — v17 adds an empty object
   *  and every existing entry keeps meaning exactly what it meant.
   *
   *  Sparse here means something stronger than it does above: underground
   *  generation is SOLID, so an entry is a cell you personally cut out. The
   *  size of this object is the size of your tunnel. */
  under: Record<string, TileId>;

  /** What FINISH a laid floor wears, keyed "x,y" — the ground layer's answer to
   *  `BuildCell.finish`, which walls and doors have carried since v5.
   *
   *  Sparse in the strong sense: **an absent entry means the class default**,
   *  not "unfinished". So a pine floor costs nothing to store, and `placeFloor`
   *  deletes the key rather than writing `pine` into it. That keeps the map the
   *  size of the floors you actually made a choice about instead of the size of
   *  everything you ever paved.
   *
   *  Its own record rather than a field on the tile because a tile is a NUMBER
   *  in `overrides` and always has been (ids are stable and stored). The
   *  alternative was one tile id per material × finish, which is precisely the
   *  eleven-kinds-of-plank sprawl DESIGN §Materials exists to refuse.
   *
   *  Why this exists at all: until v27 the renderer asked the town what colour
   *  every floor was, so changing your selection restyled every board you had
   *  ever laid — a live filter over the world, which is the opposite of what
   *  `finishFor`'s own docblock claimed it was. A finish is something you chose
   *  when you built. Now it is stored where you built it. */
  finishes: Record<string, SkinId>;

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

  /** Furniture standing in the rock. Its own record rather than a layer prefix
   *  on the keys above, for the reason `under` is its own record: adding it
   *  rekeys nothing in a live save (v21 adds an empty object), and — the part
   *  that decided it — every module that walks `furniture` looking for beds,
   *  shelves and notice boards keeps meaning the SURFACE by default.
   *
   *  `assign.ts`, `home.ts`, `housing.ts`, `errands.ts` and `commission.ts` all
   *  iterate that record; a bed in a tunnel is not a home and a board in a
   *  tunnel is not the town's. Five modules that would each have had to learn a
   *  layer instead learn nothing, which is what makes this the cheap shape.
   *
   *  Only lamps ever get here — the rock is not somewhere you build a room, it
   *  is somewhere you install a light (ROADMAP §"Ore's sink"). */
  underFurniture: Record<string, FurnitureCell>;

  crops: Record<string, Crop>;
  villagers: Villager[];

  /** Housing paperwork, oldest first. An arrival's villager is an ordinary
   *  entry in `villagers` — this is only the form about them. */
  commissions: Commission[];

  /** What you're carrying. No slots, no weight — see sim/inventory.ts. */
  inventory: Inventory;
  /** Every item id that has EVER entered the satchel, in the order first met.
   *  Marked by `gain` (sim/met.ts) and never unmarked — spending your last ore
   *  does not make ore a stranger again.
   *
   *  Exists for exactly one consumer: the museum's nature wing, which since
   *  Phase 14b may not NAME a thing you have never held (the Notebook's rule,
   *  reaching the one counter that was still allowed to break it). It is a list
   *  and not a count — a count would be a score — and nothing may ever gate a
   *  MECHANIC on it: what you can do is never a function of what you have seen,
   *  only what a list is willing to say out loud. */
  met: ItemId[];
  /** Felled resource nodes waiting to come back, keyed "x,y". An entry is
   *  dropped (never regrows) if you claim that ground — see sim/gather.ts. */
  regrow: Record<string, { node: NodeId; at: number }>;

  /** Dug earth waiting to grass over, keyed "x,y" → when the grass closes.
   *
   *  The other half of the renewable rule, and the same claim check applies: an
   *  entry is dropped the moment the tile stops being bare dirt, whether you
   *  tilled it, paved it, built on it or sank a shaft down it. See sim/gather.ts.
   *
   *  Its own record rather than a `regrow` entry with a sentinel node, because a
   *  NodeId is a thing you can gather — inventing "grass" as a node would give it
   *  a yield, a drop and a line in every gather verb it must never appear in. */
  reclaim: Record<string, number>;

  /** Appearance, the free axis (DESIGN §Materials). Finishes are unlocked
   *  permanently and weightlessly; `selected` is what each build tool is
   *  currently loaded with.
   *
   *  **Keyed by TOOL, not by finish class**, and the difference is the whole
   *  reason this changed at v27. A class key worked while every buildable wore
   *  exactly one class, so "the wood you are building in" was a coherent thing
   *  to store. Once a floor may be boards *or* flagstones there is no single
   *  class to key on: picking slate for the floor is not a statement about
   *  stone, it is a statement about floors. Per tool also gets the behaviour
   *  you actually want for free — a pine floor under whitewashed walls is an
   *  ordinary thing to want, and a class key would have made the two fight.
   *
   *  Partial because a tool the player has never dressed has no entry; read it
   *  through `loadedFinish()`, which falls back to the class default and also
   *  guards against an entry that has gone stale (a finish that no longer
   *  applies to the tool, or one that was never unlocked).
   *
   *  It stays in world state rather than moving to the UI so that what you are
   *  building in survives a reload, which is the same reason the seed variety
   *  below sits beside it. */
  skins: {
    unlocked: SkinId[];
    selected: Partial<Record<BuildTool, SkinId>>;
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

  /** Who is walking with you (sim/company.ts), or null. One slot, never a
   *  party — see that file for why a retinue is a parade.
   *
   *  An id and a timestamp, and deliberately nothing else. Where they are is
   *  the villager's own x/y; which layer they are on is the villager's own
   *  `layer`; how they feel about it is their friendship. A trip has no
   *  progress, no distance, and no completion, so there is nothing here for a
   *  UI to turn into a bar. `sinceAt` exists so a line can say "all afternoon"
   *  one day, and for nothing else. */
  company: { id: CharId; sinceAt: number } | null;

  /** What the GROUND remembers, oldest first (sim/places.ts).
   *
   *  One flat log for the whole world rather than a record per building, and
   *  that is the load-bearing decision: a building has no identity here — a
   *  room is derived from whichever walls are standing, so its `Room.id` moves
   *  when you extend it — and a history filed under the walls would be deleted
   *  by the player improving the house. Entries are anchored to coordinates;
   *  a room is a QUERY over them (`placesIn`), never their owner.
   *
   *  Like `museum.donated`, it accumulates and still is not a score: no total,
   *  no denominator, nothing reads its length, and nothing anywhere gates on
   *  whether a place has any. It is capped, like a villager's memory. */
  places: PlaceLog;

  /** The filing cabinet at the town hall (sim/filings.ts), oldest first.
   *
   *  Only half the feature is here. WHICH forms the hall offers is a total
   *  function of how long you have lived in town, the way a festival is of the
   *  date — nothing schedules a batch and nothing stores one. This is the other
   *  half: what you actually filed.
   *
   *  An accumulating record and still not a score, on `museum.donated`'s exact
   *  argument: a list of what you did, with no total, no denominator and no set
   *  of what is outstanding. Nothing may expose its LENGTH — "no filing count
   *  anywhere" — and nothing outside sim/filings.ts may read it at all, because
   *  every form in the table changes nothing and a filing that gated a rule
   *  would turn a cabinet into a progression track. */
  filings: Filing[];

  /** The Notebook (sim/notebook.ts), in the order you wrote it.
   *
   *  An id and a timestamp per entry, and NOTHING ELSE — no distance, no depth,
   *  no high-water mark of any kind. The conditions that fire an entry are
   *  arithmetic on where you happen to be standing, evaluated live, and the
   *  entry itself is the whole record that you were once out there. That is
   *  deliberate: sim/mining.ts and content/junk.ts both refuse a "deepest
   *  reached" counter in writing, on the grounds that a monotonic number is a
   *  score whatever it is called, and a `farthestFromPlaza` field would be the
   *  same object with a different name.
   *
   *  A record, not a score, on `museum.donated`'s argument. Nothing may expose
   *  its length and nothing anywhere may gate on it. */
  notebook: Observation[];

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
export type BuildTool = "floor" | "wall" | "door" | "window" | "erase" | FurnitureId;
