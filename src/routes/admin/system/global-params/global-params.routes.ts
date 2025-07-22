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
import { notFoundSchema } from "@/lib/constants";
import { PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const KeyParamsSchema = z.object({
  key: z.string().min(1, "参数键不能为空").describe("参数键名"),
});

const ListQuerySchema = PaginationParamsSchema.extend({
  domain: z.string().optional().describe("租户域，不传则使用默认域"),
  isPublic: z.enum(["0", "1"]).optional().describe("是否公开参数: 1=是 0=否"),
});

export const list = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "获取全局参数列表（分页）",
  method: "get",
  path: "/admin/global-params",
  request: {
    query: ListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseGlobalParamsSchema),
      "获取全局参数列表成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ListQuerySchema),
      "查询参数错误",
    ),
  },
});

export const get = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "获取单个全局参数详情",
  method: "get",
  path: "/admin/global-params/{key}",
  request: {
    params: KeyParamsSchema,
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
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

export const create = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.CREATE,
  },
  summary: "创建全局参数",
  method: "post",
  path: "/admin/global-params",
  request: {
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
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

export const update = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.UPDATE,
  },
  summary: "更新全局参数",
  method: "patch",
  path: "/admin/global-params/{key}",
  request: {
    params: KeyParamsSchema,
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
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

export const remove = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.DELETE,
  },
  summary: "删除全局参数",
  method: "delete",
  path: "/admin/global-params/{key}",
  request: {
    params: KeyParamsSchema,
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
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

export const batch = createRoute({
  tags: ["/admin/global-params (全局参数管理)"],
  permission: {
    resource: PermissionResource.GLOBAL_PARAMS,
    action: PermissionAction.READ,
  },
  summary: "批量获取全局参数",
  method: "post",
  path: "/admin/global-params/batch",
  request: {
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
      publicOnly: z.enum(["true", "false"]).optional().default("false").describe("是否只获取公开参数"),
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
