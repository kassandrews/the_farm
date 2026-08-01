// A furnished room, which is the whole point of the pass: not a catalogue of
// pieces but a place that reads as somewhere somebody lives.
import { drive } from "/Users/kandrews/projects/the_farm/scripts/drive.mjs";

const out = "/private/tmp/claude-501/-Users-kandrews-projects-the-farm/e06903fd-c05f-4aac-911f-a2f965646926/scratchpad";

const d = await drive({
  url: "http://localhost:5173/",
  viewport: { width: 1250, height: 820 },
  seed: { clear: true, wood: 500 },
});
await d.reseed(() => {
  const raw = localStorage.getItem("the-farm-save");
  if (!raw) return;
  const w = JSON.parse(raw);
  const ox = w.player.x;
  const oy = w.player.y;
  const B = (x, y, id, finish) => (w.build[`${x},${y}`] = { id, finish });
  const F = (x, y, id, finish, facing = "s") =>
    (w.furniture[`${x},${y}`] = { id, facing, finish });

  const x0 = ox - 5, x1 = ox + 4, y0 = oy - 7, y1 = oy + 1;
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      w.overrides[`${x},${y}`] = 2;
      w.finishes[`${x},${y}`] = "walnut";
      if (x === x0 || x === x1 || y === y0 || y === y1) B(x, y, "wall", "whitewash");
    }
  B(x0 + 2, y1, "door", "walnut");
  for (const x of [x0 + 5, x0 + 6, x0 + 7]) B(x, y1, "window", "walnut");

  // A sitting end: rug, sofa facing the coffee table, a lamp in the corner.
  F(x0 + 2, y0 + 5, "rug", "madder");
  F(x0 + 2, y0 + 3, "sofa", "undyed");
  F(x0 + 2, y0 + 6, "coffeetable", "walnut");
  F(x0 + 1, y0 + 7, "lamp", "walnut");
  F(x0 + 5, y0 + 6, "chair", "walnut", "n");
  F(x0 + 7, y0 + 6, "stool", "walnut");

  // A working end.
  F(x0 + 6, y0 + 3, "desk", "walnut");
  F(x0 + 6, y0 + 2, "desklamp", "walnut");
  F(x0 + 8, y0 + 4, "shelf", "walnut");

  // Sleeping, along the north wall.
  F(x0 + 1, y0 + 1, "bed", "walnut");
  F(x0 + 2, y0 + 1, "nightstand", "walnut");
  F(x0 + 4, y0 + 1, "wardrobe", "walnut");
  F(x0 + 6, y0 + 1, "dresser", "walnut");
  F(x0 + 8, y0 + 1, "chest", "walnut");

  // Pictures on the south wall, either side of the windows.
  F(x0 + 1, y1, "painting", "walnut");
  F(x0 + 4, y1, "painting", "pine");

  // Inside, so the roof lifts.
  w.player.x = x0 + 4;
  w.player.y = y0 + 5;
  w.player.target = null;
  localStorage.setItem("the-farm-save", JSON.stringify(w));
});
await d.page.waitForTimeout(1400);
await d.shot(`${out}/room.png`);
await d.browser.close();
console.log("wrote room");
