import type { CompensateJobData, ExecuteJobData, SagaContext, SagaExecutionOptions, SagaInstance, TimeoutJobData } from "./types";

import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import db from "@/db";
import { sagas, sagaSteps } from "@/db/schema";
import { DatabaseError } from "@/lib/effect/errors";
import { SagaStatus, SagaStepStatus } from "@/lib/enums";
import boss from "@/lib/infrastructure/pg-boss-adapter";
import logger from "@/lib/logger";
import { pick } from "@/utils/tools/object";

import { executeStep, findSaga, findSagaWithSteps, findStepByIdempotencyKey, findStepBySagaAndIndex, updateSaga, updateStep } from "./saga-effect";
import { sagaRegistry } from "./saga-registry";
import { sagaInstanceKeys, sagaStepInstanceKeys } from "./types";

/** pg-boss 队列名称 */
const SAGA_EXECUTE_QUEUE = "saga-execute";
const SAGA_COMPENSATE_QUEUE = "saga-compensate";
const SAGA_TIMEOUT_QUEUE = "saga-timeout";

const now = () => format(new Date(), "yyyy-MM-dd HH:mm:ss");

/** 发送补偿任务到 pg-boss 队列 */
const sendCompensateJob = (sagaId: string, fromStepIndex: number) =>
  Effect.promise(() =>
    boss.send(SAGA_COMPENSATE_QUEUE, {
      sagaId,
      fromStepIndex,
    } satisfies CompensateJobData),
  );

/** 处理步骤失败：重试或启动补偿 */
const handleStepFailure = (
  sagaId: string,
  stepIndex: number,
  stepRecordId: string,
  error: string,
  shouldRetry: boolean,
): Effect.Effect<void, DatabaseError, never> =>
  Effect.gen(function* () {
    const stepRecord = yield* Effect.tryPromise({
      try: () => db.query.sagaSteps.findFirst({
        where: eq(sagaSteps.id, stepRecordId),
      }),
      catch: e => new DatabaseError({ message: "查询步骤失败", cause: e }),
    });

    const saga = yield* findSaga(sagaId);

    if (!stepRecord || !saga) {
      return;
    }

    const definition = sagaRegistry.get(saga.type);
    const stepDefinition = definition?.steps[stepIndex];
    const maxRetries = stepDefinition?.maxRetries ?? 3;

    if (shouldRetry && stepRecord.retryCount < maxRetries) {
      // 重试：更新计数，发送延迟 job
      yield* updateStep(stepRecordId, {
        retryCount: stepRecord.retryCount + 1,
        error,
      });

      const retryDelay = stepDefinition?.retryBackoff
        ? (stepDefinition.retryDelaySeconds ?? 30) * 2 ** stepRecord.retryCount
        : (stepDefinition?.retryDelaySeconds ?? 30);

      yield* Effect.promise(() =>
        boss.send(
          SAGA_EXECUTE_QUEUE,
          { sagaId, stepIndex } satisfies ExecuteJobData,
          { startAfter: new Date(Date.now() + retryDelay * 1000) },
        ),
      );

      logger.info(
        { sagaId, stepIndex, retryCount: stepRecord.retryCount + 1 },
        "[Saga]: 步骤将重试",
      );
    }
    else {
      // 标记失败，开始补偿
      yield* updateStep(stepRecordId, {
        status: SagaStepStatus.FAILED,
        error,
        completedAt: now(),
      });

      yield* updateSaga(sagaId, {
        status: SagaStatus.COMPENSATING,
        error,
      });

      logger.warn({ sagaId, stepIndex, error }, "[Saga]: 步骤失败，开始补偿");

      yield* sendCompensateJob(sagaId, stepIndex - 1);
    }
  });

