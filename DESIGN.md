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

**And the twin is allowed to be a twin.** The player and the fixed cast are
always canon art, and secret forms have no looks to deal from (they are one
person each, so `content/looks.ts` gives them the canon entry and nothing
else). So an imported Scholar is Winifred's double, an imported Carrot is
Derek's, and an imported Ghost is Eloise's. That is accepted, not a bug to
dedupe. The character picker offers only the six standard forms, so this is
reachable by import alone — and the fix would cost more than it buys:
authoring look rows for forms whose whole premise is that there is exactly
one of them, and breaking "the player is always the canon art", which exists
so the sprite you chose is the sprite you get. The one real price is that an
imported Ghost is abroad in daylight before you have ever met Eloise, which
takes some air out of her night-only arrival — but her *name* is the secret,
not her silhouette (see the fixed cast), and the only person who can import a
Ghost already earned one in The Meadow and knows the shape by heart. They are
spending something they had already spent.

## The fixed cast (institutions)

Named individuals, like Nook or Blathers — distinct from resident villagers.
Initial mapping, all subject to play:

| Name | Form | Role |
|---|---|---|
| Gary | Tired Office Creature | Town hall. Land claims, permits, progression paperwork. |
| Arabella | Fancy Little Menace | The shop. Judges your purchases silently. |
| Winifred | Little Scholar | The museum. Every placard is confidently incorrect. |
| Derek | Blessed Carrot | Patron of farming. Sells seeds. Prefers not to discuss it. |
| Pesto | Loyal Dog Thing | Deliveries and errands board. |
| Aurelio | Dramatic Blob | Festivals and the plaza stage. |
| Nub | Gremlin | The recycling/junk economy. Sometimes moves your fences. |

**A name is a person; a form is a species.** The two columns are the whole rule,
and the table used to have only the second one — the villager at the desk was
*named* "Tired Office Creature", which quietly made §Importing's "forms are
species, not singletons" false wherever you could actually see it. Everyone in
the game has a personal name now, institutions included; the form column stays
canon (it is what The Meadow calls them) and the counters print the *place*
under the name, not the species. Voices per form live in `content/names.ts`.

**No two of a form look alike either.** Anyone who moves in gets a *look* — one
variation on their form's canon art, a body colour **or** one accessory, never
both. The fixed cast above and the player are always the canon art; residents
never are. It is derived from who they are and stored nowhere.

### Paperwork

Filings are the town's deadpan self-government, and Gary's counter is where they
happen. A filing is a form you submit at the hall; the joke is that these
creatures govern themselves this earnestly, at this length, about this little.
Filing is free, because nothing here costs anything.

**Two classes, and they are not the same feature.** **Flavour filings** change
nothing and exist to be filed and to sit in the cabinet — Petition to Rename
Tuesday, Official Recognition of Tiny Mountain, Certificate of Suspicious Moss,
License to Haunt. **Filings with teeth** change a rule, and each is a separate
decision taken on its own merits, never a free addition. The flavour stack alone
carries the whole idea; teeth are added one at a time or not at all.

- **Forms arrive in batches, and each batch has a reason.** The hall does not
  hand you a catalogue on day one. It has the forms it has always had, and then
  a referendum happens, or an audit, or somebody finds a drawer, and the town is
  suddenly obliged to offer three more. The reason is printed with them and is
  the best part. This is bureaucracy doing what bureaucracy does — accreting —
  and it is the town changing around you rather than a list you work through.
- **A batch is a total function of how long you have lived here**, on the model
  of §Festivals. Nothing schedules a batch, nothing stores one, nothing counts
  them; ask the calendar how long you have been in town and it says which forms
  the hall is currently obliged to offer. Real time gates the living world here
  exactly as it does everywhere else, and never the player's hands: a form you
  have not been offered yet is not a thing you are failing to do.
- **The cabinet is a record, not a score** (§The museum, and the same sentence).
  No filing count, no total, no "forms remaining", and nothing anywhere may gate
  on having filed anything. Reading old filings is half the delight; browsing
  them is not a checklist because there is nothing to complete.
- **The counter is not a to-do list.** No filing names a task, carries a target,
  or shows a completion state (§Errands notices: past tense, no task). A form
  you have filed leaves the counter and lives in the cabinet, so the counter is
  only ever what the hall currently has — and when it has nothing, it says so as
  a fact about the hall, not as a verdict on you.

Secret forms stay secret in spirit:

- **Quiet Ghost** — only appears at real-clock night. She is **Eloise**, but the
  game does not tell you so until you are close to her: a secret's name is the
  one friendship milestone worth being able to point at, and a name you were
  told is worth more than a name you were shown.
- **Stray Cosmos** (Sidra) — rare celestial event visitor, not a resident.
- **Humming Cube** — a *structure*, not a character. A landmark that hums.
- **Maverick Mole** (Malcolm) — found only by digging deep. Undocumented. Ships
  anyway.

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
at the start from four map spots — meaningful choice without blank-page
paralysis.

**A spot names terrain, not a mood.** Each of the four obliges the generator to
put a particular thing within sight of the plot, and the card says which:

- **the riverbank** — a river past the bottom of the garden (see below),
- **the forest edge** — a clearing with the town in it and pines from about
  twenty-four tiles out,
- **the lakeside** — the lake every town is promised anyway (see §Water), moved
  in to about thirty tiles,
- **the coast** — a shore about thirty-four tiles out.

This is a rule and not a description, because it was once neither. *Hilltop* was
the fourth spot for a long time and no line of code ever read it: it generated a
world identical to the default while its blurb promised a view of the town. A
spot that changes nothing is a choice that isn't one, and the fix has to be
stated as an obligation or it decays back into flavour text. Anything added here
later has to name terrain too.

**A riverside town has a river.** It did not, for a long time: the spot's water
was an ocean pinned due west, a fossil of the era when the sea *was* the whole
western half-plane and the name was aspirational. Now one channel of the river
family is anchored through the town, and the town's own bridge is generated
where it crosses. The spot is the one guarantee of running water; the others
take whatever the world gives them.

**The plot is a real parcel, and it is fenced.** A lane runs south out of the
square and ends at your gate; inside the fence there is a barn, a yard in front
of it, your tent, and grass. This amends the older reading of this section, in
which "a plot on the edge of town" was a tent standing on open ground with
nothing to say where the plot began or ended — a spawn point rather than a place.

**The fence is signal, never a rule.** Nothing in the game reads the boundary to
decide what you may build or where: you may build anywhere outside it that you
may build anywhere else, and you may pull the fence down for the wood. A boundary
that refused you would be the first "you may not build here" rule in a game whose
entire build layer has none, and it would be the same mistake as a stamina meter
wearing a different hat.

