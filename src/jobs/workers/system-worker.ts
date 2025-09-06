/**
 * 系统Worker - 任务消费处理
 */

import { Worker } from "bullmq";

import logger from "@/lib/logger";

import { QUEUE_PREFIX, workerConfigs } from "../config";
import {
  generateSystemReport,
  performDatabaseBackup,
  performSystemCleanup,
  performSystemMaintenance,
} from "../processors/system";
import { QUEUE_NAMES } from "../types";

// 创建系统Worker
export const systemWorker = new Worker(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.SYSTEM}`,
  async (job) => {
    logger.info(`[系统]: 开始处理任务 ${job.name}, ID: ${job.id}`);

    // 根据任务名称路由到不同的处理函数
    switch (job.name) {
      case "backup":
        await performDatabaseBackup(job);
        break;

      case "cleanup":
        await performSystemCleanup(job);
        break;

      case "report":
        await generateSystemReport(job);
        break;

      case "maintenance":
        await performSystemMaintenance(job);
        break;

      default:
        logger.warn(`[系统]: 未知的任务类型 ${job.name}, ID: ${job.id}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    logger.info(`[系统]: 完成任务 ${job.name}, ID: ${job.id}`);
  },
  workerConfigs.system,
);

// Worker事件监听
systemWorker.on("completed", (job) => {
  logger.info(`[系统]: 任务完成 ${job.name}, ID: ${job.id}`);
});

systemWorker.on("failed", (job, err) => {
  logger.error(`[系统]: 任务失败 ${job?.name}, ID: ${job?.id}, 错误: ${err.message}`);
});

systemWorker.on("progress", (job, progress) => {
  if (Number(progress) % 25 === 0) { // 只在25%增量时记录进度
    logger.info(`[系统]: 任务进度 ${job.name} - ${progress}%, ID: ${job.id}`);
  }
});

systemWorker.on("error", (err) => {
  logger.error(`[系统]: Worker错误 - ${err.message}`);
});

// 优雅关闭
process.on("SIGINT", async () => {
  logger.info("[系统]: 正在关闭Worker...");
  await systemWorker.close();
  logger.info("[系统]: Worker已关闭");
});

process.on("SIGTERM", async () => {
  logger.info("[系统]: 正在关闭Worker...");
  await systemWorker.close();
  logger.info("[系统]: Worker已关闭");
});
