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

import type { WorldState, Villager, Player, BuildCell } from "../sim/types";
import { tileAt, playerTile, isRipe } from "../sim/game";
import { cropDef, ripeStage } from "../content/crops";
import { tileDef, PLANK, GRASS, TREE, ROCK } from "../content/tiles";
import { skinDef } from "../content/skins";
import type { SkinClass } from "../content/skins";
import { decoHash, chunkCoordOf, getChunk, CHUNK, tileKey } from "../sim/world";
import { wallMask, CONNECT_N, CONNECT_E, CONNECT_S, CONNECT_W } from "../sim/structures";
import { rooms } from "../sim/rooms";
import type { Room } from "../sim/rooms";
import { nodeNear } from "../sim/gather";
import { tintAt, isNight, skyPhaseAt } from "../sim/time";
import { creatureKey } from "../content/canon/sprites";
import type { Mood, SpriteFrame } from "../content/canon/sprites";
import { SpriteCache, drawSpriteQuantized } from "./sprites";

const TILE = 16; // scene px per world tile (matches sprite CELL)
const SPRITE = 16; // sprite draw size

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

/** Art heights in scene px for the two scenery pieces. Both exceed TILE, which
 *  is what makes them overhang the tile behind and read as standing up. */
const TREE_H = 24;
const ROCK_H = 13;

/** How much the flattened build view knocks back anything standing up, so the
 *  ground plan underneath is legible while you're editing it. */
const BUILD_VIEW_FADE = 0.3;

/** Per-frame easing of the roof cutaway. Slow enough to read as a reveal rather
 *  than a switch; fast enough that you're not waiting to see your own room. */
const ROOF_FADE_RATE = 0.16;

/** What the FLAT layer actually paints for a tile id. Resource nodes stand up
 *  in the raised pass, so the flat layer shows the ground they're rooted in —
 *  and neighbour comparisons have to agree, or every tree gets a bevel drawn
 *  around it as if it were a different material. */
