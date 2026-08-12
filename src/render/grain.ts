// Grain — the marks that make a built surface read as boards or as masonry
// rather than as a fill.
//
// A laid floor and a wall face were each one flat rectangle of `skin.color`.
// Photographed, a walnut floor is a brown field wall to wall and a pine wall is
// a tan band: you can tell the finishes apart and you cannot tell what either
// one is MADE of. Every other surface in the game earned some texture (the
// ground got `groundTone` in 8c, the water has its ripple, a tree has layered
// crown rows); the things the player actually builds had none.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE PER-CELL EDGES RULE IS THE WHOLE DESIGN OF THIS FILE.
//
// CLAUDE.md's band rule has caught this project three times, and a plank seam is
// exactly the shape of the trap: a horizontal light-and-dark line, drawn on a
// surface that reads as continuous. Drawn once per CELL — a seam at the top of
// every tile — a floor becomes venetian blinds at the tile pitch, and we would
// have found it a fourth time.
//
// So the courses step off the WORLD PIXEL, and their period is deliberately
// COPRIME WITH THE TILE. A 5px board on a 16px tile puts a seam at world y 0, 5,
// 10, 15, 20 — three seams in the first tile, at 0/5/10, and the next tile's
// fall at 15/20/25, which is 15, 4 and 9 in cell-local terms. The pattern only
// repeats every 5 tiles (lcm(5,16) = 80px), and by then it has walked far enough
// that the eye reads boards rather than a grid. Pick a period that divides 16
// and this file becomes the bug it was written to avoid.
//
// This is the banding the rule EXPLICITLY allows — "deliberate banding, like the
// tent's striped canvas, is fine; it's banding that follows the tile grid that's
// the bug." Floorboards are supposed to look like floorboards.
// ─────────────────────────────────────────────────────────────────────────────
//
// Emits through a callback rather than returning an array. The renderer calls
// this for every visible built tile every frame — a few hundred calls at sixty
// hertz — and handing back a fresh array of mark objects each time is a few
// hundred thousand short-lived allocations a second for no gain. A callback is
// just as testable (collect into an array in the test) and allocates nothing.

/** How a surface is grained, per material class.
 *
 *  IT LIVES HERE, next to the rule it obeys. It was declared in renderer.ts for
 *  as long as the renderer was the only thing that drew a built surface; the
 *  build menu's swatches draw one too (render/thumbs.ts §surfaceThumb), and a
 *  second copy of these numbers is a floor whose picture in the menu is grained
 *  differently from the floor you get.
 *
 *  BOTH PERIODS ARE COPRIME WITH TILE, and that is not a taste call — it is the
 *  per-cell edges rule, which a plank seam is otherwise a textbook violation of.
 *  Read the docblock above before changing either number; 4 or 8 would look
 *  nearly the same in a mockup and stripe the floor at the tile pitch in game.
 *
 *  Wood boards are narrower and LONGER than flagstones are, and the length is
 *  what separates the two surfaces — more than the colour does and more than the
 *  course height does. The first version butted its boards every 13px and
 *  photographed as brickwork: a five-px course broken every thirteen IS a brick
 *  bond, whatever colour it is painted. A board is milled from a tree and runs
 *  most of a room, so it butts every 47 — three tiles, and rarely twice in one
 *  view. Flagstones are cut and laid, and break every nine.
 *
 *  `bond` is how many courses before the joints line up again — 3 for boards, a
 *  stepped bond; 2 for stone, the running bond every brick wall is laid in. It
 *  replaced a random per-course offset, which is what a floor looks like if you
 *  have never seen one: joints crowding, drifting, sometimes landing two pixels
 *  apart. Regularity is the thing that reads as workmanship. */
export const GRAIN = {
  wood: { course: 5, joint: 47, bond: 3, seam: 0.13, joint_ink: 0.2 },
  stone: { course: 6, joint: 9, bond: 2, seam: 0.11, joint_ink: 0.17 },
  // Cloth has no grain. A rug is woven, not built, and a seam across one would
  // read as two rugs — the pieces that wear cloth get their pattern from their
  // own draw path (drawFurniture), not from this.
  cloth: null,
  // Metal has no grain either, and for a sharper reason than cloth's. Grain is
  // COURSES — boards and blocks, things laid up out of units — and a metal
  // object is pressed or cast in one piece. Ruling a joint across a fridge door
  // would be the per-cell edges rule (CLAUDE.md) arriving as masonry: a surface
  // that is one surface, drawn as though it were several.
  metal: null,
  // Nor ceramic, and for metal's reason: a glazed fixture is one poured surface.
  // A joint ruled across a bath would be a bath built out of tiles.
  ceramic: null,
} as const;

/** What a mark is FOR, so the caller picks the ink. A seam is the gap between
 *  two boards or two courses and runs the length of the surface; a joint is
 *  where one board ends and the next begins, and crosses a single course. */
