// Where you are, in the Bureau's own numbers.
//
// The meadow was SURVEYED — of course it was; somebody had to establish that
// the retirement village exists before anybody could be sent to it — and the
// datum they drove their first peg into is the town plaza. That is why the
// reading is zero there and why it is zero nowhere else, and it is the whole
// justification for numbers being on screen at all in a game this soft. You are
// not reading a debug overlay. You are reading a plot reference off a grid an
// institution imposed on a field, which is the most on-tone thing a HUD here
// could possibly do.
//
// IT EARNS ITS CHIP, which is a bar the season label failed (see the note beside
// the clock in ui/app.ts): a label naming something you can already see turns
// noticing into reading. The hour earns its place because you act on the hour.
// This earns its place for the same reason — walking home is an act, and the
// reading is what you steer by. The season was weather, and weather needs no
// caption.
//
// The sign convention is the screen's, because the player's is: +x is east, +y
// is SOUTH — down the screen is down the map. Getting that backwards would make
// the whole readout an elaborate way to walk the wrong direction.

/** Which way from the datum, per axis. Zero has no direction, so it prints
 *  bare — "E 0" would be a claim about a place that is neither east nor west of
 *  itself. */
function leg(v: number, pos: string, neg: string): string {
  if (v === 0) return "0";
  return `${v > 0 ? pos : neg} ${Math.abs(v)}`;
}

/** The HUD's grid reference for a tile — "E 42 · S 118", and "0 · 0" on the
 *  datum itself.
 *
 *  Takes a tile rather than the player's float position: a reference that
 *  flickers between two numbers while you stand still reads as broken, and the
 *  player is a point moving continuously across cells. Round before you get
 *  here. */
export function surveyLabel(x: number, y: number): string {
  return `${leg(x, "E", "W")} · ${leg(y, "S", "N")}`;
}
