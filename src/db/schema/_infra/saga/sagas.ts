import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { baseColumns } from "@/db/schema/_shard/base-columns";
import { sagaStatusEnum } from "@/db/schema/_shard/enums";
import { SagaStatus } from "@/lib/enums";

import { sagaSteps } from "./saga-steps";

/** Saga 实例表 - 记录每个 Saga 事务的执行状态 */
export const sagas = pgTable("sagas", {
  id: baseColumns.id,
  createdAt: baseColumns.createdAt,
  /** Saga 类型标识（如 "order-create", "payment-process"） */
  type: varchar({ length: 128 }).notNull(),
  /** 业务关联 ID（如订单 ID、支付 ID） */
  correlationId: varchar({ length: 128 }),
  /** 当前状态 */
  status: sagaStatusEnum().default(SagaStatus.PENDING).notNull(),
  /** 当前执行到的步骤索引 */
  currentStepIndex: integer().default(0).notNull(),
  /** 总步骤数 */
  totalSteps: integer().notNull(),
  /** Saga 输入数据 */
  input: jsonb().$type<Record<string, unknown>>(),
  /** Saga 输出数据（执行结果） */
  output: jsonb().$type<Record<string, unknown>>(),
  /** 上下文数据（步骤间共享） */
  context: jsonb().$type<Record<string, unknown>>().default({}),
  /** 错误信息 */
  error: text(),
  /** 重试次数 */
  retryCount: integer().default(0).notNull(),
  /** 最大重试次数 */
  maxRetries: integer().default(3).notNull(),
  /** 全局超时时间（秒） */
  timeoutSeconds: integer().default(3600).notNull(),
  /** 开始执行时间 */
  startedAt: timestamp({ mode: "string" }),
  /** 完成时间 */
  completedAt: timestamp({ mode: "string" }),
  /** 过期时间 */
  expiresAt: timestamp({ mode: "string" }),
}, table => [
  index("sagas_type_idx").on(table.type),
  index("sagas_correlation_id_idx").on(table.correlationId),
  index("sagas_status_idx").on(table.status),
  index("sagas_expires_at_idx").on(table.expiresAt),
]);

export const sagasRelations = relations(sagas, ({ many }) => ({
  steps: many(sagaSteps),
}));
