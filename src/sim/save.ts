// Versioned saves — the opposite of The Meadow's throwaway rule (CLAUDE.md
// §Saves). The Farm's save is long-lived while the game keeps evolving, so
// every save carries a schemaVersion and every schema change ships a migration
// function, tested. `migrateSave` is pure (no localStorage) precisely so tests
// can drive it; the localStorage wrappers are a thin shell on top.

import type { WorldState, HomesteadSpot } from "./types";
import { starterSkins, defaultSkin } from "../content/skins";
import { STARTING_CROP } from "../content/crops";
import { STARTING_SEED } from "./seeds";
import { newErrands } from "./errands";
import { stampTown, ensureFixedCast } from "./town";
import type { StampTarget } from "./town";
import { generatedTile, tileKey } from "./world";
import { makeVillager } from "./villagers";
import { authoredBed } from "../content/town";
import type { CharId } from "../content/cast";

export const SCHEMA_VERSION = 15;
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
  // v7 → v8: a villager's home stopped being a coordinate and became a claim on
  // a bed (sim/housing.ts), so each one gains `homeBed`.
  //
  // The backfill asks the SAVE, not the content table. A v7 town only has
  // Margfrom's house if the v6→v7 stamp succeeded — and it refuses, all or
  // nothing, any building whose footprint the player had already built in. So
  // "the table says her bed is at (-10,-3)" is not evidence that a bed is
  // there. Claiming one regardless would point her at furniture that doesn't
  // exist, which resolves to the plaza: the same place an honest null gets her,
  // reached by writing down something false first.
  7: (raw) => {
    const villagers = Array.isArray(raw.villagers) ? raw.villagers : [];
    const furniture = (typeof raw.furniture === "object" && raw.furniture ? raw.furniture : {}) as Record<
      string,
      { id?: string }
    >;
    return {
      ...raw,
      schemaVersion: 8,
      villagers: villagers.map((entry) => {
        const v = entry as Record<string, unknown>;
        if (typeof v.homeBed === "string" || v.homeBed === null) return v;
        const bed = typeof v.id === "string" ? authoredBed(v.id as CharId) : null;
        const key = bed ? tileKey(bed.x, bed.y) : null;
        return { ...v, homeBed: key && furniture[key]?.id === "bed" ? key : null };
      }),
    };
  },
  // v8 → v9: commissioned housing (Phase 3). Purely additive — an empty list.
  //
  // Nothing is backfilled and nothing can be. A commission records that someone
  // ARRIVED and asked, and no v8 town has ever had anyone arrive; inventing a
  // form for Margfrom would file paperwork about a house she has lived in since
  // the vertical slice. The first arrival is due FIRST_ARRIVAL_MS after the
  // town was created (sim/commission.ts), and every existing town is long past
  // that — so a returning player gets a knock at the door on their next visit,
  // which is exactly the right way to meet a new feature.
  8: (raw) => ({
    ...raw,
    schemaVersion: 9,
    commissions: Array.isArray(raw.commissions) ? raw.commissions : [],
  }),
  // v9 → v10: cloth. Soft goods arrive with the Menace's counter, and cloth is
  // a third finish CLASS, so `skins.selected` gains a slot for it.
  //
  // The unlocked list gains the starters it doesn't have. Both cloth finishes
  // are starters, and `availableSkins` shows only what's unlocked, so without
  // this an existing town would buy cloth and find the picker empty. Unioning
  // rather than appending keeps it idempotent, and it can only ever ADD — a
  // migration that removed a finish someone had earned would be unforgivable
  // for a save format whose whole promise is that the town survives.
  9: (raw) => {
    const now = Date.now();
    const shop = stampInto(raw);
    const skins = (raw.skins ?? {}) as Record<string, unknown>;
    const selected = (skins.selected ?? {}) as Record<string, unknown>;
    const unlocked = Array.isArray(skins.unlocked) ? (skins.unlocked as string[]) : [];
    return {
      ...raw,
      schemaVersion: 10,
      skins: {
        ...skins,
        unlocked: [...new Set([...unlocked, ...starterSkins()])],
        selected: { ...selected, cloth: selected.cloth ?? defaultSkin("cloth") },
      },
      // …and the shop, and the shopkeeper. Both, or neither is any good: a
      // counter with nobody behind it is stranger to walk into than no shop,
      // and a shopkeeper standing in a field is worse than both.
      //
      // stampTown re-runs the WHOLE table, which is safe and is why it's used
      // rather than a one-building special case: stampBuilding refuses any
      // footprint that already contains something, so the town hall and
      // Margfrom's house are skipped because their own walls are sitting in
      // them. Only genuinely new buildings land. The same guard also means a
      // player who built where the shop goes simply keeps their building.
      overrides: shop.overrides,
      build: shop.build,
      furniture: shop.furniture,
      // ensureFixedCast is the SAME function newWorld uses, for the reason the
      // v7 stamp records: two paths that build the town differently is a bug
      // nobody would think to test for.
      villagers: withFixedCast(raw, now),
    };
  },
  // v10 → v11: the junk economy. The Gremlin and his heap, by the same two
  // moves as v10 — and it adds NO FIELDS AT ALL, which is worth saying out
  // loud because it's a property of the design rather than luck:
  //
  //   • junk is an ordinary item, and the satchel is a Partial<Record>, so a
  //     save that has never seen junk already reads zero of it;
  //   • the two heap finishes are non-starters, so `skins.unlocked` is correct
  //     as it stands — an existing town simply hasn't redeemed them yet;
  //   • the heap building and the Gremlin are the same idempotent stamp +
  //     ensureFixedCast the shop used, which is the whole reason those were
  //     written as one shared path (ROADMAP §"Adding a cast row").
  //
  // So the only real work is the version bump, and everything else is a
  // consequence of decisions already made. That is what a schema is FOR.
  10: (raw) => {
    const now = Date.now();
    const heap = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 11,
      overrides: heap.overrides,
      build: heap.build,
      furniture: heap.furniture,
      villagers: withFixedCast(raw, now),
    };
  },
  // v11 → v12: the museum. The same two moves as v10 and v11 — stamp the town
  // table, re-run ensureFixedCast — plus the first genuinely NEW FIELD since
  // commissions.
  //
  // BOTH THE BUILDING AND THE CURATOR, or this repeats v10's near-miss: a CAST
  // row on its own is a museum with nobody in it, and a stamp on its own is a
  // scholar standing in a field. They are one migration because they are one
  // fact about the town (ROADMAP §"Adding a cast row does not add a person").
  //
  // `museum.donated` backfills EMPTY rather than being inferred from anything.
  // There is nothing to infer it from and that is correct — an existing town
  // has not donated anything, because there was nowhere to donate it. A
  // migration that "credited" old saves with exhibits they never gave would be
  // handing out a record of things that did not happen, which is the one thing
  // a museum must not contain.
  11: (raw) => {
    const now = Date.now();
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 12,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      villagers: withFixedCast(raw, now),
      museum: { donated: [] },
    };
  },
  // v12 → v13: the museum got bigger, because v12 shipped it too small.
  //
  // The v12 room was 5x4 inside. Seventeen exhibits need seventeen cells, which
  // left no circulation at all — pedestals wall to wall, which is both the
  // per-cell edges band rule and a floor you can count your missing exhibits
  // off. So the building grew north into a gallery (x -13..-6, y -16..-7).
  //
  // THIS IS THE ONLY MIGRATION SO FAR THAT REMOVES ANYTHING, and it is worth
  // being precise about why that's allowed here and would not be next time: the
  // v12 museum shipped hours ago, holds nothing, and cannot hold anything —
  // there is no UI to donate through until step 6. Nobody can have a collection
  // in it and nobody can have furnished it. A migration that bulldozed a
  // building people had lived alongside would not get this latitude.
  //
  // Even so it refuses to guess. It clears the old shell ONLY when the old
  // shell is exactly what it stamped, and leaves everything alone otherwise —
  // in which case `stampBuilding` refuses the new footprint on its own and the
  // player keeps whatever they made, which is the same outcome the stamp has
  // always given. Being conservative is the right bias when the alternative is
  // destroying something a live player built.
  12: (raw) => {
    const now = Date.now();
    clearV12Museum(raw);
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 13,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      villagers: withFixedCast(raw, now),
    };
  },
  // v13 → v14: the seed stall. The stamp + ensureFixedCast pair again, plus a
  // new field and — the part worth being careful about — a HANDOUT.
  //
  // `seeds` backfills to the starting variety, which is the only honest answer:
  // a v13 town has unlocked nothing because there was nothing to unlock, and
  // crediting it with the radish would be handing out something that didn't
  // happen (the v11→v12 note, one field over).
  //
  // THE STOCK OF SEED IS NOT GENEROSITY, it is the migration refusing to take
  // something away. Sowing now costs a seed, and a v13 player has none — so
  // without this, ground they could plant on yesterday would refuse them today,
  // and the game would have quietly become worse for having been played early.
  // The same rule the v3→v4 backfill set: never punish someone for having been
  // here first. It is the same STARTING_SEED `newWorld` uses, because two paths
  // that furnish a town differently is the bug ensureFixedCast exists to stop.
  //
  // It tops up rather than sets. A v13 save cannot have seed, so today the
  // distinction is theoretical — but a migration that assigned would be one
  // re-run away from confiscating a satchel, and the cheap version is correct.
  13: (raw) => {
    const now = Date.now();
    const stamped = stampInto(raw);
    const inventory = (typeof raw.inventory === "object" && raw.inventory ? raw.inventory : {}) as Record<
      string,
      number
    >;
    const held = typeof inventory.seed === "number" ? inventory.seed : 0;
    return {
      ...raw,
      schemaVersion: 14,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      villagers: withFixedCast(raw, now),
      inventory: { ...inventory, seed: held + STARTING_SEED },
      seeds: { unlocked: [STARTING_CROP], selected: STARTING_CROP },
    };
  },
  // v14 → v15: the errands board. The stamp + ensureFixedCast pair a third
  // time, and one new field.
  //
  // The stamp now also stands the board up: `stampTown` runs the fixtures as
  // well as the buildings (sim/town.ts), which is deliberately not something
  // this migration does for itself. Two callers furnishing a town differently
  // is the bug ensureFixedCast exists to stop, and the cheapest way to never
  // have it is for there to be one function that knows what a town contains.
  //
  // `lastClosedAt` backfills to NOW, not to zero, and that is the whole of the
  // care this migration needs. Zero would mean the board was last quiet in
  // 1970, so `errandDue` would be true the instant the save loaded and a
  // returning player would walk into a request they had no context for — the
  // town shouting at somebody who just opened the door. Stamping it now gives
  // an upgraded town the same first-request gap a new one gets, which is the
  // v3→v4 rule again: never punish someone for having been here first, and
  // never startle them either.
  //
  // NOTHING IS HANDED OUT. Unlike the seed backfill above there is nothing to
  // restore, because no v14 player could have run an errand — `done` empty is
  // simply true. Crediting an old save with errands it never ran would be the
  // v11→v12 mistake (a migration inventing history) with a friendlier face.
  14: (raw) => {
    const now = Date.now();
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 15,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      villagers: withFixedCast(raw, now),
      errands: newErrands(now),
    };
  },
};

