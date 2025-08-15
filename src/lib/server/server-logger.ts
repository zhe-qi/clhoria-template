import env from "@/env";
import logger from "@/lib/logger";

/**
 * 打印服务启动消息
 */
export async function logServerStart(): Promise<void> {
  const message = ` 🚀 服务启动成功 → (http://localhost:${env.PORT}) `;

  if (env.NODE_ENV === "production") {
    logger.info(message);
  }
  else {
    try {
      // 开发环境动态导入 chalk 和 gradient-string
      const { default: chalk } = await import("chalk");
      const { default: gradient } = await import("gradient-string");
      const styledMessage = gradient(["cyan", "magenta"])(chalk.bold(message));
      logger.info(styledMessage);
    }
    catch {
      // 如果动态导入失败，回退到普通日志
      logger.info(message);
    }
  }
}
