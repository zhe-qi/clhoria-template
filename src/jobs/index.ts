/* eslint-disable no-console */
/**
 * 任务系统统一入口
 */

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
    console.log("🚀 初始化任务系统...");

    // 1. 启动所有Workers
    console.log("📡 启动Workers...");
    await startAllWorkers();

    // 2. 初始化调度器 (分布式安全)
    console.log("⏰ 初始化调度器...");
    await initializeScheduler();

    console.log("✅ 任务系统初始化完成");
  }
  catch (error) {
    console.error("❌ 任务系统初始化失败:", error);
    throw error;
  }
}

/**
 * 优雅关闭任务系统
 * 在应用关闭时调用
 */
export async function shutdownJobSystem(): Promise<void> {
  try {
    console.log("🛑 正在关闭任务系统...");

    // 停止所有Workers
    await stopAllWorkers();

    console.log("✅ 任务系统已关闭");
  }
  catch (error) {
    console.error("❌ 任务系统关闭失败:", error);
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
    console.error("❌ 获取任务系统状态失败:", error);
    throw error;
  }
}
