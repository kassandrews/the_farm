// The games — the slate of things a companion will play with you (ROADMAP
// §Minigames). Two rows, deliberately, and both are games about LOOKING: the
// Farm already pays you for looking — secrets unlisted, found places
// unannounced, the Notebook records what you noticed — so a game that belongs
// here is a way of looking at the town. Hide and seek is find-a-person; I Spy
// is find-a-thing. A slate that added a race or a quiz would be adding a score
// or a right answer, and the design invariants exclude both.
//
// SMALL AND AUTHORED FOREVER, like the festival table: a game you can play
// constantly is a routine, and the point of a game is that somebody suggested
// it. New games are new rows, argued for one at a time.
//
// WHAT A ROW MAY NOT CARRY, and the shape of the type enforces it: no reward,
// no score, no duration, no friendship figure, no unlock. A game pays the way
// everything on the Farm pays — somebody remembers playing it with you
// (`remembers`, one memory kind per game, written by sim/play.ts to the one
// person who played and to nobody else).
//
// `remembers` is spelled as its own literal union rather than importing
// MemoryKind from sim/memory.ts, because content never imports sim (CLAUDE.md
// layering; the same call content/spots.ts documents). sim/play.ts is where
// the two unions meet, and TypeScript checks the assignment there.

export type GameId = "hide" | "spy";

export interface GameDef {
  id: GameId;
  /** The closing-row button — the player's own words when they propose it. */
  ask: string;
  /** The memory kind the game files when it reaches its end. Found or finished
   *  only: giving up files nothing, on `declineErrand`'s discipline. */
  remembers: "hid" | "spied";
}

export const GAMES: Record<GameId, GameDef> = {
  // They hide, you seek. The flagship, because it makes the town's geometry
  // the content — you learn where the town has corners, including the corners
  // you built yourself. Each form hides badly in its own way, and that is
  // voice (the banks), never a stored quality flag.
  hide: {
    id: "hide",
    ask: "Hide and seek?",
    remembers: "hid",
  },
  // They name a visible thing obliquely; you walk to it. The Notebook's voice
  // used as a prompt instead of as a record. The clue matrix lives in
  // content/dialogue.ts where banks.test.ts can sweep it.
  spy: {
    id: "spy",
    ask: "I spy?",
    remembers: "spied",
  },
};

export function gameDef(id: GameId): GameDef {
  return GAMES[id];
}

/** What I Spy may point at — a CATEGORY, because the clue is authored per
 *  kind per form (content/dialogue.ts SPY_CLUE) and never generated. Seven,
 *  deliberately small: every cell of that matrix has to be written or the
 *  game goes silent for somebody.
 *
 *  Declared HERE rather than in sim/play.ts on content/spots.ts's argument:
 *  content never imports sim, and the clue table needs the key. sim/play.ts
 *  is where a kind is derived from the world; this is only its name.
 *
 *  What is NOT a kind, and never will be: a PERSON (a clue describing
 *  somebody is a different and worse game), plain grass (everything is
 *  grass; the clue is unsolvable), and anything secret or found — the
 *  exclusions live in sim/play.ts `spyKindAt`, one function, so no picker
 *  can disagree about them. */
export type SpyKind =
  | "tree"
  | "rock"
  | "water" // the edge of it — a water tile you can stand beside
  | "crop"
  | "building" // a built cell: a wall, a door
  | "furniture"
  | "ground"; // a DISTINCT surface: paving, sand, tilled earth
