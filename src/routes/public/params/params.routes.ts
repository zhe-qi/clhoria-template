import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { paramKeyParamsSchema, paramResponseSchema } from "./params.schema";

const routePrefix = "/params";
const tags = [`${routePrefix}（系统参数查询）`];

/** 根据键查询参数 */
export const getByKey = createRoute({
  tags,
  summary: "根据键查询参数",
  method: "get",
  path: `${routePrefix}/{key}`,
  request: {
    params: paramKeyParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(paramResponseSchema),
      "查询成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "Key参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "参数不存在或已禁用"),
  },
});
