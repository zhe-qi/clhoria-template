/**
 * 邮件Worker - 任务消费处理
 */

import { Worker } from "bullmq";

import logger from "@/lib/logger";

import { QUEUE_PREFIX, workerConfigs } from "../config";
import {
  sendBulkEmail,
  sendNotificationEmail,
  sendSystemEmail,
  sendWelcomeEmail,
} from "../processors/email";
import { QUEUE_NAMES } from "../types";

// 创建邮件Worker
export const emailWorker = new Worker(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.EMAIL}`,
  async (job) => {
    logger.info(`[邮件]: 开始处理任务 ${job.name}, ID: ${job.id}`);

    // 根据任务名称路由到不同的处理函数
    switch (job.name) {
      case "welcome":
        await sendWelcomeEmail(job);
        break;

      case "notification":
        await sendNotificationEmail(job);
        break;

      case "system":
        await sendSystemEmail(job);
        break;

      case "bulk":
        await sendBulkEmail(job);
        break;

      default:
        logger.warn(`[邮件]: 未知的任务类型 ${job.name}, ID: ${job.id}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    logger.info(`[邮件]: 完成任务 ${job.name}, ID: ${job.id}`);
  },
  workerConfigs.email,
);

// Worker事件监听
emailWorker.on("completed", (job) => {
  logger.info(`[邮件]: 任务完成 ${job.name}, ID: ${job.id}`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`[邮件]: 任务失败 ${job?.name}, ID: ${job?.id}, 错误: ${err.message}`);
});

emailWorker.on("progress", (job, progress) => {
  if (Number(progress) % 25 === 0) { // 只在25%增量时记录进度
    logger.info(`[邮件]: 任务进度 ${job.name} - ${progress}%, ID: ${job.id}`);
  }
});

emailWorker.on("error", (err) => {
  logger.error(`[邮件]: Worker错误 - ${err.message}`);
});

// 优雅关闭
process.on("SIGINT", async () => {
  logger.info("[邮件]: 正在关闭Worker...");
  await emailWorker.close();
  logger.info("[邮件]: Worker已关闭");
});

process.on("SIGTERM", async () => {
  logger.info("[邮件]: 正在关闭Worker...");
  await emailWorker.close();
  logger.info("[邮件]: Worker已关闭");
});
