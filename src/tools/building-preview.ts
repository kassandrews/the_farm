// Dev contact sheet for the buildings in src/content/town.ts.
//
// Every building in town at once, drawn by the REAL renderer out of a REAL
// world — `newWorld` stamps the whole town at its own coordinates, so this page
// draws exactly what the game draws and never a second copy of it. Edit
// town.ts, structures.ts or renderer.ts, save, and Vite reloads the sheet.
//
// THE INSTRUMENT IT REPLACES is driving the game. Checking the barn's façade
// meant `scripts/drive.mjs`, a seeded save, a player parked at (-5,20), a
// screenshot and a crop — about a minute for one building, and the answer came
// back as a picture of one building. Half the questions about a town are
// relative: is the hall grander than the shop, is the salvage heap the only mean
// one, does the barn's ox-blood belong in the same street as the museum's
// marble. A page that shows seven at once is a different instrument from seven
// screenshots, which is the argument /biomes.html already makes for regions.
//
// It does NOT replace the driver. This page cannot walk through a door, open a
// roof cutaway, or tell you a doorstep is blocked — those are about playing, and
// drive.mjs is still the thing for them.
//
// BARE ON PURPOSE. No time slider, no zoom, no seed box: fixed at a summer
// midday, one framing per building. The regions page needs controls because a
// region IS its light and its month; a building is a shape with a face on it,
// and the fastest sheet is the one that is already showing you the thing when
// the reload lands.
//
// Not shipped: `npm run build` only bundles index.html. Reach it with
// `npm run dev` at /buildings.html.

// Evict a stale service worker before anything else — a tool page has its own
// entry point, so main.ts's cleanup never runs here. See no-sw.ts.
import "./no-sw";
import { allTownBuildings, type TownBuilding } from "../content/town";
import { newWorld } from "../sim/game";
import { Renderer } from "../render/renderer";
import { zoomLadder } from "../render/zoom";
import { skinDef } from "../content/skins";
import { structureDef } from "../content/structures";
import type { WorldState } from "../sim/types";

/** Scene pixels per tile, matching the renderer's own. */
const TILE = 16;

/** Ground around the building, in tiles — three a side.
 *
 *  It has to clear the ROOF, which is drawn a storey (24 scene px, a tile and a
 *  half) above the cells it covers and overhangs them besides. Two rows would
 *  crop the ridge of anything with a deep pitch, and a contact sheet that cuts
 *  the top off the museum is worse than no sheet: you would go and look for a
 *  bug in the roof. */
const MARGIN = 6;

/** The one moment the sheet is set to.
 *
 *  A FIXED DATE, never `new Date()`. The renderer resolves its whole palette
 *  from `now` — season, sky phase, the night wash, the rake of the shadows — so
 *  a page on the wall clock would show a different town at breakfast and at
 *  midnight, and every judgement made against it would be about the hour rather
 *  than about the building. Two clocks for one fact, the same trap the mailbox
 *  fell into (sim/time.ts).
 *
 *  Midsummer midday, which is drive.mjs's own pinned hour: full light, no wash,
 *  the finishes at their own colours. */
const WHEN = new Date("2026-07-24T13:00:00").getTime();

/** The seed the ground is generated on. Buildings stand at fixed coordinates
 *  whatever the seed, so this only decides what is AROUND them — and it is fixed
 *  for the reason the clock is: the page should change when the town changes and
 *  at no other time. */
const SEED = 3;

interface Card {
  building: TownBuilding;
  world: WorldState;
  renderer: Renderer;
}

const cards: Card[] = [];
const sheet = document.getElementById("sheet")!;

/** What this building shows the street, in words, so the caption says the thing
 *  the picture cannot: WHICH sash, not merely that there is glass. */
