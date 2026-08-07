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

/** What a bush in a region actually is. `bush` is the generic dome every region
 *  drew before this existed — see `drawShrub`, where its proportions are argued
 *  out — and anything else is a named plant with its own art. */
export type ShrubShape = "bush" | "pear";

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
  /** WHICH PLANTS THAT UNDERGROWTH IS, as a weighted list — an entry written
   *  twice is drawn twice as often, exactly as `stone.shapes` and `tufts` are
   *  read. Optional; absent, every bush is a bush.
   *
   *  IT EXISTS SO A REGION CAN HAVE A PLANT AND NOT JUST A DENSITY. Until now
   *  `drawShrub` derived one generic dome from the region's crown, which is the
   *  right default and says nothing: a bush in the pines and a bush in the scrub
   *  differ by a few pixels of width and a tint. The scrub wanted a PRICKLY PEAR,
   *  and a prickly pear is not a narrower dome, it is a different object.
   *
   *  WHY THE SHRUB NODE AND NOT SOMEWHERE ELSE, because both alternatives were
   *  considered and both are wrong. As `decor` it would be paint — capped at 5×5
   *  by the band rule, and walkable, which is the one thing a cactus must not be.
   *  As a tree form it would be fellable for eight wood and would have to survive
   *  the same-species girth rule (§TreeShape). The shrub node is already solid,
   *  already two wood, and already the scrub's commonest plant; this changes what
   *  it looks like and nothing else.
   *
   *  KEEP THE UNUSUAL ONE IN THE MINORITY. A list is weighted precisely so that
   *  the strange plant can be rare — if every bush in the scrub were a cactus the
   *  region would stop being chaparral and start being desert, which is a place
   *  this game already has one of. */
  shrubShapes?: ShrubShape[];

  /** FRUIT ON THAT UNDERGROWTH: the ink for a berry pixel and the month it is
   *  on. Optional, and meaningless without `shrubs` — this is paint applied to
   *  the bush sprite, so a region with no bushes has nothing to paint.
   *
   *  IT IS PAINT AND IT CHANGES NO NUMBER, which is the whole reason it was
   *  allowed to be fruit at all. A berried bush chops for the same two wood a
   *  bare one does, in the same swing, all four seasons; nothing here is picked,
   *  counted or waited for. That keeps it inside the rule the DecorKit season
   *  field is under (§DecorKit.season, DESIGN §Materials — a season reaches
   *  APPEARANCE and never a number) while sitting on a gathered node, which is
   *  new: the bush was already there in January and is already yours to fell.
   *
   *  WHY IT IS NOT ITS OWN SCATTER. A blueberry patch drawn as ground decor
   *  would have put berries on the grass BESIDE the bushes — two unrelated
   *  layers claiming the same plant — and a gathered berry would have made a
   *  region a reason to walk somewhere for a material, which §shrubs above
   *  forbids in the field right over this one. Painting the node that is already
   *  standing there is the only version that is one plant.
   *
   *  Expect to be asked why you cannot pick them. That is the trade: the alternative
   *  is a foraging economy with a season on it, and this game has no daily caps
   *  and no scarce materials to hang one from.
   *
   *  `spots` is `[dx, row]` from the bush's own top-centre, and it is DRAWN
   *  rather than rolled — see §orbs.spots, which learned this the expensive way
   *  and is the same fact about a smaller mark. The first cut here scattered a
   *  berry per row off a hash and made CLUSTERS: two rows that happen to agree
   *  put their fruit a pixel apart, and two pixels touching at this size is one
   *  bigger object. A nut in a bush, not berries on one.
   *
   *  So the arrangement is a composition and the hash only picks WHICH of them a
   *  bush wears. More than one, on the decor kit's rule (§DecorKit.marks): a
   *  single arrangement repeated over the fifty bushes on a screen would read as
   *  printed however well it was drawn, and orbs got away with one only because
   *  `chance` leaves most trees unlit. Every bush in a barren fruits. */
  berries?: { season: SeasonId; color: string; spots: [number, number][][] };
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

  /** HOW MUCH OF THE MONTH THIS REGION ACTUALLY TAKES — 1 (all of it) unless
   *  stated, which is what every region did before this existed.
   *
   *  A PINE DOES NOT CHANGE COLOUR IN THE YEAR. The light does, and that is a far
   *  smaller thing than a crown turning over. Before this field the only way to
   *  say so was to raise `crown.amount` until the season could not get past it —
   *  and that resists the DARK as well, because the tint sits on whichever arm
   *  the hour picked, so a wood that refused October also refused midnight. This
   *  dial is on the season axis alone (§ScenePalette.baseCrown).
   *
   *  Four regions were measurably wrong without it, all of them named for
   *  conifers: the granite's Jeffrey pine swung 39 RGB from July to October, the
   *  redwoods and the giants 30, the pines 26 — against a deciduous birch wood's
   *  67. A third to a half of a real turn, on trees that do not turn at all.
   *
   *  NOT ZERO, THOUGH. A low pull is the light changing and no pull is a sprite
   *  that has been cut out of the season and pasted back on top of it — the wood
   *  goes on looking like July while the ground and sky around it are November.
   *  0.15 is about "you can tell the light is different"; it is deliberately not
   *  0, and that is the whole of what this field is for.
   *
   *  `ground` is the same dial for the floor, and the pines needed it for the
   *  same reason the crowns did: a needle mat browning like a lawn is a lawn. */
  seasonPull?: { crown?: number; ground?: number };

  /** SNOW LYING ON THIS GROUND, in winter and only in winter. Optional, and
   *  absent means the region keeps the ordinary pale winter turf every region had
   *  before this existed.
   *
   *  IT IS A COLOUR AND NOT A LAYER, WHICH IS THE WHOLE OF WHY IT IS ALLOWED.
   *  `content/seasons.ts` refuses a snow layer outright, and both of its stated
   *  reasons are about a layer: snow sitting on every cell is the per-cell edges
   *  band (CLAUDE.md, which has caught this project three times), and snow that
   *  melted would be the first weather in the game with state. A per-region tint
   *  on the ground has neither — nothing is drawn per cell, nothing is stored,
   *  nothing melts. Winter is still a colour temperature; this says the
   *  temperature is different where there is snow on the floor.
   *
   *  A SEPARATE FIELD FROM `ground`, and the meadow is why. The town's own region
   *  states no ground direction at all — `amount: 0`, asserted by
   *  `palette.test.ts` as the identity that keeps every live save's lawn the
   *  colour it has always been — so snow could not be spelled as a ground tint
   *  there without giving up the guarantee. It composes AFTER the region's
   *  ordinary tint instead, which also means a region can be both itself and
   *  under snow: the granite is still grey rock, with snow on it.
   *
   *  OPT-IN, and the four rows that have it are the ones that would: an alpine
   *  dome, a boreal pine wood, a sequoia grove and the town.
   *
   *  AMOUNT IS NOT DEPTH, WHICH IS THE TRAP IN THIS FIELD. It is distance from
   *  the floor's OWN winter colour, and that floor has already been through the
   *  region's tint — so the same number means different amounts of snow depending
   *  on how hard the region paints its ground. Drafted at "how deep it lies", the
   *  pines came out `#b3c6aa` at 0.5 (a pale GREEN — frost on grass, not snow)
   *  and the redwoods `#b1aaa0` at 0.6 (a warm taupe, which reads as dust), while
   *  the meadow at 0.8 was correctly white — because the meadow tints its ground
   *  by nothing at all and those two tint theirs hard.
   *
   *  So the numbers are set by what they RESOLVE to, not by what they mean, and
   *  each row records its colour. Check the hex, not the amount.
   *
   *  AND THE FIRST SET RESOLVED TOO DARK — around luma 205, which photographs as
   *  slush. Snow in daylight is very near white; the caution that talked this
   *  down ("a pure white ground will fight the HUD") was right about #ffffff and
   *  wrong about everything between there and grey. Every row is now fitted to
   *  land at luma 233 — bright, faintly blue, and still four points off white so
   *  the lit sides of things have somewhere to go. */
  snow?: Tint;

  /** THE GROUND THIS REGION WEARS IN A NAMED MONTH, over its year-round tint and
   *  under any snow. Optional, and the scrub is the only row with one.
   *
   *  A REGION WHOSE YEAR RUNS BACKWARDS. Every other row here is greenest in
   *  summer because the SEASON is, and the region's own tint only says how far it
   *  departs from that. Dry Mediterranean country does the opposite and it is the
   *  most legible thing about it: the rains come in winter, the hills flush green
   *  through the wet months and the wildflowers with them, and then it is brown
   *  from late spring until the rains come back. A row with one tint for all four
   *  months could say "parched" but could never say "parched EIGHT MONTHS OF THE
   *  YEAR", which is a different and better sentence.
   *
   *  WHY IT IS NOT `snow` GENERALISED. Snow got here first and keeps its own
   *  field for two reasons that still hold: it is fitted to a specific luma (233,
   *  measured on the result — §snow), and it reaches SAND, which is a claim about
   *  weather lying on things. This is turf only, because a green flush is
   *  something that GREW, and a beach does not grow. Composing them in that order
   *  — region, then month, then snow — means a row could in principle green in
   *  February and still lie under snow in the same month; nothing does, and the
   *  order is what makes that legible rather than a conflict.
   *
   *  Keyed by month rather than a single tint plus a list of months, because two
   *  wet months are rarely the same colour: the first flush and the full green
   *  are different pictures, and a region that could only say one of them would
   *  have to pick.
   *
   *  Blended across borders per key (`blendRegions`), on the snow's own argument
   *  — rains that arrived along a straight line would be the seam that function
   *  exists to prevent. */
  seasonGround?: Partial<Record<SeasonId, Tint>>;

  /** HOW MUCH OF THIS GRASS STANDS THROUGH THE SNOW, as the fraction of cells
   *  keeping their tuft in winter. Optional; 0.2 where a region has `snow` and
   *  meaningless without it. Ignored in every other month, when the ordinary 0.38
   *  applies everywhere.
   *
   *  A LAWN IS BURIED AND LONG GRASS IS NOT, which is the whole of this field. A
   *  tuft on 38% of cells is texture on grass and DIRT on a snowfield — the mark
   *  takes the canopy's ink, which winter makes bare-branch brown, so the town
   *  came out speckled brown at better than one cell in three and read as slush
   *  however bright the snow under it was. Thinning to a fifth fixed the town and
   *  emptied the PRAIRIE, whose stems standing up out of the white were the best
   *  thing in the season: that region's grass is knee-high and stays visible in a
   *  way a mown common does not.
   *
   *  IT THINS THE GROUND KIT TOO, against the same 0.38, because that is the same
   *  fact about the same plants. Cutting the kit outright was the first go and it
   *  cost the prairie its winter: that region's `decor` IS its long grass, so
   *  "bury what is low" deleted the stems standing out of the white. One number,
   *  both layers.
   *
   *  So it is a number per region and not a constant, and the two ends of it are
   *  a mown common and a grassland. */
  stubble?: number;

  /** WHICH WAY THIS REGION TURNS, in the one month anything does. Optional, and
   *  absent means it turns whichever way the season does — which until now was
   *  the only option and is most of why October read as one flat colour: every
   *  crown in the game landed on the same burnt orange, pulled only by whatever
   *  tint it wears in every other month too. A birch and a maple could not
   *  differ.
   *
   *  Applied LAST — after the region's year-round `crown` — and only in autumn.
   *  It was written the other way round first, as a direction into the season's
   *  answer with the region's own tint over the top, and the blossom rows
   *  disproved that in one measurement: pink strong enough to repaint anything
   *  under it turned October's crimson back into April's pink, two luma from the
   *  ground it stood on. `crown` says what a region's foliage IS; in autumn it is
   *  something else, and the month has to be able to say so. */
  autumnCrown?: Tint;

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

  /** Extra pixels of trunk EITHER SIDE of the ordinary five. Optional; 0 —
   *  which is every region but the giants, and is why nothing that already
   *  stands anywhere moved when this arrived.
   *
   *  HEIGHT WAS ONLY HALF OF BIG, exactly as `crownRows` was only half of tall.
   *  A giant sequoia's whole claim is girth: it is the trunk you cannot get
   *  round, and drawn at the world's ordinary five pixels a sixty-pixel one
   *  reads as a very tall ordinary tree — a mast, which is the opposite of the
   *  thing. Three attempts at saying "giant" with height alone all came out as
   *  the birch's sentence spoken louder.
   *
   *  IT DOES NOT MOVE THE CENTRE. The trunk grows symmetrically about its own
   *  column, so the crown's midline, the bark grid's midline and the `crownGaps`
   *  notch all still land where they always did — which is what keeps this one
   *  number rather than a second coordinate system for wide trees. That only
   *  holds because the base width is ODD; it was even for a while and the whole
   *  tree hung half a pixel off its stem (renderer.ts §trunk).
   *
   *  Keep it small. The trunk is 5 + 2× this, and half a tile (8px) is already
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

  /** WHAT THE UNDERGROWTH DOES IN OCTOBER, where a bush disagrees with the tree
   *  over it. Optional; absent, a bush is drawn exactly as the region's canopy is
   *  in every month, which is what every region does and all but one still do.
   *
   *  THIS SHIPPED ONCE AS `shrubCrown` — a year-round foliage tint for the
   *  undergrowth — and was pulled the same afternoon. It was the right mechanism
   *  aimed at the wrong thing: it took a LOW amount so the season could do the
   *  work, and the season's autumn was a pumpkin orange, so a blueberry barren
   *  came out russet and read closer to a boulder than to a turned bush. What was
   *  missing was not a shrub tint, it was any way for a region to say WHICH WAY
   *  it turns — which `autumnCrown` now is, for trees.
   *
   *  So this is that field's undergrowth half, and it states the colour outright
   *  rather than deferring to the month: a lowbush blueberry goes a vivid
   *  crimson-purple, which is not a direction the season's own orange passes
   *  through on the way to anywhere.
   *
   *  ONE MONTH ONLY. A bush that wore its own colour all year would be a second
   *  species standing under the trees; the shape is still inherited from the
   *  crown rows, and for eleven months so is the colour. */
  shrubAutumn?: Tint;

  /** A SECOND FORM OF THE SAME TREE, and further ones if a region ever wants
   *  them. Optional; absent means every tree in the region is the one silhouette
   *  the four fields above describe, which is what all of them did until now and
   *  what most of them still do.
   *
   *  THE TREE WAS THE LAST REPEATED MARK IN THE GAME DRAWN FROM ONE TABLE, which
   *  is the argument for this and it is not a new argument: ROCK_SHAPES has
   *  three, a `DecorKit` must have more than one mark, `bark.marks` must have
   *  more than one grid, `tufts` is a list. Each of those is a list because a
   *  single repeated glyph reads as PRINTED — and the tree is the largest
   *  repeated sprite on screen, so it was the one paying most for it.
   *
   *  TWO, AND THE SAME SPECIES TWICE. Not two species: the silhouette is how a
   *  region says which region it is (colour alone left the pines reading as a
   *  dark meadow), so a stand with two unrelated outlines in it stops being
   *  anywhere. What varies is what varies in a real even-aged stand — how much
   *  skirt a tree kept, how much bare pole it has, how high its crown sits. That
   *  also keeps each pair cheap to author, because the second form is the first
   *  one with a reason applied to it rather than a blank page.
   *
   *  IT IS A RECORD AND NOT A BARE ARRAY because `crownGaps`, `crownOverlap` and
   *  `trunkHeight` all describe the same tree as `crownRows` does. A skirted pine
   *  and a brushed-out one differ mostly in `overlap` and stem, so forms sharing
   *  one region-wide overlap would be forced to be the same tree in the one
   *  respect that distinguishes them.
   *
   *  `trunkHeight` left out means the REGION's, not the renderer's default — a
   *  form that only redraws the crown keeps the species' stem. Read them through
   *  `treeForms`, which is the only thing that knows the row's own fields are
   *  form zero. */
  crownAlt?: TreeShape[];

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
    /** How much of what GROWS survives on the sheet, as a multiplier that reaches
     *  its full strength where the sheet does. Optional; 1 — nothing thins — which
     *  is what a sheet that is a different kind of ground rather than an absence
     *  of it wants (the long grass's swathes).
     *
     *  BALD GROUND WITH A BUSH ON IT IS NOT BALD, which is the whole of why this
     *  exists. The sheet is paint and the scatter is generation, so until now the
     *  two knew nothing about each other: the scrub's bare dirt came out carrying
     *  exactly as many bushes as the turf beside it, which reads as a stain on the
     *  ground rather than as ground with nothing on it.
     *
     *  IT IS THE ONE PLACE PAINT REACHES GENERATION, and it is allowed because it
     *  stays a total function of (seed, x, y) — the same field, sampled by the
     *  same call, in a generator that already samples three others. What it costs
     *  is that a sheet now moves SOLIDITY: a region that grows one where somebody
     *  has built is a region that can put a bush in a house. Near rows are open for
     *  this pass by decision (ROADMAP), and a future sheet on a shipped near row
     *  has to think about it again.
     *
     *  PLANTS ONLY, and stones deliberately keep their density. Rock lying on bare
     *  dirt is desert pavement and rock lying on a granite dome is what a dome
     *  does; it is the vegetation that has nowhere to put its roots. Thinning both
     *  would leave a smooth empty patch, which is a hole in the ground rather than
     *  a place in it. */
    bare?: number;
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

  /** What else grows here. Optional, and every region has one but the birches,
   *  which gave theirs up once its floor had four other things on it — see
   *  §birch, where the argument for dropping a kit is written down. A region with
   *  no all-year kit is not an empty one: the tuft speckle is still there at 38%,
   *  and in a region whose ground furniture IS grass that speckle is already the
   *  grass. */
  decor?: DecorKit;

  /** THE TOWN MOWS THIS ONE. Optional, and the meadow is the only row that asks.
   *
   *  Ground furniture — `decor`, `bloom`, and this region's mushrooms — fades in
   *  as you walk out of town instead of standing between the houses, over a ramp
   *  about a screen wide (sim/world.ts §townMown). Nothing else about the region
   *  changes: the trees, the rocks and the turf are the same inside the common as
   *  outside it, because a mown lawn is still the same field.
   *
   *  WHY IT IS A FLAG HERE RATHER THAN A RADIUS IN THE RENDERER. The rule is about
   *  the town and the answer is a distance, but WHICH REGIONS SUBMIT TO IT is a
   *  fact about the region — and it is not "whatever is near the plaza". A
   *  forest-edge town's pines begin at 24 tiles and keep every fern: the town mows
   *  its own grass and does not go into the wood to tidy up. Written as a radius
   *  alone that distinction has nowhere to live.
   *
   *  It replaces the older and more expensive version of the same idea, which was
   *  to give the meadow nothing anywhere. See sim/world.ts §townMown for what that
   *  cost, and DESIGN.md §Biomes. */
  mown?: boolean;

  /** A SECOND kit, for something that comes and goes. Same shape as `decor` and
   *  drawn the same way, on its own hashes so a bloom never lands where the
   *  year-round marks stand.
   *
   *  ONE PER SEASON, AND THE OLD RULE SURVIVES INTACT. This said "two slots
   *  rather than a list, because a list would invite a third and a fourth, and
   *  the ground has room for about two kinds of small thing before it stops
   *  reading as ground" — and that argument is about how much is underfoot AT
   *  ONCE. Blooms in different months never coexist, so a list of them is still
   *  two kinds of small thing on any given day: what is always here, and what is
   *  here now. The letter of the rule changed; the reason it existed did not, and
   *  `content/decor.test.ts` now enforces the reason directly by rejecting two
   *  blooms that share a season.
   *
   *  What asked for it was a dandelion. It is a yellow flower and then it is a
   *  clock, which is one plant needing two months of its own — and once that is
   *  expressible, so is a clover flower in the summer over the same leaves that
   *  were there in March.
   *
   *  Read it through `bloomsOf`, never directly: a single kit and a list of one
   *  mean the same thing and every caller should be blind to which was written. */
  bloom?: DecorKit | DecorKit[];

  /** HOW THIS REGION ENDS. Optional, and omitted means the ordinary fade, which
   *  is every region but two.
   *
   *  THE BLEND IS THE RULE AND THESE ARE THE PLACES THE RULE IS WRONG. Region
   *  borders fade over about ten tiles (sim/world.ts §BIOME_BLEND) because a hard
   *  step between two flat tints is a seam you can stand on, and 8d spent a whole
   *  step removing it. That argument is about two kinds of COUNTRY meeting — a
   *  wood and a scrub, a fen and a meadow — where nothing in the world says the
   *  change should be sudden, so a visible line is an artefact of the generator
   *  and of nothing else. The test for an exception is whether the PLACE has an
   *  edge, never whether the seam is convenient.
   *
   *  - `hard` — the salt flats. A pan is a LAKE BED and its edge is a shoreline:
   *    the crust ends where the water used to reach, which is a line you can
   *    stand on in life. Fading it is the artefact — a hundred tiles of
   *    neither-quite-turf-nor-quite-crust, a thing that exists nowhere.
   *
   *  - `fray` — the cinders and the caldera. A burn also has an edge, and it is
   *    nothing like a shoreline: fire stops where it stops, in tongues, leaving
   *    pockets that never caught. So the border is a HARD line that WANDERS —
   *    the same all-or-nothing answer, with a low-frequency field added to the
   *    weight before it is decided, which pushes the edge a few tiles in and out
   *    along its length. A blend across a burn says the fire faded out, which is
   *    not a thing fire does; a straight line says somebody mowed it.
   *
   *  - `outcrop` — the granite. Neither of the above, because what ends here is
   *    not a surface but a THING: bare rock. Rock does not get greener as you
   *    walk away from it; soil covers it, or it does not. So at this region's
   *    border its sheets stop being diluted and start being RARER — each outcrop
   *    keeps its own colour and the field has to be stronger to put one down the
   *    further out you are, until the last one. Country interfingering, which is
   *    what a batholith's margin does: a scatter of rock still poking through
   *    turf well past where the rock country stops.
   *
   *    It reaches the SHEETS ONLY. The granite's turf is turf, and turf fading
   *    into turf is precisely the case the blend was written for, so it keeps the
   *    ordinary fade. And inside the region nothing changes at all — a sheet's
   *    own soft window is deliberate (see §sheet: turf to bare rock is a bigger
   *    colour change than most borders make, and a narrow window puts a cliff in
   *    the middle of the country).
   *
   *  The field is the whole of why `fray` is not simply noise. A per-cell roll
   *  across the transition is a dithered gradient — visibly a computer easing
   *  between two colours — where a field several tiles long comes out as lobes,
   *  which is what a fire front leaves.
   *
   *  WHAT NEITHER DOES, and why they are safe. Neither touches `biomeAt`, so
   *  every guarantee built on the border stands. Both are RENDER-PATH answers
   *  only: the flora dither is untouched (sim/world.ts §scatterRegion, which is
   *  generation and moves solidity), so the trees still interleave across the
   *  approach and only the ground answers sharply — which is right for both
   *  places. Vegetation gives up before a pan's crust begins; a burn's margin has
   *  live trees standing in it and dead ones outside it.
   *
   *  And anything that FLOWS still fades (see `waterTint`): a stream carries the
   *  pan downstream, so the milk has somewhere to go. Crust and ash do not flow. */
  edge?: "hard" | "fray" | "outcrop";

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
  /** The stem ink for `x`, where the region's own is wrong for this plant.
   *  Optional; absent, a stem takes the region's canopy colour and seasons with
   *  it, which is right for almost everything and is what every kit did before
   *  this existed.
   *
   *  IT EXISTS FOR THE PLANTS THAT ARE STILL GREEN WHEN THE WOOD IS NOT. A
   *  black-eyed susan flowers in September and its stalk is green while it does —
   *  it is a living plant in autumn, not a dead one — but the meadow's canopy is
   *  burnt rust by then, so the stems came out rust with it and the flower read
   *  as a dried arrangement. A season reaches appearance, and appearance is
   *  exactly where a plant gets to disagree with the tree above it.
   *
   *  FIXED, LIKE `accent` AND FOR THE SAME REASON: this is a statement about what
   *  the plant IS, and a stem that browned in October would be the fault being
   *  described rather than fixed. Use it sparingly — a region whose every kit
   *  overrode its stem would be a region that had opted out of the year. */
  stem?: string;
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

