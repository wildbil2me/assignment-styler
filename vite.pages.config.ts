import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/blackbaud-styler/",
  plugins: [react()],
  build: { outDir: "pages-dist", emptyOutDir: true },
});
