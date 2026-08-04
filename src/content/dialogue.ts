// Dialogue banks, as data. Pure line pools in The Meadow's house voice —
// per-form, brief, distinct openers, ellipsis style ("word ... Capital" —
// no period before the pause; ? and ! keep their mark), and
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
import type { GameId, SpyKind } from "./games";
import type { SkinId } from "./skins";

export type LineBank = Partial<Record<string, string[]>>;

// --- The Tired Office Creature: the land-claim beat + counter idle -----------
// The whole opening cutscene is this creature stamping a permit (DESIGN
// §"Opening beat"). Institutional absurdism played straight.
export const OFFICE_LANDCLAIM: string[] = [
  "Welcome to the Farm. You're expected. Everyone is, eventually.",
  "Plot on the edge of town. Standard issue. Congratulations, I suppose.",
  "I'll need to stamp this. The stamping is the important part. Not the land. The stamp.",
  "*stamps the claim*\n... There. It's yours now. Legally. Emotionally, that's between you and the soil.",
];

export const OFFICE_IDLE: string[] = [
  "Another arrival. I'll add you to the list. The list is mostly me.",
  "Land claims, permits, the slow paperwork of an afterlife. Riveting.",
  "You settled in? Good. Don't make me file anything.",
  "This could have been a postcard.",
  "I'm not tired. I'm... between energies.",
  "Per my last stamp.",
  "The hall is quiet today. I take full credit.",
  "No queue. There's never a queue. I built my life around avoiding queues and now look.",
  "Form 9 is my favourite. Don't tell the others.",
  "I stamped nothing today. The stamp rests. We both do.",
  "You're my favourite kind of visitor. The kind with no paperwork.",
  "The desk and I have an arrangement. It holds things. I ignore them.",
];

// A tiny reactive bank the office pulls from once the player has done things —
// it notices your homestead taking shape, in its own flat way.
export const OFFICE_MEMORY: Partial<Record<string, ((v: string) => string)[]>> = {
  built_floor: [
    () => "I see you've been building. Unpermitted, but I'll allow it. Don't tell the stamp.",
    () => "Floorboards, is it. The homestead grows. Noted. Filed. Forgotten by lunch.",
  ],
  harvested: [
    (v) => `Word is you pulled ${v} out of the ground. The Carrot will pretend not to care.`,
    (v) => `${v}, was it. The land claim is performing above projections. I have no projections. Above them anyway.`,
  ],
  planted: [
    (v) => `${v}, in the ground, on your own land. Stamped, so it's all above board. The stamp covers everything. That was the point of the stamp.`,
  ],
  dug: [() => "Terraforming, per the permit. The permit says 'approximately'. I wrote it myself."],
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
    "I've begun a longitudinal study of the plaza. It's long. That's the method.",
    "Today's finding: the river is still going the same way. Reassuring. Publishable? No.",
    "I lost my best pencil. The investigation is ongoing and deeply personal.",
    "The fence and I have reached an understanding. I understand it. It stands.",
    "Somebody asked me a question yesterday. I've been enjoying it since.",
    "Field conditions today: excellent. Everything is a field if you stand in it properly.",
  ],
  office: [
    "I retired. I still check a calendar. It's blank. It's glorious.",
    "Following up on my previous sigh.",
    "I alphabetised my shelf this morning. Old habits. Good habits.",
    "Nothing is due today. Nothing is due tomorrow. I check for the pleasure of it.",
    "I filed nothing today. A personal best, tied with yesterday.",
    "Someone asked me to be somewhere once. Never again.",
    "I have a drawer now that holds nothing. I open it sometimes. Magnificent.",
    "Retirement report: satisfactory. Unfiled.",
    "I saw the Dog Thing on his round. The punctuality. It moved me. I didn't say so.",
    "I used to chase deadlines. Now I watch them go past. They don't even slow down.",
  ],
  dog: [
    "You're here! You're HERE. Okay. Okay. Where are we going.",
    "I found a stick. It's the best one. So far.",
    "I smelled you coming! I was right!",
    "Today I found three smells. One of them was NEW.",
    "I sat by the plaza all morning. Things HAPPENED. I saw most of them.",
    "The ground's good today. I checked a lot of it.",
    "I ran to the water and back. Nobody asked me to. Best kind of run.",
    "You have a good face. I've compared.",
    "I was going to nap. Then I didn't! This is better.",
    "Somebody walked past earlier and I got SO excited. It wasn't even you. Imagine now.",
    "I've been practising sitting still. This is it. This is the practice.",
    "There's a spot behind the stage where the sun lands all afternoon. I'm not telling anyone else. I'm telling you.",
    "I counted the trees on the way here. I lost count. They're all still there though.",
    "Okay so. I have a plan for today. The plan is this. It's going great.",
    "I barked at a rock yesterday. We're fine now.",
    "Sometimes I stand where the most people will walk past. It's called a strategy.",
    "I dug a small hole earlier. Professional interest.",
    "It's a good day. I decided early.",
  ],
  blob: [
    "This town lacks drama. I have brought some.",
    "I am reclining meaningfully.",
    "I have been rehearsing a monologue about the plaza. The plaza is unaware. That's theatre.",
    "Today's performance is: standing here. Minimalism.",
    "I heard applause earlier. It was the leaves. I took it.",
    "The light at this hour ... Somebody should be lit by it. I've volunteered.",
    "... I was pausing for effect. The effect continues.",
    "I have range. Yesterday I was wistful. Today: also wistful, but WIDER.",
    "An audience of one. My favourite house.",
    "I've been workshopping a new exit. You'll know it when you see it. You'll know.",
    "Drama finds me. I also leave the door open for it.",
  ],
  menace: [
    "How rustic. I suppose it will do.",
    "You may remain.",
    "I've inspected the town today. It passes. Narrowly.",
    "Stand there ... Yes. That's your good side.",
    "I have opinions this morning. I'm rationing them.",
    "The standards around here would slip without me. I hold them up. Invisibly. Gracefully.",
    "You've caught me at leisure. Leisure suits me. Everything suits me.",
    "I was just thinking something devastating. You've interrupted it. It'll keep.",
    "This town has exactly one of me. As is proper.",
    "I don't wander. I patrol. Elegantly.",
    "You may tell people we spoke.",
  ],
  gremlin: [
    "I moved a fence. Statistically, one of them is wrong now.",
    "Finders keepers. Everything is findable.",
    "I found a button today. Somewhere there's a coat that misses it.",
    "I know where everything in this town is. ESPECIALLY the things that moved.",
    "I counted my collection this morning. There's more of it than yesterday. There always is.",
    "If anything's missing, it isn't missing. It's with me. That's different.",
    "I traded a pebble for a better pebble. The economy's booming.",
    "I dug a little. Recreationally. Filled it back in. Mostly.",
    "Everything findable gets found eventually. I just speed it up.",
    "I returned something today. Felt strange. Won't make a habit of it.",
    "Your pockets look heavy. I'm not offering. I'm noticing.",
  ],
  // Reachable through a Meadow IMPORT housed next door (no arrival and no
  // hatching offers the form), so the bank exists and stays in his register:
  // short, settled, and disinclined to elaborate. "..." is a complete line
  // (Tone), and his more than anyone's.
  carrot: [
    "...",
    "... Morning. Or thereabouts.",
    "The soil's good here. I checked when I arrived. I check ongoing.",
    "Things grow whether you watch or not ... I watch anyway.",
    "I was standing here before you came. I'll be here after. It's a good spot.",
    "... You can stand here too. There's room.",
    "Quiet today ... That's not a complaint.",
    "I looked at the sky earlier. Still up there. Good.",
    "Some things need saying ... Not many.",
    "Blessed, thanks ... You didn't ask. You were going to.",
  ],
};

// Memory-referencing lines: only offered when the log holds the matching event.
// `v` is the remembered value (a Meadow name, a food, a witnessed thing).
// Bringing up something you TOLD them (Phase 12 tranche 2). `v` is the
// keepsake clause off the Reply that recorded it — always phrased to read after
// "you said" / "you told me", so one clause serves every form's grammar.
//
// Written as a flat per-form table and grafted onto RESIDENT_MEMORY.answered
// below, the same way the four everybody-kinds are: every form needs one,
// because any of them can be asked a question, and a form with no bank would
// forget what you said to it alone.
const ANSWERED_LINES: Partial<Record<AdultForm, ((v: string) => string)[]>> = {
  scholar: [
    (v) => `You told me ${v}. I wrote it down ... Not for the study. For me.`,
    (v) => `I've been thinking about what you said — ${v}. It holds up.`,
  ],
  dog: [
    (v) => `You said ${v}! I remember! I remember EVERYTHING you say!`,
    (v) => `I've been thinking about how you said ${v}. I think about it a normal amount.`,
  ],
  blob: [
    (v) => `You said ${v} ... I've kept the line. I may use it. Credited, obviously.`,
    (v) => `Your reading — ${v} — has stayed with me. Few things do.`,
  ],
  menace: [
    (v) => `You did say ${v}. I remember what people tell me. It's a small terror I provide.`,
    (v) => `${v.charAt(0).toUpperCase() + v.slice(1)}, you said ... I've thought about it since. Don't let that go to your head.`,
  ],
  gremlin: [
    (v) => `You told me ${v}. I kept that. I keep everything, but I MEANT to keep that.`,
    (v) => `I've still got the thing you said. ${v.charAt(0).toUpperCase() + v.slice(1)}. Filed under good.`,
  ],
  office: [
    (v) => `You mentioned ${v}. Unfiled, unminuted, and I've remembered it anyway. That's the new system.`,
    (v) => `${v.charAt(0).toUpperCase() + v.slice(1)}, you said. I have no record of it. I have it.`,
  ],
  carrot: [(v) => `You said ${v} ... I remembered that. Don't make a thing of it.`],
};

