// Versioned saves — the opposite of The Meadow's throwaway rule (CLAUDE.md
// §Saves). The Farm's save is long-lived while the game keeps evolving, so
// every save carries a schemaVersion and every schema change ships a migration
// function, tested. `migrateSave` is pure (no localStorage) precisely so tests
// can drive it; the localStorage wrappers are a thin shell on top.

import type { WorldState, HomesteadSpot } from "./types";
import { starterSkins, defaultSkin } from "../content/skins";
import { stampTown } from "./town";
import type { StampTarget } from "./town";
import { generatedTile } from "./world";

export const SCHEMA_VERSION = 7;
const SAVE_KEY = "the-farm-save";

/** Migrations from version N to N+1, applied in sequence. Each takes the raw
 *  parsed object and returns it upgraded. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: the player gained its own memory log and an `imported` flag, so an
  // embodied Meadow pet can carry its history (DESIGN §"Player identity").
  // A v1 player was always freshly hatched here, so it has no history to lose:
  // an empty log and imported=false is the truthful backfill, not a guess.
  1: (raw) => {
    const player = (raw.player ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      schemaVersion: 2,
      player: {
        ...player,
        memory: Array.isArray(player.memory) ? player.memory : [],
        imported: typeof player.imported === "boolean" ? player.imported : false,
      },
    };
  },
  // v2 → v3: villager schedules became time-of-day driven, so a villager's
  // position is now derived from the clock rather than from an accumulated
  // stop index + dwell countdown. Drop the two retired fields; the next tick
  // walks everyone to their correct post for the current hour anyway.
  2: (raw) => {
    const villagers = Array.isArray(raw.villagers) ? raw.villagers : [];
    return {
      ...raw,
      schemaVersion: 3,
      villagers: villagers.map((v) => {
        const { stop, dwell, ...rest } = v as Record<string, unknown>;
        void stop;
        void dwell;
        return rest;
      }),
    };
  },
  // v3 → v4: materials arrived (inventory, resource-node regrowth, finishes).
  // A v3 town was built when boards were free, so it starts with a stock of
  // wood rather than being retroactively in debt for a floor it already laid —
  // never punish someone for having played earlier.
  3: (raw) => {
    const skins = (raw.skins ?? {}) as Record<string, unknown>;
    const selected = (skins.selected ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      schemaVersion: 4,
      inventory: typeof raw.inventory === "object" && raw.inventory ? raw.inventory : { wood: 8 },
      regrow: typeof raw.regrow === "object" && raw.regrow ? raw.regrow : {},
      skins: {
        unlocked: Array.isArray(skins.unlocked) ? skins.unlocked : starterSkins(),
        selected: {
          wood: typeof selected.wood === "string" ? selected.wood : defaultSkin("wood"),
          stone: typeof selected.stone === "string" ? selected.stone : defaultSkin("stone"),
        },
      },
    };
  },
  // v4 → v5: structures arrived — walls and doors standing in their own sparse
  // layer above the ground tiles (DESIGN §Structures). A v4 town had no way to
  // build anything that stands up, so an empty layer is the complete and
  // truthful backfill; there is nothing to reconstruct.
  4: (raw) => ({
    ...raw,
    schemaVersion: 5,
    build: typeof raw.build === "object" && raw.build ? raw.build : {},
  }),
  // v5 → v6: furniture, in its own layer beside the structures. Same shape of
  // change as v4 → v5 and the same truthful backfill: a v5 town had nothing to
  // put in a room, so an empty layer loses nothing.
  5: (raw) => ({
    ...raw,
    schemaVersion: 6,
    furniture: typeof raw.furniture === "object" && raw.furniture ? raw.furniture : {},
  }),
  // v6 → v7: the town gained real buildings (a town hall, Margfrom's house).
  //
  // Unlike v4→v5 and v5→v6, an empty backfill would NOT be truthful here: a
  // returning player's town would permanently lack buildings every new town
  // has, and nothing would ever add them. So this migration stamps them in.
  //
  // It is the first migration that WRITES rather than backfills, which makes it
  // the first that could destroy something. stampBuilding refuses any building
  // whose footprint contains anything the player built or planted, all or
  // nothing — so a town where someone happened to build west of the plaza
  // simply keeps their house and doesn't get Margfrom's. Ground edits don't
  // block it; a dug tile is cheap to redo and the stamp lays its own floor.
  6: (raw) => {
    const target = {
      overrides: (typeof raw.overrides === "object" && raw.overrides ? raw.overrides : {}) as Record<string, number>,
      build: (typeof raw.build === "object" && raw.build ? raw.build : {}) as StampTarget["build"],
      furniture: (typeof raw.furniture === "object" && raw.furniture
        ? raw.furniture
        : {}) as StampTarget["furniture"],
      crops: (typeof raw.crops === "object" && raw.crops ? raw.crops : {}) as Record<string, unknown>,
    };
    // The doorstep clear needs to know what generation put outside the door.
    // A save still carries everything that determines it — the seed and the
    // homestead spot — so the migration can answer exactly as newWorld does.
    const seed = typeof raw.seed === "number" ? raw.seed : 0;
    const homestead = (raw.homestead ?? {}) as Record<string, unknown>;
    const spot = (typeof homestead.spot === "string" ? homestead.spot : "hilltop") as HomesteadSpot;
    stampTown(target, (x, y) => generatedTile(seed, spot, x, y));
    return {
      ...raw,
      schemaVersion: 7,
      overrides: target.overrides,
      build: target.build,
      furniture: target.furniture,
    };
  },
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
