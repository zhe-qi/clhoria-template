import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { insertSystemUserSchema, patchSystemUserSchema, responseSystemUserListSchema, responseSystemUserSchema } from "@/db/schema";
import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { IdUUIDParamsSchema } from "@/lib/stoker/openapi/schemas";
import { respErr } from "@/utils";

const routePrefix = "/system/users";
const tags = [`${routePrefix}（系统用户）`];

/** 获取系统用户分页列表 */
export const list = createRoute({
  tags,
  summary: "获取系统用户列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(responseSystemUserListSchema),
      "列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErr, "服务器内部错误"),
  },
});

/** 创建系统用户 */
export const create = createRoute({
  tags,
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
      RefineResultSchema(responseSystemUserSchema),
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "The validation error(s)"),
    [HttpStatusCodes.CONFLICT]: jsonContent(respErr, "用户名已存在"),
  },
});

/** 根据ID获取系统用户详情 */
export const get = createRoute({
  tags,
  summary: "获取系统用户详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(responseSystemUserSchema),
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户不存在"),
  },
});

/** 更新系统用户 */
export const update = createRoute({
  tags,
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
      RefineResultSchema(responseSystemUserSchema),
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "请求参数错误"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(respErr, "内置用户不允许修改状态"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户不存在"),
  },
}); ;

/** 删除系统用户 */
export const remove = createRoute({
  tags,
  summary: "删除系统用户",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(IdUUIDParamsSchema),
      "删除成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErr, "ID参数错误"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(respErr, "内置用户不允许删除"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户不存在"),
  },
}); ;

export const addRole = createRoute({
  tags,
  summary: "给用户添加角色",
  method: "post",
  path: `${routePrefix}/{userId}/roles`,
  request: {
    params: z.object({
      userId: z.uuid().meta({ description: "用户ID" }),
    }),
    body: jsonContentRequired(
      z.object({
        roleIds: z.array(z.string().min(1).max(64).meta({ example: "admin", description: "角色编码" })),
      }),
      "添加角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      RefineResultSchema(z.object({ count: z.number().int() })),
      "添加成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "The validation error(s)"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户或角色不存在"),
    [HttpStatusCodes.CONFLICT]: jsonContent(respErr, "用户已拥有该角色"),
  },
});

export const removeRole = createRoute({
  tags,
  summary: "批量删除用户角色",
  method: "delete",
  path: `${routePrefix}/{userId}/roles`,
  request: {
    params: z.object({
      userId: z.uuid().meta({ description: "用户id" }),
    }),
    body: jsonContentRequired(
      z.object({
        roleIds: z.array(z.string().min(1).max(64).meta({ example: "user", description: "角色编码" })),
      }),
      "删除角色参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({ count: z.number().int() })),
      "删除成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErr, "The validation error(s)"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErr, "用户或角色不存在"),
  },
});
