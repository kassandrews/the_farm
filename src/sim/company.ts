// Company — asking somebody to come along (DESIGN §"Company", the third of the
// three gaps: "None of the three lets you invite an NPC along").
//
// The whole feature is one nullable field and a redirected walk target. That is
// deliberate, and it is the reason this shipped after the underground rather
// than before it: company on its own is a follow-behind, and a follow-behind is
// a pet. What makes it a feature is that there is now somewhere to go where
// being alone reads as being alone, and somebody standing next to you when you
// break into rock is a different sentence from the same swing taken by yourself.
//
// FOUR THINGS THIS FILE REFUSES TO DO, and each of them is load-bearing:
//
//   • KEEP A PARTY. `world.company` is one slot, for the reason a commission and
//     an errand are one slot: two followers is a retinue, a retinue is a parade,
//     and a parade is the town coming with you instead of you visiting it.
//   • PAY YOU. Nothing in here calls `add`, and there is no completion, no trip
//     length, no distance walked. Friendship grows because `witness` in
//     sim/game.ts already warms whoever was standing there — a companion is by
//     definition standing there, so doing things together IS the payment
//     (DESIGN §Company: "not only through gifts"). Company you can bank without
//     doing anything would be a timer you leave running.
//   • PUNISH A GOODBYE. `partWays` records the trip and nothing else. Sending
//     someone home costs nothing at any moment, and re-inviting them costs
//     nothing either; there is no cooldown for a cooldown to become a move.
//   • RUN A CLOCK. `dayOver` compares the hour to their own routine. Nobody
//     is on a leash that expires — their day ends, so they go home, which is the
//     same clock every other thing in this town runs on.

import type { WorldState, Villager, Layer } from "./types";
import type { CharId, CharDef } from "../content/cast";
import { charDef, scheduledStop, isSecret } from "../content/cast";
import { remember } from "./memory";
import { atLeast } from "./friendship";
import { isHiding, hideTarget, endPlay } from "./play";

/** The player's tile. Duplicated from sim/game.ts's `playerTile` rather than
 *  imported, because game.ts imports THIS file and a cycle through the sim's
 *  front door is a hazard for one `Math.round`. */
function playerTile(world: WorldState): { x: number; y: number } {
  return { x: Math.round(world.player.x), y: Math.round(world.player.y) };
}

export type CompanyState = WorldState["company"];

/** Who is with you, if anyone. Resolved through the villager list rather than
 *  stored twice — same instinct as the housing model, where a home is a bed and
 *  not also a room id. A stale id (they left town) simply reads as nobody. */
export function companion(world: WorldState): Villager | undefined {
  const id = world.company?.id;
  return id ? world.villagers.find((v) => v.id === id) : undefined;
}

export function isCompanion(world: WorldState, id: CharId): boolean {
  return world.company?.id === id;
}

// --- Who can be asked ----------------------------------------------------------

/** The counters. Every one of these is a PLACE you visit that happens to have a
 *  person at it, and a place that follows you around is not a place — the shop
 *  would be shut for as long as its shopkeeper was down a hole with you, and
 *  the museum would be a building with nothing in it but exhibits.
 *
 *  The Dog Thing is conspicuously NOT on this list, and he is the reason the
 *  list is a list rather than `def.fixed`. DESIGN's own example of company is
 *  "the Dog Thing on errands"; his institution is a ROUND rather than a counter,
 *  and the board was deliberately made readable with nobody standing at it
 *  (sim/errands.ts §"THE BOARD IS REACHED, NOT TALKED TO"). So he is the one
 *  institution that can leave, because he is the one institution that already
 *  does. The other six stay where they are.
 *
 *  THE SECRETS ARE NOT ON THIS LIST AND ARE STILL REFUSED, one line down, via
 *  `isSecret`. They were on it, back when there was one of them: the Mole was a
 *  seventh string here because he does not go up, and he says so in his own bank
 *  unprompted. But the list is about INSTITUTIONS — about a counter nobody would
 *  be standing at — and that is not why a Ghost can't come with you. She can't
 *  come with you because the town has never heard of her and she is only there
 *  at night. Keeping the two reasons apart is what stopped this array quietly
 *  becoming "everyone we couldn't think of a home for". */
const ROOTED: CharId[] = ["office", "shop", "heap", "museum", "seedstall", "stage"];

/** Why somebody won't come. Shaped like sim/assign.ts's `Disqualifier` and for
 *  the same reason: two callers need this fact in different voices, and a
 *  boolean would make each of them re-derive it until they disagreed. */
