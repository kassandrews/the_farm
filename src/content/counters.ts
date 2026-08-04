// The counters, as objects in the world rather than as things a person is.
//
// WHAT THIS TABLE IS FOR. Every institution used to be reachable only through
// its keeper: talking to the Menace opened the shop, talking to Winifred opened
// the museum, and `ui/app.ts` returned out of the conversation before it ever
// rendered what she said. That was a deliberate call (ROADMAP §14a, "the person
// once, the screen forever after") and it cost more than it looked:
//
//   • Six characters' dialogue was computed and thrown away — 26 to 38 distinct
//     lines each, including every warm line, which is the ONLY channel
//     friendship is allowed to reveal itself through (sim/friendship.ts).
//   • Three of the seven told observations are spoken by keepers, and
//     `tryTellLine` calls `observe()` before returning the remark — so the
//     notebook entry was written and the line that taught it was discarded.
//   • Pesto is deliberately NOT in company.ts's `ROOTED` list, because his
//     institution is a round he walks. He was invitable in the sim and the
//     button was unreachable in the UI.
//
// So the counter becomes a thing you touch and the keeper becomes a person you
// talk to. THIS IS NOT THE MENU-IN-FRONT-OF-A-MENU 14a REFUSED — that was a
// dialogue box with a "Shop" button on it, a second panel reached through a
// first. Two objects standing in a room is not that; it is what an institution
// physically is. Nothing is reached through anything.
//
// Nobody becomes less of an institution for it. The opposite, if anything: a
// curator you can only trade with is a vending machine with a face on it.

import type { CharId } from "./cast";

export type CounterId = "hall" | "shop" | "heap" | "museum" | "seedstall" | "stage";

export interface CounterDef {
  id: CounterId;
  /** Who keeps it. The panel this opens is theirs, and `counters.test.ts` holds
   *  the two together — a counter whose keeper had wandered off into a
   *  different institution would open the wrong screen from the right table. */
  who: CharId;
  /** The fallback line, for anywhere that has only a line to show. The panel
   *  itself is the real answer; this is what the flash says if one ever fires.
   *  About the OBJECT, never about you — the furniture-line rule
   *  (sim/game.ts `furnitureLine`), because that is what these are. */
  line: string;
  /** What the player says to reach the counter FROM the conversation.
   *
   *  Both routes stay open on purpose. Tapping the counter is the direct one;
   *  this is the one for somebody who walked up to the person, which is what
   *  everybody does at first and what every other character in the game
   *  rewards. Without it, talking to the Menace would be a dead end for
   *  somebody who came to buy cloth — the feature would have taken something
   *  away rather than added the other half.
   *
   *  Gary has had exactly this since Phase 3, hardcoded in ui/app.ts as
   *  "Anything to file?", and it is the precedent the other five now follow. */
  ask: string;
}

/** Every counter in town.
 *
 *  THE BOARD IS NOT IN HERE, and that is worth saying out loud because it looks
 *  like an omission. The errands board already has its own `ActionKind`
 *  ("read"), its own proximity helper (`boardNear`) and its own authored line,
 *  all of which predate this table and all of which work. Folding it in would
 *  be a rename with a test suite attached and no behaviour on the other side.
 *  What it was missing is the half this file does not provide either — being
 *  TAPPABLE rather than only reachable with ACT — and that is a fix in the
 *  pointer handler, which both of them now share.
 *
 *  If a third kind of touchable fixture ever turns up, unify then. Two is not a
 *  pattern yet. */
export const COUNTERS: Record<CounterId, CounterDef> = {
  hall: {
    id: "hall",
    who: "office",
    line: "A desk, and the whole of somebody's personality.",
    ask: "Anything to file?",
  },
  shop: {
    id: "shop",
    who: "shop",
    line: "A counter. Bolts of cloth, stacked by somebody with a system.",
    ask: "Something to trade?",
  },
  heap: {
    id: "heap",
    who: "heap",
    line: "A counter, at a facility. It is a pile. Officially, a facility.",
    ask: "What's in the pile?",
  },
  museum: {
    id: "museum",
    who: "museum",
    line: "A desk, in a lobby. Everything on it is labelled twice.",
    ask: "I brought something.",
  },
  seedstall: {
    id: "seedstall",
    who: "seedstall",
    line: "A counter, and seed in trays behind it. Seed is still seed.",
    ask: "What's in?",
  },
  // The one that is not furniture in a room. A stage is a thing in the square
  // (content/town.ts §TOWN_FIXTURES), and it is a counter in exactly the sense
  // that matters here: you walk up to it and it tells you what is on.
  stage: {
    id: "stage",
    who: "stage",
    line: "A stage, empty. Something is always about to be on.",
    ask: "What's on?",
  },
};

export function counterDef(id: CounterId): CounterDef {
  return COUNTERS[id];
}

/** The counter this person keeps, if any. The reverse of `who`, derived rather
 *  than stored — a second table mapping keeper → counter is the version that
 *  disagrees with the first one. */
export function counterKeptBy(who: CharId): CounterDef | null {
  for (const id of Object.keys(COUNTERS) as CounterId[]) {
    if (COUNTERS[id].who === who) return COUNTERS[id];
  }
  return null;
}
