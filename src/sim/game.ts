// The sim's front door. Everything the render + ui layers need to drive the
// world goes through here: create a world, tick it on a fixed timestep, apply
// the context action, talk to a villager, and summarise what happened while the
// player was away. No DOM, no canvas — still pure logic (CLAUDE.md).

import type { WorldState, Player, Villager, Tool, BuildTool, HomesteadSpot, Heading, Layer } from "./types";
import type { AdultForm } from "../content/canon/forms";
import { CAST } from "../content/cast";
import type { CharId } from "../content/cast";
import { makeVillager, tickVillager } from "./villagers";
import { befriend } from "./friendship";
import { arrivalDue, admitArrival } from "./commission";
import { remember, hasMemory } from "./memory";
import type { MemoryKind } from "./memory";
import { rememberPlace, isWorkPlace } from "./places";
import { sweepNoticed } from "./notebook";
import { sweepMoments } from "./moments";
import {
  canDig,
  canFill,
  fill,
  canSink,
  sink,
  fillShaft,
  canCarve,
  placeFloor,
  floorFinish,
  clearFloorFinish,
  refusesConstruction,
  isWalkable,
  tileAt,
  setTile,
  tileKey,
  homesteadOrigin,
  generatedTile,
  cubeSite,
  skyStairSiteAt,
  tileSpeed,
} from "./world";
import { placeStructure, removeStructure, structureAt } from "./structures";
import { rooms } from "./rooms";
import { freezeBuilt } from "./freeze";
import { roomRemembers, historyLine } from "./history";
import { stampTown, ensureFixedCast } from "./town";
import { newErrands, errandDue, postErrand, boardNear } from "./errands";
import { settleResidents } from "./housing";
import { playerHome } from "./assign";
import { placeFurniture, removeFurnitureAt } from "./furniture";
import { FURNITURE, furnitureDef } from "../content/furniture";
import type { FurnitureId, Facing } from "../content/furniture";
import { structureDef } from "../content/structures";
import {
  GRASS,
  DIRT,
  FLOOR,
  FARMLAND,
  FARMLAND_WET,
  MUSHROOM,
  SHAFT,
  SKY_STAIR,
  JUNK_PILE,
  MAILBOX,
  FLOOR_BUILD,
} from "../content/tiles";
import { letterFor, stairNote } from "../content/found";
import { dayNumber } from "./found";
import { foundAt } from "./world";
import { digWithFind, carveWithFind, findLine } from "./junk";
import { emptyInventory, canAfford, spend, refund, shortfall } from "./inventory";
import { gain } from "./met";
import type { Cost } from "./inventory";
import { itemLabel, priceItems } from "../content/items";
import type { ItemId } from "../content/items";
import { gather, nodeAt, nodeNear, updateRegrowth, updateReclaim } from "./gather";
import { nodeDef } from "../content/nodes";
import { mineVein } from "./mining";
import { meetMole } from "./mole";
import { meetGhost } from "./ghost";
import { present } from "./presence";
import { meetCosmos, updateCosmos } from "./cosmos";
import { takeAlong, updateCompany } from "./company";
import { starterSkins, defaultSkin, skinDef } from "../content/skins";
import type { SkinId, SkinClass } from "../content/skins";
import { STARTING_CROP } from "../content/crops";
import { STARTING_SEED, canSow, sow } from "./seeds";
import { canPlant, water, canWater, harvest, isRipe, updateAllCrops, updateCrop } from "./crops";
import { cropDef, ripeStage } from "../content/crops";
import type { CropId } from "../content/crops";
import { seasonAt } from "./seasons";
import type { MeadowImport } from "./meadow_import";
import { simulateAway, AWAY_MIN_MS } from "./away";
import { speak } from "./dialogue";
import type { Speech } from "./dialogue";
import type { Rng } from "./rng";
import { makeRng } from "./rng";
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
    heading: "s", // stood below the tent, looking out at the plot
    memory: embodying ? [...embodying.memorySeed] : [],
    imported: embodying !== null,
    layer: "surface", // you start on top of the world, obviously
  };

  // Fixed cast + the one starter resident. An import you did NOT embody moves
  // in as that resident, keeping its Meadow name and raising history.
  // Every authored institution, from the table — not a hand-written list that
  // has to be remembered when a new one is added (see town.ts ensureFixedCast).
  const villagers: Villager[] = [];
  ensureFixedCast({ villagers }, now, (def, at) => makeVillager(def, at));
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
    homestead: { spot: opts.spot, originX: origin.x, originY: origin.y, struckAt: null },
    overrides: {},
    frozen: {},
    under: {}, // solid rock until you cut into it
    finishes: {}, // empty means every floor is pale pine — see WorldState.finishes
    build: {},
    furniture: {},
    underFurniture: {},
    crops: {},
    villagers,
    commissions: [],
    // A few boards' worth of wood so the very first thing you try to build
    // works — you learn the cost by spending it, not by being refused. Seed for
    // the same reason: the tent comes with enough to put a row in, and the
    // Blessed Carrot is where you go when you want more of it or something
    // other than a carrot to plant.
    inventory: { ...emptyInventory(), wood: 8, seed: STARTING_SEED },
    // The opening stock counts as met — it is in your pockets before your
    // first step, and a museum that asked you to go discover wood would be
    // asking you to discover your own tent pegs.
    met: ["wood", "seed"],
    regrow: {},
    reclaim: {},
    // Empty on purpose: `selected` is keyed by tool and every entry is a choice
    // the player made. `loadedFinish()` supplies the default for a tool nobody
    // has dressed yet, so seeding this with one entry per tool would be writing
    // down the fallback in three places and letting two of them drift.
    skins: { unlocked: starterSkins(), selected: {} },
    seeds: { unlocked: [STARTING_CROP], selected: STARTING_CROP },
    museum: { donated: [] },
    // Same helper the v15 migration uses, so a new town and an upgraded one
    // open with an identically quiet board.
    errands: newErrands(now),
    company: null, // you arrive alone; everyone here is a stranger
    places: [], // the ground has seen nothing yet; the town's history starts now
    filings: [], // the hall has its founding schedule; you have filed none of it
    notebook: [], // you have just arrived and noticed nothing yet
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

/** Is the player standing on this cell, on this layer? The layer matters: the
 *  same coordinate exists on the surface and in the rock, and a wall going up
 *  over your head while you are underneath it is `fillShaft`'s problem, not
 *  this one. */
function standingOn(world: WorldState, x: number, y: number, layer: Layer): boolean {
  if (world.player.layer !== layer) return false;
  const at = playerTile(world);
  return at.x === x && at.y === y;
}

/** Would this build tool put down something you cannot walk through? Asked of
 *  the piece rather than the tool's category, so a rug and a bed get different
 *  answers even though both are furniture. */
function placingSomethingSolid(tool: BuildTool): boolean {
  if (isFurnitureTool(tool)) return furnitureDef(tool).solid;
  if (tool === "floor" || tool === "erase") return false;
  return structureDef(tool).solid;
}

/** One step along a heading. The one place the compass becomes arithmetic, so
 *  nothing downstream can disagree about which way "n" is. */
export function headingStep(h: Heading): { dx: number; dy: number } {
  switch (h) {
    case "n":
      return { dx: 0, dy: -1 };
    case "s":
      return { dx: 0, dy: 1 };
    case "e":
      return { dx: 1, dy: 0 };
    case "w":
      return { dx: -1, dy: 0 };
  }
}

/** The compass point a movement reads as: the DOMINANT axis, so a diagonal walk
 *  commits to the direction it is mostly going rather than flickering between
 *  two. Ties go to the horizontal, matching `facing` — on a 3/4 view, left and
 *  right are the directions the art can actually show. */
function headingOf(dx: number, dy: number): Heading {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "e" : "w";
  return dy >= 0 ? "s" : "n";
}

/** The cell one step ahead of the player. What ACT aims at when the thing it
 *  acts on cannot be underfoot — which underground is everything, since rock is
 *  solid and you can only ever stand in the space you already cut. */
export function aheadOf(world: WorldState): { x: number; y: number } {
  const { x, y } = playerTile(world);
  const { dx, dy } = headingStep(world.player.heading);
  return { x: x + dx, y: y + dy };
}

/** Set a walk target from a tapped world-tile coordinate. Ignores taps onto
 *  solid tiles (walk to the edge instead is future polish; for now, refuse). */
export function moveTo(world: WorldState, x: number, y: number): void {
  const p = world.player;
  // The heading is set from what you ASKED for, before the refusal below — a
  // move into solid rock still says which way you meant to go, and underground
  // that is the whole gesture: walk at the wall, then cut it. Reading the
  // heading only from movement that succeeded would mean you could never aim at
  // the one thing you can't walk into.
  const dx = x - p.x;
  const dy = y - p.y;
  if (Math.hypot(dx, dy) > 0.05) p.heading = headingOf(dx, dy);
  if (!isWalkable(world, Math.round(x), Math.round(y), p.layer)) return;
  p.target = { x, y };
}

/** Can you go down from where you're standing? Only on a shaft, and only from
 *  above. */
export function canDescend(world: WorldState): boolean {
  if (world.player.layer !== "surface") return false;
  const { x, y } = playerTile(world);
  return tileAt(world, x, y) === SHAFT;
}

/** And back up. Reads the SURFACE tile deliberately — a shaft is stored once,
 *  on top, so "is there a way up here" and "is there a way down here" are the
 *  same question asked from either end and can never disagree. */
