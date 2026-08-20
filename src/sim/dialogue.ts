// Dialogue selection: the logic that turns a villager's memory log + form voice
// into the next thing they say. Written against the memory log, not static
// banks alone (Design invariant) — a villager preferentially says something
// that references a real remembered event, and only falls back to idle voice
// when it has nothing to bring up. Pure + rng-injectable, like The Meadow's
// dialogue layer, so line choice is reproducible in tests.

import type { Villager, WorldState } from "./types";
import type { Rng } from "./rng";
import { recall, remember } from "./memory";
import { friendshipTier, displayName } from "./friendship";
import type { MemoryKind } from "./memory";
import { describeHome, NOTE_PRIORITY, URGENT } from "./home";
import { describeSeason } from "./seasons";
import { describeHistory } from "./history";
import { tellable, observe } from "./notebook";
import type { HomeNote } from "./home";
import type { AdultForm } from "../content/canon/forms";
import {
  OFFICE_LANDCLAIM,
  OFFICE_MEMORY,
  OFFICE_IDLE,
  RESIDENT_MEMORY,
  RESIDENT_HOME,
  RESIDENT_HISTORY,
  seasonLines,
  SCHOLAR_DISSENT,
  MOLE_DEEP,
  MOLE_SHALLOW,
  MOLE_LIT,
  GHOST_QUIET,
  GHOST_CUT,
  COSMOS_HOME,
  COMPANY_IDLE,
  COMPANY_YES,
  COMPANY_BYE,
  GAME_YES,
  GAME_FOUND,
  GAME_GIVEUP,
  LOOK_AT,
  SITTING_IDLE,
  GAME_OFFER,
  RESIDENT_ABSENCE,
  RESIDENT_MIDST,
  RESIDENT_KIN,
  residentIdle,
  warmLines,
} from "../content/dialogue";
import { ARRIVALS } from "../content/arrivals";
import { isNewcomer } from "../content/cast";
import type { GameId, SpyKind } from "../content/games";
import { sittingAt } from "./play";
import { CAST } from "../content/cast";
import { conversationRoots } from "../content/conversations";
import type { Exchange, Reply } from "../content/conversations";
import type { SetId } from "../content/sets";
import type { SkinId } from "../content/skins";
import { rivalReading } from "./museum";
import { moleGroundShallow, moleLamplit } from "./mole";
import { groveCut } from "./ghost";
import { showerTonight } from "../content/showers";
import { isCompanion } from "./company";

export interface Speech {
  who: string;
  text: string;
  /** Present when this line opens a conversation tree: the player's short
   *  answers, each leading to the next line (content/conversations.ts). The UI
   *  renders them where the close button would sit; a Speech without them is
   *  the single line it always was. */
  replies?: Reply[];
  /** A finish they just handed you, if this was the conversation that crossed
   *  their threshold (sim/friendship.ts `takeGift`). Set by `talk`, not by
   *  `speak` — the line and the gift are two different things arriving in the
   *  same visit, and a Speech that granted unlocks merely by being composed
   *  would fire on every dialogue test that builds one. */
  gave?: SkinId;
  /** A furniture SET they handed over instead — the same beat, the other style
   *  axis (content/sets.ts `given`). Never both in one conversation: the skins
   *  gift is checked first and a person hands you one thing at a time. */
  gaveSet?: SetId;
}

/** Odds a villager reaches for a memory instead of an idle line, when it has a
 *  relevant one. High: remembering is the point of these NPCs. */
const MEMORY_CHANCE = 0.6;

/** Odds of remarking on their home when there's something pleasant to say about
 *  it. Lower than MEMORY_CHANCE on purpose — the house is always there, so a
 *  villager who leads with it every time stops being a person and becomes a
 *  property listing. */
const HOME_CHANCE = 0.35;

/** Odds when the note is one of the URGENT ones (their bed is gone, the walls
 *  are open, there's no door). Near-certain, because these are consequences the
 *  PLAYER caused and the game promises they're legible: a villager who mentions
 *  their missing bed one time in ten is a villager you conclude is fine. */
const URGENT_HOME_CHANCE = 0.85;

/** Odds a scholar resident brings up their standing quarrel with the curator,
 *  when the museum holds something to quarrel about. Between the home odds and
 *  the memory odds: livelier than small talk about a shelf, because it is the
 *  perk and the player should meet it, but below a memory so she doesn't become
 *  a single-issue scholar the moment you donate anything. */
