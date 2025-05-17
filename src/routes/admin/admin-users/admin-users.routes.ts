import { createRoute } from "@hono/zod-openapi";

import { insertAdminUsersSchema, patchAdminUsersSchema, selectAdminUsersSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { GetPaginatedResultSchema, PaginationParamsSchema } from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/stoker/openapi/helpers";
import { createErrorSchema, IdUUIDParamsSchema } from "@/lib/stoker/openapi/schemas";

const tags = ["/admin-users (后台管理端用户管理)"];

export const list = createRoute({
  path: "/admin-users",
  method: "get",
  request: {
    query: PaginationParamsSchema,
  },
  tags,
  summary: "获取用户列表",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetPaginatedResultSchema(selectAdminUsersSchema),
      "列表响应成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PaginationParamsSchema),
      "查询参数验证错误",
    ),
  },
});

export const create = createRoute({
  path: "/admin-users",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertAdminUsersSchema,
      "创建参数",
    ),
  },
  tags,
  summary: "创建用户",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminUsersSchema,
      "创建成功",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertAdminUsersSchema),
      "创建请求体验证错误",
    ),
  },
});

export const getOne = createRoute({
  path: "/admin-users/{id}",
  method: "get",
  request: {
    params: IdUUIDParamsSchema,
  },
  tags,
  summary: "获取用户详情",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminUsersSchema,
      "请求成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数验证错误",
    ),
  },
});

export const patch = createRoute({
  path: "/admin-users/{id}",
  method: "patch",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchAdminUsersSchema,
      "更新参数",
    ),
  },
  tags,
  summary: "更新用户",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectAdminUsersSchema,
      "更新成功",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchAdminUsersSchema)
        .or(createErrorSchema(IdUUIDParamsSchema)),
      "请求参数验证错误",
    ),
  },
});

export const remove = createRoute({
  path: "/admin-users/{id}",
  method: "delete",
  request: {
    params: IdUUIDParamsSchema,
  },
  tags,
  summary: "删除用户",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "删除成功",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "用户不存在",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "请求参数验证错误",
    ),
  },
});
