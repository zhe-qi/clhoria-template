import Redlock from "redlock";

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
 * 在锁保护下执行函数
 * @param key 锁的键名
 * @param fn 要执行的函数
 * @param options 锁配置
 * @returns 函数执行结果
 * @throws 获取锁失败时抛出错误
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const ttl = options.ttl ?? 10000;
  return redlock.using([`lock:${key}`], ttl, fn);
}
