// Audio. Small, synthesised, and entirely optional — CLAUDE.md lists audio as
// part of the ui layer, and this is it.
//
// Everything is generated with WebAudio oscillators: no asset files, nothing to
// download, and it works offline in the PWA by construction. The palette is
// deliberately soft — a pentatonic-ish set of short, round tones. This is a
// game about pottering about; nothing here should ever demand attention.
//
// Two hard rules:
//   • Never throw. Audio is garnish. A locked-down browser, a missing
//     AudioContext, an autoplay policy — all of it degrades to silence, and the
//     game carries on without noticing.
//   • Never make noise before the player has touched something. Browsers block
//     it anyway, and a game that yells on load is a game people mute forever.

import { LAYERS, MODES, PATTERNS, zoneGain, arrivalGain } from "../content/music";
import type { LayerDef, LayerId, PieceDef } from "../content/music";
import { poolFor, choosePiece, restSeconds, assembleSeconds, PIECE_SECONDS } from "../sim/score";

/** The cues the game can ask for. Keeping them named (rather than passing
 *  frequencies around) means the sound design lives here, not at the call site. */
export type Cue =
  | "dig" // shovel into earth
  | "place" // a board goes down
  | "plant" // seed into soil
  | "water" // a watering can
  | "harvest" // pulling something ripe
  | "talk" // a villager says something
  | "menu" // opening a panel / confirming
  | "deny"; // that didn't work

const MUTE_KEY = "the-farm-muted";
/** Music has its own switch. A soundtrack is far more opt-out-able than a
 *  shovel noise, and silencing the shovel to be rid of the music would be a
 *  blunt instrument. Global mute still silences both — it is the bigger hammer,
 *  not a peer. */
const MUSIC_KEY = "the-farm-music-off";

interface Note {
  /** Hz. */
  freq: number;
  /** Seconds from the cue's start. */
  at: number;
  /** Seconds. */
  dur: number;
  type: OscillatorType;
  /** Peak gain, pre-master. Keep these low; they stack. */
  gain: number;
}

/** The whole sound design, as data — same house style as the content tables.
 *  Short, soft, and mostly falling: rising tones read as alerts. */
const CUES: Record<Cue, Note[]> = {
  dig: [
    { freq: 150, at: 0, dur: 0.09, type: "triangle", gain: 0.22 },
    { freq: 98, at: 0.04, dur: 0.1, type: "sine", gain: 0.16 },
  ],
  place: [
    { freq: 320, at: 0, dur: 0.06, type: "square", gain: 0.1 },
    { freq: 214, at: 0.05, dur: 0.11, type: "triangle", gain: 0.18 },
  ],
  plant: [
    { freq: 392, at: 0, dur: 0.08, type: "sine", gain: 0.16 },
    { freq: 523, at: 0.07, dur: 0.12, type: "sine", gain: 0.13 },
  ],
  water: [
    { freq: 640, at: 0, dur: 0.07, type: "sine", gain: 0.1 },
    { freq: 720, at: 0.05, dur: 0.07, type: "sine", gain: 0.09 },
    { freq: 560, at: 0.1, dur: 0.1, type: "sine", gain: 0.09 },
  ],
  // The only cue allowed to feel like a small reward.
  harvest: [
    { freq: 523, at: 0, dur: 0.1, type: "triangle", gain: 0.16 },
    { freq: 659, at: 0.08, dur: 0.1, type: "triangle", gain: 0.15 },
    { freq: 784, at: 0.16, dur: 0.16, type: "triangle", gain: 0.14 },
  ],
  talk: [{ freq: 430, at: 0, dur: 0.07, type: "sine", gain: 0.12 }],
  menu: [{ freq: 350, at: 0, dur: 0.06, type: "sine", gain: 0.1 }],
  // Not a buzzer — a small shrug.
  deny: [
    { freq: 220, at: 0, dur: 0.07, type: "sine", gain: 0.12 },
    { freq: 175, at: 0.06, dur: 0.09, type: "sine", gain: 0.12 },
  ],
};

