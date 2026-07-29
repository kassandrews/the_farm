// The sim's front door. Everything the render + ui layers need to drive the
// world goes through here: create a world, tick it on a fixed timestep, apply
// the context action, talk to a villager, and summarise what happened while the
// player was away. No DOM, no canvas — still pure logic (CLAUDE.md).

import type { WorldState, Player, Villager, Tool, BuildTool, HomesteadSpot, Heading } from "./types";
import type { AdultForm } from "../content/canon/forms";
import { CAST } from "../content/cast";
import type { CharId } from "../content/cast";
import { makeVillager, tickVillager, befriend } from "./villagers";
import { arrivalDue, admitArrival } from "./commission";
import { remember } from "./memory";
import type { MemoryKind } from "./memory";
import {
  canDig,
  canSink,
  sink,
  fillShaft,
  canCarve,
  placePlank,
  isWalkable,
  tileAt,
  setTile,
  homesteadOrigin,
  generatedTile,
} from "./world";
import { placeStructure, removeStructure } from "./structures";
import { rooms } from "./rooms";
import { stampTown, ensureFixedCast } from "./town";
import { newErrands, errandDue, postErrand, boardNear } from "./errands";
import { settleResidents } from "./housing";
import { placeFurniture, removeFurnitureAt } from "./furniture";
import { FURNITURE, furnitureDef } from "../content/furniture";
import type { FurnitureId, Facing } from "../content/furniture";
import { structureDef } from "../content/structures";
import { GRASS, DIRT, PLANK, FARMLAND, FARMLAND_WET, MUSHROOM, SHAFT } from "../content/tiles";
import { digWithFind, carveWithFind } from "./junk";
import { emptyInventory, add, canAfford, spend, refund, shortfall } from "./inventory";
import type { Cost } from "./inventory";
import { itemLabel } from "../content/items";
import type { ItemId } from "../content/items";
import { gather, nodeAt, nodeNear, updateRegrowth } from "./gather";
import { nodeDef } from "../content/nodes";
import { mineVein } from "./mining";
import { meetMole } from "./mole";
import { starterSkins, defaultSkin } from "../content/skins";
import { STARTING_CROP } from "../content/crops";
import { STARTING_SEED, canSow, sow } from "./seeds";
import { canPlant, water, canWater, harvest, isRipe, updateAllCrops, updateCrop } from "./crops";
import { cropDef, ripeStage } from "../content/crops";
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
    homestead: { spot: opts.spot, originX: origin.x, originY: origin.y },
    overrides: {},
    under: {}, // solid rock until you cut into it
    build: {},
    furniture: {},
    crops: {},
    villagers,
    commissions: [],
    // A few boards' worth of wood so the very first thing you try to build
    // works — you learn the cost by spending it, not by being refused. Seed for
    // the same reason: the tent comes with enough to put a row in, and the
    // Blessed Carrot is where you go when you want more of it or something
    // other than a carrot to plant.
    inventory: { ...emptyInventory(), wood: 8, seed: STARTING_SEED },
    regrow: {},
    skins: {
      unlocked: starterSkins(),
      selected: { wood: defaultSkin("wood"), stone: defaultSkin("stone"), cloth: defaultSkin("cloth") },
    },
    seeds: { unlocked: [STARTING_CROP], selected: STARTING_CROP },
    museum: { donated: [] },
    // Same helper the v15 migration uses, so a new town and an upgraded one
    // open with an identically quiet board.
    errands: newErrands(now),
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
  return true;
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

export type ActionKind =
  | "dig"
  | "gather"
  | "plank"
  | "plant"
  | "water"
  | "harvest"
  | "read"
  | "sink" // the second dig on one tile: a way down
  | "carve" // cutting the rock face ahead of you
  | "shaft" // going down, or coming back up
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
  kind: "harvest" | "gather" | "tool" | "read" | "shaft" | "none";
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

  if (isRipe(world, x, y)) return { x, y, kind: "harvest" };

  // The way down, and it can sit this high in the ladder safely. A shaft cell
  // holds nothing else by construction: `canSink` refuses a cell with a crop, a
  // built piece or furniture on it, and no tool applies to a shaft. So there is
  // never anything else competing for this tile, and putting it above the node
  // shortcut means a tree beside the hole can't hijack the step down.
  if (tileAt(world, x, y) === SHAFT) return { x, y, kind: "shaft" };

  const near = nodeNear(world, x, y, world.player.facing);
  if (near && tool === "gather") return { x: near.x, y: near.y, kind: "gather" };
  if (toolApplies(world, tool, x, y)) return { x, y, kind: "tool" };
  if (near) return { x: near.x, y: near.y, kind: "gather" };

  const board = boardNear(world, x, y);
  if (board) return { x: board.x, y: board.y, kind: "read" };
  return { x, y, kind: "none" };
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

