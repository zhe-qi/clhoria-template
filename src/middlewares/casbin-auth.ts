import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { getUserRolesKey } from "@/lib/enums";
import { enforcerLaunchedPromise, PermissionConfigManager } from "@/lib/permissions";
import { redisClient } from "@/lib/redis";

/**
 * 从 Redis 获取用户角色
 */
async function getUserRoles(userId: string, domain: string): Promise<string[]> {
  const key = getUserRolesKey(userId, domain);
  const roles = await redisClient.smembers(key);
  // 过滤掉特殊标记
  return roles.filter(role => role !== "__no_roles__");
}

/**
 * 验证权限
 */
async function checkPermission(
  enforcer: Enforcer,
  roles: string[],
  resource: string,
  action: string,
  domain: string,
): Promise<boolean> {
  const checks = roles.map(role => enforcer.enforce(role, resource, action, domain));
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

/**
 * 通用 Casbin 权限验证中间件
 */
export function casbin(): MiddlewareHandler {
  return async (c: Context, next) => {
    const { path, method } = c.req;

    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      return c.json(
        { message: HttpStatusPhrases.INTERNAL_SERVER_ERROR },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const userId = payload.uid as string;
    const domain = payload.domain as string;

    // 从 Redis 获取用户角色
    const roles = await getUserRoles(userId, domain);

    if (roles.length === 0) {
      return c.json(
        { message: "Access denied: No roles assigned to user" },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 从权限管理器缓存获取端点权限信息
    const permissionManager = PermissionConfigManager.getInstance();
    const endpointPermission = permissionManager.findEndpointPermission(method.toUpperCase(), path);

    if (!endpointPermission) {
      // 如果没有找到端点权限信息，说明该端点不需要权限验证或者是公开接口
      await next();
      return;
    }

    const hasPermission = await checkPermission(
      enforcer,
      roles,
      endpointPermission.resource,
      endpointPermission.action,
      domain,
    );

    if (!hasPermission) {
      return c.json(
        { message: HttpStatusPhrases.FORBIDDEN },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 将角色信息和权限信息存入上下文
    c.set("userRoles", roles);
    c.set("userDomain", domain);
    c.set("currentPermission", {
      resource: endpointPermission.resource,
      action: endpointPermission.action,
    });

    await next();
  };
}
