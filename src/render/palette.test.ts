import { describe, it, expect } from "vitest";
import { scenePalette, seasonSkin, biomeSkin, mixHex, foliage, tuftInk } from "./palette";
import { MUSHROOM_ART, DEADWOOD_ART, PRICKLY_PEAR, shrubPeak, shrubRows } from "./renderer";
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

  it("lays snow only in winter, only where a region asked, and over its own colour", () => {
    // THE RULE THIS IS ALLOWED UNDER (content/biomes.ts §snow): a colour, never a
    // layer. `seasons.ts` refuses a snow LAYER because snow on every cell is the
    // per-cell edges band and snow that melted would be the game's first weather
    // with state. A per-region ground tint is neither.
    const snowy = Object.values(BIOMES).filter((b) => b.snow);
    expect(snowy.map((b) => b.id)).toEqual([
      "meadow",
      "pinewood",
      "birch",
      "granite",
      "prairie",
      "redwoods",
      "giants",
    ]);

    // AND IT HAS TO BE BRIGHT ENOUGH TO BE SNOW. The first set of amounts was
    // written as "how deep it lies" and resolved around luma 205, which
    // photographs as slush — the caution that talked them down was right about
    // #ffffff and wrong about everything between there and grey. Asserted on the
    // RESULT rather than on the amounts, because the amount that gets a floor to
    // white depends entirely on how hard its region tints the ground: 0.85 on the
    // meadow, which tints by nothing, and 0.92 in the redwoods, which tint hard.
    const winterPalette = scenePalette(seasonOn(at(1)), false);
    const bright = (h: string): number => {
      const [r, g, b] = rgb(h);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const b of snowy) {
      const lying = biomeSkin(
        seasonSkin(tileDef(GRASS), GRASS, winterPalette, b.seasonPull?.ground ?? 1),
        GRASS,
        b,
        "winter",
      ).color;
      expect(bright(lying), `${b.id}'s snow is dingy`).toBeGreaterThan(225);
      // Not white either: a floor at 255 is the brightest thing the game can
      // draw, and everything standing on it loses its own lit side.
      expect(bright(lying), `${b.id}'s snow is blown out`).toBeLessThan(245);
    }

    for (const b of Object.values(BIOMES)) {
      const summer = biomeSkin(tileDef(GRASS), GRASS, b);
      const winter = biomeSkin(tileDef(GRASS), GRASS, b, "winter");
      if (b.snow) {
        // It lands, and it lands PALER — a snow that darkened the ground would be
        // the field doing something other than what it is named for.
        expect(winter.color, `${b.id} has snow that does nothing`).not.toBe(summer.color);
        expect(rgb(winter.color)[2], `${b.id}'s snow is not paler`).toBeGreaterThan(
          rgb(summer.color)[2],
        );
      } else if (b.seasonGround?.winter) {
        // NOBODY TAKES THIS BRANCH TODAY AND IT IS HERE ON PURPOSE. The scrub was
        // drawn with a winter flush and it came out confusing rather than wrong —
        // green in the one month six other regions go white reads as a bug from
        // inside January, whatever the botany says (content/biomes.ts
        // §scrub.seasonGround). If a row ever does claim a green winter, the
        // claim it has to survive is this one: it must land, and it must land
        // DARKER, because a wet-season flush that brightened its ground is snow
        // by another name.
        expect(winter.color, `${b.id}'s rains do nothing`).not.toBe(summer.color);
        expect(rgb(winter.color)[2], `${b.id}'s rains read as snow`).toBeLessThan(
          rgb(summer.color)[2],
        );
      } else {
        // AND EVERY OTHER REGION IS BYTE-IDENTICAL IN JANUARY to what it was
        // before either field existed. Most rows asked for neither and must not
        // have acquired one.
        expect(winter, `${b.id} grew weather it never asked for`).toEqual(summer);
      }
    }
  });

  it("moves a named month's ground, darkens it, and leaves the others alone", () => {
    // TWO ROWS NOW, AND THE RULE HAD TO BE WIDENED TO LET THE SECOND IN — which
    // is worth reading before widening it again. This asserted that a
    // `seasonGround` month must be GREENER, and that was the scrub's claim
    // wearing the field's clothes: the scrub's year runs backwards because the
    // RAINS come in winter, so its named months are a green flush by definition.
    //
    // The fen's named month is a wet season too and is not green at all. October
    // is when a fen's water table comes back up; the ground goes sodden and the
    // place gets DARKER while the wood above it turns. Same field, same kind of
    // fact — what a month does to a floor — and the green was never the general
    // part of it.
    //
    // What IS general is the direction, and it is the winter test's rule one
    // season over: a wet season may not brighten its ground, because a floor that
    // lifts when the water arrives is snow by another name. Assert that, plus the
    // months a row did NOT name being byte-identical to its year-round self — the
    // clause that actually protects the point, which is that the scrub is parched
    // eight months of the year and the fen has three ordinary ones.
    const wet = Object.values(BIOMES).filter((b) => b.seasonGround);
    expect(wet.map((b) => b.id)).toEqual(["scrub", "fen"]);
    const luma = (h: string): number => {
      const [r, g, bl] = rgb(h);
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    for (const b of Object.values(BIOMES)) {
      const plain = biomeSkin(tileDef(GRASS), GRASS, b);
      for (const s of SEASONS) {
        const now = biomeSkin(tileDef(GRASS), GRASS, b, s.id);
        if (!b.seasonGround?.[s.id]) {
          // Winter is the snow's, and snow is a different field with its own test.
          if (s.id === "winter" && b.snow) continue;
          expect(now, `${b.id} moved in ${s.id}, which it never asked for`).toEqual(plain);
          continue;
        }
        expect(now.color, `${b.id}'s ${s.id} does nothing`).not.toBe(plain.color);
        expect(luma(now.color), `${b.id}'s ${s.id} reads as snow`).toBeLessThan(
          luma(plain.color),
        );
      }
    }
    // AND THE SCRUB'S OWN CLAIM SURVIVES AS THE SCRUB'S. Greener means the green
    // channel gains on the red — the measure that survives the season also moving
    // the whole picture. The fen is exempt because it never claimed it.
    const lift = (h: string): number => rgb(h)[1] - rgb(h)[0];
    const dry = biomeSkin(tileDef(GRASS), GRASS, BIOMES.scrub);
    for (const s of SEASONS) {
      if (!BIOMES.scrub.seasonGround?.[s.id]) continue;
      const now = biomeSkin(tileDef(GRASS), GRASS, BIOMES.scrub, s.id);
      expect(lift(now.color), `the scrub is not greener in ${s.id}`).toBeGreaterThan(
        lift(dry.color),
      );
    }
  });

  it("keeps the town's lawn identical in every month but the snowy one", () => {
    // The meadow states `ground.amount: 0` and the identity test above asserts
    // `biomeSkin` hands back the same OBJECT for it — the promise that the town's
    // grass is the colour it has always been. Snow is the one exception, and it
    // had to be a separate field to be one: spelled as a ground tint it would
    // have cost the guarantee in all four seasons to gain snow in one.
    expect(biomeSkin(tileDef(GRASS), GRASS, BIOMES.meadow)).toBe(tileDef(GRASS));
    expect(biomeSkin(tileDef(GRASS), GRASS, BIOMES.meadow, "winter")).not.toBe(tileDef(GRASS));
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
    // THROUGH `foliage`, WHICH IS WHAT DRAWS. This test used to recompute the
    // composition itself — `mixHex(season.crown, def.crown)` — and it passed for
    // months while the pines swung 26 RGB from July to October, because the thing
    // it measured was not the thing on screen. Asking the real function is the
    // whole point of the real function being exported.
    const autumn = scenePalette(seasonOn(at(10)), false);
    const summer = scenePalette(seasonOn(at(7)), false);
    const shift = (id: keyof typeof BIOMES) =>
      dist(foliage(BIOMES[id], summer, false), foliage(BIOMES[id], autumn, false));
    expect(shift("pinewood")).toBeLessThan(shift("birch"));
    expect(shift("birch")).toBeLessThan(shift("meadow"));
  });

  it("does not turn a tree that has never turned in its life", () => {
    // The four regions named for conifers (content/biomes.ts §seasonPull). Each
    // measured a third to a half of a deciduous wood's swing before the dial
    // existed: granite 39, redwoods and giants 30, pines 26, against a birch
    // wood's 67. A pine is green in October; only the light moves.
    const autumn = scenePalette(seasonOn(at(10)), false);
    const summer = scenePalette(seasonOn(at(7)), false);
    const shift = (id: keyof typeof BIOMES) =>
      dist(foliage(BIOMES[id], summer, false), foliage(BIOMES[id], autumn, false));
    for (const id of ["pinewood", "redwoods", "giants", "granite"] as const) {
      expect(shift(id), `${id} turns in autumn`).toBeLessThan(12);
      // AND IT IS NOT FROZEN, which is the other half and the easier mistake: a
      // sprite that takes none of the season has been cut out of the year and
      // pasted back on top of it, still lit for July while the ground around it
      // is November.
      expect(shift(id), `${id} ignores the season entirely`).toBeGreaterThan(1);
    }
  });

  it("still goes dark at night, however hard it refuses the month", () => {
    // THE BUG THE PULL EXISTS TO AVOID, and the reason it is not just a bigger
    // `crown.amount`: a tint sits on whichever arm the hour picked, so resisting
    // the season through it resists the dark as well. A wood that stayed bright
    // green at midnight would be a worse fault than a pine that turned orange.
    for (const s of SEASONS) {
      const day = scenePalette(s, false);
      const night = scenePalette(s, true);
      for (const id of ["pinewood", "redwoods", "granite"] as const) {
        const d = foliage(BIOMES[id], day, false);
        const n = foliage(BIOMES[id], night, false);
        expect(dist(d, n), `${id} in ${s.id} does not darken`).toBeGreaterThan(20);
      }
    }
  });

  it("lets a region hold the hour, but never lets one brighten after dark", () => {
    // THE RULE ABOVE, STATED AS WHAT IT ACTUALLY FORBIDS. `baseCrown`'s note said
    // "the day/night axis is nobody's to opt out of", and the fault it named was
    // exact: a wood that stayed BRIGHT GREEN at midnight. That is a rule about
    // BRIGHTNESS, and it was being enforced as a rule about CHANGE — which is a
    // different and larger claim, and the one the twilight country had to break.
    //
    // What was really being guarded is that nobody reaches this by accident. The
    // old way to refuse the night was to raise `crown.amount` until the season
    // could not get past it, which resists the dark silently and as a side effect.
    // `nightPull` is the opposite: a region has to say so, in a field named for
    // what it does, and then it may hold its hue — and only its hue. The global
    // wash is not this file's business and still falls on everything.
    const luma = (h: string): number => {
      const [r, g, b] = rgb(h);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const s of SEASONS) {
      const day = scenePalette(s, false);
      const night = scenePalette(s, true);
      for (const b of Object.values(BIOMES)) {
        const d = foliage(b, day, false);
        const n = foliage(b, night, false);
        // Never brighter after dark. The one direction that is always wrong.
        expect(luma(n), `${b.id} brightens at night`).toBeLessThanOrEqual(luma(d) + 0.5);
        // And a region that has NOT declared an hour dial must still take the
        // night, or it has refused the clock through some other field without
        // saying so — which is the accident this whole pair of tests is about.
        //
        // THE FLOOR IS 4 AND THE BURNT COUNTRY IS WHY. The obvious threshold is
        // "about as much as everybody moves", and that is wrong for the rows at
        // either end of the value scale: the cinders, the salt and the caldera all
        // swing about 10 in a good month and 6.6 in the worst one, not because
        // they are resisting anything but because a near-black snag has nowhere to
        // travel between two arms that are both dark. Distance from the arms is
        // not a measure of obedience for a colour that starts at the bottom.
        //
        // 4 is chosen to separate the only two populations that exist: the dusk
        // at 0.0 — which has said so — and 6.6 for the lowest region that has not.
        // It is a smoke alarm for a field going quietly to zero, not a style rule.
        if (b.nightPull?.crown === undefined) {
          expect(dist(d, n), `${b.id} refuses the night without saying so`).toBeGreaterThan(4);
        }
      }
      // AND THE ONE THAT DID DECLARE IT ACTUALLY HOLDS. Asserted as an identity
      // rather than "close enough": the point of the dial is that the hour stops
      // reaching the colour at all, and a near-miss would mean it still leaks.
      expect(foliage(BIOMES.dusk, day, false)).toBe(foliage(BIOMES.dusk, night, false));
      expect(foliage(BIOMES.dusk, day, true)).toBe(foliage(BIOMES.dusk, night, true));
      expect(tuftInk(BIOMES.dusk, day)).toBe(tuftInk(BIOMES.dusk, night));
    }
  });

  it("keeps autumn's crowns off autumn's ground", () => {
    // THE MEASUREMENT THAT STARTED THE AUTUMN PASS. October read drab and the
    // cause was not saturation — autumn's crowns are MORE saturated than
    // summer's. It was value: with the ground warmed to straw, the two largest
    // masses on screen sat at the same brightness in the same hue family, and in
    // the birch wood the crown-to-ground luma separation fell from 34 in July to
    // 20 in October. Two masses that close cannot separate, so the trees stopped
    // reading as objects standing on a ground.
    //
    // Asserted for the regions whose canopies actually turn — a conifer wood was
    // never in danger, which is exactly how the cause was found.
    const autumn = scenePalette(seasonOn(at(10)), false);
    const luma = (h: string): number => {
      const [r, g, b] = rgb(h);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    // THE BLOSSOM ROWS ARE EXEMPT, and measuring them is what earned the
    // exemption: they sit at a separation of TWO — in July, where nobody has ever
    // complained about them. Pink crowns over pale green ground separate on HUE
    // and not on value at all, which is the second way two masses can be told
    // apart and the reason this assertion is not a law of nature. The birch was
    // wrong in October because it had NEITHER: 29° of hue and the same
    // brightness. Value is the one to assert on for anything that turns warm,
    // because warm-on-warm is exactly where hue stops helping.
    // AND IT HAS TO ASK FOR OCTOBER'S GROUND, which it did not until the fen
    // grew one. `biomeSkin` was called with no season here, so what it measured
    // against was the region's year-round floor — fine while `seasonGround` was
    // the scrub's alone and named no autumn, and quietly wrong the moment a row
    // said what its October floor is. It read the fen's canopy against a floor
    // the fen does not have in the month being asserted about, which is the one
    // failure mode a measurement like this has: being right about the wrong two
    // colours.
    for (const id of ["meadow", "birch", "fen", "scrub"] as const) {
      const crown = foliage(BIOMES[id], autumn, false);
      const ground = biomeSkin(
        seasonSkin(tileDef(GRASS), GRASS, autumn),
        GRASS,
        BIOMES[id],
        "autumn",
      ).color;
      expect(
        Math.abs(luma(crown) - luma(ground)),
        `${id}: October's canopy is the same brightness as its floor`,
      ).toBeGreaterThan(28);

    }
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
    // The meadow now draws a SECOND form as well, and the line that used to
    // forbid it is why this one is worth reading. It said a second silhouette in
    // the meadow is a change to the view from the plaza and had to be decided as
    // one, looking at the plaza — which is what happened (content/biomes.ts
    // §meadow.crownAlt). What it was defending is form ZERO, and that is asserted
    // above and unchanged: whatever else grows here, the tree the game always
    // drew is still drawn, still BROADLEAF, still on the same stem.
    expect(BIOMES.meadow.crownAlt?.length, "the meadow drew a third tree").toBe(1);
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
    //
    // AND THE ONE EXCEPTION IS A TREE THAT IS NOT GROWN YET. The birches carry a
    // sapling (content/biomes.ts §birch.crownAlt), which disagrees about size on
    // purpose and is still obviously the same plant — because it is not a smaller
    // ADULT, it is a younger one. So the rule is a pair of ends with the middle
    // shut: match within a pixel, or be at most HALF as wide and half as tall.
    // The middle is where "a slightly different tree" lives, and that was always
    // the actual fault this asserts against — a form 6 wide against an 8 is a
    // second species; a form 3 wide and half the height is a child.
    const height = (f: { rows: number[]; overlap?: number; trunkHeight?: number }) =>
      (f.trunkHeight ?? 16) + f.rows.length - (f.overlap ?? 0);
    for (const b of Object.values(BIOMES)) {
      const forms = treeForms(b);
      if (forms.length < 2) continue;
      const own = Math.max(...forms[0].rows);
      for (const f of forms.slice(1)) {
        const girth = Math.max(...f.rows);
        const young = girth * 2 <= own && height(f) * 2 <= height(forms[0]);
        if (young) continue;
        expect(
          Math.abs(girth - own),
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
    // THE DUSK CAME OFF THE LIST, and how it left is the useful part. It was on
    // it for a stated reason — its trees are broadleaf, fly agaric partners beech
    // and oak, and more to the point "the dusk's whole idea is a wood where the
    // shapes are the ones you know and only the light is wrong, so a recoloured
    // cap there would be the region joining in."
    //
    // That objection is about a region INVENTING a mushroom, and it does not
    // reach a VARIETY. The dusk now draws Amanita muscaria var. guessowii, which
    // is a real yellow-orange form of the same species: same dome, same white
    // flecks, same genus and species, different colour morph. The shapes are
    // still the ones you know, which is the test the objection actually sets.
    //
    // The list is unchanged in what it asks. It is not "which regions may have a
    // red cap" — it is "a region that leaves this field blank is claiming to be a
    // fly agaric host, and has to be one". Declaring a cap has always exempted a
    // row from it (the `continue` above), and the dusk simply stopped being blank.
    //
    // The GLASS WOOD went the other way on the same evidence: its crown is the
    // birch's, so ecology allowed the red, and the palette overruled it. Both are
    // judgement calls; the point of the whitelist is that they have to be made.
    const REDS = new Set(["birch", "pinewood"]);
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
    }
    expect(DEADWOOD_ART.log[0].length).toBeGreaterThan(16);
    expect(DEADWOOD_ART.stump[0].length).toBeLessThan(16);
    // MOSS IS THE LOG'S JOB NOW, and this used to be asserted of both. Wood with
    // moss on it is wood nobody tries to pick up, which is the whole affordance
    // argument for a pair of objects that are the only standing things in the
    // game you cannot gather — so SOMETHING here has to carry it, and the rule
    // stays, aimed at the sprite with room for it.
    //
    // The stump gave its two green pixels back to the wood. They sat on the
    // shoulders, which on a nine-pixel-wide object is the silhouette's own edge —
    // the place the eye reads the shape — and it lost more from being
    // unresolvable than it gained from being unmistakably rotten. The log is four
    // times the sprite and wears its moss in the middle of the top face, where it
    // costs no outline at all.
    expect(DEADWOOD_ART.log.join(""), "the log has no moss").toContain("m");
  });

  it("keeps the prickly pear a pad cactus and not a saguaro", () => {
    // MORE THAN ONE, on the decor kit's rule — a single glyph scattered over a
    // whole region reads as printed however random the placement under it is.
    expect(PRICKLY_PEAR.length, "one cactus is a printed cactus").toBeGreaterThan(1);
    // And they have to be different DRAWINGS, or the list buys nothing. This used
    // to demand different MASS as well, on the scatter's own rule — a set all the
    // same size varies the outline and not the picture — and that assertion came
    // out with the pose it was written for. A single young pad is a rounded lump
    // on grass, which in this region is a boulder; at this size what says
    // "cactus" is the JOIN between two pads, and one pad has nothing to say it
    // with. If a third pose ever arrives, varying mass is still the right way to
    // buy it.
    expect(new Set(PRICKLY_PEAR.map((g) => g.join("|"))).size, "two identical cacti").toBe(
      PRICKLY_PEAR.length,
    );

    for (const art of PRICKLY_PEAR) {
      // The grid's own rules: rectangular, and only inks the draw path knows.
      const w = art[0].length;
      for (const row of art) {
        expect(row.length, `"${row}"`).toBe(w);
        for (const ch of row) expect("lx.", `"${ch}"`).toContain(ch);
      }
      // It stands in a shrub's footprint, so it obeys the shrub's ceiling: a
      // plant taller than its tile would be a tree, and this is undergrowth.
      expect(art.length, "the cactus outgrew its tile").toBeLessThanOrEqual(16);
      expect(w, "the cactus outgrew its tile").toBeLessThanOrEqual(16);

      // AND THE THING THE SPECIES ACTUALLY IS. Opuntia pads are flat ovals,
      // wider than they are tall; drawn taller than wide the sprite came out a
      // SAGUARO, which is the other cactus and the one from the cartoons. The
      // proportion is the whole read, so it is asserted rather than left to the
      // eye: the widest row is wider than the plant is tall.
      const widest = Math.max(...art.map((r) => r.replace(/\./g, "").length));
      expect(widest, "the pads are narrower than the plant is tall").toBeGreaterThan(
        art.length / 2,
      );

      // AND THE LIGHT COMES FROM THE UPPER LEFT, in every pose. A mirrored sprite
      // arrives lit down its right-hand side and reads as a plant with the sun
      // behind it standing beside plants with the sun in front — so the
      // silhouette may flip and the lit column may not. Every `l` sits at the
      // left end of its own run.
      for (const row of art) {
        expect(row, `lit on the wrong side: "${row}"`).not.toMatch(/x+l/);
      }

      // A WAIST, where there is more than one pad. Two pads merged into one blob
      // are a lumpy bush; the narrow join is what says they are separate flat
      // things growing out of each other. The single young pad has no join and
      // is exempt — it is one oval and has nothing to be joined to.
      const solid = art.map((r) => r.replace(/\./g, "").length);
      const fattest = solid.indexOf(Math.max(...solid));
      const below = solid.slice(fattest + 1);
      expect(Math.min(...below), "the pads merged into one blob").toBeLessThan(
        Math.max(...solid) / 2,
      );
    }
  });

  it("keeps the odd plant in the minority, wherever a region draws one", () => {
    // `shrubShapes` is a weighted list and the weight is the point: a region made
    // entirely of its most distinctive plant is a demonstration rather than a
    // place (content/biomes.ts §shrubShapes). The generic dome has to stay the
    // commonest thing in any region that has both.
    for (const b of Object.values(BIOMES)) {
      const kinds = b.shrubShapes;
      if (!kinds) continue;
      expect(b.shrubs, `${b.id} names shrub shapes and grows no shrubs`).toBeGreaterThan(0);
      const odd = kinds.filter((k) => k !== "bush").length;
      expect(odd, `${b.id}: no odd shrub, so the list buys nothing`).toBeGreaterThan(0);
      expect(odd * 2, `${b.id} is more cactus than country`).toBeLessThan(kinds.length);
    }
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
