import { extractPgError, mapPgErrorToResponse } from "@/lib/errors/pg-error";

import { DatabaseError } from "./errors";

/**
 * Convert a thrown value from a Drizzle/postgres query into a `DatabaseError`.
 * 把 Drizzle/postgres 查询抛出的任意错误转成 Effect 友好的 `DatabaseError`，
 * 复用 `pg-error.ts` 的中文消息 + HTTP 状态码映射表，保证 Effect 业务代码和全局
 * `onError` 中间件输出一致。常用作 `Effect.tryPromise({ try, catch: toDatabaseError })`
 * 的 `catch` 参数。
 */
export function toDatabaseError(err: unknown): DatabaseError {
  const extracted = extractPgError(err);
  if (extracted) {
    const { pgError, query, params } = extracted;
    const { message, statusCode } = mapPgErrorToResponse(pgError);
    return new DatabaseError({
      message,
      code: pgError.code,
      statusCode,
      query,
      params,
      cause: err,
    });
  }
  return new DatabaseError({
    message: err instanceof Error ? err.message : "数据库操作失败",
    cause: err,
  });
}
