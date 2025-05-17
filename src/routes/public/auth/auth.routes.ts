import { createRoute, z } from "@hono/zod-openapi";

import { insertAdminUsersSchema, insertClientUsersSchema } from "@/db/schema";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";

const tags = ["/auth (身份认证)"];

/** 后管登录 */
export const adminLogin = createRoute({
  path: "/admin/auth/login",
  method: "post",
  request: {
    body: jsonContentRequired(insertAdminUsersSchema, "登录请求"),
  },
  tags,
  summary: "后管登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ token: z.string() }),
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

/** 后管注册 */
export const adminRegister = createRoute({
  path: "/admin/auth/register",
  method: "post",
  request: {
    body: jsonContentRequired(insertAdminUsersSchema, "注册请求"),
  },
  tags,
  summary: "后管注册 限时开放",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ id: z.string().uuid() }),
      "注册成功",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "用户已存在",
    ),
  },
});

/** 客户端登录 */
export const clientLogin = createRoute({
  path: "/client/auth/login",
  method: "post",
  request: {
    body: jsonContentRequired(insertClientUsersSchema, "登录请求"),
  },
  tags,
  summary: "客户端登录",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ token: z.string() }),
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

/** 客户端注册 */
export const clientRegister = createRoute({
  path: "/client/auth/register",
  method: "post",
  request: {
    body: jsonContentRequired(insertClientUsersSchema, "注册请求"),
  },
  tags,
  summary: "客户端注册",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ id: z.string().uuid() }),
      "注册成功",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "用户已存在",
    ),
  },
});
