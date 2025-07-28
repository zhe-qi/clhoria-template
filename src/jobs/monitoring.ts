import type { Job } from "bullmq";

import { and, desc, eq, gte, lt } from "drizzle-orm";

import db from "@/db";
import { sysJobExecutionLogs } from "@/db/schema";
import { logger } from "@/lib/logger";

import type { JobResult } from "./types";

/** 任务监控和日志管理器 */
export class JobMonitor {
  /** 记录任务开始执行 */
  async logJobStart(job: Job): Promise<void> {
    try {
      await db.insert(sysJobExecutionLogs).values({
        jobId: this.extractJobConfigId(job),
        executionId: job.id || "unknown",
        status: "active",
        startedAt: new Date().toISOString(),
        createdBy: "system",
        updatedBy: "system",
      });

      logger.debug("任务开始日志记录成功", {
        jobId: job.id,
        jobName: job.name,
      });
    }
    catch (error) {
      logger.error("记录任务开始日志失败", {
        jobId: job.id,
        error,
      });
    }
  }

  /** 记录任务执行完成 */
  async logJobCompletion(job: Job, result: JobResult): Promise<void> {
    try {
      const duration = job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : null;

      await db
        .update(sysJobExecutionLogs)
        .set({
          status: "completed",
          finishedAt: new Date().toISOString(),
          durationMs: duration,
          result,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        })
        .where(and(
          eq(sysJobExecutionLogs.jobId, this.extractJobConfigId(job)),
          eq(sysJobExecutionLogs.executionId, job.id || "unknown"),
        ));

      logger.debug("任务完成日志记录成功", {
        jobId: job.id,
        jobName: job.name,
        duration,
        result,
      });
    }
    catch (error) {
      logger.error("记录任务完成日志失败", {
        jobId: job.id,
        error,
      });
    }
  }

  /** 记录任务执行失败 */
  async logJobFailure(job: Job, error: Error): Promise<void> {
    try {
      const duration = job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : null;

      await db
        .update(sysJobExecutionLogs)
        .set({
          status: "failed",
          finishedAt: new Date().toISOString(),
          durationMs: duration,
          errorMessage: error.message,
          retryCount: job.attemptsMade,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        })
        .where(and(
          eq(sysJobExecutionLogs.jobId, this.extractJobConfigId(job)),
          eq(sysJobExecutionLogs.executionId, job.id || "unknown"),
        ));

      logger.debug("任务失败日志记录成功", {
        jobId: job.id,
        jobName: job.name,
        duration,
        error: error.message,
        retryCount: job.attemptsMade,
      });
    }
    catch (dbError) {
      logger.error("记录任务失败日志时出错", {
        jobId: job.id,
        originalError: error.message,
        dbError,
      });
    }
  }

  /** 获取任务执行历史 */
  async getJobExecutionHistory(
    jobId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    try {
      const { limit = 50, offset = 0, status, startDate, endDate } = options;

      const conditions = [eq(sysJobExecutionLogs.jobId, jobId)];

      // 添加状态过滤
      if (status) {
        conditions.push(eq(sysJobExecutionLogs.status, status));
      }

      // 添加日期范围过滤
      if (startDate) {
        conditions.push(gte(sysJobExecutionLogs.startedAt, startDate.toISOString()));
      }

      if (endDate) {
        conditions.push(lt(sysJobExecutionLogs.startedAt, endDate.toISOString()));
      }

      const query = db
        .select()
        .from(sysJobExecutionLogs)
        .where(and(...conditions));

      const results = await query
        .orderBy(desc(sysJobExecutionLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    }
    catch (error) {
      logger.error("获取任务执行历史失败", {
        jobId,
        error,
      });
      throw error;
    }
  }

  /** 获取任务执行统计 */
  async getJobExecutionStats(jobId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await db
        .select()
        .from(sysJobExecutionLogs)
        .where(and(
          eq(sysJobExecutionLogs.jobId, jobId),
          gte(sysJobExecutionLogs.startedAt, startDate.toISOString()),
        ));

      const stats = {
        totalExecutions: logs.length,
        successfulExecutions: logs.filter(log => log.status === "completed").length,
        failedExecutions: logs.filter(log => log.status === "failed").length,
        averageDuration: 0,
        lastExecution: null as Date | null,
        successRate: 0,
      };

      if (logs.length > 0) {
        const completedLogs = logs.filter(log => log.durationMs !== null);
        if (completedLogs.length > 0) {
          const totalDuration = completedLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0);
          stats.averageDuration = Math.round(totalDuration / completedLogs.length);
        }

        const latestLog = logs.reduce((latest, current) => {
          const currentDate = new Date(current.startedAt!);
          const latestDate = new Date(latest.startedAt!);
          return currentDate > latestDate ? current : latest;
        });
        stats.lastExecution = new Date(latestLog.startedAt!);

        stats.successRate = Math.round((stats.successfulExecutions / stats.totalExecutions) * 100);
      }

      return stats;
    }
    catch (error) {
      logger.error("获取任务执行统计失败", {
        jobId,
        error,
      });
      throw error;
    }
  }

