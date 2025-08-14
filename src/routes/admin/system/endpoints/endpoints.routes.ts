import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSysEndpointSchema, patchSysEndpointSchema, selectSysEndpointSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/endpoints";
const tags = [`${routePrefix}（API端点）`];

/** 获取API端点分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.READ,
  },
  summary: "获取API端点列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema<typeof selectSysEndpointSchema>(selectSysEndpointSchema),
      "API端点列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 获取API端点树形结构 */
export const tree = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.READ,
  },
  summary: "获取API端点树形结构",
  method: "get",
  path: `${routePrefix}/tree`,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysEndpointSchema.extend({
        children: z.array(z.any()).optional().meta({ description: "子端点" }),
      })),
      "API端点树形结构响应成功",
    ),
  },
});

/** 根据角色代码获取授权的API端点 */
export const authEndpoints = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.READ,
  },
  summary: "获取角色授权的API端点",
  method: "get",
  path: `${routePrefix}/auth/{roleCode}`,
  request: {
    params: z.object({
      roleCode: z.string().meta({ description: "角色代码" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysEndpointSchema),
      "角色授权的API端点列表",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 创建API端点 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.CREATE,
  },
  summary: "创建API端点",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSysEndpointSchema,
      "创建API端点参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSysEndpointSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysEndpointSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSysEndpointSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysEndpointSchema),
      "API端点已存在",
    ),
  },
});

/** 根据ID获取API端点详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.READ,
  },
  summary: "获取API端点详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysEndpointSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API端点不存在",
    ),
  },
});

/** 更新API端点 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新API端点",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSysEndpointSchema,
      "更新API端点参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysEndpointSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSysEndpointSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchSysEndpointSchema),
      "API端点路径已存在",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API端点不存在",
    ),
  },
});

/** 删除API端点 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ENDPOINTS,
    action: PermissionAction.DELETE,
  },
  summary: "删除API端点",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API端点不存在",
    ),
  },
});
