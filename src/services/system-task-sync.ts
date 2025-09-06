/**
 * 系统定时任务同步服务
 * 负责将代码中定义的系统任务同步到数据库
 */

import type { Queue } from "bullmq";

import { eq } from "drizzle-orm";

import type { EmailJobData, FileJobData, SystemJobData, UserJobData } from "@/jobs/types";

import db from "@/db";
import { systemJobExecutionLog, systemScheduledJob } from "@/db/schema/system";
import env from "@/env";
import { emailQueue, fileQueue, systemQueue, userQueue } from "@/jobs/queues";
import { Status } from "@/lib/enums/common";
import logger from "@/lib/logger";
import { formatDate } from "@/utils/tools/formatter";

/**
 * 系统任务定义接口
 */
export interface SystemTaskDefinition {
  name: string;
  description: string;
  cronExpression?: string;
  intervalMs?: number;
  queueName: string;
  jobName: string;
  jobData: Record<string, unknown>;
  priority?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
}

/**
 * 预定义的系统任务配置
 * 这些任务在应用启动时自动注册到数据库
 */
export const SYSTEM_TASKS: SystemTaskDefinition[] = [
  {
    name: "daily-backup",
    description: "每日系统备份任务 - 凌晨2点执行",
    cronExpression: "0 2 * * *", // 每天凌晨2点
    queueName: "system",
    jobName: "backup",
    jobData: {
      task: "backup",
      params: {
        databases: ["main", "logs"],
        compression: true,
      },
    } satisfies SystemJobData as Record<string, unknown>,
    priority: 1, // 高优先级
    maxRetries: 2,
    timeoutSeconds: 1800, // 30分钟
  },
  {
    name: "daily-cleanup",
    description: "每日系统清理任务 - 凌晨3点执行",
    cronExpression: "0 3 * * *", // 每天凌晨3点
    queueName: "system",
    jobName: "cleanup",
    jobData: {
      task: "cleanup",
      params: {
        cleanTypes: ["logs", "temp_files", "cache", "sessions"],
        daysToKeep: 7,
      },
    } satisfies SystemJobData as Record<string, unknown>,
    priority: 2,
    maxRetries: 3,
    timeoutSeconds: 900, // 15分钟
  },
  {
    name: "weekly-report",
    description: "每周报告生成任务 - 周一早上8点执行",
    cronExpression: "0 8 * * 1", // 每周一8点
    queueName: "system",
    jobName: "report",
    jobData: {
      task: "report",
      params: {
        reportType: "weekly",
        dateRange: {
          start: "7 days ago",
          end: "now",
        },
        recipients: ["admin@example.com"],
      },
    } satisfies SystemJobData as Record<string, unknown>,
    priority: 3,
    maxRetries: 2,
    timeoutSeconds: 600, // 10分钟
  },
  {
    name: "monthly-maintenance",
    description: "每月系统维护任务 - 每月1号凌晨4点执行",
    cronExpression: "0 4 1 * *", // 每月1号凌晨4点
    queueName: "system",
    jobName: "maintenance",
    jobData: {
      task: "maintenance",
      params: {
        maintenanceTypes: ["database_optimize", "index_rebuild", "cache_refresh"],
        downtime: false,
      },
    } satisfies SystemJobData as Record<string, unknown>,
    priority: 1,
    maxRetries: 1,
    timeoutSeconds: 3600, // 1小时
  },
  {
    name: "user-data-cleanup",
    description: "用户数据清理任务 - 每6小时执行一次",
    cronExpression: "0 */6 * * *", // 每6小时
    queueName: "user",
    jobName: "cleanup",
    jobData: {
      userId: "system",
      action: "cleanup",
      data: {
        retentionDays: 90,
        dataTypes: ["temp_uploads", "expired_sessions"],
      },
    } satisfies UserJobData as Record<string, unknown>,
    priority: 4,
    maxRetries: 3,
    timeoutSeconds: 300, // 5分钟
  },
  {
    name: "daily-status-email",
    description: "每日系统状态邮件 - 每天上午9点发送",
    cronExpression: "0 9 * * *", // 每天9点
    queueName: "email",
    jobName: "system",
    jobData: {
      to: "admin@example.com",
      subject: "系统日常状态报告",
      content: "系统运行正常",
      template: "system-status",
      variables: {
        date: new Date().toISOString().split("T")[0],
      },
    } satisfies EmailJobData as Record<string, unknown>,
    priority: 5,
    maxRetries: 2,
    timeoutSeconds: 120, // 2分钟
  },
  {
    name: "temp-files-cleanup",
    description: "临时文件清理任务 - 每30分钟执行一次",
    intervalMs: 30 * 60 * 1000, // 30分钟
    queueName: "file",
    jobName: "delete",
    jobData: {
      filePath: "/tmp/*",
      operation: "delete",
      options: {
        permanent: true,
        pattern: "*.tmp",
        olderThan: 3600000, // 1小时前的文件
      },
    } satisfies FileJobData as Record<string, unknown>,
    priority: 6,
    maxRetries: 2,
    timeoutSeconds: 180, // 3分钟
  },
];

