import { createRoute } from "@hono/zod-openapi";

import { insertSystemUsersSchema } from "@/db/schema";
import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { IdUUIDParamsSchema } from "@/lib/stoker/openapi/schemas";
import { respErrSchema } from "@/utils";

import { saveRolesParamsSchema, saveRolesResponseSchema, saveRolesSchema, systemUsersDetailResponse, systemUsersListResponse, systemUsersPatchSchema, systemUsersResponse } from "./users.schema";

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
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemUsersListResponse), "列表响应成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "服务器内部错误"),
  },
});

/** 创建系统用户 */
export const create = createRoute({
  tags,
  summary: "创建系统用户",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(insertSystemUsersSchema, "创建系统用户参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RefineResultSchema(systemUsersResponse), "创建成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
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
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemUsersDetailResponse), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "用户不存在"),
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
    body: jsonContentRequired(systemUsersPatchSchema, "更新系统用户参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemUsersResponse), "更新成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "请求参数错误"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(respErrSchema, "内置用户不允许修改状态"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "用户不存在"),
  },
});

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
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(IdUUIDParamsSchema), "删除成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(respErrSchema, "内置用户不允许删除"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "用户不存在"),
  },
});

/** 保存用户角色（全量更新） */
export const saveRoles = createRoute({
  tags,
  summary: "保存用户角色（全量更新）",
  method: "put",
  path: `${routePrefix}/{userId}/roles`,
  request: {
    params: saveRolesParamsSchema,
    body: jsonContentRequired(saveRolesSchema, "保存角色参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(saveRolesResponseSchema), "保存成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "The validation error(s)"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "用户或角色不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "保存角色失败"),
  },
});
