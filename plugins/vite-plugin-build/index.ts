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
   * Whether to wrap the original app with mainApp
   * When enabled, creates a Hono instance to wrap the original app for Edge Runtime compatibility
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
            // Only import serveStatic when there are static files / 只在有静态文件时才导入 serveStatic
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
            // Use environment variable, fall back to configured port / 使用环境变量，回退到配置的端口
            const portCode = `process.env.PORT ? parseInt(process.env.PORT, 10) : ${port}`;

            if (shutdownTimeoutMs !== undefined) {
              // 导入 bootstrap shutdown 函数
              code += "import { shutdown as bootstrapShutdown } from '@/lib/infrastructure/bootstrap'\n";

              code += `const server = serve({ fetch: ${appName}.fetch, port: ${portCode} })\n`;
              code += "let isShuttingDown = false\n";
              code += "const gracefulShutdownHandler = async () => {\n";
              code += "  if (isShuttingDown) return\n";
              code += "  isShuttingDown = true\n";
              if (shutdownTimeoutMs > 0) {
                code += `  const forceExitTimer = setTimeout(() => {\n`;
                code += `    console.error('[服务]: 优雅关闭超时，强制退出')\n`;
                code += `    process.exit(1)\n`;
                code += `  }, ${shutdownTimeoutMs})\n`;
              }
              code += "  try {\n";
              code += "    console.log('[服务]: 收到关闭信号，开始优雅关闭')\n";
              // 步骤 1: 停止接受新连接，等待现有请求完成（10 秒超时后继续清理资源）
              code += "    await new Promise((resolve) => {\n";
              code += "      const closeTimeout = setTimeout(() => {\n";
              code += "        console.error('[服务]: 等待请求完成超时，继续关闭资源')\n";
              code += "        resolve()\n";
              code += "      }, 10000)\n";
              code += "      server.close((err) => {\n";
              code += "        clearTimeout(closeTimeout)\n";
              code += "        if (err) console.error('[服务]: 服务器关闭出错', err)\n";
              code += "        console.log('[服务]: 所有请求已完成')\n";
              code += "        resolve()\n";
              code += "      })\n";
              code += "    })\n";
              // 步骤 2: 关闭应用资源
              code += "    await bootstrapShutdown()\n";
              code += "    console.log('[服务]: 优雅关闭完成')\n";
              if (shutdownTimeoutMs > 0) {
                code += `    clearTimeout(forceExitTimer)\n`;
              }
              code += "    process.exit(0)\n";
              code += "  } catch (error) {\n";
              code += "    console.error('[服务]: 资源清理失败', error)\n";
              if (shutdownTimeoutMs > 0) {
                code += `    clearTimeout(forceExitTimer)\n`;
              }
              code += "    process.exit(1)\n";
              code += "  }\n";
              code += "}\n";
              code += "process.on('SIGINT', gracefulShutdownHandler)\n";
              code += "process.on('SIGTERM', gracefulShutdownHandler)\n";
            }
            else {
              code += `serve({ fetch: ${appName}.fetch, port: ${portCode} })\n`;
            }
            // Add startup log / 添加启动日志
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
