// The Notebook's entries (DESIGN §The Notebook).
//
// A naturalist's journal, kept by somebody living in a place. Entries are
// OBLIQUE — they state something true and stop, and they never explain what it
// is for. "The veins do not come back" is an observation; "mine ore to unlock
// the lamp" is a manual, and this is not one.
//
// THERE IS NO FAUNA IN THIS GAME. None — not a bird, not a fish, not an insect.
// The two birds that once crossed the title sky were removed because three
// pixels cannot draw flight (content/props.ts), and the poled pond exists
// precisely because there is nothing to catch in it (content/found.ts: "the
// poles are not fishing equipment, they are evidence of a committee"). So the
// canonical naturalist's line — "owls have only been seen near very old
// forests" — is not available and never was. What IS out there is ground,
// water, weather, light, trees, rock, distance and shape, and the town. Write
// about those. An entry that mentions an animal is describing a different game.
//
// TWO KINDS, AND THEY DO NOT SOUND ALIKE.
//
//   • `noticed` — a field note in your own hand. Terse, present-perfect,
//     slightly clipped, the voice of somebody writing standing up. No "I" where
//     it can be dropped, which is how field notes actually read.
//   • `told` — somebody said it to you. `{who}` is their name, substituted at
//     render so a rename never breaks the book. The entry records that they
//     were the one who said it, and the REMARK is what they actually said, in
//     their own voice — the book is your paraphrase of it, which is why the two
//     strings differ and must keep differing.
//
// NO ENTRY MAY NAME A TASK. Past tense about something that is true. The moment
// one reads as an instruction the journal has become a quest log.

import type { CharId } from "./cast";
import { CAST, MOLE, GHOST, COSMOS } from "./cast";

export type ObservationId =
  // --- Noticed: the wild ------------------------------------------------------
  | "far-out"
  | "dusk-wood"
  | "glimmer-country"
  | "glass-country"
  | "the-fen"
  | "the-blossom"
  | "the-sea"
  | "poled-pond"
  | "ring-grove"
  | "stair-to-nothing"
  | "deep-rock"
  | "above-the-cloud"
  | "the-hum"
  | "a-busy-sky"
  // --- Noticed: the town ------------------------------------------------------
  | "the-datum"
  | "the-museum-is-large"
  // --- Told -------------------------------------------------------------------
  | "veins-do-not-return"
  | "the-dark-wood"
  | "she-is-simply-around"
  | "their-own-month"
  | "the-ground-keeps-things"
  | "it-gathers-anyway"
  | "the-peg";

export interface ObservationDef {
  id: ObservationId;
  /** What the book says. `{who}` is the speaker's name, on told rows only. */
  line: string;
  source: "noticed" | "told";
  /** Told rows only: who says it. */
  from?: CharId;
  /** Told rows only: what they actually say, in their own voice. Deliberately
   *  not the same string as `line` — they speak, and you write it down after. */
  remark?: string;
}

