import type { ScheduledTaskConfig } from "../types";

/**
 * 每小时定时任务配置
 */

export const hourlyScheduledTasks: ScheduledTaskConfig[] = [
  {
    name: "system-health-check", // 使用处理器的标准名称
    pattern: "0 0 * * * *", // 每小时整点
    data: {},
    options: {
      attempts: 1, // 健康检查不重试
      removeOnComplete: {
        age: 3600, // 保留1小时
        count: 24, // 保留最近24个
      },
    },
    useLock: false, // 健康检查可以多实例同时执行
  },
];
