import type { InferSelectModel } from "drizzle-orm";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import type { ScheduledJobConfig } from "@/jobs/types";
import type { PaginationParams } from "@/lib/pagination";

import db from "@/db";
import { systemJobHandlers, systemScheduledJobs } from "@/db/schema";
import { getJobMonitor } from "@/jobs/monitoring";
import { getAvailableHandlerNames, validateHandlerName } from "@/jobs/registry";
import { getScheduler } from "@/jobs/scheduler";
import { JobStatus } from "@/lib/enums";
import { logger } from "@/lib/logger";
import { formatDate } from "@/utils/tools/formatter";

// 类型定义
type ScheduledJob = InferSelectModel<typeof systemScheduledJobs>;

/** 创建定时任务参数 */
interface CreateScheduledJobParams {
  domain: string;
  name: string;
  description?: string;
  handlerName: string;
  cronExpression: string;
  timezone?: string;
  status?: number;
  payload?: Record<string, unknown>;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  priority?: number;
  createdBy: string;
}

/** 更新定时任务参数 */
interface UpdateScheduledJobParams {
  name?: string;
  description?: string;
  handlerName?: string;
  cronExpression?: string;
  timezone?: string;
  status?: number;
  payload?: Record<string, unknown>;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  priority?: number;
  updatedBy: string;
}

/** 定时任务查询参数 */
interface QueryScheduledJobsParams extends PaginationParams {
  domain: string;
  search?: string;
  status?: number;
  handlerName?: string;
}

