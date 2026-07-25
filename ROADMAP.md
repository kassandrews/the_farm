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
- Menu with New town / sound toggle; PWA shell; 192 tests.

**Next: Phase 2b step 4** — assignment. The machinery it needs now exists:
`sim/housing.ts` resolves a claim, `claimAuthoredBeds` is the one-off starting
condition it will generalise, and 2c's stroke buffer is the memory the
moved-bed case needs.

**Save schema is at v8.** Every change ships a tested migration — see
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

- **Money vs. barter vs. neither.** Not needed until the shop lands (Phase 3).
  Current lean: if money exists it must only buy *optional comfort* and never
  gate progression, or it quietly turns farming into a job and breaks the
  no-pressure pillar. Barter (trade produce for goods, no abstract currency) is
  arguably cozier and still on the table. **Do not bake in an assumption.**
- Fishing, interiors-vs-exteriors, async multiplayer postcards — DESIGN.md's
  own open questions. Still open.

---

## Phase 2 — Structures, then the flagship

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

4. **Assignment.** Point a villager at a qualifying room — enclosed, has a door,
   has a free bed. This is the Sims-like "choose an existing house OR build one"
   choice, and it is *also* exactly the acceptance test a Phase 3 commission
   asks. Written once, used twice.

   Step 3 leaves it a specific seam to close: **moving a bed is demolish +
   place**, which mints a new anchor key, so today it unhouses whoever claimed
   it. That's honest rather than broken — they fall back to the plaza — but
   "rehome someone" is precisely this step's verb, and it should cover the
   player who was only trying to slide the bed one tile left. **2c is now built
   ahead of this** so the fix costs no new state: a bed placed in the same
   stroke that removed a claimed one inherits the claim.

   Decided in planning, not yet built:

   - **`qualify()` returns WHY, not a boolean.** `{ ok: true, room, occupant }`
     or `{ ok: false, why: "no-room" | "no-door" }`. The commission needs to say
     "it needs a door" in the Office Creature's voice and the assignment panel
     needs the same fact in the player's; one call site produces both.
   - **No `too-small` verdict.** `qualify` hands back the `Room` on success, so a
     commission checks `room.interior.size` against its own threshold at its own
     call site. A minimum size is a *commission's* requirement, not a housing
     rule — putting it in `assign.ts` would give housing an opinion DESIGN says
     it must not have (size beyond the minimum is delight, never a gate).
   - **The entry point is the dialogue modal, near-gated.** Tap a villager you're
     standing beside → "There's a room for you" → tap a bed, with the reticle
     colouring beds by verdict rather than adding a parallel highlight path.
     Assignment is a conversation, which fits the tone and lets the acceptance
     carry voice; a build-mode furniture panel can't. Near-gating means rehoming
     costs a walk, which is the right amount of friction for a social act.

5. **They comment on it.** Dialogue against the actual room: its size, its
   finish, what's in it. The memory log already carries `built_plank`; this adds
   the house itself as something referenceable.

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

---

## Phase 3 — The town

- **Commissioned housing — the flagship beat.** Now content on top of 2b's
  machinery, not a system of its own. An arriving import pitches a tent; the
  Office Creature files the paperwork (town hall, deadpan, reusing the
  land-claim beat's shape); you satisfy it by giving them a home that meets the
  shell requirements, built or existing.

  **Taste is delight, never a gate.** The hard requirements are structural only
  — enclosed, a door, a bed, a minimum size. Finish, extra furniture, and size
  beyond the minimum are noticed, commented on, and rewarded, but never block
  move-in. A full checklist would turn a gift into a chore with a pass/fail on
  it, which is the wrong feeling and against the no-pressure pillar.

  Preferences derive from form + imported Meadow history (the Menace has
  standards; the Blob wants drama; the Ghost wants it dark). Completing a
  commission is the natural award path for finishes — see Known gaps.
- The other six fixed cast + their institutions: museum (confidently incorrect
  placards), shop, seed stall, errands board, plaza stage, junk economy.
- Resolve the **money/barter** question — it blocks the shop.
- Museum donation loop (gives produce and finds a purpose).
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

- **Non-starter finishes are currently unobtainable.** `walnut`, `whitewash`,
  and `slate` are defined in `src/content/skins.ts` with unlock hints, but
  nothing ever adds to `world.skins.unlocked`. The award path is completing a
  **commission**, which is Phase 3 — deliberately left open rather than bolted
  onto 2b's assignment step, where there'd be no reason for it.
- **Ore is defined but unobtainable** until the underground layer exists. This
  is intentional, not an oversight.
- **Only one resident and one fixed-cast member** exist. `src/content/cast.ts`
  has the intended full mapping recorded as comments.
- **Finishes are town-wide for FLOORS, per-cell for structures.** Walls and doors
  store their own finish (v5), so two houses can differ. Plank floors still read
  the town-wide selection and restyle all at once; worth unifying when floors
  next get touched.
- ~~**Villagers walk through walls and furniture.**~~ Fixed in 2b step 1
  (`sim/path.ts`), and verified on screen in step 2: Margfrom walks from the
  plaza, through her own doorway, to her bed, standing in a wall at no point.
- **A door on an east or west wall is invisible.** Only south-facing walls draw
  a face for a doorway to appear in, so a player who builds a house entered from
  the side gets one they can walk into but can't see the way into. The town's own
  buildings dodge it by convention (asserted in `town.test.ts`), which does
  nothing for player-built houses. The real fix is in the renderer — draw a
  doorway on a side wall's top run — and it wants doing before commissions in
  Phase 3, where a house you built is judged.
- **Nothing guarantees a PLAYER-built house has a clear doorstep.** The town's
  stamp clears its own apron; a player who walls a doorway in against a tree gets
  a house nobody can enter, and the villager will snap inside rather than
  complain. Worth a build-mode warning when a door's only approach is solid.
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
