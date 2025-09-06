/**
 * 文件队列定义
 */

import { Queue } from "bullmq";

import type { FileJobData } from "../types";

import { QUEUE_PREFIX, queueConfigs } from "../config";
import { QUEUE_NAMES } from "../types";

// 创建文件队列实例
export const fileQueue = new Queue<FileJobData>(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.FILE}`,
  queueConfigs.file,
);

// 文件队列任务添加方法
export const addFileJob = async (
  jobName: string,
  data: FileJobData,
  options?: Parameters<typeof fileQueue.add>[2],
) => {
  return fileQueue.add(jobName, data, options);
};

// 文件队列批量添加方法
export const addFileJobs = async (
  jobs: Array<{
    name: string;
    data: FileJobData;
    opts?: Parameters<typeof fileQueue.add>[2];
  }>,
) => {
  return fileQueue.addBulk(jobs);
};
