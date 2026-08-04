// Play — a game in progress with your companion (ROADMAP §Minigames).
//
// A play is a REDIRECTION OF THE COMPANY WALK, and that one sentence is most
// of the architecture: `world.company` stays the authoritative "who is with
// you", and a game is a modifier consulted by `followTarget` before the
// ordinary follow. Every exit from company ends the game (`partWays` calls
// `endPlay`), so a game cannot outlive the walk it was part of.
//
// THE STATE IS NOT IN THE WORLD. `PlayState` lives in a WeakMap keyed by
// world — a cache, not state, the same argument routes and the rooms index
// make. The reasons, strongest first:
//
//   • A hider is an override of a clock-derived position, and the clock
//     model's whole promise is "come back after two days and everyone walks
//     to their correct post". A SAVED hide is somebody crouched behind a tree
//     for three real days. Company gets to be saved because it is also
//     clock-terminated and is one id and one timestamp; a game has no clock
//     of its own, and saving it buys nothing and costs the invariant.
//   • A saved GameId would be a content-table row id living in a save file —
//     the hazard `Commission.index` was shaped to avoid. Not saving means
//     deleting a game row can never brick a town.
//   • The evaporation is legible: reload mid-hide and company survives, the
//     game doesn't, so `followTarget` walks them back to you — which is
//     exactly what giving up already does. If anyone ever decides to save
//     this, THAT change owes the schema bump and the migration.
//
// WHAT THIS FILE REFUSES TO DO, in the house manner:
//
//   • KEEP SCORE. There is no timer, no count, no win streak, no fail state,
//     and no field to put one in. Being found is the end of the game, not a
//     result of it.
//   • COOL DOWN THE ASK. Asking to play always works, exactly as asking
//     somebody along always works — sim/company.ts: "there is no cooldown for
//     a cooldown to become a move", and a cap on asking is a cap on the
//     player's hands (Design invariant). The ONLY timestamp in this feature
//     shapes how often a companion OFFERS, which is the town's side of it.
//   • STOP YOU WATCHING THEM GO. Nothing prevents following the hider to
//     their spot, and nothing should: there is no win condition, so there is
//     nothing to cheat at, and trailing the hider is a recognisable way to
//     play this game with a small child. The available countermeasures are
//     each worse — a modal pauses the sim, a teleport breaks honest
//     positions, "stand still" is a fail state. Do not fix this.
//   • PAY OUT. Finding them files one memory, on the one person who played,
//     via `remember` — never `witness`, which broadcasts and befriends. A
//     game is not news and not a job; what you get is that somebody remembers
//     playing it with you.

import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";
import type { GameId, SpyKind } from "../content/games";
import { gameDef } from "../content/games";
import { SPY_CLUE } from "../content/dialogue";
import type { MemoryKind } from "./memory";
import { remember } from "./memory";
import { present } from "./presence";
import { nodeAt } from "./gather";
import { structureAt } from "./structures";
import { structureDef } from "../content/structures";
import { roofRoomAt } from "./rooms";
import { furnitureAt } from "./furniture";
import { isWalkable, tileAt, groveCentre, cubeSite } from "./world";
import { WATER, SHALLOW, STONE, SAND, FARMLAND, FARMLAND_WET } from "../content/tiles";
import { findPath } from "./path";
import type { Point } from "./path";
import type { Rng } from "./rng";

/** A game in progress. `who` is validated against `world.company` on every
 *  read (`playing`), so a stale slot reads as nobody — the same self-healing
 *  `companion()` does through the villager list. No phase field: "have they
 *  arrived" is a distance from `spot`, the same 0.05 epsilon `walkToward`
 *  stands on, and a stored copy of it would drift the first time a route
 *  failed and snapped them. */
export interface PlayState {
  game: GameId;
  who: CharId;
  startedAt: number;
  /** Hide and seek: the tile they walked off to. */
  spot?: Point;
  /** I Spy: the thing they named, and the exact words they named it in —
   *  stored so "Say it again?" repeats the clue rather than rerolling it. A
   *  clue that changed on re-asking would be a hint system wearing a memory
   *  problem. */
  target?: { x: number; y: number; kind: SpyKind; clue: string };
}

const plays = new WeakMap<WorldState, PlayState>();

/** The game in progress, if any. Clears itself when company has ended some
 *  other way — the game cannot outlive the walk. */
export function playing(world: WorldState): PlayState | null {
  const p = plays.get(world);
  if (!p) return null;
  if (world.company?.id !== p.who) {
    plays.delete(world);
    return null;
  }
  return p;
}