/** The ordinary broadleaf: a standing oak, wider than it is tall.
 *
 *  Exported because the GROVE uses it too — her trees are the dark wood in this
 *  same silhouette, so a stand of them reads as trees that are wrong rather than
 *  as a different plant — and the DUSK, whose whole idea is a wood where the
 *  shapes are the ones you know and only the light is off. All three move
 *  together, which is why the shape lives here rather than in a row.
 *
 *  IT WAS A CAPSULE, AND FOR A LONG TIME. Twenty-four rows tall by fifteen across
 *  with a dead-straight fourteen-row column down the middle of it — taller than
 *  wide, parallel-sided, a pill. Nothing in a field looks like that. A broadleaf
 *  standing in the open is the opposite on every axis: WIDER than it is tall,
 *  widest well BELOW the middle, and tapering to a rounded top rather than
 *  running straight up to one.
 *
 *  Seventeen rows by fifteen across, widest from about a third of the way down to
 *  three quarters, with a long taper at each end. The PROFILE is the change and
 *  the numbers are only how it is spelled: the old shape's fault was fourteen
 *  rows at full width — parallel sides — and not its height.
 *
 *  IT WENT TO FOURTEEN ROWS FIRST AND CAME OUT AS A CAKE POP. Shortening the
 *  crown while leaving the trunk at sixteen made the canopy 47% of the tree, and
 *  a ball on a stick is what that reads as; the reference oaks are nearer three
 *  quarters crown. Seventeen puts it back over half without going back to a pill,
 *  because a dome that tapers at both ends is a different object from a column
 *  with a cap on it however tall either one is.
 *
 *  THE WIDTH COULD NOT MOVE, WHICH IS WHY THE HEIGHT DID. Two rules in
 *  `render/palette.test.ts` fence it in from both sides and both are worth
 *  keeping: no crown may exceed 8 half-widths, because past one tile a stand of
 *  trees smears into itself; and the blossom rows must stay the widest, because
 *  overfull is the whole of what that region is. The blossom is 8, so this is 7
 *  and was already 7. A broad tree drawn WIDER was never available — what was
 *  available, and what nobody had tried, was drawing it SHORTER.
 *
 *  NO WOBBLE IN THE SHOULDERS. It widens, HOLDS, and comes back in; it never
 *  alternates. That is the birches' hard-won rule (see their `crownRows`) and it
 *  matters more here because this crown is the widest in the file: 10,9,10 would
 *  be a legible notch in a silhouette this size, and a notch is damage.
 *
 *  WHAT DID NOT CHANGE IS THE TRUNK. No `crownOverlap`, no `trunkHeight` — the
 *  crown sits on top of the ordinary sixteen-pixel stem, which is what keeps a
 *  visible trunk under it. Drawn with the crown skirting down over the trunk it
 *  reads as the third reference photo, a maple whose canopy nearly touches the
 *  ground; on top, it reads as the first two, an oak you can see the legs of. The
 *  second is the one this game wants, and it is also the one that needs no
 *  per-region field — which is what keeps the grove, whose trees have no biome
 *  row at all, drawing the same tree.
 *
 *  AND IT GREW TWO ROWS AT THE SHOULDER when it stopped being the only tree in
 *  the meadow. Nothing about the taper moved: both rows went in at FULL WIDTH, in
 *  the middle, where the sides are already parallel — so the profile is the one
 *  argued for above and there is simply more of the widest part of it. The reason
 *  is the second form standing next to it (§meadow.crownAlt), whose crown is
 *  eight rows longer: at seventeen the two read as a tree and a bush rather than
 *  as one species, and the fix could not be to shrink the new one, because a
 *  skirted oak IS mostly crown. Two rows, not four: eleven-of-nineteen at full
 *  width is still well under the capsule's fourteen-of-seventeen.
 *
 *  It is the SHARED shape, so the grove and the dusk grew with it — which is what
 *  sharing it is for. All three are the same plant in different light, and a
 *  meadow oak that had quietly become a different size from the dusk's would be
 *  the whole reason this constant exists, undone. */
export const BROADLEAF = [2, 4, 5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 3];

/** One tree the way a region draws it — the four fields that describe a
 *  silhouette, travelling together. See §BiomeDef.crownAlt for why they have to.
 *
 *  Every rule the row's own fields obey applies here unchanged: half-widths,
 *  integer, at least one, never past 8 (a crown that wide draws over the tile
 *  beside it), and gaps only where they open to the outside. `palette.test.ts`
 *  asserts all of it over every form of every region rather than over the
 *  primary — a second silhouette nobody checked is how the first hole in a crown
 *  would get in. */
export interface TreeShape {
  /** Half-widths, top row first — `BiomeDef.crownRows` for this form. */
  rows: number[];
  /** Per row, the empty half-width over the trunk. See §BiomeDef.crownGaps. */
  gaps?: number[];
  /** Bottom rows standing beside the trunk. See §BiomeDef.crownOverlap. */
  overlap?: number;
  /** Bare stem, in pixels. Omitted, the REGION's own — a form that only redraws
   *  the crown keeps the species' stem. */
  trunkHeight?: number;
  /** How THICK that stem is — `BiomeDef.trunkGirth` for this form. Omitted, the
   *  region's own, which is what every grown pair wants: two histories of one
   *  tree have the same bole.
   *
   *  IT EXISTS FOR THE SAPLING AND IT IS THE HALF THAT MAKES IT ONE. The stem is
   *  five pixels everywhere, and `drawTree`'s own note says why — "a 3px stem
   *  under a 40px tree reads as a sapling that grew a hat". That sentence is a
   *  bug report about a grown tree and a SPEC for a young one: drawn on the
   *  region's five, the birches' sapling came out a fencepost with a shrub on
   *  top, because a stem as wide as its own crown is a post whatever height it
   *  is. Skinny is not a smaller version of thick; it is a different ratio, and
   *  this is the only field that can say so.
   *
   *  Negative narrows (`trunkSpan` keeps every width odd, so -1 is a three-pixel
   *  whip), and the bark grid and the shaded side follow it down. */
  girth?: number;
}

