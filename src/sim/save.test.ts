import { describe, it, expect } from "vitest";
import { newWorld, loadedFinish } from "./game";
import { serialize, deserialize, migrateSave, MIGRATIONS, SCHEMA_VERSION } from "./save";
import { tileKey, shafts, RECLAIM_MS, floorFinish } from "./world";
import { SHAFT, CAVE_FLOOR, DIRT, FLOOR } from "../content/tiles";
import { TOWN_BUILDINGS, TOWN_FIXTURES, footprintCells, plotFenceCells, PLOT } from "../content/town";
import { count, spend } from "./inventory";
import { STARTING_SEED } from "./seeds";
import { STARTING_CROP } from "../content/crops";
import { STAGE } from "../content/festivals";
import { CAST } from "../content/cast";
import { skinDef } from "../content/skins";
import { ARRIVALS } from "../content/arrivals";
import { befriend } from "./friendship";
import { invite } from "./company";
import { startPlay, playing } from "./play";
import { makeRng } from "./rng";
import { MUSEUM } from "../content/museum";
import { gain, hasMet } from "./met";


/** Climb the ladder from `from` up to and including the rung that lands on `to`.
 *
 *  Tests about a specific rung use this rather than `migrateSave`, which always
 *  runs to the top. That was harmless while every rung only added fields; v37
 *  moves four buildings, so it rewrites the cells the museum rungs are about and
 *  a full climb can no longer show you what happened in the middle. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function climb(raw: Record<string, unknown>, from: number, to: number): any {
  let out = raw;
  for (let v = from; v < to; v++) out = MIGRATIONS[v](out);
  return out;
}

function freshWorld() {
  return newWorld({ name: "Keeper", form: "menace", spot: "riverside", seed: 99 });
}

describe("versioned saves", () => {
  it("round-trips a world through serialize/deserialize", () => {
    const w = freshWorld();
    w.overrides["1,1"] = 2;
    const back = deserialize(serialize(w));
    expect(back).not.toBeNull();
    expect(back!.player.name).toBe("Keeper");
    expect(back!.overrides["1,1"]).toBe(2);
    expect(back!.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects a save from a future schema version", () => {
    const w = freshWorld() as unknown as Record<string, unknown>;
    w.schemaVersion = SCHEMA_VERSION + 5;
    expect(migrateSave(w)).toBeNull();
  });

  it("rejects a malformed / foreign blob", () => {
    expect(migrateSave({ hello: "world" })).toBeNull();
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave(42)).toBeNull();
  });

  it("accepts a current-version well-formed save", () => {
    const w = freshWorld();
    expect(migrateSave(JSON.parse(serialize(w)))).not.toBeNull();
  });
});

describe("migrations", () => {
  /** A v1 save: the schema before the player carried its own memory log. */
  function v1Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const player = { ...(w.player as Record<string, unknown>) };
    delete player.memory;
    delete player.imported;
    return { ...w, schemaVersion: 1, player };
  }

  it("upgrades a v1 save without losing the town", () => {
    const raw = v1Save();
    (raw.overrides as Record<string, number>)["3,3"] = 2; // a board they laid
    const migrated = migrateSave(raw);
    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated!.player.name).toBe("Keeper");
    expect(migrated!.overrides["3,3"]).toBe(2); // their work survived
  });

  it("backfills the player's new fields truthfully", () => {
    // A v1 player was always hatched here, so it has no history to lose.
    const migrated = migrateSave(v1Save())!;
    expect(migrated.player.memory).toEqual([]);
    expect(migrated.player.imported).toBe(false);
  });

  it("climbs the whole ladder v1 → current in one go", () => {
    const migrated = migrateSave(v1Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    // v3 retired the villagers' stop/dwell fields.
    for (const v of migrated.villagers) {
      expect(v).not.toHaveProperty("stop");
      expect(v).not.toHaveProperty("dwell");
      // …without losing who they are or what they remember.
      expect(typeof v.name).toBe("string");
      expect(Array.isArray(v.memory)).toBe(true);
    }
  });

  it("gives a v4 town an empty structure layer without disturbing it", () => {
    // v4 had no way to build anything that stands up, so an empty layer is the
    // complete backfill — there is nothing to reconstruct, and everything the
    // player already laid on the GROUND layer has to survive untouched.
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.build;
    (w.overrides as Record<string, number>)["4,4"] = 2; // a board they laid
    // This rung alone. Later rungs stamp the town into `build` on purpose (v7,
    // v15, v37) — "an empty structure layer" is a claim about what v5 backfills,
    // not about what a save looks like at the top of the ladder.
    const migrated = climb({ ...w, schemaVersion: 4 }, 4, 5);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.build).toEqual({});
    expect(migrated.overrides["4,4"]).toBe(2);
  });

  it("does not wipe a structure layer that is already there", () => {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const built = { "9,9": { id: "wall", finish: "pine" } };
    const migrated = migrateSave({ ...w, schemaVersion: 4, build: built })!;
    expect(migrated.build["9,9"]).toEqual({ id: "wall", finish: "pine" });
  });

  it("gives a v5 town a furniture layer, keeping its walls", () => {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.furniture;
    const built = { "9,9": { id: "wall", finish: "pine" } };
    const migrated = migrateSave({ ...w, schemaVersion: 5, build: built })!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(typeof migrated.furniture).toBe("object");
    expect(migrated.build["9,9"]).toEqual({ id: "wall", finish: "pine" });
  });

  it("carries a whole v1 town up the ladder to the current schema", () => {
    // The ladder is only as good as its longest climb; each new layer has to
    // keep working for a save that predates every one of them.
    const migrated = migrateSave(v1Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.player.name).toBe("Keeper");
    // v7 stamps the town in, so a save from before buildings existed comes out
    // with the same town a new game gets rather than a permanently empty one.
    expect(migrated.build[tileKey(TOWN_BUILDINGS.townhall.door.x, TOWN_BUILDINGS.townhall.door.y)]).toMatchObject(
      { id: "door" },
    );
  });

  // --- v6 → v7: the first migration that WRITES ---------------------------
  // Every migration before this one backfilled a missing field. This one adds
  // buildings to a town that already exists, which means it is the first that
  // could take something away. These tests are the guard on that.

  /** A v6 save: a real world, wound back to before buildings existed. */
  function v6Save(extra: Record<string, unknown> = {}) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    return { ...w, schemaVersion: 6, build: {}, furniture: {}, crops: {}, overrides: {}, ...extra };
  }

  it("stamps the town into a save that predates buildings", () => {
    const migrated = migrateSave(v6Save())!;
    const hall = TOWN_BUILDINGS.townhall;
    expect(migrated.build[tileKey(hall.x0, hall.y0)]).toMatchObject({ id: "wall" });
    expect(migrated.build[tileKey(hall.door.x, hall.door.y)]).toMatchObject({ id: "door" });
    const bed = TOWN_BUILDINGS.margfrom_house.furniture[0];
    expect(migrated.furniture[tileKey(bed.x, bed.y)]).toMatchObject({ id: "bed" });
  });

  it("NEVER stamps over something the player built", () => {
    // A shed standing in one corner of where the town hall would go.
    const hall = TOWN_BUILDINGS.townhall;
    const mine = tileKey(hall.x1, hall.y1);
    const migrated = migrateSave(
      v6Save({ build: { [mine]: { id: "wall", finish: "walnut" } } }),
    )!;
    // Their wall is untouched, in their finish...
    expect(migrated.build[mine]).toEqual({ id: "wall", finish: "walnut" });
    // ...and the hall didn't land half-built around it.
    const stampedElsewhere = footprintCells(hall).filter(
      (c) => tileKey(c.x, c.y) !== mine && tileKey(c.x, c.y) in migrated.build,
    );
    expect(stampedElsewhere).toEqual([]);
  });

  it("NEVER buries a crop the player planted", () => {
    const house = TOWN_BUILDINGS.margfrom_house;
    const planted = tileKey(house.x0 + 1, house.y0 + 1);
    const migrated = migrateSave(
      v6Save({ crops: { [planted]: { cropId: "carrot", stage: 1 } } }),
    )!;
    expect(migrated.crops[planted]).toBeDefined();
    expect(tileKey(house.door.x, house.door.y) in migrated.build).toBe(false);
  });

  it("skips only the building that clashes, not the whole town", () => {
    const hall = TOWN_BUILDINGS.townhall;
    const migrated = migrateSave(
      v6Save({ build: { [tileKey(hall.door.x, hall.door.y)]: { id: "wall", finish: "walnut" } } }),
    )!;
    // The hall is refused, but Margfrom still gets her house.
    const house = TOWN_BUILDINGS.margfrom_house;
    expect(migrated.build[tileKey(house.door.x, house.door.y)]).toMatchObject({ id: "door" });
  });

  it("lets a ground edit through — a dug tile is cheap to redo", () => {
    const hall = TOWN_BUILDINGS.townhall;
    const dug = tileKey(hall.x0 + 1, hall.y0 + 1);
    const migrated = migrateSave(v6Save({ overrides: { [dug]: 1 } }))!;
    expect(migrated.build[tileKey(hall.door.x, hall.door.y)]).toMatchObject({ id: "door" });
  });

  // --- v7 → v8: home became a claim on a bed -------------------------------

  /** A v7 save: a real world with its buildings, wound back to before anyone
   *  had a bed claim. */
  function v7Save(extra: Record<string, unknown> = {}) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const villagers = (w.villagers as Record<string, unknown>[]).map(({ homeBed, ...rest }) => {
      void homeBed;
      return rest;
    });
    return { ...w, schemaVersion: 7, villagers, ...extra };
  }

  it("claims the bed a returning player's town actually has", () => {
    const migrated = migrateSave(v7Save())!;
    const bed = TOWN_BUILDINGS.margfrom_house.furniture.find((f) => f.id === "bed")!;
    const her = migrated.villagers.find((v) => v.id === "resident1")!;
    expect(her.homeBed).toBe(tileKey(bed.x, bed.y));
  });

  it("claims NOTHING when the save has no bed there", () => {
    // A v7 town whose stamp was refused (the player had built west of the
    // plaza) has no Margfrom's house and so no bed. The content table still
    // says where one would go; believing it would point her at furniture that
    // doesn't exist — which resolves to the plaza, the same place an honest
    // null gets her, reached by writing down something false first.
    const migrated = migrateSave(v7Save({ furniture: {} }))!;
    const her = migrated.villagers.find((v) => v.id === "resident1")!;
    expect(her.homeBed).toBeNull();
  });

  it("gives the deskbound fixed cast no bed at all", () => {
    const migrated = migrateSave(v7Save())!;
    expect(migrated.villagers.find((v) => v.id === "office")!.homeBed).toBeNull();
  });

  it("does not overwrite a claim that is already there", () => {
    const mine = tileKey(8, 6);
    const save = v7Save();
    (save.villagers as Record<string, unknown>[]).find((v) => v.id === "resident1")!.homeBed = mine;
    const migrated = migrateSave(save)!;
    expect(migrated.villagers.find((v) => v.id === "resident1")!.homeBed).toBe(mine);
  });

  // --- v8 → v9: commissioned housing ----------------------------------------

  function v8Save(extra: Record<string, unknown> = {}) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const { commissions, ...rest } = w;
    void commissions;
    return { ...rest, schemaVersion: 8, ...extra };
  }

  it("gives a returning town an empty commission list", () => {
    const migrated = migrateSave(v8Save())!;
    expect(migrated.commissions).toEqual([]);
  });

  it("files no paperwork about houses people already live in", () => {
    // Nothing here can be backfilled and nothing should be. A commission
    // records that somebody ARRIVED and asked; Margfrom has lived in her house
    // since the vertical slice, and inventing a form about it would be the
    // town remembering something that didn't happen.
    const migrated = migrateSave(v8Save())!;
    expect(migrated.commissions).toHaveLength(0);
    expect(migrated.villagers.find((v) => v.id === "resident1")!.homeBed).not.toBeNull();
  });

  it("leaves a v9 save's commissions alone", () => {
    const existing = [
      { id: "newcomer:0", index: 0, arrivedAt: 1, tent: { x: 2, y: 3 }, filedAt: null, stampedAt: null },
    ];
    const migrated = migrateSave(v8Save({ commissions: existing }))!;
    expect(migrated.commissions).toEqual(existing);
  });

  // --- v9 → v10: cloth ------------------------------------------------------

  // The return type is annotated, not inferred, and that is load-bearing: an
  // object spread of a Record<string, unknown> does NOT carry the index
  // signature through, so the inferred type is just the keys written literally
  // below — and reaching for any OTHER field of the save (`save.build`) is then
  // a compile error. `npm test` never noticed, because vitest doesn't
  // typecheck; `npm run build` runs tsc across the tests and the Vercel deploy
  // failed on it. A raw save is a bag of parsed JSON, so say so.
  function v9Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const skins = w.skins as { unlocked: string[]; selected: Record<string, string> };
    const { cloth, ...selected } = skins.selected;
    void cloth;
    return {
      ...w,
      schemaVersion: 9,
      skins: { unlocked: skins.unlocked.filter((id) => id !== "undyed" && id !== "madder"), selected },
      ...extra,
    };
  }

  // These read the shape v27 left behind, not the one v10 wrote. A v9 save runs
  // the whole ladder, and v27 rekeys `skins.selected` from material class to
  // build tool — so "somewhere to put a cloth finish" is now the two cloth
  // pieces having one, which is the same claim in the current vocabulary.
  it("gives an existing town somewhere to put a cloth finish", () => {
    const migrated = migrateSave(v9Save())!;
    expect(loadedFinish(migrated, "cushion")).toBe("undyed");
    expect(loadedFinish(migrated, "rug")).toBe("undyed");
  });

  it("unlocks the cloth starters, or the picker would be empty", () => {
    // Without this an existing town could buy cloth and find nothing to build
    // it in — availableSkins shows only what's unlocked.
    const migrated = migrateSave(v9Save())!;
    expect(migrated.skins.unlocked).toContain("undyed");
    expect(migrated.skins.unlocked).toContain("madder");
  });

  it("never takes away a finish that was earned", () => {
    const save = v9Save();
    (save.skins as { unlocked: string[] }).unlocked.push("whitewash");
    const migrated = migrateSave(save)!;
    expect(migrated.skins.unlocked).toContain("whitewash");
  });

  it("brings the shop AND the shopkeeper to an existing town", () => {
    // Both or neither: a counter with nobody behind it is stranger to walk into
    // than no shop, and a shopkeeper standing in a field is worse than both.
    const migrated = migrateSave(v9Save())!;
    const shop = TOWN_BUILDINGS.shop;
    expect(migrated.build[tileKey(shop.door.x, shop.door.y)]).toMatchObject({ id: "door" });
    expect(migrated.villagers.find((v) => v.id === "shop")).toBeDefined();
  });

  it("does not disturb the buildings a returning town already had", () => {
    // The v10 stamp re-runs the whole table; stampBuilding's occupied check is
    // what stops it rewriting the town hall it finds already standing there.
    const save = v9Save();
    const hall = TOWN_BUILDINGS.townhall;
    const corner = tileKey(hall.x0, hall.y0);
    (save.build as Record<string, unknown>)[corner] = { id: "wall", finish: "walnut" };
    const migrated = migrateSave(save)!;
    expect(migrated.build[corner]).toEqual({ id: "wall", finish: "walnut" });
  });

  it("leaves a chosen cloth finish alone", () => {
    const save = v9Save();
    (save.skins as { selected: Record<string, string> }).selected.cloth = "madder";
    const migrated = migrateSave(save)!;
    expect(loadedFinish(migrated, "cushion")).toBe("madder");
    expect(loadedFinish(migrated, "rug")).toBe("madder");
  });

  it("keeps villager identity and memory across the v2 → v3 drop", () => {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const villagers = (w.villagers as Record<string, unknown>[]).map((v) => ({
      ...v,
      stop: 2,
      dwell: 17,
    }));
    const migrated = migrateSave({ ...w, schemaVersion: 2, villagers })!;
    // Her name comes off the table, not out of this file. It was "Margfrom"
    // until the naming pass, and v22 → v23 deliberately rewrites the name of
    // every authored villager in a live save — so a literal here would have
    // asserted that the migration DIDN'T do its job. What "identity survived"
    // means is that resident1 is still resident1 and still knows what she knew.
    expect(migrated.villagers.find((v) => v.id === "resident1")?.name).toBe(
      CAST.resident1.name,
    );
    // The count is deliberately not asserted: v10 adds the shopkeeper, and any
    // later institution will add another. What must hold is that the people
    // who were already there are still themselves.
    expect(migrated.villagers.find((v) => v.id === "office")).toBeDefined();
  });

  // --- v10 → v11: the junk economy ------------------------------------------

  function v10Save(): Record<string, unknown> {
    // Annotated, not inferred — see v9Save. An object spread of a
    // Record<string, unknown> drops the index signature, and reaching for any
    // field not written literally here is then a compile error that only
    // `npm run build` finds.
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    return { ...w, schemaVersion: 10 };
  }

  it("brings the heap AND the Gremlin to an existing town", () => {
    // Both or neither, exactly as for the shop in v10: a pile with nobody
    // sorting it is scenery, and a Gremlin standing in a field is worse.
    const migrated = migrateSave(v10Save())!;
    const heap = TOWN_BUILDINGS.heap;
    expect(migrated.build[tileKey(heap.door.x, heap.door.y)]).toMatchObject({ id: "door" });
    expect(migrated.villagers.find((v) => v.id === "heap")).toBeDefined();
  });

  it("adds no fields, because junk needed none", () => {
    // The whole v11 story. An existing town reads zero junk (the satchel is a
    // Partial<Record>), and the heap's finishes are non-starters, so its
    // unlocked list is already correct. If this ever has to change, something
    // has been designed that the schema didn't want.
    //
    // Stated as "a v10 save and a v11 save of the same town end up identical",
    // rather than "nothing changed", because later steps of the ladder DO add
    // things (v14 hands out seed). Comparing the two paths isolates this one
    // step no matter how long the ladder gets.
    const asV10 = migrateSave(v10Save())!;
    const asV11 = migrateSave({ ...v10Save(), schemaVersion: 11 })!;
    expect(asV10.inventory).toEqual(asV11.inventory);
    expect(asV10.skins).toEqual(asV11.skins);
    expect(Object.keys(asV10).sort()).toEqual(Object.keys(asV11).sort());
  });

  it("does not take away a finish redeemed at the heap", () => {
    // The migration re-runs starterSkins unioning in v10 and must never
    // subtract; a player who dug for `salvage` keeps it.
    const save = v10Save();
    (save.skins as { unlocked: string[] }).unlocked.push("salvage");
    expect(migrateSave(save)!.skins.unlocked).toContain("salvage");
  });
});

