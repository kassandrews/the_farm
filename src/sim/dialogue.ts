// Dialogue selection: the logic that turns a villager's memory log + form voice
// into the next thing they say. Written against the memory log, not static
// banks alone (Design invariant) — a villager preferentially says something
// that references a real remembered event, and only falls back to idle voice
// when it has nothing to bring up. Pure + rng-injectable, like The Meadow's
// dialogue layer, so line choice is reproducible in tests.

import type { Villager, WorldState } from "./types";
import type { Rng } from "./rng";
import { recall } from "./memory";
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
  residentIdle,
  warmLines,
} from "../content/dialogue";
import { CAST } from "../content/cast";
import { rivalReading } from "./museum";
import { moleGroundShallow, moleLamplit } from "./mole";
import { groveCut } from "./ghost";
import { showerTonight } from "../content/showers";
import { isCompanion } from "./company";

export interface Speech {
  who: string;
  text: string;
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

/** Which memories a form is inclined to bring up, richest first. The selector
 *  walks this list and uses the first kind the villager actually remembers. */
const MEMORY_PRIORITY: MemoryKind[] = [
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
  "company",
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
  "harvested_carrot",
  "built_plank",
  "planted_carrot",
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
  const telling = tryTellLine(world, v, now);
  if (telling) {
    v.lastLine = telling;
    return { who: displayName(v), text: telling };
  }

  const secret = trySecretLine(world, v, now);
  if (secret) {
    let text = rng.pick(secret);
    if (text === v.lastLine && secret.length > 1) text = rng.pick(secret);
    v.lastLine = text;
    return { who: displayName(v), text };
  }

  // The house goes first when it has something to say. It's the most specific
  // true thing about them right now, and the only one the player can act on.
  const home = tryHomeLine(world, v, rng);
  if (home && rng.next() < home.chance) {
    v.lastLine = home.text;
    return { who: displayName(v), text: home.text };
  }

  // Then the museum quarrel, if this is a scholar and there is anything in it.
  const dissent = tryDissentLine(world, v, rng);
  if (dissent && rng.next() < DISSENT_CHANCE) {
    v.lastLine = dissent;
    return { who: displayName(v), text: dissent };
  }

  const memoryLine = tryMemoryLine(v, rng);
  if (memoryLine && rng.next() < MEMORY_CHANCE) {
    v.lastLine = memoryLine;
    return { who: displayName(v), text: memoryLine };
  }

  // Then the room you're both standing in. Below memory and above the season,
  // which is exactly where it belongs on the same specificity ladder: something
  // you and this person did together beats something that happened in this
  // room, and something that happened in this room beats the weather.
  const historyLine = tryHistoryLine(world, v, rng, now);
  if (historyLine && rng.next() < HISTORY_CHANCE) {
    v.lastLine = historyLine;
    return { who: displayName(v), text: historyLine };
  }

  // The month, which is the least specific true thing anybody can say and so
  // goes last before idle. Below memory on purpose: something you and this
  // person did together is always more specific than the weather.
  const seasonLine = trySeasonLine(world, v, now, rng);
  if (seasonLine && rng.next() < SEASON_CHANCE) {
    v.lastLine = seasonLine;
    return { who: displayName(v), text: seasonLine };
  }

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
    ...idle,
    ...warmLines(v.form, friendshipTier(v)),
    ...(isCompanion(world, v.id) ? (COMPANY_IDLE[v.form] ?? []) : []),
  ];
  let text = rng.pick(pool);
  if (text === v.lastLine && pool.length > 1) {
    // one re-roll to dodge an immediate repeat
    text = rng.pick(pool);
  }
  v.lastLine = text;
  return { who: displayName(v), text };
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
    return rng.pick(bank.crop)(note.value);
  }
  if (bank.season.length === 0) return null;
  const text = rng.pick(bank.season);
  // One re-roll to dodge an immediate repeat, as every other rung does.
  return text === v.lastLine && bank.season.length > 1 ? rng.pick(bank.season) : text;
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
      text: rng.pick(templates)(note.value),
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
  return rng.pick(SCHOLAR_DISSENT)(reading.def.title, reading.rival);
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
 *  loud. `built_plank` has no `who` at all, so it always survives the filter. */
function tryHistoryLine(world: WorldState, v: Villager, rng: Rng, now: number): string | null {
  const banks = RESIDENT_HISTORY[v.form];
  if (!banks) return null;

  for (const note of describeHistory(world, Math.round(v.x), Math.round(v.y), now)) {
    if (note.who === displayName(v)) continue;
    const templates = banks[note.kind];
    if (!templates || templates.length === 0) continue;
    return rng.pick(templates)(note.who);
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
    const tmpl = rng.pick(templates);
    return tmpl(ev.value ?? "");
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
