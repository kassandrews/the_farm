import { describe, it, expect } from "vitest";
import { renderPixels, creatureKey, CELL } from "./sprites";
import { FORMS } from "./forms";
import type { AdultForm } from "./forms";

/** Count opaque pixels in a rendered buffer. */
function opaque(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
  return n;
}

describe("vendored sprite renderer", () => {
  it("renders every form to a non-empty 16x16 buffer", () => {
    for (const id of Object.keys(FORMS) as AdultForm[]) {
      const key = creatureKey("adult", id);
      const buf = renderPixels(key, "neutral");
      expect(buf.w).toBe(CELL);
      expect(buf.h).toBe(CELL);
      expect(opaque(buf.data)).toBeGreaterThan(20);
    }
  });

  it("renders the egg and the baby/child/teen stages", () => {
    for (const key of ["egg", "baby", "child", "teen"]) {
      expect(opaque(renderPixels(key, "neutral").data)).toBeGreaterThan(20);
    }
  });

  it("mood and frame changes alter the pixels (eyes actually move)", () => {
    const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
      a.length === b.length && a.every((v, i) => v === b[i]);
    const base = renderPixels("office", "neutral", "base").data;
    const blink = renderPixels("office", "neutral", "blink").data;
    const glance = renderPixels("office", "neutral", "glanceL").data;
    expect(same(base, blink)).toBe(false);
    expect(same(base, glance)).toBe(false);
  });
});
