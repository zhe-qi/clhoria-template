import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { insertSysMenuSchema, patchSysMenuSchema, selectSysMenuSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["/sys-menus (系统菜单管理)"];

/** 查询菜单列表 */
export const list = createRoute({
  path: "/sys-menus",
  method: "get",
  request: {
    query: z.object({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  tags,
  summary: "查询菜单列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysMenuSchema),
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
      status: z.enum(["ENABLED", "DISABLED"]).optional().describe("菜单状态"),
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