/** Every form of a region's tree, the row's own fields first.
 *
 *  The one place that knows `crownRows` and friends ARE form zero, which is what
 *  keeps the addition from touching a single region that did not ask for it —
 *  and, more to the point, what keeps the meadow's tree bit-identical. That row
 *  is the town's own tree and the view from the plaza is the thing biomes
 *  promised not to change (see `palette.test.ts`, which asserts the meadow still
 *  points at BROADLEAF itself and grows no second form).
 *
 *  Same shape of accessor as `bloomsOf`, and for the same reason: the renderer,
 *  the tests and the contact sheet should all be handed a list and never have to
 *  care which way a row spelled itself. */
export function treeForms(def: BiomeDef): TreeShape[] {
  const own: TreeShape = {
    rows: def.crownRows,
    gaps: def.crownGaps,
    overlap: def.crownOverlap,
    trunkHeight: def.trunkHeight,
  };
  if (!def.crownAlt) return [own];
  return [own, ...def.crownAlt.map((f) => ({ trunkHeight: def.trunkHeight, ...f }))];
}

/** A region's blooms, however the row wrote them.
 *
 *  `bloom` takes a single kit or a list, because most regions have one flower and
 *  the meadow has three across two months. Everything that reads them goes
 *  through here so neither form is a special case anywhere else — the renderer,
 *  the contact sheet and the tests all just get an array. */
