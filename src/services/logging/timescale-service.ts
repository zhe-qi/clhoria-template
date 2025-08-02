import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { subDays } from "date-fns";
import { and, desc, eq, gte } from "drizzle-orm";

import db from "@/db";
import { tsLoginLog, tsOperationLog } from "@/db/schema";
import { formatDate } from "@/utils/tools/formatter";

/**
 * 时序日志服务
 * 提供时序日志查询和写入功能
 */
export class TimescaleLogService {
  /**
   * 添加登录日志
   */
  static async addLoginLog(data: InferInsertModel<typeof tsLoginLog>) {
    await db.insert(tsLoginLog).values(data);
  }

  /**
   * 添加操作日志（直接写入）
   */
  static async addOperationLog(data: InferInsertModel<typeof tsOperationLog>) {
    await db.insert(tsOperationLog).values(data);
  }

  /**
   * 获取最近的登录日志（利用时间分区优化）
   */
  static async getRecentLoginLogs(
    domain: string,
    days: number = 7,
    limit: number = 100,
  ): Promise<InferSelectModel<typeof tsLoginLog>[]> {
    const startTime = subDays(new Date(), days);

    return await db.select()
      .from(tsLoginLog)
      .where(
        and(
          eq(tsLoginLog.domain, domain),
          gte(tsLoginLog.loginTime, formatDate(startTime)),
        ),
      )
      .orderBy(desc(tsLoginLog.loginTime))
      .limit(limit);
  }

  /**
   * 获取用户最近的登录日志
   */
  static async getUserRecentLoginLogs(
    userId: string,
    domain: string,
    days: number = 30,
    limit: number = 50,
  ): Promise<InferSelectModel<typeof tsLoginLog>[]> {
    const startTime = subDays(new Date(), days);

    return await db.select()
      .from(tsLoginLog)
      .where(
        and(
          eq(tsLoginLog.userId, userId),
          eq(tsLoginLog.domain, domain),
          gte(tsLoginLog.loginTime, formatDate(startTime)),
        ),
      )
      .orderBy(desc(tsLoginLog.loginTime))
      .limit(limit);
  }

  /**
   * 获取最近的操作日志（利用时间分区优化）
   */
  static async getRecentOperationLogs(
    domain: string,
    days: number = 7,
    limit: number = 100,
  ): Promise<InferSelectModel<typeof tsOperationLog>[]> {
    const startTime = subDays(new Date(), days);

    return await db.select()
      .from(tsOperationLog)
      .where(
        and(
          eq(tsOperationLog.domain, domain),
          gte(tsOperationLog.startTime, formatDate(startTime)),
        ),
      )
      .orderBy(desc(tsOperationLog.startTime))
      .limit(limit);
  }

  /**
   * 获取用户最近的操作日志
   */
  static async getUserRecentOperationLogs(
    userId: string,
    domain: string,
    days: number = 30,
    limit: number = 50,
  ): Promise<InferSelectModel<typeof tsOperationLog>[]> {
    const startTime = subDays(new Date(), days);

    return await db.select()
      .from(tsOperationLog)
      .where(
        and(
          eq(tsOperationLog.userId, userId),
          eq(tsOperationLog.domain, domain),
          gte(tsOperationLog.startTime, formatDate(startTime)),
        ),
      )
      .orderBy(desc(tsOperationLog.startTime))
      .limit(limit);
  }

  /**
   * 获取模块操作日志
   */
  static async getModuleOperationLogs(
    moduleName: string,
    domain: string,
    days: number = 7,
    limit: number = 100,
  ): Promise<InferSelectModel<typeof tsOperationLog>[]> {
    const startTime = subDays(new Date(), days);

    return await db.select()
      .from(tsOperationLog)
      .where(
        and(
          eq(tsOperationLog.moduleName, moduleName),
          eq(tsOperationLog.domain, domain),
          gte(tsOperationLog.startTime, formatDate(startTime)),
        ),
      )
      .orderBy(desc(tsOperationLog.startTime))
      .limit(limit);
  }
}
