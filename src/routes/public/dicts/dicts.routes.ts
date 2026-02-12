import { createRoute } from "@hono/zod-openapi";

import { RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

import { dictCodeParamsSchema, dictItemsResponseSchema } from "./dicts.schema";

const routePrefix = "/dicts";
const tags = [`${routePrefix}（业务字典查询）`];

/** 根据编码查询字典项 */
export const getByCode = createRoute({
  tags,
  summary: "根据编码查询字典项",
  method: "get",
  path: `${routePrefix}/{code}`,
  request: {
    params: dictCodeParamsSchema,
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
