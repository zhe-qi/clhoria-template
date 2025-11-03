import type { Job, QueueEvents, Worker } from "bullmq";

import { QueueEvents as BullQueueEvents, Worker as BullWorker } from "bullmq";

import logger from "@/lib/logger";
import redisClient from "@/lib/redis";

import type { TaskProcessor, WorkerConfig } from "../config";

import { DEFAULT_QUEUE_NAME, mergeWorkerConfig } from "../config";

// ============ 模块级变量 ============
const workerInstances = new Map<string, Worker>();
const processorRegistry = new Map<string, TaskProcessor>();
const queueEventsInstances = new Map<string, QueueEvents>();

// ============ Worker 管理函数 ============

/**
 * 注册任务处理器
 */
export function registerProcessor(taskName: string, processor: TaskProcessor): void {
  processorRegistry.set(taskName, processor);
}

/**
 * 批量注册处理器
 */
export function registerProcessors(processors: Record<string, TaskProcessor>): void {
  for (const [name, processor] of Object.entries(processors)) {
    registerProcessor(name, processor);
  }
}

/**
 * 创建并启动 Worker
 */
export function createWorker(
  queueName: string = DEFAULT_QUEUE_NAME,
  config?: WorkerConfig,
): Worker {
  // 如果已存在，先关闭旧的
  if (workerInstances.has(queueName)) {
    void stopWorker(queueName);
  }

  const workerConfig = mergeWorkerConfig(config);

  // 创建 Worker
  const worker = new BullWorker(
    queueName,
    async (job: Job) => {
      const processor = processorRegistry.get(job.name);

      if (!processor) {
        logger.error({ taskName: job.name, jobId: job.id }, "[Worker]: 未找到任务处理器");
        throw new Error(`未找到任务处理器: ${job.name}`);
      }

      try {
        return await processor(job, job.token);
      }
      catch (error) {
        logger.error({ error, taskName: job.name, jobId: job.id }, "[Worker]: 任务处理失败");
        throw error;
      }
    },
    {
      connection: redisClient.duplicate(),
      concurrency: workerConfig.concurrency,
      maxStalledCount: workerConfig.maxStalledCount,
      stalledInterval: workerConfig.stalledInterval,
    },
  );

  // 监听 Worker 事件
  attachWorkerListeners(worker, queueName);

  // 创建 QueueEvents 监听全局事件
  const queueEvents = new BullQueueEvents(queueName, {
    connection: redisClient.duplicate(),
  });
  attachQueueEventListeners(queueEvents, queueName);

  workerInstances.set(queueName, worker);
  queueEventsInstances.set(queueName, queueEvents);

  return worker;
}

/**
 * 附加 Worker 事件监听器
 */
function attachWorkerListeners(worker: Worker, queueName: string): void {
  // 任务停滞
  worker.on("stalled", (jobId, prev) => {
    logger.warn({ queueName, jobId, previousState: prev }, "[Worker]: 任务停滞");
  });

  // Worker 错误
  worker.on("error", (err) => {
    logger.error({ error: err, queueName }, "[Worker]: Worker 错误");
  });
}

/**
 * 附加队列事件监听器
 */
function attachQueueEventListeners(queueEvents: QueueEvents, queueName: string): void {
  // 任务失败
  queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error({ queueName, jobId, failedReason }, "[队列事件]: 任务失败");
  });
}

/**
 * 停止 Worker
 */
export async function stopWorker(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const worker = workerInstances.get(queueName);
  const queueEvents = queueEventsInstances.get(queueName);

  if (worker) {
    await worker.close();
    workerInstances.delete(queueName);
  }

  if (queueEvents) {
    await queueEvents.close();
    queueEventsInstances.delete(queueName);
  }
}

/**
 * 暂停 Worker
 */
export async function pauseWorker(
  queueName: string = DEFAULT_QUEUE_NAME,
  force?: boolean,
): Promise<void> {
  const worker = workerInstances.get(queueName);
  if (worker) {
    await worker.pause(force);
  }
}

/**
 * 恢复 Worker
 */
export async function resumeWorker(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
  const worker = workerInstances.get(queueName);
  if (worker) {
    await worker.resume();
  }
}

/**
 * 优雅关闭所有 Worker
 */
export async function shutdownWorkers(): Promise<void> {
  const promises = Array.from(workerInstances.keys()).map(queueName =>
    stopWorker(queueName),
  );
  await Promise.all(promises);
}

/**
 * 获取 Worker 状态
 */
export function getWorkerStatus(queueName: string = DEFAULT_QUEUE_NAME) {
  const worker = workerInstances.get(queueName);

  if (!worker) {
    return { exists: false };
  }

  return {
    exists: true,
    isPaused: worker.isPaused(),
    isRunning: worker.isRunning(),
    concurrency: worker.concurrency,
  };
}

/**
 * 获取所有 Worker 状态
 */
export function getAllWorkerStatus() {
  const statuses: Record<string, any> = {};

  for (const [queueName, worker] of workerInstances.entries()) {
    statuses[queueName] = {
      isPaused: worker.isPaused(),
      isRunning: worker.isRunning(),
      concurrency: worker.concurrency,
    };
  }

  return statuses;
}
