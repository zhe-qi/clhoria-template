# 资源管理

## Effect.acquireUseRelease — 安全的获取/使用/释放

确保资源在使用后一定被释放，即使发生错误或中断。

### 项目示例：分布式锁

```typescript
// src/lib/infrastructure/redis-lock.ts
export const withLock = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>,
  options: LockOptions = {},
): Effect.Effect<A, E | LockAcquisitionError, R> => {
  const ttl = options.ttl ?? 10000;
  const lock = createLockForKey(key, ttl);

  return Effect.acquireUseRelease(
    // acquire: 获取锁（可能失败 → LockAcquisitionError）
    Effect.tryPromise({
      try: () => lock.acquire(),
      catch: error => new LockAcquisitionError({ key, cause: error }),
    }),
    // use: 在锁保护下执行 effect
    () => effect,
    // release: 释放锁（始终执行）
    handle => Effect.promise(() => lock.release(handle)),
  );
};

// 使用
const program = withLock(
  `scale:${scaleId}`,
  Effect.gen(function* () {
    // 锁保护下的操作
    const db = yield* DbService;
    yield* Effect.tryPromise({
      try: () => db.update(scales).set({ status: "COMPLETED" }).where(eq(scales.id, scaleId)),
      catch: (error) => new DatabaseError({ message: "更新失败", cause: error }),
    });
  }),
  { ttl: 5000 },
);
```

### 通用模式

```typescript
Effect.acquireUseRelease(
  acquireEffect,    // Effect<Resource, AcquireError, R>  — 获取资源
  (resource) => useEffect,  // (Resource) => Effect<A, UseError, R>  — 使用资源
  (resource) => releaseEffect,  // (Resource) => Effect<void, never, R>  — 释放资源（不应失败）
);
```

**释放函数的注意事项**：
- 返回类型的 Error 必须是 `never`（不能失败）
- 如果释放可能失败，用 `Effect.promise`（吞掉错误）或 `Effect.orDie`（转为 defect）

## 优雅关闭

### 项目示例：BullMQ 关闭

```typescript
// src/lib/infrastructure/bullmq-adapter.ts
close = (timeoutMs: number = 10000) =>
  Effect.gen({ self: this }, function* () {
    const closeEffects: Effect.Effect<void, Error>[] = [];

    // 收集所有 Worker 关闭 Effect
    for (const [name, worker] of this.workers.entries()) {
      closeEffects.push(Effect.tryPromise({
        try: () => worker.close(),
        catch: error => new Error(`Failed to close worker ${name}: ${error}`),
      }));
    }

    // 收集所有队列关闭 Effect
    for (const [name, queue] of this.queues.entries()) {
      closeEffects.push(Effect.tryPromise({
        try: () => queue.close(),
        catch: error => new Error(`Failed to close queue ${name}: ${error}`),
      }));
    }

    // 带超时的并行关闭
    yield* Effect.all(closeEffects, { concurrency: "unbounded" }).pipe(
      Effect.timeout(`${timeoutMs} millis`),
      Effect.ignore,  // 超时后忽略，避免挂起
    );

    this.workers.clear();
    this.queues.clear();

    // 关闭 Redis 连接
    yield* Effect.tryPromise({
      try: async () => {
        if (!["close", "end"].includes(this.connection.status)) {
          await this.connection.quit();
        }
      },
      catch: (error) => {
        logger.debug({ error }, "[BullMQ]: Redis 连接关闭时的预期错误");
      },
    });
  });
```

**模式要点**：
1. 收集所有资源的关闭 Effect 到数组
2. `Effect.all` + `concurrency: "unbounded"` 并行关闭
3. `Effect.timeout` 防止某个关闭操作挂起
4. `Effect.ignore` 超时后不报错
5. 按依赖顺序关闭（先 Worker，再 Queue，最后连接）

## Layer.scoped — 带生命周期的资源 Layer

当资源需要在 Layer 构建时创建、在 Layer 销毁时释放：

```typescript
import { Effect, Layer } from "effect";

// Redis 连接 Layer（带自动清理）
const RedisServiceLive = Layer.scoped(
  RedisService,
  Effect.acquireRelease(
    // 创建连接
    Effect.tryPromise({
      try: () => createRedisClient(env.REDIS_URL),
      catch: (error) => new RedisConnectionError({ message: "连接失败", cause: error, retryable: false }),
    }),
    // 释放连接
    (client) => Effect.promise(() => client.quit()),
  ),
);
```

### acquireRelease vs acquireUseRelease

| API | 用途 | 典型场景 |
|-----|------|----------|
| `Effect.acquireRelease` | 资源跟随 Scope 生命周期 | 数据库连接池、Redis 客户端 |
| `Effect.acquireUseRelease` | 资源只在使用期间存在 | 分布式锁、临时文件 |

```typescript
// acquireRelease — Scope 结束时自动释放
const scopedClient = Effect.acquireRelease(
  createClient(),    // 获取
  (client) => closeClient(client),  // Scope 结束时释放
);

// acquireUseRelease — 用完立即释放
const result = Effect.acquireUseRelease(
  createClient(),    // 获取
  (client) => useClient(client),  // 使用
  (client) => closeClient(client),  // 用完释放
);
```

## Bootstrap Effect 模式

项目使用 Effect.gen 进行初始化编排：

```typescript
// src/lib/infrastructure/bootstrap.ts
export function bootstrap(): Promise<void> {
  if (hasSingleton(KEY)) return Promise.resolve();

  const program = Effect.gen(function* () {
    z.config(z.locales.zhCN());
    yield* initExcelize;
    logger.info("[Bootstrap]: excelize wasm 已加载");
    createSingleton(KEY, () => true);
  });

  return Effect.runPromise(program);
}
```

**Bootstrap 适合用 Effect 的场景**：
- 多个初始化步骤有依赖关系
- 初始化可能失败需要类型化错误
- 需要顺序执行异步操作

## 何时使用哪种模式

| 场景 | 推荐模式 |
|------|----------|
| 分布式锁 | `withLock`（`acquireUseRelease`） |
| 数据库连接池 | `Layer.scoped`（`acquireRelease`） |
| 临时文件 | `acquireUseRelease` |
| 多资源并行关闭 | `Effect.all` + `timeout` + `ignore` |
| 应用初始化 | `Effect.gen` + `Effect.runPromise` |
| Singleton 销毁 | `destroyAllSingletons`（项目已有机制） |
