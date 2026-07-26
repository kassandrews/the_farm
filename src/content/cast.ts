// The town's people, as data. Two kinds live here:
//
//   • The FIXED CAST — named institutions (like Nook or Blathers). The vertical
//     slice ships one: the Tired Office Creature at the town hall, who stamps
//     your land claim (DESIGN §"fixed cast"). The rest of the mapping is
//     recorded now as commented intent so the town has somewhere to grow.
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

/** The people this table authors: the fixed institutions and the starter
 *  resident. A closed union, because the dialogue banks and the authored-bed
 *  table are keyed on it and a missing row should be a type error. */
export type AuthoredId =
  | "office" // Tired Office Creature — town hall, land claims
  | "shop" // Fancy Little Menace — the counter, and the only source of cloth
  | "heap" // Gremlin — the junk economy, and the only source of his finishes
  | "museum" // Corrigal — the curator, and every placard in the collection
  | "seedstall" // Blessed Carrot — seed, and the varieties you may plant
  | "resident1"; // the one starter resident

/** Someone the town has since taken in. Newcomers arrive at run time (see
 *  sim/commission.ts), so their ids can't be a union — there is no fixed set of
 *  them, and the whole point of Phase 3 is that the town keeps growing.
 *
 *  Numbered rather than named after the arrival, because two Dramatic Blobs may
 *  both move in ("Forms are species, not singletons" — DESIGN) and an id has to
 *  survive that. */
export type NewcomerId = `newcomer:${number}`;

export type CharId = AuthoredId | NewcomerId;

export function isNewcomer(id: CharId): id is NewcomerId {
  return id.startsWith("newcomer:");
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
 *  again every time it's read (resolved in sim/housing.ts). */
export type StopAnchor = "home";

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
  /** Display name. Fixed cast use their canon title; residents get a personal
   *  name (a Meadow import brings its own). */
  name: string;
  /** Fixed cast are institutions and don't wander far; residents walk a ring. */
  fixed: boolean;
  schedule: ScheduleStop[];
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
    name: "Tired Office Creature",
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
    name: "Fancy Little Menace",
    fixed: true,
    // Behind the counter, permanently. Like the Office Creature she is an
    // INSTITUTION rather than a resident: no bed, no ring, no home stop.
    //
    // She is a menace and so is Bissenette, the first arrival, and that is
    // allowed — "forms are species, not singletons" (DESIGN §Importing). The
    // museum curator will be a specific scholar while Margfrom is just a
    // scholar who lives here; this is the same shape.
    schedule: [{ fromHour: 0, x: 9, y: -2, doing: "behind the counter" }],
  },
  heap: {
    id: "heap",
    form: "gremlin",
    name: "Gremlin",
    fixed: true,
    // At the heap, north-east of the plaza. An INSTITUTION like the other two:
    // no bed, no ring, no home stop — whatever he does at night, he does here.
    //
    // He is a gremlin and so is the fourth arrival in content/arrivals.ts, on
    // the same footing as the two Menaces: forms are species, not singletons
    // (DESIGN §Importing). This one is the facility.
    schedule: [{ fromHour: 0, x: 8, y: -8, doing: "at the facility" }],
  },
  museum: {
    id: "museum",
    form: "scholar",
    name: "Corrigal",
    fixed: true,
    // A NAMED scholar, where Margfrom is a scholar who happens to live here.
    // That is the whole shape DESIGN §The museum insists on — forms are species,
    // not singletons — and it is the same relationship the Menace has with
    // Bissenette. Two scholars in one town is not a collision; it is the point.
    //
    // An INSTITUTION like the other three: no bed, no ring, no home stop. She
    // is beside the desk rather than behind it, because the museum is the
    // exhibits and she would rather be standing near them.
    schedule: [{ fromHour: 0, x: -8, y: -9, doing: "beside the desk" }],
  },
  seedstall: {
    id: "seedstall",
    form: "carrot",
    name: "Blessed Carrot",
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
    schedule: [{ fromHour: 0, x: -6, y: 7, doing: "beside the seeds" }],
  },
  resident1: {
    id: "resident1",
    form: "scholar",
    name: "Margfrom",
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
 *  stop of the day that's the LAST stop (which ran through midnight). */
export function scheduledStop(def: CharDef, now: number): ScheduleStop {
  const hour = new Date(now).getHours();
  let current = def.schedule[def.schedule.length - 1];
  for (const stop of def.schedule) {
    if (stop.fromHour <= hour) current = stop;
  }
  return current;
}

// --- Intended full cast (DESIGN table), recorded for when the town expands ---
// Kept as data-shaped comments, not code: the museum Scholar, the Menace's
// shop, the Blessed Carrot's seed stall, the Dog Thing's errands board, the
// Dramatic Blob's stage, the Gremlin's junk economy. Secrets (Quiet Ghost at
// real-clock night, Stray Cosmos, Humming Cube landmark, Maverick Mole
// underground) stay unlisted in any UI — discovery is the signature.
