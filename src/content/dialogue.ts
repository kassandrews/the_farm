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
  errand: [
    (v) => `You brought me the ${v}. It arrived. That is the end of the matter, administratively.`,
    () => "The Dog delivered. He always delivers. It's unnerving in something so pleased about it.",
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
    // A day spent with you, and a day spent with you UNDERGROUND (sim/company.ts).
    // Two kinds, because they are two different afternoons.
    company: [
      () => "We walked the whole town. I have a map now. It is mostly wrong and entirely mine.",
      () => "You took me along. I got more done than usual, which is suspicious.",
    ],
    delved: [
      () => "I have been underground. With you. There is rock down there and it is extremely rock.",
      () => ". ... The dark did something to my methodology. I liked it.",
    ],
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
    errand: [
      (v) => `You answered my card. The ${v} arrived and the study is now correct. Thank you. That was a formal thank you.`,
      () => "I put a request on the board and it was simply met. I am revising my model of how boards work.",
    ],
  },
  // --- Errands and company, for the rest of the cast -------------------------
  // THESE THREE KINDS GET EVERY FORM, which no other memory kind here can say.
  // That is deliberate rather than thorough, and it is the same argument twice.
  //
  // The asker on a card is picked from whoever is standing in the town
  // (sim/errands.ts), and a companion is picked by the player from the same
  // pool (sim/company.ts) — so in both cases a form with nothing to say would
  // make the beat land on silence for that person, and in both cases THE LINE
  // IS THE PAYMENT. Neither pays an item; what you get back is that they bring
  // it up afterwards. A bank only the Scholar had would mean each of them
  // worked properly one time in six.
  //
  // The rest of these banks stay thin (ROADMAP §Known gaps: only the Scholar has
  // a full one). These are the kinds where thin isn't good enough.
  dog: {
    company: [
      () => "We went TOGETHER. I think about it constantly. Constantly.",
      () => "You took me with you. Best decision anyone has made. Ever. Including me.",
    ],
    delved: [
      () => "We went UNDER. Under the ground! There was no sky and I was fine because you were there.",
      () => "The tunnel! I remember the tunnel. It smelled like everything.",
    ],
    errand: [
      (v) => `The ${v}! I carried it! I carried it the whole way and I did not eat it!`,
      () => "I delivered. Everyone was pleased. I have thought about it several times since.",
    ],
  },
  blob: {
    company: [
      () => "We toured. I gave it my all. Nobody applauded. That is also a kind of triumph.",
      () => "I accompanied you once. It was, I think, my subtlest work.",
    ],
    delved: [
      () => "I have performed underground. The acoustics were extraordinary. The audience was you.",
      () => ". ... A cave. Me, in a cave. I've never been better lit, and there was no light.",
    ],
    errand: [
      (v) => `The ${v} arrived at my lowest moment. Well. One of them. I have several a day.`,
      () => "Someone answered my request. I had prepared a speech about being ignored. It is wasted now.",
    ],
  },
  menace: {
    company: [
      () => "We walked out together. I was seen with you. Publicly. Draw your own conclusions.",
      () => "That outing was acceptable. I've said all I intend to say about it.",
    ],
    delved: [
      () => "You took me into a hole in the ground. ... I would go again. Don't ask me twice.",
      () => "I got dirt on me. Underground. With you. It was, and I choose the word carefully, fun.",
    ],
    errand: [
      (v) => `You brought the ${v}. Adequate. ... Prompt, even. I shan't make a thing of it.`,
      () => "I asked, and it was fetched. This is how things ought to go. It is not how they usually go.",
    ],
  },
  gremlin: {
    company: [
      () => "We went round together. I found four things. You saw two of them.",
      () => "You brought me along and didn't watch my hands the whole time. That's trust. Sort of.",
    ],
    delved: [
      () => "Down there! With you! Everything down there is findable and nobody has found it.",
      () => "The deep bits. Best bits. Nothing's been moved yet, so anything I move is FIRST.",
    ],
    errand: [
      (v) => `The ${v}. Mine now. It was always going to be mine. You just made it faster.`,
      () => "You did the errand. Straight. No swap, no trick. ... I don't know what to do with that.",
    ],
  },
  carrot: {
    company: [
      () => "We walked out. The stall kept. Nothing was lost. ... It was a good day.",
    ],
    delved: [
      () => "I went below the soil. Voluntarily. I have thoughts I am not ready to share.",
    ],
    errand: [
      (v) => `The ${v}. ... Yes. That's the one I asked for. Thank you. We're not going to discuss it further.`,
    ],
  },
  office: {
    company: [
      () => "We went out. No agenda, no minutes, no follow-up. I still think about it.",
    ],
    delved: [
      () => "I was underground. Unfiled. Unreachable. ... Genuinely the best afternoon of my retirement.",
    ],
    errand: [
      (v) => `The ${v} came through. I've filed it. The filing is the important part.`,
    ],
  },
  // Other forms fall back to idle if they have no memory line for an event.
};