export const RESIDENT_MEMORY: Partial<Record<AdultForm, Partial<Record<string, ((v: string) => string)[]>>>> = {
  scholar: {
    hum: [
      () => "The cube. Out past everything. It hums and it does not explain itself, and I have decided that is its right.",
      () => "I stood in front of it for some time. I took no notes ... I want that on the record.",
    ],
    // A day spent with you, and a day spent with you UNDERGROUND (sim/company.ts).
    // Two kinds, because they are two different afternoons.
    company: [
      () => "We walked the whole town. I have a map now. It is mostly wrong and entirely mine.",
      () => "You took me along. I got more done than usual, which is suspicious.",
    ],
    delved: [
      () => "I have been underground. With you. There is rock down there and it is extremely rock.",
      () => "... The dark did something to my methodology. I liked it.",
    ],
    // And the third afternoon (Phase 7c). Nobody names the staircase and nobody
    // explains it — every one of these is somebody describing a thing that
    // happened, in a voice that has decided it was normal.
    climbed: [
      () => "We went up. I have looked at the town from above and I am not sure it is arranged correctly.",
      () => "... There was nothing up there to measure. I stayed a while anyway.",
    ],
    // The games (sim/play.ts). Like the errand and company lines, these are
    // the whole payout, so every playable form has them — see the block
    // comment below.
    hid: [
      () => "The hiding game. I maintain the spot was excellent. Your finding it was the anomaly.",
      () => "I've been reviewing our game. I have notes on four better spots. They're classified.",
    ],
    spied: [
      () => "The spying game. You found my thing. My clue was, in hindsight, generous.",
      () => "I spy remains the only field survey with a winner. I've cited it twice.",
    ],
    // Imported raising history from The Meadow (see meadow_import.ts).
    raised_favorite: [
      (v) => `They fed me ${v}, back before. I've since disproven ${v}. It remains delicious.`,
      (v) => `My file says I favoured ${v}. My file is correct. Rare, for a file.`,
    ],
    raised_by: [
      (v) => `${v} raised me. I was a difficult subject. I have the notes.`,
      (v) => `... ${v}. I remember ${v}. The dark, the lantern, the whole methodology.`,
    ],
    // Events witnessed here on the Farm.
    built_floor: [
      () => "You built that yourself? Tile by tile? Fascinating. Wildly inefficient. I approve.",
      () => "I watched you lay those boards. I took notes. The notes say: 'good.'",
    ],
    // The value is what went in — "a radish". Pre-v30 memories were logged
    // without one and the migration backfills them to "something", so an old
    // save reads "You've planted something" rather than losing the memory or
    // rendering a hole where the crop should be.
    planted: [
      (v) => `You've planted ${v}. I'll monitor the plot. For science, and because I'm nosy.`,
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
    harvested: [
      (v) => `You pulled ${v}. The data is conclusive: you are a farmer now. Congratulations, subject.`,
    ],
    errand: [
      (v) => `You answered my card. The ${v} arrived and the study is now correct. Thank you. That was a formal thank you.`,
      () => "I put a request on the board and it was simply met. I am revising my model of how boards work.",
    ],
  },
  // --- Errands and company, for the rest of the cast -------------------------
  // THESE FOUR KINDS GET EVERY FORM, which no other memory kind here can say.
  // (`hum` joined them in 4c for the same argument in its purest form: the walk
  // out to the Cube pays NOTHING else — no item, no unlock, nothing gates on it
  // — so the line is not merely the payment, it is the entire payout, and a
  // bank only the Scholar had would leave five sixths of the town with nothing
  // to show for the longest walk in the game.)
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
    hum: [
      () => "The BOX! The humming box! I felt it in my feet! I still feel it in my feet!",
      () => "We went to the hum. I didn't bark at it. I thought about it and I chose not to.",
      () => "Sometimes I hum now. Quietly. It's a tribute.",
    ],
    company: [
      () => "We went TOGETHER. I think about it constantly. Constantly.",
      () => "You took me with you. Best decision anyone has made. Ever. Including me.",
      () => "Our walk! I've rewalked bits of it since. It's not the same. It needs both of us.",
    ],
    delved: [
      () => "We went UNDER. Under the ground! There was no sky and I was fine because you were there.",
      () => "The tunnel! I remember the tunnel. It smelled like everything.",
      () => "Down there it's all ground. Walls of ground! CEILING of ground! I still think about the ceiling.",
    ],
    climbed: [
      () => "UP! We went UP! I have been in the sky and the sky is FLOOR now and I love it!",
      () => "It was white and it went on forever and I ran in it. I ran in the SKY.",
    ],
    hid: [
      () => "Remember when I hid?! I think about the hiding a lot. My heart was SO LOUD.",
      () => "We played the game! The hiding one! I'm still good at it. I'm a little hidden right now.",
    ],
    spied: [
      () => "The spy game! I picked such a good thing! You FOUND it though. You're so good at things.",
      () => "I spied a thing and you walked RIGHT to it. Eventually. The middle part was the game!",
    ],
    errand: [
      (v) => `The ${v}! I carried it! I carried it the whole way and I did not eat it!`,
      () => "I delivered. Everyone was pleased. I have thought about it several times since.",
      (v) => `Remember the ${v}? I remember the ${v}. We're a good team, me and you and the ${v}.`,
    ],
    // Imported raising history from The Meadow (see meadow_import.ts).
    raised_by: [
      (v) => `${v} raised me! Back before! I still turn around sometimes expecting them. Then it's here instead, and that's good too.`,
      (v) => `I remember ${v}. I remember EVERYTHING about ${v}. Mostly the food. And everything.`,
    ],
    raised_favorite: [
      (v) => `They used to give me ${v}. I can taste it if I think hard. I'm thinking hard right now.`,
      (v) => `${v}! That was mine! It's still mine. Flavours stay yours forever. I've decided.`,
    ],
    // Events witnessed here on the Farm.
    built_floor: [
      () => "You BUILT that! I watched the whole time! I only got distracted twice!",
      () => "Boards! Down! Because of you! I walked on them immediately. Somebody had to be first.",
    ],
    planted: [
      (v) => `You put ${v} in the ground on purpose! And the ground is going to give it BACK. That's the deal! What a deal!`,
      () => "I saw the planting. I sat very still for it. It felt important.",
    ],
    harvested: [
      (v) => `You pulled up ${v}! Out of the GROUND! Where it was HIDING!`,
      (v) => `${v}, straight out of the dirt. I sniffed the hole after. Good hole.`,
    ],
    dug: [
      () => "You dug a hole! I have NEVER been so proud of anyone.",
      () => "The digging! I remember the digging. I supervised. Closely. From inside the hole, briefly.",
    ],
  },
  blob: {
    hum: [
      () => "A cube, alone in a field, holding one note forever ... I have never been so upstaged.",
      () => "It hums. That is the entire performance and it has been running for longer than any of us.",
    ],
    company: [
      () => "We toured. I gave it my all. Nobody applauded. That is also a kind of triumph.",
      () => "I accompanied you once. It was, I think, my subtlest work.",
    ],
    delved: [
      () => "I have performed underground. The acoustics were extraordinary. The audience was you.",
      () => "... A cave. Me, in a cave. I've never been better lit, and there was no light.",
    ],
    climbed: [
      () => "I have played the sky. No walls. Nothing came back ... The best room I have ever died in.",
      () => "We stood above the weather. I gave nothing. There was nothing to give it to. It was perfect.",
    ],
    hid: [
      () => "My concealment, that day. The stillness. The craft. You witnessed it.",
      () => "I still think about my hiding. A career highlight, and no stage anywhere near it.",
    ],
    spied: [
      () => "My clue, that day, was poetry. You solved it anyway. Both of us magnificent.",
      () => "I spied. You sought. A two-hander with no script. We should tour it.",
    ],
    errand: [
      (v) => `The ${v} arrived at my lowest moment. Well. One of them. I have several a day.`,
      () => "Someone answered my request. I had prepared a speech about being ignored. It is wasted now.",
    ],
    raised_by: [
      (v) => `${v} raised me. My origin story. I've been embellishing it for years and it needs nothing.`,
      (v) => `${v} ... My first audience. Every audience since has been compared.`,
    ],
    raised_favorite: [
      (v) => `${v}. My old favourite. I demanded it nightly ... I was a difficult ingénue.`,
    ],
    built_floor: [
      () => "You laid a floor. I watched. A set went up around us. That's what that was.",
      () => "Boards, laid by hand, in real time. Process. I respect process.",
    ],
    planted: [(v) => `You planted ${v}. A slow reveal. The best kind.`],
    harvested: [
      (v) => `You pulled ${v} from the earth like a curtain call. I may have applauded. Quietly. Inside.`,
    ],
    dug: [() => "The dig! I observed. Committed. Physical. The ground never saw it coming."],
  },
  menace: {
    hum: [
      () => "You walked me all the way out to a box ... It was worth it. I will deny saying so.",
      () => "It hums in a key I would not have chosen. It is very sure of itself. I respect that.",
    ],
    company: [
      () => "We walked out together. I was seen with you. Publicly. Draw your own conclusions.",
      () => "That outing was acceptable. I've said all I intend to say about it.",
    ],
    delved: [
      () => "You took me into a hole in the ground ... I would go again. Don't ask me twice.",
      () => "I got dirt on me. Underground. With you. It was, and I choose the word carefully, fun.",
    ],
    climbed: [
      () => "You walked me up a staircase that had no business being there ... I went first, at the end.",
      () => "There is nothing up there. I stayed for an hour. Say one word about it and I'll deny the lot.",
    ],
    hid: [
      () => "That hiding game proved nothing. Rematch. Someday. When you least expect it.",
      () => "I've thought about the game. The spot was perfect. The finding was a fluke. We've discussed this.",
    ],
    spied: [
      () => "You solved my clue. I made it too easy on purpose. That is my account and it's final.",
      () => "The spying game. You did adequately ... Better than adequately. There. I said it once.",
    ],
    errand: [
      (v) => `You brought the ${v}. Adequate ... Prompt, even. I shan't make a thing of it.`,
      () => "I asked, and it was fetched. This is how things ought to go. It is not how they usually go.",
    ],
    raised_by: [
      (v) => `${v} raised me. They did well. Look at the result.`,
      (v) => `${v} ... They had taste. You can see where it went.`,
    ],
    raised_favorite: [
      (v) => `${v}, they fed me. I had standards even then. It met them.`,
    ],
    built_floor: [
      () => "I watched you lay that floor. Level, even, unsupervised ... I'm taking partial credit. I watched.",
    ],
    planted: [(v) => `You planted ${v}. Neat rows. I noticed. I notice everything worth noticing.`],
    harvested: [
      (v) => `${v}, harvested. You continue to be useful. It's one of your better qualities.`,
    ],
    dug: [
      () => "You dug. Manual labour. I could never. I mean that as a compliment to exactly one of us.",
    ],
  },
  gremlin: {
    hum: [
      () => "The humming one! I tried to take a bit of it. There isn't a bit of it. It's all the bit.",
      () => "Nobody knows it's out there ... You do. I do. That's a small enough number to be interesting.",
    ],
    company: [
      () => "We went round together. I found four things. You saw two of them.",
      () => "You brought me along and didn't watch my hands the whole time. That's trust. Sort of.",
    ],
    delved: [
      () => "Down there! With you! Everything down there is findable and nobody has found it.",
      () => "The deep bits. Best bits. Nothing's been moved yet, so anything I move is FIRST.",
    ],
    climbed: [
      () => "Up the steps! There's NOTHING up there. Nothing! You can't even take it! I tried!",
      () => "I have been somewhere with no edges. Nowhere to put a thing ... I hated it. I want to go back.",
    ],
    hid: [
      () => "I found two things behind that tree while I was hiding. Kept both. Great game.",
      () => "The hiding game! Turns out being findable is optional. I'd been doing it as a hobby for years.",
    ],
    spied: [
      () => "That spy game. I nearly picked something in my pocket. Rules said visible. Shame.",
      () => "I spied a thing and you found it and NEITHER of us took it. Growth, probably.",
    ],
    errand: [
      (v) => `The ${v}. Mine now. It was always going to be mine. You just made it faster.`,
      () => "You did the errand. Straight. No swap, no trick ... I don't know what to do with that.",
    ],
    raised_by: [
      (v) => `${v} raised me. They hid things from me. Training, basically.`,
      (v) => `${v}. They knew where everything was too. We competed ... They let me win. I let them think that.`,
    ],
    raised_favorite: [
      (v) => `${v}. They'd hide it. I'd find it. A game with one rule, and I won constantly.`,
    ],
    built_floor: [
      () => "New boards. I checked under them the day you laid them ... Nothing yet. I'll check again.",
    ],
    planted: [
      (v) => `You buried ${v} on purpose and you're going to dig it up LATER. We are not so different.`,
    ],
    harvested: [
      (v) => `You dug up ${v}. Right where you left it. That's the trick, see. Remembering where.`,
    ],
    dug: [() => "You dug a hole! Good hole. I looked in it. Twice. Professional courtesy."],
  },
  carrot: {
    hum: [
      () => "I heard it before I saw it ... I have not decided what I think. It has been some time.",
      () => "The hum ... Still going, I expect. Some things just hold a note.",
    ],
    company: [
      () => "We walked out. The stall kept. Nothing was lost ... It was a good day.",
      () => "... We walked. It was enough.",
    ],
    delved: [
      () => "I went below the soil. Voluntarily. I have thoughts I am not ready to share.",
      () => "It's all patience down there ... I fit right in.",
    ],
    climbed: [
      () => "I have been above the soil. Well above ... Nothing grows there. I checked. Twice.",
    ],
    hid: [
      () => "... We played, once. In among the quiet. I liked it.",
      () => "The hiding ... A good spot holds you like soil. I found a good spot.",
    ],
    spied: [
      () => "... You found the thing I saw. So we've both seen it now. That's the game, I think.",
      () => "I spied. You walked until you saw it too ... Simple. Complete.",
    ],
    errand: [
      (v) => `The ${v} ... Yes. That's the one I asked for. Thank you. We're not going to discuss it further.`,
      (v) => `The ${v} arrived ... I still think about that. Briefly. Warmly.`,
    ],
    // An imported carrot has a raising to remember and eyes for a day's work.
    raised_by: [
      (v) => `${v} raised me ... I came up well. That's them, mostly.`,
    ],
    raised_favorite: [
      (v) => `They fed me ${v}, back then ... I have no comment beyond that it was excellent.`,
    ],
    built_floor: [() => "You laid a floor. I watched ... Level. Good."],
    planted: [
      (v) => `You planted ${v} ... Correctly, too. I said nothing. I didn't need to.`,
    ],
    harvested: [
      (v) => `${v}, out of the ground ... Clean pull. I notice these things.`,
    ],
    dug: [() => "You dug ... The ground doesn't mind. I asked."],
  },
  office: {
    hum: [
      () => "There is a cube. It is not on any form. I have chosen not to raise it with anyone."
    ],
    company: [
      () => "We went out. No agenda, no minutes, no follow-up. I still think about it.",
    ],
    delved: [
      () => "I was underground. Unfiled. Unreachable ... Genuinely the best afternoon of my retirement.",
    ],
    climbed: [
      () => "We went up some steps that are on no plan of the district. I have not raised it. I will not.",
    ],
    hid: [
      () => "The hide-and-seek is on record as concluded. Result: satisfactory. All parties found.",
      () => "I hid once. Behind something. Off the books entirely. I recommend it to everyone.",
    ],
    spied: [
      () => "The I-spy concluded within parameters. Object observed. No paperwork was generated. Bliss.",
      () => "I spied a thing, described it badly on purpose, and you found it anyway. Excellent process.",
    ],
    errand: [
      (v) => `The ${v} came through. I've filed it. The filing is the important part.`,
    ],
    raised_by: [
      (v) => `${v} raised me. Kept me fed, watered, and on schedule. The schedule ended. The rest kept.`,
    ],
    raised_favorite: [
      (v) => `${v}. Standing order, back then. I never once filed a complaint.`,
    ],
    built_floor: [
      () => "You laid a floor without a permit in sight. Retirement means I get to find that delightful.",
    ],
    planted: [
      (v) => `You planted ${v}. No application, no approval, straight in the ground. Anarchy. Wonderful.`,
    ],
    harvested: [(v) => `${v}, harvested. Yield reported to nobody. As it should be.`],
    dug: [
      () => "You dug a hole. In my working days that was a form. Watching you skip it was the treat of my week.",
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
    (v) => `... I have been writing up ${v}. The write-up is longer than the event.`,
  ],
  dog: [
    (v) => `${v}! I was there! Everyone was there! It was the best one, and so was the last one!`,
    (v) => `I think about ${v} a lot. Several times a day. Is that a lot?`,
    (v) => `${v}! I sat at the FRONT! I checked all the spots first. The front won!`,
  ],
  blob: [
    (v) => `${v} moved me ... I say that every year and every year it is true again.`,
    (v) => `Nobody who was not at ${v} will ever really understand it. I have tried explaining. I will keep trying.`,
  ],
  menace: [
    (v) => `${v} was tolerable ... The standing about was well organised, which is not nothing.`,
    (v) => `I attended ${v}. Briefly. I was seen there, which was the point.`,
  ],
  gremlin: [
    (v) => `Good crowd at ${v}. Good pockets ... I didn't. But there were.`,
    (v) => `${v}. I stayed at the back. Best view, back there. Nobody looks behind them.`,
  ],
  carrot: [
    (v) => `${v} happened ... Yes. I was present for it. We can leave it there.`,
  ],
  office: [
    (v) => `${v} was held. The paperwork for it is already complete, which is unusual and I intend to enjoy it.`,
  ],
};

for (const [form, lines] of Object.entries(FESTIVAL_LINES)) {
  const bank = (RESIDENT_MEMORY[form as AdultForm] ??= {});
  bank.festival = lines;
}

// --- Moments (DESIGN §Moments) ---------------------------------------------------
// Merged in the same way and for the same structural reason as the festivals: a
// Moment is written to WHOEVER HAPPENED TO BE STANDING THERE (sim/moments.ts),
// which is not a pool anybody curates, so a form with nothing to say would make
// the best night of the year land on silence from the one person who was out in
// it with you.
//
// THE LINE IS THE ENTIRE PAYOUT. There is no Moments screen, no notification and
// no record the player can open — the section is explicit that a Moment surfaces
// obliquely in somebody's line or not at all. So these banks are not flavour on
// top of a feature; they ARE the feature, and every one of them is the only
// evidence in the game that the night happened.
//
// NOBODY THANKS YOU FOR BEING THERE, exactly as the festival lines refuse to.
// They talk about the sky, or the walk, or the cold. A line like "I'm glad you
// brought me" makes the Moment a thing you are seen to have arranged, which is a
// half step from a thing you are meant to arrange, and these must never become
// something to go and get.
//
// AND NOBODY NAMES THE CONDITION. Not one line says how far out we were, which
// month it was, or that the sky does this five times a year. A villager who
// explains the trigger has published the objective.

/** The value is the shower's own name — "the short one", "the old one" — which
 *  is what she calls it and never what an almanac calls it (content/showers.ts).
 *  Free specificity, the same trick the festival bank runs: five nights share
 *  seven voices and the noun does the work. */
const SHOWER_LINES: Partial<Record<AdultForm, ((v: string) => string)[]>> = {
  scholar: [
    (v) => `We were out for ${v}. I counted for a while and then I stopped counting, which I want noted.`,
    () => "... I have no methodology for that. I stood there like everybody else.",
  ],
  dog: [
    (v) => `${v}! The sky was DOING things! I looked up the whole time! My neck hurt after and it was WORTH IT!`,
    () => "We stood outside in the dark and nothing was wrong. Nothing! I checked twice!",
    () => "The lights went ACROSS the sky and I ran under them! I kept up for a bit!",
  ],
  blob: [
    (v) => `${v} ... An entire performance, no stage, no notes, and not one of them took a bow.`,
    () => "I have never been so thoroughly upstaged, and I was not even working.",
  ],
  menace: [
    (v) => `We watched ${v}. I stayed out longer than I meant to ... That is all I intend to say about it.`,
    () => "The sky put on a display and I stood in a field to look at it. Repeat that and I'll deny it.",
  ],
  gremlin: [
    (v) => `${v}! Bits coming off the sky! ... You can't have any. I checked. I checked properly.`,
    () => "Nobody owns those. Nobody's even claimed them. I find that very relaxing and I don't know why.",
  ],
  carrot: [
    (v) => `... ${v}. Yes. I was out for that one. It was better than I was expecting.`,
  ],
  office: [
    (v) => `${v} took place. Unscheduled, unminuted, unreported ... I have decided not to file it.`,
  ],
};

/** No value: past the edge of the survey is one place, however far past it you
 *  went, and a distance in the line would be a number to beat. */
const FAR_OUT_LINES: Partial<Record<AdultForm, ((v: string) => string)[]>> = {
  scholar: [
    () => "We got out past where anything is arranged. The ground stops being about us. I found that steadying.",
    () => "... No survey. No datum. Nothing to measure from, so nothing to measure. I took no notes at all.",
  ],
  dog: [
    () => "We went SO far. Past everything! There was nothing there and it was the BEST nothing!",
    () => "I couldn't smell the town any more. Not at ALL. And I was still fine, because you were there.",
    () => "Past the edge of everything! My legs are still proud.",
  ],
  blob: [
    () => "We walked until there was no audience ... I performed anyway. You were very kind about it.",
    () => "Out there the town is a rumour. I have never had a better room and there was no room.",
  ],
  menace: [
    () => "You walked me to the end of the arranged world ... I would go again. Do not make an occasion of it.",
    () => "There is nothing out there. Nothing at all. I stayed a good while, looking at it.",
  ],
  gremlin: [
    () => "Nobody's been out there! Nothing's been moved! Everything I touched was FIRST!",
    () => "No fences that far out ... I looked for one for an hour. I wanted to move it.",
  ],
  carrot: [
    () => "We went past the last of the tended ground ... I don't grow out there. Nothing does. It was fine.",
  ],
  office: [
    () => "We left the district entirely. There is no form for that, and I have looked.",
  ],
};

/** The value is the YEAR, and not one line says it aloud. It is in the log so
 *  that two winters are two memories (sim/memory.ts); a villager announcing the
 *  date would be reading the save file at you. */
const WINTER_LINES: Partial<Record<AdultForm, ((v: string) => string)[]>> = {
  scholar: [
    () => "We were out when the cold arrived. I recorded the day. I was wrong about the day — it had been coming for a week.",
    () => "... Everything simply stops, and none of it is dead. I have read about it. Reading about it is not the same.",
  ],
  dog: [
    () => "It went COLD and we were OUTSIDE! The ground was hard and it made a NOISE when I ran on it!",
    () => "All the leaves went and nobody took them anywhere. Where do they GO. I have theories.",
    () => "The cold came and you were there and I ran a circle around the whole moment.",
  ],
  blob: [
    () => "The colour left ... I have been trying to do that on purpose for years, and the field did it while we watched.",
    () => "We stood out in it. The whole town went quiet and not one of them was doing it for effect.",
  ],
  menace: [
    () => "We were caught out in the cold together. I did not complain, which you may take as a compliment.",
    () => "The trees gave up entirely ... Frankly, a good look on them. Nobody asked me.",
  ],
  gremlin: [
    () => "Everything went grey and now you can SEE the shapes of things. Best season for finding. Obviously.",
    () => "Nothing grows over anything in the cold. It's all just sitting there, being findable.",
  ],
  carrot: [
    () => "The cold came while we were out in it ... I don't mind it. I'm not going to explain why.",
  ],
  office: [
    () => "The season turned while we were standing in it. Nobody filed anything. It turned regardless.",
  ],
};

for (const [kind, table] of [
  ["shower", SHOWER_LINES],
  ["far_out", FAR_OUT_LINES],
  ["winter_came", WINTER_LINES],
  ["answered", ANSWERED_LINES],
] as const) {
  for (const [form, lines] of Object.entries(table)) {
    const bank = (RESIDENT_MEMORY[form as AdultForm] ??= {});
    bank[kind] = lines;
  }
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
// ("Mushroom ... Corrected."), so a scholar who says one flat sounds like she
// is reading aloud from someone else's page mid-sentence. Framed as her own
// paperwork, the marker becomes part of the thing she is holding up.
export const SCHOLAR_DISSENT: ((t: string, r: string) => string)[] = [
  (t, r) => `I have read her card on the ${t}. I have written my own. It reads: "${r}"`,
  (t, r) => `The ${t} is misattributed. My card would read: "${r}" ... She has been told.`,
  (t, r) => `... The ${t}. Her placard is a guess in a nice font. Mine reads: "${r}"`,
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
      () => "... I'm told the plaza is character-building. I'm collecting data on that.",
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
  // COVERAGE IS NOW COMPLETE for every note a form can actually reach, which is
  // not the same as every note. `delight_finish` and `delight_piece` only fire
  // when content/tastes.ts gives that form a finish or a piece to be pleased by,
  // so a dog has no delight_finish bank because no finish will ever delight a dog
  // — writing one would be content nothing can reach. `home.test.ts` asserts the
  // reachable set exactly, in both directions, so a new taste row fails the test
  // until somebody writes the line it just made reachable.
  //
  // The five secret and institutional forms (ghost, carrot, humcube, cosmos,
  // mole) are absent on purpose: none of them lives in a house you built. The
  // Ghost has a taste row against the day that changes, and nothing else.
  //
  // Where a form still falls through, `tryHomeLine` walks NOTE_PRIORITY rather
  // than the notes, so it lands on a note the form CAN speak to instead of going
  // quiet.
  office: {
    homeless: [() => "My bed has been deaccessioned. No form was filed. I'd have accepted a form."],
    roofless: [
      () => "The roof is absent. I have opened a file on it. The file is also open to the sky.",
      () => "No walls to speak of ... I am, technically, working from home.",
    ],
    sealed: [
      () => "There is no door. Access denied. To me. By me. On my own behalf.",
      () => "I cannot get in. The paperwork for this would have been beautiful.",
    ],
    bare: [
      () => "A bed, and nothing else. It is compliant.",
      () => "Unfurnished. Requisitions were never my department. Nothing was, latterly.",
    ],
    grand: [
      (v) => `${v} tiles. That is well above my grade. I have not reported it.`,
      (v) => `${v} tiles, for one creature. Somebody has been generous with the allocation.`,
    ],
    snug: [
      (v) => `${v} tiles. Efficient use of floor. I approve, and my approval is worth nothing now.`,
      () => "Small. Everything within reach of the bed, which is the correct amount of ambition.",
    ],
    furnished: [
      (v) => `There is a ${v}. I have not filed it. I am not going to file it.`,
      (v) => `A ${v}. I put my hands on it sometimes, in the manner of a desk.`,
    ],
    finish: [
      (v) => `${v}. A reasonable specification. Nobody consulted me, which is the retirement.`,
    ],
  },
  menace: {
    delight_finish: [
      (v) => `It's ${v} ... You paid attention. I am not going to say more than that.`,
      () => "You built it in the good one. I noticed immediately. I said nothing for an hour.",
    ],
    delight_piece: [
      (v) => `A ${v} ... You were paying attention. I won't be saying more than that.`,
      (v) => `You put a ${v} in it. I know what that means. Don't make me say what it means.`,
    ],
    homeless: [() => "My bed. Gone. I am choosing to find this dramatic rather than upsetting."],
    roofless: [
      // NOT "I am being rained on", which this said until the all-banks sweep
      // (banks.test.ts) found it: there is no rain in this world, so the one
      // line most likely to send somebody looking at the sky was promising
      // something the sky will never do.
      () => "There is no roof. I am simply outdoors, in my own bedroom, at all times.",
      () => "The sky is in my bedroom. I did not approve the sky.",
    ],
    sealed: [
      () => "There is no door. I am not going to climb. I have never climbed.",
      () => "Sealed. I am to be admired from outside, then ... Fine. That works.",
    ],
    bare: [() => "It is empty. I am the decor. Still — one could add to me."],
    grand: [
      (v) => `${v} tiles. Somewhere to make an entrance at last. Not that I will.`,
      (v) => `${v}. Yes. A room should be slightly more than necessary.`,
    ],
    snug: [
      () => "Compact. I have decided that's deliberate, and therefore tasteful.",
      () => "A smaller room keeps the good taste concentrated. Mine, mostly.",
    ],
    furnished: [
      (v) => `There is a ${v}. Fine. It stays.`,
      (v) => `A ${v}, in my house. I use it when nobody is looking.`,
    ],
    finish: [(v) => `${v}. Acceptable. I'd have chosen it myself, given the chance.`],
  },
  dog: {
    delight_piece: [
      (v) => `A ${v}! For me! I've been sitting on it. Near it. Both.`,
      (v) => `You remembered about the ${v}. You REMEMBERED.`,
    ],
    homeless: [
      () => "Where's my bed? Where's my BED. Okay. Okay. It's fine. Is it fine?",
      () => "My bed's gone. I'm not worried. I'm a LITTLE worried. Where do I point myself at night?",
    ],
    roofless: [
      () => "The roof went! I can see stars. Is that good? ... It's a bit good.",
      () => "It's open at the top now. I've been looking up. For ages.",
    ],
    sealed: [
      () => "There's no door. I've been sitting outside it. I'm very good at that.",
      () => "I can't get in! It's fine. I'll wait. I'm SO good at waiting.",
    ],
    bare: [
      () => "It's got a bed! That's the important one. That's the main one.",
      () => "One bed, one me. That's the maths done. It's a home.",
    ],
    grand: [
      () => "It's SO big. I ran a lap. I'm going to run another one.",
      () => "There's an echo in it! It's mine! The echo and the room, both!",
    ],
    snug: [
      (v) => `${v} tiles. I can see all of it from the bed. ALL of it.`,
      () => "It's just the right amount of room. I checked by lying down in the middle.",
    ],
    furnished: [
      (v) => `There's a ${v}! I sit near it. It's a good ${v}.`,
      (v) => `The ${v} is my favourite. Everything's my favourite. The ${v} first, though.`,
    ],
    finish: [
      (v) => `It's ${v}! I don't know what that means. I love it.`,
      (v) => `${v}, the whole way round. I've smelled all of it.`,
      (v) => `The walls are ${v} now. I showed everyone. They'd already seen. I showed them again.`,
    ],
  },
  blob: {
    delight_finish: [
      (v) => `${v}. I walk in and the room does a little hush. Every time.`,
      (v) => `You built it in ${v}. You understand the assignment. The assignment is atmosphere.`,
    ],
    delight_piece: [
      (v) => `A ${v} ... The room has a focal point now. So do I.`,
      (v) => `You put a ${v} in it. Staging. You understand staging.`,
    ],
    homeless: [
      () => "I have been made homeless. Tragically. Beautifully. Someone should be watching this.",
      () => "No bed ... I shall sleep dramatically against whatever's nearest. Observe.",
    ],
    roofless: [
      () => "No roof. Open air ... Ambitious, as a venue.",
      () => "The walls have gone and left the bed standing in the round.",
    ],
    sealed: [
      () => "There is no door. My entrance has nowhere to happen. THAT is the tragedy.",
      () => "Sealed. An unenterable room ... Conceptually, I admire it. I cannot live in it.",
    ],
    bare: [
      () => "An empty stage ... I have worked with less. I have never liked it.",
      () => "Bare boards and a bed. The audience will have to imagine the rest.",
    ],
    grand: [() => "The proportions are theatrical. I enter it. I make an entrance."],
    snug: [() => "Intimate staging. Every seat is a good seat. There is one seat."],
    furnished: [
      (v) => `There is a ${v}. I act around it. It has learned to hold still.`,
      (v) => `The ${v} and I have an arrangement. It is in every scene.`,
    ],
    finish: [
      (v) => `${v}, throughout. The room commits. I respect a room that commits.`,
      (v) => `Done in ${v} ... It sets a tone before I have said a word.`,
    ],
  },
  gremlin: {
    delight_piece: [
      (v) => `A ${v}. Do you know what I can put UNDER a ${v}? Neither do you. Yet.`,
      (v) => `The ${v} is perfect. I've already got plans. They're mostly legal.`,
    ],
    homeless: [() => "Someone took my bed. I respect it. I want it back."],
    roofless: [
      // The second half of the same bug the Menace had — see her `roofless`.
      // Both roofless banks reached for weather, which is the one thing a
      // missing roof cannot expose you to here.
      () => "No roof. Everything in there is just sitting under the open sky. Some of it isn't mine.",
      () => "It's open. Anyone could reach in ... I'd reach in.",
    ],
    sealed: [
      () => "No door. I got in anyway. Don't ask how ... There's no door.",
      () => "Sealed up. Which is a challenge, and I've accepted it.",
    ],
    bare: [
      () => "Nothing in it yet. Give me a week.",
      () => "Empty room ... Empty is just pre-full. I know rooms.",
    ],
    grand: [
      (v) => `${v} tiles. Do you know how much I can fit in ${v} tiles? Neither do I. Yet.`,
      () => "There's room in there for things I haven't found.",
    ],
    snug: [
      (v) => `${v} tiles. Everything within reach. That's not small, that's tactical.`,
      () => "Tight. Good. I'll know the moment anything's been moved.",
    ],
    furnished: [
      (v) => `I moved the ${v}. Slightly. You won't be able to prove it.`,
      (v) => `A ${v} of my own. Never had one that started out mine. It's different. It's good different.`,
    ],
    finish: [
      (v) => `${v}. Nice. I've been taking little bits off the back, to check.`,
      (v) => `It's ${v} all over. I could get something for that. I won't.`,
    ],
  },
};

// --- The room they're standing in --------------------------------------------
// What a resident says about the history of the room you are both in right now
// (Phase 9a, sim/history.ts). The social half of "a place keeps a history"; the
// other half is the flat record you get by inspecting the building, in
// content/history.ts.
//
// ONLY TWO KINDS, AND THE OTHER SIX ARE THE RECORD'S ALONE. `sim/history.ts`
// describes eight, and writing six forms × eight kinds would be forty-eight
// line pools for a feature whose whole point is that it stays small. These two
// earn the authoring because they are the two a person would actually bring up:
//
//   • `met` — the only fact in the set the player could not have worked out by
//     looking around the room, and the only one that is about the two of you.
//   • `built_floor` — the roadmap's own example line, and the one thing in
//     here a resident can pay the player a compliment about.
//
// A villager remarking that you once dug a hole in what is now their kitchen is
// a sentence nobody needs; the record says it, flatly, and that is the right
// register for it.
//
// NOBODY NARRATES THEIR OWN TENANCY. `met` fires only when the note is about
// somebody ELSE — a villager who greets you with "you and I first spoke here"
// is doing the game's remembering for it, out loud, which is the tone this
// whole phase is fenced against. See `tryHistoryLine` in sim/dialogue.ts.
//
// Keyed by plain `string` for the same reason RESIDENT_HOME is: content imports
// nothing from sim. `history.test.ts` pins the correspondence.
export const RESIDENT_HISTORY: Partial<
  Record<AdultForm, Partial<Record<string, ((who: string) => string)[]>>>
> = {
  scholar: {
    met: [
      (w) => `${w} and I first spoke in this room. I logged it. I log arrivals.`,
      (w) => `This is where ${w} turned up. I have the date. I have most dates.`,
    ],
    built_floor: [
      () => "You laid this floor. I've measured it. It's within tolerance, which is a compliment.",
      () => "These are your boards ... I stand on them daily and think about the labour. Briefly.",
    ],
  },
  office: {
    met: [
      (w) => `${w} was received in this room. No form was filed. There ought to have been a form.`,
      (w) => `This is where ${w} was first encountered. I remember rooms. It's what I have.`,
    ],
    built_floor: [
      () => "You laid this floor yourself. Unpermitted ... Excellent work. I'd have approved it.",
      () => "These boards went down without a requisition. I've decided not to notice.",
    ],
  },
  menace: {
    met: [
      (w) => `${w} came in here once, for the first time. I was already here. I'm always already here.`,
      (w) => `This is the room where you met ${w}. I watched. I watch everything in here.`,
    ],
    built_floor: [
      () => "You put this floor down. Personally ... I have not tripped on it once, which is my review.",
      () => "Your boards. Every one. I've walked the whole thing checking. They held.",
    ],
  },
  carrot: {
    met: [(w) => `${w} was in here first ... It shows, if you know how to look.`],
    built_floor: [() => "Your boards ... Laid well. The room agrees."],
  },
  dog: {
    met: [
      (w) => `This is where ${w} came from! Not FROM. But where they were. First!`,
      (w) => `${w}! In this room! That happened! I was so pleased. I'm still pleased.`,
      (w) => `I remember ${w} in here. I'm very good at remembering rooms. It's mostly the smell.`,
    ],
    built_floor: [
      () => "You made this floor. With your HANDS. I've been lying on it thinking about that.",
      () => "These are your boards! I sleep on them. It's the best floor.",
      () => "Your floor! Still here! Still the best one!",
    ],
  },
  blob: {
    met: [
      (w) => `${w} made their entrance here ... I have thought about restaging it.`,
      (w) => `This room has met ${w}. Rooms remember an entrance. So do I.`,
    ],
    built_floor: [
      () => "You built this floor. I have performed on it. It does not creak, which is a loss.",
      () => "Your boards ... A stage is only ever somebody's floor, taken seriously.",
    ],
  },
  gremlin: {
    met: [
      (w) => `${w} first showed up in this room. I was under something at the time.`,
      (w) => `This is where ${w} happened. I remember. I remember rooms better than names.`,
    ],
    built_floor: [
      () => "You laid these boards. I've had one up. I put it back. You'd never know.",
      () => "Your floor. Nice work. There's a gap by the wall and I'm keeping it.",
    ],
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
      "Ah, my favourite recurring observation.",
    ],
    friend: [
      "I've started a file on you. It's the flattering kind. Mostly.",
      "I saved you a finding. It's wrong, but it's the interesting kind of wrong.",
      "You're the only one here who lets me finish a sentence about soil.",
      "I cite you in conversation more than is professional.",
    ],
    close: [
      "I don't say this to many subjects ... The research is better when you're around.",
      "My conclusion, after extensive observation: you're my favourite variable.",
      "... I'd have retired much worse, without you nearby.",
      "The town was a study. You made it a home ... That's in the notes now.",
    ],
  },
  office: {
    familiar: [
      "Oh, it's you. I'll allow the interruption.",
      "You. Yes. I have time. I have all the time now.",
      "You again. The good interruption.",
    ],
    friend: [
      "I'd put you on my calendar, but I burned it.",
      "You're the good kind of meeting.",
      "If I still had a calendar, you'd be the only thing on it.",
    ],
    close: [
      "... I'm glad you moved in. That's the whole update.",
      "You made retirement worth the paperwork.",
      "... Retirement gave me time. You gave it a point. Filed under: said once.",
    ],
  },
  menace: {
    familiar: [
      "Ah. You. You may approach.",
      "I've decided you're tolerable. Don't celebrate.",
      "You. Good. The day improves marginally.",
      "I remembered your name today without trying. Alarming.",
    ],
    friend: [
      "You have improved. I take full credit.",
      "I would be seen with you in public. Publicly.",
      "I've told people about you. Favourably. They were stunned. So was I.",
      "You may borrow my opinion of you. It's high.",
    ],
    close: [
      "You may consider yourself my favourite. Tell no one ... Tell everyone.",
      "I have standards. You've met most of them now.",
      "I have exactly one soft spot. Guard it. It's you. Tell NO one.",
      "... I was going to say something withering. I couldn't find anything. That's what you've done.",
    ],
  },
  dog: {
    familiar: [
      "You came back! I hoped. I always hope.",
      "Hi. Hi. Okay. Hi.",
      "I know your footsteps now! Yours are the good ones.",
      "You're on my rounds. You didn't ask to be. You are.",
    ],
    friend: [
      "You're my person. I've made it official. In my head.",
      "I saved you the good stick.",
      "I told the fence about you. Good things. The fence agrees.",
      "When something good happens I look for you first. That's just true now.",
    ],
    close: [
      "I'd follow you anywhere. I have, mostly. You didn't notice.",
      "Best day. Every day you're here is best day.",
      "... You're my whole list of favourite people. There were other names on it. I lost them on purpose.",
      "Wherever you're going, that's the good direction. That's how I navigate now.",
    ],
  },
  blob: {
    familiar: [
      "You've returned. The scene improves.",
      "Ah, an audience I actually like.",
      "You're becoming a regular. Every run needs one.",
      "Ah. My audience arrives.",
    ],
    friend: [
      "I would perform for you specifically.",
      "You get my better material.",
      "I do my better material for you. You've noticed. Don't say it.",
      "When you're in the plaza, I project further.",
    ],
    close: [
      "You're my leading light. Don't tell the plaza.",
      "... I'd hold the stage for you. Curtain and all.",
      "... There are performances I only give when you're here. Most of them are just talking.",
      "You're in the programme now. Permanently. There's no removing anyone from the programme.",
    ],
  },
  gremlin: {
    familiar: [
      "Oh, it's you. I put your thing back. Mostly.",
      "You're fine. You're one of the fine ones.",
      "It's you. I left your gate alone today. Felt weird.",
      "You're on the do-not-move list. Short list.",
    ],
    friend: [
      "I only move YOUR fences a little. That's respect.",
      "I found something. You can have it. Probably.",
      "I found something good today and thought of you FIRST. Then I kept it. But FIRST.",
      "You can look in my collection any time. Looking's free.",
    ],
    close: [
      "I'd never take anything of yours ... I'd borrow it dramatically and return it.",
      "You're my favourite. Don't check your fences.",
      "You could leave your things anywhere in this town. Anywhere. I'd guard them. Me.",
      "... You're the one thing here I'd never rearrange.",
    ],
  },
  carrot: {
    familiar: ["... You again. Good.", "I've started expecting you ... That's all."],
    friend: [
      "You're one of the quiet good things here ... Don't make it strange.",
      "When you're about, the day goes easier ... I've noticed. That's all.",
    ],
    close: [
      "... I don't bless much on purpose. You're on the list.",
      "You're welcome at my patch any hour ... That's as warm as I get. It's quite warm.",
    ],
  },
};

// --- Kinship (Phase 12) --------------------------------------------------------
// Said only to a player of the SPEAKER'S OWN FORM — a dog to a dog, a menace to
// a menace. Pooled into idle when the forms match, so recognition is a thing
// that occasionally surfaces rather than a mode. Identity flavor and nothing
// else: no perk, no gate, no mechanic knows the forms matched (form is
// identity, never a job — DESIGN §Pillars).
export const RESIDENT_KIN: Partial<Record<AdultForm, string[]>> = {
  dog: [
    "You get it. The sticks thing. You GET it.",
    "Another one of us! I could tell by the everything.",
    "We should run somewhere. No reason. You already know there's no reason.",
  ],
  scholar: [
    "A fellow scholar. Peer review at last. Be gentle.",
    "You keep notes too. I can tell. The eyes do a filing thing.",
  ],
  blob: [
    "Another blob ... The stage is big enough for both of us. It isn't. We'll manage.",
    "You feel the drama in this town too. I can tell. We're the only ones holding it up.",
  ],
  menace: [
    "Another menace ... The town can support two. Barely. I've done the arithmetic.",
    "You have standards. I have standards. Between us the town doesn't stand a chance.",
  ],
  gremlin: [
    "Takes one to know one. I know one. Hello.",
    "I won't ask where you got that. You wouldn't ask me. It's called manners.",
  ],
  office: [
    "You were office too, back before. I can tell. The posture.",
    "We both know what a Tuesday used to mean ... Look at us now.",
  ],
  carrot: ["... You too, then ... Good."],
};

// --- Absence greetings (Phase 12) ---------------------------------------------
// What somebody says when you talk to them after being genuinely gone — the
// "haven't seen you in a while" the game never had. Two gaps only, "days" and
// "weeks": a greeting that named the exact number would be a login screen with
// a face on it, and the thresholds live in sim/dialogue.ts where the clock is.
//
// Voice rule: an absence is noticed, never billed. Nobody may guilt, tally, or
// ask where you were as an accusation — AC's cockroaches are the exact thing
// DESIGN §4 refuses ("absence as story, not punishment"). The Dog misses you
// because he is the Dog; the Menace noticed, which should flatter you.
export const RESIDENT_ABSENCE: Partial<Record<AdultForm, { days: string[]; weeks?: string[] }>> = {
  scholar: {
    days: [
      "You've been elsewhere. The data thinned. It's back now.",
      "Ah — returned. The fence held. I have the readings somewhere.",
      "There you are. The record resumes.",
    ],
    weeks: [
      "You were gone a while. I filed you under 'pending'. Reopening the file.",
      "... Weeks. I counted, obviously. Counting is free.",
      "... I began a study of your absence. Inconclusive. Glad it's over.",
    ],
  },
  office: {
    days: [
      "You've been away. Nothing required your signature. Retirement is astonishing.",
      "Back, I see. I didn't file the absence. There's nowhere to file it. Wonderful.",
      "Back. Your absence generated no paperwork. Enviable.",
    ],
    weeks: [
      "Gone long enough that I nearly opened a ledger. Nearly. I lay back down.",
      "... A long one, that. The calendar stayed blank the whole time. I checked twice.",
      "A long one. I'd have sent a memo, but there's nowhere to send anything. It's still strange. It's still wonderful.",
    ],
  },
  dog: {
    days: [
      "You were GONE and now you're BACK. Okay. Okay. We're okay.",
      "There you are! I checked the good spots. You weren't in any of them. You're here!",
      "Three sleeps! I count in sleeps. You weren't in any of them and now you're HERE.",
      "You're back! The town kept happening. I'll catch you up. Most of it was smells.",
    ],
    weeks: [
      "You were gone SO LONG. I re-smelled everything. It's all still here. So are you!",
      "I kept your stick. The whole time. It's a very kept stick now.",
      "I saved up SO much news. Ready? ... I forgot all of it. It's fine. New news is happening right now.",
    ],
  },
  blob: {
    days: [
      "You missed several of my finest moments. I shall reprise them. Sit anywhere.",
      "Returned! The scene resumes.",
      "You were away. The ensemble felt thinner.",
    ],
    weeks: [
      "An extended absence. The stage felt it. I performed to the gap, and the gap was moved.",
      "... You were gone a long time. I rehearsed a welcome. This is it. There was more.",
      "Weeks offstage ... Places, everyone. The run resumes.",
    ],
  },
  menace: {
    days: [
      "You were elsewhere. I noticed, which should flatter you.",
      "Back, are we. The town managed. Barely. Don't do it again soon.",
      "Elsewhere again? The town wilts slightly without an audience. I assume that's why.",
    ],
    weeks: [
      "Weeks, was it. I had opinions about it. They've mellowed into this greeting.",
      "You've been gone an age. I redecorated my expectations. You've exceeded the new ones already.",
      "An AGE. I began composing a remark for your return. This is it. There were drafts.",
    ],
  },
  gremlin: {
    days: [
      "You were gone. I touched nothing ... Two things. I touched two things.",
      "Back already? Good. Things stay where they are when you're around. Mostly.",
      "Short trip? Everything's where you left it. Roughly.",
    ],
    weeks: [
      "You were gone AGES. Your fences are fine. Don't check the gate. The gate is a long story.",
      "Long trip. I kept an eye on your stuff. Both eyes, some nights.",
      "AGES, that was. I made a pile of things you'd have liked. It's around.",
    ],
  },
  carrot: {
    days: ["... Back, then.", "... There you are."],
    weeks: [
      "... It's been quiet. Good quiet. Better now.",
      "... A while, that. The ground didn't move. Neither did I. Much.",
    ],
  },
};

// --- In-the-middle-of remarks (Phase 12) --------------------------------------
// A neighbour noticing what you're visibly in the middle of: three fells or
// three harvests inside the window (sim/dialogue.ts §tryMidstLine) is a
// morning's work, and a town this small talks about a morning's work. `v` is
// the last carried value for harvests ("a pumpkin", "some peas"); the gathered
// templates take the same argument and ignore it, so the two banks stay one
// shape.
//
// Nothing in here may ever suggest what to do NEXT — "you've been busy" is a
// neighbour, "you should clear the north field" is a foreman, and this game
// employs nobody.
export const RESIDENT_MIDST: Partial<Record<AdultForm, Partial<Record<"gathered" | "harvested", ((v: string) => string)[]>>>> = {
  scholar: {
    gathered: [
      () => "That's the third one this morning. I've been logging the thumps. Rigorous work, whichever kind it is.",
      () => "Still at it, I see. The treeline is developing a hypothesis about you.",
      () => "Sustained felling since mid-morning. I've been recording intervals. You're very regular.",
    ],
    harvested: [
      (v) => `More produce. That was ${v}, just now. The plot yields under observation, which is good science and better luck.`,
      (v) => `More ${v}. The yield curve is doing something I'd frame.`,
    ],
  },
  office: {
    gathered: [
      () => "You've been at that all morning. In my day it would have needed a permit per swing. Enjoy yourself.",
      () => "That's the third crash this morning. I counted from here. Counting is the whole hobby now.",
    ],
    harvested: [
      (v) => `A productive morning, I hear. ${v.charAt(0).toUpperCase() + v.slice(1)}, again. Undocumented. Glorious.`,
      (v) => `Another haul. ${v.charAt(0).toUpperCase() + v.slice(1)}. The land claim earns its stamp.`,
    ],
  },
  dog: {
    gathered: [
      () => "You keep KNOCKING things DOWN. It's the best noise. Do another one.",
      () => "I've been watching you work. I supervised. From here. With my whole heart.",
      () => "Third one today! I heard all three! THUMP. It's my favourite word now.",
    ],
    harvested: [
      (v) => `You pulled up ${v} AGAIN. The ground just keeps HAVING things.`,
      (v) => `More ${v}! The pile got bigger! I've been guarding it. Loosely.`,
      () => "You keep pulling things up and the ground keeps letting you! What a day!",
    ],
  },
  blob: {
    gathered: [
      () => "The felling! The crash of it! I've been narrating from a distance. You're very good in this role.",
      () => "Another one down! The matinee continues. I've been giving notes. To myself. About you.",
    ],
    harvested: [
      (v) => `A harvest montage. ${v.charAt(0).toUpperCase() + v.slice(1)}, and before that more. I approve of the spectacle.`,
      (v) => `Still harvesting. ${v.charAt(0).toUpperCase() + v.slice(1)}, encore. The land loves a long run.`,
    ],
  },
  menace: {
    gathered: [
      () => "Still at it? The racket is very industrious. I've decided to admire it from here.",
      () => "That's been going on all morning. Industrious. It reflects well on the town, which reflects well on me.",
    ],
    harvested: [
      (v) => `That's ${v} on top of everything else this morning. You do keep busy. How agricultural.`,
      (v) => `${v} again. Relentless. Very nearly admirable. It IS admirable. There.`,
    ],
  },
  carrot: {
    gathered: [
      () => "That noise all morning was you, then ... Thought so.",
      () => "Busy day ... The stumps say so.",
    ],
    harvested: [
      (v) => `${v}, and more before it ... The ground's having a generous day.`,
      () => "A proper harvest morning ... Don't let me slow it.",
    ],
  },
  gremlin: {
    gathered: [
      () => "Heard you working all morning. I left the woodpile alone. You're welcome.",
      () => "Lot of falling-down noises today. Good haul? Asking for the heap.",
      () => "All that felling. Wood everywhere. If any goes missing, it was loose.",
    ],
    harvested: [
      (v) => `That's a proper pile you're building. ${v.charAt(0).toUpperCase() + v.slice(1)} and counting. Piles attract me. Fair warning.`,
      (v) => `${v}, and the pile grows. I've been watching the pile. The pile knows.`,
    ],
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

/** What somebody says as they hand you a finish (content/skins.ts `given`,
 *  sim/friendship.ts `takeGift`). The other half of warmth, and the only half
 *  that comes with an object.
 *
 *  KEYED BY FINISH, NOT BY FORM, and that is the one thing to keep right here.
 *  Every other bank in this file is per-form because a form is a voice; these
 *  are per-PERSON, because Winifred owning the quarry note is a fact about
 *  Winifred and not about scholars. Keyed by form, her line would come out of
 *  Prudence's mouth — the same trap COMPANY_YES's carrot comment describes,
 *  from the other direction.
 *
 *  Neither line names a tier, a threshold, or the friendship itself. They are
 *  somebody mentioning a thing they'd been meaning to mention. */
export const GIVEN_LINES: Partial<Record<SkinId, string>> = {
  // Dog voice: enthusiastic, exclamatory, brief. He has been carrying it around
  // for a while, which is the most Pesto detail available.
  ochre:
    "There's a tin in the cart! Same yellow as half the front doors on my round ... I kept it back for you.",
  // Curator voice: fusty, decisive, quietly proprietary about knowing things.
  // The museum's own walls are the evidence, so she doesn't have to argue.
  marble:
    "The walls here came from a quarry north of the grove. Exhausted now, though not by me ... I wrote down where.",
};

/** The line for a given finish. Undefined when a `given` row has been added to
 *  content/skins.ts without one — asserted against in skins.test.ts, because a
 *  gift handed over in silence is a vending machine. */
export function givenLine(id: SkinId): string | undefined {
  return GIVEN_LINES[id];
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
    "A joint expedition. I'll co-author.",
  ],
  dog: [
    "YES. Where. Doesn't matter. Yes.",
    "I was already coming. I just hadn't been asked yet.",
    "Yes! Wait, what was the question. Doesn't matter. Yes!",
  ],
  blob: ["A tour. With me in it. Very well.", "I accept. I'll need no direction. I never do.", "You want ME? ... Correct."],
  menace: ["I shall accompany you. Don't make it strange.", "Fine. But I'm not carrying anything.", "Very well. Walk slightly behind me ... Fine. Beside."],
  gremlin: ["Ooh. Where are we going. Is it somewhere with things in it.", "Yes. I'll be good. Mostly good.", "Yes. If we find anything, splitsies. I do the finding."],
  office: ["I'll come. I'm not filing it. That's the treat.", "Out of office. Genuinely, for once.", "Approved. Effective immediately."],
  // NOT "the stall keeps" — that line predated `ROOTED` (sim/company.ts). The
  // stall-keeper can never be invited anywhere, so every carrot who says these
  // is a RESIDENT with no stall to keep. Same trap for any bank whose form is
  // also an institution: check who can actually reach the line.
  carrot: [
    "I shall walk with you. The patch keeps without me.",
    "Blessed. Also free until evening.",
    "... All right. Walk slow.",
  ],
};

/** While they are with you — the idle bank, pooled with their ordinary one so a
 *  companion is still themselves and not a walking status message. */
export const COMPANY_IDLE: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "Still with you. Still taking notes. Some of them are about you.",
    "This counts as a transect. I've decided it counts as a transect.",
    "Lead on. I'll say something insightful within the hour.",
    "I've started a section in the notes called 'with you'. It's growing.",
  ],
  dog: [
    "Are we still going? We're still going. Good.",
    "Best walk. Ongoing. Best walk.",
    "I'm right here. I checked.",
    "I'm matching your steps. Are you matching mine? Somebody's matching.",
  ],
  blob: ["I am accompanying you. It's a supporting role. I'm elevating it.", "The scenery has improved since I entered it.", "Walking. Together. A two-hander. Rare form."],
  menace: ["I'm still here. Nobody need know why.", "Carry on. I'm observing. Judgementally, but present.", "We look impressive together. That's mostly me. Partly you. Mostly me."],
  gremlin: ["I haven't taken anything. Recently.", "Ooh, what's that. No, keep going. But ooh.", "I've pocketed nothing so far. Longest streak of my life."],
  office: ["No agenda. No minutes. I'm coping.", "This is the longest I've been away from the desk. It's fine. It's fine.", "This walk has no agenda. I've checked twice. Marvellous."],
  carrot: ["The soil changes underfoot. I notice these things.", "...", "Still here ... Still walking."],
};

