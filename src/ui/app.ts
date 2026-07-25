// The app shell: builds the canvas + HUD, runs the fixed-timestep game loop,
// routes touch/keyboard input into the sim, and drives the modal flows (title,
// onboarding, the land-claim opening beat, dialogue, the "while you were out"
// postcard). This is the ui layer — the only place DOM events meet the sim.

import { el, hoverHint, modal } from "./dom";
import { Renderer } from "../render/renderer";
import type { WorldState, Tool, BuildTool, HomesteadSpot } from "../sim/types";
import { FACINGS, FURNITURE, furnitureDef } from "../content/furniture";
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
} from "../sim/game";
import { officeLandClaimLine, homeLineFor } from "../sim/dialogue";
import { describeHome } from "../sim/home";
import { saveWorld, loadWorld, hasSave, clearWorld } from "../sim/save";
import { makeRng } from "../sim/rng";
import type { Rng } from "../sim/rng";
import { clockLabel } from "../sim/time";
import { STANDARD_FORMS, FORMS } from "../content/canon/forms";
import type { AdultForm } from "../content/canon/forms";
import { importFromMeadow } from "../sim/meadow_import";
import type { MeadowImport } from "../sim/meadow_import";
import { recall } from "../sim/memory";
import { count } from "../sim/inventory";
import { beginStroke, captureCell, endStroke, undoStroke, canUndo, undoLabel } from "../sim/undo";
import { qualify, assign, beds, rehomeAcrossStroke, bedKeys, pendingRehome, DISQUALIFIER_TEXT } from "../sim/assign";
import type { CharId, NewcomerId } from "../content/cast";
import { isNewcomer } from "../content/cast";
import {
  openCommission,
  commissionFor,
  commissionState,
  stampCommission,
  fileCommission,
  arrivalOf,
  shortfallText,
} from "../sim/commission";
import { ITEM_ORDER, itemDef } from "../content/items";
import { availableSkins, skinDef } from "../content/skins";
import type { SkinClass } from "../content/skins";
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
  none: "menu",
};

const FIXED_DT = 1 / 60; // seconds per sim step
const AUTOSAVE_MS = 15_000;

// Two palettes, because there are two ways to touch the world (DESIGN
// §Structures). ACT tools apply to the tile at your feet via the action button.
// BUILD tools put you in build mode: the view flattens and you tap the map.
//
// `hint` is the hover descriptor (desktop only — see `hoverHint`). It says what
// the button DOES, not what it is: the icon and label already carry the noun,
// so a hint that repeats it is worth nothing to the person hovering. `key` is
// the desktop shortcut where one exists; the hint is the only place they're
// written down, since a keyboard legend would be HUD clutter on a phone.
const TOOLS: { id: Tool; icon: string; label: string; hint: string; key?: string }[] = [
  { id: "dig", icon: "⛏️", label: "Dig", hint: "Turn the ground into soil you can plant in.", key: "1" },
  { id: "gather", icon: "🧺", label: "Gather", hint: "Pick what's ripe, or fell a tree or rock beside you.", key: "2" },
  { id: "plant", icon: "🌱", label: "Plant", hint: "Sow a seed in tilled soil.", key: "3" },
  { id: "water", icon: "💧", label: "Water", hint: "Water what's planted. Growth resumes.", key: "4" },
];