export function bloomsOf(def: BiomeDef): DecorKit[] {
  if (!def.bloom) return [];
  return Array.isArray(def.bloom) ? def.bloom : [def.bloom];
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  /** The ordinary, and the town's own. Every number that decides where something
   *  SOLID stands is an identity — a 1× or a zero or an amount of 0 — which is not
   *  laziness but a PROMISE: the region containing the origin is always this one
   *  (see sim/world.ts), so a town that existed before biomes did generates
   *  exactly the terrain it always did. Change one of those and you re-landscape
   *  everybody's home.
   *
   *  IT USED TO BE EVERY NUMBER, AND THAT WAS THE WRONG PLACE TO PAY. The row's
   *  emptiness was read as the town's calm and was in fact the whole world's: this
   *  is the commonest region in the field at both ends of it (§FIELD_WEIGHTS —
   *  `near: 2`, `far: 0.88`), so a meadow four hundred tiles from any town was
   *  still the only ground in the game with nothing whatever on it, and the one
   *  region named for flowers had never had a flower in it.
   *
   *  So the calm moved to where it belongs. The town mows its own common (`mown`),
   *  and past it the meadow is a meadow: clover and plantain all year, buttercups
   *  in spring, and the occasional field mushroom. Every one of those is paint
   *  except the mushroom, and the mushroom is mown out of the town. */
  // NO `stone` ROW, deliberately: the meadow keeps the default grey and the
  // original three silhouettes, so the ground you already know looks exactly as
  // it did. Every other region is a departure FROM this one, and a departure
  // needs somewhere to depart from.
  meadow: {
    id: "meadow",
    name: "the meadow",
    trees: 1,
    rocks: 1,
    // FIELD MUSHROOMS, and the only number in this row that is not an identity.
    // Thin — a fifth of the birches' and a sixth of the fen's — because this is a
    // place you come across one, not a place you forage; and mown out of the town
    // entirely (`mown`), so the promise above still holds where it was actually
    // about anything, which is the ground people have built on.
    mushrooms: 0.02,
    water: 0,
    ground: { color: "#000000", amount: 0 },
    tuft: { color: "#000000", amount: 0 },
    // SNOW ON THE TOWN, and the field it needs exists because of this row: the
    // meadow states no ground direction at all, so its snow could not be spelled
    // as a ground tint without giving up the identity that keeps every live
    // save's lawn the colour it has always been (§BiomeDef.snow).
    //
    // THE DEEPEST OF THE FOUR, because this is the open ground — nothing over it
    // to hold the snow off, and it is also where you live. Winter was the
    // quietest season in the game by design; this is the month the hub gets to
    // look like somewhere, and the paths, the plaza and the vegetable beds stay
    // clear underneath it because a season may not touch what somebody built.
    snow: { color: "#f2f7fa", amount: 0.85 }, // → #e4ebe8
    // AND ALMOST NOTHING STANDS THROUGH IT (§BiomeDef.stubble). This is a mown
    // common with clover and plantain on it — the lowest ground cover in the game
    // — and a snowfall takes all of it. What is left is the odd blade, which is
    // what a lawn under snow actually shows.
    stubble: 0.15,
    // Ordinary lawn, and the town's own. Nothing to say about itself.
    tufts: ["cluster", "cluster", "blades"],
    crown: { color: "#000000", amount: 0 },
    trunk: { color: "#000000", amount: 0 },
    crownRows: BROADLEAF,
    // THE SECOND BROADLEAF, and it is the one that kept its lower limbs. The row
    // above is the town's tree and stays bit-identical (§treeForms: `crownRows`
    // and friends ARE form zero); this stands beside it as the same oak with a
    // different amount of bare pole — ten visible pixels of stem against sixteen,
    // under a crown that comes down to meet them.
    //
    // A SECOND FORM HERE HAD TO BE DECIDED LOOKING AT THE PLAZA, which is what
    // `render/palette.test.ts` used to hold the line on: half the trees you can
    // see from your own door change, and that is not something to sweep in with
    // whatever other region was being worked on. It was decided by looking, over
    // four photographs of this exact spot, and the note below is what they said.
    //
    // GIRTH IS PINNED AND HEIGHT IS PINNED, which is one more than the pines
    // pin. Both forms are 7 half-widths and both stand 35 tall (16 + 19 - 0
    // against 16 + 25 - 6), so the whole of the difference is WHERE the foliage
    // sits on the stem — the pinewood's rule, and it survives the move to open
    // ground because a field of trees at visibly different heights reads as
    // saplings among adults rather than as one kind of tree.
    //
    // IT WAS A LOZENGE TWICE BEFORE IT WAS A TREE, and both failures are the same
    // arithmetic. The crown may not exceed 7 (the blossom has to stay the widest,
    // and past 8 a stand smears into itself), so a bigger crown can only be
    // bought in ROWS — and 14 pixels across by 25 down is a capsule stood on end,
    // which is the exact fault BROADLEAF's own note records being cut out of the
    // first tree. What fixes it is not size but PROFILE:
    //
    //   • Blunt on top. The first cut opened 1,2,3 and came to a point; a
    //     standing broadleaf is a dome. It opens on 2 now, as BROADLEAF does.
    //   • Not symmetrical. The second cut tapered over five rows at each end and
    //     came out as an almond — a shape with no up. Eight rows of dome above
    //     the shoulders against five of close below them: the widest point sits
    //     low, which is where it sits on every field oak anyone photographs.
    //
    // The close is 6,6,5,3,2 rather than a taper to nothing, because these are the
    // rows that stand BESIDE the trunk: they have to reach it to read as foliage
    // hanging around a stem instead of a crown hovering over one.
    crownAlt: [
      {
        rows: [
          2, 3, 4, 5, 5, 6, 6, 6, //
          7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
          6, 6, 5, 3, 2,
        ],
        overlap: 6,
      },
    ],
    // THE TOWN MOWS ITS COMMON. See §BiomeDef.mown and sim/world.ts §townMown:
    // everything below this line fades in over a screen's walk out of town, so the
    // grass between the houses is the same grass it has always been and the
    // country is not paying for it.
    mown: true,
    // A FIELD MUSHROOM — Agaricus campestris, which is what actually comes up in
    // grassland, and the reason the row needs a cap at all: the default red with a
    // white speck is a fly agaric, which partners birch, pine and spruce, and this
    // region's tree is the ordinary broadleaf (see render/palette.test.ts, which
    // makes every region with mushrooms say which way it went). Cream rather than
    // white so it does not read as a mote or a stone, and pink gills, which are
    // the field mushroom's one identifying feature and the only warm colour on it.
    mushroomCap: { cap: "#efe7d5", lit: "#fffaf0", gills: "#c08a92" },
    // WHAT IS IN A FIELD ALL YEAR, and it is leaves rather than flowers. Clover,
    // a rosette and a plantain: low, green, drawn in the foliage ink like every
    // other kit, and none of them a blade — the birches next door already own thin
    // diagonal grass, and a second region of it would be the same region twice.
    //
    // 0.14, between the birches' 0.13 and the fen's 0.16 and nowhere near the long
    // grass's 0.32. That row is an exception it argues for by having nothing else
    // in it; a meadow has trees and rocks and is meant to be walked across, so its
    // ground furniture is a thing you notice rather than the surface itself.
    decor: {
      density: 0.14,
      // LEAVES HAVE MASS, and the first cut of this kit did not. Every mark was a
      // single-pixel stroke — a trefoil, a cross, a two-leaved stalk — drawn in the
      // same foliage ink at the same weight as the grass tuft, and on screen the
      // meadow simply had more tufts in it. A stroke is what a BLADE is; a leaf is
      // a small solid shape, and the difference is the entire reason to have a
      // second layer on the ground at all.
      // TWO MARKS, NOT FOUR. It had a cross, an upside-down T, a Y and a trefoil,
      // and four unrelated glyphs on one lawn read as a seed catalogue — which is
      // the same complaint the tuft doc makes about four shapes at equal odds.
      // One plant at two ages reads as a patch of it.
      marks: [
        // Clover: three 2x2 leaflets, one over the gap between the other two,
        // meeting at their corners. NO STEM — this is a plant seen from ABOVE and
        // a clover's stalk is under the middle of it where you cannot see it. The
        // stem is what made the first version read as a Y.
        //
        // THE CORNERS ARE THE WHOLE THING, and the arrangement is forced rather
        // than chosen. Six were drawn and photographed one at a time (density
        // temporarily at 0.95, which is the only way to look at a mark rather
        // than hunt for it):
        //   - a 3-wide top leaflet meeting the other two EDGE to edge merges into
        //     one mass with a notch — a heart, not three leaves;
        //   - a one-pixel waist between them reads as a stalk, so it comes out as
        //     one leaf held over two;
        //   - 3x3 leaflets do not buy shape, they buy MASS: with clefts in their
        //     tips they read as a small frog, and rounded they read as a bush.
        // Corner-to-corner at 2x2 is the only version where the eye counts three.
        //
        // AND THE LEAFLETS CANNOT BE LIT, which is worth knowing before somebody
        // tries it. A pale pixel in each corner does make a square read as a
        // rounded leaf — but the second ink is `accent`, and `accent` is fixed
        // against the season on purpose (a white flower is white in October). In
        // autumn every clover came out a rust leaf with a bright green speck on
        // it, which reads as damage. The highlight would need `x`'s seasonal ink,
        // and giving `o` that would break every flower in the file.
        ["..xx..", "..xx..", "xx..xx", "xx..xx"],
        // A sprout: two leaves off a stem, half the height of the clover, so a
        // patch has small plants in it as well as grown ones.
        ["xx.xx", ".xxx.", "..x.."],
      ],
    },
    // A FLOWER IN EVERY GROWING MONTH, which is what `bloom` became a list for
    // (see BiomeDef.bloom): buttercups and dandelions in spring, clocks and
    // clover in summer, black-eyed susans in autumn. Never two at once — the
    // seasons are disjoint, so the ground still carries what is always here and
    // what is here now, which is the whole of the argument that made a list safe.
    //
    // GOLD IS THE MEADOW'S, AND NOTHING ELSE IN THE FILE HAS IT. The birches own
    // white-with-a-gold-eye (anemone), the long grass owns purple-with-a-gold-eye
    // (aster) and the scrub owns a magenta head on a stem, so both a colour and a
    // silhouette were free — and a field of buttercups is the picture the word
    // "meadow" makes. The fen's kingcup is the one other gold here, and it is a
    // fen: nobody meets the two on the same walk.
    bloom: [
      {
        // SPRING: buttercups and dandelions. The region finally getting the season
        // every one of its neighbours already had — the pines, the birches, the
        // scrub and the fen all flower in spring, and the meadow, the one place in
        // the world anybody would go looking for a flower, did not.
        //
        // TWO INKS, TWO FLOWERS, AND EACH USES BOTH — which is how a kit with a
        // budget of two colours gets two plants that are neither flat nor alike.
        // The obvious reading of the budget is one ink per flower, and that is
        // what this was: a bright gold buttercup and a deep gold dandelion, both
        // solid, both reading as a decal rather than a thing with a middle.
        //
        // They swap ROLES instead. The buttercup is bright with a deep eye; the
        // dandelion is deep with a bright one. Same two inks, four uses, and the
        // two flowers are now further apart than when they were flat — an
        // inversion is a much louder difference than a shade, and it survives at
        // one pixel where a third gold would not have been distinguishable from
        // either of the first two.
        //
        // It is also the honest way round. A buttercup's stamens are a deeper,
        // greener yellow than its petals; a dandelion's crown of florets catches
        // the light in the middle where they stand up. Neither is a highlight
        // invented to break up a colour.
        season: "spring",
        density: 0.22,
        accent: "#f2c53c",
        core: "#cf9a24",
        marks: [
          // THE BUTTERCUP, AND THE CORNERS HAVE TO COME OFF. Drawn as a solid
          // 3x2 block it is a yellow SQUARE with a stalk under it — which is the
          // fen's own warning about this exact size, one region away: "the shape
          // reads as a TILE before it reads as a flower". Losing the four corners
          // costs two pixels and buys the whole difference. A small open flower
          // seen from above is a cross, and at five pixels a cross is all there
          // is room for.
          [".o.", "o*o", ".o.", ".x.", ".x."],
          // And a smaller, shorter one — the same plant, not yet up.
          [".o.", "o*o", ".x."],
          // THE DANDELION, in the fen's kingcup silhouette — a five-wide head with
          // its corners off, which is the file's established way of drawing "petals
          // all the way round" without drawing a square. Solid, and a step darker
          // than the buttercup: these two share a month and a meadow, so what has
          // to separate them is size and tone rather than hue. Two unrelated
          // yellows in one field would read as a paint problem, not as two plants.
          [".***.", "**o**", ".***.", "..x..", "..x.."],
        ],
      },
      {
        // SUMMER: the clock and the clover. Both are what the SPRING plants turn
        // into — the dandelion goes over, and the leaves that were underfoot all
        // through March put up heads — so the two read as one meadow getting on
        // with its year rather than as two unrelated decorations.
        season: "summer",
        density: 0.18,
        accent: "#efeadb",
        // THE PINK IS THE CLOVER'S, and it is the kit's only `*`. The first cut
        // was white, for the clock's middle, and came out as a bright bar across
        // the clover head instead. The clock has no centre at all — it is holes —
        // which leaves the ink to the one plant that needs it.
        core: "#e0b3ba",
        marks: [
          // THE CLOCK, DRAWN AS HOLES. A seed head is a sphere of gaps: solid pale
          // would be a mushroom cap and a ring would be a flower, so this is a
          // checker, which is the only thing that reads as fluff at five pixels.
          // It is also what keeps it clear of the birches' anemone — that is a
          // solid white cross with a gold eye, and this is a dotted ball.
          [".o.o.", "o.o.o", ".o.o.", "..x..", "..x.."],
          // WHITE CLOVER, over the leaves that have been there all year. A plain
          // 3x3 head with ONE pink pixel where it meets the stem.
          //
          // THE SQUARE IS THE POINT, WHICH IS THE OPPOSITE OF EVERY OTHER FLOWER
          // HERE. The buttercup had its corners taken off because a solid block of
          // gold reads as a tile; the kingcup silhouette exists to round a head
          // without drawing one. A clover is the exception, and it is the plant's
          // own fault: it is not petals arranged around a centre, it is a dense
          // GLOBE of florets, and a globe at this size is a block. Round it and it
          // becomes one of the daisies.
          //
          // ONE PIXEL OF PINK, AND WHERE IT GOES WAS DRAWN SEVEN WAYS. The older
          // florets at the base go pink, so it belongs at the bottom — but this is
          // exactly where a MUSHROOM keeps its gills, and this region grows one.
          // What saves it is that a gill row is WIDE: three pink pixels across the
          // foot of a head is a cap, and one pixel centred on the stem is the join.
          // The rest of the attempts, since somebody will try them again:
          //   - a pink pair down the middle: a slot. It reads as a button.
          //   - pink at both ends of the middle row: two eyes. A face.
          //   - the top two corners plus the middle bottom: still a face, now with
          //     a chin.
          //   - no pink at all: a white square on a post. A sign.
          ["ooo", "ooo", "o*o", ".x.", ".x."],
        ],
      },
      {
        // AUTUMN: black-eyed susans, and this is the month the meadow had nothing
        // to say. Its autumn was the crowns going over and a bare floor underneath
        // — which is exactly the complaint the long grass's asters were written to
        // fix one region away, and it was just as true here.
        //
        // THE KINGCUP'S SHAPE A THIRD TIME, deliberately. Five wide with the
        // corners off is this file's answer to "petals all the way round a centre",
        // and a rudbeckia is that shape in life: a ring of ray florets around a
        // disc you cannot miss. What is different is the middle — nearly black,
        // where the fen's is a deeper gold — and the middle is the whole name of
        // the plant.
        //
        // A TALLER STEM THAN ANYTHING ELSE HERE. Rudbeckia stands well clear of
        // the grass, which is how you see it in a September field at all, and
        // three rows of stem is what says so at this size.
        season: "autumn",
        density: 0.14,
        accent: "#e8b52f",
        core: "#33261a",
        // ITS STALK STAYS GREEN, because a black-eyed susan flowering in
        // September is a LIVING plant in autumn — the one thing on that lawn
        // that has not finished. A stem takes the region's canopy colour by
        // default and seasons with it (§DecorKit.stem), which is right for
        // almost everything and put these on rust-coloured stalks: a rust stem
        // under a gold flower is a dried arrangement, not a plant that is still
        // going. Dulled a little from summer's green, because it is September
        // and not June, and stated outright so October cannot reach it.
        stem: "#6b8a45",
        marks: [
          [".ooo.", "oo*oo", ".ooo.", "..x..", "..x..", "..x.."],
          // A LEAF, ONE PIXEL, ON ONE SIDE OR THE OTHER. Not variety for its own
          // sake: three marks that differ only in stem length are one glyph, and
          // a leaf halfway up is the cheapest thing that makes a stand of these
          // look grown rather than printed. It sits on alternate sides so no two
          // neighbours lean the same way.
          [".ooo.", "oo*oo", ".ooo.", "..x..", ".xx..", "..x.."],
          [".ooo.", "oo*oo", ".ooo.", "..x..", "..xx.", "..x.."],
        ],
      },
    ],
    // AND THE ONE THING THE TOWN'S OWN REGION ALWAYS GOT, from back when it got
    // nothing else. A summer night over your own plot is the beat that whole pass
    // was for, and it cost the promise above nothing: motes are render-only, so
    // nothing here can re-landscape anybody's home.
    //
    // NOT MOWN, unlike everything above it. A firefly is not ground furniture and
    // nobody tidies the air; the fireflies over the plaza are the point of them.
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
    // LOWBUSH BLUEBERRY, and it is the same soil argument the lupine below is
    // already making: Vaccinium angustifolium wants acid, sandy, half-shaded
    // ground, which is a pine barren, which is this row. The two are companions
    // in the real place — a barren is lupine and blueberry through the same
    // scrub — so the region ends up with one plant community stated twice rather
    // than two decorations that happen to share a row.
    //
    // THINNER THAN THE HEATH'S 1 AND THE GLIMMER'S 0.55, because this canopy is
    // the densest in the game and blueberry fruits in the OPENINGS. At 0.4 the
    // bushes read as what comes up where the pines let light through, which is
    // both the true picture and the one that keeps the wood walkable — the
    // trees here are already 2.2 and undergrowth is solid.
    shrubs: 0.4,
    // AND IN OCTOBER THE BUSHES TURN AND THE TREES DO NOT, which is the picture
    // people photograph this habitat for: a barren goes vivid crimson-purple
    // under a canopy that stays flatly green. It is also the sharpest statement
    // in the file of what `seasonPull` and `shrubAutumn` are each for — the pines
    // take a sixth of the month and the blueberries take all of it, three feet
    // apart, because one is a conifer and the other is not.
    shrubAutumn: { color: "#9c3350", amount: 0.72 },
    // And in summer they carry fruit. See §BiomeDef.berries: paint on a node,
    // no yield, no picking. The ink is the BLOOM on the skin rather than the
    // fruit under it — a real blueberry reads as dusty pale blue at arm's length
    // and as near-black only in the hand, and near-black on this crown would be
    // a smudge rather than a berry. It is also the only blue accent in the file.
    berries: {
      season: "summer",
      color: "#93b4d4",
      // FIVE TO A BUSH, and it was three: a bush in fruit should look like it is
      // worth stopping at, and three berries on a nine-row dome read as the ones
      // that were left after somebody else came through.
      //
      // Rows 2 to 8 of nine — one row higher than the three-berry version could
      // reach, because five need the room, and still nothing in the top cap.
      // Fruit hangs UNDER the leaves; berries over the whole dome read as
      // blossom, or as the first snow on it.
      //
      // NEVER TWO WITHIN A PIXEL OF EACH OTHER, in any of the three, at any width
      // this bush comes in (`drawShrub` rolls the peak ±1). That is the whole
      // point of authoring them and it is what got harder going from three to
      // five: a nine-row dome three half-widths across has room for five spaced
      // berries and not much more, and the NARROW roll is the one to check —
      // the clamp that keeps a berry inside its row is what pushes two together.
      // `render/palette.test.ts` walks all three against all three widths.
      spots: [
        [
          [1, 2],
          [-3, 3],
          [3, 5],
          [-2, 6],
          [0, 8],
        ],
        [
          [2, 2],
          [-2, 3],
          [0, 5],
          [-3, 6],
          [2, 7],
        ],
        [
          [-1, 2],
          [-3, 4],
          [2, 4],
          [-1, 6],
          [3, 7],
        ],
      ],
    },
    mushrooms: 0.02,
    water: 0,
    // Deadfall. A pine wood is the one that manufactures this without being old
    // — the lower branches die in the shade of the upper ones and come down all
    // year, which is why the floor of a plantation is a mess of sticks. The
    // heaviest here, and still rare.
    deadwood: 1.2,
    ground: { color: "#7d8f5e", amount: 0.35 }, // needle-dulled turf
    tuft: { color: "#6d7f52", amount: 0.4 },
    // LESS SNOW THAN THE OPEN GROUND, for the same reason this row takes half the
    // season on its floor: a closed conifer canopy holds it off. What lies under
    // pines is patchy, thin, and mostly where the light gets through
    // (§BiomeDef.snow).
    snow: { color: "#f2f7fa", amount: 0.87 }, // → #e4ece7
    // A needle floor. Blades and litter, and NO sprouts: nothing much
        // germinates under a closed conifer canopy, which is the same fact the
        // sparse decor density below is already about.
    tufts: ["blades", "dot", "dot"],
    // The hardest tint in the file, and the reason `amount` exists: at a gentler
    // pull the pines turned orange in October, which conifers do not do. High
    // enough that the season is a whisper here and a shout everywhere else.
    // AND THE AMOUNT CAME DOWN WITH IT, which is the other half of the same bug.
    // A tint sits on whichever arm the hour picked, so at 0.75 this crown was
    // three-quarters a fixed colour at midnight as well as in October: measured,
    // the pines darkened by 12 RGB between noon and midnight where a birch wood
    // darkens by 30. They were not evergreen, they were LIT WRONG — resisting the
    // season through the tint had quietly bought resisting the dark.
    //
    // Halved, with the colour doubled down to compensate, so the summer crown is
    // the same pixel it always was and the night arm can now get through it. The
    // season is `seasonPull`'s job; this field is back to being about hue.
    crown: { color: "#152421", amount: 0.5 },
    trunk: { color: "#4a3324", amount: 0.3 },
    // A PINE IS GREEN IN OCTOBER (§BiomeDef.seasonPull). This row's crown tint
    // already said "resists autumn hard on purpose because conifers do" and was
    // measurably not managing it — 26 RGB from July to October, against a deciduous
    // birch wood's 67 — because a tint cannot resist a season without also
    // resisting the dark. A sixth of the month is the light changing, which is the
    // whole of what a conifer does in a year.
    //
    // The floor takes half. A needle mat is not a lawn and does not brown like
    // one, but it is not stone either: there is grass between the trunks and some
    // of it goes over.
    seasonPull: { crown: 0.16, ground: 0.5 },    // Damp and mossed over, the way stone goes under a canopy that never lets
        // it dry. Rounded shapes only — nothing sharp survives that long in shade.
    stone: { tint: { color: "#4c5a4a", amount: 0.26 }, shapes: ["boulder", "boulder", "broken"] },
    // A conifer: narrow, tall, and TIERED rather than smoothly tapered. The
    // step-backs are the whole trick — a clean triangle reads as an arrowhead,
    // and the little shelves are what say "branches" at 1px.
    //
    // IT ENDED IN A RECTANGLE, AND FOR EIGHT ROWS. The old table climbed in
    // shelves to 7 at row 20 and then drew 7 eight more times, so the bottom
    // THIRD of the commonest tree in the game was a parallel-sided slab with a
    // ruled line under it. That is the broadleaf's pill (§BROADLEAF) in a
    // conifer's clothes, and it has the same cause: the shape ran out of ideas
    // before it ran out of rows, and the cap on width (7, so it never overhangs
    // its neighbours) turned into a flat spot rather than into a taper.
    //
    // So the tiers now run the WHOLE way down: ten shelves of three, each
    // stepping back a pixel and coming out further than the last, reaching 7
    // only near the bottom. Nothing is wider than it was; the widening is spread
    // over the whole tree instead of being spent in the first two thirds of it.
    //
    // AND THEN IT CLOSES, which is the row that stops the base being a ruled
    // line. A crown of symmetric rows ALWAYS ends on a horizontal edge, so the
    // only question is how wide that edge is: ending at the widest row draws a
    // fifteen-pixel line across the bottom of the tree, and no amount of shelving
    // above it stops that reading as a slab. A fir's lowest whorl does not end
    // flat either — the branch tips angle DOWN, so the outline comes back in
    // toward the ground. Three rows of it (7, 5, 3) and the tree ends on a
    // seven-pixel edge instead of a fifteen.
    crownRows: [
      1, 1, 2, //
      2, 3, 3,
      2, 3, 4,
      3, 4, 4,
      3, 5, 5,
      4, 5, 5,
      4, 6, 6,
      5, 6, 6,
      5, 7, 7,
      6, 7, 7,
      7, 5, 3,
    ],
    // THE SKIRT, and the reason the trunk grew to meet it. Plenty of pines —
    // and every spruce — carry their lowest branches down near the ground; the
    // bare-poled ones are plantation trees that have been brushed out, or old
    // enough to have lost the bottom whorls. Drawing only that version made the
    // densest wood in the game a stand of poles with hats on.
    //
    // Six rows beside the trunk rather than on top of it, which is the field the
    // scrub has had since it was a heath (§crownOverlap).
    //
    // THE FIRST GO RAISED THE TRUNK BY EXACTLY WHAT THE SKIRT TOOK — overlap 5,
    // `trunkHeight` 15 — and photographed as no change at all, because what you
    // see is `trunkHeight - overlap` and that arithmetic held it at the ten it
    // always was. The tree kept its height honestly and kept its bare pole too,
    // which was the whole of what the change was for. The visible stem is the
    // number to aim at: six pixels of it under a thirty-three-row crown, where it
    // was ten under twenty-eight.
    crownOverlap: 6,
    trunkHeight: 12,
    // THE SECOND PINE, and it is the first one older (§BiomeDef.crownAlt: two
    // forms, one species). A conifer in a closed stand loses its lower whorls to
    // the shade the tree above it casts — self-pruning, which is why a plantation
    // is a hall of bare poles and why the wood you walk into is neither all skirt
    // nor all pole. So this is the same tree with the bottom third of its crown
    // gone: no overlap at all, a stem long enough to see up, and the live crown
    // held at the top of it.
    //
    // NARROWER BY ONE, NOT BY THREE. A tree that has lost its lowest branches has
    // lost its widest ones, so 6 rather than 7 — and no further, because girth is
    // the species trait the pair has to keep in common. Two silhouettes that
    // disagreed about width would read as two kinds of tree, which is exactly
    // what a second form is not for.
    //
    // IT STANDS AS TALL, WHICH IS THE POINT. 16 + 27 - 4 against 12 + 33 - 6, so
    // the canopy is level across a stand and the difference is entirely WHERE the
    // foliage sits on the stem. A shorter second form would have read as a
    // sapling — a different age of tree rather than a different history — and the
    // wood would look patchy instead of mixed.
    //
    // AND IT CAME DOWN A THIRD AFTER THE FIRST LOOK. Drawn with no overlap on a
    // twenty-pixel stem it had twelve pixels of bare pole against the skirted
    // one's six — a ratio of more than three, and on screen that is not one
    // species with a history, it is a pole standing next to a bush. The pair has
    // to be TELLABLE APART and still obviously the same plant, which is a
    // narrower target than either half of it sounds. Twelve visible pixels of
    // stem against six: double, not triple, and the trees now read as a wood
    // rather than as two kinds of scenery.
    //
    // The whole difference is `trunkHeight - overlap`, which is the number the
    // skirt's own note says to aim at — the crown grew by six rows at the same
    // time so the tree kept its height while its foliage came down.
    //
    // It closes onto the trunk in the same three rows the skirted one does
    // (6, 4, 2), so both forms meet the bark instead of stopping flat above it.
    crownAlt: [
      {
        rows: [
          1, 1, 2, //
          2, 3, 3,
          2, 3, 4,
          3, 4, 4,
          3, 5, 5,
          4, 5, 5,
          4, 6, 6,
          5, 6, 6,
          6, 4, 2,
        ],
        overlap: 4,
        trunkHeight: 16,
      },
    ],
    // TWO MONTHS OF FLOWER, one kit each, which is the only way this region can
    // have two: `bloom` is a list and the rule on it is one per SEASON
    // (content/decor.test.ts §"never puts two blooms in one region in the same
    // month" — at any moment the ground carries what is always here and what is
    // here now, which is two kinds of small thing and not three).
    //
    // THE LUPINE USED TO HOLD SPRING AND HAS MOVED TO SUMMER, which is a
    // correction rather than a shuffle. The argument written here for a spring
    // bloom — "the flowers that bloom under conifers do it in the weeks before
    // the canopy closes" — is an argument about DEEP SHADE, and it was being made
    // on behalf of a plant that wants the opposite: Lupinus perennis is a
    // pine-barren plant of open sandy half-shade, and in a barren it is a June
    // flower. The spring slot went to the plant the argument was actually about.
    bloom: [
      {
        // LILY OF THE VALLEY, which is that argument's own plant: Convallaria
        // majalis flowers in May, in the shade of exactly this kind of wood, and
        // it is finished about when the canopy finishes closing over it.
        //
        // A STALK AND BELLS DOWN ONE SIDE, and the one-sidedness is the species.
        // Every other flower in this file is symmetrical about its stem — a head,
        // a V of buds, a spike of paired dots — so a mark whose flowers all hang
        // off the LEFT is a silhouette nothing else here can be confused with,
        // which is the lupine's own argument (win on shape, not on hue) applied
        // to a plant that also happens to win on hue.
        //
        // A PIXEL OF STEM BETWEEN EVERY BELL. Bells on consecutive rows merge
        // into a bar down the side of the stalk, which is a leaf; the gaps are
        // what make them separate flowers, and they are the same trick the
        // lupine's V is recorded as needing three notes further down.
        //
        // Both hands, because a colony of them all facing one way reads as a
        // printed repeat however random the placement is — 8c's finding, which
        // `marks` is a list for.
        season: "spring",
        density: 0.07,
        accent: "#f1efe3",
        //
        // AND A STARFLOWER, sharing the kit rather than taking a month of its
        // own — which is how the meadow carries two flowers at once and the only
        // way anything here can (one kit per season, and a kit has one accent).
        // Lysimachia borealis is white, wants acid conifer woods, and flowers in
        // the same weeks, so it costs nothing to put in the same ink.
        //
        // A HEAD AGAINST A STALK. It earns its place by being the lily's
        // opposite: symmetric about its stem where the lily hangs everything off
        // one side, so the two never read as the same plant drawn twice — which
        // is the failure the lupine spent a session being.
        //
        // GAPS BETWEEN THE PETALS, the lupine's lesson a third time: a solid ring
        // of `o` around a core is the meadow's buttercup, and this is a flower of
        // narrow separate petals. Spaced pixels are the only way to say "several"
        // at five across.
        //
        // ONE MARK, AND IT SHIPPED AS TWO FOR AN AFTERNOON. The other was
        // `.o.o.` / `o.*.o` / `.o.o.` — which is the MEADOW'S DANDELION CLOCK
        // (§meadow, summer) with the centre pixel changed from `o` to `*`. Six
        // petals in a ring at five across is a seed head, and there is exactly
        // one of those in this file already; drawn a region away in a different
        // white it was the same glyph twice, which is the thing this whole file
        // spends its comments avoiding. The four-petal one is the star, and a
        // star is what the plant is called.
        //
        // The kit still has four marks in it, so the anti-repeat rule is paid by
        // the lilies. A species does not each need two.
        marks: [
          ["xo", "x.", "xo", "x.", "x."],
          ["ox", ".x", "ox", ".x", ".x"],
          ["xo", "x.", "xo", "x.", "xo", "x."],
          [".o.o.", "..*..", ".o.o.", "..x.."],
        ],
        core: "#fbfaf2",
      },
      {
        // LUPINE, which really is a pine-barren plant: Lupinus perennis wants
        // acid, sandy, half-shaded ground, and that is this row's soil described
        // exactly — the same soil the blueberries are on, one field up.
        //
        // A SPIKE, NOT A FLOWER. Everything else that blooms in this file is a
        // head on a stalk, so the lupine earns its place by silhouette rather
        // than by colour — which matters more here than hue does: lavender on mid
        // green is only about 1.2:1, so if this had to win on contrast it would
        // lose. It wins on shape.
        //
        // The pale tip is the eye ink doing a second job — a raceme opens from
        // the bottom, so the top of a real one is always the lighter, newer buds.
        season: "summer",
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
        //
        // AND THE SECOND MARK USED TO BE THE FIRST ONE AGAIN, character for
        // character. It satisfied "more than one mark" by counting and satisfied
        // nothing the rule is for: a kit with two identical marks is a kit with
        // one, and one glyph scattered perfectly randomly still reads as printed.
        // There is a test for it now, because this is invisible in a diff and
        // invisible in a swatch — you only catch it by noticing the wood has one
        // flower in it.
        //
        // The variant is the same plant YOUNGER: a shorter spike with a single
        // open bell under its two newest buds. Same argument the meadow's clover
        // kit records — one plant at two ages reads as a patch of it, where two
        // unrelated glyphs read as a seed catalogue.
        marks: [
          ["*...*", ".o.o.", "..o..", "..x..", "..x.."],
          [".*.*.", "..o..", "..x..", "..x.."],
        ],
      },
    ],
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
    // Needle litter and the odd fern, which is what a conifer floor actually is.
    //
    // THE NEEDLES WERE GREEN, AND THAT WAS THE WHOLE BUG. They were drawn in
    // `x` — the region's TUFT ink, the same green as the grass speckle — so a
    // "fallen needle" was rendered in the exact colour of a living blade, and at
    // three pixels on the diagonal it was longer than the tufts around it. It
    // could only ever read as a piece of grass leaning over. Fallen needles are
    // not green; that is the entire difference between a needle and a leaf on a
    // tree, and the ink is where it had to be said.
    //
    // So they are `o` now, and `accent` is pine straw: an orange-tan that reads
    // as dead against the turf and does not travel with the season (§DecorKit
    // accent), which is correct here in a way it is not anywhere else in the
    // file — needle litter is the one ground cover that looks the same in
    // February as in July, because it is already dead when it lands.
    //
    // AND THEY GOT SHORTER AND COMMONER, which is the other half. A needle is a
    // few centimetres against a tile's metre, so it is one or two pixels, not
    // three-on-the-diagonal — and a conifer floor is not a place with the odd
    // needle on it, it is a MAT. Three angles of a two-pixel stroke at twice the
    // density reads as litter, where two long marks at 0.09 read as sticks
    // somebody dropped. The mark got smaller so the density could go up without
    // the ground turning busy, which is the trade the tuft doc records for the
    // meadow's clover.
    //
    // AND THEY COME IN TWOS AS WELL AS ONES, which is what a first pass at two
    // pixels got wrong in the other direction. A lone 2px stroke is a speck; at
    // 0.15 the floor read as scattered confetti rather than as litter, and the
    // fix is NOT simply more of them — thirty evenly spread dots and sixty
    // evenly spread dots are the same picture at different volumes. Needles fall
    // in drifts, so half the marks here are a PAIR of strokes and a marked cell
    // reads as a little patch of fallen needles rather than as one.
    //
    // 0.2, over the fen's 0.16 and still nowhere near the long grass's 0.32,
    // which is a row that earns it by having nothing else in it. This is the
    // shadiest floor in the game and the litter is meant to be the texture of it
    // rather than a thing you look at.
    decor: {
      density: 0.2,
      accent: "#8a7452",
      marks: [
        ["o.", ".o"], // a needle, lying one way
        [".o", "o."], // and the other
        ["o.o.", ".o.o"], // two of them fallen together
        [".o.o", "o.o."], // and two the other way
        // A SPROUT, NOT A PLUS. `.x.`/`xxx`/`.x.` was the obvious 3×3 fern and
        // it draws a cross — which at this size reads as a sparkle sitting on
        // the lawn, not as a plant growing out of it. Two leaves off a stem is
        // the smallest mark that reads as foliage.
        //
        // The one mark in this kit still drawn in `x`, and it should be: a fern
        // is the living thing on this floor and takes the region's green, where
        // everything around it is what fell out of the canopy and died.
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
    // SNOW, AND IT IS THE SEVENTH REGION TO GET IT (§snow). The first six were
    // chosen to prove the field cheaply and this row was simply not among them —
    // there is no argument on record for leaving it out, and there is a good one
    // for putting it in: the pines are the region this one exists to be compared
    // against, they lie under snow, and a bare white wood standing on summer
    // grass in January was the comparison failing in the one month it should be
    // easiest to make. A birch wood in snow is also the picture everybody already
    // has of a birch wood.
    //
    // 0.82 → #e4ece5, fitted to the same luma 233 every other row is fitted to.
    // Check the hex, not the amount: this ground is tinted at 0.55, so the number
    // means something different here than it does in the meadow, which tints by
    // nothing (§snow, and the two things the numbers had to teach).
    snow: { color: "#f2f7fa", amount: 0.82 }, // → #e4ece5
    // AND MORE STANDS THROUGH IT THAN IN THE TOWN. This is thin pale woodland
    // grass, not a mown common: 0.25 against the meadow's 0.15 and well under the
    // prairie's 0.38, which is knee-high and earns it. The wood anemone is a
    // spring kit and gone by then, so what is left in the white is grass and the
    // saplings.
    stubble: 0.25,
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
    // GOLD, AND ONLY GOLD (§BiomeDef.autumnCrown). A birch does not go red or
    // russet — it goes a clear yellow and holds it for a fortnight, which is the
    // one autumn colour everybody can name a tree by. Against the season's own
    // burnt orange it is the difference between "a wood in autumn" and "a birch
    // wood in autumn", and it is the region that most needs the distinction: its
    // whole idea is being bright and thin where the pines are dark and close.
    //
    // SATURATION IS THE VIBRANCY, NOT LIGHTNESS, and the first gold here proved it
    // by being neither. Drafted at #d9a838 — a bright lemon — it measured four
    // luma from the floor it stood on and read as a wash; corrected to a darker
    // bronze it separated and went dull. The answer was to hold the VALUE where
    // the separation needs it and spend everything else on chroma: this is the
    // same brightness as the bronze and 0.97 saturated against its 0.79. A real
    // birch in October is not a pale tree, it is an intensely yellow one.
    //
    // AND THE AMOUNT IS 0.7 RATHER THAN 1 FOR A REASON THAT IS NOT TASTE. This
    // tint lands last, on the lit arm and the shaded arm alike, so at 1 both
    // arms become exactly this colour and the crown loses its own shading — a
    // flat gold cutout of a tree. 0.7 keeps a third of the light on it.
    autumnCrown: { color: "#c98a06", amount: 0.7 },    // Three pixels taller than everything else in the world, which is the whole
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
    // The rows on the front are the cap, and they are what breaks the reflection
    // on purpose. Mirrored exactly, the crown ended on a flat lid — a shape that
    // has been cut off rather than one that has finished, because the bottom's
    // matching row does not have to close (the trunk continues out of it and the
    // eye reads the tree as carrying on downward). The top has nothing below it
    // to lean on, so it needs the extra steps.
    //
    // AND IT WAS STILL SQUARE OFF THE TOP FOR A LONG TIME, because one step was
    // not enough of them: it opened 3,3 — two rows at six pixels — and a width
    // held for two rows at the very top is a LID, not a shoulder. The eye reads
    // the first hold it finds as the widest part of a shape, and finding it in
    // row zero says the tree was trimmed flat.
    //
    // 2,3,4,5 climbs instead, one step a row, and the crown domes. It went to
    // 1,2,3,4 first and overshot in the direction the row's own last line warns
    // about: a two-pixel tip over sixteen pixels of shoulder is a TEARDROP, and
    // a teardrop is a leaf, not a tree with leaves on it. One step blunter is
    // the whole correction — round, and not pointed.
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
    crownRows: [2, 3, 4, 5, 5, 5, 5, 5, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 7, 7, 7, 6, 5, 5, 5, 5, 5, 4],
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
    //
    // AND THE OPPOSITE FAULT IS OVERGROWN, which is where it sat until now. Four
    // rows stand beside the trunk (§crownOverlap) and only the last TWO were
    // parted, so the foliage crossed solid over the top of the stem for two rows
    // and then opened a two-pixel slot underneath it. That is not an underside —
    // it is a crown that has swallowed its own trunk with a keyhole cut in it.
    //
    // So the parting runs the full depth of the overlap and WIDENS on the way
    // down: 1,1,2,2. A branch angle opens away from the stem, which is the shape
    // this spells, and it is the same asymmetry the meadow's second form needed
    // for the same reason — an underside is a thing with a direction.
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2],
    crownOverlap: 4,
    // THE SAPLING, and it is the first form in the game that is not the same AGE
    // as the tree beside it. Every pair before this one was two histories of one
    // grown tree — the pines' skirted and self-pruned, the meadow's two amounts
    // of bare pole — and both of those pin girth and height precisely so that a
    // stand never reads as young trees among old ones. This does the opposite on
    // purpose, and the rule in `palette.test.ts` had to be widened to let it: a
    // second form may now either match the adult's girth within a pixel (another
    // grown tree) or be UNMISTAKABLY YOUNG — at most half as wide and at most
    // half as tall. What is still forbidden is the middle, which is where "a
    // slightly different tree" lives, and that was always the real fault.
    //
    // IT IS THIS REGION AND NOT ANOTHER. A birch wood is even-aged in a
    // plantation and ragged everywhere else, because the species colonises gaps
    // and the gaps happen whenever they happen; the pinewood next door made the
    // opposite argument in its own note (a closed conifer canopy levels itself)
    // and should keep it. Do not read this as permission for saplings generally.
    //
    // SKINNY IS THE HALF THAT MATTERS. Three half-widths against the adult's
    // eight — six pixels — because a young birch is a whip: it puts its height on
    // years before it puts on any width, and a small tree drawn in PROPORTION to
    // a big one is a bonsai rather than a sapling. Twelve rows on a twelve pixel
    // stem stands 22 against the adult's 44 — exactly half, which is both what
    // the widened rule allows and where the eye reads "not grown yet" rather than
    // "far away".
    //
    // It parts over its stem in the last two rows like the grown tree does — the
    // one detail that says which species it is going to be, since at six pixels
    // wide there is nothing else left to say it with.
    crownAlt: [
      {
        rows: [1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2],
        gaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        overlap: 2,
        trunkHeight: 12,
        // Three pixels of stem against the region's five (§TreeShape.girth). Six
        // pixels of crown over five of trunk is a post with a shrub on it; over
        // three it is a whip with leaves, which is the thing itself.
        girth: -1,
      },
    ],
    // NO ALL-YEAR KIT AT ALL, and this is the first row in the file without one.
    // It carried thin diagonal grass — three strokes, 0.13 — from the day the
    // slot existed, and it went the moment there was anything else to look at:
    // this floor now has a spring carpet, a summer flower, mushrooms, deadwood
    // and saplings standing on it, and the grass was the layer competing with all
    // of them while saying nothing they do not already say.
    //
    // ONE MARK TOO MANY IS THE KIT'S OWN RULE, ARRIVING FROM THE OTHER SIDE.
    // `DecorKit.density` warns that this layer sits ON TOP of the tuft speckle's
    // 38% and has to stay sparse or the ground stops being ground. The tufts are
    // still here and they are already thin pale grass — so what the kit added was
    // a second, louder copy of the region's existing texture, and reading the two
    // together is what made the floor busy. The speckle IS the grass here.
    //
    // (Its flowers had already left, and for the same kind of reason: the white
    // heads used to stand here in December, and a region cannot be "the airy one"
    // in every season by wearing the same thing through all four of them. What is
    // left is a floor that changes four times a year and is bare between.)
    // WOOD ANEMONE — Anemone nemorosa, which carpets birch and other broadleaf
    // woods for a few weeks each spring and is gone by the time the canopy
    // closes. The four-petal flower with an eye was built for the pines and lands
    // here instead, on the plant's own authority: a conifer floor is the one
    // place this species does not grow.
    //
    // Denser than the rest, because a carpet is what it does.
    bloom: [
      {
        season: "spring",
        density: 0.15,
        accent: "#f4f2ea",
        core: "#e8c25a",
        marks: [
          [".o.", "o*o", ".o.", ".x."],
          [".o.", "o*o", ".o.", ".x.", ".x."],
        ],
      },
      {
        // HAREBELL — Campanula rotundifolia, and it takes the summer because
        // this region had no summer. Spring is a carpet of anemone and October
        // is the best gold in the game (§autumnCrown); between them the birches
        // spent three months being a slightly different green, which is the
        // complaint `DecorKit.season` was invented to answer, arriving a second
        // time in the one region that had already used the field once.
        //
        // It is the plant for the ground, not just for the month: harebell wants
        // thin, well-drained, half-shaded turf, which is what this row's whole
        // palette is a description of — the pale floor here exists because the
        // canopy is thin enough to let light down, and this is what grows in
        // that light. It flowers from June and hangs on through the summer.
        //
        // THE FIRST TRUE BLUE IN THE FILE, and that is the reason to spend a
        // bloom on it rather than on another white umbel. Twenty-one kits and
        // every accent among them is white, cream, gold, pink or violet; the
        // lupine next door is the nearest thing and it is a purple. A colour
        // nothing else owns is worth as much as a shape nothing else owns, which
        // is the argument the lupine's own note makes about silhouette.
        //
        // AND IT HAS TO BE DARKER THAN THE GRASS, NOT MERELY A DIFFERENT HUE.
        // The first blue was #89a6dd, which measures 164 against this floor's 178
        // — fourteen points, and at three pixels a mark that close in VALUE is
        // invisible whatever colour it is. Hue does not carry a shape this small;
        // luma does. #5f7fc9 sits 52 below the grass and reads from across the
        // wood, and it is also the truer flower: a harebell is a mid violet-blue,
        // not a pale sky one.
        //
        // NOT A CARPET. The anemone above is 0.15 because carpeting is what it
        // does; a harebell stands alone in the grass on a wire, so this is a
        // third of that and reads as something you come across.
        //
        // BOTH HANDS. A bell hangs off one side of its stem, and a colony of
        // them all nodding the same way reads as printed — 8c's finding, the one
        // the lily of the valley records needing in the pines for exactly this
        // reason.
        season: "summer",
        density: 0.05,
        accent: "#5f7fc9",
        // NECK ABOVE MOUTH, which is the whole of the drawing. Two pixels of blue
        // in a row is a BAR — a little flag on a stick, which is what the first
        // cut photographed as. A bell is one pixel where it joins and two where
        // it opens, and that single step down is what makes it hang.
        marks: [
          [".o.", "oo.", ".x.", ".x."],
          [".o.", ".oo", ".x.", ".x."],
          [".o.", "oo.", ".x.", ".x.", ".x."],
        ],
      },
      {
        // LEAF FALL, AND IT IS NOT A FLOWER — which is what this slot is for
        // despite its name. `bloom` is "what is on the ground this season", and
        // autumn's answer in a birch wood is not a plant that flowers in October,
        // because almost nothing does under one. It is the tree's own leaves,
        // lying where they landed.
        //
        // IT REINFORCES THE MONTH INSTEAD OF COMPETING WITH IT, which is why a
        // late flower was the wrong answer. This region's autumn is already the
        // best thing it does — `autumnCrown` is a gold nothing else in the file
        // wears — and a violet scabious under it would have been a second subject
        // in the one month this row already has one. Leaves put the SAME colour
        // on the floor that is on the branches, and a wood where the ground and
        // the canopy agree is the whole picture of October.
        //
        // DULLER AND DARKER THAN THE CROWN, for both reasons at once. A leaf on
        // the ground has dried, so it is an ochre rather than the lit gold still
        // hanging up there; and this floor measures 178 in October — barely
        // moving from summer, because a birch's pale ground is pale all year — so
        // the crown's own #c98a06 would sit 36 under it and read as a smudge.
        // #a8762c is 53 down, which is the separation the harebell needed and had
        // to learn the same way.
        //
        // ONES AND TWOS, which is the pines' litter finding (§pinewood.decor):
        // thirty scattered dots and sixty scattered dots are the same picture at
        // two volumes, because leaves fall in DRIFTS. A marked cell wearing two
        // of them reads as a little patch of leaf fall rather than as one leaf
        // placed there, and it is the only way a scatter stops looking regular.
        //
        // A WEDGE, NOT A LEAF WITH A STALK. Drawn `ooo` over `.o.` — a blade and
        // the stem it fell off — it comes out a TACK: three pixels in a row with
        // one under the middle is a symmetrical T, and the eye takes the symmetry
        // before it takes the botany. Nothing this small survives having parts.
        //
        // Three pixels in an L is a flake with a direction, which is all a leaf
        // on the ground is from above: an angular scrap lying whichever way it
        // landed. It is also the pines' own answer one step round — their needles
        // are 2px diagonal strokes for the same reason, and a broadleaf's scrap
        // is simply a fatter one.
        season: "autumn",
        density: 0.12,
        accent: "#a8762c",
        marks: [
          ["oo", ".o"],
          ["oo", "o."],
          ["oo..", ".o..", "...o", "..oo"],
          ["..oo", "..o.", "o...", "oo.."],
        ],
      },
    ],
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
    // AND 5.3 SINCE THE BUSHES ARRIVED, which is the same compensation one more
    // time: undergrowth rolls before the scatter and takes cells the rocks would
    // have had, so a tenth of the region turning into shrubs cost about 3% of the
    // stones and dropped the region under the "still strewn with them" floor in
    // sim/biome.test.ts. Measured, not guessed — the test is the instrument, and
    // it is there precisely so that a change somewhere else cannot quietly stop
    // the scrub being the rocky one.
    rocks: 5.3,
    mushrooms: 0,
    water: 0,
    // THE SCRUB HAS SCRUB IN IT, which it did not for its entire existence — a
    // region named for its bushes, with no bushes. It was the near column that
    // stopped it: undergrowth is a gathered node, so it moves solidity, and moving
    // solidity in a near row can put a bush inside a house somebody already built.
    // That constraint has been lifted deliberately (ROADMAP §the look pass), and
    // this is the first thing it buys.
    //
    // A TENTH OF CELLS, which is between the glimmer's understory (0.55) and a
    // heath's thicket (1.8). The test is DESIGN's own — a region is a mixture and
    // not a demonstration, at several scales of plant at once — and the scrub had
    // two of the three: grit underfoot and the odd wind-flattened tree, with
    // nothing at knee height in between. Enough that the horizon has lumps on it
    // and you walk around things; not so much that the region stops being open.
    //
    // IT DOES NOT MAKE HOME RICHER IN ANY WAY THAT MATTERS. A shrub is two wood
    // against a tree's eight, so this is about a fifth of a wood-per-cell of the
    // pinewood forty tiles from the same plaza — the arithmetic sim/biome.test.ts
    // does when it asks whether the far country pays better than home, run on the
    // near table instead.
    shrubs: 1,
    // ONE BUSH IN EIGHT IS A PRICKLY PEAR (§shrubShapes). Weighted by repetition,
    // and the weight is the whole decision: shrubs cover about a tenth of this
    // region's cells, so one in eight of them is a cactus roughly every eightieth
    // cell — often enough that you meet several crossing the region, rare enough
    // that the chaparral does not turn into a desert. A place is a mixture; a
    // place made entirely of its most distinctive plant is a demonstration.
    shrubShapes: ["bush", "bush", "bush", "bush", "bush", "bush", "bush", "pear"],
    // BLEACHED HAS TO OUT-DRY THE BIRCHES, which is a comparison this row could
    // not make until the birch ground was lifted: at 0.5 of #c2bd86 the scrub
    // measured (154,175,103) against the birches' (149,183,103) — the same wash,
    // eight points of green apart, on the two regions that are meant to be the
    // driest and the freshest thing in the game. The extra pull is all hue: the
    // green leaves and the yellow stays, so this reads parched next to a wood
    // rather than merely lighter than one.
    ground: { color: "#cbc47e", amount: 0.66 },
    tuft: { color: "#bcb26c", amount: 0.6 },
    // THE YEAR RUNS BACKWARDS HERE, and it is the only row in the file that does
    // (§BiomeDef.seasonGround). Mediterranean dry country is not parched in the
    // way a desert is parched: the rains come in WINTER, the hills flush green
    // through the wet months, the wildflowers go over with them, and then it is
    // brown from late spring until the rains come back. Eight months of gold and
    // four of green, with the green in the months every other region in the game
    // is at its dullest.
    //
    // The row could say "parched" before this and could not say "parched EIGHT
    // MONTHS OF THE YEAR", which is a different sentence and the true one. It is
    // also the region's only event: the scrub was the same picture four times,
    // and the spring thistle was the whole of its calendar.
    //
    // ONE MONTH, NOT TWO, AND THAT IS A CORRECTION MADE BY LOOKING. It was drawn
    // with a winter flush as well — deeper and cooler, the new growth coming up
    // through last year's stalks — and the botany was right and the picture was
    // confusing. Winter in this game means one thing everywhere else: the world
    // goes quiet and six regions go white. A seventh going GREEN in the same
    // month does not read as a different climate, it reads as a bug, because the
    // player has no way to tell those apart from inside January.
    //
    // Spring can carry the whole idea on its own, and carries it better: the
    // ground greens exactly when the flowers arrive, so the two land as ONE
    // event rather than as a slow change nobody was watching for. Nine months of
    // gold and one of green is a sharper sentence than eight and two anyway.
    //
    // Winter, summer and autumn name nothing, which is how a row says "this is
    // what I am the rest of the time" — the year-round tint above is the
    // eleven-month answer and always was.
    // AND IT WAS FAR TOO DARK AND FAR TOO SATURATED, which is the correction the
    // cactus found. Measured against every other region's April ground, the first
    // green came out #8aaf53 — luma 153 at 0.53 saturation, the DARKEST and most
    // saturated temperate floor in the file, under the pinewood's 155 and nowhere
    // near the birches' 181. That is backwards on its face: dry open country that
    // has greened cannot out-shade a closed conifer wood. Hills after the rains
    // are PALE and bright and a little grey — new annual grass, thin over dust —
    // and nothing about them is a lawn.
    //
    // #9abb69 is 168 at 0.44: under the meadow's, well under the birches', and
    // the least saturated green of the temperate rows. It reads as country that
    // greened rather than country that was replaced.
    //
    // IT ALSO OPENED THE ROOM EVERY OTHER PLANT NEEDED. At 153 there were 32 luma
    // between this floor and the region's own shrubs at 121, which is not enough
    // for anything to stand between them — the prickly pear could not be given a
    // colour that was not within nine of something, and the poppies had to be
    // pushed to a gold well past their true orange. At 168 there are 47.
    seasonGround: {
      spring: { color: "#93b866", amount: 0.8 }, // → #9abb69, the green year
    },
    // PARCHED, and the shape list says so more plainly than the tint does:
        // dry blades and grit, and not one sprout. Nothing here is sprouting.
    tufts: ["blades", "dot", "dot", "dot"],
    // HELD HARDER NOW THAT THE BUSHES ARE THE REGION'S COMMONEST PLANT, and the
    // long grass's row is where this argument was worked out first. At 0.35 the
    // foliage here was still the meadow's green — invisible while a tree in the
    // scrub was an event, and the whole picture once there are fifteen bushes to
    // a screen wearing the same tint. Dry-country scrub is grey-green: pulled to
    // 0.6 the plants keep their own colour while the ground browns underneath
    // them, which is what reads as autumn on dry country rather than as dry
    // country that has been recoloured.
    //
    // AND THE PLANTS REALLY ARE EVERGREEN, which this note said, then stopped
    // saying, and now says again — the round trip is the useful part.
    //
    // It was struck when the tree was named a HAWTHORN, on a contradiction that
    // was real: the row claimed evergreen foliage while `autumnCrown` painted
    // every crown rust and purple-brown in October, and a hawthorn is deciduous.
    // What that argument could not know is that the region was about to become
    // Mediterranean (§seasonGround). Chaparral is DEFINED by evergreen
    // sclerophylls — chamise, manzanita, toyon, live oak — and its signature
    // picture is grass going gold in May while the brush stays grey-green right
    // through the dry season. So the contradiction was resolved the wrong way:
    // the borrowed rust went, not the evergreen.
    //
    // The tint is therefore doing exactly what the old note claimed. Pulled to
    // 0.6, the plants keep their own colour while the ground browns underneath
    // them, which is what reads as autumn on dry country rather than as dry
    // country that has been recoloured.
    crown: { color: "#7c8a4e", amount: 0.6 },
    trunk: { color: "#7a6248", amount: 0.3 },
    // NO `autumnCrown`, AND IT HAD ONE. It went rust and then purple-brown —
    // bracken and blueberry and heather all turning at once — which is a good
    // description of a HEATH understory and not of this place. Chaparral has no
    // bracken in it, and its trees do not turn.
    //
    // AND THIS IS HOW EVERGREEN IS SPELLED HERE, in the same number four conifer
    // rows already use: a sixth of the month reaches the crown and the rest of it
    // does not. The pinewood's note is the one to read — a tint cannot resist a
    // season without also resisting the DARK, so refusing October with a heavy
    // `crown.amount` would refuse midnight too, and this dial is on the season
    // axis alone. `ground` is left at 1, which is the whole picture: the month
    // lands on the floor with its full weight and stops at the leaves.
    //
    // The region loses its autumn event and gains a better one, because "the
    // whole country goes gold except the trees" is a thing nowhere else here
    // does — and it is the spring flush (§seasonGround) that pays for the loss.
    seasonPull: { crown: 0.16 },    // SUN-BLEACHED AND BROKEN UP, and the region with by far the most of it —
        // seventeen stones a screen against everywhere else's one or two, so this is
        // the one row where the shape list does real work. All three of the dry
        // silhouettes and none of the round one: this ground cracked, it did not
        // wear.
    stone: { tint: { color: "#c9b98c", amount: 0.3 }, shapes: ["crag", "broken", "broken", "slab"] },
    // A CROWN DILATED ONE PIXEL ALL ROUND, which is the last thing that happened
    // to it: every row a half-width wider, a row added at each end, and the notch
    // moved down to keep its place. Seventeen across by fourteen, where it was
    // fifteen by twelve.
    //
    // IT IS THE FIRST NEAR-REGION TREE TO OVERHANG ITS TILE. Eight half-widths is
    // seventeen pixels on a sixteen-pixel tile, which BROADLEAF's note flags as
    // the point where "a stand of trees smears into itself" — allowed for a
    // broadleaf and not for a conifer. It survives here because `trees` is 0.25:
    // the scrub is the sparsest wooded row in the file, so its trees overhang
    // grass rather than each other.
    //
    // KNOWN KNOCK-ON, NOT YET DECIDED: `drawShrub` takes its width from the
    // WIDEST crown row, so this widened the region's bushes too — `shrubPeak` 4
    // to 5, undergrowth from nine pixels across to eleven. Shrubs are this
    // region's commonest plant at density 1, so that is a larger change to the
    // picture than the trees are. The crown is currently the size dial for two
    // things at once (ROADMAP §the scrub's year).
    //
    // A COAST LIVE OAK, and it was a hawthorn for about six hours.
    //
    // The row went its whole life without naming a species — its plant was only
    // ever described by HABIT, "squat and wind-flattened, barely taller than the
    // rocks" — and the first naming read the evidence then in the row: a thorn
    // bush in the decor kit, a thistle in spring, and half the comments calling
    // the region a heath. A thorn tree on dry stony ground is what that adds up
    // to, and hawthorn was the right answer to that question.
    //
    // THEN THE REGION TURNED CALIFORNIAN (§seasonGround) and the question
    // changed. Quercus agrifolia is the tree of exactly this landscape — broad,
    // low, dense, evergreen, standing alone on hills that are gold eleven months
    // of the year — and the silhouette already drawn for the hawthorn is that
    // tree, pixel for pixel. Nothing about the shape moved; what moved is that
    // this one does not turn (§seasonPull).
    //
    // IT WAS DRAWN AS A LOLLIPOP FOR THAT WHOLE TIME, which is the cost of a
    // comment describing a tree nobody had built. Eleven rows of crown perched on
    // the default sixteen-pixel stem is two thirds bare pole — the exact opposite
    // of squat, and more than twice the height of the rocks the note says it
    // barely clears. The words were right and the fields were absent.
    //
    // SO THE STEM COMES DOWN AND THE CROWN COMES WITH IT. Ten pixels of trunk
    // with four crown rows standing beside it leaves SIX visible, under a crown
    // twelve rows deep: eighteen tall against the meadow oak's thirty-five, and
    // fourteen wide, so it is wider than it is tall, which is the whole of "low
    // and spreading". A live oak out on a hillside is mostly crown on a short bole,
    // and where the wind gets at it, it is a bush that decided to be a tree.
    //
    // NOT AS LOW AS THE NOTE CLAIMED, and the measurement is why. A rock here is
    // five to eight pixels; a tree that "barely cleared" one would be shorter than
    // the region's own BUSHES, which stand about ten (§shrubs, `drawShrub`). What
    // the sentence was reaching for is that this is the only tree in the game you
    // look over rather than up at, and eighteen does that: clear of the
    // undergrowth, under the horizon, never the tallest thing in the frame.
    //
    // WIDEST BELOW THE MIDDLE and blunt on top, which are the meadow's and the
    // birches' findings arriving on a third tree — a crown that comes to a point
    // is a leaf and one that holds its width at the top is a lid. It closes 6,6,4,2
    // onto the stem, because those four rows are the ones standing beside it and
    // they have to reach it to read as foliage around a trunk.
    crownRows: [3, 5, 6, 7, 8, 8, 8, 8, 8, 7, 7, 6, 5, 4],
    // AND THEN LOWER STILL, AND ONE LOWER AGAIN: THREE visible pixels of stem,
    // down from the sixteen this row started with. Eight of trunk with five crown
    // rows beside it. A live oak on open ground is a tree you could walk under
    // only by ducking, and every pixel of bare pole is the eye being told
    // otherwise — the ONE number this silhouette turns on, since the crown itself
    // was already right.
    //
    // Three works where the two-pixel version did not, and the difference is the
    // notch: the stem is legible INSIDE the crown now (§crownGaps), so what shows
    // beneath it only has to say "this tree has legs" rather than carry the whole
    // trunk on its own.
    crownOverlap: 5,
    trunkHeight: 8,
    // A NOTCH FLUSH WITH THE TRUNK, and the width is arithmetic rather than
    // taste. `drawTree` clears `cx - g .. cx + g` — 2g+1 pixels, centred on the
    // tree's own column — and the trunk is five pixels wide at girth 0. So g=2 is
    // the only value that lines the foliage up with the bark: the crown parts
    // exactly where the stem begins, and the stem continues up through the
    // parting with nothing overlapping it and no grass showing beside it.
    //
    // BOTH NEIGHBOURING VALUES WERE TRIED AND BOTH ARE WRONG, in opposite
    // directions. At g=1 the gap is three pixels against a five-pixel stem, so
    // the crown still lies ACROSS the trunk and what shows through is a slot cut
    // in the foliage on top of it. At g=3 it is seven, and the two spare pixels
    // read as a hole around the tree rather than a tree standing in a parting —
    // the crown stops touching the thing it is supposed to be growing out of.
    //
    // Written down because the temptation on seeing g=1 is to keep going, and the
    // right answer is one step, not two. The number is decided by `trunkSpan`.
    //
    // AND THE TOP ROW OF THE PARTING KEEPS ITS 1, WHICH IS THE WHOLE OF WHY THIS
    // LOOKS GROWN. Flush all the way down, the notch is a clean rectangle cut out
    // of the crown, and a rectangle is a thing somebody made. One pixel of
    // foliage lapping over the bark at each top corner — which is exactly what
    // g=1 draws, since it clears three pixels of a five-pixel stem and leaves the
    // outer column of bark covered on both sides — turns the corner from a right
    // angle into a leaf resting on a branch.
    //
    // It is the same fact the fork failed on, used the right way round: at g=1
    // the foliage laps the trunk, and lapping it for ONE ROW is the tree growing
    // around its own stem where lapping it for all three was the crown lying
    // across it. The difference between a mistake and a detail is how much of it
    // there is.
    //
    // THE TAIL GIVES UP ITS POINT TO CARRY IT. A gap must be narrower than its
    // row, so the old close (6,4,2) could not hold a 2 at the bottom; it ends
    // 6,5,4 now. A crown parting around a stem cannot also taper to nothing —
    // the last row has to be wide enough to have two sides.
    //
    // Three rows of the five standing beside the trunk. Deeper and it becomes the
    // birches' recorded failure — "a long white channel driven up into the
    // canopy" — which arrives sooner here, on a tree less than half their height.
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2],
    // TWO MONTHS OF FLOWER AND THE SPRING ONE IS NEW, which is what the wet
    // season was for. The row used to spend spring on a thistle and the argument
    // for it — "dry country blooms harder and briefer than green country" — was
    // right about the region and wrong about the month: the flowers on dry
    // Mediterranean ground come up in the green, on the water that fell in
    // January, and they are over by the time the hills go gold. A thistle is what
    // flowers AFTER that, standing in the brown.
    //
    // So the thistle moved to summer, where it belongs, and spring got the thing
    // this whole region has been describing without ever drawing it.
    bloom: [
      {
        // THE POPPY, and the goldfields with it — one kit, because they are the
        // same colour and they come up in the same weeks. This is the picture the
        // seasonGround above exists to make possible: gold over green, for one
        // month out of twelve, on the region that is brown for eight.
        //
        // DENSER THAN ANYTHING ELSE IN THE FILE except the anemone's carpet, and
        // for the same reason — carpeting is what it does. Nothing else here gets
        // to be a superbloom, and a scatter of six flowers would be the region
        // hedging on its own best month.
        //
        // IT WAS GOLD FOR A WHILE AND IT IS ORANGE AGAIN, which is a correction
        // to the GROUND arriving here second-hand. True poppy orange landed
        // within one luma point of the spring floor as first drawn — the
        // harebell's trap, and worse, because orange against green buys nothing
        // that blue against green did not — so it was pushed up to #ffc247, a
        // gold 45 above. That was the right move for the floor that existed and
        // the wrong colour for the flower: a poppy field reads gold from a
        // distance and orange from anywhere you would actually stand.
        //
        // The floor was the thing that was wrong (§seasonGround: 153 and far too
        // saturated, the darkest temperate ground in the file). At 168 the poppy
        // can be a poppy: #e07b18 is the real thing at 0.89 saturation, and it
        // reads by sitting 26 BELOW the ground rather than 30 above it. Down was
        // always available and nobody looked, because the first instinct on a
        // mark that will not read is to brighten it.
        //
        // AND THE THROAT GOES DEEPER STILL. `core` at #a8500c is 44 under the
        // petals — a poppy's centre really is the darker part of it, and at three
        // pixels across the eye needs the two inks that far apart to read one as
        // being inside the other.
        season: "spring",
        density: 0.16,
        accent: "#e07b18",
        core: "#a8500c",
        marks: [
          // FACE ON, AND NOT A BAR. Drawn `ooo` over a single `*` — a rim with a
          // dot centred under it — a poppy is a TACK, the same shape the birches'
          // leaf litter came out as for exactly the same reason: a row of one
          // colour over one pixel is a T before it is anything botanical, and
          // being right about the plant does not survive it. What fixes it is the
          // SECOND row being full width too, so the head is a block of petals
          // with the throat inside it rather than a crossbar on a stalk.
          //
          // AND THERE IS NO TILTED ONE, WHICH TOOK TWO GOES TO ACCEPT. A leaning
          // flower was drawn twice — once with the corner open at the inner edge
          // and once at the outer — on the reasoning that a colony all facing one
          // way reads as printed, which is 8c's finding and is right about the
          // lily and the harebell. It is not right here, and the difference is
          // what the missing pixel MEANS on each plant. A bell hangs off one side
          // of its stem, so a notch in it is the direction it nods; a poppy is a
          // radial cup, so a notch in it is a piece MISSING. Six pixels is too
          // few for the eye to grant a shape a three-quarter view — it reads the
          // absence as damage, and a field of bitten flowers is worse than a
          // field of identical ones.
          //
          // The variety this kit needs comes from the small mark below instead:
          // different SIZE, which needs no missing pixel to say it.
          ["ooo", "o*o", ".x.", ".x."],
          // AND A SMALL ONE AMONG THEM, which is now carrying the variety on its
          // own. Two petals and a stalk, no eye — at
          // this size an eye on a two-pixel flower is just a hole, and what makes
          // a superbloom read is the mixture of one big flower and a hundred tiny
          // ones. It was written as goldfields while the kit was gold; sharing
          // one accent, it is now simply a poppy further off, which is the more
          // honest reading of three pixels anyway.
          ["o.o", ".x.", ".x."],
        ],
      },
      {
        // THE THISTLE, MOVED. A dry, stony, overgrazed opening is where thistles
        // win, which is the scrub's plant on the same grounds the marigold is the
        // fen's — and it flowers in the DRY, which is the correction. It now
        // stands in the gold ground it was always drawn against, and the region's
        // year reads: green and flowers, gold and thistles, gold, gold.
        //
        // Read from the TOP DOWN, which is how a thistle is built and why it
        // works at this size: a splayed tuft, a tighter head under it, then a
        // long bare stem. Nothing else in the file is tall and empty in its lower
        // half, so a thistle is recognisable here even where its colour is not —
        // which matters, since the scrub is the one ground that fights every
        // bloom it is given.
        season: "summer",
        density: 0.1,
        accent: "#c479ae",
        core: "#e4a6d2",
        marks: [
          ["o.o", ".*.", ".o.", ".x.", ".x."],
          ["o.o", "o*o", ".o.", ".x.", ".x."],
        ],
      },
    ],
    // BALD GROUND, IN PATCHES — the scrub's oldest dead idea, finally built the
    // way this file learned to build it for the granite (§sheet).
    //
    // IT WAS REJECTED TWICE AS A CELL and both times correctly: one recoloured
    // square of dirt on open turf is a hard square, and a scatter of them tiles
    // the ground into a checkerboard (CLAUDE.md §per-cell edges). That was never
    // an argument against bare ground in the scrub — it was an argument against
    // bare ground being a CELL. On a long field it is the thing the region has
    // always wanted: dry country is not evenly dry, and a swatch of the scrub was
    // one flat olive from corner to corner, which is the one region in the game
    // that looked unfinished rather than parched.
    //
    // A QUARTER OF IT, AND WARMER RATHER THAN PALER. The granite's sheets go
    // toward its own cool grey; this goes toward dust — (184,164,118) against turf
    // of (154,175,103), so the patches read as ground showing through rather than
    // as a second kind of grass. Paler and it would start competing with the salt
    // flats, which are the region whose whole claim is being the brightest floor
    // in the game.
    //
    // SHORTER WAVELENGTH THAN THE GRANITE'S, because these are bald patches and
    // not a landscape: 22 tiles is a little under a screen, so you cross several
    // walking through, where the granite's 33 is a country you are on or off.
    sheet: {
      ground: { color: "#b09a68", amount: 1 },
      tuft: { color: "#bca877", amount: 1 },
      period: 22,
      from: 0.40,
      to: 0.72,
      // A FIFTH OF THE PLANTS, which is what makes it bald rather than stained.
      // Not zero: a bush hanging on in the middle of a bare patch is the thing
      // that says the patch is dry rather than paved, and an empty circle with a
      // hard population edge would read as a clearing somebody made. The stones
      // stay — dirt with stones on it is desert pavement, and it is what stops
      // this being a hole in the ground.
      bare: 0.2,
    },
    // Dry twigs, pale grit, and one thorn bush. No flowers: this is the row that
    // reads as parched, and a bloom would undo it — the thistle in spring is the
    // exception and it is seasonal for exactly that reason.
    //
    // THE BUSH IS NEW AND IT IS THE TALLEST THING THE SCRUB HAS. The region has no
    // `shrubs` and may never have any — it is a NEAR row, and undergrowth is a
    // gathered node, so adding one would re-landscape ground people have already
    // built on. What it can have is the LOOK of one, which is decor: five rows,
    // bare at the bottom and spreading at the top, in the crown ink so it reads as
    // the same dry olive as the trees. It is what stops the ground being a floor
    // with grit on it.
    decor: {
      density: 0.13,
      accent: "#c2b795",
      marks: [
        ["oo", "oo"], // a pebble
        ["x..", ".xx", "..x"],
        [".oo", "oo."],
        // A thorn bush: a splayed head on a bare stem, read from the top down the
        // way the thistle is.
        ["x.x.x", ".xxx.", "..x..", "..x.."],
        [".x.x.", "xx.xx", "..x..", "..x.."],
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
    // Willow and alder go YELLOW-BROWN and hang on late, which is a wet wood's
    // autumn: no scarlet in it anywhere, and it should stay murkier than the
    // birches (§BiomeDef.autumnCrown).
    autumnCrown: { color: "#8f6a2a", amount: 0.6 },    // Sunk, wet and dark. Slabs and low boulders — anything that stood up here
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
    // WEEPING, AND THE FIRST GO DREW THE OPPOSITE OF IT. It read "broad at the
    // top and narrowing all the way down, so the mass hangs rather than sits" —
    // which is a sentence about weight and a spec for a LIGHTBULB, and that is
    // what shipped: full width by row 2 and held for twelve rows, then fourteen
    // rows of taper closing on a seven-pixel neck plugged into a five-pixel
    // trunk. Both halves are faults this file had already written down. The lid
    // is the birch's ("the eye reads the first hold it finds as the widest part
    // of a shape, and finding it in row zero says the tree was trimmed flat");
    // the cone is `crownGaps`' own ("every tree here tapered to a tip on the way
    // down, which is a shrub's outline"). A crown that ends in a point does not
    // hang from anything — it balances on the stem, and it photographed as a
    // thumb.
    //
    // Mass HANGS by being carried DOWN, not by being piled up. So the top domes
    // in five steps, the full width runs unbroken to the bottom of the crown, and
    // the last six rows come down beside the trunk and part around it — foliage
    // falling PAST the point where the branches leave the stem, which is the one
    // thing a willow's outline does that nothing else here does. The parting
    // widens on the way down (§crownGaps, and the birch's note on why an
    // underside has a direction), so what stands either side of the bark is two
    // curtains rather than a keyhole.
    //
    // It is no longer the tallest crown in the table and the old note was wrong
    // that it ever was — the birches are 28 rows to this one's 26.
    crownRows: [2, 4, 5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 6],
    crownGaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 4],
    crownOverlap: 6,
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
    bloom: [
      {
        season: "spring",
        density: 0.09,
        accent: "#f0c845",
        core: "#d99a2b",
        // THE EYE IS ENCLOSED, and that needed five pixels of width to do without
        // drawing a square. At three wide, "petals all the way round a centre" is
        // a 3×3 block — the shape reads as a TILE before it reads as a flower,
        // which is the one thing a cup must not do. At five, the corners can come
        // off and the ring closes: yellow above, below and both sides of the
        // amber, with a rounded edge outside that.
        //
        // The biggest bloom in the file, and a kingcup is the biggest flower any
        // of these regions actually grows, so the size is the plant rather than a
        // compromise.
        marks: [
          [".ooo.", "oo*oo", ".ooo.", "..x..", "..x.."],
          [".ooo.", "oo*oo", ".ooo.", "..x.."],
        ],
      },
      {
        // THE LILY, AND IT NODS. Asked for as a wood lily, and the species moved
        // one step sideways for the reason the fly agaric did: Lilium
        // philadelphicum is a plant of DRY sandy woods over most of its range, and
        // this file has already decided once that a region's ecology beats the
        // first name that comes to mind. What flowers over standing water in July
        // is the Turk's cap — L. superbum, L. michiganense — a wet-meadow and fen
        // lily, same genus, same orange, and it is the one the drawing wanted
        // anyway. (If the upright cup was the point rather than the plant, that is
        // one mark's worth of work to put back.)
        //
        // AND THE NOD IS WHY IT EARNS A SLOT AT ALL. A wood lily faces UP, which
        // at five pixels is a cup — and the cup is the KINGCUP, twenty lines above,
        // in this same region. This file has already spent the kingcup silhouette
        // three times deliberately; a fourth in the region that owns it would be
        // the fen's two flowers reading as one flower in two colours. A Turk's cap
        // hangs its head and sweeps its petals back UP past it, so the silhouette
        // is a throat with two tips over it — the kingcup's exact opposite, closed
        // at the bottom where the cup is closed at the top.
        //
        // ORANGE, AND HIGH, which is the poppy's whole session one region over
        // arriving as a rule. True lily orange (#e2622a) measures 1.05 against
        // this floor — the scrub found that "orange against green buys nothing
        // that blue against green did not", and the fen's summer ground is darker
        // than the scrub's was. So the petals go up rather than true, and the
        // THROAT carries the deep note: a nodding lily shows you its inside, so
        // the dark belongs where the dark actually is on the plant.
        season: "summer",
        // The sparsest bloom in the file. A lily is not a carpeting plant — it
        // stands one at a time in the wet, and the kingcup's 0.09 is already the
        // picture April makes here. This is the thing you notice, not the thing
        // you walk through.
        density: 0.05,
        accent: "#ff9a3c",
        core: "#8c3a14",
        marks: [
          // THE FIRST HEAD WAS A TUNING FORK, and it is the poppy's finding in a
          // new hat. Drawn `o.o` over a solid `ooo`, the tips are not tips — they
          // are a NOTCH cut into the top of a bar, and a notch in a solid block
          // reads as a piece missing before it reads as two things standing up.
          // On screen it was a goalpost on a stick. (The birch says the same thing
          // about its own canopy: a dip in the underside of a crown is a parting,
          // and the same dip in the TOP of one is damage.)
          //
          // What fixes it is the row UNDER the tips carrying the throat, so the
          // head is petals AROUND a dark centre rather than a bar with a bite out
          // of it — and then one petal below that, closing the flower to a point.
          // The throat is enclosed on three sides and open at the top between the
          // tips, which is the kingcup's rule inverted along with everything else
          // about this plant: a cup seen from below rather than from above.
          ["o.o", "o*o", ".o.", ".x.", ".x.", ".x."],
          ["o.o", "o*o", ".o.", ".x.", ".x."],
        ],
      },
    ],
    // Reeds, standing in clumps. The tallest marks in the file at four rows,
    // which is what says "this ground is wet" without a single new tile.
    //
    // ONE SHAPE AT TWO HEIGHTS, and the two it replaced are gone. The kit ran a V
    // (two blades meeting at the root), an inverted V (one blade splitting on the
    // way down) and a single kinked stalk — three silhouettes to say one thing.
    // Only the V reads as a clump growing out of a point; the other two read as
    // marks, because a blade that FORKS downward is a shape no grass makes and a
    // lone kinked stroke is a scratch. Underfoot at 0.16 that is a lot of ground
    // carrying two glyphs that do not mean anything.
    //
    // The list still needs more than one entry (`decor.test.ts`, 8c's finding —
    // one glyph scattered perfectly randomly still reads as printed), and the
    // poppy settled how to spend the second slot: the variety comes from SIZE,
    // which needs no shape nobody can name. A tall clump and a short one.
    decor: {
      density: 0.16,
      marks: [
        ["x.x", "x.x", "x.x", ".x."],
        ["x.x", "x.x", ".x."],
      ],
    },
    // CATTAILS, AND THEY STAND IN THE WATER RATHER THAN BESIDE IT — which is why
    // this is a `float` kit and not a third slot on the grass. Typha grows with
    // its feet submerged at the margin of standing water; a cattail on dry land is
    // a reed drawn wrong, and the fen already has reeds for the dry part.
    //
    // The mechanism was already here, and the marshes are no longer its only user
    // (§float). Nothing new had to be built to put a plant at the waterline: the
    // waterline is where this kit draws.
    //
    // AND THIS REGION'S WATER IS NEARLY ALL MARGIN, which is what makes the kit
    // honest here. `float`'s own note refuses a lily pad on deep water because it
    // would be a mark on a place you cannot reach — the fen measures 13818 shallow
    // tiles to 1774 deep, so a cattail here is almost always standing in water you
    // can wade, at the edge of a pool small enough to see across. The same fact
    // that makes the fen crossable makes this true.
    //
    // A FLOWERING STALK AND A BLADE, which is the clump rather than the plant: a
    // single brown spike on a wire is a match, and what anybody actually pictures
    // is the head with leaves around it. The blade is the reeds' own V half, so
    // the wet marks and the dry ones are visibly the same vegetation — the ground
    // kit says what grows here and this says the same thing standing in water.
    float: {
      // A THIRD OF THE MARSHES', and their note says why the two are so far
      // apart: over there open water IS the view, so what floats on it has to
      // work as texture. Here the water is pools in a wood, and cattails are the
      // edge of a pool. An edge at 0.32 would be a crop.
      density: 0.11,
      // Dark brown, and it has to be dark: the shallows are #7cc3de, the palest
      // surface in the region by a distance, so the head reads by sitting well
      // UNDER the water rather than by being bright on it. That is the poppy's
      // finding — down was always available and nobody looked — arriving on the
      // one ground in the fen that is lighter than the mark.
      accent: "#6b4527",
      marks: [
        ["o..", "o..", "o..", "x.x", "x.x", "x.x", ".x."],
        ["o..", "o..", "x.x", "x.x", ".x."],
        ["o.o", "o.o", "x.x", "x.x", ".x."],
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
    // ROCK DOES NOT GET GREENER. At this region's border the sheets thin instead
    // of dimming — see BiomeDef.edge §outcrop. Found on screen: with the ordinary
    // fade, a sheet running up to the border came out as ten tiles of sage, which
    // is neither rock nor turf and is a colour this world does not otherwise
    // contain.
    edge: "outcrop",
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
    // AN ALPINE DOME IN JANUARY, which is the least surprising snow in the file:
    // this is bare rock at altitude with a courtesy of turf on it. Deep, and
    // laid OVER the region's grey rather than instead of it — granite under snow
    // is still granite (§BiomeDef.snow).
    snow: { color: "#f2f7fa", amount: 0.84 }, // → #e6eaea
    // WHAT GROWS IN A CRACK. Mostly nothing — two dots to every mark that is a
    // plant — and the plant is a cluster rather than a blade, because a tuft in
    // a rock joint grows as a cushion and not as a stand of grass.
    tufts: ["dot", "dot", "dot", "cluster"],
    // Dusty and blue-ish, the way a pine looks in glare. Held hard, for the
    // pinewood's reason: a conifer does not turn in October, and out here there
    // is nothing else on screen to carry the season if this one does not refuse
    // it.
    // Halved so the hour can reach it, colour doubled down to keep the summer
    // crown identical — see the pinewood, same bug, same fix.
    crown: { color: "#3b4e47", amount: 0.5 },
    // Weathered pale. A tree that has been rained on and dried out at this
    // altitude has bark closer to bone than to brown.
    trunk: { color: "#8a7862", amount: 0.42 },
    // ONE JEFFREY PINE STANDING ON A DOME, which is what the canopy note above
    // calls it — and a Jeffrey pine is a pine. This row had the largest wrong
    // swing in the game at 39 RGB (§BiomeDef.seasonPull), which is most of a real
    // turn on a tree that has never turned in its life.
    seasonPull: { crown: 0.16 },    // A long bare bole. The single tree on the rock is a tall thin thing with
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
      // A THIRD, AND NOT A FIFTH LIKE THE SCRUB'S. Bare rock is harder ground than
      // bare dirt, but this region's whole picture is the one pine standing on the
      // dome — a tree growing where you can see it has no business growing — so
      // the sheets have to keep enough of them to put one there. Any lower and the
      // rock is empty; any higher and there is nothing remarkable about the tree.
      bare: 0.35,
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
    // Snow on the long grass, which is what a prairie winter is: everything flat
    // and white with last year's stems standing up through it (§BiomeDef.snow).
    snow: { color: "#f2f7fa", amount: 0.86 }, // → #e7ebe5
    // AND ALL OF IT STANDS UP THROUGH THE SNOW (§BiomeDef.stubble). This is the
    // region whose whole idea is grass to the knee; a winter that buried it would
    // be burying the one thing anybody came here to see. The stems out of the
    // white are the best picture the season makes.
    stubble: 0.38,
    // SWATHES, and they are the one thing a plain has instead of features. Open
    // grassland is never one colour: it runs in bands of seed-head and bands of
    // leaf, and which you are looking at changes with the ground under it. The
    // region photographed as a single flat honey from corner to corner, which is
    // the same complaint the scrub had and wants the same machinery (§sheet) at a
    // tenth of the strength.
    //
    // NOT BALD GROUND. The scrub's sheet is soil showing through and is meant to
    // be seen as an absence; this is more grass, paler and drier, and the whole
    // craft of it is that it must NOT read as a patch. Fifteen units of green
    // between the two (measured: (158,168,87) against (172,178,104)) is under
    // half the step the scrub's makes — enough that the plain has shape and light
    // in it, not enough that anything on it looks like an edge. Measured at a
    // width of one screen: at fifteen units it was invisible except in a
    // side-by-side, and at forty it was two kinds of ground rather than two lights
    // on one.
    //
    // A LONG WAVELENGTH, longer than either of the others, because a swathe of
    // grass is the biggest soft feature in the game: 38 tiles is over a screen and
    // a half, so you are always inside one and never looking at the whole of it.
    sheet: {
      ground: { color: "#cdbd82", amount: 0.62 },
      tuft: { color: "#d8ca7e", amount: 0.55 },
      period: 38,
      from: 0.38,
      to: 0.72,
    },
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
    // THE BURN ENDS IN TONGUES. Fire stops where it stops — it does not fade out
    // over ten tiles, and it does not stop in a straight line either. See
    // BiomeDef.edge: a hard answer with a low-frequency field pushing it a few
    // tiles in and out along its length, so the margin comes out in lobes with
    // the odd pocket that never caught.
    //
    // It also retires the ugliest thing at this region's border. Ash is 150 RGB
    // units from grass, so the ordinary fade landed fifteen units a TILE and
    // photographed as a flight of hard stripes — the banding the border dither
    // was built to dissolve. There is no gradient here to band now.
    edge: "fray",
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
    // THE CRUST STOPS DEAD. A pan is a lake bed and its edge is a shoreline —
    // see BiomeDef.edge for why that is a fact about the place rather than a
    // preference about seams.
    edge: "hard",
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
    // The cinders' edge, for the cinders' reason — this is the same burn, and a
    // caldera sited in ordinary country has to end the way one sited in the ash
    // does. Its own overlay fade is what this replaces.
    edge: "fray",
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
    // NO `autumnCrown`, AND IT WAS DRAFTED WITH ONE. A cherry really does turn
    // scarlet in October, and giving this row a crimson autumn broke two settled
    // things at once: the header's own example of how tints compose ("Blossom
    // Rows stay stubbornly pink") and the falling petals below, which fall all
    // year BECAUSE these trees are in blossom all year. Crimson trees shedding
    // pink petals is the worst of both — a region half-committed to a season.
    //
    // The permanent bloom is this region's one deliberate untruth and it is the
    // point of it: a sited landmark you walk to, in flower whenever you arrive.
    // If it is ever made seasonal, the petals, the daisy carpet and this comment
    // go with it, and it should be that decision rather than a side effect of an
    // autumn pass.    // Old orchard stone, warmed by the same light everything else here is.
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
    // Snow in a sequoia grove, which is the picture everybody has of one: red
    // columns going up out of white. Under a canopy, so less of it than the open
    // meadow holds (§BiomeDef.snow).
    snow: { color: "#f2f7fa", amount: 0.92 }, // → #e8eaea
    // What comes up through litter: sorrel and small stuff, with plenty of bare
    // duff between. No blades — there is no grass on this floor, and the two
    // uprights would be the one mark claiming otherwise.
    tufts: ["sprout", "cluster", "dot", "dot"],
    // Near-black, and held nearly as hard as the pinewood's. A coast redwood is
    // an evergreen conifer: it does not turn, and the canopy that makes this
    // region dark has to stay dark in October or the whole reading goes with it.
    // Halved so the hour can reach it, colour doubled down to keep the summer
    // crown identical — see the pinewood, same bug, same fix.
    crown: { color: "#0b141d", amount: 0.5 },
    // THE ONE BRIGHT THING IN THE REGION, and the second trunk in the game to
    // carry a species on its own (the birches were the first). Cinnamon, pulled
    // past halfway so it arrives — the note on the birch's white is the lesson
    // being reapplied: a stem tinted gently keeps most of the base brown and
    // reads as an ordinary tree standing in a strange wood.
    trunk: { color: "#a5522c", amount: 0.6 },
    // Evergreen, and the largest evergreen there is (§BiomeDef.seasonPull).
    seasonPull: { crown: 0.16 },    // The tallest ordinary trunk in the world — half again the birch's, which
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
    // The sequoias get the snow their smaller cousins do — the redwoods carry it
    // and these are the same trees grown past sense, so a grove of them bare of
    // it would be the odd one out (§BiomeDef.snow).
    snow: { color: "#f2f7fa", amount: 0.92 }, // → #e8eaea
    tufts: ["sprout", "cluster", "dot", "dot"],
    // Halved so the hour can reach it, colour doubled down to keep the summer
    // crown identical — see the pinewood, same bug, same fix.
    crown: { color: "#0b141d", amount: 0.5 },
    trunk: { color: "#a5522c", amount: 0.6 },
    // A sequoia does not turn either — see the redwoods, same argument, same
    // family (§BiomeDef.seasonPull).
    seasonPull: { crown: 0.16 },    mushroomCap: { cap: "#ddd3b8", lit: "#f2ecd8", gills: "#9c9070" },
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
