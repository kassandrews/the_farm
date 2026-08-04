// House-voice lint over the actual source text, not over one table.
//
// The pause is written "word ... Capital": the clause before the ellipsis
// carries NO period, though ? and ! keep their mark. Settled 3 Aug 2026, when
// the whole corpus (330 lines) was swept from the older ". ..." form — The
// Meadow still uses that form and stays untouched, being finished and canon;
// this is the one place the Farm's voice deliberately diverges from it.
//
// The check reads every file rather than every bank because spoken copy lives
// in content tables, in app.ts panels, and in cutscene scripts alike — the
// original doubled-period bug shipped on three screens no bank contains.
import { describe, expect, it } from "vitest";

/** Every non-test source file, as text — the same `import.meta.glob` trick as
 *  looks.test.ts, and for the reason its docblock gives: this is a Vite project
 *  with no `@types/node`, so `fs` here compiles under vitest but fails `tsc`,
 *  which is what `npm run build` runs. That mistake shipped three red deploys. */
const SOURCES = import.meta.glob("../**/*.ts", { query: "?raw", import: "default", eager: true }) as
  Record<string, string>;

describe("house ellipsis style", () => {
  it("never puts a period before an ellipsis", () => {
    // The period-then-pause form, anywhere in a line. ? and ! are deliberately
    // not matched — they keep their mark before a pause.
    const dotted = /\. \.\.\./;
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(SOURCES)) {
      if (path.endsWith(".test.ts")) continue;
      text.split("\n").forEach((line, i) => {
        // Comments are allowed to quote the bad form — that is how the reason
        // for the rule gets written down next to the code that follows it.
        if (dotted.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
          offenders.push(`${path}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