const DISSENT_CHANCE = 0.5;

// The weather is true for three months at a stretch, so it comes up less often
// than anything else that has a rung. Below HOME_CHANCE deliberately: somebody
// who leads with the season every time you meet them is a lift, not a person.
const SEASON_CHANCE = 0.22;

/** How many spoken lines a villager keeps in the said ring. Eight, because the
 *  smallest pools this has to be honest about are the 2-line idle stubs: the
 *  ring may never be allowed to silence a pool (see `fresh`), only to steer a
 *  pool bigger than itself. Deep banks are what Phase 12 exists to add; this is
 *  what makes them READ deep instead of thumbing the same three cards. */
const SAID_MAX = 8;

/** The pool with everything they've recently said removed — unless that empties
 *  it, in which case the whole pool comes back. A villager must always be able
 *  to speak; running a two-line voice dry and going silent would punish exactly
 *  the forms whose banks nobody has written yet. */
function fresh(pool: string[], v: Villager): string[] {
  const left = pool.filter((t) => !v.said.includes(t));
  return left.length > 0 ? left : pool;
}

/** Record a spoken line into the ring. Every path out of `speak` goes through
 *  this, so the ring is the one record of what was recently said. */
function spoke(v: Villager, text: string): void {
  v.said = [...v.said, text].slice(-SAID_MAX);
}

/** `fresh`, for pools that mix plain lines with tree roots: a root is picked
 *  (and ring-tracked) by its opening line, exactly like any other line. */
function freshEx(pool: Exchange[], v: Villager): Exchange[] {
  const left = pool.filter((ex) => !v.said.includes(ex.line));
  return left.length > 0 ? left : pool;
}

const asLine = (line: string): Exchange => ({ line });

/** The player answered: record what the villager says back, and hand it over.
 *  The ring learns tree lines the same as any other, so a tree walked today is
 *  steered away from tomorrow. Deliberately pays NOTHING — friendship was paid
 *  when the conversation started (`talk`), and a reply that paid again would
 *  make talkativeness a move.
 *
 *  A reply carrying a `keepsake` is also REMEMBERED, by this person and nobody
 *  else (tranche 2): you told them, so they know, and the town does not.
 *  `witness` broadcasts because news travels; an answer is not news. */
export function advanceReply(v: Villager, reply: Reply, now: number): Exchange {
  spoke(v, reply.then.line);
  if (reply.keepsake) {
    v.memory = remember(v.memory, { kind: "answered", at: now, value: reply.keepsake });
  }
  return reply.then;
}

/** The button's label: the player-form flavored phrasing where somebody wrote
 *  one, the shared default everywhere else. */
export function replyLabel(reply: Reply, form: AdultForm): string {
  return reply.variants?.[form] ?? reply.text;
}

/** How long you must be gone before anybody says so, and how long before "a few
 *  days" becomes "weeks". Real time, like everything here — the town measures
 *  your absence on the same clock the crops grow on. Three days rather than
 *  one, because a daily check-in is the intended rhythm (DESIGN §Platform) and
 *  greeting a routine as an absence would nag the player for having a life. */
const ABSENCE_DAYS = 3 * 24 * 3600_000;
const ABSENCE_WEEKS = 14 * 24 * 3600_000;

/** No chance roll on the greeting, and that is the design: a "haven't seen you
 *  in a while" that usually fails to fire reads as the game not noticing you
 *  were gone, which is worse than not having the feature. It self-limits —
 *  `speak` stamps `lastTalkedAt` on every conversation, so the greeting fires
 *  once per absence and the clock resets behind it. */
function tryAbsenceLine(v: Villager, away: number | null, rng: Rng): Exchange | null {
  if (away === null || away < ABSENCE_DAYS) return null;
  const bank = RESIDENT_ABSENCE[v.form];
  if (!bank) return null;
  const weeks = away >= ABSENCE_WEEKS;
  const lines = weeks ? (bank.weeks ?? bank.days) : bank.days;
  // Tree roots pool with the flat lines rather than replacing them — how often
  // a greeting opens a conversation is decided by how many of each got written.
  const roots = conversationRoots(v.form, weeks ? "absence_weeks" : "absence_days");
  const pool = [...(lines ?? []).map(asLine), ...roots];
  if (pool.length === 0) return null;
  return rng.pick(freshEx(pool, v));
}

