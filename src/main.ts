// Entry point. Mounts the app into #app and kicks off the title/continue flow.
// Registers the service worker so the game is an installable, offline-capable
// PWA (DESIGN §Platform) — in PRODUCTION ONLY, and the "only" is the whole of
// what this comment is for.

import "./style.css";
import { App } from "./ui/app";

const root = document.getElementById("app");
if (root) {
  const app = new App(root);
  app.start();
}

// THIS USED TO SAY "a no-op in dev where the worker isn't built", AND THAT WAS
// SIMPLY FALSE. `public/` is served verbatim by the dev server, so `/sw.js` is
// there, registers, and takes over the whole ORIGIN at scope `/` — every page on
// localhost, including the region preview at /biomes.html, which has nothing to
// do with the game and no reason to be cached.
//
// Its fetch handler is network-first with a cache fallback, which is right for a
// player on a train and wrong for a developer: the moment the dev server is down
// for a second — restarted, port changed, killed while taking screenshots — every
// request fails, the worker serves the last build it saw, and it keeps serving it
// afterwards because the page in front of you was loaded from the cache and never
// asked again. It cost an hour of "the colour isn't updating" on a change that was
// already on disk, already compiled and already correct in a screenshot.
//
// So: production only, and in dev it UNREGISTERS anything already installed and
// drops the caches. That second half matters more than the first — the workers
// that cause this are the ones installed before anybody thought about it, and
// they do not go away on their own.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration blocked (private window, no HTTPS) — the game runs fine
        // without it; offline is a nicety, not a requirement.
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => {
      for (const r of rs) void r.unregister();
    });
    if ("caches" in window) void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
  }
}
