import logger from "@/lib/logger";

/**
 * 设置关闭处理
 */
export function setupGracefulShutdown(): void {
  const handleShutdown = async (signal: string) => {
    logger.info(`收到 ${signal} 信号，开始关闭...`);

    try {
      logger.info("应用已关闭");
      process.exit(0);
    }
    catch (error) {
      logger.error({ error }, "关闭失败");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}
