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
  | "housed"; // the day you finished their house (sim/commission.ts)

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
  const oneShot: MemoryKind[] = ["built_plank", "dug", "planted_carrot", "arrived", "housed", "raised_by", "raised_favorite"];
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
