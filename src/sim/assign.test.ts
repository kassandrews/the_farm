import { describe, it, expect } from "vitest";
import { newWorld, buildAt } from "./game";
import { setTile, tileKey } from "./world";
import { GRASS } from "../content/tiles";
import { add } from "./inventory";
import { claimedBed, homeStand, stopTarget } from "./housing";
import { qualify, assign, beds, rehomeAcrossStroke, bedKeys, pendingRehome, DISQUALIFIER_TEXT } from "./assign";

function world() {
  return newWorld({ name: "Test", form: "blob", spot: "hilltop", seed: 42 });
}

/** Build a sealed room with a door and a bed inside, far from the authored town.
 *  Returns the bed's cell. The shell is 5x5, interior 3x3, which is the smallest
 *  thing that fits a 1x2 bed and still has somewhere to stand beside it. */
function house(
  w: ReturnType<typeof world>,
  ox: number,
  oy: number,
  opts: { door?: boolean; bed?: boolean } = {},
) {
  const { door = true, bed = true } = opts;
  add(w.inventory, "wood", 400);
  for (let y = oy; y <= oy + 4; y++) for (let x = ox; x <= ox + 4; x++) setTile(w, x, y, GRASS);

  for (let y = oy; y <= oy + 4; y++) {
    for (let x = ox; x <= ox + 4; x++) {
      if (x !== ox && x !== ox + 4 && y !== oy && y !== oy + 4) continue;
      // The doorway goes in the middle of the SOUTH wall, which is the only side
      // that draws a face (ROADMAP §"A door needs a south wall and a doorstep").
      const isDoorCell = x === ox + 2 && y === oy + 4;
      if (isDoorCell && !door) continue; // leave a hole: not enclosed at all
      buildAt(w, isDoorCell && door ? "door" : "wall", x, y, Date.now());
    }
  }
  if (bed) buildAt(w, "bed", ox + 1, oy + 1, Date.now(), "s");
  return { x: ox + 1, y: oy + 1 };
}

describe("qualifying a room as somewhere to live", () => {
  it("accepts an enclosed room with a door and a bed", () => {
    const w = world();
    const bed = house(w, 40, 40);
    const v = qualify(w, bed.x, bed.y);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.room.interior.size).toBe(9);
  });

  it("says which thing is missing, rather than just no", () => {
    const w = world();

    // Pointed at nothing.
    expect(qualify(w, 200, 200)).toEqual({ ok: false, why: "no-bed" });

    // A bed standing out in the open.
    add(w.inventory, "wood", 400);
    setTile(w, 50, 50, GRASS);
    setTile(w, 50, 51, GRASS);
    buildAt(w, "bed", 50, 50, Date.now(), "s");
    expect(qualify(w, 50, 50)).toEqual({ ok: false, why: "no-room" });

    // Walls that meet, but sealed — nobody can get in.
    const sealed = house(w, 60, 60, { door: false });
    expect(qualify(w, sealed.x, sealed.y)).toEqual({ ok: false, why: "no-room" });
  });

  it("calls a sealed shell no-door when the walls actually close", () => {
    const w = world();
    // house() with door:false leaves a GAP, which reads as outdoors. To get a
    // genuinely sealed room we build the full ring, then paint over the door.
    const bed = house(w, 70, 70);
    buildAt(w, "wall", 72, 74, Date.now()); // wall over the doorway
    expect(qualify(w, bed.x, bed.y)).toEqual({ ok: false, why: "no-door" });
  });

  it("has a sentence for every way it can fail", () => {
    for (const why of ["no-bed", "no-room", "no-door"] as const) {
      expect(DISQUALIFIER_TEXT[why]).toBeTruthy();
    }
  });

  it("reports the current occupant instead of refusing", () => {
    const w = world();
    const bed = house(w, 40, 50);
    assign(w, "resident1", bed.x, bed.y);

    // Someone sleeping here is a fact the caller should be able to present, not
    // a wall the caller runs into.
    const v = qualify(w, bed.x, bed.y);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.occupant).toBe("resident1");
  });

  it("takes a tap on any part of the bed, not just its anchor", () => {
    const w = world();
    const bed = house(w, 40, 60);
    // A bed is 1x2, so its far cell is a tile down. Both must answer the same.
    expect(qualify(w, bed.x, bed.y).ok).toBe(true);
    expect(qualify(w, bed.x, bed.y + 1).ok).toBe(true);
  });
});

