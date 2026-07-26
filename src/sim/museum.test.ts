import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { migrateSave, SCHEMA_VERSION } from "./save";
import { MUSEUM, wingExhibits, placardText } from "../content/museum";
import { CROPS } from "../content/crops";
import { SKINS } from "../content/skins";
import { FURNITURE } from "../content/furniture";
import { TOWN_BUILDINGS } from "../content/town";
import { CAST } from "../content/cast";
import {
  donate,
  plinths,
  plinthRuns,
  donatable,
  collection,
  collectionEmpty,
  isDonated,
  nextAntiquity,
  remountExhibit,
  wingsWithDonations,
} from "./museum";
import { add, count } from "./inventory";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "scholar", spot: "forest", seed: 4 });
}

/** What you can only get by planting one, and what you can only get out of the
 *  ground. Used by the "neither wing owns a verb" test below. */
const FARMED = Object.values(CROPS).map((c) => c.yieldName);
const DUG = ["junk", "ore"];

/** A nature row whose material a new town is NOT already carrying. `newWorld`
 *  hands you eight wood so your first build works, which makes the timber row
 *  useless as the subject of a "refuses when you can't pay" test — it silently
 *  succeeds and the test passes for the wrong reason. */
const NATURE = wingExhibits("nature").find((d) => d.cost.item === "mushroom")!;

/** A fresh world wound back into a plausible v12 save: the small museum where
 *  the gallery now is, with the furniture v12 actually authored.
 *
 *  Built by editing a real world rather than by hand so the rest of the town —
 *  the other four buildings, their furniture, the residents — is genuinely
 *  what a save looks like. Getting this wrong the first time is what caught
 *  the bug: leaving the NEW museum's furniture behind made `stampBuilding`
 *  refuse the footprint, which is exactly what it should do. */
function asV12Save(): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(freshWorld())) as Record<string, unknown>;
  raw.schemaVersion = 12;
  const build = raw.build as Record<string, { id: string; finish: string }>;
  const furniture = raw.furniture as Record<string, unknown>;
  const now = TOWN_BUILDINGS.museum;

  // Take the gallery back out.
  for (let y = now.y0; y <= now.y1; y++) {
    for (let x = now.x0; x <= now.x1; x++) delete build[`${x},${y}`];
  }
  for (const f of now.furniture) delete furniture[`${f.x},${f.y}`];

  // Put the v12 room back: x -13..-7, y -12..-7, door at (-10,-7).
  for (let y = -12; y <= -7; y++) {
    for (let x = -13; x <= -7; x++) {
      if (x !== -13 && x !== -7 && y !== -12 && y !== -7) continue;
      build[`${x},${y}`] = { id: x === -10 && y === -7 ? "door" : "wall", finish: "whitewash" };
    }
  }
  for (const [x, y] of [
    [-12, -10],
    [-10, -11],
    [-8, -11],
  ]) {
    furniture[`${x},${y}`] = { id: x === -12 ? "table" : "shelf", facing: "s", finish: "whitewash" };
  }
  return raw;
}

