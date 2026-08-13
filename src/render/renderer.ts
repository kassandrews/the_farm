// The scene renderer. Draws sim state to a low-resolution canvas that CSS
// upscales crisply (image-rendering: pixelated) — the same trick The Meadow
// uses, so 16×16 sprites and flat tiles stay sharp at any screen size.
//
// Layering, back to front: sky wash, the FLAT ground (only the chunks the
// camera can see — nothing assumes a fixed world), crops, then one depth-sorted
// RAISED pass holding everything that stands up — trees, rocks, the tent,
// villagers, the player, and later walls and roofs — then the real-clock
// day/night tint over everything. See the Raised docblock for why the standing
// things share a single sorted pass rather than getting one each.

import type { WorldState, Villager, Player, BuildCell, FurnitureCell, Layer } from "../sim/types";
import { tileAt, playerTile, actionTarget } from "../sim/game";
import type { ActionTarget } from "../sim/game";
import { cropDef, ripeStage, CROPS } from "../content/crops";
import {
  tileDef,
  FLOOR,
  GRASS,
  TREE,
  SHRUB,
  STUMP,
  LOG,
  ROCK,
  BEDROCK,
  ORE_VEIN,
  SHAFT,
  DARK_TREE,
  HUM_CUBE,
  POLE,
  MAILBOX,
  STAIR,
  CLOUD_THIN,
  SKY_STAIR,
  JUNK_PILE,
  MUSHROOM,
} from "../content/tiles";
import type { TileDef } from "../content/tiles";
import { skinDef } from "../content/skins";
import { hash2 } from "../sim/rng";
import type { SkinDef, SkinId } from "../content/skins";
import type { SeasonId } from "../content/seasons";
import {
  decoHash,
  groundTone,
  chunkCoordOf,
  getChunk,
  CHUNK,
  tileKey,
  regionSkin,
  scatterSkin,
  regionParts,
  smoothNoise,
  type RegionPart,
  foundAt,
  floorFinish,
  townMown,
  PLAZA,
  FLOOR_DEFAULT_FINISH,
} from "../sim/world";
import { dayNumber } from "../sim/found";
import { letterFor } from "../content/found";
import {
  wallMask,
  fenceMask,
  blockedDoorsteps,
  shellFinish,
  showsTop,
  CONNECT_N,
  CONNECT_E,
  CONNECT_S,
  CONNECT_W,
} from "../sim/structures";
import { furnitureDef, footprint } from "../content/furniture";
import { trimOf } from "../sim/furniture";
import { TENTS } from "../content/tents";
import type { TentDef } from "../content/tents";
import { drawTent } from "./tent";
import { ARRIVALS } from "../content/arrivals";
import { playerHome } from "../sim/assign";
import { plinthRuns } from "../sim/museum";
import type { PlinthRun } from "../sim/museum";
import { rooms } from "../sim/rooms";
import type { Room } from "../sim/rooms";
import { tintAt, isNight, skyPhaseAt, rakeAt, RAKE_MAX } from "../sim/time";
import { seasonAt } from "../sim/seasons";
import {
  scenePalette,
  seasonSkin,
  biomeSkin,
  blendRegions,
  sharpenRegions,
  isBiomeGround,
  mixHex,
  tuftInk,
  foliage,
  type ScenePalette,
} from "./palette";
import { zoomLadder } from "./zoom";
import { forEachGrainMark, GRAIN } from "./grain";
import { roofFinish, roofPitch, type RoofPitch } from "./roof";
import { gridFor, runGridFor, pieceCanvas } from "./furnishings";
import type { RunAxis } from "./furnishings";
import { artFor } from "../content/sets";
import { COUNTER_MARKS } from "../content/countermarks";
import { counterIdAtAnchor } from "../sim/counters";
import type { CounterId } from "../content/counters";
import {
  BROADLEAF,
  TUFTS_DEFAULT,
  STONES_DEFAULT,
  BIOMES,
  bloomsOf,
  treeForms,
  type StoneShape,
  type MushroomShape,
  type BiomeDef,
  type DecorKit,
  type MoteKit,
  type Tint,
} from "../content/biomes";
import { isWindow, joinsWallRun, overhead, type StructureId } from "../content/structures";
import { FLORA } from "../content/flora";
import { growthStage, fruitReady } from "../sim/garden";
import { present } from "../sim/presence";
import { creatureKey } from "../content/canon/sprites";
import { lookFor } from "../content/looks";
import type { LookDef } from "../content/looks";
import type { Mood, SpriteFrame } from "../content/canon/sprites";
import { SpriteCache, drawSpriteQuantized } from "./sprites";

/** 0..1, for the easing ramps. */
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

const TILE = 16; // scene px per world tile (matches sprite CELL)

/** How far a border tile's blend is nudged either way to break the stripes a
 *  quantised gradient makes — see `turf`, where the whole argument lives.
 *
 *  ONE STEP WIDE, WHICH IS WHY IT IS THIS NUMBER. The fade runs over about ten
 *  tiles (2 × BIOME_BLEND), so a region whose tint amount is 0.9 moves it by 0.09
 *  a tile; a nudge of a whole step's width, centred, lets a tile land anywhere
 *  inside its neighbours' band and the edge stops existing. Wider and the grain
 *  itself becomes visible as noise; narrower and the stripes come back. */
const BORDER_DITHER = 0.09;

/** The wavelength of the field that walks a frayed edge, in TILES, and how far
 *  it walks it in units of blend weight (content/biomes.ts §edge).
 *
 *  FIVE TILES AND A THIRD OF A WEIGHT. The weight climbs about a tenth per tile
 *  across a border's fade, so ±0.35 pushes the line three or four tiles either
 *  way — enough that no run of it is straight, and not so far that the region
 *  loses its shape. The wavelength is the size of a tongue of burn: at two the
 *  edge reads as noise, and at fifteen it is one slow bulge and the line is
 *  straight again between them. */
const FRAY_PERIOD = 5;
const FRAY_AMOUNT = 0.35;

/** Is this tile part of the town square? The rectangle is inclusive and lives in
 *  sim/world.ts, where generation reads it — asked here rather than re-derived,
 *  so the paving the renderer decorates is exactly the paving the generator
 *  laid. */
function inPlaza(x: number, y: number): boolean {
  return x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1;
}

const SPRITE = 16; // sprite draw size

/** Reticle colour per action kind — the colour is the promise. Faint white means
 *  ACT would do nothing here, so an unlit square is honest rather than broken. */
const TARGET_COLOR: Record<ActionTarget["kind"], string> = {
  harvest: "rgba(255,220,120,0.9)", // something ripe underfoot
  // Your own fruit, in the harvest's gold: both are "something you grew is
  // ready", and the reticle should not distinguish a carrot from an apple.
  fruit: "rgba(255,220,120,0.9)",
  // Sowing without the menu, in the tool's white — it IS the plant tool's own
  // work, reached without holding it.
  sow: "rgba(255,255,255,0.85)",
  gather: "rgba(160,255,150,0.9)", // a tree or rock in reach
  tool: "rgba(255,255,255,0.85)", // the held tool has work here
  read: "rgba(190,205,255,0.9)", // the errands board is within reach
  // A COUNTER GETS THE READING COLOUR TOO, which makes four things wearing it.
  // That is the point rather than a shortage of hues: every one of them is "there
  // is something here to look at, and looking costs nothing". A counter with its
  // own colour would be the reticle announcing which fixtures are transactions,
  // and a shop you can walk up to and leave again is not a different promise
  // from a board you can read and walk away from.
  counter: "rgba(190,205,255,0.9)",
  // The board's own colour, deliberately. Both are "there is something here to
  // read", and giving the mailbox its own hue would make the reticle say THIS ONE
  // IS SPECIAL about a thing whose whole character is that nobody remarks on it.
  letter: "rgba(190,205,255,0.9)",
  // And the same colour a third time, for a door with a history behind it. It
  // is the third "there is something here to read", and the reticle should say
  // exactly that and no more. A hue of its own would mark out which buildings
  // remember something and which don't — a completion map drawn in reticles,
  // which is the one thing this feature must never become (ROADMAP §Phase 9a).
  remember: "rgba(190,205,255,0.9)",
  // The tool's own white, for taking your own tent down. It IS the held tool's
  // colour because it is the same kind of act — a thing on this tile, changed by
  // you — and a hue of its own would announce a ceremony. Nobody is watching.
  strike: "rgba(255,255,255,0.85)",
  shaft: "rgba(200,230,255,0.95)", // the way down, or the daylight above you
  // The shaft's own colour, on the mailbox's argument one line up: both are a
  // way through to another layer, and a hue of its own would be the reticle
  // announcing that THESE steps are the real ones before you have taken one.
  stair: "rgba(200,230,255,0.95)",
  none: "rgba(255,255,255,0.3)",
};

/** Anything that stands UP out of its tile rather than lying flat in it.
 *
 *  The camera is 3/4 oblique (DESIGN §Structures): ground is seen from above,
 *  but anything with height shows its face and overhangs the tile behind it.
 *  That only reads correctly if every standing thing — trees, rocks, the tent,
 *  villagers, the player, and later walls and roofs — is drawn in ONE pass
 *  sorted by its footprint's world y, so near things overlap far things
 *  regardless of what kind of thing they are. Draw them in separate passes and
 *  a villager walks in front of a tree they're standing behind.
 *
 *  `y` is the world y of the footprint (the feet line), never the top of the
 *  art. `bias` breaks ties within a tile: terrain settles behind movers, so
 *  standing on a tree's own tile still draws you in front of its trunk. */
interface Raised {
  y: number;
  bias: number;
  draw: () => void;
}

const BIAS_TERRAIN = 0;
const BIAS_MOVER = 1;
/** Roofs sort above everything sharing their footprint: over the walls holding
 *  them up, and over anyone standing underneath — who is, after all, indoors. */
const BIAS_ROOF = 2;

// The museum's cases. Warm stone, deliberately NOT the building's whitewash —
// the first pass matched the walls too closely and the gallery read as three
// long counters in an empty warehouse.
//
// SHORT AND SHALLOW ON PURPOSE. At a full tile deep and 14 high the silhouette
// was 30px for a 16px tile: taller than it was deep, which is a wall, not a
// plinth. It's now inset on all four sides so floor shows in front of and
// behind it, which is what makes it read as an object standing in a room.
const CASE_HEIGHT = 8;
const CASE_INSET_X = 2; // at the run's ENDS only — never between cells
const CASE_INSET_FAR = 5;
const CASE_INSET_NEAR = 2;
const CASE_STONE = "#c9bda9";
const CASE_SHADE = "#9d9080";
const CASE_LIT = "#e2d8c6";
const EXHIBIT_DARK = "#6f6152";
const EXHIBIT_LIT = "#9c8a72";

/** Opacity of a standing thing that would otherwise swallow the player.
 *  Deliberately low: the intuitive ~0.5 is the worst possible value, because a
 *  half-opaque crown BLENDS with the sprite underneath and you get a green face
 *  looking out of the tree. It has to be faint enough to read as "you are
 *  behind this", not as a tinted player. */
const HIDDEN_FADE = 0.28;

/** How tall one storey stands, in scene px.
 *
 *  It MUST exceed TILE. A raised thing is drawn upward from its footprint's
 *  bottom edge, so at exactly 16px a wall would fill its own cell and overhang
 *  nothing — which is to say it would look like a differently-coloured floor
 *  tile, the flat plan-view we specifically rejected. The overhang IS the
 *  height cue. At 24 a wall stands half a tile proud of its cell and a 16px
 *  creature comes up to two thirds of it: small creatures, cozy small houses. */
const STOREY = 24;
/** The lit top surface of a wall, seen from slightly above. */
const WALL_CAP = 3;

/** How far the roof projects past the wall, in scene px.
 *
 *  THREE. At one it is a rounding error, at two the fascia line eats it, and at
 *  five a cottage wears a sombrero — the eave starts competing with the wall for
 *  the building's whole width. Three is a fifth of a tile, which is about what a
 *  real eave is against a storey, and it is enough that the outline of a house
 *  stops being the outline of its floor plan. */
const EAVE = 3;

/** And the VERGE — the overhang on a gable end, where the roof stops against the
 *  wall rather than shedding over it. One pixel: enough to read as a lip, not
 *  enough to be a second eave. See the note at the draw site for why the two
 *  numbers must differ. */
const VERGE = 1;

/** A fence, in scene pixels. Knee high on a sprite that stands about a tile: at
 *  a wall's 24 it is a wall, and at 4 it is a kerb. Nine reads as something you
 *  lean on and can see over, which is the whole point of putting one round a
 *  field you want to look at. */
const FENCE_H = 9;
const FENCE_RAIL = 2; // one rail's thickness
const FENCE_RAIL_GAP = 4; // top rail to middle rail
const FENCE_POST = 2;
/** The town square is cut in bigger slabs than anybody's kitchen floor.
 *
 *  The plaza and a laid flagstone floor were the same stone in the same bond,
 *  which is the thing ROADMAP §Phase 11 means by "a plaza that is not the same
 *  paving as everywhere else" — a civic square that a player can reproduce
 *  exactly by paving a room is not a square, it is a large floor.
 *
 *  COURSE AND JOINT MUST STAY COPRIME WITH 16, and that is not a style note: the
 *  tile is sixteen pixels, so a period that divides it puts the same joint at the
 *  same place in every cell and the courses align to the tile grid — the band
 *  rule, arrived at by arithmetic instead of by drawing a per-cell edge. 9 and 13
 *  are both odd and neither shares a factor with 16, the same reasoning that
 *  picked 6 and 9 for `stone`.
 *
 *  Joints are inked slightly harder than `stone`'s, because a bigger slab has
 *  fewer of them: at the same weight the square read as flatter than the floor it
 *  was supposed to outrank. */
/** The town square's paving, as one composition (see drawPlazaPaving).
 *
 *  THE NUMBERS ARE A DRAWING, SCALED. The layout comes from a graph-paper
 *  sketch: a one-unit border of long stones — five across the top and bottom,
 *  three up each side — around a field of six-by-four near-square pavers, each
 *  about 2.7 units. The sketch is 18x13 units, the square is 176x128px, and the
 *  two ratios agree within one percent, so one unit is ~10px and everything
 *  below is that sketch times ten:
 *
 *    border 10px; field 156x108 → pavers 26x27, six by four, exact;
 *    side stones 108/3 = 36, exact; top stones 176/5 = 35.2, so four of 35 and
 *    the phase's remainder in the last — a mason's cut, not an error.
 *
 *  A paver is 26px against a 16px tile, so NOTHING here lands on the tile grid,
 *  which is the point: the square reads as paving laid on the ground, not as
 *  the ground's own grid restated in grey. */
const PLAZA_BORDER = 10;
const PLAZA_PAVER_W = 26;
const PLAZA_PAVER_H = 27;
const PLAZA_SIDE_STONE = 36;

/** The doorstep: a flagstone slab, deliberately NOT a wood finish, so it reads
 *  as a step laid at the threshold rather than as more of the house. */
const STEP_STONE = "#9a9187";
const STEP_LIP = "#7d746b";
/** Brass, for the one object in the game made of metal. Hardcoded rather than
 *  taken from the piece's finish, for the same reason the notice board's paper is
 *  (see drawLamp): it is its own material, and a metal FINISH would have made
 *  appearance cost ore. */
const BRASS_DARK = "#5c4419";
const BRASS = "#9c7a2c";
const BRASS_LIT = "#c9a24f";
const FLAME = "#ffcf7a";
const FLAME_CORE = "#fff3cd";
/** How far build mode may slide the view off the player, as a multiple of the
 *  screen. Bounded rather than free on purpose: build mode exists to arrange a
 *  building around where you are standing, and a camera that could wander a
 *  hundred tiles away makes it a level editor you can get lost in. Walking is
 *  still how you go somewhere.
 *
 *  A multiple of the SCREEN rather than a flat tile count because the screen is
 *  no longer one size — see zoom.ts. This was 14 tiles, which was "a bit over
 *  one screen" only while a screen was always ~11 tiles; left as a constant, the
 *  furthest zoom step would have had a pan limit smaller than its own viewport
 *  and the pan would have felt dead exactly where it is most useful. */
const PAN_LIMIT_SCREENS = 1.25;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

const STEP_DEPTH = 5; // how far out from the doorway it reaches
const STEP_INSET = 3; // margin at each end, so it's a step and not a full edge
/** Wall left standing either side of a doorway cut into a side run's top
 *  surface, so the opening reads as a gap in the wall rather than as the run
 *  simply stopping. */
/** Glass. Cool and sky-coloured by day: a pane you cannot see through reads as a
 *  hole, and one you CAN see through would need an interior drawn behind it, so
 *  what a window shows is the sky it reflects. Warm when a lamp burns in the room
 *  behind it — the only thing in the game that reports on a room from outside it.
 *
 *  Hardcoded rather than taken from the frame's finish, on the lamp's argument
 *  (see BRASS): glass is its own material, and a finish that recoloured it would
 *  make "what my windows are made of" a thing to shop for. */
const GLASS = "#7fa8cc";
const GLASS_LIT = "#a9cbe4";
const GLASS_WARM = "#e0a860";
const GLASS_WARM_LIT = "#f6d79b";
/** The whitewash a barn's doors are picked out in (§drawBarnDoors). Hardcoded on
 *  glass's own argument: paint is not the wall's material, and a finish that
 *  recoloured it would make the marks a second thing to choose on a piece whose
 *  entire content is one mark. Off-white — pure `#fff` glares against ox-blood
 *  and comes through the night wash brighter than the lamps do. */

/** Rough perceptual lightness of a `#rrggbb`, 0..1. Used to keep the shingle
 *  courses equally visible on a dark roof and a pale one (§drawRoofCell). Rough
 *  is the point: it decides an alpha, not a colour. */
function roofLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) return 0.5;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
/** How far a lamp stands north of its cell's near edge — see `drawLamp`. */
const LAMP_LIFT = TILE / 2;
const BARN_PAINT = "#ece4d4";
/** A hung banner (§drawBanner). Hardcoded on the flag's own argument two lines
 *  down: cloth is not the building's material, and letting a finish recolour it
 *  would make a banner a thing you shop for rather than a thing you hang.
 *
 *  MADDER, which is the cloth the game already has (content/skins.ts §madder) —
 *  the one strong colour in the palette that is a DYE rather than a paint, and
 *  the colour a banner outside a museum has been in every town that ever had
 *  one. Read as a hex rather than through `skinDef` because a banner is not
 *  wearing a finish; it IS this cloth. */
const BANNER_CLOTH = "#b2564a";
const BANNER_SHADE = "#8e4239";
/** The town's flag (§drawFlag). Hardcoded on the same argument the glass and the
 *  barn's whitewash make: a flag is not the building's material, and a finish
 *  that recoloured it would make the town's own colours a thing to shop for.
 *
 *  The carrot is the CROP's ripe colour, read from the table rather than typed
 *  again here — the thing on the flag and the thing in your field have to be the
 *  same carrot, and two hexes for one vegetable is how they stop being. */
const FLAG_POLE = "#7d6a4a";
const FLAG_FIELD = "#f2ece0";
const FLAG_INK = "#2b2540";
const CARROT = CROPS.carrot.ripeColor;
const CARROT_TOP = "#5aa03c";

/** An awning's canvas, keyed by the finish its frame wears (§drawAwning).
 *
 *  IT USED TO BE ONE HEX FOR BOTH AWNINGS, argued as "canvas is canvas — a market
 *  stall and a shopfront are the same object doing the same job, and giving them
 *  different stripes would be variety for its own sake". That was right about the
 *  object and wrong about the two PLACES. Derek's is a stall pitched at the edge
 *  of the square; Arabella's is a shopfront on the town's one commercial building,
 *  and the reason she has an awning at all is to say from across the plaza that
 *  this is where you buy things. Two institutions reading identically at a glance
 *  is the cost, and it is a higher one than a second hex.
 *
 *  KEYED ON THE FINISH RATHER THAN ON THE INSTANCE, which is what keeps this from
 *  becoming item sprawl. DESIGN §Materials is explicit that appearance is a free
 *  axis and that a look is never a different item — a second `shopawning` row
 *  would be exactly the "materials × looks" the inventory rule forbids, and it
 *  would put two awnings in the build menu that differ only in colour. An awning
 *  is sold as one made thing, frame and canvas together, so its finish names the
 *  whole livery: the pine stall came with red canvas and the whitewashed
 *  shopfront came with green.
 *
 *  Anything not listed falls back to the market red, so placing one in walnut is
 *  never a piece with no canvas. */
const CANOPY: Partial<Record<SkinId, string>> = {
  // Bottle green, which is what a shopfront awning is in every town that has
  // one. Far enough from the hall's sage (#8a9c7e) to never be confused with it
  // — that is a pale grey-green and this is a dark saturated one — and much
  // darker in value than the turf, so it does not sink into the grass behind.
  whitewash: "#35705a",
};
const CANOPY_DEFAULT = "#c9503f"; // the market red, and the one canvas colour there was
const CANOPY_STRIPE = "#efe6cf";
/** How far a rake of light travels across the glass before it starts again, in
 *  WORLD px. Coprime with the 16px tile and much longer than it, for the reason
 *  grain.ts is entirely about — a highlight whose period divides the tile is a
 *  per-cell mark wearing a diagonal. */
const GLASS_RAKE = 40;
/** How often a paned sash puts a glazing bar up, in WORLD px — the rake's own
 *  argument at a different period (see drawWindow §muntins). Half a tile, so an
 *  unmerged sash gets one bar and two lights, which is what the build icon
 *  promises, and a long run gets them evenly across its mullions. */
const MUNTIN = 8;
const DOOR_JAMB = 3;
/** How far the roof is pulled back over a side doorway. */
const DOOR_NOTCH = 4;

/* The roof's pitch, as black over the roofing's own colour (see `roofPitch` for
 * why it is a ramp at all, and what 8f's rule does and does not forbid).
 *
 * FOUR STEPS, NOT A GRADIENT. Everything in this game is flat colour with two
 * or three values to a shape — a tree crown is a mass and a lit side, a wall is
 * a face and a cap. A smooth ramp would be the one gradient in the world, and
 * it would band anyway: the survey (§8v) found that a value step invisible by
 * day is plain to see once the tint darkens it, which is what a 40-step ramp
 * over a nine-tile roof is made of.
 *
 * The numbers: the lit slope runs 0 → 13.5% and the lee 6.5% → 20%, so the two
 * average the flat 10% the roof wore before this and no building changed
 * weight. The whole range is under the shingle courses' 11%, which is the
 * condition `roofPitch` sets — the courses have to survive the bright end. */
const ROOF_PITCH_LIT = 0.0;
const ROOF_PITCH_LEE = 0.09;
const ROOF_PITCH_STEPS = 4;
const ROOF_PITCH_FALL = 0.045;

// Art heights in scene px. A tree exceeds TILE, which is what makes it overhang
// the tile behind and read as standing up; a rock deliberately doesn't (see
// ROCK_SHAPES) — it is scenery you step around rather than get behind.
/** The trunk, in pixels. A tree's full height is this plus its crown's row count,
 *  which now varies per biome (content/biomes.ts) — so nothing may assume 24. */
const TRUNK_H = 16;

/** What a planted flower draws before it flowers (DESIGN §The garden — grows
 *  in over about a day): two leaves off a stem, the meadow's own sprout mark.
 *  A kit rather than a fillRect so it goes through `drawKitMark` like every
 *  other thing on the grass and seasons with the turf. */
const GARDEN_SPROUT: DecorKit = {
  density: 1,
  marks: [
    ["x.x", ".x."],
    [".x.", ".x."],
  ],
};

/** The trunk's horizontal span, as an offset from the tree's centre COLUMN and a
 *  width. Odd at every girth, because every other part of the sprite — crown,
 *  bark grid, `crownGaps` notch, contact shadow, orb spots — is centred on that
 *  column rather than on a seam between two. It has been broken twice by someone
 *  making the trees bigger (once the crown, once the stem), which is why the
 *  arithmetic lives out here with a test on it rather than inline in `drawTree`. */
export function trunkSpan(girth: number): { dx: number; w: number } {
  return { dx: -2 - girth, w: 5 + girth * 2 };
}

/** A BOUGH: one puff of foliage hung off the side of the bole, as half-widths
 *  per row like everything else here (content/biomes.ts §crownBoughs).
 *
 *  ROUND, AND SLIGHTLY WIDER THAN TALL, which is the whole reason it is a table
 *  and not `rows[r]` with an offset. A crown row is symmetric about the trunk by
 *  construction — that is what a half-width IS — so the row model can draw a
 *  tree that is the same on both sides and nothing else. An old sequoia is not:
 *  it carries a few enormous limbs at different heights on different sides, each
 *  ending in a rounded mass, with bare red trunk between them. That silhouette
 *  cannot be spelled in symmetric rows at any width.
 *
 *  Indexed by the puff's half-width at its widest. Four sizes is enough for a
 *  tree; a fifth would be a bough as wide as some whole species here. */
export const BOUGH_SHAPES: Record<number, number[]> = {
  2: [1, 2, 2, 1],
  3: [2, 3, 3, 2],
  4: [2, 4, 4, 3, 2],
  5: [3, 5, 5, 4, 3],
};

/** How far a bough reaches from the trunk's column, on the side it hangs. Used
 *  by the contact shadow (a wide tree needs a wide one) and by the test that
 *  keeps a crown inside the ground it stands on. */
export function boughReach(b: { dx: number; size: number }): number {
  return Math.abs(b.dx) + Math.max(...(BOUGH_SHAPES[b.size] ?? [0]));
}

/** Which spar row, if any, sits behind crown row `r` — counting up from the top
 *  of the bare stem, the way `sparHalf` does. Negative means the row is down
 *  beside the trunk itself (`crownOverlap`), where the bark is full width; past
 *  the spar's length means there is nothing behind it at all.
 *
 *  Out here so `palette.test.ts` can check the BREAKS in a crown against the same
 *  arithmetic the renderer draws them with: a zero-width row is only allowed
 *  where there is a bole behind it to carry the tree across the gap. */
export function sparRowAt(rows: number, overlap: number, r: number): number {
  return rows - overlap - 1 - r;
}

/** How wide the bole still is `i` pixels above the top of the bare stem, as a
 *  half-width off the tree's centre column — the spar's taper (see drawTree's
 *  §crownSpar note, and content/biomes.ts).
 *
 *  Out here with `trunkSpan` and for the same reason: the CROWN has to agree with
 *  it. A gap in the middle of a canopy is legal exactly as far as there is bark
 *  behind it, so `palette.test.ts` checks every gapped row against this function
 *  rather than against a number somebody copied out of the renderer — the failure
 *  it is defending against is a gap one pixel wider than the trunk under it,
 *  which is a hole in the tree with a stripe of grass down each side of the
 *  bole.
 *
 *  Zero at the top row, so a spar always finishes at a single pixel rather than
 *  stopping flat mid-air. */
export function sparHalf(i: number, spar: number, girth: number): number {
  if (spar <= 0) return 0;
  // A COLUMN, AND IT NEVER RUNS OUT. Two goes to get here and both were the same
  // mistake in different sizes. It tapered linearly over the whole spar first,
  // which drew a perfect triangle of bark standing in the foliage — a fin. Then
  // it held full width for two thirds and gave the rest up, which is better and
  // still ends the trunk in a point somewhere inside the crown.
  //
  // Both are wrong about the subject in the same way: a bole does not stop. It
  // narrows — a sequoia is visibly thinner at the crown than at the ground — and
  // then it goes on up BEHIND the limbs until the foliage is thick enough to hide
  // it. What ends a trunk on screen is something in front of it, never the trunk
  // running out, and a tree whose bark fades to nothing halfway up its own canopy
  // reads as a trunk that was drawn and then rubbed out.
  //
  // So: HALF ITS WIDTH over the whole spar, and no less. The top of the spar is a
  // blunt end, which is fine because it is covered — `palette.test.ts` requires
  // the crown row it stops on to be solid foliage, which is the same closure rule
  // the spar has always been held to, stated where it now bites.
  return Math.round((2 + girth) * (1 - (0.5 * i) / spar));
}


/** The rocks. Half-widths per row, read exactly like a tree's crown — one
 *  fillRect per row, `rows[r]` either side of centre, nothing off the pixel grid.
 *
 *  WHY THREE. One silhouette repeated across a field of them read as a texture
 *  the ground was wearing rather than as objects lying on it: every rock the same
 *  outline is the per-cell problem in a different costume. Three is enough that
 *  no two neighbours reliably match and few enough that a rock still reads as
 *  "rock" at a glance.
 *
 *  WHY SMALLER. The old one was 14px across and 11 rows tall on a 16px tile — a
 *  boulder the size of the house's front door, which made the ground look like a
 *  quarry and left nowhere to walk in the scrub. These sit UNDER the eyeline: a
 *  thing you step around, not a thing you shelter behind.
 *
 *  A rock's height above its base is `rows.length + 2`, which is what `hides`
 *  is asked about — the same rule as a tree's TRUNK_H + crown, so nothing here
 *  assumes a constant. */
const ROCK_SHAPES: Record<
  StoneShape,
  { readonly rows: readonly number[]; readonly chip?: number }
> = {
  boulder: { rows: [2, 4, 5, 5, 4] }, // sat down in the grass
  crag: { rows: [1, 3, 4, 4, 4, 3] }, // narrower, and it stands up
  broken: { rows: [3, 4, 4, 3], chip: 5 }, // it split, with the piece beside it
  // A SLAB lies down. Two rows and wide: the flattest thing that still catches a
  // lit row, for country where the ground is sinking rather than breaking.
  slab: { rows: [4, 5, 5] },
  // A SHARD stands, and it took four goes to stop looking aggressive.
  // [1,1,2,3,3,4] widens smoothly tip to base and renders as a little PYRAMID —
  // a heap of rock rather than a piece of it. [1,1,2,2,2,3] fixed the heap and
  // was POINTY: a narrow tip over a widening body is a triangle however you step
  // it, and a triangle at this size reads as a spike somebody could fall on.
  // [2,2,2,3,3,3] removed the tip and stood six rows tall, which is most of a
  // tree trunk — a monument, and this region already has enough standing in it.
  //
  // Four rows, two masses, no tip. LOW is what finally settled it: at this height
  // it reads as a block of stone the ground pushed up, which is the honest far-
  // country note, where anything taller starts making a claim about who put it
  // there. It is still the tallest silhouette of the five and still nothing like
  // a boulder, which is all the shape ever had to do.
  //
  // A narrow flat-topped column was tried too and came out a HEADSTONE, the
  // failure CUBE_H already records for the cube.
  shard: { rows: [2, 2, 3, 3] },
  // A DOME is the big one, and the reason it can be is that two rocks may never
  // share an edge — `rockIsLoneliest`, with `sim/biome.test.ts` §"rocks never
  // touch" holding it. Diagonals are legal and are sixteen pixels apart on BOTH
  // axes, so at fourteen wide and five tall a pair of these still cannot meet.
  // Every other shape here was sized under a caution that turns out not to
  // apply.
  //
  // FOURTEEN WIDE ON A SIXTEEN PIXEL TILE, which is the whole point: this is the
  // only stone in the game that fills the ground it stands on. Half again a
  // boulder's width and two rows shallower, so it reads as a whaleback the
  // ground pushed up rather than as a boulder somebody scaled — the failure the
  // shard's four attempts above record, where a shape that only grew turned into
  // a monument.
  dome: { rows: [4, 6, 7, 7, 6] },
};

/** The mushrooms, drawn rather than generated — same house style as ROCK_SHAPES
 *  and the decor kit's `marks`, because pixel art at this size is placed.
 *
 *  One grid per state, `.` for nothing and a letter per material:
 *
 *      l  the lit top of the cap        g  the gills under it
 *      c  the cap                       s  the stalk
 *      k  the speck — the fly agaric's white fleck, and ONLY the dome's.
 *         A bell that wore one would be a fly agaric that had grown tall.
 *
 *  STATES ARE AGES RATHER THAN SPECIES. `open` is the one you picture, `button`
 *  has not opened yet. That distinction is the whole licence this table operates
 *  under (see MushroomShape): the same organism at two points in a week gathers
 *  into `mushroom` without argument, where two different fungi would not.
 *
 *  A THIRD STATE, `over`, WAS BUILT AND PULLED. A cap gone past its best — rim
 *  lifted, crown sunk. It drew correctly and it read as DECAY, and a wood with
 *  rotting things in it is a wood going bad rather than a wood growing, which is
 *  not this game's register. Kept in the history rather than in the table:
 *  unused art rots faster than anything it depicts, and it is one commit back if
 *  a reason for it turns up.
 *
 *  Grids are bottom-anchored when drawn, so a taller state stands ON the same
 *  ground rather than hanging above it — the bell is two rows taller than the
 *  dome and has to grow upward from the same soil.
 */
/** The deadwood, drawn. Same grid convention as MUSHROOM_ART — `.` for nothing,
 *  a letter per material:
 *
 *      t  the cut face          b  the body
 *      r  heartwood, the rings  d  its shaded underside
 *      m  moss
 *
 *  BOTH STAY UNDER 16px TALL. That is the rock's rule and not the tree's: `hides`
 *  keys off overhang (`artPx - TILE`), so anything at or under a tile can never
 *  fade the player standing behind it. These are things you step around.
 *
 *  NO CUT END IS SQUARE, and that is deliberate rather than decorative — see
 *  drawDeadwood. A flat end on a piece of wood reads as SAWN, and sawn wood is
 *  wood somebody cut, which is wood you would expect to be able to pick up. Both
 *  ends of the log are rounded and its heartwood is off-centre.
 *
 *  THAT RULE USED TO SAY "NOTHING IS SQUARE" AND IT COST THE STUMP ITS BASE. The
 *  sprite ended `..ddddd..` — two pixels narrower each side than the body above
 *  it — so the one edge in the drawing that is NOT a cut end was rounded off with
 *  all the ones that are, and a stump with a rounded bottom is a rock. It sat in
 *  a wood beside actual rocks, in weathered grey, at the same size.
 *
 *  A stump's base is not an end at all: it is where the trunk goes into the
 *  ground, and the tree standing next to it draws exactly that as a flat-bottomed
 *  rect (see drawTree's stem). So the base is flat and the sides run straight
 *  down to it. The rule is about the SAW, and the ground is not a saw. */
/** A PRICKLY PEAR — the first shrub in the game that is a named plant rather than
 *  the generic dome (content/biomes.ts §shrubShapes).
 *
 *  TWO PADS, WIDER THAN THEY ARE TALL, JOINED AT A WAIST. That is the whole
 *  silhouette and it is what nothing else here can be confused with: an Opuntia
 *  is flat ovals growing edge-on out of each other, and the WAIST is the drawing
 *  — merged, they are a lumpy bush; separated by a clear gap they float.
 *
 *  THE FIRST CUT MADE THEM TALLER THAN WIDE and it came out as a SAGUARO: three
 *  pixels across by seven down is a column, and a column with side branches is
 *  the other cactus, the one from the cartoons. A pad is an oval you could hold
 *  flat in two hands — seven across by five down here — and the proportion is the
 *  entire species. Three pads at that size do not fit in a shrub's footprint, so
 *  there are two, which is also what a young plant has.
 *
 *  ELEVEN BY TEN, against the region's bush at eleven by nine. Barely taller,
 *  because a cactus you had to look up at would be a tree and this is undergrowth
 *  — it reads as different by SHAPE, which is the point of giving it art at all.
 *
 *  ASYMMETRIC ON PURPOSE, and it is the one plant here allowed to be. A bush is a
 *  dome because that is what a mass of twigs is from any side; a pad cactus grows
 *  where the last pad let it. Nothing about this shape should look composed.
 *
 *  NO SPINES. At five rows a pad, a spine is one pixel on the outline, and the
 *  outline is the entire silhouette — the same subtraction the stump's flare and
 *  moss lost (CLAUDE.md §Restraint). A prickly pear is recognisable by its pads
 *  and by nothing else at this size. */
export const PRICKLY_PEAR: string[][] = [
  // Leaning right: a pad off the base pad's upper right.
  [
    ".....lxx...",
    "....lxxxx..",
    "....lxxxxx.",
    ".....lxxx..",
    "......xx...",
    "..lxxxx....",
    ".lxxxxxx...",
    ".xxxxxxx...",
    "..xxxxx....",
    "...xxx.....",
  ],
  // And leaning left. NOT A MIRROR OF THE FIRST, though the outline is: the light
  // comes from the upper left everywhere in this game, so a flipped sprite would
  // arrive lit down its right-hand side and read as a plant with the sun behind
  // it standing next to plants with the sun in front. The silhouette mirrors; the
  // lit column is redrawn on the left of each pad, where it belongs.
  [
    "...lxx.....",
    "..lxxxxx...",
    ".lxxxxx....",
    "..lxxx.....",
    "...xx......",
    "....lxxxx..",
    "...lxxxxxx.",
    "...xxxxxxx.",
    "....xxxxx..",
    ".....xxx...",
  ],
  // THERE WAS A THIRD — a single young pad, one oval with no join — and it came
  // out and should stay out. It was added to vary MASS where these two vary only
  // direction, which is a real argument; what killed it is that a lone rounded
  // lump on grass is a BOULDER, in the region that carries seventeen stones to a
  // screen by far the most in the file. Standing it upright helped and did not
  // fix it: at this size the thing that says "cactus" is the JOIN between two
  // pads, and a plant with one pad has nothing to say it with.
  //
  // So the variety here is direction only, and the size variety a scatter wants
  // has to come from somewhere that is not a silhouette this small.
];

export const DEADWOOD_ART: Record<"stump" | "log", string[]> = {
  // Six rows: three of cut face, three of side. A stump seen from this angle is
  // mostly its top — the game looks down at about that much of a tree's trunk.
  //
  // THE HEART IS A BLOCK, NOT A TAPER. Drawn as `rrr` over `r` it makes a T, and
  // a T at seven pixels wide reads as a CRACK down the face rather than as the
  // dark middle of a cut. Three by two is the smallest mark that reads as
  // heartwood — a real ring pattern does not survive this size at all.
  //
  // IT IS SEVEN PIXELS OF WOOD AND NOTHING ELSE, and getting there meant deleting
  // two things this file had arguments for. Both arguments were about a stump
  // seen closer than this game ever shows one.
  //
  //   • The left flare — a column of three pixels standing proud of the body,
  //     there so the shape did not read as turned on a lathe. At nine pixels
  //     across it does not read as a flare; it reads as a chip out of the side,
  //     or as something standing behind. A bollard is a risk worth taking over a
  //     shape you cannot resolve.
  //   • The moss, two green pixels on the shoulders. See the `m` ink below for
  //     the job it was doing (wood nobody tries to pick up) — the LOG still does
  //     that job, and does it better, being four times the sprite. Here the two
  //     specks sat on the silhouette's own edge, which is where the eye reads the
  //     shape, and the stump lost more from being unreadable than it gained from
  //     being unmistakably rotten.
  //
  // What is left is one object: a cut face, straight sides, a flat base. The
  // rule this sprite is under is that detail must survive its own size, and
  // subtracting is usually how that is met — see CLAUDE.md §Restraint.
  //
  // THE TOP STAYS ROUNDED AND THE BOTTOM DOES NOT, which is the whole of the
  // difference between the two ends. The top is a cut face seen at this game's
  // angle — an ellipse, and rounded because a torn one is not sawn. The bottom is
  // the ground line, so it is flat and the sides drop straight onto it, exactly
  // as the standing trunk beside it does.
  //
  // A ROOT COLLAR WAS TRIED FIRST — the base row a pixel wider each side than the
  // body, on the theory that a flare says "grown into the ground" where a rounded
  // foot says "pebble". It photographed as a BRIM. The darkest row in the sprite,
  // overhanging the sides, under a lighter top, is a hat; at nine pixels across
  // there is no room for a flare to be read as anything subtler.
  //
  // So the sides simply run straight down, which is what was being copied from
  // the trunk in the first place — a stem is a plain rect with a flat bottom, and
  // the stump beside it should end the same way.
  stump: ["..ttttt..", ".ttrrrtt.", ".ttrrrtt.", ".bbbbbbb.", ".bbbbbbb.", ".ddddddd."],
  // Twenty wide on a sixteen-pixel tile.
  //
  // THE FIRST DRAFT WAS A PLANK, and it is worth recording why: square ends, a
  // flat lit stripe, and heartwood the same value as the body. It came out a
  // bench. Three things fixed it, all of them about the log being a CYLINDER
  // that fell over rather than a bar lying down —
  //
  //   • Both ends taper (16, 18, 19, 18, 16), so neither is a cut.
  //   • The rings are an ellipse at ONE end only, four wide and rounded, not a
  //     stripe. A log showing rings at both ends was cut twice, which is sawn
  //     timber and exactly the read this is avoiding.
  //   • The moss sits IN the top row instead of floating above it. It was two
  //     pixels of green hanging over the log before, which read as grass behind.
  log: [
    ".rr.tttmmttttmttt...",
    "rrrrtttttttmttttttt.",
    "rrrrbbbbbbbbbbbbbbbb",
    ".rrbbbbbbbbbbbbbbbb.",
    "....ddddddddddddd...",
  ],
};

export type MushroomState = "open" | "button";
/** A kit mark's pixels, at an exact position, in the kit's three inks.
 *
 *  SPLIT OUT SO THE PREVIEW CAN USE IT. `/biomes.html` draws each region's marks
 *  as chips beside its swatch, and the tool's whole premise is that it shows the
 *  REAL art through the REAL renderer — a second loop over `marks` in the preview
 *  would be a second drawing of a fern, which is the thing that page exists to
 *  avoid. What is shared is the part that can drift: three inks with two
 *  fallbacks. Placement stays in `drawKitMark`, because a chip wants the mark
 *  centred and still where a cell wants it scattered.
 *
 *  `slide` is the Static's per-row tear; everything else passes nothing. */
export function paintMark(
  ctx: CanvasRenderingContext2D,
  kit: DecorKit,
  mark: string[],
  x: number,
  y: number,
  stem: string,
  slide: (r: number) => number = () => 0,
): void {
  for (let r = 0; r < mark.length; r++) {
    const sx = x + slide(r);
    for (let c = 0; c < mark[r].length; c++) {
      const ch = mark[r][c];
      if (ch === ".") continue;
      // Three inks: `*` the eye, `o` the petals, anything else the stem. The eye
      // falls back to the petal colour, so a kit that never uses `*` is unchanged.
      ctx.fillStyle =
        ch === "*" ? (kit.core ?? kit.accent ?? stem) : ch === "o" ? (kit.accent ?? stem) : stem;
      ctx.fillRect(sx + c, y + r, 1, 1);
    }
  }
}

/** How wide a region's undergrowth gets, from the crown it grew under: the one
 *  number a bush inherits from its region (see `drawShrub`, where the argument
 *  for inheriting the width and not the profile is written out).
 *
 *  EXPORTED, with `shrubRows`, so the berry tables can be CHECKED rather than
 *  eyeballed — `render/palette.test.ts` walks every arrangement against every
 *  width this produces. A second copy of the geometry in the test would have
 *  been a second opinion about the shape of a bush, and the one on screen would
 *  be the wrong one. */
export function shrubPeak(crownRows: number[]): number {
  let peak = 0;
  for (const w of crownRows) peak = Math.max(peak, w);
  return Math.max(3, Math.round(peak * 0.6));
}

/** The bush's half-widths, top row first, for a given peak. Bottom-heavy and
 *  rounded at the top — see `drawShrub` for why each end is shaped as it is. */
export function shrubRows(peak: number): number[] {
  return [peak - 3, peak - 1, peak, peak, peak, peak, peak, peak - 1, peak - 2].map((w) =>
    Math.max(1, w),
  );
}

export const MUSHROOM_ART: Record<MushroomShape, Record<MushroomState, string[]>> = {
  // THE ORIGINAL ART, pixel for pixel — this is what every region drew before the
  // table existed, and the meadow's mushroom must not move (the same promise the
  // meadow's crown makes).
  cap: {
    open: [".lll.", "ckccc", "ggggg", "..s..", "..s.."],
    // The companion in a two-mushroom cell. Kept small so a patch reads as one
    // kind at two ages rather than as two objects sharing a tile.
    button: ["clc", "ggg", ".s."],
  },
  // Tall, narrow, and notched. The notch is the same move the birch's crown makes
  // — foliage parting around its trunk — at a twentieth of the size: the cap's
  // edge lifts away from the stem and you see the stem through it. It is what
  // stops a tall dome reading as a dome that has been stretched.
  bell: {
    // STRAIGHT-SIDED AND TALL, which is the second correction and the one the
    // reference photograph settled. Drawn as a shoulder that widens on the way
    // down — 3, 5, 5 — it reads as a CONE, and a cone is a parasol or a young
    // fly agaric, not this. A shaggy inkcap is a cylinder with a domed top: the
    // cap holds one width for its whole height and the only flare is the rim.
    //
    // So the sides run parallel for five rows and the SKIRT does the widening in
    // a single row. That row is also what carries the species — an inkcap
    // dissolves from the rim upward, so the dark edge hanging below a pale cap is
    // the thing anyone who has seen one recognises. It wants the fen's darkest
    // ink, which is why `mushroomCap.gills` there is nearly black.
    //
    // (The first draft of all this was a COLUMN — a three-wide cap over a
    // one-wide stalk is two pixels of difference, and at seven rows it read as a
    // standing stone. The rim is what fixed that too: it is the overhang that
    // tells you the stem is thin, and it does the job in one row where a
    // widening shoulder took three and cost the silhouette.)
    // IT CAME OUT A DAGGER at three wide, and that is worth recording because
    // every single element was individually right: pale straight cap, dark rim
    // one pixel proud either side, pale stem below. Together they are a blade, a
    // crossguard and a grip, and the eye takes the whole before it takes the
    // parts. The fix is PROPORTION, not elements — a five-wide cap is a body
    // where a three-wide one is an edge, and a rim that overhangs a wide cap
    // reads as an overhang instead of as a guard.
    //
    // THE DRIPS ARE GONE AND THE RIM TAPERS INSTEAD, which is the third go and
    // the last of three different objects this sprite has accidentally been. Two
    // pixels hanging under a wide dark bar are LEGS, and a wide dark bar with
    // legs under a pale block is a table — the same failure as the dagger, one
    // element further along: any two symmetric marks below a horizontal are read
    // as supports before they are read as anything else.
    //
    // So the dark goes 7, 3 and straight into the stem. That is a rim seen from
    // above, curling under and running out — one mass narrowing, with nothing
    // detached from it for the eye to reassign. It also gets the species across
    // better than the drips did: what you recognise in an inkcap is the dark
    // underside eating up into a pale cap, not the drops it sheds.
    // AND THEN IT WAS SIMPLY TOO BIG, which is the fourth correction and the one
    // none of the three above could have caught — every one of them was an
    // argument about what the sprite READ as, and this is an argument about what
    // it WEIGHS. At seven wide and nine rows it stood 9px against a villager's
    // 16: a mushroom as tall as somebody's torso, at the heaviest density in the
    // game (0.12, eight patches to a screen), nearly a whole tile wide with its
    // companion beside it. Nothing about the drawing was wrong. There was just
    // too much of it, and a floor of them read as a boulder field.
    //
    // Five wide and six rows — the dome's own footprint, one row taller. The
    // proportion note above still holds and is what fixed the reduction too: the
    // cap keeps a BODY (three wide over a rim one pixel proud, where the old
    // seven-wide cap wore a rim two proud) rather than being thinned to an edge,
    // and it is the rim that carries the species at either size. The dome is
    // 5x5 and this is 5x6, so `palette.test.ts`'s rule — the bell is what it is
    // by being TALLER than the dome, not just narrower — still has something to
    // hold on to, with a pixel to spare and no more.
    //
    // The curling row went with the height. `ggggg` straight into the stem is
    // the same mass narrowing that the 7,3 taper drew, at the size where one row
    // is all the taper there is room for.
    //
    // AND THE CAP TOOK ITS CORNERS OFF, which is on trial rather than settled —
    // it is here to be lived with for a while. At three wide there is no such
    // thing as a rounded corner: taking both leaves ONE pixel, which is a third
    // of the cap's width gone in a single step. The sketch of it read as a nub
    // sitting on a block, so the cap got its fourth row back to give the step
    // something to happen over, and the sprite is 5x7 rather than the 5x6 that
    // shipped this morning. Still a third of the old nine rows in mass.
    //
    // What is being watched for is the bottle: a narrow body with a small stopper
    // on top is the shape this move fails into, and it is the fourth object this
    // sprite has accidentally been if it does. If it reads as a bottle on the
    // floor of the fen rather than as a cap, the row above is the version to go
    // back to and this comment is the receipt.
    open: ["..c..", ".lcc.", ".lcc.", ".lcc.", "ggggg", "..s..", "..s.."],
    // A YOUNG ONE OF THE SAME SPECIES, not a generic nub. This was `.l.`/`.c.`/
    // `.s.` — an egg on a stick, which was fine beside the old squat bell and
    // became a speck the moment the adult grew to nine rows and got its dark rim.
    // A patch is supposed to read as ONE KIND AT TWO AGES; a pale blob next to an
    // inkcap reads as two different things sharing a tile, which is the exact
    // failure the companion exists to prevent.
    //
    // So it gets the rim too. Three pixels of dark under a two-row cap is the
    // whole species at a third of the size, and it is the rim rather than the
    // silhouette that does it — that is what the adult's four rebuilds taught.
    //
    // IT LOST ITS DOMED ROW WHEN THE ADULT SHRANK. Four rows beside a six-row
    // adult is two thirds of its height, and a companion that size is not a
    // younger one — it is a second mushroom, which is the read this grid exists
    // to prevent. Three rows against six is the same half it always was. The rim
    // is what survives the cut, exactly as the note above says it should.
    //
    // AND IT TOOK THE ROW BACK WHEN THE ADULT GREW ONE. The nub is the same move
    // at both sizes now — `.c.` over a three-wide cap IS the adult's `..c..` over
    // a five — so the pair reads as one species at two ages by sharing its
    // silhouette's newest idea rather than by both being blocks. Four rows
    // against seven is still barely over half.
    button: [".c.", "lcc", "ggg", ".s."],
  },
};
/** Taller than a rock, shorter than a tree. It should read as built rather than
 *  grown, and as somebody's, without being tall enough to hide behind. Its width
 *  is a whole tile: it is a CUBE, and the first draft was eleven pixels wide and
 *  seventeen tall, which on screen was a headstone. */
const CUBE_H = 14;
// The found places' props (Phase 7b). Each is under one storey (24px): they are
// things left in a field, and a mailbox taller than a wall would be a monument.
const POLE_H = 14;
const MAILBOX_H = 11;
const STAIR_H = 18; // six steps of three pixels; still under a storey
const CUBE_W = 16;

// --- The underground ----------------------------------------------------------
// Two ideas do all the work down here: rock STANDS UP where it has been cut
// open, and you can only see as far as you are lit.

/** How tall a cut rock face stands. Deliberately shorter than a wall's STOREY:
 *  it still exceeds TILE, so the face overhangs the rock behind it and a tunnel
 *  reads as a corridor rather than as pale squares in dark ones — but only just,
 *  so `hides` never fires and the rock you are standing against can never
 *  swallow you. There is no cutaway underground to save you if it did. */
const ROCK_STOREY = 20;
/** The lit top lip of a cut face, where the light in your hand catches it. */
const ROCK_CAP = 2;

/** The lamp: clear to LAMP_INNER tiles, gone by LAMP_OUTER.
 *
 *  A gradient in SCENE space, not a per-tile alpha. Darkness quantised to the
 *  grid would put a light and a dark edge on every cell of one continuous
 *  surface, which is the banding rule (CLAUDE.md) arriving in a new costume —
 *  and a circle of light that steps in tile-sized rings looks like a bug in a
 *  way that a soft one never does. */
const LAMP_INNER = 2.4;
const LAMP_OUTER = 7.5;
/** Not 1. Rock at the edge of sight is nearly black but never a void — you can
 *  still tell a tunnel mouth from the end of the world. */
const DARK_MAX = 0.94;
/** Daylight falling down a shaft, at noon. Scaled by the hour, so the holes you
 *  dug go dim at night: down here, night is the light going out of your own
 *  entrances. */
const SHAFT_LIGHT = 0.42;
const SHAFT_LIGHT_R = 3.2; // tiles

/** A placed lamp's pool of light: a little wider than a shaft's and warmer.
 *
 *  Deliberately smaller than LAMP_OUTER, the light you carry. A lamp you install
 *  must never out-light the one in your hand, or the honest thing — that you can
 *  see because you are there — stops being true, and a tunnel with four lamps in
 *  it would be a lit room rather than a tunnel somebody has been working.
 *
 *  The numbers are low because the compositing is ADDITIVE and lamps are meant
 *  to be hung in a row: at 0.5 three of them saturated a corridor to flat cream
 *  and the rock stopped having any texture at all, which is the opposite of the
 *  point — you install lamps to SEE the tunnel. Each one is a suggestion; four in
 *  a line are what light the place. */
const LAMP_GLOW = 0.2;
const LAMP_GLOW_R = 3.6; // tiles

/** A lava shore's pool of light. Weaker than a lamp's and wider, because these
 *  are drawn one per RIM CELL and are meant to add up along a shoreline — a
 *  lamp's own 0.2 apiece saturated a lake edge to flat orange and took the
 *  texture out of the ash, which is the four-lamps-in-a-corridor failure with a
 *  different light source. */
const LAVA_GLOW = 0.09;
const LAVA_GLOW_R = 4.2; // tiles
/** Where the flame is, in px above the BASE of the lamp's cell — the same datum
 *  `drawFurniture` measures every standing thing from, which is a raised thing's
 *  southern edge and NOT the cell's centre.
 *
 *  Shared by the art and the glow so the light can never leave from somewhere the
 *  lamp isn't, and it already caught that once: measured from the centre, the
 *  flame drew half a tile above the lamp and read as a bright square hovering
 *  over it. The two uses must agree, so they take the offset from here and the
 *  arithmetic to reach the datum is written once in each. */
const LAMP_HEAD_H = 15;

/** How much the flattened build view knocks back anything standing up, so the
 *  ground plan underneath is legible while you're editing it. */
const BUILD_VIEW_FADE = 0.3;

/** Per-frame easing of the roof cutaway. Slow enough to read as a reveal rather
 *  than a switch; fast enough that you're not waiting to see your own room. */
const ROOF_FADE_RATE = 0.16;

/** The same idea one layer down: an ore vein is rock as far as the bevel is
 *  concerned, so the lip is drawn where the ROCK ends and not around every
 *  vein. Outlining veins would let you read them off across a dark room, and
 *  the whole point of their low contrast is that you meet one at the face you
 *  are digging (content/tiles.ts §Underground). */
function rockIdOf(id: number): number {
  return id === ORE_VEIN ? BEDROCK : id;
}


/** The most any region's air may be. `drawMotes` early-outs on this before it
 *  asks which region a cell is in — the field costs nine sites and almost no
 *  cell has motes — so a kit above it would be silently capped. Tested.
 *
 *  Generous compared to a decor density, because a mote is a much weaker mark
 *  than a fern: one or two pixels, moving, and faded at both ends of its cycle.
 *  A tenth of the cells reads as ground clutter and as almost nothing in the
 *  air — measured by counting what actually drew, after three rounds of assuming
 *  the count was fine and the colour was wrong. */
export const MOTE_MAX = 0.4;

/** Which roof cell carries the stack. DERIVED, like the roof itself.
 *
 *  IT IS THE CELL THE FIREPLACE STANDS ON, and that is the whole function now.
 *
 *  Roofs are derived and never placed (DESIGN §Structures), and this used to
 *  apologise for that in a docblock: a chimney you positioned by hand would be
 *  the first placed thing on a roof, so it hashed a cell out of the room's back
 *  third and hoped. A hearth settles it properly. You still do not place the
 *  chimney — you place the FIRE, and the flue comes out over it. The stack is as
 *  derived as it ever was and it is now derived from something that means
 *  anything.
 *
 *  THE TEST WAS TWO WRONG THINGS BEFORE THIS. First a floor area — twelve
 *  interior cells — which every building in town clears, so the shop, the
 *  salvage shed, the barn and the MUSEUM all grew stacks. Then a BED, which is
 *  at least a thing that means somebody lives here, and is still a proxy: a bed
 *  is where you sleep and a chimney is the top of a flue. The object a chimney
 *  actually comes out of is a fireplace, so there is one now
 *  (content/furniture.ts §fireplace), and it is the only thing this asks about.
 *
 *  BACK-HALF BIAS IS GONE FROM HERE and lives in the fireplace's placement rule
 *  instead (§backs). A stack on the near edge reads as a crate on the gutter, so
 *  something has to keep it off the front eave — but "nudge the chimney
 *  backwards" was the renderer quietly disagreeing with where the player put
 *  their fire. Requiring a wall behind a fireplace says the same thing once, at
 *  the moment it can still be acted on, and leaves this function honest.
 *
 *  `hearth` is passed rather than looked up so this stays a pure function of the
 *  room, which is what its test is for. The caller has already walked the room's
 *  furniture for the lamp check, so the answer costs nothing.
 *
 *  A ROOM WITH TWO FIREPLACES GETS ONE STACK, from whichever the walk reached
 *  first. Two chimneys is the honest picture and this cannot draw it — the
 *  per-room map holds one cell — and rather than pretend, the caller takes the
 *  first and the second fire simply shares a flue. Nobody has built two yet.
 *
 *  Exported for its test — that it lands on the fire, and inside the room. */
/** Which roof cell flies the flag. DERIVED, on the chimney's own argument.
 *
 *  IT IS THE CELL THE TOWN HALL'S COUNTER STANDS ON. You do not place a flag any
 *  more than you place a roof or a chimney — you place, or in this case the town
 *  places, the DESK THAT DOES THE TOWN'S BUSINESS, and the flag flies over it.
 *  The Tired Office Creature's counter is the thing in this world that most means
 *  "municipal", so it is the thing this asks about.
 *
 *  NOT A FIELD ON THE BUILDING. `flag: true` in content/town.ts would have been
 *  one line and would also have been the first PLACED thing on a roof, and it
 *  would have flown over an empty shell after somebody carried the desk out.
 *  This way the flag is a fact about what the building is FOR, which is what a
 *  municipal flag is.
 *
 *  ONLY THE HALL, and only because only the hall has that counter. The shop, the
 *  museum and the Facility have counters too and fly nothing — four flags in a
 *  town this size is a parade, and three of those counters are a business, a
 *  collection and a pile respectively. None of them is the town.
 *
 *  THE DESK DECIDES WHETHER; THE ROOF DECIDES WHERE. This is the one place the
 *  flag parts company with the chimney, and the reason is that they are different
 *  objects. A flue is the fire coming up through the roof, so it belongs directly
 *  over the fire and nowhere else. A flagpole is not the desk coming up through
 *  the roof — it is a thing the building wears, and a building wears its flag on
 *  its ridge, in the middle, because that is where you put a flagpole.
 *
 *  It used to stand on the counter cell itself, and on the hall that is one
 *  column west of the building's own centreline (the desk is at x -1 of a
 *  building running x -3..3), so the flag flew off to one side of a facade whose
 *  entire point is that it is the one symmetrical building in town (content/town.ts
 *  §townhall: "Symmetry is the point and it is the ONE building here that gets
 *  it"). A municipal flag hung off-centre reads as an aerial somebody screwed on,
 *  which is the same failure mode the limp-flag version had.
 *
 *  So the CENTRE of the room, and the ridge comes along for free exactly as it
 *  did before: `roofPitch` creases a five-deep roof through the middle row, and
 *  the middle row is what a centre is. Carry the desk out and the flag still goes
 *  — nothing here places one, and that was always the load-bearing half.
 *
 *  `counter` is passed rather than looked up, so this stays a pure function of
 *  the room — the caller is already walking the room's furniture for the lamp
 *  and the hearth, so the answer costs nothing.
 *
 *  Exported for its test, like `chimneyCell`: that it needs the desk, that it
 *  lands in the middle, and that it stays inside the room. */
export function flagCell(room: Room, counter: string | null): string | null {
  if (!counter || !room.interior.has(counter)) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const key of room.interior) {
    const [x, y] = key.split(",").map(Number);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const mid = tileKey(Math.round((minX + maxX) / 2), Math.round((minY + maxY) / 2));
  // An L-shaped room's middle can be outside itself, and a pole on a cell the
  // roof does not cover is a flag in somebody's garden. The desk is the fallback
  // because it is the one cell we know is both inside and meaningful.
  return room.interior.has(mid) ? mid : counter;
}

export function chimneyCell(room: Room, hearth: string | null): string | null {
  if (!hearth) return null;
  // The fire has to be IN this room. It always is, since the caller only ever
  // walks its own interior — but this function is exported and tested, and a
  // stack on a cell the roof does not cover would be a chimney standing on
  // somebody's lawn.
  return room.interior.has(hearth) ? hearth : null;
}

/** What the FLAT layer actually paints for a tile id. Resource nodes stand up
 *  in the raised pass, so the flat layer shows the ground they're rooted in —
 *  and neighbour comparisons have to agree, or every tree gets a bevel drawn
 *  around it as if it were a different material. */
function groundIdOf(id: number): number {
  // The two 4c landmarks stand up the same way, and they matter here more than
  // the others do: a grove is a dozen cells side by side, so a bevel drawn round
  // each one would ring every trunk and turn the stand into a lattice. Same
  // rule as always — the edge belongs where the SURFACE ends (CLAUDE.md
  // §per-cell edges), and grass under a tree has not ended.
  //
  // JUNK_PILE is here for the same reason and it was found the same way: as its
  // own material it drew a boundary bevel against the grass around it, which read
  // as faint stray lines lying in the lawn a tile away from the object itself.
  // Something dropped on the grass has not ended the grass.
  //
  // MUSHROOM was the same bug a third time, and the loudest of the three: in the
  // Hollow they come up thickly, so a lit top row and a dark bottom row on every
  // cap cell paired into horizontal rungs across a slope that is all one lawn.
  // Its tile colours are grass's colours on purpose (content/tiles.ts) — the
  // mushrooms are drawn ON the grass, and grass that has something growing in it
  // has not ended either.
  // The found places' three props (7b), for the fourth, fifth and sixth time. It
  // is the same bug every time and it announces itself the same way: a pole came
  // out as a brown SQUARE with a rod drawn on top of it, and the mailbox as a grey
  // slab, because a standing thing that is not listed here has its own tile colour
  // painted flat across the cell it stands in. A rod stuck in a bank has not ended
  // the bank.
  return id === TREE ||
    id === SHRUB ||
    id === ROCK ||
    id === DARK_TREE ||
    id === HUM_CUBE ||
    id === JUNK_PILE ||
    id === MUSHROOM ||
    id === STUMP ||
    id === LOG ||
    id === POLE ||
    id === MAILBOX ||
    id === STAIR
    ? GRASS
    : id;
}

/** Which material class a built tile is finished in, or null for terrain that
 *  has no finish (grass, water, a tree). Terrain is never re-skinned BY A
 *  FINISH — a finish is something you chose when you built, not a filter over
 *  the world.
 *
 *  A season is the opposite object, and the two never meet. It repaints terrain
 *  and never touches a built cell, and that disjointness is structural rather
 *  than editorial: the caller asks `finishFor` FIRST and a finish wins outright,
 *  so a season can only ever reach a tile that had no finish to lose. The
 *  sentence above stays true and is now the reason the season interception is
 *  safe (Phase 4d; ROADMAP §Seasons). */
function isFinishedTile(id: number): boolean {
  return id === FLOOR;
}

/** A built tile's appearance under the finish IT is wearing. Falls back to the
 *  tile's own colours when the tile isn't a built one.
 *
 *  Takes x,y and not just the tile id, and that is the whole of the v27 change.
 *  It used to read `world.skins.selected`, which made every floor in the world
 *  the same colour and restyled all of them the instant you changed your mind —
 *  a live filter over the world, and the exact thing the docblock above says a
 *  finish is not. Now it asks the cell what it was built as. */
function finishFor(
  world: WorldState,
  id: number,
  x: number,
  y: number,
): TileDef | null {
  if (!isFinishedTile(id)) return null;
  const skin = skinDef(floorFinish(world, x, y));
  // `roll` and `paving` are dropped ON PURPOSE, and this is the one place the
  // decision lives. A laid floor is a made surface: it should be exactly as flat
  // as it was laid, and what it has instead of a roll is a grain, drawn by the
  // `isFinishedTile` branch further down. Spreading the tile def straight
  // through here would give a floor both at once.
  const { roll: _roll, paving: _paving, ...base } = tileDef(id);
  return { ...base, color: skin.color, top: skin.top, shade: skin.shade };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cache = new SpriteCache();
  private cam = { x: 0, y: 0 };
  private sw = 0;
  private sh = 0;
  private scale = 3; // scene px → CSS px
  /** Which rung of `zoomLadder` the view is standing on, 0 being the nearest —
   *  the view the game has always had. Held as an INDEX rather than a scale
   *  because the ladder is a property of the viewport: the same index has to
   *  survive a window resize or a phone rotating, and a stored scale would not. */
  private zoomStep = 0;
  private t0 = performance.now();
  /** The `now` the current frame is being drawn at — see draw(). */
  private now = 0;
  /** Milliseconds since the renderer started, for art that MOVES rather than
   *  art that has to agree about the date. Off `t0`, not `this.now`: the
   *  fireplace's flame is animation like the grass sway, not a fact about what
   *  day it is, and the screenshot harness pins the page clock. */
  private animMs = 0;
  private canvas: HTMLCanvasElement;
  /** Rebuilt every frame; see the Raised docblock. */
  private raised: Raised[] = [];
  /** WHAT IS LAID ON THE FLOOR this frame — rugs (sim/types.ts §floor).
   *
   *  Its own list, flushed between the terrain and the raised pass, because a
   *  floor piece is neither. Terrain draws per cell, so a 2x2 rug drawn inside
   *  that loop would be painted over by the three cells of its own footprint
   *  that come after it; and `raised` sorts against everything with height,
   *  where a rug would win against the player standing on it and draw over
   *  their feet. Between the two is the only place a carpet has ever been. */
  private laid: Raised[] = [];
  /** Flattened plan view: on while a build tool is held (DESIGN §Structures —
   *  plan view while you build, 3/4 while you live there). */
  private buildView = false;
  /** Mirrors the HUD's held ACT tool, for the reticle. */
  /** Whether to draw the player-facing furniture of the view — currently the
   *  reticle. True in the game, always; see `setChrome`. */
  private chrome = true;
  /** Doorsteps nothing can stand on, collected during the flat pass while build
   *  mode is open — see drawBlockedSteps. */
  private blockedSteps: { x: number; y: number }[] = [];
  /** Beds offered while choosing someone a home — see setHomeCandidates. */
  private homeCandidates: { x: number; y: number; ok: boolean }[] = [];
  /** The cells of the piece currently IN HAND, while the Move tool carries one.
   *
   *  Build mode has no hover preview anywhere — it paints where you tap, which
   *  is the right grammar on a phone with no cursor — so "what have I picked up"
   *  cannot be shown by a ghost following the pointer. It is shown on the piece
   *  itself, which is still standing where it was: a move does not empty the
   *  source until the destination is known to be good. */
  private lifted: { x: number; y: number }[] = [];
  /** Shafts collected during the underground flat pass, so the daylight pools
   *  in drawDark cost one entry per VISIBLE hole rather than a scan of every
   *  edit the player has ever made. Same trick as blockedSteps above. */
  private litShafts: { x: number; y: number }[] = [];
  /** Lamps collected during the flat pass, on whichever layer is being drawn —
   *  the one thing in the game that makes light where it is put (Phase 5a).
   *  Bounded by the screen, exactly like litShafts above. */
  private litLamps: { x: number; y: number }[] = [];
  /** Lava cells that have a NON-lava neighbour — the shore of a lava field, and
   *  the only cells that get a halo.
   *
   *  THE INTERIOR NEEDS NONE, which is a cost decision that turned out to be the
   *  better picture as well. A caldera's lake is about eighty cells on screen and
   *  a radial gradient each is eighty gradients a frame for a glow that is
   *  entirely hidden under the next cell's; what you actually see of a lava field
   *  at night is the light spilling onto the ASH around it, and that is exactly
   *  what the rim draws. */
  private lavaRim: { x: number; y: number }[] = [];

  /** The two-ink patterns a dithered region's ground and crowns are filled with,
   *  by colour pair — see `ditherFill`. Session-lived rather than per-frame: the
   *  pairs are a small fixed set (four steps of ground roll, two inks, the season)
   *  and building a 2×2 canvas is the one allocation in the tile loop. */
  private dithers = new Map<string, CanvasPattern | null>();

  /** Which way round the frame's 2×2 dither sits — see `ditherFill`. Set once
   *  per draw, because the camera offset that decides it is one number for the
   *  whole frame. */
  private ditherPhase = 0;
  /** The frame's colours — hour and month — set at the top of `draw`. Held on
   *  the renderer rather than threaded as an eleventh parameter through
   *  `drawChunkTiles`: the month is a fact about the FRAME, not about a chunk. */
  private palette: ScenePalette = scenePalette(null, false);

  // --- Roof index and cutaway state -------------------------------------------
  // Rebuilt only when the sim hands back a different rooms array — its own cache
  // keeps that identity stable across frames, so this costs nothing while you're
  // just walking around.
  private roomsRef: Room[] | null = null;
  /** Cell key → the room whose roof covers it. */
  private roofIndex = new Map<string, Room>();
  /** Room id → the roof cell carrying its chimney and WHAT THE STACK IS MADE OF,
   *  or null for a room with no fire in it. Derived with the rest of the roof, so
   *  it is recomputed only when the sim hands back a different rooms array.
   *
   *  The finish is the FIREPLACE's, not the roof's. A stack used to take the
   *  roof's material, which was the only material available when it was derived
   *  from nothing — and it meant a timber chimney on a timber house, which is a
   *  flue made of the one substance a flue may not be made of. Now that a
   *  chimney comes out of a specific object, it is that object's masonry coming
   *  up through the roof, which is what a chimney IS. */
  private chimney = new Map<string, { cell: string; finish: SkinId } | null>();
  /** Room id → the roof cell flying its flag, for the one room that has one.
   *  Derived with the rest of the roof, off the same walk — see `flagCell`. */
  private flag = new Map<string, string | null>();
  /** Room id → every cell it roofs, for drawing edges only where a roof ends. */
  private roofCover = new Map<string, Set<string>>();
  /** Room id → what its roof is MADE of. See `roofFinish`. */
  private roofSkin = new Map<string, SkinId>();
  /** Room id → which way its roof falls. See `roofPitch`. Derived with the rest
   *  of the roof, so a house that never changes shape computes its slope once. */
  private roofFall = new Map<string, RoofPitch>();
  /** Room id → does a lamp burn inside it. What makes a window read as somebody
   *  being home rather than as a hole: the glass goes warm and spills a pool.
   *
   *  Per ROOM and not per window, because a window has no light of its own —
   *  it shows you the light of the room behind it, and every window in that room
   *  shows the same one. */
  private roomLit = new Map<string, boolean>();
  /** Door cells with somebody standing in them right now (§draw). */
  private doorBusy = new Set<string>();
  /** How dark the night wash is about to be, read at the top of the frame. */
  private darkness = 0;
  /** How long a shadow the sun is throwing this frame (sim/time.ts §rakeAt).
   *  Read at the top of the frame beside `darkness`, and for the same reason: the
   *  two are one fact about the hour, and a shadow resolved from a second clock
   *  is how a wood ends up lit at four and shadowed at noon. */
  private rake = 0;
  /** Lit window panes, for the glow pass — the cell, and the pane's rectangle in
   *  SCENE px so the glow can repaint the glass itself after the night wash has
   *  gone over it. Carrying the rect rather than recomputing it keeps the merge
   *  arithmetic (which cells share a pane) in the one place that does it. */
  private litWindows: { x: number; y: number; gx: number; gy: number; gw: number; gh: number }[] =
    [];
  /** Room id → current roof opacity, eased toward 0 while you're inside. Kept
   *  across frames so walking through a door FADES the roof rather than
   *  snapping it, which is the whole feel of the cutaway. */
  private roofAlpha = new Map<string, number>();

  /** Toggle the flattened build view. */
  setBuildView(on: boolean): void {
    this.buildView = on;
  }

  /** The ground grid, SEPARATED from the flatten (ROADMAP §three doors): the
   *  garden places in the full living view — light, season, leaves — but
   *  placement is still per tile, so the cells have to be visible even where
   *  the flatten would be wrong. The grid is every shape tool's; the flatten
   *  is the structure tools' own. */
  private gridOn = false;
  setGrid(on: boolean): void {
    this.gridOn = on;
  }

  /** How far the camera is shifted off the player, in tiles. Build mode only.
   *
   *  Build mode paints a TAPPED tile, so on a phone you could only ever build
   *  within the screen you happened to be standing in the middle of — and there
   *  is no way to walk while every tap places a wall (ROADMAP §Known gaps). This
   *  is the room to work in: the view slides, the player stays put.
   *
   *  An offset on the FOLLOW TARGET rather than a second camera, so the existing
   *  easing pans smoothly and `screenToWorld`, `sceneX` and the chunk-streaming
   *  bounds all keep reading `cam` and need no idea this exists. */
  private pan = { x: 0, y: 0 };

  /** The pan clamp in tiles, for the current viewport. Derived per call rather
   *  than cached because it has to follow a zoom step or a window resize, and
   *  this runs once per pan gesture frame — it is two divisions. */
  private panLimit(): { x: number; y: number } {
    return {
      x: (this.sw / TILE) * PAN_LIMIT_SCREENS,
      y: (this.sh / TILE) * PAN_LIMIT_SCREENS,
    };
  }

  /** Turn off the view's player-facing furniture. FOR THE PREVIEW PAGE ONLY, and
   *  it defaults on so nothing has to remember to ask for it.
   *
   *  Not a display option and not a setting: hiding the reticle in the GAME
   *  would take away the one thing that says which tile ACT lands on, which
   *  ROADMAP calls the promise. A contact sheet has no ACT button to promise
   *  anything about. */
  setChrome(on: boolean): void {
    this.chrome = on;
  }

  panBy(dx: number, dy: number): void {
    const lim = this.panLimit();
    this.pan.x = clamp(this.pan.x + dx, -lim.x, lim.x);
    this.pan.y = clamp(this.pan.y + dy, -lim.y, lim.y);
  }

  /** Back to the player. Called when build mode closes, so the pan can never
   *  outlive the mode that justified it and leave you looking at a field with no
   *  way to say "where was I". */
  clearPan(): void {
    this.pan.x = 0;
    this.pan.y = 0;
  }

  /** CSS px per world tile, for turning a drag in screen space into tiles. The
   *  scale is picked from the viewport and is NOT fixed (scripts/drive.mjs's
   *  header has the same warning), so nobody may hardcode it. */
  pxPerTile(): number {
    return TILE * this.scale;
  }

  /** Beds to mark while the player is choosing someone a home, with whether
   *  each one qualifies. Empty (the default) draws nothing.
   *
   *  Deliberately NOT routed through the reticle: the reticle promises exactly
   *  what ACT will touch and nothing else (ROADMAP §"The reticle is the
   *  promise"), and these are candidates for a different verb entirely. Two
   *  meanings on one affordance is how that rule got broken the first time. */
  setHomeCandidates(cells: { x: number; y: number; ok: boolean }[]): void {
    this.homeCandidates = cells;
  }

  /** Mark the piece the Move tool is carrying — see `lifted`. */
  setLifted(cells: { x: number; y: number }[]): void {
    this.lifted = cells;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
  }

  /** The zoom steps this viewport can offer, nearest first. One entry means the
   *  screen is already at the sprite-rule floor and there is nowhere to stand
   *  back to — see zoom.ts. */
  private ladder(): number[] {
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    return zoomLadder(Math.min(cssW, cssH), TILE);
  }

  /** How many zoom steps exist here. The HUD hides its control entirely when
   *  this is 1, rather than offering a button that cannot move. */
  zoomStepCount(): number {
    return this.ladder().length;
  }

  /** Which step the view is on. */
  zoomStepIndex(): number {
    return this.zoomStep;
  }

  /** Stand the view on a different rung. Out-of-range values are clamped rather
   *  than rejected, so a step restored from a previous session on a bigger
   *  screen lands somewhere sensible instead of throwing.
   *
   *  Re-running `resize()` is the entire implementation: everything downstream
   *  reads `scale`/`sw`/`sh` rather than assuming a viewport size. In
   *  particular the camera is untouched, so the view grows around the player
   *  rather than jumping — which is what keeps it locked to them through a zoom. */
  setZoomStep(i: number): void {
    this.zoomStep = i;
    this.resize();
  }

  /** Match the backing buffer to the viewport at an integer scale, keeping the
   *  world's tiles a comfortable size on phone and desktop alike. */
  resize(): void {
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    // The scale is always one of the ladder's integers, so upscaling never
    // blurs. Step 0 is the ~11-tile view this used to compute inline.
    const ladder = this.ladder();
    // Clamped HERE rather than only in setZoomStep, because the ladder shrinks
    // when the window does: dragging a desktop window narrow, or rotating a
    // phone, can retire the step the view is standing on.
    this.zoomStep = clamp(Math.round(this.zoomStep), 0, ladder.length - 1);
    this.scale = ladder[this.zoomStep];
    this.sw = Math.ceil(cssW / this.scale);
    this.sh = Math.ceil(cssH / this.scale);
    this.canvas.width = this.sw;
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
    // Zooming IN shrinks the pan clamp, which can leave an existing build-mode
    // pan outside it. Re-clamping keeps the view somewhere panBy could have put
    // it, so the next drag moves smoothly instead of snapping back.
    const lim = this.panLimit();
    this.pan.x = clamp(this.pan.x, -lim.x, lim.x);
    this.pan.y = clamp(this.pan.y, -lim.y, lim.y);
  }

  /** Snap the camera to the player (called once on load to avoid a pan-in). */
  snapCamera(world: WorldState): void {
    this.cam.x = world.player.x + this.pan.x;
    this.cam.y = world.player.y + this.pan.y;
  }

  /** Convert a canvas-relative CSS point to a world-tile coordinate (for
   *  tap-to-move / tap-to-talk). */
  screenToWorld(cssX: number, cssY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (cssX - rect.left) / this.scale;
    const sy = (cssY - rect.top) / this.scale;
    return {
      x: this.cam.x + (sx - this.sw / 2) / TILE,
      y: this.cam.y + (sy - this.sh / 2) / TILE,
    };
  }

  private sceneX(wx: number): number {
    return (wx - this.cam.x) * TILE + this.sw / 2;
  }
  private sceneY(wy: number): number {
    return (wy - this.cam.y) * TILE + this.sh / 2;
  }

  draw(world: WorldState, now: number): void {
    const ctx = this.ctx;
    const t = (performance.now() - this.t0) / 1000;
    // Taken once, so every piece drawn this frame is on the same beat.
    this.animMs = t * 1000;
    // Smooth camera follow, of the player plus whatever build mode has panned to.
    this.cam.x += (world.player.x + this.pan.x - this.cam.x) * 0.12;
    this.cam.y += (world.player.y + this.pan.y - this.cam.y) * 0.12;

    // The frame's clock, kept for anything drawn deeper down that has to agree
    // with the SIM about what day it is. The mailbox's flag is the first: it was
    // written as Date.now() and disagreed with the sim by a week under the
    // screenshot harness, which pins the page clock to a fixed afternoon. Two
    // clocks for one fact is how a flag ends up up on a box that is empty.
    this.now = now;
    // Read UP HERE, not down at the night wash where it is used to light the
    // lamps. Walls are drawn hundreds of lines before that overlay goes on, and
    // a lit window has to paint its glass warm rather than sky-blue while it is
    // being drawn — so the value has to exist before the pass that needs it,
    // not after. Taking it from the same `now` as everything else keeps the one
    // clock this file argues so hard for.
    // WHO IS STANDING IN A DOORWAY, this frame. Recomputed here rather than in
    // `syncRoofs`, which is cached on the room list and only reruns when a wall
    // moves — occupancy changes every frame by definition.
    //
    // It exists so that a door DOES something when it is used. Every other mark
    // on these façades is static; the one thing a building does dozens of times
    // a day is let somebody in and out, and until now the dark opening simply
    // swallowed them. Warmth in the doorway as somebody passes is the whole
    // effect, and it is derived from position — nothing is stored, nothing is
    // scheduled, and it lasts exactly as long as they are in it.
    this.doorBusy.clear();
    const inDoorway = (x: number, y: number) => {
      const key = tileKey(Math.round(x), Math.round(y));
      if (world.build[key]?.id === "door") this.doorBusy.add(key);
    };
    inDoorway(world.player.x, world.player.y);
    for (const v of world.villagers) {
      if ((v.layer ?? "surface") !== "surface") continue;
      // The same presence test the draw pass takes. A Ghost who is not out
      // tonight still has coordinates, and without this she would light the
      // museum's doorway from wherever she is not.
      if (!present(v, now)) continue;
      inDoorway(v.x, v.y);
    }

    this.darkness = tintAt(now).darkness;
    this.rake = rakeAt(now);
    const phase = skyPhaseAt(now);
    const night = isNight(phase);
    // Which world we are drawing. Below, nearly every pass in this method is a
    // SURFACE fact — crops, the tent, the museum's cases, roofs, villagers —
    // and skipping them is not an optimisation but the point: the underground
    // is the one continuous world with none of that in it, and the sky has even
    // less.
    //
    // A LAYER RATHER THAN A BOOLEAN, and the difference is the reason every
    // `!under` below had to be read one at a time. Two thirds of them meant
    // "only on the ground" (roofs, crops, the tent) and the rest meant "anywhere
    // there is weather" (the day/night wash) — one word for two rules, which is
    // exactly the kind of thing a third layer turns into a bug.
    const layer = world.player.layer;
    const under = layer === "under";
    const ground = layer === "surface";

    // The frame's colours: the hour and the month, resolved once. Null season
    // underground — a cave has no weather, for the same reason the tint overlay
    // below skips it. The sky KEEPS the season: it is outdoors, the hour reaches
    // it, and a plane of cloud under an August evening should be an August
    // evening.
    this.palette = scenePalette(under ? null : seasonAt(now), night);

    // Sky/base wash — a flat ground tone behind the tiles for any gaps. There
    // is no sky underground, so the gap colour is the dark itself; in the sky
    // there are no gaps at all, because the layer is floor everywhere.
    ctx.fillStyle = under ? "#0b0908" : this.palette.sky;
    ctx.fillRect(0, 0, this.sw, this.sh);

    if (ground) this.syncRoofs(world);

    // Flat ground first, then everything with height in one depth-sorted pass.
    this.raised.length = 0;
    this.laid.length = 0;
    this.blockedSteps.length = 0;
    this.litShafts.length = 0;
    this.litLamps.length = 0;
    this.litWindows.length = 0;
    this.lavaRim.length = 0;
    this.drawTiles(world, t, night, layer);
    // The carpets go down before anything stands on them, and before the build
    // grid, which is an overlay and belongs over the floor like everything else
    // the player is being shown rather than shown a picture of.
    this.flushLaid();
    if ((this.buildView || this.gridOn) && ground) this.drawBuildGrid();
    if (ground) {
      this.drawCrops(world, now);
      this.collectTent(world, night);
      this.collectPlinths(world);
    }
    this.collectMovers(world, t, night, layer, now);
    this.flushRaised();
    // Over everything, because it is in front of everything: a petal passes the
    // trunk it fell from. Not in the raised pass — that sorts on a FOOTPRINT y,
    // and a mote has no footprint to sort on, which is the same statement as it
    // having no height (see MoteKit).
    // The ones that are OBJECTS — petals, spores, the glimmer's sparks. Night
    // falls on them like it falls on a leaf, so they belong under the wash. The
    // flashers are drawn further down, after it (see `drawMotes`).
    if (ground) this.drawMotes(world, t, false);

    // The dark goes over the scene but UNDER the reticle. The reticle is the
    // promise (ROADMAP), and a promise you can't read at the far edge of your
    // own lamp is worse than no promise — it's the button pointing somewhere
    // you have to guess about.
    if (under) this.drawDark(world, now);
    // Off only for the region preview page, which is a still life of GROUND: the
    // reticle promises what ACT will touch, and a promise made to nobody, in the
    // middle of nine swatches at once, is just a white box over the thing you
    // came to look at. Never turned off in the game — see setChrome.
    if (this.chrome) this.drawTargetTile(world);
    if (this.chrome) this.drawWalkTarget(world, t);
    if (ground) {
      this.drawBlockedSteps(t);
      this.drawHomeCandidates(t);
    }
    // Not gated on `ground`: the lamp is movable and the lamp lives in the rock.
    this.drawLifted(t);

    // Real-clock day/night wash over the whole scene. Not underground: a cave
    // looks the same at 3am as at noon, and the only dark down there that means
    // anything is the one your lamp is holding back.
    // The sky is INCLUDED, deliberately: it is outdoors, so night falls on it
    // like anywhere else. A white plane that stayed noon-bright at three in the
    // morning would be the one place in the game the clock does not reach, and
    // the clock is what this whole world runs on.
    const tint = tintAt(now);
    if (tint.overlay && !under) {
      ctx.fillStyle = tint.overlay;
      ctx.fillRect(0, 0, this.sw, this.sh);
      // Lamps glow back through the wash, and ONLY through it. Scaled by how
      // dark it actually is, so a lamp does nothing at noon and is the reason
      // you can see your own yard at midnight — the same relationship a shaft
      // has with daylight underground, pointed the other way.
      //
      // Over the tint rather than under it, because the tint is a flat fill over
      // the whole viewport: a glow drawn first would simply be washed with
      // everything else, and punching a hole in the overlay per lamp would need
      // a second lighting model up here for no gain.
      // Doubled, and not as a fudge. `darkness` is how strong the WASH is, and
      // night's is 0.5 where the underground's dark runs to 0.94 — so passing it
      // straight through made a lamp on your own land half as bright as the same
      // lamp in a tunnel, for no reason a player could ever infer. What the
      // argument means is "how much light to add", and above ground at midnight
      // the answer is all of it. Clamped, so dusk and dawn stay hints of warmth.
      this.drawLampGlow(Math.min(1, tint.darkness * 2));
      // AND THE LAVA, on the lamps' terms exactly: a source glows back through
      // the wash and only through it, scaled by how dark it actually is. By day
      // the seams carry it alone (they are drawn bright in the tile pass); after
      // dark this is the only light for a hundred tiles in any direction, and the
      // first terrain in the game that is a light source at all.
      this.drawLavaGlow(Math.min(1, tint.darkness * 2));
      // AND THE FIREFLIES, for exactly the reason the lamps are here.
      //
      // They were drawn with the petals, under this fill — so the wash went over
      // them and every firefly on screen peaked at the same clamped (139,137,154)
      // whatever its own phase or hex was. That is the measurement that found
      // this: four motes at four different points in their cycles cannot land on
      // one colour unless something downstream is flattening all of them.
      //
      // A firefly is a SOURCE. Night does not fall on a light, it is what the
      // light is seen against, and the wash is the night. Above it, the additive
      // dot lands on the darkened scene instead of being darkened with it, which
      // is the whole of "make them brighter" — no hex could have bought it from
      // underneath.
    }
    if (ground) this.drawMotes(world, t, true);
  }

  // --- Tilemap ----------------------------------------------------------------
  // Drawn chunk by chunk: the visible tile span is widened to whole chunks and
  // each is touched via getChunk, so the camera streams chunks in as it moves
  // and only what's on screen is ever generated. Within a chunk, tiles still go
  // through tileAt so player edits (which live outside the chunk) win.
  private drawTiles(world: WorldState, t: number, night: boolean, layer: Layer): void {
    const x0 = Math.floor(this.cam.x - this.sw / (2 * TILE)) - 1;
    const x1 = Math.ceil(this.cam.x + this.sw / (2 * TILE)) + 1;
    const y0 = Math.floor(this.cam.y - this.sh / (2 * TILE)) - 1;
    const y1 = Math.ceil(this.cam.y + this.sh / (2 * TILE)) + 1;

    // The frame's dither phase, resolved once (see `ditherFill`): where the
    // world's even pixels have landed on screen this frame.
    const ox = Math.round(this.sceneX(0) - TILE / 2) + Math.round(this.sceneY(0) - TILE / 2);
    this.ditherPhase = ((ox % 2) + 2) % 2;

    const c0 = chunkCoordOf(x0, y0);
    const c1 = chunkCoordOf(x1, y1);
    for (let cy = c0.cy; cy <= c1.cy; cy++) {
      for (let cx = c0.cx; cx <= c1.cx; cx++) {
        // Stream it in (and keep it resident). The lower layer has its own
        // chunks under their own keys, so the camera streams rock exactly the
        // way it streams grass and nothing here assumes a bounded world.
        getChunk(world, cx, cy, layer);
        this.drawChunkTiles(world, cx, cy, x0, x1, y0, y1, t, night, layer);
      }
    }
  }

  /** The turf's region here, blended across any border it is near.
   *
   *  GROUND AND TUFT ONLY. `scatterSkin` is the answer for a tree, and the
   *  two must not be swapped: a crown is an object and takes the hard region, so
   *  the treeline stays crisp while the grass under it fades. A blended crown
   *  would be a pine that is partly a birch, which is not a thing.
   *
   *  Deliberately NOT memoized. The ground fill and the tuft both ask, so a cache
   *  looks free — but it would be a per-frame map keyed by a built string, and
   *  allocating a thousand of those costs more than walking nine sites twice.
   *  Same reasoning `biomeAt` gives for having no cache of its own. */
  /** How far this tile pushes a frayed edge, in weight — see
   *  `sharpenRegions` and content/biomes.ts §edge.
   *
   *  A FIELD AND NOT A HASH, which is the same call the granite's sheets, the
   *  fen's ponds and the ground roll all made before it. A per-cell roll across a
   *  ten-tile transition is a dithered gradient — visibly a machine easing
   *  between two colours — where a field five tiles long comes out in lobes,
   *  which is what a fire front actually leaves behind.
   *
   *  Zero unless something here actually frays, so the cost is a lookup on the
   *  parts array for every tile in the world and a noise sample for the few
   *  hundred per burn that need one. */
  private frayAt(world: WorldState, tx: number, ty: number, parts: RegionPart[]): number {
    if (!parts.some((p) => p.def.edge === "fray")) return 0;
    return (smoothNoise(tx, ty, world.seed ^ 0x4d21, FRAY_PERIOD) - 0.5) * 2 * FRAY_AMOUNT;
  }

  /** A tile's region shares, with any edge that does not fade resolved. The one
   *  place the render path asks the question, so the turf, the decor kits and the
   *  air cannot disagree about which side of a burn a cell is on. */
  private regionsAt(world: WorldState, tx: number, ty: number): RegionPart[] {
    const raw = regionParts(world.seed, world.homestead.spot, tx, ty);
    return sharpenRegions(raw, this.frayAt(world, tx, ty, raw));
  }

  private turf(world: WorldState, tx: number, ty: number): BiomeDef {
    const raw = regionParts(world.seed, world.homestead.spot, tx, ty);
    // The flats stop dead and the burns end in tongues (content/biomes.ts §edge).
    // Resolved before the blend, so a tile is crust or turf, ash or turf, and
    // never a mix of the two.
    const parts = sharpenRegions(raw, this.frayAt(world, tx, ty, raw));
    const def = blendRegions(parts);
    // EXCEPT THE WATER, WHICH STILL FADES, and it is blended off the RAW shares
    // for that reason. A stream carries the pan downstream — the milk has
    // somewhere to go — where the crust has none, so the one thing crossing a
    // hard edge that should not snap at it is the thing that flows. Snapped, a
    // stream changed colour mid-current on the tile the border crossed it, which
    // reads as a bug in the water rather than as an edge of the land.
    const wet = raw.some((p) => p.def.waterTint) ? blendRegions(raw).waterTint : undefined;
    if (wet) def.waterTint = wet;
    // ONE REGION, NOTHING TO DISSOLVE — and this early-out is also the promise
    // that most of the world is bit-identical to what it was: the jitter below
    // can only ever touch a tile that is between two regions.
    if (parts.length === 1) return def;
    // THE BLEND STEPS, BECAUSE COLOUR IS PER TILE. 8d softened the region border
    // by fading one tint into the next, and that was measured against near
    // regions, whose greens are a few RGB units apart. The far country broke the
    // assumption twice over: the cinders' ash and the salt flats' crust are a
    // hundred and fifty units from grass, so a ten-tile fade lands fifteen units a
    // TILE — and a smooth gradient quantised onto cells is a flight of hard
    // stripes, which is the band rule arriving from a direction nobody had
    // guarded (photographed at both borders; the cinders had been doing it since
    // they shipped).
    //
    // Dithering is the standard answer to a banded gradient and it is also this
    // file's own habit — what cannot be blended gets rolled per cell (the decor
    // kits, the flora pick, the Static's two inks). A hashed nudge of ±half a
    // step, on the world coordinate so it never crawls, turns the stripes into
    // grain: the eye integrates it into the same gradient without any edge in it.
    //
    // Ground and tuft take the SAME nudge, or the speckle drifts off the surface
    // it is texture on.
    const j = (decoHash(tx, ty, world.seed ^ 0x77af) - 0.5) * BORDER_DITHER;
    const nudge = (t: Tint): Tint => ({ color: t.color, amount: clamp01(t.amount + j) });
    // The water tint takes the same nudge where a region has one, for the same
    // reason and with more at stake: a stream leaving the salt flats crosses the
    // fade lengthwise, so its bands would run ALONG the water rather than across
    // the country, which is a ladder painted on a river.
    return {
      ...def,
      ground: nudge(def.ground),
      tuft: nudge(def.tuft),
      ...(def.waterTint ? { waterTint: nudge(def.waterTint) } : {}),
    };
  }

  /** Which region's decor kit this cell draws — its own, or a neighbour's.
   *
   *  THE UNDERSTORY INTERLEAVES WHERE THE CANOPY CANNOT, YET. 8d blended the
   *  turf's colour and left flora on the hard answer, because softening a
   *  treeline means changing which cells grow a tree, and that is generation:
   *  it moves solidity, it spends the `HOME_REGION_REACH` margin, and it wants
   *  the thousand-seed test re-run.
   *
   *  Decor is not generation. It owns no cell, blocks nobody and is stored
   *  nowhere, so it can be dithered for free — the cell rolls against the same
   *  region weights the tint is blended from, and ferns thin out into the
   *  birches on exactly the border the ground is already fading across. When the
   *  canopy dither lands it should use these same weights, and then the whole
   *  border moves together.
   *
   *  Picked off the mark's OWN hash, so a cell's kit never changes between
   *  frames and never correlates with which mark it drew.
   *
   *  GENERIC IN THE SLOT, because the thing it is really doing is "give this cell
   *  ONE of the regions it is between, by their own weights". That question is
   *  the same for a fern kit, a bloom, what floats on the water, and whether the
   *  ground here is being drawn wrong — see the Static, which frays at its edge
   *  through exactly this dither. Pass `(d) => d` to get the whole row. */
  private decorKit<T>(
    world: WorldState,
    tx: number,
    ty: number,
    h: number,
    slot: (d: BiomeDef) => T | undefined,
  ): T | undefined {
    // Sharpened first, like the turf: a region that does not fade must not have
    // its ferns — or its cracked plates, or its ash — dithered a few tiles out
    // past the edge of itself, which would be the fade coming back in a speckled
    // costume.
    const parts = this.regionsAt(world, tx, ty);
    if (parts.length === 1) return slot(parts[0].def);
    let r = h;
    for (const p of parts) {
      r -= p.w;
      if (r <= 0) return slot(p.def);
    }
    return slot(parts[parts.length - 1].def);
  }

  /** A ground tile's fill: its colour with the open-ground roll applied.
   *
   *  `groundTone` is smooth noise on the WORLD coordinate at an 11-and-29-tile
   *  wavelength, so a light patch is half a screen across and its edges can never
   *  line up with a cell — the band rule's own prescribed fix (CLAUDE.md), and
   *  the reason this mixes continuously instead of stepping into shades.
   *  Neighbouring tiles differ by well under a percent; the field has shape and
   *  no seams.
   *
   *  Toward BLACK, and not toward the tile's own `shade`. The obvious version
   *  mixed `color` into `shade`, and `shade` is the boundary lip — eight RGB
   *  units from the fill, deliberately, because it is drawn as a 1px edge where
   *  one material meets another. Running a whole field across it moved the green
   *  by three units and photographed as no change at all. Darken only, never
   *  lighten: mixing toward white desaturates, and grass that loses its green in
   *  the bright patches reads as sun-bleach on a lawn nobody has left.
   *
   *  A laid floor gets nothing, because `finishFor` hands back a skin with no
   *  `roll` on it — a made surface stays as flat as it was laid and takes a grain
   *  instead.
   *
   *  `quantise` SNAPS IT TO FOUR STEPS, for the regions that are drawn wrong. A
   *  smooth field means every tile in the world is very slightly its own colour,
   *  which is exactly what a low-bitrate surface does NOT do — and it would give
   *  the two-ink cache a fresh entry per tile. Snapped, the Static's floor comes
   *  out in flat blocks with visible steps between them, which is what a picture
   *  looks like when it has lost its depth. The effect and the arithmetic wanted
   *  the same thing. */
  private rolled(def: TileDef, tx: number, ty: number, seed: number, quantise = false): string {
    if (!def.roll) return def.color;
    const tone = groundTone(tx, ty, seed);
    return mixHex(def.color, {
      color: "#000000",
      amount: (1 - (quantise ? Math.round(tone * 4) / 4 : tone)) * def.roll,
    });
  }

  /** THE TWO-INK FILL — a 2×2 checker of `a` and `b`, as a pattern.
   *
   *  PHASED OFF THE WORLD, NOT THE CELL, which is the whole of what makes this
   *  legal (content/biomes.ts §dither, and CLAUDE.md §per-cell edges). A checker
   *  laid inside each tile would put an identical two-pixel pattern in every cell
   *  and the ground would read as tiling; run across the world it is a surface
   *  drawn at a coarser resolution, which is what the Static is claiming to be.
   *
   *  The phase is a fact about the FRAME and not about a tile: every tile shares
   *  the camera's offset and TILE is even, so the parity of a tile's screen corner
   *  is the same for all of them (and for the trees standing on them, which take
   *  the same dither). It is resolved once per draw in `drawTiles`. At odd parity
   *  the two inks are simply swapped, which is the same checker seen from one
   *  pixel over — so no transform is ever applied to the pattern.
   *
   *  CACHED BY PAIR, and the cache is why the ground roll is quantised where a
   *  region dithers: a continuous roll means a fresh colour per tile, and a fresh
   *  pattern per tile would allocate a canvas for every cell on screen every
   *  frame. Four steps of roll times two inks is a handful of entries for the
   *  life of the session.
   *
   *  Returns null if the context refuses a pattern, and the caller falls back to
   *  the flat ink — a region that came out a plain wrong colour is a worse
   *  picture, not a broken one. */
  private ditherFill(a: string, b: string): CanvasPattern | null {
    const swap = this.ditherPhase === 1;
    const key = swap ? `${b}|${a}` : `${a}|${b}`;
    let pat = this.dithers.get(key);
    if (pat === undefined) {
      const cell = document.createElement("canvas");
      cell.width = 2;
      cell.height = 2;
      const g = cell.getContext("2d")!;
      const [p, q] = swap ? [b, a] : [a, b];
      g.fillStyle = p;
      g.fillRect(0, 0, 1, 1);
      g.fillRect(1, 1, 1, 1);
      g.fillStyle = q;
      g.fillRect(1, 0, 1, 1);
      g.fillRect(0, 1, 1, 1);
      pat = this.ctx.createPattern(cell, "repeat");
      this.dithers.set(key, pat);
    }
    return pat;
  }

  /** THE PLATES a cracked flat is broken into — the part of the network that
   *  crosses this cell.
   *
   *  A LATTICE OF POINTS, JOINED TO THEIR NEIGHBOURS. Each lattice cell holds one
   *  jittered point; each point draws a line to the point east of it and the point
   *  south of it. That is a connected web with no ends in it, and the plates are
   *  the holes between the lines — which is what dried mud actually is, and what
   *  no per-cell mark could ever be.
   *
   *  WHY THIS MAY EXIST WHERE A BEVEL MAY NOT. The band rule is about a mark drawn
   *  once per CELL, which pairs across the grid into stripes. These lines know
   *  nothing about cells: the lattice is six tiles wide, the endpoints are jittered
   *  off it, and a line crosses a tile wherever it happens to. Nothing here can
   *  line up with the tile grid because nothing here has ever been told where the
   *  tile grid is.
   *
   *  Rasterised by stepping the longer axis and clipping to the tile, so a line
   *  costs about its own length in the cells it actually touches and nothing
   *  anywhere else. The 3×3 lattice neighbourhood is the same margin `pondDepth`
   *  keeps and for the same reason — a segment starting two lattice cells away can
   *  still cross this one. */
  private drawCracks(
    px: number,
    py: number,
    tx: number,
    ty: number,
    seed: number,
    kit: { color: string; period: number; alpha: number },
  ): void {
    const ctx = this.ctx;
    const cell = kit.period;
    const cx = Math.floor(tx / cell);
    const cy = Math.floor(ty / cell);
    // The point this lattice cell owns, in tiles. Two salts rather than swapped
    // arguments — the diagonal bug `pondDepth` documents.
    const point = (mx: number, my: number): { x: number; y: number } => ({
      x: (mx + 0.15 + (hash2(mx, my, seed ^ 0x71ab) / 4294967296) * 0.7) * cell,
      y: (my + 0.15 + (hash2(mx, my, seed ^ 0x71ab ^ 0x2c5f) / 4294967296) * 0.7) * cell,
    });
    ctx.fillStyle = kit.color;
    ctx.globalAlpha = kit.alpha;
    // A KINK IN THE MIDDLE OF EVERY LINE. Straight point-to-point segments drew a
    // web of perfectly ruled lines — a Voronoi diagram, which is what the lattice
    // literally is and not what a broken surface looks like. Cracked ground turns
    // at its junctions AND between them, so each edge is bent at its midpoint by
    // a hashed offset perpendicular to itself. Two segments where there was one,
    // and the flat stops reading as a drawing of a map.
    const bend = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      salt: number,
    ): { x: number; y: number } => {
      const h = hash2(Math.round(a.x * 4), Math.round(b.y * 4), seed ^ salt) / 4294967296;
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const k = (h - 0.5) * 0.22;
      return { x: (a.x + b.x) / 2 + nx * k, y: (a.y + b.y) / 2 + ny * k };
    };
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const a = point(cx + dx, cy + dy);
        const ends = [point(cx + dx + 1, cy + dy), point(cx + dx, cy + dy + 1)];
        for (const b of [
          [a, bend(a, ends[0], 0x4c1d)],
          [bend(a, ends[0], 0x4c1d), ends[0]],
          [a, bend(a, ends[1], 0x9e33)],
          [bend(a, ends[1], 0x9e33), ends[1]],
        ].map(([p, q]) => ({ from: p, to: q }))) {
          // In world PIXELS, and clipped to this tile before anything is drawn:
          // most of the six segments in the neighbourhood miss it entirely.
          const ax = b.from.x * TILE;
          const ay = b.from.y * TILE;
          const bx = b.to.x * TILE;
          const by = b.to.y * TILE;
          const wx = tx * TILE;
          const wy = ty * TILE;
          if (Math.max(ax, bx) < wx || Math.min(ax, bx) > wx + TILE) continue;
          if (Math.max(ay, by) < wy || Math.min(ay, by) > wy + TILE) continue;
          const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
          for (let i = 0; i <= steps; i++) {
            const lx = Math.round(ax + ((bx - ax) * i) / steps);
            const ly = Math.round(ay + ((by - ay) * i) / steps);
            if (lx < wx || lx >= wx + TILE || ly < wy || ly >= wy + TILE) continue;
            ctx.fillRect(px + (lx - wx), py + (ly - wy), 1, 1);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /** The ink a decor mark's stem is drawn in.
   *
   *  FOLIAGE INK, NOT THE TUFT'S. The first cut drew decor in the tuft colour and
   *  was invisible on screen — which is 8c's own mistake repeated: reaching for
   *  the nearest existing colour, when the tuft is a speckle deliberately a few
   *  units off the grass it sits on. A fern is a small plant, so it takes the
   *  colour the region's CANOPY takes, and it seasons with it for free.
   *
   *  Stated rather than inherited from `ctx.fillStyle`, which holds the tuft
   *  colour only on cells that happened to draw a tuft and whatever the last call
   *  left behind on the rest. */
  private stemInk(world: WorldState, tx: number, ty: number): string {
    return this.foliage(this.turf(world, tx, ty), false);
  }

  /** This frame's foliage colour for a region — see `palette.ts` §foliage, where
   *  the order is stated and where the tests can reach it. */
  private foliage(biome: BiomeDef | null | undefined, lit: boolean): string {
    return foliage(biome, this.palette, lit);
  }

  /** One mark from a kit, placed inside a cell.
   *
   *  ONE FUNCTION FOR THREE SLOTS — the year-round decor, the bloom, and now what
   *  floats on the marshes' water. It was written twice inline and copied a third
   *  time before this existed, and the third copy is what made the case: the
   *  placement rule below (inset by a pixel, so two marks in neighbouring cells
   *  can never touch and pair edges into a lattice) is the band rule, and a rule
   *  living in three places is a rule that will shortly be true in two of them.
   *
   *  `p` is the caller's own hash — each slot passes a different one, which is
   *  what keeps a bloom off the ferns' cells and the lilies off both. */
  private drawKitMark(
    kit: DecorKit,
    px: number,
    py: number,
    p: number,
    stem: string,
    /** The region's glitch, where it has one — see `BiomeDef.glitch`. A mark in
     *  the Static separates into two channels and may be torn sideways; a mark
     *  anywhere else takes this path with `glitch` undefined and is drawn exactly
     *  as it always was. */
    glitch?: BiomeDef["glitch"],
  ): void {
    const ctx = this.ctx;
    const mark = kit.marks[Math.floor(p * kit.marks.length) % kit.marks.length];
    const mh = mark.length;
    const mw = Math.max(...mark.map((r) => r.length));
    // INSET BY A PIXEL on every side — see above. Two pixels where a region
    // fringes, because the ghosts sit one pixel outside the mark and the whole
    // point of the inset is that nothing can touch the next cell's mark.
    const pad = glitch ? 2 : 1;
    const ox = px + pad + Math.floor(((p * 97) % 1) * (TILE - mw - pad * 2 + 1));
    const oy = py + pad + Math.floor(((p * 883) % 1) * (TILE - mh - pad * 2 + 1));
    // THE TEAR IS PER ROW AND IT IS NOT A CONSTANT SHEAR. A mark whose rows all
    // slid the same way is italic; what reads as damage is rows disagreeing —
    // one over, the next back, the next not at all.
    const torn = glitch && ((p * 617) % 1) < glitch.tear;
    const slide = (r: number): number =>
      torn ? Math.round(((decoHash(Math.round(ox), Math.round(oy) + r, 0x2f11) - 0.5) * 4)) : 0;
    const put = (dx: number, ink: string, alpha: number): void => {
      ctx.globalAlpha = alpha;
      for (let r = 0; r < mh; r++) {
        const sx = ox + dx + slide(r);
        for (let c = 0; c < mark[r].length; c++) {
          if (mark[r][c] === ".") continue;
          ctx.fillStyle = ink;
          ctx.fillRect(sx + c, oy + r, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    };
    // THE CHANNELS FIRST, THE MARK OVER THEM. Drawn under rather than over so the
    // plant is still a plant — what you see is a green thing with colour leaking
    // out either side of it, which is separation. Over the top it would be a
    // magenta plant, which is a different species.
    if (glitch) {
      put(-1, glitch.cold, 0.55);
      put(1, glitch.warm, 0.55);
    }
    paintMark(ctx, kit, mark, ox, oy, stem, slide);
  }

  /** CORRUPT SCANLINES — runs of flat colour where a row of ground should be.
   *
   *  The third of the Static's three failures (content/biomes.ts §glitch), and
   *  the one that reads from across the screen: a line of the picture arriving
   *  wrong, holding for a third of a second, and arriving differently next time.
   *
   *  ON THE WORLD PIXEL ROW AND A RUN OF ITS OWN. A tear is keyed on `(run cell,
   *  world row, clock step)`, so it starts and ends wherever the run says and
   *  crosses tile boundaries without knowing they are there — the band rule's
   *  requirement, and also the whole effect: a tear that stopped at cell edges
   *  would be a dotted line at the tile pitch, which is the failure this project
   *  has now had five times.
   *
   *  The neighbouring run is checked too, for `pondDepth`'s reason one dimension
   *  down: a tear starting in the run to the west can reach into this tile.
   *
   *  THE INKS ARE THE REGION'S OWN, plus its two channels. A tear in a colour
   *  from outside the palette is a sprite lying on the grass; a tear in the
   *  ground's own second ink is the ground being drawn wrong, which is the
   *  sentence. */
  private drawTears(
    px: number,
    py: number,
    tx: number,
    ty: number,
    seed: number,
    t: number,
    inks: string[],
    kit: NonNullable<BiomeDef["glitch"]>,
  ): void {
    const ctx = this.ctx;
    const { density, run, period } = kit.bars;
    const step = Math.floor(t / period);
    const left = tx * TILE;
    const top = ty * TILE;
    // FROM ABOVE THE TILE, because a band is up to three rows tall and one
    // starting in the cell above has to finish in this one. Same margin the crack
    // network and `pondDepth` keep, one axis down — and the reason a band is not
    // simply drawn per row: a tear that stopped at the top edge of a cell would
    // be a mark at the tile pitch, which is the failure this whole file is built
    // to avoid.
    for (let r = -3; r < TILE; r++) {
      const wy = top + r;
      const cell = Math.floor(left / run);
      for (const k of [cell - 1, cell]) {
        const h = decoHash(k * 31 + step, wy, seed ^ 0x51c9);
        if (h >= density) continue;
        // Everything about the tear comes off the same hash, scaled to different
        // decimals — the decor kit's trick, and the reason a tear's length never
        // correlates with where it starts.
        const g = h / density;
        const x0 = k * run + Math.floor(((g * 97) % 1) * run);
        const len = 5 + Math.floor(((g * 313) % 1) * run);
        // ONE TO THREE ROWS TALL, AND THE HEIGHT IS THE DIFFERENCE between a
        // tear and a scratch. At one pixel a band photographed as a hairline —
        // legible, and reading as damage to the SCREEN rather than as the
        // picture arriving wrong. A band with thickness is a slice of the image,
        // which is what a corrupt scanline actually looks like.
        const tall = 1 + Math.floor(((g * 149) % 1) * 3);
        const y0 = Math.max(r, 0);
        const y1 = Math.min(r + tall, TILE);
        if (y1 <= y0) continue;
        const from = Math.max(x0, left);
        const to = Math.min(x0 + len, left + TILE);
        if (to <= from) continue;
        ctx.fillStyle = inks[Math.floor(((g * 613) % 1) * inks.length) % inks.length];
        ctx.fillRect(px + (from - left), py + y0, to - from, y1 - y0);
      }
    }
  }

  /** Is this kit's month the one we are in?
   *
   *  `palette.season` is null underground, which is correct without a special
   *  case and for the mote's exact reason: a cave has no month, so a seasonal
   *  thing in one would be weather where §Seasons says there is none. */
  private inSeason(kit: { season?: SeasonId }): boolean {
    return !kit.season || this.palette.season?.id === kit.season;
  }

  /** Draw the on-screen tiles of one chunk. */
  private drawChunkTiles(
    world: WorldState,
    cx: number,
    cy: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    t: number,
    night: boolean,
    layer: Layer,
  ): void {
    const ctx = this.ctx;
    const tyStart = Math.max(y0, cy * CHUNK);
    const tyEnd = Math.min(y1, cy * CHUNK + CHUNK - 1);
    const txStart = Math.max(x0, cx * CHUNK);
    const txEnd = Math.min(x1, cx * CHUNK + CHUNK - 1);

    for (let ty = tyStart; ty <= tyEnd; ty++) {
      for (let tx = txStart; tx <= txEnd; tx++) {
        // Each layer draws its own cell, and they are separate methods on the
        // file's existing argument (see drawUnderCell): almost nothing they draw
        // is the same, and one method full of layer tests would be three
        // characters sharing a costume.
        if (layer === "under") {
          this.drawUnderCell(world, tx, ty);
          continue;
        }
        if (layer === "sky") {
          this.drawSkyCell(world, tx, ty);
          continue;
        }
        const id = tileAt(world, tx, ty);
        // Resource nodes stand up, so the flat pass draws only the ground they
        // stand ON and defers the node itself to the raised pass. Without this
        // a tree is trapped inside its own 16px cell and the world reads flat.
        if (
          id === TREE ||
          id === SHRUB ||
          id === ROCK ||
          id === STUMP ||
          id === LOG ||
          id === DARK_TREE ||
          id === HUM_CUBE ||
          id === POLE ||
          id === MAILBOX ||
          id === STAIR
        ) {
          const x = tx;
          const y = ty;
          this.raised.push({
            y,
            bias: BIAS_TERRAIN,
            draw: () => {
              if (id === ROCK) this.drawRock(world, x, y, t, night);
              else if (id === SHRUB) this.drawShrub(world, x, y, night);
              else if (id === STUMP || id === LOG) this.drawDeadwood(world, x, y, night, id === LOG);
              else if (id === HUM_CUBE) this.drawCube(world, x, y, night);
              else if (id === POLE) this.drawPole(world, x, y, night);
              else if (id === MAILBOX) this.drawMailbox(world, x, y, night);
              else if (id === STAIR) this.drawStair(world, x, y, night);
              // A dark tree is a tree drawn in the other palette — one flag, not
              // a second function. It is the same tree in every other way
              // (content/nodes.ts), and two draw paths would let them drift into
              // looking like two different plants.
              else this.drawTree(world, x, y, t, night, id === DARK_TREE);
            },
          });
        }
        // Anything STANDING on this tile. Looked up per visible tile rather
        // than by walking world.build, so the cost is bounded by the screen and
        // not by how much the player has ever built.
        const key = tileKey(tx, ty);
        const built = world.build[key];
        // OVERHEAD PIECES ARE NOT IN THIS PASS. A skylight lives a storey up and
        // is drawn by the roof, over the same cell (see drawRoofCell); reaching
        // it here would stand it on the floor as a wall.
        if (built && !overhead(built.id)) {
          const x = tx;
          const y = ty;
          this.raised.push({
            y,
            bias: BIAS_TERRAIN,
            draw: () =>
              built.id === "fence"
                ? this.drawFence(world, x, y, built)
                : this.drawWall(world, x, y, built),
          });
          // Only while building: a blocked doorstep is a mistake you make with
          // the build tools, and it's the build tools that can fix it. Asked
          // per visible door, so the cost is bounded by the screen like the
          // rest of this pass.
          if (this.buildView && built.id === "door") {
            for (const step of blockedDoorsteps(world, tx, ty)) this.blockedSteps.push(step);
          }
        }
        // What is LAID here, collected at its anchor exactly as the standing
        // piece below is, into the list that draws before anything stands up.
        const rug = world.floor[key];
        if (rug) {
          const ax = tx;
          const ay = ty;
          const span = footprint(furnitureDef(rug.id), rug.facing);
          this.laid.push({
            y: ay + span.h - 1,
            bias: BIAS_TERRAIN,
            draw: () => this.drawFurniture(world, ax, ay, rug),
          });
        }
        // Furniture is collected at its ANCHOR only, so a 2-tile piece is drawn
        // once rather than once per cell it covers. Sorted on its SOUTHERN row
        // so a bed's far end can't sort in front of its own near end.
        const piece = world.furniture[key];
        if (piece) {
          const ax = tx;
          const ay = ty;
          const span = footprint(furnitureDef(piece.id), piece.facing);
          this.raised.push({
            y: ay + span.h - 1,
            bias: BIAS_TERRAIN,
            draw: () => this.drawFurniture(world, ax, ay, piece),
          });
          // A lamp under a SOLID roof lights the room, not the street. Its
          // pool and its flame are both drawn after the night wash, so an
          // indoor lamp used to paint a bright spot straight through the roof
          // over it — which nobody had called a bug while houses were sealed
          // boxes, and which windows make indefensible: the whole claim a lit
          // window makes is that the light got out THERE, through the glass.
          //
          // Keyed on the roof's own fade, so walking inside lights the lamp up
          // as the roof comes off. That is the cutaway already doing the work.
          if (furnitureDef(piece.id).light && !this.underSolidRoof(tx, ty)) {
            this.litLamps.push({ x: tx, y: ty });
          }
        }
        // Roofs are derived, not stored, so they come from the room index
        // rather than from the build layer.
        const roofRoom = this.roofIndex.get(key);
        if (roofRoom && !this.buildView) {
          const x = tx;
          const y = ty;
          const alpha = this.roofAlpha.get(roofRoom.id) ?? 1;
          const covered = this.roofCover.get(roofRoom.id)!;
          const roofing = this.roofSkin.get(roofRoom.id)!;
          const fall = this.roofFall.get(roofRoom.id)!;
          if (alpha > 0.02) {
            this.raised.push({
              y,
              bias: BIAS_ROOF,
              draw: () =>
                this.drawRoofCell(
                  world,
                  x,
                  y,
                  covered,
                  roofing,
                  fall,
                  alpha,
                  this.chimney.get(roofRoom.id)?.cell === tileKey(x, y)
                    ? this.chimney.get(roofRoom.id)!.finish
                    : null,
                  // The one roof feature that is PLACED, read straight off the
                  // build layer at the cell the roof is covering. Interior only
                  // — `roofRoom` also covers the shell, and a skylight stamped
                  // over a wall is a hole cut in the eave (sim/game.ts refuses
                  // to place one there; this refuses to draw one, so a
                  // hand-edited save is a missing skylight rather than a
                  // hole through the masonry).
                  world.build[key]?.id === "skylight" && roofRoom.interior.has(key),
                  this.flag.get(roofRoom.id) === tileKey(x, y),
                ),
            });
          }
        }
        const groundId = groundIdOf(id);
        // Built tiles wear THEIR OWN finish — appearance is a free property of
        // the tile, never a separate item (DESIGN §Materials). Two floors laid
        // on different days may differ, and neither changes when you pick up a
        // different finish.
        //
        // A FINISH IS ASKED FIRST AND WINS OUTRIGHT, which is what makes the two
        // repaints disjoint by construction rather than by discipline: a season
        // can only ever reach a tile that had no finish to lose. See finishFor's
        // docblock for why that matters.
        // A FINISH IS ASKED FIRST AND WINS OUTRIGHT — and that now settles the
        // biome too, on the same argument: a whitewashed floor is whitewashed in
        // the fen. Only untouched natural ground gets the region's colour.
        // ASKED ONCE AND HANDED ON. The ground fill, the cracks and the dither all
        // want the tile's blended region, and `turf` is deliberately not memoized
        // (see its docblock) — so the saving is in not asking three times rather
        // than in a cache.
        const turf = this.turf(world, tx, ty);
        // The season's answer, kept, because the region's SECOND ink is applied to
        // it rather than to the first ink — see the dither below.
        // THE FLOOR TAKES ITS REGION'S SHARE OF THE MONTH TOO (§seasonPull.ground),
        // and it is the blended region that decides — a needle mat and the lawn
        // beside it take different amounts of October, and a hard switch on the
        // tile the heaviest region flips would draw autumn as a line across the
        // ground. `blendRegions` averages the dial for exactly that reason.
        const seasoned = seasonSkin(
          tileDef(groundId),
          groundId,
          this.palette,
          turf.seasonPull?.ground ?? 1,
        );
        // WINTER IS PASSED, NOT LOOKED UP, so the one place that knows the month
        // is the palette (§BiomeDef.snow). A finish still wins outright: a floor
        // somebody laid is a thing they did, and snow lying on the boards they
        // swept is a decision this game has not made.
        const season = this.palette.season?.id;
        const def =
          finishFor(world, groundId, tx, ty) ?? biomeSkin(seasoned, groundId, turf, season);
        const px = Math.round(this.sceneX(tx) - TILE / 2);
        const py = Math.round(this.sceneY(ty) - TILE / 2);
        // Open ground rolls. `groundTone` is smooth noise on the WORLD
        // coordinate at an 11-and-29-tile wavelength, so a light patch is half a
        // screen across and its edges can never line up with a cell — the band
        // rule's own prescribed fix (CLAUDE.md), and the reason this mixes
        // continuously instead of stepping into shades. Neighbouring tiles differ
        // by well under a percent; the field has shape and no seams.
        //
        // WHICH surfaces roll, and how much, is a field on the tile (`roll`) and
        // no longer a `name === "Grass" || name === "Sand"` check here. That
        // check was written when grass was the only ground anybody was looking
        // at, and it silently decided the answer for every tile added after it:
        // the plaza came out the one major surface in the game with no texture
        // of any kind, and nothing in the code said so.
        //
        // A laid floor still gets nothing. `finishFor` wins outright above and
        // returns a skin with no `roll` on it, so a made surface stays exactly
        // as flat as it was laid and takes a grain instead — the two halves of
        // the same decision, as the note below says.
        // Toward BLACK, and not toward the tile's own `shade`. The obvious
        // version mixed `color` into `shade`, and `shade` is the boundary lip —
        // eight RGB units from the fill, deliberately, because it is drawn as a
        // 1px edge where one material meets another. Running a whole field
        // across it moved the green by three units and photographed as no change
        // at all. The lip's job and this one are different jobs.
        //
        // Darken only, never lighten: mixing toward white desaturates, and grass
        // that loses its green in the bright patches reads as sun-bleach on a
        // lawn nobody has left. 14% between the lightest patch and the darkest.
        // THE REGION THAT IS DRAWN WRONG, if this cell is in one. Picked per cell
        // off the same weights the tint is blended from — the decor kit's dither,
        // which is the house answer to "this thing cannot be half-applied" — so
        // the Static frays into the ordinary wood around it a cell at a time
        // rather than ending on a contour you could stand on. For that region in
        // particular a frayed edge is not merely acceptable, it is the correct
        // picture: the fault gets patchier as the signal improves.
        //
        // Natural ground only, like every other thing a region paints (see
        // `isBiomeGround`): a laid floor is the player's, and a floor that came
        // out in the wrong colours would be a bug in a house rather than a
        // landscape.
        //
        // ONE PICK FOR BOTH TEXTURES. The cracks want the same question answered
        // — which region's surface is this cell's — so the whole row comes back
        // and the two read off it. Two picks on two hashes would let a cell take
        // the flats' cracks and its neighbour's dither, which is a surface made of
        // two places.
        const paint = isBiomeGround(groundId)
          ? this.decorKit(world, tx, ty, decoHash(tx, ty, world.seed ^ 0x2f6d), (d) => d)
          : undefined;
        const wrong = paint?.dither;
        const fill = this.rolled(def, tx, ty, world.seed, !!wrong);
        // BOTH INKS ARE APPLIED TO THE SAME BASE, which is the difference between
        // a dither and a shadow. Tinting the second ink onto the FIRST was the
        // first cut and it measured four RGB units apart: a tint is a lerp, so
        // pulling an already-pulled colour 62% of the way toward a third one lands
        // it next to where it started, and the Static came out a plain grey wood.
        // Pulled from the season's own green, the two land as far apart as their
        // hexes actually are, and the ground stops being able to decide.
        ctx.fillStyle = wrong
          ? (this.ditherFill(
              fill,
              this.rolled(
                biomeSkin(seasoned, groundId, { ...turf, ground: wrong.ground }, season),
                tx,
                ty,
                world.seed,
                true,
              ),
            ) ?? fill)
          : fill;
        ctx.fillRect(px, py, TILE, TILE);
        // THE PLATES, where a region's ground is broken into them. Drawn over the
        // fill and under everything else, because a crack is IN the surface: the
        // tuft, the decor and anything standing here all sit on top of it.
        if (paint?.cracks) this.drawCracks(px, py, tx, ty, world.seed, paint.cracks);
        // AND THE SCANLINES, where a region's picture comes apart. Over the fill
        // and under everything that stands on it, like the cracks: a tear is the
        // GROUND arriving wrong, not something lying on it — and a tear drawn over
        // a tree would be a tear in the tree, which is the one thing this region
        // may not do (content/biomes.ts §glitch).
        if (paint?.glitch && wrong) {
          this.drawTears(px, py, tx, ty, world.seed, t, [
            // The ground's own second ink, which is most of them: the picture
            // arriving in the other colour.
            this.rolled(biomeSkin(seasoned, groundId, { ...turf, ground: wrong.ground }, season), tx, ty, world.seed, true),
            // A brighter and a darker version of the fill itself — a row that came
            // through with its level wrong rather than its hue.
            mixHex(fill, { color: "#ffffff", amount: 0.22 }),
            mixHex(fill, { color: "#000000", amount: 0.3 }),
            // And, rarely, a channel. One in four tears, which is as much pure
            // colour as a wood can take before it stops being a wood.
            paint.glitch.cold,
          ], paint.glitch);
        }
        // Paving: generated ground that somebody nonetheless LAID, which is the
        // plaza and nothing else. Same `drawGrain` and the same `GRAIN.stone`
        // periods a flagstone floor uses, so a square and a floor are cut from
        // the same stone; inked off the tile's own colour rather than a finish,
        // because terrain has no finish to ink from.
        //
        // Courses step off the WORLD pixel (`wx`/`wy` below), which is the only
        // reason this is allowed to exist at all — a joint drawn once per CELL
        // is the band rule's exact trap, and an 11x9 plaza is a big enough field
        // to have shown it off. 6 and 9 are coprime with 16 for that reason.
        // The square is cut in bigger slabs than a floor somebody lays at
        // home (PLAZA_GRAIN). Chosen at the call site rather than inside
        // `drawPaving`, so the grain stays a thing you hand in and the draw
        // path keeps knowing nothing about where it is.
        if (inPlaza(tx, ty)) {
          this.drawPlazaPaving(px, py, tx, ty, def.color);
        } else if (def.paving) {
          this.drawPaving(px, py, tx, ty, GRAIN[def.paving], def.color);
        }
        // A laid floor shows its boards or its flagstones. Only a FINISHED tile
        // gets this: `groundTone` above deliberately leaves made surfaces flat,
        // and this is the other half of that decision rather than a contradiction
        // of it — a floor is flat because it was laid flat, and what it has
        // instead of a roll is a grain. Terrain has no grain and never will.
        if (isFinishedTile(groundId)) {
          // A BUTT JOINT NEEDS TWO BOARDS TO BUTT. On a floor one tile wide —
          // a bridge, a jetty, a path across a stream — the boards run the
          // width of the deck and there is nothing for them to butt against, so
          // a joint there is not a joint but a nick in the middle of a plank.
          // Scattered up the deck by the per-course stagger, they photographed
          // as brick: the same failure as the cross-planked side run, and for
          // the same underlying reason — a 16px span is not long enough to have
          // a joint IN, it is a single board.
          //
          // So the joints need a neighbour along the board direction to be
          // earned. A wide floor is unaffected (its tiles all have one); the
          // ends of a wide floor are unaffected (they have one on the inside);
          // a one-wide run and a lone tile come out as plain planks, which is
          // what a deck is.
          const runsOn =
            isFinishedTile(groundIdOf(tileAt(world, tx - 1, ty))) ||
            isFinishedTile(groundIdOf(tileAt(world, tx + 1, ty)));
          this.drawGrain(px, py, TILE, TILE, skinDef(floorFinish(world, tx, ty)), {
            wx: tx * TILE,
            wy: ty * TILE,
            jointed: runsOn,
          });
        }
        // The bevel is drawn ONLY where the material changes. On every tile, a
        // light top row and a dark bottom row pair up across a field into
        // venetian-blind banding — flat stripes that fight the depth now that
        // things stand up. Confined to boundaries, the same lip reads as one
        // material meeting another, which is where it earns its keep and what
        // makes a laid floor's edge legible against grass.
        if (def.top && groundIdOf(tileAt(world, tx, ty - 1)) !== groundId) {
          ctx.fillStyle = def.top;
          ctx.fillRect(px, py, TILE, 1);
        }
        if (def.shade && groundIdOf(tileAt(world, tx, ty + 1)) !== groundId) {
          ctx.fillStyle = def.shade;
          ctx.fillRect(px, py + TILE - 1, TILE, 1);
        }
        // Water gets a couple of drifting ripple pixels. The shallows get the
        // same ripple and a brighter one, because "you can wade here" has to be
        // legible without the HUD ever saying it — the colour carries the rule,
        // and the livelier surface is what stops the two blues reading as a
        // palette accident.
        if (def.name === "Water" || def.name === "Shallow water") {
          const shallow = def.name === "Shallow water";
          // THE WATER THIS REGION MAKES OF IT. A stream crossing a salt pan is
          // carrying the pan (content/biomes.ts §waterTint) — the one place a
          // region is allowed an opinion about water, stated as its own field so
          // that BIOME_GROUND's list, which exists because tinting everything
          // pulled the sea halfway to sand, does not have to be loosened.
          //
          // Both blues take the SAME pull, so the shallows stay the paler of the
          // two and "you may wade here" survives the recolour. Drawn over the fill
          // rather than folded into it, because the fill has already been laid and
          // this is a wash on top of the same water everywhere else has.
          if (turf.waterTint && turf.waterTint.amount > 0) {
            ctx.fillStyle = mixHex(def.color, turf.waterTint);
            ctx.fillRect(px, py, TILE, TILE);
          }
          // SPARSE, and this is the fix rather than a tuning change. Every cell
          // used to get a glint, all of them on the same row (`py + 6`) — which
          // is the per-cell edges rule (CLAUDE.md) wearing a fourth disguise. A
          // mark in every cell at a fixed height is a dotted line at the tile
          // pitch, and a lake read as ruled paper that happened to shimmer.
          //
          // So: hashed on the WORLD coordinate, like the grass tuft and the sand
          // grain, and on a row the hash also picks. Now some cells catch the
          // light and most don't, which is what a surface does.
          const h = decoHash(tx, ty, world.seed ^ 0x37d1);
          // The shallows glint about half again as often as the deep, and
          // brighter. That gap is load-bearing: "you can wade here" has to be
          // legible without the HUD ever saying it, and a livelier surface is
          // what stops the two blues reading as a palette accident.
          if (h > (shallow ? 0.42 : 0.6)) {
            ctx.fillStyle = shallow ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.25)";
            const rx = px + 3 + ((Math.sin(t * 1.5 + tx * 1.7 + ty) * 0.5 + 0.5) * (TILE - 6)) | 0;
            ctx.fillRect(rx, py + 3 + Math.floor((h * 47) % 11), 2, 1);
          }
          // WHAT FLOATS, on the shallows only (content/biomes.ts §float). The
          // marshes' lily pads, lotuses, stepping stones and boards.
          //
          // THE SHALLOWS AND NOT THE DEEP, which is a rule about what a mark can
          // honestly sit on rather than about where it would look nice. A pad on
          // deep water is a pad on a thing you cannot reach, and a stepping stone
          // out there would be a route to nowhere — the one reading of this kit
          // that would be a lie (see BiomeDef.float). The marshes have no deep
          // water at all by construction, so in the region this is written for the
          // distinction never comes up; it is here for the day a marsh borders a
          // lake.
          //
          // Its own hashes throughout, sharing none with the ground decor: a lily
          // on the same cells the ferns use would put the marsh's whole character
          // on one lattice.
          if (shallow) {
            const fh = decoHash(tx, ty, world.seed ^ 0x1f7b);
            const fkit = this.decorKit(
              world,
              tx,
              ty,
              decoHash(tx, ty, world.seed ^ 0x4e2d),
              (d) => d.float,
            );
            if (fkit && fh < fkit.density && this.inSeason(fkit)) {
              // The stem ink is the region's canopy colour, like every other kit
              // — which on water is exactly right for a pad: a lily leaf is the
              // same green as the leaves on the bank.
              this.drawKitMark(fkit, px, py, decoHash(tx, ty, world.seed ^ 0x8b53), fkit.stem ?? this.stemInk(world, tx, ty));
            }
          }
        } else if (def.name === "Lava") {
          // CRACKS, NOT A SURFACE. A flat orange square is a warning sign; a dark
          // crust with fire in its seams is a lava field, and the difference is
          // entirely in how much of the tile is lit — a few pixels, against a
          // near-black fill that is doing the rest of the work.
          //
          // Hashed on the WORLD coordinate and placed at a hashed height, which is
          // the ripple's own fix for the same trap: a mark in every cell at a
          // fixed offset is a dotted line at the tile pitch, and a lake of it read
          // as ruled paper (CLAUDE.md §per-cell edges, the fifth costume).
          //
          // BREATHING, NOT FLICKERING. Rock cools and reheats slowly; a fast
          // flicker is a campfire, and eighty cells of campfire is a strobe. The
          // phase comes off the cell's own hash so no two seams pulse together.
          const h = decoHash(tx, ty, world.seed ^ 0x51fa);
          // THREE TO FIVE, and it was one to three. At the lower count the seams
          // photographed as orange sticks lying on brown ground — too few marks,
          // too much crust between them, and nothing joining up across a cell
          // boundary. A lava field is mostly crust and the fire has to be
          // CONTINUOUS enough to read as one thing under it.
          const cracks = 3 + Math.floor(h * 3);
          for (let i = 0; i < cracks; i++) {
            const g = decoHash(tx * 3 + i * 7, ty * 5 - i * 3, world.seed ^ 0x2ad7);
            // Longer, and the length varies more: a run of equal dashes is a
            // dotted line however it is scattered.
            const len = 2 + Math.floor(((g * 17) % 1) * 5);
            const vertical = ((g * 31) % 1) > 0.5;
            const cx = px + 2 + Math.floor(g * (TILE - 4 - (vertical ? 1 : len)));
            const cy = py + 2 + Math.floor(((g * 61) % 1) * (TILE - 4 - (vertical ? len : 1)));
            const q = 0.55 + 0.45 * Math.sin(t * 0.8 + g * 6.3);
            // Two inks, the lamp's rule: the seam's own centre is the brightest
            // thing in its own light, or the halo below reads as paint on a rock.
            ctx.fillStyle = `rgba(255,138,44,${(0.55 + 0.4 * q).toFixed(3)})`;
            ctx.fillRect(cx, cy, vertical ? 1 : len, vertical ? len : 1);
            if (q > 0.75) {
              ctx.fillStyle = `rgba(255,226,170,${(0.5 * q).toFixed(3)})`;
              ctx.fillRect(cx, cy, 1, 1);
            }
          }
          // The shore, and a scatter of the middle — see `lavaRim`. The rim was
          // the whole of it for one draft and the lake came out DARKEST AT ITS
          // CENTRE, which is backwards: the light was all on the ash outside and
          // the middle of the fire was the dimmest thing in frame. A sixth of the
          // interior, on its own hash, puts pools of heat in the body of it
          // without paying for a gradient per cell.
          const edge =
            groundIdOf(tileAt(world, tx + 1, ty)) !== groundId ||
            groundIdOf(tileAt(world, tx - 1, ty)) !== groundId ||
            groundIdOf(tileAt(world, tx, ty + 1)) !== groundId ||
            groundIdOf(tileAt(world, tx, ty - 1)) !== groundId;
          if (edge || h > 0.84) this.lavaRim.push({ x: tx, y: ty });
        } else if (def.name === "Grass") {
          // Stable tuft speckle so grass reads as texture, not flat paint.
          const h = decoHash(tx, ty, world.seed);
          // AND MOST OF IT IS UNDER THE SNOW (§BiomeDef.snow). A tuft on 38% of
          // cells is texture on grass and DIRT on a snowfield: the mark takes the
          // canopy's colour, which in winter is bare-branch brown, so a white
          // field came out speckled with brown at better than one cell in three
          // and read as slush however bright the snow under it was.
          //
          // Thinned rather than cut, because what stands through snow is stubble
          // and it is a real thing to see. One cell in five, so the field is snow
          // with grass in it instead of grass with snow behind it.
          // Per region, because a mown common and grass to the knee do not stand
          // through a snowfall the same way (§BiomeDef.stubble).
          const buried = season === "winter" && !!turf.snow;
          // 0.72 before: a tuft on 28% of cells, which at three shapes leaves
          // each shape on under one cell in ten and the field still mostly bare.
          if (h > (buried ? 1 - (turf.stubble ?? 0.2) : 0.62)) {
            // Placed by a hash on WORLD coordinates and sparse, so it is texture
            // and not a per-cell edge — the band rule (CLAUDE.md) does not reach
            // it, and a seasonal recolour doesn't change that.
            // Tinted with the region, because the speckle is texture ON the
            // ground and a tuft that stayed meadow-green over bleached scrub
            // detaches from the surface it belongs to.
            // THE SPECKLE TAKES THE SECOND INK TOO, where a region has one, and
            // it takes it per MARK rather than per pixel: a tuft is three pixels
            // and a checker inside one is a colour nobody can resolve. Half the
            // marks in the wrong green is the same sentence the ground is making
            // at a scale the eye can actually see it at.
            // THE SPECKLE TAKES THE FLOOR'S SHARE OF THE MONTH, not the whole of
            // it: the tuft "wants to travel with the ground or the texture
            // detaches from the surface it is meant to be texture ON"
            // (§BiomeDef.tuft), and that is as true of the season as of the hue.
            // AND THE HOUR TOO, WHICH IS WHY THIS MOVED OUT OF HERE. It was the
            // `seasonPulled` and the region's tint written inline; the moment the
            // clock got a dial of its own (§BiomeDef.nightPull) that was a second
            // opinion about a colour living a file away from `foliage`, which is
            // the exact fault foliage's docblock exists to describe. Composed in
            // palette.ts now, where the tests can ask the same question the screen
            // does.
            const speck = tuftInk(turf, this.palette);
            ctx.fillStyle =
              paint?.dither && ((h * 977) % 1) > 0.5
                ? mixHex(speck, paint.dither.tuft)
                : speck;
            const gx = px + 2 + Math.floor(h * 9);
            const gy = py + 4 + Math.floor((h * 53) % 9);
            // THREE tufts, not one. Every blade in the world used to be the same
            // five-pixel mark, which is what made a field of them read as a
            // printed repeat rather than as ground — the eye finds the identical
            // glyph long before it notices the sparse placement is random.
            //
            // Chosen off the same hash that placed it, so a tuft never changes
            // shape between frames, and shaped rather than merely offset: a
            // clump, a taller blade, a pair. All within the 2px the original
            // occupied, so nothing here can reach a neighbouring cell and start
            // pairing edges across the grid.
            // WHICH PLANTS GROW HERE, from the region's own list. Four shapes
            // everywhere at equal odds was chaos — every cell a different plant
            // is not a meadow, it is a seed catalogue — and the fix is the same
            // one `crownRows` made for trees: the shape is content, so it belongs
            // in the row rather than in the draw call.
            //
            // The HARD region, like a crown and a mushroom cap. A shape has no
            // in-between, so a border dithers WHICH plant grows rather than
            // smearing one into another, which is the honest version anyway: two
            // kinds of ground meeting is two kinds of thing growing.
            //
            // Weights are repetition (see TuftShape), so this is a plain index —
            // a region wanting a dot one time in five lists four other things.
            const kinds = regionSkin(world.seed, world.homestead.spot, tx, ty)?.tufts ?? TUFTS_DEFAULT;
            const kind = kinds[Math.floor((h * 311) % kinds.length)];
            if (kind === "cluster") {
              // The cluster. Three points around a gap — the one that most reads
              // as a plant seen from above rather than a mark on the ground.
              ctx.fillRect(gx, gy, 1, 1);
              ctx.fillRect(gx + 2, gy, 1, 1);
              ctx.fillRect(gx + 1, gy - 1, 1, 1);
            } else if (kind === "sprout") {
              // A SPROUT: two leaves off a stem, which content/nodes' pinewood
              // decor already found to be the smallest mark that reads as
              // foliage. This was a two-stack with a pixel off to one side —
              // three pixels that never resolved into a plant — and it is one
              // pixel away from the thing it was trying to be.
              ctx.fillRect(gx + 1, gy, 1, 1);
              ctx.fillRect(gx + 1, gy - 1, 1, 1);
              ctx.fillRect(gx, gy - 2, 1, 1);
              ctx.fillRect(gx + 2, gy - 2, 1, 1);
            } else if (kind === "blades") {
              // TWO BLADES OF UNEQUAL HEIGHT, replacing the L. The L was a
              // corner, and a corner is the one thing that never occurs in a
              // meadow — it read as a chip out of something built. Blades of the
              // same height would be a gate; different heights are grass.
              ctx.fillRect(gx, gy, 1, 1);
              ctx.fillRect(gx, gy - 1, 1, 1);
              ctx.fillRect(gx + 2, gy, 1, 1);
            } else {
              // A single seed, and what stops the others being a set: a texture
              // whose every mark has structure reads as a pattern, and the dot is
              // the rest. Regions ration it by how much of their ground is bare —
              // the fen lists none, the scrub lists three.
              ctx.fillRect(gx + 1, gy, 1, 1);
            }
          }

          // The region's own decor, ON TOP of the tuft rather than instead of
          // it: the tuft is what makes grass read as grass everywhere, and a
          // region that replaced it would be a different SURFACE rather than the
          // same one with its own plants in it.
          //
          // Its own hash, so tuning a kit's density never reshuffles where that
          // region's tufts stand — the same reasoning `generatedTile` gives for
          // rolling ground clutter separately from trees.
          const dh = decoHash(tx, ty, world.seed ^ 0x2b19);
          // A THIRD HASH FOR THE REGION PICK, and it has to be independent of
          // `dh`. Passing `dh` looks free and is not: by the time the kit is
          // asked for, `dh` has already passed `< density`, so it only ever
          // holds values from the bottom tenth of its range — and a cumulative
          // walk over the weights fed a number that small hands the first part
          // the cell every time. The dither would have been dead code that
          // measured as working.
          // THE WHOLE REGION ROW, not the slot, because the density this cell is
          // judged against depends on the region as well — see `mown`, which is
          // the meadow saying the town keeps its own common cut. Reading `.decor`
          // off the row afterwards is exactly what passing `(d) => d.decor` did,
          // so nothing about which region wins this cell has changed.
          const kdef = this.decorKit(world, tx, ty, decoHash(tx, ty, world.seed ^ 0x51ab), (d) => d);
          const kit = kdef?.decor;
          // A SCALE ON THE DENSITY, NOT AN ALPHA ON THE MARK. Fading the marks out
          // would put a ring of half-drawn flowers around the town, which reads as
          // a rendering fault; thinning them means every flower is drawn the same
          // way wherever it stands and there are simply fewer near the houses.
          const wild = kdef?.mown ? townMown(world.seed, tx, ty) : 1;
          // AND THE GROUND KIT IS THINNED BY THE SAME NUMBER THE TUFTS ARE
          // (§BiomeDef.stubble), because it is the same fact about the same
          // plants: clover, plantain, needle litter and ferns are what a snowfall
          // covers, and they are also the marks that read worst on it — drawn in
          // the stem ink, which winter makes bare-branch brown, a clover on snow
          // is a piece of dirt.
          //
          // NOT CUT OUTRIGHT, WHICH WAS THE FIRST GO AND COST THE PRAIRIE ITS
          // WINTER. That region's `decor` IS its long grass — a 0.32 kit of
          // knee-high marks — so burying every kit under snow deleted the stems
          // standing out of the white, which was the best picture the season
          // makes. One number, scaled against the ordinary 0.38, so a mown common
          // loses nearly all of its and a grassland keeps all of its.
          //
          // THE BLOOM SLOT BELOW IS DELIBERATELY NOT THINNED, and it used to say
          // "nothing flowers in January" — which stopped being the reason the day
          // the long grass grew a winter kit. The rule that replaced it is better
          // anyway: this slot is thinned by nothing because what goes in it for
          // winter is what STANDS OUT OF the snow. Buried marks are the year-round
          // kit's business (clover, litter, ferns); a seed head on a dead stalk is
          // the one thing a snowfall leaves you, and burying it would delete the
          // only picture the season has. A pale bloom in a winter slot would
          // vanish on white, but that is a choice of ink and belongs to the row.
          const buriedKit =
            kdef?.snow && this.palette.season?.id === "winter"
              ? (kdef.stubble ?? 0.2) / 0.38
              : 1;
          if (kit && dh < kit.density * wild * buriedKit && this.inSeason(kit)) {
            // A SECOND, INDEPENDENT HASH picks the mark and places it. Reusing
            // `dh` would tie both to the same number that just passed a `<`
            // test, so every mark would come from the low end of the range —
            // one shape, in one corner, forever.
            const p = decoHash(tx, ty, world.seed ^ 0x77c3);
            this.drawKitMark(kit, px, py, p, kit.stem ?? this.stemInk(world, tx, ty), paint?.glitch);
          }

          // THE SECOND KIT, on its own four hashes throughout. Sharing any of
          // them with the block above would pin a bloom to the same cells, the
          // same marks and the same corners the year-round decor already uses —
          // spring would arrive as a recolouring of the ferns rather than as
          // something new coming up between them.
          const bh = decoHash(tx, ty, world.seed ^ 0x6c41);
          const bdef = this.decorKit(
            world,
            tx,
            ty,
            decoHash(tx, ty, world.seed ^ 0x9d17),
            (d) => d,
          );
          // WHICH bloom, where a region has more than one. They are one per
          // season by rule (content/biomes.ts §bloom), so at most one can answer
          // — `inSeason` is the same test the draw below makes, asked one step
          // earlier so a region with a summer kit and a spring kit does not
          // silently always draw whichever was written first.
          const bkit = bdef ? bloomsOf(bdef).find((k) => this.inSeason(k)) : undefined;
          // Mown on its own region's answer rather than on the year-round kit's:
          // this cell may have rolled a different neighbour for its bloom, and a
          // bloom scaled by somebody else's rule is two facts about one place.
          const bwild = bdef?.mown ? townMown(world.seed, tx, ty) : 1;
          if (bkit && bh < bkit.density * bwild && this.inSeason(bkit)) {
            const p = decoHash(tx, ty, world.seed ^ 0x3ac9);
            this.drawKitMark(bkit, px, py, p, bkit.stem ?? this.stemInk(world, tx, ty), paint?.glitch);
          }

          // A PLANTED FLOWER (DESIGN §The garden): a mark exactly like the
          // wild kind, except the record put it here rather than the hash. In
          // its species' month it is its skin's own bloom, drawn by the same
          // call; the rest of the year, and for its first day in the ground,
          // it is greenery — an empty cell you paid for reads as a refund
          // owed, and a flowerbed in January is still a bed.
          const gid = world.garden.plants[tileKey(tx, ty)]?.id;
          const gdef = gid ? FLORA[gid] : null;
          if (gdef && gdef.kind === "flower") {
            const skin = BIOMES[gdef.skin];
            const gkit =
              gdef.bloom === "decor"
                ? skin.decor
                : bloomsOf(skin).find((k) => k.season === gdef.bloom);
            const grown = growthStage(world, tx, ty, this.now) >= 2;
            const p = decoHash(tx, ty, world.seed ^ 0x77c3);
            if (grown && gkit && this.inSeason(gkit)) {
              this.drawKitMark(gkit, px, py, p, gkit.stem ?? this.stemInk(world, tx, ty), paint?.glitch);
            } else {
              this.drawKitMark(GARDEN_SPROUT, px, py, p, this.stemInk(world, tx, ty), paint?.glitch);
            }
          }
        } else if (def.name === "Sand") {
          // Grain, on the same terms as the grass tuft: a hash of the WORLD
          // coordinate, sparse, single pixels. Sand without it is a flat block
          // of cream and reads as paving rather than as a beach — but the
          // temptation to give every cell a speckle is precisely the banding
          // trap (CLAUDE.md), hence the same sparse threshold grass uses.
          const h = decoHash(tx, ty, world.seed ^ 0x5a4d);
          if (h > 0.6) {
            ctx.fillStyle = "rgba(150,124,80,0.35)";
            ctx.fillRect(px + 2 + Math.floor(h * 9), py + 3 + Math.floor((h * 71) % 10), 1, 1);
            if (h > 0.85) ctx.fillRect(px + 4 + Math.floor(h * 6), py + 8 + Math.floor((h * 37) % 6), 1, 1);
          }
        }
        if (id === MUSHROOM) this.drawMushrooms(world, tx, ty, px, py, night);
        if (id === JUNK_PILE) this.drawLoose(tx, ty, px, py, world.seed, night);
        if (id === SHAFT) this.drawShaftMouth(px, py);
        this.drawDoorstep(world, tx, ty, px, py);
      }
    }
  }

  /** What came up in the grass overnight.
   *
   *  Draws over a cell the flat pass has already painted as GRASS — the tile is
   *  grass with something growing in it, not a material of its own (see
   *  `groundIdOf`), which is what keeps the caps out of the bevel's business.
   *
   *  Three rows of cap on the big one: a single lit row read as a berry, and at
   *  this size the thing that says "mushroom" is the overhang — a cap wider than
   *  its stalk with its own shade underneath it. The dark row is the gills, and
   *  it is INSIDE the sprite rather than along the cell, so it isn't the banding
   *  we just took out.
   *
   *  Everything comes off the tile's stable hash: how many, which way up they
   *  lean, and where in the cell they stand. A patch that arrived while you were
   *  out has to sit still once you are looking at it. */
  /** What nightfall does to a region's own cap.
   *
   *  The default red states its night colours outright, one hex per row, because
   *  there is only one of them. A region that brings its own cannot — so this is
   *  the same move `biomes.ts` makes everywhere else: a pull toward a colour
   *  rather than a second table of hexes to keep in step with the first. Matched
   *  by eye against the red's own day/night pair, which is the only thing it has
   *  to agree with. */
  private static readonly NIGHT_CAP: Tint = { color: "#2c3348", amount: 0.34 };

  private drawMushrooms(
    world: WorldState,
    tx: number,
    ty: number,
    px: number,
    py: number,
    night: boolean,
  ): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    // The region's cap, where it has one. A TINT AND NOT A SPECIES — the
    // silhouette below is the same everywhere, because this is gatherable and
    // hands back a plain `mushroom` wherever it grew (see BiomeDef.mushroomCap).
    //
    // ONE region and never a blend, the way a crown is: a mushroom is an object
    // and takes a side. Half a champagne cap fading back to red across a border
    // is a mushroom caught between two minds.
    //
    // The side it takes is the region it GREW from (`scatterSkin`) — the same
    // roll that decided there would be a mushroom here at all. Drawing it with
    // the region it stands in instead leaves the dither doing half its job: the
    // count softens across the border and every cap still changes on the line.
    const skin = scatterSkin(world.seed, world.homestead.spot, tx, ty);
    const own = skin?.mushroomCap;
    const cap = own ? (night ? mixHex(own.cap, Renderer.NIGHT_CAP) : own.cap) : night ? "#9c5348" : "#d16a56";
    const lit = own ? (night ? mixHex(own.lit, Renderer.NIGHT_CAP) : own.lit) : night ? "#b3695c" : "#e58a72";
    const gills = own
      ? night
        ? mixHex(own.gills, Renderer.NIGHT_CAP)
        : own.gills
      : night
        ? "#71392f"
        : "#a34c3c";
    const stalk = night ? "#bdb0a0" : "#f0e3d0";

    // How they are built here — the dome unless a region says otherwise. The HARD
    // region again, for the same reason the cap colour takes it: a silhouette
    // cannot be half-way between two, so a border has to pick a side.
    const art = MUSHROOM_ART[skin?.mushroomShape ?? "cap"];

    /** One mushroom, from a grid, standing on (x, y) — BOTTOM-anchored, so a bell
     *  seven rows tall and a dome five rows tall put their stalks on the same
     *  soil instead of their caps at the same height. */
    const one = (x: number, y: number, state: MushroomState): void => {
      const g = art[state];
      const w = g[0].length;
      const top = y - g.length;
      // It stands ON the grass — and its contact shadow pulls over with the sun
      // exactly as every other one does (§footShadow). A mushroom's is one row
      // where a tree's is two, which is why it cannot simply call that; the
      // arithmetic is the same and the reason is the same. Without it a cap at
      // sunset wore a symmetric bar with a wedge coming out of one end.
      const rake = skin?.rake ?? this.rake;
      const dir = Math.sign(rake) || 1;
      const capT = Math.min(1, Math.abs(rake) / RAKE_MAX);
      const capHalf = w >> 1;
      const capSun = Math.round(capHalf * (1 - capT));
      const capLee = w - capHalf;
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(dir > 0 ? x + capHalf - capSun : x + capHalf - capLee, y, capSun + capLee, 1);
      // AND IT LEANS AWAY WITH EVERYTHING ELSE, where the region has a low sun
      // (§BiomeDef.rake). This shadow is drawn here rather than through
      // `footShadow` — a mushroom's is one row where every other sprite's is two —
      // and being the one draw path that did not know about the rake made it the
      // one thing in the twilight country standing at noon. Three pixels, on a
      // five-pixel cap, which is the same proportion the trees get and is the
      // whole point: the sun is one height for everybody, so a short thing casts
      // a short shadow. That is the physics doing the work rather than a number
      // per sprite.
      if (rake !== 0) {
        // Signed, like everyone else's — a mushroom's shadow leans the way the
        // trees' do or the cap is standing under a different sun. `dir` is the
        // same one the puddle above pulled over by, so the two halves of a cap's
        // shadow can never disagree about where the sun is.
        // The wedge converges toward the far side, so mirroring it is a question
        // of which EDGE is pinned — right at `x + w` going east, left at `x`
        // going west — and not of offsetting the whole row, which would slide the
        // shadow off the cap instead of turning it around.
        const len = Math.round(g.length * Math.abs(rake));
        for (let i = 1; i <= len; i++) {
          const tw = Math.max(2, w - i);
          ctx.fillRect(dir > 0 ? x + w - tw : x, y + (i >> 1), tw, 1);
        }
      }
      for (let r = 0; r < g.length; r++) {
        const row = g[r];
        for (let c = 0; c < w; c++) {
          const ch = row[c];
          if (ch === ".") continue;
          ctx.fillStyle =
            ch === "l"
              ? lit
              : ch === "c"
                ? cap
                : ch === "g"
                  ? gills
                  : ch === "s"
                    ? stalk
                    : "#f7efe2"; // `k` — the speck, so the cap has a highlight
          ctx.fillRect(x + c, top + r, 1, 1);
        }
      }
    };

    // Kept inside the cell on purpose: the flat pass paints in row order, so a
    // cap that overhung would be half painted over by the tile drawn next.
    const mx = px + 3 + Math.floor(h * 4);
    // The BASE line rather than the top one, since the grids stand on it now.
    const my = py + 10 + Math.floor((h * 29) % 4);
    one(mx, my, "open");
    // Whether there are two, on a fraction of the hash that isn't the one
    // placing the first — otherwise the crowded cells would all be the ones
    // where the big cap sits high and left.
    const second = (h * 61) % 1;
    if (second > 0.42) one(mx + 6, my - (second > 0.7 ? 1 : 0), "button");
  }

  /** Whatever the Gremlin dropped in your grass, lying in it.
   *
   *  Deliberately NOT a recognisable object. What it turns out to have been is
   *  decided at PICKUP, from the same total function of (seed, x, y) the buried
   *  finds use (sim/junk.ts) — so drawing a specific thing here would be a second
   *  opinion about it, and the one on screen would be the one that's wrong.
   *
   *  So: a small dull bundle with one lit edge and a single glint, sitting IN the
   *  grass. It stays in the flat pass rather than the raised one on purpose — a
   *  raised object overhangs the cell behind it, which is the game's whole cue for
   *  "this stands up", and it would read as something planted there rather than
   *  left there.
   *
   *  Drawn from the tile's stable hash, so a thing that appeared while you were
   *  out sits still once you are looking at it. */
  private drawLoose(tx: number, ty: number, px: number, py: number, seed: number, night: boolean): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, seed);
    const jx = px + 4 + Math.floor(h * 5);
    const jy = py + 6 + Math.floor((h * 29) % 4);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; // it sits ON the ground
    ctx.fillRect(jx - 1, jy + 3, 7, 1);
    ctx.fillStyle = night ? "#6a5b4a" : "#8a7860";
    ctx.fillRect(jx, jy, 5, 3);
    ctx.fillStyle = night ? "#4d4238" : "#6b5c48"; // shaded underside
    ctx.fillRect(jx, jy + 2, 5, 1);
    ctx.fillStyle = night ? "#9d9384" : "#cfc3ad"; // lit edge, top left
    ctx.fillRect(jx, jy, 3, 1);
    ctx.fillStyle = night ? "#b9ad96" : "#f2e6c8"; // one glint, so it reads as a thing
    ctx.fillRect(jx + (h > 0.5 ? 4 : 1), jy + 1, 1, 1);
  }

  /** A shaft, seen from above: spoil heaped on the far lip, the dark of the hole
   *  itself, and the top of the ladder going down into it.
   *
   *  The tile's own colour is nearly black, which on its own reads as a missing
   *  texture rather than as a way down — every other thing in this world has a
   *  lip and a lit edge. The earth on the near side has to be brighter than the
   *  hole for the hole to look like a hole. */
  private drawShaftMouth(px: number, py: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#8f6339"; // dug earth around the mouth
    ctx.fillRect(px, py, TILE, 3);
    ctx.fillStyle = "#bd8a58"; // the sunlit crumb along the top of the heap
    ctx.fillRect(px + 1, py, TILE - 2, 1);
    ctx.fillStyle = "#6b5333"; // the ladder, in its own shadow
    ctx.fillRect(px + 5, py + 3, 2, TILE - 4);
    ctx.fillRect(px + TILE - 7, py + 3, 2, TILE - 4);
    ctx.fillStyle = "#7d6340";
    for (let i = 4; i < TILE - 2; i += 4) ctx.fillRect(px + 6, py + i, TILE - 12, 1);
  }

  // --- The lower layer ---------------------------------------------------------
  // One cell of rock or cave floor. The surface's flat pass and this one are
  // deliberately separate methods rather than one method full of `if (under)`:
  // almost nothing they draw is the same, and the underground's whole character
  // is that it has none of what the surface has.

  private drawUnderCell(world: WorldState, tx: number, ty: number): void {
    const ctx = this.ctx;
    const id = tileAt(world, tx, ty, "under");
    // Uncarved rock is painted as ROCK, vein or not. The tile table already
    // keeps the two colours close, but close is not the same as hidden: in a
    // field of one dark tone the eye finds the odd one instantly, and on screen
    // a town's veins showed up as pale squares floating in the dark, readable
    // through solid stone from across the map. A vein is met at the face you
    // are cutting (content/tiles.ts) — so it is drawn there, in drawRockFace,
    // and nowhere else.
    const mat = rockIdOf(id);
    const def = tileDef(mat);
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2);

    ctx.fillStyle = def.color;
    ctx.fillRect(px, py, TILE, TILE);

    // Same bevel rule as the surface, and for the same reason: only where the
    // material actually changes, or a field of rock stripes into blinds.
    if (def.top && rockIdOf(tileAt(world, tx, ty - 1, "under")) !== mat) {
      ctx.fillStyle = def.top;
      ctx.fillRect(px, py, TILE, 1);
    }
    if (def.shade && rockIdOf(tileAt(world, tx, ty + 1, "under")) !== mat) {
      ctx.fillStyle = def.shade;
      ctx.fillRect(px, py + TILE - 1, TILE, 1);
    }

    // Rock that has been opened up STANDS. Only on cells whose southern
    // neighbour is not rock, which is to say only where the rock face is a face
    // — the "draw the edge where the surface actually ends" rule (CLAUDE.md).
    // A solid field of stone draws none of this and stays flat and quiet, which
    // is also what it is: you cannot see into it.
    if (mat === BEDROCK && !tileDef(tileAt(world, tx, ty + 1, "under")).solid) {
      const x = tx;
      const y = ty;
      this.raised.push({ y, bias: BIAS_TERRAIN, draw: () => this.drawRockFace(world, x, y) });
    }

    // The way back. A shaft is stored ONCE, on the surface (world.ts), so from
    // down here it is a surface read at a coordinate whose own tile is ordinary
    // cave floor — the one place this pass looks up rather than around.
    if (tileAt(world, tx, ty) === SHAFT) {
      this.litShafts.push({ x: tx, y: ty });
      this.drawLadder(px, py);
    }

    // Anything installed in the rock — lamps, and by design nothing else
    // (sim/types.ts §underFurniture). Its own record, so this is a lookup in the
    // other furniture map and not a special case in the surface pass.
    const piece = world.underFurniture[tileKey(tx, ty)];
    if (piece) {
      const ax = tx;
      const ay = ty;
      const span = footprint(furnitureDef(piece.id), piece.facing);
      this.raised.push({
        y: ay + span.h - 1,
        bias: BIAS_TERRAIN,
        draw: () => this.drawFurniture(world, ax, ay, piece),
      });
      if (furnitureDef(piece.id).light) this.litLamps.push({ x: tx, y: ty });
    }
  }

  /** One cell of the sky. The underground's opposite number, and the shortest
   *  draw path in the file, because the layer is a plane of cloud and two things
   *  standing on it.
   *
   *  THIS IS THE PER-CELL EDGES RULE'S WORST CASE, so it takes no chances
   *  (CLAUDE.md — caught three times). Cloud covers the ENTIRE viewport with one
   *  material: there is no path, no shore, no wall to break it up, so any
   *  edge, bevel or highlight drawn per cell would band the whole screen into
   *  venetian blinds with nothing else on it to look at instead. Both sky tiles
   *  therefore carry no `top`/`shade` at all (content/tiles.ts), and the drift
   *  below is stepped off the WORLD coordinate rather than the cell, so the
   *  banks run unbroken across the grid the way a river's does.
   *
   *  There is no bevel where cloud meets thin cloud either, and that is the same
   *  rule pointed at the one boundary this layer has: the parting is a place the
   *  cloud gets thinner, not a hole with a rim. */
  private drawSkyCell(world: WorldState, tx: number, ty: number): void {
    const ctx = this.ctx;
    const id = tileAt(world, tx, ty, "sky");
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2);

    // The steps stand up, so the flat pass draws the cloud they stand on and
    // defers the flight itself — exactly as a tree defers on the surface.
    const flat = id === SKY_STAIR ? CLOUD_THIN : id;
    ctx.fillStyle = tileDef(flat).color;
    ctx.fillRect(px, py, TILE, TILE);

    // The drift: two slow bands of a slightly lighter white, keyed off the world
    // coordinate so a bank of cloud crosses cell borders without noticing them.
    // Quiet on purpose — this is texture to stop a flat fill reading as a
    // rendering error, not weather. At any real contrast it becomes a pattern,
    // and a pattern on the floor of the sky is a carpet.
    const drift = Math.sin(tx * 0.31 + ty * 0.17) + Math.sin(tx * 0.11 - ty * 0.23);
    // Alphas kept LOW on purpose, and they came down after the first photograph:
    // at 0.55 the drift was stronger than the parting, so the plane had texture
    // everywhere and its one landmark read as more of the same. The texture must
    // stay quieter than the feature.
    if (drift > 0.9) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(px, py, TILE, TILE);
    } else if (drift < -1.2) {
      ctx.fillStyle = "rgba(150,170,200,0.06)";
      ctx.fillRect(px, py, TILE, TILE);
    }

    if (id === SKY_STAIR) {
      const x = tx;
      const y = ty;
      this.raised.push({ y, bias: BIAS_TERRAIN, draw: () => this.drawStairHead(x, y) });
    }
  }

  /** The head of the steps, seen from the top. Not `drawStair` — from up here
   *  you are looking at the TOP STEP and the drop beyond it, where from below
   *  you were looking at the face of the whole flight. Drawing the same rising
   *  sawtooth would put a staircase on the cloud going up to nothing.
   *
   *  Its two courses run left to right across the three cells on the same world
   *  coordinate the flight below uses, so this reads as one object rather than
   *  as three copies of a step (the bar-chart bug, §drawStair). */
  private drawStairHead(tx: number, ty: number): void {
    const ctx = this.ctx;
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2);

    ctx.fillStyle = "#c8c2b6"; // the plaza's stone, as on the ground
    ctx.fillRect(px, py + 2, TILE, TILE - 4);
    // The lip, on the SOUTH edge only — the way down is toward the camera, and
    // this is the one place on the layer where an edge is honest, because the
    // surface genuinely ends here.
    ctx.fillStyle = "#9a958b";
    ctx.fillRect(px, py + TILE - 3, TILE, 1);
    // And the dark under the lip: the drop. Two pixels of it, which at this size
    // is enough to say "this goes down" without drawing a hole.
    ctx.fillStyle = "rgba(40,50,70,0.35)";
    ctx.fillRect(px, py + TILE - 2, TILE, 2);
  }

  /** The cut face of the rock, standing out of its cell toward you.
   *
   *  This is where ore is actually seen. The flat top of a vein is drawn barely
   *  different from stone on purpose, but the FACE is the thing you are looking
   *  at while you dig, so that is where the metal shows — you meet a vein at the
   *  face you're cutting, never across a room (content/tiles.ts §Underground). */
  private drawRockFace(world: WorldState, tx: number, ty: number): void {
    const ctx = this.ctx;
    const id = tileAt(world, tx, ty, "under");
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    const top = base - ROCK_STOREY;

    ctx.fillStyle = "#332e28";
    ctx.fillRect(px, top, TILE, ROCK_STOREY);
    ctx.fillStyle = "#4d463c"; // the lip your light catches
    ctx.fillRect(px, top, TILE, ROCK_CAP);

    // Vertical edges only where the run of rock stops — between two faces there
    // is no edge, because there is no corner there.
    ctx.fillStyle = "#26221d";
    if (rockIdOf(tileAt(world, tx - 1, ty, "under")) !== BEDROCK) ctx.fillRect(px, top, 1, ROCK_STOREY);
    if (rockIdOf(tileAt(world, tx + 1, ty, "under")) !== BEDROCK) ctx.fillRect(px + TILE - 1, top, 1, ROCK_STOREY);

    // A seam of ore in the face, placed by the tile's stable hash so it sits
    // still once you are looking at it.
    if (id === ORE_VEIN) {
      const h = decoHash(tx, ty, world.seed);
      const ox = px + 3 + Math.floor(h * 7);
      const oy = top + ROCK_CAP + 2 + Math.floor((h * 41) % 8);
      ctx.fillStyle = "#7e6a44";
      ctx.fillRect(ox, oy, 3, 2);
      ctx.fillRect(ox + 3, oy + 2, 2, 2);
      ctx.fillStyle = "#a9925c"; // the one bright fleck that says metal
      ctx.fillRect(ox + 1, oy, 1, 1);
      ctx.fillRect(ox + 4, oy + 2, 1, 1);
    }
  }

  /** The ladder in a shaft, seen from below: two rails and the rungs between
   *  them, lying in the cell you climb out of. */
  private drawLadder(px: number, py: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#8a6a44";
    ctx.fillRect(px + 4, py + 1, 2, TILE - 2);
    ctx.fillRect(px + TILE - 6, py + 1, 2, TILE - 2);
    ctx.fillStyle = "#a8895c";
    for (let i = 2; i < TILE - 2; i += 4) ctx.fillRect(px + 5, py + i, TILE - 10, 1);
  }

  /** The dark, and the two things that hold it back.
   *
   *  A radial gradient in scene space rather than a per-tile alpha — see the
   *  LAMP_ constants for why quantising this to the grid would be the banding
   *  rule wearing a hat. Canvas extends a radial gradient's last stop past its
   *  outer radius, so one fill over the viewport covers everything: lit near
   *  you, effectively black far away, with nothing to clip.
   *
   *  Then the daylight coming down your own shafts, added back on top. This is
   *  the one thing down here that knows what time it is: at noon a hole is a
   *  pool of warm light you can navigate by, and at night it isn't. Nothing is
   *  gated on it — you can dig at 3am perfectly well — it is just that the way
   *  out stops advertising itself. */
  private drawDark(world: WorldState, now: number): void {
    const ctx = this.ctx;
    const px = this.sceneX(world.player.x);
    const py = this.sceneY(world.player.y);

    const lamp = ctx.createRadialGradient(px, py, LAMP_INNER * TILE, px, py, LAMP_OUTER * TILE);
    lamp.addColorStop(0, "rgba(8,6,5,0)");
    lamp.addColorStop(0.5, "rgba(8,6,5,0.45)");
    lamp.addColorStop(1, `rgba(8,6,5,${DARK_MAX})`);
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, this.sw, this.sh);

    const day = 1 - tintAt(now).darkness;
    if (day > 0.02) {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      const r = SHAFT_LIGHT_R * TILE;
      for (const s of this.litShafts) {
        const sx = this.sceneX(s.x);
        const sy = this.sceneY(s.y);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(255,238,196,${(SHAFT_LIGHT * day).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,238,196,0)");
        ctx.fillStyle = g;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = prev;
    }

    // Lamps you installed, at full strength. A lamp is the one light down here
    // that does NOT know what time it is — the shafts above dim with the hour
    // because they are borrowing daylight, and a lamp isn't borrowing anything.
    // That difference is the whole reason to spend ore on one.
    this.drawLampGlow(1);
  }

  /** Warm light thrown by placed lamps, added over whatever darkened the scene.
   *
   *  `strength` is how much dark there is to push back: the tint's own darkness
   *  on the surface, and a flat 1 underground where the dark is absolute.
   *
   *  Additive, and in SCENE space like the lamp in your hand — a per-tile alpha
   *  would put a light and a dark edge on every cell of one continuous surface,
   *  which is the banding rule (CLAUDE.md) in a new costume, and light that steps
   *  in tile-sized rings reads as a bug in a way a soft falloff never does. */
  private drawLampGlow(strength: number): void {
    if (strength > 0.02) this.drawWindowGlow(strength);
    if (this.litLamps.length === 0 || strength <= 0.02) return;
    const ctx = this.ctx;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    const r = LAMP_GLOW_R * TILE;
    for (const l of this.litLamps) {
      const cx = this.sceneX(l.x);
      // The light leaves the HEAD, not the floor the post stands on. Centred on
      // the cell it would sit a lamp's height too low, and a pool of light whose
      // middle is under the object making it reads as a stain. `+ TILE / 2` is
      // the step from the cell's centre to its southern edge, which is the datum
      // the art uses (see LAMP_HEAD_H).
      // MINUS THE SAME LIFT the art takes (§drawLamp), or the pool stays on the
      // cell's near edge while the flame throwing it has moved north, and a lamp
      // lights the ground half a tile in front of its own head.
      const cy = this.sceneY(l.y) + TILE / 2 - LAMP_LIFT - LAMP_HEAD_H;
      // ORANGE, not cream. Additive light adds its green channel to grass that is
      // already saturated green, so a pale warm-white pool came out milky — lit
      // lawn that read as bleached lawn. Dropping the green and blue makes the
      // same brightness read as warmth instead.
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,196,110,${(LAMP_GLOW * strength).toFixed(3)})`);
      g.addColorStop(0.4, `rgba(255,168,84,${(LAMP_GLOW * strength * 0.3).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,160,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // The flame itself, hot. Without this the pool was brighter than the thing
      // making it: the day/night wash falls over the lamp's own art, and a soft
      // 4-tile gradient adds almost nothing at its centre — so a lit lamp at
      // midnight had a glowing lawn around a dim beige box. A source has to be
      // the brightest thing in its own light.
      ctx.fillStyle = `rgba(255,236,190,${(0.55 * strength).toFixed(3)})`;
      ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
    }
    ctx.globalCompositeOperation = prev;
  }

  /** The light off a lava field: a warm pool on the ash around its shore.
   *
   *  The lamp's shape and the lamp's argument (see `drawLampGlow`), with one
   *  difference that matters — a lamp is a point and this is an EDGE, so the pools
   *  are meant to overlap. Each rim cell contributes a small one and a shoreline
   *  of them adds up to a lit bank, which is what fire in the ground actually does
   *  to the country beside it. Hence the low per-cell alpha: at a lamp's 0.2 a
   *  lake rim saturated to flat orange and the ash stopped having any texture,
   *  which is the same failure four lamps in a corridor produced. */
  private drawLavaGlow(strength: number): void {
    if (this.lavaRim.length === 0 || strength <= 0.02) return;
    const ctx = this.ctx;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    const r = LAVA_GLOW_R * TILE;
    for (const cell of this.lavaRim) {
      const cx = this.sceneX(cell.x);
      const cy = this.sceneY(cell.y);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,150,60,${(LAVA_GLOW * strength).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(255,120,40,${(LAVA_GLOW * strength * 0.35).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,110,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = prev;
  }

  // --- Crops ------------------------------------------------------------------
  private drawCrops(world: WorldState, now: number): void {
    const ctx = this.ctx;
    // Whose month it is, asked ONCE for the frame. The renderer does not compare
    // months — `inSeason` in sim/seasons.ts is the single place the crop↔month
    // match is decided, so this flourish and the line a villager says about the
    // same plant can never disagree about what month it is.
    const flourishing = seasonAt(now).crop;
    for (const [key, crop] of Object.entries(world.crops)) {
      const [tx, ty] = key.split(",").map(Number);
      const cx = Math.round(this.sceneX(tx));
      const base = Math.round(this.sceneY(ty) + TILE / 2) - 2; // sits on the soil
      const def = cropDef(crop.cropId);
      const ripe = crop.stage >= ripeStage(def);
      const green = "#5fa347";
      const leaf = "#8fd06a";
      if (crop.stage === 0) {
        // A seeded mound — just a darker fleck.
        ctx.fillStyle = "#4a3320";
        ctx.fillRect(cx - 1, base - 1, 3, 2);
      } else if (crop.stage === 1) {
        // Sprout: a tiny stem + two leaves.
        ctx.fillStyle = green;
        ctx.fillRect(cx, base - 3, 1, 3);
        ctx.fillStyle = leaf;
        ctx.fillRect(cx - 1, base - 3, 1, 1);
        ctx.fillRect(cx + 1, base - 3, 1, 1);
      } else if (crop.stage === 2) {
        // Leafy: a fuller green tuft, tuber not yet showing.
        ctx.fillStyle = green;
        ctx.fillRect(cx - 1, base - 5, 3, 5);
        ctx.fillStyle = leaf;
        ctx.fillRect(cx - 2, base - 5, 1, 2);
        ctx.fillRect(cx + 2, base - 5, 1, 2);
        ctx.fillRect(cx, base - 6, 1, 1);
      } else if (ripe) {
        // In its own month a ripe plant is PROUD: a lit edge down the shoulder,
        // one more leaf pair, and a fatter ready marker. Delight, never a gate
        // (DESIGN §Seasons) — out of season it grows identically and draws
        // exactly as it did before 4d.
        //
        // ENTIRELY INSIDE THE PLANT'S OWN SILHOUETTE. No ring, no glow, no tint
        // over the farmland cell: a planted row is precisely the continuous
        // surface the per-cell edges rule was learned on three times
        // (CLAUDE.md), and a highlight drawn per soil cell would stripe a field
        // into a grid. A plant is a discrete object and is safe.
        const proud = crop.cropId === flourishing;
        // Ripe: greens up top, an orange shoulder breaking the soil.
        ctx.fillStyle = leaf;
        ctx.fillRect(cx - 2, base - 7, 1, 2);
        ctx.fillRect(cx, base - 8, 1, 2);
        ctx.fillRect(cx + 2, base - 7, 1, 2);
        if (proud) {
          ctx.fillRect(cx - 3, base - 6, 1, 1);
          ctx.fillRect(cx + 3, base - 6, 1, 1);
        }
        ctx.fillStyle = green;
        ctx.fillRect(cx - 1, base - 6, 3, 2);
        // The shoulder is the ONLY thing that differs between varieties, and it
        // is read from the crop table rather than branched on here — one plant,
        // three palettes, so a fourth costs a row and no drawing code.
        ctx.fillStyle = def.ripeColor;
        ctx.fillRect(cx - 1, base - 4, 3, 4);
        ctx.fillStyle = def.ripeShade;
        ctx.fillRect(cx - 1, base - 1, 3, 1);
        if (proud) {
          // Light from the upper left, as everywhere else in this renderer.
          // Drawn from the crop's own ripeColor lightened by a flat overlay
          // rather than from a second colour in the table: a `ripeLit` row would
          // be a fifth number per variety for one pixel column.
          ctx.fillStyle = "rgba(255,246,214,0.55)";
          ctx.fillRect(cx - 1, base - 4, 1, 4);
        }
        // A gentle "ready" bob marker — two pixels wide in its own month.
        if (Math.sin(now / 400) > 0.6) {
          ctx.fillStyle = "#fff3c8";
          ctx.fillRect(cx, base - 11, proud ? 2 : 1, 2);
        }
      }
    }
  }

  /** Refresh the roof index and ease each room's cutaway toward its target.
   *
   *  Being INSIDE is judged on the room's interior, not its shell, so standing
   *  in a doorway leaves the roof up — you're in the wall, not in the room, and
   *  a roof that flickered as you crossed the threshold would be worse than one
   *  that waited a step. */
  private syncRoofs(world: WorldState): void {
    const list = rooms(world);
    if (list !== this.roomsRef) {
      this.roomsRef = list;
      this.roofIndex.clear();
      this.roofCover.clear();
      this.roofSkin.clear();
      this.roofFall.clear();
      this.roomLit.clear();
      for (const room of list) {
        const covered = new Set<string>([...room.interior, ...room.shell]);
        this.roofCover.set(room.id, covered);
        this.roofSkin.set(room.id, roofFinish(world, room));
        this.roofFall.set(room.id, roofPitch(covered));
        // Interior only: a lamp standing in the wall is not a thing, and a lamp
        // OUTSIDE a lit window is the street lighting the room, backwards.
        let lit = false;
        // And WHERE THE FIRE IS, which is the chimney's whole question. Same
        // walk — the furniture is already in hand — and no early exit until both
        // are settled, because a room can answer them in either order.
        //
        // A fireplace is a light too, so most rooms that have one answer both on
        // the same piece; the two are kept apart because a lamp is not a hearth
        // and a hearth is not the only lamp.
        let hearth: string | null = null;
        let hearthFinish: SkinId = FLOOR_DEFAULT_FINISH;
        // And whether the town's own business is done in here, which is the
        // flag's whole question — same walk again, and the same shape of answer:
        // a cell, or null.
        let counter: string | null = null;
        for (const key of room.interior) {
          const piece = world.furniture[key];
          if (!piece) continue;
          const def = furnitureDef(piece.id);
          if (def.light) lit = true;
          // The furniture map is keyed by ANCHOR and so is the counter map, so
          // this key is the anchor of whatever piece is standing here and the
          // two agree by construction.
          if (!counter) {
            const [cx, cy] = key.split(",").map(Number);
            if (counterIdAtAnchor(cx, cy) === "hall") counter = key;
          }
          // The ANCHOR cell, which for a 2x1 fireplace is its west half. The
          // stack goes over that one rather than over the middle of the piece —
          // a chimney sits at one end of a breast, and the anchor is the cell
          // the sim already calls "where this piece is".
          if (def.hearth && !hearth) {
            hearth = key;
            hearthFinish = piece.finish;
          }
          if (lit && hearth && counter) break;
        }
        this.roomLit.set(room.id, lit);
        const stack = chimneyCell(room, hearth);
        this.chimney.set(room.id, stack ? { cell: stack, finish: hearthFinish } : null);
        this.flag.set(room.id, flagCell(room, counter));
        for (const key of covered) this.roofIndex.set(key, room);
      }
      // Forget fade state for rooms that no longer exist, so the map doesn't
      // grow every time a wall is knocked through and rebuilt.
      for (const id of [...this.roofAlpha.keys()]) {
        if (!this.roofCover.has(id)) this.roofAlpha.delete(id);
      }
    }

    const { x, y } = playerTile(world);
    const insideKey = tileKey(x, y);
    for (const room of list) {
      const inside = room.interior.has(insideKey);
      const target = inside ? 0 : 1;
      const current = this.roofAlpha.get(room.id) ?? 1;
      this.roofAlpha.set(room.id, current + (target - current) * ROOF_FADE_RATE);
    }
  }

  /** The ground grid, shown only in build view. Placement is per tile, so while
   *  you're editing you should be able to see the tiles you're editing. */
  private drawBuildGrid(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    const x0 = Math.floor(this.cam.x - this.sw / (2 * TILE)) - 1;
    const x1 = Math.ceil(this.cam.x + this.sw / (2 * TILE)) + 1;
    const y0 = Math.floor(this.cam.y - this.sh / (2 * TILE)) - 1;
    const y1 = Math.ceil(this.cam.y + this.sh / (2 * TILE)) + 1;
    for (let tx = x0; tx <= x1; tx++) {
      ctx.fillRect(Math.round(this.sceneX(tx) - TILE / 2), 0, 1, this.sh);
    }
    for (let ty = y0; ty <= y1; ty++) {
      ctx.fillRect(0, Math.round(this.sceneY(ty) - TILE / 2), this.sw, 1);
    }
  }

  // --- The raised pass --------------------------------------------------------
  // Everything with height, drawn back to front. Sorting on the FOOTPRINT y
  // (not the art's top edge) is what makes a 24px tree correctly hide a
  // villager standing behind it while a villager in front walks over its trunk.

  /** What drifts in the air over the visible ground.
   *
   *  ANCHORED TO A CELL, DRAWN AWAY FROM IT. Each visible cell rolls once
   *  against its region's density; the ones that pass carry a mote whose whole
   *  path is a function of the clock and the cell's own hash. Nothing is stored,
   *  nothing is spawned, and there is no particle list to keep — a mote is not
   *  an object that exists, it is a place the air is doing something.
   *
   *  That is what keeps it out of the weather argument (`content/seasons.ts`
   *  refuses weather because snow that melted would be the first thing in the
   *  game with state). It is also why the cycle must be seamless: with no
   *  lifetime to track, a mote that vanished at the top would pop, so alpha
   *  fades in and out at both ends of the cycle instead.
   *
   *  The region is sampled through `regionParts` like the ground decor, so
   *  petals thin out across the blossom rows' edge rather than stopping on a
   *  line — the same free dither, for the same reason (see `decorKit`). */
  /** @param sources draw only the flashers (true) or only everything else
   *  (false). Two passes because they sit on opposite sides of the night wash —
   *  a petal is an object the dark falls on, a firefly is a light the dark is
   *  seen against. Same walk, same hashes, one branch. */
  private drawMotes(world: WorldState, t: number, sources: boolean): void {
    const ctx = this.ctx;
    // PAST BOTH SIDE EDGES TOO, since `blow` arrived: a seed head anchored a
    // tile off the left of the screen is well inside it by the end of its cycle,
    // and at ±1 the wind blew in from nowhere a tile into the frame. Same
    // argument as the vertical margin below, one axis over.
    const x0 = Math.floor(this.cam.x - this.sw / (2 * TILE)) - 3;
    const x1 = Math.ceil(this.cam.x + this.sw / (2 * TILE)) + 3;
    // Reaching PAST BOTH EDGES, because a mote is drawn away from the cell that
    // anchors it: a spore rises out of the cell below the screen and a petal
    // falls in from the cell above it. The first cut extended the bottom only,
    // which is the margin a riser needs and exactly the wrong end for a faller.
    const y0 = Math.floor(this.cam.y - this.sh / (2 * TILE)) - 3;
    const y1 = Math.ceil(this.cam.y + this.sh / (2 * TILE)) + 3;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const h = decoHash(tx, ty, world.seed ^ 0x6d0a);
        // Cheapest test first: most cells are in a region with no air at all,
        // and asking the field costs nine sites. Must stay above every kit's
        // density or it silently caps them — there is a test.
        if (h > MOTE_MAX) continue;
        const kit = this.moteKit(world, tx, ty, decoHash(tx, ty, world.seed ^ 0x1c77));
        if (!kit || h > kit.density) continue;
        if (!!kit.flash !== sources) continue;
        // THE PHASE, NOT THE BRIGHTNESS, and the two earlier versions of this
        // line are the argument for it. `tintAt` gives day 0, dusk 0.18, night
        // 0.5 and dawn 0.34: a cut at 0.3 lit the fireflies at night and at DAWN
        // while leaving the dusk hour dark, and lowering it to 0.15 fixed the
        // dusk hour and kept the dawn. There is no threshold that means
        // "evening", because dawn sits BETWEEN dusk and night on this axis.
        // Asking which phase it is says the thing directly.
        if (kit.evening) {
          const phase = skyPhaseAt(this.now);
          if (phase !== "dusk" && phase !== "night") continue;
        }
        // `palette.season` is null underground, which is correct without a
        // special case: a cave has no month, and a seasonal mote in one would be
        // weather where §Seasons says there is none.
        if (kit.season && this.palette.season?.id !== kit.season) continue;

        // A THIRD HASH FOR WHERE AND WHEN, independent of the one that just
        // passed `< density`. Deriving them from `h` is the decor kit's bug over
        // again, one file later: `h` is already known to be under a tenth, so
        // every mote started at the same corner of its cell and — worse — at the
        // same point in the cycle. They drifted in lockstep and faded together,
        // which is not a subtle version of the effect but a different one.
        const g = decoHash(tx, ty, world.seed ^ 0x4b31);
        const p = (((t / kit.period + g) % 1) + 1) % 1;
        const size = kit.size ?? 1;
        const px = this.sceneX(tx) - TILE / 2 + 2 + Math.floor(g * (TILE - 4));
        const py = this.sceneY(ty) - TILE / 2 + Math.floor(((g * 91) % 1) * TILE);
        // TRAVEL SIDEWAYS IS NOT SWAY. `sway` is an oscillation — it returns to
        // where it started, which is what a petal falling or a spore rising does
        // while the air is still. `blow` is the air not being still: a straight
        // displacement over the cycle, exactly as `drift` is on the other axis,
        // so a seed head crosses the screen instead of wobbling on the spot.
        // Nothing else in the file has one, and the long grass is the only region
        // whose character is the WIND rather than the light.
        const x = px + Math.sin(p * Math.PI * 2 + g * 6.3) * kit.sway + p * (kit.blow ?? 0);
        const y = py - p * kit.drift;
        // Fade at both ends so the loop has no seam in it — or, for a flasher,
        // dark for most of the cycle and briefly not. A firefly that faded up
        // and down smoothly reads as a small floating lamp.
        // A PULSE THAT EASES, not a triangle. The linear ramp was a strobe: it
        // arrived and left at full slope, which is what a bulb does and not what
        // a firefly does. Smoothstepping the same window makes it swell and go
        // out, which is the whole of the effect once the drifting is gone.
        //
        // THE WINDOW IS SHORT, and shorter than it reads as a number: 8 spans
        // 2/8 of the cycle, about a second and a half out of six, and the
        // smoothstep spends most of that arriving and leaving. A real firefly is
        // dark nearly all the time and briefly not — at 3.4 this one was lit for
        // three seconds in every six, which is a lamp with a dimmer on it.
        //
        // It costs coverage, and that is the trade rather than a bug: a flasher's
        // instantaneous count is density × window (§8o), so halving the window
        // halves how many are alight at once. Densities stay where they were
        // measured — the answer to "too few" is more of them, not longer blinks.
        const pulse = Math.max(0, 1 - Math.abs(p - 0.5) * 8);
        const envelope = kit.flash
          ? pulse * pulse * (3 - 2 * pulse)
          : Math.min(1, Math.min(p, 1 - p) * 5);
        // THE GLINT RUNS ON ITS OWN CLOCK, over the envelope rather than instead
        // of it — the mote still arrives and leaves on `period`, it just catches
        // the light on the way. Its own phase offset (a different multiple of the
        // same cell hash) so a patch of them does not glitter in unison, which is
        // tinsel rather than glitter.
        //
        // IT BREATHES, IT DOES NOT BLINK, and the difference is the whole
        // character of the effect. The first cut ran from a floor of 0.2 to full
        // twice a second: each mote went almost dark and back, which is a strobe.
        // "Frenetic" was the word for it and it was the right one — a screen of
        // small things flicking hard on and off is stressful to look at however
        // pretty each one is on its own.
        //
        // So the floor is HIGH. Half-lit to full is a shimmer — the mote is
        // always there and only its brightness moves, which is what light doing
        // something on a surface actually looks like. Glitter is a bright thing
        // getting brighter, never a thing going out.
        const glint = kit.twinkle
          ? (() => {
              const q = (((t / kit.twinkle + g * 7.3) % 1) + 1) % 1;
              const s = Math.max(0, 1 - Math.abs(q - 0.5) * 2.2);
              return 0.5 + 0.5 * s * s * (3 - 2 * s);
            })()
          : 1;
        const fade = envelope * glint;
        if (fade <= 0) continue;
        const rx = Math.round(x);
        const ry = Math.round(y);
        if (kit.flash) {
          // BRIGHT WITHOUT A HALO, which is a narrower target than it sounds and
          // the reason this is two rects instead of one.
          //
          // It used to spill a low additive glow one pixel past the mote on every
          // side (§8o, "a firefly is a SOURCE"). That is how a lamp works and it
          // is not how this should look: the halo softened every firefly into a
          // smudge on the grass, and the thing it was buying — brightness the
          // palette cannot otherwise reach — is available without it.
          //
          // So the DOT ITSELF goes through the additive pass. A near-white core
          // over an additive body clips to white at the centre and keeps the
          // kit's hue at the rim, so the mark is hotter than anything else on
          // screen while staying exactly `size` wide. Nothing outside the mote is
          // touched, which is the whole of the request.
          //
          // The lamp rule survives, just at one-pixel scale: a source is still
          // the brightest thing in its own light, and the core is still what says
          // so — it is now inside the dot rather than around it.
          const prevOp = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          ctx.fillStyle = kit.color;
          ctx.fillRect(rx, ry, size, size);
          if (kit.core && size > 1) {
            ctx.fillStyle = kit.core;
            ctx.fillRect(rx, ry, size - 1, size - 1);
          }
          ctx.globalCompositeOperation = prevOp;
          continue;
        }
        if (kit.shape === "noise") {
          // A SAMPLE, NOT A BODY. Everything else in this function draws a thing
          // travelling along a path; this draws a pixel that is in one place for a
          // frame or two and then in another, which is what a bad signal looks
          // like and what nothing alive does.
          //
          // The jump comes from quantising the CLOCK and hashing the result: the
          // step number is `t / period`, so the mote holds still between steps and
          // teleports on them. Sway, drift and the smooth envelope above are all
          // deliberately bypassed — they are the machinery of air, and this is not
          // air. (`drift` still has to be non-zero in the row, because every kit
          // is asserted to move; it just does not move like this.)
          const step = Math.floor(t / kit.period);
          const j = decoHash(tx * 31 + step, ty * 17 - step, world.seed ^ 0x6ea2);
          // Half the steps are BLANK, which is most of what makes it read as
          // noise rather than as a swarm: a pixel that is always somewhere is a
          // thing moving about, and a pixel that is sometimes nowhere is a fault.
          if (j > 0.5) continue;
          const nx = Math.round(this.sceneX(tx) - TILE / 2 + Math.floor(((j * 419) % 1) * TILE));
          const ny = Math.round(this.sceneY(ty) - TILE / 2 + Math.floor(((j * 733) % 1) * TILE));
          // Flat, and at a fixed alpha rather than the cycle's fade — a fade in
          // and out is a thing arriving and leaving, and this is a thing being
          // WRONG, which happens all at once.
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = kit.color;
          ctx.fillRect(nx, ny, size, size);
          continue;
        }
        if (kit.shape === "spark") {
          // A burst that OPENS AND CLOSES rather than a square that fades. Arms
          // on the four axes only: a diagonal one would be a 1px stair and read
          // as a smudge at this size.
          //
          // THE ARMS ARE ON THE SLOW CLOCK. They used to be `fade`, which once
          // there was a twinkle meant every spark snapped between a dot and a
          // five-pixel cross twice a second — and a SHAPE changing is far louder
          // than a brightness changing. That, more than the rate, is what made a
          // field of these frantic: fifty little stars all jumping size at once.
          //
          // On the envelope they open as the spore rises and close as it goes,
          // once over eleven seconds, so the star holds still and shimmers. The
          // twinkle is now carried by alpha alone, which is the quiet half of
          // what it was doing and the half that reads as light.
          //
          // IT IS LIGHT, SO IT IS DRAWN LIKE LIGHT — the same additive pass the
          // fireflies and the lamps use, and the reason this stopped looking like
          // a sparkle and started looking like a plus sign. Flat `color` at 0.8
          // alpha over teal ground is grey PAINT in the shape of a cross: the one
          // thing §8o already knew about a source and this path never got, since
          // only `flash` took the additive branch.
          //
          // And a sparkle TAPERS. Equal-brightness arms off an equal-brightness
          // centre is a glyph — the plus on a keyboard. Three tiers instead: a
          // core that clips to white, an inner arm at half, an outer at a fifth.
          // The falloff is the whole difference between a star and a symbol.
          const prevOp = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          const arm = Math.round(envelope * 2);
          ctx.fillStyle = kit.color;
          for (let d = arm; d >= 1; d--) {
            // Dimmer the further out, so the arm fades into the ground instead of
            // ending on a hard pixel. Drawn outermost-first: additive, so the
            // overlap only ever adds, and the inner pixels finish brighter.
            ctx.globalAlpha = (d === 1 ? 0.5 : 0.2) * fade;
            ctx.fillRect(rx - d, ry, 1, 1);
            ctx.fillRect(rx + d, ry, 1, 1);
            ctx.fillRect(rx, ry - d, 1, 1);
            ctx.fillRect(rx, ry + d, 1, 1);
          }
          ctx.globalAlpha = fade;
          ctx.fillStyle = kit.core ?? kit.color;
          ctx.fillRect(rx, ry, 1, 1);
          ctx.globalCompositeOperation = prevOp;
        } else {
          ctx.globalAlpha = 0.8 * fade;
          ctx.fillStyle = kit.color;
          ctx.fillRect(rx, ry, size, size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Which region's air this cell carries, dithered across borders exactly as
   *  the ground decor is. */
  private moteKit(world: WorldState, tx: number, ty: number, h: number): MoteKit | undefined {
    const parts = this.regionsAt(world, tx, ty);
    if (parts.length === 1) return parts[0].def.motes;
    let r = h;
    for (const p of parts) {
      r -= p.w;
      if (r <= 0) return p.def.motes;
    }
    return parts[parts.length - 1].def.motes;
  }

  private flushLaid(): void {
    this.laid.sort((a, b) => a.y - b.y || a.bias - b.bias);
    for (const r of this.laid) r.draw();
  }

  private flushRaised(): void {
    this.raised.sort((a, b) => a.y - b.y || a.bias - b.bias);
    for (const r of this.raised) r.draw();
  }

  /** Is the thing at (tx, ty) actually SWALLOWING the player — not merely
   *  overlapping them — given how tall its art is in scene px?
   *
   *  The reach that matters is the OVERHANG, `(artPx - TILE) / TILE`, not the
   *  full height: art is drawn upward from its footprint's bottom edge, so only
   *  the part rising above its own cell can reach the tile behind. At 24px
   *  that's half a tile, which means a thing one tile in front of you covers
   *  your legs and nothing else — and that overlap is precisely the depth cue,
   *  so fading it destroys the effect it was meant to protect. Computing this
   *  as full height instead made a doorway you were standing at go
   *  see-through.
   *
   *  The horizontal bound is tighter than it looks too: a crown is 14px wide
   *  and a sprite 16px, so they stop overlapping around 0.9 tiles apart. Allow
   *  a full 1.0 and every DIAGONAL neighbour fades, which reads as the forest
   *  flickering as you walk past it. */
  /** How much of its own opacity a standing thing keeps: 1 when it is not in
   *  your way, HIDDEN_FADE when it is squarely in front of you, and a ramp in
   *  between.
   *
   *  IT USED TO BE A BOOLEAN, and that was the "visibility glitches around
   *  walls" report. The test was right and the switch was not: crossing any of
   *  its three edges — the near one, the far one, the sideways one — snapped a
   *  wall between solid and a quarter opacity in a single frame. Walking south
   *  along a house flickered it, and the taller trees made it worse by widening
   *  the band the pop happens in.
   *
   *  So the same three edges now ease over a third of a tile each. Nothing about
   *  WHICH things hide you has changed — the reach is still the overhang and not
   *  the full height, for the reason below — only how abruptly they give way.
   *  The player moves continuously, so anything keyed to their position has to
   *  be continuous or it strobes. */
  private hideFactor(world: WorldState, tx: number, ty: number, artPx: number): number {
    const p = world.player;
    const overhang = (artPx - TILE) / TILE;
    const dy = ty - p.y;
    if (dy <= 0 || dy > overhang) return 1;
    const BAND = 0.35;
    // Sideways: full effect under 0.55, gone by 0.9, rather than a cliff at 0.9.
    const across = 1 - clamp01((Math.abs(tx - p.x) - 0.55) / 0.35);
    // Front-to-back: ease in as it comes between you and the camera, and out
    // again as it passes beyond what its overhang can actually reach over.
    const along = Math.min(clamp01(dy / BAND), clamp01((overhang - dy) / BAND));
    const k = across * along;
    return 1 - (1 - HIDDEN_FADE) * k;
  }

  /** One cell of a roof, sitting a storey above its footprint.
   *
   *  Roofs are derived from enclosure, never placed (DESIGN §Structures), so
   *  this draws whatever the flood-fill says is covered — interior and shell
   *  alike. Edges are drawn only where the roof actually ENDS: per-cell edges
   *  would tile the surface into a grid of boxes, the same mistake the ground
   *  bevel and the wall side-runs each made once already. */
  private drawRoofCell(
    world: WorldState,
    tx: number,
    ty: number,
    covered: Set<string>,
    roofing: SkinId,
    fall: RoofPitch,
    alpha: number,
    chimney: SkinId | null = null,
    skylight = false,
    flag = false,
  ): void {
    const ctx = this.ctx;
    // The whole ROOM's material, decided once by `roofFinish`, not read off the
    // cell underneath. Per-cell was how every roof in the game ended up a rim in
    // the wall's colour around a pale pine middle: over the interior there is no
    // build cell to read, and the fallback was the default finish.
    //
    // The old note here still holds and is the reason the fallback exists at
    // all: it must never read the build bar's SELECTION, or a house restyles its
    // hat the moment you pick up a different colour while the walls holding it
    // up stay put.
    const skin = skinDef(roofing);
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2) - STOREY;

    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;

    ctx.fillStyle = skin.shade;
    ctx.fillRect(px, py, TILE, TILE);

    // The pitch, which is also what pushes the roof clearly darker than its
    // walls — it used to be a flat 10% over the whole plane, and this ramp
    // averages to the same weight so no building got heavier or lighter.
    //
    // Measured in TILE SPACE off the room's own crease (see `roofPitch`), one
    // fill per pixel row, so the bands cross cell boundaries without stopping.
    // A ramp counted in cells would put its steps on the tile grid, which is
    // the per-cell edges rule wearing a value instead of a line.
    const slope = fall.slopeAt(tx, ty);
    if (!slope) {
      ctx.fillStyle = `rgba(0,0,0,${ROOF_PITCH_LIT + ROOF_PITCH_LEE / 2})`;
      ctx.fillRect(px, py, TILE, TILE);
    } else {
      const base = fall.axis === "ew" ? ty : tx;
      for (let i = 0; i < TILE; i++) {
        const at = base + (i + 0.5) / TILE;
        const d = Math.min(1, Math.abs(at - slope.ridge) / slope.reach);
        // The far side of the crease is the lee: light comes from the
        // north-west here (the tree crowns and the wall caps are drawn by it),
        // so an east-west ridge lights its north slope and shades its south.
        const lee = at > slope.ridge ? ROOF_PITCH_LEE : 0;
        const step = Math.min(ROOF_PITCH_STEPS - 1, Math.floor(d * ROOF_PITCH_STEPS));
        ctx.fillStyle = `rgba(0,0,0,${(ROOF_PITCH_LIT + lee + step * ROOF_PITCH_FALL).toFixed(3)})`;
        if (fall.axis === "ew") ctx.fillRect(px, py + i, TILE, 1);
        else ctx.fillRect(px + i, py, 1, TILE);
      }
      // The fold itself, where the crease passes through this cell. Without it
      // the ramp reads as a vignette — a plane that dims toward its edges, not
      // two planes meeting — and the whole point of choosing a gable over a
      // hip was that the roof has a DIRECTION.
      //
      // It is not per-cell banding: a roof has exactly one of these, drawn
      // where the surface actually folds, which is the same test the eave lines
      // pass (draw the edge where the surface ends, and only there).
      const local = slope.ridge - base;
      if (local >= 0 && local < 1) {
        const i = Math.round(local * TILE);
        // A RIDGE CAP rather than a highlight. It was one lit pixel, which says
        // "the plane folds here" and nothing else; a real roof carries a course
        // of capping tiles over the join, and that course is the one piece of
        // roof detail you can see from across a square. Three pixels: a lit top,
        // the cap itself in the roofing's own colour, and a shadow under it so
        // the cap stands on the slope rather than being painted along it.
        //
        // Still not per-cell banding — a roof has exactly one of these and it is
        // drawn where the surface actually folds, which is the same test the eave
        // lines pass.
        const band = (o: number, style: string) => {
          ctx.fillStyle = style;
          if (fall.axis === "ew") ctx.fillRect(px, py + i + o, TILE, 1);
          else ctx.fillRect(px + i + o, py, 1, TILE);
        };
        band(-1, skin.top);
        band(0, skin.color);
        band(1, "rgba(0,0,0,0.18)");
      }
    }

    // Shingle courses. Stepped off the WORLD row rather than the cell, so the
    // lines run unbroken across the whole roof instead of restarting per tile —
    // this is banding on purpose, the way the tent's canvas is striped, and it
    // is the difference between a roof and a brown lid.
    //
    // ALWAYS EAST-WEST, INCLUDING ON A ROOF THAT FALLS THAT WAY, and that is a
    // decision rather than an oversight. Strictly a course lies along the eave,
    // so a north-south ridge should carry them vertically — it was tried, on the
    // barn, and the barn stopped being a barn: the wall under it is planking
    // stood on end, and roof stripes in the same direction ran straight into the
    // wall stripes and made the whole building one tall striped slab. Two
    // surfaces meeting need their textures to CROSS or they read as one surface.
    // The pitch ramp is what says which way this roof falls; the courses only
    // have to say "roof", and they say it best across the grain of the wall.
    // COURSE CONTRAST FOLLOWS THE ROOFING'S OWN LIGHTNESS. A flat 11% black is a
    // different amount of texture depending on what it is laid over: on the
    // barn's ox-blood it reads as courses, and on the museum's marble it very
    // nearly disappears, which is why the biggest roof in town was also the
    // blankest. Scaling by luminance gives every roof about the same amount of
    // visible course, which is what "they are all shingled" should mean.
    const lum = roofLum(skin.color);
    ctx.fillStyle = `rgba(0,0,0,${(0.075 + 0.13 * lum).toFixed(3)})`;
    for (let i = 0; i < TILE; i++) {
      if ((ty * TILE + i) % 4 === 0) ctx.fillRect(px, py + i, TILE, 1);
    }

    const has = (dx: number, dy: number) => covered.has(tileKey(tx + dx, ty + dy));

    // THE EAVE — the roof projecting past the walls that hold it up.
    //
    // This is the single thing that stopped every building in the game being a
    // rectangle. The roof plane used to end exactly on the footprint, so a house
    // was a coloured rectangle sitting on a slightly larger coloured rectangle
    // and nothing about its outline said "building": six of them round a square
    // read as six slabs. A real roof hangs over, and the overhang plus the shadow
    // under it is most of what the eye uses to tell a roof from a floor.
    //
    // DRAWN FROM THE EDGE CELL OUTWARD, which is the same rule the eave LINES
    // below already follow and the same rule CLAUDE.md's band note insists on:
    // only where the surface actually ends, tested against the neighbour. An
    // overhang drawn per cell would put a fascia through the middle of the roof.
    //
    // The overhang lands on the row BEYOND the building, which is safe because
    // the ground pass has already run and nothing raised normally stands against
    // a wall — it is the same liberty the walls themselves take (§the overhang IS
    // the height cue).
    const eave = (ex: number, ey: number, ew: number, eh: number) => {
      ctx.fillStyle = skin.shade;
      ctx.fillRect(ex, ey, ew, eh);
      // AND IT CARRIES THE PITCH, which is the correction the first version
      // needed. Drawn in the bare skin it came out LIGHTER than the roof it hangs
      // off — because the roof plane has the pitch ramp painted over it and the
      // eave did not — so every building in town wore a bright border and the
      // roofs read as framed pictures. That is the per-cell edges failure at
      // building scale: an edge drawn all the way round something that is one
      // surface.
      //
      // The DARKEST end of the ramp, not an average, and that is physics as much
      // as taste: an eave is the lowest point of the slope by definition, so
      // wherever the ramp is dark at the edge, the overhang is at least that.
      ctx.fillStyle = `rgba(0,0,0,${(ROOF_PITCH_LIT + ROOF_PITCH_LEE + (ROOF_PITCH_STEPS - 1) * ROOF_PITCH_FALL).toFixed(3)})`;
      ctx.fillRect(ex, ey, ew, eh);
      // The fascia: one dark line at the very lip. Without it the overhang
      // dissolves into whatever is behind the house and reads as the roof simply
      // being bigger.
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      if (eh <= EAVE) ctx.fillRect(ex, ey + eh - 1, ew, 1);
      else ctx.fillRect(ex + (ew > 1 ? ew - 1 : 0), ey, 1, eh);
    };
    // AN EAVE AND A VERGE ARE NOT THE SAME DEPTH, and drawing them as though they
    // were is what made the first version read as a picture frame round every
    // roof. A pitched roof overhangs generously on the two sides it FALLS toward
    // — those are the eaves, where the water leaves — and barely at all on the
    // two GABLE ends, where the roof simply stops against the wall. Equal on four
    // sides is a border; unequal is a roof, and it says which way the ridge runs
    // without drawing anything extra. `fall.axis` already knows: "ew" is a ridge
    // running east-west, so the roof falls north and south.
    const deepNS = fall.axis === "ew" ? EAVE : VERGE;
    const deepEW = fall.axis === "ew" ? VERGE : EAVE;
    const outW = has(-1, 0) ? 0 : deepEW;
    const outE = has(1, 0) ? 0 : deepEW;
    if (!has(0, -1)) eave(px - outW, py - deepNS, TILE + outW + outE, deepNS);
    if (!has(0, 1)) {
      eave(px - outW, py + TILE, TILE + outW + outE, deepNS);
      // The shadow the south overhang throws onto the wall below it. Only here:
      // this is the one edge whose underside faces the camera, and it is what
      // makes the overhang read as depth rather than as a wider roof.
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(px, py + TILE + deepNS, TILE, 2);
    }
    if (!has(-1, 0)) eave(px - deepEW, py, deepEW, TILE);
    if (!has(1, 0)) eave(px + TILE, py, deepEW, TILE);

    // The far edge used to be a 2px line of `skin.top`, called a sunlit ridge.
    // It was standing in for a ridge the roof did not have, and once the pitch
    // is real that line is the brightest thing on the plane sitting at the
    // LOWEST point of the slope — the north eave. Both edges the roof falls
    // toward are eaves now, in the eave's own colour, and the ridge is where
    // the ramp says it is.
    if (!has(0, -1)) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px, py, TILE, 2);
    }
    if (!has(0, 1)) {
      ctx.fillStyle = skin.color; // the eave you'd see the underside of
      ctx.fillRect(px, py + TILE - 2, TILE, 2);
    }
    // A doorway in a SIDE wall gets the roof pulled back over it, so the
    // house's silhouette is visibly broken where the way in is. Without this a
    // side door has nothing at all to show for itself: its wall is seen edge-on
    // (no face to cut) and its top surface is under this very roof. The step on
    // the ground says "here"; this says "and it's a door".
    const under = world.build[tileKey(tx, ty)];
    let sideDoor = false;
    if (under?.id === "door") {
      const m = wallMask(world, tx, ty);
      sideDoor = Boolean(m & CONNECT_N) && Boolean(m & CONNECT_S);
    }
    for (const dx of [-1, 1]) {
      if (has(dx, 0)) continue;
      const ex = dx < 0 ? px : px + TILE - 1;
      if (sideDoor) {
        ctx.fillStyle = "#3a2620";
        ctx.fillRect(dx < 0 ? px : px + TILE - DOOR_NOTCH, py + DOOR_JAMB, DOOR_NOTCH, TILE - DOOR_JAMB * 2);
      } else {
        ctx.fillStyle = skin.color;
        ctx.fillRect(ex, py, 1, TILE);
      }
    }

    // `py` is ALREADY lifted by STOREY (see above) — it is the roof plane, not
    // the ground. Subtracting it again here put the stack a storey above its own
    // roof, where the next row north painted straight over it and the whole
    // thing read as not having been drawn at all.
    // IN THE HEARTH'S OWN MASONRY, not the roof's. See §chimney on the map this
    // comes from — the short version is that a flue is the fireplace coming up
    // through the roof, so it wears what the fireplace is built of.
    if (chimney) this.drawChimney(px, py, skinDef(chimney));
    // AFTER THE EAVES AND THE CHIMNEY, because a skylight is a hole in the plane
    // and everything above draws the plane. It is also the only thing here that
    // sits INSIDE one cell rather than at a boundary — the eaves and the courses
    // are all edge-or-world-stepped, and a skylight is a discrete object, so a
    // mark centred in its own cell is what it should be. The band rule is about
    // surfaces, and this is emphatically not one.
    if (skylight) this.drawSkylight(world, tx, ty, px, py, fall);
    // LAST, and taller than anything else up here. The pole leaves its own cell
    // and stands over the roof to the north of it, which is safe because the
    // raised pass sorts by y: the cells it overlaps were drawn before this one.
    if (flag) this.drawFlag(px, py);

    ctx.globalAlpha = prev;
  }

  /** The town's flag, over the desk that does the town's business.
   *
   *  WHICH IS THE ONLY REASON IT IS ANYWHERE — see `flagCell`. Nothing here
   *  decides where it goes; this method is handed a cell and draws a pole on it.
   *
   *  IT FLIES, rather than hanging. There is no weather in this world
   *  (content/biomes.ts §what is absent), so a limp flag would have been the
   *  literal answer — and a limp flag is a vertical smudge on a pole, which
   *  reads as an aerial. The grass already sways, so the world does have a
   *  breeze in it even though it has no weather, and the flag agrees with the
   *  grass rather than with the rain that does not fall.
   *
   *  A CARROT ON A PALE FIELD. The game's own mark (scripts/icons.mjs) and the
   *  first crop in the table, and the joke is that the town has put a root
   *  vegetable on its flag and is completely serious about it. In the CROP's own
   *  ripe colour rather than a fresh orange, so the thing on the flag and the
   *  thing in your field are the same carrot.
   *
   *  Pale field, whatever the hall is painted. The roof under it takes the
   *  building's finish, and a flag in that finish is a flag you cannot see —
   *  the chimney's lesson (§drawChimney: one step apart on the same ramp is
   *  invisible), which cost a magenta test block to find once already. */
  private drawFlag(px: number, py: number): void {
    const ctx = this.ctx;
    // Stood at the cell's middle, on the ridge the desk happens to sit under.
    const x = px + 7;
    const foot = py + 12;
    const top = py - 13;

    // THE HALYARD SIDE FIRST, so the flag is drawn over its own pole and the
    // pole does not show through the fabric.
    ctx.fillStyle = FLAG_POLE;
    ctx.fillRect(x, top, 1, foot - top);
    // A finial, because a bare pole end reads as a snapped one. One row: at
    // two it stopped being a knob on a pole and became a lump on a stick.
    ctx.fillRect(x - 1, top, 3, 1);
    // And the shadow the pole throws on the roof, two pixels, the same ink every
    // other contact shadow in the game uses. Without it the pole is printed on
    // the surface rather than standing on it.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x + 1, foot - 2, 3, 2);

    // The fly, east of the pole. IT RIPPLES RATHER THAN BOUNCING, which is the
    // difference between cloth and a sign on a hinge: the whole rectangle used to
    // shift up a pixel and back on one clock, so the flag slid up and down its
    // own pole as a rigid block. Cloth does not do that. Cloth is HELD at the
    // halyard and free at the fly, so the shape has to vary ALONG its length.
    //
    // So each column carries its own one-pixel offset, and the offsets travel
    // outward — a lift that starts near the pole and runs off the fly end. Two
    // columns nearest the halyard never move at all, because that is the edge
    // that is tied to something.
    //
    // The amplitude stays one pixel and the cycle stays 1800ms, both unchanged
    // from the bounce: what was wrong with it was the SHAPE, not the tempo, and a
    // town square with a flag in it must not be a town square with something
    // flashing in it. Off the same clock as the fireplace.
    const step = Math.floor(this.animMs / 450) % 4;
    const fx = x + 1;
    // Three pixels below the pole's top, so the finial and a little halyard show
    // above the fabric. Hard against it the flag reads as a sign screwed to the
    // end of a post.
    const fy = top + 4;
    const fw = 9;
    const fh = 6;

    // ONE BUMP, NOT A SQUARE WAVE, and this is the whole of what the ripple got
    // wrong on the first pass. The first version alternated two columns up and
    // two down along the whole fly, which at one pixel of amplitude on a
    // nine-pixel flag is two full cycles of crenellation: the silhouette came out
    // castellated and the flag read as TORN rather than as moving. This is the
    // band rule's own lesson at the smallest scale it has ever come up — a
    // repeating edge across a surface stops the surface reading as a surface.
    //
    // So the lift is a single three-pixel bump travelling from the halyard out to
    // the fly, on a period longer than the flag itself. At any instant the
    // silhouette has ONE departure from flat in it, which is a ripple passing
    // under cloth; the eye tracks it along and the flag stays a flag.
    const raw = (i: number): number => {
      if (i < 2) return 0; // tied to the pole, never moves
      const phase = (((i - step * 2) % 8) + 8) % 8;
      return phase >= 2 && phase <= 4 ? -1 : 0;
    };
    /** How far column `i` of the fabric is lifted, in pixels: 0 or -1.
     *
     *  THE CHARGE'S TWO COLUMNS ALWAYS MOVE TOGETHER. A carrot two pixels wide
     *  printed across a fold gets sheared by a pixel when the fold passes between
     *  them, and at this size a one-pixel shear does not read as cloth flexing —
     *  it reads as the carrot BREAKING IN HALF, leaf adrift above the root. So
     *  column 4 takes column 3's answer, which costs a two-pixel flat spot in a
     *  bump three pixels long and nobody will ever find it. */
    const lift = (i: number): number => raw(i === 4 ? 3 : i);

    // A RECTANGLE, AND NO SWALLOWTAIL, which took three goes to arrive at and is
    // worth writing down: A NOTCH CANNOT SURVIVE A ONE-PIXEL OUTLINE AT THIS
    // SIZE. The flag is six pixels tall, so any cut into its fly end is at most
    // two deep — and every pixel of a two-deep notch is within one pixel of the
    // fabric above and below it, so the outline fills the notch in solid ink and
    // the flag comes out with a dark bite in it instead of a fork.
    //
    // (The first attempt cut it with `clearRect`, which does not put a hole in
    // the flag: it puts a hole in the WORLD. It punched through the roof, the
    // ground and the sky and left a navy rectangle of empty page floating in the
    // middle of the fabric.)
    //
    // So the fabric is said by the LIFT instead, and the outline is kept —
    // against a sage roof one step off the flagpole's own brown, the outline is
    // what makes a flag out of a pale smudge. Restraint over texture: the notch
    // was a detail this size cannot hold.
    //
    // DRAWN A COLUMN AT A TIME, which is what the ripple costs and it is cheap.
    // The outline cannot be one rectangle round a shape that is no longer a
    // rectangle, so each column lays its own pixel of ink above and below its own
    // fabric. Note what this does NOT do: it never draws ink BETWEEN two columns.
    // A per-column left-and-right edge would rule a vertical line down every
    // column of a surface that is one piece of cloth, which is the venetian-blind
    // failure the band rule is named for (CLAUDE.md §per-cell edges) at a scale of
    // one pixel. The ink goes where the fabric ENDS: above it, below it, and at
    // the two ends.
    for (let i = 0; i < fw; i++) {
      const cy = fy + lift(i);
      ctx.fillStyle = FLAG_INK;
      ctx.fillRect(fx + i, cy - 1, 1, 1);
      ctx.fillRect(fx + i, cy + fh, 1, 1);
      ctx.fillStyle = FLAG_FIELD;
      ctx.fillRect(fx + i, cy, 1, fh);
    }
    // The two ends. The halyard edge is pinned with the columns it is tied to;
    // the fly edge rides whatever the last column is doing.
    ctx.fillStyle = FLAG_INK;
    ctx.fillRect(fx - 1, fy - 1, 1, fh + 2);
    ctx.fillRect(fx + fw, fy + lift(fw - 1) - 1, 1, fh + 2);

    // The carrot: a taper, two pixels wide at the shoulder and one at the tip,
    // with a leaf over it. It is legible ONLY if it tapers — the app icon was
    // drawn 8 by 6 without a taper and read as a pumpkin at four times this
    // size (ROADMAP §PWA icon).
    // Toward the HALYARD rather than centred on the field, because the fly end
    // is where the notch is and a charge in the middle of a swallowtail sits in
    // the part of the flag that is missing.
    //
    // It rides the fabric COLUMN BY COLUMN, like everything else printed on
    // cloth. Its two columns can be a pixel apart mid-ripple, which shears the
    // carrot by one pixel and is correct: a charge that stayed rigid while the
    // field moved under it would be painted on the air in front of the flag.
    for (const [i, top, rows] of [
      [3, 1, 3],
      [4, 1, 2],
    ] as const) {
      const cy = fy + lift(i);
      ctx.fillStyle = CARROT_TOP;
      ctx.fillRect(fx + i, cy + top, 1, 1);
      ctx.fillStyle = CARROT;
      ctx.fillRect(fx + i, cy + top + 1, 1, rows);
    }
  }

  /** A skylight: a hole cut in a roof that arrived on its own.
   *
   *  Drawn on the ROOF plane, at the cell it was placed on a storey below — see
   *  content/structures.ts §skylight for why it is placed from inside the room
   *  and not on the roof itself.
   *
   *  ALIGNED TO THE FALL. A skylight is set into a slope, so it is longer along
   *  the direction the roof falls than across it — that is the one line that
   *  makes it read as being IN the roof rather than lying on top of it, and
   *  `fall.axis` already knows which way the ridge runs. Square, it photographed
   *  as a crate.
   */
  private drawSkylight(
    world: WorldState,
    tx: number,
    ty: number,
    px: number,
    py: number,
    fall: RoofPitch,
  ): void {
    const ctx = this.ctx;
    const cell = world.build[tileKey(tx, ty)];
    const leaf = skinDef(cell?.finish ?? FLOOR_DEFAULT_FINISH);
    // Warm when there is a lamp burning under it and dark enough outside to
    // tell — the same pair of tests the sashes take, for the same reason. A
    // skylight glowing at noon is orange paint on a roof.
    const room = this.roofIndex.get(tileKey(tx, ty));
    const lit = Boolean(room && this.roomLit.get(room.id)) && this.darkness > 0.12;

    // Four px of roof all round on the short axis, two on the long one. The
    // margin is what says "set into" — a light running to the cell edge would
    // meet its neighbours' and tile the roof, which is the failure the display
    // cases and the shingles both had.
    const longNS = fall.axis === "ew";
    const mx = longNS ? 4 : 2;
    const my = longNS ? 2 : 4;
    const w = TILE - mx * 2;
    const h = TILE - my * 2;
    const x = px + mx;
    const y = py + my;

    // The kerb it stands on, throwing a shadow onto the shingles below it. Drawn
    // first and one px proud on the south and east, which is the same light this
    // whole renderer works in — key from the north-west.
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(x, y + 1, w + 1, h + 1);

    ctx.fillStyle = leaf.color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = lit ? GLASS_WARM : GLASS;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // NO GLAZING BAR, AND NO HALF-FILL EITHER — one pane, and it took both
    // removals to actually get one.
    //
    // The bar went first: the museum's sashes are plate glass now
    // (§window_plate), and a gallery that takes the bars out of its windows and
    // leaves one in every roof light has made two decisions instead of one.
    //
    // But taking the bar out left the light still reading as TWO PANES, which is
    // the part worth writing down. The sky used to be painted over the up-slope
    // HALF of the glass — a hard vertical edge exactly down the middle — and a
    // hard edge down the middle of a rectangle is a glazing bar whether or not
    // you drew one. Removing the muntin just changed its colour.
    //
    // So the sky is a RAKE now: the same diagonal streak the sashes carry
    // (§drawWindow), which is a reflection lying across one sheet and cannot be
    // mistaken for a division. It also makes the roof lights and the windows
    // agree — this building's glass all catches the light the same way, which is
    // what says it is all the same glass.
    ctx.fillStyle = lit ? GLASS_WARM_LIT : GLASS_LIT;
    const iw = w - 2;
    const ih = h - 2;
    for (let i = 0; i < iw; i++) {
      const t = iw > 1 ? i / (iw - 1) : 0;
      ctx.fillRect(x + 1 + i, y + 1 + Math.round(t * (ih - 2)), 1, 2);
    }
  }

  /** The stack, and what comes out of it.
   *
   *  A BLOCK ON A PLANE, WHICH IS WHY THIS WORKS TOP-DOWN AT ALL. The one
   *  chimney this project drew before was on the TITLE screen, which is a side
   *  elevation, and it was deleted for floating at the join — a stack rising off
   *  the slope of a pitched roof has to meet a diagonal, and it didn't. Seen from
   *  above there is no slope to meet: the roof is a flat surface and a chimney is
   *  a small raised box standing on it, which is a shape this renderer already
   *  draws a dozen times (DESIGN §Structures — the overhang is the height cue).
   *
   *  It does NOT break the one-storey rule. Nothing here hovers over a ground
   *  tile — the stack sits ON the roof plane the way a rock sits on the grass,
   *  and the smoke is air rather than altitude: there is no height in it you
   *  could stand on. That distinction is the whole of what §Structures forbids.
   *
   *  Drawn from inside `drawRoofCell` so it inherits the cutaway fade for free —
   *  walk indoors and the chimney goes with the roof it stands on, which it must,
   *  or a stack would be left hanging over an open room. */
  private drawChimney(px: number, py: number, skin: SkinDef): void {
    const ctx = this.ctx;
    const cx = px + 8;
    const base = py + 11; // stood a little back from the cell's near edge
    const w = 6;
    const h = 9;

    // Its own contact shadow ON THE ROOF, cast down-right like every other one
    // in the game. Without it the block reads as printed on the surface rather
    // than standing on it — the same two pixels that stopped the trees floating.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - w / 2 + 1, base - 1, w + 1, 2);

    // A SILHOUETTE FIRST, which is what makes it read at all. The stack was
    // built in `skin.color` standing on a roof drawn in `skin.shade` darkened a
    // tenth — one step apart on the same ramp, so the first version was invisible
    // and looked exactly like nothing being drawn. It was drawing the whole time;
    // a magenta test block found it in one shot.
    //
    // The fix is the convention `drawFurniture` already uses for the same job:
    // a dark outline under the object, so it is separated from its ground by an
    // edge rather than by a value it happens to differ from. A chimney is the
    // same material as its roof, so it can never win on hue.
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(cx - w / 2 - 1, base - h - 1, w + 2, h + 1);

    ctx.fillStyle = skin.color;
    ctx.fillRect(cx - w / 2, base - h, w, h);
    ctx.fillStyle = skin.shade; // the right cheek, away from the light
    ctx.fillRect(cx + w / 2 - 1, base - h, 1, h);
    ctx.fillStyle = skin.top; // the cap, catching the sky
    ctx.fillRect(cx - w / 2, base - h, w, 2);
    ctx.fillStyle = "#2f2620"; // the flue, so it is a chimney and not a post
    ctx.fillRect(cx - w / 2 + 2, base - h, w - 4, 1);

    this.drawSmoke(cx, base - h);
  }

  /** Smoke: three puffs on one rising cycle, offset by a third each.
   *
   *  STATELESS, and that is the rule it has to satisfy rather than a shortcut.
   *  `content/seasons.ts` refuses weather in writing because snow that melted
   *  would be the first weather in the game with STATE — terrain is a total
   *  function of the seed plus stored edits, and anything that accumulates
   *  breaks that. A puff whose height and drift are a sine of the clock stores
   *  nothing and accumulates nothing; it is the water ripple's trick, one axis
   *  up. Nothing here is saved, simulated, or asked about by anything.
   *
   *  Keyed off the stack's own position so two chimneys in a row never puff in
   *  time with each other — synchronised smoke reads as a machine. */
  private drawSmoke(cx: number, top: number): void {
    const ctx = this.ctx;
    const t = (performance.now() - this.t0) / 1000;
    const phase0 = (cx * 0.37) % 1;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.22 + phase0 + i / 3) % 1;
      const rise = p * 13;
      // Widening and fading as it goes, which is most of what says "smoke"
      // rather than "dots": a puff that keeps its size is a bead on a string.
      const size = 1 + Math.floor(p * 2.4);
      const drift = Math.sin(p * 3.1 + phase0 * 6.3) * 2.5;
      ctx.fillStyle = `rgba(226,222,214,${(0.34 * (1 - p)).toFixed(3)})`;
      ctx.fillRect(Math.round(cx + drift - size / 2), Math.round(top - 1 - rise), size, size);
    }
  }

  /** A piece of furniture, drawn from its anchor across its whole footprint.
   *
   *  Low things in a 3/4 view read as a TOP SURFACE plus a FRONT FACE: the
   *  footprint lifted by the piece's height, with the height itself showing as
   *  a band along the near edge. Drawing a bed as a flat 16px block instead
   *  would throw away the fact that it's two tiles deep.
   *
   *  Sorted on the footprint's SOUTHERN row by the caller, so a bed's far end
   *  never sorts in front of something standing beside its near end. */
  /** A piece, and then whatever is sitting on it.
   *
   *  A wrapper rather than a line at the bottom of the draw, because the draw
   *  has four exits — the lamp leaves early, a wall-mounted piece leaves early,
   *  the art path returns after its blit, and the fallback runs to the end. A
   *  mark added at "the end" would have been drawn for exactly one of them. */
  private drawFurniture(world: WorldState, ax: number, ay: number, cell: FurnitureCell): void {
    this.drawFurniturePiece(world, ax, ay, cell);
    const counter = counterIdAtAnchor(ax, ay);
    if (counter) this.drawCounterMark(ax, ay, cell, counter);
  }

  /** What says this table is a counter (content/countermarks.ts).
   *
   *  Placed off the piece's OWN geometry rather than per-piece constants, so one
   *  rule serves a 2x1 table twelve pixels tall and a 2x2 stage eight tall:
   *  centred across the piece, standing just behind the front lip of its top
   *  surface. `base - H` is where that surface ends and the near face begins,
   *  which is the same datum the fallback draw uses to split the two.
   *
   *  Integer coordinates and a 1:1 blit, like every other piece of art in here.
   *  Anything else resamples pixel art off the grid, which CLAUDE.md forbids
   *  outright. */
  private drawCounterMark(
    ax: number,
    ay: number,
    cell: FurnitureCell,
    counter: CounterId,
  ): void {
    const ctx = this.ctx;
    const def = furnitureDef(cell.id);
    const { w, h } = footprint(def, cell.facing);
    const grid = COUNTER_MARKS[counter];
    const raster = pieceCanvas(`mark:${counter}`, grid, skinDef(cell.finish), false);

    const px = Math.round(this.sceneX(ax) - TILE / 2);
    const base = Math.round(this.sceneY(ay + h - 1) + TILE / 2);
    const surfaceFront = base - def.height;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    ctx.drawImage(
      raster,
      px + Math.round((w * TILE - raster.width) / 2),
      surfaceFront - raster.height - 2,
    );
    ctx.globalAlpha = prev;
  }

  /** Does this joining piece's run carry on to either side of it?
   *
   *  EAST-WEST ONLY, which is the counter's documented limit (content/furniture.ts
   *  §counter) rather than an accident here.
   *
   *  A NEIGHBOUR HAS TO MATCH ON EVERYTHING VISIBLE — same form, same set, same
   *  finish. Merging across any of those would run one continuous worktop over two
   *  different objects: a pine counter and a walnut one butted together are two
   *  counters, and drawing them as one slab with a colour change down the middle
   *  is worse than drawing the seam. Facing is in the comparison too, cheaply, so
   *  that the day a turned run gets its own grids this does not silently merge
   *  across the corner. */
  private runNeighbours(
    world: WorldState,
    ax: number,
    ay: number,
    cell: FurnitureCell,
  ): { axis: RunAxis; before: boolean; after: boolean } {
    // The FACING picks the axis: turned east or west, a counter runs away from
    // the camera instead of across it, and those are two different drawings
    // (render/furnishings.ts §RunAxis) rather than one rotated.
    const axis: RunAxis = cell.facing === "e" || cell.facing === "w" ? "y" : "x";
    const same = (x: number, y: number): boolean => {
      const other = world.furniture[tileKey(x, y)];
      return (
        other !== undefined &&
        other.id === cell.id &&
        other.set === cell.set &&
        other.finish === cell.finish &&
        other.facing === cell.facing
      );
    };
    // STEP BY THE FOOTPRINT, not by one. Every cell in a run is the same form
    // turned the same way, so its neighbour's ANCHOR is a whole piece away — one
    // tile for a counter, two for a table. Stepping by one found nothing at all
    // for the table and quietly drew three separate tables in a row, which is
    // precisely what a joining piece exists to stop looking like.
    const { w, h } = footprint(furnitureDef(cell.id), cell.facing);
    return axis === "x"
      ? { axis, before: same(ax - w, ay), after: same(ax + w, ay) }
      : { axis, before: same(ax, ay - h), after: same(ax, ay + h) };
  }

  private drawFurniturePiece(
    world: WorldState,
    ax: number,
    ay: number,
    cell: FurnitureCell,
  ): void {
    const ctx = this.ctx;
    const def = furnitureDef(cell.id);
    const { w, h } = footprint(def, cell.facing);
    const skin = skinDef(cell.finish);
    const trimId = trimOf(cell);
    const trim = trimId ? skinDef(trimId) : undefined;
    const px = Math.round(this.sceneX(ax) - TILE / 2);
    const py = Math.round(this.sceneY(ay) - TILE / 2);
    const base = Math.round(this.sceneY(ay + h - 1) + TILE / 2);
    const pw = w * TILE;
    const H = def.height;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;

    // The lamp leaves the generic path entirely, before the block is drawn.
    // Every other piece in this table is a box with a top you look down on — a
    // bed, a table and a shelf really are that — and a lamp is a POST. Given the
    // generic silhouette it read as a tan pillar filling its whole cell, which is
    // a column, not a light. So it draws itself and returns.
    if (cell.id === "lamp") {
      this.drawLamp(px, base, pw, skin);
      ctx.globalAlpha = prev;
      return;
    }

    // AND THE AWNING LEAVES IT TOO, for the same reason one step further on. The
    // lamp's argument is that the generic silhouette is a box and a lamp is a
    // post; an awning is a box with the FRONT TAKEN OUT, which the generic path
    // cannot express at all — line ~4597 fills a near face for every piece that
    // is not `flat`, so the two posts this case used to draw were being painted
    // onto a solid wall of whitewash that had already been laid down under them.
    //
    // Nobody noticed until one stood in front of a door. It was read as a stall
    // for a year because a stall is what it looked like — a counter with a
    // striped lid — and at Derek's it sits BEHIND his counter with nothing behind
    // it to hide, so the solid front was doing an honest job as the back of the
    // stall. Put the same piece in front of The Counter's doorway and the door
    // vanishes behind it: not shaded, bricked up.
    //
    // The whole point of this object is that you can stand under it (§awning:
    // "a canopy you could not step beneath would be a shed with the walls
    // missing"). It was walk-through in the sim and solid to the eye, which is
    // the worst of both — the game let you walk through something the picture
    // said was a wall.
    if (cell.id === "awning") {
      // MOUNTED OR FREE-STANDING, and it is derived rather than declared — the
      // chimney's argument again. An awning with a wall behind it is fixed to
      // that wall, so its cloth hangs from the TOP of it; an awning standing in
      // the open is a stall, and its cloth sits at the head of its own posts.
      //
      // One number for both was tried and only one place can be right. At the
      // stall's 14 the shop's canopy hung across the middle of the shopfront like
      // a banner tied on; at the wall's 24 Derek's stall went up on stilts with a
      // storey of daylight between his counter and his roof. They are two
      // different objects and the wall is what tells them apart.
      //
      // Asked of the row NORTH of the piece, across its whole width: a canopy is
      // drawn on the row in front of what it belongs to (§drawAwning), so the
      // wall it hangs on is the one behind it. Either cell is enough — an awning
      // at the end of a run still has a wall to be fixed to.
      const run = this.awningRun(world, ax, ay);
      // MOUNTED CLEARS THE EAVE. A wall's top is not the top of what you can see
      // of the building — the roof hangs `EAVE` pixels past it — so an awning
      // hung at exactly STOREY has its rail underneath the overhang, jammed
      // against the fascia with no daylight between them. On the shop that put
      // the canopy's dark top edge, the eave's shadow and the roof's lit lip in
      // three touching bands, and the awning stopped being a separate object.
      //
      // Dropping it by the eave's depth is also what a real one does: an awning
      // is fixed to the wall BELOW the eaves, because the eaves are what it is
      // being an eave instead of.
      this.drawAwning(px, py, base, pw, run.mounted ? STOREY - EAVE : H, skin, ax, run);
      ctx.globalAlpha = prev;
      return;
    }

    // A WALL-MOUNTED piece hangs on the face of the wall it was placed on, so
    // none of the floor geometry below applies: there is no footprint to lift,
    // no near face, and no shadow on a floor it does not touch. Its grid is
    // `w * TILE` by `height`, hung under the wall's cap.
    //
    // It sorts at the same y and bias as its own wall and is pushed after it, so
    // a stable sort draws the wall and then the picture on it. That is the whole
    // of the layering, and it is why this needs no new pass.
    const mounted = artFor(cell.id, cell.set);
    if (def.mount === "wall") {
      if (mounted) {
        const { grid, mirror } = gridFor(mounted, cell.facing);
        const raster = pieceCanvas(
          `${cell.id}:${cell.set}:${cell.facing}:${cell.finish}:${trimId ?? "-"}`,
          grid,
          skin,
          mirror,
          trim,
        );
        // The wall's own datum, not the furniture one: `base` here is the floor
        // line of the cell, and a wall's face runs from a storey above it.
        ctx.drawImage(raster, px, base - STOREY + WALL_CAP + 2);
      }
      ctx.globalAlpha = prev;
      return;
    }

    // Art, where a piece has been given some. The grid occupies exactly the box
    // the fallback below draws — `pw` by `h * TILE + H` — plus its own `rise`,
    // so the two paths are interchangeable per piece and the table can be
    // converted one row at a time rather than all at once.
    const art = artFor(cell.id, cell.set);
    if (art) {
      // Zero for everything without an `anim` — one fireplace does not put the
      // rest of the furniture on a clock, and an unanimated piece keeps the one
      // cache entry it always had.
      const frame = art.anim ? Math.floor(this.animMs / art.anim.holdMs) : 0;
      // A JOINING PIECE ASKS ITS NEIGHBOURS FIRST. Which of the three drawings a
      // counter cell uses is a fact about the run it is in, not about its facing,
      // so this branch replaces `gridFor` rather than feeding it.
      const run = art.joins ? this.runNeighbours(world, ax, ay, cell) : null;
      const joined = run ? runGridFor(art, run.axis, run.before, run.after) : null;
      const { grid, mirror } = joined ?? gridFor(art, cell.facing, frame);
      const rise = art.rise ?? 0;
      // Keyed on the finish as well as the piece and facing: one grid serves
      // thirteen finishes precisely because `c`/`t`/`s` are resolved at raster
      // time, which means a walnut chair and a pine one are different pixels.
      // And on the FRAME, or the first flame drawn would be served forever.
      const suffix = art.anim ? `:${frame % art.anim.frames.length}` : "";
      // And on WHICH END OF ITS RUN, or the first counter rasterized would be
      // served to every cell in the kitchen and the whole run would wear one
      // cell's end caps.
      const joint = joined && run ? `:${run.axis}${run.before ? "b" : ""}${run.after ? "a" : ""}` : "";
      const raster = pieceCanvas(
        `${cell.id}:${cell.set}:${cell.facing}:${cell.finish}:${trimId ?? "-"}${suffix}${joint}`,
        grid,
        skin,
        mirror,
        trim,
      );
      // Integer coordinates and no scale factor — the grid is authored at scene
      // px, so this is a 1:1 blit. Anything else resamples pixel art off the
      // grid, which CLAUDE.md forbids outright.
      ctx.drawImage(raster, px, py - H - rise);
      ctx.globalAlpha = prev;
      return;
    }

    ctx.fillStyle = "rgba(0,0,0,0.16)"; // sits ON the floor
    ctx.fillRect(px + 1, base - 1, pw - 2, 2);

    ctx.fillStyle = skin.shade; // the near face — this is the height you see
    ctx.fillRect(px, base - H, pw, H);
    // The top, lifted clear of the floor — unless the piece is FLAT, which is a
    // panel and has no top to see (content/furniture.ts §flat).
    if (!def.flat) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px, py - H, pw, base - py);
    }

    // Outline the whole silhouette. Furniture wears the same finish as the
    // walls it stands against, so without a hard edge a furnished room is one
    // continuous tan mass and you can't tell architecture from objects. The top
    // surface and the near face meet flush, so the silhouette is a single rect.
    const oy = def.flat ? base - H : py - H;
    const oh = def.flat ? H : base - py + H;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(px, oy, pw, 1);
    ctx.fillRect(px, base - 1, pw, 1);
    ctx.fillRect(px, oy, 1, oh);
    ctx.fillRect(px + pw - 1, oy, 1, oh);
    if (!def.flat) {
      ctx.fillStyle = "rgba(0,0,0,0.20)"; // the lip where the top meets the face
      ctx.fillRect(px + 1, base - H, pw - 2, 1);
    }
    ctx.fillStyle = skin.top; // sunlit far edge, kept inside the outline
    ctx.fillRect(px + 1, oy + 1, pw - 2, 1);

    // Which edge of the top surface is the FAR one, for the detail that gives
    // each piece its silhouette. This is the only place facing is visible, and
    // it's why furniture carries one and walls don't.
    const top = py - H;
    const deep = base - py; // depth of the top surface in px
    switch (cell.id) {
      case "bed": {
        ctx.fillStyle = skin.top; // pillow at the head
        if (cell.facing === "s") ctx.fillRect(px + 2, top + 2, pw - 4, 4);
        else if (cell.facing === "n") ctx.fillRect(px + 2, top + deep - 6, pw - 4, 4);
        else if (cell.facing === "e") ctx.fillRect(px + 2, top + 2, 4, deep - 4);
        else ctx.fillRect(px + pw - 6, top + 2, 4, deep - 4);
        break;
      }
      case "table": {
        ctx.fillStyle = skin.shade; // an inset grain line, so it isn't a slab
        ctx.fillRect(px + 2, top + 2, pw - 4, 1);
        ctx.fillRect(px + 2, top + deep - 3, pw - 4, 1);
        break;
      }
      case "chair": {
        ctx.fillStyle = skin.shade; // back panel, opposite the way it faces
        if (cell.facing === "s") ctx.fillRect(px + 2, top + 2, pw - 4, 3);
        else if (cell.facing === "n") ctx.fillRect(px + 2, top + deep - 4, pw - 4, 3);
        else if (cell.facing === "e") ctx.fillRect(px + 1, top + 2, 3, deep - 4);
        else ctx.fillRect(px + pw - 4, top + 2, 3, deep - 4);
        break;
      }
      case "noticeboard": {
        // Read off the FRONT FACE rather than the top: a board is a vertical
        // surface, and the whole reason it stands 22px is that you see its face.
        //
        // PAPER IS NOT WOOD, so it does not take the piece's finish. Every other
        // detail in this switch draws in `skin.top`/`skin.shade` because a
        // pillow, a shelf and a tabletop really are made of the thing they sit
        // on — paper isn't, and drawn in pine it vanished into the board and the
        // whole object read as a crate. Parchment is hardcoded for the same
        // reason a crop's leaves are: it is its own material.
        const face = base - H;

        // THE LID IS GONE. It used to be dressed as a little pitched roof over
        // the paper — which a parish board really has, and which really did stop
        // a 16px slab reading as a crate. But it was a fix for the wrong problem:
        // the board did not need a better top, it needed no top. It is `flat`
        // now (content/furniture.ts), and what is left is the face, which is the
        // only part of a notice board anybody has ever looked at.
        ctx.fillStyle = skin.shade; // a recessed panel, so it reads as framed
        ctx.fillRect(px + 1, face + 1, pw - 2, H - 3);
        // Three sheets, deliberately misaligned and different sizes. A grid of
        // identical rectangles would read as panelling; the joke is that this
        // has been pinned by six people over several months, none of whom were
        // looking at what was already there.
        ctx.fillStyle = "#efe6cf";
        ctx.fillRect(px + 2, face + 3, 5, 6);
        ctx.fillRect(px + 9, face + 2, 5, 7);
        ctx.fillRect(px + 4, face + 12, 8, 6);
        ctx.fillStyle = "#b9ad90"; // a line of writing on each, too small to read
        ctx.fillRect(px + 3, face + 5, 3, 1);
        ctx.fillRect(px + 10, face + 4, 3, 1);
        ctx.fillRect(px + 5, face + 14, 5, 1);
        ctx.fillStyle = "#8c7a5c"; // pins
        ctx.fillRect(px + 4, face + 3, 1, 1);
        ctx.fillRect(px + 11, face + 2, 1, 1);
        ctx.fillRect(px + 7, face + 12, 1, 1);
        break;
      }
      case "stage": {
        // A LOW PLATFORM, and the restraint is the design. Every other standing
        // thing in this game sells its height by overhanging the cell behind
        // it; a stage that did that would hide whoever was standing on it,
        // which is the Blessed Carrot bug rebuilt deliberately (ROADMAP §3g).
        // Eight pixels is a step up. You read it as a stage because there is a
        // Blob beside it, which is the correct way round.
        //
        // Boards run ACROSS the whole top in one pass, not per cell. The piece
        // is 2x2, so per-cell planking would put a seam down the middle of a
        // surface that is meant to be continuous — the per-cell edges band rule
        // (CLAUDE.md), which this is the fifth candidate for. Drawn from the
        // anchor, the courses run unbroken over both cells.
        // Four courses, not eight. The first pass ruled a line every five
        // pixels and the whole thing read as a sheet of lined paper lying in
        // the square — the boards have to be wide enough to be boards.
        ctx.fillStyle = skin.shade;
        for (let y = 8; y < deep - 2; y += 8) ctx.fillRect(px + 2, top + y, pw - 4, 1);
        // The step, at the near-left corner: a lighter tread over a dark riser,
        // which is the only way 3px of anything reads as a step rather than as
        // a smudge. Off-centre on purpose — centred it looked like a plinth
        // for an object, and the fact worth conveying is that somebody gets up
        // onto this.
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(px + 3, base - 4, 11, 4);
        ctx.fillStyle = skin.top;
        ctx.fillRect(px + 4, base - 4, 9, 2);
        break;
      }
      case "shelf": {
        ctx.fillStyle = skin.shade; // shelves, read off the front face
        ctx.fillRect(px + 1, base - H + 5, pw - 2, 1);
        ctx.fillRect(px + 1, base - H + 11, pw - 2, 1);
        ctx.fillStyle = skin.top; // and something on them
        ctx.fillRect(px + 3, base - H + 2, 3, 3);
        ctx.fillRect(px + 8, base - H + 8, 4, 3);
        break;
      }
    }

    ctx.globalAlpha = prev;
  }

  /** An awning: a striped cloth on two posts, with AIR BETWEEN THEM.
   *
   *  The air is the entire reason this has its own method. On the generic path it
   *  came out as a solid box with a striped lid — see the note at the call site —
   *  which is a market stall seen from the front, and which walls off whatever
   *  stands behind it. Here the only things drawn are the cloth, the two posts,
   *  and the shadow the posts put on the ground; everything between them is left
   *  as it was, so a doorway behind an awning is a doorway you can see.
   *
   *  THE STRIPES ARE DELIBERATE BANDING, and they are the whole of what says
   *  "stall" rather than "roof". CLAUDE.md's per-cell rule forbids banding that
   *  follows the TILE grid; these are stepped off the piece's own anchor at 8px
   *  regardless of where its cells fall, so a 2-wide awning is one striped sheet
   *  rather than two little ones butted together at a seam down the middle.
   *
   *  The cloth is drawn on the TOP surface, because a canopy slopes away from you
   *  and what you look at from here is the sheet, not its edge. It still overlaps
   *  the bottom of the wall behind it by `height` px, and that is not a bug to
   *  fix — it is what an awning DOES to the window it shades. It is also why one
   *  must never be parked in front of a door: see content/town.ts §The Counter,
   *  where that was the whole mistake. */
  /** What an awning's neighbours make of it: where its run ends, and whether the
   *  run as a whole is fixed to a wall.
   *
   *  MOUNTEDNESS IS A PROPERTY OF THE RUN, NOT OF THE CELL, and that is the one
   *  part of this worth arguing. Asked per cell, a canopy that ran two cells along
   *  a wall and one cell past its corner would hang at two different heights and
   *  tear down the middle. A sheet of cloth is one object: if the building holds
   *  any of it up, it holds all of it up. */
  private awningRun(
    world: WorldState,
    ax: number,
    ay: number,
  ): { west: boolean; east: boolean; mounted: boolean } {
    const isAwning = (x: number) => world.furniture[tileKey(x, ay)]?.id === "awning";
    // `joinsWallRun` rather than `id === "wall"`, because the thing an awning is
    // most often fixed above is a WINDOW, and a shopfront's door is part of the
    // same run. It is the predicate that already means "this reads as continuous
    // wall" everywhere else.
    const walled = (x: number) => {
      const b = world.build[tileKey(x, ay - 1)];
      return b !== undefined && joinsWallRun(b.id);
    };

    let mounted = walled(ax);
    let lo = ax;
    while (isAwning(lo - 1)) {
      lo--;
      if (walled(lo)) mounted = true;
    }
    let hi = ax;
    while (isAwning(hi + 1)) {
      hi++;
      if (walled(hi)) mounted = true;
    }
    return { west: lo < ax, east: hi > ax, mounted };
  }

  private drawAwning(
    px: number,
    py: number,
    base: number,
    pw: number,
    H: number,
    skin: SkinDef,
    ax: number,
    run: { west: boolean; east: boolean; mounted: boolean },
  ): void {
    const ctx = this.ctx;
    const mounted = run.mounted;

    // NO POSTS ON A MOUNTED ONE, and this is not a preference — it is the same
    // fact as the height, said in the other direction. A canopy bolted to the top
    // of a wall is CANTILEVERED; it is held up by the building. Posts under it
    // are a stall's posts, and drawing them on a shopfront put two legs down onto
    // the pavement holding up something that was already attached to the wall
    // above them.
    //
    // Which leaves the free-standing case with them, because a stall in an open
    // square has nothing else to be held up by. One derivation, two objects,
    // exactly as with the height: `wallBehind` decides both, and it cannot get
    // them out of step.
    // AND ONLY AT THE ENDS OF THE RUN. A post per cell would stand a leg every
    // sixteen pixels under one continuous sheet, which is a colonnade, and the
    // cloth would stop reading as one piece — the per-cell edges band rule
    // (CLAUDE.md) arriving as furniture rather than as a bevel. A stall has a post
    // at each end of its canopy however long the canopy is.
    if (!mounted) {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillStyle = skin.shade;
      if (!run.west) {
        // The post's foot, and nothing wider. The generic path lays a shadow the
        // full width of the footprint, which under a canopy is a slab of shade
        // with daylight above it — the shadow of the box this no longer is.
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fillRect(px + 1, base - 1, 3, 2);
        ctx.fillStyle = skin.shade;
        ctx.fillRect(px + 1, base - H, 2, H);
      }
      if (!run.east) {
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fillRect(px + pw - 4, base - 1, 3, 2);
        ctx.fillStyle = skin.shade;
        ctx.fillRect(px + pw - 3, base - H, 2, H);
      }
    }

    // The cloth. Its near edge lands exactly on the tops of the posts.
    //
    // The 1px inset that makes room for the outline is applied ONLY where the run
    // actually ends. Inset on every cell would leave a hairline of roof showing
    // between neighbours and then outline both sides of it, which is a seam ruled
    // down a single sheet of canvas every sixteen pixels.
    const clothTop = py - H;
    // SHORTER WHEN MOUNTED, not lower. The first attempt at clearing the eave
    // simply dropped the whole canopy by its depth, which bought the gap at the
    // top and spent the window: the cloth's lower edge came down over the glass
    // and covered all of it, so the shop lost the thing the awning was there to
    // frame. Trimming the same three pixels off the cloth's DEPTH instead moves
    // the top edge out from under the overhang and leaves the bottom edge
    // exactly where it was — the glass shows the same sliver it always did.
    const clothH = base - py - (mounted ? EAVE : 0);
    const x0 = px + (run.west ? 0 : 1);
    const x1 = px + pw - (run.east ? 0 : 1);
    ctx.fillStyle = CANOPY[skin.id] ?? CANOPY_DEFAULT;
    ctx.fillRect(x0, clothTop + 1, x1 - x0, clothH - 2);

    // THE STRIPES ARE STEPPED OFF THE WORLD, not off the cell. This is the whole
    // of what makes a joined run read as one awning: stepping them from `px` gives
    // every cell an identical little flag, so a three-cell canopy comes out as
    // three two-stripe panels butted together and the repeat lands exactly on the
    // tile grid — the thing CLAUDE.md's band rule exists to forbid. Anchored to
    // the world, the courses run unbroken across the whole sheet and no stripe
    // ever ends on a cell boundary except by coincidence.
    ctx.fillStyle = CANOPY_STRIPE;
    const worldX = ax * TILE;
    for (let i = -(((worldX % 8) + 8) % 8); i < pw; i += 8) {
      const s = Math.max(x0, px + i);
      const e = Math.min(x1, px + i + 4);
      if (e > s) ctx.fillRect(s, clothTop + 1, e - s, clothH - 2);
    }

    // Outlined round the CLOTH ALONE, where the old code outlined the whole
    // silhouette as one rectangle — which is what drew the box's front edges and
    // sold the thing as furniture you could not see past.
    //
    // Top and bottom run the full cell width so they carry across the join; the
    // two vertical ends are drawn ONLY where the run stops, which is the same
    // sentence the wall faces, the ground bevel and the roof courses all obey —
    // the edge belongs where the surface ends, never on every cell of it.
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(px, clothTop, pw, 1);
    ctx.fillRect(px, clothTop + clothH - 1, pw, 1);
    if (!run.west) ctx.fillRect(px, clothTop, 1, clothH);
    if (!run.east) ctx.fillRect(px + pw - 1, clothTop, 1, clothH);
    // A valance along the near edge — the frill a market awning has, and the
    // detail that stops the sheet reading as a slab.
    //
    // FLAT, AND IT STAYS FLAT. A real scalloped hem was drawn here and thrown
    // out: dipping the edge a pixel every four gave a dark dashed band that read
    // as a dirty or chewed-up fringe rather than as a frill, and a matching
    // 2px shade under the far edge (meant to say "this surface leans away")
    // came out as a muddy grey strip laid across the top of the cloth. Both were
    // texture the object is too small to hold — restraint over density, again.
    // What sells the canopy is the stripes and the air underneath it, and neither
    // needed help.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x0, clothTop + clothH - 2, x1 - x0, 1);
  }

  /** A lamp: a timber post with a brass head, and the only object in the game
   *  made of metal.
   *
   *  THE POST TAKES THE FINISH, THE HEAD NEVER DOES. Same rule as the notice
   *  board's paper — a thing is drawn in the piece's finish when it is genuinely
   *  made of that material, and brass isn't pine. It is also the visible half of
   *  a design rule: a metal FINISH would have made appearance cost ore, and
   *  appearance is the free axis (DESIGN §Materials).
   *
   *  Narrow on purpose. It is standing in a corridor a single tile wide, so the
   *  cell it occupies has to still read as floor you walk over — which it is,
   *  since a lamp is never solid (content/furniture.ts). */
  private drawLamp(px: number, baseEdge: number, pw: number, skin: SkinDef): void {
    const ctx = this.ctx;
    const cx = px + Math.floor(pw / 2);
    // STOOD IN THE MIDDLE OF ITS CELL, not on the near edge of it.
    //
    // Everything else in this game stands on the cell's southern edge, and that
    // is right for everything else: a table, a bed, a chest all have a FOOTPRINT,
    // and the near edge is where the front of that footprint is. A lamp has no
    // footprint — it is a post, which is the same fact that took it off the
    // generic path in the first place — so the cell's near edge is not the front
    // of anything, it is just half a tile of daylight between the post and
    // whatever it is meant to be standing beside.
    //
    // On the square that read as the pair by each civic door standing out in the
    // street rather than at the building. Half a tile north puts them where a
    // lamp post goes.
    const base = baseEdge - LAMP_LIFT;
    const headY = base - LAMP_HEAD_H - 4;

    ctx.fillStyle = "rgba(0,0,0,0.18)"; // a small foot's worth of shadow
    ctx.fillRect(cx - 3, base - 1, 6, 2);

    ctx.fillStyle = skin.shade; // base plate, so it isn't a spike in the ground
    ctx.fillRect(cx - 3, base - 3, 6, 3);
    ctx.fillStyle = skin.top;
    ctx.fillRect(cx - 3, base - 3, 6, 1);

    ctx.fillStyle = skin.shade; // the post
    ctx.fillRect(cx - 1, headY + 5, 2, base - headY - 7);
    ctx.fillStyle = skin.color; // one lit edge down it, so it has a round side
    ctx.fillRect(cx - 1, headY + 5, 1, base - headY - 7);

    // The head. Dark casing, warm glass, and a bright core that IS the flame —
    // the pool of light in drawLampGlow leaves from this rectangle, which is
    // what LAMP_HEAD_H keeps in step.
    ctx.fillStyle = BRASS_DARK;
    ctx.fillRect(cx - 4, headY, 8, 7);
    ctx.fillStyle = BRASS;
    ctx.fillRect(cx - 3, headY + 1, 6, 5);
    ctx.fillStyle = FLAME;
    ctx.fillRect(cx - 2, headY + 2, 4, 3);
    ctx.fillStyle = FLAME_CORE;
    ctx.fillRect(cx - 1, headY + 3, 2, 1);
    ctx.fillStyle = BRASS_LIT; // a hood over the top, catching the light
    ctx.fillRect(cx - 4, headY - 1, 8, 1);
  }

  /** The step outside a doorway, laid flat on the ground beside it.
   *
   *  WHY THIS EXISTS, and why it isn't decoration. A door in an east or west
   *  wall used to be invisible, and the two obvious fixes both fail on the
   *  projection: there is no face to cut it into (a north-south run is seen
   *  edge-on, so its face has zero width), and its top surface is covered by
   *  the roof cell of the row in front of it. The only surface still in view
   *  outside a roofed house is the GROUND — so that's where the cue goes.
   *
   *  It reads architecturally rather than as a marker: doors have doorsteps.
   *  And it doubles as the visible form of the doorstep rule (ROADMAP §"A door
   *  needs a south wall and a doorstep") — the cell it lands on is exactly the
   *  cell that has to stay clear for anyone to get in.
   *
   *  Drawn from the GROUND cell looking for adjacent doors, not from the door
   *  looking out, so it costs one lookup per visible tile and stays bounded by
   *  the screen like everything else in this pass. Both perpendicular
   *  neighbours get one: the inside step is under the roof until the cutaway
   *  lifts, which is correct — a threshold has two sides. */
  private drawDoorstep(world: WorldState, tx: number, ty: number, px: number, py: number): void {
    const ctx = this.ctx;
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as [number, number][]) {
      const door = world.build[tileKey(tx + dx, ty + dy)];
      if (!door || door.id !== "door") continue;
      // Only on the door's APPROACH axis. A door in a north-south run is
      // entered from the east or west; one in an east-west run from the north
      // or south. Stepping off the side of a doorway isn't a way in, and a step
      // drawn there would read as a ledge around the whole house.
      const mask = wallMask(world, tx + dx, ty + dy);
      // DELIBERATELY NOT `showsTop`, despite the identical-looking test this
      // used to share with the wall renderer. That one asks "is this wall's face
      // hidden" and answers "yes if anything stands south of it"; this asks "is
      // this door in a north–south run", which genuinely wants run-mates on BOTH
      // sides. They agreed by coincidence and were the same expression, which is
      // how the corner bug hid: fixing the wall rule would silently have moved
      // every doorstep too.
      const inNorthSouthRun = Boolean(mask & CONNECT_N) && Boolean(mask & CONNECT_S);
      if (inNorthSouthRun !== (dy === 0)) continue;

      ctx.fillStyle = STEP_STONE;
      if (dy === 0) {
        // Door to our east or west: the step hugs that edge, running with the
        // doorway rather than across it.
        const sx = dx > 0 ? px + TILE - STEP_DEPTH : px;
        ctx.fillRect(sx, py + STEP_INSET, STEP_DEPTH, TILE - STEP_INSET * 2);
        ctx.fillStyle = STEP_LIP;
        ctx.fillRect(sx, py + TILE - STEP_INSET - 1, STEP_DEPTH, 1);
      } else {
        const sy = dy > 0 ? py + TILE - STEP_DEPTH : py;
        ctx.fillRect(px + STEP_INSET, sy, TILE - STEP_INSET * 2, STEP_DEPTH);
        ctx.fillStyle = STEP_LIP;
        ctx.fillRect(px + STEP_INSET, sy + STEP_DEPTH - 1, TILE - STEP_INSET * 2, 1);
      }
    }
  }

  /** A wall or a door, standing one storey out of its tile.
   *
   *  There is one wall material and the four-neighbour mask decides how it
   *  reads (DESIGN §Structures) — the player never picks a corner piece. The
   *  mask earns its keep most visibly on the CAP: a wall's lit top surface is
   *  drawn only when nothing joins to the north, because a north-south run
   *  stacks one wall's cap over the previous wall's face and you get a ladder
   *  of stripes down the run. Suppressed, the run reads as one continuous
   *  surface with a single top edge where it actually ends.
   *
   *  Night isn't handled here on purpose: the global day/night wash covers the
   *  whole scene, the same way flat tiles are left alone. */
  /** Lay the grain of `skin`'s material over a box already filled with its
   *  colour — floorboards on a floor, planking or masonry on a wall face.
   *
   *  `wx`/`wy` are the box's WORLD pixel origin and are what make this obey the
   *  band rule: two neighbouring tiles ask for the same courses at different
   *  offsets, so a run of them is one continuous surface rather than a repeated
   *  stamp. Passing the box's SCREEN position here instead would grain the
   *  camera rather than the floor, and the boards would slide as you walked.
   *
   *  `axis` and `joint` default to floorboards. A wall face overrides both.
   */
  private drawGrain(
    px: number,
    py: number,
    w: number,
    h: number,
    skin: SkinDef,
    spec: { wx: number; wy: number; axis?: "h" | "v"; jointed?: boolean },
  ): void {
    const g = GRAIN[skin.applies];
    if (!g) return;
    const ctx = this.ctx;
    const seam = mixHex(skin.color, { color: "#000000", amount: g.seam });
    const joint = mixHex(skin.color, { color: "#000000", amount: g.joint_ink });
    forEachGrainMark(
      {
        wx: spec.wx,
        wy: spec.wy,
        w,
        h,
        axis: spec.axis ?? "h",
        course: g.course,
        joint: spec.jointed === false ? null : g.joint,
        bond: g.bond,
      },
      (mx, my, mw, mh, ink) => {
        ctx.fillStyle = ink === "seam" ? seam : joint;
        ctx.fillRect(px + mx, py + my, mw, mh);
      },
    );
  }

  /** Cut courses into a tile of GENERATED ground, inked off its own colour.
   *
   *  The sibling of `drawGrain`, and deliberately not a branch inside it: that
   *  one takes a `SkinDef` and inks from `skin.color`, because everything it
   *  draws is a surface somebody chose a finish for. Terrain has no finish. The
   *  periods are the shared thing and they come from the same `GRAIN` table, so
   *  a plaza flagstone and a floor flagstone are cut to the same size — which is
   *  the entire claim being made, that somebody laid this square.
   *
   *  `jointed` is unconditional here, unlike the floor's: the one-tile-wide case
   *  the floor has to guard against (a jetty, where a butt joint is a nick in a
   *  plank that has nothing to butt against) cannot arise on generated paving,
   *  which is always a field. */

  /** The town square, drawn as ONE composition in world pixels and clipped to
   *  whichever tile is being painted. Not `drawPaving`: the border is a 10px
   *  band, so a tile on the edge holds border AND field, and a per-tile grain
   *  swap cannot split a tile. Every mark is keyed to the plaza rectangle —
   *  where the SQUARE is, never where the tile is — so the composition cannot
   *  band however it is cut into cells. See the constants above for the sketch
   *  this scales.
   *
   *  Only seams are drawn, all in one ink. The stones are the paving colour the
   *  flat fill already laid; a border tinted its own shade was tried in an
   *  earlier round and read as trim rather than as stone. */
  private drawPlazaPaving(px: number, py: number, tx: number, ty: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = mixHex(color, { color: "#000000", amount: 0.14 });
    const tx0 = tx * TILE;
    const ty0 = ty * TILE;
    /** A seam in world px, clipped to this tile. */
    const mark = (wx: number, wy: number, ww: number, wh: number) => {
      const x0 = Math.max(wx, tx0);
      const x1 = Math.min(wx + ww, tx0 + TILE);
      const y0 = Math.max(wy, ty0);
      const y1 = Math.min(wy + wh, ty0 + TILE);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.fillRect(px + (x0 - tx0), py + (y0 - ty0), x1 - x0, y1 - y0);
    };

    const B = PLAZA_BORDER;
    const X0 = PLAZA.x0 * TILE;
    const Y0 = PLAZA.y0 * TILE;
    const X1 = (PLAZA.x1 + 1) * TILE;
    const Y1 = (PLAZA.y1 + 1) * TILE;
    const W = X1 - X0;

    // The ring between border and field. The HORIZONTAL pair runs the full
    // width of the square rather than stopping at the field — inside the border
    // band that extra reach is the seam between the corner stone and the side
    // run below it, which is what makes the corners read as part of the top and
    // bottom courses. Without it the corner fused into the side's first stone
    // (found by looking, on the round that was otherwise right).
    mark(X0, Y0 + B - 1, W, 1);
    mark(X0, Y1 - B, W, 1);
    mark(X0 + B - 1, Y0 + B - 1, 1, Y1 - Y0 - 2 * B + 2);
    mark(X1 - B, Y0 + B - 1, 1, Y1 - Y0 - 2 * B + 2);

    // Border joints. Top and bottom: five stones, joints at fifths of the full
    // width (176/5 = 35.2, rounded per joint — the remainder lands in the last
    // stone). The runs pass through the corners; the sides butt into them.
    for (let k = 1; k < 5; k++) {
      const jx = X0 + Math.round((W * k) / 5);
      mark(jx, Y0, 1, B - 1);
      mark(jx, Y1 - B + 1, 1, B - 1);
    }
    // The sides: three stones in the 108px between the bands, 36 each, exact.
    for (let k = 1; k < 3; k++) {
      const jy = Y0 + B + k * PLAZA_SIDE_STONE;
      mark(X0, jy, B - 1, 1);
      mark(X1 - B + 1, jy, B - 1, 1);
    }

    // The field: six by four pavers, 26x27, from the ring inward.
    for (let k = 1; k < 6; k++) {
      mark(X0 + B + k * PLAZA_PAVER_W, Y0 + B, 1, Y1 - Y0 - 2 * B);
    }
    for (let k = 1; k < 4; k++) {
      mark(X0 + B, Y0 + B + k * PLAZA_PAVER_H, W - 2 * B, 1);
    }
  }

  private drawPaving(
    px: number,
    py: number,
    tx: number,
    ty: number,
    g: { course: number; joint: number; bond: number; seam: number; joint_ink: number } | null,
    color: string,
  ): void {
    if (!g) return;
    const ctx = this.ctx;
    const seam = mixHex(color, { color: "#000000", amount: g.seam });
    const joint = mixHex(color, { color: "#000000", amount: g.joint_ink });
    forEachGrainMark(
      {
        // The WORLD pixel, not the screen pixel. Passing the screen position
        // graining the camera instead of the ground is the mistake drawGrain's
        // docblock warns about, and on a surface you walk across it shows up as
        // the paving sliding under your feet.
        wx: tx * TILE,
        wy: ty * TILE,
        w: TILE,
        h: TILE,
        axis: "h",
        course: g.course,
        joint: g.joint,
        bond: g.bond,
      },
      (mx, my, mw, mh, ink) => {
        ctx.fillStyle = ink === "seam" ? seam : joint;
        ctx.fillRect(px + mx, py + my, mw, mh);
      },
    );
  }

  /** A fence: posts and rails, knee high.
   *
   *  ITS OWN PATH RATHER THAN A SHORT WALL, and the drawing is where that pays
   *  off rather than where it costs. A wall is a MASS — a face you look at, a cap
   *  you look across, a grain on both. A fence is a LINE with air behind it, and
   *  the only things in it are the rail and the posts. Rendered as a 6px wall it
   *  came out as a kerb.
   *
   *  THE RAIL IS STEPPED OFF THE WORLD, NOT THE CELL (`px` is already a world
   *  position, and the rail spans the full tile with no end caps), so a run reads
   *  as one continuous rail rather than as a row of little hurdles butted
   *  together. That is CLAUDE.md's per-cell edges rule, and a fence is the most
   *  obvious place in the game to get it wrong: the thing IS repetitive, so a
   *  per-cell edge disappears into the repetition and stripes it anyway.
   *
   *  THE POSTS ARE THE EXCEPTION AND THEY ARE DELIBERATE BANDING — the tent's
   *  stripes, one object over. But not one per cell: at 16px to a tile that is a
   *  picket every 16 pixels, which reads as a palisade. Every SECOND world column
   *  (or row), measured off the world coordinate so the spacing carries across
   *  cells, plus one at every end and corner — which is where a real fence puts
   *  its posts, because that is where the load is. */
  private drawFence(world: WorldState, tx: number, ty: number, cell: BuildCell): void {
    const ctx = this.ctx;
    const skin = skinDef(cell.finish);
    const mask = fenceMask(world, tx, ty);
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    const top = base - FENCE_H;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;

    // Contact shadow at the foot, on every cell: a fence stands ON the ground
    // rather than being part of it, and unlike a wall's there is no cell in
    // front to hide it. One flat 1px line, so a run gets one shadow and not a
    // dotted one.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(px, base, TILE, 1);

    const ew = (mask & CONNECT_E) !== 0 || (mask & CONNECT_W) !== 0;
    const ns = (mask & CONNECT_N) !== 0 || (mask & CONNECT_S) !== 0;
    // A lone post with nothing either side still gets an east-west rail, so a
    // single fence cell reads as a piece of fence rather than as a bollard.
    const rails = ew || !ns;
    const corner = ns && ew;

    if (rails) {
      // Two rails across the whole cell, top and middle. Full width and no end
      // cap — see the note above.
      for (const ry of [top, top + FENCE_RAIL_GAP]) {
        ctx.fillStyle = skin.color;
        ctx.fillRect(px, ry, TILE, FENCE_RAIL);
        ctx.fillStyle = skin.shade;
        ctx.fillRect(px, ry + FENCE_RAIL, TILE, 1);
      }
    }
    if (ns) {
      // A run travelling away from the camera is seen nearly edge-on: the rails
      // foreshorten into a single line and what stands out of it are the posts.
      //
      // THE RAIL SPANS THE WHOLE TILE HEIGHT, and that is the whole fix rather
      // than a detail. Drawn at FENCE_H — the height of the thing rather than
      // the depth of the cell — consecutive posts leave a seven-pixel gap
      // between them and a fence line running north photographs as a column of
      // tally marks. A full-tile band butts exactly against its neighbour's, so
      // the run reads as one rail with posts ON it.
      const cx = px + (TILE - FENCE_RAIL) / 2;
      ctx.fillStyle = skin.color;
      ctx.fillRect(cx, top, FENCE_RAIL, TILE);
      ctx.fillStyle = skin.shade;
      ctx.fillRect(cx + FENCE_RAIL - 1, top, 1, TILE);
      // Posts on it, every second world ROW and at both ends — the same spacing
      // rule the east-west run uses, on the other axis.
      const endNS = !(mask & CONNECT_N) || !(mask & CONNECT_S);
      if (corner || endNS || ty % 2 === 0) {
        const bx = px + (TILE - FENCE_POST - 1) / 2;
        ctx.fillStyle = skin.color;
        ctx.fillRect(bx, top + 4, FENCE_POST + 1, FENCE_H - 1);
        ctx.fillStyle = skin.shade;
        ctx.fillRect(bx + FENCE_POST, top + 4, 1, FENCE_H - 1);
      }
    }

    // Posts. Every second world column, plus every end and every corner.
    const end = !ew || !(mask & CONNECT_E) || !(mask & CONNECT_W);
    if (rails && (corner || end || tx % 2 === 0)) {
      const cx = px + (TILE - FENCE_POST) / 2;
      ctx.fillStyle = skin.color;
      ctx.fillRect(cx, top - 1, FENCE_POST, FENCE_H + 1);
      ctx.fillStyle = skin.shade;
      ctx.fillRect(cx + FENCE_POST - 1, top - 1, 1, FENCE_H + 1);
    }

    ctx.globalAlpha = prev;
  }

  private drawWall(world: WorldState, tx: number, ty: number, cell: BuildCell): void {
    const ctx = this.ctx;
    // The shell — face, cap, grain, corners — is the WALL's material. `leaf` is
    // the door's own, and reaches only the frame around the opening.
    const skin = skinDef(shellFinish(world, tx, ty) ?? cell.finish);
    const leaf = skinDef(cell.finish);
    const mask = wallMask(world, tx, ty);
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    const top = base - STOREY;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, STOREY);

    // Contact shadow, only at the front of a run — inside a run the wall in
    // front covers it anyway, and drawing it regardless bands the run.
    if (!(mask & CONNECT_S)) {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(px, base, TILE, 2);
    }

    // Whether this wall shows its top surface instead of its face. The rule and
    // the argument for it live in sim/structures.ts, with its tests — it is a
    // claim about the build layer's geometry, not about drawing.
    //
    // Consecutive cells' bands are exactly TILE apart, so a run of tops joins
    // into one seamless strip.
    const sideOn = showsTop(mask);
    if (sideOn) {
      // Flat, with no per-cell bottom edge: a side run is one continuous
      // surface, and an edge drawn on every cell stripes it exactly the way
      // the tile bevel used to stripe open ground.
      ctx.fillStyle = skin.top;
      ctx.fillRect(px, top, TILE, TILE);
      // AND IT STAYS FLAT — no grain on a side run, deliberately.
      //
      // It was grained first, as boards running north–south along the run, and
      // that is the correct answer to the wrong question. The side cap is the
      // one part of a house you see from ABOVE, so a texture there is a third
      // one competing with the face and the floor across a single object, and
      // what should read as a solid mass of wall reads as a mashup of surfaces.
      // Flat, it holds the two grained surfaces together and the house reads as
      // a structure rather than as three materials meeting.
      //
      // The general rule, worth having: grain the surfaces the player looks AT,
      // and leave the ones they look ACROSS alone. This is the same instinct
      // that keeps the bevel at material boundaries only (see the ground pass) —
      // texture where it says something, nowhere it merely fills.
      //
      // (Grained ACROSS the run, the earlier bug, it was worse than either: 16px
      // boards butting at every cell edge, which photographed as a brick course
      // down each side of the house. That was the band rule getting in through
      // the joints rather than the seams. Both roads led back here.)
    } else {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px, top, TILE, STOREY);
      // The face, below its cap. Wood is PLANKING STOOD ON END — vertical
      // boards, one per storey, so no butt joints; stone is masonry, which is
      // horizontal courses with joints like a floor. That difference is most of
      // what makes a stone wall read as stone at this size, more than the
      // colour does.
      //
      // `wy` is the offset within the FACE, not the world row, and deliberately:
      // every wall in the game stands the same height, so measuring the courses
      // from the ground means a run's courses line up with its neighbours'
      // instead of stepping with the terrain behind it.
      const stone = skin.applies === "stone";
      this.drawGrain(px, top + WALL_CAP, TILE, STOREY - WALL_CAP, skin, {
        wx: tx * TILE,
        wy: WALL_CAP,
        axis: stone ? "h" : "v",
        jointed: stone,
      });
      if (!(mask & CONNECT_N)) {
        ctx.fillStyle = skin.top;
        ctx.fillRect(px, top, TILE, WALL_CAP);
      }
    }
    // Vertical edges where the run stops, so a wall end reads as a corner
    // rather than as paint that happens to finish.
    if (!sideOn) {
      ctx.fillStyle = skin.shade;
      if (!(mask & CONNECT_W)) ctx.fillRect(px, top, 1, STOREY);
      if (!(mask & CONNECT_E)) ctx.fillRect(px + TILE - 1, top, 1, STOREY);
      if (!(mask & CONNECT_S)) ctx.fillRect(px, base - 1, TILE, 1);
    }

    if (isWindow(cell.id)) {
      this.drawWindow(world, tx, ty, px, top, base, sideOn, leaf, skin, cell.id);
    }

    if (cell.id === "barn_doors") this.drawBarnDoors(px, top, base, sideOn);
    if (cell.id === "banner") this.drawBanner(px, top, base, sideOn);

    if (cell.id === "door") {
      // The frame first, in the DOOR's own finish, then the opening cut out of
      // it. This is what keeps a door's finish meaningful now that the shell
      // around it belongs to the wall: without a frame the wood would paint
      // nothing at all, since the opening itself is a hole and holes have no
      // material. It is also what structures.ts describes a door as — "a made
      // object rather than a surface… the one part of a wall you touch" — set
      // into whatever the wall happens to be built of.
      const frame = (x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = leaf.color;
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = leaf.top;
        ctx.fillRect(x - 1, y - 1, w + 2, 1); // the lit head of the frame
        ctx.fillStyle = "#3a2620";
        ctx.fillRect(x, y, w, h);
      };
      if (sideOn) {
        // A door in a SIDE run. The run shows its top surface, not its face, so
        // there is no face to cut a doorway into — which is why a door on an
        // east or west wall used to render as nothing at all, leaving a house
        // you could walk into but couldn't see the way into. Phase 3 judges
        // houses the player built, so it had to stop being true.
        //
        // Read it as a gap in the top surface instead: the run's band is the
        // wall seen from above, so the opening spans the full THICKNESS (x) and
        // is inset in y, leaving a jamb of wall at each side of the doorway.
        // Inset by one at each end, so the frame it carries stays inside the
        // run's own band instead of overhanging the cell into its neighbours.
        frame(px + 1, top + DOOR_JAMB, TILE - 2, TILE - DOOR_JAMB * 2);
      } else {
        // A hole in the wall, with the wall carried over it as a lintel — so a
        // doorway reads as cut INTO a run rather than as a gap in it.
        //
        // ADJACENT DOORS MERGE, exactly as sashes do (§drawWindow) and for the
        // identical reason: two cells each drawing their own jambs is two little
        // doorways with eight pixels of frame between them, which is a pair of
        // doors and not an entrance. The museum's is two cells wide
        // (content/town.ts §doorW) and has to read as one opening.
        const merges = (dx: number) => world.build[tileKey(tx + dx, ty)]?.id === "door";
        const openW = merges(-1);
        const openE = merges(1);
        // A WIDER JAMB ON A WIDE DOORWAY. A single door is inset 4px in its cell,
        // which leaves 8px of opening — and two cells at that inset leave 24,
        // which is three times the dark on a façade that has nothing else dark on
        // it at all. Six pixels of jamb brings each leaf back to about the width
        // every other door in town has, so the entrance is grander because there
        // are TWO of them rather than because the hole is enormous.
        const jamb = openW || openE ? 6 : 4;
        const x0 = px + (openW ? 0 : jamb);
        const x1 = px + TILE - (openE ? 0 : jamb);
        const y0 = top + WALL_CAP + 3;
        const h = STOREY - WALL_CAP - 3;
        // The frame, drawn only where the opening actually ends — the same
        // compare-against-the-neighbour rule the whole renderer runs on. The head
        // carries straight across the join; the stiles stop at the run's ends.
        ctx.fillStyle = leaf.color;
        ctx.fillRect(x0 - (openW ? 0 : 1), y0 - 1, x1 - x0 + (openW ? 0 : 1) + (openE ? 0 : 1), h + 2);
        ctx.fillStyle = leaf.top;
        ctx.fillRect(x0 - (openW ? 0 : 1), y0 - 1, x1 - x0 + (openW ? 0 : 1) + (openE ? 0 : 1), 1);
        // THE OPENING WARMS WHEN SOMEBODY IS IN IT. A doorway is a hole, and a
        // hole is drawn dark; but a hole with a creature in it is a hole with
        // the inside of a room behind them, and the inside of a room is lit.
        // One colour, no animation and no state — it is true while they are
        // there and false the moment they step off, so it reads as the door
        // being USED rather than as a light being switched on.
        ctx.fillStyle = this.doorBusy.has(tileKey(tx, ty)) ? "#6b4a33" : "#3a2620";
        ctx.fillRect(x0, y0, x1 - x0, h);
        // A MEETING STILE down the middle of a merged pair, and it has to be a
        // POST rather than a line. This is the one thing that keeps a wide
        // doorway from going ominous, which is exactly what a 1px version of it
        // did: every door in this game is drawn as a dark opening, which reads as
        // a doorway at one cell wide and as a CAVE MOUTH at two — 24px of
        // near-black on a pale marble front, with a hairline down it that did
        // nothing to break up the mass.
        //
        // Two pixels of lit timber, straddling the boundary, splits it into two
        // openings of about the width every other door in town has. Nothing else
        // changed: the leaves are still holes, the head and jambs still run
        // round the outside, and a museum still has the biggest entrance here.
        // It just stops looking like something is going to come out of it.
        if (openW) {
          ctx.fillStyle = leaf.color;
          ctx.fillRect(px - 1, y0, 2, h);
          ctx.fillStyle = leaf.top; // the light down its west face, as everywhere
          ctx.fillRect(px - 1, y0, 1, h);
        }
      }
    }

    ctx.globalAlpha = prev;
  }

  /** Is this cell under a roof that is currently drawn solid? Used to keep
   *  indoor light indoors; the threshold is the fade, not a boolean, so the
   *  answer changes smoothly as the cutaway opens. */
  private underSolidRoof(tx: number, ty: number): boolean {
    const room = this.roofIndex.get(tileKey(tx, ty));
    if (!room) return false;
    return (this.roofAlpha.get(room.id) ?? 1) > 0.6;
  }

  /** The light a lit window throws onto the ground outside it.
   *
   *  Half a lamp's reach and a third of its strength, on purpose. A window is
   *  not a source — it is a lamp seen through glass, one wall further away — and
   *  a room with three windows would otherwise light its whole street brighter
   *  than the lamp actually doing it. The pool also sits SOUTH of the cell,
   *  because the face the glass is cut into looks that way and light does not
   *  come out of the back of a wall.
   *
   *  Additive, through the same "lighter" pass the lamps use, so a window under
   *  a lamp's own pool adds to it rather than washing a pale rectangle over it. */
  private drawWindowGlow(strength: number): void {
    if (this.litWindows.length === 0) return;
    const ctx = this.ctx;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    const r = (LAMP_GLOW_R * TILE) / 2;
    for (const w of this.litWindows) {
      const cx = this.sceneX(w.x);
      const cy = this.sceneY(w.y) + TILE / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,196,110,${(LAMP_GLOW * strength * 0.34).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,160,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // AND THE GLASS ITSELF, brightened back through the wash it just went
      // under. This is the lamp's own lesson one object along: the night overlay
      // falls over the window's art like everything else, so a pane painted warm
      // during the wall pass came out a muddy tan barely distinguishable from
      // the planks around it — a lit window that did not read as lit. A source
      // has to be the brightest thing in its own light, and from outside, the
      // window IS the source.
      ctx.fillStyle = `rgba(255,206,132,${(0.5 * strength).toFixed(3)})`;
      ctx.fillRect(w.gx, w.gy, w.gw, w.gh);
    }
    ctx.globalCompositeOperation = prev;
  }

  /** A pair of barn doors PAINTED on a wall — an outlined panel with a batten
   *  cross through it (content/structures.ts §barn_doors).
   *
   *  NOTHING IS CUT. This runs AFTER the wall face is drawn and adds marks on top
   *  of it, which is the whole difference between this and every other thing in
   *  a wall: a door is a hole with a frame, a sash is a hole with glass, and this
   *  is paint. So it takes no finish of its own and asks nothing of the shell —
   *  the ox-blood runs straight under it, which is what makes it read as the
   *  barn's own face rather than as a panel screwed to it.
   *
   *  Two of these side by side are two doors, not one wide one: the merge rule
   *  that runs a gallery's sashes together is exactly wrong here, and the reason
   *  a barn's front reads as leaves. So there is no neighbour test in this
   *  method at all.
   *
   *  ONE PIXEL, LIME-WHITE, AND NOT PURE WHITE. `#fff` against ox-blood glares at
   *  midday and at night comes through the wash brighter than the lamps, which
   *  makes a painted line read as a light source. This is whitewash, which is
   *  what the marks would actually be. */
  /** A cloth banner hung flat on a wall.
   *
   *  THE SECOND MARKING IN THE GAME, after the barn's painted doors, and it obeys
   *  that piece's rules: the wall behind it is untouched, nothing opens, and the
   *  masonry reads as continuing past it rather than being framed by it.
   *
   *  HUNG FROM A RAIL AND SHORT OF THE GROUND, which is the whole of what makes
   *  it cloth rather than a painted panel. A rectangle running the full height of
   *  the face is a door or a sign; a banner starts under the wall's cap and stops
   *  well above the sill, so there is wall visible above and below it and it
   *  reads as something somebody hung there this morning.
   *
   *  NO LETTERING, NO DEVICE. At eleven pixels wide any mark is three pixels of
   *  mud, and the town's one heraldic object is the flag over the hall — which
   *  earned its carrot by being the thing the whole town is filed under. A museum
   *  banner is a colour, and the colour is the announcement. */
  private drawBanner(px: number, top: number, base: number, sideOn: boolean): void {
    const ctx = this.ctx;
    if (sideOn) {
      // A side run shows the top of the wall, so what is visible of a banner
      // hung on its far face is the rail it hangs from. One line, like the barn
      // doors' head, and for the identical reason: the cloth itself is on a face
      // that is not in view, and drawing it up here would lay it on the roof of
      // the wall.
      ctx.fillStyle = BANNER_SHADE;
      ctx.fillRect(px + 4, top + 5, TILE - 8, 1);
      return;
    }

    // NARROW, AND THAT IS THE WHOLE OF WHETHER THIS READS AS A BANNER. At ten
    // pixels wide on a face only twenty-odd tall it came out very nearly square,
    // and a square of cloth on a wall is a SIGN. A hanging is longer than it is
    // wide — that proportion is the object. Six pixels against a drop of about
    // fourteen is the tallest it can be made without leaving the cell.
    const x0 = px + 5;
    const w = TILE - 10;
    const y0 = top + WALL_CAP + 1;
    const h = base - 4 - y0;

    // The rail, in the shade so it reads as the thing carrying the weight, and
    // proud of the cloth at both ends the way a real one is.
    ctx.fillStyle = BANNER_SHADE;
    ctx.fillRect(x0 - 2, y0, w + 4, 1);
    // The cloth.
    ctx.fillStyle = BANNER_CLOTH;
    ctx.fillRect(x0, y0 + 1, w, h);
    // AND NOTHING PRINTED ON IT. A fold was drawn down one side first — one pixel
    // of shade, meant to stop a flat rectangle reading as a painted patch — and
    // at this width it did not read as a crease, it cut the cloth into two
    // panels and made each banner look like a little flag on a pole. Restraint
    // over texture: six pixels of colour cannot carry a detail, and it does not
    // need one. The rail above it and the hem below are what say cloth.
    ctx.fillStyle = BANNER_SHADE;
    ctx.fillRect(x0, y0 + h, w, 1);
  }

  private drawBarnDoors(px: number, top: number, base: number, sideOn: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = BARN_PAINT;

    if (sideOn) {
      // A SIDE RUN HAS NO FACE, and unlike a window there is no opening here to
      // suggest — what you are looking at is the top of a wall with paint on the
      // far side of it. So: the head of the doors seen from above, one line
      // inset in the run's band, and no cross. Drawing the X up here would paint
      // it on the roof of the wall, which is where it is not.
      ctx.fillRect(px + 3, top + 5, TILE - 6, 1);
      ctx.fillRect(px + 3, top + TILE - 6, TILE - 6, 1);
      return;
    }

    // The panel: most of the face, held off the wall's own corners so the
    // masonry reads as continuing past it rather than being framed by it.
    const x0 = px + 2;
    const y0 = top + WALL_CAP + 2;
    const w = TILE - 4;
    const h = base - 1 - y0;
    ctx.fillRect(x0, y0, w, 1);
    ctx.fillRect(x0, y0 + h - 1, w, 1);
    ctx.fillRect(x0, y0, 1, h);
    ctx.fillRect(x0 + w - 1, y0, 1, h);

    // THE X, stepped a pixel at a time rather than drawn with a rotation. A
    // transform here would resample the wall's own pixels off the grid, which
    // CLAUDE.md forbids outright — and at this size a stepped diagonal IS the
    // line, since the alternative is an anti-aliased smear two pixels wide.
    //
    // ONE PIXEL PER ROW, walked down the LONGER axis. Stepping the short axis
    // instead — or rounding a t that does not start at 0 — puts two pixels side
    // by side on some rows and none on others, and the batten comes out as a
    // stroke with a kink in it. It was drawn that way first and photographed as
    // a bowtie: vertical stubs at the top, a chunky knot in the middle.
    //
    // Inset TWO from the panel, so the ends stop a clear pixel inside the
    // outline. Landing on it would thicken the corners and read as a frame with
    // something wrong with it rather than as boards nailed across a door.
    const ix = x0 + 2;
    const iy = y0 + 2;
    const iw = w - 4;
    const ih = h - 4;
    for (let j = 0; j < ih; j++) {
      const dx = Math.round((j * (iw - 1)) / (ih - 1));
      ctx.fillRect(ix + dx, iy + j, 1, 1);
      ctx.fillRect(ix + iw - 1 - dx, iy + j, 1, 1);
    }
  }

  /** A window: an opening cut into a wall face, with glass in it.
   *
   *  A RUN OF WINDOWS IS ONE WINDOW. This is the per-cell edges rule (CLAUDE.md)
   *  in its fifth disguise and the reason this method takes its neighbours: three
   *  adjacent window cells each drawing their own jambs is a row of three little
   *  windows, which is a barracks. Drawn as one opening with mullions between the
   *  panes, it is a gallery — and "the museum looks like a jail" is precisely the
   *  difference between those two pictures.
   *
   *  The same answer `content/town.ts` already gives for the museum's display
   *  cases ("cells in the same ROW render as one continuous case"), which is the
   *  nearest thing in the codebase to this problem.
   *
   *  ONE METHOD FOR FOUR SASHES, and the four differ in exactly two numbers —
   *  where the opening starts and where it stops — plus whether they merge and
   *  whether they carry muntins. Everything else about a window is the same
   *  window: the glass, the rake, the frame, the sill, the drip course, the lit
   *  pane pushed to the glow pass. Four copies of that would be four places to
   *  fix the next thing a screenshot finds, and it has already found five.
   */
  private drawWindow(
    world: WorldState,
    tx: number,
    ty: number,
    px: number,
    top: number,
    base: number,
    sideOn: boolean,
    leaf: SkinDef,
    shell: SkinDef,
    sash: StructureId,
  ): void {
    const ctx = this.ctx;
    // MERGES WITH ITS OWN KIND ONLY. A run of transoms is one long transom, and
    // a paned sash beside a plain one is two windows that happen to be adjacent
    // — which is true, and is what the player asked for by placing two different
    // things. Matching on "is a window" instead would have run a plain opening
    // straight into a paned one and left the muntins stopping in mid-air at the
    // cell boundary.
    //
    // A NARROW SASH NEVER MERGES, and that is the whole of what makes it narrow.
    // Two side by side are two slits with wall between them — a colonnade, which
    // is the shape you reach for one for. Merging them would produce a plain
    // window spread over two cells and quietly delete the tool.
    const narrow = sash === "window_narrow";
    const paned = sash === "window_paned";
    const transom = sash === "window_transom";
    // PLATE GLASS DROPS THE MULLION TOO, which is the only thing that separates
    // it from the plain window and is the whole reason it exists. Every other
    // sash posts a bar at each cell boundary it merges across — correct for
    // joinery, wrong for a gallery, where what you are looking at is one sheet of
    // glass that happens to be four cells long.
    const plate = sash === "window_plate";
    const mergesWith = (dx: number) =>
      !narrow && world.build[tileKey(tx + dx, ty)]?.id === sash;

    // Is the room behind this glass lit, and is it dark enough outside to tell?
    // Both, or the pane stays sky-coloured: a warm window at noon reads as
    // orange paint, not as a lamp.
    const room = this.roofIndex.get(tileKey(tx, ty));
    const lit = Boolean(room && this.roomLit.get(room.id)) && this.darkness > 0.12;

    if (sideOn) {
      // A window in a SIDE run has no face to cut into — the same geometry
      // problem the door has, and it gets a quieter version of the door's
      // answer. Not a full gap: a doorway in a side wall must be findable
      // because you have to walk through it, and a window must not be mistaken
      // for one. A thin bright band inset in the run's top surface says "there
      // is an opening here" without saying "come in".
      //
      // ALL FOUR SASHES GET THE SAME BAND, which is not laziness. Side-on there
      // is no face and therefore no shape to tell apart: what you are looking at
      // is the top of a wall with a gap in it, and a transom and a tall sash
      // present the same gap from above. Drawing four different bands here would
      // be inventing a distinction the geometry does not have.
      ctx.fillStyle = lit ? GLASS_WARM : GLASS;
      ctx.fillRect(px + 3, top + 5, TILE - 6, TILE - 10);
      ctx.fillStyle = leaf.color;
      ctx.fillRect(px + 3, top + 4, TILE - 6, 1);
      ctx.fillRect(px + 3, top + TILE - 5, TILE - 6, 1);
      return;
    }

    // The opening runs to the cell edge wherever a window continues, and stops
    // short of it wherever the run ends. That single pair of booleans is what
    // merges neighbours into one window.
    const openW = mergesWith(-1);
    const openE = mergesWith(1);
    // A narrow sash is inset to a SLIT — six px of masonry either side of a four
    // px opening on a sixteen px cell. Wider than that and it is just a window
    // that forgot to merge; narrower and the frame has nothing to hold.
    const inset = narrow ? 6 : 3;
    const x0 = px + (openW ? 0 : inset);
    const x1 = px + TILE - (openE ? 0 : inset);
    // A TRANSOM STOPS HIGH. Its whole claim is that it is above eye level — a
    // band of light over a door or a shelf, not something you look out of — so
    // it keeps the head where every other sash has it and brings the sill up to
    // just under a third of the way down the face. Five px of glass: enough to
    // read as an opening at this scale, little enough that it never reads as a
    // window somebody built badly.
    const y0 = top + WALL_CAP + 3;
    const y1 = transom ? y0 + 5 : base - 5;

    // The glass. Cool and sky-coloured by day — a window you cannot see through
    // reads as a hole, and one you CAN see through would need an interior, so
    // what it shows instead is the sky it reflects.
    ctx.fillStyle = lit ? GLASS_WARM : GLASS;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // ONLY IF THE FACE IS ACTUALLY IN VIEW, and that is not the same question as
    // "is the room lit". The glow pass runs after everything (drawLampGlow), so
    // a pane pushed here gets repainted over whatever stands in front of it —
    // and the face of a BACK wall stands behind its own room's roof. A roof cell
    // is lifted a storey, so the cell that covers a wall's face is the one to
    // its SOUTH; on a north wall that cell is the room's own interior. Lit back
    // windows came out as warm patches floating on the shingles, twice: the pane
    // rectangle and the pool it throws.
    //
    // The same test the lamps take (see `underSolidRoof` at the furniture pass),
    // one cell along, and for the same reason — it is the roof's own fade rather
    // than a boolean, so walking indoors brings the back windows up as the
    // cutaway opens instead of switching them on.
    if (lit && !this.underSolidRoof(tx, ty + 1)) {
      this.litWindows.push({ x: tx, y: ty, gx: x0, gy: y0, gw: x1 - x0, gh: y1 - y0 });
    }
    // A rake of brighter glass, stepped off the WORLD column so a long run gets
    // one continuous diagonal across it rather than the same highlight stamped
    // in every cell — the band rule again, at pane scale.
    //
    // THE PERIOD IS THE WHOLE OF IT. Wrapped against the pane's own HEIGHT the
    // streak restarted every six pixels and photographed as hatching — glass
    // that looked scratched rather than shiny. Forty world px is about two and a
    // half cells, so a two-cell window carries one rake and a long gallery gets
    // a few, evenly, and neither of them agrees with the tile grid.
    const paneH = y1 - y0;
    ctx.fillStyle = lit ? GLASS_WARM_LIT : GLASS_LIT;
    for (let i = 0; i < x1 - x0; i++) {
      const wx = tx * TILE + (x0 + i - px);
      const t = (((wx % GLASS_RAKE) + GLASS_RAKE) % GLASS_RAKE) / GLASS_RAKE;
      // `paneH - 2` keeps the 2px-tall mark off the sill at the bottom of its
      // travel; without it the last column of each rake paints over the ledge.
      ctx.fillRect(x0 + i, y0 + Math.floor(t * (paneH - 2)), 1, 2);
    }

    // THE MUNTINS, which are the whole of what a paned sash is: the same opening,
    // divided.
    //
    // Stepped off the WORLD column exactly as the rake is, and for the identical
    // reason — bars measured from the cell edge would put one at the same offset
    // in every cell, which is the per-cell edges rule in the disguise it wears
    // best. Eight world px is half a tile, so an unmerged sash carries one bar
    // and a long run carries them evenly straight across the mullions.
    //
    // Skipped on the transom, which is five px of glass and would come out as a
    // row of dots, and on the narrow sash, which is four px wide and is already
    // one pane.
    if (paned) {
      ctx.fillStyle = leaf.shade;
      for (let i = 0; i < x1 - x0; i++) {
        const wx = tx * TILE + (x0 + i - px);
        // Never on the very edge of the opening: a bar hard against the jamb is
        // a thick frame, not a division, and at the merged edge it would double
        // the mullion the run already draws.
        if ((((wx % MUNTIN) + MUNTIN) % MUNTIN) !== 0) continue;
        if (x0 + i <= x0 || x0 + i >= x1 - 1) continue;
        ctx.fillRect(x0 + i, y0, 1, paneH);
      }
      // And one across, at the height a sash bar actually sits — above centre,
      // so the lower lights are the tall ones. Drawn as a single rect over the
      // whole opening rather than per column, so it runs unbroken through the
      // mullions of a merged run.
      ctx.fillRect(x0, y0 + Math.round(paneH * 0.42), x1 - x0, 1);
    }

    // The frame, in the WINDOW's own finish — the same division of labour a door
    // has, and the reason a wooden sash can sit in a marble wall without
    // painting the wall pine (see shellFinish).
    ctx.fillStyle = leaf.color;
    ctx.fillRect(x0, y0 - 1, x1 - x0, 1); // head
    ctx.fillStyle = leaf.top;
    ctx.fillRect(x0, y1, x1 - x0, 2); // the sill, catching the light
    if (!openW) ctx.fillRect(x0 - 1, y0 - 1, 1, y1 - y0 + 2);
    if (!openE) ctx.fillRect(x1, y0 - 1, 1, y1 - y0 + 2);
    // The mullion between two panes. Drawn on the WEST edge only, so a shared
    // boundary gets exactly one bar rather than two cells each drawing their own
    // and doubling it into a post.
    //
    // And never on plate glass, which is the sash's entire definition. Note what
    // this leaves behind: the head, the sill and the drip course still run the
    // full length uninterrupted, so a plate run is one long opening with a frame
    // round the outside and nothing at all crossing it.
    if (openW && !plate) {
      ctx.fillStyle = leaf.shade;
      ctx.fillRect(px, y0, 1, y1 - y0);
    }
    // A drip course under the sill, in the WALL's material — the little ledge
    // that tells you the opening is set into something thick. Skipped where the
    // run continues, or it would band along the bottom of a long window.
    ctx.fillStyle = shell.shade;
    ctx.fillRect(x0 - (openW ? 0 : 1), y1 + 2, x1 - x0 + (openW ? 0 : 1) + (openE ? 0 : 1), 1);
  }

  /** The contact shadow under something ROUND — a tree, a bush, a stone.
   *
   *  TWO ROWS, THE LOWER ONE NARROWER, so it reads as a puddle rather than a bar.
   *  Every shadow in the game was a hard rectangle at one alpha, which is right
   *  for the things that ARE rectangles — a wall, a chest, a plinth — and wrong
   *  for everything with a curved foot. It is the same failure the crowns had:
   *  a straight axis-aligned edge standing in for a curve. Two pixels of taper is
   *  the whole of the fix and it costs one extra fillRect.
   *
   *  Square-footed things keep their rectangle on purpose; see the call sites. */
  private footShadow(cx: number, base: number, w: number, rake = 0, artH = 0): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    // THE LONG SHADOW OF A LOW SUN, where the region says so (§BiomeDef.rake).
    // Drawn BEFORE the contact shadow and in the same ink, so the two overlap into
    // one mass at the foot rather than reading as an object with a stripe beside
    // it, and so the near end is doubled — which is what a shadow does where it
    // meets the thing casting it.
    //
    // DOWN, AND TO WHICHEVER SIDE THE SUN IS NOT ON — `rake`'s SIGN, which is
    // west before noon and east after it (sim/time.ts §rakeAt). This used to be
    // "down and to the right" unconditionally, on the reasoning that the key
    // light is upper left and a shadow anywhere else would be a second sun. The
    // key light IS still upper left and does not move; what that argument missed
    // is that it then never rises, and a world where every morning shadow points
    // the way the evening's does has no mornings in it.
    //
    // The region's own pinned rake keeps the same convention, so the twilight
    // country's permanent evening is a positive number and still falls east.
    //
    // Two across for one down, not forty-five degrees. A diagonal at this size is
    // a staircase and reads as a jaggy; a shallow slope reads as distance along
    // the ground, which is what it is.
    if (rake !== 0 && artH > 0) {
      const dir = Math.sign(rake);
      const len = Math.round(artH * Math.abs(rake));
      // A NECK AND THEN A HEAD, BECAUSE A CAST SHADOW IS THE SPRITE'S OWN
      // SILHOUETTE LYING DOWN. The first version tapered from the full width to a
      // point and it was drawn from the wrong idea entirely — that a shadow fades
      // with distance, which is a speed line, not a shadow. Nothing about a tree
      // is widest at the ground: the stem is thin and the crown is at the far end,
      // so the shadow has to be thin where it leaves the trunk and swell where the
      // canopy lands.
      //
      // Which also fixes the thing that looked wrong before anyone worked out why.
      // A point is a shape with a DIRECTION, and a wedge narrowing away from the
      // tree reads as motion — the wood looked like it was travelling. A neck and
      // a head is the same length of ink reading as an object.
      //
      // Both ends derived from `w` rather than from the trunk, because `w` is
      // already sized off the crown at every call site and the ratio is what
      // matters: about a third of the canopy for the stem, about two thirds for
      // the mass, which is roughly true of everything that casts one here.
      const neck = Math.max(3, Math.round(w * 0.3));
      const head = Math.max(neck + 2, Math.round(w * 0.65));
      for (let i = 1; i <= len; i++) {
        const f = i / (len + 1);
        // The head is a parabola centred just past three quarters of the way out,
        // so it arrives, peaks and rounds off inside the shadow's own length. It
        // ends blunt rather than pointed: what lies furthest from the tree is the
        // TOP of the crown, and a crown is not sharp.
        const tw =
          f < 0.4 ? neck : Math.max(3, Math.round(head * (1 - ((f - 0.72) / 0.34) ** 2)));
        ctx.fillRect(cx - (tw >> 1) + i * dir, base - 2 + (i >> 1), tw, 1);
      }
    }
    // THE PUDDLE PULLS OVER AS THE SUN DROPS, and this is the fix for the thing
    // that made a tree at dusk look like it had two shadows.
    //
    // These two rows used to be drawn at full width, centred on the stem, no
    // matter where the sun was. That is the correct shape at NOON and only at
    // noon: a symmetric puddle is what an overhead sun makes. At sunset the same
    // rows were still there — a flat bar under the trunk with a long rake coming
    // out from behind it, and, worse, a bar sticking out on the SUNWARD side,
    // which is the one direction a shadow cannot go. Two shadows from one sun.
    //
    // So the sunward half retracts with the light and the lee half does not. At
    // `rake` 0 that is exactly the old rectangle, pixel for pixel; at the horizon
    // it is a half-puddle on the shaded side, tucked under the foot, running
    // straight into the rake that leaves it. The object still never floats —
    // whatever the hour, the lee half is always there holding it down.
    const t = Math.min(1, Math.abs(rake) / RAKE_MAX);
    const dir = Math.sign(rake) || 1;
    const puddle = (row: number, width: number): void => {
      const half = width >> 1;
      // Rounded, not floored: on a nine-pixel shadow the difference between the
      // two is whether the last pixel of sunward puddle survives the whole of
      // the afternoon or vanishes at three o'clock.
      const sun = Math.round(half * (1 - t));
      const lee = width - half;
      ctx.fillRect(dir > 0 ? cx - sun : cx - lee, row, sun + lee, 1);
    };
    puddle(base - 2, w);
    // Narrower nearer the viewer, and never below three pixels — a taper that
    // eats a small shadow entirely leaves the object floating, which is the thing
    // a contact shadow exists to prevent.
    puddle(base - 1, Math.max(3, w - 4));
  }

  /** A tree: trunk, layered crown, contact shadow. Getting on for two tiles tall,
   *  so it overhangs the ground behind it and you can walk out of sight behind
   *  one. Jittered by the tile hash so a stand of trees isn't wallpaper.
   *
   *  (It was two and a half while the broadleaf was a twenty-four-row capsule.
   *  The crown came down to seventeen rows when it was reshaped into something
   *  that stands in a field — see BROADLEAF — and the overhang survives that with
   *  room to spare, because a tile is sixteen pixels and the tree is thirty-three.) */
  private drawTree(
    world: WorldState,
    tx: number,
    ty: number,
    t: number,
    night: boolean,
    dark = false,
  ): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    const jx = Math.floor(h * 3) - 1;
    const cx = Math.round(this.sceneX(tx)) + jx;
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    // Fade rather than vanish when it would otherwise swallow the player —
    // you should always be able to see where you are (no lost-behind-scenery).
    // The region this tree grows in, and the grove is EXEMPT from it exactly as
    // it is exempt from the seasons: the dark wood is what the grove IS, and a
    // stand that turned pink because it happened to fall inside the blossom rows
    // would be a secret joining in with the scenery.
    // `scatterSkin`, not `regionSkin`: a pine that rolled its way three tiles
    // into the scrub is drawn as a pine. That is the whole of what softening a
    // treeline means — the alternative interleaves the COUNT and keeps the
    // species changing on the line, which is the seam you can actually see.
    // A PLANTED TREE WEARS ITS OWN REGION'S SKIN (DESIGN §The garden, and
    // content/flora.ts §skin): a bur oak on your lawn is drawn by exactly this
    // call with exactly the prairie's inks, seasons and all. The generator has
    // no say — the record does.
    const planted = dark ? null : world.garden.plants[tileKey(tx, ty)];
    const species = planted ? FLORA[planted.id] : null;
    const biome = dark
      ? null
      : species
        ? BIOMES[species.skin]
        : scatterSkin(world.seed, world.homestead.spot, tx, ty);

    // Silhouette and therefore HEIGHT, both from the region. Read before the fade
    // because how far a tree reaches up is what decides whether it's hiding you:
    // a fen willow is six pixels taller than a scrub bush, and asking about the
    // wrong height either fades a tree that isn't in the way or leaves you behind
    // one that is.
    //
    // WHICH FORM OF IT, off the tile's own hash, where a region draws more than
    // one (content/biomes.ts §crownAlt). Its own salt: `h` already chose the
    // sideways jitter, and a tree whose species tracked which way it leaned would
    // be one roll wearing two hats — the decor kit's oldest bug, which this file
    // has now made three times and avoided here by writing the salt down.
    //
    // A region with no second form gets a one-item list and the same tree it
    // always drew, hash or no hash.
    const forms = biome ? treeForms(biome) : null;
    // A planted tree's form is its SPECIES' (the orchard's plum is form 1 of
    // the orchard's tree), never the hash's — two taps of the same palette
    // entry must plant the same tree.
    const formIdx = forms
      ? species
        ? Math.min(species.form ?? 0, forms.length - 1)
        : Math.floor(decoHash(tx, ty, world.seed ^ 0x1d4f) * forms.length) % forms.length
      : 0;
    let form = forms ? (forms[formIdx] ?? forms[0]) : null;
    // AND IT GROWS IN (DESIGN: everything goes in small and fills out over
    // days). Stages are authored transforms of the grown form, not fractional
    // scales — the sprite rule (CLAUDE.md) bans resampling, so a young tree is
    // FEWER ROWS on a shorter stem, which is also what a young tree is. Gaps
    // and overlap are dropped: a sapling has no underside to notch.
    if (planted && form) {
      const stage = growthStage(world, tx, ty, this.now);
      if (stage === 0) {
        form = { rows: [1, 2], trunkHeight: 4 };
      } else if (stage === 1) {
        const half = form.rows.filter((_, i) => i % 2 === 0);
        form = { rows: half, trunkHeight: Math.max(6, Math.ceil((form.trunkHeight ?? TRUNK_H) / 2)) };
      }
    }
    const rows = form ? form.rows : BROADLEAF;
    // Empty half-width at the middle of each row (the blossom's dip over the
    // trunk), and how many rows come down beside the trunk to make that dip
    // legible. Both default to "solid crown, perched on top".
    const gaps = form?.gaps;
    const overlap = form?.overlap ?? 0;
    // The puffs hung off the bole (content/biomes.ts §crownBoughs). Empty for
    // every region but the giants, and empty is free.
    const boughs = form?.boughs ?? biome?.crownBoughs ?? [];
    // How much bare stem there is under all that. Per-FORM now, and per-region
    // before that (content/biomes.ts), because tallness is a species trait and
    // the crown could only ever express bushiness: the birches stand three pixels
    // higher than anything else here, and a pine that kept its lower branches
    // stands on a third of the stem one that lost them does.
    const trunkH = form?.trunkHeight ?? TRUNK_H;
    const height = trunkH + rows.length - overlap;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, height);

    // Contact shadow — without it a tall sprite floats instead of standing. Sized
    // off the crown it belongs to: a fixed 9px puddle under a crown twice that
    // wide was a standing loose end, and it got worse the moment the trees grew.
    const reach = boughs.reduce((w: number, b) => Math.max(w, boughReach(b)), Math.max(...rows));
    const shadowW = Math.max(9, reach * 2 - 3);
    this.footShadow(cx, base, shadowW, biome?.rake ?? this.rake, height);

    // The grove's trunks are the dark wood itself, which is the only place in
    // the game where the finish and the material are the same object. It reads
    // nearly black at night, and it is meant to: you find the grove by daylight
    // and meet her in a stand you can barely make out.
    const bark = dark ? (night ? "#2b1d16" : "#3f2a1e") : night ? "#4a3628" : "#6b4a33";
    const barkDark = dark ? (night ? "#1f150f" : "#2f1e15") : night ? "#3a2a1e" : "#573a28";
    // Five px, not three: a 3px stem under a 40px tree reads as a sapling that
    // grew a hat. The dark side stays one px, so the light/dark split that gives
    // the trunk its round still lands where the bark dashes expect it.
    //
    // ODD, AND IT WAS FOUR FOR A WHILE — which is the crown's old bug wearing the
    // trunk's clothes. Everything about this sprite is centred on the COLUMN cx:
    // the crown (`rows[r] * 2 + 1`), the bark grid, the `crownGaps` notch, the
    // contact shadow, the orb spots. A four-pixel stem spans cx-2..cx+1, whose
    // centre is the SEAM at cx-0.5, so the whole tree hung half a pixel to the
    // left of its own trunk — invisible while the trees were small and obvious
    // the moment they got big enough to look at. Growing the stem is what this
    // wanted; growing it to an even width is what broke it.
    //
    // GIRTH GROWS IT SYMMETRICALLY, and the dark side grows WITH it — a shaded
    // edge that stayed one pixel on an eight-pixel stem is a line drawn beside a
    // trunk rather than the far side of a round thing. It is a third of the extra
    // width plus the original pixel, which keeps the light/dark split near the
    // quarter it has always sat at.
    // PER-FORM FIRST, then the region's (content/biomes.ts §TreeShape.girth). A
    // sapling is skinny as well as short, and on the region's stem it came out a
    // fencepost wearing a shrub.
    const girth = form?.girth ?? biome?.trunkGirth ?? 0;
    // How far the bole carries on up inside the crown; drawn after it, below.
    const spar = form?.spar ?? biome?.crownSpar ?? 0;
    // At least one, or a narrowed stem loses its shaded side entirely and stops
    // being round — the fault this whole two-tone split exists to avoid.
    const shade = Math.max(1, 1 + Math.round(girth / 1.5));
    const barkInk = biome ? mixHex(bark, biome.trunk) : bark;
    const barkShade = biome ? mixHex(barkDark, biome.trunk) : barkDark;
    ctx.fillStyle = barkInk;
    const stem = trunkSpan(girth);
    ctx.fillRect(cx + stem.dx, base - trunkH, stem.w, trunkH);
    ctx.fillStyle = barkShade;
    ctx.fillRect(cx + stem.dx + stem.w - shade, base - trunkH, shade, trunkH);

    // The birches' dashes. Drawn BEFORE the crown, so the rows that hang beside
    // the trunk cover the marks they would overlap rather than leaving scars
    // floating in the foliage.
    //
    // Which grid a trunk wears comes off its own salted hash, not `h` — `h`
    // already chose the sideways jitter, and sharing it would tie a tree's bark
    // to which way it leans. That is the decor kit's old bug, and this file has
    // now made it twice.
    // Which grid this trunk wears and what colour it is in, kept for the SPAR to
    // reuse further down — the fluting has to carry on up the bole, and picking
    // the grid twice would let the two halves of one trunk disagree.
    const barkArt = biome?.bark
      ? {
          grid: biome.bark.marks[
            Math.floor(decoHash(tx, ty, world.seed ^ 0x5c07) * biome.bark.marks.length) %
              biome.bark.marks.length
          ],
          color: biome.bark.color,
        }
      : null;
    // Night pulls the mark toward the trunk rather than toward black: bark is one
    // material in two lights, and a dash that stayed charcoal while the stem went
    // blue would read as a hole in the tree after dark.
    const markInk = barkArt
      ? night
        ? mixHex(barkArt.color, { color: "#2a3140", amount: 0.45 })
        : barkArt.color
      : "";
    if (barkArt) {
      const grid = barkArt.grid;
      ctx.fillStyle = markInk;
      // AGAINST THE LIT EDGE, and clear of the shaded one. The inset used to run
      // on BOTH sides, and only one of the two was doing any work: a dash that
      // crossed the shaded column would flatten the round the two-tone stem is
      // for, but one that reaches the lit edge does no such thing — a lenticel is
      // a scar that WRAPS the stem, so a mark stopping a pixel short of the edge
      // is a mark floating on a trunk rather than a mark cut into one. Anchoring
      // them left also puts the whole grid on the lit side, where bark detail
      // belongs; the shaded column stays bare and keeps saying "far side".
      //
      // Bounded by the ROW's own length rather than by a literal 3, so a grid
      // written narrow on a wide tree draws what it has instead of reading off
      // its end — the same forgiveness the row count already had.
      //
      // A NARROW STEM READS THE GRID AS A COUNT, NOT AS COLUMNS, and that is what
      // stops it punching HOLES. Three pixels of trunk, one of them the shaded
      // side, leaves two lit columns — and the grids put marks in all three of
      // their own, so `.x.` would land a single dark pixel with bark either side
      // of it. That is not a mark ON a trunk, it is a gap THROUGH one, and the
      // eye reads an enclosed dark pixel as a hole before it reads it as
      // anything else (the crown's `crownGaps` note, at a tenth of the size).
      //
      // So what survives the squeeze is HOW MUCH bark a row wears, not where: a
      // row with one `x` draws one pixel and a row with two draws two, both from
      // the edge. Every mark keeps its place in the vertical rhythm the grids
      // were drawn for.
      //
      // AND A YOUNG STEM WEARS TWO OF THEM AT MOST. Read whole, a grid puts three
      // or four dashes on twelve pixels of sapling where it puts the same number
      // on twenty of adult — so the smaller tree came out the more heavily marked
      // one, which is backwards twice over: a birch's bark roughens with age, and
      // the marks are the loudest thing on a stem this thin. Two is enough to say
      // which tree it is going to be. They are the TOP two because that is where
      // the grids gather them, and the region's own note says why — a birch's
      // lower bark is the smoothest part of it.
      const lit = stem.w - shade;
      const narrow = lit <= 3;
      const x0 = cx + stem.dx;
      let worn = 0;
      for (let r = 0; r < grid.length && r < trunkH; r++) {
        const row = grid[r];
        if (narrow) {
          let n = 0;
          for (const ch of row) if (ch === "x") n++;
          if (!n) continue;
          if (++worn > 2) break;
          for (let c = 0; c < Math.min(n, lit); c++) {
            ctx.fillRect(x0 + c, base - trunkH + r, 1, 1);
          }
          continue;
        }
        for (let c = 0; c < 3 + girth * 2 && c < row.length; c++) {
          if (row[c] === "x") ctx.fillRect(x0 + c, base - trunkH + r, 1, 1);
        }
      }
    }

    // Crown as per-row half-widths from the region's own silhouette: an
    // integer-rect blob, no ellipse maths and nothing off the pixel grid
    // (CLAUDE.md §Sprite rendering).
    // THE GROVE IS SEASON-EXEMPT and keeps its own four numbers in every month.
    // The dark wood is what the grove IS (tiles.ts) — a stand that turned gold
    // every October would be a secret joining in with the town. An ordinary
    // tree's crown comes from the frame's palette, which is where autumn and
    // winter actually land: it is the largest colour mass on screen.
    //
    // The BIOME then pulls the season's answer somewhere (content/biomes.ts), so
    // the two compose rather than one winning: October still lands here, hard in
    // the birches and barely at all in the pines, which is what conifers do.
    const crown = dark
      ? night
        ? "#1e2c1f"
        : "#2c3a2a"
      : this.foliage(biome, false);
    const crownLit = dark
      ? night
        ? "#26361f"
        : "#3a4a34"
      : this.foliage(biome, true);
    const top = base - height;
    // AND THE CROWNS COME OUT WRONG TOO, where the region says so. The largest
    // colour mass on screen is the one that has to carry the Static's whole
    // sentence — a floor drawn at a coarser bitrate under trees drawn cleanly
    // would read as a paint job on the grass rather than as the place being
    // rendered badly.
    //
    // The HARD region, like every other thing about a tree: a crown cannot be
    // half-dithered any more than a pine can be half a birch. `biome` here is
    // already the region the tree actually grew from (`scatterSkin`), so the
    // treeline dithers by which tree is which, exactly as it does at every other
    // border in the world.
    const wrong = biome?.dither;
    const ink = (c: string): string | CanvasPattern =>
      wrong ? (this.ditherFill(c, mixHex(c, wrong.crown)) ?? c) : c;
    // THE CROWN SEPARATES BEFORE IT IS DRAWN, where the region says so. Two
    // ghosts of the whole silhouette, one pixel either side, in the region's warm
    // and cold channels — so the largest colour mass on screen is the thing most
    // obviously failing to line up with itself (content/biomes.ts §glitch).
    //
    // UNDER THE CROWN AND NOT OVER IT, exactly as a decor mark's channels are:
    // over the top it would be a magenta tree, and what is wanted is a tree with
    // colour leaking out of its edges. Only the edge survives, because the crown
    // is drawn solid over the middle of both ghosts — which is the whole of the
    // effect for one extra pass and no per-pixel work.
    //
    // AND IT IS UNEVEN, TREE BY TREE. A fringe of exactly the same strength on
    // every crown is a filter — something the whole picture is being put through
    // on purpose, which reads as a style. A fault is intermittent: most trees are
    // separated a little, some badly, and about one in six is perfectly fine,
    // which is the one that makes the others look wrong. Off the tile's own hash,
    // so a tree keeps its condition when you walk away from it.
    const glitch = biome?.glitch;
    const bad = decoHash(tx, ty, world.seed ^ 0x3ab1);
    if (glitch && bad > 0.16) {
      for (const [dx, hex] of [
        [-1, glitch.cold],
        [1, glitch.warm],
      ] as const) {
        ctx.globalAlpha = 0.25 + bad * 0.45;
        ctx.fillStyle = hex;
        for (let r = 0; r < rows.length; r++) {
          if (rows[r] === 0) continue;
          const g = gaps?.[r] ?? 0;
          if (g > 0) {
            ctx.fillRect(cx - rows[r] + dx, top + r, rows[r] - g, 1);
            ctx.fillRect(cx + g + 1 + dx, top + r, rows[r] - g, 1);
          } else {
            ctx.fillRect(cx - rows[r] + dx, top + r, rows[r] * 2 + 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
    // One row of canopy, mass then highlight. It is a function because the BOLE
    // pass below draws some of these rows a second time, over the bark — see
    // §crownSpar. Everything it reads (`rows`, `gaps`, `litRows`) is fixed by
    // then, so a replayed row lands pixel-for-pixel on top of its first draw.
    const crownRow = (r: number): void => {
      // A BREAK BETWEEN TWO LIMB MASSES, and nothing is drawn on it — see
      // content/biomes.ts §crownRows. It is only legal where the spar reaches,
      // so what shows through is bark and sky either side of it, which is what a
      // crown made of separate branch plates actually looks like.
      if (rows[r] === 0) return;
      const g = gaps?.[r] ?? 0;
      // ODD WIDTH, AND IT WAS EVEN FOR A LONG TIME. The trunk is three pixels at
      // cx-1..cx+1, so its centre is the COLUMN cx; a crown of `rows[r] * 2` spans
      // cx-h..cx+h-1, whose centre is the seam at cx-0.5. Every tree in the game
      // was half a pixel of canopy heavier on its left, which is invisible in a
      // silhouette and obvious the moment something bright hangs in it.
      //
      // `rows[r] * 2 + 1` is also what the crownRows doc always claimed: half-
      // widths, "one fillRect rows[r] wide EITHER SIDE of the trunk" — which needs
      // the trunk's own column in the middle to be true. Every crown is a pixel
      // wider than it was; none of them moved.
      ctx.fillStyle = ink(crown);
      if (g > 0) {
        // Two lobes with the trunk between them. The gap is centred on the
        // trunk's own column (cx - g .. cx + g), so foliage sized to it meets
        // the bark rather than leaving a stripe of grass either side.
        ctx.fillRect(cx - rows[r], top + r, rows[r] - g, 1);
        ctx.fillRect(cx + g + 1, top + r, rows[r] - g, 1);
      } else {
        ctx.fillRect(cx - rows[r], top + r, rows[r] * 2 + 1, 1);
      }
      if (r < 1 || r > litRows) return;
    // Light from the upper left, as everywhere else. Bounded by the crown's own
    // length rather than by a literal 6: the scrub's is nine rows tall, and a lit
    // side that ran past the end read off the end of the array.
    //
    // A FRACTION OF THE CROWN, NOT SIX ROWS. It was a flat 6 while every crown
    // here was nine or ten rows tall, so six was most of one. The birches are
    // fourteen, and a fixed six left the bottom eight rows a single flat green
    // mass — which is what made the first pass read as a solid cone rather than
    // as foliage. Light falls across a proportion of a shape, not across a
    // constant number of pixels of it.
    //
    // Floored at 6 so nothing that looked right under the old rule moved, and
    // clamped to the array so the shortest crowns can't run off the end. The
    // fraction is UNDER A HALF-AND-A-BIT on purpose: at 0.7 the blossom's crowns
    // came out more lit than shaded, which inverts what a highlight is.
      ctx.fillStyle = ink(crownLit);
      // Light lands on the LEFT lobe when a row is split — the lit side is the
      // upper left of the mass, not the upper left of each piece of it.
      // AND IT PULLS BACK AS IT DESCENDS, which is the difference between light
      // and a paint job. Every lit row used to run from the crown's left edge to
      // the trunk's own column, so the boundary was a straight vertical seam down
      // the middle of the tree and the crown read as two flat halves. On a narrow
      // capsule that is a two-pixel detail; the moment the broadleaf became a
      // wide dome it was a ten-pixel slab with a ruled edge, and the tree stopped
      // being round.
      //
      // The lit run now gives up a share of its width as `r` grows, so its inner
      // edge walks outward down the crown and the terminator follows the surface
      // instead of cutting across it. Three quarters, reached at the last lit
      // row: at 1.0 the bottom lit rows vanish and the highlight ends in a point,
      // which reads as a crease rather than as a curve.
      //
      // SPLIT ROWS ARE EXEMPT. A crown with `crownGaps` has two lobes and the
      // left one is already narrow; pulling it back as well leaves the blossom's
      // canopy with no lit side at all below its shoulders.
      const back = g > 0 ? 0 : Math.floor((r / litRows) * rows[r] * 0.75);
      const w = g > 0 ? rows[r] - g - 1 : Math.max(2, rows[r] - 1 - back);
      if (w > 0) ctx.fillRect(cx - rows[r] + 1, top + r, w, 1);
    };
    const litRows = Math.min(rows.length - 1, Math.max(6, Math.round(rows.length * 0.6)));
    for (let r = 0; r < rows.length; r++) crownRow(r);

    // THE SAME BARK IT IS LOWER DOWN, and this was got wrong on a plausible
    // argument. The bole inside the crown was pulled a third of the way to the
    // foliage's ink, on the reasoning that this is the one part of the trunk with
    // a whole tree's shade over it — which is true of the light and false about
    // what you are looking at. It is ONE TRUNK. Shaded, the upper half stopped
    // reading as the same object as the lower half: not "in shadow" but missing,
    // with the tree apparently ending where the canopy started and a dark stripe
    // standing in for it. A material that changes colour halfway up is two
    // materials.
    //
    // The LIMBS keep a pull toward the foliage, because a limb genuinely is deep
    // in the crown and it is one pixel wide — there is nothing else it can use to
    // sit back.
    const limbInk = mixHex(barkInk, { color: crown, amount: 0.45 });

    // THE BOUGHS, hung off the bole and drawn last of the foliage — see
    // §BOUGH_SHAPES for why they exist at all and content/biomes.ts §crownBoughs
    // for what they are for.
    //
    // UNDER THE SPAR, WHICH IS THE CORRECTION. They were drawn OVER it first, on
    // the argument that a limb springs from the trunk and so is in front of it
    // where the two meet. True of one limb and useless with seven: a puff is four
    // or five pixels of foliage either side of its own centre, so a row of them
    // alternating down a bole covers the whole bole between them and the tree
    // that was supposed to be a red column with branches on it came back as a
    // stack of leaves with a stump under it. The bark is the subject here. It
    // goes on top, and the limb's own pixel is what says the two are joined.
    for (const b of boughs) {
      const shape = BOUGH_SHAPES[b.size];
      if (!shape) continue;
      const bx = cx + b.dx;
      const by = top + b.row;
      // The limb itself, one pixel, from the bark out to the puff. Without it a
      // bough is a cloud parked beside a tree; with it the tree is holding the
      // cloud up. It runs at the puff's shoulder rather than its middle, which
      // is where a real limb leaves the trunk — they rise, then the foliage
      // hangs off the end.
      const arm = by + 1;
      const inner = b.dx < 0 ? bx : cx;
      const outer = b.dx < 0 ? cx : bx;
      ctx.fillStyle = limbInk;
      ctx.fillRect(inner, arm, Math.max(1, outer - inner), 1);
      ctx.fillStyle = ink(crown);
      for (let r = 0; r < shape.length; r++) {
        ctx.fillRect(bx - shape[r], by + r, shape[r] * 2 + 1, 1);
      }
      // Lit from the upper left like everything else, and pulling back as it
      // descends for the crown's own reason — a flat left half is a paint job,
      // and on a shape this small it is most of the shape.
      ctx.fillStyle = ink(crownLit);
      for (let r = 1; r < shape.length - 1; r++) {
        const back = Math.floor((r / (shape.length - 1)) * shape[r] * 0.75);
        const w = Math.max(1, shape[r] - 1 - back);
        ctx.fillRect(bx - shape[r] + 1, by + r, w, 1);
      }
    }


    // THE BOLE, CARRIED ON UP INTO THE CROWN (content/biomes.ts §crownSpar).
    //
    // DRAWN LAST, AND ONLY WHERE THE CROWN HAS NOTHING. Three arrangements of
    // this and each one taught the next:
    //
    //  - BEHIND the foliage, seen through `crownGaps`. A gap is symmetric about
    //    the trunk, so every width that showed enough bark to read as a trunk
    //    split the canopy into two fringes stuck to a red post.
    //  - FLAT OVER the foliage. A column of bark with a rounded top standing in a
    //    green field reads as a doorway cut into the tree, because nothing passes
    //    in front of it.
    //  - Over the foliage with the branch plates drawn back over the bark, which
    //    was right and was an approximation of this. It banded the trunk where
    //    the tiers were — and then the BOUGHS arrived and painted over the bole
    //    wholesale, because a puff is four or five pixels of foliage either side
    //    of a limb and seven of them cover a trunk between them.
    //
    // The rule underneath all three, stated plainly at last: bark shows exactly
    // where there is no foliage in front of it. So the spar is drawn after every
    // green thing on the tree and skips any row whose crown row is solid — the
    // breaks band it on a tiered conifer, and on a sequoia, whose crown is nearly
    // all breaks, the bole simply runs the whole height with the limbs hung off
    // it. Which is what a trunk does.
    for (let i = 0; i < spar; i++) {
      // The crown row this pixel of bole sits on. Solid foliage there means the
      // canopy is in front of the trunk and the trunk is not drawn.
      const cr = rows.length - overlap - 1 - i;
      if (cr >= 0 && cr < rows.length && rows[cr] > 0) continue;
      const hw = sparHalf(i, spar, girth);
      const y = base - trunkH - 1 - i;
      ctx.fillStyle = barkInk;
      ctx.fillRect(cx - hw, y, hw * 2 + 1, 1);
      // The same shaded far side the stem has, clamped so the narrow end keeps
      // at least one lit pixel — a spar drawn entirely in the dark ink stops
      // being round exactly where it is thinnest and most in need of it.
      const sh = Math.min(shade, hw * 2);
      if (sh > 0) {
        ctx.fillStyle = barkShade;
        ctx.fillRect(cx + hw + 1 - sh, y, sh, 1);
      }
      // AND THE FLUTING GOES UP WITH IT. A redwood's bark is furrowed straight up
      // and down and the runs are the drawing at this size (content/biomes.ts
      // §bark) — so a bole that carried them for thirty pixels and then went
      // smooth is two trunks again, in texture this time rather than in colour.
      // The grid keeps running: `i` counts UP from the top of the stem, and the
      // pattern is read from its far end so the furrows carry across the join
      // rather than restarting at it.
      if (barkArt) {
        ctx.fillStyle = markInk;
        const litW = hw * 2 + 1 - sh;
        const row = barkArt.grid[(barkArt.grid.length - 1 - (i % barkArt.grid.length))];
        let n = 0;
        for (const ch of row) if (ch === "x") n++;
        if (litW <= 3) {
          for (let c = 0; c < Math.min(n, litW); c++) ctx.fillRect(cx - hw + c, y, 1, 1);
        } else {
          for (let c = 0; c < litW && c < row.length; c++) {
            if (row[c] === "x") ctx.fillRect(cx - hw + c, y, 1, 1);
          }
        }
      }
    }

    // Lights caught in the crown. NOT FRUIT — see BiomeDef.orbs for why that
    // distinction is the whole design of this: drawn through the same additive
    // pass as the sparks and the fireflies, with a white core, so an orb reads as
    // the wood glowing rather than as something to reach for.
    //
    // Everything off the tile's own hash on a private salt, so a tree keeps its
    // orbs while you walk around it and its neighbour has a different three. The
    // salt is not `h`: `h` already picked the trunk's sideways jitter, and reusing
    // it would tie where the lights hang to which way the tree leans — the decor
    // kit's bug, which this file has now made twice.
    const orbs = biome?.orbs;
    if (orbs) {
      const oh = decoHash(tx, ty, world.seed ^ 0x3b19);
      if (oh < orbs.chance) {
        const prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        // PLACED, NOT SCATTERED — see BiomeDef.orbs.spots. Two generations of
        // this were distributions (independent hashes, then even angles with
        // jitter) and both read as unsettled, because the problem was never how
        // evenly they spread: three lights whose relationship changes from tree
        // to tree give the eye a composition to re-solve at every trunk. The
        // arrangement is now a drawn thing, the same as ROCK_SHAPES.
        //
        // The hash still chooses WHICH trees are lit, which is where the variety
        // belongs: a mixed stand of trees that agree about where light sits.
        for (const [dx, row] of orbs.spots) {
          const r = Math.max(0, Math.min(rows.length - 1, row));
          const half = rows[r];
          if (half === 0) continue; // a break has no foliage to hang a light in
          // Clamped to the row it landed on, so a spots table written against one
          // region's crown cannot hang a bead in the sky if it is reused on a
          // narrower one.
          const ox = cx + Math.max(-(half - 1), Math.min(half - 1, dx));
          const oy = top + r;
          const a = (dx * 0.13 + row * 0.29) % 1;
          // A BEAD. Two goes to get here and both were about SIZE rather than
          // taste. First it reused the spark's geometry — 1px arms on the four
          // axes — which is a sparkle by construction, so the orbs read as
          // glitter stuck onto the tree. Then it went four across, which at a
          // sixteen-pixel crown is a quarter of the tree and reads as a splat.
          //
          // The reference picture settles it by proportion: an orb there is about
          // a twelfth of the crown's width, and a twelfth of this crown is under
          // two pixels. So: a 2×2 with one bright pixel in it. Small enough to
          // hang in the foliage instead of sitting on top of it, and the highlight
          // is what keeps it a ball rather than a square.
          //
          // It breathes, faintly, on the region's own glint clock — an orb that
          // sat perfectly still next to shimmering air would read as paint on the
          // canopy. A fifth of its brightness, where the sparks swing a half:
          // this is a light resting in a tree, not one catching a facet.
          const sway = orbs.twinkle
            ? 0.8 + 0.2 * (0.5 + 0.5 * Math.sin((t / orbs.twinkle + a) * Math.PI * 2))
            : 1;
          ctx.globalAlpha = prev * 0.85 * sway;
          ctx.fillStyle = orbs.color;
          ctx.fillRect(ox, oy, 2, 2);
          ctx.globalAlpha = prev * sway;
          ctx.fillStyle = orbs.core ?? orbs.color;
          ctx.fillRect(ox, oy, 1, 1);
        }
        ctx.globalCompositeOperation = prevOp;
        ctx.globalAlpha = prev;
      }
    }

    // FRUIT IN THE CROWN (§BiomeDef.treeFruit). On a wild tree it is paint,
    // every year, promising nothing. On a PLANTED one it draws only while there
    // is something to pick — so your tree visibly empties for the day when you
    // pick it, and fills again tomorrow, which is the entire status display the
    // garden gets (no bars, no badges; DESIGN §The garden).
    //
    // A 2×2 bead like the orbs', flat rather than additive: an apple is an
    // object in the leaves, not a light. Clamped inside the row it hangs on so
    // a narrow crown carries its fruit closer in, same arithmetic as the orbs.
    const fruitOn = biome?.treeFruit?.find((f) =>
      Array.isArray(f.form) ? f.form.includes(formIdx) : f.form === formIdx,
    );
    if (
      fruitOn &&
      this.palette.season?.id === fruitOn.season &&
      (!planted || fruitReady(world, tx, ty, this.now))
    ) {
      const pick = decoHash(tx, ty, world.seed ^ 0x5f21);
      const spots = fruitOn.spots[Math.floor(pick * fruitOn.spots.length) % fruitOn.spots.length];
      ctx.fillStyle = fruitOn.color;
      for (const [dx, row] of spots) {
        const r = Math.max(0, Math.min(rows.length - 1, row));
        const half = rows[r];
        if (half === 0) continue;
        const ox = cx + Math.max(-(half - 1), Math.min(half - 1, dx));
        ctx.fillRect(ox, top + r, 2, 2);
      }
    }

    ctx.globalAlpha = prev;
  }

  /** A shrub: the same plant as the region's trees, without the tree.
   *
   *  IT REUSES `crownRows` RATHER THAN CARRYING ITS OWN SHAPE, taking the middle
   *  of the array and squashing the ends. That is what keeps a shrub looking like
   *  it belongs where it grows for free: puffy under the glimmer's puffy crowns,
   *  and if the pines ever ask for undergrowth it will come out narrow and
   *  tiered without a number being written. A second silhouette table would let
   *  the two drift until a region's bushes were a different species from its
   *  trees.
   *
   *  No trunk. At five rows a stem is a third of the sprite and it stops reading
   *  as a bush and starts reading as a very small tree — which is the one thing
   *  it must not be, since it is solid and gives a quarter of the wood. It sits
   *  straight on the ground with its own contact shadow, like a rock does. */
  private drawShrub(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    const cx = Math.round(this.sceneX(tx)) + Math.floor(h * 3) - 1;
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    // A planted bush wears its species' skin, exactly as a planted tree does —
    // see drawTree, whose note this one only points at.
    const planted = world.garden.plants[tileKey(tx, ty)];
    const species = planted ? FLORA[planted.id] : null;
    const biome = species
      ? BIOMES[species.skin]
      : scatterSkin(world.seed, world.homestead.spot, tx, ty);
    // THE WIDEST FORM, where a region draws more than one tree (§crownAlt). A
    // bush is a bush: it takes one number from its region — how wide the foliage
    // around here gets — and picking the fattest of the forms keeps that number
    // steady while the trees above it vary. Rolling a form per bush would tie the
    // undergrowth to a distinction that is entirely about how much STEM a tree
    // has, which is the one thing a shrub does not have at all.
    const src = biome
      ? treeForms(biome).reduce((a, b) => (Math.max(...b.rows) > Math.max(...a.rows) ? b : a)).rows
      : BROADLEAF;

    // The widest stretch of the crown, scaled to a bush. The ends of a crown are
    // its taper — a shrub is all middle.
    //
    // IT INHERITS THE CROWN'S WIDTH, NOT THE CROWN'S PROFILE — which is the third
    // correction and the one that mattered. Copying the middle rows verbatim also
    // copies their per-row wobble, and the glimmer's crown deliberately wobbles:
    // widen, narrow a pixel, widen again, which reads as lobes of foliage at
    // fourteen rows and as a BITE OUT OF THE SIDE at nine. Detail does not scale
    // down; at this size a one-pixel lump is a defect rather than a lump.
    //
    // So one number comes from the region — how wide its foliage gets — and the
    // dome is this sprite's own. A pinewood bush would still come out narrower
    // than a glimmer one, which is the whole point of inheriting anything.
    //
    // The size took two goes before that: five rows at 0.6 was eleven across by
    // five tall, a barrel lying on the grass; seven at 0.45 fixed the proportion
    // and undershot, reading as a tuft rather than a bush you walk around. Nine
    // rows at 0.6 of the widest crown row is about two thirds of the tree above
    // it, and solid enough to be the obstacle it actually is.
    // WHICH PLANT THIS BUSH IS, where the region draws more than one
    // (content/biomes.ts §shrubShapes). Weighted by repetition, like the rock
    // shapes and the tuft shapes, and read off its OWN salt — `h` chose the
    // sideways jitter and 0x2f19 chooses the width below, and a cactus that only
    // ever appeared on bushes that had leaned left would be one roll wearing
    // three hats. This file has made that mistake often enough to name it.
    const kinds = biome?.shrubShapes;
    // A PLANTED bush is the shape its species says, never the roll's: a
    // prickly pear you planted is a prickly pear (content/flora.ts §shape) —
    // the weighting exists to keep the strange plant rare in the WILD, and a
    // deliberate planting is the opposite of rare by accident.
    const kind = species?.shape
      ? species.shape
      : kinds
        ? kinds[Math.floor(decoHash(tx, ty, world.seed ^ 0x71c3) * kinds.length) % kinds.length]
        : "bush";
    if (kind === "pear") {
      // WHICH PLANT THIS ONE IS. Its own salt again — the shape roll above already
      // decided it was a cactus at all, and a pear whose pose tracked that would
      // be the same roll asked twice.
      const grid =
        PRICKLY_PEAR[
          Math.floor(decoHash(tx, ty, world.seed ^ 0x1e6b) * PRICKLY_PEAR.length) %
            PRICKLY_PEAR.length
        ];
      const w = grid[0].length;
      const left = cx - Math.floor(w / 2);
      const gtop = base - grid.length;
      const prevA = ctx.globalAlpha;
      if (this.buildView) ctx.globalAlpha = prevA * BUILD_VIEW_FADE;
      else ctx.globalAlpha = prevA * this.hideFactor(world, tx, ty, grid.length + 1);
      // Sized to what actually TOUCHES the ground, which is one pad and not the
      // whole plant: a shadow the width of the sprite would put this cactus on a
      // saucer. The bush's own shadow takes its last row for the same reason.
      this.footShadow(cx, base, 5, biome?.rake ?? this.rake, grid.length);
      // ITS OWN INK, AND IT DOES NOT SEASON — the only plant in the region that
      // does not. Everything else here browns with the ground and goes rust in
      // October (§autumnCrown); a cactus is a succulent and holds the same
      // glaucous blue-green all twelve months, which is exactly the kind of fact
      // this game lets a plant have.
      //
      // IT TOOK THREE COLOURS AND THE THIRD ONE WAS THE GROUND'S FAULT. Drawn as
      // an ordinary green (#6f9070) it landed NINE luma from the region's shrubs,
      // which is the poppy's failure repeated; drawn as a grey-teal it read
      // clearly and slightly wrong, a eucalyptus among thorn bushes. Both were
      // symptoms: the scrub's spring ground was itself far too dark, leaving 32
      // luma between the floor and the shrubs under it, and NOTHING can stand in
      // a gap that size. With the ground corrected (§scrub.seasonGround) there
      // are 47, and an honest green fits: #79a173 sits 24 under the floor and 23
      // over the shrubs.
      //
      // IT IS STILL COOLER AND FLATTER THAN THE SHRUBS, and that is the part to
      // keep. They are #648449, a yellow-green at 0.45 saturation; this is 0.29
      // and bluer. A prickly pear has a wax bloom on it — glaucous is the word —
      // and that reads as a plant that is green in a DIFFERENT WAY, which is what
      // it should be. The shape carries the rest, which is why it was given art.
      const pad = night ? "#46584a" : "#79a173";
      const lit = night ? "#556953" : "#92b48b";
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        for (let c = 0; c < w; c++) {
          const ch = row[c];
          if (ch === ".") continue;
          ctx.fillStyle = ch === "l" ? lit : pad;
          ctx.fillRect(left + c, gtop + r, 1, 1);
        }
      }
      ctx.globalAlpha = prevA;
      return;
    }

    let peak = shrubPeak(src);
    // A planted bush GROWS IN (DESIGN §The garden): for its first day it is a
    // small version of itself — the dome at half its peak, which the row maths
    // below turns into a genuinely smaller plant rather than a squashed one.
    // Bushes skip the tree's middle stage (sim/garden.ts §growthStage).
    if (planted && growthStage(world, tx, ty, this.now) < 2) {
      peak = Math.max(3, Math.ceil(peak / 2));
    }
    // AND ONE PIXEL EITHER WAY, off the tile's own hash. Every bush in a region
    // was exactly the same width, which was invisible while undergrowth was a
    // scatter under trees and became the whole picture on the heath, where 18% of
    // the cells are shrubs and there is nothing else in the frame: a field of
    // identical mounds reads as printed rather than grown, which is the same
    // finding `marks` records about a single decor glyph. A third narrower, a
    // third wider, a third as drawn — enough that no two neighbours have to
    // agree, and not enough to make any of them a different plant.
    //
    // Its own salt, not `h`: `h` already chose the sideways jitter above, and a
    // bush whose width tracked which way it sat would be one lump of variation
    // pretending to be two.
    peak = Math.max(3, peak + Math.floor(decoHash(tx, ty, world.seed ^ 0x2f19) * 3) - 1);
    // BOTTOM-HEAVY, NOT SYMMETRICAL. The first dome closed to a point at both
    // ends, which is a berry: a plant tapering back in as it reaches the soil
    // reads as floating just above it, and the contact shadow (sized off the last
    // row) shrank to nothing along with it. Real undergrowth is widest low down
    // where the branches come out of the ground.
    //
    // So the base stays broad — five rows at full width running to a base three
    // half-widths across. It sits.
    //
    // The taper it saves goes on the top, and the top ROUNDS rather than points.
    // Spending all of it there gave a 1 as the first row: a three-pixel cap over
    // an eleven-pixel body, which is a spike, and a bush is not a conifer. Two
    // shallow steps (5px, then 9px, then full) turn the same saved width into a
    // dome — the shape closes without ever coming to a point.
    const rows = shrubRows(peak);

    const height = rows.length + 1;
    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, height);

    this.footShadow(cx, base, (rows[rows.length - 1] + 1) * 2, biome?.rake ?? this.rake, height);

    // THE ONE PLACE A BUSH IS ALLOWED TO DISAGREE WITH THE TREE OVER IT
    // (§BiomeDef.shrubAutumn). Everything else about a shrub is inherited on
    // purpose — the silhouette from the crown rows, the colour from the canopy —
    // and the exception is October, when a deciduous understory under an
    // evergreen canopy is doing the opposite of what the canopy is doing.
    //
    // Last, over the region's fully composed foliage, for `autumnCrown`'s reason
    // one field up: this is a statement about what the plant IS in this month,
    // and anything applied after it would be the tree's opinion again.
    const turn =
      this.palette.season?.id === "autumn" ? (biome?.shrubAutumn ?? null) : null;
    const crown = turn ? mixHex(this.foliage(biome, false), turn) : this.foliage(biome, false);
    const crownLit = turn ? mixHex(this.foliage(biome, true), turn) : this.foliage(biome, true);
    const top = base - height;
    // Odd widths, centred on cx — the same fix the crowns needed, and made here
    // at the same time so a bush is never the one thing sitting half a pixel off.
    ctx.fillStyle = crown;
    for (let r = 0; r < rows.length; r++) {
      ctx.fillRect(cx - rows[r], top + r, rows[r] * 2 + 1, 1);
    }
    // MORE LIT ROWS, PROPORTIONALLY, than a tree gets. A crown is fourteen rows
    // and shows its light on the top six; a shrub is seven, and lighting two of
    // them left it a dark lump on a bright floor — which in this region reads as
    // a HOLE in the ground rather than a plant on it. Half the height, so the
    // dome is legible as a dome.
    // AND IT PULLS BACK AS IT DESCENDS, exactly as a tree's does — see drawTree,
    // where the reasoning is written out. It matters MORE here: a crown lights
    // about a third of its rows and a bush lights four of seven, so the flat
    // left half was a bigger share of this object than it ever was of a tree.
    ctx.fillStyle = crownLit;
    const litTo = Math.min(4, rows.length - 3);
    for (let r = 1; r <= litTo; r++) {
      const back = Math.floor((r / litTo) * rows[r] * 0.75);
      ctx.fillRect(cx - rows[r] + 1, top + r, Math.max(1, rows[r] - 1 - back), 1);
    }
    // FRUIT, for the one season that has any (§BiomeDef.berries). Paint on top
    // of the dome and nothing else — no tile, no yield, no pick.
    //
    // ONE PIXEL EACH, INSET FROM THE ROW'S OWN EDGE. A berry that lands on the
    // outline eats the outline, and at nine rows tall the silhouette is most of
    // what says "bush"; the inset is the same pixel of clearance a decor mark
    // keeps inside its cell. 2×2 was tried first and is a plum — a fifth of the
    // plant across.
    //
    // AND THEY DO NOT TAKE THE SEASON'S TINT, exactly as `DecorKit.accent` does
    // not: the foliage under them browns and turns with the palette, and the
    // fruit stays the colour the fruit is. In this region that never shows —
    // summer is the only month it is on — but the rule is the accent's rule and
    // it should not be restated differently here.
    //
    // PLACED, NOT SCATTERED, which is `orbs.spots` above for the second time in
    // this sprite's neighbourhood and was found the same way: a berry per row
    // off its own hash spreads perfectly well ON AVERAGE and still clusters,
    // because two rows that agree within a pixel draw one two-pixel object. The
    // hash picks which ARRANGEMENT this bush wears; the arrangement itself is
    // drawn, and the gaps in it are the drawing.
    const fruit = biome?.berries;
    // On a PLANTED bush whose species really fruits (the blueberry), the paint
    // doubles as the day's stock: picked, the bush goes bare until tomorrow —
    // the tree's rule in drawTree, one storey down. A planted HYDRANGEA's heads
    // are flowers wearing this field's machinery, not fruit (no `fruit` on its
    // species row), so they stay put all season.
    const fruitHeld =
      planted && species?.fruit ? fruitReady(world, tx, ty, this.now) : true;
    if (fruit && this.inSeason(fruit) && fruitHeld) {
      ctx.fillStyle = fruit.color;
      // Its own salt, and not the one that chose the width or the one that
      // nudged the bush sideways: a plant whose fruit rearranged itself when it
      // got a pixel wider would be one roll pretending to be two, which is the
      // note on `peak` above.
      const pick = decoHash(tx, ty, world.seed ^ 0x5b17);
      const spots = fruit.spots[Math.floor(pick * fruit.spots.length) % fruit.spots.length];
      for (const [dx, row] of spots) {
        const r = Math.max(0, Math.min(rows.length - 1, row));
        const half = rows[r];
        // Clamped to the row it landed on, the orbs' rule and for the orbs'
        // reason: a table written against a four-wide bush is reused verbatim on
        // the three-wide ones the peak roll also makes, and an unclamped berry
        // would hang in the grass beside a narrow one.
        ctx.fillRect(cx + Math.max(-(half - 1), Math.min(half - 1, dx)), top + r, 1, 1);
      }
    }
    void night; // the palette already carries the hour; the flag is the signature

    ctx.globalAlpha = prev;
  }

  /** A rock: low enough to see over, tall enough to sit in the world rather
   *  than on the floor plan.
   *
   *  Which silhouette comes off a fraction of the tile hash that isn't the one
   *  nudging it sideways — the same reason the mushrooms use a second fraction.
   *  Sharing one would tie shape to position and every crag in the world would
   *  stand a pixel left of centre.
   *
   *  WHICH SILHOUETTES ARE AVAILABLE is the region's, like its tuft marks and its
   *  crown rows. A region says which of them its ground breaks into; the shapes
   *  themselves live up in ROCK_SHAPES, because a silhouette is a drawing. */
  /** A stump, and a log lying in the grass. Old wood, and the only standing
   *  things in the game you cannot gather (content/tiles.ts §STUMP).
   *
   *  THE ART CARRIES THE RULE HERE. Everything else on this floor that looks like
   *  wood hands you wood, so these have to say "already gone back to the ground"
   *  in their own drawing or the affordance breaks whatever DESIGN.md says. Three
   *  things do it: the grey (weathered, never fresh), the moss, and the fact that
   *  nothing is square — no cut ends, no stacking, no straight edges.
   *
   *  A LOG IS WIDER THAN ITS TILE, at 21px on a 16px cell, and that is the point
   *  rather than an accident: length is the whole read of a log, and one drawn
   *  inside its cell came out a lump. Safe because the raised pass is queued and
   *  flushed after ALL terrain — a tree's crown already overhangs by more than
   *  this. It is also why deadwood cells may not touch (sim/world.ts
   *  §deadIsLoneliest): two of these side by side would genuinely overlap. */
  private drawDeadwood(
    world: WorldState,
    tx: number,
    ty: number,
    night: boolean,
    isLog: boolean,
  ): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    const grid = isLog ? DEADWOOD_ART.log : DEADWOOD_ART.stump;
    const w = grid[0].length;
    // Half a pixel of jitter is not available, so the log gets the wider swing:
    // a row of them all centred on their cells would read as a grid however
    // irregular the scatter that placed them.
    const jx = Math.floor(h * (isLog ? 5 : 3)) - (isLog ? 2 : 1);
    const cx = Math.round(this.sceneX(tx)) + jx;
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    const left = cx - Math.floor(w / 2);
    const top = base - grid.length;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;

    // The region's own timber, at HALF the pull its standing trunks get. A fallen
    // birch really is the pale thing on that floor and a fen log really is nearly
    // black, so taking the region is right — but taking all of it would draw
    // fresh bark, and every one of these has been down for years.
    const trunk = scatterSkin(world.seed, world.homestead.spot, tx, ty)?.trunk;
    const weather: Tint | undefined = trunk
      ? { color: trunk.color, amount: trunk.amount * 0.5 }
      : undefined;
    const mix = (hex: string): string => (weather ? mixHex(hex, weather) : hex);

    // Grey-brown and stated outright, the same way the rock's greys are: the
    // region pulls all of them one direction, so weathering stays one decision.
    const ink: Record<string, string> = {
      t: mix(night ? "#6b6055" : "#a2937f"), // the cut face, catching the light
      r: mix(night ? "#574d44" : "#8a7c69"), // heartwood, a shade under it
      b: mix(night ? "#4e463d" : "#7d7060"), // the body
      d: mix(night ? "#3a342d" : "#5f554a"), // and its underside
      // MOSS IS NOT WEATHERED — it is the living thing on top of the dead one, so
      // it takes none of the region's timber tint. It is also the single pixel
      // doing the most work on this sprite: wood with moss on it is wood nobody
      // is going to try to pick up.
      m: night ? "#3f5a3a" : "#6d9455",
    };

    ctx.fillStyle = "rgba(0,0,0,0.16)"; // it lies ON the grass
    ctx.fillRect(left + 1, base - 1, w - 2, 2);
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        ctx.fillStyle = ink[ch];
        ctx.fillRect(left + c, top + r, 1, 1);
      }
    }
    ctx.globalAlpha = prev;
  }

  private drawRock(world: WorldState, tx: number, ty: number, t: number, night: boolean): void {
    const ctx = this.ctx;
    /** Apply the region's weathering, or leave the stone alone. */
    const mix = (hex: string, t: Tint | undefined): string => (t ? mixHex(hex, t) : hex);
    const h = decoHash(tx, ty, world.seed);
    // One region and not a blend, for the third time and the same reason: a
    // stone is an object and takes a side. Half a shard fading into half a
    // boulder is not a rock anybody could name. The side is the one it came out
    // of (`scatterSkin`), like the tree and the mushroom.
    const here = scatterSkin(world.seed, world.homestead.spot, tx, ty);
    const stone = here?.stone;
    const kinds = stone?.shapes ?? STONES_DEFAULT;
    const shape = ROCK_SHAPES[kinds[Math.floor(((h * 43) % 1) * kinds.length) % kinds.length]];
    const rows = shape.rows;
    const jx = Math.floor(h * 3) - 1;
    const cx = Math.round(this.sceneX(tx)) + jx;
    const base = Math.round(this.sceneY(ty) + TILE / 2);
    const height = rows.length + 2;
    // The contact shadow and the dark foot go on the BOTTOM row's width, not the
    // widest — a foot sized to the widest row stuck out from under a shape that
    // narrows towards the ground, and every rock read as standing on its own
    // little dark plinth. The soft shadow gets one pixel of spill either side,
    // which is all a contact shadow is.
    const low = rows[rows.length - 1];

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, height);

    this.footShadow(cx, base, (low + 1) * 2, here?.rake ?? this.rake, height);

    // The greys stay stated here — day and night, lit, body and shaded — and the
    // region pulls all four the same direction. That is the whole reason `stone`
    // carries a TINT rather than a palette: weathering is one decision, and a
    // region that had to restate the lighting to change the colour would drift
    // out of step with the rock everywhere else the first time either moved.
    const weather = stone?.tint;
    const body = mix(night ? "#5e6068" : "#8d8a84", weather);
    const lit = mix(night ? "#74767e" : "#a8a49c", weather);
    const foot = mix(night ? "#4a4c54" : "#6f6c66", weather);
    const top = base - height;
    ctx.fillStyle = body;
    for (let r = 0; r < rows.length; r++) {
      ctx.fillRect(cx - rows[r], top + r, rows[r] * 2, 1);
    }
    // Light from the upper left as everywhere else, and bounded by the shape's own
    // length — the crag is six rows and the flat stone four, so a literal 4 here
    // would read off the end of the shorter array.
    //
    // AND IT PULLS BACK AS IT DESCENDS, which the tree and the bush were given in
    // the straight-edge sweep and the rock was not. That sweep asked "what else
    // is a round thing whose shading is an axis-aligned rectangle", checked the
    // rock's GEOMETRY — the even-width rows, the contact shadow — and never
    // checked its highlight, which was the very fault being swept for.
    //
    // Every lit row began at `cx - rows[r] + 1` and ran `rows[r] - 2` wide, so
    // its right edge landed on `cx - 2` on EVERY row whatever the row's width: a
    // straight vertical seam down the middle of a round object, which is a lit
    // panel stuck to a stone rather than light falling across one. The left edge
    // follows the silhouette, so only the right edge was ever wrong — and that is
    // exactly what made it hard to see and easy to keep.
    //
    // Half the row's half-width at the bottom of the lit run, scaled linearly,
    // which on shapes this small is a one-pixel step per row. One pixel is all a
    // curve needs at five pixels of radius; the tree's own note says the same
    // thing at three times the size.
    ctx.fillStyle = lit;
    const litTo = Math.min(3, rows.length - 2);
    for (let r = 1; r <= litTo; r++) {
      const back = Math.floor((r / litTo) * rows[r] * 0.5);
      ctx.fillRect(cx - rows[r] + 1, top + r, Math.max(1, rows[r] - 2 - back), 1);
    }
    ctx.fillStyle = foot;
    ctx.fillRect(cx - low, base - 2, low * 2, 1); // it sits ON the ground

    // The facet. One pixel at the top of the lit shoulder — the same upper-left
    // the lit rows already assume, so the glint sits where the light was always
    // coming from rather than announcing a second light source.
    //
    // FLAT, NOT ADDITIVE, and that is the correction that made it champagne. Run
    // through the additive pass — the way the sparks, the orbs and the fireflies
    // all go — it lands on a lit row that is already pale and CLIPS: red
    // saturates first, so the one thing the pixel loses is its hue. It came out
    // white, which is a source's colour and a gem's, and a gem is a material
    // claim this does not get to make (it still gathers plain `stone`).
    //
    // Additive is for things that EMIT. A caught highlight is simply the colour
    // of the light that fell on it, so it is painted: the hex arrives intact and
    // the stone stays a stone with the region's light on it.
    //
    // TWO PIXELS DOWN THE FACE, not one on it. A single lit pixel is a POINT —
    // it reads as a bright speck sitting on the stone, and at this size a speck
    // is what a firefly is. A highlight on a faceted rock runs along the EDGE
    // of a face, so a short run down the same face says "this side is turned to
    // the light" where a dot says "something small is glowing here".
    //
    // The lower one is dimmer, which is the whole reason two is better than one
    // and not merely bigger: a run of equal pixels is a stripe, and the falloff
    // is what makes it a surface catching light at an angle. Same lesson the
    // sparkle's arms taught a few passes back.
    if (stone?.glint) {
      const g = stone.glint;
      const breath = g.twinkle
        ? 0.58 + 0.24 * (0.5 + 0.5 * Math.sin((t / g.twinkle + h * 6.3) * Math.PI * 2))
        : 0.8;
      const gx = cx - rows[1] + 1;
      ctx.fillStyle = g.color;
      ctx.globalAlpha = prev * breath;
      ctx.fillRect(gx, top + 1, 1, 1);
      ctx.globalAlpha = prev * breath * 0.5;
      ctx.fillRect(gx, top + 2, 1, 1);
      ctx.globalAlpha = prev;
    }

    // The piece that came off it: body and one lit row, and NO dark foot of its
    // own. At two rows tall a foot line is half the object, and the first version
    // read as a grey dash lying in the grass a couple of pixels from the stone
    // rather than as a piece of it.
    if (shape.chip !== undefined) {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(cx + shape.chip, base - 2, 3, 1);
      ctx.fillStyle = body;
      ctx.fillRect(cx + shape.chip, base - 4, 3, 2);
      ctx.fillStyle = lit;
      ctx.fillRect(cx + shape.chip, base - 4, 2, 1);
    }

    ctx.globalAlpha = prev;
  }

  /** The Humming Cube. A cube, and the only correct amount of embellishment is
   *  none — DESIGN calls it a structure and a landmark, and everything about
   *  finding it is that you walked far enough to see a thing that has no
   *  business being there.
   *
   *  Drawn as a flat-topped box with two shaded faces: one light source, upper
   *  left, like every other raised thing in this file. It is ONE CELL, so there
   *  is no banding hazard here — but note that the edges are drawn on the box's
   *  own silhouette rather than on the tile, which is the same rule stated a
   *  different way (CLAUDE.md §per-cell edges).
   *
   *  It breathes. Very slightly, and on a slow cycle — the hum made visible for
   *  anybody playing muted, which is most people on a phone. It is a shimmer of
   *  brightness rather than a change of size: scaling pixel art is how you get
   *  unequal eyes and vanishing outlines (CLAUDE.md §Sprite rendering), and this
   *  is drawn at integer rects for exactly that reason. */
  private drawCube(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const cx = Math.round(this.sceneX(tx));
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, CUBE_H);

    // Built the way furniture is built (drawFurniture, above): a TOP SURFACE
    // lifted clear of the ground plus a NEAR FACE showing the height, which is
    // what makes a low object read as three-dimensional in a 3/4 view. A single
    // flat slab was tried first and came back looking like a headstone.
    const px = cx - CUBE_W / 2;
    const deep = 6; // how much of the top surface you see from here
    const topY = base - CUBE_H - deep;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(px + 1, base - 1, CUBE_W - 2, 2);

    // The pulse: a 0..1 triangle on a four-second cycle. Brightness only — the
    // rects stay integer and the sprite never scales (CLAUDE.md §Sprite
    // rendering), so nothing resamples off the grid.
    const t = (performance.now() - this.t0) / 1000;
    const lift = Math.round(Math.abs(((t / 2) % 2) - 1) * 3);
    const shift = (c: [number, number, number]) => `rgb(${c[0] + lift}, ${c[1] + lift}, ${c[2] + lift * 2})`;

    ctx.fillStyle = night ? shift([44, 47, 62]) : shift([70, 74, 90]); // near face
    ctx.fillRect(px, base - CUBE_H, CUBE_W, CUBE_H);
    ctx.fillStyle = night ? shift([60, 64, 84]) : shift([90, 95, 114]); // top
    ctx.fillRect(px, topY, CUBE_W, deep);

    // The silhouette, hard, for the reason furniture gets one: without it a
    // grey-blue box on grass at dusk is a smudge. Drawn on the OBJECT's edge and
    // never per cell — it is one cell, but the rule is the rule (CLAUDE.md).
    ctx.fillStyle = "rgba(0,0,0,0.40)";
    ctx.fillRect(px, topY, CUBE_W, 1);
    ctx.fillRect(px, base - 1, CUBE_W, 1);
    ctx.fillRect(px, topY, 1, CUBE_H + deep);
    ctx.fillRect(px + CUBE_W - 1, topY, 1, CUBE_H + deep);
    ctx.fillStyle = "rgba(0,0,0,0.20)"; // the lip where the top meets the face
    ctx.fillRect(px + 1, base - CUBE_H, CUBE_W - 2, 1);
    ctx.fillStyle = night ? shift([76, 81, 104]) : shift([116, 122, 146]); // sunlit far edge
    ctx.fillRect(px + 1, topY + 1, CUBE_W - 2, 1);

    ctx.globalAlpha = prev;
  }

  // --- The found places' props (Phase 7b) ---------------------------------------
  //
  // Three standing things, drawn in the cube's idiom: integer rects only, a near
  // face plus whatever top surface you can see from a 3/4 view, and a hard
  // silhouette so none of them is a smudge at dusk. No scale(), no rotate() — a
  // rod leaning against the light is a staircase of 1px rects and not a
  // transform (CLAUDE.md §Sprite rendering).
  //
  // None of them animates. The cube pulses because the cube is doing something;
  // these are objects somebody left, and the stillness is most of what says so.

  /** A rod stuck in a bank at a lean. The lean is the whole sprite — a vertical
   *  pole is a fence post, and there are a dozen of these round one pond. */
  private drawPole(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const cx = Math.round(this.sceneX(tx));
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, POLE_H);

    // Which way it leans is a property of WHERE it is, not of when you looked, so
    // the pond's dozen poles lean in different directions and stay that way.
    const lean = decoHash(tx, ty, 0x9c1) % 2 === 0 ? 1 : -1;
    ctx.fillStyle = night ? "#5b472e" : "#8a6b45";
    for (let i = 0; i < POLE_H; i++) {
      // One pixel of lean every third row: over fourteen rows that is a rod at
      // about twenty degrees, which reads as propped rather than as falling.
      ctx.fillRect(cx + lean * Math.floor(i / 3), base - 1 - i, 2, 1);
    }
    // The bank end, darker, so it looks pushed INTO the ground rather than laid
    // on top of it.
    ctx.fillStyle = night ? "#3f3120" : "#6f5537";
    ctx.fillRect(cx - 1, base - 2, 3, 2);

    ctx.globalAlpha = prev;
  }

  /** A box on a post. The flag is UP on a day there is something in it, which is
   *  diegetic and not UI: it is a thing the mailbox does, visible only if you are
   *  standing in front of it, and it names nothing. A marker on a map would be the
   *  UI spoiling a secret; a flag on the actual box is how you know there is post. */
  private drawMailbox(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const cx = Math.round(this.sceneX(tx));
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, MAILBOX_H);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(cx - 3, base - 1, 6, 2);

    // The post.
    ctx.fillStyle = night ? "#4a4034" : "#6d5f4c";
    ctx.fillRect(cx - 1, base - MAILBOX_H, 2, MAILBOX_H);

    // The box: a near face, a top, and a slot. Nine wide, which is more than the
    // post and less than the tile — it has to overhang its own stem to read as a
    // box on a stick rather than as a sign.
    const bx = cx - 5;
    const by = base - MAILBOX_H - 6;
    ctx.fillStyle = night ? "#525c66" : "#7d8a94";
    ctx.fillRect(bx, by + 2, 10, 6);
    ctx.fillStyle = night ? "#5e6a76" : "#8c99a3";
    ctx.fillRect(bx, by, 10, 2);
    ctx.fillStyle = night ? "#3b434c" : "#65707a";
    ctx.fillRect(bx + 2, by + 4, 6, 1); // the little door's seam

    ctx.fillStyle = "rgba(0,0,0,0.40)";
    ctx.fillRect(bx, by, 1, 8);
    ctx.fillRect(bx + 9, by, 1, 8);
    ctx.fillRect(bx, by + 7, 10, 1);

    // The flag, and the one thing here that varies. Reads the same total function
    // the sim reads (content/found.ts) — not a copy of the rule, the rule itself.
    const site = foundAt(world.seed, world.homestead.spot, tx, ty);
    if (site?.kind === "mailbox" && letterFor(world.seed, site.index, dayNumber(this.now))) {
      ctx.fillStyle = night ? "#8f4a45" : "#c4635c";
      ctx.fillRect(bx + 10, by - 3, 2, 6);
      ctx.fillRect(bx + 9, by - 3, 3, 2);
    }

    ctx.globalAlpha = prev;
  }

  /** One flight of stone steps, rising left to right across the three tiles the
   *  found place occupies, and stopping in the air.
   *
   *  EACH TILE DRAWS ITS OWN TWO STEPS, not the whole flight. The first version
   *  drew four steps per cell and came out as a BAR CHART — three identical
   *  sawteeth in a row, which is the per-cell rule (CLAUDE.md) in its most literal
   *  form: a thing that reads as one continuous object may not be repeated per
   *  cell. The step's height therefore comes from where the tile is in the FLIGHT,
   *  which is a world coordinate, so the courses run unbroken across it. */
  private drawStair(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const cx = Math.round(this.sceneX(tx));
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else ctx.globalAlpha = prev * this.hideFactor(world, tx, ty, STAIR_H);

    // Which part of the flight this cell is. Falls back to the middle if the site
    // has gone — a step drawn at the wrong height is better than a thrown frame.
    const site = foundAt(world.seed, world.homestead.spot, tx, ty);
    const dx = site ? tx - site.x : 0;

    const face = night ? "#7d7970" : "#b8b2a6";
    const top = night ? "#8a857b" : "#c8c2b6";
    for (let k = 0; k < 2; k++) {
      const step = (dx + 1) * 2 + k; // 0..5 across the three tiles, left to right
      const h = 3 + step * 3;
      const x = cx - 8 + k * 8;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x, base - 1, 8, 2);
      ctx.fillStyle = face;
      ctx.fillRect(x, base - h, 8, h);
      ctx.fillStyle = top;
      ctx.fillRect(x, base - h - 2, 8, 2);
      // The riser's own edge, on the left where this step actually rises above the
      // one before it — never on both sides of every cell.
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, base - h - 2, 1, h + 2);
    }
    ctx.globalAlpha = prev;
  }

  // --- Tent -------------------------------------------------------------------
  private collectTent(world: WorldState, night: boolean): void {
    // YOUR tent, up until you take it down — and up again if you tear your own
    // house down, because you have to live somewhere and the flag only records
    // that you asked (sim/types.ts homestead.struckAt). `playerHome` is only
    // consulted once you HAVE asked, so the common case costs nothing.
    if (world.homestead.struckAt === null || playerHome(world) === null) {
      this.raised.push({
        y: world.homestead.originY,
        bias: BIAS_TERRAIN,
        draw: () => this.tentAt(world.homestead.originX, world.homestead.originY, night, TENTS[world.player.form]),
      });
    }
    // A newcomer's tent, for as long as they're waiting on a house. The SAME
    // tent as the player's, deliberately: you started in one too, and the beat
    // reads as "they're where you were" rather than as a quest marker. What
    // differs is only what they've hung on it (content/tents.ts) — and yours
    // differs the same way, which is what keeps that reading true. It goes when
    // the commission is stamped, which is the visible half of housing them
    // (sim/commission.ts).
    for (const c of world.commissions ?? []) {
      if (c.stampedAt !== null) continue;
      const { x, y } = c.tent;
      // Off the arrival's row, not off the commission: the commission stores an
      // index precisely so live saves survive edits to that table (sim/types.ts).
      const arrival = ARRIVALS[c.index];
      const def = TENTS[arrival?.form ?? "office"];
      this.raised.push({ y, bias: BIAS_TERRAIN, draw: () => this.tentAt(x, y, night, def) });
    }
  }

  /** The art lives in render/tent.ts (the contact sheet draws the same code);
   *  this is only the tile-to-screen half of it. */
  private tentAt(ox: number, oy: number, night: boolean, def: TentDef): void {
    const cx = Math.round(this.sceneX(ox));
    const ground = Math.round(this.sceneY(oy) + TILE / 2);
    drawTent(this.ctx, cx, ground, night, def);
  }

  // --- The museum's cases ---------------------------------------------------
  // Not furniture and not build cells: an exhibit's plinth is derived from the
  // collection every frame (sim/museum.ts), so there is nothing to place, erase
  // or migrate, and the room can never disagree with the record.
  //
  // Collected once per frame off the whole collection rather than per visible
  // tile, unlike walls and furniture. The list is at most seventeen long and
  // only ever grows by donation, so the screen-bounded trick those need would
  // be more machinery than the thing it bounds.
  private collectPlinths(world: WorldState): void {
    for (const run of plinthRuns(world)) {
      this.raised.push({ y: run.y, bias: BIAS_TERRAIN, draw: () => this.drawCase(run) });
    }
  }

  /** One case, however many cells long, drawn as ONE SURFACE.
   *
   *  THE WHOLE POINT OF TAKING A RUN RATHER THAN A CELL. Six pedestals drawn
   *  cell by cell would put a light edge and a dark edge against each other at
   *  every seam and stripe the case into a venetian blind — the per-cell edges
   *  band rule, which has now caught us on ground bevels, wall side-runs and
   *  roof shingles. So the outline goes on the ENDS of the run only, and the
   *  top surface is one rect across the lot.
   *
   *  Pale stone rather than the building's finish: whitewash walls behind
   *  whitewash cases would leave the exhibits floating on nothing. */
  private drawCase(run: PlinthRun): void {
    const ctx = this.ctx;
    const px = Math.round(this.sceneX(run.x0) - TILE / 2) + CASE_INSET_X;
    const pw = (run.x1 - run.x0 + 1) * TILE - CASE_INSET_X * 2;
    const py = Math.round(this.sceneY(run.y) - TILE / 2) + CASE_INSET_FAR;
    const base = Math.round(this.sceneY(run.y) + TILE / 2) - CASE_INSET_NEAR;
    const H = CASE_HEIGHT;

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(px + 1, base - 1, pw - 2, 2);
    ctx.fillStyle = CASE_SHADE; // the near face, the height you actually see
    ctx.fillRect(px, base - H, pw, H);
    ctx.fillStyle = CASE_STONE; // the top
    ctx.fillRect(px, py - H, pw, base - py);

    // Silhouette: top, bottom, and the two ENDS. Nothing between cells.
    const oy = py - H;
    const oh = base - py + H;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(px, oy, pw, 1);
    ctx.fillRect(px, base - 1, pw, 1);
    ctx.fillRect(px, oy, 1, oh);
    ctx.fillRect(px + pw - 1, oy, 1, oh);
    ctx.fillStyle = "rgba(0,0,0,0.20)"; // the lip where the top meets the face
    ctx.fillRect(px + 1, base - H, pw - 2, 1);
    ctx.fillStyle = CASE_LIT; // sunlit far edge, unbroken along the whole run
    ctx.fillRect(px + 1, oy + 1, pw - 2, 1);

    // And the exhibits themselves. ONE GENERIC FORM, not per-exhibit art: what
    // makes a doorknob different from a bell here is the placard, which is
    // words, which is free. Seventeen little sprites would be seventeen things
    // to draw badly.
    // Standing ON the top surface, which means the FRONT of it. Anchored to
    // the far edge instead (the first attempt) they rose clear of the case's
    // back and read as a row of fence posts behind it rather than objects on
    // a shelf — in this projection "on top of" is drawn as "further down".
    const deep = base - py;
    for (const p of run.on) {
      const cx = Math.round(this.sceneX(p.x));
      const foot = oy + deep - 2;
      const eh = deep - 1;
      ctx.fillStyle = "rgba(0,0,0,0.18)"; // its own small shadow on the stone
      ctx.fillRect(cx - 3, foot, 7, 1);
      ctx.fillStyle = EXHIBIT_DARK;
      ctx.fillRect(cx - 3, foot - eh, 6, eh);
      ctx.fillStyle = EXHIBIT_LIT; // lit top and left, so it isn't a flat chip
      ctx.fillRect(cx - 3, foot - eh, 6, 1);
      ctx.fillRect(cx - 3, foot - eh, 1, eh);
    }
  }

  // --- Movers -----------------------------------------------------------------
  // No longer sorted among themselves — they go into the one raised pass so a
  // villager sorts against trees and (soon) walls, not only against each other.
  private collectMovers(
    world: WorldState,
    t: number,
    night: boolean,
    layer: Layer,
    now: number,
  ): void {
    // Filtered by LAYER rather than skipped wholesale, which is what this used
    // to do back when everyone was a surface creature. Drawing the town from
    // below would put its whole daily round in your tunnel, walking through
    // solid rock; drawing the Mole from above would stand him in a field. Same
    // check, all three directions now: only Sidra is ever on the sky layer, and
    // only when she is home (sim/cosmos.ts).
    for (const v of world.villagers) {
      if ((v.layer ?? "surface") !== layer) continue;
      // And by PRESENCE, which used to be a form check right here: the Ghost
      // only shows at real-clock night (DESIGN §secret forms). It moved to
      // sim/presence.ts the moment there was a second visitor with hours,
      // because the renderer was never the only thing asking — tap targeting
      // and keyboard talk were finding villagers this pass had skipped.
      if (!present(v, now)) continue;
      this.raised.push({ y: v.y, bias: BIAS_MOVER, draw: () => this.drawVillager(v, t, night) });
    }
    this.raised.push({ y: world.player.y, bias: BIAS_MOVER, draw: () => this.drawPlayer(world.player, t) });
  }

  private drawEntity(
    key: string,
    mood: Mood,
    frame: SpriteFrame,
    wx: number,
    wy: number,
    facing: 1 | -1,
    moving: boolean,
    t: number,
    alpha = 1,
    look?: LookDef,
  ): void {
    const ctx = this.ctx;
    const cx = this.sceneX(wx);
    const feetY = this.sceneY(wy) + TILE / 2 + 1;
    // Walk bob: a small vertical hop + squash while moving; a slow breathe idle.
    const bob = moving ? -Math.abs(Math.sin(t * 9)) * 1.5 : Math.sin(t * 1.6) * 0.3;
    const squash = moving ? Math.max(0, Math.sin(t * 9)) * 0.08 : 0;

    // Contact shadow, same 2px band every standing thing in the world gets — the
    // movers were the only ones without one, so the player and the whole town
    // floated over ground that trees and rocks were sitting on.
    //
    // It does NOT take the bob. A shadow that hops with the sprite is attached
    // to the creature rather than to the ground, which is the opposite of what a
    // contact shadow is for; leaving it on the floor is what makes the hop read
    // as a hop. It DOES take `alpha`, so the Ghost's shadow is as faint at night
    // as the Ghost.
    //
    // WIDER THAN THE FEET, and that is the whole of why it reads. The first
    // version copied the tree's 9px band, which is the same mistake 8c made
    // reaching for `shade`: a creature is a teardrop, ~9px across at the base
    // and wider above, so a 9px shadow lands entirely BEHIND the body and the
    // change was invisible on screen. A contact shadow is only legible where it
    // spills past the silhouette.
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - 7, feetY - 2, 14, 2);
    ctx.globalAlpha = prevAlpha;

    const sprite = this.cache.frame(key, mood, frame, look);
    drawSpriteQuantized(this.ctx, this.cache, sprite, cx, feetY + bob, SPRITE, SPRITE, facing, squash, alpha);
  }

  private drawPlayer(p: Player, t: number): void {
    const key = creatureKey("adult", p.form);
    const moving = p.target !== null;
    const frame: SpriteFrame = moving && Math.sin(t * 9) > 0 ? "alt" : "base";
    // No look: the player is their form's canon art, always. The six buttons on
    // the character screen have to show what you will actually be.
    this.drawEntity(key, "neutral", frame, p.x, p.y, p.facing, moving, t);
  }

  private lastPos = new Map<string, { x: number; y: number }>();

  private drawVillager(v: Villager, t: number, night: boolean): void {
    const key = creatureKey("adult", v.form);
    // Infer "moving" by comparing this frame's position to last — no coupling
    // to the schedule internals, just a plausible bob when it actually walks.
    const prev = this.lastPos.get(v.id);
    const moving = !v.fixed && !!prev && Math.hypot(v.x - prev.x, v.y - prev.y) > 0.001;
    this.lastPos.set(v.id, { x: v.x, y: v.y });
    const alpha = v.form === "ghost" && night ? 0.85 : 1;
    // Derived from their id every frame, and that is free — `lookFor` is a hash
    // and a table read, and the baked frames behind it are cached by look id.
    this.drawEntity(key, "neutral", "base", v.x, v.y, v.facing, moving, t, alpha, lookFor(v.id, v.form));
  }

  // --- Action-target affordance ----------------------------------------------
  /** The reticle. It draws `actionTarget` and nothing else: the sim decides what
   *  ACT will touch, so the tile you see is always the tile the button acts
   *  on — including its colour, which says which of the three things will
   *  happen. Never re-derive the target here.
   *
   *  CORNER TICKS, not a closed square. The underfoot tools (dig, plant, water)
   *  target the tile you are standing on, and a sprite is smaller than a tile —
   *  so a full stroked rect doesn't overlap the character, it ENCLOSES it, and
   *  the player reads as being in a cage rather than standing somewhere. Opening
   *  the middle of each side lets the sprite out while the four corners still
   *  fix the tile exactly. Drawing it under the raised pass instead does nothing
   *  for this (the sprite never crossed the line) and hides the gather reticle
   *  behind the tree it's pointing at — measured, both times. */
  /** Where you tapped, while you are still on your way there.
   *
   *  Tap-to-move has been the primary verb since the vertical slice and has
   *  never drawn anything: you tapped open ground, the sprite started walking,
   *  and whether it understood you was something you found out by watching. On a
   *  phone, with a thumb over the spot you just touched, that is the one piece of
   *  feedback the whole control scheme was missing.
   *
   *  A DIAMOND, so it cannot be confused with either overlay it shares the screen
   *  with — the reticle's corner ticks say "ACT reaches here" and the bed
   *  candidates' closed square says "pick one of these". This says neither; it is
   *  a place you are going.
   *
   *  It is not a map pin and does not survive arrival: it exists only while
   *  `player.target` does, so it vanishes the moment you get there rather than
   *  leaving a mark on the world. Nothing is stored and nothing else reads it.
   *  One pixel, no fill, no glow — the interface has no circles, gradients or
   *  blur in it (ROADMAP §8a). */
  private drawWalkTarget(world: WorldState, t: number): void {
    const target = world.player.target;
    if (!target) return;
    const ctx = this.ctx;
    const cx = this.sceneX(target.x);
    const cy = this.sceneY(target.y);
    // Shrinks as you close on it, so the mark reads as being consumed by your
    // arrival rather than switching off. Distance in tiles, capped so a walk
    // across the map doesn't start out enormous.
    const away = Math.min(6, Math.hypot(target.x - world.player.x, target.y - world.player.y));
    const r = Math.round(2 + (TILE * 0.28 - 2) * (away / 6));
    if (r < 2) return;
    // A slow breath, the same idle the other overlays use, so it reads as UI
    // rather than as something standing in the field.
    ctx.strokeStyle = `rgba(255,255,255,${(0.45 + 0.2 * Math.sin(t / 260)).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, Math.round(cy - r) + 0.5);
    ctx.lineTo(Math.round(cx + r) + 0.5, Math.round(cy) + 0.5);
    ctx.lineTo(Math.round(cx) + 0.5, Math.round(cy + r) + 0.5);
    ctx.lineTo(Math.round(cx - r) + 0.5, Math.round(cy) + 0.5);
    ctx.closePath();
    ctx.stroke();
  }

  private drawTargetTile(world: WorldState): void {
    const ctx = this.ctx;
    // No held tool exists any more (ROADMAP §one button): the reticle draws
    // the DEFAULT tap, which is the promise the ACT button keeps.
    const target = actionTarget(world, null, this.now);
    const px = Math.round(this.sceneX(target.x) - TILE / 2);
    const py = Math.round(this.sceneY(target.y) - TILE / 2);
    const x0 = px + 0.5;
    const y0 = py + 0.5;
    const s = TILE - 1;
    const arm = Math.max(3, Math.round(TILE * 0.3)); // how far each corner runs
    ctx.strokeStyle = TARGET_COLOR[target.kind];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [cx, cy, sx, sy] of [
      [x0, y0, 1, 1],
      [x0 + s, y0, -1, 1],
      [x0, y0 + s, 1, -1],
      [x0 + s, y0 + s, -1, -1],
    ] as [number, number, number, number][]) {
      ctx.moveTo(cx + sx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * arm);
    }
    ctx.stroke();
  }

  /** Mark the beds you could give someone while you're choosing.
   *
   *  A closed, breathing square rather than the reticle's corner ticks — these
   *  mark FURNITURE, not the ground under your feet, so there's no sprite to
   *  cage and a full outline reads more clearly as "pick one of these". The
   *  pulse is what says the game is waiting on you; a static outline in a
   *  transient mode looks like part of the scenery.
   *
   *  Drawn LAST, over the roofs, and that's required rather than sloppy: a bed
   *  only qualifies if its room is enclosed, so every bed worth picking is under
   *  a roof by definition. Marking them beneath the roof pass would hide exactly
   *  the ones the player is being asked to choose between.
   *
   *  Ones that don't qualify are drawn too, dimmer and in warning colour, rather
   *  than hidden: a bed you can see but aren't offered is a question ("why not
   *  that one?") the panel can answer, where a bed that simply isn't marked
   *  reads as the game failing to notice it. */
  /** Doorsteps nobody can stand on, marked while build mode is open.
   *
   *  The mark goes on the STEP, not on the door: the door is fine, and the cell
   *  in front of it is the thing to clear. Pointing at the door would be the
   *  game complaining without saying where to dig.
   *
   *  It's a warning and not a refusal, deliberately. Placement is never blocked
   *  on a judgement about whether a building is any good (DESIGN: structure is
   *  the only gate, and even that belongs to a commission, not to the tools) —
   *  and a half-built house legitimately has sealed doorways all the time. What
   *  this fixes is that the failure was previously SILENT: a villager who can't
   *  path home snaps there and looks completely normal doing it, so a player
   *  could never have found this out by watching. */
  private drawBlockedSteps(t: number): void {
    if (this.blockedSteps.length === 0) return;
    const ctx = this.ctx;
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(t * 2.2));
    for (const s of this.blockedSteps) {
      const px = Math.round(this.sceneX(s.x) - TILE / 2) + 0.5;
      const py = Math.round(this.sceneY(s.y) - TILE / 2) + 0.5;
      ctx.strokeStyle = `rgba(255,150,90,${pulse.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, TILE - 1, TILE - 1);
      // A cross through it, so it reads as "not this" at a glance rather than
      // as one more highlight competing with the reticle.
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + TILE - 4, py + TILE - 4);
      ctx.moveTo(px + TILE - 4, py + 3);
      ctx.lineTo(px + 3, py + TILE - 4);
      ctx.stroke();
    }
  }

  /** The piece in hand, outlined and breathing.
   *
   *  Its own colour and not the blocked step's orange, which means "not this":
   *  a lifted piece is the opposite, the one thing a tap WILL affect. Brighter
   *  and slower than the doorstep's pulse, because it is a state you are in
   *  rather than a warning you should notice and clear. */
  private drawLifted(t: number): void {
    if (this.lifted.length === 0) return;
    const ctx = this.ctx;
    const pulse = 0.55 + 0.35 * Math.abs(Math.sin(t * 1.6));
    ctx.strokeStyle = `rgba(255,235,170,${pulse.toFixed(3)})`;
    ctx.lineWidth = 1;
    for (const c of this.lifted) {
      const px = Math.round(this.sceneX(c.x) - TILE / 2) + 0.5;
      const py = Math.round(this.sceneY(c.y) - TILE / 2) + 0.5;
      ctx.strokeRect(px, py, TILE - 1, TILE - 1);
    }
  }

  private drawHomeCandidates(t: number): void {
    if (this.homeCandidates.length === 0) return;
    const ctx = this.ctx;
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2));
    for (const c of this.homeCandidates) {
      const px = Math.round(this.sceneX(c.x) - TILE / 2) + 0.5;
      const py = Math.round(this.sceneY(c.y) - TILE / 2) + 0.5;
      ctx.strokeStyle = c.ok
        ? `rgba(160,255,150,${pulse.toFixed(3)})`
        : `rgba(255,170,120,${(pulse * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, TILE - 1, TILE - 1);
    }
  }
}
