// Finishes — the free appearance axis (DESIGN §Materials). THE rule that keeps
// this game's inventory small: a finish is a property of a placed tile, never a
// different item. There is no "walnut plank" in your satchel; there is wood,
// and there is the finish you're currently building in.
//
// Consequences worth stating plainly, because they're what make it cozy:
//   • Applying or changing a finish costs nothing and carries nothing.
//   • Unlocked finishes are permanent and weightless — you can never lose one,
//     and having more never makes anything heavier or more fiddly.
//   • Adding a new finish to this table costs zero inventory complexity, so
//     variety can grow forever without the UI degrading.
//
// Unlock sources are deliberately non-grindy: friendship, discovery, and the
// underground (DESIGN). Secrets are never spoiled by UI — a locked finish that
// comes from a secret must not advertise itself, so `hint` stays absent for
// those and the picker simply doesn't show them.
//
// Friendship was the source that wasn't wired. This file and DESIGN both listed
// it for months while every actual unlock came from a commission, a dig, or the
// heap — see `given` below, which is now what makes the sentence true.

import type { CharId } from "./cast";

/** Which built material a finish applies to. Finishes never cross classes —
 *  walnut is a wood finish; it has nothing to say about stone.
 *
 *  `cloth` is the odd one out and worth a note: it is the only class whose
 *  MATERIAL you cannot gather. You buy cloth from the Menace's counter and the
 *  colours are then free, exactly like wood — the scarce thing is the stuff,
 *  never the look. That is the whole rule of this file, applied to a material
 *  that happens to arrive by barter instead of by axe. */
export type SkinClass = "wood" | "stone" | "cloth" | "metal";

/** Every class, in picker order. A list rather than four call sites writing
 *  `["wood", "stone"]` and one of them forgetting to grow. */
export const SKIN_CLASSES: SkinClass[] = ["wood", "stone", "cloth", "metal"];

/** Display names for the classes. A table rather than a ternary at the one call
 *  site that labels them — the ternary said "Wood" or "Stone", so the day cloth
 *  finishes became reachable the satchel started calling them stone. */
export const SKIN_CLASS_NAMES: Record<SkinClass, string> = {
  wood: "Wood",
  stone: "Stone",
  cloth: "Cloth",
  metal: "Metal",
};

export type SkinId =
  // Wood
  | "pine"
  | "walnut"
  | "whitewash"
  | "ash"
  | "salvage"
  | "ochre"
  // Stone
  | "granite"
  | "sage"
  | "oxblood"
  | "bone"
  | "slate"
  | "cobble"
  | "marble"
  // Cloth
  | "undyed"
  | "madder"
  // Metal
  | "steel"
  | "brass"
  | "blackiron";

export interface SkinDef {
  id: SkinId;
  name: string;
  applies: SkinClass;
  /** Base colour, plus the bevel tones the tile renderer uses. */
  color: string;
  top: string;
  shade: string;
  /** Available from the start? Enough of these ship unlocked that building
   *  always looks decent on hour one (DESIGN: some now, more earned). */
  starter: boolean;
  /** How it's earned, when it isn't a starter. Shown only for finishes whose
   *  source is no secret; a finish from a secret carries no hint and is simply
   *  absent from the picker until found. */
  hint?: string;
  /** Given by somebody, once you're warm enough with them (sim/friendship.ts).
   *  DESIGN names friendship as an unlock source alongside discovery and the
   *  underground; this field is that source, and until it existed the source
   *  was a sentence in a doc with nothing behind it.
   *
   *  IT LIVES NEXT TO `hint` ON PURPOSE. The two say the same thing to two
   *  audiences — the hint tells the player who to go and see, this tells the
   *  sim who to check — and a hint naming one person while the gate names
   *  another is a lie the player can walk into. Adjacent, they get edited
   *  together.
   *
   *  The tier union is written out rather than imported from sim/friendship.ts,
   *  because content may not import sim (CLAUDE.md §Architecture). Same trick
   *  content/dialogue.ts plays for `warmLines`. `new` is deliberately not in
   *  it: a finish handed over by somebody who has not met you is a vending
   *  machine with a face on it. */
  given?: { who: CharId; tier: "familiar" | "friend" | "close" };
}

