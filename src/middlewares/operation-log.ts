import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { differenceInMilliseconds, format } from "date-fns";

import env from "@/env";
import { LogType } from "@/lib/enums";
import logger from "@/lib/logger";

/**
 * 操作日志中间件
 */
export function operationLog(options: { moduleName: string; description: string }): MiddlewareHandler {
  return async (c: Context, next) => {
    const startTime = new Date();
    // 获取请求信息
    const method = c.req.method;
    const urlPath = new URL(c.req.url).pathname;
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "";

    // 获取请求体和参数
    let [body, params]: [unknown | null, ParamsType | null] = [null, null];

    try {
      if (method !== "GET" && method !== "DELETE") {
        body = await c.req.json<unknown>().catch(() => null);
      }
      params = c.req.query();
    }
    catch (error) {
      logger.warn({ error }, "请求体解析失败");
    }

    // 执行实际的处理
    await next();

    const requestId = c.get("requestId");
    const endTime = new Date();
    const durationMs = differenceInMilliseconds(endTime, startTime);

    // 获取用户信息
    const payload: JWTPayload | undefined = c.get("jwtPayload");
    if (!payload) {
      // 没有用户信息，不记录日志
      return;
    }

    const { sub: userId, username } = payload;

    // 获取响应信息
    let response: unknown = null;
    const MAX_RESPONSE_SIZE = 50 * 1024; // 50KB 阈值

    try {
      const contentLength = c.res.headers.get("content-length");
      const responseSize = contentLength ? Number.parseInt(contentLength, 10) : 0;

      // 只有响应体较小时才记录完整内容
      if (responseSize > 0 && responseSize <= MAX_RESPONSE_SIZE) {
        const resClone = c.res.clone();
        response = await resClone.json().catch(() => null);
      }
      else if (responseSize > MAX_RESPONSE_SIZE) {
        // 大响应只记录摘要
        response = { _truncated: true, size: responseSize };
      }
      else {
        // 未知大小，尝试解析但设置超时保护
        const resClone = c.res.clone();
        response = await resClone.json().catch(() => null);
      }
    }
    catch (error) {
      logger.warn({ error }, "响应体解析失败");
    }

    // 异步写入
    const logEntry = {
      type: LogType.OPERATION,
      requestId,
      moduleName: options.moduleName,
      description: options.description,
      method,
      urlPath,
      ip,
      userAgent,
      userId,
      username,
      body,
      params,
      response,
      startTime: format(startTime, "yyyy-MM-dd HH:mm:ss"),
      endTime: format(endTime, "yyyy-MM-dd HH:mm:ss"),
      durationMs, // 单位：毫秒
    };

    // 你可以选择你自己的日志写入方式 比如 阿里云 sls，并移除这个控制台输出日志
    if (env.NODE_ENV === "production") {
      logger.info(logEntry, "操作日志");
    }
  };
}
