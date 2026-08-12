// Items — the things you can carry. Deliberately a SHORT table, and it stays
// short by design (DESIGN §Materials): appearance is a separate free axis, so
// item count is the number of materials (three), never materials × looks.
// There is no "dark plank" item and never will be; see skins.ts.
//
// Three gathered classes cover all building: wood, stone, ore (one entry for
// every metal). Everything else here is produce — grown or foraged, bound for
// eating, gifting, and the museum rather than construction.

import type { IconName } from "./icons";
import type { SkinClass } from "./skins";

export type ItemId =
  | "wood"
  | "stone"
  | "ore"
  | "carrot"
  | "mushroom"
  | "radish"
  | "potato"
  | "wheat"
  | "peas"
  | "tomato"
  | "pumpkin"
  | "kale"
  | "cloth"
  | "junk"
  | "seed"
  // The garden's fruit (DESIGN §The garden). Produce, never material: no
  // recipe, commission or acceptance test may ever ask for one — they go to
  // gifts, tastes, festivals and the museum, and nothing depends on them.
  | "apple"
  | "plum"
  | "blueberry";

/** What an item is for. Drives which UI groups it and, later, what the shop
 *  and museum will accept.
 *
 *  `junk` is its own category and NOT a material, which is the load-bearing
 *  part (DESIGN §Materials): the three gathered classes are the complete list
 *  of things you build with, and a fourth thing you can hold must not quietly
 *  become a fourth thing you build with. Nothing costs junk to place.
 *
 *  `seed` is likewise its own category and not `produce`, for the same kind of
 *  reason: produce is what you eat, barter and donate, and seed is none of
 *  those. Filed as produce it would drift into a museum row or a shop price the
 *  first time somebody iterated the category, and a stall row payable in seed
 *  is a farming prerequisite for farming (DESIGN §Materials). */
export type ItemCategory = "material" | "produce" | "soft" | "junk" | "seed";

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Plural for counts ("3 carrots"). Omit when the name doesn't inflect. */
  plural?: string;
  icon: IconName;
  category: ItemCategory;
  /** One line, in the house voice, for the satchel. Flat and unbothered. */
  blurb: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: {
    id: "wood",
    name: "Wood",
    icon: "plank",
    category: "material",
    blurb: "Boards, mostly. It was a tree about an hour ago and is being very brave.",
  },
  stone: {
    id: "stone",
    name: "Stone",
    icon: "rock",
    category: "material",
    blurb: "Heavy. Reliable. Has opinions about being carried.",
  },
  // Defined now, unobtainable until the underground layer exists — one entry
  // covers every metal, same trick as skins (DESIGN §Materials).
  ore: {
    id: "ore",
    name: "Ore",
    icon: "pickaxe",
    category: "material",
    blurb: "Metal, still mostly rock about it. Found low down, where the light gives up.",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    plural: "Carrots",
    icon: "carrot",
    category: "produce",
    blurb: "Pulled by your own hand. Derek prefers not to discuss it.",
  },
  mushroom: {
    id: "mushroom",
    name: "Mushroom",
    plural: "Mushrooms",
    icon: "mushroom",
    category: "produce",
    blurb: "Came up overnight, uninvited, entirely welcome.",
  },
  // The other two varieties (content/crops.ts). They differ from the carrot in
  // how long they take and in nothing else — no crop is worth more than another
  // (DESIGN §Materials), so nowhere in this file may one of them read as a
  // better haul than its neighbours.
  radish: {
    id: "radish",
    name: "Radish",
    plural: "Radishes",
    icon: "radish",
    category: "produce",
    blurb: "In and out in an afternoon. Behaves as though this were an achievement.",
  },
  potato: {
    id: "potato",
    name: "Potato",
    plural: "Potatoes",
    icon: "potato",
    category: "produce",
    blurb: "Took most of a day about it and would do so again.",
  },
  // The 4d varieties. Four of them have a month they are ABOUT (content/seasons.ts)
  // and wheat has none, and neither fact may show up here as an advantage: a
  // pumpkin is not a better haul in October, it is a pumpkin in October. A blurb
  // may notice a season. It may never recommend one.
  //
  // `plural` is omitted where the noun doesn't inflect — `itemLabel` falls back
  // to `name`, so wheat is "3 wheat" and not "3 wheats". Peas go the other way
  // and are the reason this is worth a comment: the row is named "Pea" so that
  // one of them isn't "1 peas".
  wheat: {
    id: "wheat",
    name: "Wheat",
    icon: "wheat",
    category: "produce",
    blurb: "Two days in the ground and no opinion about any of them.",
  },
  peas: {
    id: "peas",
    name: "Pea",
    plural: "Peas",
    icon: "peas",
    category: "produce",
    blurb: "Quick, green, and slightly smug about the first part.",
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    plural: "Tomatoes",
    icon: "tomato",
    category: "produce",
    blurb: "Went in at breakfast and was ready when it got dark.",
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    plural: "Pumpkins",
    icon: "pumpkin",
    category: "produce",
    blurb: "Takes a day and a bit, so it is never ready at the same hour twice.",
  },
  kale: {
    id: "kale",
    name: "Kale",
    icon: "kale",
    category: "produce",
    blurb: "Comes up at roughly the hour you planted it, a day later. Unbothered by the cold.",
  },
  // ONE row for every variety, exactly as one row covers every metal and one
  // covers every object the ground gives up. What a seed will become is not a
  // property of the seed: it is the variety you have unlocked and currently have
  // selected (DESIGN §Materials, "seed is the stuff, the variety is the look").
  // A `carrot_seed` / `potato_seed` table is how this file stops being short.
  seed: {
    id: "seed",
    name: "Seed",
    plural: "Seed",
    // The pips, NOT the sprout the Plant tool wears. What a seed will become is
    // not a property of the seed (see the note above), and a seedling in the
    // satchel is a picture of a decision that hasn't been made yet.
    icon: "seed",
    category: "seed",
    blurb: "Small, brown, non-committal. Decides what it is on the way into the ground.",
  },
  // THE GARDEN'S FRUIT. Only a tree or bush YOU PLANTED ever yields one
  // (sim/garden.ts) — the wild kind is paint, and the orchard is the
  // advertisement. Produce like the carrot and worth exactly as much, which is
  // to say nothing anybody's ledger can see.
  apple: {
    id: "apple",
    name: "Apple",
    plural: "Apples",
    icon: "apple",
    category: "produce",
    blurb: "Off your own tree. It knows, somehow, and tastes accordingly.",
  },
  plum: {
    id: "plum",
    name: "Plum",
    plural: "Plums",
    icon: "plum",
    category: "produce",
    blurb: "Dusty purple, exactly ripe for about an afternoon. You caught it.",
  },
  blueberry: {
    id: "blueberry",
    name: "Blueberry",
    plural: "Blueberries",
    icon: "blueberry",
    category: "produce",
    blurb: "A handful from your own bush. The pinewood's ones were never on offer.",
  },
  // The ONE thing in this table you cannot gather. It is why the Menace's
  // counter exists (DESIGN §Materials): the shop sells what the world won't
  // give you, and cloth is that. Everything soft is made of it.
  cloth: {
    id: "cloth",
    name: "Cloth",
    icon: "cloth",
    category: "soft",
    blurb: "Bartered for, not found. Nothing out there grows in bolts.",
  },
  // Found, never gathered — the ground turns it up when you dig (sim/junk.ts).
  // One row covers every possible object, exactly as one row covers every
  // metal: what you actually pulled out is a line of flavour at the moment you
  // pull it out, and then it is simply junk. The Gremlin is the only one who
  // sees the difference, and he is not going to explain it.
  junk: {
    id: "junk",
    name: "Junk",
    icon: "junk",
    category: "junk",
    blurb: "It was under there. It is out here now. The Gremlin calls this a supply chain.",
  },
};

