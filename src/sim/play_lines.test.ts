// The games' line coverage. A game pays nothing but the line and the memory
// (sim/play.ts), which makes silence a broken payout rather than a thin bank —
// the same structural argument the errand and company banks carry, asserted
// here the way home.test.ts asserts it: in both directions, so dead content
// fails too.

import { describe, it, expect } from "vitest";
import type { SpyKind } from "../content/games";
import { GAMES } from "../content/games";
import { GAME_YES, GAME_FOUND, GAME_GIVEUP, SPY_CLUE, RESIDENT_MEMORY } from "../content/dialogue";
import { MEMORY_PRIORITY } from "./dialogue";
import type { AdultForm } from "../content/canon/forms";

/** The forms that can actually reach a game: everyone with a company bank —
 *  which is every playable resident form. The secrets are not here because
 *  the secrets can never be invited (sim/company.ts `canInvite`). */
const PLAYABLE: AdultForm[] = ["scholar", "dog", "blob", "menace", "gremlin", "carrot", "office"];

describe("every playable form can play every game", () => {
  it("has the moment lines — the beat never lands on silence", () => {
    for (const form of PLAYABLE) {
      // Hide and seek: a yes, a found, a give-up.
      expect(GAME_YES.hide?.[form]?.length ?? 0, `GAME_YES.hide.${form}`).toBeGreaterThan(0);
      expect(GAME_FOUND.hide?.[form]?.length ?? 0, `GAME_FOUND.hide.${form}`).toBeGreaterThan(0);
      expect(GAME_GIVEUP.hide?.[form]?.length ?? 0, `GAME_GIVEUP.hide.${form}`).toBeGreaterThan(0);
      // I Spy: the acceptance IS the clue, so no yes bank — a found and a
      // give-up, plus the full clue matrix below.
      expect(GAME_FOUND.spy?.[form]?.length ?? 0, `GAME_FOUND.spy.${form}`).toBeGreaterThan(0);
      expect(GAME_GIVEUP.spy?.[form]?.length ?? 0, `GAME_GIVEUP.spy.${form}`).toBeGreaterThan(0);
    }
  });

  it("has a clue for every kind — a hole in the matrix is a thing a form can never spy", () => {
    // The picker (sim/play.ts spyChoices) drops kinds the form has no line
    // for, so a hole here doesn't crash — it silently shrinks somebody's
    // game, which is exactly the kind of failure that needs a test.
    const KINDS: SpyKind[] = ["tree", "rock", "water", "crop", "building", "furniture", "ground"];
    for (const form of PLAYABLE) {
      for (const kind of KINDS) {
        expect(SPY_CLUE[form]?.[kind]?.length ?? 0, `SPY_CLUE.${form}.${kind}`).toBeGreaterThan(0);
      }
    }
  });

  it("no clue carries a bearing — a bearing is a compass, and a compass is a fetch quest", () => {
    for (const [form, kinds] of Object.entries(SPY_CLUE)) {
      for (const [kind, lines] of Object.entries(kinds ?? {})) {
        for (const line of lines ?? []) {
          expect(line, `SPY_CLUE.${form}.${kind}: "${line}"`).not.toMatch(
            /\b(north|south|east|west|left of|right of|behind the|in front of|beside the|next to)\b/i,
          );
        }
      }
    }
  });

  it("has a weeks-later memory line for every game's kind — the line IS the payout", () => {
    for (const def of Object.values(GAMES)) {
      for (const form of PLAYABLE) {
        expect(
          RESIDENT_MEMORY[form]?.[def.remembers]?.length ?? 0,
          `RESIDENT_MEMORY.${form}.${def.remembers}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("ranks every game's memory kind — an unranked kind can never be spoken", () => {
    // The assertion moments.test.ts makes about Moments, for the same reason:
    // the memory is the only thing a game produces, so a kind missing from
    // MEMORY_PRIORITY is a payout nothing ever reads.
    for (const def of Object.values(GAMES)) {
      expect(MEMORY_PRIORITY, `MEMORY_PRIORITY is missing "${def.remembers}"`).toContain(def.remembers);
    }
  });
});
