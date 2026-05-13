import type { ContentfulStatusCode } from "hono/utils/http-status";

import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";

import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";

/** PostgreSQL error code -> generic message + HTTP status code / PostgreSQL 错误码 → 通用中文消息 + HTTP 状态码 */
export const pgErrorMessages: Record<string, { message: string; statusCode: ContentfulStatusCode }> = {
  // Data integrity constraints (Class 23) / 数据完整性约束 (Class 23)
  "23505": { message: "数据已存在", statusCode: HttpStatusCodes.CONFLICT },
  "23503": { message: "关联数据不存在或正在被引用", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23502": { message: "必填字段不能为空", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23514": { message: "数据不满足约束条件", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23P01": { message: "数据冲突", statusCode: HttpStatusCodes.CONFLICT },
  // Data format errors (Class 22) / 数据格式错误 (Class 22)
  "22P02": { message: "数据格式无效", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22007": { message: "日期时间格式无效", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22008": { message: "日期时间超出范围", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22003": { message: "数值超出范围", statusCode: HttpStatusCodes.BAD_REQUEST },
  // Transaction errors (Class 40) / 事务错误 (Class 40)
  "40001": { message: "操作冲突，请重试", statusCode: HttpStatusCodes.CONFLICT },
  "40P01": { message: "操作冲突，请重试", statusCode: HttpStatusCodes.CONFLICT },
};

export type ExtractedPgError = {
  pgError: postgres.PostgresError;
  /** Failing SQL — only present when the error came through Drizzle's query wrapper / 仅在错误经由 Drizzle 查询包装时存在 */
  query?: string;
  params?: readonly unknown[];
};

/**
 * Recursively unwrap arbitrary thrown values to find the underlying postgres.PostgresError.
 *
 * Drizzle v1 wraps every query failure in `DrizzleQueryError`（带 query/params），
 * 而 `drizzle-orm/effect-core` 的 `EffectDrizzleQueryError` 是 Schema.TaggedError，但拥有相同的字段形状。
 * 这里用 instanceof + 鸭子类型双重判断，避免被迫 import effect-core 模块。
 */
export function extractPgError(err: unknown, depth = 0): ExtractedPgError | null {
  if (depth > 5 || err == null)
    return null;

  if (err instanceof postgres.PostgresError) {
    return { pgError: err };
  }

  if (err instanceof DrizzleQueryError) {
    const inner = extractPgError(err.cause, depth + 1);
    if (inner)
      return { pgError: inner.pgError, query: err.query, params: err.params };
    return null;
  }

  if (typeof err === "object") {
    const obj = err as { query?: unknown; params?: unknown; cause?: unknown };
    if (typeof obj.query === "string" && Array.isArray(obj.params) && obj.cause != null) {
      const inner = extractPgError(obj.cause, depth + 1);
      if (inner)
        return { pgError: inner.pgError, query: obj.query, params: obj.params };
    }
    if (obj.cause != null) {
      return extractPgError(obj.cause, depth + 1);
    }
  }

  return null;
}

/** Look up message + status code for a PostgresError; falls back to 500 / 查表得到中文消息与 HTTP 状态码，未匹配走 500 兜底 */
export function mapPgErrorToResponse(pgError: postgres.PostgresError): { message: string; statusCode: ContentfulStatusCode } {
  const config = pgError.code ? pgErrorMessages[pgError.code] : undefined;
  if (config)
    return config;
  return { message: "数据库操作失败", statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR };
}
