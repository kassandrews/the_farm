// The memory log — the spine of "NPCs that remember" (DESIGN §2 of the gaps).
// Dialogue is written against this log, never static banks alone (Design
// invariant). Two sources feed it: raising history IMPORTED from The Meadow
// (seeded at villager creation) and events WITNESSED here on the Farm (the
// player laid boards, planted, harvested). Selection lives in sim/dialogue.ts.
//
// Pure data + pure helpers, so it serialises straight into the save and tests
// can assert on it.

export type MemoryKind =
  // Imported from The Meadow (see meadow_import.ts):
  | "raised_by" // owner/how it was raised (a name or a phrase)
  | "raised_favorite" // its favourite food back then
  // Witnessed here on the Farm:
  | "built_plank" // saw the player lay floorboards
  | "dug" // saw the player dig
  | "gathered" // saw the player fell a tree or split a rock
  | "planted_carrot"
  | "harvested_carrot"
  | "exhibit" // something the villager did while you were away (see sim/away.ts)
  | "arrived" // the villager's own arrival on the Farm
  | "housed" // the day you finished their house (sim/commission.ts)
  | "errand" // you ran something over for them (sim/errands.ts)
  // A day spent walking around with you, and a day spent underground with you
  // (sim/company.ts). Two kinds rather than one with a value, because they are
  // two different afternoons and a form's bank should be able to have a line
  // for one and not the other.
  //
  // These are the FIRST memories that are not town-wide. `witness` broadcasts,
  // because news travels in a town this small; a walk is not news, it is
  // something that happened to exactly one other person, and `partWays` writes
  // it to them alone. That distinction is what the tunnel needed — see the
  // `present` option on `witness` in sim/game.ts.
  | "company"
  | "delved"
  // And a day spent with you in the SKY (Phase 7c). A third kind rather than a
  // value on `delved`, on that pair's own argument: they are three different
  // afternoons and a form's bank should be able to have a line for one and not
  // the others. It is written to the one person who came, like the other two —
  // the town does not hear about the staircase, because a town that talks about
  // a secret has been told about it by the game.
  | "climbed"
  // A festival, and whether you were at it (sim/festival.ts). Deliberately NOT
  // in `oneShot` below: the value is the year and the row, so each festival is
  // its own memory, and de-duplicating by kind would mean the first one you
  // ever attended was the last one anybody noticed. These logs are also the
  // only record that you attended anything — there is no counter anywhere, on
  // purpose (DESIGN §Festivals).
  | "festival"
  // Standing next to the Humming Cube with you (sim/game.ts). The only memory
  // of a PLACE rather than of something you did, and it exists because the Cube
  // pays out nothing else: it hums, it gives no item, no finish and no unlock,
  // and nothing in the game ever gates on it (DESIGN §"a landmark that hums").
  // What you get for the walk is that whoever you brought has now been there —
  // which is written to them and to nobody else, the same as `delved`. Nobody
  // in the plaza hears about the cube, because that would be the town knowing
  // about a secret.
  //
  // In `oneShot`: you either have stood in front of it or you haven't, and a
  // second visit is the same fact. (Contrast `festival`, which is deliberately
  // out, because each one is its own night.)
  | "hum";

export interface MemoryEvent {
  kind: MemoryKind;
  at: number; // ms epoch when logged (or when it happened, for imports)
  /** Optional remembered value — a Meadow name, a food, a count. Rendered into
   *  the dialogue template. */
  value?: string;
}

export type MemoryLog = MemoryEvent[];

const MAX_MEMORIES = 64; // a bounded ring; the town lives at hour forty, not forever

/** Append an event, de-duplicating one-shot witnessed milestones so a villager
 *  doesn't stack five identical "you built that?" memories. Imports and
 *  repeatable events (harvests) may recur. */
export function remember(log: MemoryLog, ev: MemoryEvent): MemoryLog {
  const oneShot: MemoryKind[] = ["built_plank", "dug", "planted_carrot", "arrived", "housed", "raised_by", "raised_favorite", "hum"];
  if (oneShot.includes(ev.kind) && log.some((m) => m.kind === ev.kind)) return log;
  const next = [...log, ev];
  return next.length > MAX_MEMORIES ? next.slice(next.length - MAX_MEMORIES) : next;
}

/** The most recent remembered event of a kind, if any. */
export function recall(log: MemoryLog, kind: MemoryKind): MemoryEvent | undefined {
  for (let i = log.length - 1; i >= 0; i--) if (log[i].kind === kind) return log[i];
  return undefined;
}

export function hasMemory(log: MemoryLog, kind: MemoryKind): boolean {
  return log.some((m) => m.kind === kind);
}
