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
- Menu with New town / sound toggle; PWA shell; 125 tests.

**Save schema is at v6.** Every change ships a tested migration — see
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

### 2b. Commissioned housing — **the flagship**

DESIGN.md's stated first flagship, and the deepest long-session sink in the
game. An arriving import pitches a tent; you build their house, tile by tile,
from materials you gathered, to *their* taste (the Menace has standards; the
Blob wants drama; the Ghost wants it dark — preferences derive from form +
imported Meadow history). Then they genuinely live in it: path through it,
comment on it, tweak a shelf.

Requires: 2a, the friendship system (done), the memory log (done), and finish
unlocks actually being awardable (see Known gaps).

---

## Phase 3 — The town

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
  nothing ever adds to `world.skins.unlocked`. Needs an award path (friendship
  milestones, discovery, underground) — most naturally alongside Phase 2b.
- **Ore is defined but unobtainable** until the underground layer exists. This
  is intentional, not an oversight.
- **Only one resident and one fixed-cast member** exist. `src/content/cast.ts`
  has the intended full mapping recorded as comments.
- **Finishes are town-wide for FLOORS, per-cell for structures.** Walls and doors
  store their own finish (v5), so two houses can differ. Plank floors still read
  the town-wide selection and restyle all at once; worth unifying when floors
  next get touched.
- **Villagers walk through walls and furniture.** Collision was added to the
  PLAYER's step (per-axis, so you slide along a wall rather than sticking);
  `tickVillager` still moves freely. Harmless while routines only cross open
  town, and the first thing to fix in 2b — DESIGN promises residents "path
  through" the house you built them, which is exactly the case this breaks.
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
