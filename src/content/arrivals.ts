// Who moves to town, in the order they turn up.
//
// Content is data (CLAUDE.md): an arrival is a row here, not a code path. The
// machinery that admits them lives in sim/commission.ts and knows nothing about
// who they are.
//
// THESE ARE NOT IMPORTS. The Meadow import supplies the player and nobody else
// (DESIGN §"Importing from The Meadow"), so the flagship beat has to work for
// someone who has never played it. An arrival is something the town does.
//
// Their prior life needs no explaining and gets none: The Meadow is where
// retired sprites are sent, and The Farm is a town in it. Everyone here came
// from somewhere else. That's the premise, not a backstory to write.

import type { AdultForm } from "./canon/forms";
import type { SkinId } from "./skins";

export interface ArrivalDef {
  form: AdultForm;
  /** Their own name, not their form's. Two Blobs may both move in, so the name
   *  has to be a person's — picked by hand from their form's register in
   *  content/names.ts, never generated. An arrival whose name came out of a hash
   *  is an arrival nobody decided to admit. */
  name: string;
  /** A finish that becomes available once they're housed, if their form is
   *  attached to one. Optional on purpose — most commissions pay in a resident,
   *  and a reward on every one would make housing people feel like a shop. */
  unlocks?: SkinId;
  /** What they say while they're still in the tent. Per-arrival rather than
   *  per-form: this is the one line that's *theirs*, and it's what makes the
   *  commission feel like a person asking rather than a task appearing. */
  tentLine: string;
  /** The Office Creature's own summary, read off the form. Deadpan, and about
   *  the paperwork rather than about the person — he is an institution. */
  filing: string;
  /** What they say the moment the house is theirs. The one line that pays off
   *  the whole beat, so it is theirs and not their form's — and nobody gushes.
   *  A house you built is received the way a real gift is: sideways. */
  housedLine: string;
  /** Their own small talk (Phase 12), pooled on top of their form's idle bank.
   *  The tent line was "the one line that's theirs"; these are the rest of that
   *  sentence. Each extends the premise already in this row — Bartleby's fen,
   *  Waffle's loud water, Snag's "say it back to me" — so two dogs stop being
   *  one dog with two names. Form gives the voice; this row gives the person. */
  lines?: string[];
}

/** The queue. Order is deliberate, not shuffled: the first arrival is the one
 *  that teaches the beat, so it's the one whose reward is already written into
 *  the world. `whitewash`'s unlock hint in content/skins.ts has said "The Fancy
 *  Little Menace has standards, and will share them" since before commissions
 *  existed — housing Archibald is what that sentence meant.
 *
 *  Secret forms stay out of this list. The Quiet Ghost holds `walnut` by the
 *  same logic, and a Ghost who simply moves in one afternoon would spoil the
 *  one thing about her that's worth keeping (CLAUDE.md §Tone: secrets are never
 *  spoiled by UI). She is Phase 4's problem and walnut waits for her. */
