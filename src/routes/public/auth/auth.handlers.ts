import { hash, verify } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { sign, verify as verifyJwt } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { sysLoginLog, sysTokens, sysUser } from "@/db/schema";
import env from "@/env";
import { AuthType, Status, TokenStatus, TokenType } from "@/lib/enums";
import { logger } from "@/lib/logger";
import { getIPAddress } from "@/services/ip";
import { setUserRolesToCache } from "@/services/user";
import { omit } from "@/utils";

import type { AuthRouteHandlerType } from "./auth.index";

export const adminLogin: AuthRouteHandlerType<"adminLogin"> = async (c) => {
  const body = c.req.valid("json");
  const { username, password, domain } = body;

  const user = await db.query.sysUser.findFirst({
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
    },
    where: and(
      eq(sysUser.username, username),
      eq(sysUser.domain, domain),
    ),
  });

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  if (user.status !== Status.ENABLED) {
    return c.json({ message: "用户已禁用" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const isPasswordValid = await verify(user.password, password);

  if (!isPasswordValid) {
    return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
  }

  // 生成 tokens
  const roles = user.userRoles.map(ur => ur.roleId);

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID(); // JWT ID 确保唯一性

  // JWT payload 只包含核心用户信息
  const tokenPayload = {
    uid: user.id,
    username: user.username,
    domain: user.domain,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7天过期
    jti,
  };

  // 将用户角色存储到 Redis
  await setUserRolesToCache(user.id, user.domain, roles);

  const accessToken = await sign({ ...tokenPayload, type: "access" }, env.ADMIN_JWT_SECRET, "HS256");
  const refreshToken = await sign({ ...tokenPayload, type: "refresh", exp: now + 30 * 24 * 60 * 60, jti: crypto.randomUUID() }, env.ADMIN_JWT_SECRET, "HS256");

  // 保存 token 记录
  const clientIP = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";
  const address = await getIPAddress(clientIP);

  // 先撤销该用户的所有活跃 token
  await db.update(sysTokens)
    .set({ status: TokenStatus.REVOKED })
    .where(and(
      eq(sysTokens.userId, user.id),
      eq(sysTokens.status, TokenStatus.ACTIVE),
    ));

  await db.insert(sysTokens).values({
    accessToken,
    refreshToken,
    status: TokenStatus.ACTIVE,
    userId: user.id,
    username: user.username,
    domain: user.domain,
    ip: clientIP,
    address,
    userAgent,
    requestId: crypto.randomUUID(),
    type: TokenType.WEB,
    createdBy: "system",
  });

  // 记录登录日志
  await db.insert(sysLoginLog).values({
    userId: user.id,
    username: user.username,
    domain: user.domain,
    ip: clientIP,
    address,
    userAgent,
    requestId: crypto.randomUUID(),
    type: AuthType.PASSWORD,
    createdBy: "system",
  });

  const responseUser = omit(user, ["password"]);

  return c.json({ token: accessToken, refreshToken, user: responseUser }, HttpStatusCodes.OK);
};

/** 后台注册 */
export const adminRegister: AuthRouteHandlerType<"adminRegister"> = async (c) => {
  const body = c.req.valid("json");
  const { password, confirmPassword, ...userData } = body;

  if (password !== confirmPassword) {
    return c.json({ message: "密码不一致" }, HttpStatusCodes.BAD_REQUEST);
  }

  // 检查用户名是否已存在
  const existingUser = await db.query.sysUser.findFirst({
    where: and(
      eq(sysUser.username, userData.username),
      eq(sysUser.domain, userData.domain),
    ),
  });

  if (existingUser) {
    return c.json({ message: "用户已存在" }, HttpStatusCodes.CONFLICT);
  }

  const [{ id }] = await db.insert(sysUser).values({
    ...userData,
    password: await hash(password),
    createdBy: "system",
  }).returning({ id: sysUser.id });

  return c.json({ id }, HttpStatusCodes.OK);
};

/** 刷新 Token */
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {
  const body = c.req.valid("json");
  const { refreshToken: oldRefreshToken } = body;

  try {
    // 验证 refresh token
    const payload = await verifyJwt(oldRefreshToken, env.ADMIN_JWT_SECRET) as any;

    if (payload.type !== "refresh") {
      return c.json({ message: "无效的刷新令牌" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 检查 token 记录
    const tokenRecord = await db.query.sysTokens.findFirst({
      where: and(
        eq(sysTokens.refreshToken, oldRefreshToken),
        eq(sysTokens.status, TokenStatus.ACTIVE),
      ),
    });

    if (!tokenRecord) {
      return c.json({ message: "刷新令牌已失效" }, HttpStatusCodes.UNAUTHORIZED);
    }

    // 生成新的 tokens
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID(); // JWT ID 确保唯一性
    const newTokenPayload = {
      uid: payload.uid,
      username: payload.username,
      domain: payload.domain,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7天过期
      jti,
    };

    const newAccessToken = await sign({ ...newTokenPayload, type: "access" }, env.ADMIN_JWT_SECRET, "HS256");
    const newRefreshToken = await sign({ ...newTokenPayload, type: "refresh", exp: now + 30 * 24 * 60 * 60, jti: crypto.randomUUID() }, env.ADMIN_JWT_SECRET, "HS256");

    // 先撤销该用户的其他活跃 token
    await db.update(sysTokens)
      .set({ status: TokenStatus.REVOKED })
      .where(and(
        eq(sysTokens.userId, payload.uid),
        eq(sysTokens.status, TokenStatus.ACTIVE),
      ));

    // 更新当前 token 记录
    await db.update(sysTokens)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        status: TokenStatus.ACTIVE,
      })
      .where(eq(sysTokens.id, tokenRecord.id));

    return c.json({ token: newAccessToken, refreshToken: newRefreshToken }, HttpStatusCodes.OK);
  }
  catch (error) {
    logger.warn({ error }, "刷新令牌验证失败");
    return c.json({ message: "刷新令牌无效" }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/** 获取用户信息 */
export const getUserInfo: AuthRouteHandlerType<"getUserInfo"> = async (c) => {
  // 这里需要从 JWT token 中获取用户信息
  // 在实际实现中，这里应该由 JWT 中间件提供用户信息
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "未授权" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyJwt(token, env.ADMIN_JWT_SECRET);

    const user = await db.query.sysUser.findFirst({
      where: and(
        eq(sysUser.id, payload.uid as string),
        eq(sysUser.domain, payload.domain as string),
      ),
    });

    if (!user) {
      return c.json({ message: "用户不存在" }, HttpStatusCodes.UNAUTHORIZED);
    }

    const responseUser = omit(user, ["password"]);

    return c.json(responseUser, HttpStatusCodes.OK);
  }
  catch (error) {
    logger.warn({ error }, "用户token验证失败");
    return c.json({ message: "未授权" }, HttpStatusCodes.UNAUTHORIZED);
  }
};
