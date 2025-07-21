import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { selectOperationLogSchema } from "@/db/schema";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/operation-log (操作日志)"];

const operationLogQuerySchema = PaginationParamsSchema.extend({
  search: z.string().optional().describe("搜索关键词"),
});

export const list = createRoute({
  tags,
  method: "get",
  path: "/operation-log",
  operationId: "operation-log:read",
  summary: "获取操作日志列表",
  request: {
    query: operationLogQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectOperationLogSchema),
      "操作日志列表获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(operationLogQuerySchema),
      "请求参数错误",
    ),
  },
});
