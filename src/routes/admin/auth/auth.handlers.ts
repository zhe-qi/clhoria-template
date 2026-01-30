import type { AuthRouteHandlerType } from "./auth.types";

import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import env from "@/env";
import { REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import cap from "@/lib/internal/cap";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp, tryit } from "@/utils";

import { getIdentityById, getPermissionsByRoles, validateCaptcha, validateLogin } from "./services/auth.services";
import { generateTokens, logout as logoutUtil, refreshAccessToken } from "./services/token.services";

/** 管理端登录 */
export const login: AuthRouteHandlerType<"login"> = async (c) => {
  const body = c.req.valid("json");
  const { username, password } = body;

  // 1. 验证验证码
  const captchaError = await validateCaptcha(body.captchaToken);
  if (captchaError) {
    return c.json(Resp.fail(captchaError), HttpStatusCodes.BAD_REQUEST);
  }

  // 2. 验证登录
  const result = await validateLogin(username, password);
  if (!result.success) {
    const statusCode = result.status === "forbidden"
      ? HttpStatusCodes.FORBIDDEN
      : HttpStatusCodes.UNAUTHORIZED;
    return c.json(Resp.fail(result.error), statusCode);
  }

  // 3. 生成 Token
  const { refreshToken, accessToken } = await generateTokens(result.user);

  // 4. 设置 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRES_DAYS,
    path: "/",
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

  setCookie(c, "refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRES_DAYS,
    path: "/",
  });

  return c.json(Resp.ok({ accessToken }), HttpStatusCodes.OK);
};

/** 退出登录 */
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {
  const payload = c.get("jwtPayload");

  await logoutUtil(payload.sub);

  deleteCookie(c, "refreshToken", {
    path: "/",
  });

  return c.json(Resp.ok({}), HttpStatusCodes.OK);
};

/** 获取用户信息 */
export const getIdentity: AuthRouteHandlerType<"getIdentity"> = async (c) => {
  const { sub } = c.get("jwtPayload");

  const identity = await getIdentityById(sub);

  if (!identity) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(identity), HttpStatusCodes.OK);
};

/** 获取用户权限 */
export const getPermissions: AuthRouteHandlerType<"getPermissions"> = async (c) => {
  const { roles } = c.get("jwtPayload");

  if (!roles || roles.length === 0) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const result = await getPermissionsByRoles(roles);

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

/** 生成验证码挑战 */
export const createChallenge: AuthRouteHandlerType<"createChallenge"> = async (c) => {
  const challenge = await cap.createChallenge();
  return c.json(challenge, HttpStatusCodes.OK);
};

/** 验证用户解答并生成验证token */
export const redeemChallenge: AuthRouteHandlerType<"redeemChallenge"> = async (c) => {
  const { token, solutions } = c.req.valid("json");
  const result = await cap.redeemChallenge({ token, solutions });
  return c.json(result, HttpStatusCodes.OK);
};
