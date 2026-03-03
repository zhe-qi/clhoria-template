import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import { createSingleton } from "@/lib/core/singleton";

/** Create Redis client / 创建 Redis 客户端 */
function createRedisClient() {
  const connectionOptions: RedisOptions = parseURL(env.REDIS_URL);
  return new Redis(connectionOptions);
}

const redisClient = createSingleton<Redis>(
  "redis",
  createRedisClient,
  { destroy: async client => void await client.quit() },
);

export default redisClient;
