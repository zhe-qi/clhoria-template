import type { AuthRouteHandlerType } from "./auth.types";

import { format } from "date-fns";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import env from "@/env";
import { REFRESH_TOKEN_EXPIRES_DAYS } from "@/lib/constants";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/core/stoker/http-status-phrases";
import { LoginResult } from "@/lib/enums";
import cap from "@/lib/services/cap";
import { loginLogger } from "@/lib/services/logger";
import { getIPAddress } from "@/services/ip";
import { Resp, tryit } from "@/utils";

import { generateTokens, getIdentityById, getPermissionsByRoles, logout as logoutUtil, refreshAccessToken, validateCaptcha, validateLogin } from "./auth.helpers";

/** Admin login / 管理端登录 */
export const login: AuthRouteHandlerType<"login"> = async (c) => {
  const body = c.req.valid("json");
  const { username, password } = body;
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "";
  const loginTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const location = await getIPAddress(ip);

  // 1. Validate captcha / 验证验证码
  const captchaError = await validateCaptcha(body.captchaToken);
  if (captchaError && env.NODE_ENV !== "test") {
    loginLogger.info({ username, ip, location, userAgent, loginTime, result: LoginResult.FAILURE, reason: captchaError }, "登录日志");
    return c.json(Resp.fail(captchaError), HttpStatusCodes.BAD_REQUEST);
  }

  // 2. Validate login / 验证登录
  const result = await validateLogin(username, password);
  if (!result.success) {
    loginLogger.info({ username, ip, location, userAgent, loginTime, result: LoginResult.FAILURE, reason: result.error }, "登录日志");
    const statusCode = result.status === "forbidden"
      ? HttpStatusCodes.FORBIDDEN
      : HttpStatusCodes.UNAUTHORIZED;
    return c.json(Resp.fail(result.error), statusCode);
  }

  // 3. Generate tokens / 生成 Token
  const { refreshToken, accessToken } = await generateTokens(result.user);

  // 4. Set HttpOnly Refresh Token Cookie / 设置 HttpOnly Refresh Token Cookie
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRES_DAYS,
    path: "/",
  });

  loginLogger.info({ username, userId: result.user.id, ip, location, userAgent, loginTime, result: LoginResult.SUCCESS }, "登录日志");
  return c.json(Resp.ok({ accessToken }), HttpStatusCodes.OK);
};

/** Refresh token / 刷新 Token */
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

/** Logout / 退出登录 */
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {
  const payload = c.get("jwtPayload");

  await logoutUtil(payload.sub);

  deleteCookie(c, "refreshToken", {
    path: "/",
  });

  return c.json(Resp.ok({}), HttpStatusCodes.OK);
};

/** Get user info / 获取用户信息 */
export const getIdentity: AuthRouteHandlerType<"getIdentity"> = async (c) => {
  const { sub } = c.get("jwtPayload");

  const identity = await getIdentityById(sub);

  if (!identity) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(identity), HttpStatusCodes.OK);
};

/** Get user permissions / 获取用户权限 */
export const getPermissions: AuthRouteHandlerType<"getPermissions"> = async (c) => {
  const { roles } = c.get("jwtPayload");

  if (!roles || roles.length === 0) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const result = await getPermissionsByRoles(roles);

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

/** Generate captcha challenge / 生成验证码挑战 */
export const createChallenge: AuthRouteHandlerType<"createChallenge"> = async (c) => {
  const challenge = await cap.createChallenge();
  return c.json(challenge, HttpStatusCodes.OK);
};

/** Verify user solution and generate verification token / 验证用户解答并生成验证token */
export const redeemChallenge: AuthRouteHandlerType<"redeemChallenge"> = async (c) => {
  const { token, solutions } = c.req.valid("json");
  const result = await cap.redeemChallenge({ token, solutions });
  return c.json(result, HttpStatusCodes.OK);
};
