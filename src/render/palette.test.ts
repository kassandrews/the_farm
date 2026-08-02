import { describe, it, expect } from "vitest";
import { scenePalette, seasonSkin, biomeSkin, mixHex } from "./palette";
import { BIOMES, BROADLEAF } from "../content/biomes";
import { SEASONS, seasonOn } from "../content/seasons";
import { TILES, tileDef, GRASS, MUSHROOM, WATER, FARMLAND, FARMLAND_WET, FLOOR, STONE, BEDROCK, CAVE_FLOOR, ORE_VEIN, SHAFT, DARK_TREE } from "../content/tiles";

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
    const untouched = [WATER, FARMLAND, FARMLAND_WET, FLOOR, STONE, DARK_TREE];
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
    // same outline AND a similar hue would be the same failure again — and it is
    // the AND that this asserts, because one biome deliberately fails the first
    // half. THE DUSK IS THE MEADOW'S OWN BROADLEAF, unchanged: it is the mildest
    // of the far regions, and what makes it unsettling rather than merely pretty
    // is that the trees are the shape you know and the light is not. So a shared
    // outline is allowed, and pays for it by having to be unmistakable on colour.
    const rows = Object.values(BIOMES);
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        if (a.crownRows.join(",") !== b.crownRows.join(",")) continue;
        // How far apart the two crowns actually PULL. Comparing hex alone would
        // be wrong: the meadow's crown is #000000 at amount 0, which does not mean
        // black — it means "leave the season's colour alone".
        const apart = Math.abs(a.crown.amount - b.crown.amount);
        expect(apart, `${a.id} and ${b.id} share an outline`).toBeGreaterThanOrEqual(0.5);
      }
    }
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

  it("keeps every gap in a crown OPEN, so none of them is a hole", () => {
    // The rule the shapes actually obey (see BiomeDef.crownGaps): a gap has to
    // reach the outside. Open downward against the trunk it is an underside and
    // shows bark; open upward from row 0 it is a cleft and shows sky. Enclosed by
    // foliage top and bottom it is a square of grass punched into the canopy, and
    // it reads as exactly that — the failure this asserts against.
    for (const b of Object.values(BIOMES)) {
      if (!b.crownGaps) continue;
      expect(b.crownGaps.length, b.id).toBe(b.crownRows.length);
      const overlap = b.crownOverlap ?? 0;
      // The dip has to reach the trunk to read as a dip around it.
      expect(overlap, b.id).toBeGreaterThan(0);
      const firstTrunkRow = b.crownRows.length - overlap;
      // How far the cleft runs down from the top: row 0 gapped, and every row
      // after it that is also gapped. The first solid row closes it.
      let cleft = 0;
      while (cleft < b.crownGaps.length && b.crownGaps[cleft] > 0) cleft++;
      b.crownGaps.forEach((g, r) => {
        expect(Number.isInteger(g), b.id).toBe(true);
        expect(g, b.id).toBeLessThan(b.crownRows[r]);
        if (g > 0) expect(r < cleft || r >= firstTrunkRow, `${b.id} row ${r}`).toBe(true);
      });
    }
  });

  it("keeps the red cap where a red cap would actually grow", () => {
    // The default cap is red, and at this size with a white speck on it that is a
    // fly agaric — which is ectomycorrhizal and grows with BIRCH, pine and spruce
    // and nowhere else. So "no mushroomCap" is a claim about the region, not a
    // blank field, and the fen failing this was a real bug on screen: the wettest
    // region carried the game's heaviest mushroom density in the one habitat the
    // species avoids.
    //
    // Asserted as a whitelist rather than per-region, so a NEW region that grows
    // mushrooms has to say which way it went. Regions with no mushrooms at all
    // are exempt — there is nothing to be wrong about.
    //
    // THE DUSK IS ON THE LIST AND ITS TREES ARE BROADLEAF, which is the exception
    // that says what the list is for. Fly agaric does partner beech and oak, so
    // it is not a false entry — but the real reason is that the dusk's whole idea
    // is a wood where the shapes are the ones you know and only the light is
    // wrong. A recoloured cap there would be the region joining in.
    //
    // The GLASS WOOD went the other way on the same evidence: its crown is the
    // birch's, so ecology allowed the red, and the palette overruled it. Both are
    // judgement calls; the point of the whitelist is that they have to be made.
    const REDS = new Set(["birch", "pinewood", "dusk"]);
    for (const b of Object.values(BIOMES)) {
      if (b.mushrooms <= 0) continue;
      if (b.mushroomCap) continue;
      expect(REDS.has(b.id), `${b.id} keeps the red cap — is it a fly agaric host?`).toBe(true);
    }
  });

  it("keeps bark marks on the bark", () => {
    // A trunk is three pixels wide and `trunkHeight` tall, and the renderer
    // indexes the grid straight into that rect. A row of the wrong width would
    // silently drop its last mark; a grid taller than the trunk would author
    // dashes nobody ever sees. Both are the kind of miss that survives a suite
    // and shows up as "the birches look plain" three sessions later.
    for (const b of Object.values(BIOMES)) {
      if (!b.bark) continue;
      const trunkH = b.trunkHeight ?? 10;
      // More than one, or a stand is the same tree printed twice — the argument
      // ROCK_SHAPES already had, and bark is far more visible than a rock.
      expect(b.bark.marks.length, b.id).toBeGreaterThan(1);
      for (const grid of b.bark.marks) {
        expect(grid.length, b.id).toBeLessThanOrEqual(trunkH);
        expect(grid.join("").includes("x"), b.id).toBe(true);
        for (const row of grid) expect(row.length, `${b.id}: "${row}"`).toBe(3);
      }
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
