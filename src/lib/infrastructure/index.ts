// 基础设施启动
export { bootstrap, shutdown } from "./bootstrap";

// 任务队列
export { default as boss, postgresAdapter } from "./pg-boss-adapter";
// Saga 事务
export {
  getSagaOrchestrator,
  SagaOrchestrator,
  sagaRegistry,
} from "./saga";

export type {
  CompensateJobData,
  ExecuteJobData,
  SagaContext,
  SagaDefinition,
  SagaExecutionOptions,
  SagaInstance,
  SagaStepDefinition,
  SagaStepInstance,
  StepExecutionResult,
  TimeoutJobData,
} from "./saga";

// 定时任务调度（基于 pg-boss）
export { default as scheduler } from "./scheduler";
export type { ScheduleHandler, ScheduleOptions } from "./scheduler";
