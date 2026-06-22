# Effect 组合

## Effect.gen — 基础组合

`Effect.gen` 用 generator 语法组合多个 Effect，`yield*` 展开内部 Effect：

```typescript
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const db = yield* DbService;
  const users = yield* Effect.tryPromise({
    try: () => db.select().from(usersTable),
    catch: (error) => new DatabaseError({ message: "查询失败", cause: error }),
  });
  return users;
});
```

## 创建 Effect 的方式

### Effect.tryPromise — 包装可能失败的异步操作

**最常用**，用于包装 Drizzle 查询、Redis 操作、BullMQ 任务等：

```typescript
// 带类型化错误
Effect.tryPromise({
  try: () => db.insert(scales).values(data).returning(),
  catch: (error) => new DatabaseError({ message: "插入量表失败", cause: error }),
});

// 简写（错误类型为 UnknownException）
Effect.tryPromise(() => fetch(url));
```

### Effect.promise — 包装不会失败的异步操作

```typescript
// 锁释放、策略加载等 "不关心失败" 的场景
yield* Effect.promise(() => lock.release(handle));
yield* Effect.promise(() => enforcer.loadPolicy());
```

### Effect.sync — 包装同步操作

```typescript
// 注册 worker、读取 Map 等
Effect.sync(() => {
  workers.set(name, worker);
  return worker;
});
```

### Effect.succeed / Effect.fail — 创建立即成功/失败的 Effect

```typescript
// 成功
yield* Effect.succeed(defaultValue);

// 失败
if (!scale) return yield* Effect.fail(new ScaleNotFoundError({ scaleId: id, message: "量表不存在" }));
```

## Effect.fn — 追踪函数

**推荐所有 Service 方法使用 `Effect.fn`**，自动创建追踪 span + 捕获参数信息：

```typescript
// 命名规范：ServiceName.methodName
const processAnswers = Effect.fn("ScaleService.processAnswers")(
  function* (scaleId: string, answers: Answer[]) {
    yield* Effect.annotateCurrentSpan("scaleId", scaleId);
    yield* Effect.annotateCurrentSpan("answerCount", answers.length);

    const db = yield* DbService;
    const scale = yield* Effect.tryPromise({
      try: () => db.select().from(scales).where(eq(scales.id, scaleId)),
      catch: (error) => new DatabaseError({ message: "查询量表失败", cause: error }),
    });

    // ... 业务逻辑
    return result;
  },
);
```

### 什么时候用 Effect.fn vs 普通 Effect.gen？

```typescript
// Effect.fn — 命名函数，需要追踪
const findById = Effect.fn("UserRepo.findById")(function* (id: string) { ... });

// Effect.gen — 内联组合，不需要独立追踪
yield* Effect.gen(function* () {
  const user = yield* findById(userId);
  const roles = yield* getRoles(user.id);
  return { user, roles };
});
```

## 并发操作

### Effect.all — 并行执行多个 Effect

```typescript
// 并行查询（无限并发）
const [users, roles, permissions] = yield* Effect.all(
  [getUsers(), getRoles(), getPermissions()],
  { concurrency: "unbounded" },
);

// 限制并发数
const results = yield* Effect.all(effects, { concurrency: 5 });

// 顺序执行（默认）
const results = yield* Effect.all([step1, step2, step3]);
```

### Effect.forEach — 对集合并行执行

```typescript
// 并行处理每个量表
const results = yield* Effect.forEach(
  scaleIds,
  (id) => calculateScore(id),
  { concurrency: 5 },
);

// 等价于但优于 for 循环：
// ❌ for (const id of scaleIds) { yield* calculateScore(id); }
// ✅ yield* Effect.forEach(scaleIds, (id) => calculateScore(id), { concurrency: 5 });
```

## Effect.timeout

```typescript
// Duration 字面量："5 seconds"、"10 millis"、"1 minute"
yield* longRunningEffect.pipe(
  Effect.timeout("5 seconds"),
);

// 带动态超时
yield* Effect.all(closeEffects, { concurrency: "unbounded" }).pipe(
  Effect.timeout(`${timeoutMs} millis`),
  Effect.ignore,  // 超时后忽略错误
);
```

## pipe 组合 vs generator 选择

```typescript
// 优先用 generator — 多步顺序逻辑
const program = Effect.gen(function* () {
  const db = yield* DbService;
  const user = yield* findUser(id);
  const roles = yield* getRoles(user.id);
  return { user, roles };
});

// 用 pipe — 单步变换或后缀操作
const withTimeout = program.pipe(Effect.timeout("10 seconds"));
const mapped = effect.pipe(Effect.map((x) => x.name));
const withError = effect.pipe(
  Effect.catchTag("DatabaseError", (err) => Effect.fail(new AppError({ message: err.message }))),
);

// 可以组合使用
const result = Effect.gen(function* () {
  const data = yield* fetchData().pipe(
    Effect.timeout("5 seconds"),
    Effect.catchTag("TimeoutException", () => Effect.succeed(fallbackData)),
  );
  return data;
});
```

## 条件逻辑

```typescript
const program = Effect.gen(function* () {
  const scale = yield* queryScale(id);

  // 简短的 guard 子句
  if (!scale) return yield* Effect.fail(new ScaleNotFoundError({ scaleId: id, message: "量表不存在" }));

  // 条件分支
  if (scale.status === "ARCHIVED") {
    return yield* Effect.fail(new ScaleArchivedError({ scaleId: id, message: "量表已归档" }));
  }

  return scale;
});
```

## 忽略错误

```typescript
// Effect.ignore — 忽略所有错误（变为 Effect<void, never, R>）
yield* optionalCleanup.pipe(Effect.ignore);

// Effect.tapError — 记录但不吞掉错误
yield* criticalOperation.pipe(
  Effect.tapError((err) =>
    Effect.sync(() => logger.error({ err }, "[Module]: 操作失败")),
  ),
);

// 非关键操作：fire-and-forget
yield* nonCriticalEffect.pipe(
  Effect.tapError((e) =>
    Effect.sync(() => logger.warn({ error: e }, "[Module]: 非关键操作失败")),
  ),
  Effect.ignore,
);
```

## Effect.map / Effect.flatMap

```typescript
// Effect.map — 变换成功值（不产生新的 Effect）
const names = effect.pipe(Effect.map((users) => users.map((u) => u.name)));

// Effect.flatMap — 成功后执行另一个 Effect
const program = getUser(id).pipe(
  Effect.flatMap((user) => getRoles(user.id)),
);
// 等价于：
const program = Effect.gen(function* () {
  const user = yield* getUser(id);
  return yield* getRoles(user.id);
});
```

## Effect.tap — 副作用但不改变值

```typescript
const program = createUser(input).pipe(
  Effect.tap((user) =>
    Effect.sync(() => logger.info({ userId: user.id }, "[UserService]: 用户已创建")),
  ),
);
// createUser 的返回值不变，tap 只执行副作用
```
