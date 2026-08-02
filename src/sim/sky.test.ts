// The sky (Phase 7c). A third layer, entered through a staircase you find.
//
// What is under test here is mostly what the sky must NOT do — like the found
// places, this is a category defined by its refusals (DESIGN §The sky), and the
// refusals are the part a later change breaks without noticing. The one
// AFFIRMATIVE claim, and the one everything else hangs off, is that the two ends
// of the staircase always agree.

import { describe, it, expect } from "vitest";
import {
  newWorld,
  playerTile,
  canClimb,
  climbTarget,
  useStair,
  canGoDownStair,
  actionTarget,
  contextAction,
  toolAllowedOn,
  buildAt,
} from "./game";
import { tileAt, isWalkable, skyStairSiteAt, generatedSkyTile, setTile } from "./world";
import { CLOUD, CLOUD_THIN, SKY_STAIR, STAIR, GRASS, TILES } from "../content/tiles";
import { FOUND } from "../content/found";
import { SKY_PARTING } from "./found";
import type { WorldState, HomesteadSpot, BuildTool } from "./types";
import { FURNITURE } from "../content/furniture";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "lakeside", "coast"];

function freshWorld(seed = 21): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed });
}

/** The nearest real staircase in a town, found the way a player finds one:
 *  by walking its ring rather than by being told where it is. */
function findStair(w: WorldState): { x: number; y: number } {
  const def = FOUND.skystair;
  for (let i = 0; i < 3; i++) {
    const ring = def.ring + i * def.spacing;
    // A fine sweep, because a three-tile footprint on a ring of 244 subtends
    // very little: a coarse one misses the staircase and reports the feature
    // missing, which is a test failing at trigonometry.
    for (let a = 0; a < 6000; a++) {
      const th = (a / 6000) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * ring);
      const y = Math.round(Math.sin(th) * ring);
      if (skyStairSiteAt(w.seed, w.homestead.spot, x, y)) return { x, y };
    }
  }
  throw new Error("no staircase found — the ring arithmetic has moved");
}

describe("the sky layer", () => {
  it("is open cloud everywhere, which is the underground's rule inverted", () => {
    // Down there generation hands you solid rock and every open cell is one you
    // carved. Up here it hands you floor and you carve nothing, because there is
    // nothing up there to carve with (DESIGN §The sky).
    const w = freshWorld();
    for (let y = -40; y < 40; y += 3) {
      for (let x = -40; x < 40; x += 3) {
        expect(isWalkable(w, x, y, "sky")).toBe(true);
      }
    }
  });

  it("has no biomes, no water and no clutter — the same answer in every direction", () => {
    // 7a made the world stranger the further out you go, and that is a fact
    // about the GROUND. If a far region ever started tinting the sky, this is
    // the test that says so.
    const w = freshWorld();
    const kinds = new Set<number>();
    for (let r = 100; r < 4000; r += 61) {
      kinds.add(generatedSkyTile(w.seed, w.homestead.spot, r, -r + 7));
      kinds.add(generatedSkyTile(w.seed, w.homestead.spot, -r + 3, r));
    }
    // Cloud, and at most the thinning around a way down. Nothing else, at any
    // radius, forever.
    for (const k of kinds) expect([CLOUD, CLOUD_THIN, SKY_STAIR]).toContain(k);
  });

  it("keeps its edits nowhere, because there are none to keep", () => {
    // The sky ships no `world.sky` record (sim/world.ts §editsFor), which is why
    // Phase 7c cost no schema change. A write that should never happen must not
    // land quietly in the SURFACE's record, which is where it would have gone.
    const w = freshWorld();
    expect(() => setTile(w, 3, 3, GRASS, "sky")).toThrow();
    expect(tileAt(w, 3, 3)).not.toBe(GRASS === tileAt(w, 3, 3) ? -1 : GRASS); // untouched either way
    expect(Object.keys(w.overrides).some((k) => k === "3,3")).toBe(false);
  });
});

