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
  | "built_floor" // saw the player lay floorboards
  | "dug" // saw the player dig
  | "gathered" // saw the player fell a tree or split a rock
  | "planted"
  | "harvested"
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
  | "hum"
  // --- Moments (DESIGN §Moments) ---------------------------------------------
  //
  // These two are not things you DID. Everything above is an action with an
  // audience — you laid the boards, you ran the errand, you walked them out to
  // the cube. A Moment is a configuration of the world that happened to be true
  // while somebody was standing next to you, and the only reason it is worth
  // remembering is that they were there for it too.
  //
  // That difference is why `sim/moments.ts` writes these itself rather than
  // calling `witness`: `witness` befriends whoever was present, because doing a
  // job together is how friendship grows here, and a Moment is not a job. It
  // also cannot be, mechanically — a Moment is evaluated on a repeating sweep
  // rather than at the instant of an action, so paying friendship for one would
  // pay it again every half second for as long as the sky kept doing that.
  //
  // A meteor shower you were both outside for. Five real nights a year on the
  // real calendar (content/showers.ts), so the value is WHICH one, and this is
  // deliberately NOT in `oneShot` for exactly the reason `festival` isn't: each
  // night is its own night, and de-duplicating by kind would mean the first one
  // you ever stood out for was the last one anybody noticed.
  | "shower"
  // The day you took somebody past where the survey stops (sim/notebook.ts's
  // `FAR_OUT`). In `oneShot`: the edge of the arranged world is somewhere you
  // have either been together or you haven't, and the second trip is the same
  // fact — the same call `hum` makes about the same kind of walk.
  | "far_out"
  // The year the two of you were outside when the cold came. Not rare — it comes
  // round for everybody, every year — and it is here because it is the only
  // Moment you can have without going anywhere. The value is the YEAR, so this
  // is out of `oneShot` on the `festival` argument: each winter is its own
  // winter, and collapsing them by kind would mean the first one was the last
  // one anybody noticed.
  //
  // Its journal half (`the-cold-came`, content/notebook.ts) is the only one that
  // had to be written; the other two Moments reuse field notes that already
  // existed. And there is NO SNOW in it, on purpose — see that entry.
  | "winter_came"
  // --- Games (sim/play.ts) ----------------------------------------------------
  //
  // A game of hide and seek that reached its end, and an I Spy that did. Two
  // kinds rather than one with a value, on `delved`/`climbed`'s argument: they
  // are two different afternoons and a form's bank should be able to have a
  // line for one and not the other. No value, on festival.ts's lesson — a
  // value renders straight into a dialogue template, and there is nothing
  // here to render. Written by `endPlay` to the ONE person who played, never
  // through `witness`: a game is not news and not a job.
  //
  // Not in `oneShot` — each day's game is its own game — but de-duplicated
  // per CALENDAR DAY by `endPlay` itself, so an afternoon of forty rounds is
  // one remembered afternoon rather than a flooded ring. Giving up files
  // nothing at all.
  | "hid"
  | "spied"
  // Something the player SAID, in a conversation tree (Phase 12 tranche 2).
  // The value is a keepsake clause — "that you like a wandering day" — written
  // by `advanceReply` when a reply carries one, and read back through the
  // ordinary memory rung like everything else, so three weeks later somebody
  // brings up what you told them. The only memory kind the player authors with
  // words rather than with work.
  //
  // Not in `oneShot` — different answers are different memories — but
  // de-duplicated by VALUE below: giving the Dog the same answer every morning
  // is one remembered fact, not sixty-four copies of it crowding out his log.
  | "answered";

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
  const oneShot: MemoryKind[] = ["built_floor", "dug", "planted", "arrived", "housed", "raised_by", "raised_favorite", "hum", "far_out"];
  if (oneShot.includes(ev.kind) && log.some((m) => m.kind === ev.kind)) return log;
  // An answer is one-shot PER ANSWER: the same words again are the same fact.
  if (ev.kind === "answered" && log.some((m) => m.kind === ev.kind && m.value === ev.value)) return log;
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
