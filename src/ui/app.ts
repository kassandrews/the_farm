// The app shell: builds the canvas + HUD, runs the fixed-timestep game loop,
// routes touch/keyboard input into the sim, and drives the modal flows (title,
// onboarding, the land-claim opening beat, dialogue, the "while you were out"
// postcard). This is the ui layer — the only place DOM events meet the sim.

import { el, modal } from "./dom";
import { Renderer } from "../render/renderer";
import type { WorldState, Tool, HomesteadSpot } from "../sim/types";
import {
  newWorld,
  tick,
  contextAction,
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

const FIXED_DT = 1 / 60; // seconds per sim step
const AUTOSAVE_MS = 15_000;

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "dig", icon: "⛏️", label: "Dig" },
  { id: "plank", icon: "🪵", label: "Plank" },
  { id: "plant", icon: "🌱", label: "Plant" },
  { id: "water", icon: "💧", label: "Water" },
];

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
  private keys = new Set<string>();
  private acc = 0;
  private last = performance.now();
  private raf = 0;
  private lastSaveAt = 0;
  private hud!: HudRefs;
  private modalOpen = false;

  constructor(root: HTMLElement) {
    this.canvas = el("canvas", { id: "scene" });
    root.append(this.canvas);
    this.renderer = new Renderer(this.canvas);
    this.hud = buildHud(
      root,
      (t) => this.selectTool(t),
      () => this.doAction(),
      () => this.openMenu(),
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
    this.openModal((close) =>
      panel("A postcard from the Farm", "While you were out", [
        el("p", {}, [lines.join("\n. ... ")]),
        actionRow([primaryBtn("Back to it", close)]),
      ]),
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
      placeholder: "Optional: paste a save exported from The Meadow to import a retired sprite as your neighbour.",
    }) as HTMLTextAreaElement;

    this.openModal((close) =>
      panel("Settle in", "Choose your sprite", [
        el("p", {}, ["You're a sprite too — newly arrived."]),
        labeled("Name", nameInput),
        labeled("Form", formRow),
        labeled("Homestead", spotRow),
        labeled("From The Meadow (optional)", importBox),
        actionRow([
          primaryBtn("Claim your plot", () => {
            const meadowImport = importBox.value.trim() ? importFromMeadow(importBox.value) : null;
            const world = newWorld({ name, form, spot, meadowImport });
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
          saveWorld(this.world);
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
    this.openModal((close) =>
      panel(speech.who, "Farm resident", [
        el("p", {}, [speech.text]),
        actionRow([primaryBtn("...", close)]),
      ]),
    );
  }

  // --- Menu -------------------------------------------------------------------
  /** The pause menu: resume, or start a fresh town. Reachable from the HUD so
   *  a reset never needs the browser console (it can't be opened on a phone). */
  private openMenu(): void {
    const who = this.world ? `${this.world.player.name} · ${FORMS[this.world.player.form].name}` : "The Farm";
    this.openModal((close) => {
      const body = el("div", { class: "choices" });
      body.append(
        primaryBtn("Resume", close),
        choiceBtn("New town…", () => {
          // Second step: confirm, because a new town erases this one.
          body.replaceChildren(
            el("p", {}, [
              "Start a new town? Your homestead, crops, and neighbours here are erased.\n. ... This can't be undone.",
            ]),
            primaryBtn("Yes, start over", () => {
              clearWorld();
              location.reload(); // cleanest reset: reload boots straight to the title
            }),
            choiceBtn("Cancel", close),
          );
        }),
      );
      return panel("Menu", who, [body]);
    });
  }

  // --- Input ------------------------------------------------------------------
  private wireInput(): void {
    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.modalOpen || !this.world) return;
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

    window.addEventListener("keydown", (e) => {
      if (this.modalOpen) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      } else if (k === " " || k === "enter") {
        this.doAction();
        e.preventDefault();
      } else if (k >= "1" && k <= "4") {
        this.selectTool(TOOLS[Number(k) - 1].id);
      } else if (k === "e") {
        this.tryTalkNearest();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.world) saveWorld(this.world);
    });
    window.addEventListener("beforeunload", () => {
      if (this.world) saveWorld(this.world);
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

  private selectTool(t: Tool): void {
    this.tool = t;
    for (const [id, btn] of this.hud.toolButtons) btn.classList.toggle("selected", id === t);
  }

  private doAction(): void {
    if (!this.world || this.modalOpen) return;
    const res = contextAction(this.world, this.tool, Date.now());
    this.flash(res.message);
    saveWorld(this.world);
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
        saveWorld(this.world);
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  // --- Modal plumbing ---------------------------------------------------------
  private openModal(build: (close: () => void) => HTMLElement): void {
    this.modalOpen = true;
    let closeFn: () => void = () => {};
    const content = build(() => closeFn());
    const close = modal(content);
    closeFn = () => {
      close();
      this.modalOpen = false;
    };
  }

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
}

// --- HUD construction ---------------------------------------------------------
interface HudRefs {
  root: HTMLElement;
  clock: HTMLElement;
  flash: HTMLElement;
  toolButtons: [Tool, HTMLElement][];
}

function buildHud(
  root: HTMLElement,
  onTool: (t: Tool) => void,
  onAction: () => void,
  onMenu: () => void,
): HudRefs {
  const menu = el("button", { class: "menu-btn", title: "Menu" }, ["☰"]);
  menu.addEventListener("click", onMenu);
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

  const action = el("button", { class: "action-btn" }, ["ACT"]);
  action.addEventListener("click", onAction);

  const hud = el("div", { class: "hud" }, [menu, clock, flash, palette, action]);
  root.append(hud);
  return { root: hud, clock, flash, toolButtons };
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
