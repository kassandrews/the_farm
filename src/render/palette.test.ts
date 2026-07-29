import { describe, it, expect } from "vitest";
import { scenePalette, seasonSkin } from "./palette";
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
