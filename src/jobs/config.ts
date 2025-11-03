import type { JobsOptions, Processor } from "bullmq";

import env from "@/env";

// ============ 类型定义 ============

/**
 * 任务处理器函数类型
 */
export type TaskProcessor<T = any, R = any> = Processor<T, R>;

/**
 * 任务数据基础接口
 */
export interface TaskData {
  [key: string]: any;
}

/**
 * 任务选项
 */
export interface TaskOptions extends JobsOptions {
  idempotencyKey?: string; // 幂等性键
}

/**
 * Worker 配置
 */
export interface WorkerConfig {
  concurrency?: number; // 并发数，默认 1
  maxStalledCount?: number; // 最大停滞次数，默认 1
  stalledInterval?: number; // 停滞检查间隔（毫秒），默认 30000
}

/**
 * 定时任务配置
 */
export interface ScheduledTaskConfig {
  name: string; // 任务名称
  pattern: string; // Cron 表达式
  data?: TaskData; // 任务数据
  options?: TaskOptions; // 任务选项
  useLock?: boolean; // 是否使用分布式锁，默认 true
  lockTTL?: number; // 锁过期时间（秒），默认 60
}

/**
 * 任务处理器注册项
 */
export interface ProcessorRegistration {
  name: string; // 任务名称
  processor: TaskProcessor; // 处理器函数
  workerConfig?: WorkerConfig; // Worker 配置
}

/**
 * 任务系统配置
 */
export interface JobSystemConfig {
  queueName?: string; // 队列名称，默认 'default'
  defaultJobOptions?: TaskOptions; // 默认任务选项
  workerConfig?: WorkerConfig; // 默认 Worker 配置
}

/**
 * 分布式锁接口
 */
export interface DistributedLock {
  key: string;
  ttl: number;
  value: string;
}

/**
 * 幂等性记录
 */
export interface IdempotencyRecord {
  key: string;
  result?: any;
  createdAt: string;
  expiresAt?: string;
}

// ============ 常量定义 ============

export const DEFAULT_QUEUE_NAME = "default";
export const DEFAULT_WORKER_CONCURRENCY = 5;
export const DEFAULT_MAX_STALLED_COUNT = 1;
export const DEFAULT_STALLED_INTERVAL = 30000; // 30秒

export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_TYPE = "exponential";
export const DEFAULT_BACKOFF_DELAY = 5000; // 5秒

export const DEFAULT_LOCK_TTL = 60; // 60秒
export const LOCK_REFRESH_INTERVAL = 10000; // 10秒

export const DEFAULT_IDEMPOTENCY_TTL = 7 * 24 * 3600; // 7天

export const REDIS_KEY_PREFIX = {
  LOCK: "job:lock:",
  IDEMPOTENCY: "job:idem:",
  SCHEDULER: "job:scheduler:",
} as const;

// ============ 默认配置 ============

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
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 24 * 3600, count: 500 },
  },
};

// ============ 配置合并函数 ============

/**
 * 合并任务选项
 */
export function mergeJobOptions(
  custom?: TaskOptions,
  defaults: TaskOptions = jobSystemConfig.defaultJobOptions!,
): TaskOptions {
  if (!custom)
    return defaults;

  // 处理 backoff 可能是 number | BackoffOptions | undefined 的情况
  let mergedBackoff = defaults.backoff;
  if (custom.backoff !== undefined) {
    if (typeof custom.backoff === "object" && typeof defaults.backoff === "object") {
      mergedBackoff = { ...defaults.backoff, ...custom.backoff };
    }
    else {
      mergedBackoff = custom.backoff;
    }
  }

  return { ...defaults, ...custom, backoff: mergedBackoff };
}

/**
 * 合并 Worker 配置
 */
export function mergeWorkerConfig(
  custom?: WorkerConfig,
  defaults: WorkerConfig = jobSystemConfig.workerConfig!,
): WorkerConfig {
  if (!custom)
    return defaults;
  return { ...defaults, ...custom };
}