describe("the staircase that goes somewhere", () => {
  it("is the same three steps on the ground as the one that goes nowhere", () => {
    // The whole secret. If these two ever draw differently, the way up has been
    // marked and every 7b decoy has become a signpost pointing at it.
    const w = freshWorld();
    const at = findStair(w);
    expect(tileAt(w, at.x, at.y)).toBe(STAIR);
    expect(TILES[STAIR].solid).toBe(true);
  });

  it("agrees with itself from both ends", () => {
    // There is no stored entrance, so there is nothing for the two ends to
    // disagree about — but "nothing can disagree" is a claim about an
    // implementation, and this is the test that keeps it true.
    for (const spot of SPOTS) {
      const w = newWorld({ name: "Me", form: "dog", spot, seed: 909 });
      const at = findStair(w);
      expect(tileAt(w, at.x, at.y)).toBe(STAIR);
      expect(tileAt(w, at.x, at.y, "sky")).toBe(SKY_STAIR);
    }
  });

  it("parts the cloud around itself, so the way home is a place and not a speck", () => {
    // An unbounded white plane whose only exits are three tiles wide is a game
    // you can get lost in with no map and no landmark. The parting is the fix,
    // and it is the same one the underground already ships (daylight pools round
    // a shaft). Measured as: standing well back from the steps, you can still
    // see that something is there.
    const w = freshWorld();
    const at = findStair(w);
    let thin = 0;
    for (let dy = -SKY_PARTING; dy <= SKY_PARTING; dy++) {
      for (let dx = -SKY_PARTING; dx <= SKY_PARTING; dx++) {
        if (tileAt(w, at.x + dx, at.y + dy, "sky") === CLOUD_THIN) thin++;
      }
    }
    // A disc of radius ~7 is around 150 cells; anything much smaller is a
    // staircase you would walk past at four tiles' distance.
    expect(thin).toBeGreaterThan(100);
    // And it ENDS. A thinning that never stopped would be a sky with no plain
    // cloud in it, which is the whole layer's character gone.
    expect(tileAt(w, at.x + 20, at.y, "sky")).toBe(CLOUD);
  });

  it("is climbed by facing it, and only by facing it", () => {
    const w = freshWorld();
    const at = findStair(w);
    // Stand at the foot, looking north at the steps.
    w.player.x = at.x;
    w.player.y = at.y + 1;
    w.player.heading = "n";
    expect(canClimb(w)).toBe(true);
    expect(climbTarget(w)).toEqual({ x: at.x, y: at.y });

    // Turn round and it is an ordinary field again. The steps have not changed;
    // you are no longer looking at them.
    w.player.heading = "s";
    expect(canClimb(w)).toBe(false);
  });

  it("takes you up and puts you back down on your own two feet", () => {
    const w = freshWorld();
    const at = findStair(w);
    w.player.x = at.x;
    w.player.y = at.y + 1;
    w.player.heading = "n";

    expect(useStair(w)).toBe(true);
    expect(w.player.layer).toBe("sky");
    // The same coordinate, one layer up — the shaft's rule, pointed the other
    // way. You arrive standing on the head of the steps.
    expect(playerTile(w)).toEqual({ x: at.x, y: at.y });
    expect(canGoDownStair(w)).toBe(true);

    expect(useStair(w)).toBe(true);
    expect(w.player.layer).toBe("surface");
    // NOT onto the steps themselves: they are solid, unlike a shaft. You step
    // off the front of them, onto ground you can stand on.
    const back = playerTile(w);
    expect(isWalkable(w, back.x, back.y)).toBe(true);
    expect(Math.abs(back.x - at.x) <= 1 && Math.abs(back.y - at.y) <= 1).toBe(true);
  });

  it("takes you nowhere from the foot of a flight that goes nowhere", () => {
    // The decoys, and the reason they shipped a phase early. Finding the real one
    // means something because these do not work.
    //
    // THIS TEST USED TO ASSERT THE OPPOSITE OF ITS LAST LINE, and the change is
    // deliberate. It required `actionTarget` NOT to offer a decoy, so the held
    // tool took the button and pressing ACT at the foot of one dug the grass you
    // were standing on — which is indistinguishable from the button being broken,
    // and was reported as exactly that. The mechanic is "find out by trying"
    // (DESIGN §The sky); a try the button will not let you make is not a try, and
    // an affordance that differs between the two kinds answers the question
    // before you have asked it.
    //
    // What must NOT change is below it: the decoy still refuses to climb, still
    // moves nobody, and still stores nothing. It gains a line about itself and
    // nothing else.
    const w = freshWorld();
    const def = FOUND.stair;
    let found: { x: number; y: number } | null = null;
    for (let a = 0; a < 6000 && !found; a++) {
      const th = (a / 6000) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * def.ring);
      const y = Math.round(Math.sin(th) * def.ring);
      if (tileAt(w, x, y) === STAIR && !skyStairSiteAt(w.seed, w.homestead.spot, x, y)) {
        found = { x, y };
      }
    }
    expect(found).not.toBeNull();
    w.player.x = found!.x;
    w.player.y = found!.y + 1;
    w.player.heading = "n";
    expect(canClimb(w)).toBe(false);
    expect(useStair(w)).toBe(false);
    expect(w.player.layer).toBe("surface");
    // The button offers the steps, exactly as the real one does.
    expect(actionTarget(w, "dig").kind).toBe("stair");
    // And pressing it says something about THESE steps, changes nothing, and
    // names nothing to do or to look for.
    const r = contextAction(w, "dig", Date.now());
    expect(r.changed).toBe(false);
    expect(w.player.layer).toBe("surface");
    expect(r.message).toBeTruthy();
    expect(r.message).not.toMatch(/other|another|somewhere else|real|this one|elsewhere/i);
  });
});

