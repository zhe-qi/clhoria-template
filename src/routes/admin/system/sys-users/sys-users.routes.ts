import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSysUserSchema, patchSysUserSchema, responseSysUserSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils/zod/schemas";

const tags = ["/sys-users (系统用户)"];

/** 获取系统用户分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.READ,
  },
  summary: "获取系统用户列表",
  method: "get",
  path: "/sys-users",
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseSysUserSchema),
      "系统用户列表响应成功",
    ),
  },
});

/** 创建系统用户 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.CREATE,
  },
  summary: "创建系统用户",
  method: "post",
  path: "/sys-users",
  request: {
    body: jsonContentRequired(
      insertSysUserSchema,
      "创建系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseSysUserSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSysUserSchema),
      "The validation error(s)",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysUserSchema),
      "用户名已存在",
    ),
  },
});

/** 根据ID获取系统用户详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.READ,
  },
  summary: "获取系统用户详情",
  method: "get",
  path: "/sys-users/{id}",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSysUserSchema,
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
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新系统用户",
  method: "patch",
  path: "/sys-users/{id}",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSysUserSchema,
      "更新系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSysUserSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSysUserSchema).or(createErrorSchema(IdUUIDParamsSchema)),
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
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.DELETE,
  },
  summary: "删除系统用户",
  method: "delete",
  path: "/sys-users/{id}",
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

/** 为用户分配角色 */
export const assignRoles = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_USERS,
    action: PermissionAction.ASSIGN_USERS,
  },
  summary: "分配角色给用户",
  method: "post",
  path: "/sys-users/{id}/roles",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        roleIds: z.array(z.string()).describe("角色ID列表"),
      }),
      "分配角色参数",
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
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
});
