/**
 * BullMQ 配置文件 - 复用现有 Redis 连接
 */

import type { QueueOptions, WorkerOptions } from "bullmq";

import redisClient from "@/lib/redis";

/**
 * 默认队列配置 - 复用项目的 Redis 连接
 *
 * 重要概念说明：
 * - attempts: BullMQ 中的总执行次数（包含首次执行）
 *   例如：attempts=3 表示首次执行 + 2次重试
 * - maxRetries: 业务层概念，表示失败后的重试次数（不包含首次执行）
 *   例如：maxRetries=2 表示失败后最多重试2次
 *
 * 转换关系：attempts = maxRetries + 1
 */
export const defaultQueueConfig: QueueOptions = {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 100, // 保留最近100个成功任务记录
    removeOnFail: 50, // 保留最近50个失败任务记录
    attempts: 3, // 总执行次数（首次 + 2次重试）
    backoff: {
      type: "exponential", // 指数退避策略
      delay: 2000, // 初始延迟2秒，每次重试延迟翻倍
    },
  },
};

/**
 * 默认Worker配置 - 分布式优化
 *
 * 配置说明：
 * - concurrency: 单个Worker实例同时处理的任务数
 * - maxStalledCount: 任务被标记为停滞的最大次数，超过后任务失败
 * - stalledInterval: 检查停滞任务的间隔时间（毫秒）
 */
export const defaultWorkerConfig: WorkerOptions = {
  connection: redisClient,
  concurrency: 5, // 单个Worker并发处理5个任务
  maxStalledCount: 1, // 任务停滞1次后即标记为失败
  stalledInterval: 30000, // 每30秒检查一次停滞任务
};

// 队列前缀 - 避免与其他系统冲突
export const QUEUE_PREFIX = "hono-app";

// 不同类型任务的特殊配置
export const queueConfigs = {
  email: {
    ...defaultQueueConfig,
    defaultJobOptions: {
      ...defaultQueueConfig.defaultJobOptions,
      priority: 10, // 邮件任务高优先级
    },
  },

  file: {
    ...defaultQueueConfig,
    defaultJobOptions: {
      ...defaultQueueConfig.defaultJobOptions,
      attempts: 5, // 文件任务多重试几次
      backoff: {
        type: "exponential",
        delay: 5000, // 文件任务延迟更长
      },
    },
  },

  user: {
    ...defaultQueueConfig,
  },

  system: {
    ...defaultQueueConfig,
    defaultJobOptions: {
      ...defaultQueueConfig.defaultJobOptions,
      priority: 1, // 系统任务低优先级
      delay: 1000, // 系统任务延迟1秒执行
    },
  },
};

// Worker 配置
export const workerConfigs = {
  email: {
    ...defaultWorkerConfig,
    concurrency: 10, // 邮件Worker并发度高
  },

  file: {
    ...defaultWorkerConfig,
    concurrency: 3, // 文件Worker并发度低(IO密集)
  },

  user: {
    ...defaultWorkerConfig,
    concurrency: 5,
  },

  system: {
    ...defaultWorkerConfig,
    concurrency: 2, // 系统任务并发度最低
  },
};
