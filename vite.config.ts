import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The web shell — the full editor, published to GitHub Pages.
 *
 * `base` is the repo name because Pages serves from a subpath. It stays
 * `/blackbaud-styler/` because the repository and live Pages URL deliberately
 * keep the original slug even though the product and package are Betterbaud.
 * See docs/naming.md before changing it: a rename moves the public URL.
 */
export default defineConfig({
  root: "apps/web",
  base: "/blackbaud-styler/",
  build: {
    outDir: "../../pages-dist",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "assets/app.js", assetFileNames: "assets/[name][extname]" } },
  },
  plugins: [react()],
});
