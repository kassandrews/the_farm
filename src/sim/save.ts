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
import { generatedTile, homesteadOrigin, tileKey, RECLAIM_MS } from "./world";
import { DIRT } from "../content/tiles";
import { makeVillager } from "./villagers";
import { authoredBed, TOWN_BUILDINGS } from "../content/town";
import type { CharId, AuthoredId } from "../content/cast";
import { CAST, MOLE, GHOST, COSMOS, livesSomewhere } from "../content/cast";
import { ARRIVALS } from "../content/arrivals";
import { MUSEUM } from "../content/museum";

export const SCHEMA_VERSION = 40;

// It went to 24 at Phase 9a (`places`), 25 at 9b (`filings`), 26 at 9c
// (`notebook`) and 27 for per-tile floor finishes — genuinely new stored fields,
// which is exactly the case the note below says is worth a bump.
//
// 27 is the first bump that also RESHAPES an existing field rather than only
// adding one (`skins.selected` goes from per-class to per-tool) and the first
// that rewrites persisted note kinds (`built_plank` → `built_floor`). Both are
// spelled out at the migration itself.
//
// 28 adds NO field at all — it repaints the museum's walls in stone. Like v15
// (which existed only to re-stamp the town), a content change to a STAMPED
// building cannot reach a deployed save any other way: the walls were written
// into `build` at world creation and nothing revisits them. Unlike v15 it edits
// rather than re-stamps, so a wall the player has repainted survives.
//
// 29 corrects 28's choice of stone and glazes the façade. Kept as a SECOND
// migration rather than by editing 28, which is the rule: 28 has shipped, so
// some saves are already sitting on it, and a ladder rung may never be rewritten
// once anything has climbed it. A v27 save now goes whitewash → cobble → marble
// and lands where a fresh world starts, which is what the ladder is for.
//
// Note what 25 does NOT add: anything about which forms the town hall is
// offering. A batch of forms is a total function of how long you have lived
// here (sim/filings.ts), so there is no schedule to persist and no "released"
// set to backfill — the same reason festivals cost no save data at all.
//
// IT STAYED AT 23 THROUGH THE SKY (Phase 7c), and that absence was a decision.
//
// The sky adds no stored field. Nothing up there can be edited — no digging, no
// building, no planting (DESIGN §The sky) — so there is no `sky` edit map to
// backfill; the layer is generated from the seed on every read, the way the
// underground's rock would be if you had never cut any. The only save-visible
// change is that `player.layer` may now hold a third value, and a value is not
// a shape: nothing about an existing save becomes wrong.
//
// BUMPING IT ANYWAY WOULD HAVE COST A TOWN. This game ships as a PWA, so a
// player can hold a cached older build for a while after a deploy. `migrateSave`
// refuses a save from a FUTURE version outright — which is right when the shape
// has moved on, and would be a disaster here: the stale build would throw away a
// real town rather than admit it doesn't know a word. What it does instead, with
// the version left alone, is read `layer: "sky"` and fall through every switch
// to the surface arm, putting the player on the ground at the coordinate they
// climbed from. Wrong, briefly, and harmless — which is the correct way to lose
// this particular argument.
const SAVE_KEY = "the-farm-save";

/** Migrations from version N to N+1, applied in sequence. Each takes the raw
 *  parsed object and returns it upgraded.
 *
 *  EXPORTED FOR TESTS, and specifically so a rung can be climbed ON ITS OWN.
 *  Every test here used to run the whole ladder and then assert on the thing its
 *  rung had done, which was fine while migrations only ever added fields: a later
 *  rung could not disturb an earlier one's evidence. v37 can and does — it moves
 *  four buildings, so it rewrites the very cells the v27 and v28 museum rungs are
 *  about, and the ladder's far end stopped being a place you can see the middle
 *  of it from. A rung is a pure function; testing it as one is the fix. */
