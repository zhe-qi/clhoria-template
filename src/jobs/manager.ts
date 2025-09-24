import logger from "@/lib/logger";

import type { JobSystemConfig, ProcessorRegistration, ScheduledTaskConfig } from "./types";

import { DEFAULT_QUEUE_NAME } from "./config";
import { QueueManager } from "./core/queue";
import { TaskScheduler } from "./core/scheduler";
import { WorkerManager } from "./core/worker";

// 任务系统状态
let isInitialized = false;
let jobSystemConfig: JobSystemConfig = {};

/**
 * 初始化任务系统
 */
export async function initializeJobSystem(config?: JobSystemConfig): Promise<void> {
  if (isInitialized) {
    return;
  }

  jobSystemConfig = config || {};
  isInitialized = true;

  logger.info(jobSystemConfig, "[任务系统]: 初始化完成");
}

/**
 * 启动任务系统
 */
export async function startJobSystem(
  processors: ProcessorRegistration[],
  scheduledTasks?: ScheduledTaskConfig[],
): Promise<void> {
  if (!isInitialized) {
    await initializeJobSystem();
  }

  logger.info("[任务系统]: 开始启动");

  // 注册处理器
  processors.forEach(({ name, processor }) => {
    WorkerManager.registerProcessor(name, processor);
  });

  logger.info(
    { count: processors.length },
    "[任务系统]: 处理器注册完成",
  );

  // 为队列创建单个 Worker
  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;
  WorkerManager.createWorker(queueName, jobSystemConfig.workerConfig);

  logger.info(
    { queueName },
    "[任务系统]: Worker 创建完成",
  );

  // 注册定时任务
  if (scheduledTasks && scheduledTasks.length > 0) {
    TaskScheduler.registerScheduledTasks(scheduledTasks);
    logger.info(
      { count: scheduledTasks.length },
      "[任务系统]: 定时任务注册完成",
    );
  }

  logger.info("[任务系统]: 启动完成");
}

/**
 * 停止任务系统
 */
export async function stopJobSystem(): Promise<void> {
  logger.info("[任务系统]: 开始停止");

  // 停止所有定时任务
  TaskScheduler.stopAll();

  // 优雅关闭所有 Worker
  await WorkerManager.shutdown();

  // 关闭所有队列连接
  await QueueManager.closeAll();

  isInitialized = false;

  logger.info("[任务系统]: 停止完成");
}

/**
 * 获取系统状态
 */
export async function getJobSystemStatus() {
  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;

  const [queueStatus, workerStatus, schedulerStatus] = await Promise.all([
    QueueManager.getQueueStatus(queueName),
    WorkerManager.getAllWorkerStatus(),
    TaskScheduler.getAllScheduledTasksStatus(),
  ]);

  return {
    initialized: isInitialized,
    config: jobSystemConfig,
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

  // 暂停所有队列，不再接收新任务
  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;
  await QueueManager.pauseQueue(queueName);

  // 等待当前任务完成（最多等待30秒）
  const maxWaitTime = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await QueueManager.getQueueStatus(queueName);
    if (status.active === 0) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 停止系统
  await stopJobSystem();

  logger.info("[任务系统]: 优雅关闭完成");
}
