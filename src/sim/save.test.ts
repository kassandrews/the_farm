import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { serialize, deserialize, migrateSave, SCHEMA_VERSION } from "./save";
import { tileKey } from "./world";
import { TOWN_BUILDINGS, footprintCells } from "../content/town";
import { count } from "./inventory";
import { STARTING_SEED } from "./seeds";
import { STARTING_CROP } from "../content/crops";

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

  it("gives an existing town somewhere to put a cloth finish", () => {
    const migrated = migrateSave(v9Save())!;
    expect(migrated.skins.selected.cloth).toBe("undyed");
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
    expect(migrateSave(save)!.skins.selected.cloth).toBe("madder");
  });

  it("keeps villager identity and memory across the v2 → v3 drop", () => {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const villagers = (w.villagers as Record<string, unknown>[]).map((v) => ({
      ...v,
      stop: 2,
      dwell: 17,
    }));
    const migrated = migrateSave({ ...w, schemaVersion: 2, villagers })!;
    expect(migrated.villagers.find((v) => v.id === "resident1")?.name).toBe("Margfrom");
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