export const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
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
    const spot = (typeof homestead.spot === "string" ? homestead.spot : "forest") as HomesteadSpot;
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
  // v15 → v16: the plaza stage and the Dramatic Blob. The stamp +
  // ensureFixedCast pair a fourth time, and — like v10 → v11 — IT ADDS NO
  // FIELDS AT ALL.
  //
  // That is the whole point and it is worth stating precisely, because the
  // design note in ROADMAP nearly overclaimed it: festivals need no save data
  // (a festival is a total function of the date, and who attended one is a
  // memory on the villagers who were there, which already serialises). What
  // they DO need is for the stage to be standing in the plaza and for the Blob
  // to exist, and neither of those reaches a live save on its own — the
  // migration ladder only runs below SCHEMA_VERSION, so a town that is already
  // at v15 would never hear about either of them.
  //
  // So this exists to run the two idempotent stamps and for no other reason.
  // A version bump whose entire body is "re-furnish the town" is not ceremony;
  // it is the only way a deployed save gets the last institution.
  15: (raw) => {
    const now = Date.now();
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 16,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      villagers: withFixedCast(raw, now),
    };
  },
  // v16 → v17: the underground layer (Phase 4a). One new field and nothing
  // else — `under` is the sparse map of rock you have cut away, and a town that
  // has never been down there has cut away none of it.
  //
  // The empty object is the truthful backfill rather than a convenient one:
  // underground generation is solid everywhere, so "no edits" reads as "solid
  // rock under the whole town", which is exactly the state a v16 save was in.
  // Compare v1 → v2's empty memory log; the shape of the argument is the same.
  //
  // Note what it does NOT do: sink a shaft. Descending has to be something the
  // player did, and a migration that dug a hole in your homestead would be the
  // world editing itself while you weren't looking.
  16: (raw) => ({
    ...raw,
    schemaVersion: 17,
    under: typeof raw.under === "object" && raw.under ? raw.under : {},
  }),
  // v17 → v18: the player carries a layer (4a step 2). "surface" is the only
  // truthful backfill and also the only reachable one — you get underground by
  // standing on a shaft, and v17 had no shafts in it.
  17: (raw) => {
    const player = (raw.player ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      schemaVersion: 18,
      player: { ...player, layer: player.layer === "under" ? "under" : "surface" },
    };
  },
  // v18 → v19: the player carries a heading (4a step 2b), because ACT
  // underground cuts the rock AHEAD of you and `facing` is only ±1.
  //
  // "s" for everyone, and that isn't a guess dressed as data: a v18 save has no
  // heading anywhere in it, and the first walk the player takes overwrites this
  // before anything can read it. It matches what newWorld starts with, so an
  // upgraded town and a fresh one are pointed the same way.
  18: (raw) => {
    const player = (raw.player ?? {}) as Record<string, unknown>;
    const h = player.heading;
    return {
      ...raw,
      schemaVersion: 19,
      player: {
        ...player,
        heading: h === "n" || h === "e" || h === "w" ? h : "s",
      },
    };
  },
  // v19 → v20: somebody can walk with you (Phase 4b). One nullable field, and
  // null is the only truthful backfill — a v19 save has no company slot, so
  // nobody was with you, so nobody is.
  //
  // Note what it does NOT do: touch the villagers. Company is not a property of
  // a person, it is a fact about right now, and a migration that put a
  // `following: false` on every villager would be the same fact written eight
  // times with seven copies free to drift.
  19: (raw) => ({ ...raw, schemaVersion: 20, company: null }),
  // v20 → v21: furniture can stand in the rock (Phase 5a, the lamp). One new
  // record, empty, and empty is the truthful backfill for the same reason v17's
  // was: a v20 save could not put anything down there — build mode refused the
  // underground outright — so "nothing installed" is not a convenient guess, it
  // is the only state such a town has ever been in.
  //
  // Its own record rather than prefixed keys in `furniture`, which means this
  // migration rekeys NOTHING and every existing entry keeps meaning the surface.
  // See types.ts §underFurniture for the five modules that decision protects.
  20: (raw) => ({
    ...raw,
    schemaVersion: 21,
    underFurniture:
      typeof raw.underFurniture === "object" && raw.underFurniture ? raw.underFurniture : {},
  }),
  // v21 → v22: dug earth grasses over (sim/world.ts §RECLAIM_MS). Trees came back
  // and holes did not, which made the shovel the only verb you had to tidy up
  // after.
  //
  // Empty is NOT the truthful backfill here, and this is the first migration
  // where it isn't. Every other new record described something an older town
  // could not have done; this one describes something every older town HAS been
  // doing for as long as it has had a shovel, and its bare patches are already on
  // the map. So the entries are reconstructed from the ground itself: every DIRT
  // override books a timer, and from the moment of THIS LOAD rather than from
  // whenever it was dug — we don't know when that was, and a save that opened to
  // a lawn where its dug plot used to be would read as the game having thrown
  // work away. Old scars get one more day, then they close.
  //
  // Tiles already waiting on a felled tree or rock are skipped: they have a timer
  // and it puts the node BACK, which is not the same promise. Two timers on one
  // tile is the race this record was shaped to avoid (types.ts §reclaim).
  21: (raw) => {
    const now = Date.now();
    const overrides = (typeof raw.overrides === "object" && raw.overrides ? raw.overrides : {}) as
      Record<string, number>;
    const regrow = (typeof raw.regrow === "object" && raw.regrow ? raw.regrow : {}) as
      Record<string, unknown>;
    const reclaim: Record<string, number> = {};
    for (const [key, id] of Object.entries(overrides)) {
      if (id === DIRT && !regrow[key]) reclaim[key] = now + RECLAIM_MS;
    }
    return { ...raw, schemaVersion: 22, reclaim };
  },
  // v22 → v23: everybody got a name. The five institutions who were called by
  // their species are Gary, Arabella, Nub, Pesto and Aurelio; the curator, the
  // starter resident, the carrot and the three secrets were re-cast alongside
  // them (content/cast.ts, registers in content/names.ts).
  //
  // A migration is needed because `name` is the one thing about a villager that
  // is COPIED into the save rather than read from the table. That is correct —
  // a Meadow import brings its own name and there is no row to read it from —
  // but it means a live town would go on calling him the Tired Office Creature
  // forever, since the ladder is the only thing that ever reaches a deployed
  // save.
  //
  // AUTHORED IDS ONLY, and the distinction is the whole care of this function:
  //   • the eight CAST rows and the three secrets — refreshed from the table
  //   • `newcomer:N` — refreshed from ARRIVALS[N], because the id encodes the
  //     index that admitted them (sim/commission.ts)
  //   • anybody else — LEFT ALONE. That is an imported sprite carrying a name
  //     from The Meadow, and overwriting it would be this game reaching into
  //     the one save it promised never to write back to.
  // The player's own name lives on `player`, is chosen by the player, and is
  // not touched by any of the above.
  22: (raw) => {
    const villagers = Array.isArray(raw.villagers) ? (raw.villagers as Record<string, unknown>[]) : [];
    const renamed = villagers.map((v) => {
      const id = typeof v.id === "string" ? v.id : "";
      const authored = authoredName(id);
      return authored ? { ...v, name: authored } : v;
    });
    return { ...raw, schemaVersion: 23, villagers: renamed };
  },

  // v23 → v24: the ground gained a memory (Phase 9a, sim/places.ts).
  //
  // Empty, and it has to be empty. A place log is a record of what was
  // WITNESSED, and nobody witnessed anything in a town that existed before the
  // log did. It would be trivial to backfill — every plank in `build` is a
  // floor the player laid, every claimed `homeBed` is somebody who sleeps
  // there — and every one of those entries would be invented, with a made-up
  // timestamp attached, in a system whose whole promise is that it only ever
  // says things that happened. A migration must never describe a past it did
  // not see (the same rule as the frozen literals below, arrived at from the
  // other direction). An old town simply starts remembering from today.
  23: (raw) => ({ ...raw, schemaVersion: 24, places: [] }),

  // v24 → v25: the town hall grew a filing cabinet (Phase 9b, sim/filings.ts).
  //
  // Empty, like the place log above it and for a plainer reason: nobody has
  // filed anything, because until this version there was nothing to file. There
  // is no honest backfill available here even in principle.
  //
  // An OLD town gets the whole schedule at once rather than a drip, and that is
  // correct: releases are keyed off `createdAt`, so a save that is a month old
  // has been in town a month and the hall owes it every batch it has missed.
  // Nothing was lost by the feature arriving late.
  24: (raw) => ({ ...raw, schemaVersion: 25, filings: [] }),

  // v25 → v26: the Notebook (Phase 9c, sim/notebook.ts).
  //
  // Empty, and here the backfill is not merely dishonest but impossible in
  // principle. An entry records that you NOTICED something; a save records where
  // you are, never where you have been. There is no trace in a v25 town of the
  // fen it walked through last March, and inventing one would be the journal
  // claiming an afternoon that nobody can now check.
  //
  // Nothing is lost by it starting empty. Every noticed trigger is arithmetic on
  // the live world, so an old town rewrites its journal simply by walking around
  // the places it already knows — which is what a notebook is for.
  25: (raw) => ({ ...raw, schemaVersion: 26, notebook: [] }),

  // v26 → v27: floors carry their own finish, and the finish you are building
  // in is remembered per TOOL instead of per material class.
  //
  // Three edits, and the first is the only one anybody will see.
  //
  // 1. BACKFILL `finishes` FROM THE TOWN-WIDE SELECTION. Until now the renderer
  //    asked the town what colour every floor was, so a v26 save records a
  //    single answer for all of them. Writing that answer onto each laid floor
  //    is what makes an upgraded town look EXACTLY as it did before the
  //    upgrade — which matters more than usual here, because the whole point of
  //    the change is that floors stop moving when you change your mind, and a
  //    migration that shuffled their colours on the way in would be the last
  //    time they ever did.
  //
  //    Skipped entirely when the town was building in pine: an absent entry
  //    already means pale pine (WorldState.finishes), so the common case costs
  //    zero bytes and the map stays the size of the choices actually made.
  //
  // 2. RESHAPE `skins.selected`. Class keys cannot express "the floor is slate"
  //    once a floor may be either material. Floor, wall and door all inherit the
  //    old wood pick, which is what they were wearing; the cloth pieces inherit
  //    the old cloth pick. Anything not named here simply falls back through
  //    `loadedFinish()`, which is why this list does not have to be complete.
  //
  // 3. RENAME THE `built_plank` NOTE KIND. It is persisted in three logs — the
  //    player's own memory, every villager's, and the ground's — and dialogue
  //    is written against it (CLAUDE.md: villagers must be able to reference
  //    remembered events). Leaving the old string in place would orphan every
  //    memory of a floor being laid: the note would survive in the save and
  //    match nothing in the banks, so a villager who watched you build would
  //    quietly stop mentioning it. Renaming in place keeps those afternoons.
  //
  // Every fact below is HARDCODED at its v26 value — tile 2, "pine", the tool
  // ids of the day — because a migration must never ask the current content
  // tables to describe the past. Renaming a tool later must not reach back and
  // change what this function does.
  26: (raw) => {
    const V26_FLOOR_TILE = 2;
    const V26_PINE = "pine";

    const overrides = (raw.overrides ?? {}) as Record<string, number>;
    const oldSkins = (raw.skins ?? {}) as { unlocked?: unknown; selected?: Record<string, string> };
    const oldSelected = oldSkins.selected ?? {};
    const townWood = oldSelected.wood ?? V26_PINE;

    const finishes: Record<string, string> = {};
    if (townWood !== V26_PINE) {
      for (const [key, tile] of Object.entries(overrides)) {
        if (tile === V26_FLOOR_TILE) finishes[key] = townWood;
      }
    }

    const selected: Record<string, string> = { floor: townWood, wall: townWood, door: townWood };
    if (oldSelected.cloth) {
      selected.cushion = oldSelected.cloth;
      selected.rug = oldSelected.cloth;
    }

    const renameNotes = (log: unknown): unknown =>
      Array.isArray(log)
        ? log.map((e) =>
            e && typeof e === "object" && (e as { kind?: string }).kind === "built_plank"
              ? { ...(e as object), kind: "built_floor" }
              : e,
          )
        : log;

    const player = raw.player as { memory?: unknown } | undefined;
    const villagers = raw.villagers as { memory?: unknown }[] | undefined;

    return {
      ...raw,
      schemaVersion: 27,
      finishes,
      skins: { ...oldSkins, selected },
      places: renameNotes(raw.places),
      ...(player ? { player: { ...player, memory: renameNotes(player.memory) } } : {}),
      ...(villagers
        ? { villagers: villagers.map((v) => ({ ...v, memory: renameNotes(v.memory) })) }
        : {}),
    };
  },
  // v27 → v28: the museum is masonry.
  //
  // A content change that cannot reach a live save on its own, for the reason
  // v15 spells out at length — the town is STAMPED into `build` at world
  // creation, so every deployed save already has eight-by-ten of whitewashed
  // plank walls and would keep them forever.
  //
  // NOT a re-stamp, unlike v15. `stampInto` rewrites every perimeter cell of
  // every building from the table, which would also undo any wall the player has
  // repainted since paint shipped. This touches only cells that are still
  // exactly what the old table put there: a wall, on the museum's ring, still
  // reading `whitewash`. A repainted cell fails that test and is left alone,
  // which is the correct answer — the player's choice outranks ours.
  //
  // Bounds and the old finish are LITERALS, per the note on V12_MUSEUM below:
  // a migration that asked content/town.ts what the museum used to look like
  // would get today's answer and edit the wrong cells.
  27: (raw) => {
    const V27_MUSEUM = { x0: -13, y0: -16, x1: -6, y1: -7 };
    const V27_WAS = "whitewash";
    const V27_NOW = "cobble";

    const build = { ...((raw.build ?? {}) as Record<string, { id?: string; finish?: string }>) };
    for (let y = V27_MUSEUM.y0; y <= V27_MUSEUM.y1; y++) {
      for (let x = V27_MUSEUM.x0; x <= V27_MUSEUM.x1; x++) {
        const onRing =
          x === V27_MUSEUM.x0 || x === V27_MUSEUM.x1 || y === V27_MUSEUM.y0 || y === V27_MUSEUM.y1;
        if (!onRing) continue;
        const key = `${x},${y}`;
        const cell = build[key];
        // Walls only. The door keeps its leaf: joinery is wood even in a stone
        // building, and its frame picks the masonry up from the wall beside it
        // at draw time.
        if (cell?.id !== "wall" || cell.finish !== V27_WAS) continue;
        build[key] = { ...cell, finish: V27_NOW };
      }
    }
    return { ...raw, schemaVersion: 28, build };
  },
  // v28 → v29: the museum is marble, and it has windows.
  //
  // v28 made it the one stone building and picked the wrong stone. The biggest
  // footprint in town, in the darkest grey the palette had, under a roof that
  // takes its material from its own walls, with no opening anywhere but the
  // door: it read as a jail rather than as a gallery. Being distinctive is not
  // the same as being welcoming.
  //
  // Two edits on the same ring, and the same rule as v28 about not clobbering a
  // repaint — only a wall still reading `cobble` becomes marble. The windows are
  // stricter still: a cell only becomes a window if it is currently a WALL, so a
  // player who knocked the façade through and put something else there keeps it.
  //
  // Literals again, per the standing note: a migration must never ask the
  // current tables to describe the past.
  28: (raw) => {
    const V28_MUSEUM = { x0: -13, y0: -16, x1: -6, y1: -7 };
    const V28_WAS = "cobble";
    const V28_NOW = "marble";
    // The façade openings, flanking the door at (-10,-7).
    const V28_WINDOWS = ["-12,-7", "-11,-7", "-9,-7", "-8,-7"];
    // What a window's own finish paints: the frame, which is joinery and so is
    // wood. The museum's is whitewash, the same as its door leaf.
    const V28_SASH = "whitewash";

    const build = { ...((raw.build ?? {}) as Record<string, { id?: string; finish?: string }>) };
    for (let y = V28_MUSEUM.y0; y <= V28_MUSEUM.y1; y++) {
      for (let x = V28_MUSEUM.x0; x <= V28_MUSEUM.x1; x++) {
        const onRing =
          x === V28_MUSEUM.x0 || x === V28_MUSEUM.x1 || y === V28_MUSEUM.y0 || y === V28_MUSEUM.y1;
        if (!onRing) continue;
        const key = `${x},${y}`;
        const cell = build[key];
        if (cell?.id !== "wall") continue;
        if (V28_WINDOWS.includes(key)) build[key] = { id: "window", finish: V28_SASH };
        else if (cell.finish === V28_WAS) build[key] = { ...cell, finish: V28_NOW };
      }
    }
    return { ...raw, schemaVersion: 29, build };
  },
  // v29 → v30: the farming memories stop naming the carrot.
  //
  // `planted_carrot` and `harvested_carrot` were named after the crop the slice
  // shipped, and then seven more varieties arrived. The kinds covered all eight
  // the whole time — the VALUE is what says which — so nothing was ever
  // mis-rendered to a player. What was wrong is the union: a kind that names a
  // crop it does not mean is how somebody eventually writes the carrot branch
  // that should not exist. They are now `planted` and `harvested`, the act
  // rather than the vegetable.
  //
  // The same walk v26 did for `built_plank` → `built_floor`, over the same three
  // logs, and it must be all three: the ground's `places`, the player's memory,
  // and every villager's. A kind left behind in any of them is a memory that
  // still exists and can never be spoken, because nothing matches it any more.
  //
  // AND a backfill, which v26 needed no equivalent of. `planted` now carries
  // what went in, where it used to be logged with no value at all; a bank line
  // reading that value renders an empty hole for every memory made before today.
  // "something" is the honest answer — the town watched you plant and genuinely
  // does not remember what — and it keeps the memory speakable instead of
  // dropping it. `harvested` has carried its value since it shipped and needs
  // nothing.
  29: (raw) => {
    const V29_RENAMES: Record<string, string> = {
      planted_carrot: "planted",
      harvested_carrot: "harvested",
    };
    // What a memory of planting says when it was logged before we recorded the
    // crop. Prose, like the `carried` strings it stands in for ("a radish"), so
    // it drops into the same sentence without the line knowing which it got.
    const V29_FORGOTTEN = "something";

    const rename = (log: unknown): unknown =>
      Array.isArray(log)
        ? log.map((e) => {
            if (!e || typeof e !== "object") return e;
            const ev = e as { kind?: string; value?: string };
            const kind = ev.kind ? V29_RENAMES[ev.kind] : undefined;
            if (!kind) return e;
            // Only the memory logs carry a value; a `places` entry is about the
            // ground and must not grow one. The two are told apart by `x` — a
            // place is a coordinate, a memory is not. NOT by `at`, which both
            // of them have, and which reads like a discriminator right up until
            // it silently backfills every place entry in the save.
            const isPlace = "x" in ev;
            return kind === "planted" && !isPlace && ev.value === undefined
              ? { ...ev, kind, value: V29_FORGOTTEN }
              : { ...ev, kind };
          })
        : log;

    const player = raw.player as { memory?: unknown } | undefined;
    const villagers = raw.villagers as { memory?: unknown }[] | undefined;

    return {
      ...raw,
      schemaVersion: 30,
      places: rename(raw.places),
      ...(player ? { player: { ...player, memory: rename(player.memory) } } : {}),
      ...(villagers
        ? { villagers: villagers.map((v) => ({ ...v, memory: rename(v.memory) })) }
        : {}),
    };
  },

  /** v31 — the freeze (ROADMAP §Phase 11, types.ts §frozen).
   *
   *  ADDS AN EMPTY OBJECT AND NOTHING ELSE, on purpose. The obvious version of
   *  this migration walks `rooms()` and pins every existing house here, and it
   *  is the wrong place: a migration is frozen in time by contract — it has to
   *  keep meaning what it meant when it shipped — and calling live sim code from
   *  one couples every old save to whatever `rooms()` becomes. The catch-up for
   *  towns that already exist runs on load instead (`freezeBuilt`, called from
   *  the app's world-start path), which is also self-healing: it re-runs for
   *  every save at every version rather than once at a version boundary.
   *
   *  Rekeys nothing and drops nothing, so a save that came from v30 reads
   *  identically until the first thing is built on it. */
  30: (raw) => ({ ...raw, schemaVersion: 31, frozen: {} }),
  // v32: the said ring (Phase 12). `lastLine` becomes `said` — the last few
  // lines a villager spoke, so selection can dodge more than an immediate
  // repeat. The one remembered line seeds the ring rather than being dropped:
  // it is the only piece of conversation history the old save has, and
  // throwing it away would let the very next tap repeat it.
  //
  // `lastTalkedAt` is deliberately NOT backfilled. A pre-v32 save cannot say
  // when you last spoke to anybody, and seeding it with `now` would be the
  // game inventing a conversation that never happened — the field stays absent
  // and the absence greeting waits for a real conversation to time against.
  31: (raw) => {
    const villagers = Array.isArray(raw.villagers) ? raw.villagers : [];
    return {
      ...raw,
      schemaVersion: 32,
      villagers: villagers.map((entry) => {
        const { lastLine, ...v } = entry as Record<string, unknown>;
        return { ...v, said: typeof lastLine === "string" && lastLine !== "" ? [lastLine] : [] };
      }),
    };
  },
  // v32 → v33: the plaza bench (the minigames project — sitting together).
  // The v15 → v16 shape exactly, and for the v15 → v16 reason: IT ADDS NO
  // FIELDS AT ALL. Sitting is derived (sim/play.ts `sittingAt`), games live
  // in a WeakMap and never serialise, and the memory kinds are additive — the
  // only thing a deployed save can't get on its own is the bench standing in
  // the square, because the migration ladder only runs below SCHEMA_VERSION
  // and fixtures are stamped at town creation. So this re-runs the idempotent
  // stamp and does nothing else; a player who built on that cell keeps what
  // they built (`stampFixtures` skips occupied cells, and says so).
  32: (raw) => {
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 33,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
    };
  },
  // v33 → v34: `met`, the items that have ever been in the satchel (Phase 14b —
  // the museum's nature wing may no longer name a thing you have never held).
  //
  // The backfill is what a save can honestly claim: whatever is in the satchel
  // NOW, plus the item of every exhibit already donated — a donation is proof
  // you once held the thing, even if you have spent every one since. What it
  // cannot recover is an item once held, spent to zero and never donated; that
  // player meets it again the next time they pick one up, which is a smaller
  // wrong than inventing a memory the save has no evidence for.
  33: (raw) => {
    const inventory = (typeof raw.inventory === "object" && raw.inventory ? raw.inventory : {}) as Record<string, number>;
    const met = Object.keys(inventory).filter((id) => (inventory[id] ?? 0) > 0);
    const museum = (raw.museum ?? {}) as { donated?: { id?: string }[] };
    for (const d of museum.donated ?? []) {
      const item = MUSEUM.find((e) => e.id === d.id)?.cost.item;
      if (item && !met.includes(item)) met.push(item);
    }
    return { ...raw, schemaVersion: 34, met };
  },

  // v34 → v35: you can take your own tent down (§"How do I house myself").
  //
  // NULL FOR EVERYONE, including towns whose player has had a bed and a door
  // and four walls for months. The flag records that you ASKED, and nobody who
  // played before the action existed has asked — backfilling it from "your
  // house would qualify" would strike the tent of every established town on
  // load, which is a thing vanishing from somebody's plot overnight with no act
  // of theirs behind it.
  34: (raw) => {
    const homestead = (typeof raw.homestead === "object" && raw.homestead ? raw.homestead : {}) as Record<string, unknown>;
    return { ...raw, schemaVersion: 35, homestead: { ...homestead, struckAt: null } };
  },
  // The garden (DESIGN §The garden). Empty on arrival is the DESIGN: `seen`
  // fills itself the first time the player stands anywhere — the town's own
  // region teaches the starter species within a second of loading — so a live
  // save needs nothing backfilled and there is nothing here to get wrong.
  35: (raw) => ({ ...raw, schemaVersion: 36, garden: { seen: [], plants: {} } }),

  /** v37 — the street plan (content/town.ts §The street plan).
   *
   *  THE FIRST MIGRATION THAT TAKES SOMETHING DOWN, and that needs saying out
   *  loud, because every other rung on this ladder only ever added. Four
   *  buildings MOVED — the museum and the heap south onto the north street's
   *  line, the shop and Prudence's house onto the south street's — and a stamp
   *  alone would have left a deployed town with eight buildings in it: four in
   *  their new places and four ghosts in their old ones, each still walkable,
   *  still furnished, and still holding a counter somebody's schedule points at.
   *
   *  So it demolishes the four, then re-stamps the town.
   *
   *  THE OLD COORDINATES ARE FROZEN HERE, in full, and are not read from
   *  `TOWN_BUILDINGS`. That is the v27 museum rule (§the ladder's own contract):
   *  a migration has to keep meaning what it meant the day it shipped, and one
   *  that asked the live table where the museum "was" would demolish wherever it
   *  IS the next time somebody moves it — which is a migration that eats the
   *  town it was supposed to fix.
   *
   *  THE TWO THAT DID NOT MOVE ARE NOT TOUCHED. The town hall and the seed stall
   *  are on the same cells they always were, so demolishing them would only
   *  throw away a refinish somebody chose. `stampTown` skips a footprint that is
   *  already occupied, which is exactly the right no-op for them.
   *
   *  WHAT IT CANNOT PRESERVE, stated plainly: a wall the player repainted on one
   *  of the four, and anything they built onto its outside. v27 went out of its
   *  way to protect a repaint, and could, because the building stayed put — a
   *  repainted wall of a building that has moved is a wall in a field. Furniture
   *  the player added inside one is kept (only the AUTHORED pieces are removed by
   *  id), which will leave a chair standing in the grass; that is a chair they
   *  can pick up, and the alternative is deleting it for them. */
  36: (raw) => {
    /** The four, as they stood in v36. Perimeter, furniture and the plank floor
     *  underneath — everything `stampBuilding` writes. */
    /** Which four moved, in the same order as V36_MOVED below. */
    const MOVED_IDS = ["margfrom_house", "shop", "heap", "museum"] as const;
    const V36_MOVED = [
      {
        x0: -11,
        y0: -4,
        x1: -7,
        y1: 0,
        furniture: [
          { x: -10, y: -3, id: "bed" },
          { x: -10, y: -1, id: "table" },
          { x: -9, y: -2, id: "chair" },
          { x: -8, y: -3, id: "shelf" },
        ],
      },
      {
        x0: 7,
        y0: -4,
        x1: 12,
        y1: 0,
        furniture: [
          { x: 8, y: -1, id: "table" },
          { x: 8, y: -3, id: "shelf" },
          { x: 11, y: -3, id: "shelf" },
        ],
      },
      {
        x0: 6,
        y0: -11,
        x1: 10,
        y1: -6,
        furniture: [
          { x: 7, y: -10, id: "shelf" },
          { x: 9, y: -10, id: "shelf" },
          { x: 7, y: -8, id: "table" },
        ],
      },
      {
        x0: -13,
        y0: -16,
        x1: -6,
        y1: -7,
        furniture: [
          { x: -8, y: -8, id: "table" },
          { x: -12, y: -15, id: "shelf" },
          { x: -8, y: -15, id: "shelf" },
        ],
      },
    ];

    const overrides = { ...((raw.overrides ?? {}) as Record<string, number>) };
    const build = { ...((raw.build ?? {}) as Record<string, { id: string; finish: string }>) };
    const furniture = { ...((raw.furniture ?? {}) as Record<string, { id: string }>) };
    const crops = (raw.crops ?? {}) as Record<string, unknown>;
    const frozen = { ...((raw.frozen ?? {}) as Record<string, unknown>) };

    /** Where the four stand NOW. Read from the live table on purpose, and it is
     *  the one thing here that may be: this half is not "where the save's town
     *  is", it is "where the stamp about to run will want to put things", so it
     *  has to agree with the stamp or the two disagree by construction.
     *
     *  IT IS HERE BECAUSE THE OLD RECTANGLES ARE NOT THE WHOLE STORY. A save that
     *  climbed from far enough back has already had the CURRENT town stamped into
     *  it by an earlier rung — v13 rebuilds the museum, v15 re-stamps the lot — so
     *  by the time this runs the museum may be standing in its new place already.
     *  Demolishing only the old rectangle then eats the half of the new building
     *  that overlaps it and leaves the other half standing, and the re-stamp
     *  refuses the ruin because the remaining walls read as occupied. The museum
     *  came out of a v12 save with two of its four corners missing. */
    const NOW = MOVED_IDS.map((id) => TOWN_BUILDINGS[id]);

    /** Has the player put something of their own inside this building's new
     *  footprint? Ground edits don't count, for `stampBuilding`'s own reason. */
    const playerWorkIn = (b: { x0: number; y0: number; x1: number; y1: number }): boolean => {
      const authored = new Set(
        NOW.flatMap((n) => n.furniture.map((f) => `${f.x},${f.y}:${f.id}`)),
      );
      for (let y = b.y0; y <= b.y1; y++) {
        for (let x = b.x0; x <= b.x1; x++) {
          const key = `${x},${y}`;
          if (key in crops) return true;
          const piece = furniture[key];
          if (piece && !authored.has(`${key}:${piece.id}`)) return true;
        }
      }
      return false;
    };

    /** Structure and authored furniture out of one rectangle, floor back to
     *  generated ground. */
    const demolish = (r: { x0: number; y0: number; x1: number; y1: number }): void => {
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          const key = `${x},${y}`;
          // The plank floor the stamp laid, back to whatever generation says —
          // otherwise the town leaves rectangles of decking in the grass.
          delete overrides[key];
          // Only STRUCTURE comes down. A rug the player laid inside the shop is
          // not part of the shop.
          const cell = build[key];
          if (cell && (cell.id === "wall" || cell.id === "door" || cell.id === "window")) {
            delete build[key];
          }
          // The freeze pins a built room's shape; a pin on a room that no longer
          // exists would keep drawing its roof. `freezeBuilt` re-runs on load and
          // heals the rest (see v31).
          delete frozen[key];
        }
      }
    };

    for (let i = 0; i < V36_MOVED.length; i++) {
      const was = V36_MOVED[i];
      const now = NOW[i];
      // ALL OR NOTHING PER BUILDING, on `stampBuilding`'s own instinct. If the
      // player has built or planted where this one is going, the stamp is going
      // to refuse it — so taking the old one down first would cost them a
      // building and give nothing back. Leave the pair alone and let them keep
      // whatever they made.
      if (playerWorkIn(now)) continue;
      demolish(was);
      demolish(now);
      // Authored furniture only, matched by id, so anything the player put in one
      // of these rooms survives it — in the grass, where they can pick it up.
      for (const f of [...was.furniture, ...now.furniture]) {
        const key = `${f.x},${f.y}`;
        if (furniture[key]?.id === f.id) delete furniture[key];
      }
    }

    const stamped = stampInto({ ...raw, overrides, build, furniture });
    return {
      ...raw,
      schemaVersion: 37,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      finishes: stamped.finishes ?? raw.finishes,
      frozen,
    };
  },

  /** v38 — the plot (content/town.ts §The plot).
   *
   *  The lane that v37 ran south out of the square stopped in grass. This is what
   *  it was stopping short of: a fenced parcel with a barn in it, a yard, and a
   *  tent that now stands inside its own boundary instead of on open ground a
   *  screen away from anything.
   *
   *  Three jobs, and the third is the one with a judgement in it.
   *
   *  1. TAKE THE SEED STALL DOWN WHERE IT WAS. It moved five rows south of the
   *     square to make room for the plot's north fence, so it is a mover like
   *     v37's four and gets v37's treatment, old rectangle frozen in the rung.
   *  2. RE-STAMP, which puts the stall back, stands the barn up, lays the plot's
   *     lane and yard and runs the fence. All of it is idempotent and all of it
   *     refuses ground the player has claimed.
   *  3. MOVE THE TENT — but ONLY IF IT IS STILL STANDING. `struckAt` is the whole
   *     test. A struck tent is a decision the player made (DESIGN §"you take the
   *     tent down yourself"), and there is nothing to move; an unstruck one means
   *     they have not yet built a bed in a room with a door, which means they have
   *     not built a house, which means nothing of theirs is anchored to the old
   *     coordinate. Moving it is then the smallest honest change: your tent is on
   *     your plot, where the plot now is. Moving a struck one would resurrect a
   *     tent somebody deliberately took down. */
  37: (raw) => {
    /** The seed stall as it stood in v37 and in every version before it. */
    const V37_STALL = {
      x0: -9,
      y0: 4,
      x1: -4,
      y1: 9,
      furniture: [
        { x: -8, y: 8, id: "table" },
        { x: -8, y: 5, id: "shelf" },
        { x: -5, y: 5, id: "shelf" },
      ],
    };

    const overrides = { ...((raw.overrides ?? {}) as Record<string, number>) };
    const build = { ...((raw.build ?? {}) as Record<string, { id: string; finish: string }>) };
    const furniture = { ...((raw.furniture ?? {}) as Record<string, { id: string }>) };
    const crops = (raw.crops ?? {}) as Record<string, unknown>;
    const frozen = { ...((raw.frozen ?? {}) as Record<string, unknown>) };

    const now = TOWN_BUILDINGS.seedstall;
    const authored = new Set(now.furniture.map((f) => `${f.x},${f.y}:${f.id}`));
    let playerWork = false;
    for (let y = now.y0; y <= now.y1; y++) {
      for (let x = now.x0; x <= now.x1; x++) {
        const key = `${x},${y}`;
        if (key in crops) playerWork = true;
        const piece = furniture[key];
        if (piece && !authored.has(`${key}:${piece.id}`)) playerWork = true;
      }
    }

    if (!playerWork) {
      for (const r of [V37_STALL, now]) {
        for (let y = r.y0; y <= r.y1; y++) {
          for (let x = r.x0; x <= r.x1; x++) {
            const key = `${x},${y}`;
            delete overrides[key];
            const cell = build[key];
            if (cell && (cell.id === "wall" || cell.id === "door" || cell.id === "window")) {
              delete build[key];
            }
            delete frozen[key];
          }
        }
      }
      for (const f of [...V37_STALL.furniture, ...now.furniture]) {
        const key = `${f.x},${f.y}`;
        if (furniture[key]?.id === f.id) delete furniture[key];
      }
    }

    const stamped = stampInto({ ...raw, overrides, build, furniture });

    const homestead = (raw.homestead ?? {}) as Record<string, unknown>;
    const struck = homestead.struckAt != null;
    const spot = (typeof homestead.spot === "string" ? homestead.spot : "forest") as HomesteadSpot;
    const home = homesteadOrigin(spot);

    return {
      ...raw,
      schemaVersion: 38,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      finishes: stamped.finishes ?? raw.finishes,
      frozen,
      homestead: struck ? homestead : { ...homestead, originX: home.x, originY: home.y },
    };
  },

  /** v39 — the town plants itself (content/town.ts §What the town planted).
   *
   *  The avenue down the lane, the two alley trees, the fruit on your own fence
   *  and the flowers on the verges. Nothing is REMOVED here, which makes this the
   *  simplest rung since v15: the plantings are additive, `stampPlantings` skips
   *  any cell somebody has claimed, and a town that already has them (a save made
   *  after this shipped) gets nothing done to it at all.
   *
   *  It reaches through the full `stampInto` rather than calling the planting
   *  pass alone, on the ladder's oldest rule: a returning player's town and a new
   *  player's town must not be able to differ, and the way that is guaranteed is
   *  that both go through the same function. */
  38: (raw) => {
    const stamped = stampInto(raw);
    return {
      ...raw,
      schemaVersion: 39,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      finishes: stamped.finishes ?? raw.finishes,
      garden: stamped.garden ?? raw.garden,
    };
  },

  /** v40 — the square is cleared and the path is one tile.
   *
   *  Two corrections, both asked for after looking at the town on screen, and
   *  both about STONE.
   *
   *  1. NOTHING MAY STAND ON THE SQUARE. The town hall's south wall sat on the
   *     plaza's own top row, so the one shared space in the town had a building's
   *     wall ring eating a slice of it — and the stamp had laid plank over the
   *     paving there. Nothing else overlapped (every other building is outside
   *     the plaza's x range), which is exactly why it survived: one building
   *     quietly took part of the square. The whole north front line moved back a
   *     row rather than the hall alone, or the row of fronts would have grown a
   *     step in it to fix a problem about the square.
   *  2. THE PAVING SHRANK. The lane went from three tiles to one and the south
   *     street from two rows to one. Together with the plaza they had put a wall
   *     of stone across the town at the place you stand most.
   *
   *  So this rung has to take paving UP, which no rung has done before. The old
   *  rectangles are frozen here, as always, and a cell is only lifted if it still
   *  looks exactly like paving the town laid: FLOOR, wearing the town's cobble,
   *  with nothing built or planted on it. Repave a stretch of the old lane in
   *  your own boards and it stays — that is a floor you laid. */
  39: (raw) => {
    /** Everything the town had paved at v39. */
    const V39_STREETS = [
      { x0: -13, y0: -4, x1: -6, y1: -3 },
      { x0: 6, y0: -4, x1: 11, y1: -3 },
      { x0: -13, y0: 3, x1: 12, y1: 4 },
      { x0: -1, y0: 5, x1: 1, y1: 11 },
      { x0: -6, y0: 11, x1: 0, y1: 11 },
      { x0: -1, y0: 12, x1: 1, y1: 18 },
      { x0: -7, y0: 18, x1: 1, y1: 18 },
    ];
    /** And the three institutions, where they stood at v39. */
    const V39_NORTH = [
      { x0: -3, y0: -9, x1: 3, y1: -5, furniture: [
        { x: -1, y: -7, id: "table" },
        { x: 1, y: -7, id: "chair" },
        { x: -2, y: -8, id: "shelf" },
        { x: 2, y: -8, id: "shelf" },
      ] },
      { x0: 6, y0: -10, x1: 10, y1: -5, furniture: [
        { x: 7, y: -9, id: "shelf" },
        { x: 9, y: -9, id: "shelf" },
        { x: 7, y: -7, id: "table" },
      ] },
      { x0: -13, y0: -14, x1: -6, y1: -5, furniture: [
        { x: -8, y: -6, id: "table" },
        { x: -12, y: -13, id: "shelf" },
        { x: -8, y: -13, id: "shelf" },
      ] },
    ];
    const NOW_NORTH = ["townhall", "heap", "museum"] as const;

    const overrides = { ...((raw.overrides ?? {}) as Record<string, number>) };
    const build = { ...((raw.build ?? {}) as Record<string, { id: string; finish: string }>) };
    const furniture = { ...((raw.furniture ?? {}) as Record<string, { id: string }>) };
    const finishes = { ...((raw.finishes ?? {}) as Record<string, string>) };
    const crops = (raw.crops ?? {}) as Record<string, unknown>;
    const garden = (raw.garden ?? { plants: {} }) as { plants: Record<string, unknown> };
    const frozen = { ...((raw.frozen ?? {}) as Record<string, unknown>) };

    // Paving up first. FLOOR in the town's own cobble, with nothing on it — the
    // narrowest description of "a cell the town paved and nobody has touched".
    for (const r of V39_STREETS) {
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          const key = `${x},${y}`;
          if (key in build || key in furniture || key in crops || key in garden.plants) continue;
          if (overrides[key] !== 2 /* FLOOR */ || finishes[key] !== "cobble") continue;
          delete overrides[key];
          delete finishes[key];
        }
      }
    }

    // Then the three that moved back a row, on v37's terms exactly.
    for (let i = 0; i < V39_NORTH.length; i++) {
      const was = V39_NORTH[i];
      const now = TOWN_BUILDINGS[NOW_NORTH[i]];
      // HAS THE PLAYER CLAIMED THIS GROUND? Crops and furniture, as v37 asked —
      // and STRUCTURE too, which v37 did not and which cost three tests to
      // notice.
      //
      // v37's four movers could skip the question for walls: `stampBuilding` is
      // all-or-nothing, so a player wall anywhere in a footprint means the town
      // never stamped that building at all, and there was nothing of the town's
      // there to protect. The hall is different — it has been standing on this
      // exact footprint since v7, so "there is a wall here" is the normal case
      // and the question becomes WHOSE. The answer is exact comparison: work out
      // what the stamp would write in this cell and see whether that is what is
      // there. A perimeter cell in somebody's own finish is a repaint or a shed,
      // and either way it is theirs.
      const authored = new Set(now.furniture.map((f) => `${f.x},${f.y}:${f.id}`));
      const glazed = new Set((now.windows ?? []).map((w) => `${w.x},${w.y}`));
      let playerWork = false;
      for (let y = now.y0; y <= now.y1; y++) {
        for (let x = now.x0; x <= now.x1; x++) {
          const key = `${x},${y}`;
          if (key in crops || key in garden.plants) playerWork = true;
          const piece = furniture[key];
          if (piece && !authored.has(`${key}:${piece.id}`)) playerWork = true;
          const cell = build[key];
          if (!cell) continue; // empty is not a claim
          const ring = x === now.x0 || x === now.x1 || y === now.y0 || y === now.y1;
          if (!ring) {
            playerWork = true; // the stamp puts nothing inside; this is theirs
            continue;
          }
          const isDoor = x === now.door.x && y === now.door.y;
          const isWindow = !isDoor && glazed.has(key);
          const wantId = isDoor ? "door" : isWindow ? "window" : "wall";
          const wantFinish = isDoor || isWindow ? now.finish : (now.walls ?? now.finish);
          if (cell.id !== wantId || cell.finish !== wantFinish) playerWork = true;
        }
      }
      if (playerWork) continue;
      for (const r of [was, now]) {
        for (let y = r.y0; y <= r.y1; y++) {
          for (let x = r.x0; x <= r.x1; x++) {
            const key = `${x},${y}`;
            delete overrides[key];
            const cell = build[key];
            if (cell && (cell.id === "wall" || cell.id === "door" || cell.id === "window")) {
              delete build[key];
            }
            delete frozen[key];
          }
        }
      }
      for (const f of [...was.furniture, ...now.furniture]) {
        const key = `${f.x},${f.y}`;
        if (furniture[key]?.id === f.id) delete furniture[key];
      }
    }

    const stamped = stampInto({ ...raw, overrides, build, furniture, finishes });
    return {
      ...raw,
      schemaVersion: 40,
      overrides: stamped.overrides,
      build: stamped.build,
      furniture: stamped.furniture,
      finishes: stamped.finishes ?? finishes,
      garden: stamped.garden ?? raw.garden,
      frozen,
    };
  },
};

