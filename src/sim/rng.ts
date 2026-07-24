// Tiny deterministic PRNG (mulberry32). The sim is meant to be reproducible and
// unit-testable (CLAUDE.md §Architecture: "deterministic game logic"), so
// anything random — world generation, which idle line, the postcard's flavour
// event — draws from a seeded stream instead of Math.random.

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Uniformly pick an element. */
  pick<T>(arr: readonly T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
  };
}

/** A cheap deterministic hash of two ints → uint32. Used to seed per-tile /
 *  per-chunk generation so world features are stable without storing them. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