**The barn stands there before you arrive, and it does nothing.** There is no
barn mechanic — no chore, no capacity, no upgrade path. It is a room you own with
a door on it, exactly like every other building in this town, and it exists so
the lane arrives somewhere and so the ground is recognisably yours in the first
minute. Use it or leave it empty. A barn that asked something of you daily would
be the first thing in this game that did, and the invariants forbid that shape.
What is in it is the previous occupant's leftover materials, which is why you
start with wood and stone rather than wood alone.

You start with a tent, and the house is still **built from gathered materials**,
tile by tile, expanded and reshaped freely — that is the Minecraft leg and the
barn does not stand in for it. Farmland is part of the homestead: land you own,
not a job you have. Farming is fully optional; builder, forager, and
museum-filler are complete ways to play.

**And you take the tent down yourself.** Everyone else's tent goes when the
Office Creature stamps a commission; there is no commission for the person
who was already here, so yours comes down by hand — once you have a bed in a
room with a door, which is the identical structural test every villager's home
is given, with no minimum size because nobody is filing a form about where you
sleep. Nothing is spent and nothing is destroyed. Tear the house down and the
tent is back up, because you have to live somewhere and no flag may claim
otherwise.

Opening beat: the Office Creature stamps your land claim. That's the whole
cutscene.

### The plaza is the datum

The meadow was **surveyed** — of course it was — and the peg went into the town
plaza, so the plaza reads zero and nowhere else does. The HUD carries the grid
reference in the top-right corner, in the clock's own chip: `W 42 · S 118`, and
`0 · 0` when you're home. East and south are positive, matching the screen.

That is the whole of the navigation system, and it is deliberately not a compass.
Walking toward zero on both legs is a thing you work out rather than a thing you
follow, and the world stays explored rather than routed. There is **no minimap**
and there will not be one: a map that shows you the grove or the humming cube has
spoiled a secret the UI was never allowed to mention.

It is worth being clear why numbers on screen are allowed here when a season
label was not (that chip existed and was cut). A label naming what you can
already see turns noticing into reading. The hour earns its chip because you act
on the hour; the reference earns its chip because you steer by it. The season was
weather, and weather needs no caption.

## Biomes

The world is unbounded and it must not be uniform, or a player has no way to say
where they are. Biomes are **the wayfinding system**: you navigate by "out past
the birches", which is how anybody navigates anywhere. Regions are sized to be
walked across rather than admired from a distance, and their borders are
irregular, so there is no seam to find.

**Borders fade, except where the real thing has an edge.** Two kinds of country
meeting — a wood and a scrub, a fen and a meadow — have no line between them in
life, so a visible one is an artefact of the generator and gets blended away over
about ten tiles. That is the rule, and it stays the rule. But a region whose edge
is a real edge may **declare it and keep it**. The test is whether the *place* has
an edge, never whether the seam is convenient.

There are two ways a place ends, and they are not the same picture:

- **A shoreline.** The salt flats: a pan is a lake bed, the crust ends where the
  water used to reach, and that is a line you can stand on. Fading it invents a
  hundred tiles of neither-turf-nor-crust, which exists nowhere.
- **A burn.** The cinders and the caldera: fire stops where it stops, in tongues,
  leaving pockets that never caught. So the edge is hard *and wanders* — the same
  all-or-nothing answer with a low-frequency field pushing the line a few tiles in
  and out along its length. A blend across a burn says the fire faded out, which
  fire does not do; a straight line says somebody mowed it.
- **An outcrop.** The granite: what ends here is not a surface but a *thing*, and
  rock does not get greener as you walk away from it — soil covers it or it does
  not. So its bare sheets stop being diluted at the border and start being
  **rarer**: each outcrop keeps its own colour, and the ground has to be more
  strongly rock to put one down the further out you are. Country interfingering,
  which is what the margin of rock country does.

A declared edge is **colour only, and never moves a border**. What answers sharply
is the ground; the flora still dithers across, so the trees thin out over the
approach to a pan and live ones stand inside the margin of a burn. A region's own
*internal* variation keeps its soft edges either way — a sheet of rock inside the
granite still has soil thinning over it, because that gradient is a real one. And anything
that *flows* across it still fades, because water carries the place downstream
where the ground cannot.

A biome is **colour, growth density, and flora silhouette. Nothing else.** Not
one number in the table touches a yield, a recipe, a growth time or an unlock. A
cherry tree chops into `wood`. A biome that gated a material would be a daily cap
on building wearing a hat — *walk two hundred tiles or no pink house* — and there
are no caps here. What a region changes is how somewhere looks, and the reasons
to walk there are that it looks like somewhere and that somebody asked to live
in it.

Every colour is a **tint, not a value** — a direction and how far to go — which
is what lets biome and season compose instead of fighting. Autumn still turns the
world; the fen is a murkier autumn and the blossom rows stay stubbornly pink.

**What grows in a region is DECOR, and the gathered things are not part of it.**
Ferns, reeds, tussocks, pebbles, a biome's own flowers — a region may have as much
of its own as it likes, because none of it is worth anything. Decor gates nothing,
costs nothing, is picked up by nobody, and no acceptance test can see it, which is
precisely what makes the kits free to be extravagant.

**A TILE IS AN OBJECT AND YIELDS ITS MATERIAL; A MARK IS TEXTURE AND YIELDS
NOTHING.** That is the line, and it is drawn where it is because it is the only
version a player can read off the screen. Decor is *paint on the grass* — there is
no object there to take, which is why nobody expects to pocket a tussock or a
flower. Anything that occupies a whole tile, stands up, and stops you walking
through it has announced itself as a thing, and a thing made of wood that gives
back no wood is a promise broken.

Fallen logs used to be in the list above, and were moved out after they were
built: a solid, tile-sized, obviously-wooden object standing next to a shrub that
pays two wood for the same swing does not read as decor whatever a doc says. They
gather like everything else made of wood now. The carve-out is for things somebody
PUT there — a mailbox, a signpost, the cube — which are tiles and yield nothing
because they are not material, they are somebody's.

The gathered scatter is the mushroom, and it stays **one item with one density
rule**: a region may change what its mushrooms look like and may never have more
of them for being far out. That is the same sentence §Materials makes about
depth, one axis over — the far country is stranger, never richer — and it is the
line the first draft of the far regions crossed and had to be pulled back from.

So the test for anything added to a kit is not "does it fit the palette" but
**"can you carry it home?"** If you can, it is the mushroom wearing a hat and it
answers to the mushroom's rules. If you can't, it is free.

### Rolled regions, and sited ones

Most regions are **rolled**: a field decides which one owns a patch of country,
and you happen into them. A few are **sited** — placed at a real coordinate on
their own bearing, so you go and find them. The blossom rows were the first and
are one per town, because being the only one is what makes an arrival able to ask
to live there.

