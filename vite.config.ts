import type { Plugin } from "vite";
import buildPluginNodejs from "@clhoria/vite-plugin/build";

import bullBoardStaticPlugin from "@clhoria/vite-plugin/bull-board-static";
import hmrNotifyPlugin from "@clhoria/vite-plugin/hmr-notify";
import resourceMonitorPlugin from "@clhoria/vite-plugin/resource-monitor";
import zodHoistPlugin from "@clhoria/vite-plugin/zod-hoist";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { defineConfig, loadEnv } from "vite";

const SHUTDOWN_BARRIER_KEY = Symbol.for("__bootstrap_shutdown_barrier__");
type GlobalWithBarrier = typeof globalThis & { [SHUTDOWN_BARRIER_KEY]?: Promise<void> };

function bootstrapDevPlugin(): Plugin {
  return {
    name: "bootstrap-dev",
    // 仅在真正的 dev 服务（pnpm dev）时启用；vitest 也是 serve 但走 mode=test，跳过
    apply: (_config, env) => env.command === "serve" && env.mode !== "test",
    async configureServer(server) {
      // @hono/vite-dev-server 只在首个请求才 ssrLoad src/index.ts，
      // 在那之前 bootstrap() 不会跑：WS、BullMQ workers、cron 都不启动。
      // 这里提前手动跑一次；内部所有资源都走 singleton 缓存，后续 lazy import 进来不会重复。
      //
      // Vite restart（改 .env 等）会异步 fire 旧 httpServer.close → shutdown，
      // 但新 configureServer 已经先跑了，此时 hasSingleton 还是 true 会 skip bootstrap，
      // 之后旧 shutdown 把 singleton 清空 → 新 server 没有任何资源在跑。
      // 用 globalThis 上的 barrier 让新 bootstrap 等旧 shutdown 跑完。
      const g = globalThis as GlobalWithBarrier;
      if (g[SHUTDOWN_BARRIER_KEY]) {
        await g[SHUTDOWN_BARRIER_KEY];
        g[SHUTDOWN_BARRIER_KEY] = undefined;
      }

      const { bootstrap, shutdown } = await server.ssrLoadModule(
        "/src/lib/infrastructure/bootstrap.ts",
      ) as typeof import("./src/lib/infrastructure/bootstrap");

      await bootstrap();

      server.httpServer?.once("close", () => {
        g[SHUTDOWN_BARRIER_KEY] = shutdown();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "0.0.0.0",
      port: Number.parseInt(env.PORT, 10),
      allowedHosts: [".trycloudflare.com"],
      hmr: {
        protocol: "wss",
        clientPort: 443,
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      bootstrapDevPlugin(),
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
