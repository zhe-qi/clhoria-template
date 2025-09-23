import { dailyScheduledTasks } from "./daily.scheduler";
import { hourlyScheduledTasks } from "./hourly.scheduler";

/**
 * 导出所有定时任务配置
 */
export const allScheduledTasks = [
  ...dailyScheduledTasks,
  ...hourlyScheduledTasks,
];

export { dailyScheduledTasks, hourlyScheduledTasks };
