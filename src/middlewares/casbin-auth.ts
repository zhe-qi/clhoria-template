import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import { enforcerLaunchedPromise } from "@/lib/casbin";
import { getUserRolesKey } from "@/lib/enums";
import { PermissionConfigManager } from "@/lib/permission-config";
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
    const userId = payload.uid as string;
    const domain = (payload.domain as string) ?? "default";

    // 从 Redis 获取用户角色
    const roles = await getUserRoles(userId, domain);
    if (roles.length === 0) {
      return c.json(
        { message: "Access denied: No roles assigned to user" },
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
 * 新版本使用权限管理器缓存，提高性能
 */
export function casbin(): MiddlewareHandler {
  return async (c: Context, next) => {
    const reqId = c.get("reqId");
    const { path, method } = c.req;
    const logger = c.get("logger");

    logger.info(`[CASBIN] ${reqId} - 开始Casbin权限验证: ${method} ${path}`);

    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      logger.error(`[CASBIN] ${reqId} - Casbin enforcer初始化失败`);
      return c.json(
        { message: HttpStatusPhrases.INTERNAL_SERVER_ERROR },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const userId = payload.uid as string;
    const domain = (payload.domain as string) ?? "default";

    logger.info(`[CASBIN] ${reqId} - 用户信息: userId=${userId}, domain=${domain}`);

    // 从 Redis 获取用户角色
    logger.info(`[CASBIN] ${reqId} - 开始获取用户角色`);
    const roles = await getUserRoles(userId, domain);
    logger.info(`[CASBIN] ${reqId} - 用户角色: roles=[${roles.join(", ")}], 角色数量=${roles.length}`);

    if (roles.length === 0) {
      logger.warn(`[CASBIN] ${reqId} - 权限验证失败: 用户无任何角色`);
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
      logger.warn(`[CASBIN] ${reqId} - 未找到端点权限信息: ${method} ${path} - 跳过权限验证`);
      await next();
      return;
    }

    logger.info(`[CASBIN] ${reqId} - 端点权限信息: resource=${endpointPermission.resource}, action=${endpointPermission.action}`);

    // 验证权限
    logger.info(`[CASBIN] ${reqId} - 开始权限检查`);
    for (const role of roles) {
      logger.info(`[CASBIN] ${reqId} - 检查角色权限: role=${role}, resource=${endpointPermission.resource}, action=${endpointPermission.action}, domain=${domain}`);
      const hasRolePermission = await enforcer.enforce(role, endpointPermission.resource, endpointPermission.action, domain);
      logger.info(`[CASBIN] ${reqId} - 角色权限检查结果: role=${role} -> ${hasRolePermission}`);
    }

    const hasPermission = await checkPermission(
      enforcer,
      roles,
      endpointPermission.resource,
      endpointPermission.action,
      domain,
    );

    logger.info(`[CASBIN] ${reqId} - 最终权限验证结果: ${hasPermission}`);

    if (!hasPermission) {
      logger.warn(`[CASBIN] ${reqId} - 权限验证失败: 用户无访问权限`);
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

    logger.info(`[CASBIN] ${reqId} - Casbin权限验证通过，继续执行`);
    await next();
  };
}

/**
 * 高性能权限验证中间件
 * 直接使用权限缓存，避免数据库查询
 */
export function casbinFast(): MiddlewareHandler {
  return async (c: Context, next) => {
    const reqId = c.get("reqId");
    const { path, method } = c.req;
    const logger = c.get("logger");

    logger.info(`[CASBIN-FAST] ${reqId} - 开始快速权限验证: ${method} ${path}`);

    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      logger.error(`[CASBIN-FAST] ${reqId} - Casbin enforcer初始化失败`);
      return c.json(
        { message: HttpStatusPhrases.INTERNAL_SERVER_ERROR },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: JWTPayload = c.get("jwtPayload");
    const userId = payload.uid as string;
    const domain = (payload.domain as string) ?? "default";

    // 从权限管理器缓存获取权限配置
    const permissionManager = PermissionConfigManager.getInstance();
    const permissionConfig = permissionManager.findRoutePermission(method.toUpperCase(), path);

    if (!permissionConfig) {
      // 公开接口或无权限要求的接口
      logger.info(`[CASBIN-FAST] ${reqId} - 公开接口，跳过权限验证`);
      await next();
      return;
    }

    // 获取用户角色
    const roles = await getUserRoles(userId, domain);

    if (roles.length === 0) {
      logger.warn(`[CASBIN-FAST] ${reqId} - 权限验证失败: 用户无任何角色`);
      return c.json(
        { message: "Access denied: No roles assigned to user" },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 快速权限检查
    const hasPermission = await checkPermission(
      enforcer,
      roles,
      permissionConfig.resource,
      permissionConfig.action,
      domain,
    );

    if (!hasPermission) {
      logger.warn(`[CASBIN-FAST] ${reqId} - 权限验证失败: 用户无访问权限`);
      return c.json(
        { message: HttpStatusPhrases.FORBIDDEN },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // 将信息存入上下文
    c.set("userRoles", roles);
    c.set("userDomain", domain);
    c.set("currentPermission", permissionConfig);

    logger.info(`[CASBIN-FAST] ${reqId} - 快速权限验证通过`);
    await next();
  };
}
