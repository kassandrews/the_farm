// The town's people, as data. Two kinds live here:
//
//   • The FIXED CAST — named institutions (like Nook or Blathers). The vertical
//     slice ships one: Gary at the town hall, who stamps your land claim
//     (DESIGN §"fixed cast"). The rest of the mapping is recorded now as
//     commented intent so the town has somewhere to grow.
//
// EVERYONE HERE HAS A PERSONAL NAME, institutions included. What they ARE is
// `form`, whose canon title lives in canon/forms.ts — Gary is a person and the
// Tired Office Creature is his species. Registers per form, and the reasoning,
// are in content/names.ts.
//
//   • STARTER RESIDENTS — imported villagers who walk a daily schedule. The
//     slice ships one; a real import from The Meadow (src/sim/meadow_import.ts)
//     replaces its identity and seeds its memory with raising history.
//
// Positions are world-tile coordinates (see src/sim/world.ts for the town
// layout constants). A schedule is a ring of waypoints with dwell times; the
// villager ambles between them on the real clock — form is flavour, never a job
// (Design invariant: "Form is identity, never a job").

import type { AdultForm } from "./canon/forms";
import { activeFestival, watchCell, FESTIVAL_FROM_HOUR, STAGE_STAND } from "./festivals";

/** The people this table authors: the fixed institutions and the starter
 *  resident. A closed union, because the dialogue banks and the authored-bed
 *  table are keyed on it and a missing row should be a type error. */
export type AuthoredId =
  | "office" // Gary — town hall, land claims
  | "shop" // Arabella — the counter, and the only source of cloth
  | "heap" // Nub — the junk economy, and the only source of his finishes
  | "museum" // Winifred — the curator, and every placard in the collection
  | "seedstall" // Derek — seed, and the varieties you may plant
  | "errands" // Pesto — the board, and the round he walks
  | "stage" // Aurelio — the plaza stage, and the twelve festivals
  | "resident1"; // the one starter resident

/** Someone the town has since taken in. Newcomers arrive at run time (see
 *  sim/commission.ts), so their ids can't be a union — there is no fixed set of
 *  them, and the whole point of Phase 3 is that the town keeps growing.
 *
 *  Numbered rather than named after the arrival, because two Dramatic Blobs may
 *  both move in ("Forms are species, not singletons" — DESIGN) and an id has to
 *  survive that. */
export type NewcomerId = `newcomer:${number}`;

/** Somebody the town does not know about. The type exists to keep them OUT of
 *  `CAST` rather than to make room for them in it: this file's closing note says
 *  secrets belong in no table, and a Record keyed on an id that included one
 *  would have quietly made that false. Their defs are derived (charDef, below),
 *  the way a newcomer's is. */
export type SecretId = "mole" | "ghost" | "cosmos";

export type CharId = AuthoredId | NewcomerId | SecretId;

export function isNewcomer(id: CharId): id is NewcomerId {
  return id.startsWith("newcomer:");
}

/** The secrets, as a list, so `isSecret` is the only thing that has to grow.
 *
 *  IT REPLACES TWO PARALLEL BLOCKLISTS. Before 4c there was one secret and the
 *  code said so twice — `villagerId !== "mole"` gated the offer of a room, and a
 *  `ROOTED` array gated the invitation to come along. Two lists that mean "this
 *  person is not part of the town" drift the moment there is a second name to
 *  put on both, and the drift looks like a Ghost being offered a spare bed. */
const SECRETS: CharId[] = ["mole", "ghost", "cosmos"];

/** Is this somebody the town has never heard of? True of nobody at the counters
 *  and nobody who moved in — the fixed cast are institutions, which is the
 *  opposite thing. */
export function isSecret(id: CharId): id is SecretId {
  return SECRETS.includes(id);
}

/** One entry in a daily routine: from `fromHour` (local wall-clock, 0–23) this
 *  is where the villager wants to be. Stops must be listed in ascending hour
 *  order; the last one wraps around midnight until the first. The Farm runs on
 *  the real clock (DESIGN §Time), so this is a genuinely daily routine — visit
 *  at 8am and at 8pm and you'll find people in different places. */
