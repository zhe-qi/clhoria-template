import type { Schema } from "hono";

import { OpenAPIHono } from "@hono/zod-openapi";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import { notFound, onError } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import type { AppBindings, AppOpenAPI } from "@/types/lib";

import { pinoLogger } from "@/middlewares/pino-logger";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();
  /** 安全头部中间件 */
  app.use(secureHeaders());

  /** 跨域中间件 */
  app.use(cors());

  /** 请求ID中间件 */
  app.use(requestId());

  /** 压缩中间件 */
  app.use(compress());

  /** 日志中间件 */
  app.use(pinoLogger());

  /** 去除尾部斜杠中间件 */
  app.use(trimTrailingSlash());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router);
}
