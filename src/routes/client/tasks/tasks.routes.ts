import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { selectTasksSchema } from "@/db/schema";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["/tasks (任务管理)"];

export const list = createRoute({
  path: "/tasks",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "获取任务列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectTasksSchema),
      "获取成功响应",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "请求参数验证错误",
    ),
  },
});
