import type { SagaStatusType, SagaStepStatusType } from "@/lib/enums";

/** Saga 上下文 - 步骤间共享的数据 */
export type SagaContext<T = Record<string, unknown>> = T & {
  /** Saga 实例 ID */
  sagaId: string;
  /** 业务关联 ID */
  correlationId?: string;
  /** 当前步骤索引 */
  currentStepIndex: number;
};

/** 步骤执行结果 */
export type StepExecutionResult<T = unknown> = {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output?: T;
  /** 错误信息 */
  error?: string;
  /** 是否需要重试 */
  shouldRetry?: boolean;
};

/** 步骤定义 */
export type SagaStepDefinition<
  TInput = unknown,
  TOutput = unknown,
  TContext = Record<string, unknown>,
> = {
  /** 步骤名称 */
  name: string;
  /** 步骤超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
  /** 是否启用指数退避 */
  retryBackoff?: boolean;
  /** 执行函数 */
  execute: (
    input: TInput,
    context: SagaContext<TContext>,
  ) => Promise<StepExecutionResult<TOutput>>;
  /** 补偿函数 */
  compensate?: (
    input: TInput,
    output: TOutput | undefined,
    context: SagaContext<TContext>,
  ) => Promise<StepExecutionResult<void>>;
  /** 生成幂等键的函数 */
  getIdempotencyKey?: (input: TInput, context: SagaContext<TContext>) => string;
  /** 是否可跳过（当前置步骤失败时） */
  skippable?: boolean;
};

/** Saga 定义 */
export type SagaDefinition<
  TInput = unknown,
  TOutput = unknown,
  TContext = Record<string, unknown>,
> = {
  /** Saga 类型标识 */
  type: string;
  /** 步骤列表 */
  steps: SagaStepDefinition<unknown, unknown, TContext>[];
  /** 全局超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 准备输入数据 */
  prepareInput?: (rawInput: TInput) => Record<string, unknown>;
  /** 准备输出数据 */
  prepareOutput?: (context: SagaContext<TContext>) => TOutput;
  /** 失败回调 */
  onFailed?: (
    sagaId: string,
    error: string,
    context: SagaContext<TContext>,
  ) => Promise<void>;
  /** 完成回调 */
  onCompleted?: (
    sagaId: string,
    output: TOutput,
    context: SagaContext<TContext>,
  ) => Promise<void>;
};

/** Saga 执行选项 */
export type SagaExecutionOptions = {
  /** 业务关联 ID */
  correlationId?: string;
  /** 延迟执行（秒） */
  delaySeconds?: number;
  /** 优先级 */
  priority?: number;
};

/** Saga 实例信息 */
export type SagaInstance = {
  id: string;
  type: string;
  correlationId: string | null;
  status: SagaStatusType;
  currentStepIndex: number;
  totalSteps: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  context: Record<string, unknown>;
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  steps: SagaStepInstance[];
};

/** Saga 实例中需要直接透传的字段（input/context/steps 需特殊处理） */
export const sagaInstanceKeys = [
  "id",
  "type",
  "correlationId",
  "status",
  "currentStepIndex",
  "totalSteps",
  "output",
  "error",
  "retryCount",
  "startedAt",
  "completedAt",
] as const satisfies readonly (keyof SagaInstance)[];

/** Saga 步骤实例信息 */
export type SagaStepInstance = {
  id: string;
  name: string;
  stepIndex: number;
  status: SagaStepStatusType;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
};

/** Saga 步骤实例的全部字段 */
export const sagaStepInstanceKeys = [
  "id",
  "name",
  "stepIndex",
  "status",
  "input",
  "output",
  "error",
  "retryCount",
  "startedAt",
  "completedAt",
] as const satisfies readonly (keyof SagaStepInstance)[];

/** pg-boss 执行任务数据 */
export type ExecuteJobData = {
  sagaId: string;
  stepIndex: number;
};

/** pg-boss 补偿任务数据 */
export type CompensateJobData = {
  sagaId: string;
  fromStepIndex: number;
};

/** pg-boss 超时任务数据 */
export type TimeoutJobData = {
  sagaId: string;
};
