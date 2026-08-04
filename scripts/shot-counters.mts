// Photograph every institution counter panel, and assert the face rule.
//
//   npx tsx scripts/shot-counters.mts [outdir]     # needs `npm run dev` running
//
// 8e's method note is why this asserts as well as photographs: the first survey
// of these panels was run by a subagent that reported all seven clean, returned
// five byte-identical files, and was wrong about the first panel anybody
// checked by hand. So the rule is checked by the script itself — every counter
// with a person behind it must draw that person's portrait beside its heading,
// and the errands board must NOT: it is the control (§8e — its prose is
// notices, not speech, and a face on it means the rule has been misread).
//
// Each person is found at their own scheduled stop at the harness's pinned
// hour, and the panel is opened by tapping them — the real path, not injected
// markup. The tap retries because a counter-keeper mid-fidget can take a
// moment to resolve.

import { drive, HARNESS_TIME } from "./drive.mjs";
import { CAST, scheduledStop } from "../src/content/cast.ts";

const OUT = process.argv[2] ?? ".";
const COUNTERS = ["shop", "heap", "museum", "seedstall", "stage", "errands"] as const;
const t = new Date(HARNESS_TIME).getTime();

const d = await drive();
let failed = 0;

for (const id of COUNTERS) {
  const stop = scheduledStop(CAST[id], t);
  await d.reseed(
    (s: { x: number; y: number }) => {
      const raw = localStorage.getItem("the-farm-save");
      if (!raw) return;
      const w = JSON.parse(raw);
      w.player.x = s.x;
      w.player.y = s.y + 1;
      w.player.target = null;
      localStorage.setItem("the-farm-save", JSON.stringify(w));
    },
    { x: stop.x, y: stop.y },
  );

  const panel = d.page.locator(".panel");
  for (let attempt = 0; attempt < 4; attempt++) {
    await d.page.mouse.click(...d.at(0, -1));
    await d.page.waitForTimeout(1000);
    if ((await panel.count()) > 0) break;
  }
  if ((await panel.count()) === 0) {
    console.log(`FAIL ${id}: panel never opened (stop ${stop.x},${stop.y} — ${stop.doing})`);
    failed++;
    continue;
  }

  await panel.screenshot({ path: `${OUT}/counter-${id}.png` });
  const hasFace = (await d.page.locator(".panel .portrait.counter").count()) > 0;
  const wantFace = id !== "errands";
  if (hasFace !== wantFace) {
    console.log(`FAIL ${id}: face ${hasFace ? "present" : "missing"}, rule says ${wantFace ? "present" : "absent"}`);
    failed++;
  } else {
    console.log(`ok   ${id}: ${wantFace ? "face beside the heading" : "faceless, as the control"}`);
  }
  await d.page.keyboard.press("Escape");
  await d.page.waitForTimeout(300);
}

await d.browser.close();
if (failed) process.exit(1);
