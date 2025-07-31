import { Queue, QueueEvents, Worker } from "bullmq";

import { logger } from "@/lib/logger";
import { redisClient } from "@/lib/redis";

import type {
  AddJobOptions,
  HealthCheckResult,
  JobPriority,
  QueueMetrics,
  QueueOptions,
  ScheduledJobConfig,
  WorkerOptions,
} from "./types";

import { getHandlerByName } from "./registry";

/** BullMQ 队列管理器 */
export class JobQueueManager {
  private queue!: Queue;
  private worker!: Worker;
  private queueEvents!: QueueEvents;
  private readonly queueName = "scheduled-jobs";

  // 状态管理
  private isInitialized = false;
  private isShuttingDown = false;

  // 性能指标
  private metrics: QueueMetrics = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    successRate: 0,
    processingTimes: [],
  };

  constructor() {
    this.initializeWithRetry();
  }

  /** 带重试的初始化 */
  private async initializeWithRetry(maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.initialize();
        this.isInitialized = true;
        logger.info("队列管理器初始化成功", { attempt });
        return;
      }
      catch (error) {
        logger.error(`队列管理器初始化失败 (尝试 ${attempt}/${maxRetries})`, { error });
        if (attempt === maxRetries)
          throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /** 异步初始化 */
  private async initialize(): Promise<void> {
    this.initializeQueue();
    this.initializeWorker();
    this.initializeQueueEvents();
  }

  /** 检查初始化状态 */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("队列管理器未初始化");
    }
    if (this.isShuttingDown) {
      throw new Error("队列管理器正在关闭");
    }
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
      defaultJobOptions: {
        ...queueOptions.defaultJobOptions,
        delay: 1000, // 初始延迟
      },
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
        const startTime = Date.now();
        const { handlerName } = job.data;

        logger.debug("开始执行任务", {
          jobId: job.id,
          handlerName,
        });

        try {
          // 获取处理器
          const handler = getHandlerByName(handlerName);
          if (!handler) {
            throw new Error(`任务处理器 '${handlerName}' 不存在`);
          }

          // 执行处理器
          const result = await handler(job);

          // 更新成功指标
          const duration = Date.now() - startTime;
          this.updateMetrics(true, duration);

          logger.debug("任务执行完成", {
            jobId: job.id,
            handlerName,
            duration,
          });

          return result;
        }
        catch (error) {
          // 更新失败指标
          const duration = Date.now() - startTime;
          this.updateMetrics(false, duration);
          throw error;
        }
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
      const duration = job.finishedOn ? job.finishedOn - job.processedOn! : 0;

      // 更新指标
      this.metrics.completedJobs++;
      this.updateProcessingTime(duration);

      logger.debug("任务完成", {
        jobId: job.id,
        jobName: job.name,
        duration,
        totalCompleted: this.metrics.completedJobs,
      });
    });

    this.worker.on("failed", (job, error) => {
      this.metrics.failedJobs++;

      // 记录失败模式以便分析
      logger.error("任务失败", {
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
        stack: error.stack,
        attemptsMade: job?.attemptsMade,
        totalFailed: this.metrics.failedJobs,
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

  /** 更新性能指标 */
  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.totalJobs++;

    if (success) {
      this.metrics.completedJobs++;
    }
    else {
      this.metrics.failedJobs++;
    }

    this.updateProcessingTime(duration);
  }

  /** 更新处理时间统计 */
  private updateProcessingTime(duration: number): void {
    this.metrics.processingTimes.push(duration);

    // 只保留最近1000个处理时间用于计算平均值
    if (this.metrics.processingTimes.length > 1000) {
      this.metrics.processingTimes.shift();
    }

    this.metrics.averageProcessingTime
      = this.metrics.processingTimes.reduce((a, b) => a + b, 0)
        / this.metrics.processingTimes.length;

    // 更新成功率
    this.metrics.successRate = this.metrics.totalJobs > 0
      ? (this.metrics.completedJobs / this.metrics.totalJobs) * 100
      : 0;
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

  /** 添加任务并自动分类 */
  async addJob(
    name: string,
    data: any,
    options?: AddJobOptions,
  ) {
    this.ensureInitialized();

    const jobOptions = {
      priority: options?.priority || 5, // 默认普通优先级
      delay: options?.delay,
      // 添加任务分类标签
      jobId: options?.category ? `${options.category}:${Date.now()}` : undefined,
      // 添加超时保护
      removeOnComplete: this.getRetentionCount(options?.priority),
      removeOnFail: Math.ceil(this.getRetentionCount(options?.priority) / 2),
    };

    return await this.queue.add(name, data, jobOptions);
  }

  /** 根据优先级获取保留数量 */
  private getRetentionCount(priority?: JobPriority): number {
    switch (priority) {
      case 20: return 200; // CRITICAL
      case 10: return 150; // HIGH
      case 5: return 100; // NORMAL
      case 1: return 50; // LOW
      default: return 100;
    }
  }

  /** 批量添加任务 */
  async addBulkJobs(jobs: Array<{
    name: string;
    data: any;
    options?: any;
  }>): Promise<void> {
    this.ensureInitialized();

    if (jobs.length === 0)
      return;

    // 分批处理大量任务
    const batchSize = 100;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await this.queue.addBulk(batch);

      logger.debug(`批量添加任务进度`, {
        processed: Math.min(i + batchSize, jobs.length),
        total: jobs.length,
      });
    }

    logger.info(`批量添加 ${jobs.length} 个任务完成`);
  }

  /** 条件清理任务 */
  async cleanJobs(
    grace: number,
    limit: number,
    type: "completed" | "failed" | "active" | "waiting",
  ): Promise<number> {
    this.ensureInitialized();

    const cleaned = await this.queue.clean(grace, limit, type);
    logger.info(`清理 ${type} 状态任务完成`, { cleaned: cleaned.length });

    return cleaned.length;
  }

  /** 获取性能指标 */
  getMetrics(): QueueMetrics {
    return {
      ...this.metrics,
      successRate: this.metrics.totalJobs > 0
        ? (this.metrics.completedJobs / this.metrics.totalJobs) * 100
        : 0,
    };
  }

  /** 健康检查 */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const [queueStatus, metrics] = await Promise.all([
        this.getQueueStatus(),
        Promise.resolve(this.getMetrics()),
      ]);

      const isHealthy
        = this.isInitialized
          && !this.isShuttingDown
          && queueStatus.failed < 100; // 失败任务数阈值

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        details: {
          initialized: this.isInitialized,
          shuttingDown: this.isShuttingDown,
          queueStatus,
          metrics,
        },
      };
    }
    catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error.message },
      };
    }
  }

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
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      // 检查队列是否处于暂停状态
      const isPaused = await this.queue.isPaused();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        isPaused, // 队列暂停状态
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    }
    catch (error) {
      logger.error("获取队列状态失败", { error });
      throw error;
    }
  }

  /** 获取详细的队列统计信息 */
  async getDetailedQueueStats() {
    try {
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        isPaused,
      ] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
        this.queue.isPaused(),
      ]);

      return {
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length,
        },
        queueState: {
          isPaused,
          isHealthy: failed.length < 100, // 可配置的健康阈值
        },
        jobs: {
          waiting: waiting.slice(0, 10), // 只返回前10个等待任务
          active: active.slice(0, 10), // 只返回前10个活跃任务
          failed: failed.slice(0, 5), // 只返回前5个失败任务
        },
      };
    }
    catch (error) {
      logger.error("获取详细队列统计失败", { error });
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

  /** 优雅关闭队列管理器 */
  async gracefulShutdown(timeout = 30000): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn("队列管理器已在关闭过程中");
      return;
    }

    this.isShuttingDown = true;
    logger.info("开始优雅关闭队列管理器", { timeout });

    try {
      // 1. 停止接收新任务
      await this.queue.pause();

      // 2. 等待当前任务完成
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const activeJobs = await this.queue.getActive();
        if (activeJobs.length === 0)
          break;

        logger.debug(`等待 ${activeJobs.length} 个活跃任务完成`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3. 强制关闭
      await Promise.all([
        this.worker.close(),
        this.queueEvents.close(),
        this.queue.close(),
      ]);

      logger.info("队列管理器优雅关闭完成");
    }
    catch (error) {
      logger.error("优雅关闭过程中出现错误", { error });
      throw error;
    }
    finally {
      this.isShuttingDown = false;
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
