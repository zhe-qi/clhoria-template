import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig({ mode: "test", command: "serve" }),
  defineConfig({
    test: {
      setupFiles: [],
      fileParallelism: false,
      isolate: false,
      pool: "threads",
    },
  }),
);
