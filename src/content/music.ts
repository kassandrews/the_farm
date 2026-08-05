// The soundtrack, as data.
//
// One engine plays every piece in this file; a piece is a ROOT, A MODE, FOUR
// SCALE DEGREES and a feel, and every chord is derived from those. Nothing here
// spells a chord out, which is why nothing here can be out of key — see
// `chordAt` in ui/audio.ts. Adding a seventh piece is a row, not a code path
// (CLAUDE.md §"Content is data").
//
// WHY DERIVED AND NOT WRITTEN OUT. The rule that makes this music sound like
// itself is that a chord is always extended — third, fifth, seventh, ninth,
// with the root left to the bass. Written as note tables, that rule is a style
// note somebody has to remember. Derived from the mode, a plain triad is
// UNREACHABLE. The house rule is enforced by the only thing the generator can
// emit.
//
// TWO AXES, AND THEY ARE INDEPENDENT.
//   • WHICH piece plays is chosen at the start of a phase and never changes
//     mid-phrase — day pieces by day, night pieces after dark (`at`).
//   • HOW MUCH of it you hear is where you are standing: the layer table below
//     turns "how far from town" into a gain per part. Walking to the woods does
//     not change the song, it takes the drums off it.
//
// NOTHING IN HERE IS A CUE. Cues are events (you did a thing, it made a noise).
// This is the second sustained sound in the game after the hum, and like the
// hum it is a PLACE making a noise whether or not you do anything.

/** The modes a piece can be built from. Seven steps each; the generator reads
 *  degrees off this and never asks what the notes are called. */
export const MODES = {
  ionian: { steps: [0, 2, 4, 5, 7, 9, 11], label: "major" },
  aeolian: { steps: [0, 2, 3, 5, 7, 8, 10], label: "minor" },
  dorian: { steps: [0, 2, 3, 5, 7, 9, 10], label: "dorian" },
  mixolydian: { steps: [0, 2, 4, 5, 7, 9, 10], label: "mixolydian" },
  lydian: { steps: [0, 2, 4, 6, 7, 9, 11], label: "lydian" },
} satisfies Record<string, { steps: number[]; label: string }>;

export type ModeId = keyof typeof MODES;

/** Drum patterns, as step indices in a sixteen-step bar.
 *
 *  `hush` is the night default and is barely a pattern — one kick a bar and a
 *  hat on the half. A night piece with a backbeat would be a different game
 *  playing in the same town. */
export interface PatternDef {
  kick: number[];
  snare: number[];
  hat: number[];
}

export type PatternId = "steady" | "sparse" | "busy" | "laid" | "hush";

export const PATTERNS: Record<PatternId, PatternDef> = {
  steady: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14] },
  sparse: { kick: [0, 10], snare: [12], hat: [0, 4, 8, 12, 14] },
  busy: { kick: [0, 3, 6, 10, 11], snare: [4, 12], hat: [0, 2, 4, 6, 7, 8, 10, 12, 14, 15] },
  laid: { kick: [0, 7], snare: [4, 12], hat: [2, 6, 10, 14, 15] },
  // Barely a pattern: one kick a bar and a hat on the half.
  hush: { kick: [0], snare: [], hat: [8] },
};

/** When a piece is allowed to be chosen. `any` is deliberately unused so far —
 *  it exists so a piece can be written that belongs to no particular hour, and
 *  so the selector has a total answer if the setlist is ever cut down. */
export type PieceWhen = "day" | "night" | "any";

export interface PieceDef {
  /** Shown nowhere. Named so we can talk about them. */
  name: string;
  /** Midi note of the tonic, in the octave the voicings sit around. */
  root: number;
  mode: ModeId;
  /** Four scale degrees, zero-based. One per bar; repeats make a vamp. */
  prog: [number, number, number, number];
  tempo: number;
  /** Where the offbeat sixteenth lands, as a fraction of the pair. 0.5 is
   *  straight and sounds like a drum machine; the window that reads as human is
   *  narrow and sits around 0.57–0.63. */
  swing: number;
  drums: PatternId;
  /** How much tape colour this piece carries — crackle, wobble, and how far the
   *  top end is rolled off. */
  tape: number;
  at: PieceWhen;
}

/** The setlist.
 *
 *  Six by day, three after dark. The night rows are not the day rows slowed
 *  down: they are sparser progressions in flatter keys with `hush` under them,
 *  because a piece that works at noon in the plaza sounds like a party you are
 *  no longer at when it is dark and everyone has gone in. */
