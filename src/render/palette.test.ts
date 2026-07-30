import { describe, it, expect } from "vitest";
import { scenePalette, seasonSkin, biomeSkin, mixHex } from "./palette";
import { BIOMES, BROADLEAF } from "../content/biomes";
import { SEASONS, seasonOn } from "../content/seasons";
import { TILES, tileDef, GRASS, MUSHROOM, WATER, FARMLAND, FARMLAND_WET, PLANK, STONE, BEDROCK, CAVE_FLOOR, ORE_VEIN, SHAFT, DARK_TREE } from "../content/tiles";

const at = (month: number) => new Date(2026, month - 1, 15, 12).getTime();

describe("seasonSkin", () => {
  it("never changes a tile's name, in any season", () => {
    // THE regression this module exists to prevent. The renderer branches on
    // `def.name === "Water" | "Mushrooms" | "Grass"` for the ripple, the caps
    // and the grass speckle, so a repaint that dropped the name would switch
    // three effects off silently and look like a palette bug for an afternoon.
    for (const season of SEASONS) {
      const p = scenePalette(season, false);
      for (const key of Object.keys(TILES)) {
        const id = Number(key);
        expect(seasonSkin(tileDef(id), id, p).name, `${season.id}/${id}`).toBe(tileDef(id).name);
      }
    }
  });

  it("repaints grass and mushrooms identically, so a patch never reads as damage", () => {
    for (const season of SEASONS) {
      const p = scenePalette(season, false);
      const grass = seasonSkin(tileDef(GRASS), GRASS, p);
      const shrooms = seasonSkin(tileDef(MUSHROOM), MUSHROOM, p);
      expect(shrooms.color, season.id).toBe(grass.color);
      expect(shrooms.top, season.id).toBe(grass.top);
      expect(shrooms.shade, season.id).toBe(grass.shade);
    }
  });

  it("leaves water, worked soil, built tiles and the grove alone", () => {
    // Water animates its own way; soil you turned over yourself is a thing you
    // did, not weather; a built tile belongs to its finish; and the grove is
    // dark wood in every month on purpose.
    const untouched = [WATER, FARMLAND, FARMLAND_WET, PLANK, STONE, DARK_TREE];
    for (const season of SEASONS) {
      const p = scenePalette(season, false);
      for (const id of untouched) {
        expect(seasonSkin(tileDef(id), id, p), `${season.id}/${id}`).toBe(tileDef(id));
      }
    }
  });

  it("leaves the underground identical in all twelve months", () => {
    // A cave has no weather, for the same reason it has no sky.
    const under = [BEDROCK, CAVE_FLOOR, ORE_VEIN, SHAFT];
    for (let m = 1; m <= 12; m++) {
      const p = scenePalette(null, false); // null season is how "under" is spelled
      for (const id of under) {
        expect(seasonSkin(tileDef(id), id, p), `month ${m}/${id}`).toBe(tileDef(id));
      }
    }
  });

  it("actually changes grass between seasons, or none of the above means anything", () => {
    const colors = new Set(
      SEASONS.map((s) => seasonSkin(tileDef(GRASS), GRASS, scenePalette(s, false)).color),
    );
    expect(colors.size).toBe(SEASONS.length);
  });
});

