// Drive a commission to its discharge card, and photograph the card.
//
//   npx tsx scripts/shot-discharge.mts [outdir]     # needs `npm run dev` running
//
// WHY THIS IS IN THE REPO. §10i's record says it plainly: "Not verified on
// screen: the hall's discharge card. Reaching it for real means a built house, a
// stamped Form 9 and an assigned bed, which is a driving sequence nobody has
// scripted." `handed()` is verified in the stall and `.quote` inside a card; the
// discharge card is the one place the two stack, and an attempt to check it by
// injecting markup was inconclusive because the harness was the thing being
// tested. This drives the real sequence — a commissioned newcomer, a qualifying
// house, a bed assigned through the real UI — so the card that appears is the
// card a player gets, CSS and all.
//
// It also asserts, not just photographs: the modal must contain "Form 9,
// discharged", the resident's `.quote` must carry its left rule, and the
// `handed()` card (Archibald is ARRIVALS[0] and unlocks whitewash) must carry
// its accent rule. Those are the exact rules §10i found missing the first time.
//
// THE GOTCHAS PARTICULAR TO THIS SCRIPT:
//
//   • The house, the commission and Archibald are INJECTED via reseed — building
//     a house tap by tap would test the build tools, not the discharge. The bed
//     assignment is the one step driven through the real UI, because it is the
//     step that fires `settleCommission`.
//   • A NEWCOMER KEEPS A SCHEDULE. The first draft stood him by his tent and he
//     walked off mid-script: a homeless newcomer's stop comes from
//     NEWCOMER_RINGS, not from the tent. So the scene is built around the stop
//     the game will send him to — computed with the game's own `scheduledStop`
//     at the harness's pinned clock — and everything (player, house, bed) is
//     laid out relative to THAT.
//   • The villager is cloned from a resident so the schema always matches the
//     save's, whatever version it is — with `fixed` forced false, or the tick
//     derives phantom authored stops for an id the CAST has never heard of.
//   • The interior is floored with overrides so no generated tree stands in
//     the room.

import { drive, HARNESS_TIME } from "./drive.mjs";
import { charDef, scheduledStop } from "../src/content/cast.ts";

const OUT = process.argv[2] ?? ".";
const d = await drive({ seed: { wood: 500 } });

// Where the game will want Archibald at the harness's pinned hour.
const stop = scheduledStop(
  charDef({ id: "newcomer:0", name: "Archibald", form: "menace", fixed: false }),
  new Date(HARNESS_TIME).getTime(),
);
console.log(`Archibald's stop at harness time: ${stop.x},${stop.y} (${stop.doing})`);

await d.reseed(
  (s: { x: number; y: number }) => {
    const raw = localStorage.getItem("the-farm-save");
    if (!raw) return;
    const w = JSON.parse(raw);

    // The player stands one tile south of the stop, inside the talk radius.
    w.player.x = s.x;
    w.player.y = s.y + 1;
    w.player.target = null;

    // A qualifying house south-west of the pair: 5×5 outer, 3×3 interior
    // (≥ MIN_INTERIOR 4), a south door, one bed. Floored so nothing generated
    // stands in the room.
    const x0 = s.x - 4, x1 = s.x, y0 = s.y + 2, y1 = s.y + 6;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        w.overrides[`${x},${y}`] = 2;
        w.finishes[`${x},${y}`] = "pine";
        if (x === x0 || x === x1 || y === y0 || y === y1) {
          w.build[`${x},${y}`] = { id: "wall", finish: "pine" };
        }
      }
    }
    w.build[`${x0 + 2},${y1}`] = { id: "door", finish: "pine" };
    w.furniture[`${x0 + 1},${y0 + 1}`] = { id: "bed", facing: "s", finish: "pine" };

    // Archibald, cloned from a resident so the villager schema always matches,
    // standing exactly at his stop so the tick has nowhere to send him.
    const arch = JSON.parse(JSON.stringify(w.villagers[0]));
    arch.id = "newcomer:0";
    arch.name = "Archibald";
    arch.form = "menace";
    arch.fixed = false;
    arch.x = s.x;
    arch.y = s.y;
    arch.homeBed = null;
    w.villagers.push(arch);

    // His commission, filed and waiting on the house.
    const now = Date.now();
    w.commissions = w.commissions ?? [];
    w.commissions.push({
      id: "newcomer:0",
      index: 0,
      arrivedAt: now - 3600e3,
      tent: { x: s.x + 2, y: s.y },
      filedAt: now - 3500e3,
      stampedAt: null,
    });

    localStorage.setItem("the-farm-save", JSON.stringify(w));
  },
  { x: stop.x, y: stop.y },
);

// Talk to Archibald (one tile north), take the offer, tap the bed. The bed sits
// at (stop.x - 3, stop.y + 3), which from the player is (-3, +2).
const offer = d.page.locator("button", { hasText: "There's a room for you" });
for (let attempt = 0; attempt < 4; attempt++) {
  await d.page.mouse.click(...d.at(0, -1));
  await d.page.waitForTimeout(1200);
  if ((await offer.count()) > 0) break;
}
await offer.click();
await d.page.waitForTimeout(500);
await d.page.mouse.click(...d.at(-3, 2));
await d.page.waitForTimeout(900);

// The card, asserted rather than eyeballed — these are the rules §10i found
// missing the first time it looked.
const card = await d.page.evaluate(() => {
  const panel = document.querySelector(".panel");
  const quote = document.querySelector(".panel .quote");
  const handed = document.querySelector(".panel .handed");
  const what = document.querySelector(".panel .handed-what");
  return {
    text: panel?.textContent ?? "",
    quoteRule: quote ? getComputedStyle(quote).borderLeftWidth : null,
    handedRule: handed ? getComputedStyle(handed).borderLeftWidth : null,
    what: what?.textContent ?? null,
  };
});

const fail = (msg: string) => {
  console.error(`FAIL: ${msg} — got ${JSON.stringify(card)}`);
  process.exitCode = 1;
};
if (!card.text.includes("Form 9, discharged")) fail("no discharge text in the panel");
if (card.quoteRule !== "2px") fail("the resident's .quote has no left rule");
if (card.handedRule !== "3px") fail("the handed() card has no accent rule");
if (card.what !== "Whitewash") fail("the unlock is not named Whitewash");

await d.shot(`${OUT}/discharge.png`);
await d.browser.close();
console.log(
  process.exitCode ? "discharge card: FAILED, see above" : `discharge card verified; wrote ${OUT}/discharge.png`,
);
