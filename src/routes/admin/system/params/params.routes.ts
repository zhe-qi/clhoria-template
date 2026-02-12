import { createRoute } from "@hono/zod-openapi";

import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/core/stoker/openapi/helpers";
import { IdUUIDParamsSchema } from "@/lib/core/stoker/openapi/schemas";
import { respErrSchema } from "@/utils";

import { systemParamCreateSchema, systemParamListResponseSchema, systemParamPatchSchema, systemParamQuerySchema, systemParamResponseSchema } from "./params.schema";

const routePrefix = "/system/params";
const tags = [`${routePrefix}（系统参数管理）`];

/** 获取参数列表 */
export const list = createRoute({
  tags,
  summary: "获取参数列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema.extend(systemParamQuerySchema.shape),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemParamListResponseSchema), "列表响应成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "查询参数验证错误"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(respErrSchema, "服务器内部错误"),
  },
});

/** 创建参数 */
export const create = createRoute({
  tags,
  summary: "创建参数",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(systemParamCreateSchema, "创建参数"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RefineResultSchema(systemParamResponseSchema), "创建成功"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(respErrSchema, "参数验证失败"),
  },
});

/** 获取参数详情 */
export const get = createRoute({
  tags,
  summary: "获取参数详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemParamResponseSchema), "获取成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "参数不存在"),
  },
});

/** 更新参数 */
export const update = createRoute({
  tags,
  summary: "更新参数",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(systemParamPatchSchema, "更新参数"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(systemParamResponseSchema), "更新成功"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "参数不存在"),
  },
});

/** 删除参数 */
export const remove = createRoute({
  tags,
  summary: "删除参数",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefineResultSchema(IdUUIDParamsSchema), "删除成功"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(respErrSchema, "ID参数错误"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(respErrSchema, "参数不存在"),
  },
});
