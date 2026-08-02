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

import type { SeasonId } from "./seasons";

/** The marks a region's grass speckle is drawn from — the smallest content in
 *  the game and the one there is most of.
 *
 *  - `cluster` — three points around a gap. A plant seen from above.
 *  - `sprout`  — two leaves off a stem. The smallest mark that reads as foliage
 *                (content/nodes.ts found this first, for the pinewood's decor).
 *  - `blades`  — two uprights of unequal height. Equal ones read as a gate.
 *  - `dot`     — one pixel. What stops the others being a set.
 *
 *  WEIGHTS ARE REPETITION, not a second field. A region lists a shape twice to
 *  draw it twice as often, so the mix is legible in the row itself rather than
 *  in a table of numbers somewhere else that has to be kept in step with it.
 *
 *  Four shapes everywhere at equal odds was the first cut and it read as CHAOS —
 *  every cell a different plant is not a meadow, it is a seed catalogue. Two or
 *  three per region, and which two is most of what a region's floor says about
 *  it: the scrub has no sprouts because nothing is sprouting, the fen has no bare
 *  dots because everything there is growing. */
export type TuftShape = "cluster" | "sprout" | "blades" | "dot";

/** What grass is drawn from where a region hasn't said. Ordinary lawn. */
export const TUFTS_DEFAULT: TuftShape[] = ["cluster", "cluster", "blades"];

/** The silhouettes a region's stone is cut from. Named here, drawn in the
 *  renderer, exactly as the tuft marks are — a region says WHICH, the draw call
 *  knows what each one looks like.
 *
 *  - `boulder` — round, sat down in the grass. The ordinary stone.
 *  - `crag`    — narrower, and it stands up.
 *  - `broken`  — a flat stone that split, with the piece beside it.
 *  - `slab`    — low and wide, lying flat. Sunken country.
 *  - `shard`   — narrow, tall and stepped. Reads as something that grew rather
 *                than something that fell, which is why it belongs to the far
 *                country and nowhere near town.
 *
 *  Weights are repetition, same as `tufts`. */
export type StoneShape = "boulder" | "crag" | "broken" | "slab" | "shard";

/** What stone looks like where a region hasn't said: the original three, and
 *  untinted. This is what the meadow and the town get, and it is why walking
 *  home always looks like walking home. */