describe("v13 → v14: the seed stall", () => {
  function v13Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const { seeds, ...rest } = w;
    void seeds;
    const inventory = { ...(w.inventory as Record<string, number>) };
    delete inventory.seed; // nobody had seed before there was seed
    return { ...rest, schemaVersion: 13, inventory, ...extra };
  }

  it("hands an existing town enough seed to keep planting", () => {
    // NOT generosity — the migration refusing to take something away. Sowing
    // now costs a seed, so without this, ground a returning player could plant
    // on yesterday would refuse them today.
    const migrated = migrateSave(v13Save())!;
    expect(count(migrated.inventory, "seed")).toBe(STARTING_SEED);
    expect(count(migrated.inventory, "seed")).toBe(count(freshWorld().inventory, "seed"));
  });

  it("backfills the starting variety and nothing else", () => {
    // A v13 town unlocked nothing because there was nothing to unlock, and
    // crediting it with the radish would be a record of something that didn't
    // happen — the v11→v12 museum rule, one field over.
    const migrated = migrateSave(v13Save())!;
    expect(migrated.seeds.unlocked).toEqual([STARTING_CROP]);
    expect(migrated.seeds.selected).toBe(STARTING_CROP);
  });

  it("tops up rather than assigns, so a re-run can never confiscate a satchel", () => {
    const migrated = migrateSave(v13Save({ inventory: { wood: 8, seed: 4 } }))!;
    expect(count(migrated.inventory, "seed")).toBe(4 + STARTING_SEED);
  });

  it("brings the stall AND the Blessed Carrot, or it repeats the shop's bug", () => {
    // Asserted against the stall's COUNTER rather than its door: Derek's stall
    // stopped being a building (content/town.ts §THE SEED STALL) and is a counter
    // under an awning now. The claim is unchanged — a v13 save gets the stall and
    // the person who keeps it, and neither arrives without the other.
    const migrated = migrateSave(v13Save())!;
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall")!;
    expect(migrated.furniture[tileKey(counter.x, counter.y)]).toMatchObject({ id: counter.id });
    expect(migrated.villagers.some((v) => v.id === "seedstall")).toBe(true);
  });
});

