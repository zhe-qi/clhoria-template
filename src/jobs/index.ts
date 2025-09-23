/**
 * 任务队列系统主入口
 * 导出所有公共接口
 */

// 配置
export * from "./config";
// 核心功能
export { QueueManager } from "./core/queue";
export { TaskScheduler } from "./core/scheduler";

export { WorkerManager } from "./core/worker";

export { IdempotencyHelper, withIdempotency } from "./lib/idempotency";
// 工具库
export { RedisLock, withLock } from "./lib/redis-lock";

// 管理器
export {
  getJobSystemStatus,
  gracefulShutdownJobSystem,
  initializeJobSystem,
  jobSystemHealthCheck,
  startJobSystem,
  stopJobSystem,
} from "./manager";

// 处理器示例（可选导出，用于参考）
export * as EmailProcessors from "./processors/email.processor";

export * as FileProcessors from "./processors/file.processor";
export * as SystemProcessors from "./processors/system.processor";
export * as UserProcessors from "./processors/user.processor";
// 定时任务配置示例（可选导出，用于参考）
export { allScheduledTasks, dailyScheduledTasks, hourlyScheduledTasks } from "./schedulers";

// 类型定义
export type {
  DistributedLock,
  IdempotencyRecord,
  JobSystemConfig,
  ProcessorRegistration,
  ScheduledTaskConfig,
  TaskData,
  TaskOptions,
  TaskProcessor,
  WorkerConfig,
} from "./types";