/** 继续执行下一步骤，或标记 Saga 完成 */
const proceedToNextStep = (
  sagaId: string,
  currentStepIndex: number,
  output: Record<string, unknown>,
  context: SagaContext,
): Effect.Effect<void, DatabaseError, never> =>
  Effect.gen(function* () {
    const saga = yield* findSaga(sagaId);
    if (!saga) {
      return;
    }

    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex >= saga.totalSteps) {
      // Saga 完成
      const definition = sagaRegistry.get(saga.type);
      const finalOutput = definition?.prepareOutput
        ? definition.prepareOutput(context)
        : output;

      yield* updateSaga(sagaId, {
        status: SagaStatus.COMPLETED,
        output: finalOutput as Record<string, unknown>,
        completedAt: now(),
      });

      logger.info({ sagaId }, "[Saga]: Saga 执行完成");

      if (definition?.onCompleted) {
        yield* Effect.tryPromise({
          try: () => definition.onCompleted!(sagaId, finalOutput, context),
          catch: e => new DatabaseError({ message: "执行完成回调异常", cause: e }),
        });
      }
    }
    else {
      // 发送下一步执行任务
      yield* Effect.promise(() =>
        boss.send(SAGA_EXECUTE_QUEUE, {
          sagaId,
          stepIndex: nextStepIndex,
        } satisfies ExecuteJobData),
      );

      logger.info({ sagaId, nextStepIndex }, "[Saga]: 下一步任务已发送");
    }
  });

// ==================== SagaOrchestrator ====================

export class SagaOrchestrator {
  private initialized = false;

  /** 初始化 Saga 协调器 */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const bossInstance = boss;