/** And the goodbye, when their own day takes them back (sim/company.ts
 *  `dayOver`). Never an apology and never a request that you do it again —
 *  they have a life, and the invitation is always open. */
export const COMPANY_BYE: Partial<Record<AdultForm, string[]>> = {
  scholar: ["That's the light gone. I'll write it up ... Good day's work.", "I'm off. The notebook is fuller than it was.", "Home. The notes are full. That's a good day by definition."],
  dog: [
    "Is it over? It's over. It was the best one.",
    "Going home. I'll be at the board. Come and get me.",
    "That was the best one so far. The next one is also going to be the best one.",
  ],
  blob: ["I must retire. The performance requires rest.", "Exit, mine ... You were a serviceable co-star.", "I exit. The day was well staged. I'll take my bow at home."],
  menace: ["I'm going in. This was tolerable. Extremely tolerable.", "That's enough of that. Same again sometime.", "I'm retiring for the evening. You did well today. I don't say that. I said it."],
  gremlin: ["I'm off. Check your pockets ... They're fine. Check anyway.", "Home. I found four things. You saw two of them.", "Home time. I'm taking a souvenir. It's a leaf. Legitimate leaf."],
  office: ["Back to the desk. It missed me. It says nothing, but it missed me.", "That's me clocked off. From nothing. Wonderful.", "Day's end. Attendance was taken. It was two. Perfect turnout."],
  carrot: [
    "I'm away home. Go well.",
    "Evening ... Blessings, and so on.",
    "That's my light gone ... It was a good one.",
  ],
};

