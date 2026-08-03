import { describe, it, expect } from "vitest";
import { regionSwatch, sheetKey, TILES_PER_PX } from "./sheet";
import { sheetRegionAt, biomeAt, blossomCentre, PLAZA } from "../sim/world";
import { BIOMES } from "../content/biomes";
import { GRASS, tileDef } from "../content/tiles";
import { seasonOn } from "../content/seasons";

const NOW = Date.UTC(2026, 6, 1, 12);
const SPOT = "forest";

describe("what the survey sheet is allowed to know", () => {
  it("cannot report the blossom, which biomeAt can", () => {
    // THE TEST THIS FILE EXISTS FOR. The map is only permitted because the
    // function it samples cannot contain a secret. `biomeAt` can: its first line
    // returns "blossom" for a nine-tile landmark that has its own Notebook entry
    // and is found by walking into it. Swapping one for the other to "keep the
    // map honest" would put a coloured dot on a secret, which is the exact
    // refusal this feature had to answer.
    for (const seed of [1, 7, 42, 99, 314]) {
      const b = blossomCentre(seed, SPOT);
      expect(biomeAt(seed, SPOT, b.x, b.y), `seed ${seed}`).toBe("blossom");
      expect(sheetRegionAt(seed, SPOT, b.x, b.y), `seed ${seed}`).not.toBe("blossom");
    }
  });

  it("never reports the blossom anywhere at all", () => {
    // The check above only proves the disc's centre is clean. This one sweeps a
    // wide field on several seeds, because a landmark that leaked through some
    // other path would be just as bad and would not be at the centre.
    for (const seed of [3, 55, 808]) {
      for (let y = -400; y <= 400; y += 7) {
        for (let x = -400; x <= 400; x += 7) {
          if (sheetRegionAt(seed, SPOT, x, y) === "blossom") {
            throw new Error(`sheet reported blossom at ${x},${y} on seed ${seed}`);
          }
        }
      }
    }
  });

  it("is a total function of the seed, the spot and the coordinate", () => {
    // No world, no save, no player. Nothing it samples could hold a found place,
    // a structure or a villager even if somebody tried to put one there — and
    // the same call twice is the same answer, so the map cannot drift from the
    // ground it claims to describe.
    for (const [x, y] of [[0, 0], [140, -30], [-999, 512]]) {
      expect(sheetRegionAt(11, SPOT, x, y)).toBe(sheetRegionAt(11, SPOT, x, y));
    }
  });

  it("puts the town's own region on the datum", () => {
    // The plaza is meadow by construction (the generator guarantees it), so the
    // one place on the sheet you can check by eye is the one place you start.
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(sheetRegionAt(seed, SPOT, PLAZA.x0 + 1, PLAZA.y0 + 1), `seed ${seed}`).toBe("meadow");
    }
  });
});

describe("how the sheet is coloured", () => {
  it("draws the town's region as plain grass, untinted", () => {
    // The meadow's tint is `amount: 0`, which is what makes it the baseline every
    // other region reads as a departure from. If this ever fails, the meadow has
    // acquired a colour and the sheet has stopped agreeing with the ground.
    expect(BIOMES.meadow.ground.amount).toBe(0);
    const grass = seasonOn(NOW).ground[GRASS]?.color ?? tileDef(GRASS).color;
    expect(regionSwatch("meadow", NOW)).toBe(grass);
  });

  it("gives the regions colours you can tell apart", () => {
    // A map of six greens nobody can distinguish is not a map. This does not
    // assert they are pretty — only that no two regions collapse onto the same
    // swatch, which is the failure a tint table can drift into silently.
    const seen = new Map<string, string>();
    for (const id of Object.keys(BIOMES) as (keyof typeof BIOMES)[]) {
      const c = regionSwatch(id, NOW);
      expect(seen.has(c), `${id} and ${seen.get(c)} are the same colour`).toBe(false);
      seen.set(c, id);
    }
  });

  it("turns over with the season, because the swatch is this season's grass", () => {
    const summer = regionSwatch("pinewood", Date.UTC(2026, 6, 1));
    const winter = regionSwatch("pinewood", Date.UTC(2026, 11, 1));
    expect(summer).not.toBe(winter);
  });
});

describe("when the sheet is redrawn", () => {
  it("holds still until you have crossed a whole sheet pixel", () => {
    // One pixel is eight tiles, so there is nothing to show for a smaller move.
    // A map that redrew every frame would shimmer while you stood still — the
    // same defect the survey chip avoids by reading off the tile.
    // From a tile that IS on a pixel boundary, or the test measures the distance
    // to the next boundary rather than the width of a pixel — which is how this
    // was first written and why it failed.
    const x0 = 12 * TILES_PER_PX;
    const k = sheetKey(x0, 100, NOW);
    expect(sheetKey(x0 + TILES_PER_PX - 1, 100, NOW)).toBe(k);
    expect(sheetKey(x0 + TILES_PER_PX, 100, NOW)).not.toBe(k);
  });

  it("redraws when the season turns", () => {
    expect(sheetKey(0, 0, Date.UTC(2026, 6, 1))).not.toBe(sheetKey(0, 0, Date.UTC(2026, 11, 1)));
  });
});
