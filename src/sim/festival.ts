// Festivals. See content/festivals.ts for the twelve rows and DESIGN §Festivals
// for the model.
//
// EVERYTHING ABOVE THE `attend` LINE IS PURE, and takes a date rather than a
// world. That is the whole design compressed into a file layout: a festival is
// a total function of the date (DESIGN), so asking "is one on" is arithmetic on
// a timestamp and not a query against saved state. Same shape as sim/time.ts —
// a date in, a fact out, testable without a clock.
//
// WHAT THIS FILE HAS NO WAY TO DO, on the precedent of sim/heap.ts and
// sim/museum.ts asserting their own negatives:
//
//   • Count attendance. There is no counter, no list and no world field. The
//     only trace of your having been somewhere is a memory on each villager
//     who was there, which is where DESIGN says dialogue must be written
//     against anyway.
//   • Punish absence. Nothing here runs when a festival passes unattended;
//     `attend` is called from the tick and simply does nothing if you are not
//     standing in the plaza. Missing one leaves the world identical.
//   • Gate anything. Nothing exported from here is called by `qualify`,
//     `commissionState`, `donatable`, `redeem` or `errandState`, and
//     festival.test.ts asserts it stays that way.
//
// This is why the whole institution ships at schema v15 with no migration: the
// two things a festival could have stored are both derivable, and both would
// have been scores.

import type { WorldState, Villager } from "./types";
import type { FestivalDef } from "../content/festivals";
import { STAGE, FESTIVAL_TO_HOUR, FESTIVAL_FROM_HOUR, festivalOn, activeFestival } from "../content/festivals";
import { befriend } from "./friendship";
import { remember } from "./memory";

const DAY_MS = 24 * 60 * 60 * 1000;

// `festivalOn` and `activeFestival` are content — a festival is a total
// function of the date, so asking which one is on is a lookup into the table
// and content/cast.ts needs it to build a schedule. Re-exported so that reading
// this module is still how you find out what the game does with them.
export { festivalOn, activeFestival };

// --- The calendar ---------------------------------------------------------------

/** True the day before one. The Blob's rehearsal gets louder; nothing
 *  mechanical hangs off it. */
export function isEve(now: number): boolean {
  return festivalOn(now + DAY_MS) !== null && festivalOn(now) === null;
}

/** The next festival due, and when — walking forward day by day from today,
 *  wrapping into next year.
 *
 *  Today counts as "next" until its END HOUR, not until midnight: the Blob
 *  should be announcing tonight's festival at breakfast on the day, and the
 *  panel would otherwise skip a month ahead the moment the date rolled over.
 *
 *  Bounded at 400 iterations, which cannot be reached — the table has a row in
 *  every month, so the answer is always within 31 days. The bound is there so
 *  that a future edit deleting rows produces a null rather than a hang. */
export function nextFestival(now: number): { def: FestivalDef; at: number } | null {
  const today = festivalOn(now);
  if (today && new Date(now).getHours() < FESTIVAL_TO_HOUR) {
    return { def: today, at: startOfFestival(now) };
  }
  const cursor = new Date(now);
  for (let i = 0; i < 400; i++) {
    cursor.setDate(cursor.getDate() + 1);
    const def = festivalOn(cursor.getTime());
    if (def) return { def, at: startOfFestival(cursor.getTime()) };
  }
  return null;
}

/** How many whole days until the next one. Zero means today.
 *
 *  Counted in CALENDAR DAYS rather than in elapsed milliseconds, so "tomorrow"
 *  is tomorrow at breakfast and tomorrow at bedtime alike. A figure that said
 *  "0 days" all evening and "1 day" after midnight would be arithmetically
 *  right and conversationally wrong, and the Blob speaks in days. */
export function daysUntil(now: number, at: number): number {
  const a = new Date(now);
  const b = new Date(at);
  const from = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const to = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((to - from) / DAY_MS));
}

/** The most recent festival that has already finished, walking backwards.
 *  Used for the past-tense line — what the town was doing last time. */
export function lastFestival(now: number): { def: FestivalDef; at: number } | null {
  const today = festivalOn(now);
  if (today && new Date(now).getHours() >= FESTIVAL_TO_HOUR) {
    return { def: today, at: startOfFestival(now) };
  }
  const cursor = new Date(now);
  for (let i = 0; i < 400; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const def = festivalOn(cursor.getTime());
    if (def) return { def, at: startOfFestival(cursor.getTime()) };
  }
  return null;
}

/** The moment a given day's festival begins. */
function startOfFestival(dayMs: number): number {
  const d = new Date(dayMs);
  d.setHours(FESTIVAL_FROM_HOUR, 0, 0, 0);
  return d.getTime();
}

/** Every festival whose hours fell inside a window — what happened while you
 *  were away. Ordered oldest first.
 *
 *  Walks days rather than rows so that a fortnight away reports both of the
 *  festivals it contained, and a year away doesn't report the same twelve
 *  repeatedly: the bound is the window, and `sim/away.ts` takes the last one. */
