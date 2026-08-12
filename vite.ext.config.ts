import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The extension shell — MV3 side panel, quick-post mode.
 *
 * `base` is relative because a `chrome-extension://` page has no site root.
 * `apps/ext/public/` holds `manifest.json` and `background.js`; Vite copies the
 * public directory to the output root verbatim, which is why the manifest's
 * `"index.html"` and `"background.js"` paths resolve in `extension-dist/`.
 */
export default defineConfig({
  root: "apps/ext",
  base: "./",
  build: { outDir: "../../extension-dist", emptyOutDir: true },
  plugins: [react()],
});
