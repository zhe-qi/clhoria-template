import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { getUserRolesKey } from "@/lib/enums";
import { enforcerLaunchedPromise, PermissionConfigManager } from "@/lib/permissions";
import { redisClient } from "@/lib/redis";

/**
 * 通用 Casbin 权限验证中间件
 */
export function casbin(): MiddlewareHandler {
  return async (c: Context, next) => {
    const { path, method } = c.req;

    const enforcer = await enforcerLaunchedPromise;

    // 如果没有加载 Enforcer 实例，返回错误
    if (!(enforcer instanceof Enforcer)) {
      return c.json({ message: HttpStatusPhrases.INTERNAL_SERVER_ERROR }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // 获取 JWT 载荷
    const payload: JWTPayload = c.get("jwtPayload");
    const { uid: userId, domain: userDomain } = payload as { uid: string; domain: string };

    // 从 Redis 获取用户角色
    const key = getUserRolesKey(userId, userDomain);
    const userRoles = (await redisClient.smembers(key)).filter(role => role !== "__no_roles__");

    // 如果用户没有角色，返回禁止访问
    if (userRoles.length < 1) {
      return c.json({ message: "Access denied: No roles assigned to user" }, HttpStatusCodes.FORBIDDEN);
    }

    // 从权限管理器缓存获取端点权限信息
    const permissionManager = PermissionConfigManager.getInstance();
    const endpointPermission = permissionManager.findEndpointPermission(method.toUpperCase(), path);

    // 如果没有找到端点权限信息，说明该端点不需要权限验证或者是公开接口
    if (!endpointPermission) {
      return await next();
    }

    const { resource, action } = endpointPermission;

    // 使用 Casbin 验证用户角色是否有权限访问该资源
    const checks = userRoles.map(role => enforcer.enforce(role, resource, action, userDomain));
    const hasPermission = (await Promise.all(checks)).some(Boolean);

    // 如果没有权限，返回禁止访问
    if (!hasPermission) {
      return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN);
    }

    const currentPermission = { resource, action };

    const contextData = { userRoles, userDomain, currentPermission, userId };

    Object.entries(contextData).forEach(([key, value]) => {
      c.set(key, value);
    });

    await next();
  };
}
