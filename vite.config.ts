import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

import buildPluginNodejs from "./plugins/vite-plugin-build";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      port: Number.parseInt(env.PORT, 10),
    },
    build: {
      sourcemap: mode === "development",
      target: "esnext",
      rolldownOptions: {
        external: [/node_modules/],
        output: {
          entryFileNames: "index.js",
          format: "esm",
          inlineDynamicImports: true,
        },
        treeshake: true,
      },
      oxc: {
        transform: {
          target: "esnext",
        },
      },
    },
    resolve: {
      // tsconfigPaths: true,
      alias: {
        "@": path.join(process.cwd(), "./src"),
        "~": path.join(process.cwd(), "."),
      },
    },
    plugins: [
      devServer({
        entry: "src/index.ts",
        adapter: nodeAdapter(),
      }),
      buildPluginNodejs({
        port: Number.parseInt(env.PORT, 10),
        minify: false,
      }),
    ],
  };
});