export type GrainInk = "seam" | "joint";

export interface GrainSpec {
  /** World pixel coordinate of the box's top-left. The courses are computed
   *  from this and NOT from the box's position on screen, which is what makes a
   *  run of tiles line up into one continuous surface. */
  wx: number;
  wy: number;
  w: number;
  h: number;
  /** Which way the boards run. "h" is floorboards and masonry courses (seams
   *  are horizontal lines); "v" is wall planking stood on end. */
  axis: "h" | "v";
  /** Board width / course height in world px. Keep it coprime with TILE — see
   *  the docblock above; this is the one number that must not be 2, 4, 8 or 16. */
  course: number;
  /** How long a board runs before it butts against the next, in world px.
   *  `null` for planking that runs the full height of what it covers — a wall
   *  board is one board from floor to ceiling and has no butt joint. */
  joint: number | null;
  /** THE BOND: how many courses before the joints line up again.
   *
   *  Each course is offset from the last by `joint / bond`, so 2 is a running
   *  bond (every other course lines up, the classic brick) and 3 is a stepped
   *  one, which is how floorboards are actually laid.
   *
   *  This replaced a per-course RANDOM offset, and the difference is the whole
   *  point. Random offsets are what a floor looks like if you have never seen a
   *  floor: joints crowd together, drift apart, and occasionally fall two pixels
   *  from each other, and the surface reads as chaos rather than as something
   *  somebody laid. Nobody lays a floor that way. A bond is regular BY
   *  DEFINITION, and being regular is what makes it legible as workmanship.
   *
   *  Keep `joint` coprime with TILE even so — a bond that divides the tile puts
   *  every joint at the same place in every cell, which is the per-cell edges
   *  rule again by a different road (see the docblock above). */
  bond: number;
}

/** Walk the grain marks covering a box, in box-local coordinates.
 *
 *  `emit(x, y, w, h, ink)` is called once per mark, all of them 1px thin in one
 *  direction. Marks are clipped to the box, so a caller can fill them straight
 *  into a tile without worrying about bleeding into its neighbour.
 */
export function forEachGrainMark(
  spec: GrainSpec,
  emit: (x: number, y: number, w: number, h: number, ink: GrainInk) => void,
): void {
  const { wx, wy, w, h, axis, course, joint, bond } = spec;
  // Work in "along" (the direction boards run) and "across" (the direction the
  // courses stack). Mapping back at the emit call keeps one implementation for
  // both axes instead of two that drift apart.
  const across0 = axis === "h" ? wy : wx;
  const acrossLen = axis === "h" ? h : w;
  const along0 = axis === "h" ? wx : wy;
  const alongLen = axis === "h" ? w : h;

  const put = (along: number, across: number, alongSpan: number, acrossSpan: number, ink: GrainInk) => {
    // Clip to the box before mapping, so both axes clip identically.
    const a0 = Math.max(along, along0);
    const a1 = Math.min(along + alongSpan, along0 + alongLen);
    const c0 = Math.max(across, across0);
    const c1 = Math.min(across + acrossSpan, across0 + acrossLen);
    if (a1 <= a0 || c1 <= c0) return;
    if (axis === "h") emit(a0 - along0, c0 - across0, a1 - a0, c1 - c0, ink);
    else emit(c0 - across0, a0 - along0, c1 - c0, a1 - a0, ink);
  };

  const first = Math.floor(across0 / course);
  const last = Math.floor((across0 + acrossLen - 1) / course);
  for (let c = first; c <= last; c++) {
    const bandStart = c * course;
    // The seam sits at the START of each course. Drawing it at the end instead
    // would be identical everywhere except at the box edge, where the two
    // conventions disagree about which tile owns the shared line.
    put(along0, bandStart, alongLen, 1, "seam");
    if (joint == null) continue;
    // Butt joints, stepped by the bond. The offset depends ONLY on which course
    // this is, so every joint in a course sits at the same interval and each
    // course steps a fixed fraction of a board past the one behind it — a
    // staircase you can read, which is what a laid floor looks like.
    //
    // Some stagger is still non-negotiable: with none, every board in the room
    // ends on the same line and the floor is a checkerboard, which is the tile
    // grid again at a different pitch. The bond is the disciplined version of
    // that, not an alternative to it.
    //
    // Modulo on a NEGATIVE course index would fold the wrong way and put a seam
    // in the bond at the world origin, which is a line of joints running to the
    // horizon through y = 0. `% bond + bond` costs nothing and means the pattern
    // has no centre.
    const off = Math.round((((c % bond) + bond) % bond) * (joint / bond));
    const jFirst = Math.floor((along0 - off) / joint);
    const jLast = Math.floor((along0 + alongLen - 1 - off) / joint);
    for (let j = jFirst; j <= jLast; j++) {
      put(j * joint + off, bandStart, 1, course, "joint");
    }
  }
}
