import { gracefulShutdownJobSystem, initializeJobSystem, startJobSystem } from "@/jobs";
import { jobSystemConfig } from "@/jobs/config/job-system.config";
import { taskProcessors } from "@/jobs/processors";
import { allScheduledTasks } from "@/jobs/schedulers";
import logger from "@/lib/logger";

/**
 * 初始化并启动任务系统
 */
export async function setupJobSystem(): Promise<void> {
  // 初始化任务系统
  await initializeJobSystem(jobSystemConfig);

  // 启动任务系统
  await startJobSystem(taskProcessors, allScheduledTasks);

  logger.info(
    {
      info: JSON.stringify({
        queueName: jobSystemConfig.queueName,
        concurrency: jobSystemConfig.workerConfig?.concurrency,
        processors: taskProcessors.length,
        scheduledTasks: allScheduledTasks.length,
      }),
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
