# Service 模式

## Context.Service 基础定义

v4 中使用 `Context.Service<Self, Shape>()("tag")` 定义服务。Service 类仅是一个带类型的标签，实际实现由 Layer 提供。

### 基础设施 Service（包装现有实例）

用于把已有的单例实例（数据库、日志、队列管理器）注入 Effect 世界：

```typescript
import { Context, Layer } from "effect";

// 定义 Service 标签（Shape = 实例类型）
class DbService extends Context.Service<DbService, DrizzleDb>()("DbService") {}

// 构造 Layer：直接传入现有实例
const DbServiceLive = Layer.succeed(DbService, dbInstance);
```

项目现有示例：

```typescript
// src/lib/infrastructure/effect/services/db.ts
import type db from "@/db";
import { Context, Layer } from "effect";
import dbInstance from "@/db";

type DrizzleDb = typeof db;

export class DbService extends Context.Service<DbService, DrizzleDb>()("DbService") {}
export const DbServiceLive = Layer.succeed(DbService, dbInstance);

// src/lib/infrastructure/effect/services/logger.ts
import type { Logger as PinoLogger } from "pino";
import { Context, Layer } from "effect";
import logger from "@/lib/services/logger";

export class LoggerService extends Context.Service<LoggerService, PinoLogger>()("LoggerService") {}
export const LoggerServiceLive = Layer.succeed(LoggerService, logger);

// src/lib/infrastructure/effect/services/bullmq.ts
import { Context, Layer } from "effect";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";

export class BullMQService extends Context.Service<BullMQService, typeof queueManager>()("BullMQService") {}
export const BullMQServiceLive = Layer.succeed(BullMQService, queueManager);
```

### 业务逻辑 Service（定义接口 + Layer.effect 构造）

用于有依赖、有业务逻辑的 Service：

```typescript
import { Context, Effect, Layer } from "effect";

// 1. 定义 Service 接口
interface ScaleScoring {
  readonly calculateScore: (
    scaleId: string,
    answers: Answer[],
  ) => Effect.Effect<ScoreResult, ScoringError>;
  readonly generateReport: (
    scaleId: string,
  ) => Effect.Effect<Report, ReportError>;
}

// 2. 定义 Service 标签
class ScaleScoringService extends Context.Service<ScaleScoringService, ScaleScoring>()(
  "ScaleScoringService",
) {}

// 3. 构造 Layer：通过 Effect.gen 组装依赖
const ScaleScoringServiceLive = Layer.effect(
  ScaleScoringService,
  Effect.gen(function* () {
    const db = yield* DbService;
    const logger = yield* LoggerService;

    const calculateScore = Effect.fn("ScaleScoring.calculateScore")(
      function* (scaleId: string, answers: Answer[]) {
        yield* Effect.annotateCurrentSpan("scaleId", scaleId);
        // ... 使用 db 查询量表配置 + 计算得分
      },
    );

    const generateReport = Effect.fn("ScaleScoring.generateReport")(
      function* (scaleId: string) {
        // ... 使用 db + logger
      },
    );

    return { calculateScore, generateReport } satisfies ScaleScoring;
  }),
);
```

### 使用 Service

```typescript
const program = Effect.gen(function* () {
  const scoring = yield* ScaleScoringService;
  const result = yield* scoring.calculateScore(scaleId, answers);
  return result;
});

// 在 Hono handler 中执行
const runnable = program.pipe(Effect.provide(InfraLayer));
const result = await Effect.runPromise(runnable);
```

## Effect.fn 追踪

**推荐所有 Service 方法都使用 `Effect.fn`**，自动创建追踪 span：

```typescript
// 命名规范：ServiceName.methodName
const findById = Effect.fn("UserRepo.findById")(function* (id: string) {
  yield* Effect.annotateCurrentSpan("userId", id);
  return yield* Effect.tryPromise({
    try: () => db.select().from(users).where(eq(users.id, id)),
    catch: (error) => new DatabaseError({ message: "查询用户失败", cause: error }),
  });
});

const processPayment = Effect.fn("PaymentService.processPayment")(
  function* (orderId: string, amount: number) {
    yield* Effect.annotateCurrentSpan("orderId", orderId);
    yield* Effect.annotateCurrentSpan("amount", amount);
    // ...
  },
);
```

### Span 注解

**应该注解的**：
- 实体 ID（userId、scaleId、orderId）
- 关键业务值（amount、status）
- 失败时的错误上下文

**不应注解的**：
- 步骤进度（step: "validating"）
- 内部实现细节
- 敏感数据（PII、密钥）

## 何时使用 Context.Service vs 直接函数

| 场景 | 选择 | 原因 |
|------|------|------|
| 基础设施单例（db、redis、bullmq） | `Context.Service + Layer.succeed` | 需要 DI，便于测试替换 |
| 有依赖的业务逻辑 | `Context.Service + Layer.effect` | 需要 DI，组合其他 Service |
| 无状态工具函数（纯计算） | 普通函数返回 `Effect` | 不需要 DI，直接调用更简单 |
| 跨模块共享辅助逻辑 | 普通函数返回 `Effect` | 通过参数传递依赖即可 |

## Layer 组合

### Layer.mergeAll — 平铺同级 Layer

```typescript
// src/lib/infrastructure/effect/layers/live.ts
import { Layer } from "effect";

export const InfraLayer = Layer.mergeAll(
  DbServiceLive,
  BullMQServiceLive,
  LoggerServiceLive,
);
```

### Layer.provideMerge — 增量链式组合

当 Layer 之间有依赖时：

```typescript
// ServiceB 依赖 ServiceA
const AppLayer = ServiceALive.pipe(
  Layer.provideMerge(ServiceBLive),  // ServiceB 可以使用 ServiceA
  Layer.provideMerge(ServiceCLive),  // ServiceC 可以使用 A + B
);
```

**为什么用 `Layer.provideMerge` 而不是 `Layer.provide`？**
- `Layer.provide(A, B)` — 输出只有 A 的 service
- `Layer.provideMerge(A, B)` — 输出 A + B 的 service（合并）
- 多层 `Layer.provide` 会产生深层嵌套类型，拖慢 TypeScript LSP

### Layer 去重

同一 Layer 在依赖图中出现多次时只会构造一次：

```typescript
const RepoLayer = Layer.mergeAll(
  UserRepoLive,    // 依赖 DbServiceLive
  ScaleRepoLive,   // 也依赖 DbServiceLive
);

// DbServiceLive 只会构造一次
const AppLayer = RepoLayer.pipe(Layer.provide(DbServiceLive));
```

## 测试 Mock

```typescript
// 用 Layer.succeed 提供 mock 实现
const DbServiceTest = Layer.succeed(DbService, {
  select: () => ({ from: () => ({ where: () => Promise.resolve([mockUser]) }) }),
  insert: () => ({ values: () => ({ returning: () => Promise.resolve([mockUser]) }) }),
} as unknown as DrizzleDb);

const TestLayer = Layer.mergeAll(
  DbServiceTest,
  LoggerServiceLive,  // 真实 Logger 也可以用于测试
);

// 在测试中
const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestLayer)),
);
```

## 命名约定

| 后缀 | 用途 | 示例 |
|------|------|------|
| `*Service` | Service 标签类 | `DbService`、`ScaleScoringService` |
| `*ServiceLive` | 生产环境 Layer | `DbServiceLive`、`ScaleScoringServiceLive` |
| `*ServiceTest` | 测试 Mock Layer | `DbServiceTest` |
| `*Layer` | 组合后的 Layer | `InfraLayer`、`AppLayer` |
