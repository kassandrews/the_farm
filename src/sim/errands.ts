// The errands board. See content/errands.ts for the requests and the notices,
// and ROADMAP §"The rest of Phase 3" for the shape this was settled at.
//
// This is sim/commission.ts generalised, and it borrows that file's two
// load-bearing habits deliberately:
//
//   • ONE OPEN AT A TIME. `openErrand` is a single slot, not a queue, for the
//     reason a commission is: two people asking simultaneously turns a favour
//     into a backlog, and the backlog is the part that feels like work.
//   • DERIVED FROM THE CLOCK, NEVER COUNTED DOWN. `errandDue` compares two
//     timestamps, so nothing accumulates while you are gone. Two days away
//     produces one request waiting on the board, not eight — the same reason
//     `arrivalDue` is written the way it is.
//
// AND ONE THING COMMISSIONS DON'T DO: THE TABLE CYCLES. Arrivals run out on
// purpose and antiquities run out on purpose, because both are finite stories.
// The board is not a story, it is the town's everyday pulse, and a board that
// ran dry would be a board the town stopped using. Unseen rows are preferred
// while any remain — so the first ten requests are all new — and after that it
// comes round again, never repeating the row it just closed.
//
// WHAT THIS FILE HAS NO WAY TO DO, and museum.test.ts's negatives are the
// precedent for asserting it:
//
//   • Pay out an item. `deliverErrand` calls `spend` and `befriend` and touches
//     the inventory in exactly one direction. There is no `add` in this file.
//   • Report a total. `done` is a list of ids so the table knows what you have
//     seen; nothing exposes its length as a score, and there is no denominator
//     for a UI to divide it by.
//   • Punish a refusal. `declineErrand` records nothing at all — no memory, no
//     friendship change, no flag. The row goes back in the pool.

import type { WorldState } from "./types";
import type { CharId } from "../content/cast";
import { isSecret } from "../content/cast";
import type { ErrandDef, ErrandId, NoticeWorld } from "../content/errands";
import { ERRANDS, NOTICES, errandDef } from "../content/errands";
import type { Rng } from "./rng";
import { count, spend } from "./inventory";
import { befriend } from "./friendship";
import { remember } from "./memory";

/** How long the board stays quiet after a request closes — delivered OR
 *  refused, identically.
 *
 *  Identical on purpose. If refusing brought the next card sooner it would be
 *  the efficient play, and if it brought it later it would be a punishment;
 *  both turn "no thank you" into a move. Saying no costs exactly nothing, which
 *  is what makes it a real option rather than a politeness.
 *
 *  Wall-clock, and long enough that the board is somewhere you pass rather than
 *  somewhere you check — real time gates the living world, never the player's
 *  hands (Design invariant).
 *
 *  ONE GAP, NOT TWO. The obvious shape here — a short first gap and a long one
 *  after, the way `arrivalDue` does it — was written and thrown away, because
 *  the natural way to ask "is this the first?" is `done.length === 0` and a
 *  REFUSAL DOESN'T ADD TO `done`. So refusing the opening request brought the
 *  next one back in fifteen minutes while running it cost four hours, which is
 *  precisely the "saying no is a move" failure the paragraph above forbids, and
 *  a unit test caught it on the first run.
 *
 *  The first card still arrives quickly. `newErrands` simply starts the clock
 *  part-wound (see below), so there is one constant governing every gap and no
 *  branch left for the asymmetry to hide in. */
const ERRAND_GAP_MS = 4 * 60 * 60 * 1000;

/** How soon after a town begins the board first has something to say. Short,
 *  for the reason the first arrival is: it is the gap that teaches the beat
 *  exists. Expressed as a wound-forward clock rather than a special case. */
const FIRST_ERRAND_MS = 15 * 60 * 1000;

export type ErrandsState = WorldState["errands"];
export type OpenErrand = NonNullable<ErrandsState["open"]>;

/** A fresh board. Shared by `newWorld` and the v15 migration, so a returning
 *  player's town and a new player's town can't differ — the bug
 *  `ensureFixedCast` exists to stop, one field over. */
export function newErrands(now: number): ErrandsState {
  // Started part-wound, so the first card is due in FIRST_ERRAND_MS and every
  // one after it in a full ERRAND_GAP_MS — the whole of the "first gap is
  // shorter" behaviour, bought without a branch in `errandDue`.
  return { open: null, done: [], lastClosedAt: now - (ERRAND_GAP_MS - FIRST_ERRAND_MS) };
}

