import { hash, verify } from "@node-rs/argon2";
import { addDays, getUnixTime } from "date-fns";
import { and, eq } from "drizzle-orm";
import { sign, verify as verifyJwt } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { systemLoginLog, systemTokens, systemUser } from "@/db/schema";
import env from "@/env";
import { AuthType, Status, TokenStatus, TokenType } from "@/lib/enums";
import { getIPAddress } from "@/services/ip";
import { setUserRolesToCache } from "@/services/system/user";
import { omit } from "@/utils";
import { formatDate } from "@/utils/tools/formatter";

import type { AuthRouteHandlerType } from "./auth.index";

export const adminLogin: AuthRouteHandlerType<"adminLogin"> = async (c) => {
  try {
    const body = c.req.valid("json");
    const { username, password, domain } = body;

    const user = await db.query.systemUser.findFirst({
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
      where: and(
        eq(systemUser.username, username),
        eq(systemUser.domain, domain),
      ),
    });

    if (!user) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }

    if (user.status !== Status.ENABLED) {
      return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
    }

    const isPasswordValid = await verify(user.password, password);

    if (!isPasswordValid) {
      return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 生成 tokens
    const roles = user.userRoles.map(ur => ur.roleId);

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

    const accessToken = await sign({ ...tokenPayload, type: "access" }, env.ADMIN_JWT_SECRET, "HS256");
    const refreshToken = await sign({
      ...tokenPayload,
      type: "refresh",
      exp: refreshTokenExp,
      jti: crypto.randomUUID(),
    }, env.ADMIN_JWT_SECRET, "HS256");

    // 保存 token 记录
    const clientIP = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";
    const address = await getIPAddress(clientIP);

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
      expiresAt: formatDate(new Date(refreshTokenExp * 1000)), // 使用refresh token的过期时间
      ip: clientIP,
      address,
      userAgent,
      requestId: uuidV7(),
      type: TokenType.WEB,
      createdBy: "system",
    });

    // 记录登录日志
    await db.insert(systemLoginLog).values({
      userId: user.id,
      username: user.username,
      domain: user.domain,
      ip: clientIP,
      address,
      userAgent,
      requestId: uuidV7(),
      type: AuthType.PASSWORD,
      createdBy: "system",
    });

    const responseUser = omit(user, ["password"]);

    return c.json({ token: accessToken, refreshToken, user: responseUser }, HttpStatusCodes.OK);
  }
  catch (error: any) {
    console.error("adminLogin error details:", {
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

    // 根据路由定义，只能返回 401 Unauthorized
    return c.json({ message: "登录失败" }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 后台注册 */
export const adminRegister: AuthRouteHandlerType<"adminRegister"> = async (c) => {
  const body = c.req.valid("json");
  const { password, confirmPassword, ...userData } = body;

  if (password !== confirmPassword) {
    return c.json({ message: "密码不一致" }, HttpStatusCodes.BAD_REQUEST);
  }

  // 检查用户名是否已存在
  const existingUser = await db.query.systemUser.findFirst({
    where: and(
      eq(systemUser.username, userData.username),
      eq(systemUser.domain, userData.domain),
    ),
  });

  if (existingUser) {
    return c.json({ message: "用户已存在" }, HttpStatusCodes.CONFLICT);
  }

  const [{ id }] = await db.insert(systemUser).values({
    ...userData,
    password: await hash(password),
    createdBy: "system",
  }).returning({ id: systemUser.id });

  return c.json({ id }, HttpStatusCodes.OK);
};

/** 刷新 Token */
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {
  const body = c.req.valid("json");
  const { refreshToken: oldRefreshToken } = body;

  try {
    // 验证 refresh token
    const payload = await verifyJwt(oldRefreshToken, env.ADMIN_JWT_SECRET);

    if (payload.type !== "refresh") {
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

    const newAccessToken = await sign({ ...newTokenPayload, type: "access" }, env.ADMIN_JWT_SECRET, "HS256");
    const newRefreshToken = await sign({
      ...newTokenPayload,
      type: "refresh",
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
        expiresAt: formatDate(new Date(refreshTokenExp * 1000)), // 更新过期时间
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
  // 这里需要从 JWT token 中获取用户信息
  // 在实际实现中，这里应该由 JWT 中间件提供用户信息
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyJwt(token, env.ADMIN_JWT_SECRET);

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