  /** 清理过期的执行日志 */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedRows = await db
        .delete(sysJobExecutionLogs)
        .where(lt(sysJobExecutionLogs.createdAt, cutoffDate.toISOString()));

      const deletedCount = deletedRows.length;

      logger.info("清理过期执行日志完成", {
        retentionDays,
        deletedRows: deletedCount,
      });

      return deletedCount;
    }
    catch (error) {
      logger.error("清理过期执行日志失败", {
        retentionDays,
        error,
      });
      throw error;
    }
  }

  /** 获取系统级别的任务执行概览 */
  async getSystemExecutionOverview(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await db
        .select()
        .from(sysJobExecutionLogs)
        .where(gte(sysJobExecutionLogs.startedAt, startDate.toISOString()));

      // 按任务ID分组统计
      const jobStats = new Map<string, {
        total: number;
        successful: number;
        failed: number;
        avgDuration: number;
      }>();

      logs.forEach((log) => {
        const jobId = log.jobId;
        if (!jobStats.has(jobId)) {
          jobStats.set(jobId, { total: 0, successful: 0, failed: 0, avgDuration: 0 });
        }

        const stats = jobStats.get(jobId)!;
        stats.total++;

        if (log.status === "completed") {
          stats.successful++;
        }
        else if (log.status === "failed") {
          stats.failed++;
        }

        if (log.durationMs) {
          stats.avgDuration = (stats.avgDuration * (stats.total - 1) + log.durationMs) / stats.total;
        }
      });

      // 按日期分组统计
      const dailyStats = new Map<string, { total: number; successful: number; failed: number }>();

      logs.forEach((log) => {
        const date = new Date(log.startedAt!).toISOString().split("T")[0];
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { total: 0, successful: 0, failed: 0 });
        }

        const stats = dailyStats.get(date)!;
        stats.total++;

        if (log.status === "completed") {
          stats.successful++;
        }
        else if (log.status === "failed") {
          stats.failed++;
        }
      });

      return {
        totalExecutions: logs.length,
        successfulExecutions: logs.filter(log => log.status === "completed").length,
        failedExecutions: logs.filter(log => log.status === "failed").length,
        jobStats: Object.fromEntries(jobStats),
        dailyStats: Object.fromEntries(dailyStats),
      };
    }
    catch (error) {
      logger.error("获取系统执行概览失败", {
        days,
        error,
      });
      throw error;
    }
  }

  /** 从任务中提取配置ID */
  private extractJobConfigId(job: Job): string {
    // 从任务数据或名称中提取实际的任务配置ID
    // 这里需要根据实际的任务数据结构来实现
    return job.data?.jobConfigId || job.name || "unknown";
  }
}

// 全局监控器实例
let globalMonitor: JobMonitor | null = null;

/** 获取全局监控器实例 */
export function getJobMonitor(): JobMonitor {
  if (!globalMonitor) {
    globalMonitor = new JobMonitor();
  }
  return globalMonitor;
}

/** 任务监控中间件工厂 */
export function createJobMonitoringMiddleware() {
  const monitor = getJobMonitor();

  return {
    /** 任务开始中间件 */
    onJobStart: async (job: Job) => {
      await monitor.logJobStart(job);
    },

    /** 任务完成中间件 */
    onJobComplete: async (job: Job, result: JobResult) => {
      await monitor.logJobCompletion(job, result);
    },

    /** 任务失败中间件 */
    onJobFailed: async (job: Job, error: Error) => {
      await monitor.logJobFailure(job, error);
    },
  };
}
