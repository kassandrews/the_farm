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
  /** Their own name, not their form's. Two Blobs may both move in. */
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
}

/** The queue. Order is deliberate, not shuffled: the first arrival is the one
 *  that teaches the beat, so it's the one whose reward is already written into
 *  the world. `whitewash`'s unlock hint in content/skins.ts has said "The Fancy
 *  Little Menace has standards, and will share them" since before commissions
 *  existed — housing her is what that sentence meant.
 *
 *  Secret forms stay out of this list. The Quiet Ghost holds `walnut` by the
 *  same logic, and a Ghost who simply moves in one afternoon would spoil the
 *  one thing about her that's worth keeping (CLAUDE.md §Tone: secrets are never
 *  spoiled by UI). She is Phase 4's problem and walnut waits for her. */
export const ARRIVALS: ArrivalDef[] = [
  {
    form: "menace",
    name: "Bissenette",
    unlocks: "whitewash",
    tentLine: "I am not complaining. I am describing the tent.",
    housedLine: "It will do. ... It will more than do. Do not make this a moment.",
    filing: "Form 9. ... Housing, request for. She has opinions about the tent.",
  },
  {
    form: "dog",
    name: "Rummage",
    tentLine: "The tent's great! It's got a floor and everything. ... Well. Sort of.",
    housedLine: "It's got a DOOR. I'm going to go in and out of it for a while.",
    filing: "Form 9. ... He says anywhere is fine. They always say that.",
  },
  {
    form: "blob",
    name: "Ouestrine",
    tentLine: "I have decided to find this romantic. It is going poorly.",
    housedLine: "You built this. With hands. ... I need to sit down, which I can now do indoors.",
    filing: "Form 9. ... Filed under 'urgent', at her insistence. It is not urgent.",
  },
  {
    form: "gremlin",
    name: "Tick",
    tentLine: "Nice tent. ... Is it yours? It's mine now. Kidding. ... Mostly.",
    housedLine: "Mine. ... Say it back to me. I want to hear how it sounds.",
    filing: "Form 9. ... I have added a note. The note is for my own records.",
  },
];

/** Who's next, given how many have already arrived. Returns null once the queue
 *  is empty — the town stops growing rather than looping, because the fourth
 *  Rummage would say more about the table than about the town. */
export function nextArrival(count: number): ArrivalDef | null {
  return ARRIVALS[count] ?? null;
}
