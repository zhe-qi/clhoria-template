import type { ProcessorRegistration } from "../types";

// 导入所有处理器
import { sendBulkEmailProcessor, sendEmailProcessor } from "./email.processor";
import { cleanupTempFilesProcessor, processFileProcessor } from "./file.processor";
import {
  cacheClearProcessor,
  databaseBackupProcessor,
  systemHealthCheckProcessor,
} from "./system.processor";
import {
  bulkUserImportProcessor,
  userDataSyncProcessor,
  userNotificationProcessor,
} from "./user.processor";

/**
 * 所有任务处理器注册表
 * 在这里集中管理所有的处理器
 */
export const taskProcessors: ProcessorRegistration[] = [
  // 系统任务
  { name: "system-health-check", processor: systemHealthCheckProcessor },
  { name: "database-backup", processor: databaseBackupProcessor },
  { name: "cache-clear", processor: cacheClearProcessor },

  // 文件任务
  { name: "process-file", processor: processFileProcessor },
  { name: "cleanup-temp-files", processor: cleanupTempFilesProcessor },

  // 邮件任务
  { name: "send-email", processor: sendEmailProcessor },
  { name: "send-bulk-email", processor: sendBulkEmailProcessor },

  // 用户任务
  { name: "user-notification", processor: userNotificationProcessor },
  { name: "user-data-sync", processor: userDataSyncProcessor },
  { name: "bulk-user-import", processor: bulkUserImportProcessor },
];

/**
 * 获取所有处理器映射
 * 用于快速查找处理器
 */
export function getProcessorMap(): Map<string, ProcessorRegistration["processor"]> {
  const map = new Map();
  taskProcessors.forEach(({ name, processor }) => {
    map.set(name, processor);
  });
  return map;
}

/**
 * 根据名称获取处理器
 */
export function getProcessor(name: string): ProcessorRegistration["processor"] | undefined {
  const registration = taskProcessors.find(p => p.name === name);
  return registration?.processor;
}