// --- Festivals -------------------------------------------------------------------
// Merged into RESIDENT_MEMORY below rather than written into it inline, because
// these are the one kind that needs EVERY FORM for a structural reason, the way
// the errand lines do — anyone standing in the plaza when a festival happens
// gets the memory, so a form with nothing to say would make being at one land
// on silence for whoever you happened to talk to afterwards.
//
// THE VALUE IS THE FESTIVAL'S NAME, and every line uses it. That is what makes
// the bank cheap: twelve festivals share six voices, and the specificity comes
// free from the noun. (It is also why the memory stores a name rather than an
// id — see sim/festival.ts.)
//
// NOBODY THANKS YOU FOR COMING and nobody remarks on your having been there.
// They talk about the festival. A line like "good of you to turn up" would make
// attendance a thing you are seen to have done, which is one short step from a
// thing you are expected to do, and the whole design refuses that (DESIGN
// §Festivals: missing one costs nothing and is recorded nowhere).
const FESTIVAL_LINES: Partial<Record<AdultForm, ((v: string) => string)[]>> = {
  scholar: [
    (v) => `${v}. I took field notes. They are mostly about the crowd, which is the more interesting phenomenon.`,
    (v) => `. ... I have been writing up ${v}. The write-up is longer than the event.`,
  ],
  dog: [
    (v) => `${v}! I was there! Everyone was there! It was the best one, and so was the last one!`,
    (v) => `I think about ${v} a lot. Several times a day. Is that a lot?`,
  ],
  blob: [
    (v) => `${v} moved me. ... I say that every year and every year it is true again.`,
    (v) => `Nobody who was not at ${v} will ever really understand it. I have tried explaining. I will keep trying.`,
  ],
  menace: [
    (v) => `${v} was tolerable. ... The standing about was well organised, which is not nothing.`,
    (v) => `I attended ${v}. Briefly. I was seen there, which was the point.`,
  ],
  gremlin: [
    (v) => `Good crowd at ${v}. Good pockets. ... I didn't. But there were.`,
    (v) => `${v}. I stayed at the back. Best view, back there. Nobody looks behind them.`,
  ],
  carrot: [
    (v) => `${v} happened. ... Yes. I was present for it. We can leave it there.`,
  ],
  office: [
    (v) => `${v} was held. The paperwork for it is already complete, which is unusual and I intend to enjoy it.`,
  ],
};

for (const [form, lines] of Object.entries(FESTIVAL_LINES)) {
  const bank = (RESIDENT_MEMORY[form as AdultForm] ??= {});
  bank.festival = lines;
}

// A Scholar resident's affinity perk (DESIGN §Affinity perks): their own reading
// of a recent exhibit, disagreeing with the curator's. `t` is the exhibit's
// title; `r` is the rival card — one of that row's readings Corrigal has not
// mounted, chosen in sim/museum.ts and fixed per scholar.
//
// SHE QUOTES IT, always. Every line here puts the rival card in quotation marks
// and hands it over as a card, because the placard prose is written in museum
// voice ("Timber. Cut from the common tree…") and speaking it flat would put
// Corrigal's register in someone else's mouth — the per-form voice rule going
// quietly wrong. A scholar reciting her own competing placard is card-voice by
// construction, and the framing is the funnier half anyway: the disagreement is
// not that she thinks something different, it is that she has WRITTEN IT UP.
//
// Nobody wins. Neither reading is correct, no line hints which, and she is never
// vindicated — two confidently incorrect authorities is the whole joke, and a
// version where the resident is secretly right makes the museum a puzzle with
// an answer key standing next to it.
// Every line hands the quote over as a DOCUMENT — a card, a draft, a submitted
// revision — never as a plain assertion. Placards carry her revision markers
// ("Mushroom. ... Corrected."), so a scholar who says one flat sounds like she
// is reading aloud from someone else's page mid-sentence. Framed as her own
// paperwork, the marker becomes part of the thing she is holding up.
export const SCHOLAR_DISSENT: ((t: string, r: string) => string)[] = [
  (t, r) => `I have read her card on the ${t}. I have written my own. It reads: "${r}"`,
  (t, r) => `The ${t} is misattributed. My card would read: "${r}" ... She has been told.`,
  (t, r) => `. ... The ${t}. Her placard is a guess in a nice font. Mine reads: "${r}"`,
  (t, r) => `Ask me about the ${t}. I submitted a revision — "${r}" — and heard nothing back.`,
  (t, r) => `Between us: my draft card for the ${t} reads "${r}" I am not permitted near the cases with a pen.`,
];

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

// --- Company ------------------------------------------------------------------
// What somebody says when you ask them along, while they are walking with you,
// and when the day ends and they go home (sim/company.ts).
//
// Voice rule, and it is the whole reason these are three banks rather than one
// pool of "companion lines": NOBODY BECOMES A DIFFERENT CREATURE, which is the
// same rule RESIDENT_WARM keeps. A Menace who agrees to come along agrees
// grudgingly and then enjoys herself without admitting it. A Dog says yes before
// you finish the sentence. The Scholar reclassifies the walk as fieldwork.
//
// And nothing in here is a hint. A companion who says "there's ore that way"
// would turn a person into a HUD, and the underground would stop being a place
// you learn and become a place you are guided through.