function groundIdOf(id: number): number {
  return id === TREE || id === ROCK ? GRASS : id;
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

    // Sky/base wash — a flat ground tone behind the tiles for any gaps.
    ctx.fillStyle = night ? "#26324a" : "#7fae54";
    ctx.fillRect(0, 0, this.sw, this.sh);

    this.syncRoofs(world);

    // Flat ground first, then everything with height in one depth-sorted pass.
    this.raised.length = 0;
    this.drawTiles(world, t, night);
    if (this.buildView) this.drawBuildGrid();
    this.drawCrops(world, now);
    this.collectTent(world, night);
    this.collectMovers(world, t, night);
    this.flushRaised();
    this.drawTargetTile(world);

    // Real-clock day/night wash over the whole scene.
    const tint = tintAt(now);
    if (tint.overlay) {
      ctx.fillStyle = tint.overlay;
      ctx.fillRect(0, 0, this.sw, this.sh);
    }
  }

  // --- Tilemap ----------------------------------------------------------------
  // Drawn chunk by chunk: the visible tile span is widened to whole chunks and
  // each is touched via getChunk, so the camera streams chunks in as it moves
  // and only what's on screen is ever generated. Within a chunk, tiles still go
  // through tileAt so player edits (which live outside the chunk) win.
  private drawTiles(world: WorldState, t: number, night: boolean): void {
    const x0 = Math.floor(this.cam.x - this.sw / (2 * TILE)) - 1;
    const x1 = Math.ceil(this.cam.x + this.sw / (2 * TILE)) + 1;
    const y0 = Math.floor(this.cam.y - this.sh / (2 * TILE)) - 1;
    const y1 = Math.ceil(this.cam.y + this.sh / (2 * TILE)) + 1;

    const c0 = chunkCoordOf(x0, y0);
    const c1 = chunkCoordOf(x1, y1);
    for (let cy = c0.cy; cy <= c1.cy; cy++) {
      for (let cx = c0.cx; cx <= c1.cx; cx++) {
        getChunk(world, cx, cy); // stream it in (and keep it resident)
        this.drawChunkTiles(world, cx, cy, x0, x1, y0, y1, t, night);
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
  ): void {
    const ctx = this.ctx;
    const tyStart = Math.max(y0, cy * CHUNK);
    const tyEnd = Math.min(y1, cy * CHUNK + CHUNK - 1);
    const txStart = Math.max(x0, cx * CHUNK);
    const txEnd = Math.min(x1, cx * CHUNK + CHUNK - 1);

    for (let ty = tyStart; ty <= tyEnd; ty++) {
      for (let tx = txStart; tx <= txEnd; tx++) {
        const id = tileAt(world, tx, ty);
        // Resource nodes stand up, so the flat pass draws only the ground they
        // stand ON and defers the node itself to the raised pass. Without this
        // a tree is trapped inside its own 16px cell and the world reads flat.
        if (id === TREE || id === ROCK) {
          const x = tx;
          const y = ty;
          this.raised.push({
            y,
            bias: BIAS_TERRAIN,
            draw: () => (id === TREE ? this.drawTree(world, x, y, night) : this.drawRock(world, x, y, night)),
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
      }
    }
  }

  // --- Crops ------------------------------------------------------------------
  private drawCrops(world: WorldState, now: number): void {
    const ctx = this.ctx;
    for (const [key, crop] of Object.entries(world.crops)) {
      const [tx, ty] = key.split(",").map(Number);
      const cx = Math.round(this.sceneX(tx));
      const base = Math.round(this.sceneY(ty) + TILE / 2) - 2; // sits on the soil
      const ripe = crop.stage >= ripeStage(cropDef(crop.cropId));
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
        ctx.fillStyle = "#f08c3a";
        ctx.fillRect(cx - 1, base - 4, 3, 4);
        ctx.fillStyle = "#d06a24";
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
    if (!has(-1, 0)) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px, py, 1, TILE);
    }
    if (!has(1, 0)) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(px + TILE - 1, py, 1, TILE);
    }

    ctx.globalAlpha = prev;
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
      // A hole in the wall, with the wall carried over it as a lintel — so a
      // doorway reads as cut INTO a run rather than as a gap in it.
      ctx.fillStyle = "#3a2620";
      ctx.fillRect(px + 4, base - STOREY + WALL_CAP + 3, TILE - 8, STOREY - WALL_CAP - 3);
    }

    ctx.globalAlpha = prev;
  }

  /** A tree: trunk, layered crown, contact shadow. Two and a half tiles tall,
   *  so it overhangs the ground behind it and you can walk out of sight behind
   *  one. Jittered by the tile hash so a stand of trees isn't wallpaper. */
  private drawTree(world: WorldState, tx: number, ty: number, night: boolean): void {
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

    ctx.fillStyle = night ? "#4a3628" : "#6b4a33";
    ctx.fillRect(cx - 1, base - 10, 3, 10);
    ctx.fillStyle = night ? "#3a2a1e" : "#573a28"; // shaded right side of trunk
    ctx.fillRect(cx + 1, base - 10, 1, 10);

    // Crown as per-row half-widths: an integer-rect blob, no ellipse maths and
    // nothing off the pixel grid (CLAUDE.md §Sprite rendering).
    const rows = [3, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 2]; // 14 rows + trunk = TREE_H
    const crown = night ? "#2f5233" : "#417a41";
    const crownLit = night ? "#3a6440" : "#57975a";
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

  // --- Tent -------------------------------------------------------------------
  private collectTent(world: WorldState, night: boolean): void {
    this.raised.push({
      y: world.homestead.originY,
      bias: BIAS_TERRAIN,
      draw: () => this.drawTent(world, night),
    });
  }

  private drawTent(world: WorldState, night: boolean): void {
    const ctx = this.ctx;
    const ox = world.homestead.originX;
    const oy = world.homestead.originY;
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

  // --- Movers -----------------------------------------------------------------
  // No longer sorted among themselves — they go into the one raised pass so a
  // villager sorts against trees and (soon) walls, not only against each other.
  private collectMovers(world: WorldState, t: number, night: boolean): void {
    for (const v of world.villagers) {
      // The Quiet Ghost only shows at real-clock night (DESIGN §secret forms).
      if (v.form === "ghost" && !night) continue;
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
  private drawTargetTile(world: WorldState): void {
    const ctx = this.ctx;
    const { x, y } = playerTile(world);
    // ACT prioritises an adjacent resource node (you can't stand on one), so
    // the reticle has to point at what will actually happen, not at your feet.
    const near = nodeNear(world, x, y, world.player.facing);
    const tx = near ? near.x : x;
    const ty = near ? near.y : y;
    const px = Math.round(this.sceneX(tx) - TILE / 2);
    const py = Math.round(this.sceneY(ty) - TILE / 2);
    ctx.strokeStyle = near
      ? "rgba(160,255,150,0.9)" // something to gather
      : isRipe(world, x, y)
        ? "rgba(255,220,120,0.9)" // something ripe
        : "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  }
}
