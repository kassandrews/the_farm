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

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private failed = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false; // storage unavailable; default to audible
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Flip mute and remember it. Returns the new state. */
  toggleMute(): boolean {
    this.muted = !this.muted;
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
}

/** The one instance the ui layer talks to. */
export const audio = new Audio();