export const STONES_DEFAULT: StoneShape[] = ["boulder", "crag", "broken"];

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
  /** Undergrowth, ×NODES.shrub.density. Optional, and absent means NONE — the
   *  only node in the game that is off by default.
   *
   *  Rolled after the trees, so raising it thickens a region's undergrowth
   *  rather than thinning its canopy. It is a gathered node (two wood against a
   *  tree's eight), which makes it the one field here that touches yield at all
   *  — allowed only because wood is not scarce anywhere and four shrubs are
   *  four fellings against one. Keep it that way: this must never become a
   *  reason to walk somewhere, only a thing you find there. */
  shrubs?: number;
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
  /** Which marks that speckle is drawn from. Optional; TUFTS_DEFAULT otherwise.
   *  Takes the HARD region like a crown does — a shape cannot be blended, so a
   *  border dithers WHICH plant grows rather than smearing one into another. */
  tufts?: TuftShape[];
  /** Tree crowns. The largest colour mass on screen, so this is the one that
   *  actually says which biome you are standing in. */
  crown: Tint;
  /** Trunks. Mostly left alone — except birch, which is nothing without it. */
  trunk: Tint;

  /** How tall the bare trunk stands, in pixels. Optional; the renderer's TRUNK_H
   *  (10) otherwise, which is what every region but the birches uses.
   *
   *  HEIGHT IS A SPECIES TRAIT AND IT WAS ONLY HALF EXPRESSIBLE. `crownRows`
   *  already carried how tall the FOLIAGE is, so a taller tree could only be
   *  made by growing its crown — which is a bushier tree, not a taller one. A
   *  birch is tall the way a birch is: bare white stem for most of its height,
   *  with the leaves gathered near the top. That needs the trunk to move.
   *
   *  The renderer takes the sprite's height from this plus the crown, so
   *  occlusion stays honest for free. Keep it near 10: a trunk much longer
   *  leaves the crown floating above where the tile actually is. */
  trunkHeight?: number;

  /** Dark marks on the bark. Optional, and the birches are the only species so
   *  far that has any — every other trunk here is a plain three-pixel post.
   *
   *  WHAT IT IS FOR: a white trunk with nothing on it is a bollard. The dashes
   *  are what makes it read as a birch rather than as a painted pole, and they
   *  are the one detail of this tree everybody can name without being asked.
   *
   *  A grid per variant, three characters wide (the trunk's own columns) and read
   *  from the TOP of the trunk down; `x` is a mark, anything else is bark. Rows
   *  past the end of a grid are blank, so a grid written for one trunk height
   *  still works on a shorter one.
   *
   *  SEVERAL VARIANTS, PICKED BY THE TILE — the same argument as ROCK_SHAPES and
   *  the opposite of the orbs'. An orb arrangement repeats because three lights
   *  agreeing tree to tree reads as a species having a habit; bark does not have
   *  a habit, and one scar pattern down a whole stand reads as wallpaper the
   *  moment two trunks stand side by side. */
  bark?: {
    /** The mark colour by day. Darkened for night by the renderer. */
    color: string;
    marks: string[][];
  };

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

  /** Lights caught in the crown — the glimmer's, and nobody else's so far.
   *
   *  NOT FRUIT, AND THE DISTINCTION IS LOAD-BEARING. A biome changes appearance
   *  and never yield (see the header): a round pale thing hanging in a tree
   *  reads as pickable, and walking under it to find that ACT does nothing is a
   *  promise the game made and broke. Drawn as LIGHT — additive, white-cored,
   *  the same champagne as the region's sparks — it reads as the wood glowing,
   *  which is a thing you look at rather than a thing you reach for. Same reason
   *  the blossom rows get away with blossom.
   *
   *  `chance` is per TREE, off the tile's own hash, so a stand is mixed rather
   *  than uniformly lit and any given tree keeps its orbs when you walk away. */
  orbs?: {
    color: string;
    core?: string;
    /** Fraction of this region's trees carrying any. */
    chance: number;
    /** WHERE THEY HANG, as `[dx, row]` from the crown's own top-centre. One
     *  arrangement, used by every tree that has orbs — authored, not rolled.
     *
     *  THIS WAS A SCATTER TWICE AND BOTH TIMES IT LOOKED WRONG. First
     *  independent hashes, which clumped; then even angles around the crown with
     *  jitter inside each slice, which fixed the clumping and still read as
     *  unsettled. The lesson is that the problem was never the DISTRIBUTION —
     *  random-but-even is still random, and three lights whose relationship
     *  changes tree to tree give the eye a pattern to keep re-solving.
     *
     *  A composition is a thing you place. Same house style as ROCK_SHAPES and
     *  the decor `marks`: pixel art at this size is drawn, not generated. Trees
     *  repeating an arrangement reads as a species having a habit, which is what
     *  they are — while the hash still decides WHICH trees are lit, so a stand is
     *  mixed without any two lit trees disagreeing about where light sits. */
    spots: [number, number][];
    /** Seconds per breath. Optional; omitted, an orb is perfectly still.
     *
     *  A FIFTH of the swing the sparks get, and deliberately slower than nothing
     *  would be: a light sitting motionless in a canopy full of shimmering air
     *  reads as paint on the leaves. This is a light RESTING in a tree, not one
     *  catching a facet, so it wants to be noticed only if you look. */
    twinkle?: number;
  };

  /** What the stone here is made of, and what it was cut into.
   *
   *  THE LAST OBJECT STATING ITS COLOUR OUTRIGHT. Crowns, trunks, tufts and
   *  mushroom caps all take the region; a rock was `#8d8a84` everywhere, so the
   *  glimmer's teal floor had one warm grey thing lying on it — the identical
   *  complaint that got the mushrooms recoloured, and less obvious only because
   *  there is about one stone a screen out there rather than a scatter.
   *
   *  A TINT AND A SHAPE LIST, NOT A PALETTE. The stone keeps its day and night
   *  greys and its lit and shaded rows; the region pulls all three the same
   *  direction, so nothing here has to restate the lighting to change the colour.
   *
   *  Stone is still stone: this is weathering and what the ground broke into, not
   *  a different material. It gathers into `stone` wherever it stands, and a
   *  region that wanted its own mineral would be the yield promise broken exactly
   *  as a puffball mushroom would break it. */
  stone?: {
    tint?: Tint;
    shapes?: StoneShape[];
    /** A facet catching the light: one pixel, on the stone's lit shoulder.
     *
     *  IT CATCHES, IT DOES NOT EMIT, and that is the line this region has been
     *  drawing all along. A spark, an orb and a firefly are SOURCES — additive,
     *  white-cored, brighter than the palette. A rock is an OBJECT. So this is a
     *  highlight in the region's own warm colour rather than a light with a hot
     *  centre, and it breathes at a third of what the orbs do: the stone is not
     *  doing anything, the air around it is.
     *
     *  Affordable here for a reason that would not hold anywhere else in the
     *  region — there is about ONE ROCK A SCREEN in the glimmer, so a mark on
     *  every one of them still lands rarely. The same idea on the tuft, at a
     *  third of all cells, is what "competing instead of coalescing" meant. */
    glint?: { color: string; twinkle?: number };
  };

  /** The cap colour where this region's mushrooms come up. Optional; the default
   *  red lives in the renderer and is what every other region gets.
   *
   *  A TINT AND NOT A SPECIES. Same silhouette everywhere — cap, overhang,
   *  gills, stalk — because a mushroom is gatherable and yields `mushroom`. A
   *  different SHAPE would say "different thing" and hand back the same item,
   *  which is the yield promise broken in a subtler way than a locked material.
   *  Recoloured, it reads as the same mushroom standing in this wood's light. */
  mushroomCap?: { cap: string; lit: string; gills: string };

  /** What else grows here. Optional, and the meadow deliberately has none. */
  decor?: DecorKit;

  /** A SECOND kit, for something that comes and goes. Same shape as `decor` and
   *  drawn the same way, on its own hashes so a bloom never lands where the
   *  year-round marks stand.
   *
   *  Two slots rather than a list, because every region that has both uses them
   *  for exactly these two things: what is always here, and what is here now. A
   *  list would invite a third and a fourth, and the ground has room for about
   *  two kinds of small thing before it stops reading as ground. */
  bloom?: DecorKit;

  /** What drifts in the air here. Optional, and MOST REGIONS HAVE NONE — see
   *  MoteKit. */
  motes?: MoteKit;
}

/** Something drifting in the air over a region — petals, spores, seed fluff.
 *
 *  MOST REGIONS GET NONE, AND THAT IS THE POINT. Air that moves everywhere is
 *  air nobody notices; it is worth having only where arriving somewhere should
 *  feel like arriving. The two that have it are both places you walk to on
 *  purpose. Restraint here is the same call §Biomes makes about scatter — a
 *  texture in every region is a texture in no region.
 *
 *  WHAT IT MAY NOT BE. Nothing you can DO anything to — see DESIGN §"Living
 *  light, and the animals that stay out". A firefly's flash is allowed because
 *  it is light: nothing catches it, counts it, or waits for it. A creature with
 *  a sprite, a schedule or a footprint is a resident, and residents live in
 *  town. And nothing that accumulates: `content/seasons.ts` refuses
 *  weather in writing because snow that MELTED would be the first weather with
 *  state. A mote is a total function of (cell, clock) and stores nothing, which
 *  is the water ripple's trick one axis up — so mist and rain are still out, and
 *  a petal is not.
 *
 *  IT IS AIR, NOT ALTITUDE. DESIGN §Structures forbids anything you can see
 *  hovering over a ground tile, and means a HEIGHT — a thing at a level you
 *  could occupy, which is a second storey by implication. The test to apply is
 *  "could you imagine standing on it, or walking under it?" A speck of pollen
 *  fails that test, which is what makes it allowed. */
export interface MoteKit {
  /** Fraction of visible cells carrying one. Very low on purpose: a screen holds
   *  a few hundred cells, and a dozen specks is atmosphere while fifty is
   *  static. */
  density: number;
  color: string;
  /** Pixels travelled vertically over one cycle. NEGATIVE FALLS — a petal comes
   *  down and a spore goes up, and which way a region's air moves is most of its
   *  character. */
  drift: number;
  /** How far it swings sideways on the way. */
  sway: number;
  /** Seconds for one cycle. Slow: anything brisk reads as an insect, and there
   *  are no insects. */
  period: number;
  /** Pixels square. 1 unless the thing is meant to be seen individually. */
  size?: number;

