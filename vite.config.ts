import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The web shell — the full editor, published to GitHub Pages.
 *
 * `base` is the repo name because Pages serves from a subpath. Keep this value
 * synchronized with the GitHub repository slug or Pages will request every
 * asset from the wrong URL.
 */
export default defineConfig({
  root: "apps/web",
  base: "/assignment-styler/",
  build: {
    outDir: "../../pages-dist",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "assets/app.js", assetFileNames: "assets/[name][extname]" } },
  },
  plugins: [react()],
});
