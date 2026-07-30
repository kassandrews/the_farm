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
  /** The crown's SILHOUETTE: half-widths in pixels, one per row, top row first.
   *
   *  Colour alone wasn't enough. With one shape everywhere, the pines were "a
   *  dark meadow" rather than a pine wood — the eye reads outline before it reads
   *  hue, and at this size the outline is most of what a tree IS.
   *
   *  Half-widths because the crown is drawn symmetrically as integer rects: row
   *  `r` becomes one fillRect `rows[r]` wide either side of the trunk. That keeps
   *  every tree on the pixel grid without a single scale() (CLAUDE.md §Sprite
   *  rendering) and makes a new shape a row of numbers instead of a draw path.
   *
   *  LENGTH IS HEIGHT. The renderer derives the sprite's height from this array,
   *  so a taller tree is a longer list — which is also how far it reaches to
   *  occlude the player, and it stays correct automatically. 7 is about a tile
   *  wide; past 8 the crown starts overhanging its neighbours, which broadleaves
   *  are allowed to do and conifers are not. */
  crownRows: number[];
}

/** The ordinary broadleaf, and the shape the game has always drawn.
 *
 *  Exported because the GROVE uses it too: her trees are the dark wood in this
 *  same silhouette, so a stand of them reads as trees that are wrong rather than
 *  as a different plant. It is also the meadow's, which is what keeps the town
 *  looking exactly as it did. */
export const BROADLEAF = [3, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 2];

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
    crownRows: BROADLEAF,
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
    // A conifer: narrow, tall, and TIERED rather than smoothly tapered. The
    // step-backs every third row are the whole trick — a clean triangle reads as
    // an arrowhead, and the little shelves are what say "branches" at 1px.
    crownRows: [1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 5, 6, 7, 6],
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
    // Small and high. A short crown on the same 10px trunk leaves more pale bark
    // showing, which is what makes a birch read as slender — the shape does the
    // work the trunk tint can only half do.
    crownRows: [2, 4, 5, 6, 6, 6, 5, 5, 4, 3, 2],
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
    // 5, not the 3.5 this was tuned to by eye, and the extra is not a change of
    // mind about how rocky the scrub is — it is compensation, measured rather than
    // guessed. Rocks may no longer share an edge (sim/world.ts §rockIsLoneliest),
    // and the scrub is the only region dense enough for that to take a real bite:
    // at 3.5 it lost 23% of its rocks, because it was where nearly all the
    // touching pairs were. 5 puts the COUNT back (12,999 against 13,004 over five
    // seeds and 194k tiles each) without putting the pairs back — the region is as
    // rocky as it looked before by the measure that matters, which is how many
    // rocks are on screen. No other region moved by more than 7%, so no other
    // number in this file needed touching.
    rocks: 5,
    mushrooms: 0,
    water: 0,
    ground: { color: "#c2bd86", amount: 0.5 }, // bleached
    tuft: { color: "#b3ad76", amount: 0.5 },
    crown: { color: "#8a9152", amount: 0.35 },
    trunk: { color: "#7a6248", amount: 0.3 },
    // Squat and wind-flattened: wide, low, and wider at the shoulders than at the
    // crown. Barely taller than the rocks it stands among, which is the point.
    crownRows: [2, 4, 5, 5, 6, 5, 5, 4, 3],
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
    // Weeping: broad at the top and narrowing all the way down, so the mass hangs
    // rather than sits. The tallest crown in the table — a fen tree leans over
    // the water it grew out of.
    crownRows: [4, 6, 7, 7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2],
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
    // Round and overfull, wider than anything else here. Cherry blossom's whole
    // character is too much of it at once.
    crownRows: [4, 6, 7, 8, 8, 8, 8, 7, 7, 6, 5, 4, 3, 2],
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
