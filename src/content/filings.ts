// The town hall's forms (DESIGN §Paperwork).
//
// Filings are the town's deadpan self-government. A form is a thing you submit
// at Gary's counter, it costs nothing, and — for every row in this file — it
// changes nothing. That is the feature. The joke is that these creatures govern
// themselves this earnestly, at this length, about this little.
//
// FORMS ARRIVE IN BATCHES, AND EACH BATCH HAS A REASON. The hall does not hand
// you a catalogue on day one; it has the forms it has always had, and then a
// referendum happens, or an audit, or somebody opens a drawer, and the town is
// obliged to offer three more. The reason is printed with them and is the best
// part of the whole system — it is the bureaucracy doing what bureaucracy does,
// which is accrete, and it is the town changing around you rather than a list
// you work through.
//
// A BATCH IS A TOTAL FUNCTION OF HOW LONG YOU HAVE LIVED HERE, on the model of
// content/festivals.ts. Nothing schedules a batch, nothing stores one, nothing
// counts them: ask how many days you have been in town and the answer says which
// forms the hall is currently obliged to offer. The only thing in the save is
// what you have actually filed.
//
// VOICE: institutional, straight-faced, and never winking. A form that knows it
// is funny is not funny. The blurb is the form's own text — it should read like
// something a real office would print, applied to something absurd — and the
// stamp is the hall's response, past tense, final, and completely unbothered.
//
// EVERY ROW HERE IS A FLAVOUR FILING. None of them changes a rule. Filings with
// teeth are a separate decision each and deliberately absent (DESIGN §Paperwork,
// ROADMAP 9b) — a park designation, a sanctuary, a declared holiday. Do not add
// one to this table because it would be easy; it would be easy.

export type FilingId =
  // The founding schedule
  | "rename-tuesday"
  | "tiny-mountain"
  | "suspicious-moss"
  | "license-to-haunt"
  | "favourite-rock"
  // The referendum
  | "long-way-round"
  | "intent-to-sit"
  | "unexplained-draught"
  // The audit
  | "cloud-resembling"
  | "second-opinion-puddle"
  | "waiver-wind"
  // The drawer
  | "apology-to-door"
  | "patch-of-shade"
  | "continuation-of-evenings";

export interface FilingDef {
  id: FilingId;
  /** What it is called. This is the line that has to land. */
  title: string;
  /** The form's own text, as printed. One or two sentences; a form that goes on
   *  longer than a form would go on has stopped being a form and become a bit. */
  blurb: string;
  /** What the hall says when it takes it. Past tense, final, unbothered — the
   *  same register as an errands notice, which may never name a task. */
  stamp: string;
}

export interface FilingBatch {
  id: string;
  /** Days you must have lived here before the hall offers these. Real days, on
   *  the real clock — the living world is what real time gates (DESIGN
   *  §Pillars), and a form you have not been offered is not a thing you are
   *  failing to do. */
  afterDays: number;
  /** Why these exist, printed above them at the counter. The reason is the
   *  point; a batch that arrived without one would just be a content drop. */
  notice: string;
  forms: FilingDef[];
}

