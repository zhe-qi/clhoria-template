import { Enforcer } from "casbin";

import { createMiddleware } from "@/lib/core/factory";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/core/stoker/http-status-phrases";
import { enforcerPromise } from "@/lib/services/casbin";
import { Resp } from "@/utils";
import { stripPrefix } from "@/utils/tools";

/**
 * Casbin permission check middleware
 * Verifies if the current user has access to the specified endpoint
 * Casbin 权限校验中间件
 * 用于校验当前用户是否有访问指定接口的权限
 */
export const authorize = createMiddleware(async (c, next) => {
  // Get Casbin permission enforcer / 获取 Casbin 权限管理器
  const enforcer = await enforcerPromise;

  // Check if enforcer is valid / 检查 enforcer 是否有效
  if (!(enforcer instanceof Enforcer)) {
    return c.json(Resp.fail(HttpStatusPhrases.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Get user roles from JWT payload (type auto-inferred) / 从 JWT 载荷中获取用户角色（类型自动推断）
  const { roles } = c.get("jwtPayload");

  // Strip API prefix to get the actual request path / 去除 API 前缀，获取实际请求路径
  const path = stripPrefix(c.req.path, c.get("tierBasePath") ?? "");

  // Check all role permissions in parallel / 并行检查所有角色权限
  const results = await Promise.all(
    roles.map(role => enforcer.enforce(role, path, c.req.method)),
  );
  const hasPermission = results.some(hasPermission => hasPermission);

  // Return 403 if no permission / 无权限则返回 403
  if (!hasPermission) {
    return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
  }

  // Proceed to next middleware if authorized / 有权限则继续后续中间件
  await next();
});
