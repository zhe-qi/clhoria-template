import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { insertSystemUserSchema, patchSystemUserSchema, responseSystemUserSchema } from "@/db/schema";
import { RefineQueryParamsSchema, RefineResultSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "@/lib/stoker/openapi/schemas";

const routePrefix = "/system/users";
const tags = [`${routePrefix}（系统用户）`];

/** 获取系统用户分页列表 */
export const list = createRoute({
  tags,
  summary: "获取系统用户列表",
  method: "get",
  path: routePrefix,
  request: {
    query: RefineQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(z.array(responseSystemUserSchema)),
      "列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(RefineQueryParamsSchema),
      "查询参数验证错误",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      createErrorSchema(z.string()),
      "服务器内部错误",
    ),
  },
});

/** 创建系统用户 */
export const create = createRoute({
  tags,
  summary: "创建系统用户",
  method: "post",
  path: routePrefix,
  request: {
    body: jsonContentRequired(
      insertSystemUserSchema,
      "创建系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      RefineResultSchema(responseSystemUserSchema),
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSystemUserSchema),
      "The validation error(s)",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(insertSystemUserSchema),
      "用户名已存在",
    ),
  },
});

/** 根据ID获取系统用户详情 */
export const get = createRoute({
  tags,
  summary: "获取系统用户详情",
  method: "get",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(responseSystemUserSchema),
      "获取成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.string()),
      "用户不存在",
    ),
  },
});

/** 更新系统用户 */
export const update = createRoute({
  tags,
  summary: "更新系统用户",
  method: "patch",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchSystemUserSchema,
      "更新系统用户参数",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(responseSystemUserSchema),
      "更新成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchSystemUserSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.string()),
      "用户不存在",
    ),
  },
});

/** 删除系统用户 */
export const remove = createRoute({
  tags,
  summary: "删除系统用户",
  method: "delete",
  path: `${routePrefix}/{id}`,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RefineResultSchema(IdUUIDParamsSchema),
      "删除成功",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "ID参数错误",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.string()),
      "用户不存在",
    ),
  },
});
