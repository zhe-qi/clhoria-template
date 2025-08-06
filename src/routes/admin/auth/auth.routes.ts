import { createRoute, z } from "@hono/zod-openapi";
import { jwt } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { loginSystemUserSchema, responseSystemUserSchema, routeMetaSchema } from "@/db/schema";
import env from "@/env";

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

/** 获取用户菜单 */
export const getUserMenus = createRoute({
  path: "/auth/menus",
  method: "get",
  tags,
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  summary: "获取当前用户菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      // TODO: 密码的这个地方使用递归报错，只能暂时先这样解决一下
      z.array(z.object({
        name: z.string().meta({ description: "路由名称" }),
        path: z.string().meta({ description: "路由路径" }),
        redirect: z.string().optional().meta({ description: "重定向路径" }),
        component: z.string().optional().meta({ description: "组件路径" }),
        meta: routeMetaSchema,
        children: z.array(z.any()).optional().meta({
          describe: "子菜单",
        }),
      })),
      "获取成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "未授权",
    ),
  },
});
