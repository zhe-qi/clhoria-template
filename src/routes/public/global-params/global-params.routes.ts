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

/** 内部服务器错误响应模式 */
const internalServerErrorSchema = z.object({
  message: z.string(),
});

/** 参数键路径模式 */
const KeyParamsSchema = z.object({
  key: z.string().min(1, "参数键不能为空").describe("参数键名"),
});

export const list = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "获取全局参数列表",
  method: "get",
  path: "/global-params",
  request: {
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
      publicOnly: z.enum(["true", "false"]).optional().default("true").describe("是否只获取公开参数"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(responseGlobalParamsSchema),
      "获取全局参数列表成功",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});

export const get = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "获取单个全局参数",
  method: "get",
  path: "/global-params/{key}",
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
      "参数不存在或不是公开参数",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});

export const create = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "创建全局参数",
  method: "post",
  path: "/global-params",
  request: {
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
    body: jsonContentRequired(
      insertGlobalParamsSchema,
      "创建全局参数参数",
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
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});

export const update = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "更新全局参数",
  method: "patch",
  path: "/global-params/{key}",
  request: {
    params: KeyParamsSchema,
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
    }),
    body: jsonContentRequired(
      patchGlobalParamsSchema,
      "更新全局参数参数",
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
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});

export const remove = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "删除全局参数",
  method: "delete",
  path: "/global-params/{key}",
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
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});

export const batch = createRoute({
  tags: ["/global-params (全局参数)"],
  summary: "批量获取全局参数",
  method: "post",
  path: "/global-params/batch",
  request: {
    query: z.object({
      domain: z.string().optional().describe("租户域，不传则使用默认域"),
      publicOnly: z.enum(["true", "false"]).optional().default("true").describe("是否只获取公开参数"),
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
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalServerErrorSchema,
      "服务器内部错误",
    ),
  },
});