/** The in-the-middle-of rung: a remark about what you are visibly in the middle
 *  of doing. It reads the memory log's REPEATABLE work kinds — three fells or
 *  three harvests inside the window is a morning's work, and a morning's work
 *  is something the town would mention. The one-shot kinds (`dug`,
 *  `built_floor`, `planted`) can't be counted this way on purpose: `remember`
 *  de-duplicates them, so their single entry says "this ever happened", not
 *  "this is happening", and counting it would call a three-week-old hole a
 *  busy morning. */
const MIDST_WINDOW = 45 * 60_000;
const MIDST_MIN = 3;
/** Between HOME_CHANCE and MEMORY_CHANCE: livelier than a remark about a shelf
 *  because it is about RIGHT NOW, but not certain, because somebody narrating
 *  your every third swing is a commentator rather than a neighbour. */
const MIDST_CHANCE = 0.5;
/** Harvest first: it has a value ("a pumpkin") and the more specific true thing
 *  wins, the same argument MEMORY_PRIORITY runs on. */
const MIDST_KINDS: ("harvested" | "gathered")[] = ["harvested", "gathered"];

function tryMidstLine(v: Villager, rng: Rng, now: number): string | null {
  const banks = RESIDENT_MIDST[v.form];
  if (!banks) return null;
  for (const kind of MIDST_KINDS) {
    const recent = v.memory.filter((m) => m.kind === kind && now - m.at <= MIDST_WINDOW);
    if (recent.length < MIDST_MIN) continue;
    const templates = banks[kind];
    if (!templates || templates.length === 0) continue;
    const value = recent[recent.length - 1].value ?? "";
    return rng.pick(fresh(templates.map((t) => t(value)), v));
  }
  return null;
}

/** Which memories a form is inclined to bring up, richest first. The selector
 *  walks this list and uses the first kind the villager actually remembers. */
/** Exported so sim/moments.test.ts can assert every Moment is ranked. A kind
 *  missing from this list has a bank nothing ever reads — which is already true
 *  of `gathered`, `arrived` and `housed`, and is survivable for them because
 *  they have other ways to surface. A Moment has none: the line IS the payout. */
export const MEMORY_PRIORITY: MemoryKind[] = [
  // FIRST, above even the cube, and it is the only thing that will ever go
  // here. Everything below is something you DID that somebody watched; this is
  // something you TOLD THEM, which is the most specific thing that can exist
  // between two people and the only entry in this list the player authored on
  // purpose. It decays like everything else — the log is a bounded ring — so a
  // thing you said stops being the freshest thing as life piles onto it.
  "answered",
  // Above the festival, which is saying something. A festival is twelve times a
  // year and the whole town was at it; a day underground was the two of you and
  // nobody else has one. It is the most specific true thing that can exist
  // between a player and a villager, so it is the first thing they reach for —
  // and it decays the same way everything here does, because the log is a
  // bounded ring and ordinary life piles up on top of it.
  // Above even the tunnel, and it is the only thing that ever will be. A day
  // underground is rare; standing in front of the cube is once, ever, in a place
  // nobody else in the town has been, and the memory is the ONLY thing the walk
  // out there produces (sim/memory.ts §hum). If it ranked below anything, the
  // one payout of the game's quietest secret could be crowded out by an ordinary
  // Tuesday's dig.
  "hum",
  // ABOVE the tunnel, and it is the last thing that ever gets to be. The
  // staircase is rarer than a shaft by an order of magnitude — you dig your own
  // hole whenever you like, and there is exactly one flight of steps in a
  // hundred that goes anywhere — so the day somebody went up with you is the
  // rarest afternoon in their log. It ranks under the cube because the cube is
  // once, ever, and this is not.
  "climbed",
  "delved",
  // A Moment (DESIGN §Moments), and it ranks here on the same rarity argument as
  // everything above it: past the survey's edge is a walk almost nobody in this
  // town has any reason to take, and taking it with somebody is a day that
  // exists between exactly the two of you. Under `delved` because a shaft goes
  // somewhere nobody has ever been, where the far country is merely somewhere
  // nobody bothered to arrange.
  "far_out",
  // THE FOURTH MOMENT, AND IT OUTRANKS THE OTHER WALK. `far_out` is the edge of
  // the survey, which is a distance anybody could walk in any direction; this is
  // a sited region on a ring at six hundred tiles that you had to find. Rarity
  // plus company is what this whole list is sorted by, and nothing below the cube
  // is rarer than an afternoon spent standing in the one place in the world that
  // is drawn wrong.
  "the_static",
  // The games (sim/play.ts). Above `company` because a game is a walk PLUS a
  // specific thing the two of you did on it; below the places above, because
  // those are afternoons almost nobody in the town has had. The line here is
  // the whole payout of a game — no item, no unlock, nothing gates on one —
  // so like the Moments, an unranked kind would be a memory that exists and
  // can never be spoken.
  "hid",
  "spied",
  "company",
  // The other rare Moment, and ABOVE the festival for the reason the festival
  // itself is high: rarity plus company. There are five real showers in a year
  // against twelve festivals, the dates cannot be moved by anybody, and the
  // festival gathers the whole town where a shower gathers whoever you happened
  // to be standing with.
  "shower",
  // Above everything else, because it is rare and recent — twelve times a year,
  // and both of you were there.
  // It also decays on its own: the log is a bounded ring, so a festival stops
  // being the freshest thing as ordinary life piles up on top of it.
  "festival",
  "exhibit", // freshest: something they did while you were out
  // Above the farming lines because an errand is something you did FOR THIS
  // PERSON, where a harvest is something they merely watched. The most specific
  // true thing between the two of you should be the thing they reach for.
  "errand",
  // The third Moment, and the low one, because it is the only one here that is
  // not rare: winter arrives every year for everybody, and the two of you being
  // outdoors in it is the least unlikely thing on this list. It stays above the
  // farming lines because it is still something you were both there for, where a
  // harvest is something they watched you do.
  "winter_came",
  "harvested",
  "built_floor",
  "planted",
  "raised_by",
  "raised_favorite",
  "dug",
];

