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

export interface ScheduleStop {
  x: number;
  y: number;
  /** Seconds to dwell here before ambling to the next stop. */
  dwell: number;
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
    schedule: [{ x: 0, y: -6, dwell: 999 }], // it does not leave the desk
  },
  resident1: {
    id: "resident1",
    form: "scholar",
    name: "Margfrom",
    fixed: false,
    home: { x: -4, y: -2 },
    schedule: [
      { x: -4, y: -2, dwell: 40 }, // by the plaza
      { x: 3, y: 1, dwell: 25 }, // wanders toward the homestead path
      { x: 6, y: 5, dwell: 30 }, // out near the player's plot
      { x: 1, y: 2, dwell: 20 }, // back through the middle
    ],
  },
};

// --- Intended full cast (DESIGN table), recorded for when the town expands ---
// Kept as data-shaped comments, not code: the museum Scholar, the Menace's
// shop, the Blessed Carrot's seed stall, the Dog Thing's errands board, the
// Dramatic Blob's stage, the Gremlin's junk economy. Secrets (Quiet Ghost at
// real-clock night, Stray Cosmos, Humming Cube landmark, Maverick Mole
// underground) stay unlisted in any UI — discovery is the signature.
