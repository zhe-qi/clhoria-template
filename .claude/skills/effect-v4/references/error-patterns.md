# 错误模式

## Data.TaggedError 定义

v4 中使用 `Data.TaggedError` 定义错误。每个错误有唯一的 `_tag` 字段用于模式匹配。

### 基础定义

```typescript
import { Data } from "effect";

/** 数据库操作错误 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly code?: string;
}> {}

/** 分布式锁获取失败 */
export class LockAcquisitionError extends Data.TaggedError("LockAcquisitionError")<{
  readonly key: string;
  readonly cause?: unknown;
}> {}
```

### 错误命名约定

| 模式 | 示例 | 用途 |
|------|------|------|
| `{Entity}NotFoundError` | `ScaleNotFoundError`、`UserNotFoundError` | 数据库查询未找到 |
| `{Entity}{Action}Error` | `ScaleCreateError`、`UserUpdateError` | 增删改操作失败 |
| `{Feature}Error` | `ScoringCalculationError`、`ExportGenerationError` | 特定功能失败 |
| `{Integration}Error` | `RedisConnectionError`、`S3UploadError` | 外部服务失败 |
| `Validation{X}Error` | `ValidationSchemaError` | 数据校验失败 |

### 错误上下文字段

始终包含足够的上下文信息用于调试：

```typescript
// 实体错误 → 包含实体 ID
class ScaleNotFoundError extends Data.TaggedError("ScaleNotFoundError")<{
  readonly scaleId: string;
  readonly message: string;
}> {}

// 操作错误 → 包含失败原因 + 输入
class ScaleCreateError extends Data.TaggedError("ScaleCreateError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// 集成错误 → 包含服务名 + 是否可重试
class RedisConnectionError extends Data.TaggedError("RedisConnectionError")<{
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}> {}
```

## 优先使用明确的错误类型

**每种不同的失败原因都应有自己的错误类型**，不要把多种失败合并为泛型错误。

```typescript
// ❌ 错误 — 泛型错误丢失信息
class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
}> {}

// 然后所有地方都映射到它：
// new NotFoundError({ message: "not found" })
// 调用方无法区分：用户不存在？量表不存在？记录不存在？

// ✅ 正确 — 明确的领域错误
class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string;
  readonly message: string;
}> {}

class ScaleNotFoundError extends Data.TaggedError("ScaleNotFoundError")<{
  readonly scaleId: string;
  readonly message: string;
}> {}

// 调用方可以精确处理：
Effect.catchTag("UserNotFoundError", (err) => /* 用户不存在的处理 */);
Effect.catchTag("ScaleNotFoundError", (err) => /* 量表不存在的处理 */);
```

## 错误处理 — catchTag / catchTags

**始终使用 `catchTag`/`catchTags` 按标签匹配**，保留类型信息。

### catchTag — 处理单个错误

```typescript
const findScale = Effect.fn("ScaleService.findScale")(function* (id: string) {
  return yield* queryScale(id).pipe(
    Effect.catchTag("DatabaseError", (err) =>
      Effect.fail(new ScaleNotFoundError({
        scaleId: id,
        message: `量表查询失败: ${err.message}`,
      })),
    ),
  );
});
```

### catchTags — 处理多个错误

```typescript
const processScale = Effect.fn("ScaleService.processScale")(function* (input: ScaleInput) {
  return yield* validateAndProcess(input).pipe(
    Effect.catchTags({
      DatabaseError: (err) =>
        Effect.fail(new ScaleCreateError({
          message: `数据库操作失败: ${err.message}`,
          cause: err.cause,
        })),
      LockAcquisitionError: (err) =>
        Effect.fail(new ScaleCreateError({
          message: `并发冲突，无法获取锁: ${err.key}`,
          cause: err.cause,
        })),
    }),
  );
});
```

### 为什么不用 catchAll？

```typescript
// ❌ 禁止 — 丢失类型信息
effect.pipe(
  Effect.catchAll((err) =>
    Effect.fail(new GenericError({ message: "操作失败" })),
  ),
);
// 问题：
// 1. 下游无法区分错误类型
// 2. 丢失了有用的错误上下文
// 3. 调试困难
```

## 与 Hono Handler 的边界集成

在 Hono handler 中，Effect 错误需要转换为 HTTP 响应：

```typescript
// 方式一：Effect.match — 在 Effect 内处理成功/失败
app.get("/scales/:id", async (c) => {
  const { id } = c.req.param();

  return Effect.gen(function* () {
    const db = yield* DbService;
    const scale = yield* Effect.tryPromise({
      try: () => db.select().from(scales).where(eq(scales.id, id)),
      catch: (error) => new DatabaseError({ message: "查询失败", cause: error }),
    });
    if (!scale[0]) return yield* Effect.fail(new ScaleNotFoundError({ scaleId: id, message: "量表不存在" }));
    return scale[0];
  }).pipe(
    Effect.match({
      onSuccess: (data) => c.json(Resp.ok(data), HttpStatusCodes.OK),
      onFailure: (err) => {
        switch (err._tag) {
          case "ScaleNotFoundError":
            return c.json(Resp.fail(err.message), HttpStatusCodes.NOT_FOUND);
          case "DatabaseError":
            return c.json(Resp.fail("服务器错误"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
      },
    }),
    Effect.provide(InfraLayer),
    Effect.runPromise,
  );
});

// 方式二：runPromise + catch — 适合简单场景
app.get("/scales/:id", async (c) => {
  try {
    const result = await Effect.runPromise(program.pipe(Effect.provide(InfraLayer)));
    return c.json(Resp.ok(result), HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof ScaleNotFoundError) {
      return c.json(Resp.fail(error.message), HttpStatusCodes.NOT_FOUND);
    }
    return c.json(Resp.fail("服务器错误"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
});
```

## 错误重映射辅助函数

为常见的错误转换创建可复用的辅助函数：

```typescript
/** 将 DatabaseError 重映射为实体级错误 */
const withEntityNotFound = <A, E, R>(
  effect: Effect.Effect<A, E | DatabaseError, R>,
  context: { entityType: string; entityId: string },
) =>
  effect.pipe(
    Effect.catchTag("DatabaseError", (err) =>
      Effect.fail(new EntityNotFoundError({
        entityType: context.entityType,
        entityId: context.entityId,
        message: `${context.entityType} 不存在`,
      })),
    ),
  );

// 使用
const findUser = Effect.fn("UserRepo.findUser")(function* (id: string) {
  return yield* queryUser(id).pipe(
    withEntityNotFound({ entityType: "User", entityId: id }),
  );
});
```

## 可重试错误

为瞬时错误添加 `retryable` 属性：

```typescript
class ServiceUnavailableError extends Data.TaggedError("ServiceUnavailableError")<{
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}> {}

// 基于属性重试
import { Schedule } from "effect";

const withRetry = <A, E extends { retryable?: boolean }, R>(
  effect: Effect.Effect<A, E, R>,
) =>
  effect.pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.intersect(Schedule.recurs(3)),
        Schedule.whileInput((err: E) => err.retryable === true),
      ),
    ),
  );
```

## 错误日志

在 Error tap 中记录结构化日志：

```typescript
const processWithLogging = Effect.fn("ScaleService.process")(function* (scaleId: string) {
  return yield* processScale(scaleId).pipe(
    Effect.tapError((err) =>
      Effect.sync(() => {
        logger.error(
          { scaleId, errorTag: err._tag, errorMessage: err.message },
          "[ScaleService]: 处理失败",
        );
      }),
    ),
  );
});
```
