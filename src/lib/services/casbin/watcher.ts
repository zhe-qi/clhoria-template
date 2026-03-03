import { RedisWatcher } from "@casbin/redis-watcher";
import { parseURL } from "ioredis/built/utils/index.js";

import env from "@/env";
import { createAsyncSingleton } from "@/lib/core/singleton";

const CHANNEL = "casbin-policy";

/** Create Casbin Redis Watcher / 创建 Casbin Redis Watcher */
function createCasbinWatcher(): Promise<RedisWatcher> {
  return RedisWatcher.newWatcher({
    ...parseURL(env.REDIS_URL),
    channel: CHANNEL,
  });
}

export const watcherPromise = createAsyncSingleton("casbin-watcher", createCasbinWatcher, {
  destroy: async watcher => watcher.close(),
});
