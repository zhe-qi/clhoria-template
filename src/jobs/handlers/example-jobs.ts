import type { Job } from "bullmq";

import { and, count, eq, lt, or } from "drizzle-orm";

import db from "@/db";
import { systemTokens } from "@/db/schema";
import { TokenStatus } from "@/lib/enums";
import { logger } from "@/lib/logger";
import { formatDate } from "@/utils/tools/formatter";

import type { JobHandler } from "../types";

/**
 * @description Token清理任务
 */
export const tokenCleanupJob: JobHandler = async (job: Job) => {
  logger.info("Token清理任务开始执行", {
    jobId: job.id,
    timestamp: formatDate(new Date()),
  });

  const { retentionDays = 7 } = job.data || {}; // 默认保留7天
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    await job.updateProgress(25);

    // 删除过期的或已撤销的token记录
    const deleteResult = await db.delete(systemTokens)
      .where(
        or(
          // 过期的token
          lt(systemTokens.expiresAt, new Date()),
          // 已撤销且超过保留期的token
          and(
            eq(systemTokens.status, TokenStatus.REVOKED),
            lt(systemTokens.createdAt, cutoffDate.toISOString()),
          ),
        ),
      );

    await job.updateProgress(75);

    // 统计活跃token数量
    const [{ value: activeTokensCount }] = await db
      .select({ value: count() })
      .from(systemTokens)
      .where(eq(systemTokens.status, TokenStatus.ACTIVE));

    await job.updateProgress(100);

    const result = {
      message: "Token清理完成",
      timestamp: formatDate(new Date()),
      jobId: job.id,
      retentionDays,
      deletedTokens: deleteResult.length,
      activeTokens: activeTokensCount,
    };

    logger.info("Token清理任务执行完成", result);
    return result;
  }
  catch (error) {
    logger.error("Token清理任务执行失败", {
      jobId: job.id,
      error: error instanceof Error ? error.message : "未知错误",
    });
    throw error;
  }
};

/**
 * @description Hello World 定时任务
 */
export const helloWorldJob: JobHandler = async (job: Job) => {
  logger.debug("Hello World 任务开始执行", { jobId: job.id });

  // 模拟一些处理时间
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 更新任务进度
  await job.updateProgress(50);

  // 继续处理
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 更新任务进度到100%
  await job.updateProgress(100);

  const result = {
    message: "Hello World!",
    timestamp: formatDate(new Date()),
    jobId: job.id,
    data: job.data,
  };

  logger.debug("Hello World 任务执行完成", { jobId: job.id, message: result.message });

  return result;
};

/**
 * @description 系统清理任务
 */
export const systemCleanupJob: JobHandler = async (job: Job) => {
  logger.info("系统清理任务开始执行", {
    jobId: job.id,
    timestamp: formatDate(new Date()),
  });

  const { retentionDays = 30 } = job.data || {};

  // 模拟清理过程
  await job.updateProgress(25);
  logger.debug("正在清理临时文件...");
  await new Promise(resolve => setTimeout(resolve, 500));

  await job.updateProgress(50);
  logger.debug("正在清理过期日志...");
  await new Promise(resolve => setTimeout(resolve, 500));

  await job.updateProgress(75);
  logger.debug("正在清理缓存数据...");
  await new Promise(resolve => setTimeout(resolve, 500));

  await job.updateProgress(100);

  const result = {
    message: "系统清理完成",
    timestamp: formatDate(new Date()),
    jobId: job.id,
    retentionDays,
    cleanedItems: {
      tempFiles: Math.floor(Math.random() * 100),
      logFiles: Math.floor(Math.random() * 50),
      cacheEntries: Math.floor(Math.random() * 200),
    },
  };

  logger.info("系统清理任务执行完成", result);

  return result;
};

/**
 * @description 数据备份任务
 */
export const dataBackupJob: JobHandler = async (job: Job) => {
  logger.info("数据备份任务开始执行", {
    jobId: job.id,
    timestamp: formatDate(new Date()),
  });

  const { backupType = "incremental" } = job.data || {};

  // 模拟备份过程
  await job.updateProgress(20);
  logger.debug("正在准备备份...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await job.updateProgress(40);
  logger.debug("正在备份数据库...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  await job.updateProgress(60);
  logger.debug("正在备份文件系统...");
  await new Promise(resolve => setTimeout(resolve, 1500));

  await job.updateProgress(80);
  logger.debug("正在压缩备份文件...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await job.updateProgress(100);

  const result = {
    message: "数据备份完成",
    timestamp: formatDate(new Date()),
    jobId: job.id,
    backupType,
    backupSize: `${Math.floor(Math.random() * 1000 + 100)}MB`,
    backupLocation: `/backups/${formatDate(new Date(), "yyyy-MM-dd")}/`,
  };

  logger.info("数据备份任务执行完成", result);

  return result;
};

/**
 * @description 报表生成任务
 */
export const reportGenerationJob: JobHandler = async (job: Job) => {
  logger.info("报表生成任务开始执行", {
    jobId: job.id,
    timestamp: formatDate(new Date()),
  });

  const { reportType = "daily", dateRange } = job.data || {};

  // 模拟报表生成过程
  await job.updateProgress(30);
  logger.debug("正在收集数据...");
  await new Promise(resolve => setTimeout(resolve, 1500));

  await job.updateProgress(60);
  logger.debug("正在分析数据...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  await job.updateProgress(90);
  logger.debug("正在生成报表...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await job.updateProgress(100);

  const result = {
    message: "报表生成完成",
    timestamp: formatDate(new Date()),
    jobId: job.id,
    reportType,
    dateRange,
    reportUrl: `/reports/${reportType}-${Date.now()}.pdf`,
    recordCount: Math.floor(Math.random() * 10000 + 1000),
  };

  logger.info("报表生成任务执行完成", result);

  return result;
};

/**
 * @description 邮件发送任务
 */
export const emailSendJob: JobHandler = async (job: Job) => {
  logger.info("邮件发送任务开始执行", {
    jobId: job.id,
    timestamp: formatDate(new Date()),
  });

  const { recipients = [], subject, content: _content } = job.data || {};

  // 模拟邮件发送过程
  const totalRecipients = recipients.length;

  for (let i = 0; i < totalRecipients; i++) {
    const progress = Math.round(((i + 1) / totalRecipients) * 100);
    await job.updateProgress(progress);

    logger.debug(`正在发送邮件到 ${recipients[i]}...`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const result = {
    message: "邮件发送完成",
    timestamp: formatDate(new Date()),
    jobId: job.id,
    subject,
    recipientCount: totalRecipients,
    successCount: totalRecipients - Math.floor(Math.random() * 2), // 模拟偶尔失败
  };

  logger.info("邮件发送任务执行完成", result);

  return result;
};
