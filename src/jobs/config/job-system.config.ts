import env from "@/env";

import type { JobSystemConfig } from "../types";

/**
 * 默认配置常量
 */
export const DEFAULT_QUEUE_NAME = "default";
export const DEFAULT_WORKER_CONCURRENCY = 5;
export const DEFAULT_MAX_STALLED_COUNT = 1;
export const DEFAULT_STALLED_INTERVAL = 30000; // 30秒

// 重试配置
export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_TYPE = "exponential";
export const DEFAULT_BACKOFF_DELAY = 5000; // 5秒

// 分布式锁配置
export const DEFAULT_LOCK_TTL = 60; // 60秒
export const LOCK_REFRESH_INTERVAL = 10000; // 10秒刷新一次锁

// 幂等性配置
export const DEFAULT_IDEMPOTENCY_TTL = 7 * 24 * 3600; // 7天

// Redis 键前缀
export const REDIS_KEY_PREFIX = {
  LOCK: "job:lock:",
  IDEMPOTENCY: "job:idem:",
  SCHEDULER: "job:scheduler:",
} as const;

/**
 * 任务系统配置
 * 可以根据环境变量或其他条件动态调整
 */
export const jobSystemConfig: JobSystemConfig = {
  queueName: DEFAULT_QUEUE_NAME,
  workerConfig: {
    concurrency: env.NODE_ENV === "production" ? 10 : DEFAULT_WORKER_CONCURRENCY,
    maxStalledCount: DEFAULT_MAX_STALLED_COUNT,
    stalledInterval: DEFAULT_STALLED_INTERVAL,
  },
  defaultJobOptions: {
    attempts: DEFAULT_JOB_ATTEMPTS,
    backoff: {
      type: DEFAULT_BACKOFF_TYPE,
      delay: DEFAULT_BACKOFF_DELAY,
    },
    removeOnComplete: {
      age: 3600, // 1小时
      count: 100, // 保留最近100个
    },
    removeOnFail: {
      age: 24 * 3600, // 24小时
      count: 500, // 保留最近500个失败任务
    },
  },
};