describe("the museum — the record that isn't a score", () => {
  it("gives nothing back: not an item, not a finish, not a piece of furniture", () => {
    // The counterpart to heap.test.ts's "gives ONLY finishes". Donation's whole
    // character is that it is a gift, and a gift that pays is a trade — the
    // Gremlin already runs the finishes-for-junk counter and a second source
    // undercuts the only person in town who deals in what nobody wanted.
    //
    // Asserted structurally, because the reliable way to keep a rule is to
    // leave the vocabulary no way to say the other thing: an exhibit row has a
    // `cost` and no `gives` of any kind.
    for (const def of MUSEUM) {
      const row = def as unknown as Record<string, unknown>;
      expect(row.gives).toBeUndefined();
      expect(row.unlocks).toBeUndefined();
      expect(row.reward).toBeUndefined();
      expect(SKINS[def.id as keyof typeof SKINS]).toBeUndefined();
      expect(FURNITURE[def.id as keyof typeof FURNITURE]).toBeUndefined();
    }
    // And behaviourally: nothing about the world changes on donation except
    // the satchel going down and the record going up.
    const w = freshWorld();
    const before = { skins: [...w.skins.unlocked], furniture: { ...w.furniture } };
    const def = NATURE;
    add(w.inventory, def.cost.item, def.cost.count);
    expect(donate(w, def)).toBe(def.placards[0]);
    expect(w.skins.unlocked).toEqual(before.skins);
    expect(w.furniture).toEqual(before.furniture);
    expect(count(w.inventory, def.cost.item)).toBe(0);
  });

  it("keeps no total, no denominator, and no field anyone could divide", () => {
    // ROADMAP: "a collection is not a score when it has no total and no
    // denominator". The save is where that either holds or quietly stops
    // holding, so it is checked on the save.
    const w = freshWorld();
    expect(Object.keys(w.museum)).toEqual(["donated"]);
    const def = NATURE;
    add(w.inventory, def.cost.item, def.cost.count);
    donate(w, def);
    for (const d of w.museum.donated) {
      expect(Object.keys(d).sort()).toEqual(["id", "placard"]);
    }
  });

  it("is never read by anything that can accept, refuse, or gate", () => {
    // "Nothing may ever gate on the collection" (DESIGN), asserted against the
    // actual gates rather than by hand-waving. These are the files that decide
    // whether something is allowed: room qualification, housing, commissions,
    // and the home verdict. If a future feature wants one of them to care what
    // you have donated, this test is the conversation it has to have first.
    // Read as source rather than imported, because the assertion is about what
    // the file MENTIONS, not what it exports. `?raw` via Vite instead of
    // node:fs — this repo has no @types/node, and tsc reads the tests.
    const sources = import.meta.glob("./*.ts", { query: "?raw", import: "default", eager: true });
    const GATES = ["assign.ts", "housing.ts", "rooms.ts", "commission.ts", "home.ts"];
    for (const file of GATES) {
      const src = sources[`./${file}`] as string;
      expect(src, `${file} is missing — update this list`).toBeTypeOf("string");
      expect(src).not.toContain("museum");
    }
  });

  it("takes the donation all-or-nothing, and never twice", () => {
    // The bug redeem() was written for, one counter over: without the second
    // guard a repeat tap spends the junk and the record absorbs it in silence.
    const w = freshWorld();
    const def = NATURE;
    expect(donate(w, def)).toBe(null); // can't pay
    expect(w.museum.donated).toHaveLength(0);

    add(w.inventory, def.cost.item, def.cost.count * 2);
    expect(donate(w, def)).not.toBe(null);
    expect(donate(w, def)).toBe(null); // already has it
    expect(count(w.inventory, def.cost.item)).toBe(def.cost.count);
    expect(w.museum.donated.filter((d) => d.id === def.id)).toHaveLength(1);
  });

  it("reveals antiquities one at a time and never shows what is behind them", () => {
    // No empty slots is the load-bearing half of the rule (ROADMAP). Twelve
    // pending rows in a panel is a completion meter nobody had to write, so
    // only the next one is ever offered, and only as junk.
    const w = freshWorld();
    const antiquities = wingExhibits("antiquities");
    add(w.inventory, "junk", 999);

    for (const expected of antiquities) {
      const offered = donatable(w).filter((o) => o.def.wing === "antiquities");
      expect(offered).toHaveLength(1);
      expect(offered[0].def.id).toBe(expected.id);
      expect(offered[0].def.cost.item).toBe("junk");
      donate(w, expected);
    }
    // She runs out of things to be wrong about, and says so by offering none.
    expect(nextAntiquity(w)).toBe(null);
    expect(donatable(w).some((o) => o.def.wing === "antiquities")).toBe(false);
  });

  it("shows a wing only once it holds something", () => {
    const w = freshWorld();
    expect(collectionEmpty(w)).toBe(true);
    expect(wingsWithDonations(w)).toEqual([]);
    const def = NATURE;
    add(w.inventory, def.cost.item, def.cost.count);
    donate(w, def);
    expect(wingsWithDonations(w)).toEqual(["nature"]);
  });

  it("lets neither wing make one verb mandatory", () => {
    // The same failure the barter table exists to prevent, one axis over. If
    // every route into the museum ran through the shovel, museum-filling would
    // stop being its own way to play and become digging with a receipt.
    const nature = wingExhibits("nature");
    const antiquities = wingExhibits("antiquities");
    expect(nature.length).toBeGreaterThan(0);
    expect(antiquities.length).toBeGreaterThan(0);

    // Reachable by someone who never digs…
    const noDig = nature.filter((d) => !DUG.includes(d.cost.item));
    expect(noDig.length).toBeGreaterThan(0);
    // …and by someone who never farms…
    const noFarm = MUSEUM.filter((d) => !FARMED.includes(d.cost.item));
    expect(noFarm.length).toBeGreaterThan(0);
    // …and there are nature rows needing neither verb, so a pure gatherer has
    // somewhere to give before they have ever planted or turned a tile.
    const gathererOnly = nature.filter(
      (d) => !DUG.includes(d.cost.item) && !FARMED.includes(d.cost.item),
    );
    expect(gathererOnly.length).toBeGreaterThan(0);

    // The antiquities wing is junk and only junk — it is the digger's wing, and
    // pricing one of its rows in wood would blur the two into one long list.
    for (const def of antiquities) expect(def.cost.item).toBe("junk");
    // Flat cost, forever. A ramp is a progression curve with the number filed
    // off, and a museum that charges more the more you have given it has
    // misunderstood giving.
    const costs = new Set(antiquities.map((d) => d.cost.count));
    expect(costs.size).toBe(1);
    // One of each, in the nature wing. "One of each crop and gathered thing"
    // is the whole rule; a nature row asking for six mushrooms is a chore.
    for (const def of nature) expect(def.cost.count).toBe(1);
  });

  it("carries 2–3 readings per exhibit, which is what makes the away event free", () => {
    for (const def of MUSEUM) {
      expect(def.placards.length).toBeGreaterThanOrEqual(2);
      expect(def.placards.length).toBeLessThanOrEqual(3);
      expect(new Set(def.placards).size).toBe(def.placards.length);
    }
  });

  it("remounts a revision, and stands by the last one rather than cycling", () => {
    const w = freshWorld();
    const def = NATURE;
    add(w.inventory, def.cost.item, def.cost.count);
    donate(w, def);

    // Nothing donated has more than one unused reading beyond the last, so this
    // walks the whole list and then reports there is nothing left to revise.
    for (let i = 1; i < def.placards.length; i++) {
      const remount = remountExhibit(w, () => 0);
      expect(remount?.placard).toBe(def.placards[i]);
    }
    expect(remountExhibit(w, () => 0)).toBe(null);
    expect(w.museum.donated[0].placard).toBe(def.placards.length - 1);
    // Clamped, not wrapped — she does not go back to her first draft.
    expect(placardText(def, 99)).toBe(def.placards[def.placards.length - 1]);
    expect(collection(w)[0].placard).toBe(def.placards[def.placards.length - 1]);
  });

  it("ships the building AND the curator, or it repeats the shop's near-miss", () => {
    // A CAST row alone is a counter with nobody behind it; a stamp alone is a
    // scholar standing in a field (ROADMAP §"Adding a cast row does not add a
    // person"). She also has to be standing INSIDE her own museum.
    const w = freshWorld();
    const curator = w.villagers.find((v) => v.id === "museum");
    expect(curator?.name).toBe("Corrigal");
    const b = TOWN_BUILDINGS.museum;
    const stop = CAST.museum.schedule[0];
    expect(stop.x).toBeGreaterThan(b.x0);
    expect(stop.x).toBeLessThan(b.x1);
    expect(stop.y).toBeGreaterThan(b.y0);
    expect(stop.y).toBeLessThan(b.y1);
  });

  it("has a plinth cell for every exhibit, in both wings", () => {
    // `plinths()` drops anything past the authored cells rather than throwing
    // mid-frame, so running out would be SILENT — an exhibit you donated simply
    // wouldn't be in the room. This is where that gets caught instead.
    const cells = TOWN_BUILDINGS.museum.plinths ?? [];
    for (const wing of ["nature", "antiquities"] as const) {
      const need = wingExhibits(wing).length;
      const have = cells.filter((c) => c.wing === wing).length;
      expect(have, `${wing} wing`).toBeGreaterThanOrEqual(need);
    }
  });

  it("keeps every plinth inside the room and off everything else in it", () => {
    const b = TOWN_BUILDINGS.museum;
    const taken = new Set<string>();
    for (const f of b.furniture) {
      const def = FURNITURE[f.id];
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) taken.add(`${f.x + dx},${f.y + dy}`);
      }
    }
    taken.add(`${b.door.x},${b.door.y + 1}`); // the doorstep inside
    taken.add(`${CAST.museum.schedule[0].x},${CAST.museum.schedule[0].y}`); // Corrigal

    for (const c of b.plinths ?? []) {
      // Strictly interior — a case standing in the wall ring would be inside
      // the masonry.
      expect(c.x, `${c.x},${c.y}`).toBeGreaterThan(b.x0);
      expect(c.x, `${c.x},${c.y}`).toBeLessThan(b.x1);
      expect(c.y, `${c.x},${c.y}`).toBeGreaterThan(b.y0);
      expect(c.y, `${c.x},${c.y}`).toBeLessThan(b.y1);
      expect(taken.has(`${c.x},${c.y}`), `plinth at ${c.x},${c.y} is on something`).toBe(false);
    }
  });

  it("never puts two cases on adjacent rows", () => {
    // The per-cell edges band rule, caught before it bit a fourth time. Two
    // runs on neighbouring rows pair a light edge against a dark one and the
    // gallery stripes; a walkway between them is also just how a gallery works.
    const rows = [...new Set((TOWN_BUILDINGS.museum.plinths ?? []).map((c) => c.y))].sort(
      (a, b) => a - b,
    );
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i] - rows[i - 1], `rows ${rows[i - 1]} and ${rows[i]}`).toBeGreaterThan(1);
    }
  });

  it("fills a case in donation order and draws it as one run, not six", () => {
    const w = freshWorld();
    const antiquities = wingExhibits("antiquities");
    add(w.inventory, "junk", 999);

    donate(w, antiquities[0]);
    donate(w, antiquities[1]);
    const runs = plinthRuns(w);
    // Two neighbouring exhibits are ONE case two cells long, not two cases.
    expect(runs).toHaveLength(1);
    expect(runs[0].on).toHaveLength(2);
    expect(runs[0].x1 - runs[0].x0).toBe(1);

    // The Nth donation into a wing takes the Nth authored cell of that wing.
    const cells = (TOWN_BUILDINGS.museum.plinths ?? []).filter((c) => c.wing === "antiquities");
    const placed = plinths(w);
    expect(placed.map((p) => `${p.x},${p.y}`)).toEqual(
      cells.slice(0, 2).map((c) => `${c.x},${c.y}`),
    );
    // And nothing is drawn for what hasn't been given — no empty slots, in
    // geometry rather than in a panel.
    expect(placed).toHaveLength(2);
  });

  it("splits a case where there is a gap rather than drawing holes in it", () => {
    // A wing whose run has spilled onto a second row must not join up into one
    // impossible case spanning both.
    const w = freshWorld();
    add(w.inventory, "junk", 999);
    for (const def of wingExhibits("antiquities")) donate(w, def);
    for (const run of plinthRuns(w)) {
      expect(run.on).toHaveLength(run.x1 - run.x0 + 1); // contiguous, no holes
      expect(new Set(run.on.map((p) => p.y))).toEqual(new Set([run.y])); // one row
    }
  });

  it("rebuilds the too-small v12 museum, and keeps its record", () => {
    // v12 shipped a 5x4 room that could not hold seventeen exhibits with any
    // circulation. v13 clears that shell and stamps the gallery. A donation
    // made in between (there is no UI for one yet, but the schema allows it)
    // must survive: the record is the museum, the building is just the room.
    const old = asV12Save();
    old.museum = { donated: [{ id: "timber", placard: 1 }] };

    const migrated = migrateSave(old);
    expect(migrated).not.toBe(null);
    expect(migrated!.schemaVersion).toBe(SCHEMA_VERSION);
    // The record came through untouched, placard index and all.
    expect(migrated!.museum.donated).toEqual([{ id: "timber", placard: 1 }]);
    // The old shell is gone: (-7,-12) was its corner and is open floor now.
    expect(migrated!.build["-7,-12"]).toBeUndefined();
    // And the gallery is there, corners and door.
    const b = TOWN_BUILDINGS.museum;
    expect(migrated!.build[`${b.x0},${b.y0}`]?.id).toBe("wall");
    expect(migrated!.build[`${b.x1},${b.y1}`]?.id).toBe("wall");
    expect(migrated!.build[`${b.door.x},${b.door.y}`]?.id).toBe("door");
  });

  it("refuses to bulldoze a v12 museum somebody has built in", () => {
    // The one migration that removes anything only removes what it stamped. A
    // wall the player added inside the old footprint means hands off entirely —
    // and then stampBuilding refuses the new footprint on its own, which is the
    // outcome the stamp has always given over player work.
    const old = asV12Save();
    const build = old.build as Record<string, { id: string; finish: string }>;
    build["-10,-10"] = { id: "wall", finish: "pine" }; // somebody's own wall, inside

    const migrated = migrateSave(old);
    expect(migrated).not.toBe(null);
    expect(migrated!.build["-10,-10"]).toEqual({ id: "wall", finish: "pine" });
    expect(migrated!.build["-7,-12"]?.id).toBe("wall"); // old shell left standing
  });

  it("backfills an empty record for a town that never had a museum", () => {
    // Never inferred, never credited: an existing save donated nothing because
    // there was nowhere to donate it, and a migration that invented exhibits
    // would put things in the record that did not happen.
    const w = freshWorld();
    const old = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
    old.schemaVersion = 11;
    delete old.museum;

    const migrated = migrateSave(old);
    expect(migrated).not.toBe(null);
    expect(migrated!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated!.museum).toEqual({ donated: [] });
    expect(migrated!.villagers.some((v) => v.id === "museum")).toBe(true);
    expect(isDonated(migrated!, "timber")).toBe(false);
  });
});
