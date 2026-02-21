import { relations } from "drizzle-orm";
import { index, integer, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { infraSchema } from "@/db/schema/_root";
import { baseColumns } from "@/db/schema/_shard/base-columns";

import { SagaStepStatus } from "@/lib/enums";
import { sagaStepStatusEnum } from "./enums";
import { sagas } from "./sagas";

/** Saga 步骤表 - 记录每个步骤的执行状态 */
export const sagaSteps = infraSchema.table("saga_steps", {
  id: baseColumns.id,
  createdAt: baseColumns.createdAt,
  /** 关联的 Saga ID */
  sagaId: uuid().notNull().references(() => sagas.id, { onDelete: "cascade" }),
  /** 步骤名称 */
  name: varchar({ length: 128 }).notNull(),
  /** 步骤顺序索引 */
  stepIndex: integer().notNull(),
  /** 步骤状态 */
  status: sagaStepStatusEnum().default(SagaStepStatus.PENDING).notNull(),
  /** 步骤输入数据 */
  input: jsonb().$type<Record<string, unknown>>(),
  /** 步骤输出数据 */
  output: jsonb().$type<Record<string, unknown>>(),
  /** 错误信息 */
  error: text(),
  /** 幂等键（用于防止重复执行） */
  idempotencyKey: varchar({ length: 256 }),
  /** 执行重试次数 */
  retryCount: integer().default(0).notNull(),
  /** 步骤超时时间（秒） */
  timeoutSeconds: integer().default(300).notNull(),
  /** pg-boss 任务 ID（执行任务） */
  jobId: varchar({ length: 64 }),
  /** pg-boss 补偿任务 ID */
  compensationJobId: varchar({ length: 64 }),
  /** 开始执行时间 */
  startedAt: timestamp({ mode: "string" }),
  /** 完成时间 */
  completedAt: timestamp({ mode: "string" }),
  /** 补偿开始时间 */
  compensationStartedAt: timestamp({ mode: "string" }),
  /** 补偿完成时间 */
  compensationCompletedAt: timestamp({ mode: "string" }),
}, table => [
  index("saga_steps_saga_id_idx").on(table.sagaId),
  index("saga_steps_status_idx").on(table.status),
  index("saga_steps_idempotency_key_idx").on(table.idempotencyKey),
  index("saga_steps_job_id_idx").on(table.jobId),
]);

export const sagaStepsRelations = relations(sagaSteps, ({ one }) => ({
  saga: one(sagas, {
    fields: [sagaSteps.sagaId],
    references: [sagas.id],
  }),
}));
