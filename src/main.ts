// Entry point. Mounts the app into #app and kicks off the title/continue flow.
// Registers the service worker so the game is an installable, offline-capable
// PWA (DESIGN §Platform) — best-effort, and a no-op in dev where the worker
// isn't built.

import "./style.css";
import { App } from "./ui/app";

const root = document.getElementById("app");
if (root) {
  const app = new App(root);
  app.start();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No worker in dev, or registration blocked — the game runs fine without.
    });
  });
}
