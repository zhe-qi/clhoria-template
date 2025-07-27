import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { differenceInMilliseconds } from "date-fns";
import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { sysOperationLog } from "@/db/schema";
import { logger } from "@/lib/logger";
import { formatDate } from "@/utils";

interface OperationLogOptions {
  moduleName: string;
  description: string;
}

/**
 * 操作日志中间件
 * 记录用户的操作行为
 */
export function operationLog(options: OperationLogOptions): MiddlewareHandler {
  return async (c: Context, next) => {
    const startTime = new Date();

    // 获取请求信息
    const method = c.req.method;
    const urlPath = new URL(c.req.url).pathname;
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "";

    // 获取请求体和参数
    let [body, params] = [null, null] as [any, any];

    try {
      if (method !== "GET" && method !== "DELETE") {
        body = await c.req.json().catch(() => null);
      }
      params = c.req.query();
    }
    catch (error) {
      logger.warn({ error }, "请求体解析失败");
    }

    // 执行实际的处理
    await next();

    const requestId = c.get("requestId") || uuidV7();
    const endTime = new Date();
    const duration = differenceInMilliseconds(endTime, startTime);

    // 获取用户信息
    const payload: JWTPayload | undefined = c.get("jwtPayload");
    if (!payload) {
      // 没有用户信息，不记录日志
      return;
    }

    const { uid: userId, username, domain } = payload as { uid: string; username: string; domain: string };

    // 获取响应信息
    let response: any = null;
    try {
      // 尝试获取响应体（如果是 JSON）
      const resClone = c.res.clone();
      response = await resClone.json().catch(() => null);
    }
    catch (error) {
      logger.warn({ error }, "响应体解析失败");
    }

    // 异步记录日志，不阻塞响应
    void db.insert(sysOperationLog).values({
      userId,
      username,
      domain,
      moduleName: options.moduleName,
      description: options.description,
      requestId,
      method,
      url: urlPath,
      ip,
      userAgent,
      params: params || null,
      body: body || null,
      response: response || null,
      startTime,
      endTime,
      duration,
      createdBy: userId,
      createdAt: formatDate(new Date()),
    }).catch((error) => {
      console.error("Failed to save operation log:", error);
    });
  };
}
