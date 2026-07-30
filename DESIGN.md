# The Farm — Design Document

*(Sibling of **The Meadow** — formerly Cozy Sprites. In The Meadow,
retiring pets are "sent to the farm" — the classic euphemism, played as a
running joke. The name is that joke landing: the farm is real, and it's
delightful. Farming-the-activity remains fully optional by pillar; the
title refers to the euphemism, not a chore list.)*

A town-life / homestead / building game set in the Meadow's world.
Animal Crossing's skeleton, Stardew Valley's verbs, exactly one organ from
Minecraft. This document is the source of truth for scope and tone; when a
feature idea conflicts with it, the doc wins or the doc gets edited first.

## Premise

When a Meadow pet retires, everyone says it was sent to a farm.

This is the farm. It's real, and it's delightful.

The Farm is a small town of retired sprites, run (loosely) by a fixed cast
of canon characters. The player is a sprite too — newly arrived, granted a
homestead plot on the edge of town, free to do approximately whatever they
want at whatever pace they want. The reveal that the euphemism was true all
along is the game's thesis; nothing here should ever wink harder than that.

## Pillars

1. **You're one of them.** The player is a sprite, not a human visitor.
2. **Nobody gets drafted.** Form is identity, never a job assignment. All
   activities are opt-in; there are no fail states, no energy meter, no
   deadlines.
3. **The world lives while you're away.** Real clock, real calendar, offline
   simulation. Coming back is a feature.
4. **Your land is actually yours.** Terrain is diggable and placeable; the
   house is built, not bought.
5. **Deadpan institutional absurdism.** Small creatures taking ridiculous
   things extremely seriously. If a feature can't produce a moment like the
   Office Creature stamping a terraforming permit, it's off-tone.
6. **Real time gates the living world, never your hands.** Crops, night
   visitors, and festivals run on the clock — that's the 5-minute
   check-in. Digging, building, decorating, and the underground have no
   daily caps, no stamina, no material *scarcity* — the hour-three player
   always has a shovel and a project. This game is meant to be played for
   hours at a stretch as well as in minutes. (Materials exist and are
   spent, but are never rationed; see Materials below.)

## What each inspiration contributes

- **Animal Crossing (the skeleton):** real-time world, villagers with
  schedules and friendship, a museum to fill, gentle no-fail pacing,
  furniture/decoration.
- **Stardew Valley (the verbs):** farming, foraging, gifting, festivals,
  heart-style friendship milestones. *Not* taken: the day loop, the energy
  bar, combat, marriage (at least at first).
- **Minecraft (one organ):** an editable tile world. Dig terrain, place
  tiles, gather materials, build structures — including your own house.
  Top-down 2D tilemap with an underground layer, not voxels. *Not* taken:
  survival, hunger, mobs, crafting-tree sprawl.

## What none of them have (and we will)

Beyond the character import, four gaps all three inspirations share:

1. **Commissioned housing — the flagship.** In AC, villager houses are
   stock; in Minecraft you can build anything but nobody cares; SDV's town
   is frozen. Here, an arrival pitches a tent and *you build their
   house* — tile by tile, from materials you gathered — to *their* tastes
   (the Menace has standards; the Blob wants drama; the Ghost wants it
   dark). Preferences derive from **form**, and from form alone: residents
   are not imports (see Importing, below), so there is no imported history
   to draw on. Then they genuinely live in it: path through it, comment on
   it, tweak a shelf.
   Repeatable, fuses all three inspirations at once, and is the deepest
   long-session sink in the game. First flagship after the vertical slice.

   The underlying verb is **give them a home**, not *build them a house*.
   A home is any room that qualifies — enclosed, a door, a bed that's
   theirs — so you may equally hand someone an existing town building, or
   move them somewhere better later. Building is the most interesting way
   to produce a qualifying room, never the only one. The town therefore
   ships with real houses in it, and they are ordinary built cells: you
   can demolish, extend, refinish, or rearrange any of them.

   **Taste is delight, never a gate.** The only hard requirements are
   structural. Finish, furnishing, and generosity of space get noticed and
   remembered and rewarded, but a villager will move into a plain box you
   made them. A checklist with a pass/fail on it would turn a gift into a
   chore, which is the wrong feeling for the whole game.
