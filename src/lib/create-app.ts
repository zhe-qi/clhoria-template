import type { Store } from "hono-rate-limiter";
import type { RedisReply } from "rate-limit-redis";

import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { rateLimiter } from "hono-rate-limiter";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import { RedisStore } from "rate-limit-redis";
import { v7 as uuidV7 } from "uuid";

import type { AppBindings } from "@/types/lib";

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import redisClient from "@/lib/redis";
import { notFound, onError, serveEmojiFavicon } from "@/lib/stoker/middlewares";
import { defaultHook } from "@/lib/stoker/openapi";

import logger from "./logger";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

const ioredisStore = new RedisStore({
  sendCommand: (...args) => {
    const [command, ...commandArgs] = args;
    return redisClient.call(command, ...commandArgs) as Promise<RedisReply>;
  },
}) as unknown as Store;

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
  app.use(pinoLogger({ pino: logger }));

  app.use(serveEmojiFavicon("📝"));

  /** 去除尾部斜杠中间件 */
  app.use(trimTrailingSlash());

  /** 速率限制中间件 */
  app.use(rateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: c => c.req.header("X-Forwarded-for") + uuidV7(),
    store: ioredisStore,
  }));

  /** 404 处理 */
  app.notFound(notFound);

  /** 错误处理 */
  app.onError(onError);

  return app;
}
