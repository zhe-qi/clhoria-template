# 任务调度系统文档

## 概览

基于 BullMQ 的分布式任务调度系统，支持定时任务、队列管理、任务监控和性能指标统计。

## 核心组件

### 1. 任务队列管理器 (JobQueueManager)

负责任务的添加、执行和管理。

```typescript
import { JobPriority, JobQueueManager } from "@/jobs";

const queueManager = new JobQueueManager();

// 添加单个任务
await queueManager.addJob("example-task", {
  message: "Hello World",
}, {
  priority: JobPriority.NORMAL,
  category: "example",
});

// 添加高优先级任务
await queueManager.addJob("urgent-task", {
  action: "process-payment",
  amount: 100,
}, {
  priority: JobPriority.HIGH,
  timeout: 10000, // 10秒超时
});

// 批量添加任务
const bulkJobs = Array.from({ length: 10 }, (_, i) => ({
  name: "batch-task",
  data: { index: i },
  options: { priority: JobPriority.LOW },
}));

await queueManager.addBulkJobs(bulkJobs);
```

### 2. 任务调度器 (TaskScheduler)

管理定时任务的调度和执行。

```typescript
import { TaskScheduler } from "@/jobs/scheduler";

const scheduler = new TaskScheduler();
await scheduler.initialize();
```

### 3. 任务处理器注册

任务处理器自动从 `handlers/` 目录扫描并注册。

#### 创建任务处理器

在 `src/jobs/handlers/` 目录下创建处理器文件：

```typescript
// src/jobs/handlers/my-tasks.ts
import type { Job } from "bullmq";

import { logger } from "@/lib/logger";

import type { JobHandler } from "../types";

/**
 * @description 数据处理任务
 */
export const dataProcessingJob: JobHandler = async (job: Job) => {
  logger.info("数据处理任务开始", { jobId: job.id });

  const { dataSource, options } = job.data || {};

  // 更新进度
  await job.updateProgress(25);

  // 执行业务逻辑
  // ...

  await job.updateProgress(100);

  return {
    success: true,
    message: "数据处理完成",
    processedCount: 1000,
  };
};
```

## 任务优先级

```typescript
export enum JobPriority {
  LOW = 1, // 低优先级
  NORMAL = 5, // 普通优先级
  HIGH = 10, // 高优先级
  CRITICAL = 20, // 关键优先级
}
```

## 队列监控和管理

### 获取队列状态

```typescript
const status = await queueManager.getQueueStatus();
console.log("队列状态:", status);
```

### 获取性能指标

```typescript
const metrics = queueManager.getMetrics();
console.log("性能指标:", {
  totalJobs: metrics.totalJobs,
  completedJobs: metrics.completedJobs,
  failedJobs: metrics.failedJobs,
  successRate: metrics.successRate,
  averageProcessingTime: metrics.averageProcessingTime,
});
```

### 健康检查

```typescript
const health = await queueManager.healthCheck();
if (health.status === "healthy") {
  console.log("队列系统运行正常");
}
else {
  console.error("队列系统异常:", health.details);
}
```

### 清理旧任务

```typescript
// 清理1小时前的已完成任务，最多清理50个
const cleaned = await queueManager.cleanJobs(
  60 * 60 * 1000, // 1小时前
  50, // 最多50个
  JobExecutionStatus.COMPLETED // 已完成状态
);
console.log(`清理了 ${cleaned} 个任务`);
```

## 定时任务配置

### 数据库表结构

定时任务配置存储在 `system_scheduled_jobs` 表中：

```sql
-- 任务配置表
CREATE TABLE system_scheduled_jobs (
  id UUID PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  handler_name VARCHAR(64) NOT NULL,
  cron_expression VARCHAR(64) NOT NULL,
  timezone VARCHAR(32) DEFAULT 'Asia/Shanghai',
  status INTEGER DEFAULT 1,
  payload JSONB DEFAULT '{}',
  retry_attempts INTEGER DEFAULT 3,
  retry_delay INTEGER DEFAULT 5000,
  timeout INTEGER DEFAULT 30000,
  priority INTEGER DEFAULT 5,
  domain VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 通过 API 管理定时任务

使用系统管理接口创建和管理定时任务：

```bash
# 创建定时任务
POST /api/admin/scheduled-jobs
{
  "name": "每日数据备份",
  "description": "每天凌晨执行数据备份",
  "handlerName": "dataBackupJob",
  "cronExpression": "0 2 * * *",
  "timezone": "Asia/Shanghai",
  "payload": { "backupType": "full" },
  "retryAttempts": 3,
  "timeout": 300000
}

