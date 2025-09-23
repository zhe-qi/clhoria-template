import type { Job } from "bullmq";

import { Queue } from "bullmq";

import logger from "@/lib/logger";
import redisClient from "@/lib/redis";

import type { TaskData, TaskOptions } from "../types";

import { mergeJobOptions } from "../config";
import { DEFAULT_QUEUE_NAME } from "../job-system.config";
import { IdempotencyHelper } from "../lib/idempotency";

/**
 * 队列管理器
 */
export class QueueManager {
  private static instances = new Map<string, Queue>();

  /**
   * 获取或创建队列实例
   */
  static getQueue(queueName: string = DEFAULT_QUEUE_NAME): Queue {
    if (!this.instances.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: redisClient.duplicate(),
        defaultJobOptions: mergeJobOptions(),
      });

      this.instances.set(queueName, queue);
    }

    return this.instances.get(queueName)!;
  }

  /**
   * 添加任务到队列
   */
  static async addJob<T extends TaskData>(
    taskName: string,
    data: T,
    options?: TaskOptions,
    queueName: string = DEFAULT_QUEUE_NAME,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const finalOptions = mergeJobOptions(options);

    // 如果提供了幂等性键，检查是否已处理
    if (options?.idempotencyKey) {
      const isProcessed = await IdempotencyHelper.isProcessed(options.idempotencyKey);
      if (isProcessed) {
        logger.warn(
          { taskName, idempotencyKey: options.idempotencyKey },
          "[队列]: 任务已存在（幂等性检查）",
        );
        // 创建一个假的 Job 对象返回
        return { id: options.idempotencyKey } as Job<T>;
      }
    }

    const job = await queue.add(taskName, data, finalOptions);

    return job;
  }

  /**
   * 批量添加任务
   */
  static async addBulkJobs<T extends TaskData>(
    jobs: Array<{
      name: string;
      data: T;
      opts?: TaskOptions;
    }>,
    queueName: string = DEFAULT_QUEUE_NAME,
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);

    const jobsToAdd = jobs.map(job => ({
      name: job.name,
      data: job.data,
      opts: mergeJobOptions(job.opts),
    }));

    const addedJobs = await queue.addBulk(jobsToAdd);
    return addedJobs;
  }

  /**
   * 获取队列状态
   */
  static async getQueueStatus(queueName: string = DEFAULT_QUEUE_NAME) {
    const queue = this.getQueue(queueName);

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
  static async cleanQueue(
    queueName: string = DEFAULT_QUEUE_NAME,
    grace: number = 5000,
    limit: number = 0,
    type: "completed" | "failed" = "completed",
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);

    const jobs = await queue.clean(grace, limit, type);

    logger.info(
      { queueName, count: jobs.length, type },
      "[队列]: 清理任务完成",
    );

    return jobs;
  }

  /**
   * 暂停队列
   */
  static async pauseQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  /**
   * 恢复队列
   */
  static async resumeQueue(queueName: string = DEFAULT_QUEUE_NAME): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  /**
   * 关闭所有队列
   */
  static async closeAll(): Promise<void> {
    const promises = Array.from(this.instances.entries()).map(async ([, queue]) => {
      await queue.close();
    });

    await Promise.all(promises);
    this.instances.clear();
  }

  /**
   * 重试失败的任务
   */
  static async retryFailedJobs(
    queueName: string = DEFAULT_QUEUE_NAME,
    limit?: number,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed(0, limit || 100);

    const retryPromises = failedJobs.map(job => job.retry());
    await Promise.all(retryPromises);

    logger.info(
      { queueName, count: failedJobs.length },
      "[队列]: 重试失败任务",
    );
  }

  /**
   * 获取任务详情
   */
  static async getJob(
    jobId: string,
    queueName: string = DEFAULT_QUEUE_NAME,
  ): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }
}
