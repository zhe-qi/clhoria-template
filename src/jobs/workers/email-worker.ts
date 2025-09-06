/* eslint-disable no-console */
/**
 * 邮件Worker - 任务消费处理
 */

import { Worker } from "bullmq";

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
    console.log(`邮件Worker开始处理任务: ${job.name} (ID: ${job.id})`);

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
        console.warn(`未知的邮件任务类型: ${job.name}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    console.log(`邮件Worker完成任务: ${job.name} (ID: ${job.id})`);
  },
  workerConfigs.email,
);

// Worker事件监听
emailWorker.on("completed", (job) => {
  console.log(`✅ 邮件任务完成: ${job.name} (ID: ${job.id})`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`❌ 邮件任务失败: ${job?.name} (ID: ${job?.id})`, err.message);
});

emailWorker.on("progress", (job, progress) => {
  console.log(`📈 邮件任务进度: ${job.name} - ${progress}%`);
});

emailWorker.on("error", (err) => {
  console.error("📧 邮件Worker错误:", err);
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("📧 正在关闭邮件Worker...");
  await emailWorker.close();
  console.log("📧 邮件Worker已关闭");
});

process.on("SIGTERM", async () => {
  console.log("📧 正在关闭邮件Worker...");
  await emailWorker.close();
  console.log("📧 邮件Worker已关闭");
});
