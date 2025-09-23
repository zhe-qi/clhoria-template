import type { Job } from "bullmq";

import logger from "@/lib/logger";

/**
 * 文件处理任务处理器示例
 */

interface FileProcessData {
  filePath: string;
  operation: "compress" | "resize" | "convert";
  options?: Record<string, any>;
}

/**
 * 文件处理器
 */
export async function processFileProcessor(job: Job<FileProcessData>) {
  const { filePath, operation, options } = job.data;

  logger.info(
    { jobId: job.id, filePath, operation },
    "[文件]: 开始处理",
  );

  // 更新进度
  await job.updateProgress(10);

  // 根据操作类型处理文件
  switch (operation) {
    case "compress":
      await compressFile(job, filePath, options);
      break;
    case "resize":
      await resizeFile(job, filePath, options);
      break;
    case "convert":
      await convertFile(job, filePath, options);
      break;
    default:
      throw new Error(`不支持的操作类型: ${operation}`);
  }

  // 更新进度
  await job.updateProgress(100);

  logger.info(
    { jobId: job.id, filePath, operation },
    "[文件]: 处理完成",
  );

  return {
    success: true,
    filePath,
    operation,
    processedAt: new Date().toISOString(),
  };
}

/**
 * 压缩文件
 */
async function compressFile(
  job: Job,
  filePath: string,
  options?: Record<string, any>,
) {
  logger.info({ filePath, options }, "[文件]: 压缩文件");

  // 模拟压缩过程
  await job.updateProgress(30);
  await new Promise(resolve => setTimeout(resolve, 500));

  await job.updateProgress(60);
  await new Promise(resolve => setTimeout(resolve, 500));

  await job.updateProgress(90);
}

/**
 * 调整文件大小
 */
async function resizeFile(
  job: Job,
  filePath: string,
  options?: Record<string, any>,
) {
  logger.info({ filePath, options }, "[文件]: 调整大小");

  // 模拟调整大小过程
  await job.updateProgress(50);
  await new Promise(resolve => setTimeout(resolve, 800));

  await job.updateProgress(90);
}

/**
 * 转换文件格式
 */
async function convertFile(
  job: Job,
  filePath: string,
  options?: Record<string, any>,
) {
  logger.info({ filePath, options }, "[文件]: 转换格式");

  // 模拟转换过程
  await job.updateProgress(25);
  await new Promise(resolve => setTimeout(resolve, 400));

  await job.updateProgress(50);
  await new Promise(resolve => setTimeout(resolve, 400));

  await job.updateProgress(75);
  await new Promise(resolve => setTimeout(resolve, 400));

  await job.updateProgress(90);
}

/**
 * 清理临时文件处理器
 */
export async function cleanupTempFilesProcessor(job: Job<{ directory: string; olderThanDays: number }>) {
  const { directory, olderThanDays } = job.data;

  logger.info(
    { jobId: job.id, directory, olderThanDays },
    "[文件]: 开始清理临时文件",
  );

  // 模拟清理过程
  await job.updateProgress(50);
  await new Promise(resolve => setTimeout(resolve, 1000));

  const deletedCount = Math.floor(Math.random() * 100);

  await job.updateProgress(100);

  logger.info(
    { jobId: job.id, deletedCount },
    "[文件]: 清理完成",
  );

  return {
    success: true,
    directory,
    deletedCount,
    cleanedAt: new Date().toISOString(),
  };
}