export const PIECES: PieceDef[] = [
  // --- Day ----------------------------------------------------------------
  // The default, and the one the town sounds like. Everything else is a
  // departure from this.
  { name: "Parish Office", root: 60, mode: "ionian", prog: [0, 5, 1, 4], tempo: 74, swing: 0.6, drums: "steady", tape: 0.6, at: "day" },
  // Minor and slower, with the tape run hard. Reads as the morning after rain.
  { name: "Wet Boots", root: 57, mode: "aeolian", prog: [0, 5, 3, 4], tempo: 68, swing: 0.63, drums: "laid", tape: 0.75, at: "day" },
  // The brightest of them: a plain ii–V–I, the fastest tempo, the least grime.
  { name: "The Long Way", root: 65, mode: "ionian", prog: [1, 4, 0, 5], tempo: 80, swing: 0.57, drums: "busy", tape: 0.45, at: "day" },
  // A two-chord vamp that goes nowhere on purpose. The one to reach for when
  // the player is doing something long and repetitive.
  { name: "Reading Room", root: 62, mode: "dorian", prog: [0, 0, 3, 3], tempo: 64, swing: 0.55, drums: "sparse", tape: 0.7, at: "day" },
  // Four flats and the heaviest tape setting. Melancholy, and kept because the
  // others are not — it is the contrast that makes the set read as a set.
  { name: "Half Six", root: 63, mode: "ionian", prog: [5, 3, 0, 4], tempo: 72, swing: 0.62, drums: "steady", tape: 0.8, at: "day" },
  // Mixolydian, so the seventh is flat and nothing ever resolves.
  { name: "Nothing Doing", root: 67, mode: "mixolydian", prog: [0, 4, 1, 3], tempo: 70, swing: 0.59, drums: "sparse", tape: 0.55, at: "day" },

  // --- Night --------------------------------------------------------------
  // Slower than anything in daylight, and the drums are a formality.
  { name: "Small Hours", root: 57, mode: "aeolian", prog: [0, 3, 5, 0], tempo: 58, swing: 0.56, drums: "hush", tape: 0.7, at: "night" },
  // Dorian and static: two chords, sixty seconds apart in feel if not in fact.
  { name: "Nobody's Up", root: 62, mode: "dorian", prog: [0, 0, 6, 6], tempo: 54, swing: 0.54, drums: "hush", tape: 0.85, at: "night" },
  // The odd one. A raised fourth is the only interval in the file that sounds
  // like the world is slightly wrong, which is the correct thing for three in
  // the morning and the wrong thing for any other hour.
  { name: "Lamps Out", root: 58, mode: "lydian", prog: [0, 4, 0, 3], tempo: 60, swing: 0.55, drums: "hush", tape: 0.6, at: "night" },
];

/** The parts, and how each one answers the two questions the engine asks it.
 *
 *  `zone` — gain as you walk out of town. `town` is the value standing in the
 *  plaza, `woods` the value out past everything, and `knee` the stretch of the
 *  walk over which it travels between them. Drums are gone before you are half
 *  way; the Rhodes never leaves entirely, it just stops being struck.
 *
 *  `arrive` — where in the assemble envelope this part fades in, as a fraction.
 *  THIS IS THE WHOLE OF WHY NOTHING SOUNDS LIKE IT STARTED. Pads are in by 0.30
 *  and drums not until 1.0, so the first thing you hear is a held chord that
 *  could have been going a while, and the beat turns up twenty seconds later
 *  when you have stopped listening for it. Winding down runs the same number
 *  backwards, so the drums go first.
 *
 *  A master-volume fade was the first attempt and it sounds like exactly what
 *  it is: someone turning a knob. */
export interface LayerDef {
  id: LayerId;
  zone: { town: number; woods: number; knee: [number, number] };
  arrive: [number, number];
}

export type LayerId = "pads" | "drone" | "keys" | "vinyl" | "bass" | "drums";

export const LAYERS: LayerDef[] = [
  { id: "pads", zone: { town: 0, woods: 1, knee: [0.22, 0.72] }, arrive: [0.0, 0.3] },
  { id: "drone", zone: { town: 0, woods: 1, knee: [0.5, 0.95] }, arrive: [0.0, 0.34] },
  { id: "keys", zone: { town: 1, woods: 0.45, knee: [0.45, 0.95] }, arrive: [0.12, 0.48] },
  { id: "vinyl", zone: { town: 1, woods: 0, knee: [0.0, 0.45] }, arrive: [0.08, 0.44] },
  { id: "bass", zone: { town: 1, woods: 0, knee: [0.12, 0.62] }, arrive: [0.42, 0.72] },
  { id: "drums", zone: { town: 1, woods: 0, knee: [0.0, 0.42] }, arrive: [0.62, 1.0] },
];

/** How loud a layer wants to be at this distance from town.
 *  `wild` is 0 standing in the plaza, 1 out past everything. */
export function zoneGain(layer: LayerDef, wild: number): number {
  const [a, b] = layer.zone.knee;
  const t = b <= a ? (wild >= b ? 1 : 0) : Math.max(0, Math.min(1, (wild - a) / (b - a)));
  return layer.zone.town + (layer.zone.woods - layer.zone.town) * t;
}

/** How much of a layer the assemble envelope has let through yet. */
export function arrivalGain(layer: LayerDef, env: number): number {
  const [a, b] = layer.arrive;
  if (b <= a) return env >= b ? 1 : 0;
  return Math.max(0, Math.min(1, (env - a) / (b - a)));
}
