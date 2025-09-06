/* eslint-disable no-console */
/**
 * 用户Worker - 任务消费处理
 */

import { Worker } from "bullmq";

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
    console.log(`用户Worker开始处理任务: ${job.name} (ID: ${job.id})`);

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
        console.warn(`未知的用户任务类型: ${job.name}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    console.log(`用户Worker完成任务: ${job.name} (ID: ${job.id})`);
  },
  workerConfigs.user,
);

// Worker事件监听
userWorker.on("completed", (job) => {
  console.log(`✅ 用户任务完成: ${job.name} (ID: ${job.id})`);
});

userWorker.on("failed", (job, err) => {
  console.error(`❌ 用户任务失败: ${job?.name} (ID: ${job?.id})`, err.message);
});

userWorker.on("progress", (job, progress) => {
  console.log(`📈 用户任务进度: ${job.name} - ${progress}%`);
});

userWorker.on("error", (err) => {
  console.error("👤 用户Worker错误:", err);
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("👤 正在关闭用户Worker...");
  await userWorker.close();
  console.log("👤 用户Worker已关闭");
});

process.on("SIGTERM", async () => {
  console.log("👤 正在关闭用户Worker...");
  await userWorker.close();
  console.log("👤 用户Worker已关闭");
});
