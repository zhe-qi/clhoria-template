import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

import type { AppBindings } from "@/types/lib";

/**
 * JWT 认证中间件，支持 Authorization Header 和 query 参数
 * @param secret JWT 密钥
 * @returns 中间件函数
 */
export function jwtWithQuery(secret: string) {
  return createMiddleware<AppBindings>(async (c, next) => {
    let token: string | undefined;

    // 1. 优先检查 Authorization Header
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    // 2. 检查 query 参数中的 token
    else {
      token = c.req.query("token");
    }

    if (!token) {
      return c.json({ message: "no authorization included in request" }, 401);
    }

    try {
      // 验证 JWT token (使用 HS256 算法，与登录时保持一致)
      const payload = await verify(token, secret, "HS256");
      c.set("jwtPayload", payload);
      await next();
    }
    catch (error: any) {
      console.error("JWT verification error:", error);
      return c.json({ message: "invalid credentials structure", error: error.message }, 401);
    }
  });
}

/**
 * Bull Board 静态资源认证中间件
 * 对静态资源进行基础的 Referer 检查，防止直接访问
 * @param secret JWT 密钥
 * @returns 中间件函数
 */
export function bullBoardStaticAuth(secret: string) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const path = c.req.path;

    // 如果是静态资源请求
    if (path.includes("/static/")) {
      const referer = c.req.header("Referer");

      console.error("Static resource request:", {
        path,
        referer,
        hasReferer: !!referer,
        refererIncludes: referer?.includes("/admin/ui/queues"),
      });

      // 检查 Referer 是否来自合法的 Bull Board 页面
      if (!referer || !referer.includes("/admin/ui/queues")) {
        console.error("Access denied: Invalid referer");
        return c.json({ message: "Access denied" }, 403);
      }

      // 从 Referer 中提取 token 进行验证
      try {
        const url = new URL(referer);
        const token = url.searchParams.get("token");

        console.error("Token from referer:", token ? "found" : "not found");

        if (!token) {
          console.error("Access denied: No token in referer");
          return c.json({ message: "Access denied" }, 403);
        }

        await verify(token, secret, "HS256");
        console.error("Token verified successfully");
        await next();
      }
      catch (error) {
        console.error("Access denied: Token verification failed", error);
        return c.json({ message: "Access denied" }, 403);
      }
    }
    else {
      // 非静态资源，使用标准认证
      return jwtWithQuery(secret)(c, next);
    }
  });
}