describe("scenePalette", () => {
  it("underground is byte-identical to what the game shipped with", () => {
    // Descending must look the same in October as in June. These are the
    // literals that were inline in the renderer before 4d.
    const p = scenePalette(null, false);
    expect(p.sky).toBe("#7fae54");
    expect(p.tuft).toBe("#79a94c");
    expect(p.crown).toBe("#417a41");
    expect(p.crownLit).toBe("#57975a");
  });

  it("summer is the baseline, so a July screenshot is unchanged by the season system", () => {
    // Deliberate: summer's numbers ARE the shipped numbers, which is what makes
    // the other three readable as departures rather than as a new art pass.
    const july = scenePalette(seasonOn(at(7)), false);
    const none = scenePalette(null, false);
    expect(july.sky).toBe(none.sky);
    expect(july.tuft).toBe(none.tuft);
    expect(july.crown).toBe(none.crown);
    expect(july.crownLit).toBe(none.crownLit);
    expect(seasonSkin(tileDef(GRASS), GRASS, july).color).toBe(tileDef(GRASS).color);
  });

  it("picks the night arm when it is night", () => {
    for (const season of SEASONS) {
      const day = scenePalette(season, false);
      const night = scenePalette(season, true);
      expect(night.sky, season.id).not.toBe(day.sky);
      expect(night.sky, season.id).toBe(season.sky.night);
      expect(night.crown, season.id).toBe(season.crown.night);
    }
  });
});

