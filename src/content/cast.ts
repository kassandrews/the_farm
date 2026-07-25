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

export type CharId =
  | "office" // Tired Office Creature — town hall, land claims
  | "resident1"; // the one starter resident (overwritten by a Meadow import)

/** One entry in a daily routine: from `fromHour` (local wall-clock, 0–23) this
 *  is where the villager wants to be. Stops must be listed in ascending hour
 *  order; the last one wraps around midnight until the first. The Farm runs on
 *  the real clock (DESIGN §Time), so this is a genuinely daily routine — visit
 *  at 8am and at 8pm and you'll find people in different places. */
export interface ScheduleStop {
  fromHour: number;
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
  home: { x: number; y: number };
  schedule: ScheduleStop[];
}

// Town geometry lives in world.ts; these are hand-placed against the plaza.
// The office sits at the north edge of the plaza; the resident's ring loops
// from the plaza out toward the player's homestead and back.
export const CAST: Record<CharId, CharDef> = {
  office: {
    id: "office",
    form: "office",
    name: "Tired Office Creature",
    fixed: true,
    home: { x: 0, y: -6 },
    // It does not leave the desk. The desk is the whole personality.
    schedule: [{ fromHour: 0, x: 0, y: -6, doing: "at the desk" }],
  },
  resident1: {
    id: "resident1",
    form: "scholar",
    name: "Margfrom",
    fixed: false,
    // Beside her bed, inside margfrom_house (src/content/town.ts). She used to
    // sleep at (-4,-2) — which is ON the plaza paving, a thing nobody noticed
    // because there was no building anywhere to notice it against.
    home: { x: -9, y: -3 },
    // A real day: fieldwork in the morning, out by your plot after lunch,
    // back to the plaza for the evening, home once it's properly dark.
    schedule: [
      { fromHour: 0, x: -9, y: -3, doing: "asleep, probably" },
      { fromHour: 7, x: 1, y: 2, doing: "conducting morning research" },
      { fromHour: 11, x: 6, y: 5, doing: "observing your homestead" },
      { fromHour: 16, x: 3, y: 1, doing: "walking back, thinking" },
      { fromHour: 19, x: -9, y: -3, doing: "writing it all up" },
    ],
  },
};

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
