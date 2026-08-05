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

/** How the mushrooms here are BUILT — not which species they are.
 *
 *  THE RULE THIS RESTATES. It used to read "a tint and not a species": one
 *  silhouette everywhere, because a mushroom is gatherable and hands back a plain
 *  `mushroom`, so a second shape would say "different thing" and give you the
 *  same item. That was stricter than the rule `stone` had been living under all
 *  along — a shard and a boulder look nothing alike and both gather into `stone`,
 *  because they are the same material in a different state.
 *
 *  So the line moves to where it always was for stone: **the shape may vary, the
 *  ITEM may not.** What breaks the promise is a second item id, not a second
 *  outline. A region grows its mushrooms tall or squat the way it grows its rock
 *  into shards or slabs, and every one of them gathers into `mushroom`.
 *
 *  It is still a short list on purpose. Two families, and the reason the fen got
 *  the second one is that a grey toadstool was a fly agaric wearing paint: at
 *  this size the DOME is the fly agaric, so recolouring alone left the fen with
 *  the right colour on the wrong plant. */
export type MushroomShape =
  /** The dome on a stalk — the mushroom everyone draws, and the one every region
   *  had. Wide, low, and with the fly agaric's white speck on it. */
  | "cap"
  /** Tall, narrow, and notched over the stem where the cap's edge lifts away
   *  from it. What comes up on wet ground; the fen's, and nobody else's yet. */
  | "bell";

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
  | "glass"
  | "granite"
  | "prairie"
  | "cinder"
  | "salt"
  | "marsh"
  // Sited, not rolled — like the blossom rows, and for the same reason. See
  // BIOMES.redwoods.
  | "redwoods"
  | "giants"
  | "caldera"
  | "static";

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

  /** Stumps and fallen logs, ×DEADWOOD_DENSITY. Optional, and absent means NONE
   *  — the second field here that is off by default, and for a better reason
   *  than the shrub's: deadwood on the ground says a wood is OLD, and most of
   *  these regions are not making that claim.
   *
   *  THE ONE FIELD IN THIS TABLE THAT CANNOT TOUCH YIELD EVEN IF IT WANTED TO.
   *  `shrubs` is allowed to exist despite being a gathered node because wood is
   *  not scarce and four shrubs are four fellings against one tree; this needs no
   *  such argument, because a stump hands back nothing at all. It is decor with a
   *  tile — see tiles.ts §STUMP, and DESIGN.md §Biomes for the rule it is under.
   *
   *  RARE ON PURPOSE. The base is a third of the rock's, so a log is something you
   *  come across rather than something a wood is made of. Turn it up and a region
   *  stops reading as woodland and starts reading as a clearance site. */
  deadwood?: number;
  /** How wet it is — roughly the fraction of ground standing under water. Fen
   *  only, and low: water is solid, and a region you cannot cross is a wall
   *  rather than a place.
   *
   *  Read as PONDS, not as cells (see `inPond` in sim/world.ts). A per-cell roll
   *  put down lone bright squares instead of water. */
  water: number;

  /** How much of the ground is MOLTEN — the same number `water` is, for the same
   *  field, and read the same way: as blobs and never as cells (`pondDepth` in
   *  sim/world.ts, on its own salt). Optional, and only the cinders have any.
   *
   *  IT IS SOLID AND IT IS NOT A HAZARD. Lava blocks you exactly as deep water
   *  blocks you, because nothing in this game can hurt anybody — see
   *  content/tiles.ts §LAVA, where that argument lives with the tile it is about.
   *  So this number answers the fen's question and not a new one: how much of a
   *  region is a thing you have to go round, and the fen's answer holds here too —
   *  keep it LOW, because a region you cannot cross is a wall rather than a
   *  place, and one you walked six hundred tiles to reach is the worst possible
   *  place to put a wall. */
  lava?: number;

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

  /** Extra pixels of trunk EITHER SIDE of the ordinary four. Optional; 0 —
   *  which is every region but the giants, and is why nothing that already
   *  stands anywhere moved when this arrived.
   *
   *  HEIGHT WAS ONLY HALF OF BIG, exactly as `crownRows` was only half of tall.
   *  A giant sequoia's whole claim is girth: it is the trunk you cannot get
   *  round, and drawn at the world's ordinary four pixels a sixty-pixel one
   *  reads as a very tall ordinary tree — a mast, which is the opposite of the
   *  thing. Three attempts at saying "giant" with height alone all came out as
   *  the birch's sentence spoken louder.
   *
   *  IT DOES NOT MOVE THE CENTRE. The trunk grows symmetrically about its own
   *  column, so the crown's midline, the bark grid's midline and the `crownGaps`
   *  notch all still land where they always did — which is what keeps this one
   *  number rather than a second coordinate system for wide trees.
   *
   *  Keep it small. The trunk is 4 + 2× this, and half a tile (8px) is already
   *  a tree you cannot see past; wider and the sprite stops being a tree in a
   *  wood and becomes a wall with leaves on it. */
  trunkGirth?: number;

  /** Dark marks on the bark. Optional, and the birches are the only species so
   *  far that has any — every other trunk here is a plain three-pixel post.
   *
   *  WHAT IT IS FOR: a white trunk with nothing on it is a bollard. The dashes
   *  are what makes it read as a birch rather than as a painted pole, and they
   *  are the one detail of this tree everybody can name without being asked.
   *
   *  A grid per variant, read from the TOP of the trunk down; `x` is a mark,
   *  anything else is bark. Rows past the end of a grid are blank, so a grid
   *  written for one trunk height still works on a shorter one.
   *
   *  THREE CHARACTERS WIDE, PLUS `trunkGirth` EITHER SIDE — the trunk's own
   *  columns, whatever they currently are. The grid is centred on the stem, so
   *  a birch's three stay three and the giants' widen with the tree rather than
   *  drifting off the side of it. A row longer than the trunk is clipped, which
   *  is the same forgiveness the row count already had.
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
   *  TWO PLACES A GAP IS LEGAL, and the rule behind both is that it must be OPEN
   *  to the outside. A gap with foliage above it and foliage below it is a square
   *  of grass punched into the crown — a hole, and it reads as one:
   *
   *  - On the rows that OVERLAP the trunk, where the gap is open downward and
   *    what shows through it is bark. This is the underside of a crown.
   *  - On a run of rows starting at row 0, where the gap is open upward and what
   *    shows through it is sky. This is a CLEFT — the parting between two boughs
   *    at the top of a canopy. It does not split the crown: the first ungapped
   *    row below joins the two halves. NOTHING USES ONE at present; the birch
   *    tried it, mirroring its own underside, and a divot in the top of a tree
   *    turns out to read as damage rather than as a parting. Kept legal because
   *    the rule is about enclosure, not about which end of the crown you are at.
   *
   *  Anywhere else is the hole. `crownGaps` is checked for this in
   *  render/palette.test.ts, because it is invisible in a swatch and obvious at
   *  size. */
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

  /** How they are built here. Optional; `"cap"` — the dome — otherwise, which is
   *  what every region but the fen grows. See MushroomShape for why this is
   *  allowed to exist at all, and what it is still not allowed to do. */
  mushroomShape?: MushroomShape;

  /** BARE ROCK, IN SHEETS — the ground going stone across patches several tiles
   *  wide, on a field of its own. The granite's, and nobody else's.
   *
   *  IT IS THE SCRUB'S DEAD IDEA, DONE THE WAY THIS FILE ALREADY KNOWS TO DO IT.
   *  The scrub wanted bare ground twice and the screen threw it out both times,
   *  because both attempts recoloured a CELL: one square of dirt on open turf is
   *  a hard-edged square, and a scatter of them tiles the ground into a
   *  checkerboard (CLAUDE.md §per-cell edges). That is not an argument against
   *  bare ground. It is an argument against bare ground being a cell — and
   *  sim/world.ts has answered it twice already, for the fen's ponds and for
   *  `groundTone`: put the feature on a LOW-FREQUENCY FIELD and let it be tens of
   *  tiles across, so nothing about it can line up with the grid.
   *
   *  WHAT IT MAY NOT BECOME. This is colour and nothing else — no tile, no
   *  solidity, no yield, nothing to gather, nothing that blocks a build. A player
   *  may put a house on a granite sheet, and the sheet will be under the floor
   *  exactly as grass is. The moment it is a tile it is a material, and a region
   *  that gates a material is the thing DESIGN §Biomes forbids.
   *
   *  It replaces `ground` and `tuft` where it is strongest and fades out where it
   *  is not, blended by the same machinery that fades one region into the next —
   *  which is what keeps it from having an edge anywhere. */
  sheet?: {
    ground: Tint;
    tuft: Tint;
    /** Wavelength of the field, in tiles. Big, for two reasons that happen to
     *  agree: a sheet you can see the whole of from one spot is a boulder rather
     *  than a landscape, and a short wavelength makes a STEEP field, which turns
     *  the fade below into a cliff however wide the window is. */
    period: number;
    /** Where the rock starts and where it is complete, as values of the field.
     *  The field is bilinear value noise, so it is bell-shaped rather than flat:
     *  a tenth of it is over 0.8 and a quarter over 0.7, which is why these are
     *  stated as thresholds and not as a percentage of ground covered. Measured,
     *  not guessed — a "cover" number written as a fraction was the first cut and
     *  it delivered a third of the region at a tenth of the strength.
     *
     *  THE WINDOW HAS TO BE WIDE, and `sim/biome.test.ts` §"never steps" is what
     *  says so rather than taste: turf to bare rock is a bigger colour change
     *  than most region borders make, and a narrow window lands all of it inside
     *  a tile or two, which is a cliff — the same cliff the clearing seam was. */
    from: number;
    to: number;
  };

  /** THE GROUND BROKEN INTO PLATES — a web of hairline cracks lying across the
   *  surface, several tiles to a plate. The salt flats', and nobody else's.
   *
   *  IT IS THE SHEET'S ARGUMENT ONE STEP ON. Bare rock had to be a low-frequency
   *  FIELD because a recoloured cell is a hard square (§sheet). A crack is worse
   *  than a square: it is a LINE, and a line drawn inside every cell of a
   *  continuous surface is the band rule's oldest trap — the roof shingles, the
   *  wall side-runs, the ground bevel, all of them a mark at the tile pitch. What
   *  makes this legal is that the network is ruled across the WORLD: jittered
   *  points on a lattice of its own, joined to their neighbours, and each tile
   *  draws only the part of a line that happens to cross it. A plate is bigger
   *  than a tile, so no crack ever ends at a cell edge and none of them line up.
   *
   *  IT IS PAINT, exactly as a sheet is. No tile, no solidity, nothing to
   *  gather, nothing that blocks a build; you may put a house on a cracked flat
   *  and the cracks go under the floor like grass does. The flats are the emptiest
   *  ground in the game and this is the only thing on them, which is why it is
   *  allowed to be the one texture that reaches all the way across a region. */
  cracks?: {
    /** The hairline itself. Drawn at a low alpha over the region's own ground —
     *  a crack is a shadow in a surface, not a drawn-on line. */
    color: string;
    /** How far apart the lattice points are, in TILES. This is the size of a
     *  plate, and it wants to be several: at one or two the web is a net and the
     *  flat reads as tiling, which is the exact failure the note above is about. */
    period: number;
    /** 0 (invisible) to 1 (the full ink). Low: on ground this pale a crack at
     *  full strength is a drawn line, and what we want is the surface being
     *  slightly broken. */
    alpha: number;
  };

  /** THE GEOMETRY OF THIS REGION'S STANDING WATER, where the fen's does not fit.
   *  Optional; the fen's own constants otherwise (sim/world.ts §pondDepth), which
   *  is every other region with any `water` at all.
   *
   *  WHY THE FEN'S KNOB WOULD NOT REACH. `water` is a fraction and the geometry
   *  under it is fixed — ponds of radius 1.2–2.6 on an eleven-tile lattice — so
   *  the wettest a region can be is about a tenth of its ground, whatever number
   *  you write. That is right for a fen, which is damp country with pools in it,
   *  and it cannot express a marsh, which is water with country in it. Turning
   *  `water` up past the cap does nothing at all, which is the worst kind of
   *  knob: one that stops responding without saying so.
   *
   *  `max` IS THE CROSSING PROMISE AND IT IS NOT DECORATIVE. Depth is the deepest
   *  single pool reaching a tile (never a sum), so the deepest water a region can
   *  have is exactly `max` — and `WATER_KINDS.pond.shelf` is 3. Keep this under
   *  it and every pool in the region wades; raise it over and the region grows
   *  water you cannot cross, which six hundred tiles from home is a wall (§water
   *  above, and the fen's note, and the cinders' after it). There is a test. */
  pools?: {
    /** Tiles between candidate centres. Smaller than the fen's makes water the
     *  ground rather than a thing in it. */
    cell: number;
    /** Pool radii, in tiles. See the promise above about `max`. */
    min: number;
    max: number;
    /** How far the waterline wanders off the circle, as a fraction of the radius
     *  — the lava lake's two sines, one scale down (sim/world.ts §PoolGeometry).
     *  A pool small enough to see all of quantises onto the tile grid as a
     *  rectangle, and a region made almost entirely of waterline came out as a
     *  bay of blue boxes without this.
     *
     *  IT COUNTS AGAINST `max`: the deepest water is `max × (1 + wobble)`, and
     *  that product is what must stay under the shelf. */
    wobble?: number;
  };

  /** THE SECOND INK — the region drawn in two colours alternating on a 2×2
   *  dither instead of one. The Static's, and nobody else's.
   *
   *  WHAT IT IS FOR. Every other row here says "this place is a colour". This one
   *  says "this place is being drawn wrong", and a single wrong colour cannot say
   *  it — a violet meadow is a violet meadow, which is the dusk, and the dusk is
   *  merely eerie. What reads as a rendering fault is two inks the ground cannot
   *  decide between, at a pitch finer than anything else in the world: not a
   *  palette, a BITRATE.
   *
   *  ON THE WORLD PIXEL, NEVER THE CELL, and this is the band rule again with the
   *  finest teeth it has yet been given. A 2×2 checker phased off the tile would
   *  put an identical pattern in every cell and the ground would read as tiling
   *  — the venetian blind at two-pixel pitch. Phased off the world it runs
   *  unbroken under everything, which is what a low-resolution surface looks
   *  like: the picture is coarse, the picture is not made of squares.
   *
   *  IT REACHES GROUND AND FLORA AND STOPS THERE. Not the player, not a villager,
   *  not a building, not one pixel of the HUD. You are a correct thing standing
   *  in a place that is being drawn badly — which is the whole joke, and also the
   *  line that keeps this a BIOME rather than a screen effect. A glitch that
   *  reached the interface would be indistinguishable from the game being broken,
   *  and a player cannot enjoy a place they think is a bug report. */
  dither?: {
    /** The alternate ground ink. Pulled from the same base and by the same
     *  machinery as `ground`, so the two travel together through the season and
     *  the night wash and the pair never comes apart. */
    ground: Tint;
    /** The alternate speckle — picked per MARK rather than per pixel, because a
     *  tuft is three pixels and a dither inside one is a colour nobody can see. */
    tuft: Tint;
    /** The alternate crown. The largest wrong surface on screen. */
    crown: Tint;
  };

  /** THE PICTURE COMING APART — what the Static does that a palette cannot.
   *
   *  WHY THE DITHER WAS NOT ENOUGH. Two inks at two-pixel pitch say "this place
   *  is short of a bit", which is a statement about COLOUR, and colour is what
   *  every other row here says something about. What the eye actually reads as a
   *  fault is none of that: it is the picture SEPARATING (a warm ghost a pixel
   *  one way, a cold one the other), the picture TEARING (a row of it sliding
   *  sideways), and a line of the picture arriving WRONG (a run of flat colour
   *  where ground should be). Those are three different failures of one machine,
   *  and a region claiming to be badly drawn needs all three or it is merely
   *  tinted oddly.
   *
   *  EVERY PART OF IT STEPS OFF THE WORLD, never off the cell. A tear runs on a
   *  world pixel row and a run length of its own, so it crosses tiles and ends
   *  wherever it ends; the fringe is a property of a MARK, which is already
   *  placed by a hash on the world coordinate. Nothing here can line up with the
   *  grid, which is the same fence the cracks and the dither are behind.
   *
   *  IT STILL STOPS AT GROUND AND FLORA — see §dither, and DESIGN §"A place that
   *  is drawn wrong". Not the player, not a villager, not a building, not one
   *  pixel of the HUD. The moment a tear crosses somebody's sprite the region is
   *  no longer a place with something wrong with it; it is a broken game. */
  glitch?: {
    /** The warm channel, drawn a pixel to one side of a mark. */
    warm: string;
    /** The cold one, a pixel to the other. Together they are the separation:
     *  neither is meant to be seen as a colour, only as the mark not quite
     *  agreeing with itself. */
    cold: string;
    /** Fraction of this region's decor marks whose rows are torn sideways. Not
     *  all of them, and not a fixed offset: a shear that happened to everything
     *  equally is a font, not a fault. */
    tear: number;
    /** Corrupt scanlines: runs of flat colour where a row of ground should be. */
    bars: {
      /** Chance per (world pixel row × run). Very low — a few on a screen. Turn
       *  it up and the region stops being a wood with something wrong with it and
       *  becomes a screen of noise, which is a different (and much worse) place:
       *  you cannot see a wood through it, so there is nothing to be wrong. */
      density: number;
      /** How long a run is allowed to get, in pixels. Longer than a tile on
       *  purpose — a tear that stopped at cell edges would be the band rule
       *  wearing its most obvious disguise yet. */
      run: number;
      /** Seconds a tear holds before the picture is re-sampled. Short, because
       *  this is a signal failing rather than a thing moving — the mote's own
       *  argument (§MoteKit `noise`), and the reason neither of them fades. */
      period: number;
    };
  };

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

  /** THE COLOUR OF THE WATER THAT CROSSES THIS REGION. Optional, and the salt
   *  flats are the only row with one.
   *
   *  THIS IS AN EXCEPTION TO A RULE THAT WAS FOUND ON SCREEN, so it gets its own
   *  field rather than a loosened list. `render/palette.ts` §BIOME_GROUND exists
   *  because tinting every tile pulled the SEA halfway to dry sand in a riverside
   *  town, along with the plaza and the farmland: a region is turf and what grows
   *  on it, and it has no opinion about water, about paving, or about anything a
   *  player made. That rule stands. What this says is narrower and is a statement
   *  about a specific place: a stream crossing a salt pan is carrying the pan,
   *  and comes out milky.
   *
   *  It is still only COLOUR. It reaches the two water tiles and nothing else —
   *  not the sand, not the shore, not a bridge somebody built over it — and it
   *  changes no depth, no shelf, no wading speed and nothing about what a tile
   *  does. The affordance survives it: both blues take the same pull, so "you may
   *  wade here" stays the paler of the two (there is a test).
   *
   *  Blended like the ground is, through `regionParts`, so water leaving the
   *  region fades back to ordinary water over the same tiles the turf does and
   *  there is no line across the stream. */
  waterTint?: Tint;

  /** WHAT FLOATS ON THE WATER — the same kit shape as `decor`, drawn on the
   *  SHALLOWS instead of on grass. The marshes', and nobody else's.
   *
   *  A THIRD SLOT, AND THE ARGUMENT AGAINST A THIRD SLOT SURVIVES IT. `bloom`'s
   *  note says two is the limit because the ground has room for about two kinds
   *  of small thing before it stops being ground — and that is a statement about
   *  the GRASS. This lands on water, which until now carried nothing anywhere in
   *  the world, so it competes with none of it: a cell is either turf or it is
   *  wet, and no cell ever draws both.
   *
   *  IT IS PAINT, LIKE EVERY OTHER MARK. A lily pad blocks nobody, yields
   *  nothing, is stored nowhere and slows no one down — the marsh is wadeable
   *  because of its POOL GEOMETRY (see `pools`), and not one pixel of this either
   *  helps or hinders. That matters most for the things in this kit that look
   *  like a route: the stepping stones and the boards are somebody's opinion
   *  about where to walk, laid across water that was already crossable. Reading
   *  them as a bridge and following them is a perfectly good way to cross the
   *  marsh, and so is ignoring them and wading, and the game will never tell you
   *  which you did. */
  float?: DecorKit;

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

  /** Pixels travelled HORIZONTALLY over one cycle — the wind. Positive goes
   *  east. Optional, and only the long grass has any.
   *
   *  IT IS NOT A BIGGER `sway`, and that is why it is a second field rather than
   *  a larger number. Sway is an oscillation: it comes back, which is what a
   *  petal does in still air, and turning it up just makes a wider wobble. This
   *  is a displacement, the same shape `drift` has on the other axis, so the mote
   *  actually leaves — a seed head crosses the frame and is replaced by another
   *  one arriving.
   *
   *  ONE REGION, DELIBERATELY. Every other region's air is about LIGHT — a
   *  firefly, a spark, a petal caught falling. The prairie's is about the wind,
   *  which is the only thing there is to say about a place that is entirely
   *  ground cover, and it stops being a thing worth saying the moment two
   *  regions say it. */
  blow?: number;
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
   *  than from the thing spinning. Same trick as the tuft's three silhouettes.
   *
   *  `noise` is the Static's, and it is the one mote in the file that does not
   *  TRAVEL. Everything else here drifts: a petal falls, a spore rises, ash blows
   *  east, and that motion is what makes it air. This one JUMPS — it holds a
   *  position for a fraction of a second and is somewhere else after, snapped to
   *  whole pixels — which is the difference between something in the air and
   *  something wrong with the picture. Drawn flat and never additive: a stuck
   *  pixel is not a light, and a hot core would make the region twinkle, which is
   *  the glimmer's sentence and the opposite of this one. */
  shape?: "dot" | "spark" | "noise";

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
export const BROADLEAF = [
  2, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2,
];

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
    // Deadfall. A pine wood is the one that manufactures this without being old
    // — the lower branches die in the shade of the upper ones and come down all
    // year, which is why the floor of a plantation is a mess of sticks. The
    // heaviest here, and still rare.
    deadwood: 1.2,
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
    crownRows: [1, 2, 3, 3, 3, 3, 3, 4, 4, 5, 4, 4, 5, 5, 6, 6, 5, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7],
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
    // Birch is the fastest-rotting timber of any tree in this table — a fallen
    // one is soft inside within a couple of years, which is exactly the reading
    // these want. Lighter than the pines: this is an airy wood and a floor
    // strewn with wood is not.
    deadwood: 0.8,
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
    trunkHeight: 20,
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
    // A SYMMETRIC CROWN, CAPPED: thirteen pixels across, and the middle sixteen
    // rows read the same upside down. That is deliberate rather than tidy — the
    // outline gathers at the bottom exactly as it closes at the top, which is
    // what stops a crown looking like a blob that has been trimmed to fit its
    // trunk. Only the widths mirror; see `crownGaps` for the end that parts.
    //
    // The 2 on the front is the cap, and it is the one row that breaks the
    // reflection on purpose. Mirrored exactly, the crown ended on a flat 7px lid
    // — a shape that has been cut off rather than one that has finished, because
    // the bottom's matching row does not have to close (the trunk continues out
    // of it and the eye reads the tree as carrying on downward). The top has
    // nothing below it to lean on, so it needs the extra step.
    //
    // Length is height and 16 rows on a 13px trunk is taller than it is wide,
    // which is the whole brief. At fourteen rows it came out round — a ball on a
    // stick, the shape a child draws.
    //
    // Width was 11 first and it was one step too thin: a crown that narrow has to
    // close on its trunk in two or three steps, so the silhouette went full width
    // to bare bark almost at once. Two more pixels buy the rows to come down
    // gently, at 4, 4, 4, 3.
    //
    // THE SHOULDERS ARE ONE HOLD, NOT A WOBBLE, and that was the correction that
    // taught the most. They ran 6,5,6,5,6 — three single pixels standing off each
    // side with a dent between each, every one a legible notch at this size, so
    // the crown read serrated. It is the per-cell edges band rule (CLAUDE.md) in
    // a different hat: alternation that fine is texture, and texture on a
    // silhouette is noise. It is the step that HOLDS that reads as a clump.
    //
    // AND IT IS AN EGG, NOT A CONE. The first version widened all the way down —
    // which is the PINE's silhouette four rows up in this file, and a narrow
    // white-trunked spruce is what it came out as.
    crownRows: [3, 3, 4, 5, 5, 5, 5, 5, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 7, 7, 7, 6, 5, 5, 5, 5, 5, 4],
    // ONE ROW, AT THE BOTTOM ONLY. The notch is open downward and shows BARK —
    // the underside where the branches leave the stem, and the cheapest detail on
    // this tree by a distance, because bark inside leaves is most of what says
    // "birch" from across a field.
    //
    // The crown's WIDTHS still mirror, and only its widths: the silhouette is the
    // same shape at both ends, which is what keeps it reading as one grown thing.
    // Cutting the matching cleft into the top as well was one step too literal —
    // a dip in the underside of a canopy is a parting, and the same dip in the
    // TOP of one is damage. Symmetry of outline, not of holes.
    //
    // THE NOTCH WAS SIX ROWS DEEP ONCE, which is a different tree: the foliage
    // arrived at the trunk's sides half a crown below where it crossed over the
    // top of it, and the eye read a long white channel driven up into the canopy.
    // A notch says "the branches leave from here" only while it stays shallow
    // enough to be an underside; any deeper and it is a gap.
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
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
    crownRows: [2, 4, 5, 6, 6, 7, 6, 6, 5, 4, 3],
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
    // Wet ground is where wood goes soft, and a fen tree stands in the thing
    // that undermines it. The most legible deadwood in the game and the least
    // like timber — nobody looks at a log in a bog and thinks "firewood", which
    // is the affordance argument in tiles.ts §STUMP handed to us for free.
    deadwood: 1,
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
    // INKCAP GREY, AND THE REASON IS ECOLOGY RATHER THAN PALETTE — the first row
    // in this file to be settled by what actually grows somewhere.
    //
    // The default cap is red, which at this size and with a white speck on it is
    // a fly agaric and nothing else. Amanita muscaria is ectomycorrhizal: it
    // cannot grow without a tree's roots to partner, and its partners are BIRCH
    // first, then pine and spruce. It wants well-drained acid soil under those
    // hosts. A fen is the one habitat in this table it would never appear in —
    // and the fen was carrying the heaviest mushroom density in the game (0.12,
    // double the birches'), so the region least likely to have a fly agaric had
    // the most of them, eight patches to a screen.
    //
    // Recoloured and reshaped, but NOT thinned: density is the one field here
    // that touches YIELD (mushrooms barter for cloth, for seed, and for every
    // crop variety at 8 a row), so fixing this by moving numbers would have made
    // foraging measurably worse in a place for a reason nobody could see. Red now
    // means birch or pine, which is what red means outdoors.
    //
    // THE COLOUR ALONE WAS NOT ENOUGH, and that is the whole argument for
    // `mushroomShape` existing. At this size the DOME is the fly agaric — grey
    // paint on it left the fen with the right colour on the wrong plant, which is
    // exactly the complaint that got the pinewood its own crown silhouette two
    // hundred lines up. Bell here: tall, narrow, notched over the stem.
    //
    // Grey, not brown: papery and about to deliquesce, which is what these do.
    // Cool, so it cannot be confused with the glimmer's warm champagne, and pale,
    // so it still reads on the murkiest floor in the game — the same legibility
    // argument the champagne made. It also stays clear of the kingcups a few
    // lines down: the fen already has one yellow thing in spring.
    // THE GILLS ARE NEARLY BLACK HERE, which is a bigger jump than any other row
    // makes between cap and gills — and it is carrying the species rather than
    // the lighting. An inkcap dissolves from the rim upward, so what you actually
    // recognise is a dark edge hanging under a pale cap. `mushroomShape: "bell"`
    // gives that edge a whole row of its own (renderer §MUSHROOM_ART); a mid-grey
    // in it would draw a shadow under the cap instead of the thing itself.
    mushroomCap: { cap: "#b3aab0", lit: "#d5cdd0", gills: "#4a4450" },
    mushroomShape: "bell",
    // Weeping: broad at the top and narrowing all the way down, so the mass hangs
    // rather than sits. The tallest crown in the table — a fen tree leans over
    // the water it grew out of.
    crownRows: [5, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 6, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3],
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
    // NIGHT FLOWERS, OPEN AT NOON. The region's premise carried down to the
    // ground: nothing is shaped oddly — an ordinary head on an ordinary stem,
    // the plainest flower drawing in the file — and the strange part is a fact
    // rather than a silhouette. These are the flowers that open at dusk, and
    // here it is always dusk, so they are always open. Nobody has to be told
    // that; it is simply true, which is the register this region works in.
    //
    // Moon-pale, and the only pale thing on the floor: the stems take the
    // near-black crown ink, so what actually lands on the violet is a scatter
    // of small lit heads hanging in the dark. Deliberately NOT the firefly's
    // ember — the one warm thing here stays the one warm thing.
    decor: {
      density: 0.08,
      accent: "#cfc8ea",
      marks: [
        [".o.", ".x.", ".x."],
        ["o..", ".x.", ".x."],
        [".x.", ".x."],
      ],
    },
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
    crownRows: [4, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 4],
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
    // MOSS, AND IT IS DARK — the one kit in the file whose job is to not shine.
    // This region already has light in the air, the trees, the caps and the
    // stone; the tuft's own note records what happened when a fifth thing tried
    // to glow ("competing instead of coalescing"). So the ground's decor is the
    // opposite move: low mounds in the near-black crown ink, which land as
    // SILHOUETTES against the lit floor — things standing between you and the
    // light, which is the only new sentence a kit could add here.
    //
    // Round, like everything else on this floor (the tuft list banned blades for
    // the same reason), and the sparsest kit in the file: the ground with the
    // most light on it has the least room of anywhere to be busy.
    decor: {
      density: 0.05,
      marks: [
        ["xx.", "xxx"],
        [".xx", "xxx"],
        ["xx"],
      ],
    },
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
    crownRows: [3, 3, 4, 6, 6, 6, 7, 8, 8, 7, 6, 6, 6, 5, 5, 4, 3, 3],
    // STANDING VERY STRAIGHT OR LYING VERY FLAT — the stone's rule (shards and
    // slabs, nothing in between) grown down into the smallest marks there are.
    // A single stem, dead straight, in the near-white crown ink; and the same
    // stem lying down. In every other region a straight upright is forbidden —
    // the tuft doc says equal blades read as a gate — and that is exactly why
    // it belongs here and nowhere else: one blade alone cannot make a gate, and
    // in the one region whose character IS geometry, the straightness is the
    // strangeness. No accent, no flower, no curve. Bleached country does not
    // decorate.
    //
    // THE TALLEST MARKS IN THE FILE, past the fen's four-row reeds, and the
    // height is the drawing: at three rows the stem photographed as a slightly
    // taller dot — the tuft list here already scatters pale dots, so a short
    // upright had nothing to distinguish it. Five rows of one pixel is the
    // point where the eye stops reading "speck" and starts reading "line".
    decor: {
      density: 0.08,
      marks: [
        ["x", "x", "x", "x", "x"],
        ["x", "x", "x", "x"],
        ["xxx"],
      ],
    },
    // Bleached, like everything else here — and the argument is the glimmer's
    // word for word: red was the one warm-blooded thing in a region built out of
    // cold blue and near-white, and it read as an object from somewhere else
    // lying on the floor.
    //
    // Ecology would have allowed the red. This wood's crown is the birch's, and
    // a fly agaric partners birch — but the glass wood is what a birch wood looks
    // like with the colour drained out of it, and a cap that kept its red would
    // be the one thing in the region that hadn't been drained. The palette wins
    // here because the palette IS the place.
    //
    // Paler than the floor rather than darker: a gathered thing has to be findable,
    // and this is the one region whose ground is already mid-toned.
    mushroomCap: { cap: "#cfe0ea", lit: "#eef5fa", gills: "#a3bcc9" },
  },

  /** ROCK AS A LANDSCAPE, which is the one thing the world did not have. The
   *  scrub is dry ground with a great many stones lying on it; this is ground
   *  that IS stone, with a little turf caught in it and the odd tree standing
   *  where a seed found a crack. The distinction is the whole row, and it lives
   *  almost entirely in `stone` below.
   *
   *  IT IS NOT RICHER THAN THE SCRUB AND MAY NEVER BE. Rocks gather into
   *  `stone`, and this row is far-country (near 0 in FIELD_WEIGHTS), so a
   *  density above the scrub's would be a payout curve for distance — the exact
   *  thing the glimmer's mushrooms were pulled back from, and what
   *  `sim/biome.test.ts` §"gives the far country nothing the near one hasn't
   *  got" is watching for. 4.5 sits under the scrub's 5 on purpose: what makes
   *  this the rocky country is not MORE rock, it is that the rock is the
   *  ground.
   *
   *  WHY THERE ARE NO BARE-ROCK CELLS. Because the scrub tried it twice and the
   *  screen threw it out both times (see its note): a lone recoloured cell on
   *  open turf is a hard-edged square and a scatter of them checkerboards the
   *  ground. So the rock is said with the tint, the silhouettes and the near
   *  absence of trees, which is what the scrub learned and this row inherits
   *  rather than relearning. */
  granite: {
    id: "granite",
    name: "the granite",
    // The emptiest canopy in the game by a distance — a quarter of the meadow's,
    // and less than the scrub's. A tree out here is an event: one Jeffrey pine
    // standing on a dome, which is the picture everybody has of this country.
    trees: 0.25,
    rocks: 4.5,
    mushrooms: 0,
    water: 0,
    // A snag or two. Almost nothing rots at this exposure — what falls out here
    // stays where it fell and bleaches — but there is little enough standing
    // that there is little enough to fall, so this is the thinnest deadwood of
    // any region that has it at all.
    deadwood: 0.3,
    // GREY-GREEN, AND MEASURED AGAINST THE TWO PALE ROWS IT COULD BE CONFUSED
    // WITH. The birches land near (161,199,112) and the scrub near (181,194,114)
    // — both light, both plainly grass. This lands near (163,174,143): the same
    // brightness and almost no saturation left, which is what reads as thin turf
    // over stone rather than as a meadow in the sun. Dropping the value instead
    // was tried in the head and rejected: dark grey ground is the fen's move, and
    // this is high open country with the light full on it.
    ground: { color: "#a8a79a", amount: 0.9 },
    tuft: { color: "#b8b7a8", amount: 0.85 },
    // WHAT GROWS IN A CRACK. Mostly nothing — two dots to every mark that is a
    // plant — and the plant is a cluster rather than a blade, because a tuft in
    // a rock joint grows as a cushion and not as a stand of grass.
    tufts: ["dot", "dot", "dot", "cluster"],
    // Dusty and blue-ish, the way a pine looks in glare. Held hard, for the
    // pinewood's reason: a conifer does not turn in October, and out here there
    // is nothing else on screen to carry the season if this one does not refuse
    // it.
    crown: { color: "#3c5646", amount: 0.62 },
    // Weathered pale. A tree that has been rained on and dried out at this
    // altitude has bark closer to bone than to brown.
    trunk: { color: "#8a7862", amount: 0.42 },
    // A long bare bole. The single tree on the rock is a tall thin thing with
    // its foliage held well above head height, which the ordinary 16 could not
    // say — and here the trunk is doing what the birch's does, which is carrying
    // the species on its own.
    trunkHeight: 20,
    // THE ROW. Palest stone in the game, pulled nearly twice as hard as the
    // birches' — this is not a grey rock catching a pale region's light, it is
    // the thing the region is made of.
    //
    // SCOURED, NOT CRACKED, and that is the sentence that separates this from the
    // scrub for good. The scrub's ground broke: crags, broken halves, split
    // slabs. This ground was ground down — domes and sheets, rounded and lying
    // flat, with not one sharp silhouette in the list. Two shapes only, which is
    // fewer than any other region has, because a landscape scoured by one process
    // does not offer variety.
    stone: { tint: { color: "#cbccc2", amount: 0.46 }, shapes: ["slab", "slab", "boulder"] },
    // THE ROW THE REGION IS ACTUALLY FOR. Without this the granite photographed
    // as a rocky meadow — pale green turf with a lot of stones lying on it, which
    // is the scrub's sentence in a cooler colour and not "mostly rock" at all.
    // Sheets are what makes the ground itself the stone.
    //
    // ABOUT A THIRD OF THE REGION, at a wavelength of twenty-seven tiles — rather
    // more than a screen — so you walk on and off the rock several times crossing
    // the region and are never looking at the whole of one sheet. Under the
    // stones' own colour rather than over it: a boulder sitting on a sheet has to
    // still read as a boulder, so the sheet stays the duller of the two.
    sheet: {
      ground: { color: "#c6c7bc", amount: 1 },
      tuft: { color: "#d0d1c6", amount: 1 },
      period: 33,
      from: 0.36,
      to: 0.7,
    },
    // A narrow tiered conifer, stepped like the pinewood's and a pixel thinner
    // at the shoulders: a tree with room on every side does not have to reach,
    // and one growing out of rock has not got the water to. Shorter in the crown
    // than the pines, taller in the trunk, which is the same total height
    // arranged to read as a lone tree instead of as a stand.
    crownRows: [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
    // GRIT AND CUSHIONS, and the sparsest kit in the file after the glimmer's.
    // The ground here is mostly not soil, so most of it has nothing on it at
    // all — a denser kit would be the one thing on screen arguing with every
    // other thing on screen.
    decor: {
      density: 0.055,
      accent: "#c6c7bc",
      marks: [
        ["oo", "o."], // chips off the sheet
        [".o", "oo"],
        ["xx.", "xxx"], // a cushion plant in a joint
      ],
    },
  },

  /** GRASS, BUSHES, AND THE ODD TREE — one open country rather than two, and the
   *  correction is worth recording because it was a real design error. This
   *  shipped for an afternoon as a PAIR of regions: a heath that was all bushes
   *  and a prairie that was all grass, each pure, each making its point cleanly
   *  and neither of them being a place. Open country is mixed. A plain with
   *  scattered scrub in it and one tree on the skyline is a thing everybody has
   *  seen; a plain with nothing but bushes and a separate plain with nothing but
   *  grass are two diagrams.
   *
   *  So the bushes came here and the other row went. What is left is one region
   *  with three scales of plant in it — tussock, bush, tree, in that order of how
   *  much of it there is — which is more than any other row in this file has, and
   *  is most of why it reads as somewhere rather than as a swatch.
   *
   *  THE BUSHES COST NOTHING TO DRAW, which is why they could be folded in at
   *  all. `shrubs` has existed since the glimmer asked for undergrowth, and
   *  `drawShrub` takes its width from the region's own `crownRows` — so the
   *  scrub out here is a small version of the lone oak below, and no new sprite
   *  was written for any of it.
   *
   *  IT IS NOT A WOOD YOU CAN FARM. A shrub is a gathered node (two wood) and
   *  this row is far country, so the payout-for-distance question has to be
   *  answered with arithmetic rather than waved at: 0.55 × 0.1 = 5.5% of cells at
   *  two wood is 0.11 a cell, against the PINEWOOD's 22% at eight, which is 1.76,
   *  forty tiles from the plaza. Sixteen times as much wood at home, and
   *  `sim/biome.test.ts` measures exactly this.
   *
   *  AND THE AIR MOVES ACROSS. Every other mote in the game rises or falls
   *  (`drift`); this is the only one that travels sideways (`blow`), and that is
   *  the single detail doing the most work in the row. Grass without wind is a
   *  lawn. */
  prairie: {
    id: "prairie",
    name: "the long grass",
    // ONE TREE A SCREEN AND A HALF, and it is a bur oak with a crown wider than
    // anything but the blossom's: the lone tree in the open is a shape everybody
    // recognises, and it only reads as lone if the next one is out of sight.
    trees: 0.04,
    // The emptiest ground in the game — a twentieth of the meadow's rock, where
    // even the fen has four times that. There is nothing underfoot here but
    // grass, and that is a claim the numbers have to make or it is only a mood.
    rocks: 0.05,
    // WAXCAPS, and they came over with the bushes. Old unploughed grassland is
    // the waxcap's habitat — it is the reason grassland turns up in fungus books
    // at all — and it is also the one honest cap for a region with no birch and
    // no pine in it, which is what `render/palette.test.ts`'s whitelist asks. Thin
    // on the ground: this is a place you find one, not a place you forage.
    mushrooms: 0.03,
    water: 0,
    // SOME BUSHES. Not a heath's 1.8 and not the glimmer's understory either —
    // 5.5% of cells, which is roughly one in a small clearing's worth of ground:
    // enough that the horizon has lumps on it and you walk around things, few
    // enough that the region is still grass. Scattered scrub is what open country
    // does when nobody is grazing it.
    shrubs: 0.55,
    // HONEY, NOT BLEACHED. Measured against the two rows it could be confused
    // with: the meadow is (139,191,90) and the scrub (181,194,114), and this
    // lands near (158,168,87) — a step darker and warmer than both, which is
    // tall grass with its own shadow in it rather than lawn or parched ground.
    ground: { color: "#a99a55", amount: 0.62 },
    tuft: { color: "#bcae66", amount: 0.55 },
    // Upright, and mostly blades: the one region where the tuft doc's warning
    // about equal uprights reading as a gate does not apply, because at this
    // density they are not marks on a lawn — they are the lawn.
    tufts: ["blades", "blades", "cluster"],
    // TWO JOBS FOR ONE TINT, since the bushes wear it too and there are twenty
    // times as many of them as there are trees. Darker and greyer than the grass
    // it stands in: a bush on a plain reads as a bush by being the one solid dark
    // thing out there.
    //
    // HELD HARD, AND OCTOBER IS WHY. At 0.55 the season pulled the scrub the same
    // bronze as the grass and the region photographed as brown lumps on brown —
    // which is the entire point of having bushes gone, in the month the asters
    // are out and the place is worth walking to. Scrub in dry country is
    // evergreen; the GRASS is what goes over. So the plants hold their green at
    // 0.72 and the ground turns underneath them, which is what the eye reads as
    // autumn on a plain rather than as a plain that has been recoloured.
    crown: { color: "#5d7a44", amount: 0.72 },
    trunk: { color: "#6b5236", amount: 0.3 },
    // A WAXCAP, and `render/palette.test.ts`'s whitelist is what asked. The
    // default red is a fly agaric, which is ectomycorrhizal and needs a BIRCH,
    // PINE or SPRUCE to partner; this row has 0.04 trees and none of them is any
    // of those. What actually fruits on old unploughed grassland is the waxcaps —
    // squat, glossy, and orange rather than scarlet, which is exactly the
    // distinction the whitelist exists to force. No white speck to be seen
    // against, either, which is half of what makes the default read as an amanita.
    mushroomCap: { cap: "#d98b3a", lit: "#edb164", gills: "#8f5320" },
    // A LONE OAK: wide, low-shouldered, and the second-widest crown in the file
    // after the cherries'. A tree with nothing near it grows out rather than up,
    // which is the whole reason this shape is different from the wood's.
    crownRows: [3, 5, 7, 8, 8, 8, 8, 8, 7, 6, 5, 4],
    trunkHeight: 14,
    // THE DENSEST KIT IN THE FILE BY A FACTOR OF THREE, and the one place the
    // file's own ceiling is wrong. `content/decor.test.ts` holds every kit under
    // a quarter of the cells, against the tuft's 38%, because at a comparable
    // density the ground stops being ground and becomes pattern — a rule learned
    // the hard way and true of every other row here.
    //
    // It is true of kits that are things lying ON ground. This kit is the
    // vegetation itself: the region has no trees, no rocks and no undergrowth, so
    // if the grass is a sparse scatter then the region is an empty field with
    // weeds in it — which is exactly what it photographed as at 0.24, twice, once
    // with single blades and once with tussocks. The ceiling was written to stop
    // ground turning into pattern, and here it was stopping ground from having
    // anything on it at all.
    //
    // 0.45, measured rather than argued: at that density the clumps touch often
    // enough to read as one stand of grass with gaps in it, which is what a
    // prairie is, and the pattern failure the rule guards against does not appear
    // because the marks are irregular and four ways up. The test carries the
    // exception BY NAME, so nobody else inherits it by accident.
    //
    // FIVE ROWS, which ties the glass wood's stems for the tallest marks here and
    // is the ceiling rather than a choice: the renderer insets a mark by a pixel
    // inside its own cell, so 5×5 is the largest thing guaranteed a clear pixel
    // on every side (CLAUDE.md §per-cell edges). Curved, and no two the same way,
    // because a field of identical uprights is a fence.
    decor: {
      density: 0.32,
      // TUSSOCKS, AND BIG ONES — the size is the fix, not the count, which took
      // three passes on screen to see. Single 3×5 blades at 0.24 photographed as
      // an empty field with weeds in it; clumping them into 3×5 tussocks changed
      // almost nothing; raising the density to 0.45 changed almost nothing
      // either. The arithmetic says why: a 3×5 mark is six pixels of ink in a
      // 256-pixel cell, so even on half the cells the ground is 97% bare. The eye
      // was reading the GROUND, because the ground was what was there.
      //
      // 7×6, which is legal and always was — `content/decor.test.ts` allows up to
      // 14 across, since the renderer insets every mark inside its own cell and a
      // mark can therefore never touch its neighbour whatever its size. The
      // "about 5×5" figure in the DecorKit doc is a guarantee, not a ceiling.
      //
      // A FAN OF BLADES FROM ONE BASE, which is what a bunchgrass is and what
      // separates this from the fen's reeds (parallel uprights, standing in
      // water). Four of them, no two leaning the same way, because a field of
      // identical tussocks is a crop.
      // FOUR THAT ARE NOT THE SAME TUSSOCK, which is the rule in `marks` taken
      // seriously rather than nodded at: the first four differed only in which
      // blade leaned, and a screen of them read as one glyph printed everywhere —
      // exactly the failure 8c found with a single mark scattered randomly. They
      // differ in HEIGHT and WIDTH now, which is what the eye actually sorts on,
      // so a stand of grass has big clumps and small ones in it like a stand of
      // grass does.
      marks: [
        // Tall, five blades, symmetrical — the full-grown one.
        ["x..x..x", "x..x..x", ".x.x.x.", ".x.x.x.", "..xxx..", "...x..."],
        // Short and three-bladed. Half the height, and most of them are this.
        [".x.x.x.", ".x.x.x.", "..xxx..", "...x..."],
        // Lopsided: taller on one side, as though something sat on the other.
        ["x......", "x..x...", ".x.x..x", ".x.x.x.", "..xxx..", "...x..."],
        // Wide and low — a spreading one, and the only mark here wider than tall.
        ["x.....x", ".x...x.", ".x.x.x.", "..xxx.."],
      ],
    },
    // ASTERS, IN AUTUMN — and the season is the one number here that changed when
    // the bushes arrived. As a coneflower it was summer, which is true of a
    // prairie and left autumn where it has always been: the only season with no
    // signature in the whole file, carrying the largest crown swing in
    // `seasons.ts` and a bare floor under it. Asters and goldenrod are what
    // actually flowers on grassland in September and October, so the honest plant
    // and the missing season turn out to be the same choice.
    //
    // PURPLE WITH A GOLD EYE, and both halves are forced. Yellow petals were the
    // obvious pick and are unreadable on honey-coloured ground; and the scrub
    // already owns a magenta head on a stem, so this needs a silhouette of its
    // own. An aster's petals are narrow and many, radiating flat from a small
    // bright centre — so this is the only flower in the file drawn as a ring of
    // separate points with a lit middle, and it reads as a starburst at three
    // pixels, which is what the plant is named for.
    bloom: {
      season: "autumn",
      density: 0.11,
      accent: "#b678c0",
      core: "#e8c04a",
      marks: [
        ["o.o.o", ".o*o.", "o.o.o", "..x..", "..x.."],
        [".o.o.", "o.*.o", ".o.o.", "..x..", "..x.."],
      ],
    },
    // SEED FLUFF, GOING ACROSS. The row this region is for: nothing else in the
    // game has air that TRAVELS (see MoteKit §blow), and a plain of grass with
    // still air over it is a photograph of a plain of grass.
    //
    // All year, with no `season`, which is the one liberty taken with the plant:
    // grass seeds in late summer, but the wind is the region rather than the
    // month, and a prairie that stood still for nine months would be the meadow
    // with less in it — the exact failure this row was written to avoid.
    motes: {
      density: 0.05,
      // Pale, dry and slightly warm — a seed head rather than a light. No `core`
      // on purpose: this is an OBJECT the wind is carrying, not a source, and the
      // additive white centre is what the file reserves for things that shine.
      color: "#efe6c8",
      // Barely rising, and travelling a tile and a half east while it does. The
      // ratio is the whole look: mostly sideways, slightly up, which is what
      // something light does in moving air.
      drift: 4,
      blow: 26,
      sway: 2,
      period: 8,
      size: 2,
    },
  },

  /** BURNT COUNTRY, AND THE ONLY GROUND IN THE GAME THAT IS ON FIRE. Black ash,
   *  trees that died standing, and seams of molten rock you walk around.
   *
   *  THERE IS NO MOUNTAIN AND THERE WAS NEVER GOING TO BE ONE. DESIGN §Biomes:
   *  strangeness is never taller, there is no height axis, and the whole world is
   *  one flat storey. A cone, a rim, a crater you look down into — none of them
   *  is expressible, and trying would have been the first thing in this game to
   *  claim an elevation. What IS expressible is everything at ground level, which
   *  turns out to be most of what a volcano actually is from a few feet away: the
   *  colour of the ground, what is standing on it, what is coming out of the sky,
   *  and the light.
   *
   *  NOTHING HERE CAN HURT YOU, because nothing anywhere in this game can hurt
   *  anybody — there is no health, no stamina and no damage in the sim. Lava is
   *  solid the way deep water is solid: an obstacle with a good view. That is the
   *  joke and it is the correct joke for this town.
   *
   *  IT IS ALSO THE POOREST GROUND IN THE GAME, which is the far-country promise
   *  kept where it is hardest to keep: no mushrooms, no undergrowth, no fallen
   *  wood, and snags at a fifth of the meadow's tree density. You walk out here
   *  for the look and you carry home less than you would from your own lawn. */
  cinder: {
    id: "cinder",
    name: "the cinders",
    // Snags. A fifth of the meadow's trees and every one of them dead — see
    // `crownRows`, which is the shape doing that work rather than a second tile.
    trees: 0.2,
    // Volcanic bombs, and the shape list is the whole of what makes them that:
    // shards and broken pieces, nothing rounded, because none of this has been
    // lying here long enough to wear.
    rocks: 1.0,
    // NOTHING GROWS, and these two zeroes are the region's strongest sentence.
    // The fen is the mushroomiest place there is; this is the only wooded-looking
    // country in the file with not one mushroom in it.
    mushrooms: 0,
    water: 0,
    // FOUR PERCENT, WHICH IS THE FEN'S NUMBER AND NOT A FRACTION MORE. The fen's
    // note is the argument, unchanged: water is solid and a region you cannot
    // cross is a wall rather than a place. Lava is more dramatic than water and
    // is exactly as impassable, so the temptation to turn this up is exactly the
    // temptation to build a wall six hundred tiles from home.
    lava: 0.04,
    // ASH, AND THE TARGET IS VIOLET, WHICH IS THE FILE'S OLDEST TRAP. Drafted at
    // a sensible warm charcoal (#3a332e at 0.88) it measured (68,68,51) on screen
    // — olive, because grass starts at (139,191,90) and a tint is a lerp: the blue
    // channel has the least distance to travel and arrives high, so anything aimed
    // straight at "dark brown-grey" lands on dark GREEN-grey. The dusk row learned
    // this first and wrote it down ("the target has to be darker than it looks");
    // this is the same arithmetic one step further, and the answer is to aim at a
    // colour that is not the colour you want.
    //
    // #3b2b34 at 0.9 lands near (66,58,56): a hair warm, near-neutral, and by a
    // long way the darkest ground in the game — the fen's murk is (115,152,80) and
    // the redwood duff (110,84,44).
    ground: { color: "#3b2b34", amount: 0.9 },
    tuft: { color: "#453843", amount: 0.88 },
    // GRIT, AND NOT ONE PLANT. Every other region's tuft list is a claim about
    // what grows there; this one is a claim that nothing does. Dots only would
    // have been the obvious version and reads as static — one blade in four, dead
    // and still standing, is what makes the dots read as grit rather than noise.
    tufts: ["dot", "dot", "dot", "blades"],
    // The crown ink, which on a dead tree is what the BRANCHES are drawn in. Near
    // black, and pulled hard: nothing here takes a season.
    crown: { color: "#2b241f", amount: 0.85 },
    // Charred. The darkest trunk in the file — darker than the grove's, which
    // until now was the only near-black wood in the game.
    trunk: { color: "#241c18", amount: 0.75 },
    // A SNAG: a bare stem with a few stubs of branch near the top and nothing
    // else. Two and three half-widths where a living crown carries six or eight,
    // and short, so the silhouette is mostly trunk — which is what a dead tree is
    // and what no other row in this file has ever drawn.
    //
    // The gaps are what stop it reading as a small tree. A crown this narrow with
    // solid rows is a spike; with the middle open on the rows that overlap the
    // trunk, the eye reads branches leaving a stem (see `crownGaps` — open
    // downward, showing bark, which is the legal kind).
    crownRows: [1, 2, 1, 3, 2, 3, 3, 2],
    // GAPPED ONLY WHERE A GAP IS LEGAL, which is the three rows that come down
    // beside the trunk (see BiomeDef.crownGaps, and `render/palette.test.ts`,
    // which caught the first draft putting one halfway up). Open downward, showing
    // bark: on a living tree that is the underside of a canopy, and on a dead one
    // it is the thing itself — branches leaving a bare stem with sky between them.
    crownGaps: [0, 0, 0, 0, 0, 1, 1, 1],
    crownOverlap: 3,
    trunkHeight: 22,
    // Fresh-broken and dark, with the region's own warmth in it. Shards and
    // broken pieces only: this rock was thrown, not weathered.
    // BASALT, AND THE ROCK IS THE CRUST. `content/tiles.ts` §LAVA fills at
    // #241a1a and this aims at exactly that hex: these boulders are pieces of the
    // same cooled rock the lake has a lid of, so they are the same colour as it,
    // and the region finally has one material running through the ground, the
    // lumps on it and the thing in the middle.
    //
    // THREE GOES TO GET HERE, every one of them a measurement off a screenshot.
    // At the tint cap (0.46) they came out (111,103,94) on ash of (66,58,56) —
    // granite dropped on a burnt plain. At 0.62 they came out (85,78,74), which
    // is basalt-ish and still nowhere near. At 0.92 of the crust's own hex they
    // came out (44,35,34), which is eight levels light of it, because a tint is a
    // LERP and 8% of a pale base is still 11 levels of pale.
    //
    // SO THE TARGET AIMS UNDER IT. #1b1011 is darker than any pixel this is meant
    // to produce, chosen so that the BODY row lands on #241a1a exactly — the fill
    // in content/tiles.ts §LAVA, the lid on the lake at the middle of the region.
    // Aiming at the colour you want is the natural mistake and it undershoots by
    // whatever fraction of the base survives; the dusk row wrote the same lesson
    // about ground tints and this is it applied to the last 8%.
    //
    // 0.92 IS AS FAR AS THIS MECHANISM GOES, and the reason is worth writing down
    // for whoever wants 1.0 next. The stone's three greys — lit shoulder, body,
    // shaded foot — are pulled toward one colour by one number, so the higher the
    // amount the closer together they land: at 0.92 there are eight levels between
    // the lit row and the foot, which is enough to read as a rounded thing, and at
    // 1.0 there are none and it is a flat silhouette. The modelling is what says
    // "object" rather than "hole in the ground".
    //
    // NO GLINT, deliberately, and it was tempting: the glimmer's stone catches a
    // spark of its region's own light, and an ember caught on basalt beside a lava
    // lake is that idea exactly. Its own note says why not — a glint is affordable
    // at about one rock a screen, and this region has thirty-five. Light on every
    // one of them is not a highlight, it is a texture.
    stone: { tint: { color: "#1b1011", amount: 0.92 }, shapes: ["shard", "broken", "shard"] },
    // ASH IN THE AIR, ALL YEAR AND ALL DAY. The second and last user of `blow`
    // (MoteKit), and the pairing is deliberate: the long grass's air is seed
    // going sideways in sunlight, and this is the same motion with the light
    // taken out of it. Falling rather than rising — `drift` is negative — because
    // ash is the one thing in the sky that is on its way down.
    //
    // PALE GREY AND NO CORE. A core is the ink of a SOURCE (a firefly, a spark,
    // an orb) and ash is the opposite of a source: it is the thing the light has
    // gone out of. Against a near-black floor a plain grey speck reads perfectly
    // well without any help.
    motes: {
      density: 0.09,
      color: "#b6afa6",
      drift: -14,
      blow: 9,
      sway: 2,
      period: 7,
      size: 1,
    },
    // BONES OF THINGS, and the sparsest kit in the file bar the glimmer's. Two
    // fallen sticks and a scatter of grit — no flower, no fern, no seasonal
    // anything, because this is the one region where a bloom would be a lie.
    decor: {
      density: 0.06,
      accent: "#6a5b4e",
      marks: [
        ["x..", ".x.", "..x"],
        ["..x", ".x.", "x.."],
        ["oo", "o."],
      ],
    },
  },

  /** THE THIRD SPARSE PLACE, AND THE ONE THAT IS COLD ABOUT IT.
   *
   *  The cinders and the caldera are empty because something happened to them.
   *  This is empty because nothing ever did: white crust to the horizon, a crack
   *  network the only thing drawn on it, and the air going UP. It sits beside the
   *  burnt country as the same amount of nothing at the opposite temperature,
   *  which is the whole reason to have a third one — a sparse region is a mood,
   *  and one mood is not a set.
   *
   *  THE EMPTINESS IS THE CONTENT, so the numbers below are lower than anything
   *  else in the file and that is the row rather than a placeholder. Every other
   *  region answers "what grows here"; this one answers "nothing", and then has
   *  to be worth walking across anyway. What it has instead of growth is SURFACE:
   *  the plates (§cracks), and heat coming off them.
   *
   *  IT IS STILL NOT A HAZARD AND NOT A GATE. Nothing here is hot, nothing here
   *  is dry in a way the game counts, and there is no water to run out of —
   *  DESIGN §"Nothing in the world can hurt you" holds exactly as it holds over
   *  the lava. A desert that made you careful would be a different game; this one
   *  is a long white room you can walk through, and the reward for crossing it is
   *  that you crossed it.
   *
   *  RARE, BY THE SAME ARGUMENT THE GLASS WOOD AND THE CINDERS MAKE. It is the
   *  loudest kind of quiet there is, and a plateau with much of it in it would be
   *  a world with a hole in the middle. See FIELD_WEIGHTS. */
  salt: {
    id: "salt",
    name: "the salt flats",
    // THE LOWEST TREE COUNT IN THE GAME by a factor of four — the cinders' snags
    // are 0.2 and they are a WOOD by comparison. Not zero, and the argument is
    // the prairie's in reverse: a horizon with absolutely nothing on it has no
    // scale, so you cannot tell whether you have walked a long way or a short
    // one. One bleached stem every few screens is what makes the emptiness
    // measurable, which is what makes it read as emptiness rather than as an
    // unfinished region.
    trees: 0.05,
    // Ditto, and lower still. What stone there is lies flat (see `stone`).
    rocks: 0.12,
    // Nothing grows and nothing rots. The second region in the file with no
    // mushrooms at all, and it keeps the count where §Materials wants it: the
    // far country is stranger, never richer.
    mushrooms: 0,
    water: 0,
    // WHITE IS THE HARDEST TINT IN THIS FILE and the arithmetic is the cinders'
    // trap pointed the other way. Grass is (139,191,90): the GREEN channel is
    // already high and the blue is a long way down, so a tint aimed straight at a
    // neutral white lands minty — the pale draft (#f2f2f2 at 0.9) measured
    // (234,236,235), which is a white with a green cast that you cannot
    // un-see once the salt is next to a cloud.
    //
    // So the target leans off-neutral in the opposite direction: green a little
    // under, red and blue a little over. #f7eff3 at 0.9 lands on (236,234,228) —
    // faintly warm, faintly pink, and by a long way the brightest ground in the
    // game (the glass wood's floor is (193,214,210), and that was the previous
    // record).
    ground: { color: "#f7eff3", amount: 0.9 },
    // The crust, one step down. It has to be visible against ground this bright
    // or the speckle disappears and the flats go completely flat — which is a
    // temptation worth naming, because "completely flat" sounds like the brief.
    // It isn't: a surface with no texture at all reads as a hole in the render,
    // not as a place.
    tuft: { color: "#ded4d6", amount: 0.85 },
    // GRIT AND ONE DEAD STEM, which is the cinders' list to the letter and the
    // only thing the two regions share. Dots alone read as static (the cinders
    // found that first); one upright in four is what makes the rest read as
    // crystal rather than as noise. Two regions may share a tuft list — it is
    // three pixels — where they may not share a crown, and these two are as far
    // apart on colour as anything in the file.
    tufts: ["dot", "dot", "dot", "blades"],
    // Bleached rather than charred, which is the whole distinction between this
    // region's dead trees and the cinders'. Same fact — a tree that died — with
    // the sun on it for a hundred years instead of a fire in it for a night.
    crown: { color: "#bdaaa5", amount: 0.85 },
    trunk: { color: "#c9bfb4", amount: 0.7 },
    // SHORTER AND STUBBIER THAN THE CINDERS' SNAG, which `render/palette.test.ts`
    // requires (two regions may not share an outline unless the colour is
    // unmistakable) and which is also just true: a stem that has stood in the
    // open for decades has lost its branches, where a burnt one still has the
    // stubs. Six rows against eight, and the widest row is 3.
    crownRows: [1, 2, 1, 2, 3, 2],
    // Open downward against the trunk — the legal kind, and the only kind (see
    // BiomeDef.crownGaps).
    crownGaps: [0, 0, 0, 0, 1, 1],
    crownOverlap: 2,
    trunkHeight: 19,
    // SLABS, ALMOST ONLY. Everything on a flat lies flat: there is no soil to
    // stand a stone up in and nothing to have thrown it. The one `broken` in the
    // list is what stops three identical slabs a screen reading as a stamp.
    stone: { tint: { color: "#e6e2e0", amount: 0.46 }, shapes: ["slab", "slab", "broken"] },
    // MILKY WATER, WHICH IS THE ONE THING OUT HERE THAT MOVES. Streams and rivers
    // cross this region like they cross every other (3.6% of the flats' cells are
    // stream, measured), and ordinary river blue on a white pan reads as a strip
    // of somewhere else laid across it — the same complaint the glimmer's warm
    // grey stone made about its teal floor, at fifty times the size.
    //
    // Pale, cold, and low-saturation: water that has been standing on salt and has
    // taken it up. Measured, #dff2f7 at 0.45 lands the deep on (144,188,226) and
    // the shallows on (169,216,233) — still twenty-five levels apart, and the
    // shallows still the paler, so "you may wade here" survives the recolour.
    // There is a test on exactly that, because the tempting number is higher and
    // the thing a higher one costs is invisible until somebody drowns in a puddle
    // they thought they could cross.
    waterTint: { color: "#dff2f7", amount: 0.45 },
    // THE PLATES. See BiomeDef.cracks for why this may exist while the ground
    // bevel may not — the network is ruled across the world and a plate is six
    // tiles, so no line here ever ends on a cell edge.
    //
    // A COOL GREY AT HALF STRENGTH. Drawn at full it is a pen line and the flat
    // becomes a diagram; at a third it vanished against ground this bright. What
    // is wanted is a surface with breaks in it, and a break in a white surface is
    // a thin shadow.
    cracks: { color: "#a89f9c", period: 4, alpha: 0.5 },
    // HEAT, AND IT IS THE ONLY AIR IN THE GAME THAT GOES STRAIGHT UP. The
    // glimmer's spores rise too, but they rise the way a spore does — slowly,
    // sideways, catching the light. This is the surface giving back what it took
    // all day: faster, straighter, and pale enough to be nearly the colour of the
    // ground it is coming off, so what you see is the air moving rather than
    // anything in it.
    //
    // NO CORE AND NO GLINT. A core is the ink of a SOURCE (MoteKit), and heat is
    // not a light — it is the least substantial thing in the file, and the moment
    // it has a hot centre it becomes a spark over a fire, which is the region six
    // hundred tiles that way.
    //
    // A SHORT PERIOD FOR ONCE, and the doc's "anything brisk reads as an insect"
    // survives it: that rule is about BODIES, and about horizontal motion. Nothing
    // alive rises straight up in a still line, which is why five seconds here
    // reads as convection rather than as a fly.
    motes: {
      density: 0.07,
      color: "#efe0c6",
      // POSITIVE, which is the whole sentence. Everything the player has met that
      // moves in the air out here comes DOWN — the petals, the ash. Nine hundred
      // tiles out, the ground exhales.
      drift: 15,
      sway: 4,
      period: 5,
      size: 1,
    },
    // THE SPARSEST KIT IN THE FILE, past the cinders' bones. Salt crystal, in two
    // sizes, and nothing else: no stem, no flower, no fallen anything, because
    // there has never been anything here to fall. The accent is a pale that reads
    // as a facet catching light rather than as an object.
    decor: {
      density: 0.04,
      accent: "#ffffff",
      marks: [["o.", ".o"], ["oo"], [".o.", "o.o"]],
    },
  },

  /** WATER WITH COUNTRY IN IT — the fen's idea past the point where it stops
   *  being the fen's idea.
   *
   *  THE FEN IS DAMP GROUND WITH POOLS; THIS IS POOLS WITH GROUND BETWEEN THEM.
   *  That is a difference of kind and not of degree, and it could not be reached
   *  by turning the fen's `water` up — the geometry under that number caps out at
   *  about a tenth of a region (see BiomeDef.pools, which exists because of this
   *  row). What you get with its own lattice is an archipelago: islands a few
   *  tiles across, water between them, and a way through in every direction.
   *
   *  YOU ARE NEVER STOPPED AND YOU ARE OFTEN SLOWED, which is the only mechanical
   *  thing any of the three new regions does and it is the shallows' existing
   *  rule rather than a new one. Every pool here is under `WATER_KINDS.pond.shelf`
   *  by construction, so all of it wades at the shallows' own 0.6× — the marsh is
   *  a place you cross at a marsh's pace. Nothing is deep, nothing is a wall, and
   *  no crossing anywhere is required.
   *
   *  THE STONES AND THE BOARDS ARE PAINT, and deliberately so. See `float`: they
   *  are somebody's opinion about where to walk, laid over water that was already
   *  crossable, and following them is exactly as valid as ignoring them and
   *  wading. A stepping stone that was the ONLY way across would be a lock with a
   *  key made of scenery, which is the thing §Biomes forbids in its plainest
   *  form.
   *
   *  IT IS PEACEFUL WITHOUT BEING THE SEA. The sea is a horizon and an edge; this
   *  is enclosed, green, and small-scale — every view has a far bank in it. */
  marsh: {
    id: "marsh",
    name: "the marshes",
    // Islands are small, so a tree is a landmark on one rather than a canopy over
    // it. Under the fen's, and the fen is not a dense wood either.
    trees: 0.45,
    // Almost nothing stands on ground this soft. The fen's number, near enough.
    rocks: 0.18,
    // WET GROUND IS MUSHROOM GROUND, and this is the wettest there is — but it is
    // NOT the mushroomiest, and the gap is deliberate. §Biomes: a region may
    // change what its mushrooms look like and may never have more of them for
    // being far out. The fen keeps 0.12 because the fen is the mushroomiest place
    // there is and it is a region you can reach on your first afternoon.
    //
    // AND IT CAME DOWN AFTER LOOKING, from the 0.1 that reads as the fen's number
    // on paper. Mushrooms only come up on LAND, and this region is two fifths
    // water — so the same density lands half again as thickly on the ground you
    // can actually stand on, and the first screenshot had a dozen of them on one
    // island. A number that means "how mushroomy is it" has to be read against
    // how much ground there is.
    mushrooms: 0.06,
    // Sodden and going. The fen's argument word for word — nobody looks at a log
    // in a bog and thinks firewood — and this ground is wetter.
    deadwood: 1.2,
    // READ AGAINST `pools` BELOW, NOT AGAINST THE FEN'S 0.06. The knob still means
    // "how much of it is water", but the geometry underneath is this region's own,
    // so the same number would mean something different. Measured at about a third
    // of the ground wet, which is what leaves islands you can see the shape of.
    water: 0.46,
    // ITS OWN LATTICE: centres less than half as far apart as the fen's, and
    // pools wide enough that neighbours run together — which is what turns a
    // scatter of ponds into a network of channels with land between them rather
    // than a field with puddles in it. About two fifths of the region comes out
    // wet, measured.
    //
    // `max × (1 + wobble)` IS 2.93 AGAINST A SHELF OF 3, and that product is the
    // whole crossing promise: depth is the deepest single pool reaching a tile
    // and never a sum, so no water in this region can reach the depth that stops
    // you. Raise either number and the other has to come down. There is a test,
    // and it asserts the product rather than the field.
    pools: { cell: 4, min: 1.1, max: 2.3, wobble: 0.3 },
    // GREEN AND FRESH, WHICH IS THE WHOLE DISTANCE FROM THE FEN. The fen is murk
    // — a wet place going brown — and this is a wet place doing well: standing
    // water with light on it, sedge and lotus, everything growing. Measured
    // (137,178,101) against the fen's (115,152,80): the same family, a stop
    // brighter and a shade cooler.
    ground: { color: "#82a878", amount: 0.4 },
    tuft: { color: "#6f9c62", amount: 0.45 },
    // EVERYTHING IS GROWING — the fen's list, and for the fen's reason: there is
    // no patch of this region that is merely dirt with a speck on it. Blades
    // rather than the fen's second sprout, because sedge is what comes up between
    // pools.
    tufts: ["sprout", "cluster", "blades"],
    crown: { color: "#3c6b45", amount: 0.4 },
    trunk: { color: "#4a4030", amount: 0.35 },
    // Low, sunk and soft-edged. Slabs and boulders, like the fen — but paler,
    // because this water is clear and the fen's is not.
    stone: { tint: { color: "#5d7368", amount: 0.28 }, shapes: ["slab", "boulder", "slab"] },
    // NOT RED, AND THE WHITELIST IN render/palette.test.ts IS WHERE THAT DECISION
    // HAD TO BE MADE. The default cap is a fly agaric, which partners birch and
    // pine on well-drained acid soil — the fen's own note works out the ecology,
    // and a marsh is the same habitat the fen is only wetter. So this goes the
    // fen's way rather than the dusk's.
    //
    // Ochre rather than the fen's inkcap grey, because the two wet regions should
    // not be the same wet region: the fen is a place going brown in the dark and
    // this is a place growing in the light. A warm cap on a green floor reads at a
    // glance and stays clear of the lotus's own pale yellow, which is out on the
    // water where nothing is gathered.
    mushroomCap: { cap: "#c8a86a", lit: "#e2c791", gills: "#7f6540" },
    // Tall and notched, like the fen's — what comes up on ground that never dries
    // out. Same silhouette, same item, and the shape says the habitat rather than
    // the species (see MushroomShape).
    mushroomShape: "bell",
    // SPREADING RATHER THAN WEEPING, which is what keeps this off the fen's
    // outline: a fen tree leans over its own water in a long narrow fall of
    // foliage, and a marsh tree on a two-tile island puts its weight sideways
    // because there is nowhere else to put it. Wide, flat-topped, and shorter than
    // anything else that grows in water.
    crownRows: [4, 6, 7, 8, 8, 8, 8, 8, 7, 6, 5, 4],
    // Down beside the trunk, so the crown sits ON the island rather than floating
    // over it.
    crownOverlap: 2,
    // Sedge, in clumps, and the odd tussock. Shorter than the fen's four-row reeds
    // by a row: those are what says "this ground is wet", and here the WATER says
    // it, so the marks can be the plants rather than the announcement.
    decor: {
      density: 0.15,
      accent: "#c9d98a",
      marks: [
        ["x.x", "x.x", ".x."],
        [".x.", "x.x", "x.x"],
        ["x.o", "xx.", ".x."],
      ],
    },
    // WHAT FLOATS. Four marks, and between them they are the entire reason to
    // walk out here (see BiomeDef.float for what they may not be):
    //
    //   - a lily pad, notched, which is the shape everyone knows;
    //   - a smaller pad beside it, so a patch is a patch and not a stamp;
    //   - a lotus — pale petals round a bright centre, the one bloom in the game
    //     that opens on water;
    //   - two boards, laid end to end, and a stepping stone at the end of them.
    //
    // The stones and the boards use `accent` and the pads use the region's own
    // tuft ink, which is what keeps the vegetation reading as part of the marsh
    // and the built things reading as somebody's.
    float: {
      // A THIRD OF THE WATER CARRIES SOMETHING, which is high for a kit and is
      // this region's whole answer to a problem the fen never had: at a fifth,
      // the marsh photographed as flat blue blocks with a few things on them.
      // Open water is most of the view here, so what is ON it has to be doing the
      // work the tuft does on grass — texture, at a density you read as surface
      // rather than as objects.
      density: 0.32,
      accent: "#e8e4d6",
      core: "#f3d16a",
      marks: [
        // THE PAD, AND IT IS SOLID. The first cut drew it as a ring — three by
        // three with a hole — which at this size is not a leaf with a notch in
        // it, it is four corner pixels, and on water it read as a ripple. A lily
        // pad is a filled disc with ONE wedge cut to the middle, and the wedge is
        // the whole recognition: without it the shape is a stone.
        [".xxx.", "xx.xx", "xxxxx", ".xxx."],
        // A smaller one beside it, so a patch is a patch rather than a stamp. Two
        // by two and solid: at three wide with a hole in it, a pad is a PLUS SIGN,
        // which is what the first cut of both of these came out as.
        ["xx", "xx"],
        // The lotus, open. The eye is enclosed by petals on all four sides — the
        // kingcup's finding, which is the only other flower in the file with a
        // centre, and which needed five pixels of width for the same reason: at
        // three, petals-around-a-centre is a cross.
        [".ooo.", "oo*oo", ".ooo."],
        // Boards, laid end to end, with a stone to step off them onto. Straight,
        // because somebody put them there and nothing else out here is straight —
        // and long enough to read as a plank rather than as two pale specks.
        ["oooo.", "....o"],
        ["o....", ".oooo"],
      ],
    },
  },

  /** THE LAKE AT THE MIDDLE OF IT — sited, recurring outward, and the one place
   *  in the world you arrive at rather than cross.
   *
   *  THE REDWOODS' PATTERN EXACTLY, one escalation up: a disc of country at a
   *  known ring, on its own bearing, appearing again further out forever. The
   *  giants taught that arriving somewhere is worth more than happening into it,
   *  and this is the version of that with a light in the middle.
   *
   *  IT BRINGS ITS OWN CINDERS, which is why this is a region and not a lake
   *  tile. A pool of lava in a birch wood is a prop; a lake of it at the centre of
   *  twenty tiles of burnt ground is a place that happened. So the palette is the
   *  cinders' to the digit — same ash, same snags, same air — and the only
   *  difference is that here there is more of it and nothing at all survived. */
  caldera: {
    id: "caldera",
    name: "the caldera",
    // Fewer, and nearer the middle there are none: the disc is mostly open ash.
    trees: 0.08,
    rocks: 1.2,
    mushrooms: 0,
    water: 0,
    // NO SEAMS OF ITS OWN. The lake is authored — a disc at the centre, placed by
    // sim/world.ts the way the giants are — so scattering blobs on top of it
    // would put spots of lava in the ring you are meant to be able to walk round.
    ground: { color: "#3b2b34", amount: 0.9 },
    tuft: { color: "#453843", amount: 0.88 },
    tufts: ["dot", "dot", "dot", "blades"],
    crown: { color: "#2b241f", amount: 0.85 },
    trunk: { color: "#241c18", amount: 0.75 },
    // SHORTER AND BARER THAN THE PLAIN OUTSIDE, and `render/palette.test.ts` is
    // what asked for it: two regions may not share an outline unless their colour
    // is unmistakably different, and this row is the cinders' palette to the
    // digit. The answer is not paint — it is that a snag nearer the middle of the
    // burn has less of itself left. Five rows against eight, on a shorter stem.
    crownRows: [1, 2, 1, 2, 2],
    crownGaps: [0, 0, 0, 1, 1],
    crownOverlap: 2,
    trunkHeight: 18,
    // The cinders' basalt, to the digit. See its note for why this one row is
    // allowed past the tint cap.
    stone: { tint: { color: "#1b1011", amount: 0.92 }, shapes: ["shard", "broken", "shard"] },
    // THE CINDERS' AIR, TO THE DIGIT. It was thicker here for a draft — more ash
    // nearer where it is coming from, which is a nice sentence — and
    // `content/decor.test.ts` counts DISTINCT airs rather than rows, so a density
    // of its own made this a second kind of air in the world rather than the same
    // ash over a different part of the same burn. The count was right and the
    // sentence was decoration. What tells you that you have arrived is the light
    // off the lake, which is a thing no other region has at all.
    motes: {
      density: 0.09,
      color: "#b6afa6",
      drift: -14,
      blow: 9,
      sway: 2,
      period: 7,
      size: 1,
    },
    decor: {
      density: 0.06,
      accent: "#6a5b4e",
      marks: [
        ["x..", ".x.", "..x"],
        ["..x", ".x.", "x.."],
        ["oo", "o."],
      ],
    },
  },

  /** A PLACE THAT IS BEING DRAWN WRONG, ON PURPOSE, AND THE FURTHEST THING OUT.
   *
   *  Sited and recurring, like the redwood stands and the calderas, on a ring
   *  further than either — because this is the last sentence the far country has
   *  to say, and it should be the one you meet last. Everything before it says
   *  the world is stranger out here. This one says the world is being RENDERED
   *  out here, and something is wrong with the renderer.
   *
   *  HOW IT SAYS IT. Two inks the ground cannot decide between, alternating on a
   *  two-pixel dither (see BiomeDef.dither) — a surface at a coarser bitrate than
   *  the rest of the world. Trees whose crowns are drawn in steps rather than
   *  curves, as though something quantised them. And air made of pixels that do
   *  not drift but JUMP (MoteKit §noise). Not one of the three is a colour; all
   *  three are the picture being made badly, which is a thing no biome in this
   *  file has ever been.
   *
   *  IT IS FULLY INTENTIONAL AND IT MUST READ THAT WAY. The risk this row carries
   *  is unique in the game: a player who thinks they have found a BUG cannot enjoy
   *  it, and will file it, and be right to. Everything that keeps it on the right
   *  side of that line is a decision rather than an accident —
   *
   *   - The wrongness is REGIONAL and it has a soft edge, like every other region
   *     (regionParts overlays it with a fade). A glitch does not fade in over five
   *     tiles. A place does.
   *   - It is STABLE. Walk out and back and the same trees are the same wrong
   *     colours, because this is a total function of (seed, x, y) exactly as the
   *     meadow is. A bug would be different on the way back.
   *   - It NEVER TOUCHES the player, the villagers, the buildings, the HUD or one
   *     pixel of the interface. You are a correct thing standing in a wrong place.
   *     The moment the glitch reaches the frame around the world it stops being
   *     scenery and starts being a fault report.
   *   - Nothing here is broken in a way that COSTS anything. It gathers, grows,
   *     builds and paths exactly like the meadow, because it is the meadow's rules
   *     wearing bad paint.
   *
   *  AND IT HAS SOMEBODY'S NAME FOR IT. `the static` is what a villager calls it,
   *  which is the last and best proof that it is a place: people do not name a
   *  rendering error, they name a valley. */
  static: {
    id: "static",
    name: "the static",
    // ORDINARY DENSITIES, and that is the joke doing its work rather than a row
    // left untuned. Every other far region says what it is by how much of it
    // there is — the cinders are bare, the glass wood is thin, the flats are
    // empty. This one is an ORDINARY WOOD, at the meadow's own densities, that
    // happens to be coming out wrong. Thinning it would have made it a strange
    // place with a glitch on top; leaving it alone makes the glitch the only
    // thing that is strange, which is much worse in the way that is wanted.
    trees: 1,
    rocks: 1,
    mushrooms: 0.05,
    water: 0,
    // THE FIRST INK. A cold grey-violet with no green left in it, which is
    // already wrong for ground — but only slightly, and only until the second ink
    // arrives beside it.
    ground: { color: "#7c7a92", amount: 0.62 },
    tuft: { color: "#8f8aa6", amount: 0.6 },
    // THE SECOND. Not a shade of the first — a different HUE at nearly the same
    // brightness, which is the specific relationship that reads as an encoding
    // error rather than as dappled light. Two greys at different values are
    // shadow; two colours at one value are a palette that has lost a bit of
    // depth, and at 2px pitch the eye cannot resolve either one and gets an
    // unstable third colour instead. That instability IS the effect, and it is
    // the reason both inks are stated rather than one being derived.
    dither: {
      // A SICKLY GREEN AGAINST THE MAUVE, and the distance between the two hexes
      // is the whole effect. Measured on screen: the floor's inks land on
      // (130,148,125) and (112,168,102) — near enough the same brightness, twenty
      // units apart in hue, which is a pair the eye cannot resolve at two-pixel
      // pitch and cannot ignore either. The first draft put them four units apart
      // (see the renderer's note on which base a tint is pulled from) and the
      // region came out as a plain grey wood.
      ground: { color: "#5f9a6d", amount: 0.62 },
      tuft: { color: "#74b184", amount: 0.6 },
      crown: { color: "#4a5a7e", amount: 0.6 },
    },
    // Same relationship one layer up: the crowns disagree with themselves the way
    // the ground does, in the other direction, so nothing on screen agrees with
    // anything.
    crown: { color: "#5f7355", amount: 0.6 },
    trunk: { color: "#4b4652", amount: 0.5 },
    // QUANTISED, and this is the one silhouette in the file drawn as an argument
    // rather than as a plant. Every other crown here is a curve approximated in
    // pixels — a taper, a lump, a fall. This one is three flat runs with hard
    // steps between them: the shape a tree would be if something had rounded it
    // to the nearest four pixels. Nothing about it is organic and everything
    // about it is deliberate, which is exactly the sentence the region is making.
    //
    // It also keeps `render/palette.test.ts` happy for a reason that is worth
    // saying out loud: no other region has an outline anything like this, so the
    // Static can never be mistaken for a wood you have already been in.
    crownRows: [4, 4, 4, 4, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4],
    // Down beside the trunk, so the block sits on the tree.
    crownOverlap: 2,
    // Stone in the wrong colour too, and shards — a rock that came out of this
    // ground at a right angle. It still gathers into plain `stone`, like every
    // other rock in the world.
    stone: { tint: { color: "#6d6b84", amount: 0.42 }, shapes: ["shard", "broken", "shard"] },
    // THE PIXEL NOISE. Small, dim, everywhere, and the only mote in the file that
    // does not travel — see MoteKit §noise. The density is the highest in the
    // table and it is still under a tenth of cells: a screen of this is a dozen
    // specks appearing and disappearing at the corner of your eye, which is what
    // a bad signal looks like. Turn it up and the region becomes a snowstorm,
    // which is weather, which this game does not have.
    motes: {
      density: 0.09,
      color: "#c6c2d8",
      // IT HAS TO MOVE A LITTLE OR IT IS A DECAL. One pixel over a whole cycle,
      // which the jump below swamps entirely — this is here so the mote is air
      // rather than a mark on the ground, and there is a test that every kit
      // drifts.
      drift: 1,
      sway: 0,
      // A THIRD OF A SECOND, which is a rate nothing else in the file goes near
      // and the reason it may: this is not a body moving (see MoteKit's "anything
      // brisk reads as an insect"), it is a sample being taken. Slower and it
      // reads as slow snow; faster and it stops resolving into individual pixels
      // and becomes a grey haze.
      period: 0.34,
      shape: "noise",
      size: 1,
    },
    // THE PICTURE COMING APART (see BiomeDef.glitch). Magenta and cyan, which is
    // not a taste so much as what a separated signal actually separates INTO —
    // the two channels furthest from each other and from the region's own greens,
    // so a fringed mark reads as one thing failing to line up with itself rather
    // than as three small coloured plants.
    //
    // Dimmed well below both inks they sit beside: at full strength a fringe is a
    // pixel of magenta on a green floor, which the eye reads as an OBJECT. What is
    // wanted is the mark not quite agreeing with itself, and that lives at about a
    // third.
    glitch: {
      warm: "#c8407a",
      cold: "#3fd0d8",
      // A third of the marks. Every mark torn is a font; none is a palette.
      tear: 0.34,
      // MEASURED AGAINST THE SCREEN RATHER THAN CHOSEN: at 0.006 per row-run a
      // 25-tile view holds a handful of tears at a time, which is a wood with
      // something wrong with it. At ten times that it is a broken television, and
      // the trees stop being visible through it.
      bars: { density: 0.007, run: 40, period: 0.4 },
    },
    // The floor's own wrongness, in marks: short vertical runs and a lone pixel,
    // in the crown ink rather than the tuft's. Nothing here is a plant, and that
    // is the point — it is what the ground cover would look like if you could not
    // quite make it out.
    decor: {
      density: 0.07,
      marks: [["x", "x"], ["x.", ".x"], ["xx"], ["x"]],
    },
    // Mushrooms in the wrong colour, like everything else. Still a `mushroom`.
    mushroomCap: { cap: "#8f86a8", lit: "#b3aac9", gills: "#5a5470" },
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
    crownRows: [5, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7],
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
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    crownOverlap: 3,
    // LAWN DAISIES, AND NOT ONE PIXEL OF PINK. The row that refused a ground
    // bloom (see the note above `crownGaps`) gets its kit on the terms the
    // refusal set. What was refused was petals — the crown's own colour doing a
    // third job on the floor it is meant to be seen against. A daisy is a
    // different sentence: it is the flower of KEPT grass, and "mown, ordinary,
    // tidy" is what this floor already says about itself in the tuft note.
    // White heads with a gold eye, no stem rows at all — a daisy in a mown lawn
    // is a head sitting IN the turf, not a plant standing on it.
    //
    // No season, and that is the plant rather than an oversight: Bellis
    // perennis flowers in cut grass nearly the whole year, which makes it the
    // one ground flower that can live honestly under trees that are stubbornly
    // in blossom all twelve months. Sparse, so the ground still reads bare —
    // the refusal's finding survives the kit.
    decor: {
      density: 0.05,
      accent: "#f6f3e6",
      core: "#e3be58",
      marks: [
        [".o.", "o*o", ".o."],
        ["o*o", ".o."],
      ],
    },
    // Falling petals, and they fall all year because these trees are stubbornly
    // in blossom all year (§EVERY COLOUR IS A TINT — "Blossom Rows stay
    // stubbornly pink"). A seasonal petal would be the one thing in this file
    // that read the month for something other than colour.
    // SATURATED, not pale. A petal drawn near-white sat on pale green grass as a
    // pixel a shade off the ground and vanished; magenta found it in one shot.
    // A mote has to win against what it FLIES OVER, and here that is a lawn.
    motes: { density: 0.3, color: "#e79ec4", drift: -22, sway: 5, period: 9, size: 2 },
  },

  // --- The redwoods, and what is at the middle of some of them ----------------
  //
  // SITED LIKE THE BLOSSOM ROWS, not rolled — see sim/world.ts §redwoodSiteAt —
  // and for the blossom's reason turned up one notch: a region you happen into
  // is scenery, and a wood you walked to is a destination. Unlike the blossom
  // rows there is more than one of them: they recur outward forever on their own
  // ring and spacing, the way a found place does, so walking further always
  // finds another and none of them is the last.
  //
  // THE LIGHT HERE IS ON THE TRUNKS. Every other dark region in this file solves
  // its own dimness somewhere else — the glimmer lights the floor, the dusk
  // lights the air. This one lights neither: the floor is duff and the canopy is
  // nearly black, and the one bright thing in the whole region is the bark. That
  // is what a redwood wood actually looks like from inside, and it is the only
  // sentence here that no other row is already saying.

  /** The wood itself: dense, red-boled, and dim at the floor. */
  redwoods: {
    id: "redwoods",
    name: "the redwoods",
    // Denser than the pines, which held the record — but note where this row is
    // NOT allowed to compete: it is sited at a fixed ring rather than rolled by
    // distance, exactly as the blossom rows are (2.6), so a density above the
    // field's is a lateral choice and never a payout for walking further. The
    // far-country test measures the rolled rows and leaves the sited ones alone
    // for precisely this reason.
    trees: 2.4,
    rocks: 0.2,
    // Damp, shaded, deep litter. Under the fen's, which keeps the record where
    // it belongs — the mushroomiest place there is stays the mushroomiest place
    // there is.
    mushrooms: 0.08,
    water: 0,
    // A wood that drops enormous limbs and keeps them. The floor of a real one
    // is more fallen wood than standing anything, and this is the heaviest here
    // — a shade over the pinewood's, which had held it.
    deadwood: 1.25,
    // SWORD FERN, and the second region ever to ask for undergrowth. The
    // glimmer's note argued it on knee-height rhyme; this one argues it on the
    // plainest ecology in the file — the understory of a coast redwood forest is
    // ferns, to the point that a photograph without them looks wrong.
    shrubs: 0.5,
    // DUFF, NOT GRASS. Pulled harder than any ground in the file bar the dusk's,
    // because the target is a long way from where it starts: grass is
    // (139,191,90) and green is the stubborn channel, so anything gentler leaves
    // an olive lawn under near-black trees. This lands near (112,89,53) — bare
    // needle litter, which is what is actually underfoot in here.
    ground: { color: "#6a4526", amount: 0.88 },
    tuft: { color: "#855e38", amount: 0.75 },
    // What comes up through litter: sorrel and small stuff, with plenty of bare
    // duff between. No blades — there is no grass on this floor, and the two
    // uprights would be the one mark claiming otherwise.
    tufts: ["sprout", "cluster", "dot", "dot"],
    // Near-black, and held nearly as hard as the pinewood's. A coast redwood is
    // an evergreen conifer: it does not turn, and the canopy that makes this
    // region dark has to stay dark in October or the whole reading goes with it.
    crown: { color: "#1c3328", amount: 0.72 },
    // THE ONE BRIGHT THING IN THE REGION, and the second trunk in the game to
    // carry a species on its own (the birches were the first). Cinnamon, pulled
    // past halfway so it arrives — the note on the birch's white is the lesson
    // being reapplied: a stem tinted gently keeps most of the base brown and
    // reads as an ordinary tree standing in a strange wood.
    trunk: { color: "#a5522c", amount: 0.6 },
    // The tallest ordinary trunk in the world — half again the birch's, which
    // held the record at 20. The foliage sits above it in a narrow column, so
    // what you are mostly looking at, standing in here, is bare red stem going
    // up out of frame.
    trunkHeight: 30,
    // FLUTING, NOT DASHES. The birch's marks are horizontal because a birch's
    // are; a redwood's bark is furrowed straight up and down, in runs long enough
    // that at this size the RUN is the drawing and the individual pixels are not.
    // Broken every few rows, because an unbroken column down a 30px trunk is a
    // pinstripe and reads as something manufactured.
    //
    // Dark red-brown rather than charcoal: the birch's note says a true black
    // mark on a pale trunk is a hole punched through the tree, and the same
    // arithmetic applies to a bright one.
    bark: {
      color: "#5a2a18",
      marks: [
        [
          "x..", "x..", "x..", "...", "..x", "..x", "..x", "..x", "...", "x..",
          "x..", "x..", "x..", "...", "..x", "..x", "...", "x..", "x..", "x..",
          "...", "..x", "..x", "..x",
        ],
        [
          "..x", "..x", "...", "x..", "x..", "x..", "...", "..x", "..x", "..x",
          "..x", "...", "x..", "x..", "x..", "...", "..x", "..x", "..x", "...",
          "x..", "x..", "x..", "x..",
        ],
        [
          "x..", "x..", "x..", "x..", "x..", "...", "..x", "..x", "..x", "...",
          "x..", "x..", "...", "..x", "..x", "..x", "..x", "...", "x..", "x..",
          "x..", "...", "..x", "..x",
        ],
      ],
    },
    // A COLUMN, NOT A CONE. Narrow all the way — six half-widths at its widest,
    // where the fen's willow reaches eight — and held at that width for most of
    // its length instead of tapering. That is what a crown looks like when it has
    // grown in competition on every side: there is nowhere to spread, so it goes
    // up. Twenty-two rows on a thirty-pixel trunk puts the foliage well up the
    // tree, which is the other half of the same fact.
    crownRows: [1, 2, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 2],
    // Wet, dark, and mostly buried. The fewest rocks of any region that has any,
    // so this is nearly a note about what the floor is NOT.
    stone: { tint: { color: "#4e4034", amount: 0.34 }, shapes: ["slab", "boulder"] },
    // NOT RED, AND "IT IS A CONIFER" IS NOT THE DEFENCE IT LOOKS LIKE. The first
    // draft kept the default cap on exactly that reasoning — fly agaric partners
    // pine and spruce, a redwood is a conifer, done — and `render/palette.test.ts`
    // asked the question its whitelist exists to force. Amanita muscaria is
    // ectomycorrhizal, and coast redwood is one of the few conifers that does not
    // form ectomycorrhizae at all; it is an arbuscular host. So this is the fen's
    // situation precisely, wearing a family resemblance to a host as a disguise.
    //
    // Cream, and pale for the glass wood's stated reason rather than a new one: a
    // gathered thing has to be findable, and this is the darkest floor in the
    // game. Greyer than the glimmer's champagne — that one is lit and this one is
    // merely light-coloured, which is a distinction the two regions would have to
    // make if they ever stood next to each other, and they never will.
    mushroomCap: { cap: "#ddd3b8", lit: "#f2ecd8", gills: "#9c9070" },
    // REDWOOD SORREL for the decor: Oxalis oregana, which carpets these woods and
    // essentially only these woods, and is the plant anybody who has stood in one
    // remembers underfoot. Trefoil — three leaflets round a point — which is a
    // shape nothing else in this file draws, so it reads as itself even where the
    // green is nearly lost in the shade.
    //
    // The accent does NOT travel with the season (see DecorKit), which is what
    // lets the one green thing on this floor stay green in October while the duff
    // and the canopy do whatever the year is doing.
    decor: {
      density: 0.14,
      accent: "#6f9a52",
      marks: [
        ["o.o", ".o.", ".x."],
        ["o.o", ".o.", ".x.", ".x."],
        [".o.", "o.o", ".x."],
      ],
    },
  },

  /** THE STAND OF GIANTS — the middle of about one redwood wood in four, and the
   *  thing this whole pair of regions exists to arrive at.
   *
   *  IT IS THE SAME WOOD, NOT A DIFFERENT ONE. Every colour here is the
   *  redwoods' own, unchanged, and that is the entire trick: nothing announces
   *  that you have crossed into it, because nothing about the light or the
   *  ground or the palette has changed. What changed is the SIZE of the trees,
   *  which is a thing you notice by looking up rather than by being told — and
   *  since there is no UI that names a region (see BiomeDef.name), nothing is
   *  ever going to tell you.
   *
   *  FEWER TREES, NOT MORE. Half the redwoods' density: a grove of giants is
   *  widely spaced, because each one has taken the space. It also keeps the walk
   *  through it legible — trees this size at 2.4× would be a wall, and you would
   *  arrive at the most impressive thing in the world and not be able to see it.
   *
   *  AND IT YIELDS EXACTLY WHAT EVERY OTHER TREE YIELDS. Eight wood. There is no
   *  giant-sequoia material, no finish, no unlock; the reward for finding this is
   *  that you found it. That is DESIGN §Biomes at its plainest, and this row is
   *  the biggest temptation in the file to break it. */
  giants: {
    id: "giants",
    name: "the giants",
    trees: 1.1,
    rocks: 0.15,
    mushrooms: 0.06,
    water: 0,
    deadwood: 0.8,
    shrubs: 0.25,
    // The redwoods' floor, quoted rather than re-derived — see the header. If one
    // of these ever changes, both change.
    ground: { color: "#6a4526", amount: 0.88 },
    tuft: { color: "#855e38", amount: 0.75 },
    tufts: ["sprout", "cluster", "dot", "dot"],
    crown: { color: "#1c3328", amount: 0.72 },
    trunk: { color: "#a5522c", amount: 0.6 },
    mushroomCap: { cap: "#ddd3b8", lit: "#f2ecd8", gills: "#9c9070" },
    // Forty pixels of bare stem — two and a half tiles before the foliage starts,
    // where the tallest thing in the rest of the world is a thirty-pixel redwood
    // trunk. The sprite comes to about sixty-six, which is four tiles: the largest
    // thing that has ever been drawn standing on this ground.
    //
    // The renderer takes the height from trunk plus crown, so occlusion stays
    // honest for free, and `hideFactor` already fades any tree tall enough to
    // swallow the player — which is how a tree this size is allowed to exist at
    // all without a rule about where it may stand.
    trunkHeight: 40,
    // THE POINT OF THE WHOLE ROW. Eight pixels of trunk against everything else's
    // four: this is the tree you cannot get round, and girth is what says so.
    // Height alone said "mast" — see the note on `trunkGirth`.
    trunkGirth: 2,
    // The redwoods' fluting, widened to the stem it is now on. Same runs, same
    // breaks, two more furrows — a bigger tree of the same species has more of
    // the same bark, not different bark.
    bark: {
      color: "#5a2a18",
      marks: [
        [
          ".x...x.", ".x...x.", ".x...x.", ".x.....", ".x...x.", ".....x.",
          ".x...x.", ".x...x.", ".x.....", ".x...x.", ".x...x.", ".x...x.",
          ".....x.", ".x...x.", ".x...x.", ".x.....", ".x...x.", ".x...x.",
          ".x...x.", ".....x.", ".x...x.", ".x...x.", ".x.....", ".x...x.",
          ".x...x.", ".x...x.", ".....x.", ".x...x.", ".x...x.", ".x...x.",
        ],
        [
          "x..x..x", "x..x..x", "x..x...", "x..x..x", "...x..x", "x..x..x",
          "x..x..x", "x.....x", "x..x..x", "x..x..x", "...x..x", "x..x..x",
          "x..x..x", "x..x...", "x..x..x", "x..x..x", "x.....x", "x..x..x",
          "...x..x", "x..x..x", "x..x..x", "x..x...", "x..x..x", "x..x..x",
          "...x..x", "x..x..x", "x..x..x", "x.....x", "x..x..x", "x..x..x",
        ],
        [
          ".x..x..", ".x..x..", "....x..", ".x..x..", ".x..x..", ".x.....",
          ".x..x..", ".x..x..", ".x..x..", "....x..", ".x..x..", ".x..x..",
          ".x.....", ".x..x..", ".x..x..", ".x..x..", "....x..", ".x..x..",
          ".x..x..", ".x.....", ".x..x..", ".x..x..", ".x..x..", "....x..",
          ".x..x..", ".x..x..", ".x.....", ".x..x..", ".x..x..", ".x..x..",
        ],
      ],
    },
    // ROUNDED, AND WIDER THAN A CONIFER IS ALLOWED TO BE. `crownRows` says past
    // eight the crown overhangs its neighbours and that broadleaves may and
    // conifers may not — this row takes the exception, on the grounds the rule
    // was written for: at 1.1× density there ARE no neighbours to overhang. It is
    // also true of the tree. An old giant sequoia has lost its spire and carries a
    // heavy rounded head, which is exactly how you tell one from the young ones —
    // so the silhouette is doing the same job the girth is.
    // THIRTY-FOUR ROWS, AND THE LENGTH IS THE FIX. At twenty-six it photographed
    // as a fat pole with an ordinary crown on it — the girth had arrived and the
    // MASS had not, so beside a plain redwood the giant read as the same tree
    // with a thicker stem. `crownRows` is height (see its doc), so the way to
    // make a tree bigger rather than merely wider is to give it more rows, and
    // hold the full width across most of them: this carries eight half-widths
    // for fourteen rows in a row, where the wood outside carries six for six.
    // The whole sprite comes to seventy-four pixels, four and a half tiles.
    crownRows: [
      2, 4, 5, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 6, 6, 6, 5, 5, 4,
      4, 3, 2,
    ],
    // The redwoods' sorrel, thinner. More light reaches this floor — the crowns
    // are enormous but there are half as many of them — and a carpet as thick as
    // the wood outside would argue with that.
    decor: {
      density: 0.1,
      accent: "#6f9a52",
      marks: [
        ["o.o", ".o.", ".x."],
        ["o.o", ".o.", ".x.", ".x."],
        [".o.", "o.o", ".x."],
      ],
    },
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
  ["meadow", { near: 2, far: 0.88 }],
  ["pinewood", { near: 1, far: 0.5 }],
  ["birch", { near: 1, far: 0.5 }],
  ["scrub", { near: 1, far: 0.5 }],
  // The fen decays least of the four. It is already the odd one near town — murky,
  // mushroomy, standing water — so it is the hinge between the ordinary regions
  // and the strange ones, and the drift outward reads as continuous rather than as
  // one set of regions being swapped for another.
  ["fen", { near: 1, far: 0.62 }],
  // The strange three, in the order they take over. Dusk is the commonest because
  // it is the mildest — a familiar wood at the wrong hour — so the first thing the
  // far country says is "the light is off here", not "you are somewhere else".
  //
  // THEIR NUMBERS WENT UP WHEN THE ORDINARY FAR ROWS ARRIVED, and that is a share
  // being defended rather than a change of mind about how strange the world is.
  // These three were 4.0 of 6.4 out there — 63% — when they were the only rows
  // with a far weight at all. The granite and the long grass are ordinary places
  // that happen to be far away — they are far-only because the `near` column is
  // frozen for saves, not because there is anything odd about a plain — and rows
  // like that appended flat would have quietly taken the plateau down to a third
  // strange. Scaled instead, every time one arrives: 5.3 of 10.6, which is half.
  ["dusk", { near: 0, far: 2.4 }],
  ["glimmer", { near: 0, far: 2.0 }],
  // The rarest, because it is the loudest. Glass is the one you walk into and
  // stop, and a plateau made mostly of it would be wallpaper by the second one.
  ["glass", { near: 0, far: 1.6 }],
  // APPENDED, AND THAT IS A COMPATIBILITY RULE RATHER THAN A HABIT. `near: 0`
  // contributes nothing to the cumulative walk at strangeness 0, so the near
  // world still rolls the old six-slot array tile for tile — which is the whole
  // proof `sim/biome.test.ts` rests on, and the reason a new region may never be
  // inserted into the middle of this table with a near weight on it.
  //
  // NOT ONE OF THE STRANGE THREE, and they sit after them to say so: these are
  // ordinary places that are merely far away, and the only reason they are far at
  // all is the frozen `near` column above. Their weights sit under every strange
  // row and over every decayed familiar one — enough that the plateau has plain
  // country in it, not so much that it stops being the plateau.
  //
  // THE FAMILIAR FIVE ARE THE FLOOR NOBODY MAY LOWER. Meadow, pines, birches,
  // scrub and fen hold 2.4 of 10.1 out here — a quarter, at nine hundred tiles —
  // and that is the number DESIGN §"the world gets stranger" is actually about:
  // a world with none of where you came from in it has stopped having anywhere to
  // be from. Adding a far row means scaling, never appending flat.
  //
  // THE THIRD TIME THIS COLUMN HAS BEEN SCALED, and the arithmetic is written out
  // here so the fourth person does not have to re-derive it. Two ordinary far rows
  // arrived at once — a salt flat and a marsh — which took the ordinary-far group
  // from three rows to five. Appended flat they would have pushed the strange
  // three from a half of the plateau down to about 44% and the familiar five from
  // a quarter to a fifth, which is the drift DESIGN §Biomes forbids: the far
  // country getting blander every time it gets bigger.
  //
  // So the whole column was restated to hold the two numbers the doc names. At the
  // plateau: 6.0 strange, 3.0 familiar, 3.0 ordinary-far, 12.0 total — a half, a
  // quarter and a quarter, which is what it was before these two rows and what it
  // must be after the next one.
  ["granite", { near: 0, far: 0.7 }],
  // The heaviest of the three ordinary far rows, because it is the one that is
  // easiest to be in: open, crossable, and with something on the horizon in every
  // direction. A plateau you can walk across wants somewhere to walk.
  ["prairie", { near: 0, far: 0.8 }],
  // The cinders are the rarest of the ordinary far rows and the only one that is
  // rare on purpose rather than by arithmetic. It is the loudest thing out there
  // that is not one of the strange three — black ground, dead trees, fire in the
  // seams — and the glass wood's note applies to it word for word: a plateau made
  // mostly of the loudest thing is wallpaper by the second one.
  ["cinder", { near: 0, far: 0.55 }],
  // THE MARSHES, at about the middle of the ordinary far rows. Wet country is the
  // one kind of place the near world already has (the fen), so a player meeting
  // this has something to compare it against — which is exactly what makes the
  // difference between damp ground with pools in it and an archipelago legible,
  // and the reason it can afford to be commoner than the flats.
  ["marsh", { near: 0, far: 0.65 }],
  // THE RAREST ROW IN THE TABLE, under even the cinders, and the third region to
  // be rare because it is loud rather than because the arithmetic worked out that
  // way. The glass wood's note is the argument and it is stronger here: a plateau
  // with much white nothing in it is not a strange world, it is an unfinished one.
  ["salt", { near: 0, far: 0.3 }],
];

export function biomeDef(id: BiomeId): BiomeDef {
  return BIOMES[id];
}
