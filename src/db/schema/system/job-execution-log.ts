import { index, integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { defaultColumns } from "@/db/common/default-columns";

/**
 * 定时任务执行日志表
 * 记录所有定时任务的执行历史和结果
 */
export const systemJobExecutionLog = pgTable("system_job_execution_log", {
  ...defaultColumns,
  /** 关联的定时任务ID */
  scheduledJobId: varchar({ length: 36 }).notNull(),
  /** 任务名称（冗余字段，便于查询） */
  jobName: varchar({ length: 128 }).notNull(),
  /** 队列名称（冗余字段，便于查询） */
  queueName: varchar({ length: 64 }).notNull(),
  /** BullMQ 任务ID */
  bullJobId: varchar({ length: 128 }),
  /** 执行状态：pending, running, success, failed, timeout, cancelled */
  status: varchar({ length: 16 }).notNull().default("pending"),
  /** 执行开始时间 */
  startedAt: varchar({ length: 32 }),
  /** 执行完成时间 */
  completedAt: varchar({ length: 32 }),
  /** 执行耗时（毫秒） */
  durationMs: integer(),
  /** 执行参数 */
  jobData: jsonb().$type<Record<string, unknown>>().default({}),
  /** 执行结果数据 */
  resultData: jsonb().$type<Record<string, unknown>>(),
  /** 错误信息 */
  errorMessage: text(),
  /** 错误堆栈信息 */
  errorStack: text(),
  /** 重试次数 */
  retryCount: integer().default(0),
  /** 最大重试次数 */
  maxRetries: integer().default(0),
  /** 是否为手动触发 */
  isManualTrigger: integer().default(0), // 1手动触发 0自动触发
  /** 触发用户ID（手动触发时记录） */
  triggeredBy: varchar({ length: 36 }),
  /** 执行进度百分比 */
  progress: integer().default(0),
  /** 进度描述 */
  progressDescription: text(),
  /** 执行节点信息（集群环境下识别执行节点） */
  executionNode: varchar({ length: 128 }),
  /** 内存使用峰值（KB） */
  memoryUsageKb: integer(),
  /** CPU 使用时间（毫秒） */
  cpuTimeMs: integer(),
}, table => [
  // 索引优化
  index("system_job_execution_log_scheduled_job_id_idx").on(table.scheduledJobId),
  index("system_job_execution_log_job_name_idx").on(table.jobName),
  index("system_job_execution_log_status_idx").on(table.status),
  index("system_job_execution_log_started_at_idx").on(table.startedAt.desc()),
  index("system_job_execution_log_queue_name_idx").on(table.queueName),
  index("system_job_execution_log_bull_job_id_idx").on(table.bullJobId),
  // 复合索引：按任务和时间查询
  index("system_job_execution_log_job_time_idx").on(table.scheduledJobId, table.startedAt.desc()),
]);

// Zod schemas for API validation - 基础 schema 带字段描述（中文注释在此定义一次）
export const selectSystemJobExecutionLogSchema = createSelectSchema(systemJobExecutionLog, {
  id: schema => schema.meta({ description: "执行日志ID" }),
  scheduledJobId: schema => schema.meta({ description: "关联的定时任务ID" }),
  jobName: schema => schema.meta({ description: "任务名称" }),
  queueName: schema => schema.meta({ description: "队列名称" }),
  bullJobId: schema => schema.meta({ description: "BullMQ任务ID" }),
  status: schema => schema.meta({ description: "执行状态" }),
  startedAt: schema => schema.meta({ description: "执行开始时间" }),
  completedAt: schema => schema.meta({ description: "执行完成时间" }),
  durationMs: schema => schema.meta({ description: "执行耗时（毫秒）" }),
  jobData: schema => schema.meta({ description: "执行参数" }),
  resultData: schema => schema.meta({ description: "执行结果数据" }),
  errorMessage: schema => schema.meta({ description: "错误信息" }),
  errorStack: schema => schema.meta({ description: "错误堆栈信息" }),
  retryCount: schema => schema.meta({ description: "重试次数" }),
  maxRetries: schema => schema.meta({ description: "最大重试次数" }),
  isManualTrigger: schema => schema.meta({ description: "是否为手动触发" }),
  triggeredBy: schema => schema.meta({ description: "触发用户ID" }),
  progress: schema => schema.meta({ description: "执行进度百分比" }),
  progressDescription: schema => schema.meta({ description: "进度描述" }),
  executionNode: schema => schema.meta({ description: "执行节点信息" }),
  memoryUsageKb: schema => schema.meta({ description: "内存使用峰值（KB）" }),
  cpuTimeMs: schema => schema.meta({ description: "CPU使用时间（毫秒）" }),
});

// 插入 schema - 继承自基础 schema 并排除系统字段
export const insertSystemJobExecutionLogSchema = createInsertSchema(systemJobExecutionLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// 更新 schema - 基于 insert schema 的部分更新版本
export const patchSystemJobExecutionLogSchema = insertSystemJobExecutionLogSchema.partial();

// 查询参数 schema - 需要将必填字段改为可选，使用 extend 覆盖字段属性
export const jobExecutionLogQuerySchema = selectSystemJobExecutionLogSchema.pick({
  scheduledJobId: true,
  status: true,
  jobName: true,
  isManualTrigger: true,
}).extend({
  // 使用 extend 覆盖字段属性：将必填改为可选
  scheduledJobId: z.uuid().optional().meta({ description: "定时任务ID" }),
  status: z.enum(["pending", "running", "success", "failed", "timeout", "cancelled"]).optional().meta({ description: "执行状态" }),
  jobName: z.string().optional().meta({ description: "任务名称" }),
  isManualTrigger: z.coerce.number().int().min(0).max(1).optional().meta({ description: "是否为手动触发" }),
  // 添加新字段
  startDate: z.string().optional().meta({ description: "开始日期" }),
  endDate: z.string().optional().meta({ description: "结束日期" }),
});