function facade(b: TownBuilding): string {
  const bits: string[] = [];
  const sashes = (b.windows ?? []).filter((w) => w.y === b.y1);
  const names = new Map<string, number>();
  for (const w of sashes) {
    const name = structureDef(w.sash ?? "window").name.toLowerCase();
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  for (const [name, n] of names) bits.push(n > 1 ? `${n}× ${name}` : name);
  const panels = (b.panels ?? []).filter((p) => p.y === b.y1).length;
  if (panels) bits.push(panels > 1 ? `${panels}× barn doors` : "barn doors");
  if ((b.skylights ?? []).length) bits.push(`${(b.skylights ?? []).length} skylights`);
  return bits.length ? bits.join(", ") : "blank";
}

function build(): void {
  // ONE world, shared by every card. The town is stamped into it once at
  // creation and the generator's chunk cache lives on it, so seven cards of the
  // same seed share the ground rather than generating it seven times. Each card
  // takes a shallow copy whose only difference is where the player stands —
  // which is what the camera follows.
  const base = newWorld({ name: "Preview", form: "blob", spot: "riverside", seed: SEED });

  for (const b of allTownBuildings()) {
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    const spanX = w + MARGIN;
    const spanY = h + MARGIN;

    const card = document.createElement("figure");
    card.className = "card";
    const canvas = document.createElement("canvas");
    canvas.className = "shot";
    // The CSS box is what decides the framing: `resize()` reads it and divides
    // by an integer scale, so the tile count falls out of the box rather than
    // being multiplied by a fraction (CLAUDE.md §Sprite rendering — a
    // non-integer scale resamples pixel art off the grid).
    canvas.style.width = `${spanX * TILE * 2}px`;
    canvas.style.height = `${spanY * TILE * 2}px`;

    const cap = document.createElement("figcaption");
    const finish = skinDef(b.finish).name;
    const walls = b.walls ? skinDef(b.walls).name : null;
    // Asked of the WORLD rather than of the cast table: `resident` is a starting
    // condition and the claim lives on the villager from then on (§resident), so
    // the villager list is the honest answer to who is in there.
    const resident = base.villagers.find((v) => v.id === b.resident)?.name ?? null;
    cap.append(
      Object.assign(document.createElement("strong"), { textContent: b.name }),
      Object.assign(document.createElement("span"), {
        className: "note",
        textContent: `${w}×${h}`,
      }),
    );
    const lines = document.createElement("div");
    lines.className = "lines";
    lines.append(
      line(walls ? `${walls} walls, ${finish} joinery` : finish),
      line(`door ${b.door.x},${b.door.y} · façade: ${facade(b)}`),
      line(resident ? `${resident} lives here` : "nobody lives here"),
    );
    card.append(canvas, cap, lines);
    sheet.append(card);

    // STOOD ON THE DOORSTEP, and the camera panned off them onto the building.
    //
    // The camera follows the player and there is no other way to aim it, so the
    // player has to be somewhere — and the two obvious choices are both wrong.
    // Inside the room opens the roof cutaway (render §refreshRoofs), which is
    // the one thing a façade sheet must not do; far enough south to be off the
    // canvas is past `panLimit`, so the pan clamps and the building drifts off
    // centre instead.
    //
    // The doorstep is outside the room, is paved, is guaranteed walkable by the
    // town's own tests, and puts one creature of known size at the front door of
    // every card — which is the only scale reference on the page. The reticle
    // goes; it is a promise about a button this page does not have.
    const stand = { x: b.door.x, y: b.door.y + 1 };
    const world: WorldState = {
      ...base,
      player: { ...base.player, x: stand.x, y: stand.y, target: null },
    };
    const renderer = new Renderer(canvas);
    renderer.setChrome(false);
    // The furthest rung the box allows, which is the one that fits the whole
    // building: step 0 aims for an eleven-tile view whatever the canvas, so the
    // museum would be framed on its own front door.
    const ladder = zoomLadder(Math.min(spanX, spanY) * TILE * 2, TILE);
    const flat = ladder.lastIndexOf(2);
    renderer.setZoomStep(flat >= 0 ? flat : ladder.length - 1);
    // Off the player and onto the building's middle. Three quarters of a tile
    // higher than the true centre, because a roof stands a storey above the
    // cells it covers and a building's visual mass is therefore above its
    // footprint's.
    renderer.panBy((b.x0 + b.x1) / 2 - stand.x, (b.y0 + b.y1) / 2 - 0.75 - stand.y);
    renderer.snapCamera(world);
    cards.push({ building: b, world, renderer });
  }
}

function line(text: string): HTMLElement {
  return Object.assign(document.createElement("div"), { className: "note", textContent: text });
}

/** Redrawn every frame rather than once, so anything that MOVES moves —
 *  Prudence crossing her own doorstep, and the fire in Margfrom's hearth
 *  (content/furnishings.ts §fireplace). A still would have shown the flame's
 *  first frame forever and quietly become a different picture from the game's. */
function frame(): void {
  for (const c of cards) {
    c.renderer.snapCamera(c.world); // no follow: each card is a fixed shot
    c.renderer.draw(c.world, WHEN);
  }
  requestAnimationFrame(frame);
}

build();
frame();