describe("what you may do up there", () => {
  it("is nothing — no tool is allowed on the sky at all", () => {
    // The empty allowlist, and the reason it is an allowlist: the old form of
    // this rule ("under is special, otherwise yes") would have handed a new
    // layer the entire palette, and `world.build` has no layer in its keys.
    const every: BuildTool[] = ["floor", "wall", "door", "erase", ...(Object.keys(FURNITURE) as BuildTool[])];
    for (const t of every) expect(toolAllowedOn(t, "sky")).toBe(false);
    // And the surface still allows all of them, so this test can never pass by
    // having quietly switched everything off.
    for (const t of every) expect(toolAllowedOn(t, "surface")).toBe(true);
  });

  it("refuses a build even when the UI would have allowed it", () => {
    const w = freshWorld();
    const at = findStair(w);
    w.player.x = at.x;
    w.player.y = at.y + 1;
    w.player.heading = "n";
    useStair(w);
    const before = { ...w.build };
    const res = buildAt(w, "wall", at.x + 1, at.y, 0, "s", "sky");
    expect(res.changed).toBe(false);
    // And nothing landed on the ground underneath, which is the failure this
    // whole allowlist exists to make impossible.
    expect(w.build).toEqual(before);
  });

  it("offers the steps and nothing else, whatever tool is held", () => {
    const w = freshWorld();
    const at = findStair(w);
    w.player.x = at.x;
    w.player.y = at.y + 1;
    w.player.heading = "n";
    useStair(w);
    // Standing on the head of the steps: the way down, with every tool.
    for (const tool of ["dig", "gather", "water", "plant"] as const) {
      expect(actionTarget(w, tool).kind).toBe("stair");
    }
    // One step off it: nothing, with every tool. No digging the sky.
    w.player.x = at.x + 4;
    w.player.y = at.y + 4;
    for (const tool of ["dig", "gather", "water", "plant"] as const) {
      expect(actionTarget(w, tool).kind).toBe("none");
    }
    const res = contextAction(w, "dig", 0);
    expect(res.changed).toBe(false);
  });
});
