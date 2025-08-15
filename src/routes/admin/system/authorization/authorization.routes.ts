import { createRoute, z } from "@hono/zod-openapi";

import {
  getUserRolesSchema,
  getUserRoutesSchema,
  roleMenusSchema,
  rolePermissionsSchema,
  userRolesResponseSchema,
  userRoutesResponseSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/authorization";
const tags = [`${routePrefix}（系统授权）`];

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
