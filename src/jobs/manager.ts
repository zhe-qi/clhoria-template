/**
 * 队列管理器 - 提供统一的API调用接口
 */

import type { Job } from "bullmq";

import type { JobInfo, JobStatus, QueueInfo, QueueStats } from "./types";

import { allQueues, getQueueByName } from "./queues";

/**
 * 获取所有队列概览
 */
export async function getAllQueuesInfo(): Promise<QueueInfo[]> {
  const queuesInfo: QueueInfo[] = [];

  for (const queue of allQueues) {
    const stats = await getQueueStats(queue.name);
    const isPaused = await queue.isPaused();

    queuesInfo.push({
      name: queue.name.split(":").pop() || queue.name,
      isPaused,
      stats,
    });
  }

  return queuesInfo;
}

/**
 * 获取指定队列详情
 */
export async function getQueueInfo(queueName: string): Promise<QueueInfo | null> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    return null;
  }

  const stats = await getQueueStats(queue.name);
  const isPaused = await queue.isPaused();

  return {
    name: queueName,
    isPaused,
    stats,
  };
}

/**
 * 获取队列统计信息
 */
async function getQueueStats(queueName: string): Promise<QueueStats> {
  const queue = allQueues.find(q => q.name === queueName);
  if (!queue) {
    throw new Error(`队列不存在: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
    queue.isPaused(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    paused: paused ? 1 : 0,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length,
  };
}

/**
 * 获取队列任务列表
 */
export async function getQueueJobs(
  queueName: string,
  status?: JobStatus,
  start = 0,
  limit = 20,
): Promise<JobInfo[]> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`队列不存在: ${queueName}`);
  }

  let jobs: Job[] = [];

  if (status) {
    switch (status) {
      case "waiting":
        jobs = await queue.getWaiting(start, start + limit - 1);
        break;
      case "active":
        jobs = await queue.getActive(start, start + limit - 1);
        break;
      case "completed":
        jobs = await queue.getCompleted(start, start + limit - 1);
        break;
      case "failed":
        jobs = await queue.getFailed(start, start + limit - 1);
        break;
      case "delayed":
        jobs = await queue.getDelayed(start, start + limit - 1);
        break;
      default:
        jobs = await queue.getJobs([status], start, start + limit - 1);
    }
  }
  else {
    // 获取所有状态的任务
    jobs = await queue.getJobs(["waiting", "active", "completed", "failed", "delayed"], start, start + limit - 1);
  }

  return jobs.map(formatJobInfo);
}

/**
 * 获取指定任务详情
 */
export async function getJobInfo(jobId: string): Promise<JobInfo | null> {
  for (const queue of allQueues) {
    const job = await queue.getJob(jobId);
    if (job) {
      return formatJobInfo(job);
    }
  }
  return null;
}

/**
 * 重试失败的任务
 */
export async function retryJob(jobId: string): Promise<boolean> {
  for (const queue of allQueues) {
    const job = await queue.getJob(jobId);
    if (job) {
      try {
        await job.retry();
        return true;
      }
      catch (error) {
        console.error(`重试任务失败 ${jobId}:`, error);
        return false;
      }
    }
  }
  return false;
}

/**
 * 删除任务
 */
export async function removeJob(jobId: string): Promise<boolean> {
  for (const queue of allQueues) {
    const job = await queue.getJob(jobId);
    if (job) {
      try {
        await job.remove();
        return true;
      }
      catch (error) {
        console.error(`删除任务失败 ${jobId}:`, error);
        return false;
      }
    }
  }
  return false;
}

/**
 * 提升延迟任务
 */
export async function promoteJob(jobId: string): Promise<boolean> {
  for (const queue of allQueues) {
    const job = await queue.getJob(jobId);
    if (job) {
      try {
        await job.promote();
        return true;
      }
      catch (error) {
        console.error(`提升任务失败 ${jobId}:`, error);
        return false;
      }
    }
  }
  return false;
}

/**
 * 暂停队列
 */
export async function pauseQueue(queueName: string): Promise<boolean> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    return false;
  }

  try {
    await queue.pause();
    return true;
  }
  catch (error) {
    console.error(`暂停队列失败 ${queueName}:`, error);
    return false;
  }
}

/**
 * 恢复队列
 */
export async function resumeQueue(queueName: string): Promise<boolean> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    return false;
  }

  try {
    await queue.resume();
    return true;
  }
  catch (error) {
    console.error(`恢复队列失败 ${queueName}:`, error);
    return false;
  }
}

/**
 * 清空队列
 */
export async function cleanQueue(queueName: string, grace = 0): Promise<number[]> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`队列不存在: ${queueName}`);
  }

  try {
    // 清理已完成和失败的任务
    const [completedCount, failedCount] = await Promise.all([
      queue.clean(grace, 100, "completed"),
      queue.clean(grace, 100, "failed"),
    ]);

    return [completedCount.length, failedCount.length];
  }
  catch (error) {
    console.error(`清空队列失败 ${queueName}:`, error);
    throw error;
  }
}

/**
 * 格式化任务信息
 */
function formatJobInfo(job: Job): JobInfo {
  return {
    id: job.id!,
    name: job.name,
    data: job.data,
    status: getJobStatus(job),
    progress: job.progress as number || 0,
    attempts: job.attemptsMade,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    timestamp: job.timestamp,
  };
}

/**
 * 获取任务状态
 */
function getJobStatus(job: Job): JobStatus {
  if (job.finishedOn) {
    return job.failedReason ? "failed" : "completed";
  }
  if (job.processedOn) {
    return "active";
  }
  if (job.opts.delay && job.opts.delay > Date.now()) {
    return "delayed";
  }
  return "waiting";
}

/**
 * 获取队列健康状态
 */
export async function getQueueHealth(): Promise<Record<string, unknown>> {
  const health: Record<string, unknown> = {};

  for (const queue of allQueues) {
    const queueName = queue.name.split(":").pop() || queue.name;
    const stats = await getQueueStats(queue.name);

    health[queueName] = {
      status: stats.failed > 10 ? "unhealthy" : "healthy",
      stats,
      isPaused: await queue.isPaused(),
    };
  }

  return health;
}
