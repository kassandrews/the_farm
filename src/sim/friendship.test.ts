import { describe, it, expect } from "vitest";
import { newWorld, talk, buildAt, playerTile } from "./game";
import { friendshipTier, atLeast, giftDue, takeGift } from "./friendship";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { warmLines } from "../content/dialogue";

function freshWorld() {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 12 });
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
      talk(w, "resident1", makeRng(i), Date.now());
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
    buildAt(w, "floor", pt.x, pt.y, 1000);
    expect(v.friendship).toBeGreaterThan(before);
  });

  it("does not warm to work done out of sight", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    v.x = w.player.x + 40; // across town
    v.y = w.player.y + 40;
    const before = v.friendship;
    const pt = playerTile(w);
    buildAt(w, "floor", pt.x, pt.y, 1000);
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
    for (let i = 0; i < 200; i++) strangerLines.add(speak(w, v, makeRng(i), Date.now()).text);

    v.friendship = 100; // close
    const closeOnly = warmLines(v.form, "close").filter((l) => !warmLines(v.form, "friend").includes(l));
    const friendLines = new Set<string>();
    for (let i = 0; i < 400; i++) friendLines.add(speak(w, v, makeRng(i), Date.now()).text);

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

describe("finishes people give you", () => {
  const warmTo = (w: ReturnType<typeof freshWorld>, id: string, n: number) => {
    const v = w.villagers.find((x) => x.id === id)!;
    v.friendship = n;
    return v;
  };

  it("hands nothing to a stranger", () => {
    const w = freshWorld();
    const pesto = warmTo(w, "errands", 0);
    expect(giftDue(w, pesto)).toBeNull();
    expect(w.skins.unlocked).not.toContain("ochre");
  });

  it("hands the tin over once the Dog is familiar", () => {
    const w = freshWorld();
    const pesto = warmTo(w, "errands", 10); // exactly the threshold
    expect(giftDue(w, pesto)).toBe("ochre");
    expect(takeGift(w, pesto)).toBe("ochre");
    expect(w.skins.unlocked).toContain("ochre");
  });

  it("only hands it over once, however long you keep talking", () => {
    const w = freshWorld();
    const pesto = warmTo(w, "errands", 100);
    expect(takeGift(w, pesto)).toBe("ochre");
    for (let i = 0; i < 20; i++) expect(takeGift(w, pesto)).toBeNull();
    expect(w.skins.unlocked.filter((s) => s === "ochre")).toHaveLength(1);
  });

  it("makes the curator wait for `friend`, where the Dog only wants `familiar`", () => {
    // The two tiers are the feature: the earliest gift in the game comes from
    // the friendliest character, and the one that tells you where a quarry is
    // costs a rung more.
    const w = freshWorld();
    const win = warmTo(w, "museum", 10); // familiar — enough for Pesto, not her
    expect(giftDue(w, win)).toBeNull();
    win.friendship = 30;
    expect(giftDue(w, win)).toBe("marble");
  });

  it("gives you nobody else's finish", () => {
    const w = freshWorld();
    const pesto = warmTo(w, "errands", 100);
    warmTo(w, "museum", 0);
    takeGift(w, pesto);
    expect(w.skins.unlocked).not.toContain("marble");
  });

  it("arrives in the same conversation that crosses the threshold", () => {
    // The invisible-ladder consequence: there is no way to tell a player they
    // owe somebody a second visit, so the talk that warms them past the line
    // has to be the talk they hand it over in.
    const w = freshWorld();
    warmTo(w, "errands", 8); // `talk` pays 2, landing exactly on 10
    const speech = talk(w, "errands", makeRng(1), Date.now())!;
    expect(speech.gave).toBe("ochre");
    expect(w.skins.unlocked).toContain("ochre");
  });

  it("says nothing about a gift on an ordinary conversation", () => {
    const w = freshWorld();
    warmTo(w, "errands", 100);
    expect(talk(w, "errands", makeRng(1), Date.now())!.gave).toBe("ochre");
    expect(talk(w, "errands", makeRng(2), Date.now())!.gave).toBeUndefined();
  });

  it("reaches a live save that was already warm, with no migration", () => {
    // `skins.unlocked` IS the record of which gifts have happened, so a save
    // written before this feature existed — where you are already close to
    // everybody — simply gets its finishes on the next hello.
    const w = freshWorld();
    for (const v of w.villagers) v.friendship = 100;
    talk(w, "errands", makeRng(1), Date.now());
    talk(w, "museum", makeRng(1), Date.now());
    expect(w.skins.unlocked).toContain("ochre");
    expect(w.skins.unlocked).toContain("marble");
  });

  it("does not warm anybody towards a gift for free", () => {
    // A guard on the whole point: you get there by playing, and a fresh world
    // is not already there.
    const w = freshWorld();
    for (const v of w.villagers) expect(giftDue(w, v)).toBeNull();
  });
});
