import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { migrateSave } from "./save";
import { meetMole, moleMet, mole, moleDigs, moleGroundShallow, moleLamplit } from "./mole";
import { warrenChamber, carve, tileAt, dig, sink, setTile, depthAt } from "./world";
import { GRASS, CAVE_FLOOR, ORE_VEIN } from "../content/tiles";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { MOLE_DEEP, MOLE_SHALLOW, MOLE_LIT } from "../content/dialogue";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "dog", spot: "forest", seed: 4242 });
}

/** Put the player in his front room. There is no other way to meet him, which
 *  is the point of every test in the first block. */
function standInChamber(w: ReturnType<typeof freshWorld>) {
  const c = warrenChamber(w.seed);
  w.player.layer = "under";
  w.player.x = c.x;
  w.player.y = c.y;
  return c;
}

describe("meeting the Mole", () => {
  it("is not in a new town, and no migration puts him there", () => {
    // A secret a migration hands you is not a secret, it is a fixture you have
    // not visited. `ensureFixedCast` appends missing INSTITUTIONS on purpose;
    // he is deliberately outside that mechanism (and outside CAST entirely).
    const w = freshWorld();
    expect(moleMet(w)).toBe(false);

    const old = JSON.parse(JSON.stringify({ ...w, schemaVersion: 16 }));
    const migrated = migrateSave(old);
    expect(migrated).not.toBeNull();
    expect(migrated!.villagers.some((v) => v.id === "mole")).toBe(false);
  });

  it("stays unmet while you are on the surface above him", () => {
    // Standing on the grass over his chamber is not meeting him. The layer is
    // asked first, the way every distance question in the game now is.
    const w = freshWorld();
    const c = warrenChamber(w.seed);
    w.player.x = c.x;
    w.player.y = c.y;
    meetMole(w, Date.now());
    expect(moleMet(w)).toBe(false);
  });

  it("stays unmet while you are underground somewhere else", () => {
    const w = freshWorld();
    w.player.layer = "under";
    w.player.x = 0;
    w.player.y = 0;
    meetMole(w, Date.now());
    expect(moleMet(w)).toBe(false);
  });

  it("appears exactly once, standing in his own chamber", () => {
    const w = freshWorld();
    const c = standInChamber(w);
    meetMole(w, Date.now());
    expect(moleMet(w)).toBe(true);

    const m = mole(w)!;
    expect(m.layer).toBe("under");
    expect(Math.hypot(m.x - c.x, m.y - c.y)).toBeLessThanOrEqual(1);

    // Idempotent — a tick loop calls this constantly.
    meetMole(w, Date.now());
    meetMole(w, Date.now());
    expect(w.villagers.filter((v) => v.id === "mole").length).toBe(1);
  });

  it("arrives through the ordinary tick, without a toast", () => {
    // The discovery is seeing him. Nothing in the sim announces it, so this
    // asserts the wiring rather than a message.
    const w = freshWorld();
    standInChamber(w);
    tick(w, 1 / 60, Date.now());
    expect(moleMet(w)).toBe(true);
  });

  it("does not walk anywhere once met", () => {
    // He is `fixed`, which for him means he has no routine at all rather than
    // that he is protected — the same early return that keeps the Office
    // Creature at his desk.
    const w = freshWorld();
    standInChamber(w);
    tick(w, 1 / 60, Date.now());
    const m = mole(w)!;
    const before = { x: m.x, y: m.y };
    for (let i = 0; i < 120; i++) tick(w, 1 / 60, Date.now());
    expect({ x: m.x, y: m.y }).toEqual(before);
  });
});

