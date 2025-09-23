import { Cron } from "croner";

import logger from "@/lib/logger";

import type { ScheduledTaskConfig, TaskData } from "../types";

import { DEFAULT_LOCK_TTL, DEFAULT_QUEUE_NAME } from "../job-system.config";
import { withLock } from "../lib/redis-lock";
import { QueueManager } from "./queue";

/**
 * 定时任务调度器
 */
export class TaskScheduler {
  private static cronJobs = new Map<string, Cron>();

  /**
   * 注册定时任务
   */
  static registerScheduledTask(config: ScheduledTaskConfig): Cron {
    const {
      name,
      pattern,
      data = {},
      options = {},
      useLock = true,
      lockTTL = DEFAULT_LOCK_TTL,
    } = config;

    // 如果任务已存在，先停止
    if (this.cronJobs.has(name)) {
      this.stopScheduledTask(name);
    }

    // 创建 Croner 实例
    const cronJob = new Cron(pattern, async () => {
      logger.info({ taskName: name, pattern }, "[定时任务]: 触发执行");

      // 定义执行函数
      const executeTask = async () => {
        try {
          // 添加任务到队列
          const job = await QueueManager.addJob(
            name,
            data as TaskData,
            {
              ...options,
              // 使用时间戳作为 jobId，避免重复
              jobId: `${name}:${Date.now()}`,
            },
            DEFAULT_QUEUE_NAME,
          );

          logger.info(
            { taskName: name, jobId: job.id },
            "[定时任务]: 任务已加入队列",
          );

          return job;
        }
        catch (error) {
          logger.error(
            { error, taskName: name },
            "[定时任务]: 添加任务到队列失败",
          );
          throw error;
        }
      };

      // 如果需要分布式锁
      if (useLock) {
        const lockKey = `cron:${name}`;
        const result = await withLock(lockKey, executeTask, { ttl: lockTTL });

        if (!result) {
          logger.warn(
            { taskName: name },
            "[定时任务]: 无法获取锁，跳过执行",
          );
        }
      }
      else {
        // 不使用锁，直接执行
        await executeTask();
      }
    });

    this.cronJobs.set(name, cronJob);

    return cronJob;
  }

  /**
   * 批量注册定时任务
   */
  static registerScheduledTasks(configs: ScheduledTaskConfig[]): void {
    configs.forEach(config => this.registerScheduledTask(config));
  }

  /**
   * 停止定时任务
   */
  static stopScheduledTask(name: string): void {
    const cronJob = this.cronJobs.get(name);

    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(name);
    }
  }

  /**
   * 暂停定时任务
   */
  static pauseScheduledTask(name: string): void {
    const cronJob = this.cronJobs.get(name);

    if (cronJob) {
      cronJob.pause();
    }
  }

  /**
   * 恢复定时任务
   */
  static resumeScheduledTask(name: string): void {
    const cronJob = this.cronJobs.get(name);

    if (cronJob) {
      cronJob.resume();
    }
  }

  /**
   * 手动触发定时任务
   */
  static async triggerScheduledTask(name: string): Promise<void> {
    const cronJob = this.cronJobs.get(name);

    if (cronJob) {
      await cronJob.trigger();
    }
    else {
      logger.warn({ taskName: name }, "[定时任务]: 任务不存在");
    }
  }

  /**
   * 获取定时任务状态
   */
  static getScheduledTaskStatus(name: string) {
    const cronJob = this.cronJobs.get(name);

    if (!cronJob) {
      return { exists: false };
    }

    return {
      exists: true,
      isRunning: cronJob.isRunning(),
      isPaused: !cronJob.isRunning() && !cronJob.isStopped(),
      isStopped: cronJob.isStopped(),
      isBusy: cronJob.isBusy(),
      nextRun: cronJob.nextRun(),
      nextRuns: cronJob.nextRuns(5),
      previousRun: cronJob.previousRun(),
      pattern: cronJob.getPattern(),
    };
  }

  /**
   * 获取所有定时任务状态
   */
  static getAllScheduledTasksStatus() {
    const statuses: Record<string, any> = {};

    this.cronJobs.forEach((cronJob, name) => {
      statuses[name] = {
        isRunning: cronJob.isRunning(),
        isPaused: !cronJob.isRunning() && !cronJob.isStopped(),
        isStopped: cronJob.isStopped(),
        isBusy: cronJob.isBusy(),
        nextRun: cronJob.nextRun(),
        pattern: cronJob.getPattern(),
      };
    });

    return statuses;
  }

  /**
   * 停止所有定时任务
   */
  static stopAll(): void {
    this.cronJobs.forEach((cronJob) => {
      cronJob.stop();
    });

    this.cronJobs.clear();
  }

  /**
   * 更新定时任务
   * 先停止旧的，再创建新的
   */
  static updateScheduledTask(config: ScheduledTaskConfig): Cron {
    this.stopScheduledTask(config.name);
    return this.registerScheduledTask(config);
  }
}