/** The scripted land-claim beat, line by line (DESIGN §"Opening beat"). The
 *  caller advances `line` 0..N and shows each; past the end returns null. */
export function officeLandClaimLine(line: number): Speech | null {
  if (line < 0 || line >= OFFICE_LANDCLAIM.length) return null;
  // Read off the table, never a literal. This said "Tired Office Creature" for
  // as long as that was his name, which meant the naming pass had to find it —
  // and the only reason it did is that the string was distinctive. A speaker
  // label written out by hand is a label that drifts the next time somebody is
  // renamed, silently, in the one beat the whole game opens on.
  return { who: CAST.office.name, text: OFFICE_LANDCLAIM[line] };
}

/** The bank a secret speaks from, or null for everybody else.
 *
 *  Each of the three has exactly one live variable, and all three read it off
 *  the world at the moment you speak to them rather than out of a memory log:
 *  the Mole can see the ladder, she can see the gap in her trees, and the sky is
 *  doing what the sky is doing. Gating any of it on an away roll would mean they
 *  hadn't noticed something standing in front of them. */
function trySecretLine(world: WorldState, v: Villager, now: number): string[] | null {
  // Three banks now, and the lamp is checked first — see MOLE_LIT for why the
  // newer intrusion has to win over the larger one.
  if (v.id === "mole") {
    if (moleLamplit(world)) return MOLE_LIT;
    return moleGroundShallow(world) ? MOLE_SHALLOW : MOLE_DEEP;
  }
  if (v.id === "ghost") return groveCut(world) ? GHOST_CUT : GHOST_QUIET;
  if (v.id === "cosmos") {
    // Her variable is WHICH NIGHT it is, and there are five of them — plus, since
    // Phase 7c, WHERE SHE IS. At home in the sky she speaks from her own bank,
    // because a woman standing in her own front room has different things to say
    // than the same woman passing through your garden at two in the morning.
    //
    // The old floor line ("...") is gone and its comment was wrong by the end:
    // it said `present` meant the UI could never reach her on a showerless
    // night, and now it can, three hundred and sixty days a year. Which is
    // exactly the kind of "unreachable" branch that turns out to be the main
    // path once a phase moves under it.
    if ((v.layer ?? "surface") === "sky") return COSMOS_HOME;
    const shower = showerTonight(now);
    return shower ? shower.lines : ["..."];
  }
  return null;
}

/** The next thing a villager says when talked to. Prefers a memory-referencing
 *  line; otherwise an idle line in the form's voice. Avoids immediately
 *  repeating the last line. */
