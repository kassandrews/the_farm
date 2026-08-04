// What each form does to a standard-issue tent.
//
// EVERY TENT IS THE SAME TENT. The canvas, the size, the pitch and the doorway
// are issued kit and never vary — the renderer's tent is one shape, and this
// table only says what its occupant has *added* to it. That's the whole joke,
// and it is also what keeps the commission beat intact: the newcomer camped by
// the plaza is in the same tent you started in, because you started in one too,
// and yours has your own colours on it for exactly the same reason theirs does.
// Give each form its own tent SHAPE and the beat stops reading as "they're
// where you were" and starts reading as a quest marker.
//
// Form is identity, never a job (DESIGN): a pennant is a thing a Fancy Little
// Menace put on their own tent, not a duty the game assigned them. Nothing here
// may gate an activity, a recipe or a place — it is decoration and only ever
// decoration.
//
// Content is data (CLAUDE.md): a form's tent is a row here. The renderer knows
// how to draw eleven decorations; it does not know who gets which.

import type { AdultForm } from "./canon/forms";

/** The one thing the occupant did to their tent.
 *
 *  Deliberately an enum rather than a bag of flags. Two decorations on one tent
 *  at 28×24 pixels is a cluttered tent, not a characterful one, and the moment
 *  a row can say `{ pennant: true, lantern: true }` somebody will. */
export type TentDecor =
  | "pennant" // a flag on the pole
  | "openflap" // the door pinned wide open, permanently
  | "sag" // the ridge has given up
  | "patched" // mismatched squares, one guy line loose
  | "lantern" // a lamp hung off the pole, lit after dark
  | "notice" // a laminated notice pinned to the canvas
  | "hover" // no pegs, no lines, standing anyway
  | "taut" // squared, level, symmetrical, finished with a cube
  | "sprout" // greens coming out of the apex
  | "stars" // the canvas is holding some sky
  | "burrow"; // a heap of earth, and a way down

export interface TentDef {
  decor: TentDecor;
  /** Their body colour, so the flag/lamp/leaves read as *theirs* at a glance.
   *  Copied from canon/sprites.ts rather than read out of it: the sprite tables
   *  are pixel data keyed by stage, and reaching into them for a swatch would
   *  make every body-palette tweak a silent change to the skyline. */
  accent: string;
}

/** Every form, INCLUDING the secrets — but the five secret rows are only ever
 *  reachable through the PLAYER's own tent.
 *
 *  Secret forms stay out of content/arrivals.ts on purpose (a Quiet Ghost who
 *  simply moves in one afternoon spoils the one thing about her worth keeping),
 *  so no commission can ever pitch one. The player, though, imports from The
 *  Meadow with whatever they retired as — sim/meadow_import.ts accepts any adult
 *  form — so a Ghost or a Stray Cosmos can absolutely be the one who woke up in
 *  a tent on day one. This table has to cover them, and the record must stay
 *  complete if arrivals ever changes its mind. */
export const TENTS: Record<AdultForm, TentDef> = {
  // A tent is a field camp, and a field camp with a banner is an ARMY camp.
  // Nobody made them commander of anything.
  menace: { decor: "pennant", accent: "#efa6cf" },

  // The flap is not broken. It is open because a door being shut is a problem
  // that can be solved.
  dog: { decor: "openflap", accent: "#ffd884" },

  // Structurally sound. Emotionally not. The droop is theatre and the tent is
  // in on it.
  blob: { decor: "sag", accent: "#b9a8d8" },

  // Repaired more times than it has been damaged, which is its own answer to
  // the question of where the extra cloth came from.
  gremlin: { decor: "patched", accent: "#8fce76" },

  // Reading in a tent, at night, having been given a whole town to look at.
  scholar: { decor: "lantern", accent: "#79c7d4" },

  // He has posted the rules of the tent. On the tent. There is one occupant.
  office: { decor: "notice", accent: "#c4c6d4" },

  // Guy lines are for tents that could fall down.
  ghost: { decor: "hover", accent: "#dce8f4" },

  // Every line at the same angle, every peg the same distance out, and a cube
  // where the finial goes. The only tent in town that was pitched CORRECTLY.
  humcube: { decor: "taut", accent: "#6bb6cd" },

  // Left alone in the sun with a water supply. This was always going to happen.
  carrot: { decor: "sprout", accent: "#f08c3a" },

  // It is not reflecting them. It is a dark afternoon and the canvas has stars
  // on it, and nobody has asked about this yet.
  cosmos: { decor: "stars", accent: "#6a4a9e" },

  // Issued a tent. Used the tent as a door. The paperwork records a tent.
  mole: { decor: "burrow", accent: "#8a7466" },
};