export function festivalsBetween(from: number, to: number): { def: FestivalDef; at: number }[] {
  const out: { def: FestivalDef; at: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400 && cursor.getTime() <= to; i++) {
    const def = festivalOn(cursor.getTime());
    if (def) {
      const at = startOfFestival(cursor.getTime());
      if (at >= from && at <= to) out.push({ def, at });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Has this villager already got tonight's festival in their log?
 *
 *  THE VALUE STORED IS THE FESTIVAL'S NAME, not its id and not a composite key.
 *  That is the museum's lesson applied before it could bite again (ROADMAP §3f
 *  step 7): a memory's value renders STRAIGHT into a dialogue line, so a
 *  villager holding `"2026:the-airing"` would say it out loud, and an id that
 *  has to be looked up to be spoken is a lookup that can fail on an old save.
 *
 *  Which leaves the year, and the year is already there: `MemoryEvent.at` is
 *  when it happened. So "have they got THIS one" is the name plus the calendar
 *  year of the memory, and the table can repeat forever without the second
 *  Airing you attend finding last year's and deciding you had been — the same
 *  class of bug as `redeem` spending junk on a row you already hold, arriving
 *  from the other direction. */
function alreadyLogged(log: { kind: string; at: number; value?: string }[], def: FestivalDef, now: number): boolean {
  const year = new Date(now).getFullYear();
  return log.some((m) => m.kind === "festival" && m.value === def.name && new Date(m.at).getFullYear() === year);
}

// --- Being there ----------------------------------------------------------------
//
// (Where everyone STANDS during a festival is not here — it is content, in
// content/festivals.ts `watchCell`, consulted by `scheduledStop`. A festival
// changes where people are by changing what their routine says for this hour,
// which is why position stays derived and two days away still needs no
// catch-up. The fixed cast never gather because `tickVillager` returns early on
// `def.fixed`, so the counters stay open through the party with no rule written
// for it.)

/** How close to the platform counts as being at the festival. Generous: the
 *  audience cells themselves are two rows deep, and a player who stopped at the
 *  back of the crowd was at the festival. */
const ATTEND_RADIUS = 6;

/** Who is actually at the festival: everybody whose routine sent them, plus the
 *  Blob, who is running it.
 *
 *  BY ROLE, NOT BY DISTANCE, and that correction came off the screen. Asking
 *  "who is within six tiles" put the Office Creature in the crowd — he sits at
 *  (0,-6) and the platform is at (-4,-3), which is five tiles and a wall and a
 *  shut door away. He is an institution; the whole reason the counters stay
 *  open through a festival is that they did not go. A radius cannot know that,
 *  and this is the same predicate `festivalHappened` uses in sim/away.ts, which
 *  is the point — being at a festival is one fact, whether or not you were.
 *
 *  Distance still applies on top of it, for the ordinary reason: somebody
 *  walking across town to get there has not arrived yet. */
export function gatherers(world: WorldState): Villager[] {
  return world.villagers.filter((v) => !v.fixed || v.id === "stage");
}

/** Register that the player is here, if they are.
 *
 *  Called every tick, and idempotent by construction: the memory log of each
 *  villager IS the record of whether they have already noticed you tonight, so
 *  the fiftieth call of the evening finds the key present and does nothing.
 *  That is the reason there is no `world.festival` field — the ledger already
 *  existed, it already serialises, and a count of festivals attended would be a
 *  score with a denominator implied (DESIGN §The museum, the same argument one
 *  institution over).
 *
 *  Returns the festival if this call was the one that registered it, so the UI
 *  can say something once. Null every other tick, and null when you are not
 *  there — which is the entire cost of missing one. */
export function attend(world: WorldState, now: number): FestivalDef | null {
  const def = activeFestival(now);
  if (!def) return null;
  if (Math.hypot(world.player.x - STAGE.x, world.player.y - STAGE.y) > ATTEND_RADIUS) return null;

  let registered = false;
  for (const v of gatherers(world)) {
    if (alreadyLogged(v.memory, def, now)) continue;
    if (Math.hypot(v.x - STAGE.x, v.y - STAGE.y) > ATTEND_RADIUS) continue;
    v.memory = remember(v.memory, { kind: "festival", at: now, value: def.name });
    befriend(v, 1);
    registered = true;
  }
  if (!registered) return null;

  // The player remembers it too, which is what lets their own history read as a
  // life rather than as a list of chores (DESIGN §Player identity).
  if (!alreadyLogged(world.player.memory, def, now)) {
    world.player.memory = remember(world.player.memory, { kind: "festival", at: now, value: def.name });
  }
  return def;
}

/** Did this villager see you at that festival? Read by dialogue so somebody who
 *  was standing next to you can bring it up, and by nothing that accepts or
 *  refuses anything. */
export function sawYouAt(v: Villager, def: FestivalDef, at: number): boolean {
  return alreadyLogged(v.memory, def, at);
}