export type Refusal =
  | "rooted" // they are their counter, or the town has never heard of them
  | "stranger" // you barely know each other
  | "abed" // their day is over; they are going home, or already there
  | "busy"; // somebody else is already with you

export type Invitation = { ok: true } | { ok: false; why: Refusal };

/** How warm they have to be before they'll walk off with you. `familiar` — two
 *  or three real conversations.
 *
 *  A gate at all is a judgement call, and this is the argument for it: the
 *  invitation reads as "come with me" and a stranger saying yes to that reads as
 *  a follow command. One tier up, it reads as somebody who knows you. It is also
 *  the lowest tier that exists, so it is a threshold you cross by playing rather
 *  than one you grind at. */
const INVITE_TIER = "familiar" as const;

/** Can this person come along right now? The acceptance test, written once and
 *  used twice — the UI shows the button, `invite` enforces it. */
export function canInvite(world: WorldState, v: Villager, now: number): Invitation {
  if (world.company && world.company.id !== v.id) return { ok: false, why: "busy" };
  // Both before the tier check, so nobody is ever refused for being a stranger
  // when the real answer is that they were never coming. And both before
  // `dayOver`, which would refuse the Ghost for a reason that is nearly the
  // opposite of the truth: her stop is not `at: "home"` and the hour is past
  // nine, so the one person who only exists after dark would be told she was
  // going to bed.
  if (ROOTED.includes(v.id) || isSecret(v.id)) return { ok: false, why: "rooted" };
  if (!atLeast(v, INVITE_TIER)) return { ok: false, why: "stranger" };
  if (dayOver(charDef(v), now)) return { ok: false, why: "abed" };
  return { ok: true };
}

/** Is their day done? True when their routine has them at home, which for a
 *  resident covers both ends of the night, and — for the one institution with
 *  no bed in the table — when the evening has got late enough that a delivery
 *  round would have finished.
 *
 *  ONE PREDICATE, TWO USES, which is the point of writing it out: it decides
 *  both whether you may ask and whether the person already with you goes home.
 *  Two rules would drift, and the drift would look like a companion you could
 *  re-invite one second after they said goodnight. */
export function dayOver(def: CharDef, now: number): boolean {
  const stop = scheduledStop(def, now);
  if (stop.at === "home") return true;
  return new Date(now).getHours() >= PARTING_HOUR;
}

/** When somebody with no home stop in the table calls it a night. Late, so an
 *  evening walk is a real thing you can do, and not midnight, because the joke
 *  of a companion is that they have their own life to get back to. */
const PARTING_HOUR = 21;

// --- Asking, and stopping asking ------------------------------------------------

/** Ask them along. Returns false having changed nothing when they wouldn't come,
 *  so the caller can't announce an acceptance the sim didn't make. */
export function invite(world: WorldState, id: CharId, now: number): boolean {
  const v = world.villagers.find((w) => w.id === id);
  if (!v || !canInvite(world, v, now).ok) return false;
  world.company = { id, sinceAt: now };
  return true;
}

/** Goodbye. Logs the trip on the person who took it and on nobody else — the
 *  town does not get a memory of a walk it was not on, which is the proximity
 *  rule this phase owes 4a (see `witness`).
 *
 *  `delved` rather than `company` when the trip went underground, because those
 *  are two different afternoons and the banks should be able to tell them apart.
 *  It reads the layer they are STANDING on rather than a flag accumulated over
 *  the trip: somebody who is in a tunnel with you when you say goodbye came down
 *  a tunnel with you, and a "did we ever go under" bit would be a second copy of
 *  a fact the world already holds. Its cost is that surfacing before you part
 *  logs the ordinary walk, which is a fair description of what you just did. */
export function partWays(world: WorldState, now: number): void {
  // A game cannot outlive the walk it was part of. Here rather than in every
  // caller, because this is the one place company ends — goodbye and `dayOver`
  // both come through it. "left" writes nothing (sim/play.ts).
  endPlay(world, now, "left");
  const v = companion(world);
  world.company = null;
  if (!v) return;
  // Three afternoons now, and the layer they are standing on picks which one.
  // Written as a lookup on the layer rather than a pair of booleans so a fourth
  // layer could never quietly log itself as an ordinary walk round the town.
  const layer = v.layer ?? "surface";
  const kind = layer === "under" ? "delved" : layer === "sky" ? "climbed" : "company";
  v.memory = remember(v.memory, { kind, at: now });
  // They walk home from wherever they are. Nothing teleports them and nothing
  // needs to: tickVillager stops asking `followTarget` the moment the slot is
  // null, and the next tick routes them to whatever their hour says.
  //
  // Except the layer, which does have to be put back. A villager left standing
  // on "under" would be a person the surface renderer stops drawing and the
  // pathfinder walks through rock, and every routine in content/cast.ts is a
  // surface coordinate. Only the Mole belongs down there, and he was never
  // eligible to be here.
  //
  // From ANY non-surface layer, not just from under: somebody left standing in
  // the sky is the same person the surface renderer stops drawing, with a longer
  // walk home. Only Sidra belongs up there, and she is not eligible either.
  if (layer !== "surface") v.layer = "surface";
}