# 启用/禁用任务
PATCH /api/admin/scheduled-jobs/:id
{
  "status": 1  // 1=启用, 0=禁用, 2=暂停
}
```

## Cron 表达式格式

```
┌───────────── 秒 (0-59)
│ ┌─────────── 分钟 (0-59)
│ │ ┌───────── 小时 (0-23)
│ │ │ ┌─────── 日期 (1-31)
│ │ │ │ ┌───── 月份 (1-12)
│ │ │ │ │ ┌─── 星期 (0-7, 0和7都代表周日)
│ │ │ │ │ │
* * * * * *
```

常用表达式示例：

- `0 0 2 * * *` - 每天凌晨2点执行
- `0 */30 * * * *` - 每30分钟执行一次
- `0 0 9 * * 1-5` - 周一到周五上午9点执行
- `0 0 0 1 * *` - 每月1号执行

## 任务执行日志

系统自动记录任务执行日志到 `system_job_execution_logs` 表：

```typescript
import { JobExecutionStatus, JobExecutionStatusType } from "@/lib/enums";

interface JobExecutionLog {
  id: string;
  jobId: string;
  executionId: string;
  status: JobExecutionStatusType; // 使用枚举类型: WAITING | ACTIVE | COMPLETED | FAILED | DELAYED | PAUSED
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  result?: unknown;
  errorMessage?: string;
  retryCount: number;
}

// 任务执行状态枚举
const JobExecutionStatus = {
  WAITING: "waiting",     // 等待执行
  ACTIVE: "active",       // 执行中
  COMPLETED: "completed", // 已完成
  FAILED: "failed",       // 执行失败
  DELAYED: "delayed",     // 已延迟
  PAUSED: "paused",       // 已暂停
} as const;
```

## 错误处理和重试

### 自动重试配置

```typescript
await queueManager.addJob("risky-task", data, {
  // 任务选项
  priority: JobPriority.HIGH,

} /* BullMQ 默认选项将通过队列配置应用 */);
```

### 处理器中的错误处理

```typescript
export const riskyTaskJob: JobHandler = async (job: Job) => {
  try {
    // 执行可能失败的操作
    const result = await performRiskyOperation(job.data);
    return { success: true, result };
  }
  catch (error) {
    logger.error("任务执行失败", {
      jobId: job.id,
      error: error.message
    });

    // 抛出错误会触发重试机制
    throw error;
  }
};
```

## 性能优化

### 并发控制

```typescript
// 在 WorkerOptions 中配置并发数
{
  concurrency: 5,  // 同时处理5个任务
  limiter: {
    max: 10,       // 每个时间窗口最多10个任务
    duration: 1000 // 时间窗口1秒
  }
}
```

### 内存管理

```typescript
// 定期清理已完成的任务
setInterval(async () => {
  await queueManager.cleanJobs(
    24 * 60 * 60 * 1000, // 24小时前
    100, // 最多清理100个
    JobExecutionStatus.COMPLETED
  );
}, 60 * 60 * 1000); // 每小时执行一次
```

## 优雅关闭

```typescript
// 应用关闭时的清理
process.on("SIGTERM", async () => {
  await queueManager.gracefulShutdown(5000); // 5秒超时
  process.exit(0);
});
```

## 开发最佳实践

### 1. 任务处理器设计

- 保持处理器函数无状态
- 使用适当的日志级别
- 及时更新任务进度
- 合理设置超时时间

### 2. 错误处理

- 明确区分可重试和不可重试的错误
- 记录详细的错误信息
- 避免无限重试循环

### 3. 性能监控

- 定期检查队列积压情况
- 监控任务执行时间
- 关注失败率和重试次数

### 4. 资源管理

- 及时清理历史任务数据
- 监控 Redis 内存使用
- 合理设置任务保留策略

## 故障排查

### 常见问题

1. **任务不执行**

   - 检查 Redis 连接状态
   - 验证任务处理器是否正确注册
   - 确认 cron 表达式格式正确

2. **任务执行失败**

   - 查看任务执行日志
   - 检查处理器代码逻辑
   - 验证任务数据格式

3. **队列积压**
   - 增加 Worker 并发数
   - 优化任务处理逻辑
   - 检查是否有死锁

### 调试工具

```typescript
// 启用详细日志
process.env.LOG_LEVEL = "debug";

// 监控队列事件
queueManager.on("completed", (job) => {
  console.log(`任务 ${job.id} 执行完成`);
});

queueManager.on("failed", (job, err) => {
  console.error(`任务 ${job.id} 执行失败: ${err.message}`);
});
```

## 部署注意事项

### Redis 配置

确保 Redis 服务器配置正确：

```bash
# Redis 配置建议
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 环境变量

```bash
REDIS_URL=redis://localhost:6379
NODE_ENV=production
LOG_LEVEL=info
```

### 监控集成

系统提供 Prometheus 指标端点 `/metrics`，可集成到监控系统中。