export const FILING_BATCHES: FilingBatch[] = [
  {
    id: "founding",
    afterDays: 0,
    notice:
      "The following forms are held to have always existed. No record survives of their adoption, and the hall considers the matter settled.",
    forms: [
      {
        id: "rename-tuesday",
        title: "Petition to Rename Tuesday",
        blurb:
          "The undersigned proposes that Tuesday be called something else. A replacement name is not required at this stage and will not be considered if supplied.",
        stamp:
          "Filed. Tuesday has been notified. Tuesday continues, under review, and under its own name for now.",
      },
      {
        id: "tiny-mountain",
        title: "Official Recognition of Tiny Mountain",
        blurb:
          "An application that a raised piece of ground be entered on the register as a mountain. The hall does not maintain a minimum height. The hall has never maintained a minimum height, and would like that on the record.",
        stamp:
          "Filed. It is a mountain. Nothing about it has changed, which is true of most mountains.",
      },
      {
        id: "suspicious-moss",
        title: "Certificate of Suspicious Moss",
        blurb:
          "To certify that moss observed within the town limits was, in the opinion of the observer, up to something. Evidence is not sought. The suspicion is the document.",
        stamp: "Filed. The moss has been certified suspicious. It has not been approached.",
      },
      {
        id: "license-to-haunt",
        title: "License to Haunt",
        blurb:
          "Permission to haunt a location of the applicant's choosing, at hours of the applicant's choosing, to an extent the hall would rather not specify. Renewable. Never renewed.",
        stamp:
          "Filed. You are licensed. The hall wishes to note that nobody has ever asked to see this license.",
      },
      {
        id: "favourite-rock",
        title: "Declaration of a Favourite Rock",
        blurb:
          "The applicant names one rock as their favourite. The declaration is binding on the applicant and on nobody else, least of all the rock.",
        stamp: "Filed. You have a favourite rock now, officially. You had one before.",
      },
    ],
  },
  {
    id: "referendum",
    afterDays: 3,
    notice:
      "Following a referendum, the hall is obliged to offer the forms below. Turnout was one. The hall is not permitted to say which one.",
    forms: [
      {
        id: "long-way-round",
        title: "Application for the Long Way Round",
        blurb:
          "Notice that the applicant intends to take the long way, having been offered a shorter one. No justification is required. A justification, if offered, will be filed unread.",
        stamp: "Filed. You are going the long way. The hall has allowed considerably longer.",
      },
      {
        id: "intent-to-sit",
        title: "Notice of Intent to Sit Down",
        blurb:
          "Advance notice that the applicant intends to sit down. Retrospective filing is accepted, and is how this form is almost always used.",
        stamp: "Filed. The hall has noted your intention and, in a small way, envies it.",
      },
      {
        id: "unexplained-draught",
        title: "Registration of an Unexplained Draught",
        blurb:
          "To register a draught for which no source can be found. The hall has been unable to find the source of any draught ever registered, and has stopped looking as a matter of policy.",
        stamp:
          "Filed. The draught is now a registered draught. It continues, registered.",
      },
    ],
  },
  {
    id: "audit",
    afterDays: 10,
    notice:
      "An audit has found that the hall was operating without a complete schedule of forms. The audit was conducted by the hall. The following were added the same afternoon.",
    forms: [
      {
        id: "cloud-resembling",
        title: "Affidavit of a Cloud Resembling Something",
        blurb:
          "Sworn statement that a cloud resembled a thing. The thing need not be named. The cloud is understood to have moved on and no longer to resemble it.",
        stamp: "Filed. The resemblance is now a matter of record, and of nothing else.",
      },
      {
        id: "second-opinion-puddle",
        title: "Request for a Second Opinion on a Puddle",
        blurb:
          "Application for a further opinion regarding a puddle, the first opinion having been unsatisfactory. The hall holds one opinion on puddles and will be reissuing it.",
        stamp: "Filed. The second opinion is enclosed. It is the first opinion, retyped.",
      },
      {
        id: "waiver-wind",
        title: "Waiver of Responsibility for the Wind",
        blurb:
          "The applicant waives all responsibility for the wind, its direction, and anything it may have carried off. The hall accepts this waiver and offers no counter-position.",
        stamp:
          "Filed. Neither of us is responsible for the wind. This has always been the case; it is written down now.",
      },
    ],
  },
  {
    id: "drawer",
    afterDays: 21,
    notice:
      "A drawer was opened. The forms below were inside it, already printed, in a hand nobody recognises. They have been added to the schedule rather than discussed.",
    forms: [
      {
        id: "apology-to-door",
        title: "Instrument of Apology to a Door",
        blurb:
          "A formal apology to a door, for an incident the form does not require you to describe. The door will not be informed. Doors are not informed.",
        stamp: "Filed. The apology stands. The door stands. Nothing further is proposed.",
      },
      {
        id: "patch-of-shade",
        title: "Provisional Title to a Patch of Shade",
        blurb:
          "Provisional title over a patch of shade, valid while the shade is there. The hall wishes to draw attention to the word provisional, and to the sun.",
        stamp: "Filed. The shade is yours, provisionally, and is already somewhere else.",
      },
      {
        id: "continuation-of-evenings",
        title: "Standing Order for the Continuation of Evenings",
        blurb:
          "A standing instruction that evenings continue to occur. The hall has no mechanism for this and has never let that stop it filing anything.",
        stamp:
          "Filed. Evenings will continue. The hall claims no credit and accepts none of the blame.",
      },
    ],
  },
];

/** Every form the hall has ever printed, flat. Order is batch order, which is
 *  the order the town acquired them — the only order the cabinet cares about. */
export const FILINGS: FilingDef[] = FILING_BATCHES.flatMap((b) => b.forms);

export function filingDef(id: FilingId): FilingDef {
  const found = FILINGS.find((f) => f.id === id);
  if (!found) throw new Error(`no filing ${id}`);
  return found;
}

/** Which batches the hall is currently obliged to offer, oldest first.
 *
 *  A total function of one number, like `festivalOn` is of a date. Takes days
 *  rather than a world so it stays arithmetic — testable without building a
 *  town, and impossible to accidentally make depend on anything stored. */
export function batchesBy(daysHere: number): FilingBatch[] {
  return FILING_BATCHES.filter((b) => daysHere >= b.afterDays);
}
