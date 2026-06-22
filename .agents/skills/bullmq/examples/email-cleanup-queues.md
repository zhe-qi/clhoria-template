# Email 和 Cleanup 队列完整示例

展示完整的 BullMQ 队列实现，包括枚举定义、Job Registry、Worker 注册和使用示例。

---

## 1. 枚举定义

### 文件：`src/lib/enums/bullmq.ts`

```typescript
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
```

---

## 2. Job Registry 配置

### 文件：`src/lib/infrastructure/bullmq/job-registry.ts`

```typescript
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
      } catch {
        return false;
      }
    },
    { message: "必须是有效的 ISO 8601 日期时间字符串" },
  ),
});

export const CleanupDailySchema = z.object({
  // YYYY-MM-DD format
  targetDate: z
    .string()
    .refine(
      (val) => {
        if (!DATE_REGEX.test(val)) return false;
        const date = new Date(`${val}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(val);
      },
      { message: "必须是有效的 YYYY-MM-DD 格式日期" },
    )
    .optional(),
});

export const CleanupOldLogsSchema = z.object({
  daysToKeep: z.number().int().positive("保留天数必须为正整数"),
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
  [QueueName.CLEANUP]:
    | typeof JobName.CLEANUP_DAILY
    | typeof JobName.CLEANUP_OLD_LOGS;
  [QueueName.NOTIFICATION]: typeof JobName.NOTIFICATION_PUSH;
};
```

---

## 3. Worker 注册

### 文件：`src/lib/infrastructure/bootstrap.ts`

```typescript
import { Effect } from "effect";
import { queueManager } from "./bullmq-adapter";
import { QueueName, JobName } from "@/lib/enums/bullmq";
import logger from "@/lib/services/logger";

// 假设的业务服务（实际项目中需要实现）
import { sendWelcomeEmail, sendResetPasswordEmail } from "@/lib/services/email";
import { performDailyCleanup, cleanupOldLogs } from "@/lib/services/cleanup";

export function bootstrap(): Promise<void> {
  const program = Effect.gen(function* () {
    // ... 其他初始化

    // 注册 Email Worker
    yield* queueManager.registerWorker(
      QueueName.EMAIL,
      async (job) => {
        const { name, data, id } = job;

        if (name === JobName.EMAIL_SEND_WELCOME) {
          await sendWelcomeEmail(data);
          logger.info({ jobId: id, email: data.email }, "[Email]: 欢迎邮件已发送");
        } else if (name === JobName.EMAIL_SEND_RESET_PASSWORD) {
          await sendResetPasswordEmail(data);
          logger.info({ jobId: id, email: data.email }, "[Email]: 密码重置邮件已发送");
        }

        return { success: true };
      },
      { concurrency: 3 }, // 最多同时处理 3 封邮件
    );

    // 注册 Cleanup Worker
    yield* queueManager.registerWorker(
      QueueName.CLEANUP,
      async (job) => {
        const { name, data, id } = job;

        if (name === JobName.CLEANUP_DAILY) {
          await performDailyCleanup(data);
          logger.info({ jobId: id }, "[Cleanup]: 每日清理已完成");
        } else if (name === JobName.CLEANUP_OLD_LOGS) {
          await cleanupOldLogs(data);
          logger.info({ jobId: id, daysToKeep: data.daysToKeep }, "[Cleanup]: 旧日志已清理");
        }

        return { success: true };
      },
    );

    // 调度定时任务
    yield* queueManager.scheduleJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_DAILY,
      {},
      { pattern: "0 0 * * *" }, // 每天午夜
    );

    logger.info("[Bootstrap]: BullMQ workers 已注册");
  });

  return Effect.runPromise(program);
}
```

---

## 4. 使用示例

### 在业务代码中添加任务

#### 示例 1：用户注册时发送欢迎邮件

```typescript
// src/routes/admin/auth/handlers.ts
import type { Context } from "hono";
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";
import { JobName, QueueName } from "@/lib/enums/bullmq";
import { Resp } from "@/lib/core/resp";
import { HttpStatusCodes } from "@/lib/enums";
import logger from "@/lib/services/logger";

