import { createRoute } from "@hono/zod-openapi";

import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/core/stoker/openapi/helpers";
import { IdUUIDParamsSchema } from "@/lib/core/stoker/openapi/schemas";
import { respErrSchema } from "@/utils";

import { systemDictCreateSchema, systemDictListResponseSchema, systemDictPatchSchema, systemDictQuerySchema, systemDictResponseSchema } from "./dicts.schema";

const routePrefix = "/system/dicts";
const tags = [`${routePrefix}（业务字典管理）`];

/** 获取字典列表 */
export const list = createRoute({
  tags,
  summary: "获取字典列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema.extend(systemDictQuerySchema.shape),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictListResponseSchema), "列表响应成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "服务器内部错误"),
  },
});

/** 创建字典 */
export const create = createRoute({
  tags,
  summary: "创建字典",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(systemDictCreateSchema, "创建字典参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RefineResultSchema(systemDictResponseSchema), "创建成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

/** 获取字典详情 */
export const get = createRoute({
  tags,
  summary: "获取字典详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});

/** 更新字典 */
export const update = createRoute({
  tags,
  summary: "更新字典",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(systemDictPatchSchema, "更新字典参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemDictResponseSchema), "更新成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});

/** 删除字典 */
export const remove = createRoute({
  tags,
  summary: "删除字典",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(IdUUIDParamsSchema), "删除成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "字典不存在"),
  },
});
