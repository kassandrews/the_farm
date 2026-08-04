// The tent, as art.
//
// ITS OWN MODULE so the dev contact sheet at /tents.html can draw the REAL
// tent rather than a copy of it — same rule the looks sheet works by. A second
// implementation of this drifts from the first within a week.

import type { TentDef } from "../content/tents";

/** One tent. The SHAPE never varies — see content/tents.ts for why — so
 *  everything `def` touches happens after the canvas is already up. */
export function drawTent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  ground: number,
  night: boolean,
  def: TentDef,
): void {
  // The Quiet Ghost's tent is not pegged to anything and does not touch the
  // grass. Everything else sits on it.
  const lift = def.decor === "hover" ? 4 : 0;
  const baseY = ground - lift;
  // OFF-WHITE DUCK CANVAS, not dyed. A tent is issued kit, and issued kit is
  // the colour the cloth came in — the terracotta it used to be read as a
  // decorated thing somebody chose.
  //
  // ONE CLOTH, TWO PANELS — no stripes. It was banded in threes, which at
  // this size read as a beach awning rather than as canvas; what a tent
  // actually has is a lit face and a lee face meeting at the ridge seam,
  // which is exactly where the door parts anyway. Light comes from the
  // north-west here (the same call the roof pitch and the tree crowns are
  // drawn by), so the left panel is the lit one.
  const canvas = night ? "#b9b3a4" : "#e8e2d1";
  const lee = night ? "#a8a294" : "#d5cebb";
  // BIG ENOUGH TO SLEEP IN. It was 20x15 — shorter than a wall and barely
  // wider than the creature it houses, which made the one thing you own at the
  // start of the game read as a folded towel. A tent is where somebody lives
  // until you build them a house, and the commission beat is weaker if the
  // thing they are living in looks uninhabitable.
  const w = 28;
  const sag = def.decor === "sag";
  const h = 24;
  const apexY = baseY - h;

  ctx.fillStyle = `rgba(0,0,0,${lift ? 0.07 : 0.16})`;
  ctx.fillRect(cx - (w >> 1) + (lift ? 5 : 1), ground - 1, w - (lift ? 10 : 2), lift ? 1 : 2);

  // A ridge tent: a triangle of canvas. `r` counts DOWN from the apex, so the
  // half-width grows with r — computing it from (h - r) instead pitches the
  // tent upside down as a funnel, which is what it did until the raised pass
  // made it big enough to notice.
  //
  // The Dramatic Blob's bows outward and leans off its pole instead of running
  // straight: cloth hanging rather than pulled taut. A LOWER APEX WAS THE FIRST
  // ATTEMPT and it read as a smaller tent, not a sadder one — the sag has to be
  // in the line of the ridge, at full height, or it isn't legible as a sag.
  const halfAt = (r: number): number => {
    const t = (r + 1) / h;
    return Math.round((sag ? Math.pow(t, 0.55) : t) * (w / 2));
  };
  const skewAt = (r: number): number => (sag ? Math.round((1 - (r + 1) / h) * 3) : 0);
  for (let r = 0; r < h; r++) {
    const half = halfAt(r);
    const mid = cx + skewAt(r);
    const y = apexY + r;
    ctx.fillStyle = canvas;
    ctx.fillRect(mid - half, y, half, 1);
    ctx.fillStyle = lee;
    ctx.fillRect(mid, y, half, 1);
  }

  // The doorway is a triangle, not a rectangle: a flap parts along the ridge,
  // so the opening is widest at the ground and closes to a point. A rectangle
  // read as a doorframe, which is a house's idea.
  const doorH = 13;
  const doorW = def.decor === "openflap" ? 6 : 4;
  ctx.fillStyle = "#3a2620";
  for (let r = 0; r < doorH; r++) {
    const half = Math.max(1, Math.round(((r + 1) / doorH) * doorW));
    ctx.fillRect(cx - half, baseY - doorH + r, half * 2, 1);
  }

  // Guy lines and pegs — two strokes that say "pitched" rather than "placed",
  // and the cheapest way to stop a triangle reading as a solid wedge.
  const rope = night ? "#6b5a48" : "#8a7358";
  if (def.decor !== "hover") {
    ctx.fillStyle = rope;
    ctx.fillRect(cx - (w >> 1) - 3, baseY - 3, 4, 1);
    ctx.fillRect(cx + (w >> 1) - 1, baseY - 3, 4, 1);
    // The Humming Cube's are level, matched and doubled. A tent pitched to
    // spec, which nobody asked for.
    if (def.decor === "taut") {
      ctx.fillRect(cx - (w >> 1) - 4, baseY - 7, 5, 1);
      ctx.fillRect(cx + (w >> 1) - 1, baseY - 7, 5, 1);
    }
    // The Gremlin's near line has come off its peg and nobody is worried.
    if (def.decor === "patched") {
      ctx.fillStyle = rope;
      ctx.fillRect(cx + (w >> 1) + 1, baseY - 2, 3, 1);
    }
  }
  // Pole tip.
  ctx.fillStyle = "#6e5138";
  ctx.fillRect(cx + skewAt(0), apexY - 2, 1, 3);

  drawTentDecor(ctx, cx, baseY, apexY, w, def, night);
}

