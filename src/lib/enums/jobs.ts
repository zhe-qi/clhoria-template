/** 任务执行状态枚举 */
export const JobExecutionStatus = {
  /** 等待执行 */
  WAITING: "waiting",
  /** 执行中 */
  ACTIVE: "active",
  /** 已完成 */
  COMPLETED: "completed",
  /** 执行失败 */
  FAILED: "failed",
  /** 已延迟 */
  DELAYED: "delayed",
  /** 已暂停 */
  PAUSED: "paused",
} as const;

/** 任务执行状态类型 */
export type JobExecutionStatusType = (typeof JobExecutionStatus)[keyof typeof JobExecutionStatus];

/** 定时任务状态枚举 */
export const JobStatus = {
  /** 启用状态 */
  ENABLED: 1,
  /** 禁用状态 */
  DISABLED: 0,
  /** 暂停状态 */
  PAUSED: 2,
} as const;

/** 定时任务状态类型 */
export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];
