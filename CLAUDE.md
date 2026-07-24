# CLAUDE.md

The Hollow (working title) is a town-life / homestead / building game set
in the world of The Meadow — the village where retired sprites live. Read
`DESIGN.md` before building anything; it is the source of truth for scope,
tone, and the vertical slice. When code and DESIGN.md disagree, stop and
reconcile the doc first.

Sibling project: The Meadow (formerly Cozy Sprites), repo at
`~/projects/cozy_sprites` — finished and canon. Mine it for content,
voice, and rendering lessons. Never modify it.

TypeScript + Vite, no framework, canvas 2D. Tests are Vitest, colocated as
`*.test.ts`. `npm run dev` / `npm test` / `npm run build`.

## Architecture

Three layers; imports point strictly inward:

- `src/sim/` — deterministic game logic. Fixed-timestep tick, no DOM or
  canvas imports, fully unit-testable. World state, villagers, crops,
  time/away simulation.
- `src/render/` — draws sim state to canvas. Chunked tilemap renderer,
  camera, sprites.
- `src/ui/` — input (touch-first: tap-to-move + context action; keyboard as
  desktop enhancement), menus, audio, PWA shell.

The world is a **chunked tilemap** (surface + underground layers). Chunks
load/generate lazily; nothing may assume a fixed world size.

## Content is data

Game content lives in typed record tables under `src/content/` — crops,
items, recipes, villager defs, dialogue. Follow the house style of
cozy_sprites `src/pet/roster.ts`: literal `Record<Id, Def>` tables with
comments explaining design intent. New content should be table rows, not
code paths.

`src/content/canon/` holds content **vendored (copied) from cozy_sprites**
— roster, dialogue voice banks, palettes, sprite data. Copied, never
imported across repos; cozy_sprites stays untouched.

## Saves — versioned from day one

Opposite of the cozy_sprites rule: saves here are long-lived while the game
evolves. Every save carries `schemaVersion`; every schema change ships a
migration function, tested. The Meadow import path is a separate
read-only adapter for their export JSON — never write back to it.

## Sprite rendering — hard rule (inherited)

Never draw sprite art with non-integer `ctx.scale()`/`ctx.rotate()` — it
resamples pixel art off the grid (unequal eyes, doubled/vanished outlines).
Port `drawSpriteQuantized` from cozy_sprites `src/render/scene.ts` and read
its docblock before adding any draw path or animation. Squash thins rows
(±1px), never drops them. Unit tests can't catch visual regressions;
verify large rendering changes with headless-browser screenshots.

## Tone

Deadpan institutional absurdism — small creatures taking ridiculous things
seriously. Dialogue follows The Meadow's house rules: per-form voice,
brevity, distinct openers, ellipsis style (`. ... Capital`), `"..."` is a
valid line. Secrets are never spoiled by UI.

## Design invariants (checked in review)

- No stamina/energy meters, no daily caps on gathering or building — real
  time gates the living world (crops, night, festivals), never the
  player's hands.
- Form is identity, never a job: no mechanic may require a player or
  villager to do an activity because of their form.
- Villager dialogue must be able to reference remembered events; write
  dialogue systems against a memory log, not static banks alone.

## Process

- Straight to `main` — no feature branches or PRs.
- Commit and push after completing a piece of work, without asking.
  `git pull` before pushing.
- Build the DESIGN.md vertical slice before any horizontal expansion.
