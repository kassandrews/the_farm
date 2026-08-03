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
// - SOME ANSWERS ARE REMEMBERED (tranche 2). A `keepsake` files what you said
//   in THAT PERSON'S memory log, and weeks later they bring it up. Sparse on
//   purpose: a tree where every answer is filed is a personality quiz. It is
//   still not a payout — see the field's docblock.

import type { AdultForm } from "./canon/forms";

export interface Reply {
  /** What the player says — the button. Short: it is a reply, not a speech. */
  text: string;
  /** Player-form flavored phrasings of the SAME reply, where a form earns one.
   *  Same meaning, different mouth; the villager's answer doesn't branch on it. */
  variants?: Partial<Record<AdultForm, string>>;
  /** What they say back. */
  then: Exchange;
  /** What they'll REMEMBER you said (Phase 12 tranche 2) — a clause that reads
   *  after "you told me": *that you like a wandering day*. Written to the
   *  memory log when you pick this reply, and brought up weeks later through
   *  the ordinary memory rung.
   *
   *  Optional, and most replies leave it out on purpose: a conversation where
   *  every answer is filed is a personality quiz. Set it only where the answer
   *  is a small true thing about you that a friend would actually retain.
   *
   *  IT IS STILL NOT A PAYOUT. Nothing branches on a keepsake, nothing gates on
   *  one, and no reply is worth more for having it. What it buys is that
   *  somebody remembers — which is what this whole game pays in. */
  keepsake?: string;
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
        line: "I'm surveying residents. One question. Describe the town in one word.",
        replies: [
          {
            text: "Home.",
            keepsake: "you call this place home",
            then: {
              line: "'Home.' ... Everyone says that. The data's unanimous. I keep asking in case it changes. It had better not.",
            },
          },
          {
            text: "Strange.",
            keepsake: "you find this town strange, and stayed anyway",
            then: {
              line: "'Strange.' Finally! A dissenting datum. You're my favourite respondent. Don't tell the sample.",
            },
          },
          {
            text: "...",
            then: { line: "Declined to answer. I'll put you down as 'ineffable'. It's my favourite column." },
          },
        ],
      },
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
          {
            text: "A doing day.",
            keepsake: "you like a day with a job in it",
            then: { line: "YES. I don't know what it is yet but I am IN." },
          },
          {
            text: "A wandering day.",
            keepsake: "you like a wandering day",
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
            variants: {
              menace: "Being magnificent, mostly.",
              gremlin: "Finding things, mostly.",
              carrot: "Growing things, mostly.",
            },
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
  blob: {
    idle: [
      {
        line: "Be honest. My delivery, just now, when you walked up. How was it?",
        replies: [
          {
            text: "Powerful.",
            keepsake: "you thought the pause was the best part",
            then: { line: "I KNEW it. I've been working on the pause. The pause is load-bearing." },
          },
          {
            text: "I missed it.",
            then: { line: ". ... Then I'll do it again. Watch closely. It's subtle. It's enormous." },
          },
          { text: "...", then: { line: "Speechless. ... The correct response. Thank you for your honesty." } },
        ],
      },
    ],
    absence_days: [
      {
        line: "You return! Tell me everything. Set the scene. Where does your story open?",
        replies: [
          { text: "On the road home.", then: { line: "Strong opening. Movement. Purpose. I'm listening." } },
          {
            text: "Nowhere special.",
            variants: { blob: "A quiet act, mostly." },
            then: { line: "'Nowhere special.' Delivered flatly. ... You've been practising. I'm moved." },
          },
          { text: "...", then: { line: "In media res. Bold. ... Later, then. I'll wait for the matinee." } },
        ],
      },
    ],
  },
  gremlin: {
    idle: [
      {
        line: "Quick question. Hypothetical. If a fence post went missing — hypothetically — how soon would you notice?",
        replies: [
          {
            text: "Immediately.",
            then: { line: "Good! Great. Noted. The hypothetical fence is safe. Yours especially." },
          },
          {
            text: "Probably never.",
            then: { line: "See, THAT'S the spirit this town needs more of. Nothing will happen. I'm just delighted." },
          },
          {
            text: "...",
            then: { line: "Not answering. Smart. This conversation was never about fences. It was. It's fine." },
          },
        ],
      },
    ],
    absence_days: [
      {
        line: "You're back! Okay, honesty hour: did you bring anything back? Anything findable?",
        replies: [
          {
            text: "A few things.",
            variants: { gremlin: "Obviously." },
            then: { line: "I KNEW it. I could hear your satchel from here. Good sound." },
          },
          {
            text: "Nothing at all.",
            then: { line: "Travelling light. Respect. More room for whatever finds you on the way home." },
          },
          {
            text: "...",
            then: { line: "Keeping the inventory private. Professional. I'd do the same. I DO the same." },
          },
        ],
      },
    ],
  },
  office: {
    idle: [
      {
        line: "A question, while you're here. Purely for my records, which don't exist. How's the homestead treating you?",
        replies: [
          {
            text: "It's good.",
            then: { line: "Good. I'll make a note. ... There. I made it in my head. Best filing system I've ever used." },
          },
          {
            text: "It's a lot of work.",
            keepsake: "the homestead is a lot of work, and you meant it kindly",
            then: { line: "As the permit intended. The stamp says 'flourish'. Small print. I wrote it." },
          },
          {
            text: "...",
            then: {
              line: "Withheld. Under the old regime I'd have needed that in triplicate. Now it's just a nice quiet moment. Thank you for it.",
            },
          },
        ],
      },
    ],
    absence_days: [
      {
        line: "Back from your travels. Nothing here required you. That's the system working.",
        replies: [
          {
            text: "Good to know.",
            then: { line: "It IS good. A town that runs without anybody being needed. I retired into a masterpiece." },
          },
          {
            text: "Was I missed?",
            then: { line: ". ... Personally? Yes. Administratively, no. The second part is the compliment." },
          },
          { text: "...", then: { line: "Nothing to declare. Correct. There's no one to declare it to." } },
        ],
      },
    ],
  },
  carrot: {
    idle: [
      {
        line: "You keep busy. ... Does it help?",
        replies: [
          { text: "It does.", then: { line: ". ... Good. Carry on, then. Quietly." } },
          {
            text: "Not always.",
            keepsake: "keeping busy doesn't always help",
            then: { line: "No. Not always. ... Stand here a minute. This helps more than people expect." },
          },
          { text: "...", then: { line: ". ... That's the right answer, mostly." } },
        ],
      },
    ],
    absence_weeks: [
      {
        line: "... You were gone a while. The ground mentioned it.",
        replies: [
          { text: "The ground?", then: { line: "We talk. ... It noticed the lighter footsteps. So did I." } },
          {
            text: "I'm back now.",
            then: { line: "So you are. ... That's the part that matters. The rest composts." },
          },
          { text: "...", then: { line: ". ... Fair. It's none of the ground's business either." } },
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
    absence_weeks: [
      {
        line: "Weeks away. I require a single sentence of explanation. Make it good.",
        replies: [
          {
            text: "I was busy.",
            variants: { menace: "I was being magnificent elsewhere." },
            then: { line: "'Busy.' ... Adequate sentence. The delivery carried it. You've learned from me." },
          },
          {
            text: "I missed this place.",
            keepsake: "you missed this place while you were gone",
            then: { line: ". ... Correct answer. The town missed you too. I'm the town, in this instance." },
          },
          { text: "...", then: { line: "No sentence at all. ... Audacious. I'll allow it. Once." } },
        ],
      },
    ],
  },
};

export function conversationRoots(form: AdultForm, ctx: ConversationContext): Exchange[] {
  return CONVERSATIONS[form]?.[ctx] ?? [];
}
