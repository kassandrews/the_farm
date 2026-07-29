// What each form is quietly pleased by in a house.
//
// DESIGN's flagship paragraph: "the Menace has standards; the Blob wants drama;
// the Ghost wants it dark". This is that, as a table.
//
// THERE IS NO OPPOSITE OF THIS TABLE, AND THAT IS THE DESIGN. A taste can only
// ever produce delight — there is no `dislikes` field, no penalty, and nothing
// anywhere that reads a house and finds it wanting. DESIGN is explicit that
// taste is delight and never a gate, and the reliable way to keep a rule like
// that is to leave the vocabulary no way to say the other thing. A villager
// who could be disappointed by your house would turn a gift into a review,
// which is the exact feeling the whole game is arranged against.
//
// So a match adds a line. A miss subtracts nothing, and the villager talks
// about something else they like instead (sim/home.ts).
//
// Tastes are per FORM, not per person, and they are not derived from Meadow
// history any more: the import supplies the player and nobody else (DESIGN
// §"Importing from The Meadow"), so a resident has no imported history to
// derive anything from. Form is the whole input. This stays within "form is
// identity, never a job" — liking dark wood is a personality, not a duty, and
// nothing is ever required of anyone because of it.

import type { AdultForm } from "./canon/forms";
import type { SkinId } from "./skins";
import type { FurnitureId } from "./furniture";

export interface Taste {
  /** A finish they're pleased to be housed in. */
  finish?: SkinId;
  /** A piece of furniture they're pleased to find in there with them. */
  piece?: FurnitureId;
}

export const TASTES: Partial<Record<AdultForm, Taste>> = {
  // Standards, and she will share them — which is what skins.ts has said about
  // whitewash since before commissions existed. The shelf is here so her FIRST
  // house can please her: whitewash is unlocked BY housing her, so she can't
  // possibly be living in it the first time, and a taste that's unreachable at
  // the moment it matters most is a taste nobody ever sees.
  menace: { finish: "whitewash", piece: "shelf" },
  // Wants drama. Dark wood is theatrical, and it costs nothing that the Ghost
  // wants the same thing for an entirely different reason — two forms are
  // allowed to like one finish.
  //
  // The lamp is stage lighting, which is the only thing he could possibly think
  // a lamp is. It being the one piece that costs ore doesn't make it a
  // requirement — a taste adds a line and a miss subtracts nothing (above), so
  // an unlit house pleases him for the walnut and nobody has to go underground
  // to satisfy a Blob.
  blob: { finish: "walnut", piece: "lamp" },
  // Wants it dark. Phase 4, when there's a Ghost to house; recorded now so the
  // intent doesn't have to be rediscovered.
  ghost: { finish: "walnut" },
  // Somewhere to sit near you.
  dog: { piece: "chair" },
  // Something with a surface, so it can be subtly rearranged.
  gremlin: { piece: "table" },
  // Somewhere to put the findings down.
  scholar: { piece: "shelf" },
  // The Office Creature has no taste in houses. He has a desk, and the desk is
  // the whole personality — an institution being delighted by soft furnishings
  // would be the game mistaking him for a person.
};

export function tasteOf(form: AdultForm): Taste | null {
  return TASTES[form] ?? null;
}
