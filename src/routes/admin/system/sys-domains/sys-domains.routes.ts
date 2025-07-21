import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";

import { insertSysDomainSchema, patchSysDomainSchema, selectSysDomainSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

export const list = createRoute({
  tags: ["/sys-domains (系统域)"],
  operationId: "sysDomains:read",
  summary: "获取系统域列表",
  method: "get",
  path: "/sys-domains",
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSysDomainSchema),
      "系统域列表响应成功",
    ),
  },
});

export const create = createRoute({
  tags: ["/sys-domains (系统域)"],
  operationId: "sysDomains:create",
  summary: "创建系统域",
  method: "post",
  path: "/sys-domains",
  request: {
    body: jsonContentRequired(
      insertSysDomainSchema,
      "创建系统域参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSysDomainSchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysDomainSchema),
      "请求参数错误",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSysDomainSchema),
      "域代码已存在",
    ),
  },
});

export const get = createRoute({
  tags: ["/sys-domains (系统域)"],
  operationId: "sysDomains:read",
  summary: "获取系统域详情",
  method: "get",
  path: "/sys-domains/{id}",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysDomainSchema,
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "域不存在",
    ),
  },
});

export const update = createRoute({
  tags: ["/sys-domains (系统域)"],
  operationId: "sysDomains:update",
  summary: "更新系统域",
  method: "patch",
  path: "/sys-domains/{id}",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSysDomainSchema,
      "更新系统域参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSysDomainSchema,
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSysDomainSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "域不存在",
    ),
  },
});

export const remove = createRoute({
  tags: ["/sys-domains (系统域)"],
  operationId: "sysDomains:delete",
  summary: "删除系统域",
  method: "delete",
  path: "/sys-domains/{id}",
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
      "域不存在",
    ),
  },
});
