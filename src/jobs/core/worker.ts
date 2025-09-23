import type { Job } from "bullmq";

import { QueueEvents, Worker } from "bullmq";

import logger from "@/lib/logger";
import redisClient from "@/lib/redis";

import type { TaskProcessor, WorkerConfig } from "../types";

import { mergeWorkerConfig } from "../config";
import { DEFAULT_QUEUE_NAME } from "../job-system.config";

/**
 * Worker 管理器
 */
export class WorkerManager {
  private static workers = new Map<string, Worker>();
  private static processors = new Map<string, TaskProcessor>();
  private static queueEvents = new Map<string, QueueEvents>();

  /**
   * 注册任务处理器
   */
  static registerProcessor(taskName: string, processor: TaskProcessor): void {
    this.processors.set(taskName, processor);
  }

  /**
   * 批量注册处理器
   */
  static registerProcessors(processors: Record<string, TaskProcessor>): void {
    Object.entries(processors).forEach(([name, processor]) => {
      this.registerProcessor(name, processor);
    });
  }

  /**
   * 创建并启动 Worker
   */
  static createWorker(
    queueName: string = DEFAULT_QUEUE_NAME,
    config?: WorkerConfig,
  ): Worker {
    // 如果已存在，先关闭旧的
    if (this.workers.has(queueName)) {
      void this.stopWorker(queueName);
    }

    const workerConfig = mergeWorkerConfig(config);

    // 创建 Worker
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const processor = this.processors.get(job.name);

        if (!processor) {
          logger.error(
            { taskName: job.name, jobId: job.id },
            "[Worker]: 未找到任务处理器",
          );
          throw new Error(`未找到任务处理器: ${job.name}`);
        }

        try {
          const result = await processor(job, job.token);
          return result;
        }
        catch (error) {
          logger.error(
            { error, taskName: job.name, jobId: job.id },
            "[Worker]: 任务处理失败",
          );
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
    this.attachWorkerListeners(worker, queueName);

    // 创建 QueueEvents 监听全局事件
    const queueEvents = new QueueEvents(queueName, {
      connection: redisClient.duplicate(),
    });
    this.attachQueueEventListeners(queueEvents, queueName);

    this.workers.set(queueName, worker);
    this.queueEvents.set(queueName, queueEvents);

    return worker;
  }

  /**
   * 附加 Worker 事件监听器
   */
  private static attachWorkerListeners(worker: Worker, queueName: string): void {
    // 任务停滞
    worker.on("stalled", (jobId, prev) => {
      logger.warn(
        { queueName, jobId, previousState: prev },
        "[Worker]: 任务停滞",
      );
    });

    // Worker 错误
    worker.on("error", (err) => {
      logger.error({ error: err, queueName }, "[Worker]: Worker 错误");
    });
  }

  /**
   * 附加队列事件监听器
   */
  private static attachQueueEventListeners(
    queueEvents: QueueEvents,
    queueName: string,
  ): void {
    // 任务失败
    queueEvents.on("failed", ({ jobId, failedReason }) => {
      logger.error(
        { queueName, jobId, failedReason },
        "[队列事件]: 任务失败",
      );
    });
  }

  /**
   * 停止 Worker
   */
  static async stopWorker(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
    const worker = this.workers.get(queueName);
    const queueEvents = this.queueEvents.get(queueName);

    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
    }

    if (queueEvents) {
      await queueEvents.close();
      this.queueEvents.delete(queueName);
    }
  }

  /**
   * 暂停 Worker
   */
  static async pauseWorker(
    queueName: string = DEFAULT_QUEUE_NAME,
    force?: boolean,
  ): Promise<void> {
    const worker = this.workers.get(queueName);

    if (worker) {
      await worker.pause(force);
    }
  }

  /**
   * 恢复 Worker
   */
  static async resumeWorker(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
    const worker = this.workers.get(queueName);

    if (worker) {
      await worker.resume();
    }
  }

  /**
   * 优雅关闭所有 Worker
   */
  static async shutdown(): Promise<void> {
    const promises = Array.from(this.workers.keys()).map(queueName =>
      this.stopWorker(queueName),
    );

    await Promise.all(promises);
  }

  /**
   * 获取 Worker 状态
   */
  static getWorkerStatus(queueName: string = DEFAULT_QUEUE_NAME) {
    const worker = this.workers.get(queueName);

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
  static getAllWorkerStatus() {
    const statuses: Record<string, any> = {};

    this.workers.forEach((worker, queueName) => {
      statuses[queueName] = {
        isPaused: worker.isPaused(),
        isRunning: worker.isRunning(),
        concurrency: worker.concurrency,
      };
    });

    return statuses;
  }
}
