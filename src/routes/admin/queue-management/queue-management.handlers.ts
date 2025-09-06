/**
 * 队列管理 - 业务逻辑处理器
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import db from "@/db";
import { systemJobExecutionLog, systemScheduledJob } from "@/db/schema/system";
import {
  getAllQueuesInfo,
  getJobInfo,
  getQueueHealth,
  getQueueInfo,
  getQueueJobs as getQueueJobsService,
  pauseQueue as pauseQueueService,
  promoteJob as promoteJobService,
  removeJob as removeJobService,
  resumeQueue as resumeQueueService,
  retryJob as retryJobService,
} from "@/jobs/manager";
import { emailQueue, fileQueue, systemQueue, userQueue } from "@/jobs/queues";
import { Status } from "@/lib/enums/common";
import logger from "@/lib/logger";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { logTaskExecution } from "@/services/system-task-sync";
import { formatDate } from "@/utils/tools/formatter";
import { Resp } from "@/utils/zod/response";

import type { QueueManagementRouteHandlerType } from "./queue-management.index";

export const getQueues: QueueManagementRouteHandlerType<"getQueues"> = async (c) => {
  try {
    const queues = await getAllQueuesInfo();
    return c.json(Resp.ok(queues), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取队列列表失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取队列列表失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueue: QueueManagementRouteHandlerType<"getQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const queue = await getQueueInfo(name);

    if (!queue) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(queue), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取队列详情失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取队列详情失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueueJobs: QueueManagementRouteHandlerType<"getQueueJobs"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const { status, start, limit } = c.req.valid("query");

    const jobs = await getQueueJobsService(name, status, start, limit);
    return c.json(Resp.ok(jobs), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取任务列表失败 - ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.message.includes("队列不存在")) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }
    return c.json(Resp.fail("获取任务列表失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getQueueStats: QueueManagementRouteHandlerType<"getQueueStats"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const queue = await getQueueInfo(name);

    if (!queue) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(queue.stats), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取队列统计失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取队列统计失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const pauseQueue: QueueManagementRouteHandlerType<"pauseQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const success = await pauseQueueService(name);

    if (!success) {
      return c.json(Resp.fail("队列不存在或暂停失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 暂停队列失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("暂停队列失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const resumeQueue: QueueManagementRouteHandlerType<"resumeQueue"> = async (c) => {
  try {
    const { name } = c.req.valid("param");
    const success = await resumeQueueService(name);

    if (!success) {
      return c.json(Resp.fail("队列不存在或恢复失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 恢复队列失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("恢复队列失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getJob: QueueManagementRouteHandlerType<"getJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const job = await getJobInfo(id);

    if (!job) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok(job), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取任务详情失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取任务详情失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const retryJob: QueueManagementRouteHandlerType<"retryJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await retryJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或重试失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 重试任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("重试任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const removeJob: QueueManagementRouteHandlerType<"removeJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await removeJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或删除失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 删除任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("删除任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const promoteJob: QueueManagementRouteHandlerType<"promoteJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const success = await promoteJobService(id);

    if (!success) {
      return c.json(Resp.fail("任务不存在或提升失败"), HttpStatusCodes.NOT_FOUND);
    }

    return c.json(Resp.ok({ success }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 提升任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("提升任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getHealth: QueueManagementRouteHandlerType<"getHealth"> = async (c) => {
  try {
    const health = await getQueueHealth();
    return c.json(Resp.ok(health), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[队列管理]: 获取健康状态失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取健康状态失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ==================== 定时任务管理处理器 ====================

/**
 * 队列映射表
 */
const queueMap = {
  email: emailQueue,
  file: fileQueue,
  user: userQueue,
  system: systemQueue,
};

