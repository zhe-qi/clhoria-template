/**
 * 定时任务管理 - 从数据库加载并注册到 BullMQ
 */

import type { Queue } from "bullmq";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemScheduledJob } from "@/db/schema/system";
import { Status } from "@/lib/enums/common";
import logger from "@/lib/logger";

import {
  emailQueue,
  fileQueue,
  systemQueue,
  userQueue,
} from "../queues";

// 队列映射
const queueMap: Record<string, Queue> = {
  email: emailQueue,
  file: fileQueue,
  user: userQueue,
  system: systemQueue,
};

/**
 * 从数据库加载并注册所有启用的定时任务
 * 使用 upsertJobScheduler 保证分布式环境下的安全性
 */
export async function registerCronJobs(): Promise<void> {
  logger.info("[定时任务]: 开始从数据库加载定时任务");

  try {
    // 从数据库获取所有启用的定时任务
    const enabledJobs = await db.query.systemScheduledJob.findMany({
      where: eq(systemScheduledJob.status, Status.ENABLED),
    });

    if (enabledJobs.length === 0) {
      logger.info("[定时任务]: 没有启用的定时任务需要注册");
      return;
    }

    const registeredTasks: Array<{ name: string; queue: string; type: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const job of enabledJobs) {
      try {
        const queue = queueMap[job.queueName];
        if (!queue) {
          logger.error(`[定时任务]: 队列不存在 ${job.queueName}`);
          failedCount++;
          continue;
        }

        // 构建重复任务选项
        const repeatOptions: any = {};

        if (job.cronExpression && job.cronExpression.trim()) {
          repeatOptions.pattern = job.cronExpression;
        }
        else if (job.intervalMs && job.intervalMs > 0) {
          repeatOptions.every = job.intervalMs;
        }
        else {
          logger.error(`[定时任务]: 任务 ${job.name} 缺少有效的调度配置`);
          failedCount++;
          continue;
        }

        // 任务模板配置
        const jobTemplate = {
          name: job.jobName,
          data: {
            ...job.jobData,
            // 添加元数据供 Worker 使用
            _scheduledJobId: job.id,
            _taskType: job.taskType,
            _taskName: job.name,
            _maxRetries: job.maxRetries ?? 3,
            _timeout: (job.timeoutSeconds ?? 300) * 1000,
          },
          opts: {
            priority: job.priority ?? 5,
            attempts: (job.maxRetries ?? 3) + 1, // BullMQ 的 attempts 包含首次执行
            backoff: {
              type: "exponential" as const,
              delay: 2000,
            },
            removeOnComplete: 10, // 保留最近10个成功任务
            removeOnFail: 20, // 保留最近20个失败任务
          },
        };

        // 使用 upsertJobScheduler 注册定时任务
        await queue.upsertJobScheduler(
          job.name, // 使用任务名作为唯一标识符
          repeatOptions,
          jobTemplate,
        );

        successCount++;
        registeredTasks.push({
          name: job.name,
          queue: job.queueName,
          type: job.taskType,
        });
      }
      catch (error) {
        failedCount++;
        logger.error(`[定时任务]: 注册任务 ${job.name} 失败 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 汇总日志
    const taskSummary = registeredTasks.reduce((acc, task) => {
      const key = `${task.type}/${task.queue}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info(
      { summary: taskSummary, success: successCount, failed: failedCount },
      `[定时任务]: 定时任务注册完成 - 成功 ${successCount} 个，失败 ${failedCount} 个`,
    );
  }
  catch (error) {
    logger.error(`[定时任务]: 加载定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 获取所有已注册的定时任务
 */
export async function getScheduledJobs() {
  const scheduledJobs = [];

  try {
    // 获取各队列的定时任务
    const [emailJobs, fileJobs, userJobs, systemJobs] = await Promise.all([
      emailQueue.getJobSchedulers(),
      fileQueue.getJobSchedulers(),
      userQueue.getJobSchedulers(),
      systemQueue.getJobSchedulers(),
    ]);

    scheduledJobs.push(
      ...emailJobs.map(job => ({ ...job, queue: "email" })),
      ...fileJobs.map(job => ({ ...job, queue: "file" })),
      ...userJobs.map(job => ({ ...job, queue: "user" })),
      ...systemJobs.map(job => ({ ...job, queue: "system" })),
    );

    return scheduledJobs;
  }
  catch (error) {
    logger.error(`[定时任务]: 获取定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 移除指定的定时任务
 * @param queueName 队列名称
 * @param jobName 任务名称
 */
export async function removeScheduledJob(queueName: string, jobName: string): Promise<boolean> {
  try {
    const queue = queueMap[queueName];
    if (!queue) {
      throw new Error(`未知队列: ${queueName}`);
    }

    const result = await queue.removeJobScheduler(jobName);
    logger.info(`[定时任务]: ${result ? "成功" : "失败"}移除定时任务 ${queueName}/${jobName}`);
    return result;
  }
  catch (error) {
    logger.error(`[定时任务]: 移除定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
