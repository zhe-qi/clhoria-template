/**
 * 文件Worker - 任务消费处理
 */

import { Worker } from "bullmq";

import logger from "@/lib/logger";

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
    logger.info(`[文件]: 开始处理任务 ${job.name}, ID: ${job.id}`);

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
        logger.warn(`[文件]: 未知的任务类型 ${job.name}, ID: ${job.id}`);
        throw new Error(`未支持的任务类型: ${job.name}`);
    }

    logger.info(`[文件]: 完成任务 ${job.name}, ID: ${job.id}`);
  },
  workerConfigs.file,
);

// Worker事件监听
fileWorker.on("completed", (job) => {
  logger.info(`[文件]: 任务完成 ${job.name}, ID: ${job.id}`);
});

fileWorker.on("failed", (job, err) => {
  logger.error(`[文件]: 任务失败 ${job?.name}, ID: ${job?.id}, 错误: ${err.message}`);
});

fileWorker.on("progress", (job, progress) => {
  if (Number(progress) % 25 === 0) { // 只在25%增量时记录进度
    logger.info(`[文件]: 任务进度 ${job.name} - ${progress}%, ID: ${job.id}`);
  }
});

fileWorker.on("error", (err) => {
  logger.error(`[文件]: Worker错误 - ${err.message}`);
});
