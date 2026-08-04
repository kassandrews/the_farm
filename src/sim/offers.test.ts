// Offers — the town's side of the games, and the ONLY place a timestamp
// lives. The last test is the invariant the whole feature is built on:
// asking is never gated by anything, because a cooldown on the player's ask
// is a cap on the player's hands (Design invariant; sim/company.ts said it
// first about invitations).

import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { invite, partWays } from "./company";
import { offerDue, satLineDue, startPlay, endPlay, playing } from "./play";
import { befriend } from "./friendship";
import { TOWN_FIXTURES } from "../content/town";
import { makeRng } from "./rng";
import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

function withCompany(w: WorldState, at: number, id: CharId = "resident1"): Villager {
  const v = w.villagers.find((x) => x.id === id)!;
  befriend(v, 20);
  if (!invite(w, id, at)) throw new Error("invite refused");
  return v;
}

const AFTERNOON = new Date(2026, 5, 15, 14, 0, 0).getTime();
const MIN = 60_000;

describe("when a companion proposes a game", () => {
  it("not at once — the first offer waits out the wound-forward gap, then fires once", () => {
    const w = freshWorld();
    withCompany(w, AFTERNOON);
    expect(offerDue(w, AFTERNOON)).toBeNull();
    expect(offerDue(w, AFTERNOON + 1 * MIN)).toBeNull();
    const at = AFTERNOON + 5 * MIN;
    expect(offerDue(w, at)?.id).toBe("resident1");
    // Spent: the same moment asks again and gets silence.
    expect(offerDue(w, at)).toBeNull();
    // And the next one is a real gap away, not another five minutes.
    expect(offerDue(w, at + 6 * MIN)).toBeNull();
  });

  it("never offers with nobody, and never mid-game", () => {
    const w = freshWorld();
    expect(offerDue(w, AFTERNOON + 60 * MIN)).toBeNull();
    withCompany(w, AFTERNOON);
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7))).toBe(true);
    expect(offerDue(w, AFTERNOON + 60 * MIN)).toBeNull();
    endPlay(w, AFTERNOON + 60 * MIN, "gave_up");
  });

  it("goes quiet when the company does", () => {
    const w = freshWorld();
    withCompany(w, AFTERNOON);
    partWays(w, AFTERNOON + MIN);
    expect(offerDue(w, AFTERNOON + 60 * MIN)).toBeNull();
  });
});

describe("the bench's unprompted line", () => {
  it("speaks only while actually sitting together, and not straight away", () => {
    const w = freshWorld();
    const v = withCompany(w, AFTERNOON);
    // Walking: silence, at any hour.
    expect(satLineDue(w, AFTERNOON + 10 * MIN)).toBeNull();
    // Sit down on the town bench with them settled beside you.
    const bench = TOWN_FIXTURES.find((f) => f.id === "bench")!;
    w.player.x = bench.x;
    w.player.y = bench.y;
    w.player.target = null;
    v.x = bench.x + 1;
    v.y = bench.y;
    expect(satLineDue(w, AFTERNOON)).toBeNull(); // just sat down
    expect(satLineDue(w, AFTERNOON + 2 * MIN)?.id).toBe("resident1");
    expect(satLineDue(w, AFTERNOON + 2 * MIN)).toBeNull(); // spent
  });
});

describe("the invariant: nudge timestamps gate nothing the player does", () => {
  it("asking works immediately, repeatedly, regardless of any offer state", () => {
    const w = freshWorld();
    withCompany(w, AFTERNOON);
    // Burn the offer clock into every state it has...
    offerDue(w, AFTERNOON + 5 * MIN);
    // ...and the ask neither waits for it nor spends it.
    for (let round = 0; round < 3; round++) {
      expect(startPlay(w, "resident1", "hide", AFTERNOON + round, makeRng(round + 1))).toBe(true);
      expect(playing(w)).not.toBeNull();
      endPlay(w, AFTERNOON + round, "gave_up");
    }
  });
});
