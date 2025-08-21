import { createRoute, z } from "@hono/zod-openapi";
import { jwt } from "hono/jwt";

import { loginSystemUserSchema, responseSystemUserSchema } from "@/db/schema";
import env from "@/env";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";

const tags = ["/auth (身份认证)"];

/** 后台登录 */
export const adminLogin = createRoute({
  path: "/auth/login",
  method: "post",
  request: {
    body: jsonContentRequired(
      loginSystemUserSchema,
      "登录请求",
    ),
  },
  tags,
  summary: "后台登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        token: z.string().meta({ description: "访问令牌" }),
        refreshToken: z.string().meta({ description: "刷新令牌" }),
      }),
      "登录成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "密码错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ message: z.string() }),
      "用户不存在",
    ),
  },
});

/** 刷新 Token */
export const refreshToken = createRoute({
  path: "/auth/refresh",
  method: "post",
  request: {
    body: jsonContentRequired(
      z.object({
        refreshToken: z.string().meta({ description: "刷新令牌" }),
      }),
      "刷新请求",
    ),
  },
  tags,
  summary: "后台刷新访问令牌",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        token: z.string(),
        refreshToken: z.string(),
      }),
      "刷新成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "刷新令牌无效",
    ),
  },
});

/** 退出登录 */
export const logout = createRoute({
  path: "/auth/logout",
  method: "post",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "后台退出登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "退出成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "未授权",
    ),
  },
});

/** 获取用户信息 */
export const getUserInfo = createRoute({
  path: "/auth/userinfo",
  method: "get",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "后台获取当前用户信息",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemUserSchema,
      "获取成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "未授权",
    ),
  },
});

/** 获取用户权限 */
export const getUserPermissions = createRoute({
  path: "/auth/permissions",
  method: "get",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "获取当前用户权限",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        roles: z.array(z.string()).meta({ description: "用户角色列表" }),
        permissions: z.array(z.string()).meta({ description: "用户权限列表" }),
      }),
      "获取成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "未授权",
    ),
  },
});

/** 生成验证码挑战 */
export const createChallenge = createRoute({
  path: "/auth/challenge",
  method: "post",
  tags,
  summary: "生成验证码挑战",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        challenge: z.any().meta({ description: "验证码挑战数据" }),
        token: z.string().optional().meta({ description: "挑战token" }),
        expires: z.number().meta({ description: "过期时间戳" }),
      }),
      "生成成功",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({ message: z.string() }),
      "生成失败",
    ),
  },
});

/** 验证用户解答并生成验证token */
export const redeemChallenge = createRoute({
  path: "/auth/redeem",
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
  summary: "验证用户解答",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean().meta({ description: "验证结果" }),
        token: z.string().optional().meta({ description: "验证token" }),
        expires: z.number().optional().meta({ description: "过期时间戳" }),
      }),
      "验证成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ success: z.boolean() }),
      "验证失败",
    ),
  },
});
