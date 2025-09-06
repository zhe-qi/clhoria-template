/**
 * 邮件队列定义
 */

import { Queue } from "bullmq";

import type { EmailJobData } from "../types";

import { QUEUE_PREFIX, queueConfigs } from "../config";
import { QUEUE_NAMES } from "../types";

// 创建邮件队列实例
export const emailQueue = new Queue<EmailJobData>(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.EMAIL}`,
  queueConfigs.email,
);

// 邮件队列任务添加方法
export const addEmailJob = async (
  jobName: string,
  data: EmailJobData,
  options?: Parameters<typeof emailQueue.add>[2],
) => {
  return emailQueue.add(jobName, data, options);
};

// 邮件队列批量添加方法
export const addEmailJobs = async (
  jobs: Array<{
    name: string;
    data: EmailJobData;
    opts?: Parameters<typeof emailQueue.add>[2];
  }>,
) => {
  return emailQueue.addBulk(jobs);
};
