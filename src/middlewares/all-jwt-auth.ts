import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { verify } from "hono/jwt";

import env from "@/env";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";

/**
 * 所有 JWT 认证中间件,提供给通用且需要认证的接口使用
 * 支持同时验证用户端和后台 JWT，验证失败时直接返回 401
 */
export function allJwtAuth(): MiddlewareHandler {
  return async (c: Context, next) => {
    const requestSource = c.req.header("X-Request-Source");
    if (!requestSource || (requestSource !== "admin" && requestSource !== "client")) {
      return c.json(
        { message: "请在请求头携带 X-Request-Source: admin 或 client" },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { message: HttpStatusPhrases.UNAUTHORIZED },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }
    const token = authHeader.slice(7);

    let secret = "";

    if (requestSource === "client") {
      secret = env.CLIENT_JWT_SECRET;
    }
    else if (requestSource === "admin") {
      secret = env.ADMIN_JWT_SECRET;
    }

    try {
      const payload = await verify(token, secret);
      c.set("jwtPayload", payload as JWTPayload);
    }
    catch {
      return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
    }

    await next();
  };
}
