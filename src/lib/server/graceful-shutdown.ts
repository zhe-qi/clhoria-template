import type { ServerType } from "@hono/node-server";

import logger from "@/lib/logger";

import { shutdownJobSystem } from "./job-system";

/**
 * 优雅关闭处理器
 */
export async function setupGracefulShutdown(server: ServerType): Promise<void> {
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, "[应用]: 收到关闭信号，开始优雅关闭");

    // 关闭 HTTP 服务器
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info("[应用]: HTTP 服务器已关闭");
        resolve();
      });
    });

    // 优雅关闭任务系统
    await shutdownJobSystem();

    logger.info("[应用]: 优雅关闭完成");
    process.exit(0);
  };

  // 监听关闭信号
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
}
