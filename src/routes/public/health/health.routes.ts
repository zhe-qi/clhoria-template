import { createRoute, z } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";

const routePrefix = "/health";
const tags = [`${routePrefix}（健康检查）`];

const HealthResponseSchema = z.object({
  status: z.string().meta({ description: "健康状态" }),
  timestamp: z.string().meta({ description: "时间戳" }),
});

/** Health check endpoint / 健康检查接口 */
export const get = createRoute({
  tags,
  path: routePrefix,
  method: "get",
  summary: "健康检查",
  description: "返回服务健康状态",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(HealthResponseSchema),
      "服务正常",
    ),
  },
});
