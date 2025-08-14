import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  batchGetGlobalParamsSchema,
  insertGlobalParamsSchema,
  patchGlobalParamsSchema,
  responseGlobalParamsSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const KeyParamsSchema = z.object({
  key: z.string().min(1, "参数键不能为空").meta({ description: "参数键名" }),
});

const routePrefix = "/system/global-params";
const tags = [`${routePrefix}（全局参数管理）`];

/** 获取全局参数分页列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "获取全局参数列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema<typeof responseGlobalParamsSchema>(responseGlobalParamsSchema),
      "全局参数列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 根据键名获取单个全局参数 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "获取单个全局参数详情",
  method: "get",
  path: `${routePrefix}/{key}`,
  request: {
    params: KeyParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseGlobalParamsSchema,
      "获取参数成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(KeyParamsSchema),
      "参数键格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "参数不存在",
    ),
  },
});

/** 创建全局参数 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.CREATE,
  },
  summary: "创建全局参数",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertGlobalParamsSchema,
      "创建参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseGlobalParamsSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertGlobalParamsSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertGlobalParamsSchema),
      "参数键已存在",
    ),
  },
});

/** 更新全局参数 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新全局参数",
  method: "patch",
  path: `${routePrefix}/{key}`,
  request: {
    params: KeyParamsSchema,
    body: jsonContentRequired(
      patchGlobalParamsSchema,
      "更新参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseGlobalParamsSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchGlobalParamsSchema).or(createErrorSchema(KeyParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "参数不存在",
    ),
  },
});

/** 删除全局参数 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.DELETE,
  },
  summary: "删除全局参数",
  method: "delete",
  path: `${routePrefix}/{key}`,
  request: {
    params: KeyParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(KeyParamsSchema),
      "参数键格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "参数不存在",
    ),
  },
});

/** 批量获取全局参数 */
export const batch = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "批量获取全局参数",
  method: "post",
  path: `${routePrefix}/batch`,
  request: {
    query: z.object({
      publicOnly: z.enum(["true", "false"]).optional().default("false").meta({ description: "是否只获取公开参数" }),
    }),
    body: jsonContentRequired(
      batchGetGlobalParamsSchema,
      "批量获取参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.string(), responseGlobalParamsSchema.nullable()),
      "批量获取成功，key-value形式返回，不存在的参数返回null",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(batchGetGlobalParamsSchema),
      "请求参数错误",
    ),
  },
});
