import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import ProcessEnv from "@/env";
import { Resp } from "@/utils";

import { INTERNAL_SERVER_ERROR, OK } from "../http-status-codes";

const onError: ErrorHandler = (err, c) => {
  const currentStatus = "status" in err
    ? err.status
    : c.newResponse(null).status;
  const statusCode = currentStatus !== OK
    ? (currentStatus as ContentfulStatusCode)
    : INTERNAL_SERVER_ERROR;

  const env = c.env?.NODE_ENV || ProcessEnv?.NODE_ENV;
  return c.json(Resp.fail(err.message, {
    stack: env === "production"
      ? undefined
      : err.stack,
  }), statusCode);
};

export default onError;
