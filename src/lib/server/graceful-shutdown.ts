import { shutdownJobSystem } from "@/jobs";
import logger from "@/lib/logger";

const gracefulShutdown = async (signal: string) => {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  try {
    // 关闭任务系统
    await shutdownJobSystem();

    logger.info("应用已优雅关闭");
    process.exit(0);
  }
  catch (error) {
    logger.error(error, "优雅关闭失败");
    process.exit(1);
  }
};

export const setupGracefulShutdown = () => {
  // 监听关闭信号
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};
