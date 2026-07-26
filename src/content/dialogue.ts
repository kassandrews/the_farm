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
    // Set by the away simulation when a curator revises a placard in your
    // absence (sim/away.ts). The value is the exhibit's TITLE, so these read as
    // a scholar naming a real thing standing on a real case — and older saves
    // whose value is prose ("a rock") still speak, because nothing looks it up.
    //
    // Corrigal owns that memory but never says these: her conversation is the
    // museum panel. They are here for a scholar who has one and DOES talk.
    exhibit: [
      (v) => `You missed the unveiling. The exhibit is ${v}. The placard is, I'll admit, a first draft.`,
      (v) => `Have you seen my ${v} exhibit? Don't read the placard too closely. Or do. I stand by it.`,
    ],
    harvested_carrot: [
      (v) => `You pulled ${v}. The data is conclusive: you are a farmer now. Congratulations, subject.`,
    ],
  },
  // Other forms fall back to idle if they have no memory line for an event.
};

// --- Home --------------------------------------------------------------------
// What a villager says about the place they live (ROADMAP 2b step 5). Keyed by
// the note kinds sim/home.ts derives from the actual room — its size, its
// finish, what's in it, and the three ways it can stop being a home at all.
//
// Keyed by plain string rather than by importing HomeNoteKind, for the same
// reason RESIDENT_MEMORY is: content sits INSIDE sim in the import order
// (CLAUDE.md §Architecture), so a content table may never reach up into a sim
// module for a type. `v` is the note's value — a piece's name, a finish's name,
// a room's size.
//
// VOICE RULE, and it's the whole reason this step exists rather than a "house
// quality: 3/5" readout: nobody grades. A small room is snug, not deficient; a
// bare one is a room they haven't finished thinking about yet. The only lines
// with an edge to them are the three about something being WRONG, and even
// those are about the fact, not about you. DESIGN is explicit that taste is
// delight and never a gate — a villager who scores your house would turn a gift
// into a chore with a pass/fail on it.
export const RESIDENT_HOME: Partial<Record<AdultForm, Partial<Record<string, ((v: string) => string)[]>>>> = {
  scholar: {
    delight_piece: [
      (v) => `There's a ${v}. I have put the findings ON it, like a person with furniture.`,
      (v) => `The ${v} was not in the requirements. I noticed it anyway. I notice things.`,
    ],
    homeless: [
      () => "My bed is gone. I've filed the observation under 'abrupt'.",
      () => ". ... I'm told the plaza is character-building. I'm collecting data on that.",
    ],
    roofless: [
      () => "The walls have left. The bed remains. I am studying the sky, involuntarily.",
    ],
    sealed: [
      () => "There's no door. I've been in and out exactly zero times. Rigorous, but limiting.",
    ],
    bare: [
      () => "A bed and four walls. Minimalist. I keep the findings on the floor.",
      () => "It's unfurnished, which is fine. I've nothing to put down but notes.",
    ],
    grand: [
      (v) => `${v} tiles. I paced it. Twice, for confidence. It's more room than I have thoughts.`,
      () => "It echoes. I've been testing the echo. Preliminary findings: excellent.",
    ],
    snug: [
      () => "Small. Well-bounded. I can reach everything without standing up.",
      (v) => `${v} tiles of home. A sample size I can actually manage.`,
    ],
    furnished: [
      (v) => `There's a ${v} in there. I've been using it correctly, mostly.`,
      (v) => `I've grown fond of the ${v}. Don't move it. I've mapped the room around it.`,
    ],
    finish: [
      (v) => `It's ${v} throughout. I looked it up. I was right, which is rarer than you'd think.`,
      (v) => `${v}. A good wall. I've written that down, and I stand by it.`,
    ],
  },
  // Other forms fall back to memory or idle when they have no line for a note.
  // Stubbed lightly here so an imported villager of any form still notices where
  // they live; fill these in as forms get their proper voices.
  office: {
    homeless: [() => "My bed has been deaccessioned. No form was filed. I'd have accepted a form."],
  },
  menace: {
    delight_finish: [
      (v) => `It's ${v}. ... You paid attention. I am not going to say more than that.`,
      () => "You built it in the good one. I noticed immediately. I said nothing for an hour.",
    ],
    delight_piece: [
      (v) => `A ${v}. ... You were paying attention. I won't be saying more than that.`,
      (v) => `You put a ${v} in it. I know what that means. Don't make me say what it means.`,
    ],
    homeless: [() => "My bed. Gone. I am choosing to find this dramatic rather than upsetting."],
    bare: [() => "It is empty. I am the decor. Still — one could add to me."],
    snug: [() => "Compact. I have decided that's deliberate, and therefore tasteful."],
    finish: [(v) => `${v}. Acceptable. I'd have chosen it myself, given the chance.`],
  },
  dog: {
    delight_piece: [
      (v) => `A ${v}! For me! I've been sitting on it. Near it. Both.`,
      (v) => `You remembered about the ${v}. You REMEMBERED.`,
    ],
    homeless: [() => "Where's my bed? Where's my BED. Okay. Okay. It's fine. Is it fine?"],
    bare: [() => "It's got a bed! That's the important one. That's the main one."],
    grand: [() => "It's SO big. I ran a lap. I'm going to run another one."],
    furnished: [(v) => `There's a ${v}! I sit near it. It's a good ${v}.`],
  },
  blob: {
    delight_finish: [
      (v) => `${v}. I walk in and the room does a little hush. Every time.`,
      (v) => `You built it in ${v}. You understand the assignment. The assignment is atmosphere.`,
    ],
    homeless: [() => "I have been made homeless. Tragically. Beautifully. Someone should be watching this."],
    grand: [() => "The proportions are theatrical. I enter it. I make an entrance."],
    snug: [() => "Intimate staging. Every seat is a good seat. There is one seat."],
  },
  gremlin: {
    delight_piece: [
      (v) => `A ${v}. Do you know what I can put UNDER a ${v}? Neither do you. Yet.`,
      (v) => `The ${v} is perfect. I've already got plans. They're mostly legal.`,
    ],
    homeless: [() => "Someone took my bed. I respect it. I want it back."],
    bare: [() => "Nothing in it yet. Give me a week."],
    furnished: [(v) => `I moved the ${v}. Slightly. You won't be able to prove it.`],
  },
};

