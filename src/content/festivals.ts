// The festivals, and where the town stands to watch them.
//
// DESIGN §Festivals settled the shape: ONE PER CALENDAR MONTH, on an authored
// day, at an authored hour. There is no scheduler here and no state anywhere —
// a festival is a total function of the date (sim/festival.ts asks the
// calendar), which is what lets the whole institution ship without a single
// field in the save.
//
// MONTHLY, AND DELIBERATELY NOT MORE OFTEN. The errands board's instinct was
// the opposite — cycle fast, so the first card teaches the beat inside a
// quarter of an hour — and it is wrong here. A festival that comes round every
// five days is a routine; the point of a festival is that it is rare, and the
// rarity is what makes the version you MISSED land as news rather than as a
// nag. It also puts these on the real calendar, which is the axis Phase 4's
// seasons want anyway.
//
// WHICH MEANS THE STAGE IS EMPTY ON THREE HUNDRED AND FIFTY-THREE DAYS, and
// that is why every row carries a `rehearsing` line. An institution you can
// only use twelve times a year is a prop. The Blob rehearses the NEXT one
// daily, so passing the stage on an ordinary Tuesday gets you something — most
// of the writing in this file is for the days when nothing is on.
//
// VOICE. The Blob is a tragedian working with the material available, which is
// a small town and a low wooden platform. He is never sarcastic about it. The
// gap between the scale of the feeling and the scale of the occasion is the
// entire joke, and it only works if he means every word.
//
// THE GATHER LIVES HERE, NOT IN sim/. Where a villager stands during a festival
// is a fact about the calendar and about whose day it is, which is exactly what
// a schedule is — so `scheduledStop` consults this file the way it consults the
// rest of a routine, and sim/housing.ts needs no opinion at all. The first draft
// resolved it in `stopTarget` and bought a cycle for it (housing → festival →
// villagers → housing); the same instinct that keeps housing.ts reading
// `world.commissions` directly rather than importing sim/commission.ts applies
// here, one file over.

import type { CharId } from "./cast";

/** A festival's id. Stable — the away postcard quotes them and villagers
 *  remember them by key (`sim/festival.ts`), so a rename is a rename of
 *  something already written down in a live save's memory log. */
export type FestivalId =
  | "reconvening"
  | "longer-afternoon"
  | "the-airing"
  | "mud-assizes"
  | "second-best-cart"
  | "long-standing-about"
  | "festival-of-shade"
  | "reckoning-of-the-fence"
  | "harvest-formality"
  | "uncertain-provenance"
  | "damp-commemoration"
  | "filing-of-the-year";

export interface FestivalDef {
  id: FestivalId;
  /** 1–12, matching `Date#getMonth() + 1`. Exactly one row per month; a second
   *  would make "what is on this month" a list, and the Blob does not have the
   *  staff for two. */
  month: number;
  /** Day of the month it falls on. Deliberately not all the 1st: a calendar
   *  where every festival is on the same date reads as a billing cycle. */
  day: number;
  name: string;
  /** What it is, as the Blob explains it. One or two sentences — he would go
   *  on, and the panel is where he is prevented from going on. */
  blurb: string;
  /** What he says while it is actually happening. */
  onstage: string;
  /** What he says on any other day, working towards it. This is the line the
   *  player sees the overwhelming majority of the time. */
  rehearsing: string;
  /** Past tense, for the days after and for the postcard when it happened
   *  while you were away. Never reproachful — a festival you missed is news,
   *  and "you weren't there" is a bill. */
  afterwards: string;
}

/** The hours a festival runs, the same for all twelve.
 *
 *  Late afternoon into the evening, which is not a mood choice: it is the
 *  window where the residents' rings say "back through the plaza" and then
 *  "home for the night", so the gather is VISIBLY different from what they
 *  would otherwise be doing. A midday festival would look like the plaza on a
 *  normal midday. */
