import type { ProcessorRegistration, ScheduledTaskConfig } from "./config";

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

/**
 * 获取所有处理器映射
 * 用于快速查找处理器
 */
export function getProcessorMap(): Map<string, ProcessorRegistration["processor"]> {
  const map = new Map();
  for (const { name, processor } of taskProcessors) {
    map.set(name, processor);
  }
  return map;
}

/**
 * 根据名称获取处理器
 */
export function getProcessor(name: string): ProcessorRegistration["processor"] | undefined {
  const registration = taskProcessors.find(p => p.name === name);
  return registration?.processor;
}

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
