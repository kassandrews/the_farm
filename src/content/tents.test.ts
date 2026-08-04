import { describe, it, expect } from "vitest";
import { TENTS } from "./tents";
import { FORMS, type AdultForm } from "./canon/forms";
import { ARRIVALS } from "./arrivals";

describe("tents", () => {
  it("covers every form", () => {
    // The renderer indexes this by the player's form, and the player may have
    // imported as anything The Meadow could produce — a missing row is a tent
    // that crashes on somebody's save, not a tent that looks plain.
    for (const form of Object.keys(FORMS) as AdultForm[]) {
      expect(TENTS[form], form).toBeDefined();
    }
  });

  it("gives every form its own decoration", () => {
    // Two forms sharing one decoration is two residents with the same tent,
    // which is the thing this table exists to stop.
    const seen = new Set(Object.values(TENTS).map((t) => t.decor));
    expect(seen.size).toBe(Object.keys(TENTS).length);
  });

  it("keeps secrets out of the tents anyone else can pitch", () => {
    // A commission's tent is drawn off its arrival's form. If a secret form
    // ever gets an arrival row, a Quiet Ghost turns up by the plaza with her
    // own tent and the secret is spoiled by the skyline rather than by UI.
    for (const a of ARRIVALS) {
      expect(FORMS[a.form].secret ?? false, a.name).toBe(false);
      expect(FORMS[a.form].hidden ?? false, a.name).toBe(false);
    }
  });
});
