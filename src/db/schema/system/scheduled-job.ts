import { index, integer, jsonb, pgEnum, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { statusEnum } from "../../common/enums";

/**
 * 任务类型枚举：系统任务和业务任务
 * SYSTEM: 系统级任务（由代码定义，不可删除）
 * BUSINESS: 业务级任务（用户创建，可完全管理）
 */
export const taskTypeEnum = pgEnum("task_type", ["SYSTEM", "BUSINESS"]);

/**
 * 系统定时任务配置表
 * 存储所有定时任务的配置信息
 */
export const systemScheduledJob = pgTable("system_scheduled_job", {
  ...defaultColumns,
  /** 任务名称（唯一标识） */
  name: varchar({ length: 128 }).notNull().unique(),
  /** 任务描述 */
  description: text(),
  /** CRON 表达式 */
  cronExpression: varchar({ length: 64 }),
  /** 间隔时间（毫秒），与 CRON 二选一 */
  intervalMs: integer(),
  /** 任务类型：SYSTEM 或 BUSINESS */
  taskType: taskTypeEnum().default("BUSINESS").notNull(),
  /** 任务状态：1启用 0禁用 */
  status: statusEnum().notNull(),
  /** 队列名称 */
  queueName: varchar({ length: 64 }).notNull(),
  /** 任务处理器名称 */
  jobName: varchar({ length: 128 }).notNull(),
  /** 任务执行参数 */
  jobData: jsonb().$type<Record<string, unknown>>().default({}),
  /** 是否可删除（系统任务为false） */
  isDeletable: integer().default(1).notNull(), // 1可删除 0不可删除
  /** 优先级（1-10，数字越小优先级越高） */
  priority: integer().default(5),
  /** 最大重试次数 */
  maxRetries: integer().default(3),
  /** 超时时间（秒） */
  timeoutSeconds: integer().default(300), // 5分钟默认超时
  /** 下次执行时间（系统计算） */
  nextRunAt: varchar({ length: 32 }),
  /** 上次执行时间 */
  lastRunAt: varchar({ length: 32 }),
  /** 上次执行状态：success, failed, timeout */
  lastRunStatus: varchar({ length: 16 }),
  /** 上次执行错误信息 */
  lastRunError: text(),
  /** 总执行次数 */
  totalRuns: integer().default(0),
  /** 成功执行次数 */
  successRuns: integer().default(0),
  /** 失败执行次数 */
  failedRuns: integer().default(0),
}, table => [
  // 索引优化
  index("system_scheduled_job_name_idx").on(table.name),
  index("system_scheduled_job_task_type_idx").on(table.taskType),
  index("system_scheduled_job_status_idx").on(table.status),
  index("system_scheduled_job_queue_name_idx").on(table.queueName),
  index("system_scheduled_job_next_run_at_idx").on(table.nextRunAt),
]);

// Zod schemas for API validation - 基础 schema 带字段描述（中文注释在此定义一次）
export const selectSystemScheduledJobSchema = createSelectSchema(systemScheduledJob, {
  id: schema => schema.meta({ description: "定时任务ID" }),
  name: schema => schema.meta({ description: "任务名称（唯一标识）" }),
  description: schema => schema.meta({ description: "任务描述" }),
  cronExpression: schema => schema.meta({ description: "CRON表达式" }),
  intervalMs: schema => schema.meta({ description: "间隔时间（毫秒）" }),
  taskType: schema => schema.meta({ description: "任务类型" }),
  status: schema => schema.meta({ description: "任务状态" }),
  queueName: schema => schema.meta({ description: "队列名称" }),
  jobName: schema => schema.meta({ description: "任务处理器名称" }),
  jobData: schema => schema.meta({ description: "任务执行参数" }),
  isDeletable: schema => schema.meta({ description: "是否可删除" }),
  priority: schema => schema.meta({ description: "优先级（1-10）" }),
  maxRetries: schema => schema.meta({ description: "最大重试次数" }),
  timeoutSeconds: schema => schema.meta({ description: "超时时间（秒）" }),
  nextRunAt: schema => schema.meta({ description: "下次执行时间" }),
  lastRunAt: schema => schema.meta({ description: "上次执行时间" }),
  lastRunStatus: schema => schema.meta({ description: "上次执行状态" }),
  lastRunError: schema => schema.meta({ description: "上次执行错误信息" }),
  totalRuns: schema => schema.meta({ description: "总执行次数" }),
  successRuns: schema => schema.meta({ description: "成功执行次数" }),
  failedRuns: schema => schema.meta({ description: "失败执行次数" }),
});

// 插入 schema - 继承自基础 schema 并排除系统字段
export const insertSystemScheduledJobSchema = createInsertSchema(systemScheduledJob).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  nextRunAt: true,
  lastRunAt: true,
  lastRunStatus: true,
  lastRunError: true,
  totalRuns: true,
  successRuns: true,
  failedRuns: true,
});

// 更新 schema - 基于 insert schema 的部分更新版本
export const patchSystemScheduledJobSchema = insertSystemScheduledJobSchema.partial();

// ID参数验证 schema - 基于带描述的 select schema
export const scheduledJobIdSchema = selectSystemScheduledJobSchema.pick({
  id: true,
});
