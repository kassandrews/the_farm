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

import type { WorldState, Villager, Player, BuildCell, FurnitureCell, Tool } from "../sim/types";
import { tileAt, playerTile, actionTarget } from "../sim/game";
import type { ActionTarget } from "../sim/game";
import { cropDef, ripeStage } from "../content/crops";
import { tileDef, PLANK, GRASS, TREE, ROCK, BEDROCK, ORE_VEIN, SHAFT, DARK_TREE, HUM_CUBE } from "../content/tiles";
import { skinDef } from "../content/skins";
import type { SkinClass } from "../content/skins";
import { decoHash, chunkCoordOf, getChunk, CHUNK, tileKey } from "../sim/world";
import { wallMask, blockedDoorsteps, CONNECT_N, CONNECT_E, CONNECT_S, CONNECT_W } from "../sim/structures";
import { furnitureDef, footprint } from "../content/furniture";
import { plinthRuns } from "../sim/museum";
import type { PlinthRun } from "../sim/museum";
import { rooms } from "../sim/rooms";
import type { Room } from "../sim/rooms";
import { tintAt, isNight, skyPhaseAt } from "../sim/time";
import { present } from "../sim/presence";
import { creatureKey } from "../content/canon/sprites";
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
  shaft: "rgba(200,230,255,0.95)", // the way down, or the daylight above you
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
/** The doorstep: a flagstone slab, deliberately NOT a wood finish, so it reads
 *  as a step laid at the threshold rather than as more of the house. */
const STEP_STONE = "#9a9187";
const STEP_LIP = "#7d746b";
const STEP_DEPTH = 5; // how far out from the doorway it reaches
const STEP_INSET = 3; // margin at each end, so it's a step and not a full edge
/** Wall left standing either side of a doorway cut into a side run's top
 *  surface, so the opening reads as a gap in the wall rather than as the run
 *  simply stopping. */
const DOOR_JAMB = 3;
/** How far the roof is pulled back over a side doorway. */
const DOOR_NOTCH = 4;

/** Art heights in scene px for the two scenery pieces. Both exceed TILE, which
 *  is what makes them overhang the tile behind and read as standing up. */
const TREE_H = 24;
const ROCK_H = 13;
/** Taller than a rock, shorter than a tree. It should read as built rather than
 *  grown, and as somebody's, without being tall enough to hide behind. Its width
 *  is a whole tile: it is a CUBE, and the first draft was eleven pixels wide and
 *  seventeen tall, which on screen was a headstone. */
const CUBE_H = 14;
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
  return id === TREE || id === ROCK || id === DARK_TREE || id === HUM_CUBE ? GRASS : id;
}

/** Which material class a built tile is finished in, or null for terrain that
 *  has no finish (grass, water, a tree). Terrain is never re-skinned — a finish
 *  is something you chose when you built, not a filter over the world. */
function finishClassOf(id: number): SkinClass | null {
  if (id === PLANK) return "wood";
  return null;
}

/** A built tile's appearance under the town's currently selected finish. Falls
 *  back to the tile's own colours when the tile isn't a built one. */