  /** The hot centre of a light, drawn through the additive pass inside the arms
   *  or body that `color` provides. Used by `flash` and by `spark` — anything
   *  that is a SOURCE rather than an object.
   *
   *  Two inks because a firefly is a SOURCE, and ROADMAP's lamp rule applies:
   *  "a source must be the brightest thing in its own light." One flat dot,
   *  however bright the hex, reads as paint; a near-white core sitting in a
   *  coloured glow reads as something switched on. */
  core?: string;

  /** How it is drawn. `dot` (the default) is a square — a petal, a seed.
   *
   *  `spark` is a four-armed burst whose arms grow and shrink over the cycle,
   *  which is how you twinkle without rotating anything: a pixel-art mote may
   *  never be turned by `ctx.rotate` (CLAUDE.md §Sprite rendering resamples it
   *  off the grid), so the glitter has to come from the SHAPE changing rather
   *  than from the thing spinning. Same trick as the tuft's three silhouettes. */
  shape?: "dot" | "spark";

  /** Blink instead of fading in and out. A firefly is dark most of the time and
   *  briefly not; a smooth fade reads as a floating lamp. */
  flash?: boolean;

  /** Seconds per GLINT — a fast flicker multiplied over the slow cycle above.
   *
   *  Two clocks on purpose, because they are two different things happening. The
   *  mote's fade-in and fade-out belong to `period`: that is the thing being born
   *  at the bottom of its drift and gone at the top, and it has to stay slow or
   *  the spore stops rising and starts darting. The glint is not the spore
   *  moving at all — it is light catching on a face of it — so it may be as quick
   *  as it likes without breaking §"anything brisk reads as an insect". That rule
   *  is about BODIES. Nothing here travels any faster than it did.
   *
   *  Tied to `period` instead, glitter is unbuildable: the glimmer's spores rise
   *  over eleven seconds, so one twinkle per cycle is one twinkle every eleven
   *  seconds, and shortening the period to fix it fires the spore up through the
   *  canopy like a spark off a fire. */
  twinkle?: number;

  /** Only in the EVENING — the dusk hour and the night, and never the dawn.
   *
   *  A phase rather than a brightness, and that is the whole reason this field is
   *  not called `night`. Darkness cannot express "evening": `tintAt` gives dusk
   *  0.18, night 0.5 and dawn 0.34, so every threshold that admits the dusk hour
   *  admits the dawn one too, and the first two versions of this were a number
   *  fighting a table it was written nowhere near. Fireflies are a thing that
   *  happens as the light goes, not as it comes back.
   *
   *  The DUSK region deliberately omits this. Its whole premise is that its light
   *  is wrong at noon, so fireflies over it at midday are the point rather than a
   *  mistake — everywhere else they are an evening. */
  evening?: boolean;

  /** Only in this season.
   *
   *  Allowed because a season reaches appearance and never a number (DESIGN
   *  §Materials): a firefly is weather and light, which is exactly what §Seasons
   *  says a season IS. It may never become the model for anything with a value
   *  on it — no seasonal yield, no seasonal price, no seasonal growth time.
   *
   *  It is also what lets the near regions have air at all without the world
   *  becoming busy: the meadow and the pines are empty for nine months and on a
   *  summer night they are not. */
  season?: SeasonId;
}

/** A region's ground decor — its ferns, reeds, litter and small flowers.
 *
 *  IT IS NOT A TILE, AND THAT IS THE WHOLE DESIGN. A tile is exclusive per cell,
 *  so a fern would compete with the trees for ground and could never stand under
 *  one; it would also need a solidity, a walkability, a `groundIdOf` entry and a
 *  place in the flat-fill, and the last of those has produced a square painted
 *  across a cell three times now (the poles, the mailbox, the junk pile). Decor
 *  is drawn the way the grass tuft is drawn: a mark placed by a hash on the world
 *  coordinate, owning nothing, stored nowhere, blocking no one.
 *
 *  IT IS ALSO WHY THE KITS CAN BE EXTRAVAGANT. DESIGN §Biomes: the test is "can
 *  you carry it home?" Nothing here can be, so none of it is worth anything, and
 *  a region may have as much of its own as it likes. The gathered scatter is the
 *  mushroom and it stays where it is, on its own density rule. */