/** The player's tile. Duplicated from sim/game.ts's `playerTile` for the
 *  reason company.ts duplicates it: game.ts imports company.ts imports THIS
 *  file, and a cycle through the sim's front door is a hazard for one
 *  `Math.round`. */
function playerTile(world: WorldState): Point {
  return { x: Math.round(world.player.x), y: Math.round(world.player.y) };
}

// --- Whether a game can start ---------------------------------------------------

/** Can a game be played with this villager right now? The COMPANY questions
 *  (rooted, stranger, abed, somebody else with you) are not re-asked here —
 *  asking to play IS an invitation, so the UI runs `canInvite`/`invite`
 *  first and this only adds what a game needs on top of a walk: both of you
 *  on the surface, and them actually here. Surface only because a tunnel is
 *  one tile wide (hiding has no meaning down a corridor) and the sky is
 *  three cells — and because `partWays`'s put-them-back-on-the-surface rule
 *  should never meet a hider mid-layer. */
export function canPlay(world: WorldState, v: Villager, now: number): boolean {
  if (playing(world)) return false;
  if (world.player.layer !== "surface") return false;
  if ((v.layer ?? "surface") !== "surface") return false;
  return present(v, now);
}

/** Start a game with the companion. The caller has already made them the
 *  companion (`invite`); this refuses, changing nothing, when they aren't —
 *  so the UI can't announce a game the sim didn't start. For hide and seek
 *  it also picks the spot, and refuses if the world offers nowhere to walk
 *  to at all (48 samples with no walkable, pathable cell among them — a
 *  sealed courtyard, in practice). */
export function startPlay(world: WorldState, id: CharId, game: GameId, now: number, rng: Rng): boolean {
  if (world.company?.id !== id) return false;
  const v = world.villagers.find((w) => w.id === id);
  if (!v || !canPlay(world, v, now)) return false;
  const state: PlayState = { game, who: id, startedAt: now };
  if (game === "hide") {
    const spot = hidingSpot(world, { x: Math.round(v.x), y: Math.round(v.y) }, rng);
    if (!spot) return false;
    state.spot = spot;
  }
  if (game === "spy") {
    const target = spyTarget(world, v, rng);
    if (!target) return false;
    state.target = target;
  }
  plays.set(world, state);
  return true;
}

/** How the game stopped. Only "found" files a memory: giving up writes
 *  nothing at all — no memory, no friendship change, no flag — and so does
 *  the day ending or the goodbye, which is `declineErrand`'s discipline. If
 *  ending well were recorded and ending early weren't, ending early would be
 *  a move; if ending early were recorded, it would be a punishment. */
export type PlayEnd = "found" | "gave_up" | "left";

export function endPlay(world: WorldState, now: number, how: PlayEnd): void {
  const p = playing(world);
  plays.delete(world);
  if (!p || how !== "found") return;
  const v = world.villagers.find((w) => w.id === p.who);
  if (!v) return;
  const kind: MemoryKind = gameDef(p.game).remembers;
  // De-duplicated per calendar day, the same comparison `alreadyLogged` makes
  // for festivals: the fifth game of the afternoon is the same fact as the
  // first, and 40 games must not flood a 64-entry ring. NOT a cap — the game
  // still runs, the line is still said; it just doesn't file a second copy.
  if (!alreadyToday(v, kind, now)) v.memory = remember(v.memory, { kind, at: now });
}

/** Did they already file this kind of memory today? Calendar day, frame's
 *  `now` — the same year-shaped question festival.ts asks, one notch finer. */
function alreadyToday(v: Villager, kind: MemoryKind, now: number): boolean {
  const today = new Date(now).toDateString();
  return v.memory.some((m) => m.kind === kind && new Date(m.at).toDateString() === today);
}

// --- Hide and seek --------------------------------------------------------------

/** How close you have to come to have found them. Its own constant rather
 *  than the 2.6 talk radius, on `BESIDE_YOU`'s argument in sim/moments.ts:
 *  it answers a different question that happens to have a similar answer.
 *  Chosen to sit just past the renderer's anti-occlusion fade band, so the
 *  tree going translucent and the game saying you found them are the same
 *  moment. Proximity rather than a tap, because a hider inside a roofed room
 *  is not drawn until you walk in — you cannot tap what you cannot see. */
export const FOUND_RADIUS = 2.5;

/** Sampling geometry for the spot search. Far enough that they leave your
 *  screen at a sane zoom; near enough that the game stays in the part of
 *  town you were in. */
