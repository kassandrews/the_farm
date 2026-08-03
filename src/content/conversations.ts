// Conversation trees (Phase 12 step 2). A tree is an Exchange — one thing a
// villager says — whose replies are the player's short answers, each leading to
// the next Exchange. Most taps still produce a single line; a tree is the deep
// version of the same banks, used where the moment earns a back-and-forth.
//
// The rules, all settled in ROADMAP §Phase 12 and enforced by
// conversations.test.ts rather than by reviewer memory:
//
// - SHALLOW, ALWAYS. Three exchanges at most, then it lets go. The voice is
//   brevity; a dialogue maze is the wrong game.
// - CHOICES ARE TONE, NEVER STRATEGY. A Reply carries text and a next line and
//   NOTHING ELSE — no friendship, no items, no flags. There is deliberately no
//   field to pay or gate with, so a "correct" answer cannot be written.
// - `"..."` IS ALWAYS A VALID REPLY. Every choice set includes it, and the
//   villager answers silence in-character. It sits where the panel's close
//   button sits when there is no tree, because it is the same gesture — met
//   with silence — except here the person gets to respond to it.
// - REPLIES MAY FLAVOR BY THE PLAYER'S FORM. `variants` is a light layer over
//   a shared default: the carrot player's words read carrot-ish where somebody
//   bothered to write it, and everybody else gets `text`. Never a separate
//   matrix; a reply with no variants is finished, not incomplete.

import type { AdultForm } from "./canon/forms";

export interface Reply {
  /** What the player says — the button. Short: it is a reply, not a speech. */
  text: string;
  /** Player-form flavored phrasings of the SAME reply, where a form earns one.
   *  Same meaning, different mouth; the villager's answer doesn't branch on it. */
  variants?: Partial<Record<AdultForm, string>>;
  /** What they say back. */
  then: Exchange;
}

export interface Exchange {
  line: string;
  /** Absent = the conversation lets go here. */
  replies?: Reply[];
}

/** Which moments have trees. Grows with the generated bank (step 3); the memory
 *  kinds and the midst rung join when their trees are written. */
export type ConversationContext = "idle" | "absence_days" | "absence_weeks";

/** Tree roots, pooled into the same rungs as the flat banks — an idle tree is
 *  picked (and ring-tracked) exactly like an idle line, it just doesn't stop
 *  after one sentence. */
export const CONVERSATIONS: Partial<
  Record<AdultForm, Partial<Record<ConversationContext, Exchange[]>>>
> = {
  scholar: {
    idle: [
      {
        line: "Settle a dispute. The fence: leaning, or committing to a direction?",
        replies: [
          {
            text: "Leaning.",
            then: { line: "As I suspected. The fence lacks conviction. ... The note stands." },
          },
          {
            text: "Committing.",
            then: { line: "A bold reading. I'll cite you. The fence will be thrilled, in its way." },
          },
          {
            text: "...",
            then: { line: ". ... Withholding your findings. I respect it. The fence would too." },
          },
        ],
      },
    ],
    absence_weeks: [
      {
        line: "You were gone a good while. For the record: where does one GO?",
        replies: [
          {
            text: "Out there. Walking.",
            variants: { dog: "Out there. Sniffing around." },
            then: {
              line: "'Out there.' I'll chart it as a region. It's where all my best data lives.",
            },
          },
          {
            text: "Nowhere much.",
            then: { line: "Nowhere much, for weeks. ... I've had field seasons like that. The good kind." },
          },
          { text: "...", then: { line: "Classified. Understood. My notes will say 'expedition'." } },
        ],
      },
    ],
  },
  dog: {
    idle: [
      {
        line: "Okay. Big question. Is today a doing-something day or a wandering day?",
        replies: [
          { text: "A doing day.", then: { line: "YES. I don't know what it is yet but I am IN." } },
          {
            text: "A wandering day.",
            then: { line: "The best kind. I'll wander behind you. Casually. Not following. Following." },
          },
          { text: "...", then: { line: "A mystery day! Even better. I love not knowing things." } },
        ],
      },
      {
        line: "I found something today. Guess. You'll never guess. Guess anyway.",
        replies: [
          {
            text: "A stick?",
            then: {
              line: "A STICK. How did you— you KNOW me. It's the best one so far. I buried it. I'll show you the general area.",
            },
          },
          {
            text: "A smell?",
            variants: { dog: "A smell. It's always a smell." },
            then: { line: "A smell! Yes! Also a stick. It was a big day." },
          },
          { text: "...", then: { line: "It was a stick. I couldn't wait. It's a very good stick." } },
        ],
      },
    ],
    absence_days: [
      {
        line: "You're BACK! Okay. Tell me one thing. The best thing from while you were gone.",
        replies: [
          {
            text: "Nothing much.",
            then: {
              line: "Nothing much is my FAVOURITE. That's a whole day of small good things, that's what that is.",
            },
          },
          {
            text: "Working, mostly.",
            variants: { menace: "Being magnificent, mostly.", gremlin: "Finding things, mostly." },
            then: { line: "I KNEW it. I could tell by the walk. You have a very busy walk." },
          },
          {
            text: "...",
            then: { line: "Saving it? Okay. Okay! Trade you mine when you're ready. Mine involves a stick." },
          },
        ],
      },
    ],
    absence_weeks: [
      {
        line: "You were gone SO long. Where do you GO?",
        replies: [
          {
            text: "Out there. Walking.",
            variants: { dog: "Out there. Sniffing around." },
            then: { line: "Okay but next time: me too. That's it. That's the whole ask." },
          },
          {
            text: "Here and there.",
            then: { line: "I checked both! ... You're sneaky. I respect it enormously." },
          },
          { text: "...", then: { line: "You know what — fair. Mystery walk. I'm just glad you're back." } },
        ],
      },
    ],
  },
  menace: {
    idle: [
      {
        line: "I've been meaning to say something about your outfit.",
        replies: [
          { text: "Go on.", then: { line: "No. I've decided to keep it. Consider yourself intrigued." } },
          {
            text: "Please don't.",
            variants: { menace: "I was about to say the same to you." },
            then: { line: "Restraint. Fine. It suits you. That was the remark, incidentally." },
          },
          { text: "...", then: { line: "Silence. Wise. It was going to be devastating." } },
        ],
      },
    ],
  },
};

export function conversationRoots(form: AdultForm, ctx: ConversationContext): Exchange[] {
  return CONVERSATIONS[form]?.[ctx] ?? [];
}
