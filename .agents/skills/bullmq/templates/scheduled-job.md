# 定时任务设置模板

## Cron 表达式语法

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
 │ │ │ │ │
 * * * * *
```

### 常用示例

```typescript
"0 0 * * *"       // 每天午夜（00:00）
"0 */6 * * *"     // 每 6 小时
"0 9 * * 1-5"     // 工作日上午 9 点
"*/15 * * * *"    // 每 15 分钟
"0 0 1 * *"       // 每月 1 号午夜
"0 0 * * 0"       // 每周日午夜
"30 2 * * *"      // 每天凌晨 2:30
```

### 在线工具

- [crontab.guru](https://crontab.guru/) - Cron 表达式解释器
- [crontab-generator.org](https://crontab-generator.org/) - Cron 表达式生成器

---

## 调度定时任务

### 基本用法

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";
import { QueueName, JobName } from "@/lib/enums/bullmq";
import logger from "@/lib/services/logger";

export function schedulePeriodicJobs(): Promise<void> {
  const program = Effect.gen(function* () {
    // 每天午夜执行清理任务
    yield* queueManager.scheduleJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_DAILY,
      {},
      {
        pattern: "0 0 * * *", // Cron 表达式
      },
    );

    logger.info("[Scheduler]: 定时任务已调度");
  });

  return Effect.runPromise(program);
}
```

### 在 bootstrap 中调用

```typescript
// src/lib/infrastructure/bootstrap.ts
export function bootstrap(): Promise<void> {
  const program = Effect.gen(function* () {
    // 1. 注册 Workers
    yield* registerWorkers();

    // 2. 调度定时任务
    yield* schedulePeriodicJobs();
  });

  return Effect.runPromise(program);
}
```

---

## RepeatOptions 配置

```typescript
interface RepeatOptions {
  pattern?: string; // Cron 表达式
  every?: number; // 间隔时间（毫秒）
  limit?: number; // 最大执行次数
  immediately?: boolean; // 是否立即执行一次
  tz?: string; // 时区（如 "Asia/Shanghai"）
  startDate?: Date | string; // 开始时间
  endDate?: Date | string; // 结束时间
}
```

### 示例配置

```typescript
// 使用 Cron 表达式
{
  pattern: "0 0 * * *",
  tz: "Asia/Shanghai", // 中国时区
}

// 固定间隔（每小时）
{
  every: 3600000, // 毫秒
}

// 限制执行次数
{
  pattern: "0 9 * * 1-5",
  limit: 10, // 最多执行 10 次
}

// 设置时间范围
{
  pattern: "0 0 * * *",
  startDate: new Date("2024-01-01"),
  endDate: new Date("2025-01-01"),
}

// 立即执行一次（用于测试）
{
  pattern: "0 0 * * *",
  immediately: true,
}
```

---

## 完整示例

```typescript
// src/lib/infrastructure/scheduled-jobs.ts
import { Effect } from "effect";
import { queueManager } from "./bullmq-adapter";
import { QueueName, JobName } from "@/lib/enums/bullmq";
import logger from "@/lib/services/logger";

export function schedulePeriodicJobs() {
  return Effect.gen(function* () {
    // 每天午夜执行日常清理
    yield* queueManager.scheduleJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_DAILY,
      {},
      {
        pattern: "0 0 * * *",
        tz: "Asia/Shanghai",
      },
    );

    // 每小时清理旧日志
    yield* queueManager.scheduleJob(
      QueueName.CLEANUP,
      JobName.CLEANUP_OLD_LOGS,
      { daysToKeep: 7 },
      {
        every: 3600000, // 1 小时
      },
    );

    // 工作日上午 9 点发送通知
    yield* queueManager.scheduleJob(
      QueueName.NOTIFICATION,
      JobName.NOTIFICATION_PUSH,
      { title: "每日提醒", body: "今日任务" },
      {
        pattern: "0 9 * * 1-5",
        tz: "Asia/Shanghai",
      },
    );

    logger.info("[Scheduler]: 所有定时任务已调度");
  });
}
```

---

## 移除定时任务

```typescript
// 移除特定定时任务
await Effect.runPromise(
  queueManager.unscheduleJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY),
);

// 在程序中使用
const program = Effect.gen(function* () {
  const removed = yield* queueManager.unscheduleJob(
    QueueName.CLEANUP,
    JobName.CLEANUP_DAILY,
  );

  if (removed) {
    logger.info("[Scheduler]: 定时任务已移除");
  }
});

await Effect.runPromise(program);
```

---

## 查询已调度任务

