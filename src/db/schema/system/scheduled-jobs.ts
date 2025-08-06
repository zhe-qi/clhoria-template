import { integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

import { jobStatusEnum } from "../../common/enums";

/** 定时任务配置表 */
export const systemScheduledJobs = pgTable("system_scheduled_jobs", {
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
  payload: jsonb().$type<ParamsType>().default({}).notNull(),
  /** 重试次数 */
  retryAttempts: integer().default(3).notNull(),
  /** 重试延迟(毫秒) */
  retryDelay: integer().default(5000).notNull(),
  /** 超时时间(毫秒) */
  timeout: integer().default(300000).notNull(),
  /** 优先级 */
  priority: integer().default(0).notNull(),
});

// Schema exports
export const selectSystemScheduledJobsSchema = createSelectSchema(systemScheduledJobs, {
  id: schema => schema.meta({ description: "任务ID" }),
  domain: schema => schema.meta({ description: "所属域ID" }),
  name: schema => schema.meta({ description: "任务名称" }),
  description: schema => schema.meta({ description: "任务描述" }),
  handlerName: schema => schema.meta({ description: "处理函数名" }),
  cronExpression: schema => schema.meta({ description: "Cron表达式" }),
  timezone: schema => schema.meta({ description: "时区" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用 2=暂停" }),
  payload: schema => schema.meta({ description: "任务参数(JSON)" }),
  retryAttempts: schema => schema.meta({ description: "重试次数" }),
  retryDelay: schema => schema.meta({ description: "重试延迟(毫秒)" }),
  timeout: schema => schema.meta({ description: "超时时间(毫秒)" }),
  priority: schema => schema.meta({ description: "优先级" }),
});

export const insertSystemScheduledJobsSchema = createInsertSchema(systemScheduledJobs, {
  name: schema => schema.meta({ description: "任务名称" }),
  description: schema => schema.meta({ description: "任务描述" }).optional(),
  handlerName: schema => schema.meta({ description: "处理函数名" }),
  cronExpression: schema => schema.meta({ description: "Cron表达式" }),
  timezone: schema => schema.meta({ description: "时区" }).optional(),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用 2=暂停" }).optional(),
  payload: schema => schema.meta({ description: "任务参数(JSON)" }).optional(),
  retryAttempts: schema => schema.meta({ description: "重试次数" }).optional(),
  retryDelay: schema => schema.meta({ description: "重试延迟(毫秒)" }).optional(),
  timeout: schema => schema.meta({ description: "超时时间(毫秒)" }).optional(),
  priority: schema => schema.meta({ description: "优先级" }).optional(),
}).omit({
  id: true,
  domain: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchSystemScheduledJobsSchema = insertSystemScheduledJobsSchema.partial();
