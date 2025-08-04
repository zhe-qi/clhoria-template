import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { insertSystemUserSchema, loginSystemUserSchema, responseSystemUserSchema } from "@/db/schema";

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
        token: z.string(),
        refreshToken: z.string(),
        user: responseSystemUserSchema,
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

/** 后台注册 */
export const adminRegister = createRoute({
  path: "/auth/register",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertSystemUserSchema.extend({
        confirmPassword: z.string().describe("确认密码"),
      }),
      "注册请求",
    ),
  },
  tags,
  summary: "后台注册 限时开放",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ id: z.uuid() }),
      "注册成功",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "用户已存在",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "密码不一致",
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
        refreshToken: z.string().describe("刷新令牌"),
      }),
      "刷新请求",
    ),
  },
  tags,
  summary: "刷新访问令牌",
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

/** 获取用户信息 */
export const getUserInfo = createRoute({
  path: "/auth/userinfo",
  method: "get",
  tags,
  summary: "获取当前用户信息",
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
