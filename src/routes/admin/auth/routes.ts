import { createRoute, z } from "@hono/zod-openapi";
import { jwt } from "hono/jwt";

import env from "@/env";
import { RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { respErr } from "@/utils";

import { getUserInfoSchema, loginSystemUsers } from "../system/users/schema";

const routePrefix = "/auth";
const tags = [`${routePrefix} (管理端身份认证)`];

/** 管理端登录 */
export const login = createRoute({
  path: `${routePrefix}/login`,
  method: "post",
  request: {
    body: jsonContentRequired(
      loginSystemUsers,
      "登录请求",
    ),
  },
  tags,
  summary: "管理端登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({
        accessToken: z.string().meta({ description: "访问令牌" }),
      })),
      "登录成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(respErr, "用户名或密码错误"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "验证码错误"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(respErr, "用户被禁用"),
    [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(respErr, "登录失败次数过多"),
  },
});

/** 刷新 Token */
export const refreshToken = createRoute({
  path: `${routePrefix}/refresh`,
  method: "post",
  tags,
  summary: "管理端刷新访问令牌",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({
        accessToken: z.string().meta({ description: "访问令牌" }),
      })),
      "刷新成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(respErr, "刷新令牌无效"),
  },
});

/** 退出登录 */
export const logout = createRoute({
  path: `${routePrefix}/logout`,
  method: "post",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "管理端退出登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({})),
      "退出成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(respErr, "未授权"),
  },
});

/** 获取用户信息 */
export const getIdentity = createRoute({
  path: `${routePrefix}/userinfo`,
  method: "get",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "管理端获取当前用户信息",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(getUserInfoSchema),
      "获取成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户不存在"),
  },
});

/** 获取用户权限 */
export const getPermissions = createRoute({
  path: `${routePrefix}/permissions`,
  method: "get",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "管理端获取当前用户权限",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({
        permissions: z.array(z.string()).meta({ description: "权限列表" }),
      })),
      "获取成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "角色不存在"),
  },
});

/** 生成验证码挑战 */
export const createChallenge = createRoute({
  path: `${routePrefix}/challenge`,
  method: "post",
  tags,
  summary: "管理端生成验证码挑战",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        challenge: z.any().meta({ description: "验证码挑战数据" }),
        token: z.string().optional().meta({ description: "挑战token" }),
        expires: z.number().meta({ description: "过期时间戳" }),
      }),
      "生成成功",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "生成失败"),
  },
});

/** 验证用户解答并生成验证token */
export const redeemChallenge = createRoute({
  path: `${routePrefix}/redeem`,
  method: "post",
  request: {
    body: jsonContentRequired(
      z.object({
        token: z.string().meta({ description: "挑战token" }),
        solutions: z.array(z.number()).meta({ description: "用户解答" }),
      }),
      "验证请求",
    ),
  },
  tags,
  summary: "管理端验证用户解答",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean().meta({ description: "验证结果" }),
        token: z.string().optional().meta({ description: "验证token" }),
        expires: z.number().optional().meta({ description: "过期时间戳" }),
      }),
      "验证成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "验证失败"),
  },
});
