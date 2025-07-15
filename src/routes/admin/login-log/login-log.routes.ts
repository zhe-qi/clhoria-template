import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { selectLoginLogSchema } from "@/db/schema";

const tags = ["/login-log (登录日志)"];

const loginLogQuerySchema = z.object({
  search: z.string().optional().describe("搜索关键词"),
});

export const list = createRoute({
  tags,
  method: "get",
  path: "/login-log",
  summary: "获取登录日志列表",
  request: {
    query: loginLogQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectLoginLogSchema),
      "登录日志列表获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(loginLogQuerySchema),
      "请求参数错误",
    ),
  },
});
