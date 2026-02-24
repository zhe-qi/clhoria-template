import type { AppBindings } from "@/types/lib";
import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";

import { trimTrailingSlash } from "hono/trailing-slash";

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants/rate-limit";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { notFound, onError, serveEmojiFavicon } from "@/lib/core/stoker/middlewares";
import { defaultHook } from "@/lib/core/stoker/openapi";
import { Resp } from "@/utils";

import logger from "../services/logger";
import { createRateLimiter } from "./rate-limit-factory";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();

  /** 1. Request ID - generated first for full chain tracing / 请求ID - 最先生成，用于全链路追踪 */
  app.use(requestId());

  /** 2. Logging - record early, including intercepted requests / 日志记录 - 尽早记录，包括被拦截的请求 */
  app.use(pinoLogger({ pino: logger }));

  /** 3. Security headers / 安全头部 */
  app.use(secureHeaders());

  /** 4. Timeout control - set early to control entire request chain / 超时控制 - 尽早设置，控制整个请求链 */
  app.use(timeout(30000));

  /** 5. Rate limiting - intercept before parsing request body / 速率限制 - 在解析请求体之前拦截 */
  app.use(createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_REQUESTS,
  }));

  /** 6. Basic features / 基础功能 */
  app.use(trimTrailingSlash());
  app.use(cors());

  /** 7. Request body limit - limit before actual parsing / 请求体限制 - 在实际解析前限制 */
  app.on(["POST", "PUT", "PATCH"], "*", bodyLimit({
    maxSize: 1 * 1024 * 1024,
    onError: (c) => {
      return c.json(
        Resp.fail("请求体过大（超过 1MB）"),
        HttpStatusCodes.REQUEST_TOO_LONG,
      );
    },
  }));

  /** 8. Compression and static resources / 压缩和静态资源 */
  app.use(compress());
  app.use(serveEmojiFavicon("📝"));

  /** 9. Error handling / 错误处理 */
  app.notFound(notFound);
  app.onError(onError);

  return app;
}