const HIDE_MIN = 6;
const HIDE_MAX = 14;
const SAMPLES = 48;
/** A* is the expensive check, so it runs last, on the ranked winners only. */
const PATH_TRIES = 4;

/** Does this tile read as hidden? Must agree with the RENDERER or the game
 *  is lying to the player, so each arm mirrors a drawing fact:
 *
 *  • A tall thing in the row SOUTH — the depth-sorted pass draws the row in
 *    front over this one, by (artPx - TILE)/TILE of overhang. ONE row, never
 *    two: every tree in the table overhangs at least a full tile, and no
 *    tree is three tiles of art.
 *  • A solid structure in the row south — a wall is a storey.
 *  • A roof overhead. `roofRoomAt` covers interior and shell, and the roof
 *    cutaway only lifts when the PLAYER is inside — so a person in a closed
 *    room genuinely isn't visible from outside, with no renderer change.
 *
 *  ROCKS ARE DELIBERATELY EXCLUDED. render/renderer.ts §ROCK_SHAPES: rocks
 *  sit UNDER the eyeline — "a thing you step around, not a thing you shelter
 *  behind" — and `hides` never fires for one. A hider behind a boulder would
 *  be a hider in plain sight, and this predicate would be the game claiming
 *  otherwise. If a rock ever grows past a tile, this function has to learn
 *  about it (cross-referenced in the renderer and ROADMAP). */
export function hiddenTile(world: WorldState, x: number, y: number): boolean {
  const below = nodeAt(world, x, y + 1);
  if (below === "tree" || below === "darktree") return true;
  const built = structureAt(world, x, y + 1);
  if (built && structureDef(built.id).solid) return true;
  return roofRoomAt(world, x, y) !== null;
}

/** Is this tile anywhere near a secret? A hiding spot in the grove — or a
 *  hider parked in front of the Cube — is the game leading the player to a
 *  secret by the hand, which is the one thing the UI may never do (DESIGN
 *  §Tone). Generous margins, because "you found the grove chasing a game"
 *  and "you found the grove" must stay the same discovery. Shared by every
 *  target-picker this file grows (I Spy's `spyKindAt` reuses it). */
const SECRET_MARGIN = 9;

export function nearSecret(world: WorldState, x: number, y: number): boolean {
  const grove = groveCentre(world.seed, world.homestead.spot);
  if (Math.max(Math.abs(x - grove.x), Math.abs(y - grove.y)) <= SECRET_MARGIN) return true;
  const cube = cubeSite(world.seed, world.homestead.spot);
  return Math.max(Math.abs(x - cube.x), Math.abs(y - cube.y)) <= SECRET_MARGIN;
}

/** Pick where they'll hide: sampled candidates in a ring around the HIDER
 *  (not the player — they are beside you anyway, and their own position
 *  never routes them through you), filtered cheap-to-expensive, A* run only
 *  on the best few.
 *
 *  THE FALLBACK IS A DESIGN CALL: when nothing occluded passes, take the
 *  farthest walkable, pathable candidate anyway. A game that refuses to
 *  start on a treeless plain is a game with a failure message; a companion
 *  standing sheepishly in the open across a field is funny, on-tone, and —
 *  because there is no score — costs nothing. No quality flag is stored:
 *  whether they hid well is visible on the screen and nowhere else. */
export function hidingSpot(world: WorldState, from: Point, rng: Rng): Point | null {
  const player = playerTile(world);
  const seen = new Set<string>();
  const open: Point[] = []; // walkable at all — the fallback pool
  const hidden: Point[] = []; // walkable and occluded
  for (let i = 0; i < SAMPLES; i++) {
    const angle = rng.next() * Math.PI * 2;
    const radius = HIDE_MIN + rng.next() * (HIDE_MAX - HIDE_MIN);
    const x = Math.round(from.x + Math.cos(angle) * radius);
    const y = Math.round(from.y + Math.sin(angle) * radius);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!isWalkable(world, x, y, "surface")) continue;
    if (Math.hypot(x - player.x, y - player.y) <= FOUND_RADIUS) continue;
    if (nearSecret(world, x, y)) continue;
    open.push({ x, y });
    if (hiddenTile(world, x, y)) hidden.push({ x, y });
  }
  // Farther is better, clamped so "far" never beats "reachable"; the jitter
  // keeps the same clearing from always yielding the same tree.
  const score = (p: Point) => Math.min(Math.hypot(p.x - from.x, p.y - from.y), HIDE_MAX) + rng.next();
  const ranked = (hidden.length > 0 ? hidden : open).sort((a, b) => score(b) - score(a));
  for (const cand of ranked.slice(0, PATH_TRIES)) {
    if (findPath(world, from, cand) !== null) return cand;
  }
  return null;
}

