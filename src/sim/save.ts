// Versioned saves — the opposite of The Meadow's throwaway rule (CLAUDE.md
// §Saves). The Farm's save is long-lived while the game keeps evolving, so
// every save carries a schemaVersion and every schema change ships a migration
// function, tested. `migrateSave` is pure (no localStorage) precisely so tests
// can drive it; the localStorage wrappers are a thin shell on top.

import type { WorldState } from "./types";

export const SCHEMA_VERSION = 1;
const SAVE_KEY = "the-farm-save";

/** Migrations from version N to N+1, applied in sequence. Each takes the raw
 *  parsed object and returns it upgraded. Empty for now — v1 is the first
 *  schema — but the machinery ships from day one so the FIRST breaking change
 *  is a one-line addition here, never a scramble. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (raw) => ({ ...raw, schemaVersion: 2, someNewField: default }),
};

/** Bring any older save up to the current schema. Returns null if the blob is
 *  unrecognisable or from a FUTURE version we can't understand (better to start
 *  fresh than to corrupt state by guessing). Exported for unit tests. */
export function migrateSave(raw: unknown): WorldState | null {
  if (!raw || typeof raw !== "object") return null;
  let obj = raw as Record<string, unknown>;
  let v = typeof obj.schemaVersion === "number" ? obj.schemaVersion : 0;
  if (v > SCHEMA_VERSION) return null; // from a newer build; don't risk it
  while (v < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return null; // gap in the ladder — refuse rather than corrupt
    obj = migrate(obj);
    v = typeof obj.schemaVersion === "number" ? obj.schemaVersion : v + 1;
  }
  if (!isWellFormed(obj)) return null;
  return obj as unknown as WorldState;
}

/** A shallow sanity check that the required top-level shape survived. Not a
 *  full validator — just enough that a truncated or foreign blob is rejected
 *  before it reaches the sim and NaNs something. */
function isWellFormed(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.seed === "number" &&
    typeof obj.player === "object" &&
    obj.player !== null &&
    typeof obj.overrides === "object" &&
    typeof obj.crops === "object" &&
    Array.isArray(obj.villagers)
  );
}

export function serialize(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): WorldState | null {
  try {
    return migrateSave(JSON.parse(json));
  } catch {
    return null;
  }
}

// --- localStorage shell -------------------------------------------------------
export function saveWorld(world: WorldState): void {
  world.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, serialize(world));
  } catch {
    // Storage full or unavailable (private mode). The game keeps running in
    // memory; better than crashing on a failed write.
  }
}

export function loadWorld(): WorldState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return deserialize(raw);
}

export function clearWorld(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
