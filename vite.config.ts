import buildPluginNodejs from "@clhoria/vite-plugin/build";
import hmrNotifyPlugin from "@clhoria/vite-plugin/hmr-notify";
import resourceMonitorPlugin from "@clhoria/vite-plugin/resource-monitor";

import zodHoistPlugin from "@clhoria/vite-plugin/zod-hoist";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      port: Number.parseInt(env.PORT, 10),
    },
    resolve: {
      tsconfigPaths: true,
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
