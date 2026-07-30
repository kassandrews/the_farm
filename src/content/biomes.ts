// Biomes — what a stretch of the world LOOKS like, and nothing else.
//
// Content is data (CLAUDE.md): a biome is a row here, not a code path. The field
// that decides which row a tile belongs to lives in sim/world.ts beside the
// grove and the warren, because it is terrain generation and it is a total
// function of (seed, x, y) exactly as those are.
//
// WHY THE WORLD NEEDED THESE. It is unbounded, and until now it was also
// uniform: grass, trees, rocks, forever, in one palette. That gave a player no
// way to say where they were and no reason to go anywhere. Biomes are the
// wayfinding system — you navigate by "out past the birches" the way you
// navigate anywhere real, which is why they are sized to be walked across
// rather than admired from a distance.
//
// THEY CHANGE NOTHING YOU GATHER. A cherry tree chops into `wood`. Not one
// number in this file touches a yield, a recipe or an unlock, and that is a
// design invariant wearing a different hat: a biome that gated a material would
// be a daily cap on building ("walk two hundred tiles or no pink house"), and
// there are no caps here. What a biome changes is colour and how thickly things
// grow — the reasons to walk somewhere are that it looks like somewhere, and
// that somebody asked to live there.
//
// EVERY COLOUR IS A TINT, NOT A VALUE. A biome never states a colour outright;
// it states a direction and how far to go. That is what lets biome and SEASON
// compose instead of fighting: autumn still turns the world, and the Fen is a
// murkier autumn while Blossom Rows stay stubbornly pink. Stating colours
// outright would have meant either losing the seasons out here or writing every
// biome four times, and the first draft of this file did the latter before the
// tint fell out of it. `amount` is where the argument lives — see Pinewood, which
// resists autumn hard on purpose because conifers do.

/** A pull toward a colour. `amount` is 0 (leave it alone) to 1 (become this). */
export interface Tint {
  color: string;
  amount: number;
}

export type BiomeId = "meadow" | "pinewood" | "birch" | "scrub" | "fen" | "blossom";

export interface BiomeDef {
  id: BiomeId;
  /** What a villager would call it. Used in dialogue, never in the HUD — a
   *  location label on screen is the debug-overlay instinct in a clean shirt,
   *  and the whole point is that PEOPLE name places. */
  name: string;

  // --- What grows, as multipliers on the base densities in content/nodes.ts ---
  /** Trees, ×NODES.tree.density. */
  trees: number;
  /** Rocks, ×NODES.rock.density. */
  rocks: number;
  /** Chance a bare cell carries a patch of mushrooms. */
  mushrooms: number;
  /** How wet it is — roughly the fraction of ground standing under water. Fen
   *  only, and low: water is solid, and a region you cannot cross is a wall
   *  rather than a place.
   *
   *  Read as PONDS, not as cells (see `inPond` in sim/world.ts). A per-cell roll
   *  put down lone bright squares instead of water. */
  water: number;

  // --- What it looks like -----------------------------------------------------
  /** The ground under everything. */
  ground: Tint;
  /** The grass speckle, which wants to travel with the ground or the texture
   *  detaches from the surface it is meant to be texture ON. */
  tuft: Tint;
  /** Tree crowns. The largest colour mass on screen, so this is the one that
   *  actually says which biome you are standing in. */
  crown: Tint;
  /** Trunks. Mostly left alone — except birch, which is nothing without it. */
  trunk: Tint;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  /** The ordinary, and the town's own. Every number here is identity — a 1× or a
   *  zero or an amount of 0 — which is not laziness but a PROMISE: the region
   *  containing the origin is always this one (see sim/world.ts), so a town that
   *  existed before biomes did generates exactly the terrain it always did.
   *  Change a number in this row and you re-landscape everybody's home. */
  meadow: {
    id: "meadow",
    name: "the meadow",
    trees: 1,
    rocks: 1,
    mushrooms: 0,
    water: 0,
    ground: { color: "#000000", amount: 0 },
    tuft: { color: "#000000", amount: 0 },
    crown: { color: "#000000", amount: 0 },
    trunk: { color: "#000000", amount: 0 },
  },

  /** Cold, close, and quiet. Densest trees in the game, which is most of the
   *  effect: you cannot see far in here, and that is the feeling. */
  pinewood: {
    id: "pinewood",
    name: "the pines",
    trees: 2.2,
    rocks: 0.5,
    mushrooms: 0.02,
    water: 0,
    ground: { color: "#7d8f5e", amount: 0.35 }, // needle-dulled turf
    tuft: { color: "#6d7f52", amount: 0.4 },
    // The hardest tint in the file, and the reason `amount` exists: at a gentler
    // pull the pines turned orange in October, which conifers do not do. High
    // enough that the season is a whisper here and a shout everywhere else.
    crown: { color: "#23402c", amount: 0.75 },
    trunk: { color: "#4a3324", amount: 0.3 },
  },

