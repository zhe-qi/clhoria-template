import type { Job } from "bullmq";

import logger from "@/lib/logger";

import { IdempotencyHelper } from "../lib/idempotency";

/**
 * 邮件任务处理器示例
 */

interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  userId?: string;
}

/**
 * 发送邮件处理器
 * 演示幂等性处理
 */
export async function sendEmailProcessor(job: Job<SendEmailData>) {
  const { to, subject, templateId, userId } = job.data;

  // 生成幂等性键
  const idempotencyKey = IdempotencyHelper.generateKey("send-email", {
    to,
    subject,
    templateId: templateId || "default",
    userId: userId || "system",
  });

  // 检查是否已发送
  if (await IdempotencyHelper.isProcessed(idempotencyKey)) {
    const result = await IdempotencyHelper.getProcessedResult(idempotencyKey);
    logger.info(
      { jobId: job.id, to, idempotencyKey },
      "[邮件]: 邮件已发送，跳过",
    );
    return result;
  }

  // 更新进度
  await job.updateProgress(10);

  // 模拟发送邮件（使用 body 字段的逻辑应该在这里）
  logger.info(
    { jobId: job.id, to, subject },
    "[邮件]: 开始发送",
  );

  // 这里替换为实际的邮件发送逻辑
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 更新进度
  await job.updateProgress(90);

  const result = {
    success: true,
    messageId: `msg_${Date.now()}`,
    sentAt: new Date().toISOString(),
  };

  // 标记为已处理
  await IdempotencyHelper.markAsProcessed(
    idempotencyKey,
    result,
    7 * 24 * 3600, // 保留7天
  );

  // 更新进度
  await job.updateProgress(100);

  logger.info(
    { jobId: job.id, to, messageId: result.messageId },
    "[邮件]: 发送成功",
  );

  return result;
}

/**
 * 发送批量邮件处理器
 */
export async function sendBulkEmailProcessor(job: Job<{ emails: SendEmailData[] }>) {
  const { emails } = job.data;
  const results = [];

  logger.info(
    { jobId: job.id, count: emails.length },
    "[邮件]: 开始批量发送",
  );

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const progress = Math.floor(((i + 1) / emails.length) * 100);

    // 创建子任务
    const subJob = {
      id: `${job.id}_${i}`,
      data: email,
      updateProgress: async () => {},
    } as unknown as Job<SendEmailData>;

    try {
      const result = await sendEmailProcessor(subJob);
      results.push({ email: email.to, ...result });
    }
    catch (error) {
      logger.error(
        { error, email: email.to },
        "[邮件]: 批量发送中单个邮件失败",
      );
      results.push({ email: email.to, success: false, error });
    }

    // 更新总进度
    await job.updateProgress(progress);
  }

  logger.info(
    { jobId: job.id, successCount: results.filter(r => r.success).length },
    "[邮件]: 批量发送完成",
  );

  return results;
}
