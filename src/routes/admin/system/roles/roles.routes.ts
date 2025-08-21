import { createRoute } from "@hono/zod-openapi";

import { insertSystemRoleSchema, patchSystemRoleSchema, selectSystemRoleSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema } from "@/lib/stoker/openapi/schemas";
import { IdUUIDParamsSchema } from "@/utils";

const routePrefix = "/system/roles";
const tags = [`${routePrefix}（系统角色）`];

/** 获取系统角色分页列表 */
export const list = createRoute({
  tags,
  summary: "获取系统角色列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectSystemRoleSchema),
      "系统角色列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 创建系统角色 */
export const create = createRoute({
  tags,
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