/** The context action button: does whatever `actionTarget` is pointing at. */
export function contextAction(world: WorldState, tool: Tool, now: number): ActionResult {
  const target = actionTarget(world, tool);

  if (target.kind === "harvest") {
    // `harvest` pays out the produce AND a seed itself — the cost of sowing and
    // the return on pulling are one rule and live together (see its docblock).
    const def = harvest(world, target.x, target.y, now)!;
    witness(world, "harvested_carrot", `a ${def.yieldName}`, now);
    return {
      kind: "harvest",
      changed: true,
      message: `You pulled a ${def.yieldName}. It's a good one.`,
    };
  }

  if (target.kind === "gather") {
    // Underground the same reticle means the ore in front of you, and the verb
    // routes through mineVein because depth pays out as well as the ore does.
    if (world.player.layer === "under") {
      const got = mineVein(world, target.x, target.y, now)!;
      // No `witness`, for the reason carving doesn't have one either: nobody is
      // down there, and the town hearing about it would be the memory log
      // inventing an audience. The slate is the record instead.
      return {
        kind: "gather",
        changed: true,
        message: got.foundSlate
          ? "Under the metal, rock that splits in flat grey sheets. Slate. Nobody down here to tell."
          : `${nodeDef(got.node).line} ${itemLabel(got.item, got.amount)}.`,
      };
    }
    const got = gather(world, target.x, target.y, now)!;
    witness(world, "gathered", undefined, now);
    return {
      kind: "gather",
      changed: true,
      message: `${nodeDef(got.node).line} ${itemLabel(got.item, got.amount)}.`,
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
      message: down ? "Down. The air goes cool and stops moving." : "Up. The sky is where you left it.",
    };
  }

  if (target.kind === "read") {
    // The sim's part is over here. Reading changes nothing — it opens a panel,
    // which is the UI's business (ui/app.ts watches for this kind), and the
    // message is the fallback for anywhere that only has a line to show.
    return { kind: "read", changed: false, message: "Notices, and one request." };
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
      // Two states of the same tile, in order: grass becomes dirt, and dirt
      // becomes a way down. They can't both be true (canDig is grass and
      // mushrooms, canSink is dirt), so this is one shovel with two answers
      // rather than a precedence question.
      return canDig(world, x, y) || canSink(world, x, y);
    case "gather":
      return tileAt(world, x, y) === MUSHROOM; // the one gatherable that isn't a node
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
          // No `witness` here, deliberately. The only person down there is the
          // Mole, and he is not the town; a memory saying the neighbours heard
          // about a hole they cannot visit would be inventing an audience.
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
        witness(world, "dug", undefined, now);
        return { kind: "sink", changed: true, message: "The earth gives, and keeps giving. There's a way down." };
      }
      // digWithFind, not dig: the shovel and the ground's contents are one
      // operation, because the payout has to be decided before the dig writes
      // its override (sim/junk.ts explains what splitting them cost).
      const { dug, find } = digWithFind(world, x, y);
      if (dug) {
        witness(world, "dug", undefined, now);
        // The find replaces the usual line rather than joining it. Two toasts
        // for one tap is a queue, and the interesting sentence should not have
        // to wait behind "You turn the earth."
        return { kind: "dig", changed: true, message: find ?? "You turn the earth." };
      }
      return { kind: "dig", changed: false, message: "Nothing to dig here." };
    }
    case "gather":
      // Mushrooms are the one gatherable that isn't a node — pick them up.
      if (tileAt(world, x, y) === MUSHROOM) {
        setTile(world, x, y, GRASS);
        add(world.inventory, "mushroom", 1);
        return { kind: "gather", changed: true, message: "Picked. It comes away cleanly." };
      }
      return { kind: "gather", changed: false, message: "Nothing to gather here." };
    case "plant": {
      const sown = sow(world, x, y, now);
      if (sown) {
        witness(world, "planted_carrot", undefined, now);
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
    // The board is town furniture and not for sale (content/furniture.ts), so
    // this line is unreachable in practice — it exists because the switch is
    // exhaustive over FurnitureId and an exhaustive switch is how a new row
    // becomes a compile error instead of a silent blank.
    case "noticeboard":
      return "A board, for notices. It is not yours, and it is already up.";
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
    if ((v.layer ?? "surface") !== p.layer) continue;
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
