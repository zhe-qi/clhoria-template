import { createRoute } from "@hono/zod-openapi";

import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { savePermissionsParamsSchema, savePermissionsResponseSchema, savePermissionsSchema, systemRolesCreateSchema, systemRolesDetailResponseSchema, systemRolesIdParamsSchema, systemRolesListResponseSchema, systemRolesPatchSchema } from "./roles.schema";

const routePrefix = "/system/roles";
const tags = [`${routePrefix}（系统角色）`];

/** 获取系统角色分页列表 */
export const list = createRoute({
  tags,
  summary: "获取系统角色列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemRolesListResponseSchema), "列表响应成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "服务器内部错误"),
  },
});

/** 创建系统角色 */
export const create = createRoute({
  tags,
  summary: "创建系统角色",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(systemRolesCreateSchema, "创建系统角色参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RefineResultSchema(systemRolesDetailResponseSchema), "创建成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "上级角色不存在"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

/** 根据ID获取系统角色详情 */
export const get = createRoute({
  tags,
  summary: "获取系统角色详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: systemRolesIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemRolesDetailResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "角色不存在"),
  },
});

/** 更新系统角色 */
export const update = createRoute({
  tags,
  summary: "更新系统角色",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: systemRolesIdParamsSchema,
    body: jsonContentRequired(systemRolesPatchSchema, "更新系统角色参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemRolesDetailResponseSchema), "更新成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "请求参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "角色不存在"),
  },
});

/** 删除系统角色 */
export const remove = createRoute({
  tags,
  summary: "删除系统角色",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: systemRolesIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemRolesIdParamsSchema), "删除成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "角色不存在"),
  },
});

/** 获取角色权限 */
export const getPermissions = createRoute({
  tags,
  summary: "获取角色权限",
  method: "get",
  path: `${routePrefix}/{id}/permissions`,
  request: {
    params: systemRolesIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(savePermissionsSchema), "获取权限成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "获取权限失败"),
  },
});

export const savePermissions = createRoute({
  tags,
  summary: "保存角色权限（全量更新）",
  method: "put",
  path: `${routePrefix}/{id}/permissions`,
  request: {
    params: systemRolesIdParamsSchema,
    body: jsonContentRequired(savePermissionsParamsSchema, "保存权限参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(savePermissionsResponseSchema), "保存权限成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "角色不存在"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "保存权限失败"),
  },
});
