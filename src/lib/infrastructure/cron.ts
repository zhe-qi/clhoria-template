import { Cron } from "croner";

import { createSingleton } from "@/lib/internal/singleton";
import logger from "@/lib/logger";

export type JobOptions = {
  /** Cron 表达式 */
  pattern: string;
  /** 任务名称 */
  name: string;
  /** 是否立即执行一次 */
  runOnInit?: boolean;
  /** 时区 */
  timezone?: string;
};

type JobEntry = {
  cron: Cron;
  name: string;
};

class CronManager {
  private jobs = new Map<string, JobEntry>();

  /**
   * 注册定时任务
   *
   * @example
   * cron.register({
   *   name: "清理过期数据",
   *   pattern: "0 3 * * *", // 每天凌晨3点
   *   runOnInit: false,
   * }, async () => {
   *   await cleanExpiredData();
   * });
   */
  register(options: JobOptions, handler: () => void | Promise<void>): void {
    const { pattern, name, runOnInit = false, timezone } = options;

    // 避免重复注册
    if (this.jobs.has(name)) {
      logger.warn({ name }, "[任务调度]: 任务已存在，跳过注册");
      return;
    }

    const cron = new Cron(pattern, {
      name,
      timezone,
      catch: (error) => {
        logger.error(error, `[任务调度]: ${name} 执行失败`);
      },
    }, async () => {
      logger.info({ name }, "[任务调度]: 开始执行");
      try {
        await handler();
        logger.info({ name }, "[任务调度]: 执行完成");
      }
      catch (error) {
        logger.error(error, `[任务调度]: ${name} 执行失败`);
      }
    });

    this.jobs.set(name, { cron, name });
    logger.info({ name, pattern, nextRun: cron.nextRun()?.toISOString() }, "[任务调度]: 任务已注册");

    // 立即执行一次
    if (runOnInit) {
      void cron.trigger();
    }
  }

  /**
   * 手动触发任务
   */
  trigger(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      void job.cron.trigger();
    }
    else {
      logger.warn({ name }, "[任务调度]: 任务不存在");
    }
  }

  /**
   * 暂停任务
   */
  pause(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.cron.pause();
      logger.info({ name }, "[任务调度]: 任务已暂停");
    }
  }

  /**
   * 恢复任务
   */
  resume(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.cron.resume();
      logger.info({ name }, "[任务调度]: 任务已恢复");
    }
  }

  /**
   * 停止并移除任务
   */
  remove(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.cron.stop();
      this.jobs.delete(name);
      logger.info({ name }, "[任务调度]: 任务已移除");
    }
  }

  /**
   * 获取任务下次执行时间
   */
  getNextRun(name: string): Date | null {
    const job = this.jobs.get(name);
    return job?.cron.nextRun() ?? null;
  }

  /**
   * 获取所有任务名称
   */
  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * 停止所有任务
   */
  stopAll(): void {
    for (const [name, job] of this.jobs) {
      job.cron.stop();
      logger.info({ name }, "[任务调度]: 任务已停止");
    }
    this.jobs.clear();
  }
}

const cron = createSingleton(
  "cron",
  () => new CronManager(),
  { destroy: manager => manager.stopAll() },
);

export default cron;
