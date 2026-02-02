import type {
  CompensateJobData,
  ExecuteJobData,
  SagaContext,
  SagaExecutionOptions,
  SagaInstance,
  TimeoutJobData,
} from "./types";

import { format } from "date-fns";
import { and, eq } from "drizzle-orm";

import db from "@/db";
import { sagas, sagaSteps } from "@/db/schema";
import { SagaStatus, SagaStepStatus } from "@/lib/enums";
import boss from "@/lib/infrastructure/pg-boss-adapter";
import logger from "@/lib/logger";

import { sagaRegistry } from "./saga-registry";

/** pg-boss 队列名称 */
const SAGA_EXECUTE_QUEUE = "saga-execute";
const SAGA_COMPENSATE_QUEUE = "saga-compensate";
const SAGA_TIMEOUT_QUEUE = "saga-timeout";

export class SagaOrchestrator {
  private initialized = false;

  /** 初始化 Saga 协调器 */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const bossInstance = await boss;

    // 创建队列
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

    // 注册工作器
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
    logger.info("[Saga]: 协调器初始化完成");
  }

  /** 启动新的 Saga 实例 */
  async start<TInput>(
    type: string,
    input: TInput,
    options: SagaExecutionOptions = {},
  ): Promise<string> {
    const definition = sagaRegistry.get(type);
    if (!definition) {
      throw new Error(`Saga 类型 "${type}" 未注册`);
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
    const [saga] = await db
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
      .returning();

    // 创建步骤记录
    const stepRecords = definition.steps.map((step, index) => ({
      sagaId: saga.id,
      name: step.name,
      stepIndex: index,
      status: SagaStepStatus.PENDING,
      timeoutSeconds: step.timeoutSeconds ?? 300,
    }));

    await db.insert(sagaSteps).values(stepRecords);

    logger.info(
      { sagaId: saga.id, type, correlationId: options.correlationId },
      "[Saga]: Saga 实例已创建",
    );

    // 发送执行任务
    const bossInstance = await boss;
    const jobId = await bossInstance.send(
      SAGA_EXECUTE_QUEUE,
      {
        sagaId: saga.id,
        stepIndex: 0,
      } satisfies ExecuteJobData,
      {
        priority: options.priority,
        startAfter: options.delaySeconds
          ? new Date(Date.now() + options.delaySeconds * 1000)
          : undefined,
      },
    );

    // 发送超时检查任务
    await bossInstance.send(
      SAGA_TIMEOUT_QUEUE,
      {
        sagaId: saga.id,
      } satisfies TimeoutJobData,
      {
        startAfter: new Date(Date.now() + timeoutSeconds * 1000),
      },
    );

    logger.info({ sagaId: saga.id, jobId }, "[Saga]: 执行任务已发送");

    return saga.id;
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

    try {
      // 获取 Saga 实例
      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
        with: { steps: true },
      });

      if (!saga) {
        logger.error({ sagaId }, "[Saga]: Saga 实例不存在");
        return;
      }

      // 检查状态
      if (
        saga.status === SagaStatus.CANCELLED
        || saga.status === SagaStatus.FAILED
      ) {
        logger.warn(
          { sagaId, status: saga.status },
          "[Saga]: Saga 已取消或失败，跳过执行",
        );
        return;
      }

      // 获取定义
      const definition = sagaRegistry.get(saga.type);
      if (!definition) {
        throw new Error(`Saga 类型 "${saga.type}" 未注册`);
      }

      const stepDefinition = definition.steps[stepIndex];
      const stepRecord = saga.steps.find(s => s.stepIndex === stepIndex);

      if (!stepRecord) {
        throw new Error(`步骤记录不存在: ${stepIndex}`);
      }

      // 更新状态为运行中
      if (saga.status === SagaStatus.PENDING) {
        await db
          .update(sagas)
          .set({
            status: SagaStatus.RUNNING,
            startedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          })
          .where(eq(sagas.id, sagaId));
      }

      await db
        .update(sagaSteps)
        .set({
          status: SagaStepStatus.RUNNING,
          startedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          jobId: job.id,
        })
        .where(eq(sagaSteps.id, stepRecord.id));

      // 构建上下文
      const context: SagaContext = {
        sagaId,
        correlationId: saga.correlationId ?? undefined,
        currentStepIndex: stepIndex,
        ...(saga.context as Record<string, unknown>),
      };

      // 检查幂等性
      if (stepDefinition.getIdempotencyKey) {
        const idempotencyKey = stepDefinition.getIdempotencyKey(
          stepRecord.input ?? saga.input,
          context,
        );

        const existingStep = await db.query.sagaSteps.findFirst({
          where: and(
            eq(sagaSteps.idempotencyKey, idempotencyKey),
            eq(sagaSteps.status, SagaStepStatus.COMPLETED),
          ),
        });

        if (existingStep && existingStep.id !== stepRecord.id) {
          logger.info(
            { sagaId, stepIndex, idempotencyKey },
            "[Saga]: 检测到重复执行，使用缓存结果",
          );

          await db
            .update(sagaSteps)
            .set({
              status: SagaStepStatus.COMPLETED,
              output: existingStep.output,
              completedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            })
            .where(eq(sagaSteps.id, stepRecord.id));

          await this.proceedToNextStep(
            sagaId,
            stepIndex,
            existingStep.output ?? {},
            context,
          );
          return;
        }

        await db
          .update(sagaSteps)
          .set({
            idempotencyKey,
          })
          .where(eq(sagaSteps.id, stepRecord.id));
      }

      // 执行步骤
      const result = await stepDefinition.execute(
        stepRecord.input ?? saga.input,
        context,
      );

      if (result.success) {
        // 更新步骤状态
        await db
          .update(sagaSteps)
          .set({
            status: SagaStepStatus.COMPLETED,
            output: result.output as Record<string, unknown>,
            completedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          })
          .where(eq(sagaSteps.id, stepRecord.id));

        // 更新上下文
        const newContext = {
          ...context,
          [`step_${stepIndex}_output`]: result.output,
        };

        await db
          .update(sagas)
          .set({
            context: newContext,
            currentStepIndex: stepIndex + 1,
          })
          .where(eq(sagas.id, sagaId));

        // 继续下一步
        await this.proceedToNextStep(
          sagaId,
          stepIndex,
          (result.output ?? {}) as Record<string, unknown>,
          newContext,
        );
      }
      else {
        await this.handleStepFailure(
          sagaId,
          stepIndex,
          stepRecord.id,
          result.error ?? "未知错误",
          result.shouldRetry ?? true,
        );
      }
    }
    catch (error) {
      logger.error(error, "[Saga]: 步骤执行异常");
      const stepRecord = await db.query.sagaSteps.findFirst({
        where: and(
          eq(sagaSteps.sagaId, sagaId),
          eq(sagaSteps.stepIndex, stepIndex),
        ),
      });

      if (stepRecord) {
        await this.handleStepFailure(
          sagaId,
          stepIndex,
          stepRecord.id,
          error instanceof Error ? error.message : "执行异常",
          true,
        );
      }
    }
  }

  /** 继续执行下一步 */
  private async proceedToNextStep(
    sagaId: string,
    currentStepIndex: number,
    output: Record<string, unknown>,
    context: SagaContext,
  ): Promise<void> {
    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    });

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

      await db
        .update(sagas)
        .set({
          status: SagaStatus.COMPLETED,
          output: finalOutput as Record<string, unknown>,
          completedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        })
        .where(eq(sagas.id, sagaId));

      logger.info({ sagaId }, "[Saga]: Saga 执行完成");

      if (definition?.onCompleted) {
        await definition.onCompleted(sagaId, finalOutput, context);
      }
    }
    else {
      // 发送下一步执行任务
      const bossInstance = await boss;
      await bossInstance.send(SAGA_EXECUTE_QUEUE, {
        sagaId,
        stepIndex: nextStepIndex,
      } satisfies ExecuteJobData);

      logger.info({ sagaId, nextStepIndex }, "[Saga]: 下一步任务已发送");
    }
  }

  /** 处理步骤失败 */
  private async handleStepFailure(
    sagaId: string,
    stepIndex: number,
    stepRecordId: string,
    error: string,
    shouldRetry: boolean,
  ): Promise<void> {
    const stepRecord = await db.query.sagaSteps.findFirst({
      where: eq(sagaSteps.id, stepRecordId),
    });

    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    });

    if (!stepRecord || !saga) {
      return;
    }

    const definition = sagaRegistry.get(saga.type);
    const stepDefinition = definition?.steps[stepIndex];
    const maxRetries = stepDefinition?.maxRetries ?? 3;

    if (shouldRetry && stepRecord.retryCount < maxRetries) {
      // 重试
      await db
        .update(sagaSteps)
        .set({
          retryCount: stepRecord.retryCount + 1,
          error,
        })
        .where(eq(sagaSteps.id, stepRecordId));

      const retryDelay = stepDefinition?.retryBackoff
        ? (stepDefinition.retryDelaySeconds ?? 30)
        * 2 ** stepRecord.retryCount
        : (stepDefinition?.retryDelaySeconds ?? 30);

      const bossInstance = await boss;
      await bossInstance.send(
        SAGA_EXECUTE_QUEUE,
        {
          sagaId,
          stepIndex,
        } satisfies ExecuteJobData,
        {
          startAfter: new Date(Date.now() + retryDelay * 1000),
        },
      );

      logger.info(
        { sagaId, stepIndex, retryCount: stepRecord.retryCount + 1 },
        "[Saga]: 步骤将重试",
      );
    }
    else {
      // 标记失败，开始补偿
      await db
        .update(sagaSteps)
        .set({
          status: SagaStepStatus.FAILED,
          error,
          completedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        })
        .where(eq(sagaSteps.id, stepRecordId));

      await db
        .update(sagas)
        .set({
          status: SagaStatus.COMPENSATING,
          error,
        })
        .where(eq(sagas.id, sagaId));

      logger.warn({ sagaId, stepIndex, error }, "[Saga]: 步骤失败，开始补偿");

      // 发送补偿任务
      const bossInstance = await boss;
      await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
        sagaId,
        fromStepIndex: stepIndex - 1, // 从上一个已完成的步骤开始补偿
      } satisfies CompensateJobData);
    }
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

    if (fromStepIndex < 0) {
      // 补偿完成
      await db
        .update(sagas)
        .set({
          status: SagaStatus.FAILED,
          completedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        })
        .where(eq(sagas.id, sagaId));

      logger.info({ sagaId }, "[Saga]: 补偿完成，Saga 标记为失败");

      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
      });

      if (saga) {
        const definition = sagaRegistry.get(saga.type);
        if (definition?.onFailed) {
          await definition.onFailed(sagaId, saga.error ?? "未知错误", {
            sagaId,
            currentStepIndex: fromStepIndex,
            ...saga.context,
          } as SagaContext);
        }
      }

      return;
    }

    try {
      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
        with: { steps: true },
      });

      if (!saga) {
        return;
      }

      const definition = sagaRegistry.get(saga.type);
      if (!definition) {
        throw new Error(`Saga 类型 "${saga.type}" 未注册`);
      }

      const stepDefinition = definition.steps[fromStepIndex];
      const stepRecord = saga.steps.find(s => s.stepIndex === fromStepIndex);

      if (!stepRecord || stepRecord.status !== SagaStepStatus.COMPLETED) {
        // 跳过未完成的步骤
        const bossInstance = await boss;
        await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
          sagaId,
          fromStepIndex: fromStepIndex - 1,
        } satisfies CompensateJobData);
        return;
      }

      // 更新步骤状态
      await db
        .update(sagaSteps)
        .set({
          status: SagaStepStatus.COMPENSATING,
          compensationStartedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          compensationJobId: job.id,
        })
        .where(eq(sagaSteps.id, stepRecord.id));

      // 执行补偿
      if (stepDefinition.compensate) {
        const context: SagaContext = {
          sagaId,
          correlationId: saga.correlationId ?? undefined,
          currentStepIndex: fromStepIndex,
          ...(saga.context as Record<string, unknown>),
        };

        const result = await stepDefinition.compensate(
          stepRecord.input ?? saga.input,
          stepRecord.output,
          context,
        );

        if (result.success) {
          await db
            .update(sagaSteps)
            .set({
              status: SagaStepStatus.COMPENSATED,
              compensationCompletedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            })
            .where(eq(sagaSteps.id, stepRecord.id));
        }
        else {
          await db
            .update(sagaSteps)
            .set({
              status: SagaStepStatus.COMPENSATION_FAILED,
              error: result.error,
              compensationCompletedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            })
            .where(eq(sagaSteps.id, stepRecord.id));

          logger.error(
            { sagaId, stepIndex: fromStepIndex, error: result.error },
            "[Saga]: 补偿失败",
          );
        }
      }
      else {
        // 无补偿函数，标记为已补偿
        await db
          .update(sagaSteps)
          .set({
            status: SagaStepStatus.COMPENSATED,
            compensationCompletedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          })
          .where(eq(sagaSteps.id, stepRecord.id));
      }

      // 继续补偿上一步
      const bossInstance = await boss;
      await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
        sagaId,
        fromStepIndex: fromStepIndex - 1,
      } satisfies CompensateJobData);
    }
    catch (error) {
      logger.error(error, "[Saga]: 补偿执行异常");

      // 即使补偿失败也继续补偿其他步骤
      const bossInstance = await boss;
      await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
        sagaId,
        fromStepIndex: fromStepIndex - 1,
      } satisfies CompensateJobData);
    }
  }

  /** 处理超时任务 */
  private async handleTimeoutJob(
    jobs: { id: string; data: TimeoutJobData }[],
  ): Promise<void> {
    const [job] = jobs;
    const { sagaId } = job.data;

    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    });

    if (!saga) {
      return;
    }

    // 检查是否已完成
    if (
      saga.status === SagaStatus.COMPLETED
      || saga.status === SagaStatus.FAILED
    ) {
      return;
    }

    logger.warn({ sagaId }, "[Saga]: Saga 超时，开始补偿");

    await db
      .update(sagas)
      .set({
        status: SagaStatus.COMPENSATING,
        error: "Saga 执行超时",
      })
      .where(eq(sagas.id, sagaId));

    // 发送补偿任务
    const bossInstance = await boss;
    await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
      sagaId,
      fromStepIndex: saga.currentStepIndex - 1,
    } satisfies CompensateJobData);
  }

  /** 手动取消 Saga */
  async cancel(sagaId: string): Promise<boolean> {
    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    });

    if (!saga) {
      return false;
    }

    if (
      saga.status === SagaStatus.COMPLETED
      || saga.status === SagaStatus.FAILED
    ) {
      return false;
    }

    await db
      .update(sagas)
      .set({
        status: SagaStatus.COMPENSATING,
        error: "用户手动取消",
      })
      .where(eq(sagas.id, sagaId));

    // 发送补偿任务
    const bossInstance = await boss;
    await bossInstance.send(SAGA_COMPENSATE_QUEUE, {
      sagaId,
      fromStepIndex: saga.currentStepIndex - 1,
    } satisfies CompensateJobData);

    logger.info({ sagaId }, "[Saga]: Saga 已取消，开始补偿");
    return true;
  }

  /** 手动重试失败的 Saga */
  async retry(sagaId: string): Promise<boolean> {
    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
    });

    if (!saga || saga.status !== SagaStatus.FAILED) {
      return false;
    }

    if (saga.retryCount >= saga.maxRetries) {
      return false;
    }

    await db
      .update(sagas)
      .set({
        status: SagaStatus.PENDING,
        retryCount: saga.retryCount + 1,
        error: null,
      })
      .where(eq(sagas.id, sagaId));

    // 重置失败的步骤状态
    await db
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
      );

    // 发送执行任务
    const bossInstance = await boss;
    await bossInstance.send(SAGA_EXECUTE_QUEUE, {
      sagaId,
      stepIndex: saga.currentStepIndex,
    } satisfies ExecuteJobData);

    logger.info(
      { sagaId, retryCount: saga.retryCount + 1 },
      "[Saga]: Saga 重试已发起",
    );
    return true;
  }

  /** 获取 Saga 实例详情 */
  async get(sagaId: string): Promise<SagaInstance | null> {
    const saga = await db.query.sagas.findFirst({
      where: eq(sagas.id, sagaId),
      with: { steps: true },
    });

    if (!saga) {
      return null;
    }

    return {
      id: saga.id,
      type: saga.type,
      correlationId: saga.correlationId ?? undefined,
      status: saga.status,
      currentStepIndex: saga.currentStepIndex,
      totalSteps: saga.totalSteps,
      input: saga.input ?? {},
      output: saga.output ?? undefined,
      context: saga.context ?? {},
      error: saga.error ?? undefined,
      retryCount: saga.retryCount,
      startedAt: saga.startedAt ?? undefined,
      completedAt: saga.completedAt ?? undefined,
      steps: saga.steps.map(step => ({
        id: step.id,
        name: step.name,
        stepIndex: step.stepIndex,
        status: step.status,
        input: step.input ?? undefined,
        output: step.output ?? undefined,
        error: step.error ?? undefined,
        retryCount: step.retryCount,
        startedAt: step.startedAt ?? undefined,
        completedAt: step.completedAt ?? undefined,
      })),
    };
  }
}
