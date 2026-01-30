import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import postgres from "postgres";

import ProcessEnv from "@/env";
import { Resp } from "@/utils";

import * as HttpStatusCodes from "../http-status-codes";

/** PostgreSQL 错误码 → 通用中文消息 + HTTP 状态码 */
const pgErrorMessages: Record<string, { message: string; statusCode: ContentfulStatusCode }> = {
  // 数据完整性约束 (Class 23)
  "23505": { message: "数据已存在", statusCode: HttpStatusCodes.CONFLICT },
  "23503": { message: "关联数据不存在或正在被引用", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23502": { message: "必填字段不能为空", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23514": { message: "数据不满足约束条件", statusCode: HttpStatusCodes.BAD_REQUEST },
  "23P01": { message: "数据冲突", statusCode: HttpStatusCodes.CONFLICT },
  // 数据格式错误 (Class 22)
  "22P02": { message: "数据格式无效", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22007": { message: "日期时间格式无效", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22008": { message: "日期时间超出范围", statusCode: HttpStatusCodes.BAD_REQUEST },
  "22003": { message: "数值超出范围", statusCode: HttpStatusCodes.BAD_REQUEST },
  // 事务错误 (Class 40)
  "40001": { message: "操作冲突，请重试", statusCode: HttpStatusCodes.CONFLICT },
  "40P01": { message: "操作冲突，请重试", statusCode: HttpStatusCodes.CONFLICT },
};

/**
 * 从错误中提取 PostgreSQL 错误
 * Drizzle ORM 会将 PostgresError 包装在 Error 的 cause 属性中
 */
function getPostgresError(err: unknown): postgres.PostgresError | null {
  if (err instanceof postgres.PostgresError) {
    return err;
  }
  if (err instanceof Error && err.cause instanceof postgres.PostgresError) {
    return err.cause;
  }
  return null;
}

const onError: ErrorHandler = (err, c) => {
  // 1. 检测 PostgreSQL 错误
  const pgError = getPostgresError(err);
  if (pgError?.code) {
    const config = pgErrorMessages[pgError.code];
    if (config) {
      return c.json(Resp.fail(config.message), config.statusCode);
    }
    // 未映射的数据库错误
    return c.json(Resp.fail("数据库操作失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 2. 其他错误（保持原逻辑）
  const currentStatus = "status" in err
    ? err.status
    : c.newResponse(null).status;
  const statusCode = currentStatus !== HttpStatusCodes.OK
    ? (currentStatus as ContentfulStatusCode)
    : HttpStatusCodes.INTERNAL_SERVER_ERROR;

  const env = c.env?.NODE_ENV || ProcessEnv?.NODE_ENV;
  return c.json(Resp.fail(err.message, {
    stack: env === "production"
      ? undefined
      : err.stack,
  }), statusCode);
};

export default onError;
