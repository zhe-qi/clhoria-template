/* eslint-disable no-console */
/**
 * 文件Worker - 任务消费处理
 */

import { Worker } from "bullmq";

import { QUEUE_PREFIX, workerConfigs } from "../config";
import {
  compressFile,
  convertFile,
  deleteFile,
  processBatchFiles,
  uploadFile,
} from "../processors/file";
import { QUEUE_NAMES } from "../types";

// 创建文件Worker
export const fileWorker = new Worker(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.FILE}`,
  async (job) => {
    console.log(`文件Worker开始处理任务: ${job.name} (ID: ${job.id})`);

    // 根据任务名称路由到不同的处理函数
    switch (job.name) {
      case "compress":
        await compressFile(job);
        break;

      case "convert":
        await convertFile(job);
        break;

      case "upload":
        await uploadFile(job);
        break;

      case "delete":
        await deleteFile(job);
        break;

      case "batch":
        await processBatchFiles(job);
        break;

      default:
        console.warn(`未知的文件任务类型: ${job.name}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    console.log(`文件Worker完成任务: ${job.name} (ID: ${job.id})`);
  },
  workerConfigs.file,
);

// Worker事件监听
fileWorker.on("completed", (job) => {
  console.log(`✅ 文件任务完成: ${job.name} (ID: ${job.id})`);
});

fileWorker.on("failed", (job, err) => {
  console.error(`❌ 文件任务失败: ${job?.name} (ID: ${job?.id})`, err.message);
});

fileWorker.on("progress", (job, progress) => {
  console.log(`📈 文件任务进度: ${job.name} - ${progress}%`);
});

fileWorker.on("error", (err) => {
  console.error("📁 文件Worker错误:", err);
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("📁 正在关闭文件Worker...");
  await fileWorker.close();
  console.log("📁 文件Worker已关闭");
});

process.on("SIGTERM", async () => {
  console.log("📁 正在关闭文件Worker...");
  await fileWorker.close();
  console.log("📁 文件Worker已关闭");
});
