/**
 * 任务队列系统主入口
 */

// ============ 配置和类型 ============
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
} from "./config";
export { jobSystemConfig } from "./config";

// ============ 工具库 ============
export { IdempotencyHelper, withIdempotency } from "./lib/idempotency";

// ============ 核心功能 - Worker 管理 ============
// （不需要导出，由 manager 统一管理）

// ============ 核心功能 - 调度器 ============
// （不需要导出，由 manager 统一管理）

// ============ 核心功能 - 队列管理 ============
export { addBulkJobs, addJob } from "./lib/queue";
export { RedisLock, withLock } from "./lib/redis-lock";

// ============ 系统管理 ============
export {
  getJobSystemStatus,
  gracefulShutdownJobSystem,
  jobSystemHealthCheck,
  startJobSystem,
  stopJobSystem,
} from "./manager";

// ============ 用户自定义配置 ============
export { allScheduledTasks, taskProcessors } from "./user-tasks";
