import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import ProcessEnv from "@/env";
import { extractPgError, mapPgErrorToResponse } from "@/lib/errors/pg-error";
import logger from "@/lib/services/logger";
import { Resp } from "@/utils";

import * as HttpStatusCodes from "../http-status-codes";

const onError: ErrorHandler = (err, c) => {
  // 1. Detect PostgreSQL errors / 检测 PostgreSQL 错误
  const extracted = extractPgError(err);
  if (extracted) {
    const { pgError, query, params } = extracted;
    const { message, statusCode } = mapPgErrorToResponse(pgError);
    logger.warn(
      { code: pgError.code, query, params },
      "[Stoker]: pg error",
    );
    return c.json(Resp.fail(message), statusCode);
  }

  // 2. Other errors (keep original logic) / 其他错误（保持原逻辑）
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
