// One of every piece in a single shot, so the art can be judged as a SET rather
// than eighteen times in a row.
//
// SEEDED, not clicked. Placing through the build bar fought `safeArea` — which
// silently drops clicks near the HUD and looks exactly like a tool being broken
// — and the tabs mean a tool button is invisible until its own tab is up. The
// UI path is worth exercising once (see the tab-follows-tool bug it found), but
// it is the wrong tool for looking at art.
import { drive } from "/Users/kandrews/projects/the_farm/scripts/drive.mjs";

const out = "/private/tmp/claude-501/-Users-kandrews-projects-the-farm/e06903fd-c05f-4aac-911f-a2f965646926/scratchpad";

// id, and the finish it should wear. Wood pieces in pale pine, soft goods in
// undyed cloth — the defaults, so this is what a player sees first.
const PIECES = [
  ["chair", "pine"], ["stool", "pine"], ["bench", "pine"], ["sofa", "undyed"], ["cushion", "undyed"],
  ["table", "pine"], ["coffeetable", "pine"], ["desk", "pine"], ["nightstand", "pine"], ["bed", "pine"],
  ["cot", "undyed"], ["shelf", "pine"], ["wardrobe", "pine"], ["dresser", "pine"], ["chest", "pine"],
  ["lamp", "pine"], ["desklamp", "pine"], ["rug", "madder"],
];

const facing = process.argv.includes("--east") ? "e" : "s";

const d = await drive({
  url: "http://localhost:5173/",
  viewport: { width: 1500, height: 950 },
  seed: { clear: true, wood: 500 },
});
await d.reseed(
  ({ pieces, facing }) => {
    const raw = localStorage.getItem("the-farm-save");
    if (!raw) return;
    const w = JSON.parse(raw);
    const ox = w.player.x;
    const oy = w.player.y;
    // A floor under the whole showroom, so pieces are seen against the surface
    // they will actually stand on rather than against grass.
    for (let x = ox - 7; x <= ox + 8; x++)
      for (let y = oy - 8; y <= oy + 7; y++) w.overrides[`${x},${y}`] = 2;
    pieces.forEach(([id, finish], i) => {
      const x = ox - 5 + (i % 4) * 3;
      const y = oy - 6 + Math.floor(i / 4) * 3;
      w.furniture[`${x},${y}`] = { id, facing, finish };
    });
    // BESIDE the grid, not below it. The camera centres on the player, so
    // parking them south of everything pushed the whole showroom off the top of
    // the frame — the grid has to be within about half a screen of wherever the
    // player ends up standing.
    w.player.x = ox + 7;
    w.player.y = oy;
    w.player.target = null;
    localStorage.setItem("the-farm-save", JSON.stringify(w));
  },
  { pieces: PIECES, facing },
);

await d.page.waitForTimeout(900);
const sv = await d.liveSave();
const kinds = new Set(Object.values(sv.furniture).map((f) => f.id));
console.log(`${kinds.size} kinds on screen (${facing}):`, [...kinds].sort().join(" "));
await d.shot(`${out}/showroom-${facing}.png`);
await d.browser.close();
