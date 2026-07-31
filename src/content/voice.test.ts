// House-voice lint over the actual source text, not over one table.
//
// The Meadow's ellipsis is written ". ... Capital", and the leading period IS
// the previous sentence's full stop — that is the whole reason it's written
// with the space in front. So a clause that already ends in punctuation before
// it prints two full stops in a row ("delightful. ... We just need"), which is
// the bug this catches. It shipped twice on the two screens every new player
// sees, which is why the check reads every file rather than every bank: the
// copy lives in content tables, in app.ts panels, and in cutscene scripts.
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
  it("never puts a period before the ellipsis's own period", () => {
    // The `\n` is the literal two characters as they appear in a TS string.
    const doubled = /[.!?]("|\\n| )*\. \.\.\./;
    const offenders = sourceFiles(join(__dirname, "..")).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, i) => ({ path, n: i + 1, line }))
        .filter(({ line }) => doubled.test(line))
        .map(({ path, n, line }) => `${path}:${n}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
