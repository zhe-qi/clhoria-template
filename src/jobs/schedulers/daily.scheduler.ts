import type { ScheduledTaskConfig } from "../types";

/**
 * 每日定时任务配置
 */

export const dailyScheduledTasks: ScheduledTaskConfig[] = [
  {
    name: "cleanup-temp-files", // 使用处理器的标准名称
    pattern: "0 0 2 * * *", // 每天凌晨 2:00
    data: {
      directory: "/tmp",
      olderThanDays: 7,
    },
    options: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
    },
    useLock: true,
    lockTTL: 300, // 5分钟
  },
  {
    name: "database-backup", // 使用处理器的标准名称
    pattern: "0 0 3 * * *", // 每天凌晨 3:00
    data: {
      tables: [], // 空数组表示备份所有表
    },
    options: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 30000,
      },
    },
    useLock: true,
    lockTTL: 3600, // 1小时
  },
];
