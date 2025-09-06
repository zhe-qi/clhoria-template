/* eslint-disable no-console */
/**
 * 调度器统一入口
 */

import {
  getScheduledJobs,
  registerCronJobs,
  removeScheduledJob,
} from "./cron-jobs";

export {
  getScheduledJobs,
  registerCronJobs,
  removeScheduledJob,
};

/**
 * 初始化调度系统
 * 这个函数在每个实例中都可以安全调用
 * upsertJobScheduler 会自动处理重复注册
 */
export async function initializeScheduler(): Promise<void> {
  try {
    console.log("🚀 初始化调度系统...");

    // 注册所有定时任务 - 分布式安全
    await registerCronJobs();

    console.log("✅ 调度系统初始化完成");
  }
  catch (error) {
    console.error("❌ 调度系统初始化失败:", error);
    throw error;
  }
}

/**
 * 获取调度系统状态
 */
export async function getSchedulerStatus() {
  try {
    const jobs = await getScheduledJobs();
    return {
      totalScheduledJobs: jobs.length,
      jobsByQueue: jobs.reduce((acc, job) => {
        acc[job.queue] = (acc[job.queue] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      jobs: jobs.map(job => ({
        id: job.id,
        name: job.name,
        queue: job.queue,
        pattern: job.pattern,
        next: job.next,
      })),
    };
  }
  catch (error) {
    console.error("❌ 获取调度系统状态失败:", error);
    throw error;
  }
}
