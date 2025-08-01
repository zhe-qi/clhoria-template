import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemUser } from "@/db/schema";
import { Status } from "@/lib/enums";
import { enforcerLaunchedPromise, PermissionConfigManager } from "@/lib/permissions";
import { cachePermissionResult, getPermissionResult, getUserRolesFromCache, getUserStatusFromCache, setUserStatusToCache } from "@/services/system/user";
import { setContextData } from "@/utils";

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

    const payload: JWTPayload = c.get("jwtPayload");

    if (!payload) {
      return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
    }

    const { uid: userId, domain: userDomain } = payload as { uid: string; domain: string };

    const userValidation = await validateUserStatus(userId, userDomain);

    if (!userValidation.valid) {
      return c.json({ message: userValidation.message }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 从缓存获取用户角色（包含fallback逻辑）
    const userRoles = await getUserRolesFromCache(userId, userDomain);

    // 如果用户没有角色，返回禁止访问
    if (userRoles.length < 1) {
      return c.json({ message: "Access denied: No roles assigned to user" }, HttpStatusCodes.FORBIDDEN);
    }

    // 从权限管理器缓存获取端点权限信息
    const permissionManager = PermissionConfigManager.getInstance();
    const endpointPermission = permissionManager.findEndpointPermission(method.toUpperCase(), path);

    // 如果没有找到端点权限信息，说明该端点不需要权限验证或者是公开接口
    if (!endpointPermission) {
      setContextData(c, { userRoles, userDomain, userId });
      return await next();
    }

    const { resource, action } = endpointPermission;

    // 先检查权限验证结果缓存
    const cachedResult = await getPermissionResult(userId, userDomain, method.toUpperCase(), path);
    let hasPermission: boolean;

    if (cachedResult !== null) {
      hasPermission = cachedResult;
    }
    else {
      // 使用 Casbin 验证用户角色是否有权限访问该资源
      const checks = userRoles.map(role => enforcer.enforce(role, resource, action, userDomain));
      hasPermission = (await Promise.all(checks)).some(Boolean);

      // 缓存验证结果
      await cachePermissionResult(userId, userDomain, method.toUpperCase(), path, hasPermission);
    }

    // 如果没有权限，返回禁止访问
    if (!hasPermission) {
      return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN);
    }

    const currentPermission = { resource, action };
    setContextData(c, { userRoles, userDomain, currentPermission, userId });

    await next();
  };
}

async function validateUserStatus(userId: string, domain: string): Promise<{ valid: boolean; message?: string }> {
  // 先从缓存获取用户状态
  const cachedStatus = await getUserStatusFromCache(userId, domain);

  if (cachedStatus !== null) {
    return cachedStatus ? { valid: true } : { valid: false, message: "User not found or disabled" };
  }

  // 缓存未命中，从数据库查询
  const user = await db.query.systemUser.findFirst({
    where: and(
      eq(systemUser.id, userId),
      eq(systemUser.domain, domain),
      eq(systemUser.status, Status.ENABLED),
    ),
  });

  const isValid = !!user;

  // 更新缓存
  await setUserStatusToCache(userId, domain, isValid);

  if (!isValid) {
    return { valid: false, message: "User not found or disabled" };
  }

  return { valid: true };
}