/** The name the tables now give an authored character, or null for anyone the
 *  tables never named — an import, or a newcomer past the end of the queue. */
function authoredName(id: string): string | null {
  if (id === "mole") return MOLE.name;
  if (id === "ghost") return GHOST.name;
  if (id === "cosmos") return COSMOS.name;
  if (id.startsWith("newcomer:")) {
    const n = Number(id.slice("newcomer:".length));
    return Number.isInteger(n) ? (ARRIVALS[n]?.name ?? null) : null;
  }
  return CAST[id as AuthoredId]?.name ?? null;
}

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
    // The streets store a floor finish per cell (sim/town.ts §stampStreets), so
    // a stamp into a save has to be able to reach the finish map. Older saves
    // may not have grown the field; `stampStreets` writes none when it's absent,
    // which leaves the cobbles at the default board and is the right failure.
    finishes: (typeof raw.finishes === "object" && raw.finishes ? raw.finishes : undefined) as
      | Record<string, string>
      | undefined,
    garden: (typeof raw.garden === "object" && raw.garden ? raw.garden : undefined) as
      | StampTarget["garden"],
  };
  const seed = typeof raw.seed === "number" ? raw.seed : 0;
  const homestead = (raw.homestead ?? {}) as Record<string, unknown>;
  const spot = (typeof homestead.spot === "string" ? homestead.spot : "forest") as HomesteadSpot;
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
  repair(obj);
  return obj as unknown as WorldState;
}