    await bossInstance.createQueue(SAGA_EXECUTE_QUEUE, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
    });

    await bossInstance.createQueue(SAGA_COMPENSATE_QUEUE, {
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
    });

    await bossInstance.createQueue(SAGA_TIMEOUT_QUEUE);

    await bossInstance.work(
      SAGA_EXECUTE_QUEUE,
      { batchSize: 1 },
      this.handleExecuteJob.bind(this),
    );
    await bossInstance.work(
      SAGA_COMPENSATE_QUEUE,
      { batchSize: 1 },
      this.handleCompensateJob.bind(this),
    );
    await bossInstance.work(
      SAGA_TIMEOUT_QUEUE,
      { batchSize: 1 },
      this.handleTimeoutJob.bind(this),
    );

    this.initialized = true;
  }

  /** 启动新的 Saga 实例 */
  async start<TInput>(
    type: string,
    input: TInput,
    options: SagaExecutionOptions = {},
  ): Promise<string> {
    const program = Effect.gen(function* () {
      const definition = sagaRegistry.get(type);
      if (!definition) {
        return yield* Effect.die(new Error(`Saga 类型 "${type}" 未注册`));
      }

      const preparedInput = definition.prepareInput
        ? definition.prepareInput(input)
        : (input as Record<string, unknown>);

      const timeoutSeconds = definition.timeoutSeconds ?? 3600;
      const expiresAt = format(
        new Date(Date.now() + timeoutSeconds * 1000),
        "yyyy-MM-dd HH:mm:ss",
      );

      // 创建 Saga 实例
      const [saga] = yield* Effect.tryPromise({
        try: () => db
          .insert(sagas)
          .values({
            type,
            correlationId: options.correlationId,
            status: SagaStatus.PENDING,
            totalSteps: definition.steps.length,
            input: preparedInput,
            context: {},
            maxRetries: definition.maxRetries ?? 3,
            timeoutSeconds,
            expiresAt,
          })
          .returning(),
        catch: e => new DatabaseError({ message: "创建 Saga 失败", cause: e }),
      });

      // 创建步骤记录
      const stepRecords = definition.steps.map((step, index) => ({
        sagaId: saga.id,
        name: step.name,
        stepIndex: index,
        status: SagaStepStatus.PENDING,
        timeoutSeconds: step.timeoutSeconds ?? 300,
      }));

      yield* Effect.tryPromise({
        try: () => db.insert(sagaSteps).values(stepRecords),
        catch: e => new DatabaseError({ message: "创建步骤记录失败", cause: e }),
      });

      logger.info(
        { sagaId: saga.id, type, correlationId: options.correlationId },
        "[Saga]: Saga 实例已创建",
      );

      // 发送执行任务
      const bossInstance = boss;
      const jobId = yield* Effect.promise(() =>
        bossInstance.send(
          SAGA_EXECUTE_QUEUE,
          { sagaId: saga.id, stepIndex: 0 } satisfies ExecuteJobData,
          {
            priority: options.priority,
            startAfter: options.delaySeconds
              ? new Date(Date.now() + options.delaySeconds * 1000)
              : undefined,
          },
        ),
      );

      // 发送超时检查任务
      yield* Effect.promise(() =>
        bossInstance.send(
          SAGA_TIMEOUT_QUEUE,
          { sagaId: saga.id } satisfies TimeoutJobData,
          { startAfter: new Date(Date.now() + timeoutSeconds * 1000) },
        ),
      );

      logger.info({ sagaId: saga.id, jobId }, "[Saga]: 执行任务已发送");
      return saga.id;
    });

    return Effect.runPromise(program);
  }

  /** 处理执行任务 */
  private async handleExecuteJob(
    jobs: { id: string; data: ExecuteJobData }[],
  ): Promise<void> {
    const [job] = jobs;
    const { sagaId, stepIndex } = job.data;

    logger.info(
      { sagaId, stepIndex, jobId: job.id },
      "[Saga]: 开始执行步骤",
    );

    const program = Effect.gen(function* () {
      // 获取 Saga 实例
      const saga = yield* findSagaWithSteps(sagaId);
      if (!saga) {
        logger.error({ sagaId }, "[Saga]: Saga 实例不存在");
        return;
      }

      // 检查状态
      if (saga.status === SagaStatus.CANCELLED || saga.status === SagaStatus.FAILED) {
        logger.warn({ sagaId, status: saga.status }, "[Saga]: Saga 已取消或失败，跳过执行");
        return;
      }

      // 获取定义
      const definition = sagaRegistry.get(saga.type);
      if (!definition) {
        return yield* Effect.die(new Error(`Saga 类型 "${saga.type}" 未注册`));
      }

      const stepDefinition = definition.steps[stepIndex];
      const stepRecord = saga.steps.find(s => s.stepIndex === stepIndex);
      if (!stepRecord) {
        return yield* Effect.die(new Error(`步骤记录不存在: ${stepIndex}`));
      }

      // 更新状态为运行中
      if (saga.status === SagaStatus.PENDING) {
        yield* updateSaga(sagaId, {
          status: SagaStatus.RUNNING,
          startedAt: now(),
        });
      }

      yield* updateStep(stepRecord.id, {
        status: SagaStepStatus.RUNNING,
        startedAt: now(),
        jobId: job.id,
      });

      // 构建上下文
      const context: SagaContext = {
        sagaId,
        correlationId: saga.correlationId ?? undefined,
        currentStepIndex: stepIndex,
        ...(saga.context as Record<string, unknown>),
      };

      // 幂等性检查
      if (stepDefinition.getIdempotencyKey) {
        const idempotencyKey = stepDefinition.getIdempotencyKey(
          stepRecord.input ?? saga.input,
          context,
        );

        const existingStep = yield* findStepByIdempotencyKey(idempotencyKey);

        if (existingStep && existingStep.id !== stepRecord.id) {
          logger.info(
            { sagaId, stepIndex, idempotencyKey },
            "[Saga]: 检测到重复执行，使用缓存结果",
          );

          yield* updateStep(stepRecord.id, {
            status: SagaStepStatus.COMPLETED,
            output: existingStep.output,
            completedAt: now(),
          });

          yield* proceedToNextStep(sagaId, stepIndex, existingStep.output ?? {}, context);
          return;
        }

        yield* updateStep(stepRecord.id, { idempotencyKey });
      }

      // 执行步骤
      const result = yield* executeStep(stepDefinition, stepRecord.input ?? saga.input, context);

      if (result.success) {
        yield* updateStep(stepRecord.id, {
          status: SagaStepStatus.COMPLETED,
          output: result.output as Record<string, unknown>,
          completedAt: now(),
        });

        const newContext = {
          ...context,
          [`step_${stepIndex}_output`]: result.output,
        };

        yield* updateSaga(sagaId, {
          context: newContext,
          currentStepIndex: stepIndex + 1,
        });

        yield* proceedToNextStep(sagaId, stepIndex, (result.output ?? {}) as Record<string, unknown>, newContext);
      }
      else {
        yield* handleStepFailure(
          sagaId,
          stepIndex,
          stepRecord.id,
          result.error ?? "未知错误",
          result.shouldRetry ?? true,
        );
      }
    }).pipe(
      // 步骤执行错误（包括超时）→ 记录失败
      Effect.catchTag("SagaStepError", err =>
        Effect.gen(function* () {
          logger.error({ sagaId, stepIndex, error: err.message }, "[Saga]: 步骤执行异常");
          const stepRecord = yield* findStepBySagaAndIndex(sagaId, stepIndex);
          if (stepRecord) {
            yield* handleStepFailure(sagaId, stepIndex, stepRecord.id, err.message, true);
          }
        })),
      // 数据库错误 → 仅记录日志（pg-boss 会自动重试整个 job）
      Effect.catchTag("DatabaseError", err =>
        Effect.sync(() => {
          logger.error({ sagaId, stepIndex, error: err.message }, "[Saga]: 数据库操作失败");
        })),
    );

    await Effect.runPromise(program);
  }

  /** 处理补偿任务 */
  private async handleCompensateJob(
    jobs: { id: string; data: CompensateJobData }[],
  ): Promise<void> {
    const [job] = jobs;
    const { sagaId, fromStepIndex } = job.data;

    logger.info(
      { sagaId, fromStepIndex, jobId: job.id },
      "[Saga]: 开始补偿",
    );

    const program = Effect.gen(function* () {
      if (fromStepIndex < 0) {
        // 所有步骤补偿完成
        yield* updateSaga(sagaId, {
          status: SagaStatus.FAILED,
          completedAt: now(),
        });

        logger.info({ sagaId }, "[Saga]: 补偿完成，Saga 标记为失败");

        // 执行失败回调
        const saga = yield* findSaga(sagaId);
        if (saga) {
          const definition = sagaRegistry.get(saga.type);
          if (definition?.onFailed) {
            yield* Effect.tryPromise({
              try: () => definition.onFailed!(sagaId, saga.error ?? "未知错误", {
                sagaId,
                currentStepIndex: fromStepIndex,
                ...saga.context,
              } as SagaContext),
              catch: () => new DatabaseError({ message: "执行失败回调异常" }),
            });
          }
        }
        return;
      }

      // 获取 Saga 并执行补偿
      const saga = yield* findSagaWithSteps(sagaId);
      if (!saga) {
        return;
      }

      const definition = sagaRegistry.get(saga.type);
      if (!definition) {
        return yield* Effect.die(new Error(`Saga 类型 "${saga.type}" 未注册`));
      }

      const stepDefinition = definition.steps[fromStepIndex];
      const stepRecord = saga.steps.find(s => s.stepIndex === fromStepIndex);

      if (!stepRecord || stepRecord.status !== SagaStepStatus.COMPLETED) {
        // 跳过未完成的步骤，继续补偿上一步
        yield* sendCompensateJob(sagaId, fromStepIndex - 1);
        return;
      }

      // 执行补偿
      yield* updateStep(stepRecord.id, {
        status: SagaStepStatus.COMPENSATING,
        compensationStartedAt: now(),
        compensationJobId: job.id,
      });

      if (stepDefinition.compensate) {
        const context: SagaContext = {
          sagaId,
          correlationId: saga.correlationId ?? undefined,
          currentStepIndex: fromStepIndex,
          ...(saga.context as Record<string, unknown>),
        };

        const result = yield* Effect.tryPromise({
          try: () => stepDefinition.compensate!(
            stepRecord.input ?? saga.input,
            stepRecord.output,
            context,
          ),
          catch: e => new DatabaseError({
            message: e instanceof Error ? e.message : "补偿执行异常",
            cause: e,
          }),
        });

        if (result.success) {
          yield* updateStep(stepRecord.id, {
            status: SagaStepStatus.COMPENSATED,
            compensationCompletedAt: now(),
          });
        }
        else {
          yield* updateStep(stepRecord.id, {
            status: SagaStepStatus.COMPENSATION_FAILED,
            error: result.error,
            compensationCompletedAt: now(),
          });
          logger.error(
            { sagaId, stepIndex: fromStepIndex, error: result.error },
            "[Saga]: 补偿失败",
          );
        }
      }
      else {
        yield* updateStep(stepRecord.id, {
          status: SagaStepStatus.COMPENSATED,
          compensationCompletedAt: now(),
        });
      }

      // 继续补偿上一步
      yield* sendCompensateJob(sagaId, fromStepIndex - 1);
    }).pipe(
      Effect.catchTag("DatabaseError", err =>
        Effect.gen(function* () {
          logger.error({ sagaId, error: err.message }, "[Saga]: 补偿中数据库操作失败");
          // 即使失败也继续补偿其他步骤
          yield* sendCompensateJob(sagaId, fromStepIndex - 1);
        })),
    );

    await Effect.runPromise(program);
  }

  /** 处理超时任务 */
  private async handleTimeoutJob(
    jobs: { id: string; data: TimeoutJobData }[],
  ): Promise<void> {
    const [job] = jobs;
    const { sagaId } = job.data;

    const program = Effect.gen(function* () {
      const saga = yield* findSaga(sagaId);
      if (!saga) {
        return;
      }

      // 已完成或已失败则忽略
      if (saga.status === SagaStatus.COMPLETED || saga.status === SagaStatus.FAILED) {
        return;
      }

      logger.warn({ sagaId }, "[Saga]: Saga 超时，开始补偿");

      yield* updateSaga(sagaId, {
        status: SagaStatus.COMPENSATING,
        error: "Saga 执行超时",
      });

      yield* sendCompensateJob(sagaId, saga.currentStepIndex - 1);
    }).pipe(
      Effect.catchTag("DatabaseError", err =>
        Effect.sync(() => {
          logger.error({ sagaId, error: err.message }, "[Saga]: 超时处理失败");
        })),
    );

    await Effect.runPromise(program);
  }

  /** 手动取消 Saga */
  async cancel(sagaId: string): Promise<boolean> {
    const program = Effect.gen(function* () {
      const saga = yield* findSaga(sagaId);
      if (!saga) {
        return false;
      }

      if (saga.status === SagaStatus.COMPLETED || saga.status === SagaStatus.FAILED) {
        return false;
      }

      yield* updateSaga(sagaId, {
        status: SagaStatus.COMPENSATING,
        error: "用户手动取消",
      });

      yield* sendCompensateJob(sagaId, saga.currentStepIndex - 1);

      logger.info({ sagaId }, "[Saga]: Saga 已取消，开始补偿");
      return true;
    });

    return Effect.runPromise(program);
  }

  /** 手动重试失败的 Saga */
  async retry(sagaId: string): Promise<boolean> {
    const program = Effect.gen(function* () {
      const saga = yield* findSaga(sagaId);
      if (!saga || saga.status !== SagaStatus.FAILED) {
        return false;
      }

      if (saga.retryCount >= saga.maxRetries) {
        return false;
      }

      yield* updateSaga(sagaId, {
        status: SagaStatus.PENDING,
        retryCount: saga.retryCount + 1,
        error: null,
      });

      // 重置失败步骤状态
      yield* Effect.tryPromise({
        try: () => db
          .update(sagaSteps)
          .set({
            status: SagaStepStatus.PENDING,
            error: null,
            retryCount: 0,
          })
          .where(
            and(
              eq(sagaSteps.sagaId, sagaId),
              eq(sagaSteps.stepIndex, saga.currentStepIndex),
            ),
          ),
        catch: e => new DatabaseError({ message: "重置步骤状态失败", cause: e }),
      });

      // 发送执行任务
      yield* Effect.promise(() =>
        boss.send(SAGA_EXECUTE_QUEUE, {
          sagaId,
          stepIndex: saga.currentStepIndex,
        } satisfies ExecuteJobData),
      );

      logger.info(
        { sagaId, retryCount: saga.retryCount + 1 },
        "[Saga]: Saga 重试已发起",
      );
      return true;
    });

    return Effect.runPromise(program);
  }

  /** 获取 Saga 实例详情 */
  async get(sagaId: string): Promise<SagaInstance | null> {
    const program = Effect.gen(function* () {
      const saga = yield* findSagaWithSteps(sagaId);
      if (!saga)
        return null;

      return {
        ...pick(saga, sagaInstanceKeys),
        input: saga.input ?? {},
        context: saga.context ?? {},
        steps: saga.steps.map(s => pick(s, sagaStepInstanceKeys)),
      } satisfies SagaInstance;
    });

    return Effect.runPromise(program);
  }
}
