---
name: bullmq
description: 创建或修改 BullMQ 队列任务。当需要创建新队列、添加任务类型、注册 Worker、设置定时任务、或用户请求"添加后台任务/队列处理"时使用
argument-hint: "[queue-name/job-name]"
---

# BullMQ 队列任务开发指南

## 技术栈

- **队列系统**: BullMQ v5.16.0+
- **类型安全**: TypeScript + Zod 运行时验证
- **Effect 集成**: Effect 系统封装（Promise → Effect）
- **Redis**: ioredis (`maxRetriesPerRequest: null`)
- **UI 监控**: Bull Board (Hono adapter)

## 文件结构

```
src/lib/
├── enums/bullmq.ts                      # 队列和任务名称枚举
├── infrastructure/
│   ├── bullmq/
│   │   └── job-registry.ts              # 类型映射和 Zod 验证
│   ├── bullmq-adapter.ts                # QueueManager 核心类
│   └── effect/services/bullmq.ts        # Effect Layer
│   └── bootstrap.ts                     # Worker 注册位置
src/routes/admin/
└── queue-board.index.ts                 # Bull Board UI 路由
```

## 核心规则（MANDATORY）

### 三层类型安全架构

1. **编译时约束**：`QueueJobsMapping` 确保队列只能使用特定 job name
2. **类型推断**：`JobDefinitionRegistry` 自动推断 job data 类型
3. **运行时验证**：`JobSchemaRegistry` 使用 Zod 验证数据

### 命名约定

- 队列名称：小写字母（`email`、`cleanup`，不用 `EMAIL_QUEUE`）
- 任务名称：kebab-case（`send-welcome`、`daily-cleanup`）
- 常量枚举：对象字面量 + `as const`（不用 `enum`）
- 索引签名：`[JobName.XXX]: Schema` 形式

### 数据验证规则

- 所有 job data 必须有对应的 Zod schema
- Schema 必须包含中文错误消息
- 日期格式：ISO 8601 字符串（`2024-01-01T00:00:00Z`）
- 日期字符串：YYYY-MM-DD 格式
- UUID：使用 `z.uuid()` 验证

### Effect 使用规范

- 所有异步操作使用 Effect 封装（`Effect.tryPromise`）
- 同步操作使用 `Effect.sync`
- 错误统一返回 `Error` 类型
- Worker 注册使用 `Effect.sync`（立即返回 Worker 实例）

## 开发步骤

### 1. 添加新队列

参考 [queue-definition.md](templates/queue-definition.md)

1. 在 `src/lib/enums/bullmq.ts` 添加队列名称
2. 在 `job-registry.ts` 创建 `QueueJobsMapping` 映射（初始为 `never`）
3. 注册 Worker（见步骤 3）

### 2. 添加新任务类型

参考 [job-definition.md](templates/job-definition.md)

1. 在 `src/lib/enums/bullmq.ts` 添加任务名称
2. 在 `job-registry.ts` 创建 Zod schema
3. 更新 `JobDefinitionRegistry` 类型映射
4. 更新 `JobSchemaRegistry` 验证映射
5. 更新 `QueueJobsMapping` 关联队列

### 3. 注册 Worker

参考 [worker-registration.md](templates/worker-registration.md)

1. 在应用启动时调用 `queueManager.registerWorker`
2. 实现 processor 函数（接收 `Job<T>` 类型）
3. 可选配置：并发数、限流、重试策略
4. Worker 自动验证 job data（无需手动验证）

### 4. 添加任务到队列

在业务代码中使用（无需创建文件）：

```typescript
import { Effect } from "effect";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";
import { JobName, QueueName } from "@/lib/enums/bullmq";

// 添加任务
const program = queueManager.addJob(
  QueueName.EMAIL,
  JobName.EMAIL_SEND_WELCOME,
  { email: "user@example.com", username: "testuser" },
  { priority: 1, delay: 5000 }, // 可选配置
);

await Effect.runPromise(program);
```

### 5. 设置定时任务

参考 [scheduled-job.md](templates/scheduled-job.md)

使用 Job Schedulers API（BullMQ v5.16.0+）：

```typescript
// 调度定时任务
const program = queueManager.scheduleJob(
  QueueName.CLEANUP,
  JobName.CLEANUP_DAILY,
  {},
  { pattern: "0 0 * * *" }, // Cron 表达式
);

await Effect.runPromise(program);

// 移除定时任务
await Effect.runPromise(
  queueManager.unscheduleJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY),
);
```

## 模板参考

### 队列和任务定义

参考 [queue-definition.md](templates/queue-definition.md)

包含：
- `QueueName` 枚举定义
- `JobName` 枚举定义
- 命名规范

### Job Registry 类型映射

参考 [job-definition.md](templates/job-definition.md)