export const SKINS: Record<SkinId, SkinDef> = {
  // --- Wood ---------------------------------------------------------------
  pine: {
    id: "pine",
    name: "Pale pine",
    applies: "wood",
    color: "#c79a5e",
    top: "#d9ac6c",
    shade: "#a97e46",
    starter: true,
  },
  ash: {
    id: "ash",
    name: "Ash",
    applies: "wood",
    color: "#d8c4a0",
    top: "#e6d4b4",
    shade: "#b8a482",
    starter: true,
  },
  walnut: {
    id: "walnut",
    name: "Dark walnut",
    applies: "wood",
    color: "#6b4630",
    top: "#7d5439",
    shade: "#523527",
    starter: false,
    hint: "The Quiet Ghost knows where the dark wood is.",
  },
  whitewash: {
    id: "whitewash",
    name: "Whitewash",
    applies: "wood",
    color: "#e8e2d6",
    top: "#f4efe6",
    shade: "#c9c2b4",
    starter: false,
    hint: "Archibald has standards, and will share them.",
  },
  // The Gremlin's two, redeemed at the heap for junk (sim/heap.ts). They are
  // finishes rather than furniture or materials for a reason that is nearly a
  // rule: a finish is the only reward class in the game that CANNOT be a gate.
  // It costs nothing to apply, weighs nothing, and no commission or qualifying
  // house has ever asked what colour anything is. So a junk-only counter can
  // hand these out without junk becoming something you must go and get.
  salvage: {
    id: "salvage",
    name: "Salvage",
    applies: "wood",
    color: "#9a8468",
    top: "#ab9678",
    shade: "#7b6a53",
    starter: false,
    hint: "The Gremlin has a facility. He would like you to call it a facility.",
  },
  // --- Wood, painted ------------------------------------------------------
  // PAINT IS NOT A NEW AXIS. It was nearly built as one — a `paint` field on
  // every BuildCell, so you could paint walnut sage — and that is a stored field
  // on every built tile in every live save, a migration, and a second row of
  // swatches in the build bar, to express something these five rows express for
  // nothing. A painted board is a board that is a different colour, which is
  // exactly what a finish already is (DESIGN §Materials: appearance is a free
  // property WITHIN a material).
  //
  // They read as paint rather than as timber because of their `shade`, not their
  // hue: a stain follows the grain and a paint sits on top of it, so these carry
  // a shallower shade than the bare woods do and the grain shows through them
  // faintly instead of stripily (render/grain.ts inks the seams off `color`).
  // Whitewash was already this and was the model for it.
  //
  // Three of the four come off the heap. Paint is the most junk-shaped thing in
  // the game — it is half a tin somebody else opened — and the Gremlin's
  // counter was two rows deep and exhaustible, which made the one counter you
  // can empty the one with least in it. See content/shop.ts §"The heap".
  //
  // Ochre is the exception and it is the exception on purpose: HIS ARE FOUND
  // HALF-TINS AND PESTO'S IS A WHOLE ONE, KEPT BACK. That distinction is the
  // only thing stopping a second paint source from undercutting the heap, and
  // it is why the fourth paint is a gift rather than a fifth row on his
  // counter. A finish you were handed and a finish you salvaged are different
  // objects even when they are both a tin.
  sage: {
    id: "sage",
    name: "Sage green",
    applies: "wood",
    color: "#8a9c7e",
    top: "#98a98b",
    shade: "#748670",
    starter: false,
    hint: "The Gremlin has tins. Some of them still have paint in.",
  },
  oxblood: {
    id: "oxblood",
    name: "Ox-blood",
    applies: "wood",
    color: "#8e4f45",
    top: "#9e5b50",
    shade: "#78423a",
    starter: false,
    hint: "The Gremlin has tins. Some of them still have paint in.",
  },
  bone: {
    id: "bone",
    name: "Bone",
    applies: "wood",
    color: "#ded6c4",
    top: "#ebe4d4",
    shade: "#c4bcaa",
    starter: false,
    hint: "The Gremlin has tins. Some of them still have paint in.",
  },
  ochre: {
    id: "ochre",
    name: "Ochre",
    applies: "wood",
    // THE ONLY YELLOW IN THE GAME. The wood list ran tan, cream, dark brown,
    // grey-brown, white, green, red, off-white; the stone list ran four greys.
    // A front door is the thing this palette had no colour for.
    //
    // Saturated well past pine (`#c79a5e`), which is the whole reason it can
    // exist next to it — a gentle ochre is a slightly yellower pine, and a
    // finish nobody can tell from a starter is not worth a conversation.
    color: "#cca340",
    top: "#d9b150",
    shade: "#b68f36",
    starter: false,
    // Shallow shade like the other three paints, so the grain shows through
    // faintly instead of stripily (render/grain.ts inks the seams off `color`).
    // ~22 points of drop, where the bare woods carry 30.
    hint: "Pesto knows every front door on his round, and what colour it is.",
    // `familiar`, the lowest tier there is, and the earliest unlock in the game
    // that comes from a person. Deliberately the friendliest character in town:
    // the first time friendship pays out in something you can build with, it
    // should be the Dog, and it should happen before you have worked out that
    // it is a system.
    given: { who: "errands", tier: "familiar" },
  },
  // --- Stone --------------------------------------------------------------
  cobble: {
    id: "cobble",
    name: "Cobble",
    applies: "stone",
    color: "#8f8a80",
    top: "#9d978c",
    shade: "#726d65",
    starter: false,
    hint: "The Gremlin sorts stone into piles. The piles mean something to him.",
  },
  granite: {
    id: "granite",
    name: "Granite",
    applies: "stone",
    color: "#b8b2a6",
    top: "#c0bab0",
    shade: "#aaa498",
    starter: true,
  },
  marble: {
    id: "marble",
    name: "Marble",
    applies: "stone",
    // THE ONLY PALE STONE, and it exists because the stone list stopped at
    // granite. The museum was given cobble to make it the one masonry building
    // in town and came out a heavy grey slab — correct about the material and
    // wrong about the mood, which is a jail rather than a gallery.
    //
    // COOL, and that is the whole colour decision. The nearest thing in the
    // palette is whitewash (`#e8e2d6`), which is a WOOD, and the two are told
    // apart mostly by their grain — masonry runs in horizontal courses, planking
    // stands on end. Warming this to match the rest of the town would have made
    // colour do nothing and left the grain doing all of it. A faint blue cast
    // costs nothing and separates them at a glance.
    //
    // Light enough that the courses read as thin grey lines on near-white rather
    // than as mortar in a wall, which is what makes a big building of it read as
    // airy instead of massive.
    color: "#e4e6e4",
    top: "#f1f2f0",
    shade: "#c8ccc9",
    starter: false,
    hint: "The Museum is built of it. Winifred knows where the quarry was.",
    // AND FOR A WHILE THAT HINT WAS A LIE. Marble arrived with the museum's
    // walls and no way to earn it: nothing anywhere pushed it into
    // `skins.unlocked`, so the one finish whose hint named a person was the one
    // finish you could not get. ROADMAP's "every finish is reachable" was
    // written before it existed and quietly stopped being true.
    //
    // `friend` rather than `familiar` because she is telling you where a thing
    // is, and the notebook already spends `familiar` on what she has concluded.
    // It is also the tier nothing else in the game reads — company asks for
    // `familiar`, the notebook for better-than-`new`, Eloise's name for
    // `close` — so the middle rung had no job until this.
    given: { who: "museum", tier: "friend" },
  },
  slate: {
    id: "slate",
    name: "Slate",
    applies: "stone",
    color: "#5c6470",
    top: "#6a727e",
    shade: "#4a515c",
    starter: false,
    hint: "Found further down than most people dig.",
  },
  // --- Cloth --------------------------------------------------------------
  // Both starters, and that is not an oversight. Cloth is already gated by
  // having to be bartered for; gating its COLOUR too would charge twice for
  // one thing and break the rule that appearance is free.
  undyed: {
    id: "undyed",
    name: "Undyed",
    applies: "cloth",
    color: "#d8cdb6",
    top: "#e6dcc8",
    shade: "#b8ad96",
    starter: true,
  },
  madder: {
    id: "madder",
    name: "Madder red",
    applies: "cloth",
    color: "#b2564a",
    top: "#c46557",
    shade: "#8e4239",
    starter: true,
  },

  // --- Metal ---------------------------------------------------------------
  // The fourth class, and the one the ore note (ROADMAP §Ore's sink) appears to
  // forbid. It doesn't, and the distinction is worth stating because it is easy
  // to read the old note as closing this off.
  //
  // What that note rejected was a finish you BUY WITH ORE: "a finish that cost
  // ore would break the rule that keeps the item table at three." The rule being
  // protected is DESIGN §Materials' — THE SCARCE THING IS THE STUFF, NEVER THE
  // LOOK. These are free, exactly like every other finish, unlocked through the
  // same doors, and so they uphold that rule rather than bending it. Still true
  // and still tested: no furniture row but the lamp may cost ore.
  //
  // COST DOES NOT FOLLOW MATERIAL HERE, and this is the one class where it
  // cannot. The fireplace's row explains itself as "stone, because `finishes` is
  // stone-only", which works for the three classes whose material you may spend.
  // Ore is reserved, so a metal-finished piece is priced in stone instead — the
  // look and the cost part company on purpose, once, here.
  //
  // Three, because they are the three metals a room reads as: bright, warm,
  // dark. A fourth would be a shade of one of them.
  steel: {
    id: "steel",
    name: "Stainless",
    applies: "metal",
    color: "#b9bec6",
    top: "#d2d6dc",
    shade: "#8f959e",
    starter: true,
  },
  brass: {
    id: "brass",
    name: "Brass",
    applies: "metal",
    // The lamp's head has been this colour in every town since Phase 5a, as a
    // hardcoded literal. Now that metal is a class, that carve-out is a finish
    // like any other — see ROADMAP for the lamp's own conversion, which is a
    // redraw and not a table row.
    color: "#c2a24e",
    top: "#d8b95f",
    shade: "#967c39",
    starter: true,
  },
  blackiron: {
    id: "blackiron",
    name: "Black iron",
    applies: "metal",
    color: "#4a4550",
    top: "#5d5764",
    shade: "#332f3a",
    starter: true,
  },
};

