import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  batchGetDictionariesSchema,
  insertSystemDictionariesSchema,
  patchSystemDictionariesSchema,
  responseSystemDictionariesSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const routePrefix = "/system/dictionaries";
const tags = [`${routePrefix}（字典管理）`];

const CodeParamsSchema = z.object({
  code: z.string().min(1, "字典编码不能为空").meta({ description: "字典编码" }),
});

/** 获取字典列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "获取字典列表",
  method: "get",
  path: routePrefix,
  request: {
    query: PaginationParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(responseSystemDictionariesSchema),
      "字典列表获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

/** 获取单个字典详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "获取单个字典详情",
  method: "get",
  path: `${routePrefix}/{code}`,
  request: {
    params: CodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemDictionariesSchema,
      "获取字典成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(CodeParamsSchema),
      "字典编码格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "字典不存在",
    ),
  },
});

/** 创建字典 */
export const create = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.CREATE,
  },
  summary: "创建字典",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemDictionariesSchema,
      "创建字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseSystemDictionariesSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSystemDictionariesSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchSystemDictionariesSchema),
      "字典编码已存在",
    ),
  },
});

/** 更新字典 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.UPDATE,
  },
  summary: "更新字典",
  method: "patch",
  path: `${routePrefix}/{code}`,
  request: {
    params: CodeParamsSchema,
    body: jsonContentRequired(
      patchSystemDictionariesSchema,
      "更新字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseSystemDictionariesSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemDictionariesSchema).or(createErrorSchema(CodeParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "字典不存在",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchSystemDictionariesSchema),
      "字典编码已存在",
    ),
  },
});

/** 删除字典 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.DELETE,
  },
  summary: "删除字典",
  method: "delete",
  path: `${routePrefix}/{code}`,
  request: {
    params: CodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(CodeParamsSchema),
      "字典编码格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "字典不存在",
    ),
  },
});

/** 批量获取字典 */
export const batch = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYSTEM_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "批量获取字典",
  method: "post",
  path: `${routePrefix}/batch`,
  request: {
    query: z.object({
      enabledOnly: z.enum(["true", "false"]).optional().default("false").meta({ description: "是否只获取启用字典" }),
    }),
    body: jsonContentRequired(
      batchGetDictionariesSchema,
      "批量获取字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.string(), responseSystemDictionariesSchema.nullable()),
      "批量获取成功，key-value形式返回，不存在的字典返回null",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(batchGetDictionariesSchema),
      "请求参数错误",
    ),
  },
});
