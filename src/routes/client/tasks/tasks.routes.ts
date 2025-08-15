import { createRoute, z } from "@hono/zod-openapi";

import { selectTasksSchema } from "@/db/schema";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";

const tags = ["/tasks (任务管理)"];

/** 获取任务列表 */
export const list = createRoute({
  path: "/tasks",
  method: "get",
  request: {
    query: z.object({
      search: z.string().optional().meta({ description: "搜索关键词" }),
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
});
