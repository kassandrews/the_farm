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
