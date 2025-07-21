import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { sysOperationLog } from "@/db/schema";

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
    const requestId = uuidV7();

    // 设置请求ID到上下文
    c.set("requestId", requestId);

    // 获取请求信息
    const { method, path } = c.req;
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "";

    // 获取请求体和参数
    let body: any = null;
    let params: any = null;

    try {
      if (method !== "GET" && method !== "DELETE") {
        body = await c.req.json().catch(() => null);
      }
      params = c.req.query();
    }
    catch {
      // 忽略解析错误
    }

    // 执行实际的处理
    await next();

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // 获取用户信息
    const payload: JWTPayload | undefined = c.get("jwtPayload");
    if (!payload) {
      // 没有用户信息，不记录日志
      return;
    }

    const userId = payload.sub as string;
    const username = (payload.username as string) || "";
    const domain = (payload.domain as string) || "default";

    // 获取响应信息
    let response: any = null;
    try {
      // 尝试获取响应体（如果是 JSON）
      const resClone = c.res.clone();
      response = await resClone.json().catch(() => null);
    }
    catch {
      // 忽略解析错误
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
      url: path,
      ip,
      userAgent,
      params: params || null,
      body: body || null,
      response: response || null,
      startTime,
      endTime,
      duration,
      createdBy: userId, // 添加创建者字段
    }).catch((error) => {
      console.error("Failed to save operation log:", error);
    });
  };
}
