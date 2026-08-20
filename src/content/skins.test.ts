// Finishes, and the one property the table cannot check about itself: that
// every finish in it can actually be got.
//
// THIS TEST EXISTS BECAUSE MARBLE COULD NOT BE. It shipped with the museum's
// walls and a hint naming Winifred, and nothing anywhere ever pushed it into
// `skins.unlocked` — so the one finish whose hint pointed at a person was the
// one finish you could never build in. ROADMAP said "every finish is reachable"
// and had been right when it was written, which is exactly how a claim like
// that goes stale: the check lived in a sentence in a document instead of here.

import { describe, it, expect } from "vitest";
import { SETS } from "./sets";
import { SKINS, SKIN_CLASSES, starterSkins } from "./skins";
import type { SkinId } from "./skins";
import { HEAP } from "./shop";
import { ARRIVALS } from "./arrivals";
import { CAST, isSecret } from "./cast";
import type { CharDef, CharId } from "./cast";
import { GIVEN_LINES } from "./dialogue";

/** A giver's def, or undefined.
 *
 *  `CAST` is keyed by AUTHORED ids only — the three secrets are standalone defs
 *  and newcomers don't exist until run time — so indexing it with a `CharId` is
 *  a lookup that can miss. Widening it here rather than reaching for `charDef`
 *  is deliberate: `charDef` takes a whole villager and always answers, which is
 *  right for the sim and wrong for a test whose entire question is whether the
 *  id names somebody the town has actually written down. */
function giver(id: CharId): CharDef | undefined {
  return (CAST as Partial<Record<CharId, CharDef>>)[id];
}

/** The two finishes earned by DOING something rather than by a table row, and
 *  the only hard-coded ids in this file.
 *
 *  They are listed rather than derived because their unlock lives in a sim
 *  branch — `sim/gather.ts` fells the Ghost's dark trees, `sim/mining.ts`
 *  counts twelve tiles of tunnel — and no static read of the content tables can
 *  see either. Writing them out is the honest version: it says out loud that
 *  these two are code, so the day one is deleted this list is wrong and loud
 *  rather than right and empty. */
const FOUND: SkinId[] = ["walnut", "slate"];

function reachable(id: SkinId): string | null {
  if (SKINS[id].starter) return "starter";
  if (SKINS[id].given) return "given";
  if (HEAP.some((r) => r.gives === id)) return "heap";
  if (ARRIVALS.some((a) => a.unlocks === id)) return "commission";
  if (FOUND.includes(id)) return "found";
  if (Object.values(SETS).some((set) => set.brings?.includes(id))) return "set";
  return null;
}

const ALL = Object.keys(SKINS) as SkinId[];

describe("every finish can be got", () => {
  it("has a source for each one", () => {
    for (const id of ALL) {
      expect(reachable(id), `${SKINS[id].name} (${id}) has no unlock path`).not.toBeNull();
    }
  });

  it("still has all four sources in it", () => {
    // Not a coverage metric — a check that the shape of the answer hasn't
    // collapsed. DESIGN names friendship, discovery and the underground as the
    // ways a finish is earned, and for months one of the three was a sentence
    // with nothing behind it. A table where everything came off the heap would
    // pass the test above and fail the design.
    const sources = new Set(ALL.map(reachable));
    for (const s of ["starter", "given", "heap", "commission", "found", "set"]) {
      expect(sources, `no finish comes from ${s} any more`).toContain(s);
    }
  });
});

describe("finishes people give you", () => {
  const given = ALL.filter((id) => SKINS[id].given);

  it("names somebody who exists", () => {
    for (const id of given) {
      expect(giver(SKINS[id].given!.who), `${id} is given by nobody in the cast`).toBeDefined();
    }
  });

  it("is never given by a secret", () => {
    // A secret's payment is being found. Routing a finish through one would put
    // it in the picker with a hint naming somebody the game has not admitted
    // exists — the exact spoiler `hint` is left absent to avoid.
    for (const id of given) {
      expect(isSecret(SKINS[id].given!.who), `${id} comes from a secret`).toBe(false);
    }
  });

  it("never asks for a tier nobody can reach by playing", () => {
    // `new` is excluded by the type; this catches the other end. `close` is 60
    // points and legitimate — Eloise's name sits there — but a gift is meant to
    // arrive while you are still finding out there is a ladder.
    for (const id of given) {
      expect(["familiar", "friend", "close"]).toContain(SKINS[id].given!.tier);
    }
  });

  it("comes with something to say", () => {
    // A gift handed over in silence is a vending machine with a face on it.
    for (const id of given) {
      expect(GIVEN_LINES[id], `${id} is given with no line`).toBeTruthy();
    }
  });

  it("does not hand one person the whole palette", () => {
    // Two gifts from one villager is a shop; the point of a gift is that it is
    // the thing THEY had. If this ever needs relaxing, the question to answer
    // first is why that person is a counter now.
    const perPerson = new Map<string, number>();
    for (const id of given) {
      const who = SKINS[id].given!.who;
      perPerson.set(who, (perPerson.get(who) ?? 0) + 1);
    }
    for (const [who, n] of perPerson) expect(n, `${who} gives ${n} finishes`).toBe(1);
  });
});

describe("the table's own rules", () => {
  it("gives every finish a class the picker knows", () => {
    for (const id of ALL) expect(SKIN_CLASSES).toContain(SKINS[id].applies);
  });

  it("tells you where a non-starter came from, unless it's a secret", () => {
    // `hint` is absent only for the two you FIND (a secret announced is a
    // secret spoiled). Everything else owes the player a sentence.
    for (const id of ALL) {
      if (SKINS[id].starter) continue;
      if (FOUND.includes(id)) continue;
      expect(SKINS[id].hint, `${id} is locked and unexplained`).toBeTruthy();
    }
  });

  it("keeps a hint and its gate pointing at the same person", () => {
    // The failure this catches is marble's, one step later: a hint that says to
    // go and see Winifred while the gate checks somebody else. They live next
    // to each other in the table precisely so this stays true.
    for (const id of ALL) {
      const given = SKINS[id].given;
      if (!given) continue;
      const name = giver(given.who)!.name;
      expect(SKINS[id].hint, `${id}'s hint never names ${name}`).toContain(name);
    }
  });

  it("still ships enough finishes to build decently on hour one", () => {
    // The table's own promise: "enough of these ship unlocked that building
    // always looks decent". One per class is the floor.
    const starters = starterSkins();
    for (const c of SKIN_CLASSES) {
      expect(starters.some((id) => SKINS[id].applies === c), `nothing to build ${c} in`).toBe(true);
    }
  });
});
