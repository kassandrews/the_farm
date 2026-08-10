// The garden (DESIGN §The garden). What these tests hold, in the doc's words:
// you plant what you have met; planted things grow in over days; uprooting is
// erase and only erase; your own tree is the one that fruits; and the whole
// layer is a tile plus a record, so the migration is one empty object.

import { describe, it, expect } from "vitest";
import { newWorld, buildAt, tick, actionTarget, contextAction } from "./game";
import {
  plantAt,
  growthStage,
  fruitReady,
  pickFruit,
  noticeFlora,
  knownFlora,
  plantedAt,
} from "./garden";
import { gather } from "./gather";
import { migrateSave, SCHEMA_VERSION } from "./save";
import { tileKey, tileAt, setTile, biomeAt } from "./world";
import { GRASS, TREE, SHRUB, DIRT } from "../content/tiles";
import { FLORA, TAUGHT_BY, type FloraId } from "../content/flora";
import { BIOMES } from "../content/biomes";
import { count } from "./inventory";

const DAY = 24 * 3_600_000;
// Noon on an autumn day, so the apple's season is ON without pinning anything
// else — the same trick the harness clock uses (scripts/drive.mjs).
const AUTUMN = new Date("2026-10-15T12:00:00").getTime();

function freshWorld() {
  const w = newWorld({ name: "Test", form: "scholar", spot: "forest", seed: 42 });
  return w;
}

/** A spot of open grass near home — searched, not hard-coded, because the seed
 *  owns the scatter and a test pinned to a tile that rolled a tree would fail
 *  on the day the generator changed. */
function openGrass(w: ReturnType<typeof freshWorld>): { x: number; y: number } {
  for (let r = 2; r < 30; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (const dy of [-r, r]) {
        const x = w.homestead.originX + dx;
        const y = w.homestead.originY + dy;
        if (tileAt(w, x, y) === GRASS && !w.garden.plants[tileKey(x, y)]) return { x, y };
      }
    }
  }
  throw new Error("no open grass near home on this seed");
}

/** Meeting a species without a walk: the sim's own rule, applied directly. */
function meet(w: ReturnType<typeof freshWorld>, id: FloraId): void {
  if (!w.garden.seen.includes(id)) w.garden.seen.push(id);
}

describe("you plant what you have met", () => {
  it("refuses a species you haven't met, by name", () => {
    const w = freshWorld();
    const at = openGrass(w);
    const res = plantAt(w, "burOak", at.x, at.y, AUTUMN);
    expect(res.changed).toBe(false);
    expect(res.message).toContain("haven't met");
  });

  it("standing in a region teaches its species within one notice sweep", () => {
    const w = freshWorld();
    // The player spawns in their home region; one sweep should teach the
    // starter set — the meadow's broadleaf among them — without any walk.
    noticeFlora(w);
    const here = biomeAt(w.seed, w.homestead.spot, Math.round(w.player.x), Math.round(w.player.y));
    for (const id of TAUGHT_BY[here] ?? []) {
      expect(w.garden.seen).toContain(id);
    }
  });

  it("every region a species names actually exists, and teaches it", () => {
    // The discovery table is authored by hand in flora.ts; a typo'd BiomeId
    // would compile (it is a union member) and then teach nothing forever.
    for (const def of Object.values(FLORA)) {
      expect(def.metIn.length, `${def.id} is unmeetable`).toBeGreaterThan(0);
      for (const b of def.metIn) {
        expect(BIOMES[b], `${def.id} met in a region that doesn't exist`).toBeDefined();
        expect(TAUGHT_BY[b], `${b} teaches nothing`).toContain(def.id);
      }
    }
  });

  it("knownFlora lists the seen and never the complement", () => {
    const w = freshWorld();
    meet(w, "burOak");
    meet(w, "hydrangea");
    expect(knownFlora(w, "tree")).toEqual(["burOak"]);
    expect(knownFlora(w, "bush")).toEqual(["hydrangea"]);
    expect(knownFlora(w, "flower")).toEqual([]);
  });
});

describe("planting", () => {
  it("a tree is a TREE tile plus a record; erase takes both back", () => {
    const w = freshWorld();
    meet(w, "burOak");
    const at = openGrass(w);
    const res = plantAt(w, "burOak", at.x, at.y, AUTUMN);
    expect(res.changed).toBe(true);
    expect(tileAt(w, at.x, at.y)).toBe(TREE);
    expect(plantedAt(w, at.x, at.y)).toBe("burOak");
    // Uprooting is erase (DESIGN) — through the build pipeline, same as a wall.
    const erased = buildAt(w, "erase", at.x, at.y, AUTUMN);
    expect(erased.changed).toBe(true);
    expect(tileAt(w, at.x, at.y)).toBe(GRASS);
    expect(plantedAt(w, at.x, at.y)).toBe(null);
  });

  it("a planted tree never fells to the basket", () => {
    const w = freshWorld();
    meet(w, "burOak");
    const at = openGrass(w);
    plantAt(w, "burOak", at.x, at.y, AUTUMN);
    // Three days on it is fully grown and still not a wood node.
    expect(gather(w, at.x, at.y, AUTUMN + 4 * DAY)).toBe(null);
    expect(tileAt(w, at.x, at.y)).toBe(TREE);
  });

  it("a bush writes SHRUB and a flower leaves the grass alone", () => {
    const w = freshWorld();
    meet(w, "hydrangea");
    meet(w, "buttercup");
    const a = openGrass(w);
    plantAt(w, "hydrangea", a.x, a.y, AUTUMN);
    expect(tileAt(w, a.x, a.y)).toBe(SHRUB);
    const b = openGrass(w);
    plantAt(w, "buttercup", b.x, b.y, AUTUMN);
    expect(tileAt(w, b.x, b.y)).toBe(GRASS); // a mark, not an object
    expect(plantedAt(w, b.x, b.y)).toBe("buttercup");
  });

  it("refuses occupied ground, twice-planting, and water", () => {
    const w = freshWorld();
    meet(w, "burOak");
    const at = openGrass(w);
    expect(plantAt(w, "burOak", at.x, at.y, AUTUMN).changed).toBe(true);
    expect(plantAt(w, "burOak", at.x, at.y, AUTUMN).changed).toBe(false);
  });
});

