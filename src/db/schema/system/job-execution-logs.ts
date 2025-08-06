import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { defaultColumns } from "@/db/common/default-columns";

/** 任务执行结果接口 */
interface JobResult {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** 任务执行历史表 */
export const systemJobExecutionLogs = pgTable("system_job_execution_logs", {
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

export const selectSystemJobExecutionLogsSchema = createSelectSchema(systemJobExecutionLogs, {
  id: schema => schema.meta({ describe: "日志ID" }),
  jobId: schema => schema.meta({ describe: "关联的任务ID" }),
  executionId: schema => schema.meta({ describe: "BullMQ执行ID" }),
  status: schema => schema.meta({ describe: "执行状态" }),
  startedAt: schema => schema.meta({ describe: "开始时间" }),
  finishedAt: schema => schema.meta({ describe: "结束时间" }),
  durationMs: schema => schema.meta({ describe: "执行耗时(毫秒)" }),
  result: schema => schema.meta({ describe: "执行结果" }),
  errorMessage: schema => schema.meta({ describe: "错误信息" }),
  retryCount: schema => schema.meta({ describe: "重试次数" }),
});
