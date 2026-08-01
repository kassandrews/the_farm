// Every piece turned all four ways, one piece per ROW: s, e, n, w.
//
// shot-showroom.mjs answers "does the set hang together" — one facing, every
// piece. This answers the other question: does a piece survive being turned.
// Rows rather than sheets, because the thing being looked for (a north view
// that is silently the front view again, a mirrored east with the drawer pulls
// on the wrong side) is only visible with the four views side by side.
//
// Stands back two zoom steps. At the default view a tile is 80 css px and only
// twelve rows of tiles fit, which is not enough for four columns and five rows;
// `the-farm-zoom` is a plain localStorage key, so the harness can just set it.
//
//   node scripts/shot-rotations.mjs --out /tmp/shots
import { drive } from "./drive.mjs";

const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 ? process.argv[outFlag + 1] : "/tmp/shots";

// id, finish. Same defaults as the showroom: wood in pale pine, soft goods
// undyed, so this is the piece a player meets first.
const PIECES = [
  ["chair", "pine"], ["stool", "pine"], ["bench", "pine"], ["sofa", "undyed"], ["cushion", "undyed"],
  ["table", "pine"], ["coffeetable", "pine"], ["desk", "pine"], ["nightstand", "pine"], ["bed", "pine"],
  ["cot", "undyed"], ["shelf", "pine"], ["wardrobe", "pine"], ["dresser", "pine"], ["chest", "pine"],
  ["rug", "madder"], ["lamp", "pine"], ["desklamp", "pine"], ["noticeboard", "pine"], ["stage", "pine"],
];

const FACINGS = ["s", "e", "n", "w"];
const PER_SHOT = 4;
// Tile offsets FROM THE PLAYER, who is where the camera centres — so these are
// the same numbers the clip rectangle uses. Anchoring the grid anywhere else
// and the clip on the player is how the first version of this framed six tiles
// of empty floor.
// Entirely to the LEFT of the player, so the sprite standing at the centre of
// the frame is not parked in the middle of row three.
const COL = [-12, -9, -6, -3]; // one column per facing
// FOUR tiles apart, not three. A two-tile piece (bed, cot) reaches one tile
// past the gap, and a wardrobe's art starts 1.6 tiles above its anchor, so at
// three the per-piece crops caught the legs of the row above.
const ROW = [-6, -2, 2, 6];

for (let page = 0; page * PER_SHOT < PIECES.length; page++) {
  const batch = PIECES.slice(page * PER_SHOT, (page + 1) * PER_SHOT);
  const d = await drive({
    url: "http://localhost:5173/",
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    seed: { clear: true, wood: 500 },
  });
  await d.reseed(
    ({ batch, facings, col, row, playerCol }) => {
      localStorage.setItem("the-farm-zoom", "2");
      const raw = localStorage.getItem("the-farm-save");
      if (!raw) return;
      const w = JSON.parse(raw);
      const ox = w.player.x;
      const oy = w.player.y;
      // A floor under the whole sheet, and NOTHING else on it. The player
      // starts in the middle of town: its walls cut across the left columns and
      // its beds and tables read as extra rows, so the region is emptied of
      // build, furniture and crops before anything is placed.
      for (let x = ox - 18; x <= ox + 6; x++)
        for (let y = oy - 12; y <= oy + 12; y++) {
          const k = `${x},${y}`;
          w.overrides[k] = 2;
          delete w.furniture[k];
          delete w.build[k];
          delete w.crops[k];
        }
      // The player ends up at (ox, oy); every offset below is measured from
      // there, which is where the camera will centre.
      batch.forEach(([id, finish], r) => {
        facings.forEach((facing, c) => {
          w.furniture[`${ox + col[c] + playerCol},${oy + row[r]}`] = { id, facing, finish };
        });
      });
      w.player.target = null;
      localStorage.setItem("the-farm-save", JSON.stringify(w));
    },
    { batch, facings: FACINGS, col: COL, row: ROW, playerCol: 0 },
  );
  await d.page.waitForTimeout(900);
  const sv = await d.liveSave();
  const placed = new Set(Object.values(sv.furniture).map((f) => f.id));
  console.log(`page ${page}: ${[...placed].sort().join(" ")}`);
  // Clip to the sheet. The HUD sits over the world at every corner, and a
  // contact sheet with a BUILD button in it is a screenshot of the game rather
  // than of the art.
  // Re-measured, NOT `d.tilePx`: that was read before the reseed, and the
  // reseed is what set the zoom. Using the stale one clips the wrong rectangle.
  const geom = await d.page.evaluate(() => {
    const c = document.getElementById("scene");
    const r = c.getBoundingClientRect();
    return { t: 16 * (r.width / c.width), cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const t = geom.t;
  // Headroom above the first row. Offsets here are from the player's tile
  // CENTRE, and a wardrobe's art starts 26px — 1.6 tiles — above its anchor
  // tile's top edge, so anything less than 2.3 takes the top off it.
  const [x0, y0] = [geom.cx + (COL[0] - 1) * t, geom.cy + (ROW[0] - 2.3) * t];
  const width = (COL[3] + 2.5 - COL[0] + 1) * t;
  await d.shot(`${out}/rot-${page}.png`, {
    x: x0,
    y: y0,
    width,
    height: (ROW[3] + 2.2 - ROW[0] + 2.3) * t,
  });
  // And each row on its own, because the sheet is only useful for comparing
  // pieces and the question this answers is per piece. Same frame every time,
  // so two rows can be stacked in a doc and still line up.
  for (let r = 0; r < batch.length; r++) {
    await d.shot(`${out}/rot-${batch[r][0]}.png`, {
      x: x0,
      y: geom.cy + (ROW[r] - 2.3) * t,
      width,
      // Tall enough for a two-tile piece (bed, cot) plus its rise, and no
      // taller: the gap between rows is what keeps neighbours out of frame.
      height: 4.5 * t,
    });
  }
  await d.browser.close();
}