// --- The score: turning a piece row into notes ----------------------------------
// Everything below is derivation. content/music.ts states a root, a mode and
// four degrees; these functions are the only thing that knows what that means
// in semitones, and the engine below is the only thing that knows what a
// semitone sounds like.

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Scale degree to midi, wrapping octaves for indices past the seventh. */
function degreeOf(piece: PieceDef, i: number): number {
  const steps = MODES[piece.mode].steps;
  const len = steps.length;
  const wrapped = ((i % len) + len) % len;
  return piece.root + steps[wrapped] + 12 * Math.floor(i / len);
}

/** Drop a pitch into a register window, so a voicing stays in one place on the
 *  keyboard however far the progression jumps. */
function foldInto(n: number, lo: number, hi: number): number {
  let out = n;
  while (out < lo) out += 12;
  while (out > hi) out -= 12;
  return out;
}

/** Move a pitch to whichever octave sits nearest the note this voice just
 *  played. This is what turns four correct chords into a progression: without
 *  it every chord is folded into the same window independently, each voice
 *  jumps wherever it likes, and the flatter keys in particular come out stiff. */
function nearestTo(pitch: number, prev: number): number {
  let n = pitch;
  while (n - prev > 6) n -= 12;
  while (prev - n > 6) n += 12;
  return Math.max(48, Math.min(72, n));
}

interface Chord {
  bass: number;
  voicing: number[];
  pads: number[];
}

/** The chord for a bar: rootless third–fifth–seventh–ninth over a bass root.
 *
 *  A PLAIN TRIAD IS UNREACHABLE, and that is the whole design. The rule that
 *  makes this sound like itself — always extended, never a bare triad — is not
 *  a style note anybody has to remember, it is the only thing this function can
 *  return. See content/music.ts. */
function chordFor(piece: PieceDef, bar: number, prev: number[] | null): Chord {
  const d = piece.prog[bar % piece.prog.length];
  const raw = [2, 4, 6, 8].map((k) => degreeOf(piece, d + k));
  const voicing = prev
    ? raw.map((n, i) => nearestTo(n, prev[i]))
    : raw.map((n) => foldInto(n, 52, 67));
  return {
    bass: degreeOf(piece, d) - 24,
    voicing,
    pads: [
      degreeOf(piece, d) - 12,
      foldInto(degreeOf(piece, d + 4), 45, 59),
      foldInto(degreeOf(piece, d + 6), 52, 66),
      foldInto(degreeOf(piece, d + 2), 55, 69),
    ],
  };
}

/** The notes the occasional stray melody line is allowed to pick from — the
 *  piece's own scale, an octave up out of the chords' way. */
function melodyFor(piece: PieceDef): number[] {
  return [4, 5, 6, 7, 8, 9, 11].map((k) => foldInto(degreeOf(piece, k), 67, 84));
}

/** Sixteen steps to the bar, everywhere. */
const STEPS_PER_BAR = 16;

/** How far ahead of the audio clock notes are scheduled, in seconds. Long
 *  enough that a dropped frame can't leave a gap, short enough that a change of
 *  zone is heard within a beat. */
const LOOKAHEAD = 0.15;

/** The wait before the very first piece of a session, in seconds — randomised
 *  so it is not the same beat every load. You have just arrived; something
 *  starting the instant you touch the screen would announce itself, which is
 *  precisely what the assemble envelope exists to avoid. */
const FIRST_REST = [25, 70] as const;

/** The music's own share of the master. Cues are events and may be as loud as
 *  they need to be; this is furniture. */
const MUSIC_LEVEL = 0.55;

/** Every node the score needs. Built once, on the first audible frame, and
 *  torn down on mute — a player who turns music off pays nothing for it. */