// --- Games (sim/play.ts) -------------------------------------------------------
// Three moments per game — saying yes, being found, and you giving up — plus
// the weeks-later memory lines down in RESIDENT_MEMORY (`hid` / `spied`).
// EVERY PLAYABLE FORM GETS EVERY BANK, on the errand/company argument at its
// purest: a game pays nothing but the line and the memory, so a form with no
// line would make the beat land on silence for that person. The secrets are
// not here because the secrets can never be invited (sim/company.ts).
//
// Each form hides badly in its own way, and THAT IS VOICE, not a stat — the
// sim stores nothing about how well anybody hid, and no line may claim a
// mechanical fact the world doesn't hold.

/** Saying yes — said as they run off, so it doubles as the rules being made
 *  up on the spot. There is no count; nothing in a line may promise one. */
export const GAME_YES: Partial<Record<GameId, Partial<Record<AdultForm, string[]>>>> = {
  hide: {
    scholar: [
      "Very well. I'll conceal myself. Methodically.",
      "One round. Fair warning: I've surveyed this town. I know where it isn't looking.",
    ],
    dog: [
      "YES. I'm going. I'm already going. DON'T LOOK.",
      "Hiding! I'm the best at it except for the tail. The tail is a free spirit.",
    ],
    blob: [
      "I shall vanish. The town will speak of nothing else.",
      "Very well. My absence will be the performance.",
    ],
    menace: [
      "I have somewhere in mind. You'll never find it. It's perfect. Stop watching me.",
      "One game. I warn you: I am extremely good at not being places.",
    ],
    gremlin: [
      "Hiding! My whole skillset, gone legitimate. Don't follow.",
      "Yes. I know a spot. It knows me. We have an understanding.",
    ],
    office: [
      "One game. I'm marking myself absent ... Off I go.",
      "Approved. I'll be unavailable. For once it's official.",
    ],
    carrot: [
      "... All right. I'll be somewhere.",
      "One game. Count, or don't. The waiting is the same.",
    ],
  },
};