/** A destination that only the live world can answer.
 *
 *  "home" is the villager's own bed — and a bed is furniture the player may
 *  drag across the room, move to a house they built, or take apart for the six
 *  wood. So a home stop cannot be a coordinate; it has to be a question, asked
 *  again every time it's read (resolved in sim/housing.ts).
 *
 *  "warren" is the Mole's chamber, and it is a question for a different reason:
 *  where it is depends on the SEED, and content knows every coordinate in this
 *  town except the ones the map generates. Nothing moves it — unlike a bed, it
 *  is a total function of the seed — so its fallback below is genuinely
 *  unreachable, and it is written as the origin rather than as a plausible
 *  coordinate so that a bug puts him somewhere obviously wrong.
 *
 *  "grove" and "homestead" are the same question asked about the surface, for
 *  4c's two visitors. The grove is generated from the seed like the warren; the
 *  homestead is where the player's own plot is, which content also cannot know.
 *  "skyhome" is the fifth and the only one whose ANSWER changes with the
 *  calendar: it means "wherever Sidra is tonight", which is your homestead on
 *  one of the five shower nights and her own place in the sky on every other day
 *  of the year (DESIGN §The sky — she is in exactly one place at a time). Stated
 *  here as an anchor and answered in sim/housing.ts like the rest, because
 *  content cannot know either of those coordinates.
 *
 *  All five are the same rule — content states the anchor, sim answers it. */
export type StopAnchor = "home" | "warren" | "grove" | "homestead" | "skyhome";

export interface ScheduleStop {
  fromHour: number;
  /** Resolved against world state when present. */
  at?: StopAnchor;
  /** Where the stop is when `at` is absent — and where it FALLS BACK to when a
   *  symbolic anchor can't be answered, which for "home" means the villager
   *  hasn't got one. Resolution is therefore total: a homeless villager stands
   *  somewhere specific and slightly sad, never nowhere. */
  x: number;
  y: number;
  /** What they're nominally up to — flavour for future "…is at the plaza" UI. */
  doing?: string;
}

export interface CharDef {
  id: CharId;
  form: AdultForm;
  /** What they are CALLED — a personal name, for everybody, institutions
   *  included (registers in content/names.ts). What they ARE is `form`, and its
   *  canon title lives in canon/forms.ts.
   *
   *  These used to be the same string for five of the seven counters: the
   *  villager at the desk was named "Tired Office Creature". That made the
   *  town's own doctrine false where it was easiest to notice — "forms are
   *  species, not singletons" cannot survive the shopkeeper being named after
   *  her species, because it leaves a second Menace with nothing to be called.
   *  A Meadow import still brings its own name, unchanged. */
  name: string;
  /** Fixed cast are institutions and don't wander far; residents walk a ring. */
  fixed: boolean;
  schedule: ScheduleStop[];
  /** Where a secret is from — the Mole is not a resident of anywhere and the
   *  Cosmos is not staying. Present tense and about WHERE, never about who:
   *  naming what they are would be the UI doing the discovering for you.
   *
   *  CURRENTLY UNREAD. The conversation panel printed it under the name until
   *  the speech-bubble rebuild, which gave the speaker a name plate and nothing
   *  else. Kept because it is written content and the line is a good one; if
   *  nothing has picked it up by the time secrets get their own beat, delete it
   *  rather than leaving a field that describes a screen the game doesn't have. */
  subtitle?: string;
  /** What the town calls somebody whose name it hasn't earned yet — set only on
   *  the Quiet Ghost, and the whole of how a secret gets named.
   *
   *  `name` is Eloise from the first frame; this is what the UI shows until you
   *  are `close` to her (sim/friendship.ts `displayName`). A secret that
   *  introduces itself on contact is a label, and a name you were told is worth
   *  more than a name you were shown (CLAUDE.md §Tone: secrets are never spoiled
   *  by UI). Nobody else has one, and nobody else should — the institutions
   *  print their names on the counter, which is what an institution is. */
  unknownAs?: string;
  /** What they say the FIRST time you talk to them, before their counter ever
   *  opens (Phase 14a). Spoken in the dialogue frame — the person, once, and
   *  the screen forever after — so it introduces them AND the thing they run.
   *  Set only on the fixed keepers; a resident's first words come from their
   *  form's dialogue banks like all their others. House ellipsis style. */
  intro?: string;
}

