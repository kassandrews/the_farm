// The rules that apply to EVERY spoken line, swept across every bank at once.
//
// The individual guards already existed and each covered one table: seasons may
// not instruct (dialogue.test.ts), the Notebook may not promise weather or name
// wildlife (notebook.test.ts), a Moment may not mention snow (moments.test.ts),
// a conversation reply may not carry a payout (conversations.test.ts). Each was
// written the day its own bank was, and each stopped at that bank's edge.
//
// Phase 12 roughly tripled the number of lines in the game and added five new
// banks, which is exactly the condition under which a per-table guard quietly
// stops covering most of the content. So this sweeps the lot. The word lists
// are COPIED FROM the existing tests on purpose — two guards that disagree
// about what counts as weather are worse than one guard, because the first
// false negative teaches everybody to stop trusting them.

import { describe, it, expect } from "vitest";
import {
  OFFICE_LANDCLAIM,
  OFFICE_IDLE,
  OFFICE_MEMORY,
  RESIDENT_IDLE,
  RESIDENT_MEMORY,
  RESIDENT_HOME,
  RESIDENT_HISTORY,
  RESIDENT_WARM,
  RESIDENT_KIN,
  RESIDENT_ABSENCE,
  RESIDENT_MIDST,
  RESIDENT_SEASON,
  COMPANY_YES,
  COMPANY_IDLE,
  COMPANY_BYE,
  MOLE_DEEP,
  MOLE_SHALLOW,
  MOLE_LIT,
  GHOST_QUIET,
  GHOST_CUT,
  COSMOS_HOME,
  SCHOLAR_DISSENT,
} from "./dialogue";
import { CONVERSATIONS } from "./conversations";
import { ARRIVALS } from "./arrivals";

/** A placeholder for any template's value. Deliberately bland: the guard is
 *  about the AUTHORED words around the hole, not about what lands in it. */
const V = "a thing";

/** Every spoken line in the game, flattened, each tagged with where it lives so
 *  a failure names the bank rather than just the sentence. */
function everyLine(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, v: unknown): void => {
    if (typeof v === "string") out.push({ where, text: v });
    else if (typeof v === "function") out.push({ where, text: (v as (...a: string[]) => string)(V, V) });
    else if (Array.isArray(v)) v.forEach((x, i) => add(`${where}[${i}]`, x));
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) add(`${where}.${k}`, val);
    }
  };

  add("OFFICE_LANDCLAIM", OFFICE_LANDCLAIM);
  add("OFFICE_IDLE", OFFICE_IDLE);
  add("OFFICE_MEMORY", OFFICE_MEMORY);
  add("RESIDENT_IDLE", RESIDENT_IDLE);
  add("RESIDENT_MEMORY", RESIDENT_MEMORY);
  add("RESIDENT_HOME", RESIDENT_HOME);
  add("RESIDENT_HISTORY", RESIDENT_HISTORY);
  add("RESIDENT_WARM", RESIDENT_WARM);
  add("RESIDENT_KIN", RESIDENT_KIN);
  add("RESIDENT_ABSENCE", RESIDENT_ABSENCE);
  add("RESIDENT_MIDST", RESIDENT_MIDST);
  add("RESIDENT_SEASON", RESIDENT_SEASON);
  add("COMPANY_YES", COMPANY_YES);
  add("COMPANY_IDLE", COMPANY_IDLE);
  add("COMPANY_BYE", COMPANY_BYE);
  add("MOLE_DEEP", MOLE_DEEP);
  add("MOLE_SHALLOW", MOLE_SHALLOW);
  add("MOLE_LIT", MOLE_LIT);
  add("GHOST_QUIET", GHOST_QUIET);
  add("GHOST_CUT", GHOST_CUT);
  add("COSMOS_HOME", COSMOS_HOME);
  add("SCHOLAR_DISSENT", SCHOLAR_DISSENT);

  // Conversation trees: the villager's side only. Player replies are the
  // player's own voice and are checked in conversations.test.ts.
  for (const [form, contexts] of Object.entries(CONVERSATIONS)) {
    for (const [ctx, roots] of Object.entries(contexts ?? {})) {
      const walk = (where: string, ex: { line: string; replies?: { then: unknown }[] }): void => {
        out.push({ where, text: ex.line });
        (ex.replies ?? []).forEach((r, i) =>
          walk(`${where}→${i}`, r.then as { line: string; replies?: { then: unknown }[] }),
        );
      };
      (roots ?? []).forEach((root, i) => walk(`CONVERSATIONS.${form}.${ctx}[${i}]`, root));
    }
  }

  // And each arrival's own lines and beats.
  for (const a of ARRIVALS) {
    add(`ARRIVALS.${a.name}.lines`, a.lines ?? []);
    add(`ARRIVALS.${a.name}.tentLine`, a.tentLine);
    add(`ARRIVALS.${a.name}.housedLine`, a.housedLine);
    add(`ARRIVALS.${a.name}.filing`, a.filing);
  }
  return out;
}

