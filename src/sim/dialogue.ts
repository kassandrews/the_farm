// Dialogue selection: the logic that turns a villager's memory log + form voice
// into the next thing they say. Written against the memory log, not static
// banks alone (Design invariant) — a villager preferentially says something
// that references a real remembered event, and only falls back to idle voice
// when it has nothing to bring up. Pure + rng-injectable, like The Meadow's
// dialogue layer, so line choice is reproducible in tests.

import type { Villager, WorldState } from "./types";
import type { Rng } from "./rng";
import { recall } from "./memory";
import { friendshipTier } from "./villagers";
import type { MemoryKind } from "./memory";
import { describeHome, NOTE_PRIORITY, URGENT } from "./home";
import type { HomeNote } from "./home";
import type { AdultForm } from "../content/canon/forms";
import {
  OFFICE_LANDCLAIM,
  OFFICE_MEMORY,
  OFFICE_IDLE,
  RESIDENT_MEMORY,
  RESIDENT_HOME,
  SCHOLAR_DISSENT,
  residentIdle,
  warmLines,
} from "../content/dialogue";
import { rivalReading } from "./museum";

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

/** Which memories a form is inclined to bring up, richest first. The selector
 *  walks this list and uses the first kind the villager actually remembers. */
const MEMORY_PRIORITY: MemoryKind[] = [
  // Above everything, because it is the rarest and the most recent thing that
  // can be true between you — twelve times a year, and both of you were there.
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
  return { who: "Tired Office Creature", text: OFFICE_LANDCLAIM[line] };
}

/** The next thing a villager says when talked to. Prefers a memory-referencing
 *  line; otherwise an idle line in the form's voice. Avoids immediately
 *  repeating the last line. */
export function speak(world: WorldState, v: Villager, rng: Rng): Speech {
  // The house goes first when it has something to say. It's the most specific
  // true thing about them right now, and the only one the player can act on.
  const home = tryHomeLine(world, v, rng);
  if (home && rng.next() < home.chance) {
    v.lastLine = home.text;
    return { who: v.name, text: home.text };
  }

  // Then the museum quarrel, if this is a scholar and there is anything in it.
  const dissent = tryDissentLine(world, v, rng);
  if (dissent && rng.next() < DISSENT_CHANCE) {
    v.lastLine = dissent;
    return { who: v.name, text: dissent };
  }

  const memoryLine = tryMemoryLine(v, rng);
  if (memoryLine && rng.next() < MEMORY_CHANCE) {
    v.lastLine = memoryLine;
    return { who: v.name, text: memoryLine };
  }

  // Idle voice, plus whatever warmth this villager has unlocked. Pooling rather
  // than replacing keeps their baseline personality intact — a close friend is
  // still themselves, just occasionally kinder about it.
  const idle = v.id === "office" ? OFFICE_IDLE : residentIdle(v.form);
  const pool = [...idle, ...warmLines(v.form, friendshipTier(v))];
  let text = rng.pick(pool);
  if (text === v.lastLine && pool.length > 1) {
    // one re-roll to dodge an immediate repeat
    text = rng.pick(pool);
  }
  v.lastLine = text;
  return { who: v.name, text };
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