describe("the shortcut, and that he notices", () => {
  /** Sink a shaft right on top of him. Allowed, unstopped, and the whole joke. */
  function shortcutTo(w: ReturnType<typeof freshWorld>) {
    const c = warrenChamber(w.seed);
    setTile(w, c.x, c.y, GRASS);
    dig(w, c.x, c.y, 0);
    sink(w, c.x, c.y);
  }

  it("starts deep and nothing protects it", () => {
    const w = freshWorld();
    expect(moleGroundShallow(w)).toBe(false);
    const c = warrenChamber(w.seed);
    shortcutTo(w);
    expect(depthAt(w, c.x, c.y)).toBe(0);
    expect(moleGroundShallow(w)).toBe(true);
  });

  it("does not move him", () => {
    // The two rejected answers, asserted: he does not flee outward, and his
    // ground is not frozen at the depth you found it.
    const w = freshWorld();
    standInChamber(w);
    tick(w, 1 / 60, Date.now());
    const before = { ...warrenChamber(w.seed) };
    const m = mole(w)!;
    shortcutTo(w);
    for (let i = 0; i < 60; i++) tick(w, 1 / 60, Date.now());
    expect(warrenChamber(w.seed)).toEqual(before);
    expect({ x: m.x, y: m.y }).toEqual(before);
  });

  it("changes what he says, and only that", () => {
    const w = freshWorld();
    standInChamber(w);
    tick(w, 1 / 60, Date.now());
    const m = mole(w)!;

    expect(MOLE_DEEP).toContain(speak(w, m, makeRng(1), Date.now()).text);
    shortcutTo(w);
    expect(MOLE_SHALLOW).toContain(speak(w, m, makeRng(1), Date.now()).text);
  });

  it("notices a lamp, and the lamp wins over the ladder", () => {
    // The newer intrusion has to be the one he answers: hanging a light outside
    // a hermit's chamber and getting the same seven lines about the shaft would
    // read as the lamp being inert (content/dialogue.ts §MOLE_LIT).
    const w = freshWorld();
    const c = standInChamber(w);
    tick(w, 1 / 60, Date.now());
    const m = mole(w)!;
    shortcutTo(w);
    expect(MOLE_SHALLOW).toContain(speak(w, m, makeRng(1), Date.now()).text);

    w.underFurniture[`${c.x + 2},${c.y}`] = { id: "lamp", facing: "s", finish: "pine", set: "core" };
    expect(moleLamplit(w)).toBe(true);
    expect(MOLE_LIT).toContain(speak(w, m, makeRng(1), Date.now()).text);
  });

  it("cannot see a lamp on the other side of the rock", () => {
    // Generous radius, but not the whole world: a light in your own home tunnel
    // is not a light in his corridor.
    const w = freshWorld();
    const c = standInChamber(w);
    w.underFurniture[`${c.x + 40},${c.y}`] = { id: "lamp", facing: "s", finish: "pine", set: "core" };
    expect(moleLamplit(w)).toBe(false);
  });

  it("never reaches for anybody else's lines", () => {
    // He has no house, no ring and no memories of a town he does not live in,
    // so the whole of speak()'s resident machinery has to be skipped for him.
    const w = freshWorld();
    standInChamber(w);
    tick(w, 1 / 60, Date.now());
    const m = mole(w)!;
    for (let i = 0; i < 60; i++) {
      const said = speak(w, m, makeRng(i), Date.now()).text;
      expect([...MOLE_DEEP, ...MOLE_SHALLOW, ...MOLE_LIT]).toContain(said);
    }
  });
});

describe("what he does while you're out", () => {
  /** A shaft at the origin and a short tunnel running east from it, which is
   *  the state "you were digging that way" reduces to. */
  function tunnelled() {
    const w = freshWorld();
    setTile(w, 0, 0, GRASS);
    dig(w, 0, 0, 0);
    sink(w, 0, 0);
    for (let x = 1; x <= 6; x++) carve(w, x, 0);
    return w;
  }

  it("continues the tunnel you were digging, outward", () => {
    const w = tunnelled();
    const cut = moleDigs(w);
    expect(cut).toBeGreaterThan(0);
    expect(tileAt(w, 7, 0, "under")).toBe(CAVE_FLOOR);
    // And in the direction the tunnel was going, not back toward the ladder.
    // (-1,0) is the shaft's own landing, so the first cell that can tell the
    // difference is the one past it.
    expect(tileAt(w, -2, 0, "under")).not.toBe(CAVE_FLOOR);
  });

  it("only ever opens rock — it can't destroy anything", () => {
    // The away sim's first house rule (away.ts). Carving turns rock into floor
    // and nothing else, so this holds by construction; it is asserted because
    // "by construction" is exactly what a later refactor breaks.
    const w = tunnelled();
    const before = { ...w.under };
    moleDigs(w);
    for (const [key, id] of Object.entries(before)) {
      expect(w.under[key]).toBe(id);
    }
  });

  it("leaves the ore where it is", () => {
    // He walks past a vein rather than cutting it away: `carve` refuses ore, so
    // his dig stops at the face and the metal is still yours to mine.
    const w = tunnelled();
    // Put a vein directly in his path by finding one and tunnelling at it.
    let vein: { x: number; y: number } | null = null;
    for (let x = 1; x < 40 && !vein; x++) {
      if (tileAt(w, x, 0, "under") === ORE_VEIN) vein = { x, y: 0 };
    }
    if (!vein) return; // this seed's east line has no vein; nothing to assert
    for (let x = 1; x < vein.x; x++) carve(w, x, 0);
    moleDigs(w);
    expect(tileAt(w, vein.x, 0, "under")).toBe(ORE_VEIN);
  });

  it("does nothing at all in a town with no tunnel", () => {
    const w = freshWorld();
    expect(moleDigs(w)).toBe(0);
  });
});