2. **NPCs that remember.** AC villagers repeat themselves within a week;
   SDV heart events are finite scripts; Minecraft villagers say "hrm."
   Farm residents keep a memory log — imported raising history from The
   Meadow plus events witnessed here — and dialogue draws on it ("you
   built that fence yourself?"). Scale up the Meadow's `memories.ts`
   pattern; this is what keeps the town alive at hour forty.
3. **Company.** None of the three lets you invite an NPC along. Ask a
   villager to join you — the Dog Thing on errands, the Ghost on night
   walks, anyone for a dig. Friendship grows through doing things
   together, not only through gifts.
4. **Absence as story, not punishment.** AC punishes you for leaving
   (weeds, cockroaches, villagers move out); SDV and MC simply pause.
   Here, away time *generates* news (see Time below) and never generates
   chores or guilt.

## Player identity

At the start you either:

- **Hatch a fresh sprite** — pick any standard form; instant character
  creation, not a raising minigame — or
- **Embody an imported pet** — one of your retired Meadow adults becomes
  the playable character. Its name, form, and history come along.

There is no egg-raising on The Farm — decided, not open. Raising is The
Meadow's whole game; the two should need each other.

**The import supplies your character, and only your character.** Everyone
else arrives on their own. This is deliberate and it decides the shape of
the flagship: commissioned housing has to work for a player who has never
touched The Meadow, and a beat that only fires if you happen to have
retired a spare adult would be a flagship most players never see. The
import is a way to arrive as someone, not a supply of villagers.

Form affects dialogue flavor and small affinity perks (see below), never
capabilities or obligations.

## Importing from The Meadow

The new game reads The Meadow's export JSON (see cozy_sprites
`src/pet/persistence.ts`). Treat it as a read-only foreign format with its
own adapter — never share code, never write back.

One adult comes across, and it becomes **you** — see Player identity. Its
Meadow history (name, favorite food, how it was raised, memories) seeds
the player's own memory log, so your character arrives having had a life:
nobody else's Farm is played by *your* specific Dramatic Blob.

Residents are not imported. They arrive on their own (see Phase 3 in the
roadmap), pitch a tent, and get commissioned a house like anyone else. An
earlier draft had leftover imports become the town's villagers; the
adapter never did it, and the reason to keep it that way is that the
flagship must work identically whether or not you've played The Meadow.

Forms are species, not singletons. Importing a second Scholar is fine; the
museum curator is a specific scholar, yours just lives here. Imports of
secret forms are allowed — the owner earned them.

## The fixed cast (institutions)

Named individuals, like Nook or Blathers — distinct from resident villagers.
Initial mapping, all subject to play:

| Character | Role |
|---|---|
| Tired Office Creature | Town hall. Land claims, permits, progression paperwork. |
| Fancy Little Menace | The shop. Judges your purchases silently. |
| Little Scholar | The museum. Every placard is confidently incorrect. |
| Blessed Carrot | Patron of farming. Sells seeds. Prefers not to discuss it. |
| Loyal Dog Thing | Deliveries and errands board. |
| Dramatic Blob | Festivals and the plaza stage. |
| Gremlin | The recycling/junk economy. Sometimes moves your fences. |

Secret forms stay secret in spirit:

- **Quiet Ghost** — only appears at real-clock night.
- **Stray Cosmos** — rare celestial event visitor, not a resident.
- **Humming Cube** — a *structure*, not a character. A landmark that hums.
- **Maverick Mole** — found only by digging deep. Undocumented. Ships anyway.

### The Mole, specifically

He is the reward for depth, and he is a *person* rather than a payout. That is
deliberate: the underground already refuses to pay more ore the further you go
(§Materials — "you are slowed by a walk"), and a ladder of unlocks at increasing
depths would be a high-water mark with a hat. What the deep rock has that the
shallow rock doesn't is somebody living in it.

- **You find him by breaking into his diggings.** Far out from town the rock is
  already hollow — a wandering corridor somebody else cut, running both ways,
  with a chamber on it. There is no marker, no quest and no direction given;
  you meet him because you tunnelled far enough that his warren was in the way.
  A single chamber in unbounded rock would be a lottery, so it is his *rounds*
  you hit first, and following them is the exploration.
- **He does not move, does not hide, and is not protected.** Sink a shaft above
  his chamber and his ground becomes shallow, because depth is distance from
  your nearest entrance. Nothing intervenes. You paved a road to the hermit and
  the map agrees he now lives near a road; he has opinions about the road.
- **He digs while you're away**, which is the only thing he gives you and is
  not a gift of an item. Your tunnel is a few tiles longer than you left it,
  going the way you were going. It obeys the away rules like everything else:
  it only ever opens rock, never fills it, so it cannot destroy anything, and
  it creates no obligation — nobody asks you to go and look.
- **He gives no directions.** He is undocumented, and a hermit who tells you
  where things are is a map marker with a face (§Tone; secrets are never
  spoiled by UI).

