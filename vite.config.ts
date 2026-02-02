import path from "node:path";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { defineConfig, loadEnv } from "vite";

import buildPluginNodejs from "./plugins/vite-plugin-build";
import hmrNotifyPlugin from "./plugins/vite-plugin-hmr-notify";
import resourceMonitorPlugin from "./plugins/vite-plugin-resource-monitor";
import zodHoistPlugin from "./plugins/vite-plugin-zod-hoist";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      port: Number.parseInt(env.PORT, 10),
    },
    resolve: {
      // tsconfigPaths: true,
      alias: {
        "@": path.join(process.cwd(), "./src"),
        "~": path.join(process.cwd(), "."),
      },
    },
    plugins: [
      zodHoistPlugin(),
      hmrNotifyPlugin(),
      resourceMonitorPlugin(),
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
