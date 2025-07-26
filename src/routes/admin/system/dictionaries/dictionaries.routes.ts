import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  batchGetDictionariesSchema,
  insertDictionariesSchema,
  patchDictionariesSchema,
  responseDictionariesSchema,
} from "@/db/schema";
import { notFoundSchema, PermissionAction, PermissionResource } from "@/lib/enums";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/dictionaries (字典管理)"];

const CodeParamsSchema = z.object({
  code: z.string().min(1, "字典编码不能为空").describe("字典编码"),
});

const ListQuerySchema = PaginationParamsSchema.extend({
  search: z.string().optional().describe("搜索关键词（编码、名称、描述）"),
  status: z.enum(["0", "1"]).optional().describe("字典状态: 1=启用 0=禁用"),
});

/** 获取字典列表 */
export const list = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "获取字典列表（分页）",
  method: "get",
  path: "/admin/dictionaries",
  request: {
    query: ListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(responseDictionariesSchema),
      "获取字典列表成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ListQuerySchema),
      "查询参数错误",
    ),
  },
});

/** 获取单个字典详情 */
export const get = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "获取单个字典详情",
  method: "get",
  path: "/admin/dictionaries/{code}",
  request: {
    params: CodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseDictionariesSchema,
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
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.CREATE,
  },
  summary: "创建字典",
  method: "post",
  path: "/admin/dictionaries",
  request: {
    body: jsonContentRequired(
      insertDictionariesSchema,
      "创建字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      responseDictionariesSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertDictionariesSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertDictionariesSchema),
      "字典编码已存在",
    ),
  },
});

/** 更新字典 */
export const update = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.UPDATE,
  },
  summary: "更新字典",
  method: "patch",
  path: "/admin/dictionaries/{code}",
  request: {
    params: CodeParamsSchema,
    body: jsonContentRequired(
      patchDictionariesSchema,
      "更新字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseDictionariesSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchDictionariesSchema).or(createErrorSchema(CodeParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "字典不存在",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(patchDictionariesSchema),
      "字典编码已存在",
    ),
  },
});

/** 删除字典 */
export const remove = createRoute({
  tags,
  permission: {
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.DELETE,
  },
  summary: "删除字典",
  method: "delete",
  path: "/admin/dictionaries/{code}",
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
    resource: PermissionResource.SYS_DICTIONARIES,
    action: PermissionAction.READ,
  },
  summary: "批量获取字典",
  method: "post",
  path: "/admin/dictionaries/batch",
  request: {
    query: z.object({
      enabledOnly: z.enum(["true", "false"]).optional().default("false").describe("是否只获取启用字典"),
    }),
    body: jsonContentRequired(
      batchGetDictionariesSchema,
      "批量获取字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.string(), responseDictionariesSchema.nullable()),
      "批量获取成功，key-value形式返回，不存在的字典返回null",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(batchGetDictionariesSchema),
      "请求参数错误",
    ),
  },
});
