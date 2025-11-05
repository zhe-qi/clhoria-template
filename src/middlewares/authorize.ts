import type { MiddlewareHandler } from "hono";

import { Enforcer } from "casbin";

import type { AppBindings } from "@/types/lib";

import { enforcerPromise } from "@/lib/casbin";
import logger from "@/lib/logger";
import { API_ADMIN_PATH } from "@/lib/openapi/config";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";

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
    const path = c.req.path.replace(API_ADMIN_PATH, "");

    // 检查用户是否有权限访问该路径和方法
    const hasPermission = await hasAnyPermission(enforcer, roles, path, c.req.method);

    // 无权限则返回 403
    if (!hasPermission) {
      return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
    }

    // 有权限则继续后续中间件
    await next();
  };
}

/**
 * 检查用户是否有任意一个角色有权限访问指定路径和方法
 */
async function hasAnyPermission(enforcer: Enforcer, roles: string[], path: string, method: string): Promise<boolean> {
  // 边界情况：空角色直接返回
  if (roles.length === 0) {
    return false;
  }

  // 封装安全的权限检查函数
  const safeEnforce = async (role: string): Promise<boolean> => {
    try {
      return await enforcer.enforce(role, path, method);
    }
    catch (error) {
      // 记录错误但不中断流程
      logger.error({ error, role, path, method }, "[授权]: Casbin enforce 执行失败");
      return false;
    }
  };

  // 单角色优化路径
  if (roles.length === 1) {
    return safeEnforce(roles[0]);
  }

  // 并发检查所有角色权限
  const results = await Promise.all(
    roles.map(role => safeEnforce(role)),
  );

  // 任意一个有权限即返回 true
  return results.some(hasPermission => hasPermission);
}