export const register = async (c: Context) => {
  const body = c.req.valid("json");

  // 创建用户...
  const user = await createUser(body);

  // 添加欢迎邮件任务
  await Effect.runPromise(
    queueManager.addJob(
      QueueName.EMAIL,
      JobName.EMAIL_SEND_WELCOME,
      {
        email: user.email,
        username: user.username,
        subject: "欢迎加入我们！",
      },
      { priority: 1 }, // 高优先级
    ),
  );

  logger.info({ userId: user.id }, "[Register]: 用户注册成功，欢迎邮件已加入队列");

  return c.json(Resp.ok(user), HttpStatusCodes.CREATED);
};
```

#### 示例 2：忘记密码时发送重置邮件

```typescript
// src/routes/public/auth/handlers.ts
import { addHours } from "date-fns";

export const forgotPassword = async (c: Context) => {
  const { email } = c.req.valid("json");

  // 查找用户...
  const user = await findUserByEmail(email);
  if (!user) {
    return c.json(Resp.fail("用户不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // 生成重置令牌...
  const token = generateResetToken();
  const expiresAt = addHours(new Date(), 1).toISOString();

  // 保存令牌到数据库...
  await saveResetToken(user.id, token, expiresAt);

  // 添加密码重置邮件任务
  await Effect.runPromise(
    queueManager.addJob(
      QueueName.EMAIL,
      JobName.EMAIL_SEND_RESET_PASSWORD,
      {
        email: user.email,
        resetToken: token,
        expiresAt,
      },
      {
        priority: 2, // 高优先级
        delay: 1000, // 延迟 1 秒发送
      },
    ),
  );

  logger.info({ email }, "[ForgotPassword]: 密码重置邮件已加入队列");

  return c.json(Resp.ok({ message: "重置邮件已发送" }), HttpStatusCodes.OK);
};
```

#### 示例 3：手动触发清理任务

```typescript
// src/routes/admin/system/maintenance.handlers.ts
export const triggerCleanup = async (c: Context) => {
  const { sub } = c.get("jwtPayload");

  // 添加清理任务
  await Effect.runPromise(
    queueManager.addJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_OLD_LOGS,
      { daysToKeep: 30 },
      { priority: 2 },
    ),
  );

  logger.info({ userId: sub }, "[Maintenance]: 清理任务已触发");

  return c.json(
    Resp.ok({ message: "清理任务已添加到队列" }),
    HttpStatusCodes.OK,
  );
};
```

---

## 5. Bull Board 集成

### 文件：`src/routes/admin/queue-board.index.ts`

```typescript
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";

import { createRouter } from "@/lib/core/create-app";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";

const serverAdapter = new HonoAdapter(serveStatic);
serverAdapter.setBasePath("/api/admin/queue-board");

// 动态获取所有已注册的队列
const getQueues = () => {
  const queueNames = queueManager.getQueueNames();
  return queueNames.map(name => new BullMQAdapter(queueManager.getQueue(name)));
};

createBullBoard({
  queues: getQueues(),
  serverAdapter,
});

const queueBoard = createRouter();

// 挂载 Bull Board UI
queueBoard.route("/", serverAdapter.registerPlugin());

export default queueBoard;
```

访问 `/api/admin/queue-board` 查看队列监控界面。

---

## 6. 测试示例

### 文件：`src/lib/infrastructure/__tests__/bullmq-adapter.test.ts`

```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { JobName, QueueName } from "@/lib/enums/bullmq";
import { queueManager } from "../bullmq-adapter";

describe("Email Queue", () => {
  it("should add EMAIL_SEND_WELCOME job", async () => {
    const program = queueManager.addJob(
      QueueName.EMAIL,
      JobName.EMAIL_SEND_WELCOME,
      {
        email: "user@example.com",
        username: "testuser",
      },
    );

    const job = await Effect.runPromise(program);

    expect(job.name).toBe(JobName.EMAIL_SEND_WELCOME);
    expect(job.data.email).toBe("user@example.com");
    expect(job.data.username).toBe("testuser");
  });

  it("should reject invalid email", async () => {
    const program = queueManager.addJob(
      QueueName.EMAIL,
      JobName.EMAIL_SEND_WELCOME,
      {
        email: "invalid-email",
        username: "testuser",
      } as any,
    );

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });

  it("should add job with options", async () => {
    const program = queueManager.addJob(
      QueueName.EMAIL,
      JobName.EMAIL_SEND_WELCOME,
      {
        email: "user@example.com",
        username: "testuser",
      },
      {
        priority: 1,
        delay: 5000,
        attempts: 3,
      },
    );

    const job = await Effect.runPromise(program);

    expect(job.opts.priority).toBe(1);
    expect(job.opts.delay).toBe(5000);
    expect(job.opts.attempts).toBe(3);
  });
});

describe("Cleanup Queue", () => {
  it("should add CLEANUP_OLD_LOGS job", async () => {
    const program = queueManager.addJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_OLD_LOGS,
      { daysToKeep: 7 },
    );

    const job = await Effect.runPromise(program);

    expect(job.name).toBe(JobName.CLEANUP_OLD_LOGS);
    expect(job.data.daysToKeep).toBe(7);
  });

  it("should reject negative daysToKeep", async () => {
    const program = queueManager.addJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_OLD_LOGS,
      { daysToKeep: -1 } as any,
    );

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });
});