## The museum

The curator is a *specific* scholar — a named institution, where a Scholar
resident is just someone with that form who lives here (§Importing: forms are
species, not singletons). Every placard is confidently incorrect.

**Donation is the third thing the town takes off your hands**, alongside the
Menace's counter and the Gremlin's heap, and it is the one that gives
museum-filling its own way to play (§Town and homestead).

- **Two wings.** A **nature wing** takes gathered things and *some* of what
  grows — finite, small, and the reason the museum is reachable without farming
  *or* without digging. An **antiquities wing** runs on junk.

  It used to say "one of each crop", and the seasonal varieties are where that
  stopped being true. The gallery was sized to the table exactly and the room
  cannot grow — river west, town hall east, plaza south — so five new crops
  would have meant moving the walls of a building people have already put
  things in. The collection stopped being exhaustive instead, which costs
  nothing: the record has no total and no denominator (below), so there was
  never a slot for a pumpkin to be missing from. Corrigal has what she has.
  **Do not read this as licence to skip an exhibit for convenience** — it is a
  statement that completeness was never the promise.
- **Junk is identified at donation, not at pickup.** You hand over ordinary
  fungible junk and the curator decides what it was. Junk stays one item that
  is never carried as a specific object (§Materials), and the variety is free
  for exactly the same reason the finds' toasts are free — nothing is stored.
- **Donation returns nothing.** No item, no finish, no material, no unlock.
  Anything given back would make donating the efficient act rather than a gift,
  and finishes-for-junk already belong to the Gremlin. The payoff is the
  placard, and the exhibit standing on a plinth in a room you can walk through.
- **The museum keeps a record, and the record is not a score.** It has no
  total, no denominator and no empty slots: the collection shows what you have
  given and nothing else. You find out what else it could hold by giving
  something. A completion meter would turn the one part of the game that is
  purely a gift into a checklist — and it is the same rule as secrets never
  being spoiled by UI, applied to something that isn't secret.
- **Nothing may ever gate on the collection.** No commission, no room, no
  acceptance test reads it. It is a place, not a progression track.

## The errands board

The Loyal Dog Thing keeps a board in the plaza. It is a **request board and a
notices column**, and the two halves are held apart on purpose.

**A request is a gift with a name on it.** It is the commission's beat scaled
down to an afternoon: somebody asks, and you may say no. The commission asks
once per arrival and is a building project; this is the everyday version, and
it is the first place friendship is earned by *doing* rather than by talking.

- **It asks for things you can already get**, in ones and twos. Never seed (a
  request payable in seed makes farming a prerequisite for farming —
  §Materials), and never ore. Ore was first excluded for being unobtainable;
  now that it isn't, the reason it stays out is the sharper one. **A card names
  one item and offers no alternative**, so an ore card is "go underground or
  miss this friendship beat" — and this is the first place friendship is earned
  by doing. The counter can take ore precisely because every row there lists
  things she'll take *instead*; a request lists nothing instead.
- **It pays friendship, a line, and a memory. Never an item.** Not a material,
  not produce, not a finish, not an unlock. The Menace trades, the Gremlin
  redeems, the Carrot stocks, the Office Creature stamps; a fifth counter that
  also handed things over would undercut all four, and a request you complete
  for goods is a job. The payment is that somebody wanted something and now
  has it.
- **One at a time, no timer, refusable.** Two open requests turn a favour into a
  backlog, and the backlog is the part that feels like work. There is no
  deadline on an open card. **Refusing costs exactly nothing** and is not
  remembered — the board goes quiet for the same interval either way, because
  if saying no were faster or slower than saying yes it would become a move.
- **The card is in the Dog's hand, on behalf of somebody who lives here.** He
  relays; the friendship goes to the person who asked, and the smaller thanks a
  postman gets goes to him.
- **The table cycles; it does not run out.** A deliberate departure from
  arrivals and antiquities, which both end because both are finite stories. The
  board is the town's everyday pulse, and a board that ran dry is a board the
  town stopped using.
- **He walks a round.** The one institution that moves — deliveries are what he
  *is*, and a delivery service that never leaves its counter is a word on a
  card. So the board must be readable with nobody standing at it.

**A notice states something that has already happened, or is simply true.** No
notice may name a thing for you to do, carry a count, a target, or a completion
state, or read your satchel. The risk this guards against is the notices column
quietly becoming a second to-do list; the defence is structural rather than
editorial, in that a notice is handed a past-tense view of the town with no
inventory and no open request in it, so it *cannot* set you a task.

## Festivals and the plaza stage

