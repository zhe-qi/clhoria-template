import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { insertUsersSchema } from "@/db/schema";

const tags = ["Public-Auth"];

/** 后管登录 */
export const adminLogin = createRoute({
  path: "/admin/auth/login",
  method: "post",
  request: {
    body: jsonContentRequired(insertUsersSchema, "登录请求"),
  },
  tags,
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

/** 客户端登录 */
export const clientLogin = createRoute({
  path: "/client/auth/login",
  method: "post",
  request: {
    body: jsonContentRequired(insertUsersSchema, "登录请求"),
  },
  tags,
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
    body: jsonContentRequired(insertUsersSchema, "注册请求"),
  },
  tags,
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
