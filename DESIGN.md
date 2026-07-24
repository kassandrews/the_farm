# Cozy Hollow — Design Document

*(working title — rename freely; directory + repo can follow)*

A town-life / homestead / building game set in the Cozy Sprites world.
Animal Crossing's skeleton, Stardew Valley's verbs, exactly one organ from
Minecraft. This document is the source of truth for scope and tone; when a
feature idea conflicts with it, the doc wins or the doc gets edited first.

## Premise

Cozy Sprites pets retire. This is where they go.

The Hollow is a small town of retired sprites, run (loosely) by a fixed cast
of canon characters. The player is a sprite too — newly arrived, granted a
homestead plot on the edge of town, free to do approximately whatever they
want at whatever pace they want.

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

## Player identity

At the start you either:

- **Hatch a fresh sprite** — pick any standard form, purely cosmetic, or
- **Embody an imported pet** — one of your retired Cozy Sprites adults
  becomes the playable character. Its name, form, and history come along.

Any remaining imports become villagers. Form affects dialogue flavor and
small affinity perks (see below), never capabilities or obligations.

## Importing from Cozy Sprites

The new game reads Cozy Sprites' export JSON (see cozy_sprites
`src/pet/persistence.ts`). Treat it as a read-only foreign format with its
own adapter — never share code, never write back.

Imported adults become **residents**: a house, a daily schedule, hobbies,
and dialogue in their form's voice. No jobs, no duties. Their Cozy Sprites
history (name, favorite food, how they were raised, memories) seeds their
dialogue and relationship with the player — nobody else's town has *your*
specific Dramatic Blob.

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

## Affinity perks (instead of jobs)

Forms grant small, flavorful, passive bonuses — never duties:

- A Carrot villager occasionally blesses a crop overnight.
- A Scholar resident identifies museum donations faster (occasionally wrong).
- A Dog Thing sometimes retrieves things you dropped.

Design rule: a perk should read as *personality leaking out*, not a stat.

## Town and homestead

The town pre-exists: plaza, institutions, fixed cast, a few starting
residents. The player's **homestead** is a plot on the edge of town, chosen
at the start from 3–4 map spots (riverside, forest edge, hilltop, …) —
meaningful choice without blank-page paralysis.

You start with a tent. The house is **built from gathered materials**, tile
by tile, expanded and reshaped freely — this is the Minecraft leg. Farmland
is part of the homestead: land you own, not a job you have. Farming is
fully optional; builder, forager, and museum-filler are complete ways to
play.

Opening beat: the Office Creature stamps your land claim. That's the whole
cutscene.

## Time and the away simulation

- **Real clock, real calendar.** Day/night follows the actual clock; seasons
  and festivals follow the actual calendar (as Cozy Sprites already does).
  No in-game day loop, no energy meter, no forced sleep.
- **Crops grow in real time.** Check back tomorrow. This powers the
  5-minute phone check-in loop.
- **Offline simulation.** While you're away, villagers keep living: the
  Scholar mounts a new wrong exhibit, mushrooms spread, the Gremlin
  relocates a fence. Returning shows a short "while you were out" summary
  in the Cozy Sprites postcard tradition.

## Tone and dialogue

Inherit the Cozy Sprites house rules wholesale (see vendored content):
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
7. Versioned save/load, including a Cozy Sprites import adapter for one
   pet.

Everything else is horizontal expansion after this skeleton walks.

## Open questions (decide later, don't block)

- Real name for the game and town.
- Fishing? (Probably yes eventually; it's the coziest verb not yet listed.)
- Multiplayer: likely never real-time; maybe async postcards between towns.
- Decorating interiors vs. exteriors-only at first.
- Whether raising a new egg exists here at all, or stays Cozy Sprites-only
  (leaning: stays in Cozy Sprites — the games should need each other).
