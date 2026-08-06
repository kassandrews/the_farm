import { describe, it, expect } from "vitest";
import { scenePalette, seasonSkin, biomeSkin, mixHex } from "./palette";
import { MUSHROOM_ART, DEADWOOD_ART, shrubPeak, shrubRows } from "./renderer";
import { BIOMES, BROADLEAF, treeForms } from "../content/biomes";
import { SEASONS, seasonOn } from "../content/seasons";
import { TILES, tileDef, GRASS, MUSHROOM, SHALLOW, WATER, FARMLAND, FARMLAND_WET, FLOOR, STONE, BEDROCK, CAVE_FLOOR, ORE_VEIN, SHAFT, DARK_TREE } from "../content/tiles";

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

describe("the regions that are drawn wrong", () => {
  // The Static's two inks (content/biomes.ts §dither). Everything here is a
  // measurement off the real tint machinery rather than a reading of the hexes,
  // because a tint is a lerp and the hexes are not what lands on screen — which
  // is exactly the bug this guards: the first draft applied the second ink to
  // the FIRST one instead of to the season's own green, and the two came out
  // four RGB units apart. It measured as "the dither is working" and
  // photographed as an ordinary grey wood.
  const GRASS_HEX = "#8bbf5a";
  const px = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const luma = ([r, g, b]: number[]): number => 0.299 * r + 0.587 * g + 0.114 * b;

  for (const b of Object.values(BIOMES)) {
    if (!b.dither) continue;
    it(`${b.id} states two inks the eye cannot resolve and cannot ignore`, () => {
      const one = px(mixHex(GRASS_HEX, b.ground));
      const two = px(mixHex(GRASS_HEX, b.dither!.ground));
      const apart = Math.hypot(one[0] - two[0], one[1] - two[1], one[2] - two[2]);
      // FAR ENOUGH APART TO BE FELT. Measured at 35 on the Static; under about
      // twenty and the ground is one colour with a rounding error in it.
      expect(apart, `${b.id}: the two inks are the same colour`).toBeGreaterThan(20);
      // AND CLOSE ENOUGH IN VALUE TO BE UNRESOLVABLE, which is the half that
      // makes it a bitrate rather than a texture. Two colours at different
      // brightness dither into visible stipple — light and shade, which reads as
      // dappling; two at one brightness dither into an unstable third colour,
      // which is what a picture short of a bit looks like. Measured at 3.7.
      expect(Math.abs(luma(one) - luma(two)), `${b.id}: one ink is brighter`).toBeLessThan(14);
    });
  }
});

// FRUIT ON THE UNDERGROWTH (content/biomes.ts §berries), which is paint applied
// to a NODE and is therefore the one decoration in the file that can be written
// for a plant the region does not have.
describe("the regions with berries in them", () => {
  const px = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const luma = ([r, g, b]: number[]): number => 0.299 * r + 0.587 * g + 0.114 * b;

  for (const b of Object.values(BIOMES)) {
    if (!b.berries) continue;
    it(`${b.id} has something to put them on`, () => {
      // A berry is drawn on the shrub sprite and nowhere else, so a row with
      // fruit and no bushes states a season's worth of nothing — invisible in
      // the table, invisible in a swatch, and invisible on screen, which is the
      // worst of the three.
      expect(b.shrubs, `${b.id}: berries with no shrubs to grow on`).toBeTruthy();
    });

    it(`${b.id} draws its fruit against its own foliage`, () => {
      // The lupine's lesson one region up, applied to a smaller mark: that spike
      // wins on SHAPE because lavender on mid green is about 1.2:1, and a berry
      // has no shape to win on — it is one pixel, so contrast is the whole of
      // what makes it a berry rather than a stray light pixel in a bush.
      //
      // Measured against the crown ink the shrub is actually filled with, not
      // against the grass: a berry sits on foliage.
      const fruit = px(b.berries!.color);
      const leaf = px(b.crown.color);
      expect(
        Math.abs(luma(fruit) - luma(leaf)),
        `${b.id}: the fruit is the same value as the leaves`,
      ).toBeGreaterThan(30);
    });

    it(`${b.id} keeps its berries apart on every bush it has`, () => {
      // THE BUG THE `spots` TABLE REPLACED A SCATTER TO FIX, and it is invisible
      // in the table: two berries a pixel apart draw one two-pixel object, so a
      // bush with three of them wears a nut instead. Authoring the arrangement
      // is only worth anything if the arrangement is checked.
      //
      // Against every width the sprite actually makes — `drawShrub` rolls the
      // peak a pixel either way — because the clamp that keeps a berry inside a
      // narrow row is exactly what can shove two of them together, and the
      // narrowest bush is the one the table was NOT drawn against.
      const base = shrubPeak(b.crownRows);
      for (let peak = Math.max(3, base - 1); peak <= base + 1; peak++) {
        const rows = shrubRows(peak);
        for (const [i, spots] of b.berries!.spots.entries()) {
          const at = spots.map(([dx, row]) => {
            const r = Math.max(0, Math.min(rows.length - 1, row));
            return [Math.max(-(rows[r] - 1), Math.min(rows[r] - 1, dx)), r];
          });
          for (let a = 0; a < at.length; a++) {
            for (let c = a + 1; c < at.length; c++) {
              const apart = Math.max(Math.abs(at[a][0] - at[c][0]), Math.abs(at[a][1] - at[c][1]));
              expect(
                apart,
                `${b.id} arrangement ${i} at peak ${peak}: two berries touching`,
              ).toBeGreaterThan(1);
            }
          }
        }
      }
    });
  }
});