export const FESTIVAL_FROM_HOUR = 17;
export const FESTIVAL_TO_HOUR = 21;

export const FESTIVALS: FestivalDef[] = [
  {
    id: "reconvening",
    month: 1,
    day: 9,
    name: "The Reconvening",
    blurb:
      "We establish that everyone is still here. ... One by one. Out loud. It takes the evening and it is worth the evening.",
    onstage: "Tonight we establish that everyone is still here. ... So far, everyone is still here.",
    rehearsing: "I am learning the names again. I know the names. ... I am learning them again anyway, because on the night you cannot be nearly right.",
    afterwards: "Everyone was still here. ... I said so from the platform and there was a silence afterwards that I am choosing to interpret as agreement.",
  },
  {
    id: "longer-afternoon",
    month: 2,
    day: 14,
    name: "The Festival of the Slightly Longer Afternoon",
    blurb:
      "The afternoon is longer than it was last month. Marginally. ... We do not pretend otherwise, and we do not let it pass unremarked.",
    onstage: "It is longer. ... You can feel it if you stand still and refuse to be reasonable about it.",
    rehearsing: "I am timing the light. ... Every evening, from this exact spot, so that on the night I can say how much by and be believed.",
    afterwards: "The afternoon was acknowledged as longer. ... Nobody disputed it, which after last year is its own achievement.",
  },
  {
    id: "the-airing",
    month: 3,
    day: 3,
    name: "The Airing",
    blurb: "Everything that has been indoors all winter is brought out and stood in the square for an hour. ... Including us.",
    onstage: "Bring it out. Whatever it is. ... It has been in a cupboard since autumn and it has earned the air.",
    rehearsing: "I have begun airing early. Privately. ... It is not the same as the Airing, and I would not claim it was.",
    afterwards: "Everything was aired. Most of it went back in. ... Two items did not, and their owners have not raised it.",
  },
  {
    id: "mud-assizes",
    month: 4,
    day: 21,
    name: "The Mud Assizes",
    blurb:
      "The mud is formally reviewed. It is found to be excessive. The finding has no effect. ... We hold it every year regardless, because the mud should know.",
    onstage: "The mud stands accused. ... It has, as ever, declined to attend.",
    rehearsing: "I am preparing the charges against the mud. ... They are largely the same as last year, which is itself part of the charge.",
    afterwards: "The mud was found excessive. ... The finding was recorded, filed, and immediately walked across.",
  },
  {
    id: "second-best-cart",
    month: 5,
    day: 17,
    name: "The Procession of the Second-Best Cart",
    blurb:
      "The best cart is needed for work. ... So the second-best cart is decorated and walked around the plaza once, slowly, with the dignity it has been denied all year.",
    onstage: "There it goes. ... Not the best cart. Never the best cart. And yet.",
    rehearsing: "I am walking the route at the pace the cart will take. ... The pace is the performance. Rush the cart and you have a delivery.",
    afterwards: "The second-best cart went round. ... It was applauded. The best cart was elsewhere, working, as it always is.",
  },
  {
    id: "long-standing-about",
    month: 6,
    day: 11,
    name: "The Long Standing About",
    blurb: "We stand about. For a long time. Together. ... There is no second part. People keep waiting for a second part.",
    onstage: "This is it. ... We are doing it now. You are doing it correctly.",
    rehearsing: "I am rehearsing standing about. ... You would be surprised. There is a way to do it that looks like waiting, and that is the failure state.",
    afterwards: "We stood about for a long time. ... Somebody asked what happens next, and was gently told, and stayed anyway.",
  },
  {
    id: "festival-of-shade",
    month: 7,
    day: 7,
    name: "The Festival of Shade",
    blurb:
      "The best patch of shade in town is identified, praised, and stood in by everyone in turn. ... It is a different patch every year. It is never the obvious one.",
    onstage: "The patch has been identified. ... Form a line. Do not comment on the patch until you have been in it.",
    rehearsing: "I am surveying for shade. ... I have a shortlist. I will not be sharing the shortlist. Last year's leak was very bad for morale.",
    afterwards: "A patch of shade was praised and stood in by everyone. ... It has since moved, as shade does, and nobody has said anything about it.",
  },
  {
    id: "reckoning-of-the-fence",
    month: 8,
    day: 24,
    name: "The Reckoning of the Fence",
    blurb: "Every fence in town is looked at. Properly looked at. ... Nothing is repaired. That is a separate occasion and it does not have a festival.",
    onstage: "Look at the fences. ... Really look at them. You have been walking past them for a year.",
    rehearsing: "I have been looking at the fences in advance, which I am aware defeats the purpose. ... I cannot help it. They are right there.",
    afterwards: "The fences were reckoned with. ... Several were described as 'still going', which is the highest praise this town gives an object.",
  },
  {
    id: "harvest-formality",
    month: 9,
    day: 15,
    name: "The Harvest Formality",
    blurb:
      "Whatever has been grown this year is brought to the platform and named aloud. ... One carrot counts. One carrot has counted before and it counted properly.",
    onstage: "Bring what you grew. ... However much it is. It will be named the same way regardless.",
    rehearsing: "I am practising the naming. ... The trick is to say 'a potato' as though it were the only one, because to the potato it is.",
    afterwards: "What was grown was named aloud. ... The list was short and it was read slowly, which is how a short list is done properly.",
  },
  {
    id: "uncertain-provenance",
    month: 10,
    day: 29,
    name: "The Night of Uncertain Provenance",
    blurb:
      "We stand in the dark and discuss where things came from. ... The town, the objects in it, the noise from the north field. No conclusions are reached and none are wanted.",
    onstage: "Nobody light anything. ... The dark is the venue. Now: where do you think any of this came from.",
    rehearsing: "I am preparing questions to which I do not want answers. ... It is harder than it sounds. The instinct to solve is very strong in a small town.",
    afterwards: "Where things came from was discussed at length in the dark. ... Nothing was settled. Two people left early and have been asked about it since.",
  },
  {
    id: "damp-commemoration",
    month: 11,
    day: 5,
    name: "The Damp Commemoration",
    blurb: "It is damp. We commemorate it. ... Not celebrate. Commemorate. The distinction is the whole occasion and I will defend it.",
    onstage: "It is damp, and we are marking it. ... Nobody is enjoying this. Nobody is meant to be. Stay where you are.",
    rehearsing: "I am rehearsing in the damp, on purpose, to be sure the material holds up in it. ... So far the material is holding up better than I am.",
    afterwards: "The damp was commemorated. ... It was, by common agreement, the correct response to the damp.",
  },
  {
    id: "filing-of-the-year",
    month: 12,
    day: 28,
    name: "The Filing of the Year",
    blurb:
      "The year is read out, briefly, and then filed. ... The Office Creature attends in a professional capacity and does not speak, which he has described as the best part of his year.",
    onstage: "The year is being read out. ... Then it goes in the drawer, and next year is a different year, which is the point of the drawer.",
    rehearsing: "I am condensing the year. ... It was a long year and the reading is four minutes, so most of it is not going to be in there. That is the job.",
    afterwards: "The year was read out and filed. ... It took four minutes. Several people said afterwards that it had felt longer at the time.",
  },
];

