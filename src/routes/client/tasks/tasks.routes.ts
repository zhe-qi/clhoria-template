import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { selectTasksSchema } from "@/db/schema";

const tags = ["/tasks (任务管理)"];

export const list = createRoute({
  path: "/tasks",
  method: "get",
  request: {
    query: z.object({
      search: z.string().optional().describe("搜索关键词"),
    }),
  },
  tags,
  summary: "获取任务列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTasksSchema),
      "获取成功响应",
    ),
  },
  permission: {},
});
