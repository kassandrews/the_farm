// Dialogue selection: the logic that turns a villager's memory log + form voice
// into the next thing they say. Written against the memory log, not static
// banks alone (Design invariant) — a villager preferentially says something
// that references a real remembered event, and only falls back to idle voice
// when it has nothing to bring up. Pure + rng-injectable, like The Meadow's
// dialogue layer, so line choice is reproducible in tests.

import type { Villager } from "./types";
import type { Rng } from "./rng";
import { recall } from "./memory";
import { friendshipTier } from "./villagers";
import type { MemoryKind } from "./memory";
import {
  OFFICE_LANDCLAIM,
  OFFICE_MEMORY,
  OFFICE_IDLE,
  RESIDENT_MEMORY,
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
export function speak(v: Villager, rng: Rng): Speech {
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