export function speak(world: WorldState, v: Villager, rng: Rng, now: number): Speech {
  // The Mole answers before any of this, and from his own bank only. He has no
  // house, no ring, no memories of the town and no opinion about your shelf —
  // every branch below is about being a resident of a place he does not live
  // in. His one variable is whether you dug a shortcut to him, and he reads
  // that off the live world rather than off a memory, for the reason the
  // scholar's dissent does: it is a fact he can see from where he is standing,
  // and gating it on an away roll would mean he hadn't noticed the ladder.
  //
  // The other two secrets answer here for the same reason, and the three of them
  // are one branch rather than three because the reason does not vary: none of
  // them is a resident of the town, so none of the resident machinery below has
  // anything true to say about them. Each has its own live variable and reads it
  // off the world, never off a memory.
  // A told observation, ABOVE the secrets branch and above everything else.
  //
  // Above the secrets specifically, because three of the seven told rows are
  // spoken BY the secrets — the Mole about the metal, the Ghost about her wood,
  // the Cosmos about the showers — and `trySecretLine` returns early for
  // exactly those three. Below it, the half of this feature that belongs to the
  // most interesting characters in the game could never fire once.
  //
  // First overall is right anyway: these are one-shot, gated on somebody
  // actually knowing you, and there are seven of them in the whole game. A line
  // that can be said once beats a line that can be said every day.
  // How long since the last conversation, measured BEFORE the stamp below
  // resets it. Null means the game doesn't know (a fresh villager, or a save
  // from before v32 tracked it), and an absence the game never measured is an
  // absence it doesn't get to remark on.
  const away = v.lastTalkedAt === undefined ? null : now - v.lastTalkedAt;
  v.lastTalkedAt = now;
  const say = (text: string): Speech => {
    spoke(v, text);
    return { who: displayName(v), text };
  };
  const sayEx = (ex: Exchange): Speech => {
    spoke(v, ex.line);
    return { who: displayName(v), text: ex.line, replies: ex.replies };
  };

  const telling = tryTellLine(world, v, now);
  if (telling) return say(telling);

  const secret = trySecretLine(world, v, now);
  if (secret) return say(rng.pick(fresh(secret, v)));

  // The greeting, above everything a resident could otherwise open with: being
  // gone a while is the most specific true thing about THIS conversation, and
  // a "haven't seen you" that arrives three taps in has stopped being a
  // greeting. Below the secrets on purpose — the three of them speak only from
  // their own banks (see above), and a generic greeting in the Mole's mouth
  // would be the resident machinery claiming somebody it has no claim on.
  const absence = tryAbsenceLine(v, away, rng);
  if (absence) return sayEx(absence);

  // The house goes first when it has something to say. It's the most specific
  // true thing about them right now, and the only one the player can act on.
  const home = tryHomeLine(world, v, rng);
  if (home && rng.next() < home.chance) return say(home.text);

  // Then the museum quarrel, if this is a scholar and there is anything in it.
  const dissent = tryDissentLine(world, v, rng);
  if (dissent && rng.next() < DISSENT_CHANCE) return say(dissent);

  // What you are visibly in the middle of. Above the memory rung because it is
  // about right now, and the ladder is a specificity ladder: this morning's
  // third fell beats last month's afternoon underground.
  const midst = tryMidstLine(v, rng, now);
  if (midst && rng.next() < MIDST_CHANCE) return say(midst);

  const memoryLine = tryMemoryLine(v, rng);
  if (memoryLine && rng.next() < MEMORY_CHANCE) return say(memoryLine);

  // Then the room you're both standing in. Below memory and above the season,
  // which is exactly where it belongs on the same specificity ladder: something
  // you and this person did together beats something that happened in this
  // room, and something that happened in this room beats the weather.
  const historyLine = tryHistoryLine(world, v, rng, now);
  if (historyLine && rng.next() < HISTORY_CHANCE) return say(historyLine);

  // The month, which is the least specific true thing anybody can say and so
  // goes last before idle. Below memory on purpose: something you and this
  // person did together is always more specific than the weather.
  const seasonLine = trySeasonLine(world, v, now, rng);
  if (seasonLine && rng.next() < SEASON_CHANCE) return say(seasonLine);

  // Idle voice, plus whatever warmth this villager has unlocked. Pooling rather
  // than replacing keeps their baseline personality intact — a close friend is
  // still themselves, just occasionally kinder about it.
  //
  // A companion's walking bank pools the same way, for the same reason. Somebody
  // who is with you right now still has their ordinary things to say; replacing
  // their voice with a "following you" bank would make company a mode the
  // character enters rather than an afternoon the character is having.
  const idle = v.id === "office" ? OFFICE_IDLE : residentIdle(v.form);
  const pool = [
    ...idle.map(asLine),
    // Their OWN lines, on top of their form's: an arrival's row carries the
    // rest of "the one line that's theirs" (content/arrivals.ts §lines), so
    // Biscuit and Waffle stop being one dog with two names.
    ...(isNewcomer(v.id) ? (ARRIVALS[Number(v.id.slice("newcomer:".length))]?.lines ?? []) : []).map(asLine),
    // Kinship: said only to a player of the speaker's own form. Recognition,
    // not a mechanic — nothing anywhere knows the forms matched.
    ...(world.player.form === v.form ? (RESIDENT_KIN[v.form] ?? []) : []).map(asLine),
    ...warmLines(v.form, friendshipTier(v)).map(asLine),
    ...(isCompanion(world, v.id) ? (COMPANY_IDLE[v.form] ?? []).map(asLine) : []),
    // And, sitting down together, the bench's own pool on top of the walk's —
    // same mechanism, one more circumstance. The lines are about being
    // stopped somewhere, which is the whole difference between a walk and a
    // sit (content/dialogue.ts SITTING_IDLE).
    ...(isCompanion(world, v.id) && sittingAt(world) ? (SITTING_IDLE[v.form] ?? []).map(asLine) : []),
    // Idle trees pool in like idle lines — the town square is exactly where a
    // conversation should be able to start, and how often one does is decided
    // by the bank's proportions rather than a second chance roll.
    ...conversationRoots(v.form, "idle"),
  ];
  return sayEx(rng.pick(freshEx(pool, v)));
}

