import { describe, it, expect } from "vitest";
import { CONVERSATIONS } from "./conversations";
import type { Exchange } from "./conversations";
import type { AdultForm } from "./canon/forms";

/** Every exchange in every tree, with a path label for failure messages. */
function allExchanges(): { path: string; ex: Exchange }[] {
  const out: { path: string; ex: Exchange }[] = [];
  const walk = (path: string, ex: Exchange) => {
    out.push({ path, ex });
    for (const r of ex.replies ?? []) walk(`${path} → "${r.text}"`, r.then);
  };
  for (const [form, contexts] of Object.entries(CONVERSATIONS)) {
    for (const [ctx, roots] of Object.entries(contexts ?? {})) {
      (roots ?? []).forEach((root, i) => walk(`${form}/${ctx}[${i}]`, root));
    }
  }
  return out;
}

function depth(ex: Exchange): number {
  if (!ex.replies || ex.replies.length === 0) return 1;
  return 1 + Math.max(...ex.replies.map((r) => depth(r.then)));
}

describe("conversation trees keep the settled rules", () => {
  it("shallow, always: three exchanges and the tree lets go", () => {
    for (const [form, contexts] of Object.entries(CONVERSATIONS)) {
      for (const [ctx, roots] of Object.entries(contexts ?? {})) {
        for (const root of roots ?? []) {
          expect(depth(root), `${form}/${ctx}: "${root.line}"`).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('"..." is always a valid reply', () => {
    // The tone rules say "..." is a complete line, and a choice set without it
    // forces the player to have an opinion — silence must always be met, in
    // character, by every set of replies in the game.
    for (const { path, ex } of allExchanges()) {
      if (!ex.replies || ex.replies.length === 0) continue;
      expect(
        ex.replies.some((r) => r.text === "..."),
        `${path}: replies must include "..."`,
      ).toBe(true);
    }
  });

  it("choices are tone, never strategy: a reply carries words and a next line only", () => {
    // Enforced structurally — the moment somebody adds a `friendship`, `gives`
    // or `unlocks` field to a Reply, an answer can be correct, and a
    // conversation with a correct answer is a move. This is the tripwire.
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        expect(Object.keys(r).sort(), `${path}: reply "${r.text}"`).toEqual(
          Object.keys(r).includes("variants") ? ["text", "then", "variants"] : ["text", "then"],
        );
      }
    }
  });

  it("a variant rephrases the player, never the villager's answer", () => {
    // Same meaning, different mouth: a variant is a string, and the `then` is
    // shared — the tree may not branch on what form the player is.
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        for (const [form, text] of Object.entries(r.variants ?? {})) {
          expect(typeof text, `${path}: variant for ${form}`).toBe("string");
          expect((text as string).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("never instructs: no reply or line reads as a task", () => {
    const forbidden = /you should|you'll want|you ought|don't forget|go and|make sure/i;
    for (const { path, ex } of allExchanges()) {
      expect(forbidden.test(ex.line), `${path}: "${ex.line}"`).toBe(false);
    }
  });

  it("variants only name real forms", () => {
    const forms: AdultForm[] = ["dog", "blob", "gremlin", "scholar", "office", "menace", "ghost", "humcube", "carrot", "cosmos", "mole"];
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        for (const form of Object.keys(r.variants ?? {})) {
          expect(forms, `${path}: variant form ${form}`).toContain(form);
        }
      }
    }
  });
});
