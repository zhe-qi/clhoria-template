import { differenceInMilliseconds, format } from "date-fns";

import { createMiddleware } from "@/lib/core/factory";
import { operationLogger } from "@/lib/services/logger";

type OperationLogOptions = {
  moduleName?: string;
  description?: string;
};

export function operationLog(options?: OperationLogOptions) {
  return createMiddleware(async (c, next) => {
    const startTime = new Date();
    const method = c.req.method;
    const urlPath = new URL(c.req.url).pathname;
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "";

    let [body, params]: [unknown | null, ParamsType | null] = [null, null];

    try {
      if (method !== "GET" && method !== "DELETE")
        body = await c.req.json<unknown>().catch(() => null);
      params = c.req.query();
    }
    catch (error) {
      operationLogger.warn({ error }, "[操作日志]: 请求体解析失败");
    }

    await next();

    // 同步 clone 响应（确保 Response 对象可用）
    const resClone = c.res.clone();
    const requestId = c.get("requestId");
    const payload = c.get("jwtPayload");

    // fire-and-forget：不阻塞响应返回
    Promise.resolve().then(async () => {
      if (!payload) return;

      const endTime = new Date();
      const durationMs = differenceInMilliseconds(endTime, startTime);
      const { sub: userId, username } = payload;

      let response: unknown = null;
      const MAX_RESPONSE_SIZE = 50 * 1024;
      try {
        const contentLength = c.res.headers.get("content-length");
        const responseSize = contentLength ? Number.parseInt(contentLength, 10) : 0;
        if (responseSize > MAX_RESPONSE_SIZE) {
          response = { _truncated: true, size: responseSize };
        }
        else {
          response = await resClone.json().catch(() => null);
        }
      }
      catch {
        // 忽略解析失败
      }

      operationLogger.info({
        requestId,
        moduleName: options?.moduleName,
        description: options?.description,
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
        durationMs,
      }, "操作日志");
    });
  });
}