export interface DecorKit {
  /** The eye of a flower — the ink for `*` in a mark.
   *
   *  A THIRD INK, and the smallest thing that turns a shape into a flower. With
   *  two, a bloom is a coloured blob on a stalk; the centre is what says the
   *  petals are arranged AROUND something, and at three pixels wide that
   *  arrangement is the entire drawing. */
  core?: string;
  /** Only during this season. Optional; omitted, it grows all year.
   *
   *  The same field `MoteKit` has and for the same reason: a season reaches
   *  APPEARANCE and never a number (DESIGN §Materials), so a thing that is only
   *  there for three months is allowed exactly as long as nothing counts it,
   *  picks it or waits for it. Decor is drawn and nothing else — it has no tile,
   *  no solidity and no yield — which is what makes this the cheapest true
   *  seasonal event in the game.
   *
   *  WHY IT EXISTS AT ALL: spring was the only season with no signature. Summer
   *  has fireflies, autumn has the largest crown swing in `seasons.ts`, winter
   *  has bare branch-coloured crowns, and spring was a slightly different green.
   *  A season you cannot see from the ground is a season that only the palette
   *  knows about. */
  season?: SeasonId;
  /** Fraction of open grass carrying a mark. Read against the tuft's own 38%:
   *  this is the layer ON TOP of that, so it wants to be a good deal sparser or
   *  the ground stops being ground and becomes pattern. */
  density: number;
  /** The ink for `o` cells — a flower head, a berry, a pale stone. Left out when
   *  a kit is all stem. Unlike `x` it does NOT travel with the season: a marsh
   *  reed browns with the turf, and a white flower is white in October. */
  accent?: string;
  /** The marks themselves, one string per row, top row first. `.` is empty, `x`
   *  takes the region's tuft colour, `o` takes `accent`.
   *
   *  MORE THAN ONE, ALWAYS — 8c's finding, and it is the reason this is a list
   *  rather than a shape: the eye finds a repeated glyph long before it notices
   *  that the placement underneath is random, so a single mark scattered
   *  perfectly randomly still reads as a printed repeat.
   *
   *  Keep them small. The renderer insets a mark by a pixel inside its own cell,
   *  so anything up to about 5×5 is guaranteed a clear pixel on every side and
   *  can never touch its neighbour — which is the band rule (CLAUDE.md), and the
   *  reason 8c held every tuft shape inside the 2px the first one occupied. */
  marks: string[][];
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
  // NO `stone` ROW, deliberately: the meadow keeps the default grey and the
  // original three silhouettes, so the ground you already know looks exactly as
  // it did. Every other region is a departure FROM this one, and a departure
  // needs somewhere to depart from.
  meadow: {
    id: "meadow",
    name: "the meadow",
    trees: 1,
    rocks: 1,
    mushrooms: 0,
    water: 0,
    ground: { color: "#000000", amount: 0 },
    tuft: { color: "#000000", amount: 0 },
    // Ordinary lawn, and the town's own. Nothing to say about itself.
    tufts: ["cluster", "cluster", "blades"],
    crown: { color: "#000000", amount: 0 },
    trunk: { color: "#000000", amount: 0 },
    crownRows: BROADLEAF,
    // THE ONE THING THE TOWN'S OWN REGION GETS, and it is worth the exception it
    // makes. The meadow has no decor on purpose — leaving town is when the ground
    // starts having things in it — but a summer night over your own plot is the
    // beat this whole pass was for, and it costs the promise above nothing:
    // motes are render-only, so nothing here can re-landscape anybody's home.
    //
    // Empty for nine months. That is what keeps "most regions have no air" true
    // in the way that matters, which is most of the time rather than most of the
    // table.
    motes: {
      density: 0.028,
      // HOTTER THAN THE PALETTE, on purpose. Every other colour in this file is
      // soft because it is a surface; a firefly is a light, and a light that
      // sits politely inside the game's range reads as a pale speck on the
      // grass — which is what these were. The core is flat white and the body is
      // a yellow with nothing left in the red, so the additive pass clips the
      // middle to white and leaves the hue only at the rim.
      color: "#fff04a",
      core: "#ffffff",
      // BARELY MOVING. A firefly that travels reads as a spark blowing past; one
      // that hangs and swells reads as a firefly. The drift is a tile and a bit
      // over six seconds, which at this size is a slow lift rather than a path.
      drift: 3,
      sway: 1,
      period: 6,
      size: 2,
      flash: true,
      evening: true,
      season: "summer",
    },
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
    // A needle floor. Blades and litter, and NO sprouts: nothing much
        // germinates under a closed conifer canopy, which is the same fact the
        // sparse decor density below is already about.
    tufts: ["blades", "dot", "dot"],
    // The hardest tint in the file, and the reason `amount` exists: at a gentler
    // pull the pines turned orange in October, which conifers do not do. High
    // enough that the season is a whisper here and a shout everywhere else.
    crown: { color: "#23402c", amount: 0.75 },
    trunk: { color: "#4a3324", amount: 0.3 },
    // Damp and mossed over, the way stone goes under a canopy that never lets
        // it dry. Rounded shapes only — nothing sharp survives that long in shade.
    stone: { tint: { color: "#4c5a4a", amount: 0.26 }, shapes: ["boulder", "boulder", "broken"] },
    // A conifer: narrow, tall, and TIERED rather than smoothly tapered. The
    // step-backs every third row are the whole trick — a clean triangle reads as
    // an arrowhead, and the little shelves are what say "branches" at 1px.
    crownRows: [1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 5, 6, 7, 6],
    // WOOD ANEMONES, and they are the reason this field exists in a shaded
    // region at all: the flowers that bloom under conifers do it in the weeks
    // before the canopy closes, which is exactly a spring event and nothing else.
    // LUPINE, which really is a pine-barren plant: Lupinus perennis wants acid,
    // sandy, half-shaded ground, and that is this row's soil described exactly.
    //
    // A SPIKE, NOT A FLOWER. Everything else that blooms in this file is a head
    // on a stalk, so the lupine earns its place by silhouette rather than by
    // colour — five rows of alternating pairs climbing a stem, which reads as a
    // raceme at a glance and reads as nothing else. That matters more here than
    // hue does: lavender on mid green is only about 1.2:1, so if this had to win
    // on contrast it would lose. It wins on shape.
    //
    // The pale tip is the eye ink doing a second job — a raceme opens from the
    // bottom, so the top of a real one is always the lighter, newer buds.
    bloom: {
      season: "spring",
      density: 0.06,
      accent: "#a08ad0",
      core: "#cfc2ec",
      // Stacked whorls, not alternating pairs. Offsetting left/right down the
      // stem looked like a raceme in the table and rendered as a ZIGZAG — a
      // staircase reads as one wandering line, where a spike has to read as
      // several small flowers sharing an axis. Three wide, pinched every other
      // row, so the stem stays visible through it.
      // A CONE. Stacked whorls of even width came out an I-beam — solid, blocky,
      // and as much a little figure as a plant. A raceme is widest at the bottom
      // and unopened at the top, because it flowers from the ground up; drawing
      // that taper is what finally made it read as one spike of many flowers
      // rather than as an object standing there.
      // A V OF SEPARATE DOTS, opening up off the stem.
      //
      // GAPS ARE THE WHOLE TRICK. Four solid attempts failed the same way — a
      // zigzag, an I-beam, a cone, a slim column — and they failed because each
      // was one MASS. A raceme is several flowers sharing an axis, and at this
      // size the only way to say "several" is to not join them: separate dots
      // read as separate blooms where any connected shape reads as one object.
      //
      // Then the arrangement. One diagonal reads as a spike leaning, which is a
      // lupine that has fallen over; an arch (widest at the bottom) is botanically
      // the right way round for a raceme and renders as a little fountain. The V
      // is the one that reads as a plant at a glance, and five dots rather than
      // three is what keeps it a V instead of resolving into a Y.
      //
      // Pale at the OUTER tips, and that is the true bit as well as the prettier
      // one: a raceme's newest buds are its furthest out, so the light pixels are
      // where the light pixels belong.
      marks: [
        ["*...*", ".o.o.", "..o..", "..x..", "..x.."],
        ["*...*", ".o.o.", "..o..", "..x..", "..x.."],
      ],
    },
    // Fewer than the meadow's: this canopy closes over you, and a wood you
    // cannot see far in should not be the one with the most light in it.
    motes: {
      density: 0.018,
      color: "#fff04a",
      core: "#ffffff",
      drift: 3,
      sway: 1,
      period: 7,
      size: 2,
      flash: true,
      evening: true,
      season: "summer",
    },
    // Needle litter and the odd fern, which is what a conifer floor actually
    // is. Sparse: the pines are already the densest trees in the game and the
    // ground here is mostly in shade.
    decor: {
      density: 0.09,
      marks: [
        ["x..", ".x.", "..x"], // a fallen needle
        ["..x", ".x.", "x.."], // and one the other way
        // A SPROUT, NOT A PLUS. `.x.`/`xxx`/`.x.` was the obvious 3×3 fern and
        // it draws a cross — which at this size reads as a sparkle sitting on
        // the lawn, not as a plant growing out of it. Two leaves off a stem is
        // the smallest mark that reads as foliage.
        ["x.x", ".x.", ".x."],
      ],
    },
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
    // AIRY IS THE GROUND'S JOB, NOT THE CROWN'S — measured, after trying it the
    // other way. Lifting the crown to meet the meadow's green did make the
    // region brighter, and it cost the trees their silhouette: crown (129,168,98)
    // against ground (138,177,94) is a wood you cannot see the trees in. So the
    // pale goes underneath, hard enough to actually arrive (0.25 of a target
    // this close to the base moved the ground by four points out of 255), and
    // the crowns stay a clear step below it.
    ground: { color: "#b4cd82", amount: 0.55 },
    tuft: { color: "#c3d894", amount: 0.5 },
    // Thin and airy, so the light reaches the floor and things grow in it.
        // Sprouts and clusters, no bare dots.
    tufts: ["sprout", "cluster", "cluster"],
    // Gentle, so autumn lands here properly — birches turn, and turning is the
    // best thing they do.
    crown: { color: "#cfe08a", amount: 0.35 },
    // The whole point of a birch — and it took two goes. At 0.85 of #e6e2d8 the
    // pull lands halfway out of the base brown and the trunk renders GREY: a
    // concrete bollard with a crown on it, obvious at swatch size and invisible
    // in the numbers. Bark is nearly white or it is not bark.
    trunk: { color: "#f4f1e6", amount: 0.94 },
    // Three pixels taller than everything else in the world, which is the whole
    // difference between a tree that is tall and a tree that is big. The crown
    // below got NARROWER at the same time; growing one without the other just
    // makes a lollipop on a longer stick.
    trunkHeight: 13,
    // The dashes. Charcoal rather than black — a true black mark on a near-white
    // trunk is a hole punched through the tree, and at this scale the eye reads
    // the hole before it reads the bark.
    //
    // Read from the top of the trunk down, so the marks gather where the crown
    // hangs and the stem is plainer near the ground — which is the right way
    // round for a birch, whose lower bark is the smoothest part of it.
    bark: {
      color: "#4a443c",
      marks: [
        ["...", "xx.", "...", "...", "..x", "...", ".x.", "...", "...", "..."],
        ["..x", "...", ".xx", "...", "...", "x..", "...", "...", ".x.", "..."],
        [".x.", "...", "...", "xx.", "...", "...", "..x", "...", "...", "..."],
      ],
    },
    // Pale, and mostly whole. The lightest stone in the game, which is the same
        // note the trunks and the ground are already singing.
    stone: { tint: { color: "#cfd2c4", amount: 0.22 }, shapes: ["boulder", "broken"] },
    // NARROW, TALL, AND LUMPY — three separate things, and the shape only works
    // with all three.
    //
    // Narrow: 11px across where it used to be 13, on a trunk three pixels
    // longer. Slenderness is a RATIO, and the old crown was as wide as it was
    // because every region's was; against the pines it read as "a paler tree",
    // never as a different build of tree.
    //
    // Tall: it widens on the way DOWN rather than being a symmetric blob. A
    // birch's leading shoot is a whip — the top of one comes to a point, and the
    // mass is in the lower half of the crown.
    //
    // Lumpy: the widths step in and out by a pixel instead of running smoothly,
    // so the outline scallops. That is the "puffy" — foliage arrives in clumps,
    // and a crown whose edge is a clean curve is a balloon. The wobble is SLOW
    // (a step, then a hold) because alternating every row reads as a zigzag,
    // which is a texture rather than a shape.
    //
    // AND IT IS AN EGG, NOT A CONE, which is the correction that cost a go. The
    // first version widened all the way down — which is the PINE's silhouette
    // four rows up in this file, and a narrow white-trunked spruce is what it
    // came out as. A birch is broadest around its shoulders and its lowest
    // branches are the SHORTEST; the outline has to come back in at the bottom
    // or the species reads as a conifer no matter what colour the bark is.
    //
    // SIXTEEN ROWS ACROSS ELEVEN PIXELS, and the count is doing as much as the
    // widths. At fourteen the crown came out round — a ball on a stick, which is
    // the shape a child draws and the one this was meant to stop being. Taller
    // than it is wide is the entire brief.
    crownRows: [1, 3, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 3, 3, 2, 2],
    // The bottom three rows come down BESIDE the trunk and part around it, so a
    // stripe of white bark stands inside the foliage. It is the cheapest thing
    // on this tree and does the most: bark showing through leaves is most of
    // what tells you a wood is birch from a distance.
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    crownOverlap: 4,
    // Thin pale grass and small white flowers — the airy opposite of the pines,
    // and the reason the two rows sit next to each other.
    // ITS FLOWERS MOVED TO SPRING, and what is left all year is grass. The white
    // heads used to stand here in December, which is the one month a birch wood
    // is unmistakably bare — a region cannot be "the airy one" in every season by
    // wearing the same flowers through all four of them.
    decor: {
      density: 0.13,
      marks: [
        ["..x", ".x.", "x.."],
        [".x.", ".x.", "x.."],
        ["x..", ".x.", ".x."],
      ],
    },
    // WOOD ANEMONE — Anemone nemorosa, which carpets birch and other broadleaf
    // woods for a few weeks each spring and is gone by the time the canopy
    // closes. The four-petal flower with an eye was built for the pines and lands
    // here instead, on the plant's own authority: a conifer floor is the one
    // place this species does not grow.
    //
    // Denser than the rest, because a carpet is what it does.
    bloom: {
      season: "spring",
      density: 0.15,
      accent: "#f4f2ea",
      core: "#e8c25a",
      marks: [
        [".o.", "o*o", ".o.", ".x."],
        [".o.", "o*o", ".o.", ".x.", ".x."],
      ],
    },
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
    // BLEACHED HAS TO OUT-DRY THE BIRCHES, which is a comparison this row could
    // not make until the birch ground was lifted: at 0.5 of #c2bd86 the scrub
    // measured (154,175,103) against the birches' (149,183,103) — the same wash,
    // eight points of green apart, on the two regions that are meant to be the
    // driest and the freshest thing in the game. The extra pull is all hue: the
    // green leaves and the yellow stays, so this reads parched next to a wood
    // rather than merely lighter than one.
    ground: { color: "#cbc47e", amount: 0.66 },
    tuft: { color: "#bcb26c", amount: 0.6 },
    // PARCHED, and the shape list says so more plainly than the tint does:
        // dry blades and grit, and not one sprout. Nothing here is sprouting.
    tufts: ["blades", "dot", "dot", "dot"],
    crown: { color: "#8a9152", amount: 0.35 },
    trunk: { color: "#7a6248", amount: 0.3 },
    // SUN-BLEACHED AND BROKEN UP, and the region with by far the most of it —
        // seventeen stones a screen against everywhere else's one or two, so this is
        // the one row where the shape list does real work. All three of the dry
        // silhouettes and none of the round one: this ground cracked, it did not
        // wear.
    stone: { tint: { color: "#c9b98c", amount: 0.3 }, shapes: ["crag", "broken", "broken", "slab"] },
    // Squat and wind-flattened: wide, low, and wider at the shoulders than at the
    // crown. Barely taller than the rocks it stands among, which is the point.
    crownRows: [2, 4, 5, 5, 6, 5, 5, 4, 3],
    // THE PARCHED ROW FLOWERS, and it is the best beat this field buys. The scrub
    // is written everywhere else as dry — no sprouts in its tuft list, grit in
    // its decor, bleached in every tint — so three months of small hard yellow
    // is the exception that makes the other nine months mean something. Dry
    // country blooms harder and briefer than green country, which is the whole
    // THISTLE, and it frees the yellow for the fen. A dry, stony, overgrazed
    // opening is where thistles win, so this is the scrub's plant on the same
    // grounds the marigold is the fen's.
    //
    // Read from the TOP DOWN, which is how a thistle is built and why it works at
    // this size: a splayed tuft, a tighter head under it, then a long bare stem.
    // Nothing else in the file is tall and empty in its lower half, so a thistle
    // is recognisable here even where its colour is not — which matters, since
    // the scrub is the one ground that fights every bloom it is given.
    bloom: {
      season: "spring",
      density: 0.1,
      accent: "#c479ae",
      core: "#e4a6d2",
      marks: [
        ["o.o", ".*.", ".o.", ".x.", ".x."],
        ["o.o", "o*o", ".o.", ".x.", ".x."],
      ],
    },
    // Dry twigs and pale grit. No flowers: this is the row that reads as
    // parched, and a bloom would undo it.
    decor: {
      density: 0.10,
      accent: "#c2b795",
      marks: [
        ["oo", "oo"], // a pebble
        ["x..", ".xx", "..x"],
        [".oo", "oo."],
      ],
    },
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
    // Everything is growing. Sprouts and clusters, and no bare dots at all —
        // there is no patch of this region that is merely dirt with a speck on it.
    tufts: ["sprout", "sprout", "cluster"],
    crown: { color: "#2f4a34", amount: 0.45 },
    trunk: { color: "#3d3226", amount: 0.35 },
    // Sunk, wet and dark. Slabs and low boulders — anything that stood up here
        // went under a long time ago.
    stone: { tint: { color: "#41504a", amount: 0.32 }, shapes: ["slab", "slab", "boulder"] },
    // Weeping: broad at the top and narrowing all the way down, so the mass hangs
    // rather than sits. The tallest crown in the table — a fen tree leans over
    // the water it grew out of.
    crownRows: [4, 6, 7, 7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2],
    // Marsh flowers, and violet rather than the obvious yellow: the fen's whole
    // palette is murk, and a warm bloom in it would read as the scrub's spring
    // MARSH MARIGOLD — kingcup, the one flower everybody who has stood at the edge
    // of a fen has seen. It wants its feet in water, which no other row here can
    // offer, so this is the least arguable match in the file.
    //
    // A FULL HEAD, not a cross: a kingcup is a cup, so the petals close over the
    // top instead of leaving gaps at the corners. That also fixes what the violet
    // could never fix — yellow on this murk measures about 1.75:1, the best
    // contrast of any bloom here, where the old violet managed 1.06 and separated
    // by hue alone.
    bloom: {
      season: "spring",
      density: 0.09,
      accent: "#f0c845",
      core: "#d99a2b",
      // THE EYE IS ENCLOSED, and that needed five pixels of width to do without
      // drawing a square. At three wide, "petals all the way round a centre" is a
      // 3×3 block — the shape reads as a TILE before it reads as a flower, which
      // is the one thing a cup must not do. At five, the corners can come off and
      // the ring closes: yellow above, below and both sides of the amber, with a
      // rounded edge outside that.
      //
      // The biggest bloom in the file, and a kingcup is the biggest flower any of
      // these regions actually grows, so the size is the plant rather than a
      // compromise.
      marks: [
        [".ooo.", "oo*oo", ".ooo.", "..x..", "..x.."],
        [".ooo.", "oo*oo", ".ooo.", "..x.."],
      ],
    },
    // Reeds, standing in clumps. The tallest marks in the file at four rows,
    // which is what says "this ground is wet" without a single new tile.
    decor: {
      density: 0.16,
      marks: [
        ["x.x", "x.x", "x.x", ".x."],
        [".x.", "x.x", "x.x", "x.x"],
        ["..x", ".x.", ".x.", ".x."],
      ],
    },
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
    // Dim. Little grows under that light, and what does is small — mostly
        // specks, with the occasional plant that managed.
    tufts: ["dot", "dot", "cluster"],
    crown: { color: "#2a2740", amount: 0.7 },
    trunk: { color: "#3a3348", amount: 0.45 },
    // Violet, like everything under this light, and it STANDS. The first region
        // to get shards: out here the ground has started doing things it does not do
        // at home, and that is the whole premise of the far country.
    stone: { tint: { color: "#463d5e", amount: 0.34 }, shapes: ["crag", "shard", "boulder"] },
    // The meadow's silhouette exactly. Colour carries this one alone, deliberately:
    // it is the shape you know, which is what makes the colour unsettling instead
    // of merely decorative.
    crownRows: BROADLEAF,
    // Fireflies, and they are LIGHT rather than animals — nothing catches one,
    // nothing counts them, nothing waits for them (DESIGN §Living light). Only
    // after dark, which is what makes the twilight country worth walking into at
    // an hour you would otherwise be indoors: by day this region has no air at
    // all. Barely drifting, because a firefly hangs.
    motes: {
      // SPARSE, AND ALL DAY. You have to be looking for them — which is the
      // right amount for the one region that has them permanently, and the
      // reason it does is that this country's light is already wrong at noon.
      density: 0.022,
      // ORANGE HERE, YELLOW IN THE NEAR REGIONS. The twilight country's whole
      // palette is violet, and a warm light in it should read as the wrong kind
      // of warm — an ember rather than a summer evening.
      // Orange, and now an ember rather than a hint of one — the dusk's whole
      // palette is violet, so this is the only warm thing in the country and it
      // should be the brightest. Same two-ink trick as the near regions: the
      // white core clips, the orange survives at the rim.
      color: "#ffa022",
      core: "#fff0d8",
      drift: 2,
      sway: 1,
      period: 6,
      size: 2,
      flash: true,
    },
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
    // THINNED ONCE THE REGION HAD REAL LIGHTS IN IT. 0.12 was set when the
    // mushrooms were the only pale thing on the floor and had to carry it; now
    // there are sparks in the air, orbs in the crowns and a champagne cap on
    // every one of these, and at the old density a swatch reads as a mushroom
    // patch that happens to glitter. Punctuation, which is what the note above
    // always said they were.
    // Fewer again. 0.075 was already the thinned number, and with pale caps on a
    // floor this quiet they still read as the thing you notice first — which for
    // a region whose name is about LIGHT is the wrong first thing.
    mushrooms: 0.045,
    water: 0,
    ground: { color: "#1e5a72", amount: 0.8 },
    // THE SPECKLE WAS THE GLOW, AND IT ISN'T ANY MORE — which is a promotion for
    // the region rather than a retreat. When it was written the tuft was the only
    // way the floor could shine, so it went to 0.8 of a bright mint and shouted.
    // The glow is now made of actual light: sparks, orbs, pale caps. A speckle
    // still shouting next to them is a THIRD bright thing competing for the same
    // job, and the eye reads competition as clutter — the grass stopped being
    // texture the lights sit on and became more lights.
    //
    // So it recedes toward its own GROUND, and the amount has to be high to get
    // there — measured, after a gentler pull went wrong in a new way. At 0.42 the
    // speckle stayed half-green over a teal floor: flecks of (110,182,121) on
    // (51,108,107), which is not competing light any more but is a different
    // region's grass showing through this one's. The tint is a direction and a
    // distance, and stopping half way leaves you half way.
    //
    // 0.85 lands it near (79,140,142): teal, a step lighter than the floor, still
    // the brightest grass in the game — and finally texture the lights sit on
    // rather than a third thing shining.
    tuft: { color: "#48879a", amount: 0.85 },
    // CALM, AND DELIBERATELY WITHOUT BLADES. Four shapes at equal odds read as
        // chaos on this floor in particular — it is the one region with lights in
        // the air and in the trees, so its ground has the least room of anywhere to
        // be busy. Sprouts and clusters, both of which are round, with a dot in
        // five to keep them from marching. The two-blade grass is saved for the
        // regions above, where an upright mark has nothing to compete with.
    tufts: ["sprout", "sprout", "cluster", "cluster", "dot"],
    // Spores that GLITTER, going UP — which is the whole difference between here
    // and the blossom rows: one region's air falls and the other's rises.
    //
    // The glitter is the NAME being kept. A region called the glimmer whose air
    // was plain dots was the one row on the preview page that did not look like
    // what it is called, and that is a thing only a page showing all nine at once
    // can tell you.
    motes: {
      // HALVED WHEN THE GLITTER ARRIVED, and that is cause and effect rather than
      // a second opinion about the number. 0.22 was tuned when these faded slowly
      // over an eleven-second cycle — mostly-lit specks that read as texture, and
      // a fifth of every cell carrying one was fine for texture. A glint is an
      // EVENT: the same count that sat quietly now goes off forty times a screen
      // and the region reads as static. Fewer rather than smaller, because the
      // spark is already a 1px core and the arms are what make it read as glitter
      // at all. A THIRD off rather than half: at 0.11 a frame held two glints and
      // the region went quiet, which is the opposite failure and just as wrong.
      density: 0.15,
      // CHAMPAGNE, AND GOLD IS NOT AVAILABLE HERE — which is a fact about the
      // ground rather than a preference. A spark is additive over teal, and teal
      // already has green and blue near the top of their range, so a warm ink has
      // headroom in RED ONLY: the arms come out khaki. Rendered against the real
      // region at four points from mint to saturated amber, the amber read olive
      // and slightly swampy, and the frank gold went sage where its arms met the
      // grass.
      //
      // This stays close enough to white that the ground cannot drag it green,
      // and lands where the warmth was actually wanted — it reads as white gold
      // more convincingly than the gold did. The lesson generalises to any mote
      // over a saturated ground: pick the tint by what SURVIVES the additive
      // pass, not by what the hex looks like in the file.
      color: "#ffeec4",
      // The hot centre. Same two inks as a firefly and for the same reason — the
      // additive core clips to white while the cool green survives in the arms,
      // so a spark reads as a glint of light rather than a pale cross laid on
      // the grass. `core` was documented as flash-only; it is not, and never
      // should have been — it belongs to anything that is a SOURCE.
      core: "#ffffff",
      drift: 20,
      sway: 3,
      period: 11,
      shape: "spark",
      // Faster than the rise, slower than a flicker. Half a second read as
      // frantic on a screen holding twenty-five of them — pretty one at a time
      // and stressful as a field, which is the only way this is ever seen. 1.4s
      // is still eight times quicker than the spore's own cycle, and paired with
      // a half-lit floor and arms that no longer jump (see the renderer) it
      // shimmers instead of strobing.
      twinkle: 1.4,
    },
    crown: { color: "#16303a", amount: 0.75 }, // near-black, so the floor reads bright
    trunk: { color: "#243a42", amount: 0.5 },
    // The teal the whole region is dyed in, and mostly SHARDS — stone that grew
        // rather than fell, which is the nearest this gets to saying "crystal"
        // without claiming a material it does not give. It still gathers into plain
        // `stone`, exactly as the champagne mushroom still gives a mushroom.
    stone: {
      tint: { color: "#2f7078", amount: 0.36 },
      shapes: ["shard", "shard", "boulder"],
      // The champagne again, for the fourth and last thing in the region — air,
      // trees, mushrooms, and now the ground. One pixel, so the stone is a stone
      // that caught the light rather than a stone made of it.
      glint: { color: "#ffeec4", twinkle: 4.5 },
    },
    // PUFFY, and lumpy on purpose. Still close-topped — the canopy has to close
    // over you or the floor has nothing to be the brighter thing than — but wider
    // than a tile now and no longer a smooth taper.
    //
    // The lumps are the whole trick and they are not noise: a crown that widens,
    // narrows a pixel and widens again reads as SEVERAL masses of foliage, where
    // a clean curve reads as one balloon. Two shoulders and a broad middle, which
    // is what a soft-canopied broadleaf actually looks like from here. 8 is past
    // the "about a tile wide" mark in `crownRows` and allowed: overhanging its
    // neighbours is a thing broadleaves do, and in a wood this dense the crowns
    // touching each other is the point.
    crownRows: [3, 6, 7, 8, 7, 8, 8, 8, 7, 8, 7, 6, 4, 3],
    // Down beside the trunk, so the foliage sits ON the tree rather than balanced
    // on top of it. Cheaper than a taller sprite and it reads bushier, which is
    // what "puffier" wanted.
    crownOverlap: 2,
    // The region's own light, snagged in the branches — same champagne as the
    // sparks, and the same two inks. A third of the trees, three apiece: enough
    // that a stand glows and few enough that you notice which ones.
    orbs: {
      color: "#ffeec4",
      core: "#ffffff",
      chance: 0.34,
      // A triangle, hung off-centre. Read against `crownRows` above: row 4 is 7
      // half-widths, row 7 is 8, row 10 is 7, so all three sit well inside the
      // foliage with room for the bead. Weighted to the LIT side up top and
      // trailing down to the right, which is the direction the crown's own
      // highlight already runs — light collecting where light already is.
      // Every one lifted a row from where they were first hung. The same
      // arrangement, sitting higher in the mass — low in a crown is where the
      // foliage is in its own shade, and a light reads best where the light
      // already is. The lowest was also close enough to the underside that it
      // half-belonged to the trunk. Rows 3, 6 and 9 are 8, 8 and 8 half-widths,
      // so all three still have foliage to spare on either side.
      spots: [
        [-5, 3],
        [4, 6],
        [-2, 9],
      ],
      twinkle: 3.5,
    },
    // Undergrowth, and the first region to ask for any. A wood you cannot see far
    // in wants something at knee height — and the puffy crowns above have nothing
    // to rhyme with until there is a smaller version of them on the floor.
    shrubs: 0.55,
    // Champagne caps, same mushroom. The red was the one warm-blooded thing in a
    // region built entirely out of teal and pale gold, and it read as an object
    // from somewhere else lying on the floor.
    mushroomCap: { cap: "#e8d29a", lit: "#f7ead0", gills: "#b09a68" },
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
    // Bleached and thin, like everything else here.
    tufts: ["dot", "blades"],
    // The palest crown in the table by a long way. Nearly white with a blue cast,
    // which at this size reads as translucent rather than as snow — snow would be
    // a season, and a season is not something a place gets to have on its own.
    crown: { color: "#dfeaf2", amount: 0.8 },
    trunk: { color: "#9fb6c6", amount: 0.6 },
    // Bleached to nearly the colour of the air. Shards and slabs: everything in
        // this wood is either standing very straight or lying very flat.
    stone: { tint: { color: "#c3dbe8", amount: 0.38 }, shapes: ["shard", "slab"] },
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
    // Kept ground under an orchard: mown, ordinary, tidy.
    tufts: ["cluster", "blades"],
    crown: { color: "#e8a8c4", amount: 0.8 }, // pink, and unmistakably so
    trunk: { color: "#5a3a30", amount: 0.25 },
    // Old orchard stone, warmed by the same light everything else here is.
    stone: { tint: { color: "#c8b2ac", amount: 0.18 }, shapes: ["boulder", "slab"] },
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
    // NO GROUND BLOOM, and this is the one region that was offered one and gives
    // it back. Fallen petals closed a tidy loop — the row has had petals falling
    // through the AIR since it was written, with nothing on the ground for them
    // to land on — and on screen the loop was the problem. Pink in the crowns,
    // pink in the air and pink on the floor is one colour doing three jobs, and
    // the falling petals stopped reading as MOTION because they no longer crossed
    // anything that was not already their own colour.
    //
    // The bare ground is what the blossom is seen against. Note also that these
    // trees flower all year (see the motes below), so a spring-only carpet under
    // a permanently blooming orchard was never a season anybody could have read.
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    crownOverlap: 3,
    // Falling petals, and they fall all year because these trees are stubbornly
    // in blossom all year (§EVERY COLOUR IS A TINT — "Blossom Rows stay
    // stubbornly pink"). A seasonal petal would be the one thing in this file
    // that read the month for something other than colour.
    // SATURATED, not pale. A petal drawn near-white sat on pale green grass as a
    // pixel a shade off the ground and vanished; magenta found it in one shot.
    // A mote has to win against what it FLIES OVER, and here that is a lawn.
    motes: { density: 0.3, color: "#e79ec4", drift: -22, sway: 5, period: 9, size: 2 },
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
