import type { RedisOptions } from "ioredis";
import Redis, { Cluster } from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import { createSingleton } from "@/lib/internal/singleton";

/** Redis 客户端类型（单机或集群） */
export type RedisClient = Redis | Cluster;

/** 解析集群节点配置 */
function parseClusterNodes(nodesStr: string): Array<{ host: string; port: number }> {
  return nodesStr.split(",").map((node) => {
    const [host, portStr] = node.trim().split(":");
    return {
      host,
      port: Number.parseInt(portStr, 10),
    };
  });
}

/** 创建 Redis 客户端 */
function createRedisClient(): RedisClient {
  const isClusterMode = env.REDIS_CLUSTER_ENABLED === "true";

  if (isClusterMode) {
    if (!env.REDIS_CLUSTER_NODES) {
      throw new Error("集群模式下 REDIS_CLUSTER_NODES 不能为空");
    }

    const nodes = parseClusterNodes(env.REDIS_CLUSTER_NODES);
    const baseOptions: RedisOptions = env.REDIS_URL ? parseURL(env.REDIS_URL) : {};

    return new Cluster(nodes, {
      redisOptions: baseOptions,
      enableAutoPipelining: true,
      scaleReads: "slave",
    });
  }

  const connectionOptions = parseURL(env.REDIS_URL);
  if (connectionOptions.port && typeof connectionOptions.port === "string") {
    connectionOptions.port = Number.parseInt(connectionOptions.port, 10);
  }

  return new Redis(connectionOptions);
}

const redisClient = createSingleton<RedisClient>(
  "redis",
  createRedisClient,
  { destroy: async client => void await client.quit() },
);

export default redisClient;
