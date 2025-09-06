/**
 * 任务系统统一入口
 */

import logger from "@/lib/logger";
// 导入系统任务同步
import {
  removeAllSystemTasksFromBullMQ,
  syncSystemTasksToDatabase,
} from "@/services/system-task-sync";

// 导入调度器
import {
  getScheduledJobs,
  getSchedulerStatus,
  initializeScheduler,
  removeScheduledJob,
} from "./schedulers";
// 导出队列相关
// 导入Workers管理
import {
  getWorkersStatus,
  pauseAllWorkers,
  resumeAllWorkers,
  startAllWorkers,
  stopAllWorkers,
} from "./workers";

// 导出管理器API
export * from "./manager";
export * from "./queues";

// 重新导出
export {
  getScheduledJobs,
  getSchedulerStatus,
  getWorkersStatus,
  initializeScheduler,
  pauseAllWorkers,
  removeScheduledJob,
  resumeAllWorkers,
  startAllWorkers,
  stopAllWorkers,
};

export * from "./types";

/**
 * 初始化整个任务系统
 * 在应用启动时调用，每个实例都可以安全调用
 */
export async function initializeJobSystem(): Promise<void> {
  try {
    logger.info("[任务系统]: 初始化任务系统");

    // 1. 启动所有Workers
    await startAllWorkers();

    // 2. 初始化调度器 (分布式安全)
    await initializeScheduler();

    // 3. 同步系统定时任务到数据库
    await syncSystemTasksToDatabase();

    logger.info("[任务系统]: 初始化完成");
  }
  catch (error) {
    logger.error(`[任务系统]: 初始化失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 优雅关闭任务系统
 * 在应用关闭时调用
 */
export async function shutdownJobSystem(): Promise<void> {
  try {
    logger.info("[任务系统]: 正在关闭");

    // 1. 清理系统定时任务的 BullMQ 调度
    await removeAllSystemTasksFromBullMQ();

    // 2. 停止所有Workers
    await stopAllWorkers();

    logger.info("[任务系统]: 已关闭");
  }
  catch (error) {
    logger.error(`[任务系统]: 关闭失败 - ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 获取任务系统状态
 */
export async function getJobSystemStatus() {
  try {
    const [workersStatus, schedulerStatus] = await Promise.all([
      getWorkersStatus(),
      getSchedulerStatus(),
    ]);

    return {
      workers: workersStatus,
      scheduler: schedulerStatus,
      timestamp: Date.now(),
    };
  }
  catch (error) {
    logger.error(`[任务系统]: 获取状态失败 - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