A sited region may also **recur outward forever**, on a ring and a spacing of its
own, exactly as a found place does — that is what the redwood stands are. The
argument is the found places' argument applied to country: one per town says the
world runs out of woods, on a map that does not run out. Walking further has to
keep finding more.

And a sited region may have **a heart that only some of them have**. About one
redwood stand in four holds a grove of giants, decided by a hash of that stand's
own site. Nothing marks which; you reach it by walking into an ordinary wood and
continuing. It is the found places' rule about secrets — no pin, no list, no
count — arriving inside a region rather than beside one. A rate, never a quota:
there is no last one and nothing anywhere may tell you how many you have seen.

The rules do not bend for any of this. Sited or rolled, near or far, common or
one in four, a region is colour, density and silhouette, and the biggest tree in
the world chops into the same eight wood as the smallest.

**A region is a mixture, not a demonstration.** Open country was built once as a
matched pair — a heath that was all bushes and a plain that was all grass, each
making its point cleanly — and neither was a place. Somewhere real has several
scales of plant in it at once: tussock, bush, tree, in descending order of how
much of it there is. A row with exactly one idea in it is a swatch, however well
that idea is executed.

**And a species does not belong to a region — a region PLANTS from a shared
catalogue.** Silhouettes live in one flora table; a region says which it grows
and how much. What silhouette proved (a recoloured meadow is not a pinewood) is
that the DOMINANT species carries the region's identity — not that a region may
hold only one. So the rule is a rate: one species, or two forms of one, is most
of what stands there, and guests are allowed in the minority. An apple tree at a
few percent of the meadow is a thing you come across; apples at forty percent
and the meadow is an orchard. The same sentence has governed the bushes all
along ("keep the unusual one in the minority"), and trees answer to it now too.

### Ground that is not turf

A region's ground may vary **within itself**, on a field of its own — bare rock
in sheets across the granite, tens of tiles wide. It is **paint and nothing
else**: no tile, no solidity, no yield, nothing to gather, and a house may be
built on it exactly as on grass.

The wavelength is the whole rule. Bare ground was tried twice as a per-cell roll
and thrown out both times, because one recoloured cell on open turf is a hard
square and a scatter of them tiles the ground into a checkerboard. A feature that
occupies exactly one cell of a continuous surface stops the surface reading as a
surface (CLAUDE.md §per-cell edges). Put it on a long, smooth field instead and
nothing about it can line up with the grid — the same answer the fen's ponds and
the ground roll already arrived at.

Ground paint may also be a **network rather than a field** — the cracked plates
of the salt flats, a web of hairlines several tiles to a plate. The rule it obeys
is the same one stated the other way round: a crack is a LINE, and a line drawn
inside every cell is the band rule's oldest trap, so the network is ruled across
the **world** on a lattice of its own and each cell draws only the part of it
that happens to cross. A plate is bigger than a tile, so no crack ever ends on a
cell edge and none of them line up. It is still paint: no tile, no solidity, no
yield, and a house sits on it as on grass.

### A region may be mostly water

Water may be **most of a region's ground**, provided none of it is deep. The
marshes are the case: a lattice of small pools, close enough together to run into
one another, with islands between them — water with country in it rather than
country with pools in it.

Nothing about the crossing promise bends for this, because that promise was never
about how much water there is. What makes water a wall is **depth** (§Water): past
the shelf it stops you, under it you wade. A region whose pools cannot reach the
shelf is crossable in every direction however wet it is — and that is a fact about
its geometry, checked as arithmetic rather than trusted.

What such a region costs you is **pace**, which is the shallows' existing rule and
not a new one: you cross a marsh at a marsh's speed. That is the only mechanical
thing any far region does, and it is allowed because it delays and never blocks.

**Things laid across the water are decoration, and must stay decoration.** Stepping
stones and boards read as a route; they are somebody's opinion about where to walk,
laid over water that was already crossable. Following them is exactly as valid as
ignoring them and wading, and nothing anywhere knows which you did. A stepping
stone that was the only way across would be a lock with a key made of scenery.

### A region may colour the water that crosses it

A region's ground tint reaches **turf and what grows on it, and nothing else** —
not water, not paving, not anything a player made. That rule was found on screen
(tinting everything pulled the sea halfway to dry sand) and it stands.

The one exception is **stated per region and is only ever colour**: a stream
crossing a salt pan is carrying the pan, and comes out milky. It reaches the two
water tiles, changes no depth, no shelf, no wading speed and nothing about what a
tile does, and it blends at the region's edge like the ground does, so there is
no line drawn across running water.

The affordance is what constrains it. **"You may wade here" lives in the colour
and nowhere else** (§Water) — no HUD ever says it — so both blues take the same
pull and the shallows stay the paler of the two. A tint that closed the gap
between them would take a rule off the screen, and nobody would notice until they
were standing in the wrong one.

### A place that is drawn wrong

The world may hold a region whose **rendering is the content** — drawn as though
the picture there were arriving damaged. The Static is the one, and it is the
furthest thing out.

**It takes three failures, not one.** Two inks alternating on a fine dither say
"this place is short of a bit", which is a statement about colour, and colour is
what every other region already says something about. What the eye reads as a
fault is the picture *separating* (a warm ghost a pixel one way, a cold one the
other, unevenly, so some trees are fine and the ones beside them are not), the
picture *tearing* (a slice of it sliding sideways and holding for a third of a
second), and a line of it *arriving wrong* (a run of flat colour where ground
should be). One of the three alone is a filter. All three is a signal.

This is a new kind of sentence for a biome and it needs its own fence, because a
player who thinks they have found a **bug** cannot enjoy a place, and would be
right to file it. What keeps it on the correct side of that line is not taste, it
is four decisions:

- **It is regional and it has a soft edge**, like every other region. A fault does
  not fade in over five tiles. A place does.
- **It is stable.** Walk out and back and the same trees are the same wrong
  colours, because it is a total function of (seed, x, y) exactly as the meadow
  is. A bug would be different on the way back.
- **It never touches the player, the villagers, the buildings, or one pixel of
  the interface.** You are a correct thing standing in a place that is being drawn
  badly. The moment the glitch reaches the frame around the world it stops being
  scenery and becomes a fault report.
- **Nothing about it is broken in a way that costs anything.** It gathers, grows,
  builds and paths exactly like the meadow, because it is the meadow's rules
  wearing bad paint. It gates nothing and yields nothing new, like every other
  far region.

And **somebody has a name for it**, which is the last proof that it is a place:
people do not name a rendering error, they name a valley.

### Nothing in the world can hurt you

It was never written down, because nothing had ever tested it: there is no
health, no stamina, no damage and no fail state anywhere in the sim, and no
content had wanted any. A volcano wants it, which is exactly why the rule goes in
the doc now rather than staying folklore in a test comment.

