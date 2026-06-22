---
name: effect-v4
description: Effect v4 模式指南。当需要创建 Effect 服务、定义错误类型、编写 Effect 程序、管理 Layer 组合、或使用 Effect 封装异步操作时使用
argument-hint: "[service/error/layer/pattern]"
---

# Effect v4 Best Practices

本 skill 为 Effect v4 (4.0.0-beta.48) 在本项目中的使用提供规范化指南。

## 技术栈

- **Effect**: 4.0.0-beta.48（`Context.Service`、`Data.TaggedError`、`Layer`）
- **HTTP**: Hono（非 Effect HttpApi）
- **验证**: Zod v4（非 Effect Schema）
- **ORM**: Drizzle（PostgreSQL）
- **日志**: Pino（非 Effect.log）
- **队列**: BullMQ + Redis (ioredis)

## 文件结构

```
src/lib/infrastructure/effect/
├── index.ts          # Barrel exports
├── errors.ts         # Data.TaggedError 定义
├── services/         # Context.Service 定义
│   ├── db.ts         # DbService
│   ├── logger.ts     # LoggerService
│   └── bullmq.ts     # BullMQService
└── layers/
    └── live.ts       # InfraLayer = Layer.mergeAll(...)
```

## 核心规则速查

| 类别 | DO | DON'T |
|------|-----|-------|
| Service 定义 | `Context.Service<Self, Shape>()("tag")` | `Effect.Service` (v3 API) |
| Service 构造 | `Layer.succeed(Tag, instance)` / `Layer.effect(Tag, ...)` | 在使用处 `Effect.provide` |
| 错误类型 | `Data.TaggedError("Tag")<{ fields }>` | `Schema.TaggedError` / 普通 Error |
| 错误处理 | `catchTag` / `catchTags` 按标签匹配 | `catchAll` / `mapError` 丢失类型 |
| 追踪函数 | `Effect.fn("Service.method")(function* ...)` | 匿名 generator 无追踪名 |
| 异步包装 | `Effect.tryPromise({ try, catch })` | Effect 内部 raw `await` |
| 错误抛出 | `yield* Effect.fail(new XxxError(...))` | Effect.gen 内 `throw` |
| Layer 组合 | `Layer.mergeAll` 平铺同级 | 深层嵌套 `Layer.provide` |
| Layer 链式 | `Layer.provideMerge` 增量组合 | 多层 `Layer.provide`（类型爆炸）|
| 执行边界 | `Effect.runPromise` 仅在 Hono handler 入口 | Service 内部 `runPromise` |

## v3 → v4 迁移对照

| v3 | v4 | 说明 |
|----|-----|------|
| `Effect.Service<T>()("name", { accessors, dependencies, effect })` | `Context.Service<T, Shape>()("name")` + `Layer.succeed/effect` | Service 类只是标签，Layer 独立构造 |
| `accessors: true` → `Service.method()` | `yield* ServiceTag` → `service.method()` | 先获取 service 实例再调方法 |
| `dependencies: [Dep.Default]` | `Layer.provide(depLayer)` / `Layer.provideMerge(depLayer)` | 依赖关系在 Layer 组合时声明 |
| `Schema.TaggedError<T>()("tag", { fields })` | `Data.TaggedError("tag")<{ fields }>` | 不需要 Schema 字段，用 TS readonly |
| `HttpApiSchema.annotations({ status: 404 })` | Hono handler 中 `c.json(Resp.fail(...), 404)` | HTTP 状态码在路由层处理 |
| `Config.string("KEY")` | `import env from "@/env"` | 项目用 Zod 验证的 env |
| `Effect.log("msg")` | `logger.info({ data }, "[Module]: msg")` | 项目用 Pino |
| `Schema.Option(Schema.String)` | `field: string \| null` | 项目用 Drizzle/Zod 可空类型 |

## 与项目集成

Effect 在本项目中的定位是 **基础设施编排层**，不是全栈框架。边界清晰：

```
Hono Handler (async/await)
  └─ Effect.runPromise(program)    ← 边界：进入 Effect 世界
       └─ Effect.gen(function* () {
            const db = yield* DbService;     ← 获取 service
            const result = yield* Effect.tryPromise(...);  ← 异步操作
            return result;
          })
```

**入口点**（允许 `Effect.runPromise`）：
- Hono route handler
- BullMQ Worker processor
- Bootstrap 初始化
- Singleton destroy 回调

**Service 内部**（禁止 `Effect.runPromise`）：
- 返回 `Effect.Effect<A, E, R>`
- 用 `yield*` 组合其他 Effect
- 用 `Effect.tryPromise` 包装异步

## 参考文档

- [Service 模式](references/service-patterns.md) — Context.Service + Layer 定义、Effect.fn 追踪
- [错误模式](references/error-patterns.md) — Data.TaggedError + catchTag/catchTags
- [Effect 组合](references/effect-composition.md) — Effect.gen/fn/tryPromise/并发
- [资源管理](references/resource-management.md) — acquireUseRelease/Scope/优雅关闭
- [反模式](references/anti-patterns.md) — 禁止模式 + 项目例外
