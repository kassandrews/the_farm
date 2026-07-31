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

export type BiomeId =
  | "meadow"
  | "pinewood"
  | "birch"
  | "scrub"
  | "fen"
  | "blossom"
  // The far country — commoner the farther from the datum you are, impossible
  // near town. See FIELD_WEIGHTS at the foot of this file.
  | "dusk"
  | "glimmer"
  | "glass";

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

  /** Optional, per row: how far the foliage stays CLEAR of the trunk, as a
   *  half-width of empty centred on the trunk's own column. 0 (the default for
   *  every row of every biome that omits this) is the solid row described above.
   *  1 is the trunk exactly, and is usually what you want — the foliage should
   *  MEET the bark, not float a stripe of grass away from it.
   *
   *  This is what turns a blob into a bean. A real broad crown doesn't come to
   *  a point over the trunk — it hangs at the sides and lifts in the middle,
   *  and the underside is concave where the branches leave the trunk. With
   *  solid rows only, every tree here tapered to a tip on the way down, which
   *  is a shrub's outline and not a cherry's.
   *
   *  Only meaningful on the rows that OVERLAP the trunk: a gap up top would
   *  split one crown into two, which is a different tree rather than a dip, and
   *  a gap one row above the trunk punches a square of grass into the crown. */
  crownGaps?: number[];

  /** How many of the bottom crown rows sit ALONGSIDE the trunk instead of above
   *  it. Default 0 — the crown perches on top and the sprite is trunk + rows.
   *
   *  A dip is only a dip if you can see what it dips around, so a notched crown
   *  has to come down far enough that the trunk shows through the notch. It
   *  shortens the tree by the same amount it drops, and the renderer takes the
   *  height from the same sum, so occlusion stays honest. */
  crownOverlap?: number;
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

  // --- The far country (Phase 7a) ---------------------------------------------
  //
  // Three rows that are commoner the farther out you are, and impossible near
  // town (FIELD_WEIGHTS). Read them as a SEQUENCE of one idea getting louder —
  // the light is wrong, then the light is coming from the ground, then the light
  // is coming through everything — rather than as three unrelated places.
  //
  // Every one of them is a tint, a density and a silhouette, which is the whole
  // of what a biome is allowed to be (DESIGN.md §Biomes). They chop into `wood`.
  // Nothing out here is worth more than it is at home, and the entire reward for
  // the walk is that it looks like this.

  /** The mildest strangeness, and the first the world offers: an ordinary wood at
   *  the wrong hour. Nothing is shaped oddly — that is the point. The trees are
   *  the meadow's own broadleaf and the light is simply not the light you left. */
  dusk: {
    id: "dusk",
    name: "the dusk",
    trees: 1.3,
    rocks: 0.6,
    mushrooms: 0.05,
    water: 0,
    // Violet, and pulled hard, because a gentle version of this is just "evening"
    // and the game already has an evening. It has to be wrong at NOON.
    // MEASURED, not eyeballed. Grass is (139,191,90) and a tint is a lerp toward
    // the target, so a mid-violet at 0.55 lands on (112,134,107) — which is still
    // green, because green was 191 and had the furthest to fall. The first pass
    // shipped exactly that and photographed as "slightly murky meadow". The target
    // has to be darker than it looks and the amount high, or the ground stays the
    // colour it started.
    ground: { color: "#4a4570", amount: 0.85 },
    tuft: { color: "#7a76a8", amount: 0.8 }, // 0.6 left green flecks on violet ground
    crown: { color: "#2a2740", amount: 0.7 },
    trunk: { color: "#3a3348", amount: 0.45 },
    // The meadow's silhouette exactly. Colour carries this one alone, deliberately:
    // it is the shape you know, which is what makes the colour unsettling instead
    // of merely decorative.
    crownRows: BROADLEAF,
  },

  /** Light from the wrong direction. A dark canopy over a floor that glows —
   *  bioluminescent understory, built out of the mushroom density that already
   *  exists rather than out of a light source, which the flat renderer has no
   *  business growing for a repaint. */
  glimmer: {
    id: "glimmer",
    name: "the glimmer",
    trees: 1.6,
    rocks: 0.3,
    // THE FEN'S NUMBER EXACTLY, AND IT IS NOT ALLOWED TO BE HIGHER. The draft had
    // 0.4 — the mushrooms were going to BE the biome — and the test caught what
    // that actually is: a mushroom is a gathered material (`add(inventory,
    // "mushroom")`), so 3.3× the record makes foraging measurably better the
    // farther out you walk. Scrub's 5× rocks are fine because they are a LATERAL
    // choice: some direction, a hundred tiles. A density that climbs with radius
    // is a payout curve for distance, which is the one thing this phase refuses
    // (DESIGN.md §Biomes). Tied with the fen, never above it.
    //
    // So the glow is the TUFT, which is where it belonged anyway. The speckle is
    // on every cell of grass; the mushrooms were only ever going to be scattered
    // punctuation, and a floor that glows has to glow everywhere.
    mushrooms: 0.12,
    water: 0,
    ground: { color: "#1e5a72", amount: 0.8 },
    tuft: { color: "#7cf0dc", amount: 0.8 }, // the speckle is the glow
    crown: { color: "#16303a", amount: 0.75 }, // near-black, so the floor reads bright
    trunk: { color: "#243a42", amount: 0.5 },
    // Tall and close-topped: the canopy has to close over you or the floor has
    // nothing to be the brighter thing than.
    crownRows: [2, 4, 6, 7, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2],
  },

  /** The loudest, the rarest, and the end of the escalation: a wood the light
   *  goes THROUGH. Pale to the point of bleached, and thin enough to see a long
   *  way across, which is the opposite of every other far region and the reason
   *  it is worth arriving at last. */
  glass: {
    id: "glass",
    name: "the glass wood",
    trees: 0.9,
    rocks: 0.3,
    mushrooms: 0.03,
    water: 0,
    // A COLD FLOOR, NOT A PALE ONE, and the screenshot is why. Drafted pale
    // (#ccdcf0 at 0.8) the ground came out at (193,214,210) and the near-white
    // crowns at (223,234,242) — thirty levels apart, which at this size is
    // nothing. The wood lost its trees: bare grey trunks with a ghost over them,
    // and a tree here is SOLID, so an invisible one is something you walk into
    // rather than something that looks wrong.
    //
    // Green is the stubborn channel — grass is (139,191,90), so anything pale
    // keeps a high green and stays minty. This target is dark enough to drop the
    // value and blue enough that the result finally has b above g.
    ground: { color: "#7fa8c4", amount: 0.85 },
    tuft: { color: "#b9d6e8", amount: 0.8 }, // ditto: the speckle is the last thing to stop reading as grass
    // The palest crown in the table by a long way. Nearly white with a blue cast,
    // which at this size reads as translucent rather than as snow — snow would be
    // a season, and a season is not something a place gets to have on its own.
    crown: { color: "#dfeaf2", amount: 0.8 },
    trunk: { color: "#9fb6c6", amount: 0.6 },
    // Narrow, upright, and sparse-shouldered: closer to the birch than to anything
    // else here, because the one ordinary region it should remind you of is the
    // pale one. A far biome that recalls a near one is what keeps the drift
    // continuous.
    crownRows: [2, 3, 5, 5, 6, 6, 5, 5, 4, 3, 2],
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
    // Wider than anything else here, and BEAN-shaped rather than round: full
    // width held for most of the crown, then two lobes hanging down either side
    // of a dip over the trunk. Cherry blossom's character is too much of it at
    // once, and a real one carries that weight out sideways — the mass sits on
    // the branches, not on the tip of the trunk. The first draft tapered to a
    // 2px point at the bottom, which read as a bush.
    // Also the SHORTEST broadleaf here, which is half of how it reads wide: at
    // fourteen rows the same 16px of width came out as a tall pink box with a
    // slot cut in it. Wide is a ratio, not a number.
    crownRows: [4, 7, 8, 8, 8, 8, 8, 8, 8, 7, 6],
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    crownOverlap: 3,
  },
};