```typescript
const program = Effect.gen(function* () {
  const schedulers = yield* queueManager.getScheduledJobs(QueueName.CLEANUP);

  for (const scheduler of schedulers) {
    logger.info(
      {
        id: scheduler.id,
        next: scheduler.next,
        pattern: scheduler.pattern,
      },
      "[Scheduler]: 定时任务",
    );
  }
});

await Effect.runPromise(program);
```

---

## Job Schedulers API（v5.16.0+）

BullMQ v5.16.0 引入了新的 Job Schedulers API：

- `upsertJobScheduler(id, repeat, jobData)` - 创建或更新调度器
- `removeJobScheduler(id)` - 移除调度器
- `getJobSchedulers()` - 获取所有调度器

### 优势

- **Scheduler ID 唯一**：`queueName:jobName` 格式
- **自动去重**：相同 ID 会覆盖旧的调度器
- **独立管理**：不影响队列中的其他任务

### 旧版本差异

```typescript
// ❌ 旧方式（Repeatable Jobs，已弃用）
queue.add(jobName, data, {
  repeat: { pattern: "0 0 * * *" },
});

// ✅ 新方式（Job Schedulers API）
queue.upsertJobScheduler(schedulerId, repeatOptions, {
  name: jobName,
  data,
});
```

QueueManager 的 `scheduleJob` 方法内部使用了新的 Job Schedulers API。

---

## 最佳实践

### 1. 调度时机

在应用启动时调度（`bootstrap.ts`）：

```typescript
export function bootstrap(): Promise<void> {
  const program = Effect.gen(function* () {
    // 1. 注册 Workers
    yield* registerWorkers();

    // 2. 调度定时任务
    yield* schedulePeriodicJobs();
  });

  return Effect.runPromise(program);
}
```

### 2. 避免重复调度

使用 `scheduleJob` 方法（内部调用 `upsertJobScheduler`）会自动覆盖相同的调度器，避免重复。

### 3. 定时任务数据验证

定时任务的 data 也会经过 Zod 验证：

```typescript
// ❌ 错误：数据验证失败
yield* queueManager.scheduleJob(
  QueueName.EMAIL,
  JobName.EMAIL_SEND_WELCOME,
  { email: "invalid-email" }, // 验证失败
  { pattern: "0 0 * * *" },
);

// ✅ 正确：数据符合 schema
yield* queueManager.scheduleJob(
  QueueName.EMAIL,
  JobName.EMAIL_SEND_WELCOME,
  {
    email: "user@example.com",
    username: "testuser",
  },
  { pattern: "0 0 * * *" },
);
```

### 4. 测试定时任务

使用 `immediately: true` 立即执行一次进行测试：

```typescript
yield* queueManager.scheduleJob(
  QueueName.CLEANUP,
  JobName.CLEANUP_DAILY,
  {},
  {
    pattern: "0 0 * * *",
    immediately: true, // 立即执行一次用于测试
  },
);
```

### 5. 时区注意事项

明确指定时区，避免服务器时区变化导致的问题：

```typescript
{
  pattern: "0 0 * * *",
  tz: "Asia/Shanghai", // 明确指定中国时区
}
```

### 6. 错误处理

定时任务失败会自动重试（根据 Worker 配置）。确保 Worker processor 正确抛出异常。

---

## 常见场景

### 每日报表生成

```typescript
yield* queueManager.scheduleJob(
  QueueName.REPORT,
  JobName.REPORT_GENERATE_DAILY,
  {},
  {
    pattern: "0 1 * * *", // 每天凌晨 1 点
    tz: "Asia/Shanghai",
  },
);
```

### 定期数据清理

```typescript
yield* queueManager.scheduleJob(
  QueueName.CLEANUP,
  JobName.CLEANUP_OLD_LOGS,
  { daysToKeep: 30 },
  {
    pattern: "0 3 * * 0", // 每周日凌晨 3 点
    tz: "Asia/Shanghai",
  },
);
```

### 工作日提醒

```typescript
yield* queueManager.scheduleJob(
  QueueName.NOTIFICATION,
  JobName.NOTIFICATION_PUSH,
  { title: "每日提醒", body: "查看今日任务" },
  {
    pattern: "0 9 * * 1-5", // 工作日上午 9 点
    tz: "Asia/Shanghai",
  },
);
```

### 定期数据同步

```typescript
yield* queueManager.scheduleJob(
  QueueName.SYNC,
  JobName.SYNC_EXTERNAL_DATA,
  {},
  {
    every: 600000, // 每 10 分钟
  },
);
```

---

## 监控定时任务

在 Bull Board（`/api/admin/queue-board`）中可以查看：
- 定时任务调度器列表
- 下次执行时间
- 执行历史

---

## 下一步

定时任务设置后，可以：
1. 在 Bull Board 中查看调度器状态
2. 手动触发一次执行进行测试
3. 监控任务执行日志
4. 根据需要调整 Cron 表达式或间隔时间
