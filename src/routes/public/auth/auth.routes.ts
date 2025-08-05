import { createRoute, z } from "@hono/zod-openapi";
import { jwt } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { loginSystemUserSchema, responseSystemUserSchema } from "@/db/schema";
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
        token: z.string(),
        refreshToken: z.string(),
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
  middleware: [jwt({ secret: env.ADMIN_JWT_SECRET })],
  request: {
    body: jsonContentRequired(
      z.object({
        refreshToken: z.string().describe("刷新令牌"),
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
        roles: z.array(z.string()).describe("用户角色列表"),
        permissions: z.array(z.string()).describe("用户权限列表"),
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
      z.array(z.object({
        id: z.string().describe("菜单ID"),
        menuType: z.string().describe("菜单类型"),
        menuName: z.string().describe("菜单名称"),
        iconType: z.number().nullable().describe("图标类型"),
        icon: z.string().nullable().describe("图标"),
        routeName: z.string().describe("路由名称"),
        routePath: z.string().describe("路由路径"),
        component: z.string().describe("组件路径"),
        pathParam: z.string().nullable().describe("路径参数"),
        status: z.number().describe("状态"),
        activeMenu: z.string().nullable().describe("激活的菜单"),
        hideInMenu: z.boolean().nullable().describe("是否在菜单中隐藏"),
        pid: z.string().nullable().describe("父级菜单ID"),
        order: z.number().describe("排序"),
        i18nKey: z.string().nullable().describe("国际化键"),
        keepAlive: z.boolean().nullable().describe("是否缓存"),
        constant: z.boolean().describe("是否常量菜单"),
        href: z.string().nullable().describe("外链地址"),
        multiTab: z.boolean().nullable().describe("是否多标签"),
      })),
      "获取成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "未授权",
    ),
  },
});