export function festivalDef(id: FestivalId): FestivalDef {
  return FESTIVALS.find((f) => f.id === id) ?? FESTIVALS[0];
}

/** The festival falling on this date, whatever the hour. Null on the other
 *  three hundred and fifty-three days.
 *
 *  A LOOKUP INTO THE TABLE BY DATE, which is why it is here rather than in sim
 *  with the rest of the calendar walking: a festival is a total function of the
 *  date (DESIGN), so this is `festivalDef` keyed differently and nothing else.
 *  It being content is what lets `scheduledStop` ask it. */
export function festivalOn(now: number): FestivalDef | null {
  const d = new Date(now);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return FESTIVALS.find((f) => f.month === month && f.day === day) ?? null;
}

/** The festival happening RIGHT NOW — today's, inside its hours.
 *
 *  This is the one the gather and the crowd read; `festivalOn` is the one the
 *  Blob reads, because at nine in the morning on the day he is still rehearsing
 *  and it is still today. */
export function activeFestival(now: number): FestivalDef | null {
  const today = festivalOn(now);
  if (!today) return null;
  const hour = new Date(now).getHours();
  return hour >= FESTIVAL_FROM_HOUR && hour < FESTIVAL_TO_HOUR ? today : null;
}

// --- Where the town stands ------------------------------------------------------

