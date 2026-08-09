import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  publicDir: "extension",
  plugins: [react()],
  build: { outDir: "extension-dist", emptyOutDir: true },
});
