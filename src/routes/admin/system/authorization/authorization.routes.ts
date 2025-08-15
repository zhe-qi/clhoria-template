import { createRoute, z } from "@hono/zod-openapi";

import {
  assignmentResponseSchema,
  assignPermissionsToRoleSchema,
  assignRoutesToRoleSchema,
  assignUsersToRoleSchema,
  getUserRolesSchema,
  getUserRoutesSchema,
  roleMenusSchema,
  rolePermissionsSchema,
  userRolesResponseSchema,
  userRoutesResponseSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/authorization";
const tags = [`${routePrefix}（系统授权）`];

/** 分配权限给角色 */
export const assignPermissionsToRole = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.ASSIGN_PERMISSIONS,
  },
  summary: "分配权限给角色",
  method: "post",
  path: `${routePrefix}/roles/{roleId}/permissions`,
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.meta({ description: "角色ID" }),
    }).omit({ id: true }),
    body: jsonContentRequired(
      assignPermissionsToRoleSchema.omit({ roleId: true }),
      "分配权限参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      assignmentResponseSchema,
      "分配权限成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(assignPermissionsToRoleSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 分配路由给角色 */
export const assignRoutesToRole = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.ASSIGN_ROUTES,
  },
  summary: "分配路由给角色",
  method: "post",
  path: `${routePrefix}/roles/{roleId}/routes`,
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.meta({ description: "角色ID" }),
    }).omit({ id: true }),
    body: jsonContentRequired(
      assignRoutesToRoleSchema.omit({ roleId: true }),
      "分配路由参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      assignmentResponseSchema,
      "分配路由成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(assignRoutesToRoleSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 分配用户给角色 */
export const assignUsersToRole = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.ASSIGN_USERS,
  },
  summary: "分配用户给角色",
  method: "post",
  path: `${routePrefix}/roles/{roleId}/users`,
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.meta({ description: "角色ID" }),
    }).omit({ id: true }),
    body: jsonContentRequired(
      assignUsersToRoleSchema.omit({ roleId: true }),
      "分配用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      assignmentResponseSchema,
      "分配用户成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(assignUsersToRoleSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 获取用户路由 */
export const getUserRoutes = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.GET_USER_ROUTES,
  },
  summary: "获取用户路由",
  method: "get",
  path: "/system/authorization/users/{id}/routes",
  request: {
    params: IdUUIDParamsSchema,
    query: z.object({
      domain: z.string().openapi({
        description: "域",
        example: "default",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      userRoutesResponseSchema,
      "获取用户路由成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(getUserRoutesSchema),
      "请求参数验证失败",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
}); ;

/** 获取用户角色 */
export const getUserRoles = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.GET_USER_ROLES,
  },
  summary: "获取用户角色",
  method: "get",
  path: `${routePrefix}/users/{userId}/roles`,
  request: {
    params: IdUUIDParamsSchema.extend({
      userId: IdUUIDParamsSchema.shape.id.meta({ description: "用户ID" }),
    }).omit({ id: true }),
    query: getUserRolesSchema.omit({ userId: true }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      userRolesResponseSchema,
      "获取用户角色成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(getUserRolesSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
});

/** 获取角色权限 */
export const getRolePermissions = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.GET_ROLE_PERMISSIONS,
  },
  summary: "获取角色权限",
  method: "get",
  path: `${routePrefix}/roles/{roleId}/permissions`,
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.meta({ description: "角色ID" }),
    }).omit({ id: true }),
    query: rolePermissionsSchema.omit({ roleId: true, permissions: true }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      rolePermissionsSchema.omit({ roleId: true }),
      "获取角色权限成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(rolePermissionsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 获取角色菜单 */
export const getRoleMenus = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.GET_ROLE_MENUS,
  },
  summary: "获取角色菜单",
  method: "get",
  path: `${routePrefix}/roles/{roleId}/menus`,
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.meta({ description: "角色ID" }),
    }).omit({ id: true }),
    query: roleMenusSchema.omit({ roleId: true, menuIds: true }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      roleMenusSchema.omit({ roleId: true }),
      "获取角色菜单成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(roleMenusSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

/** 为用户分配角色 */
export const assignRolesToUser = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_AUTHORIZATION,
    action: PermissionAction.ASSIGN_USERS,
  },
  summary: "分配角色给用户",
  method: "post",
  path: `${routePrefix}/users/{userId}/roles`,
  request: {
    params: IdUUIDParamsSchema.extend({
      userId: IdUUIDParamsSchema.shape.id.meta({ description: "用户ID" }),
    }).omit({ id: true }),
    body: jsonContentRequired(
      z.object({
        roleIds: z.array(z.string()).meta({ description: "角色ID列表" }),
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
