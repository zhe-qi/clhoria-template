import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { insertApiKeySchema, selectApiKeySchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/lib/schemas";

const tags = ["/api-keys (API密钥管理)"];

const ListApiKeysQuerySchema = PaginationParamsSchema.extend({
  name: z.string().optional().describe("按名称搜索"),
  enabled: z.boolean().optional().describe("按启用状态筛选"),
});

export const list = createRoute({
  method: "get",
  path: "/api-keys",
  tags,
  operationId: "apiKeys:list",
  summary: "获取API密钥列表",
  request: {
    query: ListApiKeysQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectApiKeySchema),
      "获取成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ListApiKeysQuerySchema),
      "参数验证失败",
    ),
  },
});

export const create = createRoute({
  method: "post",
  path: "/api-keys",
  tags,
  operationId: "apiKeys:create",
  summary: "创建API密钥",
  request: {
    body: jsonContentRequired(insertApiKeySchema, "创建参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectApiKeySchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertApiKeySchema),
      "参数验证失败",
    ),
  },
});

export const getById = createRoute({
  method: "get",
  path: "/api-keys/{id}",
  tags,
  operationId: "apiKeys:read",
  summary: "获取API密钥详情",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectApiKeySchema,
      "获取成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API密钥不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});

export const deleteById = createRoute({
  method: "delete",
  path: "/api-keys/{id}",
  tags,
  operationId: "apiKeys:delete",
  summary: "删除API密钥",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API密钥不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});

export const toggleStatus = createRoute({
  method: "patch",
  path: "/api-keys/{id}/toggle",
  tags,
  operationId: "apiKeys:update",
  summary: "切换API密钥状态",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectApiKeySchema,
      "操作成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "API密钥不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "参数验证失败",
    ),
  },
});