/** The v12 museum, frozen as literals. Migrations must never read the CURRENT
 *  content tables to describe the PAST — content/town.ts now holds the new
 *  gallery, so asking it what the old museum looked like would get the wrong
 *  answer and this would clear the wrong cells. */
const V12_MUSEUM = { x0: -13, y0: -12, x1: -7, y1: -7, door: { x: -10, y: -7 } };
const V12_MUSEUM_FURNITURE = [
  { x: -12, y: -10 },
  { x: -10, y: -11 },
  { x: -8, y: -11 },
];
/** A cell that is a wall in the v12 layout and open floor in the new one, so it
 *  tells the two apart with one lookup. Without it, a save coming up the ladder
 *  from v11 — whose 11→12 step stamps the NEW museum, because that step reads
 *  the live table — would have its brand-new south wall mistaken for the old
 *  one and knocked out. Migrations are read in order and applied in order; the
 *  ladder does not rewind. */
const V12_TELL = { x: -7, y: -12 };

function clearV12Museum(raw: Record<string, unknown>): void {
  const build = (typeof raw.build === "object" && raw.build ? raw.build : {}) as Record<
    string,
    { id: string }
  >;
  const furniture = (typeof raw.furniture === "object" && raw.furniture ? raw.furniture : {}) as Record<
    string,
    unknown
  >;
  const b = V12_MUSEUM;
  if (build[tileKey(V12_TELL.x, V12_TELL.y)]?.id !== "wall") return; // not the old museum

  // Every build cell in the old footprint must be one of ITS OWN walls. Any
  // other standing thing in there is the player's, and then nothing is touched.
  const expected = new Map<string, string>();
  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      if (x !== b.x0 && x !== b.x1 && y !== b.y0 && y !== b.y1) continue;
      expected.set(tileKey(x, y), x === b.door.x && y === b.door.y ? "door" : "wall");
    }
  }
  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      const key = tileKey(x, y);
      const cell = build[key];
      if (!cell) continue;
      if (expected.get(key) !== cell.id) return; // player work — leave it all
    }
  }
  for (const key of expected.keys()) delete build[key];
  // Its three pieces of furniture go with it. Anything else in there stays,
  // because anything else in there was put there by a person.
  for (const f of V12_MUSEUM_FURNITURE) delete furniture[tileKey(f.x, f.y)];
}