describe("assigning someone a home", () => {
  it("moves them in, and their home stop follows", () => {
    const w = world();
    const bed = house(w, 40, 70);
    const before = claimedBed(w, w.villagers.find((v) => v.id === "resident1")!);

    expect(assign(w, "resident1", bed.x, bed.y).ok).toBe(true);
    const v = w.villagers.find((x) => x.id === "resident1")!;
    expect(v.homeBed).toBe(tileKey(bed.x, bed.y));
    expect(claimedBed(w, v)).toEqual(bed);
    expect(claimedBed(w, v)).not.toEqual(before); // they actually moved

    // The whole point: "home" resolves against the new room, with nothing else
    // written down. Standing beside the bed, inside the walls.
    const stand = homeStand(w, v)!;
    expect(stand).not.toBeNull();
    const stop = stopTarget(w, v, new Date("2026-07-25T02:00:00").getTime());
    expect({ x: stop.x, y: stop.y }).toEqual(stand);
  });

  it("refuses a room that isn't one, and changes nothing", () => {
    const w = world();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const before = v.homeBed;

    add(w.inventory, "wood", 400);
    setTile(w, 90, 90, GRASS);
    setTile(w, 90, 91, GRASS);
    buildAt(w, "bed", 90, 90, Date.now(), "s");

    expect(assign(w, "resident1", 90, 90)).toEqual({ ok: false, why: "no-room" });
    expect(v.homeBed).toBe(before);
  });

  it("evicts the previous occupant rather than letting two claim one bed", () => {
    const w = world();
    const bed = house(w, 40, 80);
    assign(w, "resident1", bed.x, bed.y);
    assign(w, "office", bed.x, bed.y);

    const resident = w.villagers.find((x) => x.id === "resident1")!;
    const office = w.villagers.find((x) => x.id === "office")!;
    expect(office.homeBed).toBe(tileKey(bed.x, bed.y));
    // Two claims on one anchor would be one fact written twice, decided by
    // iteration order somewhere far from here.
    expect(resident.homeBed).toBeNull();
    expect(claimedBed(w, resident)).toBeNull();
  });

  it("lists the town's beds with a verdict on each", () => {
    const w = world();
    house(w, 40, 90); // a good one
    add(w.inventory, "wood", 400);
    setTile(w, 95, 95, GRASS);
    setTile(w, 95, 96, GRASS);
    buildAt(w, "bed", 95, 95, Date.now(), "s"); // one in a field

    const all = beds(w);
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((b) => b.verdict.ok)).toBe(true);
    expect(all.some((b) => !b.verdict.ok && b.verdict.why === "no-room")).toBe(true);
  });
});

