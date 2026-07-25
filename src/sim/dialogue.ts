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
import {
  OFFICE_LANDCLAIM,
  OFFICE_MEMORY,
  OFFICE_IDLE,
  RESIDENT_MEMORY,
  RESIDENT_HOME,
  residentIdle,
  warmLines,
} from "../content/dialogue";

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

/** Which memories a form is inclined to bring up, richest first. The selector
 *  walks this list and uses the first kind the villager actually remembers. */
const MEMORY_PRIORITY: MemoryKind[] = [
  "exhibit", // freshest: something they did while you were out
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
  const bank = RESIDENT_HOME[v.form] as
    | Partial<Record<string, ((value: string) => string)[]>>
    | undefined;
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
