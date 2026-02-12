/**
 * https://github.com/honojs/vite-plugins
 */
import type { Plugin } from "vite";

import type { BuildOptions } from "./base.ts";

import buildPlugin from "./base.ts";
import { serveStaticHook } from "./entry/server-static.ts";

export type NodeBuildOptions = {
  staticRoot?: string | undefined;
  port?: number | undefined;
  /**
   * Enable graceful shutdown on SIGINT and SIGTERM signals.
   * Set to a number to specify the timeout in milliseconds before forcing shutdown.
   * Set to 0 to wait indefinitely for connections to close.
   * Leave undefined to disable graceful shutdown.
   * @default undefined
   */
  shutdownTimeoutMs?: number | undefined;
  /**
   * 是否使用 mainApp 包装原始 app
   * 启用后会创建一个 Hono 实例包装原始 app，兼容 Edge Runtime
   * @default false
   */
  wrapWithMainApp?: boolean | undefined;
} & BuildOptions;

const nodeBuildPlugin = (pluginOptions?: NodeBuildOptions): Plugin => {
  const port = pluginOptions?.port ?? 3000;
  const shutdownTimeoutMs = pluginOptions?.shutdownTimeoutMs;
  const wrapWithMainApp = pluginOptions?.wrapWithMainApp ?? false;

  return {
    ...buildPlugin({
      ...{
        wrapWithMainApp,
        entryContentBeforeHooks: [
          async (appName, options) => {
            // 只在有静态文件时才导入 serveStatic
            const staticPaths = options?.staticPaths ?? [];
            if (staticPaths.length === 0)
              return "";

            let code = "import { serveStatic } from '@hono/node-server/serve-static'\n";
            code += serveStaticHook(appName, {
              filePaths: staticPaths,
              root: pluginOptions?.staticRoot,
            });
            return code;
          },
        ],
        entryContentAfterHooks: [
          async (appName) => {
            let code = "import { serve } from '@hono/node-server'\n";
            // 使用环境变量，回退到配置的端口
            const portCode = `process.env.PORT ? parseInt(process.env.PORT, 10) : ${port}`;

            if (shutdownTimeoutMs !== undefined) {
              code += `const server = serve({ fetch: ${appName}.fetch, port: ${portCode} })\n`;
              code += "const gracefulShutdown = () => {\n";
              code += "  server.close(() => process.exit(0))\n";
              if (shutdownTimeoutMs > 0) {
                code += `  setTimeout(() => process.exit(1), ${shutdownTimeoutMs}).unref()\n`;
              }
              code += "}\n";
              code += "process.on('SIGINT', gracefulShutdown)\n";
              code += "process.on('SIGTERM', gracefulShutdown)\n";
            }
            else {
              code += `serve({ fetch: ${appName}.fetch, port: ${portCode} })\n`;
            }
            // 添加启动日志
            code += `console.log('[服务]: 启动成功, 端口:', ${portCode})`;
            return code;
          },
        ],
      },
      ...pluginOptions,
    }),
    name: "@hono/vite-build/node",
  };
};

export default nodeBuildPlugin;
