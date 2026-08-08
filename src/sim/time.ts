// Real-clock day/night. The Farm runs on the actual wall clock — no in-game day
// loop (DESIGN §"Time"). This module maps a Date into a sky phase and a canvas
// tint, matching The Meadow's four-phase sky (day / dusk / night / dawn). Pure:
// takes an epoch ms in, returns phase + tint, so it's testable without a clock.

import { seasonOn } from "../content/seasons";

export type SkyPhase = "day" | "dusk" | "night" | "dawn";

/** Hour boundaries (local time). Dawn and dusk are the hour either side of the
 *  day↔night flips, and are cosmetic only — a tint pass, not a rule change. */
const DAWN_START = 5; // 05:00–07:00 sunrise
const DAY_START = 7; // 07:00–18:00 daylight
const DUSK_START = 18; // 18:00–20:00 sunset
const NIGHT_START = 20; // 20:00–05:00 night

/** How far the light runs long or short, per season, in hours.
 *
 *  THE DAY IS LONGER IN SUMMER, which is the one thing about a real year that
 *  the sky was not doing. Seasons already repaint the ground and the trees; a
 *  July evening that went dark at the same minute as a January one was the
 *  season stopping at the palette. It is symmetric about midday — dawn comes
 *  forward by exactly what dusk goes back — so noon stays noon and nothing has
 *  to know about a solstice.
 *
 *  IT IS LIGHT, AND LIGHT IS ALL IT IS (DESIGN §Seasons). No crop, price, yield
 *  or growth time may read this, and none can: it changes which of four names
 *  an hour has, and the only things downstream of that are the tint and the
 *  fireflies — appearance, both. The rule the season may never cross is that it
 *  becomes a NUMBER somebody plays around; a longer evening is scenery you
 *  cannot farm.
 *
 *  Deliberately modest. Two hours of swing either side reads as "the evenings
 *  are drawing in" without ever producing a season where you cannot see. */
const DAYLIGHT_SHIFT: Record<string, number> = {
  summer: 1.25,
  spring: 0.35,
  autumn: -0.35,
  winter: -1.25,
};

/** The four boundaries for a given moment, already shifted for the season. */
function boundsAt(now: number): { dawn: number; day: number; dusk: number; night: number } {
  const shift = DAYLIGHT_SHIFT[seasonOn(now).id] ?? 0;
  return {
    dawn: DAWN_START - shift,
    day: DAY_START - shift,
    dusk: DUSK_START + shift,
    night: NIGHT_START + shift,
  };
}

export function skyPhaseAt(now: number): SkyPhase {
  const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const b = boundsAt(now);
  if (h >= b.dawn && h < b.day) return "dawn";
  if (h >= b.day && h < b.dusk) return "day";
  if (h >= b.dusk && h < b.night) return "dusk";
  return "night";
}

/** True when the ground is in darkness. Like The Meadow, dawn still counts as
 *  night for the ground palette — only the sky knows better. */
export function isNight(phase: SkyPhase): boolean {
  return phase === "night" || phase === "dawn";
}

export interface Tint {
  /** rgba() overlay drawn over the whole scene to sell the hour. Empty string
   *  = no overlay (broad daylight). */
  overlay: string;
  /** 0..1 how dark the ground reads — the renderer dims tile colours by this. */
  darkness: number;
}

/** How the whole scene is washed at a given phase. A single low-alpha pass sells
 *  the hour cheaply (the technique The Meadow's scene uses). */
export function tintAt(now: number): Tint {
  const phase = skyPhaseAt(now);
  switch (phase) {
    case "day":
      return { overlay: "", darkness: 0 };
    case "dusk":
      return { overlay: "rgba(255,132,58,0.18)", darkness: 0.18 };
    case "night":
      return { overlay: "rgba(24,20,54,0.5)", darkness: 0.5 };
    case "dawn":
      return { overlay: "rgba(255,150,170,0.16)", darkness: 0.34 };
  }
}

/** HOW LONG A SHADOW THE SUN IS THROWING, as a fraction of a sprite's own
 *  height. 0 at night and near 0 at midday; longest with the sun on the horizon.
 *
 *  IT IS THE SAME FACT `tintAt` IS, asked the other way round. That function says
 *  how much light there is; this says where it is coming FROM, which is the half
 *  the ground can see. They share `boundsAt`, so an evening that draws in with the
 *  season draws its shadows out with it and neither can drift from the other.
 *
 *  NOT LINEAR IN THE HOUR — squared, because the shadow of a body at elevation θ
 *  runs as cot θ, which is flat across the middle of the day and then goes up
 *  fast. A linear ramp puts noticeable shadows on a two o'clock afternoon, which
 *  reads as a permanent late-day filter rather than as an hour passing. This is
 *  nothing at lunchtime, something by mid-afternoon, and long at supper.
 *
 *  ZERO AT NIGHT, WHICH IS A CHOICE AND NOT A LIMIT. Moonlight does cast a
 *  shadow — a full moon throws one you can read by — and it is refused here for
 *  the reason the fireflies are the only warm thing in the dusk: the game already
 *  spends its night budget on the wash and the lamps, and a second, fainter set
 *  of shadows underneath both is detail nobody would attribute to the moon. The
 *  CONTACT shadow stays, at every hour: that one is not cast by anything, it is
 *  the dark where a thing meets the ground, and without it every sprite floats
 *  after sunset.
 *
 *  A REGION MAY PIN THIS (§BiomeDef.rake) — the twilight country's sun never
 *  moves, so it states its own and ignores the clock, exactly as it ignores the
 *  clock for colour. */
export function rakeAt(now: number): number {
  const phase = skyPhaseAt(now);
  if (phase === "night") return 0;
  const b = boundsAt(now);
  // The sun is ON the horizon through both cosmetic hours, so both get the
  // maximum. Dawn and dusk are the same geometry pointed opposite ways, and the
  // direction is not ours to vary (see `footShadow`: one light, upper left).
  if (phase === "dusk" || phase === "dawn") return RAKE_MAX;
  const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const noon = (b.day + b.dusk) / 2;
  const half = (b.dusk - b.day) / 2 || 1;
  const t = Math.min(1, Math.abs(h - noon) / half);
  return RAKE_MAX * t * t;
}

/** The longest shadow the sun throws here, at the horizon.
 *
 *  0.55 of a sprite's height, which on a 35px tree is about twenty pixels — over
 *  a tile of shadow lying on the grass, and short enough that a stand does not
 *  become one continuous smear. A true horizon sun throws a shadow many times the
 *  height of what casts it; that is unarguable and unusable, so this is the
 *  longest one that still reads as belonging to its tree. */
const RAKE_MAX = 0.55;

/** A short "3:42 PM" style label for the HUD clock. */
export function clockLabel(now: number): string {
  return new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
