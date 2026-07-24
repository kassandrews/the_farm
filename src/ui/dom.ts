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
 *  panel content is built by the caller; this only handles the frame. */
export function modal(content: HTMLElement, opts: { dismissable?: boolean } = {}): () => void {
  const scrim = el("div", { class: "modal-scrim" }, [content]);
  if (opts.dismissable) {
    scrim.addEventListener("pointerdown", (e) => {
      if (e.target === scrim) close();
    });
  }
  document.body.append(scrim);
  const close = () => scrim.remove();
  return close;
}
