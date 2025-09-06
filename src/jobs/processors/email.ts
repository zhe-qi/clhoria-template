/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-console */
/**
 * 邮件处理函数 - 纯业务逻辑
 */

import type { Job } from "bullmq";

import type { EmailJobData } from "../types";

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, content, template, variables } = job.data;

  // 更新任务进度
  await job.updateProgress(10);

  try {
    console.log(`发送欢迎邮件到: ${to}`);

    // 模拟邮件发送逻辑
    await job.updateProgress(50);

    // 这里可以集成真实的邮件服务 (如 Nodemailer, SendGrid 等)
    if (template && variables) {
      console.log(`使用模板: ${template}, 变量:`, variables);
    }

    // 模拟邮件发送耗时
    await new Promise(resolve => setTimeout(resolve, 1000));

    await job.updateProgress(100);
    console.log(`邮件发送成功: ${subject}`);
  }
  catch (error) {
    console.error(`邮件发送失败:`, error);
    throw error;
  }
}

/**
 * 发送通知邮件
 */
export async function sendNotificationEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, content } = job.data;

  await job.updateProgress(20);

  try {
    console.log(`发送通知邮件: ${subject} -> ${to}`);

    await job.updateProgress(60);

    // 模拟通知邮件处理
    await new Promise(resolve => setTimeout(resolve, 500));

    await job.updateProgress(100);
    console.log(`通知邮件发送完成`);
  }
  catch (error) {
    console.error(`通知邮件发送失败:`, error);
    throw error;
  }
}

/**
 * 发送系统邮件
 */
export async function sendSystemEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, content } = job.data;

  await job.updateProgress(15);

  try {
    console.log(`发送系统邮件: ${subject}`);

    await job.updateProgress(70);

    // 模拟系统邮件处理逻辑
    await new Promise(resolve => setTimeout(resolve, 800));

    await job.updateProgress(100);
    console.log(`系统邮件发送完成`);
  }
  catch (error) {
    console.error(`系统邮件发送失败:`, error);
    throw error;
  }
}

/**
 * 批量邮件发送
 */
export async function sendBulkEmail(job: Job<EmailJobData>): Promise<void> {
  const { content, template, variables } = job.data;

  await job.updateProgress(5);

  try {
    console.log(`开始批量邮件发送处理`);

    // 模拟批量处理
    const batchSize = 10;
    for (let i = 0; i < 5; i++) {
      await job.updateProgress(5 + (i + 1) * 18);
      console.log(`处理批次 ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    await job.updateProgress(100);
    console.log(`批量邮件发送完成`);
  }
  catch (error) {
    console.error(`批量邮件发送失败:`, error);
    throw error;
  }
}
