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

/** Which built material a finish applies to. Finishes never cross classes —
 *  walnut is a wood finish; it has nothing to say about stone.
 *
 *  `cloth` is the odd one out and worth a note: it is the only class whose
 *  MATERIAL you cannot gather. You buy cloth from the Menace's counter and the
 *  colours are then free, exactly like wood — the scarce thing is the stuff,
 *  never the look. That is the whole rule of this file, applied to a material
 *  that happens to arrive by barter instead of by axe. */
export type SkinClass = "wood" | "stone" | "cloth";

/** Every class, in picker order. A list rather than four call sites writing
 *  `["wood", "stone"]` and one of them forgetting to grow. */
export const SKIN_CLASSES: SkinClass[] = ["wood", "stone", "cloth"];

/** Display names for the classes. A table rather than a ternary at the one call
 *  site that labels them — the ternary said "Wood" or "Stone", so the day cloth
 *  finishes became reachable the satchel started calling them stone. */
export const SKIN_CLASS_NAMES: Record<SkinClass, string> = {
  wood: "Wood",
  stone: "Stone",
  cloth: "Cloth",
};

export type SkinId =
  // Wood
  | "pine"
  | "walnut"
  | "whitewash"
  | "ash"
  | "salvage"
  // Stone
  | "granite"
  | "sage"
  | "oxblood"
  | "bone"
  | "slate"
  | "cobble"
  // Cloth
  | "undyed"
  | "madder";

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
  // All three come off the heap. Paint is the most junk-shaped thing in the
  // game — it is half a tin somebody else opened — and the Gremlin's counter
  // was two rows deep and exhaustible, which made the one counter you can empty
  // the one with least in it. See content/shop.ts §"The heap".
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
  return "undyed";
}
