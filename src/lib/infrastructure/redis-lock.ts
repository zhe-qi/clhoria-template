import { Effect } from "effect";
import { createLock, IoredisAdapter } from "redlock-universal";

import { createSingleton } from "@/lib/core/singleton";
import { LockAcquisitionError } from "@/lib/infrastructure/effect/errors";
import redisClient from "@/lib/services/redis";

/** Lock configuration options / 锁配置选项 */
export type LockOptions = {
  /** Lock TTL (milliseconds), default 10000ms / 锁的过期时间（毫秒），默认 10000ms */
  ttl?: number;
};

/**
 * IoredisAdapter singleton for redlock-universal
 * Wraps the Redis client for distributed lock operations
 *
 * redlock-universal 的 IoredisAdapter 单例
 * 包装 Redis 客户端用于分布式锁操作
 */
const ioredisAdapter = createSingleton(
  "redlock-ioredis-adapter",
  () => new IoredisAdapter(redisClient),
);

/**
 * Create a lock instance for a specific key
 * Uses redlock-universal with optimized retry configuration
 *
 * 为特定键创建锁实例
 * 使用 redlock-universal 和优化的重试配置
 */
function createLockForKey(key: string, ttl: number) {
  return createLock({
    adapter: ioredisAdapter,
    key: `lock:${key}`,
    ttl,
    retryAttempts: 3,
    retryDelay: 200,
    performance: "standard" as const,
  });
}

/**
 * Execute Effect under distributed lock protection
 *
 * Uses Effect.acquireUseRelease to ensure safe lock acquisition and release
 * Integrates redlock-universal's acquire/release API with Effect's resource management
 *
 * @param key Lock key name / 锁的键名
 * @param effect The Effect to execute under lock protection / 要在锁保护下执行的 Effect
 * @param options Lock configuration / 锁配置
 *
 * 在分布式锁保护下执行 Effect
 *
 * 使用 Effect.acquireUseRelease 确保锁的安全获取与释放
 * 将 redlock-universal 的 acquire/release API 与 Effect 的资源管理集成
 */
export const withLock = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>,
  options: LockOptions = {},
): Effect.Effect<A, E | LockAcquisitionError, R> => {
  const ttl = options.ttl ?? 10000;
  const lock = createLockForKey(key, ttl);

  return Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => lock.acquire(),
      catch: error => new LockAcquisitionError({ key, cause: error }),
    }),
    () => effect,
    handle => Effect.promise(() => lock.release(handle)),
  );
};