export const ARRIVALS: ArrivalDef[] = [
  {
    form: "menace",
    name: "Archibald",
    unlocks: "whitewash",
    tentLine: "I am not complaining. I am describing the tent.",
    housedLine: "It will do. ... It will more than do. Do not make this a moment.",
    filing: "Form 9. ... Housing, request for. He has opinions about the tent.",
    lines: [
      "I have been auditing the town's aesthetics. Unpaid. Somebody must.",
      "I am not fussy. I am precise. The difference is everything, and I maintain it daily.",
      "I described the tent once. It has never recovered. Neither have I, entirely.",
    ],
  },
  {
    form: "dog",
    name: "Biscuit",
    tentLine: "The tent's great! It's got a floor and everything. ... Well. Sort of.",
    housedLine: "It's got a DOOR. I'm going to go in and out of it for a while.",
    filing: "Form 9. ... He says anywhere is fine. They always say that.",
    lines: [
      "Anywhere really IS fine. I keep being right about that.",
      "I still go in and out of the door sometimes. For the feeling.",
      "I like it here best. I liked it there best too. I'm consistent.",
    ],
  },
  {
    form: "blob",
    name: "Thessaly",
    tentLine: "I have decided to find this romantic. It is going poorly.",
    housedLine: "You built this. With hands. ... I need to sit down, which I can now do indoors.",
    filing: "Form 9. ... Filed under 'urgent', at her insistence. It is not urgent.",
    lines: [
      "I have decided to find the plaza romantic. It's going well this time.",
      "I keep a list of things I've decided to find romantic. The list is thriving.",
      "Romance is a decision. I decide it constantly.",
    ],
  },
  {
    form: "gremlin",
    name: "Snag",
    tentLine: "Nice tent. ... Is it yours? It's mine now. Kidding. ... Mostly.",
    housedLine: "Mine. ... Say it back to me. I want to hear how it sounds.",
    filing: "Form 9. ... I have added a note. The note is for my own records.",
    lines: [
      "Mine. The house. I still say it most mornings. It still sounds good.",
      "I checked: everything in my house is mine. Every day it's still true. Unbelievable.",
      "You gave me a whole house and I only took SOME of it apart. Growth.",
    ],
  },

  // The second half of the queue. Three things about these that the first four
  // did not have to decide:
  //
  // FORMS REPEAT, AND THAT IS THE TABLE WORKING. Forms are species and not
  // singletons (DESIGN §"Importing from The Meadow") — a second Dog Thing is a
  // different person who happens to be a dog, which is why the name has always
  // been the identity here. The practical fence is `home.test.ts`: only the six
  // forms in its HOUSED list have a full bank of things to say about a house, so
  // an arrival of any other form would move into a home it had no opinions
  // about. Bartleby is the first scholar to arrive, and scholars were already
  // covered because Winifred lives here.
  //
  // THEY NAME TERRAIN, WHICH IS WHAT THIS STEP WAS FOR, AND NOTHING READS IT.
  // The tent line is the one line that is theirs, so it is where somewhere they
  // like goes. No code looks at it and there is no `prefersNear` field — that
  // would be a taste that gates a gift, and taste is delight and never a gate
  // (DESIGN). It is also why none of them ASKS to be put anywhere: a request the
  // game cannot honour is worse than no request, so each of these states a
  // fondness and then concedes something, and housing them where you like never
  // breaks a promise. The version where the ground can delight somebody is a real
  // feature and is written up as one; it is not this.
  //
  // THE OFFICE CREATURE SAYS "THEY". He is filing, and a form does not know
  // anybody's pronouns — which is both the correct institutional voice and the
  // reason nothing here has to be decided about a person to write their row.
  {
    form: "scholar",
    name: "Bartleby",
    tentLine: "I have been walking out to the fen most mornings. ... The tent is nearer to it than a house would be. That is the tent's only argument, and it is not a good one.",
    housedLine: "A door, a roof, and a corner that is out of the draught. ... I shall have to stop describing the weather. I had a great deal of material.",
    filing: "Form 9. ... They have appended their own notes to the form. I have not read the notes.",
    lines: [
      "I walked out to the fen this morning. The fen continues. I have notes.",
      "My notes on the fen now outnumber my notes on everything else. The fen is winning.",
      "I appended notes to a form once. Gary never read them. They were my best work.",
    ],
  },
  {
    form: "dog",
    name: "Waffle",
    tentLine: "I pitched by the water! ... It is so loud at night. I love it. ... I have not slept.",
    housedLine: "It doesn't move when the wind does. ... I'm going to run round the outside of it. Once to check, and then some more times.",
    filing: "Form 9. ... They were extremely enthusiastic about the form itself. Nobody is enthusiastic about the form.",
    lines: [
      "I ran round the house again this morning. Still holds. I'll keep checking.",
      "I sleep SO well now. I miss the loud water. I visit it. We're still friends.",
      "The water's still loud! I checked on the way here. Good news all round.",
    ],
  },
  {
    form: "gremlin",
    name: "Clag",
    tentLine: "Camped by the rocks, on purpose. ... Things collect down there. I'm not saying I put them there.",
    housedLine: "Walls. ... You can lean things against walls. That's the entire thing about walls.",
    filing: "Form 9. ... They asked whether the house comes with a cellar. It does not come with a cellar.",
    lines: [
      "I have leaned eleven things against my walls. The walls are performing.",
      "A cellar would have solved everything. I've made peace. The peace is provisional.",
      "The rocks miss me. Things collect down there without me now. I'll catch up.",
    ],
  },
];

/** Who's next, given how many have already arrived. Returns null once the queue
 *  is empty — the town stops growing rather than looping, because the fourth
 *  Rummage would say more about the table than about the town. */
export function nextArrival(count: number): ArrivalDef | null {
  return ARRIVALS[count] ?? null;
}
