import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { selectTasksSchema } from "@/db/schema";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";

const tags = ["Client-Tasks"];

export const list = createRoute({
  path: "/tasks",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  summary: "/tasks 分页任务列表",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectTasksSchema),
      "分页任务列表",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});
