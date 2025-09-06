/* eslint-disable no-console */
/**
 * 系统Worker - 任务消费处理
 */

import { Worker } from "bullmq";

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
    console.log(`系统Worker开始处理任务: ${job.name} (ID: ${job.id})`);

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
        console.warn(`未知的系统任务类型: ${job.name}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    console.log(`系统Worker完成任务: ${job.name} (ID: ${job.id})`);
  },
  workerConfigs.system,
);

// Worker事件监听
systemWorker.on("completed", (job) => {
  console.log(`✅ 系统任务完成: ${job.name} (ID: ${job.id})`);
});

systemWorker.on("failed", (job, err) => {
  console.error(`❌ 系统任务失败: ${job?.name} (ID: ${job?.id})`, err.message);
});

systemWorker.on("progress", (job, progress) => {
  console.log(`📈 系统任务进度: ${job.name} - ${progress}%`);
});

systemWorker.on("error", (err) => {
  console.error("⚙️ 系统Worker错误:", err);
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("⚙️ 正在关闭系统Worker...");
  await systemWorker.close();
  console.log("⚙️ 系统Worker已关闭");
});

process.on("SIGTERM", async () => {
  console.log("⚙️ 正在关闭系统Worker...");
  await systemWorker.close();
  console.log("⚙️ 系统Worker已关闭");
});
