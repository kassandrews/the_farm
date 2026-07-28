// The errands board — the requests pinned to it, and the notices beside them.
//
// ROADMAP settled the shape: a request board AND a notices column, one request
// open at a time, no timer, refusable, paying friendship and a line and never
// an item. It is sim/commission.ts's beat scaled down to an afternoon — the
// commission asks once per arrival and is a building project, this is the
// everyday version, and it is the first place friendship is earned by doing
// rather than by talking.
//
// THE ASK IS A TAGGED UNION WITH ONE MEMBER. That looks like ceremony today and
// is not: "go and stand near somebody" and "have something planted" are both
// obvious second variants, and the difference between adding one later and
// reshaping every live save's open request is this type existing now.
//
// AN ERRAND NEVER PAYS AN ITEM. Not a material, not produce, not a finish, not
// an unlock. The Menace trades, the Gremlin redeems, the Carrot stocks, the
// Office Creature stamps — a fifth counter that also handed things over would
// undercut all four, and a request you complete for goods is a job. What you
// get is that somebody wanted something and now has it.
//
// WHAT A NOTICE MAY SAY, which is the whole defence against the risk ROADMAP
// flagged (the notices column reading as a second to-do list): a notice states
// something that HAS ALREADY HAPPENED, or something that is simply true about
// the town. It may not name a thing for the player to do, carry a count, a
// target, or a completion state, or read the satchel. Hence the signature
// below — a notice is handed the world and returns a sentence, and there is
// nowhere for it to put a number even if somebody wanted to.

import type { ItemId } from "./items";

export type ErrandId =
  | "soup"
  | "shelf-again"
  | "the-good-stone"
  | "something-orange"
  | "kindling"
  | "a-cloth-matter"
  | "the-tin"
  | "for-the-window"
  | "mushroom-question"
  | "root-vegetable-urgent";

/** What a request wants. One member today — see the header. */
export type ErrandAsk = { kind: "items"; item: ItemId; count: number };

export interface ErrandDef {
  id: ErrandId;
  ask: ErrandAsk;
  /** The card as pinned, in the Dog Thing's hand. `{who}` is the asker's name.
   *
   *  He is relaying, not composing, and it shows: he writes down what he was
   *  told with the care of someone who does not entirely follow it, and adds
   *  nothing of his own except the occasional stray fact about the weather. */
  card: string;
  /** What he says when you hand it over. Delighted, briefly, then back to work. */
  thanks: string;
  /** The past-tense trace it leaves on the notices column afterwards. Optional:
   *  not every errand is worth a notice, and a board where every completed
   *  request left a line would be a log of your own activity, which is a score
   *  sheet with the arithmetic left to the reader. */
  echo?: string;
}

/** The requests, as rows.
 *
 *  COUNTS ARE 1–4. An errand is an afternoon and often a pocket-check — the
 *  point is that you can usually say yes on the spot, and occasionally have to
 *  go and get one more. A row asking for twelve of something would be a
 *  commission without the house.
 *
 *  ASKS ARE RESTRICTED TO WHAT YOU CAN ACTUALLY GET. No `ore` row: ore is
 *  deliberately unobtainable until the underground layer exists (ROADMAP §Known
 *  gaps), and a board that asked for it would be the town setting a task that
 *  cannot be done. Seed is likewise absent — a request payable in seed is
 *  farming's prerequisite pointed at the player, the same trap content/
 *  seedstall.ts documents avoiding. */
