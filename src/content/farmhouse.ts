// Set Three: Farmhouse — the homely one, and the first set authored from the
// owner's own reference photographs rather than from a period.
//
// WHAT A SET MAY OWN IS THE SILHOUETTE (sets.ts), so the warmth everybody
// pictures when they say "farmhouse" — the wood, the cream paint, the sage —
// is NOT here. That is the finish axis and it rides free; `whitewash`, `bone`,
// `sage`, `ochre` and `oxblood` were already in the wood class before this set
// existed, which is why Farmhouse brings almost nothing with it. What it owns
// is four moves, read off five photographs and confirmed by the owner:
//
//   1. TURNED, NOT TAPERED. The differentiator, and it is in nearly every
//      photograph — the dining table, the Windsor chairs, the nightstand, the
//      dresser's feet. Core's leg is a plain post and Moderne's is a straight
//      taper; this one has a PROFILE. At sixteen pixels a turn is a leg that
//      steps out two pixels for two rows and back in, and that is enough: any
//      more and it reads as a lump rather than a lathe.
//   2. THE TOP IS A SLAB. Thick, with a readable edge. Moderne's rule is that
//      tops lose a row; this set's is the reverse — the top GAINS one and you
//      can see how deep it is.
//   3. SOFT THINGS SIT DOWN, WOODEN THINGS STAND UP. The sofa is slipcovered
//      to the floor with no legs at all, while every table and case piece is
//      lifted on its turnings. Neither other set has that internal contrast:
//      core plinths everything and Moderne lifts everything.
//   4. SPINDLES AND PANELS. A back is thin vertical spindles under a bowed
//      rail; a door or a drawer is a recessed panel with a small round knob.
//      Core's back is a ladder and Moderne's is a solid shell, so spindles
//      were unclaimed.
//
// THE SOFA IS THE PIECE THIS SET WILL BE JUDGED ON, and it is also the one
// that would have collided with Set Four. Retro is legless too, so without a
// rule the two sets draw the same couch twice. The rule, settled before either
// was drawn: FARMHOUSE HAS DEFINED BACK CUSHIONS AND ROLLED ARMS — soft,
// baggy, an uneven top line — and retro will have one back and one seat
// cushion, crowned taller at the middle than at the edges.
//
// PILOT PIECES FIRST, Moderne's own precedent (ROADMAP §Set Two): chair,
// dresser, sofa, lamp — a seat, a box, a soft thing and a stand, because the
// other twenty-three forms inherit from those four. Until the set covers every
// form `sets.test.ts` FAILS ON THE HOLES BY DESIGN; the red tests are the
// authoring checklist, and the set ships when they turn into the proof of
// completeness instead.

import type { FurnitureId } from "./furniture";
import type { PieceArt } from "../render/furnishings";
import { INK } from "../render/furnishings";