export function skinDef(id: SkinId): SkinDef {
  return SKINS[id];
}

/** The finishes every new town begins with. */
export function starterSkins(): SkinId[] {
  return (Object.keys(SKINS) as SkinId[]).filter((id) => SKINS[id].starter);
}

/** Unlocked finishes for a class, in table order. */
export function availableSkins(unlocked: readonly SkinId[], applies: SkinClass): SkinId[] {
  return (Object.keys(SKINS) as SkinId[]).filter(
    (id) => SKINS[id].applies === applies && unlocked.includes(id),
  );
}

/** Unlocked finishes across SEVERAL classes, in table order — what the build
 *  bar shows for the tool in hand.
 *
 *  This is the picker's real question, and the singular version above is not.
 *  A floor may be wood or stone, so asking per class would mean rendering one
 *  row per class and making the player pick a category before picking a look —
 *  the menu DESIGN §Materials forbids ("the player is never asked which class
 *  they mean"). Table order does the grouping for free: SKINS is declared wood,
 *  then stone, then cloth, so the boards come out before the flagstones without
 *  anyone sorting anything. */
export function availableSkinsForClasses(
  unlocked: readonly SkinId[],
  classes: readonly SkinClass[],
): SkinId[] {
  return (Object.keys(SKINS) as SkinId[]).filter(
    (id) => classes.includes(SKINS[id].applies) && unlocked.includes(id),
  );
}

/** The default finish for a class, used when a save has none selected yet. */
export function defaultSkin(applies: SkinClass): SkinId {
  if (applies === "wood") return "pine";
  if (applies === "stone") return "granite";
  if (applies === "metal") return "steel";
  return "undyed";
}