describe("every line in the game, whoever says it", () => {
  it("covers every bank — the sweep itself has to be worth trusting", () => {
    // A guard that silently stopped reading half the content is worse than none,
    // and the way this one would break is somebody adding a bank and not adding
    // it above. The floor is a smoke alarm, not a target.
    const lines = everyLine();
    expect(lines.length).toBeGreaterThan(600);
    expect(lines.every((l) => typeof l.text === "string")).toBe(true);
  });

  it("never sets a task", () => {
    // The rule the whole game turns on: nobody may hand you an objective. It is
    // the Notebook's rule (§"It reads its own past and never sets a future"),
    // the notices column's rule, and the seasons rule, and it applies just as
    // hard to somebody saying it out loud in the plaza.
    for (const { where, text } of everyLine()) {
      expect(text, `${where} sets a task: "${text}"`).not.toMatch(
        /\b(you must|you should|you need to|you ought|you'll want|remember to|don't forget|make sure|in order to|time to plant|better plant)\b/i,
      );
    }
  });

  it("promises no weather, because there isn't any", () => {
    // Copied from notebook.test.ts, including its reasoning about CLOUD: the
    // sky is a place you can stand on, so the word is legitimate. Winter is a
    // colour temperature (content/seasons.ts), so "cold" is fine and "snow" is
    // the bug — a villager reminiscing about snowfall sends the first player
    // who goes looking for it to find nothing.
    for (const { where, text } of everyLine()) {
      expect(text, `${where} promises weather: "${text}"`).not.toMatch(
        /\b(rain|rains|rained|raining|snow|snows|snowed|snowing|sleet|hail|storm|storms|blizzard)\b/i,
      );
    }
  });

  it("mentions no animal you could go and look at", () => {
    // Same list as notebook.test.ts, same reason: the rule is "may not name
    // wildlife that is not there". A firefly stays off the list because a
    // firefly is somewhere you can actually go and see one.
    for (const { where, text } of everyLine()) {
      expect(text, `${where} mentions wildlife: "${text}"`).not.toMatch(
        /\b(bird|birds|owl|owls|fish|insect|beetle|butterfly|moth|frog|deer)\b/i,
      );
    }
  });

  it("never spoils a secret by naming it in ordinary conversation", () => {
    // Secrets are never spoiled by UI or by mouth (CLAUDE.md §Tone). The three
    // secret characters speak from their OWN banks about their own business;
    // nobody in the town may name them, because the town has never heard of
    // them (DESIGN §"the one person the town has never heard of").
    const townside = everyLine().filter(
      (l) => !/^(MOLE_|GHOST_|COSMOS_)/.test(l.where),
    );
    for (const { where, text } of townside) {
      expect(text, `${where} names a secret: "${text}"`).not.toMatch(
        /\b(the mole|malcolm|the quiet ghost|the stray cosmos)\b/i,
      );
    }
  });
});
