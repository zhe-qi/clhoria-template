import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import db from "@/db";
import { systemUserRoles, systemUsers } from "@/db/schema";
import env from "@/env";
import { REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import { Status } from "@/lib/enums";
import cap from "@/lib/internal/cap";
import { enforcerPromise } from "@/lib/internal/casbin";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { generateTokens, logout as logoutUtil, refreshAccessToken } from "@/services/admin";
import { Resp, toColumns, tryit } from "@/utils";

import type { AuthRouteHandlerType } from ".";

/** 管理端登录 */
export const login: AuthRouteHandlerType<"login"> = async (c) => {
  const body = c.req.valid("json");

  const { username, password } = body;

  // 1. 验证验证码token（生产环境必须验证）
  const { success } = await cap.validateToken(body.captchaToken);
  if (!success && env.NODE_ENV === "production") {
    return c.json(Resp.fail("验证码错误"), HttpStatusCodes.BAD_REQUEST);
  }

  // 2. 查询用户基本信息并验证
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
    return c.json(Resp.fail("用户名或密码错误"), HttpStatusCodes.UNAUTHORIZED);
  }

  if (user.status !== Status.ENABLED) {
    return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
  }

  // 3. 验证密码和查询角色
  const isPasswordValid = await verify(user.password, password);

  if (!isPasswordValid) {
    return c.json(Resp.fail("用户名或密码错误"), HttpStatusCodes.UNAUTHORIZED);
  }

  const userRoles = await db.query.systemUserRoles.findMany({
    where: eq(systemUserRoles.userId, user.id),
  });

  const { refreshToken, accessToken } = await generateTokens({
    id: user.id,
    roles: userRoles.map(({ roleId }) => roleId),
  });

  // 4. 设置 HttpOnly Refresh Token Cookie
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

  const [err, res] = await tryit(refreshAccessToken)(refreshTokenFromCookie);

  if (err) {
    return c.json(Resp.fail(err.message), HttpStatusCodes.UNAUTHORIZED);
  }

  const { accessToken, refreshToken: newRefreshToken } = res;

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
  const groupingsSet = new Set<string>();

  // 遍历角色，逐个处理权限（避免一次性创建大量中间数组）
  for (const role of roles) {
    // 获取当前角色的所有权限（包括通过角色继承获得的权限）
    const perms = await casbinEnforcer.getImplicitPermissionsForUser(role);

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

  // 获取所有角色继承关系（g 策略）
  const allGroupings = await casbinEnforcer.getGroupingPolicy();
  for (const grouping of allGroupings) {
    // 过滤空数组和空字符串
    if (!grouping || grouping.length === 0)
      continue;

    const filteredGrouping = grouping.filter(item => item && item.trim() !== "");
    if (filteredGrouping.length === 0)
      continue;

    // 转换为Casbin g策略字符串
    const groupingStr = `g, ${filteredGrouping.join(", ")}`;
    groupingsSet.add(groupingStr);
  }

  // 转换为最终数组
  const permissions = Array.from(permissionsSet);
  const groupings = Array.from(groupingsSet);

  return c.json(Resp.ok({ permissions, groupings }), HttpStatusCodes.OK);
};

/** 生成验证码挑战 */
export const createChallenge: AuthRouteHandlerType<"createChallenge"> = async (c) => {
  const challenge = await cap.createChallenge();

  // cap.js 必须直接返回 challenge 对象，不能包装在 Resp.ok() 中
  return c.json(challenge, HttpStatusCodes.OK);
};

/** 验证用户解答并生成验证token */
export const redeemChallenge: AuthRouteHandlerType<"redeemChallenge"> = async (c) => {
  const { token, solutions } = c.req.valid("json");

  const result = await cap.redeemChallenge({ token, solutions });

  // cap.js 必须直接返回 challenge 对象，不能包装在 Resp.ok() 中
  return c.json(result, HttpStatusCodes.OK);
};
