import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSystemPostSchema, patchSystemPostSchema, responseSystemPostSchema, simpleSystemPostSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/posts";
const tags = [`${routePrefix}（岗位管理）`];

/** 获取岗位分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.READ,
  },
  summary: "获取岗位列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema<typeof responseSystemPostSchema>(responseSystemPostSchema),
      "岗位列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 获取简化岗位列表 */
export const simpleList = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.READ,
  },
  summary: "获取简化岗位列表",
  method: "get",
  path: `${routePrefix}/simple-list`,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(simpleSystemPostSchema),
      "简化岗位列表响应成功",
    ),
  },
});

/** 创建岗位 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.CREATE,
  },
  summary: "创建岗位",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemPostSchema,
      "创建岗位参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseSystemPostSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemPostSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemPostSchema),
      "岗位编码已存在",
    ),
  },
});

/** 根据ID获取岗位详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.READ,
  },
  summary: "获取岗位详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemPostSchema,
      "获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "岗位不存在",
    ),
  },
});

/** 更新岗位 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新岗位",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemPostSchema,
      "更新岗位参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemPostSchema,
      "更新成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSystemPostSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "岗位不存在",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchSystemPostSchema),
      "岗位编码已存在",
    ),
  },
});

/** 删除岗位 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.DELETE,
  },
  summary: "删除岗位",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "岗位不存在",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "岗位已分配给用户，无法删除",
    ),
  },
});

/** 为岗位分配用户 */
export const assignUsers = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_POSTS,
    action: PermissionAction.ASSIGN_USERS,
  },
  summary: "分配用户给岗位",
  method: "post",
  path: `${routePrefix}/{id}/users`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        userIds: z.array(z.string()).meta({ description: "用户ID列表" }),
      }),
      "分配用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        added: z.number(),
        removed: z.number(),
      }),
      "分配成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "岗位不存在",
    ),
  },
});