describe("v15 → v16: the plaza stage", () => {
  function v15Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    // A town from before the stage existed: no Blob, no platform in the square.
    const villagers = (w.villagers as { id: string }[]).filter((v) => v.id !== "stage");
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    delete furniture[tileKey(STAGE.x, STAGE.y)];
    return { ...w, schemaVersion: 15, villagers, furniture, ...extra };
  }

  it("brings the stage AND the Blob, or it repeats the shop's bug", () => {
    const migrated = migrateSave(v15Save())!;
    expect(migrated.furniture[tileKey(STAGE.x, STAGE.y)]).toMatchObject({ id: "stage" });
    expect(migrated.villagers.some((v) => v.id === "stage")).toBe(true);
  });

  it("adds no fields, because a festival is a date and an attendance is a memory", () => {
    // The v11 story again, and stated the same way — a v15 save and a v16 save
    // of the same town end up identical — so that it stays true however long
    // the ladder gets. What this step exists for is the STAMP: the ladder only
    // runs below SCHEMA_VERSION, so without a bump a live town would never
    // hear about a new fixture or a new institution, field or no field.
    const asV15 = migrateSave(v15Save())!;
    const asV16 = migrateSave({ ...v15Save(), schemaVersion: 16 })!;
    expect(Object.keys(asV15).sort()).toEqual(Object.keys(asV16).sort());
    expect(asV15.inventory).toEqual(asV16.inventory);
    expect(asV15.skins).toEqual(asV16.skins);
  });

  it("credits nobody with a festival they didn't attend", () => {
    // The v11→v12 rule: a migration may furnish a town, never invent its
    // history. An old save was at no festivals because there were none.
    const migrated = migrateSave(v15Save())!;
    for (const v of migrated.villagers) {
      expect(v.memory.some((m) => m.kind === "festival")).toBe(false);
    }
    expect(migrated.player.memory.some((m) => m.kind === "festival")).toBe(false);
  });
});

describe("v16 → v17: the underground", () => {
  function v16Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.under; // a town from before the layer existed
    return { ...w, schemaVersion: 16, ...extra };
  }

  it("adds an empty under map — solid rock is what a v16 town was under", () => {
    const migrated = migrateSave(v16Save())!;
    expect(migrated.under).toEqual({});
  });

  it("does not sink a shaft", () => {
    // A migration may furnish a town, never dig in it (the v11→v12 rule, one
    // layer down). Going underground has to be something the player did.
    const migrated = migrateSave(v16Save())!;
    expect(shafts(migrated)).toEqual([]);
    expect(Object.values(migrated.overrides).includes(SHAFT)).toBe(false);
  });

  it("keeps a tunnel that is already there", () => {
    // Idempotence in the direction that matters: re-running the step must not
    // refill someone's cave. Guards against a later edit writing `{}` flat.
    const dug = { "3,4": CAVE_FLOOR };
    const migrated = migrateSave(v16Save({ under: dug }))!;
    expect(migrated.under).toEqual(dug);
  });

  it("rekeys nothing on the surface", () => {
    // This rung and no further: v37 re-lays the town's streets and takes four
    // buildings' floors up, so a full climb legitimately changes `overrides`.
    const before = v16Save();
    const migrated = climb(before, 16, 17);
    expect(migrated.overrides).toEqual(before.overrides);
  });
});

describe("v17 → v18: the player carries a layer", () => {
  function v17Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const player = { ...(w.player as Record<string, unknown>) };
    delete player.layer;
    return { ...w, schemaVersion: 17, player, ...extra };
  }

  it("backfills the surface — the only layer a v17 town could reach", () => {
    const migrated = migrateSave(v17Save())!;
    expect(migrated.player.layer).toBe("surface");
  });

  it("never strands a returning player underground", () => {
    // You get out of a cave by standing on the shaft you came down. A save that
    // came up the ladder has no shaft in it, so anything but "surface" here
    // would put the player in rock with no way back.
    const migrated = migrateSave(v17Save())!;
    expect(shafts(migrated)).toEqual([]);
    expect(migrated.player.layer).toBe("surface");
  });
});

describe("v18 → v19: the player carries a heading", () => {
  function v18Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const player = { ...(w.player as Record<string, unknown>) };
    delete player.heading;
    return { ...w, schemaVersion: 18, player, ...extra };
  }

  it("faces a returning player the way a new one starts", () => {
    // There is no heading anywhere in a v18 save to recover, and the first step
    // the player takes overwrites this before anything can read it. What matters
    // is that an upgraded town and a fresh one are pointed the same way.
    const migrated = migrateSave(v18Save())!;
    expect(migrated.player.heading).toBe("s");
    expect(migrated.player.heading).toBe(freshWorld().player.heading);
  });

  it("keeps a heading that is already there", () => {
    const migrated = migrateSave(v18Save({ player: { ...(v18Save().player as object), heading: "n" } }))!;
    expect(migrated.player.heading).toBe("n");
  });

  it("refuses a heading that isn't one", () => {
    // The save is a blob on someone's disk. A garbage heading would aim ACT at
    // no cell at all, which underground is the button quietly doing nothing.
    const migrated = migrateSave(v18Save({ player: { ...(v18Save().player as object), heading: "up" } }))!;
    expect(migrated.player.heading).toBe("s");
  });
});

describe("v19 → v20: somebody can walk with you", () => {
  function v19Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.company;
    return { ...w, schemaVersion: 19, ...extra };
  }

  it("brings a returning player back alone", () => {
    // Null is the only truthful backfill: a v19 save has no company slot, so
    // nobody was with you when you closed the tab.
    const migrated = migrateSave(v19Save())!;
    expect(migrated.company).toBeNull();
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("leaves the villagers alone", () => {
    // Company is a fact about right now, not a property of a person. A
    // `following` flag on every villager would be the same fact written eight
    // times with seven copies free to drift.
    const before = v19Save();
    const migrated = migrateSave(before)!;
    expect(migrated.villagers).toEqual(before.villagers);
  });
});

describe("v20 → v21: furniture can stand in the rock", () => {
  function v20Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.underFurniture;
    return { ...w, schemaVersion: 20, ...extra };
  }

  it("backfills an empty record, which is the only truthful answer", () => {
    // A v20 town could not put anything down there — build mode refused the
    // underground outright — so "nothing installed" is not a convenient guess.
    // Same argument as v16 → v17's empty `under`.
    const migrated = migrateSave(v20Save())!;
    expect(migrated.underFurniture).toEqual({});
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rekeys nothing — every surface entry keeps meaning the surface", () => {
    // The reason the underground got its own record rather than a `u:` prefix in
    // `furniture`: five modules read that map as a surface fact, and a migration
    // that moved keys around would have had to be trusted by all of them.
    const before = v20Save();
    const migrated = migrateSave(before)!;
    expect(migrated.furniture).toEqual(before.furniture);
  });

  it("keeps what's already down there, if a save somehow has it", () => {
    const lamp = { "3,4": { id: "lamp", facing: "s", finish: "pine" } };
    const migrated = migrateSave(v20Save({ underFurniture: lamp }))!;
    expect(migrated.underFurniture).toEqual(lamp);
  });
});

