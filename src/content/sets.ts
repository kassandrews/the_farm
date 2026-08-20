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

import type { CharId } from "./cast";
import type { SkinId } from "./skins";
import type { FurnitureId } from "./furniture";
import { FURNITURE } from "./furniture";
import { FURNITURE_ART } from "./furnishings";
import { MODERNE_ART } from "./moderne";
import { FARMHOUSE_ART } from "./farmhouse";
import type { PieceArt } from "../render/furnishings";

/** Ids are stored in saves, so they are STABLE — same rule as furniture ids.
 *  Add rows; never rename one. */
export type SetId = "core" | "moderne" | "farmhouse";

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
  /** Somebody hands it to you — `SkinDef.given`'s shape, deliberately, because
   *  a set rides the finishes' unlock channels (ROADMAP §The catalog doctrine)
   *  and a second shape would be a second opinion about what a gift is. */
  given?: { who: CharId; tier: "familiar" | "friend" | "close" };
  /** Finishes that arrive WITH the set, in the same handshake — a style is
   *  its shapes and its palette, and unlocking the drawings without the
   *  colours they were photographed in would hand over half a gift. Unlocked
   *  by `takeSetGift`, accounted a source by skins.test.ts §reachable. */
  brings?: SkinId[];
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
  // Set Two, mid-century — the first set to keep the lattice's promise twice.
  // The design language and every silhouette's reasoning live in
  // content/moderne.ts; the owner walked the pilots (18 Aug 2026) and the fill
  // pass drew the rest to their grammar.
  moderne: {
    id: "moderne",
    name: "Moderne",
    starter: false,
    // The doctrine's own candidate, now the plan of record: Prudence, at
    // close. A set is knowledge arriving through friendship — weightless, free
    // to apply, gating nothing — which is the reward class the heap rule's own
    // reasoning carved out (ROADMAP §The catalog doctrine, the Nub argument).
    given: { who: "resident1", tier: "close" },
    // The plates come with their inks: the period's wood and the three cloths
    // every photograph of it keeps on the sofa (owner's call, 18 Aug 2026).
    brings: ["teak", "mustard", "teal", "burntorange", "rose", "powder", "mint"],
  },
  // Set Three, the homely one — grammar and every silhouette's reasoning in
  // content/farmhouse.ts. IN PILOTS as of 20 Aug 2026: four drawings, so the
  // lattice test is red on the other twenty-three BY DESIGN (Moderne's own
  // precedent — the red tests are the authoring checklist).
  farmhouse: {
    id: "farmhouse",
    name: "Farmhouse",
    starter: false,
    // A HOUSEWARMING. The owner's instinct was to hang this on housing
    // yourself, which is an ACT and not one of the doctrine's four channels
    // (starter / seen / given / taught); reshaped into a gift given on that
    // occasion, which keeps the channel and is warmer than an achievement.
    // Who gives it is not settled — the tier below is a placeholder the walk
    // will replace.
    given: { who: "resident1", tier: "familiar" },
    // NOTHING, and that is the finding rather than an omission: the painted
    // register farmhouse wants was already in the wood class before this set
    // existed (whitewash, bone, sage, ochre, oxblood). Inventing finishes to
    // fill this field would be the tail wagging the dog.
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
  moderne: MODERNE_ART,
  farmhouse: FARMHOUSE_ART,
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
