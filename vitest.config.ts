import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "."),
    },
  },
  test: {
    setupFiles: [],
    fileParallelism: false,
    isolate: false,
    pool: "threads",
  },
});
