import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertSysAccessKeySchema, selectSysAccessKeySchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import { IdUUIDParamsSchema } from "@/lib/schemas";

export const list = createRoute({
  tags: ["/sys-access-keys (访问密钥)"],
  operationId: "sysAccessKeys:read",
  summary: "获取访问密钥列表",
  method: "get",
  path: "/sys-access-keys",
  request: {
    query: PaginationParamsSchema.extend({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectSysAccessKeySchema),
      "访问密钥列表响应成功",
    ),
  },
});

export const create = createRoute({
  tags: ["/sys-access-keys (访问密钥)"],
  operationId: "sysAccessKeys:create",
  summary: "创建访问密钥",
  method: "post",
  path: "/sys-access-keys",
  request: {
    body: jsonContentRequired(
      insertSysAccessKeySchema,
      "创建访问密钥参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSysAccessKeySchema,
      "创建成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(insertSysAccessKeySchema),
      "请求参数错误",
    ),
  },
});

export const remove = createRoute({
  tags: ["/sys-access-keys (访问密钥)"],
  operationId: "sysAccessKeys:delete",
  summary: "删除访问密钥",
  method: "delete",
  path: "/sys-access-keys/{id}",
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
      "访问密钥不存在",
    ),
  },
});
