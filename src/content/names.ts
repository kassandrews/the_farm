// The name registers — one voice per form, so the town's next ten residents
// sound like they came from the same place as its first ten.
//
// WHY A TABLE AND NOT A GENERATOR. Nothing here is called at run time. An
// arrival's name is a literal in content/arrivals.ts, written by hand alongside
// the three lines that arrival says, because a name picked by a hash is a name
// nobody chose — and the whole point of an arrival row is that somebody sat down
// and decided who was moving in. This file is where you go to decide.
//
// THE SPECIES/PERSON SPLIT. These are what a character is CALLED. What they ARE
// stays in content/canon/forms.ts and is Meadow canon: Arabella is a person, and
// "Fancy Little Menace" is her form. The repo has said "forms are species, not
// singletons" since the first cast row; until this file existed, the fixed cast
// was the one place that wasn't true, because the shopkeeper's name was her
// species and there was no room for a second Menace to be anybody.
//
// The registers are per-form because form is a VOICE, not a job (Design
// invariant: "Form is identity, never a job"). A menace is not required to be
// fancy at anything; she is just the sort of person who ends up called
// Perpetua. Nothing mechanical reads these names — no bonus, no counter, no
// gate is keyed on which register a resident came from.

import type { AdultForm } from "./canon/forms";

/** Names in each form's register, in no particular order. Free to grow; the
 *  only rule is the one the tests check — nobody in town shares a name. */
export const NAMES: Record<AdultForm, string[]> = {
  // Institutional and mildly beige. The joke is a creature of pure paperwork
  // being named like somebody's uncle, and it only works if the name is
  // genuinely dull — "Gary" lands where "Ledgerthorne" would just be the form
  // name again in a hat.
  office: ["Gary", "Denise", "Trevor", "Bernadette", "Colin", "Neville", "Pam"],

  // Aristocratic, three syllables minimum, faintly Edwardian. These are names
  // that expect to be announced.
  menace: ["Arabella", "Archibald", "Perpetua", "Montgomery", "Cordelia", "Ottoline", "Rupert"],

  // Short, blunt, and slightly like a tool or a defect. A gremlin's name should
  // sound like something that fell off.
  gremlin: ["Nub", "Snag", "Grit", "Scuff", "Bodge", "Rasp", "Clag"],

  // Fusty, over-formal, and old — the register of somebody who has published.
  scholar: ["Winifred", "Prudence", "Ambrose", "Hesketh", "Fenwick", "Millicent", "Bartleby"],

  // Stupid and affectionate, mostly food. A dog does not get a dignified name.
  // Nobody has ever met a dog called Bartholomew and thought "yes, that one".
  dog: ["Pesto", "Biscuit", "Waffle", "Gnocchi", "Pip", "Barnaby", "Crumpet"],

  // Stage names. Grand, vowel-heavy, and a little too much — the kind of name
  // you give yourself.
  blob: ["Aurelio", "Thessaly", "Vandemar", "Seraphine", "Bellamy", "Octavian"],

  // --- The singular ones --------------------------------------------------
  // One name each, and no register, because there is only ever one of them.
  // A pool implies a population, and a second Stray Cosmos would cost the
  // first one everything (DESIGN §"Secret forms stay secret in spirit").
  carrot: ["Derek"],
  ghost: ["Eloise"],
  cosmos: ["Sidra"],
  mole: ["Malcolm"],
  humcube: [], // not a character. A landmark that hums.
};
