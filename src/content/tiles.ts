// Tile record table. Content is data (CLAUDE.md): a tile is a row here, not a
// code path. Ids are stored in saves and in chunk overrides, so they are
// STABLE — never renumber; add new tiles at the end and migrate if one is ever
// retired. The renderer reads `top`/`shade` to draw a tile with a subtle 3D
// lip; the sim reads the behaviour flags.

import type { BuildPrice } from "./items";
import type { SkinClass } from "./skins";

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
  /** How fast you cross it, as a multiple of your own walking speed. Omitted
   *  means 1, and almost every row omits it.
   *
   *  A FIELD rather than a check for shallow water in the movement code, for the
   *  usual reason (CLAUDE.md): how a tile feels underfoot is a property of the
   *  tile. But shipped with exactly one row setting it, because the moment two
   *  or three do, plain grass becomes the slow case and the world acquires a
   *  speed gradient nobody asked for. Sand in particular stays 1 — it is a skin
   *  and nothing else, as the note on SAND says.
   *
   *  It is NOT a stamina meter and must not become one (DESIGN invariant): it
   *  costs seconds while you're in the water and nothing at all once you're out.
   *  There is no budget, no recovery, and no state. */
  speed?: number;
}

// Stable ids. The vertical slice ships six; the two the player places by hand
// are dirt and floor (DESIGN §"Dig and place two tile types").
//
// FLOOR is `2` and stays `2`. The tile the player lays used to be called PLANK,
// which named the MATERIAL — and a tool called Plank that can be slate is a
// contradiction in the toolbar, so the word went. The number never can: it is
// written into every chunk override in every save.
export const GRASS: TileId = 0;
export const DIRT: TileId = 1;
export const FLOOR: TileId = 2;
export const STONE: TileId = 3; // town plaza paving
export const WATER: TileId = 4;
export const FARMLAND: TileId = 5; // tilled, dry
export const FARMLAND_WET: TileId = 6; // tilled, watered (crop drinks from it)
export const MUSHROOM: TileId = 7; // spread here while you were away — scenery, not a chore
export const TREE: TileId = 8; // a resource node; solid, gatherable, regrows
export const ROCK: TileId = 9;

/** What laying a floor costs, and what it may be finished in.
 *
 *  It lives here rather than in content/structures.ts because a floor is a
 *  TILE — it does not stand up, and structures.ts is explicitly the things
 *  that do. It lives in content at all (rather than as a constant in
 *  sim/game.ts, where it sat as BUILD_COSTS) because content is data
 *  (CLAUDE.md) and this is now two fields with a rule attached rather than one
 *  number.
 *
 *  `cost: 1` is one unit of whatever the finish is made of — one tree's eight
 *  wood still lays eight boards, and a rock's twelve stone lays twelve
 *  flagstones. See items.BuildPrice for why a bare number rather than a
 *  record. */
export const FLOOR_BUILD: { cost: BuildPrice; finishes: SkinClass[] } = {
  cost: 1,
  finishes: ["wood", "stone"],
};

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

/** The shore, and the shallows (Phase 5c). Both are generated terrain, and both
 *  exist because an unbounded world may not contain unbounded water: the sea is
 *  finite now, so it has an EDGE, and an edge needs the two tiles an edge is
 *  made of (DESIGN §Water).
 *
 *  SAND is a skin and nothing else — it behaves exactly like the grass it
 *  replaces, down to being diggable and tillable. You may farm the beach. It
 *  carries no material and gates nothing; it is what the ground looks like
 *  where water stops.
 *
 *  SHALLOW is the fordable half of water, and it is walkable — which is the
 *  whole reason streams and small ponds are crossable without a bridge (their
 *  depth never reaches the shelf, so they have no deep middle). Being walkable
 *  is also its one danger: `isWalkable`, `structures.ts` and `furniture.ts` all
 *  test `solid`, so without the explicit refusals beside those calls the first
 *  arrival's cottage gets sited in the surf. */
export const SAND: TileId = 17;
export const SHALLOW: TileId = 18;

/** The found places (Phase 7b). Three props that exist only inside one, and are
 *  generated terrain like the cube — never placed, never craftable, never listed.
 *
 *  They are TILES for the reason JUNK_PILE is: the world already has a way to put
 *  a thing on a square, and a "scenery objects" layer would be a second one, with
 *  its own opinions about rooms, roofs and pathfinding. Nothing here needs to sit
 *  on a floorboard.
 *
 *  All three are SOLID, and that is the only thing they do. You cannot walk
 *  through a mailbox; you also cannot dig it up, take it, or put another one
 *  somewhere. A found place gives nothing (DESIGN §Found places), and a prop you
 *  could pocket would be the first thing out there that ranks. */
export const POLE: TileId = 19; // a rod stuck in a bank, one of a dozen
export const MAILBOX: TileId = 20; // on a post, miles from anywhere
export const STAIR: TileId = 21; // stone steps, ending in the air

/** The sky (Phase 7c). Two rows, and the underground's inversion inverted again.
 *
 *  Down there the layer starts SOLID and you carve space out of it. Up here it
 *  starts OPEN and you carve nothing, because there is no tool in the sky at all
 *  (DESIGN §The sky — "you visit; you do not reshape"). So CLOUD is not the
 *  sky's grass, with a dirt and a farmland waiting behind it: it is the whole
 *  material of the layer, everywhere, forever.
 *
 *  SKY_STAIR is the top of the way down, and it exists on this layer for the
 *  same reason the shaft does NOT exist on the one below it — one entrance, one
 *  record. The difference is which end holds the record: a shaft is a stored
 *  edit and lives on the surface, while a sky-stair is GENERATED terrain sited
 *  by the seed, so both of its ends are generated and neither can drift. */