export function canAscend(world: WorldState): boolean {
  if (world.player.layer !== "under") return false;
  const { x, y } = playerTile(world);
  return tileAt(world, x, y) === SHAFT;
}

/** Change layer. Position doesn't change — it's the same coordinate, one layer
 *  down, which is what "one continuous world, no interior scenes" (DESIGN
 *  §Structures) looks like applied downward: no transition, no second map.
 *
 *  Snaps to the tile centre and drops any walk target, because the ground you
 *  were heading for is not the ground you are now on. */
export function useShaft(world: WorldState): boolean {
  const down = canDescend(world);
  if (!down && !canAscend(world)) return false;
  const { x, y } = playerTile(world);
  world.player.layer = down ? "under" : "surface";
  world.player.x = x;
  world.player.y = y;
  world.player.target = null;
  // Whoever came with you comes with you. AFTER the flip, so `takeAlong` reads
  // the layer you are now on rather than having to be told which way you went —
  // DESIGN §Company's own example is "anyone for a dig", and a companion who
  // waved from the top of the ladder would be the feature declining to happen at
  // the one place it matters most.
  takeAlong(world, down ? "surface" : "under");
  return true;
}

/** The staircase that goes somewhere, if you are standing at the foot of one and
 *  facing it (Phase 7c). Returns the step you'd climb, or null.
 *
 *  BY HEADING, not by a search of the four neighbours, and the reason is the
 *  same one the shovel has at a shoreline: a step you did not mean to take is
 *  worse than a swing you did not mean to make, because it moves you to another
 *  layer. Face the steps and you go up; stand beside them and you do not.
 *
 *  There is nothing here about having found it before, no flag, and no list.
 *  Every other flight of steps in the world answers null to this, forever, and
 *  that is the whole of the secret: you find out which one is real by standing
 *  at the bottom of it and trying (DESIGN §The sky). */
export function climbTarget(world: WorldState): { x: number; y: number } | null {
  if (world.player.layer !== "surface") return null;
  const ahead = aheadOf(world);
  const site = skyStairSiteAt(world.seed, world.homestead.spot, ahead.x, ahead.y);
  return site ? ahead : null;
}

export function canClimb(world: WorldState): boolean {
  return climbTarget(world) !== null;
}

/** The step ahead of you, real or not — what ACT aims at.
 *
 *  Deliberately a DIFFERENT question from `climbTarget`, which still answers only
 *  about the staircase that goes somewhere. Keeping them apart is what lets the
 *  button behave identically at both while the outcome differs. */
export function stepsAhead(world: WorldState): { x: number; y: number } | null {
  if (world.player.layer !== "surface") return null;
  const ahead = aheadOf(world);
  if (climbTarget(world)) return ahead;
  const site = foundAt(world.seed, world.homestead.spot, ahead.x, ahead.y);
  return site && site.kind === "stair" ? ahead : null;
}

/** And the way back down: standing on the head of the steps, up in the sky. */
export function canGoDownStair(world: WorldState): boolean {
  if (world.player.layer !== "sky") return false;
  const { x, y } = playerTile(world);
  return tileAt(world, x, y, "sky") === SKY_STAIR;
}

/** Where you land when you come down. The steps themselves are SOLID on the
 *  surface — they are a thing standing in a field, and 7b's decoys are the same
 *  object — so unlike a shaft you cannot arrive on the coordinate you left from.
 *
 *  South first, because that is the face of the flight: the renderer draws the
 *  near tile as the bottom step, so stepping off toward the camera is the move
 *  the picture has already promised. The rest of the compass is the fallback for
 *  a staircase whose front happens to be against water or a tree, and it is
 *  ordered rather than searched-nearest so that one flight always returns you to
 *  the same tile — arriving somewhere different each time would make the way
 *  home feel unreliable at exactly the moment you want it not to be. */