/** How likely each biome is to be rolled, NEAR the town and FAR from it.
 *
 *  Blossom is absent BY DESIGN — it is placed like a landmark, and a copy of it
 *  turning up in a random band would cost it the only thing that makes it worth
 *  the walk.
 *
 *  THE ORDER OF THIS TABLE IS LOAD-BEARING, and so are the `near` numbers. Until
 *  Phase 7a this was a flat array of six slots — meadow, meadow, pinewood, birch,
 *  scrub, fen — indexed by `floor(roll * 6)`. The `near` column reproduces that
 *  array exactly: the weights sum to 6, and cumulating them in this order puts
 *  each biome on precisely the span of the roll it used to own. That is not
 *  tidiness. Base terrain isn't stored, so a roll that answers differently
 *  re-landscapes every live save, and a re-rolled region changes TREE DENSITY,
 *  which is solidity — the failure is a tree standing inside a house somebody
 *  already built. `sim/biome.test.ts` re-implements the old formula and asserts
 *  the two agree, tile for tile, out to the ramp.
 *
 *  THE `far` COLUMN IS THE PHASE 7a RULE (DESIGN.md §Biomes): the world gets
 *  stranger the farther out you go. A region's weight is interpolated between
 *  these two columns by how far its site is from the plaza datum. It is a WEIGHT
 *  and never a gate — every ordinary biome keeps a real weight out there, so
 *  there is no wall you cross and no distance at which the familiar becomes
 *  impossible. Meadow at the plateau is 0.7 against a total of 6.4: uncommon,
 *  never gone.
 *
 *  What the strange rows do NOT have is a number the near ones lack. Same trees,
 *  same rocks, same mushrooms, same wood when you chop them. Distance changes the
 *  view, never what you may have. */
export interface FieldWeight {
  /** Weight at the datum and out to `STRANGE_FROM`. Sums to 6 across the table,
   *  in this order, because that is what makes it the old array. */
  near: number;
  /** Weight at `STRANGE_TO` and beyond — the plateau. */
  far: number;
}

export const FIELD_WEIGHTS: [BiomeId, FieldWeight][] = [
  // Ordinary ground stays the commonest single thing in the world even at the
  // plateau, which is the tuning knob for how strange the far country feels: a
  // world with no familiar ground in it has stopped having anywhere to be from.
  ["meadow", { near: 2, far: 0.7 }],
  ["pinewood", { near: 1, far: 0.4 }],
  ["birch", { near: 1, far: 0.4 }],
  ["scrub", { near: 1, far: 0.4 }],
  // The fen decays least of the four. It is already the odd one near town — murky,
  // mushroomy, standing water — so it is the hinge between the ordinary regions
  // and the strange ones, and the drift outward reads as continuous rather than as
  // one set of regions being swapped for another.
  ["fen", { near: 1, far: 0.5 }],
  // The strange three, in the order they take over. Dusk is the commonest because
  // it is the mildest — a familiar wood at the wrong hour — so the first thing the
  // far country says is "the light is off here", not "you are somewhere else".
  ["dusk", { near: 0, far: 1.6 }],
  ["glimmer", { near: 0, far: 1.4 }],
  // The rarest, because it is the loudest. Glass is the one you walk into and
  // stop, and a plateau made mostly of it would be wallpaper by the second one.
  ["glass", { near: 0, far: 1.0 }],
];

export function biomeDef(id: BiomeId): BiomeDef {
  return BIOMES[id];
}
