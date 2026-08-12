// Furniture sets — the style axis of DESIGN §The catalog.
//
// The catalog is a lattice of FORM × SET × FINISH, and the whole design is that
// the lattice has no holes. A form is what a room needs (a chair, a bed, a
// hearth) and owns everything the sim cares about: footprint, solidity, facing,
// cost. A set is a complete restyling of every one of those forms — its chair is
// a different DRAWING, never the core chair recoloured. A finish is the colour,
// and it rides free because the grids never contained colours in the first
// place (see furnishings.ts: `c`/`t`/`s` are questions).
//
// THE RULE THIS FILE EXISTS TO ENFORCE: a set covers every form, or it does not
// ship. That is what fixes the frustration the doctrine was written against —
// reaching for a piece and finding a hole where a whole style should be, or a
// set that runs out halfway through a kitchen. `sets.test.ts` walks the lattice
// and fails the build on a gap, so the guarantee is checked rather than
// promised.
//
// A SET MAY NEVER CHANGE A FOOTPRINT. Forms own the sim facts, so two sets'
// chairs occupy a cell identically — which is what buys the catalog's quietest
// good idea, restyling a furnished room in place without moving one thing. A set
// that wants a wider sofa is asking for a new FORM, and forms are deliberately
// expensive: every set that exists owes a drawing to every form that exists.
//
// Sets may also carry pieces BEYOND the checklist — that is where a set's
// personality lives — but an extra is never how a set meets its obligation.

import type { FurnitureId } from "./furniture";
import { FURNITURE } from "./furniture";
import { FURNITURE_ART } from "./furnishings";
import type { PieceArt } from "../render/furnishings";

/** Ids are stored in saves, so they are STABLE — same rule as furniture ids.
 *  Add rows; never rename one. */
export type SetId = "core";

export interface SetDef {
  id: SetId;
  name: string;
  /** Available from the start?
   *
   *  The unlock channels are the FINISHES' channels, deliberately (DESIGN §The
   *  catalog): starter, seen, given, taught. Only `starter` has a field here,
   *  because only `starter` has a set using it — the rest arrive with the first
   *  set that needs them, shaped like `SkinDef.given` since that is the one this
   *  is copying. Writing four unlock fields for one starter set would be four
   *  guesses about content nobody has authored. */
  starter: boolean;
}

export const SETS: Record<SetId, SetDef> = {
  // The furniture the game already had, which is not something the sets scheme
  // was added BESIDE — it is Set One, and it is what defines the checklist by
  // having a piece in every slot. Honest pine and undyed cloth: what furniture
  // simply IS here, before any of it has a style worth naming.
  //
  // Starter, and permanently. Furnishing has to look good on hour one, which is
  // the same argument `starterSkins` makes one axis over.
  core: {
    id: "core",
    name: "Plain",
    starter: true,
  },
};

/** Art, keyed by set and then by form.
 *
 *  Core's table is `FURNITURE_ART` itself rather than a copy — that file is
 *  1,700 lines of drawings with the reasoning for each one written above it, and
 *  re-nesting it under a key would be a diff nobody could read for no gain. A
 *  second set is a second module and a second row here. */
export const SET_ART: Record<SetId, Partial<Record<FurnitureId, PieceArt>>> = {
  core: FURNITURE_ART,
};

/** The art for a piece in a set, or undefined if it is drawn some other way.
 *
 *  NO FALLBACK TO CORE, deliberately. A set-to-core fallback would let an
 *  incomplete set ship looking almost right — half moderne, half pine — which is
 *  the exact failure the completeness rule exists to prevent, hidden instead of
 *  reported. Undefined here means the renderer's own path draws it, which is
 *  already true of four core pieces and is checked by `sets.test.ts`. */
export function artFor(id: FurnitureId, set: SetId): PieceArt | undefined {
  return SET_ART[set]?.[id];
}

/** The checklist: every form a set must cover, in table order.
 *
 *  DERIVED from the `form` flag on the furniture rows rather than written out
 *  here as a second list. Two lists would be two opinions about what a chair is,
 *  and the one in furniture.ts is the one the game reads. */
export const CATALOG_FORMS: FurnitureId[] = Object.values(FURNITURE)
  .filter((d) => d.form)
  .map((d) => d.id);
