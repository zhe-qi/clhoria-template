import type { ProcessorRegistration, ScheduledTaskConfig } from "./config";

// Uncomment the following lines to see the examples of scheduled tasks and asynchronous tasks
// 解开相关注释可以查看定时任务和异步任务的示例
// import { demoScheduledTasks, demoTaskProcessors } from "./examples/demo-tasks";

// ============ 任务处理器注册表 ============

/**
 * 将自定义任务处理器添加到该数组中
 *
 * @example
 * ```typescript
 * import { sendEmailProcessor } from "./processors/email.processor";
 *
 * const customTaskProcessors: ProcessorRegistration[] = [
 *   { name: "send-email", processor: sendEmailProcessor },
 * ];
 * ```
 */
const customTaskProcessors: ProcessorRegistration[] = [];

export const taskProcessors: ProcessorRegistration[] = [
  // ...demoTaskProcessors,
  ...customTaskProcessors,
];

// ============ 定时任务配置 ============

/**
 * 将自定义定时任务添加到该数组中
 *
 * @example
 * ```typescript
 * const customScheduledTasks: ScheduledTaskConfig[] = [
 *   {
 *     name: "system-health-check",
 *     pattern: "0 * * * *", // 每小时执行
 *     data: {},
 *   },
 * ];
 * ```
 */
const customScheduledTasks: ScheduledTaskConfig[] = [];

export const allScheduledTasks: ScheduledTaskConfig[] = [
  // ...demoScheduledTasks,
  ...customScheduledTasks,
];