The Dramatic Blob keeps a stage in the plaza. **A festival is a total function
of the date** — one per calendar month, on an authored day, at an authored
hour. Nothing schedules it, nothing stores it, nothing counts it. Ask the
calendar and it says whether today is the day.

That is not an implementation note, it is the whole design. Everything below
follows from it.

- **The town gathers; it does not summon you.** During the festival hours the
  residents stop walking their rings and stand in front of the stage. That is
  the entire mechanism: schedule stops consult the calendar, positions stay
  clock-derived, and the whole thing costs no save data.
- **The institutions stay open.** The counters do not close for the party. A
  shop that shuts so you can attend a festival is a deadline in a party hat,
  and this game has none.
- **Being there is remembered. Missing it is not.** Stand in the plaza while it
  is on and everyone present warms a little and remembers that you came. Miss
  it and nothing is lost, nothing is recorded, and nobody mentions it — there
  is no attendance record, no streak, no count, and **nothing anywhere may ever
  gate on having been to a festival**. The reward for going is that people
  remember you were there.
- **The stage is not dormant between festivals.** The Blob rehearses daily,
  which is what makes him worth passing on an ordinary Tuesday. His
  conversation is the programme: what is on today, or what is next, or — in
  the past tense — what the last one was.
- **A festival you missed becomes news, not homework.** If one falls while you
  are away it turns up in the postcard, and the people who were there can bring
  it up afterwards. Absence is story (§Time), so a festival is one of the few
  things in the game that genuinely happens without you.
- **Real months, so seasons arrive on the same axis.** The calendar the
  festivals hang on is the one seasons will hang on later; there is no second
  notion of time to reconcile.

## Affinity perks (instead of jobs)

Forms grant small, flavorful, passive bonuses — never duties:

- A Carrot villager occasionally blesses a crop overnight.
- A Scholar resident offers their own reading of a recent museum exhibit, and
  it disagrees with the curator's. (This line used to say a Scholar identifies
  donations *faster*, which assumed donations take time to identify. They don't
  — a waiting period on the one act the museum asks you to perform is a gate
  wearing a hat. What survives is the funny half: two confidently incorrect
  authorities.)
- A Dog Thing sometimes retrieves things you dropped.

Design rule: a perk should read as *personality leaking out*, not a stat.

## Town and homestead

The town pre-exists: plaza, institutions, fixed cast, a few starting
residents. The player's **homestead** is a plot on the edge of town, chosen
at the start from 3–4 map spots (riverside, forest edge, hilltop, …) —
meaningful choice without blank-page paralysis.

**A riverside town has a river.** It did not, for a long time: the spot's water
was an ocean pinned due west, a fossil of the era when the sea *was* the whole
western half-plane and the name was aspirational. Now one channel of the river
family is anchored through the town, and the town's own bridge is generated
where it crosses. The spot is the one guarantee of running water; the others
take whatever the world gives them.

You start with a tent. The house is **built from gathered materials**, tile
by tile, expanded and reshaped freely — this is the Minecraft leg. Farmland
is part of the homestead: land you own, not a job you have. Farming is
fully optional; builder, forager, and museum-filler are complete ways to
play.

Opening beat: the Office Creature stamps your land claim. That's the whole
cutscene.

## Water

The world is unbounded, so **no water may be unbounded with it**. A body of
water you cannot get around is not a place, it is a wall through the middle of
an infinite map — and the first version of this game had one: every tile west
of x = −13 was sea, at every y, forever. Half the world was unreachable and
the landmark siting had to mirror itself east to avoid drowning the Ghost.

Every body of water is therefore **finite and walk-around-able**, up to and
including the ocean, which is big enough to be an expedition and small enough
to have a far shore you can stand on and look back from. Villagers may believe
the water is the end of the world. Nothing in the game ever confirms or denies
that you got round it.

And **nothing singular on an unbounded map either**, which is the same rule seen
from the other side and took a second pass to notice. Making the sea finite
fixed the wall and left one ocean on an endless dry plain — walk far enough in
any direction and water simply stopped happening. A world with exactly one of
something is a diorama with a horizon painted on it. So seas and lakes are
**scattered**, each on its own lattice of jittered centres, the way the Fen's
ponds already were: about one tile in ten is salt water, a coast is three or
four minutes' walk at the median, and there is always another one.

The consequence is that **no town is promised a coast**. Every homestead gets a
lake within a walk, because there should always be big water to go and look at;
whether you can smell the sea from home is a thing that varies, and therefore a
thing worth saying about your particular town. The exception is the ground the
town itself stands on, which is kept dry on purpose — a lattice has a cell over
the origin exactly like it has one everywhere, and a plaza under two feet of
water is not a design choice.