describe("v21 → v22: dug earth grasses over", () => {
  function v21Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.reclaim;
    return { ...w, schemaVersion: 21, ...extra };
  }

  it("reconstructs timers from the holes already on the map", () => {
    // The first migration where EMPTY would have been the wrong backfill. Every
    // other new record described something an older town couldn't do; this one
    // describes something every town with a shovel has already been doing, and
    // its bare patches are sitting there in `overrides`.
    const before = Date.now();
    const migrated = migrateSave(
      v21Save({ overrides: { "4,4": DIRT, "5,4": DIRT, "6,4": FLOOR } }),
    )!;
    expect(Object.keys(migrated.reclaim).sort()).toEqual(["4,4", "5,4"]);
    // Dated from THIS LOAD, not from a dig time nobody recorded: an old scar gets
    // one more day. A save that opened onto a lawn where its dug plot had been
    // would read as the game having thrown work away.
    expect(migrated.reclaim["4,4"]).toBeGreaterThanOrEqual(before + RECLAIM_MS);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("leaves dirt that a felled tree is already coming back to", () => {
    // Two timers on one tile is the race this record was shaped to avoid, and the
    // node's timer promises something different: it puts the TREE back.
    const migrated = migrateSave(
      v21Save({
        overrides: { "4,4": DIRT },
        regrow: { "4,4": { node: "tree", at: 123 } },
      }),
    )!;
    expect(migrated.reclaim).toEqual({});
    expect(migrated.regrow).toEqual({ "4,4": { node: "tree", at: 123 } });
  });

  it("a town that never dug gets an empty record and no phantom lawns", () => {
    const migrated = migrateSave(v21Save({ overrides: {} }))!;
    expect(migrated.reclaim).toEqual({});
  });
});

describe("v22 → v23: everybody has a name", () => {
  function v22Save(villagers: Record<string, unknown>[]): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    return { ...w, schemaVersion: 22, villagers };
  }

  /** A villager the way a live save holds one: name COPIED in, not referenced. */
  function saved(id: string, name: string): Record<string, unknown> {
    return {
      id,
      name,
      form: "scholar",
      fixed: false,
      x: 0,
      y: 0,
      layer: "surface",
      facing: 1,
      friendship: 40,
      memory: [{ kind: "arrived", at: 1 }],
      lastLine: "",
      homeBed: null,
    };
  }

  it("renames the institutions a live save was still calling by their species", () => {
    // The reason this migration exists at all: `name` is the one villager field
    // COPIED into the save rather than read from the table, so a deployed town
    // would have gone on calling him the Tired Office Creature forever.
    const migrated = migrateSave(
      v22Save([saved("office", "Tired Office Creature"), saved("shop", "Fancy Little Menace")]),
    )!;
    const byId = (id: string) => migrated.villagers.find((v) => v.id === id)!;
    expect(byId("office").name).toBe(CAST.office.name);
    expect(byId("shop").name).toBe(CAST.shop.name);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("renames a housed newcomer from the row that admitted them", () => {
    // The id encodes the arrival index (sim/commission.ts), which is the only
    // reason a newcomer can be renamed at all — they have no CAST row.
    const migrated = migrateSave(v22Save([saved("newcomer:0", "Bissenette")]))!;
    expect(migrated.villagers[0].name).toBe(ARRIVALS[0].name);
  });

  it("never touches a name that came from The Meadow", () => {
    // THE CARE OF THE WHOLE FUNCTION. An imported sprite's name is not ours to
    // rewrite — the import is read-only in both directions (CLAUDE.md §Saves),
    // and there is no table row to rewrite it from even if it were.
    const migrated = migrateSave(v22Save([saved("newcomer:99", "Wobblesworth")]))!;
    expect(migrated.villagers[0].name).toBe("Wobblesworth");
  });

  it("keeps friendship and memory while the name changes", () => {
    // A rename is not a new person. If this ever drops the log, somebody loses
    // every afternoon they spent with a villager to a cosmetic pass.
    const migrated = migrateSave(v22Save([saved("resident1", "Margfrom")]))!;
    const her = migrated.villagers[0];
    expect(her.name).toBe(CAST.resident1.name);
    expect(her.friendship).toBe(40);
    expect(her.memory).toHaveLength(1);
  });
});

describe("v23 → v24: the ground gained a memory", () => {
  function v23Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.places;
    return { ...w, schemaVersion: 23 };
  }

  it("gives an old town an empty log rather than an invented past", () => {
    // IT HAS TO BE EMPTY, and that is the whole decision. Backfilling would be
    // easy — every plank in `build` is a floor the player laid, every claimed
    // `homeBed` is somebody who sleeps there — and every entry would be a
    // fabrication with a made-up timestamp on it, in a system whose only promise
    // is that it says things that happened.
    // Asserted against SCHEMA_VERSION rather than 24: `migrateSave` runs the
    // whole ladder, so a v23 save comes back at whatever the current version
    // is, and pinning the literal here breaks every time a later rung is added.
    const migrated = migrateSave(v23Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.places).toEqual([]);
  });

  it("invents nothing from the buildings that are already standing", () => {
    const raw = v23Save();
    raw.build = { "10,10": { id: "floor", finish: "pine" }, "10,11": { id: "wall", finish: "pine" } };
    const migrated = climb(raw, 23, 24); // this rung only — v37 re-lays the town
    expect(migrated.places).toEqual([]);
    // And the buildings themselves are untouched: a migration that reads the
    // world to describe its past must not also rewrite it.
    expect(migrated.build).toEqual(raw.build);
  });

  it("leaves everything else exactly as it was", () => {
    const raw = v23Save();
    const migrated = migrateSave(raw)!;
    expect(migrated.villagers).toEqual(raw.villagers);
    expect(migrated.inventory).toEqual(raw.inventory);
    expect(migrated.museum).toEqual(raw.museum);
  });
});

describe("v24 → v25: the town hall grew a filing cabinet", () => {
  function v24Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.filings;
    return { ...w, schemaVersion: 24 };
  }

  it("gives an old town an empty cabinet", () => {
    // There is no honest backfill even in principle: nobody filed anything,
    // because until this version there was nothing to file.
    const migrated = migrateSave(v24Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.filings).toEqual([]);
  });

  it("adds nothing about which forms the hall is offering", () => {
    // The releases are a total function of how long you have lived here, so
    // there is no schedule to persist. If a `releasedBatches` field ever
    // appears in a save, something has misunderstood the feature.
    const migrated = migrateSave(v24Save())!;
    expect(Object.keys(migrated)).not.toContain("filingBatches");
    expect(Object.keys(migrated)).not.toContain("releasedBatches");
  });

  it("leaves the rest of the town alone", () => {
    const raw = v24Save();
    const migrated = migrateSave(raw)!;
    expect(migrated.villagers).toEqual(raw.villagers);
    expect(migrated.places).toEqual(raw.places);
    expect(migrated.museum).toEqual(raw.museum);
  });
});

describe("v25 → v26: the Notebook", () => {
  function v25Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    delete w.notebook;
    return { ...w, schemaVersion: 25 };
  }

  it("gives an old town a blank notebook", () => {
    // The backfill is not merely dishonest here but impossible in principle: an
    // entry records that you NOTICED something, and a save records where you
    // are, never where you have been. There is no trace of the fen a v25 town
    // walked through last March.
    const migrated = migrateSave(v25Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.notebook).toEqual([]);
  });

  it("stores no distance, depth or high-water mark of any kind", () => {
    // sim/mining.ts and content/junk.ts both refuse a "deepest reached" counter
    // in writing. A farthest-from-plaza field would be the same object renamed,
    // and it would be visible right here in the save.
    const migrated = migrateSave(v25Save())!;
    for (const banned of ["farthest", "furthest", "deepest", "explored", "maxDepth"]) {
      expect(Object.keys(migrated)).not.toContain(banned);
    }
  });

  it("leaves the rest of the town alone", () => {
    const raw = v25Save();
    const migrated = migrateSave(raw)!;
    expect(migrated.villagers).toEqual(raw.villagers);
    expect(migrated.filings).toEqual(raw.filings);
    expect(migrated.places).toEqual(raw.places);
  });
});

describe("v26 → v27: floors carry their own finish", () => {
  /** A v26 save: floors laid, a town-wide wood finish chosen, and the note kind
   *  spelled the way it was spelled before floors stopped being planks. */
  function v26Save(townWood = "walnut"): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const overrides = { ...(w.overrides as Record<string, number>), "5,5": 2, "6,5": 2, "7,5": 0 };
    const player = { ...(w.player as Record<string, unknown>), memory: [{ kind: "built_plank", at: 1000 }] };
    const villagers = (w.villagers as Record<string, unknown>[]).map((v) => ({
      ...v,
      memory: [{ kind: "built_plank", at: 1000 }],
    }));
    return {
      ...w,
      schemaVersion: 26,
      overrides,
      player,
      villagers,
      places: [{ kind: "built_plank", x: 5, y: 5, at: 1000 }],
      skins: { unlocked: ["pine", "walnut", "granite", "undyed"], selected: { wood: townWood, stone: "granite", cloth: "undyed" } },
    };
  }

  it("stamps the town-wide finish onto every floor, so nothing changes colour", () => {
    // The whole point of v27 is that floors stop moving when you change your
    // mind. A migration that shuffled them on the way in would be the last time
    // they ever did.
    const migrated = migrateSave(v26Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.finishes["5,5"]).toBe("walnut");
    expect(migrated.finishes["6,5"]).toBe("walnut");
  });

  it("writes nothing for ground that was never a floor", () => {
    const migrated = migrateSave(v26Save())!;
    expect(migrated.finishes["7,5"]).toBeUndefined(); // grass
  });

  it("stores NOTHING at all when the town was building in pine", () => {
    // An absent entry already means pale pine, so the commonest case must cost
    // zero bytes — otherwise the map is the size of everything ever paved
    // rather than the size of the choices actually made.
    // Through v27 only. The streets arrive at v37 wearing cobble, which is a
    // finish the town chose and not one this rung stored.
    const migrated = climb(v26Save("pine"), 26, 27);
    expect(migrated.finishes).toEqual({});
    expect(floorFinish(migrated, 5, 5)).toBe("pine"); // and still reads back right
  });

  it("rekeys the finish selection from material class to build tool", () => {
    const migrated = migrateSave(v26Save())!;
    expect(loadedFinish(migrated, "floor")).toBe("walnut");
    expect(loadedFinish(migrated, "wall")).toBe("walnut");
    expect(loadedFinish(migrated, "cushion")).toBe("undyed");
    // The door was asserted here too, back when a door wore a finish. It does
    // not any more (content/structures.ts §door.finishes), and the migration
    // still writes it an entry — harmlessly, since nothing reads one for a tool
    // with no finish classes. What the rekey has to get right is one tool per
    // class, and the three above are that.
  });

  it("renames built_plank in all three logs, or old memories are orphaned", () => {
    // Dialogue is written against the note kind (CLAUDE.md: villagers must be
    // able to reference remembered events). Leave the old string in the save and
    // a villager who watched you lay a floor quietly stops mentioning it.
    const migrated = migrateSave(v26Save())!;
    expect(migrated.player.memory[0].kind).toBe("built_floor");
    expect(migrated.villagers[0].memory[0].kind).toBe("built_floor");
    expect((migrated.places as { kind: string }[])[0].kind).toBe("built_floor");
    expect(JSON.stringify(migrated)).not.toContain("built_plank");
  });

  it("keeps everything else about the note it renamed", () => {
    const migrated = migrateSave(v26Save())!;
    expect((migrated.places as { x: number; y: number; at: number }[])[0]).toMatchObject({ x: 5, y: 5, at: 1000 });
  });

  it("leaves the rest of the town alone", () => {
    const raw = v26Save();
    const migrated = climb(raw, 26, 27); // this rung only — v37 moves four buildings
    expect(migrated.build).toEqual(raw.build);
    expect(migrated.crops).toEqual(raw.crops);
    expect(migrated.skins.unlocked).toEqual(["pine", "walnut", "granite", "undyed"]);
  });
});