/** Is this villager currently the hider? Split from `hideTarget` because
 *  `followTarget` needs to tell "no game" apart from "arrived, stand still"
 *  — both are null targets, and collapsing them would walk an arrived hider
 *  straight back to the player. */
export function isHiding(world: WorldState, v: Villager): boolean {
  const p = playing(world);
  return p !== null && p.game === "hide" && p.who === v.id && p.spot !== undefined;
}

/** Where the hider is going: their spot, or null once they're on it, which
 *  `tickVillager` reads as "stand still" (the companion early-return catches
 *  them, exactly as it does a companion who's close enough). The same 0.05
 *  `walkToward` calls arrival. */
export function hideTarget(world: WorldState, v: Villager): Point | null {
  const p = playing(world);
  if (!p || !isHiding(world, v)) return null;
  const spot = p.spot!;
  if (Math.hypot(spot.x - v.x, spot.y - v.y) <= 0.05) return null;
  return spot;
}

/** Called from the UI loop each frame, the `attend`/`noticeParting` shape:
 *  returns the villager exactly once, on the frame you found them, and null
 *  on every other frame — so the UI can say the line without the sim paying
 *  twice. Found means they have ARRIVED (walking beside them mid-stride is
 *  not finding them; if their route failed and `walkToward` snapped them,
 *  they are at the spot and findable, which is the honest reading of a snap)
 *  and you are within FOUND_RADIUS of where they stand. */
export function foundThem(world: WorldState, now: number): Villager | null {
  const p = playing(world);
  if (!p || p.game !== "hide" || !p.spot) return null;
  const v = world.villagers.find((w) => w.id === p.who);
  if (!v || (v.layer ?? "surface") !== world.player.layer) return null;
  if (Math.hypot(p.spot.x - v.x, p.spot.y - v.y) > 0.05) return null; // still walking
  if (Math.hypot(world.player.x - v.x, world.player.y - v.y) > FOUND_RADIUS) return null;
  endPlay(world, now, "found");
  return v;
}

// --- I Spy ----------------------------------------------------------------------

/** How close to the named thing counts as having found it. Proximity and
 *  NOTHING ELSE: no guess, no confirm button, no wrong answers, no
 *  warmer/colder. A confirm that can be wrong is a quiz with a fail state,
 *  and a homing signal is a hint economy — proximity means wrong guesses
 *  don't exist as a concept. You wander past three wrong trees and nothing
 *  happens, which is correct; and yes, you can win by accident on the walk
 *  home, which is how a four-year-old wins I Spy and there is no score for
 *  the accident to cheapen. */
export const SPY_REACH = 2.0;

/** How far afield they'll pick a thing. Small enough that the clue is honest
 *  about "visible from here", large enough that you have to actually look. */
const SPY_RANGE = 8;

/** What kind of spy-able thing stands on this cell, or null.
 *
 *  ONE FUNCTION, shared by every picker (I Spy today, "Look at this" next),
 *  so no caller can disagree about the exclusions — the possibleAskers
 *  lesson, learned when the noticeboard advertised the Mole. The refusals,
 *  each load-bearing:
 *
 *  • Anything near a secret (`nearSecret`) — a clue pointing at the Cube or
 *    the grove is the game leading you to a secret by the hand.
 *  • The found places (pole, mailbox, stair) — those are discoveries, and a
 *    clue naming one is the UI spoiling it (DESIGN §Found places).
 *  • Plain grass and bare dirt — everything is grass; the clue is unsolvable.
 *  • People are not cells, so a person can never be a target by construction;
 *    the type in content/games.ts records the refusal anyway.
 *
 *  Priority when a cell is several things at once: the most SPECIFIC wins —
 *  a crop over the tilled earth it stands in, furniture over the floor under
 *  it — because the clue should be about the thing you'd actually say. */
