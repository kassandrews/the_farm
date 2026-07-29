import { describe, it, expect } from "vitest";
import { newWorld, talk, buildAt, playerTile } from "./game";
import { friendshipTier, atLeast } from "./friendship";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { warmLines } from "../content/dialogue";

function freshWorld() {
  return newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 12 });
}

describe("friendship milestones", () => {
  it("starts every villager as a stranger", () => {
    const w = freshWorld();
    for (const v of w.villagers) expect(friendshipTier(v)).toBe("new");
  });

  it("climbs tiers as you spend time with someone", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const seen = new Set([friendshipTier(v)]);
    for (let i = 0; i < 60; i++) {
      talk(w, "resident1", makeRng(i));
      seen.add(friendshipTier(v));
    }
    expect(friendshipTier(v)).toBe("close");
    // It passed through the intermediate tiers rather than jumping.
    expect(seen).toContain("familiar");
    expect(seen).toContain("friend");
  });

  it("grows from doing things together, not only from talking", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    // Stand the villager right next to the player and work.
    v.x = w.player.x;
    v.y = w.player.y;
    const before = v.friendship;
    const pt = playerTile(w);
    buildAt(w, "plank", pt.x, pt.y, 1000);
    expect(v.friendship).toBeGreaterThan(before);
  });

  it("does not warm to work done out of sight", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    v.x = w.player.x + 40; // across town
    v.y = w.player.y + 40;
    const before = v.friendship;
    const pt = playerTile(w);
    buildAt(w, "plank", pt.x, pt.y, 1000);
    expect(v.friendship).toBe(before);
  });

  it("unlocks warmer lines, pooled with the tiers below", () => {
    expect(warmLines("scholar", "new")).toEqual([]);
    const familiar = warmLines("scholar", "familiar");
    const close = warmLines("scholar", "close");
    expect(familiar.length).toBeGreaterThan(0);
    // A close friend can still say a merely-familiar line.
    for (const line of familiar) expect(close).toContain(line);
    expect(close.length).toBeGreaterThan(familiar.length);
  });

  it("a close friend actually says something a stranger never would", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;

    const strangerLines = new Set<string>();
    for (let i = 0; i < 200; i++) strangerLines.add(speak(w, v, makeRng(i)).text);

    v.friendship = 100; // close
    const closeOnly = warmLines(v.form, "close").filter((l) => !warmLines(v.form, "friend").includes(l));
    const friendLines = new Set<string>();
    for (let i = 0; i < 400; i++) friendLines.add(speak(w, v, makeRng(i)).text);

    expect(closeOnly.length).toBeGreaterThan(0);
    for (const line of closeOnly) expect(strangerLines.has(line)).toBe(false);
    expect(closeOnly.some((l) => friendLines.has(l))).toBe(true);
  });

  it("atLeast compares tiers in order", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    v.friendship = 35; // "friend"
    expect(atLeast(v, "familiar")).toBe(true);
    expect(atLeast(v, "friend")).toBe(true);
    expect(atLeast(v, "close")).toBe(false);
  });
});