/** Where a resident stands when they have no bed to go to: the middle of the
 *  plaza, in public, at 2am. (Plaza bounds live in sim/world.ts; content can't
 *  import sim, so this is written out — as every coordinate in this file is.)
 *
 *  It is deliberately NOT the spot their old house occupied. Standing on the
 *  empty grass where a bedroom used to be reads as the game having lost track
 *  of them; standing in the town square reads as a person with nowhere to go,
 *  which is the true thing and the one you can apologise for. */
const NO_HOME = { x: 0, y: -1 };

// Town geometry lives in world.ts; these are hand-placed against the plaza.
// The office sits at the north edge of the plaza; the resident's ring loops
// from the plaza out toward the player's homestead and back.
export const CAST: Record<AuthoredId, CharDef> = {
  office: {
    id: "office",
    form: "office",
    name: "Gary",
    fixed: true,
    // It does not leave the desk. The desk is the whole personality.
    //
    // Literal, and staying literal: he is an institution, not a resident. He has
    // no bed to claim, and "at: desk" would be a second symbolic anchor bought
    // for one character who never moves. What happens when you demolish the town
    // hall around him is a line of dialogue (Phase 3), not a pathing problem.
    schedule: [{ fromHour: 0, x: 0, y: -6, doing: "at the desk" }],
  },
  shop: {
    id: "shop",
    form: "menace",
    name: "Arabella",
    // Met once, in the frame; the counter thereafter. Her intro makes the
    // barter rule a sentence, because the counter itself never explains.
    //
    // NO INTRO OPENS WITH A BARE NAME (review, 3 Aug 2026): the name plate
    // under the portrait already says who is talking, so "Arabella. The
    // counter..." said the name twice and read as a roll call. They may
    // introduce themselves mid-sentence or let the plate do it.
    intro:
      "This is the counter, and I'm Arabella. Things cross it in both directions, and I keep track of neither ... That's the entire system. It has yet to fail.",
    fixed: true,
    // Behind the counter, permanently. Like Gary she is an
    // INSTITUTION rather than a resident: no bed, no ring, no home stop.
    //
    // She is a menace and so is Archibald, the first arrival, and that is
    // allowed — "forms are species, not singletons" (DESIGN §Importing). Since
    // the naming pass it is also SAYABLE: Arabella is a person and the Fancy
    // Little Menace is her form, where before the shopkeeper's name simply was
    // her species and there was nothing left for Archibald to be called.
    // Winifred keeps the museum while Prudence is just a scholar who lives
    // here; same shape, two floors down.
    // BESIDE the counter, not behind it — the same move Derek and Aurelio
    // already made, for the same reason and found the same way. A table is
    // twelve pixels tall and draws that height UPWARD, over the cell to its
    // north, which is exactly where "behind the counter" put her. On screen all
    // you could see of the Fancy Little Menace was her crown.
    //
    // One cell past the counter's east end and one row north, which is Derek's
    // relation to his own (see `seedstall` below). She still reads as the person
    // whose counter it is, and now she reads as a person.
    schedule: [{ fromHour: 0, x: 10, y: 0, doing: "beside the counter" }],
  },
  heap: {
    id: "heap",
    form: "gremlin",
    name: "Nub",
    // He introduces the pile as a facility with a straight face, which is the
    // whole of his job description.
    intro:
      "This is the facility. It looks like a pile because it is one ... Officially, a facility.",
    fixed: true,
    // At the heap, north-east of the plaza. An INSTITUTION like the other two:
    // no bed, no ring, no home stop — whatever he does at night, he does here.
    //
    // He is a gremlin and so is Snag, the fourth arrival, on the same footing
    // as the two Menaces: forms are species, not singletons (DESIGN
    // §Importing). This one is the facility.
    // Beside the counter, at its east end — Derek's relation, like everybody
    // else who keeps one. He used to stand at (8,-8), which is now the counter's
    // right-hand cell: the table moved out of the west wall it was embedded in
    // and landed on him (content/town.ts).
    schedule: [{ fromHour: 0, x: 9, y: -8, doing: "at the facility" }],
  },
  museum: {
    id: "museum",
    form: "scholar",
    name: "Winifred",
    intro:
      "I'm Winifred. I curate. The town brings me things, and I decide what they meant ... Somebody has to.",
    fixed: true,
    // The curator, where Prudence is a scholar who happens to live here. That
    // is the whole shape DESIGN §The museum insists on — forms are species, not
    // singletons — and it is the same relationship Arabella has with Archibald.
    // Two scholars in one town is not a collision; it is the point.
    //
    // She had a different name until the naming pass, which reopened a decision
    // ROADMAP had recorded as settled. Deliberately: the pass gave every
    // institution a personal name, and a roster with one scholar in the old
    // invented-sounding register and the rest in the fusty one had two naming
    // schemes in it. The old names are gone rather than retired into
    // content/names.ts — a register is the names you would actually use.
    //
    // An INSTITUTION like the other three: no bed, no ring, no home stop. She
    // is beside the desk rather than behind it, because the museum is the
    // exhibits and she would rather be standing near them.
    // BESIDE the desk, which this line has claimed since it was written and the
    // coordinate did not do. (-8,-9) is the cell directly north of the desk at
    // (-8,-8), so the desk drew its twelve pixels of height straight over her
    // and the curator of the town museum was a pair of eyes above a counter.
    // West end rather than east, because the east is the doorstep's side.
    schedule: [{ fromHour: 0, x: -9, y: -7, doing: "beside the desk" }],
  },
  seedstall: {
    id: "seedstall",
    form: "carrot",
    name: "Derek",
    // The intro says the quiet part once so his counter opener's "we're not
    // discussing it" has something to be not discussing.
    intro:
      "The stall is seeds, the seeds are for planting, and I am a carrot ... We're not discussing the last part.",
    fixed: true,
    // Behind his counter, south-west of the plaza. An INSTITUTION like the
    // other four: no bed, no ring, no home stop.
    //
    // The carrot is a SECRET form in the canon roster (canon/forms.ts) and this
    // does not spoil it, which is worth stating because the rule is easy to
    // trip over. What stays secret is how a Meadow sprite BECOMES one; the
    // Farm's fixed cast are named individuals DESIGN's table has always listed,
    // in a town you can walk around. The Quiet Ghost is the one who has to stay
    // out, because with her the individual IS the secret.
    // BESIDE the counter, not behind it. Standing on the cell directly north of
    // a table puts him inside its raised art — the overhang that reads as
    // height for everything else (DESIGN §Structures) drew the counter straight
    // over him, and a carrot is short enough that all you could see was the
    // leaves. Found on screen; the unit tests were green, because "is he inside
    // his own walls" is true either way.
    schedule: [{ fromHour: 0, x: -6, y: 8, doing: "beside the seeds" }],
  },
  errands: {
    id: "errands",
    form: "dog",
    name: "Pesto",
    // Dog voice: enthusiastic, exclamatory, brief. His counter is a board he
    // is often not standing at, and the intro owns that up front.
    intro:
      "I'm Pesto! I do the deliveries. The board has the details and I have the legs ... Sometimes I am not at the board. That's the legs.",
    fixed: true,
    // THE ONE INSTITUTION THAT MOVES, and the only reason to break the pattern
    // the other five keep: his institution is DELIVERIES (DESIGN's cast table),
    // and a delivery service that never leaves its counter is a word on a card.
    // The other five are counters you visit; he is a round you keep meeting.
    //
    // It costs nothing to do this. Positions are clock-derived (`scheduledStop`
    // walks the ring and asks what hour it is), so a ring is a table of stops
    // and not a tick, no schema, no state, no catch-up after an absence — the
    // same property that lets Prudence have a day.
    //
    // He starts and ends at the board, which is the part that matters for the
    // board being usable: the two times you are most likely to be in the plaza
    // are the two times he is standing at it. The rest of the day he is out,
    // and the board is readable without him (sim/game.ts's "read" action) —
    // which is why that action exists rather than being a nicety.
    //
    // He is BESIDE the board at (3,2), never north of it. A 22px piece drawn
    // over somebody standing behind it is exactly the Blessed Carrot bug
    // (ROADMAP), and paying for that lesson twice would be careless.
    schedule: [
      { fromHour: 0, x: 3, y: 2, doing: "asleep at the board, technically on duty" },
      { fromHour: 7, x: 3, y: 2, doing: "at the board, officially" },
      { fromHour: 10, x: 0, y: -4, doing: "collecting from the town hall" },
      // ON THE STREETS, both of them — the round moved when the buildings did
      // (content/town.ts §The street plan). These used to be bare grass
      // coordinates that the shop and the heap have since been laid over: (8,1)
      // is now the shop's south wall and (7,-5) is the heap's.
      { fromHour: 12, x: 8, y: 3, doing: "on the round, eastward" },
      { fromHour: 14, x: 7, y: -4, doing: "delivering to the heap, cautiously" },
      // Outside the museum door, not inside it. The gallery runs from y -14 to
      // its south wall at y -5, so a stop one row further north would have put
      // him in the antiquities wing, which is both wrong and against the glass.
      { fromHour: 16, x: -10, y: -4, doing: "at the museum, not touching anything" },
      { fromHour: 18, x: -6, y: 11, doing: "last call at the stall" },
      { fromHour: 20, x: 3, y: 2, doing: "back at the board, sorting" },
    ],
  },
  stage: {
    id: "stage",
    form: "blob",
    name: "Aurelio",
    intro:
      "You find me beside the stage ... The festivals are twelve nights a year. I am the other three hundred and fifty-three.",
    fixed: true,
    // The last institution. He does not leave the platform, which for a
    // tragedian is not devotion so much as the absence of anywhere better to
    // be — the festivals are twelve days a year and the other three hundred
    // and fifty-three are rehearsal (content/festivals.ts).
    //
    // BESIDE the stage at (-2,1), never on it and never north of it. The
    // Blessed Carrot bug for the second time would be careless and for the
    // third time would be a policy: raised art draws upward from its footprint,
    // so the cell behind a piece is inside the piece. He is also not ON the
    // platform, which is a smaller and better joke — he steps up for the
    // festival and stands next to it the rest of the year.
    //
    // He is a blob, and so is any Dramatic Blob who moves in later, and so is
    // the player if they imported one. Forms are species, not singletons
    // (DESIGN §Importing); this one is the institution.
    schedule: [{ fromHour: 0, x: STAGE_STAND.x, y: STAGE_STAND.y, doing: "beside the stage" }],
  },
  resident1: {
    id: "resident1",
    form: "scholar",
    name: "Prudence",
    fixed: false,
    // A real day: fieldwork in the morning, out by your plot after lunch,
    // back to the plaza for the evening, home once it's properly dark.
    //
    // The two home stops are symbolic. She starts in margfrom_house (which the
    // town authors her a bed in), but nothing here says so — move the bed and
    // she follows it; take it away and both stops fall back to the plaza.
    schedule: [
      { fromHour: 0, at: "home", ...NO_HOME, doing: "asleep, probably" },
      { fromHour: 7, x: 1, y: 2, doing: "conducting morning research" },
      { fromHour: 11, x: 6, y: 5, doing: "observing your homestead" },
      { fromHour: 16, x: 3, y: 1, doing: "walking back, thinking" },
      { fromHour: 19, at: "home", ...NO_HOME, doing: "writing it all up" },
    ],
  },
};

