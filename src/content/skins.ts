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
    hint: "The Fancy Little Menace has standards, and will share them.",
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

/** Unlocked finishes for a class, in table order — what the picker shows. */
export function availableSkins(unlocked: readonly SkinId[], applies: SkinClass): SkinId[] {
  return (Object.keys(SKINS) as SkinId[]).filter(
    (id) => SKINS[id].applies === applies && unlocked.includes(id),
  );
}

/** The default finish for a class, used when a save has none selected yet. */
export function defaultSkin(applies: SkinClass): SkinId {
  if (applies === "wood") return "pine";
  if (applies === "stone") return "granite";
  return "undyed";
}
