import buildPluginNodejs from "@clhoria/vite-plugin/build";
import bullBoardStaticPlugin from "@clhoria/vite-plugin/bull-board-static";
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
      bullBoardStaticPlugin(),
      zodHoistPlugin(),
      hmrNotifyPlugin(),
      resourceMonitorPlugin(),
      devServer({
        entry: "src/index.ts",
        adapter: nodeAdapter(),
      }),
      buildPluginNodejs({
        port: Number.parseInt(env.PORT, 10),
        minify: false, // Whether to minify the bundled code / 是否压缩打包后的代码
        shutdownTimeoutMs: 30000, // 30秒优雅关闭超时

        // nativeAssets: ["src/workers/xxxxxx.wasm"], // Copy extra native assets to dist/native / 复制额外原生资源到 dist/native

        // bundleDeps: true, // Bundle all JS deps / 打包所有 JS 依赖
        // nativeDeps: ["@node-rs/argon2", "excelize-wasm"], // Copy .node/.wasm binaries to dist / 复制原生二进制到 dist
        // targetPlatform: "linux-x64", // Target platform for native dependency installation / 原生依赖安装目标平台
      }),
    ],
  };
});