**Molten rock is solid, and that is all it is.** Lava blocks you the way deep
water blocks you — an obstacle with a good view, a thing you walk around. It does
not burn, does not chase, does not warn, and nothing anywhere counts what it did
to you. The most dramatic object in the world is a wall you can see through, and
that is the correct joke for this town.

The same test applies to anything added later: if a thing on the map would make a
player careful, it is out. Careful is a different game.

### Terrain that is a light source

The world may hold **ground that gives light**, not only things floating over it.
Until the cinders, every light in the game was small and in the air — a firefly, a
spark, an orb, a lamp on a post — and the ground was only ever lit.

It obeys the lamp's rule exactly, one scale up: **a source must be the brightest
thing in its own light**. The seams in a lava field are hotter than the halo they
throw, or the glow reads as paint on a rock. And it works only through the night
wash, like a lamp: a suggestion at noon, and after dark the only light for a
hundred tiles in any direction — which is the whole reason to walk out there at
an hour you would otherwise be indoors.

It is still **stateless**. Nothing stores heat, nothing cools, nothing spreads.
The seams breathe on the clock the way the water ripples on it.

### Living light, and the animals that stay out

The world may hold **light and motion that reads as alive** — a firefly's flash
over the twilight country, a glitter in the air where the ground glows. It may
not hold **animals you can do anything to.**

This is written down because it was never written down. "There are no animals in
this game" was true, and it lived in a test comment and nowhere else, so it was
folklore rather than a rule and it was quietly wider than anything anybody had
decided. What was actually settled is narrower: fauna may not be a REWARD (a
filing that stocks a sanctuary turns a form into an unlock, which paperwork must
not be), and content may not mention wildlife that isn't there.

The line is **interaction, not biology.** A firefly is a flash: nothing may
catch it, gather it, name it, collect it, count it, or wait for it. The moment
one can be caught the game has a bug-catching verb, and behind that a bug wing in
the museum and a completion grid — which is Animal Crossing's skeleton picking up
an organ this game deliberately left on the table.

- **No creature has a sprite, a schedule, or a footprint.** If it can be stood
  next to, it is a resident, and residents live in town.
- **Nothing gathers, and nothing is ever required.** Same sentence as the found
  places: no commission, room, filing or exhibit may read it.
- **Still stateless** (§Seasons): a flash is a function of place and clock. The
  moment something has to be *remembered* it is weather with a lifecycle.
- **The fish stay out**, specifically and permanently. A pond with a dozen poles
  and nothing in it is one of the town's better jokes, and the joke is the
  absence — see `content/found.ts`. Fishing remains an open question elsewhere in
  this doc; that pond is not the place it gets answered.

Biomes are a **total function of (seed, x, y)** and are stored nowhere. The
town's own region is always the ordinary meadow, whose every number that decides
where something SOLID stands is an identity, so ground people have already built
on generates exactly what it always did. That is a region and not a radius on
purpose: a circle of ordinary grass stamped round the plaza would draw a hard rim
across open country.

**The town mows its own common, and the meadow does not pay for it.** The region's
emptiness was once total — no ground plants, no flowers, nothing to find — on the
grounds that leaving town should be when the ground starts having things in it.
That rule is right and it was written in the wrong place: the meadow is the
commonest region in the world at every distance, so the town's calm was being
charged to every field in the world, and the one region named for flowers had
never had one. It is now a property of the TOWN — ground furniture fades in over
about a screen's walk out (`sim/world.ts` §townMown) — which is what the rule
always meant. Out in the country a meadow has clover, buttercups in spring, and
the occasional field mushroom, like anywhere else.

### The world gets stranger the farther out you go

Biome character is partly a function of **distance from the plaza datum**. Near
town reads ordinary; far out reads dreamlike — palette, flora silhouette and
ground cover drift from the familiar toward the strange as the radius grows:
twilight bands, bioluminescent understory, glass-coloured light.

This is the rule above with one more argument, and every clause of it survives.
Distance is a **weight, not a gate**: a far region is more *likely* to be an odd
one and never locked to one, so there is no wall you cross and no boundary you
can stand on. It is still colour, density and flora; still a total function of
seed and coordinate; still stored nowhere; still gates nothing. **A far biome
never holds a material the near ones don't, never changes a growth time, and
never hides a finish behind distance.** Same invariant as water: distance changes
the view, never what you may have.

**"Stranger" is never taller.** There is no height axis (§Structures) and
strangeness lives entirely inside the flat, one-storey world — no floating land,
no impossible geometry, no stacked terrain. The world's odd colours are a
repaint, on exactly the terms a season is.

**New country has to be far country, and that is a save fact rather than a
design one.** The near weights reproduce the world as it generated before biomes
drifted at all, and a region inserted among them re-landscapes ground people have
built on. So every region added from now on is far-only — including the plainly
ordinary ones, a granite country, a plain of long grass. Neither is strange; they
are simply where there is room.

Which means **a new far row is scaled in, never appended flat.** Ordinary rows
dropped on the end would have taken the strange three from 63% of the plateau
toward a third without anybody deciding to, and the far country would have got
blander every time it got bigger. The two numbers to hold when adding one: the
strange rows keep about half the roll, and the five familiar ones keep about a
quarter, at any distance.

The escalation **reaches a plateau and holds it**. On an infinite map, "keeps
getting stranger forever" is a promise that ends in noise: the far country has a
character rather than an ever-climbing scale. And the ordinary never falls to
zero — meadow remains possible at any distance, because a world where the
familiar becomes impossible has a boundary in it after all.

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

**Unless it asks.** The homestead spots amend that: choosing *the coast* sites a
sea whose shore is about thirty-four tiles out, and choosing *the lakeside* moves
the promised lake in to about thirty. The rule above is still doing its job —
what it defends against is a world where *every* town is coastal, and being
coastal then meaning nothing. Two of the four spots are still promised no sea at
all and go on rolling the scatter's dice; the sea turns up near about a third of
those towns, which is what makes it worth mentioning when it does. An answer to a
question you had to choose to ask is not a guarantee handed to everybody.

Both are sited as bodies **in addition** to the scatter, at a searched or hashed
bearing, so a coast can be on any side. Neither relaxes the dry ground under the
town: the ring each sits on is derived from that clearance, not chosen for taste.

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

## Found places

A **found place** is a small authored oddity sited by the seed. It exists at a
real coordinate, differs per world, and is reached by walking into it — never by
being pointed at. It appears on no map, is announced by no toast, and is spoiled
by no UI (§Tone). The dark grove and the humming cube were the first two, and
they are members of this category rather than one-offs.

It holds a mood, or nothing. **Never a payout.** A finish is the most one may
ever give, because a finish is weightless and gates nothing (§Materials); most
give less than that. Nothing in the game may ever require having found one, and
nothing a found place contains may be the thing another place then needs.

