import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSystemUserSchema, patchSystemUserSchema, responseSystemUserSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/users";
const tags = [`${routePrefix}（系统用户）`];

/** 获取系统用户分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_USERS,
    action: PermissionAction.READ,
  },
  summary: "获取系统用户列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema.extend({
      status: z.coerce.number().optional().meta({ description: "用户状态" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseSystemUserSchema),
      "系统用户列表响应成功",
    ),
  },
});

/** 创建系统用户 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_USERS,
    action: PermissionAction.CREATE,
  },
  summary: "创建系统用户",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemUserSchema,
      "创建系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseSystemUserSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemUserSchema),
      "The validation error(s)",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemUserSchema),
      "用户名已存在",
    ),
  },
});

/** 根据ID获取系统用户详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_USERS,
    action: PermissionAction.READ,
  },
  summary: "获取系统用户详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemUserSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
});

/** 更新系统用户 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_USERS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新系统用户",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemUserSchema,
      "更新系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemUserSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemUserSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
});

/** 删除系统用户 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_USERS,
    action: PermissionAction.DELETE,
  },
  summary: "删除系统用户",
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
      "用户不存在",
    ),
  },
});
