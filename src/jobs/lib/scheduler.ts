import type { Cron } from "croner";

import { Cron as Croner } from "croner";

import logger from "@/lib/logger";

import type { ScheduledTaskConfig, TaskData } from "../config";

import { DEFAULT_LOCK_TTL, DEFAULT_QUEUE_NAME } from "../config";
import { addJob } from "./queue";
import { withLock } from "./redis-lock";

// ============ 模块级变量 ============
const cronJobInstances = new Map<string, Cron>();

// ============ 定时任务调度函数 ============

/**
 * 注册定时任务
 */
export function registerScheduledTask(config: ScheduledTaskConfig): Cron {
  const {
    name,
    pattern,
    data = {},
    options = {},
    useLock = true,
    lockTTL = DEFAULT_LOCK_TTL,
  } = config;

  // 如果任务已存在，先停止
  if (cronJobInstances.has(name)) {
    stopScheduledTask(name);
  }

  // 创建 Croner 实例
  const cronJob = new Croner(pattern, async () => {
    logger.info({ taskName: name, pattern }, "[定时任务]: 触发执行");

    // 定义执行函数
    const executeTask = async () => {
      try {
        // 添加任务到队列
        const job = await addJob(
          name,
          data as TaskData,
          {
            ...options,
            jobId: `${name}-${Date.now()}`,
          },
          DEFAULT_QUEUE_NAME,
        );

        logger.info({ taskName: name, jobId: job.id }, "[定时任务]: 任务已加入队列");
        return job;
      }
      catch (error) {
        logger.error({ error, taskName: name }, "[定时任务]: 添加任务到队列失败");
        return null;
      }
    };

    try {
      // 如果需要分布式锁
      if (useLock) {
        const lockKey = `cron:${name}`;
        const result = await withLock(lockKey, executeTask, { ttl: lockTTL });

        if (!result) {
          logger.warn({ taskName: name }, "[定时任务]: 无法获取锁，跳过执行");
        }
      }
      else {
        await executeTask();
      }
    }
    catch (error) {
      logger.error({ error, taskName: name }, "[定时任务]: 执行失败，但不影响调度器继续运行");
    }
  });

  cronJobInstances.set(name, cronJob);
  return cronJob;
}

/**
 * 批量注册定时任务
 */
export function registerScheduledTasks(configs: ScheduledTaskConfig[]): void {
  for (const config of configs) {
    registerScheduledTask(config);
  }
}

/**
 * 停止定时任务
 */
export function stopScheduledTask(name: string): void {
  const cronJob = cronJobInstances.get(name);
  if (cronJob) {
    cronJob.stop();
    cronJobInstances.delete(name);
  }
}

/**
 * 暂停定时任务
 */
export function pauseScheduledTask(name: string): void {
  const cronJob = cronJobInstances.get(name);
  if (cronJob) {
    cronJob.pause();
  }
}

/**
 * 恢复定时任务
 */
export function resumeScheduledTask(name: string): void {
  const cronJob = cronJobInstances.get(name);
  if (cronJob) {
    cronJob.resume();
  }
}

/**
 * 手动触发定时任务
 */
export async function triggerScheduledTask(name: string): Promise<void> {
  const cronJob = cronJobInstances.get(name);
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
export function getScheduledTaskStatus(name: string) {
  const cronJob = cronJobInstances.get(name);

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
export function getAllScheduledTasksStatus() {
  const statuses: Record<string, any> = {};

  for (const [name, cronJob] of cronJobInstances.entries()) {
    statuses[name] = {
      isRunning: cronJob.isRunning(),
      isPaused: !cronJob.isRunning() && !cronJob.isStopped(),
      isStopped: cronJob.isStopped(),
      isBusy: cronJob.isBusy(),
      nextRun: cronJob.nextRun(),
      pattern: cronJob.getPattern(),
    };
  }

  return statuses;
}

/**
 * 停止所有定时任务
 */
export function stopAllSchedulers(): void {
  for (const cronJob of cronJobInstances.values()) {
    cronJob.stop();
  }
  cronJobInstances.clear();
}

/**
 * 更新定时任务
 * 先停止旧的，再创建新的
 */
export function updateScheduledTask(config: ScheduledTaskConfig): Cron {
  stopScheduledTask(config.name);
  return registerScheduledTask(config);
}