/** Re-stamp the town's table into a save, adding only what isn't there.
 *
 *  Shares the v6→v7 target-building code because the two do the same job on the
 *  same shapes; a save mid-migration is raw parsed JSON, which is what
 *  StampTarget exists for. */
function stampInto(raw: Record<string, unknown>): StampTarget {
  const target: StampTarget = {
    overrides: (typeof raw.overrides === "object" && raw.overrides ? raw.overrides : {}) as Record<string, number>,
    build: (typeof raw.build === "object" && raw.build ? raw.build : {}) as StampTarget["build"],
    furniture: (typeof raw.furniture === "object" && raw.furniture ? raw.furniture : {}) as StampTarget["furniture"],
    crops: (typeof raw.crops === "object" && raw.crops ? raw.crops : {}) as Record<string, unknown>,
  };
  const seed = typeof raw.seed === "number" ? raw.seed : 0;
  const homestead = (raw.homestead ?? {}) as Record<string, unknown>;
  const spot = (typeof homestead.spot === "string" ? homestead.spot : "hilltop") as HomesteadSpot;
  stampTown(target, (x, y) => generatedTile(seed, spot, x, y));
  return target;
}

/** The villager list with any missing INSTITUTION appended. Residents are
 *  deliberately not touched — someone moving in is an event (a commission),
 *  never something a migration conjures. */
function withFixedCast(raw: Record<string, unknown>, now: number): unknown[] {
  const villagers = Array.isArray(raw.villagers) ? [...(raw.villagers as { id: string }[])] : [];
  ensureFixedCast({ villagers }, now, (def, at) => makeVillager(def, at));
  return villagers;
}

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
