import cap from "@/lib/cap";
import logger from "@/lib/logger";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { AuthRouteHandlerType } from "./auth.index";

// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const adminLogin: AuthRouteHandlerType<"adminLogin"> = async (c) => {

};

/** 刷新 Token */
// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const refreshToken: AuthRouteHandlerType<"refreshToken"> = async (c) => {

};

/** 退出登录 */
// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const logout: AuthRouteHandlerType<"logout"> = async (c) => {

};

/** 获取用户信息 */
// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const getUserInfo: AuthRouteHandlerType<"getUserInfo"> = async (c) => {

};

/** 获取用户权限 */
// @ts-expect-error 1111
// eslint-disable-next-line unused-imports/no-unused-vars
export const getUserPermissions: AuthRouteHandlerType<"getUserPermissions"> = async (c) => {

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
  const body = c.req.valid("json");
  const { token, solutions } = body;

  try {
    const result = await cap.redeemChallenge({ token, solutions });
    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    logger.error({ error: error.message }, "验证码验证失败");
    return c.json({ success: false }, HttpStatusCodes.BAD_REQUEST);
  }
};
