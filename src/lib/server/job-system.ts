import { allScheduledTasks, gracefulShutdownJobSystem, jobSystemConfig, startJobSystem, taskProcessors } from "@/jobs";
import logger from "@/lib/logger";

/**
 * 初始化并启动任务系统
 */
export async function setupJobSystem(): Promise<void> {
  // 启动任务系统
  await startJobSystem(taskProcessors, allScheduledTasks);

  logger.info(
    {
      queueName: jobSystemConfig.queueName,
      concurrency: jobSystemConfig.workerConfig?.concurrency,
      processors: taskProcessors.length,
      scheduledTasks: allScheduledTasks.length,
    },
    "[任务系统]: 已启动",
  );
}

/**
 * 优雅关闭任务系统
 */
export async function shutdownJobSystem(): Promise<void> {
  await gracefulShutdownJobSystem();
  logger.info("[任务系统]: 已关闭");
}
