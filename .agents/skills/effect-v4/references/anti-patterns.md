# 反模式（禁止模式）

## 禁止: Effect.runSync / runPromise 在 Service 内部

```typescript
// ❌ 禁止 — 破坏 Effect 组合模型
const findUser = (id: string) => {
  const result = Effect.runSync(repo.findById(id));
  return result;
};

// ✅ 正确 — 返回 Effect，由调用方组合
const findUser = Effect.fn("UserRepo.findUser")(function* (id: string) {
  return yield* repo.findById(id);
});
```

**原因**：破坏 Effect 的组合性、丢失错误处理、无法测试、丢失追踪。

**`Effect.runPromise` 仅允许在入口点**：Hono handler、BullMQ Worker、Bootstrap、Singleton destroy 回调。

## 禁止: throw 在 Effect.gen 中

```typescript
// ❌ 禁止 — 绕过 Effect 错误通道
yield* Effect.gen(function* () {
  const user = yield* repo.findById(id);
  if (!user) throw new Error("User not found");  // 不会被 catchTag 捕获
});

// ✅ 正确 — 使用 Effect.fail
yield* Effect.gen(function* () {
  const user = yield* repo.findById(id);
  if (!user) return yield* Effect.fail(new UserNotFoundError({ userId: id, message: "用户不存在" }));
  return user;
});
```

**原因**：`throw` 绕过 Effect 的类型化错误通道，无法被 `catchTag` 捕获，破坏类型安全。

## 禁止: catchAll 丢失类型信息

```typescript
// ❌ 禁止 — 丢失错误类型
effect.pipe(
  Effect.catchAll((err) =>
    Effect.fail(new GenericError({ message: "操作失败" })),
  ),
);

// ✅ 正确 — 按标签精确处理
effect.pipe(
  Effect.catchTags({
    DatabaseError: (err) =>
      Effect.fail(new ServiceError({ message: err.message })),
    LockAcquisitionError: (err) =>
      Effect.fail(new ConcurrencyError({ key: err.key })),
  }),
);
```

**原因**：`catchAll` 吞掉所有错误类型信息，下游无法区分不同错误，调试困难。

## 禁止: mapError 替代 catchTag

```typescript
// ❌ 禁止 — 丢失错误区分能力
effect.pipe(
  Effect.mapError((err) => new GenericError({ message: String(err) })),
);

// ✅ 正确 — 按标签映射
effect.pipe(
  Effect.catchTag("DatabaseError", (err) =>
    Effect.fail(new AppError({ message: err.message })),
  ),
);
```

**原因**：`mapError` 无法区分错误类型，所有错误都被同样转换。

## 禁止: as any 类型断言

```typescript
// ❌ 禁止
const data = someValue as any;
const result = response as unknown as MyType;

// ✅ 正确 — 用 Zod 验证
const data = mySchema.parse(someValue);

// ✅ 正确 — 用 satisfies 验证
return { ... } satisfies ServiceInterface;
```

**原因**：`as any` 完全绕过类型安全，可能导致运行时错误。

## 禁止: Promise 返回值在 Service 方法中

```typescript
// ❌ 禁止
const findById = async (id: string): Promise<User> => {
  const user = await db.select()...;
  return user;
};

// ✅ 正确 — 返回 Effect
const findById = Effect.fn("UserRepo.findById")(function* (id: string) {
  return yield* Effect.tryPromise({
    try: () => db.select().from(users).where(eq(users.id, id)),
    catch: (error) => new DatabaseError({ message: "查询失败", cause: error }),
  });
});
```

**原因**：`Promise` 无类型化错误、无法组合、丢失追踪/指标。

## 禁止: 混合 Effect 和 Promise 链

```typescript
// ❌ 禁止
const result = await someEffect.pipe(Effect.runPromise).then(data => {
  return Effect.runPromise(anotherEffect(data));
});

// ✅ 正确 — 在 Effect 内部组合
const program = Effect.gen(function* () {
  const data = yield* someEffect;
  return yield* anotherEffect(data);
});
const result = await Effect.runPromise(program);
```

**原因**：混合 Promise 链和 Effect 失去 Effect 的组合优势、错误处理不一致。

## 禁止: orDie 过度使用

```typescript
// ❌ 禁止 — 把可恢复错误转为不可恢复
yield* someEffect.pipe(Effect.orDie);

// ✅ 正确 — 显式处理错误
yield* someEffect.pipe(
  Effect.catchTag("RecoverableError", (err) =>
    Effect.fail(new DomainError({ message: err.message })),
  ),
);
```

**原因**：`orDie` 将可恢复错误转为 defect（不可恢复），丢失错误信息。

**可接受的例外**：
- 真正不可恢复的情况（无效程序状态）
- 已穷尽所有恢复选项
- 测试 setup 代码

## 禁止: 可变状态不用 Ref

```typescript
// ❌ 禁止（在 Effect 上下文中）
let counter = 0;
const increment = Effect.sync(() => { counter++; });

// ✅ 正确
import { Ref } from "effect";
const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  yield* Ref.update(counter, (n) => n + 1);
  return yield* Ref.get(counter);
});
```

**原因**：可变状态在并发 Effect 中有竞态风险、不可测试、破坏引用透明性。

---

## 项目允许的例外

本项目以 Effect 作为基础设施编排层，而非全栈框架，以下情况是允许的：

### Effect.runPromise 在入口点 ✅

```typescript
// Hono handler 入口
app.get("/scales/:id", async (c) => {
  const result = await Effect.runPromise(program.pipe(Effect.provide(InfraLayer)));
  return c.json(Resp.ok(result), HttpStatusCodes.OK);
});

// BullMQ Worker
processor: async (job) => {
  await Effect.runPromise(processJob(job.data));
};

// Bootstrap
export function bootstrap(): Promise<void> {
  return Effect.runPromise(program);
}

// Singleton destroy
destroy: async (manager) => {
  await Effect.runPromise(manager.close(10000));
};
```

### Pino logger 代替 Effect.log ✅

```typescript
// 项目约定：使用 Pino 结构化日志
logger.info({ userId, scaleId }, "[ScaleService]: 处理完成");
logger.error({ error, scaleId }, "[ScaleService]: 处理失败");

// 不要求使用 Effect.log（项目日志基础设施基于 Pino）
```

### Zod env 代替 Config API ✅

```typescript
// 项目约定：使用 Zod 验证的 env.ts
import env from "@/env";
const dbUrl = env.DATABASE_URL;  // 启动时已由 Zod 验证

// 不要求使用 Effect Config（项目配置基础设施基于 Zod）
```

### 可空类型代替 Option<T> ✅

```typescript
// 项目约定：Drizzle/Zod 使用原生可空类型
const bio: string | null = user.bio;

// 不要求使用 Option<T>（项目类型系统基于 Drizzle + Zod）
```

### 原生 Date 和 date-fns ✅

```typescript
// 项目约定：使用 date-fns 处理日期
import { format, addDays } from "date-fns";
const now = new Date();

// 不要求使用 Effect Clock（项目日期处理基于 date-fns）
```
