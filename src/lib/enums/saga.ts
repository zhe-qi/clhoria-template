/** Saga 执行状态枚举 */
export const SagaStatus = {
  /** 待执行 */
  PENDING: "PENDING",
  /** 执行中 */
  RUNNING: "RUNNING",
  /** 补偿中 */
  COMPENSATING: "COMPENSATING",
  /** 已完成 */
  COMPLETED: "COMPLETED",
  /** 已失败 */
  FAILED: "FAILED",
  /** 已取消 */
  CANCELLED: "CANCELLED",
} as const;

export type SagaStatusType = (typeof SagaStatus)[keyof typeof SagaStatus];

/** Saga 步骤状态枚举 */
export const SagaStepStatus = {
  /** 待执行 */
  PENDING: "PENDING",
  /** 执行中 */
  RUNNING: "RUNNING",
  /** 已完成 */
  COMPLETED: "COMPLETED",
  /** 已失败 */
  FAILED: "FAILED",
  /** 已跳过 */
  SKIPPED: "SKIPPED",
  /** 补偿中 */
  COMPENSATING: "COMPENSATING",
  /** 已补偿 */
  COMPENSATED: "COMPENSATED",
  /** 补偿失败 */
  COMPENSATION_FAILED: "COMPENSATION_FAILED",
} as const;

export type SagaStepStatusType = (typeof SagaStepStatus)[keyof typeof SagaStepStatus];