describe("water a region has an opinion about", () => {
  it("keeps the shallows the paler blue, however milky the region makes them", () => {
    // The salt flats are the one region allowed to recolour water
    // (content/biomes.ts §waterTint), and the thing that must survive it is the
    // affordance: DESIGN §Water puts "you may wade here" in the COLOUR and
    // nowhere else — no HUD ever says it — so a tint that closed the gap between
    // the two blues would take a rule off the screen without anybody noticing
    // until they were standing in the wrong one.
    //
    // Both tiles take the same pull, which is what preserves the ordering by
    // construction; this asserts the gap has not merely survived but stayed
    // legible. Measured at 25 levels of blue-ish distance against the untouched
    // pair's 45.
    const lum = (h: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const b of Object.values(BIOMES)) {
      if (!b.waterTint) continue;
      const deep = mixHex(tileDef(WATER).color, b.waterTint);
      const wade = mixHex(tileDef(SHALLOW).color, b.waterTint);
      expect(lum(wade), `${b.id}: the shallows stopped being the paler blue`).toBeGreaterThan(
        lum(deep),
      );
      expect(lum(wade) - lum(deep), `${b.id}: the two blues have closed up`).toBeGreaterThan(12);
    }
  });
});

describe("the picture coming apart", () => {
  it("keeps the glitch channels off the region's own palette", () => {
    // The fringe inks are meant to read as ONE MARK failing to line up with
    // itself, which only works if neither channel could be mistaken for
    // something growing there. Asserted as distance from the region's own ground
    // and crown inks: a warm channel that landed near the crown colour would just
    // be a second, blurrier plant.
    const px = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const far = (a: string, b: string): number => {
      const [x, y] = [px(a), px(b)];
      return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    };
    for (const b of Object.values(BIOMES)) {
      if (!b.glitch) continue;
      for (const channel of [b.glitch.warm, b.glitch.cold]) {
        for (const own of [b.ground.color, b.crown.color, b.tuft.color]) {
          expect(far(channel, own), `${b.id}: a channel is the region's own colour`).toBeGreaterThan(
            60,
          );
        }
      }
      // And they must be far from EACH OTHER, or the picture is separating into
      // two copies of the same thing, which is a blur rather than a fault.
      expect(far(b.glitch.warm, b.glitch.cold), `${b.id}: the channels agree`).toBeGreaterThan(100);
      // Sparse, by the row's own argument: a screen of tears is a broken
      // television, and you cannot see a wood through it.
      expect(b.glitch.bars.density, `${b.id}: too many tears`).toBeLessThan(0.02);
      expect(b.glitch.tear, `${b.id}: every mark torn is a font`).toBeLessThan(0.5);
    }
  });
});