/** A line about the month, or null if this villager shouldn't be saying one.
 *
 *  Prefers the in-season crop bank when there is actually one of that variety in
 *  the ground and this form has something written for it, and otherwise talks
 *  about the weather. Same fall-through shape as `tryHomeLine`: prefer the more
 *  specific note, but never go quiet because nobody wrote that form's line.
 *
 *  THE COMPARISON IS NOT MADE HERE. `describeSeason` decides which month it is
 *  and whether the crop counts, so this rung and the renderer's flourish can
 *  never disagree about the same plant. */
function trySeasonLine(world: WorldState, v: Villager, now: number, rng: Rng): string | null {
  // The fixed cast at their counters are institutions rather than neighbours,
  // but they DO have season banks — the Menace on trade in the cold and the
  // Office Creature filing the weather are exactly the deadpan the tone asks
  // for. Only the office's scripted land-claim beat is excluded, and that is
  // handled above this rung.
  const note = describeSeason(world, now);
  const bank = seasonLines(v.form, note.season);
  if (note.kind === "in_season_crop" && bank.crop && bank.crop.length > 0) {
    return rng.pick(fresh(bank.crop.map((t) => t(note.value)), v));
  }
  if (bank.season.length === 0) return null;
  return rng.pick(fresh(bank.season, v));
}

/** Find a line about where they live, or null. Returns the odds along with it,
 *  because how readily a villager brings something up is part of what the note
 *  MEANS — a missing bed and a nice shelf are not the same kind of remark, and
 *  deciding that at the call site would put the judgement two modules away from
 *  the vocabulary it's judging. */
function tryHomeLine(world: WorldState, v: Villager, rng: Rng): { text: string; chance: number } | null {
  const bank = homeBank(v.form);
  if (!bank) return null;

  // describeHome already sorts by NOTE_PRIORITY; walking the priority list
  // rather than the notes lets a form with no line for its richest note fall
  // through to one it CAN speak to, instead of going quiet.
  const notes = describeHome(world, v);
  for (const kind of NOTE_PRIORITY) {
    const note = notes.find((n) => n.kind === kind);
    if (!note) continue;
    const templates = bank[kind];
    if (!templates || templates.length === 0) continue;
    return {
      text: rng.pick(fresh(templates.map((t) => t(note.value)), v)),
      chance: URGENT.includes(kind) ? URGENT_HOME_CHANCE : HOME_CHANCE,
    };
  }
  return null;
}

function homeBank(
  form: AdultForm,
): Partial<Record<string, ((value: string) => string)[]>> | undefined {
  return RESIDENT_HOME[form] as Partial<Record<string, ((value: string) => string)[]>> | undefined;
}

