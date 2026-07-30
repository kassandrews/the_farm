---
name: verify
description: Drive The Farm in a real browser and photograph it, to confirm a change works on screen rather than only in tests.
---

# Verifying a change in The Farm

Unit tests here cannot see the bugs that matter. Every visual bug this project
has shipped passed the suite and was obvious within a second of looking at a
screenshot — striped ground, a roof tiled into boxes, a fen 1.3% under water
while claiming 10%, seas aligned on a lattice diagonal. **Look at it.**

## Launching

```bash
npm run dev &                 # port 5173; leave it running
node scripts/drive.mjs --out /tmp/shots       # one screenshot, no scripting
```

`scripts/drive.mjs` exports `drive()`, which launches Chrome via playwright-core,
clicks through onboarding and hands back a driven page. Read its header comment
before scripting it — the gotchas listed there have each cost real time.

The two that bite hardest:

- **Tile size is not fixed.** Read it off the canvas (`d.tilePx`); never hardcode.
- **`beforeunload` clobbers localStorage writes.** Seed through `reseed()` /
  `addInitScript`, which run on the new document.

### Standing somewhere specific

The camera shows ~25 tiles at the default viewport, so widen it and place the
player rather than walking. To choose the seed, spot and position at once:

```js
const d = await drive({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await d.reseed((a) => {
  const w = JSON.parse(localStorage.getItem("the-farm-save"));
  w.seed = a.seed; w.homestead.spot = a.spot;
  w.player.x = a.x; w.player.y = a.y; w.player.target = null;
  localStorage.setItem("the-farm-save", JSON.stringify(w));
}, { seed: 3, spot: "riverside", x: -14, y: -1 });
await d.shot("/tmp/shots/river.png");
```

## Terrain changes need MAP scale as well

The game camera shows about forty tiles. Terrain bugs are bigger than that, so
in-game screenshots cannot find them:

```bash
npx tsx scripts/shot-map.mts /tmp/shots    # no dev server needed, ~1 min
```

Far field (3000 tiles, 3/px) answers *is there a grain, a lattice, a repeat*.
Near field (250 tiles, 1/px) answers *does a coastline read as a coastline*.
`byKind` recolours by water kind, which is the only way to tell a sea from a
big lake.

Also `npx tsx scripts/shot-biomes.mts` — stands in every biome and photographs
it; run after any change to biomes, the field in `sim/world.ts`, or the tinting
in `render/palette.ts`.

## Measuring rather than eyeballing

"There is no water on screen" and "the water is off screen" look identical in a
screenshot. For anything about density, distance or frequency, write a throwaway
`src/*.test.ts` that walks a long transect and counts — vitest is the TS runner
that is already installed. Two traps, both hit:

- **Console output is swallowed** by the reporter. Write results to a file.
- **Cell spacing is not encounter distance.** Along a straight line you only meet
  a body whose disc your path crosses. Reasoning gave "a coast every 2–5 minutes"
  where the measured figure was twelve. Measure.

Delete the throwaway when done.
