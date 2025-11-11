import type { Job } from "bullmq";

import { format } from "date-fns";
import { createHash } from "node:crypto";

import logger from "@/lib/logger";
import redisClient from "@/lib/redis";

import type { IdempotencyRecord } from "../config";

import { DEFAULT_IDEMPOTENCY_TTL, REDIS_KEY_PREFIX } from "../config";

/**
 * Job 数据结构（用于缓存返回）
 */
export interface CachedJobData {
  jobId: string;
  taskName: string;
  addedAt: string;
  cached: true;
}

/**
 * 幂等性辅助工具
 */
export class IdempotencyHelper {
  /**
   * 检查任务是否已处理
   */
  static async isProcessed(key: string): Promise<boolean> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const exists = await redisClient.exists(fullKey);
      return exists === 1;
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 检查处理状态失败");
      return false;
    }
  }

  /**
   * 标记任务已处理（存储完整 Job 信息）
   */
  static async markAsProcessedWithJob<T = any>(
    key: string,
    job: Job<T>,
    ttl: number = DEFAULT_IDEMPOTENCY_TTL,
  ): Promise<boolean> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const now = new Date();

      const record: IdempotencyRecord = {
        jobId: job.id || "",
        taskName: job.name,
        result: undefined,
        addedAt: format(job.timestamp, "yyyy-MM-dd HH:mm:ss"),
        createdAt: format(now, "yyyy-MM-dd HH:mm:ss"),
        expiresAt: format(new Date(now.getTime() + ttl * 1000), "yyyy-MM-dd HH:mm:ss"),
      };

      await redisClient.setex(fullKey, ttl, JSON.stringify(record));
      logger.info({ key, jobId: job.id, taskName: job.name, ttl }, "[幂等性]: 已标记任务为已处理");
      return true;
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 标记任务失败");
      return false;
    }
  }

  /**
   * 标记任务已处理（兼容旧接口）
   */
  static async markAsProcessed(
    key: string,
    result?: any,
    ttl: number = DEFAULT_IDEMPOTENCY_TTL,
  ): Promise<boolean> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const now = new Date();

      const record: Partial<IdempotencyRecord> = {
        result,
        createdAt: format(now, "yyyy-MM-dd HH:mm:ss"),
        expiresAt: format(new Date(now.getTime() + ttl * 1000), "yyyy-MM-dd HH:mm:ss"),
      };

      await redisClient.setex(fullKey, ttl, JSON.stringify(record));
      logger.info({ key, ttl }, "[幂等性]: 已标记任务为已处理");
      return true;
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 标记任务失败");
      return false;
    }
  }

  /**
   * 获取已处理任务的 Job 信息
   */
  static async getProcessedJob(key: string): Promise<CachedJobData | null> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const data = await redisClient.get(fullKey);

      if (!data) {
        return null;
      }

      const record: IdempotencyRecord = JSON.parse(data);

      // 返回缓存的 Job 数据
      return {
        jobId: record.jobId,
        taskName: record.taskName,
        addedAt: record.addedAt,
        cached: true,
      };
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 获取 Job 信息失败");
      return null;
    }
  }

  /**
   * 获取已处理任务的结果
   */
  static async getProcessedResult<T = any>(key: string): Promise<T | null> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const data = await redisClient.get(fullKey);

      if (!data) {
        return null;
      }

      const record: IdempotencyRecord = JSON.parse(data);
      return record.result as T;
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 获取处理结果失败");
      return null;
    }
  }

  /**
   * 删除幂等性记录
   */
  static async clearProcessed(key: string): Promise<boolean> {
    try {
      const fullKey = `${REDIS_KEY_PREFIX.IDEMPOTENCY}${key}`;
      const result = await redisClient.del(fullKey);

      if (result > 0) {
        logger.info({ key }, "[幂等性]: 已清除幂等性记录");
        return true;
      }

      return false;
    }
    catch (error) {
      logger.error({ error, key }, "[幂等性]: 清除记录失败");
      return false;
    }
  }

  /**
   * 生成幂等性键（使用 SHA256 替代 Base64，更短更安全）
   * 根据任务类型和参数生成唯一的幂等性键
   */
  static generateKey(taskName: string, params: Record<string, any>): string {
    // 对参数进行排序以确保一致性
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    const hash = createHash("sha256").update(paramString).digest("hex").slice(0, 16);

    return `${taskName}:${hash}`;
  }
}

/**
 * 幂等性装饰器（用于包装任务处理函数）
 */
export function withIdempotency<T extends (...args: any[]) => Promise<any>>(
  generateKey: (...args: Parameters<T>) => string,
  options: { ttl?: number; skipOnExists?: boolean } = {},
): (fn: T) => T {
  const { ttl = DEFAULT_IDEMPOTENCY_TTL, skipOnExists = true } = options;

  return (fn: T): T => {
    return (async (...args: Parameters<T>) => {
      const key = generateKey(...args);

      // 检查是否已处理
      if (await IdempotencyHelper.isProcessed(key)) {
        if (skipOnExists) {
          const result = await IdempotencyHelper.getProcessedResult(key);
          logger.info({ key }, "[幂等性]: 任务已处理，跳过执行");
          return result;
        }
      }

      // 执行任务
      const result = await fn(...args);

      // 标记为已处理
      await IdempotencyHelper.markAsProcessed(key, result, ttl);

      return result;
    }) as T;
  };
}