export const CLOUD: TileId = 22; // the floor of the sky, and all of it
export const SKY_STAIR: TileId = 23; // the head of the steps, seen from above
/** Where the cloud thins around a way down, and light comes up from the world
 *  below. It behaves EXACTLY like cloud — same nothing, same walkability — and
 *  exists only so the exit is a place you can see from across a field rather
 *  than a three-tile speck on an unbounded plain (sim/found.ts §SKY_PARTING). */
export const CLOUD_THIN: TileId = 24;

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
  // The colours here are pale pine's, and they are a FALLBACK rather than the
  // truth: a laid floor carries its own finish (world.finishes) and the
  // renderer paints from that. These are what a floor looks like when no
  // finish is recorded, which after the v27 migration means one that somehow
  // escaped the backfill. Keeping them in step with `pine` in content/skins.ts
  // means that case is invisible instead of magenta.
  [FLOOR]: {
    id: FLOOR,
    name: "Floor",
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
  [POLE]: {
    id: POLE,
    // Named for what it is rather than what it implies. "Fishing rod" would be
    // the game explaining the joke, and there are no fish.
    name: "Pole",
    color: "#8a6b45",
    top: "#9b7a50",
    shade: "#6f5537",
    solid: true,
  },
  [MAILBOX]: {
    id: MAILBOX,
    name: "Mailbox",
    color: "#7d8a94",
    top: "#8c99a3",
    shade: "#65707a",
    solid: true,
  },
  [STAIR]: {
    id: STAIR,
    name: "Steps",
    // The plaza's stone, deliberately: whoever built these had the same rock the
    // town is paved with, which is the detail that makes them unsettling rather
    // than magical.
    color: "#b8b2a6",
    top: "#c0bab0",
    shade: "#aaa498",
    solid: true,
  },
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
  [SAND]: {
    id: SAND,
    name: "Sand",
    // Warm and pale, and deliberately far enough from DIRT's brown that a beach
    // never reads as a strip somebody dug. It meets grass constantly, so the
    // bevel earns its keep here more than anywhere — this is the boundary the
    // per-cell rule's fix was written for (drawn only where the material ends).
    color: "#ddca97",
    top: "#e9d7a6",
    shade: "#c7b483",
    diggable: true,
    tillable: true,
  },
  [SHALLOW]: {
    id: SHALLOW,
    name: "Shallow water",
    // Flat, like WATER, and for the same reason: it animates its own ripple and
    // a bevel on every cell would band the surface (CLAUDE.md). Pale enough
    // against the deep blue that "I can wade here" is legible at a glance
    // WITHOUT a HUD ever saying so — the colour is the affordance.
    color: "#7cc3de",
    // NOT solid. That is the feature, and the thing every `solid` check nearby
    // has had to be taught about.
    //
    // Slow, though, and it is the only tile in the table that is. Crossing water
    // should be something you notice doing — the colour already says "you may
    // wade here", and this makes the wading itself legible without a word of UI.
    // 0.6 is a drag you feel on a two-tile stream and can't mistake for lag.
    speed: 0.6,
  },
  // --- The sky ---------------------------------------------------------------
  [CLOUD]: {
    id: CLOUD,
    name: "Cloud",
    // FLAT, no bevel, and this one is not a preference. Cloud is the one
    // material in the game that covers the entire visible screen with itself, so
    // a per-cell lip would band the whole layer into venetian blinds at the one
    // place there is nothing else on screen to look at instead (CLAUDE.md §the
    // per-cell edges band). What texture it has is drawn off the WORLD
    // coordinate by the renderer, so the drift runs unbroken across the cells.
    color: "#eef1f7",
    // Not diggable, not tillable, not solid, no speed. Every flag omitted, and
    // the omissions ARE the design: there is nothing to do to it.
  },
  [CLOUD_THIN]: {
    id: CLOUD_THIN,
    // Named for what it is. "Opening" or "Way down" would be the game telling
    // you what the gap is for, and the whole of finding it is walking over and
    // looking.
    name: "Thin cloud",
    // Bluer and a shade darker than CLOUD — the ground showing faintly through,
    // not a light. Flat, for the same reason cloud is: this is the one thing on
    // the layer with a shape, and a bevel on every cell of it would turn a soft
    // gap into a tiled disc.
    //
    // The first draft was #dfe6f2, a hair off the cloud, and it photographed as
    // nothing at all: the renderer's own drift texture varies the plane by more
    // than the parting did, so the one feature on the layer was quieter than its
    // noise. This is far enough down and blue enough to read as a gap while
    // still being cloud rather than a hole.
    color: "#c6d2e8",
  },
  [SKY_STAIR]: {
    id: SKY_STAIR,
    name: "Steps",
    // The same name and the same plaza stone as STAIR, because it is the same
    // flight of steps seen from the other end. A player who reads a tile name
    // out of a screenshot should learn nothing they could not have learned by
    // standing there.
    color: "#b8b2a6",
    top: "#c0bab0",
    shade: "#aaa498",
    // NOT solid — stepping onto it is how you use it, exactly like SHAFT. The
    // 7b steps on the ground stay solid; the difference between a flight you
    // can climb and one you cannot is the entire secret, and it lives here.
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