### Depth is one number

Water has a **signed distance to its own shore**, and everything else is a
threshold on it:

    d > shelf   deep      solid; the barrier
    d > 0       shallow   walkable; you wade
    d > -beach  sand      shore
    else        land

`shelf` and `beach` are per water kind — a content table row, not a code path.

The consequence is the design, and it wasn't legislated: a stream is one or two
tiles wide, so it is never far from its own bank, so it is **wholly shallow and
fordable**. Small ponds likewise. Water is deep in the middle, and small water
has no middle. "You can always cross a stream" is geometry rather than a rule,
which means nobody has to remember it when adding the next kind of water.

Five kinds: **streams** (never deep), **ponds** (deep only if unusually large),
**rivers** (deep down the middle — the first water that can actually stop you),
**lakes** (wadeable rim, real barrier in the middle), and the **sea** (a proper
shelf, then the deep).

**Wading is slower than walking**, and that is the whole of what crossing water
costs you. A tile may carry a speed multiplier; shallow water is the only tile
that does, at 0.6, and it applies to villagers as well as to the player. It is
not a stamina system and must never grow into one (see the invariants): there is
no budget, no meter and no recovery — you are slow while you are in the water and
ordinary the moment you step out. Sand stays at full speed, because a beach is a
place, not an obstacle.

Streams run in **two families on different bearings**, so they cross and join
and the world has no grain. That is an approximation of a drainage network and
openly so: real veins come from flow accumulation on a height field, which is
iterative, and terrain here is a total function of (seed, x, y) with nothing
stored. Two bearings buy most of the look and cost none of the foundation.

**A river narrows here and there, and where it narrows it is fordable** — the
same emergent rule as the stream, applied to a channel big enough to need it.
So you are never *blocked* by water, only asked to walk the bank a while, or to
put planks down because you are tired of looking.

### Sand is a skin, and it means big water

Beach is the shore's own ground: sandy coloured, and behaves exactly like the
grass and dirt it replaces — diggable, tillable, plantable. It carries no
material, gates nothing, and grows nothing special. It is what the edge of
water looks like, and that is the whole of its job.

**Only the big water has it.** Seas, lakes and rivers get beaches; streams and
ponds meet the grass directly. That is a free piece of legibility — you can tell
what kind of water you are looking at before you reach it — and it is also the
honest answer to a rendering problem: a one-tile sand band on a two-tile channel
lands between cell centres as often as on one, so it came out as chunky patches
on alternating banks rather than as a shore. A beach needs a body big enough to
have one.

### The town has bridges

Rivers may run through town, because a river is a good thing for a town to have.
What pays for that is a crossing: where a channel meets the town's two centre
lines, the water is decked. It is **generated**, like the plaza's paving — the
town pre-exists, so its bridges pre-exist, and a town that needs one has always
had one.

This is a promise to the RESIDENTS more than to the player. A villager who
cannot reach their stop does not walk slowly; they arrive anyway, instantly,
because the alternative is a neighbour who walks into a river forever. A town
cut in half therefore doesn't look like a town cut in half — it looks like
everyone teleporting.

### You may cross it, and you may fill it

Both follies are open, and both are the existing verbs reaching further:

- **Planks go down on any water, deep included.** Someone sufficiently
  committed can bridge the ocean and stand on the far shore having built a pier
  the length of the world. This is allowed on purpose: real time gates the
  world, never the player's hands (§Pillars), and the game is open to fantasy
  as a fundamental facet. The villagers have no word for what you did.
- **The shovel fills any water you can stand next to.** Shallow is underfoot,
  like turning over a lawn; deep is the tile you're facing, like felling a
  tree. Filling leaves sand, which is new shore to stand on for the next tile —
  so the ocean is fillable, from the edge inward, forever. Nothing
  special-cases the sea; it is the longest instance of the rule that also
  tidies a puddle. Terraforming is always free (§Materials), and that has to
  include the water or it is a slogan.

**Filled water does not heal.** This is the one deliberate exception to "the
world heals where you aren't invested" (§Materials). Grass closing over a hole
you abandoned is generous; a sea closing over an afternoon's work while you
were asleep is a tax on the one activity the doc calls free. Water finding its
level is good physics and bad cozy.

### What water may never do

- **Never spread, never flow, never rise.** Terrain is a total function of the
  seed plus your stored edits. The moment water simulates, terrain stops being
  derivable and starts having to be saved.