/** Fix what a save should never have contained. NOT a migration: it changes no
 *  shape, ships with no version bump, and runs on every load at every version —
 *  a migration answers "this save is old", and this answers "this save is
 *  wrong".
 *
 *  ONE VILLAGER PER ID. Routes are keyed by character id (sim/villagers.ts), so
 *  two villagers sharing one makes them read each other's waypoints: they
 *  re-path every tick and slide across the town at several times walking pace,
 *  for ever, in a save that otherwise looks fine. It is silent, it survives
 *  every reload, and no test could see it because a fresh town cannot produce
 *  it — the symptom only ever shows up in a town somebody has actually played.
 *
 *  `admitArrival` now refuses to mint a duplicate, which closes the one route in
 *  today's code (its id counts commissions, so a town whose commissions and
 *  villagers ever disagreed would collide). This is the other half: a save that
 *  already went wrong has to be able to come back, because the alternative is
 *  telling somebody their town is unfixable. The first entry wins, being the one
 *  with the longer history behind it. */
function repair(obj: Record<string, unknown>): void {
  const villagers = obj.villagers as { id?: unknown }[];
  const seen = new Set<unknown>();
  const kept = villagers.filter((v) => {
    if (!v || typeof v.id !== "string" || seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
  if (kept.length !== villagers.length) obj.villagers = kept;

  // A FIXED CHARACTER STANDS WHERE THEIR TABLE SAYS, and this is the other
  // thing a save should never have contained.
  //
  // `tickVillager` returns early on `def.fixed` — that early return is the whole
  // of how the Office Creature stays at his desk — so a fixed villager's stored
  // coordinate is never revisited once it is written. Which means moving one in
  // content/cast.ts moves them in a NEW town and nowhere else: every save that
  // already exists keeps them standing where the old table put them, for ever.
  //
  // That shipped. The Menace and the curator were moved out from behind their
  // own counters, the fix was photographed in a fresh world and looked correct,
  // and on a live save both were still hidden — because the browser harness
  // onboards a new town every run and the one place the bug lives is the one
  // place it never looked. The commit that made the move claimed a live save
  // would right itself on load. It would not.
  //
  // So their position is derived here rather than trusted, which is what it
  // should always have been: for somebody who cannot walk, the schedule is not
  // where they are going, it is where they ARE. Self-healing for the next move
  // too, with no migration to write — the number in the save simply stops being
  // the authority.
  //
  // ONE STOP ONLY, and `fixed` is not the test — which the save tests caught on
  // the first run, having been written for exactly this.
  //
  // `fixed` says the walking code leaves you alone; it does NOT say you are
  // stationary. Pesto is fixed and walks a round: eight stops, position derived
  // from the clock by `scheduledStop`, and the early return in `tickVillager` is
  // stepped around for him specifically. Snapping every fixed villager to
  // `schedule[0]` therefore teleported the postman to wherever he sleeps,
  // whatever the hour, on every load.
  //
  // A single stop is the real condition and it is the honest one: with one entry
  // there is no clock to consult, so the table IS the position and nothing is
  // being overruled. More than one and the clock owns it.
  //
  // The three secrets are excluded by the same line for a second reason — their
  // stops are symbolic (`at: "warren"`), resolved against a world this function
  // does not have, and a literal 0,0 is exactly the wrong answer for the Mole.
  for (const v of obj.villagers as {
    id?: unknown;
    fixed?: unknown;
    x?: unknown;
    y?: unknown;
    homeBed?: unknown;
  }[]) {
    if (v?.fixed !== true || typeof v.id !== "string") continue;
    const def = CAST[v.id as keyof typeof CAST];
    if (!def) continue;

    // AND AN INSTITUTION HAS NO ADDRESS. The bed offer was gated on `isSecret`
    // and nothing else, so you could give the Menace the spare room: she would
    // never walk to it — `tickVillager` returns early on `fixed` — and `assign`
    // clears every other claim on that bed, so a real arrival could be left with
    // nowhere to move in to by a kindness. Handing the claim back is the whole
    // repair; the bed becomes free again the moment it stops being spoken for.
    if (!livesSomewhere(def) && v.homeBed) v.homeBed = null;

    if (def.schedule.length !== 1) continue;
    const stop = def.schedule[0];
    if (stop.at) continue;
    v.x = stop.x;
    v.y = stop.y;
  }
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
    typeof obj.frozen === "object" &&
    typeof obj.under === "object" &&
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