**Finding it is the mechanic**, so there is no marker, no minimap pin, and no
"undiscovered" slot in any list. A screen that can tell you how many you have
left to find has converted a world into a checklist and told you the answer.

### Why these get to be rare when water does not

§Water forbids anything singular on an unbounded map: one ocean on an endless
plain is a diorama. Found places are the deliberate exception, and the
distinction is the whole reason they work.

**Ambient natural features must scatter or the world feels empty. Authored
secrets are allowed to be rare, because rarity is what makes them secret.**

The safety valve is **many kinds at a low density each** — collectively
scattered, individually a surprise. One kind at density one is a diorama; a
dozen kinds at a twelfth each is a world with things in it. And they **recur
outward forever** rather than being one-per-town: on an unbounded map, a
category that runs out after the first lap has quietly told you the world ends
where its contents do.

### The wild holds moods, not people

People stay in town. What the far world holds is places, weather, and the
**evidence** of people — a letter with no author present, a dozen poles and
nobody fishing, a bakery still warm. This is not a shortage of ideas: the Ghost
and the Mole are worth walking to precisely because almost nothing else out
there is somebody, and a wild full of hermits would make both of them ordinary.

### The letter, and anything else that varies

Content inside a found place may vary, but only as a **total function of
(which place, which day)** — the festival trick. Nothing is stored, and reading
it is not required. A letter is never a request and never names a task: a notice
speaks only in the past tense (§The errands board).

## The sky

A third layer, on the same axis as the underground and reached the same
way: through a threshold you find. Digging takes you down; **one rare
staircase takes you up**, and it is a found place before it is a door
(§Found places) — sited by the seed, on no map, indistinguishable from
the ordinary steps that lead nowhere until you have climbed one.

**You do not build the way up.** There is no tower, no ladder, no
beanstalk you cultivate, for the same reason there is no height on the
surface: a route the player constructs is a route the player can put
anywhere, and then the sky is a floor rather than a place.

**It is one open plane of cloud, unbounded**, exactly as the ground is
unbounded. Every sky-stair's top is also a way down, so you may go up
near town, walk the white a long way, and come down somewhere you have
never been — which is the one thing the sky can do that the ground
cannot. It has weather in the sense that it has a sky: the hour and the
season reach it, because it is outdoors.

**It has no biomes.** The world getting stranger with radius (§Biomes) is
a fact about the ground. Up here the answer to "what is over there" is
the same in every direction, forever, and that plainness is the point:
the sky is quiet, not busy.

**You visit; you do not reshape.** No digging, no filling, no building,
no planting, no gathering — there is no tool up there at all. This is the
symmetric negation to the underground's ("not somewhere you build a
room"), and it is stronger, because the underground at least gives you
rock to cut. The sky gives you nowhere to put anything and nothing to
put there. Nothing on this layer is stored, because nothing on it can be
changed.

**The reward for the hard-to-reach place is a place, not loot** — §The
Mole exactly. What the sky has that the ground doesn't is not a material,
a yield, or a faster crop; it is that it is up there and somebody is
home. **Nothing in the main game may ever require it.** You may finish a
whole game without ever finding the stair, precisely as with the grove.

**One person lives there, and she is not a new one.** §Found places says
the wild holds moods and not people, and that rule holds — it is about
the ground, where a hermit behind every hill would make the Ghost and the
Mole ordinary. The sky is not the wild; it is one place, and the person
in it is the Stray Cosmos, who has been visiting for five nights a year
since before there was anywhere for her to come from. **She is in exactly
one place at a time**: on a shower night she is down on your homestead as
she always was, and her home up here is empty. That is what stops a
visitor becoming a resident with an address — you can now find out where
she goes, without being able to find her whenever you like.

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
season to decide a price, a yield, or a growth time. The season reaches nothing
but **appearance and one line of dialogue** — a flourish on a ripe crop, fireflies
over a meadow on a summer night — and **not one of them is a number**. That last
clause is the rule; the list is only as long as the things it has been applied to.

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

**Appearance is a separate axis, free within a material.** Any built tile
can wear any unlocked finish its material allows: pale pine, dark walnut,
whitewash, granite, slate. A finish is a property of the tile, never a
different item. This is the rule that keeps the inventory small — item
count is the number of *materials* (three), not materials × looks
(dozens). Some finishes are there from the start; others are earned
through friendship, discovery, and the underground, and once earned are
permanent and weightless.

**A finish names its material, and the material is what costs.** Pine,
walnut, whitewash, ash and salvage are wood; granite, slate and cobble are
stone. A floor or a wall may be either — the same tool lays a boardwalk
and a flagstone path — and the price follows the stuff rather than the
look. Within a material nothing is charged at all: pine to walnut to
whitewash is free, forever, on things already built. Across one it is not
a repaint but a rebuild, and it costs what building it that way would have
cost in the first place.

That line is what keeps "the look is free" true while letting a stone
floor actually be stone. Price every finish the same wood and granite is
made of boards, which the player can see through. Give every finish its
own price and your town ends up looking like your inventory instead of
your taste, which is the free axis being quietly repealed. The material
carries the cost; the look never does.

**The player is never asked which class they mean.** Wood, stone and cloth
are how the content table knows what a finish belongs to — they are not a
question the game puts to anybody. You hold a tool and you are shown the
finishes that tool can wear. A picker that made you choose a category
before choosing a look would be the item-sprawl this section forbids,
wearing a menu instead of an inventory.

There is **no crafting table and no recipe tree** — placing a thing *is*
making it. Pick an object, see its cost, put it down. This is Animal
Crossing's placement, not Minecraft's grid; "crafting-tree sprawl" is on
the explicit not-taken list.

Materials are required but never rationed:

- Terraforming is always free. Digging and shaping land costs nothing,
  ever — the shovel is never blocked. That includes **water**: filling a
  stream, a pond or the sea itself costs no material and needs no tool you
  don't already hold (§Water).
- One tree yields many boards, one rock many flagstones. Cost is a
  rhythm, not an economy. The two surface materials are deliberately *not*
  tuned to parity — wood is the everyday stuff and stone the deliberate
  choice, because a flagstone floor should feel like more of an
  undertaking than boards. Equal-cost materials would make choosing
  between them weightless, which is a different way of having no choice.
- Felled trees and rocks regrow on the real clock — *unless you've claimed
  that ground*. Clear a tree and leave bare dirt and it returns; clear it
  and pave, till, or build there and it's yours for good. The world heals
  where you aren't invested and stays exactly as you shaped it where you
  are. **Filled water is the one exception** and §Water argues it.
