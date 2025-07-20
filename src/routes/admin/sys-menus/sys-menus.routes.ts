import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { insertSysMenuSchema, patchSysMenuSchema, selectSysMenuSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { Status } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/sys-menus (系统菜单管理)"];

/** 查询菜单列表 */
export const list = createRoute({
  path: "/sys-menus",
  method: "get",
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  tags,
  summary: "查询菜单列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSysMenuSchema),
      "查询成功",
    ),
  },
});

/** 查询菜单树形结构 */
export const tree = createRoute({
  path: "/sys-menus/tree",
  method: "get",
  request: {
    query: z.object({
      status: z.enum([Status.ENABLED, Status.DISABLED]).optional().describe("菜单状态"),
    }),
  },
  tags,
  summary: "查询菜单树形结构",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysMenuSchema.extend({
        children: z.array(selectSysMenuSchema).optional(),
      })),
      "查询成功",
    ),
  },
});

/** 根据角色获取菜单 */
export const getMenusByRole = createRoute({
  path: "/sys-menus/role/{roleId}",
  method: "get",
  request: {
    params: IdUUIDParamsSchema,
  },
  tags,
  summary: "根据角色获取菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysMenuSchema),
      "查询成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 创建菜单 */
export const create = createRoute({
  path: "/sys-menus",
  method: "post",
  request: {
    body: jsonContentRequired(insertSysMenuSchema, "创建参数"),
  },
  tags,
  summary: "创建菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysMenuSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSysMenuSchema),
      "参数验证失败",
    ),
  },
});

/** 根据ID查询菜单 */
export const getOne = createRoute({
  path: "/sys-menus/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().describe("菜单ID"),
    }),
  },
  tags,
  summary: "根据ID查询菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysMenuSchema,
      "查询成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.coerce.number().int().positive(),
      })),
      "参数验证失败",
    ),
  },
});

/** 更新菜单 */
export const patch = createRoute({
  path: "/sys-menus/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().describe("菜单ID"),
    }),
    body: jsonContentRequired(patchSysMenuSchema, "更新参数"),
  },
  tags,
  summary: "更新菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysMenuSchema,
      "更新成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSysMenuSchema).or(createErrorSchema(z.object({
        id: z.coerce.number().int().positive(),
      }))),
      "参数验证失败",
    ),
  },
});

/** 获取常量路由 */
export const getConstantRoutes = createRoute({
  path: "/sys-menus/constant",
  method: "get",
  tags,
  summary: "获取常量路由",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysMenuSchema.pick({
        id: true,
        menuName: true,
        routeName: true,
        routePath: true,
        component: true,
        icon: true,
        iconType: true,
        i18nKey: true,
        hideInMenu: true,
        keepAlive: true,
        href: true,
        multiTab: true,
        order: true,
        pid: true,
        pathParam: true,
        activeMenu: true,
      })),
      "获取成功",
    ),
  },
});

/** 获取用户路由 */
export const getUserRoutes = createRoute({
  path: "/sys-menus/user-routes",
  method: "get",
  tags,
  summary: "获取当前用户路由",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        routes: z.array(selectSysMenuSchema.extend({
          children: z.array(selectSysMenuSchema).optional(),
        })),
        home: z.string().describe("首页路由"),
      }),
      "获取成功",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "未授权",
    ),
  },
});

/** 删除菜单 */
export const remove = createRoute({
  path: "/sys-menus/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().describe("菜单ID"),
    }),
  },
  tags,
  summary: "删除菜单",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        id: z.coerce.number().int().positive(),
      })),
      "参数验证失败",
    ),
  },
});
