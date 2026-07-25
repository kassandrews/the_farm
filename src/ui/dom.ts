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
