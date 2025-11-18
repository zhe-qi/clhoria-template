/**
 * 任务队列系统主入口
 */

// ============ 核心类型 ============
export type {
  ProcessorRegistration,
  ScheduledTaskConfig,
  TaskData,
  TaskOptions,
} from "./config";

// ============ 核心 API ============
export { addBulkJobs, addJob } from "./lib/queue";

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