/** Where the museum stood before the street plan moved it two rows south
 *  (content/town.ts §The street plan) — and where every save old enough to need
 *  the v27 and v28 museum migrations still has it.
 *
 *  FROZEN HERE, exactly as the migrations themselves freeze it. These fixtures
 *  used to be built by taking a FRESH world and repainting whatever museum it
 *  happened to contain, which quietly tied a test about saves from three months
 *  ago to wherever the museum is today: the day the building moved, every one of
 *  them started asserting on a key that no longer existed and failed with
 *  "cannot read properties of undefined". A migration is frozen in time by
 *  contract, so the world it runs against has to be too. */
const OLD_MUSEUM = { x0: -13, y0: -16, x1: -6, y1: -7, door: { x: -10, y: -7 } };

/** Put that museum's wall ring into a build map, in one finish. */
function oldMuseumRing(
  build: Record<string, { id: string; finish: string }>,
  finish: string,
): void {
  for (let y = OLD_MUSEUM.y0; y <= OLD_MUSEUM.y1; y++) {
    for (let x = OLD_MUSEUM.x0; x <= OLD_MUSEUM.x1; x++) {
      const ring =
        x === OLD_MUSEUM.x0 || x === OLD_MUSEUM.x1 || y === OLD_MUSEUM.y0 || y === OLD_MUSEUM.y1;
      if (!ring) continue;
      const isDoor = x === OLD_MUSEUM.door.x && y === OLD_MUSEUM.door.y;
      // The leaf is joinery and joinery is wood, in every era of this building.
      build[`${x},${y}`] = isDoor ? { id: "door", finish: "whitewash" } : { id: "wall", finish };
    }
  }
}

describe("v27 → v28: the museum is masonry", () => {
  /** A v27 save with the museum's walls as the old table stamped them:
   *  whitewash planks, no windows, at the coordinates it stood on then. */
  function v27Save(repaint?: Record<string, string>): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    oldMuseumRing(build, "whitewash");
    for (const [key, finish] of Object.entries(repaint ?? {})) {
      build[key] = { ...build[key], finish };
    }
    return { ...w, schemaVersion: 27, build };
  }

  /** The museum's north-west corner — on the ring, and a wall rather than the
   *  door, which sits in the middle of the south side at (-10,-7). */
  const CORNER = "-13,-16";
  const DOOR = "-10,-7";

  it("turns the museum's plank walls to stone", () => {
    const migrated = climb(v27Save(), 27, 30);
    expect(migrated.schemaVersion).toBe(30);
    // Through v28 (cobble) and out the far side of v29 (marble). Asserted at
    // the END of the ladder, not at 28, because that is where a real save lands.
    expect(migrated.build[CORNER].finish).toBe("marble");
  });

  it("leaves the door leaf alone", () => {
    // Joinery is wood even in a stone building. The door's FRAME picks the
    // masonry up from the wall beside it at draw time and stores nothing.
    const migrated = climb(v27Save(), 27, 30);
    expect(migrated.build[DOOR].id).toBe("door");
    expect(migrated.build[DOOR].finish).toBe("whitewash");
  });

  it("does not touch a wall the player has repainted", () => {
    // The reason this edits instead of re-stamping the town the way v15 did.
    // A re-stamp rewrites every perimeter cell from the table and would undo
    // the player's choice, which outranks ours.
    const migrated = climb(v27Save({ [CORNER]: "oxblood" }), 27, 30);
    expect(migrated.build[CORNER].finish).toBe("oxblood");
  });

  it("leaves every other building's walls as they were", () => {
    // The museum alone. Two civic buildings in the same stone is a category, not
    // an identity — and the town hall being SLATE today is that rule holding
    // rather than breaking it: marble is pale and wide, slate is dark and tight,
    // and one rung repainting the other's walls would still be the bug.
    //
    // UNCHANGED rather than a literal colour, and that is the fix this test
    // needed: it asserted "ash", which was the hall's finish the day it was
    // written and is not any more (the hall is slate now — see content/town.ts).
    // A test for "this rung touches nobody else" should compare before with
    // after, or it is really a test of what colour the hall happens to be.
    const before = v27Save();
    const wall = (b: Record<string, unknown>) =>
      (b.build as Record<string, { finish: string }>)["-3,-9"];
    const migrated = climb(before, 27, 30);
    expect(wall(migrated)).toEqual(wall(before));
  });
});

describe("v28 → v29: marble, and windows in the façade", () => {
  /** A v28 save: the museum in cobble, with a solid wall where the windows go. */
  function v28Save(repaint?: Record<string, { id: string; finish: string }>): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    oldMuseumRing(build, "cobble");
    for (const [key, cell] of Object.entries(repaint ?? {})) build[key] = cell;
    return { ...w, schemaVersion: 28, build };
  }

  const CORNER = "-13,-16";
  const PANE = "-12,-7"; // one of the four façade cells
  const SOLID = "-7,-7"; // south wall, deliberately left unglazed

  it("turns cobble to marble", () => {
    const migrated = climb(v28Save(), 28, 30);
    expect(migrated.schemaVersion).toBe(30);
    expect(migrated.build[CORNER].finish).toBe("marble");
  });

  it("cuts the four façade cells into windows", () => {
    const migrated = climb(v28Save(), 28, 30);
    for (const key of ["-12,-7", "-11,-7", "-9,-7", "-8,-7"]) {
      expect(migrated.build[key].id, key).toBe("window");
    }
  });

  it("leaves the corners and the far end of the south wall solid", () => {
    // Glazing to the edge reads as a shed with the walls missing. A corner of
    // plain masonry is what says the building is holding itself up.
    const migrated = climb(v28Save(), 28, 30);
    expect(migrated.build[SOLID].id).toBe("wall");
    expect(migrated.build[CORNER].id).toBe("wall");
  });

  it("gives the sash a wood finish, not the wall's stone", () => {
    // A window's own finish paints the frame; the masonry around the opening
    // comes from the run via shellFinish. A marble sash would be an arrow slit.
    const migrated = climb(v28Save(), 28, 30);
    expect(migrated.build[PANE].finish).toBe("whitewash");
  });

  it("does not glaze a cell the player has already changed", () => {
    // Stricter than v28's repaint check: the cell must still be a WALL. Somebody
    // who knocked the façade through and put a door there keeps their door.
    const migrated = climb(v28Save({ [PANE]: { id: "door", finish: "walnut" } }), 28, 30);
    expect(migrated.build[PANE].id).toBe("door");
  });

  it("does not repaint a wall the player has repainted", () => {
    const migrated = climb(v28Save({ [CORNER]: { id: "wall", finish: "oxblood" } }), 28, 30);
    expect(migrated.build[CORNER].finish).toBe("oxblood");
  });
});

describe("v29 → v30: the farming memories stop naming the carrot", () => {
  /** A v29 save with both old kinds in all three logs. `planted_carrot` is
   *  logged the way it always was — with no value at all — and
   *  `harvested_carrot` with the one it has always carried. */
  function v29Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const memory = [
      { kind: "planted_carrot", at: 1000 },
      { kind: "harvested_carrot", at: 2000, value: "a radish" },
      { kind: "dug", at: 3000 },
    ];
    const player = { ...(w.player as Record<string, unknown>), memory };
    const villagers = (w.villagers as Record<string, unknown>[]).map((v) => ({ ...v, memory }));
    return {
      ...w,
      schemaVersion: 29,
      player,
      villagers,
      places: [
        { kind: "planted_carrot", x: 5, y: 5, at: 1000 },
        { kind: "harvested_carrot", x: 6, y: 5, at: 2000 },
      ],
    };
  }

  it("renames both kinds in the player's memory, the villagers', and the ground's", () => {
    // All three logs or none. A kind left behind in any one of them is a memory
    // that still exists and can never be spoken again, because nothing matches
    // it — the failure mode is silence, which looks exactly like nothing having
    // happened.
    const migrated = migrateSave(v29Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);

    const kinds = (log: { kind: string }[]) => log.map((e) => e.kind);
    expect(kinds(migrated.player.memory)).toEqual(["planted", "harvested", "dug"]);
    for (const v of migrated.villagers) {
      expect(kinds(v.memory)).toEqual(["planted", "harvested", "dug"]);
    }
    expect(kinds(migrated.places)).toEqual(["planted", "harvested"]);
  });

  it("backfills a forgotten crop so an old planting memory can still speak", () => {
    // The bank line reads the value now. Without this the sentence renders with
    // a hole in it for every memory made before today — `tmpl(ev.value ?? "")`
    // in sim/dialogue.ts turns a missing value into nothing at all.
    const migrated = migrateSave(v29Save())!;
    const planted = migrated.player.memory.find((m) => m.kind === "planted")!;
    expect(planted.value).toBe("something");
  });

  it("leaves a harvest's own value alone", () => {
    const migrated = migrateSave(v29Save())!;
    const pulled = migrated.player.memory.find((m) => m.kind === "harvested")!;
    expect(pulled.value).toBe("a radish");
  });

  it("does not give a place a value, which is a memory's field and not the ground's", () => {
    // `at` is on both a PlaceEvent and a MemoryEvent, so it reads like a way to
    // tell them apart right up until it backfills every place in the save. The
    // discriminator is `x`: a place is a coordinate, a memory is not.
    const migrated = migrateSave(v29Save())!;
    for (const p of migrated.places) expect(p).not.toHaveProperty("value");
  });
});

