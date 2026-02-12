import { createRoute, z } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";

const tags = ["/client-users (用户端用户)"];

export const getUsersInfo = createRoute({
  path: "/client-users/info",
  method: "get",
  tags,
  summary: "获取用户信息",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.object({
        message: z.string().optional(),
      })),
      "列表响应成功",
    ),
  },
});
