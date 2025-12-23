import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { trimTrailingSlash } from "hono/trailing-slash";

import type { AppBindings } from "@/types/lib";

import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { notFound, onError, serveEmojiFavicon } from "@/lib/stoker/middlewares";
import { defaultHook } from "@/lib/stoker/openapi";
import { Resp } from "@/utils";

import logger from "../logger";
import { createRateLimiter, DEFAULT_RATE_LIMIT } from "./rate-limit-factory";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();

  /** 1. 请求ID - 最先生成，用于全链路追踪 */
  app.use(requestId());

  /** 2. 日志记录 - 尽早记录，包括被拦截的请求 */
  app.use(pinoLogger({ pino: logger }));

  /** 3. 安全头部 */
  app.use(secureHeaders());

  /** 4. 超时控制 - 尽早设置，控制整个请求链 */
  app.use(timeout(30000));

  /** 5. 速率限制 - 在解析请求体之前拦截 */
  app.use(createRateLimiter(DEFAULT_RATE_LIMIT));

  /** 6. 基础功能 */
  app.use(trimTrailingSlash());
  app.use(cors());

  /** 7. 请求体限制 - 在实际解析前限制 */
  app.use(bodyLimit({
    maxSize: 1 * 1024 * 1024,
    onError: (c) => {
      return c.json(Resp.fail("请求体过大（超过 1MB）"), HttpStatusCodes.REQUEST_TOO_LONG);
    },
  }));

  /** 8. 压缩和静态资源 */
  app.use(compress());
  app.use(serveEmojiFavicon("📝"));

  /** 9. 错误处理 */
  app.notFound(notFound);
  app.onError(onError);

  return app;
}

export function createTestApp() {
  const app = createRouter();
  app.use(requestId())
    .use(pinoLogger({ pino: logger }));
  app.notFound(notFound);
  app.onError(onError);
  return app;
}
