/**
 * 队列统一导出
 */

// 导出所有队列实例
// 导出队列数组 - 用于统一管理
import { emailQueue } from "./email-queue";
import { fileQueue } from "./file-queue";
import { systemQueue } from "./system-queue";
import { userQueue } from "./user-queue";

export { addEmailJob, addEmailJobs, emailQueue } from "./email-queue";
export { addFileJob, addFileJobs, fileQueue } from "./file-queue";
export { addSystemJob, addSystemJobs, systemQueue } from "./system-queue";
export { addUserJob, addUserJobs, userQueue } from "./user-queue";

export const allQueues = [
  emailQueue,
  fileQueue,
  userQueue,
  systemQueue,
];

// 根据名称获取队列实例
export const getQueueByName = (name: string) => {
  return allQueues.find(queue => queue.name.endsWith(`:${name}`));
};