- **Never be created.** There is no water-placing tool. The asymmetry is the
  point: you may unmake the world's water, and the world does not make more.
- **Never gate a material.** No recipe, yield or unlock is across water — same
  invariant as biomes. Water changes how far you walk, never what you may have.

## Materials

Three gathered classes, and no more: **wood**, **stone**, and **ore** (one
entry covering every metal). Soft goods — cloth, cushions, curtains — are
deliberately *not* gatherable; the shop sells what you can't gather, which
is what gives the Menace's counter a reason to exist.

**Junk is found, never gathered, and is not a fourth material.** The three
gathered classes above are the complete list of things you *build* with,
and junk is not among them: nothing you place costs junk, and no
structure is made of it. It is what the ground turns up when you dig —
the Gremlin's whole economy, and the third thing the town will take off
your hands. Keeping it out of the material set is what stops "three
gathered classes, ever" from quietly becoming four; a thing you can hold
is not automatically a thing you can build with.

**The deep rock has junk in it too, and the shallow rock does not.** Cutting a
tunnel face turns things up the same way turning a lawn does — same item, same
un-farmable rule (what a cell holds is fixed by the seed before anyone stands
there), different toast. The threshold is a *fact about the fiction* and not a
payout curve: near your own shafts you are under ground you have already turned
from above, and it is only past that — rock nobody has been near — that
anything is left. One threshold, no ramp, and nothing anywhere counts how deep
you have been.

It exists so that the antiquities wing has a second source. Junk rode entirely
on the surface shovel, which made "dig up the lawn" the museum-filler's one
verb; a second place to find the same item is the same fix as every counter
listing alternatives, one axis over.

**And the Gremlin leaves some in your grass while you are out.** A third source,
and the only one that arrives rather than being looked for: come back from a
day away and there may be a thing or two lying on your plot, which he describes
as a delivery. It is picked up with the same verb as a mushroom, on bare ground
only — never on your floorboards, never over a crop.

This is junk answering to the check-in pillar rather than to a verb, and it is
allowed to exist only because **what is lying there is capped**. The ceiling is
on the objects currently on the ground, not on how many he has ever left, so
picking things up is what makes room for more. That is what keeps absence from
being a faucet: a fortnight away leaves the same few objects as a day away, and
the un-farmable rule that governs digging survives a source that isn't dug.

**Seed is one item; the variety is a free axis.** You carry *seed* — never
"carrot seed" and "potato seed" — and which crop goes in the ground comes
from a variety you have unlocked permanently at the Blessed Carrot's
stall. This is the appearance rule below, pointed at farming: seed is the
stuff, the variety is the look, so the item table grows by exactly one row
and can never grow by one row per crop. Varieties are weightless, cannot
be lost, and are redeemed once; seed itself is ordinary and unlimited.

**A harvest always returns seed**, and that is load-bearing rather than
generous. A seed you spend to plant is a ration, and rations are what this
game refuses; returning seed at the other end means a plot you keep
sustains itself, and the stall is how you *start* and how you *expand
quickly* rather than a tollgate you pass through every planting. You can
be slowed for a minute, never stopped.

**No crop is better than another.** Varieties differ in *time* — a fast
one, a slow one — never in yield or in what they're worth at the counter.
The moment one crop out-earns the rest, "farming is fully optional"
becomes "grow the good one", which is the same failure the barter rule
below exists to prevent, one axis over.

This survives seasons intact, and the survival is deliberate. A crop that is
prettier in its own month is not a better crop: nothing anywhere may read the
season to decide a price, a yield, or a growth time. The season reaches exactly
two things — one draw flourish and one line of dialogue — and neither of them
is a number.

**The counter is barter, not money** — settled, not open. You hand over
something you have and she hands over cloth; there is no currency, no
wallet, and no running total anywhere in the game. The reason is a pillar
rather than a preference: with a single currency, the fastest way to earn
it becomes the way you're expected to play, and since produce is the
obvious earner, "farming is fully optional" would quietly become "farm if
you want cushions". So every row at the counter must be payable from
materials *and* from produce, and later from junk — whatever you actually
do, the town has a use for what it leaves you holding.

Ore is one of those alternatives and never a requirement. A row may list
it beside the wood, the stone and the carrots; no row may list it alone.
That distinction is the whole safety of it — an extra way to pay gates
nothing, and the digger gets the same sentence from her that the farmer
does.

**What ore BUILDS is light, and only light.** The lamp is the one object
made of metal: a post with a brass head that throws a warm pool where you
put it — in a tunnel, where the dark is real, and on your own land after
sunset. The reason it is a lamp rather than a fourth kind of chair is that
the game already had a lighting model and nothing that could add to it; the
underground's whole texture is that you see as far as you are lit.