// --- Warmth ------------------------------------------------------------------
// Lines that only unlock as a villager warms to you (see sim/villagers.ts
// friendshipTier). This is the ONLY way friendship is ever revealed — there is
// no meter and no heart count in the UI. You're meant to notice that someone
// started talking to you differently, and not be told a number.
//
// Voice rule: warmth in this world is never gushing. A Scholar warming up
// means it shares its actual findings; a Menace warming up means it insults
// you more specifically. Nobody becomes a different creature.

export const RESIDENT_WARM: Partial<Record<AdultForm, Partial<Record<"familiar" | "friend" | "close", string[]>>>> = {
  scholar: {
    familiar: [
      "Oh — it's you. I'd recognise that gait anywhere. I've been charting it.",
      "You again. Good. I need someone to hold the other end of a theory.",
    ],
    friend: [
      "I've started a file on you. It's the flattering kind. Mostly.",
      "I saved you a finding. It's wrong, but it's the interesting kind of wrong.",
      "You're the only one here who lets me finish a sentence about soil.",
    ],
    close: [
      "I don't say this to many subjects. ... The research is better when you're around.",
      "My conclusion, after extensive observation: you're my favourite variable.",
      ". ... I'd have retired much worse, without you nearby.",
    ],
  },
  office: {
    familiar: ["Oh, it's you. I'll allow the interruption.", "You. Yes. I have time. I have all the time now."],
    friend: ["I'd put you on my calendar, but I burned it.", "You're the good kind of meeting."],
    close: [". ... I'm glad you moved in. That's the whole update.", "You made retirement worth the paperwork."],
  },
  menace: {
    familiar: ["Ah. You. You may approach.", "I've decided you're tolerable. Don't celebrate."],
    friend: ["You have improved. I take full credit.", "I would be seen with you in public. Publicly."],
    close: ["You may consider yourself my favourite. Tell no one. ... Tell everyone.", "I have standards. You've met most of them now."],
  },
  dog: {
    familiar: ["You came back! I hoped. I always hope.", "Hi. Hi. Okay. Hi."],
    friend: ["You're my person. I've made it official. In my head.", "I saved you the good stick."],
    close: ["I'd follow you anywhere. I have, mostly. You didn't notice.", "Best day. Every day you're here is best day."],
  },
  blob: {
    familiar: ["You've returned. The scene improves.", "Ah, an audience I actually like."],
    friend: ["I would perform for you specifically.", "You get my better material."],
    close: ["You're my leading light. Don't tell the plaza.", ". ... I'd hold the stage for you. Curtain and all."],
  },
  gremlin: {
    familiar: ["Oh, it's you. I put your thing back. Mostly.", "You're fine. You're one of the fine ones."],
    friend: ["I only move YOUR fences a little. That's respect.", "I found something. You can have it. Probably."],
    close: ["I'd never take anything of yours. ... I'd borrow it dramatically and return it.", "You're my favourite. Don't check your fences."],
  },
};

/** Warm lines a villager has unlocked at a given tier, pooled with everything
 *  below it — a close friend can still say a merely-familiar line. */
export function warmLines(form: AdultForm, tier: "new" | "familiar" | "friend" | "close"): string[] {
  const bank = RESIDENT_WARM[form];
  if (!bank || tier === "new") return [];
  const pool: string[] = [];
  pool.push(...(bank.familiar ?? []));
  if (tier === "friend" || tier === "close") pool.push(...(bank.friend ?? []));
  if (tier === "close") pool.push(...(bank.close ?? []));
  return pool;
}

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
