# 队列和任务名称定义模板

## 文件位置

`src/lib/enums/bullmq.ts`

## QueueName 枚举

```typescript
export const QueueName = {
  EMAIL: "email",
  CLEANUP: "cleanup",
  NOTIFICATION: "notification",
  // 添加新队列
  QUEUE_NAME: "queue-name", // 队列名称（小写）
} as const;

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName];
```

## JobName 枚举

```typescript
export const JobName = {
  // Email queue jobs
  EMAIL_SEND_WELCOME: "send-welcome",
  EMAIL_SEND_RESET_PASSWORD: "send-reset-password",

  // Cleanup queue jobs
  CLEANUP_DAILY: "daily-cleanup",
  CLEANUP_OLD_LOGS: "old-logs-cleanup",

  // Notification queue jobs
  NOTIFICATION_PUSH: "push-notification",

  // 添加新任务
  // {Queue} queue jobs
  QUEUE_NAME_JOB_ACTION: "job-action", // 任务名称（kebab-case）
} as const;

export type JobNameType = (typeof JobName)[keyof typeof JobName];
```

## 命名规范

### 队列名称（QueueName）

- 业务领域名称，小写字母
- 示例：`email`、`cleanup`、`notification`、`report`
- ❌ 不要用：`EMAIL_QUEUE`、`emailQueue`、`Email`

### 任务名称（JobName）

- 动作描述，kebab-case
- 示例：`send-welcome`、`daily-cleanup`、`generate-report`
- ❌ 不要用：`sendWelcome`、`SEND_WELCOME`、`send_welcome`

### 常量命名（TypeScript）

- UPPER_SNAKE_CASE
- 示例：`EMAIL_SEND_WELCOME`、`CLEANUP_DAILY`、`REPORT_GENERATE`

## 分组注释

使用注释标识队列分组：

```typescript
export const JobName = {
  // Email queue jobs
  EMAIL_SEND_WELCOME: "send-welcome",
  EMAIL_SEND_RESET_PASSWORD: "send-reset-password",

  // Cleanup queue jobs
  CLEANUP_DAILY: "daily-cleanup",
  CLEANUP_OLD_LOGS: "old-logs-cleanup",
} as const;
```

## 完整示例

```typescript
// src/lib/enums/bullmq.ts
export const QueueName = {
  EMAIL: "email",           // 邮件队列
  CLEANUP: "cleanup",       // 清理队列
  NOTIFICATION: "notification", // 通知队列
  REPORT: "report",         // 报表队列
} as const;

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName];

export const JobName = {
  // Email queue jobs
  EMAIL_SEND_WELCOME: "send-welcome",
  EMAIL_SEND_RESET_PASSWORD: "send-reset-password",

  // Cleanup queue jobs
  CLEANUP_DAILY: "daily-cleanup",
  CLEANUP_OLD_LOGS: "old-logs-cleanup",

  // Notification queue jobs
  NOTIFICATION_PUSH: "push-notification",

  // Report queue jobs
  REPORT_GENERATE_DAILY: "generate-daily",
  REPORT_GENERATE_MONTHLY: "generate-monthly",
} as const;

export type JobNameType = (typeof JobName)[keyof typeof JobName];
```

## 下一步

添加队列名称后，需要：
1. 在 `job-registry.ts` 中创建 `QueueJobsMapping` 映射（初始为 `never`）
2. 添加对应的任务类型（参考 [job-definition.md](job-definition.md)）
3. 注册 Worker（参考 [worker-registration.md](worker-registration.md)）
