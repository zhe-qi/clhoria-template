import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import db from "@/db";
import { systemUserRoles, systemUsers } from "@/db/schema";
import env from "@/env";
import cap from "@/lib/cap";
import { enforcerPromise } from "@/lib/casbin";
import { LOGIN_LOCKOUT_DURATION, MAX_LOGIN_ATTEMPTS, REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import { Status } from "@/lib/enums";
import redisClient from "@/lib/redis";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { generateTokens, logout as logoutUtil, refreshAccessToken } from "@/services/admin";
import { Resp, toColumns, tryit } from "@/utils";

import type { AuthRouteHandlerType } from ".";

/**
 * 增加登录失败计数
 * @param key Redis key
 */
async function incrementLoginFailCount(key: string): Promise<void> {
  const count = await redisClient.incr(key);
  // 第一次失败时设置过期时间
  if (count === 1) {
    await redisClient.expire(key, LOGIN_LOCKOUT_DURATION);
  }
}

/** 管理端登录 */
export const login: AuthRouteHandlerType<"login"> = async (c) => {
  const body = c.req.valid("json");

  const { username, password } = body;

  // 1. 检查登录失败次数
  const loginFailKey = `login:fail:${username}`;
  const failCountStr = await redisClient.get(loginFailKey);
  const failCount = failCountStr ? Number.parseInt(failCountStr, 10) : 0;

  if (failCount >= MAX_LOGIN_ATTEMPTS) {
    const ttl = await redisClient.ttl(loginFailKey);
    const remainingMinutes = Math.ceil(ttl / 60);
    return c.json(
      Resp.fail(`登录失败次数过多，请 ${remainingMinutes} 分钟后再试`),
      HttpStatusCodes.TOO_MANY_REQUESTS,
    );
  }

  // 2. 验证验证码token（生产环境必须验证）
  const { success } = await cap.validateToken(body.captchaToken);
  if (!success && env.NODE_ENV === "production") {
    return c.json(Resp.fail("验证码错误"), HttpStatusCodes.BAD_REQUEST);
  }

  // 3. 查询用户基本信息并验证
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.username, username),
    columns: {
      id: true,
      username: true,
      password: true,
      status: true,
    },
  });

  // 统一的用户验证逻辑
  if (!user) {
    // 用户不存在时也增加失败计数，防止用户名枚举
    await incrementLoginFailCount(loginFailKey);
    return c.json(Resp.fail("用户名或密码错误"), HttpStatusCodes.UNAUTHORIZED);
  }

  if (user.status !== Status.ENABLED) {
    return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
  }

  // 4. 验证密码和查询角色
  const isPasswordValid = await verify(user.password, password);

  if (!isPasswordValid) {
    // 密码错误时增加失败计数
    await incrementLoginFailCount(loginFailKey);
    return c.json(Resp.fail("用户名或密码错误"), HttpStatusCodes.UNAUTHORIZED);
  }

  // 5. 登录成功，清除失败计数
  await redisClient.del(loginFailKey);

  const userRoles = await db.query.systemUserRoles.findMany({
    where: eq(systemUserRoles.userId, user.id),
  });

  const { refreshToken, accessToken } = await generateTokens({
    id: user.id,
    roles: userRoles.map(({ roleId }) => roleId),
  });

  // 6. 设置 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true, // 防止 JS 访问
    secure: env.NODE_ENV === "production", // 生产环境启用 https
    sameSite: "strict", // 防止 CSRF
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRES_DAYS,
    path: "/", // 所有路径可访问
  });

  return c.json(Resp.ok({ accessToken }), HttpStatusCodes.OK);
};

/** 刷新 Token */
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {
  const refreshTokenFromCookie = getCookie(c, "refreshToken");

  if (!refreshTokenFromCookie) {
    return c.json(Resp.fail("刷新令牌不存在"), HttpStatusCodes.UNAUTHORIZED);
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(refreshTokenFromCookie);

  // 设置新的 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", newRefreshToken, {
    httpOnly: true, // 防止 JS 访问
    secure: env.NODE_ENV === "production", // 生产环境启用 https
    sameSite: "strict", // 防止 CSRF
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRES_DAYS,
    path: "/", // 所有路径可访问
  });

  return c.json(Resp.ok({ accessToken }), HttpStatusCodes.OK);
};

/** 退出登录 */
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {
  const payload = c.get("jwtPayload");

  // 清理用户的所有刷新令牌
  await logoutUtil(payload.sub);

  // 删除 refreshToken cookie
  deleteCookie(c, "refreshToken", {
    path: "/",
  });

  return c.json(Resp.ok({}), HttpStatusCodes.OK);
};

/** 获取用户信息 */
export const getIdentity: AuthRouteHandlerType<"getIdentity"> = async (c) => {
  const { sub } = c.get("jwtPayload");

  // 查询用户信息
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, sub),
    columns: toColumns(["id", "username", "avatar", "nickName"]),
    with: {
      systemUserRoles: {
        columns: {
          roleId: true,
        },
      },
    },
  });

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const { systemUserRoles, ...userWithoutRoles } = user;
  const roles = systemUserRoles.map(({ roleId }) => roleId);

  return c.json(Resp.ok({ ...userWithoutRoles, roles }), HttpStatusCodes.OK);
};

/** 获取用户权限 */
export const getPermissions: AuthRouteHandlerType<"getPermissions"> = async (c) => {
  const { roles } = c.get("jwtPayload");

  if (!roles || roles.length === 0) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const casbinEnforcer = await enforcerPromise;
  const permissionsSet = new Set<string>();

  // 遍历角色，逐个处理权限（避免一次性创建大量中间数组）
  for (const role of roles) {
  // 获取当前角色的权限
    const perms = await casbinEnforcer.getPermissionsForUser(role);

    // 处理当前角色的每一项权限
    for (const perm of perms) {
    // 过滤空数组
      if (!perm || perm.length === 0)
        continue;

      // 过滤空字符串元素并修剪
      const filteredPerm = perm.filter(item => item && item.trim() !== "");

      // 过滤处理后为空的数组
      if (filteredPerm.length === 0)
        continue;

      // 转换为Casbin策略字符串并加入Set（自动去重）
      const permStr = `p, ${filteredPerm.join(", ")}`;
      permissionsSet.add(permStr);
    }
  }

  // 转换为最终数组
  const permissions = Array.from(permissionsSet);

  return c.json(Resp.ok({ permissions }), HttpStatusCodes.OK);
};

/** 生成验证码挑战 */
export const createChallenge: AuthRouteHandlerType<"createChallenge"> = async (c) => {
  const [err, challenge] = await tryit(cap.createChallenge)();

  if (err || !challenge) {
    return c.json(Resp.fail("创建验证码挑战失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // cap.js 必须直接返回 challenge 对象，不能包装在 Resp.ok() 中
  return c.json(challenge, HttpStatusCodes.OK);
};

/** 验证用户解答并生成验证token */
export const redeemChallenge: AuthRouteHandlerType<"redeemChallenge"> = async (c) => {
  const { token, solutions } = c.req.valid("json");

  const [err, result] = await tryit(cap.redeemChallenge)({ token, solutions });

  if (err || !result) {
    return c.json(Resp.fail("验证码验证失败"), HttpStatusCodes.BAD_REQUEST);
  }

  return c.json(result, HttpStatusCodes.OK);
};
