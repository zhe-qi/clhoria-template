import logger from "@/lib/logger";

import type { ProcessorRegistration, ScheduledTaskConfig } from "./config";

import { DEFAULT_QUEUE_NAME, jobSystemConfig } from "./config";
import { closeAllQueues, getQueueStatus, pauseQueue } from "./lib/queue";
import { getAllScheduledTasksStatus, registerScheduledTasks, stopAllSchedulers } from "./lib/scheduler";
import { createWorker, getAllWorkerStatus, registerProcessor, shutdownWorkers } from "./lib/worker";

// ============ 系统状态 ============
let isInitialized = false;

// ============ 生命周期管理 ============

/**
 * 启动任务系统
 */
export async function startJobSystem(
  processors: ProcessorRegistration[],
  scheduledTasks?: ScheduledTaskConfig[],
): Promise<void> {
  if (isInitialized)
    return;

  logger.info("[任务系统]: 开始启动");

  // 注册处理器
  for (const { name, processor } of processors) {
    registerProcessor(name, processor);
  }

  // 创建 Worker
  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;
  createWorker(queueName, jobSystemConfig.workerConfig);

  // 注册定时任务
  if (scheduledTasks?.length) {
    registerScheduledTasks(scheduledTasks);
  }

  isInitialized = true;

  logger.info({
    processors: processors.length,
    scheduledTasks: scheduledTasks?.length || 0,
    queueName,
  }, "[任务系统]: 启动完成");
}

/**
 * 停止任务系统
 */
export async function stopJobSystem(): Promise<void> {
  logger.info("[任务系统]: 开始停止");

  stopAllSchedulers();
  await shutdownWorkers();
  await closeAllQueues();

  isInitialized = false;

  logger.info("[任务系统]: 停止完成");
}

/**
 * 获取系统状态
 */
export async function getJobSystemStatus() {
  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;

  const [queueStatus, workerStatus, schedulerStatus] = await Promise.all([
    getQueueStatus(queueName),
    getAllWorkerStatus(),
    getAllScheduledTasksStatus(),
  ]);

  return {
    initialized: isInitialized,
    queue: queueStatus,
    workers: workerStatus,
    schedulers: schedulerStatus,
  };
}

/**
 * 健康检查
 */
export async function jobSystemHealthCheck(): Promise<boolean> {
  try {
    const status = await getJobSystemStatus();
    return isInitialized && status.queue.total >= 0;
  }
  catch (error) {
    logger.error({ error }, "[任务系统]: 健康检查失败");
    return false;
  }
}

/**
 * 优雅关闭
 * 用于应用退出时调用
 */
export async function gracefulShutdownJobSystem(): Promise<void> {
  logger.info("[任务系统]: 开始优雅关闭");

  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;
  await pauseQueue(queueName);

  // 等待当前任务完成（最多等待30秒）
  const maxWaitTime = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getQueueStatus(queueName);
    if (status.active === 0)
      break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await stopJobSystem();

  logger.info("[任务系统]: 优雅关闭完成");
}