/** What placing something costs, in one of two shapes.
 *
 *  A **number** means "this many of whatever the finish is made of" — the
 *  cost-follows-material rule (DESIGN §Materials). It is the only shape a
 *  buildable that can wear more than one class may use, because a wall in
 *  slate has to cost stone and a wall in pine has to cost wood, and a fixed
 *  record could only ever name one of them.
 *
 *  A **record** is a fixed price regardless of finish, for things whose look
 *  and whose materials are genuinely unrelated. The lamp is the case that
 *  proves the shape is needed: its post takes your wood finishes, but what it
 *  costs is ore, and `2` would have quietly repriced it in timber. */
export type BuildPrice = number | Partial<Record<ItemId, number>>;

/** Resolve a price against the material the chosen finish is made of. The
 *  three finish classes are spelled exactly like the three material items, so
 *  the substitution is the identity and no lookup table is needed — which is
 *  also the reason to never rename one without renaming the other. */
export function priceItems(cost: BuildPrice, material: ItemId): Partial<Record<ItemId, number>> {
  return typeof cost === "number" ? { [material]: cost } : cost;
}

/** Which material a BARE-NUMBER price is paid in, for a piece wearing this
 *  finish class. Identity for the three classes whose material you can spend.
 *
 *  METAL MAPS TO STONE, and that is the whole reason this function exists rather
 *  than the class being used directly as an item id. Ore is reserved — no
 *  furniture row but the lamp may cost it (ROADMAP §Ore's sink, held by
 *  lamp.test.ts) — so a metal-finished piece is priced in the heavy material it
 *  most resembles. It is the one place appearance and cost part company, and it
 *  is deliberate; see content/skins.ts §Metal. */
export function priceMaterial(applies: SkinClass): ItemId {
  return applies === "metal" || applies === "ceramic" ? "stone" : applies;
}

export function itemDef(id: ItemId): ItemDef {
  return ITEMS[id];
}

/** "3 carrots" / "1 carrot" — count plus the right form of the name. */
export function itemLabel(id: ItemId, count: number): string {
  const def = ITEMS[id];
  const name = count === 1 ? def.name : (def.plural ?? def.name);
  return `${count} ${name.toLowerCase()}`;
}

/** Display order in the satchel: materials first (you're usually building),
 *  then produce. Stable, so the list never reshuffles under your thumb. */
export const ITEM_ORDER: ItemId[] = [
  "wood",
  "stone",
  "ore",
  "cloth",
  "seed",
  // Produce in CROP_ORDER (content/crops.ts) — by growth time, shortest first —
  // with the two foraged rows at the end. Ordering the varieties the way the
  // planting picker orders them means the satchel and the picker never disagree
  // about which one is "the quick one".
  "radish",
  "peas",
  "carrot",
  "tomato",
  "potato",
  "kale",
  "pumpkin",
  "wheat",
  "mushroom",
  "junk",
];