/** One line about a SPECIFIC home note, for a caller that already knows which
 *  note it wants said. Null when this form has nothing for it.
 *
 *  Exists so the commission's payoff moment can use the same banks as idle
 *  conversation instead of carrying a second set of lines about houses. The
 *  odds machinery deliberately stays out of it: `tryHomeLine` decides how
 *  READILY something comes up in passing, and a beat that has already decided
 *  to speak isn't asking that question. */
export function homeLineFor(form: AdultForm, note: HomeNote, rng: Rng): string | null {
  const templates = homeBank(form)?.[note.kind];
  if (!templates || templates.length === 0) return null;
  return rng.pick(templates)(note.value);
}

/** A Scholar resident's own reading of a recent exhibit, which disagrees with
 *  the curator's (DESIGN §Affinity perks). Null for every other form, for the
 *  curator herself, and for a museum with nothing in it.
 *
 *  Keyed by FORM because it is a perk — personality leaking out, not a stat and
 *  not a duty. It asks nothing of her, nothing in the game needs a scholar to
 *  exist, and a town without one simply never hears it. That is the line between
 *  a perk and a job (Design invariant: form is identity, never a job).
 *
 *  The curator is excluded by ID, never by form. Finding her by form is the bug
 *  the away event already shipped once: `ensureFixedCast` appends institutions
 *  after the residents, so "the scholar" was Corrigal in a new town and Margfrom
 *  in an older one, and the same beat landed on different people depending on
 *  how old your save was. Institutions are found by id. Her conversation is the
 *  panel, and a curator who disagrees with her own card in the doorway would
 *  undercut every placard in the building.
 *
 *  It reads the live record rather than waiting on an `exhibit` memory, which is
 *  a deliberate departure from how the other lines here work. The museum is a
 *  public room she can walk into; a scholar with no opinion about a wing you
 *  filled this afternoon, because no away roll has fired yet, would be a worse
 *  falsehood than any the log protects against. RESIDENT_MEMORY.scholar.exhibit
 *  stays where it is, for a scholar who actually witnesses a remounting.
 *
 *  Her POSITION is fixed (see `rivalReading`); only the phrasing rolls, so she
 *  restates the same quarrel in different words rather than inventing new ones. */
function tryDissentLine(world: WorldState, v: Villager, rng: Rng): string | null {
  if (v.form !== "scholar" || v.id === "museum") return null;
  const reading = rivalReading(world, v.id);
  if (!reading) return null;
  return rng.pick(fresh(SCHOLAR_DISSENT.map((t) => t(reading.def.title, reading.rival)), v));
}

/** Something this character has privately concluded and will now say out loud,
 *  once — and the Notebook entry that writes it down (Phase 9c).
 *
 *  WRITES, unlike every other `try*` in this file, and that is deliberate: being
 *  told is a conversation and not a delivery, so the entry has to be recorded by
 *  the act of them saying it. Recording it anywhere else — a sweep that noticed
 *  you had become their friend — would produce a journal entry about a
 *  conversation that never happened.
 *
 *  No chance roll. Every other line here is one of many a villager could say
 *  today; this is the only one they will ever say, so making it a coin flip
 *  would just mean standing there talking until it came up. */
function tryTellLine(world: WorldState, v: Villager, now: number): string | null {
  const [def] = tellable(world, v.id, now);
  if (!def) return null;
  observe(world, def.id, now);
  return def.remark ?? null;
}

/** Odds a villager remarks on the history of the room you're both standing in.
 *  Low, and lower than the season: it fires only indoors, so it is already rare
 *  by geography, and the thing it is competing with is a person telling you
 *  something about themselves. A room's past should feel like something you
 *  caught them thinking about, not their opening move. */
const HISTORY_CHANCE = 0.3;

/** Something a villager could say about the room you are BOTH IN, or null.
 *
 *  Their coordinates, not the player's, and not their home: it is a remark
 *  about where this conversation is happening. Outdoors there is no room and so
 *  nothing to say, which is the correct shape — you get these lines by standing
 *  inside somewhere together.
 *
 *  Skips notes about the speaker (see RESIDENT_HISTORY's header): a villager
 *  narrating their own tenancy at you is the game doing its remembering out
 *  loud. `built_floor` has no `who` at all, so it always survives the filter. */
