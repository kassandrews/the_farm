// Dialogue banks, as data. Pure line pools in The Meadow's house voice —
// per-form, brief, distinct openers, ellipsis style (". ... Capital"), and
// "..." as a valid complete line (CLAUDE.md §Tone). No logic here: selection
// (which line, whether to reminisce) lives in src/sim/dialogue.ts, which reads
// these banks against the villager's memory log.
//
// House rule inherited from The Meadow: villagers who remember are the whole
// point (DESIGN §"NPCs that remember"). So every resident bank ships MEMORY
// templates — lines that only fire when the log actually holds the referenced
// event, phrased in that form's voice.

import type { AdultForm } from "./canon/forms";
import type { CharId } from "./cast";

export type LineBank = Partial<Record<string, string[]>>;

// --- The Tired Office Creature: the land-claim beat + counter idle -----------
// The whole opening cutscene is this creature stamping a permit (DESIGN
// §"Opening beat"). Institutional absurdism played straight.
export const OFFICE_LANDCLAIM: string[] = [
  "Welcome to the Farm. You're expected. Everyone is, eventually.",
  "Plot on the edge of town. Standard issue. Congratulations, I suppose.",
  "I'll need to stamp this. The stamping is the important part. Not the land. The stamp.",
  "*stamps the claim*\n. ... There. It's yours now. Legally. Emotionally, that's between you and the soil.",
];

export const OFFICE_IDLE: string[] = [
  "Another arrival. I'll add you to the list. The list is mostly me.",
  "Land claims, permits, the slow paperwork of an afterlife. Riveting.",
  "You settled in? Good. Don't make me file anything.",
  "This could have been a postcard.",
  "I'm not tired. I'm... between energies.",
  "Per my last stamp.",
];

// A tiny reactive bank the office pulls from once the player has done things —
// it notices your homestead taking shape, in its own flat way.
export const OFFICE_MEMORY: Partial<Record<string, ((v: string) => string)[]>> = {
  built_plank: [
    () => "I see you've been building. Unpermitted, but I'll allow it. Don't tell the stamp.",
    () => "Floorboards, is it. The homestead grows. Noted. Filed. Forgotten by lunch.",
  ],
  harvested_carrot: [
    (v) => `Word is you pulled ${v} out of the ground. The Carrot will pretend not to care.`,
  ],
};

// --- Resident voices, per form. The slice ships the Scholar's; the rest are
// stubbed so an imported villager of any form still speaks in character. ------
export const RESIDENT_IDLE: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "I am conducting research. On the fence. It's a good fence.",
    "Preliminary findings: this town is real. I'll want a second sample.",
    "The soil here is confidently loamy. I've written it down.",
    "Retirement is just fieldwork with no funding.",
    "I have a hypothesis about you. Ongoing.",
    "Citation needed. From the sky. It's being evasive.",
  ],
  office: [
    "I retired. I still check a calendar. It's blank. It's glorious.",
    "Following up on my previous sigh.",
  ],
  dog: ["You're here! You're HERE. Okay. Okay. Where are we going.", "I found a stick. It's the best one. So far."],
  blob: ["This town lacks drama. I have brought some.", "I am reclining meaningfully."],
  menace: ["How rustic. I suppose it will do.", "You may remain."],
  gremlin: ["I moved a fence. Statistically, one of them is wrong now.", "Finders keepers. Everything is findable."],
};

// Memory-referencing lines: only offered when the log holds the matching event.
// `v` is the remembered value (a Meadow name, a food, a witnessed thing).
export const RESIDENT_MEMORY: Partial<Record<AdultForm, Partial<Record<string, ((v: string) => string)[]>>>> = {
  scholar: {
    // Imported raising history from The Meadow (see meadow_import.ts).
    raised_favorite: [
      (v) => `They fed me ${v}, back before. I've since disproven ${v}. It remains delicious.`,
      (v) => `My file says I favoured ${v}. My file is correct. Rare, for a file.`,
    ],
    raised_by: [
      (v) => `${v} raised me. I was a difficult subject. I have the notes.`,
      (v) => `. ... ${v}. I remember ${v}. The dark, the lantern, the whole methodology.`,
    ],
    // Events witnessed here on the Farm.
    built_plank: [
      () => "You built that yourself? Tile by tile? Fascinating. Wildly inefficient. I approve.",
      () => "I watched you lay those boards. I took notes. The notes say: 'good.'",
    ],
    planted_carrot: [
      () => "You've planted. I'll monitor the plot. For science, and because I'm nosy.",
    ],
    harvested_carrot: [
      (v) => `You pulled ${v}. The data is conclusive: you are a farmer now. Congratulations, subject.`,
    ],
  },
  // Other forms fall back to idle if they have no memory line for an event.
};

/** Small helper the sim uses to look up a resident's idle bank with a safe
 *  default, so an unstubbed form never speaks as an empty string. */
export function residentIdle(form: AdultForm): string[] {
  return RESIDENT_IDLE[form] ?? ["...", "*settles in*", "It's nice here. Quietly."];
}

/** Fixed-cast idle banks by character. */
export function castIdle(id: CharId): string[] {
  if (id === "office") return OFFICE_IDLE;
  return ["..."];
}
