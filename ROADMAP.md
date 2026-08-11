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
- Menu with New town / sound + music toggles; PWA shell; 630 tests.
- **Phase 15 — the soundtrack, complete.** Nine generated pieces, day and night
  setlists, and an arrangement that assembles itself as you walk into town. See
  below.
- **Phase 17 — three more regions, complete.** The salt flats (rolled, rare,
  cracked white crust with the air going up), the marshes (rolled, mostly water
  and all of it wadeable, with lily pads and boards on it), and the Static
  (sited on a ring at 604, drawn in two inks on a dither, with a Moment of its
  own), plus milky water where a stream crosses the flats and a channel-split
  glitch pass on the Static. No schema change. Also fixed: high-contrast region
  borders had been banding since the cinders shipped. See below.
- **Phase 16 — six new regions, complete.** The granite, the redwoods (with the
  giants), the long grass, and the cinders (with the caldera at the heart of
  one). Also the first terrain in the game that is a light source. Rock as a landscape
  (rolled, far, with bare sheets on a long field), and redwood stands sited on a
  ring that recurs outward — about one in four with a grove of giants at its
  heart. No schema change; the near world is untouched by construction. See
  below.
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

**Next: Phase 10 — the play pass.** See §Phase 10, which is a list of things
found by PLAYING rather than by reading, and is the first list here that came
from somebody else's hands. Six of its items are built; the rest are scoped with
their calls already made.

This header was stale for a long time and some of what follows still is: items 1,
2 and 4 of the Phase 8 list below were built (8g at §8g, 8d at §8d, and 8g fixed
the plaza's texture), and the schema line at the bottom is wrong — it says v23
and the ladder is past v30. Trust the numbered sections over this block. The two
deliberate POSITIONS under *Known gaps* — undo covering build strokes and not
ACT, and the occlusion fade waiting for a genuinely tall piece — are still
positions rather than work owed, but **the second one has now fired**: the scale
pass (§10f) took trees to a tile and a half of overhang, so the fade has a real
user and was made continuous. (The third, floors reading the town-wide finish,
had a trigger condition attached and it fired: see §"Floors carry their own
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

1. ~~**8g — furniture that looks like furniture.**~~ **Built** — see §8g and
   §8h, plus the furniture project's own agenda for what those two left over
   (the missing north grids, the sideways redraw, surface clutter).
2. ~~**8d — the biome boundary.**~~ **Built, in two halves.** The turf blend
   landed in §8d; the flora that stopped dead on the same line was named there
   as still open and is built now — see §8w.
3. ~~**8e — four more counter faces.**~~ **Built 3 Aug 2026**, all five, and
   the spoken line's alignment settled with them. See §8e, and §Phase 14 for the
   introduction that now comes before the counter.
4. ~~**The plaza and the water are still flat**~~, which 8f left alone on purpose:
   they are terrain, so they belong to 8c's argument. **The plaza half was fixed
   by Phase 11's paving (tranche 1, item 1). The water half was struck on
   3 Aug 2026 — looked at and judged fine as it is** — which also parks 8j's
   shoreline foam band with it.
5. ~~**A second survey pass, verified this time.**~~ **Done 3 Aug 2026 — see
   §8v.** The panels got `shot-counters.mts` in 8e; night, the four seasons and
   the underground now have `shot-survey.mts`, which photographs them and
   asserts the pixels against the season table rather than reporting them clean.
   It found one thing: **the ground bands at night**, the region tint's
   per-tile gradient becoming visible once the colour is dark enough. Left
   unfixed on purpose — the fix is a dither or a world-space gradient, and that
   is a look call. Its other yield is a limit: the underground cannot be
   surveyed by lamplight, so the rock's texture is still unlooked-at.

**Save schema is at v30** — this line has said v23 through seven bumps, so check
`src/sim/save.ts` rather than trusting it. Phase 7c deliberately did not move it: the sky
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
- **And a wood only closes GAPS — it does not retake a clearing.** `NodeDef.seeded`,
  and it exists because the rule above had a hole that only shows up if you
  terraform. "The world heals where you aren't invested" defined *invested* as
  BUILT ON: a crop, a wall, a floor, furniture. **Clearing is also shaping**, and a
  player who felled a wood to make a lawn and left it as lawn got every tree back
  in the same tiles eight hours later, for ever — which is precisely the tidying
  job the bullet below forbids. So a felled tree returns only if one of its eight
  neighbours is still a tree, and otherwise forfeits exactly as claimed ground
  does. **The radius is per node and it was measured, not guessed** — over 271k
  tiles of the real generator, 76% of trees have another tree within 1 and 97%
  within 2; rocks, a third as dense and never adjacent, manage 27% at 1, 69% at 2
  and 91% at 4. Trees shipped at 1 for a day, which meant a quarter of ordinary
  fellings never came back: a silent, permanent thinning of the world nobody asked
  for, and far worse than losing another ring of a clearing you dug on purpose.
  **The radius IS the depth of the encroachment** — the world always takes back
  the ring it can still reach — so the trade is reliability of healing against how
  much of your clearing survives. Trees and shrubs 2, rocks 4.
  **Ore and the dark tree are exempt.** Ore never regrows at all; the grove is a
  place rather than a wood, and a player who cleared it would have deleted a
  secret permanently. Deadwood is exempt because at one cell in a thousand there
  is no scatter to seed from at any radius worth writing.
  **Rocks were exempt too, on an argument that was simply wrong.** The claim was
  that seeding them would make stone scarce — asserted without the arithmetic, and
  rocks are 3% of tiles, so a hundred tiles square holds ~300 of them and ~3,600
  stone in a world with no edge. What the exemption actually bought was an
  inconsistency: the axe could make a lasting clearing and the pick could not.
  **And the clocks all slowed down.** Shrub 3h→**12h**, tree 8h→**24h**, deadwood
  24h→**48h**, rock 10h→**72h**. Eight hours had a tree closing the edge of a
  clearing while you were still standing in it, which is the world undoing your
  afternoon in front of you — the same thing `RECLAIM_MS` was tuned to avoid. That
  broke the old "reclaim is longer than any node" ordering, which turned out never
  to have been the point; the property is that reclaim outlasts a *sitting*, and a
  hole you dug is not a wood.
  **A forfeited node hands its tile to the grass**, which only became necessary
  once nodes could forfeit. Before, every felled tree came back, so its DIRT was
  always temporary — afterwards a cleared wood would have been a field of
  permanent brown squares, which is the shovel's old "only verb you have to tidy
  up after" arriving through the axe.
  **Found while writing the test: decide first, then plant.** A single loop that
  wrote as it went filled a whole clearing in one pass, because each tree it
  restored became a neighbour for the next entry it looked at — the wood marched
  inward ring by ring and the rule bought nothing. It also made the result depend
  on the iteration order of `world.regrow`, which is the order you happened to
  swing in.
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
  *"shelf ... You paid attention."* Caught by reading the actual modal, which
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
   placard's own revision marker ("Mushroom ... Corrected.") made her sound
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

A second look widened it from 11px to 13. **A crown too narrow has to close on its
trunk in two or three steps**, and the silhouette went full-width to bare bark
almost at once — the canopy ended and then there was a stick. The extra width buys
the rows to step down gently instead.

Widening it also tempted a deeper notch, which was the wrong lever and got put
back. **A notch has to stay shallow enough to read as an underside.** At six rows
the foliage reached the trunk's sides half a crown below where it crossed over the
top, and the eye read a long white channel driven up into the canopy rather than a
stem the leaves part around. One row; the crown sits back where it was.

**And the shoulders were a comb.** The widest part ran 6, 5, 6, 5, 6 — three
single pixels standing off each side with a dent between each, every one of them
a legible notch at this scale. That is §Per-cell edges band in a different hat:
alternation that fine is texture, and texture on a silhouette is noise. Filling
the dents in turns five rows into one shoulder, which is what "puffy" wanted all
along — it is the step that HOLDS that reads as a clump, not the stepping.

**The crown ended up symmetric — in its WIDTHS, and only those.** The middle
sixteen rows read the same upside down, so the outline gathers at the bottom
exactly as it closes at the top, which is what stops a crown looking like a blob
trimmed to fit its trunk. Mirroring the *notch* onto the top as well was one step
too literal and got taken out again: a dip in the underside of a canopy is a
parting, and the same dip in the top of one is damage.

It leaves behind a better rule, though. `crownGaps` used to forbid any gap above
the trunk outright; the real invariant is that **a gap has to be open to the
outside** — open downward against the trunk it is an underside, open upward from
row 0 it is a cleft, enclosed by foliage either way it is a square of grass
punched into the canopy. The test checks that now. No biome uses a cleft.

Last row on: a **cap** narrower than the mirror calls for. Mirrored exactly, the
crown ends on a flat 7px lid — cut off rather than finished. The bottom's matching
row gets away with it because the trunk continues out of it and the eye reads the
tree as carrying on downward; the top has nothing below it to lean on.

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
- **Only the museum has windows** — and now that windows exist that reads as an
  omission rather than as restraint. **Parked 3 Aug 2026 at the user's
  direction: not on the open list; they'll be added one building at a time
  later.** The town hall is the obvious first. Each is a table row plus a rung
  on the migration ladder, so the cost is known.
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

**The build bar grew tabs**, because twenty-two tools are a row you read along
rather than see. Grouped by what the thing IS, not by cost or finish, because
that is the question you arrive with. An empty tab hides itself, so the
underground still shows exactly the two tools the rock allows.

> **Amended 4 Aug 2026 — the tabs became two levels.** Six tabs across the top
> made `structure` a peer of `Seating`, and it is not one: a wall is what you
> make a room OUT of, and a bed is what you put in it. The cost of the wrong
> shape was that the categories of a thing you were not doing sat over the bar
> the entire time you laid floors. Now **structure has no tab** — it is the row
> you land in — and **Furniture is a button in that row**, in the series with
> Wall and Window, opening the five categories below. The way back is a
> `‹ Build` chip at the head of the strip, which never takes the selected ring,
> because a lit "Build" would claim you were standing in the level you had just
> left. `tab: false` in `BUILD_GROUPS` is what keeps structure out of the strip;
> `FURNITURE_GROUPS` derives from the same table so a new category is one row.
>
> The Furniture button reopens on the category you were last in (session-only,
> never saved — it is where you were a minute ago, not a setting), and hides
> where nothing behind it is placeable. Underground it survives intact: the row
> is take-down plus Furniture, and Furniture holds Light, holding the lamp.
> Desktop shortcut **F**, which toggles, and only inside build mode.

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

~~**Still open:** interleaving the flora~~ — **built 4 Aug 2026, see §8w.** It
did change generation, and the margin it was said to spend turned out not to
need spending: the dither is simply switched off inside `HOME_REGION_REACH`,
which costs nothing where there is no border to dither across anyway.

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

> **SUPERSEDED, and read the paragraph above first — it is still most of the
> rule.** The line moved once the fen needed a shape and not just a colour. See
> §The mushroom shape below.

**Crowns take the HARD region, not the blended one** — `regionSkin`'s existing
argument, now applying to mushrooms too. Half a champagne cap fading back to red
across a border is a mushroom caught between two minds.

**Later: the red cap became a claim, and two regions had to withdraw it.** At this
size, with a white speck on it, the default red is a fly agaric and nothing else —
and *Amanita muscaria* is ectomycorrhizal, so it grows with **birch**, pine and
spruce and nowhere without a host. That made "no `mushroomCap`" a statement about
the region rather than a blank field, and two rows were making a false one:

- **The fen** carried the game's heaviest mushroom density (0.12, double the
  birches') in the one habitat the species avoids — eight patches of fly agaric to
  a screen, standing in a bog. Now inkcap grey: damp, papery, cool enough not to
  be confused with the glimmer's warm champagne, and clear of the kingcups that
  already give the fen its one yellow thing in spring.
- **The glass wood** could have kept it on ecology — its crown *is* the birch's —
  and lost on palette, which is the glimmer's argument word for word: red was the
  one warm-blooded thing in a region built of cold blue and near-white. The glass
  wood is a birch wood with the colour drained out; a cap that kept its red would
  be the one thing that hadn't been drained. Bleached, and paler than its floor,
  because a gathered thing has to stay findable.

**The dusk keeps the red, and that is the exception that explains the rule.** Its
trees are `BROADLEAF` and fly agaric does partner beech and oak, so it is not a
false entry — but the real reason is that the dusk's whole idea is a wood where
the shapes are the ones you know and only the light is wrong. A recoloured cap
there would be the region joining in.

**Recoloured, never thinned.** Density is the one field in `biomes.ts` that
touches yield — mushrooms barter for cloth, for seed, and for every crop variety
at 8 a row — so fixing the fen by moving numbers would have made foraging
measurably worse somewhere for a reason no player could see. Red now means birch
or pine, which is what it means outdoors. `palette.test.ts` holds the whitelist,
so a new region that grows mushrooms has to decide which way it went.

### Deadwood — stumps and fallen logs

**They shipped for one day with no yield, on DESIGN.md's authority, and that was
wrong.** §Biomes named fallen logs in its DECOR list and set the test *"can you
carry it home?"* — which describes the decision rather than giving a reason for
it, and reasons are what a player reads off a screen. What actually shipped was a
solid, tile-sized, obviously-wooden object standing next to a shrub that pays two
wood for the same swing. Nobody was ever going to read that as a rule.

So the line moved to somewhere it can be stated without circling, and DESIGN.md
was amended to match:

> **A TILE is an object and yields its material. A MARK is texture and yields
> nothing.**

That is why flowers and tussocks stay unpickable — decor is paint on the grass,
there is no object there to take — and why deadwood now gathers like every other
piece of wood in the world. The carve-out is for things somebody PUT there (a
mailbox, a signpost, the cube): tiles that yield nothing because they are not
material, they are somebody's.

`NODES` rows at **3 wood for a stump and 5 for a log**, both under a standing
tree's eight, so felling a tree is never the worse move. At about one cell in a
thousand this is a fifth as common as a shrub, which puts it well under the bar
`shrubs` already cleared: something you come across, never a reason to walk.
Felled to GRASS not DIRT, on the shrub's reasoning, and the **slowest regrowth in
the table** at 24h — a shrub is a season's growth and a fallen tree is a decade's,
so a wood that restocked its deadwood overnight would read as a supply rather than
as age.

`BiomeDef.deadwood` is a multiplier that **defaults to none**, like `shrubs`, and
three regions ask: pinewood (deadfall is what a plantation floor is made of),
birch (the fastest-rotting timber in the table) and fen (wet ground is where wood
goes soft). The meadow stays untouched — walking home has to keep looking like
walking home, and that is now asserted rather than assumed.

**Zero save work, and this is worth knowing for the next tile.** Terrain is
regenerated from the seed and `setTile` deletes an override that matches
generation, so a new *generated* id never lands in a save. The sky layer shipped
three ids at unchanged `schemaVersion` for the same reason. The real cost is
different and should be said out loud: **generated terrain is re-evaluated on
every read, so this appears in already-visited ground on live towns.** Anything
the player has edited is safe. That is how SHRUB shipped too.

**The art carries the rule.** A log is visibly wood and this is the first
wood-looking thing that hands back nothing, so if it reads as felled TIMBER the
doc rule breaks on screen whatever it says on paper. Three passes were wrong:

- **A plank.** Square ends, a flat lit stripe, heartwood the same value as the
  body — it came out a bench. Both ends taper now, the rings are an ellipse at
  *one* end (rings at both ends is a log that was cut twice), and the moss sits
  IN the top row instead of floating above it, where it read as grass behind.
- **A T-shaped crack.** The stump's heartwood drawn as `rrr` over `r` makes a T,
  and a T at seven pixels wide is a split face, not a cut one. Three by two is the
  smallest mark that reads as heartwood; real rings do not survive this size.
- **A bollard.** The stump's left side now runs one pixel wider than its right —
  the only asymmetry in the sprite, and it is there because a stump flares where
  its roots leave it and a cylinder is a bollard.

**A log is 20px wide on a 16px tile, and both halves of that matter.** Length is
the whole read of one; drawn inside its cell it was a lump. Safe because the
raised pass is flushed after all terrain (a tree's crown already overhangs by
more). It is also exactly why deadwood cells **may not touch** — two adjacent logs
would genuinely overlap, not merely abut — so `deadIsLoneliest` borrows
`rockIsLoneliest`'s arithmetic on its own salt. Height stays under a tile, which
is the rock's rule and not the tree's: `hides` fades off overhang, so scenery at
or under a tile never makes the world go see-through behind it.

`scripts/shot-deadwood.mts` exists because rare content needs an aimed camera or
it does not get looked at — all three art failures above were invisible to 1536
tests and obvious in one photograph.

### The mushroom shape, and where the line actually is

Recolouring the fen was not enough, and the reason is the one the pinewood taught
two hundred lines earlier: **at this size the outline is most of what a thing is.**
The dome IS the fly agaric. Grey paint on a dome left the fen with the right
colour on the wrong plant.

So `mushroomShape` exists, and the settled rule above had to move — **but only as
far as `stone` had already gone.** A shard and a boulder look nothing alike and
both gather into `stone`, because they are the same material in a different state.
The mushroom had been living under a stricter rule than its neighbour for no
stated reason. The line is now:

> **The shape may vary. The ITEM may not.** What breaks the yield promise is a
> second item id, not a second outline.

That is also why puffballs are still out, and it is a genuine pincer rather than
taste: a puffball that hands back `mushroom` breaks the promise from one end, and
a puffball that hands back `puffball` breaks the item-sprawl rule from the other
(DESIGN.md §Materials — "item count is the number of *materials*, not materials ×
looks"). Two families, `cap` and `bell`, and a new one needs the same argument the
fen made — an *ecological* reason the region cannot grow the other.

**States are AGES rather than species** — `open` and `button`. That distinction is
the whole licence: the same organism at two points in a week gathers into
`mushroom` without argument, where two different fungi would not. Drawn as grids,
bottom-anchored, so a seven-row bell and a five-row dome stand on the same soil
instead of hanging at the same height.

**A third state, `over`, was built and pulled — and the reason is tone, not
drawing.** A cap past its best, rim lifted and crown sunk. It rendered exactly as
drawn and it read as **decay**, and a wood with rotting things in it is a wood
going bad rather than a wood growing. That is not this game's register. It is one
commit back (`281038b`) if a reason for it ever turns up — a season, or somewhere
deliberately past its best — and the state machine has room for it. It is not
sitting unused in the table, because unused art rots faster than anything it
depicts.

**The bell was four different objects before it was a mushroom**, and the run is
worth keeping because every failure was the same kind: the eye takes the WHOLE
before it takes the parts, and each fix was proportion rather than elements.

1. **A standing stone.** A three-wide cap over a one-wide stalk is two pixels of
   difference; at seven rows there was no cap left to see.
2. **A cone.** Widened on the way down (3, 5, 5) it became a parasol or a young
   fly agaric. A shaggy inkcap is a *cylinder with a domed top* — the reference
   photograph settled it. Sides parallel for five rows; the only flare is the rim.
3. **A dagger.** Pale straight cap, dark rim one pixel proud, pale stem — every
   element right, and together a blade, a crossguard and a grip. Fixed by width:
   a five-wide cap is a body where a three-wide one is an edge.
4. **A table.** The rim's two drips, hanging under a wide dark bar, are LEGS. Any
   two symmetric marks below a horizontal read as supports before anything else.

The rim now goes 7, 3 and straight into the stem — one mass narrowing, nothing
detached for the eye to reassign. It also carries the species better than the
drips did: what you recognise in an inkcap is the dark underside eating up into a
pale cap, not the drops it sheds. The fen's `mushroomCap.gills` went nearly black
to match, which is a bigger cap-to-gill jump than any other row makes.

And the `over` state drew **horns** before it was pulled, and the lesson outlived
it. Two lit rim pixels with three of air between them stop belonging to the same
object at this size. One pixel of gap is a dip; three is a pair of ears. The
birch's notch, at a fifth of the scale.

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

### 8j — Reconciling the visual style doc — **verdicts, and one thing built**

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

~~**Genuinely open, and the brief's real yield:** roof PITCH shading~~ **Built
3 Aug 2026, as a gable.** The brief proposed a distance-to-edge ramp and owed a
reconciliation with 8f's "grain the surfaces the player looks AT, leave the ones
they look ACROSS alone" first, since read literally that rule says a roof is a
top cap and gets nothing.

**The reconciliation, which is the part worth keeping:** 8f's rule is about
TEXTURE COMPETING ACROSS ONE OBJECT — a wall cap is flat because a third
material texture 16px from the face and the floor makes a house read as a
mashup. The roof already carries shingle courses and they work, so the rule was
never "no marks on top surfaces". A pitch ramp is not a third texture; it is a
value model, the same family as the eave line and the overhang that carries
height everywhere else. Allowed, on the two conditions that are the rule's
actual content: it **replaces** the flat darkening the roof used to wear rather
than stacking on it, and its range stays under the courses' contrast so they
survive the bright end.

**A gable, not a hip, and not a one-way wash.** The choice was made from
renders of the alternatives. The ridge runs along the room's longer side (ties
go east-west, which is what houses do and what agrees with the light this
renderer already draws by, from the north-west): the north slope is lit and the
south is the lee, 0→13.5% and 6.5%→20% black, which average the flat 10% the
roof wore before, so no building changed weight.

- **Four steps, not a gradient.** Everything in this world is flat colour with
  two or three values to a shape. A smooth ramp would be the only gradient in
  the game, and it would band anyway — §8v found that a value step invisible by
  day is plain to see once the tint darkens it.
- **The crease is per COLUMN, not per building** (`roofPitch`, render/roof.ts).
  An L-shaped house is two wings and each half gets its own ridge, stepping
  where the wing begins; a bounding-box ridge would sit between them and belong
  to neither. Photographed: `scripts/shot-roofs.mts`, roofs-ell.
- **Measured in tile SPACE, drawn per pixel row.** A ramp counted in CELLS
  would put its steps on the tile grid, which is the per-cell edges rule
  (CLAUDE.md) wearing a value instead of a line. The bands land at fractions of
  each roof's own depth, so a five-deep roof and a nine-deep one get the same
  slope rather than the same period.
- **The old "sunlit ridge" line came off the north edge.** It was standing in
  for a ridge the roof did not have; once the pitch is real, that line is the
  brightest thing on the plane sitting at the LOWEST point of the slope. Both
  edges the roof falls toward are eaves now, and the ridge is where the ramp
  says it is.
- **`shot-roofs.mts` asserts it**, because the ramp is invisible to the unit
  tests and "the roof looks fine" from a script that never measured a pixel is
  exactly the clean report §8v was written about. It profiles four roofs and
  requires the bright line to be the crease, the plane not to be flat, and the
  lee slope to be darker than the lit one. Two of its own bugs are in its
  header: it measured the L ALONG its ridge (reading two flat values off a
  correct roof) and it stood the player INSIDE a house it was photographing,
  where the cutaway had already faded the thing away.

The rest of the yield has
since been dispositioned: ~~a wet rim / foam band at the shoreline~~ **struck
3 Aug 2026 with "the water is flat" — looked at, fine as it is**; ~~surface
clutter (items rendered ON tables and shelves)~~ **moved to the furniture
project's agenda, where it belongs with the rotation and redraw gaps**; and
~~a world-space chimney~~ **built in 8m**.

### 8e — The counters show whose voice it is — **built, all five**

Found by photographing all seven institution panels, which nothing had done
before. Arabella's counter opens with *"Cloth ... You can't grow it, and you
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
- ~~**Still to do:** Nub (heap), Winifred (museum), Derek (seed stall), Aurelio
  (stage).~~ **Built 3 Aug 2026** — one line each, exactly as this predicted.
  `scripts/shot-counters.mts` photographs all six counter panels and ASSERTS
  the rule in both directions (a face beside every keeper's heading, and none
  on the errands board), because of the method note below: this is the panel
  survey that checks itself.
- ~~**Open, deliberately:** the spoken line alignment.~~ **Settled 3 Aug 2026,
  from renders of both: flush to the panel edge.** The line reads as a subtitle
  for the screen, which is what §"a counter is a screen" says it is, and it
  keeps the opener on the same margin as the list under it. Indenting it under
  the name read as speech — the wrong claim for this frame — and left long
  openers wrapping in a narrow column beside empty space.

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

### 8v — The rest of the survey, verified — **done 3 Aug 2026**

The other half of 8e's method note: night, the four seasons and the underground,
which had never been looked at by anybody and were resting on the same
unverified pass that got the first counter panel wrong.
`scripts/shot-survey.mts` photographs them and checks itself, the way
`shot-counters.mts` does for the panels.

**One place, one seed, one hour, six dates.** Every frame is reseeded onto a
fixed seed, spot and position, so the only thing that differs between the four
season shots is the month. The first attempt was not: it stood on a bridge with
two buildings in shot, measured the plank wall of a house four times, reported
four identical seasons, and looked lovely. **A survey that isn't standing on its
subject reports on whatever it IS standing on**, which is a quieter version of
the same failure the method note describes.

**What it asserts, and why those:**

- The frame's commonest colour moves away from summer's in the DIRECTION the
  season table says it should — cosine against the row's own delta, not
  equality. A region tint is a lerp toward the biome's ground, so it shrinks the
  gap between two seasons without turning it; equality fails on a world that is
  perfect and merely tinted. Measured: spring, autumn and winter all cos 1.00,
  at 74–90% of the table's magnitude, the shortfall being exactly that lerp.
- The MODE, never the mean. Winter's crowns go brown while its ground goes pale;
  averaged together those two partly cancel and the check fails on a good frame.
- Night is measurably darker than the same field at midday (44%).
- The way down is DUG, not written into the save. Reseeding `player.layer` would
  photograph the rock without ever asking whether you can get there, and the way
  down is half of what had never been looked at. Three ACTs — dig, dig, descend —
  and the layer is read back out of the live save.
- Every PNG differs from every other, because the original bug returned five
  byte-identical files as five separate screens and one hash comparison
  would have caught it.

**The one thing it found: the ground bands at night.** The region tint's
gradient is quantised per tile, and by day the steps are ~1/255 on a bright
colour and invisible. After dark the same step lands on a colour a third as
bright, and open grass reads as flat vertical bands with tile-aligned edges —
one of them runs the full height of the frame in `survey-night.png`. It is the
per-cell edges family (CLAUDE.md), arrived at from the other end: not an edge
drawn per cell, but a gradient sampled per cell. **Not fixed, deliberately** —
the fix is a dither or a world-space gradient, and which one is a look call.
Photographed at day and night from the same spot for whoever takes it.

**And a limit worth writing down: the underground cannot be surveyed by
lamplight.** The commonest colour in both underground frames is the dark beyond
the lamp, not the floor. The shots answer "does the way down work" and "does it
read as a place" — both yes, with the ladder legible from below — and they
cannot answer anything about the rock's own texture. That wants a lit shot, and
nothing here has one.

### 8w — The flora interleaves across a border — **done 4 Aug 2026**

The half of 8d that was left open: the turf faded across a region border and the
trees standing on it stopped dead on the same line. **`scatterRegion`
(sim/world.ts).** A tile near a border rolls WHICH of its neighbouring regions
its flora grew from, weighted by exactly the shares 8d already computes for the
tint — so pines thin out into the scrub over the same five tiles the grass is
fading across.

**A PICK, NEVER A BLEND, and that is the same rule 8d wrote.** A blended colour
is a colour; half a pine is nothing. Every individual tree, rock, mushroom,
shrub and log is wholly one region's — it is which region that now varies by
cell instead of by side of a line.

**It does not move a border.** `biomeAt` is untouched, so every guarantee built
on it holds unchanged: the town's region, the thousand-seed meadow test, the
migration promise. What changed is which region's DENSITIES a cell reads before
it rolls, and which region's crown the result is drawn with.

- **The look travels with the thing.** `scatterSkin` is `regionSkin` asked of the
  region a tile's flora grew from, and the renderer uses it for trees, shrubs,
  rocks, deadwood and mushroom caps. Without it the dither does half its job:
  the COUNT softens across the border and every crown still changes species on
  the line, which is the seam you could actually see. Tufts and ground stay on
  the hard/blended answers — they are turf, and turf was 8d's half.
- **Water is not dithered, deliberately.** A pond's shape is a field read per
  cell, so dithering the water multiplier would not soften its edge — it would
  put holes in the middle of it. A tree is one object in one cell and can belong
  wholly to a region; a body of water is a shape across many and cannot. The
  generator now names its two answers `terrain` (hard, the land) and `grew` (the
  dither, the things standing on it).
- **`HOME_REGION_REACH` did not have to be spent.** The note in 8d assumed it
  would be. Inside the reach the dither is simply off, which costs nothing —
  there is no border there to dither across — and turns a one-tile margin
  resting on two approximations into a fact a test can assert on a thousand
  seeds. **The guard is a SQUARE where the reach is a radius**, because the
  first version tested the disc and let (15,15) through: 21.2 tiles out, inside
  the town's own margin.
- **Its own hash**, which is 8k's bug written down. Feed the region pick the
  same roll that just passed `< density` and it only ever sees the bottom of its
  range: the dither becomes dead code that measures as working.

**The test measured the wrong thing first, and it passed.** Counting trees in
straight vertical bands either side of a border reports a gentle ramp on a
perfectly hard edge — the border wanders (`BIOME_WARP` doing its job), so a
fixed column is inside one region on some rows and the other on the rest. Run
against the pre-dither generator it passed happily. **An assertion nobody has
run against the old behaviour is not an assertion.**

What replaced it pools every clean pinewood→scrub crossing, aligned PER ROW, and
states two ratios against each region's own plateau:

| | before | after |
|---|---|---|
| spill — trees in the first four scrub tiles, over open scrub | 1.18× | 3.65× |
| thinning — trees in the last five wood tiles, over deep wood | 1.08× | 0.78× |

**Cost: generation is about a third slower** (273k → 198k tiles/s), because a
cell near a border asks `regionParts` as well as `biomeAt`. A chunk is a
thousand tiles, so this is microseconds where it lands, and it was measured
rather than assumed.

**Live saves: this re-landscapes ground more than 21 tiles out**, on the same
terms every terrain pass since biomes has. Inside the reach nothing moved.

**A found place wears ONE region, and the dither is what asked the question.**
The fairy ring's whole premise, printed in the Notebook, is that its mushrooms
are a single organism fruiting at its own rim — and a ring lying across a border
came out speckled with two kinds of cap, which is two organisms in a perfect
circle by coincidence. `scatterSkin` asks the place's own CENTRE, hard, so every
point on a rim answers the same. Generalised rather than special-cased: a ring
grove that is half pine and half birch is the same coincidence at a bigger
radius, and each of these places is meant to read as somebody's (nobody's) doing.

**Not gated to a biome, and that was considered.** In nature dozens of fungi
form rings, so many KINDS do this — but any one ring is one species, which is
exactly what the centre rule now says. The perfect closed circle belongs to open
grassland (in woodland a real one is a ragged arc round a host tree), so a
region gate would be defensible naturalism. It was declined twice over:
`found.ts` states that a found place stands on whatever region it lands in and
is odder for it, and gating one kind would need rejection sampling that the
"walking further always finds more" guarantee depends on not having. A closed
circle in a pine wood, where nature would give an arc, is also simply funnier.

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

## Phase 10 — The play pass — **10a–10f built**

The first list here that came from somebody PLAYING the game rather than reading
it, and it is a different kind of list because of that. Phase 8 found things by
photographing surfaces; this found things by trying to do something and being
stopped. Several items were not bugs in any code that could be tested — they were
the game being quiet where it should speak, or speaking where it should be quiet.

**Where the reports were wrong about the cause, they were right about the
symptom.** Three of the six below were diagnosed as something other than what was
reported, and in each case the reporter's sentence was accurate and their theory
was not. Take the sentence seriously and re-derive the cause.

### 10a — One villager per id, and a save that broke it can come back

Reported as "NPCs zoom across the map on reload, only in my save". Nothing about
walking was wrong: a fresh town measures a correct 2.2 tiles/s and the pure sim
never exceeds 2.8 (the arrival snap). **Two villagers sharing an id was the
whole of it** — routes are keyed by character id (`sim/villagers.ts`), so each
reads the other's waypoints, re-paths every tick, and slides at up to 44 tiles/s,
for ever.

It is invisible to tests because a fresh town cannot produce it, and silent in
play because nothing else about the save looks wrong. `admitArrival` derives its
id from the COMMISSION count while the thing it names is a VILLAGER; those two
lists agreeing was an assumption. It refuses to mint a duplicate now, and
`migrateSave` repairs a save that already drifted.

**That repair is not a migration and ships no version bump.** A migration answers
"this save is old"; `repair()` answers "this save is wrong", and runs at every
version. Keep the two separate — a repair that needed a version bump could not
rescue a save written by the current build.

### 10b — Nothing solid goes down on the tile you are standing on

Placement asked the ground about itself and never asked where the player was, so
a wall or a table closed over your own cell and left you inside a solid tile.
Erase still reached it, so it was recoverable, but "you can always take it back"
is a promise about the ARRANGEMENT, not a rescue you should have to work out from
under a wall.

A refusal rather than shoving the player aside, matching `fillShaft`, which is
the same mistake seen from below. **Solidity is asked of the PIECE, not of the
tool's category** — floors and rugs go down underfoot constantly. Walling
yourself into a 1x1 room is still allowed: that is a room you built.

### 10c — Tap a tree and go and deal with it

Nodes are solid, so a tap on one reached `moveTo` and stopped dead: it set your
heading and refused the step. On a phone that is a tap that does nothing, and
gathering meant walking into range and pressing ACT separately — two gestures for
the verb the game asks for most.

It walks you ALONGSIDE and then performs the ordinary act. **It does not decide
for itself what tapping a tree means**: `actionTarget` stays the one place that
answers that (§"The reticle is the promise"), so this can never promise a
different swing from the one the reticle draws. Adjacency on arrival rather than
a particular cell, so a wall going up mid-walk that lands you on the far side is
still fine. Any other tap cancels the errand, and it is UI state, never the save.

### 10d — The interface speaks where it was silent, and stops where it nagged

Two halves of one complaint.

**Tap-to-move draws where you tapped.** It has been the primary verb since the
vertical slice and drew nothing: on a phone, with a thumb over the spot, that was
the one missing piece of feedback. A diamond — not the reticle's corner ticks
("ACT reaches here"), not the bed candidates' closed square ("pick one of
these"). It shrinks as you close and dies with `player.target`, so it is feedback
and not a map pin.

**The shaft says its piece once a session.** "Down. The air goes cool and stops
moving" is good the first time and furniture by the twentieth, on a verb you
repeat all the way through working a tunnel — the same argument mining already
makes against a toast per swing. The CUE still plays every time; that is feedback
rather than a sentence to read. Session-scoped and not stored: once-ever wants a
save flag, which is a schema bump and a migration for a flavour line.

### 10e — The occlusion fade eases instead of snapping

Reported as visibility glitching around walls. `hides` was a BOOLEAN: cross any
of its three edges and a standing thing snapped between solid and a quarter
opacity in one frame. **Anything keyed to the player's position has to be
continuous or it strobes**, because the player moves continuously. Each edge now
ramps over about a third of a tile; which things can hide you is unchanged.

**This is probably not the wall report, and the wall report is still open.** The
arithmetic says a wall can NEVER fade: its overhang is half a tile and collision
stops you 0.51 tiles short, so the test is unreachable for walls specifically.
Where the fade now matters is the trees (§10f).

### 10f — Scale: trees stand up, and the tent is big enough to sleep in

Reported as "scale makes absolutely no sense", and measured, it did not: a
villager is 16px (one tile), a house wall 24, and a tree was 24 — the tallest
thing in a wood was exactly as tall as a garden wall.

Trees are drawn row by row rather than from sprite art, so **the crown profile is
authored, not resampled**, and no quantize rule is at risk. `TRUNK_H` 16 (was
10), the broadleaf stretched to 24 rows, every other region resampled by the same
method so a pine still out-tops a broadleaf and the scrub stays a bush. Trunks to
4px. Contact shadows are sized off the crown now rather than a fixed 9px puddle,
which was a standing loose end the taller trees made worse.

**Two invariants pushed back and both were right.** A crown may not exceed
half-width 8 or it covers the trunk of the tree beside it and a stand smears into
one mass; and a crown's gap must be a cleft at the top or a dip against the
trunk, never a square of grass punched into the canopy. The stretch broke both
and they were honoured rather than relaxed. Blossom must also stay strictly
wider than the ordinary broadleaf, which is what forced meadow and pinewood to 7.

The tent was 20x15 — shorter than a wall, barely wider than its occupant, and
banded on ALTERNATING rows, which at that size is not a stripe but scanline
flicker, and is why it read as a dark box with rungs in it. 28x24 now, banded in
threes so the cloth reads as panels, with a triangular door flap (a rectangle
read as a doorframe, which is a house's idea) and two guy lines. **Somebody lives
in that until you build them a house**; the commission beat is weaker if it looks
uninhabitable.

**FURNITURE IS NOT IN THIS PASS.** `height` is asserted against hand-authored
pixel rows (`furnishings.test.ts`), so shrinking it means redrawing every piece
in four facings. The trees alone take a chair from 58% of a tree's height to 35%,
which was most of the complaint. It is its own pass and it is art, not data.

### 10g — Pacing and light

**A day after you hand over the keys, not just after they arrived.** The arrival
gap ran from the previous ARRIVAL alone, so pacing depended on how fast you
built: thirty hours over a house meant the next neighbour was due the instant you
stamped it. You finished a gift and the town immediately asked for another —
the queue §"one at a time" exists to prevent, arriving by a side door. Both
clocks must run out now. Build fast and the arrival clock still governs, so
nobody is penalised for being quick.

**The evenings draw in.** A season repainted the ground, the trees and the sky,
and then let a July evening go dark at the same minute as a January one — the
season stopping at the palette. Dawn and dusk move with the month, about two and
a half hours of swing, symmetric about midday so noon stays noon and nothing has
to know what a solstice is. **It is light, and light is all it is** (DESIGN
§Seasons): nothing may read it for a price, a yield or a growth time, and nothing
can — it changes which of four names an hour has, and the only things downstream
are the tint and the fireflies. A longer evening is scenery you cannot farm.

### 10h — The journal dates itself — **built**

The Notebook was one flat run of paragraphs in the order they were written, which
is the right thing for a record and the wrong thing to read. It is chunked by
time now, newest first: `journalChunks(world, now)` in `sim/notebook.ts` hands the
panel `{ heading, entries }[]` and the panel draws it.

**No schema change and no migration** — v26 has stored `{ id, at }` per entry
since the feature shipped, so the timestamps this needed were already in every
save in the world. Worth noting as the reason this was a cheap item: the version
of it that had to migrate would have been a different-sized job.

**Why chunking by TIME is allowed where chunking by SUBJECT is refused**, which
is the whole argument and is now in its third place. A subject heading needs a
category, and a category is a blank waiting to happen: the ones you have nothing
under are the empty slots this feature must never show, and the ones you DO have
quietly count the kinds of thing that exist. A date heading can do neither, and
not by policy — **structurally**. Every heading is built out of an entry that is
already under it, so an empty one cannot be constructed. That is the same
defence the notices column uses and the minimap is meant to use: hand it a view
that cannot contain the thing.

**The ladder coarsens, the way somebody dating a page does it.** Today,
Yesterday, then the weekday name out to six days, then `Earlier in summer`, `Last
spring`, `Summer, last year`, `Summer, 2024`. You remember which DAY something
happened for about a week and which SEASON after that, so the headings stop
offering a precision the reader has already lost.

Three things found while building it:

1. **`year * 4 + seasonIndex` is the obvious ordinal and it is wrong.** Winter is
   months 12, 1 and 2, so it splits one winter down the middle and files December
   and January a year apart. Counting months from the start of spring and
   dividing by three puts them in one bucket, which is what anybody who lived
   through that winter would say about it.
2. **The grouping is consecutive-only, and that is safe exactly while the ladder
   is monotone in time.** A rung that isn't would print the same date twice with
   other days in between. There is a test whose only job is to notice.
3. **`now` is a parameter, never a clock read inside.** "Today" is a fact about
   the frame that asked, and `drive.mjs` pins the page clock — a `Date.now()` in
   sim is how the harness and the game end up disagreeing about what day it is.

Found on screen, which is the only place it was visible: at the full inter-day
gap the first date read as a **subtitle of the panel's own title** rather than as
the first date. It gets less air than the days get from each other.

#### The journal turns pages — **built, later**

Chunking fixed the reading order and left the shape: one tall column behind a
scrollbar, which is not what a notebook is. It is **paged** now — `journalPages`
in `sim/notebook.ts` packs the same chunks into `JournalChunk[][]`, and the panel
draws one page with a turn row.

**Pages break on whole days, never inside one.** A date heading at the foot of a
page with its entries on the next one is the one thing paging could break that
scrolling could not, so a chunk that will not fit starts the next page instead of
overflowing onto it — and a day with more entries than a page fits gets a long
page of its own rather than being split. `PAGE_ENTRIES` is a target, not a cap.

**The turn row prints no number**, and that is the §9c rule surviving contact
with a pager. "Page 3 of 7" is a denominator, and a denominator over the entries
you have written down is the same meter this panel has refused since it shipped —
so the position indicator is the DEAD BUTTON: you are at the front because there
is nothing to turn back to. `journalPages` returns an array and nothing else; the
count never reaches the page it would be printed on. The turns are the **arrow
icons** the rotate button already uses (`arrow_w` / `arrow_e`, `iconBtn` +
`.icon-btn`, 44px square) — "Back a page" and "On a page" were two of the longest
labels in the game to say the one thing a turn control never has to. The words
survive as the accessible name and the hover hint, and the dead-button indicator
survives with them: a greyed arrow is as plain as a greyed sentence.

Two things found on screen and not in tests:

1. **Six entries a page was set on a laptop.** It filled a 440px panel nicely and
   still ran off the bottom of a 844px phone — the scroll paging exists to
   remove, on the device the game is designed for first. Four.
2. **A second `.row` is a second panel foot.** `.row` is sticky and carries a rule
   and 18px of padding, so the turn row and the close row stacked two edges across
   the bottom of the book. One row: turns pushed left (`.turns`, `margin-right:
   auto`), Close it where it is in every other panel.

**Then both labels came off, and the cover took a name.** Read back with pages,
the panel was captioning itself twice: a "Noticed, and told" eyebrow classifying
the entries, and a "Told" heading over every told line whose next three words were
already "Aurelio mentioned that". A label that repeats the sentence beneath it is
furniture — the noticed/told distinction was never in danger, because it is
carried by how the prose reads and always was.

The eyebrow's space went to the title, which is now **`{name}'s Notebook`**
(`possessive()` in `app.ts`, bare apostrophe after a name ending in s). It is a
notebook, so it has somebody's name on the cover; "The Notebook" was the object
described rather than the object. Nothing else in the panel changed, and none of
the §9c refusals are touched — a name is not a count.

### 10i — Found is written down, given is announced — **built**

Unlocks have a channel now, and which one you get is decided by **who caused it**,
not by what it is.

**Found → the Notebook, silently.** Walnut and slate write a thought into the
journal. This needed no new machinery at all, and that is the part worth keeping:
`NOTICED_WHEN` predicates read standing world state, and `world.skins.unlocked`
IS standing state — so `(w) => w.skins.unlocked.includes("walnut")` is a legal
trigger row. Two content rows and two predicates. Nothing in `gather.ts` or
`mining.ts` learned that the Notebook exists, and no event or hook was invented.
The entry lands within half a second of the toast that refuses to name the
unlock: the toast is the moment, the book is the record, and neither says
"unlocked".

Most of this item turned out to be **already built**. Found places, the far
country and the sky stair have had rows since 9c; `sweepNoticed` has been running
every 500ms all along. Only the two finishes were missing.

**The trap in the second row, and it is a content trap.** `deep-rock` fires at
exactly `SLATE_DEPTH` — the depth slate unlocks at — and its line is already
"the rock changes character. It splits flat here". A slate entry about flat rock
would be the same note printed twice, adjacent, under one date heading. So the
new rows are about **having a piece**, not about noticing the seam, which is a
different day and a different thought. There is a test pinning that the two lines
stay apart. Check the same thing before adding a third.

**Given → a real card.** A person handing you something across a counter is not a
secret being spoiled, and treating it as one produced the opposite bug: Gary
discharges Form 9 and the game whispers. `handed()` is one shared card, used by
the hall and the stall.

Three things it fixed or found:

1. **`.unlock` and `.quote` were being written into the DOM with no CSS rule
   matching them.** The one unlock in the game that names itself rendered at
   exactly the weight of the paperwork above it, and had since it shipped. Worth
   remembering as a class of bug: a class name in a template is not a style, and
   nothing fails when the rule is missing.
2. **The seed variety was arriving in `flash()`** — one slot, 1.8 seconds, shared
   with "no room in your satchel" and "that bed won't take". A permanent unlock
   in the same channel as a refusal, deleting itself afterwards.
3. **Found on screen, and only on screen: the card rode above the offers first.**
   The stall is eight varieties of five prices each, so buying one leaves you
   looking at the BOTTOM of two thousand pixels of buttons with the announcement
   off the top. A card you have to scroll back to find is worse than the toast it
   replaced, which at least appeared where you were already looking. It swaps the
   view in place now, on the hall's and the museum's model — never a second modal
   on top.

~~**Not verified on screen: the hall's discharge card.**~~ **Verified 3 Aug 2026
— `scripts/shot-discharge.mts`**, which drives the real sequence (a commissioned
newcomer, an injected qualifying house, the bed assigned through the real UI so
`settleCommission` actually fires) and ASSERTS rather than photographs: the
discharge text, the `.quote`'s left rule, the `handed()` card's accent rule, and
the whitewash unlock by name, all read from computed style in the live modal.
The original note follows, because its diagnosis was right — the injected-markup
attempt was the harness testing itself:

Reaching it for real means
a built house, a stamped Form 9 and an assigned bed, which is a driving sequence
nobody has scripted. An attempt to check the CSS by injecting the panel's markup
was inconclusive and is not evidence — suspect the harness first, and that was
the harness. `handed()` itself is verified in the stall, and `.quote` is verified
inside a card; the untested thing is the two of them stacked. Worth a real
`scripts/` driver, since the same sequence would also unblock anything about
commissions.

**The gotcha the driver found, worth keeping:** a homeless newcomer is not "at
the tent" — `charDef` hands newcomers a NEWCOMER_RINGS schedule, so at any given
hour he is at a ring stop ("out by the fields"), and a script that stands him
somewhere else watches him walk away mid-scene. The driver computes the stop
with the game's own `scheduledStop` at the harness's pinned clock and builds the
whole scene around that. Also: a villager cloned from a resident must have
`fixed` forced false, or the tick derives phantom authored stops for an id the
CAST has never heard of.

### 10k — Three more arrivals, and four things that are true — **built**

Both are table rows and neither is a code path, which is the point.

**The queue runs to seven.** Bartleby (scholar), Waffle (dog), Clag (gremlin).
Forms repeat and that is the table working — forms are species, not singletons,
which is why the NAME has always been the identity in `arrivals.ts`. The real
fence is `home.test.ts`: only six forms have a full bank of things to say about a
house, so an arrival of any other form would move into a home it had no opinions
about. **That list was a hardcoded literal that nothing checked against the
queue**, so this added the missing direction — every `ARRIVALS` form must appear
in `HOUSED`. It caught nothing on the day (scholars were already covered by
Winifred); it is there for the arrival that adds a form.

**They name terrain, and nothing reads it.** The tent line is the one line that
is theirs, so somewhere they like goes there. There is no `prefersNear` field:
that would be a taste that gates a gift, and taste is delight and never a gate.
It is also why **none of them asks to be put anywhere** — a request the game
cannot honour is worse than no request, so each states a fondness and then
concedes something, and housing them wherever you like never breaks a promise.
The version where ground can actually delight somebody is a real feature and a
separate one.

The Office Creature says "they" throughout. He is filing, and a form does not
know anybody's pronouns — correct institutional voice, and it means a row can be
written without deciding anything about the person.

**Four true things in the journal**, which is the one voice in the game that is
reliably correct. The museum's plaques are confidently wrong on purpose and the
curator will tell you things about her own exhibits that are not so; that joke
only works if some voice is not doing it, and a field note you wrote standing in
the thing you are describing is the candidate. So these are real: heartwood is
dead and only the ring under the bark is alive; a mushroom is the fruit of
something much larger under the whole clearing; dew is the ground giving its heat
to the sky; water is clear at the edge and not the middle because of how much of
it you are looking through.

**The fence is narrower than "nature", and the second half is new.** No animals
was already enforced. **No weather is the same trap one step along and is much
easier to walk into**: there is no rain, cloud or snow here, so a true fact
phrased as "the grass is wettest after the CLEAREST nights" quietly asserts that
some nights are not clear, and now the player is watching a sky that will never
change. The dew line was rewritten to drop the comparison, and there is a test
banning precipitation words. **Cloud is deliberately NOT on that list** — it is
not weather here, it is a PLACE, and `above-the-cloud` is a true note about
somewhere you have stood. A guard that fails a correct entry stops being trusted.
The best water fact drafted was why a pond freezes top-down: true, lovely, and
describes ice this game does not draw.

Two things the tests corrected, both mine:

1. **"No two triggers may share a condition" sounded like a rule and is wrong.**
   The test written to prove it disproved it: a wood at dawn fires the tree row
   and the dew row together, and that is two true things about one morning.
   Nothing is announced when a row fires (§10i), so two entries in a second is
   not a dump. The rule that binds is that no two rows may be ABOUT the same
   thing — `deep-rock` and `the-flat-sheet` again. Check subject, not condition.
2. **`NOW` in `notebook.test.ts` is UTC noon, and `skyPhaseAt` reads LOCAL
   hours.** West of about UTC-6 that is an early-morning hour, and summer's
   daylight shift (§10g) runs dawn from roughly 03:45 to 05:45 — so the constant
   the file has used for phases landed inside dawn, and a six-o'clock "dawn" in a
   second test was broad daylight. Any test that cares which rows fire wants a
   local time. Two clocks for one fact, a third time.

### What is left of Phase 10, with the calls already made

1. ~~**Unlocks get a channel, and it is the Notebook.**~~ **Built — see §10i,**
   where most of it turned out to be built already and the real work was the
   given half. Filing batches deliberately kept the hall notice they had: a card
   for them would need the watch pattern plus the first thing in the save that
   exists only to remember what the UI has already said. The original text
   follows, because the rule it states still governs.

   The no-toast rule stands
   for everything found — walnut, slate, the sky stair, the Mole, found places.
   What changes is that finding something now writes a THOUGHT into the journal
   ("saw a birch forest today, that gives me ideas...") and the finish quietly
   appears in the picker. You find out by reading, which is the rule, rather than
   by being told, which is the toast. Things the town GIVES you — a commission
   finish, a seed variety, a filing batch — may have a real announcement card,
   because a person handing you something is not a secret being spoiled. This
   makes the Notebook load-bearing, which is what item 2 is for.
2. ~~**The journal chunks by TIME, never by subject.**~~ **Built — see §10h.**
   The soft time headings turned out to be unable to be empty for a stronger
   reason than "cannot": a heading is made out of an entry, so there is nothing
   to author carefully.
3. **A minimap is allowed if it is drawn from the BIOME FIELD.** §Phase 5 refused
   one because it would show the grove and the cube, and that refusal was right
   about tiles. `siteRegion` knows nothing about props, nodes, structures or
   found places, so a map rendered from it *cannot* spoil one — the same
   structural defence the notices column uses (hand it a view that cannot contain
   the thing). Coloured region shapes, your position, the survey chip folded in.
   Nothing else may be drawn on it, ever.

   **BUILT ON 2 AUG 2026 AND REVERTED THE NEXT DAY** (commits `254b0a8`, then its
   revert). Not because it failed — it worked, and the screenshots are the reason
   this note can be specific — but because it asks the player to keep making a
   navigation decision the game had been getting along without. Read that as a
   verdict on the SECOND half of the Phase 5 refusal, which this item never
   addressed: §Phase 5 gave two reasons, "it would spoil a secret" and "the world
   stays explored rather than routed", and only the first one is answered by
   drawing from the biome field. The second turned out to be the one that
   mattered. Anybody proposing this again is proposing to route the world, and
   should say so out loud rather than rediscovering it.

   **Two findings worth keeping, whatever happens to the feature:**

   - **The defence above holds for `siteRegion` and FAILS for `biomeAt`**, which
     is the substitution that looks more correct and would have been made. Its
     first line answers `"blossom"` for a nine-tile landmark that has its own
     Notebook entry and is found by walking into it — on a map, a coloured dot
     marking a secret, which is the exact thing this item exists to prevent. Any
     future map must sample the Voronoi region (warp → `nearestSite` →
     `siteRegion`) and must never sample `biomeAt`.
   - **It was cheap to pull because it stored nothing in the save.** That was
     deliberate (see the note on overriding a settled call), and it is the reason
     a live game got a reversed design decision and then un-reversed it inside a
     day with no migration owed to anybody. Do the same for the next one.

   Everything else in the sketch stood up: 8 tiles to the pixel against
   `BIOME_CELL` 68 makes a region read as a shape, the swatch derives from the
   biome tint through `mixHex` so the map turns over with the season for free,
   and unlabelled was right — `BiomeDef.name` is "used in dialogue, never in the
   HUD" for a reason.
4. ~~**The terrain pass, which needs a plan before code.**~~ **Planned — see
   Phase 11**, which is that plan. Two corrections it made to the sketch below:
   most of the list is DECOR, which is not a tile and cannot re-landscape
   anything, so the risk is concentrated in three items rather than spread over
   six; and "decor kits for the five regions that have none" is four, because the
   meadow's absence is a decision and not a gap. Original text:

   Water routed clear of
   town buildings (a river past the town is good, a river between two houses is
   not); a plaza that is not the same paving as everywhere else; decor kits for
   the five regions that have none, more flower and mushroom kinds, a fairy ring
   as a found place, islands. **All of it changes generated terrain, and terrain
   is a total function of (seed, x, y) with nothing stored** — so it re-landscapes
   towns people are living in. Owes the 1,000-seed test and the same care
   `HOME_REGION_REACH` was given.
5. ~~**More arrivals, named and authored.**~~ **Built — see §10k.** Seven now.
6. ~~**Real nature facts as journal observations.**~~ **Built — see §10k**, and
   the sentence above was one word wrong: it says "plants, water, rock and
   weather", and **weather is exactly what they may not be about.** There isn't
   any.

**Held out of this phase deliberately:** minigames, and fauna of any kind. Fauna
is not a small addition — §8o rules it out in DESIGN, `notebook.test.ts` and
`moments.test.ts` enforce it, and the poled pond's joke is the absence. Farmable
animals are a chore loop with a schedule and collide with Pillar 2;
observable-not-collectible animals are genuinely interesting and collide with "if
it can be stood next to, it is a resident". That is a design session, not a
roadmap item, and it is the one idea on the list that could change what the game
is. Combining-elements crafting is already on the not-taken list twice.

---

## Phase 11 — The terrain pass — **done** (two items withdrawn from scope,
## see the note under tranche 1)

The plan Phase 10 item 4 said this owed before code. Read it before touching
`generatedTile`, `biomeAt`, or anything under `sim/world.ts`'s water section.

### The danger, measured rather than asserted

**Generated chunks are never saved.** `WorldState` holds sparse edits only —
`overrides`, `under`, `finishes`, `build`, `furniture` — and every unedited cell
is recomputed from `(seed, x, y)` at load. Only `sim/town.ts` writes ground
overrides, and only for the authored town's own footprints. So **the ground
inside a house the player built is not stored anywhere**: it is regenerated, every
load, forever.

That is the standing rule ("an unedited tile is always whatever generation says")
working exactly as designed, and it is why `HOME_REGION_REACH` exists. But
`HOME_REGION_REACH` protects the TOWN. It does nothing for the house somebody
built five hundred tiles out, which is most of what people build.

The measurement, taken over 39k cells of open country east of town on seed 7:

- **23.07% of open country is solid** (fails `isWalkable`).
- A change that rerolled terrain freely would put something solid inside a 7×7
  house's interior on **99.9%** of houses.
- The number that actually matters is the MARGINAL one, because a terrain pass
  perturbs rather than rerolls: **adding one percent of solid decor gives a
  25-cell interior a 22% chance** of gaining a tree inside it. Two percent gives
  40%.

A solid cell inside a room breaks the room, the roof derived from it, and the
villager's route to the bed in it — and a villager who cannot path does not walk
slowly, it snaps, so it reads as teleporting rather than as a broken house.

### The freeze — **built (v31)**, and it is the prerequisite for tranche 2

**Building a room freezes its ground.** When a room closes, write the
currently-generated tile into `overrides` for every cell of its interior and
shell. Those cells stop being generated and become edits, like a dug tile.

Plus a one-time **v31 migration** doing the same retroactively: walk
`rooms(world)` — which already returns `interior` and `shell` per room and is
already cached against `buildRevision` — and freeze what people have already
built.

Measured cost, on a world with five houses of assorted sizes: eleven rooms, **465
cells, about 5.5 KB of JSON**. Per-room counts ran 25 to 81. It is bounded by
what you built, and it is small.

Why this over the two alternatives:

- **Versioning the generator in the save** (`terrainGen: 1 | 2`) keeps two
  generators alive forever, forks again on every future terrain change, and means
  nobody who already plays ever sees an improvement. It is the option that rots.
- **Only ever making changes that cannot alter solidity** needs no migration at
  all and is genuinely the cheapest — but it rules out the water routing that
  motivated the pass, and islands, and any solid decor.

The freeze's real argument is that it is paid ONCE and closes the class: after
it, no future terrain change owes a migration, because no future terrain change
can reach a cell anybody built on. It also makes Pillar 4 literally true in the
data — your land is actually yours, and stops being a function of the seed.

**Its cost, stated honestly:** frozen cells never receive future terrain
improvements. That is correct rather than regrettable — a room's floor should not
change because the generator got better — but it does mean the freeze is a
one-way ratchet, and a bug that freezes the wrong cells is unfixable in place.
So: freeze the room, not a radius, and test that a frozen cell equals what
generation said at the moment it froze.

**What it turned into, building it.** Four things were decided by the code rather
than by the plan:

1. **`frozen` is its own record, and that is not tidiness.** The first design
   wrote the freeze into `overrides`, and `setTile` **deletes an edit whose value
   equals the generated base** — which is every cell the freeze touches. Routed
   through the ordinary door it would have been a loop that stored nothing; and
   written in directly it would mean the save holds values the codebase's own
   sparse-storage rule says must not exist, so any later pass compacting
   redundant edits would unfreeze every town at once. Separate records for a
   separate meaning is the argument `under` and `finishes` already make.
2. **Read order is `overrides`, then `frozen`, then generation.** An edit still
   wins, or building a house would make its floor permanent. The nice consequence
   is that undoing an edit falls back to the frozen ground rather than to live
   generation — the cell returns to what it was when you built, which is a better
   meaning than the one we were aiming for.
3. **The catch-up runs on load, not in the migration.** v31 adds an empty object
   and nothing else. The obvious version walks `rooms()` inside the migration,
   and that couples every old save to whatever `rooms()` later becomes — a
   migration is frozen in time by contract. Running `freezeBuilt` from
   `beginWorld` instead is self-healing: it re-runs at every version, for every
   save, and is idempotent.
4. **`buildAt` is wrapped rather than edited at each `return`.** There are a
   dozen exit points and the one that gets forgotten is the one that leaves a
   room generating its own floor for ever. The condition is `changed`, which is
   already "the build layer moved" — deliberately not the narrower "moved in a
   way I believe affects rooms", which is the rule that is wrong invisibly.

It also freezes the **authored town**, which is a consequence and not a decision:
the town's buildings are ordinary built cells. A brand-new world therefore
acquires a few hundred frozen cells on its first load before the player has built
anything — 236, measured in the browser.

Verified on screen, because no unit test sees the real load path: schema 31, no
page errors, 236 cells pinned on load, and building a closed 3×3 room added
exactly nine — eight shell and one interior.

### Tranche 1 — cosmetic, and the finding is that it needs no freeze at all

**Decor is not a tile** (§8k). A kit is a field on a biome row, drawn render-side
by a hash on the world coordinate; it owns no cell, is stored nowhere, and blocks
nobody. So everything below changes what the world LOOKS like without changing a
single generated tile — no migration, no risk to any build, and the freeze is not
a prerequisite for any of it.

1. **The plaza gets its own paving.** *(The peg is built; the bond is not — see
   the note under this list.)* Today the whole square is one `STONE` tile
   with one `roll` and the shared `paving: "stone"` period table, and §8c already
   flags that it "reads worse than the grass beside it". Two ways to fix it, and
   **take the render-side one**: a variation keyed on `PLAZA` membership, which is
   the decor precedent and stores nothing. A new tile id is the expensive path —
   it owes `groundIdOf`, the flat fill and a `TileDef` row, and the flat fill has
   painted a square across a cell three times already. Note `STONE` is generated
   NOWHERE but the plaza, so there is no collision to solve, only a look.
2. ~~**Kits for the regions without one.**~~ **Built — see the record below the
   plaza's.** Four, not five: pinewood, birch, scrub
   and fen have kits; the meadow deliberately gets none so that walking out of
   town is when the ground starts having things in it. That leaves **dusk,
   glimmer, glass and blossom**. §8k already calls the far rows the interesting
   ones — "a kit is the cheapest strangeness there is, and it is the one place
   §Biomes' *stranger, never richer* has to be checked mark by mark."
3. **More flower kinds — WITHDRAWN from the phase, 3 Aug 2026.** Flowers are
   `bloom` kits — four exist, all
   `season: "spring"`, two marks each. Autumn and the far country are both open.
   The rule they are under: a mark is texture and yields nothing, so a flower may
   never become pickable. Withdrawn along with the mushroom variation (see the
   note below the mushroom paragraph): both are open-ended content authoring
   that anybody can add later under the rules recorded here, and the phase does
   not wait on them. The phase closes with them out of scope, not half-done.

**The plaza paving is built (item 1 done)**, and it took most of a day of
on-screen rounds to converge, so the record here is long on purpose — the wrong
turns are each a rule.

**What shipped:** `PLAZA` is 11×8 (was 11×9), and `drawPlazaPaving` in the
renderer draws the whole square as ONE COMPOSITION in world pixels, clipped to
whichever tile is being painted. The layout is a hand sketch scaled to fit: a
10px border of long stones — five across the top and bottom, running through the
corners; three up each side, butting into them — around a 6×4 field of 26×27px
pavers. The sketch was 18×13 units, the square is 176×128px, the aspect ratios
agree within one percent, so one unit became ~10px and the drawing mapped over
directly.

**The constraint that shaped everything: the town boxes the square in at eleven
tiles.** The hall's door opens onto the top row at (0,−5), the shop ends at
x −6, the east building starts at x 7, and the homestead tents sit at the SE
corner for all four spots. The sketch's ratio at six pavers across needs ~18
tiles of width, which means MOVING BUILDINGS — stamped into live saves as
overrides, so the ground plan would move underneath towns whose buildings
stayed put. Declined for now; if the square ever needs to be grander, that is
the project, and it is not an afternoon.

**Wrong turns, each with its lesson:**

1. **A kerb was built and deleted.** The square already has an edge — the
   boundary bevel draws `def.top`/`def.shade` only where `groundIdOf` changes,
   and it runs after the paving pass, so the kerb was overpainted on the two
   sides they shared and contributed only verticals against a convention that is
   horizontal. Found by cropping the corner at 4×; at 1× it read as "subtle"
   rather than as wrong.
2. **A peg was built and unrendered.** The datum got a 9×9 pixel-grid plate at
   (0,0) — nice enough, but the peg's whole joke is that it is BURIED and
   unverified ("I have never seen the peg. I file as though I have"), and a
   confident object at the exact spot the writing keeps vague answers the
   question the joke needs open. The joke lives in Gary's line and the Notebook;
   the ground shows nothing. `the-datum`'s entry lost its geometry clause
   ("eleven across and nine deep") when the resize made it false.
3. **Grain-table rounds that all failed the same way.** Bigger courses, square
   flags, third-stagger bonds — every per-tile variant still read as "a large
   floor", because the thing that distinguishes a SQUARE is a layout (border,
   corners, a field that divides), and a repeating period has no layout. The
   composition replaced all of it, and the per-tile grain-swap/axis/phase
   machinery built along the way was deleted.
4. **Squares cannot edge anything.** The first border was small square pavers
   and read as gravel: a unit with no direction cannot describe an edge. Long
   stones whose long axis follows the ring fixed it — and then the corners
   needed their own seams, or they fused into the side runs.

**Numbers worth keeping:** pavers 26×27 against a 16px tile, so nothing in the
field lands on the tile grid — the square reads as paving laid on the ground
rather than the map's grid restated in grey. Top stones are 176/5 = 35.2, so
four at 35 and the remainder in the last: a mason's cut, not an error. Side
stones 108/3 = 36, exact.

**Loose end, deliberate — now checked:** the resize hands the old bottom row
(y = 3) back to the generator, which on some seeds grows trees or water hard
against the south border. Fine on the seeds looked at, and `water.test.ts`
("never seals the plaza's south edge") now sweeps it on a thousand seeds ×
four spots. The invariant it settled on is the honest one: trees and water on
the row are allowed — a tree by the square is a tree, a river through town is
paid for by the bridges — but the row may never come out solid or deep END TO
END, a wall along the south of the square. Some cell is always standable
ground, wadeable shallows, or the bridge deck (the bridge column crosses this
row at x 0, so even a channel running lengthwise along it leaves a crossing).

**The four kits are built (item 2 done)**, each one derived from what its
region's row already said about itself rather than from a fresh idea — which is
why all four went in one sitting where the plaza took a day:

- **Dusk: night flowers, open at noon.** The region's premise ("nothing is
  shaped oddly — that is the point") carried down to the ground: the plainest
  flower drawing in the file, and the strange part is a FACT rather than a
  silhouette — these are the flowers that open at dusk, and here it is always
  dusk, so they are always open. Moon-pale heads on stems in the near-black
  crown ink; the firefly's ember stays the only warm thing in the country.
- **Glimmer: dark moss — the one kit whose job is to not shine.** Air, trees,
  caps and stone already glow there, and the tuft note records what happened
  when a fifth thing tried ("competing instead of coalescing"). Low round
  mounds in the crown's near-black land as SILHOUETTES against the lit floor —
  things standing between you and the light, the only new sentence available.
  Sparsest kit in the file.
- **Glass: the stone rule at mark scale.** Shards and slabs, nothing in
  between, becomes single stems standing dead straight and the same stem lying
  flat. **The finding worth keeping: at three rows a one-pixel upright
  photographed as a slightly taller dot** — the region's own tuft list already
  scatters pale dots, so height IS the drawing, and five rows is where the eye
  stops reading "speck" and starts reading "line". The tallest marks in the
  file now, past the fen's reeds. (Also the equal-blades-read-as-a-gate rule
  has a floor: one blade alone cannot make a gate, which is what lets the one
  region whose character is geometry have a perfectly straight mark at all.)
- **Blossom: lawn daisies, and not one pixel of pink.** The row once refused a
  ground bloom (fallen petals — one colour doing three jobs), and the kit
  honours the refusal's terms instead of relitigating it: white heads with a
  gold eye, no stem rows (a daisy in mown turf is a head IN the grass), and no
  season, because Bellis perennis flowers in cut lawn nearly all year — the one
  ground flower that can live honestly under trees that are stubbornly in
  blossom all twelve months. Sparse enough that "the bare ground is what the
  blossom is seen against" survives the kit.

One test learned something: `decor.test.ts`'s ink regex predated any decor kit
using the `*` eye (only blooms had), so it now admits `*` and guards the core
both ways, exactly as it already guarded the accent — a declared core nothing
uses is dead weight, and a used core that doesn't exist falls back silently.

**Mushrooms are the exception in this tranche and belong with tranche 2's
caution.** `MUSHROOM` is a real generated tile, not a mark, so its density is
terrain. It is walkable and diggable, so it cannot break a room — but it IS a
gathered material, and the glimmer precedent is the warning: 0.4 was cut to 0.045
because "3.3× the record makes foraging measurably better". **Vary the shape and
the tint, never the density, and never the item.** `MushroomShape` has two
members today and only the fen uses `bell`.

**Withdrawn from the phase, 3 Aug 2026, together with item 3's flower kinds:**
the shape/tint rules above stay as written and govern whoever picks this up;
the phase itself does not wait on it.

### Tranche 2 — the ones that move ground, and what each owes

None of these may land before the freeze is live. **All three are built** — the
records follow the original items below.

4. ~~**Water routed clear of town buildings.**~~ This is the only DEFECT on the list;
   the rest are additions. `TOWN_DRY = 46` already keeps the sea and lakes off
   town, and rivers are *deliberately* allowed through — a river is a good thing
   for a town to have, and generated bridges exist for it. The actual bug is that
   `stampBuilding` paves `FLOOR` under its own footprint, so a river is
   overwritten INSIDE a building and may still run right up to a wall or between
   two houses. So the fix is a clearance term on channels near town footprints,
   not a ban on rivers. Owes: the 1,000-seed treatment, and it must not break the
   existing guarantee that riverside towns get a river and a bridge.
5. ~~**A fairy ring, as a found place.**~~ Structurally the cheapest new kind there
   is: the same annulus test `ringgrove` already uses, with `MUSHROOM` instead of
   `TREE`. No new tile id, no water, so it inherits siting, memoisation and town
   clearance for free. Must sit outside ring 96 to clear the grove, the cube and
   the blossom rows. Owes a Notebook entry, because every other kind has one.
6. ~~**Islands.**~~ The genuinely hard one, and the only item here that is a new
   field rather than a term on an existing one. Depth is monotone-decreasing from
   a centre, so an island is a positive term subtracted inside a body. It must be
   a total function of `(seed, x, y)`; it must not produce single-cell islands
   (the per-cell-edges failure, and also a pathing hazard — `canStep` refuses a
   diagonal unless both orthogonals are clear); and it must not manufacture land
   nobody can reach, because nothing in this game crosses deep water. Consider
   whether an unreachable island is a feature — you can fill water forever, so it
   is reachable by work — or a bug.

**The tranche 2 record.** One idea ended up carrying all three items: **a cap on
a depth field** — `min(field, limit)` — which can only ever LOWER water, never
conjure it (`min(x, −∞) = −∞`), and whose bands stay the same few tiles wide
whatever the field underneath is doing.

- **Item 4 (`townChannelCap`): a cap, not a subtraction, and the riverside
  anchor is why.** The anchor sits three tiles from Prudence's west wall, so a
  clearance term SUBTRACTED from channel depth would have dried the town's own
  promised river exactly at the town on pinched seeds. Capped, water near a wall
  gets shallower, never absent: no standing water within two tiles of any
  authored building, sand allowed (the floor of −1.5 sits just above the
  river's beach at −2, so a wall the river used to lap gets a BANK, not a
  deletion — while streams, beach 0, go honestly dry). Sea and lake are not
  capped: `TOWN_DRY` already answers for them, and a second opinion about the
  same fact is where drift lives. Two new tests: the 1,000-seed ring sweep
  (Euclidean, because the cap measures Euclidean — the diagonal cell off a
  corner is 2.83 out and may legitimately hold shallow water), and a wet-river
  assertion, because `waterKindAt` counts the beach as river, so the old
  promise test literally cannot see the difference between a river and a
  promise kept in sand.
- **Item 5 (fairy ring): the ringgrove's annulus in `MUSHROOM`,** ring 109,
  spacing 239, radius 4 — sized so you can see the whole circle at once, which
  is what makes a circle of small things read as deliberate. The rim is 1.0
  against the grove's 1.2 because a mushroom is a point where a tree is a mass.
  CLOSED all the way round, where the poles are deliberately jittered: the
  poles are a committee, this is one organism fruiting at its own edge — which
  is also the Notebook entry, a real nature fact in the house deadpan
  ("...the circle is the shape of it getting wider. It started before the town
  did."). Picking a hole in it is a stored edit, yours to keep, exactly like
  chopping a ringgrove tree. The existing 1,000-seed found-place sweeps picked
  the new kind up without a line changing.
- **Item 6 (islands, `isleCap`): the cap trick is load-bearing here, not
  convenient.** The roadmap sketch said "a positive term subtracted inside a
  body", and that version aliases: the sea's raw depth runs to sixty tiles in a
  big interior, so a dome subtracted from it compresses the island's shore
  bands (sand is a 3-tile window) to a fraction of a tile — the per-cell edges
  failure this very section predicted. Capping (`min(raw, RIM − h·slope)`)
  gives every island the same few-tile halo/sand/top profile over any abyss.
  Decisions taken and settled: **unreachable by default** (no generated shallow
  bar — you may fill water forever, so an island is reachable by WORK, which is
  the no-caps spirit), and **seas only** (lakes stay mirrors). The invariant
  that matters most is invisible: **siting reads the sea RAW** — the cap is
  applied in `waterAt` alone, so an island's dry top still counts as sea to
  `onLand` and no landmark can ever be sited on ground nobody can reach. The
  gate (an island exists only where the raw sea holds its footprint plus a
  six-tile moat) is evaluated once per candidate at its centre, memoised, in
  the `siteMemo` style. Minimum radius 7 is derived, not tasted: dry ground
  starts (RIM + beach) / slope = 4 tiles inside the edge, so anything smaller
  is a shoal that never surfaces — legal, but the no-single-cell guarantee is
  about the dry top, and the test asserts every dry island cell has a dry
  orthogonal neighbour.

  **The find of the pass:** the first draft of the island test asserted dry
  tops are dry and failed on seed 2 at (56,149) — a POND, on an island, in a
  fen. Other water on an island is legal and good (the island inherits its
  region, and the region was wet); the sea is the only kind the cap answers
  for, and the test now says exactly that.

### What the whole pass owes, procedurally

- **The 1,000-seed treatment**, which is a real precedent and not a figure of
  speech: `biome.test.ts:102` (town is meadow), `found.test.ts:48` (no landmark
  near town), `water.test.ts:616` (nothing unstandable around the tent). A new
  terrain feature earns its own. Note the cost ceiling found in `water.test.ts`:
  the A* pathing sweep runs 250 seeds rather than 1000 because at 1000 it was
  "28 seconds of a 10-second suite". Tile-level checks can afford 1000; anything
  that builds a world cannot.
- **`scripts/shot-map.mts`.** Terrain bugs are bigger than the camera: the
  wallpaper bug and the scatter's diagonal were both found at map scale and could
  not have been found any other way.
- **`scripts/shot-biomes.mts`** after any kit or tint change, and
  **`shot-spots.mts`**, which is the only check that the four spot promises still
  mean anything.

---

## Phase 12 — the conversation pass (fable-generated content) — **done**

The project the user's list called "fable generated content", defined 4 Aug
2026. The itch, verbatim: *"right now, if i click on someone standing in the
town square, they're going to say the same thing to me over and over. and
that's not what i want."* The target feeling is Animal Crossing's "I haven't
seen you in a while" — a town whose people keep having something to say —
without the dialogue going stale.

### What this phase is not, settled before it started

The original bullet asked whether we implement SDV-style **stories advanced by
tasks**. The answer is no, and it was already settled three times over in the
doc's bones: the Notebook may never name a thing to do, the notices column is
structurally unable to set a task, and nothing may gate on festival attendance.
A story that advances on task completion is a quest log with a plot. What SDV's
stories are FOR — the town keeps unfolding — is delivered here by **time and
memory**, the two axes the game already runs on.

Also ruled out: **runtime generation.** The game never calls a model while
running. It would break the deterministic sim, the client-only PWA, and the
voice control, and cost money per player forever. All generated content is
authored at generation time, reviewed, and shipped as ordinary table rows —
content is data, so "constantly new content" is a cadence of reviewed drops,
and the pipeline that produced the first drop is the one that produces the
next.

### The diagnosis, measured

The selection architecture is already right and already sees real context —
`speak()` (`sim/dialogue.ts`) is a priority ladder over secrets, home remarks,
museum dissent, the memory log, room history, season, idle. What is starved is
everything else:

- **The banks are tiny.** The Menace has 2 idle lines. The generic idle
  fallback — what every form without its own bank says — is 3 lines. The
  Blessed Carrot owns roughly a dozen lines in the whole game. Most memory
  kinds have exactly ONE template per form, so the best system in the game
  repeats its one sentence about your one fence forever. Only the scholar is
  reference-complete.
- **Anti-repetition is one re-roll.** The only history is `lastLine`; a 2-line
  bank is a coin flip between the same two sentences.
- **Nothing tracks when you last talked to anyone.** The away sim changes
  what's in the log, but nobody greets your absence. The Dog's "You came back!
  I hoped." reads absence-aware and is actually friendship-tier-gated.
- **Every conversation is one line deep.** The speech panel already has choice
  buttons ("There's a room for you", the company invite) and they are already
  phrased as things you say — but the villager never speaks back.

### The build order

1. ~~**Selection mechanics.**~~ **Built (v32).** A per-villager **recently-said ring** (last ~8
   lines, replacing the single `lastLine`); a **`lastTalkedAt`** timestamp and
   an absence-greeting rung at the top of the ladder (per-form, per-gap — "a
   few days" and "weeks" are different greetings); and an **in-the-middle-of**
   rung that reads recent witnessed events by timestamp ("you've been digging
   all morning"). Schema bump, tested migration. Mechanics land FIRST because
   generated content is worthless while selection keeps thumbing the same
   three cards.
2. ~~**The conversation tree runtime.**~~ **Built.** `content/conversations.ts`
   holds `Exchange`/`Reply` trees; roots POOL into the same rungs as flat lines
   (idle and the absence greeting so far), so how often a conversation opens is
   decided by the bank's proportions rather than a second chance roll. Replies
   render where the close button sat — the authored `"..."` reply is the same
   gesture as the `"..."` that closes, except the person answers it; the scrim
   and Escape stay as doors throughout, and the ordinary row returns at the
   leaf. The rules below are enforced by `conversations.test.ts` (depth, the
   `"..."` reply, the no-extra-fields tripwire), not by reviewer memory.
   Rules, all settled:
   - **Shallow, always.** Two or three exchanges, then it lets go. Most taps
     still produce a single line — a tree firing every time is homework.
   - **Choices are tone, never strategy.** No reply pays more friendship than
     another, none gates anything, none is wrong. The whole conversation pays
     what a single line pays today, once.
   - **`"..."` is always a valid reply**, and villagers answer silence
     in-character. The Ghost approves; the Blob is wounded; the Menace fills
     it.
   - **Replies may flavor by the PLAYER's form** — approved. Variant text is a
     light layer with a shared default, written only where the form earns it,
     never a separate 11-wide matrix.
3. ~~**The fable-generated bank.**~~ **Built**, in three reviewed sittings
   (dog; carrot; then blob/menace/gremlin/scholar/office together) — roughly
   270 lines and 13 trees. Two additions the sittings produced that were not in
   this plan, both from the same question — *why does every dog sound like the
   same dog?*:
   - **Kinship** (`RESIDENT_KIN`), said only to a player of the SPEAKER'S OWN
     form, pooled into idle when they match. Recognition and nothing else — no
     mechanic anywhere knows the forms matched, which is what keeps it on the
     right side of "form is identity, never a job".
   - **Character lines** (`ArrivalDef.lines`), each arrival's own small talk on
     their own row, pooled on top of their form's. The table already called the
     tent line "the one line that's *theirs*"; this is the rest of that
     sentence, and it is what stops Biscuit and Waffle being one dog with two
     names. Biography as data on the row — no new system, and the expensive
     version (per-character trees and memory templates) can key the same way if
     the town still reads samey on screen.

   Original text: form by form, each steeped in that form's
   existing lines, to the scholar's standard and past it: idle depth (15–25
   lines, not 2), 3–5 templates per memory kind, warm lines at every tier,
   seasons, the new absence and in-the-middle-of banks, and trees where the
   context earns one. On the order of 1,500–3,000 lines. **Review is every
   line, a form at a sitting** (a few hundred lines each) — the bank is only
   as good as its worst line, and the voice rules (per-form voice, brevity,
   `... Capital`, deadpan that never winks) are the hard constraint.
4. ~~**Tranche 2 — replies are remembered.**~~ **Built**, and it owed **no
   migration** after all: `answered` is a new VALUE in a field every save
   already has, so an old log simply holds none. The shape is a `keepsake`
   clause on a `Reply` — phrased to read after "you said", so one clause serves
   every form's grammar — written to THAT villager's log and nobody else's
   (`witness` broadcasts because news travels; an answer is not news), then
   read back through the ordinary memory rung at the top of `MEMORY_PRIORITY`.

   Four rules the tests pin, because each is a way this could quietly become a
   quiz: keepsakes are **sparse** (fewer than half of all replies may carry
   one); `"..."` **never files** anything, because silence says nothing to
   remember; a keepsake is a lowercase clause with no terminal punctuation; and
   the same answer twice is **one** memory, so a daily habit can't crowd out a
   log. Verified on screen end to end: answer the scholar's survey with "Home."
   and she brings it back later — *"I've been thinking about what you said —
   you call this place home. It holds up."*

### The polish pass — **done**, and it found two real bugs

Line edits were deliberately deferred rather than taken per sitting: the user
read each batch and banked their corrections for one pass at the end, to keep
the writing moving. What the pass actually fixed:

- ~~**The carrot's company lines name a stall he cannot have.**~~ Fixed. "The
  stall keeps" and "I return to the stall" predated `ROOTED` in
  `sim/company.ts`: the stall-keeper can never be invited anywhere, so every
  carrot who reaches those lines is a RESIDENT with no stall. **The general
  trap:** when a form is ALSO an institution, ask who can actually reach the
  bank. Checked the siblings and left them — a blob resident saying "the stage"
  is speaking metaphor, and a desk is real placeable furniture, so a retired
  office creature may keep one.
- **Two roofless banks promised rain, in a world that has none.** The Menace
  ("I am being rained on") and the Gremlin ("going to get rained on") — the
  exact line a player would take as a hint to go and watch the sky. Both
  predate this phase and neither had ever been swept, because every guard in
  the repo covered one table.

**`content/banks.test.ts` is what found them, and it is the durable half of
this pass.** It flattens EVERY bank — idle, memory, home, history, warm, kin,
absence, midst, season, company, the three secrets, the trees, the arrivals —
and applies the four rules that were previously enforced one table at a time:
no line sets a task, promises weather, names wildlife, or spoils a secret. The
word lists are COPIED from `notebook.test.ts` rather than rewritten, because
two guards that disagree about what counts as weather are worse than one.

The lesson worth keeping: a per-table guard silently stops covering the content
the moment somebody adds a table, and this phase added five and tripled the
line count. Both bugs it caught were older than the phase.

### What the phase owes, procedurally

- Every schema change ships a tested migration; the game is live.
- Selection stays pure and RNG-injectable — line choice reproducible in tests.
- The speech panel's reply flow is an interaction change: verify with
  `scripts/drive.mjs` on screen, not only in tests, and on touch — every panel
  needs a door, and a mid-conversation close must not strand `modalOpen`.
- Generated lines never reference fauna or weather (neither exists), never
  instruct, never spoil a secret, and every one is reviewed before it ships.

---

## Phase 13 — Minigames — **done**

Phase 10 held minigames out deliberately, with no argument recorded against
them — they were a design session waiting to happen, and this is the phase
that held it. The session's thesis, and the filter every candidate passed
through: **the Farm already pays you for looking** — secrets unlisted, found
places unannounced, the Notebook records what you noticed and never what you
missed — so the games that belong here are games about looking. A slate where
every game is a way of looking at the town is a system; anything else is a
grab bag.

### What shipped

- **Hide and seek** (they hide, you seek — the flagship): `content/games.ts`
  + `sim/play.ts`. A game is a REDIRECTION OF THE COMPANY WALK — one nullable
  slot in a WeakMap (never saved; reload evaporates the game and the
  companion walks back, which is exactly what giving up does), one override
  arm at the top of `followTarget`, one `endPlay` inside `partWays` so a game
  cannot outlive the walk. Hiding needs no visibility system: the renderer
  already occludes honestly, so `hiddenTile` mirrors three drawing facts
  (tall thing in the row south, solid structure likewise, roof overhead) and
  FOUND_RADIUS sits just past the anti-occlusion fade band — the tree going
  translucent and the game saying "found" are the same moment. **Rocks hide
  nobody** (§ROCK_SHAPES sits under the eyeline); if a rock ever grows past a
  tile, `hiddenTile` starts lying and both files say so.
- **I Spy** (they name a visible thing obliquely; you walk to it):
  `spyKindAt` is ONE kind-reader with the exclusions built in — nothing near
  the grove or the Cube, no found places, no people, no plain grass — shared
  by every picker so nothing can disagree about them. The clue is authored
  per kind per form (`SPY_CLUE`, 7×7, every cell written), carries no bearing
  ever (regex-tested), and is STORED so "Say it again?" repeats the same
  words. Finding is proximity and nothing else: no guess, no confirm, no
  wrong answers, no warmer/colder — `spy.test.ts` asserts the absence of any
  guess entry point.
- **"Look at this"**: aim a companion's eyes at a thing; they consider it in
  voice (`LOOK_AT`, plain where clues are oblique). Pays nothing, by test —
  logs byte-identical before and after. The first verb for showing somebody
  your fence on purpose.
- **Sitting together**: `sittingAt` is DERIVED — standing still on a
  walk-through seat is the whole verb, so moving is standing up and a
  demolished bench un-sits you with no stale state. A bench names its own
  second cell for the companion (`seatBeside` — the one sanctioned exception
  to `followTarget`'s "never pick a neighbour cell"). The town ships one
  plaza bench (a fixture, pine, mid-east), which is the whole of **schema
  v33** — everything else in the phase adds no save data at all. Sky Moments
  became naturally reachable on purpose: sit outside at night with somebody
  and `sweepMoments` already counts them.
- **Offers**: a companion occasionally proposes a game; a shared bench
  occasionally gets an unprompted remark. Flashes only, never a modal (a
  modal pauses the town). No pending-offer state exists — the closing row
  shows the games whenever they're playable, so an offer is a sentence, not
  a state, and ignoring one costs nothing.

### The settled calls (don't relitigate)

- **Asking to play IS an invitation.** Same `canInvite` gate, one step: the
  rooted/secret/stranger/abed refusals come free, the Blessed Carrot never
  abandons her counter, and when a game ends the companion is still with you.
- **No count, no eyes-closed screen.** The sim pauses under any modal, so a
  count would freeze the hider mid-stride; the head start is the walk.
- **Nothing stops you watching them go.** There is no win condition, so
  there is nothing to cheat at; every countermeasure (modal, teleport, "stand
  still") is worse than the "exploit". Do not fix this.
- **No cooldown on asking, ever.** `company.ts` said it first: "there is no
  cooldown for a cooldown to become a move". The only timestamps in the
  feature shape the OFFERS, and `offers.test.ts` pins that asking ignores
  them entirely.
- **Payment is being remembered.** Two memory kinds, `hid` and `spied` (the
  `delved`/`climbed` argument: different afternoons, separate bank lines),
  written by `endPlay` to the one who played — never `witness`, which
  broadcasts and befriends; a game is not news and not a job. No value on
  either kind (a value renders into a template — festival.ts's lesson);
  de-duplicated per calendar day, which is not a cap: same-day replays still
  run and still speak, they just don't file a second copy. Giving up writes
  nothing at all, in either direction, `declineErrand`'s discipline.
- **The slate stays small and authored**, like the festival table. A game
  you can play constantly is a routine; the point of a game is that somebody
  suggested it. New games are new rows, argued for one at a time.

### Cut, with reasons

- **Races** — a winner is a score.
- **Guess-where-I've-been / any quiz** — a right answer is a fail state.
- **Follow the leader** — company with a lag buffer; reads as a bug.
- **Skipping stones** — not looking, and the count problem (nobody may count)
  makes it a design session of its own. Parked, not refused.

### Parked for later (argued for, not built)

- **Teaching them a place** — take somebody somewhere they've never been and
  their ring occasionally detours past it afterwards. The first idea that
  changes the TOWN rather than a log; it bends "positions are clock-derived"
  and needs its own session.
- **Ask them back** — a closing-row "Can I ask you something?" that reads
  THEIR memory log out loud. The most direct payoff yet on "NPCs that
  remember"; dialogue work more than sim work.
- **The hide-and-seek festival** — one year, one festival is the whole town
  hiding. Needs no new system: a festival could simply BE this. The best
  version of "the town plays too" and it costs a festival row.
- **The Office Creature's notice** — he is ROOTED and can never play, which
  is the funniest fact about him; a notices-column row stating the rules of
  hide and seek were clarified some years ago and stand. Rule-legal for free
  (notices already can't set tasks).

---

## Phase 14 — The counter pass — **built**, same day it was planned

Two changes to the five keeper counters, from one design sitting (3 Aug 2026):
the keepers introduce themselves, and their lists stop naming what you haven't
earned the right to hear about. Planned before code, as house practice; built
the same sitting. The record, briefly, then the plan as written:

- **Schema v34** — `world.met`, marked by `gain()` in `sim/met.ts`, which is
  now the one door into the satchel (the sow refund keeps bare `add`, and the
  reason is at the top of met.ts). Migration backfills from current inventory
  plus donated exhibits, tested both ways in save.test.ts.
- **The intro lines are drafts awaiting a dialogue sitting.** Six of them, on
  the keepers' cast rows (`CharDef.intro`). Derek's says the quiet part once so
  his counter's "we're not discussing it" becomes a callback; Pesto's owns that
  his counter is a board he is often not at.
- **Found by the first screenshot: "Empty pockets" was a lie.** A fresh save
  holds eight wood against Arabella's twelve-wood price — pockets that don't
  REACH, not empty ones — and her broke line is worded for the true case.
  Nub's ("Come back heavier.") is safe because his prices are junk-only.
- `scripts/shot-counters.mts` now walks the whole flow per keeper — intro
  photographed, answered, counter photographed — and FAILS if a fresh save
  skips an introduction or an introduction fails to hand over to the counter.

### 14a — You meet the person before you meet the screen

The FIRST time you talk to a counter keeper, you do not get the counter. You
get the dialogue frame — the person, in their own voice, introducing themselves
and the thing they run — and only after that does the screen open. Ever after,
tapping them opens the counter directly. This completes §"a counter is a screen,
a conversation is a person": you meet the person exactly once, and the screen is
what a person you already know leaves you with.

- **"Met you" is a memory, not a UI flag.** A new `introduced` memory kind on
  the KEEPER's own log, in `oneShot` (you have either been introduced or you
  haven't), written to them alone — never through `witness`, because an
  introduction is not news. This passes §10i's bar: it is a fact about the
  world, not a record of what the UI already said.
- **Intro lines are content**, an `intro` string on the six fixed keepers'
  cast rows, per-form voice, house ellipsis style. Drafted by the pass, owed a
  per-form review sitting like all dialogue.
- The errands board's PANEL stays faceless (the 8e control) — but Pesto is a
  person you can meet on his round, so he gets an intro too.

### 14b — The lists stop spoiling

The counters showed everything: every finish on the heap with prices you
couldn't pay, every nature exhibit the museum wants including ore and mushrooms
a new player has never seen, varieties already bought sitting marked "— yours".
Settled calls, each with a written reason — and the sitting overrode two of
them, so the old reasons and the revert path are recorded here.

- **A trade row appears only when your pockets can pay it.** Overrides
  "unaffordable rows stay listed" (the same sentence in `shop.ts` comments,
  `heap.ts` and `museum.ts` — "seeing what a counter is for is half of knowing
  to come back"). The override is pure view logic, stores nothing, and can come
  straight back out if play shows the old reason was right (see §"revertible
  when overriding a settled call"). Each list-keeper gains an authored
  empty-pockets line, because a silent empty counter reads as a bug.
- **A redeemed unlock vanishes from the list.** Overrides "taken rows stay,
  marked" (heap, stall varieties — "a counter that empties as you use it makes
  the last visit look broken"). The exhausted lines ("That's the lot") already
  cover the true end state, and the museum has always worked this way — a
  donation leaves the ask-list and reappears in the catalogue. Also view-only.
- **The museum's nature wing lists only what you have MET.** Not
  pocket-filtered — a wanted-list may sit unaffordable — but it may no longer
  name a thing you have never encountered. This is the one change that stores
  something: `world.met`, the set of item ids that have ever entered your
  satchel, marked at gain and never unmarked. Schema bump + migration; the
  backfill is current inventory keys plus the items of donated exhibits, which
  is what a save can honestly claim. Antiquities already obey the stricter rule
  (one row, named only "junk") and do not change.

**Not touched:** Gary (already a conversation), the errands board's notices,
the "no counts, no denominators" rules, and every exhausted/empty authored line
already shipped.

---

## The tents — one tent, eleven occupants (4 Aug 2026)

A visual sitting, not a phase. Two calls, both settled:

- **The canvas is undyed off-white, and it has no stripes.** It was terracotta
  and banded in threes; the terracotta read as a thing somebody chose rather
  than as issued kit, and the bands read as a beach awning. What it has now is a
  lit panel and a lee panel meeting at the ridge seam, which is where the door
  parts anyway. Light from the north-west, same call as the roof pitch and the
  tree crowns.
- **Every tent is the SAME tent; only the decoration varies, by form.**
  `content/tents.ts` is the table — one `TentDecor` per form plus their body
  colour, and one decoration each, never two (at 28×24 a second is clutter). The
  Fancy Little Menace flies a pennant, the Blob's ridge sags, the Office Creature
  has posted the rules of the tent on the tent, the Quiet Ghost's has no pegs.

  This LOOKS like it contradicts the older note that a newcomer's tent is
  deliberately identical to the player's ("they're where you were, not a quest
  marker"). It doesn't, and the reason matters: the player's tent is decorated
  by the same table, off their own form. Same tent, same rule, both of you. Give
  any form its own tent *shape* and the beat breaks — that is the line.

  Secret forms have rows because the PLAYER may import as one; they can never
  reach the commission path, and `content/tents.test.ts` fails if an arrival
  ever gets a secret or hidden form.
- **You house yourself by striking your own tent** (schema v35, `homestead.struckAt`).
  Asked in review: everyone gets housed by you, and you stay in a tent forever
  next to a house you built. `sim/assign.ts playerHome()` is the third caller of
  `qualify()` — a bed, walls that meet, a way in, and nobody else claiming it.
  ACT on the origin tile takes it down.

  - **The flag is your INTENT, not the tent's existence.** The renderer draws the
    tent when `struckAt === null` **or** `playerHome()` is null, so demolishing
    your house puts it back up. A stored "the tent is gone" could disagree with a
    world in which you have nowhere to sleep.
  - **It sits above the held tool in the ACT ladder**, on the mailbox's argument:
    the origin is grass, grass is always diggable, so the shovel would win every
    tap. It costs the tile nothing, because the branch declines until you have a
    bed and again once it's struck.
  - **The migration backfills NULL for everyone**, including towns whose house has
    qualified for months. Backfilling from "would qualify" would strike the tent
    of every established save on load — a thing vanishing from somebody's plot
    with no act of theirs behind it.
  - **No minimum interior**, unlike a commission. Four cells is the Office
    Creature's requirement about a house you build FOR someone.
  - Known and left alone: `at: "homestead"` schedule stops still resolve to a
    walkable cell beside the origin (`sim/housing.ts homesteadStop`), so a
    visitor may end up standing inside the house you built over your plot. That
    predates this and is a pathing question, not a tent one.

- **`/tents.html`** is the contact sheet (dev only, like `/looks.html`), drawing
  the real `render/tent.ts`. Eleven side by side is the only way to see whether
  they still read as one tent — a decoration that creeps into the silhouette is
  invisible one at a time.

## Counters are objects; keepers are people (4 Aug 2026)

Six institutions could only be reached through their keeper. `openDialogue`
called `talk()` and then returned to a counter panel before rendering the line
it had just composed, which threw away more than a line:

- **26 to 38 distinct lines each, unreachable**, including every warm line —
  and warmth is the only channel friendship is allowed to reveal itself through
  (sim/friendship.ts). Warming to six characters was unobservable, which quietly
  undercut the gift feature built the same day: marble at `friend` was the *only*
  consequence of knowing Winifred, where it was meant to be the exception.
- **`speak()` mutates on the way to composing.** It stamps `lastTalkedAt`, marks
  the line recently-said, and `tryTellLine` calls `observe()` BEFORE returning
  the remark. Three of the seven told observations are spoken by keepers, so the
  notebook entry was written and the line that taught it went nowhere.
- **Pesto was invitable with the button unreachable.** He is deliberately not in
  `ROOTED` — his institution is a round he walks — and `openDialogue` computed
  `askable` and discarded it two lines later.

**The settled calls:**

- **A counter is a thing in the world.** Tap the person, get the conversation;
  tap the counter, get the panel. `counter` on `TownFurniture` names which table
  is one and which mark it wears — one field, so the affordance and the
  interaction cannot drift. Derived from the content tables by coordinate (no
  save field, no migration) and read through `furnitureAt`, so a two-wide counter
  resolves to one anchor and a demolished one stops being a counter.
- **This is NOT the menu-in-front-of-a-menu 14a refused.** That was a dialogue
  box with a "Shop" button — a second panel reached through a first. Two objects
  standing in a room is not that. 14a's actual promise survives: both roads go
  through `withPreamble`, so you meet the person before the screen whichever you
  touched.
- **Both roads stay open.** Gary's hardcoded "Anything to file?" became every
  keeper's `ask`. The counter is zero taps from the table and one from the
  person, so nothing became unreachable for somebody who walks up to who they
  came to see.
- **Spatial, not a button stack.** Two other shapes were considered: dialogue
  first with the counter behind a button (Gary's shape, which taxes every counter
  visit forever), and walking *around* the counter to talk. The second is dead on
  arrival because two keepers deliberately stand BESIDE their tables rather than
  behind them — there is nothing to walk around.

**Two things found by driving it, neither of which a test could have seen:**

- **The tap path and the ACT path were never the same gesture.** `boardNear` and
  `counterNear` serve ACT, which reads where you stand. The pointer handler
  special-cases villagers and NODES, and everything else falls through to
  `moveTo` — so tapping a person opened a conversation and tapping the notice
  board standing next to them did nothing at all. The node branch ("TAP A TREE
  AND GO AND DEAL WITH IT") already solved this shape; counters and the board
  now take it, which fixes the board as a side effect.
- **`underfoot` beat both.** The mailbox's comment claims the board "gets away
  with it only because it stands on plaza stone, which no tool touches" — it
  does not; you read it from grass. Walking to the board with the starting shovel
  dug a hole and turned up a hinge, and the board never opened. Both moved up to
  the mailbox's rung on the mailbox's own argument: *"Somewhere you cannot till
  is a curiosity; a letter nobody can open is a feature that does not exist."*

### You could build a house for the shopkeepers

Reported from play, and it was real. The bed offer was gated on `isSecret` and
nothing else, so all seven institutions could be housed.

**They should not be.** DESIGN §"The fixed cast (institutions)" calls them
"named individuals ... distinct from resident villagers", and every one of their
entries in `content/cast.ts` says *"no bed, no ring, no home stop"* in as many
words. Gary lives at the desk; that is not a housing problem to be solved, it is
the joke.

What actually went wrong when you did it:

- **The claim was never acted on.** They are `fixed`, so `tickVillager` returns
  early and they never walk to a bed they were given.
- **And it took the bed out of the pool.** `assign` clears every other claim on
  that anchor, so furnishing a spare room for the Menace could leave an actual
  arrival with nowhere to move in to. A kindness that soft-locks a commission.

**The predicate is read off the RING, not from a list of ids** — a resident's day
ends `at: "home"` and an institution's never does, so `livesSomewhere()` is that
sentence in `cast.ts` as code and a new institution is excluded the day it is
authored. Enforced in both places for the reason `company.ts` gives about its own
pair: the panel shows the button, `assign` enforces it, one predicate so they
cannot drift. `no-resident` joins `Disqualifier` — its docblock said "structural
only", and the honest amendment is that the line which matters is the one none of
them crosses: no verdict here is ever about whether a house is nice enough.

`repair()` hands back a bed an institution was already given, so a save where you
housed the Menace frees that room on load.

**Three existing tests had reached for `"office"` as a convenient second
villager** and one for `villagers[0]`, "whoever the fixed cast starts with". They
use newcomers now — and the obvious swap, the starter resident, fails the other
way: Prudence already has an authored bed, so moving her frees it and the player
claims that instead.

### Six things playing it found that neither tests nor a fresh world could

Every one of these was reported from an actual save, and every one was invisible
to the harness because `drive.mjs` onboards a NEW town on every run.

1. **The keepers never moved on a live save.** `tickVillager` returns early on
   `def.fixed`, so a fixed villager's stored coordinate is never revisited —
   moving one in `content/cast.ts` moves them in a new town and in no existing
   one. Both keepers were still hidden behind their counters, and the commit that
   moved them claimed the opposite in as many words. Fixed in `repair()` rather
   than by a migration, because this is the file's own distinction: *"a migration
   answers 'this save is old', and this answers 'this save is wrong'."* Their
   position is now derived on every load, so the next move needs nothing.

   **And `fixed` is not the test — ONE STOP is.** Pesto is fixed and walks a
   round; snapping every fixed villager to `schedule[0]` teleported the postman
   to wherever he sleeps, at every hour, on every load. The save tests caught it
   on the first run, having been written for exactly that.

2. **You could only tap a counter's LEGS.** A piece draws `height` px above its
   own row — that lift is what makes a table read as a table — so a counter's top
   surface, and the bell on it, are drawn in the cell to the NORTH. The tap
   missed the thing you can see and hit the few pixels that really are in its own
   square. A tap one row north now counts when the piece below is at least half a
   tile tall, which is already the renderer's line between "leans into the cell
   above" and "is in it". **ACT is deliberately not changed to match** —
   `counterNear` is about which tiles you can reach, a fact about the floor.

   The first fix walked the player ONTO the tapped cell: the ground under an
   overhang is ordinary floor, so `moveTo` stepped onto it instead of being
   refused. `touchableAt` returns the piece's own SOLID cell, which is what makes
   the walk-alongside-and-face work at all.

3. **The heap's counter was standing in a wall.** Authored at (6,-7) with
   `x0: 6`, so its left half was in the west wall ring: half the table drew
   outside the building, and the only walkable cell next to its anchor was out on
   the grass. You could not stand at your own shop's counter from inside your own
   shop. Moved to (7,-8), one row in from the door; Nub moved with it.
   `town.test.ts` gained the guard it never had — it checked doorways, not walls —
   plus one asserting every counter has a walkable neighbour indoors.

4. **A door outranked a counter.** `remember` sat above the counter rung, so
   walking up to the facility told you about the building. A counter always wins
   that tie: a door's history is a remark you get for standing somewhere, a
   counter is the reason you walked there.

5. **You could talk through a wall.** 2.6 tiles of proximity goes straight
   through masonry, so you could stand in the plaza and hold a conversation with
   Gary at his desk with the hall's roof drawn over him. `sameRoof` now gates
   both talk paths — compared by room ID, not object identity, which would have
   been right by luck.

6. **Every keeper offered to trade, which is the thing this whole change removed.**
   The `ask` reply was added on Gary's precedent to keep both roads open, and
   giving all six the same button rebuilt the menu-in-front-of-a-menu one panel
   further in. Removed. The counter is a thing in the room; you walk up to it. A
   person who mentions their counter every time you say hello is a person whose
   job has eaten them, and the point of splitting the two was that it hadn't.

### The counters had to look like counters

`content/countermarks.ts`: a bell, a ledger, a seed sack, a paint tin, a stamp,
a playbill. An OBJECT rather than a UI badge — no glow, no outline, no floating
icon; somebody left a bell on the counter.

- **One per counter, drawn at the piece's ANCHOR.** Every counter is a 2x1 table
  and the stage is 2x2, so a mark drawn per cell is two bells and four playbills
  — the per-cell edges rule (CLAUDE.md) in another hat. `furnitureAt` returns the
  anchor for any covered cell, which is what makes this structural rather than
  careful.
- **Placed off the piece's own geometry**, centred and standing just behind the
  front lip of the top surface (`base - height`), so one rule serves a table
  twelve pixels tall and a stage eight.
- **Not finish-keyed.** Literal colours, on the argument content/furnishings.ts
  already makes for a lamp's brass: a bell is brass in a walnut shop and brass in
  a whitewashed one. The ledger's cover and the tin's paint are lifted from
  `content/skins.ts` (oxblood, sage) — a mark is a thing somebody in this town
  owns, so it wears a colour this town has.
- **The first draft failed on screen and the second was authored from what it
  showed.** An open ledger was PAPER on a whitewash desk and rendered as a
  domino; a flat tray of seed was brown on a pine counter; the stamp and the
  scales were 70% ink and read as smudges. The rules that came out of it: a mark
  must contrast with the counter it sits on, and a silhouette needs a fill to be
  a silhouette. `countermarks.test.ts` holds the ink ratio under 60%.
- **Scales became a paint tin**, and the replacement is better content: paint is
  what the Gremlin's counter actually hands over, so the mark names the trade
  instead of the premise.

### And two keepers stood where their own counter drew over them

A table is twelve pixels tall and draws that height UPWARD, over the cell to its
north. Both the Menace and Winifred stood in exactly that cell: on screen all you
could see of the Fancy Little Menace was her crown, and the curator of the town
museum was a pair of eyes above a desk.

`cast.ts` already knew — Derek was moved beside his counter for this reason and
the note says so, and Winifred's own schedule line has claimed "beside the desk"
since it was written while the coordinate put her behind it. **The comment was
right and the number was not.** Both now take Derek's relation: one cell past the
counter's end, one row north. It hits the PLAYER too, standing north of any
counter, which is how it was found.

## Finishes people give you — friendship becomes an unlock source (4 Aug 2026)

DESIGN and `content/skins.ts` had both said for months that finishes are earned
"through friendship, discovery, and the underground". Discovery had walnut, the
underground had slate, the heap had five, commissions had whitewash — and
friendship had **nothing**. It was a source named in two documents with no code
behind it, and the way that surfaced was `marble`: unobtainable, hint pointing
at a person, nobody checking (see §Known gaps).

**The settled calls:**

- **A finish is given by a PERSON, at a tier, and the table says so.**
  `SkinDef.given = { who, tier }`, sitting immediately below `hint` on the same
  row. The two say the same thing to two audiences — the hint tells the player
  who to go and see, `given` tells the sim who to check — and a hint naming one
  person while the gate checks another is a lie the player walks into. Adjacent,
  they get edited together, and `skins.test.ts` asserts the hint contains the
  giver's name.
- **`friend` finally has a job.** The ladder's middle rung was read by nothing:
  company asks for `familiar`, the notebook for better-than-`new`, Eloise's name
  for `close`, and `friend` only widened a dialogue pool. Marble sits there now.
- **Two givers, at two different tiers, and that unevenness is the design.** One
  gift per institution would make the invisible ladder very visible — the player
  would learn the rate and start farming it. Ochre comes from Pesto at
  `familiar` (the earliest, from the friendliest character, before you have
  worked out there is a system); marble from Winifred at `friend`.
  `skins.test.ts` holds the line at one finish per person: two is a shop.
- **`close` stays Eloise-only.** A second payout at 60 would dilute the one
  friendship milestone DESIGN says is worth being able to point at.
- **It arrives in the SAME conversation that crosses the threshold.**
  `takeGift` runs after `befriend` in `talk`, not before. The ladder is
  invisible, so there is no way to tell somebody they owe a second visit — a
  gift held over to the next hello is a gift that looks like it never happened.
- **No meter, no milestone, no "friendship increased".** It reuses the `handed`
  card, by the rule `app.ts` already kept: **the two unlock channels are told
  apart by WHO CAUSED IT, not by what it is.** Walnut and slate stay silent
  because you found them; a person putting something in your hands is the
  opposite case. Their line above the card, not in its `said` slot — that slot
  reads as a caption on a prize, and this is somebody talking and then you
  seeing what they meant.
- **No migration, and that is a property of the design rather than luck.**
  `skins.unlocked` IS the record of which gifts have happened, so there is no
  second place for the two to disagree, and a live save where you are already
  warm simply gets its finishes at the next hello.
- **Ochre is the only yellow in the game**, and the palette gap is why it exists
  — the woods ran tan/cream/dark-brown/grey-brown/white/green/red/off-white and
  the stones ran four greys. Saturated well past pine on purpose: a finish
  nobody can tell from a starter is not worth a conversation. Verified on screen
  beside pine, not in prose.
- **It is a paint, and it is the one paint that isn't the Gremlin's.** His are
  found half-tins; Pesto's is a whole one, kept back. That distinction is the
  only thing stopping a second paint source from undercutting the heap, and it
  is why this is a gift rather than a sixth row on his counter.

**The mechanism can never become a gate**, which is what makes hanging it on a
tier safe at all: a finish costs nothing to apply, weighs nothing, and no
commission, room or acceptance test has ever asked what colour anything is. A
player who never warms to anybody loses two colours and not one thing they can
do.

`sim/friendship.ts` gained `giftDue` (a read) and `takeGift` (the mutation),
split because the panel opens in stages — an intro first, if they still owe you
one — and a check that unlocked things as a side effect of being asked would
hand the finish to a modal the player then dismissed. `app.ts` gained
`withPreamble`, which is the ordering: who they are, then what they kept for
you. That order is not hypothetical — `witness` warms whoever stands near you
while you work, so you can reach `familiar` with somebody you have never spoken
to, and Pesto handing paint to a stranger is what a player who builds near the
plaza would have got.

## Phase 15 — the soundtrack (4 Aug 2026)

The game had cues and a hum. It now has music: `content/music.ts` (the
setlist), `sim/score.ts` (where you are and what time it is), and the engine in
`ui/audio.ts §the score`. No assets, no schema change, one new menu switch.

Designed at a browser rather than on paper — four throwaway spikes, each one
answering the question the last one raised, and the settled calls below are all
things a spike changed our mind about. DESIGN.md §"Sound and music" is the
short version; this is why.

### The settled calls (don't relitigate)

- **Lofi in town, ambient in the wild — but ONE engine.** The first spike built
  them as two engines to A/B. The comparison is what killed the idea: muting the
  drums on the lofi one lands most of the way to the ambient one, because the
  distance between the two genres is articulation, not harmony. Two engines
  would have meant two of everything and a cross-fade between them.
- **Layers, not cross-fades.** Same key, same tempo, same four chords the whole
  way out; position sets a gain per part. Game audio calls this vertical
  remixing, and the alternative — cutting between pieces — is what a radio
  losing signal sounds like. The doorway case is the one that decides it: you
  will step out of town for eight seconds and back, constantly.
- **Hysteresis was in the spike and is NOT in the game.** The spike had a hold
  timer so the music only believed a position you had kept for ten seconds, and
  demonstrably needed it — without it, wagging the marker across the tree line
  made the mix lurch. The argument for leaving it out here is that two other
  things already cover the same ground: zone gains move on a 4.5s time constant,
  and `settledness` has a ten-tile plateau around each anchor, so stepping out
  of a doorway barely moves the number. **This is reasoned, not heard** — if
  walking in and out of the shop turns out to pump the drums, the hold timer is
  the fix and it is about fifteen lines.
- **Two anchors, plaza and homestead.** One anchor would mean the reward for
  building somewhere with a view is that your own kitchen has no floor under the
  music. `settledness` takes whichever is nearer.
- **Biomes stay out of it.** DESIGN says biomes are colour and density and
  nothing else. A biome that changed the music would be a biome that meant
  something.
- **Nothing fades. Parts arrive.** A master-gain ramp sounds like a master-gain
  ramp. The arrangement envelope — one number, read through a per-layer window —
  is the whole trick, and it is what makes "you cannot point at the moment it
  started" true rather than aspirational.
- **Assemble time is shorter in town.** 16s settled, 30s wild. The spike used
  one number for both and it was wrong at one end: thirty seconds of pads before
  a beat is atmospheric in a field and simply slow on the plaza, where the beat
  is the point.
- **Silence is the seam, not just the rest.** The next piece is chosen during
  the quiet, which is why key, tempo, progression and drum pattern can all
  change with nothing to hear. This fell out of asking for variety and turned
  out to be the better half of the answer.
- **Three minutes on, five off — eight at night.** Minecraft's tracks run about
  three to four minutes with a great deal more silence between them than that;
  the ratio is the point, and the first spike ran at about 70% duty cycle, which
  is a livestream rather than a game.
- **Night gets its own pieces, not the day ones dimmed.** Three of them, slower
  than anything in daylight, with `hush` under them. Dawn counts as night and
  dusk does not — `sim/time.ts` already draws that line for the ground palette.
- **Music has its own switch.** Plenty of people want the shovel and not the
  soundtrack. Global mute still takes both; it is the bigger hammer, not a peer.
- **Voice leading, not register folding.** Each chord's notes move to whichever
  octave sits nearest the note that voice just played. Folding every chord into
  a fixed window independently is correct and sounds stiff, most audibly in the
  flat keys — `Half Six` is the row that exposed it.
- **`unlock()` exists because the score has no gesture of its own.** Cues ride
  in on the action that caused them; the score runs off the frame loop and would
  otherwise build an AudioContext on frame one, before anyone has touched
  anything. That is both the rule at the top of `ui/audio.ts` and a browser
  warning logged once a frame — caught in the browser, invisible to the suite.

### Parked (argued for, not built)

- **Interiors.** Standing inside a building currently reads as wherever the
  building is. A room could damp the top end and pull the reverb in, which is
  cheap; what stopped it is that `sim/rooms.ts` recomputes and the music would
  need to not care about a wall being knocked through mid-piece.
- **Festivals.** The plaza stage is the one place in the game with a reason to
  override the setlist outright. Wants a piece written for it, not a rule.
- **The Cube.** It hums at a fixed 55Hz and the score does not know. Tuning the
  drone to the hum when you are near it, or the reverse, is a nice idea and a
  trap: the hum confirms a landmark and must not become a musical event.
- **Seasons.** Winter could bias the pool toward the sparser rows. Cheap, but it
  is a fifth thing reading the clock and none of the other four sound like it.

### What this phase owes, procedurally

Unit tests cannot hear anything. `sim/score.test.ts` measures the numbers the
engine is handed — 35 of them — and that is the whole of what is assertable.
Everything about whether it SOUNDS right was settled in a browser, and the two
bugs found this phase (the autoplay warning, the stiff flat keys) were both
invisible to the suite. Verify audio changes by listening, and by counting
oscillator constructions if you need evidence a scheduler is running.

## Phase 16 — the granite and the redwoods (4 Aug 2026)

Two regions, placed two different ways on purpose, and a third that only some
worlds' redwoods have. `content/biomes.ts` grew three rows (`granite`,
`redwoods`, `giants`), `sim/world.ts` grew a siting function and a ground field,
`render/renderer.ts` grew one number. No schema change: biomes are a total
function of (seed, x, y) and are stored nowhere.

### The settled calls (don't relitigate)

- **The `near` column of `FIELD_WEIGHTS` is frozen, and new rows are APPENDED.**
  It sums to 6 in table order and reproduces the pre-7a array tile for tile; a
  row inserted with a near weight re-landscapes every live save, and the failure
  is a tree standing inside a house somebody already built. Granite is
  `{ near: 0, far: 1.2 }` at the foot of the table for exactly this reason, and
  `sim/biome.test.ts`'s parity test is the proof.
- **What DID move: far terrain.** Adding any far weight changes the total in
  `rollRegion`, so region identity past ~200 tiles shifts on existing saves.
  Everything inside 200 is provably untouched. This was accepted knowingly —
  building 200 tiles out is vanishingly rare, and it is the same class of change
  Phase 7a itself shipped.
- **Granite is rolled; the redwoods are sited.** Granite is country you cross —
  broad, open, rocky — so it belongs to the field. A redwood wood is somewhere
  you arrive, so it is a disc at a known ring, and it RECURS outward forever on
  its own ring and spacing (168, then every 191) the way a found place does. One
  per town would say the world runs out of woods.
- **One stand in four has giants at its heart, and it is a RATE.** Hashed off the
  instance's own site, so it is a fact about that wood. No marker, no list, no
  count, and no last one — DESIGN §Found places' rule arriving inside a region.
- **The giants are the same wood at a different size.** Identical palette, half
  the density, `trunkGirth` 2 and a 34-row crown: about 74px, four and a half
  tiles. Nothing announces the crossing; you notice by looking up. And it chops
  into the same eight wood, which is the biggest temptation in the file and is
  now a test.
- **`LANDMARK_MARGIN` did not move.** The redwood disc is nearly three times the
  blossom rows' and wants more clearance, but raising that constant re-sites
  every existing grove, cube and orchard. `onLand` took an optional margin
  instead; the default path is byte-identical.
- **Bare rock is PAINT, on a long field.** The granite's sheets (`BiomeDef.sheet`)
  recolour ground and tuft across patches ~33 tiles wide — no tile, no solidity,
  no yield. It is the scrub's twice-rejected dry patches done the way this
  codebase already knows to do it: the failure was that they were CELLS, and the
  fix is the fen's ponds' fix. Without them the region photographed as a rocky
  meadow, which is the scrub's sentence in a cooler colour.

### What the screen changed

- **Height alone did not say "giant".** At 26 crown rows a giant read as a fat
  pole with an ordinary crown on it. `crownRows` is height, so mass needed rows,
  not width — 34 of them, holding full width for fourteen.
- **The granite's turf had to go grey before the rock read as rock.** At
  `#a9aa9c`/0.8 it measured (152,163,133) on screen — greyer than the birches but
  still plainly a green field. 0.9 of a neutral target closes the red/green gap
  to about four, and the sheets sit on top of that rather than fighting it.
- **The redwood floor was olive before it was duff**, and the fix was hue rather
  than value: green is the stubborn channel, so the target went redder and the
  amount up to 0.88.

### What the tests changed

- **The disc's fade sized its RADIUS.** Grass to duff is ninety-six levels of
  green, twice any region border, so it needs twice a border's fade — and a
  20-tile approach through a 17-tile disc leaves a core of five. The wood grew to
  24 instead. `§"never steps"` measured the cliff at 14 before that.
- **A redwood is not a fly agaric host.** The whitelist in
  `render/palette.test.ts` asked, and "it is a conifer" turned out to be the
  wrong defence: coast redwood is arbuscular, not ectomycorrhizal. Cream caps.
- **The step test could not see the granite**, because it sweeps ±200 tiles and
  the granite is a far row. Its own sweep, run only where a tile is ALL granite —
  the far country's own borders measure 20 with the sheets off, which is a
  pre-existing property of extreme tints and would have swamped the measurement.
- **A wide disc cannot promise four dry rim points.** 4% of stands touch a lake
  or the sea somewhere on their edge, and a wood coming down to a shore is a good
  thing to walk into. The test asks that a stand is three-quarters dry and that
  its centre is somewhere you can stand.
- **`memoCentre` timed a suite out.** Every other landmark centre is asked once;
  this one is on `biomeAt`'s path, which runs per visible tile per frame. Two
  string allocations a tile is enough to blow a 5s budget — hence `standCache`,
  one world, an array by index.

### Same day: the long grass — and the pair that became one region

Open country, built first as TWO regions and shipped as one. The heath (all
bushes) and the prairie (all grass) each made their point cleanly and neither was
a place: somewhere real has several scales of plant in it at once. The heath row
was deleted an hour after it landed and its bushes, its waxcaps and its autumn
bloom moved into the long grass, which now has tussock, bush and tree in
descending order of how much of it there is — more scales than any other row here,
and most of why it reads as somewhere rather than as a swatch. **That correction
is the settled call**: a region with exactly one idea in it is a diagram.

- **The bushes cost nothing to draw.** `shrubs` has existed since the glimmer, and
  `drawShrub` takes its width from the region's own `crownRows` — so the scrub out
  here is a small version of the lone oak, and no new sprite was written. 0.55 is
  5.5% of cells: lumps on the horizon, still unmistakably grass.
- **It is not a wood you can farm, and the arithmetic is now a test.** The old
  far-country check compared trees, rocks and mushrooms key by key, which cannot
  see `shrubs` at all — no near row has any, so a raw comparison would have said
  the long grass is infinitely richer than home. It compares WOOD PER CELL now:
  0.11 out there against the pinewood's 1.76, forty tiles from the plaza.
- **The wind is the region.** `blow` (new) is a horizontal displacement over a
  mote's cycle — `drift`'s twin, not a bigger `sway`, which oscillates and comes
  back. One region has one, and the mote test now guards the count that matters:
  how many kits are running RIGHT NOW (four), not how many exist (six).
- **Asters in autumn, not coneflowers in summer.** Both are true of grassland; the
  autumn one is worth more, because autumn was the only season in the whole file
  with no signature — the largest crown swing in `seasons.ts` and a bare floor
  under it.
- **Adding far rows means SCALING the far column, not appending to it.** Ordinary
  rows dropped on the end would have taken the strange three from 63% of the
  plateau toward a third by arithmetic nobody chose. Dusk, glimmer and glass went
  up instead; the familiar five hold a quarter. Now in DESIGN.

**What the screen changed, again.** Every one of these was invisible in the table:

- **Grass density was the wrong knob three times running.** Single 3×5 blades at
  0.24 read as an empty field with weeds; clumping them changed nothing; 0.45
  changed nothing either. A 3×5 mark is six pixels of ink in a 256-pixel cell, so
  the eye was reading the ground because the ground was what was there. 7×6
  tussocks at 0.32 fixed it. `content/decor.test.ts` carries the over-ceiling
  exemption by name, so nobody inherits it by accident.
- **Four tussocks that differ only in which blade leans are one glyph.** They
  differ in height and width now — that is what the eye sorts on.
- **Every bush in a region was exactly the same width**, which was invisible under
  trees and was the whole picture out here: a field of identical mounds reads as
  printed. ±1 off the tile's own salt, which quietly improves the glimmer and the
  redwoods too.
- **The scrub turned bronze in October** — the month the asters are out, so the
  one time of year the place is worth walking to was the one time it looked like
  nothing. Dry-country scrub is evergreen: the crown tint holds at 0.72 and the
  GRASS goes over, which is what autumn on a plain actually looks like. The same
  mistake was made and fixed twice in an hour, once on each version of this row.
- **Old grassland is not a fly agaric host** (no birch, no pine): the whitelist
  asked, and the answer is waxcaps — orange, not scarlet, which is the exact
  distinction that test exists to force.
- **Two sweeps carry their own 20s timeout.** `biomeAt` grew a ring window when the
  stands arrived, and the proof-sized sweeps passed alone while timing out under a
  full parallel suite — a red build that goes green on a re-run, which is the worst
  kind of failure to leave lying around.

### Same day again: the cinders and the caldera

The volcano, which is not a mountain — DESIGN §Biomes has no height axis, so a
cone was never expressible. What is expressible is everything at ground level,
which turns out to be most of what a volcano is from a few feet away: black ash,
trees that died standing, molten rock you walk around, ash falling all day, and
after dark the only light for a hundred tiles.

Two rows, one new tile, one new light. `LAVA` is TileId 28, appended so no
stored id moves; no schema change anywhere.

### The settled calls (don't relitigate)

- **Nothing in the world can hurt you, and it is in DESIGN now.** There is no
  health, no stamina and no damage in the sim, and no content had ever tested
  that. Lava is solid the way deep water is solid. If a thing on the map would
  make a player careful, it is out.
- **Lava is not a material.** No obsidian, no ore, no "cooled lava" item, no node
  row. A volcano is where a far region would most like to break DESIGN §Biomes,
  and there is a test.
- **It is fillable, like any other water.** Terraforming is free and unlimited
  ("someone may fill the ocean"), and every argument for making this the one hole
  you cannot fill turned out to be an argument about danger, which this game does
  not have. Someone may shovel a caldera flat. Nobody will remark on it.
- **The cinders roll; the caldera is sited.** Burnt plain you happen into, with
  seams on the fen's pond field at the fen's own 4%; and a disc at ring 247 that
  recurs outward, bringing its own cinders, with a lake at the heart. A pool of
  lava in a birch wood is a prop; twenty tiles of ash around it is a place that
  happened.
- **`pondDepth` grew a salt argument**, defaulted to the fen's own value so that
  field is byte-identical. The fen's ponds and the lava seams are the same
  geometry and must never be the same PLACES.
- **The ring siting is one helper now.** Two regions wanted it (`RingRegion`,
  `ringCentre`, `ringSiteAt`), and the per-tile cache lives in the def — see the
  redwoods' note about what a template-string cache key did to a test suite.

### What the screen changed

- **The ash target had to be VIOLET.** Drafted at a sensible warm charcoal it
  measured (68,68,51) — olive. Grass starts at (139,191,90) and a tint is a lerp,
  so the blue channel has the least distance to travel and arrives high: anything
  aimed straight at "dark brown-grey" lands on dark green-grey. Aim at #3b2b34
  and it arrives at (66,58,56). The dusk row wrote half of this lesson down years
  ago; this is the other half.
- **A disc of radius five is a RECTANGLE.** Eleven tiles across is nowhere near
  enough cells for a circle to read as a curve. The lake is lobed now, by
  `clearingRadius`'s two-sine wobble on the bearing.
- **The lake was darkest at its centre**, because only rim cells threw a halo —
  all the light on the ash outside and none in the fire. A sixth of the interior
  now throws one too.
- **One to three cracks a tile read as orange sticks.** Three to five, with
  lengths that vary, read as fire under a crust.
- Snag gaps had to move: a gap is only legal where it is open to the outside, and
  `render/palette.test.ts` caught the first draft putting one halfway up a trunk.
  The caldera's snags are shorter than the plain's for the same test's other
  clause — two regions may not share an outline unless their colour differs — and
  the honest answer was that a snag nearer the middle has less of itself left.
- **The rocks stayed granite-grey on a burnt plain.** The stone tint cap (under
  0.5, "a tint is a direction and never a replacement") was doing its job by
  proxy — by assuming the ground a rock sits on is lighter than the rock. On ash
  it is not: at 0.46 they measured (111,103,94) against a floor of (66,58,56).
  The burnt rows go to 0.62 and the cap carries their names, because their stone
  genuinely is basalt; they stay bounded because a rock the colour of the ash is
  the same bug from the other side. They are the same cooled rock the lake has a
  lid of, so they end up the same colour as it: rock body (36,26,26), which is
  `content/tiles.ts` §LAVA's fill exactly, against ash of (67,58,54).
- **Aiming a tint AT the colour you want undershoots.** 0.92 of the crust's own
  hex came out (44,35,34) — eight levels light, because a tint is a lerp and 8%
  of a pale base is still 11 levels of pale. The target has to sit UNDER the
  colour you are after (#1b1011), which is the dusk row's old lesson applied to
  the last 8% rather than the first 60.
- **And it stops short of 1.0 on purpose.** One number pulls the stone's lit, body
  and shaded greys together, so at 1.0 all three arrive at once and a rock is a
  flat silhouette. Six levels of modelling survive at 0.92, which is what says
  "object" rather than "hole in the ground".
- **The caldera's "thicker air" made it a second kind of air**, which the mote
  guard caught. That guard now counts DISTINCT airs rather than rows, since the
  caldera's ash is the cinders' ash; and it has a clause that may never move —
  the meadow and the pines get air on a summer evening and at no other time.

## Phase 17 — the salt flats, the marshes, and the Static (4 Aug 2026)

Three regions, and each one needed a mechanism the file did not have: a crack
network, a pool lattice of its own, and a second ink. `content/biomes.ts` grew
three rows and four fields (`cracks`, `pools`, `dither`, `float`);
`sim/world.ts` grew a ring region and a generalised `pondDepth`;
`render/renderer.ts` grew a pattern fill, a crack rasteriser and a mote shape.
No schema change — biomes are still a total function of (seed, x, y), stored
nowhere.

**What they are.** The **salt flats**: white crust to the horizon, cracked into
plates about six tiles across, almost nothing growing, and the only air in the
game that goes UP. The third sparse region, and the one that is cold about it —
it sits beside the cinders and the caldera as the same amount of nothing at the
opposite temperature. The **marshes**: water with country in it rather than
country with pools in it, all of it wadeable by construction, with lily pads,
lotuses, stepping stones and a few boards laid across it by nobody in
particular. The **Static**: sited on a ring at 604 tiles, ground and trees drawn
in two inks on a 2×2 dither, crowns quantised into blocks, and air made of
pixels that jump instead of drifting — a place that is being rendered wrong, on
purpose.

### The settled calls (don't relitigate)

- **Salt and marsh are rolled; the Static is sited.** A flat and a marsh are
  country you cross, so they belong to the field. A glitch is somewhere you
  arrive, so it is a disc on its own ring recurring outward forever (604, then
  every 271) like the redwoods and the calderas — and further out than either,
  because it is the last sentence the far country has to say and wants everything
  before it to have been played first.
- **The far column was SCALED, not appended, and that is the third time.** Two
  ordinary far rows arriving at once would have taken the strange three from half
  the plateau to 44% and the familiar five from a quarter to a fifth, with nobody
  deciding to. The whole column was restated to hold DESIGN's two numbers: 6.0
  strange, 3.0 familiar, 3.0 ordinary-far, 12.0 total. There is a test on the
  SHARES now, so the next row has to do the same arithmetic.
- **What moved on live saves: far terrain, again.** Changing any far weight
  changes the total in `rollRegion`, so region identity past ~200 tiles shifts.
  Inside 200 is provably untouched (the parity test). Same knowingly-accepted
  class of change as Phase 7a and Phase 16.
- **A region may be mostly water, because depth is what makes a wall.** The
  marsh is ~40% wet and every pool in it is under `WATER_KINDS.pond.shelf` by
  construction, so all of it wades. `pondDepth` now takes a `PoolGeometry`
  (defaulted to the fen's, byte-identically) and the marsh runs its own: centres
  4 tiles apart, radii 1.1–2.3, and a `wobble` that bends the waterline off the
  circle. **The deepest water a region can grow is `max × (1 + wobble)`** and
  that PRODUCT is what the crossing promise rests on — asserted in
  `sim/water.test.ts` rather than left in a comment.
- **The old pool cap measured the wrong thing.** It capped the fraction of
  candidate CENTRES at 0.85, which means a tenth of the ground on the fen's wide
  lattice and would mean drowning on a close one. It is now stated in the units
  the rule is about — hold ground-under-water below 55% — and it binds on nothing
  that existed (fen 0.64, cinders' seams 0.43), so both are unchanged.
- **The stones and boards are PAINT.** `BiomeDef.float` is the decor kit drawn on
  the shallows. They read as a route across water that was already crossable;
  following them and ignoring them are equally valid and nothing knows which you
  did. A stepping stone that was the only way across would be a lock with a key
  made of scenery.
- **Cracks are a network ruled across the WORLD, never a per-cell mark.** A crack
  is a LINE, and a line inside every cell is the band rule's oldest trap. Jittered
  lattice points joined to their neighbours, each edge kinked at its midpoint
  (straight point-to-point segments drew a Voronoi diagram, which is what the
  lattice literally is and not what broken ground looks like), and each tile draws
  only the part that crosses it.
- **The Static's two inks are pulled from the SAME base.** The first cut tinted
  the second ink onto the first and they landed four RGB units apart — a tint is a
  lerp, so pulling an already-pulled colour toward a third lands next to where it
  started. From the season's own green they land 35 apart and 3.7 apart in
  luma: unresolvable at 2px pitch, and impossible to ignore. Both halves are now
  asserted in `render/palette.test.ts`.
- **The glitch reaches ground and flora and stops there.** Not the player, not a
  villager, not a building, not one pixel of the HUD — see DESIGN §"A place that
  is drawn wrong" for the four decisions that keep it a place rather than a bug
  report. The ground roll is quantised to four steps where a region dithers,
  which came out as visible compression blocks and is the best accident in the
  phase.
- **It has a Moment, and it is the first keyed to a PLACE.** `the_static` — the
  day you took somebody into the wrong-coloured country. `far_out` refuses to name
  a distance because a number in a line is a number to beat; a region is different
  (people name places), and one sited 604 tiles out cannot be stumbled into or
  hurried. Seven voices, and not one of them explains it.

### Found on screen, not in the suite

- **High-contrast borders were STRIPED, and had been since the cinders shipped.**
  8d's blend fades one tint into the next, which was measured against near
  regions whose greens are a few units apart. Ash and salt crust are ~150 units
  from grass, so a ten-tile fade lands 15 units a TILE — a smooth gradient
  quantised onto cells, which is a flight of hard bands. **Fixed by dithering the
  blend**: a hashed ±half-step nudge on border tiles only (`BORDER_DITHER`,
  render/renderer.ts §turf), which is this file's own habit — what cannot be
  blended gets rolled per cell. Tiles well inside a region are bit-identical.
  **This changes every border in the game**, for the better in the two
  photographs, and it is the thing in this phase most worth a second opinion.
- **A lily pad drawn as a 3×3 ring is a PLUS SIGN**, and so is a lotus. Both
  needed the kingcup's finding: a shape with a centre needs five pixels of width
  before the petals can close round it. Pads are solid discs with one wedge cut.
- **The marsh's mushrooms had to come down** from the fen's 0.1 to 0.06: they
  only come up on LAND, and two fifths of this region is water, so the same
  number lands half again as thickly on the ground you can stand on.
- **Perf is fine.** 60fps in all three regions at 1600×900 (median 16ms), against
  16ms in the meadow. The crack rasteriser is bounded by bbox rejection per tile
  and the dither patterns are cached per colour pair — which is why the ground
  roll had to be quantised where they are used.

### The second pass, same day

Two notes off a first look, both built:

- **Streams DO cross the flats** — 3.6% of salt cells are stream, plus rivers,
  lakes and sea — and ordinary river blue on a white pan reads as a strip of
  somewhere else laid across it. `BiomeDef.waterTint` is the answer, and it is a
  narrow, named exception rather than a loosening of `BIOME_GROUND`: colour only,
  the two water tiles only, blended through `regionParts` so there is no line
  across the stream. #dff2f7 at 0.45 → deep (144,188,226), shallows
  (169,216,233). Both take the same pull, so the shallows stay the paler blue and
  the wading affordance survives — asserted, because the tempting number is
  higher and what a higher one costs is invisible until somebody walks into water
  they thought they could cross. The border nudge covers the water tint too, or
  its bands would run ALONG a stream rather than across the country.
- **The Static's dither alone was "a great start" and not finished**, which was
  right: a dither is a statement about colour, and every other region makes one.
  `BiomeDef.glitch` adds the two failures that actually read as damage —
  **separation** (magenta/cyan ghosts a pixel either side of every decor mark and
  every tree crown, uneven per tree off its own hash, with about one in six
  perfectly fine so the others look wrong) and **tearing** (corrupt scanlines:
  runs of flat colour 1–3px tall on a world pixel row, holding 0.4s, in the
  ground's own second ink or one of the channels). A third of decor marks are
  also sheared per row, which is what makes a mark look corrupt rather than
  italic. Every part of it steps off the WORLD, never the cell.
- **A 1px tear is a scratch, not a slice.** The first cut drew bands one pixel
  tall and they read as damage to the SCREEN rather than as the picture arriving
  wrong. Height is the whole difference.
- **The fence held:** all of it stops at ground and flora. The player, the
  villagers, the buildings and the HUD are untouched, which is what keeps this a
  place rather than a fault report.

### The third pass: the flats do not fade

**Asked for, and right:** a salt pan's edge is a shoreline, so `BiomeDef.hardEdge`
lets a region refuse the blend. `render/palette.ts` §`sharpenRegions` resolves it
before the shares are blended — all or nothing, decided by which share is
heaviest, because the heaviest share is the nearest site and therefore the same
answer `biomeAt` gives. A weight threshold instead would put holes at triple
points, where the nearest of nine sites can be nearest and still hold well under
half.

- **RENDER PATH ONLY, and that is the whole reason it lives in the palette rather
  than in `regionParts`.** Those weights are also what a cell rolls its trees and
  rocks from (`scatterRegion`) — that is generation, it moves solidity, and it
  would want the thousand-seed test re-run. It is also the better picture: the
  ground snaps while the flora still thins over the approach, which is what a
  pan edge actually looks like. The pan's own slabs scattering a few tiles into
  the turf reads as a strandline for free.
- **The water still fades**, blended off the RAW shares. A stream carries the pan
  downstream; the crust does not flow. Snapped, a stream changed colour
  mid-current on the tile the border crossed it, which reads as a bug in the
  water rather than an edge of the land.
- **The cracks, the decor and the air are sharpened too**, or the fade would come
  back in a speckled costume — plates dithering a few tiles out past the edge of
  the plate field.
- **`sim/biome.test.ts` now asserts the edge EXISTS** ("DOES step at the salt
  flats"), the inverse of the no-steps sweep beside it, so a later pass that
  blends everything fails and has to come and read why. The near sweep cannot
  reach a salt flat anyway — far rows are impossible inside 200 tiles — so no
  exception had to be carved into it.

### The fourth pass: the cinders end in tongues

The fray held in reserve for the flats turned out to be the right treatment for
the **burn** instead, which is a better observation than the one it came from: a
pan's edge is a shoreline and wants to be straight-ish, and a fire's edge is
neither straight nor faded. `BiomeDef.hardEdge` became `edge: "hard" | "fray"`,
and the cinders and the caldera take the second.

- **`fray` is the same all-or-nothing answer with a field added to the weight
  before it is decided.** `FRAY_PERIOD` 5 tiles, `FRAY_AMOUNT` 0.35 — and since a
  border's weight climbs about a tenth per tile, that walks the line three or four
  tiles in and out along its length. The line stays hard everywhere; it stops
  being straight.
- **A field, not a hash**, for the reason everything in this project is: a
  per-cell roll across a ten-tile transition is a dithered gradient, visibly a
  machine easing between two colours. Lobes are what a fire front leaves.
- **It retires the worst banding in the game.** Ash is 150 RGB units from grass,
  so the ordinary fade landed fifteen units a tile and photographed as stripes —
  the thing `BORDER_DITHER` was built to dissolve two passes ago. There is no
  gradient at a cinder border to band now. (The dither stays: every other
  high-contrast pair still fades.)
- **The unburnt trees are free and are the best part.** Flora still dithers across
  (that is generation, deliberately untouched), so live trees stand inside the
  margin of the burn and dead snags stand outside it. Photographed at the border
  on seed 3.
- **`biome.test.ts` asserts the wander**, not just the step: parallel lines out of
  the same burn must cross at different distances, which is what fails if somebody
  sets the amount to zero or swaps the field for a constant — an edit every other
  assertion would sail past.

### The fifth pass: rock does not get greener

Asked what the granite's edges were doing, and the photograph answered: a sheet of
bare rock running up to the border came out as **ten tiles of sage** — the rock's
grey mixed with the neighbour's green, which is neither rock nor turf and is a
colour this world does not otherwise contain. Rock is not a surface that shades
off; it is a thing, and soil either covers it or does not.

`edge: "outcrop"` is the third treatment, and the only one that is about a SHARE
of a region rather than the region:

- **The sheet stops being diluted and starts being rarer.** Each outcrop keeps its
  own colour; the field has to be stronger to put one down the further out the
  region's share falls (`OUTCROP_FLOOR` 0.32, `OUTCROP_RETREAT` 0.62), so the
  margin comes out as rock still poking through turf past where the rock country
  stops, thinning to the last one.
- **The sheet's strength is recovered by division, not re-sampled.** The bare
  share was split off as `region weight × field`, so dividing it back out gives
  the field undiluted — which is the number the decision has to be made on, since
  the diluted one falls simply because you are near a border, which is not a thing
  rock does. `RegionPart.bare` marks the share; nothing in generation reads it
  (`scatterRegion` walks `id`, and both shares answer the same).
- **Inside the region, nothing changed.** A sheet's own soft window is deliberate
  — turf to bare rock is a bigger colour change than most borders make, and a
  narrow window is a cliff in the middle of the country — and the existing
  no-steps sweep still guards it.
- **The test asserts the absence of the middle**: in the border zone a tile is
  rock or it is not, and nothing may land between. Measured 116 rock tiles with
  everything else 50+ away and the band from 10 to 45 empty. It also asserts the
  rock is still THERE, since a treatment that deleted every sheet near a border
  would pass the first half.

### Loose ends

- **The marsh coastline is blocky**, and inherently so: any waterline quantised
  onto 16px cells staircases, and this region is made almost entirely of
  waterline. The wobble helps. If it still reads as blue boxes on a second look,
  the knobs are `pools.cell` (finer lattice), `pools.wobble` and `water`.
- **The flats' heat shimmer is subtle by daylight** — pale specks on pale ground.
  It reads in motion and in the night shot. Worth a look before turning it up:
  the alternative is dust motes over a desert, which is a different place.
- **Nobody in town has a line about the flats or the marshes.** The Notebook has
  a field note for each (which is where every other region is named), and the
  Static has the Moment. A companion Moment for the other two would need a reason
  to be there beyond "the region exists".

## The look pass (5 Aug 2026, in progress)

Eighteen regions exist and the machinery is built, so the work turns to how they
actually look — judged as a SET on `/biomes.html`, which is the only instrument
that can answer a relative question ("is the scrub flat *compared to what*").

**THE NEAR COLUMN IS OPEN FOR THIS PASS, BY DECISION.** The rule was that near
rows get paint only — meadow, pines, birches, scrub and fen generate ground people
have built on, so a density change there can put a bush inside a finished house.
That constraint is about OTHER PEOPLE'S saves, and there are none: the game has
one player with two save files, and the call is that a bush in a house is a
smaller cost than five regions that cannot be improved. **Recorded as a decision
rather than a discovery** — the arithmetic that made it a rule has not changed, so
if this ever ships to anyone else the near column freezes again and anything moved
under this heading has to be reviewed.

Paint is still preferred where it does the job, because paint cannot break
anything: tints, `tufts`, `stone`, `decor`, `bloom`, `sheet` and `crownRows` are
render-path or scatter-free.

**Read of the set, in order of how badly each wants work:**

1. ~~**The scrub**~~ **done.** One flat olive from corner to corner — the one
   region that read as unfinished rather than as parched. It now has bald patches
   (`sheet`, the region's own twice-rejected idea, finally built the way the
   granite taught: a long field, never a cell), a thorn bush in its decor, and —
   once the near column opened — **actual scrub**: `shrubs: 1`, a tenth of cells,
   which is the thing a region named for its bushes had never had. Its foliage tint
   went from 0.35 to 0.6 at the same time, because a tint that was invisible on one
   tree a screen is the whole picture on fifteen bushes. Rock compensated to 5.3:
   undergrowth rolls before the scatter and took 3% of the stones with it.
2. ~~**The long grass**~~ **done.** Swathes — the same `sheet` machinery at a
   tenth of the strength, going to more grass rather than to less. A plain has no
   features, so what it has instead is bands of seed-head and bands of leaf; at
   fifteen units of green they were invisible outside a side-by-side and at forty
   they read as two kinds of ground, so they sit at about twenty-five, on a
   wavelength longer than a screen and a half.

   *(Three regions now use `sheet` — bald ground, swathes, bare rock. A fourth
   should have to argue: it is the only tool for large-scale ground variation, and
   a tool that answers every question stops being an answer.)*

   **And a sheet now thins what grows on it** (`sheet.bare`), because bald ground
   with a bush on it is not bald — it is a stain. This is the one place paint
   reaches generation: the same field, sampled by the same call, in a generator
   that already samples three others. It moves SOLIDITY, which is only affordable
   because the near column is open for this pass. Scrub 0.2, granite 0.35 (the
   rock keeps enough trees for the lone-pine-on-a-dome picture the row is for),
   long grass unset — its swathes are more grass, not less. **Stones are
   deliberately exempt**: rock on bare dirt is desert pavement, and thinning both
   would leave a smooth empty patch, which is a hole in the ground rather than a
   place in it.
3. **The granite.** The sheets are the row's whole point and a swatch of it can
   come up with none in frame; its stone list is two shapes on purpose, which
   leaves the ground doing all the work alone.
4. **The fen.** Not flat — busy. The mushroom count crowds the frame at swatch
   scale, and its green sits very near the meadow's.
5. **The marshes.** The water is one flat blue; the islands are plain.
6. **The redwoods.** The crowns read as noisy dark blobs over rust at this size.

### ~~The meadow~~ **done**, and it was not on the list above

It should have been. The read of the set skipped it because the meadow's
emptiness was a settled decision rather than an oversight — 8k gave the town's
own region no decor on purpose, so that leaving town is when the ground starts
having things in it, and 8j kept the bloom out on the same argument. What that
missed is **where the bill was being sent**. `meadow` is `near: 2` and `far: 0.88`,
the commonest single region in the world at both ends of the field, so the town's
calm was being paid for four hundred tiles from any town — and the one region in
the game named for flowers had never had a flower in it. Photographed at 120 tiles
out and again at the plateau, it was the plainest screen in the game both times:
one flat green, one tree silhouette, three rocks, nothing else. It was also the
only row in `biomes.ts` with no `decor` at all.

**The rule moved to the town, where it always belonged.** `BiomeDef.mown` and
`sim/world.ts` §townMown: ground furniture fades in over a twelve-tile ramp past a
wobbly radius at 20–25 tiles, so the grass between the houses is exactly the grass
it has always been and the country is not paying for it. The old sentence is now
true as written rather than by making a region poor.

**The settled calls (don't relitigate):**

- **`mown` is a flag on the region, not a radius in the renderer.** The rule is
  about the town and the answer is a distance, but WHICH regions submit to it is a
  fact about the region — and it is not "whatever is near the plaza". A
  forest-edge town's pines start at 24 tiles and keep every fern; the town mows
  its own grass and does not go into the wood to tidy up.
- **A ramp, not a radius.** Twelve tiles is most of a screen, so the flowers
  thicken as you walk out and there is no step. Scaling the DENSITY, not the
  mark's alpha: half-drawn flowers in a ring round the town read as a rendering
  fault, where fewer flowers read as a lawn.
- **Buttercups, gold, in spring.** The four other familiar regions all flower in
  spring and the meadow did not. The birches own white-with-a-gold-eye, the long
  grass owns purple-with-a-gold-eye and the scrub owns a magenta head, so both a
  colour and a silhouette were free — and a field of buttercups is the picture the
  word makes. Drawn as a FILLED head with a paler core: the first cut outlined the
  cup and at three pixels an outlined bowl is two yellow specks with a gap, which
  came out as small insects all over the swatch.
- **Leaves have mass; blades are strokes.** The first year-round kit was four
  single-pixel strokes in the tuft's own ink, and on screen the meadow simply had
  more tufts in it. Blocked rather than outlined is what made it a second layer
  instead of a denser first one.
- **Two marks, not four, and the clover is corner-to-corner 2x2 leaflets.** Four
  unrelated glyphs on one lawn — a cross, an upside-down T, a Y and a trefoil —
  read as a seed catalogue; one plant at two ages reads as a patch of it. Six
  clover arrangements were drawn and photographed **one at a time, with the kit's
  density temporarily at 0.95**, which is the technique this whole pass should
  have started with: at 0.14 you hunt for your own mark in a screenshot instead of
  looking at it. The findings, so nobody redraws them:
  - a **stem** is what makes a trefoil read as a **Y** — and a clover seen from
    above has its stalk underneath it anyway, where you cannot see it;
  - a 3-wide top leaflet meeting the other two **edge to edge** merges into one
    mass with a notch: a heart, not three leaves;
  - a **one-pixel waist** between them reads as a stalk, so it comes out as one
    leaf held over two;
  - **3x3 leaflets do not buy shape, they buy mass** — clefted they read as a
    small frog, rounded as a bush. Scale is a real limit here and going bigger is
    the wrong direction.
  - **The leaflets cannot be lit.** A pale pixel per leaflet does turn a square
    into a rounded leaf — but the second ink is `accent`, which is fixed against
    the season by contract (a white flower is white in October), so autumn came
    out as a rust leaf with a bright green speck on it. It reads as damage. The
    highlight would need `x`'s seasonal ink, and giving `o` that breaks every
    flower in the file.
- **Mushrooms 0 → 0.02, and it is the only number this touched in the generator.**
  Field mushrooms, so the row needs a `mushroomCap` (the default red is a fly
  agaric and this region's tree is the ordinary broadleaf). It is the one region
  in the world where there was nothing at all to find.
- **The green did not move.** `ground` and `tuft` stay at amount 0. That colour is
  the game's signature and every other region is a departure from it; the
  complaint was emptiness, not hue.
- **Fireflies are not mown.** Nobody tidies the air, and the fireflies over the
  plaza are the point of them.
- **`bloom` takes a list, one kit per season** — and the rule it replaced survives
  intact. The slot's doc said "two slots rather than a list, because a list would
  invite a third and a fourth, and the ground has room for about two kinds of
  small thing before it stops reading as ground", and that argument is about how
  much is underfoot AT ONCE. Blooms in different months never coexist, so on any
  given day it is still what is always here plus what is here now. The letter
  changed, the reason did not, and `content/decor.test.ts` now enforces the reason
  directly by rejecting two blooms that share a season. What asked for it was a
  dandelion: it is a yellow flower and then it is a clock, which is one plant
  needing two months of its own.

  The meadow now has a flower in **every growing month**. Spring: buttercups and
  dandelions. Summer: dandelion clocks and white clover. Autumn: black-eyed
  susans — the month the region had nothing to say, which is the same complaint
  the long grass's asters were written to fix one region away and was just as
  true here.

  **The kingcup's silhouette three times, deliberately.** Five wide with the
  corners off is this file's answer to "petals all the way round a centre"; the
  fen's marsh marigold established it, the dandelion borrows it in a deeper gold,
  and the rudbeckia borrows it again with a near-black middle. A rudbeckia is
  that shape in life, and the middle is the whole name of the plant.

  **Two inks, two flowers, and each uses BOTH.** The obvious reading of a kit's
  two-colour budget is one ink per flower, which is what this was: a bright gold
  buttercup and a deep gold dandelion, both solid, both reading as a decal rather
  than a thing with a middle. They swap ROLES instead — the buttercup is bright
  with a deep eye, the dandelion deep with a bright one. Same two inks, four uses,
  and the two flowers end up further apart than when they were flat: an inversion
  is a much louder difference than a shade, and it survives at one pixel where a
  third gold would not have been distinguishable from either of the first two. It
  is also the honest way round — a buttercup's stamens are deeper than its petals,
  and a dandelion catches the light in the middle where the florets stand up.

  **Corners come off anything three wide.** The buttercup drawn as a solid 3x2
  block was a yellow square with a stalk under it, which is the fen's own warning
  about this size — "the shape reads as a TILE before it reads as a flower". Two
  pixels bought the whole difference.

  Also found on screen: the clock is drawn as HOLES (solid pale is a mushroom cap,
  a ring is a flower, a checker is the only thing that reads as fluff at five
  pixels); the clover head's PINK is what separates it from the field mushroom,
  not its width — see below; and two marks were cut, a
  closed buttercup bud and a half-blown clock, both of which read as plain bars.
  The marks strip on `/biomes.html` is what showed all three.

  **The clover head is a 3x3 square with one pink pixel, and the square is the
  point.** It is the only flower here that is not rounded — the buttercup had its
  corners taken off because a solid block of gold reads as a tile, and the kingcup
  silhouette exists to round a head without drawing one. A clover is the exception
  by the plant's own fault: it is not petals arranged around a centre, it is a
  dense GLOBE of florets, and a globe at this size is a block. Round it and it
  becomes one of the daisies.

  **Where the one pink pixel goes was drawn seven ways.** The older florets at the
  base go pink, so it belongs at the bottom — which is exactly where a mushroom
  keeps its gills, and this region grows one. What saves it is that a gill row is
  WIDE: three pink across the foot of a head is a cap, one pixel centred on the
  stem is the join. The rest, so nobody redraws them: a pink pair down the middle
  is a button; pink at both ends of the middle row is two eyes; the top corners
  plus the middle bottom is the same face with a chin; no pink at all is a white
  square on a post, which is a sign.

  **And the lesson from the detour**: when two marks collide, find which FEATURE
  is colliding before resizing either of them. The head was narrowed from four
  wide to three on the theory that width was the problem — it was the pink's ROW —
  and a silhouette test that changes two variables at once proves nothing. It cost
  a good mark for two commits.

  **And the tree stopped being a pill.** The broadleaf was twenty-four rows by
  fifteen across with a dead-straight fourteen-row column down the middle — taller
  than wide, parallel-sided. Nothing standing in a field looks like that. It is
  seventeen by fifteen now, widest from a third down to three quarters, with a
  long taper at each end: an oak in the open, which is what the region is full of.

  **It went to fourteen rows first and came out as a CAKE POP** — shortening the
  crown while leaving the trunk at sixteen put the canopy at 47% of the tree, and
  a ball on a stick is what that reads as. The reference oaks are nearer three
  quarters crown. The lesson: the old shape's fault was its PARALLEL SIDES, not
  its height, and cutting height to fix a profile problem overshot. A dome that
  tapers at both ends is a different object from a column with a cap on it however
  tall either one is.

  **The width could not move, which is why the height did.** Two rules in
  `render/palette.test.ts` fence the crown in from both sides and both are worth
  keeping — no crown may exceed 8 half-widths, because past one tile a stand
  smears into itself; and the blossom rows must stay the widest, because overfull
  is the whole of what that region is. The blossom is 8, so the broadleaf is 7 and
  always was. Drawing it wider was never available. Drawing it SHORTER was, and
  nobody had tried.

  It reaches the grove and the dusk too, deliberately: the grove's trees are this
  silhouette in the dark wood, and the dusk's whole idea is a wood where the
  shapes are the ones you know. No `crownOverlap` and no `trunkHeight`, so all
  three keep drawing the same tree — the crown skirting down over the trunk reads
  as a maple whose canopy touches the ground, and on top of it as an oak you can
  see the legs of, and the grove has no biome row to put a field in anyway.

  **The lit side had to follow.** Every lit row ran from the crown's left edge to
  the trunk's own column, so the terminator was a straight vertical seam down the
  middle and the crown read as two flat halves. On a fifteen-pixel capsule that is
  a detail; the moment the shape became a dome it was the whole tree. The lit run
  now gives up three quarters of its width as it descends, so the boundary walks
  outward and follows the surface. **It reaches every tree in the game** — checked
  across the whole set on `/biomes.html`, and it improves all of them.

### The straight-edge sweep — what else was drawing a curve with a ruler

The soft lit side landed well enough to be worth asking what else had the same
signature: **a round thing whose shading is an axis-aligned rectangle.** Four
candidates, checked rather than guessed.

1. **The shrub — same bug, same fix, and worse.** `drawShrub`'s lit rows ran from
   the crown's left edge to the trunk's own column, exactly as the tree's did. A
   crown lights about a third of its rows; a bush lights four of seven, so the
   flat left half was a bigger share of the object than it ever was of a tree.
   Fixed with the same pull-back.
2. **Contact shadows — every one of them is a hard rectangle**, all eight, at one
   alpha. `footShadow` now tapers the near row by two pixels either side for the
   three ROUND things (tree, bush, stone) and leaves the rest alone on purpose: a
   wall, a chest and a plinth have square feet and should cast square shadows.
   **Honest verdict: minor.** It is strictly more correct and nearly invisible at
   game scale; it is in because it is cheap, not because it changed the picture.
3. **Rocks are drawn even-width** — `rows[r] * 2`, so a stone is centred on the
   SEAM at cx-0.5 where a tree and a bush are centred on the column. That is the
   same arithmetic that made every tree lean half a pixel left. **Not fixed, and
   deliberately**: the rock's body, foot, contact shadow and lit rows are all even
   and all agree, so the whole stone is coherently half a pixel left of its tile
   rather than disagreeing with itself the way the trunk and crown did. Left
   alone, recorded here so the next person does not have to re-derive it.

   > **AND THE SWEEP MISSED THE ROCK'S ACTUAL HIGHLIGHT** (6 Aug 2026). It asked
   > "what else is a round thing whose shading is an axis-aligned rectangle",
   > examined this stone's geometry — even widths, contact shadow — and never
   > looked at its lit rows, which were the exact fault being swept for. Every one
   > began at `cx - rows[r] + 1` and ran `rows[r] - 2` wide, so its right edge
   > landed on `cx - 2` on **every row whatever that row's width**: a straight
   > vertical seam down the middle of a round object. The LEFT edge follows the
   > silhouette, which is why it survived three passes — half of it was always
   > right. Now pulls back as it descends, the same as the tree and the bush, at a
   > pixel a row on shapes this size. **Found by somebody looking at a screenshot,
   > two months after the sweep that was looking for it.**

4. **The ground is contour-banded, and it is structural.** `rolled` samples a
   smooth field once per TILE and rounds to 8 bits, so the largest colour mass on
   screen is a mosaic of flat 16x16 plateaus whose edges land exactly on the cell
   grid — which is what `groundTone`'s own doc claims cannot happen ("its edges
   can never line up with a cell"). Measured by mapping the shade of every tile on
   screen: large contiguous plateaus, tile-aligned boundaries, neighbouring shades
   1-3 units apart out of 255. **Real, at the threshold of visibility, and SETTLED
   AS LEFT ALONE.** The fix would be to dither each cell between its two nearest
   shades — the machinery exists (`ditherFill`, built for the Static) — and it
   would put a pattern on every ground tile in the game. Asked and answered: the
   banding has never been noticed in play, and a dither on every tile "sounds
   distracting", which is the right instinct — it trades a contour nobody sees for
   a texture everybody does. **Do not relitigate without new evidence**, and the
   evidence that counts is somebody SEEING the bands, not somebody rediscovering
   the arithmetic.

**Still open:** winter, which has no kit and no honest flower — seed heads and
  dead stems are the candidate, and they would be the first `bloom` that is not
  a bloom. And an aster, which the long grass already owns (purple with a gold
  eye); a second one here would be the same plant twice.

Two tests changed sides rather than being deleted, which is the useful part:
"the meadow has no decor" asserted a field was empty, and its replacement sweeps
the town on two hundred seeds for a mushroom that should not be there and a band
at 120 tiles for ones that should. The rule is now checked where it is felt.

### Blueberries in the pines (6 Aug 2026)

`shrubs: 0.4` on the pinewood — the first **near** region with undergrowth,
which until now was the glimmer's and the heath's — plus a new `BiomeDef.berries`
field that paints fruit on the bush sprite for one season.

**The plant was chosen by reading the row's own comment back.** The pines' spring
bloom is lupine, justified there as "acid, sandy, half-shaded ground", which is a
pine barren; lowbush blueberry is the other half of that community, growing
through the same scrub. So the region gains a **summer signature it did not have**
— it had fireflies, which every region with motes has — without a second fact
being invented to hang it on.

**The design call: paint on a gathered node, and you cannot pick it.** A berried
bush chops for the same two wood a bare one does, in the same swing, in all four
seasons. That keeps the season reaching appearance and never a number
(DESIGN §Materials) while sitting on top of a node that yields — which is new
here, and is the version that survived two worse ones. Drawn as ground decor it
would have put berries on the grass *beside* the bushes: two layers claiming one
plant. Made gatherable it would have turned a region into a reason to walk
somewhere for a material, which the `shrubs` doc forbids one field above.
**Expect to be asked why ACT does nothing** — the glimmer's orbs took the same
question and answered it by not looking pickable, which a berry cannot do.

**The ink is the bloom on the skin, not the fruit under it.** Near-black is what a
blueberry looks like in the hand and a smudge on a `#23402c` crown; dusty pale
blue is what a patch looks like at arm's length and is the legible pixel. It is
the only blue accent in `biomes.ts`, so nothing else had to move.

**`spots` is drawn, not rolled — the glimmer orbs' finding, in a smaller mark.**
The first cut scattered one berry per row off its own hash. It spreads perfectly
well *on average* and it **clustered**: two rows that agree within a pixel draw
one two-pixel object, and a bush wore a nut instead of fruit. The table is now
three authored arrangements of five, rows 2–8 of nine (fruit hangs *under* the
leaves; berries over the whole dome read as blossom or as first snow), and the
hash picks only which one a bush wears.

**Five, and it shipped at three for an afternoon.** Three berries on a nine-row
dome read as the ones somebody else left behind — a bush in fruit should look
worth stopping at. Five is close to the ceiling: a dome three half-widths across
has room for five spaced marks and not many more, and going up cost one row of
headroom at the top (2, where three could start at 3). The check that made the
change safe rather than a re-eyeballing is the spacing test below — it failed one
draft of the third arrangement outright, on the narrow bush only. **More than one arrangement, unlike the
orbs' single table** — `chance` leaves most trees unlit, where every bush in a
barren fruits, so a lone composition would read as printed.

`shrubPeak`/`shrubRows` came out of `drawShrub` to file scope so
`palette.test.ts` can walk every arrangement against every width the sprite makes
(the peak rolls ±1) and prove no two berries ever touch. **The clamp that keeps a
berry inside a narrow row is exactly what can shove two together**, and the
narrowest bush is the one the table was not drawn against.

**One test changed sides.** `biome.test.ts`'s "the meadow grows no shrubs" asked
`biomeAt`; flora rolls off `scatterRegion`, the *dithered* region, so at a border
a cell paints as meadow and grows as pines. That is how a pine has stood a tile
inside the grass since the treeline existed — this is only the first time the
dither could put a **bush** there. The town's own ground is protected a layer
down by `scatterRegion`'s `HOME_REGION_REACH` guard, which returns the hard
region and never dithers, so the live-save promise is where it always was.

**Live saves grow bushes in pinewood they have not visited yet**, the same churn
the scrub had when its bushes arrived. No schema change — terrain is still a
total function of (seed, x, y).

### The pines get a skirt, and stop ending in a slab (6 Aug 2026)

Same session, same region, one row of the table: `crownRows` rewritten,
`crownOverlap: 6`, `trunkHeight: 12`.

**The bottom third of the commonest tree in the game was a rectangle.** The old
silhouette climbed in shelves to 7 half-widths at row 20 of 28 and then drew 7
eight more times, so it read as a nice conifer with a parallel-sided slab under
it and a ruled line across the base. **This is `BROADLEAF`'s pill in a conifer's
clothes** and it has the same cause: the shape ran out of ideas before it ran out
of rows, and the width cap (7 — a pine may not be wider than a meadow tree, which
`palette.test.ts` asserts) turned into a flat spot rather than into a taper.

Now ten shelves of three run the whole way down, each stepping back a pixel and
coming out further than the last, reaching 7 only near the bottom. **Nothing is
wider than it was.** The widening is spread over the whole tree instead of being
spent in the first two thirds.

**A crown of symmetric rows always ends on a horizontal edge, so the question is
how wide.** Ending at the widest row draws a fifteen-pixel line under the tree
and no amount of shelving above it stops that reading as a slab. A fir's lowest
whorl doesn't end flat either — the branch tips angle down and the outline comes
back toward the ground. Three closing rows (7, 5, 3) end the tree on a
seven-pixel edge.

**The skirt shipped as a no-op first, which is the useful part.** `crownOverlap:
5` with `trunkHeight: 15` — the trunk raised by exactly what the skirt took —
photographed as *no change at all*. What you see is `trunkHeight - overlap`, and
that arithmetic pinned it at the ten it always was. **The visible stem is the
number to aim at**, not the overlap: six pixels of it under a thirty-three-row
crown, where it was ten under twenty-eight. The tree still stands the same height
(the renderer takes it from `trunkHeight + rows - overlap`), so occlusion and the
treeline are unchanged.

Ecology, for the record: bare-poled pines are plantation trees that have been
brushed out, or old ones that have lost their bottom whorls. Plenty of pines and
every spruce carry branches most of the way down.

### A region may draw two trees (6 Aug 2026)

`BiomeDef.crownAlt`, and the pines are the first pair. **The tree was the last
repeated mark in the game drawn from a single table** — `ROCK_SHAPES` has three,
a `DecorKit` must have more than one mark, `bark.marks` more than one grid,
`tufts` is a list, and each of those is a list because one repeated glyph reads
as printed. The tree is the largest repeated sprite on screen, so it was paying
most for being the exception.

**Two, and the same species twice — this is the settled call, don't relitigate
it upward.** The silhouette is how a region says which region it is; two
unrelated outlines in one stand and the place stops reading as anywhere. What
varies is what varies in a real even-aged stand: how much skirt a tree kept, how
much bare pole it has, where the crown sits on the stem. Three-plus was
considered and dropped — 18 regions × 3 is 54 hand-drawn tables that all have to
stay distinguishable from each other, for a gain nobody would see.

**The pines' pair is skirted vs self-pruned.** A conifer in a closed stand loses
its lower whorls to the shade of the tree above it, which is why a plantation is
a hall of bare poles and why a real wood is neither all skirt nor all pole. Form
one keeps its branches (overlap 6, six pixels of visible stem); form two lost the
bottom of its crown (overlap 4 on a taller stem, twelve visible). **Both stand
the same height** — 16 + 27 − 4 against 12 + 33 − 6 — so the canopy is level and
the difference is entirely where the foliage sits. A shorter second form read as
a sapling: a different age rather than a different history, and the wood looked
patchy instead of mixed.

**Twelve, and it shipped at twenty for one look.** Drawn with no overlap on a
twenty-pixel stem, form two had more than three times the bare pole form one
does, and on screen that is not one species with a history — it is a pole
standing next to a bush. **The target is narrower than either half of it
sounds**: the pair has to be tellable apart *and* obviously the same plant.
Double the visible stem, not triple. This is the number to reach for when the
other regions get their pairs — `trunkHeight - overlap`, the same figure the
skirt's own note says to aim at, with the crown grown to keep the height.

**Shape kept as a record, not a bare array.** `crownGaps`, `crownOverlap` and
`trunkHeight` describe the same tree `crownRows` does, so forms sharing one
region-wide overlap would be forced to agree about the very thing that
distinguishes them. `treeForms(def)` is the only reader that knows the row's own
four fields are form zero — same accessor shape as `bloomsOf`, and it is what
keeps every region that didn't ask bit-identical.

**Two knock-ons, both settled:** `drawShrub` takes the WIDEST form (a bush is a
bush; the thing that varies between forms is stem, which a shrub hasn't got), and
per-tree height already derives from the rows, so occlusion and the treeline stay
honest for free.

**The meadow was excluded, and the test said so out loud.** Its tree is the town's
tree and the view from the plaza is the thing biomes promised not to change, so a
second meadow form is its own decision, made while looking at the plaza — not
swept in with whatever region was being worked on. `palette.test.ts` asserted
`meadow.crownAlt` is undefined until that decision was actually taken; see §The
meadow's second tree (6 Aug 2026), which took it. Form zero — the tree the game
always drew — is what the line was defending, and it is still asserted.

Tests run over every form now, not the primary: widths, gap legality, the 8
half-width overhang cap, the conifer/broadleaf rule. Two new ones — a region's
forms must differ from each other (a list that draws the same tree twice is the
one failure counting can't catch), and their girth must be within a pixel, which
is what "same species" means at this size.

### The needles were green (6 Aug 2026)

The pinewood's ground kit drew "a fallen needle" in `x` — the region's **tuft**
ink, the same green as the grass speckle — three pixels long on the diagonal, at
0.09. So the mark was a living blade's colour, longer than the tufts around it,
and scattered thinly enough to read as sticks somebody dropped. **A fallen needle
is not green; that is the whole difference between a needle and a leaf still on
the tree**, and the ink was where it had to be said.

Now `o` at `accent: #8a7452` — pine straw, which correctly does *not* travel with
the season (`DecorKit.accent`): needle litter is the one ground cover that looks
the same in February as in July, because it is already dead when it lands.
Checked in October, where the turf browns toward it and the marks go quieter
without going invisible, which is what litter should do.

**Two pixels, then two pixels twice.** Shortening the stroke was right — a needle
is centimetres against a tile's metre — but a lone 2px mark at 0.15 read as
scattered confetti, and **the fix was not simply more of them**: thirty evenly
spread dots and sixty evenly spread dots are the same picture at different
volumes. Needles fall in drifts, so half the marks are now a PAIR of strokes and
a marked cell reads as a patch of litter rather than as one needle. 0.2, over the
fen's 0.16, under the long grass's 0.32.

The fern stays in `x`, and that is the kit saying something: it is the living
thing on this floor, where everything around it fell out of the canopy and died.

### The stump was a rock (6 Aug 2026)

`DEADWOOD_ART.stump` ended `..ddddd..` — two pixels narrower each side than the
body above it. A rounded bottom, in weathered grey, at rock size, standing in a
wood **next to actual rocks**. It read as one.

**The rule that caused it is still right; it was being applied one edge too far.**
The deadwood docblock said "nothing in either shape is square", because a flat end
on a piece of wood reads as SAWN, and sawn wood is wood somebody cut — which is
wood you would expect to be able to pick up, and these are the only standing
things in the game you cannot gather. True of every *cut* end. The stump's base
is not one: it is where the trunk goes into the ground, and the tree standing
beside it draws exactly that as a flat-bottomed rect. **The ground is not a saw.**
The docblock now says "no cut end is square", which is what it always meant.

Top still rounded (it is a torn cut face seen at this game's angle), sides now run
straight down onto a flat base.

**A root collar was tried first and photographed as a brim** — base row a pixel
wider each side, on the theory that a flare says "grown into the ground". The
darkest row in the sprite, overhanging the sides, under a lighter top, is a hat.
At nine pixels across there is no room for a flare to read as anything subtler,
so the sides just run straight, which is what was being copied from the trunk in
the first place.

**And then two more details came off, both of which this file had arguments
for.** The stump is nine pixels wide; every argument for putting something on it
was made about a stump seen closer than the game ever shows one.

- **The left flare** — three pixels standing proud of the body, there so the shape
  did not read as turned on a lathe. At this size it reads as a chip out of the
  side, or as something standing behind. A bollard is the better risk.
- **The moss**, two green pixels on the shoulders. They sat on the silhouette's
  own edge, which is where the eye reads a shape at all.

**The moss one is a real trade, not a free cut.** Moss was doing the affordance
work for the only two standing things in the game you cannot gather: wood with
moss on it is wood nobody tries to pick up. The test that asserted it now aims at
the LOG alone — four times the sprite, wearing its moss in the middle of the top
face where it costs no outline — and says in the file why the stump is exempt. If
stumps ever start reading as gatherable, this is the paragraph to come back to.

What is left is one object: a cut face, straight sides, a flat base.

### Two lupines were one lupine (6 Aug 2026)

The pinewood's bloom kit carried its spike **twice, character for character**. It
passed "has more than one mark" by counting and satisfied nothing that rule is
for — two identical marks is one mark, and one glyph scattered perfectly randomly
is exactly the printed repeat the list exists to break.

**It is invisible everywhere you would look for it.** In a diff two identical
lines read as a pair; in a swatch a region with one flower looks like a region
with one flower; `/biomes.html` draws both chips happily. It was found by
somebody reading the contact sheet and asking why there were two lupines.
`decor.test.ts` now asserts no kit repeats a mark — one duplicate in the whole
file, and this was it.

The second mark is now the same plant **younger**: a shorter spike, one open bell
under its two newest buds. Same argument the meadow's clover kit records — one
plant at two ages reads as a patch of it, where two unrelated glyphs read as a
seed catalogue.

### Lily of the valley, and the lupine moves to summer (6 Aug 2026)

The pines now flower in two months, which is the most this region can have:
`bloom` is a list, and the rule on it is **one kit per season** — at any moment
the ground carries what is always here and what is here now, which is two kinds
of small thing and not three. So a new flower had to take a month, not share one.

**The lupine gave up spring, and that is a correction rather than a shuffle.**
The argument written in that slot — *the flowers that bloom under conifers do it
in the weeks before the canopy closes* — is an argument about deep shade, and it
was being made on behalf of a plant that wants the opposite: *Lupinus perennis*
is a pine-barren plant of open sandy half-shade, and in a barren it is a June
flower. Spring went to the plant the argument was actually about. *Convallaria
majalis* flowers in May in the shade of exactly this wood and is finished about
when the canopy finishes closing over it.

**A stalk with bells down ONE side, and the one-sidedness is the species.** Every
other flower in the file is symmetrical about its stem — a head, a V of buds, a
spike of paired dots — so flowers hanging off the left is a silhouette nothing
here can be confused with. A pixel of stem between every bell: bells on
consecutive rows merge into a bar down the side of the stalk, which is a leaf.
Both hands among the marks, or a colony all facing one way reads as printed.

**And a starflower shares the kit**, which is how the meadow carries two flowers
at once and the only way anything here can: one kit per season, and a kit has one
accent, so a second spring flower had to be white. *Lysimachia borealis* is, wants
acid conifer woods, and flowers in the same weeks. It earns its place by being the
lily's opposite — a symmetric head against a one-sided stalk — so the two never
read as one plant drawn twice.

> **It shipped with a second mark that was the meadow's dandelion clock with one
> pixel changed** (`.o.o.` / `o.*.o` / `.o.o.`, `*` for the centre `o`). Six petals
> in a ring at five across IS a seed head, and there is one of those in the file
> already; a region away in a different white it was still the same glyph. Caught
> on the contact sheet, same as the twin lupines. **The per-kit duplicate test
> cannot see this** — the marks differ, and they are in different regions. Looking
> at the sheet is what catches it.

### Autumn in the pines: two swings, both missed (6 Aug 2026)

Neither shipped. Recorded so the next person spends the time on a third idea
rather than these two.

**Red berries — rejected before drawing.** Lily of the valley carries red-orange
fruit in autumn on the same stalk, which is a lovely callback and a bad idea
*here*: the pinewood keeps the red mushroom cap (it is on `palette.test.ts`'s
`REDS` whitelist as a fly agaric host), so the floor already has small red things
on it and **those are gatherable**. Decor berries beside them would be small red
things that are not — the glimmer orbs' problem ("a round pale thing in a tree
reads as fruit, and fruit reads as pickable"), except at the same size and hue.
The blueberries dodge this by being blue and by sitting on a node you can chop.

**Bushes that turn — built, photographed, pulled.** `shrubCrown?: Tint` gave the
undergrowth its own foliage tint instead of inheriting the trees'; at a low amount
the frame's own autumn pulls the bush while the conifer above it resists, no
seasonal branch anywhere. Mechanically it is the right shape, and the argument
holds independently (a blueberry has no business being conifer-coloured in July).
**It came out ORANGE.** Autumn's crown in `seasons.ts` is `#a35d2c`, a pumpkin;
"blueberry barrens go scarlet" is not reachable by composing with it, and the
russet oval that resulted read closer to a boulder than to a turned bush. Reaching
crimson needs a season-*specific* shrub tint, which is a second field and a branch
for one region's one month.

It is one commit back if a reason turns up. Same call as the mushroom's `over`
state: unused art rots faster than anything it depicts.

## The autumn pass (6 Aug 2026)

October read muted and drab, and the diagnosis turned out to be measurable rather
than a matter of taste. **The cause was not saturation** — autumn's crowns are
*more* saturated than summer's (0.57 against 0.42). It was VALUE: with the ground
warmed to straw, the two largest masses on screen sat at the same brightness in
the same hue family, and in the birch wood the crown-to-ground luma separation
fell from **34 in July to 20 in October**, hues 29° apart. Two masses that close
cannot separate, so the trees stopped reading as objects standing on a ground and
the frame went to one khaki field. Nothing was drab on its own; everything was
drab beside everything else.

**The control was already in the game.** The pines keep a separation of 67 in
October and read fine — and they are the region whose trees refuse to turn.
Winter reads fine too, bare crowns going dark against a pale ground. It was
autumn, and only where the canopy turns.

The cause is recorded in `seasons.ts` at the moment it happened: the ground was
pushed warmer *because "the trees were doing all the work alone"*. They were —
that is the season's own stated design. Warming the ground until it joined in
removed the contrast the trees needed to read against.

### The three new fields

- **`seasonPull`** — how much of the month a region's crown and floor actually
  take. **Four regions were measurably wrong**, all named for conifers: granite's
  Jeffrey pine swung 39 RGB July→October, redwoods and giants 30, the pines 26,
  against a deciduous birch wood's 67. A third to half a real turn on trees that
  do not turn at all. Now 9. Deliberately not zero — a sprite that takes none of
  the season has been cut out of the year and pasted back on top of it.
- **`autumnCrown`** — which way a region turns, in the one month anything does.
  Every crown in the game used to land on the same burnt orange, so a birch and a
  maple could not differ, and that sameness was most of the drabness. Birch gold,
  heath rust, fen yellow-brown.
- **`DecorKit.stem`** — a stem ink for the plants that are still green when the
  wood is not. A black-eyed susan flowering in September is a living plant; it was
  drawing on a rust stalk, which is a dried arrangement.
- **`shrubAutumn`** — the undergrowth's own turn, so the blueberries go
  crimson-purple under pines that stay flatly green.

Plus autumn's ground back to about the draft that was rejected, and its crown
pushed warmer now that it is not competing with the floor for the same hue.

### What the build taught us that the plan did not

- **The composition order was wrong, and the blossom rows proved it.** Autumn's
  hue was applied *before* the region's year-round tint; the blossom's pink is
  strong enough to repaint anything under it, so October's crimson came back out
  pink, **two luma from the ground it stood on**. `crown` says what a region's
  foliage IS — in autumn it is something else, so the month gets the last word.
  Order is now season → region tint → autumn hue.
- **A new test caught a pre-existing bug with nothing to do with autumn.**
  Asserting that evergreens still darken at night failed at 12 RGB for the pines
  where a birch wood drops 30. A tint sits on whichever arm the HOUR picked, so
  resisting the season through `crown.amount` had quietly bought resisting the
  dark. They were not evergreen, they were lit wrong. Fixed by halving the amount
  and doubling the colour down, which leaves the summer crown identical. **This is
  the whole argument for `seasonPull` being its own dial** rather than a bigger
  `amount`.
- **Vibrancy is saturation, not lightness.** The birch gold was drafted bright
  (4 luma from its floor, read as a wash), corrected to a dark bronze (separated,
  went dull), and settled by pinning the VALUE where separation needs it and
  spending everything else on chroma: same brightness as the bronze, **0.97
  saturated against 0.79**.
- **`autumnCrown` cannot be 1.** It lands last on the lit arm and the shaded arm
  alike, so at full amount both become one colour and the crown loses its own
  shading — a flat cutout of a tree. 0.7 keeps a third of the light on it.
- **The blossom rows are exempt from the separation rule, and measuring them is
  what earned it.** They sit at a separation of TWO *in July*, where nobody has
  ever complained: pink over pale green separates on HUE, not value. The birch was
  wrong because it had neither. Value is the thing to assert on for anything
  turning warm, because warm-on-warm is exactly where hue stops helping.
- **`/biomes.html` had a stale copy of the stem-ink rule** and was drawing every
  chip from a composition the game had stopped using. `foliage` is exported from
  `palette.ts` for this reason: the tests and the contact sheet ask the same
  question the screen does. A test that recomputes a colour itself is how you get
  a green tree in a suite and a brown one on screen — which is exactly what the
  old "keeps the pines evergreen" test did while the pines swung 26.

### Settled here, don't relitigate

- **The blossom rows bloom all year.** A cherry really does turn scarlet, and
  giving that row an autumn broke two settled things at once: the header's own
  example of tints composing ("Blossom Rows stay stubbornly pink") and the petals,
  which fall all year BECAUSE the trees are in blossom all year. Crimson trees
  shedding pink petals is a region half-committed to a season. The permanent bloom
  is this region's one deliberate untruth and it is the point of it — a sited
  landmark, in flower whenever you arrive. The notebook line now notices the
  warmth without explaining it. If it is ever made seasonal, the petals, the daisy
  carpet and that line go with it, as their own decision.

### Loose end this opened

**Most regions barely darken at night** — glass 9, salt 7, cinder 7, blossom 9,
prairie 13, glimmer 12, against a meadow's 46. Same cause as the pines' 12: high
`crown.amount` outvoting the hour. Fixing twelve regions' colours inside an autumn
pass would have made it unreviewable, so it is written down instead. It is a
night pass, and `seasonPull`'s argument is the template for it.

## Winter: snow on the ground (6 Aug 2026)

Six regions lie under snow in winter — **meadow, pinewood, granite, prairie,
redwoods, giants**. Ground only; caps on rocks and canopies are deliberately a
separate step, so the cheap half could be looked at first.

**It is allowed because it is a COLOUR and not a layer.** `seasons.ts` refuses a
snow layer outright and both of its stated reasons are about a layer: snow on
every cell is the per-cell edges band (CLAUDE.md, three times), and snow that
melted would be the game's first weather with state. A per-region ground tint has
neither — nothing per cell, nothing stored, nothing melts. Winter is still a
colour temperature; this says the temperature is different where snow is lying.

**The meadow is why `snow` is its own field.** The town's region states
`ground.amount: 0`, and `palette.test.ts` asserts `biomeSkin` hands back the same
OBJECT for it — the promise that the town's lawn is the colour it has always
been. Spelled as a ground tint, snow would have cost that guarantee in all four
seasons to gain snow in one. As a separate field composing AFTER the region's own
tint, it also means **the granite is grey rock with snow on it** rather than a
white field, which is the version worth having.

### Two things the numbers had to teach

- **`amount` is not depth, and reading it that way put slush on the ground.**
  It is distance from the floor's own winter colour, and that floor has already
  been through the region's tint — so the same number means different amounts of
  snow depending on how hard a region paints its ground. Written as depth
  (meadow 0.8, pines 0.5, redwoods 0.6), only the meadow came out white: the
  pines resolved to `#b3c6aa`, a pale GREEN that reads as frost on grass, and the
  redwoods to `#b1aaa0`, a warm taupe that reads as dust. The meadow was right
  only because it tints its ground by nothing at all.
- **And then the whole set was too dark** — about luma 205, which photographs as
  dirty slush. The caution that talked the first draft down ("a pure white ground
  will fight the HUD") was right about `#ffffff` and wrong about everything
  between there and grey. Every row is now **fitted to land at luma 233**, bright
  and faintly blue, four points short of white so things standing on it keep
  their own lit sides. Rows record their resulting hex: **check the colour, not
  the amount.** The test asserts the result, not the input, for the same reason.

**Snow reaches sand; the region's own tint does not.** Two lists, and they have to
stay separate — `BIOME_GROUND` is narrow because "a region is turf and what grows
on it; it has no opinion about water, about paving, or about anything a player
made". A fen has no opinion about a beach. **Weather does.** The first bright town
photographed under snow had its river margin still in high summer while the lawn
either side was white. Sand only: not `DIRT`, which is "Dug earth" and sits with
farmland on the far side of the same rule the finishes are on.

### The snow was dingy, and it was not the snow

Reported as "still kind of giving dirty" with the ground already fitted to 233.
Two candidates, and the measurement killed the interesting one first: the
**contour banding** (§the straight-edge sweep, settled as left alone) is *not*
worse on snow — sampling the open field gave 25 shades across a luma range of
**4.0**, the same 1–3 units the original survey measured. The evidence that would
reopen that entry still has not turned up.

**It was the marks on top.** A tuft sits on 38% of grass cells, and the ground
kit sits on top of that; both draw in inks that winter makes bare-branch brown.
So a white field came out speckled brown at better than one cell in three — dirt,
not snow, however bright the floor under it was.

`BiomeDef.stubble` — the fraction of a region's ground cover that stands through
snow — thins **both layers** off one number, and the two ends of it are a mown
common (0.15) and a grassland (0.38, all of it).

**Cutting the low marks outright was the first go and it cost the prairie its
winter.** That region's `decor` IS its long grass: a 0.32 kit of knee-high marks.
"Bury what is low" deleted the stems standing out of the white, which was the best
picture the season makes — while the meadow, which genuinely is clover on a mown
lawn, needed exactly that. One field, scaled against the ordinary 0.38, says both.

**And the borders already fade.** Snow is blended by weight in `blendRegions`
like the turf and water tints, so a snowy region meeting a bare one ramps out over
the same tiles its ground does. There is no snowline drawn across country —
checked on a border shot before it was asked about.

### Snow on the sprites — built, photographed, reverted (the same day)

`snowLedge`: one geometric rule, **snow lies where nothing is above it.** Every
round thing here is drawn as half-widths either side of a column, so a row wider
than the row above hangs out by the difference and that overhang faces the sky.
Per object, not per cell, so the band rule never came into it. On paper it is the
right rule and it needed no per-species art: a conifer's tiers ARE ledges, a dome
gets a rim, a rock gets a cap.

**On screen it drew a saw.** A pine has about eleven tiers each stepping out a
pixel on both sides, so "snow on every ledge" is twenty-odd single white pixels in
a serrated line down both edges of the silhouette — spikes, not snow, and the most
visually distracting thing in the frame. Meanwhile the shapes it was right about
are the ones where it does not show: a broadleaf's 1px rim and a rock's cap are
both near invisible in play. **All of the cost landed on the sprite it looked
worst on, and none of the benefit landed anywhere.**

Reverted whole. Kept here because the idea will recur and the geometry is still
right — what a snowy fir wants in pixel art is a few CHUNKS, two or three pixels
on a handful of tiers picked per tree, not one pixel on every tier. **The
distribution was the fault, not the rule**, which is the orbs' finding and the
berries' finding for the third time in this file: a thing that is correct at every
point can still be wrong everywhere at once.

**What stays clear is a feature, not a gap.** Paths, plaza stone, laid floors,
farmland and water are all season-exempt by design, so a snowy town has its
paths, its square and its vegetable beds clear — a town that clears its paths.

## The meadow's second tree (6 Aug 2026)

The one region `crownAlt` had been kept out of, decided the way its own test
demanded: by looking at the plaza, over four photographs of the same spot.

**Both forms are the same oak; the difference is bare pole.** Form zero is
BROADLEAF on the ordinary sixteen-pixel stem, unchanged and still asserted. The
new one is the tree that kept its lower limbs — a twenty-five-row crown coming
down over the stem, leaving ten visible pixels of it against sixteen.

**Girth AND height are both pinned**, which is one more than the pines pin. Seven
half-widths each, thirty-five tall each. In a closed wood the pines could argue
the canopy levels itself; in open ground the argument is different and stronger —
trees of visibly different heights read as saplings among adults, which is an age
gap rather than a history, and the sapling version was drawn and rejected on
sight.

**It was a lozenge twice before it was a tree**, and both times for the same
reason: the crown may not exceed 7 half-widths, so a larger crown can only be
bought in ROWS, and 14 across by 25 down is the capsule BROADLEAF's own note
records being cut out of the first tree. The fix was never size. It was profile —
blunt on top (it opens on 2, as BROADLEAF does, not on a 1,2,3 point) and NOT
symmetrical (eight rows of dome above the shoulders against five of close below,
so the widest point sits low, where it sits on every field oak).

**And the original grew two rows** at full width, in the middle, to keep the pair
looking related: seventeen rows against twenty-five read as a tree and a bush.
Shrinking the new one was not available — a skirted oak IS mostly crown — so the
old one stopped being quite so much stem. BROADLEAF is the SHARED shape, so the
grove and the dusk grew with it, which is what sharing it is for. Eleven-of-
nineteen rows at full width is still well under the capsule's fourteen-of-
seventeen, so the profile argument survives.

## The birches: the crown, the notch, the seedlings, and the missing seasons (6 Aug 2026)

Four things, all in one row, all decided by photographing the same wood.

**The crown was square off the top**, and one row was to blame: it opened `3,3`
— two rows held at six pixels. A width held for two rows at the very TOP is a
lid, because the eye reads the first hold it finds as the widest part of the
shape. `2,3,4,5` climbs a step a row and the crown domes. The first try was
`1,2,3,4` and overshot into a teardrop, which is a leaf rather than a tree with
leaves on it — the row's own note already warned "an egg, not a cone", and the
correction is exactly one step blunter.

**The notch was overgrown, not too deep.** Four rows stand beside the trunk and
only the last two were parted, so the foliage crossed solid over the stem and
then opened a keyhole below it. The parting now runs the full overlap and widens
downward — `1,1,2,2` — because a branch angle opens away from the stem.

**Saplings are a tree form, and they were decor first.** Built as a mark, they
were not wrong so much as too small: the band rule caps a glyph at 5×5, and at
that size the regeneration this wood is famous for reads as lint on the grass.
So they became a `crownAlt`, and **the same-species rule had to widen to let
them in**: a second form may now either match the adult's girth within a pixel
(another grown tree) or be **unmistakably young** — at most half as wide *and*
half as tall. What stays forbidden is the middle, which is where "a slightly
different tree" lives and which was always the actual fault. This is a birch
argument, not a general licence: the species colonises gaps, so its stands are
ragged, where the pinewood's own note argues the opposite and should keep it.

**Skinny needed a new field.** The stem is five pixels everywhere, and
`drawTree`'s note says why — "a 3px stem under a 40px tree reads as a sapling
that grew a hat". That is a bug report about a grown tree and a *spec* for a
young one: on the region's five, the sapling photographed as a fencepost wearing
a shrub, because a stem as wide as its own crown is a post whatever height it is.
`TreeShape.girth` overrides `BiomeDef.trunkGirth` per form; `-1` gives a
three-pixel whip, and the bark grid and the shaded side follow it down (the shade
now clamps at 1, or a narrowed stem loses its round entirely).

**And the dashes punched holes in it.** The bark grid insets one column from each
edge of the stem, which is right on five pixels and impossible on three: one lit
column left over means a single dark pixel with bark either side, and the eye
reads an enclosed dark pixel as a HOLE before it reads it as a mark — the same
finding `crownGaps` records at ten times the size. Below five pixels the grid is read as a
COUNT rather than as columns: a row with one `x` draws one pixel, a row with two
draws two. Every mark keeps its place in the vertical rhythm the grids were drawn
for and none of them is a hole.

**Then the inset came off every trunk, not just the narrow ones.** Only one of
its two sides was doing any work — a dash crossing the SHADED column would
flatten the round the two-tone stem is for, but one reaching the LIT edge does no
such thing. A lenticel is a scar that wraps the stem, so a mark stopping a pixel
short of the edge floats on a trunk instead of being cut into one. The grid now
starts at the stem's lit edge everywhere and the shaded column stays bare, still
saying "far side".

**And a young stem wears two marks at most.** Read whole, a grid puts three or
four dashes on twelve pixels of sapling where it puts the same number on twenty
of adult — so the smaller tree came out the more heavily marked one, backwards
twice over: birch bark roughens with age, and the marks are the loudest thing on
a stem this thin. The top two, because that is where the grids gather them and
because the region's own note says a birch's lower bark is its smoothest part. 12 rows on a
12-pixel stem stands 22 against the adult's 44 — exactly half, which is both what
the rule allows and where the eye reads "not grown yet" rather than "far away".

**Two missing seasons, filled.** Summer gets the **harebell** — the first true
blue accent in the file, and a plant that wants exactly the thin half-shaded turf
this row's palette describes. Two corrections, both worth keeping: it drew as a
flat bar first (two blue pixels in a row is a flag on a stick — a bell is one
pixel where it joins and two where it opens, and that step down is what makes it
hang), and the first blue was too CLOSE IN VALUE to the grass. `#89a6dd`
measures 164 against this floor's 178; at three pixels, hue carries nothing and
luma carries everything. `#5f7fc9` sits 52 below the grass, reads across the
wood, and is the truer flower besides. Winter gets **snow**,
making it the seventh region with any — there was never an argument for leaving
it out, and the pines it exists to be compared against have had it all along.
`0.82 → #e4ece5`, fitted to the same luma 233 as every other row; `stubble: 0.25`,
between the mown common and the prairie.

**And then the all-year kit came out entirely**, which makes the birches the
first row in the file without one. It had carried thin diagonal grass since the
slot existed, and it went the moment there was anything else on the floor: a
spring carpet, a summer flower, mushrooms, deadwood and saplings now stand on it,
and the grass was the layer competing with all of them while saying nothing they
do not already say. The kit's own rule arriving from the other side —
`DecorKit.density` warns that this layer sits ON TOP of the tuft speckle's 38%
and must stay sparse or the ground stops being ground. In a region whose ground
furniture *is* grass, the speckle already is the grass, so the kit was a second
louder copy of the region's own texture. A region with no all-year kit is not an
empty one.

**Autumn got leaf fall, not a flower** (6 Aug 2026, same sitting). Almost nothing
flowers under a birch in October, and a late bloom would have been a second
subject in the one month this row already has a headline — `autumnCrown` is a
gold nothing else in the file wears. Leaves put the SAME colour on the floor that
is on the branches, which reinforces the month instead of competing with it. Two
findings, both already on record elsewhere and both re-learned here: it has to be
**duller and darker than the crown** (this floor measures 178 even in October, so
the crown's own `#c98a06` would sit 36 under it and smudge — `#a8762c` is 53
down, the separation the harebell needed), and a leaf drawn as a blade with a
stalk (`ooo` over `.o.`) is a **tack**, because at three pixels the eye takes the
symmetry before it takes the botany. Three pixels in an L is a flake with a
direction, which is all a fallen leaf is from above — the pines' 2px needle
strokes, one step fatter. Ones and twos, because leaves fall in drifts.

**Loose end this opened:** a birch in winter should be the barest tree in the
game and photographs as olive. The region's year-round `crown` tint (`#cfe08a`
at 0.35) fights the season's bare-branch brown, so the wood reads as summer trees
standing on a snowfield. `seasonPull` tunes autumn, not winter; a winter-side
equivalent would be a new field, and it should be decided while looking at all
six other snowy regions rather than for this one alone.

## The scrub's tree: a hawthorn, then a coast live oak (6-7 Aug 2026)

Asked "what kind of trees are these meant to be?" and the file had no answer:
the row described its plant only by HABIT — *"squat and wind-flattened, barely
taller than the rocks"* — and had never named one. Everything else in it had
already voted, though. The decor kit draws a **thorn bush**, the spring bloom is
a **thistle**, and half a dozen comments call the region a heath. A thorn tree on
dry stony ground is what all of that adds up to, so the row now says so.

**It had been drawn as a lollipop the whole time**, which is what a comment
describing a tree nobody built will do. Eleven crown rows on the default
sixteen-pixel stem is two thirds bare pole — the exact opposite of squat, and
more than twice the height of the rocks the note claimed it barely cleared. The
words were right and the fields were simply absent. Now: `trunkHeight: 10`,
`crownOverlap: 4`, twelve crown rows — six visible pixels of bole, eighteen tall
against the meadow oak's thirty-five, and fourteen wide, so it is wider than it
is tall.

**"Barely taller than the rocks" was hyperbole and the measurement says so.** A
rock here is five to eight pixels; a tree that literally cleared one would be
shorter than the region's own bushes, which stand about ten. What the sentence
was reaching for is that this is the only tree in the game you look OVER rather
than up at, and eighteen does that.

**Two contradictions cleaned up on the way, and one of them was resolved the
wrong way round.** The crown note claimed these plants are EVERGREEN while
`autumnCrown` painted every one of them rust and purple-brown in October — the
row was asserting both. Naming a hawthorn settled it as deciduous. (The
pinewood's note about `crownOverlap` being *"the field the scrub has had since it
was a heath"* is also true again, having quietly stopped being so at some point.)

### And then it became a coast live oak (7 Aug 2026)

The hawthorn lasted about six hours, and what unseated it was the region turning
Mediterranean underneath it. **Chaparral is defined by evergreen sclerophylls** —
chamise, manzanita, toyon, live oak — and its signature picture is grass going
gold in May while the brush stays grey-green right through the dry season. The
region was browning all at once, which is the one thing that landscape does not
do. So the contradiction above was resolved backwards: the borrowed rust should
have gone, not the evergreen.

*Quercus agrifolia* is the tree of exactly this landscape — broad, low, dense,
standing alone on hills that are gold eleven months of the year — and **the
silhouette drawn for the hawthorn is that tree, pixel for pixel.** Nothing about
the shape moved. What moved:

- `autumnCrown` is gone. Rust-then-purple-brown is bracken and blueberry and
  heather turning at once, which describes a HEATH understory and not this place.
- `seasonPull: { crown: 0.16 }` — the same number four conifer rows already use,
  because it means the same thing: a sixth of the month reaches the crown and the
  rest does not. `ground` stays at 1, which is the whole picture — the month
  lands on the floor with its full weight and stops at the leaves.
- The region loses its autumn event and gains a better one: **"the whole country
  goes gold except the trees"** is something no other row does, and the spring
  flush is what pays for the loss.
- **The bushes came with it**, and that is automatic rather than a second
  decision: `drawShrub` takes its colour from the same `foliage()` path the
  crowns do, so `seasonPull.crown` reaches both. Measured, the foliage now sits
  at 115-117 in all four months where autumn used to be 103 and rust. Correct for
  the place — chaparral's understory is evergreen too (chamise, manzanita,
  toyon), which is why this row does NOT want `shrubAutumn`, the field for a
  deciduous understory under an evergreen canopy.
- The prickly pear stops being the only plant here that does not season. That was
  a nice fact and a small one. It also means the pear no longer gets an easy
  month: it had 27 luma of separation in autumn when the shrubs went rust, and
  now has a steady 28 against a foliage that never moves. Its colour has to work
  in one condition rather than four.

**Worth remembering as a method note:** the hawthorn was not a mistake, it was a
correct reading of the evidence available that afternoon — a thorn bush in the
decor kit, a thistle, and six comments calling the place a heath. Naming it is
what made the region legible enough to then be recognised as somewhere else.

## The scrub's year runs backwards (6 Aug 2026)

The scrub was the same picture four times — parched in every month, with one
spring thistle for a calendar. Dry Mediterranean country is not parched that way:
**the rains come in winter**, the hills flush green through the wet months, the
wildflowers go over with them, and it is brown from late spring until the rains
return. A row with one tint for all four months could say "parched" but never
"parched EIGHT MONTHS OF THE YEAR", which is a different and truer sentence.

**New field: `BiomeDef.seasonGround`**, a `Partial<Record<SeasonId, Tint>>`
composing after the region's own ground tint and under any snow. Why not just
generalise `snow`: snow is fitted to a specific luma (233, measured on the
result) and it reaches SAND, which is a claim about weather lying on things. A
green flush is something that GREW, so it is turf only — a beach does not grow.
Keyed by month rather than one tint plus a list, because the first flush and the
full green are different pictures.

- `biomeSkin`'s fourth parameter went from a `winter` boolean to a `SeasonId`. A
  flag cannot name a month, and this region names two.
- It **blends across borders per key**, on the snow's own argument: rains that
  arrived along a straight line would be the seam `blendRegions` exists to
  prevent. Photographed at the scrub/snow-country border and the fade is clean.
- **And the green itself was far too dark and saturated**, which took a second
  look to find and was worth the trip: `#8aaf53` measured **luma 153 at 0.53
  saturation — the darkest and most saturated temperate floor in the file**,
  under the pinewood's 155 and nowhere near the birches' 181. Dry open country
  that has greened cannot out-shade a closed conifer wood. Hills after the rains
  are pale, bright and a little grey — new annual grass thin over dust, and
  nothing about them is a lawn. `#9abb69` is 168 at 0.44.
  **It also opened the room every other plant needed:** at 153 there were 32 luma
  between this floor and the region's own shrubs at 121, which is not enough for
  anything to stand between them. At 168 there are 47. The prickly pear could not
  be given a colour that was not within nine of something, and the poppies had to
  be pushed well past their true orange — both were symptoms of a ground that was
  wrong, diagnosed only when a third plant hit the same wall.
- **Spring only, and that is a correction made by looking.** It was built with a
  winter flush as well and the botany was right while the picture was confusing:
  winter means one thing everywhere else in this game — the world goes quiet and
  six regions go white — so a seventh going GREEN in January reads as a bug, not
  as a different climate, because the player has no way to tell those apart from
  inside the month. Spring carries the idea better anyway: the ground greens
  exactly when the flowers arrive, so the two land as ONE event. `#8aaf53`, and
  the other three months name nothing.
- The now-dead `seasonGround.winter` branch is kept in `palette.test.ts` on
  purpose, with the reasoning: if a row ever does claim a green winter, that is
  the assertion it has to survive.

**The thistle moved to summer and spring got poppies.** The old argument for a
spring thistle — "dry country blooms harder and briefer than green country" — was
right about the region and wrong about the month: these flowers come up in the
green, on January's water. A thistle is what flowers *after* that, standing in
the brown. Spring is now poppies and goldfields sharing one kit at 0.16, the
densest thing in the file after the anemone's carpet, because a superbloom is
what it is.

**The luma trap, third time — and it was the ground, not the flower.** True poppy
orange landed within ONE luma point of the wet-season floor as first drawn, so it
was pushed up to a gold 45 above. Right move for the floor that existed, wrong
colour for the flower: a poppy field reads gold from a distance and orange from
anywhere you would actually stand. With the ground corrected to 168 the poppy is
a poppy again — `#e07b18` at 0.89 saturation, reading by sitting **26 BELOW** the
ground rather than 30 above it. **Down was always available and nobody looked**,
because the first instinct on a mark that will not read is to brighten it. Worth
remembering: the harebell went down, the leaf litter went down, and only this one
went up — and it was the only one that had to be lied about to work.

**And the tack, third time.** A poppy drawn `ooo` over a centred `*` is a T
before it is a flower — the same shape the birch leaf litter came out as, for the
same reason. What fixes it is the second row being full width too, so the head is
a block of petals with the throat inside it.

**The tilted poppy was drawn twice and cut.** A leaning flower — corner open at
the inner edge, then at the outer — was there because a colony all facing one way
reads as printed, which is 8c's finding and is right about the lily and the
harebell. It is not right here, and the difference is what a missing pixel MEANS
on each plant: a bell hangs off one side of its stem, so a notch is the direction
it nods; **a poppy is a radial cup, so a notch is a piece missing.** Six pixels is
too few for the eye to grant a shape a three-quarter view — it reads the absence
as damage, and a field of bitten flowers is worse than a field of identical ones.
The kit's variety comes from the small mark instead: different SIZE, which needs
no missing pixel to say it.

**Deliberate and checked:** the tuft speckle keeps its dry straw colour through
the wet month. On green ground that reads as last year's dead stalks standing in
the new growth, which is exactly what a California hillside looks like in spring.

**The notch is FLUSH with the trunk, and the width is arithmetic rather than
taste.** `drawTree` clears `cx - g .. cx + g` — 2g+1 pixels — and the trunk is
five wide at girth 0, so **g=2 is the only value that lines foliage up with
bark**. The crown parts exactly where the stem begins and the stem continues up
through the parting with nothing overlapping it and no grass beside it.

Both neighbours were built and photographed and both are wrong, in opposite
directions. At **g=1** the gap is three pixels against a five-pixel stem, so the
crown still lies ACROSS the trunk and what shows through is a slot cut in the
foliage on top of it. At **g=3+** the spare pixels read as a hole around the tree
rather than a tree standing in a parting — pushed to 4 with a reshaped tail it
broke the tree outright, which is worth recording because the temptation on
seeing g=1 fail is to keep going, and the right answer was one step, not two.

**And the top row of the parting keeps its 1, which is what stops it looking
cut.** Flush all the way down, the notch is a clean rectangle taken out of the
crown, and a rectangle is a thing somebody MADE. `g=1` on that one row clears
three pixels of a five-pixel stem, leaving the outer column of bark covered on
each side — one pixel of foliage lapping the trunk at each top corner, which
turns a right angle into a leaf resting on a branch. It is the same fact the fork
failed on, used the right way round: lapping the trunk for ONE row is a tree
growing around its own stem, where lapping it for all three was a crown lying
across one. The difference between a mistake and a detail is how much of it there
is.

The tail gives up its point to carry it (`6,5,4`, not `6,4,2`): a gap must be
narrower than its row, and a crown parting around a stem cannot also taper to
nothing — the last row has to be wide enough to have two sides. The bole stays at
four visible pixels; the two-pixel version went out with the fork.

**The crown then went one pixel wider all round** (17x14, from 15x12) and the
bole came down to **three visible pixels**, from the sixteen this row started
with. Three works where two did not, and the difference is the notch: the stem is
legible INSIDE the crown now, so what shows beneath it only has to say "this tree
has legs" rather than carry the whole trunk on its own.

Two consequences, one accepted and one open:

- **It is the first near-region tree to overhang its tile** — eight half-widths
  is seventeen pixels on a sixteen-pixel tile, the point BROADLEAF's note flags
  as "a stand of trees smears into itself". It survives because `trees` is 0.25:
  the scrub is the sparsest wooded row in the file, so its trees overhang grass
  rather than each other.
- **OPEN: the bushes grew with it, uninvited.** `drawShrub` takes its width from
  the widest crown row, so `shrubPeak` went 4 to 5 and the region's undergrowth
  widened from nine pixels across to eleven. Shrubs are this region's commonest
  plant at density 1, so that is a bigger change to the picture than the trees
  are — the crown is currently the size dial for two things at once. Deliberately
  left as it fell, to be looked at on its own; the fix, if it wants one, is for
  `shrubPeak` to stop deriving from the crown, which is a renderer change rather
  than a tint.

### The fen's tree was a lightbulb (7 Aug 2026)

One row of the table: `crownRows` rewritten, `crownGaps` and `crownOverlap: 6`
added. Photographed, not reasoned about — the complaint was "these trees look
goofy" and the screenshot said why in a second.

**The old shape was two known faults stacked.** `[5,7,8,8,…,8,7,6,6,6,6,5,5,5,
4,4,4,3,3,3]` reached full width by row 2 and held it for twelve rows, then spent
its remaining fourteen rows tapering to a seven-pixel neck plugged into a
five-pixel trunk. The lid is the birch's finding — *the eye reads the first hold
it finds as the widest part of a shape, and finding it in row zero says the tree
was trimmed flat.* The cone is `crownGaps`' own — *every tree here tapered to a
tip on the way down, which is a shrub's outline.* Both were already written down
in the file the row lives in.

**And the comment that produced it was a sentence about weight, not a shape.**
"Broad at the top and narrowing all the way down, so the mass hangs rather than
sits" describes a willow correctly and specifies a **lightbulb**. Mass hangs by
being carried DOWN, not by being piled up: a crown that ends in a point does not
hang from anything, it balances on the stem. This is the general trap in the
whole `crownRows` column — a prose intent that is true about the plant can still
be false about the outline, and only the render tells you which.

**The fix uses the birch's mechanism rather than inventing one.** The top domes
in five steps, the full width runs unbroken to the bottom of the crown, and the
last six rows come down beside the trunk and part around it (`1,2,2,3,3,4`,
widening downward, `crownOverlap: 6`). Foliage falling PAST the point where the
branches leave the stem is the one thing a willow's outline does that nothing
else in the table does — so the region keeps a silhouette of its own instead of
being solved into a taller, darker broadleaf, which was the safe option on the
table and was declined.

**A claim in the old comment was already false**: it called itself "the tallest
crown in the table" at 26 rows, where the birches are 28. It is now shorter still
(16 + 26 − 6 = 36px against the old 42) and says so.

**`shrubPeak` did not move** — the widest row is 8 either way, so the fen's
undergrowth is untouched. That is the coupling the scrub's oak left open one
section up, and it is worth checking on every crown edit until it is cut.

### The inkcap was too big (7 Aug 2026)

`MUSHROOM_ART.bell`, fourth rebuild: 7x9 down to **5x6**, and its companion 3x4
down to 3x3.

**The first three rebuilds all asked the same question and this one doesn't.**
Column, dagger, table — each was an argument about what the sprite READ as, and
each was settled by changing which elements it had. Nothing was left to fix by
that route: pale straight cap, dark rim proud of it, pale stem, and it did read
as a shaggy inkcap. It was just **too much of one**. Nine pixels tall against a
villager's sixteen is a mushroom as tall as somebody's torso, seven wide is most
of a tile with the companion beside it, and the fen carries the heaviest density
in the game (0.12, eight patches to a screen). A floor of them read as a boulder
field.

**Weight is a fourth question and nothing about a single sprite asks it.** The
grid is drawn in isolation, judged in isolation, and every element of it can be
right while the object is the wrong size for the world — which only a screenshot
with something of known height in it can say. It is the same instrument the fen's
crown needed the same afternoon.

**Reduced by proportion, not by thinning.** Five wide and six rows is the dome's
own footprint one row taller. The cap keeps a body — three wide over a rim one
pixel proud, where the old seven-wide cap wore a rim two proud — because the
dagger's lesson was that a cap thinned to an edge stops being a cap, and that
lesson survives the shrink. The rim still carries the species at either size.
`palette.test.ts`'s rule (the bell is taller than the dome, not merely narrower)
now holds by exactly one pixel, which is the whole margin the fen has.

**The companion lost a row for a reason of its own.** Four rows beside a six-row
adult is two thirds of its height, and a companion that size is not a younger one
— it is a second mushroom, the exact read the button grid exists to prevent. Half
is what it always was; three against six restores it.

**The meadow's dome did not move** and is not up for review here — same promise
as the meadow's crown. It was 5x5 all along, which is why the bell was the
outlier and not the pair of them.

### The fen's floor: reeds cut, cattails, a lily (7 Aug 2026)

Four changes to one region, same afternoon as its crown and its mushroom.

**The inkcap took its corners off, ON TRIAL.** `..c..` over three body rows, so
5x6 became 5x7. At three wide there is no such thing as a rounded corner —
taking both leaves ONE pixel — so the cap got a fourth row back to give the step
something to happen over. **The failure to watch for is the bottle**: a narrow
body with a stopper on top, which would be the fifth object this sprite has
accidentally been. The 5x6 row is one line up in `renderer.ts` if it wants
reverting. Its companion took its own nub back for the same reason it lost a row
this morning — the pair should be one species at two ages, so they share the
newest idea rather than one being a block and the other domed.

**Two of the three reed marks were noise.** The kit ran a V, an inverted V and a
lone kinked stalk. Only the V reads as a clump growing out of a point: a blade
that FORKS downward is a shape no grass makes, and a single kinked stroke is a
scratch. At density 0.16 that is a lot of ground carrying two glyphs nobody can
name. Now one shape at two heights — the poppy's rule from the same morning, that
the second slot buys SIZE and not a shape.

**The cattails needed no mechanism, only the right one.** The ask was "cattails by
the water"; the answer is that Typha stands IN water, so it is a `float` kit —
the marshes' slot, which until now had exactly one user. Nothing had to learn
about shorelines: the waterline is where `float` already draws. **And this
region's water is nearly all margin**, which is what makes it honest — the fen
measures 13818 shallow tiles to 1774 deep, so a cattail here is almost always
standing in water you could wade. The mark is a flowering stalk plus a blade,
and the blade is the reeds' own V half, so the wet vegetation and the dry read as
the same plant community.

- **The head went to two pixels wide and a step lighter, and those are the same
  change.** At one pixel it was a hairline and needed #6b4527's 4.28:1 against the
  shallows to be a mark at all; at two it is a BODY, and a body that dark on water
  that pale is a hole punched in the pond. #9c6b3c still measures 2.34:1 — more
  separation than any flower here gets from its own floor — and it is the colour a
  cattail actually is. **The overhang is the recognition**: the head is wider than
  the stem holding it up, which is true of no other mark in the file and of every
  cattail. The grid went to four wide to pay for it, so the blade keeps a clear
  column.
- **Every head is the same sausage — three rows, then four.** The short mark
  carried a two-row head and photographed as a brown SQUARE: two by two has no
  long axis, so it reads as a block on a stick. Four is where it stops being
  arguable.
- **The green tip costs one pixel and buys two things.** A cattail's spike is two
  flowers stacked — the brown female mass, and a narrower male spike above it that
  is green while it lasts — so the anatomy is free. It also fixes what the drawing
  needed anyway: without it the stalk STOPS at the brown, which reads as a stick
  dipped in something. With it the stem passes through and comes out, so the head
  is a swelling ON a stalk.
- **They grow in stands, so there are no single ones left.** Every mark is a
  clump: a flowering stalk with two or three green blades at staggered heights.
  The blades keep a clear column between them — adjacent strokes merge into a
  green bar, and equal-height ones are a comb, which is the banding rule at the
  size of a plant.
- **The small mark is gone rather than grown.** A bed of three heads and a bed of
  one are not two ages of the same thing; they are a stand and a straggler, and
  the straggler is what the lone stalk had already failed at. So the second slot
  buys a DIFFERENT CLUMP — one flowering stalk or two, blades at other heights —
  which is the first time in this file that the variety is neither shape nor size
  but arrangement, and it is right here because a bed is a thing made of parts.

**The lily left on ecology and came back on a photograph.** Asked for as a wood
lily; *Lilium philadelphicum* is a plant of dry sandy woods over most of its
range, which is the fly agaric's objection exactly, so the first draft moved
sideways to a Turk's cap — a wet-meadow lily that also NODS, which was the real
attraction, because a hanging head is a silhouette the fen does not already own.
Then a reference photo of the wood lily settled it the other way, and the northern
prairie form (*var. andinum*) settles the ecology too: it grows in damp prairie
and turns up on fen margins.

- **Face on is not the kingcup, though it very nearly is.** The objection to an
  upright lily was that at five pixels facing up is a CUP, and the cup is the
  kingcup, in this same region. What answers it is what the photograph is about:
  **a wood lily is a STAR** — six pointed tepals with sky between them — where a
  kingcup is a closed rim. Same 5×3 head, opposite treatment of its ends: the
  kingcup fills the top and bottom rows so the rim closes, this one opens the
  MIDDLE of both so the points stand apart.
- **Four symmetric absences are a star; one is damage.** That is what keeps this
  clear of the poppy's finding a week later in the same file.
- **The colour reads downward and the throat reads up.** Measured against the
  floor (108,142,75): true lily orange #e2622a is 1.07:1 and vanishes — the
  scrub's "orange against green buys nothing that blue against green did not".
  #c93c14 is 1.35:1 **by going down**, which is the direction nobody looks. The
  gold throat is then 3.00:1 against its own petals, so the flower carries its
  contrast internally instead of needing the grass's help. Half a step off the
  kingcup's #f0c845 on purpose: the gold that IS the flower in April is the eye of
  the flower in July.
- **The first head was a tuning fork.** `o.o` over a solid `ooo` is not two tips,
  it is a NOTCH cut in the top of a bar — the poppy's "a notch in a radial cup is
  a piece missing" and the birch's "the same dip in the TOP of a crown is damage",
  third time. It photographed as a goalpost on a stick. The star has no such
  problem because nothing in it is a bar: every row is petals with gaps in it, so
  a gap is what the shape is MADE of rather than something taken out of it.
- **The lower pair straddles the stem rather than hovering over it.** Drawn
  `.o.o.` those two tepals leave one pixel of grass enclosed by gold above,
  petals either side and stem below — the crown's hole rule at a twentieth of the
  size. `.oxo.` runs the stem through it.
- **And both marks stand tall.** The pair was the long stem and a short one, which
  is the poppy's rule about spending the second slot on size — but size is not
  free on this plant: a lily carries its flower at the top of a long bare stalk,
  and a short one is not a smaller lily, it is a different plant. The variation is
  the long stem and one pixel more.

**And prettier is not run on `content/biomes.ts`.** An idle `npx prettier --write`
reflowed 537 lines — every hand-grouped `crownRows` array with its `//` row
markers, flattened to one number per line. Reverted. The formatting in that file
is load-bearing; edit it by hand.

### October comes back to the fen (7 Aug 2026)

`seasonGround: { autumn: { color: "#131e19", amount: 0.55 } }` — one line, and the
second row in the file to have one.

**The fen had no autumn.** Measured off screenshots, its floor ran (107,141,75)
in July and (115,132,70) in October: no change worth the name, and the change
there was ran the wrong way — very slightly LIGHTER. The cause is arithmetic
rather than a missing feature: the region's own `ground` tint at amount 0.5 halves
whatever the season does, so while the meadow swung to (152,168,79) the fen sat
still. Everything saying "autumn" there was borrowed from the trees.

**A fen does not brighten in October, it floods.** The water table comes back up,
the ground goes sodden, and the place gets darker while the wood above it turns.
That is the scrub's inverted year in a different key.

**AND IT CANNOT BE DONE GENTLY — this is the finding.** The two marks that carry
this floor sit at luma 0.153 (the tuft speckle) and 0.132 (the reeds, which take
the crown's ink and so go rust in October). The floor sat at 0.206 and read them
as dark-on-light at 1.26:1 and 1.41:1 — already thin. **A floor on its way down
passes straight through both of them.** A third of the way, at (73,94,58), the
tuft measures 1.38 and the reeds 1.24 — worse than doing nothing. There is no
small version of the move; you either stay above the marks or go clearly under
them.

Under them, the picture inverts and improves: at (61,74,44) the reeds measure
1.64:1 and the mushroom caps 4.20:1, and the tuft comes back as a pale sprout on
dark ground. Which is the true picture anyway — **in a flooded fen the stalks are
the light part.**

**The test had to be widened, and that is worth reading before widening it
again.** `palette.test.ts` asserted that a `seasonGround` month must be GREENER,
which was the scrub's claim wearing the field's clothes: the scrub's year runs
backwards because its RAINS come in winter, so its named months are a green flush
by definition. The fen's named month is also a wet season and is not green at all.
The general rule is the direction, not the hue — a wet month must move the ground
and must move it DOWN, because a floor that lifts when the water arrives is snow
by another name (which is the winter test's rule, one season over). The scrub's
"greener" survives, asserted for the scrub.

**No collision with the pinewood**, which was the thing to check: its October
floor photographs bright green (the pines pull the crowns, not the ground), so
the two dark-wood regions still read as different places. Colour only — no
terrain, no schema, nothing a save carries.

**Then the willows, which said yellow-brown and drew brown.** `autumnCrown` was
`#8f6a2a` and the ink measured (131,95,44): a mid brown with no yellow left in it
and no green at all, which is an oak's October or a beech's. A willow goes a soft
golden yellow-green and holds it for weeks, and **the green staying in the gold is
the whole look of the tree.** The row had room it wasn't using — (131,95,44) is
luma 0.132 against the birches' 0.293, so "murkier than the birches" was being met
more than twice over. `#9eb84f` lands it at (140,142,66), luma 0.253: still under
the birches by 1.13:1, with a stop more gold and the green kept in.

The reeds and the cattail blades came with it, because **the stem ink IS the
foliage** (`renderer.ts` §stemInk) — and that is the right answer rather than a
side effect: a reed bed in October is straw-gold, not rust. It improves the floor
they stand on too, from 1.64:1 to over 2.7:1.

**And a third flower, which the new floor is what made possible.** Devil's-bit
scabious — *Succisa pratensis*, August into October on wet meadow and fen, the
last thing in bloom anywhere in the file. It is **the violet this region already
tried once and could not have**: the fen's first bloom was violet and was cut on a
measurement, "the old violet managed 1.06 and separated by hue alone". True of the
floor that existed. Against the sodden October floor the same colour measures
2.62:1. The thing that failed is the thing that works, one month over, because the
ground moved under it.

- **Third season, third silhouette.** The kingcup is a CUP (a filled five-wide
  rim), the wood lily is a STAR (same width, opened at both ends), this is a BALL
  — a button held high on a bare stalk. No centre: a pincushion is florets all the
  way through, so the eye the other two share would be wrong here. Drawn as a 3×2
  it was a bar on a post; drawn as a diamond it was a CROSS, which is the
  kingcup's own warning arriving on a flower that has no centre at all. Domed at
  both ends is what makes it a ball.
- **Grass-of-Parnassus lost the slot on legibility, not botany.** It is the better
  fen indicator and flowers the same weeks — and it is a small pale thing on a
  dark floor, in the region that already has eight small pale things to a screen.
  The scabious clears the inkcaps at 1.60:1.

**And a test was right in spirit and wrong in its measurement.** "Keeps autumn's
crowns off autumn's ground" called `biomeSkin` with **no season**, so it compared
October's canopy against the region's *year-round* floor. Harmless while
`seasonGround` was the scrub's alone and named no autumn; wrong the moment a row
said what its October floor is. It failed the willow gold against a floor the fen
no longer has in that month — the one failure mode a measurement like this has,
**being right about the wrong two colours.** Now passes `"autumn"`, and the real
separation is 66 against a threshold of 28.

### The dusk keeps no clock (7 Aug 2026)

`BiomeDef.nightPull`, the mirror of `seasonPull` on the day/night axis, plus the
dusk's own colours restated. ~40 lines across three files.

**The region was slate-grey at noon, and it read right only by accident.** Sampled
off screenshots: ground (75,78,98), crowns (49,64,64) — R−G of **−3** and **−15**.
Violet needs R above G and nothing in the region had it. At 11pm it looked
wonderful, because **the night palette was supplying a violet the region never
did**; at 1pm it was an overcast wood.

**The cause is arithmetic and the row's own note found half of it.** It records
that "a mid-violet at 0.55 lands on (112,134,107) — still green, because green was
191 and had the furthest to fall" — and answered by raising the AMOUNT, which is
the wrong dial. **The targets themselves were barely violet**: `#4a4570` has R−G
of +5 and `#2a2740` of +3, dragging greens with R−G of −48 and −57. At 0.85 the
ground lands at −48(0.15) + 5(0.85) = −2.9, which is the −3 that photographed.
**No amount short of 1 crosses over from a target that is itself neutral.** New
targets at R−G of +26 and +42 land (99,86,114) and violet at last.

**And "the dusk should stay the same colour all the time" is two mechanisms, not
one.** Night is a palette swap (crowns and tuft take a night arm) AND a flat
`fillRect` over the whole viewport. Only the first is a region's business. Carving
a region out of the wash needs darkness quantised to the tile grid — the banding
rule in its fifth costume, per `LAMP_INNER`'s own note — plus a hard seam at the
border. So the claim shipped is the smaller one: **a region may hold its HUE
across the clock and still gets darker after dark.**

- **The cheap version was a trap and the maths says why.** Turning the tints to
  `amount: 1` does collapse the clock — and collapses the modelling with it,
  because the lit/unlit delta and the day/night delta are both multiplied by
  `(1 − amount)`. The crown's lit pair is (65,122,65)/(87,151,90); at 0.7, 30% of
  that survives as the highlight, at 1.0 nothing does. Every crown becomes a flat
  silhouette. **Two axes that have to move independently need two dials.**
- **A dial, not a flag, for `seasonPull`'s reason**: it is averaged across borders
  by `blendRegions`, and a boolean cannot be averaged. A region that stopped
  noticing the night along a line would put a seam across the ground after dark
  and nowhere else — the worst kind, one that is only there half the day.
- **`ScenePalette.day` is the mirror of `baseCrown`.** That field is the far end of
  the season dial ("what a surface would be if the month never reached it"); this
  is the far end of the hour dial. Both arms come out of one `arms(night)` helper
  so the noon end cannot drift from the noon the game draws.
- **The tuft composition moved to `palette.ts` as `tuftInk`.** It was inline in the
  renderer, which was fine as one `seasonPulled` and became a second opinion about
  a colour the moment the hour got a dial — the exact fault `foliage`'s docblock
  describes.

**The old rule was right and was being enforced as a bigger claim than it made.**
"The day/night axis is nobody's to opt out of" names its fault precisely — *a wood
that stayed BRIGHT GREEN at midnight*. That is a rule about brightness, enforced as
a rule about change. What it was really guarding is that nobody gets there by
accident: the old way to refuse the night was to raise `crown.amount` until the
season couldn't get past it, which resists the dark silently. A field named for
what it does is the opposite of that accident. The test now asserts nothing
brightens after dark, that any region **without** a declared dial still takes the
night, and that the one **with** one holds its colour exactly — `toBe`, not close.

- **The threshold is 4, and the burnt country is why.** The cinders, the salt and
  the caldera swing about 10 in a good month and 6.6 in the worst, not from
  resisting anything but because a near-black snag has nowhere to travel between
  two dark arms. Distance from the arms is not a measure of obedience for a colour
  that starts at the bottom. 4 separates the only two populations there are: the
  dusk at 0.0, which said so, and 6.6 for the lowest that did not.

**Then the river and the mushrooms, the same afternoon.**

**The water now carries the twilight** — `waterTint: { color: "#3f3a66", amount:
0.35 }`. It was (118,185,211), the brightest and most saturated mass in the frame
and the only one that looked like noon somewhere else, which is exactly the case
`waterTint` was added for. **0.35 is low on purpose, and the reason is a finding
worth keeping: a dark water tint and a pale one do not cost the same thing.** The
affordance here is the colour — "you may wade here" is never said by the HUD, it
is said by the shallows being the paler blue — and darkening compresses the gap
between the two blues where brightening barely touches it. In relative luminance
the untinted pair sits 0.227 apart; the salt's PALE tint at 0.45 still leaves
0.160; this dark one at the same 0.45 would leave 0.081. **Half the affordance for
the same number.** At 0.35 it keeps 0.109.

**And the caps are a yellow-orange fly agaric** — *Amanita muscaria* var.
*guessowii*, a real colour morph of the same species. The objection this had to
clear was already written down: the dusk was on the red whitelist because "a
recoloured cap there would be the region joining in", the region's premise being
that the shapes are the ones you know. **That objection is about inventing a
mushroom and does not reach a VARIETY** — same dome, same white flecks, same
species, different morph. The list never asked "who may be red"; it asks "a region
that leaves this field blank is claiming to be a fly agaric host, and had better be
one." Declaring a cap has always exempted a row. The dusk stopped being blank.

- **The red was the lowest-contrast option on the table, which is the opposite of
  what it looks like.** Against this floor: red 1.90:1, orange 2.53:1, yellow
  4.23:1. It does not shout by being bright — it shouts because red sits about 80°
  from violet, close enough to muddle and too far to agree. Yellow fixes the hue
  and overshoots into being the loudest thing in the country. Orange reads as warm
  light in a cool world.
- **Noted and accepted**: the fireflies' note calls their ember "the only warm
  thing here". That was already untrue, since the caps have been warm since the
  region shipped, and the distinction that survives is the one that note itself
  draws — a cap is a pigment on the floor, an ember is drawn additively with a
  white core and flashes.

**And then the shore, which tinting the river is what exposed.** `BiomeDef.
sandTint`, the third and last of the dusk's exceptions.

**Sand was #ddca97 and nothing reached it** — 4.18:1 against this floor, the
brightest and warmest thing left in the country, lit by a sun that is not this
one. `waterTint` is water-only by design and `BIOME_GROUND` is `[GRASS, MUSHROOM]`,
so no existing rule could touch a beach.

**The rule it had to clear was already written and still stands.** "A region is
turf and what grows on it; it has no opinion about water, about paving, or about
anything a player made" — and "a fen has no opinion about a beach", which is
exactly right, because **a fen is a PLACE and a beach is not part of it. The dusk
is not a place.** It is the same country under a different light, which its own
row says out loud, and light falls on sand as surely as on grass. Snow got here
first on the same argument one step over: weather lies on things, and a bright
snowfield running into a warm sandbank was the fault that earned it. So the test
for any future row is whether its premise is the LIGHT — a region that wants this
because its beach would look nicer tinted has misread the field.

**IT IS COOLED, NOT DARKENED, and that is the whole of the tuning.** The obvious
move is to bring the sand down, and it cannot come down far — **because it is
coming down toward the water.** Untinted the shore sits 2.02:1 against the tinted
shallows; darken it a third and that is 1.30, half and it is 1.08, which is a beach
you cannot find the edge of. Same shape as the fen's floor a few hours earlier: **a
value on its way down passes through whatever was already below it**, and that is
now three times in one day.

So the fix is HUE. Warmth was what was actually shouting — R−B of 70 on a floor
whose R−B is −15 — and a pull toward pale violet takes that to 15 while the sand
only comes from 4.18 to 3.12 against the turf and keeps 1.51 against the water.

- **The test asserts both boundaries at once**, because a shore has two neighbours
  and is only a shore while it is legible against each. Anything checking one can
  be satisfied by a beach that has merged with the other.
- **And that nothing else moved**: a region declaring a sand tint must move its
  sand and nothing but, and every row that declares none is byte-identical to what
  it drew before the field existed.

**And the trees cast long shadows at one in the afternoon.** `BiomeDef.rake`, a
fraction of a sprite's own height, 0.55 here and 0 everywhere else.

**The question was whether the dusk could have a cuter canopy, and the answer is
that it should not — but that the wanting was right.** Four silhouettes were
sketched in the region's own inks (the current broadleaf, a gathered one, a parted
lantern, a second form) and **they all read the same**: at nineteen rows and seven
half-widths there is not enough silhouette space for a blob to become interesting.
Shape is not where this region's creativity lives.

**And a canopy of its own would have spent the thesis.** "The meadow's silhouette
exactly. Colour carries this one alone, deliberately: it is the shape you know,
which is what makes the colour unsettling instead of merely decorative" — said
again in the region header ("nothing is shaped oddly — that is the point") and
relied on by `palette.test.ts`, which grants the dusk the file's only
shared-outline exemption on exactly that ground.

**The region's grammar says where to spend it instead: the strangeness here is
always a FACT, never a shape.** Flowers that open at dusk, open at noon. Fireflies
at midday. A light that never changes. **A shadow at four in the afternoon, at
noon, is the same sentence in the same grammar** — and it is the most legible
evening cue there is, while leaving the tree the tree you know.

- **Every sprite or none.** Trees, saplings, shrubs and rocks all take it, which is
  the whole requirement rather than thoroughness: a wood where the trees have long
  shadows and the stones do not is a rendering bug, not an hour.
- **Direction is not a region's to choose.** Every crown in the file is lit from
  the upper left, so shadows fall down and to the right everywhere or there are two
  suns. Length is the only dial, and length is what "low" means. Two across for
  one down — a 45° diagonal at this size is a staircase.
- **Its own averaging, not `dial()`'s**, because the two defaults are opposite: a
  region silent about the season takes ALL of it, and a region silent about the
  light casts NO long shadow. Sharing the helper would have made silence mean
  "fully raked". Blended so the shadows shorten across the treeline instead of all
  standing up on one line.

**Then the shadow was the wrong shape, and the fix is what a shadow IS.** The
first version tapered from full width to a point, which was drawn from the idea
that a shadow fades with distance — **that is a speed line, not a shadow.** Nothing
about a tree is widest at the ground: the stem is thin and the crown is at the far
end, so the shadow has to be thin where it leaves the trunk and swell where the
canopy lands. A neck, then a head, ending blunt, because what lies furthest from
the tree is the TOP of the crown and a crown is not sharp.

It also explains what looked wrong before anyone worked out why. **A point is a
shape with a direction**, and a wedge narrowing away from the tree reads as
motion — the wood looked like it was travelling. Same length of ink, and it now
reads as an object.

**And the mushrooms rake now, which answers the other half.** Should the small
things have LONGER shadows? No — the physics is already doing that work correctly.
One sun elevation gives one ratio, so a 35px tree throws 19px and a 9px rock throws
5px, and a rock's short shadow is right rather than a shortfall. What was actually
wrong is that the mushroom was the one draw path that did not know about the rake
(its shadow is one row where every other sprite's is two, so it never went through
`footShadow`), which made it the one thing in the twilight country standing at
noon. Three pixels on a five-pixel cap: the same proportion the trees get.

**And then the field turned out to be backwards, which is the best thing that
happened to it.** `rake` shipped as "how long a shadow everything HERE casts",
default 0 — the twilight country had raked shadows and nowhere else did, because
nowhere else had asked. **A low sun is not a property of a place, it is a property
of an hour**, and every wood in the world has one at seven in the evening. Written
as a regional feature it would have had to be granted region by region, and every
region that never got it would have been a place where the sun does not set.

So the clock owns it — `sim/time.ts` §`rakeAt` — and the region field PINS it,
which is the same shape as `nightPull`: a row that states one is saying its light
does not keep the clock. The dusk states the horizon value and therefore stands in
a permanent late afternoon, at noon and at midnight both, which is the premise of
the place.

- **It shares `boundsAt` with `tintAt`**, so the two are one fact about the hour
  asked from opposite sides — that function says how much light there is, this
  says where it is coming from. An evening that draws in with the season draws its
  shadows out with it, and neither can drift from the other.
- **Squared, not linear**, because a body's shadow runs as cot θ: flat across the
  middle of the day, then up fast. A linear ramp puts a visible shadow on a two
  o'clock afternoon, which reads as a permanent late-day filter rather than as an
  hour passing. Nothing at lunchtime, something by mid-afternoon, long at supper.
- **Nothing at night, and that is a choice rather than a limit.** Moonlight does
  cast a shadow — a full moon throws one you can read by — and it is refused for
  the reason the fireflies are the dusk's only warm thing: the night budget is
  already spent on the wash and the lamps, and a second fainter set of shadows
  under both is detail nobody would attribute to the moon. **The contact shadow is
  not this and survives every hour**: it is not cast by anything, it is the dark
  where a thing meets the ground, and without it every sprite floats after sunset.

**The "weird grass artifacts" were the tuft speckle, and it was lit.** Reported by
eye, confirmed by measurement: at `#9b86c8` the speckle resolved to (150,139,181),
**2.26:1 ABOVE** a floor of (95,83,110). A single bright pixel on a large flat
field is not a plant — **it is a stuck pixel**, and the eye reads a screen fault
before it reads a species. The amount was never the problem; the direction was.

**And it was eating the region's flowers.** The night flowers are moon-pale
`#cfc8ea`, and they were competing with **8775 pixels of tuft against their own
963 — nine to one, in the same costume.** Nothing pale could read as a flower
while nine times as much pale was grass. So the speckle went UNDER the floor
instead of over it, to (72,62,86) at 1.40:1: texture in the ground rather than
marks on it. The flowers now have the only lit ink in the region to themselves, at
6.24:1 against the new speckle — **which was always the fiction.** This is a wood
where the light is wrong; the pale things in it are the ones that open at dusk,
and the grass is not one of them.

The single-pixel `dot` survives, because what made it read as a fault was the
LIGHT and not the size: a dark speck on a floor is a pebble or a shadow, which is
a thing, where a lit one is a dead pixel.

**Then the flowers themselves, which is the other half of "should it have
flowers?" — it had them and they were one pixel each.** The marks were a single
`o` on a stem, and the third had no flower at all, just a bare stem, which on this
floor is a two-pixel scratch. **"The plainest flower drawing in the file" had
quietly become the absent one.** Plain is a virtue; one pixel is not plain.

- **Three wide is the floor for a head anywhere in this file** — the kingcup needed
  five to enclose an eye, the poppy needed its second row full width to stop being
  a T. **Two rows is what keeps this from being that T**: a single row of colour
  over a stem is a signpost, which is exactly what the one-row sketch came out as.
- A 3×2 block is still the plainest drawing here. Nothing about it is odd, which is
  the requirement; it is simply large enough to see.
- Three heights and no other difference — **the same rule the lilies and the
  cattails both landed on the same day**: when a plant is one shape held up on a
  stalk, the stalk is the variable.

**The flowers are white campion, and naming them is what fixed them.** *Silene
latifolia* opens at dusk and closes in the morning — a real thing a real hedgerow
does — so it is the plant the region's joke is actually ABOUT. Here it is always
dusk, so it is always open, and nobody has to be told.

**And it moved out of `decor` into `bloom`, which is the correction.** It was
year-round, and that is a much larger claim than the region makes: **the trick
explains why the flowers are OPEN, not why they are in bloom in January.** The
hour here is fixed; the YEAR is not. Measured, the dusk takes the whole season
like everybody else and its crowns turn hard — `#454055` in July against
`#5f3650` in October, a plum-red wood. The ground barely moves (three RGB across
twelve months) because the region's own tint is doing 85% of the work, and that is
right: a violet floor staying violet is the point of the place. **So the year was
always there and the flowers were hiding it**, being the one thing on screen that
looked identical in every month. October now reads as October.

A wood that refused the calendar as well as the clock would stop being the mildest
strangeness in the far country and start being the strangest.

**A test had to be widened, and it counted the slot where it meant the floor.** It
asserted `bloom === undefined` for all three far regions, because "those regions
carry their strangeness in the air and the canopy, and a bloom is one more small
bright thing on floors that have enough." Right — and **the dusk satisfied it while
carrying pale flowers every day of the year in the other slot.** Rewritten as a
bloom the region now carries them three months and none for nine, **strictly less
of the thing the rule exists to prevent, and the old assertion would have refused
exactly that improvement.** It now counts how many kits put marks on the floor at
one moment: one is the ceiling out here, spendable on something year-round (the
glimmer, the glass) or on a season (the dusk) — never both.

**And then it still was not a flower, because a rule was defending an absence.**
"The plainest flower drawing in the file" was written to justify a single lit
pixel. The pixel became a 3×2 block on the argument that three wide is the floor
for a head — and **a block is not a flower either, it is a stamp.** Plain is a
virtue; minimal is a different one, and the row had been reading one as the other
since it was drawn. Three passes to notice, and it took somebody saying "this
isn't really a flower" out loud.

**So it is the shape everybody draws when they draw a flower**: five petals round
an enclosed centre, which is the kingcup's silhouette and its fourth deliberate
use. **Reuse is the strongest possible answer here and nowhere else** — this is
the region whose trees are the meadow's own broadleaf *because it is the shape you
know*, and the same sentence is why its flower should be the flower you know. A
campion that needed its own silhouette would be the region joining in, which is
the objection the fly agaric row had to clear a screen earlier for the same
reason.

- **Five wide, because the centre has to be enclosed and three cannot do it** —
  the kingcup's own finding, that at three wide petals all the way round a centre
  is a 3×3 block and reads as a TILE. Sketched against it: a two-row head came out
  a mushroom cap, a notched one came out the wood lily's star, and two cores came
  out a face.
- **The centre is dim rather than pale**, which is the poppy's finding ("a poppy's
  centre really is the darker part of it") and is true of the plant: what you see
  looking into a campion is where the petals converge on the calyx tube, and that
  is a shadow. A pale centre on a pale flower is no centre.

**Still open:** the trunks are (85,64,60), the one warm mass left in the region.

### The prickly pear (6 Aug 2026) — built

It went where it was always going to: the `shrubs` node, not `decor` (paint,
capped at 5x5, walkable — and a cactus you walk through is the one thing a cactus
must not be) and not a tree form (fellable for eight wood, and the girth rule).
The shrub node is already solid, already two wood, already the scrub's commonest
plant; this changes what it looks like and nothing else.

**New field: `BiomeDef.shrubShapes`**, a weighted list read exactly as
`stone.shapes` and `tufts` are — an entry written twice is drawn twice as often.
Absent, every bush is the generic dome, so no region that did not ask has moved.
The scrub is `bush` x7 + `pear`: shrubs cover about a tenth of its cells, so a
cactus lands roughly every eightieth — several per crossing, and the chaparral
does not become a desert. A test holds the odd plant to the minority for any
future row.

**The first draft was a saguaro.** Pads drawn three across by seven down are a
COLUMN, and a column with side branches is the other cactus — the one from the
cartoons. An Opuntia pad is a flat oval you could hold in two hands: seven across
by five down. The proportion is the entire species, so `palette.test.ts` asserts
it (widest row wider than the plant is tall) rather than leaving it to the eye,
along with the WAIST — two pads merged into one blob are a lumpy bush, and the
narrow join is what says they are separate flat things growing out of each other.

**It does not season, and it is the only plant in the region that does not.**
Everything else here browns with the ground and goes rust in October; a succulent
holds the same glaucous blue-green all twelve months.

**And it is separated by HUE, because luma had nowhere to go** — the first
region where that is true. Everything else drawn on a floor in this file was
pulled apart by VALUE (the harebell 52 below its grass, the poppy 45 above), and
that measurement is unavailable here. Measured across the year:

| | ground | shrub/tree | first pad green `#6f9070` vs shrub |
|---|---|---|---|
| spring | 153 | 121 | **+9** |
| summer | 181 | 116 | +14 |
| autumn | 181 | 103 | +27 |

Spring is the squeeze: 32 luma of room between the shrubs and the greened ground,
so ANY value lands within about 15 of something, and +9 is the poppy's failure
again. So the pads went cool and desaturated — `#7f9f92`, a grey-teal at 0.20 against
the shrubs' 0.45.

**Then the ground was fixed and the pads went green again** (`#79a173`, 0.29):
with 47 luma of room an honest green fits, 24 under the floor and 23 over the
shrubs — the exact middle, which is the best any green can do here. **It reads
softer than the grey-teal did**, and that is not a mistake in the numbers: a
colour at the mathematical optimum still has hue doing nothing for it, where the
teal was escaping through hue entirely. The green is the truer plant and the teal
is the more legible one; the pads are green because a cactus that read as
eucalyptus was the complaint. If legibility ever wins, `#7f9f92` is the value to
go back to.

**Two poses: leaning right and leaning left** — redrawn rather than mirrored,
because the light comes from the upper left everywhere, so a flipped sprite
arrives lit down its right side and reads as a plant with the sun behind it
standing beside plants with the sun in front. There is a test.

**A third pose was built and cut:** a single young pad, added to vary MASS where
these two vary only direction, which is the right argument. What killed it is
that a lone rounded lump on grass is a BOULDER, in the region carrying seventeen
stones to a screen. Standing it upright helped and did not fix it — at this size
the thing that says "cactus" is the JOIN between two pads, and a plant with one
pad has nothing to say it with. If a third pose ever arrives, varying mass is
still the right way to buy it.

**Expect to be asked why you can chop it for wood.** It is the shrub node, so it
yields the same two wood a bush does. The alternative was a new node class for
one plant.

## The conifers get branches, and a trunk you can see (7 Aug 2026)

The granite's pine, the redwoods and the giants all had the right bones and the
wrong canopy: a solid convex blob on a stick. Nothing was wrong with the colour
or the height. A crown written as a list of increasing half-widths is a convex
hull by construction, and a convex hull is a lozenge — which is a broadleaf's
silhouette wearing a conifer's palette.

**A conifer's outline is made of steps, not of a taper.** The widths now hold for
three to six rows and give a pixel BACK before the next tier steps out. That one
change is most of the fix, and it needs no new mechanism — the pinewood had been
drawn this way since it was written, which is why it was the only conifer in the
file that already read as one.

**The holds are uneven on purpose.** Equal ones are a ladder: the vertical form of
the per-cell edges band (CLAUDE.md), and it looked exactly as bad. Real whorls are
annual and the years are not the same length.

### `crownSpar` — the bole carried up into the crown

New field on `BiomeDef` (and on `TreeShape`, so a form may set its own). Pixels of
trunk drawn ABOVE the bare stem, inside the canopy. Three of these regions use it;
everything else is `undefined` and draws exactly what it drew before.

**It is drawn OVER the foliage, and it was built the other way first.** Behind the
crown a spar can only be seen through a `crownGaps` hole, and a gap is symmetric
about the trunk's column — so every width wide enough to read as a trunk also split
the canopy into two fringes stuck to the sides of a red post. Three goes at the
number, three times the same picture. The fault was never the number: a crown
parted down the middle is a parted crown, not a tree with its trunk in front of it.
(The gap rule in `palette.test.ts` was briefly relaxed to allow spar-backed
mid-crown gaps and has been put back; nothing needs it now.)

**Drawn flat over the crown it was a doorway** — a column of bark with a rounded
top standing in a green field, and every length of it read as one. What was missing
was that nothing passed IN FRONT of it.

**So the branch plates cross back over it, and they come off the silhouette rather
than a second table.** A row wider than the row above it is where a plate starts;
a plate sticking out of the tree is in front of the bole as much as it is out to
the sides, so those rows are drawn a second time, over the bark. Two rows to a
plate, not one — at one the bands were wire around a post. The banding lands
exactly where the tiers are and the two can never drift apart, because they are the
same numbers.

**The bole inside the crown is pulled a third toward the crown's ink.** Bark at its
own brightness inside a canopy comes forward, which is backwards for the one part
of a trunk with a whole tree's foliage over it.

**`sparHalf` holds full width for two thirds and gives it all up in the last
third.** Linear over the whole length drew a perfect triangle — a fin. A bole does
not narrow appreciably over the few metres of it you can see, and what ends it is
the foliage closing over.

### The crown breaks, and each plate is its own band (7 Aug 2026)

The second half of the same afternoon, decided against a photograph of an
open-grown redwood. Tiering the outline and banding the bole got most of the way
and then stopped: the crown was still one continuous mass, so the tree read as a
green sleeve with bark drawn through it.

**A zero in `crownRows` is now a break between two limb masses** — nothing drawn
on that row, bark up the middle, open sky either side. A conifer's crown close up
is not one outline; it is separate branch plates hung off a bole with daylight
between them, and while every row had to carry foliage these trees could only ever
be lozenges however carefully their widths were stepped.

**It is legal exactly where the spar reaches, and never on row zero.** An empty row
with foliage above and below and nothing between is a tree cut in half and left
floating; the bark is what carries the eye across. Same shape of rule as the gap
rule, same test.

**Uniform bands are pancakes.** The first pass made every break one row and every
band the same width, and it read as a stack of slices. Bands now vary in height
(2–5 rows) and in width (3 to full), with a dense unbroken mass over the top third
— which is where the photograph has one too.

**The foliage came a long way down the bole.** Granite 20 → 14 of bare stem,
redwoods 30 → 20, giants 40 → 34. Every one of those trees stands as tall as it
did; the crown starts lower and the trunk shows BETWEEN the plates rather than only
under them. The old numbers were the lollipop being paid for twice — a small crown
perched on a lot of pole.

### Settled here, don't relitigate

- **Second forms for the granite and the redwoods.** The dome pine that lost its
  leader (broad, flat-headed, longer bole) and the old redwood that lost its spire.
  Both obey the species rule: same width at the shoulder, differing only in what
  has happened to them.
- **The giants are bushier, and bushier is a SHAPE.** Longer holds between steps
  and one-pixel pull-backs, against the coast redwood's narrow stepped taper. Not a
  bigger number — they were already at the 8 ceiling.
- **A spar is capped at two thirds of its own crown** (`palette.test.ts`). Past that
  there is no canopy over the bark and the tree stops closing at the top.

### Boughs: the crown gets an asymmetric mass (8 Aug 2026)

`crownRows` is half-widths, so a crown drawn from it is symmetric about the trunk
BY CONSTRUCTION — that is what a half-width is. It can draw a tree that is the
same on both sides and it can draw nothing else. Tiering it and breaking it got
the trunk showing and still drew a stack of symmetric bands, because symmetric
bands were the only thing available.

**`crownBoughs` is a list of puffs**: a crown row to hang from, a signed offset
(the sign is the side), and a size off a four-entry shape table. Each is drawn as
a small round mass with a **one-pixel limb** running back to the bark — without
the limb it is a cloud parked beside a tree rather than a tree holding one up.

**Drawn over the spar, and the order is the point.** A limb springs from the
trunk, so where it meets the bark it is in front of it; under the spar each puff
came out stuck to the side of the tree with a red stripe between it and the trunk
it was supposed to be growing out of.

**A bough needs bark behind it**, checked against the same taper the renderer
draws with — a bough in mid-air is the break bug wearing a rounder hat. And it
gets its own reach ceiling of 11 half-widths rather than an exemption from the
crown's 8, which only the giants can afford at 1.1× density.

**The spar cap changed shape.** It was "two thirds of the crown", which was a
proxy for "the tree closes at the top" and stopped implying it once a crown could
be mostly breaks: the giants carry a solid head over twenty-odd empty rows, all
of which need bark behind them. Now asserted directly — a spar may not reach
row 1.

### The granite is settled (8 Aug 2026)

Form zero is the tiered spire; the second form is **the open one** — tiered the
whole way down, more air than foliage in the bottom half, the shortest stem of any
conifer here. It won a sheet of six against the flat-topped pine that had shipped
for a day.

The flat top was the better STORY (a leader killed by lightning, which is what
happens at altitude) and read as a shrub on a post: the crown was too small a
share of the tree for the plates to say anything. Kept in `tree-options.ts` rather
than deleted — it may come back on a taller stem.

### All three settled, and the bole stopped running out (8 Aug 2026)

**The granite** — the tiered spire, and the OPEN one beside it.
**The redwoods** — the tiered spire, and the HEAVY one beside it: form zero with
the air taken out, deeper plates, less trunk between. It won over four louder
ideas (a narrow grove tree, a limbed one, a candelabra with a forked top, a
veteran with its crown at the very top of a long bole). Every one of those was a
better drawing alone and every one changed what the WOOD is. A second form gives a
stand a history; it is not a second species to notice.
**The giants** — a red column with seven limbs on it, off a reference drawing.
Eight solid rows of head and then twenty-six rows of nothing but boughs and bark:
the emptiest silhouette in the file on the biggest tree in it, which is the right
way round for the row whose whole claim is "the trunk you cannot get round".

**And `sparHalf` stopped tapering to a point.** Three versions, and the first two
were the same mistake at different rates — linear over the whole spar drew a fin,
holding two thirds and dropping the rest ended the trunk in a point somewhere
inside the canopy. Both are wrong the same way: a bole does not stop. It narrows,
then goes up BEHIND the limbs until foliage hides it. What ends a trunk on screen
is something in front of it, never the trunk running out — bark fading to nothing
halfway up its own crown reads as a trunk that was drawn and then rubbed out.

It now gives up half its width over the whole spar and no more. The blunt top is
covered, and `palette.test.ts` requires the crown row it stops on to be solid
foliage, which is the closure rule stated where it actually bites.

### The rule the spar was looking for all along (8 Aug 2026)

Four arrangements of the bole, and the fourth is the one to keep:

1. **Behind the foliage**, seen through `crownGaps`. A gap is symmetric about the
   trunk, so every width that showed enough bark split the canopy into two fringes
   stuck to a red post.
2. **Flat over the foliage.** A column of bark with a rounded top standing in a
   green field reads as a doorway cut into the tree — nothing passes in front of
   it.
3. **Over the foliage, with the branch plates drawn back over the bark.** Right,
   and an approximation of (4). It banded the trunk where the tiers were — and
   then the boughs arrived and painted over the bole wholesale, because a puff is
   four or five pixels of foliage either side of a limb and seven of them cover a
   trunk between them. The sequoia came back as a stack of leaves with a stump
   under it.
4. **Bark shows exactly where there is no foliage in front of it.** The spar is
   drawn after every green thing on the tree and skips any row whose crown row is
   solid. On a tiered conifer the breaks band it, exactly as (3) did. On a sequoia,
   whose crown is nearly all breaks, the bole simply runs the whole height with the
   limbs hung off it. Which is what a trunk does.

**The boughs went under the spar, and further out.** They were over it on the
argument that a limb springs from the trunk and so is in front of it where they
meet — true of one limb and useless with seven. And the bough ceiling went from 11
to 13: the bole is drawn in front of them and eats four pixels off the inner end of
every puff, so a bough has to clear the trunk before it is a bough at all. Only
this tree's proportions could have taught that — nine pixels of bark is most of a
small crown.

### The redwoods lose their breaks: what one tree cannot show you (8 Aug 2026)

The single most useful finding of the whole pass, and it cost a day to see because
it is invisible on the instrument built to judge trees.

**A break is a horizontal bar of ground colour across a green mass.** One of them
reads as a gap you can see the trunk through — which is what every contact sheet
in this pass showed, one tree at a time on cleared ground, and it looked like the
best drawing in the file. Sixty of them, on trees 2.4 to the cell with their crowns
overlapping, read as **stripes**: the wood came out as a screen of dark green
segments with brown slits between them.

That is the per-cell edges band (CLAUDE.md) arriving by a route the rule does not
cover. It is not tied to the tile grid — it is tied to the SPRITE, and a dense
enough stand of one sprite IS a grid. Worth adding to the instinct: any repeated
horizontal feature inside a repeated sprite is a candidate, at that sprite's
density and no lower.

**So the redwoods went back to solid tiered crowns** — the pinewood's own tier
language drawn narrow. The pinewood stands at 1.4 with no breaks and has always
read perfectly; the steps do everything an outline can do. The region's sentence
about bark is carried where it always was, on the long bare bole underneath.

**The giants keep the breaks and the boughs**, and the reason is density and
nothing else: at 1.1, widely spaced, each tree is a thing you look AT rather than
a texture you look THROUGH. Same mechanism, opposite verdict, and the number that
decides it is `trees`.

**Method, for next time: shoot `/biomes.html` before believing `/trees.html`.**
One shows you a specimen and the other shows you a place. This failure was
invisible at every zoom on the specimen page and obvious in a single swatch on the
other. `scripts/shot-wood.mjs` is that shutter, and it exists because of this.

**And the pair is now an age gap.** The second redwood is the first one OLD: seven
half-widths at the shoulder against six (the most §crownAlt's species rule allows,
and the right pixel to spend — a redwood does not get much broader with age, it has
no room to, but it gets broad enough that you can tell which trees have been there
longest), and six rows of crown standing beside the trunk instead of three. Sixteen
pixels of bare bole against the young tree's twenty-three. They stand within a pixel
of each other, so the canopy is level and the whole difference is where the mass
sits.

### The trunk is one material (8 Aug 2026)

The bole inside the crown was drawn pulled a third toward the foliage's ink, on the
reasoning that it is the one part of the trunk with a whole tree's shade over it.
True about the light, false about what you are looking at. It is ONE TRUNK, and
shaded, the upper half stopped reading as the same object as the lower — not "in
shadow" but missing, with a dark stripe standing in for it. A material that changes
colour halfway up is two materials. The fluting goes up with it too, for the same
reason in texture.

### `/trees.html` — the instrument

`src/tools/tree-preview.ts` plus `scripts/shot-trees.mjs`, the sibling of
`/biomes.html` aimed one level in. A swatch shows two or three trees, wherever the
generator put them, in whatever form the tile hash rolled; a silhouette being tuned
needs every form of the species side by side on cleared ground. So the page plants
them — it finds the region, clears a band, and searches for the tile positions
whose form hash lands on the form it wants. Everything else is the real generator,
the real renderer, the real palette.

Both `--when winter` and the far-region search were used in this pass; the giants
are not on every seed, which the page says rather than drawing the wrong tree.

## The granite goes grey, gets a dome, and flowers once (9 Aug 2026)

Asked why the rock looked a little green, and the photograph agreed: the turf
measured (158,162,142) — green channel highest, blue twenty under, which is
olive, and olive over turf reads as green however little of it there is. The
whole family was grey-GREEN and had been since the row was written.

### Settled here, don't relitigate

- **Rock does not get greener, and that is a rule about the MIDDLE of the region
  as well as its border.** `edge: "outcrop"` already said it about the seam. The
  five colours now say it about the ground: `ground`, `tuft`, both `sheet` inks
  and `decor.accent`, which was the sheet's old olive left behind on marks the
  kit calls "chips off the sheet".
- **The tint leans blue over green to cancel a leak, not to be cool.** `ground`
  sits at `amount: 0.95` and what gets past it is grass at `#8bbf5a`, which
  arrives green. Blue a hair above green in the DEF is what lands neutral on the
  SCREEN. The `sheet` inks are at `amount: 1` and therefore state the answer
  flat with no lean — copying the ground's lean there would be a real cool cast
  rather than a correction. If you ever change `sheet.ground.amount` off 1, the
  lean has to come back with it.
- **Warm, by red only.** Dead neutral photographed as overcast — battleship, on
  the region whose own note is "high open country with the light full on it".
  Four points of red back in lands feldspar's pink-grey. Warmth by dropping
  BLUE is the yellow axis, which is how the row got to sage in the first place;
  that direction is closed.
- **A `dome` is a different rock, not a bigger one.** New in `ROCK_SHAPES`,
  fourteen pixels wide on a sixteen pixel tile — the only stone that fills the
  ground it stands on. It is safe at that width because two rocks may never
  share an edge (`rockIsLoneliest`); diagonals are legal and are sixteen apart
  on both axes. Every other shape in that table was sized under a caution that
  turns out not to apply, so a future big shape does not need to re-derive this.
  The granite draws `["slab", "slab", "dome"]` — still two shapes, which is the
  row's own count, and `rocks: 4.5` was left alone because on screen the mix
  does not crowd.
- **One flowering season is the point, not a shortage of ideas.** Pussypaws, in
  summer, and nothing the rest of the year. Every other blooming region gets two
  or three and the meadow's clover is there all year; a region that flowers for
  one month is the only thing in the file that says the year is short up here.
- **A three-pixel mark needs a value difference INSIDE it, not just against the
  ground.** The harebell's rule — value carries a small mark, not hue — is right
  and incomplete. This region has TWO grounds (turf at luma 165, sheet at 190),
  so one ink clears them by different margins and reads as a speck on the paler
  one. The fix is `accent` #b4506e UNDER both and `core` #f2dce4 OVER both, so
  the mark cannot disappear into anything it lands on. Reach for the pair
  whenever a kit has to work on a region with a `sheet`.
- **The flowers have no stems on purpose, and legibility is not the reason to
  add one.** Pussypaws has no stalk and the granite has no vertical silhouette —
  a stem would have added the missing dark anchor by accident while contradicting
  both. The anchor is the flower's own dark ring.
- **A bloom's `x` takes the region's CANOPY.** Caught on screen and worth
  writing down because the field's default is invisible in the table: the first
  cut put an `x` at the flower's centre for the rosette and every mark came out
  with a dark pine-green pixel in it — the one saturated green in a region built
  on having none. The kit is all `o` now. Reach for `stem` or drop the `x`
  whenever a kit's plant is not the colour of the tree above it.

## The sun rises now (9 Aug 2026)

`rakeAt` returned a LENGTH and the draw paths hard-coded the direction, so every
shadow in the game fell down-and-to-the-right at every hour. The sun set twice a
day and never rose, and seven in the morning photographed as seven in the
evening — which nothing else on screen could contradict, because `tintAt` is
very nearly symmetric about noon by construction.

The function's own note had the bug written into it: *"dawn and dusk are the
same geometry pointed opposite ways, and the direction is not ours to vary"*.
First half right, second half the fault. `footShadow`'s note made the same
argument from the key light, and `sim/time.test.ts` asserted
`rakeAt(19) ≈ rakeAt(6)` on the raw values, which passed happily.

### Settled here, don't relitigate

- **`rakeAt` is signed, and the sign is a compass.** Negative is west (morning),
  positive is east (afternoon). Consumers take `Math.abs` for length and
  `Math.sign` for side. `BiomeDef.rake` is signed with it, so a region may now
  pin which side of noon it is stuck on — the dusk's `+0.55` is a permanent late
  afternoon, and a `-0.55` region would be a permanent early morning, which is a
  place this file does not have and could.
- **The key light does NOT swing with it.** Every sprite stays lit from the upper
  left. A highlight is one or two pixels and flipping it at noon would pop — the
  sides would swap in a frame with nothing to cover the change. The cast shadow
  can swing precisely because it is SHORTEST at the crossover, so the direction
  turns while there is nothing there to see turn. Fixed key light, travelling
  shadow, which is the ordinary pixel-art bargain.
- **Mirroring a wedge is about which EDGE is pinned.** The mushroom's shadow
  converges toward its far side, so going west pins the left edge at `x` and
  going east pins the right at `x + w`. Offsetting the whole row instead slides
  the shadow off the cap.
- **Photograph one world at two hours, not two worlds.** The first check drove
  the harness twice and got two seeds, so the morning shot had no trees in it and
  read as "no shadows at all". `page.clock.setFixedTime` between two shots in one
  session is the way to change only the sun. When a direction is still ambiguous
  at a glance, measure it — mean ground luma in a box either side of each trunk
  base settled this in one command.

## The long grass flowers all year (9 Aug 2026)

The region had one bloom — asters, in October — and three empty seasons. Four
screenshots of one spot with only the clock moved is what settled it: **spring
and summer were the same photograph as each other**, grass and bushes and
waxcaps, the only difference being a few strays bleeding across the blend from
the meadow next door. A region with no trees to turn, no rock to catch light and
no water in it has the ground and nothing but the ground, so a season with no
bloom is a season the row cannot express at all.

It now has four, which no other row here does. Spring: **prairie smoke**, nodding
dusky-rose bells. Summer: the **pale coneflower** the row started as, before the
asters took its month. Autumn: the asters, untouched. Winter: **what is left of
all three**, standing in the snow.

### Settled here, don't relitigate

- **The winter entry is in `bloom`, not `decor`, and that is the whole trick.**
  The year-round kit is thinned under snow (`stubble`, and the renderer's
  `buriedKit`) because clover and litter are what a snowfall COVERS. A seed head
  is the opposite — it is what you can still see when everything else is buried,
  and it is the only reason a winter field is worth crossing. So it goes in the
  slot nothing thins. The renderer's old note there said "nothing flowers in
  January", which was a true sentence standing in for a rule; the rule is that
  this slot draws what stands ABOVE the snow.
- **Dark ink, because the snow is `#e7ebe5`.** Every other bloom in the file is
  pale or bright and every one of them would vanish. The winter kit is the only
  set of marks here chosen to read against white rather than against green.
- **A head on a bare stalk is a CRUCIFIX, and it took two screenshots to see it
  twice.** Both winter marks were drawn as a small head over a long stem — a
  three-wide bar with a pixel above and below — and a field of them is a war
  cemetery. It happened again from the other direction with a diamond, which is
  a plus sign with a foot. The fix is proportion, not shape: **heads are solid
  blocks two or three rows deep, and no row is narrower than the one above it
  except at the very bottom.** Dead vegetation is top-heavy; a cross cannot be.
- **A mushroom is wide on top, so a flower here must not be.** The coneflower's
  first cut was the aster upside down — a rust block with two pale pixels at its
  shoulders — and it photographed as a brown cap on a stalk, in the one region
  that actually grows a brown cap on a stalk (its waxcaps). Two passes fixed it:
  the cone became a narrow peak, and the rays became **an unbroken pale row
  WIDER than the rust above it**. Two pale pixels tucked under a cap are a
  mushroom's stem-and-ring; four in a row under a peak are a skirt.
- **Pale, not purple, and that is why it is *Echinacea pallida*.** A region may
  not have the same colour twice in one year and expect anybody to notice the
  second one. The autumn asters own purple here, so the summer coneflower is the
  tallgrass species with cream rays — which is also the honest one for this
  ground.
- **Spring hangs, which is why it is prairie smoke and not a pasqueflower.** The
  pasqueflower is the other honest May answer out here and it is a purple
  upright head one season from the asters — the same objection the asters
  themselves were written to clear. A nodding head puts its ink BESIDE the stem,
  which is a silhouette free at three pixels and one only the birches' harebell
  otherwise has.
- **`core` above `accent`, once.** Prairie smoke's calyx is maroon and the petal
  tips inside it are rose, so this is the one kit in the file with its dark ink
  over its bright one. It is the one flower whose face points at the ground.
- **Densities: 0.14 spring, 0.11 summer, 0.11 autumn, 0.10 winter.** Spring is
  the most generous because a prairie in May is short and green with nothing
  standing in it yet — the one month where the flowers may BE the ground cover.
  Winter is the sparsest because the picture that season already makes is the
  grass itself out of the white (`stubble` 0.38, the highest in the file); these
  are what is left among it, not a fourth flowering.
- **No lopsided mark, in this kit or any other.** The coneflower shipped with a
  third mark whose rays were on one side only, on the argument that a stand of
  these is never symmetrical. On screen it does not read as a flower leaning, it
  reads as a flower with a petal MISSING — damage rather than variety, which is
  the meadow's lit-clover finding arrived at from a different direction. A plant
  may differ from its neighbour in height, in age and in how far its rays have
  dropped. It may not differ by being broken. The third mark is an older plant
  whose cone has drawn out instead.
- **The region has trees, and the question comes up every time.** `trees: 0.04`
  — a lone bur oak, one per screen and a half by design, so a given frame often
  has none. It is not a shrubland; it has three scales of plant (tussock, bush,
  tree) and that is still more than any other row in the file.

## The cherry gets its bean back (9 Aug 2026)

Reported as "the canopy used to be almost bean shaped and super cute, and that
got messed up when we boosted tree size" — and the history says exactly that.
Before 2 Aug the crown was `[4, 7, 8, 8, 8, 8, 8, 8, 8, 7, 6]`: eleven rows,
tapered at BOTH ends, bottom three notched, wider than it was tall. "Trees stand
up" resampled every region's crown to the new height and this one came out
`[5, 7, 8 ×15, 7]` — **the bottom taper flattened into the middle**, so the crown
ran full width from its third row to its last. What shipped for a week was a
pink box with the corners off.

The row's own comment predicted it in as many words — *"at fourteen rows the same
16px of width came out as a tall pink box with a slot cut in it. Wide is a ratio,
not a number"* — and nobody read it, because the change came from a resample
rather than from an author.

### Settled here, don't relitigate

- **A crown may not exceed 8 half-widths, so "wider" was never on the table.**
  `render/palette.test.ts`: past a tile wide a tree draws over its neighbours'
  trunks, and this region plants in close rows. The ratio can therefore only be
  recovered by making the crown SHORTER — and since the tree's height is
  `rows + trunkHeight - overlap`, every crown row spent on the bean comes back
  as bare bole. That trade is the whole decision.
- **ROUND ONE HELD THE HEIGHT FIXED AND THAT WAS THE WRONG CONSTRAINT.** Four
  candidates all pinned at 31px; the big crown won on the argument that the
  alternatives read as an orchard tree with a clear stem. It shipped and was
  still wrong — *"it's just not as cute as I want it to be"* — because with the
  width capped, **"wider than tall" has exactly one spelling, which is FEWER
  ROWS**, and holding the total height fixed means every row taken off the crown
  reappears as bare bole. Of course they all read as a stem with something on it:
  that is the only thing that constraint could produce.

  **Round two let the tree get shorter.** Twelve rows, 17 wide, and it is six
  pixels shorter than what it replaced. The test that decided it: everything cute
  in this game is the same shape — the player, the shrubs, the mushroom cap are
  all a rounded mass wider than it is tall on a small stem.
- **The crown may not swallow the trunk, and `crownOverlap` is where that lives.**
  The winning candidate came down six rows around the bark and was reported
  immediately: the stem disappears into the mass and comes out as a stub, which
  is a mushroom's arrangement rather than a tree's. Three — the pre-boost number.
  Note the notch caps out with it: a gap is only legal beside the trunk, so
  overlap 3 means at most three gapped rows, whatever anybody would prefer.
- **The stem came down too, and it is a deliberate override of the scale rule.**
  A 25px tree was held for one pass on the argument that a tree must out-top a
  villager — *"the tallest thing in a wood was exactly as tall as a garden
  wall"*, the complaint that caused "Trees stand up". Overruled on the grounds
  that an orchard cherry is pruned short and wide, and the row now stands 23
  against a villager's 16: the smallest margin in the file. It survives because
  this is a SITED destination of one species (nothing generalises to the wood you
  live in), because the crown is the widest here so it still reads as a canopy,
  and because the region's edge conifers put something correctly-scaled in frame.
  **Revertible with one number** — `trunkHeight` back to 16 — since a silhouette
  is generated and no save carries it. `trunkHeight` is now STATED on this row
  rather than inherited, because the stem is what carries the scale.
- **"SIZE THE WHOLE THING UP 10%" WAS BUILT AND HALF OF IT WAS REJECTED BY THE
  SCREEN.** 13 rows, 9 half-widths, a 13px stem — and the dense rows FUSED. At
  19px on a 16px tile, crowns in a region planted at `trees: 2.6` meet edge to
  edge, and a rank of five comes out as one unbroken pink slab with five trunks
  under it. That is precisely what the 8-half-width cap in
  `render/palette.test.ts` is for ("a stand becomes a smear"), and this is the
  worst region in the game to test it in: the densest planting there is, where
  legibility of the single tree is what the whole pass has been buying.

  So the ten percent went on HEIGHT alone — one crown row and one pixel of stem,
  17 wide as before. **Wider is not available on this row at any amount**, and
  the only lever that would make it available is the region's own density, which
  is what an orchard IS.
- **Photograph a short tree in the REGION, not on `/trees.html`.** Both
  corrections above were invisible on the card — one tree on cleared ground says
  nothing about how it stands next to a villager, or about whether forty of them
  in rows read as an orchard or as a smear. Same lesson the redwoods' withdrawn
  candidates left on that page.
- **Five gapped rows, not three, and the number is proportional rather than
  chosen.** Three of eleven rows was a bit over a quarter of the old crown; three
  of eighteen is a sixth, and a dip that shallow on a crown this tall is a slot
  rather than an underside.
- **`crownOverlap` moves with `crownGaps`, always.** A gap is only legal on a row
  standing beside the trunk — anywhere else it is a hole punched in the foliage,
  and `render/palette.test.ts` checks precisely that. Five notched rows needs
  five rows of overlap, which costs the tree two pixels of height. That is the
  whole price of the shape.
- **A NOTCH OF 2 IS THE TRUNK. `1` IS A LEFTOVER FROM WHEN STEMS WERE 3px WIDE,
  AND IT IS WRONG IN SIX MORE ROWS.** Reported as "the notch looks a little
  crazy", and it was really the TRUNK being pinched: a gap of `g` clears
  `2g + 1` pixels and `trunkSpan` gives a stem of `5 + girth * 2`, so at `g: 1`
  the crown's bottom rows draw over the outer column of bark on each side. The
  trunk comes out of the foliage three wide, leaves it five wide, and has a step
  at the crown's edge. The `crownGaps` doc said "1 is the trunk exactly" and was
  true until 2 Aug, when "Trees stand up" took stems from three pixels to five
  and left every gap in the file where it was.

  **`trunkSpan`'s own note says this has now happened three times** — "broken
  twice by someone making the trees bigger (once the crown, once the stem)" —
  so the rule is written in both places now: any change to stem width or crown
  scale sweeps `crownGaps` with it.

  **And the top row of the parting keeps its 1, which is the scrub's finding and
  NOT the bug.** Flush at 2 all the way up, the gap is a clean rectangle taken out
  of the crown, and a rectangle is a thing somebody made; one row at 1 leaves the
  outer column of bark covered on each side, so a single pixel of foliage laps the
  trunk at each top corner and the right angle becomes a leaf resting on a branch.
  Lapping the bark for one row is a tree growing round its own stem; lapping it
  all the way down is a crown lying across one. The cherry reads `1, 2, 2, 2, 2`.

  **So the rule is "no row reaches 2", not "a row is 1".** That corrects the first
  version of this note, which listed six rows as unswept and was counting the
  deliberate ones: `scrub` (…1, 2, 2), `fen` (…1, 2, 2, 3, 3, 4) and `birch`
  (…1, 1, 2, 2) all part properly and are fine. **The three actually pinched are
  the flat ones — `salt` (…1, 1, 1), `marsh` (…1, 1) and `cinder`/`caldera`
  (…1, 1)** — whose notches never reach the trunk's width at all. Each is a
  one-line change and none has been photographed yet.
- **The method: a resample is not an author.** Every other region's crown went
  through the same 2 Aug stretch, and this is the first one anybody has looked at
  since. If a row's silhouette has a note explaining what its proportions are
  FOR, that note is a test the resample was never run against — worth re-reading
  the other rows' notes before assuming they survived it.

## Landscaping: plants you put in the ground (parked, 9 Aug 2026)

**Nothing here is built.** This is a conversation written down so it survives,
and the next person to open it should read it before proposing an orchard.

**It began as "can we add an apple orchard?" and that was the wrong question.**
A sited region of apple trees is three days' work and the machinery is all
there — but an apple hanging in a crown is the one thing this file has refused
twice in writing. `orbs`: *"a round pale thing hanging in a tree reads as
pickable, and walking under it to find that ACT does nothing is a promise the
game made and broke."* `berries`: *"expect to be asked why you cannot pick
them."* Adding a whole region of the most pickable-looking paint in the game
would have been the third refusal, and a louder one.

**The real question is whether fruiting plants should be PLANTABLE, and the
answer is yes — as a BUILD system rather than a farm one.** Asked for
explicitly: *"you should be able to landscape with bushes and trees and plants
like the Sims."* Landscaping is the point; fruit is a thing some of the plants
happen to do.

### Why this shape and not the other one

- **It puts the feature next to machinery that works.** A placed bush is much
  closer to furniture and structures — placement, persistence, a migration —
  than to crops. Those patterns are in the repo already.
- **It is the strongest fit for the game's own clock.** DESIGN: real time gates
  the living world, never the player's hands. An annual crop says that at a
  three-day scale; a bush that comes back every summer says it at a YEAR scale,
  in a town people were sent to retire in. Nothing else here reaches for that.
- **AND IT RESOLVES THE WILD-FRUIT TENSION IN THE RIGHT DIRECTION, which is the
  best thing about it.** If PLANTING is what makes fruit pickable, the wild
  berries stay paint for a real reason rather than an apologetic one — the
  country gates nothing, and what you can pick came off your own ground. The
  orchard question then answers itself: a region is scenery, and the fruit you
  get is one you put in.

### The one architectural move

**Tree species live on `BiomeDef` and would have to stop.** `crownRows`,
`crownGaps`, `trunkHeight`, `crownAlt` and `shrubShapes` are all fields of a
REGION, and `treeForms(biome)` is the only thing that knows how to read them. A
tree you can carry home has no region. Species become their own content table and
regions reference them by id.

**AND SPECIES SHOULD NOT BELONG TO REGIONS AT ALL** — asked for directly: *"the
meadow having apples or the pines having blueberries are just cute adds."* A
region does not OWN a silhouette; it plants a mixture. This is already half-true
and nobody noticed: `shrubShapes` is exactly that list today, with the rule
written on it — *"keep the unusual one in the minority... if every bush in the
scrub were a cactus the region would stop being chaparral and start being
desert."* Bushes got a catalogue and a weighting. Trees never did, and the
refactor is mostly giving trees what shrubs already have. DESIGN agrees in
advance: *"a region is a mixture, not a demonstration."*

**One rule has to be amended for it, and it should be amended on purpose rather
than drifted past.** `crownAlt` currently says: *"TWO, AND THE SAME SPECIES
TWICE. Not two species: the silhouette is how a region says which region it is
(colour alone left the pines reading as a dark meadow), so a stand with two
unrelated outlines in it stops being anywhere."* That forbids apples in the
meadow by name.

The rule is right about its evidence and too strong in its conclusion. What the
dark-meadow finding proves is that **silhouette carries identity** — not that a
region may hold only one. The amendment that keeps the finding and allows the
cute adds is a RATE, which is how the shrub doc already reasons: **a dominant
species, or two forms of one, carries the region; guests are allowed in the
minority.** An apple at 3% in the meadow is something you come across. Apples at
40% and the meadow is an orchard. Per CLAUDE.md the doc gets reconciled before
any code — this paragraph is not that reconciliation, it is the argument for it.

That is a refactor rather than an addition, and it is the good kind: **the art
already exists.** Twenty-odd silhouettes drawn over the last month — the bur oak,
the cherry, the birch, the coast live oak, the blueberry, the thorn, the prickly
pear — are currently visible only where the field happens to put them. Making
them plantable turns the regions into a CATALOGUE you walk through: see a tree in
the country, want one, come back with it. Exploring feeds building, at no art
cost at all.

### Held firm

- **Fruit may never be a material or a required input.** The moment an apple is
  needed for a recipe the country gates building again — *"walk two hundred tiles
  or no pink house"*, DESIGN §Biomes. Fruit goes to gifts, `tastes`, festivals and
  the museum: sinks that already exist and that nothing depends on.
- **No caps, like everything else.** No plot limit, no trees-per-day. If plants
  cost anything it is the ordinary materials, and the real cost is the space.
- **UNLOCKS ARE ALLOWED AND MUST STAY COSMETIC** — asked for, and the example was
  fruit-shaped furniture for growing or finding a fruit. This is exactly the
  friendship-finish rule (§"Finishes people give you"): *"the mechanism can never
  become a gate... a player who never warms to anybody loses two colours and not
  one thing they can do."* A novelty chair costs nothing to place and no
  commission, room or acceptance test asks what shape a chair is.

  **It would be a THIRD unlock channel, and the channels are told apart by who
  caused it** (`app.ts`' rule). You FOUND it — silent. A person GAVE it to you —
  they say something, then you see what they meant. This one is neither: you grew
  it, over a season, and the game noticed. That wants its own register and it is
  the interesting writing problem in the whole feature.

### One system, not two: everything green is BUILT

Asked as a real fork — *"are these things you plant or things you build?"* — with
the proposal that environmental plants live in a build-menu outdoors category and
fruit trees are plantables, and the worry attached: *"I don't want it to be too
confusing."* That worry is the right instinct and it settles it.

- **The test is whether a player can predict where a thing lives.** "Anything you
  put on your land is in build" holds. "Trees are in build unless they fruit, in
  which case they are in the farm menu" does not — the difference is invisible
  until after you have learned it, and both are a tree you put in your garden.
- **So the placement grammar is one: build mode, an outdoors category, then
  trees / bushes / flowers.** The ones you have met are there and the ones you
  have not are simply absent — see the no-checklist rule below, which this is the
  main application of.
- **FRUITING IS A PROPERTY, NOT A CATEGORY.** You build an apple tree and it
  fruits in autumn because that is what apple trees do. It teaches itself by being
  watched, which is how everything else here works; nothing should have to route
  the player through a different menu to say "this one is alive".
- **If the planting FEEL is wanted, give it to every plant rather than to four.**
  Everything goes in small and fills out over a few days. One rule, uniformly
  applied, and the garden reads as grown rather than assembled — with no second
  placement grammar to learn. This is the one live decision in this section:
  instant trees are more satisfying to PLACE, growing trees are more satisfying to
  HAVE. Leaning growing, and fast — days, never seasons (see the clock note).

**AND THIS IS WHAT RESCUES THE APPLE ORCHARD.** If seeing is what unlocks, apples
must exist somewhere in the world to be met. So the orchard comes back — **not as
a place you harvest, but as the place you learn apples exist.** Its fruit stays
paint, exactly like the blueberries, and yours fruits because it is yours. That is
"planting is what makes fruit pickable" enacted in geography rather than asserted
in a doc, and it is the answer to the question this whole note started as.

### The verb review (Fable, 9 Aug 2026) — and the three concerns raised against it

The ACT/BUILD/GROW three-mode proposal went to a design review and came back
corrected: **the taxonomy is right and the mode count is wrong.** Two modes,
current names. The settled shape:

- **GARDEN is a landing-row group inside BUILD**, beside Wall and Furniture,
  opening Crops / Trees / Bushes / Flowers / Grass — the same two-level move
  furniture already made. A third mode with the identical touch grammar (tap
  places, drag paints) would be a mode-error trap on a phone.
- **The principle that sorts every verb, in one sentence:** verbs whose target is
  YOUR OWN BODY'S POSITION (dig, water, gather, harvest) are ACT; verbs whose
  target is THE MAP (place anything) are the mode. Dig needs no exception clause —
  digging moves *you*; the shaft is the way down you then descend.
- **The watering can never leaves the ACT rail.** Watering is the standing-there
  verb — drag-watering in plan view turns farming into map administration. The
  Sims precedent: place in Buy/Build, tend in Live, and nobody has ever been
  confused. Harvest already has the ripe-underfoot override and needs nothing.
- **Uprooting a planted thing is mode-erase with refund**, not the shovel — "it
  costs you the arrangement" transposed into time.
- **Guards:** no mode-only dry/ripe overlay (the plant itself must show it, or
  the mode becomes a scanner); never a count on a species entry (the `3/17`
  checklist through the side door); the two-level Garden palette from day one.

**Three concerns raised against the review, and where each landed:**

1. **"Dig, then into build to sow, then out to water is arduous."** Softened by
   frequency (beds are once per plot, sowing once per cycle; only watering is
   daily and it never enters the mode) — and FIXED by the game's own grammar:
   ACT is already contextual (the ripe-crop override), so the symmetric rule is
   **tilled soil underfoot + seed in pocket → ACT sows.** The embodied path
   survives whole — dig, sow, water without ever opening a menu — and the
   Garden group is for layout-scale sowing, twelve rows in one drag. Two paths,
   one object model, neither mandatory. Proposed, not yet settled.
2. **Fauna — "where in these menus would animals appear?" NOWHERE, and that is
   the answer even though fauna itself stays absent-by-design for now** (the
   written rule in content, killed two headline examples already; reversing it
   is its own conversation). Menus hold things with positions; creatures have
   wills. An animal from a palette is furniture with a walk cycle. The version
   consistent with everything above: **animals are met in the world, and what
   you build is the PLACE for them** — fence, coop, pond. "You plant what you
   have met" extends to "you keep what followed you home." The build menu's
   entire contribution to fauna is enclosures, which are walls, which exist.
3. **"The muted screen and visible tiles compete with the landscaping
   aesthetic" — DISSOLVED, because the flatten is keyed to the TOOL, not the
   mode.** DESIGN's own sentence: "holding a structure tool drops raised
   faces". Walls flatten because walls occlude and alignment is the job.
   **Garden tools place in the full living view** — you judge a tree against
   the world as it looks, light and season included, because composing a view
   in a muted view is impossible. This is the Sims' build-vs-buy separation
   achieved inside one mode by per-tool presentation.

**The menu work the change pays for** (read against `src/ui/app.ts` as it is
today — `TOOLS`, `BUILD_GROUPS`, `syncSeedUi`):

- **A species entry's hint says where you met it** — "Bur oak — you met this in
  the long grass." The hint machinery exists (`hoverHint`); the notebook knows
  the region. A travel journal with zero checklist risk, because it only ever
  speaks of what you have. The cheapest delight in the feature.
- **`syncSeedUi` and the variety chips DISSOLVE.** The chips exist because every
  seed looks identical in the satchel; in the Garden group each variety is its
  own catalogue entry wearing its ripe-colour swatch, which is the finish-row
  pattern the bar already uses. A bespoke mechanism deleted, not moved.
- **The ACT rail drops to three** — Dig / Gather / Water on keys 1/2/3.
- **Consider the ACT button naming its override** — SOW, HARVEST — since the
  contextual override is the smartest thing in the HUD and currently invisible
  until it surprises you. On-screen judgment call; it changes a button pressed
  hundreds of times.
- **GARDEN mirrors FURNITURE exactly**: the landing row's second no-tool door,
  opening Crops / Trees / Bushes / Flowers / Grass. One decision attached: erase
  lives in the structure landing row today, and uprooting-is-erase means it must
  be reachable from Garden's wing without a walk back.
- **Catalogue tiles need a size answer for trees.** `THUMB_SCALE` 2 makes a
  17×25 tree 50+ device px tall, which blows the row. Scale 1 for trees (still
  integer — the sprite rule holds) or a crown crop. Decide before building, not
  after the row breaks.
- **Undo, erase-refund and refuses-for-want-of come free** — Garden inherits the
  stroke model whole; nobody should rebuild any of it per-category.

Migration pressure on all of this is low by the owner's own call (sole player
right now) — the schema rules still apply, but habit-breaking is not a
constraint.

### YOU PLANT WHAT YOU HAVE MET — settled, and it is the spine of the feature

The acquisition question above was posed as "bought, or dug up where it grows?"
and the answer is neither: **seeing a plant in the world is what makes it
plantable at home.** Asked for directly — *"you need to see them in the world,
learn that they exist, to be able to recreate them at home"* — and it is better
than either option that was on the table. The country stops being somewhere you
harvest and becomes the thing that teaches you what is possible, which is what
"the regions become a catalogue" was reaching for and failing to say.

- **It is legal by a rule already written.** §"Finishes people give you": an
  unlock may never become a gate, and it is safe there because *"a finish costs
  nothing to apply, weighs nothing... a player who never warms to anybody loses
  two colours and not one thing they can do."* A plant you have not met is the
  same class. Nobody needs a bur oak. Someone who never leaves the plaza loses
  ornaments and not one thing they can do. **The moment a planted thing is
  required for anything, this whole mechanism becomes illegal.**
- **NO CHECKLIST, NO COUNTER, NO GREYED-OUT SLOTS.** The obvious build palette —
  seventeen slots, fourteen dimmed, `3/17` in the corner — breaks two rules at
  once: CLAUDE.md's *"secrets are never spoiled by UI"* and the found places'
  *"no pin, no list, no count"*. The palette is simply BIGGER than it was, with
  no announcement that anything is missing. You learn the world has a willow in
  it by standing next to a willow. This is the single easiest thing to get wrong
  here and it will look like helpfulness when somebody does it.
- **The machinery is mostly there.** `notebook.ts` already records "you have
  stood in the blossom rows"; this is the same shape one step finer. A set of
  species ids in the save: small schema change, easy migration. The check belongs
  to the SIM (what is growing near you), never to the renderer (what is on
  screen) — the second one makes discovery depend on the camera.
- **The starter set falls out for free.** You have been standing in the meadow's
  broadleaf and its bushes since the first morning, so the palette is never empty
  and nothing has to be special-cased to make that true.
- **It dissolves the far-country question**, which was left undecided: a glass
  tree is plantable and the walk is the price, because you cannot own one without
  having gone. If some strangeness turns out to need to stay put, that is one
  flag on one species and it blocks nothing now.
- **Still open: the register for the moment it happens.** The channels are told
  apart by who caused it (`app.ts`) — found is silent, given has a person saying
  something first. Seen is closest to found and should probably be silent too,
  which means the discovery is that the palette has something new in it. Wanting
  a notice here is the same instinct as wanting the counter, and should be
  resisted on the same grounds.
- **The catalogue, and it is mostly a curation problem rather than a drawing
  one.** Every one of these is an authored silhouette in `biomes.ts` today and
  becomes plantable the moment species stop belonging to regions. By the job it
  does in a garden: the SHADE TREE (bur oak, broadleaf); ORNAMENTALS (cherry,
  birch — the only bright trunk in the game); EVERGREEN STRUCTURE, for hiding a
  wall (lodgepole and Jeffrey pine, both of which already have two forms so a row
  of them is not a stamp); CHARACTER TREES (willow for a waterside, and the SNAG,
  a dead tree on purpose, which costs nothing and will be somebody's favourite
  thing in the game); HEDGING (plain bush, thorn); and two plants that already
  fruit for free — blueberry, and the prickly pear, whose tunas are a real fruit.

  **New art wanted: a FLOWERING SHRUB**, and it is the one genuine gap. Everything
  owned is a tree, a plain bush, or a flower at ankle height; there is nothing at
  knee-to-waist with colour on it, which is the piece that makes a planted garden
  read as designed rather than scattered.

  **Fruit trees: the apple, plus at most one more.** The apple is cheap (a
  broadleaf crown and fruit paint). Stop at two: each fruit wants its own
  cosmetic unlock, and four of those is a collection while five is a chore.
- **Ground plants are placed one at a time — but a drag may paint them.** Settled.
  The object model is one plant, one placement, exactly like a tree; the GESTURE
  may be a drag, which build mode already does for walls, so a bed of daisies is
  not forty taps. Keeping the model singular is what stops flowers quietly
  becoming a flooring material.
- **Maturity in DAYS, not years.** Seasons come off the real calendar, so "fruits
  in a year" is a literal year of somebody's life. The payoff being bought is
  *"this comes back"*, not *"you waited"* — a bush should establish in about a
  week and then fruit every season it is supposed to, forever. A multi-year tree
  is a daily cap wearing a very slow hat.
- **It is the first thing that grows and is also STORED.** Everything wild is a
  total function of (seed, x, y) and stored nowhere. A planted bush is persistent
  state with a lifecycle: new schema, a tested migration, and `away.ts` has to
  ripen it while you are gone.
- **Its neighbour is the furniture project**, which is already parked with its own
  rotation and redraw gaps. Whether these are one phase or two has not been
  argued.

## Phase 18 — the garden (10 Aug 2026)

The parked landscaping note above, built, in one arc: DESIGN §The garden first
(doc before code), then the flora catalogue, the sim, the build wing, crops
folded in, and the orchard. Schema 36. Everything below was verified in a real
browser — the loop that closed the phase was: walk to the orchard and the
blossom rows, come home with eight species met, plant an apple, a cherry,
hydrangeas and a bed of buttercups, jump the clock to October, and pick an
apple off your own tree while the planted cherry stands stubbornly pink in an
orange meadow.

### The shape (content/flora.ts, sim/garden.ts)

- **A species is a reference to a region's drawing.** `FloraDef.skin` names the
  region whose silhouette and inks the plant wears; a planted bur oak is drawn
  by exactly the call that draws the prairie's, seasons included. No new art
  except the orchard's three (apple, plum, hydrangea). **The ownership
  inversion is still owed** — regions referencing the flora table rather than
  the table referencing rows — and was deliberately not smuggled in half-done:
  the region rows carry a month of intertwined comments each.
- **A planted thing is a tile plus a record.** Trees and bushes write the same
  TREE/SHRUB tiles the generator scatters, so collision, occlusion and draw
  order come free; flowers are a record alone, walkable like wild decor. The
  record (`garden.plants`, keyed "x,y") is species id + timestamp.
- **Growth is a pure function of (plantedAt, now).** Nothing ticks, away-time
  needs no work. Stages are authored transforms — fewer rows on a shorter stem,
  never a resample (the sprite rule) — and small kinds skip the middle stage.
- **Discovery is the sim's, never the camera's.** `noticeFlora` rides the
  notice sweep and marks the standing region's species met. The migration adds
  an EMPTY garden on purpose: the first sweep teaches the starter set wherever
  you load, so nothing is backfilled and nothing can be backfilled wrong.

### Settled here, don't relitigate

- **The fruit rung sits ABOVE the held tool, and it is the mailbox's argument
  learned the fourth time.** It shipped below the tool; standing at your own
  apple tree in October, ACT dug the lawn — grass is always diggable. "A letter
  nobody can open is a feature that does not exist", now with fruit in it. The
  branch declines outside the season, so the dig-shadow around a fruit tree
  exists three months a year.
- **The contextual sow is DUG-GROUND-only, and never the shovel's.** Three
  states of this rung, each caught by a different net. Gated on `canSow` alone
  it fired on every lawn (canPlant accepts grass — the old rail tool
  auto-tilled) and hijacked the basket beside a tree: the ACT-contract tests.
  Gated on FARMLAND it was unreachable, because nothing but the retired plant
  tool ever MADE farmland — the shovel makes dirt — so ACT-ACT on a lawn
  opened a shaft where the player expected a crop: found in play, day one.
  The resolution: DIRT and the beds sow, grass never does, and **the shovel is
  the one hand that doesn't sow**, because dig-on-dirt is the settled shaft
  gesture and the two verbs would share a tap. Dig your bed with 1; the
  watering can sows with one tap and waters with the next — one tool for the
  whole morning walk, and the reticle names the verb before you spend it.
- **A planted tree never fells to the basket, and never answers erase with a
  refund it didn't charge.** Uprooting is erase, in the erase chain between
  furniture and the ground; gather returns null on garden cells outright,
  because ACT has no undo and a mis-tap costing three days of growth is the
  asymmetry the build undo exists for.
- **The plum is one in four, and the rate lives in the form list.** Two forms
  hash 50/50 and summer photographed half the orchard purple; the apple is
  written three times against one plum, which is weighting-by-repetition
  exactly as `shrubShapes` and the rock shapes do it. The identical-forms test
  loosened from all-distinct to ≥2-distinct — a repeated form is how a list
  says a rate; a list of ONE tree is still caught.
- **Species chips, not catalogue tiles.** A tree's sprite is up to 46px and
  blows the row; the finish-chip pattern (swatch + name) carries the wing. The
  swatch composes the crown TINT over the summer canopy — the meadow's crown is
  `#000000 at 0` and painted the first swatch black.
- **The hydrangea is the berries machinery worn as flowers**, big touching
  heads on the orchard's bushes — which took the one named exemption to the
  berries-apart rule: a mass on purpose is the drawing, and the rule guards
  masses by accident.
- **Fruit paint doubles as the day's stock on planted things.** Picked, the
  tree draws bare until tomorrow — the entire status display the garden gets,
  beyond the ACT toast lines ("The apple tree is new in the ground. It is
  taking this seriously.").
- **`syncSeedUi` is deleted, the rail is three tools** (Dig/Gather/Water on
  1/2/3), and the seedling icon marks the garden door. The variety chips are
  the Crops tab, riding `world.seeds.selected` as ever.

### Deferred, deliberately

- The species-table inversion (above).
- The ACT button naming its override (SOW/HARVEST) — still worth a look on
  screen; nothing depends on it.
- Fruit-shaped furniture unlocks — the furniture project's, when it runs.
- The far country's flora is plantable by the seeing-rule with no extra gate
  (glass tree included; the Static's tree and the grove's are out by name). If
  a glass tree in a meadow garden reads as strangeness leaking, one flag on one
  species revokes it — revertible, no save carries a palette.

## One button (10 Aug 2026)

The ACT rail is gone. Asked for directly, after a day of the garden's verbs
exposing what the rail had become: *"tapping water and having that sow"* was a
mode error wearing a fix's clothes, and the dirt-versus-tilled distinction was
internal bookkeeping a player could not see. The owner proposed the shape —
one button, with the other verbs behind a right-click — and it survived
scrutiny because the ladder already existed: `actionTarget` was contextual
everywhere but a handful of ties, and the rail existed only to break them.

**The contract:** the default tap does the obvious thing, resolved by the sim's
own ladder; a LONG-PRESS (right-click on desktop) fans the other applicable
verbs out to the left of ACT; a picked verb is a ONE-SHOT — it happens once and
nothing is held afterwards. Keys 1–4 are the same one-shots for a desktop hand.

### Settled here, don't relitigate

- **There is no held tool anywhere in the game.** `actionTarget(world, null)`
  is the default ladder; a `Tool` argument is an explicit one-shot verb. The
  target carries its resolved `verb`, so the reticle and the button cannot
  disagree. The renderer's `setTool` is deleted; the reticle draws the default.
- **The default ladder's farm priority is frequency:** sow a dug bed, water a
  dry crop, pick what's underfoot, gather what's beside you, dig the ground.
  **Sowing OUTRANKS the second dig**, which is the inversion the redesign was
  for — you sow daily and sink a shaft once a month, and a crop must never
  become a hole by surprise. The shaft is still two digs on one tile; the
  second is asked for by name, from the fan.
- **The fan obeys the reticle rule.** `availableVerbs` lists only what would
  do something here — one to three buttons, never four grey ones, nothing at
  all on plain grass in the sky. An idle explicit verb answers "none" rather
  than borrowing another verb's work; the one courtesy kept from the rail is
  that an explicit GATHER still reaches the node beside you.
- **One gesture, one meaning.** The release-click after a long-press is
  swallowed (`fanJustOpened`), or opening the fan would also perform the
  default act. Right-click toggles. Any canvas tap dismisses.
- **Discoverability is one dot.** ACT wears a corner tick when more than one
  verb applies where you stand — information, not chrome — and the button's
  hint says "Hold for other verbs."
- **The default tap with nothing to do is QUIET.** The reticle already went
  out; "Nothing to dig here" is reserved for a verb you asked for by name.
- **Explicit sow is bed-gated like the default** (`toolApplies` plant), so no
  path — key, fan, or Crops-tab drag — auto-tills a lawn, and the dig-first
  junk faucet survives the whole redesign.
- **TAP A THING, DEAL WITH THE THING; TAP THE GROUND, JUST GO THERE.** The
  reconciliation of click-to-move with click-to-act, and it is one sentence.
  Tapping a tree or a counter always walked-and-acted; `standingWork` extends
  the same promise to WALKABLE work — a ripe crop, a dry bed, a sowable bed, a
  mushroom — where the walk ends ON the cell and the arrival act is the
  default tap. Dig is deliberately not work a tap can order from a distance:
  grass is always diggable, and act-on-arrival for the shovel would end every
  walk in a hole. `resolveWalkToAct` takes distance 0 or 1 now — beside a
  solid thing, on top of walkable work.
- **"Should tap-to-act be a toggle?" NO — DISTANCE IS THE TOGGLE.** The
  accidental-harvest worry (tap your garden to walk into it, lose a standing
  crop) is answered in the gesture rather than in settings, because a settings
  switch forks the grammar and is found only after the accident. Walkable work
  acts on arrival only when tapped from NEARBY (≤2.5 tiles); a far tap is
  travel and only walks you there — you arrive ON the work, reticle lit, act
  still yours to press. Solid things keep any-distance walk-and-act: a tap on
  a cell you cannot stand in can only mean the thing standing there. Verified:
  a five-tile tap onto a ripe crop walks and does not harvest; ACT on arrival
  does. (An accidental harvest is also more scare than loss — it pays produce
  and seed back; what's at stake is the standing plant and the regrow days.)
- **The fan's Sow button IS the seed picker.** It wears the current variety's
  swatch; with one variety known it just sows; with more, tapping it swaps the
  fan for the variety chips and the pick SOWS — choosing and doing are one
  gesture, because the fan was summoned to act, not to configure. The default
  tap always sows the last-used variety, and the garden wing's Crops tab
  remains the browse-and-settle place. One extra tap, only when a choice
  actually exists — the seed row's own oldest rule.

## The mode is SHAPE (10 Aug 2026)

The BUILD button says SHAPE now, and the rename is the garden's bill arriving:
a mode that plants hydrangeas and uproots them again is not "build", and the
owner flagged the word the day after the wing shipped. SHAPE won over CREATE
and MAKE because it covers all three wings honestly — walls are shaping,
planting is shaping, ERASING is shaping, where creating and making both
stumble on the take-backs — and because "reshape" was already DESIGN's own
verb for the activity class (§The sky: "you visit; you do not reshape").

**"Build" survives as the structure wing's name**, where the word is true:
SHAPE contains Build, Furniture and Garden. Five letters, so the button didn't
move; user-facing strings only, so `buildTool`, `buildAt` and friends keep
their names in code — a mechanical identifier sweep would touch forty files to
say nothing new.

## Three doors, and the grid goes everywhere (10 Aug 2026)

SHAPE opens onto a landing of three labelled doors now — **Build, Furnish,
Garden** — instead of dropping you into the structure row with a wall in hand.
Asked for directly, with the second half attached: every wing needs the GRID,
the garden's living view included, "so you can see where you're placing items."

### Settled here, don't relitigate

- **The mode flag separated from the held tool** (`shaping`), because the doors
  landing holds nothing and "a tool is in hand" stopped being usable as the
  mode test. Everything that routed on `buildTool` — canvas taps, Escape, the
  wheel-pan, F/G — routes on `shaping` now; a tap at the doors with nothing in
  hand is a tap on scenery.
- **The GRID split from the FLATTEN** (`renderer.setGrid`). The flatten belongs
  to the structure tools — plan view for walls, where alignment is the job.
  The grid belongs to the whole mode: placement is per tile everywhere, so the
  cells show even over the garden's full living view. This amends the earlier
  "garden places in the living view" call by half: living view yes, gridless
  no — the owner reversed the gridless half on seeing placement without it.
- **Entering hands you NOTHING.** The old mode restored your last tool on
  entry, which was right when the landing was the structure row and is a hand
  grabbing at you now that the landing is a menu. The flatten therefore
  arrives tool-by-tool: pick Wall and the view drops to plan, back out and it
  lives again.
- **Escape walks the ladder the taps walk**: wing → doors → out. The back chip
  reads "‹ Shape" and goes to the doors; F and G toggle their wings from
  anywhere in the mode.
- **Erase follows you into every wing** — a shelf comes back down where the
  shelves are — and "Build" is now unambiguously the structure wing's name,
  which is the SHAPE rename cashing out: the mode contains Build rather than
  being it.

## A swatch for every surface (10 Aug 2026)

The finish row is gone from the structure wing. Picking Floor now opens a THIRD
RUNG — a row of floors, each one a patch of the real surface in the real grain —
and picking Wall opens the same row drawn as wall. Asked for directly, the day
after the doors landed: "instead of populating across the top, i want a new menu
overlay with the same square style buttons to open that show a swatch of each
floor type."

The argument underneath the request is that a floor is not one thing you then
tint. It is boards or it is flagstones, and those are two different floors. The
old control could not say which: an 18px square of flat colour tells walnut from
pine and cannot tell a board from a stone, which is the half of the choice that
matters most. Granite and slate were two grey chips.

### Settled here, don't relitigate

- **The level is a rung in the bar, not a panel over the scene.** Same square
  buttons as the doors, the tool row replaced rather than covered, world fully
  visible — you are choosing a floor for a room you can see. The ladder is now
  styles → wing → doors → out, and Escape and the back chip walk it through one
  method (`buildBack`), so the key and the chip cannot drift apart.
- **The swatch is the game's own pixels** (`surfaceThumb`), which is the
  catalogue tiles' argument applied to surfaces: the same GRAIN table, the same
  fill-then-grain-then-cap order, so a menu cannot lie about the floor it sells.
  It is TWO TILES WIDE for a stated reason — a board butts every 47px against a
  flagstone's 9, and at one tile the stepped bond puts a joint inside only one
  course in three, so a narrower swatch shows boards and flagstones as two
  colours. Asserted in `thumbs.test.ts`, because it looks fine at one tile.
  `GRAIN` moved from renderer.ts to grain.ts to be shared rather than copied.
- **Picking a swatch does not close the level.** You stay, holding that floor —
  lay some pine, tap ash, lay more, no navigation between them. That is the
  row's whole advantage over a panel that closes on you.
- **A level only opens when there is a choice in it.** Fewer than two options
  and the tap just arms the tool. Same rule as the fan's Sow button (§one
  button); it is why Door and Window arm instantly today and will open a level
  the day they have styles.
- **Doors and windows have NO FINISH now** (`finishes: []`). A door lays over a
  wall that already has one — the stone reaches the wall and stops at the frame
  (`shellFinish`) — so the only thing being chosen was which timber the frame of
  an opening in somebody else's masonry was cut from. Nothing repaints: cells
  keep the finish stored on them, and `loadedFinish` still defaults to pine, so
  new doors cost wood exactly as before.
- **Furniture is owed the same treatment and is NOT getting it here.** The owner
  wants to expand its options well past finish, which is its own sitting; until
  then a chair keeps the finish row, and `syncFinishUi` carries a retirement
  note saying so. Structure-only is staging, not a design boundary.
- **The level names itself** ("‹ Build │ Wall"). Granite floor and granite wall
  are the same masonry drawn the same way — correctly — so below the wood the
  two rows are near-identical, and a back chip alone did not answer "am I
  choosing a floor or a wall?".

**A bug fell out of the ladder, and it predates this work.** `syncToolUi`'s
"move off an empty tab" rule read the DOORS as an empty tab — no tool has that
group — and reset `buildGroup` to `structure` on the very sync that drew the
landing. The screen was right and the state was wrong one frame later, so
Escape at the landing took the wing branch, put you back at the landing, and
**build mode could not be left from the keyboard at all**. It hid because
everything reads `buildGroup` during the sync that sets it, except the one thing
that reads it on the next keystroke.

## The town gets a street plan (10 Aug 2026)

Asked for directly: *"the town needs an overhaul. building placement. building
aesthetics. landscaping. paths."* This is the first of those — placement and the
paths, plus the clearing that had to come with them. Aesthetics, landscaping and
the farm plot follow.

**What the town was.** Six rectangles at whatever coordinates each one was
written at, with generated forest growing between and against them, and no paved
route anywhere: every door in town opened onto grass. The plaza was a stone
rectangle dropped in a wood. Nothing had been laid out; things had been *placed*,
one at a time, each avoiding the last.

### The constraint that decides the whole shape

**A door has to be on a SOUTH wall or it has no face to be drawn on.** That is a
renderer fact and it is not being lifted here. Everything follows from it: every
building is entered from below, so a coherent townscape cannot be a ring around
the square — it has to be **rows of fronts with the streets running east–west
along them**. Laid any other way you get the town that was there.

### Settled here, don't relitigate

- **Two front lines, and every building around the square is on one.**
  `FRONT_N` (y −5) carries the museum, the town hall and the heap; `FRONT_S`
  (y 2) carries Prudence's house and the shop, level with the plaza's own bottom
  row so the pair frame the square's south corners. The seed stall is the one
  exemption and it is deliberate: it is not around the square, it stands out on
  the lane with its front on the spur — the last shopfront you pass walking to
  your own ground, which is what a seed stall is for.
- **Every street is TWO ROWS deep.** The first draft used one and it was wrong on
  screen, which is the only place it could have been caught: a single row between
  the museum's south wall and the back of Prudence's house is a crack with a
  doorstep in it, and you could not see that the museum had a front at all.
- **The south street runs UNBROKEN across the whole town** rather than in two
  arms like the north one. The plaza stops at y 2, so there is no already-paved
  middle to leave a gap for — and one continuous frontage under the square is
  what makes the place read as a street with a square on it rather than as a
  square with two spurs off it.
- **The streets are ORDINARY FLOOR CELLS, stamped like the buildings.** Same
  argument the buildings themselves were given: a path you can take up, repave
  and extend is the same object as a path the town laid, and the alternative is a
  second notion of paving that only the generator can write. You can quarry the
  high street.
- **Cobble, because granite is byte for byte the plaza's own colour.** The museum
  learned that one already. The square is dressed stone, the streets are cobbles,
  and you can see where one stops.
- **The town clears its own ground** (`inTownClearing`), per feature and never as
  one bounding box. A single box round the town is a 30-by-40 bald rectangle you
  can walk the corner of; clearing each building and each street with a two-tile
  margin makes the outline the town's own shape. Two tiles and not one, because
  at one the alleys between the fronts keep a tree wedged in each.
- **The clearing is checked BELOW the water, and that is load-bearing.** Cleared
  ground reaches past the museum's west wall and the riverside spot's channel
  runs there; clearing above the water dammed the town's own promised river with
  three columns of lawn. It clears what GROWS. It does not move water and it does
  not lift the plaza — both of those are the land itself.
- **`townMown` now thins the CANOPY, not just the mushrooms, with a floor of
  0.25.** The ground between the houses was already tidy and the wood over it was
  full forest. At zero the twenty tiles around the plaza go bald, which reads as
  a lawn mown to the horizon and puts your first armful of wood a two-minute walk
  away; a quarter leaves a scattering you can see past and chop. Rocks are
  deliberately not thinned — a boulder on the common is a boulder nobody moved.
- **The riverside anchor moved from x −14 to x −20.** The museum coming south
  onto the street line put the westernmost building in town inside the six-tile
  water cap of the bridge row, and the channel it capped was the town's own
  promised river — so a third of seeds arrived with a dry sandy trench where the
  river should be. Shrinking the cap would let water lap the museum; the museum
  has nowhere to go. Measured after: water near town went DOWN, 305 tiles to 235
  on average across forty riverside seeds.
- **Prudence's house is six by five, one wider than it was, and the extra column
  is load-bearing.** At five the interior is 3×3 with a piece in every corner, and
  two facts stop being demonstrable in the only authored house there is: that home
  follows the bed needs somewhere else in the room to put one, and that a lamp is
  delight and never a gate needs a free cell beside a bed. Both were asserted
  against a room that had run out of floor.

### v37 is the first migration that takes something down

Every other rung on the ladder only ever added. Four buildings moved, and a stamp
alone is additive — a deployed town would have ended up with eight buildings in
it, four of them ghosts still holding counters somebody's schedule points at.

Two things it had to learn the hard way:

- **The old coordinates are frozen in the rung**, not read from `TOWN_BUILDINGS`.
  A migration that asked the live table where the museum "was" would demolish
  wherever it IS the next time somebody moves it.
- **It clears the NEW footprints too, not only the old ones.** A save that climbed
  from far enough back has already had the *current* town stamped into it by an
  earlier rung (v13 rebuilds the museum, v15 re-stamps the lot), so by the time
  v37 runs the museum may be standing in its new place already. Demolishing only
  the old rectangle ate the overlapping half and left the rest, and the re-stamp
  refused the ruin as occupied. A v12 save came out with a museum missing two
  corners.
- **All-or-nothing per building**: if the player has built or planted where one is
  going, the pair is left entirely alone. Taking the old one down when the stamp
  is going to refuse the new one costs them a building and gives nothing back.
- What it cannot preserve, stated plainly: a repaint on one of the four, and
  anything built onto its outside. v27 went out of its way to protect a repaint
  and could, because the building stayed put. A repainted wall of a building that
  has moved is a wall in a field.

**And it broke the ladder's testing habit.** Half a dozen tests asserted their
own rung's effect after a FULL climb, which was safe while migrations only added
fields — a later rung could not disturb an earlier one's evidence. v37 rewrites
the very cells the v27 and v28 museum rungs are about. `MIGRATIONS` is exported
now and those tests climb only their own stretch (`climb(raw, 27, 30)`). A rung
is a pure function; testing it as one is the fix.

### Loose ends this opened

- **Riverside towns have a lot of beach, and now you can see it.** Felling the
  canopy over the town uncovered shore that was always there. Measured as not a
  regression (the numbers above), so it is a paint-and-planting question for the
  landscaping pass rather than a placement bug.
- **The lane ends in grass.** It runs to y 12 and stops, because what it is
  supposed to arrive at — the farm plot and its gate — is the next piece of work.

## The fence, the plot and the barn (10 Aug 2026)

The second piece of the town overhaul, and the one the owner named: *"i want to
add in a dedicated plot that 'belongs' to the player with a barn since this is
called the farm. they can use it or not, but it's a landing point."* The lane
v37 ran south out of the square stopped in grass; this is what it was stopping
short of. DESIGN §Town and homestead is amended for it rather than quietly
contradicted.

### The fence is a structure that does NOT enclose

That is the whole reason it is its own row in `content/structures.ts` and not a
short wall. `encloses` is what the room flood fill reads to decide a shape is a
ROOM, and a room grows a roof — so a paddock fenced with anything that encloses
gets ROOFED. You would put up four sides of railing and the sky would close over
your field. Stated where the fill can read it, and asserted.

It also means a fence needs no gate piece: a gate is a GAP. Nothing is being
sealed, so a hole in a fence is a way through, complete.

### Settled here, don't relitigate

- **Cost 1**, the cheapest thing that stands up. The first thing anybody wants a
  fence for is forty tiles of it round a field.
- **Fences and walls are blind to each other** (`joinsFenceRun` beside
  `joinsWallRun`). A fence that merged with a house's wall run would put a rail
  through the masonry and a post in the doorway. They meet and stop, which is
  what a real fence does when it reaches a building.
- **The rail is stepped off the WORLD and spans the full tile; the posts are
  every SECOND tile plus every end and corner.** CLAUDE.md's per-cell edges rule,
  and a fence is the most obvious place in the game to get it wrong: the thing IS
  repetitive, so a per-cell edge disappears into the repetition and stripes it
  anyway. The posts are deliberate banding — the tent's stripes, one object over —
  but one per cell is a picket every 16px, which reads as a palisade.
- **A north-south run draws a full-tile-height rail with posts on it.** Drawn at
  the fence's own HEIGHT instead of the cell's DEPTH, consecutive posts leave a
  seven-pixel gap and a fence running north photographs as a column of tally
  marks. Caught on screen, which is the only place it could have been.

### The plot

- **Seventeen by eight, and the size is a proof obligation.**
  `HOME_REGION_REACH` guarantees the town's own region — ground paint, flora,
  water table — only within about twenty-one tiles, and that number is NOT
  tunable: it is derived from how far apart biome sites can be. The plot's far
  corners sit at 20.6. The first draft was 19×13 and reached 26.6, which means a
  neighbouring region's pond in your field on the seeds where a foreign site sits
  close. The seed stall moved five rows north to make room for the north fence.
- **NOTHING IS ENFORCED.** No code reads `PLOT` to decide what you may build.
  Settled explicitly with the owner: people build wherever they want. The fence
  says which ground the town considers yours, the way a hedge does, and you can
  take it down for the wood.
- **One plot whatever spot you picked.** `homesteadOrigin` used to nudge the
  origin a tile or two per spot "for flavour" — invisible when the homestead was
  a tent, and wrong now that the fence, the barn, the yard and the gate are at
  fixed coordinates: an origin that wandered would put your tent through the barn
  wall on one spot in four. The spot has never been about where the plot IS.
  DESIGN is explicit that a spot names TERRAIN, and all of that is untouched.
- **The lane does not stop at the boundary.** It runs through the gate and down
  the middle of the plot into the yard — one road that ends in your yard, in the
  same cobble the whole way. That continuity is most of what makes the farm read
  as the thing the town opens onto rather than as a separate map.

### The barn

- **It does nothing, deliberately and completely.** No chore, no capacity, no
  upgrade path. A room you own with a door on it. A barn that asked something of
  you daily would be the first thing in the game that did.
- **Ox-blood, the only painted building in the world.** Every other finish in
  town is a MATERIAL — pine, ash, whitewash, marble — and this one is a tin of
  paint somebody opened, which is the difference between a building the town put
  up and a building on a smallholding. It does the whole of this building's
  aesthetic work in one field: a red barn is legible at any zoom, and nothing else
  in the game is that colour. It is a paint the player has not unlocked, which is
  a hook rather than a leak — the Gremlin has the tins.
- **Its front is on your yard, and from the gate you see its back.** Doors are on
  south walls (§The street plan) and that is not being lifted. It is also what you
  see of a real barn from a farm road.
- **The starting materials are in your POCKETS, not in the chests** — twenty wood
  and twelve stone, framed as the previous occupant's leftovers. They were nearly
  gatherable nodes, a real woodpile and a real boulder, which is a better story
  and does not work: a node's `felled` tile is GRASS, so clearing the woodpile
  would punch a lawn through the barn's floor, and both regrow, so the barn would
  quietly restock itself with boulders forever. Building a container system so a
  chest could hold six planks would be a mechanic invented to justify a prop.

### What the biome guarantee taught the tests

`biome.test`'s town walk was derived from `home.y + 5` — a bubble round the tent —
and had a two-tile skirt on it. Both had to go. The bubble never described the
museum or the streets and stopped describing the homestead entirely; the SKIRT
was asserting a promise nobody made, reaching 23.3 tiles where the generator
guarantees ~21, and it failed on seed 16 the moment the plot arrived. It walks
the town's actual footprint now — plaza, plot, every building, every street.

## The roofs get an eave (10 Aug 2026)

Third piece of the town overhaul — "building aesthetics" — and the first cut of
it is one geometric fact rather than a pass over six buildings.

**Every building in the game was a rectangle.** The roof plane ended exactly on
the footprint, so a house was a coloured rectangle sitting on a slightly larger
coloured rectangle, and six of them round a square read as six slabs. The
existing eave LINES were doing what they could — 2px of `skin.color` where the
surface ends — but a line is not an overhang. What the eye uses to tell a roof
from a floor is that the roof hangs over, and the shadow under it.

### Settled here, don't relitigate

- **An eave and a verge are not the same depth**, and the first version drew them
  as though they were: 3px all the way round, which came out as a PICTURE FRAME
  on every roof in town. A pitched roof overhangs generously on the two sides it
  FALLS toward — where the water leaves — and barely at all on the two gable ends,
  where it stops against the wall. `EAVE` is 3 and `VERGE` is 1, keyed off
  `fall.axis`, so the overhang states which way the ridge runs without drawing
  anything extra. Equal on four sides is a border; unequal is a roof.
- **The eave carries the pitch ramp.** Drawn in bare `skin.shade` it came out
  LIGHTER than the roof it hangs off — the roof plane has the ramp painted over
  it and the overhang did not — so every building wore a bright border. It takes
  the DARKEST end of the ramp, which is physics rather than taste: an eave is the
  lowest point of the slope by definition.
- **Only the south eave casts a shadow**, onto the wall below it. That is the one
  edge whose underside faces the camera, and it is what turns the overhang into
  depth rather than a wider roof.
- **Drawn from the edge cell outward, tested against the neighbour** — the same
  rule the eave lines already followed and the same rule CLAUDE.md's band note
  insists on. Per cell it would put a fascia through the middle of the roof.
- **Three pixels.** At one it is a rounding error, at two the fascia eats it, at
  five a cottage wears a sombrero and the eave starts competing with the wall for
  the building's width. Three is about a fifth of a tile, which is roughly what a
  real eave is against a storey.

### Still owed on this thread

The eave is the silhouette. What the buildings still lack is IDENTITY: nothing
about the Counter says shop, and the only building in the world that reads as
what it is from across the square is the barn, which gets it from one field
(ox-blood paint). Signage over a door, an awning on the shop, and per-building
roof materials are the obvious next moves, in that order.

## The town plants itself (10 Aug 2026)

Last of the five threads in the town overhaul. `TOWN_PLANTINGS` is a short table
of trees, bushes and flowers the town put in before you arrived, stamped exactly
the way the buildings and the streets are.

**They are the GARDEN's own objects** — an entry in `world.garden.plants` plus
the tile under it, which is precisely the pair `plantAt` writes. So the avenue is
uprootable, the hydrangeas are a bush you could have planted yourself, and the
fruit on your fence is pickable. There is no second notion of "scenery" anywhere,
which is the third time this overhaul has made the same argument (buildings,
paving, and now planting).

### Settled here, don't relitigate

- **`at: 0` — planted at the epoch, which is to say long ago.** Growth is a pure
  function of age against the clock, so an authored planting with a zero
  timestamp is simply mature, on the first frame of a brand-new world, with
  nothing special-cased. A timestamp of "now" hands you a town of seedlings.
- **THE LIST IS SHORT ON PURPOSE.** The failure mode of landscaping is not too
  little, it is a place that reads as a mashup of textures instead of as one
  settlement — the restraint note, applied where it bites hardest. Fourteen
  entries, and every one is doing a job.
- **It cannot reach the square.** Flora wants grass or bare dirt and the whole
  town centre is paving now, so the planting is where the paving is not: the
  lane, the two alleys in the north street's face, and your own ground. That
  constraint turned out to be a good editor.
- **The avenue is the whole point.** Four birches, two a side, down the lane out
  of the square. A three-tile cobbled strip running through grass is a paved
  strip; the same strip with trees down it is a ROAD. Birch because it is the one
  pale upright tree in the set and reads as planted rather than as left.
- **The alley trees fill the two gaps in the north street's face.** A street of
  fronts with a two-cell hole in it reads as a missing tooth; one tree fills the
  gap and leaves the other cell walkable, which is what a real gap between two
  buildings has in it.
- **The tent moved beside the lane**, to (2,15). The four-tile no-generation
  bubble round it covers most of a seventeen-by-eight plot, so a tent in the
  middle leaves nowhere the town could plant anything of its own — the fruit
  trees were inside it at the first coordinate tried. Beside the lane the bubble
  sits over the road, which needs nothing to grow in it anyway.

### Two tests were asserting the opposite of the design

Both passed for months because no seed had put the question, and both failed the
day the tent moved:

- **The landing at the bottom of a shaft.** `sink` carves four neighbours through
  `carve`, and `carve` refuses ore — the very next test asserts that a vein
  beside the ladder survives. The landing test demanded bare `CAVE_FLOOR` on all
  four, which is the opposite claim. It asks for "carved, and somewhere to step
  off" now.
- **`findNode` and `besideATree`** returned whatever tree was nearest, which is
  now sometimes one the TOWN planted. A planted tree is picked or uprooted, never
  gathered, so `gather` correctly returned null and the action ladder read as
  broken. Both helpers skip `garden.plants` now.

## The square is cleared and the path is one tile (10 Aug 2026)

Two corrections asked for after looking at the shipped town, and both are about
STONE. Worth recording because both were things the plan got wrong in the same
direction — it kept reaching for width.

**Nothing may stand on the square.** The town hall's south wall sat on the
plaza's own top row, so the one shared space in the town had a wall ring eating a
slice of it and the stamp had laid plank over the paving. Nothing else
overlapped, which is exactly why it survived a whole pass: every other building
is outside the plaza's x range, so there was no second case to notice it by.
`FRONT_N` moved from −5 to −6 — the WHOLE north line, not the hall alone, because
the row of fronts is the point and a hall set back on its own would have put a
step in the street face to fix a problem about the square.

**The path is one tile, and the south street is one row.** The lane was three,
argued for as "it is the road out and one tile reads as a garden path". That was
true about the lane and wrong about the town: three tiles of cobble running to
the gate, stacked under a plaza and a two-row full-width street, is more stone
than a place this size can carry, and the walk south stopped being a walk through
grass. The south street loses its second row on its own merits — the north street
is two rows because it is pinched between buildings on BOTH sides, where one row
is a crack, and nothing fronts the south one from below.

**The general lesson, which this project keeps relearning at different scales:**
a surface that reads well in isolation reads as too much when it meets the next
one. The plaza is fine, the street is fine, the lane is fine, and all three
together were a wall of stone at exactly the place you stand most.

### v40 is the first rung that takes paving UP

Same discipline as v37: old rectangles frozen in the rung. A cell is only lifted
if it still looks exactly like paving the town laid — FLOOR, wearing the town's
cobble, with nothing built or planted on it. Repave a stretch of the old lane in
your own boards and it stays, because that is a floor you laid.

**And it had to learn a question v37 could skip.** v37's movers could ignore
walls when asking "has the player claimed this ground", because `stampBuilding`
is all-or-nothing: a player wall anywhere in a footprint means the town never
stamped that building at all, so there was nothing of the town's to protect. The
HALL is different — it has stood on its footprint since v7, so "there is a wall
here" is the normal case and the question becomes whose. The answer is exact
comparison: work out what the stamp would write in a cell and see whether that is
what is there. A perimeter cell in somebody else's finish is a repaint or a shed.
Three tests caught it, all of them older than this overhaul.

## The board goes flat, and the seed stall becomes a seed stall (10 Aug 2026)

Two asked for together, and the second one deletes a compromise this file has
been apologising for since the stall was written.

### The errands board is a panel now, on the hall's wall

It stood free in the middle of the square's south-east corner and was drawn as a
22px face under a 16px LID — a lid that had been dressed up as a little pitched
roof, because a bare one read as a crate. That worked, and it was a fix for the
wrong problem: the board did not need a better top, it needed no top.

- **`flat` is a furniture flag, not a special case in the board's draw.** The
  default geometry is a near face plus a top surface the depth of the footprint,
  which is right for everything you look down ON — a table, a bed, a chest — and
  wrong for anything whose whole point is the vertical plane.
- **Distinct from `mount: "wall"`**, which hangs a piece on the face of the wall
  in its own cell and has no floor geometry at all. A flat piece still STANDS
  somewhere: it has a footprint, it is solid, you can put it anywhere.
- **Against the town hall**, east of the doorway. A notice board belongs on a
  wall, the wall is drawn first and the board over it, and it puts the town's
  paperwork on the building that produces it.

### Derek loses his building

The old table row said it out loud: *"a genuinely open-fronted stall would be a
room the flood-fill never closes, and every rule about roofs, doorsteps and
cutaways would need an exception for one structure. He has a door like everybody
else and does not appear to have noticed."*

**It was never a structure question.** A canopy is FURNITURE — like the plaza
stage, which has stood in the open since Phase 16 — and furniture needs no room
around it, no doorstep, no flood fill and no exception. So the building comes
down and he gets a counter under a striped awning at the edge of the square, in a
grove. The town loses a building it was pretending about, and the codebase loses
the paragraph explaining why.

### Settled here, don't relitigate

- **The awning goes NORTH of the counter.** It is what a stall looks like — cloth
  at the back, goods at the front — and it is what the renderer needs: drawn a row
  earlier, so the counter and whoever stands at it are drawn OVER it rather than
  under. That is the Blessed Carrot rule.
- **`TOWN_DRY_GROUND`, and it is the bill for losing the walls.** Every piece of
  town ground used to get its dry footing free, twice over: `stampBuilding` lays
  floor under a whole footprint, and `TOWN_RECTS` caps the water within six tiles
  of any wall. A stall with no walls has neither — and on the very first seed
  looked at, Derek was keeping his stall in a stream with his grove growing out of
  it. Measured after the fix: 0 of 200 seeds put the stall in water, on all four
  spots. The PLOT went into the same list on the same argument, one scale up.
- **AND THE CLEARING GRASSES OVER DRY BANKS.** The cap shallows water rather than
  deleting it, so what it leaves is SAND — and a market on a sand flat was the
  next picture, on 45 of 200 riverside seeds. A shore is dry, walkable ground, so
  turning it to lawn inside the town's cleared ground dams nothing: every wet cell
  stays wet and every stream still runs. Sand: 0 of 200 after. The wet cells are
  deliberately untouched, which is the same line §The clearing already drew.
- **`stampPlantings` reads the GENERATED ground, not just the overrides.** It
  looked at `t.overrides` alone, and an unedited tile has none — so "no override"
  was being taken as "grass". On a stream seed the town planted four trees and a
  bush into open water. A planting that cannot take is now skipped, which is the
  graceful half: a thinner grove, never a tree in a river.

### The compiler caught the ladder's oldest trap, again

v38 read `TOWN_BUILDINGS.seedstall` LIVE to decide where the stall had moved to.
That is exactly the drift v37 froze its coordinates to avoid, and it went
unnoticed because the building still existed. The day it stopped existing the
rung stopped compiling — which is the best possible outcome, and an argument for
keeping migration geometry in the type system rather than in a comment.

## A home comes off the square (10 Aug 2026)

Asked as a question rather than an instruction — *"do we think a home is
important enough to be on the square?"* — and the answer is no, for two reasons
worth keeping.

**A square is where the institutions face each other.** Hall, museum, shop, heap,
the board, the stage: those are the things you go to a square FOR. Prudence's
house flanked the plaza's south-west corner opposite the shop, and it was the one
building there with no business with anybody else.

**And it is a precedent that does not survive the town growing.** Commissions add
houses (sim/commission.ts). If the square is where a house goes, the square is
what gets eaten.

So she moves to the lane, and the gap is planted rather than rebuilt: three
plants on the square's west side, because a bare gap reads as a building missing
where a green one reads as the side that was never built on. Institutions on
three sides, trees on the fourth.

### Settled here, don't relitigate

- **`resident` is the test**, not a coordinate. `town.test.ts` asserts no building
  with a resident sits within a tile of the plaza, so a future house cannot creep
  back on.
- **EAST of the lane, and that is a MIGRATION constraint rather than a taste.**
  West of the lane is where the seed stall's building used to stand, and two
  rungs of the ladder still demolish that footprint by frozen coordinate. A house
  whose furniture sat inside it made those rungs read "the player has claimed
  this ground" and decline — leaving a ghost building overlapping the new house.
  Caught by an old test, and the lesson generalises: **old geometry is not free
  ground until every rung that names it has run.**
- **The spur is back**, east this time. It ran west to the seed stall's door once
  and was pulled up when the stall stopped being a building; there is a door down
  here again, and a doorstep lands on paving or it is not a front.
- **The square's west side needed its own clearing rect.** It came free while a
  house stood on it and stopped the day the house moved — without it the town
  plants three trees into whatever wood the generator put there, which is not a
  planting, it is a coincidence. Second time this exact thing has been true this
  week (the stall's grove was the first), which is worth stating as a rule: **a
  building clears its own ground, so removing one costs a clearing.**

### And a whole class of test broke, in a way worth naming

Nine crop tests planted at (8,8) and (6,6) — coordinates chosen years ago as
"open grass near the homestead" — and Prudence's new house landed on both. They
have all moved onto the FIELD inside the plot, which is the honest answer: a test
that needs farmable ground should say so by standing on the farm, not by knowing
a coordinate that happened to be empty.

## The park, and the stage moves into it (10 Aug 2026)

Asked as an either/or — park, amphitheatre, or both — and the answer is both,
because they are the same thing. A green with the stage in it.

**Why the stage had to move.** It stood on the plaza's south-west corner: a 2x2
wooden platform on stone, which is the right corner of the wrong surface. It read
as a pallet somebody had left out, and the town's one open space was quietly
doing double duty as its audience floor. On grass, with benches behind an open
apron, the same object is an amphitheatre — and the square gets its quadrant
back.

**Why the park had to exist.** Prudence's house came off the square and left a
building-shaped hole in its west side. A fourth building would have put the
problem back; bare ground reads as a building missing. A park reads as the side
that was never built on, which is what it is.

### Settled here, don't relitigate

- **A RIM AND NEVER A FILL.** Trees round the edges, open grass in the middle,
  because the middle is the amphitheatre's floor — and a park you cannot cross is
  a wood.
- **The back row of the crowd stands ON the benches, which is to say it sits.**
  A bench is walk-through like every seat (the chair rule), so a watcher assigned
  to one of those cells resolves to seated and nothing in the festival code has to
  know benches exist. Four seats and four standing places: two rows of seating
  with nobody able to stand in front reads as a waiting room.
- **The front row is deliberately bare.** An open apron in front of a platform is
  what makes it a place people gather at, some of whom sat down.
- **Its west edge stops at x −13.** `TOWN_RECTS` keeps the park dry like the rest
  of the town's own ground, and the cap reaches six tiles: one column further and
  it starts pinching the river anchored at −20. The same wall the museum and
  Prudence's house have both run into.
- **`festival.test`'s audience check said PLAZA and now says PARK** — and gained
  the half it never made: the crowd must be in FRONT of the platform. Bounds are
  not the claim; "they can see it" is.

### The pattern that has now bitten three times

**A building clears its own ground, so removing one costs a clearing.** The seed
stall's grove was the first, the square's west side the second, and the park is
the third — each time, ground that was tidy because a footprint sat on it went
back to being whatever the generator says the moment the footprint left. It is
written into `CLEARED` as an explicit rect every time now, but the rule is worth
carrying: **check the clearing whenever a building moves or goes.**

## The buildings get a material each (10 Aug 2026)

Asked for in preference to signage — *"i think building materials and decor would
be ideal"* — which is also what DESIGN's tone would rather have: show the player,
do not label the building. The eave had given every building a silhouette; this
gives them identities.

### The two material calls

- **The Facility is SALVAGE**, and the finish was named for its keeper before the
  building ever wore it. Its hint in `content/skins.ts` reads *"The Gremlin has a
  facility. He would like you to call it a facility."* A shed made of reclaimed
  boards IS the joke. It also settles the one real collision in town: the hall
  and the heap were both ash, which made the two most different errands in the
  place look like the same building at a distance.
- **The town hall is SAGE** — a tin of municipal paint, which is the most
  institutional object there is, and the only green building in the world. It
  does not merge with the turf: the paint is grey-green against a full-blooded
  yellow-green, and on screen they sit apart.

**It was SLATE for about ten minutes**, on the reasoning that the hall should be
the museum's stone opposite — marble pale and welcoming, slate dark and official.
It photographed as a black slab at the head of the square: the museum's own
warning coming true one building over, that *being distinctive is not the same as
being welcoming*, and that the darkest grey available reads as a jail whatever
its footprint. Granite and cobble were already ruled out on the museum's notes
(granite IS the plaza's colour, so the hall would vanish into its own paving).

Painted timber also says the right thing about this institution. The museum is
built of stone to last; the town hall was painted, once, by somebody following a
schedule.

### Decor, and the rule for it

- **An awning over the Counter's window** (moved off the door, 10 Aug 2026 — see
  §The awning had no air under it below), and it is the whole of what makes the
  shop read as a shop from across the square. One striped canopy says "you buy
  things here" faster than a name board could.
- **Two crates against the Facility's wall.** Two and not six: the joke is that a
  shed with a heap in it is being called a facility, and a heap you have to
  squeeze past stops being funny and starts being an obstacle.
- **Two bushes down Prudence's east side**, so the one house in town looks lived
  in from outside rather than merely occupied.

**Both awnings are red-and-white striped and that is deliberate.** The canopy
colour is the piece's, not the finish's, because canvas is canvas — a market
stall and a shopfront are the same object doing the same job, and giving them
different stripes would have been variety for its own sake.

### Still owed

The museum needs nothing (marble plus two big windows is the most legible
building in town), and the barn needs nothing (ox-blood does it in one field).
What has no identity yet is **Prudence's house** — it is pine, like a default,
and "the one where somebody lives" is currently carried by two bushes.

*Answered by the section below:* her house is the only one in town with a
chimney, which is precisely "the one where somebody lives" said in one mark.

## Four sashes, one chimney, and a hole in the roof (10 Aug 2026)

Every building in town is glazed, exactly one has a stack, and the museum has
skylights. Three changes that turned out to be one change: the town's six
buildings were telling each other apart by material alone, and openings are the
other half of what a façade is.

### A chimney is a BED, not a floor area

`chimneyCell` gave a stack to any room of twelve interior cells or more. The
reasoning in its docblock was right — "the point of one is that somebody lives
under it" — and the measurement was a proxy that failed on its own terms: every
building in town clears twelve, so the shop, the salvage shed, the barn and the
**museum** all had chimneys. A chimney on everything says nothing.

It asks for a bed now. Prudence's is the one bed in the town, so hers is the one
chimney; a house you built grows one when you put a bed in it, which is a better
moment than clearing a square footage. A **cot** deliberately does not count —
it is what you sleep on before you have settled anywhere.

No migration: a stack is derived and nothing about one is stored, so the rule
changed in every live save at once. That is what deriving it bought.

### Four sashes, not one sash with a style field

`window`, `window_paned`, `window_transom`, `window_narrow` — four rows in
`content/structures.ts`, four chips in the build bar. A style field on
`BuildCell` was the alternative and lost for the reason `fence` is not a short
wall: a transom is a different opening, not a different colour. It would also
have needed a save field, a migration, and a second axis bolted onto the swatch
level, which is typed to `SkinId` end to end. Four ids need **no migration at
all** — an id is a string in a union and no save contained them yet.

Settled, don't relitigate:

- **A run merges with its own kind only.** A paned sash beside a plain one is
  two windows, because that is what the player asked for by placing two things.
  Matching on "is a window" ran muntins into a plain opening and stopped them in
  mid-air at the cell boundary.
- **The narrow sash never merges**, and that is the whole of what makes it
  narrow. Two side by side are a colonnade; merging them would produce a plain
  window spread over two cells and quietly delete the tool.
- **Muntins step off the WORLD column**, at 8px — the glass rake's argument at a
  different period. Bars measured from the cell edge would put one at the same
  offset in every cell, which is the per-cell edges rule in the disguise it
  wears best.
- **Side-on, all four draw the same band.** There is no face and therefore no
  shape to tell apart; four different bands would invent a distinction the
  geometry does not have.

Who wears what, and it is most of what tells the six apart now: hall and museum
**paned** (institutions are glazed to a specification), shop one three-cell
**shopfront** (you are meant to see the stock from the square), Facility two
**slits** (a facility that let you see in would not be one), barn a **transom**
band and a slit, Prudence a plain cottage window and a slit.

### A skylight is PLACED, on the floor under it

DESIGN says roofs are derived and never placed. A skylight does not break that,
it threads it: you still do not build the roof, you cut a hole in the one that
turned up. So it is the first structure that lives on an **interior** cell — you
place it on the floor you are standing on, and it draws a storey above in the
roof pass.

- Not solid and does not enclose. Both are the same fact told to two systems: you
  walk under it, and the room fill must flood through it or a skylight would
  halve its own room and un-roof the house.
- `mount: "roof"` on the def, mirroring the painting's `mount: "wall"`, so
  everything that reads the build layer as "something is in the way" asks first.
  Without it you could not put a table under your own skylight.
- The roofed test lives in `sim/game.ts` and not `canPlaceStructure`, because
  `sim/rooms.ts` already imports `sim/structures.ts` — asking the other way round
  would put a cycle between them for one predicate.
- Interior only, never the shell: one over a wall is a hole cut in the eave.

The museum gets three, up the middle of the gallery on the aisle rows, on the
door's own column. It is the only room in town too deep to light from its own
walls. **Three and not six** — two abreast would put a skylight in every other
cell of a six-wide roof, which is the band rule waiting to happen.

### The ladder had a stale filter in five places

Every rung that moves a building demolishes its old footprint with
`id === "wall" || "door" || "window"` and then re-stamps from the **live** table.
The coordinates are history; the **vocabulary is current**, and nobody had said
so. The moment the table grew three sashes, each of those rungs left a window
standing on an old footprint — and `stampBuilding` is all-or-nothing on an
occupied cell, so one orphaned sash blocked the re-stamp and the building did
not come back. No error, no roof, furniture missing.

It is `isTownShell()` in `sim/town.ts` now, in one place. Four migration tests
caught it, which is exactly what they are for. **If you add a structure the town
stamps, put it in that function.**

## The chimney gets something to come out of (10 Aug 2026)

A fireplace, which is the object a chimney is the top of. The rule that had been
wrong twice in one day is now right for a reason rather than by coincidence.

### The rule had been a proxy twice

1. **Floor area** — twelve interior cells. Every building in town clears twelve,
   so the shop, the salvage shed, the barn and the museum all had stacks.
2. **A bed** — better, because a bed at least means somebody lives here, and
   still a proxy: a bed is where you sleep and a chimney is the top of a flue.

It asks for a **fireplace** now, and the improvement is not only the test. The
old `chimneyCell` hashed a cell out of the room's back third and its own
docblock apologised for it. The stack sits **on the fire**, so the hash is gone
and the function is four lines. You still never place the chimney; you place
the hearth.

Settled, don't relitigate:

- **A fireplace needs a wall behind it** (`backs: "wall"` — north of its
  northernmost row, checked per column, not per anchor). Two reasons and both
  matter: a flue has to go up through something, and it is what keeps the stack
  off the front eave, where it reads as a crate on the gutter. That constraint
  used to live in the renderer as the back-third bias; moving it to placement
  says the same thing once, at the moment the player can still act on it.
- **Not a door and not a window.** Backing a chimney breast onto a doorway puts
  the tallest solid piece in the game across the one cell you walk through.
- **The stack wears the HEARTH's finish, not the roof's.** It used to take the
  roof's material because that was the only material available when it was
  derived from nothing — which meant a timber chimney, a flue made of the one
  substance a flue may not be made of.
- **First stone furniture in the game.** Every other row is wood or cloth, so
  stone had no made object to its name. `cost: 8` as a bare number, so it
  resolves against the finish's own material.
- **It burns** (`light: true`), so a room with a fire in it reads as occupied
  from the street through its own windows. Free — the window glow already did
  this for lamps.
- **A house the player built loses its chimney** until a fireplace goes in.
  There is no honest migration: placing furniture inside somebody's house is the
  one thing this ladder has refused to do since v7. One build action to fix.

### Two things only looking could have found

- The hearth was at **(6,7)** in Prudence's cottage first, which put the chair at
  (6,8) directly in front of it — and a piece one row south draws over the piece
  behind it, so the fire was half-hidden by a chair back. Every test passed and
  the room was still walkable. It is at (7,7) now, bed west, fire east.
- **`stampBuilding` handed every piece the building's `finish`.** Fine while the
  whole table was timber; her pine would have stamped a wooden fireplace, and
  nothing in the types objects because pine is a perfectly good `SkinId`. It
  falls back to the piece's own class default now, the same guard `loadedFinish`
  applies to a stale selection.

### Found while verifying, NOT fixed

**A multi-tile piece taller than 8px pokes through the roof of its northern
row.** Furniture sorts on its SOUTHERN row (so a bed's far end can't draw in
front of its near end), which means the roof cell over its northern row has
already been drawn by the time the piece goes down. Prudence's bed shows two
pixels of headboard through her roof, and has since beds and roofs coexisted.

A 1×1 piece is fine (it sorts on its own row, and the roof there draws after it
at `BIAS_ROOF`), and so is the 2×1 fireplace. The fix is a change to the raised
pass's sort key, which is load-bearing — see §Known gaps.

## The contact shadow follows the sun (10 Aug 2026)

At dusk everything with a round foot wore **two shadows**: a long raked one
leaning east, and a flat symmetric bar under it that had not moved since noon.

`footShadow` drew the rake and then drew its two puddle rows at full width,
centred on the object, regardless of `rake`. That is the correct shape at noon
and only at noon — a symmetric puddle is what an overhead sun makes. At sunset
the same rows were still there, and worse, they stuck out on the **sunward**
side, which is the one direction a shadow cannot go. One sun, two shadows.

The fix: the sunward half retracts as `|rake|` grows toward `RAKE_MAX`; the lee
half does not. At `rake` 0 the arithmetic is byte-for-byte the old rectangle, so
noon is provably unchanged. At the horizon it is a half-puddle tucked under the
foot on the shaded side, running straight into the rake that leaves it. The
object still never floats — the lee half is always there.

Applied to the mushroom's own one-row shadow too, which had the same bug at a
fifth of the size and its own copy of the arithmetic.

**Dawn had it mirrored** — the stub pointed east, at the rising sun — and the
same fix covers it, because it keys off the SIGN of `rake` rather than off the
phase (`rakeAt` gives `-RAKE_MAX` at dawn against `+RAKE_MAX` at dusk).
Verified on screen at 05:00, not just reasoned about. Night returns `0`: no sun,
so the puddle stays symmetric, which is correct.

### The diagnosis was wrong the first time, and worth recording why

The first pass reproduced a *different* picture — two trees one cell apart, where
the back tree's trunk is entirely hidden behind the front tree's crown while its
shadow escapes east. That is real, it is geometrically correct, and it was **not
what was being reported**. It got built because it explained the screenshot, and
a plausible explanation for the evidence in hand is not the same as the cause.

The tell was available and went unread: the flat bar extends **west** of the
trunk at sunset. Nothing casts a shadow toward the sun. One look at which
direction the extra ink pointed would have settled it without the two-tree
detour.

(The two-tree overlap remains unfixed and is genuinely arguable — see
§Known gaps.)

## The fire moves, and the barn turns to face you (10 Aug 2026)

Two pieces, one sitting: an animated fireplace, and a barn rebuilt around its
own front.

### Furniture can animate now, in bands

`PieceArt.anim` — a band of rows in the front view plus a list of replacement
bands, cycled off the renderer's elapsed clock. NOT four whole grids: the
fireplace is thirty rows of masonry around eight rows of fire, and four copies
of the masonry is four things to edit and three of them to forget. Spliced
grids are built once per piece and cached; the raster key gains the frame, so a
moving fireplace costs four canvases rather than a rasterization a frame, and
anything without an `anim` — everything else — keeps the single entry it had.

Front view only. The fireplace's back is a blank slab and has no fire to move.

The old note said the fire deliberately did NOT animate, on the grounds that
every other light in the game is a steady pool and a moving one would be the
only thing in the room. Still true, and now the point: a fire is the one
furnishing that is running rather than sitting there. A lamp stays steady.

The cycle is upright / left+taller / upright / right+lower, so it sways through
centre instead of jumping side to side, and the leans differ in HEIGHT as well
as direction — a flame that only rocks is a metronome. The two ember rows never
move. First draft of the right lean touched the jamb and read as a mound; a
pixel back toward centre fixed it. Only looking found that.

### Settled here, don't relitigate

- **A square room ridges NORTH-SOUTH.** `roofPitch` ties used to go east-west.
  A square has no longer side, so the tie was always free, and gable-front is
  the only silhouette this view can show a whole triangle of. Nothing the town
  builds is square, so this reaches player-built square rooms and nothing else.
- **The barn is 5x5, and the square is load-bearing.** A gable over the doors
  needs a north-south ridge, and the barn could not simply be made deeper: the
  plot is rows 13..18, the yard has 18, the north fence has 12, and the plot
  cannot grow (HOME_REGION_REACH). Square was the only shape that flips the
  ridge AND leaves the south wall a middle cell for the door.
- **`barn_doors` is a MARKING, not an opening.** Wall in every structural
  sense — solid, encloses, joins the run, wears the wall's own finish — with a
  panel and a batten cross painted on the face. The first decorative structure.
  Costs 3: over a wall, under a door, because nothing about it opens.
- **The barn has no glass at all.** It wore a transom band and a slit; both are
  gone. Glass on a hay barn says somebody works at a desk in there. The town
  test that used to demand a window per façade now demands a FACE — windows or
  panels — which is what it was always about.

### Roof courses stay east-west, even on a north-south roof

Strictly a shingle course lies along the eave, so a north-south ridge should
carry them vertically. It was tried. The barn stopped being a barn: the wall
under it is planking stood on end, and roof stripes in the same direction ran
into the wall stripes and made the building one tall striped slab. **Two
surfaces meeting need their textures to cross, or they read as one surface.**
The pitch ramp already says which way the roof falls; the courses only have to
say "roof".

### A bug the reshuffle fell over

The Gremlin could drop junk INSIDE the plot's fence. `isBareGround` checked the
crop map and the tile, and a fence stands on grass — so the junk landed in a
cell where gather answers to the structure, could never be picked up, and
counted against `SCATTER_CAP` forever, silting the cap up until the deliveries
stopped. away.ts's own house rule says he may never overwrite "a crop, a plank
or a building"; the build layer is where the last of those lives. It surfaced
only because the barn's new footprint reshuffled the scatter onto (8,17).

### /buildings.html — the town as a contact sheet

Six cards, every building drawn by the real renderer out of a real `newWorld`,
at a fixed summer midday on a fixed seed. The sibling of `/biomes.html` and
`/looks.html`, and it exists for their reason: checking one façade meant
drive.mjs, a seeded save, a parked player, a screenshot and a crop, and the
answer came back as a picture of ONE building. Half the questions about a town
are relative.

Three things it had to solve, all about aiming a camera that only follows a
player:

- **Stand on the doorstep.** Inside the room opens the roof cutaway, which is
  the one thing a façade sheet must not do. Off the bottom of the canvas is past
  `panLimit`, so the pan clamps and the building drifts off centre. The doorstep
  is outside the room, paved, walkable (the town's own tests guarantee it), and
  it puts one creature of known size at every front door — the page's only scale
  reference.
- **Take the FURTHEST rung of the zoom ladder.** Step 0 aims for an eleven-tile
  view whatever the canvas is, so the museum came out framed on its own door.
  The card's CSS box is `span × 16 × 2`, and the rung whose scale is 2 gives back
  exactly that span.
- **Pan up three quarters of a tile.** A roof is drawn a storey above the cells
  it covers, so a building's visual mass sits above its footprint's centre.

BARE ON PURPOSE — no time, zoom or seed controls. A region IS its light and its
month, which is why that page needs them; a building is a shape with a face on
it, and the fastest sheet is the one already showing you the thing when the
reload lands. It does not replace drive.mjs: it cannot walk through a door, open
a cutaway, or tell you a doorstep is blocked.

### The flag over the town hall

A pole with a small flag on it, on the hall's roof — and it is DERIVED, on the
chimney's exact argument. You place the fire and the flue comes out over it; the
town puts its DESK somewhere and the flag flies over that. `flagCell` asks one
question: is the `hall` counter in this room.

Not `flag: true` on the building. That would have been one line, and it would
also have been the first PLACED thing on a roof, and it would have gone on
flying over an empty shell after somebody carried the desk out. This way the
flag is a fact about what the building is FOR.

Only the hall, because only the hall has that counter. The shop, the museum and
the Facility have counters too and fly nothing: four flags in a town this size
is a parade, and those three are a business, a collection and a pile.

It lands on the ridge without being told to — the middle row of a five-deep
building is where `roofPitch` creases a five-deep roof.

**The desk decides WHETHER; the roof decides WHERE** (amended 10 Aug 2026). It
first stood on the counter cell itself, which on the hall is one column west of
the building's own centreline — the desk is at x -1 of a building running x -3..3
— so the flag flew off to one side of the one facade in town that is drawn
symmetrically on purpose (§townhall: "Symmetry is the point and it is the ONE
building here that gets it"). A municipal flag hung off-centre reads as an aerial
somebody screwed on, which is the same failure the limp-flag version had.

So `flagCell` still asks the desk whether, and then answers with the middle of
the room. This is the one place the flag parts company with the chimney, and the
reason is that they are different objects: a flue IS the fire coming up through
the roof and belongs over it and nowhere else, while a flagpole is not the desk
coming up through the roof — it is a thing the building wears, and a building
wears its flag on the middle of its ridge. Carry the desk out and the flag still
goes, which was always the load-bearing half. An L-shaped room whose bounding-box
centre falls outside itself falls back to the counter cell.

**A NOTCH CANNOT SURVIVE A ONE-PIXEL OUTLINE AT THIS SIZE**, which is the
transferable lesson and took three goes. The flag is 6px tall, so a swallowtail
is at most 2 deep, and every pixel of a 2-deep notch is within one pixel of the
fabric above and below it — the outline fills the cut with solid ink and the
flag comes out with a dark bite in it. (Attempt one cut it with `clearRect`,
which does not put a hole in the flag: it puts a hole in the WORLD, straight
through the roof and the ground to the empty page behind.) The fabric is said by
a slow one-pixel lift instead.

**It ripples rather than bouncing** (amended 10 Aug 2026), which is the
difference between cloth and a sign on a hinge. The whole rectangle used to shift
up a pixel and back on one clock, so the flag slid up and down its own pole as a
rigid block; cloth is HELD at the halyard and free at the fly, so the shape has
to vary ALONG its length. Each column now carries its own one-pixel offset and
the offsets travel outward. Amplitude and cycle are unchanged at 1px and 1800ms —
what was wrong was the SHAPE, not the tempo.

Two things only looking could have found, both on the first attempt at it:

- **ONE BUMP, NOT A SQUARE WAVE.** Alternating two columns up and two down along
  the fly is two full cycles of crenellation on a nine-pixel flag, and the
  silhouette came out castellated: the flag read as TORN rather than as moving.
  This is the per-cell edges band rule at the smallest scale it has ever come up
  — a repeating edge across a surface stops the surface reading as a surface. The
  lift is now a single three-pixel bump on a period longer than the flag itself,
  so at any instant there is exactly one departure from flat.
- **A CHARGE PRINTED ACROSS A FOLD TEARS.** The carrot is two pixels wide, and
  when the fold passed between its columns the one-pixel shear did not read as
  cloth flexing — it read as the carrot breaking in half, leaf adrift above the
  root. Its two columns now always move together, which costs a two-pixel flat
  spot in a three-pixel bump and is invisible.

Note what the per-column draw does NOT do: it never puts ink BETWEEN two columns.
A per-column left-and-right edge would rule a line down every column of a single
piece of cloth, which is the venetian-blind failure again. Ink goes where the
fabric ENDS — above it, below it, and at the two ends.

It flies rather than hangs. There is no weather here, so the literal answer was
a limp flag — which is a vertical smudge that reads as an aerial. The grass
already sways, so the world has a breeze even though it has no weather, and the
flag agrees with the grass rather than with the rain that does not fall.

The charge is a carrot, in the crop table's own `ripeColor` so the thing on the
flag and the thing in your field cannot drift apart. The town has put a root
vegetable on its flag and is completely serious about it.

## The awning had no air under it (10 Aug 2026)

Reported from the square: the Counter's doorway was visually blocked. The cause
was not placement, or not only placement — **the awning was drawing itself as a
solid box with a striped lid.**

`drawFurniturePiece`'s generic path fills a near face for every piece that is not
`flat`, then outlines the whole silhouette as one rectangle. The `awning` case
then painted stripes on the top surface and two posts on the face — onto a slab
of whitewash that had already been laid down underneath them. The posts were
decoration on a wall.

Nobody caught it for a year because a stall is what it looked like, and at
Derek's it sits behind his counter with nothing behind it to hide, so the solid
front was doing an honest job as the back of the stall. Put the same piece in
front of a door and the door is not shaded, it is bricked up. It was
**walk-through in the sim and solid to the eye**, which is the worst of both: the
game let you walk through something the picture called a wall.

**So the awning leaves the generic path, exactly as the lamp does.** The lamp's
argument is that the generic silhouette is a box and a lamp is a post; an awning
is a box with the front taken out, which the generic path cannot express at all.
`drawAwning` draws the cloth, two posts and the shadow the posts throw, and
nothing between them.

**And it moved off the door onto the glass.** It sat at x 10..11, which is the
door column plus the east window. A canopy is drawn on the row IN FRONT of the
wall it belongs to and stands `height` px proud of a 24px storey, so it covers
the bottom 14px of whatever is behind it — always, by projection, and no amount
of tuning removes that. Which means the fix is never "raise it", it is "do not
park one in front of a door". At x 8..9 the same overlap is the point instead of
the bug: it shades the shopfront, which is what an awning is for, and the east
window stays clear so the glass is still glass. The crate went with it, from x 12
(immediately east of the doorstep, so the entrance was bracketed on both sides)
to x 7. The street face now reads west to east as crate, canopy, glass, door.

**Two details drawn and thrown out the same hour**, both by looking:

- A **scalloped valance** — dipping the hem a pixel every four — came out as a
  dark dashed band that read as a chewed or dirty fringe, not a frill. It is the
  flag's crenellation lesson from earlier the same day, arriving again on a
  static edge.
- A **2px shade under the far edge**, meant to say "this surface leans away from
  you", came out as a muddy grey strip laid across the top of the cloth.

Both were texture the object is too small to hold. What sells the canopy is the
stripes and the air underneath it, and neither needed help.

**The seed stall got better for free**, which is the check that mattered most
after the change: it now reads as a proper market stall, canopy on two visible
posts with the counter on its own legs in front, where before the canopy was a
pale slab.

### Loose end

`furnitureThumb`'s fallback draws its own generic box for any piece without art,
and its docblock's claim — "the fallback box IS what that piece looks like in the
room today" — is now a little less true for the awning than it was. It never had
the stripes either, so this is a widened gap and not a new one. Fixing it means a
second draw path for one piece; noted rather than built.

## Known gaps and loose ends

Small things that are half-built or deliberately stubbed. Worth knowing before
you trip over them:

- **Two trees on the same column read as one tree.** Adjacent same-species
  crowns merge into a single silhouette with no rim between them, so the back
  tree's trunk vanishes behind the front tree's crown while its shadow runs out
  east where nothing covers it — one tree, two shadows, and both of them
  correct. Only really visible at dusk, when shadows are long enough to escape.
  The candidate fix is a dark rim along a crown's top edge **only where another
  tree stands behind it** — tested against the neighbour, which is what the band
  rule prescribes — rather than outlining every crown, which would restyle the
  woods.
  **ACCEPTED FOR NOW, don't "fix" it on sight** (owner's call, 10 Aug 2026): the
  spare shadow implies another tree, and another tree is what is actually there.
  Revisit only if it starts reading as a bug in play.
- **Tall multi-tile furniture pokes through its own roof.** Furniture is pushed
  into the raised pass at `y = ay + h - 1` — its SOUTHERN row — so a bed's far
  end can't sort in front of its near end. The roof cell over its NORTHERN row
  is at `y = ay`, and `BIAS_ROOF` only outranks `BIAS_TERRAIN` *within the same
  y*, so that roof cell has already drawn. Anything more than 8px tall spanning
  more than one row therefore shows a sliver: Prudence's bed leaks two pixels of
  headboard, and always has. 1×1 pieces are safe at any height (the shelf is
  18px and fine), and so is the 2×1 fireplace.
  The fix is a second sort key or a per-room roof pass, and it touches the sort
  every raised object in the game goes through — worth doing deliberately, not
  as a side-quest. Found by looking at a chimney (§The chimney gets something to
  come out of).
  **Queued behind the town rework** (owner's call, 10 Aug 2026): furniture gets
  its own sitting once the town is done, and this goes in it.

- **Seventeen regions still draw one tree.** `crownAlt` exists and the pines use
  it; nothing else does, which is deliberate — the mechanism was proved on one
  region rather than swept across all of them. The candidates are the
  tree-heavy rows, where a stand is most of the picture: the birches, the
  glimmer, the dusk, the redwoods, the blossom. Pair each one while it is being
  looked at, and give each pair a REASON (the pines' is self-pruning), because
  "a slightly different tree" is how a region ends up with two species in it.
  The meadow has since been paired too (§The meadow's second tree), so the count
  is sixteen; it was the one row that needed its own sitting.

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

- ~~**The Meadow's `flowers` prop has a miscounted row, and the vendored copy
  corrects it.**~~ **Fixed in The Meadow on 3 Aug 2026** (its commit `b0306d1`),
  at the user's direction — the one sanctioned exception to "never modify" the
  sibling repo, done in that repo on its own terms with its tests run. The
  history: its bottom row was twelve cells where the other four are eleven;
  its rasterizer sizes the canvas off the first row and silently drops the
  overflow, so the bug never showed there. `content/props.test.ts` caught it on
  its first run in the vendored copy. The two repos' rows match again.
- ~~**The Farm's Menace is one pixel different from The Meadow's, on purpose,
  and The Meadow has not been fixed yet.**~~ **Fixed in The Meadow on
  3 Aug 2026, same commit as the flowers.** The history: its bottom outline ran
  cols 4–9 under sides sitting at 4 and 10, so the bottom-left corner stacked
  two dark pixels and the bottom-right stacked none — the body read as leaning.
  Cols 5–9 lets both corners taper. It was the first edit to vendored canon art
  rather than to a Farm-side seam (`LookPatch`, `mouthDy`); with the Meadow
  side landed, the copies agree pixel for pixel again and nothing is owed.

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

  **And then it quietly stopped being true, which is the lesson.** `marble` was
  added later, with the museum's walls, and no unlock came with it — nothing
  anywhere pushed it into `skins.unlocked`, so the one finish whose `hint` named
  a person ("Winifred knows where the quarry was") was the one finish you could
  never build in. The claim above was correct the day it was written and had no
  way to notice it had aged. `content/skins.test.ts` is now the check, and it
  enumerates the sources rather than counting them: a finish must be a starter,
  a heap row, a commission's `unlocks`, a `given` row, or one of the two the sim
  hands out in a code branch (`walnut`, `slate`, both written out by id with a
  comment saying why they cannot be derived).

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
- **The occlusion fade has its first real user, and it is the trees** (§10f).
  It is keyed to the OVERHANG, `(artPx - TILE) / TILE`, which at a 24px storey is
  half a tile — so a thing one tile in front of you covers your legs and is left
  alone, because that overlap is the depth cue. **A WALL THEREFORE CANNOT FADE AT
  ALL**: collision stops you 0.51 tiles short of it, and the test needs 0.5. That
  is worth knowing before diagnosing anything reported about walls going
  see-through. Trees reach a tile and a half now, so they genuinely fade, and the
  fade eases rather than switching (§10e).
- **"Visibility glitching in and around walls" is reported and unexplained —
  parked (3 Aug 2026) until it can be reproduced.** Not owed work until then.
  §10e smoothed the occlusion fade, which was a real defect but, per the line
  above, cannot be what was seen around a wall. Remaining suspects, for whoever
  picks it up with a reproduction in hand: the roof cutaway, which is judged on
  a room's INTERIOR so crossing a threshold has a step in it; and the rule that
  a wall draws its face only where there is open ground in front of it.
- ~~**A dark runged rectangle sits just south of the homestead tent** and
  nothing accounts for it.~~ **Solved 3 Aug 2026: it was a SHAFT MOUTH, and the
  screenshot harness dug it itself.** The game was innocent — no code path
  sinks a shaft at setup (the v17 migration refuses to by name). The chain:
  `onboard()` in `drive.mjs` clicked through onboarding by falling back to "the
  last button on the page", which once the game is running is ACT; with the
  starting shovel held, its two leftover clicks dug the player's start tile
  twice, and two digs on one tile is the sink gesture (§"A shaft is two digs on
  one tile"). The start tile is one south of the tent, and `drawShaftMouth` is
  exactly a dark rectangle with ladder rungs. So the artifact was in EVERY
  screenshot the harness ever took — including the "fresh save" ones, which is
  why it read as unexplained — while a genuinely fresh game never had it.
  `onboard()` now stops once the HUD's mode button exists and no card is up;
  verified by a fresh boot whose overrides hold no shaft and whose lawn south
  of the tent is unbroken. **The method note: an artifact that appears in every
  photograph but has no cause in the code is a fact about the camera.**

---

## House rules for whoever picks this up

- **The service worker is production-only, and that is a bug fix rather than a
  preference.** `public/` is served verbatim in dev, so `/sw.js` registered at
  scope `/` and took over the whole localhost origin — including `/biomes.html`,
  which is a developer tool with no reason to be cached. Its fetch handler is
  network-first with a cache fallback, which is right for a player on a train and
  wrong for a developer: one second of the dev server being down (restarted, port
  changed, killed while taking screenshots) and it serves the last build it saw,
  then keeps serving it, because the page in front of you came from the cache and
  never asks again. It cost an hour of "the colour isn't updating" on a change
  that was on disk, compiled, and visible in a screenshot. In dev it now
  unregisters any worker already installed and drops the caches, which is the
  half that actually heals a browser.

  **And EVERY entry point evicts it, not just the one that installs it** — the
  fix above lived in `src/main.ts`, which the tool pages never load. So the page
  the shadowing hurt most, the region contact sheet, was the only page that could
  not heal itself: with a stale worker installed you open `/biomes.html`, it
  serves what it cached, and nothing there asks the network again. The cure was
  to go and load the GAME first, which nobody would ever guess. `src/tools/no-sw.ts`
  is imported by every preview page; verified in a real browser by installing a
  worker at scope `/` and watching one reload of `/biomes.html` drop it.

  **If a tool page looks stale, the other suspect is that there is no dev server.**
  Killing vite is how these screenshots get taken, and a page that was already
  open goes on looking fine until you reload it.

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