/** Pieces drawn so far — four pilots, awaiting the owner's walk. */
export const FARMHOUSE_ART: Partial<Record<FurnitureId, PieceArt>> = {
  // THE WINDSOR BACK, which is the set's loudest sentence: four spindles under
  // a bowed crest whose corners are knocked off a pixel. The gap up the middle
  // is two pixels rather than one, because an even count cannot centre and a
  // Windsor never had a spindle in the middle anyway.
  //
  // THE SPINDLES STAY OPEN, and that was tested rather than assumed. Told the
  // chair looked "really cartoonish" the fix tried first was filling the back
  // and cutting the spindles as grooves — mass instead of outline, and it also
  // stopped the floor's plaid showing through. The owner preferred the open
  // one anyway, which located the actual complaint: it was never the back. A
  // see-through Windsor back is the point of a Windsor back.
  //
  // The seat is four rows where core's is three — rule 2, and a chair is where
  // you can least afford to lose it, since the seat is the only slab on the
  // piece. Legs turn once, high, just under the seat, and swell again at the
  // foot; the long plain shaft between them is what makes the two turnings
  // read as turnings rather than as a wobble. ONE SWELL, AND IT IS THE FOOT
  // (owner, 20 Aug, in three passes). A turn high under the seat read as a
  // bracket rather than a lathe; two of them near the ankle read as a blob (at
  // five pixels against three, two swells three rows apart are noise, not a
  // turning); one swell partway down still read as a bowtie hung on a stick.
  // What works is the swell at the very END — a plain shaft the whole way down
  // landing on a ball foot, which is what the eye expects a lathe to leave
  // behind. The seat took the rows the top turn gave up: eight now, rule 2
  // spent where a chair can least afford to lose it.
  //
  // AND AN APRON UNDER THE SEAT (owner, 20 Aug), the SEAT'S OWN FULL WIDTH —
  // inset a pixel was tried first and the seat then read as overhanging a
  // narrower rail, which is a dining table's profile, not a chair's. A chair's
  // seat and its rail are one block. It does two jobs for four rows: it gives the seat a
  // visible UNDERSIDE, which is what says the slab has depth rather than being
  // a painted line, and it is where the leg length went. The box is fixed at
  // rise + 16 + 14, so a chair cannot simply have shorter legs — something
  // above them has to take the rows, and a rail between the leg tops is what a
  // real chair puts there anyway.
  chair: {
    mirrorW: true,
    rise: 6,
    s: {
      rows: [
        "................",
        "...kkkkkkkkkk...",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kkkkkkkkkkkk..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..k.k.k..k.k.k..",
        "..kkkkkkkkkkkk..",
        "..kttttttttttk..",
        "..kttttttttttk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "...kck....kck...",
        "..kccck..kccck..",
        "..kccck..kccck..",
        "..kkkkk..kkkkk..",
      ],
      palette: { k: INK },
    },
  },

  // THE CASE PIECE, and the argument for rule 2 in one drawing: five rows of
  // top over three drawers, where core spends six on the top and Moderne five.
  // The drawers are RECESSED PANELS — an inner rectangle held off the drawer's
  // edge by a pixel of face — with one small round knob each, centred. Core
  // puts two pulls on a drawer this wide; one knob is the older furniture and
  // the quieter row.
  //
  // BUN FEET, not legs. A turning this short is all the lift a case piece gets
  // here — rule 3 cuts the other way for wooden things, but a dresser that
  // stood on a chair's legs would be a sideboard.
  dresser: {
    mirrorW: true,
    s: {
      rows: [
        "................................",
        "................................",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kttttttttttttttttttttttttttttk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kssssssssssssssssssssssssssssk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcksssssssssssddssssssssssskck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcksssssssssssddssssssssssskck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        ".kcccccccccccccccccccccccccccck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcksssssssssssddssssssssssskck.",
        ".kckkkkkkkkkkkkkkkkkkkkkkkkkkck.",
        ".kcccccccccccccccccccccccccccck.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "..kccck..................kccck..",
        "..kkkkk..................kkkkk..",
      ],
      palette: { k: INK, d: "#8a7355" },
    },
    e: {
      rows: [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        ".kttttttttttttk.",
        ".kcccccccccccck.",
        ".kcccccccccccck.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "..kccck..kccck..",
        "..kkkkk..kkkkk..",
      ],
      palette: { k: INK },
    },
  },

  // SLIPCOVERED TO THE FLOOR. No legs, no plinth, no daylight underneath — the
  // skirt simply reaches the boards, which is rule 3 and the thing that makes
  // this couch unmistakably not Moderne's. The back divides into three defined
  // cushions and the arms roll: their top row steps in a pixel, and one pixel
  // is a roll at this size.
  //
  // The side view is core's grammar (ROADMAP §the turned-views rule) with the
  // legs taken off: the back runs the length down one side, the arms cap the
  // two ends, the cushions divide along the length — and the skirt meets the
  // floor instead of standing on anything.
  sofa: {
    mirrorW: true,
    rise: 4,
    s: {
      rows: [
        "................................................",
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kttttttttttttttttttttttttttttttttttttttttttttk.",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kccccccccccccccckcccccccccccccckccccccccccccccck",
        "kccccccccccccccckcccccccccccccckccccccccccccccck",
        "kccccccccccccccckcccccccccccccckccccccccccccccck",
        "kccccccccccccccckcccccccccccccckccccccccccccccck",
        "kccccccccccccccckcccccccccccccckccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        ".kkkkcccccccccccccccccccccccccccccccccccccckkkk.",
        "ktttkccccccccccccccccccccccccccccccccccccccktttk",
        "kccckcccccccccccccccccccccccccccccccccccccckccck",
        "kccckcccccccccccccccccccccccccccccccccccccckccck",
        "kccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckttttttttttttkttttttttttttkttttttttttttkccck",
        "kccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kcccccccccccccccccccccccccccccccccccccccccccccck",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kssssssssssssssssssssssssssssssssssssssssssssssk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
      ],
      palette: { k: INK },
    },
    e: {
      rows: [
        "................",
        "................",
        "................",
        "................",
        "kkkk............",
        "kttk............",
        "kcck............",
        "kcck............",
        "kcck............",
        "kcckkkkkkkkkkkkk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kcckkkkkkkkkkkkk",
        "kcckccccccccccck",
        "kcckccccccccccck",
        "kcckccccccccccck",
        "kcckccccccccccck",
        "kcckkkkkkkkkkkkk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kcckkkkkkkkkkkkk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kcckkkkkkkkkkkkk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kccktttttttttttk",
        "kkkkkkkkkkkkkkkk",
        "kttttttttttttttk",
        "kttttttttttttttk",
        "kttttttttttttttk",
        "kkkkkkkkkkkkkkkk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kkkkkkkkkkkkkkkk",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kcccccccccccccck",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kssssssssssssssk",
        "kkkkkkkkkkkkkkkk",
      ],
      palette: { k: INK },
    },
  },

  // A BIG CONICAL SHADE ON A TURNED COLUMN — the lamp in three of the five
  // photographs, and the one piece where the cone does the talking. It widens
  // a pixel a side per row for six rows, which is as steep as sixteen pixels
  // allows before the shade becomes a triangle.
  //
  // The column turns twice, high and low, around a long plain shaft, and lands
  // on a disc rather than a tripod: Moderne's floor lamp is a globe on three
  // splayed legs, so a foot that splayed would be reaching into its territory.
  //
  // THE SHADE IS CREAM AND NOT THE FINISH (owner, 20 Aug) — `l`/`m` are the
  // renderer's own SHADE_CLOTH and SHADE_CLOTH_LIT, which Moderne's lamp
  // already wears, so both sets' shades are the same cloth over different
  // silhouettes. A shade that asked the finish came back stainless.
  lamp: {
    mirrorW: true,
    s: {
      rows: [
        "................",
        "......kkkk......",
        ".....kmmmmk.....",
        "....kllllllk....",
        "...kllllllllk...",
        "..kllllllllllk..",
        ".kllllllllllllk.",
        ".kkkkkkkkkkkkkk.",
        "......kcck......",
        "......kcck......",
        ".....kccccck....",
        ".....kccccck....",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        "......kcck......",
        ".....kccccck....",
        ".....kccccck....",
        "....kkkkkkkk....",
        "...kcccccccck...",
        "...kcccccccck...",
        "..kcccccccccck..",
        "..kcccccccccck..",
        "..kkkkkkkkkkkk..",
      ],
      palette: { k: INK, l: "#e8dfc8", m: "#f6efdf" },
    },
  },
};