// --- Newcomers ----------------------------------------------------------------
// Someone who moved in during Phase 3 has no row in CAST — they didn't exist
// when this file was written. What they DO have is a name, a form and a
// friendship, all of which the Villager already carries; the only thing a cast
// table was supplying that the villager doesn't is a shape of day.
//
// So a newcomer's def is DERIVED from the villager rather than stored anywhere.
// That's the same instinct as the housing model: don't write a fact down twice
// when one of the copies can be computed. It also means an arrival costs no
// schema — a newcomer is an ordinary Villager, and this is how they get a
// routine.

/** The rings a newcomer might walk. Everyone's day has the same shape — home
 *  overnight, out in the morning, back through the plaza in the evening —
 *  because the shape is what makes a town feel inhabited; the differences are
 *  in where they linger.
 *
 *  Three of them, picked by the newcomer's number, so the second arrival isn't
 *  standing inside the first. Deliberately not random: a routine you can learn
 *  is the point ("visit at 8am and at 8pm and you'll find people in different
 *  places"), and one that reshuffles is just weather. */
const NEWCOMER_RINGS: ScheduleStop[][] = [
  [
    { fromHour: 0, at: "home", ...NO_HOME, doing: "asleep" },
    { fromHour: 8, x: -2, y: 1, doing: "getting the measure of the plaza" },
    { fromHour: 13, x: 4, y: 3, doing: "out by the fields" },
    { fromHour: 18, x: 0, y: 0, doing: "watching the light go" },
    { fromHour: 21, at: "home", ...NO_HOME, doing: "in for the night" },
  ],
  [
    { fromHour: 0, at: "home", ...NO_HOME, doing: "asleep" },
    { fromHour: 9, x: 2, y: -2, doing: "loitering near the town hall" },
    { fromHour: 14, x: -3, y: 4, doing: "down by the water" },
    { fromHour: 19, x: 1, y: 0, doing: "in the square, saying little" },
    { fromHour: 22, at: "home", ...NO_HOME, doing: "turning in" },
  ],
  [
    { fromHour: 0, at: "home", ...NO_HOME, doing: "asleep" },
    { fromHour: 7, x: 5, y: 1, doing: "up early, unclear why" },
    { fromHour: 12, x: -1, y: 3, doing: "somewhere near the edge of things" },
    { fromHour: 17, x: -1, y: 0, doing: "back in the plaza" },
    { fromHour: 20, at: "home", ...NO_HOME, doing: "home before dark" },
  ],
];

