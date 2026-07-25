// The app shell: builds the canvas + HUD, runs the fixed-timestep game loop,
// routes touch/keyboard input into the sim, and drives the modal flows (title,
// onboarding, the land-claim opening beat, dialogue, the "while you were out"
// postcard). This is the ui layer — the only place DOM events meet the sim.

import { el, modal } from "./dom";
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
import { officeLandClaimLine } from "../sim/dialogue";
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
const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "dig", icon: "⛏️", label: "Dig" },
  { id: "gather", icon: "🧺", label: "Gather" },
  { id: "plant", icon: "🌱", label: "Plant" },
  { id: "water", icon: "💧", label: "Water" },
];

const BUILD_TOOLS: { id: BuildTool; icon: string; label: string }[] = [
  { id: "plank", icon: "🪵", label: "Floor" },
  { id: "wall", icon: "🧱", label: "Wall" },
  { id: "door", icon: "🚪", label: "Door" },
  { id: "bed", icon: "🛏️", label: "Bed" },
  { id: "table", icon: "🪑", label: "Table" },
  { id: "chair", icon: "💺", label: "Chair" },
  { id: "shelf", icon: "🗄️", label: "Shelf" },
  { id: "erase", icon: "↩️", label: "Take back down" },
];

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
  private openDialogue(villagerId: import("../content/cast").CharId): void {
    if (!this.world) return;
    const speech = talk(this.world, villagerId, this.rng);
    if (!speech) return;
    audio.play("talk");
    this.openModal(
      (close) =>
        panel(speech.who, "Farm resident", [
          el("p", {}, [speech.text]),
          actionRow([primaryBtn("...", close)]),
        ]),
      { dismissable: true },
    );
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
        this.canvas.setPointerCapture(e.pointerId);
        this.buildAtPoint(e.clientX, e.clientY);
        return;
      }

      const wpt = this.renderer.screenToWorld(e.clientX, e.clientY);
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
    this.syncToolUi();
  }

  /** Pick a BUILD tool, entering build mode. Tapping the selected one again
   *  leaves — the palette doubles as the mode toggle, so there's no separate
   *  button to hunt for. */
  private selectBuildTool(t: BuildTool): void {
    this.buildTool = this.buildTool === t ? null : t;
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
}

function buildHud(
  root: HTMLElement,
  onTool: (t: Tool) => void,
  onBuildTool: (t: BuildTool) => void,
  onRotate: () => void,
  onAction: () => void,
  onMenu: () => void,
  onSatchel: () => void,
): HudRefs {
  const menu = el("button", { class: "menu-btn", title: "Menu" }, ["☰"]);
  menu.addEventListener("click", onMenu);
  const satchel = el("button", { class: "menu-btn satchel-btn", title: "Satchel" }, ["🎒"]);
  satchel.addEventListener("click", onSatchel);
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
    const btn = el("button", { class: "tool", title: t.label }, [t.icon]);
    btn.addEventListener("click", () => onTool(t.id));
    if (t.id === "dig") btn.classList.add("selected");
    toolButtons.push([t.id, btn]);
    palette.append(btn);
  }

  const buildButtons: [BuildTool, HTMLElement][] = [];
  const buildPalette = el("div", { class: "tool-palette build-palette" });
  for (const t of BUILD_TOOLS) {
    const btn = el("button", { class: "tool", title: t.label }, [t.icon]);
    btn.addEventListener("click", () => onBuildTool(t.id));
    buildButtons.push([t.id, btn]);
    buildPalette.append(btn);
  }

  const rotate = el("button", { class: "tool rotate-btn", title: "Rotate" }, ["↓"]);
  rotate.addEventListener("click", onRotate);
  rotate.style.display = "none";

  const action = el("button", { class: "action-btn" }, ["ACT"]);
  action.addEventListener("click", onAction);

  const hud = el("div", { class: "hud" }, [menu, satchel, clock, flash, palette, buildPalette, rotate, action]);
  root.append(hud);
  return { root: hud, clock, flash, toolButtons, buildButtons, rotate };
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