describe("Scheduled Jobs", () => {
  it("should schedule CLEANUP_DAILY job", async () => {
    const program = queueManager.scheduleJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_DAILY,
      {},
      { pattern: "0 0 * * *" },
    );

    await expect(Effect.runPromise(program)).resolves.toBeUndefined();
  });

  it("should list scheduled jobs", async () => {
    const program = queueManager.getScheduledJobs(QueueName.CLEANUP);

    const schedulers = await Effect.runPromise(program);

    expect(Array.isArray(schedulers)).toBe(true);
  });
});
```

---

## 7. 业务服务示例

### 文件：`src/lib/services/email.ts`

```typescript
import logger from "./logger";

export async function sendWelcomeEmail(data: {
  email: string;
  username: string;
  subject?: string;
}) {
  // 实际的邮件发送逻辑
  logger.info({ email: data.email }, "[EmailService]: 发送欢迎邮件");

  // 模拟邮件发送
  await new Promise(resolve => setTimeout(resolve, 100));

  logger.info({ email: data.email }, "[EmailService]: 欢迎邮件发送成功");
}

export async function sendResetPasswordEmail(data: {
  email: string;
  resetToken: string;
  expiresAt: string;
}) {
  logger.info({ email: data.email }, "[EmailService]: 发送密码重置邮件");

  // 模拟邮件发送
  await new Promise(resolve => setTimeout(resolve, 100));

  logger.info({ email: data.email }, "[EmailService]: 密码重置邮件发送成功");
}
```

### 文件：`src/lib/services/cleanup.ts`

```typescript
import { subDays } from "date-fns";
import { lt } from "drizzle-orm";
import db from "@/db";
import { auditLogs } from "@/db/schema";
import logger from "./logger";

export async function performDailyCleanup(data: { targetDate?: string }) {
  logger.info({ targetDate: data.targetDate }, "[CleanupService]: 开始每日清理");

  // 实际的清理逻辑
  await new Promise(resolve => setTimeout(resolve, 100));

  logger.info("[CleanupService]: 每日清理完成");
}

export async function cleanupOldLogs(data: { daysToKeep: number }) {
  logger.info({ daysToKeep: data.daysToKeep }, "[CleanupService]: 开始清理旧日志");

  const cutoffDate = subDays(new Date(), data.daysToKeep);

  const result = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoffDate.toISOString()));

  logger.info(
    { daysToKeep: data.daysToKeep, deletedCount: result.rowCount },
    "[CleanupService]: 旧日志清理完成",
  );
}
```

---

## 总结

这个完整示例展示了：

1. **枚举定义**：清晰的队列和任务名称常量
2. **Job Registry**：三层类型安全架构（Zod + 类型映射 + 队列关联）
3. **Worker 注册**：在 bootstrap 中注册并处理不同任务类型
4. **业务使用**：在路由处理器中添加任务到队列
5. **Bull Board**：集成监控 UI
6. **测试**：完整的单元测试覆盖
7. **业务服务**：分离的业务逻辑实现

所有代码都遵循项目规范：
- Effect 系统封装
- Zod 运行时验证（中文错误消息）
- 结构化日志格式
- 类型安全的 API
