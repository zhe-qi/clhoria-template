import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSystemRoleSchema, patchSystemRoleSchema, selectSystemRoleSchema } from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/roles";
const tags = [`${routePrefix}（系统角色）`];

/** 获取系统角色分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.READ,
  },
  summary: "获取系统角色列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSystemRoleSchema),
      "系统角色列表响应成功",
    ),
  },
});

/** 创建系统角色 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.CREATE,
  },
  summary: "创建系统角色",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemRoleSchema,
      "创建系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSystemRoleSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSystemRoleSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemRoleSchema),
      "参数验证失败",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemRoleSchema),
      "角色代码已存在",
    ),
  },
});

/** 根据ID获取系统角色详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.READ,
  },
  summary: "获取系统角色详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemRoleSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 更新系统角色 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.UPDATE,
  },
  summary: "更新系统角色",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemRoleSchema,
      "更新系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSystemRoleSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemRoleSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 删除系统角色 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.DELETE,
  },
  summary: "删除系统角色",
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
      "角色不存在",
    ),
  },
});

/** 为角色分配权限 */
export const assignPermissions = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.ASSIGN_PERMISSIONS,
  },
  summary: "分配权限给角色",
  method: "post",
  path: `${routePrefix}/{id}/permissions`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        permissions: z.array(z.object({
          resource: z.enum(Object.values(PermissionResource)).meta({ description: "资源" }),
          action: z.enum(Object.values(PermissionAction)).meta({ description: "动作" }),
        })).meta({ description: "权限列表" }),
      }),
      "分配权限参数",
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
      "角色不存在",
    ),
  },
});

/** 为角色分配菜单 */
export const assignMenus = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.ASSIGN_ROUTES,
  },
  summary: "分配菜单给角色",
  method: "post",
  path: `${routePrefix}/{id}/menus`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        menuIds: z.array(z.string()).meta({ description: "菜单ID列表" }),
      }),
      "分配菜单参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        count: z.number(),
      }),
      "分配成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 为角色分配用户 */
export const assignUsers = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_ROLES,
    action: PermissionAction.ASSIGN_USERS,
  },
  summary: "分配用户给角色",
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
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});
