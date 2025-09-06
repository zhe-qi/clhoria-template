/**
 * 系统队列定义
 */

import { Queue } from "bullmq";

import type { SystemJobData } from "../types";

import { QUEUE_PREFIX, queueConfigs } from "../config";
import { QUEUE_NAMES } from "../types";

// 创建系统队列实例
export const systemQueue = new Queue<SystemJobData>(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.SYSTEM}`,
  queueConfigs.system,
);

// 系统队列任务添加方法
export const addSystemJob = async (
  jobName: string,
  data: SystemJobData,
  options?: Parameters<typeof systemQueue.add>[2],
) => {
  return systemQueue.add(jobName, data, options);
};

// 系统队列批量添加方法
export const addSystemJobs = async (
  jobs: Array<{
    name: string;
    data: SystemJobData;
    opts?: Parameters<typeof systemQueue.add>[2];
  }>,
) => {
  return systemQueue.addBulk(jobs);
};
