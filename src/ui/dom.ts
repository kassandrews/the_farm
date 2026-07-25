// Tiny DOM helpers for the PWA shell. The game lives on the canvas; these build
// the HUD and the modal panels (dialogue, postcard, title) around it. No
// framework — a couple of element factories keep the ui code readable.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props as Record<string, unknown> & { class?: string };
  if (cls) node.className = cls;
  Object.assign(node, rest);
  for (const c of children) node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

/** One tooltip node, reused. Two hints can never be visible at once, so there
 *  is no reason for more than one — and a shared node means moving the mouse
 *  along the palette slides one label rather than flickering eight. */
let hintNode: HTMLElement | null = null;

/** Attach a hover descriptor to a HUD button.
 *
 *  Deliberately NOT the native `title` attribute: the browser's tooltip waits
 *  about a second, renders in OS chrome that has nothing to do with the game,
 *  and can't be styled. This is the same idea with the game's own face on it.
 *
 *  MOUSE ONLY, on purpose. The design is touch-first, and on touch a hover hint
 *  is either invisible (no hover) or worse — a tooltip that appears under your
 *  finger as you tap the button, covering the thing you just pressed. The
 *  pointerType check is what keeps the desktop affordance from leaking onto the
 *  phone; `pointerdown` hides it so it never sits over a button mid-press. */
export function hoverHint(target: HTMLElement, text: string): void {
  const show = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (!hintNode) {
      hintNode = el("div", { class: "hint" });
      document.body.append(hintNode);
    }
    hintNode.textContent = text;
    hintNode.style.visibility = "hidden";
    hintNode.style.opacity = "1";
    // Measure after the text is in, or the first hover of a session positions
    // against an empty box and lands in the wrong place.
    const box = target.getBoundingClientRect();
    const tip = hintNode.getBoundingClientRect();
    const gap = 10;
    // Flip to whichever side has room: the act palette hugs the left edge and
    // the build palette the right, so a fixed side would push one of them off
    // screen every time.
    const left =
      box.left + box.width / 2 < window.innerWidth / 2
        ? Math.min(box.right + gap, window.innerWidth - tip.width - gap)
        : Math.max(box.left - tip.width - gap, gap);
    const top = Math.max(gap, Math.min(box.top + box.height / 2 - tip.height / 2, window.innerHeight - tip.height - gap));
    hintNode.style.left = `${Math.round(left)}px`;
    hintNode.style.top = `${Math.round(top)}px`;
    hintNode.style.visibility = "visible";
  };
  const hide = () => {
    if (hintNode) hintNode.style.opacity = "0";
  };
  target.addEventListener("pointerenter", show);
  target.addEventListener("pointerleave", hide);
  target.addEventListener("pointerdown", hide);
}

/** Show a modal panel over a scrim. Returns a close() that removes it. The
 *  panel content is built by the caller; this only handles the frame.
 *
 *  `onDismiss` makes a tap outside the panel close it — and it calls the
 *  CALLER's close, never a private one, so the caller's "a modal is open" state
 *  can't be left set while the panel is gone (which is a frozen game). */
export function modal(content: HTMLElement, opts: { onDismiss?: () => void } = {}): () => void {
  const scrim = el("div", { class: "modal-scrim" }, [content]);
  const dismiss = opts.onDismiss;
  if (dismiss) {
    scrim.addEventListener("pointerdown", (e) => {
      if (e.target === scrim) dismiss();
    });
  }
  document.body.append(scrim);
  return () => scrim.remove();
}