/** The Mole. Not in CAST, deliberately — see SecretId: that table is the town,
 *  and he is emphatically not in the town.
 *
 *  `fixed: true` in the institutional sense and in no other: he does not walk a
 *  ring, and the same early return that keeps Gary at his desk
 *  keeps the Mole in his chamber. He is also not protected by it — sink a shaft
 *  above him and his ground is shallow, and the answer to that is a line, not a
 *  rule (DESIGN §"The Mole, specifically").
 *
 *  One stop, all day, anchored rather than placed: the chamber is generated
 *  from the seed, which is the one coordinate this file cannot know. */
export const MOLE: CharDef = {
  id: "mole",
  form: "mole",
  name: "Malcolm",
  fixed: true,
  schedule: [{ fromHour: 0, at: "warren", x: 0, y: 0, doing: "down here" }],
  subtitle: "Underground",
};

/** The Quiet Ghost. Out of CAST for the same reason as the Mole, and out of
 *  `content/arrivals.ts` for a sharper one: a Ghost who moves in one afternoon
 *  and gets commissioned a house like anybody else would spoil the one thing
 *  about her worth keeping. She is not housed, she is FOUND.
 *
 *  She stands in the grove all day and is only THERE at night — the difference
 *  between her schedule (one stop, always) and her presence (sim/presence.ts) is
 *  the whole of her. `fixed: true` for the Mole's reason: she doesn't walk a
 *  ring, and the early return in `tickVillager` is what keeps her put. */
