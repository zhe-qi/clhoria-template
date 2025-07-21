import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { selectLoginLogSchema } from "@/db/schema";
import { createPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/login-log (登录日志)"];

const loginLogQuerySchema = PaginationParamsSchema.extend({
  search: z.string().optional().describe("搜索关键词"),
});

export const list = createRoute({
  tags,
  method: "get",
  path: "/login-log",
  operationId: "login-log:read",
  summary: "获取登录日志列表",
  request: {
    query: loginLogQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResultSchema(selectLoginLogSchema),
      "登录日志列表获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(loginLogQuerySchema),
      "请求参数错误",
    ),
  },
});
