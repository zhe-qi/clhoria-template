/**
 * BullMQ 配置文件 - 复用现有 Redis 连接
 */

import type { QueueOptions, WorkerOptions } from "bullmq";

import redisClient from "@/lib/redis";

// 默认队列配置 - 复用项目的 Redis 连接
export const defaultQueueConfig: QueueOptions = {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 100, // 保留最近100个成功任务
    removeOnFail: 50, // 保留最近50个失败任务
    attempts: 3, // 失败重试3次
    backoff: {
      type: "exponential", // 指数退避
      delay: 2000, // 初始延迟2秒
    },
  },
};

// 默认Worker配置 - 分布式优化
export const defaultWorkerConfig: WorkerOptions = {
  connection: redisClient,
  concurrency: 5, // 并发处理5个任务
  maxStalledCount: 1, // 最大停滞任务数
  stalledInterval: 30000, // 停滞检查间隔30秒
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
