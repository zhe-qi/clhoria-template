import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysUser } from "@/db/schema";
import { getUserRolesKey, Status } from "@/lib/enums";
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
 * 验证用户状态
 */
async function validateUserStatus(userId: string, domain: string): Promise<{ valid: boolean; message?: string }> {
  const user = await db.query.sysUser.findFirst({
    where: and(
      eq(sysUser.id, userId),
      eq(sysUser.domain, domain),
    ),
  });

  if (!user) {
    return { valid: false, message: "User not found" };
  }

  if (user.status !== Status.ENABLED) {
    return { valid: false, message: "User is disabled" };
  }

  return { valid: true };
}

/**
 * JWT 认证中间件
 * 验证 JWT token 并设置用户上下文信息
 */
export function jwtAuth(): MiddlewareHandler {
  return async (c: Context, next) => {
    const reqId = c.get("reqId");
    const { path, method } = c.req;
    const logger = c.get("logger");

    logger.info(`[JWT-AUTH] ${reqId} - 开始JWT认证: ${method} ${path}`);

    const payload: JWTPayload = c.get("jwtPayload");

    if (!payload) {
      logger.warn(`[JWT-AUTH] ${reqId} - JWT认证失败: 未找到有效的JWT payload`);
      return c.json(
        { message: HttpStatusPhrases.UNAUTHORIZED },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    const userId = payload.uid as string;
    const username = payload.username as string;
    const domain = (payload.domain as string) ?? "default";

    logger.info(`[JWT-AUTH] ${reqId} - JWT payload解析: userId=${userId}, username=${username}, domain=${domain}`);

    // 验证 payload 必要字段
    if (!userId || !username) {
      logger.warn(`[JWT-AUTH] ${reqId} - JWT认证失败: payload缺少必要字段 - userId=${!!userId}, username=${!!username}`);
      return c.json(
        { message: "Invalid token payload" },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // 验证用户状态
    logger.info(`[JWT-AUTH] ${reqId} - 开始验证用户状态: userId=${userId}, domain=${domain}`);
    const userValidation = await validateUserStatus(userId, domain);
    if (!userValidation.valid) {
      logger.warn(`[JWT-AUTH] ${reqId} - 用户状态验证失败: ${userValidation.message}`);
      return c.json(
        { message: userValidation.message },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }
    logger.info(`[JWT-AUTH] ${reqId} - 用户状态验证通过`);

    // 从 Redis 获取用户角色
    logger.info(`[JWT-AUTH] ${reqId} - 开始获取用户角色: userId=${userId}, domain=${domain}`);
    const roles = await getUserRoles(userId, domain);
    logger.info(`[JWT-AUTH] ${reqId} - 用户角色获取结果: roles=[${roles.join(", ")}], 角色数量=${roles.length}`);

    // 将用户信息存入上下文
    c.set("userId", userId);
    c.set("username", username);
    c.set("userDomain", domain);
    c.set("userRoles", roles);

    // 保持向后兼容，更新 jwtPayload 中的信息
    c.set("jwtPayload", {
      ...payload,
      uid: userId,
      username,
      domain,
    });

    logger.info(`[JWT-AUTH] ${reqId} - JWT认证完成，继续下一步`);
    await next();
  };
}
