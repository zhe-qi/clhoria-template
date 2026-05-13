import type { ContentfulStatusCode } from "hono/utils/http-status";

import { Data } from "effect";

/** Database operation error / 数据库操作错误 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly code?: string;
  readonly statusCode?: ContentfulStatusCode;
  readonly query?: string;
  readonly params?: readonly unknown[];
}> {}

/** Distributed lock acquisition failed / 分布式锁获取失败 */
export class LockAcquisitionError extends Data.TaggedError("LockAcquisitionError")<{
  readonly key: string;
  readonly cause?: unknown;
}> {}
