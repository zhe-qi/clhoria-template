import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";

import { getEnforcer } from "@/lib/casbin";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";

/**
 * 通用 Casbin 权限验证中间件
 */
export function authorize(): MiddlewareHandler {
  return async (c: Context, next) => {
    const enforcer = await getEnforcer();

    if (!(enforcer instanceof Enforcer)) {
      return c.json({ message: HttpStatusPhrases.INTERNAL_SERVER_ERROR }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const { roles } = payload as { roles: string[] };

    const checks = roles.map(role => enforcer.enforce(role, c.req.path, c.req.method));
    const hasPermission = (await Promise.all(checks)).some(Boolean);

    if (!hasPermission) {
      return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN);
    }

    await next();
  };
}