describe("biome tinting", () => {
  it("leaves a colour exactly alone at amount 0", () => {
    // The meadow row is all zeroes, and every live save's terrain depends on that
    // meaning "identical" rather than "very close". A rounding drift here is a
    // recolour of everybody's lawn.
    for (const def of Object.values(TILES)) {
      expect(biomeSkin(def, def.id, BIOMES.meadow)).toBe(def); // same object, not a copy
    }
    expect(mixHex("#8bbf5a", { color: "#ff0000", amount: 0 })).toBe("#8bbf5a");
  });

  it("becomes the tint at amount 1, and meets it halfway at 0.5", () => {
    expect(mixHex("#000000", { color: "#ffffff", amount: 1 })).toBe("#ffffff");
    expect(mixHex("#000000", { color: "#ffffff", amount: 0.5 })).toBe("#808080");
    expect(mixHex("#204060", { color: "#204060", amount: 1 })).toBe("#204060");
  });

  it("refuses to half-parse a colour it doesn't understand", () => {
    // Better a visibly untinted world than a silently wrong one.
    expect(mixHex("#abc", { color: "#ffffff", amount: 1 })).toBe("#abc");
    expect(mixHex("#8bbf5a", { color: "rgb(1,2,3)", amount: 1 })).toBe("#8bbf5a");
  });

  it("carries top and shade with the base, so a bevel still matches", () => {
    const skinned = biomeSkin(tileDef(GRASS), GRASS, BIOMES.scrub);
    expect(skinned.color).not.toBe(tileDef(GRASS).color);
    expect(skinned.top).not.toBe(tileDef(GRASS).top);
    expect(skinned.shade).not.toBe(tileDef(GRASS).shade);
    expect(skinned.name).toBe(tileDef(GRASS).name); // the renderer branches on it
  });

  it("composes with the season instead of replacing it", () => {
    // The whole reason a biome states a direction and not a colour. October has
    // to still be October in the fen — and the fen still has to be the fen.
    const autumn = scenePalette(seasonOn(at(10)), false);
    const summer = scenePalette(seasonOn(at(7)), false);
    const fenAutumn = biomeSkin(seasonSkin(tileDef(GRASS), GRASS, autumn), GRASS, BIOMES.fen).color;
    const fenSummer = biomeSkin(seasonSkin(tileDef(GRASS), GRASS, summer), GRASS, BIOMES.fen).color;
    const meadowAutumn = seasonSkin(tileDef(GRASS), GRASS, autumn).color;
    expect(fenAutumn).not.toBe(fenSummer); // the season still lands
    expect(fenAutumn).not.toBe(meadowAutumn); // the region still reads
  });

  it("keeps the pines evergreen through autumn and lets the birches turn", () => {
    // The argument `amount` exists to have. Distance from summer's crown says how
    // much October moved each canopy.
    const autumn = scenePalette(seasonOn(at(10)), false);
    const summer = scenePalette(seasonOn(at(7)), false);
    const shift = (id: "pinewood" | "birch" | "meadow") =>
      dist(
        mixHex(summer.crown, BIOMES[id].crown),
        mixHex(autumn.crown, BIOMES[id].crown),
      );
    expect(shift("pinewood")).toBeLessThan(shift("birch"));
    expect(shift("birch")).toBeLessThan(shift("meadow"));
  });

  it("makes blossom crowns unmistakably pink and birch trunks pale", () => {
    const summer = scenePalette(seasonOn(at(7)), false);
    const [r, g, b] = rgb(mixHex(summer.crown, BIOMES.blossom.crown));
    expect(r).toBeGreaterThan(g); // no green canopy is redder than it is green
    expect(r).toBeGreaterThan(b);
    // Birch bark against the ordinary trunk brown it starts from.
    const bark = mixHex("#6b4a33", BIOMES.birch.trunk);
    expect(rgb(bark)[0]).toBeGreaterThan(rgb("#6b4a33")[0] + 60);
  });
});

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function dist(a: string, b: string): number {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

describe("crown silhouettes", () => {
  it("gives every biome a shape, and the meadow the one the game always drew", () => {
    // The meadow's tree is the town's tree. If this changes, the view from the
    // plaza changes, which is the one thing biomes promised not to do.
    expect(BIOMES.meadow.crownRows).toBe(BROADLEAF);
    for (const b of Object.values(BIOMES)) {
      expect(b.crownRows.length, b.id).toBeGreaterThan(4);
      for (const w of b.crownRows) {
        expect(Number.isInteger(w), b.id).toBe(true); // integer rects only
        expect(w, b.id).toBeGreaterThan(0); // a zero-width row is a gap in the trunk
      }
    }
  });

  it("makes the shapes actually distinguishable from each other", () => {
    // Colour alone left the pines reading as a dark meadow. Two biomes with the
    // same outline AND a similar hue would be the same failure again.
    const shapes = Object.values(BIOMES).map((b) => b.crownRows.join(","));
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("keeps conifers narrow and broadleaves broad", () => {
    const widest = (id: keyof typeof BIOMES) => Math.max(...BIOMES[id].crownRows);
    const tall = (id: keyof typeof BIOMES) => BIOMES[id].crownRows.length;
    // A pine is taller than a meadow tree and no wider — that combination IS the
    // conifer read, and either half alone doesn't do it.
    expect(tall("pinewood")).toBeGreaterThan(tall("meadow"));
    expect(widest("pinewood")).toBeLessThanOrEqual(widest("meadow"));
    // The blossom rows are the overfull ones.
    expect(widest("blossom")).toBeGreaterThan(widest("meadow"));
    // The scrub is the squat one.
    expect(tall("scrub")).toBeLessThan(tall("meadow"));
  });

  it("keeps a notched crown one crown, dipping only at the bottom", () => {
    // A gap in the top rows would saw a tree in half rather than scoop out its
    // underside, and a gap as wide as its row is a hole where foliage should be.
    for (const b of Object.values(BIOMES)) {
      if (!b.crownGaps) continue;
      expect(b.crownGaps.length, b.id).toBe(b.crownRows.length);
      // The dip has to reach the trunk to read as a dip around it.
      const overlap = b.crownOverlap ?? 0;
      expect(overlap, b.id).toBeGreaterThan(0);
      const firstTrunkRow = b.crownRows.length - overlap;
      b.crownGaps.forEach((g, r) => {
        expect(Number.isInteger(g), b.id).toBe(true);
        expect(g, b.id).toBeLessThan(b.crownRows[r]);
        // A gap on a row that clears the trunk shows GRASS, not bark — which is
        // a hole in the foliage rather than the underside of a crown.
        if (g > 0) expect(r, b.id).toBeGreaterThanOrEqual(firstTrunkRow);
      });
    }
  });

  it("never overhangs so far that a crown covers its neighbours' trunks", () => {
    // 8 half-widths is 16px, exactly one tile. Past that a tree starts drawing
    // over the tile beside it, and a stand becomes a smear.
    for (const b of Object.values(BIOMES)) {
      expect(Math.max(...b.crownRows), b.id).toBeLessThanOrEqual(8);
    }
  });
});
