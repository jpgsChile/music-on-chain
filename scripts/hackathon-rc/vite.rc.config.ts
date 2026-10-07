import path from "node:path";
import { defineConfig } from "vite";

/** Alias only. envDir is this folder so the runner never loads .env.local. */
export default defineConfig({
  envDir: path.resolve(__dirname),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../.."),
    },
  },
});
