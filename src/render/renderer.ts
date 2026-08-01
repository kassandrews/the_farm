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

import type { WorldState, Villager, Player, BuildCell, FurnitureCell, Tool, Layer } from "../sim/types";
import { tileAt, playerTile, actionTarget } from "../sim/game";
import type { ActionTarget } from "../sim/game";
import { cropDef, ripeStage } from "../content/crops";
import {
  tileDef,
  FLOOR,
  GRASS,
  TREE,
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
import { skinDef } from "../content/skins";
import type { SkinDef } from "../content/skins";
import {
  decoHash,
  groundTone,
  chunkCoordOf,
  getChunk,
  CHUNK,
  tileKey,
  regionSkin,
  foundAt,
  floorFinish,
  FLOOR_DEFAULT_FINISH,
} from "../sim/world";
import { dayNumber } from "../sim/found";
import { letterFor } from "../content/found";
import {
  wallMask,
  blockedDoorsteps,
  shellFinish,
  showsTop,
  CONNECT_N,
  CONNECT_E,
  CONNECT_S,
  CONNECT_W,
} from "../sim/structures";
import { furnitureDef, footprint } from "../content/furniture";
import { plinthRuns } from "../sim/museum";
import type { PlinthRun } from "../sim/museum";
import { rooms } from "../sim/rooms";
import type { Room } from "../sim/rooms";
import { tintAt, isNight, skyPhaseAt } from "../sim/time";
import { seasonAt } from "../sim/seasons";
import { scenePalette, seasonSkin, biomeSkin, mixHex, type ScenePalette } from "./palette";
import { zoomLadder } from "./zoom";
import { forEachGrainMark } from "./grain";
import { BROADLEAF } from "../content/biomes";
import { present } from "../sim/presence";
import { creatureKey } from "../content/canon/sprites";
import { lookFor } from "../content/looks";
import type { LookDef } from "../content/looks";
import type { Mood, SpriteFrame } from "../content/canon/sprites";
import { SpriteCache, drawSpriteQuantized } from "./sprites";

const TILE = 16; // scene px per world tile (matches sprite CELL)
const SPRITE = 16; // sprite draw size

/** Reticle colour per action kind — the colour is the promise. Faint white means
 *  ACT would do nothing here, so an unlit square is honest rather than broken. */
const TARGET_COLOR: Record<ActionTarget["kind"], string> = {
  harvest: "rgba(255,220,120,0.9)", // something ripe underfoot
  gather: "rgba(160,255,150,0.9)", // a tree or rock in reach
  tool: "rgba(255,255,255,0.85)", // the held tool has work here
  read: "rgba(190,205,255,0.9)", // the errands board is within reach
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
/** How a surface is grained, per material class (render/grain.ts).
 *
 *  BOTH PERIODS ARE COPRIME WITH TILE, and that is not a taste call — it is the
 *  per-cell edges rule, which a plank seam is otherwise a textbook violation of.
 *  Read grain.ts's docblock before changing either number; 4 or 8 would look
 *  nearly the same in a mockup and stripe the floor at the tile pitch in game.
 *
 *  Wood boards are narrower and LONGER than flagstones are, and the length is
 *  what separates the two surfaces — more than the colour does and more than the
 *  course height does. The first version butted its boards every 13px and
 *  photographed as brickwork: a five-px course broken every thirteen IS a brick
 *  bond, whatever colour it is painted. A board is milled from a tree and runs
 *  most of a room, so it butts every 47 — three tiles, and rarely twice in one
 *  view. Flagstones are cut and laid, and break every nine.
 *
 *  `bond` is how many courses before the joints line up again — 3 for boards, a
 *  stepped bond; 2 for stone, the running bond every brick wall is laid in. It
 *  replaced a random per-course offset, which is what a floor looks like if you
 *  have never seen one: joints crowding, drifting, sometimes landing two pixels
 *  apart. Regularity is the thing that reads as workmanship. */
const GRAIN = {
  wood: { course: 5, joint: 47, bond: 3, seam: 0.13, joint_ink: 0.2 },
  stone: { course: 6, joint: 9, bond: 2, seam: 0.11, joint_ink: 0.17 },
  // Cloth has no grain. A rug is woven, not built, and a seam across one would
  // read as two rugs — the pieces that wear cloth get their pattern from their
  // own draw path (drawFurniture), not from this.
  cloth: null,
} as const;
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
const DOOR_JAMB = 3;
/** How far the roof is pulled back over a side doorway. */
const DOOR_NOTCH = 4;

// Art heights in scene px. A tree exceeds TILE, which is what makes it overhang
// the tile behind and read as standing up; a rock deliberately doesn't (see
// ROCK_SHAPES) — it is scenery you step around rather than get behind.
/** The trunk, in pixels. A tree's full height is this plus its crown's row count,
 *  which now varies per biome (content/biomes.ts) — so nothing may assume 24. */
const TRUNK_H = 10;

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
const ROCK_SHAPES: readonly { readonly rows: readonly number[]; readonly chip?: number }[] = [
  { rows: [2, 4, 5, 5, 4] }, // a boulder, sat down in the grass
  { rows: [1, 3, 4, 4, 4, 3] }, // a crag: narrower, and it stands up
  { rows: [3, 4, 4, 3], chip: 5 }, // a flat stone that broke, with the piece beside it
];
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
    id === ROCK ||
    id === DARK_TREE ||
    id === HUM_CUBE ||
    id === JUNK_PILE ||
    id === MUSHROOM ||
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
): { name: string; color: string; top?: string; shade?: string } | null {
  if (!isFinishedTile(id)) return null;
  const skin = skinDef(floorFinish(world, x, y));
  return { name: tileDef(id).name, color: skin.color, top: skin.top, shade: skin.shade };
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
  private canvas: HTMLCanvasElement;
  /** Rebuilt every frame; see the Raised docblock. */
  private raised: Raised[] = [];
  /** Flattened plan view: on while a build tool is held (DESIGN §Structures —
   *  plan view while you build, 3/4 while you live there). */
  private buildView = false;
  /** Mirrors the HUD's held ACT tool, for the reticle. */
  private tool: Tool = "dig";
  /** Doorsteps nothing can stand on, collected during the flat pass while build
   *  mode is open — see drawBlockedSteps. */
  private blockedSteps: { x: number; y: number }[] = [];
  /** Beds offered while choosing someone a home — see setHomeCandidates. */
  private homeCandidates: { x: number; y: number; ok: boolean }[] = [];
  /** Shafts collected during the underground flat pass, so the daylight pools
   *  in drawDark cost one entry per VISIBLE hole rather than a scan of every
   *  edit the player has ever made. Same trick as blockedSteps above. */
  private litShafts: { x: number; y: number }[] = [];
  /** Lamps collected during the flat pass, on whichever layer is being drawn —
   *  the one thing in the game that makes light where it is put (Phase 5a).
   *  Bounded by the screen, exactly like litShafts above. */
  private litLamps: { x: number; y: number }[] = [];
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
  /** Room id → every cell it roofs, for drawing edges only where a roof ends. */
  private roofCover = new Map<string, Set<string>>();
  /** Room id → current roof opacity, eased toward 0 while you're inside. Kept
   *  across frames so walking through a door FADES the roof rather than
   *  snapping it, which is the whole feel of the cutaway. */
  private roofAlpha = new Map<string, number>();

  /** Toggle the flattened build view. */
  setBuildView(on: boolean): void {
    this.buildView = on;
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

  /** The held ACT tool. The reticle needs it because which tile ACT lands on
   *  depends on the tool (see actionTarget). */
  setTool(tool: Tool): void {
    this.tool = tool;
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
    // Smooth camera follow, of the player plus whatever build mode has panned to.
    this.cam.x += (world.player.x + this.pan.x - this.cam.x) * 0.12;
    this.cam.y += (world.player.y + this.pan.y - this.cam.y) * 0.12;

    // The frame's clock, kept for anything drawn deeper down that has to agree
    // with the SIM about what day it is. The mailbox's flag is the first: it was
    // written as Date.now() and disagreed with the sim by a week under the
    // screenshot harness, which pins the page clock to a fixed afternoon. Two
    // clocks for one fact is how a flag ends up up on a box that is empty.
    this.now = now;
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
    this.blockedSteps.length = 0;
    this.litShafts.length = 0;
    this.litLamps.length = 0;
    this.drawTiles(world, t, night, layer);
    if (this.buildView && ground) this.drawBuildGrid();
    if (ground) {
      this.drawCrops(world, now);
      this.collectTent(world, night);
      this.collectPlinths(world);
    }
    this.collectMovers(world, t, night, layer, now);
    this.flushRaised();

    // The dark goes over the scene but UNDER the reticle. The reticle is the
    // promise (ROADMAP), and a promise you can't read at the far edge of your
    // own lamp is worse than no promise — it's the button pointing somewhere
    // you have to guess about.
    if (under) this.drawDark(world, now);
    this.drawTargetTile(world);
    if (ground) {
      this.drawBlockedSteps(t);
      this.drawHomeCandidates(t);
    }

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
    }
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
          id === ROCK ||
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
              if (id === ROCK) this.drawRock(world, x, y, night);
              else if (id === HUM_CUBE) this.drawCube(world, x, y, night);
              else if (id === POLE) this.drawPole(world, x, y, night);
              else if (id === MAILBOX) this.drawMailbox(world, x, y, night);
              else if (id === STAIR) this.drawStair(world, x, y, night);
              // A dark tree is a tree drawn in the other palette — one flag, not
              // a second function. It is the same tree in every other way
              // (content/nodes.ts), and two draw paths would let them drift into
              // looking like two different plants.
              else this.drawTree(world, x, y, night, id === DARK_TREE);
            },
          });
        }
        // Anything STANDING on this tile. Looked up per visible tile rather
        // than by walking world.build, so the cost is bounded by the screen and
        // not by how much the player has ever built.
        const key = tileKey(tx, ty);
        const built = world.build[key];
        if (built) {
          const x = tx;
          const y = ty;
          this.raised.push({ y, bias: BIAS_TERRAIN, draw: () => this.drawWall(world, x, y, built) });
          // Only while building: a blocked doorstep is a mistake you make with
          // the build tools, and it's the build tools that can fix it. Asked
          // per visible door, so the cost is bounded by the screen like the
          // rest of this pass.
          if (this.buildView && built.id === "door") {
            for (const step of blockedDoorsteps(world, tx, ty)) this.blockedSteps.push(step);
          }
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
            draw: () => this.drawFurniture(ax, ay, piece),
          });
          if (piece.id === "lamp") this.litLamps.push({ x: tx, y: ty });
        }
        // Roofs are derived, not stored, so they come from the room index
        // rather than from the build layer.
        const roofRoom = this.roofIndex.get(key);
        if (roofRoom && !this.buildView) {
          const x = tx;
          const y = ty;
          const alpha = this.roofAlpha.get(roofRoom.id) ?? 1;
          const covered = this.roofCover.get(roofRoom.id)!;
          if (alpha > 0.02) {
            this.raised.push({ y, bias: BIAS_ROOF, draw: () => this.drawRoofCell(world, x, y, covered, alpha) });
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
        const def =
          finishFor(world, groundId, tx, ty) ??
          biomeSkin(
            seasonSkin(tileDef(groundId), groundId, this.palette),
            groundId,
            regionSkin(world.seed, world.homestead.spot, tx, ty),
          );
        const px = Math.round(this.sceneX(tx) - TILE / 2);
        const py = Math.round(this.sceneY(ty) - TILE / 2);
        // Open ground rolls. `groundTone` is smooth noise on the WORLD
        // coordinate at an 11-and-29-tile wavelength, so a light patch is half a
        // screen across and its edges can never line up with a cell — the band
        // rule's own prescribed fix (CLAUDE.md), and the reason this mixes
        // continuously instead of stepping into shades. Neighbouring tiles differ
        // by well under a percent; the field has shape and no seams.
        //
        // Grass and sand only. A laid floor is a made surface and should be
        // exactly as flat as it was laid, so anything wearing a finish, and every
        // built tile, keeps its colour untouched.
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
        ctx.fillStyle =
          def.name === "Grass" || def.name === "Sand"
            ? mixHex(def.color, {
                color: "#000000",
                amount: (1 - groundTone(tx, ty, world.seed)) * 0.14,
              })
            : def.color;
        ctx.fillRect(px, py, TILE, TILE);
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
          ctx.fillStyle = shallow ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.25)";
          const rx = px + 3 + ((Math.sin(t * 1.5 + tx * 1.7 + ty) * 0.5 + 0.5) * (TILE - 6)) | 0;
          ctx.fillRect(rx, py + 6, 2, 1);
          // A second, slower glint in the shallows only — off the WORLD
          // coordinate and on its own phase, so it's texture rather than a
          // per-cell mark that would tile the surf into squares (CLAUDE.md).
          if (shallow) {
            const sx = px + 2 + ((Math.sin(t * 0.9 + tx * 0.7 - ty * 1.3) * 0.5 + 0.5) * (TILE - 5)) | 0;
            ctx.fillRect(sx, py + TILE - 7, 1, 1);
          }
        } else if (def.name === "Grass") {
          // Stable tuft speckle so grass reads as texture, not flat paint.
          const h = decoHash(tx, ty, world.seed);
          // 0.72 before: a tuft on 28% of cells, which at three shapes leaves
          // each shape on under one cell in ten and the field still mostly bare.
          if (h > 0.62) {
            // Placed by a hash on WORLD coordinates and sparse, so it is texture
            // and not a per-cell edge — the band rule (CLAUDE.md) does not reach
            // it, and a seasonal recolour doesn't change that.
            // Tinted with the region, because the speckle is texture ON the
            // ground and a tuft that stayed meadow-green over bleached scrub
            // detaches from the surface it belongs to.
            ctx.fillStyle = mixHex(
              this.palette.tuft,
              regionSkin(world.seed, world.homestead.spot, tx, ty).tuft,
            );
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
            const shape = Math.floor((h * 311) % 3);
            if (shape === 0) {
              ctx.fillRect(gx, gy, 2, 1);
              ctx.fillRect(gx + 1, gy - 1, 1, 1);
            } else if (shape === 1) {
              ctx.fillRect(gx + 1, gy, 1, 1);
              ctx.fillRect(gx + 1, gy - 1, 1, 1);
              ctx.fillRect(gx, gy - 2, 1, 1);
            } else {
              ctx.fillRect(gx, gy, 1, 1);
              ctx.fillRect(gx + 2, gy, 1, 1);
              ctx.fillRect(gx + 1, gy - 1, 1, 1);
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
        if (id === MUSHROOM) this.drawMushrooms(tx, ty, px, py, world.seed, night);
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
  private drawMushrooms(tx: number, ty: number, px: number, py: number, seed: number, night: boolean): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, seed);
    const cap = night ? "#9c5348" : "#d16a56";
    const lit = night ? "#b3695c" : "#e58a72";
    const gills = night ? "#71392f" : "#a34c3c";
    const stalk = night ? "#bdb0a0" : "#f0e3d0";

    // One mushroom. `big` gets the full overhang; the companion is a button that
    // hasn't opened yet, so a two-mushroom cell reads as a patch of one kind
    // rather than as two objects that happen to share a tile.
    const one = (x: number, y: number, big: boolean): void => {
      ctx.fillStyle = "rgba(0,0,0,0.14)"; // it stands ON the grass
      ctx.fillRect(x, y + (big ? 5 : 3), big ? 5 : 3, 1);
      if (big) {
        ctx.fillStyle = lit;
        ctx.fillRect(x + 1, y, 3, 1);
        ctx.fillStyle = cap;
        ctx.fillRect(x, y + 1, 5, 1);
        ctx.fillStyle = gills;
        ctx.fillRect(x, y + 2, 5, 1);
        ctx.fillStyle = stalk;
        ctx.fillRect(x + 2, y + 3, 1, 2);
        ctx.fillStyle = "#f7efe2"; // one speck, so the cap has a highlight
        ctx.fillRect(x + 1, y + 1, 1, 1);
      } else {
        ctx.fillStyle = lit;
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillStyle = cap;
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(x + 2, y, 1, 1);
        ctx.fillStyle = gills;
        ctx.fillRect(x, y + 1, 3, 1);
        ctx.fillStyle = stalk;
        ctx.fillRect(x + 1, y + 2, 1, 1);
      }
    };

    // Kept inside the cell on purpose: the flat pass paints in row order, so a
    // cap that overhung would be half painted over by the tile drawn next.
    const mx = px + 3 + Math.floor(h * 4);
    const my = py + 5 + Math.floor((h * 29) % 4);
    one(mx, my, true);
    // Whether there are two, on a fraction of the hash that isn't the one
    // placing the first — otherwise the crowded cells would all be the ones
    // where the big cap sits high and left.
    const second = (h * 61) % 1;
    if (second > 0.42) one(mx + 6, my + (second > 0.7 ? 3 : 2), false);
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
        draw: () => this.drawFurniture(ax, ay, piece),
      });
      if (piece.id === "lamp") this.litLamps.push({ x: tx, y: ty });
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
      const cy = this.sceneY(l.y) + TILE / 2 - LAMP_HEAD_H;
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
      for (const room of list) {
        const covered = new Set<string>([...room.interior, ...room.shell]);
        this.roofCover.set(room.id, covered);
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
  private hides(world: WorldState, tx: number, ty: number, artPx: number): boolean {
    const p = world.player;
    const overhang = (artPx - TILE) / TILE;
    // Only things IN FRONT of the player (larger y = nearer the camera) can
    // cover them, and only within the span the art actually reaches.
    return ty > p.y && ty - p.y <= overhang && Math.abs(tx - p.x) < 0.9;
  }

  /** One cell of a roof, sitting a storey above its footprint.
   *
   *  Roofs are derived from enclosure, never placed (DESIGN §Structures), so
   *  this draws whatever the flood-fill says is covered — interior and shell
   *  alike. Edges are drawn only where the roof actually ENDS: per-cell edges
   *  would tile the surface into a grid of boxes, the same mistake the ground
   *  bevel and the wall side-runs each made once already. */
  private drawRoofCell(world: WorldState, tx: number, ty: number, covered: Set<string>, alpha: number): void {
    const ctx = this.ctx;
    const cell = world.build[tileKey(tx, ty)];
    // A roof cell with no wall under it takes the DEFAULT, not whatever finish
    // happens to be loaded in the build bar. Reading the selection here was the
    // floor bug in miniature — a roof over an interior cell would restyle
    // itself the moment you picked up a different colour, while the walls
    // holding it up stayed put. A house should not change its hat when you
    // change your mind.
    const skin = skinDef(cell ? cell.finish : FLOOR_DEFAULT_FINISH);
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2) - STOREY;

    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;

    ctx.fillStyle = skin.shade;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "rgba(0,0,0,0.10)"; // push it clearly darker than its walls
    ctx.fillRect(px, py, TILE, TILE);

    // Shingle courses. Stepped off the WORLD row rather than the cell, so the
    // lines run unbroken across the whole roof instead of restarting per tile —
    // this is banding on purpose, the way the tent's canvas is striped, and it
    // is the difference between a roof and a brown lid.
    ctx.fillStyle = "rgba(0,0,0,0.11)";
    for (let i = 0; i < TILE; i++) {
      if ((ty * TILE + i) % 4 === 0) ctx.fillRect(px, py + i, TILE, 1);
    }

    const has = (dx: number, dy: number) => covered.has(tileKey(tx + dx, ty + dy));
    if (!has(0, -1)) {
      ctx.fillStyle = skin.top; // sunlit ridge along the far edge
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

    ctx.globalAlpha = prev;
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
  private drawFurniture(ax: number, ay: number, cell: FurnitureCell): void {
    const ctx = this.ctx;
    const def = furnitureDef(cell.id);
    const { w, h } = footprint(def, cell.facing);
    const skin = skinDef(cell.finish);
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

    ctx.fillStyle = "rgba(0,0,0,0.16)"; // sits ON the floor
    ctx.fillRect(px + 1, base - 1, pw - 2, 2);

    ctx.fillStyle = skin.shade; // the near face — this is the height you see
    ctx.fillRect(px, base - H, pw, H);
    ctx.fillStyle = skin.color; // the top, lifted clear of the floor
    ctx.fillRect(px, py - H, pw, base - py);

    // Outline the whole silhouette. Furniture wears the same finish as the
    // walls it stands against, so without a hard edge a furnished room is one
    // continuous tan mass and you can't tell architecture from objects. The top
    // surface and the near face meet flush, so the silhouette is a single rect.
    const oy = py - H;
    const oh = base - py + H;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(px, oy, pw, 1);
    ctx.fillRect(px, base - 1, pw, 1);
    ctx.fillRect(px, oy, 1, oh);
    ctx.fillRect(px + pw - 1, oy, 1, oh);
    ctx.fillStyle = "rgba(0,0,0,0.20)"; // the lip where the top meets the face
    ctx.fillRect(px + 1, base - H, pw - 2, 1);
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

        // THE TOP SURFACE IS A LITTLE ROOF, and it has to become something on
        // purpose. The generic path gives every piece a top the full depth of
        // its footprint, which is right for a table and wrong for a board: a
        // 16px lid over a 22px face read as a crate, and no amount of detail on
        // the face fixed it, because the lid was half the silhouette.
        //
        // A parish notice board has a little pitched roof over it to keep the
        // rain off the paper, so that is what that surface is. It costs nothing
        // — the block is already drawn — and it turns the heaviest part of the
        // shape from a mistake into the thing that identifies the object.
        //
        // One ridge and one eave, not a course of shingles. This is a single
        // object rather than a continuous surface, so the per-cell edges band
        // rule isn't in play; it's simply that a 16px roof has room for two
        // lines and looks like corrugation with more.
        ctx.fillStyle = skin.shade;
        ctx.fillRect(px, py - H, pw, deep);
        ctx.fillStyle = skin.top; // sunlit ridge along the far edge
        ctx.fillRect(px + 1, py - H + 1, pw - 2, 2);
        ctx.fillStyle = "rgba(0,0,0,0.22)"; // the eave, where the roof overhangs
        ctx.fillRect(px, py - H + deep - 1, pw, 1);

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
  private drawLamp(px: number, base: number, pw: number, skin: SkinDef): void {
    const ctx = this.ctx;
    const cx = px + Math.floor(pw / 2);
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
    else if (this.hides(world, tx, ty, STOREY)) ctx.globalAlpha = prev * HIDDEN_FADE;

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
        frame(px + 4, top + WALL_CAP + 3, TILE - 8, STOREY - WALL_CAP - 3);
      }
    }

    ctx.globalAlpha = prev;
  }

  /** A tree: trunk, layered crown, contact shadow. Two and a half tiles tall,
   *  so it overhangs the ground behind it and you can walk out of sight behind
   *  one. Jittered by the tile hash so a stand of trees isn't wallpaper. */
  private drawTree(world: WorldState, tx: number, ty: number, night: boolean, dark = false): void {
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
    const biome = dark
      ? null
      : regionSkin(world.seed, world.homestead.spot, tx, ty);

    // Silhouette and therefore HEIGHT, both from the region. Read before the fade
    // because how far a tree reaches up is what decides whether it's hiding you:
    // a fen willow is six pixels taller than a scrub bush, and asking about the
    // wrong height either fades a tree that isn't in the way or leaves you behind
    // one that is.
    const rows = biome ? biome.crownRows : BROADLEAF;
    // Empty half-width at the middle of each row (the blossom's dip over the
    // trunk), and how many rows come down beside the trunk to make that dip
    // legible. Both default to "solid crown, perched on top".
    const gaps = biome?.crownGaps;
    const overlap = biome?.crownOverlap ?? 0;
    const height = TRUNK_H + rows.length - overlap;

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else if (this.hides(world, tx, ty, height)) ctx.globalAlpha = prev * HIDDEN_FADE;

    // Contact shadow — without it a tall sprite floats instead of standing.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - 4, base - 2, 9, 2);

    // The grove's trunks are the dark wood itself, which is the only place in
    // the game where the finish and the material are the same object. It reads
    // nearly black at night, and it is meant to: you find the grove by daylight
    // and meet her in a stand you can barely make out.
    const bark = dark ? (night ? "#2b1d16" : "#3f2a1e") : night ? "#4a3628" : "#6b4a33";
    const barkDark = dark ? (night ? "#1f150f" : "#2f1e15") : night ? "#3a2a1e" : "#573a28";
    ctx.fillStyle = biome ? mixHex(bark, biome.trunk) : bark;
    ctx.fillRect(cx - 1, base - TRUNK_H, 3, TRUNK_H);
    ctx.fillStyle = biome ? mixHex(barkDark, biome.trunk) : barkDark;
    ctx.fillRect(cx + 1, base - TRUNK_H, 1, TRUNK_H);

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
      : mixHex(this.palette.crown, biome!.crown);
    const crownLit = dark
      ? night
        ? "#26361f"
        : "#3a4a34"
      : mixHex(this.palette.crownLit, biome!.crown);
    const top = base - height;
    ctx.fillStyle = crown;
    for (let r = 0; r < rows.length; r++) {
      const g = gaps?.[r] ?? 0;
      if (g > 0) {
        // Two lobes with the trunk between them. The gap is centred on the
        // trunk's own column (cx - g .. cx + g), so foliage sized to it meets
        // the bark rather than leaving a stripe of grass either side.
        ctx.fillRect(cx - rows[r], top + r, rows[r] - g, 1);
        ctx.fillRect(cx + g + 1, top + r, rows[r] - g - 1, 1);
      } else {
        ctx.fillRect(cx - rows[r], top + r, rows[r] * 2, 1);
      }
    }
    // Light from the upper left, as everywhere else. Bounded by the crown's own
    // length rather than by a literal 6: the scrub's is nine rows tall, and a lit
    // side that ran past the end read off the end of the array.
    ctx.fillStyle = crownLit;
    const litRows = Math.min(6, rows.length - 1);
    for (let r = 1; r <= litRows; r++) {
      // Light lands on the LEFT lobe when a row is split — the lit side is the
      // upper left of the mass, not the upper left of each piece of it.
      const g = gaps?.[r] ?? 0;
      const w = g > 0 ? rows[r] - g - 1 : Math.max(2, rows[r] - 1);
      if (w > 0) ctx.fillRect(cx - rows[r] + 1, top + r, w, 1);
    }

    ctx.globalAlpha = prev;
  }

  /** A rock: low enough to see over, tall enough to sit in the world rather
   *  than on the floor plan.
   *
   *  Which of the three (see ROCK_SHAPES) comes off a fraction of the tile hash
   *  that isn't the one nudging it sideways — the same reason the mushrooms use a
   *  second fraction. Sharing one would tie shape to position and every crag in
   *  the world would stand a pixel left of centre. */
  private drawRock(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    const shape = ROCK_SHAPES[Math.floor(((h * 43) % 1) * ROCK_SHAPES.length) % ROCK_SHAPES.length];
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
    else if (this.hides(world, tx, ty, height)) ctx.globalAlpha = prev * HIDDEN_FADE;

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - low - 1, base - 2, (low + 1) * 2, 2);

    const body = night ? "#5e6068" : "#8d8a84";
    const lit = night ? "#74767e" : "#a8a49c";
    const foot = night ? "#4a4c54" : "#6f6c66";
    const top = base - height;
    ctx.fillStyle = body;
    for (let r = 0; r < rows.length; r++) {
      ctx.fillRect(cx - rows[r], top + r, rows[r] * 2, 1);
    }
    // Light from the upper left as everywhere else, and bounded by the shape's own
    // length — the crag is six rows and the flat stone four, so a literal 4 here
    // would read off the end of the shorter array.
    ctx.fillStyle = lit;
    for (let r = 1; r <= Math.min(3, rows.length - 2); r++) {
      ctx.fillRect(cx - rows[r] + 1, top + r, Math.max(2, rows[r] - 2), 1);
    }
    ctx.fillStyle = foot;
    ctx.fillRect(cx - low, base - 2, low * 2, 1); // it sits ON the ground

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
    else if (this.hides(world, tx, ty, CUBE_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

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
    else if (this.hides(world, tx, ty, POLE_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

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
    else if (this.hides(world, tx, ty, MAILBOX_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

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
    else if (this.hides(world, tx, ty, STAIR_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

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
    this.raised.push({
      y: world.homestead.originY,
      bias: BIAS_TERRAIN,
      draw: () => this.drawTent(world.homestead.originX, world.homestead.originY, night),
    });
    // A newcomer's tent, for as long as they're waiting on a house. The SAME
    // tent as the player's, deliberately: you started in one too, and the beat
    // reads as "they're where you were" rather than as a quest marker. It goes
    // when the commission is stamped, which is the visible half of housing
    // them (sim/commission.ts).
    for (const c of world.commissions ?? []) {
      if (c.stampedAt !== null) continue;
      const { x, y } = c.tent;
      this.raised.push({ y, bias: BIAS_TERRAIN, draw: () => this.drawTent(x, y, night) });
    }
  }

  private drawTent(ox: number, oy: number, night: boolean): void {
    const ctx = this.ctx;
    const cx = Math.round(this.sceneX(ox));
    const baseY = Math.round(this.sceneY(oy) + TILE / 2);
    const canvas = night ? "#b06a4a" : "#d08a5a";
    const dark = night ? "#8a4f38" : "#a96844";
    const w = 20;
    const h = 15;
    // A simple ridge tent: a triangle canvas with a dark doorway. `r` counts
    // DOWN from the apex, so the half-width grows with r — computing it from
    // (h - r) instead pitches the tent upside down as a funnel, which is what
    // it did until the raised pass made it big enough to notice.
    for (let r = 0; r < h; r++) {
      const half = Math.round(((r + 1) / h) * (w / 2));
      ctx.fillStyle = r % 2 === 0 ? canvas : dark;
      ctx.fillRect(cx - half, baseY - h + r, half * 2, 1);
    }
    // Doorway.
    ctx.fillStyle = "#3a2620";
    ctx.fillRect(cx - 2, baseY - 6, 4, 6);
    // Pole tip.
    ctx.fillStyle = "#6e5138";
    ctx.fillRect(cx, baseY - h - 1, 1, 2);
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
    const cx = this.sceneX(wx);
    const feetY = this.sceneY(wy) + TILE / 2 + 1;
    // Walk bob: a small vertical hop + squash while moving; a slow breathe idle.
    const bob = moving ? -Math.abs(Math.sin(t * 9)) * 1.5 : Math.sin(t * 1.6) * 0.3;
    const squash = moving ? Math.max(0, Math.sin(t * 9)) * 0.08 : 0;
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
  private drawTargetTile(world: WorldState): void {
    const ctx = this.ctx;
    const target = actionTarget(world, this.tool);
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
