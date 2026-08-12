import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The web shell — the full editor, published to GitHub Pages.
 *
 * `base` is the repo name because Pages serves from a subpath. It stays
 * `/blackbaud-styler/` until Open item #1 (repo, app and package go by three
 * different names) is settled, which is a Phase 5 decision.
 */
export default defineConfig({
  root: "apps/web",
  base: "/blackbaud-styler/",
  build: { outDir: "../../pages-dist", emptyOutDir: true },
  plugins: [react()],
});