- **And it heals from what is still there, so a CLEARING is a claim too.**
  A felled tree comes back only if a tree is still standing within a couple
  of tiles; a rock only if there is stone left nearby. A wood closes over a
  gap, which is what a wood does; it does not march back across ground you
  emptied. This was missing at first and the omission had a shape: *claimed*
  meant BUILT ON, so a player who felled a wood to make a lawn and left it
  as a lawn got every tree back in the same tiles, for ever. Clearing is
  also shaping. The world still tidies up after you either way — ground that
  forfeits its node grasses over like any other bare earth, so the axe never
  leaves permanent brown squares.
- **Nothing out there hurries.** A shrub is half a day, a tree a day, deadwood
  two, a rock three. The pace is deliberate: at eight hours a tree closed
  the edge of a clearing while you were still standing in it deciding what
  to build, which is the world undoing your afternoon in front of you. You
  should come back to a changed wood, never watch one change.
- **Ore veins do not come back, and that is the same rule and not an
  exception to it.** Underground there is no unclaimed ground: every open
  cell down there is one you cut, so a vein regrowing would re-block a
  corridor you already dug — the precise outcome the claim rule exists to
  prevent. What replaces regrowth below is *distance*. The rock is
  unbounded, so ore is never scarce, only further off; you are slowed by a
  walk, which is the one thing this list permits.
- **Cutting rock returns a little stone — a trickle, never a supply.** You
  are tunnelling through the stuff, so coming up empty-handed would be
  strange; but the rock is unbounded, and an unbounded face paying out
  properly would make stone the free material and *wood* the scarce one.
  That is precisely how Minecraft shakes out, and it ends with everything
  built of cobble. So a dug cell gives one, which is far too slow to be
  why you went down and more than enough that you never surface with
  nothing. Stone is a byproduct of the tunnel, never a reason for it: the
  reasons are ore, junk, slate and the dark.

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

**The sky is the same move upward** — a discrete layer, entered through a
found threshold, never a tile that floats above another tile. The surface
map stays one storey whether or not there is a sky above it: if you can
see something hovering over a ground tile, that is a height and it is
wrong. Height is still forbidden; layers are still allowed. See §The sky.

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

**Build mode flattens the view — and the flatten belongs to the TOOL, not
the mode.** Holding a structure tool drops raised faces to translucent
outlines, hides roofs, and shows the ground grid — plan view while you lay
walls, because walls occlude and alignment is the whole job. A garden tool
(§The garden) places in the full living view: you judge a tree against the
world as it actually looks, light and season included, because composing a
view inside a muted view is impossible. One mode, two presentations, keyed
to what is in your hand. Tap places, drag paints a run.

**The principle that sorts every verb, and it is one sentence:** a verb
whose target is YOUR OWN BODY'S POSITION belongs to **ACT** — dig, gather,
water, harvest; standing there is the point, and dig can never be remote
because digging is the verb that moves *you* down. A verb whose target is
THE MAP belongs to **SHAPE** — placing anything, anywhere you can see.
There are exactly two modes and this sentence is why no third is coming:
a mode earns its button by changing the grammar of touch, and everything
placeable already shares the mode's grammar.

**The mode is called SHAPE, and "build" is its structure wing's name.** It
was BUILD until the garden moved in; a mode that plants hydrangeas and
uproots them again is shaping your surroundings, and "reshape" was already
this document's own verb for the activity class (§The sky refuses it by
name). Walls and floors keep the word "build" where it is true — as the
wing you land in.

### A place keeps a history, the same way a resident does

Residents keep a memory log (§NPCs that remember). So does the ground they
stand on. A room knows who has slept in it and what has happened inside its
walls, and it says so when asked, or when somebody who lives there brings it
up: "the Menace has slept here since spring", "this is the room where you
first met Eloise", "you laid these boards yourself".

- **It is anchored to coordinates, not to a building.** A building has no
  identity in this game and should not acquire one — rooms are derived from
  the walls that happen to be standing, so a room's identity dies the moment
  you extend it northward. Events are remembered at the spot they happened,
  and a room simply *contains* the ones inside it. Knock a wall out and push
  the house into the next field and it keeps everything it had and inherits
  what the field remembers. Renovation cannot erase a history that was never
  filed under the walls.
- **A place remembers a kind of work happening near it, not each swing.** A
  floor is two hundred boards and one afternoon. Recording two hundred
  entries would be both a lie about what happened and a flood that pushes
  everything older out of the log, so a second event of the same kind near an
  existing one is not recorded. What survives is the sentence that was true
  all along — you laid these boards — and never a measure of how many.
- **It is a memory, never a meter.** No count, no rank, no "sheltered twelve
  families". The scale here is honest to the town's real churn, which is a
  handful of names: arrivals run out at four, on purpose.
- **There is no completion.** No building is finished being historied, no
  screen shows which ones have history and which don't, and nothing anywhere
  gates on it — the same rule as the museum's record (§The museum) and for
  the same reason.
- **The log is capped**, like a villager's. A place that has been lived in for
  a year is not carrying a year of receipts.

## The garden

You may landscape your own land the way the Sims lets you: trees, bushes,
flowers, grass, put where you want them, because building a beautiful place
is a first-class activity here and plants are most of what beautiful means.

**Everything green is BUILT, from one grammar.** Build mode gains a GARDEN
group beside Furniture — crops, trees, bushes, flowers, grass — and there is
no separate farm menu, no landscape mode. The test is that a player can
predict where a thing lives: "anything you put on your land is in build"
holds; "trees are in build unless they fruit" does not. Fruiting is a
**property of a plant, never a category** — an apple tree fruits in autumn
because that is what apple trees do, and you learn it by watching.

**You plant what you have met.** Seeing a species growing in the world is
what puts it in your palette, forever. Not bought, not dug up, not traded:
met. The country is the catalogue, and the walk is the price — which means
the far country's strangest trees are obtainable by exactly the people who
have stood under them. It can never gate anything, because nothing requires
a plant: a player who never leaves the plaza loses ornaments and not one
thing they can do.

**The palette never says what is missing.** No greyed-out slots, no counts,
no checklist — the same rule secrets and found places already obey. The
palette is simply bigger than it was yesterday, and you find out the world
has a willow in it by standing next to a willow. A species entry may
remember where you met it; it may never enumerate what you haven't.

**Planted things grow in.** Everything goes into the ground small and fills
out over days — flowers and bushes in about a day, trees over about three.
Real time finishing your garden is Pillar 6 applied to your own land, and a
garden that assembles instantly is furniture wearing leaves. Days, never
seasons: seasons are a real year of a real life, and the payoff being
bought is "this comes back", not "you waited".