  /** Bright, thin, airy — the opposite of the pines, and deliberately adjacent
   *  to them in the table so the two get compared when either is edited. */
  birch: {
    id: "birch",
    name: "the birches",
    trees: 1.4,
    rocks: 0.4,
    mushrooms: 0.06,
    water: 0,
    ground: { color: "#a8c479", amount: 0.25 },
    tuft: { color: "#b9d18a", amount: 0.3 },
    // Gentle, so autumn lands here properly — birches turn, and turning is the
    // best thing they do.
    crown: { color: "#cfe08a", amount: 0.3 },
    trunk: { color: "#e6e2d8", amount: 0.85 }, // the whole point of a birch
  },

  /** Dry and open. Where the stone is, so it earns a walk without a single
   *  material being locked behind it: the rocks are the same rocks, there are
   *  just obviously more of them.
   *
   *  IT HAD A THIRD INGREDIENT AND THE SCREEN THREW IT OUT. Dry patches of bare
   *  ground, scattered by their own hash — first as STONE, which read as the
   *  plaza because it IS the plaza, then as DIRT. Both failed the same way: a
   *  lone recoloured cell on open turf is a hard-edged SQUARE, and a scatter of
   *  them tiles the ground into a checkerboard. That is the per-cell edges rule
   *  (CLAUDE.md) arriving by a new door — the surface stopped reading as a
   *  surface. Dryness is the tint's job, and the rocks say the rest. */
  scrub: {
    id: "scrub",
    name: "the scrub",
    trees: 0.25,
    rocks: 3.5,
    mushrooms: 0,
    water: 0,
    ground: { color: "#c2bd86", amount: 0.5 }, // bleached
    tuft: { color: "#b3ad76", amount: 0.5 },
    crown: { color: "#8a9152", amount: 0.35 },
    trunk: { color: "#7a6248", amount: 0.3 },
  },

  /** Low and murky. The only common biome that generates WATER, which is why its
   *  chance is small: water is solid, and a region you cannot cross is a wall
   *  rather than a place. */
  fen: {
    id: "fen",
    name: "the fen",
    trees: 0.8,
    rocks: 0.2,
    mushrooms: 0.12, // the mushroomiest place there is
    water: 0.06,
    // Pushed darker and browner than first drafted, for the reason autumn's
    // ground was: at #6f8a5e it was still plainly meadow-green beside the meadow
    // and the ponds were doing all the work alone. Settled on screen.
    ground: { color: "#5c7247", amount: 0.5 },
    tuft: { color: "#4e6440", amount: 0.5 },
    crown: { color: "#2f4a34", amount: 0.45 },
    trunk: { color: "#3d3226", amount: 0.35 },
  },

  /** The one you go and find. Not rolled from the field like the others — it is
   *  SITED, once per town, on its own bearing, exactly the way the grove and the
   *  cube are (sim/world.ts).
   *
   *  That asymmetry is the whole design. A region you happen into is scenery; a
   *  stand you went looking for is a destination. It is also the answer to "I
   *  want to live where the cherry trees are", and the thing an arrival can ask
   *  for by name. */
  blossom: {
    id: "blossom",
    name: "the blossom rows",
    trees: 2.6, // rows, close together
    rocks: 0.1,
    mushrooms: 0,
    water: 0,
    ground: { color: "#b9d180", amount: 0.2 },
    tuft: { color: "#cfe0a0", amount: 0.3 },
    crown: { color: "#e8a8c4", amount: 0.8 }, // pink, and unmistakably so
    trunk: { color: "#5a3a30", amount: 0.25 },
  },
};

/** The biomes the noise field may roll. Blossom is absent BY DESIGN — it is
 *  placed like a landmark, and a copy of it turning up in a random band would
 *  cost it the only thing that makes it worth the walk.
 *
 *  Meadow appears twice, which is the whole tuning knob for how strange the
 *  world feels: ordinary ground should be the commonest thing in it, or the
 *  distinctive regions stop being distinctive. */
export const FIELD_BIOMES: BiomeId[] = [
  "meadow",
  "meadow",
  "pinewood",
  "birch",
  "scrub",
  "fen",
];

export function biomeDef(id: BiomeId): BiomeDef {
  return BIOMES[id];
}
