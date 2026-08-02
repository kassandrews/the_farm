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
- **Phase 5 — biomes, step 1 of 4, complete.** The world is navigable: six
  regions, colour and density only, nothing gated. The chunk cache is bounded now
  too. Still to come — cosmetic wood variants, more arrival rows, contiguous
  outward growth. See below.
- **Phase 3c — taste, complete.** Forms are quietly pleased by particular
  finishes and furniture, and say so. Delight only; there is no way to express
  the opposite.
- **Phase 3d — the shop, complete.** Barter at the Menace's counter, cloth, and
  soft furniture that costs it.
- **Phase 3e — the junk economy, complete.** The ground has things in it,
  digging finds them, and the Gremlin's heap turns them into finishes.
- Menu with New town / sound toggle; PWA shell; 630 tests.
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

- **Phase 4d — crops and seasons, complete.** Four seasons derived from the
  month, repainting the ground, the trees and the sky, and giving the town
  something to remark on — storing nothing, at schema v20. Eight crops instead
  of three: wheat takes the multi-day slot at 48h and belongs to no season;
  peas, tomato, pumpkin and kale each own one and are plantable in every month
  regardless, because a season is a look and never a gate. **Phase 4 is done,
  and so is every numbered item in this file.**

- **Phase 5a — the lamp, complete.** Ore builds something at last, and what it
  builds is light: a brass-headed post you install in a tunnel or on your own
  land, throwing a warm pool that does not know what time it is. It is also the
  first thing that can stand in the rock — `world.underFurniture`, schema v21 —
  and the Mole has a third bank of lines for finding one burning in his corridor.
  See below.

- **Phase 5b — the rest of the list, complete.** The four loose ends that were
  left, in one pass: the Gremlin scatters junk while you are away (a tile, not a
  new layer — see below), the five thin home banks are written, build mode can
  pan on touch, and the PWA has real raster icons. The furniture-route bug went
  with them.