const BUILD_TOOLS: { id: BuildTool; icon: string; label: string; hint: string }[] = [
  { id: "plank", icon: "🪵", label: "Floor", hint: "Lay floorboards. Costs wood." },
  { id: "wall", icon: "🧱", label: "Wall", hint: "Raise a wall. Close a shape and it gets a roof." },
  { id: "door", icon: "🚪", label: "Door", hint: "Cut a doorway. Put it on a south wall so it shows." },
  { id: "bed", icon: "🛏️", label: "Bed", hint: "A bed makes a room somewhere to live." },
  { id: "table", icon: "🪑", label: "Table", hint: "Place a table. Press R to turn it." },
  { id: "chair", icon: "💺", label: "Chair", hint: "Place a chair. Press R to turn it." },
  { id: "shelf", icon: "🗄️", label: "Shelf", hint: "Place a shelf. Press R to turn it." },
  { id: "erase", icon: "↩️", label: "Take back down", hint: "Remove what you built here. Materials come back." },
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
const FACING_ARROW: Record<Facing, string> = { s: "↓", w: "←", n: "↑", e: "→" };

const SPOTS: { id: HomesteadSpot; name: string; blurb: string }[] = [
  { id: "riverside", name: "Riverside", blurb: "Water to the west. The Blob approves of the drama." },
  { id: "forest", name: "Forest edge", blurb: "Trees at your back. Quiet. The Ghost may visit." },
  { id: "hilltop", name: "Hilltop", blurb: "A view of the whole town. The wind has opinions." },
];

export class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private world: WorldState | null = null;
  private rng: Rng = makeRng(1);
  private tool: Tool = "dig";
  /** Non-null means BUILD MODE: the view flattens and canvas taps place instead
   *  of walking. Null means the normal 3/4 living view. */
  private buildTool: BuildTool | null = null;
  /** Tiles already painted during the current drag, so dragging back and forth
   *  over one tile doesn't re-charge or re-message for it. */
  private painted = new Set<string>();
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
      () => this.rotate(),
      () => this.doUndo(),
      () => this.doAction(),
      () => this.openMenu(),
      () => this.openSatchel(),
    );
    this.wireInput();
    window.addEventListener("resize", () => this.renderer.resize());
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
    this.world = world;
    this.rng = makeRng(world.seed);
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
          el("p", {}, [lines.join("\n. ... ")]),
          actionRow([primaryBtn("Back to it", close)]),
        ]),
      { dismissable: true },
    );
  }

  // --- Title + onboarding -----------------------------------------------------
  private showTitle(): void {
    this.hud.root.style.display = "none";
    this.openModal((close) =>
      panel("The Farm", "The town they were sent to", [
        el("p", {}, ["It's real. And it's delightful.\n. ... Someone stamped the paperwork."]),
        actionRow([
          primaryBtn("Arrive", () => {
            close();
            this.showOnboarding();
          }),
        ]),
      ]),
    );
  }

  private showOnboarding(): void {
    let name = "";
    let form: AdultForm = "scholar";
    let spot: HomesteadSpot = "riverside";

    const nameInput = el("input", {
      class: "import-box",
      placeholder: "Your name",
      // A single-line text field reusing the styled box.
      value: "",
    }) as HTMLInputElement;
    nameInput.style.minHeight = "auto";
    nameInput.style.fontFamily = "inherit";
    nameInput.style.fontSize = "16px";
    nameInput.addEventListener("input", () => (name = nameInput.value));

    const formRow = el("div", { class: "choices" });
    const formButtons = STANDARD_FORMS.map((f) => {
      const b = choiceBtn(FORMS[f].name, () => {
        form = f;
        for (const other of formButtons) other.classList.remove("primary");
        b.classList.add("primary");
      });
      if (f === form) b.classList.add("primary");
      return b;
    });
    formRow.append(...formButtons);

    const spotRow = el("div", { class: "choices" });
    const spotButtons = SPOTS.map((s) => {
      const b = choiceBtn(`${s.name} — ${s.blurb}`, () => {
        spot = s.id;
        for (const other of spotButtons) other.classList.remove("primary");
        b.classList.add("primary");
      });
      if (s.id === spot) b.classList.add("primary");
      return b;
    });
    spotRow.append(...spotButtons);

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
          for (const other of buttons) other.classList.remove("primary");
          b.classList.add("primary");
          // Embodying takes its name and form, so those pickers stop applying.
          const embodied = role === "player";
          nameInput.disabled = embodied;
          for (const fb of formButtons) fb.style.opacity = embodied ? "0.45" : "1";
        });
        if (importRole === role) b.classList.add("primary");
        buttons.push(b);
        return b;
      };
      roleRow.replaceChildren(
        pick("villager", "They move in next door"),
        pick("player", "Embody them — you are this sprite"),
      );
    };
    importBox.addEventListener("input", refreshImport);

    this.openModal((close) =>
      panel("Settle in", "Choose your sprite", [
        el("p", {}, ["You're a sprite too — newly arrived."]),
        labeled("Name", nameInput),
        labeled("Form", formRow),
        labeled("Homestead", spotRow),
        labeled("From The Meadow (optional)", importBox),
        importBlock,
        actionRow([
          primaryBtn("Claim your plot", () => {
            refreshImport(); // catch a paste that never fired an input event
            const world = newWorld({ name, form, spot, meadowImport, importRole });
            close();
            this.beginWorld(world);
            this.runLandClaim();
          }),
        ]),
      ]),
    );
  }

  /** The opening cutscene: the Office Creature stamps your land claim, line by
   *  line (DESIGN §"Opening beat"). */
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
      this.openModal((close) =>
        panel(speech.who, "Town Hall", [
          el("p", {}, [speech.text]),
          actionRow([
            primaryBtn(officeLandClaimLine(line + 1) ? "Next" : "It's mine", () => {
              close();
              step(line + 1);
            }),
          ]),
        ]),
      );
    };
    step(0);
  }

  // --- Dialogue ---------------------------------------------------------------
  private openDialogue(villagerId: CharId): void {
    if (!this.world) return;
    const world = this.world;
    const speech = talk(world, villagerId, this.rng);
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
    }

    // Offering a home is a CONVERSATION, not a construction act (ROADMAP 2b
    // step 4). It only appears when there's a bed in town to offer — an option
    // that's always there and usually does nothing is a worse tutorial than no
    // option at all.
    const offerable = beds(world).length > 0;

    this.openModal(
      (close) =>
        panel(speech.who, "Farm resident", [
          el("p", {}, [speech.text]),
          actionRow([
            ...(offerable
              ? [
                  choiceBtn("There's a room for you", () => {
                    close();
                    this.beginAssigning(villagerId);
                  }),
                ]
              : []),
            primaryBtn("...", close),
          ]),
        ]),
      { dismissable: true },
    );
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
  private noticeArrival(): void {
    if (!this.world) return;
    const open = openCommission(this.world);
    if (!open || open.id === this.announcedArrival) return;
    this.announcedArrival = open.id;
    const who = this.world.villagers.find((v) => v.id === open.id);
    this.flash(`${who?.name ?? "Someone"} has pitched a tent near the plaza.`);
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
        panel("Tired Office Creature", "Town hall", [
          el("p", {}, [`Form 9, discharged. ... ${who} lives at an address now.`]),
          el("p", { class: "quote" }, [`"${theirLine}"`]),
          ...(unlocked
            ? [el("p", { class: "unlock" }, [`${skinDef(unlocked).name} is available to build in.`])]
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

    assign(world, id, x, y);
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
              el("span", { class: "satchel-icon" }, [def.icon]),
              el("span", { class: "satchel-name" }, [def.name]),
              el("span", { class: "satchel-count" }, [String(count(world.inventory, id))]),
            ]),
          );
        }
        body.append(list);
      }

      // Finishes — free, weightless, applied to anything you build next.
      for (const cls of ["wood", "stone"] as SkinClass[]) {
        const options = availableSkins(world.skins.unlocked, cls);
        if (options.length === 0) continue;
        const row = el("div", { class: "choices" });
        const buttons = options.map((id) => {
          const b = choiceBtn(skinDef(id).name, () => {
            world.skins.selected[cls] = id;
            for (const other of buttons) other.classList.remove("primary");
            b.classList.add("primary");
            saveWorld(world);
          });
          if (world.skins.selected[cls] === id) b.classList.add("primary");
          return b;
        });
        row.append(...buttons);
        body.append(labeled(`${cls === "wood" ? "Wood" : "Stone"} finish — free`, row));
      }

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
      if (past.length > 0) body.append(el("p", {}, [past.join("\n. ... ")]));
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
              "Start a new town? Your homestead, crops, and neighbours here are erased.\n. ... This can't be undone.",
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
        this.painted.clear();
        // The stroke boundary for undo is the same span, deliberately: the set
        // that stops a sweep charging twice is already the game's definition of
        // "one gesture" (sim/undo.ts).
        beginStroke(this.world, buildToolLabel(this.buildTool));
        this.strokeBeds = bedKeys(this.world);
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

      // Tap a villager you're standing near → talk; otherwise walk there.
      const near = this.villagerNear(wpt.x, wpt.y);
      if (near) {
        const p = this.world.player;
        if (Math.hypot(near.x - p.x, near.y - p.y) <= 2.6) {
          this.openDialogue(near.id);
          return;
        }
      }
      moveTo(this.world, wpt.x, wpt.y);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.buildTool || this.modalOpen) return;
      if (!this.canvas.hasPointerCapture(e.pointerId)) return; // only while dragging
      this.buildAtPoint(e.clientX, e.clientY);
    });

    const endPaint = (e: PointerEvent) => {
      if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      this.painted.clear();
      if (this.world) {
        endStroke(this.world);
        // Did this stroke take someone's bed away, or give it back? Runs after
        // the edits so it compares finished states.
        if (this.strokeBeds) {
          const waitingBefore = pendingRehome(this.world);
          rehomeAcrossStroke(this.world, this.strokeBeds);
          this.reportRehome(waitingBefore);
        }
        this.strokeBeds = null;
      }
      this.syncUndoUi();
    };
    this.canvas.addEventListener("pointerup", endPaint);
    this.canvas.addEventListener("pointercancel", endPaint);

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
        // Desktop shortcut into build mode; the palette is the touch path.
        this.selectBuildTool(this.buildTool ?? "wall");
      } else if (k === "e") {
        this.tryTalkNearest();
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

  private villagerNear(x: number, y: number): { id: import("../content/cast").CharId; x: number; y: number } | null {
    if (!this.world) return null;
    for (const v of this.world.villagers) {
      if (Math.hypot(v.x - x, v.y - y) <= 0.9) return { id: v.id, x: v.x, y: v.y };
    }
    return null;
  }

  private tryTalkNearest(): void {
    if (!this.world) return;
    const p = this.world.player;
    let best: { id: import("../content/cast").CharId; d: number } | null = null;
    for (const v of this.world.villagers) {
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
    // where there is no Escape key — the palettes are always on screen, so
    // there's always a way out (house rule: every panel needs a door).
    this.endAssigning();
    this.syncToolUi();
  }

  /** Pick a BUILD tool, entering build mode. Tapping the selected one again
   *  leaves — the palette doubles as the mode toggle, so there's no separate
   *  button to hunt for. */
  private selectBuildTool(t: BuildTool): void {
    this.buildTool = this.buildTool === t ? null : t;
    this.endAssigning(); // same door, from the other palette
    this.syncToolUi();
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
    for (const [id, btn] of this.hud.buildButtons) {
      btn.classList.toggle("selected", id === this.buildTool);
    }
    this.renderer.setBuildView(building);
    this.renderer.setTool(this.tool);
    this.hud.root.classList.toggle("building", building);

    // Rotation is a furniture idea; showing it for walls would imply walls have
    // a facing, which is exactly the confusion the design avoids.
    const rotatable = this.buildTool !== null && this.buildTool in FURNITURE;
    this.hud.rotate.style.display = rotatable ? "" : "none";
    this.hud.rotate.textContent = FACING_ARROW[this.facing];
    this.hud.rotate.title = rotatable
      ? `${furnitureDef(this.buildTool as never).name} facing ${this.facing.toUpperCase()}`
      : "Rotate";

    this.syncUndoUi();
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
    const wpt = this.renderer.screenToWorld(clientX, clientY);
    const x = Math.round(wpt.x);
    const y = Math.round(wpt.y);
    const key = `${x},${y}`;
    if (this.painted.has(key)) return;
    this.painted.add(key);

    captureCell(this.world, x, y); // before the edit — it snapshots the old state
    const res = buildAt(this.world, this.buildTool, x, y, Date.now(), this.facing);
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

  private doAction(): void {
    if (!this.world || this.modalOpen) return;
    const res = contextAction(this.world, this.tool, Date.now());
    // The cue follows what actually happened, so a refused action sounds
    // different from a successful one without needing to read the message.
    audio.play(res.changed ? ACTION_CUES[res.kind] : "deny");
    this.flash(res.message);
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
      this.noticeArrival();
    } else {
      this.acc = 0;
    }

    if (this.world) {
      this.renderer.draw(this.world, Date.now());
      this.hud.clock.textContent = clockLabel(Date.now());
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
  private openModal(build: (close: () => void) => HTMLElement, opts: { dismissable?: boolean } = {}): void {
    audio.play("menu");
    this.modalOpen = true;
    let closeFn: () => void = () => {};
    const close = modal(build(() => closeFn()), {
      onDismiss: opts.dismissable ? () => closeFn() : undefined,
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
  flash: HTMLElement;
  toolButtons: [Tool, HTMLElement][];
  buildButtons: [BuildTool, HTMLElement][];
  rotate: HTMLElement;
  undo: HTMLElement;
}

function buildHud(
  root: HTMLElement,
  onTool: (t: Tool) => void,
  onBuildTool: (t: BuildTool) => void,
  onRotate: () => void,
  onUndo: () => void,
  onAction: () => void,
  onMenu: () => void,
  onSatchel: () => void,
): HudRefs {
  const menu = el("button", { class: "menu-btn", ariaLabel: "Menu" }, ["☰"]);
  menu.addEventListener("click", onMenu);
  hoverHint(menu, "Menu — sound, and starting a new town.");
  const satchel = el("button", { class: "menu-btn satchel-btn", ariaLabel: "Satchel" }, ["🎒"]);
  satchel.addEventListener("click", onSatchel);
  hoverHint(satchel, "Satchel — what you're carrying.");
  const clock = el("div", { class: "clock" }, ["—"]);
  const flash = el("div", {
    class: "clock",
  });
  flash.style.top = "auto";
  flash.style.bottom = "120px";
  flash.style.transition = "opacity 0.3s";
  flash.style.opacity = "0";

  const toolButtons: [Tool, HTMLElement][] = [];
  const palette = el("div", { class: "tool-palette" });
  for (const t of TOOLS) {
    const btn = el("button", { class: "tool", ariaLabel: t.label }, [t.icon]);
    btn.addEventListener("click", () => onTool(t.id));
    hoverHint(btn, `${t.label} — ${t.hint}${t.key ? `  (${t.key})` : ""}`);
    if (t.id === "dig") btn.classList.add("selected");
    toolButtons.push([t.id, btn]);
    palette.append(btn);
  }

  const buildButtons: [BuildTool, HTMLElement][] = [];
  const buildPalette = el("div", { class: "tool-palette build-palette" });
  for (const t of BUILD_TOOLS) {
    const btn = el("button", { class: "tool", ariaLabel: t.label }, [t.icon]);
    btn.addEventListener("click", () => onBuildTool(t.id));
    hoverHint(btn, `${t.label} — ${t.hint}`);
    buildButtons.push([t.id, btn]);
    buildPalette.append(btn);
  }

  const rotate = el("button", { class: "tool rotate-btn", ariaLabel: "Rotate" }, ["↓"]);
  rotate.addEventListener("click", onRotate);
  hoverHint(rotate, "Turn the next piece you place.  (R)");
  rotate.style.display = "none";

  // Not ↩ — that's the erase tool's icon, and two buttons in the same palette
  // with the same glyph is a trap.
  const undo = el("button", { class: "tool undo-btn", ariaLabel: "Undo" }, ["⟲"]);
  undo.addEventListener("click", onUndo);
  undo.style.display = "none";

  const action = el("button", { class: "action-btn" }, ["ACT"]);
  action.addEventListener("click", onAction);
  hoverHint(action, "Use the held tool on the tile you're standing on.  (Space)");

  const hud = el("div", { class: "hud" }, [
    menu,
    satchel,
    clock,
    flash,
    palette,
    buildPalette,
    rotate,
    undo,
    action,
  ]);
  root.append(hud);
  return { root: hud, clock, flash, toolButtons, buildButtons, rotate, undo };
}

// --- Panel helpers ------------------------------------------------------------
function panel(title: string, who: string, body: (Node | string)[]): HTMLElement {
  return el("div", { class: "panel" }, [
    el("div", { class: "who" }, [who]),
    el("h2", {}, [title]),
    ...body.map((b) => (typeof b === "string" ? document.createTextNode(b) : b)),
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
function choiceBtn(label: string, onClick: () => void): HTMLElement {
  const b = el("button", { class: "btn" }, [label]);
  b.addEventListener("click", onClick);
  return b;
}
function labeled(label: string, control: HTMLElement): HTMLElement {
  return el("div", {}, [
    el("div", { class: "who" }, [label]),
    control,
    el("div", {}, []),
  ]);
}
