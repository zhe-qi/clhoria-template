import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  assignmentResponseSchema,
  assignPermissionsToRoleSchema,
  assignRoutesToRoleSchema,
  assignUsersToRoleSchema,
  getUserRoutesSchema,
  roleMenusSchema,
  rolePermissionsSchema,
  userRoutesResponseSchema,
} from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { IdUUIDParamsSchema } from "@/lib/schemas";

// 分配权限给角色
export const assignPermissionsToRole = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:assignPermissions",
  summary: "分配权限给角色",
  method: "post",
  path: "/authorization/roles/{roleId}/permissions",
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.describe("角色ID"),
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

// 分配路由给角色
export const assignRoutesToRole = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:assignRoutes",
  summary: "分配路由给角色",
  method: "post",
  path: "/authorization/roles/{roleId}/routes",
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.describe("角色ID"),
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

// 分配用户给角色
export const assignUsersToRole = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:assignUsers",
  summary: "分配用户给角色",
  method: "post",
  path: "/authorization/roles/{roleId}/users",
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.describe("角色ID"),
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

// 获取用户路由
export const getUserRoutes = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:getUserRoutes",
  summary: "获取用户路由",
  method: "get",
  path: "/authorization/users/{userId}/routes",
  request: {
    params: IdUUIDParamsSchema.extend({
      userId: IdUUIDParamsSchema.shape.id.describe("用户ID"),
    }).omit({ id: true }),
    query: getUserRoutesSchema.omit({ userId: true }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      userRoutesResponseSchema,
      "获取用户路由成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(getUserRoutesSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
  },
});

// 获取角色权限
export const getRolePermissions = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:getRolePermissions",
  summary: "获取角色权限",
  method: "get",
  path: "/authorization/roles/{roleId}/permissions",
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.describe("角色ID"),
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

// 获取角色菜单
export const getRoleMenus = createRoute({
  tags: ["/authorization (授权管理)"],
  operationId: "authorization:getRoleMenus",
  summary: "获取角色菜单",
  method: "get",
  path: "/authorization/roles/{roleId}/menus",
  request: {
    params: IdUUIDParamsSchema.extend({
      roleId: IdUUIDParamsSchema.shape.id.describe("角色ID"),
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
