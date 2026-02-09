import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig({ mode: "test", command: "serve" }),
  defineConfig({
    resolve: {
      alias: {
        "@": path.join(process.cwd(), "./src"),
        "~": path.join(process.cwd(), "."),
      },
    },
    test: {
      setupFiles: [],
    },
  }),
);