function stairFoot(world: WorldState, x: number, y: number): { x: number; y: number } | null {
  for (const [dx, dy] of [
    [0, 1],
    [1, 0],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as [number, number][]) {
    if (isWalkable(world, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return null;
}

/** Up the steps, or down them. The sky's answer to `useShaft`, and deliberately
 *  its own function rather than a third case inside it: a shaft is a stored edit
 *  the player dug and this is generated terrain nobody made, they share no
 *  precondition, and the one thing they do share — take your company with you —
 *  is one line each. */
export function useStair(world: WorldState): boolean {
  const p = world.player;
  const up = climbTarget(world);
  if (up) {
    p.layer = "sky";
    // The same coordinate, one layer up — "one continuous world, no interior
    // scenes" pointed the other way. You arrive standing on the head of the
    // steps you were looking at, which is also the way home.
    p.x = up.x;
    p.y = up.y;
    p.target = null;
    takeAlong(world, "surface");
    return true;
  }
  if (!canGoDownStair(world)) return false;
  const { x, y } = playerTile(world);
  const foot = stairFoot(world, x, y);
  if (!foot) return false;
  p.layer = "surface";
  p.x = foot.x;
  p.y = foot.y;
  p.target = null;
  takeAlong(world, "sky");
  return true;
}

/** Fixed-timestep advance. `dt` seconds drives smooth movement; `now` (epoch
 *  ms) drives the wall-clock world (crops). */
/** How often the noticing predicates are walked. Half a second: fast enough
 *  that stepping into the glass country and stopping to look feels like the
 *  moment you noticed it, slow enough that the table is walked twice a second
 *  instead of sixty times. */
const NOTICE_SWEEP_MS = 500;

// Not serialised — a cache key, not state, exactly like `buildRevision` in
// sim/structures.ts. A WeakMap keyed by world so a discarded world drops it.
const sweepAt = new WeakMap<WorldState, number>();
const lastSweep = (w: WorldState): number => sweepAt.get(w) ?? 0;
const setLastSweep = (w: WorldState, t: number): void => void sweepAt.set(w, t);

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
      // Speed is read from the tile you are STANDING on, not the one you are
      // stepping onto, so the shallows slow you while you're in them and let go
      // the moment you're out. Reading the destination instead would brake you
      // on the bank a step before you got wet, which feels like the water
      // reaching for you.
      const pace = PLAYER_SPEED * tileSpeed(world, Math.round(p.x), Math.round(p.y), p.layer);
      const step = Math.min(dist, pace * dt);
      // Collide per axis rather than as a point, so a wall STOPS you and a
      // glancing approach slides along it instead of sticking. Until structures
      // existed only the destination tile was ever checked, which meant tapping
      // past a wall walked you straight through it — the walls were scenery.
      const nx = p.x + (dx / dist) * step;
      const ny = p.y + (dy / dist) * step;
      const movedX = isWalkable(world, Math.round(nx), Math.round(p.y), p.layer);
      if (movedX) p.x = nx;
      const movedY = isWalkable(world, Math.round(p.x), Math.round(ny), p.layer);
      if (movedY) p.y = ny;
      if (Math.abs(dx) > 0.01) p.facing = dx >= 0 ? 1 : -1;
      // Heading follows the walk itself, not just the tap that started it, so
      // rounding a corner re-aims the shovel without a second tap.
      p.heading = headingOf(dx, dy);
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

  // And the board may have a card to put up. Same reasoning as the arrival
  // above and the same safety: due-ness is two timestamps compared, so asking
  // every tick costs nothing and two days away yields one request, not twelve.
  //
  // The stream is seeded from the world and from WHEN THE BOARD LAST WENT
  // QUIET, rather than from a stream carried in the save. That keeps the sim
  // deterministic (CLAUDE.md §Architecture) without adding an rng cursor to the
  // schema, and it means a given board-quiet moment always produces the same
  // card — replaying a tick can't reroll the request into a better one.
  if (errandDue(world, now)) {
    postErrand(world, now, makeRng(world.seed ^ world.errands.lastClosedAt));
  }

  // And you may have just walked into somebody's front room. Silent by design —
  // he is undocumented, so meeting him is seeing him (sim/mole.ts).
  meetMole(world, now);

  // The same three lines for the two secrets above ground, and they are three
  // separate calls rather than one `meetSecrets` because each carries its own
  // condition and they share nothing but the shape: the rock, the dark, and
  // five nights of the year.
  meetGhost(world, now);
  meetCosmos(world, now);
  // And once met, she is wherever the calendar says — your homestead on one of
  // the five nights, her own place in the sky on all the others (sim/cosmos.ts).
  updateCosmos(world, now);

  // And you may have just noticed something (Phase 9c). Throttled, unlike every
  // due-check above it: those compare two timestamps, and this walks a table of
  // predicates that ask about biomes, water and found sites — cheap
  // individually, not cheap sixty times a second. None of them can change
  // between one frame and the next, because all of them are about where you are
  // standing and you cannot cross a tile in a sixtieth of a second.
  //
  // Nothing is stored to make this work. `lastNoticeSweep` is in-memory only,
  // like the undo buffer and the rooms cache — losing it on reload costs one
  // extra sweep.
  if (now - lastSweep(world) >= NOTICE_SWEEP_MS) {
    setLastSweep(world, now);
    sweepNoticed(world, now);
    // And whether the world is in a shape worth remembering, which rides the
    // same throttle for the same reason: its predicates are about the calendar,
    // the hour and where you are standing, and none of those can change between
    // one frame and the next. Writes nothing you can see — a Moment surfaces
    // later, in somebody's line, or not at all (DESIGN §Moments).
    sweepMoments(world, now);
  }

  // And you may be standing in front of the Cube. There is nothing to meet —
  // it is a landmark and not a person — so the only thing that happens is that
  // whoever came with you now remembers coming. `onlyPresent`, like the tunnel:
  // the town does not get told about the cube, because a town that talks about
  // a secret has been told about it by the game.
  if (world.player.layer === "surface") {
    const c = cubeSite(world.seed, world.homestead.spot);
    if (Math.hypot(world.player.x - c.x, world.player.y - c.y) <= CUBE_EARSHOT) {
      // Only when somebody here hasn't got it yet, and that guard is not a
      // micro-optimisation — it is a bug fix. This runs EVERY FRAME while you
      // stand in front of the Cube, and `witness` befriends everyone present
      // unconditionally, so a companion walked all the way out here used to gain
      // a point of friendship sixty times a second and peg at the maximum in
      // about two seconds. The longest walk in the game was also the only
      // friendship faucet in it.
      //
      // `remember` was already idempotent for `hum` (it is a one-shot), so the
      // MEMORY was always right and only the friendship leaked — which is why
      // nothing caught it: every test here asserts on the log. The walk still
      // pays its one point, to whoever came, once.
      if (someoneHereLacks(world, "hum", now)) witness(world, "hum", undefined, now, true);
    }
  }

  // And whoever is with you may have reached the end of their own day. Derived
  // from the clock like everything else here, so an absence can't leave somebody
  // trailing you for two days: the hour is the hour whether or not you were
  // watching. The UI notices the slot going empty and says the goodbye.
  updateCompany(world, now);

  for (const v of world.villagers) tickVillager(world, v, dt, now);
  updateAllCrops(world, now);
  updateRegrowth(world, now); // the woods come back on the real clock
  updateReclaim(world, now); // and the grass closes over what you dug
}

/** Which finish classes a build tool may wear. One question asked in one place,
 *  because the picker and the cost rule both need the same answer and a second
 *  copy of this switch would be the thing that drifts. */
export function toolFinishes(tool: BuildTool): SkinClass[] {
  if (tool === "floor") return FLOOR_BUILD.finishes;
  if (tool === "erase") return [];
  if (isFurnitureTool(tool)) return furnitureDef(tool).finishes;
  return structureDef(tool).finishes;
}

/** The finish a tool is currently loaded with, guarded.
 *
 *  Guarded because `world.skins.selected` is a Partial keyed by tool and can go
 *  stale in two ways a save will eventually see: a tool the player never
 *  dressed has no entry at all, and an entry can name a finish that no longer
 *  applies (a def's `finishes` list narrowed) or was never unlocked (a hand-
 *  edited save). Both fall back to the default for the tool's first class
 *  rather than throwing — a wrong colour is recoverable, a crash on load is
 *  not. */
export function loadedFinish(world: WorldState, tool: BuildTool): SkinId {
  const classes = toolFinishes(tool);
  const chosen = world.skins.selected[tool];
  if (
    chosen &&
    classes.includes(skinDef(chosen).applies) &&
    world.skins.unlocked.includes(chosen)
  ) {
    return chosen;
  }
  return defaultSkin(classes[0] ?? "wood");
}

/** The finish already worn by whatever this tool would replace here, or null if
 *  there is nothing of the tool's own kind on this cell.
 *
 *  This is what makes re-finishing distinguishable from building, and it only
 *  answers for the two things that are SURFACES — a floor and a wall. Furniture
 *  is deliberately excluded: a piece occupies several cells from one anchor, so
 *  "the chair already here" is a question about the anchor rather than the cell
 *  you tapped, and placement onto an occupied cell already refuses. Re-finishing
 *  a chair means taking it back and putting it down again, which costs nothing
 *  because erase refunds. */
function existingFinish(world: WorldState, tool: BuildTool, x: number, y: number): SkinId | null {
  if (tool === "floor") return tileAt(world, x, y) === FLOOR ? floorFinish(world, x, y) : null;
  if (tool === "wall" || tool === "door") {
    const cell = world.build[tileKey(x, y)];
    return cell && cell.id === tool ? cell.finish : null;
  }
  return null;
}

/** Where to go and get the thing you are short of.
 *
 *  The shortfall message has always ended in a signpost rather than a refusal —
 *  "You'd need 2 wood. There are trees." — and once a wall can be flagstones,
 *  a hardcoded mention of trees starts pointing at the wrong half of the map.
 *  Keyed by the item because the item is what you are short of; the fallback is
 *  silence rather than a guess, since a wrong direction is worse than none. */
function whereToFind(need: Partial<Record<ItemId, number>>): string {
  const WHERE: Partial<Record<ItemId, string>> = {
    wood: "There are trees.",
    stone: "There are rocks.",
    ore: "There is ore in the deep rock.",
    cloth: "The Menace sells cloth.",
  };
  for (const id of Object.keys(need) as ItemId[]) {
    const line = WHERE[id];
    if (line) return line;
  }
  return "";
}

/** What a build tool costs to apply IN A GIVEN FINISH.
 *
 *  The finish is an argument rather than something this reads off the world,
 *  and that is the cost-follows-material rule made unavoidable (DESIGN
 *  §Materials): a wall in pine costs wood and a wall in slate costs stone, so
 *  there is no price to quote until you know which was asked for. A caller that
 *  wants "what the player is about to spend" passes `loadedFinish(world, tool)`.
 *
 *  Erase is free and refunds; it wears no finish and has no price to name. */
export function buildCost(tool: BuildTool, finish: SkinId): Cost {
  if (tool === "erase") return {};
  const price =
    tool === "floor"
      ? FLOOR_BUILD.cost
      : isFurnitureTool(tool)
        ? furnitureDef(tool).cost
        : structureDef(tool).cost;
  return priceItems(price, skinDef(finish).applies);
}

export type ActionKind =
  | "dig"
  | "gather"
  | "plank"
  | "plant"
  | "water"
  | "harvest"
  | "read"
  | "letter" // a mailbox in the middle of nowhere, and what was in it today
  | "remember" // a house, asked at its own door what has happened inside it
  | "strike" // your own tent, taken down, once you have somewhere better
  | "sink" // the second dig on one tile: a way down
  | "carve" // cutting the rock face ahead of you
  | "shaft" // going down, or coming back up
  | "stair" // going up the one staircase that goes anywhere, or coming back down
  | "none";
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
  kind:
    | "harvest"
    | "gather"
    | "tool"
    | "read"
    | "letter"
    | "remember"
    | "strike"
    | "shaft"
    | "stair"
    | "none";
}

/** Where ACT will land, decided in ONE place so the reticle the player sees and
 *  the tile the button touches can never disagree. The renderer draws this and
 *  `contextAction` executes it; anything that changes the precedence below
 *  changes both at once, which is the point.
 *
 *  Precedence, and why:
 *   1. A ripe crop underfoot — the ripe carrot is always one tap away, whatever
 *      tool is held.
 *   1b. Water ahead of the shovel, chosen by HEADING — the one step that had to
 *      go above the tile underfoot, because the ground you stand on to fill
 *      water is sand and sand is diggable. See the comment at the call.
 *   2. The gather tool means the node in reach, since nodes are SOLID and you
 *      can never stand on one (see nodeNear): "the tile underfoot" can never
 *      reach a tree. UNLESS underfoot is itself gatherable — a mushroom, or
 *      something the Gremlin left — because those two are picked up rather than
 *      felled, and this step's own justification does not cover them.
 *
 *      That exception was missing for a long time and cost nothing until the
 *      water pass moved the terrain under an away-sim test: standing ON a junk
 *      pile with the gather tool, with a tree that happened to be beside you,
 *      chopped the tree. Which is step 3's hijack exactly, one step early.
 *   3. The held tool on the tile underfoot, when it would actually do something.
 *      Deliberately ahead of the node: a tree beside you must never hijack a
 *      deliberate act, or you couldn't till the ground at the forest edge.
 *   4. Otherwise a node in reach — the phone-friendly shortcut, which only ever
 *      fires when the held tool had nothing to do anyway.
 *   5. Otherwise the errands board in reach.
 *
 *  READING IS LAST, and that placement is the argument for it being safe. The
 *  board stands on the plaza: there is no crop on paving, no node on paving, and
 *  no tool that applies to it, so by the time the ladder reaches step 5 every
 *  other branch has already declined. It therefore cannot hijack a deliberate
 *  act — which is the exact failure step 3's comment was written about — and the
 *  reticle still promises precisely what ACT will do. */
export function actionTarget(world: WorldState, tool: Tool): ActionTarget {
  const { x, y } = playerTile(world);
  if (world.player.layer === "under") return undergroundTarget(world, tool, x, y);
  if (world.player.layer === "sky") return skyTarget(world, x, y);

  if (isRipe(world, x, y)) return { x, y, kind: "harvest" };

  // The way UP, and it goes here for the mailbox's reason rather than the
  // shaft's — above the tool underfoot, because out there you are always
  // standing on grass and grass is always diggable, so the shovel would win
  // every time and the one staircase in the world that goes anywhere could never
  // be climbed with the tool the game starts you holding (Phase 7b's lesson,
  // relearned before it could be made again).
  //
  // The cost is the same small one the mailbox pays: standing at the foot of the
  // real staircase and facing it, you cannot dig that tile. Facing any other
  // flight of steps in the world, you still can — this branch declines, because
  // there is nothing up there to go to.
  // ANY flight of steps claims the button, not only the one that works.
  //
  // It used to be `climbTarget` alone, so a decoy left the tile to the held tool
  // and pressing ACT at the foot of one dug the grass you were standing on. That
  // is indistinguishable from the button being broken, and it was reported as
  // exactly that. The secret is "find out by trying" (DESIGN §The sky) — so
  // trying has to be a thing the button lets you do, and it has to be the same
  // gesture at both kinds or the affordance itself gives the answer away.
  //
  // The cost noted above now applies to every staircase rather than one: facing
  // any steps, you cannot dig the tile you are on. That is the smaller price —
  // there is a great deal of grass and very few staircases.
  const steps = stepsAhead(world);
  if (steps) return { ...steps, kind: "stair" };

  // The way down, and it can sit this high in the ladder safely. A shaft cell
  // holds nothing else by construction: `canSink` refuses a cell with a crop, a
  // built piece or furniture on it, and no tool applies to a shaft. So there is
  // never anything else competing for this tile, and putting it above the node
  // shortcut means a tree beside the hole can't hijack the step down.
  if (tileAt(world, x, y) === SHAFT) return { x, y, kind: "shaft" };

  // Deep water AHEAD, for the shovel. Two decisions here, and they're the same
  // two the underground pick made (see undergroundTarget), for the same reasons:
  //
  //  IT IS CHOSEN BY HEADING, not by a fallback search over the neighbours. The
  //  tree answer — try every side, take the first — is wrong at a shoreline for
  //  exactly the reason it's wrong in a tunnel: standing in a cove with water on
  //  three sides, it would fill a tile you didn't mean, and terraforming would
  //  stop being something you steer.
  //
  //  IT SITS ABOVE THE TILE UNDERFOOT, which is the one place this ladder's
  //  usual precedence had to give. The ground at a shoreline is SAND, and sand
  //  is diggable — so with underfoot winning, the shovel at the water's edge
  //  would turn the beach over forever and could never once reach the sea. The
  //  water would be unfillable in precisely the place you'd stand to fill it.
  //  Heading is what makes that safe: face the water and you fill it, turn
  //  around and you dig the shore, and the reticle says which before you tap.
  if (tool === "dig" && world.player.layer === "surface") {
    const ahead = aheadOf(world);
    if (canFill(world, ahead.x, ahead.y)) return { ...ahead, kind: "tool" };
  }

  // A mailbox beside you, ABOVE the tool underfoot (Phase 7b).
  //
  // IT WAS LAST, AND LAST MEANT NEVER. The ladder's usual rule is that a thing
  // beside you must not hijack the tool underfoot — that is why a tree can't steal
  // a tap from the shovel — and the mailbox was put at the bottom for exactly that
  // reason. On screen it meant walking to a mailbox, pressing ACT and DIGGING A
  // HOLE: out there you are always standing on grass, grass is always diggable, so
  // the shovel always won and the letter could not be read at all with the tool the
  // game starts you holding. The errands board has the same precedence and gets
  // away with it only because it stands on plaza stone, which no tool touches.
  //
  // So it sits above the tool, on the shaft's argument rather than the tree's:
  // nothing else is competing for this cell. The cost is real and small — you
  // cannot dig or till the four tiles around a mailbox while you're standing on
  // them — and it is the right way round. Somewhere you cannot till is a curiosity;
  // a letter nobody can open is a feature that does not exist.
  const box = mailboxNear(world, x, y);
  if (box) return { x: box.x, y: box.y, kind: "letter" };

  // A door beside you, and a room behind it with something to say (Phase 9a).
  //
  // ABOVE THE TOOL, on the mailbox's argument one screen up — and it is here
  // because the version BELOW the tool was built, driven in a browser, and
  // failed in precisely the way that comment predicts. A doorstep is grass,
  // grass is always diggable, so the shovel won every tap and a house could
  // never be asked anything at all. "Somewhere you cannot till is a curiosity;
  // a letter nobody can open is a feature that does not exist" applies word for
  // word to a room nobody can ask.
  //
  // It is cheaper than the mailbox, though, because it can DECLINE: a door only
  // offers this when its room actually remembers something. A house that has
  // seen nothing costs its own doorstep nothing.
  //
  // Deliberately not gated on WHOSE house it is. Standing at the town hall and
  // hearing that this is where you first met the Office Creature is the same
  // feature; a rule that only your own buildings remember would be the game
  // deciding which parts of the town are yours.
  const door = doorNear(world, x, y);
  if (door) return { x: door.x, y: door.y, kind: "remember" };

  // Your own tent, underfoot, once there is a bed of yours to go to.
  //
  // ABOVE THE TOOL, on the mailbox's argument two screens up: the homestead
  // origin is grass, grass is always diggable, so with the shovel winning the
  // tent could never be struck with the tool the game starts you holding.
  //
  // The cost the mailbox pays is smaller here than anywhere, because this
  // branch DECLINES until the day it matters: it needs the tent to be up and a
  // qualifying bed of your own to exist. Until then the origin tile is as
  // diggable as any other, and afterwards the tent is gone and it is again.
  if (canStrikeTent(world, x, y)) return { x, y, kind: "strike" };

  const near = nodeNear(world, x, y, world.player.facing);
  const underfoot = toolApplies(world, tool, x, y);
  if (near && tool === "gather" && !underfoot) return { x: near.x, y: near.y, kind: "gather" };
  if (underfoot) return { x, y, kind: "tool" };
  if (near) return { x: near.x, y: near.y, kind: "gather" };

  const board = boardNear(world, x, y);
  if (board) return { x: board.x, y: board.y, kind: "read" };

  return { x, y, kind: "none" };
}

/** Is the player standing on their own tent, with somewhere better to sleep?
 *
 *  The check is deliberately in the same shape as the RENDER gate, and the two
 *  read the same two facts in the same order — a reticle that offered to strike
 *  a tent that isn't drawn, or declined to strike one that is, would be the
 *  reticle lying (ROADMAP §"The reticle is the promise").
 *
 *  `struckAt` is not re-offered once set. If you demolish your house the tent
 *  comes back on its own; it goes again when the house does, and being asked to
 *  confirm a decision you already made would be the game forgetting it. */
export function canStrikeTent(world: WorldState, x: number, y: number): boolean {
  if (world.player.layer !== "surface") return false;
  if (world.homestead.struckAt !== null) return false;
  if (x !== world.homestead.originX || y !== world.homestead.originY) return false;
  return playerHome(world) !== null;
}

/** A door on one of the four tiles around you whose room has a history — same
 *  shape as `boardNear` and `mailboxNear`, which have the same problem: a door
 *  is solid, so it can never be the tile underfoot.
 *
 *  The door's OWN cell is the right thing to ask about: `roomRemembers` reads
 *  interior and shell alike (sim/history.ts), and a door is shell, so it
 *  resolves to the room it lets you into without anybody here having to work
 *  out which side of it the inside is on. */
function doorNear(world: WorldState, x: number, y: number): { x: number; y: number } | null {
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (structureAt(world, nx, ny)?.id !== "door") continue;
    if (!roomRemembers(world, nx, ny)) continue;
    return { x: nx, y: ny };
  }
  return null;
}

/** A mailbox on one of the four tiles around you. It is solid, so it can never be
 *  underfoot — same shape as `boardNear`, which has the same problem. */
function mailboxNear(world: WorldState, x: number, y: number): { x: number; y: number } | null {
  for (const [nx, ny] of [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ]) {
    if (tileAt(world, nx, ny) === MAILBOX) return { x: nx, y: ny };
  }
  return null;
}

/** WHICH mailbox this is — its index out from the datum, which is the only name a
 *  thing nobody has ever named can have. Null if the tile is a mailbox that is not
 *  a found place, which cannot currently happen and is not worth a crash if it
 *  ever does. */
function mailboxSiteAt(world: WorldState, x: number, y: number): number | null {
  const site = foundAt(world.seed, world.homestead.spot, x, y);
  return site && site.kind === "mailbox" ? site.index : null;
}

/** Where ACT lands underground. A short ladder, because the lower layer is a
 *  short place: there is nothing planted, nothing built and nobody living there
 *  (yet), so the only two questions are "am I standing on the way up" and "is
 *  there rock in front of me".
 *
 *  Every read of the GROUND here passes "under". That is the whole point of the
 *  branch: the surface tile at this coordinate is a different tile, and a
 *  reticle that quietly promised the ground above would be the largest possible
 *  version of the reticle lying (ROADMAP §"The reticle is the promise").
 *
 *  The one exception is the shaft, and it is the same exception `canAscend`
 *  makes for the same reason: a shaft is stored ONCE, on the surface, so "is
 *  there a way up here" is asked of the top from either end and cannot disagree
 *  with itself.
 *
 *  The rock is chosen by HEADING and never by a fallback search. Underfoot can
 *  never be rock — it's solid, so you can only stand in space you already cut —
 *  which is the same problem trees have, but the tree answer (try every
 *  neighbour, take the first) is wrong here: surrounded by rock on three sides,
 *  it would cut a wall you didn't mean and tunnelling would stop being
 *  something you steer.
 *
 *  A vein ahead of you reads "gather", and it does so for the SHOVEL as well as
 *  for the gather tool. Down here the shovel is a pick, and rock and ore are
 *  met at the same face in the same swing — making you stop and switch tools at
 *  a vein would break the one continuous verb the tunnel has, for a distinction
 *  only the code cares about. It is the same argument that let the second dig
 *  on a tile become a shaft: no new tool, no new button. */
function undergroundTarget(world: WorldState, tool: Tool, x: number, y: number): ActionTarget {
  if (tileAt(world, x, y) === SHAFT) return { x, y, kind: "shaft" };
  // The tool is consulted, not assumed. Lighting the rock face while the
  // watering can is out would promise a cut that ACT is not going to make.
  const ahead = aheadOf(world);
  if (tool !== "dig" && tool !== "gather") return { x, y, kind: "none" };
  if (nodeAt(world, ahead.x, ahead.y, "under")) return { ...ahead, kind: "gather" };
  if (tool === "dig" && canCarve(world, ahead.x, ahead.y)) return { ...ahead, kind: "tool" };
  return { x, y, kind: "none" };
}

/** ACT in the sky, and it is three lines because there are three lines' worth of
 *  things to do up there.
 *
 *  The tool is not consulted at all, and that is the difference between this and
 *  the tunnel: down there the shovel becomes a pick and the ladder has to say
 *  which verb is on offer, while up here NO tool applies to anything, ever
 *  (DESIGN §The sky — you visit, you do not reshape). Holding the watering can
 *  on the head of the steps still offers you the steps, because the steps are
 *  the only thing there is.
 *
 *  It also means the reticle spends most of its time in the sky saying "nothing
 *  will happen here", which is honest: the plane is somewhere to walk and look
 *  from, and the game should not pretend otherwise by lighting up. */
function skyTarget(world: WorldState, x: number, y: number): ActionTarget {
  if (tileAt(world, x, y, "sky") === SKY_STAIR) return { x, y, kind: "stair" };
  return { x, y, kind: "none" };
}

/** The context action button: does whatever `actionTarget` is pointing at. */
export function contextAction(world: WorldState, tool: Tool, now: number): ActionResult {
  const target = actionTarget(world, tool);

  if (target.kind === "harvest") {
    // `harvest` pays out the produce AND a seed itself — the cost of sowing and
    // the return on pulling are one rule and live together (see its docblock).
    const def = harvest(world, target.x, target.y, now)!;
    // The kind is the ACT and the value is the crop — one kind covering all
    // eight, the same split as seed-the-item versus variety-the-look.
    //
    // It was `harvested_carrot` until v30, named after the crop the slice
    // shipped and outliving it by seven varieties. The note here used to argue
    // the rename was not worth a migration because no player ever sees the
    // string, which was true and beside the point: the next person to read the
    // union sees it, and a kind that names a crop it no longer means is how
    // somebody eventually writes the carrot branch that shouldn't exist.
    witness(world, "harvested", def.carried, now, false, target);
    return {
      kind: "harvest",
      changed: true,
      // Per variety, because "You pulled a wheat" is not a sentence — see
      // CropDef.harvestLine.
      message: def.harvestLine,
    };
  }

  if (target.kind === "gather") {
    // Underground the same reticle means the ore in front of you, and the verb
    // routes through mineVein because depth pays out as well as the ore does.
    if (world.player.layer === "under") {
      const got = mineVein(world, target.x, target.y, now)!;
      witness(world, "gathered", undefined, now, true);
      // Witnessed by whoever is actually standing in the tunnel, and by nobody
      // else. This used to take no memory at all, because there was nobody down
      // here to take one and the town hearing about it would have been the log
      // inventing an audience. Company is what made the honest version possible
      // (see `witness`): if you brought someone, they saw you do this.
      return {
        kind: "gather",
        changed: true,
        message: got.foundSlate
          ? "Under the metal, rock that splits in flat grey sheets. Slate. Nobody down here to tell."
          : `${nodeDef(got.node).line} ${itemLabel(got.item, got.amount)}.`,
      };
    }
    const got = gather(world, target.x, target.y, now)!;
    witness(world, "gathered", undefined, now, false, target);
    return {
      kind: "gather",
      changed: true,
      // The dark wood gets a sentence about the WOOD, not about an unlock —
      // slate's shape exactly. "You have unlocked Dark walnut" is the toast a
      // secret is not allowed to have; the picker having a new colour in it is
      // how you find out, if you look.
      message: got.foundWalnut
        ? "The grain runs almost black. It is the same wood. It is not the same wood."
        : `${nodeDef(got.node).line} ${itemLabel(got.item, got.amount)}.`,
    };
  }

  if (target.kind === "shaft") {
    // Which way you go is not a choice the button offers — you can only leave a
    // hole the way you didn't come. `useShaft` reads the layer and does the
    // only available one.
    const down = world.player.layer === "surface";
    useShaft(world);
    return {
      kind: "shaft",
      changed: true,
      // "Up. The sky is where you left it." was the line here for three phases,
      // and the sky is now somewhere you can be, which makes it a joke with a
      // wrong answer in it. What it was actually saying is that nothing changed
      // while you were down there, so it says that.
      message: down ? "Down. The air goes cool and stops moving." : "Up. Everything is where you left it.",
    };
  }

  if (target.kind === "stair") {
    // Same shape as the shaft, same reason: the button offers no choice of
    // direction, because there is only ever one to go in.
    const up = world.player.layer === "surface";
    if (!useStair(world)) {
      // A flight that goes nowhere. It says what it is and changes nothing —
      // no memory, no journal entry, nothing stored. You looked at some steps.
      const site = foundAt(world.seed, world.homestead.spot, target.x, target.y);
      if (site && site.kind === "stair") {
        return { kind: "stair", changed: false, message: stairNote(world.seed, site.index) };
      }
      return { kind: "none", changed: false, message: "" };
    }
    return {
      kind: "stair",
      changed: true,
      // Neither line says what the steps are, where they go, or that you have
      // found anything. You climbed some stairs and now you are somewhere else;
      // the game does not congratulate you, and there is no toast (DESIGN §Tone
      // — secrets are never spoiled by UI).
      message: up
        ? "Up the steps. And then up the steps."
        : "Down. The grass comes back up to meet you.",
    };
  }

  if (target.kind === "letter") {
    // Nothing is taken and nothing is stored. The box holds what it holds today
    // (content/found.ts §letterFor), reading it again reads the same line, and an
    // empty box is the common case on purpose — a box with a letter every day is
    // a collection route (DESIGN §Found places).
    const site = mailboxSiteAt(world, target.x, target.y);
    const letter = site === null ? null : letterFor(world.seed, site, dayNumber(now));
    return {
      kind: "letter",
      changed: false,
      // The empty line is deadpan on purpose and is NOT a failure: you looked, it
      // was empty, that is what usually happens to a box in a field.
      message: letter ?? "Empty. The little door swings.",
    };
  }

  if (target.kind === "read") {
    // The sim's part is over here. Reading changes nothing — it opens a panel,
    // which is the UI's business (ui/app.ts watches for this kind), and the
    // message is the fallback for anywhere that only has a line to show.
    return { kind: "read", changed: false, message: "Notices, and one request." };
  }

  if (target.kind === "strike") {
    // The one thing you own at the start of the game, folded up, because you
    // finally have a roof. Nobody stamps this and no form records it: every
    // other tent in town goes when the Office Creature signs a commission off,
    // and there is no commission for the person who was already here.
    //
    // It is not destroyed and nothing is spent. `struckAt` says you asked; the
    // world still decides whether you have anywhere else to be, so if the house
    // comes down the tent is back up and this is offered again from scratch.
    if (!canStrikeTent(world, target.x, target.y)) {
      return { kind: "none", changed: false, message: "" };
    }
    world.homestead.struckAt = now;
    return {
      kind: "strike",
      changed: true,
      message: "Folded, and put somewhere. You live in the house now.",
    };
  }

  if (target.kind === "remember") {
    // Nothing moves. A room reading its own past is the one action in the game
    // that is purely a read — no item, no unlock, no friendship, and nothing
    // recorded about having read it. There is no "you have heard this" flag,
    // because a flag is what a checklist is made of.
    //
    // The line comes back through `message` and lands in the ordinary flash,
    // which is the whole UI: no panel, no toast, no screen. `historyLine`
    // cannot return null here — the ladder only offered this because
    // `roomRemembers` said yes — but it is typed as if it could, so the
    // fallback is the honest sentence rather than an assertion that stops being
    // true the day somebody demolishes a wall mid-tap.
    const line = historyLine(world, target.x, target.y, now);
    return { kind: "remember", changed: false, message: line ?? "The room keeps its own counsel." };
  }

  // NOT IN THE SKY, and this line is here because a test caught the alternative.
  // `applyTool`'s shovel knows about the tunnel and assumes everything else is
  // the ground: standing on a cloud with the shovel out, ACT reached straight
  // past the layer and dug the field two hundred tiles below — a hole appearing
  // in a meadow nobody was standing in. The reticle already said "none"; this is
  // the ladder's other end agreeing with it.
  //
  // Written as a layer check rather than as a fifth case inside `applyTool`,
  // because the rule is not about the shovel. There is no tool up there at all
  // (DESIGN §The sky), so the refusal belongs where the tools are dispatched
  // from and not inside one of them.
  if (world.player.layer === "sky") {
    return { kind: "none", changed: false, message: "Nothing to do up here. That is rather the point." };
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
      // Three states of the same tile, in order: grass becomes dirt, dirt
      // becomes a way down, and water becomes shore. No two can be true at once
      // (canDig is grass, mushrooms and sand; canSink is dirt; canFill is
      // water), so this is one shovel with three answers rather than a
      // precedence question.
      return canDig(world, x, y) || canSink(world, x, y) || canFill(world, x, y);
    case "gather": {
      // The two gatherables that aren't nodes: a mushroom that came up, and
      // something the Gremlin left. Both are picked up rather than felled.
      const t = tileAt(world, x, y);
      return t === MUSHROOM || t === JUNK_PILE;
    }
    case "plant":
      // canSow, not canPlant: the reticle promises exactly what ACT will do
      // (ROADMAP §"The reticle is the promise"), and with an empty satchel ACT
      // will do nothing. Lighting up plantable ground you can't sow is the same
      // lie the reticle rule was written about, wearing farming's clothes.
      return canSow(world, x, y);
    case "water":
      return canWater(world, x, y);
  }
}

/** Apply the held tool to the tile underfoot. */
function applyTool(world: WorldState, tool: Tool, x: number, y: number, now: number): ActionResult {
  switch (tool) {
    case "dig": {
      // Underground the shovel is a pick, and it cuts the face AHEAD rather
      // than the floor — see undergroundTarget for why x,y is not underfoot.
      // Free, like every other kind of digging (DESIGN §Materials): a tunnel
      // costs time and nothing else.
      if (world.player.layer === "under") {
        // Through carveWithFind rather than carve, for the same reason the
        // surface goes through digWithFind: the deep rock has things in it
        // (DESIGN §Materials) and the cut is what spends the cell, so the
        // payout and the cut are one call and cannot be made out of order.
        const cut = carveWithFind(world, x, y);
        if (cut.carved) {
          // Same rule as the vein above: remembered only by whoever is down here
          // with you. Left uncalled entirely until 4b, because until then the
          // only candidate was the Mole, and he is not the town.
          witness(world, "dug", undefined, now, true);
          return {
            kind: "carve",
            changed: true,
            message: cut.find ?? "The rock comes away in pieces.",
          };
        }
        return { kind: "carve", changed: false, message: "Nothing to cut here." };
      }
      // The second dig on one tile opens the way down (ROADMAP §"A shaft is two
      // digs on one tile"). Tried before digWithFind because digWithFind would
      // otherwise decline the dirt and report nothing to dig — which is what
      // made this gesture free to claim in the first place.
      if (canSink(world, x, y)) {
        sink(world, x, y);
        witness(world, "dug", undefined, now, false, { x, y });
        return { kind: "sink", changed: true, message: "The earth gives, and keeps giving. There's a way down." };
      }
      // Water in, shore out. Before digWithFind for the same reason `canSink`
      // is: digWithFind would decline the water and report nothing to dig.
      //
      // No find, deliberately — junk is what turning over the LAWN turns up
      // (DESIGN §Materials), and a seabed that paid out would make filling the
      // ocean a farm rather than a folly.
      if (canFill(world, x, y)) {
        fill(world, x, y);
        witness(world, "dug", undefined, now, false, { x, y });
        return {
          kind: "dig",
          changed: true,
          message: "The water gives way. Sand, and then more sand.",
        };
      }
      // digWithFind, not dig: the shovel and the ground's contents are one
      // operation, because the payout has to be decided before the dig writes
      // its override (sim/junk.ts explains what splitting them cost).
      const { dug, find } = digWithFind(world, x, y, now);
      if (dug) {
        witness(world, "dug", undefined, now, false, { x, y });
        // The find replaces the usual line rather than joining it. Two toasts
        // for one tap is a queue, and the interesting sentence should not have
        // to wait behind "You turn the earth."
        return { kind: "dig", changed: true, message: find ?? "You turn the earth." };
      }
      return { kind: "dig", changed: false, message: "Nothing to dig here." };
    }
    case "gather":
      // Mushrooms — picked up rather than felled.
      if (tileAt(world, x, y) === MUSHROOM) {
        setTile(world, x, y, GRASS);
        gain(world, "mushroom", 1);
        return { kind: "gather", changed: true, message: "Picked. It comes away cleanly." };
      }
      // And whatever the Gremlin left in the grass. Flavoured at pickup from the
      // same total function of (seed, x, y) the buried finds use, so the thing
      // lying there is a property of WHERE it lies — and then it is simply junk,
      // like everything else he has ever handled (ROADMAP §"Junk — found, never
      // gathered").
      if (tileAt(world, x, y) === JUNK_PILE) {
        setTile(world, x, y, GRASS);
        gain(world, "junk", 1);
        return { kind: "gather", changed: true, message: findLine(world, x, y) };
      }
      return { kind: "gather", changed: false, message: "Nothing to gather here." };
    case "plant": {
      const sown = sow(world, x, y, now);
      if (sown) {
        // The crop rides along as the value, the same way `harvested` carries
        // what you pulled. It used to pass `undefined`, so the town could
        // remember you had planted but never what — a villager could say "you
        // pulled a radish" and, about the act five seconds earlier, only "you've
        // planted". The memory now matches the ground.
        witness(world, "planted", cropDef(sown).carried, now, false, { x, y });
        return {
          kind: "plant",
          changed: true,
          message: `${cropDef(sown).name} seed, planted. Now it needs water.`,
        };
      }
      // Two refusals, because they are two different problems and only one of
      // them is about where you're standing. "Can't plant here" while holding no
      // seed sends you looking for better ground, which you already had.
      return {
        kind: "plant",
        changed: false,
        message: canPlant(world, x, y) ? "No seed in the satchel." : "Can't plant here.",
      };
    }
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

/** What you may build in the rock: a light, and taking it back.
 *
 *  Not a limitation looking for a reason. Walls and floors down here would want
 *  rooms, and rooms want enclosure, roofs and a flood fill through solid stone —
 *  which is a building where a tunnel should be. The rock is not somewhere you
 *  build a room; it is somewhere you install a light (ROADMAP §"Ore's sink").
 *
 *  It lives here rather than in the tool palette, and `buildAt` checks it below,
 *  because the palette and the placement must not each have their own opinion
 *  about what is possible — that is the reticle rule (ROADMAP §"The reticle is
 *  the promise") applied to build mode. ui/app.ts hides the buttons using this
 *  same list; the sim refuses regardless of what the UI shows. */
export const UNDER_TOOLS: BuildTool[] = ["lamp", "erase"];

/** And what you may build in the sky: NOTHING. Not a shortened list — the empty
 *  one. You visit; you do not reshape (DESIGN §The sky), and up there that is
 *  total: no wall, no floor, no lamp, and no erase, because there is nothing to
 *  erase.
 *
 *  WRITTEN AS A TABLE, WHICH IS THE ACTUAL FIX HERE. This used to be
 *  `layer === "under" ? UNDER_TOOLS.includes(tool) : true` — one special case
 *  and an `otherwise, yes`. That reads fine with two layers and is a trapdoor
 *  with three: a layer nobody had thought about got the ENTIRE build palette by
 *  default, and since `world.build` is keyed without a layer, a wall painted in
 *  the sky would have appeared on the ground under it. An allowlist cannot fail
 *  that way — a new layer with no row is a layer you can build nothing on, which
 *  is the safe direction to be wrong in. */
const TOOLS_ON: Record<Layer, BuildTool[] | "all"> = {
  surface: "all",
  under: UNDER_TOOLS,
  sky: [],
};

export function toolAllowedOn(tool: BuildTool, layer: Layer): boolean {
  const allowed = TOOLS_ON[layer];
  return allowed === "all" ? true : allowed.includes(tool);
}

/** Place or remove something, and then pin the ground under whatever that
 *  closed (ROADMAP §Phase 11).
 *
 *  A WRAPPER RATHER THAN A LINE AT EACH `return`, because there are a dozen of
 *  them and the one that gets forgotten is the one that leaves a room generating
 *  its own floor for ever. `changed` is the whole condition: it is already the
 *  signal that the build layer moved, and `freezeBuilt` is idempotent, so the
 *  worst a spurious call does is walk a memoised room list and write nothing.
 *
 *  Furniture counts too, even though a table encloses nothing. Placement bumps
 *  the same revision the rooms cache keys on (§5b), so the list is recomputed
 *  regardless and the extra work here is a map lookup per cell. Paying that to
 *  keep the condition "the build layer changed" — rather than "the build layer
 *  changed in a way I believe affects rooms" — is the same trade `buildRevision`
 *  itself already made, and for the same reason: the narrower rule is the one
 *  that is wrong invisibly. */
export function buildAt(
  world: WorldState,
  tool: BuildTool,
  x: number,
  y: number,
  now: number,
  facing: Facing = "s",
  layer: Layer = "surface",
): BuildResult {
  const res = placeOrRemove(world, tool, x, y, now, facing, layer);
  if (res.changed) freezeBuilt(world);
  return res;
}

function placeOrRemove(
  world: WorldState,
  tool: BuildTool,
  x: number,
  y: number,
  now: number,
  /** Which way a multi-tile piece is turned. Ignored by walls and floors —
   *  orientation is a furniture idea (DESIGN §Structures). */
  facing: Facing = "s",
  /** Which layer the stroke is on. "surface" for everything but the lamp: the
   *  rock is not somewhere you build a room, and ui/app.ts offers no other tool
   *  down there. Reaching this function with a wall and "under" would be a bug
   *  upstream, so the structure paths below simply don't consider it. */
  layer: Layer = "surface",
): BuildResult {
  // The sim's own refusal, not a duplicate of the palette's. The UI hides what it
  // can't offer, and this makes the hiding cosmetic rather than load-bearing: a
  // wall placed underground would key into a record that means the surface.
  if (!toolAllowedOn(tool, layer)) {
    return {
      changed: false,
      // Per layer, because "nothing to put it on but rock" is a sentence about
      // the rock. Up here the refusal is the opposite complaint and has to sound
      // like it: there is nothing to build ON, rather than nothing but.
      message:
        layer === "sky"
          ? "Not up here. There's nothing to put that on at all."
          : "Not down here. There's nothing to put that on but rock.",
      broke: false,
    };
  }
  if (tool === "erase") {
    // Furniture comes up FIRST. It sits inside rooms, so if erase preferred the
    // structure layer you'd take the wall out from behind a shelf you were
    // aiming at.
    // Every refund below is computed from the finish the thing was WEARING, not
    // from the one currently loaded in the bar. Taking down a slate wall has to
    // return stone even if you are holding pine at the time, or erase becomes a
    // way to launder one material into another.
    const piece = removeFurnitureAt(world, x, y, layer);
    if (piece) {
      refund(world.inventory, buildCost(piece.id, piece.finish));
      return { changed: true, message: `${furnitureDef(piece.id).name} taken back.`, broke: false };
    }
    // Underground, furniture is all there is to take back. Everything below this
    // line — structures, shafts, lifted boards — is a surface fact, and a shaft
    // filled in from BELOW would be the player closing the lid over their own
    // head from the wrong side of it.
    if (layer === "under") return { changed: false, message: "Nothing to take back down here.", broke: false };
    const taken = removeStructure(world, x, y);
    if (taken) {
      refund(world.inventory, buildCost(taken.id, taken.finish));
      return { changed: true, message: `${structureDef(taken.id).name} taken back down.`, broke: false };
    }
    // A shaft comes up like anything else you put down. ACT has no undo
    // (ROADMAP §"Undo covers BUILD strokes only") and a hole in the lawn from a
    // mis-tap is the one dug tile that isn't cheap to live with — so the take-it-
    // back verb is the one that takes it back. What you cut underneath stays
    // cut: you are closing the lid, not collapsing the tunnel.
    if (tileAt(world, x, y) === SHAFT) {
      if (!fillShaft(world, x, y)) {
        return { changed: false, message: "Not while you're standing under it.", broke: false };
      }
      return { changed: true, message: "Filled in. The ground closes over it.", broke: false };
    }
    if (tileAt(world, x, y) === FLOOR) {
      const worn = floorFinish(world, x, y);
      setTile(world, x, y, DIRT);
      clearFloorFinish(world, x, y);
      refund(world.inventory, buildCost("floor", worn));
      return { changed: true, message: "Board lifted.", broke: false };
    }
    return { changed: false, message: "Nothing built here.", broke: false };
  }

  // Ground that won't take construction, said BEFORE the price. The three
  // placement gates all refuse this ground on their own (see
  // world.refusesConstruction), so this line isn't the rule — it's the rule
  // being audible. Without it you'd get "Can't put a wall there", which is what
  // we say about a rock, and a player would keep trying.
  //
  // Checked ahead of affordability on purpose: being told what you'd need to
  // buy, for ground that will never accept it at any price, is a worse answer
  // than the truth.
  if (refusesConstruction(world, x, y, layer)) {
    return { changed: false, message: "Not on this ground ... The dark trees were here first.", broke: false };
  }

  const finish = loadedFinish(world, tool);
  const was = existingFinish(world, tool, x, y);

  // Placing the very thing that is already there. Refused rather than charged
  // or witnessed: during a drag you sweep over cells you have already done, and
  // every one of them would otherwise spend material, log a memory and consume
  // a slot in the undo stroke.
  if (was !== null && was === finish) {
    return { changed: false, message: "Already finished that way.", broke: false };
  }

  // The free-refinish rule (DESIGN §Materials). Changing a thing's look within
  // its own material costs nothing, forever, on things already built — that is
  // the free axis, and removing the town-wide selector must not take it away.
  // Across a material it is not a repaint but a rebuild, so it costs the new
  // stuff at full price.
  const refinishing = was !== null && skinDef(was).applies === skinDef(finish).applies;
  const cost: Cost = refinishing ? {} : buildCost(tool, finish);
  if (!canAfford(world.inventory, cost)) {
    const need = shortfall(world.inventory, cost);
    const what = (Object.entries(need) as [ItemId, number][]).map(([id, n]) => itemLabel(id, n)).join(", ");
    return { changed: false, message: `You'd need ${what}. ${whereToFind(need)}`, broke: true };
  }

  if (tool === "floor") {
    if (!placeFloor(world, x, y, finish)) return { changed: false, message: "Can't lay a floor there.", broke: false };
    spend(world.inventory, cost);
    witness(world, "built_floor", undefined, now, false, { x, y });
    return {
      changed: true,
      message: refinishing ? "Refinished." : "A board goes down. The house begins.",
      broke: false,
    };
  }

  // NOTHING SOLID GOES DOWN ON THE TILE YOU ARE STANDING ON.
  //
  // Placement asked the ground about itself and never asked where the player
  // was, so a wall or a table would happily close over your own cell and leave
  // you inside a solid tile with `isWalkable` false in every direction. Erase
  // still reaches it, so it was recoverable — but it reads as the game breaking,
  // and "you can always take it back" is a promise about the arrangement, not a
  // rescue you should need to work out under a wall.
  //
  // A refusal rather than shoving the player aside, matching `fillShaft`, which
  // is the same shape of mistake seen from below and answers it the same way:
  // the world does not move you, it declines. Walling yourself into a 1x1 room
  // is still allowed — that is a room you built, and you can erase your way out
  // of it facing any direction.
  //
  // Solidity is asked of the piece, not assumed from the tool: floors, rugs and
  // cushions are placed under your feet all the time and must stay that way.
  if (standingOn(world, x, y, layer) && placingSomethingSolid(tool)) {
    return { changed: false, message: "Not while you're standing there.", broke: false };
  }

  if (isFurnitureTool(tool)) {
    const def = furnitureDef(tool);
    if (!placeFurniture(world, x, y, tool, facing, finish, layer)) {
      return { changed: false, message: `The ${def.name.toLowerCase()} won't fit there.`, broke: false };
    }
    spend(world.inventory, cost);
    // Present-only underground, for the reason mining and carving are (4b): the
    // town has no business knowing you hung a lamp in a tunnel, but somebody who
    // was standing there watching you do it does.
    // Present-only on any layer that is not the ground: the town hears about
    // what you build in the town, and nobody at all hears about a board laid in
    // a tunnel — or, some day, in the sky.
    witness(world, "built_floor", undefined, now, layer !== "surface", { x, y });
    return { changed: true, message: furnitureFlavour(tool, layer), broke: false };
  }

  const roomsBefore = rooms(world).length;
  if (!placeStructure(world, x, y, tool, finish)) {
    return { changed: false, message: `Can't put a ${structureDef(tool).name.toLowerCase()} there.`, broke: false };
  }
  spend(world.inventory, cost);
  witness(world, "built_floor", undefined, now, false, { x, y });

  // Closing the last gap is the beat: the roof arrives on its own, because it
  // was never something you could buy (DESIGN §Structures).
  if (rooms(world).length > roomsBefore) {
    return { changed: true, message: "It closes. A roof settles over it, like it had been waiting.", broke: false };
  }
  return { changed: true, message: buildFlavour(tool), broke: false };
}

function buildFlavour(tool: "wall" | "door" | "window"): string {
  if (tool === "wall") return "A wall goes up. It holds.";
  if (tool === "door") return "A door. Now it's somewhere you go into.";
  // About the object, not about you (§Tone), and about the one thing a window
  // does that a wall doesn't — which is not "let light in" but "let the room be
  // seen having light in it".
  return "A window. The room can be looked into now, which is most of the point.";
}

/** Deadpan, brief, and about the object rather than about you (§Tone). */
function furnitureFlavour(id: FurnitureId, layer: Layer): string {
  switch (id) {
    case "bed":
      return "A bed. The correct number of beds is now one.";
    case "table":
      return "A table. Things can be put on it. That is what it is for.";
    case "chair":
      return "A chair, facing the way you left it.";
    case "stage":
      // Unreachable — the stage is town furniture and not in the build menu,
      // like the board below it. It is here because this switch is exhaustive
      // over FurnitureId, which is how the compiler tells us about a new row
      // that nobody thought about.
      return "A stage. Something will have to happen on it now.";
    case "shelf":
      return "A shelf. It waits.";
    case "cushion":
      return "A cushion. The floor has been upgraded to a place you can be.";
    case "rug":
      return "A rug. The room stops echoing and starts being a room.";
    // The one line that reads the layer, because it is the one object whose
    // point changes with where you put it. Above ground a lamp is something you
    // will appreciate later; in the rock it is the reason you can see.
    case "lamp":
      return layer === "under"
        ? "A lamp, in the rock. The dark gives some ground back."
        : "A lamp. Nothing yet. Ask it again this evening.";
    // The board is town furniture and not for sale (content/furniture.ts), so
    // this line is unreachable in practice — it exists because the switch is
    // exhaustive over FurnitureId and an exhaustive switch is how a new row
    // becomes a compile error instead of a silent blank.
    case "noticeboard":
      return "A board, for notices. It is not yours, and it is already up.";
    // --- The furnishing pass. Same rules: about the object, never about you,
    // and one idea each. A line that needs two sentences to land usually wanted
    // to be a different object.
    case "stool":
      return "A stool. A chair that gave up on the whole back question.";
    case "bench":
      return "A bench. Seats several, or one person several times.";
    case "sofa":
      return "A sofa. It has an opinion about how long you meant to stay.";
    case "coffeetable":
      return "A coffee table. Too low to eat at, too large for nothing. Correct.";
    case "desk":
      return "A desk. Paperwork will find it. Paperwork finds everything.";
    case "nightstand":
      return "A nightstand. For whatever has to be within reach of unconscious.";
    case "cot":
      return "A cot. It folds, which is the entirety of its argument.";
    case "wardrobe":
      return "A wardrobe. Taller than you. So is most furniture, in fairness.";
    case "chest":
      return "A chest. Shut. It arrived that way and has not been asked.";
    case "dresser":
      return "A dresser. Drawers, stacked, which is the whole of the idea.";
    case "painting":
      return "A painting. The wall has stopped being just a wall.";
    case "desklamp":
      return layer === "under"
        ? "A desk lamp, in the rock. Small, and enough."
        : "A desk lamp. One corner of the evening, argued with.";
  }
}

/** How close a villager must be to count as having done it *with* you. */
const TOGETHER_RADIUS = 4;

/** How close YOU have to be to the Cube for it to count as having been there.
 *  Tighter than the hum carries (ui/app.ts, twelve tiles) on purpose: hearing it
 *  from across a field is not the same as having stood in front of it, and the
 *  memory is about the standing. */
const CUBE_EARSHOT = 3;

/** Is there anybody standing with you who does not already remember this?
 *
 *  For the one `witness` call site that fires on a CONDITION rather than on an
 *  action — standing near the Cube is a place you are, not a thing you did, so
 *  it is true for as long as you stand there. `witness` is built for the other
 *  shape: it pays friendship every time it is called, which is right for an act
 *  somebody watched and wrong for a fact that stays true.
 *
 *  sim/moments.ts hit the same wall from the other side and answered it by not
 *  calling `witness` at all. This one still should — the walk out to the Cube IS
 *  something you did together, and it should warm whoever came — so it asks
 *  first instead. */
function someoneHereLacks(world: WorldState, kind: MemoryKind, now: number): boolean {
  const p = world.player;
  return world.villagers.some(
    (v) =>
      present(v, now) &&
      (v.layer ?? "surface") === p.layer &&
      Math.hypot(v.x - p.x, v.y - p.y) <= TOGETHER_RADIUS &&
      !hasMemory(v.memory, kind),
  );
}

/** Broadcast a witnessed event to the town's memory logs. Everyone hears about
 *  it (news travels in a town this small), but anyone who was actually STANDING
 *  THERE also warms to you a little — friendship grows through doing things
 *  together, not only through gifts (DESIGN §"Company"). Dialogue only surfaces
 *  a memory if that villager's bank has a line for it.
 *
 *  `onlyPresent` narrows the MEMORY to the same people the friendship already
 *  went to, and it is the proximity model 4a left open (ROADMAP: "mining and
 *  carving still call no `witness`, so a player who only mines earns no
 *  memories"). Underground work took no memory at all rather than take a false
 *  one — a town remembering a hole it cannot visit would be the log inventing an
 *  audience — and the reason that could not be fixed then was that there was
 *  nobody down there to remember it instead.
 *
 *  Now there can be. A companion in the tunnel is somebody who was actually
 *  there, so the cut is written to them and to nobody else. That is also the
 *  answer to the general version of the question, and it is deliberately NOT
 *  applied to the surface: news genuinely does travel in a town this small, and
 *  a village where nobody hears you built a floor unless they saw it would be a
 *  quieter, worse place than this one. Proximity is what a tunnel needs, not
 *  what the town needs. */
function witness(
  world: WorldState,
  kind: MemoryKind,
  value: string | undefined,
  now: number,
  onlyPresent = false,
  where?: { x: number; y: number },
): void {
  const p = world.player;
  // The ground was there too (DESIGN §"A place keeps a history").
  //
  // `where` IS THE TILE THAT CHANGED, AND IT IS NOT THE PLAYER. Everything else
  // in this function is about who was standing near YOU, because friendship is
  // about company. A place memory is about the ground, and in build mode the
  // ground you are editing can be most of a screen away — tap places and drag
  // paints a run (DESIGN §Structures). Anchored to the player, flooring a house
  // while standing in the garden would file "you laid these boards" in the
  // garden, and the room would never say the one line it exists to say. Callers
  // that have a target tile pass it; the few that genuinely happen underfoot
  // fall back to the player.
  //
  // Surface only: rooms are built out of `world.build`, which exists on one
  // layer, so an entry at (x, y) underground would be read back as something
  // that happened in the room standing at (x, y) above it. A tunnel is not a
  // room.
  if (p.layer === "surface" && isWorkPlace(kind)) {
    const at = where ?? { x: Math.round(p.x), y: Math.round(p.y) };
    world.places = rememberPlace(world.places, { kind, x: at.x, y: at.y, at: now });
  }
  for (const v of world.villagers) {
    // Somebody who is not HERE cannot have seen anything, and by 4c that is a
    // real state rather than a philosophical one: the Ghost stands at a fixed
    // coordinate in the grove all day and is only there after dark
    // (sim/presence.ts). Without this, felling her trees at noon in an empty
    // clearing would warm somebody who was not in it.
    if (!present(v, now)) continue;
    const here = (v.layer ?? "surface") === p.layer && Math.hypot(v.x - p.x, v.y - p.y) <= TOGETHER_RADIUS;
    if (!onlyPresent || here) v.memory = remember(v.memory, { kind, at: now, value });
    // Standing THERE means standing there. A coordinate means two places now,
    // so distance alone is not enough: without this, working in a tunnel would
    // warm whoever happened to be walking across the field above you, through
    // the ground, having seen nothing.
    //
    // Asked as "are we on the same layer" rather than "is the player on the
    // surface", which is what it used to say. That was true while everybody
    // lived up here, and stopped being true when the Mole moved in — he stands
    // under a fixed coordinate, so a player digging a shortcut down to him and
    // then working on the lawn ABOVE his chamber would have warmed him through
    // the ceiling.
    if (here) befriend(v, 1);
  }
}

/** Talk to a villager: a line (memory-aware) plus a nudge of friendship.
 *
 *  Takes `now` because one voice in the game depends on the date — the Stray
 *  Cosmos speaks about the shower that is actually happening (content/showers.ts
 *  is the real calendar). Threaded rather than read off the clock inside sim,
 *  which is the rule the whole layer keeps (CLAUDE.md §Architecture) and the
 *  only reason her five nights are testable without waiting for August. */
export function talk(world: WorldState, id: CharId, rng: Rng, now: number): Speech | null {
  const v = world.villagers.find((w) => w.id === id);
  if (!v) return null;
  // Where you first met them. `rememberPlace` keeps only the first per person,
  // so this fires on every conversation and records exactly one — the check
  // lives in the log rather than here, because "have we met" is a fact about
  // the log and duplicating it at the call site is how the two drift.
  //
  // Their coordinate, not yours: you are standing in the doorway as often as
  // not, and a doorway is in the wall rather than in the room (sim/rooms.ts
  // §roomAt). The room where you met them is the room THEY were in.
  if (world.player.layer === "surface" && (v.layer ?? "surface") === "surface") {
    world.places = rememberPlace(world.places, {
      kind: "met",
      x: Math.round(v.x),
      y: Math.round(v.y),
      at: now,
      who: v.id,
    });
  }
  befriend(v, 2);
  return speak(world, v, rng, now);
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
  // …and WHICH varieties ripened. This used to be a bare count reported as
  // `${n} carrot${s}`, which called a ripened kale a carrot from the moment the
  // seed stall shipped a second variety.
  const byCrop: Partial<Record<CropId, number>> = {};
  for (const [k, c] of Object.entries(world.crops)) {
    const wasStage = before[k] ?? c.stage;
    if (c.stage > wasStage) {
      grew++;
      if (c.stage >= ripeStage(cropDef(c.cropId))) {
        ripened++;
        byCrop[c.cropId] = (byCrop[c.cropId] ?? 0) + 1;
      }
    }
  }

  const lines: string[] = [];
  const hrs = Math.round(elapsed / 3_600_000);
  lines.push(hrs >= 1 ? `You were away about ${hrs} hour${hrs === 1 ? "" : "s"}.` : "You stepped out for a bit.");
  if (ripened > 0) lines.push(ripenedLine(byCrop, ripened, now));
  else if (grew > 0) lines.push("Your crops put on some growth.");
  // …and whatever the town got up to on its own.
  lines.push(...simulateAway(world, elapsed, now, rng));
  return lines;
}

/** What came ripe, in one sentence.
 *
 *  Names the LARGEST group rather than listing everything: a postcard reading
 *  "2 carrots, 1 kale and 3 wheat" is a spreadsheet, and the away summary is
 *  capped at three sentences for exactly the same reason (see sim/away.ts).
 *  Ties fall back to the plain word, because picking a winner between two equal
 *  groups would be inventing a fact.
 *
 *  When the variety that came up is the one whose month it is, the season's own
 *  note is appended. NOT a line of its own and NOT an away event: a season
 *  changes nothing in the world, and away.ts's rule is that an event returning a
 *  line must have actually changed something or it is the slideshow. The
 *  ripening genuinely happened; the season is an adjective on it. */
function ripenedLine(byCrop: Partial<Record<CropId, number>>, total: number, now: number): string {
  const entries = Object.entries(byCrop) as [CropId, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const tied = entries.length > 1 && entries[0][1] === entries[1][1];
  const what = tied
    ? `${total} crop${total === 1 ? "" : "s"}`
    : itemLabel(cropDef(entries[0][0]).yields, entries[0][1]);
  const base = `${what} came ripe while you were gone.`;
  if (tied) return base;
  const season = seasonAt(now);
  return season.crop === entries[0][0] ? `${base} ${season.ripenedNote}` : base;
}

// Re-exports so ui/render import the sim surface from one place.
export { tileAt, GRASS, DIRT, FARMLAND, FARMLAND_WET, isRipe, updateCrop, cropDef, ripeStage };
