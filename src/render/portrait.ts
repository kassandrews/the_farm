// The face in the dialogue box.
//
// It is the SAME sprite the world draws — same form, same look, same neutral
// mood — only bigger. That is the whole point: a portrait drawn separately
// would be a second canonical face per character, and the first time the two
// disagreed (a look table changes, a form gets new art) the box would be
// showing somebody who isn't standing in front of you. Blowing up the world
// sprite makes that impossible by construction.
//
// HARD RULE (CLAUDE.md §Sprite rendering): the enlargement is an INTEGER
// multiple, drawn with smoothing off. 16 × 6 = 96, so every source pixel is a
// clean 6×6 block. The CSS then paints those 96 backing pixels to 96 CSS px,
// and `image-rendering: pixelated` (see style.css .portrait) keeps the final
// device-pixel-ratio step nearest-neighbour as well — on a 3× display the
// browser would otherwise blur a face we were careful to keep on the grid.

import { creatureKey, renderPixels, CELL } from "../content/canon/sprites";
import type { AdultForm } from "../content/canon/forms";
import type { LookDef } from "../content/looks";

/** How many screen pixels per sprite pixel. Integer, and it must stay one — and
 *  the CSS must display the canvas at exactly PORTRAIT_PX, not near it. Drawn at
 *  6× (96px) into a 120px box, `image-rendering: pixelated` gives some source
 *  pixels seven screen rows and others six: unequal eyes, by a different route
 *  than a non-integer ctx.scale() but with the same result on the face. */
export const PORTRAIT_SCALE = 8;
export const PORTRAIT_PX = CELL * PORTRAIT_SCALE;

/** Baked portraits, keyed by form + look. A character's face never changes
 *  within a session, and re-baking on every line of dialogue would rebuild the
 *  same 96×96 canvas each time somebody blinks through a conversation. */
const cache = new Map<string, HTMLCanvasElement>();

/** The speaker's face at portrait size, ready to append to a panel.
 *
 *  `look` is the same value the renderer passes for that villager
 *  (`lookFor(id, form)`), so residents keep their own colouring here. Omit it
 *  for canon art — the player's own form, which has no look by design.
 *
 *  Returns a cloned node rather than the cached canvas: two panels could want
 *  the same face at once (a speaker and, one day, a listener), and appending
 *  one canvas twice moves it. */
export function portrait(form: AdultForm, look?: LookDef): HTMLCanvasElement {
  const id = `${form}:${look?.id ?? "canon"}`;
  let baked = cache.get(id);
  if (!baked) {
    baked = bake(form, look);
    cache.set(id, baked);
  }
  const copy = document.createElement("canvas");
  copy.width = baked.width;
  copy.height = baked.height;
  copy.className = "portrait";
  const ctx = copy.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baked, 0, 0);
  return copy;
}

function bake(form: AdultForm, look?: LookDef): HTMLCanvasElement {
  // Source first, at 1:1. putImageData is the only way in, and it ignores
  // transforms — so the enlargement has to be a second, integer drawImage.
  const src = document.createElement("canvas");
  src.width = CELL;
  src.height = CELL;
  const buf = renderPixels(creatureKey("adult", form), "neutral", "base", look);
  const img = src.getContext("2d")!.createImageData(buf.w, buf.h);
  img.data.set(buf.data);
  src.getContext("2d")!.putImageData(img, 0, 0);

  const out = document.createElement("canvas");
  out.width = PORTRAIT_PX;
  out.height = PORTRAIT_PX;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, PORTRAIT_PX, PORTRAIT_PX);
  return out;
}
