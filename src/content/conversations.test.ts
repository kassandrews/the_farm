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

  it("choices are tone, never strategy: a reply carries only words, a next line, and what's remembered", () => {
    // Enforced structurally — the moment somebody adds a `friendship`, `gives`
    // or `unlocks` field to a Reply, an answer can be correct, and a
    // conversation with a correct answer is a move. This is the tripwire.
    //
    // `keepsake` is allowed and is NOT a payout: it files what you said in that
    // person's memory log so they can bring it up later. Nothing branches on
    // it, so it cannot make one answer worth more than another.
    const allowed = ["keepsake", "text", "then", "variants"];
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        for (const key of Object.keys(r)) {
          expect(allowed, `${path}: reply "${r.text}" has field "${key}"`).toContain(key);
        }
      }
    }
  });

  it("a keepsake reads as a clause after 'you said', and is never a payout", () => {
    // The grammar matters: one clause has to serve every form's phrasing
    // ("You told me ${v}", "${v}, you said"), so it may not open with a capital
    // or carry its own terminal punctuation.
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        if (!r.keepsake) continue;
        expect(r.keepsake[0], `${path}: keepsake "${r.keepsake}"`).toBe(r.keepsake[0].toLowerCase());
        expect(/[.!?]$/.test(r.keepsake), `${path}: keepsake "${r.keepsake}"`).toBe(false);
      }
    }
  });

  it("keepsakes stay sparse — most answers are not filed", () => {
    // A tree where every answer is remembered is a personality quiz. Fewer than
    // half of all replies may carry one.
    const replies = allExchanges().flatMap(({ ex }) => ex.replies ?? []);
    const kept = replies.filter((r) => r.keepsake).length;
    expect(kept).toBeGreaterThan(0);
    expect(kept * 2).toBeLessThan(replies.length);
  });

  it('never files a "..." — silence says nothing to remember', () => {
    for (const { path, ex } of allExchanges()) {
      for (const r of ex.replies ?? []) {
        if (r.text === "...") expect(r.keepsake, path).toBeUndefined();
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
