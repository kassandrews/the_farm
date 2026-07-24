import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { serialize, deserialize, migrateSave, SCHEMA_VERSION } from "./save";

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
