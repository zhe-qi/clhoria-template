import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { jwt } from "hono/jwt";

import env from "@/env";

/**
 * 可选 JWT 认证中间件
 * 支持同时验证用户端和后台 JWT，验证失败时允许继续执行
 */
export function optionalJwtAuth(): MiddlewareHandler {
  return async (c: Context, next) => {
    const authorization = c.req.header("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      // 没有提供 token，继续执行但不设置用户上下文
      return await next();
    }

    const _token = authorization.substring(7);

    // 尝试使用客户端 JWT 密钥验证
    try {
      const clientJwtMiddleware = jwt({
        secret: env.CLIENT_JWT_SECRET,
      });

      await clientJwtMiddleware(c, async () => {});

      const payload: JWTPayload = c.get("jwtPayload");
      if (payload) {
        const { uid: userId, domain: userDomain } = payload as { uid: string; domain: string };
        c.set("userId", userId);
        c.set("userDomain", userDomain);
        c.set("tokenType", "client");
        return await next();
      }
    }
    catch {
      // 客户端 JWT 验证失败，尝试后台 JWT
    }

    // 尝试使用后台 JWT 密钥验证
    try {
      const adminJwtMiddleware = jwt({
        secret: env.ADMIN_JWT_SECRET,
      });

      await adminJwtMiddleware(c, async () => {});

      const payload: JWTPayload = c.get("jwtPayload");
      if (payload) {
        const { uid: userId, domain: userDomain } = payload as { uid: string; domain: string };
        c.set("userId", userId);
        c.set("userDomain", userDomain);
        c.set("tokenType", "admin");
        return await next();
      }
    }
    catch {
      // 后台 JWT 验证也失败，继续执行但不设置用户上下文
    }

    // 所有验证都失败，继续执行但不设置用户上下文
    await next();
  };
}
