// The season, for everything above content.
//
// Thin on purpose. `seasonOn` is a lookup by date and lives in content beside
// the table (the `festivalOn` arrangement, and for the same reason); this file
// re-exports it and adds the two things that need to know about the world as
// well as the calendar.
//
// `now` IS ALWAYS THREADED, never read off the clock in here. Same rule the
// Cosmos's five nights follow — it is what lets a test stand in October in the
// middle of July, and what keeps sim deterministic (CLAUDE.md §Architecture).
//
// WHAT MAY IMPORT THIS: the renderer (one draw flourish) and sim/dialogue.ts
// (one line), plus sim/away.ts for the adjective on the ripening line. Nothing
// that decides anything — not a price, not a growth time, not an acceptance
// test. If you are here to ask "is it the right month to allow X", the answer is
// that X is allowed in every month (DESIGN §Seasons).

import { cropDef, type CropId } from "../content/crops";
import type { SeasonDef, SeasonId } from "../content/seasons";
import { seasonOn } from "../content/seasons";
import type { WorldState } from "./types";

export { seasonOn };
export type { SeasonDef, SeasonId };

/** The season this moment falls in. Total — every month belongs to exactly one,
 *  so callers never branch on absence. */
export function seasonAt(now: number): SeasonDef {
  return seasonOn(now);
}

/** Is this variety in its own month?
 *
 *  THE ONE PLACE THE MATCH IS DECIDED. The renderer asks; it does not compare
 *  months, and neither does the dialogue rung. Two callers computing "is it
 *  October" separately is how the flourish and the line end up disagreeing about
 *  the same plant — the same instinct as "the reticle is the promise", applied
 *  to a look instead of to a verb.
 *
 *  False for the carrot, the radish, the potato and wheat in all twelve months:
 *  they belong to no season, and that is a property of the crop, not a gap. */
export function inSeason(id: CropId, now: number): boolean {
  return seasonAt(now).crop === id;
}

/** What is worth remarking on about the month. `sim/home.ts`'s shape: a pure
 *  read of live state turned into a small vocabulary, so the banks in content
 *  stay line pools and the SELECTION stays in sim/dialogue.ts. */
export type SeasonNoteKind = "in_season_crop" | "season";

export interface SeasonNote {
  kind: SeasonNoteKind;
  season: SeasonId;
  /** The noun that lands in the line — the crop's name, or the season's. */
  value: string;
}

/** The note a villager could speak right now.
 *
 *  `in_season_crop` ONLY when there is one of that variety actually in the
 *  ground somewhere. A villager who tells you the pumpkins are in when you have
 *  never planted a pumpkin is the town describing a screenshot — and it is the
 *  same rule the home banks follow, where a note is only offered if the thing it
 *  is about exists. Otherwise the season itself, which is always true. */
export function describeSeason(world: WorldState, now: number): SeasonNote {
  const season = seasonAt(now);
  if (season.crop && planted(world, season.crop)) {
    // The crop's own name, lowercased, so it reads inside a sentence. Banks
    // interpolate this exactly the way the festival banks interpolate a
    // festival's name.
    return { kind: "in_season_crop", season: season.id, value: cropDef(season.crop).name.toLowerCase() };
  }
  return { kind: "season", season: season.id, value: season.name };
}

/** Is any plot growing this variety? Any stage counts, not just ripe: the line
 *  is "it's the month for these", which is as true of a seedling. */
function planted(world: WorldState, id: CropId): boolean {
  for (const key of Object.keys(world.crops)) {
    if (world.crops[key]?.cropId === id) return true;
  }
  return false;
}
