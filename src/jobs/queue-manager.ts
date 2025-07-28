import { Queue, QueueEvents, Worker } from "bullmq";

import { logger } from "@/lib/logger";
import { redisClient } from "@/lib/redis";

import type { QueueOptions, ScheduledJobConfig, WorkerOptions } from "./types";

import { getHandlerByName } from "./registry";

/** BullMQ 队列管理器 */
export class JobQueueManager {
  private queue!: Queue;
  private worker!: Worker;
  private queueEvents!: QueueEvents;
  private readonly queueName = "scheduled-jobs";

  constructor() {
    this.initializeQueue();
    this.initializeWorker();
    this.initializeQueueEvents();
  }

  /** 初始化队列 */
  private initializeQueue() {
    const queueOptions: QueueOptions = {
      name: this.queueName,
      connection: redisClient,
      defaultJobOptions: {
        removeOnComplete: 100, // 保留最近100个完成的任务
        removeOnFail: 50, // 保留最近50个失败的任务
        attempts: 3, // 默认重试3次
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    };

    this.queue = new Queue(this.queueName, {
      connection: queueOptions.connection,
      defaultJobOptions: queueOptions.defaultJobOptions,
    });

    logger.debug("BullMQ 队列初始化完成", { queueName: this.queueName });
  }

  /** 初始化工作进程 */
  private initializeWorker() {
    const workerOptions: WorkerOptions = {
      concurrency: 5, // 并发执行5个任务
      connection: redisClient,
      limiter: {
        max: 10, // 每秒最多处理10个任务
        duration: 1000,
      },
    };

    this.worker = new Worker(
      this.queueName,
      async (job) => {
        const { handlerName } = job.data;

        logger.debug("开始执行任务", {
          jobId: job.id,
          handlerName,
        });

        // 获取处理器
        const handler = getHandlerByName(handlerName);
        if (!handler) {
          throw new Error(`任务处理器 '${handlerName}' 不存在`);
        }

        // 执行处理器
        const result = await handler(job);

        logger.debug("任务执行完成", {
          jobId: job.id,
          handlerName,
        });

        return result;
      },
      {
        connection: workerOptions.connection,
        concurrency: workerOptions.concurrency,
        limiter: workerOptions.limiter,
      },
    );

    // 绑定工作进程事件
    this.bindWorkerEvents();

    logger.debug("BullMQ Worker 初始化完成", { queueName: this.queueName });
  }

  /** 初始化队列事件监听 */
  private initializeQueueEvents() {
    this.queueEvents = new QueueEvents(this.queueName, {
      connection: redisClient,
    });

    // 绑定队列事件
    this.bindQueueEvents();

    logger.debug("BullMQ QueueEvents 初始化完成", { queueName: this.queueName });
  }

  /** 绑定工作进程事件 */
  private bindWorkerEvents() {
    this.worker.on("completed", (job) => {
      logger.debug("任务完成", {
        jobId: job.id,
        jobName: job.name,
        duration: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
      });
    });

    this.worker.on("failed", (job, error) => {
      logger.error("任务失败", {
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
        stack: error.stack,
      });
    });

    this.worker.on("active", (job) => {
      logger.debug("任务开始执行", {
        jobId: job.id,
        jobName: job.name,
      });
    });

    this.worker.on("stalled", (jobId) => {
      logger.warn("任务停滞", { jobId });
    });

    this.worker.on("error", (error) => {
      logger.error("Worker 错误", { error: error.message });
    });
  }

  /** 绑定队列事件 */
  private bindQueueEvents() {
    this.queueEvents.on("waiting", ({ jobId }) => {
      logger.debug("任务等待中", { jobId });
    });

    this.queueEvents.on("active", ({ jobId, prev }) => {
      logger.debug("任务激活", { jobId, previousStatus: prev });
    });

    this.queueEvents.on("completed", ({ jobId, returnvalue }) => {
      logger.debug("任务完成事件", { jobId, returnValue: returnvalue });
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      logger.debug("任务失败事件", { jobId, reason: failedReason });
    });

    this.queueEvents.on("progress", ({ jobId, data }) => {
      logger.debug("任务进度更新", { jobId, progress: data });
    });
  }

  /** 添加定时任务 */
  async addRepeatingJob(jobConfig: ScheduledJobConfig): Promise<void> {
    try {
      // 使用新的 Job Schedulers API
      await this.queue.upsertJobScheduler(
        `scheduled-${jobConfig.id}`, // 使用配置ID作为调度器ID
        {
          pattern: jobConfig.cronExpression,
          tz: jobConfig.timezone || "Asia/Shanghai",
        },
        {
          name: jobConfig.name,
          data: {
            handlerName: jobConfig.handlerName,
            ...jobConfig.payload,
          },
          opts: {
            priority: jobConfig.priority,
            attempts: jobConfig.retryAttempts,
            backoff: {
              type: "exponential" as const,
              delay: jobConfig.retryDelay,
            },
            removeOnComplete: 10,
            removeOnFail: 5,
          },
        },
      );

      logger.info("添加定时任务成功", {
        jobId: jobConfig.id,
        name: jobConfig.name,
        cronExpression: jobConfig.cronExpression,
        handlerName: jobConfig.handlerName,
      });
    }
    catch (error) {
      logger.error("添加定时任务失败", {
        jobId: jobConfig.id,
        error,
      });
      throw error;
    }
  }

  /** 移除定时任务 */
  async removeRepeatingJob(jobId: string): Promise<void> {
    try {
      // 使用新的 Job Schedulers API
      const scheduledJobId = `scheduled-${jobId}`;
      await this.queue.removeJobScheduler(scheduledJobId);

      logger.info("移除定时任务成功", { jobId, scheduledJobId });
    }
    catch (error) {
      logger.error("移除定时任务失败", { jobId, error });
      throw error;
    }
  }

  /** 立即执行任务 */
  async executeJobNow(jobConfig: ScheduledJobConfig): Promise<void> {
    try {
      await this.queue.add(
        `${jobConfig.name}-immediate`,
        {
          handlerName: jobConfig.handlerName,
          ...jobConfig.payload,
        },
        {
          priority: 10, // 高优先级立即执行
          attempts: jobConfig.retryAttempts,
          backoff: {
            type: "exponential" as const,
            delay: jobConfig.retryDelay,
          },
        },
      );

      logger.info("立即执行任务添加成功", {
        jobId: jobConfig.id,
        name: jobConfig.name,
        handlerName: jobConfig.handlerName,
      });
    }
    catch (error) {
      logger.error("立即执行任务失败", {
        jobId: jobConfig.id,
        error,
      });
      throw error;
    }
  }

  /** 获取队列状态 */
  async getQueueStatus() {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
        Promise.resolve([]), // getPaused方法不存在，使用空数组
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length,
      };
    }
    catch (error) {
      logger.error("获取队列状态失败", { error });
      throw error;
    }
  }

  /** 暂停队列 */
  async pauseQueue(): Promise<void> {
    try {
      await this.queue.pause();
      logger.info("队列已暂停");
    }
    catch (error) {
      logger.error("暂停队列失败", { error });
      throw error;
    }
  }

  /** 恢复队列 */
  async resumeQueue(): Promise<void> {
    try {
      await this.queue.resume();
      logger.info("队列已恢复");
    }
    catch (error) {
      logger.error("恢复队列失败", { error });
      throw error;
    }
  }

  /** 清空队列 */
  async clearQueue(): Promise<void> {
    try {
      await this.queue.drain();
      logger.info("队列已清空");
    }
    catch (error) {
      logger.error("清空队列失败", { error });
      throw error;
    }
  }

  /** 获取所有定时任务调度器 */
  async getRepeatableJobs() {
    try {
      const jobSchedulers = await this.queue.getJobSchedulers();
      logger.info("定时任务调度器列表", { count: jobSchedulers.length, schedulers: jobSchedulers });
      return jobSchedulers;
    }
    catch (error) {
      logger.error("获取定时任务调度器失败", { error });
      throw error;
    }
  }

  /** 清理所有定时任务调度器 */
  async clearAllRepeatableJobs(): Promise<void> {
    try {
      // 1. 清理所有重复任务调度器
      const jobSchedulers = await this.queue.getJobSchedulers();
      logger.info(`发现 ${jobSchedulers.length} 个定时任务调度器，开始清理`, {
        schedulers: jobSchedulers.map(scheduler => ({
          id: scheduler.id,
          name: scheduler.name,
          pattern: scheduler.pattern,
          tz: scheduler.tz,
        })),
      });

      for (const scheduler of jobSchedulers) {
        if (scheduler.id) {
          await this.queue.removeJobScheduler(scheduler.id);
          logger.debug("已清理定时任务调度器", {
            id: scheduler.id,
            name: scheduler.name,
            pattern: scheduler.pattern,
          });
        }
      }

      // 2. 清理所有待处理的任务
      await this.queue.obliterate({ force: true });
      logger.debug("已清理所有队列中的待处理任务");

      // 3. 验证清理结果
      const remainingSchedulers = await this.queue.getJobSchedulers();
      if (remainingSchedulers.length > 0) {
        logger.warn(`仍有 ${remainingSchedulers.length} 个调度器未清理完成`, {
          remaining: remainingSchedulers.map(s => ({ id: s.id, name: s.name })),
        });
      }

      logger.info("所有定时任务调度器已清理完成");
    }
    catch (error) {
      logger.error("清理定时任务调度器失败", { error });
      throw error;
    }
  }

  /** 关闭队列管理器 */
  async close(): Promise<void> {
    try {
      await this.worker.close();
      await this.queue.close();
      await this.queueEvents.close();

      logger.info("队列管理器已关闭");
    }
    catch (error) {
      logger.error("关闭队列管理器失败", { error });
      throw error;
    }
  }

  /** 获取队列实例 */
  getQueue(): Queue {
    return this.queue;
  }

  /** 获取工作进程实例 */
  getWorker(): Worker {
    return this.worker;
  }

  /** 获取队列事件实例 */
  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }
}
