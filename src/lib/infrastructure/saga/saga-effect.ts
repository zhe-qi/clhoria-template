import type { SagaContext, SagaStepDefinition, StepExecutionResult } from "./types";

import { and, eq } from "drizzle-orm";
import { Duration, Effect } from "effect";

import db from "@/db";
import { sagas, sagaSteps } from "@/db/schema";
import { DatabaseError, SagaStepError } from "@/lib/effect/errors";
import { SagaStepStatus } from "@/lib/enums";

// ==================== DB Helpers ====================

export const findSagaWithSteps = (sagaId: string) =>
  Effect.tryPromise({
    try: () => db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
      with: { steps: true },
    }),
    catch: e => new DatabaseError({ message: "获取 Saga 失败", cause: e }),
  });

export const findSaga = (sagaId: string) =>
  Effect.tryPromise({
    try: () => db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    }),
    catch: e => new DatabaseError({ message: "获取 Saga 失败", cause: e }),
  });

export const updateSaga = (sagaId: string, values: Record<string, unknown>) =>
  Effect.tryPromise({
    try: () => db.update(sagas).set(values).where(eq(sagas.id, sagaId)),
    catch: e => new DatabaseError({ message: "更新 Saga 失败", cause: e }),
  });

export const updateStep = (stepId: string, values: Record<string, unknown>) =>
  Effect.tryPromise({
    try: () => db.update(sagaSteps).set(values).where(eq(sagaSteps.id, stepId)),
    catch: e => new DatabaseError({ message: "更新步骤失败", cause: e }),
  });

export const findStepByIdempotencyKey = (key: string) =>
  Effect.tryPromise({
    try: () => db.query.sagaSteps.findFirst({
      where: and(
        eq(sagaSteps.idempotencyKey, key),
        eq(sagaSteps.status, SagaStepStatus.COMPLETED),
      ),
    }),
    catch: e => new DatabaseError({ message: "查询幂等键失败", cause: e }),
  });

export const findStepBySagaAndIndex = (sagaId: string, stepIndex: number) =>
  Effect.tryPromise({
    try: () => db.query.sagaSteps.findFirst({
      where: and(
        eq(sagaSteps.sagaId, sagaId),
        eq(sagaSteps.stepIndex, stepIndex),
      ),
    }),
    catch: e => new DatabaseError({ message: "查询步骤失败", cause: e }),
  });

// ==================== Step Execution ====================

/**
 * 执行单个 Saga 步骤，带超时控制
 *
 * 返回 StepExecutionResult（成功或业务失败都在 result 中，不抛异常）
 * 仅在步骤代码本身抛异常或超时时 fail
 */
export const executeStep = (stepDef: SagaStepDefinition, input: unknown, context: SagaContext): Effect.Effect<StepExecutionResult, SagaStepError, never> =>
  Effect.tryPromise({
    try: () => stepDef.execute(input, context),
    catch: e => new SagaStepError({
      sagaId: context.sagaId,
      stepIndex: context.currentStepIndex,
      stepName: stepDef.name,
      message: e instanceof Error ? e.message : "步骤执行异常",
    }),
  }).pipe(
    Effect.timeoutFail({
      duration: Duration.seconds(stepDef.timeoutSeconds ?? 300),
      onTimeout: () => new SagaStepError({
        sagaId: context.sagaId,
        stepIndex: context.currentStepIndex,
        stepName: stepDef.name,
        message: `步骤执行超时 (${stepDef.timeoutSeconds ?? 300}s)`,
      }),
    }),
  );