describe("sliding a bed across the room", () => {
  // Moving a bed is TWO strokes with a palette tap between them — erase and bed
  // are different tools, so it cannot be one gesture. `move` does it the way the
  // real UI does; anything that skips a stroke boundary isn't testing the thing.
  function move(w: ReturnType<typeof world>, from: { x: number; y: number }, to: { x: number; y: number }) {
    const s1 = bedKeys(w);
    buildAt(w, "erase", from.x, from.y, Date.now());
    rehomeAcrossStroke(w, s1);

    const s2 = bedKeys(w);
    buildAt(w, "bed", to.x, to.y, Date.now(), "s");
    rehomeAcrossStroke(w, s2);
  }

  it("keeps the claim across the two strokes a move actually takes", () => {
    const w = world();
    const bed = house(w, 50, 40);
    assign(w, "resident1", bed.x, bed.y);
    const v = w.villagers.find((x) => x.id === "resident1")!;

    move(w, bed, { x: bed.x + 1, y: bed.y });

    expect(v.homeBed).toBe(tileKey(bed.x + 1, bed.y));
    expect(claimedBed(w, v)).toEqual({ x: bed.x + 1, y: bed.y });
  });

  it("waits between the strokes rather than rehousing on the spot", () => {
    const w = world();
    const bed = house(w, 50, 45);
    assign(w, "resident1", bed.x, bed.y);
    const v = w.villagers.find((x) => x.id === "resident1")!;

    const s1 = bedKeys(w);
    buildAt(w, "erase", bed.x, bed.y, Date.now());
    rehomeAcrossStroke(w, s1);

    // Between the two halves they genuinely have nowhere — the claim is not
    // quietly held open, it's null, and the world says so.
    expect(claimedBed(w, v)).toBeNull();
    expect(pendingRehome(w)).toBe("resident1");
  });

  it("lets a deliberate offer beat the inference", () => {
    const w = world();
    const a = house(w, 50, 55);
    const b = house(w, 60, 55);
    assign(w, "resident1", a.x, a.y);
    const v = w.villagers.find((x) => x.id === "resident1")!;

    const s1 = bedKeys(w);
    buildAt(w, "erase", a.x, a.y, Date.now());
    rehomeAcrossStroke(w, s1);

    // The player talks to them and gives them the other house instead.
    assign(w, "resident1", b.x, b.y);

    // Now they put a bed back in the first house. It must NOT drag them back.
    const s2 = bedKeys(w);
    buildAt(w, "bed", a.x, a.y, Date.now(), "s");
    rehomeAcrossStroke(w, s2);

    expect(claimedBed(w, v)).toEqual(b);
  });

  it("leaves them honestly homeless when the bed just goes away", () => {
    const w = world();
    const bed = house(w, 50, 50);
    assign(w, "resident1", bed.x, bed.y);
    const v = w.villagers.find((x) => x.id === "resident1")!;

    const before = bedKeys(w);
    buildAt(w, "erase", bed.x, bed.y, Date.now());
    rehomeAcrossStroke(w, before);

    // Nothing was put back, so there's nothing to inherit. Demolishing someone's
    // bed is allowed to mean what it looks like.
    expect(claimedBed(w, v)).toBeNull();
  });

  it("forgets the waiting claim when the world is reloaded", () => {
    const w = world();
    const bed = house(w, 50, 95);
    assign(w, "resident1", bed.x, bed.y);

    const before = bedKeys(w);
    buildAt(w, "erase", bed.x, bed.y, Date.now());
    rehomeAcrossStroke(w, before);
    expect(pendingRehome(w)).toBe("resident1");

    // Keyed by the world object, like the undo buffer — a fresh world (a load,
    // a new town) has nobody waiting, with no call needed to make it so.
    expect(pendingRehome(world())).toBeNull();
  });

  it("doesn't guess when a stroke scatters several beds", () => {
    const w = world();
    const bed = house(w, 50, 60);
    assign(w, "resident1", bed.x, bed.y);
    const v = w.villagers.find((x) => x.id === "resident1")!;

    const before = bedKeys(w);
    buildAt(w, "erase", bed.x, bed.y, Date.now());
    buildAt(w, "bed", bed.x + 1, bed.y, Date.now(), "s");
    buildAt(w, "bed", bed.x + 2, bed.y, Date.now(), "s");
    rehomeAcrossStroke(w, before);

    // Two new beds is not a person moving house. Guessing which was meant would
    // be worse than the honest fallback.
    expect(claimedBed(w, v)).toBeNull();
  });

  it("doesn't guess when a stroke orphans two people at once", () => {
    const w = world();
    const a = house(w, 50, 70);
    const b = house(w, 60, 70);
    assign(w, "resident1", a.x, a.y);
    assign(w, "office", b.x, b.y);

    const before = bedKeys(w);
    buildAt(w, "erase", a.x, a.y, Date.now());
    buildAt(w, "erase", b.x, b.y, Date.now());
    buildAt(w, "bed", b.x + 1, b.y, Date.now(), "s");
    rehomeAcrossStroke(w, before);

    // Two orphans, one new bed — no transfer. One bed, one person, or nothing.
    expect(claimedBed(w, w.villagers.find((x) => x.id === "resident1")!)).toBeNull();
    expect(claimedBed(w, w.villagers.find((x) => x.id === "office")!)).toBeNull();
  });

  it("doesn't hand over a bed another claim is already pointed at", () => {
    const w = world();
    const a = house(w, 50, 80);
    const b = house(w, 60, 80);
    assign(w, "resident1", a.x, a.y);
    assign(w, "office", b.x, b.y);
    const officeKey = tileKey(b.x, b.y);

    // An earlier stroke takes the office's bed away. Their claim goes stale but
    // is deliberately not tidied up (sim/housing.ts).
    buildAt(w, "erase", b.x, b.y, Date.now());
    expect(w.villagers.find((x) => x.id === "office")!.homeBed).toBe(officeKey);

    // Now a LATER stroke moves resident1's bed onto that exact anchor.
    const before = bedKeys(w);
    buildAt(w, "erase", a.x, a.y, Date.now());
    buildAt(w, "bed", b.x, b.y, Date.now(), "s");
    rehomeAcrossStroke(w, before);

    // The office's stale claim just became live again, so resident1 must not be
    // moved into it — a drag shouldn't quietly put two people in one bed.
    expect(w.villagers.find((x) => x.id === "resident1")!.homeBed).toBe(tileKey(a.x, a.y));
    expect(claimedBed(w, w.villagers.find((x) => x.id === "office")!)).toEqual(b);
  });
});
