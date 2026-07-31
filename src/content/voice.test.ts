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
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("house ellipsis style", () => {
  it("never starts a line with the ellipsis's own period", () => {
    // Matching source text, so `\n` is the literal two characters as they are
    // typed in a TS string, not a newline.
    const doubled = /(\\n|[.!?]("| )*)\. \.\.\./;
    const offenders = sourceFiles(join(__dirname, "..")).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, i) => ({ path, n: i + 1, line }))
        // Comments are allowed to quote the bad form — that is how the reason
        // for the rule gets written down next to the code that follows it.
        .filter(({ line }) => doubled.test(line) && !/^\s*(\/\/|\*)/.test(line))
        .map(({ path, n, line }) => `${path}:${n}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