**Crops are the tended plants, and tending stays on foot.** A crop entry
consumes a seed and targets tilled soil; sowing at layout scale is a drag
in the mode, and sowing at garden scale never needs the menu at all — ACT
sows when you stand on tilled ground with seed in your pocket, exactly as
the ripe-crop override already harvests. Watering and harvesting are ACT
forever: the morning walk along your rows is where the farm lives, and
drag-watering a plan view would turn it into administration. Landscape
plants are the untended ones — no seed, no water, no yield. That is the
whole difference, and it is a property, not a menu.

**Fruit is pickable exactly when you planted the tree.** Wild fruit is
paint — a region gates nothing and the country stays a place you look at,
not a resource sheet. Your own apple tree answers ACT with apples, because
planting is what makes fruit yours. No recipe, commission or acceptance
test may ever require a fruit: it goes to gifts, tastes, festivals and the
museum, the sinks that already exist and that nothing depends on. And
somewhere near every town there is an orchard — the place you first meet
apples, in flower or in fruit, its own fruit forever paint.

**Uprooting is erase, with the refund rule intact.** Removing a planted
thing is the mode's erase, never the shovel: a crop erased refunds its
seed and costs the growth, which is "it costs you the arrangement"
transposed into time. The shovel keeps its own meanings, all of them
underfoot.

**Animals, if they ever come, appear in no menu.** Menus hold things with
positions; creatures have wills, and an animal from a palette is furniture
with a walk cycle. What you would build is the place for one — the fence,
the coop, the pond — and the animal is met in the world, like everything
else here worth having.

## The catalog

Furnishing is the other half of home building, and the catalog is designed
against one specific failure, because every inspiration commits it
somewhere: you reach for a piece and it does not exist. A whole style
missing (the Sims has no mid-century); a form that only exists with a
style baked into it (Stardew's big table comes decorated for a holiday or
not at all); a set that cannot finish a room (Animal Crossing's kitchens
run out of matching cabinets). Three frustrations, one shape: a hole at
the intersection of *form × set × colour*. So the catalog is not a list,
it is a **lattice, and the lattice has no holes.**

**Forms are what a room needs, and the audit is BY ROOM.** Listing
furniture gets you a pile; listing rooms gets you the holes. Bedroom: bed,
cot, nightstand, wardrobe, dresser, chest. Living room: chair, stool,
bench, sofa, cushion, table, low table, rug, standing light,
wall piece, hearth. Study: desk, shelf, table light. Kitchen: counter run,
stove, fridge, sink. Bathroom: toilet, sink, bath. That is the checklist a
furnisher reaches for, and the two rooms at the end of it were entirely
empty until somebody counted — which is this section's own complaint,
found in its own list.

A form owns everything the sim cares about: footprint, solidity, facing,
what it costs, whether it burns. Adding a form is deliberately expensive —
every set that exists owes it a silhouette the day it lands — which is the
discipline that keeps the checklist honest: a form earns its slot by
someone reaching for it and finding nothing, never by seeming like a nice
idea.

**EVERY PIECE IS SIZED AGAINST ITS NEIGHBOURS, not against its cell.** A
sofa is two or three times an armchair; a dining table is two or three
times a dining chair; a chair is smaller than a bed; a counter, a stove
and a fridge are the same width as each other. Footprints carry the big
relationships, and inside a footprint the drawn width is a LADDER of five
rungs — tiny, small, medium, large, and the whole cell — so a stool is
small *because* a chair is medium rather than because somebody eyeballed
it. Only two kinds of thing earn the whole cell: something that joins
(its run has to be continuous) and something that genuinely is a wall of
an object, like a wardrobe.

The failure this exists to prevent is drawing each piece to fill its
cell, which is what happens when pieces are drawn one at a time and
nobody looks at two together. It reads as a catalogue where a nightstand,
a stove, a toilet and a fridge are all the same object. /furniture.html's
scale strip is the instrument: identical boxes, one grid, ordered by
drawn width.

**A form may be LAID BY THE YARD instead of being a size.** The counter and
the table are one tile-pair each and join with their neighbours, so their
length is the player's rather than a number somebody guessed. That is why
there is no "long table" on the list above: it is this table, laid end to
end. A fixed length fits exactly one room, and the same argument applies
to counters, benches and anything else a room wants a RUN of — so reach
for joining before reaching for a second form in a bigger size.

**The kitchen and the bathroom are DECORATION.** No cooking, no plumbing,
no needs — there are no meters in this game to hang them on, and a stove
that demanded feeding would be the chore this whole design refuses. If
cooking ever arrives it attaches to the range already standing in every
kitchen; nothing about these forms forecloses it, and nothing about them
promises it either.

**Sets are complete reskins of the checklist, and a set ships whole or
not at all.** The style axis is the silhouette: a set's chair is a
different drawing — different back, different legs — never the core chair
recoloured. Every set covers every form; that rule, enforced and not
promised (a test walks the lattice, a hole fails the build), is the whole
answer to the unfinishable kitchen. Style is never baked into a form: a
themed or seasonal piece is a *set*, so the plain table always exists in
every other set, undecorated, forever. Sets may carry a signature extra
or two beyond the checklist — that is where a set's personality lives —
but extras are never how a set meets its obligations. The furniture that
exists today is not separate from this scheme: it is **Set One**, the
starter set, and it defines the checklist by having a piece in every
slot.

**Colours ride free, because the grids never contained them.** A piece's
art asks the finish (§Materials) rather than naming colours, so every
set arrives in every finish of its material class the day it is drawn —
the wooden pieces in all the woods, the soft ones in all the cloths. And
because footprints belong to forms, two sets' chairs occupy a cell
identically, which buys the catalog's quietest good idea: **restyle in
place.** A furnished room can change sets without moving one thing — the
finish swatch's delight, one level up. Collecting a set is never
"rebuild your house"; it is "look at it again."