**Next: nothing on the list.** Every numbered item is done, and so is every loose
end that was a gap. What is still written down under *Known gaps* is two
deliberate POSITIONS rather than work owed — undo covering build strokes and not
ACT, and the occlusion fade waiting for a genuinely tall piece. Each says why in
place. (The third, floors reading the town-wide finish, was the one with a
trigger condition attached, and the trigger fired: see §"Floors carry their own
finish".)

DESIGN's own open questions (fishing, async postcards between towns) are the only
unbuilt *systems*, and both are still deliberately open. What is left is not a
list of gaps but a pass over the whole game for feel — the fine-tooth comb.

**Phase 7 — the world out there — is DONE**, all three steps: biomes that get
stranger with radius (7a), found places as a standing category (7b), and the sky
as a layer rather than a height (7c).

**Phase 8 is the feel pass**, which the exploration phases interrupted three
times. **8a (one vocabulary), 8b (the fold), 8c (ground worth standing on) and
8f (built surfaces have a grain) are built** — see §Phase 8. It is a pass over
surfaces that already work, not a list of missing features, and it found what it
found by driving the game and photographing it rather than by reading the source.

**What is left of Phase 8, in order:**

1. **8g — furniture that looks like furniture.** The largest remaining gap and
   the cheapest to close: 8a's build-bar ICONS already draw a bed with a blanket
   and a pillow, a shelf with books, a patterned rug, and the placed pieces are
   flat rectangles. The art exists; it never reached the world. Mostly
   transcription — see §8f, where photographing a room found it.
2. **8d — the biome boundary.** Region patches are straight-edged blocks; it is
   the per-cell edges rule at region scale, and it wants what 8c did to the
   grass. Evidence captured (`shot-map`, `biome-border.png`), not started.
3. **8e — four more counter faces.** Nub, Winifred, Derek, Aurelio. One line
   each, plus the one open call about where the spoken line aligns.
4. **The plaza and the water are still flat**, which 8f left alone on purpose:
   they are terrain, so they belong to 8c's argument. The plaza now reads worse
   than the grass beside it because 8c reached the grass and stopped.
5. **A second survey pass, verified this time.** The first one covered the
   institution panels, night, autumn, winter and the underground, reported
   everything clean, and was wrong about the first panel anybody checked. Nobody
   has genuinely looked at the other five counters, the seasons, or the
   underground yet.

**Save schema is at v23**, and Phase 7c deliberately did not move it: the sky
stores nothing, so there was nothing to migrate, and bumping the number would
make a stale cached build reject a live save (see §7c). Every change that DOES
alter the shape ships a tested migration — see
`src/sim/save.ts`. Don't break this; the game is deployed and has live saves.

---

## Settled design decisions

These took real discussion. Don't re-derive them from scratch.

### Materials — the model

Recorded in full in DESIGN.md §Materials. The short version and *why*:

- **Three gathered classes, ever: wood, stone, ore.** One "ore" entry covers
  every metal. Resisting a fourth is deliberate.
- **Appearance is a separate axis, free WITHIN a material.** A finish (pale pine,
  dark walnut, slate) is a property of a placed tile, *never a different item*.
  This is the rule that keeps the inventory small: item count is the number of
  materials (three), not materials × looks (dozens). It's what stops this
  becoming the eleven-kinds-of-plank inventory sprawl that makes cozy games
  tiring. Since v27 a finish also NAMES its material and the material is what
  costs — pine to walnut is free forever, pine to slate is a rebuild in stone.
  See §"Floors carry their own finish" for the argument.
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
- **And dug earth grasses over, on the same terms** (12h, longer than either
  node, so you never watch it happen — you come back and it has closed). This
  was missing until the biome pass noticed it: a felled tree returned but a hole
  stayed bare for the life of the save, which made the shovel the only verb in
  the game you had to tidy up after. Nothing here may become a tidying job, so
  the rule is symmetric — `world.reclaim`, its own record because a NodeId is a
  thing you can gather and "grass" must never be one. v22 reconstructs timers
  from the DIRT already on the map (skipping tiles a node is coming back to),
  which makes it the first migration where an empty record would have been the
  *wrong* backfill: every older town has been digging holes all along.
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
- **The picker belongs to the hand, not the satchel** — settled later, after the
  row shipped inside the satchel panel and the reported bug was "you can unlock
  seeds but there is no way to plant them". It was reachable the whole time; it
  was three taps and a scroll into a drawer you open to read counts, so a variety
  bought at the stall was a variety you never found. Nothing between the counter
  and the soil mentioned it existed. It now appears in the act palette while the
  plant tool is held (`syncSeedUi`), which is the finishes' argument a third
  time: **you pick the look while you are already holding the thing you are about
  to dress.** This is not the modal the entry above forbids — nothing opens on
  ACT, nothing stands between the tap and the tile, and the mode is still a mode.
  It only made the standing selection visible where it applies.
- **A chip row goes ABOVE the tools, never beside them.** Beside the palette it
  had only the strip between the tools and the BUILD/ACT column — about 170px on
  a phone — so eight varieties stacked into one column eight chips tall and ate
  40% of the screen. Above them the row has the full width, wraps to three short
  lines, and clears the BUILD/ACT column, which only occupies the bottom band.
  The tool column and the row now ride in one bottom-left stack (`.act-dock`) so
  the row can change height without anything needing to know how tall the tools
  are, and nothing under your thumb moves when it does.
- **The memory kind is the act; the value is the crop** — schema v30. The kinds
  were `planted_carrot` and `harvested_carrot`, named after the crop the slice
  shipped and then outliving it by seven varieties. A note in `game.ts` argued
  the rename was not worth a migration "to fix a word no player ever sees",
  which was true about players and wrong about the code: the next person to read
  the union sees it, and a kind that names a crop it no longer means is how
  somebody eventually writes the carrot branch that shouldn't exist.
  - The rename was the cheap half. The real bug it was hiding: `planted` was
    witnessed with `value: undefined` while `harvested` passed `def.carried`, so
    the town could remember that you planted but never **what**. A villager could
    say "you pulled a radish" about the harvest and, about the sowing, only
    "you've planted". Planting now carries the crop the same way harvesting does.
  - **The migration walks all three logs or none** — `places`, the player's
    memory, and every villager's — the same walk v26 did for `built_plank`. A
    kind left behind in any one of them is a memory that still exists and can
    never be spoken again, because nothing matches it. The failure mode is
    silence, which looks exactly like nothing having happened.
  - **It backfills the forgotten crop to `"something"`.** A bank line that reads
    the value renders a hole for every memory made before v30 —
    `tmpl(ev.value ?? "")` turns a missing value into nothing at all. "Something"
    is the honest answer (the town watched you plant and does not remember what)
    and keeps the memory speakable instead of dropping it.
  - **`x` tells a place from a memory, not `at`.** Both carry `at`, so it reads
    like a discriminator right up until the backfill puts a `value` on every
    place entry in the save. A place is a coordinate; a memory is not.

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

### Floors carry their own finish — schema v27

**Built.** The reported bug was "picking a floor skin recolours the whole game."
It was narrower than it sounded and hid a second one underneath.

- **Only floors ever moved.** Walls, doors and furniture have stamped their
  finish onto the placed cell since v5/v6, so two houses could already differ.
  Floors couldn't: `placeFloor` wrote a bare tile id into `overrides`, so there
  was nowhere to put a finish and the renderer had to ask the town — a live
  filter over the world, which is the exact opposite of what `finishFor`'s own
  docblock claimed a finish was. This was the known gap with a trigger condition
  attached ("wants doing when floors are next touched"), and the trigger fired.
- **The stone finishes were worn by nothing.** `StructureDef.finish` was typed
  `"wood" | "stone"`, but wall and door were both wood and every furniture row
  was wood or cloth. Granite shipped as a starter, slate paid out twelve tiles
  down a tunnel, cobble cost twelve junk — and picking any of them changed
  nothing on screen. The three-row satchel picker is what hid it: it showed a
  Stone row because finishes existed, not because anything could wear them.

The decisions, and why:

- **Floor, not Plank.** A tool called Plank that can be slate is contradicting
  itself in the toolbar; "plank" names the material and the whole point of the
  axis is that material and look are separate. The tile const is `FLOOR` now.
  **The tile NUMBER stays 2** — it is written into every chunk override in every
  save — and so does the icon id.
- **A def declares a LIST of classes, and the player never sees a class.**
  `finishes: SkinClass[]`; floor and wall take `["wood", "stone"]`. The build bar
  shows every unlocked finish the held tool can wear, in table order, so the
  boards come out before the flagstones without anyone sorting anything.
  `SKIN_CLASSES` / `SKIN_CLASS_NAMES` are gone from the UI entirely. Written into
  DESIGN §Materials as a rule, because a wood/stone/cloth menu is the kind of
  thing that gets re-added by someone being helpful.
- **Cost follows the material; the look is free within one.** A bare `cost`
  number means "N of the finish's own material" (`items.BuildPrice`); the three
  classes are spelled exactly like the three items, so the substitution is the
  identity. Re-finishing pine→walnut is free forever on things already built;
  pine→slate is a rebuild and costs the stone. That is what keeps "the look is
  free" literally true while letting a stone floor actually be stone. Price
  everything in wood and granite is made of boards, which the player can see
  through; price every finish separately and your town looks like your inventory
  instead of your taste.
- **The lamp is why `BuildPrice` has two shapes.** Its post takes wood finishes
  and it costs ore. A bare number would have quietly repriced it in timber, so a
  record is still legal for the case where look and materials are unrelated.
- **`skins.selected` is keyed by TOOL now, not by class.** Once a floor may be
  either material there is no single class to key on — picking slate for the
  floor is a statement about floors, not about stone. Per tool also gets the
  behaviour you want for free: a pine floor under whitewashed walls is an
  ordinary thing to want, and a class key made the two fight.
- **The default finish is stored as ABSENCE.** `world.finishes` is sparse in the
  strong sense: no entry means pale pine, and `placeFloor` deletes the key rather
  than writing it. The map is the size of the choices you made, not the size of
  everything you ever paved. **First version of that line was wrong** — it
  compared against the default for the finish's own class, so a granite floor
  (granite being the stone default) cleared its entry and read back as pine.
  Absence has to mean exactly one finish; `FLOOR_DEFAULT_FINISH` is it.
- **Stone got rebalanced, or the choice would have been fake.** Rocks sit at a
  third of the density of trees and yielded five to a tree's eight, so stone cost
  ~4.6× the walking. Every town would have been wood — the free axis repealed by
  arithmetic. Rock yield is 12 now (~2:1), and **cutting rock returns 1 stone per
  cell**. Deliberately not parity: wood is the everyday material and stone the
  deliberate one, and equal-cost materials make choosing between them weightless.
- **The mining trickle is capped at ONE and the cap is the design.** The rock is
  unbounded, so a face that paid out properly would make stone free and *wood*
  the scarce material — which is how Minecraft shakes out, and it ends with
  everything built of cobble. One per swing is far too slow to be why you went
  down and enough that you never surface empty: stone is a byproduct of the
  tunnel, never a reason for it. No toast, either — a notification per swing
  would turn the quietest verb in the game into a stream.
- **The finish row sits ABOVE the tool row**, and that is load-bearing rather
  than aesthetic. It comes and goes with the held tool, and the bar is anchored
  to the bottom of the screen, so it grows the bar upward and the tools never
  move under your thumb. It collapses to nothing (`:empty { display: none }`)
  rather than reserving height, which is safe here precisely because nothing sits
  below it — the cheaper version of the reserved two-wide `.build-mods` slot,
  available for the vertical axis only.
- **A lone chip is not a choice.** Fewer than two options collapses the row: a
  single swatch you cannot deselect is furniture, not a control.
- **`built_plank` was renamed to `built_floor` and MIGRATED.** It is persisted in
  three logs — the player's memory, every villager's, and the ground's — and
  dialogue is written against it. Leaving the old string would have orphaned
  every memory of a floor being laid: the note survives in the save and matches
  nothing in the banks, so a villager who watched you build quietly stops
  mentioning it.
- **The migration's job is that nothing changes colour.** It stamps the old
  town-wide wood selection onto every existing floor, so an upgraded town looks
  *identical* to how it looked before — which matters more than usual here,
  because the whole point is that floors stop moving when you change your mind,
  and a migration that shuffled them on the way in would be the last time they
  ever did. Verified on screen against a real v26 save: 214 floors, all walnut,
  and the build bar opens holding walnut.
- **Erase refunds what a thing was WEARING**, not what you happen to be holding.
  Otherwise erase launders stone into wood.
- **Re-laying the finish already there is refused**, not charged. During a drag
  you sweep over cells you have already done, and each would otherwise spend
  material, log a memory and eat a slot in the undo stroke. (The old code charged
  a board to change nothing; a test was asserting that, and had to be re-aimed.)
- **`CellSnapshot` gained a fourth field.** A re-finish stroke changes nothing
  else — the ground override stays FLOOR, the build cell stays absent — so
  without it undo reported success and visibly did nothing.
- **The roof's fallback was the same bug in miniature.** `drawRoofCell` read the
  live selection when there was no wall under it, so a roof restyled itself when
  you picked up a colour while the walls holding it up stayed put. It takes the
  default now. Custom roof finishes are still open.

### Seasons — weather and light, and the museum stopped being exhaustive

Settled when 4d was planned. Four of them, from `getMonth() + 1`, on the axis
the twelve festivals already hang on.

- **Nothing is stored, so the whole system ships at schema v20.** A season is a
  total function of the date, like a festival and like the Cosmos's five nights.
  There is no field, no migration, and no re-stamp — a season needs no fixture
  standing in the plaza, which is the thing that forced v16.
- **A season may never appear in an acceptance test.** It repaints terrain and
  hands the banks a noun. It does not gate planting, change a growth time, alter
  a yield, or price anything. See DESIGN §Seasons for why: a month that won't let
  you plant is a daily cap wearing a coat, and the invariant is that real time
  gates the living world and never the player's hands.
- **Seasons and finishes are disjoint by construction, not by discipline.** The
  renderer asks `finishFor` FIRST and a finish wins outright, so a season can
  only ever reach a tile that had no finish to lose. `finishFor`'s docblock
  already said "terrain is never re-skinned — a finish is something you chose
  when you built, not a filter over the world"; that sentence stays true and is
  now the reason the interception is safe rather than an argument against it.
- **The palette is an override that preserves `name`.** The renderer branches on
  `def.name` for the water ripple, the mushroom caps and the grass speckle, so a
  season is applied as a spread of three colour fields. A repaint that renamed a
  tile would silently switch those off.
- **Not seasonal, on purpose:** the underground (a cave has no weather), water,
  plaza stone, farmland (soil you turned over is a thing you did, not weather),
  anything built, and the Ghost's grove. The grove is dark wood in every month —
  a stand of trees that turned gold every October would be a secret joining in.
- **No snow layer, ever.** Snow would want to sit on every cell, which is the
  per-cell edges band (CLAUDE.md, learned three times), and snow that melted
  would be the first weather in the game with state. Winter is a colour
  temperature.
- **Summer is the baseline** — its numbers are the ones the game shipped with,
  so the other three read as departures and a screenshot in July is still the
  known-good one.

And the thing 4d found rather than decided: **the museum's collection is no
longer one of each crop.** The nature wing had eight cells and seven exhibits;
five new crops overflowed a room that cannot grow, and `plinths()` drops the
overflow SILENTLY — a donated pumpkin simply would not be in the room. The
options were to move the walls of a building people have already put things in
(schema v21, against the v13 note's own advice) or to stop being exhaustive.
**We stopped being exhaustive**, which costs nothing because the record has no
total and no denominator, so there is no slot for a pumpkin to be missing from.
Do not read it as licence to skip an exhibit for convenience.

### Ore's sink — light, and a layer for the furniture

**Settled and built in Phase 5a**, recorded in DESIGN §Materials. Ore had been
obtainable since 4a with nothing built from it, and the loose end named three
candidates: a lamp, a stove, something metal-framed.

- **It is a lamp, because the game already had a lighting model and nothing that
  could add to it.** `drawDark` composites the light you carry plus the daylight
  falling down your own shafts; a placed light is a third source in a system that
  already existed, and the underground's whole texture is that you see as far as
  you are lit. A stove was the other tempting answer and it smuggles in cooking,
  which is a system, not a row.
- **A metal FINISH is the tempting-and-wrong version.** Appearance is the free
  axis — "the scarce thing is the stuff, never the look" — so a finish that cost
  ore would break the rule that keeps the item table at three. Ore buys an
  object. The lamp's post takes your wood finishes; the head is brass in every
  town, the same carve-out the notice board's paper has.
- **Nothing may require one, and the test says so.** No structure and no other
  furniture row may cost ore (`lamp.test.ts`), because a wall or a bed that did
  would gate housing behind digging. And nothing reads a lamp: two identical
  rooms, one lit, must be indistinguishable to `qualify()`.
- **The rock is not somewhere you build a room.** Build mode opens underground
  for exactly two tools, lamp and erase (`UNDER_TOOLS` in `sim/game.ts`). This
  replaces a flat refusal that had a *correctness* argument behind it — furniture
  was one record with no layer in its keys — with a design rule, now in DESIGN:
  walls down there would want enclosure, roofs and a flood fill through stone.
- **The palette hides what it can't offer and `buildAt` refuses it anyway.** One
  list, two readers, neither with its own opinion — the reticle rule applied to
  build mode.

The layer decision is the part worth not re-deriving:

- **`underFurniture` is its own record, not a `u:` prefix on the keys.** Five
  modules walk `world.furniture` looking for beds, shelves and notice boards
  (`assign`, `home`, `housing`, `errands`, `commission`), and a bed in a tunnel is
  not a home. A separate record means all five keep meaning the surface while
  changing nothing, and the migration rekeys nothing. Same shape, and the same
  reasoning, as `under` beside `overrides` in v17.
- **`layer` is the LAST argument everywhere and defaults to "surface".** That
  default is what let the underground arrive without touching a single existing
  caller.
- **Nothing placeable underground is solid**, which is why `isWalkable` still
  returns early down there and never consults furniture at all. Held by a test
  over `UNDER_TOOLS` rather than by discipline — the day somebody adds a metal
  gate, it fails and points at the line in `world.ts`.
- **Undo fixes the stroke's layer at `beginStroke`.** You can climb a ladder
  between hanging a lamp and pressing undo, and a restore that asked where the
  player is *now* would delete whatever is standing in the field overhead — keys
  are bare `"x,y"` in both records. Same class of mistake as measuring the
  material delta late, one axis over, and it has its own test.

Two things the build settled on screen, neither catchable in a unit test:

- **Additive light needs to be much dimmer than it feels like it should.** At the
  first-guess strength, three lamps in a corridor saturated the rock to flat
  cream and the tunnel stopped having any texture — you install lamps to *see*
  the tunnel. Each one is now a suggestion; four in a row are what light the
  place.
- **A source must be the brightest thing in its own light.** The day/night wash
  falls over the lamp's own art, and a soft four-tile gradient adds almost nothing
  at its centre, so the first pass had a glowing lawn around a dim beige box. The
  flame is a small hot rect drawn in the same additive pass — and it had to take
  its position from the same constant the art does, because measured from the
  cell's centre instead of its southern edge it drew half a tile high and read as
  a bright square hovering over the lamp.

### The interface draws its own icons — no emoji, ever

Settled at the start of the feel pass. Every emoji in the UI is gone, replaced by
pixel-art icons in `src/content/icons.ts` — 12×12 char grids with tiny palettes,
rasterized and cached by `src/render/icons.ts`.

Why, beyond taste: an emoji is somebody else's art direction. It ships in the
system font, so it is a different drawing on iOS, Android and Windows; it is
glossy 3D on a phone, sitting on top of a game drawn at 12 pixels; and several of
the ones we had were simply wrong — the radish was 🌶️ and ore was a pickaxe,
because no emoji for either exists.

The format is vendored from The Meadow (`src/content/canon/icons.ts`, which also
holds the two grids copied outright: `rock` and `carrot`). Its roster of ~48 is
mostly pet-care UI and stays there; copy a grid across when a screen needs it.

Rules that are now load-bearing, all in the file's header:

- **Outline every icon in the one shared ink** (`INK`, the Farm's `--ink`, not The
  Meadow's warmer `#402e3a`). One icon with its own outline colour reads as pasted
  in from another game, which is exactly what it would be.
- **Produce takes its colours from `crops.ts`** (`ripeColor` / `ripeShade`), never
  a fresh hex, so the satchel and the field never disagree about a tomato.
- **Render at an INTEGER multiple of 12** — this is where we depart from The
  Meadow, which rasterizes one 12×12 canvas and lets CSS stretch it to 20px. 20/12
  is 1.667, `image-rendering: pixelated` turns that into a nearest-neighbour
  resample, and two thirds of the columns come out a pixel wider than the rest.
  That is the sprite rule in CLAUDE.md, in the UI layer. `SCALE.inline` (24px) and
  `SCALE.button` (36px) are the only two sizes, and the cost — icon sizes step by
  12, so a 52px button gets a 36px icon — is nothing.
- **`content/icons.test.ts` counts the grids.** Hand-counted character art has one
  failure mode: an 11- or 13-wide row. The rasterizer is forgiving about it, so it
  never throws — it silently shifts a highlight a pixel or drops one row's
  outline, and you are left spotting it by eye at 12 pixels. The test also catches
  stale palette entries and glyphs shoved against one edge of the cell.

**A passing grid test does not mean the icon reads.** All 32 passed on the first
run and eight of them were unrecognisable — the spade was a plunger, then a vase;
wheat was a bare stick; the plank's grain dots read as drawer knobs; the seedling
went from floating leaves to a tree to a sprout over three attempts; junk was two
grey squares, then a pipe, and is now a cog. The thing that found all of it was a
**contact sheet** — every icon at 3× on one page — which is worth rebuilding any
time the set grows. Three redraw rounds is normal, not a sign something is wrong.

Two icons carry decisions rather than pictures. `spade` is not the pickaxe the dig
emoji used: digging soil and mining ore are different jobs, and the pick belongs
to ore. The rotate button shows **the facing of the next piece** (`arrow_n/s/e/w`),
not a "rotate" glyph — the facing is the information the player lacks, and the
button's existence already says it turns things. It also sets its icon through
`replaceChildren`, because the `textContent` assignment it used to do wiped the
`<img>` on every refresh.

### The text screens borrow The Meadow's font and finishing, not its palette

Also settled at the start of the feel pass, and the split is the decision: the
Farm keeps its own cooler `--ink` and panel colours, and takes the two things that
made The Meadow's dialogue boxes read as a made object.

1. **A monospace stack** (`ui-monospace, "SF Mono", Menlo, …`), copied from
   cozy_sprites. Even advance makes a dialogue box look typed out, which is what a
   villager talking to you should look like; `system-ui` is the font of a settings
   screen. Buttons need `font-family: inherit` explicitly or they fall back to the
   OS font, which is the whole problem again.
2. **Hard offset shadows — no blur radius** — on `.panel`, `.btn`, `.tool`. This
   does more work than the font. A blurred drop shadow is a depth cue: it says the
   panel floats above the scene, the way an OS dialog does. An unblurred one is a
   drawn edge, the same trick as the outline on a sprite, and it says the panel is
   a solid thing somebody cut out and laid down. Buttons press INTO their own
   shadow (`translateY(2px)` against a shadow that loses 2px), so the top edge
   travels and the bottom edge stays put.

Knock-on: monospace sets wider per character, so `.panel p` went 16px → 15px with
`line-height` 1.6. And the two HUD chips (`.menu-btn`, `.satchel-btn`) are now
cream like the tool buttons — they were dark translucent to hold a white ☰ and a
🎒, and dark ink on a dark chip is a button with nothing on it.

### A counter is a screen, a conversation is a person — including the first one

There are two panel frames and the difference is not decoration. `panel()` is a
screen with a heading: the shop, the heap, the museum, the satchel, the settle-in
card. `speechPanel()` is somebody talking — a portrait, a name plate holding the
name and nothing else, and a bubble that swallows its own replies so a reply is
not a fifth box outside the fourth.

**The land claim was on the wrong one.** Gary's opening beat ran on `panel()`
with his name as the heading and "Town Hall" as the eyebrow, which is the frame
the counters use — so the player's first minute was a form read aloud by a
building, and then every conversation afterwards looked unlike the one that
taught them what talking looks like. He is the last person you meet before the
world opens; that is where the dialogue frame should be introduced, not where it
should be the exception. The eyebrow went with the move, because the plate holds
the name and nothing else, everywhere.

The plumbing did **not** move with the frame: the land claim is still
non-dismissable, like the other one-way flows. A cutscene you can tap past before
it has given you the plot is a cutscene that sometimes doesn't happen.

The general rule, for anything added later: if the words have a speaker, they get
`speechPanel`. If they are a screen you operate, they get `panel`. The test is
whether a face would look wrong on it.

### Every overlay is the same chip — no dark ovals

Third piece of the feel pass. The clock, the season, the activity toast and the
hover hint were all dark translucent capsules (`rgba(20, 16, 31, 0.55)`, radius
999px). They are now the same object as a tool button: `--panel` fill, 2px
`--panel-edge`, ink text, 10px radius, hard offset shadow.

Two things were wrong with the oval, and the second is the more useful one to
remember. It wore a colour that appears nowhere else in the game, so it read as a
debug overlay somebody left switched on. And **a 999px pill is a different
vocabulary from every other edge in this game**, all of which are small radii on
2px borders — a capsule floating over walls drawn one pixel at a time belongs to
some other program's design system.

**And then the season chip went entirely.** It briefly got a quieter treatment —
`--panel-edge` fill where the clock is `--panel`, the same chip a shade deeper,
since the old `opacity: 0.82` went muddy over a moving map. Then it was deleted,
which was the right answer and should have been obvious first: **the game already
says the season twice, in better places.** The whole scene palette is keyed to it
(`renderer.ts` `scenePalette`), so autumn arrives as the ground changing colour;
and `describeSeason` hands villagers a line about it, so the town mentions it out
loud. A chip reading "autumn" over an autumn-coloured field is a caption on a
picture.

That is the same instinct the museum spent a phase refusing — it turns something
you notice into something you read. The rule worth keeping: **the hour earns a
chip because you act on the hour; the month is weather, and weather doesn't need a
caption.** If a HUD label names something already visible in the world, the label
is the thing to cut.

The activity toast got a `.clock.flash` class of its own. It holds a SENTENCE
rather than a reading, so it needs `max-width` to wrap inside; unconstrained it
stretched to the length of the line and ran off both edges of a phone. Its
position and fade moved out of the four inline styles `buildHud` used to set —
having half its look in `app.ts` meant the CSS half couldn't see it.

Checked over open grass at midday and over the night wash; cream chips stay
legible in both, which is unsurprising given the tool buttons were always cream.

### The homestead spot is terrain, not flavour

The three spots on the settle-in card used to be a choice that wasn't one. Only
two lines of code anywhere read `spot`: `forest` multiplied tree density by 1.8,
and `riverside` anchored a river. `hilltop` was read by **nothing** — it
generated the default world, and its blurb ("a view of the whole town") described
a feature that did not exist. Measured over eight seeds, within sixty tiles of
home: riverside 8.1% trees / river at 7 tiles, forest 15.3% / river at 79,
hilltop 8.5% / river at 79 — hilltop and the baseline being the same number
twice.

**Settled: each spot names a body of terrain the generator must put within sight
of the plot**, and the onboarding card shows you the actual result before you
commit. `hilltop` is deleted outright — nothing had been saved under it, so it
left no legacy value and needed no migration.

- **The riverbank** — unchanged. `RIVERSIDE_ANCHOR` already worked; it is the
  one piece of the old system that was doing its job.
- **The forest edge** — the world-wide ×1.8 is gone. It measured as real and
  read as nothing: thickening every region equally leaves no edge to stand on,
  including the regions you walk to in order to leave the trees. The spot now
  bends the biome *field* — a wandering clearing (`clearingRadius`) with the
  town in it and pines from there out, meeting whatever the neighbouring regions
  are further along.
- **The coast** — a sea sited at a known ring, `TOWN_SEA`.
- **The lakeside** — added last, and the cheapest of the four: every town is
  already promised a lake (DESIGN §Water), sited by `townLakeSearch` at ring 104.
  The spot moves it to 48. Nothing new is generated, and no promise is made that
  wasn't already being kept over the horizon. Median lake over 24 seeds: 30 tiles
  here, ~70 on the other three.

  It arrived because the picker wanted a fourth tile, which is **not** a reason —
  that is the exact reasoning that produced hilltop. It earns its place on the
  terrain instead: the three big waters differ by numbers already in
  `content/water.ts`, and a lake is the one you can see across (`beach: 2`,
  `shelf: 3`, radius 16) against a sea whose far shore is an expedition. The
  emblems draw that difference and nothing softer — the lake's water has grass on
  the far side of it, the sea's runs off the bottom edge.

Three things this cost, each found by looking rather than by reasoning:

- **The clearing was a perfect circle**, which reads as a vignette applied to
  the town rather than as country. Same failure `biomeWarp` and `warrenRadius`
  already exist to fix, and the same two-sine cure. Exact geometry at a scale
  you can walk across always announces itself.
- **The ring is always pines, never birch.** The coin flip between them is 2.2×
  trees on a dark floor versus 1.4× on a pale one, and the birch seeds gave a
  town chosen *for* its treeline a faint speckle you had to be told about
  (seed 31). The flip resumes past the clearing.
- **`FOREST_CLEARING` is bounded below by a proof**, not by taste.
  `HOME_REGION_REACH` is 21 and a thousand-seed test asserts the town's region
  is meadow that far out; anything under it grows a wood inside a finished
  house. 24, with three tiles of margin and no more.

**This amends "no town is promised a coast"** (the note under `lakeDepth`). That
note is still right about what it was defending — a world where *every* town is
coastal is one where being coastal means nothing — and two of the three spots
are still promised nothing and go on rolling the scatter's dice. What changed is
that a player may now **ask**, and an answer to a question you had to choose to
ask is not a guarantee handed to everybody. `TOWN_SEA` is an extra body rather
than a bent lattice, for the reason `TOWN_LAKE` gives: forcing the sea's own
cell to fire would put the coast wherever that cell's jitter landed.

`TOWN_SEA.ring` is derived, not tuned. The closest the waterline can come is
`ring - radius * 1.1 - COAST_WARP`, and the water invariant needs that clear of
the town's own ground — which is what fixes it at 96 and puts the typical shore
about thirty-four tiles out.

The water invariants (`water.test.ts`) run on all three spots, and the coast is
asked a *narrower* question in one of them — standing water must clear ±16
rather than ±30. That is not a weakened guard: the bug that test was written for
is the **scatter** landing a body on town by accident, that path is `clearsTown`,
and it is unchanged and still checked on all three. Holding a deliberately sited
coast to "no water within thirty tiles" would be holding it to not being a coast.

Verify with `npx tsx scripts/shot-spots.mts <dir> <seed>` — three panels, one
seed, close enough that buildings read. If they don't look like three different
places, the spot has stopped meaning anything again.

**No map preview on the card. Three emblems instead — one per spot, on tiles.**
The plan was a thumbnail of your actual town beside each spot, so the blurb could
be checked against the ground. Two things killed it, in order:

- **The game's own renderer cannot show a spot.** `resize()` targets ~11 tiles on
  the short edge and clamps the scale to integers, so a preview box renders the
  plaza and the town hall — while the treeline is at 24 tiles and the shore at
  34. Screenshotted all three at seed 104: they are indistinguishable.
- **Zooming out THIS FAR is not a wiring job, it is forbidden.** Fitting ~96
  tiles means 16px sprites at ~4px, and CLAUDE.md's sprite rule exists to stop
  exactly that. A zoomed-out map would have to be its own drawing — flat tiles,
  no sprite art, a second visual language on the one screen that introduces the
  first.

  Amended by §The view stands back three steps: a *modest* zoom turned out to be
  cheap and legal, because the constraint is the integer floor rather than
  zooming as such. It does not resurrect the preview — 96 tiles is still four
  times what the furthest step shows.

The preview's job was catching a UI that oversold the terrain, and the terrain
now does what the blurbs say, so the job is gone. What the card carries instead
is an **emblem** per spot (`content/spots.ts`): a 24×16 char grid in the world's
own greens and blues, three across, name under each, the chosen one's blurb under
the row. No architecture, and in particular the seed stays inside `newWorld`
rather than being hoisted into the UI so the card could draw with it.

**What an emblem may claim.** Every promise in `world.ts` is about DISTANCE and
none is about bearing: the treeline is a ring, the river's crossing angle is the
seed's, and the coast is on a pure hash and can be any side at all. So no emblem
puts water left or right — water lies along the bottom, trees go all the way
round, and both read as "this, near you", which is true on every seed. There is a
test for it. The danger with art here was never inexactness; it was looking
precise enough to be read as a survey, which is why these stay flat and banded.

Three things learned drawing them:

- **A gold star marked the plot for one draft, and is gone.** It needed a ring of
  ink to read at 12px at all — at seven cells wide every limb was two cells and
  therefore entirely outline, so it rendered as a dark blob with gold caught in
  it. Nine cells fixed that, and by then the emblems sat above their own names
  and the thing the star explained was already obvious. A marker earns its place
  by resolving an ambiguity, and there wasn't one.
- **The wood's inner edge has to be ragged.** A strictly alternating tooth along
  the top and a straight column down each side came out as battlements around a
  lawn — CLAUDE.md's per-cell band rule showing up in a picture rather than in
  the world. A feature that steps in time with the grid stops reading as the
  thing it depicts.
- **The spots use the same control as the forms**, tiles with the art on top,
  because it is the same shape of question. They moved off `.primary` (a flood of
  `--accent`) to an accent EDGE, since a wash of accent recolours the very
  emblem being chosen — `.form-tile.selected` had settled that argument already,
  for the portraits, one block up.

The blurb sits under the row rather than in the tile: three sentences that long
at a third of a phone's width is a wall of wrapped text. Its line has a
`min-height` of three lines, because the blurbs wrap to two or three and the
Claim button hopped as you tried them.

`render/icons.ts` now takes grid dimensions from the rows instead of a hardcoded
`CELL`. Exactly equivalent for the icons — `icons.test.ts` asserts all of them
are 12×12 — and simply correct for the first grid that isn't, which would
otherwise have been cropped to its top-left quarter with no error anywhere.
`HomesteadSpot` moved to `content/spots.ts` and is re-exported from `sim/types.ts`,
because content may not import sim and a table naming the spots has to own the
type — the same call `BiomeId` and `WaterKindId` already made.

### The view stands back three steps

The camera was fixed at ~11 tiles on the short edge forever. It now has up to
three settings, cycled from a HUD button or `-`/`=`. What made it a half-day
rather than a rewrite, and the traps:

- **Zoom is an integer, never a multiplier.** The renderer draws into a
  low-resolution buffer at a fixed 16 scene px per tile and lets CSS upscale the
  whole thing by an integer with `image-rendering: pixelated`. Sprites are never
  rescaled by zoom — only the finished buffer is, and only by whole numbers — so
  CLAUDE.md's sprite rule is satisfied by construction *provided the factor stays
  an integer ≥ 2*. A multiplier crosses that by accident: `4 × 0.66 = 2.64`.
  `render/zoom.ts` therefore returns the scales themselves and no factor.
- **The ladder is the whole design problem, and the obvious two builds both
  fail.** Rounding each target tile count (11/16/22) on its own **collides** —
  at a 600px short edge, 16 and 22 tiles both round to scale 2, so the far step
  renders pixel-for-pixel identically to the mid one. A fixed `base/base-1/base-2`
  ladder never collides but is far too timid on a big screen (8/7/6 at 1400px).
  The shipped rule is the hybrid: aim for the target, then force each step
  *strictly below* the one before it, and stop when it would go under 2.
- **Per-device availability falls out of that stop**, rather than being a special
  case anywhere. A phone's short edge is already at the floor, gets a one-entry
  ladder, and the HUD hides the button outright — the same "hidden, not disabled"
  call the build palette makes in a tunnel. Verified at 390×844.
- **Zoom is not in the save, and must not be.** It is a fact about the screen,
  not the town: a save synced from desktop to phone must not arrive two steps
  back on a device with no such step. Its own `localStorage` key beside the mute
  flag, which is also what keeps the whole feature clear of `schemaVersion` and a
  migration.
- **`PAN_LIMIT` was a lie waiting to happen.** It was 14 tiles, documented as "a
  bit over one screen" — true only while a screen was always ~11 tiles. Left
  alone, the furthest step would have had a pan clamp *smaller than its own
  viewport*. It is now a multiple of the screen.
- **No pinch.** Two fingers already mean pan in build mode, and one gesture with
  two meanings is how that affordance gets broken.

The real gate was not arithmetic but whether the `Raised` overhang system — trees
and rock faces exceeding `TILE` so they overhang what is behind them — still
reads standing back. Screenshotted all three steps at seed 104 on the plaza and
at the treeline: trunks, canopies, shadows and roof courses all hold, with no
per-cell striping appearing at the new scales. It does **not** reopen the spot
preview (see Phase 9's note); 96 tiles is still four times the furthest step.

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

~~**Open:** the curator needs a name.~~ ~~**Settled: Corrigal.**~~ **Superseded
by the naming pass (§7).** She is **Winifred**, and the old name is gone rather
than retired into a register — a register is the names you would actually reach
for, and keeping the ones you re-cast away just refills the town with them. The
last sentence of the old entry — "the name is one string in `cast.ts` and
nothing keys on it, so it stays cheap to change" — turned out to be exactly
true, which is the only reason re-casting the whole town cost one afternoon.

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

### 4d. Crops and seasons — **done**

The last numbered item, and **Phase 4 is complete.** Seasons are weather and light (see the settled entry
above and DESIGN §Seasons); the roster doubles from three crops to eight. **No
schema change anywhere in the phase** — seasons store nothing, `seeds.unlocked`
is already a `CropId[]` where absence is the truthful state, and `Inventory` is
partial so new `ItemId`s need no backfill.

Nine steps, each independently shippable:

1. **The docs** — DESIGN §Seasons, the Materials note, the museum correction,
   and `finishFor`'s docblock. Done first because it is the argument the rest is
   built on.
2. **`content/seasons.ts` + `sim/seasons.ts`** — the table and the lookup. Pure,
   no renderer, no dialogue, no save. `inSeason(cropId, now)` is the ONE place
   the crop↔month match is decided, so the flourish and the dialogue can never
   disagree about which month it is.
3. **The repaint** — a new `render/palette.ts` holding the colour maths, so the
   1670-line renderer gains a call rather than a third nesting level. Four
   touch points: the ground fill (one line, after `finishFor`), the sky wash,
   the grass tuft, and the two non-`dark` arms of `drawTree`'s crown.
4. **The HUD pill** — a second `.clock` div under the time, the pattern the
   flash div already uses. The season's name and nothing else: no countdown, no
   "day 12 of autumn". A number there would be the first clock in the game with
   a denominator.
5. **The five crops** — wheat (no season, the multi-day slot) plus peas/spring,
   tomato/summer, pumpkin/autumn, kale/winter. Totals 3/5/8/11/17/21/30/48h, all
   distinct, ordered in `CROP_ORDER` by time so the picker reads as the one axis
   varieties vary on. **No museum rows** (see above). `CropStageDef.needsWater`
   is deleted rather than wired — it is read in zero places and wiring it would
   introduce a second growth model that contradicts `updateCrop`.
6. **The flourish** — in its own month a ripe plant draws a lit shoulder column,
   one extra leaf pair, and a two-pixel ready marker. Inside the plant's own
   silhouette and nowhere else: no ring, no glow, no tint over the farmland
   cell, because a planted row is exactly the continuous surface the per-cell
   band rule was learned on.
7. **The town says something** — `RESIDENT_SEASON` in the `FESTIVAL_LINES` merge
   idiom, and a `trySeasonLine` rung in `speak()` placed after memory and before
   idle, at a lower chance than home (0.22): a season is true for three months,
   and somebody who leads with the weather every time is a lift, not a person.
8. **The postcard** — fixes the real bug at `game.ts:910`, which hardcodes
   `carrot${s}` and calls a ripened radish a carrot. **No season `AwayEvent`**:
   the house rule is that an event returning a line must have actually changed
   the world, and a season changes nothing. The season is an adjective on the
   ripening line, which reports a change that genuinely happened.
9. **The errands board stops asking for crops you can't grow** — `eligibleErrands`
   filtered on `done` only, so the radish card could fire on a carrot-only save.
   Pre-existing since 3h and five crops made it five times likelier. Fixed:
   `askable()` drops a card whose asked item is a crop yield you have not
   unlocked. Only crops are filtered — wood, stone and junk are gatherable from
   the first minute — and the board can never empty, because the carrot is
   unlocked from the start.

Two of the phase's tests turned out to be the ones at fault rather than the
code, which is worth recording. `errands.test.ts`'s "refuses when you are
short" leaned on the seeded rng happening to pick a card for something the
starting satchel had none of, so it broke the moment the eligible pool changed
— it now empties the inventory and actually is short. And a new postcard helper
banked ten hours of growth, which ripens a radish and silently does not ripen a
pumpkin; it reads as a bug in the postcard. Both are the same lesson the house
rules already carry: when the result disagrees with the change, suspect the
scaffolding first.

Wheat is the first crop that cannot finish on two waterings — 48h of growth
against a 22h wetness window needs three. That is the check-in loop working as
designed (a dry plot pauses, never dies), but it is new behaviour and wants
eyeballing once.

---

## Phase 5 — Biomes, and the world becoming navigable

The world was unbounded and also uniform: grass, trees, rocks, forever, in one
palette. That left a player no way to say where they were and no reason to go
anywhere but gathering. Biomes are the fix, and they are **the wayfinding
system** — you navigate by "out past the birches", which is how anybody
navigates anywhere.

### What shipped

`src/content/biomes.ts` (the table), the field in `src/sim/world.ts` beside the
grove and the warren, tinting in `src/render/palette.ts`.

Five regions the field can roll — **meadow, pinewood, birch, scrub, fen** — plus
**blossom rows**, which is sited like a landmark instead. Every one is colour and
growth density; **not one number touches a yield, a recipe or an unlock.**

### Settled, and why

- **No coordinate readout and no minimap.** Both were considered and refused.
  The house position is already written in three places (the warren "needs no
  marker to be findable"; the grove is a secret because you *walked into* it),
  and a HUD location label is the debug-overlay instinct in a clean shirt.
  Legible regions ARE a coordinate system. Biome names live in dialogue, so the
  people who live somewhere are the ones who name it.

- **A biome states a TINT, never a colour.** A direction and an `amount`. This is
  what lets biome and season compose rather than override: October still turns
  the world, and the fen is a murkier October. The alternative was losing seasons
  out here or writing every biome four times. `amount` is where the argument
  lives — pinewood resists autumn hard, because conifers do.

- **The town's own region is always `meadow`, whose every number is identity.**
  THIS IS THE MIGRATION, and it is a property of the generator rather than of the
  save. Base terrain isn't stored, so a generator that answers differently
  re-landscapes towns that already exist — and not cosmetically: an unedited cell
  inside a house somebody built could come back a TREE, which is solid, which
  breaks the room and the roof derived from it. Cell (0,0)'s Voronoi site is
  pinned to the origin so the region provably reaches 20 tiles (`HOME_REGION_REACH`);
  the town needs 14. Tested on a thousand seeds, because this is the assertion a
  live save depends on.

- **Forced by REGION, never by radius.** A circle of ordinary grass stamped
  around the plaza would draw a hard rim across open country wherever another
  region came near.

- **Jittered Voronoi, not a hashed grid.** A hashed macro-cell draws every border
  on a straight line 64 tiles long and the world reads as tiled. That is the
  per-cell edges rule at 64× scale: an edge that follows the grid stops the
  surface reading as a surface, whatever the grid's size.

- **Blossom rows are sited, not rolled** — own ring (72), own bearing, through
  `onLand` like every landmark. A region you happen into is scenery; a stand you
  went looking for is a destination. It is also what an authored arrival can ask
  for by name.

### Silhouettes, not just colour

Colour alone was not enough and the first screenshots said so: with one crown
shape everywhere, the pines were **a dark meadow** rather than a pine wood. The
eye reads outline before hue, and at 16px the outline is most of what a tree is.

So `crownRows` is per biome — half-widths in pixels, one per row, top first, drawn
as integer rects with no `scale()` anywhere near it. A conifer is narrow, tall and
TIERED (a clean triangle reads as an arrowhead; the step-backs are what say
"branches" at 1px). Birch is a short crown on the same trunk, so more pale bark
shows and it reads slender. Scrub is squat, fen weeps, blossom is overfull. The
meadow keeps `BROADLEAF`, which the grove also uses — her trees are the dark wood
in the ordinary silhouette, so they read as trees that are *wrong* rather than as
a different plant.

**Length is height.** The renderer derives the sprite's height from the row count,
including how far up it reaches to occlude the player, so a taller tree stays
correct without a second constant to forget. `TREE_H` is gone.

**The birch was redrawn later, and it took the whole species to fix.** "A short
crown on the same trunk" got the bark showing and still read as a lollipop, so
three things moved together and none of them works alone:

- `trunkHeight` (new, per biome, default 10) — the birch stands at 13. Height is a
  species trait, and until this existed the only way to make a tree taller was to
  grow its crown, which makes it *bushier*.
- `bark` (new, per biome) — dark dashes as 3-wide grids read from the top of the
  trunk down, several variants, picked by the tile's own salted hash. A white
  trunk with nothing on it is a bollard, and the lenticels are the one detail of
  this tree everybody can name.
- The crown is a tall lobed **egg** with `crownGaps`/`crownOverlap` parting its
  bottom rows around the trunk, so bark shows *inside* the foliage.

A second look widened it from 11px to 13 and doubled the overlap from three rows
to six. **A crown too narrow has to close on its trunk in two or three steps**,
and the silhouette went full-width to bare bark almost at once — the canopy ended
and then there was a stick. The extra width buys the rows to step down 4, 4, 3, 3,
3, 2 instead.

**The correction worth remembering: the first crown widened all the way down, and
came out a narrow white-trunked spruce.** That silhouette is the pinewood's, four
rows up the same table. A birch is broadest at the shoulders with its lowest
branches shortest — the outline has to come back in at the bottom or the bark
colour cannot save it.

Redrawing it also found that the crown's lit side was a flat six rows, which was
most of a ten-row crown and a third of a sixteen-row one — the birch's lower half
was one unshaded mass, which is what made the cone read as solid. It is now a
fraction (0.6, floored at 6), so light falls across a proportion of a shape rather
than a constant number of pixels of it. The pines and the blossom rows gained
depth from the same change; 0.7 was tried first and left blossom crowns more lit
than shaded, which inverts what a highlight is.

### Borders are warped, because a Voronoi edge is a straight line

Found at the edge of the blossom rows: a clean vertical seam the full height of
the window. Nothing was grid-aligned so the band rule was satisfied, and it still
read as a polygon rather than as country — a Voronoi border IS the perpendicular
bisector of two sites.

The query point is now nudged before the lookup by a smooth function of where it
is (`BIOME_WARP`, two sine terms with seeded phases — the same trick
`warrenRadius` uses so the Mole's rounds aren't a circle). Each axis is driven by
the *other* coordinate, so the field shears; warping x by x would leave vertical
borders vertical, which is the case it exists to fix.

**That change spent the margin the town guarantee depended on, and the
thousand-seed test caught it** — seed 93's forest homestead put its corner (15,13)
in the next region along. `BIOME_JITTER` came down from 0.72 to 0.5 to buy the
clearance back, which it can afford because the warp now does the irregularity
better than jitter ever did: it bends the borders instead of just moving the
middles.

### Three bugs the screenshots caught that the tests could not

All three passed 838 unit tests and were obvious within a second of looking.

1. **Biome tint reached every tile.** Found in the sea west of a riverside town:
   the WATER was pulled halfway to dry sand, and the plaza, the farmland and laid
   boards with it. A region is turf and what grows on it, so tinting is now
   restricted to the same tiles the SEASON recolours — grass and mushrooms — and
   a finish still wins outright over both.

2. **Single-cell features are squares, not scenery.** The scrub had scattered dry
   patches and the fen had per-cell water. Both came out as hard-edged coloured
   SQUARES scattered on open turf, tiling the ground into a checkerboard. This is
   the per-cell edges rule arriving by a new door, and it has now caught us five
   times. The dry patches were deleted; the ponds moved onto a low-frequency
   field of jittered centres with hashed radii, so water is a contiguous blob
   edged where the water actually ends.

3. **The fen was 1.3% under water while declaring 10%.** A hand-guessed scaling
   constant between "fraction of ground wet" and "how many pond centres".
   Derived from the geometry now (πr² per cell²) and measured, because "there is
   no water on screen" and "the water is off screen" look identical in a
   screenshot.

### Not built yet — the rest of the plan

- **Cosmetic wood variants.** Cherry chops into `wood`; the variant would ride
  the slot `whitewash` already occupies, so a house framed in cherry looks unlike
  one framed in pine and `TASTES` has something to have opinions about. This is
  what stops biomes going stale after you've seen the pink trees once.
- **More arrival rows, and arrivals that name a biome they want to live in.**
  `ARRIVALS` is six hand-written rows and `nextArrival` returns null past the
  last, so the town currently stops growing. Settled: MORE ROWS, no generator —
  the map being unbounded doesn't oblige the town to be, and per-form banks would
  turn "somebody is asking" into "a task appeared". An arrival who wants to live
  in the blossom rows is what makes outward growth pulled by people.
- **Contiguous outward growth, and branch offices.** `MAX_PATH_NODES = 2000` is
  ~25 tiles and exceeding it means "unreachable", so a neighbour housed 150 tiles
  out doesn't walk slowly — they fail to be a walking creature. Growth therefore
  has to move a plot at a time. Institutions stay singletons (there is one
  Corrigal); a far neighbourhood gets a BRANCH — same person, second premises, on
  the schedule ring. `StopAnchor` is already the precedent.
- **`shafts()` scans every override.** Grows with edits, not area, so outward
  growth doesn't worsen it — but a town with a large frontier eventually will.

### 5c. Water — streams, ponds, lakes, and seas throughout the world

The world had water in two forms and neither was a place. The fen's ponds were
fine. The other was one line in `generatedTile` reading *every tile west of
x = −13 is water, at every y, forever* — an infinite half-plane, on an infinite
map, which is a wall and not an ocean. `onLand()` existed solely to mirror the
grove, the cube and the blossom rows back east when their bearing dropped them
in it, because half of all riverside towns were otherwise generating a Ghost
standing in an unreachable stand of trees in open sea.

**Settled, and why:**

- **Finite, always.** Nothing unbounded on an unbounded map. The sea is a sited
  landmark like the grove and the blossom rows, just enormous — ~90 tile radius,
  coastline warped by the existing `biomeWarp` sines so it is a coast and not a
  circle. Walking round it is minutes, not never.
- **It costs no live save a single tile,** and this is why the change was safe
  to make on a deployed game: a bounded sea is a strict *subset* of the
  half-plane it replaces. Riverside towns keep their waterfront (the centre is
  pinned so the near shore stays at x ≈ −13) and *gain* shore north and south.
  Terrain is a pure function of the seed, so changing the generator does rewrite
  untouched ground — but this particular change can only ever hand land back.
- **One number, `waterDepth()`** — signed distance to the shore, with four
  generators feeding it. The cross-section (deep / shallow / sand / land) is
  four thresholds on it, and `shelf` / `beach` are content table rows.
- **Fordability is geometry, not a rule.** A stream is 1–2 wide so it never gets
  far enough from its own bank to pass `shelf`; it is wholly shallow. Nobody has
  to remember to make the next kind of small water crossable.
- **Shallow water must refuse construction explicitly.** It is walkable, and
  `structures.ts` / `furniture.ts` only test `solid` — so without a rule the
  first arrival's cottage gets sited in the surf and the second thing that
  happens is nobody can work out why.
- **Planks on deep water are allowed.** Someone can bridge the ocean. The
  invariant says real time gates the world and never the player's hands, and the
  game is open to fantasy; a wall here would buy nothing and cost the best story
  this game can produce.
- **The shovel fills any water you can stand next to** — shallow underfoot,
  deep on the tile you're facing, reusing `gather.ts`'s "you chop what's in
  front of you". Fills to sand, which is shore for the next tile, so the sea is
  fillable from the edge inward. **Filled water does not heal** (DESIGN §Water):
  re-flooding would delete an afternoon offline, on the one activity the doc
  calls free.
- **`onLand()` stops being a hack** and becomes an honest "is this water" query.
  It has to be one anyway — lakes can drown a landmark in any direction, not
  just west.
- **No creation, no flow.** Water never spreads, rises or is placed. Terrain
  stays derivable from (seed, edits); the moment water simulates, it has to be
  stored.
**Then rivers, two stream families, and sand only on the big water** — a second
pass, and it settled three more things:

- **Streams run in TWO families on different bearings.** One family is a comb;
  no amount of meandering fixes that, because every channel shares the bearing
  and they wobble in unison. Two cross, join and separate, and the world stops
  having a grain. True dendritic branching is deliberately not attempted: it
  needs flow accumulation on a height field, which is iterative, and terrain here
  has to stay a total function of (seed, x, y) with nothing stored.
- **Rivers are a table row, not a code path** — `ChannelDef` in
  content/water.ts, shared with streams. Wider, rarer, deep down the middle, and
  the first water that can genuinely stop you. They PINCH along their length, so
  the narrows are fordable: the stream's emergent crossing rule, applied to a
  channel big enough to need it. You are never blocked, only delayed.
- **Sand means big water.** Streams and ponds got `beach: 0`. Half taste (you can
  tell what you're looking at before you reach it) and half repair: a one-tile
  band on a two-tile channel falls between cell centres as often as on one, and
  came out as chunky patches on alternating banks.
- **`waterAt` compares WETTEST, not deepest.** Fine while every kind had a beach
  and wrong the moment they didn't — a stream crossing the sea's sand has the
  greater depth out there, so it won the tile and contributed nothing, punching
  green fingers through the beach wherever a brook ran down to the shore.
- **The town's bridges are GENERATED**, like the plaza's paving, and that is what
  buys "rivers may run through town". Stamped, they'd be stored edits needing a
  migration to reach towns that already exist — and those towns are getting
  rivers today, because terrain is a function of the seed.

**THE ARITHMETIC BUG WORTH REMEMBERING.** A sine of amplitude A and period P
moves a channel sideways by up to A/P tiles per tile walked. Past 1 it slides
faster than you walk, and the depth field ALIASES — adjacent cells land in
different bands and the banks come out as a CHECKERBOARD. The per-cell edges rule
(CLAUDE.md) arriving by a fourth door, and every channel in the world had it: the
periods were hard-coded (23, 11) while the amplitude varied per kind, so a
river's amplitude of 34 gave a slope of 2.0. **Every wavelength is now derived
from its own amplitude**, which fixes it for all kinds at once and says something
true besides: a bigger meander is a longer one. Real rivers don't switchback.
The same error was in `coastWarp` at 0.85, which is why the sand along the sea
was chunkier than it should have been and nobody could say why.

**A test can have the wrong ruler four times in a row.** "The sea has a far
shore" went through: counting dry tiles after the last water (a river far west
reset the counter), then asserting the tiles past it weren't sea (its own shelf
and beach are), then counting a dry window (a lake sat just past the far beach).
None of those were bugs in the world. The version that survived counts **the
sea's own tiles** — it asks whether this body is bounded, which is the actual
question, and nothing else nearby can answer it for you.

**Then the seas were scattered** — a third pass, and the one that finished the
thought the first two started.

- **Finite was only half the rule; the other half is NOT SINGULAR.** Bounding the
  sea fixed the wall through the map and left one ocean on an endless dry plain.
  Walk far enough in any direction and water stopped happening — which is the
  same bug (an unbounded world the water doesn't actually inhabit) seen from the
  other side. Seas and lakes now sit on their own lattices of jittered centres,
  which is the shape `pondDepth` had all along; one function, `scatteredDepth`,
  serves all three at three scales.
- **Radius became a range, and wobble became a FRACTION of it.** With one sea its
  size was a constant nobody could perceive. With many, variety is the only thing
  that makes a particular coast memorable. Tying the wobble to the radius settles
  the argument `coastWarp` was having with itself — the angular harmonics are
  already scale-free, so a 20-tile lake and a 140-tile sea are now recognisably
  the same kind of object at different sizes, and neither needs hand-tuning.
- **No town is promised a coast; every town is promised a lake.** Guaranteeing a
  sea would mean bending the lattice around the origin, and a world where every
  town is coastal is one where coastal means nothing.
- **But the town's own ground is kept dry, and this was a real bug.** A lattice
  has a cell over the origin exactly like it has one everywhere, so a sea landed
  on the plaza about as often as it landed anywhere. Caught by "never laps the
  plaza", which has been guarding that spot since the half-plane days and earned
  its keep twice now.
- **Riverside finally has a river.** Its water was the pinned sea — a fossil of
  the half-plane era, which is also the era the spot got its name in. One channel
  of the river family is now anchored through the town, in the family's own
  warped frame so the rest of its meander is still the seed's. The bridges were
  already generated, so the crossing came for free.

**Then the river got wider, and wading got slower** — the two things the feel
pass wanted from the water once it existed.

- **`halfMin` 2.4 → 3.4, `halfMax` 3.6 → 4.6, `pinch` 0.62 → 0.72.** The river
  looked thin, and the reason was not the half-width: at a typical point on the
  pinch cycle only about 1.3 tiles of it were deep, so a river read as a wide
  stream with a dark line down the middle. **The quantity to tune is
  `half × squeeze − shelf`, doubled** — the deep band as seen — and the
  half-width alone will mislead you about it. Measured after: mean deep band
  2.37 tiles, mean total width 4.8, and exactly one row in 800 where the river
  briefly has no water at all.
- **The ford invariant is now a test, not a comment.** `halfMax × (1 − pinch) <
  shelf` is what guarantees every river pinches to a crossing somewhere, and it
  ties two table numbers together that look independent. Widening a river without
  deepening its pinch produces a river with no crossing along its whole length —
  which is not a visible bug, because it still looks like a river. You find out
  by walking a bank for a mile. `sim/water.test.ts` fails instead now.
- **Speed is a TileDef field, and shallow water is the only row that sets it**
  (0.6, players and villagers alike). A field rather than a check for water in
  the movement code, for the usual reason. Shipped with one row on purpose: the
  moment three tiles have opinions, plain grass becomes the slow case and the
  world has a speed gradient nobody asked for. Sand explicitly stays at 1 — the
  table already promises sand behaves exactly like the grass it replaces.
  **It is not a stamina meter and must not become one** (DESIGN invariant): it
  costs seconds in the water and nothing at all once you're out.
- **Read the tile you are STANDING on, not the one you are stepping onto.**
  The destination-tile version brakes you on the bank a step before you get wet,
  which feels like the water reaching for you.

**CACHE THE LANDMARK CENTRES, or the searches nest.** Every landmark centre is a
total function of (seed, spot) computed by searching sixteen bearings, and each
bearing asks how deep the water is. Once water became a scatter, one such
question stopped being one `roundDepth` and became nine — and the searches
started nesting: `biomeAt` → `blossomCentre` → sixteen bearings → `lakeDepth` →
the town lake → sixteen more. Per tile. A town-ground test went from under a
second to over six, which is how it was found. Memoising two scalars → a point
is safe in the way caching usually isn't, because it is memoising arithmetic.

**MEASURE THE DENSITY; DO NOT REASON ABOUT IT.** Cell size is not the distance
between coasts. Walking a straight line you only meet a sea whose disc your path
crosses, which for a ~100-tile body in a cell of C happens far less than once per
cell. The first cut reasoned from a 700 cell to "a coast every two to five
minutes" and the measured figure was a **twelve-minute mean**. A 960,000-tile
transect settled it at 420. The arithmetic is not intuitive; re-measure.

**`hash2(mx, my)` and `hash2(my, mx)` ARE THE SAME NUMBER ON THE DIAGONAL.** The
obvious way to get a second independent value out of one hash is to swap the
arguments, and it is wrong wherever `mx === my`: those cells put their body at
exactly 45°, at the same fraction in both axes. One lattice line in eight had its
bodies aligned — the grid showing through the jitter whose entire job is to hide
it. Invisible on a 2-tile pond, which is where the line was inherited from, and
not on a 140-tile sea. Two salts, never swapped arguments.

**`scripts/shot-map.mts` exists because of this pass.** The diagonal bug, and the
wallpaper bug before it, are both invisible from inside the game — the camera
shows forty tiles and these are thousands wide. Far field (3000 tiles, 3/px)
answers "is there a grain"; near field (250 tiles, 1/px) answers "does a
coastline read as a coastline". Recolouring by water KIND is the only way to tell
a sea from a big lake, and "where are the seas" is the first question you'll have.

**Three things only the pictures could say.** Every one of them passed the tests.

1. **The coastline was three ribbons of flat colour.** The sea's shape comes
   from a wobble at angular harmonics 3 and 7 — which at radius 90 is a
   wavelength of about eighty tiles, i.e. invisible from the beach. Cranking the
   harmonics is the obvious fix and dies on the LAKE: angular frequency is
   wavelength over radius, so whatever makes a 90-tile sea interesting shreds a
   15-tile lake into a starfish. The fix is `coastWarp` — bend the QUERY POINT,
   not the shape, which gives a fixed feature size in *tiles* on every body.
   Exactly what `biomeWarp` does to Voronoi borders, one phase earlier.
2. **The streams were wallpaper, and it took a map of the whole world to see
   it.** From inside the game a stream looks like a stream; from four hundred
   tiles up, six of them are ruled pencil lines at even spacing. Two fixes, and
   the second was the one that mattered: `STREAM_WARP` bends the space the
   channels are ruled on (they curve, converge, drift apart), and a per-channel
   hashed OFFSET breaks the spacing — because curving a comb gives you a curved
   comb, and even spacing is the tell. Rendering the generator to a PPM at two
   tiles per pixel is how all of this was found; it belongs in the toolkit
   beside `scripts/drive.mjs`.
3. **Standing on a junk pile and tapping gather chopped a tree instead.** Not a
   water bug at all — a latent one the moved terrain exposed. `actionTarget`
   step 2 gives the gather tool the node in reach, justified by "you can never
   stand on a node"… which is true of trees and false of the two gatherables
   that are TILES (mushrooms, and what the Gremlin leaves). It was step 3's own
   hijack, one step early. Now step 2 defers when underfoot is gatherable.

**And one thing the ladder had to give up.** Water ahead of the shovel is chosen
by HEADING and sits *above* the tile underfoot — the only exception to "the held
tool on the tile underfoot wins". Both halves are forced: the ground at a
shoreline is SAND, and sand is diggable, so with underfoot winning the shovel
would turn the beach over forever and never once reach the sea. Heading is what
makes that safe, and it is the same answer `undergroundTarget` gives for the
same reason — face the water and you fill it, turn around and you dig the shore.

- **The `% 7` lattice is deleted.** That clause was meant to ragged the shore.
  What it actually produced, printed from the real predicate, was a diagonal
  scatter of *one-tile islands* — and `canStep` refuses a diagonal unless both
  orthogonal neighbours are open, so they were strictly unreachable, with the
  tree scatter running on them. Single trees on single squares in open ocean.
  The per-cell rule (CLAUDE.md) arriving by boat.

**And the world got a survey grid** (`sim/survey.ts`), because a world you can
walk out of forever is a world you can get lost in. The plaza already sat on the
origin, so this is a readout and not a re-origin: a chip in the top-right corner
reading `W 42 · S 118`, and `0 · 0` at home. East and south positive, matching
the screen — the reverse would be an elaborate way to walk the wrong direction.

- **It is the clock's chip exactly, in the opposite corner.** The first cut made
  it smaller and paler, stacked under the clock, which said it was a lesser
  instrument. It isn't: the hour tells you when you are, this tells you where.
- **It had to clear the same bar the season chip failed** (the note beside the
  clock in `ui/app.ts`). A label naming what you can already see turns noticing
  into reading. The hour earns its chip because you act on the hour; this earns
  its chip because you steer by it. The season was weather.
- **Not a compass, and not a minimap — settled, not pending.** Walking toward
  zero on both legs is something you work out, not something you follow, and the
  world stays explored rather than routed. A minimap is worse than redundant
  here: it would show you the grove and the humming cube, and the UI is never
  allowed to spoil a secret (CLAUDE.md §Tone).
- The reference reads off the TILE, never `player.x`. Off the float it flickers
  between two numbers while you stand still, which reads as broken.

---

## Phase 6 — The naming pass, and looks

Two problems with one root: **the game had a cast of types, not a cast of
people.** Schema v23.

### Names — form is the species, name is the person

Five of the seven institutions were called by their form. The villager at the
town-hall desk was *named* "Tired Office Creature", which made the doctrine the
whole codebase repeats — *forms are species, not singletons* — false in the most
visible place in the game, and left a second Menace with nothing to be called.

Settled, and not worth relitigating:

- **`canon/forms.ts` is untouched, forever.** Species names are vendored Meadow
  canon. Gary is a person; the Tired Office Creature is his form. Every museum
  blurb and collection clue kept working unchanged *because* they were always
  talking about species — that's the test that the split is the real seam.
- **The institution moved to the subtitle**, which the UI already had a slot
  for: `panel("Arabella", "The Counter", …)`. Naming the *place* is a better way
  to say "institution" than naming the person after their job anyway.
- **The roster.** Gary (town hall), Arabella (shop), Nub (heap), Winifred
  (museum), Derek (seed stall), Pesto (errands), Aurelio (stage), Prudence
  (resident). Secrets too: Malcolm, Eloise, Sidra. Arrivals: Archibald, Biscuit,
  Thessaly, Snag.
- **Registers, not a generator** (`content/names.ts`). One voice per form —
  office names are beige, menace names are Edwardian, gremlin names sound like
  something that fell off, dog names are food. Arrival rows still carry literal
  names: *an arrival whose name came out of a hash is an arrival nobody decided
  to admit.* A test asserts every authored name is in its form's register.
- **Eloise is the exception that proves the friendship ladder.** She reads as
  "Quiet Ghost" until you are `close`, then she's Eloise (`unknownAs` in
  `cast.ts`, `displayName` in `sim/friendship.ts`). It is the only friendship
  milestone in the game you can point at — and it still isn't a number.
- **Speaker labels read the table.** `sim/dialogue.ts` had `who: "Tired Office
  Creature"` written out by hand, and it was found only because the string was
  distinctive. It's `CAST.office.name` now.

**The migration is the part worth reading** (v22 → v23). `name` is the one
villager field *copied* into the save rather than read from the table — which is
correct, because a Meadow import brings its own and has no row to read from —
so a deployed town would have gone on calling him the Tired Office Creature
forever. It rewrites authored ids only: the CAST rows, the three secrets, and
`newcomer:N` from `ARRIVALS[N]` (the id encodes the index). **Anybody else is
left alone**, because that's an imported sprite and the import is read-only in
both directions.

### Looks — one idea per person, derived from their id

Sprites were baked per form, so every Menace was the same 16×16 image.

- **A look is ONE IDEA: something you can say out loud.** "The pale one", "the
  one with the silver crown", "the golden retriever", "the plum one with the
  snaggletooth". This started life as "one *axis* — colour or accessory, never
  both", and the ceiling is real (six tints × three crowns is eighteen Menaces
  nobody can tell apart, the original bug with extra steps) but it was the wrong
  measurement. Two corrections, both made on screen:
  - **Some letters draw the ANIMAL, not something it wears.** The dog's ears and
    tail (`D`) and the gremlin's horns (`G`) move with the body, because a gold
    dog wearing the grey dog's ears isn't a second look, it's the first one done
    badly. Canon sets the relationship to copy — gremlin horns are darker than
    even the shade, so they read as denser material — and each pair is authored
    by hand, never derived by dimming the fill. Same reason the file won't
    hue-rotate a tint pair: the numbers survive the shortcut, the relationship
    doesn't.
  - **The gremlin crosses its axes, 3 tints × 3 mouths, and nothing else does.**
    It works there because the two axes land on *different parts of the face* —
    colour reads at distance, teeth read up close — where tints × crowns was one
    silhouette in a different hat. 3×3 is the ceiling, not an open door. The
    tints are the ends and middle of the ramp (green, storm, plum) so they stay
    far apart as the mouths repeat; teal, cornflower and pine were good colours
    cut for spacing.
- **One ramp per form beats a spread.** The gremlin's is green → blue → purple.
  The ochre one read as a different species, which is the tell that the axis had
  been left. And **a green resident has to be a green the ground isn't**: the
  first pine draft was within a few points of the grass tile and stopped having
  edges on the lawn.
- **No new art.** Every accessory swap recolours a letter the canon sprite
  already draws with (crown `y`, horns `G`, tie `T`, ears `D`, chest patch `W`)
  or replaces an overlay grid the body already carries (the Scholar's glasses).
  A look names colours, never cells, so **a look cannot knock a sprite off the
  pixel grid** — the one bug class unit tests can't see. A test asserts the
  silhouette's opaque-pixel count is identical across every non-overlay look.
  The dog's "no patch" variant is the trick worth stealing: it paints the patch
  the body colour. Removing art by colouring it in costs nothing.
- **`lookFor(id, form)` is derived, never stored** — same instinct as
  `charDef`. Zero save schema, zero migration, and a town loaded from an old
  save gets its residents' faces for free.
- **Canon belongs to the player, and to nobody else.** Everybody in the town
  hashes into 1..n-1 — institutions included. The player gets the art as drawn
  because the renderer passes no look at all, so the six buttons on the
  character screen still show exactly what you get, and nobody you meet is
  wearing it. This **reversed** the original rule (institutions were canon, as
  the reference picture of their form) because that rule handed a player who
  picked scholar Winifred's exact face: being pixel-identical to the museum
  curator is a worse first impression than any amount of reference purity. It
  also deletes a bug class — the old rule keyed on `fixed`, and getting that
  predicate subtly wrong is what shipped two identical scholars four tiles
  apart. Now there is no predicate: if you are in the town, you hash.
- **Residents are dealt out of what the institutions did not take.** Reserving
  canon put institutions into the same pool as everyone else, and the first run
  of that produced two clone pairs in the starter town (Arabella + Archibald in
  periwinkle, Aurelio + Thessaly in coral). `INSTITUTION_LOOKS` is computed once
  from CAST and subtracted from the residents' pool. Institution-vs-resident
  collisions are now impossible; resident-vs-resident ones are still a matter of
  list length, which is the "add rows" problem and not a code one.
- **"Skins" was taken.** `content/skins.ts` is building finishes; people get
  *looks*. Two appearance systems with one word would have ended up in one
  picker.
- **`mouthDy` is the one field that reaches into the FACE**, and it is capped at
  ±1. The face composites last so mood always reads over an accessory — which
  also means no overlay can move or cover the mouth, so the underbite gremlin
  was impossible until `LookPatch` gained an offset. It slides at the seam the
  glance frames already split on (eye rows vs. everything below); zero keeps the
  face a single blit, so every sprite that doesn't ask for a jaw is byte-for-byte
  unchanged. Two pixels on a 16px head stops being a long jaw and becomes a
  different skull.
- **`/looks.html` is the contact sheet** (`src/tools/looks-preview.ts`, dev
  only — `npm run build` still bundles just `index.html`). Every form, every
  variant, baked through the game's own `SpriteCache` so it can't drift from
  what the map draws; switchable mood, frame, integer scale and backdrop. Every
  correction in this section was found by looking at it, and three of them
  (the bandage-teeth underbite, the invisible-on-grass green, the chest patch
  that was still faintly there) passed the unit suite first.

**Open:** more arrival rows to spend the registers and the look lists on. Both
tables are sized for a crowd that hasn't moved in yet. The Menace still has the
old tint-vs-crown split, which is the pattern the gremlin work replaced.

---

## Phase 7 — The world out there — **proposed, not started**

One exploration phase in three steps. Everything before this made the town
deeper; this makes the world worth walking into. The through-line is one
sentence: **the reward for going far is that there is somewhere to have gone.**
No step adds a payout curve, a marker, or a stored world.

Per the house rule, each step names its DESIGN.md amendment **first** — the doc
changes, then the code. Where a call is genuinely open it's under *Decide*, not
legislated. Nothing here may break an invariant; the *Must not* lines are the
fences.

**Order is 7a → 7b → 7c, and not any other.** 7a is the smallest and lowest-risk
(it extends a system that exists). 7b establishes the found-place table that
7c's entrance hangs off — the staircase is a 7b instance before it is a 7c door,
so 7b has to exist first or 7c has nothing to attach to. 7c is the only one that
touches the layer axis and the only one that warrants a schema look: do it last,
alone, with a tested migration, and verify the ascent in a real browser. Layer
transitions are exactly the "passed the unit test, failed on screen" class this
file keeps warning about.

**Note before 7a: there is no §Biomes in DESIGN.md.** Phase 5 shipped biomes
without one — the invariant lives as a single line inside §Water ("same
invariant as biomes"). So 7a's first move is to *write* §Biomes, stating what
Phase 5 already does, and then add the radius rule to it. Amending a section
that doesn't exist is the doc-first rule failing quietly.

### 7a. The world gets stranger the farther out you go — **done**

Shipped as planned, with two changes the screen forced. **§Biomes was written into
DESIGN.md first** — Phase 5 never wrote one, and the invariant had been living as a
clause inside §Water ("same invariant as biomes"), so there was nothing to amend.

`FIELD_WEIGHTS` replaces the flat six-slot array: a `near`/`far` weight per row,
interpolated by how far the region's SITE is from the datum, smoothstepped from
200 tiles to a plateau at 900. Three new rows — **dusk, glimmer, glass** — at zero
weight near town. No schema change: it is all generation.

**The near world is provably byte-identical.** The `near` column sums to 6 and
cumulates in table order, so it reproduces `FIELD_BIOMES[floor(roll * 6)]` exactly;
one test walks 6000 rolls against a copy of the old formula, and another asserts
`regionStrangeness` is 0 across every tile within 90 of the origin on 200 seeds.
Both halves are needed — the identity is worthless if a region near town is quietly
running at 0.02, which would look untouched on the seed you checked and re-landscape
a house on the one you didn't.

**Two things the tests could not have caught, and one they did:**

- **Strangeness was binary, and the frontier was a paint edge.** The weights alone
  make the roll land all at once: the nearest dusk region was 259 tiles out and
  FULL violet against ordinary meadow, with a hard tile border between them. Near
  regions have always shared borders invisibly *because they barely differ*; the far
  rows are ten times the tint. Fixed by `regionSkin` — a far row's tint amount is
  multiplied by its own strangeness, so the first dusk you meet is a wood with the
  light very slightly off and the one at the plateau is violet to the ground. That is
  what DESIGN.md said all along ("character DRIFTS"); the binary version was the
  cheapest reading of it. Photographed at the frontier: strangeness 0.09, no seam.
  It is RENDER-PATH ONLY — densities never fade, because a tree that faded in with
  distance would be solid at one radius and not at another.
- **Glass lost its trees.** Drafted pale (ground 0.8 toward `#ccdcf0`) the floor came
  out at (193,214,210) and the near-white crowns at (223,234,242) — thirty levels
  apart, which at this size is nothing. Bare grey trunks with a ghost above them, and
  a tree here is SOLID, so that is something you walk into rather than something that
  merely looks wrong. The floor had to get *colder and darker*, not paler. Green is
  the stubborn channel: grass is (139,191,90), so any pale target keeps a high green
  and stays minty — the fix was a target dark and blue enough that the result finally
  has b above g. Same failure produced the first violet, which photographed as
  "slightly murky meadow" at 0.55.
- **A far region may not be RICHER than the near table** — caught by a test, not the
  screen. Glimmer was drafted at 0.4 mushrooms, over three times the fen's record,
  because the mushrooms were going to *be* the biome. A mushroom is a gathered
  material, so that is foraging getting better the farther out you walk: a payout
  curve for distance, which is the one thing this phase refuses. Scrub's 5× rocks are
  fine because they are a **lateral** choice — some direction, a hundred tiles — and
  the distinction is now the test. Glimmer is tied with the fen at 0.12 and the glow
  moved to the tuft, where it belonged: the speckle is on every cell, and a floor
  that glows has to glow everywhere.

Verified with `scripts/shot-biomes.mts`, which grew a longer spiral for the far rows
and now photographs them **at the plateau** — its first run shot the nearest example,
which by design is a whisper, and reported the tints as broken.

### 7a. The plan as written

Extends Phase 5 (six regions, colour and density, nothing gated). The new input
is **distance from the plaza datum**: biome character is partly a function of
how far a chunk is from `0 · 0`. Near town reads ordinary; far out reads
dreamlike.

**DESIGN.md amendment — §Biomes (new).** Biome character escalates with radius.
Palette, flora silhouette, ground cover and ambient particles drift from the
familiar toward the strange as distance from origin grows — twilight bands,
bioluminescent understory, pastel or glass-coloured light. This is Phase 5's
rule with one more argument: still colour, density and flora, still a total
function of `(seed, x, y)`, still stored nowhere, still gates nothing.

Build:

- Feed radius into region selection as a **weight, not a gate** — a far chunk is
  more *likely* to draw an odd region, never locked to one, so there is no wall
  you cross.
- Strangeness is authored as new **region skins** (palette + flora + particles)
  reusing the Phase 5 machinery. No new layer, no new mechanic.
- Glowing mushrooms, drifting spores, odd grass colours are flora skins and
  ambient particles — the same category as a season's repaint, not new
  interactable objects.

Must not:

- **No height.** "Stranger" lives entirely inside the flat one-storey renderer.
  Floating land, impossible geometry, stacked terrain are the no-height rule
  (DESIGN.md §Structures) and are out — that's what 7c is for.
- **No gate, no yield.** A far biome never holds a material the near ones don't,
  never changes a growth time, never hides a finish behind distance.
- **Nothing stored.** Derivable from seed and coordinate, exactly as now.

Decide: the escalation curve, and whether there's a ceiling. On an infinite map
"keeps getting stranger forever" becomes noise; bands that reach a weird plateau
and hold it is probably right.

### 7b. Found places — **done**

Shipped as planned: `DESIGN.md §Found places` written first (folding the grove and
the cube into it), then `content/found.ts` (the table + the letter bank) and
`sim/found.ts` (the siting). Four kinds — the circle of trees, the pond with a
dozen poles and no fish, the mailbox nowhere near a house, and the staircase that
leads nowhere. Three new tiles, all solid, none diggable, none gatherable. **No
schema change**: a found place is a total function of (seed, x, y), so nothing is
stored and no migration hands you one, which is what keeps them secrets rather than
fixtures you happen not to have visited.

**Settled, and why:**

- **They recur outward forever**, on rings — kind K's nth instance at
  `ring + n * spacing`, on a fresh hashed bearing, through `onLand` like every
  landmark since 4c. This is the one place the category departs from the grove and
  the cube, which are one per town. On a map that does not end, a category that runs
  out after the first lap has told you the world ends where its contents do. Rings
  rather than a per-chunk roll because a ring is a DISTANCE, and distance is the only
  thing you steer by out here.
- **The rings start at 96**, past the grove (44), the cube (58) and the blossom rows
  (72), so nothing here can land on an older landmark or the town. A thousand-seed
  test asserts it.
- **The wild holds moods, not people.** People stay in town; the far world holds
  places and the *evidence* of people — a letter with no author, poles with nobody
  holding them. The Ghost and the Mole are worth walking to precisely because almost
  nothing else out there is somebody, and it leaves 7c's inhabitant a real event.
- **The letter is a function of (town, box, day)** — the festival trick, nothing
  stored. The seed is in the key, and was missing from the first cut: without it,
  "the nearest mailbox" is one box shared by every save in the world, holding the
  same line on the same afternoon. The box is empty about two days in three, because
  a box with post every day is a collection route.

**Four things the tests could not have caught:**

- **The poles were brown squares and the mailbox a grey slab.** A standing tile that
  is not in `groundIdOf` gets its own colour painted flat across its cell, with the
  sprite drawn on top. The rule is the one this file keeps relearning: a rod stuck in
  a bank has not ended the bank.
- **The staircase came out as a BAR CHART** — three identical sawteeth, because each
  of its three cells drew the whole four-step flight. The per-cell rule (CLAUDE.md)
  in its purest form. Each cell now draws its own two steps, with the height taken
  from where the tile is in the flight, so the courses run unbroken across it.
- **ACT dug a hole instead of reading the letter.** The mailbox was last in the
  action ladder, on the usual rule that a thing beside you must not hijack the tool
  underfoot — and last meant never: out there you are always standing on grass, grass
  is always diggable, so the shovel always won. The errands board has the same
  precedence and survives only because it stands on plaza stone. The mailbox now sits
  above the tool on the SHAFT's argument (nothing else competes for the cell), and
  the price is that you cannot dig the four tiles around a mailbox while standing on
  them. Somewhere you cannot till is a curiosity; a letter nobody can open is a
  feature that does not exist.
- **The flag looked broken and was the harness.** `drive.mjs` pins the page clock to
  a fixed afternoon, the renderer was asking `Date.now()` for the day while the sim
  used the `now` passed into it, and the two disagreed by a week — a flag up on a box
  the sim reported empty. The renderer now keeps the frame's `now` (`draw(world,
  now)`) and reads that. **Two clocks for one fact** is the actual bug; the harness
  only exposed it. `HARNESS_TIME` is exported from `drive.mjs` so a script comparing
  a date-dependent fact asks the same day the page is on.

`scripts/shot-found.mts` stands in each kind, photographs it, then finds a box with
post today and reads it — the letter flow end to end.

### 7b. The plan as written

One-off oddities scattered across the world, discovered and never directed to.
This is the pattern 4c already proved — the humming cube, the dark grove —
promoted from "the three leftover secrets" to a standing category the world can
keep getting more of.

**DESIGN.md amendment — §Found places (new), folding the cube and grove into
it.** A found place is a small authored oddity sited by the seed: it exists at a
real coordinate, differs per world, and is reached by walking into it, never by
being pointed at. It appears on no map, is announced by no toast, and is spoiled
by no UI (§Tone). It holds a mood, a person, or nothing — never a payout. A
**finish** is the most it may ever give, because a finish is weightless and
gates nothing (§Materials); most give less.

**The singularity note, because it looks like it breaks a rule.** §Water forbids
anything singular on an unbounded map — one ocean on an endless plain is a
diorama. Found places are the deliberate exception, and the distinction is the
whole reason they work: *ambient natural features must scatter or the world
feels empty; authored secrets are allowed to be rare, because rarity is what
makes them secret.* The safety valve is **many kinds at a low density each** —
collectively scattered, individually a surprise. One kind at density one is a
diorama; a dozen kinds at a twelfth each is a world with things in it.

Build:

- A found-place table (kind, siting rule, contents), each entry a seed-hashed
  candidate the generator may place in a chunk, the way landmarks already drop.
- Seed the first set from the tone that's working — earnestly convinced its own
  absurd logic is normal:
  - a perfectly circular grove where every tree faces inward,
  - a pond with no fish and a dozen poles already stuck in the bank,
  - a bakery, warm, with no baker,
  - a lone mailbox in the middle of nowhere that sometimes holds a letter,
  - a staircase that leads nowhere — and one, rarer, that does (7c).
- The mailbox's letter is a total function of `(which mailbox, which day)` — the
  festival trick, content with nothing stored. It is never a request and never
  names a task (§Errands board: a notice speaks only in the past tense).

Must not: no marker, no minimap pin, no "???" slot — finding it *is* the
mechanic. No gate: nothing in the main game may ever require having found one.
Give nothing that ranks — a finish or a line, never a material, a yield, or a
thing another place then needs.

Decide: how many kinds ship and how rare each is; and whether any found place
holds a **person** — a resident who left town, a hermit like the Mole — or
whether people stay in town and the wild holds only moods. That's the hinge
between "cozy oddities" and "the world has characters hiding in it".

### 7c. The sky, as a layer — **done**

Shipped as planned. `DESIGN.md §Structures` was extended and **§The sky written
first**, then the layer, then the staircase, then Sidra. Three tiles (`CLOUD`,
`CLOUD_THIN`, `SKY_STAIR`), a fifth found-place row, and a third `Layer`.

**It cost NO schema change, and that is a decision rather than an omission.**
Nothing up there can be edited, so there is no `world.sky` record to backfill;
the layer is generated from the seed on every read, the way the underground's
rock would be if you had never cut any. The only save-visible change is that
`player.layer` may hold a third value, and a value is not a shape.
`SCHEMA_VERSION` is deliberately **still 23** — bumping it would make a
stale cached PWA build refuse a real save and throw a town away, where leaving it
alone makes that build read `"sky"`, fall through every switch to the surface
arm, and put the player on the ground at the coordinate they climbed from. Wrong,
briefly, harmless. The argument is written out at the top of `sim/save.ts`.

**Settled, and why:**

- **Sidra lives up there, and is in exactly ONE place at a time.** The roadmap's
  lean, with the cost paid rather than ignored: a visitor who is findable
  whenever you like has become a resident with an address. So on a shower night
  she is on your homestead exactly as before and her home is empty, and on the
  other three hundred and sixty days she is at home. One predicate
  (`cosmosVisiting`, sim/housing.ts) answers both where she stands and which
  layer she is on, so the two facts cannot drift apart.
- **You meet her at home as readily as at a shower** — and the sky can be where
  you meet her FIRST, having never seen a meteor. That is the right way round:
  you walked two hundred tiles, found the staircase that goes somewhere and
  knocked. The five nights afterwards are a person you know, visiting.
- **The way up is the 7b decoy, exactly.** Same three steps, same stone, drawn by
  the same line of code. The only difference is that ACT climbs it, and you find
  that out by standing at the foot of one and trying. `foundTile` falls through
  `case "stair": case "skystair":` on purpose, so anyone tempted to mark it has to
  type the difference in.
- **No tool in the sky at all**, and `toolAllowedOn` was inverted from a special
  case to an allowlist (`TOOLS_ON`) to say so. The old form was
  `layer === "under" ? UNDER_TOOLS.includes(tool) : true` — one special case and
  an *otherwise, yes*, which hands any new layer the entire build palette by
  default. `world.build` has no layer in its keys, so a wall painted in the sky
  would have appeared on the ground under it.
- **`takeAlong` takes an explicit `from` layer.** It used to infer the
  companion's previous layer by inversion, which is exact with two layers and a
  guess with three. Whoever comes up with you gets a `climbed` memory — its own
  kind beside `delved`, with lines for all seven forms, and ranked directly under
  the cube in `MEMORY_PRIORITY`.

**What the screen forced, and none of it was catchable by a test:**

- **The parting had to be nearly twice as wide.** The sky is unbounded, plain,
  and identical in every direction, and its exits are three tiles across and
  hundreds apart — "lost in a white room" is a soft lock in a game with no map.
  The fix is the underground's own (a shaft pools daylight; you find your way out
  by finding one), so the cloud thins in a disc around every way down. Drafted at
  radius 8, which *sounds* generous: the viewport is about 22×11 tiles, so a
  radius-8 disc is smaller than one screen, and the photograph taken seven tiles
  from the steps was an unbroken white field. At 14 the parting is wider than the
  view, so walking into its edge says a way down is over there before you can see
  it.
- **And the parting's colour had to drop a long way.** Drafted at `#dfe6f2`, a
  hair off the cloud, it photographed as nothing at all — the renderer's own
  drift texture varied the plane by MORE than its one feature did. The texture
  now sits at 0.35/0.06 alpha and the thin cloud at `#c6d2e8`. The rule that came
  out of it: **a layer's texture must stay quieter than its landmarks.**
- **ACT in the sky dug the field two hundred tiles below.** `applyTool`'s shovel
  knows about the tunnel and assumes everything else is the ground, so with the
  reticle correctly saying "none", the button reached straight past the layer and
  put a hole in a meadow nobody was standing in. Caught by the new sky test, not
  by eye — but it is the same family as the screen bugs, an assumption from when
  there were two layers surviving into a world with three.
- **She was on the ground at NOON on the twelfth of August.** `showerTonight`
  answers about a DATE and `present` wants night as well; using only the first put
  her on the homestead all day, invisible, with her house empty — so the one day a
  year she is technically visiting was the one day climbing the stairs found
  nobody in.

Verified with `scripts/shot-sky.mts`: the approach (does it look like any other
flight of steps?), the climb through a real ACT, the head of the steps, the
parting from its far edge, the open plane, Sidra at home with her own bank, and
the whole layer after dark — because the sky is outdoors and the clock has to
reach it.

**Loose ends, both deliberate:**

- **`sim/path.ts` still never passes a layer to `isWalkable`.** A *walking*
  non-surface villager would route against surface terrain. Nobody does: the Mole
  stands still and so does Sidra. It is a real latent bug and the day somebody up
  there gets a routine is the day it has to be fixed.
- **`world.regrow` keys carry no layer either** — safe only because nothing
  gatherable exists off the surface, and nothing in the sky ever will.

### 7c. The plan as written

The one that has to earn its place against the no-height rule. It earns it by
**not being a height.** The underground taught the pattern: a *layer*, not a
height. The sky is its mirror — a third layer reached through a threshold, never
stacked in z on the surface map.

**DESIGN.md amendment — §Structures.** Extend the existing line. Today:
"Underground (later) is a layer, not a height." Add: *the sky is the same move
upward — a discrete layer, entered through a found threshold, never a tile that
floats above another tile. The surface map stays one storey. Height is still
forbidden; layers are still allowed.*

**DESIGN.md amendment — §The sky (new)**, written as the mirror of the
underground's rules:

- **You reach it by a stair you find, not a tower you build** — the rare
  staircase from 7b, sited far out by the seed. Digging takes you down; this one
  thing takes you up. No build-your-own route, for the same reason there's no
  height on the surface. (Alternative entrance worth weighing: a plant left
  unattended long enough grows a beanstalk.)
- **The reward for the hard-to-reach place is a place, not loot.** The Mole rule
  exactly (§The Mole): what deep rock has that shallow rock doesn't is somebody
  living in it, not more ore. The sky owes the same debt — a mood and ideally an
  inhabitant — and owes you no payout.
- **Nothing in the main game may ever require it.** The mirror of "no wall may
  cost ore". The sky is a secret you may live a whole game without, exactly like
  the grove.
- **Derived, stored nowhere.** The stair from the seed; whatever lives up there
  from seed and calendar.
- **The clouds are not somewhere you \_\_\_.** The underground has its own
  negations ("not somewhere you build a room"). The sky needs its symmetric
  ones. Candidate: not somewhere you terraform — you visit, you don't reshape.
  Decide the exact list.

Build: a sky layer on the underground's layer axis (`present()` / layer-descent
machinery from 4a/4c is the spine — this is ascent on the same mechanism); the
staircase found-place wired to the transition; one authored sky region plus
whatever inhabits it.

Must not: **no floating islands on the surface** — if it can be seen hovering
above a ground tile it's a height and it's wrong; reachable only by going to the
layer. **No ladder of unlocks up there** — a "sky level" of tiered rewards is
the high-water-mark-with-a-hat §The Mole already refused. **No marker to the
stair** — it's a found place first (7b), unspoiled.

**Decide — what's up there.** The real choice, and it's open. Three shapes:

- **Sidra's home.** The Stray Cosmos already visits on the five meteor nights
  and is gone by morning (4c). The sky is where she's from — the one place you
  can find her the rest of the year. Ties a loose thread instead of adding one.
- **A cloud hermit** — the sky-mirror of the Mole. Someone who went up and
  stayed, undocumented, giving nothing, worth the climb because they're there.
- **Only a mood** — a quiet cloud-field with a view back down and nobody in it.
  The sky-cube: it does nothing at all, and that's the whole of it.

The lean is Sidra, because it makes an existing secret deeper instead of
widening the surface area — but the hermit is the stronger discovery beat, and
"nobody, just the view" is the most honest to "the reward is that it's there".
Pick by which feeling you want the climb to end on.

---

## Phase 8 — The feel pass — **8a, 8b and 8c built**

The fine-tooth comb, deferred three times by exploration phases. Not a list of
missing features — every numbered item before this is built — but a pass over
what the game already does, looking for the places where it stops looking like
one object made by one hand.

**How the list was found: by driving the game and photographing it**, not by
reading the CSS. Title screen, settle-in card, HUD, satchel, menu, build mode,
a conversation. Three of the four findings below are invisible in the source and
obvious in a screenshot, which is the same lesson §House rules keeps recording.

The through-line: **the last three feel decisions each fixed one surface and
left its siblings alone.** The icons pass took the emoji out of the UI; the chip
pass took the dark ovals out of the HUD; the panel pass gave dialogue a face.
Each was right and each stopped at the edge of its own file. What is left is the
seams between them.

### 8a — One vocabulary

Two leaks, both of them things that belong to somebody else's design system.
§*Every overlay is the same chip* already made this argument and then stopped
short of the largest button on screen.

- **`.action-btn` is a circle filled with a gradient.** `border-radius: 50%`,
  `radial-gradient(circle at 40% 35%, …)` — the only circle and the only gradient
  anywhere in the interface, sitting over art drawn one pixel at a time. The
  exact complaint that retired the 999px capsule, on the button the player looks
  at most.
- **Two shadow inks.** The world-layer HUD (`.tool`, `.mode-btn`, `.action-btn`)
  drops `rgba(0, 0, 0, …)`; every panel drops the ink `rgba(43, 37, 64, …)`.
  Pure black is in no palette this game owns — the same "a colour that appears
  nowhere else" tell that killed the ovals.
- **"Selected" and "press me" are the same object.** In the satchel the chosen
  finish is solid `--accent`, identical to the primary button, so three stacked
  orange bars read as three calls to action of which one happens to be on.
  Everywhere else chosen-ness is an accent *outline* — `.tool.selected`, the six
  form tiles on the settle-in card. **One grammar: solid accent is the verb, an
  accent outline is the state.**

### 8b — The fold

`.panel` is `max-height: calc(100dvh - 40px)` over `overflow-y: auto`, and says
nothing when it uses it. On a 620px-tall window the satchel's **Done** is cut in
half and the settle-in card's confirm button and Meadow import box are entirely
below the fold — no fade, no cut edge, nothing that reads as "there is more".

**The settle-in card is the first screen of the game**, which makes this the
worst possible place for it: a landscape phone opens on a form whose only exit
is off-screen, and the player has to guess to scroll. A panel that scrolls has
to look scrollable.

### 8c — Ground worth standing on

The town centre reads: plaza, buildings, a river through it. **The homestead
plot is flat green with a scatter of identical tufts**, and it is where the
player spends the most time and builds everything they build.

The trap is named in CLAUDE.md and has caught this project three times: the fix
is **not** a per-cell anything. Texture keyed to the tile grid gives back the
venetian-blind stripe. Whatever this turns out to be, it steps off **world**
coordinates or off a noise field, never off the cell.

**Built.** Two halves, and the ratio between them is the finding: the tonal
field did most of the work and the tufts were where the bug was.

- **`groundTone(x, y, seed)`** — smooth value noise on the WORLD coordinate at
  two octaves, 11 and 29 tiles. Grass and sand mix up to 14% of black by it.
  Nothing is quantized: neighbours differ by well under an RGB unit, so the field
  gets shape and cannot get a contour. `sim/ground.test.ts` asserts that as a
  number (max neighbour step < 0.07) alongside the opposite failure — that it
  still varies by 0.15 within one screen, since a field that only swings over a
  thousand tiles is flat where you are standing.
- **The first version was invisible**, and the reason is worth keeping: it mixed
  the tile's `color` toward its own `shade`, which are eight RGB units apart
  because `shade` is the 1px boundary lip. Across a whole field that moved the
  green by three units and photographed as no change at all. **The lip's job and
  the field's job are different jobs** — reaching for the nearest existing
  colour was the mistake.
- **Three tuft shapes, not one**, off the same hash that places them, and the
  threshold from 0.72 to 0.62. Every blade in the world had been the identical
  five-pixel mark; the eye finds a repeated glyph long before it notices the
  placement underneath is random, so the sparse random scatter was reading as a
  printed repeat. All three shapes stay inside the original 2px, so none can
  reach a neighbour and start pairing edges.

**Found while checking it, not fixed: the biome boundary steps in hard
rectangles.** `biome-border.png` shows the meadow/birch tint changing along a
staircase of tile-sized blocks. Confirmed pre-existing (shot at HEAD before the
tone change to be sure it was not a regression). It is the same class of problem
this step just solved for the grass and it wants the same kind of answer — a
warped or dithered boundary rather than a cell-aligned one.

### 8f — Built surfaces have a grain — **built**

8c gave the ground a texture and stopped at the edge of the terrain, which is
this phase's recurring failure mode written down two sections earlier. **A laid
floor and a wall face were each one flat rectangle of `skin.color`.** You could
tell walnut from pine and you could not tell what either one was *made of*, in a
game whose whole materials model is three substances and a free appearance axis
over them.

**How it was found: by photographing a furnished room**, which nothing had done.
The finding that reframed the job is in the same screenshot — **the build bar's
icons are more finished than the world is.** 8a drew a bed with a blue blanket
and a pillow, a shelf with coloured books, a patterned rug; the placed pieces are
tan rectangles. The icon pass drew every object properly and none of it reached
the world. That is the next step and it is mostly a transcription job, not a
design one — the target art is already in the repo.

**Built: `render/grain.ts`.** Courses and butt joints over a box, emitted through
a callback (a few hundred calls a frame; returning arrays would allocate for
nothing). `Renderer.drawGrain` inks them from the skin.

- **The periods are COPRIME WITH TILE, and that is the entire design.** A plank
  seam is a horizontal light-and-dark line on a continuous surface — textbook
  per-cell edges (CLAUDE.md), and a fourth instance was one `course: 8` away. At
  5 on a 16px tile the pattern only repeats every five tiles, which is far enough
  that the eye reads boards. `grain.test.ts` asserts that as a number: five
  distinct seam layouts before tile six repeats tile one. **Never pick a course
  that divides 16.**
- **The joint length is what separates wood from stone**, more than colour and
  more than course height. The first version butted boards every 13px and
  photographed as *brickwork* — a 5px course broken every 13 IS a brick bond,
  whatever colour it is. A board is milled from a tree and runs most of a room,
  so wood butts every 47 and flagstone every 9.
- **A wall's face is grained and a wall's TOP IS FLAT.** Wood faces are planking
  stood on end (vertical, no butt joints — one board per storey); stone faces are
  horizontal masonry courses. A side run shows its top surface and gets nothing.

  **The rule that came out of it: grain the surfaces the player looks AT, and
  leave the ones they look ACROSS alone.** The side cap is the one part of a
  house seen from above, so a texture there is a third one competing with the
  face and the floor across a single object — and the house stops reading as a
  structure and starts reading as a mashup of materials meeting. Flat, the cap
  is what holds the two grained surfaces together. Same instinct as confining the
  ground bevel to material boundaries: texture where it says something, nowhere
  it merely fills.

  Two wrong answers preceded it, and the first is the instructive one. Grained
  ACROSS the run it was cross-planking — 16px boards butting at both edges of
  every cell, photographing as a brick course down each side of the house.
  **That is the band rule getting back in through the JOINTS rather than through
  the seams**, which is a route CLAUDE.md does not name and which the whole of
  grain.ts was written watching the other door. Turning the boards to run along
  the run fixed the grid and left the surface still too busy; flat was the
  answer, and it was a taste call made by looking, not a bug.
- **Face courses measure from the ground, not from the world row.** Every wall
  stands the same height, so a run's courses line up with its neighbours' instead
  of stepping with the terrain behind it.
- **Cloth has no grain**, and the table says so in place. A seam across a rug
  reads as two rugs.
- **The joints step by a BOND, not by a random offset.** The first version
  jittered each course's joints off a hash, which is what a floor looks like if
  you have never seen a floor: joints crowding, drifting apart, occasionally
  landing two pixels from each other. Reported as "it still looks chaotic — I
  want planks laid at regular patterns", which is the correct description of the
  thing and also its fix. **Nobody lays a floor at random.** A bond is regular by
  definition, and being regular is exactly what reads as workmanship.

  Boards step a third of a board per course (`bond: 3`); stone is `bond: 2`, the
  running bond every brick wall in the world is laid in. `grain.ts` no longer
  takes a seed at all — the pattern is geometry now, which is simpler than the
  thing it replaced. Two tests pin it: the joints in a course are exactly one
  board apart and the fourth course lines up with the first, and the bond has no
  centre (modulo on a negative course index folds the wrong way and would run a
  line of joints to the horizon along y = 0).

  Some stagger remains non-negotiable — with none, every board in a room ends on
  the same line and the floor is a checkerboard, which is the tile grid again at
  another pitch. The bond is the disciplined version of the stagger, not an
  alternative to it.
- **A joint needs two boards to butt** — so a floor one tile wide gets none.
  Reported off a screenshot of a plank bridge: the boards run the width of the
  deck, there is nothing for them to butt against, and the joints scattered up
  it by the per-course stagger read as brickwork. **The same failure as the
  cross-planked side run, and the same underlying cause: a 16px span is not
  something a joint can sit IN, it is a single board.** A joint now needs a
  finished neighbour along the board direction to be earned, which leaves wide
  floors and their ends untouched and turns a one-wide run into plain planks.
- **A wall shows its top exactly when a wall stands to the SOUTH** (`showsTop`,
  sim/structures.ts). It was `N && S` — run-mates behind and in front — which is
  right in the middle of a side run and wrong at a corner: the north-west corner
  has run-mates east and south and no north, so it drew a face. The back wall's
  surface carried straight across both corners and the solid side walls stopped
  short at its near edge instead of running up to meet it. **The fix deletes half
  the condition rather than adding to it**, which is usually the sign the
  original was an approximation of something simpler — a face you cannot see is a
  face nobody should draw. Kass's framing was the spec: standing in a real room
  you see the side walls solid all the way to the back, and the back wall's
  surface only between them.

  The south wall's corners are the check that this is the *right* rule and not
  merely a looser one: they have run-mates north and east, no south, so they
  still draw a face. Tested both ways.

  **A near-miss worth recording: `drawDoorstep` held the identical expression**
  and means something else by it — "is this door in a north–south run", which
  genuinely wants both neighbours. The two agreed by coincidence and were the
  same line of code, so fixing the wall rule would silently have moved every
  doorstep. It is renamed now.
- **A door's shell is the WALL's material; only its frame is its own**
  (`shellFinish`, sim/structures.ts). content/structures.ts already said this in
  the note explaining why a door is wood-only — "the stone finishes reach the
  wall it sits in; they stop at the door itself" — and nothing implemented it. A
  door carries a wood finish *by construction*, so a doorway cut into a granite
  wall drew its lintel and both jambs in pine: **every stone house in the game
  had a plank of timber let into it at the front door.** Pre-existing, invisible
  until the walls had a grain to be interrupted, and reported by Kass off a
  screenshot.

  The door still shows its own finish, as a 1px frame around the opening — added
  with the fix, because otherwise a door's finish would paint nothing at all (the
  opening is a hole, and holes have no material). It reads as what structures.ts
  calls a door: a made object set into whatever the wall is built of.

  **In sim, not in the renderer, and tested.** It is a question about the build
  layer — which run does this door belong to — and it is exactly the class of bug
  this phase keeps finding: obvious on screen, invisible in the source.

**Paint shipped with it, and paint is three table rows.** Sage green, ox-blood
and bone, `applies: "wood"`, off the Gremlin's heap.

- **It was nearly built as a second axis** — a `paint` field on every
  `BuildCell`, so you could paint walnut sage — and that is a stored field on
  every built tile in every live save, a v24 migration, and a second row of
  swatches in the build bar, to express something three rows express for nothing.
  A painted board is a board that is a different colour, which is what a finish
  already is. **As non-starters they touch no save at all**: `skins.unlocked`
  gains them the ordinary way, so there is no migration and no schema bump.
- **They read as paint rather than as stain because of `shade`, not hue.** A
  stain follows the grain and a paint sits on it, so a paint carries a shallower
  shade and 8f's seams show through faintly instead of stripily. Whitewash was
  already this, and was the model.
- **The heap was the right counter and this was overdue there.** It is the one
  counter in the game you can EMPTY, and it was two rows deep — so running the
  Gremlin dry was the fastest thing a player could do to him. Five rows is a
  pile. A tin is also the most junk-shaped object there is; nobody throws away a
  full one.

**Knock-on, unlooked-for and good: the town centre fixed itself.** The
institution buildings were identical tan boxes distinguishable only by footprint.
They are built out of the same finishes the player uses, so the museum came out
in coursed masonry and the timber ones in planking without a line of content
being written. The buildings still have no *identity* — no signage, no roof that
says whose it is — but they are no longer the same object.

**Still flat, deliberately not touched here:** the plaza and the water. Both are
terrain rather than built surface, so both belong to 8c's argument and not this
one, and the plaza now reads worse than the grass beside it precisely because 8c
reached the grass and stopped.

### 8g — Surfaces, roofs and furniture that are not rectangles — **built**

Three gaps found by photographing the game rather than reading it, and each one
turned out to be a rule the codebase already had, applied one place short.

**The plaza had no texture of any kind.** Not "too little" — none. The base
ground fill was gated on `def.name === "Grass" || def.name === "Sand"`, a
condition written when grass was the only ground anyone was looking at, which
then silently decided the answer for every tile added after it. The grain pass
was no help either: it is gated on `isFinishedTile`, which is `id === FLOOR`, and
the plaza is generated terrain. It fell in the gap between "terrain has no grain
and never will" and "built surfaces have grain", and in the interior of an 11x9
square there was not one mark.

- `roll` and `paving` are **fields on TileDef** now. How a surface reads is a
  property of the surface, not a name check in the renderer — that is the whole
  content-is-data argument, and the name check is exactly how this happened.
- The plaza gets half the roll grass does (stone at 0.14 photographs as grime,
  not weather) and flagstone courses through the existing `forEachGrainMark`, at
  the same `GRAIN.stone` periods a laid floor uses. A square and a floor are cut
  from the same stone.
- Water gets **more** roll than any land tile: there the noise reads as depth,
  and there is no tuft or grain to carry the surface if tone doesn't. The
  shallows get less, because that blue is the affordance.
- **The ripple was the per-cell edges rule in a fourth disguise.** Every cell got
  a glint, all of them on the same row — a dotted line at the tile pitch. Hashed
  on the world coordinate now, like the grass tuft, on a row the hash picks.

**Every roof in the game was a picture frame,** and nothing had seen it because
the roof cutaway means every interior screenshot is of a building with its roof
taken off. `drawRoofCell` read the finish per CELL, which works over a wall and
has nothing to read over the interior, so those fell back to the default pine: a
rim in the wall's colour around a pale middle. The whitewashed shop read as a
courtyard. A roof is ONE material, so it is asked once per ROOM — the commonest
finish among that room's own walls, through `shellFinish` so a door votes with
the wall it is set into. In `render/roof.ts`, because it is pure logic over sim
state and can therefore be tested.

**The museum is now the only masonry building in town** — in MARBLE, which is a
new stone row and the only pale one, the list having stopped at granite. It was
cobble first, for about an hour: the biggest footprint in town, in the darkest
grey available, under a roof that takes its material from its own walls, with no
opening but the door. It read as a jail. **Being distinctive is not the same as
being welcoming**, and that is the lesson worth keeping — the cobble version
passed every test the brief set and failed the one nobody had written down.

**Windows are a third structure** (`content/structures.ts`), and almost
everything they needed already existed:

- `solid` AND `encloses`. Solid is the whole difference from a door — a door is a
  hole you may walk through, a window one you may only look through — and it
  makes windows the first structure that is solid and has an opening, which is
  why neither existing draw path could be reused.
- `shellFinish` now asks *is this a wall* rather than *is this not a door*, so
  the next such piece inherits the right answer instead of the old one. As
  written it would have let a wooden sash paint a marble cell pine, which is the
  exact bug that function was added to fix, one structure later.
- **No glass material.** DESIGN's rule is that placing a thing IS making it.
  Glass would have been an inventory line, a barter row, a save field and a gate,
  to make one existing thing slightly more literal.

**A RUN OF WINDOWS IS ONE WINDOW**, and this is the actual answer to "jail" —
the per-cell edges rule in its fifth disguise. Three cells each drawing their own
jambs is a row of little windows, which is a barracks; one opening with mullions
between the panes is a gallery. The same answer `content/town.ts` already gives
for the museum's display cases. The rake of light is world-stepped at a 40px
period for the same reason: wrapped against the pane's own height it restarted
every six pixels and photographed as scratches on the glass.

**A lit window is the player's own house.** No town building has a lamp — lamps
cost ore and are the player's sink — so the warm pane only ever appears over
something they lit themselves. Two things a screenshot found and no test would
have:

- The pane is repainted in the ADDITIVE pass. Painted warm during the wall pass
  it went under the night wash like everything else and came out a muddy tan
  barely distinct from the planks around it. `drawLampGlow`'s own docblock
  already said why — a source has to be the brightest thing in its own light —
  and from outside, the window IS the source.
- **An indoor lamp no longer shines through its own roof.** Nobody had called
  that a bug while houses were sealed boxes; windows make it indefensible,
  because the whole claim a lit window makes is that the light got out THERE,
  through the glass. Keyed on the roof's own fade, so walking inside lights the
  lamp up as the cutaway opens.

**The old cobble note, kept because the argument still holds:** — and until the roof fix
that would not have been worth doing, since a stone building would have had a
pine-hearted roof. Every town building was wood, so the one material distinction
the renderer has was doing nothing at all. `TownBuilding.walls` overrides the
shell only: `finish` reaches the door leaf and the furniture too, and a single
field would have stamped a granite door and a granite table. Cobble, not granite
— granite is byte for byte the plaza's own `#b8b2a6`. **Not** given to the town
hall as well: two civic buildings in the same stone is a category, not an
identity.

**Furniture is drawn from char grids** (`content/furnishings.ts` +
`render/furnishings.ts`) — the build bar's own authoring format at world scale.
Not the icons themselves, which are 12x12, orthographic, one view, frozen hexes.
Two things the icon format lacks:

- `c`/`t`/`s` are **questions, not colours**, resolved against the SkinDef at
  raster time, so one grid serves thirteen finishes. Literals stay literal, which
  is how brass stays brass in a walnut room.
- `rise`. `height` is where a piece's top SURFACE sits and the old path had
  nothing above it, so a chair's back could only be a band painted on the far
  edge of its own seat. Kept under the half-tile `hides()` fades on.

A grid is exactly the box the fallback draws plus its rise, so the table converts
**one row at a time** and anything unconverted keeps the box.

#### Still open here

- **Only chair and cushion are authored.** Bed, table, shelf and rug are still
  boxes; the two town fixtures and the lamp are deliberately staying on their own
  paths. The system is proven, the rest is authoring — and table and rug are the
  ones that cost more, because a 2x1 footprint turned east is a different grid
  SIZE, not a different grid.
- ~~**The museum roof is dark.**~~ **Fixed by marble** — and the fix was the one
  the note predicted, a lighter STONE rather than a lighter roof. The roof stayed
  derived.
- **Only the museum has windows.** Every other town building is still blank-walled,
  and now that windows exist that reads as an omission rather than as restraint.
  The town hall is the obvious next one. Each is a table row plus a rung on the
  migration ladder, so the cost is known.
- **A window in a SIDE run shows almost nothing** — a thin bright band in the
  top surface, because a wall seen edge-on has no face to cut into. That is the
  honest amount there is to show, and it is the same geometry that forces every
  town door onto a south wall. If side windows ever need to read properly, the
  answer is the door's roof-notch trick, not a bigger band.
- **`n` was the facing that proved the fallback is not free.** Falling through to
  `s` puts the backrest at the far edge, which is what a chair facing YOU looks
  like, so a chair rotated to face away never visibly changed. Any piece with a
  front needs `n` authored; `mirrorW` genuinely is free.

### 8h — The furnishing pass — **built**

Nineteen pieces, all drawn as themselves. The brief was *the trees and the
rocks*: less rectangles and planes, more looking like the object.

**Eleven new rows** — stool, bench, sofa, coffee table, desk, nightstand, cot,
wardrobe, chest, dresser, desk lamp — plus a painting, plus art for the four that
were still boxes (bed, table, shelf, rug).

**Twenty-five char grids**, and the sizes are the part that could have gone
silently wrong. A 2x1 table turned east is 1 wide and 2 deep: a different
drawing, not a rotation, so eight pieces carry two grids. Authored through a
generator that asserts every row length and count against `rise + h * TILE +
height` before emitting anything; the file still holds literal rows. A row one
character short slides a piece a pixel off its own tile, and that survives a
screenshot.

The rule that made them read: **draw the thing, not a shaded rectangle.** Legs
with floor showing between them, a cornice on the wardrobe, a kneehole under the
desk, coloured spines in the bookshelf, a fringe on the rug. A grid that fills
its own box is the box with extra steps, which is exactly what the procedural
path was.

**`light` is a field**, not `id === "lamp"` in the renderer. Being a light is a
property of the object — the same argument `speed` on a tile makes about how
ground feels underfoot — and the desk lamp is what proved it. It also caught a
rule that was quietly about a ROW rather than a category: *"nothing you could
NEED costs ore"* skipped `lamp` by name. It skips lights now, and a new test
asserts the exemption runs **both** ways, or a row could buy itself one by
declaring `light: true`.

**`mount: "wall"`** is the painting, and it inverts the placement rule rather
than relaxing it: every other piece refuses a cell holding a wall, and this one
requires it. A door is not a wall — a picture over the doorway sits across the
one cell you walk through. It needs no new draw pass, because a wall-mounted
piece sorts at the same y and bias as its own wall and is pushed after it, so a
stable sort does the layering.

**The build bar grew tabs**, because twenty-two tools do not fit a phone — the
row runs off the side and half the game becomes unreachable. Grouped by what the
thing IS, not by cost or finish, because that is the question you arrive with.
An empty tab hides itself, so the underground still shows exactly the two tools
the rock allows.

> **The bug worth remembering: the tab followed the tool on every SYNC.** So
> tapping a tab was overwritten the same frame — the bar refused to change, and
> the only reachable tools were the ones in the held tool's own group. It has to
> follow the tool only when the tool actually CHANGES. Found by the screenshot
> harness timing out on an invisible button, which is precisely what a thumb
> would have found.

`scripts/shot-showroom.mjs` puts one of every piece on screen at once. It SEEDS
rather than clicking: placing through the bar fought `safeArea` (which drops
clicks near the HUD and looks exactly like a broken tool). The UI path was worth
walking once — it found the bug above — but it is the wrong instrument for
looking at pictures.

#### Still open here

- **The wooden pieces read a little samey.** Table, bench, coffee table and
  nightstand are all a tan top on legs, which is honest — they ARE similar
  objects — but only the desk has a feature that names it. Interior detail on the
  large flat tops (plank lines, a visible joint) is the obvious next pass.
- **`n` is authored for four pieces only** — chair, bench, sofa, bed. Everything
  else falls through to `s`, which is right for a chest and wrong for a desk.
- **The sofa in undyed cloth is very pale** against a pine floor. It is the one
  piece whose default finish works against its silhouette.

### Smaller, still open

- ~~**The rectangular pond**~~ **There is no pond bug — it is the biome
  boundary, and that one is real.** Called as work off a close-up screenshot,
  then measured before touching the generator: `scripts/shot-map.mts` shows every
  water body coming out lobed and irregular with a sand rim, exactly as
  `coastWarp`'s angular harmonics intend. What reads as a hard rectangle in game
  is a two-to-four-tile pond seen at 40 tiles across — at that size a warped
  outline has nowhere to warp — sitting next to the thing that IS rectilinear.

  ~~**The biome patches are straight-edged blocks.**~~ **Fixed in 8d below, and
  not by either answer this note proposed.** It guessed warp-or-dither; the
  measurement said neither. The warp was already working — photographed at 200
  tiles the regions come out lobed and irregular, with no straight bisector
  anywhere — and the staircase was quantization, which no amount of bending
  removes. What removes a step is not having one.

  Worth keeping as method: the close-up said "pond", the map said "biomes". The
  screenshot found something real and named it wrong, which is the argument for
  measuring at the scale the artifact lives at before writing code.
- ~~**The `E 6 · S 6` chip.**~~ **Settled: it stays.** §*Every overlay is the
  same chip* says to cut a HUD label naming something already visible, and
  coordinates are not visible — the rule does not reach it.

### 8d — The turf blends across a region border — **built**

The staircase where two biomes meet. Measured before a line was written, which
changed what got built: **the shape was never the problem.** At 200 tiles the
regions are lobed and irregular — `BIOME_WARP` is doing its job — and the seam is
QUANTIZATION, a hard one-tile step between two flat tints. A wandering line drawn
on a tile grid still steps, so bending it harder buys nothing.

The second measurement decided the size. The two greens either side of the
scrub/pinewood border are **a few RGB units apart and the seam was still the
loudest thing in the frame** — it is not the colour gap that reads, it is the
discontinuity. So the fade is 5 tiles either side and does not need to be more.

- **`regionParts` returns the regions a tile's turf is made of**, with weights;
  `blendRegions` collapses them to one row. Away from any border it is a single
  part returned untouched, which is most of the map and has to stay bit-identical.
- **The blend is EXACT because a biome states a tint, not a colour.** Applying
  (c, a) is `b + (c − b)·a`, so a weighted average of several is itself one tint —
  amount `Σ wᵢaᵢ`, colour the `wᵢaᵢ`-weighted mean. The base cancels, so it
  composes with the season exactly as a single region already did.
- **Ground and tuft only. Flora takes the hard answer.** A tree asks `regionSkin`
  and a pine is never half a birch. That split is the design: turf carries mood,
  flora carries identity, and the treeline stays crisp while the grass under it
  fades. Interleaving the TREES is a separate job that changes generation.
- **It spends none of `HOME_REGION_REACH`.** The blend never moves a border and
  never changes `biomeAt` — it mixes colour near one. The town guarantee is about
  which region a tile IS in, and nothing here is asked during generation.
- **Weights run over all NINE candidates, not the nearest two.** Blending first
  against second puts a seam through every triple point: the second and third swap
  exactly where the partner's weight is highest.
- **Five by five, where `nearestSite` needs three.** A bound, and a close one —
  `d1` can reach ~76, the cutoff ~86, and a site two cells out is at least 81
  away. Measured never to have mattered in a 480k-tile sweep; it is there because
  the arithmetic says it can.

**Two bugs, and neither was the one the note predicted.**

- **The far country was faded by the TILE's strangeness, not each part's own.**
  `regionStrangeness(x, y)` is the strangeness of whichever region the tile is
  nearest, so it jumps the instant the tile crosses a border and drags the fade
  with it. `strangeness`'s own docblock already said why — measured off the site,
  so a region has one character all the way across.
- **The forest clearing was an overlay gated on "is the nearest site the home
  one", which is a hard Voronoi test** — so the wood switched off in the width of
  one tile and left an 18-unit cliff. **The seam is inherited, not new:** past the
  clearing `biomeAt` has always said pinewood inside that boundary and
  `wooded(site)` outside it, and on seeds where the neighbour rolled birch that
  was already a hard line nobody had photographed. The fix is that the clearing
  recolours **the town's own share** rather than overlaying everything, and that
  share fades out like every other.

**A fade may not be wide relative to what it edges**, which is why `edgeMix` takes
a span. The blossom rows are a disc of radius 9; fading them over a border's 5
tiles leaves a core of 4 and dissolves the thing the edge was drawn around. It
gets a third of its radius.

**The test is the shape 8c used, and the number sits between two measurements.**
18 was the clearing cliff; 9 is the steepest legitimate step — the largest ground
tint in the table spread over the fade at smoothstep's peak slope. It asserts 12.
A gradient is allowed to have a gradient; what it may not have is a cliff.

**Still open:** interleaving the flora — a hash-dithered treeline so pines thin
out into the scrub instead of stopping on a line. That one DOES change generation
and DOES spend the `HOME_REGION_REACH` margin, so it needs the thousand-seed test
re-run and is deliberately not folded in here.

### 8k — Regions grow their own things — **four kits built**

Biome character was tree silhouette, tree tint and density, and nothing on the
ground. Kits add an understory: needle litter and sprouts in the pines, pale
blades and white flowers in the birches, reeds in the fen, twigs and grit in the
scrub. The meadow deliberately gets none, so walking out of town is when the
ground starts having things in it.

**DECOR IS NOT A TILE, and that is the whole design.** A tile is exclusive per
cell, so a fern would compete with the trees for ground and could never stand
under one — and it would need a solidity, a walkability, a `groundIdOf` entry and
a place in the flat fill, the last of which has painted a square across a cell
three times (the poles, the mailbox, the junk pile). Decor is drawn the way the
grass tuft is: a mark placed by a hash on the world coordinate, owning nothing,
stored nowhere, blocking no one. **Marks are content** — `DecorKit.marks`, rows
of `.`/`x`/`o` — not a draw path, so a new plant is a table row.

**The doc question it settled first.** DESIGN §Biomes now says the test for
anything in a kit is **"can you carry it home?"** If you can, it is the mushroom
wearing a hat and answers to the mushroom's density rule — the far country is
stranger, never richer, which is the line Glimmer's mushrooms crossed in 7a. If
you can't, it is worth nothing and a region may have as much of it as it likes.
That is why the kits are free to be extravagant, and it is one paragraph rather
than the design pass this nearly became: the "nothing else" in §Biomes is a fence
around MECHANICS, and a fern is not a mechanic.

**THE UNDERSTORY INTERLEAVES, AND THE CANOPY STILL DOESN'T.** The cell rolls its
kit against the same region weights 8d blends the tint from, so ferns thin out
into the birches on exactly the border the ground is already fading across. This
is free precisely because decor is not generation — no solidity moves, no
`HOME_REGION_REACH` is spent, no thousand-seed test is owed. **The tree dither
still owes all three**, and when it lands it should read these same weights.

**8c's mistake, twice more, both found on screen and neither by a test.**

- **Decor drawn in the tuft's ink was invisible.** The tuft is deliberately a few
  units off the grass it speckles; a plant needs to read AS a plant. Decor takes
  the region's CROWN colour now — a fern is foliage — and it seasons for free.
- **A one-pixel flower head is dust on the lawn.** Heads are two.

And one that would have measured as working: the region pick was fed the same
hash that had just passed `< density`, so it only ever saw the bottom tenth of
its range and the cumulative walk handed the first part every cell. **The dither
would have been dead code.** Three independent hashes now — one to place, one to
choose the mark, one to choose the region.

Also: `.x.`/`xxx`/`.x.` is the obvious 3×3 fern and it draws a **cross**, which
at this size reads as a sparkle lying on the lawn. Two leaves off a stem is the
smallest mark that reads as growing out of it.

**Still open:** five regions have no kit (blossom, and the three far rows, and
the meadow by choice). The far rows are the interesting ones — a kit is the
cheapest strangeness there is, and it is the one place §Biomes' "stranger, never
richer" has to be checked mark by mark.

### 8m — Chimneys, and the first thing in the game that is in the air — **built**

**The old note was about the TITLE SCREEN, and it does not transfer.** §*Title
screen* deleted a cabin because its chimney floated at the join — a stack rising
off the slope of a pitched roof has to meet a diagonal, and it didn't. That is a
fact about a SIDE ELEVATION. Seen from above there is no slope to meet: a roof is
a flat plane and a chimney is a small raised box standing on it, which is a shape
this renderer draws a dozen times. Nobody had tried it in the game's own view.

- **Derived, never placed**, like the roof it stands on. `chimneyCell` is a total
  function of the room, on the room's stable id. Extend the house and it may
  move, which is correct rather than unfortunate — a building has no identity
  here (§*A place keeps a history*), rooms are derived from whatever walls are
  standing, and nothing is stored that could disagree.
- **A shed gets none.** `CHIMNEY_MIN` is 12 interior cells. A chimney on
  everything says nothing; the point of one is that somebody lives under it.
- **Biased to the back third.** On the near edge it stands in front of the roof's
  own eave and reads as a crate on the gutter. Against the far edge it breaks the
  silhouette where the roof meets the sky, which is where it is legible — the
  same argument that moved the door cue to a roof notch.
- **Drawn from inside `drawRoofCell`, so it inherits the cutaway fade** — walk
  indoors and the stack goes with the roof it stands on, which it must, or it
  would be left hanging over an open room.

**IT DOES NOT BREAK THE ONE-STOREY RULE, and the distinction is worth keeping.**
DESIGN §Structures: *"if you can see something hovering over a ground tile, that
is a height and it is wrong."* What that forbids is ALTITUDE — a thing at a
height you could occupy, which is a second storey by implication. The stack sits
ON the roof plane the way a rock sits on the grass, and the smoke is air rather
than altitude: there is no height in it anyone could stand on. The test to apply
to anything else in the air is **"could you imagine standing on it, or walking
under it?"**

**The smoke is stateless, and that is the rule it had to satisfy.**
`content/seasons.ts` refuses weather in writing because snow that melted would be
the first weather in the game with STATE. A puff whose height and drift are a
sine of the clock stores nothing and accumulates nothing — it is the water
ripple's trick, one axis up. Keyed off the stack's own position so two chimneys
never puff in time; synchronised smoke reads as a machine.

**Two bugs, both invisible in the source.** `py` inside `drawRoofCell` is ALREADY
lifted by `STOREY`, so subtracting it again put the stack a storey above its own
roof, where the next row north painted over it — indistinguishable from not
drawing at all. And once it was in the right place it was still invisible: built
in `skin.color` on a roof drawn in `skin.shade` darkened a tenth, one step apart
on the same ramp. **A chimney is the same material as its roof, so it can never
win on hue** — it takes the dark silhouette outline `drawFurniture` already uses,
and is separated by an edge instead. A magenta test block found both in one shot.

### 8n — Two regions get air — **built**

Falling petals in the blossom rows, rising spores in the glimmer. **Two, and the
table asserts no more than three**: air that moves everywhere is air nobody
notices, so it is worth having only where arriving somewhere should feel like
arriving. Both of these are places you walk to on purpose.

- **Stateless, which is the rule it had to satisfy.** `content/seasons.ts`
  refuses weather in writing because snow that MELTED would be the first thing in
  the game with state. A mote is a total function of (cell, clock) — nothing
  spawned, no particle list, nothing stored. Mist and rain are still out; a petal
  is not.
- **Air, not altitude.** §Structures forbids anything hovering over a ground
  tile and means a HEIGHT you could occupy. The test is *"could you imagine
  standing on it, or walking under it?"*, and a speck of pollen fails it.
- **Nothing alive.** No midges, no fireflies. There is a test.
- **Which way the air moves is the character.** One region's falls and the
  other's rises, off one signed number.
- **Dithered across borders** through `regionParts`, like the ground decor and
  for free, so petals thin out at the edge of the rows.
- **Petals fall all year**, because these trees are stubbornly in blossom all
  year (§*every colour is a tint*). A seasonal petal would be the only thing in
  `biomes.ts` reading the month for something other than colour.

**Three rounds of the same mistake, and the third one is the lesson.**

1. Position and phase were derived from the hash that had just passed
   `< density` — so it only spanned `[0, 0.1]`, every mote started in the same
   corner of its cell and, worse, at the same point in its cycle. They drifted in
   lockstep and faded together. **This is the decor kit's bug, one file later,
   written by the same hand that had just documented it.**
2. The tile range was extended past the BOTTOM of the screen, which is the margin
   a riser needs and exactly the wrong end for a faller. Both ends now.
3. And then two rounds of tuning colour when **the count was the problem**. The
   answer came from instrumenting `drawMotes` to count what actually drew rather
   than reasoning about what should have. **A mote is a far weaker mark than a
   fern** — one or two pixels, moving, faded at both ends of its cycle — so a
   density that reads as ground clutter reads as nothing in the air. Blossom is
   0.3 where its decor would be 0.1.

**The recurring failure of this whole pass, stated once:** four separate times —
the mover shadows, the decor ink, the chimney body, and the petals — something was
drawn correctly and could not be seen, because it was given a value one step from
whatever it sat on. Three of the four were found by drawing the thing in magenta
at double size, which is now the first move rather than the fourth.

### A staircase that goes nowhere says so — **built**

Reported as a bug: "when I get to the stairs, I can't interact with them." It was
a decoy (ring 163), and the mechanism was working — but **the report is the
finding.** DESIGN §The sky says you find out which flight is real "by standing at
the bottom of it and trying", and trying was not something the button let you do:
`actionTarget` offered a decoy nothing, so the held tool took the tile and ACT
dug the grass at the foot of the steps. That is indistinguishable from a broken
button, and it was correctly filed as one.

- **Every flight claims ACT now**, real or not. Two reasons and the second is the
  better one: a try you cannot make is not a try, and an *affordance that differs
  between the two kinds answers the question before you have asked it* — the old
  behaviour leaked which staircase was real to anyone who noticed their shovel
  had stopped working.
- **The decoy answers with a line about itself** (`stairNote`, a total function of
  which staircase, so one flight always says the same thing — these are meant to
  be old). Nothing is stored, nobody moves, no memory and no journal entry.
- **NO LINE MENTIONS ANOTHER STAIRCASE.** "Long abandoned. Moss has got into the
  joints." is a fact about the object in front of you; a player who has met only
  decoys has been told nothing they could act on. That is the line between a mood
  and a hint (§Found places), and the test asserts none of them contains
  "other", "another", "real" or "this one".
- **The cost noted at `climbTarget` now applies to every staircase**: facing any
  steps, you cannot dig the tile you are on. There is a great deal of grass and
  very few staircases.

**A test asserted the opposite and was rewritten rather than deleted.**
`sky.test.ts` required `actionTarget` NOT to offer a decoy — it encoded the old
call, and the comment now records why the call changed and what must still hold
(the decoy still refuses to climb, still moves nobody, still stores nothing).

### 8o — The glimmer glitters, and the dusk has fireflies — **built**

**The name was a promise the region wasn't keeping.** A place called the glimmer
whose air was plain drifting dots was the one row on the preview page that did
not look like what it is called — which is a thing only a page showing all nine
at once can tell you, and an argument for 8l existing.

- **`shape: "spark"`** — a four-armed burst whose arms grow and shrink over the
  cycle. That is how you twinkle without rotating anything: a pixel-art mote may
  never be turned by `ctx.rotate` (CLAUDE.md), so the glitter comes from the
  SHAPE changing rather than the thing spinning. Same trick as the tuft's three
  silhouettes. Arms on the four axes only — a diagonal one is a 1px stair and
  reads as a smudge at this size.
- **`flash` + `night`** — the dusk's fireflies. A blink rather than a fade,
  because something that brightens and dims smoothly reads as a small floating
  lamp. Gated on the same `darkness` the lamps light by, so "after dark" means
  one thing in this game rather than two: by day the twilight country has no air
  at all, which is most of why it is now worth walking into at an hour you would
  otherwise be indoors.
- **THE PHASE, NOT THE BRIGHTNESS — and it took two wrong numbers to see why.**
  `tintAt` gives day 0, dusk 0.18, night 0.5, **dawn 0.34**. A cut at 0.3 lit the
  fireflies at night and at dawn while leaving the dusk hour dark; dropping it to
  0.15 fixed the dusk hour and kept the dawn. **There is no threshold that means
  "evening", because dawn sits BETWEEN dusk and night on that axis.** The field is
  `evening` now and asks `skyPhaseAt` directly, which says the thing rather than
  approximating it. Both bugs were a number written nowhere near the table it
  reads from.
- **And the preview page had the same bug in its own clock**: its "dusk" row was
  20:30, which is past `NIGHT_START` — so the control for looking at dusk had been
  showing night the whole time. 19:30 now, and **dawn earned a row of its own**,
  because a phase no control can show is a phase no bug can be caught in.

  **Knock-on worth knowing, because it looked like a regression and wasn't.** With
  the clock corrected, the dusk hour was on screen for the first time — and
  `tintAt` lays `rgba(255,132,58,0.18)` over the WHOLE scene in that hour, so every
  region goes warm between seven and eight exactly as everything goes blue after
  it. That wash has shipped since the vertical slice and nothing touched it; it had
  simply never been photographed, because the one control that could show it was
  set half an hour late. Checked against `palette.ts`, `seasons.ts` and `time.ts`
  (all untouched by this phase) and kept. **A mislabelled control does not only
  hide bugs — it makes correct behaviour look like a new one.**

**AND THE FAUNA RULE GOT WRITTEN DOWN, BECAUSE IT NEVER HAD BEEN.** "There are no
animals in this game" was true and lived in a TEST COMMENT and nowhere else —
folklore rather than a decision, and quietly wider than anything anybody had
settled. DESIGN §*Living light, and the animals that stay out* now states it:

> The world may hold light and motion that reads as alive. It may not hold
> animals you can do anything to.

The line is **interaction, not biology.** Nothing may catch, gather, name,
collect, count or wait for a firefly — the moment one can be caught the game has
a bug-catching verb, and behind that a bug wing and a completion grid, which is
Animal Crossing's skeleton picking up an organ this doc deliberately left on the
table. What was ACTUALLY settled before is preserved exactly: fauna may not be a
reward (9b's sanctuary filing), and content may not name wildlife that isn't
there. **The fish stay out permanently** — the poled pond's joke is the absence
(`content/found.ts`), and it is not where fishing gets answered.

`notebook.test.ts` keeps its list unchanged and loses a comment that had become
false. A firefly is absent from that list because a firefly is now somewhere you
can go and see one.

**Where they ended up, after the place question was put properly.** The dusk
keeps them **all day and sparse** — you have to be looking — and it is the one
region allowed to flash at noon, because its whole premise is that its light is
already wrong then. The **meadow and the pines** get them **only on a summer
night**, which is a SEASONAL gate and therefore a design call:

> A season reaches appearance and never a number (DESIGN §Materials). A firefly
> is weather and light, which is what §Seasons says a season IS.

The sentence in §Materials used to read "the season reaches exactly two things"
and now names the rule instead of counting the instances — *not one of them is a
number* was always the load-bearing half.

**And the meadow gets the one exception to its own emptiness.** 8k gave the
town's region no decor on purpose, so that leaving town is when the ground starts
having things in it. A summer night over your own plot is worth breaking that
for, and it costs the meadow's real promise nothing: that promise is about
GENERATION, and motes are render-only. Empty for nine months is what keeps "most
regions have no air" true in the way that matters — most of the TIME rather than
most of the table, which is now what the test asserts.

**The art direction, second pass.** Sparser than the first cut everywhere
(0.09 meadow, 0.06 pines, 0.07 dusk), **barely moving**, and a **pulse that
eases** rather than a linear triangle — the ramp arrived and left at full slope,
which is what a bulb does and not what a firefly does. Smoothstepping the same
window makes it swell and go out, which is the whole effect once the drifting is
gone. Warm yellow in the near regions; **orange in the dusk**, because that
country's palette is violet and a warm light in it should read as the wrong kind
of warm — an ember rather than a summer evening.

**A firefly is a SOURCE, and that is what finally made it bright.** Brightening
the hex did nothing useful — one flat pixel reads as paint however high its
value. It draws through the same additive pass the lamps and lit windows use,
with an opaque near-white `core` inside the kit's colour. **A source must be the
brightest thing in its own light** (hence two inks) — that rule is unchanged and
is why there are still two.

**AMENDED IN 8p, AND ONE HALF OF IT WAS WRONG.** The rule above survived; the
halo and the pass order did not.

- **The wash was over them the whole time.** `drawMotes` ran before the day/night
  overlay, which is a flat `fillRect` across the viewport — so night was painted
  *on top of* every firefly. Four motes at four different points in their cycles
  all peaked at exactly `(139,137,154)`, which is the measurement that found it:
  no per-mote phase can produce one colour unless something downstream is
  flattening all of them. The flashers now draw **after** the wash, next to
  `drawLampGlow`, for the identical reason the lamps are there — night does not
  fall on a light, it is what the light is seen against. Petals, spores and the
  glimmer's sparks stay *under* it: those are objects, and the dark does fall on
  them. Two passes, one branch on `kit.flash`.
- **No halo.** The 0.3 additive spill one pixel out softened every firefly into a
  smudge on the grass. The brightness it was buying is available without it: put
  the *dot itself* through the additive pass and a near-white core clips the
  middle to white while the hue survives at the rim. Hotter than the old glow
  ever was, and exactly `size` wide.
- **The hexes go past the palette.** `#fff04a` / white in the near regions,
  `#ffa022` / `#fff0d8` in the dusk. Everything else in `biomes.ts` is soft
  because it is a surface; these are lights, and a light inside the game's range
  reads as a pale speck.
- **The glimmer glitters on a second clock.** `twinkle` — seconds per glint,
  multiplied over the `period` envelope rather than replacing it. The two are
  different events: the fade in and out is the spore being born at the bottom of
  its drift and gone at the top, and that has to stay slow, while a glint is
  light catching on a face of it and may be as quick as it likes. §"anything
  brisk reads as an insect" is about BODIES; nothing travels faster than before.
  Tied to `period` the effect is unbuildable — one twinkle per eleven-second rise,
  and shortening the period fires the spore up through the canopy. 0.5s a glint,
  its own phase offset per cell so a patch doesn't glitter in unison (that's
  tinsel), and a floor of 0.2 because a flicker reaching zero is the mote
  blinking out, which is a flasher and reads as a firefly.
- **And then the glimmer's density had to come down with it: 0.22 → 0.15.** Not a
  second opinion about the number — a consequence of the line above. 0.22 was
  tuned when these faded slowly over an eleven-second cycle, and mostly-lit
  specks read as TEXTURE, where a fifth of the cells carrying one is fine. A
  glint is an EVENT, and the same count that sat quietly went off eight times a
  frame and read as static. Fewer rather than smaller: the spark is already a 1px
  core, and its arms are what make it read as glitter at all. Half (0.11) was too
  far — two glints in a frame and the region goes quiet, which is the opposite
  failure. **Any change to how a mote BEHAVES re-opens its density**, because
  what was tuned was never the count on its own.
- **Then it was pretty and still stressful, and the fix was not the rate.** 0.5s a
  glint off a floor of 0.2 gave every mote a hard on/off twice a second — and
  `arm` ran off the same number, so each spark also snapped between a dot and a
  five-pixel cross at that rate. **A shape changing is far louder than a
  brightness changing**: twenty-five little stars jumping size at once is what
  made a field of them frantic, where one at a time looked fine. Three changes
  together — arms move on the slow `period` envelope (open as the spore rises,
  close as it goes) so the star holds still; the floor goes 0.2 → 0.5, half-lit
  to full, so it shimmers instead of blinking out; the rate relaxes to 1.4s,
  still eight times quicker than the spore's own cycle.
- **AND THEN THEY STILL DID NOT LOOK LIKE SPARKLES, because a spark was never
  drawn as light in the first place.** The whole additive treatment above went to
  `flash` only; `spark` fell through to `globalAlpha = 0.8` and flat `color`,
  which over teal ground is grey PAINT in the shape of a cross. Two fixes, and
  they are the same two the fireflies needed a step earlier:
  - **Additive, with a `core`.** The white centre clips and the cool green
    survives in the arms. `core` was documented as flash-only and should never
    have been — it belongs to anything that is a SOURCE.
  - **A sparkle TAPERS.** Equal-brightness arms off an equal-brightness centre is
    a glyph: the plus sign on a keyboard. Three tiers — core at full, inner arm
    at 0.5, outer at 0.2 — and the falloff is the entire difference between a
    star and a symbol. Peak went (178,221,214) to a clipped (255,255,255).
  Sparks stay UNDER the night wash even though they are now sources, unlike the
  fireflies. Checked on screen rather than argued: dimmed white sparkles on dark
  blue read as a starry field and look right. Revisit if the glimmer ever gets a
  night of its own.
- **Champagne, because GOLD IS NOT AVAILABLE OVER TEAL.** Worth knowing before
  the next warm mote on a saturated ground. A spark is additive, and the
  glimmer's ground already has green and blue near the top of their range, so a
  warm ink has headroom in RED ONLY and the arms come out khaki. Rendered at four
  points from mint to saturated amber against the real region: the amber read
  olive and slightly swampy, and a frank `#ffd98a` gold went sage where its arms
  met the grass. `#ffeec4` stays close enough to white that the ground cannot
  drag it green and lands where the warmth was wanted — it reads as white gold
  more convincingly than the gold did. **Pick a mote's tint by what survives the
  additive pass, not by what the hex looks like in the file.**
- **Measure churn and it lies to you.** Frame-to-frame pixel change went UP after
  the calming pass, because sparks that stay open are bigger and drift — the
  metric was counting motion as agitation. A filmstrip at 120ms answered it in
  one look: before, one spark flicking in and out of existence; after, two
  holding their shape across every frame. More of them are visible now than at
  0.22 ever was, because they no longer go dark — and it is calmer anyway, which
  is the whole point. Count is not business; behaviour is.
- **The flash is short.** The pulse window went 3.4 → 8, about a second and a
  half of every six with most of that arriving and leaving. At 3.4 a firefly was
  lit for half its cycle, which is a lamp with a dimmer on it. This costs
  instantaneous coverage on the rule below and the densities were left alone
  anyway: the answer to "too few" is more of them, not longer blinks.

**THE PREVIEW PAGE IS THE WRONG INSTRUMENT FOR DENSITY, and that is worth knowing
before the next kit.** A swatch is 13 tiles — about 170 cells. Full screen at the
far zoom is nearer 900. So a density tuned until a swatch looks right puts five
times too many on the screen the game is actually played on, which is exactly
what happened here: 0.09 read as "a few" in the sheet and as a swarm at full
size. The page is for COLOUR, SHAPE and SIDE-BY-SIDE comparison; density is
settled in the game, at the size somebody plays it. Fireflies are 0.028 / 0.018 /
0.022 now, a third of what the sheet suggested.

**Tuning note worth keeping.** A flasher needs roughly double a fader's density
for the same read: it is dark for most of its cycle, so instantaneous coverage is
density × the flash window. At 0.14 the dusk had two specks in a swatch and they
looked like stray pixels rather than fireflies.

### 8q — The glimmer grows into itself — **built**

Puffier trees, orbs in the crowns, champagne caps. Two new `BiomeDef` fields,
both data, both used by exactly one region so far.

**The orbs are LIGHT, and that decision is the whole feature.** A round pale
thing hanging in a tree reads as fruit, and fruit reads as pickable — so walking
under one to find that ACT does nothing is a promise the game made and broke.
The header rule ("a biome changes appearance and never yield") bites here in a
subtler place than a locked material. Drawn as light instead — additive,
white-cored, the same `#ffeec4` as the region's sparks — it reads as the wood
glowing, which is something you look at rather than reach for. The blossom rows
get away with blossom on the same argument.

**A bead, not a splat, and proportion settled it.** Two wrong cuts first: the
spark's own geometry (1px arms on four axes), which is a sparkle by construction
and read as glitter stuck onto the tree; then four pixels across, which on a
sixteen-pixel crown is a quarter of the tree. The reference picture answers it by
ratio — an orb there is about a twelfth of the crown — and a twelfth of this
crown is under two pixels. A 2×2 with one bright pixel in it.

**AND THEN IT SHOULD NOT HAVE BEEN A SCATTER AT ALL.** `orbs.spots` is now a
table of `[dx, row]` offsets — one arrangement, used by every tree that has
orbs. Two generations of distribution came first (independent hashes, which
clumped; then even angles with jitter inside each slice, which fixed the
clumping) and both read as unsettled. **The problem was never the distribution:**
three lights whose relationship changes from tree to tree hand the eye a
composition to re-solve at every trunk. Pixel art at this size is drawn, not
generated — same house style as ROCK_SHAPES and the decor `marks`. The hash still
picks WHICH trees are lit, which is where variety belongs: a mixed stand of trees
that agree about where light sits.

**Three orbs off one hash is not three hashes.** Multiplying a single value by
different constants gives numbers that look independent and are not: the first
cut put three orbs in a neat evenly-spaced row on the same crown, which reads as
a decoration somebody hung there. Offsetting the tile (`tx + i*37, ty - i*17`) is
free and gives each orb its own draw. **This is the decor kit's bug for the third
time in this file** — see also the mote phase, which came off the density roll.

**They breathe at a fifth of the sparks' swing.** A light sitting perfectly still
in a canopy full of shimmering air reads as paint on the leaves. This is a light
RESTING in a tree, not one catching a facet, so it wants noticing only if you
look — 3.5s a breath against the sparks' 1.4s glint.

**The mushroom is a TINT AND NOT A SPECIES.** Same silhouette everywhere — cap,
overhang, gills, stalk — because a mushroom is gatherable and hands back a plain
`mushroom` wherever it grew. A puffball shape was the obvious prettier answer and
is the yield promise broken from the other end: it says "different thing" and
gives you the same item. The red was the one warm-blooded thing in a region built
of teal and pale gold; recoloured, it reads as the same mushroom standing in this
wood's light. Regions without `mushroomCap` keep the red, which stays stated
outright in the renderer — and night is a `Tint` over the region's own cap rather
than a second table of hexes to keep in step with the first.

**Crowns take the HARD region, not the blended one** — `regionSkin`'s existing
argument, now applying to mushrooms too. Half a champagne cap fading back to red
across a border is a mushroom caught between two minds.

### 8r — Shrubs — **built, glimmer only**

The first node that exists in one region and nowhere else. A `SHRUB` tile, a
`NODES.shrub` row, and `BiomeDef.shrubs` as a multiplier that **defaults to
none** — so a shrub exists only where a row asks, and adding it to a region is a
number rather than a change to the generator. Rolled after the trees, so turning
it up thickens undergrowth instead of thinning canopy.

**Two wood against a tree's eight, and that ratio is the whole balance
argument.** Shrubs start in the far country, and the far country must never pay
better than home — the same refusal the glimmer's own mushroom density is
written against. Four shrubs to a tree means four fellings for one tree's worth,
so undergrowth is something you clear on the way past rather than a reason to
walk out. It is the one field in `biomes.ts` that touches yield at all; it is
allowed because wood is not scarce anywhere. **Keep it that way when this
spreads to other regions.**

**Solid, like a tree**, because half a rule is worse than either: something the
same size and shape as a thing you walk around, that you walk through instead,
teaches you to distrust every silhouette in the game.

**It fells to GRASS, not DIRT** — the one place it parts company with the tree.
A tree leaves bare earth because a tree was bare earth's worth of trunk; a shrub
that scarred the ground would pock a wood with dirt patches for two wood apiece.

**It reuses `crownRows` rather than carrying its own shape** — the middle of the
region's own crown, scaled and closed at both ends. That is what makes a shrub
look like it belongs where it grows for free: puffy under the glimmer's puffy
crowns, and narrow and tiered if the pines ever ask. A second silhouette table
would let the two drift until a region's bushes were a different species from its
trees. Three corrections while fitting it. **Size, twice:** five rows at 0.6 is eleven
across by five tall, a barrel lying on the grass; seven at 0.45 fixed the
proportion and undershot, reading as a tuft rather than a bush you walk around.
Nine rows at 0.6 of the widest crown row is about two thirds of the tree above
it, and solid enough to be the obstacle it actually is. **And it inherits the
crown's WIDTH, not its PROFILE** — copying the middle rows verbatim also copies
their per-row wobble, and the glimmer's crown wobbles on purpose: widen, narrow a
pixel, widen again reads as lobes at fourteen rows and as a bite out of the side
at nine. *Detail does not scale down.* One number comes from the region (how wide
its foliage gets) and the dome is the sprite's own, so a pinewood bush still comes
out narrower — which is the whole point of inheriting anything. Also **proportionally more lit rows than a tree
gets** (a crown lights 6 of 14; lighting 2 of 7 left a dark lump that read as a
HOLE in this region's bright floor).

No trunk: at seven rows a stem is a third of the sprite, and it stops reading as
a bush and starts reading as a very small tree — the one thing it must not be,
being solid and worth a quarter of the wood.

### 8s — Every region grows its own grass — **built**

`BiomeDef.tufts`, a list naming which marks a region's speckle is drawn from,
and four marks to draw from: `cluster` (three points round a gap), `sprout` (two
leaves off a stem), `blades` (two uprights of unequal height), `dot` (one pixel).

**The tuft shapes had been global since they existed** — one table of three, in
the draw call, tinted per region but identical in form everywhere. Adding a
fourth made the problem visible rather than causing it: four shapes at equal odds
read as CHAOS. *Every cell a different plant is not a meadow, it is a seed
catalogue.* Same fix `crownRows` made for trees — the shape is content, so it
belongs in the row.

**Which two is most of what a region's floor says about it.** The scrub has no
sprouts because nothing there is sprouting; the fen has no bare dots because
there is no patch of it that is merely dirt with a speck on it; the pines have no
sprouts under a closed conifer canopy; the glimmer has no blades, because it is
the one region with lights in the air AND in the trees and its ground has the
least room of anywhere to be busy.

**Weights are repetition, not a second field.** A region lists a shape twice to
draw it twice as often, so the mix is legible in the row rather than in a table
of numbers kept in step with it somewhere else.

**The hard region, like a crown and a mushroom cap.** A shape has no in-between,
so a border dithers WHICH plant grows rather than smearing one into another —
which is the honest version anyway: two kinds of ground meeting is two kinds of
thing growing.

Three shape notes worth keeping. The old L was a **corner**, and a corner is the
one thing that never occurs in a meadow — it read as a chip out of something
built. The old two-stack-with-a-pixel-beside-it was **one pixel away from a
sprout** and never resolved into a plant until it got it. And blades of EQUAL
height read as a gate; unequal reads as grass.

**Known and left alone: the scrub's set is currently theoretical.** Its tuft is
`#bcb26c` at 0.6 over already-bleached ground, so the marks barely register — the
"dry blades and grit" idea is right and invisible. Either the scrub is meant to
read that bare, or its tuft wants contrast before the shapes can do any work.

### 8t — Every region weathers its own stone — **built**

`BiomeDef.stone = { tint?, shapes? }`, and two new silhouettes (`slab`, `shard`)
beside the original three.

**The rock was the LAST object stating its colour outright.** Crowns, trunks,
tufts and mushroom caps all take the region; `drawRock` said `#8d8a84` everywhere,
so the glimmer's teal floor had one warm grey thing lying on it — the identical
complaint that got the mushrooms recoloured, and less obvious only because it is
about **one stone a screen** out there rather than a scatter. Measured, per
175-cell screen: scrub 17.5, meadow 4.3, dusk 2.3, pines 1.9, birch 1.6, glass
1.2, glimmer 1.2, fen 0.8.

**A tint and a shape list, never a palette.** The stone keeps its day/night greys
and its lit, body and shaded rows; the region pulls all of them the same
direction. A region that had to restate the lighting to change the colour would
drift out of step with the rock everywhere else the first time either moved.

**Shape says more than colour here.** The scrub is the only region with enough
stones for a shape list to do real work, and it gets the three dry silhouettes
and none of the round one: *that ground cracked, it did not wear.* The fen gets
slabs — anything that stood up there went under long ago. The pines get rounded
shapes only, because nothing sharp survives that long in shade.

**A shard is a near-column, not a pyramid.** `[1,1,2,3,3,4]` widens smoothly from
tip to base and renders as a little heap of rock; `[1,1,2,2,2,3]` reads as
something that GREW out of the ground. That distinction is why shards are
far-country only and there is a test: near town, stone is just stone.

**The meadow has no `stone` row on purpose** — default grey, original three
shapes. Every other region is a departure from it, and a departure needs
somewhere to depart from. Also tested.

**A glint on the glimmer's stone, and it is CAUGHT rather than emitted.** That
line is the one the region has been drawing all along: sparks, orbs and fireflies
are SOURCES — additive, white-cored, brighter than the palette. A rock is an
OBJECT. The first cut ran the glint through the same additive pass and it came
out **white**: over an already-lit row red saturates first, so the one thing the
pixel loses is its hue. Painted flat instead, the hex arrives intact. It also
keeps a promise — a stone with a hot white centre is a *gem*, and a gem is a
material claim this does not get to make, since it still gathers plain `stone`.

**Two pixels down the face, the lower at half alpha.** One lit pixel is a POINT,
and at this size a point is what a firefly is; a highlight on a faceted rock runs
along the EDGE of a face. The falloff is doing the work rather than the length —
two *equal* pixels would be a stripe. Same lesson the sparkle's arms taught.

Affordable here for a reason that would not hold elsewhere: **about one rock a
screen** in the glimmer, so a mark on every one still lands rarely. On the
scrub's 17.5 a screen the identical idea would be a field of blinking, which is
what "competing instead of coalescing" meant on the tuft.

**The shard took three goes to stop looking aggressive.** `[1,1,2,3,3,4]` is a
pyramid (a heap of rock, not a piece of one); `[1,1,2,2,2,3]` fixed the heap and
was POINTY — a narrow tip over a widening body is a triangle however you step it,
and a triangle at this size reads as a spike. `[2,2,2,3,3,3]` removed the tip and stood six
rows tall, which is most of a trunk — a monument, and this region already has
enough standing in it. `[2,2,3,3]` is where it landed: four rows, two masses, no
tip. **Low is what settled it.** At that height it reads as a block of stone the
ground pushed up, where anything taller starts making a claim about who put it
there — and it is still the tallest of the five silhouettes and still nothing
like a boulder, which is all the shape ever had to do.

Two more that were tried and cut: a narrow flat-topped column came out a
**headstone** (the failure `CUBE_H` already records for the cube), and a per-row
`lean` was built and removed — at this size the staircase reads as a block
sliding off another block, and unused capability is worse than none.

Glimmer mushrooms 0.075 → **0.045**. Pale caps on a floor that quiet were still
the thing you noticed first, which for a region whose name is about *light* is the
wrong first thing.

### 8u — Spring gets a signature — **built**

`DecorKit.season` (the field `MoteKit` already had) plus a second slot,
`BiomeDef.bloom`, and four regions that flower.

**Spring was the only season you could not see from the ground.** Summer has
fireflies, autumn has the largest crown swing in `seasons.ts`, winter has bare
branch-coloured crowns — and spring was a slightly different green. A season only
the palette knows about is not much of a season.

**Why it is allowed:** decor is drawn and nothing else — no tile, no solidity, no
yield — so a thing that is only there for three months costs nothing that DESIGN
protects. *A season reaches appearance and never a number.* It is the cheapest
true seasonal event the game can have, and there is a test that a bloom without a
season is a mistake: a permanent `bloom` is just a second `decor`, and two
permanent kits on one floor is the clutter the slot exists to avoid.

**TWO SLOTS, NOT A LIST.** Every region that has both uses them for exactly two
things: what is always here, and what is here *now*. A list would invite a third
and a fourth, and the ground has room for about two kinds of small thing before it
stops reading as ground. The bloom runs on **four private hashes** — cell, region
pick, mark, and corner — because sharing any of them with the year-round decor
would pin flowers to the ferns, and spring would arrive as a recolouring rather
than as something coming up between them.

**The scrub is the best beat this buys.** It is written as dry everywhere else —
no sprouts in its tuft list, grit in its decor, bleached in every tint — so three
months of small hard yellow is the exception that makes the other nine mean
something. Dry country blooms harder and briefer than green country, which is why
it has the highest bloom density of the four.

**Then each region got the plant that actually grows on its ground**, which is a
better organising principle than picking colours that look nice together — the
birches get wood anemone (*Anemone nemorosa* carpets broadleaf woods and is gone
before the canopy closes), the pines get lupine (*Lupinus perennis* wants acid,
sandy, half-shaded ground), the scrub gets thistle (dry, stony, overgrazed
openings), the fen gets marsh marigold (it wants its feet in water, which no other
row can offer). The blossom rows were given fallen petals and then **had them taken
away again**, which is worth recording: it closed a tidy loop — that row has had
petals falling through the AIR since it was written, with nothing on the ground
for them to land on — and on screen the loop was the problem. Pink in the crowns,
pink in the air and pink on the floor is one colour doing three jobs, and the
falling petals stopped reading as MOTION because they no longer crossed anything
that was not already their own colour. **The bare ground is what the blossom is
seen against.** (Those trees also flower all year, so a spring-only carpet under a
permanently blooming orchard was never a season anybody could read.)

**A third ink: `DecorKit.core`, drawn for `*` in a mark.** With two inks a bloom
is a coloured blob on a stalk; the centre is what says the petals are arranged
AROUND something, and at three pixels wide that arrangement is the whole drawing.
Without it the anemone's nine pixels are a pale PLUS SIGN — the mark this project
has already thrown out twice (the tuft's old L, the spark before it tapered). It
falls back to the petal colour, so every kit that never uses `*` is unchanged.

**Contrast decided who got the flower with an eye.** Petal against that region's
own ground: birches 1.37:1, pines 1.56:1, scrub 1.26:1, fen 1.06:1. The fen's old
violet separated by HUE and barely by value, which is the weaker axis at nine
pixels — going yellow took it to about 1.75:1, the best of the four. The scrub had
to pale its petals to let an eye read at all, which spent the contrast it had
least of; it kept a blunt bloom instead, which suits a blunt region.

**THE LUPINE'S LESSON IS GAPS.** Four solid attempts failed identically — a
zigzag, an I-beam, a cone, a slim column — because each was one MASS. A raceme is
several flowers sharing an axis, and at this size the only way to say "several" is
to not join them: separate dots read as separate blooms where any connected shape
reads as one object. Then arrangement: one diagonal reads as a spike that has
fallen over, and an arch (widest at the bottom, botanically the right way round)
renders as a little fountain. A **V** reads as a plant at a glance, and five dots
rather than three is what keeps it a V instead of resolving into a Y. Pale at the
outer tips — a raceme's newest buds are its furthest out.

**Five pixels wide to enclose an eye.** At three, "petals all the way round a
centre" is a 3×3 block, and the shape reads as a TILE before it reads as a flower
— the one thing a cup must not do. At five the corners come off and the ring
closes. The marigold is the biggest bloom in the file, which is fair: a kingcup is
the biggest flower any of these regions grows.

**The birches' flowers moved out of `decor` and into `bloom`.** They used to stand
there in December, and a region cannot be "the airy one" in every season by
wearing the same flowers through all four of them.

**The meadow and the far country stay out, both tested.** The meadow's rule is
that leaving town is when the ground starts having things in it; a bloom would be
that rule with an asterisk for three months a year. The dusk, glimmer and glass
carry their strangeness in the air and the canopy, and their floors have enough.

### 8l — A page that shows every region at once — **built**

`/biomes.html` + `src/tools/biome-preview.ts`, the sibling of `/looks.html`, and
dev-only for the same reason (`npm run build` bundles `index.html` alone —
checked, `dist/` has one page in it).

**It runs the real `Renderer` over the real generator**, so it cannot drift from
the game — the same argument `shot-biomes.mts` already makes about not
reimplementing the field to find a fen. What it adds over that script is the
thing a screenshot cannot do: **nine regions side by side.** Half the decisions
in `biomes.ts` are relative — the pines are dark *against the birches*, the scrub
is parched *against the meadow* — and photographing one region per run could
never show a relation. Controls for season/hour (one knob, because the renderer
takes both from `now`), zoom, seed, and a reroll, since a row that only looks
right on one seed isn't right.

**It paid for itself on the first run**, twice:

- **The three far rows read as ordinary green woods.** True and useless: their
  tints come UP with distance, so the NEAREST dusk is the faintest one that
  exists, and the page was sampling exactly that. Far rows are searched from the
  plateau now (`STRANGE_TO`, 900) and the swatch says `far`. They were working
  the whole time and nothing could see it.
- **The meadow swatch was the plaza** — paving, the noticeboard, two villagers —
  because the town's own region is meadow and the honest nearest instance of it
  is the town. There is a `TOWN_CLEAR` now.

Also: blossom reported "not on this seed" for something at a known coordinate,
because it is a disc of radius 9 and the general search asks a region to clear a
margin wider than that. A landmark is sited rather than rolled, so it is asked
where it is.

**Two API notes.** `Renderer.snapCamera` already existed and was re-added by
mistake before the compiler caught it — the game code diff for this page is one
new method, `setChrome(false)`, which drops the reticle. That is not a display
option and must not become one: in the game the reticle is the promise about
which tile ACT lands on, and a contact sheet has no ACT button to promise
anything about. The player sprite stays, deliberately — it is the page's only
scale reference and the fastest way to see a region has gone too dark to read a
resident against.

### 8i — The town stops floating — **built**

Every standing thing in the world already had a contact shadow. The things that
MOVE did not: `drawEntity` drew the quantized sprite and nothing else, so the
player and all eleven villagers hovered over ground that the trees, rocks,
mushrooms, lamps, walls and museum cases were all sitting on. Two lines to fix,
and it was invisible in the source for the usual reason — the fifteen objects
that had one each spelled it out locally, so nothing anywhere said "movers are
the exception".

- **Same band, same ink, same hard edge as the other fifteen** — `rgba(0,0,0,
  0.16)`, 2px tall, at `feetY - 2`. Worth stating because the style doc this
  came from asked for a *soft, blurred, dithered ellipse* three times, and all
  three words are outside this game's vocabulary (§*One vocabulary*: no circles,
  no gradients, no blur). The existing convention was already the right answer.
- **It does not take the walk bob.** A shadow that hops with the sprite is
  attached to the creature rather than to the ground, which is the opposite of
  what a contact shadow is for. Leaving it on the floor is what makes the hop
  read as a hop.
- **It does take `alpha`**, so the Ghost's shadow is as faint at night as she is.
- **WIDER THAN THE FEET, and that is the whole of why it reads.** The first
  version copied the tree's 9px band and changed nothing on screen: a creature
  sprite is a teardrop, about 9px across at the base and wider above, so the
  shadow landed entirely BEHIND the body. **This is 8c's first-ground-field
  mistake in a second disguise** — there, reaching for the nearest existing
  colour (`shade`, eight RGB units away) gave a texture nobody could see; here,
  reaching for the nearest existing width gave a shadow nobody could see. A
  contact shadow is legible only where it spills past the silhouette. 14px.

**Still open, and deliberately not done here:** the tree and rock bands have the
same problem — 9px under a crown three times that wide, invisible against grass
at every zoom. Widening them is the same one-line change fifteen times over and
wants its own look, because unlike a creature they are not all the same width.

### 8j — Reconciling the visual style doc — **verdicts only, nothing built**

An external style brief (roofs, walls, interiors, biomes, finishes) was read
against the code and against this file. Most of it describes problems already
solved, often **by a different method than it proposes**, so the verdicts are
recorded here to stop them being re-proposed.

**Already built, do not rebuild:** roof shingle courses (stepped off world px,
coprime with TILE); the roof's directional edges (drawn only where the roof
ENDS, via a neighbour test — the brief's "replace the uniform outline" is done);
the roof overhang and door notch; wall autotiling, top-cap/front-face, merged
window runs, door frame in its own finish; per-footprint floor finishes (v27) and
rugs; warm light pools (5a); grass tonal variation and three tuft shapes (8c);
water tonal noise and the hashed ripple (8g); day/night tint and the season
palette swap.

**Settled the other way — the brief is wrong for this game:**

- **Per-building roof tint.** A roof is ONE material per room, derived from that
  room's own walls (`render/roof.ts`). The dark-museum bug was fixed by a
  lighter STONE, not a lighter roof, and §8f says so explicitly. Building
  identity comes through wall material and (still unbuilt) signage.
- **Transition tiles between biome pairs.** The staircase was real; 8d fixed it
  by blending the tint across the border, not by authoring edge tiles. The brief
  was right about the symptom and wrong about the mechanism, and so was this
  file's own note, which guessed warp-or-dither.
- **A `{material, paint, weathering}` finish model.** A `paint` axis was nearly
  built and killed by name in 8f (a stored field on every built tile, a
  migration, a second swatch row — for something a finish already is). DESIGN's
  "a finish names its material and the material is what costs" is the model.
  There is no weathering system; adding one is a design decision, not a style
  tweak.
- **Seasonal snow on roofs.** §Seasons: no snow layer, ever. It would want to sit
  on every cell — the per-cell edges band — and snow that melted would be the
  first weather with state. `moments.test.ts` fails on the word.
- **The biome kit's critters and mist.** There is no fauna; `notebook.test.ts`
  fails on any content line naming an animal. Weather is a named open loose end
  needing its own pass across three docs (§Known loose ends), not a style change.
- **A hero landmark per biome.** §7b: authored rarity is many kinds at a low
  density each. One guaranteed per biome is a diorama, and it is the sentence
  "one kind at density one" says.

**Genuinely open, and the brief's real yield:** roof PITCH shading (a
distance-to-edge value ramp — nothing in this file has ever discussed it, and it
must be reconciled with 8f's "grain the surfaces the player looks AT, leave the
ones they look ACROSS alone" before it is built); a wet rim / foam band at the
shoreline; surface clutter (items rendered ON tables and shelves); and a
world-space chimney, which §*Title screen* already flagged as worth redrawing
properly rather than the version that floats at the join.

### 8e — The counters show whose voice it is — **Arabella built, four to go**

Found by photographing all seven institution panels, which nothing had done
before. Arabella's counter opens with *"Cloth. ... You can't grow it, and you
certainly can't chop it down."* — her voice, in the house ellipsis style
CLAUDE.md defines for spoken lines, printed as body text under a heading with
**nobody attached to it**.

§*A counter is a screen, a conversation is a person* gave the test — "whether a
face would look wrong on it" — then applied it to Gary and left the five
counters alone. That was right about the FRAME and wrong about the speaker.

- **`panel()` takes an optional `face`**, beside the heading block, via
  `counterFace(id)`. Same portrait and same `lookFor` as the dialogue frame, so
  the person behind the counter is the person you meet on the path.
- **NOT `speechPanel` folded in.** Its docblock refuses that and still should: a
  counter is a price list you scroll and a conversation is not, and `who` keeps
  meaning the eyebrow and nothing else. This is the smaller claim.
- **The errands board stays faceless, and is the control.** It has no speaker,
  its prose is written as notices rather than speech, and it reads correctly as
  it is. If a later change gives it a face, the rule has been misread.
- **Still to do:** Nub (heap), Winifred (museum), Derek (seed stall), Aurelio
  (stage). One line each — `counterFace("heap")`. Arabella shipped alone on
  purpose, so the frame could be looked at before four more followed it.
- **Open, deliberately:** the spoken line sits flush to the panel edge while the
  name is indented past the portrait. Aligning it under the name reads as
  speech; leaving it full-width reads as a subtitle for the screen. Pick once,
  for all five — it changes the character of the frame.

**Method note, and the reason this was found at all.** The survey was run by a
subagent that reported all seven panels clean. Two of its fourteen screenshots
were checked by hand and the first one held this bug. Its first pass had also
returned five byte-identical files as five separate screens. **A clean result
from an unverified survey is not evidence.** The rest of that pass — night,
autumn, winter, underground, the other five panels — remains one reviewer's
word, and is worth re-checking before anything is built on it.
- ~~**A blank name gives "New Sprite"**~~ **Settled: the card requires one.**
  Dealing a name out of the form's register was the prettier option and was
  rejected for the reason `content/names.ts` already gives about arrivals — a
  name nobody decided to give is a name nobody chose, and this one is the
  PLAYER's, shown in the menu every time they open it. Gating costs two seconds
  of typing. Embodying a Meadow import is the exception: it arrives with its own
  name and the box is disabled, so gating on it would be a dead end.

  **Knock-on worth knowing: this broke every screenshot script.** `drive.mjs`
  clicked primary buttons to get through onboarding, and a disabled one left the
  harness sitting on the title art forever. `onboard()` fills the name box now
  and bails on a disabled button rather than clicking into the void.

---

## Phase 9 — What the town keeps — **done**

Four steps that deepen the town's texture and memory. The through-line: **the
town keeps things, and nothing it keeps is ever a score.** Each step rides a
discipline already written here — the museum record (no total, no denominator,
no empty slots) and the festival rule (being there is remembered; missing it is
not). The recurring enemy is the checklist; those two rules are the fence,
quoted where they apply.

Doc amendment first, then code (house rule). Calls that are the author's are
under *Decide*. The one hard sequencing rule is at the bottom: **Moments ships
last.**

### 9a — Buildings that remember — **done**

Structures accrete a small history off the memory spine that already exists. A
room knows who has slept in it and what happened within its walls, and says so
when asked or when a resident brings it up.

**DESIGN.md amendment** — §"NPCs that remember" / §Structures. Add: a structure
keeps a short history the same way a resident does — past sleepers (home is
already a claim on a bed, `sim/home.ts`) and notable events witnessed at its
coordinates (`witness`, with the `onlyPresent` proximity model from 4b). It
surfaces as a line, on inspection or in dialogue: "the Menace has slept here
since spring," "this is the room where you first met Eloise." It is a memory,
never a meter.

**Build**

- A per-structure history log — a capped, appended list of sleeper spells and
  location-tagged events, reusing `witness` output rather than a new capture
  path.
- Surfaced through the channels memory already uses: a resident's line, and/or a
  context action on the building.

**Must not**

- No count that grows into a rank. "Sheltered twelve families" is a score with a
  roof on it. Keep the scale honest to the town's real churn (arrivals run out
  at four) — this is a handful of names, not a tally to climb.
- No completion. There is no "every building historied" state and nothing reads
  whether a building has history.
- Cap the log. Stored edits are fine; unbounded ones are not.

**Decide**

- Inspection line, resident dialogue, or both.
- How many spells a building keeps before the oldest falls off.

**Settled, and why:**

- **Anchored to coordinates, never to a building.** A building has no identity
  in this game and did not get one. `Room.id` is the lexicographically smallest
  interior key (`sim/rooms.ts`) — stable across recomputes, and emphatically not
  stable across renovation: extend a house one row north and it changes. A
  history filed under the walls would be **deleted by the player improving the
  house**, which is the exact opposite of the promise. So `world.places` is one
  flat log of `{kind, x, y, at, who?}` and a room is a QUERY over it
  (`placesIn`). Knock a wall out, push the house into the next field, and it
  keeps everything it had and inherits what that field remembers. Pinned in
  `history.test.ts` by asserting the room id changed and the line did not.
- **A place remembers a kind of work happening near it, not each swing.**
  `PLACE_MERGE = 8`: a second event of the same kind within eight tiles is
  dropped. This is the load-bearing constant. A floor is two hundred boards and
  one afternoon — recording two hundred entries would be both a lie about what
  happened and a flood that pushes every older entry out, and any cap then
  evicts "the room where you first met Eloise" behind a day of shovel work. The
  personal kinds are exempt and merge per PERSON instead: two residents who
  first spoke to you in the same room are two memories, however close they
  stood.
- **`MAX_PLACES = 24`, a backstop rather than a budget.** With the merge doing
  nearly all the work this should almost never bite; the scale is honest to the
  town's real churn, which is a handful of names.
- **Both channels, and they carry different things.** The record — flat, factual,
  past tense, ONE line per kind — is `content/history.ts`, and a room that
  phrased itself differently each time you asked would be a record you stop
  trusting. The social half is `RESIDENT_HISTORY` and covers **only `met` and
  `built_plank`**: six forms × eight kinds is forty-eight line pools for a
  feature whose point is that it stays small, and a villager remarking that you
  once dug a hole in what is now their kitchen is a sentence nobody needs. A
  resident never narrates their own tenancy at you.
- **No panel.** The Decide item said "inspection LINE", and it is one — a house
  answers into the ordinary flash, top two notes joined. A screen listing what a
  building remembers is a page with gaps in it, and a page with gaps is a
  checklist. Two, not one (one means `met` outranks everything and the room never
  mentions anything else) and not all (a wall of text is also an inventory).
- **v24 backfills EMPTY.** Every plank in `build` is a floor the player laid and
  every claimed `homeBed` is somebody who sleeps there, so a backfill would have
  been trivial — and every entry would be a fabrication with a made-up timestamp
  on it, in a system whose only promise is that it says things that happened.

**Two bugs the browser found and the tests could not**, both worth keeping:

- **`witness` anchors to the PLAYER, and the place has to anchor to the TILE.**
  Everything else in `witness` is about who was standing near you, because
  friendship is about company. Build mode paints at a distance, so flooring a
  house while standing in the garden filed "you laid these boards" in the garden
  and the room never said the one line it exists to say. It takes an optional
  `where` now; the regression is the first test in `history.test.ts`.
- **The door check sat BELOW the tool, and that meant never.** A doorstep is
  grass, grass is always diggable, so the shovel won every tap and a house could
  not be asked anything at all — which is, word for word, the mailbox's lesson
  three comments up in the same function ("somewhere you cannot till is a
  curiosity; a letter nobody can open is a feature that does not exist"). It
  sits above the tool now. It is cheaper than the mailbox because it can
  **decline**: a door only offers this when its room actually remembers
  something, so a house that has seen nothing costs its own doorstep nothing.

And one found by reading the real flash: two notes from the same season came out
as "...back in spring. You laid these boards yourself, in spring." Both true,
and the pair read like a form letter. The clause says WHEN, and once it has been
said the next sentence is already in that season.

### 9b — The town hall's ridiculous paperwork — **done**

Gary's "progression paperwork" (§fixed cast) grows into a standing filing
system: world-customization disguised as bureaucracy, taken with total
seriousness, free because nothing here costs anything. This is the Pillar 5
crown jewel, and it drops in cleanly as long as the two classes of filing are
held apart.

**DESIGN.md amendment** — §The fixed cast (Gary). Add a §Paperwork: filings are
the town's deadpan self-government. A filing is a form you submit at the hall;
the joke is that these creatures govern themselves this earnestly. Two classes,
and they are not the same feature. **Flavor filings** change nothing and exist
to be filed and to sit in the cabinet — Petition to Rename Tuesday, Application
for Local Legend Status, Official Recognition of Tiny Mountain, Certificate of
Suspicious Moss, License to Haunt. **Filings with teeth** change a rule, and each
is a separate decision, never a free addition. The cabinet is a record, not a
score (§museum): no filing count, no total, no "forms remaining."

**Build — flavor filings**

- Author freely. A table of forms, each a title, a straight-faced blurb, and a
  stamp. The stack is browsable — reading old filings is half the delight — and
  browsing it is not a checklist, because there is nothing to complete.

**Build — filings with teeth (each vetted, none free)**

The teeth are where the fun smuggles in exactly what the doc forbids. Named, so
the choice is conscious:

- A **protected/park designation** would stop building there. Nobody but the
  player builds (only the Gremlin nudges fences), so this can only lock your own
  shovel — and Pillar 6 says real time gates the living world, never your hands.
  Allowed only if it's opt-in and freely un-filed; a hard, sticky lock on
  terraforming is off-tone.
- A **sanctuary → rare birds arrive**. Spawning fauna as a filing's reward turns
  the form into an unlock, which paperwork must not be. If birds are ambient and
  cosmetic anyway, the filing may name what's already possible — it must not gate
  it.
- A **declared holiday** is a player-made festival, and festivals are a total
  function of the date with nothing stored or counted (§Festivals). A declaration
  has to store a date, so it's a real carve-out in the stateless rule — the same
  one the "accidental traditions" idea tripped. Lovely, but it's a decision, not
  a freebie.

**Must not**

- The cabinet is not a to-do list. No filing names a task, carries a target, or
  shows a completion state (§Errands notices: past tense, no task).
- No filing count anywhere.

**Decide**

- Which teeth-filings, if any, are worth their named carve-out. (The steer: ship
  all the flavor ones now; take the teeth one at a time, later, each on its own
  merits. The flavor stack alone already lands the pillar.)

**Settled, and why:**

- **Forms arrive in BATCHES, and each batch has a reason.** This is the author's
  call and it is better than either option on the table. A catalogue on day one
  is a to-do list wearing a letterhead; one form at a time is a deadline in a
  cardigan. Instead the hall has the forms it has always had, and then a
  referendum happens (turnout: one, and the hall is not permitted to say which
  one), or an audit finds the hall was operating without a complete schedule, or
  a drawer is opened and three forms are inside it already printed in a hand
  nobody recognises. **The notice is printed above its own forms and is the best
  part of the feature** — the reason the town acquired three more forms is more
  interesting than the three forms.
- **A batch is a total function of how long you have lived here** (`batchesBy`,
  `daysInTown`), on the §Festivals model. Nothing schedules a batch, nothing
  stores one, nothing counts them, so **v25 adds `filings` and nothing else**.
  Four batches today at 0 / 3 / 10 / 21 days; more are rows.
- **An old save gets every batch at once, and that is correct.** Releases key off
  `createdAt`, so a town that predates the feature has been in town that long and
  the hall owes it everything it missed. Nothing was lost by the cabinet arriving
  late.
- **The counter is not a to-do list.** A filed form LEAVES the counter, and a
  batch with nothing left under it drops out entirely — five struck-through
  titles under a heading is a completion meter nobody had to write. The empty
  counter says the HALL is between forms: a fact about a bureaucracy, never a
  verdict on the player, and always "not yet" rather than "finished" because the
  next batch is on the real clock.
- **No count anywhere.** `world.filings.length` is a number the UI may never
  render, and `sim/filings.ts` exports no total, no denominator and no set of
  what is outstanding. `cabinetEmpty` is a boolean so the empty state can be a
  line rather than a zero — the museum's `collectionEmpty` exactly.
- **All fourteen are flavour filings; none has teeth.** The three named teeth
  candidates (a park designation, a sanctuary, a declared holiday) stay out, each
  its own decision on its own merits. `filings.test.ts` asserts filing every form
  changes nothing about the world, so a form that quietly grows teeth fails.
- **A conversation AND a counter, which no other institution gets.** The other
  six are counter-only ("the shop IS the conversation"), but Gary genuinely has
  both — the land claim and the commission beat are conversations and already
  live in his speech panel. So the hall is a `choiceBtn` that CLOSES the dialogue
  before opening, rather than a modal stacked on a modal.

Found by looking, and the reason to keep driving these: the cabinet showed only
the **stamp**, so a form's own text — the joke — was read once at the counter and
never again. Reading old filings is half of what the cabinet is for. It holds the
blurb too now, with the stamp under it as a greyed note, which reads as the
office's annotation rather than as part of the form.

### 9c — The Notebook — **done**

A naturalist's journal that accretes oblique observations as you encounter the
world — "owls have only been seen near very old forests," never "combine X + Y."
Observations, not instructions; a record of what you've noticed, never a
checklist of what's left.

**DESIGN.md amendment** — new §The Notebook. The Notebook holds observations in
the world's own voice, added when you first meet the thing they concern. It is
the museum record applied to discovery: no total, no denominator, no empty slots.
You learn what else it might hold by going and finding it, never by reading a
blank. It gives you a way to remember what you've seen and never a way to see
what you've missed.

**Build**

- An observation table: a trigger condition and one oblique, in-voice line.
  Entries append on first trigger; the panel shows only what has fired.
- The panel gets a door — closable three ways (house rule; the satchel shipped
  trapping the player once).

**Must not**

- No "???" slots, no locked entries, no count. A blank that implies more is the
  exact UI spoiler §Tone bans for secrets, wearing a journal cover.
- It reads its own past; it never sets a future task. No entry may name a thing
  to do.
- It must not imply completeness. The record shows what you've seen and stops
  there — same sentence as Corrigal's gallery.

**Decide**

- Auto-fill on encounter, or only when a resident remarks (which ties it to
  dialogue and keeps it social)?
- Nature only, or town and social observations too?

**The finding that shaped everything: THERE IS NO FAUNA IN THIS GAME.** Not a
bird, not a fish, not an insect. The two birds that once crossed the title sky
were removed because three pixels cannot draw flight (`content/props.ts`), and
the poled pond exists *precisely* because there is nothing to catch in it
(`content/found.ts`: "the poles are not fishing equipment, they are evidence of a
committee"). So this step's own headline example — "owls have only been seen near
very old forests" — was never writable, and neither is any entry like it. What is
actually out there is ground, water, light, rock, distance, shape and the town.
`notebook.test.ts` asserts no entry mentions an animal, because the first player
to go looking for the owl would find a bug.

**Settled, and why:**

- **Two kinds, told apart by HOW they were recorded** — the author's call, and
  better than picking one. `noticed` reads as a field note in your own hand
  ("A suspiciously round cluster of trees, all facing in. Trees do not face.
  These do."); `told` carries the name of whoever told you ("{who} mentioned that
  the metal does not come back"). Told rows hold TWO strings: the `remark` they
  actually say, in their voice, and the `line` you write down afterwards. A test
  fails if the two are ever identical, because then one of them is doing nothing.
- **Nothing stores how far you got.** `sim/mining.ts` and `content/junk.ts` both
  refuse a "deepest reached" counter in writing, and a `farthestFromPlaza` field
  is that object renamed. So every noticed trigger is arithmetic on where you are
  standing *right now*, and the ENTRY is the record that you were once out
  there — which means the condition is free to go false again, and a test pins
  that it does. v26 stores an id and a timestamp per entry and nothing else.
- **The far country is keyed on the BIOME, not on a radius.** `dusk`, `glimmer`
  and `glass` carry `near: 0` weight in `FIELD_WEIGHTS`, so they are impossible
  near town: standing in one is proof of distance without anything having to
  store a distance.
- **Predicates live in sim, text lives in content**, because content may not
  import sim. `notebook.test.ts` pins the correspondence in both directions — an
  observation nothing can fire is dead content, and a trigger for a row that
  doesn't exist is a typo that never reports itself.
- **Told rows fire in conversation and nowhere else**, gated on the speaker being
  `familiar` or better. Nobody tells a stranger the thing they have privately
  concluded about the ground, and the gate staggers the town's half of the book
  so four reachable institutions don't empty their pockets at you on the first
  hello. `tryTellLine` is the one `try*` in `dialogue.ts` that WRITES, and it has
  to be: being told is a conversation, so the entry is recorded by the act of
  saying it.
- **That branch sits ABOVE `trySecretLine`,** and this is the subtle one. Three
  of the seven told rows are spoken by the Mole, the Ghost and the Cosmos, and
  `trySecretLine` returns early for exactly those three — below it, the best half
  of the feature could never fire once. There is a test whose only job is to
  notice if somebody moves it.
- **The sweep is throttled to 500ms** and its timestamp is a `WeakMap`, not save
  state — a cache key, like `buildRevision`. The due-checks around it in `tick`
  compare two timestamps and are free; this walks a table asking about biomes and
  found sites, and none of those can change within one frame.
- **The panel has no choices in it.** Three doors, no count, no blanks, no "???",
  and no headings by subject — grouping needs categories, and categories you have
  nothing under are the blanks this must not have, while categories only for what
  you DO have quietly tell you how many kinds of thing exist. Chronological,
  because a journal is a sequence. A journal you can act from is a quest log.

Found by reading the real panel: the eyebrow said "What you've noticed" over a
view that also holds what you were told.

### 9d — Moments — **done**

The game quietly notices beautiful configurations — the first snowfall, the
meteor night you watched with a crowd in the plaza, a companion who walked a long
way with you — and remembers them the way a person does: unbidden, unranked,
resurfaced later in a line. This is the easiest idea in the whole pile to ruin,
and it's ruined the instant it becomes a screen.

The cleanest form is not a new feature at all. It's the memory spine noticing
more than dialogue-facts — noticing firsts and configurations — and letting them
back out through the channels memory already uses. There is no Moments panel.
There is only a world that occasionally says "I remember when we watched the
meteor shower."

**DESIGN.md amendment** — new §Moments (under §Time). A Moment is the festival
rule generalized: some configurations of the world are remembered when they
happen, nothing is lost when they don't, and nothing anywhere counts them. A
Moment is detected as it occurs, stored as an ordinary memory entry, and only
ever resurfaces the way a memory does — a resident's line, a postcard, past
tense. There is no Moments list, no gallery, no total, and no notification. It is
remembered, never awarded.

**Build**

- A small authored set of Moment triggers (a first, a shared rarity, a long
  companionship) feeding the existing memory log — a widening of `witness`, not a
  new capture system.
- Resurfacing rides dialogue and the postcard. Nothing new for the player to
  open.

**Must not**

- No Moments screen. A page of Moments with gaps is an achievements page, which
  is XP with a scrapbook cover — and §Materials/§Time rule out XP.
- No toast. "✨ Moment unlocked" is an achievement notification; it surfaces later
  and obliquely or not at all.
- No count, no tiers, no rarity badge.
- Ungameable triggers. A surfaced, farmable condition ("watch a sunrise with six
  villagers") becomes an objective the moment players learn it. Triggers stay
  unstated and unoptimizable — remembered, never set.

**Decide**

- Which firsts and configurations qualify (keep the set small and authored).
- Whether the player has Moments about themselves (the companion who walked 300
  days) or only ones shared with a resident.
- Channel: dialogue, postcard, or both.

**Settled, and why:**

- **A Moment about yourself goes in the NOTEBOOK, and that is the author's call.**
  Both options on the table were worse. A player-side store is the shape that
  grows a panel and would have cost a schema version; "a moment alone is simply
  not remembered" throws away the best thing in the idea. The journal already is
  the record of what you personally noticed, already refuses counts and blanks,
  and already fires once and stays — so a solitary Moment needed no new storage,
  no new panel, and no new rule. **Nothing about 9d bumped the schema. It ships
  on v26**, because a Moment is written into two logs that were already in the
  save.
- **Two records for one event, and the journal half never waits on company.**
  Alone or not, you saw it; if somebody was standing there, they also remember
  it. Making solitude the ONLY route to a journal entry would have taught players
  to walk away from people before anything nice happened, which inverts the
  section — `moments.test.ts` pins both halves firing together.
- **Two of the three Moments needed no new journal row at all.** `a-busy-sky` was
  already the field note for a meteor shower and `far-out` for the edge of the
  survey, both written in 9c. That is the strongest evidence the shape is right:
  a Moment is not a new thing that happened, it is a SECOND RECORD of something
  the game already knew about. Only `the-cold-came` had to be written.
- **The postcard is not a channel, and this was not a taste call.** It fires
  exclusively on load (`app.ts`, from `start()`), so a Moment — which happens
  while you are playing — could only reach it by inventing an in-session
  postcard, and an in-session panel announcing something you just did IS the
  toast the section bans. Dialogue only.
- **`sweepMoments` does not call `witness`, for two separate reasons.** `witness`
  befriends whoever was present, because friendship here grows out of doing work
  somebody can see — and nobody has done anything under a meteor shower, the sky
  is doing it. It also *could not*: these predicates are evaluated on the 500ms
  sweep rather than at the instant of an action, so a Moment routed through
  `witness` would pay a friendship point every half second for as long as the
  condition stayed true.
- **The sweep is why `already()` exists, and it is the one real trap here.**
  `shower` and `winter_came` are deliberately not one-shots (each night and each
  year is its own, the `festival` argument), and every other repeatable memory in
  the game is written ONCE at the instant of an action. These are written by a
  predicate that stays true for hours. Without de-duplication by kind AND value a
  single shower would append twice a second and push a villager's entire 64-entry
  life out of the ring inside a minute.
- **No crowd clause**, though the sketch said "with a crowd in the plaza". The
  fixed cast stand at their posts around the clock and everybody else is asleep
  in a bed they own, so a plaza holding two waking villagers at 2am is not
  something this game produces — the clause would have read beautifully and never
  fired once. Whoever is beside you is who was there.
- **THERE IS NO SNOW**, and the headline example died the same death as 9c's owl.
  "Saw my first snow" was the obvious first Moment and is unwritable:
  `content/seasons.ts` says in writing that winter is a colour temperature and
  NOT a weather layer, because snow on the ground would want to sit on every cell
  (the per-cell edges band, three times now) and snow that melted would be the
  first weather in the game with state. The entry is about the light and the
  trees, which are what actually change on screen. `moments.test.ts` fails on any
  line mentioning snow, and on any line that names its own trigger.

**A bug found on the way, on the same mechanism:** the Cube's `witness` call fires
EVERY FRAME while you stand near it, and `witness` befriends unconditionally — so
a companion walked all the way out to the Humming Cube gained a friendship point
sixty times a second and pegged at maximum in about two seconds. The longest walk
in the game was also the only friendship faucet in it. Nothing caught it because
`hum` is a one-shot, so the MEMORY was always correct and only the friendship
leaked, and every test here asserts on the log. `someoneHereLacks` now gates the
call; removing the gate turns the regression test from 1 back into 60.

**Verified in a browser** (the roadmap asked for it): Prudence brought the winter
up unprompted — "We were out when the cold arrived. I recorded the day. I was
wrong about the day — it had been coming for a week." — with the matching field
note in the Notebook. Two things the drive found that tests could not: an
institution's tap opens their COUNTER rather than a conversation, so Moments only
surface through ordinary residents; and standing at the heap wrote no Moment at
all, because the facility has a roof and `underTheSky` correctly refused it.

**Known loose end, deliberately not tackled here: weather.** The author wants to
consider real weather at some point, and it is a genuine design decision rather
than an addition — `seasons.ts` currently refuses it in writing (state, and the
banding risk), and §Moments and §The Notebook both have entries written around
its absence. It needs its own pass, reconciling those three docs first.

### Sequencing for code

The only hard rule: **9d ships last, alone**, because it is the one most easily
turned into a score and it benefits from being built slowly against its own
fence. Before it, any order works; a sensible one is 9a → 9b → 9c. 9a is small
and proves the "read history through channels that already exist" approach that
9d then reuses. 9b is largely authoring — reach for it first if you want a quick,
high-tone delight win, and keep every teeth-filing out of the first pass. 9c is a
new panel, so it inherits the panel house rule (a door, three ways to close) and
the museum-record fence (no blanks, no total). Each schema touch ships a tested
migration; verify the Notebook panel and any dialogue resurfacing in a real
browser, not just tests.

---

## The title screen — **done**

The first screen used to be a cream card on a black void. The first line the
game says is "it's real", and nothing was behind it. There is now a farm:
`src/ui/title.ts` draws the town seen from the road on its own canvas, and the
welcome and settle-in cards sit in its sky.

**Settled, and why:**

- **Side-on, not top-down.** The game is a top-down tilemap and the title screen
  is not. A horizon with buildings on it says "a town" in one glance; the same
  field from above says "grass". The projection changes at the door.
- **One canvas, logical pixels, integer scale**, exactly as `render/renderer.ts`
  works — not a stack of positioned `<img>` props at CSS percentages, which is
  how The Meadow builds its paddock and which lands art on fractional pixels the
  moment the window is an odd width.
- **Scale comes from the geometric mean of the viewport's sides**, not its
  width. Width alone gave a phone a 195×422 logical scene: a composition 195
  wide stretched under a sky 422 tall, with the whole town in a strip at the
  bottom. The mean pulls a tall screen up a step.
- **Two depth tiers, 1× and 2×**, plus 3× for the one framing tree. A continuous
  perspective ramp is not available to pixel art — 1.6× is a resample. Doubling
  is the only depth cue there is, and it is enough; the first pass drew
  everything at 1× and the field read as a flat green wall.
- **The town hall and the board are ALSO 2×**, despite being the furthest things
  in the picture. The grids are drawn at a creature's scale, so at 1× a seat of
  local government came out the height of the trees beside it. The eye checks "a
  building is about three creatures tall" before it checks anything else.
- **The card sits high, in the sky, not centred.** Centred, it landed on the
  horizon and covered the buildings entirely.
- **Nobody is in it.** An early pass put two residents in the field, randomised
  per load. They pulled the eye straight off the town and onto themselves, and a
  title screen that introduces two specific strangers is making a promise about
  them. The place, empty, is the subject; you meet the first person on the next
  screen.
- **One built thing on the horizon, not two.** There was a homestead cabin as
  well, and it went because its chimney floated — drawn rising off the left
  slope of the roof, which works as a silhouette and falls apart at the join. It
  is worth redrawing properly (chimney through the ridge, or set into a gable
  end) rather than shipping the version that only works if nobody looks. A civic
  building alone in a field is also the better joke: the retirement town has an
  administration and not much else yet.
- **One band of hills behind the town, not two.** Two read as layered hills
  receding, which is a landscape painting's job; one reads as the edge of the
  woods this clearing was cut out of, which is the town's.
- **Always midday**, whatever the clock says. A title screen is a poster;
  opening the game at 11pm should still show the delightful version.

Content is in `content/props.ts` (Farm-side art) and `content/canon/props.ts`
(five outline-free props vendored from The Meadow — its sun, cloud, fence,
flowers and tuft draw no ink at all, so they cross over unchanged; anything of
its that carries its warm `#402e3a` outline was redrawn in Farm ink instead of
imported, or it reads as pasted in from another game).

---

## Known gaps and loose ends

Small things that are half-built or deliberately stubbed. Worth knowing before
you trip over them:

- **Three pieces still borrow their north view from their front, and two read
  as blocks turned sideways.** `scripts/shot-rotations.mjs` photographs every
  piece facing all four ways — run it, look at it, that is the whole tool. What
  it found, in the order worth fixing:

  1. ~~Wardrobe, shelf and chest showed their doors, books and clasp from every
     angle.~~ **Fixed 1 Aug 2026** — one back panel each, used for `n` AND `e`
     with `mirrorW`, because at one tile wide a box's side IS its back. Painted
     in the finish's shade rather than its colour; see the comment above
     `WARDROBE_BACK` in `content/furnishings.ts` before authoring another.
  2. **`desk`, `dresser` and `cot` have no `n` grid**, so a desk pushed against
     the top wall still shows the camera its drawers and its kneehole. Same
     shape of fix as the three above, but these are 2×1 and the back is not the
     side, so it is a real second grid rather than a shared panel.
  3. **`sofa` and `bench` turned east or west collapse into a tall block.** The
     arms-and-back reading that carries the front view has nowhere to live in a
     one-tile width. This one is a redraw, not a missing grid.

  Settled while doing it: **rotation is opt-in per piece, not a property of
  furniture** (which is also what Stardew does — most of their catalogue is a
  single sprite). `gridFor()` falling back to the front view is the feature. A
  piece earns a second grid when its silhouette has a front: a chair does, a
  stool does not. Rendering cost is not the constraint — grids rasterize once
  and cache per id/facing/finish — authoring is.

- **The Meadow's `flowers` prop has a miscounted row, and the vendored copy
  corrects it.** Its bottom row is twelve cells where the other four are eleven;
  its rasterizer sizes the canvas off the first row and silently drops the
  overflow, so the bug never showed there. `content/props.test.ts` caught it on
  its first run. Same situation as the Menace below — the copy is no longer
  byte-identical, the fix has to be made by hand in the other repo, and nobody
  should "restore" the twelfth cell here.
- **The Farm's Menace is one pixel different from The Meadow's, on purpose, and
  The Meadow has not been fixed yet.** Its bottom outline ran cols 4–9 under
  sides sitting at 4 and 10, so the bottom-left corner stacked two dark pixels
  and the bottom-right stacked none — the body read as leaning. It's cols 5–9
  now and both corners taper. **This is the first edit to vendored canon art
  rather than to a Farm-side seam** (`LookPatch`, `mouthDy`), so the rule that
  `canon/` is a copy still holds, but the copy is no longer byte-identical. The
  same fix is meant to go into The Meadow later; nothing here writes to that
  repo (CLAUDE.md), so it has to be done there by hand. Until it is, treat the
  divergence as intentional and don't "restore" it.

- ~~**The rotate button sits on top of the build palette.**~~ **Fixed by the
  build-mode pass.** It was one symptom of a bigger layout problem, and the fix
  was the bigger one: **build mode is now a mode you enter.**

  The old HUD had both palettes on screen at all times, facing each other across
  the field, with the build one landing on the ACT button and the rotate/undo
  column landing on the build one. That layout was asserting that both ways of
  touching the world are live at the same instant, which was never true — holding
  a build tool already suppressed acting. So:

  - **A BUILD button, above ACT in the same corner.** Press to enter, press again
    (or Escape, or B) to leave. The act palette and ACT are `display: none` in
    build mode, not dimmed to 0.35 — a greyed control reads as "temporarily
    unavailable" for something that is simply not part of this mode, and dimming
    left ACT sitting under the build palette collecting taps.
  - **The build tools moved to a bar across the bottom**, tray-styled and hugging
    its contents, which is where every building game has taught people to look
    for them. The list can grow without climbing the screen; it wraps rather than
    scrolls, because a scrolling toolbar hides tools behind an untold gesture.
  - **Rotate and undo ride at the end of that bar**, past a rule, in a slot held
    open at two buttons wide even when empty. That reserved width is load-bearing:
    both come and go with what you're holding, and a collapsing slot would slide
    the whole tool row sideways under the cursor mid-build.
  - `buildTool !== null` still IS the mode, so the renderer, undo and placement
    paths are untouched. `toggleBuild()` re-enters on the tool you had last —
    except underground, where it opens on the first tool the rock allows rather
    than opening onto a refusal.

  The one thing that changed behaviourally: **tapping the held build tool no
  longer exits.** With a real BUILD button on screen, a palette tap that quietly
  closed the whole bar would be the same gesture meaning two different things.

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
- ~~**Only the Scholar has a full home bank.**~~ **Fixed in 5b.** All six housed
  forms now have lines for every note they can REACH, which is not the same as
  every note: the delight notes only fire when `content/tastes.ts` gives that form
  a finish or a piece to be pleased by, so a dog has no `delight_finish` bank
  because no finish will ever delight a dog. `home.test.ts` pins the set in both
  directions — a new taste row fails until somebody writes the line it just made
  reachable, and a line for a delight a form cannot feel fails too. Dead content
  is how a bank stops being trustworthy.
- ~~**The Gremlin doesn't scatter junk while you're away yet.**~~ **Fixed in 5b**,
  and the decision this note was holding open went the cheap way: a **tile**
  (`JUNK_PILE`), not a loose-object layer.

  The precedent was already one line above it in `content/tiles.ts` — MUSHROOM is
  away-placed scenery you pick up with the same verb. A layer would have been more
  general, and that generality is the argument against it as much as for it: it
  could put an object down on your floorboards, where a tile can only ever land on
  bare ground. He leaves things in the yard, not in your house. No schema, no
  migration, and nothing new for the room flood-fill to have an opinion about.

  **The cap is the load-bearing part.** It counts what is LYING THERE, not what he
  has ever left, so picking things up is what makes room for more — which is what
  stops absence from being a junk faucet and keeps the un-farmable rule true for a
  source that isn't dug. Asserted in `away.test.ts`.

  One thing found on screen: as its own material the tile drew a boundary bevel
  against the grass around it, which read as faint stray lines lying in the lawn a
  tile from the object. `groundIdOf` in the renderer already existed for this —
  something dropped on the grass has not ended the grass — and the object now
  draws off the raw tile id beside the shaft mouth.
- ~~**Ore is defined but unobtainable.**~~ Fixed in 4a step 3. `canCarve` still
  refuses ore — cutting it away with the shovel would drop the metal on the
  floor — but a vein is a node now, so the same swing gathers it. All three
  gathered classes are obtainable, which makes DESIGN's "three gathered classes,
  ever" true for the first time rather than aspirational.

  ~~**Nothing is BUILT from ore yet.**~~ **Fixed in 5a — it builds the lamp**,
  and it stayed optional exactly as this note required: `lamp.test.ts` asserts no
  structure and no other furniture row may ever cost ore. Of the three candidates
  named here, the stove was rejected (cooking is a system, not a row) and
  "something metal-framed" turned out to be the wrong instinct — see the settled
  entry above for why light was the one thing ore could add.
- ~~**Six of the seven fixed cast exist.**~~ **All seven now do** — office,
  shop, heap, museum, seed stall, errands board, plaza stage. DESIGN's
  institution table is complete; the note at the foot of `src/content/cast.ts`
  that listed what was missing has nothing left on it.
  Residents are no longer limited to one:
  `content/arrivals.ts` holds four, and the town takes them in one at a time.
  Note the queue **runs out** rather than looping — the fourth Rummage would say
  more about the table than about the town.
- ~~**Finishes are town-wide for FLOORS, per-cell for structures.**~~ **Fixed at
  schema v27** — see §"Floors carry their own finish" below. Floors store their
  own finish in `world.finishes` exactly as walls have since v5, the picker moved
  out of the satchel and into build mode, and the stone finishes finally have
  something to sit on.
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
- ~~**Furniture doesn't invalidate a walking villager's route.**~~ **Fixed in 5b**,
  exactly as this note proposed: placement and removal bump the same counter, and
  the rooms cache recomputing along with it is a bounded flood fill on a user
  action. Read `buildRevision` as "the standing things moved" rather than
  "world.build moved" — the narrower reading is what let a villager walk through a
  table for three phases. It deliberately does NOT ask whether the piece is solid
  or which layer it went on: that trades a flood fill for a second rule about when
  invalidation matters, and the wrong version of that rule is invisible until
  somebody walks through something.
- **Undo covers BUILD strokes only, not ACT.** Digging, tilling, planting and
  felling go through `contextAction` on the tile underfoot, which has no stroke
  — it's one tile, one tap, and the ground is cheap to redo. Deliberate: what
  undo exists to protect is the *arrangement*, and a single dug tile isn't one.
  If ACT ever gains a drag, it should gain a stroke with it.
- ~~**Villager "witness" has no proximity model for memory.**~~ Fixed in 4b.
  `witness` takes `onlyPresent`, and mining and carving use it. The surface is
  still town-wide **on purpose** — see 4b above; proximity is what a tunnel
  needs, not what the town needs.
- ~~**PWA icon is a single SVG.**~~ **Fixed in 5b.** 192/512 PNGs, a maskable 512,
  an `apple-touch-icon` linked from the HTML (the only place iOS looks — it does
  not read the manifest's icons at all), and a 32px favicon, all generated by
  `scripts/icons.mjs`.

  The sizes are the part worth keeping: the art is a 16x16 grid and pixel art may
  never be drawn at a fractional scale (CLAUDE.md), and 180/16 is 11.25. So the
  art renders at 176 (11x) and the canvas is PADDED to 180 in the background
  colour; the maskable one renders at 368 (23x) on 512, which is 72% and inside
  the safe zone. Padding rather than scaling, both times.

  The icon itself was 8 wide and 6 tall and read as a pumpkin at 192px. A carrot
  is legible only if it tapers.
- ~~**Build mode can't pan on touch.**~~ **Fixed in 5b**, and NOT with the
  edge-drag this note proposed: an edge drag fights painting along the edge of a
  wall, which is exactly where you paint most. Two fingers pan, one paints; a
  wheel does it on desktop. The offset rides on the camera's FOLLOW TARGET rather
  than being a second camera, so `screenToWorld`, the chunk-streaming bounds and
  every `sceneX` keep reading `cam` and need no idea it exists, and the existing
  easing does the sliding.

  Found on screen: two fingers never land on the same millisecond, so every pan
  began as a one-finger tap and left a stray wall behind. The second finger now
  undoes the stroke it interrupted — but only when that stroke painted ONE cell,
  because a drag already several cells long is a run somebody meant, and losing
  twenty walls to a stray thumb would be worse than the bug being fixed.

  Build mode also gained an Escape door, which it had been doing without.
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
