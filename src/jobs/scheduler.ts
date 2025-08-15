import type { InferSelectModel } from "drizzle-orm";

import { and, eq } from "drizzle-orm";

import db from "@/db";
import { systemScheduledJobs } from "@/db/schema";
import { JobStatus } from "@/lib/enums";
import logger from "@/lib/logger";

import type { ScheduledJobConfig } from "./types";

import { JobQueueManager } from "./queue-manager";
import { syncHandlersToDatabase } from "./registry";

// 类型定义
type ScheduledJob = InferSelectModel<typeof systemScheduledJobs>;

/** 定时任务调度器 */
export class TaskScheduler {
  private queueManager: JobQueueManager;
  private isInitialized = false;
  private schedulerInterval?: NodeJS.Timeout;

  constructor() {
    this.queueManager = new JobQueueManager();
  }

  /** 初始化调度器 */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn("任务调度器已经初始化");
      return;
    }

    try {
      // 同步任务处理器到数据库
      await syncHandlersToDatabase();

      // 加载并启动所有启用的定时任务
      await this.loadAndStartEnabledJobs();

      // 启动定期检查机制
      this.startPeriodicCheck();

      this.isInitialized = true;
    }
    catch (error) {
      logger.error({ error }, "任务调度器初始化失败");
      throw error;
    }
  }

  /** 加载并启动所有启用的定时任务 */
  private async loadAndStartEnabledJobs(): Promise<void> {
    try {
      // 查询所有启用状态的定时任务
      const enabledJobs = await db
        .select()
        .from(systemScheduledJobs)
        .where(eq(systemScheduledJobs.status, JobStatus.ENABLED));

      for (const jobRow of enabledJobs) {
        const jobConfig = this.convertToJobConfig(jobRow);
        await this.startJob(jobConfig);
      }
    }
    catch (error) {
      logger.error({ error }, "加载启用的定时任务失败");
      throw error;
    }
  }

  /** 启动单个定时任务 */
  async startJob(jobConfig: ScheduledJobConfig): Promise<void> {
    try {
      await this.queueManager.addRepeatingJob(jobConfig);
      logger.info({
        jobId: jobConfig.id,
        name: jobConfig.name,
        cronExpression: jobConfig.cronExpression,
      }, "定时任务启动成功");
    }
    catch (error) {
      logger.error({
        jobId: jobConfig.id,
        name: jobConfig.name,
        error,
      }, "启动定时任务失败");
      throw error;
    }
  }

  /** 停止单个定时任务 */
  async stopJob(jobId: string): Promise<void> {
    try {
      await this.queueManager.removeRepeatingJob(jobId);
      logger.info({ jobId }, "定时任务停止成功");
    }
    catch (error) {
      logger.error({ jobId, error }, "停止定时任务失败");
      throw error;
    }
  }

  /** 重启单个定时任务 */
  async restartJob(jobId: string, domain: string): Promise<void> {
    try {
      // 先停止任务
      await this.stopJob(jobId);

      // 重新加载任务配置
      const [jobRow] = await db
        .select()
        .from(systemScheduledJobs)
        .where(and(
          eq(systemScheduledJobs.id, jobId),
          eq(systemScheduledJobs.domain, domain),
        ));

      if (!jobRow) {
        throw new Error(`任务不存在: ${jobId}`);
      }

      if (jobRow.status === JobStatus.ENABLED) { // 只有启用状态的任务才重启
        const jobConfig = this.convertToJobConfig(jobRow);
        await this.startJob(jobConfig);
      }

      logger.info({ jobId }, "定时任务重启成功");
    }
    catch (error) {
      logger.error({ jobId, error }, "重启定时任务失败");
      throw error;
    }
  }

  /** 立即执行任务（不影响定时调度） */
  async executeJobNow(jobId: string, domain: string): Promise<void> {
    try {
      const [jobRow] = await db
        .select()
        .from(systemScheduledJobs)
        .where(and(
          eq(systemScheduledJobs.id, jobId),
          eq(systemScheduledJobs.domain, domain),
        ));

      if (!jobRow) {
        throw new Error(`任务不存在: ${jobId}`);
      }

      const jobConfig = this.convertToJobConfig(jobRow);
      await this.queueManager.executeJobNow(jobConfig);

      logger.info({ jobId }, "立即执行任务成功");
    }
    catch (error) {
      logger.error({ jobId, error }, "立即执行任务失败");
      throw error;
    }
  }

  /** 启动定期检查机制 */
  private startPeriodicCheck(): void {
    // 每分钟检查一次任务状态变更
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.checkJobStatusChanges();
      }
      catch (error) {
        logger.error({ error }, "定期检查任务状态失败");
      }
    }, 60000);
  }

  /** 检查任务状态变更 */
  private async checkJobStatusChanges(): Promise<void> {
    try {
      // 获取所有任务的当前状态
      const allJobs = await db.select().from(systemScheduledJobs);

      for (const jobRow of allJobs) {
        const jobConfig = this.convertToJobConfig(jobRow);

        if (jobRow.status === JobStatus.ENABLED) {
          // 启用状态：确保任务在运行
          // 这里可以检查 BullMQ 中是否存在该重复任务
          // 如果不存在，则重新添加
        }
        else {
          // 禁用或暂停状态：确保任务已停止
          try {
            await this.queueManager.removeRepeatingJob(jobConfig.id);
          }
          catch {
            // 任务可能本来就不存在，忽略错误
          }
        }
      }
    }
    catch (error) {
      logger.error({ error }, "检查任务状态变更时出错");
    }
  }

  /** 检查调度器是否已初始化 */
  get isReady(): boolean {
    return this.isInitialized;
  }

  /** 获取调度器状态 */
  async getSchedulerStatus() {
    try {
      const queueStatus = await this.queueManager.getQueueStatus();

      const totalJobs = await db
        .select({ count: systemScheduledJobs.id })
        .from(systemScheduledJobs);

      const enabledJobs = await db
        .select({ count: systemScheduledJobs.id })
        .from(systemScheduledJobs)
        .where(eq(systemScheduledJobs.status, JobStatus.ENABLED));

      return {
        isInitialized: this.isInitialized,
        totalJobs: totalJobs.length,
        enabledJobs: enabledJobs.length,
        queueStatus,
      };
    }
    catch (error) {
      logger.error({ error }, "获取调度器状态失败");
      throw error;
    }
  }

  /** 暂停调度器 */
  async pause(): Promise<void> {
    try {
      await this.queueManager.pauseQueue();

      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = undefined;
      }

      logger.info("任务调度器已暂停");
    }
    catch (error) {
      logger.error({ error }, "暂停任务调度器失败");
      throw error;
    }
  }

  /** 恢复调度器 */
  async resume(): Promise<void> {
    try {
      await this.queueManager.resumeQueue();
      this.startPeriodicCheck();

      logger.info("任务调度器已恢复");
    }
    catch (error) {
      logger.error({ error }, "恢复任务调度器失败");
      throw error;
    }
  }

  /** 关闭调度器 */
  async shutdown(): Promise<void> {
    try {
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = undefined;
      }

      await this.queueManager.close();
      this.isInitialized = false;

      logger.info("任务调度器已关闭");
    }
    catch (error) {
      logger.error({ error }, "关闭任务调度器失败");
      throw error;
    }
  }

  /** 清理所有重复任务 */
  async clearAllRepeatableJobs(): Promise<void> {
    try {
      await this.queueManager.clearAllRepeatableJobs();
      logger.info("调度器：所有重复任务已清理");
    }
    catch (error) {
      logger.error({ error }, "调度器：清理重复任务失败");
      throw error;
    }
  }

  /** 获取所有重复任务（用于测试） */
  async getRepeatableJobs() {
    return await this.queueManager.getRepeatableJobs();
  }

  /** 将数据库行转换为任务配置 */
  private convertToJobConfig(jobRow: ScheduledJob): ScheduledJobConfig {
    return {
      id: jobRow.id,
      name: jobRow.name,
      description: jobRow.description || undefined,
      handlerName: jobRow.handlerName,
      cronExpression: jobRow.cronExpression,
      timezone: jobRow.timezone || "Asia/Shanghai",
      status: jobRow.status,
      payload: jobRow.payload || {},
      retryAttempts: jobRow.retryAttempts || 3,
      retryDelay: jobRow.retryDelay || 5000,
      timeout: jobRow.timeout || 300000,
      priority: jobRow.priority || 0,
      domain: jobRow.domain,
    };
  }

  /** 获取队列管理器实例 */
  getQueueManager(): JobQueueManager {
    return this.queueManager;
  }
}

// 全局调度器实例
let globalScheduler: TaskScheduler | null = null;

/** 获取全局调度器实例 */
export function getScheduler(): TaskScheduler {
  if (!globalScheduler) {
    globalScheduler = new TaskScheduler();
  }
  return globalScheduler;
}

/** 初始化全局调度器 */
export async function initializeScheduler(): Promise<void> {
  const scheduler = getScheduler();

  // 在初始化时清理所有残留的重复任务
  try {
    await scheduler.clearAllRepeatableJobs();
  }
  catch (error) {
    logger.warn({ error }, "清理残留重复任务时出错");
  }

  await scheduler.initialize();
}

/** 关闭全局调度器 */
export async function shutdownScheduler(): Promise<void> {
  if (globalScheduler) {
    await globalScheduler.shutdown();
    globalScheduler = null;
  }
}
