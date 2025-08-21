import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";

import { getEnforcer } from "@/lib/casbin";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";

/**
 * 通用 Casbin 权限验证中间件
 */
export function authorize(resource: string, action: string): MiddlewareHandler {
  return async (c: Context, next) => {
    const enforcer = await getEnforcer();

    // 如果没有加载 Enforcer 实例，返回错误
    if (!(enforcer instanceof Enforcer)) {
      return c.json({ message: HttpStatusPhrases.INTERNAL_SERVER_ERROR }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const { roles } = payload as { roles: string[] };

    const checks = roles.map(role => enforcer.enforce(role, resource, action));
    const hasPermission = (await Promise.all(checks)).some(Boolean);

    // 如果没有权限，返回禁止访问
    if (!hasPermission) {
      return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN);
    }

    await next();
  };
}