describe("v31 → v32: the said ring", () => {
  /** A v31 save: villagers carry `lastLine` and have never heard of `said`. */
  function v31Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const villagers = (w.villagers as Record<string, unknown>[]).map((v, i) => {
      const { said: _said, lastTalkedAt: _at, ...rest } = v;
      return { ...rest, lastLine: i === 0 ? "It's nice here. Quietly." : "" };
    });
    return { ...w, schemaVersion: 31, villagers };
  }

  it("seeds the ring with the one line the old save remembered", () => {
    // That line is the only conversation history a v31 save has; dropping it
    // would let the very next tap repeat it.
    const migrated = migrateSave(v31Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.villagers[0].said).toEqual(["It's nice here. Quietly."]);
    expect(migrated.villagers[0]).not.toHaveProperty("lastLine");
  });

  it("an empty lastLine becomes an empty ring, not a ring holding nothing", () => {
    const migrated = migrateSave(v31Save())!;
    for (const v of migrated.villagers.slice(1)) expect(v.said).toEqual([]);
  });

  it("does not invent a lastTalkedAt the old save never measured", () => {
    // Absent means "the game doesn't know", and the absence greeting stays
    // quiet until a real conversation starts the clock (sim/dialogue.ts).
    const migrated = migrateSave(v31Save())!;
    for (const v of migrated.villagers) expect(v).not.toHaveProperty("lastTalkedAt");
  });
});

describe("a save that went wrong can come back", () => {
  it("drops a duplicate villager, keeping the first", () => {
    // Routes are keyed by character id, so two villagers sharing one read each
    // other's waypoints and slide across town at several times walking pace,
    // for ever. Measured at 44 tiles/s against a walk of 2.2 before this.
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    const twin = { ...w.villagers[0], x: 99, y: 99 };
    w.villagers.push(twin as never);

    const back = deserialize(serialize(w))!;
    const ids = back.villagers.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The first entry survives — it is the one with the history behind it.
    expect(back.villagers.find((v) => v.id === twin.id)!.x).not.toBe(99);
  });
});

describe("v32 → v33: the plaza bench", () => {
  it("stands the bench up in an old town, and touches nothing else", () => {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    const bench = TOWN_FIXTURES.find((f) => f.id === "bench")!;
    const key = `${bench.x},${bench.y}`;
    const raw = JSON.parse(serialize(w)) as Record<string, unknown>;
    raw.schemaVersion = 32;
    delete (raw.furniture as Record<string, unknown>)[key];

    const migrated = migrateSave(raw)!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.furniture[key]?.id).toBe("bench");
  });

  it("never bulldozes what the player built on that cell", () => {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    const bench = TOWN_FIXTURES.find((f) => f.id === "bench")!;
    const key = `${bench.x},${bench.y}`;
    const raw = JSON.parse(serialize(w)) as Record<string, unknown>;
    raw.schemaVersion = 32;
    // The player got there first: something of theirs stands on the cell.
    (raw.furniture as Record<string, { id: string }>)[key] = { id: "stool", facing: "s", finish: "pine" } as never;

    const migrated = migrateSave(raw)!;
    expect(migrated.furniture[key]?.id).toBe("stool");
  });
});

describe("v33 → v34: the satchel remembers first meetings", () => {
  it("backfills met from what the satchel holds and the museum proves", () => {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    const raw = JSON.parse(serialize(w)) as Record<string, unknown>;
    raw.schemaVersion = 33;
    delete raw.met;
    raw.inventory = { wood: 3, junk: 0 }; // a zero count is not a meeting
    // A donated exhibit is proof you once held its item, even spent to zero.
    const ore = MUSEUM.find((e) => e.cost.item === "ore")!;
    raw.museum = { donated: [{ id: ore.id, placard: 0 }] };

    const migrated = migrateSave(raw)!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.met).toContain("wood");
    expect(migrated.met).toContain("ore");
    expect(migrated.met).not.toContain("junk");
  });

  it("marks an item met when it is gained, permanently", () => {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    expect(hasMet(w, "ore")).toBe(false);
    gain(w, "ore", 1);
    expect(hasMet(w, "ore")).toBe(true);
    spend(w.inventory, { ore: 1 });
    // Spending your last one does not make it a stranger again.
    expect(hasMet(w, "ore")).toBe(true);
  });
});

describe("v34 → v35: you can take your own tent down", () => {
  it("leaves the tent up for every town that played before the action existed", () => {
    const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
    const raw = JSON.parse(serialize(w)) as Record<string, unknown>;
    raw.schemaVersion = 34;
    delete (raw.homestead as Record<string, unknown>).struckAt;

    const migrated = migrateSave(raw)!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    // NOT backfilled from "your house would qualify". The flag records that you
    // asked, and nobody has asked yet — striking it on load would be a thing
    // vanishing from somebody's plot with no act of theirs behind it.
    expect(migrated.homestead.struckAt).toBeNull();
    expect(migrated.homestead.originX).toBe(w.homestead.originX);
  });
});

describe("a game in progress is not state", () => {
  // The play slot lives in a WeakMap, deliberately (sim/play.ts's header): a
  // saved hide is somebody crouched behind a tree for three real days. This
  // asserts the whole decision — the game does not round-trip, the company
  // does, and the reloaded companion simply walks back to you.
  it("does not survive a reload; the company does", () => {
    const w = newWorld({ name: "Test", form: "dog", spot: "forest", seed: 21 });
    const afternoon = new Date(2026, 5, 15, 14, 0, 0).getTime();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    befriend(v, 20);
    expect(invite(w, "resident1", afternoon)).toBe(true);
    expect(startPlay(w, "resident1", "hide", afternoon, makeRng(7))).toBe(true);
    expect(playing(w)).not.toBeNull();

    const back = deserialize(serialize(w))!;
    expect(back.company?.id).toBe("resident1");
    expect(playing(back)).toBeNull();
  });
});

describe("v36 → v37: the street plan moves four buildings", () => {
  /** A v36 save: the town as it stood before the street plan, which means the
   *  four movers at their old coordinates. Frozen here for the same reason the
   *  migration freezes them — a fixture read off the live table would stop
   *  describing the save it claims to be.
   *
   *  Built by taking a fresh world and MOVING its four back, so everything else
   *  in the blob (the hall, the stall, the fixtures, the plaza) is real. */
  const OLD = [
    { x0: -11, y0: -4, x1: -7, y1: 0 }, // Prudence's house
    { x0: 7, y0: -4, x1: 12, y1: 0 }, // the shop
    { x0: 6, y0: -11, x1: 10, y1: -6 }, // the heap
    { x0: -13, y0: -16, x1: -6, y1: -7 }, // the museum
  ];
  const NEW_IDS = ["margfrom_house", "shop", "heap", "museum"] as const;

  function v36Save(): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    const overrides = { ...(w.overrides as Record<string, number>) };
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    // Take the four down where they stand now — walls AND the furniture in them,
    // because a v36 save has neither at these coordinates.
    for (const id of NEW_IDS) {
      const b = TOWN_BUILDINGS[id];
      for (let y = b.y0; y <= b.y1; y++) {
        for (let x = b.x0; x <= b.x1; x++) {
          delete build[`${x},${y}`];
          delete furniture[`${x},${y}`];
        }
      }
    }
    // …and put a plain ring back at each old rectangle.
    for (const r of OLD) {
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          overrides[`${x},${y}`] = FLOOR;
          const ring = x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1;
          if (ring) build[`${x},${y}`] = { id: "wall", finish: "pine" };
        }
      }
    }
    return { ...w, schemaVersion: 36, build, overrides, furniture };
  }

  it("takes the old buildings down instead of leaving eight in the town", () => {
    // The failure this rung exists for. A stamp on its own is additive, so a
    // deployed save would have kept four furnished, walkable ghosts — each one
    // still holding a counter that somebody's schedule points at.
    const m = migrateSave(v36Save())!;
    for (const r of OLD) {
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          const ring = x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1;
          if (!ring) continue;
          // Only where the new town has not since claimed the cell for itself —
          // the old and new footprints overlap, and the stamp runs after.
          const claimed = NEW_IDS.some((id) => {
            const b = TOWN_BUILDINGS[id];
            return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
          });
          if (claimed) continue;
          expect(m.build[`${x},${y}`], `ghost wall at ${x},${y}`).toBeUndefined();
        }
      }
    }
  });

  it("takes the plank floor up with them, so no decking is left in the grass", () => {
    const m = migrateSave(v36Save())!;
    // The museum's old north end, well clear of anything the new town covers.
    expect(m.overrides["-10,-16"]).toBeUndefined();
  });

  it("stands all four up again where the plan puts them", () => {
    const m = migrateSave(v36Save())!;
    for (const id of NEW_IDS) {
      const b = TOWN_BUILDINGS[id];
      expect(m.build[`${b.door.x},${b.door.y}`], `${id} has no door`).toMatchObject({ id: "door" });
      expect(m.build[`${b.x0},${b.y0}`], `${id} has no corner`).toMatchObject({ id: "wall" });
    }
  });

  it("paves the streets, in cobble", () => {
    const m = migrateSave(v36Save())!;
    expect(m.overrides["0,6"]).toBe(FLOOR); // mid-lane
    expect((m.finishes as Record<string, string>)["0,6"]).toBe("cobble");
  });

  it("leaves the two that did not move alone, refinish and all", () => {
    // The town hall and the seed stall are on the cells they always were, so
    // demolishing them would only throw away a colour somebody chose.
    const raw = v36Save();
    const build = raw.build as Record<string, { id: string; finish: string }>;
    const hall = TOWN_BUILDINGS.townhall;
    build[`${hall.x0},${hall.y0}`] = { id: "wall", finish: "oxblood" };
    const m = migrateSave(raw)!;
    expect(m.build[`${hall.x0},${hall.y0}`].finish).toBe("oxblood");
  });

  it("keeps furniture the player put in a room that moved", () => {
    // Only the AUTHORED pieces come out, matched by id. A chair somebody stood in
    // the shop is theirs; it will end up in the grass, and it can be picked up.
    const raw = v36Save();
    const furniture = raw.furniture as Record<string, unknown>;
    furniture["9,-2"] = { id: "cushion", facing: "s", finish: "sage" };
    const m = migrateSave(raw)!;
    expect(m.furniture["9,-2"]).toMatchObject({ id: "cushion" });
  });
});

