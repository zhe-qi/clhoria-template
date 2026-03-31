import type { JobNameType, QueueName } from "@/lib/enums/bullmq";

import { z } from "zod";
import { JobName } from "@/lib/enums/bullmq";

/**
 * 正则表达式常量
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Zod schemas for job data validation
 */
export const EmailSendWelcomeSchema = z.object({
  email: z.email("邮箱格式不正确"),
  username: z.string().min(1, "用户名不能为空"),
  subject: z.string().optional(),
});

export const EmailSendResetPasswordSchema = z.object({
  email: z.email("邮箱格式不正确"),
  resetToken: z.string().min(1, "重置令牌不能为空"),
  // ISO 8601 datetime string (e.g., "2024-01-01T12:00:00Z")
  expiresAt: z.string().refine(
    (val) => {
      try {
        const date = new Date(val);
        return !Number.isNaN(date.getTime()) && date.toISOString() === val;
      }
      catch {
        return false;
      }
    },
    { message: "必须是有效的 ISO 8601 日期时间字符串" },
  ),
});

export const CleanupDailySchema = z.object({
  // YYYY-MM-DD format
  targetDate: z.string().refine(
    (val) => {
      if (!DATE_REGEX.test(val))
        return false;
      const date = new Date(`${val}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(val);
    },
    { message: "必须是有效的 YYYY-MM-DD 格式日期" },
  ).optional(),
});

export const CleanupOldLogsSchema = z.object({
  daysToKeep: z.number().int("保留天数必须为整数").positive("保留天数必须为正整数"),
});

export const NotificationPushSchema = z.object({
  userId: z.uuid("用户ID必须是有效的 UUID"),
  title: z.string().min(1, "标题不能为空"),
  body: z.string().min(1, "内容不能为空"),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Job definition registry - 关联 job name 与其数据类型
 */
export type JobDefinitionRegistry = {
  [JobName.EMAIL_SEND_WELCOME]: z.infer<typeof EmailSendWelcomeSchema>;
  [JobName.EMAIL_SEND_RESET_PASSWORD]: z.infer<typeof EmailSendResetPasswordSchema>;
  [JobName.CLEANUP_DAILY]: z.infer<typeof CleanupDailySchema>;
  [JobName.CLEANUP_OLD_LOGS]: z.infer<typeof CleanupOldLogsSchema>;
  [JobName.NOTIFICATION_PUSH]: z.infer<typeof NotificationPushSchema>;
};

/**
 * Schema registry for runtime validation
 */
export const JobSchemaRegistry = {
  [JobName.EMAIL_SEND_WELCOME]: EmailSendWelcomeSchema,
  [JobName.EMAIL_SEND_RESET_PASSWORD]: EmailSendResetPasswordSchema,
  [JobName.CLEANUP_DAILY]: CleanupDailySchema,
  [JobName.CLEANUP_OLD_LOGS]: CleanupOldLogsSchema,
  [JobName.NOTIFICATION_PUSH]: NotificationPushSchema,
} as const satisfies Record<JobNameType, z.ZodSchema>;

/**
 * Queue-to-Jobs mapping - 确保每个队列只能使用特定的 job name
 */
export type QueueJobsMapping = {
  [QueueName.EMAIL]:
    | typeof JobName.EMAIL_SEND_WELCOME
    | typeof JobName.EMAIL_SEND_RESET_PASSWORD;
  [QueueName.CLEANUP]: typeof JobName.CLEANUP_DAILY | typeof JobName.CLEANUP_OLD_LOGS;
  [QueueName.NOTIFICATION]: typeof JobName.NOTIFICATION_PUSH;
};
