import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import db from "@/db";
import { systemUser, systemUserRole } from "@/db/schema";
import env from "@/env";
import cap from "@/lib/cap";
import { getEnforcer } from "@/lib/casbin";
import { Status } from "@/lib/enums";
import logger from "@/lib/logger";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { parseTextToZodError } from "@/utils";
import { generateTokens, logout as logoutUtil, refreshAccessToken } from "@/utils/tokens/admin";

import type { AuthRouteHandlerType } from "./auth.index";

/** 管理端登录 */
export const login: AuthRouteHandlerType<"login"> = async (c) => {
  const body = c.req.valid("json");

  // 1. 验证验证码token
  const { success } = await cap.validateToken(body.captchaToken);
  if (!success) {
    return c.json(parseTextToZodError("验证码错误"), HttpStatusCodes.BAD_REQUEST);
  }

  const { username, password } = body;

  // 2. 查询用户基本信息并验证
  const user = await db.query.systemUser.findFirst({
    where: eq(systemUser.username, username),
    columns: {
      id: true,
      username: true,
      password: true,
      status: true,
    },
  });

  // 统一的用户验证逻辑
  if (!user) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  if (user.status !== Status.ENABLED) {
    return c.json(parseTextToZodError(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
  }

  // 3. 验证密码和查询角色
  const isPasswordValid = await verify(user.password, password);
  if (!isPasswordValid) {
    return c.json(parseTextToZodError(HttpStatusPhrases.UNAUTHORIZED), HttpStatusCodes.UNAUTHORIZED);
  }
  const userRoles = await db.query.systemUserRole.findMany({
    where: eq(systemUserRole.userId, user.id),
  });

  const { refreshToken, accessToken } = await generateTokens({
    id: user.id,
    roles: userRoles.map(role => role.roleId),
  });

  // 4. 设置 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true, // 防止 JS 访问
    secure: env.NODE_ENV === "production", // 生产环境启用 https
    sameSite: "strict", // 防止 CSRF
    maxAge: 60 * 60 * 24 * 7,
    path: "/", // 所有路径可访问
  });

  return c.json({ data: { accessToken } }, HttpStatusCodes.OK);
};

/** 刷新 Token */
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {
  const refreshTokenFromCookie = getCookie(c, "refreshToken");

  if (!refreshTokenFromCookie) {
    return c.json(parseTextToZodError("刷新令牌不存在"), HttpStatusCodes.UNAUTHORIZED);
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(refreshTokenFromCookie);

  // 设置新的 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", newRefreshToken, {
    httpOnly: true, // 防止 JS 访问
    secure: env.NODE_ENV === "production", // 生产环境启用 https
    sameSite: "strict", // 防止 CSRF
    maxAge: 60 * 60 * 24 * 7,
    path: "/", // 所有路径可访问
  });

  return c.json({ data: { accessToken } }, HttpStatusCodes.OK);
};

/** 退出登录 */
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {
  const payload = c.get("jwtPayload");
  const userId = payload.sub;

  // 清理用户的所有刷新令牌
  await logoutUtil(userId);

  // 删除 refreshToken cookie
  deleteCookie(c, "refreshToken", {
    path: "/",
  });

  return c.json({ data: {} }, HttpStatusCodes.OK);
};

/** 获取用户信息 */
export const getIdentity: AuthRouteHandlerType<"getIdentity"> = async (c) => {
  const { sub } = c.get("jwtPayload");

  // 查询用户信息
  const user = await db.query.systemUser.findFirst({
    where: eq(systemUser.id, sub),
    columns: {
      id: true,
      username: true,
      avatar: true,
      nickName: true,
    },
  });

  if (!user) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: user }, HttpStatusCodes.OK);
};

/** 获取用户权限 */
export const getPermissions: AuthRouteHandlerType<"getPermissions"> = async (c) => {
  const { roles } = c.get("jwtPayload");

  if (!roles || roles.length === 0) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const casbinEnforcer = await getEnforcer();
  const uniquePermissions = Array.from(
    new Map(
      (await Promise.all(
        roles.map(role => casbinEnforcer.getPermissionsForUser(role)),
      ))
        .flat() // 先扁平为一维数组（包含多个 [s,o,a] 子数组）
        .map(perm => [perm.join(","), perm]), // 用字符串作为唯一标识
    ).values(),
  );

  return c.json({ data: uniquePermissions }, HttpStatusCodes.OK);
};

/** 生成验证码挑战 */
export const createChallenge: AuthRouteHandlerType<"createChallenge"> = async (c) => {
  try {
    const challenge = await cap.createChallenge();
    return c.json(challenge, HttpStatusCodes.OK);
  }
  catch (error: any) {
    logger.error({ error: error.message }, "创建验证码挑战失败");
    return c.json({ message: "创建验证码挑战失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/** 验证用户解答并生成验证token */
export const redeemChallenge: AuthRouteHandlerType<"redeemChallenge"> = async (c) => {
  const { token, solutions } = c.req.valid("json");

  try {
    const result = await cap.redeemChallenge({ token, solutions });
    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    logger.error({ error: error.message }, "验证码验证失败");
    return c.json({ success: false }, HttpStatusCodes.BAD_REQUEST);
  }
};
