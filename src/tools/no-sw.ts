// Evict any service worker from a developer tool page. Import for side effect.
//
// WHY THIS IS NOT ALREADY HANDLED. `src/main.ts` unregisters the worker in dev
// (see its note, and the commit "The service worker was shadowing the dev
// server"), and that fixed the game — but the tool pages never load main.ts.
// They have their own entry points, so the one page the shadowing hurt most, the
// region contact sheet, was the one page that could not heal itself: with a stale
// worker installed you open /biomes.html, the worker serves whatever it cached,
// and nothing on that page ever asks the network again. The cure was to go and
// load the GAME first, which is not a thing anybody would guess.
//
// The workers that cause this are the ones installed before anybody thought about
// it — main.ts's own argument — and they outlive the fix by definition. So every
// entry point in the project evicts them, not just the one that installs them.
//
// Unregistering does not affect the page already loaded; it takes a reload to
// see the difference. That is fine and is why this says nothing on screen: the
// symptom is "I edited biomes.ts and the sheet did not change", the reflex is to
// reload, and one reload is all it takes once the worker is gone.
if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((rs) => {
    for (const r of rs) void r.unregister();
  });
  if ("caches" in window) {
    void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
  }
}
