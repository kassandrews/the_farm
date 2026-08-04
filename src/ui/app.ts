// The app shell: builds the canvas + HUD, runs the fixed-timestep game loop,
// routes touch/keyboard input into the sim, and drives the modal flows (title,
// onboarding, the land-claim opening beat, dialogue, the "while you were out"
// postcard). This is the ui layer — the only place DOM events meet the sim.

import { el, hoverHint, modal } from "./dom";
import { mountTitleScene, type TitleScene } from "./title";
import { Renderer } from "../render/renderer";
import { iconEl, gridEl, SCALE } from "../render/icons";
import { furnitureThumb, thumbBox } from "../render/thumbs";
import { portrait } from "../render/portrait";
import { lookFor } from "../content/looks";
import type { IconName } from "../content/icons";
import { SPOTS } from "../content/spots";
import type { WorldState, Tool, BuildTool, HomesteadSpot, Layer, Villager } from "../sim/types";
import { FACINGS, FURNITURE, furnitureDef } from "../content/furniture";
import type { FurnitureId } from "../content/furniture";
import type { Facing } from "../content/furniture";
import {
  newWorld,
  tick,
  contextAction,
  buildAt,
  talk,
  moveTo,
  completeLandClaim,
  summarizeAway,
  toolAllowedOn,
  playerTile,
  toolFinishes,
  loadedFinish,
} from "../sim/game";
import { nodeAt } from "../sim/gather";
import { isWalkable } from "../sim/world";
import { officeLandClaimLine, homeLineFor, givenLine, companyYesLine, companyByeLine, gameYesLine, gameFoundLine, gameGiveUpLine, gameOfferLine, sittingLine, lookAtLine, advanceReply, replyLabel } from "../sim/dialogue";
import { canPlay, startPlay, playing, foundThem, foundIt, spyChoices, lookKindNear, offerDue, satLineDue, endPlay } from "../sim/play";
import { GAMES } from "../content/games";
import type { Reply as ReplyDef } from "../content/conversations";
import { companion, canInvite, invite, partWays } from "../sim/company";
import { describeHome } from "../sim/home";
import { saveWorld, loadWorld, hasSave, clearWorld } from "../sim/save";
import { makeRng } from "../sim/rng";
import type { Rng } from "../sim/rng";
import { clockLabel } from "../sim/time";
import { surveyLabel } from "../sim/survey";
import { freezeBuilt } from "../sim/freeze";
import { STANDARD_FORMS, FORMS } from "../content/canon/forms";
import type { AdultForm } from "../content/canon/forms";
import { importFromMeadow } from "../sim/meadow_import";
import type { MeadowImport } from "../sim/meadow_import";
import { recall, remember, hasMemory } from "../sim/memory";
import { count } from "../sim/inventory";
import { beginStroke, captureCell, endStroke, undoStroke, canUndo, undoLabel } from "../sim/undo";
import { qualify, assign, beds, rehomeAcrossStroke, bedKeys, pendingRehome, DISQUALIFIER_TEXT } from "../sim/assign";
import { counterBatches, cabinet, cabinetEmpty, file } from "../sim/filings";
import { journalPages, journalEmpty } from "../sim/notebook";
import type { CharId, NewcomerId } from "../content/cast";
import { isNewcomer, isSecret, CAST, charDef } from "../content/cast";
import { present } from "../sim/presence";
import { humLevel } from "../sim/hum";
import {
  openCommission,
  commissionFor,
  commissionState,
  stampCommission,
  fileCommission,
  arrivalOf,
  shortfallText,
} from "../sim/commission";
import { ITEM_ORDER, itemDef, itemLabel } from "../content/items";
import { offers, trade } from "../sim/shop";
import { heapOffers, heapExhausted, redeem } from "../sim/heap";
import { donatable, donate, collection, collectionEmpty, wingsWithDonations } from "../sim/museum";
import { openErrand, errandState, cardText, deliverErrand, declineErrand, notices } from "../sim/errands";
import { festivalOn, activeFestival, nextFestival, lastFestival, daysUntil, attend } from "../sim/festival";
import { availableSkinsForClasses, skinDef } from "../content/skins";
import type { SkinId } from "../content/skins";
import { cropDef, ripenHours } from "../content/crops";
import { STALL_OPENER, STALL_EXHAUSTED } from "../content/seedstall";
import {
  seedOffers,
  varietyOffers,
  varietiesExhausted,
  buySeed,
  unlockVariety,
  plantable,
  selectCrop,
} from "../sim/seeds";
import { audio } from "./audio";
import type { Cue } from "./audio";
import type { ActionKind } from "../sim/game";

/** Which cue a successful action earns. */
const ACTION_CUES: Record<ActionKind, Cue> = {
  dig: "dig",
  gather: "harvest",
  plank: "place",
  plant: "plant",
  water: "water",
  harvest: "harvest",
  read: "menu", // a panel opens; the menu cue is what a panel opening sounds like
  // No panel for a letter — it flashes a line, like every other small thing the
  // world says. See doAction: `read` is caught before the cue, `letter` is not.
  letter: "menu",
  // A house telling you what it remembers is a line, not a panel — the letter's
  // shape exactly. It reports `changed: false`, so doAction has to catch it
  // before the cue or the ordinary "nothing moved" rule would play the REFUSAL
  // sound at a room answering a question correctly.
  remember: "menu",
  // Folding a tent is putting something away, which is the place cue backwards.
  // There is no ceremony sound and it should not get one.
  strike: "place",
  sink: "dig", // still the shovel — it's the second dig on the same tile
  carve: "dig",
  shaft: "place", // a foot on a rung: the closest thing here to a solid landing
  stair: "place", // and a foot on a step, which is the same sound and the same idea
  none: "menu",
};

const FIXED_DT = 1 / 60; // seconds per sim step
const AUTOSAVE_MS = 15_000;

// Two palettes, because there are two ways to touch the world (DESIGN
// §Structures). ACT tools apply to the tile at your feet via the action button.
// BUILD tools put you in build mode: the view flattens and you tap the map.
//
// The two used to be on screen at once, facing each other across the field, and
// the right-hand one landed on top of the ACT button. That layout was arguing
// that both ways of touching the world are available at the same instant, which
// they never were — holding a build tool already suppressed acting. Build mode
// is now a mode you enter with a button and leave the same way, and its tools
// only exist while you're in it.
//
// `hint` is the hover descriptor (desktop only — see `hoverHint`). It says what
// the button DOES, not what it is: the icon and label already carry the noun,
// so a hint that repeats it is worth nothing to the person hovering. `key` is
// the desktop shortcut where one exists; the hint is the only place they're
// written down, since a keyboard legend would be HUD clutter on a phone.
const TOOLS: { id: Tool; icon: IconName; label: string; hint: string; key?: string }[] = [
  { id: "dig", icon: "spade", label: "Dig", hint: "Turn the ground into soil you can plant in.", key: "1" },
  { id: "gather", icon: "basket", label: "Gather", hint: "Pick what's ripe, or fell a tree or rock beside you.", key: "2" },
  { id: "plant", icon: "seedling", label: "Plant", hint: "Sow a seed in tilled soil.", key: "3" },
  { id: "water", icon: "droplet", label: "Water", hint: "Water what's planted. Growth resumes.", key: "4" },
];

/** The build bar's tabs, in the order they appear.
 *
 *  THE BAR OUTGREW ONE ROW. Eleven tools fitted; twenty-two is a row you read
 *  along rather than see, and the far end of it is somewhere you have to go
 *  looking. So the tools are grouped and the row shows one group at a time.
 *
 *  Grouped by WHAT THE THING IS, not by what it costs or which finish it takes,
 *  because that is the question you actually arrive with: you want somewhere to
 *  sit, and then you choose between a stool and a bench. Cost is what you
 *  discover second, and the hint already carries it.
 *
 *  `structure` is first and holds erase, so the group you land in is the one
 *  that makes rooms — furniture is meaningless until there is a room to put it
 *  in, and that ordering is also the order somebody builds in.
 *
 *  IT IS TWO LEVELS NOW, not six tabs side by side. Structure is not a category
 *  of furniture and was never comparable to Seating: a wall is what you make a
 *  room OUT of, and a bed is what you put in it. Six peers across the top said
 *  otherwise, and it meant the categories of a thing you were not doing sat over
 *  the bar the whole time you were laying floors. So structure has no tab — it is
 *  the row you land in — and FURNITURE is a button in that row, in the series
 *  with Wall and Window, which opens the five categories below. `structure` stays
 *  in this table because it is still a group in the tool sense; `tab: false` is
 *  what keeps it out of the strip. */
const BUILD_GROUPS = [
  { id: "structure", label: "Build", tab: false },
  { id: "seating", label: "Seating", tab: true },
  { id: "surface", label: "Tables", tab: true },
  { id: "sleep", label: "Beds", tab: true },
  { id: "storage", label: "Storage", tab: true },
  { id: "decor", label: "Light", tab: true },
] as const;
type BuildGroup = (typeof BUILD_GROUPS)[number]["id"];

/** Device px per scene px in a catalogue tile. A WHOLE NUMBER, and the sprite
 *  rule is the whole reason (CLAUDE.md): the art is authored at 16 scene px to
 *  the tile, so 2 doubles every pixel and anything fractional resamples the
 *  outlines off the grid. Two rather than three because a two-tile piece is 32
 *  scene px across, and 64 device px is a tile you can put five of in a row. */
const THUMB_SCALE = 2;

/** Everything behind the Furniture button — derived from the table rather than
 *  listed again, so a new category is one row and not two places to remember. */
const FURNITURE_GROUPS: BuildGroup[] = BUILD_GROUPS.filter((g) => g.tab).map((g) => g.id);

const BUILD_TOOLS: { id: BuildTool; icon: IconName; label: string; hint: string; group: BuildGroup }[] = [
  { id: "floor", icon: "plank", label: "Floor", hint: "Lay a floor. Boards or flagstones — pick the finish below.", group: "structure" },
  { id: "wall", icon: "wall", label: "Wall", hint: "Raise a wall. Close a shape and it gets a roof.", group: "structure" },
  { id: "door", icon: "door", label: "Door", hint: "Cut a doorway. Put it on a south wall so it shows.", group: "structure" },
  // Beside the door, because it is the other opening and the two are chosen
  // against each other. The hint says the thing you cannot see from the icon:
  // a window is still wall, and a row of them is one window.
  { id: "window", icon: "window", label: "Window", hint: "Still a wall — you just see through it. Side by side, they join up.", group: "structure" },
  { id: "erase", icon: "takedown", label: "Take back down", hint: "Remove what you built here. Materials come back.", group: "structure" },

  { id: "chair", icon: "chair", label: "Chair", hint: "Place a chair. Press R to turn it.", group: "seating" },
  { id: "stool", icon: "stool", label: "Stool", hint: "A chair with the back question settled.", group: "seating" },
  { id: "bench", icon: "bench", label: "Bench", hint: "Two tiles of sitting. Press R to turn it.", group: "seating" },
  { id: "sofa", icon: "sofa", label: "Sofa", hint: "Costs wood and cloth. The Menace sells cloth.", group: "seating" },
  { id: "cushion", icon: "cushion", label: "Cushion", hint: "Costs cloth. The Menace sells cloth.", group: "seating" },

  { id: "table", icon: "table", label: "Table", hint: "Place a table. Press R to turn it.", group: "surface" },
  { id: "coffeetable", icon: "coffeetable", label: "Coffee table", hint: "A table, lower. Low enough to step over.", group: "surface" },
  { id: "desk", icon: "desk", label: "Desk", hint: "Drawers one end, room for your knees the other.", group: "surface" },
  { id: "nightstand", icon: "nightstand", label: "Nightstand", hint: "Small. Goes beside a bed, holds a lamp.", group: "surface" },

  { id: "bed", icon: "bed", label: "Bed", hint: "A bed makes a room somewhere to live.", group: "sleep" },
  { id: "cot", icon: "cot", label: "Cot", hint: "Cheap, and it shows. Costs a little cloth.", group: "sleep" },

  { id: "shelf", icon: "shelf", label: "Bookshelf", hint: "Place a bookshelf. Press R to turn it.", group: "storage" },
  { id: "wardrobe", icon: "wardrobe", label: "Wardrobe", hint: "The tallest thing that will fit in a room.", group: "storage" },
  { id: "dresser", icon: "dresser", label: "Dresser", hint: "Three drawers, two tiles wide. Press R to turn it.", group: "storage" },
  { id: "chest", icon: "chest", label: "Chest", hint: "A box. Shut. It came that way.", group: "storage" },

  { id: "lamp", icon: "lamp", label: "Floor lamp", hint: "Costs ore. Give the dark something to argue with.", group: "decor" },
  { id: "desklamp", icon: "desklamp", label: "Desk lamp", hint: "Costs ore. Half a lamp, for one corner.", group: "decor" },
  { id: "rug", icon: "rug", label: "Rug", hint: "Costs cloth. Walk right over it.", group: "decor" },
  // The one tool that wants a WALL under it rather than a floor, which the hint
  // has to say outright — a tool that refuses everywhere you point it reads as
  // broken long before it reads as specific.
  { id: "painting", icon: "painting", label: "Painting", hint: "Hangs on a wall. Point it at one.", group: "decor" },
];

/** What the undo control calls the last stroke. A phrase, not a tool name, so it
 *  drops into "Undo the wall" — after twenty minutes of building, the thing you
 *  regret and the thing you did last aren't reliably the same, and naming it is
 *  how the button says which one you're getting. */
function buildToolLabel(t: BuildTool): string {
  if (t === "erase") return "taking that down";
  const def = BUILD_TOOLS.find((b) => b.id === t);
  return def ? `the ${def.label.toLowerCase()}` : "that";
}

/** Arrows for the rotate button, so the facing is legible without a legend. */
const FACING_ARROW: Record<Facing, IconName> = { s: "arrow_s", w: "arrow_w", n: "arrow_n", e: "arrow_e" };

/** How far the build bar sits off the bottom of the screen — the `bottom` in
 *  style.css `.build-bar`, repeated here because `flash()` stacks the toast on
 *  top of the bar and has to know where its underside is. Keep the two in step. */
const BUILD_BAR_BOTTOM = 16;

/** Which zoom step the view is on. Its own key beside `the-farm-muted`, and
 *  pointedly not inside `the-farm-save` — see the Zoom section in App. */
const ZOOM_KEY = "the-farm-zoom";


