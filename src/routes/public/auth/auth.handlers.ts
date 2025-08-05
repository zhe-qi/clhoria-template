import type { JWTPayload } from "hono/utils/jwt/types";

import { verify } from "@node-rs/argon2";
import { addDays, fromUnixTime, getUnixTime } from "date-fns";
import { and, eq } from "drizzle-orm";
import { sign, verify as verifyJwt } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemTokens, systemUser, systemUserRole } from "@/db/schema";
import env from "@/env";
import { JwtTokenType, Status, TokenStatus, TokenType } from "@/lib/enums";
import { logger } from "@/lib/logger";
import { getUserMenus as getUserMenusService } from "@/services/system/menu";
import { clearUserPermissionCache, createLoginLogContext, getUserRolesAndPermissionsFromCache, setUserRolesToCache } from "@/services/system/user";
import { omit } from "@/utils";
import { formatDate } from "@/utils/tools/formatter";

import type { AuthRouteHandlerType } from "./auth.index";

export const adminLogin: AuthRouteHandlerType<"adminLogin"> = async (c) => {
  const body = c.req.valid("json");
  const { username, password, domain } = body;

  const logContext = await createLoginLogContext(c, username, domain);

  try {
    // 第一步：查询用户基本信息
    const user = await db.query.systemUser.findFirst({
      where: and(
        eq(systemUser.username, username),
        eq(systemUser.domain, domain),
      ),
      columns: {
        id: true,
        username: true,
        password: true,
        status: true,
        domain: true,
      },
    });

    if (!user) {
      await logContext.logFailure();
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }

    if (user.status !== Status.ENABLED) {
      await logContext.logFailure(user.id);
      return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 第二步：验证密码
    const isPasswordValid = await verify(user.password, password);

    if (!isPasswordValid) {
      await logContext.logFailure(user.id);
      return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 第三步：密码验证通过后查询用户角色
    const userRoles = await db.query.systemUserRole.findMany({
      where: eq(systemUserRole.userId, user.id),
    });

    const roles = userRoles.map(ur => ur.roleId);

    const now = getUnixTime(new Date());
    const accessTokenExp = getUnixTime(addDays(new Date(), 7)); // 7天过期
    const refreshTokenExp = getUnixTime(addDays(new Date(), 30)); // 30天过期
    const jti = crypto.randomUUID(); // JWT ID 确保唯一性

    // JWT payload 只包含核心用户信息
    const tokenPayload = {
      uid: user.id,
      username: user.username,
      domain: user.domain,
      iat: now,
      exp: accessTokenExp,
      jti,
    };

    // 将用户角色存储到 Redis
    await setUserRolesToCache(user.id, user.domain, roles);

    const accessToken = await sign({ ...tokenPayload, type: JwtTokenType.ACCESS }, env.ADMIN_JWT_SECRET, "HS256");
    const refreshToken = await sign({
      ...tokenPayload,
      type: JwtTokenType.REFRESH,
      exp: refreshTokenExp,
      jti: crypto.randomUUID(),
    }, env.ADMIN_JWT_SECRET, "HS256");

    // 先撤销该用户的所有活跃 token
    await db.update(systemTokens)
      .set({ status: TokenStatus.REVOKED })
      .where(and(
        eq(systemTokens.userId, user.id),
        eq(systemTokens.status, TokenStatus.ACTIVE),
      ));

    await db.insert(systemTokens).values({
      accessToken,
      refreshToken,
      status: TokenStatus.ACTIVE,
      userId: user.id,
      username: user.username,
      domain: user.domain,
      expiresAt: formatDate(fromUnixTime(refreshTokenExp)),
      ...logContext.getTokenData(),
      type: TokenType.WEB,
      createdBy: "system",
    });

    // 记录登录成功日志
    await logContext.logSuccess(user.id);

    return c.json({ token: accessToken, refreshToken }, HttpStatusCodes.OK);
  }
  catch (error: any) {
    logger.error("adminLogin error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      table: error.table,
      column: error.column,
    });

    // 记录异常情况下的失败日志，忽略日志失败避免影响主要逻辑
    await logContext.logFailure().catch(() => {});

    // 根据路由定义，只能返回 401 Unauthorized
    return c.json({ message: "登录失败" }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 刷新 Token */
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {
  const body = c.req.valid("json");
  const { refreshToken: oldRefreshToken } = body;

  try {
    const payload = await verifyJwt(oldRefreshToken, env.ADMIN_JWT_SECRET);

    if (payload.type !== JwtTokenType.REFRESH) {
      return c.json({ message: "无效的刷新令牌" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 检查 token 记录
    const tokenRecord = await db.query.systemTokens.findFirst({
      where: and(
        eq(systemTokens.refreshToken, oldRefreshToken),
        eq(systemTokens.status, TokenStatus.ACTIVE),
      ),
    });

    if (!tokenRecord) {
      return c.json({ message: "刷新令牌已失效" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 生成新的 tokens
    const now = getUnixTime(new Date());
    const accessTokenExp = getUnixTime(addDays(new Date(), 7));
    const refreshTokenExp = getUnixTime(addDays(new Date(), 30));

    const jti = crypto.randomUUID();
    const newTokenPayload = {
      uid: payload.uid,
      username: payload.username,
      domain: payload.domain,
      iat: now,
      exp: accessTokenExp,
      jti,
    };

    const newAccessToken = await sign({ ...newTokenPayload, type: JwtTokenType.ACCESS }, env.ADMIN_JWT_SECRET, "HS256");
    const newRefreshToken = await sign({
      ...newTokenPayload,
      type: JwtTokenType.REFRESH,
      exp: refreshTokenExp,
      jti: crypto.randomUUID(),
    }, env.ADMIN_JWT_SECRET, "HS256");

    // 先撤销该用户的其他活跃 token
    await db.update(systemTokens)
      .set({ status: TokenStatus.REVOKED })
      .where(and(
        eq(systemTokens.userId, payload.uid as string),
        eq(systemTokens.status, TokenStatus.ACTIVE),
      ));

    // 更新当前 token 记录
    await db.update(systemTokens)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        status: TokenStatus.ACTIVE,
        expiresAt: formatDate(fromUnixTime(refreshTokenExp)), // 更新过期时间
      })
      .where(eq(systemTokens.id, tokenRecord.id));

    return c.json({ token: newAccessToken, refreshToken: newRefreshToken }, HttpStatusCodes.OK);
  }
  catch {
    return c.json({ message: "刷新令牌无效" }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 获取用户信息 */
export const getUserInfo: AuthRouteHandlerType<"getUserInfo"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");

  try {
    const user = await db.query.systemUser.findFirst({
      where: and(
        eq(systemUser.id, payload.uid as string),
        eq(systemUser.domain, payload.domain as string),
      ),
    });

    if (!user) {
      return c.json({ message: "用户不存在" }, HttpStatusCodes.UNAUTHORIZED);
    }

    const responseUser = omit(user, ["password"]);

    return c.json(responseUser, HttpStatusCodes.OK);
  }
  catch {
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 退出登录 */
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");

  try {
    // 撤销该用户的所有活跃 token
    await db.update(systemTokens)
      .set({ status: TokenStatus.REVOKED })
      .where(and(
        eq(systemTokens.userId, payload.uid as string),
        eq(systemTokens.status, TokenStatus.ACTIVE),
      ));

    // 清除用户权限缓存
    void await clearUserPermissionCache(payload.uid as string, payload.domain as string);

    return c.json({ message: "退出成功" }, HttpStatusCodes.OK);
  }
  catch {
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 获取用户权限 */
export const getUserPermissions: AuthRouteHandlerType<"getUserPermissions"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.uid as string;
  const domain = payload.domain as string;

  try {
    // 从缓存获取用户角色和权限
    const { roles, permissions } = await getUserRolesAndPermissionsFromCache(userId, domain);

    return c.json({ roles, permissions }, HttpStatusCodes.OK);
  }
  catch {
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 获取用户菜单 */
export const getUserMenus: AuthRouteHandlerType<"getUserMenus"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.uid as string;
  const domain = payload.domain as string;

  try {
    const menus = await getUserMenusService(userId, domain);
    return c.json(menus, HttpStatusCodes.OK);
  }
  catch {
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
  }
};