export const GHOST: CharDef = {
  id: "ghost",
  form: "ghost",
  name: "Eloise",
  // The only `unknownAs` in the game. She is "Quiet Ghost" in the panel until
  // you are close to her, and then she is Eloise — the name is the milestone,
  // and it is the only friendship milestone in the game you can point at.
  unknownAs: "Quiet Ghost",
  fixed: true,
  schedule: [{ fromHour: 0, at: "grove", x: 0, y: 0, doing: "among the dark trees" }],
  subtitle: "Out past the woods",
};

/** The Stray Cosmos. A VISITOR, not a resident and not an institution — she is
 *  on the calendar rather than in the town, and the calendar is the real one
 *  (content/showers.ts). Anchored to the homestead because five nights a year
 *  in unbounded grass is a lottery, and the Mole's ring corridor exists
 *  precisely because a lottery is not a secret, it is a shrug. */
export const COSMOS: CharDef = {
  id: "cosmos",
  form: "cosmos",
  name: "Sidra",
  fixed: true,
  // "skyhome" rather than "homestead", and it is the same one stop it always
  // was: she has no routine and never did — she is either here or she is not.
  // What changed in Phase 7c is that "not here" now has an address.
  schedule: [{ fromHour: 0, at: "skyhome", x: 0, y: 0, doing: "passing through" }],
  subtitle: "Not from here",
};

