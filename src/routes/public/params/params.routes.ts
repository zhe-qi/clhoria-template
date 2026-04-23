import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { paramKeyParamsSchema, paramListResponseSchema, paramResponseSchema } from "./params.schema";

const routePrefix = "/params";
const tags = [`${routePrefix}（系统参数查询）`];

/** List all enabled params / 获取所有启用参数 */
export const list = createRoute({
  tags,
  summary: "获取所有启用参数",
  method: "get",
  path: routePrefix,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(paramListResponseSchema),
      "查询成功",
    ),
  },
});

/** Get param by key / 根据键查询参数 */
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
