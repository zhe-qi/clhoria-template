import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSysRoleSchema, patchSysRoleSchema, selectSysRoleSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { IdUUIDParamsSchema } from "@/lib/schemas";

export const list = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "listSysRoles",
  method: "get",
  path: "/sys-roles",
  request: {
    query: z.object({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSysRoleSchema),
      "系统角色列表响应成功",
    ),
  },
});

export const create = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "createSysRole",
  method: "post",
  path: "/sys-roles",
  request: {
    body: jsonContentRequired(
      insertSysRoleSchema,
      "创建系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSysRoleSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysRoleSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysRoleSchema),
      "角色代码已存在",
    ),
  },
});

export const get = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "getSysRole",
  method: "get",
  path: "/sys-roles/{id}",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysRoleSchema,
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

export const update = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "updateSysRole",
  method: "patch",
  path: "/sys-roles/{id}",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSysRoleSchema,
      "更新系统角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysRoleSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSysRoleSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "角色不存在",
    ),
  },
});

export const remove = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "removeSysRole",
  method: "delete",
  path: "/sys-roles/{id}",
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

// 角色权限分配路由
export const assignPermissions = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "assignPermissionsToRole",
  method: "post",
  path: "/sys-roles/{id}/permissions",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        permissions: z.array(z.object({
          resource: z.string().describe("资源"),
          action: z.string().describe("动作"),
        })).describe("权限列表"),
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

// 角色菜单分配路由
export const assignMenus = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "assignMenusToRole",
  method: "post",
  path: "/sys-roles/{id}/menus",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        menuIds: z.array(z.number()).describe("菜单ID列表"),
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

// 角色用户分配路由
export const assignUsers = createRoute({
  tags: ["/sys-roles (系统角色)"],
  operationId: "assignUsersToRole",
  method: "post",
  path: "/sys-roles/{id}/users",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      z.object({
        userIds: z.array(z.string()).describe("用户ID列表"),
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