describe("v37 → v38: the plot arrives", () => {
  /** A v37 save: the town with its street plan, but no plot — no barn, no fence,
   *  no paving south of the lane's old foot, and the seed stall five rows north
   *  of where it stands now. */
  const V37_STALL = { x0: -9, y0: 4, x1: -4, y1: 9 };

  function v37Save(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    const overrides = { ...(w.overrides as Record<string, number>) };

    // No plot: strip the barn, the fence and everything paved inside it.
    const barn = TOWN_BUILDINGS.barn;
    for (let y = PLOT.y0; y <= PLOT.y1; y++) {
      for (let x = PLOT.x0; x <= PLOT.x1; x++) {
        delete build[`${x},${y}`];
        delete furniture[`${x},${y}`];
        delete overrides[`${x},${y}`];
      }
    }
    void barn;
    // The stall back where it was, as a plain ring — and the counter that stands
    // in its place today taken away, because a v37 save has no such thing.
    for (const f of TOWN_FIXTURES) delete furniture[`${f.x},${f.y}`];
    for (let y = V37_STALL.y0; y <= V37_STALL.y1; y++) {
      for (let x = V37_STALL.x0; x <= V37_STALL.x1; x++) {
        const ring =
          x === V37_STALL.x0 || x === V37_STALL.x1 || y === V37_STALL.y0 || y === V37_STALL.y1;
        if (ring) build[`${x},${y}`] = { id: "wall", finish: "pine" };
      }
    }
    return {
      ...w,
      schemaVersion: 37,
      build,
      furniture,
      overrides,
      homestead: { spot: "forest", originX: 6, originY: 5, struckAt: null },
      ...extra,
    };
  }

  it("stands the barn up and runs the fence round the plot", () => {
    const m = migrateSave(v37Save())!;
    const barn = TOWN_BUILDINGS.barn;
    expect(m.build[`${barn.door.x},${barn.door.y}`]).toMatchObject({ id: "door" });
    for (const c of plotFenceCells()) {
      expect(m.build[`${c.x},${c.y}`], `no fence at ${c.x},${c.y}`).toMatchObject({ id: "fence" });
    }
  });

  it("leaves the gate open", () => {
    const m = migrateSave(v37Save())!;
    expect(m.build["0," + PLOT.y0]).toBeUndefined();
  });

  it("takes the seed stall's building down and leaves no ghost of it", () => {
    // At v38 this asserted the stall had MOVED; by v41 it has stopped being a
    // building at all, so what a v37 save gets is the ring gone and a counter
    // under an awning at the edge of the square.
    const m = migrateSave(v37Save())!;
    expect(m.build[`${V37_STALL.x0},${V37_STALL.y0}`]).toBeUndefined();
    const counter = TOWN_FIXTURES.find((f) => f.counter === "seedstall")!;
    expect(m.furniture[`${counter.x},${counter.y}`]).toMatchObject({ id: counter.id });
  });

  it("moves a tent that is still standing onto the plot", () => {
    const m = migrateSave(v37Save())!;
    const home = m.homestead as { originX: number; originY: number };
    expect(home.originX).toBeGreaterThan(PLOT.x0);
    expect(home.originY).toBeGreaterThan(PLOT.y0);
    expect(home.originY).toBeLessThan(PLOT.y1);
  });

  it("does NOT move a tent the player already struck", () => {
    // Striking the tent is a decision (DESIGN §"you take the tent down
    // yourself"). There is nothing standing to move, and rewriting the origin
    // would put one back up somewhere new.
    const raw = v37Save({ homestead: { spot: "forest", originX: 6, originY: 5, struckAt: 1234 } });
    const m = migrateSave(raw)!;
    expect(m.homestead).toMatchObject({ originX: 6, originY: 5, struckAt: 1234 });
  });
});

describe("v41 → v42: a home comes off the square", () => {
  const V41_HOUSE = { x0: -11, y0: -2, x1: -6, y1: 2, door: { x: -7, y: 2 } };

  /** A v41 save: the town as it is now, but with Prudence's house back on the
   *  square's south-west corner and nothing where it stands today. */
  function v41Save(repaint?: Record<string, { id: string; finish: string }>): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    const garden = JSON.parse(JSON.stringify(w.garden)) as {
      plants: Record<string, unknown>;
    };
    const house = TOWN_BUILDINGS.margfrom_house;
    for (let y = house.y0; y <= house.y1; y++) {
      for (let x = house.x0; x <= house.x1; x++) {
        delete build[`${x},${y}`];
        delete furniture[`${x},${y}`];
      }
    }
    // A v41 save has NOTHING planted or stood where the house stood, because a
    // house stood there. The park's trees and its stage arrive with LATER rungs;
    // leaving a fresh world's copies of them in the fixture makes v42 read them
    // as the player's own work and decline to move anything.
    for (let y = V41_HOUSE.y0; y <= V41_HOUSE.y1; y++) {
      for (let x = V41_HOUSE.x0; x <= V41_HOUSE.x1; x++) {
        delete garden.plants[`${x},${y}`];
        delete furniture[`${x},${y}`];
      }
    }
    for (let y = V41_HOUSE.y0; y <= V41_HOUSE.y1; y++) {
      for (let x = V41_HOUSE.x0; x <= V41_HOUSE.x1; x++) {
        const ring =
          x === V41_HOUSE.x0 || x === V41_HOUSE.x1 || y === V41_HOUSE.y0 || y === V41_HOUSE.y1;
        if (!ring) continue;
        const isDoor = x === V41_HOUSE.door.x && y === V41_HOUSE.door.y;
        build[`${x},${y}`] = { id: isDoor ? "door" : "wall", finish: "pine" };
      }
    }
    furniture[`-10,-1`] = { id: "bed", facing: "s", finish: "pine" };
    for (const [key, cell] of Object.entries(repaint ?? {})) build[key] = cell;
    return { ...w, schemaVersion: 41, build, furniture, garden };
  }

  it("takes the house off the square and stands it on the lane", () => {
    const m = migrateSave(v41Save())!;
    expect(m.build[`${V41_HOUSE.x0},${V41_HOUSE.y0}`]).toBeUndefined();
    const house = TOWN_BUILDINGS.margfrom_house;
    expect(m.build[`${house.door.x},${house.door.y}`]).toMatchObject({ id: "door" });
  });

  it("brings her bed with her, so she is not left homeless", () => {
    // The bed is the claim (sim/housing.ts). Moving a house and forgetting the
    // bed would leave the one starter resident sleeping on the paving.
    const m = migrateSave(v41Save())!;
    const bed = TOWN_BUILDINGS.margfrom_house.furniture.find((f) => f.id === "bed")!;
    expect(m.furniture[`${bed.x},${bed.y}`]).toMatchObject({ id: "bed" });
    expect(m.furniture["-10,-1"]).toBeUndefined();
  });

  it("paves a doorstep for the new front", () => {
    const house = TOWN_BUILDINGS.margfrom_house;
    const m = migrateSave(v41Save())!;
    expect(m.overrides[`${house.door.x},${house.door.y + 1}`]).toBe(FLOOR);
  });

  it("leaves the old house standing if the player repainted it", () => {
    // The trade this ladder makes every time: a wall somebody chose the colour of
    // outranks a wall the town would rather move. They keep the house; the new
    // one does not appear.
    const corner = `${V41_HOUSE.x0},${V41_HOUSE.y0}`;
    const m = migrateSave(v41Save({ [corner]: { id: "wall", finish: "oxblood" } }))!;
    expect(m.build[corner]).toMatchObject({ finish: "oxblood" });
  });
});

describe("v44 → v45: the town gets its windows", () => {
  /** A v44 save: the town as it stands today, wound back to before any of it was
   *  glazed — every authored sash back to plain wall, the museum's four back to
   *  the plain window they were, and the skylights taken out of the roof. */
  function v44Save(edit?: Record<string, { id: string; finish: string } | null>) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    for (const b of Object.values(TOWN_BUILDINGS)) {
      for (const p of b.windows ?? []) {
        // The museum's were already windows at v44; everything else was wall.
        build[`${p.x},${p.y}`] =
          b.id === "museum"
            ? { id: "window", finish: b.finish }
            : { id: "wall", finish: b.walls ?? b.finish };
      }
      for (const p of b.skylights ?? []) delete build[`${p.x},${p.y}`];
    }
    for (const [key, cell] of Object.entries(edit ?? {})) {
      if (cell === null) delete build[key];
      else build[key] = cell;
    }
    return { ...w, schemaVersion: 44, build };
  }

  it("cuts every authored window into the wall it belongs in", () => {
    const m = migrateSave(v44Save())!;
    for (const b of Object.values(TOWN_BUILDINGS)) {
      for (const p of b.windows ?? []) {
        expect(m.build[`${p.x},${p.y}`], `${b.id} ${p.x},${p.y}`).toMatchObject({
          id: p.sash ?? "window",
        });
      }
    }
  });

  it("agrees with what a fresh world stamps, cell for cell", () => {
    // The rung's coordinates are frozen literals and the table's are live, so
    // this is the one test that can catch them drifting apart — a migrated town
    // and a new town have to be the same town.
    const fresh = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const m = migrateSave(v44Save())!;
    for (const b of Object.values(TOWN_BUILDINGS)) {
      for (const p of [...(b.windows ?? []), ...(b.skylights ?? [])]) {
        const key = `${p.x},${p.y}`;
        expect(m.build[key], `${b.id} ${key}`).toEqual(
          (fresh.build as Record<string, unknown>)[key],
        );
      }
    }
  });

  it("upgrades the museum's plain sashes rather than adding more", () => {
    const m = migrateSave(v44Save())!;
    for (const p of TOWN_BUILDINGS.museum.windows!) {
      expect(m.build[`${p.x},${p.y}`]).toMatchObject({ id: "window_paned" });
    }
  });

  it("cuts three skylights into the museum and nothing anywhere else", () => {
    const m = migrateSave(v44Save())!;
    const lit = Object.entries(m.build as Record<string, { id: string }>)
      .filter(([, c]) => c.id === "skylight")
      .map(([k]) => k)
      .sort();
    expect(lit).toEqual(["-10,-10", "-10,-12", "-10,-8"]);
  });

  it("leaves a wall alone if the player repainted it", () => {
    // The ladder's standing trade: a wall somebody chose the colour of outranks
    // a window the town would rather put in it.
    const key = "8,2"; // the shop's shopfront, middle cell
    const m = migrateSave(v44Save({ [key]: { id: "wall", finish: "oxblood" } }))!;
    expect(m.build[key]).toMatchObject({ id: "wall", finish: "oxblood" });
  });

  it("never puts a skylight through something the player left in the aisle", () => {
    // The gallery's aisles are walkable floor, so anything standing there is
    // theirs. A skylight is not solid, so this would not even block them — it
    // would just be a hole in the roof over somebody's wall.
    const key = "-10,-10";
    const m = migrateSave(v44Save({ [key]: { id: "wall", finish: "pine" } }))!;
    expect(m.build[key]).toMatchObject({ id: "wall", finish: "pine" });
  });
});