/** Called every tick: send them home when their own day says so. Returns the
 *  villager who just left, so the UI can say a goodbye line — and null on every
 *  other tick, which is nearly all of them. */
export function updateCompany(world: WorldState, now: number): Villager | null {
  const v = companion(world);
  if (!v) {
    // A companion who left town (or was never found) leaves a dangling slot.
    // Clear it rather than carrying an id nothing resolves.
    if (world.company) world.company = null;
    return null;
  }
  if (!dayOver(charDef(v), now)) return null;
  partWays(world, now);
  return v;
}

// --- Walking with you -----------------------------------------------------------

/** How close is close enough. Just over a tile, so they settle beside you rather
 *  than treading on your heels, and so a player turning on the spot doesn't make
 *  their companion shuffle. */
const FOLLOW_GAP = 1.6;

/** Where a companion wants to be: the tile you are standing on, which the gap
 *  above stops them ever reaching.
 *
 *  Aiming at YOUR tile rather than at a chosen cell beside you is the whole
 *  trick. Picking a neighbour cell means picking a good one — not in a wall, not
 *  in the doorway you are about to use, not on the far side of the table — which
 *  is a small pathfinding problem solved badly, every tick, at the moment the
 *  player moves. Aiming at the player and stopping short lets sim/path.ts answer
 *  it: they walk the route you walked, and stop where they run out of reason to
 *  continue. It also means a companion follows you through a doorway instead of
 *  standing outside trying to occupy the wall next to it.
 *
 *  Null when they are already close enough, which is what tickVillager reads as
 *  "stand still" — not as "no companion". */
export function followTarget(world: WorldState, v: Villager): { x: number; y: number } | null {
  if (!isCompanion(world, v.id)) return null;
  // A game redirects the walk. Asked as its own predicate rather than folded
  // into `hideTarget`'s null, because null already means "stand still" here —
  // an arrived hider must keep standing at their spot, not resume following.
  if (isHiding(world, v)) return hideTarget(world, v);
  const p = world.player;
  if ((v.layer ?? "surface") !== p.layer) return null; // shouldn't happen; see takeAlong
  if (Math.hypot(p.x - v.x, p.y - v.y) <= FOLLOW_GAP) return null;
  return playerTile(world);
}

/** Bring them down the ladder (or back up it). Called by `useShaft` AFTER the
 *  player's own layer has flipped.
 *
 *  They are placed ON the shaft cell rather than pathed to it, and that is not
 *  the shortcut it looks like. A shaft is one tile wide and the player is
 *  standing in it; there is no second cell to arrive at, and a companion who had
 *  to walk to a coordinate the player occupies would jitter against them
 *  forever. Snapping is also what the villager tick already does when a route
 *  fails (see its docblock: "A villager stuck on the wrong side of a wall for a
 *  day is a worse lie") — this is the same judgement, applied to a ladder.
 *
 *  The distance check is the one piece of honesty in it: somebody two rooms away
 *  did not follow you down, and stays where they are. They are still your
 *  company, on the wrong layer, and `followTarget` refuses to walk them —
 *  they wait, which is what a person does when they lose you. Come back up and
 *  they are still there. */
const LADDER_REACH = 6;

/** `from` is the layer the player was on a moment ago, and it is PASSED IN
 *  rather than worked out here. It used to be inferred by inversion — "they are
 *  under, so they came from the surface" — which was true while there were two
 *  layers and became a guess the moment there were three: standing in the sky
 *  says nothing about whether you climbed from the ground or (some day) from
 *  somewhere else. The caller always knows; asking it costs one argument and
 *  removes a whole class of companion-left-behind bug. */
export function takeAlong(world: WorldState, from: Layer): void {
  const v = companion(world);
  if (!v) return;
  const p = world.player;
  if ((v.layer ?? "surface") !== from) return;
  if (Math.hypot(p.x - v.x, p.y - v.y) > LADDER_REACH) return;
  const { x, y } = playerTile(world);
  v.layer = p.layer;
  v.x = x;
  v.y = y;
}
