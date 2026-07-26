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
- Menu with New town / sound toggle; PWA shell; 304 tests.
- **Phase 3f — the museum, steps 1–6 of 8.** The table, the sim, schema v12,
  the gallery it stands in (v13), and Corrigal's panel. Two wings, donation is
  a gift that returns nothing, the record has no total and no denominator, and
  an exhibit physically appears on a case when you give it. **It is playable:**
  talk to her, hand something over, read the card she writes, walk out past it.
  Steps 7–8 are the away event and Margfrom's perk.

**Next:** Phase 3f steps 7–8 — the Scholar remounts an exhibit while you're
away (`remountExhibit` already exists), then Margfrom's disagreeing reading.
Then the last three institutions (seed stall, errands board, plaza stage) and
festivals.

**Save schema is at v13.** Every change ships a tested migration — see
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

### 3f. The museum — **planned, not built**

The model is settled above. This is the build order; steps 1–4 are one commit.

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
7. **Away event** — DESIGN §Time already promises "the Scholar mounts a new
   wrong exhibit". With several placards per row that is: pick a donated
   exhibit, advance its placard index, put it in the postcard. No new content
   axis.
8. **Margfrom's perk** — she offers her own reading of a recent exhibit, and it
   disagrees with the curator's.

~~**Open:** the curator needs a name.~~ **Settled: Corrigal.** A specific
scholar, not "Little Scholar" — same footing as Bissenette vs. the Fancy Little
Menace, and Margfrom is now just a scholar who lives here. The name is one
string in `cast.ts` and nothing keys on it, so it stays cheap to change.

### The rest of Phase 3

- The remaining three fixed cast + their institutions: seed stall (Blessed
  Carrot), errands board (Loyal Dog Thing), plaza stage (Dramatic Blob).
- Festivals on the real calendar.

---

## Phase 4 — Depth

- **The underground layer.** The last aspirational line in CLAUDE.md ("surface +
  underground layers"). The chunk API is already shaped to take a `layer` axis.
  Brings ore into reach, and the Maverick Mole at the bottom.
- **Company** — invite a villager along (DESIGN §"Company"). Nothing else in the
  three inspirations does this.
- **Secrets** — the Quiet Ghost exists only in the renderer's night-gating today;
  no ghost villager exists to see. Stray Cosmos, the Humming Cube landmark.
  Remember: secrets are never spoiled by UI, no "???" slots.
- More crops, seasons.

---

## Known gaps and loose ends

Small things that are half-built or deliberately stubbed. Worth knowing before
you trip over them:

- **Two of the three non-starter finishes are still unobtainable.**
  `whitewash` now arrives with Bissenette's commission (Phase 3b), which is what
  its unlock hint always meant. `walnut` belongs to the Quiet Ghost and `slate`
  is found by digging deep — both Phase 4, and both deliberately NOT bolted onto
  a commission. A Ghost who simply moves in one afternoon would spoil the one
  thing about her worth keeping (CLAUDE.md §Tone), so she stays out of the
  arrivals table until secrets are built.
- **Only the Scholar has a full home bank.** `RESIDENT_HOME` covers every form,
  but the other five get one or two notes each — a form with no line for its
  richest note falls through to one it can speak to, so nobody goes silent, they
  just repeat sooner. Filling these in is writing, not engineering.
- **The Gremlin doesn't scatter junk while you're away yet.** His away event
  still only moves a board. Scattering would tie junk to the check-in loop
  (pillar 3) and give a homecoming a lap of the town, but it needs somewhere to
  put a loose object on the ground — a new tile or a small world layer — which
  is its own decision and was deliberately not improvised alongside the rest.
- **Ore is defined but unobtainable** until the underground layer exists. This
  is intentional, not an oversight.
- **Three of the seven fixed cast exist** — office, shop, heap. The intended
  full mapping is recorded as comments at the foot of `src/content/cast.ts`;
  the museum is planned in 3f. Residents are no longer limited to one:
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
- **Villager "witness" has no proximity model for memory** — everyone hears about
  everything (friendship *is* proximity-gated). Fine in a town this small.
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
