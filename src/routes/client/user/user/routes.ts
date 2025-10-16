import { createRoute, z } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";

const tags = ["/client-user (用户端用户)"];

export const getUserInfo = createRoute({
  path: "/client-user/info",
  method: "get",
  tags,
  summary: "获取用户信息",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string().optional(),
      }),
      "列表响应成功",
    ),
  },
});
