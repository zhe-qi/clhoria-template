import type { Job, Queue } from "bullmq";

import { Queue as BullQueue } from "bullmq";

import logger from "@/lib/logger";
import redisClient from "@/lib/redis";

import type { TaskData, TaskOptions } from "../config";

import { DEFAULT_QUEUE_NAME, mergeJobOptions } from "../config";
import { IdempotencyHelper } from "./idempotency";

// ============ 模块级变量 ============
const queueInstances = new Map<string, Queue>();

// ============ 队列管理函数 ============

/**
 * 获取或创建队列实例
 */
export function getQueue(queueName: string = DEFAULT_QUEUE_NAME): Queue {
  if (!queueInstances.has(queueName)) {
    const queue = new BullQueue(queueName, {
      connection: redisClient.duplicate(),
      defaultJobOptions: mergeJobOptions(),
    });
    queueInstances.set(queueName, queue);
  }
  return queueInstances.get(queueName)!;
}

/**
 * 添加任务到队列
 */
export async function addJob<T extends TaskData>(
  taskName: string,
  data: T,
  options?: TaskOptions,
  queueName: string = DEFAULT_QUEUE_NAME,
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  const finalOptions = mergeJobOptions(options);

  // 如果提供了幂等性键，检查是否已处理
  if (options?.idempotencyKey) {
    const isProcessed = await IdempotencyHelper.isProcessed(options.idempotencyKey);
    if (isProcessed) {
      logger.warn(
        { taskName, idempotencyKey: options.idempotencyKey },
        "[队列]: 任务已存在（幂等性检查）",
      );
      return { id: options.idempotencyKey } as Job<T>;
    }
  }

  return await queue.add(taskName, data, finalOptions);
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

  return await queue.addBulk(jobsToAdd);
}

/**
 * 获取队列状态
 */
export async function getQueueStatus(queueName: string = DEFAULT_QUEUE_NAME) {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
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
  const jobs = await queue.clean(grace, limit, type);

  logger.info({ queueName, count: jobs.length, type }, "[队列]: 清理任务完成");

  return jobs;
}

/**
 * 暂停队列
 */
export async function pauseQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
}

/**
 * 恢复队列
 */
export async function resumeQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
}

/**
 * 关闭所有队列
 */
export async function closeAllQueues(): Promise<void> {
  const promises = Array.from(queueInstances.entries()).map(async ([, queue]) => {
    await queue.close();
  });

  await Promise.all(promises);
  queueInstances.clear();
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

  logger.info({ queueName, count: failedJobs.length }, "[队列]: 重试失败任务");
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
