import { describe, it, expect } from "vitest";
import { rememberPlace, placesIn, PLACE_MERGE, MAX_PLACES } from "./places";
import type { PlaceLog } from "./places";

const T = Date.UTC(2026, 6, 1, 12);

function log(...evs: Parameters<typeof rememberPlace>[1][]): PlaceLog {
  return evs.reduce<PlaceLog>((acc, ev) => rememberPlace(acc, ev), []);
}

describe("what the ground remembers", () => {
  it("merges work of the same kind that happened nearby", () => {
    // The whole reason the log survives. A floor is two hundred boards and one
    // afternoon; recording two hundred entries would flood out everything else.
    const l = log(
      { kind: "built_plank", x: 40, y: 40, at: T },
      { kind: "built_plank", x: 41, y: 40, at: T + 1 },
      { kind: "built_plank", x: 44, y: 43, at: T + 2 },
    );
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ x: 40, y: 40 });
  });

  it("keeps work of the same kind that happened somewhere else", () => {
    const far = PLACE_MERGE + 1;
    const l = log(
      { kind: "dug", x: 0, y: 0, at: T },
      { kind: "dug", x: far, y: 0, at: T + 1 },
    );
    expect(l).toHaveLength(2);
  });

  it("does not merge different kinds standing on the same spot", () => {
    // A room that was dug over and then floored knows both, and they are two
    // different sentences.
    const l = log(
      { kind: "dug", x: 10, y: 10, at: T },
      { kind: "built_plank", x: 10, y: 10, at: T + 1 },
    );
    expect(l).toHaveLength(2);
  });

  it("remembers a first meeting once, wherever the second one happens", () => {
    // `met` is a FIRST. A later conversation must never move it, or "the room
    // where you first met Eloise" stops being true the moment you talk again.
    const l = log(
      { kind: "met", x: 5, y: 5, at: T, who: "resident1" },
      { kind: "met", x: 90, y: 90, at: T + 1, who: "resident1" },
    );
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ x: 5, y: 5 });
  });

  it("keeps a first meeting per person, however close they were standing", () => {
    // The distance merge must not apply here: two residents who both first
    // spoke to you in the same room are two memories, not one.
    const l = log(
      { kind: "met", x: 5, y: 5, at: T, who: "resident1" },
      { kind: "met", x: 5, y: 6, at: T + 1, who: "office" },
    );
    expect(l).toHaveLength(2);
  });

  it("adds a sleeper spell per bed, and never twice for the same one", () => {
    // Rehousing somebody is a new spell; re-assigning them to the bed they are
    // already in is not. The first is what a past sleeper IS.
    const l = log(
      { kind: "slept", x: 1, y: 1, at: T, who: "resident1" },
      { kind: "slept", x: 1, y: 1, at: T + 1, who: "resident1" },
      { kind: "slept", x: 2, y: 2, at: T + 2, who: "resident1" },
    );
    expect(l).toHaveLength(2);
    expect(l.map((p) => p.x)).toEqual([1, 2]);
  });

  it("is capped, oldest first", () => {
    let l: PlaceLog = [];
    // Spaced past the merge radius so every one is a genuinely separate place.
    for (let i = 0; i < MAX_PLACES + 3; i++) {
      l = rememberPlace(l, { kind: "dug", x: i * (PLACE_MERGE + 1), y: 0, at: T + i });
    }
    expect(l).toHaveLength(MAX_PLACES);
    expect(l[0].at).toBe(T + 3);
  });

  it("hands a set of cells only what happened inside it", () => {
    const l = log(
      { kind: "dug", x: 3, y: 4, at: T },
      { kind: "gathered", x: 30, y: 40, at: T },
    );
    expect(placesIn(l, new Set(["3,4"])).map((p) => p.kind)).toEqual(["dug"]);
    expect(placesIn(l, new Set(["9,9"]))).toEqual([]);
  });
});
