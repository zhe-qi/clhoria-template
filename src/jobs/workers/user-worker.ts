/**
 * 用户Worker - 任务消费处理
 */

import { Worker } from "bullmq";

import logger from "@/lib/logger";

import { QUEUE_PREFIX, workerConfigs } from "../config";
import {
  processBatchUsers,
  processUserCleanup,
  processUserExport,
  processUserNotification,
  processUserWelcome,
} from "../processors/user";
import { QUEUE_NAMES } from "../types";

// 创建用户Worker
export const userWorker = new Worker(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.USER}`,
  async (job) => {
    logger.info(`[用户]: 开始处理任务 ${job.name}, ID: ${job.id}`);

    // 根据任务名称路由到不同的处理函数
    switch (job.name) {
      case "welcome":
        await processUserWelcome(job);
        break;

      case "notification":
        await processUserNotification(job);
        break;

      case "cleanup":
        await processUserCleanup(job);
        break;

      case "export":
        await processUserExport(job);
        break;

      case "batch":
        await processBatchUsers(job);
        break;

      default:
        logger.warn(`[用户]: 未知的任务类型 ${job.name}, ID: ${job.id}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    logger.info(`[用户]: 完成任务 ${job.name}, ID: ${job.id}`);
  },
  workerConfigs.user,
);

// Worker事件监听
userWorker.on("completed", (job) => {
  logger.info(`[用户]: 任务完成 ${job.name}, ID: ${job.id}`);
});

userWorker.on("failed", (job, err) => {
  logger.error(`[用户]: 任务失败 ${job?.name}, ID: ${job?.id}, 错误: ${err.message}`);
});

userWorker.on("progress", (job, progress) => {
  if (Number(progress) % 25 === 0) { // 只在25%增量时记录进度
    logger.info(`[用户]: 任务进度 ${job.name} - ${progress}%, ID: ${job.id}`);
  }
});

userWorker.on("error", (err) => {
  logger.error(`[用户]: Worker错误 - ${err.message}`);
});

// 优雅关闭
process.on("SIGINT", async () => {
  logger.info("[用户]: 正在关闭Worker...");
  await userWorker.close();
  logger.info("[用户]: Worker已关闭");
});

process.on("SIGTERM", async () => {
  logger.info("[用户]: 正在关闭Worker...");
  await userWorker.close();
  logger.info("[用户]: Worker已关闭");
});
