import { boolean, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { jobStatusEnum } from "./enums";

/** 任务参数接口 */
interface JobPayload {
  [key: string]: unknown;
}

/** 任务执行结果接口 */
interface JobResult {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** 定时任务配置表 */
export const sysScheduledJobs = pgTable("sys_scheduled_jobs", {
  ...defaultColumns,
  /** 所属域ID */
  domain: varchar({ length: 64 }).notNull(),
  /** 任务名称 */
  name: varchar({ length: 128 }).notNull(),
  /** 任务描述 */
  description: text(),
  /** 处理函数名 */
  handlerName: varchar({ length: 128 }).notNull(),
  /** Cron 表达式 */
  cronExpression: varchar({ length: 64 }).notNull(),
  /** 时区 */
  timezone: varchar({ length: 64 }).default("Asia/Shanghai"),
  /** 状态: 1=启用 0=禁用 2=暂停 */
  status: jobStatusEnum().notNull(),
  /** 任务参数 */
  payload: jsonb().$type<JobPayload>().default({}).notNull(),
  /** 重试次数 */
  retryAttempts: integer().default(3).notNull(),
  /** 重试延迟(毫秒) */
  retryDelay: integer().default(5000).notNull(),
  /** 超时时间(毫秒) */
  timeout: integer().default(300000).notNull(),
  /** 优先级 */
  priority: integer().default(0).notNull(),
});

/** 任务执行历史表 */
export const sysJobExecutionLogs = pgTable("sys_job_execution_logs", {
  ...defaultColumns,
  /** 关联的任务ID */
  jobId: varchar({ length: 64 }).notNull(),
  /** BullMQ执行ID */
  executionId: varchar({ length: 128 }).notNull(),
  /** 执行状态 */
  status: varchar({ length: 32 }).notNull(),
  /** 开始时间 */
  startedAt: timestamp({ mode: "string" }),
  /** 结束时间 */
  finishedAt: timestamp({ mode: "string" }),
  /** 执行耗时(毫秒) */
  durationMs: integer(),
  /** 执行结果 */
  result: jsonb().$type<JobResult>(),
  /** 错误信息 */
  errorMessage: text(),
  /** 重试次数 */
  retryCount: integer().default(0).notNull(),
});

/** 任务处理器注册表 */
export const sysJobHandlers = pgTable("sys_job_handlers", {
  ...defaultColumns,
  /** 处理函数名 */
  name: varchar({ length: 128 }).notNull(),
  /** 函数描述 */
  description: text(),
  /** 文件路径 */
  filePath: varchar({ length: 512 }),
  /** 是否激活 */
  isActive: boolean().default(true).notNull(),
});

// Schema exports
export const selectSysScheduledJobsSchema = createSelectSchema(sysScheduledJobs, {
  id: schema => schema.describe("任务ID"),
  domain: schema => schema.describe("所属域ID"),
  name: schema => schema.describe("任务名称"),
  description: schema => schema.describe("任务描述"),
  handlerName: schema => schema.describe("处理函数名"),
  cronExpression: schema => schema.describe("Cron表达式"),
  timezone: schema => schema.describe("时区"),
  status: schema => schema.describe("状态: 1=启用 0=禁用 2=暂停"),
  payload: schema => schema.describe("任务参数(JSON)"),
  retryAttempts: schema => schema.describe("重试次数"),
  retryDelay: schema => schema.describe("重试延迟(毫秒)"),
  timeout: schema => schema.describe("超时时间(毫秒)"),
  priority: schema => schema.describe("优先级"),
});

export const insertSysScheduledJobsSchema = createSelectSchema(sysScheduledJobs, {
  name: schema => schema.describe("任务名称"),
  description: schema => schema.describe("任务描述").optional(),
  handlerName: schema => schema.describe("处理函数名"),
  cronExpression: schema => schema.describe("Cron表达式"),
  timezone: schema => schema.describe("时区").optional(),
  status: schema => schema.describe("状态: 1=启用 0=禁用 2=暂停").optional(),
  payload: schema => schema.describe("任务参数(JSON)").optional(),
  retryAttempts: schema => schema.describe("重试次数").optional(),
  retryDelay: schema => schema.describe("重试延迟(毫秒)").optional(),
  timeout: schema => schema.describe("超时时间(毫秒)").optional(),
  priority: schema => schema.describe("优先级").optional(),
}).omit({
  id: true,
  domain: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchSysScheduledJobsSchema = insertSysScheduledJobsSchema.partial();

export const selectSysJobExecutionLogsSchema = createSelectSchema(sysJobExecutionLogs, {
  id: schema => schema.describe("日志ID"),
  jobId: schema => schema.describe("关联的任务ID"),
  executionId: schema => schema.describe("BullMQ执行ID"),
  status: schema => schema.describe("执行状态"),
  startedAt: schema => schema.describe("开始时间"),
  finishedAt: schema => schema.describe("结束时间"),
  durationMs: schema => schema.describe("执行耗时(毫秒)"),
  result: schema => schema.describe("执行结果"),
  errorMessage: schema => schema.describe("错误信息"),
  retryCount: schema => schema.describe("重试次数"),
});

export const selectSysJobHandlersSchema = createSelectSchema(sysJobHandlers, {
  id: schema => schema.describe("处理器ID"),
  name: schema => schema.describe("处理函数名"),
  description: schema => schema.describe("函数描述"),
  filePath: schema => schema.describe("文件路径"),
  isActive: schema => schema.describe("是否激活"),
});

export const insertSysJobHandlersSchema = createSelectSchema(sysJobHandlers, {
  name: schema => schema.describe("处理函数名"),
  description: schema => schema.describe("函数描述").optional(),
  filePath: schema => schema.describe("文件路径").optional(),
  isActive: schema => schema.describe("是否激活").optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchSysJobHandlersSchema = insertSysJobHandlersSchema.partial();
