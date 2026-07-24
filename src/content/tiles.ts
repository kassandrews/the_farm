// Tile record table. Content is data (CLAUDE.md): a tile is a row here, not a
// code path. Ids are stored in saves and in chunk overrides, so they are
// STABLE — never renumber; add new tiles at the end and migrate if one is ever
// retired. The renderer reads `top`/`shade` to draw a tile with a subtle 3D
// lip; the sim reads the behaviour flags.

export type TileId = number;

export interface TileDef {
  id: TileId;
  name: string;
  /** Base fill colour. */
  color: string;
  /** A hair-lighter top edge and a hair-darker bottom, for a soft pixel bevel.
   *  Omit for flat tiles (water animates its own way). */
  top?: string;
  shade?: string;
  /** Can the shovel turn this into dug dirt? (grass → dirt) */
  diggable?: boolean;
  /** Can a crop be planted here? Planting first tills it to farmland. */
  tillable?: boolean;
  /** Blocks walking (the tent footprint, water). */
  solid?: boolean;
}

// Stable ids. The vertical slice ships six; the two the player places by hand
// are dirt and plank (DESIGN §"Dig and place two tile types").
export const GRASS: TileId = 0;
export const DIRT: TileId = 1;
export const PLANK: TileId = 2;
export const STONE: TileId = 3; // town plaza paving
export const WATER: TileId = 4;
export const FARMLAND: TileId = 5; // tilled, dry
export const FARMLAND_WET: TileId = 6; // tilled, watered (crop drinks from it)
export const MUSHROOM: TileId = 7; // spread here while you were away — scenery, not a chore
export const TREE: TileId = 8; // a resource node; solid, gatherable, regrows
export const ROCK: TileId = 9;

export const TILES: Record<TileId, TileDef> = {
  [GRASS]: {
    id: GRASS,
    name: "Grass",
    color: "#8bbf5a",
    // Bevels kept subtle: grass tiles a whole field, and a strong top/shade
    // swing reads as venetian-blind banding rather than ground.
    top: "#92c561",
    shade: "#83b352",
    diggable: true,
    tillable: true,
  },
  [DIRT]: {
    id: DIRT,
    name: "Dug earth",
    color: "#a9794c",
    top: "#bd8a58",
    shade: "#8f6339",
    tillable: true,
  },
  [PLANK]: {
    id: PLANK,
    name: "Wood plank",
    color: "#c79a5e",
    top: "#d9ac6c",
    shade: "#a97e46",
  },
  [STONE]: {
    id: STONE,
    name: "Plaza stone",
    color: "#b8b2a6",
    top: "#c0bab0",
    shade: "#aaa498",
  },
  [WATER]: {
    id: WATER,
    name: "Water",
    color: "#4f8fd0",
    solid: true,
  },
  [FARMLAND]: {
    id: FARMLAND,
    name: "Farmland",
    color: "#7a5433",
    top: "#8a613c",
    shade: "#5f4026",
    tillable: true,
  },
  // Resource nodes. Solid — a tree is a real obstacle you walk around, which is
  // what makes a forest homestead feel like anything. Gathering one clears it
  // to plain ground (see sim/gather.ts), so land is always yours to shape.
  [TREE]: {
    id: TREE,
    name: "Tree",
    color: "#6fa04a", // canopy; the renderer draws a trunk and crown over it
    top: "#7cb054",
    shade: "#5d8a3e",
    solid: true,
  },
  [ROCK]: {
    id: ROCK,
    name: "Rock",
    color: "#9a958c",
    top: "#a8a39a",
    shade: "#827e76",
    solid: true,
  },
  [MUSHROOM]: {
    id: MUSHROOM,
    name: "Mushrooms",
    // Reads as grass with something growing on it (the renderer draws the caps),
    // so a patch that appeared overnight looks like a gift, not damage.
    color: "#8bbf5a",
    top: "#92c561",
    shade: "#83b352",
    diggable: true, // clearable if you'd rather have plain grass — never required
    tillable: true,
  },
  [FARMLAND_WET]: {
    id: FARMLAND_WET,
    name: "Watered farmland",
    color: "#5a3d24",
    top: "#68482c",
    shade: "#43301c",
    tillable: true,
  },
};

export function tileDef(id: TileId): TileDef {
  return TILES[id] ?? TILES[GRASS];
}