export const OBSERVATIONS: ObservationDef[] = [
  // --- Noticed: the wild ------------------------------------------------------
  {
    id: "far-out",
    source: "noticed",
    line: "Farther out than the survey bothered with. The ground here is not arranged in any way. It is the first of it I have stood on that nobody put down.",
  },
  {
    id: "dusk-wood",
    source: "noticed",
    line: "A wood where the light is very slightly wrong. Not darker. Later, somehow, than the hour it actually is.",
  },
  {
    id: "glimmer-country",
    source: "noticed",
    line: "Ground that gives light back after the sky has stopped giving any. Stood on it a while to check. It does.",
  },
  {
    id: "glass-country",
    source: "noticed",
    line: "Everything out here rings very faintly underfoot. Whatever the ground is, it is not soil, and it has not been soil for a long time.",
  },
  {
    id: "the-fen",
    source: "noticed",
    line: "Wet ground that never quite becomes water. Walking is slower here and no shorter way exists; the fen is the shape it is.",
  },
  {
    id: "the-blossom",
    source: "noticed",
    line: "A wood in flower, out of all season and by itself. Nothing around it is in flower. It has not been remarked upon by anybody.",
  },
  {
    id: "the-sea",
    source: "noticed",
    line: "Water with sand in front of it and no far side. Everything smaller than this has a far side.",
  },
  {
    id: "poled-pond",
    source: "noticed",
    line: "A pond with a dozen poles set around the edge and nothing whatever in the water. The poles are evenly spaced. Somebody measured.",
  },
  {
    id: "ring-grove",
    source: "noticed",
    line: "A suspiciously round cluster of trees, all facing in. Trees do not face. These do.",
  },
  {
    id: "stair-to-nothing",
    source: "noticed",
    line: "A staircase in a field. Four steps, a handrail, and then the field again. Well built.",
  },
  {
    id: "deep-rock",
    source: "noticed",
    line: "Far enough in that the rock changes character. It splits flat here, where nearer the surface it only crumbles.",
  },
  {
    id: "above-the-cloud",
    source: "noticed",
    line: "Above the cloud there is more cloud. No direction up here is different from any other, so nothing has a name, so nothing needs one.",
  },
  {
    id: "the-hum",
    source: "noticed",
    line: "It hums. Stood beside it for some time. It does nothing else, and does that steadily.",
  },
  {
    id: "a-busy-sky",
    source: "noticed",
    line: "The sky was busy tonight. Nobody in town mentioned it in the morning, which I take to mean it is not unusual.",
  },

  // --- Noticed: the town ------------------------------------------------------
  {
    id: "the-datum",
    source: "noticed",
    line: "The survey reads zero on the plaza and nowhere else on earth. The plaza is eleven across and nine deep, and the zero is not in the middle of it.",
  },
  {
    id: "the-museum-is-large",
    source: "noticed",
    line: "The museum is the largest building in town, comfortably. The hall that governs the town is about half of it. Nobody appears to find this odd.",
  },

  // --- Told -------------------------------------------------------------------
  {
    id: "veins-do-not-return",
    source: "told",
    from: "mole",
    remark: "The metal doesn't come back. ... The rock does. The trees do. Not the metal. I've watched.",
    line: "{who} mentioned that the metal does not come back, where everything else does. He said it the way you would mention weather.",
  },
  {
    id: "the-dark-wood",
    source: "told",
    from: "ghost",
    remark: "The dark wood only grows here. ... I have never asked myself which of us was first.",
    line: "{who} mentioned that the dark wood grows only where she is. She did not say which of them came first, and I did not ask.",
  },
  {
    id: "she-is-simply-around",
    source: "told",
    from: "cosmos",
    remark: "I don't come FOR them. ... I'm simply around, and then they happen, and everyone assumes.",
    line: "{who} mentioned that she does not arrive for the showers. She is around, and they happen, and the two are not related.",
  },
  {
    id: "their-own-month",
    source: "told",
    from: "seedstall",
    remark: "Some of them only come up in their own month. ... I'd rather not go into why. I don't know why.",
    line: "{who} mentioned that certain things only come up in their own month. He would rather not go into why, on the grounds that he does not know.",
  },
  {
    id: "the-ground-keeps-things",
    source: "told",
    from: "heap",
    remark: "The ground keeps things. Always has. ... Don't ask me how they get down there. I've got theories. They're bad.",
    line: "{who} mentioned that the ground keeps things. He was not specific about how they get there, and his theories are, by his own account, bad.",
  },
  {
    id: "it-gathers-anyway",
    source: "told",
    from: "stage",
    remark: "They gather whether or not I've arranged anything. ... Do you know how that feels? Professionally?",
    line: "{who} mentioned that the town gathers on the right days whether or not anybody organises it. He finds this professionally insulting.",
  },
  {
    id: "the-peg",
    source: "told",
    from: "office",
    remark:
      "Everything is measured from the plaza. ... There is a peg under it. I have never seen the peg. I file as though I have.",
    line: "{who} mentioned that the whole coordinate system runs off a peg driven into the plaza. He has never seen the peg. He files as though he has.",
  },
];

export function observationDef(id: ObservationId): ObservationDef {
  const found = OBSERVATIONS.find((o) => o.id === id);
  if (!found) throw new Error(`no observation ${id}`);
  return found;
}

/** The entry as it reads in the book, with the speaker's name filled in.
 *
 *  `who` is passed in rather than looked up, so the caller can hand over the
 *  LIVE villager's name. Resolved at render and never stored, which is the
 *  lesson v23 had to migrate a whole save to learn: a name copied into a record
 *  is a name that goes stale the day somebody is renamed.
 *
 *  Falls back to the authored name when the caller has nobody to offer — every
 *  told row is spoken by a fixed character or a secret, all of whom the tables
 *  below name, so the entry is never left with a hole in it. */
export function observationLine(def: ObservationDef, who?: string): string {
  if (!def.from) return def.line;
  return def.line.replace("{who}", who ?? authoredName(def.from));
}

function authoredName(id: CharId): string {
  if (id === "mole") return MOLE.name;
  if (id === "ghost") return GHOST.name;
  if (id === "cosmos") return COSMOS.name;
  return CAST[id as keyof typeof CAST]?.name ?? "Somebody";
}
