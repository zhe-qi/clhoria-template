import type { Job } from "bullmq";

import logger from "@/lib/logger";

/**
 * 用户相关任务处理器示例
 */

interface UserNotificationData {
  userId: string;
  type: "welcome" | "password-reset" | "account-update";
  metadata?: Record<string, any>;
}

/**
 * 用户通知处理器
 */
export async function userNotificationProcessor(job: Job<UserNotificationData>) {
  const { userId, type, metadata } = job.data;

  logger.info(
    { jobId: job.id, userId, type },
    "[用户]: 开始处理通知",
  );

  await job.updateProgress(20);

  // 根据通知类型处理
  let result;
  switch (type) {
    case "welcome":
      result = await sendWelcomeNotification(userId, metadata);
      break;
    case "password-reset":
      result = await sendPasswordResetNotification(userId, metadata);
      break;
    case "account-update":
      result = await sendAccountUpdateNotification(userId, metadata);
      break;
    default:
      throw new Error(`不支持的通知类型: ${type}`);
  }

  await job.updateProgress(100);

  logger.info(
    { jobId: job.id, userId, type },
    "[用户]: 通知处理完成",
  );

  return result;
}

/**
 * 用户数据同步处理器
 */
export async function userDataSyncProcessor(job: Job<{ userId: string; syncType: "full" | "partial" }>) {
  const { userId, syncType } = job.data;

  logger.info(
    { jobId: job.id, userId, syncType },
    "[用户]: 开始数据同步",
  );

  // 模拟同步步骤
  const steps = syncType === "full" ? 5 : 3;
  for (let i = 1; i <= steps; i++) {
    await job.updateProgress((i / steps) * 100);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  logger.info(
    { jobId: job.id, userId, syncType },
    "[用户]: 数据同步完成",
  );

  return {
    success: true,
    userId,
    syncType,
    syncedAt: new Date().toISOString(),
    recordsProcessed: Math.floor(Math.random() * 100),
  };
}

/**
 * 批量用户导入处理器
 */
export async function bulkUserImportProcessor(job: Job<{ users: Array<{ email: string; name: string }> }>) {
  const { users } = job.data;

  logger.info(
    { jobId: job.id, count: users.length },
    "[用户]: 开始批量导入",
  );

  const results = {
    success: [] as string[],
    failed: [] as { email: string; error: string }[],
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = Math.floor(((i + 1) / users.length) * 100);

    try {
      // 模拟用户导入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 随机模拟成功或失败
      if (Math.random() > 0.1) {
        results.success.push(user.email);
      }
      else {
        throw new Error("用户已存在");
      }
    }
    catch (error: any) {
      results.failed.push({
        email: user.email,
        error: error.message,
      });
    }

    await job.updateProgress(progress);
  }

  logger.info(
    {
      jobId: job.id,
      successCount: results.success.length,
      failedCount: results.failed.length,
    },
    "[用户]: 批量导入完成",
  );

  return results;
}

// 辅助函数
async function sendWelcomeNotification(userId: string, metadata?: Record<string, any>) {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    type: "welcome",
    userId,
    sent: true,
    sentAt: new Date().toISOString(),
    metadata,
  };
}

async function sendPasswordResetNotification(userId: string, metadata?: Record<string, any>) {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    type: "password-reset",
    userId,
    sent: true,
    sentAt: new Date().toISOString(),
    metadata,
  };
}

async function sendAccountUpdateNotification(userId: string, metadata?: Record<string, any>) {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    type: "account-update",
    userId,
    sent: true,
    sentAt: new Date().toISOString(),
    metadata,
  };
}