/** A companion proposing a game, unprompted (sim/play.ts `offerDue`). A
 *  sentence, never a state: nothing waits on it, nothing expires, and the
 *  buttons it's pointing at were already there. So no line may demand an
 *  answer — it's somebody thinking out loud about a game, and ignoring it is
 *  a complete response. */
export const GAME_OFFER: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "We could play something. Hide and seek. I Spy. I'm equally rigorous at both.",
    "A proposal: a game. For the data. And slightly for the game.",
  ],
  dog: [
    "We could play something!! I know both games!! I love both games!!",
    "Is it game time? It could be game time. Just saying it COULD be.",
  ],
  blob: [
    "We could play something, you know. I'm told I elevate any game I'm in.",
    "The afternoon wants a second act. A game, perhaps. I know two.",
  ],
  menace: [
    "We could play something. I'd win. That's not a threat, it's a forecast.",
    "A game, perhaps. I'm very good at them. All of them. Historically.",
  ],
  gremlin: [
    "Fancy a game? Hiding, spying — my whole skillset, but friendly.",
    "We could play something. I know all the good spots. That's a hint, not a brag. Both.",
  ],
  office: [
    "We could play a game. There's no form for it. That's rather the appeal.",
    "I'm told games exist for weekdays now. We could verify that. Together.",
  ],
  carrot: [
    "... We could play something. If you like. No hurry either way.",
    "... A game, maybe. The day's got room in it.",
  ],
};