/** The stage's anchor, and the cell the Blob stands on.
 *
 *  Coordinates are absolute world tiles, hand-placed against the plaza the way
 *  every other position in `src/content/` is (PLAZA spans x -5..5, y -5..3, in
 *  sim/world.ts, which content may not import).
 *
 *  HE STANDS BESIDE IT, NEVER NORTH OF IT. Raised art draws upward from its
 *  footprint, so the cell directly behind a piece is inside the piece as far as
 *  the renderer is concerned — it swallowed the Blessed Carrot whole and every
 *  unit test stayed green (ROADMAP §3g). Paying for that lesson a third time
 *  would be careless.
 *
 *  IT IS NORTH-WEST, IN THE OPEN, AND THAT IS THE SECOND PLACEMENT. The first
 *  put the platform at (-4,0) with the audience on the two rows below it, which
 *  is south-west — and the seed stall runs from y 4 to y 9 right underneath.
 *  Everything that stands up in this game is drawn UPWARD from its footprint,
 *  so a building's walls and roof cover a couple of tiles of ground to the
 *  north of it; the crowd was standing in the stall's shadow and Margfrom was
 *  a purple head behind a roof. It is the Blessed Carrot bug at the scale of a
 *  building, and it is invisible to every unit test in the codebase, because
 *  she was standing exactly where she was supposed to be.
 *
 *  Here the only thing north of the crowd is the stage, and the only thing
 *  north of the stage is open paving as far as the town hall. */
export const STAGE = { x: -4, y: -3 } as const;
export const STAGE_STAND = { x: -2, y: -2 } as const;

/** Where everyone else stands while it is on: two rows of open plaza in front
 *  of the platform.
 *
 *  Longer than the town is, so nobody has to share. */
export const AUDIENCE: { x: number; y: number }[] = [
  { x: -4, y: 0 },
  { x: -3, y: 0 },
  { x: -5, y: 0 },
  { x: -2, y: 0 },
  { x: -4, y: 1 },
  { x: -3, y: 1 },
  { x: -5, y: 1 },
  { x: -2, y: 1 },
];

/** The cell this particular person watches from.
 *
 *  DERIVED FROM THEIR ID, NOT FROM THE ROSTER. Indexing into `world.villagers`
 *  would have been shorter and is subtly wrong twice over: the list's order is
 *  not a promise (`ensureFixedCast` appends institutions to the end of it), and
 *  a crowd whose arrangement depends on who else exists rearranges itself when
 *  somebody moves in. Off an id it is stable across ticks, across reloads,
 *  across two days away and across the town growing — the same reason
 *  NEWCOMER_RINGS is picked by number rather than rolled. A crowd that
 *  reshuffles is not a crowd, it is weather.
 *
 *  The starter resident takes the front-centre cell and newcomers fan out from
 *  there, which is collision-free for the four arrivals the table holds and for
 *  three more after them. */
export function watchCell(id: CharId): { x: number; y: number } {
  const n = id.startsWith("newcomer:") ? 1 + Number(id.slice("newcomer:".length)) : 0;
  return AUDIENCE[(Number.isFinite(n) ? n : 0) % AUDIENCE.length];
}