包含：
- Zod schema 定义（含验证规则）
- `JobDefinitionRegistry` 类型映射
- `JobSchemaRegistry` 验证映射
- `QueueJobsMapping` 队列关联

### Worker 注册

参考 [worker-registration.md](templates/worker-registration.md)

包含：
- Worker 注册位置（bootstrap.ts）
- Processor 函数实现
- Worker 配置选项
- 错误处理

### 定时任务设置

参考 [scheduled-job.md](templates/scheduled-job.md)

包含：
- Cron 表达式语法
- 调度和移除定时任务
- 查询已调度任务
- 定时任务最佳实践

## 完整示例

参考 [examples/email-cleanup-queues.md](examples/email-cleanup-queues.md) 查看完整的 Email 和 Cleanup 队列实现。

## 关键 API

### QueueManager 核心方法

```typescript
// 添加任务（Effect 封装 + Zod 验证）
addJob<Q, N>(
  queueName: Q,
  jobName: N,
  data: JobDataByName<N>,
  opts?: JobsOptions,
): Effect<Job>

// 注册 Worker（Effect 封装）
registerWorker<Q>(
  queueName: Q,
  processor: (job: Job) => Promise<any>,
  options?: WorkerOptions,
): Effect<Worker>

// 调度定时任务（Effect 封装 + Zod 验证）
scheduleJob<Q, N>(
  queueName: Q,
  jobName: N,
  data: JobDataByName<N>,
  repeatOptions: RepeatOptions,
): Effect<void>

// 移除定时任务
unscheduleJob(queueName: string, jobName: string): Effect<boolean>

// 查询定时任务
getScheduledJobs(queueName: string): Effect<JobScheduler[]>

// 获取队列实例（用于 Bull Board）
getQueue(name: string): Queue

// 优雅关闭
close(timeoutMs?: number): Effect<void>
```

## 最佳实践

### DO: 推荐做法

- 使用类型安全的 `addJob` 和 `registerWorker` 方法
- 所有 job data 定义 Zod schema 并添加中文错误消息
- Worker processor 中使用结构化日志（`logger.info({ jobId, ... }, "[Queue]: message")`）
- 定时任务使用明确的 cron 表达式（带注释）
- Worker 配置合理的并发数和重试策略
- 长时间运行的任务设置 `timeout`

### DON'T: 避免做法

- 不要使用 `getQueue` 直接添加任务（绕过类型检查和验证）
- 不要在 job data 中传递大对象（使用引用 ID）
- 不要在 Worker 中使用 `console.log`（使用 `logger`）
- 不要忘记在 `QueueJobsMapping` 中关联队列和任务
- 不要修改已有 job 的 schema（创建新版本）
- 不要在 processor 中抛出未捕获异常（使用 try-catch）

## 集成点

### 与 Effect 系统集成

```typescript
import { BullMQService } from "@/lib/infrastructure/effect/services/bullmq";

const program = Effect.gen(function* () {
  const qm = yield* BullMQService;
  yield* qm.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_WELCOME, data);
});
```

### 与 db-schema 配合使用

定时任务可能需要查询数据库：

```typescript
import { subDays } from "date-fns";
import { lt } from "drizzle-orm";
import db from "@/db";
import { auditLogs } from "@/db/schema";

// Worker processor 中
const processor = async (job: Job<CleanupData>) => {
  const { daysToKeep } = job.data;

  const cutoffDate = subDays(new Date(), daysToKeep);

  await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoffDate.toISOString()));

  logger.info({ daysToKeep }, "[Cleanup]: 旧日志已清理");
};
```

### Bull Board 监控

访问 `/api/admin/queue-board` 查看：
- 队列状态（waiting/active/completed/failed）
- 任务详情和重试
- Worker 性能指标
- 定时任务调度器

## 常见问题

### Worker 何时注册？

在应用启动时（`src/lib/infrastructure/bootstrap.ts`）注册所有 Worker。

### 如何处理失败的任务？

BullMQ 自动重试（默认 3 次）。Worker 可配置：

```typescript
registerWorker(queueName, processor, {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
});
```

### 定时任务如何避免重复？

使用 `scheduleJob`（内部调用 `upsertJobScheduler`），相同 `schedulerId` 会覆盖。

### 如何测试队列逻辑？

参考 `src/lib/infrastructure/__tests__/bullmq-adapter.test.ts`：
- 测试类型安全（编译时）
- 测试运行时验证（Zod）
- 测试 Worker processor 逻辑
- 测试定时任务调度

## 重要提醒

- BullMQ Worker 需要专用 Redis 连接（`maxRetriesPerRequest: null`）
- QueueManager 是 Singleton，自动在 shutdown 时销毁
- Worker 注册是幂等的（重复注册返回同一个实例）
- 定时任务使用 Job Schedulers API（v5.16.0+），不是 Repeatable Jobs
- Bull Board 动态获取队列（无需手动注册）
