import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  batchGetDictionariesSchema,
  responseDictionariesSchema,
} from "@/db/schema";
import { notFoundSchema } from "@/lib/enums";

const tags = ["/dictionaries (字典)"];

const CodeParamsSchema = z.object({
  code: z.string().min(1, "字典编码不能为空").describe("字典编码"),
});

/** 获取字典列表 */
export const list = createRoute({
  tags,
  summary: "获取字典列表",
  method: "get",
  path: "/dictionaries",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(responseDictionariesSchema),
      "获取字典列表成功",
    ),
  },
});

/** 根据编码获取单个字典 */
export const get = createRoute({
  tags,
  summary: "获取单个字典",
  method: "get",
  path: "/dictionaries/{code}",
  request: {
    params: CodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      responseDictionariesSchema,
      "获取字典成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(CodeParamsSchema),
      "字典编码格式错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "字典不存在或未启用",
    ),
  },
});

/** 批量获取字典 */
export const batch = createRoute({
  tags,
  summary: "批量获取字典",
  method: "post",
  path: "/dictionaries/batch",
  request: {
    body: jsonContentRequired(
      batchGetDictionariesSchema,
      "批量获取字典参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.string(), responseDictionariesSchema.nullable()),
      "批量获取成功，key-value形式返回，不存在的字典返回null",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(batchGetDictionariesSchema),
      "请求参数错误",
    ),
  },
});
