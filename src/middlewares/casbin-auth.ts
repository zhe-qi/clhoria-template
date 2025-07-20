import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import db from "@/db";
import { sysEndpoint } from "@/db/schema";
import { enforcerLaunchedPromise } from "@/lib/casbin";
import { getUserRolesKey } from "@/lib/enums";
import { redisClient } from "@/lib/redis";

interface PermissionOptions {
  resource: PermissionResourceType;
  action: PermissionActionType;
}

/**
 * 从 Redis 获取用户角色
 */
async function getUserRoles(userId: string, domain: string): Promise<string[]> {
  const key = getUserRolesKey(userId, domain);
  const roles = await redisClient.smembers(key);
  return roles.length > 0 ? roles : [];
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
 * Casbin 权限验证中间件
 * @param options 权限选项
 */
export function requirePermission(options: PermissionOptions): MiddlewareHandler {
  return async (c: Context, next) => {
    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      return c.json(
        { message: HttpStatusPhrases.INTERNAL_SERVER_ERROR },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const userId = payload.sub as string;
    const domain = (payload.domain as string) ?? "default";

    // 从 Redis 获取用户角色
    const roles = await getUserRoles(userId, domain);
    if (roles.length === 0) {
      return c.json(
        { message: "User has no roles assigned" },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 验证权限
    const hasPermission = await checkPermission(
      enforcer,
      roles,
      options.resource,
      options.action,
      domain,
    );

    if (!hasPermission) {
      return c.json(
        { message: HttpStatusPhrases.FORBIDDEN },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 将角色信息存入上下文
    c.set("userRoles", roles);
    c.set("userDomain", domain);

    await next();
  };
}

/**
 * 通用 Casbin 权限验证中间件
 * 使用API端点权限映射将路径和方法映射到业务资源和动作
 */
export function casbin(): MiddlewareHandler {
  return async (c: Context, next) => {
    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      return c.json(
        { message: HttpStatusPhrases.INTERNAL_SERVER_ERROR },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const userId = payload.sub as string;
    const domain = (payload.domain as string) ?? "default";

    // 从 Redis 获取用户角色
    const roles = await getUserRoles(userId, domain);
    if (roles.length === 0) {
      return c.json(
        { message: "User has no roles assigned" },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    const { path, method } = c.req;

    // 查询数据库获取端点权限信息
    const endpoint = await db.query.sysEndpoint.findFirst({
      where: and(
        eq(sysEndpoint.path, path),
        eq(sysEndpoint.method, method),
      ),
    });

    if (!endpoint) {
      // 如果没有找到端点信息，说明该端点不需要权限验证或者尚未同步
      console.warn(`No endpoint info found for ${method} ${path}`);
      await next();
      return;
    }

    // 验证权限
    const hasPermission = await checkPermission(
      enforcer,
      roles,
      endpoint.resource,
      endpoint.action,
      domain,
    );

    if (!hasPermission) {
      return c.json(
        { message: HttpStatusPhrases.FORBIDDEN },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 将角色信息存入上下文
    c.set("userRoles", roles);
    c.set("userDomain", domain);

    await next();
  };
}