/** Being found — the flash line at the moment the game ends well. Never a
 *  score, never a time, never "again?": the invitation is always open and the
 *  buttons are where it lives. */
export const GAME_FOUND: Partial<Record<GameId, Partial<Record<AdultForm, string[]>>>> = {
  hide: {
    scholar: [
      "Found ... Noted. The spot was sound. The observer was better.",
      "Ah. Found. I'll revise the spot. The spot had one flaw, which was you.",
    ],
    dog: [
      "YOU FOUND ME! I knew you would! I hoped and knew!",
      "FOUND! My heart was so loud. Could you hear it? It was the loudest thing I own.",
    ],
    blob: [
      "Discovered! ... I was beginning to think the audience had gone home.",
      "Found. Naturally. A presence like mine can only be delayed.",
    ],
    menace: [
      "This proves nothing. The spot was flawless. You were lucky.",
      "Fine. Found. I let the tail show. It was mercy.",
    ],
    gremlin: [
      "Found! Fair's fair. I did borrow this spot from somebody smaller.",
      "You found me. And I found two things while I was in there. Good game all round.",
    ],
    office: [
      "Located. Marking myself present again.",
      "Found, and honestly? A relief. I was starting to draft things in my head.",
    ],
    carrot: [
      "... Found. So it goes.",
      "... There you are. There I am. Good game.",
    ],
  },
  // No `spy` bank in GAME_YES, deliberately: for I Spy the acceptance IS the
  // clue (SPY_CLUE below), and a yes-line before it would be two flashes for
  // one breath. These two are the game's other ends.
  spy: {
    scholar: [
      "That's it. Confirmed against the record. The record is me.",
      "Found. Your methodology was 'walking around', and I can't fault the results.",
    ],
    dog: [
      "THAT'S THE THING! That's it! You looked at it and it's the one!",
      "YES! That one! I picked it because I love it!",
    ],
    blob: [
      "That is the very thing. The reveal lands. Scene.",
      "Found! The audience gasps. The audience is me. I gasped.",
    ],
    menace: [
      "That's it. Obviously. I was starting to compose easier clues. Insultingly easy ones.",
      "Correct ... I won't be making the next one so merciful.",
    ],
    gremlin: [
      "That's the one! And it's still there! Restraint. From both of us.",
      "Found it! Now we both know where it is. That's how hoards start.",
    ],
    office: [
      "That's the item. Observation closed. Nothing to sign. Bliss.",
      "Correct. I'd stamp it if I still stamped. I don't. Lovely.",
    ],
    carrot: [
      "... That's the one. We've both seen it now.",
      "... Yes. That. Good looking.",
    ],
  },
};

/** You gave up — they come back out on their own. The line is allowed to
 *  gloat; the sim is not allowed to record it. Nothing is written, nothing is
 *  scored, and the invitation stays exactly as open as before. */
export const GAME_GIVEUP: Partial<Record<GameId, Partial<Record<AdultForm, string[]>>>> = {
  hide: {
    scholar: [
      "You stopped? ... The spot wins, then. I'll publish.",
      "Calling it? Reasonable. The spot was peer-reviewed. By me. From inside it.",
    ],
    dog: [
      "I WON? I won! I've never won! Come here and I'll show you where I was!",
      "You gave up! That's allowed! I was SO hidden. Even I didn't know where I was!",
    ],
    blob: [
      "You surrender? ... Then I emerge. Triumphant. Slightly cramped.",
      "The search is called off? A shame. Concealment this fine deserved an audience.",
    ],
    menace: [
      "As expected. The spot was perfect. I'll be using it again. Don't watch.",
      "Surrender accepted. The spot remains undefeated. So do I, coincidentally.",
    ],
    gremlin: [
      "Gave up? Excellent. The spot stays mine. It's got potential.",
      "You called it off. Wise. I could've stayed in there for years. Rent free.",
    ],
    office: [
      "You've withdrawn the search. Noted. I was behind something.",
      "Search concluded, subject unfound. Filing it as a win. My first.",
    ],
    carrot: [
      "... Here I am. It's all right. It was a good spot.",
      "... I came back. The hiding was nice. Quiet, in there.",
    ],
  },
  spy: {
    scholar: [
      "Abandoning the survey? It happens. The thing stays unfound. Science is patient.",
      "Calling it? Very well. The clue was sound. The town is simply large.",
    ],
    dog: [
      "You're stopping? That's okay! It was a really good thing! I'll show you sometime! Or not! A mystery!",
      "Done looking? Okay! The thing is still out there being GREAT.",
    ],
    blob: [
      "You yield? Then the thing keeps its anonymity. Some performances close early.",
      "Calling it off ... The thing will never know how nearly it was seen.",
    ],
    menace: [
      "Giving up. Sensible. The clue was flawless and the fault was everything else.",
      "You concede? Accepted. The thing and I win jointly. Mostly the thing. Mostly me.",
    ],
    gremlin: [
      "Stopping? Fine. I'm not telling you what it was. It's mine now. Spiritually.",
      "You give? The thing stays a secret between me and it. We're close now.",
    ],
    office: [
      "Search withdrawn. The item remains at large. No further action. My favourite outcome.",
      "Concluded without result. In my working days that took a form. Today it takes nothing. Bliss.",
    ],
    carrot: [
      "... All right. It'll keep. Things like that keep.",
      "... We can stop. It was a good thing, though. It's still there.",
    ],
  },
};