describe("v45 → v46: a chimney comes out of a fireplace", () => {
  const HEARTH = "7,7";
  const SHELF_WAS = "7,7";
  const SHELF_NOW = "6,7";

  /** A v45 save: the town as it stands, wound back to before the hearth — no
   *  fireplace, and the shelf still standing where it goes. */
  function v45Save(edit?: Record<string, unknown | null>) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    delete furniture[HEARTH];
    delete furniture[SHELF_NOW];
    furniture[SHELF_WAS] = { id: "shelf", facing: "s", finish: "pine" };
    for (const [key, cell] of Object.entries(edit ?? {})) {
      if (cell === null) delete furniture[key];
      else furniture[key] = cell;
    }
    return { ...w, schemaVersion: 45, furniture };
  }

  it("stands a fireplace on her back wall and moves the shelf aside", () => {
    // HEARTH and SHELF_WAS are the SAME cell — the fireplace takes over exactly
    // where the shelf stood, which is why the shelf had to move at all.
    const m = migrateSave(v45Save())!;
    expect(HEARTH).toBe(SHELF_WAS);
    expect(m.furniture[HEARTH]).toMatchObject({ id: "fireplace" });
    expect(m.furniture[SHELF_NOW]).toMatchObject({ id: "shelf" });
  });

  it("builds it out of stone, not out of her pine", () => {
    // A fireplace is `finishes: ["stone"]`. Handing it the house's joinery finish
    // would be a fire burning in a stack of planks, and nothing in the types
    // objects — pine is a perfectly good SkinId.
    const m = migrateSave(v45Save())!;
    const finish = (m.furniture[HEARTH] as { finish: string }).finish;
    expect(skinDef(finish as never).applies).toBe("stone");
  });

  it("agrees with what a fresh world stamps", () => {
    // The rung's coordinates are frozen and the table's are live; a migrated
    // cottage and a new one have to be the same cottage.
    const fresh = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const m = migrateSave(v45Save())!;
    for (const key of [HEARTH, SHELF_NOW, SHELF_WAS]) {
      expect(m.furniture[key], key).toEqual((fresh.furniture as Record<string, unknown>)[key]);
    }
  });

  const CHAIR = { id: "chair", facing: "s", finish: "pine" };

  it("leaves the room alone if the shelf is not the town's any more", () => {
    // The ladder's standing trade. Half this edit would be worse than none — a
    // fireplace stamped through somebody's own furniture — so the whole thing is
    // conditional on the room being as the town left it.
    const m = migrateSave(v45Save({ [SHELF_WAS]: CHAIR }))!;
    expect(m.furniture[SHELF_WAS]).toMatchObject({ id: "chair" });
    expect(m.furniture[SHELF_NOW]).toBeUndefined();
  });

  it("leaves it alone if the shelf's new cell is taken", () => {
    const m = migrateSave(v45Save({ [SHELF_NOW]: CHAIR }))!;
    expect(m.furniture[SHELF_NOW]).toMatchObject({ id: "chair" });
    expect(m.furniture[SHELF_WAS]).toMatchObject({ id: "shelf" });
  });

  it("leaves it alone if the hearth's EAST half is taken", () => {
    // The one a per-anchor check waves through. A 2x1 piece is stored once at
    // its anchor, so nothing about the anchor cell says (8,7) is spoken for —
    // and this rung writes the furniture map directly rather than going through
    // `canPlaceFurniture`, which is the only thing that would have noticed.
    const m = migrateSave(v45Save({ "8,7": CHAIR }))!;
    expect(m.furniture["8,7"]).toMatchObject({ id: "chair" });
    expect(m.furniture[SHELF_WAS]).toMatchObject({ id: "shelf" });
    expect(m.furniture[SHELF_NOW]).toBeUndefined();
  });
});

describe("v46 → v47: the barn is square and wears false doors", () => {
  /** The barn as it stood at v46: six wide, glazed, door at (-4,17). */
  const WAS = { x0: -7, y0: 13, x1: -2, y1: 17 };
  /** The column it lost — the whole of the shape change, and the cells that
   *  would be left standing in the grass by a stamp that did not demolish. */
  const LOST = ["-2,13", "-2,14", "-2,15", "-2,16", "-2,17"];
  const DOOR_WAS = "-4,17";
  const DOOR_NOW = "-5,17";
  const PANELS = ["-6,17", "-4,17"];
  const SHELF_WAS = "-3,14";
  const SHELF_NOW = "-4,14";

  /** A v46 save: the town as it stands, with the barn wound back to its old
   *  footprint — six columns of wall, a transom band, a slit, a door one cell
   *  east, and the shelf against what used to be the east wall. */
  function v46Save(edit?: Record<string, unknown | null>) {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, unknown>) };
    const furniture = { ...(w.furniture as Record<string, unknown>) };
    const overrides = { ...(w.overrides as Record<string, number>) };
    const WALL = { id: "wall", finish: "oxblood" };

    // Wipe whatever the current table stamped and lay the old barn by hand.
    for (let y = WAS.y0; y <= WAS.y1; y++) {
      for (let x = WAS.x0; x <= WAS.x1; x++) delete build[`${x},${y}`];
    }
    delete furniture[SHELF_NOW];
    for (let y = WAS.y0; y <= WAS.y1; y++) {
      for (let x = WAS.x0; x <= WAS.x1; x++) {
        const key = `${x},${y}`;
        overrides[key] = FLOOR;
        const perimeter = x === WAS.x0 || x === WAS.x1 || y === WAS.y0 || y === WAS.y1;
        if (perimeter) build[key] = { ...WALL };
      }
    }
    build[DOOR_WAS] = { id: "door", finish: "oxblood" };
    build["-6,17"] = { id: "window_transom", finish: "oxblood" };
    build["-5,17"] = { id: "window_transom", finish: "oxblood" };
    build["-3,17"] = { id: "window_narrow", finish: "oxblood" };
    furniture[SHELF_WAS] = { id: "shelf", facing: "s", finish: "oxblood" };

    for (const [key, cell] of Object.entries(edit ?? {})) {
      if (cell === null) delete furniture[key];
      else furniture[key] = cell;
    }
    return { ...w, schemaVersion: 46, build, furniture, overrides };
  }

  it("takes the lost column down rather than leaving it in the grass", () => {
    // The thing a stamp alone cannot do, and the reason this rung exists: five
    // cells of ox-blood wall a tile east of the new one, roofless, walkable and
    // still counting as occupied against the re-stamp.
    const m = migrateSave(v46Save())!;
    for (const key of LOST) {
      expect(m.build[key], key).toBeUndefined();
      // And the plank floor with them, or the barn leaves a strip of decking.
      expect(m.overrides[key], key).not.toBe(FLOOR);
    }
  });

  it("centres the door and paints a false one either side of it", () => {
    const m = migrateSave(v46Save())!;
    expect(m.build[DOOR_NOW]).toMatchObject({ id: "door" });
    for (const key of PANELS) expect(m.build[key], key).toMatchObject({ id: "barn_doors" });
  });

  it("takes the glass out", () => {
    // A barn full of hay with a sitting-room sash in it. The old cells are a
    // door and a panel now, and neither is glazed.
    const m = migrateSave(v46Save())!;
    for (const key of ["-6,17", "-5,17", "-3,17"]) {
      expect(String((m.build[key] as { id?: string } | undefined)?.id ?? "")).not.toMatch(/^window/);
    }
  });

  it("moves the shelf off the new east wall", () => {
    const m = migrateSave(v46Save())!;
    expect(m.furniture[SHELF_WAS]).toBeUndefined();
    expect(m.furniture[SHELF_NOW]).toMatchObject({ id: "shelf" });
  });

  it("agrees with what a fresh world stamps", () => {
    // The rung's rectangles are frozen and the table's are live; a migrated barn
    // and a new one have to be the same barn.
    const fresh = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const m = migrateSave(v46Save())!;
    for (const c of footprintCells(TOWN_BUILDINGS.barn)) {
      const key = `${c.x},${c.y}`;
      expect(m.build[key], key).toEqual((fresh.build as Record<string, unknown>)[key]);
    }
  });

  it("leaves the barn alone if the player has put something of their own in it", () => {
    // The ladder's standing trade (§v37). If the stamp is going to refuse the
    // footprint anyway, demolishing first costs them a building and gives
    // nothing back.
    const m = migrateSave(v46Save({ "-5,15": { id: "chair", facing: "s", finish: "pine" } }))!;
    expect(m.furniture["-5,15"]).toMatchObject({ id: "chair" });
    expect(m.furniture[SHELF_WAS]).toMatchObject({ id: "shelf" });
    expect(m.build[DOOR_WAS]).toMatchObject({ id: "door" });
  });
});
