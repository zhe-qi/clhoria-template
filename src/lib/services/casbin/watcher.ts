import type { RedisOptions } from "ioredis";
import { RedisWatcher } from "@casbin/redis-watcher";

import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import { createAsyncSingleton } from "@/lib/core/singleton";

const CHANNEL = "casbin-policy";

/** Create Casbin Redis Watcher (auto-adapts to standalone/cluster mode) / 创建 Casbin Redis Watcher（自动适配单机/集群模式） */
function createCasbinWatcher(): Promise<RedisWatcher> {
  const isClusterMode = env.REDIS_CLUSTER_ENABLED === "true";

  if (isClusterMode) {
    if (!env.REDIS_CLUSTER_NODES)
      throw new Error("集群模式下 REDIS_CLUSTER_NODES 不能为空");

    const nodes = env.REDIS_CLUSTER_NODES.split(",").map((node) => {
      const [host, portStr] = node.trim().split(":");
      return { host, port: Number.parseInt(portStr, 10) };
    });

    const baseOptions: RedisOptions = env.REDIS_URL ? parseURL(env.REDIS_URL) : {};

    return RedisWatcher.newWatcherWithCluster(nodes, {
      redisOptions: baseOptions,
      channel: CHANNEL,
    });
  }

  return RedisWatcher.newWatcher({
    ...parseURL(env.REDIS_URL),
    channel: CHANNEL,
  });
}

export const watcherPromise = createAsyncSingleton("casbin-watcher", createCasbinWatcher, {
  destroy: async watcher => watcher.close(),
});