// --- I Spy clues ---------------------------------------------------------------
// Authored per KIND per form, never generated, and OBLIQUE ON PURPOSE — the
// Notebook's voice used as a prompt instead of as a record. The rules, held by
// play_lines.test.ts's bearing guard rather than by reviewer memory:
//
//   • NO BEARINGS, EVER. No compass points, no "behind the", no "left of". A
//     bearing turns the game into a fetch quest with a compass; findability is
//     bought by the pick radius (sim/play.ts SPY_RANGE) and by "Say it
//     again?", which repeats the same clue for free.
//   • Never "I spy a tree." The kind is the answer; the clue is the riddle.
//   • Nothing a clue names may be secret, found, or absent — the picker
//     (`spyKindAt`) enforces the first two structurally, and the banks sweep
//     (banks.test.ts) catches weather and wildlife like everywhere else.
export const SPY_CLUE: Partial<Record<AdultForm, Partial<Record<SpyKind, string[]>>>> = {
  scholar: {
    tree: ["Something older than the survey, and taller than its margin of error."],
    rock: ["Something the ground owns outright. I've tried to catalogue it twice. It declined."],
    water: ["Something with a surface and no opinions. It has been holding still for years."],
    crop: ["Something in progress. Somebody is clearly responsible for it, and it isn't me."],
    building: ["Something with load-bearing intentions."],
    furniture: ["Something placed on purpose, at a height convenient for sitting or putting."],
    ground: ["Something underfoot that isn't grass, and is rather smug about it."],
  },
  dog: {
    tree: ["Something TALL! It smells like up!"],
    rock: ["Something heavy! I licked it once! It's the one I licked!"],
    water: ["Something you can't stand on! I tried!"],
    crop: ["Something growing on PURPOSE! Somebody's whole project!"],
    building: ["Something with an inside! I mean the outside part of it!"],
    furniture: ["Something somebody put down and MEANT it!"],
    ground: ["Something under your feet that's different from the other unders!"],
  },
  blob: {
    tree: ["Something with presence. Rooted in the role. It has held this stage longer than any of us."],
    rock: ["Something grey, still, and utterly certain of itself. I have studied it. For technique."],
    water: ["Something that reflects. Mostly me, when I stand near enough."],
    crop: ["Something in rehearsal. Not yet ready for its audience."],
    building: ["Something built to hold a scene. Walls. Commitment. A door, for entrances."],
    furniture: ["A prop. Placed. Meaningful. Somebody dressed this set deliberately."],
    ground: ["Something underfoot that has dressed for the occasion."],
  },
  menace: {
    tree: ["Something tall that I have personal history with. It knows what it did."],
    rock: ["Something that refuses to move. I respect it. I spy it."],
    water: ["Something wet with no survival instinct."],
    crop: ["Something being grown at me."],
    building: ["Something with walls. Adequate walls. I've assessed them."],
    furniture: ["Something placed exactly where somebody wanted it. Bold, leaving it out."],
    ground: ["Something underfoot that thinks it's better than grass ... It's right."],
  },
  gremlin: {
    tree: ["Something tall with things probably in it. I haven't checked the top. Yet."],
    rock: ["Something too big to pocket. Believe me."],
    water: ["Something you can't keep. I've tried. It leaks."],
    crop: ["Something buried on purpose that everyone just LEAVES there."],
    building: ["Something with an inside full of somebody else's things."],
    furniture: ["Something somebody left out. Practically an invitation. I'm spying it instead."],
    ground: ["Something underfoot worth prying up. Hypothetically. I spy it. Hypothetically."],
  },
  carrot: {
    tree: ["... Something patient. Taller than me. Older, too."],
    rock: ["... Something that was here first."],
    water: ["... Something that holds the light. You'll know it."],
    crop: ["... Something coming along nicely. I would know."],
    building: ["... Something somebody built, and meant."],
    furniture: ["... Something set down with care. It hasn't moved since."],
    ground: ["... Something underfoot. Not grass. That's all I'll say."],
  },
  office: {
    tree: ["Something tall, unregistered, and thriving without a permit."],
    rock: ["Something of significant tonnage with no paperwork on it whatsoever."],
    water: ["Something no form applies to. It sits there, administratively impossible."],
    crop: ["Something in development. Filed under 'pending', if I still filed. I don't."],
    building: ["Something structural. Load-bearing. Up to no code at all. Wonderful."],
    furniture: ["An installed fixture. Somebody's asset. Uninventoried, naturally."],
    ground: ["A surface treatment. Deliberate. Approved by nobody. I love it here."],
  },
};

// --- Sitting together ------------------------------------------------------------
// Pooled into the idle pool while the player is parked on a seat with a
// companion beside them (sim/dialogue.ts, the COMPANY_IDLE mechanism with one
// more circumstance). The register is different from the walk's on purpose:
// a walk is going somewhere and a sit is being somewhere, so these are about
// the light, the square, and the fact of not moving. Nothing here may set a
// task, promise weather, or hurry anybody up — sitting is the one activity
// whose whole content is that nothing is happening.
export const SITTING_IDLE: Partial<Record<AdultForm, string[]>> = {
  scholar: [
    "Sitting. Officially, this is data collection. The data is the square. It's good data.",
    "I have no notes right now ... Don't put that in the notes.",
    "From here you can see nearly everything without moving. I should sit more. Professionally.",
  ],
  dog: [
    "We're sitting! Both of us! At the same time!",
    "I'm being so still right now. Are you seeing this. The stillness.",
    "Sitting is like a walk that stays. I love it here.",
  ],
  blob: [
    "An intermission. Well called.",
    "We sit. The town goes by. It's very nearly theatre, and the seats are better.",
    "I am resting between performances. The performances are also this.",
  ],
  menace: [
    "We're sitting here now. This spot is ours. I've decided. Historically it was always ours.",
    "I permit this bench to hold me. It's doing adequately.",
    "Sit straight ... Or don't. It's a day off. I'm told those exist.",
  ],
  gremlin: [
    "Sitting's underrated. You can watch everything from one spot. Where it all is. Who leaves what where.",
    "I've checked under this seat. Twice. It's clean. Disappointingly clean.",
    "Nice spot. Good sightlines. I'm not casing the square. I'm appreciating it.",
  ],
  office: [
    "Sitting with no meeting attached. Extraordinary. I keep waiting for an agenda and none comes.",
    "In my working days a sit like this required a break request. I'm having it anyway. I'm having it twice.",
    "Nothing is pending. Nothing at all ... I could sit here forever.",
  ],
  carrot: [
    "...",
    "... Good light for it.",
    "... The square does this every evening. Most people are walking too fast to see it.",
  ],
};

