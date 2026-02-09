import { Effect } from "effect";
import Redlock from "redlock";

import { LockAcquisitionError } from "@/lib/effect/errors";
import redisClient from "@/lib/redis";

/** 锁配置选项 */
export type LockOptions = {
  /** 锁的过期时间（毫秒），默认 10000ms */
  ttl?: number;
};

/**
 * Redlock 实例
 * - 自动锁续期（automaticExtensionThreshold）
 * - 支持多 Redis 实例的 Redlock 算法
 * - 重试机制和 jitter 优化
 */
export const redlock = new Redlock([redisClient], {
  driftFactor: 0.01,
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 100,
  automaticExtensionThreshold: 500,
});

/**
 * 在分布式锁保护下执行 Effect
 *
 * 使用 Effect.acquireUseRelease 确保锁的安全获取与释放
 *
 * @param key 锁的键名
 * @param effect 要在锁保护下执行的 Effect
 * @param options 锁配置
 */
export const withLock = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>,
  options: LockOptions = {},
): Effect.Effect<A, E | LockAcquisitionError, R> =>
  Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => redlock.acquire([`lock:${key}`], options.ttl ?? 10000),
      catch: error => new LockAcquisitionError({ key, cause: error }),
    }),
    () => effect,
    lock => Effect.promise(() => lock.release()),
  );
