import Redis from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import logger from "@/lib/logger";

export const redisConnectionOptions = parseURL(env.REDIS_URL);

// 确保 port 是数字类型
if (redisConnectionOptions.port && typeof redisConnectionOptions.port === "string") {
  redisConnectionOptions.port = Number.parseInt(redisConnectionOptions.port, 10);
}

// 主 Redis 客户端（业务使用）
const redisClient = new Redis({
  ...redisConnectionOptions,
  maxRetriesPerRequest: null,
});

// BullMQ 专用连接（单例）
let bullMQConnection: Redis | null = null;

/**
 * 获取 BullMQ Redis 连接（单例模式）
 * 所有 BullMQ 组件（Queue、Worker、QueueEvents）共享同一个连接
 *
 * @returns Redis 连接实例
 */
export function getBullMQConnection(): Redis {
  if (!bullMQConnection) {
    bullMQConnection = new Redis({
      ...redisConnectionOptions,
      maxRetriesPerRequest: null,
      lazyConnect: false,
      enableOfflineQueue: true,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, "[Redis]: BullMQ 连接重试");
        return delay;
      },
    });

    // 连接成功
    bullMQConnection.on("connect", () => {
      logger.info("[Redis]: BullMQ 连接成功");
    });

    // 连接就绪
    bullMQConnection.on("ready", () => {
      logger.info("[Redis]: BullMQ 连接就绪");
    });

    // 连接错误
    bullMQConnection.on("error", (err: Error) => {
      logger.error({ error: err }, "[Redis]: BullMQ 连接错误");
    });

    // 连接断开
    bullMQConnection.on("close", () => {
      logger.warn("[Redis]: BullMQ 连接已断开");
    });

    // 重新连接
    bullMQConnection.on("reconnecting", (delay: number) => {
      logger.info({ delay }, "[Redis]: BullMQ 正在重新连接");
    });
  }

  return bullMQConnection;
}

/**
 * 关闭 BullMQ Redis 连接
 */
export async function closeBullMQConnection(): Promise<void> {
  if (bullMQConnection) {
    await bullMQConnection.quit();
    bullMQConnection = null;
    logger.info("[Redis]: BullMQ 连接已关闭");
  }
}

export default redisClient;
