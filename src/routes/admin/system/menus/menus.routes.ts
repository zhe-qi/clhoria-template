import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { insertSystemMenuSchema, patchSystemMenuSchema, selectSystemMenuSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/menus";
const tags = [`${routePrefix}（系统菜单管理）`];

/** 获取系统菜单分页列表 */
export const list = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.READ,
  },
  tags,
  summary: "获取系统菜单列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectSystemMenuSchema),
      "菜单列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 获取系统菜单树形结构 */
export const tree = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.READ,
  },
  path: `${routePrefix}/tree`,
  method: "get",
  request: {
    query: z.object({
      status: z.number().int().optional().meta({ description: "菜单状态: 1=启用 0=禁用" }),
    }),
  },
  tags,
  summary: "查询菜单树形结构",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSystemMenuSchema.extend({
        children: z.array(z.any()).optional(),
      }).partial()),
      "查询成功",
    ),
  },
});

/** 根据角色ID获取对应菜单 */
export const getMenusByRole = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.READ,
  },
  path: `${routePrefix}/role/{id}`,
  method: "get",
  request: {
    params: IdUUIDParamsSchema,
  },
  tags,
  summary: "根据角色获取菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSystemMenuSchema),
      "查询成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 创建系统菜单 */
export const create = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.CREATE,
  },
  path: routePrefix,
  method: "post",
  request: {
    body: jsonContentRequired(insertSystemMenuSchema, "创建参数"),
  },
  tags,
  summary: "创建菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemMenuSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemMenuSchema),
      "参数验证失败",
    ),
  },
});

/** 根据ID获取菜单详情 */
export const getOne = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.READ,
  },
  path: `${routePrefix}/{id}`,
  method: "get",
  request: {
    params: IdUUIDParamsSchema,
  },
  tags,
  summary: "根据ID查询菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemMenuSchema,
      "查询成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});

/** 更新系统菜单 */
export const patch = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.UPDATE,
  },
  path: `${routePrefix}/{id}`,
  method: "patch",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchSystemMenuSchema, "更新参数"),
  },
  tags,
  summary: "更新菜单",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemMenuSchema,
      "更新成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "菜单不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSystemMenuSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "参数验证失败",
    ),
  },
});

/** 删除系统菜单 */
export const remove = createRoute({
  permission: {
    resource: PermissionResource.SYSTEM_MENUS,
    action: PermissionAction.DELETE,
  },
  path: `${routePrefix}/{id}`,
  method: "delete",
  request: {
    params: IdUUIDParamsSchema,
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
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "菜单包含子菜单，无法删除",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});
