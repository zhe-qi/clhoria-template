import type { ProcessorRegistration, ScheduledTaskConfig } from "./config";

// ============ 任务处理器注册表 ============

/**
 * 任务处理器注册表
 * 用户应在此文件中注册自定义处理器
 *
 * @example
 * ```typescript
 * import { sendEmailProcessor } from "./processors/email.processor";
 * import { processFileProcessor } from "./processors/file.processor";
 *
 * export const taskProcessors: ProcessorRegistration[] = [
 *   { name: "send-email", processor: sendEmailProcessor },
 *   { name: "process-file", processor: processFileProcessor },
 * ];
 * ```
 */
export const taskProcessors: ProcessorRegistration[] = [];

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
 * 定时任务配置
 * 用户应在此文件中配置定时任务
 *
 * @example
 * ```typescript
 * export const allScheduledTasks: ScheduledTaskConfig[] = [
 *   {
 *     name: "system-health-check",
 *     pattern: "0 * * * *", // 每小时执行
 *     data: {},
 *     options: { attempts: 1 },
 *     useLock: true,
 *   },
 *   {
 *     name: "database-backup",
 *     pattern: "0 2 * * *", // 每天凌晨2点执行
 *     data: {},
 *     options: { attempts: 3 },
 *     useLock: true,
 *   },
 * ];
 * ```
 */
export const allScheduledTasks: ScheduledTaskConfig[] = [];
