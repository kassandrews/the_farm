# The Farm — Roadmap

`DESIGN.md` is what the game **is**. This file is what order we **build** it,
what's already done, and — most importantly — the design decisions we've
already settled and why, so they don't get relitigated.

When a decision here conflicts with DESIGN.md, DESIGN.md wins and this file
gets corrected. When a *new* decision is made, record it here (or amend
DESIGN.md, if it's a rule about the game rather than about build order).

---

## Where we are

**Done:**

- **The vertical slice** (all seven DESIGN.md items) — chunked tilemap, camera,
  tap-to-move, homestead + tent, dig/place, the carrot on a real clock, the
  Office Creature's land-claim beat, a villager on a schedule, day/night tint,
  versioned saves + the Meadow import adapter.
- **Six audit discrepancies** where the code didn't match the docs — real chunk
  streaming, embodying an imported pet, an away simulation that genuinely
  changes the world, daily (clock-driven) routines, friendship that reads
  through dialogue, and the audio module.
- **Phase 1 — Materials & gathering** (see the model below).
- **Phase 2a — real structures, complete.** The raised pass (things stand up and
  overhang), the structure layer (walls, doors, build mode), rooms + derived
  roofs with the cutaway, and furniture. See below.
- **Phase 2b — housing, steps 1–3 of 5.** Villagers path around walls; the town
  has authored buildings; and home is now a claim on a bed rather than a
  coordinate. See below.
- **Phase 2c — undo, complete.** `sim/undo.ts`, one level, in memory, no schema
  change. Pulled AHEAD of 2b step 4 — see below for why.
- **Phase 2b step 4 — assignment, complete.** `sim/assign.ts`: `qualify` is the
  acceptance test, offered in conversation, and a moved bed keeps its sleeper.
- **Phase 2b step 5 — they comment on it, complete.** `sim/home.ts` reads a
  villager's home through `qualify()` and hands the banks a small vocabulary.
  **Phase 2 is done.**
- **Phase 3a — the two door gaps, complete.** A door in a side wall now reads
  (roof notch + a doorstep on the ground), and build mode says so when a doorway
  has nothing to stand on.
- **Phase 3b — commissioned housing, complete.** The flagship beat is playable:
  somebody arrives, pitches a tent, and moves into the house you give them. It
  is also the award path for finishes — `whitewash` is now obtainable.
- **Phase 3c — taste, complete.** Forms are quietly pleased by particular
  finishes and furniture, and say so. Delight only; there is no way to express
  the opposite.
- **Phase 3d — the shop, complete.** Barter at the Menace's counter, cloth, and
  soft furniture that costs it.
- **Phase 3e — the junk economy, complete.** The ground has things in it,
  digging finds them, and the Gremlin's heap turns them into finishes.
- Menu with New town / sound toggle; PWA shell; 379 tests.
- **Phase 3f — the museum, complete.** The table, the sim, schema v12, the
  gallery it stands in (v13), Corrigal's panel, the away event, and Margfrom's
  perk. Two wings, donation is a gift that returns nothing, the record has no
  total and no denominator, and an exhibit physically appears on a case when you
  give it. **It is playable:** talk to her, hand something over, read the card
  she writes, walk out past it — come back to find she has revised it, and hear
  the scholar down the road say the card is wrong and she has written her own.
- **Phase 3g — the seed stall, complete.** Farming has choices in it: one
  fungible seed, three varieties unlocked forever at the Blessed Carrot's
  counter, and a harvest that hands a seed back so a plot you keep sustains
  itself. Schema v14.
- **Phase 3h — the errands board, complete.** The Loyal Dog Thing keeps a board
  in the plaza: one request at a time, refusable at no cost, paying friendship
  and a line and never an item, plus a notices column that only speaks in the
  past tense. Schema v15. He is the one institution that MOVES — a delivery
  round, clock-derived like every other schedule — which is why the board is
  readable with nobody at it (the new `read` context action).

- **Phase 3i — the plaza stage, complete.** The last institution. Twelve
  festivals, one per calendar month, derived entirely from the date; the town
  gathers in front of a platform in the plaza while the counters stay open; the
  Dramatic Blob rehearses on the other three hundred and fifty-three days and
  his conversation is the programme. Being there is remembered by the people who
  were there; missing one costs nothing and turns up in the postcard instead.
  Schema v16, which adds **no field** — its whole body is the stamp.
  **Phase 3's cast is done: all seven institutions exist.**

- **Phase 4a — the underground, complete.** The layer axis, descent, ore and
  slate, and — step 4 — the deep rock having things in it and somebody living
  in it. You tunnel out until you break into a corridor you didn't cut, follow
  it round to a chamber, and meet the one person in the game the town has never
  heard of. He digs a little of your tunnel while you're out, and if you sink a
  shaft over his head to shorten the walk, he says so.

- **Phase 4b — company, complete.** You can ask somebody to come with you, and
  they walk with you until their own day ends. One slot, no party, no payout, no
  cooldown on a goodbye; the six counters stay at their counters and the Dog
  Thing doesn't. They follow you down the shaft, and somebody who was in the
  tunnel when you cut it is the only person who remembers you cutting it — which
  is the proximity model 4a left open. Schema v20.

- **Phase 4c — secrets, complete.** All three of the ones that were left. A dark
  grove forty tiles out, holding the last unobtainable finish and — after dark —
  the Quiet Ghost, who gives you nothing; a cube in a field that hums and does
  nothing at all; and the Stray Cosmos, who turns up on your own land on the
  five real meteor-shower nights of the year and is gone by morning. Schema
  stays v20: two landmarks derived from the seed, five nights derived from the
  calendar, nothing stored. The spine is `present()` — "is this villager here
  right now", which nobody had needed to ask before.

**Next:** Phase 4d — crops and seasons.

**Save schema is at v20.** Every change ships a tested migration — see
`src/sim/save.ts`. Don't break this; the game is deployed and has live saves.

---

## Settled design decisions

These took real discussion. Don't re-derive them from scratch.

### Materials — the model

Recorded in full in DESIGN.md §Materials. The short version and *why*:

- **Three gathered classes, ever: wood, stone, ore.** One "ore" entry covers
  every metal. Resisting a fourth is deliberate.
- **Appearance is a separate, free axis.** A finish (pale pine, dark walnut) is
  a property of a placed tile, *never a different item*. This is the rule that
  keeps the inventory small: item count is the number of materials (three), not
  materials × looks (dozens). It's what stops this becoming the
  eleven-kinds-of-plank inventory sprawl that makes cozy games tiring.
- **No crafting table, no recipe tree.** Placing a thing *is* making it. Animal
  Crossing's placement, not Minecraft's grid. "Crafting-tree sprawl" is on
  DESIGN's explicit not-taken list.
- **Materials are required but never rationed.** Terraforming is always free
  (the shovel is never blocked); one tree yields eight boards. You can be
  slowed for a minute, never stopped or made to grind.
- **Regrow-unless-claimed.** Felled nodes come back on the real clock, *unless*
  you've paved/tilled/built/planted on that ground — then it's yours for good
  and the node forfeits its claim. This resolves the tension between "the world
  should renew" and "your land is actually yours": the world heals where you
  aren't invested and stays exactly as you shaped it where you are.
- **Soft goods (cloth, cushions, curtains) are deliberately NOT gatherable.**
  The shop sells what you can't gather — that's what gives the Menace's counter
  a reason to exist, and it keeps the gathered set at three.

### Structures — the model

Recorded in full in DESIGN.md §Structures. The short version and *why*:

- **3/4 oblique, not flat and not isometric.** Not really a free choice — the
  vendored Meadow sprites are front-facing, so the world has to meet them. The
  renderer already drew creatures front-on over straight-down ground; structures
  resolve that by following the creatures.
- **One storey, not a height axis.** A storey is 24px — one and a HALF tiles.
  Sixteen was the first guess and it was wrong: standing art is drawn upward
  from its footprint, so at exactly one tile a wall overhangs nothing and reads
  as a coloured floor tile. The overhang is the height cue. See DESIGN.
- **Two layers, not one tilemap.** Ground (`overrides` + chunk gen) is untouched;
  structures live in a new sparse `world.build` keyed `"x,y"`. The whole chunk
  streaming system stays as-is and the migration is purely additive.
- **Roofs are derived from enclosure, never placed.** No roof item, no roof cost.
  The flood-fill that produces them is the same one that answers "does this
  house satisfy the commission."
- **One wall material, autotiled** from its four neighbours. Orientation belongs
  to furniture (a bed is 1×2 and faces a way), never to walls.
- **Continuous world, roof cutaway, no interior scenes.** Consequence accepted
  on purpose: no TARDIS interiors — the footprint you build is the room you get.
- **Build mode flattens the view**, and placement moves out of the ACT button
  into it. ACT = the tile at your feet; BUILD = tap the map. This also
  structurally kills the "gathering hijacks the build tool" class of bug that
  bit us once already.

### Housing — the model

- **The verb is "give them a home", not "build them a house."** A home is any
  room that qualifies (enclosed, a door, a bed that's theirs). Building one and
  assigning an existing one are the same act with different amounts of work in
  front of them. This is what lets 2b ship housing and Phase 3 ship commissions
  without the second one rewriting the first.
- **The bed is the claim.** A villager stores the anchor key of *their* bed;
  `roomAt(bed)` is their house. No separate "this room belongs to X" record to
  drift out of sync — same reasoning as furniture keeping only its anchor and
  no occupancy map. Delete the bed and they go back to a tent and have something
  to say about it: a legible consequence, not a broken state.
- **Authored town buildings are seeded into `world.build`, not generated.** The
  plaza is generated (`baseTile` is a total function of x,y) and that's right for
  terrain, but a *moveable* generated building would need a "nothing here,
  deliberately" tombstone in the build layer, which the room flood-fill would
  then have to understand. Seeding makes a town house an ordinary build cell from
  birth: demolishable, re-finishable, extendable, for free. A house is a house
  whether the town authored it or you did.
- **The town's own buildings are demolishable like everything else.** No
  protected flag — one fewer concept, and the Office Creature reacting to you
  dismantling the town hall around him is squarely on-tone. Because the authored
  layouts live in a content table, "restore to authored layout" stays cheap to
  offer later as an Office Creature service: you un-demolish a municipal
  structure by filing a form. Phase 3 flavour, not built yet.

### The economy — barter, and why it had to be

**Settled in Phase 3d.** The old note here said "do not bake in an assumption",
and the assumption worth not baking in turned out to be that the question was
about *flavour*. It's about a pillar.

The shop sells what you can't gather (DESIGN §Materials), so something has to go
the other way. If that something were a single currency, the fastest way to earn
it would become the way you're expected to play — and produce is the obvious
earner, so "farming is fully optional" would quietly become "farm if you want
cushions". DESIGN says builder, forager and museum-filler are complete ways to
play. That's what decides it.

- **No wallet, no prices, no abstract number.** Each row in `content/shop.ts`
  lists a few things she'll take INSTEAD of each other, and you hand over one.
  Nothing accumulates, so there is nothing to optimise and no score to watch.
- **Every row must be payable from a material AND from produce.** Asserted in
  `sim/shop.test.ts`, because it is the rule above made mechanical: add a row
  that only takes carrots and the test tells you you've made farming mandatory.
  A second test asserts the world never grows a `money` field.
- **She sells cloth, not finished cushions.** Cloth is an ordinary item you
  can't gather; the soft furniture rows cost it. So the satchel, the placement
  cost model and "placing a thing IS making it" all work unchanged, and no
  furniture-inventory machinery was needed. Cloth finishes are free, like every
  other finish — the scarce thing is the stuff, never the look.
- **Stock is unlimited and never rotates.** A limited or timed stock is FOMO,
  which is pressure wearing a hat.

### Junk — found, never gathered

**Settled in Phase 3e.** DESIGN §Materials had promised junk as a third payment
axis ("payable from materials *and* produce, and later from junk") without
saying what it was. The answer had to clear one hurdle: the item table's whole
rule is that item count is the number of MATERIALS, and junk is a fourth thing
you can hold.

- **It is not a fourth material, and DESIGN now says so explicitly.** Junk is
  *found*, never gathered; nothing is built out of it and nothing costs it to
  place. Without that carve-out written down, the next person opens `items.ts`,
  counts four, and concludes the three-classes rule has already been broken —
  so the doc went first.
- **It rides on the shovel.** Digging was the one verb that yielded nothing, and
  it is also the verb the pillars protect hardest (terraforming is free and
  uncapped), which is exactly what makes a find on it safe: there is no swing
  budget and no cooldown, so it can never become a grind.
- **What's buried where is a total function of (seed, x, y)**, like the trees —
  not a per-swing roll. A given town's ground is a real place, and there is
  nothing to re-roll.
- **One item, flavoured at pickup.** What you pulled out is a line of toast at
  the moment you pull it out, and then it is simply junk. Same trick as
  finishes: variety is free because it isn't carried, and this cost no schema.
- **The Gremlin's heap gives ONLY finishes, and that is load-bearing.** His
  counter takes junk and nothing else — which would be a soft "you must dig"
  gate for anything else he could hand over. A finish is the one reward class
  that can never gate: free to apply, weightless, and invisible to every
  acceptance test in the codebase. `sim/heap.test.ts` asserts he never gives a
  material or a piece of furniture, and that no furniture row ever costs junk.
- **His stock runs out; hers doesn't.** A finish is permanent, so each row is
  redeemed once. She is a shop and unlimited; he is a pile of things somebody
  already threw away, and a pile is finite. Junk's ongoing sink is her counter.

Two things the build settled:

- **`digWithFind` owns the dig AND the payout**, because the un-farmable rule is
  entirely a rule about ORDER: the payout is decided while the ground is still
  virgin, and the dig is what ends that. Split across two calls it read fine and
  paid out on generated TREES — virgin ground, no override, and a failed dig
  writes nothing to mark the tile spent, so it was infinite junk from one
  repeated tap. Caught by writing the test, not by playing. Same shape as the
  reticle rule: when correctness depends on two things agreeing, make it one
  thing.
- **One seam left open on purpose.** `setTile` deletes an override when you
  write back exactly what generation says, so ground restored to its generated
  state reads as virgin again. Nothing the player can do reaches it (digging is
  one-way; undo covers build strokes, not ACT) — the single path is the
  Gremlin's away event moving a plank off a tile that was dug and then paved.
  Capped at one per absence, and it amounts to him having put something back in
  your ground. A `dug` set and a schema field would cost more than the bug.

### The museum — a record that isn't a score

**Settled in planning for Phase 3f**, recorded in full in DESIGN §The museum.
The short version and *why*:

- **It is the first institution that keeps a record.** The shop and the heap
  were both built to accumulate nothing, because a running total is a score. A
  museum's whole point is that it fills up, so the rule had to be stated more
  precisely rather than repeated: a collection is not a score when it has **no
  total and no denominator**. The panel lists what you have given and stops.
- **No empty slots, and that is the load-bearing part.** Show eighteen blanks
  and the museum becomes a checklist with a completion percentage implied by
  the layout. You learn what else it holds by donating. Same instinct as
  secrets never being spoiled by UI, applied to something that isn't secret.
- **Junk is identified at donation, not at pickup.** The antiquities wing runs
  on ordinary fungible junk; the curator decides what each one *was*, revealing
  the next authored exhibit. This is `content/junk.ts`'s trick pointed the
  other way — variety is free because nothing specific is ever carried — and it
  is what let the museum have a real collection **without a second carve-out
  from the three-materials rule**. Junk was allowed to be a fourth thing you
  hold only because DESIGN carved it out by name; a "specimen" item class would
  have made that rule a suggestion.
- **A nature wing takes one of each crop and gathered thing.** Finite, ~6 rows.
  Without it the museum runs entirely on digging, which would quietly make the
  shovel the museum-filler's mandatory verb — the same failure the barter table
  exists to prevent, one axis over.
- **Donation returns nothing.** Finishes-for-junk belong to the Gremlin and a
  second source undercuts him; anything else makes donating efficient rather
  than a gift. The payoff is the placard and the plinth.
- **Nothing may ever gate on the collection**, asserted in tests the way
  `heap.test.ts` asserts the Gremlin never hands over a material.

### Seeds — one item, many varieties

**Settled in planning for Phase 3g**, recorded in full in DESIGN §Materials. The
stall had to answer a question the other three counters didn't: farming shipped
with one crop and free planting, so "sells seeds" meant either inventing a seed
item per crop or inventing nothing.

- **Seed is the stuff; the variety is the look.** One fungible `seed` item, and
  which crop it becomes comes from a permanent unlock — the same two-axis trick
  as materials-vs-finishes, and as fungible junk vs. the curator's
  identification. The item table grows by exactly one row, forever. A
  `carrot_seed` / `potato_seed` table would have made "item count is the number
  of materials" a suggestion, which is what DESIGN carved junk out by name to
  avoid.
- **Varieties are redeemed once; seed is unlimited.** The heap's shape for the
  unlock rows, the shop's for the seed rows, in one stall. He is not a pile.
- **A harvest always returns seed.** The one line that keeps a consumable seed
  from being a ration. Without it the stall becomes a tollgate you pass through
  every planting, and "slowed for a minute, never stopped" inverts quietly.
  Asserted in test for that reason.
- **Every stall row is payable from a material AND from produce**, the same
  invariant `shop.test.ts` asserts and for the same reason: a row that only takes
  carrots makes farming a prerequisite for farming.
- **No crop is better than another** — varieties differ in time, never in value.
  A best crop is a currency with a hat on.
- **Choosing a variety is a mode, not a prompt.** The selection lives in world
  state beside `skins.selected`; ACT stays one tap on the tile at your feet. A
  modal on ACT would break the reticle's promise (see above).

### Adding a cast row does not add a person

`newWorld` built its villager list by hand, so the shopkeeper existed in `CAST`
and nowhere else — a shop building with nobody behind the counter, and an
existing save that would never get her at all. `ensureFixedCast` in `sim/town.ts`
is now the ONE function both `newWorld` and the migration call, which is the same
rule the v7 stamp established for buildings and for the same reason: two paths
that build the town differently is a bug nobody would think to test for.

It only ever appends a MISSING institution, so it is idempotent and can never
disturb someone already there. Residents are deliberately out of scope —
somebody moving in is an event (a commission), never something a migration
conjures.

### Build actions are undoable — one stroke, in memory

**Built** — `sim/undo.ts`, Phase 2c. The decisions below all survived contact;
two more were forced by the implementation and are recorded after them.

Erase already refunds materials, so what a demolition actually costs is never
wood — it's the **arrangement**. Twenty minutes of walls, gone to one drag.

- **The unit is the stroke, not the cell.** Build mode paints on drag; a single
  gesture can clear thirty cells, and undoing those one at a time is no undo.
- **It covers placement too.** Dragging walls across the wrong row is the same
  mistake in the other direction, and it's the same mechanism.
- **Undo is a rewind, not a transaction.** It restores the cells *and* reverses
  the stroke's own material delta, clamped at zero, so it can never fail for want
  of wood. "Undo is unavailable exactly when you need it" is the worst possible
  version of this feature, and rationing materials is against the pillar anyway.
- **One level, in memory, never in the save.** It survives until the next stroke
  replaces it and dies on reload — undoing something from three days ago is worse
  than having no undo. Keeps it out of the schema entirely.
- **No expiry timer.** A button that vanishes as you reach for it is its own
  small betrayal.

Two things the build settled that the design hadn't:

- **The material delta is fixed at endStroke, never computed at undo time.**
  Measuring "what did the stroke do" by diffing against the pre-stroke inventory
  *when undo is pressed* folds in everything that happened since — so undoing a
  wall after felling a tree confiscated the tree's wood. The delta is only
  honestly the stroke's at the moment the stroke closes. Caught by a test written
  for exactly this, which is the one case worth keeping in mind if this is ever
  refactored.
- **There is no `clearUndo()`, deliberately.** "Gone on reload" needs no call:
  the buffer is a WeakMap keyed by the world OBJECT, and loading a save or
  starting a new town mints a fresh one. A function to forget would be a second
  way to express what the data model already guarantees.

And one thing that fell out free: **undo revives a villager's housing claim.** A
demolished bed restored at the same anchor key is claimed again with no code,
because a claim is re-checked against the world on every read (`sim/housing.ts`)
rather than cleaned up when the bed goes. The stale-tolerant design paid for
itself here.

### A door needs a south wall and a doorstep

Two bugs from the same afternoon, both found on screen and neither catchable by
the tests that existed. Both are about a door being *reachable* versus being
*apparent*, and both now have tests.

**Doors only read on south walls.** A wall running away from the camera shows
its top, not its face (DESIGN §Structures), so a door cut into an east or west
wall renders as nothing at all. Margfrom's first front door was on her east
wall: perfectly pathable, completely invisible. You could walk in only if you
already knew where to.

**A door's doorstep is its only way in.** The cell directly outside a door is
the sole approach — its diagonals are blocked by the door's own wall run, and
the pathfinder won't cut a corner between two walls. So a single generated tree
landing there seals the building. `stampBuilding` now clears an apron in front
of each door, but *only* where generation put something solid, so the stone
plaza in front of the town hall stays stone instead of growing a plank scar.

The reason this one was nearly invisible is worth remembering: **the snap rule
hides unreachability.** A villager who can't path home teleports there and looks
completely normal doing it. Margfrom was "getting home fine" for as long as it
took to notice she never crossed the intervening ground. When a villager reaches
somewhere impossibly fast, suspect the pathfinder found nothing — don't assume
they walked.

### The reticle is the promise

`actionTarget(world, tool)` in `src/sim/game.ts` is the ONE place that decides
which tile ACT touches. The renderer draws exactly that tile and colours it by
the returned `kind`; `contextAction` executes exactly that tile. Neither may
re-derive it.

This is written down because the two *were* separate, and drifted: the reticle
lit up green on any node in reach, while ACT gave the held tool priority on the
tile underfoot — so standing beside a tree with the shovel out highlighted the
tree and dug the grass. The precedence itself was right (a tree beside you must
never hijack a deliberate act, or you can't till at the forest edge); the lie
was that the reticle promised something else. Colour carries the difference now:
gold = a ripe crop underfoot, green = felling a node, white = the held tool has
work here, faint = ACT would do nothing.

### Undecided, deliberately

- ~~**Money vs. barter vs. neither.**~~ **Settled: barter**, with the shop
  (Phase 3d). Moved up to the settled section below.
- Fishing, interiors-vs-exteriors, async multiplayer postcards — DESIGN.md's
  own open questions. Still open.

---

## Phase 2 — Structures, then the flagship — **done**

### 2a. Real structures — **done**

You can now lay floors, raise walls, cut a doorway, watch the roof arrive when
the shell closes, step inside and have it fade away, and furnish the room. The
model is settled above; this was the build order, smallest risk first:

1. ~~**Raised-object pass — trees and rocks only.**~~ **Done.** Ground stays a
   flat pass; everything that stands up shares one Y-sorted pass drawing upward
   from its footprint. It also flushed out two pre-existing bugs the small art
   had been hiding: the tent rendered upside down, and the tile bevel banded
   open ground into venetian blinds.
2. ~~**Structure layer: walls and doors.**~~ **Done.** Schema v5 (additive
   `world.build`), four-neighbour autotiling, solidity, build mode with its
   flattened view and drag-to-paint. Placement moved off the ACT button into
   build mode, so `Tool` no longer carries `plank`.
3. ~~**Rooms and roofs.**~~ **Done.** Bounded flood-fill (`sim/rooms.ts`),
   derived roofs, the snap-on beat, per-room cutaway easing. The fill budget
   (MAX_ROOM) doubles as the definition of "not enclosed" — exceeding it IS the
   miss answer, which is what keeps the common case cheap.
4. ~~**Furniture.**~~ **Done.** Bed, table, chair, shelf — multi-tile, with a
   facing, in their own `world.furniture` layer keyed by ANCHOR (schema v6).
   Deliberately no second "these cells are occupied" map: the anchor is the only
   record, and "what's on this cell" searches the four cells an anchor could be
   in. Wooden only; soft goods await the shop, and that's a rule, not a gap.

Folded into v5 as planned: `finish` lives on the build cell, so per-building
finishes need no further migration. Furniture carries its own finish too.

### 2b. Housing — rooms become homes

The core verb here is **not "build a house"** — it's **"give them a home."** A
home is any room that qualifies; building one is just the most interesting way
to produce a qualifying room. Assigning a villager to a house that already
exists is the same act.

That reframe is what splits the flagship along the phase line. **2b builds the
housing machinery** — rooms become homes, villagers path through them, homes are
assignable. **Phase 3 adds commissions on top** — arrivals, tents, tastes, the
Office Creature's paperwork. Content and beats, no new machinery.

It's worth it because 2b is then playable on its own: the town stops being a
stone rectangle with two people standing on bare coordinates, and the Phase 3
commission gets to *call* an acceptance test that already exists and is already
exercised, rather than inventing one under deadline.

Build order, smallest risk first:

1. ~~**Villager pathing and collision.**~~ **Done.** `sim/path.ts` — A* over
   structure + furniture solidity, doors walkable, with a bounded node budget
   (MAX_PATH_NODES) on the same principle as MAX_ROOM, where exceeding the
   budget IS the answer. No schema change: routes live in a WeakMap keyed by
   world, like the build revision and the rooms index, because a half-walked
   path is a cache and has no business in a save.

   Walkability is `world.isWalkable` — the same predicate the player collides
   against, deliberately, so nobody ever finds a gap one of you can use and the
   other can't. Diagonal steps require both shared orthogonals to be open: not
   cosmetic, but because `rooms.ts` fills four-way, so without it a villager
   could slip out through the corner of a room the game is drawing a roof over.

   The property to preserve is the one `villagers.ts` documents in its own
   header: position is *derived* from the clock, never accumulated, so two days
   away needs no catch-up. A path is stateful and would break that. The fix is
   that the **target** stays clock-derived and only the **route** is stateful,
   recomputed when the target or the build revision changes. When no path exists
   within budget (walled in, door moved), snap to the stop rather than stalling
   against a wall — off-screen it's invisible, and it keeps "come back and
   everyone is at their correct post" true.

2. ~~**Authored town buildings + the v7 migration.**~~ **Done.** Margfrom's
   house and a town hall around the Office Creature, who had been standing at
   bare coordinate `(0,-6)` since the slice. `src/content/town.ts` is the table;
   `src/sim/town.ts` stamps it.

   `newWorld` and the migration call the SAME stamp, deliberately — if those
   drifted, a returning player's town would differ from a new player's in ways
   nobody would think to test. That's why the stamp target is a structural
   subset rather than a `WorldState`: a save mid-migration is raw parsed JSON.

   v7 is the first migration that WRITES rather than backfills, so it's the
   first that could destroy something. `stampBuilding` refuses, all or nothing,
   any building whose footprint contains something the player built or planted;
   ground edits don't block it, since a dug tile is cheap to redo and the stamp
   lays its own floor anyway.

3. ~~**Dynamic home resolution.**~~ **Done.** Schedule stops gained `at: "home"`,
   resolved against world state in the new `sim/housing.ts`; `Villager.homeBed`
   holds the anchor key of their bed (schema v8).

   `CharDef.home` turned out to be **dead** — declared and assigned since the
   slice, read by nothing. The real hardcoding was entirely in the stops, so it
   was deleted rather than converted.

   Resolution is **total**: a villager whose bed is gone falls back to the
   middle of the plaza, in public, at 2am. Deliberately *not* the spot their old
   house occupied — standing on empty grass where a bedroom used to be reads as
   the game losing track of them, where the town square reads as a person with
   nowhere to go. That's the true thing, and the one step 5 can give her a line
   about.

   The claim is allowed to go **stale**. Demolishing a bed doesn't reach into
   the villager list to tidy up; every read re-checks that the key still holds a
   bed. One fact in one place, same reasoning as furniture's anchor-only record.

   Two traps worth remembering:
   - **`newWorld` builds villagers BEFORE it stamps the town**, so at
     `makeVillager` time no bed exists and every home stop resolves to the
     fallback. Without `settleResidents` after the stamp, every new town would
     open with its residents standing in the square — silently breaking the
     promise `makeVillager`'s own docblock makes.
   - **The v8 backfill asks the save, not the content table.** A v7 town only
     has Margfrom's house if the v6→v7 stamp succeeded, so "the table says her
     bed is at (-10,-3)" is not evidence a bed is there. Claiming one regardless
     resolves to the plaza anyway — the same place an honest `null` gets her,
     reached by writing down something false first.

4. ~~**Assignment.**~~ **Done.** `sim/assign.ts`. Point a villager at a
   qualifying room — enclosed, has a door, has a bed. The Sims-like "choose an
   existing house OR build one" choice, and *also* exactly the acceptance test a
   Phase 3 commission asks. Written once, used twice.

   - **`qualify()` returns WHY, not a boolean.** `{ ok, room, occupant }` or
     `{ ok: false, why: "no-bed" | "no-room" | "no-door" }`. The commission will
     say "it needs a door" in the Office Creature's voice and the assignment
     flow says the same fact in the player's; one call site produces both, so
     they can't drift into disagreeing about what a house is.
   - **No `too-small` verdict**, deliberately. `qualify` hands back the `Room`,
     so a commission checks `room.interior.size` at its own call site. A minimum
     size is a *commission's* requirement, not a housing rule — putting it here
     would give housing an opinion DESIGN says it must not have.
   - **An occupied bed is reported, not refused.** `occupant` comes back so the
     caller can present it; assigning over someone evicts them, because two
     villagers holding one anchor key would be one fact written twice.
   - **The entry point is conversation, near-gated.** Tap a villager you're
     beside → "There's a room for you" → tap a bed. Candidate beds get their own
     pulsing overlay (`setHomeCandidates`) rather than being folded into the
     reticle — the reticle promises exactly what ACT touches, and two meanings on
     one affordance is how that rule got broken the first time. The overlay draws
     OVER roofs on purpose: a qualifying bed is enclosed by definition, so
     marking it under the roof pass would hide every bed worth picking.
   - **The mode's door on touch is the tool palette.** Escape works on desktop;
     a phone has neither Escape nor a panel to close, so picking up any tool
     leaves bed-picking. A missed tap does NOT leave it — aiming at furniture on
     a phone, dropping out on the first fat-fingered tap reads as broken.

   **The moved-bed seam, and the premise that was wrong.** Moving a bed is
   demolish + place, minting a new anchor key, which would unhouse whoever slept
   in it. This was designed as a SAME-STROKE inheritance (and 2c was built first
   to supply the stroke). Driving the real UI showed that can never happen:
   erase and bed are different **tools**, so a move is always two strokes with a
   palette tap between them. The unit tests missed it because they call `buildAt`
   directly, where "one stroke" is whatever the test says — exactly the class of
   bug the browser house rule exists for.

   So the orphaned claim **waits**: a stroke that takes someone's only bed
   records them in memory, and the next stroke placing a single unclaimed bed
   hands it over. That's not a second record of where someone lives — it's a
   record that someone lives *nowhere*, which the world already says out loud
   (their claim is null and stays null). Same shape as the undo buffer: WeakMap
   keyed by world, one level, never serialised. A deliberate offer always beats
   the inference, and an ambiguous stroke (two orphans, or two new beds) refuses
   to guess. Losing a bed is announced — silence would mean finding out at 2am.

5. ~~**They comment on it.**~~ **Done.** `sim/home.ts` turns a villager's home
   into a small vocabulary of things worth remarking on — `homeless`,
   `roofless`, `sealed`, `bare`, `grand`, `snug`, `furnished`, `finish` — and
   `RESIDENT_HOME` in `content/dialogue.ts` gives each form lines for them. No
   new machinery, exactly as planned: it reads `qualify()`'s `Room` and the
   claim's staleness, both of which step 4 already produced.

   **It calls `qualify()` rather than asking the world.** The three trouble
   notes ARE the three disqualifiers, so "your walls don't meet" is the same
   verdict the assignment panel shows and the Phase 3 commission will put on
   letterhead. A third opinion about what a house is would drift from the other
   two — the reticle rule, applied to housing.

   Two decisions the build settled:

   - **A stale claim speaks; a null claim doesn't.** Homelessness is only worth
     a line when it's a *change*. A claim pointing at a bed that isn't there any
     more means something was taken; no claim at all may mean they never wanted
     one, and the Office Creature complaining nightly about a bed he never had
     would be the game mistaking an institution for a person. Both states were
     already distinguished by the data — housing.ts lets a claim go stale rather
     than tidying up — so this cost no new flag. It does mean an *evicted*
     villager (whose claim `assign()` clears) says nothing; the eviction is
     announced at the time, and a permanent grievance would be worse.
   - **How readily they mention it is part of what the note means.** The trouble
     notes fire at 0.85, the pleasant ones at 0.35. A villager who mentions a
     missing bed one time in ten is one the player concludes is fine; a villager
     who leads with their nice shelf every time is a property listing. The odds
     therefore live with the vocabulary in `sim/home.ts`, not at the call site.

   Voice rule, and the reason this is lines and not a score: **nobody grades.**
   A small room is snug, not deficient. DESIGN's "taste is delight, never a
   gate" applies to what villagers *say* about a house, not only to what a
   commission accepts — a house-quality readout would turn a gift into a chore
   with a pass/fail on it.

Requires: 2a, the friendship system (done), the memory log (done).

### 2c. Undo — **done**, and pulled ahead of 2b step 4

The model is settled above ("Build actions are undoable"). Built as `sim/undo.ts`
plus an undo control in the build HUD (⟲, and `Z`): begin/capture/end hang off
the stroke span `ui/app.ts` already maintained for its `painted` set, so there is
exactly one definition of "one gesture". **No schema change and no migration** —
the buffer is a WeakMap keyed by world, same shape as routes and the rooms index.

Two implementation notes worth keeping:

- `captureCell` snapshots the target key **and the whole MAX_SPAN anchor window
  around it**, because erasing a bed by its foot deletes an anchor key up to
  MAX_SPAN-1 cells away — restoring only the tapped key puts back nothing. First
  capture in a stroke wins, or overlapping windows from a drag re-snapshot an
  already-edited cell as its own "prior" state.
- Restoring writes to `world.build` wholesale rather than replaying
  place/remove (it has to put back a wall that was painted OVER a door, which no
  single call expresses), so it must announce the change — hence `touchBuild` in
  `sim/structures.ts`. Skipping it leaves the town drawing roofs over a house
  that isn't there.

**Why it moved ahead of 2b step 4.** Step 4's seam is that moving a bed is
demolish + place, minting a new anchor key and unhousing whoever claimed it.
Every way of preserving the claim that *doesn't* use a stroke adds a second
record of where someone lives — which is exactly what the housing model refuses
("the bed is the claim"). The stroke buffer is already that memory, for its own
reasons. Doing 2c first means step 4 spends no new state on the case.

**Postscript — half of that reasoning was wrong.** The stroke turned out to be
the wrong *unit* for the moved-bed case (see 2b step 4: a move is always two
strokes, because erase and bed are different tools), so the fix ended up as its
own WeakMap rather than reading undo's buffer. 2c-first was still the right
call — it established the begin/capture/end boundary in `ui/app.ts` that the
rehome hook now uses, and undo is worth having on its own merits — but the
"costs no new state" argument didn't survive. Worth remembering before trusting
the same shape of argument again: a sequencing decision justified by a shared
mechanism should be checked against how the player actually performs the action,
not against how a test can call the API.

---

## Phase 3 — The town

### Settled first: where residents come from

**The Meadow import supplies the PLAYER, and nobody else.** Residents arrive on
their own. DESIGN has been corrected to match (§"Importing from The Meadow"); the
old line — "any remaining imports become villagers" — was aspirational text the
adapter never implemented, since `importFromMeadow` returns exactly one sprite.

The reason to settle it this way rather than the other: commissioned housing is
the flagship, and a flagship that only fires when the player happens to have
retired a spare adult in a *different game* is one most players never see. An
arrival has to be something the town does, not something the save file supplies.

### 3a. The two door gaps — **done**

Both were flagged in Known gaps as wanting doing "before commissions, where a
house you built is judged", and both are now closed — see there for what each
one turned out to be.

### 3b. Commissioned housing — **done**

Somebody arrives, pitches a tent, and you give them a home. `sim/commission.ts`
plus `content/arrivals.ts`; schema v9, additive. It is content on top of 2b's
machinery exactly as planned — **there is no second opinion here about what a
house is.** `commissionState()` calls `qualify()` and adds one thing at its own
call site, the minimum size, which is the split `assign.ts` was written for.

**Taste is delight, never a gate.** Requirements are structural only — enclosed,
a door, a bed, a minimum size — and the minimum is **the same for everyone**.
Giving the Menace a bigger one was tempting and wrong: a taste expressed as a
hard gate is precisely what DESIGN rules out. Her standards live in what she
says. That is why this module has no scoring function in it at all.

What the build settled:

- **`CharId` had to stop being a closed union.** Arrivals happen at run time.
  Authored ids stay a union (the dialogue banks and `authoredBed` are keyed on
  it, and a missing row should be a type error); newcomers are `newcomer:N`.
  `charDef()` is now the ONE place that turns a villager into a routine — it
  replaced four `CAST[v.id]` lookups, each of which would have returned
  undefined for a newcomer, and an undefined def means "don't move". They would
  have stood on their arrival tile forever without a single error.
- **A newcomer's def is derived, not stored.** They already carry a name, form
  and friendship; the only missing piece was a shape of day. So an arrival costs
  no schema beyond the form itself.
- **Two ways of having no bed, kept apart.** Someone whose bed you demolished
  stands in the plaza at 2am; someone waiting on a commission camps by their
  tent. The second is not homelessness, it is camping, and the square would read
  as the game losing track of a person it knows exactly where to find.
- **The tent is not a build cell and not furniture.** It lives in the commission
  record, has no solidity, and the room flood-fill never has to have an opinion
  about it.
- **One commission open at a time.** Two people in tents asking simultaneously
  turns a gift into a queue, and the queue is the part that would feel like work.
- **`housing.ts` reads `world.commissions` directly** rather than importing
  `commission.ts`, which imports it back through `assign.ts`. The state in
  `types.ts` is the shared dependency — the same trick `isWalkable` uses to stay
  out of `structures.ts`.
- **It closes where you finish the house, not back at the desk.** The round trip
  is the on-tone joke and also a chore; when those disagree the pillar wins.

And one bug that only a browser could find: **`.clock` had no
`pointer-events: none`**, so the flash toast sat over the middle of the map and
ate taps — during bed picking, the one mode whose whole instruction is "tap the
map", while displaying the words "Pick a bed for Bissenette". `.hint` beside it
has carried the fix and a comment explaining it since it was written.

### 3c. Taste — **done**

`content/tastes.ts` says what each form is quietly pleased by; `describeHome`
adds a `delight_finish` or `delight_piece` note when the house happens to match,
ranked above the plain observations and below the troubles. The stamp modal uses
the same banks as idle conversation rather than carrying a second set of lines
about houses.

- **There is no opposite of the tastes table, and that IS the design.** No
  `dislikes` field, no penalty, nothing anywhere that reads a house and finds it
  wanting. The reliable way to keep "taste is delight, never a gate" is to leave
  the vocabulary no way to say the other thing — a villager who could be
  disappointed by your house would turn a gift into a review.
- **Two delight kinds, not one.** "You built it in dark walnut" and "you put a
  shelf in" are different sentences; one bank keyed on `delight` produced
  *"shelf. ... You paid attention."* Caught by reading the actual modal, which
  is the only place the grammar is visible — the unit tests were green.
- **The Menace has two tastes on purpose.** Whitewash is unlocked BY housing
  her, so she cannot be living in it the first time; the shelf is what lets her
  first house please her. A taste that's unreachable at the moment it matters
  most is a taste nobody ever sees.
- **Preferences are form-only now.** DESIGN said "form + imported history", which
  stopped being possible when residents stopped being imports. Corrected there.

### 3d. The shop — **done**

The Menace's counter, east of the plaza: `content/shop.ts` (the barter table),
`sim/shop.ts` (the swap), cloth as an item you can't gather, and `cushion` +
`rug` as furniture rows that cost it. Schema v10. The economy model is settled
above, along with the `ensureFixedCast` lesson it forced.

Her conversation IS her counter — a dialogue box with a "shop" button in it
would be a menu in front of a menu, and she's a person you go and see.

Two Menaces now exist and that's allowed: Bissenette is a menace who lives here,
the Fancy Little Menace is the institution. "Forms are species, not singletons"
(DESIGN §Importing) — the museum curator will be a specific scholar while
Margfrom is just a scholar who lives here.

### 3f. The museum — **done**

The model is settled above. This was the build order; steps 1–4 were one commit.

1. ~~**The docs.**~~ **Done** — DESIGN §The museum, the settled entry above, and
   the correction to the Scholar affinity perk.
2. ~~**`content/museum.ts`**~~ **Done** — 17 rows: 5 nature (one per crop and
   gathered thing; cloth deliberately absent, it is the one thing you cannot
   gather) and 12 antiquities at a **flat** 3 junk each, drawn from the same
   objects `JUNK_FINDS` names when the ground gives them up. Every row carries
   2–3 placards, which is what makes step 7 cost nothing.
3. ~~**`sim/museum.ts`**~~ **Done** — `donatable`, `donate`, `collection`,
   `remountExhibit` for step 7. Modelled on
   `sim/heap.ts`: all-or-nothing, and it **refuses what is already held**. That
   refusal is not politeness — without it a second tap spends the junk and the
   record absorbs it silently, which is the exact bug `redeem()` was written to
   avoid. Tests mirror `heap.test.ts`: the museum never gives back an item,
   finish or furniture; no acceptance test anywhere reads the collection; the
   world never grows a museum score field; each wing is fillable without
   farming and without digging.

   That last one was written loosely and got tightened in the building: the
   antiquities wing *is* junk, so it cannot be fillable without digging and was
   never meant to be. What the test asserts is the real rule from DESIGN — the
   **museum** is reachable without farming *or* without digging, and the nature
   wing has rows a pure gatherer can give before they have ever planted or
   turned a tile. Neither wing owns a verb.
4. ~~**Schema v12**~~ **Done** — additive
   `world.museum: { donated: { id, placard }[] }`, migration backfills empty
   (never inferred: an old save donated nothing because there was nowhere to).
   Same commit added Corrigal to `ensureFixedCast` and the museum to
   `TOWN_BUILDINGS` — **both, or it repeats 3d's bug**: a `CAST` row alone is a
   building with nobody behind the counter. She stands at (-12,-9) inside
   x -13..-7, y -12..-7, north-west of the plaza and clear of both Margfrom's
   house (y -4..0) and the town hall (x -3..3); a `museum.test.ts` case asserts
   her post is inside her own walls.

   **Superseded by v13, in step 5.** That room was 5x4 inside — seventeen
   exhibits in seventeen cells, wall to wall, no circulation. The museum is now
   a GALLERY running north: x -13..-6, y -16..-7, door at (-10,-7), three cases
   on rows -10, -12 and -14 with a walkway between each. It could not grow west
   (`generatedTile` puts the riverside river at x <= -12) or east (the town
   hall) or south (Margfrom, the plaza), so north is where it went.

   The v13 migration is **the only one so far that removes anything**, and the
   latitude was specific to the situation: the v12 room shipped the same day,
   held nothing, and had no UI to donate through, so nobody could have had a
   collection or furnished it. It still refuses to guess — it clears the old
   shell only when the old shell is exactly what it stamped, and otherwise
   leaves everything alone and lets `stampBuilding` refuse on its own. Don't
   read it as a precedent for bulldozing a building people have lived beside.
5. ~~**Plinths.**~~ **Done**, and it corrected two things in this plan.

   Authored cells in the footprint, a donated exhibit fills the next one of its
   wing, one generic form rather than per-exhibit art — all as written. But:

   - **They are CASES, not pedestals.** Neighbouring exhibits on a row draw as
     one continuous surface with the outline only at the run's ends. That is
     the per-cell edges band rule taken seriously rather than survived: six
     pedestals side by side would have striped, and this was the fourth
     candidate. A gap splits the run, so a half-filled case is a short case.
   - **They are derived, never stored.** No furniture cell, no schema, nothing
     to erase — so the room cannot disagree with the record, and a plinth
     cannot exist without an exhibit on it. That last part is the no-empty-
     slots rule expressed as geometry instead of as a panel rule.
   - **The v12 museum was too small and had to grow** — see the v13 note below.

   Verified on screen with `scripts/drive.mjs`, per the house rule: the first
   pass drew cases a full tile deep and 14 high, which read as three long
   counters in a warehouse, and the second anchored exhibits to the case's far
   edge so they stood up behind it like fence posts.
6. ~~**UI**~~ **Done** — conversation IS the museum, the same call as the shop
   and the heap. Three doors on the panel: give something, read the catalogue,
   leave. The three views swap **in place** inside one dismissable modal rather
   than stacking, so reading the collection never feels like opening drawers.

   What the build settled:

   - **The mounted card gets its own view, not a flash.** The placard is the
     entire return on a donation, and `flash()` clears after 1.8 seconds — a
     payoff you can lose by blinking. It shows alone, with no title above it:
     every placard opens by naming the thing, so a heading printed "Handle of
     Office" twice in three lines. The catalogue keeps its titles, because a
     list needs something to scan and a revised card can be as short as `"..."`.
   - **Donated rows leave the counter**, which is the opposite of the shop and
     the heap — they keep redeemed rows on the list, marked. Right there and
     wrong here: a row marked "given" is a tick, and a column of ticks is the
     checklist the whole wing was designed not to be. The catalogue is where
     what you gave lives.
   - **Antiquities are offered as "Something you dug up — 3 junk"**, never by
     title. `donatable()` already refuses to reveal the row; the label is the
     other half of that, and it is why the panel can list the next one without
     listing the twelve.
   - The panel is the scroller, so every view swap rewinds it. A long catalogue
     otherwise drops you at the bottom of the counter, below the list.
7. ~~**Away event**~~ **Done** — `curatorRemountsExhibit` in `sim/away.ts`
   calls the `remountExhibit` step 3 built: pick a donated exhibit, advance its
   placard, quote the new card in the postcard. No new content axis, exactly as
   planned, and the catalogue shows the revision because it reads the record
   live.

   It REPLACED an event of the same name written before the museum existed, and
   that one had two bugs the museum turned up:

   - **It invented its own subject** ("a rock", "an interesting stick"), so the
     postcard announced an exhibit standing on no plinth anywhere. Now an empty
     museum produces no news from her at all — the event returns null and is
     skipped. That is the honest version: every event in this table changes the
     world, and a line about a card you cannot go and read is the slideshow
     away.ts's header warns about.
   - **It found its scholar by FORM**, which is Corrigal in a new town and
     Margfrom in a save old enough to predate her (`ensureFixedCast` appends
     institutions after the resident). The same event landed on different
     people depending on how old your town was. Institutions are found by
     **id**; form is never an identity. Asserted now in `away.test.ts`.

   The memory stores the exhibit's **title**, not its id: the value renders
   straight into a scholar's dialogue line, and older saves whose value is prose
   keep speaking rather than resolving to nothing. Corrigal never says that line
   herself — her conversation is the panel — so the log exists for step 8.
8. ~~**Margfrom's perk**~~ **Done** — `rivalReading` in `sim/museum.ts`,
   `SCHOLAR_DISSENT` in `content/dialogue.ts`, offered by `speak()` to any
   scholar resident. No schema, no migration: the whole step rides on data that
   already existed. Three calls made in the building:

   - **Her rival card is one of the row's OWN unmounted placards**, not new
     writing. Corrigal's earlier drafts and her not-yet-mounted revisions are
     exactly the pool a second confidently incorrect authority should draw from,
     and it means adding an exhibit never also means writing a dissent for it —
     the same dividend the placards-in-threes decision paid in step 7. It has
     one accident in it and the accident is good: if Corrigal eventually mounts
     the card Margfrom was holding out for, Margfrom is pushed onto another one,
     which reads as her having been right all along.
   - **She reads the live record, not the memory log**, which is a deliberate
     departure from every other line in `sim/dialogue.ts`. Gating her on an
     `exhibit` memory would mean an away roll has to fire before she notices a
     wing you filled this afternoon, and the museum is a public room she can
     walk into. The dormant `RESIDENT_MEMORY.scholar.exhibit` bank stays where
     it is for a scholar who actually witnesses a remounting. This is the first
     read of the collection outside the panel; it is a read and nothing else,
     and the no-gate test still names the files that can accept or refuse.
   - **Her position is fixed, derived from her id**, not rolled per line. A
     scholar with a fresh theory every time you ask is noise rather than an
     authority — the joke needs her to have a position and to keep restating it.
     Only the phrasing rolls.

   Two things the writing settled: the perk is keyed by **form** (it is a perk,
   so it asks nothing of her — a town without a scholar simply never hears it)
   while the curator is excluded by **id**, which is step 7's lesson applied
   before it could bite again. And every line frames the quote as a *document* —
   a card, a draft, a submitted revision. Verified on screen: said flat, the
   placard's own revision marker ("Mushroom. ... Corrected.") made her sound
   like she was reading aloud from someone else's page mid-sentence.

~~**Open:** the curator needs a name.~~ **Settled: Corrigal.** A specific
scholar, not "Little Scholar" — same footing as Bissenette vs. the Fancy Little
Menace, and Margfrom is now just a scholar who lives here. The name is one
string in `cast.ts` and nothing keys on it, so it stays cheap to change.

### 3g. The seed stall — **done**

The Blessed Carrot's stall, and the model above. Schema v14. Build order, all
shipped:

1. **The docs** — DESIGN §Materials, the settled entry above.
2. **`content/crops.ts`** — two more varieties beside the carrot, differing in
   time and in nothing else.
3. **`content/items.ts`** — one `seed` row, its own category so it can never
   drift into anywhere that treats produce as food or as donatable.
4. **`content/seedstall.ts`** — seed rows (unlimited) and variety rows
   (redeemed once).
5. **`sim/seeds.ts`** — the swap, reusing the shop's, with `shop.test.ts` +
   `heap.test.ts`'s assertions.
6. **Schema v14** — additive `world.seeds`, and the migration grants a starting
   stock of seed. Backfilling only the unlock list would leave a live save
   unable to plant on ground it could plant on yesterday.
7. **Planting and harvest** — plant spends a seed and reads the selection;
   harvest yields produce *and* seed.
8. **The stall in the world** — a `TOWN_BUILDINGS` row AND an `ensureFixedCast`
   row, both, or it repeats 3d's bug.
9. **Conversation IS the stall**, as with the other three counters.
10. **The museum's nature wing** grows a row per new crop by definition.

Four things the build settled that the plan hadn't:

- **A best crop can be created by the BARTER TABLE, not just by the growth
  times.** The Menace took carrots and neither new crop, so a potato was worth
  nothing at any counter in town — "no crop is better than another" broken from
  a file that never mentions crops. `seeds.test.ts` now asserts the real rule:
  any counter that takes one crop takes **all** of them, at the same price.
  Stated as all-or-none so it holds for the next crop without anybody
  remembering to come back. Variety rows are exempt and the exemption is forced
  — a potato payable in radishes would gate a variety behind a variety.
- **The museum's gallery was sized to its table exactly**, so two crops
  overflowed a room that cannot grow (river west, town hall east, plaza south).
  Rather than reshape a building people have walked into — which the v13 note
  asks the next person not to do — the nature wing spilled into a fourth short
  case by the entrance, with the door column left empty because a case is not
  solid and you would walk through it. **A third crop wants the room replanned,
  not another corner found for it.**
- **Standing behind your own counter makes you invisible.** The Blessed Carrot
  was authored on the cell directly north of his table, and the raised art that
  reads as height everywhere else drew the counter straight over him; a carrot
  is short enough that all you could see was the leaves. He stands beside it
  now. Every unit test was green — "is he inside his own walls" is true either
  way — which is the browser house rule earning its place again.
- **And the counter sealed its own doorway**, being solid and centred on the
  door. That one `town.test.ts` did catch, which is the difference between a
  fact about pathing and a fact about pixels.

### The errands board

**Settled and built in Phase 3h**, recorded in full in DESIGN §The errands
board. The parts that took real discussion, so they don't get relitigated:

- **One gap, not two.** The obvious shape — a short first interval and a long
  one after, the way `arrivalDue` does it — was written and thrown out. The
  natural way to ask "is this the first?" is `done.length === 0`, and a REFUSAL
  DOESN'T ADD TO `done`; so refusing the opening request brought the next one
  back in fifteen minutes while running it cost four hours. Saying no had
  quietly become the efficient play, which is the one thing it must never be.
  The fix is that `newErrands` starts the clock part-wound, so the first card
  still arrives quickly and there is one constant and no branch to hide in. A
  unit test caught it on the first run, and it is the reason that test exists.
- **The table CYCLES rather than running out**, unlike arrivals and antiquities,
  which both end on purpose. Unseen rows are preferred while any remain; after
  that it repeats, never twice running. A board that ran dry is a board the town
  stopped using — it is the town's everyday pulse, not a finite story.
- **The notices column is defended structurally, not editorially.** `NoticeWorld`
  is a past-tense view with no inventory and no open request in it, so a notice
  *cannot* say "you need three carrots" — the risk this section used to warn
  about is now a type error rather than a matter of discipline.
- **Fixtures are not buildings.** `stampBuilding` writes PLANK under its whole
  footprint so nothing lands in the river; that is exactly wrong for one object
  on paving, where it would be a scar. `TOWN_FIXTURES` + `stampFixtures` place
  a piece and lay no floor. `stampTown` runs both, so there stays ONE answer to
  "what does a town contain" — two callers furnishing a town differently is the
  bug `ensureFixedCast` exists to stop.
- **The Dog's stops needed a test the other five didn't.** He is the one
  institution that moves, so his round can't be eyeballed once and trusted:
  `town.test.ts` now checks every stop is outside every building, and that none
  of them is the cell north of the board (the Blessed Carrot occlusion bug,
  which the unit tests were green for the first time).
- **The board's roof is deliberate.** The generic furniture path gives every
  piece a top the full depth of its footprint, which is right for a table and
  made a 22px board read as a crate. It is drawn as a little pitched roof — what
  a parish notice board actually has — which costs nothing and turns the
  heaviest part of the silhouette into the thing that identifies the object.
  Paper is hardcoded rather than taking the finish, because paper is not wood
  and in pine it vanished.

### Festivals and the plaza stage

**Settled in planning for Phase 3i**, recorded in full in DESIGN §Festivals.
The last institution, and the parts that took real discussion:

- **A festival is a total function of the date, and that is load-bearing
  twice.** It is what lets the stage exist without touching `villagers.ts`'s
  invariant — schedule stops consult the calendar, positions stay clock-derived,
  no catch-up after an absence — and it is half of why this ships **with no new
  save field**, the first institution that adds none.
- **It still needed a version bump, and that is a lesson not a footnote.**
  Schema v16 adds nothing; its entire body is the stamp + `ensureFixedCast`
  pair. The plan said "no schema change at all" and was wrong, because the
  migration ladder only runs BELOW `SCHEMA_VERSION` — a town already at v15
  never hears about a new fixture or a new institution, however idempotent the
  stamp is. Deriving state from the calendar buys you a migration with no
  field in it; it does not buy you no migration. v10 → v11 is the precedent and
  says the same thing about the junk economy.
- **The other half of the no-new-field property: attendance lives in the
  villagers' memory logs.** Whether
  you came to a festival is a thing six people remember, not a number the town
  keeps. That is not a trick to dodge a migration; a `festivalsAttended` field
  is a score with a denominator implied, which is exactly what the museum panel
  spends four bullets refusing. The memory log already serialises, already
  feeds dialogue, and is already the thing DESIGN says dialogue must be written
  against.
- **Monthly, one per calendar month.** The alternative — a short cycle so the
  first one lands in your first week — was the errands board's instinct and is
  wrong here. A festival that comes round every five days is a routine; the
  point of a festival is that it is *rare*, and rarity is what makes the
  postcard version ("you missed it") land as news rather than as a nag. It also
  puts festivals on the real calendar, which is the axis Phase 4's seasons want
  anyway.
- **Which means the stage is empty most days, and the rehearsal is the answer.**
  An institution you can only use twelve times a year is a prop. The Blob
  rehearses daily and his conversation is the programme, so passing the stage on
  an ordinary Tuesday gets you something — most of the writing goes here, not
  into the twelve festivals.
- **Institutions do not close for it**, and this needed no rule: `tickVillager`
  returns early on `def.fixed`, so the fixed cast simply never gather. The
  counters staying open is a consequence of the existing model rather than an
  exception carved into it — and a shop that shuts so you can attend is a
  deadline wearing a party hat.
- **Missing one costs nothing and is recorded nowhere.** Asserted in test the
  way `heap.test.ts` asserts the Gremlin never hands over a material: skipping a
  festival leaves the world unchanged, and no acceptance test in the codebase
  reads a festival memory.
- **The stage is a FIXTURE, not a building** — `TOWN_FIXTURES` + `stampFixtures`,
  the distinction the errands board forced. A building writes plank under its
  whole footprint, which on plaza paving is a scar.

### The rest of Phase 3 — **nothing**

- ~~The last fixed cast member + institution: plaza stage (Dramatic Blob).~~
  **Done.** See the settled entry above. Phase 3 is complete.

Two things the build settled that the plan hadn't, both found on screen:

- **A building casts a shadow two tiles north of itself, and a crowd can stand
  in it.** The audience was first placed south of a stage at (-4,0) — directly
  in front of the seed stall, whose walls and roof draw upward over the ground
  behind them. Margfrom was a purple head above a gable, standing in exactly
  the cell the game intended. It is the Blessed Carrot bug at the scale of a
  building, and `town.test.ts` now asks the question in the general form: no
  watch spot may be within two tiles north of any building footprint. **Any
  future authored standing position wants that check**, not just this one.
- **"Who is at the festival" is a question about ROLE, not about distance.** A
  six-tile radius put the Office Creature in the crowd — five tiles from the
  platform, through a wall, with the door shut — and warmed him for a party he
  did not attend. `gatherers()` is now the one predicate, shared by `attend`
  and by the away event, so being at a festival is one fact whether or not you
  were there to see it. The fixed cast staying at their counters is the whole
  reason the counters stay open; a radius cannot know that.

---

## Phase 4 — Depth

Order settled: **4a underground → 4b company → 4c secrets → 4d crops/seasons.**
The underground goes first because it is the only one anything else waits on —
ore is defined-but-unobtainable by design, `slate` is "found by digging deep",
and the Mole lives down there. Company comes second rather than first because
DESIGN §Company lists "anyone for a dig" as an example: company shipped alone is
a follow-behind, and company shipped after the underground has somewhere to go
where being alone reads as being alone.

### 4a. The underground — step 1 of 4: the layer axis, **done**

`Layer = "surface" | "under"` threads through `tileAt`/`setTile`/`baseTileAt`/
`getChunk`/`isWalkable` as a trailing parameter defaulting to `"surface"`, so no
existing caller changed. Four new tile rows (`BEDROCK`, `CAVE_FLOOR`,
`ORE_VEIN`, `SHAFT`), `carve`, and schema **v17**.

What the build settled:

- **The underground starts SOLID, and that inverts the surface.** Up here
  generation gives you open ground and scatters obstacles onto it; down there
  generation gives you rock and every open cell is one you cut. So `under` is
  sparse in a stronger sense than `overrides` — the size of that object is the
  size of your tunnel, and a town that has never gone down carries `{}`.
- **`under` is its own record, not a prefixed key in `overrides`.** The game is
  live: a keying change would have to rewrite every entry in every deployed
  save, and a migration that rekeys is a migration that can lose a cell. v17
  adds one empty object and rekeys nothing. Asserted in test.
- **Depth is horizontal — distance from your nearest shaft** (Chebyshev), which
  is what "digging deep" has to mean given DESIGN's "underground is a layer, not
  a height". The load-bearing property is the *direction*: sinking a new shaft
  makes its surroundings **shallower**, never deeper. There is therefore no way
  to reach the deep end by walking somewhere remote on the surface and digging
  down — you can only tunnel there. Both facts are asserted in `world.test.ts`.
- **Generation ignores the homestead spot down there.** The surface shapes
  itself around where you settled; the rock doesn't, or two towns from one seed
  would disagree about where the ore is.
- **Veins are generated, never placed, and are gathered rather than carved.**
  `canCarve` refuses an ore vein — it's a resource node like a tree, so it goes
  through `sim/gather.ts`, and letting the shovel cut it away would drop the ore
  on the floor. Low contrast against bedrock on purpose: you meet a vein at the
  face you're digging, not by spotting it through solid stone.
- **A shaft is a tile on both layers, and `shafts()` derives from the tiles**
  rather than a parallel list — so undo, migration and the away sim can't leave
  a ghost entrance behind. Asserted by filling one in.

### 4a step 2 — descent, **done** (sim in 2, wired and drawn in 2b)

`sink`/`fillShaft` in world.ts, `player.layer` + `canDescend`/`canAscend`/
`useShaft` in game.ts, schema **v18**. Movement (`moveTo` and the per-axis
collide in `tick`) now passes the player's layer to `isWalkable`.

Step 2 shipped the sim alone and deliberately left it unreachable: the game is
live on Vercel, and wiring descent before the renderer could draw the
underground would have dropped a player into a cave rendered as grass. Step 2b
is the other half — the renderer, the ACT wiring, and schema **v19** — and it
ships them together.

What the build settled:

- **A shaft is two digs on one tile.** ACT on grass makes dirt (as before); ACT
  on that same dirt opens the way down. No new tool, no new button, no cost —
  and digging dirt was already a no-op, so the gesture was free to claim.
  `canSink` refuses a cell holding a crop, a built cell or furniture: unlike a
  dig, a shaft is not cheap to redo, so it never eats something placed on
  purpose.
- **A shaft is stored ONCE, on the surface.** Underneath, that coordinate is
  ordinary cave floor. So "is there a way down here" and "is there a way up
  here" are the same question asked from either end and cannot disagree — and
  `shafts()` has one place to look.
- **`fillShaft` is refused while the player is underground, and the check is on
  the LAYER, not on that hole.** Filling from above is how you'd seal someone
  into a cave with no exit. The broad check can't be defeated by a second
  entrance being open and doesn't depend on the caller having the coordinate
  right. Found by writing the test as a documented trap and deciding that was
  the wrong answer.
- **Changing layer keeps your coordinate** and drops your walk target. That is
  "one continuous world, no interior scenes" (DESIGN §Structures) pointed
  downward: no transition, no second map, same x/y.

What step 2b settled:

- **The player carries a HEADING, and it is not `facing`.** `facing` is ±1 and
  exists to flip a sprite — a sprite has no back, so left/right is all the art
  can say. But underground the shovel cuts the cell AHEAD of you (rock is solid,
  so the tile underfoot can never be rock), and with ±1 there is no way to
  tunnel north or south. `heading` is the four-point compass of your last
  movement; the sprite still flips off `facing`. Schema v19, default "s".
- **The heading is taken from what you ASKED for, not from what moved.** It is
  set in `moveTo` before the walkability refusal, so walking at a rock face
  still aims at it. Reading it only off successful movement would mean the one
  direction you could never point at was the one with a wall in it — and that
  wall is the entire verb.
- **The rock is chosen by heading, never by a neighbour search.** `nodeNear`'s
  answer for trees (try every neighbour, take the first) is wrong here: hemmed
  in on three sides it would cut a wall you didn't mean, and tunnelling would
  stop being something you steer.
- **The landing at the bottom of a shaft is load-bearing.** `sink` now carves
  the four cells around the ladder as well as under it. Without them you arrive
  in a one-tile room whose only open cell is the one you are standing on — and
  since that cell is also the way up, ACT can offer you nothing but to leave
  again. There is no first swing of the pick. **This passed every unit test and
  failed on screen**, which is the whole argument for the browser pass.
- **Darkness is a gradient in scene space, not a per-tile alpha.** Quantised to
  the grid it would be the per-cell edges band rule (CLAUDE.md) in a new
  costume, and a circle of light that steps in tile-sized rings reads as a bug.
- **Uncarved rock is painted as rock, vein or not.** The tile table already
  keeps the two colours close, but close is not hidden: in a field of one dark
  tone the eye finds the odd square instantly, and the first build had a town's
  veins legible through solid stone from across the map. Ore is drawn on the
  cut FACE only, which is where you meet it.
- **Rock stands up only where it has been opened.** A face is drawn on cells
  whose southern neighbour is carved — the same "draw the edge where the surface
  actually ends" rule as roofs and wall runs. Solid rock stays flat, which is
  also honest: you cannot see into it.
- **Building stops at the shaft.** `world.build` and `world.furniture` are
  surface records with no layer in their keys, so a wall placed from below would
  silently stand up in the field above. Rather than teach every build path a
  layer for something the design doesn't ask for, the tunnel simply isn't
  somewhere you build — and descending puts down whatever you were holding.
- **Distance stopped being enough the moment a coordinate meant two places.**
  Talking and `witness`'s friendship radius both measured plain distance;
  underground that warmed villagers walking over your head, through the ground,
  having seen nothing. Both now ask the layer first.
- **Erase fills a shaft in.** ACT has no undo, and a hole in the lawn from a
  mis-tap is the one dug tile that isn't cheap to live with — so the take-it-
  back verb takes it back. What you cut underneath stays cut: it closes the lid,
  not the tunnel.

### 4a step 3 — ore, and slate, **done**

A vein became a row in `content/nodes.ts`, `sim/mining.ts` owns the deep find,
and ore joined the Menace's counter. **No schema change and no migration** —
see the regrow note below for why that fell out rather than being arranged.

What the build settled:

- **The pick takes ore; you never change tools at a face.** Underground the
  shovel already cuts rock, and ore and rock are met at the same face in the
  same swing — so `undergroundTarget` lights a vein for the shovel as well as
  for the gather tool. Same argument that let the second dig on a tile become a
  shaft: no new tool, no new button, for a distinction only the code cares
  about.
- **The reticle already said which it was, for free.** It colours by kind, so a
  vein ahead reads green (gather) where plain rock reads white (tool). That is
  the whole tell, and it is the right amount: you learn what's in front of you
  by standing in front of it, never by reading veins across a dark room.
- **Veins never regrow, and that is the claim rule rather than a hole in it.**
  Underground there is no unclaimed ground — every open cell is one you cut — so
  a vein coming back would re-block a corridor you had already paid for in taps,
  the exact outcome regrow-unless-claimed exists to prevent. What replaces
  regrowth below is DISTANCE: the rock is unbounded, so ore is never scarce,
  only further off.
- **Which is why there was no migration.** `world.regrow` is keyed `"x,y"` with
  no layer in it, and it stays a surface-only record because the only node that
  never comes back is the only one that lives underground. That is a coincidence
  worth naming, so `mining.test.ts` asserts it: the day something underground
  regrows, that map needs a layer and every deployed save needs rekeying.
- **A vein yields 4 — less than a rock — and the trek is why.** You reached it
  through a tunnel you dug, so the walk already did the work a number would
  otherwise have to. Paying twice is how the underground becomes a grind.
- **Ore is an alternative at the counters, never a requirement.** DESIGN now
  says so by name, and two tests assert it (`shop.test.ts`, `seeds.test.ts`): a
  row may list ore beside the wood and the carrots; no row may list it alone.
  The old "never ore" exclusions were about ore being *unobtainable*, and that
  reason expired — the rule that replaced them is the one that always mattered,
  because a row payable only in ore is the underground made compulsory by the
  back door.
- **Errands still never ask for ore, and now for a better reason.** A card names
  one item and offers nothing instead of it, so an ore card is "go underground
  or miss this friendship beat" — and it is the first place friendship is earned
  by doing. The counter may take ore *precisely because* every row there lists
  alternatives. The distinction is "does this offer a way out", not "is this
  obtainable".
- **Slate has no giver, and shouldn't.** Every other locked finish comes from
  somebody — the Menace has standards, the Gremlin has a facility, the Ghost has
  her dark wood. Slate is simply what the deep rock is, so it unlocks in
  `mineVein` at `SLATE_DEPTH` (12, about a screen of tunnel past a landing) and
  the map pays out rather than a character handing you a reward. Its hint has
  said exactly this since the table was written.
- ~~**No `witness` underground**~~, following carve's precedent: nobody was down
  there, and the town hearing about it would be the memory log inventing an
  audience. **Revisited in 4b, exactly as predicted here** — company put somebody
  genuinely in the tunnel, so `witness` gained `onlyPresent` and both the vein
  and the cut now call it. Whoever came with you remembers; nobody else does.
- **No "deepest reached" counter anywhere.** The unlocked list is the whole
  record. A high-water mark is a score, which is the thing the museum went to
  such lengths not to be.

### 4a step 4 — the deep, and who lives in it, **done**

`sim/mole.ts`, a warren in `generatedUnderTile`, deep junk on the pick, and his
two dialogue banks. **No schema change and no migration** — see below; that fell
out rather than being arranged, for the second step running.

**Depth could not pay out as a curve, and that decided the shape.** More ore
further down is the grind step 3 refused; a ladder of unlocks at 12/24/36 is the
high-water mark step 3 refused for slate. So what the deep rock has that the
shallow rock hasn't is (a) things in it and (b) somebody living in it, and the
somebody is the reward.

- **Junk in the rock, one threshold, no ramp.** `carveWithFind` mirrors
  `digWithFind` — same order rule, same reason, and underground it is nearly
  free: uncut rock is un-edited rock by construction, so there is no "virgin
  ground" question to get wrong. The threshold (11, one short of slate) is
  fiction rather than balance: near a shaft you are under ground you already
  turned from above. Its own salt, so a cell doesn't hold the same answer on
  both layers, and its own find table, because somebody's bent spoon thirty
  tiles into solid stone would quietly say the underground is just more lawn.
  It exists so the antiquities wing stops running entirely on the lawn.
- **His rounds are what you find, not his chamber.** A lone chamber in unbounded
  rock is a lottery — a straight tunnel in a random direction misses it forever.
  So the warren is a wandering corridor at ~30 tiles that closes on itself, and
  any tunnel going outward crosses it. Asserted in `world.test.ts` by walking
  six bearings out from the origin. Following it to him is the exploration, and
  it needs no marker, which is what keeps "secrets are never spoiled by UI"
  true while still making him findable.
- **He is generated, so `is solid rock everywhere` stopped being true** — and
  the test was corrected rather than the generation. That test is now the
  clearest statement of the rule: solid everywhere *except* the one place
  somebody else has been digging.
- **He is not in `CAST`, and `SecretId` exists to keep him out of it.** The
  table's own closing note says secrets belong in no table; a `Record` keyed on
  an id that included him would have quietly made that false. His def is
  derived, the way a newcomer's is.
- **Nothing conjures him. Standing in his chamber does.** `ensureFixedCast`
  appends missing institutions to live saves because a counter with nobody
  behind it is a bug — but a secret a migration hands you is not a secret, it
  is a fixture you have not visited yet. Asserted: a migrated v16 save has no
  Mole in it.
- **His position is an ANCHOR, not a coordinate.** `StopAnchor` grew `"warren"`,
  resolved in `housing.ts` from the seed. Content states the anchor and sim
  answers it — the rule that keeps content free of the world, which happens to
  be about beds everywhere else. The alternative was a coordinate in the table
  that nothing reads, which is what got `CharDef.home` deleted in 2b step 3.
- **`Villager.layer`, and NO schema bump.** "The player is the only thing that
  carries a layer" (types.ts) stopped being true the moment somebody lived down
  there. The field is optional and its absence means the surface, which is the
  truth for every villager in every deployed save — so there is nothing to
  backfill and nothing a migration could honestly do. Every schema *change*
  still ships a migration; an optional field whose absence is already correct
  is not a change to any existing save.
- **Two distance checks had to become layer checks, and one of them was live.**
  `witness` gated on "is the player on the surface", which was equivalent while
  everyone lived up here; with a villager under a fixed coordinate, digging a
  shortcut to him and then working the lawn ABOVE his chamber warmed him
  through the ceiling. The renderer's villager pass was the same shape — a flat
  skip underground, now a filter both ways.
- **He digs while you're away, and it is the only thing he gives.** It obeys
  the away rules by construction rather than by care: `carve` only turns rock
  into floor, so it cannot destroy anything, and it refuses ore, so he walks
  past a vein and leaves the metal for you. It is also the one away event whose
  change lives underground — allowed precisely because it asks nothing.
- **He gives no directions**, and that is a rule and not an oversight. A hermit
  who tells you where things are is a map marker with a face.

Two things the browser found that every test was green on:

- **He was offered a room in the plaza.** The dialogue panel's home offer keys
  on "there is a bed in town", which was a complete description of who could be
  housed right up until somebody existed who lives somewhere on purpose. The
  panel called him a Farm resident, too; he is now labelled by where he is
  rather than by who he is.
- **Meeting him is silent, and that had to be checked rather than assumed** —
  there is no toast, no fanfare, and the discovery is that a sprite is standing
  in a room you just cut into. Verified with `scripts/drive.mjs`, which can now
  import the sim's own modules from the dev server (`import("/src/sim/world.ts")`)
  rather than porting generation maths into the harness and getting it subtly
  wrong.

**Settled in step 4's planning: if you sink a shaft next to something deep, it stops
being deep, and nothing tries to stop you.** Depth is distance from your nearest
entrance, so a hole dug above the Mole makes his ground shallow — he does not
move, does not hide, and is not protected. You paved a road to the hermit and
the map simply agrees that he now lives near a road.

This was on the list because it should be a DECISION rather than a side effect
of how `depthAt` happens to be written, and the two rejected answers are worth
recording. Moving him further out when you approach makes the secret chase you,
which is a game asking to be beaten rather than a place. Freezing his ground
deep needs a "how deep was this when you found it" record, which is the
high-water mark that step 3 refused to keep for slate, for the same reason: it
is a score.

Spoiling it by your own convenience is also the funnier and more on-tone
outcome (CLAUDE.md §Tone), and consistent with the town's other institutions
being demolishable — nothing here is protected from you.

What that meant for his *dialogue* is now built, which is where it belonged
rather than in the map: `MOLE_SHALLOW` is a whole second bank, entered the
moment `depthAt(chamber)` drops under twelve, and read off the LIVE world rather
than off a memory — the same call Margfrom's dissent makes, for the same reason.
Gating it on an away roll would mean he hadn't noticed the ladder. He does not
move, does not hide, and is not protected; he just has an opinion.

**Phase 4a is done.** It left one thing open, and 4b closed it: mining and
carving called no `witness`, so a player who only mined earned no memories. Step
3 left that pending somebody being down there to see it — somebody now was, but
he is not the town, and `witness` wrote to every villager regardless of where
they stood. The proximity model that needed was 4b's business, and 4b has it.

### 4b. Company — **done**

`sim/company.ts`, `sim/friendship.ts`, schema **v20**. Ask somebody to come
along; they walk with you until their own day ends. The whole feature is one
nullable field (`world.company`) and a redirected walk target, which is the
point rather than an economy: company shipped alone would have been a
follow-behind, and a follow-behind is a pet.

What the build settled:

- **ONE SLOT, NEVER A PARTY**, for the reason a commission and an errand are one
  slot. Two followers is a retinue, a retinue is a parade, and a parade is the
  town coming with you instead of you visiting it.
- **NOBODY IS PAID.** There is no completion, no trip length, no distance
  walked, and `company.ts` contains no `add`. Friendship grows because `witness`
  already warms whoever was standing there and a companion is by definition
  standing there — doing things together IS the payment (DESIGN §Company). A
  trip you could bank without doing anything would be a timer you leave running.
- **A GOODBYE COSTS NOTHING**, and re-inviting costs nothing either. No
  cooldown, because a cooldown is what turns "not today" into a move — the same
  argument the errands board's single gap makes.
- **THE SIX COUNTERS STAY PUT, AND THE DOG DOESN'T.** `ROOTED` is a list rather
  than `def.fixed`, deliberately: a shop that follows you is a shop that's shut,
  but the Dog Thing's institution is a ROUND, DESIGN's own example of company is
  "the Dog Thing on errands", and the board was already made readable with
  nobody at it. He is the one institution that can leave because he is the one
  that already does. The Mole is excluded for his own reason — he does not go
  up, and he says so unprompted.
- **GATED AT `familiar`.** A stranger saying yes to "come with me" reads as a
  follow command; one tier up it reads as somebody who knows you. It is also the
  lowest tier there is, so it's a threshold you cross by playing.
- **THE CLOCK ENDS IT, NOT A LEASH.** `dayOver` is ONE PREDICATE WITH TWO USES —
  it refuses the invitation and it sends the companion home. Two rules would
  drift, and the drift would look like somebody you could re-invite one second
  after they said goodnight.
- **THEY COME DOWN THE LADDER.** `takeAlong` fires inside `useShaft`, after the
  player's own layer flips. Somebody too far from the shaft is left behind on
  the surface — still your company, on the wrong layer, waiting rather than
  pathing through a ceiling.
- **`followTarget` AIMS AT YOUR TILE AND STOPS SHORT.** Picking a neighbour cell
  means picking a GOOD one — not in a wall, not in the doorway you're about to
  use — which is a small pathfinding problem solved badly every tick. Aiming at
  the player lets `sim/path.ts` answer it, and it's why a companion follows you
  through a door instead of standing outside trying to occupy the wall.

**And it closed 4a's loose end.** `witness` gained an `onlyPresent` flag, and
mining and carving finally call it. Underground work took no memory at all
before, because the town remembering a hole it cannot visit would be the log
inventing an audience — and the fix was blocked on there being somebody down
there to remember it INSTEAD. Now there can be. Note what it deliberately does
NOT do: apply proximity on the surface. News genuinely travels in a town this
small, and a village where nobody hears you laid a floor unless they watched
would be a quieter, worse place. Proximity is what a tunnel needs, not what the
town needs.

`sim/friendship.ts` is a split, not a new system: `befriend`, `friendshipTier`
and `atLeast` moved out of `villagers.ts` — the WALKING file — because leaving
them there meant `company.ts` importing the module that imports it, and a cycle
through the middle of the tick loop is a bad thing to own for one two-line
predicate.

Two new memory kinds, `company` and `delved`, and they are the **first memories
that are not town-wide**: `partWays` writes to the person who took the trip and
to nobody else. They sit at the TOP of `MEMORY_PRIORITY`, above even a festival
— a festival is twelve times a year with the whole town at it, and a day
underground was the two of you. Every form has lines for both, for the reason
every form has an errand line: the line IS the payment, and a bank only the
Scholar had would mean the beat worked one time in six.

**Next: 4c secrets**, then crops/seasons.

### 4c. Secrets — **done**, all three

The dark grove and the Quiet Ghost, the Humming Cube, and the Stray Cosmos.
`sim/presence.ts`, `sim/ghost.ts`, `sim/cosmos.ts`, `sim/hum.ts`,
`content/showers.ts`, two tile rows, one node row, one memory kind.
**No schema change and no migration** — the third phase running where that fell
out rather than being arranged. Everything here is either derived from the seed
(the two landmarks), derived from the real calendar (her five nights), or
already serialised (a villager in the array).

**PRESENCE IS THE SPINE, and it fixed a bug that was already in the build.**
"Is this villager here right now" did not exist as a question, because for
everybody in the town the answer is yes at every hour. The renderer knew half of
it — it has skipped ghost-form villagers by daylight since before there was a
ghost — but the renderer is not the only thing that asks: `villagerNear` and
`tryTalkNearest` filtered on LAYER ALONE, so a Ghost in the villager list would
have been **tappable at noon, invisible, in an empty clearing**. `present(v,
now)` is now one predicate with four callers, and the fourth is `witness`:
somebody who is not here cannot have seen you do anything. Asserted in both
directions — she takes no memory of a tree felled at noon, and does take one
from the same swing after dark, which is what makes the first assertion bite.

- **The grove is the giver, not the Ghost.** Walnut was the last unobtainable
  finish, and the easy answer — an arrivals row, house her, receive the wood —
  is exactly what DESIGN's "secret forms stay secret in spirit" forbids: a Ghost
  who moves in one afternoon is a resident with a theme. So it works the way
  slate does. Felling a dark tree unlocks it, in `gather`, with a line about the
  WOOD and no mention of an unlock. **The two discoveries are independent**: the
  wood is there by day and she is there by night, and you can walk home with
  walnut having never learned there was anyone out there.
- **A dark tree differs from a tree in ONE number.** `content/nodes.ts` claimed a
  fourth row would be four numbers and no logic; it turned out to be one (its
  tile). Same drop, same yield, same regrowth — because it is not a better tree.
  `density: 0`, which is not a stub: every other node is scattered by a hash, and
  a dark tree outside the grove would make the grove ordinary.
- **The clearing needed TWO rules, and the second was found on screen.**
  `inGrove` declining to place her trees at the centre is not a clearing — the
  ordinary tree hash cheerfully fills it, and she stands inside a trunk. Hence
  `inGroveClearing`, checked before the scatter.
- **THE SEA. Found in the browser, invisible to every test.** A riverside town is
  open water from x = -13 westward *without limit*, and the river answers before
  anything else in `generatedTile` — so a bearing picked from the seed alone
  drowned the grove in about half of all riverside towns: trees in the ocean,
  unreachable, with a Ghost in them. The fix is on the SITE (`onLand`, which
  mirrors x), not on the generator's order — putting the landmark branch above
  the river grows trees in the sea, which is the same bug rearranged. Every
  landmark goes through it, so a fourth cannot forget.
- **Two id blocklists became one predicate**, and this too was already broken.
  `isSecret` replaced `villagerId !== "mole"` (the room offer) and a `"mole"`
  string in `ROOTED` (the invitation) — and it caught a live 4a bug on the way:
  `possibleAskers` had no opinion about secrets, so **from the moment you met the
  Mole the board in the plaza could post "Maverick Mole would like two
  potatoes"** — the town publishing a notice about somebody the town has never
  heard of. `ROOTED` also stayed an INSTITUTIONS list rather than absorbing them:
  a counter nobody is standing at is not why a Ghost can't come with you.
  Note `dayOver` would have refused her for nearly the opposite of the truth —
  past nine, no home stop — so `isSecret` gates before it.
- **The Cube hums and does nothing else**, which is the museum-donation rule
  applied to a place: no item, no finish, no unlock, and nothing gates on it.
  Asserted as a negative, the way the heap and the museum are. What the walk
  produces is a MEMORY in whoever you brought, `onlyPresent` like the tunnel —
  and it sits at the top of `MEMORY_PRIORITY`, above even `delved`, because it is
  the only payout there is and an ordinary Tuesday's dig must not crowd it out.
  Every form has a line, the errands rule at its strongest.
- **Solidity is the whole of its protection.** You cannot stand on it, so the
  shovel and the hoe (which act underfoot) can never reach it; it has no
  `NodeDef`, so gathering ignores it. Untouchable without a single rule saying
  so — better than a rule, because nothing here is protected from you on purpose
  (the Mole's road).
- **The hum is the first sustained sound in the game.** `CUES` is one-shots by
  construction, so `setHum` is new machinery: a retained oscillator pair through
  a lowpass, ramped with `setTargetAtTime` (a step is a click, and a click is the
  sound of a game object rather than of something already going), torn down at
  zero and on mute. The FALLOFF lives in sim (`sim/hum.ts`) because it is a fact
  about distance and therefore testable; the UI keeps one line. Twelve tiles and
  squared, so it **confirms rather than steers** — a drone you could follow from
  off screen is a map marker with a frequency, which is the shape "he gives no
  directions" refuses. Muted players lose nothing: the Cube is *visible*.
- **The Cosmos rides the real meteor showers** — Quadrantids, Lyrids, Perseids,
  Orionids, Geminids, on their actual peak nights. The festivals took the real
  calendar as far as a town can; this takes it past the town, and a player who
  looks up on the twelfth of August finds the sky doing what the game said.
- **A night belongs to the evening it began in.** Two in the morning on the
  thirteenth is still the twelfth's shower to anybody standing outside in it, so
  `showerTonight` rolls back before the lookup — by SUBTRACTING FROM THE
  TIMESTAMP rather than decrementing the date, which hands month ends, year ends
  and leap days to the platform. Without it she vanishes at midnight, in front
  of you.
- **She is never removed, only absent.** Deleting her between visits would throw
  away the friendship and memories of every previous year, and the whole payoff
  of the second August is that she has met you before. `present` is what makes
  her a visitor rather than a resident.
- **She lands on the homestead**, because five nights a year in unbounded grass
  is a lottery — the exact failure the Mole's ring corridor was built to avoid.
  A lottery is not a secret, it is a shrug.
- **No away event for her, deliberately.** The festival precedent is that the one
  you missed turns up in the postcard, but a postcard telling a player who has
  never met her that something passed over is the UI spoiling a secret. The
  Mole's guard (`if (!moleMet) return null`) is the shape if it is ever wanted.
- **`speak` and `talk` now take `now`**, because one voice depends on the date.
  Threaded rather than read off the clock inside sim (CLAUDE.md §Architecture),
  which is the only reason her five nights are testable without waiting for
  August.

Two things the browser found that every test was green on: the sea, above, and
**the Cube was a headstone** — eleven pixels wide and seventeen tall, drawn as a
flat slab. It is built the way furniture is built now (top surface plus near
face plus a hard silhouette), a full tile wide, and it reads as something
somebody put there.

### 4d. Crops and seasons — not started

- More crops, seasons.

---

## Known gaps and loose ends

Small things that are half-built or deliberately stubbed. Worth knowing before
you trip over them:

- ~~**One of the three non-starter finishes is still unobtainable.**~~ **Fixed in
  4c.** `whitewash` arrives with Bissenette's commission (3b), `slate` is mined
  twelve tiles of tunnel out (4a), and `walnut` is now felled in the Ghost's
  grove. **Every finish in `content/skins.ts` is reachable**, which makes that
  table's own promise true for the first time.

  Note *how* walnut arrives, because it is the part that was under discussion
  for two phases: **she does not give it to you.** The grove does. She is out of
  the arrivals table permanently — a Ghost who moves in one afternoon and gets
  commissioned a house like anybody else spoils the one thing about her worth
  keeping (CLAUDE.md §Tone) — and her hint, which has read "The Quiet Ghost
  knows where the dark wood is" since before commissions existed, turns out to
  have been literal all along. She knows because she lives in it.
- **Only the Scholar has a full home bank.** `RESIDENT_HOME` covers every form,
  but the other five get one or two notes each — a form with no line for its
  richest note falls through to one it can speak to, so nobody goes silent, they
  just repeat sooner. Filling these in is writing, not engineering.
- **The Gremlin doesn't scatter junk while you're away yet.** His away event
  still only moves a board. Scattering would tie junk to the check-in loop
  (pillar 3) and give a homecoming a lap of the town, but it needs somewhere to
  put a loose object on the ground — a new tile or a small world layer — which
  is its own decision and was deliberately not improvised alongside the rest.
- ~~**Ore is defined but unobtainable.**~~ Fixed in 4a step 3. `canCarve` still
  refuses ore — cutting it away with the shovel would drop the metal on the
  floor — but a vein is a node now, so the same swing gathers it. All three
  gathered classes are obtainable, which makes DESIGN's "three gathered classes,
  ever" true for the first time rather than aspirational.

  **Nothing is BUILT from ore yet**, and that is the deliberate half. Settled
  when step 3 was planned: ore's sink for now is the Menace's counter (and the
  museum row that always existed), and ore-costed objects — a lamp, a stove,
  something metal-framed — come later. They must stay optional when they do: a
  wall or a bed that cost ore would gate housing behind digging.
- ~~**Six of the seven fixed cast exist.**~~ **All seven now do** — office,
  shop, heap, museum, seed stall, errands board, plaza stage. DESIGN's
  institution table is complete; the note at the foot of `src/content/cast.ts`
  that listed what was missing has nothing left on it.
  Residents are no longer limited to one:
  `content/arrivals.ts` holds four, and the town takes them in one at a time.
  Note the queue **runs out** rather than looping — the fourth Rummage would say
  more about the table than about the town.
- **Finishes are town-wide for FLOORS, per-cell for structures.** Walls and doors
  store their own finish (v5), so two houses can differ. Plank floors still read
  the town-wide selection and restyle all at once; worth unifying when floors
  next get touched.
- ~~**Villagers walk through walls and furniture.**~~ Fixed in 2b step 1
  (`sim/path.ts`), and verified on screen in step 2: Margfrom walks from the
  plaza, through her own doorway, to her bed, standing in a wall at no point.
- ~~**A door on an east or west wall is invisible.**~~ Fixed in Phase 3a. The
  planned fix — "draw a doorway on a side wall's top run" — turned out to be
  impossible twice over, which is worth keeping: a north-south run is seen
  edge-on so its face has **zero width**, and its top surface is covered by the
  roof cell of the row in front of it. Neither the wall's face nor its top is
  available, so the cue had to leave the wall layer entirely. Two now do it: the
  roof is pulled back over the doorway (breaking the silhouette where the way in
  is), and every door gets a flagstone **doorstep** on the ground beside it,
  which is the only surface still in view outside a roofed house.
- ~~**Nothing guarantees a PLAYER-built house has a clear doorstep.**~~ Fixed in
  Phase 3a. `blockedDoorsteps()` in `sim/structures.ts` asks `isWalkable` — the
  one predicate the player, the villagers and the pathfinder all collide against
  — so solid furniture counts as well as terrain. Build mode marks the cell to
  **clear**, not the door, and it's a warning rather than a refusal: a half-built
  house has sealed doorways constantly, and placement must never be gated on a
  judgement about whether a building is any good.

  Both approach cells count, not only the outside one. Telling them apart needs
  the room index, and the answer is the same either way — that step has to be
  clear — so `structures.ts` doesn't acquire the dependency.
- **Furniture doesn't invalidate a walking villager's route.** `bump()` in
  `sim/structures.ts` fires on wall and door edits only, but `isWalkable`
  counts solid furniture too — so a route computed before you drop a table
  across a corridor stays "valid" and the villager walks through it. Found
  while wiring step 3, pre-existing since step 1, and not what step 3 changed
  (moving a *bed* alters the goal, which does invalidate). The fix is for
  furniture placement to bump the same counter; the cost is that the rooms
  cache recomputes on furniture edits too, which is a bounded flood fill on a
  user action and almost certainly fine.
- **Undo covers BUILD strokes only, not ACT.** Digging, tilling, planting and
  felling go through `contextAction` on the tile underfoot, which has no stroke
  — it's one tile, one tap, and the ground is cheap to redo. Deliberate: what
  undo exists to protect is the *arrangement*, and a single dug tile isn't one.
  If ACT ever gains a drag, it should gain a stroke with it.
- ~~**Villager "witness" has no proximity model for memory.**~~ Fixed in 4b.
  `witness` takes `onlyPresent`, and mining and carving use it. The surface is
  still town-wide **on purpose** — see 4b above; proximity is what a tunnel
  needs, not what the town needs.
- **PWA icon is a single SVG.** Real raster icons before any app-store-ish push.
- **Build mode can't pan on touch.** You build within the visible screen; to
  build elsewhere, leave build mode and walk (or use WASD, which still works in
  build mode on desktop). An edge-drag pan is the obvious fix when it starts to
  bite.
- **The occlusion fade almost never fires now.** It's keyed to the OVERHANG,
  `(artPx - TILE) / TILE`, which at 24px is half a tile — so a thing one tile in
  front of you covers your legs and is left alone, because that overlap is the
  depth cue. It exists for genuinely tall pieces; roofs will be the first real
  user.

---

## House rules for whoever picks this up

- Read `DESIGN.md` first; it is the source of truth. If code and doc disagree,
  **fix the doc first**, then the code (CLAUDE.md).
- Build the current phase before expanding sideways.
- Every schema change ships a tested migration. The game is live.
- **`npm test` does not typecheck — run `npm run build` before pushing.** Vitest
  transpiles without checking types, so a fully green test run can sit on top of
  a `tsc` error and the Vercel deploy is the thing that finds it. It has already
  happened once: the shop commit shipped a type error in `save.test.ts` (an
  object spread of a `Record<string, unknown>` drops the index signature, so the
  helper's inferred return type had only its literal keys) and two deploys
  failed in a row while the tests stayed green. The error was in a TEST file,
  which is exactly why nobody looked — `build` runs tsc across those too.
- Verify rendering and interaction changes in a real browser, not just tests —
  the worst bugs so far all passed unit tests and failed on screen: gathering
  being unreachable, gathering hijacking the build tool, an upside-down tent, a
  doorway that went see-through when you stood in it. **Use
  `scripts/drive.mjs`** rather than writing a throwaway harness; its header
  documents the gotchas (tile size isn't fixed, the HUD swallows clicks,
  `beforeunload` clobbers seeded saves, evening screenshots are too dark to
  judge), each of which has cost an hour at least once.
- **Every panel needs a door.** A modal opened from the HUD must be closable
  three ways — its own button, a tap on the scrim, and Escape — because the
  satchel shipped with none of them and trapped the player on a phone, where
  there is no Escape key and no back gesture out of a canvas. `openModal(build,
  { dismissable: true })` wires the last two; the one-way flows (title,
  onboarding, land claim) deliberately opt out. Dismissal must run the CALLER's
  close, or `modalOpen` stays set and the game is frozen behind a vanished panel.
- **When the browser disagrees with the tests, suspect the harness first.**
  Three "bugs" this phase were the scaffolding: a house built centred on the
  player so the cutaway correctly hid its own roof, clicks landing on the HUD
  instead of the map, and a room placed off-viewport. Reproducing the exact
  state in a unit test settles it in two minutes.