export function openErrand(world: WorldState): OpenErrand | null {
  return world.errands.open;
}

// --- Posting -------------------------------------------------------------------

/** Who can be asked FOR: anybody standing in the town except the Dog himself,
 *  who would then be running an errand to his own board.
 *
 *  Institutions are eligible, which is deliberate. A Menace who wants cloth and
 *  a Gremlin who wants junk are both funnier and truer than a board that only
 *  ever speaks for residents, and there is no rule anywhere that an institution
 *  is not also a person who needs two potatoes.
 *
 *  THE SECRETS ARE NOT, and this was already wrong before 4c rather than because
 *  of it: from the moment you met the Mole, the board in the middle of the plaza
 *  could post a card reading "Maverick Mole would like two potatoes" — the town
 *  publishing a notice about somebody the town has never heard of, which is the
 *  UI spoiling a secret about as loudly as it could manage. The Ghost and the
 *  Cosmos would each have done it again. `isSecret` is the fix in one place. */
export function possibleAskers(world: WorldState): WorldState["villagers"] {
  return world.villagers.filter((v) => v.id !== "errands" && !isSecret(v.id));
}

/** Is there a card waiting to go up?
 *
 *  Requires somebody to speak for: a board with a request from nobody would be
 *  the town asking on its own behalf, and the whole point is that a person
 *  wanted something. In practice the town is never empty, but the check is what
 *  makes that a fact rather than an assumption. */
export function errandDue(world: WorldState, now: number): boolean {
  if (!world.flags.onboarded) return false;
  if (world.errands.open) return false; // one at a time
  if (possibleAskers(world).length === 0) return false;
  return now - world.errands.lastClosedAt >= ERRAND_GAP_MS;
}

/** Which rows are eligible next: everything unseen, or — once you have seen
 *  them all — everything except the one that just closed.
 *
 *  The two-stage rule is what makes cycling feel like a town rather than a
 *  shuffle. While anything is new you get the new thing; after that the board
 *  repeats itself the way a real one would, and the only guarantee is that it
 *  never asks for the same thing twice running. */
export function eligibleErrands(world: WorldState): ErrandDef[] {
  const seen = new Set(world.errands.done);
  const unseen = ERRANDS.filter((e) => !seen.has(e.id));
  if (unseen.length > 0) return unseen;
  const last = world.errands.done[world.errands.done.length - 1];
  const rest = ERRANDS.filter((e) => e.id !== last);
  return rest.length > 0 ? rest : ERRANDS;
}

/** Pin a card up. Returns it, or null if there was nothing to post. */
export function postErrand(world: WorldState, now: number, rng: Rng): OpenErrand | null {
  if (world.errands.open) return null;
  const askers = possibleAskers(world);
  if (askers.length === 0) return null;
  const pool = eligibleErrands(world);
  if (pool.length === 0) return null;

  const def = pool[rng.int(pool.length)];
  const asker = askers[rng.int(askers.length)];
  const open: OpenErrand = { id: def.id, askerId: asker.id, postedAt: now };
  world.errands.open = open;
  return open;
}

/** The card as it reads on the board, with the asker's name in it. Falls back
 *  to a plain description of the asker if they have somehow left town — the
 *  card is already pinned, and a card with a hole in it is worse than a card
 *  about someone you can't find. */
export function cardText(world: WorldState, open: OpenErrand): string {
  const asker = world.villagers.find((v) => v.id === open.askerId);
  return errandDef(open.id).card.replace("{who}", asker ? asker.name : "Somebody");
}

// --- Doing it, or not ----------------------------------------------------------

/** Whether the open request can be met right now.
 *
 *  Shaped like `commissionState` so the card and the button can never come to
 *  disagree about whether you can pay — one call site produces the text and
 *  gates the action, which is the same discipline `shortfallText` enforces on
 *  the Office Creature's letterhead. */
export type ErrandState =
  | { ready: true; def: ErrandDef }
  | { ready: false; def: ErrandDef; have: number; want: number };

export function errandState(world: WorldState): ErrandState | null {
  const open = world.errands.open;
  if (!open) return null;
  const def = errandDef(open.id);
  const have = count(world.inventory, def.ask.item);
  if (have >= def.ask.count) return { ready: true, def };
  return { ready: false, def, have, want: def.ask.count };
}

