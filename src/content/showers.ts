// The nights the Stray Cosmos turns up, and what she says on each of them.
//
// THESE ARE THE REAL DATES. Quadrantids, Lyrids, Perseids, Orionids, Geminids —
// the actual annual meteor showers, on their actual peak nights. The Farm
// already runs on the real clock and the real calendar (DESIGN §Time), and the
// festivals took that as far as a town can take it; this takes it past the
// town. A player who looks up on the twelfth of August because the game told
// them to will find the sky doing what the game said it would do, which is the
// only joke in this file and the reason it is worth writing at all.
//
// Five rather than the dozen that exist. The rare ones only, and no two in the
// same season, so no night is ever "the next one is in a fortnight".
//
// A TOTAL FUNCTION OF THE DATE, like the festivals: no scheduler, no state, and
// not one field in the save. See sim/cosmos.ts for the one wrinkle — a night
// belongs to the evening it started in, so two in the morning on the thirteenth
// is still the twelfth's shower.
//
// VOICE. She is not a chatterer and she is not spooky. The canon blurb is "once
// in a great while, the night sky simply keeps one" — so she talks like
// somebody who is passing, and who is slightly out of step with the hour you
// are having. Nothing she says is ever about you being lucky to see her.

/** A shower's id. Stable: it may end up in a memory log. */
export type ShowerId = "quadrantids" | "lyrids" | "perseids" | "orionids" | "geminids";

export interface ShowerDef {
  id: ShowerId;
  /** 1–12, matching `Date#getMonth() + 1`. */
  month: number;
  /** The peak NIGHT — the evening this date starts, running through to dawn. */
  day: number;
  /** What she calls it, which is never what an almanac calls it. She has no
   *  interest in the name anybody down here gave it. */
  name: string;
  /** Her lines for this night. Two or three: she is only here for a few hours
   *  once a year, and a bank you can exhaust is better than a bank that starts
   *  repeating itself in the same conversation. */
  lines: string[];
}

export const SHOWERS: ShowerDef[] = [
  {
    id: "quadrantids",
    month: 1,
    day: 3,
    name: "the short one",
    lines: [
      "This one is over quickly. ... I am also over quickly. It is a good match.",
      "Cold. ... I don't feel it. I am telling you because you seem to.",
      "You are up very early or very late. ... I have never been able to tell the difference.",
    ],
  },
  {
    id: "lyrids",
    month: 4,
    day: 22,
    name: "the old one",
    lines: [
      "People have been standing outside for this one for about two and a half thousand years. ... You are doing it correctly.",
      "Something is coming back round. It always does. ... That is the entire event.",
      "The grass is wet. I notice things like that, out of politeness.",
    ],
  },
  {
    id: "perseids",
    month: 8,
    day: 12,
    name: "the loud one",
    lines: [
      "This is the busy one. ... Don't try to count. Everyone tries to count.",
      "Warm enough to lie down for. ... I am told that is the point of August.",
      "There will be a long one, eventually. Green, if you're lucky. ... I can't promise it. I have never been able to promise it.",
    ],
  },
  {
    id: "orionids",
    month: 10,
    day: 21,
    name: "the fast one",
    lines: [
      "These come in very fast. ... If you looked away, you missed one. Several, probably.",
      "That was a piece of a comet. So was that. ... It has been coming apart for a long time and it is very calm about it.",
      "You'll want to be looking east, eventually. ... No. Further round. ... There.",
    ],
  },
  {
    id: "geminids",
    month: 12,
    day: 13,
    name: "the best one",
    lines: [
      "This is the best one and nobody comes out for it, because of the cold. ... Their loss. Genuinely their loss.",
      "Slow, these. You can watch a whole one happen. ... That's rarer than it sounds.",
      "The year is nearly done. ... I don't keep the year. I just notice when yours ends.",
    ],
  },
];
