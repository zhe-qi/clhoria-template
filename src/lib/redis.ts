import Redis from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import { createSingleton } from "@/lib/internal/singleton";

export const redisConnectionOptions = parseURL(env.REDIS_URL);

// 确保 port 是数字类型
if (redisConnectionOptions.port && typeof redisConnectionOptions.port === "string") {
  redisConnectionOptions.port = Number.parseInt(redisConnectionOptions.port, 10);
}

const redisClient = createSingleton(
  "redis",
  () => new Redis({
    ...redisConnectionOptions,
    maxRetriesPerRequest: null,
  }),
  { destroy: async client => void await client.quit() },
);

export default redisClient;