The same sentence above is what keeps it safe: **nothing may ever require
one.** No wall, door, floor or bed may cost ore, or giving somebody a home
would mean going underground first — the one thing this section forbids ore
to do. A lamp changes what you can see and nothing you can do: you can dig
at 3am in the pitch dark perfectly well, and a lit tunnel is a tunnel
somebody has been working rather than a tunnel that finally functions.

**The rock is not somewhere you build a room.** Walls, floors and doors stop
at the shaft. This is a rule about what the underground *is* rather than a
technical limit — a room down there would want enclosure, a roof and a
flood fill through solid stone, which is a building where a tunnel should
be. You install a light in the rock; you build a house on the grass.

**Appearance is a separate, free axis.** Any built tile can wear any
unlocked finish at no cost: pale pine, dark walnut, whitewash. A finish is
a property of the tile, never a different item. This is the rule that keeps
the inventory small — item count is the number of *materials* (three), not
materials × looks (dozens). Changing a finish costs nothing, carries
nothing, and can be done to things already built. Some finishes are
available from the start; others are earned through friendship, discovery,
and the underground, and once earned are permanent and weightless.

There is **no crafting table and no recipe tree** — placing a thing *is*
making it. Pick an object, see its cost, put it down. This is Animal
Crossing's placement, not Minecraft's grid; "crafting-tree sprawl" is on
the explicit not-taken list.

Materials are required but never rationed:

- Terraforming is always free. Digging and shaping land costs nothing,
  ever — the shovel is never blocked. That includes **water**: filling a
  stream, a pond or the sea itself costs no material and needs no tool you
  don't already hold (§Water).
- One tree yields many boards. Cost is a rhythm, not an economy.
- Felled trees and rocks regrow on the real clock — *unless you've claimed
  that ground*. Clear a tree and leave bare dirt and it returns; clear it
  and pave, till, or build there and it's yours for good. The world heals
  where you aren't invested and stays exactly as you shaped it where you
  are. **Filled water is the one exception** and §Water argues it.
- **Ore veins do not come back, and that is the same rule and not an
  exception to it.** Underground there is no unclaimed ground: every open
  cell down there is one you cut, so a vein regrowing would re-block a
  corridor you already dug — the precise outcome the claim rule exists to
  prevent. What replaces regrowth below is *distance*. The rock is
  unbounded, so ore is never scarce, only further off; you are slowed by a
  walk, which is the one thing this list permits.

You can be slowed for a minute. You can never be stopped, capped, or made
to grind.

## Structures and the third dimension

The camera is **3/4 oblique** — ground seen from above, but anything
standing up shows its face. This was never really a free choice: the
vendored Meadow sprites are front-facing and can't be re-authored, so the
world has to meet them. Structures follow the creature convention, not the
ground convention. Isometric is off the table for the same reason.

**There is no height axis — there is one storey.** Every tile is
ground-level or one storey tall. This is the Minecraft organ taken at its
minimum: an editable world, not voxels. Underground (later) is a layer,
not a height.

A storey is **24px — one and a half tiles**, not one. Standing art is
drawn upward from its footprint's bottom edge, so at exactly one tile a
wall would fill its own cell and overhang nothing, which is to say it would
look like a differently-coloured floor tile: the flat plan view we
rejected. **The overhang is the height cue.** At 24px a wall stands half a
tile proud of its cell and a 16px creature comes up to two thirds of it —
small creatures, cozy small houses.

- **One wall material, autotiled.** The player paints "wall"; the game
  picks face, side, or corner from the neighbours. Nobody chooses a
  north-west corner piece from a menu — same rule as finishes, item count
  stays at the number of *materials*.
- **A wall running away from the camera shows its top, not its face.** Its
  face is hidden behind the piece in front of it, so drawing one gives an
  enclosure a uniform band on all four sides and the house reads as an
  earth berm. Only walls with open ground in front of them get a face.
- **Roofs are derived, never placed.** Build walls and a door; when the
  region encloses, the roof appears. Closing the last gap and watching the
  roof arrive is the "it's a house now" beat, and it isn't for sale. It
  also makes "is this an enclosed room" checkable, which is what
  commissions need to ask.
- **Orientation belongs to furniture, not to structure.** A bed is 1×2 and
  faces a way. A wall does not — its neighbours decide how it looks.

