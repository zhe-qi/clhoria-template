import type { Schema } from "hono";
import type { Store } from "hono-rate-limiter";
import type { RedisReply } from "rate-limit-redis";

import { OpenAPIHono } from "@hono/zod-openapi";
import { rateLimiter } from "hono-rate-limiter";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import { RedisStore } from "rate-limit-redis";
import { notFound, onError } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import { v7 as uuidV7 } from "uuid";

import type { AppBindings, AppOpenAPI } from "@/types/lib";

import { redisClient } from "@/lib/redis";
import { pinoLogger } from "@/middlewares/pino-logger";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const ioredisStore = new RedisStore({
    sendCommand: (...args) => {
      const [command, ...commandArgs] = args;
      return redisClient.call(command, ...commandArgs) as Promise<RedisReply>;
    },
  }) as unknown as Store;

  const app = createRouter();

  /** 安全头部中间件 */
  app.use(secureHeaders());

  /** 跨域中间件 */
  app.use(cors());

  /** csrf中间件 */
  app.use(csrf());

  /** 请求ID中间件 */
  app.use(requestId());

  /** 压缩中间件 */
  app.use(compress());

  /** 日志中间件 */
  app.use(pinoLogger());

  /** 去除尾部斜杠中间件 */
  app.use(trimTrailingSlash());

  /** 限流中间件 */
  app.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: c => c.req.header("X-Forwarded-for") + uuidV7(),
    store: ioredisStore,
  }));

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router);
}
