import type { MiddlewareHandler } from "hono";

import { Enforcer } from "casbin";

import type { AppBindings } from "@/types/lib";

import { enforcerPromise } from "@/lib/internal/casbin";
import { API_ADMIN_PATH } from "@/lib/internal/openapi/config";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";
import { stripPrefix } from "@/utils/tools";

/**
 * Casbin 权限校验中间件
 * 用于校验当前用户是否有访问指定接口的权限
 */
export function authorize(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    // 获取 Casbin 权限管理器
    const enforcer = await enforcerPromise;

    // 检查 enforcer 是否有效
    if (!(enforcer instanceof Enforcer)) {
      return c.json(Resp.fail(HttpStatusPhrases.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // 从 JWT 载荷中获取用户角色
    const { roles } = c.get("jwtPayload");

    // 去除 API 前缀，获取实际请求路径
    const path = stripPrefix(c.req.path, API_ADMIN_PATH);

    // 并行检查所有角色权限
    const results = await Promise.all(
      roles.map(role => enforcer.enforce(role, path, c.req.method)),
    );
    const hasPermission = results.some(hasPermission => hasPermission);

    // 无权限则返回 403
    if (!hasPermission) {
      return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
    }

    // 有权限则继续后续中间件
    await next();
  };
}
