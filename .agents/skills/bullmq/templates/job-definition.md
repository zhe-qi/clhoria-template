# Job Registry 类型映射模板

## 文件位置

`src/lib/infrastructure/bullmq/job-registry.ts`

## 三层类型安全架构

1. **Zod Schema**（运行时验证） → 定义数据结构和验证规则
2. **JobDefinitionRegistry**（类型推断） → 关联 JobName 和数据类型
3. **JobSchemaRegistry**（验证映射） → 关联 JobName 和 Zod Schema
4. **QueueJobsMapping**（编译时约束） → 关联 Queue 和允许的 JobName

---

## 1. Zod Schema 定义

```typescript
import { z } from "zod";
import { JobName } from "@/lib/enums/bullmq";

// 示例：邮件任务
export const EmailSendWelcomeSchema = z.object({
  email: z.email("邮箱格式不正确"),
  username: z.string().min(1, "用户名不能为空"),
  subject: z.string().optional(),
});

// 示例：清理任务
export const CleanupOldLogsSchema = z.object({
  daysToKeep: z.number().int().positive("保留天数必须为正整数"),
});

// 模板：新任务
export const QueueNameJobActionSchema = z.object({
  field1: z.string().min(1, "字段1不能为空"),
  field2: z.number().int().positive("字段2必须为正整数"),
  field3: z.uuid("字段3必须是有效的 UUID"),
  // 可选字段
  field4: z.string().optional(),
});
```

---

## 2. JobDefinitionRegistry 类型映射

```typescript
export type JobDefinitionRegistry = {
  // 现有任务
  [JobName.EMAIL_SEND_WELCOME]: z.infer<typeof EmailSendWelcomeSchema>;
  [JobName.CLEANUP_OLD_LOGS]: z.infer<typeof CleanupOldLogsSchema>;

  // 新增任务
  [JobName.QUEUE_NAME_JOB_ACTION]: z.infer<typeof QueueNameJobActionSchema>;
};
```

---

## 3. JobSchemaRegistry 验证映射

```typescript
export const JobSchemaRegistry = {
  // 现有任务
  [JobName.EMAIL_SEND_WELCOME]: EmailSendWelcomeSchema,
  [JobName.CLEANUP_OLD_LOGS]: CleanupOldLogsSchema,

  // 新增任务
  [JobName.QUEUE_NAME_JOB_ACTION]: QueueNameJobActionSchema,
} as const satisfies Record<JobNameType, z.ZodSchema>;
```

---

## 4. QueueJobsMapping 队列关联

```typescript
import { QueueName } from "@/lib/enums/bullmq";

export type QueueJobsMapping = {
  [QueueName.EMAIL]:
    | typeof JobName.EMAIL_SEND_WELCOME
    | typeof JobName.EMAIL_SEND_RESET_PASSWORD;

  [QueueName.CLEANUP]:
    | typeof JobName.CLEANUP_DAILY
    | typeof JobName.CLEANUP_OLD_LOGS;

  // 新增队列
  [QueueName.QUEUE_NAME]:
    | typeof JobName.QUEUE_NAME_JOB_ACTION
    | typeof JobName.QUEUE_NAME_OTHER_ACTION;
};
```

---

## 验证规则参考

### 常用字段类型

```typescript
// 字符串
z.string().min(1, "不能为空")
z.string().max(255, "长度不能超过 255")
z.email("邮箱格式不正确")

// 数字
z.number().int("必须是整数").positive("必须为正数")
z.number().min(0, "不能小于 0").max(100, "不能大于 100")

// UUID
z.uuid("必须是有效的 UUID")

// 布尔值
z.boolean()

// 日期时间（ISO 8601）
z.string().refine(
  (val) => {
    try {
      const date = new Date(val);
      return !Number.isNaN(date.getTime()) && date.toISOString() === val;
    } catch {
      return false;
    }
  },
  { message: "必须是有效的 ISO 8601 日期时间字符串" },
)

// 日期（YYYY-MM-DD）
z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD")

// 枚举
z.enum(["VALUE1", "VALUE2"], { message: "必须是 VALUE1 或 VALUE2" })

// 对象（额外数据）
z.record(z.string(), z.unknown()).optional()

// 数组
z.array(z.string()).min(1, "至少包含一个元素")
z.array(z.uuid()).max(10, "最多 10 个元素")

// 可选字段
z.string().optional()
z.number().nullable()
```

### 自定义验证

```typescript
// 正则表达式
z.string().regex(/^[A-Z]{2,3}$/, "必须是 2-3 位大写字母")

// 自定义 refine
z.string().refine(
  (val) => val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val),
  { message: "密码必须至少 8 位，包含大写字母和数字" },
)

// 复杂对象验证
z.object({
  startDate: z.string(),
  endDate: z.string(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "结束日期必须晚于开始日期" },
)
```

---

## 完整示例

```typescript
// src/lib/infrastructure/bullmq/job-registry.ts
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
  targetDate: z
    .string()
    .regex(DATE_REGEX, "日期格式必须为 YYYY-MM-DD")
    .optional(),
});

export const CleanupOldLogsSchema = z.object({
  daysToKeep: z.number().int().positive("保留天数必须为正整数"),
});

/**
 * Job definition registry - 关联 job name 与其数据类型
 */
export type JobDefinitionRegistry = {
  [JobName.EMAIL_SEND_WELCOME]: z.infer<typeof EmailSendWelcomeSchema>;
  [JobName.EMAIL_SEND_RESET_PASSWORD]: z.infer<typeof EmailSendResetPasswordSchema>;
  [JobName.CLEANUP_DAILY]: z.infer<typeof CleanupDailySchema>;
  [JobName.CLEANUP_OLD_LOGS]: z.infer<typeof CleanupOldLogsSchema>;
};

/**
 * Schema registry for runtime validation
 */
export const JobSchemaRegistry = {
  [JobName.EMAIL_SEND_WELCOME]: EmailSendWelcomeSchema,
  [JobName.EMAIL_SEND_RESET_PASSWORD]: EmailSendResetPasswordSchema,
  [JobName.CLEANUP_DAILY]: CleanupDailySchema,
  [JobName.CLEANUP_OLD_LOGS]: CleanupOldLogsSchema,
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
};
```

---

## 常见错误

### ❌ 忘记更新 QueueJobsMapping

```typescript
// 添加了新任务
export const ReportGenerateSchema = z.object({...});

// ❌ 忘记在 QueueJobsMapping 中关联
export type QueueJobsMapping = {
  [QueueName.REPORT]: never; // 导致无法添加任务
};
```

### ✅ 正确做法

```typescript
export type QueueJobsMapping = {
  [QueueName.REPORT]: typeof JobName.REPORT_GENERATE_DAILY;
};
```

### ❌ Schema 和 Registry 不一致

```typescript
// ❌ 定义了 Schema 但未添加到 JobSchemaRegistry
export const ReportGenerateSchema = z.object({...});

export const JobSchemaRegistry = {
  // 缺少 REPORT_GENERATE_DAILY
} as const satisfies Record<JobNameType, z.ZodSchema>;
```

### ✅ 正确做法

```typescript
export const JobSchemaRegistry = {
  [JobName.REPORT_GENERATE_DAILY]: ReportGenerateSchema,
} as const satisfies Record<JobNameType, z.ZodSchema>;
```

---

## 下一步

添加 Job 定义后，需要：
1. 注册 Worker 处理任务（参考 [worker-registration.md](worker-registration.md)）
2. 在业务代码中添加任务到队列
3. （可选）设置定时任务（参考 [scheduled-job.md](scheduled-job.md)）
