# Worker 注册模板

## 注册位置

在 `src/lib/infrastructure/bootstrap.ts` 中注册所有 Workers。

## 基本模板

```typescript
import { Effect } from "effect";
import { queueManager } from "./bullmq-adapter";
import { QueueName, JobName } from "@/lib/enums/bullmq";
import logger from "@/lib/services/logger";

export function bootstrap(): Promise<void> {
  const program = Effect.gen(function* () {
    // ... 其他初始化

    // 注册 Worker
    yield* queueManager.registerWorker(
      QueueName.QUEUE_NAME,
      async (job) => {
        const { field1, field2 } = job.data; // 类型安全

        logger.info(
          { jobId: job.id, field1 },
          "[QueueName]: 开始处理任务",
        );

        try {
          // 业务逻辑
          await processJob(job.data);

          logger.info({ jobId: job.id }, "[QueueName]: 任务完成");
          return { success: true };
        } catch (error) {
          logger.error(
            { jobId: job.id, error },
            "[QueueName]: 任务处理失败",
          );
          throw error; // BullMQ 会自动重试
        }
      },
      {
        concurrency: 5, // 并发处理数
        limiter: {
          max: 10,
          duration: 1000, // 每秒最多 10 个任务
        },
      },
    );

    logger.info("[Bootstrap]: QueueName worker 已注册");
  });

  return Effect.runPromise(program);
}
```

---

## Worker 配置选项

```typescript
interface WorkerOptions {
  concurrency?: number; // 并发处理任务数（默认 1）
  limiter?: {
    // 限流配置
    max: number; // 时间窗口内最大任务数
    duration: number; // 时间窗口（毫秒）
  };
  lockDuration?: number; // 任务锁定时间（毫秒，默认 30000）
  maxStalledCount?: number; // 最大停滞次数（默认 1）
  stalledInterval?: number; // 停滞检查间隔（毫秒，默认 30000）
}
```

### 常用配置示例

```typescript
// 高并发处理
{
  concurrency: 10,
  limiter: { max: 100, duration: 1000 }, // 每秒最多 100 个
}

// 低并发、长时间任务
{
  concurrency: 2,
  lockDuration: 300000, // 5 分钟锁定
}

// 严格限流
{
  concurrency: 1,
  limiter: { max: 5, duration: 60000 }, // 每分钟最多 5 个
}
```

---

## Processor 函数类型

```typescript
type Processor<T> = (job: Job<T>) => Promise<any>;

interface Job<T> {
  id: string; // 任务 ID
  name: string; // 任务名称
  data: T; // 类型安全的 data
  opts: JobOptions; // 任务选项
  attemptsMade: number; // 已尝试次数
  timestamp: number; // 创建时间戳
  returnvalue?: any; // 返回值
  // ... 其他属性
}
```

---

## 处理多种任务类型

同一个队列可以有多种任务类型，使用 `job.name` 区分：

```typescript
yield* queueManager.registerWorker(
  QueueName.EMAIL,
  async (job) => {
    const { name, data, id } = job;

    if (name === JobName.EMAIL_SEND_WELCOME) {
      await sendWelcomeEmail(data);
      logger.info({ jobId: id }, "[Email]: 欢迎邮件已发送");
    } else if (name === JobName.EMAIL_SEND_RESET_PASSWORD) {
      await sendResetPasswordEmail(data);
      logger.info({ jobId: id }, "[Email]: 密码重置邮件已发送");
    }

    return { success: true };
  },
  { concurrency: 3 },
);
```

---

## 业务逻辑分离

复杂逻辑建议分离到独立的 service 文件：

```typescript
// src/lib/services/email-service.ts
export async function sendWelcomeEmail(data: WelcomeEmailData) {
  // 发送邮件逻辑
}

export async function sendResetPasswordEmail(data: ResetPasswordData) {
  // 发送邮件逻辑
}

// bootstrap.ts
yield* queueManager.registerWorker(
  QueueName.EMAIL,
  async (job) => {
    if (job.name === JobName.EMAIL_SEND_WELCOME) {
      await sendWelcomeEmail(job.data);
    } else if (job.name === JobName.EMAIL_SEND_RESET_PASSWORD) {
      await sendResetPasswordEmail(job.data);
    }
  },
);
```