**Sets unlock the way finishes unlock, through the same three doors.**
Set One is had from the outset, like the starter finishes — furnishing
must look good on hour one. Beyond it: a set may be **seen** (met in the
world, the garden's seeing-rule — a place's own furniture joins your
catalog because you stood in the place and saw it); **given** (a friend
warm enough tells you their source — taste lives in people here, and a
villager's home can be where a style is met); or **taught** (a skill
handed over, which is how the heap's keeper contributes without his
counter ever selling furniture — the knowledge is the gift, the pieces
still cost wood, and §Materials' junk rule does not move). A set is
knowledge, weightless and free to apply, which is why it may sit behind
friendship and discovery: it is the one reward class that can never
gate. And the catalog never says what is missing — no greyed slots, no
counts, the same rule the garden palette and every secret already obey.
It is simply bigger than it was yesterday.

**Taste stays delight.** No commission, acceptance test, or villager
requirement may ever name a set, a form beyond a bed, or a finish.
Furnishing to someone's taste is noticed, remembered, and rewarded —
never demanded. The lattice exists so the player can finish the room in
their head; the moment it becomes a checklist with a grade on it, the
whole apparatus has failed at its one job.

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

### Moments

A Moment is the festival rule generalized. Some configurations of the world are
worth remembering — the evening the trees finally went bare, a shower over the
plaza with half the town standing in it, the day you took somebody past where
the survey stops. When one happens it is remembered. When it doesn't, nothing is
lost, and nothing anywhere counts them.

- **It is remembered, never awarded.** No Moments screen, no list, no gallery, no
  total, and no notification. A page of Moments with gaps in it is an
  achievements page, which is XP with a scrapbook cover, and "✨ Moment unlocked"
  is the same idea with a sound effect. It surfaces later and obliquely, or it
  does not surface at all.
- **It is not a new thing the game stores.** A Moment is written into the two
  records that already exist — a resident's memory log (§NPCs that remember) and
  the Notebook (§The Notebook) — and comes back out through the channels those
  already use. Nothing new for the player to open.
- **Two records, and which ones you get depends on who was there.** The journal
  entry is yours: you saw the sky do that, and you wrote it down. The memory is
  somebody else's: they were standing next to you, and now they are a person who
  was there. **Both may fire for the same event**, and the journal half never
  waits on company — a night alone is still a night you saw. Making solitude the
  only route to a journal entry would teach players to walk away from people
  before anything nice happened, which inverts the whole section.
- **Most Moments need no new journal entry**, because the Notebook already
  records the meteor shower and the far country as field notes. What the Moment
  adds is the second record — the one that exists only because you were not
  alone. That is the feature: not that the sky was busy, but that you and Eloise
  both remember it being busy.
- **A Moment may be keyed to a PLACE, and only a place like the Static.** The
  walk to the edge of the survey is keyed to a distance, deliberately — a number
  in a line is a number to beat. A region is different: naming one is the
  wayfinding system doing its job (§Biomes — people name places), and a region
  sited six hundred tiles out on a ring cannot be stumbled into, farmed, or
  hurried. What is remembered is not that you went far; it is that you took
  somebody somewhere strange.
- **Triggers are unstated and unoptimizable.** A surfaced, farmable condition
  ("watch a sunrise with six villagers") becomes an objective the moment players
  work it out. Nothing announces what qualifies, no UI hints at one, and the set
  stays small and authored. Tying a Moment to *another person being present* is
  most of what keeps it unfarmable — you cannot schedule the town.
- **A first is a fact about the log, never a counter.** "Has this ever happened"
  is already answerable from the memory log and the journal, so no Moment
  introduces a high-water mark, a streak, or a tally — the same refusal
  §Materials makes about depth and junk.
- **No Moment may ever gate anything.** Same sentence as the museum's record and
  the festival's attendance: nothing reads it to decide anything.

## The Notebook

A naturalist's journal that accretes oblique observations as you go: "owls have
only been seen near very old forests", never "combine X + Y". It is the museum
record applied to discovery — no total, no denominator, no empty slots. You
learn what else it might hold by going and finding it, never by reading a blank.

**It gives you a way to remember what you have seen, and never a way to see what
you have missed.**

- **Two kinds of entry, told apart by how they were recorded.** Some you noticed
  yourself, and they read as field notes in your own hand: *a suspiciously round
  cluster of trees; farther out than anyone has bothered to go*. Some you were
  told, and they carry the name of whoever told you: *Malcolm mentioned a
  staircase that goes nowhere*. The distinction is the whole texture of the
  thing — a real journal is half what you saw and half what somebody said to you
  in passing, and the two do not sound alike.
- **The wild and the town, never a person.** Biomes, water, weather, what grows
  where, the deep rock, the sky — and the town as a place, its plaza and its
  institutions and how it behaves. Not observations ABOUT residents: they are
  already remembered in the memory log and in what rooms keep (§"A place keeps a
  history"), and a page per resident is a collection screen with faces on it.
- **No blanks, no locked entries, no count.** A greyed slot that implies more is
  the exact UI spoiler §Tone bans for secrets, wearing a journal cover. The panel
  shows what has fired and stops there.
- **It reads its own past and never sets a future.** No entry may name a thing to
  do. An observation is in the past tense about something that is true; the
  moment one reads as an instruction it has become a quest log.
- **It must not imply completeness.** The record shows what you have seen — the
  same sentence Corrigal's gallery carries, and nothing anywhere may gate on it.
- **Being told is a conversation, not a delivery.** A told entry arrives because
  somebody actually said it to you, in their own voice, once. It is not a
  notification with a name attached.

## Tone and dialogue

Inherit The Meadow's house rules wholesale (see vendored content):
per-form voice layers, brevity, distinct openers, ellipsis style
(`... Capital`), and `"..."` as a complete valid line. Every form's voice
is already established across 11 characters — new dialogue must pass as
written by the same hand.

Discovery is the signature: secrets are never listed, hinted at only
obliquely, and never spoiled by UI (no "???" slots for the hidden).

## Sound and music

Everything you hear is **generated** — oscillators and filtered noise, no
audio files. That is a constraint with a payoff: the PWA works offline by
construction and there is nothing to download.

**Cues are events; the score is a place.** A cue is a noise because you did
something — a shovel, a board, a door. Two things in the game make noise
whether or not you act: the Humming Cube, and the soundtrack.

**The soundtrack is one engine and a table of pieces.** A piece is a root, a
mode, four scale degrees and a feel; every chord is derived, so a plain
triad is unreachable and nothing can be out of key. Six pieces by day, three
after dark — the night ones are sparser and slower, not the day ones with
the lights off.

**Where you are changes the arrangement, never the song.** Walking out of
town does not fade to different music, it takes the drums off the music
already playing: full band on the plaza and at your own claim, held chords
out in the fields, nothing but a drone underground. Cross-fading two pieces
is what a radio losing signal sounds like.

**There is far more silence than music.** Three minutes of a piece, then
five of quiet — eight at night. A soundtrack that is always on is one you
mute in week two. The silence also earns its keep: the next piece is chosen
inside it, so key and tempo can change with no seam to hear.

**Nothing starts and nothing stops.** Parts arrive in order over about
twenty seconds — pads, then keys, then bass, then drums — and leave in
reverse. A master-volume fade sounds like somebody turning a knob. You
should never be able to point at the moment the music began.

**Muting hides nothing.** As with the hum, no sound is the only way to learn
anything, and music has its own switch separate from the rest.

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
- An in-game mail-order catalog — the browsable surface for §The catalog,
  arriving by post with deadpan institutional copy. Cute enough to hold on
  to, big enough (mail as a system) not to block on.
- Multiplayer: likely never real-time; maybe async postcards between towns.
- ~~Decorating interiors vs. exteriors-only~~ — settled: both, continuously.
  Interiors are the same world with the roof faded off (see Structures).