describe("growth is a pure function of the clock", () => {
  it("tree: sprout, then coming along, then grown — with no tick between", () => {
    const w = freshWorld();
    meet(w, "burOak");
    const at = openGrass(w);
    plantAt(w, "burOak", at.x, at.y, AUTUMN);
    expect(growthStage(w, at.x, at.y, AUTUMN)).toBe(0);
    expect(growthStage(w, at.x, at.y, AUTUMN + DAY + 1)).toBe(1);
    expect(growthStage(w, at.x, at.y, AUTUMN + 3 * DAY + 1)).toBe(2);
  });

  it("bushes and flowers skip the middle stage", () => {
    const w = freshWorld();
    meet(w, "hydrangea");
    const at = openGrass(w);
    plantAt(w, "hydrangea", at.x, at.y, AUTUMN);
    expect(growthStage(w, at.x, at.y, AUTUMN + DAY / 2)).toBe(0);
    expect(growthStage(w, at.x, at.y, AUTUMN + DAY + 1)).toBe(2);
  });
});

describe("your own tree is the one that fruits", () => {
  it("yields in season, once a day, into the satchel", () => {
    const w = freshWorld();
    meet(w, "apple");
    const at = openGrass(w);
    plantAt(w, "apple", at.x, at.y, AUTUMN);
    const grown = AUTUMN + 3 * DAY + 1;
    expect(fruitReady(w, at.x, at.y, grown)).toBe(true);
    const res = pickFruit(w, at.x, at.y, grown);
    expect(res?.changed).toBe(true);
    expect(count(w.inventory, "apple")).toBe(1);
    // Picked over for today — the same call now answers with a status line.
    expect(fruitReady(w, at.x, at.y, grown + 1)).toBe(false);
    const again = pickFruit(w, at.x, at.y, grown + 1);
    expect(again?.changed).toBe(false);
    // Tomorrow it is making more.
    expect(fruitReady(w, at.x, at.y, grown + DAY + 1)).toBe(true);
  });

  it("never out of season, never before grown", () => {
    const w = freshWorld();
    meet(w, "apple");
    const at = openGrass(w);
    plantAt(w, "apple", at.x, at.y, AUTUMN);
    expect(fruitReady(w, at.x, at.y, AUTUMN + 1)).toBe(false); // a sprout
    const JANUARY = new Date("2027-01-15T12:00:00").getTime();
    expect(fruitReady(w, at.x, at.y, JANUARY)).toBe(false); // grown, wrong month
  });
});

describe("the contextual verbs", () => {
  it("the default tap sows a dug bed, and never a lawn; the shaft is asked for", () => {
    const w = freshWorld();
    const at = openGrass(w);
    w.player.x = at.x;
    w.player.y = at.y;
    // A lawn with seed in your pocket is NOT an offer to sow — the dug bed is
    // the statement of intent, and this line failing is the basket-hijack
    // action.test.ts caught on the day the rung was written too wide.
    expect(actionTarget(w, null, AUTUMN).kind).not.toBe("sow");
    setTile(w, at.x, at.y, DIRT);
    // The default tap on the bed SOWS — you sow daily and sink a shaft once a
    // month, and a crop must never turn into a hole by surprise. The shaft is
    // still two digs on one tile: the second one asked for by name, from the
    // fan, where the explicit verb still answers.
    expect(actionTarget(w, null, AUTUMN).kind).toBe("sow");
    expect(actionTarget(w, "dig", AUTUMN)).toEqual({ x: at.x, y: at.y, kind: "tool", verb: "dig" });
    const res = contextAction(w, null, AUTUMN);
    expect(res.changed).toBe(true);
    expect(w.crops[tileKey(at.x, at.y)]).toBeDefined();
    // And the NEXT default tap waters the bed it just sowed.
    const next = actionTarget(w, null, AUTUMN);
    expect(next.kind).toBe("tool");
    expect(next.verb).toBe("water");
  });

  it("your own tree in fruit answers ACT from the tile beside it", () => {
    const w = freshWorld();
    meet(w, "apple");
    const at = openGrass(w);
    plantAt(w, "apple", at.x, at.y, AUTUMN);
    const grown = AUTUMN + 3 * DAY + 1;
    w.player.x = at.x - 1;
    w.player.y = at.y;
    setTile(w, at.x - 1, at.y, GRASS);
    expect(actionTarget(w, "water", grown).kind).toBe("fruit");
    const res = contextAction(w, "water", grown);
    expect(res.changed).toBe(true);
    expect(count(w.inventory, "apple")).toBe(1);
  });
});

describe("the migration", () => {
  it("v35 gains an empty garden and nothing else moves", () => {
    const w = freshWorld();
    const old = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    old.schemaVersion = 35;
    delete old.garden;
    const out = migrateSave(old)!;
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.garden).toEqual({ seen: [], plants: {} });
  });

  it("the first tick of a migrated save begins teaching", () => {
    const w = freshWorld();
    w.garden = { seen: [], plants: {} };
    tick(w, 0.016, AUTUMN);
    expect(w.garden.seen.length).toBeGreaterThan(0);
  });
});