export class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private world: WorldState | null = null;
  private rng: Rng = makeRng(1);
  private tool: Tool = "dig";
  /** Non-null means BUILD MODE: the view flattens and canvas taps place instead
   *  of walking. Null means the normal 3/4 living view. */
  private buildTool: BuildTool | null = null;
  /** Whether the shaft has already said what going down is like this session. */
  private saidShaftLine = false;
  /** A node you tapped and are walking over to deal with. UI state, never the
   *  save: an errand you were on when you closed the tab is not one the town
   *  should still be holding you to when you come back. */
  private walkingToAct: { x: number; y: number } | null = null;
  /** What re-entering build mode hands you. Coming back to a wall you were
   *  halfway through and having to say "wall" again is the kind of small tax
   *  that makes a mode feel like a detour rather than a place. */
  private lastBuildTool: BuildTool = "wall";
  /** Which tab of the build bar is showing. Not persisted: it follows the tool
   *  you are holding (see syncBuildUi), so restoring it separately could put the
   *  bar on a tab that does not contain the selected tool. */
  private buildGroup: BuildGroup = "structure";
  /** Which category the Furniture button reopens on. Session-only and pointedly
   *  not saved: it is where you were a minute ago, not a setting. */
  private lastFurnitureGroup: BuildGroup = "seating";
  /** Tiles already painted during the current drag, so dragging back and forth
   *  over one tile doesn't re-charge or re-message for it. */
  private painted = new Set<string>();
  /** Every finger currently on the canvas in build mode. One paints; two pan. */
  private pointers = new Map<number, { x: number; y: number }>();
  /** Where the panning gesture's midpoint was last frame, or null when nobody is
   *  panning. Non-null IS "a pan is in progress". */
  private panAnchor: { x: number; y: number } | null = null;
  /** The beds standing when the current stroke opened, so a stroke that moves
   *  one can carry its sleeper across (sim/assign.ts §"The moved-bed seam"). */
  private strokeBeds: Set<string> | null = null;
  /** Who we're choosing a home for, while the player picks a bed. Null the rest
   *  of the time — this is a transient targeting mode, not a stored selection. */
  private assigning: CharId | null = null;
  /** Which way the next multi-tile piece goes down. Sticky between placements —
   *  you usually put two chairs down the same way round. */
  private facing: Facing = "s";
  private keys = new Set<string>();
  private acc = 0;
  private last = performance.now();
  private raf = 0;
  private lastSaveAt = 0;
  private hud!: HudRefs;
  private modalOpen = false;
  /** Set while tearing down for a "new town". Every save path checks it: the
   *  reset clears storage and reloads, and an unguarded autosave / unload
   *  handler firing in that window would write the old world straight back and
   *  silently cancel the reset. */
  private resetting = false;

  constructor(root: HTMLElement) {
    this.canvas = el("canvas", { id: "scene" });
    root.append(this.canvas);
    this.renderer = new Renderer(this.canvas);
    this.hud = buildHud(
      root,
      (t) => this.selectTool(t),
      (t) => this.selectBuildTool(t),
      (g) => this.selectBuildGroup(g),
      () => this.openFurniture(),
      () => this.toggleBuild(),
      () => this.rotate(),
      () => this.doUndo(),
      () => this.doAction(),
      () => this.openMenu(),
      () => this.openSatchel(),
      () => this.openNotebook(),
      () => this.cycleZoom(),
    );
    this.hud.giveUp.addEventListener("click", () => this.giveUpGame());
    this.wireInput();
    this.restoreZoom();
    window.addEventListener("resize", () => {
      this.renderer.resize();
      // The ladder is a property of the viewport, so a resize can retire the
      // step the view was on (renderer.resize re-clamps it) or hand a narrow
      // window back its missing steps. Either way the button has to catch up.
      this.refreshZoom();
    });
  }

  /** Entry: continue an existing save (with a welcome-back postcard) or run the
   *  title → onboarding → land-claim flow for a fresh town. */
  start(): void {
    if (hasSave()) {
      const loaded = loadWorld();
      if (loaded) {
        this.beginWorld(loaded);
        this.showPostcardIfAny();
        return;
      }
    }
    this.showTitle();
  }

  private beginWorld(world: WorldState): void {
    // The title screen's farm goes now, not when its card closed: the land-claim
    // cutscene runs straight after this, and the real world is already drawing
    // underneath it. Two render loops painting full-viewport canvases at once is
    // a frame budget spent on a picture nobody can see any more.
    this.titleScene?.destroy();
    this.titleScene = null;
    this.world = world;
    this.rng = makeRng(world.seed);
    // The catch-up for towns built before the freeze existed (ROADMAP §Phase 11).
    // Here rather than in the v31 migration, because a migration is frozen in
    // time by contract and this one would have had to call live `rooms()` code —
    // and because running on EVERY load at every version makes it self-healing
    // rather than a single moment that either worked or did not. Idempotent, so
    // the second load does nothing.
    freezeBuilt(world);
    this.renderer.snapCamera(world);
    this.hud.root.style.display = "";
    this.loop();
  }

  private showPostcardIfAny(): void {
    if (!this.world) return;
    const lines = summarizeAway(this.world, Date.now(), this.rng);
    if (lines.length === 0) return;
    this.openModal(
      (close) =>
        panel("A postcard from the Farm", "While you were out", [
          // One paragraph per piece of news.
          //
          // This used to be a single <p> joining the lines with "\n ... ". Two
          // things wrong with that: the house ellipsis is a pause INSIDE a
          // sentence ("Cloth ... You can't grow it"), so at the start of a
          // line it is a full stop with no word in front of it — and a bare
          // newline in its place left a piece of news that wrapped looking
          // exactly like two pieces of news. Separate paragraphs give the
          // spacing that says which is which, and every line is already a
          // complete sentence.
          ...lines.map((line) => el("p", {}, [line])),
          actionRow([primaryBtn("Back to it", close)]),
        ]),
      { dismissable: true },
    );
  }

  // --- Title + onboarding -----------------------------------------------------
  /** The farm behind the title and settle-in cards. Lives for both of them and
   *  is torn down when the world begins — see `beginWorld`. */
  private titleScene: TitleScene | null = null;

  private showTitle(): void {
    this.hud.root.style.display = "none";
    this.titleScene ??= mountTitleScene(document.body);
    this.openModal(
      (close) =>
        panel("Welcome to the Farm!", "", [
          // "All we need is someone to stamp the paperwork" rather than the older
          // "Someone stamped the paperwork": the same joke, but it hands the job
          // to the player instead of reporting it as already done, and the
          // Office Creature stamps their claim two screens later (runLandClaim).
          //
          // The pause goes at the END here, which the house style otherwise
          // doesn't do. It isn't a beat between two clauses — it's the sentence
          // trailing off into the thing you are about to be walked into, and the
          // Arrive button underneath is what finishes it.
          el("p", {}, [
            "It's real. And it's delightful. All we need is someone to stamp the paperwork ...",
          ]),
          actionRow([
            primaryBtn("Arrive", () => {
              close();
              this.showOnboarding();
            }),
          ]),
        ]),
      { scrimClass: "over-scene" },
    );
  }

  private showOnboarding(): void {
    let name = "";
    let form: AdultForm = "scholar";
    let spot: HomesteadSpot = "riverside";

    const nameInput = el("input", {
      class: "text-field",
      placeholder: "Your name",
      value: "",
    }) as HTMLInputElement;
    // The card will not let you past without a name. It used to fall back to
    // "New Sprite", which put the one anonymous person in a town where everybody
    // else is named on purpose — and it is the player, so it is the name the
    // menu shows you every time you open it.
    //
    // Gating beats defaulting here, and the reason is the same one `content/
    // names.ts` gives for arrivals carrying literal names rather than generated
    // ones: a name nobody decided to give is a name nobody chose. Dealing one
    // out of the form's register would have been the prettier fix and still says
    // "the game named you". Two seconds of typing says otherwise.
    const claimable = (): boolean =>
      // …unless a Meadow sprite is being EMBODIED, in which case it arrives with
      // its own name and the box is disabled — gating on an input the card has
      // deliberately switched off is a dead end with no way to see why.
      nameInput.value.trim() !== "" || (meadowImport !== null && importRole === "player");
    const refreshClaim = (): void => {
      (claimBtn as HTMLButtonElement).disabled = !claimable();
    };
    nameInput.addEventListener("input", () => {
      name = nameInput.value;
      refreshClaim();
    });

    // Faces, not a list of words: you are choosing which sprite you are, and
    // until you have seen one "Gremlin" is a noun. The tile shows the same
    // portrait the dialogue box will show, so the choice and its consequence
    // are literally the same picture.
    const formRow = el("div", { class: "form-tiles" });
    const formButtons = STANDARD_FORMS.map((f) => {
      const face = portrait(f);
      face.classList.add("tile");
      const b = el("button", { class: "form-tile" }, [
        face,
        el("span", {}, [FORMS[f].name]),
      ]);
      b.addEventListener("click", () => {
        form = f;
        for (const other of formButtons) other.classList.remove("selected");
        b.classList.add("selected");
      });
      if (f === form) b.classList.add("selected");
      return b;
    });
    formRow.append(...formButtons);

    // The homesteads: three tiles across, emblem over name, exactly as the form
    // picker above does it — same shape of question (which of these do you want
    // to be / to live in), so the same shape of control, and the card stops
    // having two different ways to choose a thing.
    //
    // The BLURB moves out of the tile and under the row, showing only the
    // chosen one. Three sentences that long side by side at a third of a phone's
    // width is a wall of wrapped text nobody reads, and the sentences are worth
    // keeping — so they are shown one at a time, about the thing you just
    // picked. `min-height` on the line keeps the button below from hopping when
    // it changes.
    //
    // NOT `.primary`, which is what these rows used to be. That floods the
    // control with `--accent`, and the emblems are painted in the world's own
    // greens and blues; an accent wash over them would recolour the very thing
    // they exist to show. `.form-tile.selected` hit this first, with the
    // portraits, and settled it: selection is an accent EDGE, never a fill.
    const spotBlurb = el("p", { class: "spot-blurb" }, [
      SPOTS.find((s) => s.id === spot)!.blurb,
    ]);
    const spotRow = el("div", { class: "spot-tiles" });
    const spotButtons = SPOTS.map((s) => {
      const b = el("button", { class: "form-tile spot-tile" }, [
        gridEl(`spot:${s.id}`, s.emblem, SCALE.emblem),
        el("span", {}, [s.name]),
      ]);
      b.addEventListener("click", () => {
        spot = s.id;
        spotBlurb.textContent = s.blurb;
        for (const other of spotButtons) other.classList.remove("selected");
        b.classList.add("selected");
      });
      if (s.id === spot) b.classList.add("selected");
      return b;
    });
    spotRow.append(...spotButtons);
    const spotBlock = el("div", {}, [spotRow, spotBlurb]);

    const importBox = el("textarea", {
      class: "import-box",
      placeholder: "Optional: paste a save exported from The Meadow to bring a retired sprite across.",
    }) as HTMLTextAreaElement;

    // The import's fate: embody it, or house it next door. The choice only
    // appears once a paste actually parses — an empty or unreadable box says
    // nothing, rather than offering a decision about a sprite that isn't there.
    let meadowImport: MeadowImport | null = null;
    let importRole: "villager" | "player" = "villager";
    const roleRow = el("div", { class: "choices" });
    const importNote = el("p", {});
    const importBlock = el("div", {}, [importNote, roleRow]);
    importBlock.style.display = "none";

    const refreshImport = (): void => {
      const raw = importBox.value.trim();
      meadowImport = raw ? importFromMeadow(raw) : null;
      if (!meadowImport) {
        importBlock.style.display = "none";
        // A non-empty box that doesn't parse deserves to say so.
        importNote.textContent = "";
        if (raw) {
          importBlock.style.display = "";
          importNote.textContent = "That doesn't read as a Meadow save. Check the export string.";
          roleRow.replaceChildren();
        }
        return;
      }
      const who = `${meadowImport.name} — ${FORMS[meadowImport.form].name}`;
      importBlock.style.display = "";
      importNote.textContent = `${who} came across.`;
      const buttons: HTMLElement[] = [];
      const pick = (role: "villager" | "player", label: string) => {
        const b = choiceBtn(label, () => {
          importRole = role;
          for (const other of buttons) other.classList.remove("chosen");
          b.classList.add("chosen");
          // Embodying takes its name and form, so those pickers stop applying.
          const embodied = role === "player";
          nameInput.disabled = embodied;
          for (const fb of formButtons) fb.style.opacity = embodied ? "0.45" : "1";
          refreshClaim(); // embodying supplies the name; moving in next door does not
        });
        if (importRole === role) b.classList.add("chosen");
        buttons.push(b);
        return b;
      };
      roleRow.replaceChildren(
        pick("villager", "They move in next door"),
        pick("player", "Embody them — you are this sprite"),
      );
    };
    importBox.addEventListener("input", () => {
      refreshImport();
      // A paste that fails to parse takes the embodied sprite's name away with
      // it, so the gate has to be re-asked on every keystroke in the box.
      refreshClaim();
    });

    // The button is built out here rather than inline in the panel because the
    // gate has to reach it from three places — the name box, the import box and
    // the embody/house-next-door choice. `openModal` hands `close` to the
    // builder, so the builder assigns it through.
    let closeOnboarding = (): void => {};
    const claimBtn = primaryBtn("Claim your plot", () => {
      refreshImport(); // catch a paste that never fired an input event
      if (!claimable()) return; // that paste may have just taken the only name away
      const world = newWorld({ name, form, spot, meadowImport, importRole });
      closeOnboarding();
      this.beginWorld(world);
      this.runLandClaim();
    });
    refreshClaim();

    this.openModal(
      (close) => (
        (closeOnboarding = close),
        // No eyebrow over the name box: the subheading already asks the
        // question ("What will you call it?"), and a NAME label under it is the
        // same word twice — the two-headings problem `panel` warns about, one
        // step down. Every OTHER group keeps its eyebrow, because nothing above
        // them says what they are.
        //
        // Import sits between form and homestead rather than last. Name, form
        // and import are all the same question — who is arriving — and the
        // homestead is the first thing you decide about the town. Asking where
        // you live and then interrupting to ask whether somebody came with you
        // put the seam in the wrong place.
        panel("Time to settle in.", "", [
          el("p", {}, ["Your sprite has just arrived. What will you call it?"]),
          nameInput,
          labeled("Form", formRow),
          labeled("Or, import from The Meadow", importBox),
          importBlock,
          labeled("Homestead", spotBlock),
          actionRow([claimBtn]),
        ])
      ),
      { scrimClass: "over-scene" },
    );
  }

  /** The opening cutscene: the Office Creature stamps your land claim, line by
   *  line (DESIGN §"Opening beat").
   *
   *  DRAWN AS A CONVERSATION, because it is one. This ran on `panel()` for a
   *  long time — Gary's name as the heading, "Town Hall" as the eyebrow under
   *  it — which is the frame the shop and the museum use, and `speechPanel`'s
   *  own docblock says why that is wrong: a counter is a screen, a conversation
   *  is a person. It made the player's first minute in the game a form being
   *  read aloud by a building, and then every conversation afterwards looked
   *  different from the one that taught them what talking looks like.
   *
   *  He is also the last person you meet before the world opens, so this is
   *  where the dialogue frame should be introduced, not where it should be the
   *  exception. The eyebrow goes with it: the plate holds the name and nothing
   *  else, everywhere.
   *
   *  STILL NOT DISMISSABLE, unlike `openDialogue`. The one-way flows opt out on
   *  purpose (ROADMAP) — a cutscene you can tap past before it has given you the
   *  plot is a cutscene that sometimes doesn't happen. The frame changed; the
   *  plumbing did not. */
  private runLandClaim(): void {
    const step = (line: number): void => {
      const speech = officeLandClaimLine(line);
      if (!speech || !this.world) {
        if (this.world) {
          completeLandClaim(this.world);
          this.persist();
        }
        return;
      }
      // Found rather than assumed: `ensureFixedCast` put him in at `newWorld`,
      // so the look is the same one his portrait will have every time you go
      // back to the desk. `CAST.office` is the fallback and cannot normally be
      // reached — it keeps this a total function without pretending a miss is
      // impossible.
      const gary = this.world.villagers.find((v) => v.id === "office");
      const form = gary?.form ?? CAST.office.form;
      this.openModal((close) =>
        speechPanel(
          speech.who,
          portrait(form, lookFor("office", form)),
          el("p", {}, [speech.text]),
          actionRow([
            primaryBtn(officeLandClaimLine(line + 1) ? "Next" : "It's mine", () => {
              close();
              step(line + 1);
            }),
          ]),
        ),
      );
    };
    step(0);
  }

  // --- Dialogue ---------------------------------------------------------------
  private openDialogue(villagerId: CharId): void {
    if (!this.world) return;
    const world = this.world;
    const speech = talk(world, villagerId, this.rng, Date.now());
    if (!speech) return;
    audio.play("talk");

    // Two people have something more pressing to say than their idle bank while
    // a commission is open: the person living in the tent, and the desk holding
    // the form about it. Both override rather than append — someone waiting on
    // a house who opens with small talk reads as the game having forgotten.
    const open = openCommission(world);
    if (open) {
      const def = arrivalOf(open);
      if (villagerId === open.id) {
        speech.text = def.tentLine;
      } else if (villagerId === "office") {
        // Read BEFORE filing, or the first telling never happens: filing sets
        // the very field that decides whether this is the first telling.
        const firstTime = open.filedAt === null;
        fileCommission(open, Date.now());
        speech.text = firstTime
          ? def.filing
          : `${def.filing} ... ${shortfallText(commissionState(world, open))}`;
      }
      // An override replaces the LINE, so any tree the ladder happened to open
      // goes with it — replies answering a sentence nobody said would be the
      // panel talking to itself.
      if (villagerId === open.id || villagerId === "office") speech.replies = undefined;
    }

    // Offering a home is a CONVERSATION, not a construction act (ROADMAP 2b
    // step 4). It only appears when there's a bed in town to offer — an option
    // that's always there and usually does nothing is a worse tutorial than no
    // option at all.
    // Never to a secret. None of them is homeless, none is waiting on anything,
    // and each lives where they live — offering one a bed in town is the panel
    // mistaking "somebody you can talk to" for "somebody who might move in".
    // Found on screen with the Mole, who was politely offered a room in the
    // plaza; `isSecret` is what stops it being found again with each new one.
    const offerable = beds(world).length > 0 && !isSecret(villagerId);

    // Company, on the same terms and for the same reason: asking somebody along
    // is a CONVERSATION, not a mode you toggle from a toolbar. The button only
    // appears when they'd actually say yes (sim/company.ts `canInvite`) — an
    // option that is always there and usually refuses would teach the player
    // that people say no, which is the opposite of what the feature is.
    //
    // A companion gets the mirror of it instead, so the way out is always in the
    // same place as the way in. There is no third state to explain.
    // Found, not asserted: `talk` above already resolved this id, so a miss here
    // is impossible — and returning is still cheaper than an assertion that
    // stops being true the day somebody leaves town mid-conversation.
    const them = world.villagers.find((v) => v.id === villagerId);
    if (!them) return;
    const withMe = companion(world)?.id === villagerId;
    const askable = !withMe && them !== undefined && canInvite(world, them, Date.now()).ok;

    // The shopkeeper's conversation IS her counter. A dialogue box that then
    // offers a "shop" button would be a menu in front of a menu, and she is a
    // person you go and see rather than a UI you open. Every keeper goes
    // through `withIntro` (Phase 14a): the person once, the screen forever
    // after.
    if (villagerId === "shop") {
      this.withPreamble(them, speech.gave, () => this.openShop());
      return;
    }
    // Same rule for the Gremlin: the heap is what he is, so talking to him is
    // standing at it. Two counters, two panels, because they are not the same
    // transaction — she swaps things for things, he takes junk and unlocks a
    // finish, and one panel bent to cover both would show a price column that
    // means something different on each side of it.
    if (villagerId === "heap") {
      this.withPreamble(them, speech.gave, () => this.openHeap());
      return;
    }
    // And Corrigal: the museum is her desk, the counter and the catalogue at
    // once, so talking to her is visiting it. Third counter, third panel — a
    // donation is not a trade and not a redemption, it is the one transaction
    // in the game with nothing on the other side of it, and a shared panel
    // would have to invent a column for what you get back.
    if (villagerId === "museum") {
      this.withPreamble(them, speech.gave, () => this.openMuseum());
      return;
    }
    // And the Blessed Carrot. Fourth counter, fourth panel — his is the only
    // one selling two different kinds of thing (stuff, and a permanent unlock),
    // which is exactly why it isn't folded into hers: one panel covering both
    // would need a column whose meaning changed halfway down it.
    if (villagerId === "seedstall") {
      this.withPreamble(them, speech.gave, () => this.openSeedStall());
      return;
    }
    // And the Dog Thing, whose counter is a board he is often not standing at.
    // Talking to him opens the same panel the board does — he IS the board's
    // conversation, wherever on his round you catch him, and a version where
    // you had to walk him back to the plaza would make the round a chore.
    if (villagerId === "errands") {
      this.withPreamble(them, speech.gave, () => this.openErrands());
      return;
    }
    // And the Dramatic Blob. Sixth counter, sixth panel, and the only one that
    // is not a transaction — the stage IS the conversation, so talking to him
    // is being told what is on. A "programme" button inside a dialogue box
    // would be the menu-in-front-of-a-menu the shop refuses.
    if (villagerId === "stage") {
      this.withPreamble(them, speech.gave, () => this.openStage());
      return;
    }

    // A gift comes before the conversation here too, for the same reason it
    // does at a counter: it is the thing they have been meaning to say. No
    // resident gives a finish today — both givers are institutions and both
    // went through `withPreamble` above — but `given` is a field on any finish
    // and the day one names a newcomer, this is already correct.
    this.withGift(them, speech.gave, () =>
    this.openModal(
      (close) => {
        // A conversation is the one panel that has a FACE, so it gets its own
        // frame rather than the generic `panel()`: speaker on the left, what
        // they said beside it.
        //
        // A NAME AND NOTHING ELSE under the face. There used to be a line above
        // it reading "Farm resident", which sat under every name in the game and
        // told you nothing you couldn't see — you are standing in the town
        // talking to somebody who lives in it. Secrets had their own version of
        // it (`CharDef.subtitle`: "Out past the woods") and that went the same
        // way: the bubble is where a character says who they are, and a caption
        // under the name says it for them.
        //
        // A tree (Phase 12) swaps what's IN the frame rather than reopening it:
        // the said line and the button row re-render per exchange, the modal —
        // and its doors, the scrim and Escape — stays put. While replies are
        // up they take the whole row, INCLUDING the close button's slot: the
        // authored "..." reply is the same gesture as the "..." that closes,
        // except mid-conversation the person gets to answer it. When the tree
        // lets go, the ordinary row (offers, company, the close) returns.
        const saidP = el("p", {}, [speech.text]);
        const row = actionRow([]);
        const render = (replies?: ReplyDef[]): void => {
          if (replies && replies.length > 0) {
            row.replaceChildren(
              ...replies.map((r) =>
                choiceBtn(replyLabel(r, world.player.form), () => {
                  audio.play("talk");
                  const next = advanceReply(them, r, Date.now());
                  saidP.textContent = next.line;
                  render(next.replies);
                }),
              ),
            );
          } else {
            row.replaceChildren(...closingRow());
          }
        };
        const closingRow = (): HTMLElement[] => [
            ...(offerable
              ? [
                  choiceBtn("There's a room for you", () => {
                    close();
                    this.beginAssigning(villagerId);
                  }),
                ]
              : []),
            // The hall's counter, and only Gary has one. It CLOSES first rather
            // than opening over this panel: the shop's rule is that a counter
            // is not a menu you reach through another menu, and a stacked pair
            // of modals is exactly that. Same gesture as the bed offer above,
            // which also closes and then does its thing.
            //
            // A conversation and a counter, where the other six institutions
            // have only a counter, because Gary genuinely has both — the land
            // claim and the commission beat are conversations and live here.
            ...(villagerId === "office"
              ? [
                  choiceBtn("Anything to file?", () => {
                    close();
                    this.openHall();
                  }),
                ]
              : []),
            ...(askable
              ? [
                  choiceBtn("Come with me?", () => {
                    close();
                    if (!invite(world, villagerId, Date.now())) return;
                    audio.play("talk");
                    this.flash(`${speech.who}: ${companyYesLine(them.form, this.rng)}`);
                  }),
                ]
              : []),
            // The games, on company's terms exactly: asking to play IS an
            // invitation (they come along, the game starts, and when it ends
            // they are still with you), so the buttons show for anyone who
            // would say yes to a walk — same gate, one step. `canPlay` adds
            // only what a game needs on top of one: both of you on the
            // surface. I Spy additionally needs something near the pair worth
            // spying (`spyChoices`) — on an empty plain, its absence is the
            // honest answer. No cooldown ever gates these buttons; the only
            // timestamp in the feature shapes how often THEY offer.
            ...((withMe || askable) && canPlay(world, them, Date.now())
              ? [
                  choiceBtn(GAMES.hide.ask, () => {
                    close();
                    const now = Date.now();
                    if (!withMe && !invite(world, villagerId, now)) return;
                    if (!startPlay(world, villagerId, "hide", now, this.rng)) return;
                    audio.play("talk");
                    this.flash(`${speech.who}: ${gameYesLine("hide", them.form, this.rng)}`);
                  }),
                  ...(spyChoices(world, them).length > 0
                    ? [
                        choiceBtn(GAMES.spy.ask, () => {
                          close();
                          const now = Date.now();
                          if (!withMe && !invite(world, villagerId, now)) return;
                          if (!startPlay(world, villagerId, "spy", now, this.rng)) return;
                          audio.play("talk");
                          // The acceptance IS the clue — one flash, one breath.
                          const clue = playing(world)?.target?.clue;
                          if (clue) this.flash(`${speech.who}: ${clue}`);
                        }),
                      ]
                    : []),
                ]
              : []),
            // "Look at this" — aim a companion's eyes at whatever you're
            // standing at, and they consider it in voice. Companions only
            // (pointing at your fence mid-first-conversation is a stranger
            // being seized by the elbow), no game required, and it pays
            // NOTHING — no memory, no friendship; the remark is the whole of
            // it (content/dialogue.ts LOOK_AT's header).
            ...(withMe && !playing(world) && lookKindNear(world)
              ? [
                  choiceBtn("Look at this", () => {
                    close();
                    const kind = lookKindNear(world);
                    if (!kind) return;
                    audio.play("talk");
                    this.flash(`${speech.who}: ${lookAtLine(them, kind, this.rng)}`);
                  }),
                ]
              : []),
            // Mid-I-Spy, the companion is right beside you, so the panel is
            // the game's own surface: repeat the clue (identical words — a
            // clue that rerolled would be a hint system), or stop, which
            // writes nothing (sim/play.ts `endPlay`, the "gave_up" arm).
            ...(withMe && playing(world)?.game === "spy"
              ? [
                  choiceBtn("Say it again?", () => {
                    close();
                    const clue = playing(world)?.target?.clue;
                    if (clue) this.flash(`${speech.who}: ${clue}`);
                  }),
                  choiceBtn("I give up", () => {
                    close();
                    endPlay(world, Date.now(), "gave_up");
                    this.flash(`${speech.who}: ${gameGiveUpLine("spy", them.form, this.rng)}`);
                  }),
                ]
              : []),
            ...(withMe
              ? [
                  choiceBtn("Thanks for coming", () => {
                    close();
                    // The line comes from the same bank the clock uses when
                    // their day ends, because it is the same moment: they are
                    // going home. Sending somebody home early should not sound
                    // different from them leaving on time — a distinct "you
                    // dismissed me" line would put a cost on a goodbye, and
                    // there isn't one.
                    this.flash(`${speech.who}: ${companyByeLine(them.form, this.rng)}`);
                    this.partedBy = villagerId;
                    partWays(world, Date.now());
                  }),
                ]
              : []),
            primaryBtn("...", close),
          ];
        render(speech.replies);
        return speechPanel(speech.who, portrait(them.form, lookFor(them.id, them.form)), saidP, row);
      },
      { dismissable: true },
    ));
  }

  // --- The counter ----------------------------------------------------------------
  /** You meet the person before you meet the screen (Phase 14a, ROADMAP §14a).
   *
   *  The first time you talk to a counter keeper this opens the DIALOGUE frame
   *  — them, in their own voice, saying who they are and what they run — and
   *  the counter only after you answer. Ever after, the counter opens
   *  directly. "First time" is the keeper's own memory (`introduced`, written
   *  to them alone), not a UI flag: the person remembers meeting you, which is
   *  the bar every piece of remembered state has to pass (§10i).
   *
   *  Escaping the intro without answering leaves it unremembered, and that is
   *  the honest reading: you walked off mid-introduction, so they introduce
   *  themselves again next time. */
  /** Everything a PERSON owes you before their screen opens, in the order they
   *  owe it: who they are, then what they've been keeping for you.
   *
   *  The order is the whole reason this exists rather than the two being called
   *  wherever. You can reach `familiar` with somebody you have never spoken to
   *  — `witness` warms whoever is standing near you while you work (sim/game.ts)
   *  — so Pesto handing you a tin of paint before introducing himself is not a
   *  hypothetical, it is what happens to a player who builds near the plaza. */
  private withPreamble(them: Villager, gave: SkinId | undefined, open: () => void): void {
    this.withIntro(them, () => this.withGift(them, gave, open));
  }

  /** A finish somebody just gave you (content/skins.ts `given`).
   *
   *  IT GETS THE `handed` CARD, and by the rule this file already keeps: the
   *  two unlock channels are told apart by WHO CAUSED IT, not by what it is
   *  (see `handed` below). Walnut and slate stay silent because you found them
   *  and a secret announced is a secret spoiled — but a person putting
   *  something in your hands is the opposite case, and the same card Gary uses
   *  for a discharged Form 9 is exactly right for it.
   *
   *  Their line ABOVE the card, not in its `said` slot. The slot puts the quote
   *  under the object, which reads as a caption on a prize; a gift is somebody
   *  talking and then you seeing what they meant.
   *
   *  `them.name` rather than `displayName`, matching the intro below. No secret
   *  gives a finish — the three of them are the underground, the grove and a
   *  meteor shower, and each already pays in its own way — and if one ever did,
   *  a card naming what she gave you while the frame calls her Quiet Ghost is
   *  the right shape anyway.
   *
   *  The unlock itself already happened in `talk`; this is presentation. Escape
   *  can therefore close it unseen, which is deliberate and the same deal
   *  friendship has always had — nothing is lost, the finish is in the picker,
   *  and its `hint` is gone from the locked list because it isn't locked. */
  private withGift(them: Villager, gave: SkinId | undefined, open: () => void): void {
    if (!gave) {
      open();
      return;
    }
    // No cue of its own. `openDialogue` already played "talk" on the way in and
    // there is no "unlock" in `Cue` — Gary's discharge card doesn't ring either,
    // so a gift that chimed would be the one unlock in the game with a sound.
    this.persist();
    this.openModal(
      (close) => {
        const said = el("div", {}, [
          el("p", {}, [givenLine(gave) ?? ""]),
          handed(skinDef(gave).name, "Available to build in, from now on."),
        ]);
        const row = actionRow([
          primaryBtn("...", () => {
            close();
            open();
          }),
        ]);
        return speechPanel(them.name, portrait(them.form, lookFor(them.id, them.form)), said, row);
      },
      { dismissable: true },
    );
  }

  private withIntro(them: Villager, open: () => void): void {
    const intro = charDef({ id: them.id, name: them.name, form: them.form, fixed: them.fixed }).intro;
    if (!intro || hasMemory(them.memory, "introduced")) {
      open();
      return;
    }
    this.openModal(
      (close) => {
        const saidP = el("p", {}, [intro]);
        const row = actionRow([
          primaryBtn("...", () => {
            them.memory = remember(them.memory, { kind: "introduced", at: Date.now() });
            this.persist();
            close();
            open();
          }),
        ]);
        return speechPanel(them.name, portrait(them.form, lookFor(them.id, them.form)), saidP, row);
      },
      { dismissable: true },
    );
  }

  /** The Menace's shop. Barter, so every row shows what she'll take INSTEAD of
   *  each other and you pick which of your things to part with.
   *
   *  Rows you can't afford are shown and disabled rather than hidden: a counter
   *  that only displays what you can buy today never teaches you what it's for,
   *  and "12 wood" sitting there greyed out is the entire tutorial for how
   *  cloth works. That's the opposite of the satchel's rule, which omits what
   *  you haven't got — one is a list of what you have, this is an offer.
   *
   *  Rebuilt from scratch after each trade rather than patched in place: the
   *  panel is a pure function of the inventory, and re-deriving it is both
   *  shorter and immune to the class of bug where a count goes stale. */
  private openShop(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});
      const render = () => {
        body.replaceChildren();
        const offered = offers(world);

        // Only deals your pockets can close, and only the prices they can pay
        // (Phase 14b). The one absence needs a voice: her counter with nothing
        // on it is her observation, not a blank. Worded for the true case —
        // eight wood against a twelve-wood price is not empty pockets, it is
        // pockets that don't reach.
        if (offered.length === 0) {
          body.append(
            el("p", {}, ["Nothing on you makes a trade today ... It's barter. Come back holding more of something."]),
          );
          return;
        }
        for (const { row, affordable } of offered) {
          body.append(
            el("div", { class: "who" }, [`${itemLabel(row.gives, row.givesCount)}, for any of:`]),
          );
          const choices = el("div", { class: "choices" });
          for (const price of affordable) {
            choices.append(
              choiceBtn(itemLabel(price.item, price.count), () => {
                if (!trade(world, row, price)) return;
                audio.play("place");
                this.persist();
                this.flash(row.line);
                render();
              }),
            );
          }
          body.append(choices);
        }
      };
      render();

      // Name from the table, institution in the subtitle — the counter is what
      // makes her an institution, so it is the counter that should say so. The
      // five panels here all used to print a species where a name goes.
      return panel(
        CAST.shop.name,
        "The Counter",
        [
          el("p", {}, ["Cloth ... You can't grow it, and you certainly can't chop it down."]),
          body,
          actionRow([primaryBtn("That's all", close)]),
        ],
        counterFace("shop"),
      );
    }, { dismissable: true });
  }

  /** The Gremlin's heap. Junk in, a finish out, and nothing else in either
   *  direction (content/shop.ts §"The heap").
   *
   *  Redeemed rows stay on the list, marked, rather than vanishing: a counter
   *  that empties as you use it makes the last visit look broken, and seeing
   *  what you already got from him is half of learning what he's for. Same
   *  reasoning as the Menace showing rows you can't afford.
   *
   *  Rebuilt after each redemption for the same reason her panel is — it is a
   *  pure function of the junk count and the unlocked list, so re-deriving it
   *  can't go stale. */
  private openHeap(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});
      const render = () => {
        body.replaceChildren();
        const offered = heapOffers(world);

        // The opener tracks the list (Phase 14b): only live offers are shown,
        // so each absence has to be said rather than greyed. Exhausted wins —
        // he is not going to restock, and pretending otherwise would be the
        // first FOMO in the game. Empty pockets get their own line, because a
        // bare counter with no voice reads as a bug.
        const opener = heapExhausted(world)
          ? "That's the lot ... You've had everything worth having. Some of it twice, from my side."
          : offered.length === 0
            ? "Nothing on you I can work with ... Come back heavier."
            : "You dug that up ... Fine. I can do something with it. Probably.";
        body.append(el("p", {}, [opener]));

        const choices = el("div", { class: "choices" });
        for (const { row } of offered) {
          choices.append(
            choiceBtn(`${skinDef(row.gives).name}, for ${itemLabel("junk", row.cost)}`, () => {
              if (!redeem(world, row)) return;
              audio.play("place");
              this.persist();
              this.flash(row.line);
              render();
            }),
          );
        }
        if (offered.length > 0) body.append(choices);
      };
      render();

      return panel(CAST.heap.name, "The Facility", [
        body,
        actionRow([primaryBtn("Right", close)]),
      ], counterFace("heap"));
    }, { dismissable: true });
  }

  /** The Blessed Carrot's stall. Two sections, because he deals in two axes:
   *  seed (stuff, repeatable, ordinary) and varieties (a permanent unlock,
   *  redeemed once). Barter both ways, so each row shows what he'll take
   *  INSTEAD of each other, exactly like hers.
   *
   *  The variety section shows what you already have, marked, the way the heap
   *  keeps redeemed rows — and for the same reason: a list that empties as you
   *  use it makes the last visit look broken. What it does NOT show is any
   *  count of how many you have of the three. That would be the first
   *  denominator in the game outside the museum's forbidden one.
   *
   *  Rebuilt after each trade rather than patched, like every other counter: a
   *  pure function of the satchel and the unlocked list can't go stale. */
  private openSeedStall(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});
      // The variety he has just handed over, if any. Session-only and outside
      // the save on purpose — it is a fact about this visit to the counter, not
      // about the world, and the world already records that you have it.
      let justGiven: { name: string; line: string } | null = null;
      const render = () => {
        body.replaceChildren();

        // THE CARD REPLACES THE COUNTER, on the hall's and the museum's exact
        // model — views swapped in place, never a second modal on top.
        //
        // It rode above the offers first, and the screenshot killed that: this
        // panel is eight varieties of five prices each, so buying one leaves you
        // looking at the BOTTOM of two thousand pixels of buttons with the
        // announcement somewhere off the top. A card you have to scroll back to
        // find is worse than the toast it replaced, which at least appeared
        // where you were already looking.
        if (justGiven) {
          body.append(handed(justGiven.name, "Yours to plant, from now on.", justGiven.line));
          body.append(
            actionRow([
              choiceBtn("Back to the stall", () => {
                justGiven = null;
                render();
              }),
            ]),
          );
          return;
        }

        for (const { row, affordable } of seedOffers(world)) {
          body.append(el("div", { class: "who" }, [`${itemLabel("seed", row.givesCount)}, for any of:`]));
          const choices = el("div", { class: "choices" });
          for (const price of affordable) {
            choices.append(
              choiceBtn(itemLabel(price.item, price.count), () => {
                if (!buySeed(world, row, price)) return;
                audio.play("place");
                this.persist();
                this.flash(row.line);
                render();
              }),
            );
          }
          body.append(choices);
        }

        // Bought varieties are gone from the list (Phase 14b) — the picker is
        // where what you own lives, and STALL_EXHAUSTED voices the end state.
        for (const { row, affordable } of varietyOffers(world)) {
          const name = cropDef(row.gives).name;
          body.append(el("div", { class: "who" }, [`${name}, to plant from now on — for any of:`]));
          const choices = el("div", { class: "choices" });
          for (const price of affordable) {
            choices.append(
              choiceBtn(itemLabel(price.item, price.count), () => {
                if (!unlockVariety(world, row, price)) return;
                audio.play("place");
                this.persist();
                justGiven = { name, line: row.line };
                render();
              }),
            );
          }
          body.append(choices);
        }

        // Both halves pocket-filtered to nothing, with varieties still unsold:
        // the counter has to say so itself, or an early visit with a bare
        // satchel reads as the stall being broken.
        if (body.childElementCount === 0 && !varietiesExhausted(world)) {
          body.append(
            el("p", {}, ["Nothing on you the stall takes ... The seeds will wait. It's what they're best at."]),
          );
        }
      };
      render();

      return panel(CAST.seedstall.name, "The Seed Stall", [
        el("p", {}, [varietiesExhausted(world) ? STALL_EXHAUSTED : STALL_OPENER]),
        body,
        actionRow([primaryBtn("Thank you", close)]),
      ], counterFace("seedstall"));
    }, { dismissable: true });
  }

  /** The Notebook — what you have noticed, and what you have been told.
   *
   *  One view, no counter, no transaction. It is the only panel in the game that
   *  is purely a read, which is why it has no choices in it: a journal you can
   *  DO something from is a quest log.
   *
   *  WHAT IT MUST NEVER DRAW (DESIGN §The Notebook, ROADMAP 9c):
   *
   *    • No count, no total, no denominator, and not `world.notebook.length`
   *      reconstructed here. INCLUDING THE PAGER: the turn row prints no page
   *      number and no "of", because a page count is a count of what you have
   *      written down. You know you are at the front because there is nothing to
   *      turn back to — see the turn row below.
   *    • No blanks, no "???", no greyed future entries. A slot that implies more
   *      is the exact UI spoiler the tone rules ban for secrets, wearing a
   *      journal cover — and it is the single easiest way to ruin this feature.
   *    • No headings by subject. Grouping needs categories, and categories you
   *      have nothing under are those blanks again, while categories only for
   *      what you DO have quietly tell you how many kinds of thing exist.
   *
   *  It IS chunked by time — "Today", "Yesterday", "Tuesday", "Last winter" —
   *  which is the one grouping that cannot do either of those things: a time
   *  heading is made out of an entry, so it can never be empty, and it says
   *  nothing about what else that day might have held. Newest first, because the
   *  thing you just noticed is what you opened the book to read. See
   *  `journalChunks`; none of the arithmetic belongs up here.
   *
   *  It is PAGED, not scrolled — a book turns, and a long journal read as one
   *  tall column of paragraphs behind a scrollbar. `journalPages` cuts the paper
   *  so a date heading never lands at the bottom of a page away from its day.
   *
   *  The one visible distinction is HOW an entry was recorded, and it is carried
   *  ENTIRELY BY THE PROSE: a field note in your own hand reads plain, and
   *  something you were told opens with the person who told you ("Aurelio
   *  mentioned that ..."). It used to carry a "Told" label above it as well,
   *  which was a heading that repeated the first word of the line under it — the
   *  distinction was never in danger, so the label was only ever furniture.
   */
  private openNotebook(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});
      // Paged rather than scrolled, and the pages are cut ONCE on open: `now`
      // read per render would re-date the book mid-read, and an entry crossing
      // midnight from "Today" to "Yesterday" while you were three pages into it
      // could repaginate under your thumb.
      const pages = journalPages(world, Date.now());
      let at = 0;

      const render = () => {
        body.replaceChildren();

        if (journalEmpty(world)) {
          // An empty state that is a line, not a zero — and one that promises
          // nothing. It does not say "start exploring"; it says the book is new.
          body.append(
            el("p", {}, [
              "Blank, so far ... It is a good notebook. Stiff spine, ruled feint, and nothing in it yet.",
            ]),
          );
        } else {
          for (const chunk of pages[at]) {
            body.append(el("div", { class: "when" }, [chunk.heading]));
            for (const { line } of chunk.entries) body.append(el("p", {}, [line]));
          }
        }

        // The turn row says NOTHING about where you are — no number, no total,
        // no "of". A book tells you you are at the front by having nothing to
        // turn back to, and that is the whole indicator: the dead button IS the
        // position. Anything more numerate is the denominator §9c bans, and it
        // would be counting the entries you have written down.
        //
        // Both turns are always drawn, disabled at the ends rather than removed,
        // so the close button doesn't walk sideways as you read.
        //
        // ONE row, not two: `.row` is the panel's sticky foot and brings a rule
        // and 18px of padding with it, so a second one stacked two edges and two
        // feet across the bottom of the book. The turns sit at the left of that
        // one foot and Close it stays where it is in every other panel — the
        // turns are not choices in the transaction, they are the page you are
        // holding.
        const row: HTMLElement[] = [];
        if (pages.length > 1) {
          // ARROWS, NOT WORDS. "Back a page" and "On a page" were two of the
          // longest labels in the game to say the one thing a turn control never
          // has to say — and the panel's own arrow icons say it in twelve pixels,
          // the same pair the rotate button uses for a facing. The accessible
          // name still carries the words, which is where a label of that length
          // belongs.
          const back = iconBtn("arrow_w", "Back a page", () => {
            at--;
            render();
          });
          const on = iconBtn("arrow_e", "On a page", () => {
            at++;
            render();
          });
          (back as HTMLButtonElement).disabled = at === 0;
          (on as HTMLButtonElement).disabled = at >= pages.length - 1;
          row.push(el("div", { class: "turns" }, [back, on]));
        }
        row.push(primaryBtn("Close it", close));
        body.append(actionRow(row));
      };
      render();

      // NO EYEBROW. It said "Noticed, and told", which was an accurate label for
      // a thing that does not need labelling: the entries say which they are by
      // how they read, and a strapline classifying them is the panel explaining
      // its own contents back to the person who wrote them.
      //
      // The title is WHOSE it is, and that is what the eyebrow's space was worth
      // — a name on the cover, the way a notebook has one.
      return panel(`${possessive(world.player.name)} Notebook`, "", [body]);
    }, { dismissable: true });
  }

  /** The town hall's counter — forms to file, and the cabinet they end up in
   *  (DESIGN §Paperwork).
   *
   *  Three views swapped in place, on the museum's exact model: what the hall is
   *  currently obliged to offer, the stamp it gives you back, and the cabinet.
   *  Not stacked modals, for the reason spelled out over `openMuseum` — and with
   *  extra force here, because navigating a filing system inside a filing
   *  cabinet would be the joke eating itself.
   *
   *  WHAT THIS PANEL MUST NEVER DRAW (ROADMAP 9b, DESIGN §Paperwork):
   *
   *    • No count. Not "17 filed", not "3 of 5", not a bar, and not
   *      `world.filings.length` reconstructed here. There is no denominator to
   *      be part of.
   *    • No empty slots. A form you have filed leaves the counter; a batch with
   *      nothing left under it drops out entirely rather than showing five
   *      struck-through titles, which is a completion meter nobody had to write.
   *    • No task. A form names nothing to go and do, so no button here is ever
   *      disabled for want of anything — filing is free, and every form on the
   *      counter can be filed the moment you can see it.
   *
   *  The empty counter says the HALL is between forms. That is a fact about a
   *  bureaucracy, not a verdict on you: the batches arrive on the real clock,
   *  so "nothing today" always means "not yet" and never means "finished".
   */
  private openHall(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});
      const rewind = () => body.parentElement?.scrollTo({ top: 0 });

      // The counter. Re-derived after each filing rather than patched, for the
      // reason the museum's is: it is a pure function of the clock and the
      // cabinet, and re-deriving beats keeping a stale list in step.
      const counter = () => {
        body.replaceChildren();
        rewind();
        const batches = counterBatches(world, Date.now());

        if (batches.length === 0) {
          body.append(
            el("p", {}, [
              "There is nothing on the schedule today ... The hall is between forms. It has been between forms before.",
            ]),
          );
        } else {
          body.append(
            el("p", {}, [
              "The hall is obliged to offer the following. Filing is free, and changes nothing ... That is not a disclaimer. It is the service.",
            ]),
          );
          for (const { batch, forms } of batches) {
            // The batch's NOTICE, above its own forms. This is the best part of
            // the feature and it goes at the top of its group rather than being
            // collapsed into one heading — the reason the hall added three forms
            // is more interesting than the three forms.
            body.append(el("div", { class: "who" }, ["Notice"]), el("p", {}, [batch.notice]));
            const choices = el("div", { class: "choices" });
            for (const def of forms) {
              choices.append(
                choiceBtn(def.title, () => {
                  const stamp = file(world, def.id, Date.now());
                  if (!stamp) return;
                  audio.play("place");
                  this.persist();
                  stamped(def.title, def.blurb, stamp);
                }),
              );
            }
            body.append(choices);
          }
        }

        body.append(
          actionRow([choiceBtn("What's in the cabinet?", drawer), primaryBtn("That's all", close)]),
        );
      };

      // The form, and what the hall said back. Alone on the panel, exactly as a
      // placard is: the stamp is the entire payoff — nothing else is returned —
      // so it gets the view rather than a flash it would outlive.
      const stamped = (title: string, blurb: string, stamp: string) => {
        body.replaceChildren(
          el("h3", {}, [title]),
          el("p", {}, [blurb]),
          el("div", { class: "who" }, ["Stamped"]),
          el("p", {}, [stamp]),
          actionRow([primaryBtn("...", counter)]),
        );
        rewind();
      };

      // The cabinet: what you have filed, under the reason the hall printed it.
      // A batch you have nothing from is absent, not blank.
      const drawer = () => {
        body.replaceChildren();
        rewind();
        if (cabinetEmpty(world)) {
          body.append(
            el("p", {}, [
              "Empty ... The drawer runs the full depth of the building. I mention that without expectation.",
            ]),
          );
        } else {
          for (const { batch, filings } of cabinet(world)) {
            body.append(el("div", { class: "who" }, ["Notice"]), el("p", {}, [batch.notice]));
            for (const { def } of filings) {
              // Title, the form's OWN TEXT, then the stamp. The blurb is the
              // joke and without it here the cabinet is a list of receipts —
              // you would read each form exactly once, at the counter, and
              // never again. Reading old filings is half of what this is for,
              // so the cabinet has to hold the thing worth re-reading. It makes
              // for a long drawer, which is correct: it is a filing cabinet.
              body.append(
                el("h3", {}, [def.title]),
                el("p", {}, [def.blurb]),
                el("p", { class: "note" }, [def.stamp]),
              );
            }
          }
        }
        body.append(actionRow([primaryBtn("Back to the counter", counter)]));
      };

      counter();
      return panel(CAST.office.name, "Town hall", [body]);
    }, { dismissable: true });
  }

  /** The museum. Corrigal takes things and gives nothing back, so this panel is
   *  the one counter in the game with no price column pointing the other way.
   *
   *  Three doors, and the middle one is the whole feature: hand something over,
   *  read what she has decided it was, or leave. The panel swaps between those
   *  views in place rather than stacking modals — a placard that opens a second
   *  window over the first would make reading the collection feel like
   *  navigating a filing system, which is her fantasy and not the player's.
   *
   *  WHAT THIS PANEL DOES NOT DRAW, and the reason step 6 was worth being
   *  careful about (DESIGN §The museum, ROADMAP §The museum):
   *
   *    • No total and no denominator. Nothing here counts the collection —
   *      not "9 given", not "9 of 17", not a bar. `sim/museum.ts` refuses to
   *      export the number, and this file must not reconstruct it from
   *      `collection().length`.
   *    • No empty slots. A wing with nothing in it is not shown as a row of
   *      blanks, it is not shown at all (`wingsWithDonations`). Eighteen greyed
   *      placeholders is a completion meter nobody had to write.
   *    • Antiquities are never named before they are given. The offer says
   *      "junk", because junk is identified at donation and not at pickup —
   *      naming the next one on the button would turn the wing into a list of
   *      twelve pending items with the numbers left off.
   *
   *  Nature rows you can't afford ARE listed, disabled, exactly as the Menace
   *  lists cloth you can't pay for: seeing that the wing wants a mushroom is
   *  what sends you out after dark to find one. That is not a checklist — it is
   *  a finite five-row wing that never implies a sixth. */
  private openMuseum(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});

      // The panel itself is the scroller, and a long catalogue leaves it halfway
      // down. Swapping views without rewinding it puts you at the bottom of the
      // counter, looking at nothing, with the list you wanted above the fold.
      const rewind = () => body.parentElement?.scrollTo({ top: 0 });

      // The counter. Rebuilt from scratch after each donation for the same
      // reason the shop's is: it is a pure function of the inventory and the
      // record, and re-deriving beats patching a stale count.
      const counter = () => {
        body.replaceChildren();
        rewind();
        const offers = donatable(world);

        // She has run out of things to be wrong about. Said as her being
        // current rather than the museum being finished — "complete" is a
        // denominator wearing a coat.
        body.append(
          el("p", {}, [
            offers.length === 0
              ? "That is everything I presently know how to be wrong about ... I am not finished. I am up to date."
              : "The museum accepts donations ... It does not return them, and it does not thank you in any material way. I will write a card.",
          ]),
        );

        const choices = el("div", { class: "choices" });
        for (const { def, affordable } of offers) {
          const label =
            def.wing === "nature"
              ? `${def.title} — ${itemLabel(def.cost.item, def.cost.count)}`
              : `Something you dug up — ${itemLabel(def.cost.item, def.cost.count)}`;
          const b = choiceBtn(label, () => {
            const placard = donate(world, def);
            if (!placard) return;
            audio.play("place");
            this.persist();
            mounted(placard);
          });
          if (!affordable) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.4";
          }
          choices.append(b);
        }
        if (offers.length > 0) body.append(choices);

        body.append(
          actionRow([
            choiceBtn("What's in here?", catalogue),
            primaryBtn("I'll look around", close),
          ]),
        );
      };

      // The card she has just written, alone on the panel. The placard IS the
      // payoff (nothing else is returned), so it gets the whole view for a
      // moment instead of a 1.8-second flash it would outlive.
      //
      // No title above it, deliberately: every placard opens by naming the
      // thing, so a heading here printed "Handle of Office" twice in three
      // lines. The catalogue keeps its titles — a list needs something to scan,
      // and a revised card can be as short as "..." — but a single card
      // introduces itself.
      const mounted = (placard: string) => {
        body.replaceChildren(
          el("div", { class: "who" }, ["Mounted"]),
          el("p", {}, [placard]),
          actionRow([primaryBtn("...", counter)]),
        );
        rewind();
      };

      // The record: what you have given, and her current reading of each. No
      // count, no headings for wings that hold nothing.
      const catalogue = () => {
        body.replaceChildren();
        rewind();
        if (collectionEmpty(world)) {
          body.append(
            el("p", {}, [
              "Nothing, yet ... The plinths are prepared to wait. I am prepared to wait beside them, visibly.",
            ]),
          );
        } else {
          const shown = collection(world);
          for (const wing of wingsWithDonations(world)) {
            body.append(
              el("div", { class: "who" }, [wing === "nature" ? "Nature" : "Antiquities"]),
            );
            for (const { def, placard } of shown.filter((e) => e.def.wing === wing)) {
              body.append(el("h3", {}, [def.title]), el("p", {}, [placard]));
            }
          }
        }
        body.append(actionRow([primaryBtn("Back to the desk", counter)]));
      };

      counter();
      return panel(CAST.museum.name, "The Museum", [body], counterFace("museum"));
    }, { dismissable: true });
  }

  /** The errands board. Fifth counter, fifth panel — and the only one you can
   *  open with nobody standing at it, because the Dog Thing walks a round.
   *
   *  TWO HALVES, IN THIS ORDER, AND THE ORDER IS THE DESIGN. The request is one
   *  thing, with two buttons under it and an end. The notices are underneath,
   *  smaller, and there is nothing to press on them. That layout is what keeps
   *  the risk ROADMAP flagged at bay — a reader can see at a glance that the
   *  actionable part of this board is exactly one item long, and everything
   *  below the rule is the town talking about itself in the past tense.
   *
   *  WHAT THIS PANEL DOES NOT DRAW, on the museum's precedent:
   *
   *    • No count of errands run, ever. Not "6 done", not a list of past
   *      requests, not a streak. `sim/errands.ts` keeps `done` so the table can
   *      cycle without repeating itself; it is a memory, not a tally, and this
   *      file must not reconstruct a score from its length.
   *    • No timer on the open request. There is no deadline in the sim and
   *      there must be none in the UI — no "expires", no clock, no urgency
   *      that the player has to hold in their head.
   *    • No shortfall arithmetic dressed as a quest. When you are short the
   *      card says so plainly and the button is simply disabled, the same way
   *      an unaffordable row is disabled at every other counter in town.
   *
   *  Refusing is a real button and not a hidden one. If "Not today" were only
   *  reachable by walking away, saying no would be something you do by accident;
   *  it is offered at the same weight as accepting, because it costs the same
   *  (nothing) and the whole beat depends on that being true. */
  private openErrands(): void {
    if (!this.world) return;
    const world = this.world;

    this.openModal((close) => {
      const body = el("div", {});

      const draw = () => {
        body.replaceChildren();
        const open = openErrand(world);
        const state = errandState(world);

        if (!open || !state) {
          // Quiet, and said as the board being current rather than as you
          // having cleared it — "nothing left to do" is a completion state, and
          // this is a board that simply has no card up at the moment.
          body.append(
            el("p", {}, [
              "No requests today ... The board is up to date, which it considers an achievement in itself.",
            ]),
          );
        } else {
          body.append(el("div", { class: "who" }, ["Requested"]), el("p", {}, [cardText(world, open)]));

          const ask = state.def.ask;
          const b = choiceBtn(`Hand over ${itemLabel(ask.item, ask.count)}`, () => {
            const thanks = deliverErrand(world, Date.now());
            if (!thanks) return;
            audio.play("place");
            this.persist();
            thanked(thanks);
          });
          if (!state.ready) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.4";
            body.append(
              el("p", { class: "note" }, [
                `You have ${state.have} of the ${state.want} it asks for.`,
              ]),
            );
          }
          body.append(
            el("div", { class: "choices" }, [b]),
            actionRow([
              choiceBtn("Not today", () => {
                declineErrand(world, Date.now());
                audio.play("menu");
                this.persist();
                draw();
              }),
              primaryBtn("Leave it", close),
            ]),
          );
        }

        // The notices, below the rule and in smaller type. Nothing here is a
        // control and nothing here is a target.
        const column = el("div", { class: "notices" });
        column.append(el("div", { class: "who" }, ["Notices"]));
        for (const line of notices(world)) column.append(el("p", { class: "note" }, [line]));
        body.append(el("hr", {}), column);

        if (!open) body.append(actionRow([primaryBtn("Carry on", close)]));
      };

      // His thanks, alone for a moment — it is, with the friendship and the
      // memory, the entire payment, so it is not a line that flashes past under
      // a list of notices.
      const thanked = (line: string) => {
        body.replaceChildren(
          el("div", { class: "who" }, [CAST.errands.name]),
          el("p", {}, [line]),
          actionRow([primaryBtn("...", draw)]),
        );
      };

      draw();
      // Subtitle is the PLACE, matching every other counter's panel ("Corrigal
      // / The Museum"). It said "Requests and notices", which stacked straight
      // on top of the REQUESTED heading below it and read as the same word
      // twice in two type sizes.
      return panel("The Errands Board", "Pinned in the plaza", [body]);
    }, { dismissable: true });
  }

  /** The Dramatic Blob's programme. Sixth counter, sixth panel, and the last
   *  institution in town.
   *
   *  IT SELLS NOTHING AND TAKES NOTHING, which makes it the only counter here
   *  with no transaction in it at all — the museum takes and gives nothing back,
   *  and this one doesn't even take. It is a man telling you what is on.
   *
   *  THREE STATES, AND THE MIDDLE ONE IS THE IMPORTANT ONE. A festival is on
   *  today twelve times a year; the other three hundred and fifty-three days
   *  he is rehearsing, and if that state were a shrug the whole institution
   *  would be a prop you walk past. So the rehearsal line is the row's own
   *  writing, per festival, and the panel leads with it.
   *
   *  WHAT THIS PANEL DOES NOT DRAW, on the museum's and the board's precedent:
   *
   *    • No attendance record. Not "you have been to 3", not a list of the ones
   *      you saw, not a mark against the ones you missed. There is no such
   *      number in the sim and this file must not invent one from the memory
   *      log, which exists so that PEOPLE can bring it up, not so the UI can
   *      tally it.
   *    • No countdown to the hour. Days, said the way he would say them. A
   *      timer ticking down to a festival would turn the one thing in this game
   *      that happens without you into an appointment.
   *    • No calendar of the year ahead. You get the next one. Twelve rows laid
   *      out in a grid is a completion checklist with months for boxes — the
   *      museum's no-empty-slots rule, arriving by a side door. */
  private openStage(): void {
    if (!this.world) return;
    const now = Date.now();
    const today = festivalOn(now);
    const active = activeFestival(now);
    const next = nextFestival(now);
    const last = lastFestival(now);

    this.openModal((close) => {
      const body = el("div", {});

      if (active) {
        body.append(el("div", { class: "who" }, [active.name]), el("p", {}, [active.onstage]), el("p", { class: "note" }, [active.blurb]));
      } else if (today) {
        // The day of, before the hour. He is at his most alive here and it
        // would be a waste to make him say the same thing as on a Tuesday.
        body.append(
          el("div", { class: "who" }, [today.name]),
          el("p", {}, ["Tonight ... Not now. Tonight."]),
          el("p", { class: "note" }, [today.blurb]),
        );
      } else if (next) {
        const days = daysUntil(now, next.at);
        body.append(
          el("div", { class: "who" }, ["In rehearsal"]),
          el("p", {}, [next.def.rehearsing]),
          el("p", { class: "note" }, [
            days === 1 ? `${next.def.name} is tomorrow.` : `${next.def.name}, in ${days} days.`,
          ]),
        );
      }

      // And what the last one was, in the past tense, under the rule. The same
      // shape as the notices column: the town talking about something that has
      // already happened, with nothing to press on it.
      if (last && (!active || last.def.id !== active.id)) {
        const column = el("div", { class: "notices" });
        column.append(el("div", { class: "who" }, ["Last time"]), el("p", { class: "note" }, [last.def.afterwards]));
        body.append(el("hr", {}), column);
      }

      body.append(actionRow([primaryBtn("...", close)]));
      return panel(CAST.stage.name, "The Plaza Stage", [body], counterFace("stage"));
    }, { dismissable: true });
  }

  /** Notice that you are at a festival, once, while you are at one.
   *
   *  `attend` is idempotent and cheap and does the deciding — it warms whoever
   *  is standing out here and returns the festival only on the call that
   *  actually registered it, so this fires exactly once per festival per town.
   *
   *  A FLASH, not a modal. The same call the arrival beat makes and for the
   *  same reason: what makes this discoverable is that the entire town is
   *  standing in the square, which is a thing you walk into. A panel in front
   *  of it would be the game explaining a crowd you can see. */
  private noticeFestival(): void {
    if (!this.world) return;
    const def = attend(this.world, Date.now());
    if (!def) return;
    this.persist();
    this.flash(`${def.name} ... You are here for it, which is most of what it asks.`);
  }

  // --- Commissions --------------------------------------------------------------
  /** Say when somebody has moved to town — once, and quietly.
   *
   *  A FLASH and not a modal, deliberately. The land claim earns a modal because
   *  it's the opening cutscene and there is nothing else to do; someone pitching
   *  a tent while you're halfway through a wall does not. What makes the beat
   *  discoverable is the tent itself, which is a thing you walk past and go and
   *  look at — the same way you find everything else here.
   *
   *  Tracked against the id we last announced rather than a flag on the
   *  commission, so it stays out of the save: "have I mentioned this" is a fact
   *  about this session's UI, not about the town. */
  private announcedArrival: CharId | null = null;
  /** Who is walking with you as of the last frame, and who the player just sent
   *  home — see `noticeParting` for why both live here and not in the world. */
  private walkingWith: CharId | null = null;
  private partedBy: CharId | null = null;
  private noticeArrival(): void {
    if (!this.world) return;
    const open = openCommission(this.world);
    if (!open || open.id === this.announcedArrival) return;
    this.announcedArrival = open.id;
    const who = this.world.villagers.find((v) => v.id === open.id);
    this.flash(`${who?.name ?? "Someone"} has pitched a tent near the plaza.`);
  }

  /** Say the goodbye when the CLOCK ended the company rather than the player
   *  (sim/company.ts `updateCompany`).
   *
   *  Watched rather than pushed: the sim has no way to talk to the UI and
   *  shouldn't grow one for this. The slot going from somebody to nobody is the
   *  whole event, and comparing it each frame costs a string compare — the same
   *  shape as `noticeArrival` watching for an open commission.
   *
   *  It stays quiet when the PLAYER said goodbye, because that path already
   *  flashed the line from the same bank and two goodbyes for one parting reads
   *  as a bug. `partedBy` is how the two are told apart, and it is UI state
   *  rather than world state for exactly that reason: who clicked what is not a
   *  fact about the town. */
  private noticeParting(): void {
    if (!this.world) return;
    const now = companion(this.world)?.id ?? null;
    const before = this.walkingWith;
    this.walkingWith = now;
    if (before === null || now === before) return;
    if (this.partedBy === before) {
      this.partedBy = null;
      return; // the player said it; the panel already spoke
    }
    const who = this.world.villagers.find((v) => v.id === before);
    if (who) this.flash(`${who.name}: ${companyByeLine(who.form, this.rng)}`);
  }

  /** The `attend()` shape, like the three notices above it: `foundThem` returns
   *  the hider exactly once, on the frame you got close enough, and this is the
   *  frame the line is said on. Also the keeper of the give-up chip — shown
   *  only while a hider is out there, which is the state the chip exists for. */
  private noticeFound(): void {
    if (!this.world) return;
    // "inline-block", not "" — the empty string would fall through to the
    // stylesheet, and the stylesheet's resting state is `display: none`.
    this.hud.giveUp.style.display = playing(this.world)?.game === "hide" ? "inline-block" : "none";
    const hider = foundThem(this.world, Date.now());
    if (hider) {
      audio.play("talk");
      this.flash(`${hider.name}: ${gameFoundLine("hide", hider.form, this.rng)}`);
      return;
    }
    const spier = foundIt(this.world, Date.now());
    if (spier) {
      audio.play("talk");
      this.flash(`${spier.name}: ${gameFoundLine("spy", spier.form, this.rng)}`);
    }
  }

  /** The two unprompted lines a companion can say (sim/play.ts §Offers): a
   *  proposed game after a stretch of walking, and a remark into the quiet of
   *  a shared bench. Both are flashes and nothing else — never a modal (a
   *  modal pauses the town at a moment the player didn't choose; the
   *  noticeArrival docblock has the argument) — and neither creates any
   *  pending state: the game buttons were already in the closing row. */
  private noticeNudges(): void {
    if (!this.world) return;
    const offerer = offerDue(this.world, Date.now());
    if (offerer) {
      this.flash(`${offerer.name}: ${gameOfferLine(offerer, this.rng)}`);
      return;
    }
    const sitter = satLineDue(this.world, Date.now());
    if (sitter) this.flash(`${sitter.name}: ${sittingLine(sitter, this.rng)}`);
  }

  /** Stop looking. Costless by design: no memory, no friendship change, and
   *  they simply walk back to you (sim/play.ts `endPlay` — the "gave_up" arm
   *  writes nothing at all). The line is allowed to gloat; the sim is not
   *  allowed to record it. */
  private giveUpGame(): void {
    if (!this.world) return;
    const p = playing(this.world);
    if (!p) return;
    const who = this.world.villagers.find((v) => v.id === p.who);
    endPlay(this.world, Date.now(), "gave_up");
    this.hud.giveUp.style.display = "none";
    if (who) this.flash(`${who.name}: ${gameGiveUpLine(p.game, who.form, this.rng)}`);
  }

  /** Close a commission the moment its house is real, if it just became real.
   *
   *  Called after housing someone rather than requiring a trip back to the town
   *  hall. The round trip is the on-tone joke and it is also a chore, and when
   *  those two disagree the pillar wins — you finished the house, so the beat
   *  finishes with it. He still gets the last word; he just doesn't make you
   *  walk for it. */
  private settleCommission(id: CharId): void {
    if (!this.world) return;
    const world = this.world;
    if (isNewcomer(id) === false) return;
    const c = commissionFor(world, id as NewcomerId);
    if (!c || c.stampedAt !== null) return;

    const state = commissionState(world, c);
    if (!state.done) {
      // Housed, but not to the form's satisfaction. Said plainly and once —
      // it's a fact about the building, not a scolding, and nothing is undone.
      this.flash(shortfallText(state));
      return;
    }

    const unlocked = stampCommission(world, c, Date.now());
    audio.play("place");
    this.persist();

    const resident = world.villagers.find((v) => v.id === id);
    const who = resident?.name ?? "They";
    const def = arrivalOf(c);

    // If the house happens to suit them, that's what they say instead of their
    // stock line — the payoff for having built the thing they like belongs at
    // the moment the house becomes theirs, not three conversations later. No
    // opposite case exists: a house that DOESN'T suit them says nothing extra
    // and they use their own line, which is already warm (content/tastes.ts).
    const delight = resident
      ? describeHome(world, resident).find((n) => n.kind === "delight_finish" || n.kind === "delight_piece")
      : undefined;
    const theirLine = (delight && homeLineFor(resident!.form, delight, this.rng)) || def.housedLine;
    this.openModal(
      (close) =>
        panel(CAST.office.name, "Town hall", [
          el("p", {}, [`Form 9, discharged ... ${who} lives at an address now.`]),
          el("p", { class: "quote" }, [`"${theirLine}"`]),
          // The one unlock in the game that is allowed to name itself, because
          // the town gave it to you across a counter. It said so before this
          // too — in a bare `<p class="unlock">` that had NO CSS RULE, so the
          // sentence rendered at exactly the weight of the paperwork above it.
          ...(unlocked
            ? [handed(skinDef(unlocked).name, "Available to build in, from now on.")]
            : []),
          actionRow([primaryBtn("...", close)]),
        ]),
      { dismissable: true },
    );
  }

  // --- Giving someone a home ----------------------------------------------------
  /** Enter bed-picking mode. The map marks every bed with whether it qualifies,
   *  and the next tap on one answers. */
  private beginAssigning(id: CharId): void {
    if (!this.world) return;
    this.assigning = id;
    this.buildTool = null; // building and choosing are different verbs
    this.syncToolUi();
    this.syncHomeCandidates();
    const who = this.world.villagers.find((v) => v.id === id);
    this.flash(`Pick a bed for ${who?.name ?? "them"}.  (Esc to stop)`);
  }

  private endAssigning(): void {
    this.assigning = null;
    this.renderer.setHomeCandidates([]);
  }

  private syncHomeCandidates(): void {
    if (!this.world || !this.assigning) return;
    this.renderer.setHomeCandidates(
      beds(this.world).map((b) => ({ x: b.x, y: b.y, ok: b.verdict.ok })),
    );
  }

  /** Say out loud when a build stroke changed where someone sleeps.
   *
   *  Taking a villager's only bed away is a real consequence and must not happen
   *  in silence — you'd find out at 2am when they turned up in the plaza. It
   *  isn't a refusal, though: demolishing your own furniture is always allowed
   *  (DESIGN §Materials — you can be slowed, never stopped). */
  private reportRehome(waitingBefore: CharId | null): void {
    if (!this.world) return;
    const waitingNow = pendingRehome(this.world);
    const nameOf = (id: CharId) =>
      this.world!.villagers.find((v) => v.id === id)?.name ?? "Someone";

    if (waitingNow && waitingNow !== waitingBefore) {
      this.flash(`${nameOf(waitingNow)} hasn't got a bed now.`);
    } else if (waitingBefore && !waitingNow) {
      this.flash(`${nameOf(waitingBefore)} follows it. Same bed, new spot.`);
    }
  }

  /** Close whatever stroke is open: the undo buffer, the paint set and the
   *  rehome offer, in the order they depend on each other.
   *
   *  Shared by the pointer-up path and by a second finger arriving, because a
   *  pan interrupting a paint has to close the stroke exactly as lifting off
   *  does — a half-closed stroke leaves `endStroke` uncalled, and its material
   *  delta is only honestly the stroke's at the moment the stroke closes
   *  (sim/undo.ts). */
  private finishStroke(): void {
    this.painted.clear();
    if (this.world) {
      endStroke(this.world);
      // Did this stroke take someone's bed away, or give it back? Runs after the
      // edits so it compares finished states.
      if (this.strokeBeds) {
        const waitingBefore = pendingRehome(this.world);
        rehomeAcrossStroke(this.world, this.strokeBeds);
        this.reportRehome(waitingBefore);
      }
      this.strokeBeds = null;
    }
    this.syncUndoUi();
  }

  /** Close the stroke a pan just interrupted, taking back the cell the hand
   *  painted on its way to panning.
   *
   *  Two fingers never land on the same millisecond, so EVERY pan begins as a
   *  one-finger tap — which, in build mode, is a wall. Found on screen: each
   *  two-finger drag left a stray cell behind at the touch-down point.
   *
   *  It undoes rather than debouncing, because the alternative is waiting to see
   *  whether a second finger arrives before honouring the first tap, and that
   *  would put latency on every deliberate tap to pay for the accidental one.
   *  `undoStroke` already restores cells and reverses the stroke's materials, so
   *  the fix is a call and not a mechanism.
   *
   *  ONE CELL ONLY. A drag already several cells long is a run somebody meant,
   *  and losing twenty walls to a stray thumb would be far worse than the bug
   *  this fixes. One cell is a hand settling; several are a decision. */
  private abandonStrokeForPan(): void {
    if (!this.world) return;
    const accidental = this.painted.size <= 1;
    endStroke(this.world); // commits it, which is what makes it undoable
    if (accidental) undoStroke(this.world);
    this.painted.clear();
    // Nothing to offer a rehome about: either the stroke was taken back, or it
    // stands and the pointer-up that eventually comes will close the books.
    this.strokeBeds = null;
    this.syncUndoUi();
  }

  /** The midpoint of every finger currently down, or null for none. Two fingers
   *  rotating slightly around a fixed centre should not pan, which a midpoint
   *  gives for free and tracking one finger would not. */
  private pointerMidpoint(): { x: number; y: number } | null {
    if (this.pointers.size === 0) return null;
    let x = 0;
    let y = 0;
    for (const p of this.pointers.values()) {
      x += p.x;
      y += p.y;
    }
    return { x: x / this.pointers.size, y: y / this.pointers.size };
  }

  /** Resolve a tap while choosing. A miss doesn't leave the mode — the player is
   *  aiming at a small piece of furniture on a phone, and dropping them out on
   *  the first fat-fingered tap would make this feel like it doesn't work. */
  private pickHome(x: number, y: number): void {
    if (!this.world || !this.assigning) return;
    const world = this.world;
    const id = this.assigning;

    const verdict = qualify(world, x, y);
    if (!verdict.ok) {
      // "No bed there" is almost always a missed tap rather than a decision, so
      // it stays quiet and keeps the mode; the real reasons get a line.
      if (verdict.why !== "no-bed") audio.play("deny");
      this.flash(DISQUALIFIER_TEXT[verdict.why]);
      return;
    }

    // Always a NAME, never a pronoun: every sentence below is singular ("X moves
    // in"), and a "they" fallback makes the verb disagree with itself.
    const who = world.villagers.find((v) => v.id === id)?.name ?? "Someone";
    if (verdict.occupant === id) {
      this.flash(`${who} already sleeps there.`);
      this.endAssigning();
      return;
    }

    const evicted =
      verdict.occupant !== null
        ? world.villagers.find((v) => v.id === verdict.occupant)
        : undefined;

    assign(world, id, x, y, Date.now());
    audio.play("place");
    this.endAssigning();
    this.persist();

    // Deadpan, about the arrangement rather than about you (§Tone). The eviction
    // is stated plainly instead of being hidden — it's a consequence the player
    // chose, and secrets are the only thing this game keeps quiet about.
    this.flash(
      evicted
        ? `${who} moves in. ${evicted.name} will need somewhere else.`
        : `${who} moves in. It's theirs now.`,
    );

    // If this was the house someone was waiting on, the paperwork closes here.
    this.settleCommission(id);
  }

  // --- Satchel ----------------------------------------------------------------
  /** What you're carrying, plus the finish picker. Deliberately one panel: the
   *  two are the whole materials system, and DESIGN §Materials is emphatic that
   *  appearance costs nothing — showing the free axis right beside the counted
   *  one is what makes that legible without a word of tutorial. */
  private openSatchel(): void {
    if (!this.world) return;
    const world = this.world;
    this.openModal((close) => {
      const body = el("div", {});

      // Carried items. Zero-count entries are omitted rather than shown greyed:
      // an empty row is a to-do list, and this game doesn't hand those out.
      const carried = ITEM_ORDER.filter((id) => count(world.inventory, id) > 0);
      if (carried.length === 0) {
        body.append(el("p", {}, ["Nothing on you. There are trees, and the ground is soft."]));
      } else {
        const list = el("div", { class: "satchel" });
        for (const id of carried) {
          const def = itemDef(id);
          list.append(
            el("div", { class: "satchel-row" }, [
              el("span", { class: "satchel-icon" }, [iconEl(def.icon)]),
              el("span", { class: "satchel-name" }, [def.name]),
              el("span", { class: "satchel-count" }, [String(count(world.inventory, id))]),
            ]),
          );
        }
        body.append(list);
      }

      // Finishes are NOT here any more, and their absence is the point.
      //
      // The satchel used to carry three rows — Wood finish, Stone finish, Cloth
      // finish — and they were wrong twice over. They set a town-wide look, so
      // choosing one restyled every floor you had ever laid; and they made you
      // name a material class before naming a colour, which is a menu standing
      // where a choice should be (DESIGN §Materials: "the player is never asked
      // which class they mean").
      //
      // Both went the same way: the picker moved into build mode, where you are
      // already holding the thing you are about to dress. See buildFinishRow().
      // What remains here is what the satchel is actually for — the stuff you
      // are carrying, and the one free axis that has nowhere better to live.

      // THE VARIETY PICKER IS NOT HERE ANY MORE, and its absence is the point —
      // the third time a picker has left this panel for the mode it belongs to.
      //
      // The argument is the finishes' argument, one row down: it set what the
      // next seed becomes, but it did it in a drawer you open to read counts,
      // three taps and a scroll away from the ground you were standing on. A
      // variety bought at the stall was a variety you never found, because
      // nothing on the way from the counter to the soil mentioned it existed.
      //
      // It moved to the act palette, where it appears while you hold the plant
      // tool. See syncSeedUi(). What remains here is what the satchel is
      // actually for — the stuff you are carrying, seed included, as the
      // ordinary countable thing it is.

      // The way out. A panel with nothing to answer still needs a door in it —
      // on a phone there is no Escape key and no back gesture into a canvas.
      return panel("Satchel", "What you're carrying", [body, actionRow([primaryBtn("Done", close)])]);
    }, { dismissable: true });
  }

  // --- Menu -------------------------------------------------------------------
  /** The pause menu: resume, or start a fresh town. Reachable from the HUD so
   *  a reset never needs the browser console (it can't be opened on a phone). */
  private openMenu(): void {
    const p = this.world?.player;
    const who = p ? `${p.name} · ${FORMS[p.form].name}` : "The Farm";
    // An embodied import wears its Meadow history here — the one place the
    // player's own memory log surfaces, stated flatly rather than as a stat.
    const past: string[] = [];
    if (p?.imported) {
      past.push("Came across from The Meadow.");
      const fav = recall(p.memory, "raised_favorite");
      if (fav?.value) past.push(`Raised on ${fav.value}, mostly.`);
    }
    this.openModal((close) => {
      const body = el("div", { class: "choices" });
      // One paragraph each, for the postcard's reason (see showPostcardIfAny):
      // these are complete sentences, so joining them with the house pause put a
      // full stop at the start of a line with no word in front of it.
      if (past.length > 0) body.append(...past.map((line) => el("p", {}, [line])));
      const soundLabel = () => (audio.isMuted() ? "Sound: off" : "Sound: on");
      const soundBtn = choiceBtn(soundLabel(), () => {
        audio.toggleMute();
        soundBtn.textContent = soundLabel();
        audio.play("menu"); // silent when it's just been muted — that's the confirmation
      });
      body.append(
        primaryBtn("Resume", close),
        soundBtn,
        choiceBtn("New town…", () => {
          // Second step: confirm, because a new town erases this one.
          body.replaceChildren(
            el("p", {}, [
              "Start a new town? Your homestead, crops, and neighbours here are erased ... This can't be undone.",
            ]),
            primaryBtn("Yes, start over", () => this.resetTown()),
            choiceBtn("Cancel", close),
          );
        }),
      );
      return panel("Menu", who, [body]);
    }, { dismissable: true });
  }

  // --- Input ------------------------------------------------------------------
  private wireInput(): void {
    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.modalOpen || !this.world) return;

      // In build mode the canvas is a canvas: taps place, drags paint a run.
      // Laying a wall a tile at a time by walking to each tile would be
      // miserable on a phone, and painting is the whole reason the view
      // flattens (DESIGN §Structures).
      if (this.buildTool) {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        // A SECOND FINGER MEANS PAN. One finger paints; two move the view. They
        // can't be told apart by where the touch lands — an edge-drag pan (the
        // obvious first guess) would fight painting along the edge of a wall,
        // which is exactly where you paint most.
        if (this.pointers.size === 2) {
          this.abandonStrokeForPan();
          this.panAnchor = this.pointerMidpoint();
          return;
        }
        this.painted.clear();
        // The stroke boundary for undo is the same span, deliberately: the set
        // that stops a sweep charging twice is already the game's definition of
        // "one gesture" (sim/undo.ts).
        beginStroke(this.world, buildToolLabel(this.buildTool));
        // Beds are a surface fact, so an underground stroke has none to track —
        // and a null here is what makes endPaint skip the rehome pass entirely
        // rather than diffing an untouched record for every lamp.
        // Asked as "not the surface" rather than "underground": beds are a
        // surface fact, and that is a statement about the surface, not about the
        // rock. The sky can never reach this line — nothing is buildable up
        // there — and the day something else can, the honest answer is already
        // written here.
        this.strokeBeds = this.layer() === "surface" ? bedKeys(this.world) : null;
        this.canvas.setPointerCapture(e.pointerId);
        this.buildAtPoint(e.clientX, e.clientY);
        return;
      }

      const wpt = this.renderer.screenToWorld(e.clientX, e.clientY);

      // Choosing someone a home takes the next tap on the map, before walking or
      // talking get a look at it — that's what makes it a targeting mode rather
      // than a thing you can absent-mindedly walk out of.
      if (this.assigning) {
        this.pickHome(Math.round(wpt.x), Math.round(wpt.y));
        return;
      }

      // Any tap that isn't the one we're waiting on cancels the errand. Tapping
      // somewhere else means you changed your mind, and a swing that arrives
      // after you've walked away is the game acting on a decision you revoked.
      this.walkingToAct = null;

      // Tap a villager you're standing near → talk; otherwise walk there.
      const near = this.villagerNear(wpt.x, wpt.y);
      if (near) {
        const p = this.world.player;
        if (Math.hypot(near.x - p.x, near.y - p.y) <= 2.6) {
          this.openDialogue(near.id);
          return;
        }
      }

      // TAP A TREE AND GO AND DEAL WITH IT.
      //
      // Nodes are solid, so a tap on one used to reach `moveTo` and stop dead
      // there: it set your heading and refused the step, which on a phone is a
      // tap that does nothing at all. Gathering then meant walking yourself into
      // range and pressing ACT separately — two gestures for the verb the game
      // asks you to perform most.
      //
      // It walks you ALONGSIDE and then performs the ordinary act, rather than
      // deciding for itself what tapping a tree means. `actionTarget` stays the
      // one place that answers that (ROADMAP §"The reticle is the promise"), so
      // this can never promise a different swing from the one the reticle draws.
      const tx = Math.round(wpt.x);
      const ty = Math.round(wpt.y);
      if (this.layer() === "surface" && nodeAt(this.world, tx, ty)) {
        const stand = this.approachTile(tx, ty);
        if (stand) {
          this.walkingToAct = { x: tx, y: ty };
          moveTo(this.world, stand.x, stand.y);
          return;
        }
      }
      moveTo(this.world, wpt.x, wpt.y);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.buildTool || this.modalOpen) return;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two fingers: slide the view by how far their midpoint moved. The view
      // follows the hand — drag left and the world goes left — so the camera
      // moves the other way, which is what makes it feel like moving paper.
      if (this.panAnchor && this.pointers.size >= 2) {
        const mid = this.pointerMidpoint();
        if (mid) {
          const per = this.renderer.pxPerTile();
          this.renderer.panBy((this.panAnchor.x - mid.x) / per, (this.panAnchor.y - mid.y) / per);
          this.panAnchor = mid;
        }
        return;
      }

      if (!this.canvas.hasPointerCapture(e.pointerId)) return; // only while dragging
      this.buildAtPoint(e.clientX, e.clientY);
    });

    const endPaint = (e: PointerEvent) => {
      if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      this.pointers.delete(e.pointerId);
      // Lifting one of two fingers must not resume painting from wherever the
      // other one happens to be resting. The pan ends when the gesture does.
      if (this.pointers.size < 2) this.panAnchor = null;
      this.finishStroke();
    };
    this.canvas.addEventListener("pointerup", endPaint);
    this.canvas.addEventListener("pointercancel", endPaint);

    // Desktop's version of the same room to work in. WASD already walks in build
    // mode, which moves the player; this moves only the view, so you can lay a
    // wall along a row you are not standing on. Passive false because a scroll
    // over the canvas must not also scroll the page behind it.
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this.buildTool || this.modalOpen) return;
        e.preventDefault();
        const per = this.renderer.pxPerTile();
        this.renderer.panBy(e.deltaX / per, e.deltaY / per);
      },
      { passive: false },
    );

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (this.modalOpen) {
        // Escape backs out of anything you're only looking at (satchel, menu).
        if (k === "escape" && this.closeModal) {
          this.closeModal();
          e.preventDefault();
        }
        return;
      }
      // Every mode needs a door — the same rule the modals live by. Bed-picking
      // has no panel of its own to close, so Escape is its way out.
      if (k === "escape" && this.assigning) {
        this.endAssigning();
        this.flash("Left it for now.");
        e.preventDefault();
        return;
      }
      // And build mode's. The BUILD button is the pointer door; Escape is the
      // keyboard one, and both go through `toggleBuild` so the pan resets and the
      // view flattens back through one path rather than two.
      if (k === "escape" && this.buildTool) {
        this.toggleBuild();
        e.preventDefault();
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      } else if (k === " " || k === "enter") {
        this.doAction();
        e.preventDefault();
      } else if (k >= "1" && k <= "4") {
        this.selectTool(TOOLS[Number(k) - 1].id);
      } else if (k === "r") {
        this.rotate();
      } else if (k === "b") {
        // Desktop shortcut for the BUILD button, in and out.
        this.toggleBuild();
      } else if (k === "f" && this.buildTool) {
        // The two levels, from the keyboard. Only inside build mode, where the
        // Furniture button exists — F over the open field would be a shortcut to
        // a control that isn't on screen. It toggles, because the way back out
        // being a different key would make the pair harder than the trip.
        if (this.buildGroup === "structure") this.openFurniture();
        else this.selectBuildGroup("structure");
      } else if (k === "e") {
        this.tryTalkNearest();
      } else if (k === "-" || k === "_") {
        // Out and in. Accepts the shifted twins so a hand that never let go of
        // shift still zooms rather than doing nothing.
        this.stepZoom(1);
      } else if (k === "=" || k === "+") {
        this.stepZoom(-1);
      } else if (k === "z") {
        // Bare Z as well as ctrl/cmd-Z: the browser has no text field to steal
        // it from here, and one-handed undo beside WASD is what a build session
        // actually reaches for.
        this.doUndo();
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.persist();
    });
    window.addEventListener("beforeunload", () => {
      this.persist();
    });
  }

  // --- Zoom -------------------------------------------------------------------
  // Deliberately NOT in the save. Zoom is a fact about the screen, not about the
  // town: a save carried from a desktop to a phone must not bring "two steps
  // back" with it, because the phone is already at the sprite-rule floor and has
  // no such step to stand on. Its own localStorage key, exactly like the mute
  // flag in audio.ts — and that is what keeps this change clear of
  // schemaVersion and a migration.

  /** The icon for a step, given how many there are. The first is always the
   *  near frame and the last always the far one, so a two-step ladder reads as
   *  the two ends rather than as "near and slightly-less-near". */
  private zoomIcon(step: number, count: number): IconName {
    if (step === 0) return "view_near";
    return step === count - 1 ? "view_far" : "view_mid";
  }

  /** Put the button in step with the renderer: right frame, or gone entirely. */
  private refreshZoom(): void {
    const count = this.renderer.zoomStepCount();
    // One step means the screen has nowhere to stand back to. See zoom.ts.
    this.hud.zoom.style.display = count > 1 ? "" : "none";
    if (count < 2) return;
    const step = this.renderer.zoomStepIndex();
    this.hud.zoom.replaceChildren(iconEl(this.zoomIcon(step, count)));
    hoverHint(this.hud.zoom, "How far back you're standing.  (− and =)");
  }

  private restoreZoom(): void {
    // A stored step from a wider window may not exist here; setZoomStep clamps
    // rather than throws, which is why this can trust whatever it reads back.
    const saved = Number(localStorage.getItem(ZOOM_KEY));
    if (Number.isFinite(saved) && saved > 0) this.renderer.setZoomStep(saved);
    this.refreshZoom();
  }

  private setZoom(step: number): void {
    const count = this.renderer.zoomStepCount();
    if (count < 2) return;
    // Not clamped here: setZoomStep clamps into the current ladder itself, and
    // reading the index back below is what makes `-` at the far end a no-op
    // rather than a stored value that drifts further out on every press.
    this.renderer.setZoomStep(step);
    this.refreshZoom();
    try {
      localStorage.setItem(ZOOM_KEY, String(this.renderer.zoomStepIndex()));
    } catch {
      // Private browsing, a full quota — the view still moved, and a zoom that
      // forgets itself next session is not worth breaking the tap over.
    }
  }

  /** The button: one tap per step, wrapping back to nearest. Wrapping rather
   *  than stopping at the far end because there is exactly one button, and a
   *  control that runs out of effect halfway through reads as broken. */
  private cycleZoom(): void {
    const count = this.renderer.zoomStepCount();
    if (count < 2) return;
    this.setZoom((this.renderer.zoomStepIndex() + 1) % count);
  }

  /** Desktop's version: step, don't cycle. A keyboard has two keys for this and
   *  therefore no reason to wrap — `-` at the far end should sit still, the way
   *  every zoom control anyone has used behaves. */
  private stepZoom(by: number): void {
    this.setZoom(this.renderer.zoomStepIndex() + by);
  }

  /** The layer the player is standing on, defaulting to the surface before a
   *  world exists. Every build path now takes one, and a `?? "surface"` at each
   *  of them is four chances to write it as "under" by accident. */
  private layer(): Layer {
    return this.world?.player.layer ?? "surface";
  }

  private villagerNear(x: number, y: number): { id: import("../content/cast").CharId; x: number; y: number } | null {
    if (!this.world) return null;
    for (const v of this.world.villagers) {
      // Present as well as on this layer. Without the first check a Ghost you
      // met last night is still standing in the grove at noon as far as this
      // function is concerned — invisible, and tappable (sim/presence.ts).
      if (!this.sameLayer(v) || !present(v, Date.now())) continue;
      if (Math.hypot(v.x - x, v.y - y) <= 0.9) return { id: v.id, x: v.x, y: v.y };
    }
    return null;
  }

  /** Is this villager standing on the layer the player is on?
   *
   *  This used to be a flat "nobody is down there to tap", which was right
   *  until somebody was: the Mole lives in the rock, and refusing every
   *  conversation underground would have made the one person you can only meet
   *  by digging the one person you cannot talk to. Matching layers keeps the
   *  original guarantee intact — you still can't talk to a villager walking
   *  over your head — while letting the exception speak. */
  private sameLayer(v: { layer?: import("../sim/types").Layer }): boolean {
    return (v.layer ?? "surface") === (this.world?.player.layer ?? "surface");
  }

  private tryTalkNearest(): void {
    if (!this.world) return;
    const p = this.world.player;
    let best: { id: import("../content/cast").CharId; d: number } | null = null;
    for (const v of this.world.villagers) {
      if (!this.sameLayer(v) || !present(v, Date.now())) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d <= 2.6 && (!best || d < best.d)) best = { id: v.id, d };
    }
    if (best) this.openDialogue(best.id);
  }

  /** Pick an ACT tool. Leaving build mode is implicit: choosing something you do
   *  with your hands is the clearest possible "I'm done editing". */
  private selectTool(t: Tool): void {
    this.tool = t;
    this.buildTool = null;
    // Picking up a tool leaves bed-picking. This is the mode's door on TOUCH,
    // where there is no Escape key — the act palette is on screen whenever build
    // mode isn't, so there's always a way out (house rule: every panel needs a
    // door).
    this.endAssigning();
    this.syncToolUi();
  }

  /** Enter or leave build mode. The one door: the BUILD button, Escape, and the
   *  B key all come through here, so the view, the camera pan and the palette
   *  can never disagree about which mode you're in.
   *
   *  Entering hands you the tool you had last, unless this layer refuses it —
   *  underground the palette is two tools long, and opening the mode with a
   *  wall selected would be opening it onto a refusal. */
  private toggleBuild(): void {
    if (this.buildTool) {
      this.buildTool = null;
      this.syncToolUi();
      return;
    }
    const allowed = BUILD_TOOLS.map((b) => b.id).filter((id) => toolAllowedOn(id, this.layer()));
    if (allowed.length === 0) {
      audio.play("deny");
      // The sky's palette is empty rather than short, so this is the one layer
      // where the mode cannot be opened at all — and it says why in the sky's own
      // terms. "Down here but rock" in the clouds would be the message the
      // underground wrote, read out somewhere it is nonsense.
      this.flash(
        this.layer() === "sky"
          ? "Nothing to build on up here. Nothing to build on at all."
          : "Nothing to build on down here but rock.",
      );
      return;
    }
    this.selectBuildTool(allowed.includes(this.lastBuildTool) ? this.lastBuildTool : allowed[0]);
  }

  /** Pick a BUILD tool, entering build mode if you weren't in it. This no longer
   *  toggles the mode off when you tap the held tool: with a real BUILD button
   *  on screen, a palette tap that quietly closed the whole bar would be the
   *  same gesture meaning two different things. */
  private selectBuildTool(t: BuildTool): void {
    // Most of the palette stops at the shaft. This was once a flat refusal, with
    // a correctness argument behind it — `furniture` was a surface record with no
    // layer in its keys, so anything placed from below would have stood up in the
    // field overhead. `underFurniture` (schema v21) is that argument answered, and
    // what remains is a design rule rather than a limitation: the rock is not
    // somewhere you build a room.
    if (!toolAllowedOn(t, this.layer())) {
      audio.play("deny");
      this.flash(
        this.layer() === "sky"
          ? "Not up here. There's nothing to put a wall on."
          : "Not down here. There's nothing to put a wall on but rock.",
      );
      return;
    }
    this.buildTool = t;
    this.lastBuildTool = t;
    // THE TAB FOLLOWS THE TOOL, and only here — when the tool actually changes.
    // Doing it inside syncToolUi instead meant every sync re-derived the tab
    // from whatever was in hand, so tapping a tab was overwritten the same
    // frame and the bar simply refused to change: browsing was impossible and
    // the only reachable tools were the ones in the held tool's own group.
    // Found by the screenshot harness timing out on an invisible button, which
    // is exactly what a thumb would have found.
    const group = BUILD_TOOLS.find((b) => b.id === t)?.group;
    if (group) this.buildGroup = group;
    this.endAssigning(); // same door, from the other palette
    this.syncToolUi();
  }

  /** Switch the build bar to another category.
   *
   *  Deliberately does NOT change the held tool. Browsing the tabs while holding
   *  a wall should leave you holding a wall — swapping the tool on every tab tap
   *  would mean you could not look at what exists without also putting down what
   *  you were doing, and on a phone the tabs are exactly where a stray thumb
   *  lands. Tapping a tool is what picks one up. */
  private selectBuildGroup(g: BuildGroup): void {
    this.buildGroup = g;
    if (g !== "structure") this.lastFurnitureGroup = g;
    this.syncToolUi();
  }

  /** Open the furniture level — the Furniture button, and F.
   *
   *  It reopens on the category you were last in rather than resetting to
   *  Seating, because going back out to place a floor and coming in again is the
   *  ordinary rhythm of furnishing a room, and landing somewhere else every time
   *  makes the trip cost a thought it shouldn't. Underground it picks whichever
   *  furniture category the rock allows; if none does, the button is not there to
   *  press in the first place.
   *
   *  Like `selectBuildGroup`, it does not touch the held tool: you can go and
   *  look at the beds while still holding a wall. */
  private openFurniture(): void {
    const live = FURNITURE_GROUPS.filter((g) =>
      BUILD_TOOLS.some((b) => b.group === g && toolAllowedOn(b.id, this.layer())),
    );
    if (live.length === 0) return;
    this.selectBuildGroup(live.includes(this.lastFurnitureGroup) ? this.lastFurnitureGroup : live[0]);
  }

  /** Turn the next piece a quarter turn. Only meaningful for furniture, so the
   *  control only appears when a furniture tool is held. */
  private rotate(): void {
    this.facing = FACINGS[(FACINGS.indexOf(this.facing) + 1) % FACINGS.length];
    this.syncToolUi();
  }

  private syncToolUi(): void {
    const building = this.buildTool !== null;
    for (const [id, btn] of this.hud.toolButtons) {
      btn.classList.toggle("selected", !building && id === this.tool);
    }
    // Which tabs have anything IN them here. Underground the palette is two
    // tools long, so most tabs would be empty — an empty tab is a promise the
    // room cannot keep, so it goes rather than showing an empty row.
    const live = new Set(
      BUILD_TOOLS.filter((b) => toolAllowedOn(b.id, this.layer())).map((b) => b.group),
    );
    // If the tab we're on has nothing left in it — you climbed down a shaft with
    // Seating open — move to one that does, rather than showing an empty row and
    // no way to understand why.
    if (!live.has(this.buildGroup)) {
      const first = BUILD_GROUPS.find((g) => live.has(g.id));
      if (first) this.buildGroup = first.id;
    }
    for (const [id, btn] of this.hud.groupButtons) {
      btn.classList.toggle("selected", id === this.buildGroup);
      btn.style.display = live.has(id) ? "" : "none";
    }
    // The two levels. Structure is the level you land in and has no tab of its
    // own, so the strip is simply absent there — and the Furniture button is
    // absent the whole time you are inside furniture, because the way back is
    // the "‹ Build" chip at the head of the strip and two ways out of one room
    // is one more than the room needs.
    const inFurniture = this.buildGroup !== "structure";
    this.hud.groupTabs.style.display = inFurniture ? "" : "none";
    // Nothing to open in a tunnel, where the rock allows two structure tools and
    // no furniture at all. Hidden rather than refusing, the same call the tools
    // themselves make one line down.
    const anyFurniture = FURNITURE_GROUPS.some((g) => live.has(g));
    this.hud.furniture.style.display = !inFurniture && anyFurniture ? "" : "none";
    // Only ever one tab's worth of tools at a time, and that IS the fix: the row
    // used to hold every tool in the game, which fitted while there were eleven
    // and did not at twenty-two.
    for (const [id, btn] of this.hud.buildButtons) {
      btn.classList.toggle("selected", id === this.buildTool);
      // The palette says what is possible here rather than offering nine tools
      // that refuse. Hidden, not disabled: a row of greyed buttons in a tunnel
      // reads as the game being broken, where two buttons read as what the rock
      // is for.
      const inTab = btn.dataset.group === this.buildGroup;
      btn.style.display = inTab && toolAllowedOn(id, this.layer()) ? "" : "none";
    }
    this.renderer.setBuildView(building);
    // Leaving build mode puts the camera back on the player, and this is the one
    // choke point every exit goes through — the palette toggle, Escape, picking
    // an ACT tool, and climbing a shaft all land here. A pan that outlived its
    // mode would leave you looking at an empty field with no way to ask where you
    // were standing.
    if (!building) {
      this.renderer.clearPan();
      this.panAnchor = null;
      this.pointers.clear();
    }
    this.renderer.setTool(this.tool);
    this.hud.root.classList.toggle("building", building);
    this.hud.build.classList.toggle("selected", building);
    this.hud.build.setAttribute("aria-pressed", String(building));
    // The same button in and out, so it has to say which way it goes. BUILD is
    // an invitation; once you're in it, the only thing it does is leave, and a
    // lit button still reading BUILD looks like the way further in.
    this.hud.build.textContent = building ? "DONE" : "BUILD";
    this.hud.build.setAttribute("aria-label", building ? "Leave build mode" : "Build mode");

    // Rotation is a furniture idea; showing it for walls would imply walls have
    // a facing, which is exactly the confusion the design avoids.
    const rotatable = this.buildTool !== null && this.buildTool in FURNITURE;
    this.hud.rotate.style.display = rotatable ? "" : "none";
    this.hud.rotate.replaceChildren(iconEl(FACING_ARROW[this.facing], SCALE.button));
    this.hud.rotate.title = rotatable
      ? `${furnitureDef(this.buildTool as never).name} facing ${this.facing.toUpperCase()}`
      : "Rotate";

    this.syncFinishUi();
    this.syncFurnitureTiles();
    this.syncSeedUi();
    this.syncUndoUi();
  }

  /** Paint the catalogue tiles for whichever furniture category is open.
   *
   *  ONLY THE VISIBLE ONES. Every furniture piece has a tile, but at most one
   *  category is on screen, and a thumb costs a rasterize the first time it is
   *  asked for in a given finish. Painting the hidden ninety per cent would put
   *  that cost on every sync — which includes every rotate and every finish tap,
   *  the two things that invalidate them.
   *
   *  Set on `src` rather than rebuilt as nodes, so the button keeps its hover
   *  hint, its listener and its selected ring across a repaint — the same reason
   *  the row is built once and only ever hidden and shown. */
  private syncFurnitureTiles(): void {
    const world = this.world;
    if (!world || !FURNITURE_GROUPS.includes(this.buildGroup)) return;
    for (const [id, btn] of this.hud.buildButtons) {
      if (btn.dataset.group !== this.buildGroup) continue;
      const art = btn.querySelector("img.tile-art") as HTMLImageElement | null;
      if (!art) continue;
      // Its OWN loaded finish, not the held tool's: the row shows five pieces at
      // once and each remembers what it was last built in, so a walnut bed and a
      // pine cot sit side by side exactly as they would in the room.
      art.src = furnitureThumb(id as FurnitureId, this.facing, loadedFinish(world, id), THUMB_SCALE);
    }
  }

  /** Rebuild the variety row for the seed about to go in the ground.
   *
   *  Shown only while the plant tool is held, and only outside build mode —
   *  the same rule the act palette itself follows, since the two modes are
   *  never on screen together. Any other tool and the row collapses, so it
   *  cannot sit under your thumb while you are digging.
   *
   *  Rebuilt from scratch on every sync rather than diffed, for the same reason
   *  the finish row is: the list grows mid-session — a variety can arrive from
   *  the stall between one tap and the next — and eight buttons is nothing to
   *  make. */
  private syncSeedUi(): void {
    const row = this.hud.seedVarieties;
    const world = this.world;
    if (!world || this.buildTool !== null || this.tool !== "plant") {
      row.replaceChildren();
      return;
    }

    // One unlocked variety is not a choice — a lone chip you cannot deselect is
    // furniture, not a control, and a fresh town holding only the carrot should
    // look exactly as it did before the row existed.
    const varieties = plantable(world);
    if (varieties.length < 2) {
      row.replaceChildren();
      return;
    }

    const chips = varieties.map((id) => {
      const crop = cropDef(id);
      const chip = el("button", { class: "finish-chip", ariaLabel: crop.name }, [
        // The crop's ripe colour, the same swatch-and-name pairing the finishes
        // use. Seed is one item and every variety of it looks identical in the
        // satchel, so the swatch is the only place the choice has a face.
        el("span", { class: "finish-swatch" }, []),
        el("span", { class: "finish-name" }, [crop.name]),
      ]);
      const swatch = chip.firstElementChild as HTMLElement;
      swatch.style.background = crop.ripeColor;
      chip.classList.toggle("chosen", id === world.seeds.selected);
      chip.addEventListener("click", () => {
        selectCrop(world, id);
        saveWorld(world);
        this.syncSeedUi();
      });
      // Time is the ONE axis varieties vary on (DESIGN §Materials: "no crop is
      // better than another"), so the hint states it plainly rather than
      // implying a yield or a value the game does not have.
      hoverHint(chip, `${crop.name} — ${ripenHours(crop)}h to ripen. Free to change.`);
      return chip;
    });
    row.replaceChildren(...chips);
  }

  /** Rebuild the finish row for the tool in hand.
   *
   *  ONE row, never one per material class. The tool already knows which classes
   *  it can wear, so asking the player to pick a category before picking a
   *  colour would be a menu standing where a choice should be (DESIGN
   *  §Materials). A floor simply offers the boards and the flagstones together,
   *  in table order, and the grouping falls out of that for free.
   *
   *  Rebuilt from scratch on every sync rather than diffed. The list changes
   *  with the held tool AND with what you have unlocked — walnut can arrive
   *  mid-session from the grove — and a dozen buttons is nothing to make. */
  private syncFinishUi(): void {
    const row = this.hud.buildFinishes;
    const tool = this.buildTool;
    if (!this.world || tool === null) {
      row.replaceChildren();
      return;
    }

    const world = this.world;
    const options = availableSkinsForClasses(world.skins.unlocked, toolFinishes(tool));
    // Erase wears nothing, and a tool with exactly one unlocked finish is not a
    // choice — a lone chip you cannot deselect is furniture, not a control. Both
    // collapse the row to nothing, which the bottom-anchored layout absorbs
    // without moving the tools.
    if (options.length < 2) {
      row.replaceChildren();
      return;
    }

    const held = loadedFinish(world, tool);
    const chips = options.map((id) => {
      const skin = skinDef(id);
      const chip = el("button", { class: "finish-chip", ariaLabel: skin.name }, [
        // The finish's own colour, so you see what you are about to lay rather
        // than reading its name and guessing. Swatch AND label, because "Ash"
        // and "Pale pine" are two beige squares otherwise.
        el("span", { class: "finish-swatch" }, []),
        el("span", { class: "finish-name" }, [skin.name]),
      ]);
      const swatch = chip.firstElementChild as HTMLElement;
      swatch.style.background = skin.color;
      chip.classList.toggle("chosen", id === held);
      chip.addEventListener("click", () => {
        world.skins.selected[tool] = id;
        saveWorld(world);
        this.syncFinishUi();
        // And the catalogue, which is drawn IN the finish — picking ash and
        // watching five pine chairs sit there unchanged makes the tiles look
        // like stock photography rather than a picture of what you'd place.
        this.syncFurnitureTiles();
      });
      hoverHint(chip, `${skin.name} — free to change, on anything already built.`);
      return chip;
    });
    row.replaceChildren(...chips);
  }

  /** Show the undo control only in build mode, and only when there's a stroke to
   *  take back. It names what it will undo — "Undo the wall" beats "Undo",
   *  because after a long session the thing you regret and the thing you did
   *  last aren't reliably the same, and this says which one you're getting.
   *
   *  It does NOT vanish on a timer (ROADMAP): a button that disappears as you
   *  reach for it is its own small betrayal. */
  private syncUndoUi(): void {
    const show = this.buildTool !== null && this.world !== null && canUndo(this.world);
    this.hud.undo.style.display = show ? "" : "none";
    if (show) this.hud.undo.title = `Undo ${undoLabel(this.world!)}.  (Z)`;

    // Whether the bar's modifier slot has anything in it, which is what draws
    // its separator rule. Read off the rotate button rather than recomputed:
    // this runs at the tail of `syncToolUi`, which has just set that display,
    // and also on its own from `doUndo`, which hasn't touched it — one source
    // that's right in both cases beats two that agree by coincidence.
    const rotating = this.hud.rotate.style.display !== "none";
    this.hud.root.classList.toggle("has-mods", show || rotating);
  }

  private doUndo(): void {
    if (!this.world || this.modalOpen) return;
    if (!undoStroke(this.world)) return;
    audio.play("dig");
    // Deliberately not "the wall, put back" — the label reads fine on a button
    // but the erase case ("taking that down, put back") doesn't survive being
    // made into a sentence. One line that's always true beats four that mostly
    // are (§Tone: about the object, not about you).
    this.flash("Back the way it was.");
    this.persist();
    this.syncUndoUi();
  }

  /** Apply the held build tool to a tapped tile. Silent on a tile already
   *  painted this drag, so sweeping back and forth doesn't charge twice. */
  private buildAtPoint(clientX: number, clientY: number): void {
    if (!this.world || !this.buildTool) return;
    if (!toolAllowedOn(this.buildTool, this.layer())) return;
    const wpt = this.renderer.screenToWorld(clientX, clientY);
    const x = Math.round(wpt.x);
    const y = Math.round(wpt.y);
    const key = `${x},${y}`;
    if (this.painted.has(key)) return;
    this.painted.add(key);

    captureCell(this.world, x, y); // before the edit — it snapshots the old state
    const res = buildAt(this.world, this.buildTool, x, y, Date.now(), this.facing, this.layer());
    // Only speak up when something happened or the player is actually short of
    // materials. Dragging across ground you can't build on shouldn't natter.
    if (res.changed) {
      audio.play(this.buildTool === "erase" ? "dig" : "place");
      this.flash(res.message);
      this.persist();
    } else if (res.broke) {
      audio.play("deny");
      this.flash(res.message);
    }
  }

  /** The walkable neighbour of a solid tile that you'd reach first. Four-way,
   *  because that is what `nodeNear` searches from the other end — offering a
   *  diagonal to stand on would put you somewhere ACT can't reach the thing you
   *  tapped. Null when the node is walled in on all four sides. */
  private approachTile(x: number, y: number): { x: number; y: number } | null {
    if (!this.world) return null;
    const p = playerTile(this.world);
    const sides = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ].filter((c) => isWalkable(this.world!, c.x, c.y, "surface"));
    if (sides.length === 0) return null;
    let best = sides[0];
    for (const c of sides) {
      if (Math.hypot(c.x - p.x, c.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = c;
    }
    return best;
  }

  /** Finish the errand set by tapping a node: turn to face it and act. Called
   *  once the walk has ended, however it ended — arriving, or being stopped by
   *  something that moved into the way. */
  private resolveWalkToAct(): void {
    const goal = this.walkingToAct;
    if (!goal || !this.world) return;
    if (this.world.player.target) return; // still on the way
    this.walkingToAct = null;
    const at = playerTile(this.world);
    // Adjacency, not arrival at a particular cell: a wall going up mid-walk can
    // land you on the node's other side, which is just as good. If the walk was
    // blocked outright, we are nowhere near it and there is nothing to swing at.
    if (Math.abs(at.x - goal.x) + Math.abs(at.y - goal.y) !== 1) return;
    // Aims by MOVING at it: `moveTo` sets your heading before it tests
    // walkability, so a refused step into something solid is exactly how the
    // game already turns you to face a tree (sim/game.ts).
    moveTo(this.world, goal.x, goal.y);
    this.doAction();
  }

  private doAction(): void {
    if (!this.world || this.modalOpen) return;
    const res = contextAction(this.world, this.tool, Date.now());
    // Reading opens a panel instead of flashing a line. It reports `changed:
    // false` — nothing in the world moved — so it has to be caught before the
    // cue below, or standing at the board would play the refusal sound.
    if (res.kind === "read") {
      this.openErrands();
      return;
    }
    // A room reading its own past. Caught here for the same reason `read` is —
    // it changes nothing, so the cue rule below would sound a refusal — but it
    // flashes its line instead of opening anything. There is no panel for this
    // on purpose: a screen listing what a building remembers is a page with
    // gaps in it, and a page with gaps is a checklist (ROADMAP §Phase 9a).
    if (res.kind === "remember") {
      audio.play(ACTION_CUES.remember);
      this.flash(res.message);
      return;
    }
    // Changing layer puts down anything that doesn't make sense on the new one.
    // You can reach a shaft with a wall in hand (ACT works in build mode), and
    // arriving underground still holding it would leave the palette lit for a
    // tool that refuses every tap. A LAMP survives the trip, which is the whole
    // point of it — carry it down and keep building.
    // The staircase changes layer for the same reasons and needs the same three
    // lines. Up there NOTHING survives the trip — the sky's palette is empty —
    // so this is also what puts the wall down at the top of the steps.
    if (res.kind === "shaft" || res.kind === "stair") {
      if (this.buildTool && !toolAllowedOn(this.buildTool, this.layer())) this.buildTool = null;
      this.syncToolUi(); // the palette itself changes shape, held tool or not
      this.endAssigning();
    }
    // The cue follows what actually happened, so a refused action sounds
    // different from a successful one without needing to read the message.
    audio.play(res.changed ? ACTION_CUES[res.kind] : "deny");
    // THE LADDER SAYS ITS PIECE ONCE.
    //
    // "Down. The air goes cool and stops moving." is a good line the first time
    // and furniture by the twentieth, and a shaft is a thing you go up and down
    // repeatedly while working one tunnel. It is the same argument mining
    // already makes against a toast per swing: a notification on the quietest
    // verb in the game turns it into a stream.
    //
    // The CUE still plays every time, because that is feedback about the world
    // changing rather than a sentence to read. Session-scoped and not stored:
    // once-ever would want a save flag, which is a schema bump and a migration
    // for a flavour line, and once per sitting is where nearly all the noise
    // was. Same shape as `announcedArrival`.
    const repeatedShaftLine = res.kind === "shaft" && this.saidShaftLine;
    if (res.kind === "shaft") this.saidShaftLine = true;
    if (!repeatedShaftLine) this.flash(res.message);
    this.persist();
  }

  /** Apply held-key movement by nudging the walk target a step ahead each frame,
   *  so WASD reads as continuous movement (desktop enhancement). */
  private applyKeyboardMovement(): void {
    if (!this.world || this.keys.size === 0) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    if (dx === 0 && dy === 0) return;
    const p = this.world.player;
    const len = Math.hypot(dx, dy);
    moveTo(this.world, p.x + (dx / len) * 1.2, p.y + (dy / len) * 1.2);
  }

  // --- Loop -------------------------------------------------------------------
  private loop = (): void => {
    const now = performance.now();
    let frame = (now - this.last) / 1000;
    this.last = now;
    if (frame > 0.25) frame = 0.25; // avoid a huge catch-up after a stall
    this.acc += frame;

    if (this.world && !this.modalOpen) {
      this.applyKeyboardMovement();
      const wall = Date.now();
      while (this.acc >= FIXED_DT) {
        tick(this.world, FIXED_DT, wall);
        this.acc -= FIXED_DT;
      }
      this.resolveWalkToAct();
      this.noticeArrival();
      this.noticeFestival();
      this.noticeParting();
      this.noticeFound();
      this.noticeNudges();
    } else {
      this.acc = 0;
    }

    if (this.world) {
      this.renderer.draw(this.world, Date.now());
      // The hum is a fact about distance, so the number comes from sim
      // (sim/hum.ts) and this line is the whole of the UI's part in it.
      audio.setHum(humLevel(this.world));
      this.hud.clock.textContent = clockLabel(Date.now());
      // From the TILE, not from `player.x`: the player is a point moving
      // continuously across cells, and a reference reading off the float would
      // flicker between two numbers while you stand still.
      const at = playerTile(this.world);
      this.hud.survey.textContent = surveyLabel(at.x, at.y);
      if (now - this.lastSaveAt > AUTOSAVE_MS) {
        this.lastSaveAt = now;
        this.persist();
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };


  // --- Modal plumbing ---------------------------------------------------------
  /** Open a panel. `dismissable` adds the two escape hatches a panel you only
   *  LOOK at needs — tap outside, or Escape — on top of whatever button the
   *  panel itself offers. The one-way flows (title, onboarding, the land claim)
   *  leave it off: those must be answered, not skipped. */
  private openModal(
    build: (close: () => void) => HTMLElement,
    opts: { dismissable?: boolean; scrimClass?: string } = {},
  ): void {
    audio.play("menu");
    this.modalOpen = true;
    let closeFn: () => void = () => {};
    const close = modal(build(() => closeFn()), {
      onDismiss: opts.dismissable ? () => closeFn() : undefined,
      scrimClass: opts.scrimClass,
    });
    closeFn = () => {
      close();
      this.modalOpen = false;
      this.closeModal = null;
    };
    this.closeModal = opts.dismissable ? closeFn : null;
  }

  /** Closes the open panel when Escape should work; null otherwise. */
  private closeModal: (() => void) | null = null;

  /** A brief floating status message near the action button. */
  private flash(text: string): void {
    this.hud.flash.textContent = text;
    // Sit above whatever is on the bottom of the screen right now. The build bar
    // is taller than the toast's resting offset — taller still with a finish row
    // open — so the one message you most need to read, "you haven't the boards
    // for that", was printing underneath the tray you were pressing. Measured
    // rather than a second fixed offset: the bar's height changes with the held
    // tool, so a number that cleared it for walls hid it for floors. It measures
    // to 0 while the bar is display:none, which leaves the resting offset.
    const bar = this.hud.buildBar.offsetHeight;
    this.hud.flash.style.bottom = `${Math.max(120, BUILD_BAR_BOTTOM + bar + 14)}px`;
    this.hud.flash.style.opacity = "1";
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => {
      this.hud.flash.style.opacity = "0";
    }, 1800);
  }
  private flashTimer = 0;

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** The single write path to storage. Never call saveWorld directly — this is
   *  what makes `resetting` authoritative (see the field's docblock). */
  private persist(): void {
    if (this.world && !this.resetting) saveWorld(this.world);
  }

  /** Wipe the save and boot back into the title flow. Order matters: stop the
   *  loop and drop the world FIRST so nothing can re-persist it, then clear
   *  storage, then reload. */
  private resetTown(): void {
    this.resetting = true;
    this.stop();
    this.world = null;
    clearWorld();
    location.reload();
  }
}

// --- HUD construction ---------------------------------------------------------
interface HudRefs {
  root: HTMLElement;
  clock: HTMLElement;
  survey: HTMLElement;
  flash: HTMLElement;
  /** "Call it off" — visible only while a hider is out there. The one piece of
   *  HUD a game owns, and it exists because the closing row can't: the way out
   *  of everything else lives in the conversation panel, and the hider is by
   *  construction not standing next to you to have one. */
  giveUp: HTMLElement;
  toolButtons: [Tool, HTMLElement][];
  buildButtons: [BuildTool, HTMLElement][];
  /** The category tabs, and which tools each button belongs to. */
  groupButtons: [BuildGroup, HTMLElement][];
  /** The finish row, refilled per held tool by syncFinishUi(). */
  buildFinishes: HTMLElement;
  /** The variety row, refilled by syncSeedUi() while the plant tool is held. */
  seedVarieties: HTMLElement;
  /** The category strip, hidden entirely at the structure level. */
  groupTabs: HTMLElement;
  /** The way in to furniture, and the one tool-row button that holds no tool. */
  furniture: HTMLElement;
  /** The whole build tray. Kept only so the toast can measure it and sit above
   *  it — the bar's height changes with the held tool, so no fixed offset in the
   *  stylesheet can clear it. */
  buildBar: HTMLElement;
  build: HTMLElement;
  rotate: HTMLElement;
  undo: HTMLElement;
  zoom: HTMLElement;
}

function buildHud(
  root: HTMLElement,
  onTool: (t: Tool) => void,
  onBuildTool: (t: BuildTool) => void,
  onBuildGroup: (g: BuildGroup) => void,
  onFurniture: () => void,
  onBuild: () => void,
  onRotate: () => void,
  onUndo: () => void,
  onAction: () => void,
  onMenu: () => void,
  onSatchel: () => void,
  onNotebook: () => void,
  onZoom: () => void,
): HudRefs {
  const menu = el("button", { class: "menu-btn", ariaLabel: "Menu" }, [iconEl("menu")]);
  menu.addEventListener("click", onMenu);
  hoverHint(menu, "Menu — sound, and starting a new town.");
  const satchel = el("button", { class: "menu-btn satchel-btn", ariaLabel: "Satchel" }, [iconEl("satchel")]);
  // Third in the corner the hands already reach for. It sits with the satchel
  // rather than in the menu because the menu is for the GAME (sound, a new
  // town) and this is part of the world — what you have noticed while living
  // in it. A journal filed under settings would read as a manual.
  const notebook = el("button", { class: "menu-btn notebook-btn", ariaLabel: "Notebook" }, [
    iconEl("notebook"),
  ]);
  notebook.addEventListener("click", onNotebook);
  hoverHint(notebook, "Notebook — what you've noticed, and what you've been told.");
  satchel.addEventListener("click", onSatchel);
  hoverHint(satchel, "Satchel — what you're carrying.");
  // How far back you're standing. Fourth in the corner cluster rather than in the
  // menu, even though the menu is where sound lives and both are comfort
  // settings: sound is set once and forgotten, and this is something you reach
  // for mid-build to check what you're laying out against the ground around it.
  // A view control filed under settings is a view control nobody turns.
  //
  // Hidden outright on a screen with only one step (see refreshZoom). The
  // build palette already established that in this HUD — a greyed row of
  // buttons in a tunnel reads as the game being broken, where fewer buttons
  // reads as the place having less in it.
  const zoom = el("button", { class: "menu-btn zoom-btn", ariaLabel: "View" }, [iconEl("view_near")]);
  zoom.addEventListener("click", onZoom);
  const clock = el("div", { class: "clock" }, ["—"]);
  // NO SEASON CHIP. There was one, reading "autumn" under the clock, and it went
  // because the game already says the season twice in better places: the whole
  // scene palette is keyed to it (render/renderer.ts scenePalette), so autumn
  // arrives as the ground changing colour, and `describeSeason` (sim/seasons.ts)
  // hands villagers a line about it, so the town mentions it out loud.
  //
  // A label naming what you can already see is the same instinct the museum spent
  // a whole phase refusing — it turns something you notice into something you
  // read. The hour earns its chip because you act on the hour; the month is
  // weather, and weather doesn't need a caption.
  // The survey reference, in the top-right corner (sim/survey.ts for why it's
  // allowed to exist at all when the season chip wasn't). Its own chip rather
  // than a second line inside the clock's: the hour and the grid reference change
  // on completely different rhythms, and sharing a box would make the whole thing
  // twitch every time you take a step.
  const survey = el("div", { class: "clock survey" }, ["—"]);
  hoverHint(survey, "Where you are on the Bureau's survey grid. The plaza is zero.");
  // Position, wrapping and the fade all live in `.clock.flash` now — this used to
  // set four inline styles, which meant the toast's look was split across two
  // files and the CSS half couldn't see it.
  const flash = el("div", { class: "clock flash" });

  // The hide-and-seek escape hatch. A chip, not a panel: giving up costs
  // nothing and records nothing (sim/play.ts), so the button should weigh
  // about as much as the toast it sits over. Hidden except mid-game — an
  // always-there button for a rarely-there state would be HUD noise.
  const giveUp = el("button", { class: "clock giveup" }, ["Call it off"]);
  hoverHint(giveUp, "Stop looking. They'll come out — no harm done.");

  const toolButtons: [Tool, HTMLElement][] = [];
  const palette = el("div", { class: "tool-palette" });
  for (const t of TOOLS) {
    const btn = el("button", { class: "tool", ariaLabel: t.label }, [iconEl(t.icon, SCALE.button)]);
    btn.addEventListener("click", () => onTool(t.id));
    hoverHint(btn, `${t.label} — ${t.hint}${t.key ? `  (${t.key})` : ""}`);
    if (t.id === "dig") btn.classList.add("selected");
    toolButtons.push([t.id, btn]);
    palette.append(btn);
  }

  // What the next seed becomes, beside the hand that sows it.
  //
  // It lives HERE and not in the satchel for the reason the finishes moved into
  // build mode: you pick the look while you are already holding the thing you
  // are about to dress (see the note above `buildFinishes`). Buried in the
  // satchel, a variety you had bought was a variety you never found — the stall
  // sold you a radish and the game went on planting carrots without ever
  // mentioning there was a choice.
  //
  // This is still a MODE and not a prompt (ROADMAP §"Seeds — one item, many
  // varieties"). Nothing here opens on ACT, nothing stands between the tap and
  // the tile, and the reticle goes on promising exactly what the button does —
  // the row only makes the standing selection visible where it applies.
  // ABOVE the tools rather than beside them, and that placement is the finish
  // row's lesson a second time. Beside the palette it had only the strip between
  // the tools and the ACT column to live in — about 170px on a phone — so eight
  // varieties stacked into a single column eight chips tall and swallowed 40% of
  // the screen. Above them it has the whole width, wraps to two or three short
  // rows, and clears the BUILD/ACT column entirely, which only occupies the
  // bottom band.
  const seedVarieties = el("div", { class: "seed-varieties" });

  // The build bar: one strip across the foot of the screen, present only while
  // build mode is on. A strip rather than a column because the list is eleven
  // long and growing, and because a bar along the bottom is what every building
  // game has taught people to look for — the tools you're choosing between sit
  // in a row under the thing you're building, not beside it.
  const buildButtons: [BuildTool, HTMLElement][] = [];
  const buildTools = el("div", { class: "build-tools" });
  // Every tool button is built once and kept; the tabs only change which are
  // DISPLAYED. Rebuilding the row per tab would throw away the selected class,
  // the hover hints and the icon elements on every tap, and `syncBuildUi` holds
  // references to these nodes.
  // Two kinds of button, and the difference is what the thing on it is FOR.
  //
  // A structure tool keeps its 12x12 icon, because the icon answers the question
  // you have — this one lays floor, that one raises wall — and there is nothing
  // else in the row it could be confused with.
  //
  // A furniture piece gets a TILE: the game's own art for that piece, in the
  // finish it would be placed in, turned the way it would be turned. A drawn
  // icon can say "chair"; only the real raster can say WHICH chair, and once a
  // category holds four of them that is the entire question. The image is filled
  // in by syncFurnitureTiles, because it depends on world state the HUD does not
  // have when it is built.
  for (const t of BUILD_TOOLS) {
    const tile = FURNITURE_GROUPS.includes(t.group);
    const face = tile
      ? [el("img", { class: "tile-art" }), el("span", { class: "tile-name" }, [t.label])]
      : [iconEl(t.icon, SCALE.button)];
    const btn = el("button", { class: tile ? "tool tile" : "tool", ariaLabel: t.label }, face);
    btn.addEventListener("click", () => onBuildTool(t.id));
    hoverHint(btn, `${t.label} — ${t.hint}`);
    btn.dataset.group = t.group;
    buildButtons.push([t.id, btn]);
    buildTools.append(btn);
  }

  // The way in to furniture, and it lives in the TOOL ROW rather than over it,
  // in the series with Wall and Window. That is the claim the two levels make:
  // these six are the things you can be holding at the top level, and five of
  // them place something while the sixth opens a drawer of things that do.
  //
  // A chair, not the word "Furniture". It was worded for one revision on the
  // tabs' argument — a category is a word — and the argument is weaker here than
  // it looks: the tabs are a strip of five words reading as a sentence of
  // options, where this is one button in a row of six pictures, and the odd one
  // out was the wide text chip rather than the idea it named. The chair icon is
  // free to mean this now, since the furniture tools stopped using icons at all
  // the day they became art tiles.
  //
  // BEFORE the bulldozer, not after it. Take-down is the end of the row on
  // purpose — it is the only button here that removes rather than places, and it
  // keeps the end the way the modifiers keep the far end past their gap.
  const furniture = el("button", { class: "tool furniture-btn", ariaLabel: "Furniture" }, [
    iconEl("chair", SCALE.button),
  ]);
  furniture.addEventListener("click", onFurniture);
  hoverHint(furniture, "Furniture — chairs, tables, beds, storage, lamps.  (F)");
  const eraseBtn = buildButtons.find(([id]) => id === "erase")?.[1];
  if (eraseBtn) buildTools.insertBefore(furniture, eraseBtn);
  else buildTools.append(furniture);

  // The tabs. Text rather than icons, because a group is a WORD — "Seating" is
  // one glance and a picture of a category is a riddle. They sit above the tool
  // row for the same reason the finish swatches do: the bar is anchored to the
  // bottom of the screen, so anything that appears up here grows it upward and
  // the tools stay where they were.
  //
  // Only the furniture categories are here, and the strip only exists once you
  // have gone in — the categories of a thing you are not doing have no business
  // sitting over the bar while you lay a floor. `back` is the way out, first in
  // the strip and reading as a direction rather than a category.
  const groupTabs = el("div", { class: "build-groups" });
  const back = el("button", { class: "build-group build-back", ariaLabel: "Back to building" }, ["‹ Build"]);
  back.addEventListener("click", () => onBuildGroup("structure"));
  groupTabs.append(back);
  const groupButtons: [BuildGroup, HTMLElement][] = [];
  for (const g of BUILD_GROUPS) {
    if (!g.tab) continue;
    const btn = el("button", { class: "build-group", ariaLabel: g.label }, [g.label]);
    btn.addEventListener("click", () => onBuildGroup(g.id));
    groupButtons.push([g.id, btn]);
    groupTabs.append(btn);
  }

  const rotate = el("button", { class: "tool rotate-btn", ariaLabel: "Rotate" }, [iconEl("arrow_s", SCALE.button)]);
  rotate.addEventListener("click", onRotate);
  hoverHint(rotate, "Turn the next piece you place.  (R)");
  rotate.style.display = "none";

  // The counterclockwise ring, and the erase tool beside it is a bulldozer —
  // two arrows in one palette is the trap this row has fallen into twice.
  const undo = el("button", { class: "tool undo-btn", ariaLabel: "Undo" }, [iconEl("undo", SCALE.button)]);
  undo.addEventListener("click", onUndo);
  undo.style.display = "none";

  // What the held tool will be finished in. Filled by syncFinishUi() because the
  // contents depend on the tool in hand — a floor offers boards and flagstones,
  // a cushion offers cloth, erase offers nothing at all.
  //
  // ABOVE the tool row, and that placement is load-bearing. The row comes and
  // goes as you switch tools, and the bar is anchored to the bottom of the
  // screen, so a row that appears here grows the bar UPWARD and the tools stay
  // exactly where your thumb left them. Below the tools it would shove the whole
  // strip down mid-build — the same failure the reserved two-wide slot for
  // rotate and undo was added to prevent, one axis over.
  const buildFinishes = el("div", { class: "build-finishes" });

  // Rotate and undo ride at the end of the tool strip, past a gap. They modify
  // what you're about to do rather than choosing it, so they want to be in
  // reach of the tools without reading as one of them.
  // The tile box, asked of the content rather than written into the stylesheet —
  // see thumbBox. The CSS lays the tiles out; this says how big the biggest
  // thing in them is, so a new piece cannot quietly overflow its own tile.
  const box = thumbBox(THUMB_SCALE);
  const buildBar = el("div", { class: "build-bar" }, [
    groupTabs,
    buildFinishes,
    el("div", { class: "build-row" }, [buildTools, el("div", { class: "build-mods" }, [rotate, undo])]),
  ]);
  buildBar.style.setProperty("--tile-art-w", `${box.w}px`);
  buildBar.style.setProperty("--tile-art-h", `${box.h}px`);

  // BUILD sits directly above ACT, in the one corner the hands already live in,
  // and the two never appear together: entering build mode is the game putting
  // your hands down and picking up the plans. Same button leaves.
  const build = el("button", { class: "mode-btn", ariaLabel: "Build mode" }, ["BUILD"]);
  build.addEventListener("click", onBuild);
  hoverHint(build, () =>
    build.classList.contains("selected")
      ? "Done building — back to your hands.  (B)"
      : "Build mode — floors, walls, and furniture. Press it again to leave.  (B)",
  );

  const action = el("button", { class: "action-btn" }, ["ACT"]);
  action.addEventListener("click", onAction);
  hoverHint(action, "Use the held tool on the tile you're standing on.  (Space)");

  const hud = el("div", { class: "hud" }, [
    menu,
    satchel,
    notebook,
    zoom,
    clock,
    survey,
    flash,
    giveUp,
    // The row and the tools ride in one bottom-left stack, so the row growing a
    // second line of chips pushes itself up and leaves the tools exactly where
    // your thumb left them — the same reason the build bar stacks its finishes
    // above its tools rather than below.
    el("div", { class: "act-dock" }, [seedVarieties, palette]),
    buildBar,
    build,
    action,
  ]);
  root.append(hud);
  return { root: hud, clock, survey, flash, giveUp, toolButtons, buildButtons, groupButtons, groupTabs, furniture, buildFinishes, seedVarieties, buildBar, build, rotate, undo, zoom };
}

// --- Panel helpers ------------------------------------------------------------
/** `who` is the eyebrow over the heading — the place the panel is speaking from
 *  ("Town Hall", "The counter"). Pass "" where the heading already says it: a
 *  card titled "Settle in" over the words CHOOSE YOUR SPRITE is two headings for
 *  one screen, and the eyebrow is the one carrying no information. Empty means
 *  no node at all rather than an empty one, or the gap above the title stays. */
/** A screen you operate. `who` is the EYEBROW — the institution, "The Counter" —
 *  and `title` is the heading.
 *
 *  `face` is the amendment §A counter is a screen wanted and did not make. That
 *  entry moved Gary to `speechPanel` and gave the test — "whether a face would
 *  look wrong on it" — and then left the five counters alone, which was right
 *  about the FRAME and wrong about the speaker: Arabella's opener is
 *  "Cloth ... You can't grow it, and you certainly can't chop it down." That is
 *  her voice, in the house ellipsis style CLAUDE.md defines for spoken lines,
 *  printed as body text under a heading with nobody attached to it.
 *
 *  This is NOT `speechPanel` folded in, which its own docblock refuses and still
 *  should: a counter is a list of prices you scroll and a conversation is not,
 *  and `who` keeps meaning exactly one thing. It is the smaller claim — that a
 *  screen someone is TALKING ON should show whose voice it is. The errands board
 *  is the control: it has no speaker, gets no face, and reads correctly today. */
/** Somebody's name, made possessive — "Harness's", "Bors'".
 *
 *  A name ending in s takes the bare apostrophe, which is the convention the rest
 *  of the game's prose follows and the one that stops "Bors's Notebook" appearing
 *  on the cover of the panel a player named Bors opens most. Names are typed by
 *  the player, so this has to survive anything: a name that is one character, or
 *  ends in a full stop, still comes back readable.
 *
 *  Not in sim and not in content — a possessive is a fact about how English is
 *  written, not about the world, and nothing outside a heading needs it. */
function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function panel(
  title: string,
  who: string,
  body: (Node | string)[],
  face?: HTMLElement,
): HTMLElement {
  const heading = [
    ...(who ? [el("div", { class: "who" }, [who])] : []),
    el("h2", {}, [title]),
  ];
  return el("div", { class: "panel" }, [
    face
      ? el("div", { class: "panel-head" }, [face, el("div", { class: "panel-titles" }, heading)])
      : el("div", {}, heading),
    ...body.map((b) => (typeof b === "string" ? document.createTextNode(b) : b)),
  ]);
}
/** The dialogue frame: a creature, and a speech bubble.
 *
 *  TWO THINGS ON SCREEN, and keeping it to two is the whole design. The obvious
 *  build is a panel containing a bubble containing the text, with the name on a
 *  third plate and the replies on a fourth row — and mocked up, that is four
 *  nested boxes to say one sentence. So the panel's own paper goes away
 *  entirely: `.panel.speech` keeps the class for the modal plumbing but draws
 *  nothing, the bubble is the only box, and it SWALLOWS the replies rather than
 *  letting them sit outside as a fifth element.
 *
 *  Deliberately not a variant of `panel()`. The counters and the satchel are
 *  screens with a heading; this is a person talking, and the difference is the
 *  whole layout rather than one extra node — folding both into one function
 *  would mean a `who` argument that sometimes means an eyebrow and sometimes a
 *  portrait. It does mean conversations no longer look like the shop, which is
 *  the deliberate part: a counter is a screen, a conversation is a person.
 *
 *  The plate holds the NAME and nothing else. Secrets carry a `CharDef.subtitle`
 *  saying where they're from ("Out past the woods"), which the old flat panel
 *  printed as an eyebrow and which briefly rode along under the name here — but
 *  a two-line plate is a label with a caption, and the speaker is the quiet half
 *  of this layout. The subtitle now goes unread; see cast.ts. */
function speechPanel(
  name: string,
  face: HTMLElement,
  said: HTMLElement,
  replies: HTMLElement,
): HTMLElement {
  return el("div", { class: "panel speech" }, [
    el("div", { class: "speech-top" }, [
      el("div", { class: "speaker" }, [face, el("div", { class: "speaker-name" }, [name])]),
      el("div", { class: "speech-said" }, [said, replies]),
    ]),
  ]);
}
/** The face for a counter's heading — the same portrait the dialogue frame draws,
 *  through the same `lookFor`, so the person behind the counter is the person you
 *  meet on the path. Sized by `.portrait.counter`, which is half `.portrait.tile`
 *  and still an exact multiple of 16. */
function counterFace(id: keyof typeof CAST): HTMLElement {
  const who = CAST[id];
  const face = portrait(who.form, lookFor(id, who.form));
  face.classList.add("counter");
  return face;
}
/** The announcement card — the town HANDING you something.
 *
 *  THE HALF OF THE UNLOCK RULE THAT IS ALLOWED TO SPEAK (ROADMAP §10, item 1).
 *  Everything you FIND stays silent and goes in the Notebook: no toast may name
 *  walnut or slate, because a secret announced is a secret spoiled. But a person
 *  handing you something across a counter is not a secret, and pretending it is
 *  produces the opposite bug — Gary discharges Form 9 and the game whispers.
 *  So the two channels are told apart by WHO CAUSED IT, not by what it is.
 *
 *  It is a card and not a toast because the toast is the wrong weight: `flash()`
 *  is one slot for 1.8 seconds, shared with "no room in your satchel" and "that
 *  bed won't take". A permanent unlock arriving in the same channel as a refusal,
 *  and then deleting itself, was the actual defect here.
 *
 *  It is a card and not a modal because both callers ALREADY have a panel open —
 *  the hall's discharge and the stall's counter — and stacking a second one on
 *  top is refused everywhere else in this file for the same reason (see
 *  `openMuseum`). It appears inside the panel you were already reading.
 *
 *  `said` is the giver's own line, when they have one. It goes UNDER the plain
 *  statement, not over it: what you now have is the news, and their remark about
 *  it is the flavour. The hall passes nothing, because the resident's line is
 *  already quoted directly above and two quotes would be a conversation. */
function handed(what: string, note: string, said?: string): HTMLElement {
  return el("div", { class: "handed" }, [
    el("div", { class: "handed-what" }, [what]),
    el("div", { class: "handed-note" }, [note]),
    ...(said ? [el("p", { class: "quote" }, [`"${said}"`])] : []),
  ]);
}
function actionRow(buttons: HTMLElement[]): HTMLElement {
  return el("div", { class: "row" }, buttons);
}
function primaryBtn(label: string, onClick: () => void): HTMLElement {
  const b = el("button", { class: "btn primary" }, [label]);
  b.addEventListener("click", onClick);
  return b;
}
/** A panel button that is an icon and nothing else. The label doesn't disappear —
 *  it becomes the accessible name and the hover hint, so the button reads the
 *  same to a screen reader as the worded version it replaces. */
function iconBtn(icon: IconName, label: string, onClick: () => void): HTMLElement {
  const b = el("button", { class: "btn icon-btn", ariaLabel: label }, [
    iconEl(icon, SCALE.button),
  ]);
  b.addEventListener("click", onClick);
  hoverHint(b, label);
  return b;
}
function choiceBtn(label: string, onClick: () => void): HTMLElement {
  const b = el("button", { class: "btn" }, [label]);
  b.addEventListener("click", onClick);
  return b;
}
/** An eyebrow over a control. `.field` is what puts air between one group and
 *  whatever sits above it — Settle in is four of these stacked, and without it
 *  an eyebrow reads as a caption on the box above rather than a heading for the
 *  box below. The trailing empty div this used to carry did nothing (no rule
 *  matches it, so it had no height); the margin does the job it was reaching
 *  for. */
function labeled(label: string, control: HTMLElement): HTMLElement {
  return el("div", { class: "field" }, [el("div", { class: "who" }, [label]), control]);
}
