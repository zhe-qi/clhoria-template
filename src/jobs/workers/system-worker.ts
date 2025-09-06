/**
 * 系统Worker - 任务消费处理
 */

import type { Job } from "bullmq";

import { Worker } from "bullmq";

import logger from "@/lib/logger";
import { logTaskExecution, updateTaskStatistics } from "@/services/system-task-sync";
import { formatDate } from "@/utils/tools/formatter";

import { QUEUE_PREFIX, workerConfigs } from "../config";
import {
  generateSystemReport,
  performDatabaseBackup,
  performSystemCleanup,
  performSystemMaintenance,
} from "../processors/system";
import { QUEUE_NAMES } from "../types";

// 创建系统Worker
export const systemWorker = new Worker(
  `${QUEUE_PREFIX}-${QUEUE_NAMES.SYSTEM}`,
  async (job: Job) => {
    const scheduledJobId = job.data._scheduledJobId;
    const taskName = job.data._taskName || job.name;
    const startTime = formatDate(new Date());
    let executionLogId: string | undefined;

    try {
      logger.info(`[系统]: 开始处理任务 ${taskName}, ID: ${job.id}`);

      // 记录任务开始执行
      if (scheduledJobId) {
        executionLogId = await logTaskExecution(
          scheduledJobId,
          job.id as string,
          "running",
          {
            startedAt: startTime,
            progress: 0,
            progressDescription: "任务开始执行",
          },
        );
      }

      // 根据任务名称路由到不同的处理函数
      let result: any;
      switch (job.name) {
        case "backup":
          result = await performDatabaseBackup(job);
          break;

        case "cleanup":
          result = await performSystemCleanup(job);
          break;

        case "report":
          result = await generateSystemReport(job);
          break;

        case "maintenance":
          result = await performSystemMaintenance(job);
          break;

        default: {
          const errorMsg = `未支持的任务类型: ${job.name}`;
          logger.warn(`[系统]: 未知的任务类型 ${job.name}, ID: ${job.id}`);

          // 记录失败状态
          if (scheduledJobId && executionLogId) {
            await logTaskExecution(
              scheduledJobId,
              job.id as string,
              "failed",
              {
                completedAt: formatDate(new Date()),
                durationMs: Date.now() - new Date(startTime).getTime(),
                errorMessage: errorMsg,
              },
            );
            await updateTaskStatistics(scheduledJobId, false, formatDate(new Date()));
          }

          throw new Error(errorMsg);
        }
      }

      const endTime = formatDate(new Date());
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      // 记录任务成功完成
      if (scheduledJobId) {
        await logTaskExecution(
          scheduledJobId,
          job.id as string,
          "success",
          {
            completedAt: endTime,
            durationMs: duration,
            resultData: result || {},
            progress: 100,
            progressDescription: "任务完成",
          },
        );
        await updateTaskStatistics(scheduledJobId, true, endTime);
      }

      logger.info(`[系统]: 完成任务 ${taskName}, ID: ${job.id}, 耗时: ${duration}ms`);
      return result;
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const endTime = formatDate(new Date());
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      // 记录任务失败
      if (scheduledJobId) {
        await logTaskExecution(
          scheduledJobId,
          job.id as string,
          "failed",
          {
            completedAt: endTime,
            durationMs: duration,
            errorMessage,
            errorStack: error instanceof Error ? error.stack : undefined,
            progress: 0,
            progressDescription: "任务失败",
          },
        );
        await updateTaskStatistics(scheduledJobId, false, endTime);
      }

      logger.error(`[系统]: 任务失败 ${taskName}, ID: ${job.id}, 错误: ${errorMessage}`);
      throw error;
    }
  },
  workerConfigs.system,
);

// Worker事件监听
systemWorker.on("completed", (job) => {
  const taskName = job.data._taskName || job.name;
  logger.info(`[系统]: 任务完成事件 ${taskName}, ID: ${job.id}`);
});

systemWorker.on("failed", (job, err) => {
  const taskName = job?.data?._taskName || job?.name;
  logger.error(`[系统]: 任务失败事件 ${taskName}, ID: ${job?.id}, 错误: ${err.message}`);
});

systemWorker.on("progress", async (job, progress) => {
  const scheduledJobId = job.data._scheduledJobId;
  const taskName = job.data._taskName || job.name;

  // 只在25%增量时记录进度
  if (typeof progress === "number" && progress % 25 === 0) {
    logger.info(`[系统]: 任务进度 ${taskName} - ${progress}%, ID: ${job.id}`);

    // 更新进度到数据库
    if (scheduledJobId) {
      try {
        await logTaskExecution(
          scheduledJobId,
          job.id as string,
          "running",
          {
            progress: progress as number,
            progressDescription: `执行进度: ${progress}%`,
          },
        );
      }
      catch (error) {
        logger.error(`[系统]: 更新进度失败 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
});

systemWorker.on("error", (err) => {
  logger.error(`[系统]: Worker错误 - ${err.message}`);
});