export const getScheduledJobs: QueueManagementRouteHandlerType<"getScheduledJobs"> = async (c) => {
  try {
    const { taskType, status, queueName, page, limit } = c.req.valid("query");

    // 构建查询条件
    const conditions = [];
    if (taskType) {
      conditions.push(eq(systemScheduledJob.taskType, taskType));
    }
    if (status) {
      conditions.push(eq(systemScheduledJob.status, Number(status)));
    }
    if (queueName) {
      conditions.push(eq(systemScheduledJob.queueName, queueName));
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 查询总数
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(systemScheduledJob)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 查询数据
    const tasks = await db.query.systemScheduledJob.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(systemScheduledJob.createdAt)],
      limit,
      offset,
    });

    // 设置分页标头
    c.header("x-total-count", count.toString());
    c.header("x-page", page.toString());
    c.header("x-per-page", limit.toString());

    return c.json(Resp.ok(tasks), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[定时任务]: 获取定时任务列表失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取定时任务列表失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createScheduledJob: QueueManagementRouteHandlerType<"createScheduledJob"> = async (c) => {
  try {
    const body = c.req.valid("json");
    const { sub } = c.get("jwtPayload");

    // 检查任务名称是否已存在
    const existing = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.name, body.name),
    });

    if (existing) {
      return c.json(Resp.fail("任务名称已存在"), HttpStatusCodes.CONFLICT);
    }

    // 验证队列名称是否有效
    if (!queueMap[body.queueName as keyof typeof queueMap]) {
      return c.json(Resp.fail("无效的队列名称"), HttpStatusCodes.BAD_REQUEST);
    }

    // 验证CRON表达式和间隔时间二选一
    if (!body.cronExpression && !body.intervalMs) {
      return c.json(Resp.fail("必须指定CRON表达式或间隔时间"), HttpStatusCodes.BAD_REQUEST);
    }

    if (body.cronExpression && body.intervalMs) {
      return c.json(Resp.fail("CRON表达式和间隔时间只能指定一个"), HttpStatusCodes.BAD_REQUEST);
    }

    // 创建定时任务
    const [created] = await db.insert(systemScheduledJob).values({
      ...body,
      taskType: "BUSINESS", // 用户创建的任务为业务任务
      status: Status.ENABLED,
      isDeletable: 1, // 用户创建的任务可删除
      createdBy: sub,
      updatedBy: sub,
    }).returning();

    // 注册到BullMQ
    await registerTaskToBullMQ(created);

    return c.json(Resp.ok(created), HttpStatusCodes.CREATED);
  }
  catch (error) {
    logger.error(`[定时任务]: 创建定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("创建定时任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateScheduledJob: QueueManagementRouteHandlerType<"updateScheduledJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { sub } = c.get("jwtPayload");

    // 检查任务是否存在
    const existing = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, id),
    });

    if (!existing) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 系统任务的限制检查
    if (existing.taskType === "SYSTEM") {
      // 系统任务不能修改某些关键字段
      const restrictedFields = ["name", "taskType", "queueName", "jobName"];
      const hasRestrictedChanges = restrictedFields.some(field =>
        body[field as keyof typeof body] !== undefined
        && body[field as keyof typeof body] !== existing[field as keyof typeof existing],
      );

      if (hasRestrictedChanges) {
        return c.json(Resp.fail("系统任务的关键字段不允许修改"), HttpStatusCodes.FORBIDDEN);
      }
    }

    // 如果修改了名称，检查重复
    if (body.name && body.name !== existing.name) {
      const duplicate = await db.query.systemScheduledJob.findFirst({
        where: and(
          eq(systemScheduledJob.name, body.name),
          sql`${systemScheduledJob.id} != ${id}`,
        ),
      });

      if (duplicate) {
        return c.json(Resp.fail("任务名称已存在"), HttpStatusCodes.BAD_REQUEST);
      }
    }

    // 验证CRON表达式和间隔时间
    if (body.cronExpression !== undefined && body.intervalMs !== undefined) {
      if (body.cronExpression && body.intervalMs) {
        return c.json(Resp.fail("CRON表达式和间隔时间只能指定一个"), HttpStatusCodes.BAD_REQUEST);
      }
    }

    // 更新任务
    const [updated] = await db
      .update(systemScheduledJob)
      .set({
        ...body,
        updatedBy: sub,
      })
      .where(eq(systemScheduledJob.id, id))
      .returning();

    // 重新注册到BullMQ（如果任务是启用状态）
    if (updated.status === Status.ENABLED) {
      await registerTaskToBullMQ(updated);
    }
    else {
      // 如果是禁用状态，移除BullMQ调度
      await unregisterTaskFromBullMQ(updated);
    }

    return c.json(Resp.ok(updated), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[定时任务]: 更新定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("更新定时任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const toggleScheduledJob: QueueManagementRouteHandlerType<"toggleScheduledJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const { sub } = c.get("jwtPayload");

    // 检查任务是否存在
    const existing = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, id),
    });

    if (!existing) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 切换状态
    const newStatus = existing.status === Status.ENABLED ? Status.DISABLED : Status.ENABLED;

    const [updated] = await db
      .update(systemScheduledJob)
      .set({
        status: newStatus,
        updatedBy: sub,
      })
      .where(eq(systemScheduledJob.id, id))
      .returning();

    // 根据新状态注册或取消注册BullMQ
    if (newStatus === Status.ENABLED) {
      await registerTaskToBullMQ(updated);
    }
    else {
      await unregisterTaskFromBullMQ(updated);
    }

    const statusText = newStatus === Status.ENABLED ? "启用" : "禁用";

    return c.json(Resp.ok({
      id: updated.id,
      status: updated.status,
      message: `任务已${statusText}`,
    }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[定时任务]: 切换任务状态失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("切换任务状态失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const executeScheduledJob: QueueManagementRouteHandlerType<"executeScheduledJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const { sub } = c.get("jwtPayload");

    // 检查任务是否存在且启用
    const task = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, id),
    });

    if (!task) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    if (task.status !== Status.ENABLED) {
      return c.json(Resp.fail("任务未启用，不允许手动执行"), HttpStatusCodes.BAD_REQUEST);
    }

    // 获取队列
    const queue = queueMap[task.queueName as keyof typeof queueMap];
    if (!queue) {
      return c.json(Resp.fail("队列不存在"), HttpStatusCodes.BAD_REQUEST);
    }

    // 立即添加任务到队列
    const job = await queue.add(
      task.jobName,
      {
        ...task.jobData,
        _scheduledJobId: task.id,
        _taskType: task.taskType,
        _maxRetries: task.maxRetries ?? 3,
        _timeout: (task.timeoutSeconds ?? 300) * 1000,
        _manualTrigger: true,
        _triggeredBy: sub,
      } as any,
      {
        priority: task.priority ?? 5,
        attempts: (task.maxRetries ?? 3) + 1,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    // 记录执行日志
    await logTaskExecution(task.id, job.id!, "pending", {
      startedAt: formatDate(new Date()),
    });

    return c.json(Resp.ok({
      id: task.id,
      jobId: job.id!,
      message: "任务已提交执行",
    }), HttpStatusCodes.ACCEPTED);
  }
  catch (error) {
    logger.error(`[定时任务]: 手动执行任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("手动执行任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getScheduledJobLogs: QueueManagementRouteHandlerType<"getScheduledJobLogs"> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const { status, startDate, endDate, page, limit } = c.req.valid("query");

    // 检查任务是否存在
    const task = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, id),
      columns: { id: true, name: true },
    });

    if (!task) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 构建查询条件
    const conditions = [eq(systemJobExecutionLog.scheduledJobId, id)];

    if (status) {
      conditions.push(eq(systemJobExecutionLog.status, status));
    }
    if (startDate) {
      conditions.push(gte(systemJobExecutionLog.startedAt, `${startDate} 00:00:00`));
    }
    if (endDate) {
      conditions.push(lte(systemJobExecutionLog.startedAt, `${endDate} 23:59:59`));
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 查询总数
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(systemJobExecutionLog)
      .where(and(...conditions));

    // 查询日志数据
    const logs = await db.query.systemJobExecutionLog.findMany({
      where: and(...conditions),
      orderBy: [desc(systemJobExecutionLog.startedAt)],
      limit,
      offset,
    });

    // 设置分页标头
    c.header("x-total-count", count.toString());
    c.header("x-page", page.toString());
    c.header("x-per-page", limit.toString());

    return c.json(Resp.ok(logs), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[定时任务]: 获取任务执行历史失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("获取任务执行历史失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteScheduledJob: QueueManagementRouteHandlerType<"deleteScheduledJob"> = async (c) => {
  try {
    const { id } = c.req.valid("param");

    // 检查任务是否存在
    const task = await db.query.systemScheduledJob.findFirst({
      where: eq(systemScheduledJob.id, id),
    });

    if (!task) {
      return c.json(Resp.fail("任务不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 检查是否允许删除
    if (task.isDeletable === 0) {
      return c.json(Resp.fail("系统任务不允许删除"), HttpStatusCodes.FORBIDDEN);
    }

    // 先从BullMQ移除调度
    await unregisterTaskFromBullMQ(task);

    // 删除任务
    await db.delete(systemScheduledJob).where(eq(systemScheduledJob.id, id));

    return c.json(Resp.ok({
      id: task.id,
      message: "任务删除成功",
    }), HttpStatusCodes.OK);
  }
  catch (error) {
    logger.error(`[定时任务]: 删除定时任务失败 - ${error instanceof Error ? error.message : String(error)}`);
    return c.json(Resp.fail("删除定时任务失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ==================== 辅助函数 ====================

/**
 * 将任务注册到BullMQ调度器
 */
async function registerTaskToBullMQ(task: typeof systemScheduledJob.$inferSelect): Promise<void> {
  try {
    const queue = queueMap[task.queueName as keyof typeof queueMap];
    if (!queue) {
      logger.error(`[系统同步]: 队列不存在 ${task.queueName}`);
      return;
    }

    // 构建调度配置
    const scheduleOptions: any = {
      jobId: task.name,
    };

    if (task.cronExpression) {
      scheduleOptions.repeat = {
        pattern: task.cronExpression,
      };
    }
    else if (task.intervalMs) {
      scheduleOptions.repeat = {
        every: task.intervalMs,
      };
    }

    // 任务执行选项
    const jobOptions = {
      priority: task.priority ?? 5,
      attempts: (task.maxRetries ?? 3) + 1,
      backoff: {
        type: "exponential" as const,
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 20,
    };

    // 注册定时任务
    await queue.upsertJobScheduler(
      task.name,
      scheduleOptions,
      {
        name: task.jobName,
        data: {
          ...task.jobData,
          _scheduledJobId: task.id,
          _taskType: task.taskType,
          _maxRetries: task.maxRetries ?? 3,
          _timeout: (task.timeoutSeconds ?? 300) * 1000,
        } as any,
        opts: jobOptions,
      },
    );

    logger.info(`[系统同步]: BullMQ任务注册成功 - ${task.name}`);
  }
  catch (error) {
    logger.error(`[系统同步]: 注册BullMQ任务失败 ${task.name} - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 从BullMQ移除任务调度
 */
async function unregisterTaskFromBullMQ(task: typeof systemScheduledJob.$inferSelect): Promise<void> {
  try {
    const queue = queueMap[task.queueName as keyof typeof queueMap];
    if (!queue) {
      logger.error(`[系统同步]: 队列不存在 ${task.queueName}`);
      return;
    }

    // 移除重复任务调度
    await queue.removeJobScheduler(task.name);

    logger.info(`[系统同步]: BullMQ任务移除成功 - ${task.name}`);
  }
  catch (error) {
    // 忽略不存在的任务错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("not found")) {
      logger.error(`[系统同步]: 移除BullMQ任务失败 ${task.name} - ${errorMessage}`);
    }
  }
}
