import { describe, it, expect } from "vitest";
import { zoomLadder, ZOOM_TARGETS, MIN_SCALE } from "./zoom";

const TILE = 16; // matches renderer.ts's scene px per tile

/** Short edges worth checking: desktop, laptop, tablet, and the phone sizes that
 *  sit at the integer floor. 600 is in here on purpose — see the collision test. */
const EDGES = [1400, 1200, 1024, 900, 800, 700, 600, 500, 430, 390, 360];

describe("zoomLadder", () => {
  it("reproduces today's view at step 0, on every screen", () => {
    // The whole promise of the feature: zoom adds somewhere to stand back to, it
    // does not restage the default. This is the line renderer.resize() used to
    // compute inline, and if step 0 ever drifts from it, every existing player's
    // view silently changes on load.
    for (const short of EDGES) {
      const today = Math.max(2, Math.round(short / (11 * TILE)));
      expect(zoomLadder(short, TILE)[0], `${short}px`).toBe(today);
    }
  });

  it("never returns a scale below the sprite-rule floor", () => {
    // MIN_SCALE is CLAUDE.md's sprite rule expressed as a number. A fractional
    // or sub-2 upscale is where 16px art starts resampling.
    for (const short of EDGES) {
      for (const scale of zoomLadder(short, TILE)) {
        expect(scale, `${short}px`).toBeGreaterThanOrEqual(MIN_SCALE);
        expect(Number.isInteger(scale), `${short}px`).toBe(true);
      }
    }
  });

  it("gives every step a different scale, so no setting is a no-op", () => {
    for (const short of EDGES) {
      const ladder = zoomLadder(short, TILE);
      expect(new Set(ladder).size, `${short}px`).toBe(ladder.length);
      // Strictly decreasing, not merely distinct: the steps are ordered near to
      // far and a ladder that wandered back inward would read as a broken cycle.
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i], `${short}px step ${i}`).toBeLessThan(ladder[i - 1]);
      }
    }
  });

  it("keeps the mid and far steps apart at 600px, where naive rounding collides", () => {
    // THE regression this module exists to prevent. Taking each target's rounded
    // scale on its own gives 3/2/2 here — tap the button for the far view and
    // nothing at all happens. The strictly-decreasing clamp is what drops the
    // third step instead of shipping a duplicate of the second.
    const naive = ZOOM_TARGETS.map((t) => Math.max(2, Math.round(600 / (t * TILE))));
    expect(naive[1]).toBe(naive[2]); // the collision, still there in the naive form

    const ladder = zoomLadder(600, TILE);
    expect(ladder).toEqual([3, 2]);
  });

  it("offers nothing to a phone, which is already at the floor", () => {
    // Per-device availability is not a special case upstream — it falls out of
    // stopping at MIN_SCALE. A one-entry ladder is how the HUD knows to hide the
    // control entirely rather than show a button that cannot move.
    for (const short of [430, 390, 360]) {
      expect(zoomLadder(short, TILE), `${short}px`).toEqual([2]);
    }
  });

  it("stands meaningfully further back on a screen with the room for it", () => {
    // The other failure mode: a fixed base/base-1/base-2 ladder never collides
    // but is far too timid on a large screen (8/7/6 at 1400px is barely a
    // change). Each step has to actually buy visible ground.
    for (const short of [1400, 1200, 900]) {
      const ladder = zoomLadder(short, TILE);
      expect(ladder.length, `${short}px`).toBe(3);
      const tilesAcross = (scale: number) => short / (scale * TILE);
      // 1.6x the tiles across is ~2.5x the visible ground — the narrowest the
      // three-step ladder gets (900px lands on 5/4/3, or 11.3 → 18.8 tiles).
      expect(tilesAcross(ladder[2]) / tilesAcross(ladder[0]), `${short}px`).toBeGreaterThan(1.6);
    }
  });

  it("never returns more steps than it has targets", () => {
    for (const short of EDGES) {
      expect(zoomLadder(short, TILE).length).toBeLessThanOrEqual(ZOOM_TARGETS.length);
      expect(zoomLadder(short, TILE).length).toBeGreaterThanOrEqual(1);
    }
  });
});
