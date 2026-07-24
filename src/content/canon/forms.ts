// VENDORED FROM cozy_sprites (src/pet/types.ts + roster.ts). Copied, not
// imported — The Meadow stays untouched (see CLAUDE.md). This is canon: the
// eleven forms, their names, and the collection-clue blurbs, trimmed to what
// The Farm needs (no food/game/care fields — those are The Meadow's rules).
//
// Forms are species, not singletons: the Farm's fixed cast are *specific*
// individuals of a form (the museum's Scholar is a particular scholar), while
// imported villagers are other individuals of the same forms. See
// src/content/cast.ts for the Farm-side institution mapping.

export type Stage = "egg" | "baby" | "child" | "teen" | "adult";

/** The six standard adult forms, three earnable secrets (ghost, humcube,
 *  carrot), one ultra-rare secret (cosmos), and the mole — an easter egg that
 *  never appears in any collection. */
export type AdultForm =
  | "dog"
  | "blob"
  | "gremlin"
  | "scholar"
  | "office"
  | "menace"
  | "ghost"
  | "humcube"
  | "carrot"
  | "cosmos"
  | "mole";

export interface FormDef {
  id: AdultForm;
  name: string;
  /** The Meadow's vague collection-clue hint. Never shown as a UI label on the
   *  Farm; kept as canon flavour and for the museum's confidently-wrong plaques. */
  blurb: string;
  /** Secret forms don't advertise themselves. Kept so UI can honour the
   *  "secrets are never spoiled" rule (no "???" slots). */
  secret?: boolean;
  hidden?: boolean;
}

export const FORMS: Record<AdultForm, FormDef> = {
  dog: {
    id: "dog",
    name: "Loyal Dog Thing",
    blurb: "Often appears when an active, well-cared-for teen develops an enthusiasm for fetch.",
  },
  blob: {
    id: "blob",
    name: "Dramatic Blob",
    blurb: "Tends to emerge from a pampered life of cake and mild neglect.",
  },
  gremlin: {
    id: "gremlin",
    name: "Gremlin",
    blurb: "Reports suggest an irresponsible relationship with geometry and the truth.",
  },
  scholar: {
    id: "scholar",
    name: "Little Scholar",
    blurb: "Associated with discipline, vegetables, and confidently incorrect research.",
  },
  office: {
    id: "office",
    name: "Tired Office Creature",
    blurb: "Develops from a steady, unremarkable, slightly under-loved upbringing.",
  },
  menace: {
    id: "menace",
    name: "Fancy Little Menace",
    blurb: "Cultivated by high discipline, refined taste, and quiet judgment.",
  },
  ghost: {
    id: "ghost",
    name: "Quiet Ghost",
    blurb: "Nobody remembers raising one. It remembers being raised. In the dark.",
    secret: true,
  },
  humcube: {
    id: "humcube",
    name: "Humming Cube",
    blurb: "Reportedly the result of feeding the cube to something patient until it agreed.",
    secret: true,
  },
  carrot: {
    id: "carrot",
    name: "Blessed Carrot",
    blurb: "You are what you eat, if you never once waver.",
    secret: true,
  },
  cosmos: {
    id: "cosmos",
    name: "Stray Cosmos",
    blurb: "No upbringing summons it. Once in a great while, the night sky simply keeps one.",
    secret: true,
  },
  mole: {
    id: "mole",
    name: "Maverick Mole",
    blurb: "Undocumented. Ships anyway.",
    hidden: true,
  },
};

/** The forms a fresh Farm sprite may hatch as — the six standard ones. Secrets
 *  and the mole are earned or imported, never picked from a menu. */
export const STANDARD_FORMS: AdultForm[] = [
  "dog",
  "blob",
  "gremlin",
  "scholar",
  "office",
  "menace",
];