interface Score {
  bus: GainNode;
  tape: GainNode;
  wobble: DelayNode;
  wobbleAmt: GainNode;
  lpf: BiquadFilterNode;
  verb: ConvolverNode;
  wet: GainNode;
  padBus: GainNode;
  padLpf: BiquadFilterNode;
  crackle: GainNode;
  zone: Record<LayerId, GainNode>;
  env: Record<LayerId, GainNode>;
  noise: AudioBuffer;
}

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private failed = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
      // Music defaults ON, like everything else here — the switch exists to be
      // turned off, not to be discovered.
      this.musicOff = localStorage.getItem(MUSIC_KEY) === "1";
    } catch {
      this.muted = false; // storage unavailable; default to audible
      this.musicOff = false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Flip mute and remember it. Returns the new state. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    // Cues stop being played because `ensure` refuses; the hum is already
    // running, so it has to be told (see stopHum). The frame loop starts it
    // again by itself if you unmute while standing next to the thing.
    if (this.muted) {
      this.stopHum();
      // The score is the other sustained sound, and it has to be told for the
      // same reason: a retained oscillator that survived muting would be the
      // one sound in the game the mute button doesn't reach.
      this.stopScore();
    }
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {
      // Not remembering the preference is survivable; muting still works.
    }
    return this.muted;
  }

  /** Lazily build the context. Called from within a user gesture (the first tap
   *  or key), which is when browsers actually permit it. */
  private ensure(): boolean {
    if (this.failed || this.muted) return false;
    if (this.ctx && this.master) {
      // A backgrounded tab suspends the context; nudge it awake.
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.failed = true;
        return false;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5; // headroom; individual cues are already quiet
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      this.failed = true; // no audio in this environment; stop trying
      return false;
    }
  }

  /** Play a cue. Silent no-op when muted, blocked, or unsupported. */
  play(cue: Cue): void {
    // A cue is always a response to something the player did, so reaching here
    // is itself proof of a gesture (see unlock()).
    this.gestured = true;
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    const master = this.master!;
    const now = ctx.currentTime;
    try {
      for (const note of CUES[cue]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type;
        osc.frequency.value = note.freq;
        const start = now + note.at;
        const end = start + note.dur;
        // A quick attack and an exponential tail — a plain on/off gate clicks.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(end + 0.02);
      }
    } catch {
      // A cue failing mid-flight must never interrupt gameplay.
    }
  }

  // --- The hum ------------------------------------------------------------------
  // The one sustained sound in the game, and the first thing here that is not a
  // cue. Every other sound is an event — you did a thing, it made a noise — and
  // this is a PLACE making a noise whether or not you do anything, which is the
  // whole of what the Humming Cube is (DESIGN §"a landmark that hums").
  //
  // Two oscillators a fifth apart, detuned a little, through a lowpass: a drone
  // rather than a test tone. It is never loud. You should not be able to tell
  // exactly when it started.
  //
  // NOT the only way to find the cube, and that is deliberate — it is a visible
  // object standing in a field, and muting the game must not hide anything. The
  // hum confirms; it does not steer (ROADMAP §4c).

  private humOsc: OscillatorNode[] = [];
  private humGain: GainNode | null = null;

  /** Drive the hum. `level` is 0..1 — silence at 0, and the caller decides the
   *  curve (see ui/app.ts, which reads it off distance to the cube).
   *
   *  Safe to call every frame: it builds the nodes on the first audible call,
   *  ramps smoothly after that, and tears everything down once it hits zero, so
   *  a player who has never been near the cube pays nothing for it. */
  setHum(level: number): void {
    const wanted = Math.max(0, Math.min(1, level));
    if (wanted <= 0) {
      this.stopHum();
      return;
    }
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    try {
      if (!this.humGain) {
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 500; // takes the edge off; leaves the body
        gain.connect(filter);
        filter.connect(this.master!);
        for (const freq of [55, 82.5]) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          // A cent or two out, so the two never phase-lock into one flat tone.
          osc.detune.value = freq === 55 ? -4 : 5;
          osc.connect(gain);
          osc.start();
          this.humOsc.push(osc);
        }
        this.humGain = gain;
      }
      // Ramped, never set: a step change in gain is a click, and a click is the
      // sound of a game object rather than of something that was already going.
      const target = Math.max(0.0001, wanted * 0.06);
      this.humGain.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
    } catch {
      this.stopHum();
    }
  }

  /** Silence and dispose. Called when you walk away, and on mute — a retained
   *  oscillator that survives muting would be the one sound in the game the
   *  mute button doesn't reach. */
  stopHum(): void {
    if (!this.humGain) return;
    try {
      for (const osc of this.humOsc) osc.stop();
    } catch {
      // Already stopped, or the context went away underneath us.
    }
    try {
      this.humGain.disconnect();
    } catch {
      // Same.
    }
    this.humOsc = [];
    this.humGain = null;
  }

  // --- The score ------------------------------------------------------------------
  // The soundtrack. Like the hum, it is a sustained sound rather than a cue, and
  // like the hum the DECISIONS live in sim (sim/score.ts: how settled this spot
  // is, whether it is night, how long a rest runs) while the OSCILLATORS live
  // here. Unlike the hum, it has a clock of its own.
  //
  // ONE ENGINE, TWO AXES.
  //   • WHICH piece — chosen once, in the silence between pieces, and never
  //     changed mid-phrase. Key, tempo and progression can all move at that
  //     moment for free, because nothing is sounding to be interrupted. That is
  //     why the rest exists at all: it is not only anti-fatigue, it is the seam.
  //   • HOW MUCH of it — a gain per layer, read off how far from town you are.
  //     Walking into the woods does not cross-fade to a different piece, it
  //     takes the drums off this one. Cross-fading two pieces is what a radio
  //     losing signal sounds like.
  //
  // NOTHING FADES IN. A master-volume ramp sounds like a master-volume ramp.
  // What happens instead is an ARRANGEMENT ENVELOPE — one number from 0 to 1
  // that each layer reads through its own window (content/music.ts §LAYERS).
  // Pads are in by 0.30, drums not until 1.0, so the first thing you hear is a
  // held chord that might have been going a while and the beat turns up twenty
  // seconds later. Winding down runs the same number backwards. The master gain
  // never moves, and you cannot point at the moment it began.
  //
  // DRIVEN FROM THE FRAME, not from a timer. `setScore` is called once a frame
  // by ui/app.ts and pumps the scheduler; a backgrounded tab therefore stops
  // scheduling, which is correct — its AudioContext is suspended anyway.

  private score: Score | null = null;
  private musicOff = false;
  private piece: PieceDef | null = null;
  private recent: string[] = [];
  private playing = false;
  private phaseEndsAt = 0;
  private env = 0;
  private envDir = -1;
  private lastPumpAt = 0;
  private step = 0;
  private bar = 0;
  private nextNoteAt = 0;
  private lastVoicing: number[] | null = null;
  private chord: Chord | null = null;
  private droneOsc: OscillatorNode[] = [];
  private nextPadAt = [0, 0, 0, 0];

  isMusicOff(): boolean {
    return this.musicOff;
  }

  /** Tell the module the player has touched something.
   *
   *  THE SCORE NEEDS THIS AND THE CUES DO NOT, and the difference is worth
   *  stating. A cue is only ever played because you did something, so by the
   *  time `play` runs a gesture has happened by construction. The score runs off
   *  the frame loop, which starts at load — without this flag it builds an
   *  AudioContext on frame one, before anyone has touched anything, which is
   *  both the rule at the top of this file and a browser warning logged sixty
   *  times a second. */
  unlock(): void {
    this.gestured = true;
  }

  private gestured = false;

  /** Flip the music switch and remember it. Returns the new state. */
  toggleMusic(): boolean {
    this.musicOff = !this.musicOff;
    if (this.musicOff) this.stopScore();
    try {
      localStorage.setItem(MUSIC_KEY, this.musicOff ? "1" : "0");
    } catch {
      // Not remembering the preference is survivable; the switch still works.
    }
    return this.musicOff;
  }

  /** Drive the score. Safe to call every frame, and safe to never call at all.
   *
   *  `settled` is 0 (out past everything) to 1 (in town), and `night` says which
   *  setlist is in play — both from sim/score.ts, which is where the arguments
   *  about distance and hours belong. */
  setScore(settled: number, night: boolean): void {
    if (this.musicOff || this.muted) {
      this.stopScore();
      return;
    }
    if (!this.gestured) return; // see unlock()
    if (!this.ensure()) return;
    try {
      const ctx = this.ctx!;
      const s = this.score ?? this.buildScore();
      if (!s) return;
      const now = ctx.currentTime;
      const dt = this.lastPumpAt > 0 ? Math.min(0.25, now - this.lastPumpAt) : 0;
      this.lastPumpAt = now;

      this.turnPhase(now, night);
      this.driveEnvelope(dt, settled);
      this.applyZone(settled);
      this.pumpScheduler(now);
      this.pumpPads(now);
    } catch {
      // A soundtrack must never be the reason a frame fails.
      this.stopScore();
    }
  }

  /** Silence and dispose. Reached by mute, by the music switch, and by anything
   *  going wrong — after which the next audible frame simply builds it again. */
  stopScore(): void {
    this.stopDrone();
    if (this.score) {
      try {
        this.score.bus.disconnect();
      } catch {
        // Context already gone.
      }
    }
    this.score = null;
    this.piece = null;
    this.chord = null;
    this.lastVoicing = null;
    this.playing = false;
    this.env = 0;
    this.envDir = -1;
    this.lastPumpAt = 0;
    this.phaseEndsAt = 0;
  }

  /** Play, then rest, then play something else. The piece is chosen at the
   *  moment play begins — which is the end of a silence, so nothing has to be
   *  crossfaded out of the way of a new key. */
  private turnPhase(now: number, night: boolean): void {
    if (this.phaseEndsAt === 0) {
      // First frame of a session: start in silence, for a randomised while.
      this.playing = false;
      this.envDir = -1;
      this.phaseEndsAt = now + FIRST_REST[0] + Math.random() * (FIRST_REST[1] - FIRST_REST[0]);
      return;
    }
    if (now < this.phaseEndsAt) return;

    if (this.playing) {
      this.playing = false;
      this.envDir = -1;
      this.phaseEndsAt = now + restSeconds(night);
    } else {
      this.piece = choosePiece(poolFor(night), this.recent, Math.random());
      this.recent.push(this.piece.name);
      if (this.recent.length > 12) this.recent.shift();
      this.bar = 0;
      this.step = 0;
      this.lastVoicing = null;
      this.chord = chordFor(this.piece, 0, null);
      this.nextNoteAt = now + 0.1;
      for (let i = 0; i < this.nextPadAt.length; i++) this.nextPadAt[i] = now + 1 + i * 1.7;
      this.startDrone(this.piece);
      this.playing = true;
      this.envDir = 1;
      this.phaseEndsAt = now + PIECE_SECONDS;
    }
  }

  /** The arrangement envelope, and the per-layer windows it feeds. */
  private driveEnvelope(dt: number, settled: number): void {
    const s = this.score;
    if (!s || !this.ctx) return;
    const assemble = assembleSeconds(settled);
    // Leaving is a touch brisker than arriving, or the silence never quite gets
    // to be silence.
    const leaving = assemble * 0.85;
    const step = this.envDir > 0 ? dt / assemble : -dt / leaving;
    this.env = Math.max(0, Math.min(1, this.env + step));
    if (this.env === 0 && !this.playing) this.stopDrone();

    const now = this.ctx.currentTime;
    for (const layer of LAYERS) {
      s.env[layer.id].gain.setTargetAtTime(arrivalGain(layer, this.env), now, 0.35);
    }
  }

  /** Where you are standing, as a gain per part. Slow: this is a walk, not a
   *  switch, and a zone change that arrived inside a beat would read as the
   *  music noticing a doorway. */
  private applyZone(settled: number): void {
    const s = this.score;
    if (!s || !this.ctx || !this.piece) return;
    const now = this.ctx.currentTime;
    const wild = 1 - Math.max(0, Math.min(1, settled));
    const tc = 4.5;
    for (const layer of LAYERS) {
      s.zone[layer.id].gain.setTargetAtTime(zoneGain(layer, wild), now, tc);
    }
    const tape = zoneGain(LAYERS.find((l) => l.id === "vinyl") as LayerDef, wild) * this.piece.tape;
    s.crackle.gain.setTargetAtTime(tape * 0.045 * this.env, now, tc);
    s.wobbleAmt.gain.setTargetAtTime(tape * 0.003, now, tc);
    s.lpf.frequency.setTargetAtTime(4000 + wild * 3200 - this.piece.tape * 900, now, tc);
    s.padLpf.frequency.setTargetAtTime(1600 + wild * 1600, now, tc);
    s.wet.gain.setTargetAtTime((0.16 + wild * 0.59) * Math.min(1, this.env * 2.5), now, tc);
  }

  /** Schedule every step that falls inside the lookahead window. The timer is
   *  sloppy; the audio clock is not, so notes are placed against the latter. */
  private pumpScheduler(now: number): void {
    const piece = this.piece;
    if (!piece || this.env <= 0.001) return;
    const sixteenth = 60 / piece.tempo / 4;
    // A frame that took an age must not spin here forever.
    let guard = 256;
    while (this.nextNoteAt < now + LOOKAHEAD && guard-- > 0) {
      // Odd sixteenths land late: the pair splits (swing, 1 - swing). Straight
      // sixteenths are the difference between a groove and a drum machine.
      const swung = this.step % 2 === 1 ? sixteenth * (2 * piece.swing - 1) : 0;
      this.playStep(piece, this.step, this.nextNoteAt + swung);
      this.nextNoteAt += sixteenth;
      this.step++;
      if (this.step === STEPS_PER_BAR) {
        this.step = 0;
        this.bar++;
        this.chord = chordFor(piece, this.bar, this.lastVoicing);
        this.lastVoicing = this.chord.voicing;
      }
    }
  }

  /** One step of one bar. Every hit is nudged a few milliseconds and a little in
   *  volume — a grid played exactly is audibly a grid. */
  private playStep(piece: PieceDef, step: number, at: number): void {
    const s = this.score;
    const chord = this.chord;
    if (!s || !chord) return;
    const pattern = PATTERNS[piece.drums];
    const jitter = () => (Math.random() - 0.5) * 0.016;
    const vary = (v: number) => v * (0.82 + Math.random() * 0.18);
    // Out in the wild the Rhodes stops being struck and starts being held: same
    // notes, same table, longer and quieter.
    const held = this.live("keys") > 0 ? 1 - Math.min(1, this.live("drums") + this.live("bass")) : 1;

    if (step === 0) {
      chord.voicing.forEach((n, i) => {
        // Rolled a touch, like a hand rather than a grid — and rolled wider the
        // further out you are.
        const roll = i * (0.004 + Math.random() * 0.012) * (1 + held * 4);
        this.rhodes(at + jitter() + roll, midiToHz(n), 2 + held * 4.5, vary(0.16 - held * 0.085));
      });
    }
    if (step === 10 && Math.random() < 0.6 * (1 - held)) {
      chord.voicing.forEach((n, i) => {
        this.rhodes(at + jitter() + i * 0.01, midiToHz(n), 0.7 + Math.random() * 0.5, vary(0.08));
      });
    }
    if (this.live("bass") > 0.015) {
      if (step === 0) this.bassNote(at + jitter(), midiToHz(chord.bass), 0.7, vary(0.32));
      if (step === 8) this.bassNote(at + jitter(), midiToHz(chord.bass + 12), 0.4, vary(0.18));
      if (step === 14 && Math.random() < 0.4) {
        this.bassNote(at + jitter(), midiToHz(chord.bass + 7), 0.3, vary(0.16));
      }
    }
    if (this.live("drums") > 0.015) {
      if (pattern.kick.includes(step)) this.kick(at + jitter(), vary(0.55));
      if (pattern.snare.includes(step)) this.snare(at + jitter(), vary(0.22));
      if (pattern.hat.includes(step)) this.hat(at + jitter(), vary(step % 4 === 0 ? 0.1 : 0.06));
    }
    if (Math.random() < 0.1 * (1 - held)) {
      const notes = melodyFor(piece);
      this.rhodes(at + jitter(), midiToHz(notes[(Math.random() * notes.length) | 0]), 0.6, 0.085);
    }
    if (this.live("vinyl") > 0.015 && Math.random() < 0.5) this.crackle(at + Math.random() * 0.1);
  }

  /** Pads keep their own clock. They are ambient; they do not take orders from
   *  the bar, and letting them drift against it is most of why the wild end of
   *  the walk does not sound like the town end with parts missing. */
  private pumpPads(now: number): void {
    const chord = this.chord;
    if (!chord || this.live("pads") <= 0.01) return;
    for (let i = 0; i < this.nextPadAt.length; i++) {
      if (now < this.nextPadAt[i]) continue;
      const note = chord.pads[i % chord.pads.length] + (Math.random() < 0.3 ? 12 : 0);
      this.padNote(note, 0.06 + Math.random() * 0.07);
      this.nextPadAt[i] = now + 3 + Math.random() * 4 + (1 - this.live("drums")) * 3;
    }
  }

  /** What a layer is actually contributing: where you are, times how far the
   *  arrangement has assembled. */
  private live(id: LayerId): number {
    const s = this.score;
    if (!s) return 0;
    return s.zone[id].gain.value * s.env[id].gain.value;
  }

  private buildScore(): Score | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    try {
      const bus = ctx.createGain();
      bus.gain.value = MUSIC_LEVEL;
      bus.connect(master);

      // Tape: a delay whose time drifts (wobble), the top end rolled off, and a
      // gentle saturation. Most of what reads as "lofi" is this, not the notes.
      const wobble = ctx.createDelay(0.1);
      wobble.delayTime.value = 0.014;
      const wlfo = ctx.createOscillator();
      wlfo.frequency.value = 0.7;
      const wobbleAmt = ctx.createGain();
      wobbleAmt.gain.value = 0.002;
      wlfo.connect(wobbleAmt);
      wobbleAmt.connect(wobble.delayTime);
      wlfo.start();

      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 4200;
      lpf.Q.value = 0.7;

      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.6);
      }
      shaper.curve = curve;

      const tape = ctx.createGain();
      tape.connect(wobble);
      wobble.connect(lpf);
      lpf.connect(shaper);
      shaper.connect(bus);

      // A reverb with no asset file: a burst of noise decaying to nothing is a
      // perfectly good impulse response.
      const verb = ctx.createConvolver();
      const seconds = 4;
      const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.6);
        }
      }
      verb.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0;
      shaper.connect(verb);
      verb.connect(wet);
      wet.connect(bus);

      const padBus = ctx.createGain();
      const padLpf = ctx.createBiquadFilter();
      padLpf.type = "lowpass";
      padLpf.frequency.value = 2200;
      padLpf.Q.value = 0.4;
      padBus.connect(padLpf);
      padLpf.connect(bus);
      padLpf.connect(verb);

      // Two gain stages per layer: `zone` is where you are standing and moves
      // slowly; `env` is how far the arrangement has assembled. Instruments
      // connect to `env`, so both multiply without either having to know about
      // the other.
      const zone = {} as Record<LayerId, GainNode>;
      const env = {} as Record<LayerId, GainNode>;
      for (const layer of LAYERS) {
        const z = ctx.createGain();
        z.gain.value = 0;
        const e = ctx.createGain();
        e.gain.value = 0;
        e.connect(z);
        zone[layer.id] = z;
        env[layer.id] = e;
      }
      zone.drums.connect(tape);
      zone.bass.connect(tape);
      zone.keys.connect(tape);
      zone.pads.connect(padBus);
      zone.drone.connect(padBus);
      // The vinyl layer is a meter, not a path: the crackle it governs is mixed
      // straight to the bus so the tape's own lowpass doesn't eat it.
      const crackle = ctx.createGain();
      crackle.gain.value = 0;
      crackle.connect(bus);

      const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
      const nd = noise.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

      this.score = {
        bus, tape, wobble, wobbleAmt, lpf, verb, wet, padBus, padLpf, crackle, zone, env, noise,
      };
      return this.score;
    } catch {
      return null;
    }
  }

  /** An FM electric piano. The modulator's index decays fast, and that decay is
   *  the whole difference between a warm Rhodes and a doorbell. */
  private rhodes(at: number, hz: number, dur: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = hz;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = hz * 2;
    const index = ctx.createGain();
    index.gain.setValueAtTime(hz * 3.2 * vel, at);
    index.gain.exponentialRampToValueAtTime(hz * 0.08, at + 0.22);
    mod.connect(index);
    index.connect(carrier.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vel, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    tone.Q.value = 0.5;

    carrier.connect(gain);
    gain.connect(tone);
    tone.connect(s.env.keys);
    carrier.start(at);
    mod.start(at);
    carrier.stop(at + dur + 0.05);
    mod.stop(at + dur + 0.05);
  }

  private bassNote(at: number, hz: number, dur: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = hz;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vel, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    osc.connect(gain);
    sub.connect(subGain);
    subGain.connect(gain);
    gain.connect(lp);
    lp.connect(s.env.bass);
    osc.start(at);
    sub.start(at);
    osc.stop(at + dur + 0.05);
    sub.stop(at + dur + 0.05);
  }

  private kick(at: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.09);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
    osc.connect(gain);
    gain.connect(s.env.drums);
    osc.start(at);
    osc.stop(at + 0.3);
  }

  private snare(at: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const noise = ctx.createBufferSource();
    noise.buffer = s.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(s.env.drums);
    noise.start(at);
    noise.stop(at + 0.2);
    // A little body under the noise, or it reads as a hiss rather than a hit.
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.value = 185;
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(vel * 0.5, at);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    body.connect(bodyGain);
    bodyGain.connect(s.env.drums);
    body.start(at);
    body.stop(at + 0.12);
  }

  private hat(at: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const noise = ctx.createBufferSource();
    noise.buffer = s.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    noise.connect(hp);
    hp.connect(gain);
    gain.connect(s.env.drums);
    noise.start(at);
    noise.stop(at + 0.06);
  }

  /** One pop of dust in the groove. */
  private crackle(at: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const noise = ctx.createBufferSource();
    noise.buffer = s.noise;
    noise.playbackRate.value = 0.6 + Math.random() * 0.8;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((0.02 + Math.random() * 0.04) * this.live("vinyl"), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(s.crackle);
    noise.start(at);
    noise.stop(at + 0.03);
  }

  /** A sustained tone: the wild end's voice. Two oscillators slightly apart,
   *  a slow vibrato, and no attack worth speaking of. */
  private padNote(midi: number, vel: number): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    const at = ctx.currentTime;
    const attack = 2 + Math.random() * 1.6;
    const hold = 1 + Math.random() * 1.4;
    const release = 4 + Math.random() * 2.5;
    const life = attack + hold + release;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vel, at + attack);
    gain.gain.setValueAtTime(vel, at + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + life);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15 + Math.random() * 0.25;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 2 + Math.random() * 4;
    lfo.connect(lfoAmt);

    for (const [type, detune, level] of [
      ["sine", 0, 1],
      ["triangle", Math.random() * 18 - 9, 0.45],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = detune;
      lfoAmt.connect(osc.detune);
      const level_ = ctx.createGain();
      level_.gain.value = level;
      osc.connect(level_);
      level_.connect(gain);
      osc.start(at);
      osc.stop(at + life + 0.2);
    }
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.4 - 0.7;
      gain.connect(pan);
      pan.connect(s.env.pads);
    } else {
      gain.connect(s.env.pads);
    }
    lfo.start(at);
    lfo.stop(at + life + 0.2);
  }

  /** The drone is tuned to the piece, so it is rebuilt on every change — which
   *  is safe precisely because a change only ever happens during a silence. */
  private startDrone(piece: PieceDef): void {
    const ctx = this.ctx;
    const s = this.score;
    if (!ctx || !s) return;
    this.stopDrone();
    const at = ctx.currentTime;
    const notes = [piece.root - 24, piece.root - 12, degreeOf(piece, 4) - 12];
    const levels = [0.06, 0.036, 0.014];
    notes.forEach((midi, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "sine" : "triangle";
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = Math.random() * 12 - 6;
      const gain = ctx.createGain();
      gain.gain.value = levels[i];
      osc.connect(gain);
      gain.connect(s.env.drone);
      osc.start(at);
      this.droneOsc.push(osc);
    });
  }

  private stopDrone(): void {
    for (const osc of this.droneOsc) {
      try {
        osc.stop();
      } catch {
        // Already stopped, or the context went away underneath us.
      }
      try {
        osc.disconnect();
      } catch {
        // Same.
      }
    }
    this.droneOsc = [];
  }
}

/** The one instance the ui layer talks to. */
export const audio = new Audio();
