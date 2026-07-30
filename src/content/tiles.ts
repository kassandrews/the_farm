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
   *  The renderer draws these ONLY where this tile meets a different material —
   *  drawn on every tile they band a field into venetian blinds. Omit for flat
   *  tiles (water animates its own way). */
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

// The underground (Phase 4a). Four rows, and note what they are NOT: a second
// set of grass/dirt/farmland. Down there the world starts SOLID and you carve
// space out of it, which is the inverse of the surface — up here you clear
// what's standing on open ground, down there open ground is the thing you make.
export const BEDROCK: TileId = 10; // uncarved; the default state of the layer
export const CAVE_FLOOR: TileId = 11; // what carving leaves behind
export const ORE_VEIN: TileId = 12; // a resource node in the rock, seen only once you tunnel to it
// The way down and the way up. Stored on the SURFACE only: underneath, that
// same coordinate is ordinary cave floor. One entrance, one record, so a shaft
// can never half-exist on one layer and not the other.
export const SHAFT: TileId = 13;

// The secrets (Phase 4c). Both are GENERATED terrain rather than anything the
// town stamps or a migration hands you — a secret that arrives in your save is
// a fixture you happen not to have visited yet (see sim/mole.ts). Neither is
// listed anywhere in the UI; you find them by walking out.
export const DARK_TREE: TileId = 14; // the Ghost's grove; a tree in four numbers
export const HUM_CUBE: TileId = 15; // the landmark that hums. Solid, and that's all

/** Something the Gremlin left in your grass while you were out (Phase 5b).
 *
 *  A TILE rather than a new "loose objects" layer, and the precedent is directly
 *  above it: MUSHROOM is already away-placed scenery you may pick up with the
 *  same verb. A layer would be more general — it could put a thing down on your
 *  floorboards — and that generality is the argument against it as much as for
 *  it. He leaves things in the yard, not in your house, and a tile costs no
 *  schema, no migration and no second thing for the room fill to have an opinion
 *  about. */
export const JUNK_PILE: TileId = 16;

export const TILES: Record<TileId, TileDef> = {
  [GRASS]: {
    id: GRASS,
    name: "Grass",
    color: "#8bbf5a",
    // Safe to keep a real swing now that the bevel only shows at boundaries:
    // a field of grass draws none of it, so this is the lip at a path's edge.
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
  [JUNK_PILE]: {
    id: JUNK_PILE,
    name: "Something left in the grass",
    // Grass, with something on it. Same base as MUSHROOM for the same reason:
    // what appeared overnight has to read as a gift on your lawn, not as damage
    // to it. The renderer draws the object.
    color: "#8bbf5a",
    top: "#92c561",
    shade: "#83b352",
    // Diggable and tillable, so you are never obliged to pick it up — turn the
    // ground over it and it's gone, which is the mushroom's promise too. Nothing
    // in this game may become a tidying job (sim/away.ts's house rules).
    diggable: true,
    tillable: true,
  },
  // --- Underground -----------------------------------------------------------
  // Dark, and deliberately low-contrast between the two rock rows: a vein has to
  // be found by tunnelling to it, not spotted through solid stone from a
  // distance. The renderer draws the ore specks; the base colours stay close.
  [BEDROCK]: {
    id: BEDROCK,
    name: "Rock face",
    color: "#3a352e",
    top: "#443e36",
    shade: "#2f2b25",
    solid: true,
  },
  [CAVE_FLOOR]: {
    id: CAVE_FLOOR,
    name: "Cave floor",
    color: "#5b544a",
    top: "#655d52",
    shade: "#4e483f",
  },
  [ORE_VEIN]: {
    id: ORE_VEIN,
    name: "Ore vein",
    color: "#414046",
    top: "#4b4a51",
    shade: "#37363b",
    solid: true,
  },
  [SHAFT]: {
    id: SHAFT,
    name: "Shaft",
    // Reads as a hole from above and as daylight from below; the renderer gives
    // it a ladder. Never solid — stepping onto it is how you use it.
    color: "#241f1a",
  },
  // --- The secrets -----------------------------------------------------------
  // A dark tree is a TREE with a different palette: same solidity, same
  // gathering, same regrowth, and it drops the same `wood`. There is no walnut
  // wood in the satchel and never will be (DESIGN §Materials — three gathered
  // classes, ever); what the grove holds is the FINISH, which is a different
  // axis entirely and weighs nothing.
  [DARK_TREE]: {
    id: DARK_TREE,
    name: "Dark tree",
    color: "#40503a",
    top: "#4a5b42",
    shade: "#334130",
    solid: true,
  },
  // Solid, and solidity is the whole of its protection. You cannot stand on it,
  // so the shovel and the hoe (which act on the tile underfoot) can never reach
  // it; it has no NodeDef, so gathering ignores it. It is untouchable without a
  // single rule saying so — which is better than a rule, because nothing here
  // is protected from you on purpose (the Mole's road).
  [HUM_CUBE]: {
    id: HUM_CUBE,
    // Named plainly. It is not called "the Humming Cube" anywhere the game can
    // show you, because nothing in the game ever says its name — you stand next
    // to it and it hums.
    name: "Cube",
    color: "#5a5f72",
    top: "#6b7085",
    shade: "#464a5a",
    solid: true,
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