/** Saying yes. Short — this is the beat between asking and walking, not a
 *  speech. */
export const COMPANY_YES: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "Fieldwork. Excellent. I'll bring the notebook and most of my objectivity.",
    "Yes. I've been meaning to see what you actually do all day.",
  ],
  dog: ["YES. Where. Doesn't matter. Yes.", "I was already coming. I just hadn't been asked yet."],
  blob: ["A tour. With me in it. Very well.", "I accept. I'll need no direction. I never do."],
  menace: ["I shall accompany you. Don't make it strange.", "Fine. But I'm not carrying anything."],
  gremlin: ["Ooh. Where are we going. Is it somewhere with things in it.", "Yes. I'll be good. Mostly good."],
  office: ["I'll come. I'm not filing it. That's the treat.", "Out of office. Genuinely, for once."],
  carrot: ["I shall walk with you. The stall keeps.", "Blessed. Also free until evening."],
};

/** While they are with you — the idle bank, pooled with their ordinary one so a
 *  companion is still themselves and not a walking status message. */
export const COMPANY_IDLE: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "Still with you. Still taking notes. Some of them are about you.",
    "This counts as a transect. I've decided it counts as a transect.",
    "Lead on. I'll say something insightful within the hour.",
  ],
  dog: ["Are we still going? We're still going. Good.", "Best walk. Ongoing. Best walk.", "I'm right here. I checked."],
  blob: ["I am accompanying you. It's a supporting role. I'm elevating it.", "The scenery has improved since I entered it."],
  menace: ["I'm still here. Nobody need know why.", "Carry on. I'm observing. Judgementally, but present."],
  gremlin: ["I haven't taken anything. Recently.", "Ooh, what's that. No, keep going. But ooh."],
  office: ["No agenda. No minutes. I'm coping.", "This is the longest I've been away from the desk. It's fine. It's fine."],
  carrot: ["The soil changes underfoot. I notice these things.", "..."],
};

/** And the goodbye, when their own day takes them back (sim/company.ts
 *  `dayOver`). Never an apology and never a request that you do it again —
 *  they have a life, and the invitation is always open. */
export const COMPANY_BYE: Partial<Record<AdultForm, string[]>> = {
  scholar: ["That's the light gone. I'll write it up. ... Good day's work.", "I'm off. The notebook is fuller than it was."],
  dog: ["Is it over? It's over. It was the best one.", "Going home. I'll be at the board. Come and get me."],
  blob: ["I must retire. The performance requires rest.", "Exit, mine. ... You were a serviceable co-star."],
  menace: ["I'm going in. This was tolerable. Extremely tolerable.", "That's enough of that. Same again sometime."],
  gremlin: ["I'm off. Check your pockets. ... They're fine. Check anyway.", "Home. I found four things. You saw two of them."],
  office: ["Back to the desk. It missed me. It says nothing, but it missed me.", "That's me clocked off. From nothing. Wonderful."],
  carrot: ["I return to the stall. Go well.", "Evening. ... Blessings, and so on."],
};

// --- The Maverick Mole --------------------------------------------------------
// The only voice in this file that belongs to one specific individual rather
// than to a form or an institution, because he is one specific individual and
// there will never be another (DESIGN §"The Mole, specifically").
//
// Voice: shortest in the game. He was not expecting company and is not putting
// any effort into the fact of it. Nothing he says is a hint — no directions, no
// "have you tried", no mention of anything you haven't already found. A hermit
// who tells you where things are is a map marker with a face.

/** What he says when his ground is still deep, which is how you met him. */
export const MOLE_DEEP: string[] = [
  "...",
  "You came a long way. On purpose, I assume.",
  "It's quieter down here. That's the feature.",
  "Nobody knows about this. Now one person does.",
  "I don't go up. I went up once.",
  "The rock is fine. We have an understanding.",
  "You've got dirt on you. That's correct.",
  "I heard you coming for two days.",
];

/** And what he says once you have sunk a shaft next to him and turned his
 *  remote chamber into somewhere you can pop down to. He does not move, does
 *  not hide, and is not protected (ROADMAP) — he just has an opinion. */
export const MOLE_SHALLOW: string[] = [
  "There's a hole up there now. I've seen daylight twice this week.",
  "You put a road in. To here. To me.",
  "The commute is very convenient. For you.",
  "I moved out here for a reason. The reason has a ladder in it now.",
  "I'm not going anywhere. That's not the same as being pleased.",
  "Somebody could just... wander in. Somebody does.",
  "... It was remote.",
];

/** Fixed-cast idle banks by character. */
export function castIdle(id: CharId): string[] {
  if (id === "office") return OFFICE_IDLE;
  return ["..."];
}
