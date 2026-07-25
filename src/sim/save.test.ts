import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { serialize, deserialize, migrateSave, SCHEMA_VERSION } from "./save";
import { tileKey } from "./world";
import { TOWN_BUILDINGS, footprintCells } from "../content/town";

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

  it("keeps villager identity and memory across the v2 → v3 drop", () => {
    const w = JSON.parse(serialize(freshWorld())) as Record<string, unknown>;
    const villagers = (w.villagers as Record<string, unknown>[]).map((v) => ({
      ...v,
      stop: 2,
      dwell: 17,
    }));
    const migrated = migrateSave({ ...w, schemaVersion: 2, villagers })!;
    expect(migrated.villagers).toHaveLength(2);
    expect(migrated.villagers.find((v) => v.id === "resident1")?.name).toBe("Margfrom");
  });
});
