// The games' line coverage. A game pays nothing but the line and the memory
// (sim/play.ts), which makes silence a broken payout rather than a thin bank —
// the same structural argument the errand and company banks carry, asserted
// here the way home.test.ts asserts it: in both directions, so dead content
// fails too.

import { describe, it, expect } from "vitest";
import { GAMES } from "../content/games";
import { GAME_YES, GAME_FOUND, GAME_GIVEUP, RESIDENT_MEMORY } from "../content/dialogue";
import { MEMORY_PRIORITY } from "./dialogue";
import type { AdultForm } from "../content/canon/forms";

/** The forms that can actually reach a game: everyone with a company bank —
 *  which is every playable resident form. The secrets are not here because
 *  the secrets can never be invited (sim/company.ts `canInvite`). */
const PLAYABLE: AdultForm[] = ["scholar", "dog", "blob", "menace", "gremlin", "carrot", "office"];

// Step 2 ships hide and seek; I Spy's moment banks arrive with its step. This
// list — not GAMES itself — is what the coverage sweep walks, so a game gains
// its coverage duty the moment it gains a UI.
const LIVE_GAMES = ["hide"] as const;

describe("every playable form can play every live game", () => {
  it("has a yes, a found, and a give-up line — the beat never lands on silence", () => {
    for (const game of LIVE_GAMES) {
      for (const form of PLAYABLE) {
        expect(GAME_YES[game]?.[form]?.length ?? 0, `GAME_YES.${game}.${form}`).toBeGreaterThan(0);
        expect(GAME_FOUND[game]?.[form]?.length ?? 0, `GAME_FOUND.${game}.${form}`).toBeGreaterThan(0);
        expect(GAME_GIVEUP[game]?.[form]?.length ?? 0, `GAME_GIVEUP.${game}.${form}`).toBeGreaterThan(0);
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
