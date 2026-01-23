import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent } from "@/lib/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { dictCodeParams, dictItemsResponseSchema } from "./dict.schema";

const routePrefix = "/dict";
const tags = [`${routePrefix}（业务字典查询）`];

/** 根据编码查询字典项 */
export const getByCode = createRoute({
  tags,
  summary: "根据编码查询字典项",
  method: "get",
  path: `${routePrefix}/{code}`,
  request: {
    params: dictCodeParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(dictItemsResponseSchema),
      "查询成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "Code参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在或已禁用"),
  },
});
