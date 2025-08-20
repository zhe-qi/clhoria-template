import env from "@/env";
import logger from "@/lib/logger";

/**
 * 打印服务启动消息
 */
export async function logServerStart(): Promise<void> {
  const message = ` 🚀 服务启动成功 → (http://localhost:${env.PORT}) `;

  logger.info(message);
}