// --- "Look at this" ------------------------------------------------------------
// The inverse of I Spy: the PLAYER aims somebody's eyes at a thing, and they
// consider it, in voice. A SEPARATE table from SPY_CLUE, deliberately — a clue
// is oblique on purpose and a remark is plain, and one table bent to cover
// both would make every remark read like a riddle.
//
// This is the first verb that lets you show somebody your fence ON PURPOSE
// rather than waiting for `witness` to catch you building it. It pays NOTHING
// — no memory, no friendship (sim/play.ts `lookKindNear` is geometry only, and
// the UI routes the line through the said ring like any other line). A memory
// per pointed-at rock would flood a 64-entry ring in an afternoon; this is
// voice, not an event, the same call moments.ts makes when it refuses
// `witness`.
export const LOOK_AT: Partial<Record<AdultForm, Partial<Record<SpyKind, string[]>>>> = {
  scholar: {
    tree: ["Yes. A fine specimen. I've dated it: older than my notes, younger than my confidence."],
    rock: ["I see it. Igneous, probably. Opinionated, certainly."],
    water: ["Water. Holding its level ... I've checked before. It always is."],
    crop: ["Coming along. I'd estimate — no, I'll let it surprise us both."],
    building: ["Sound construction. I've reviewed it just now, informally, with my eyes."],
    furniture: ["Well placed. The angles agree with each other. That's rarer than you'd think."],
    ground: ["Deliberate ground. Somebody chose this surface. History will thank them. I do already."],
  },
  dog: {
    tree: ["I KNOW this one! It's a good one! One of the best ones!"],
    rock: ["That rock! I've seen it every day and it's still great!"],
    water: ["Water! Look at it go! It's not going anywhere! I love that about it!"],
    crop: ["It's GROWING! Right now! While we watch! Grow! You can do it!"],
    building: ["A building! Someone MADE that! Walls and everything!"],
    furniture: ["Somebody put that there! Perfect spot! I would have picked the same spot!"],
    ground: ["The floor is different here! I noticed it with my feet before you even pointed!"],
  },
  blob: {
    tree: ["Ah. Yes. It has range — spring, autumn, the lot. I've watched its whole run."],
    rock: ["A study in stillness. I attempted the role once. Four minutes. A personal best."],
    water: ["It performs twice daily — once with the sun on it, once with the moon. No reviews. A shame."],
    crop: ["An understudy, waiting. Its scene will come."],
    building: ["Good bones. The door is well hung. An entrance deserves that."],
    furniture: ["Set dressing, and competent set dressing at that. The scene reads."],
    ground: ["A stage, laid where grass would have done. Somebody here understands occasion."],
  },
  menace: {
    tree: ["I've seen it. It's adequate. Tall, committed, slightly smug. We get along."],
    rock: ["Yes. The rock. It was here before all of us and intends to outlast me specifically."],
    water: ["Wet. Persistent. No ambition ... I could learn nothing from it."],
    crop: ["It's growing. Under my supervision, as far as it knows."],
    building: ["Acceptable walls. I'd have added a parapet. I'd add a parapet to most things."],
    furniture: ["Reasonable placement. I've assessed the sightlines. They favour me."],
    ground: ["Better than grass. I've always said so. I'm saying it now, which counts."],
  },
  gremlin: {
    tree: ["Seen it. Checked it. Two hollows, one reachable. Telling you that for free."],
    rock: ["That one's staying. I've tested it. Thoroughly. It's load-bearing for the whole area, spiritually."],
    water: ["I've been through this bit of water. Nothing in it ... Nothing I left, anyway."],
    crop: ["Growing nicely. I haven't touched it. That's me showing respect, that is."],
    building: ["Good building. Strong floor. I know what's under a corner of it. Not saying which."],
    furniture: ["Nice piece. Good drawers, probably ... I haven't checked. I've nearly checked."],
    ground: ["Somebody laid this properly. Nothing prises up. I say that with authority."],
  },
  carrot: {
    tree: ["... Yes. I stop here sometimes. It's good shade to think in."],
    rock: ["... It was here first. It'll be here after. I find that steadying."],
    water: ["... The light sits well on it. You picked a good one to look at."],
    crop: ["... Coming up well. The soil's doing most of it. That's how you know it's right."],
    building: ["... Built with care. You can tell from here. The corners are honest."],
    furniture: ["... Set down properly. Level. It'll stay."],
    ground: ["... Good underfoot. Somebody meant this."],
  },
  office: {
    tree: ["Noted. Unregistered, flourishing, casting shade without a licence. My kind of tree."],
    rock: ["Ah yes. On no inventory anywhere. Magnificent. Immovable in every sense."],
    water: ["I see it. No paperwork applies. It simply carries on. I retired to be more like it."],
    crop: ["In development. On schedule, and nobody set the schedule. Remarkable."],
    building: ["Structurally confident. No permit on file. I've decided to find that charming."],
    furniture: ["An asset, well sited. In my working days that took three signatures. This took none. Look at it."],
    ground: ["A resurfacing project, completed without a single form. It's beautiful work. It's beautiful."],
  },
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

/** And what he says once there is a lamp burning in his corridor.
 *
 *  Checked BEFORE the shallow bank (sim/dialogue.ts) although a ladder to his
 *  door is the larger intrusion, because this one is newer and it has to be
 *  ANSWERED. A player who hangs a lamp outside a hermit's chamber and gets the
 *  same seven lines about the ladder concludes the lamp is inert; the whole
 *  reason to spend ore on light is that the world can tell it is lit.
 *
 *  He never thanks you and he never asks for another. This is the form the
 *  no-dislikes rule takes for somebody who is not a resident and has no house to
 *  be delighted about (content/tastes.ts): he is not disappointed, he is simply
 *  unconsulted. */
export const MOLE_LIT: string[] = [
  "There's a light in my corridor. I didn't ask for a light.",
  "I can see the ceiling now. I'd been managing.",
  "It's warm, near it ... I don't stand there.",
  "Very thoughtful. Very bright.",
  "I knew where everything was in the dark. I still do.",
  "That'll be up forever, will it.",
  "... I stood there once.",
];

// --- The Quiet Ghost ----------------------------------------------------------
// The second individual voice, and it had to be as distinct from the Mole's as
// his is from the town's, because they are structurally the same character —
// somebody you find by walking too far — and if they sounded alike, finding the
// second one would feel like finding the first one again.
//
// So: he is terse because he is interrupted. She is unhurried because she has
// nowhere to be and no particular sense of how long you have been standing
// there. He never mentions anything you haven't found. She mentions things
// freely and none of them are directions — she talks about the trees, the dark,
// and the hour, all of which you can see for yourself.
//
// She never says the word walnut and never mentions a finish. The wood is the
// grove's to give (sim/gather.ts) and she has no idea what you do with it.

/** Before you have taken any of the dark wood. */
export const GHOST_QUIET: string[] = [
  "...",
  "Oh ... You came all the way out.",
  "It's dark here in the day, too. That's the trees.",
  "I don't mind the hour. The hour is the only bit I'm sure of.",
  "Nobody comes out this far ... That isn't a complaint.",
  "You can sit down. It's dry under them.",
  "I was here before the town. I think. It's a long time to be certain about.",
  "Listen ... No, that's it. That's the listening.",
];

/** And after. She has an opinion and it is not a rule: nothing stops you, the
 *  trees come back on the ordinary eight hours, and she stays exactly where she
 *  is. Read off the live world (sim/ghost.ts §groveCut), like the Mole's. */
export const GHOST_CUT: string[] = [
  "You took one ... They come back. Everything out here comes back.",
  "It's darker at the heart than it looks. People are always surprised.",
  "I heard it go over. It's a particular sound, that one.",
  "Take another if you need it. I'd rather you took it from here than somewhere you'd have to explain.",
  "There's a gap now ... I like the gap, actually. More sky.",
  "You'll build with it ... Good. It ought to be somewhere warm.",
];

// --- The Stray Cosmos, at home (Phase 7c) -----------------------------------------
//
// She has had five banks since 4c, one per shower night, and they are all lines
// somebody says while PASSING. This is the sixth, and it is the only one she
// speaks standing still, in the one place in the game that is hers.
//
// WHAT IT DOES NOT DO, and each of these was a line that got cut:
//
//   • It never explains the sky. Not what it is, not what holds it up, not why
//     there is a staircase. She lives here; you do not explain your own street.
//   • It never remarks that you found her. No "you came all this way", no "how
//     did you get up here" — that is the game congratulating you, and the whole
//     phase refuses to (DESIGN §Tone: secrets are never spoiled by UI).
//   • It gives you nothing. No item, no hint, no direction, no errand.
//   • It does not mention the town, which she does not live in and has, as far as
//     anyone can tell, no opinions about.
//
// The voice is the one the showers established — passing, slightly out of step
// with the hour you are having — with the one difference that she is not passing.
// She is in, and you have turned up, and it is fine.
export const COSMOS_HOME: string[] = [
  "...",
  "Oh ... You're up.",
  "This is where I am, most of the time. There isn't much to it.",
  "It's the same in every direction. I find that restful. Some people don't.",
  "I don't keep anything up here. Things fall.",
  "You can see the weather arriving from a long way off ... It never gets here.",
  "It's very quiet ... That isn't the same as empty. It took me a while.",
  "I come down five times a year ... You've possibly noticed. Or possibly not.",
  "Sit anywhere. It's all the same bit.",
  "The steps were here before I was. I've never asked.",
];

// --- Seasons ---------------------------------------------------------------------
// What people say about the month. Two banks per form per season at most: a
// `season` pool about the weather itself, and an optional `crop` pool about the
// variety whose month it is, which takes the crop's name as its value the way
// the festival lines take a festival's.
//
// NOBODY EVER RECOMMENDS PLANTING ANYTHING, and this is the rule the whole
// phase turns on rather than a note about tone. "You'll want to get the kale
// in" is a quest marker with a face: it turns a look into a schedule and makes
// four of the eight varieties into things you are late for. They REMARK that it
// is the month. They never suggest an action, and they never mention that a
// crop does better now, because it doesn't (DESIGN §Seasons).
//
// Coverage is honest rather than complete — the same state RESIDENT_HOME is in.
// `seasonLines` falls back so a form with nothing written for December still
// says something in December; filling the gaps is writing, not engineering.
export interface SeasonBank {
  season: string[];
  crop?: ((v: string) => string)[];
}

const SEASON_FALLBACK: Record<string, string[]> = {
  spring: ["Everything's coming up at once ... It does this every year and it still seems like a lot."],
  summer: ["Long days ... Too long, some of them. But long."],
  autumn: ["It's going gold out there ... That happens before the other thing happens."],
  winter: ["Cold ... It'll pass. It always has so far."],
};

export const RESIDENT_SEASON: Partial<Record<AdultForm, Partial<Record<string, SeasonBank>>>> = {
  scholar: {
    spring: {
      season: [
        "The growth rate out there is frankly indecent. I have started a log.",
        "Spring ... I have four theories about it and no intention of testing any of them.",
      ],
      crop: [(v) => `The ${v} are up. It is their month. I have written that down as though it were a finding.`],
    },
    summer: {
      season: [
        "The light lasts until an hour I consider unprofessional.",
        "Summer ... Everything is happening slightly too fast to take notes on.",
      ],
      crop: [(v) => `A ${v} in its own month ... Nothing about it is different. I checked. Twice.`],
    },
    autumn: {
      season: [
        "The colour change is a withdrawal, not a flourish. Nobody likes hearing that.",
        "Autumn ... The most legible season. Everything is labelling itself.",
      ],
      crop: [(v) => `The ${v} have come in on schedule, which is the least interesting thing about them.`],
    },
    winter: {
      season: [
        "The trees are doing nothing. It is a deliberate nothing and I respect it.",
        "Winter ... Very little to observe. I observe it anyway.",
      ],
      crop: [(v) => `${v}, in this ... It is the only thing out there with a position on the weather.`],
    },
  },
  dog: {
    spring: {
      season: [
        "It's SPRING! Everything smells like six things at once!",
        "Green! All of it! Look!",
        "Everything's coming up out of the ground. I say hello to all of it.",
        "New leaves! Small ones! I'm being SO careful around them.",
      ],
      crop: [(v) => `The ${v}! It's their month! I've been telling everyone! I'll tell you again later!`],
    },
    summer: {
      season: [
        "It stays light SO LATE. I keep forgetting to stop.",
        "Warm ground. Best ground. I have opinions about ground.",
        "I found the shadiest spot in town. I'll show you. It's a good secret.",
        "Long days! More day per day! Best deal there is.",
      ],
      crop: [(v) => `${v}! In the right month! I don't know why that's better but it IS!`],
    },
    autumn: {
      season: [
        "Everything's crunchy! The whole outside is crunchy!",
        "Leaves ... Sorry. I got distracted by leaves.",
        "A leaf landed ON me earlier. Just landed there! Best hat I've ever had.",
        "It smells like the ground is putting everything away.",
      ],
      crop: [(v) => `The ${v} are in! It's their turn! Everyone gets a turn!`],
    },
    winter: {
      season: [
        "Cold nose! Doesn't bother me! Mentioning it anyway!",
        "The trees went bare and I check on them daily.",
        "My breath does the cloud thing! Look! LOOK.",
        "It gets dark early and the lamps come on. I like both parts.",
      ],
      crop: [(v) => `${v}! In the COLD! It doesn't even mind!`],
    },
  },
  blob: {
    spring: {
      season: ["Spring is a rehearsal for something ... I have never found out what.", "I feel the sap ... I have no sap. I feel it regardless."],
      crop: [(v) => `The ${v} ... In their season. There is a word for that feeling and I refuse to look it up.`],
    },
    summer: {
      season: ["These evenings go on and on ... I could work with that.", "Summer light is theatrical lighting that nobody had to pay for."],
      crop: [(v) => `A ${v} in high summer ... I'm not going to pretend that isn't moving.`],
    },
    autumn: {
      season: ["The whole landscape has gone amber. It's showing off ... Good.", "Autumn is the season that knows it's being watched."],
      crop: [(v) => `The ${v} arrive, and the light goes gold, and I have to sit down.`],
    },
    winter: {
      season: ["Bare branches ... That's staging. Somebody staged that.", "Winter is a long pause and I have never been good at those."],
      crop: [(v) => `${v}, in the dead of it ... A performer working an empty house. I understand it completely.`],
    },
  },
  carrot: {
    spring: {
      season: [
        "It's spring ... Things grow. That's the arrangement.",
        "Everything's up early this year. Or on time ... One of those.",
      ],
      crop: [(v) => `${v} ... It's the month for them. That is the whole of what that means.`],
    },
    summer: {
      season: ["Warm ... Fine.", "Long light. The green makes the most of it ... So do I, quietly."],
      crop: [(v) => `${v} ... Right month. Doesn't make them better. Just makes it the month.`],
    },
    autumn: {
      season: ["Going gold ... It does that.", "The gold comes in on its own schedule ... Always has."],
      crop: [(v) => `${v}, now ... Yes. I'm aware of the timing. We're not discussing it.`],
    },
    winter: {
      season: [
        "Cold ... The ground doesn't stop. People think it does.",
        "Cold ... The roots are fine. I checked on them.",
      ],
      crop: [(v) => `${v}. In this ... Sensible of them.`],
    },
  },
  menace: {
    spring: {
      season: [
        "Everything's growing. Prices don't care.",
        "Spring. Everything showing off at once. I understand the impulse. I pace myself.",
      ],
    },
    summer: {
      season: [
        "Warm ... People buy less cloth in the warm. I've adjusted for it.",
        "The warm months. My colours thrive in this light. So do yours, marginally.",
      ],
    },
    autumn: {
      season: [
        "The gold looks well. It changes nothing at the counter.",
        "Autumn. The town matches my palette at last.",
      ],
    },
    winter: {
      season: [
        "Cold brings people indoors, and indoors is where the counter is.",
        "Cold. I wear it well. I wear everything well, but the cold especially.",
      ],
    },
  },
  gremlin: {
    spring: {
      season: [
        "Ground's soft ... Things come up out of it that were meant to stay down.",
        "Soft ground season. Things practically volunteer themselves.",
      ],
    },
    summer: {
      season: [
        "Dry ground. Hard digging ... Good finds, though.",
        "Long days. More light to find things by. The things don't stand a chance.",
      ],
    },
    autumn: {
      season: [
        "Leaves cover everything ... Everything. That's not a complaint either.",
        "Everything's dropping things. Leaves. Seeds. Standards. I collect two of those.",
      ],
    },
    winter: {
      season: [
        "Frost turns things up ... Pushes them. I don't know how. I just collect them.",
        "Frost heaves things up for free. Best season for the trade.",
      ],
    },
  },
  office: {
    spring: {
      season: [
        "The season has changed. The paperwork does not acknowledge seasons.",
        "Spring. Everything begins at once. Nothing asks permission. I've made my peace.",
      ],
    },
    summer: {
      season: [
        "Summer. Filed under weather. There is a drawer.",
        "The long evenings. In my working days these were overtime. Now they're just evenings. Extraordinary.",
      ],
    },
    autumn: {
      season: [
        "Autumn has been noted. No action is required of anyone.",
        "The year is winding down its accounts. It balances every time. Show-off.",
      ],
    },
    winter: {
      season: [
        "Winter ... The forms are the same forms. That is the point of forms.",
        "Cold quarter. The town files itself indoors. First filing I've approved of in years.",
      ],
    },
  },
};

/** This form's bank for this season, falling back rather than going quiet — the
 *  same rule `tryHomeLine` follows for a note nobody wrote a line for. */
export function seasonLines(form: AdultForm, id: string): SeasonBank {
  const bank = RESIDENT_SEASON[form]?.[id];
  if (bank && bank.season.length > 0) return bank;
  return { season: SEASON_FALLBACK[id] ?? SEASON_FALLBACK.summer };
}

/** Fixed-cast idle banks by character. */
export function castIdle(id: CharId): string[] {
  if (id === "office") return OFFICE_IDLE;
  return ["..."];
}