**One continuous world; no interior scenes.** Walk in and the roof fades
away in place — same coordinates, same map, no transition. The cost is
honest: a house has no TARDIS interior, the footprint you build *is* the
room you get, which is what makes building it tile by tile mean anything.
The gain is that a resident genuinely pathing through their own house is a
thing you can stand in the doorway and watch.

**Any build stroke can be undone, immediately.** Erase already refunds
materials, so a demolition never costs you wood — it costs you the
*arrangement*, which is the part you actually spent time on. One level of
undo, scoped to a whole drag stroke rather than a cell (build mode paints
on drag; undoing thirty cleared cells one at a time is no undo at all),
covering placement and erasure alike. It restores the cells and reverses
the stroke's own material cost, so it can never fail for want of wood —
an undo that's unavailable exactly when you need it is worse than none.

It lives in memory and never in the save: it survives until your next
stroke and dies on reload. Undo is for the drag that went wrong five
seconds ago, not for regretting a house three days later. Building stays
consequence-free in the direction that matters — you can always try
something, because you can always take it back.

**Build mode flattens the view.** Holding a structure tool drops raised
faces to translucent outlines, hides roofs, and shows the ground grid —
plan view while you build, 3/4 while you live there. Tap places, drag
paints a run. This also splits the verbs cleanly: the **ACT** button is
what you do to the tile at your feet (dig, gather, plant, water, harvest),
**BUILD** is a mode where you edit the map by tapping it.

## Time and the away simulation

- **Real clock, real calendar.** Day/night follows the actual clock; seasons
  and festivals follow the actual calendar (as The Meadow already does).
  No in-game day loop, no energy meter, no forced sleep.
- **Crops grow in real time.** Check back tomorrow. This powers the
  5-minute phone check-in loop.
- **Offline simulation.** While you're away, villagers keep living: the
  Scholar mounts a new wrong exhibit, mushrooms spread, the Gremlin
  relocates a fence. Returning shows a short "while you were out" summary
  in The Meadow's postcard tradition.

### Seasons

- **Four seasons, derived from the month**, on the same axis the festivals
  already hang on. There is no second notion of time to reconcile, and nothing
  about a season is stored — it is a total function of the date, exactly as a
  festival is.
- **A season is weather and light. It is never agriculture.** It repaints the
  ground, the trees and the sky, and gives the town something to remark on. It
  does not touch what you may plant, how fast anything grows, or what anything
  is worth.
- **No crop is ever season-gated for planting.** A seasonal variety is unlocked
  forever at the stall and goes in the ground in any month. Real time gates the
  living world, never your hands (Pillar 6) — a crop you cannot plant in March
  is a deadline with a leaf on it.
- **In its own month the ripe plant draws with a flourish and the town has a
  line about it, and that is the entire mechanical difference.** Same rule as
  taste: delight, never a gate. Out of season it grows identically and looks
  plain.
- **Nobody ever recommends planting anything.** Villagers remark that it is the
  month; a line like "you'll want to get the kale in" is a quest marker with a
  face, and it inverts this whole section.
- The underground has no season, for the same reason it has no sky.

## Tone and dialogue

Inherit The Meadow's house rules wholesale (see vendored content):
per-form voice layers, brevity, distinct openers, ellipsis style
(`. ... Capital`), and `"..."` as a complete valid line. Every form's voice
is already established across 11 characters — new dialogue must pass as
written by the same hand.

Discovery is the signature: secrets are never listed, hinted at only
obliquely, and never spoiled by UI (no "???" slots for the hidden).

## Platform

One responsive **web app (installable PWA)**. Touch-first design —
tap-to-move, context-sensitive action button — with keyboard (WASD +
hotkeys) as a desktop enhancement. Two session shapes, both first-class:
the 5-minute phone check-in and the hour-long desktop build session.

## Vertical slice (build this first, nothing else)

1. One surface chunk + a town plaza stub; camera; tap-to-move.
2. Homestead plot with a tent.
3. Dig and place two tile types (dirt, wood plank).
4. One crop — the carrot, obviously — plant → water → harvest over real
   hours.
5. One fixed-cast NPC (Office Creature, land-claim beat) and one imported
   villager walking a schedule with a handful of lines.
6. Day/night tint from the real clock.
7. Versioned save/load, including a Meadow import adapter for one pet.

Everything else is horizontal expansion after this skeleton walks — starting
with commissioned housing, the first flagship.

## Open questions (decide later, don't block)

- Fishing? (Probably yes eventually; it's the coziest verb not yet listed.)
- Multiplayer: likely never real-time; maybe async postcards between towns.
- ~~Decorating interiors vs. exteriors-only~~ — settled: both, continuously.
  Interiors are the same world with the roof faded off (see Structures).