---

## 错误处理

### ❌ 错误：吞掉异常（任务永远不会重试）

```typescript
async (job) => {
  try {
    await processJob(job.data);
  } catch (error) {
    logger.error({ error }, "处理失败");
    return { success: false }; // ❌ 任务标记为成功
  }
};
```

### ✅ 正确：抛出异常（触发重试）

```typescript
async (job) => {
  try {
    await processJob(job.data);
    return { success: true };
  } catch (error) {
    logger.error({ error }, "处理失败");
    throw error; // ✅ BullMQ 会重试
  }
};
```

### ✅ 部分错误可忽略

```typescript
async (job) => {
  try {
    await sendEmail(job.data.email);
  } catch (error) {
    if (error.code === "EMAIL_NOT_FOUND") {
      // 邮箱不存在，不需要重试
      logger.warn({ error }, "邮箱不存在，跳过任务");
      return { skipped: true };
    }
    // 其他错误重试
    throw error;
  }
};
```

---

## 重试策略

### 在添加任务时配置

```typescript
await Effect.runPromise(
  queueManager.addJob(
    QueueName.EMAIL,
    JobName.EMAIL_SEND_WELCOME,
    data,
    {
      attempts: 5, // 最多重试 5 次
      backoff: {
        type: "exponential", // 指数退避
        delay: 2000, // 初始延迟 2 秒
      },
    },
  ),
);
```

### 重试策略类型

```typescript
// 固定延迟
{ type: "fixed", delay: 5000 } // 每次重试延迟 5 秒

// 指数退避
{ type: "exponential", delay: 1000 } // 1s, 2s, 4s, 8s, 16s...

// 自定义延迟
{ type: "custom" } // 需要在 Worker 中实现自定义逻辑
```

---

## 日志格式（必须）

```typescript
// ✅ 正确：数据对象在第一个参数
logger.info({ jobId: job.id, userId: job.data.userId }, "[Queue]: 消息");

// ❌ 错误：使用 console.log
console.log("Processing job", job.id); // 不要这样做

// ❌ 错误：数据在第二个参数
logger.info("[Queue]: 消息", { jobId: job.id }); // 不要这样做
```

---

## 完整示例

```typescript
// src/lib/infrastructure/bootstrap.ts
import { Effect } from "effect";
import { queueManager } from "./bullmq-adapter";
import { QueueName, JobName } from "@/lib/enums/bullmq";
import { sendWelcomeEmail, sendResetPasswordEmail } from "@/lib/services/email";
import { performDailyCleanup, cleanupOldLogs } from "@/lib/services/cleanup";
import logger from "@/lib/services/logger";

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
          logger.info({ jobId: id }, "[Email]: 欢迎邮件已发送");
        } else if (name === JobName.EMAIL_SEND_RESET_PASSWORD) {
          await sendResetPasswordEmail(data);
          logger.info({ jobId: id }, "[Email]: 密码重置邮件已发送");
        }
      },
      { concurrency: 3 },
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
          logger.info({ jobId: id }, "[Cleanup]: 旧日志已清理");
        }
      },
    );

    logger.info("[Bootstrap]: BullMQ workers 已注册");
  });

  return Effect.runPromise(program);
}
```

---

## 常见问题

### Worker 何时注册？

在应用启动时（bootstrap.ts），确保在处理任何请求之前 Worker 已就绪。

### 可以为同一队列注册多个 Worker 吗？

不可以。同一个队列只能注册一个 Worker。重复注册会返回同一个实例（幂等）。

### Worker 会自动验证数据吗？

是的。Worker 在处理任务前会自动使用 `JobSchemaRegistry` 验证 `job.data`。

### 如何停止 Worker？

QueueManager 是 Singleton，会在应用关闭时自动销毁所有 Workers（`destroyAllSingletons()`）。

---

## 下一步

Worker 注册后，可以：
1. 在业务代码中添加任务到队列
2. （可选）设置定时任务（参考 [scheduled-job.md](scheduled-job.md)）
3. 在 Bull Board 中监控队列状态（`/api/admin/queue-board`）
