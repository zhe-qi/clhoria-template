import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

import { apiKeyAuth } from "@/middlewares/api-key-auth";

const tags = ["/demo-api-key (API Key 演示)"];

export const protectedRoute = createRoute({
  method: "get",
  path: "/demo-api-key/protected",
  tags,
  summary: "需要 API Key 的受保护端点",
  security: [{ apiKey: [] }],
  middleware: [apiKeyAuth()],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        apiKey: z.string(),
        timestamp: z.string(),
      }),
      "访问成功"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "未授权访问"
    ),
  },
});

export const publicRoute = createRoute({
  method: "get",
  path: "/demo-api-key/public",
  tags,
  summary: "公开端点（无需 API Key）",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        timestamp: z.string(),
      }),
      "访问成功"
    ),
  },
});