/** What the occupant did to it. One decoration per form, never two: at 28x24
 *  a second one is clutter, not character. */
function drawTentDecor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  apexY: number,
  w: number,
  def: TentDef,
  night: boolean,
): void {
  const accent = def.accent;

  switch (def.decor) {
    // A pole run tall and a banner on it. A tent with a standard is an ARMY
    // camp, and nobody appointed them to command anything.
    case "pennant": {
      const top = apexY - 9;
      ctx.fillStyle = "#6e5138";
      ctx.fillRect(cx, top, 1, 10);
      ctx.fillStyle = accent;
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(cx + 1, top + r, 7 - r, 1); // swallow-tailed, tapering
      }
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(cx + 1, top + 4, 3, 1); // the underside of the fly
      break;
    }

    // Both flaps rolled and tied back against the canvas. The door is not
    // broken; a shut door is a solvable problem.
    case "openflap": {
      // Rolled, not flat: a lit face, a core and a shaded edge, or they read as
      // two glowing strips stuck to the canvas.
      for (const side of [-1, 1]) {
        const x = side < 0 ? cx - 10 : cx + 7;
        ctx.fillStyle = night ? "#cfc8b8" : "#f6f1e2";
        ctx.fillRect(x, baseY - 11, 1, 10);
        ctx.fillStyle = night ? "#b3ad9e" : "#e0d9c6";
        ctx.fillRect(x + 1, baseY - 11, 1, 10);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x + 2, baseY - 11, 1, 10);
      }
      ctx.fillStyle = accent;
      ctx.fillRect(cx - 11, baseY - 7, 5, 1); // the ties
      ctx.fillRect(cx + 6, baseY - 7, 5, 1);
      break;
    }

    // The droop is in the profile already (see `sag`). All that's left is the
    // pole leaning out from under it, holding on.
    case "sag": {
      ctx.fillStyle = "#6e5138";
      ctx.fillRect(cx + 3, apexY - 1, 3, 1); // the pole, out from under it
      ctx.fillStyle = "rgba(0,0,0,0.10)"; // and the fold the slack falls into
      ctx.fillRect(cx - 5, apexY + 9, 7, 1);
      break;
    }

    // Repaired more often than damaged, which raises its own question about
    // where the extra cloth keeps coming from.
    case "patched": {
      const patches: Array<[number, number, number, number]> = [
        [-8, 10, 5, 4],
        [4, 7, 4, 3],
        [-3, 16, 4, 3],
      ];
      for (const [dx, up, pw, ph] of patches) {
        ctx.fillStyle = night ? "#9b8a72" : "#c9b48e";
        ctx.fillRect(cx + dx, baseY - up, pw, ph);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; // stitching along the top edge
        ctx.fillRect(cx + dx, baseY - up, pw, 1);
      }
      break;
    }

    // Reading in a tent, at night, having been handed a whole town to look at.
    case "lantern": {
      // OFF AN ARM AT THE APEX, clear of the cloth. Hung against the canvas it
      // was a three-pixel smudge on an off-white field and read as a stain.
      const lx = cx + 4;
      ctx.fillStyle = "#6e5138";
      ctx.fillRect(cx + 1, apexY - 1, 4, 1); // the arm
      ctx.fillRect(lx + 1, apexY, 1, 2); // the hook
      if (night) {
        // The light it actually throws, as three nested rings rather than one
        // rectangle — a single flat wash has a hard edge, and a hard-edged
        // glow reads as a grey card taped to the sky.
        for (let ring = 3; ring >= 1; ring--) {
          ctx.fillStyle = `rgba(255,224,150,${(0.05 * (4 - ring)).toFixed(2)})`;
          ctx.fillRect(lx + 2 - ring * 3, apexY + 4 - ring * 3, ring * 6, ring * 6);
        }
      }
      ctx.fillStyle = "#3f3228"; // OPAQUE: over grass, a black wash went green
      ctx.fillRect(lx, apexY + 2, 4, 5);
      ctx.fillStyle = night ? "#ffe6a8" : "#f0e2b4"; // the glass
      ctx.fillRect(lx + 1, apexY + 3, 2, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(lx, apexY + 6, 4, 1); // its own colour, on the base
      break;
    }

    // He has posted the rules of the tent, on the tent. There is one occupant.
    case "notice": {
      const nx = cx + 3;
      ctx.fillStyle = night ? "#d8d4c8" : "#fbf8ef";
      ctx.fillRect(nx, baseY - 10, 6, 7);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(nx, baseY - 10, 6, 1);
      ctx.fillStyle = night ? "#7a7686" : "#6f6a80"; // the lines of text
      ctx.fillRect(nx + 1, baseY - 8, 4, 1);
      ctx.fillRect(nx + 1, baseY - 6, 4, 1);
      ctx.fillRect(nx + 1, baseY - 4, 2, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(nx + 3, baseY - 11, 1, 1); // the pin
      break;
    }

    // Guy lines are for tents that could fall down. The hem is drawn clear of
    // the grass by `lift`; nothing more to add here.
    case "hover":
      break;

    // Every line matched, every peg out the same distance, and a cube where
    // the finial goes. The only correctly pitched tent in town.
    case "taut": {
      ctx.fillStyle = accent;
      ctx.fillRect(cx - 1, apexY - 5, 3, 3);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(cx - 1, apexY - 3, 3, 1);
      break;
    }

    // Left in the sun with a water supply. This was always going to happen.
    case "sprout": {
      const leaf = night ? "#3f7a34" : "#5da84a";
      ctx.fillStyle = leaf;
      ctx.fillRect(cx, apexY - 6, 1, 4);
      ctx.fillRect(cx - 2, apexY - 5, 1, 3);
      ctx.fillRect(cx + 2, apexY - 5, 1, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(cx - 1, apexY - 2, 3, 1); // where the greens meet the cloth
      break;
    }

    // Not a reflection. It is the middle of the afternoon and the canvas has
    // stars on it, and nobody has raised this with them yet.
    case "stars": {
      // Three, small. Five plus-signs of full-strength body colour read as
      // embroidered flowers, which is a different creature's tent entirely.
      const dots: Array<[number, number]> = [
        [-6, 10],
        [4, 14],
        [-1, 18],
      ];
      for (const [dx, up] of dots) {
        const x = cx + dx;
        const y = baseY - up;
        ctx.fillStyle = accent; // a three-pixel cross: any wider and it is a flower
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = night ? "#ffffff" : "#fbf8ff";
        ctx.fillRect(x, y, 1, 1);
      }
      break;
    }

    // Issued a tent. Used the tent as a door. The paperwork records a tent.
    case "burrow": {
      const mx = cx + (w >> 1) + 4;
      const earth = night ? "#5a4636" : "#7a5f45";
      ctx.fillStyle = earth;
      ctx.fillRect(mx - 5, baseY - 2, 10, 2);
      ctx.fillRect(mx - 3, baseY - 4, 6, 2);
      ctx.fillRect(mx - 2, baseY - 5, 4, 1);
      ctx.fillStyle = "#241c16";
      ctx.fillRect(mx - 2, baseY - 3, 4, 2); // the way down
      ctx.fillStyle = accent;
      ctx.fillRect(mx - 4, baseY - 1, 1, 1); // spoil, freshly turned
      ctx.fillRect(mx + 3, baseY - 1, 1, 1);
      break;
    }
  }
}