function tryHistoryLine(world: WorldState, v: Villager, rng: Rng, now: number): string | null {
  const banks = RESIDENT_HISTORY[v.form];
  if (!banks) return null;

  for (const note of describeHistory(world, Math.round(v.x), Math.round(v.y), now)) {
    if (note.who === displayName(v)) continue;
    const templates = banks[note.kind];
    if (!templates || templates.length === 0) continue;
    return rng.pick(fresh(templates.map((t) => t(note.who)), v));
  }
  return null;
}

/** Find a memory-referencing line the villager could say right now, or null. */
function tryMemoryLine(v: Villager, rng: Rng): string | null {
  const banks =
    v.id === "office"
      ? OFFICE_MEMORY
      : (RESIDENT_MEMORY[v.form] as Partial<Record<string, ((value: string) => string)[]>> | undefined);
  if (!banks) return null;

  for (const kind of MEMORY_PRIORITY) {
    const ev = recall(v.memory, kind);
    if (!ev) continue;
    const templates = banks[kind];
    if (!templates || templates.length === 0) continue;
    return rng.pick(fresh(templates.map((t) => t(ev.value ?? "")), v));
  }
  return null;
}

/** What they say when they agree to come along, and what they say when their own
 *  day takes them home again (sim/company.ts).
 *
 *  Two plain pickers rather than a branch inside `speak`, because neither of
 *  these is a thing a villager might say — they are things that happen at an
 *  exact moment, and the caller already knows which moment it is. Same reasoning
 *  as `homeLineFor`: a beat that has already decided to speak is not asking how
 *  readily something comes up.
 *
 *  Both fall back rather than return null. A form with no bank still has to be
 *  able to say yes, or the invitation would silently do nothing on screen for
 *  exactly the forms whose lines nobody has written yet. */
export function companyYesLine(form: AdultForm, rng: Rng): string {
  return rng.pick(COMPANY_YES[form] ?? ["...", "All right. Lead on."]);
}

export function companyByeLine(form: AdultForm, rng: Rng): string {
  return rng.pick(COMPANY_BYE[form] ?? ["...", "That's me for the day. Go well."]);
}

/** What somebody says handing you a finish. No `rng` and no fallback, unlike
 *  every bank above it: there is exactly one line per gift, because a gift
 *  happens once and a pool you draw one item from is a pool of one. A missing
 *  line is a content bug rather than something to paper over at runtime, and
 *  skins.test.ts fails on it. */
export { givenLine, givenSetLine } from "../content/dialogue";

// The game beats, same shape as the company pair above. The fallbacks exist
// for safety, not for use: play_lines.test.ts asserts every playable form has
// a real line in every one of these banks, so "..." here is the same promise
// companyYesLine makes — unreachable until somebody adds a form.
export function gameYesLine(game: GameId, form: AdultForm, rng: Rng): string {
  return rng.pick(GAME_YES[game]?.[form] ?? ["..."]);
}

export function gameFoundLine(game: GameId, form: AdultForm, rng: Rng): string {
  return rng.pick(GAME_FOUND[game]?.[form] ?? ["..."]);
}

export function gameGiveUpLine(game: GameId, form: AdultForm, rng: Rng): string {
  return rng.pick(GAME_GIVEUP[game]?.[form] ?? ["..."]);
}

/** "Look at this" — they consider the thing you pointed at. Routed through
 *  the said ring like any spoken line, so showing somebody the same fence
 *  twice steers to a different remark while the bank has one. Pays nothing
 *  and writes nothing — see LOOK_AT's header for why that's a design call
 *  and not a gap. */
export function lookAtLine(v: Villager, kind: SpyKind, rng: Rng): string {
  const line = rng.pick(fresh(LOOK_AT[v.form]?.[kind] ?? ["..."], v));
  spoke(v, line);
  return line;
}

/** A companion proposing a game (sim/play.ts `offerDue`) — through the said
 *  ring, so a long afternoon of walks doesn't hear the same proposal twice
 *  running. */
export function gameOfferLine(v: Villager, rng: Rng): string {
  const line = rng.pick(fresh(GAME_OFFER[v.form] ?? ["..."], v));
  spoke(v, line);
  return line;
}

/** The bench's unprompted remark (sim/play.ts `satLineDue`) — the same pool
 *  the conversation panel draws sitting lines from, said into the quiet
 *  instead. One pool for both on purpose: a bench does not have two voices. */
export function sittingLine(v: Villager, rng: Rng): string {
  const line = rng.pick(fresh(SITTING_IDLE[v.form] ?? ["..."], v));
  spoke(v, line);
  return line;
}