export const ERRANDS: ErrandDef[] = [
  {
    id: "soup",
    ask: { kind: "items", item: "carrot", count: 3 },
    card: "{who} is making a soup and has reached the part of the recipe that requires carrots. Three. ... The recipe says three. I did ask.",
    thanks: "Three carrots. ... I'll run them over. It's on my way. Everything is on my way.",
    echo: "The soup happened. Reports on the soup are mixed and mostly from the cook.",
  },
  {
    id: "shelf-again",
    ask: { kind: "items", item: "wood", count: 4 },
    card: "{who} would like four wood. It is for a shelf. ... It is for the same shelf as last time. I have not asked what happened to the first one.",
    thanks: "Four wood. ... Straight to the shelf. Or to wherever the shelf has got to.",
    echo: "The shelf is up. It is not level. Nobody has raised this.",
  },
  {
    id: "the-good-stone",
    ask: { kind: "items", item: "stone", count: 3 },
    card: "{who} wants three stone. Not any particular three. ... I mentioned that stone is largely interchangeable and was told to write the card.",
    thanks: "Three stone. ... They'll be pleased. They will not say so, but they'll be pleased.",
  },
  {
    id: "something-orange",
    ask: { kind: "items", item: "junk", count: 2 },
    card: "{who} is after two pieces of junk. Any junk. ... I did press for detail. The detail was 'you'll know it when you find it', which is not a detail.",
    thanks: "Two. ... Perfect. Whatever they are.",
    echo: "Something was assembled out of junk this week. It stands in a garden. It is doing well.",
  },
  {
    id: "kindling",
    ask: { kind: "items", item: "wood", count: 2 },
    card: "{who} needs two wood by this evening. It is not urgent. ... They said it was not urgent four separate times, which I have noted here.",
    thanks: "Two wood, not urgently. ... I'll take it at a walk, as instructed.",
  },
  {
    id: "a-cloth-matter",
    ask: { kind: "items", item: "cloth", count: 2 },
    card: "{who} requires two cloth for a matter they described as private. ... I stopped taking notes at that point, out of respect and because I had run out of card.",
    thanks: "Two cloth. ... I won't ask. I've been asked not to ask.",
    echo: "A private matter concluded satisfactorily. That is all anyone is prepared to say.",
  },
  {
    id: "the-tin",
    ask: { kind: "items", item: "junk", count: 1 },
    card: "{who} lost something and would like a replacement, and has agreed that any junk will do as a replacement. ... This is a compromise. Everyone involved is aware it is a compromise.",
    thanks: "That'll do it. ... It's not the original. It's been agreed that it doesn't have to be.",
  },
  {
    id: "for-the-window",
    ask: { kind: "items", item: "mushroom", count: 2 },
    card: "{who} wants two mushrooms for the windowsill. Not for eating. ... I checked. I checked twice, because of last time.",
    thanks: "Two mushrooms, for the windowsill, not for eating. ... I'll say it again when I hand them over.",
    echo: "There are mushrooms on a windowsill in town. They are decorative. This has been clarified.",
  },
  {
    id: "mushroom-question",
    ask: { kind: "items", item: "radish", count: 2 },
    card: "{who} would like two radishes. They were very specific that radishes are not a substitute for anything and are simply what is wanted.",
    thanks: "Two radishes, wanted for themselves. ... Rare, that. Most things are wanted for something else.",
  },
  {
    id: "root-vegetable-urgent",
    ask: { kind: "items", item: "potato", count: 2 },
    card: "{who} requests two potatoes. ... There was a long pause after they said it, and I have chosen not to write down what I think the pause meant.",
    thanks: "Two potatoes. ... I'll deliver them without comment. That was the arrangement.",
  },
];

export function errandDef(id: ErrandId): ErrandDef {
  return ERRANDS.find((e) => e.id === id) ?? ERRANDS[0];
}

// --- The notices column ---------------------------------------------------------

/** The world a notice is allowed to look at.
 *
 *  Structural and DELIBERATELY NARROW. It is the past tense of the town: what
 *  has been donated, who has moved in, which varieties the stall carries, which
 *  errands have been run. There is no inventory in this type and no open
 *  request, which is what makes "a notice cannot set you a task" a fact about
 *  the code rather than a promise in a comment — a notice literally cannot see
 *  what you are carrying or what you have been asked for. */
export interface NoticeWorld {
  museum: { donated: { id: string; placard: number }[] };
  seeds: { unlocked: string[] };
  villagers: { id: string; name: string }[];
  errandsDone: number;
}

/** A notice: the town, in, and a sentence out. Null means its subject hasn't
 *  happened yet and the notice simply isn't up. */
export type NoticeFn = (w: NoticeWorld) => string | null;

/** The column.
 *
 *  Two of these are STANDING notices that are always up and always absurd, and
 *  they are what stop the column from being a status readout: the board is a
 *  piece of town furniture with bureaucracy on it, not a feed. The rest are
 *  derived from things that have already occurred, so the column changes as the
 *  town does without anybody storing a "notices" list.
 *
 *  Ordering is fixed rather than random. A notice board that reshuffles every
 *  time you read it is a board you have to re-read, which is the to-do-list
 *  failure arriving by a side door. sim/errands.ts caps how many show. */
export const NOTICES: NoticeFn[] = [
  // --- Standing -------------------------------------------------------------
  () =>
    "LOST PROPERTY. One item, description withheld at the owner's request. Enquire at the board. The board cannot answer enquiries.",
  () =>
    "MINUTES of the meeting of the fourteenth are available. The meeting of the fourteenth was not attended. The minutes are thorough.",

  // --- Derived, all past tense ----------------------------------------------
  (w) => (w.museum.donated.length > 0 ? "A new card is up at the museum. The curator stands by it. She stands by all of them." : null),
  (w) =>
    w.museum.donated.some((d) => d.placard > 0)
      ? "A card at the museum has been revised. The previous reading is no longer available for comparison."
      : null,
  (w) => (w.seeds.unlocked.length > 1 ? "The stall is carrying more than it was. The proprietor has declined to make an announcement." : null),
  (w) => {
    // Whoever moved in most recently, by name, once they exist. Reads off the
    // villager list rather than the commissions, because the notice is about
    // somebody being here — which is true whether or not the paperwork closed.
    const newcomer = [...w.villagers].reverse().find((v) => v.id.startsWith("newcomer:"));
    return newcomer ? `${newcomer.name} is now resident and has been added to the relevant lists. There are four relevant lists.` : null;
  },
  (w) => (w.errandsDone > 0 ? "Thanks have been recorded. They have been recorded in the correct place, which nobody visits." : null),
];
