// Counters as objects: found by standing next to them, resolved to one piece
// however wide they are, and gone when the furniture is.

import { describe, it, expect } from "vitest";
import { newWorld, actionTarget, contextAction } from "./game";
import { counterAt, counterNear } from "./counters";
import { COUNTERS } from "../content/counters";
import type { CounterId } from "../content/counters";
import { TOWN_BUILDINGS, TOWN_FIXTURES } from "../content/town";
import { CAST } from "../content/cast";
import { furnitureDef } from "../content/furniture";
import { removeFurnitureAt } from "./furniture";

function freshWorld() {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 12 });
}

/** Every authored counter, as (id, anchor). The tests walk this rather than a
 *  hand-written list, so a seventh counter is covered the day it is added. */
function authored(): { id: CounterId; x: number; y: number }[] {
  const out: { id: CounterId; x: number; y: number }[] = [];
  for (const b of Object.values(TOWN_BUILDINGS)) {
    for (const f of b.furniture) if (f.counter) out.push({ id: f.counter, x: f.x, y: f.y });
  }
  for (const f of TOWN_FIXTURES) if (f.counter) out.push({ id: f.counter, x: f.x, y: f.y });
  return out;
}

describe("the counters the town has", () => {
  it("has one anchor per counter, and one counter per anchor", () => {
    const rows = authored();
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => `${r.x},${r.y}`)).size).toBe(rows.length);
  });

  it("authors every counter the table declares", () => {
    // The failure this catches: a row in COUNTERS with nothing in the world
    // wearing it — a shop you can never walk up to, which is exactly the shape
    // of the marble bug one file over.
    expect(new Set(authored().map((r) => r.id))).toEqual(new Set(Object.keys(COUNTERS)));
  });

  it("names a keeper who exists, and stands them at it", () => {
    for (const id of Object.keys(COUNTERS) as CounterId[]) {
      const who = COUNTERS[id].who;
      expect(CAST[who as keyof typeof CAST], `${id} is kept by nobody`).toBeDefined();
    }
  });
});

describe("finding one", () => {
  it("answers from any cell a wide counter covers", () => {
    // THE TWO-BELLS TEST. Every counter but the stage is a 2x1 table and the
    // stage is 2x2, so a lookup keyed by covered cell would find a different
    // counter at each half — and the mark drawn off it would be drawn twice
    // (CLAUDE.md §per-cell edges).
    const w = freshWorld();
    for (const { id, x, y } of authored()) {
      const def = furnitureDef(TOWN_FIXTURES.find((f) => f.x === x && f.y === y)?.id ?? "table");
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const found = counterAt(w, x + dx, y + dy);
          expect(found, `${id} missing at +${dx},+${dy}`).not.toBeNull();
          expect(found!.id).toBe(id);
          // Always the ANCHOR, never the cell asked about.
          expect({ x: found!.x, y: found!.y }).toEqual({ x, y });
        }
      }
    }
  });

  it("reaches from the four tiles around it, and not diagonally", () => {
    const w = freshWorld();
    const { id, x, y } = authored()[0];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      expect(counterNear(w, x + dx, y + dy)?.id, `missed from ${dx},${dy}`).toBe(id);
    }
    // Diagonal would let you trade around the corner of a wall.
    expect(counterNear(w, x - 1, y - 1)).toBeNull();
    // And somewhere with nothing in it. Deliberately far out rather than a few
    // tiles off: the town is small and the counters are not spread thin, so the
    // first draft of this line stood six tiles east of the hall's desk and
    // landed next to the heap's.
    expect(counterNear(w, x + 200, y + 200)).toBeNull();
  });

  it("finds nothing at ordinary furniture", () => {
    // Prudence has a table and it is a table.
    const w = freshWorld();
    const plain = TOWN_BUILDINGS.margfrom_house.furniture.find((f) => f.id === "table")!;
    expect(counterAt(w, plain.x, plain.y)).toBeNull();
  });

  it("stops being a counter when the counter is gone", () => {
    // Nothing in this town is protected — you may take the shop apart around
    // her. The content table still holds the anchor; the world does not.
    const w = freshWorld();
    const shop = authored().find((r) => r.id === "shop")!;
    expect(counterAt(w, shop.x, shop.y)).not.toBeNull();
    removeFurnitureAt(w, shop.x, shop.y);
    expect(counterAt(w, shop.x, shop.y)).toBeNull();
    expect(counterNear(w, shop.x, shop.y + 1)).toBeNull();
  });
});

describe("what ACT promises at one", () => {
  it("aims at the counter you are standing beside", () => {
    const w = freshWorld();
    const { id, x, y } = authored().find((r) => r.id === "seedstall")!;
    w.player.x = x;
    w.player.y = y + 1; // directly south of the counter
    const t = actionTarget(w, "gather");
    expect(t.kind).toBe("counter");
    expect({ x: t.x, y: t.y }).toEqual({ x, y });
    expect(counterAt(w, t.x, t.y)!.id).toBe(id);
  });

  it("changes nothing in the world, and says what it is", () => {
    // A counter is a panel, like the board. The sim's whole job is to name it.
    const w = freshWorld();
    const { x, y } = authored().find((r) => r.id === "seedstall")!;
    w.player.x = x;
    w.player.y = y + 1;
    const before = JSON.stringify(w.inventory);
    const res = contextAction(w, "gather", Date.now());
    expect(res.kind).toBe("counter");
    expect(res.changed).toBe(false);
    expect(res.message).toBe(COUNTERS.seedstall.line);
    expect(JSON.stringify(w.inventory)).toBe(before);
  });

  it("beats the shovel standing on grass", () => {
    // THE BUG THIS WHOLE RUNG EXISTS FOR, found in a browser and not here.
    // `underfoot` — the held tool has work on the tile you are on — used to beat
    // both the board and the counters, and out there you are always standing on
    // grass and grass is always diggable. So walking up to the board with the
    // tool the game starts you holding and pressing ACT dug a hole and turned up
    // a hinge, and the board never opened. Same argument, same fix and now the
    // same rung as the mailbox and the door.
    const w = freshWorld();
    const board = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
    ]) {
      w.player.x = board.x + dx;
      w.player.y = board.y + dy;
      // The starting tool, on whatever the ground happens to be.
      expect(actionTarget(w, "dig").kind, `dug beside the board from ${dx},${dy}`).toBe("read");
    }

    const stage = authored().find((r) => r.id === "stage")!;
    w.player.x = stage.x;
    w.player.y = stage.y + 2; // the stage is 2x2, so this is its south side
    expect(actionTarget(w, "dig").kind).toBe("counter");
  });

  it("leaves the board alone", () => {
    // The two are separate kinds and both still work; the board got here first.
    const w = freshWorld();
    const board = TOWN_FIXTURES.find((f) => f.id === "noticeboard")!;
    w.player.x = board.x;
    w.player.y = board.y + 1;
    expect(actionTarget(w, "gather").kind).toBe("read");
  });
});
