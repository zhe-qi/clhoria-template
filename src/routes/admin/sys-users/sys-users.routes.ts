import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSysUserSchema, patchSysUserSchema, responseSysUserSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/lib/schemas";

export const list = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "listSysUsers",
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

export const create = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "createSysUser",
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
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysUserSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysUserSchema),
      "用户名已存在",
    ),
  },
});

export const get = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "getSysUser",
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

export const update = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "updateSysUser",
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

export const remove = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "removeSysUser",
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

// 用户角色分配路由
export const assignRoles = createRoute({
  tags: ["/sys-users (系统用户)"],
  operationId: "assignRolesToUser",
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
