/**
 * 用户队列定义
 */

import { Queue } from "bullmq";

import type { UserJobData } from "../types";

import { QUEUE_PREFIX, queueConfigs } from "../config";
import { QUEUE_NAMES } from "../types";

// 创建用户队列实例
export const userQueue = new Queue<UserJobData>(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.USER}`,
  queueConfigs.user,
);

// 用户队列任务添加方法
export const addUserJob = async (
  jobName: string,
  data: UserJobData,
  options?: Parameters<typeof userQueue.add>[2],
) => {
  return userQueue.add(jobName, data, options);
};

// 用户队列批量添加方法
export const addUserJobs = async (
  jobs: Array<{
    name: string;
    data: UserJobData;
    opts?: Parameters<typeof userQueue.add>[2];
  }>,
) => {
  return userQueue.addBulk(jobs);
};
