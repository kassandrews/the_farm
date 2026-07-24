// The scene renderer. Draws sim state to a low-resolution canvas that CSS
// upscales crisply (image-rendering: pixelated) — the same trick The Meadow
// uses, so 16×16 sprites and flat tiles stay sharp at any screen size.
//
// Layering, back to front: sky wash, the visible tilemap (only the chunks the
// camera can see — nothing assumes a fixed world), crops, the homestead tent,
// then depth-sorted movers (villagers + player), then the real-clock day/night
// tint over everything.

import type { WorldState, Villager, Player } from "../sim/types";
import { tileAt, playerTile, isRipe } from "../sim/game";
import { cropDef, ripeStage } from "../content/crops";
import { tileDef } from "../content/tiles";
import { decoHash, chunkCoordOf, getChunk, CHUNK } from "../sim/world";
import { tintAt, isNight, skyPhaseAt } from "../sim/time";
import { creatureKey } from "../content/canon/sprites";
import type { Mood, SpriteFrame } from "../content/canon/sprites";
import { SpriteCache, drawSpriteQuantized } from "./sprites";

const TILE = 16; // scene px per world tile (matches sprite CELL)
const SPRITE = 16; // sprite draw size

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cache = new SpriteCache();
  private cam = { x: 0, y: 0 };
  private sw = 0;
  private sh = 0;
  private scale = 3; // scene px → CSS px
  private t0 = performance.now();
  private canvas: HTMLCanvasElement;

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

    this.drawTiles(world, t, night);
    this.drawCrops(world, now);
    this.drawTent(world, night);
    this.drawMovers(world, t, night);
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
        const def = tileDef(tileAt(world, tx, ty));
        const px = Math.round(this.sceneX(tx) - TILE / 2);
        const py = Math.round(this.sceneY(ty) - TILE / 2);
        ctx.fillStyle = def.color;
        ctx.fillRect(px, py, TILE, TILE);
        // Soft bevel: lighter top row, darker bottom row.
        if (def.top) {
          ctx.fillStyle = def.top;
          ctx.fillRect(px, py, TILE, 1);
        }
        if (def.shade) {
          ctx.fillStyle = def.shade;
          ctx.fillRect(px, py + TILE - 1, TILE, 1);
        }
        // Water gets a couple of drifting ripple pixels.
        if (def.name === "Water") {
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          const rx = px + 3 + ((Math.sin(t * 1.5 + tx * 1.7 + ty) * 0.5 + 0.5) * (TILE - 6)) | 0;
          ctx.fillRect(rx, py + 6, 2, 1);
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

  // --- Tent -------------------------------------------------------------------
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
    // A simple ridge tent: a triangle canvas with a dark doorway.
    for (let r = 0; r < h; r++) {
      const half = Math.round(((h - r) / h) * (w / 2));
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

  // --- Movers (depth-sorted) --------------------------------------------------
  private drawMovers(world: WorldState, t: number, night: boolean): void {
    const movers: { y: number; draw: () => void }[] = [];
    for (const v of world.villagers) {
      // The Quiet Ghost only shows at real-clock night (DESIGN §secret forms).
      if (v.form === "ghost" && !night) continue;
      movers.push({ y: v.y, draw: () => this.drawVillager(v, t, night) });
    }
    movers.push({ y: world.player.y, draw: () => this.drawPlayer(world.player, t) });
    movers.sort((a, b) => a.y - b.y);
    for (const m of movers) m.draw();
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
    const px = Math.round(this.sceneX(x) - TILE / 2);
    const py = Math.round(this.sceneY(y) - TILE / 2);
    ctx.strokeStyle = isRipe(world, x, y) ? "rgba(255,220,120,0.9)" : "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  }
}
