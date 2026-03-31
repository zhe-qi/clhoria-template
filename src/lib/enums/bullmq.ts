/**
 * 定义所有队列名称为常量枚举
 */
export const QueueName = {
  EMAIL: "email",
  CLEANUP: "cleanup",
  NOTIFICATION: "notification",
} as const;

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName];

/**
 * 定义所有 Job 名称为常量枚举
 */
export const JobName = {
  // Email queue jobs
  EMAIL_SEND_WELCOME: "send-welcome",
  EMAIL_SEND_RESET_PASSWORD: "send-reset-password",

  // Cleanup queue jobs
  CLEANUP_DAILY: "daily-cleanup",
  CLEANUP_OLD_LOGS: "old-logs-cleanup",

  // Notification queue jobs
  NOTIFICATION_PUSH: "push-notification",
} as const;

export type JobNameType = (typeof JobName)[keyof typeof JobName];
