// What a room says about itself when you ask it (Phase 9a, sim/history.ts).
//
// REGISTER: flat, factual, past tense, second person. A room is not a character
// and must not be given a voice — the moment a building is wry about its own
// past, the game has one more personality in it than it has creatures, and the
// deadpan stops being deadpan. These read like the museum's placards with the
// jokes taken out, which is the correct amount of ceremony for a floor.
//
// ONE LINE PER KIND, DELIBERATELY. Every other bank in this game is a pool that
// selection picks from, because a creature that says the same sentence twice is
// a creature that has stopped being alive. A room is the opposite: it is a
// record, and a record that phrases itself differently each time you open it is
// a record you stop trusting. Tap the same house twice and it says the same
// thing, because the same thing is true.
//
// WHAT IS NOT HERE: any line that names a task, carries a target, or implies
// there is more to collect. A room reads its own past and never sets a future
// (DESIGN §"A place keeps a history"; §Errands notices: past tense, no task).

// KEYED BY PLAIN `string`, NOT BY `HistoryNoteKind`. Content is the innermost
// layer and imports nothing from sim (CLAUDE.md §Architecture) — the same
// reason RESIDENT_HOME in dialogue.ts is keyed by string rather than by
// HomeNoteKind. The correspondence is real and it is pinned in
// sim/history.test.ts instead, in both directions: a new note kind with no line
// fails, and a line for a kind that doesn't exist fails too. Dead content is
// how a bank stops being trustworthy.

/** `who` is a villager's name, already resolved. `when` is a season noun, or
 *  empty when it began in the season we are still in — every line below has to
 *  read correctly both ways, which is why the clause is inside the template and
 *  not glued on outside it. */
export const HISTORY_LINES: Record<string, (who: string, when: string) => string> = {
  met: (who, when) =>
    when
      ? `This is the room where you first met ${who}, back in ${when}.`
      : `This is the room where you first met ${who}.`,

  sleeper: (who, when) =>
    when ? `${who} has slept here since ${when}.` : `${who} sleeps here.`,

  // Past tense and nothing more. Somebody moving out is not a loss to be
  // commented on, and a room that sounded wistful about it would be the game
  // telling the player they had done something wrong by rehousing a friend.
  past_sleeper: (who, when) =>
    when ? `${who} slept here, in ${when}.` : `${who} slept here.`,

  built_floor: (_who, when) =>
    when ? `You laid these boards yourself, in ${when}.` : `You laid these boards yourself.`,

  // The four below are the ground's own past leaking into a room built on top
  // of it later — you dig and plant on open land, and the walls come after. They
  // fire rarely and they are the best thing in here when they do: a kitchen that
  // remembers being a carrot patch.
  dug: (_who, when) =>
    when ? `This ground was turned over by hand, in ${when}.` : `This ground was turned over by hand.`,

  gathered: (_who, when) =>
    when
      ? `Something was standing here, in ${when}, until you took it down.`
      : `Something was standing here until you took it down.`,

  planted: (_who, when) =>
    when ? `Something was planted in this ground, in ${when}.` : `Something was planted in this ground.`,

  harvested: (_who, when) =>
    when ? `Something was pulled up out of here, in ${when}.` : `Something was pulled up out of here.`,
};