function finishFor(world: WorldState, id: number): { name: string; color: string; top?: string; shade?: string } | null {
  const cls = finishClassOf(id);
  if (!cls) return null;
  const skin = skinDef(world.skins.selected[cls]);
  return { name: tileDef(id).name, color: skin.color, top: skin.top, shade: skin.shade };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cache = new SpriteCache();
  private cam = { x: 0, y: 0 };
  private sw = 0;
  private sh = 0;
  private scale = 3; // scene px → CSS px
  private t0 = performance.now();
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

  /** Match the backing buffer to the viewport at an integer-ish scale, keeping
   *  the world's tiles a comfortable size on phone and desktop alike. */
  resize(): void {
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    // Aim for ~11 tiles across the short edge; clamp the scale to integers so
    // upscaling never blurs.
    const short = Math.min(cssW, cssH);
    this.scale = Math.max(2, Math.round(short / (11 * TILE)));
    this.sw = Math.ceil(cssW / this.scale);
    this.sh = Math.ceil(cssH / this.scale);
    this.canvas.width = this.sw;
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Snap the camera to the player (called once on load to avoid a pan-in). */
  snapCamera(world: WorldState): void {
    this.cam.x = world.player.x;
    this.cam.y = world.player.y;
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
    // Smooth camera follow.
    this.cam.x += (world.player.x - this.cam.x) * 0.12;
    this.cam.y += (world.player.y - this.cam.y) * 0.12;

    const phase = skyPhaseAt(now);
    const night = isNight(phase);
    // Which world we are drawing. Below, nearly every pass in this method is a
    // SURFACE fact — crops, the tent, the museum's cases, roofs, villagers —
    // and skipping them is not an optimisation but the point: the underground
    // is the one continuous world with none of that in it.
    const under = world.player.layer === "under";

    // Sky/base wash — a flat ground tone behind the tiles for any gaps. There
    // is no sky underground, so the gap colour is the dark itself.
    ctx.fillStyle = under ? "#0b0908" : night ? "#26324a" : "#7fae54";
    ctx.fillRect(0, 0, this.sw, this.sh);

    if (!under) this.syncRoofs(world);

    // Flat ground first, then everything with height in one depth-sorted pass.
    this.raised.length = 0;
    this.blockedSteps.length = 0;
    this.litShafts.length = 0;
    this.drawTiles(world, t, night, under);
    if (this.buildView && !under) this.drawBuildGrid();
    if (!under) {
      this.drawCrops(world, now);
      this.collectTent(world, night);
      this.collectPlinths(world);
    }
    this.collectMovers(world, t, night, under, now);
    this.flushRaised();

    // The dark goes over the scene but UNDER the reticle. The reticle is the
    // promise (ROADMAP), and a promise you can't read at the far edge of your
    // own lamp is worse than no promise — it's the button pointing somewhere
    // you have to guess about.
    if (under) this.drawDark(world, now);
    this.drawTargetTile(world);
    if (!under) {
      this.drawBlockedSteps(t);
      this.drawHomeCandidates(t);
    }

    // Real-clock day/night wash over the whole scene. Not underground: a cave
    // looks the same at 3am as at noon, and the only dark down there that means
    // anything is the one your lamp is holding back.
    const tint = tintAt(now);
    if (tint.overlay && !under) {
      ctx.fillStyle = tint.overlay;
      ctx.fillRect(0, 0, this.sw, this.sh);
    }
  }

  // --- Tilemap ----------------------------------------------------------------
  // Drawn chunk by chunk: the visible tile span is widened to whole chunks and
  // each is touched via getChunk, so the camera streams chunks in as it moves
  // and only what's on screen is ever generated. Within a chunk, tiles still go
  // through tileAt so player edits (which live outside the chunk) win.
  private drawTiles(world: WorldState, t: number, night: boolean, under: boolean): void {
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
        getChunk(world, cx, cy, under ? "under" : "surface");
        this.drawChunkTiles(world, cx, cy, x0, x1, y0, y1, t, night, under);
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
    under: boolean,
  ): void {
    const ctx = this.ctx;
    const tyStart = Math.max(y0, cy * CHUNK);
    const tyEnd = Math.min(y1, cy * CHUNK + CHUNK - 1);
    const txStart = Math.max(x0, cx * CHUNK);
    const txEnd = Math.min(x1, cx * CHUNK + CHUNK - 1);

    for (let ty = tyStart; ty <= tyEnd; ty++) {
      for (let tx = txStart; tx <= txEnd; tx++) {
        if (under) {
          this.drawUnderCell(world, tx, ty);
          continue;
        }
        const id = tileAt(world, tx, ty);
        // Resource nodes stand up, so the flat pass draws only the ground they
        // stand ON and defers the node itself to the raised pass. Without this
        // a tree is trapped inside its own 16px cell and the world reads flat.
        if (id === TREE || id === ROCK || id === DARK_TREE || id === HUM_CUBE) {
          const x = tx;
          const y = ty;
          this.raised.push({
            y,
            bias: BIAS_TERRAIN,
            draw: () => {
              if (id === ROCK) this.drawRock(world, x, y, night);
              else if (id === HUM_CUBE) this.drawCube(world, x, y, night);
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
        // Built tiles wear the town's selected finish — appearance is a free
        // property of the tile, never a separate item (DESIGN §Materials).
        const def = finishFor(world, groundId) ?? tileDef(groundId);
        const px = Math.round(this.sceneX(tx) - TILE / 2);
        const py = Math.round(this.sceneY(ty) - TILE / 2);
        ctx.fillStyle = def.color;
        ctx.fillRect(px, py, TILE, TILE);
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
        // Water gets a couple of drifting ripple pixels.
        if (def.name === "Water") {
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          const rx = px + 3 + ((Math.sin(t * 1.5 + tx * 1.7 + ty) * 0.5 + 0.5) * (TILE - 6)) | 0;
          ctx.fillRect(rx, py + 6, 2, 1);
        } else if (def.name === "Mushrooms") {
          // A couple of caps on the grass, placed by the tile's stable hash so
          // a patch that appeared overnight sits still once you're looking.
          const h = decoHash(tx, ty, world.seed);
          const mx = px + 4 + Math.floor(h * 6);
          const my = py + 6 + Math.floor((h * 37) % 5);
          const cap = night ? "#9c5348" : "#d16a56";
          for (const [ox, oy, w] of [[0, 0, 3] as const, [4, 3, 2] as const]) {
            ctx.fillStyle = "#f0e3d0"; // stalk
            ctx.fillRect(mx + ox + 1, my + oy + 1, 1, 2);
            ctx.fillStyle = cap;
            ctx.fillRect(mx + ox, my + oy, w, 1);
            ctx.fillStyle = "#f7efe2"; // a speck on the cap
            ctx.fillRect(mx + ox + 1, my + oy, 1, 1);
          }
        } else if (def.name === "Grass") {
          // Stable tuft speckle so grass reads as texture, not flat paint.
          const h = decoHash(tx, ty, world.seed);
          if (h > 0.72) {
            ctx.fillStyle = night ? "#5f8a48" : "#79a94c";
            const gx = px + 2 + Math.floor(h * 9);
            const gy = py + 4 + Math.floor((h * 53) % 9);
            ctx.fillRect(gx, gy, 2, 1);
            ctx.fillRect(gx + 1, gy - 1, 1, 1);
          }
        }
        if (id === SHAFT) this.drawShaftMouth(px, py);
        this.drawDoorstep(world, tx, ty, px, py);
      }
    }
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
  }

  // --- Crops ------------------------------------------------------------------
  private drawCrops(world: WorldState, now: number): void {
    const ctx = this.ctx;
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
        // Ripe: greens up top, an orange shoulder breaking the soil.
        ctx.fillStyle = leaf;
        ctx.fillRect(cx - 2, base - 7, 1, 2);
        ctx.fillRect(cx, base - 8, 1, 2);
        ctx.fillRect(cx + 2, base - 7, 1, 2);
        ctx.fillStyle = green;
        ctx.fillRect(cx - 1, base - 6, 3, 2);
        // The shoulder is the ONLY thing that differs between varieties, and it
        // is read from the crop table rather than branched on here — one plant,
        // three palettes, so a fourth costs a row and no drawing code.
        ctx.fillStyle = def.ripeColor;
        ctx.fillRect(cx - 1, base - 4, 3, 4);
        ctx.fillStyle = def.ripeShade;
        ctx.fillRect(cx - 1, base - 1, 3, 1);
        // A gentle "ready" bob marker.
        if (Math.sin(now / 400) > 0.6) {
          ctx.fillStyle = "#fff3c8";
          ctx.fillRect(cx, base - 11, 1, 2);
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
    const skin = skinDef(cell ? cell.finish : world.skins.selected.wood);
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
      const sideOn = Boolean(mask & CONNECT_N) && Boolean(mask & CONNECT_S);
      if (sideOn !== (dy === 0)) continue;

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
  private drawWall(world: WorldState, tx: number, ty: number, cell: BuildCell): void {
    const ctx = this.ctx;
    const skin = skinDef(cell.finish);
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

    // A wall with run-mates both behind AND in front is running away from the
    // camera — a SIDE wall. Its face is hidden by the piece in front of it, so
    // drawing one gives every enclosure a uniform 24px band on all four sides
    // and the whole house reads as an earth berm rather than a building. Draw
    // its top surface instead: consecutive cells' bands are exactly TILE apart,
    // so a run joins into one seamless strip.
    const sideOn = mask & CONNECT_N && mask & CONNECT_S;
    if (sideOn) {
      // Flat, with no per-cell bottom edge: a side run is one continuous
      // surface, and an edge drawn on every cell stripes it exactly the way
      // the tile bevel used to stripe open ground.
      ctx.fillStyle = skin.top;
      ctx.fillRect(px, top, TILE, TILE);
    } else {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px, top, TILE, STOREY);
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
      ctx.fillStyle = "#3a2620";
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
        ctx.fillRect(px, top + DOOR_JAMB, TILE, TILE - DOOR_JAMB * 2);
      } else {
        // A hole in the wall, with the wall carried over it as a lintel — so a
        // doorway reads as cut INTO a run rather than as a gap in it.
        ctx.fillRect(px + 4, top + WALL_CAP + 3, TILE - 8, STOREY - WALL_CAP - 3);
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
    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else if (this.hides(world, tx, ty, TREE_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

    // Contact shadow — without it a tall sprite floats instead of standing.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - 4, base - 2, 9, 2);

    // The grove's trunks are the dark wood itself, which is the only place in
    // the game where the finish and the material are the same object. It reads
    // nearly black at night, and it is meant to: you find the grove by daylight
    // and meet her in a stand you can barely make out.
    ctx.fillStyle = dark ? (night ? "#2b1d16" : "#3f2a1e") : night ? "#4a3628" : "#6b4a33";
    ctx.fillRect(cx - 1, base - 10, 3, 10);
    ctx.fillStyle = dark ? (night ? "#1f150f" : "#2f1e15") : night ? "#3a2a1e" : "#573a28";
    ctx.fillRect(cx + 1, base - 10, 1, 10);

    // Crown as per-row half-widths: an integer-rect blob, no ellipse maths and
    // nothing off the pixel grid (CLAUDE.md §Sprite rendering).
    const rows = [3, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 2]; // 14 rows + trunk = TREE_H
    const crown = dark ? (night ? "#1e2c1f" : "#2c3a2a") : night ? "#2f5233" : "#417a41";
    const crownLit = dark ? (night ? "#26361f" : "#3a4a34") : night ? "#3a6440" : "#57975a";
    const top = base - TREE_H;
    ctx.fillStyle = crown;
    for (let r = 0; r < rows.length; r++) {
      ctx.fillRect(cx - rows[r], top + r, rows[r] * 2, 1);
    }
    ctx.fillStyle = crownLit; // light from the upper left, as everywhere else
    for (let r = 1; r <= 6; r++) {
      ctx.fillRect(cx - rows[r] + 1, top + r, Math.max(2, rows[r] - 1), 1);
    }

    ctx.globalAlpha = prev;
  }

  /** A rock: low enough to see over, tall enough to sit in the world rather
   *  than on the floor plan. */
  private drawRock(world: WorldState, tx: number, ty: number, night: boolean): void {
    const ctx = this.ctx;
    const h = decoHash(tx, ty, world.seed);
    const jx = Math.floor(h * 3) - 1;
    const cx = Math.round(this.sceneX(tx)) + jx;
    const base = Math.round(this.sceneY(ty) + TILE / 2);

    const prev = ctx.globalAlpha;
    if (this.buildView) ctx.globalAlpha = prev * BUILD_VIEW_FADE;
    else if (this.hides(world, tx, ty, ROCK_H)) ctx.globalAlpha = prev * HIDDEN_FADE;

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(cx - 5, base - 2, 11, 2);

    const rows = [3, 5, 6, 6, 7, 7, 7, 7, 7, 6, 5];
    const body = night ? "#5e6068" : "#8d8a84";
    const lit = night ? "#74767e" : "#a8a49c";
    const top = base - ROCK_H;
    ctx.fillStyle = body;
    for (let r = 0; r < rows.length; r++) {
      ctx.fillRect(cx - rows[r], top + r, rows[r] * 2, 1);
    }
    ctx.fillStyle = lit;
    for (let r = 1; r <= 4; r++) {
      ctx.fillRect(cx - rows[r] + 1, top + r, Math.max(2, rows[r] - 2), 1);
    }
    ctx.fillStyle = night ? "#4a4c54" : "#6f6c66";
    ctx.fillRect(cx - 5, base - 2, 11, 1); // it sits ON the ground

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
    under: boolean,
    now: number,
  ): void {
    // Filtered by LAYER rather than skipped wholesale, which is what this used
    // to do back when everyone was a surface creature. Drawing the town from
    // below would put its whole daily round in your tunnel, walking through
    // solid rock; drawing the Mole from above would stand him in a field. Same
    // check, both directions.
    const layer = under ? "under" : "surface";
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
  ): void {
    const cx = this.sceneX(wx);
    const feetY = this.sceneY(wy) + TILE / 2 + 1;
    // Walk bob: a small vertical hop + squash while moving; a slow breathe idle.
    const bob = moving ? -Math.abs(Math.sin(t * 9)) * 1.5 : Math.sin(t * 1.6) * 0.3;
    const squash = moving ? Math.max(0, Math.sin(t * 9)) * 0.08 : 0;
    const sprite = this.cache.frame(key, mood, frame);
    drawSpriteQuantized(this.ctx, this.cache, sprite, cx, feetY + bob, SPRITE, SPRITE, facing, squash, alpha);
  }

  private drawPlayer(p: Player, t: number): void {
    const key = creatureKey("adult", p.form);
    const moving = p.target !== null;
    const frame: SpriteFrame = moving && Math.sin(t * 9) > 0 ? "alt" : "base";
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
    this.drawEntity(key, "neutral", "base", v.x, v.y, v.facing, moving, t, alpha);
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