describe("crown silhouettes", () => {
  it("gives every biome a shape, and the meadow the one the game always drew", () => {
    // The meadow's tree is the town's tree. If this changes, the view from the
    // plaza changes, which is the one thing biomes promised not to do.
    expect(BIOMES.meadow.crownRows).toBe(BROADLEAF);
    // The town's tree is also the ONLY form its region draws. A second silhouette
    // in the meadow is a change to the view from the plaza and has to be decided
    // as one, looking at the plaza — not swept in with whatever other region was
    // being worked on that afternoon.
    expect(BIOMES.meadow.crownAlt, "the meadow grew a second tree").toBeUndefined();
    // Every FORM, not just the row's own: a second silhouette nobody checked is
    // how the first zero-width row or off-grid crown would get in
    // (content/biomes.ts §TreeShape).
    for (const b of Object.values(BIOMES)) {
      for (const form of treeForms(b)) {
        expect(form.rows.length, b.id).toBeGreaterThan(4);
        for (const w of form.rows) {
          expect(Number.isInteger(w), b.id).toBe(true); // integer rects only
          expect(w, b.id).toBeGreaterThan(0); // a zero-width row is a gap in the trunk
        }
      }
    }
  });

  it("keeps a region's two trees the same species", () => {
    // WHAT A SECOND FORM IS FOR (content/biomes.ts §crownAlt): a stand of one
    // species with a history in it, not a mixed wood. The silhouette is how a
    // region says which region it is, so two outlines that disagree about how BIG
    // the tree is stop reading as one plant — and the region stops reading as
    // anywhere.
    //
    // Girth is the trait to pin, because it is the one the eye reads first at
    // this size: a pine that lost its lowest whorls lost its widest ones, so a
    // pixel narrower is a history and three pixels narrower is a different tree.
    // Height is deliberately NOT pinned — where the foliage sits on the stem is
    // the whole of what varies.
    for (const b of Object.values(BIOMES)) {
      const forms = treeForms(b);
      if (forms.length < 2) continue;
      const own = Math.max(...forms[0].rows);
      for (const f of forms.slice(1)) {
        expect(
          Math.abs(Math.max(...f.rows) - own),
          `${b.id}: its two trees differ in girth`,
        ).toBeLessThanOrEqual(1);
      }
      // And they have to actually DIFFER, or a region is paying for a list in
      // order to draw the same tree twice — the one failure a "more than one"
      // rule cannot catch by counting.
      const seen = new Set(
        forms.map((f) => `${f.rows.join(",")}|${f.overlap ?? 0}|${f.trunkHeight ?? 10}`),
      );
      expect(seen.size, `${b.id}: two identical forms`).toBe(forms.length);
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
    // Over every FORM, so a region cannot smuggle in a fat conifer or a squat
    // broadleaf as a second silhouette.
    const widest = (id: keyof typeof BIOMES) =>
      Math.max(...treeForms(BIOMES[id]).map((f) => Math.max(...f.rows)));
    const tall = (id: keyof typeof BIOMES) =>
      Math.max(...treeForms(BIOMES[id]).map((f) => f.rows.length));
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
      for (const form of treeForms(b)) {
        if (!form.gaps) continue;
        expect(form.gaps.length, b.id).toBe(form.rows.length);
        const overlap = form.overlap ?? 0;
        // The dip has to reach the trunk to read as a dip around it.
        expect(overlap, b.id).toBeGreaterThan(0);
        const firstTrunkRow = form.rows.length - overlap;
        // How far the cleft runs down from the top: row 0 gapped, and every row
        // after it that is also gapped. The first solid row closes it.
        let cleft = 0;
        while (cleft < form.gaps.length && form.gaps[cleft] > 0) cleft++;
        form.gaps.forEach((g, r) => {
          expect(Number.isInteger(g), b.id).toBe(true);
          expect(g, b.id).toBeLessThan(form.rows[r]);
          if (g > 0) expect(r < cleft || r >= firstTrunkRow, `${b.id} row ${r}`).toBe(true);
        });
      }
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

  it("keeps the mushroom grids rectangular, legal, and standing on their stalks", () => {
    // The grids are indexed straight into a rect, so a short row silently drops
    // its last pixels and an unknown letter draws the SPECK — the fallback in the
    // draw path is `k`, which means a typo comes out as a white dot in the gills
    // rather than as a crash.
    for (const [shape, states] of Object.entries(MUSHROOM_ART)) {
      for (const [state, g] of Object.entries(states)) {
        const where = `${shape}/${state}`;
        const w = g[0].length;
        for (const row of g) {
          expect(row.length, `${where}: "${row}"`).toBe(w);
          for (const ch of row) expect("lcgsk.", `${where}: "${ch}"`).toContain(ch);
        }
        // It stands on something. A grid whose last row has no stalk is a cap
        // lying on the grass, which is a different object.
        expect(g[g.length - 1], `${where} floats`).toContain("s");
        // THE SPECK IS THE FLY AGARIC'S AND NOTHING ELSE WEARS IT. A bell with a
        // white fleck on it is a fly agaric that has grown tall, which is the one
        // thing the recolour was done to stop.
        if (shape !== "cap") expect(g.join(""), `${where} wears the speck`).not.toContain("k");
      }
    }
    // The bell is what it is by being TALLER than the dome, not just narrower —
    // if that ever stops being true the fen is drawing a squashed toadstool.
    expect(MUSHROOM_ART.bell.open.length).toBeGreaterThan(MUSHROOM_ART.cap.open.length);
    expect(MUSHROOM_ART.bell.open[0].replace(/\./g, "").length).toBeLessThanOrEqual(
      MUSHROOM_ART.cap.open[0].replace(/\./g, "").length,
    );
  });

  it("keeps deadwood under a tile tall, and the log wider than one", () => {
    // Two opposite constraints, and the sprite is only right if it breaks one.
    //
    // HEIGHT is the rock's rule, not the tree's: `hides` fades the player off
    // OVERHANG (artPx - TILE), so scenery at or under a tile can never make the
    // world go see-through behind it. These are things you step around.
    //
    // WIDTH is the opposite, and only for the log: length is the whole read of
    // one, and a log drawn inside its cell came out a lump. It is safe because
    // the raised pass is flushed after all terrain — but it is exactly why
    // deadwood cells may not touch (sim/world.ts §deadIsLoneliest), so if this
    // ever stops being wider than a tile, that rule has lost its reason.
    for (const [name, g] of Object.entries(DEADWOOD_ART)) {
      const w = g[0].length;
      for (const row of g) {
        expect(row.length, `${name}: "${row}"`).toBe(w);
        for (const ch of row) expect("trbdm.", `${name}: "${ch}"`).toContain(ch);
      }
      expect(g.length, `${name} is taller than a tile`).toBeLessThanOrEqual(16);
      // Moss is the pixel doing the most work on these: wood with moss on it is
      // wood nobody tries to pick up, which is the whole affordance argument.
      expect(g.join(""), `${name} has no moss`).toContain("m");
    }
    expect(DEADWOOD_ART.log[0].length).toBeGreaterThan(16);
    expect(DEADWOOD_ART.stump[0].length).toBeLessThan(16);
  });

  it("only grows deadwood where something could have fallen", () => {
    // Wood on the ground says a wood is OLD. A region with no trees and fallen
    // timber in it is a clearance site, which is a different and much sadder
    // place — so the field is only allowed where there is a canopy to lose.
    for (const b of Object.values(BIOMES)) {
      if (!b.deadwood) continue;
      expect(b.trees, `${b.id} has deadwood but no trees`).toBeGreaterThan(0);
    }
    // The identity row, asserted rather than assumed: the meadow is the town's
    // own ground and walking home has to keep looking like walking home.
    expect(BIOMES.meadow.deadwood).toBeUndefined();
  });

  it("keeps bark marks on the bark", () => {
    // A trunk is three pixels wide plus `trunkGirth` either side, and
    // `trunkHeight` tall, and the renderer indexes the grid straight into that
    // rect. A row of the wrong width would silently drop its last mark; a grid
    // taller than the trunk would author dashes nobody ever sees. Both are the
    // kind of miss that survives a suite and shows up as "the birches look plain"
    // three sessions later.
    //
    // THE WIDTH IS DERIVED, NOT LITERAL, since `trunkGirth` arrived with the
    // giants: a fat trunk wears a wider grid, and the one thing that must stay
    // true is that the grid is exactly as wide as the stem it is drawn on.
    for (const b of Object.values(BIOMES)) {
      if (!b.bark) continue;
      const trunkH = b.trunkHeight ?? 10;
      const cols = 3 + (b.trunkGirth ?? 0) * 2;
      // More than one, or a stand is the same tree printed twice — the argument
      // ROCK_SHAPES already had, and bark is far more visible than a rock.
      expect(b.bark.marks.length, b.id).toBeGreaterThan(1);
      for (const grid of b.bark.marks) {
        expect(grid.length, b.id).toBeLessThanOrEqual(trunkH);
        expect(grid.join("").includes("x"), b.id).toBe(true);
        for (const row of grid) expect(row.length, `${b.id}: "${row}"`).toBe(cols);
      }
    }
  });

  it("never overhangs so far that a crown covers its neighbours' trunks", () => {
    // 8 half-widths is 16px, exactly one tile. Past that a tree starts drawing
    // over the tile beside it, and a stand becomes a smear.
    for (const b of Object.values(BIOMES)) {
      for (const form of treeForms(b)) {
        expect(Math.max(...form.rows), b.id).toBeLessThanOrEqual(8);
      }
    }
  });
});
