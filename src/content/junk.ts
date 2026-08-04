// Junk — what the ground turns up, and the Gremlin's entire economy.
//
// DESIGN §Materials: junk is FOUND, never gathered, and is not a fourth
// material. Nothing is built out of it and nothing costs it to place. It is
// the third thing the town will take off your hands (§"payable from materials
// and produce, and later from junk"), and that is its whole job.
//
// WHY DIGGING. Digging was the one verb in the game that yielded nothing at
// all, and it is also the verb the pillars protect most fiercely — terraforming
// is free, uncapped, and never blocked. So a find that rides on digging can
// never become a grind: there is no swing budget to spend and no cooldown to
// wait out. You dig because you're shaping your land, and sometimes the land
// has something in it.
//
// It is deliberately NOT a per-swing dice roll. What's buried where is a total
// function of (seed, x, y), exactly like where the trees are — a given town's
// ground is a real, stable place. Dig the same tile twice and there is nothing
// the second time, because `canDig` only accepts grass and dug dirt can't be
// re-dug, and because a find only fires on ground nobody has turned before.

/** Roughly what fraction of virgin diggable ground has something under it.
 *
 *  Higher than the rock density (0.035) on purpose: a dig is one deliberate tap
 *  on one tile, where a forest hands you eight wood for the same gesture. About
 *  one turned tile in seven pays out, which is often enough to feel like the
 *  ground is worth turning and rare enough that it stays a small event. */
export const JUNK_DENSITY = 0.15;

/** What you actually pulled out, said once, at the moment you pull it out.
 *
 *  These are FLAVOUR, not items. The satchel holds "junk" and only ever holds
 *  "junk" — the specific object exists for exactly as long as the toast does,
 *  which is why this table costs no schema and no inventory complexity. It is
 *  the same trick as finishes: the variety is free because it isn't carried.
 *
 *  House voice — flat, incurious, faintly institutional about it. The joke is
 *  never "look at this wacky object", it is the total absence of surprise. */
export const JUNK_FINDS: string[] = [
  "A doorknob ... No door. It goes in the satchel.",
  "Half a sign. The half that was saying something.",
  "A spoon, bent the wrong way round. Someone worked at this.",
  "A hinge. Still hinges. Nothing to hinge.",
  "A key ... You will not find the lock. Nobody has.",
  "Somebody's boot. One. The ground keeps the other one.",
  "A cog, from a thing this town has never had.",
  "A bell that does not ring any more. It is very committed to that.",
  "A tin with a tin inside it. The inner tin is empty.",
  "A length of wire, coiled by someone who cared about coiling.",
  "A cup with the handle on the inside. It was made this way.",
  "A small brass plaque, worn blank. It commemorates something.",
];

/** How much of the deep rock has something in it. Lower than the lawn's 0.15
 *  and that is not a nerf — a cut face is one tap the same as a dig, but a
 *  tunnel is a line of them, so the same density would pay out steadily as you
 *  walked. One face in twelve keeps it an event rather than a conveyor.
 *
 *  Note what does NOT scale with distance: this. Depth decides *whether* the
 *  rock has anything (sim/junk.ts §DEEP_FIND_DEPTH), never how much — a number
 *  that climbs the further out you go is a payout curve, and a payout curve is
 *  a score you are meant to beat (ROADMAP §"No 'deepest reached' counter"). */
export const DEEP_JUNK_DENSITY = 0.085;

/** The same joke, older. These come out of rock rather than out of a lawn, so
 *  nothing here is a spoon or a boot — it is all things that were down there
 *  before the town was, described with the same total lack of surprise.
 *
 *  A separate table rather than a shared one because the fiction is doing real
 *  work: finding somebody's bent cutlery thirty tiles into solid stone would
 *  quietly say the underground is just more lawn. */
export const DEEP_FINDS: string[] = [
  "A tooth. Too big. You put it in the satchel and think about something else.",
  "A coin, from no mint. The face on it is having a lovely time.",
  "A nail as long as your arm. It was holding something.",
  "A jar, sealed, empty, and dry inside. That took some doing.",
  "A hand tool with no handle, for a hand that isn't shaped like yours.",
  "A tile with a pattern on it. The pattern continues into the rock.",
  "A ring of iron, and the rock has grown round it politely.",
  "Rope. It has been down here longer than rope lasts.",
  "A little carved thing. It is a carving of a little carved thing.",
  "A lamp, cold, with oil still in it. The oil is fine. You are not asked why.",
];
