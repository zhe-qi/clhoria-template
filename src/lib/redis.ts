import Redis from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";

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

export default redisClient;