/** The numeric part of a newcomer id, for picking their ring. */
function newcomerNumber(id: NewcomerId): number {
  const n = Number(id.slice("newcomer:".length));
  return Number.isFinite(n) ? n : 0;
}

/** Everything a villager needs to walk a day, whoever they are.
 *
 *  The ONE place that turns a villager into a routine. It used to be `CAST[id]`
 *  at four call sites, which silently returned undefined for anyone the table
 *  didn't author — and an undefined def means "don't move", so a newcomer would
 *  have stood on their arrival tile forever without a single error. */
export function charDef(v: { id: CharId; name: string; form: AdultForm; fixed: boolean }): CharDef {
  if (v.id === "mole") return MOLE;
  if (v.id === "ghost") return GHOST;
  if (v.id === "cosmos") return COSMOS;
  if (!isNewcomer(v.id)) return CAST[v.id];
  return {
    id: v.id,
    form: v.form,
    name: v.name,
    fixed: false,
    schedule: NEWCOMER_RINGS[newcomerNumber(v.id) % NEWCOMER_RINGS.length],
  };
}

/** Where a character wants to be at a given wall-clock time. Walks the ring
 *  backwards to the latest stop that has already started; before the first
 *  stop of the day that's the LAST stop (which ran through midnight).
 *
 *  A FESTIVAL OUTRANKS THE RING, and that is the whole of how the town gathers
 *  (DESIGN §Festivals). It belongs in here rather than in sim because it is the
 *  same kind of fact as everything else this function knows: what the calendar
 *  says, and whose day it is. Nothing is moved and nothing is stored — the
 *  answer to "where should you be at five on the third of March" is simply the
 *  plaza, which keeps position derived from the clock (sim/villagers.ts) and
 *  keeps two days away needing no catch-up.
 *
 *  The FIXED CAST are exempt, and it is worth being explicit that this is not a
 *  belt-and-braces guard: `tickVillager` returns early on `def.fixed` so they
 *  would not walk anywhere regardless, but `currentActivity` reads this too,
 *  and Gary reported as "at the festival" while sitting at his
 *  desk with the door shut would be the game saying something untrue about him.
 *  The counters stay open through the party; a shop that shut so you could
 *  attend would be a deadline in a party hat. */
/** Does this person live in the town, in the sense of having somewhere to sleep?
 *
 *  Read off the RING rather than from a list of ids, because the ring is where
 *  the fact already is: a resident's day ends `at: "home"` and an institution's
 *  never does. Every institution's entry in the table above says "no bed, no
 *  ring, no home stop" in as many words, and this is that sentence as a
 *  predicate — so a new institution is excluded the day it is authored, without
 *  anybody remembering to add it anywhere.
 *
 *  DESIGN §"The fixed cast (institutions)" is the rule underneath: they are
 *  "named individuals ... distinct from resident villagers". Gary lives at the
 *  desk. That is not a housing problem to be solved, it is the joke. */
export function livesSomewhere(def: CharDef): boolean {
  return def.schedule.some((s) => s.at === "home");
}

export function scheduledStop(def: CharDef, now: number): ScheduleStop {
  if (!def.fixed && activeFestival(now)) {
    const cell = watchCell(def.id);
    return { fromHour: FESTIVAL_FROM_HOUR, x: cell.x, y: cell.y, doing: "at the festival" };
  }
  const hour = new Date(now).getHours();
  let current = def.schedule[def.schedule.length - 1];
  for (const stop of def.schedule) {
    if (stop.fromHour <= hour) current = stop;
  }
  return current;
}

// --- The full cast, now complete ----------------------------------------------
// DESIGN's institution table is all seven: Gary's town hall, Arabella's shop,
// Winifred's museum, Derek's seed stall, Pesto's errands board, Nub's junk
// economy, and Aurelio's plaza stage. This comment used to list the ones that
// didn't exist yet; nothing is left on it.
//
// Secrets (Eloise at real-clock night, Sidra, the Humming Cube landmark,
// Malcolm underground) stay unlisted in any UI — discovery is
// the signature, and none of them belongs in this table.
