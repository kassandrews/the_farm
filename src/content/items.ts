// Items — the things you can carry. Deliberately a SHORT table, and it stays
// short by design (DESIGN §Materials): appearance is a separate free axis, so
// item count is the number of materials (three), never materials × looks.
// There is no "dark plank" item and never will be; see skins.ts.
//
// Three gathered classes cover all building: wood, stone, ore (one entry for
// every metal). Everything else here is produce — grown or foraged, bound for
// eating, gifting, and the museum rather than construction.

export type ItemId = "wood" | "stone" | "ore" | "carrot" | "mushroom";

/** What an item is for. Drives which UI groups it and, later, what the shop
 *  and museum will accept. */
export type ItemCategory = "material" | "produce";

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Plural for counts ("3 carrots"). Omit when the name doesn't inflect. */
  plural?: string;
  icon: string;
  category: ItemCategory;
  /** One line, in the house voice, for the satchel. Flat and unbothered. */
  blurb: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: {
    id: "wood",
    name: "Wood",
    icon: "🪵",
    category: "material",
    blurb: "Boards, mostly. It was a tree about an hour ago and is being very brave.",
  },
  stone: {
    id: "stone",
    name: "Stone",
    icon: "🪨",
    category: "material",
    blurb: "Heavy. Reliable. Has opinions about being carried.",
  },
  // Defined now, unobtainable until the underground layer exists — one entry
  // covers every metal, same trick as skins (DESIGN §Materials).
  ore: {
    id: "ore",
    name: "Ore",
    icon: "⛏️",
    category: "material",
    blurb: "Metal, still mostly rock about it. Found low down, where the light gives up.",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    plural: "Carrots",
    icon: "🥕",
    category: "produce",
    blurb: "Pulled by your own hand. The Blessed Carrot prefers not to discuss it.",
  },
  mushroom: {
    id: "mushroom",
    name: "Mushroom",
    plural: "Mushrooms",
    icon: "🍄",
    category: "produce",
    blurb: "Came up overnight, uninvited, entirely welcome.",
  },
};

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
export const ITEM_ORDER: ItemId[] = ["wood", "stone", "ore", "carrot", "mushroom"];