/** Hand it over. All-or-nothing via `spend` — the rule sim/heap.ts and
 *  sim/museum.ts both exist to get right — and returns null having changed
 *  nothing when you are short.
 *
 *  The friendship goes to the ASKER, and a smaller share to the Dog for the
 *  delivery. That split is the argument for relaying through him at all: the
 *  errand is a thing you did for a person, so the person is who warms to you,
 *  and the postman gets the smaller thanks a postman gets.
 *
 *  Returns his line, which along with the friendship and the memory is the
 *  entire payment. */
export function deliverErrand(world: WorldState, now: number): string | null {
  const state = errandState(world);
  if (!state || !state.ready) return null;
  const open = world.errands.open!;
  const def = state.def;
  if (!spend(world.inventory, { [def.ask.item]: def.ask.count })) return null;

  const asker = world.villagers.find((v) => v.id === open.askerId);
  if (asker) {
    befriend(asker, 3);
    asker.memory = remember(asker.memory, { kind: "errand", at: now, value: def.ask.item });
  }
  const dog = world.villagers.find((v) => v.id === "errands");
  if (dog) befriend(dog, 1);

  world.errands.open = null;
  world.errands.done.push(def.id);
  world.errands.lastClosedAt = now;
  return def.thanks;
}

/** Not today. Costs nothing, records nothing, and is not remembered — see the
 *  note on ERRAND_GAP_MS for why the quiet period afterwards is the same
 *  length either way. */
export function declineErrand(world: WorldState, now: number): void {
  if (!world.errands.open) return;
  world.errands.open = null;
  world.errands.lastClosedAt = now;
}

// --- The notices column ---------------------------------------------------------

/** How many notices are up at once. Three, so the column is a glance rather
 *  than a page — and so that it can never grow into a feed as the town does. */
const MAX_NOTICES = 3;

function noticeWorld(world: WorldState): NoticeWorld {
  return {
    museum: { donated: world.museum.donated },
    seeds: { unlocked: world.seeds.unlocked },
    villagers: world.villagers.map((v) => ({ id: v.id, name: v.name })),
    errandsDone: world.errands.done.length,
  };
}

/** What's pinned up beside the request.
 *
 *  Standing notices first, then whatever the town has actually done, then the
 *  echo of the most recent errand — which is the one place a completed request
 *  leaves a visible trace, and it is in the past tense and has no number in it.
 *  A completed errand's real record is a friendship and a memory. */
export function notices(world: WorldState): string[] {
  const w = noticeWorld(world);
  const out: string[] = [];
  for (const fn of NOTICES) {
    const line = fn(w);
    if (line) out.push(line);
    if (out.length >= MAX_NOTICES) break;
  }

  // The most recent echo displaces the last standing notice rather than
  // extending the column: the cap is the cap, and a board that got longer the
  // more you did would be exactly the growing to-do list this design refuses.
  const lastDone = world.errands.done[world.errands.done.length - 1] as ErrandId | undefined;
  const echo = lastDone ? errandDef(lastDone).echo : undefined;
  if (echo) {
    if (out.length >= MAX_NOTICES) out.pop();
    out.push(echo);
  }
  return out;
}

// --- Finding the board ----------------------------------------------------------

/** The board within reach of a tile, if there is one.
 *
 *  THE BOARD IS REACHED, NOT TALKED TO, and that is the point of this function
 *  existing. Every other institution in town is a person you speak to, so the
 *  panel opens through `talk()`; the Dog Thing walks a round (content/cast.ts),
 *  which means for most of the day the board has nobody at it. A notice board
 *  you can only read when the postman happens to be standing there is a notice
 *  board that does not work.
 *
 *  Four-neighbour, matching `nodeNear`'s instinct rather than its exact rule: a
 *  board is solid so you can never stand on it, and diagonal reach would let
 *  you read it around the corner of something. */
export function boardNear(world: WorldState, x: number, y: number): { x: number; y: number } | null {
  const around = [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ];
  for (const [nx, ny] of around) {
    if (world.furniture[`${nx},${ny}`]?.id === "noticeboard") return { x: nx, y: ny };
  }
  return null;
}

/** Has this character got a card on the board right now? Used by dialogue so
 *  the asker can mention it themselves — the board relays the request, but the
 *  person is still the person who wants the thing. */
export function isAsking(world: WorldState, id: CharId): boolean {
  return world.errands.open?.askerId === id;
}
