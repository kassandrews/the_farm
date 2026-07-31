// House-voice lint over the actual source text, not over one table.
//
// The Meadow's pause is written INLINE — "I took no notes. ... I want that on
// the record." The clause keeps its own full stop and the ellipsis follows it
// on the same line. What this catches is the other form, "…notes\n. ... I want",
// where the stop has been moved onto the next line: on screen that is a period
// floating at the start of a line with no word in front of it, and where the
// clause kept its period too, two full stops in a row.
//
// It shipped on the welcome card, the new-town warning and the pause menu —
// which is why the check reads every file rather than every bank. This copy
// lives in content tables, in app.ts panels, and in cutscene scripts alike.
import { describe, expect, it } from "vitest";

/** Every non-test source file, as text — the same `import.meta.glob` trick as
 *  looks.test.ts, and for the reason its docblock gives: this is a Vite project
 *  with no `@types/node`, so `fs` here compiles under vitest but fails `tsc`,
 *  which is what `npm run build` runs. That mistake shipped three red deploys. */
const SOURCES = import.meta.glob("../**/*.ts", { query: "?raw", import: "default", eager: true }) as
  Record<string, string>;

describe("house ellipsis style", () => {
  it("never starts a line with the ellipsis's own period", () => {
    // Matching source text, so `\n` is the literal two characters as they are
    // typed in a TS string, not a newline.
    const doubled = /(\\n|[.!?]("| )*)\. \.\.\./;
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(SOURCES)) {
      if (path.endsWith(".test.ts")) continue;
      text.split("\n").forEach((line, i) => {
        // Comments are allowed to quote the bad form — that is how the reason
        // for the rule gets written down next to the code that follows it.
        if (doubled.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
          offenders.push(`${path}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
