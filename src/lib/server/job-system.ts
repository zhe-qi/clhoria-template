import { allScheduledTasks, gracefulShutdownJobSystem, startJobSystem, taskProcessors } from "@/jobs";
import logger from "@/lib/logger";

/**
 * 初始化并启动任务系统
 * @param onStartup - 可选的启动后回调函数,用于在任务系统启动后执行自定义逻辑
 */
export async function setupJobSystem(onStartup?: () => Promise<void>): Promise<void> {
  // 启动任务系统
  await startJobSystem(taskProcessors, allScheduledTasks);

  // 执行启动后回调(如果提供)
  if (onStartup) {
    try {
      await onStartup();
    }
    catch (error) {
      logger.warn({ error }, "[任务系统]: 启动回调执行失败");
    }
  }
}

/** 关闭任务系统 */
export async function shutdownJobSystem(): Promise<void> {
  await gracefulShutdownJobSystem();
  logger.info("[任务系统]: 已关闭");
}