/**
 * 获取队列实例的映射
 */
const queueMap: Record<string, Queue> = {
  email: emailQueue,
  file: fileQueue,
  user: userQueue,
  system: systemQueue,
};

/**
 * 同步系统任务到数据库
 * 如果任务不存在则创建，如果存在则更新配置（保持用户自定义的状态）
 */
export async function syncSystemTasksToDatabase(): Promise<void> {
  logger.info("[系统同步]: 开始同步系统任务到数据库");

  try {
    let createdCount = 0;
    let updatedCount = 0;
    const registeredTasks: Array<{ name: string; queue: string; job: string }> = [];

    for (const taskDef of SYSTEM_TASKS) {
      // 检查任务是否已存在
      const existingTask = await db.query.systemScheduledJob.findFirst({
        where: eq(systemScheduledJob.name, taskDef.name),
      });

      const taskData = {
        name: taskDef.name,
        description: taskDef.description,
        cronExpression: taskDef.cronExpression || null,
        intervalMs: taskDef.intervalMs || null,
        taskType: "SYSTEM" as const,
        queueName: taskDef.queueName,
        jobName: taskDef.jobName,
        jobData: taskDef.jobData,
        isDeletable: 0, // 系统任务不可删除
        priority: taskDef.priority || 5,
        maxRetries: taskDef.maxRetries || 3,
        timeoutSeconds: taskDef.timeoutSeconds || 300,
      };

      if (!existingTask) {
        // 创建新的系统任务
        const [created] = await db.insert(systemScheduledJob).values({
          ...taskData,
          status: Status.ENABLED, // 新系统任务默认启用
          createdBy: "system",
          updatedBy: "system",
        }).returning();

        createdCount++;

        // 注册到 BullMQ
        await registerTaskToBullMQ(created);
        registeredTasks.push({ name: created.name, queue: created.queueName, job: created.jobName });
      }
      else {
        // 更新现有任务的配置（保持用户设置的状态）
        const [updated] = await db
          .update(systemScheduledJob)
          .set({
            ...taskData,
            // 保持现有的状态，用户可能已经手动禁用了某些系统任务
            status: existingTask.status,
            updatedBy: "system",
          })
          .where(eq(systemScheduledJob.id, existingTask.id))
          .returning();

        updatedCount++;

        // 如果任务是启用状态，重新注册到 BullMQ
        if (updated.status === Status.ENABLED) {
          await registerTaskToBullMQ(updated);
          registeredTasks.push({ name: updated.name, queue: updated.queueName, job: updated.jobName });
        }
      }
    }

    // 输出汇总信息
    logger.info(`[系统同步]: 系统任务同步完成 - 总计 ${SYSTEM_TASKS.length} 个任务，新建 ${createdCount} 个，更新 ${updatedCount} 个`);

    if (registeredTasks.length > 0) {
      const taskMapping = registeredTasks.reduce((acc, task) => {
        acc[task.name] = `${task.queue}/${task.job}`;
        return acc;
      }, {} as Record<string, string>);

      logger.info(taskMapping, `[系统同步]: BullMQ任务注册完成 - ${registeredTasks.length} 个任务`);
    }
  }
  catch (error) {
    logger.error(`[系统同步]: 系统任务同步失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 将任务注册到 BullMQ 调度器
 */
async function registerTaskToBullMQ(task: typeof systemScheduledJob.$inferSelect): Promise<void> {
  try {
    const queue = queueMap[task.queueName];
    if (!queue) {
      logger.error(`[系统同步]: 找不到队列 ${task.queueName}`);
      return;
    }

    // 构建调度配置 - 直接作为 RepeatableJobOptions
    const repeatableOptions: any = {};

    // 确保至少有一个调度选项
    if (task.cronExpression && task.cronExpression.trim()) {
      repeatableOptions.pattern = task.cronExpression;
    }
    else if (task.intervalMs && task.intervalMs > 0) {
      repeatableOptions.every = task.intervalMs;
    }
    else {
      logger.error(`[系统同步]: 任务 ${task.name} 缺少有效的调度配置`);
      return;
    }

    // 任务模板配置
    const jobTemplate = {
      name: task.jobName,
      data: {
        ...task.jobData,
        // 添加元数据
        _scheduledJobId: task.id,
        _taskType: "SYSTEM",
        _maxRetries: task.maxRetries ?? 3,
        _timeout: (task.timeoutSeconds ?? 300) * 1000,
      },
      opts: {
        priority: task.priority ?? 5,
        attempts: (task.maxRetries ?? 3) + 1, // BullMQ 的 attempts 包含首次执行
        backoff: {
          type: "exponential" as const,
          delay: 2000,
        },
        removeOnComplete: 10, // 保留最近10个成功任务
        removeOnFail: 20, // 保留最近20个失败任务
      },
    };

    // 注册定时任务 - 使用正确的API签名
    await queue.upsertJobScheduler(
      task.name, // 使用任务名作为 scheduler ID，确保唯一性
      repeatableOptions,
      jobTemplate,
    );
  }
  catch (error) {
    logger.error(`[系统同步]: 注册BullMQ任务失败 ${task.name} - ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 移除所有已注册的系统任务（用于应用关闭时清理）
 */
export async function removeAllSystemTasksFromBullMQ(): Promise<void> {
  logger.info("[系统同步]: 清理所有系统任务的BullMQ调度");

  try {
    for (const taskDef of SYSTEM_TASKS) {
      const queue = queueMap[taskDef.queueName];
      if (queue) {
        try {
          // 移除重复任务调度
          await queue.removeRepeatable(taskDef.name, {
            pattern: taskDef.cronExpression,
            every: taskDef.intervalMs,
          });
          logger.info(`[系统同步]: 移除BullMQ任务 ${taskDef.name}`);
        }
        catch (error) {
          // 忽略不存在的任务
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("not found")) {
            logger.error(`[系统同步]: 移除BullMQ任务失败 ${taskDef.name} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }

    logger.info("[系统同步]: BullMQ系统任务清理完成");
  }
  catch (error) {
    logger.error(`[系统同步]: BullMQ系统任务清理失败 - ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 获取所有系统任务的运行状态
 */
export async function getSystemTasksStatus(): Promise<Array<{
  name: string;
  description: string;
  status: "enabled" | "disabled";
  taskType: "SYSTEM";
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
}>> {
  try {
    const tasks = await db.query.systemScheduledJob.findMany({
      where: eq(systemScheduledJob.taskType, "SYSTEM"),
      columns: {
        name: true,
        description: true,
        status: true,
        taskType: true,
        nextRunAt: true,
        lastRunAt: true,
        lastRunStatus: true,
        totalRuns: true,
        successRuns: true,
        failedRuns: true,
      },
    });

    return tasks.map(task => ({
      name: task.name,
      description: task.description ?? "",
      status: task.status === Status.ENABLED ? "enabled" as const : "disabled" as const,
      taskType: "SYSTEM" as const,
      nextRunAt: task.nextRunAt ?? undefined,
      lastRunAt: task.lastRunAt ?? undefined,
      lastRunStatus: task.lastRunStatus ?? undefined,
      totalRuns: task.totalRuns ?? 0,
      successRuns: task.successRuns ?? 0,
      failedRuns: task.failedRuns ?? 0,
    }));
  }
  catch (error) {
    logger.error(`[系统同步]: 获取系统任务状态失败 - ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * 记录任务执行日志
 * 当系统任务开始执行时调用
 */
export async function logTaskExecution(
  scheduledJobId: string,
  bullJobId: string,
  status: "pending" | "running" | "success" | "failed" | "timeout",
  data?: {
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    resultData?: Record<string, unknown>;
    errorMessage?: string;
    errorStack?: string;
    progress?: number;
    progressDescription?: string;
  },
): Promise<string> {
  try {
    // 获取任务信息
    const task = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, scheduledJobId),
      columns: {
        name: true,
        queueName: true,
        maxRetries: true,
      },
    });

    if (!task) {
      throw new Error(`找不到定时任务: ${scheduledJobId}`);
    }

    // 查找现有日志记录
    const existingLog = await db.query.systemJobExecutionLog.findFirst({
      where: eq(systemJobExecutionLog.bullJobId, bullJobId),
    });

    const logData = {
      scheduledJobId,
      jobName: task.name,
      queueName: task.queueName,
      bullJobId,
      status,
      maxRetries: task.maxRetries,
      executionNode: env.NODE_ENV || "development",
      ...data,
    };

    if (existingLog) {
      // 更新现有日志
      const [updated] = await db
        .update(systemJobExecutionLog)
        .set(logData)
        .where(eq(systemJobExecutionLog.id, existingLog.id))
        .returning();

      return updated.id;
    }
    else {
      // 创建新日志
      const [created] = await db
        .insert(systemJobExecutionLog)
        .values({
          ...logData,
          createdBy: "system",
          updatedBy: "system",
        })
        .returning();

      return created.id;
    }
  }
  catch (error) {
    logger.error(`[系统同步]: 记录任务执行日志失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 更新任务统计信息
 * 当任务执行完成时调用
 */
export async function updateTaskStatistics(
  scheduledJobId: string,
  success: boolean,
  executionTime?: string,
): Promise<void> {
  try {
    const task = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, scheduledJobId),
    });

    if (!task) {
      return;
    }

    const updateData: any = {
      totalRuns: (task.totalRuns ?? 0) + 1,
      lastRunAt: executionTime || formatDate(new Date()),
      lastRunStatus: success ? "success" : "failed",
      updatedBy: "system",
    };

    if (success) {
      updateData.successRuns = (task.successRuns ?? 0) + 1;
    }
    else {
      updateData.failedRuns = (task.failedRuns ?? 0) + 1;
    }

    await db
      .update(systemScheduledJob)
      .set(updateData)
      .where(eq(systemScheduledJob.id, scheduledJobId));
  }
  catch (error) {
    logger.error(`[系统同步]: 更新任务统计信息失败 - ${error instanceof Error ? error.message : String(error)}`);
  }
}
