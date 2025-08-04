import { logger } from "@/lib/logger";

/**
 * 设置优雅关闭处理
 */
export function setupGracefulShutdown(): void {
  const handleShutdown = async (signal: string) => {
    logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

    try {
      logger.info("应用已优雅关闭");
      process.exit(0);
    }
    catch (error) {
      logger.error("优雅关闭失败:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}
