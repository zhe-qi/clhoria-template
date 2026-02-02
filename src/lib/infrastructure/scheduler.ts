import type { ScheduleOptions as BossScheduleOptions, PgBoss, Schedule } from "pg-boss";

import { createSingleton } from "@/lib/internal/singleton";
import logger from "@/lib/logger";
import boss from "./pg-boss-adapter";

export type ScheduleOptions = {
  /** 任务名称（唯一标识） */
  name: string;
  /** Cron 表达式 */
  pattern: string;
  /** 时区（默认 Asia/Shanghai） */
  timezone?: string;
  /** 任务数据 */
  data?: Record<string, unknown>;
  /** pg-boss 任务选项 */
  options?: BossScheduleOptions;
};

export type ScheduleHandler = (data?: Record<string, unknown>) => void | Promise<void>;

const SCHEDULE_PREFIX = "schedule_";

class ScheduleManager {
  private handlers = new Map<string, ScheduleHandler>();
  private bossInstance: PgBoss | null = null;
  private started = false;

  /**
   * 启动调度器
   * 注意：pg-boss 应该已经在 bootstrap 中启动了
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.bossInstance = await boss;
    // 注意：不再调用 start()，因为 bootstrap 已经启动了 pg-boss
    this.started = true;
    logger.info("[任务调度]: 调度器已启动");
  }

  /**
   * 注册定时任务
   *
   * @example
   * await scheduler.register({
   *   name: "clean-expired",
   *   pattern: "0 3 * * *", // 每天凌晨3点
   *   timezone: "Asia/Shanghai",
   * }, async () => {
   *   await cleanExpiredData();
   * });
   */
  async register(options: ScheduleOptions, handler: ScheduleHandler): Promise<void> {
    const { name, pattern, timezone = "Asia/Shanghai", data = {}, options: scheduleOptions } = options;
    const queueName = `${SCHEDULE_PREFIX}${name}`;

    if (!this.started || !this.bossInstance) {
      throw new Error("[任务调度]: 调度器未启动，请先调用 start()");
    }

    // 避免重复注册
    if (this.handlers.has(name)) {
      logger.warn({ name }, "[任务调度]: 任务已存在，跳过注册");
      return;
    }

    // 注册 handler
    this.handlers.set(name, handler);

    // 1. 先创建队列（pg-boss 12.x 要求先有队列才能调度）
    await this.bossInstance.createQueue(queueName);

    // 2. 创建 worker 处理任务
    await this.bossInstance.work<Record<string, unknown>>(
      queueName,
      { batchSize: 1 },
      async (jobs) => {
        const [job] = jobs;
        logger.info({ name, jobId: job.id }, "[任务调度]: 开始执行");
        try {
          const jobHandler = this.handlers.get(name);
          if (jobHandler) {
            await jobHandler(job.data);
          }
          logger.info({ name, jobId: job.id }, "[任务调度]: 执行完成");
        }
        catch (error) {
          logger.error(error, `[任务调度]: ${name} 执行失败`);
          throw error;
        }
      },
    );

    // 3. 注册定时调度
    await this.bossInstance.schedule(queueName, pattern, data, {
      tz: timezone,
      ...scheduleOptions,
    });

    logger.info({ name, pattern, timezone }, "[任务调度]: 任务已注册");
  }

  /**
   * 取消注册定时任务
   */
  async unregister(name: string): Promise<void> {
    if (!this.bossInstance) {
      return;
    }

    const queueName = `${SCHEDULE_PREFIX}${name}`;

    // 1. 取消调度
    await this.bossInstance.unschedule(queueName);
    // 2. 停止 worker
    await this.bossInstance.offWork(queueName);
    // 3. 删除队列
    await this.bossInstance.deleteQueue(queueName);
    // 4. 移除 handler
    this.handlers.delete(name);

    logger.info({ name }, "[任务调度]: 任务已取消注册");
  }

  /**
   * 手动触发任务（立即执行一次）
   */
  async trigger(name: string, data?: Record<string, unknown>): Promise<string | null> {
    if (!this.bossInstance) {
      logger.warn({ name }, "[任务调度]: 调度器未启动");
      return null;
    }

    if (!this.handlers.has(name)) {
      logger.warn({ name }, "[任务调度]: 任务不存在");
      return null;
    }

    const queueName = `${SCHEDULE_PREFIX}${name}`;
    const jobId = await this.bossInstance.send(queueName, data ?? {});

    logger.info({ name, jobId }, "[任务调度]: 任务已手动触发");
    return jobId;
  }

  /**
   * 获取所有已注册的任务名称
   */
  getScheduleNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取定时任务调度信息
   */
  async getSchedules(): Promise<Schedule[]> {
    if (!this.bossInstance) {
      return [];
    }

    const schedules = await this.bossInstance.getSchedules();
    return schedules.filter((s: Schedule) => s.name.startsWith(SCHEDULE_PREFIX));
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (!this.started || !this.bossInstance) {
      return;
    }

    // 停止所有 worker
    for (const name of this.handlers.keys()) {
      const queueName = `${SCHEDULE_PREFIX}${name}`;
      await this.bossInstance.offWork(queueName);
    }

    this.handlers.clear();
    this.started = false;
    logger.info("[任务调度]: 调度器已停止");
  }
}

const scheduler = createSingleton(
  "scheduler",
  () => new ScheduleManager(),
  { destroy: manager => manager.stop() },
);

export default scheduler;
