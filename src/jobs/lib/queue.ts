import type { Job, Queue } from "bullmq";

import { Queue as BullQueue } from "bullmq";

import logger from "@/lib/logger";
import { getBullMQConnection } from "@/lib/redis";

import type { TaskData, TaskOptions } from "../config";
import type { CachedJobData } from "./idempotency";

import { DEFAULT_QUEUE_NAME, mergeJobOptions } from "../config";
import { IdempotencyHelper } from "./idempotency";

// ============ 模块级变量 ============
const queueInstances = new Map<string, Queue>();

// ============ 工具函数 ============

/**
 * 敏感字段列表
 */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "apikey",
  "secret",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "authorization",
];

/**
 * 数据脱敏函数
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // 检查是否为敏感字段
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      sanitized[key] = "***";
    }
    // 递归处理嵌套对象
    else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

// ============ 队列管理函数 ============

/**
 * 获取或创建队列实例（单例）
 */
export function getQueue(queueName: string = DEFAULT_QUEUE_NAME): Queue {
  if (!queueInstances.has(queueName)) {
    const queue = new BullQueue(queueName, {
      connection: getBullMQConnection(),
      defaultJobOptions: mergeJobOptions(),
    });
    queueInstances.set(queueName, queue);

    logger.info({ queueName }, "[队列]: 队列实例已创建");
  }
  return queueInstances.get(queueName)!;
}

/**
 * 添加任务到队列（支持幂等性自动处理）
 *
 * @returns Job<T> - 新添加的任务
 * @returns CachedJobData - 缓存的任务信息（幂等性场景）
 */
export async function addJob<T extends TaskData>(
  taskName: string,
  data: T,
  options?: TaskOptions,
  queueName: string = DEFAULT_QUEUE_NAME,
): Promise<Job<T> | CachedJobData> {
  const queue = getQueue(queueName);
  const finalOptions = mergeJobOptions(options);

  // 如果提供了幂等性键，检查是否已处理
  if (options?.idempotencyKey) {
    const cachedJob = await IdempotencyHelper.getProcessedJob(options.idempotencyKey);
    if (cachedJob) {
      logger.info(
        {
          idempotencyKey: options.idempotencyKey,
          jobId: cachedJob.jobId,
          taskName: cachedJob.taskName,
        },
        "[队列]: 检测到重复任务，返回缓存",
      );
      return cachedJob;
    }
  }

  try {
    const job = await queue.add(taskName, data, finalOptions);

    logger.info(
      {
        taskName,
        jobId: job.id,
        queueName,
        data: sanitizeData(data),
        hasIdempotencyKey: !!options?.idempotencyKey,
      },
      "[队列]: 任务已添加",
    );

    // 自动标记幂等性（如果提供了 idempotencyKey）
    if (options?.idempotencyKey) {
      await IdempotencyHelper.markAsProcessedWithJob(options.idempotencyKey, job);
    }

    return job;
  }
  catch (error) {
    logger.error(
      {
        taskName,
        queueName,
        data: sanitizeData(data),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "[队列]: 添加任务失败",
    );

    throw error;
  }
}

/**
 * 批量添加任务
 */
export async function addBulkJobs<T extends TaskData>(
  jobs: Array<{ name: string; data: T; opts?: TaskOptions }>,
  queueName: string = DEFAULT_QUEUE_NAME,
): Promise<Job<T>[]> {
  const queue = getQueue(queueName);

  const jobsToAdd = jobs.map(job => ({
    name: job.name,
    data: job.data,
    opts: mergeJobOptions(job.opts),
  }));

  try {
    const addedJobs = await queue.addBulk(jobsToAdd);

    logger.info(
      {
        queueName,
        count: addedJobs.length,
        taskNames: jobs.map(j => j.name),
      },
      "[队列]: 批量添加任务完成",
    );

    return addedJobs;
  }
  catch (error) {
    logger.error(
      {
        queueName,
        count: jobs.length,
        error: error instanceof Error ? error.message : String(error),
      },
      "[队列]: 批量添加任务失败",
    );

    throw error;
  }
}

/**
 * 获取队列状态（优化版：使用 getJobCounts 减少 Redis 查询）
 */
export async function getQueueStatus(queueName: string = DEFAULT_QUEUE_NAME) {
  const queue = getQueue(queueName);

  try {
    // 一次查询获取所有状态（从 5 次减少到 1 次）
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");

    return {
      name: queueName,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      total: (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0),
    };
  }
  catch (error) {
    logger.error(
      {
        queueName,
        error: error instanceof Error ? error.message : String(error),
      },
      "[队列]: 获取队列状态失败",
    );

    throw error;
  }
}

/**
 * 清理队列
 */
export async function cleanQueue(
  queueName: string = DEFAULT_QUEUE_NAME,
  grace: number = 5000,
  limit: number = 0,
  type: "completed" | "failed" = "completed",
): Promise<string[]> {
  const queue = getQueue(queueName);

  try {
    const jobs = await queue.clean(grace, limit, type);

    logger.info({ queueName, count: jobs.length, type, grace }, "[队列]: 清理任务完成");

    return jobs;
  }
  catch (error) {
    logger.error(
      {
        queueName,
        type,
        error: error instanceof Error ? error.message : String(error),
      },
      "[队列]: 清理任务失败",
    );

    throw error;
  }
}

/**
 * 暂停队列
 */
export async function pauseQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();

  logger.info({ queueName }, "[队列]: 队列已暂停");
}

/**
 * 恢复队列
 */
export async function resumeQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();

  logger.info({ queueName }, "[队列]: 队列已恢复");
}

/**
 * 关闭所有队列
 */
export async function closeAllQueues(): Promise<void> {
  const promises = Array.from(queueInstances.entries()).map(async ([_name, queue]) => {
    await queue.close();
  });

  await Promise.all(promises);
  queueInstances.clear();

  logger.info("[队列]: 所有队列已关闭");
}

/**
 * 重试失败的任务
 */
export async function retryFailedJobs(
  queueName: string = DEFAULT_QUEUE_NAME,
  limit?: number,
): Promise<void> {
  const queue = getQueue(queueName);
  const failedJobs = await queue.getFailed(0, limit || 100);

  await Promise.all(failedJobs.map(job => job.retry()));

  logger.info({ queueName, count: failedJobs.length }, "[队列]: 重试失败任务完成");
}

/**
 * 获取任务详情
 */
export async function getJob(
  jobId: string,
  queueName: string = DEFAULT_QUEUE_NAME,
): Promise<Job | undefined> {
  const queue = getQueue(queueName);
  return await queue.getJob(jobId);
}