/** 创建定时任务 */
export async function createScheduledJob(params: CreateScheduledJobParams): Promise<ScheduledJob> {
  const {
    domain,
    name,
    description,
    handlerName,
    cronExpression,
    timezone = "Asia/Shanghai",
    status = 1,
    payload = {},
    retryAttempts = 3,
    retryDelay = 5000,
    timeout = 300000,
    priority = 0,
    createdBy,
  } = params;

  // 验证处理器名称
  const handlerValidation = validateHandlerName(handlerName);
  if (!handlerValidation.isValid) {
    throw new Error(handlerValidation.error);
  }

  // 验证 Cron 表达式格式（简单验证）
  if (!isValidCronExpression(cronExpression)) {
    throw new Error("无效的 Cron 表达式格式");
  }

  return db.transaction(async (tx) => {
    // 检查同一域下任务名称是否重复
    const existingJob = await tx
      .select({ id: systemScheduledJobs.id })
      .from(systemScheduledJobs)
      .where(and(
        eq(systemScheduledJobs.domain, domain),
        eq(systemScheduledJobs.name, name),
      ));

    if (existingJob.length > 0) {
      throw new Error("任务名称已存在");
    }

    // 创建任务记录
    const [newJob] = await tx
      .insert(systemScheduledJobs)
      .values({
        domain,
        name,
        description,
        handlerName,
        cronExpression,
        timezone,
        status,
        payload,
        retryAttempts,
        retryDelay,
        timeout,
        priority,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    // 如果任务是启用状态，立即添加到调度器
    if (status === JobStatus.ENABLED) {
      try {
        const scheduler = getScheduler();
        const jobConfig = convertToJobConfig(newJob);
        await scheduler.startJob(jobConfig);

        logger.info("新建定时任务已添加到调度器", {
          jobId: newJob.id,
          name: newJob.name,
          domain,
        });
      }
      catch (error) {
        logger.error("添加新建任务到调度器失败", {
          jobId: newJob.id,
          error,
        });
        // 不抛出错误，避免影响任务创建
      }
    }

    return newJob;
  });
}

/** 更新定时任务 */
export async function updateScheduledJob(
  jobId: string,
  domain: string,
  params: UpdateScheduledJobParams,
): Promise<ScheduledJob> {
  const { updatedBy, ...updateData } = params;

  // 验证处理器名称（如果有更新）
  if (updateData.handlerName) {
    const handlerValidation = validateHandlerName(updateData.handlerName);
    if (!handlerValidation.isValid) {
      throw new Error(handlerValidation.error);
    }
  }

  // 验证 Cron 表达式格式（如果有更新）
  if (updateData.cronExpression && !isValidCronExpression(updateData.cronExpression)) {
    throw new Error("无效的 Cron 表达式格式");
  }

  return db.transaction(async (tx) => {
    // 检查任务是否存在
    const [existingJob] = await tx
      .select()
      .from(systemScheduledJobs)
      .where(and(
        eq(systemScheduledJobs.id, jobId),
        eq(systemScheduledJobs.domain, domain),
      ));

    if (!existingJob) {
      throw new Error("任务不存在");
    }

    // 检查名称重复（如果有更新名称）
    if (updateData.name && updateData.name !== existingJob.name) {
      const duplicateJob = await tx
        .select({ id: systemScheduledJobs.id })
        .from(systemScheduledJobs)
        .where(and(
          eq(systemScheduledJobs.domain, domain),
          eq(systemScheduledJobs.name, updateData.name),
        ));

      if (duplicateJob.length > 0) {
        throw new Error("任务名称已存在");
      }
    }

    // 更新任务记录
    const [updatedJob] = await tx
      .update(systemScheduledJobs)
      .set({
        ...updateData,
        updatedAt: formatDate(new Date()),
        updatedBy,
      })
      .where(and(
        eq(systemScheduledJobs.id, jobId),
        eq(systemScheduledJobs.domain, domain),
      ))
      .returning();

    // 重启调度器中的任务以应用更改
    try {
      const scheduler = getScheduler();
      await scheduler.restartJob(jobId, domain);

      logger.info("定时任务更新后已重启", {
        jobId,
        domain,
      });
    }
    catch (error) {
      logger.error("重启更新的任务失败", {
        jobId,
        error,
      });
      // 不抛出错误，避免影响任务更新
    }

    return updatedJob;
  });
}

/** 删除定时任务 */
export async function deleteScheduledJob(jobId: string, domain: string): Promise<void> {
  return db.transaction(async (tx) => {
    // 检查任务是否存在
    const [existingJob] = await tx
      .select()
      .from(systemScheduledJobs)
      .where(and(
        eq(systemScheduledJobs.id, jobId),
        eq(systemScheduledJobs.domain, domain),
      ));

    if (!existingJob) {
      throw new Error("任务不存在");
    }

    // 从调度器中移除任务
    try {
      const scheduler = getScheduler();
      await scheduler.stopJob(jobId);

      logger.info("定时任务已从调度器移除", { jobId, domain });
    }
    catch (error) {
      logger.error("从调度器移除任务失败", {
        jobId,
        error,
      });
      // 继续执行删除操作
    }

    // 删除任务记录
    await tx
      .delete(systemScheduledJobs)
      .where(and(
        eq(systemScheduledJobs.id, jobId),
        eq(systemScheduledJobs.domain, domain),
      ));

    logger.info("定时任务删除成功", { jobId, domain });
  });
}

/** 获取定时任务列表 */
export async function getScheduledJobs(params: QueryScheduledJobsParams): Promise<ScheduledJob[]> {
  const { domain, search, status, handlerName, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const whereConditions = [eq(systemScheduledJobs.domain, domain)];

  if (search) {
    whereConditions.push(
      or(
        ilike(systemScheduledJobs.name, `%${search}%`),
        ilike(systemScheduledJobs.description, `%${search}%`),
      )!,
    );
  }

  if (status != null) {
    whereConditions.push(eq(systemScheduledJobs.status, status));
  }

  if (handlerName) {
    whereConditions.push(eq(systemScheduledJobs.handlerName, handlerName));
  }

  const jobs = await db
    .select()
    .from(systemScheduledJobs)
    .where(and(...whereConditions))
    .orderBy(desc(systemScheduledJobs.createdAt))
    .limit(limit)
    .offset(offset);

  return jobs;
}

/** 获取单个定时任务详情 */
export async function getScheduledJobById(jobId: string, domain: string): Promise<ScheduledJob> {
  const [job] = await db
    .select()
    .from(systemScheduledJobs)
    .where(and(
      eq(systemScheduledJobs.id, jobId),
      eq(systemScheduledJobs.domain, domain),
    ));

  if (!job) {
    throw new Error("任务不存在");
  }

  return job;
}

/** 切换任务状态 */
export async function toggleJobStatus(
  jobId: string,
  domain: string,
  newStatus: number,
  updatedBy: string,
): Promise<ScheduledJob> {
  return db.transaction(async (tx) => {
    // 更新任务状态
    const [updatedJob] = await tx
      .update(systemScheduledJobs)
      .set({
        status: newStatus,
        updatedAt: formatDate(new Date()),
        updatedBy,
      })
      .where(and(
        eq(systemScheduledJobs.id, jobId),
        eq(systemScheduledJobs.domain, domain),
      ))
      .returning();

    if (!updatedJob) {
      throw new Error("任务不存在");
    }

    // 根据新状态启动或停止任务
    try {
      const scheduler = getScheduler();
      if (newStatus === JobStatus.ENABLED) {
        // 启用任务
        const jobConfig = convertToJobConfig(updatedJob);
        await scheduler.startJob(jobConfig);
      }
      else {
        // 禁用任务
        await scheduler.stopJob(jobId);
      }

      logger.info("任务状态切换成功", {
        jobId,
        domain,
        newStatus,
      });
    }
    catch (error) {
      logger.error("切换任务状态时调度器操作失败", {
        jobId,
        newStatus,
        error,
      });
      // 不抛出错误，状态已更新到数据库
    }

    return updatedJob;
  });
}

/** 立即执行任务 */
export async function executeJobNow(jobId: string, domain: string): Promise<void> {
  const scheduler = getScheduler();
  await scheduler.executeJobNow(jobId, domain);

  logger.info("任务立即执行请求已提交", { jobId, domain });
}

/** 清理所有重复任务 */
export async function clearAllRepeatableJobs(): Promise<void> {
  const scheduler = getScheduler();
  await scheduler.clearAllRepeatableJobs();
}

/** 获取所有重复任务 */
export async function getRepeatableJobs() {
  const scheduler = getScheduler();
  return await scheduler.getRepeatableJobs();
}

/** 获取任务执行历史 */
export async function getJobExecutionHistory(
  jobId: string,
  domain: string,
  options: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  // 验证任务存在性和域权限
  await getScheduledJobById(jobId, domain);

  const monitor = getJobMonitor();
  const { page = 1, limit = 50, ...filterOptions } = options;
  const offset = (page - 1) * limit;

  return monitor.getJobExecutionHistory(jobId, {
    limit,
    offset,
    ...filterOptions,
  });
}

/** 获取任务执行统计 */
export async function getJobExecutionStats(
  jobId: string,
  domain: string,
  days: number = 30,
) {
  // 验证任务存在性和域权限
  await getScheduledJobById(jobId, domain);

  const monitor = getJobMonitor();
  return monitor.getJobExecutionStats(jobId, days);
}

/** 获取可用的任务处理器列表 */
export async function getAvailableHandlers(_domain: string): Promise<Array<{
  name: string;
  description: string;
  filePath: string;
  isActive: boolean;
}>> {
  // 从注册表获取所有可用处理器
  const availableHandlers = getAvailableHandlerNames();

  // 从数据库获取处理器详细信息
  const handlerDetails = await db
    .select()
    .from(systemJobHandlers)
    .where(eq(systemJobHandlers.isActive, true));

  // 合并信息
  return availableHandlers.map((name) => {
    const details = handlerDetails.find(h => h.name === name);
    return {
      name,
      description: details?.description || `${name} 任务处理器`,
      filePath: details?.filePath || "unknown",
      isActive: details?.isActive ?? true,
    };
  });
}

/** 获取系统任务执行概览 */
export async function getSystemJobOverview(_domain: string, days: number = 7) {
  const monitor = getJobMonitor();
  return monitor.getSystemExecutionOverview(days);
}

/** 清理过期的执行日志 */
export async function cleanupOldExecutionLogs(retentionDays: number = 90): Promise<number> {
  const monitor = getJobMonitor();
  return monitor.cleanupOldLogs(retentionDays);
}

// 工具函数

/** 将数据库记录转换为任务配置 */
function convertToJobConfig(jobRow: ScheduledJob): ScheduledJobConfig {
  return {
    id: jobRow.id,
    name: jobRow.name,
    description: jobRow.description || undefined,
    handlerName: jobRow.handlerName,
    cronExpression: jobRow.cronExpression,
    timezone: jobRow.timezone || "Asia/Shanghai",
    status: jobRow.status,
    payload: jobRow.payload || {},
    retryAttempts: jobRow.retryAttempts || 3,
    retryDelay: jobRow.retryDelay || 5000,
    timeout: jobRow.timeout || 300000,
    priority: jobRow.priority || 0,
    domain: jobRow.domain,
  };
}

/** 验证 Cron 表达式格式 */
function isValidCronExpression(expression: string): boolean {
  // 简化的 Cron 表达式验证，只检查基本格式
  const trimmed = expression.trim();
  const fields = trimmed.split(/\s+/);

  // 支持 5 字段 (分 时 日 月 周) 或 6 字段 (秒 分 时 日 月 周)
  if (fields.length !== 5 && fields.length !== 6) {
    return false;
  }

  // 简单的字段格式验证，允许数字、星号、逗号、斜杠、连字符、问号
  const basicPattern = /^[*\d,/?-]+$/;
  return fields.every(field => basicPattern.test(field));
}
