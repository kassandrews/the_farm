import { describe, it, expect } from "vitest";
import { newWorld, loadedFinish } from "./game";
import { serialize, deserialize, migrateSave, SCHEMA_VERSION } from "./save";
import { tileKey, shafts, RECLAIM_MS, floorFinish } from "./world";
import { SHAFT, CAVE_FLOOR, DIRT, FLOOR } from "../content/tiles";
import { TOWN_BUILDINGS, footprintCells } from "../content/town";
import { count } from "./inventory";
import { STARTING_SEED } from "./seeds";
import { STARTING_CROP } from "../content/crops";
import { STAGE } from "../content/festivals";
import { CAST } from "../content/cast";
import { ARRIVALS } from "../content/arrivals";

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
    const migrated = migrateSave({ ...w, schemaVersion: 4 })!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
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
    const migrated = migrateSave(v13Save())!;
    const stall = TOWN_BUILDINGS.seedstall;
    expect(migrated.build[tileKey(stall.door.x, stall.door.y)]).toMatchObject({ id: "door" });
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
    const before = v16Save();
    const migrated = migrateSave(before)!;
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
    const migrated = migrateSave(raw)!;
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
    const migrated = migrateSave(v26Save("pine"))!;
    expect(migrated.finishes).toEqual({});
    expect(floorFinish(migrated, 5, 5)).toBe("pine"); // and still reads back right
  });

  it("rekeys the finish selection from material class to build tool", () => {
    const migrated = migrateSave(v26Save())!;
    expect(loadedFinish(migrated, "floor")).toBe("walnut");
    expect(loadedFinish(migrated, "wall")).toBe("walnut");
    expect(loadedFinish(migrated, "door")).toBe("walnut");
    expect(loadedFinish(migrated, "cushion")).toBe("undyed");
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
    const migrated = migrateSave(raw)!;
    expect(migrated.build).toEqual(raw.build);
    expect(migrated.crops).toEqual(raw.crops);
    expect(migrated.skins.unlocked).toEqual(["pine", "walnut", "granite", "undyed"]);
  });
});

describe("v27 → v28: the museum is masonry", () => {
  /** A v27 save with the museum's walls as the old table stamped them. Built by
   *  taking a fresh world (whose museum is already cobble) back to whitewash,
   *  which is what every deployed save actually holds. */
  function v27Save(repaint?: Record<string, string>): Record<string, unknown> {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const build = { ...(w.build as Record<string, { id: string; finish: string }>) };
    for (const [key, cell] of Object.entries(build)) {
      if (cell.id === "wall" && cell.finish === "cobble") build[key] = { ...cell, finish: "whitewash" };
    }
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
    const migrated = migrateSave(v27Save())!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.build[CORNER].finish).toBe("cobble");
  });

  it("leaves the door leaf alone", () => {
    // Joinery is wood even in a stone building. The door's FRAME picks the
    // masonry up from the wall beside it at draw time and stores nothing.
    const migrated = migrateSave(v27Save())!;
    expect(migrated.build[DOOR].id).toBe("door");
    expect(migrated.build[DOOR].finish).toBe("whitewash");
  });

  it("does not touch a wall the player has repainted", () => {
    // The reason this edits instead of re-stamping the town the way v15 did.
    // A re-stamp rewrites every perimeter cell from the table and would undo
    // the player's choice, which outranks ours.
    const migrated = migrateSave(v27Save({ [CORNER]: "oxblood" }))!;
    expect(migrated.build[CORNER].finish).toBe("oxblood");
  });

  it("leaves every other building's walls as they were", () => {
    // The museum alone. Two civic buildings in the same stone is a category,
    // not an identity — the town hall's south-west corner stays ash.
    const migrated = migrateSave(v27Save())!;
    expect(migrated.build["-3,-9"].finish).toBe("ash");
  });
});
