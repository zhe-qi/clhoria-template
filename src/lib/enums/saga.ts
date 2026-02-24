/** Saga execution status enum / Saga 执行状态枚举 */
export const SagaStatus = {
  /** Pending / 待执行 */
  PENDING: "PENDING",
  /** Running / 执行中 */
  RUNNING: "RUNNING",
  /** Compensating / 补偿中 */
  COMPENSATING: "COMPENSATING",
  /** Completed / 已完成 */
  COMPLETED: "COMPLETED",
  /** Failed / 已失败 */
  FAILED: "FAILED",
  /** Cancelled / 已取消 */
  CANCELLED: "CANCELLED",
} as const;

export type SagaStatusType = (typeof SagaStatus)[keyof typeof SagaStatus];

/** Saga step status enum / Saga 步骤状态枚举 */
export const SagaStepStatus = {
  /** Pending / 待执行 */
  PENDING: "PENDING",
  /** Running / 执行中 */
  RUNNING: "RUNNING",
  /** Completed / 已完成 */
  COMPLETED: "COMPLETED",
  /** Failed / 已失败 */
  FAILED: "FAILED",
  /** Skipped / 已跳过 */
  SKIPPED: "SKIPPED",
  /** Compensating / 补偿中 */
  COMPENSATING: "COMPENSATING",
  /** Compensated / 已补偿 */
  COMPENSATED: "COMPENSATED",
  /** Compensation failed / 补偿失败 */
  COMPENSATION_FAILED: "COMPENSATION_FAILED",
} as const;

export type SagaStepStatusType = (typeof SagaStepStatus)[keyof typeof SagaStepStatus];