export function spyKindAt(world: WorldState, x: number, y: number): SpyKind | null {
  if (nearSecret(world, x, y)) return null;
  if (world.crops[`${x},${y}`]) return "crop";
  if (furnitureAt(world, x, y)) return "furniture";
  const built = structureAt(world, x, y);
  if (built && structureDef(built.id).solid) return "building";
  const node = nodeAt(world, x, y);
  if (node === "tree") return "tree";
  if (node === "rock") return "rock";
  if (node !== null) return null; // darktree, shrub, stump, log, vein: not clue material
  const tile = tileAt(world, x, y, "surface");
  if (tile === WATER || tile === SHALLOW) {
    // The EDGE of it: a water tile somebody could stand beside. A clue about
    // open sea would be findable only by boat, and there are no boats.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (isWalkable(world, x + dx, y + dy, "surface")) return "water";
    }
    return null;
  }
  if (tile === STONE || tile === SAND || tile === FARMLAND || tile === FARMLAND_WET) return "ground";
  return null;
}

/** Candidate targets around the pair — enumerated (a disc this size is ~200
 *  cheap lookups, once, on a button press), keeping only kinds the speaker
 *  has a clue line for, so a form with a thin bank spies fewer things
 *  instead of going silent (`tryHomeLine`'s fall-through instinct). */
export function spyChoices(world: WorldState, v: Villager): { x: number; y: number; kind: SpyKind }[] {
  const cx = (world.player.x + v.x) / 2;
  const cy = (world.player.y + v.y) / 2;
  const out: { x: number; y: number; kind: SpyKind }[] = [];
  const bank = SPY_CLUE[v.form];
  for (let y = Math.round(cy) - SPY_RANGE; y <= Math.round(cy) + SPY_RANGE; y++) {
    for (let x = Math.round(cx) - SPY_RANGE; x <= Math.round(cx) + SPY_RANGE; x++) {
      if (Math.hypot(x - cx, y - cy) > SPY_RANGE) continue;
      const kind = spyKindAt(world, x, y);
      if (!kind) continue;
      if (!bank?.[kind]?.length) continue;
      out.push({ x, y, kind });
    }
  }
  return out;
}

/** Pick the thing and the words. Null when nothing near the pair is
 *  spy-able, which the UI reads as the game honestly unavailable — on an
 *  empty plain with no crops and no buildings, that is the true answer. */
export function spyTarget(
  world: WorldState,
  v: Villager,
  rng: Rng,
): { x: number; y: number; kind: SpyKind; clue: string } | null {
  const choices = spyChoices(world, v);
  if (choices.length === 0) return null;
  const pick = rng.pick(choices);
  const lines = SPY_CLUE[v.form]?.[pick.kind];
  if (!lines || lines.length === 0) return null; // unreachable: spyChoices filtered
  return { ...pick, clue: rng.pick(lines) };
}

// --- "Look at this" -------------------------------------------------------------

/** How near a thing has to be for "look at this" to mean anything: the cells
 *  around where you stand. Same reach as acting on the world, roughly — you
 *  point at what you're standing at, not across the square. */
const LOOK_REACH = 2;

/** Most-specific first, because the remark should be about the thing you'd
 *  actually name: a crop over the tilled earth it stands in, a chair over the
 *  floor under it. Same ordering `spyKindAt` applies within one cell, lifted
 *  to the neighbourhood. */
const LOOK_ORDER: SpyKind[] = ["crop", "furniture", "building", "tree", "rock", "water", "ground"];

/** What's here to be shown to somebody. Reuses `spyKindAt` wholesale — one
 *  kind-reader, one set of exclusions, so a thing that can't be spied (a
 *  secret, a found place) also can't be remarked on. Geometry only: this
 *  pays nothing and writes nothing, and the UI keeps it that way (see
 *  LOOK_AT's header in content/dialogue.ts). */
export function lookKindNear(world: WorldState): SpyKind | null {
  if (world.player.layer !== "surface") return null;
  const at = playerTile(world);
  const found = new Set<SpyKind>();
  for (let dy = -LOOK_REACH; dy <= LOOK_REACH; dy++) {
    for (let dx = -LOOK_REACH; dx <= LOOK_REACH; dx++) {
      const kind = spyKindAt(world, at.x + dx, at.y + dy);
      if (kind) found.add(kind);
    }
  }
  for (const kind of LOOK_ORDER) if (found.has(kind)) return kind;
  return null;
}

/** The I Spy twin of `foundThem`, polled the same way: the villager comes
 *  back exactly once, on the frame you arrived at the thing they named. */
export function foundIt(world: WorldState, now: number): Villager | null {
  const p = playing(world);
  if (!p || p.game !== "spy" || !p.target) return null;
  if (world.player.layer !== "surface") return null;
  if (Math.hypot(world.player.x - p.target.x, world.player.y - p.target.y) > SPY_REACH) return null;
  const v = world.villagers.find((w) => w.id === p.who);
  endPlay(world, now, "found");
  return v ?? null;
}
