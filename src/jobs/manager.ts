import logger from "@/lib/logger";
import { closeBullMQConnection } from "@/lib/redis";

import type { ProcessorRegistration, ScheduledTaskConfig } from "./config";

import { DEFAULT_QUEUE_NAME, jobSystemConfig } from "./config";
import { closeAllQueues, getQueueStatus, pauseQueue, resumeQueue } from "./lib/queue";
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
  if (isInitialized) {
    logger.warn("[任务系统]: 系统已初始化，跳过启动");
    return;
  }

  logger.info("[任务系统]: 开始启动");

  const queueName = jobSystemConfig.queueName || DEFAULT_QUEUE_NAME;

  // 确保队列未暂停(处理服务重启场景)
  await resumeQueue(queueName);

  // 注册处理器
  for (const { name, processor } of processors) {
    registerProcessor(name, processor);
  }

  // 创建 Worker
  createWorker(queueName, jobSystemConfig.workerConfig);

  // 注册定时任务
  if (scheduledTasks?.length) {
    registerScheduledTasks(scheduledTasks);
  }

  isInitialized = true;

  // 检查队列状态
  const queueStatus = await getQueueStatus(queueName);
  logger.info(
    {
      processors: processors.length,
      scheduledTasks: scheduledTasks?.length || 0,
      queueName,
      queueStatus,
    },
    "[任务系统]: 启动完成",
  );
}

/**
 * 停止任务系统
 */
export async function stopJobSystem(): Promise<void> {
  if (!isInitialized) {
    logger.warn("[任务系统]: 系统未初始化，跳过停止");
    return;
  }

  logger.info("[任务系统]: 开始停止");

  // 停止所有定时任务
  stopAllSchedulers();

  // 关闭所有 Worker
  await shutdownWorkers();

  // 关闭所有队列
  await closeAllQueues();

  // 关闭 BullMQ Redis 连接
  await closeBullMQConnection();

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
    Promise.resolve(getAllWorkerStatus()),
    Promise.resolve(getAllScheduledTasksStatus()),
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
    // 检查初始化状态
    if (!isInitialized) {
      return false;
    }

    // 检查队列状态
    const status = await getJobSystemStatus();

    // 确保队列可访问且返回有效数据
    const isQueueHealthy = typeof status.queue.total === "number"
      && !Number.isNaN(status.queue.total);

    return isQueueHealthy;
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

  // 暂停队列（停止接收新任务）
  await pauseQueue(queueName);

  // 等待当前任务完成（最多等待30秒）
  const maxWaitTime = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getQueueStatus(queueName);
    if (status.active === 0) {
      logger.info({ waitTime: Date.now() - startTime }, "[任务系统]: 所有活跃任务已完成");
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const finalStatus = await getQueueStatus(queueName);
  if (finalStatus.active > 0) {
    logger.warn(
      { activeCount: finalStatus.active },
      "[任务系统]: 超时，仍有活跃任务未完成",
    );
  }

  await stopJobSystem();

  logger.info("[任务系统]: 优雅关闭完成");
}
