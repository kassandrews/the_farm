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
- Menu with New town / sound toggle; PWA shell; 86 tests.

**Save schema is at v4.** Every change ships a tested migration — see
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

### 2a. Real structures

Right now you can only lay **floors**, so "a house" isn't yet something the game
understands as an object. Needed before commissions mean anything:

- Walls, doors, roofs. Multi-tile objects with orientation.
- A notion of an *enclosed room* (flood-fill from a tile, bounded by walls) —
  this is what makes "a house" checkable, and later what makes interiors and
  "does this house satisfy the commission" possible.
- Furniture placement (wooden pieces buildable; soft goods await the shop).

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
- **Finishes are town-wide, not per-tile.** Changing the finish restyles every
  built tile at once, because the selection lives on the world rather than on
  each placed tile. Fine for now; commissions will likely want per-building
  finishes, which is a schema change.
- **Villager "witness" has no proximity model for memory** — everyone hears about
  everything (friendship *is* proximity-gated). Fine in a town this small.
- **PWA icon is a single SVG.** Real raster icons before any app-store-ish push.

---

## House rules for whoever picks this up

- Read `DESIGN.md` first; it is the source of truth. If code and doc disagree,
  **fix the doc first**, then the code (CLAUDE.md).
- Build the current phase before expanding sideways.
- Every schema change ships a tested migration. The game is live.
- Verify rendering and interaction changes in a real browser, not just tests —
  the two worst bugs so far (gathering being unreachable, and gathering
  hijacking the build tool) both passed unit tests and failed in the browser.
